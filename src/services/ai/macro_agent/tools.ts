import * as act from '@/actions'
import { findSameNameMacro } from '@/actions'
import { getDeprecatedCommandReplacement } from '@/common/command'
import { fromJSONString, toJSONString } from '@/common/convert_utils'
import { getPlayer, Player } from '@/common/player'
import { delayMs, setIn } from '@/common/utils'
import { updateState } from '@/ext/common/global_state'
import { getPlayTab } from '@/ext/common/tab'
import { getActiveWebTab, isWebTab } from '@/common/tab_utils'
import Ext from '@/common/web_extension'
import { store } from '@/redux'
import { getStorageManager } from '@/services/storage'
import { isScriptRunning, runScript, stopScript } from '@/modules/script_runner'
import { searchImageInExtension } from '@/services/vision/adaptor'
import ComputerUse from '../computer_use/computer_use'
import { ComputerUseMessageType } from '../computer_use/model'

// Tools the macro agent can call. Neutral JSON-schema definitions, converted
// to the provider-specific format (Anthropic tools / OpenAI function tools)
// by the sampling loop in service.ts.

export interface MacroAgentToolResult {
  text: string
  base64Image?: string
  isError?: boolean
}

// True when the editor holds a preinstalled demo macro the user has not
// edited — the typical state right after install, where the demo was
// auto-selected as "first macro in the tree" rather than chosen by the user.
// The AI chat must not treat it as something the user asked about (testers
// saw the agent run the CU_PlayTicTacToe demo — opening the game website —
// on an unrelated "create a macro" request). Recognized by path: script
// demos install under "Demo and QA Test Scripts", classic table demos under
// "Demo and QA Test Scripts (Classic)" (see config/preinstall_macros.js).
// The (classic|js)\/ alternative still matches the pre-2026-08 layout, where
// both sets lived in JS/Classic sub-folders below one root — installs that
// restored demos back then keep those paths until they restore again.
const PREINSTALL_DEMO_PATH_RE = /(^|\/)(classic\/|js\/|demo and qa test scripts( \(classic\))?\/)/
export const isUntouchedPreinstallDemo = (editing: any): boolean => {
  const src = editing && editing.meta && editing.meta.src
  if (!src || !src.id) return false
  if (editing.meta.hasUnsaved) return false
  return PREINSTALL_DEMO_PATH_RE.test(String(src.id).toLowerCase().replace(/\\/g, '/'))
}

export const MACRO_AGENT_TOOLS: Array<{ name: string; description: string; parameters: any }> = [
  {
    name: 'get_macro',
    description: 'Returns the macro currently loaded in the editor, as Ui.Vision JSON. A JS script macro comes back with a "Script" field (its program) instead of Commands.',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'set_macro',
    description:
      'Apply changes to the macro in the editor — pass the complete Ui.Vision JSON ({"Name": "...", "Commands": [{"Command": "...", "Target": "...", "Value": "..."}]}), or for a JS script macro {"Name": "name.js", "Script": "<modern JavaScript>"}. Use this to FIX or refine a macro. The user\'s original macro file is NEVER overwritten: the first change to a user macro is saved as a new copy (name_1) in the AI Generated folder, which then becomes the macro you keep editing. If the current macro uses visual commands (XClick/visual/OCR), replacing them all with DOM commands is rejected unless allow_visual_to_dom is true — ask the user first. Returns the macro name that was written, or a validation error.',
    parameters: {
      type: 'object',
      properties: {
        macro_json: {
          type: 'string',
          description: 'The complete macro as a Ui.Vision JSON string.'
        },
        allow_visual_to_dom: {
          type: 'boolean',
          description: 'Set true ONLY after the user explicitly agreed to convert a visual macro to DOM-selector commands.'
        }
      },
      required: ['macro_json']
    }
  },
  {
    name: 'create_macro',
    description:
      'Create a NEW macro from the given Ui.Vision JSON and save it in the "AI Generated" folder under a new, unique name (the Name field, with _1/_2 appended if taken). For a JS script macro pass {"Name": "...", "Script": "<modern JavaScript>"} — the .js name suffix is added automatically. The previously open macro is left untouched. The new macro opens in the editor — refine it afterwards with set_macro, do not call create_macro again for fixes. Returns the final macro name.',
    parameters: {
      type: 'object',
      properties: {
        macro_json: {
          type: 'string',
          description: 'The complete macro as a Ui.Vision JSON string, including a descriptive Name.'
        }
      },
      required: ['macro_json']
    }
  },
  {
    name: 'run_macro',
    description:
      'Run the macro currently in the editor (command table or JS script) against the browser tab and wait for it to finish. Returns the execution log, including the error and failing line (for scripts: the exact script line number) if it fails. Guard: if the editor holds an untouched preinstalled demo macro, the call is rejected — running it would fire commands the user never asked for; retry with confirm_demo_run: true only when the user explicitly asked to run or fix that demo.',
    parameters: {
      type: 'object',
      properties: {
        confirm_demo_run: {
          type: 'boolean',
          description: 'Set true ONLY when the user explicitly asked to run, test or fix the preinstalled demo macro currently in the editor.'
        }
      },
      required: []
    }
  },
  {
    name: 'get_page',
    description:
      'Returns a browser tab structure: URL, title, form fields, buttons and links, each with a ready-to-use locator (id=, name= or css=). Includes iframes. Use this before writing form-filling macros. Pass "url" to OPEN that page first and inspect it — that is the way to look at a page the browser is not on yet; never build and run a throwaway macro just to navigate. Omit "url" to inspect whatever tab is open now. Blind spot: cannot see into closed shadow roots or cross-origin iframes — an element visible in a screenshot but missing here (typical for cookie/consent banners) must be clicked visually — uiv.browser.click(uiv.ocr.findText(...)) or uiv.browser.click(uiv.findImage(...)) in a JS script — not hunted for in the DOM.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Optional. Navigate the tab here first, wait for the load, then inspect. http(s) or file URL; a bare domain like "ui.vision/contact" gets https:// added.'
        }
      },
      required: []
    }
  },
  {
    name: 'screenshot',
    description: 'Returns a screenshot of the visible part of the current browser tab. The result states the image size in pixels; coordinates passed to save_element_image / save_relative_image are absolute pixels in this image, origin at the top-left corner. Pass scope: "desktop" to capture the WHOLE SCREEN instead (needs the RealUser XModule) — use it to see and verify desktop automation (uiv.desktop.*, XRun): check where a native window sits, whether it has focus, and what its display really shows. The extension panel is covered dark during a desktop capture, so its own text never pollutes the image.',
    parameters: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['browser', 'desktop'],
          description: 'Optional. "browser" (default) = visible part of the current tab; "desktop" = the whole screen via the XModule.'
        }
      },
      required: []
    }
  },
  {
    name: 'save_relative_image',
    description:
      'Create a green/pink RELATIVE vision image from the MOST RECENT screenshot, for commands like "XClickRelative | Target: <name>.png" (also XMoveRelative/OCRExtractRelative). In a JS script prefer the composed form instead: a finder on the anchor plus uiv.offset — relative images are a classic-command feature. The green box marks the ANCHOR — a distinctive element that is searched on the page; the pink box marks WHERE to click/move, positioned relative to the anchor. Use when the click target itself has no stable appearance (empty input next to a label, a position on a slider track, an unlabeled spot near an icon). Boxes must not overlap; make each at least 20x20 px and include a few px margin around the element (the drawn outline consumes the border). Coordinates are ABSOLUTE pixels in the last screenshot (origin top-left, NOT normalized to a 0-1000 scale). Returns the file name to use as Target, plus the saved image so you can verify the boxes mark the intended elements — if they do not, call this tool again with corrected coordinates and the same name to overwrite it.',
    parameters: {
      type: 'object',
      properties: {
        anchor_x: { type: 'number', description: 'Left edge of the green anchor box' },
        anchor_y: { type: 'number', description: 'Top edge of the green anchor box' },
        anchor_width: { type: 'number' },
        anchor_height: { type: 'number' },
        target_x: { type: 'number', description: 'Left edge of the pink click/move box' },
        target_y: { type: 'number', description: 'Top edge of the pink click/move box' },
        target_width: { type: 'number' },
        target_height: { type: 'number' },
        name: { type: 'string', description: 'Base name for the image file, e.g. "warmth_slider_right" (letters, digits, underscore)' }
      },
      required: ['anchor_x', 'anchor_y', 'anchor_width', 'anchor_height', 'target_x', 'target_y', 'target_width', 'target_height', 'name']
    }
  },
  {
    name: 'save_element_image',
    description:
      'Crop a rectangle from the MOST RECENT screenshot and save it as a vision image, for use with the visual finders — uiv.findImage(\'<name>.png\') in a JS script (e.g. uiv.browser.click(uiv.findImage(...))) — or in image-based table commands like "visualAssert | Target: <name>.png" or "XClick | Target: <name>.png". Coordinates are ABSOLUTE pixels in the last screenshot you received (origin top-left, NOT normalized to a 0-1000 scale). Crop tightly around the element (e.g. a button) with a few pixels of margin. Returns the saved file name to use as Target, plus the cropped image itself so you can verify it shows the intended element — if it does not, call this tool again with corrected coordinates and the same name to overwrite it. A repeat save with the same name returns the crop with surrounding context and a red outline around the crop area, so you can see which direction to correct. The result also reports how many spots on the page the image matches — if more than 1, use a larger, more distinctive crop.',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'Left edge of the crop, in pixels of the last screenshot' },
        y: { type: 'number', description: 'Top edge of the crop' },
        width: { type: 'number', description: 'Crop width in pixels' },
        height: { type: 'number', description: 'Crop height in pixels' },
        name: { type: 'string', description: 'Base name for the image file, e.g. "login_button" (letters, digits, underscore)' }
      },
      required: ['x', 'y', 'width', 'height', 'name']
    }
  }
]

// Every tool takes a `why` string — one short sentence the chat shows next to
// the action line so the user can follow what the agent is doing. Injected
// here so the schemas above don't each repeat it. Kept out of `required`:
// a model that omits it must still get its tool call executed.
for (const tool of MACRO_AGENT_TOOLS) {
  tool.parameters.properties.why = {
    type: 'string',
    description:
      'One short sentence shown live to the user: what this call does and why. Example: "Re-running the macro to verify the fix." Always provide it.'
  }
}

// Runs inside the page via chrome.scripting — must be fully self-contained
function extractPageDigest() {
  const locatorFor = (el: Element): string => {
    const id = el.getAttribute('id')
    if (id) return 'id=' + id
    const name = el.getAttribute('name')
    if (name) return 'name=' + name

    const parts: string[] = []
    let node: Element | null = el
    for (let depth = 0; node && node.nodeType === 1 && depth < 4; depth++) {
      if (node.id) {
        parts.unshift('#' + node.id)
        break
      }
      let seg = node.tagName.toLowerCase()
      const cls = typeof node.className === 'string' ? node.className.trim().split(/\s+/)[0] : ''
      if (cls) seg += '.' + cls.replace(/([^\w-])/g, '\\$1')
      const parent: Element | null = node.parentElement
      if (parent) {
        const sameTag = Array.prototype.filter.call(parent.children, (c: Element) => c.tagName === node!.tagName)
        if (sameTag.length > 1) {
          seg += ':nth-of-type(' + (Array.prototype.indexOf.call(sameTag, node) + 1) + ')'
        }
      }
      parts.unshift(seg)
      node = parent
    }
    return 'css=' + parts.join(' > ')
  }

  const labelFor = (el: any): string => {
    if (el.labels && el.labels.length) return (el.labels[0].innerText || '').trim().slice(0, 60)
    const aria = el.getAttribute('aria-label')
    if (aria) return aria.slice(0, 60)
    return ''
  }

  const fields: any[] = []
  document.querySelectorAll('input, select, textarea').forEach((el: any) => {
    if (fields.length >= 60) return
    const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase()
    if (type === 'hidden') return
    const field: any = {
      locator: locatorFor(el),
      type,
      label: labelFor(el),
      placeholder: el.getAttribute('placeholder') || ''
    }
    if (el.tagName === 'SELECT') {
      field.options = Array.prototype.slice.call(el.options, 0, 20).map((o: any) => o.label || o.value)
    }
    fields.push(field)
  })

  const clickables: any[] = []
  document.querySelectorAll('button, input[type=submit], input[type=button], a, [role=button]').forEach((el: any) => {
    if (clickables.length >= 60) return
    const text = (el.innerText || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 60)
    if (!text) return
    clickables.push({ locator: locatorFor(el), tag: el.tagName.toLowerCase(), text })
  })

  return {
    url: location.href,
    title: document.title,
    fields,
    clickables
  }
}

export interface MacroAgentToolsParams {
  logMessage: (message: string, userOrAi?: ComputerUseMessageType, isActionOrResult?: 'action' | 'result') => void
  shouldStop: () => boolean
  captureScreenShotFunction: (opts?: { desktop?: boolean }) => Promise<ArrayBuffer>
}

// commands that make a macro "visual" — used to guard against the agent
// silently converting a visual macro to DOM-selector commands
const isVisualCommand = (c: any): boolean => {
  const cmd = (c && c.cmd) || ''
  return /^(B(Click|Move|Type)|X(Click|Move|Type|MouseWheel)|visual|vision|OCR)/i.test(cmd)
}

export class MacroAgentTools {
  // reuse ComputerUse only for its screenshot pipeline (jimp downscale + base64)
  private screenshotter: ComputerUse
  // id of the macro file created by this agent session — the only file
  // set_macro is allowed to update in place; user macros are never touched
  private agentOwnedMacroId: string | null = null
  // raw (device-pixel) buffer + downscale factor of the last screenshot the
  // model saw — save_element_image crops from this
  private lastShot: { raw: ArrayBuffer; scaleFactor: number; width: number; height: number } | null = null
  // names already saved via save_element_image — a second save with the same
  // name is a retry, which gets the red-box context image in its result
  private savedCropNames = new Set<string>()

  constructor(private params: MacroAgentToolsParams) {
    this.screenshotter = new ComputerUse({
      captureScreenShotFunction: params.captureScreenShotFunction,
      handleMouseAction: () => Promise.resolve({ success: false, error: 'not supported' }),
      handleKeyboardAction: () => Promise.resolve({ success: false, error: 'not supported' }),
      logMessage: params.logMessage
    })
  }

  execute = async (name: string, args: any): Promise<MacroAgentToolResult> => {
    try {
      switch (name) {
        case 'get_macro':
          return { text: this.getMacro() }
        case 'set_macro':
          return await this.setMacro(args && args.macro_json, !!(args && args.allow_visual_to_dom))
        case 'create_macro':
          return await this.createMacro(args && args.macro_json)
        case 'run_macro':
          return await this.runMacro(!!(args && args.confirm_demo_run))
        case 'get_page':
          return await this.getPage(args && args.url)
        case 'screenshot':
          return await this.screenshot(!!(args && args.scope === 'desktop'))
        case 'save_element_image':
          return await this.saveElementImage(args)
        case 'save_relative_image':
          return await this.saveRelativeImage(args)
        default:
          return { text: `Unknown tool: ${name}`, isError: true }
      }
    } catch (e: any) {
      return { text: `Tool ${name} failed: ${e.message}`, isError: true }
    }
  }

  private getEditing() {
    return store.getState().editor.editing
  }

  // The logs store keeps only the last 500 entries (ADD_LOGS slices), so
  // collecting a run's lines by index breaks PERMANENTLY once the cap is hit:
  // logs.length pins at 500 and slice(lengthBefore) returns [] for every run
  // after (seen after an error flood wedged a play tab — all later bridge runs
  // reported "(no log output)"). Mark the run's start with the last entry's
  // unique id instead and cut after that entry; if the marker is gone (evicted
  // by 500+ new lines, or the user cleared the log), everything still in the
  // store is newer than the marker — take it all.
  private logMarker = (): string | null => {
    const logs = store.getState().logs
    return logs.length ? logs[logs.length - 1].id : null
  }

  private logsSinceMarker = (marker: string | null): any[] => {
    const logs = store.getState().logs
    if (marker === null) return logs
    const idx = logs.findIndex((l: any) => l.id === marker)
    return idx === -1 ? logs : logs.slice(idx + 1)
  }

  private getMacroName(): string {
    const src = this.getEditing().meta && this.getEditing().meta.src
    return src && src.name && src.name.length ? src.name : 'Untitled'
  }

  // Reject macros that use deprecated commands — the error names the modern
  // replacement, so the model can correct and resubmit
  private checkDeprecatedCommands = (commands: any[]): string | null => {
    const problems: string[] = []
    commands.forEach((c: any, i: number) => {
      const replacement = getDeprecatedCommandReplacement(c.cmd)
      if (replacement) {
        problems.push(`line ${i + 1}: "${c.cmd}" is deprecated — use "${replacement}" instead`)
      }
    })
    if (!problems.length) return null
    return `Error: the macro uses deprecated commands:\n${problems.join('\n')}\nPlease resubmit the macro with the modern commands.`
  }

  // Reject minified one-liner scripts — some models (first seen with
  // gpt-5.6-luna, live 2026-08-06) emit the whole Script as a single
  // semicolon-joined line. Valid JS, so nothing downstream complains, but
  // unreadable in the editor. The error asks for a formatted resubmit of the
  // same program (self-correct pattern, like checkDeprecatedCommands).
  // Heuristic: average line length far above what indented code produces
  // (formatted code averages ~40-60 chars/line) — a few long lines (xpaths,
  // banner HTML) inside an otherwise formatted script stay accepted.
  private checkMinifiedScript = (script: string): string | null => {
    const len = script.length
    if (len < 400) return null
    const lineCount = script.split('\n').length
    if (len / lineCount <= 160) return null
    return 'Error: the Script is minified — everything on one line (or a few very long lines). Resubmit the SAME program formatted as readable multi-line JavaScript: one statement per line, normal indentation, real newlines (\\n escapes in the JSON string). Do not change the logic.'
  }

  private getMacro = (): string => {
    const editing = this.getEditing()
    // JS script macro: the program lives in `script`, Commands is empty
    if (typeof (editing as any).script === 'string' && (editing as any).script.length) {
      return toJSONString({ name: this.getMacroName(), commands: [], script: (editing as any).script } as any, { ignoreTargetOptions: true })
    }
    if (!editing.commands || !editing.commands.length) {
      return 'The editor currently contains no macro (0 commands).'
    }
    return toJSONString({ name: this.getMacroName(), commands: editing.commands }, { ignoreTargetOptions: true })
  }

  private setMacro = async (macroJson: string, allowVisualToDom: boolean): Promise<MacroAgentToolResult> => {
    if (!macroJson || typeof macroJson !== 'string') {
      return { text: 'Error: set_macro requires macro_json (a Ui.Vision JSON string).', isError: true }
    }

    const editing = this.getEditing()

    let obj: any
    try {
      obj = fromJSONString(macroJson, this.getMacroName())
    } catch (e: any) {
      return { text: `Error: invalid macro JSON — ${e.message}`, isError: true }
    }

    const isScript = typeof obj.data.script === 'string'

    const deprecatedError = this.checkDeprecatedCommands(obj.data.commands)
    if (deprecatedError) {
      return { text: deprecatedError, isError: true }
    }

    const minifiedError = isScript ? this.checkMinifiedScript(obj.data.script) : null
    if (minifiedError) {
      return { text: minifiedError, isError: true }
    }

    // a visual macro must stay visual unless the user agreed to convert it
    // (script replacements are exempt: the routing to JS is deliberate, and
    // scripts have their own visual finders via uiv.img/uiv.ocr)
    const wasVisual = (editing.commands || []).some(isVisualCommand)
    const staysVisual = obj.data.commands.some(isVisualCommand)
    if (!isScript && wasVisual && !staysVisual && !allowVisualToDom) {
      return {
        text:
          'Error: the current macro is a VISUAL macro (XClick/visual/OCR commands), but your replacement removes all visual commands. Keep the visual approach when fixing it. If you believe DOM-selector commands would work better, ASK THE USER first (reply without tool calls) and only retry with allow_visual_to_dom: true after they agree.',
        isError: true
      }
    }

    const desc = isScript ? 'a JS script' : `${obj.data.commands.length} commands`
    const srcId = editing.meta && editing.meta.src && editing.meta.src.id

    // editing a macro this agent session created (or an unsaved Untitled one):
    // update it in place
    if (!srcId || srcId === this.agentOwnedMacroId) {
      store.dispatch(act.setEditing({ ...obj.data, meta: editing.meta }))
      if (srcId) {
        // keep the agent's own file in sync with the editor
        await store.dispatch(act.saveEditingAsExisted())
      }
      this.params.logMessage(`Macro "${this.getMacroName()}" updated (${desc})`, 'user', 'result')
      return {
        text: `OK — the macro "${this.getMacroName()}" now contains ${desc}. YOUR NEXT ACTION IS run_macro — this macro has NOT been tested yet, and an untested macro is a guess. Do NOT reply to the user first, and do NOT ask permission to run it.`
      }
    }

    // the open macro belongs to the user — never overwrite it. The fixed
    // version is saved as a new copy in the AI Generated folder instead.
    // Script macros keep the .js suffix at the END (it drives the tree icon
    // and the JS view routing).
    const base = this.getMacroName()
    const stem = base.replace(/\.js$/i, '')
    const keepJsExt = isScript || /\.js$/i.test(base)
    const copyName = (i: number) => (keepJsExt ? `${stem}_${i}.js` : `${stem}_${i}`)
    let name = copyName(1)
    for (let i = 2; findSameNameMacro(name, store.getState().editor.testCases); i++) {
      name = copyName(i)
    }

    store.dispatch(act.setEditing({ ...obj.data, meta: editing.meta }))
    await store.dispatch(act.saveEditingAsNew(name, '/AI Generated'))

    const newSrc = store.getState().editor.editing.meta.src
    this.agentOwnedMacroId = (newSrc && newSrc.id) || null

    this.params.logMessage(`Saved fixed version as "AI Generated/${name}" (original untouched)`, 'user', 'result')

    return {
      text: `OK — your changes were saved as a NEW macro "${name}" (${desc}) in the "AI Generated" folder; the user's original macro "${base}" was NOT modified. "${name}" is now open in the editor and further set_macro calls will update it. YOUR NEXT ACTION IS run_macro — this macro has NOT been tested yet, and an untested macro is a guess. Do NOT reply to the user first, and do NOT ask permission to run it. Tell the user the new macro name.`
    }
  }

  private createMacro = async (macroJson: string): Promise<MacroAgentToolResult> => {
    if (!macroJson || typeof macroJson !== 'string') {
      return { text: 'Error: create_macro requires macro_json (a Ui.Vision JSON string).', isError: true }
    }

    const state = store.getState()
    if (state.player.status !== Player.C.STATUS.STOPPED) {
      return { text: 'Error: a macro is currently running.', isError: true }
    }

    let obj: any
    try {
      // no fileName argument here: fromJSONString prefers it over the JSON's
      // "Name" field, which made every generated macro end up as "ai_macro"
      obj = fromJSONString(macroJson, undefined)
    } catch (e: any) {
      return { text: `Error: invalid macro JSON — ${e.message}`, isError: true }
    }

    const deprecatedError = this.checkDeprecatedCommands(obj.data.commands)
    if (deprecatedError) {
      return { text: deprecatedError, isError: true }
    }

    const minifiedError =
      typeof obj.data.script === 'string' ? this.checkMinifiedScript(obj.data.script) : null
    if (minifiedError) {
      return { text: minifiedError, isError: true }
    }

    // unique name: model's Name, with _1/_2/... appended on collision
    // ('__imported__' is fromJSONString's placeholder for a missing Name).
    // JS script macros always get the .js suffix — it drives the tree icon
    // and the auto-switch to the JS view.
    const isScript = typeof obj.data.script === 'string'
    const fallback = isScript ? 'ai_script' : 'ai_macro'
    const modelName = obj.name && obj.name !== '__imported__' ? obj.name : fallback
    const base =
      String(modelName)
        .replace(/\.js$/i, '')
        .replace(/[^a-zA-Z0-9 _-]/g, '_')
        .trim()
        .slice(0, 60) || fallback
    const withExt = (b: string) => (isScript ? `${b}.js` : b)
    let name = withExt(base)
    for (let i = 1; findSameNameMacro(name, store.getState().editor.testCases); i++) {
      name = withExt(`${base}_${i}`)
    }

    // load the commands into the editor, then persist them as a NEW macro
    // file in the /AI Generated folder (the previously open macro's file is not touched)
    store.dispatch(act.setEditing({ ...obj.data, meta: state.editor.editing.meta }))
    await store.dispatch(act.saveEditingAsNew(name, '/AI Generated'))

    const newSrc = store.getState().editor.editing.meta.src
    this.agentOwnedMacroId = (newSrc && newSrc.id) || null

    const desc = isScript ? 'JS script' : `${obj.data.commands.length} commands`
    this.params.logMessage(`Created macro "AI Generated/${name}" (${desc})`, 'user', 'result')

    return {
      text: `OK — created and saved a NEW macro named "${name}" (${desc}) in the "AI Generated" folder. It is now open in the editor; the previously open macro was not modified. YOUR NEXT ACTION IS run_macro — this macro has NOT been tested yet, and an untested macro is a guess. Do NOT reply to the user first, and do NOT ask permission to run it. Refine it with set_macro if it fails, and tell the user the macro name when you are done.`
    }
  }

  private runMacro = async (confirmDemoRun: boolean): Promise<MacroAgentToolResult> => {
    const state = store.getState()
    const { commands } = state.editor.editing

    // JS script macro: run it through the script runner instead of the player
    const script = (state.editor.editing as any).script
    if (typeof script === 'string' && script.length) {
      return this.runScriptMacro(script)
    }

    if (!commands || !commands.length) {
      return { text: 'Error: the editor contains no commands to run. Use set_macro first.', isError: true }
    }

    // Demo guard: on a fresh install the first preinstalled demo is often
    // auto-selected into the editor without the user ever choosing it, and
    // running it fires commands the user never asked for (CU_PlayTicTacToe
    // opens a game website). No per-chat state needed: any set_macro /
    // create_macro moves the editor to an "AI Generated" macro, so an
    // untouched demo here means the agent has not built anything yet.
    if (isUntouchedPreinstallDemo(state.editor.editing) && !confirmDemoRun) {
      return {
        text:
          `Error: the editor contains the preinstalled demo macro "${this.getMacroName()}", which neither you nor the user has modified — it was most likely auto-selected, not chosen, and running it would execute its commands (page navigation, clicks) the user never asked for. If the user's request is to build something new, create it with create_macro first and run that. Only if the user explicitly asked to run, test or fix this demo macro, retry run_macro with confirm_demo_run: true.`,
        isError: true
      }
    }

    if (state.player.status !== Player.C.STATUS.STOPPED) {
      return { text: 'Error: a macro is already running.', isError: true }
    }

    const runLogMarker = this.logMarker()

    // same tab targeting as the side panel Play button: the focused window's
    // active WEB tab — a bare query({active:true}) picks tabs[0] in window
    // order, which on multi-window setups can be an unrelated window's tab or
    // an extension/special page (seen on macOS: replay targeted a game site's
    // window and later commands failed with "no connection to browser tab")
    let tab = await getActiveWebTab()
    if (!tab) {
      tab = await getPlayTab().catch(() => null)
      if (!isWebTab(tab)) tab = null
    }
    if (!tab) {
      // no web tab anywhere — open ui.vision as the play tab (the macro's own
      // open/uiv.open navigates away as needed); same fallback the MCP bridge
      // uses (ensureWebTab), so chat and bridge behave alike on a fresh browser
      this.params.logMessage('No web tab open — opening https://ui.vision as the play tab', 'user', 'result')
      tab = await Ext.tabs.create({ url: 'https://ui.vision', active: true }).catch(() => null)
      if (tab && tab.id) {
        const deadline = Date.now() + 20000
        while (Date.now() < deadline) {
          const t: any = await Ext.tabs.get(tab.id).catch(() => null)
          if (t && t.status === 'complete') { tab = t; break }
          await delayMs(250)
        }
      }
    }
    if (!tab) {
      return { text: 'Error: no browser tab available to play the macro in.', isError: true }
    }
    await updateState(setIn(['tabIds', 'toPlay'], tab.id))

    const openTc = commands.find((c: any) => (c.cmd || '').toLowerCase() === 'open')
    const src = state.editor.editing.meta.src

    this.params.logMessage(`Running macro "${this.getMacroName()}" (${commands.length} commands)`, 'user', 'result')

    // let the user watch the run: show the Macro tab while playing,
    // return to the AI chat afterwards. aiRunningMacro puts the AI icon on
    // the Macro tab so the user sees WHO started this run
    store.dispatch(act.updateUI({ sidebarTab: 'Macro', aiRunningMacro: true }))

    try {
      store.dispatch(
        act.playerPlay({
          macroId: src && src.id,
          title: this.getMacroName(),
          extra: { id: src && src.id },
          mode: Player.C.MODE.STRAIGHT,
          playUrl: tab.url,
          playtabIndex: tab.index,
          playtabId: tab.id,
          startIndex: 0,
          startUrl: openTc ? openTc.target : null,
          resources: commands,
          postDelay: state.config.playCommandInterval * 1000,
          isStep: false
        })
      )

      await this.waitForPlayerToStop()
    } finally {
      store.dispatch(act.updateUI({ sidebarTab: 'AiChat', aiRunningMacro: false }))
    }

    const newLogs = this.logsSinceMarker(runLogMarker)
    const logText = newLogs
      .map((l: any) => `[${l.type}] ${l.text}`)
      .join('\n')
      .slice(-4000)
    const hasError = newLogs.some((l: any) => l.type === 'error')

    return {
      text: `Macro run ${hasError ? 'FAILED' : 'finished without errors'}.\n--- log ---\n${logText || '(no log output)'}`
    }
  }

  private runScriptMacro = async (script: string): Promise<MacroAgentToolResult> => {
    if (isScriptRunning()) {
      return { text: 'Error: a JS script is already running.', isError: true }
    }

    const runLogMarker = this.logMarker()
    this.params.logMessage(`Running JS script "${this.getMacroName()}"`, 'user', 'result')
    store.dispatch(act.updateUI({ sidebarTab: 'Macro', aiRunningMacro: true }))

    // the agent's Stop must reach the script (runScript resolves at run end).
    // Track WHO stopped it: a bare "Script stopped" verdict read as a macro
    // bug (endless while(true) macros can only ever end this way)
    let stoppedByChat = false
    const runStart = Date.now()
    const stopWatch = setInterval(() => {
      if (this.params.shouldStop()) {
        stoppedByChat = true
        stopScript()
      }
    }, 500)

    let result: { ok: boolean; error: string | null; errorLine: number | null }
    try {
      result = await runScript(script)
    } catch (e: any) {
      result = { ok: false, error: (e && e.message) || String(e), errorLine: null }
    } finally {
      clearInterval(stopWatch)
      store.dispatch(act.updateUI({ sidebarTab: 'AiChat', aiRunningMacro: false }))
    }

    const newLogs = this.logsSinceMarker(runLogMarker)
    const logText = newLogs
      .map((l: any) => `[${l.type}] ${l.text}`)
      .join('\n')
      .slice(-4000)

    const runSeconds = Math.round((Date.now() - runStart) / 1000)
    const verdict = result.ok
      ? 'finished without errors'
      : result.error === 'Script stopped'
        ? `STOPPED after ${runSeconds}s — ${stoppedByChat ? 'the chat turn was stopped, which cuts off the running macro' : 'the user pressed Stop'}. This is NOT a macro error, and there is no execution limit: a deliberately endless macro (a while(true) repeater/monitor) can only ever end this way. If the log below shows its loop completing cycles correctly, treat the macro as verified.`
        : `FAILED: ${result.error}${result.errorLine ? ` (script line ${result.errorLine})` : ''}`

    // final values of the script's top-level `var`s — published by the
    // runner into ui.scriptVars; often the fastest way to see WHERE a
    // script's logic went wrong (what a finder returned, what a check saw)
    const varsText = (() => {
      try {
        const vars = (store.getState().ui as any).scriptVars
        if (!vars || !Object.keys(vars).length) return ''
        return `\n--- final JS variable values ---\n${JSON.stringify(vars, null, 1).slice(0, 2000)}`
      } catch (e) {
        return ''
      }
    })()

    return {
      text: `JS script ${verdict}.\n--- log ---\n${logText || '(no log output)'}${varsText}`
    }
  }

  private waitForPlayerToStop = async (): Promise<void> => {
    // wait for the player to actually start ...
    const startWait = Date.now()
    while (Date.now() - startWait < 10000) {
      if (store.getState().player.status !== Player.C.STATUS.STOPPED) break
      if (this.params.shouldStop()) return
      await delayMs(300)
    }

    // ... then for it to finish (generous cap; macros can be slow)
    const runStart = Date.now()
    const maxMs = 10 * 60 * 1000
    while (Date.now() - runStart < maxMs) {
      if (store.getState().player.status === Player.C.STATUS.STOPPED) return
      if (this.params.shouldStop()) {
        try {
          getPlayer({ name: 'testCase' }).stop()
        } catch (e) {
          // player may not be initialized — nothing to stop
        }
        return
      }
      await delayMs(500)
    }
  }

  // Navigate the tab and wait for the load to finish. Without this, inspecting
  // a page the browser is not on yet meant building and running a throwaway
  // macro just to navigate — which runs whatever macro happens to be in the
  // editor, so the agent ended up running an unrelated macro and reading the
  // wrong page.
  private navigateForInspect = async (tabId: number, url: string): Promise<string | null> => {
    const timeoutMs = ((parseFloat(store.getState().config.timeoutPageLoad) || 60)) * 1000
    try {
      await Ext.tabs.update(tabId, { url })
    } catch (e: any) {
      return `Error: could not open ${url} — ${(e && e.message) || e}`
    }

    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const t: any = await Ext.tabs.get(tabId).catch(() => null)
      if (!t) return `Error: the tab was closed while loading ${url}.`
      // status flips to 'complete' on the NEW document; the url check keeps a
      // still-unloaded old page from being reported as ready
      if (t.status === 'complete' && t.url && t.url !== 'about:blank') return null
      await delayMs(150)
    }
    return `Error: ${url} did not finish loading within ${Math.round(timeoutMs / 1000)}s.`
  }

  private getPage = async (url?: string): Promise<MacroAgentToolResult> => {
    const wanted = (url || '').trim()
    const target = wanted ? (/^[a-z]+:/i.test(wanted) ? wanted : `https://${wanted}`) : ''
    if (target && !/^(https?:|file:)/i.test(target)) {
      return { text: `Error: cannot open ${target} — only http(s) and file URLs are supported.`, isError: true }
    }

    // same focused-window web-tab targeting as runMacro (see comment there)
    let tab = await getActiveWebTab()
    if (!tab) {
      tab = await getPlayTab().catch(() => null)
      if (!isWebTab(tab)) tab = null
    }
    if (!tab || !tab.id) {
      // No web tab anywhere — fresh browser, or a browser-internal page
      // focused (typical: Firefox sitting on about:debugging right after a
      // dev install). With a url we know where to go: open it in a NEW tab —
      // never navigate the internal page itself. Same fallback the MCP
      // bridge has (ensureWebTab). Without a url there is nothing to inspect.
      if (!target) {
        return { text: 'Error: no browser tab available to inspect. Pass a url to get_page to open one.', isError: true }
      }
      this.params.logMessage(`No web tab open — opening ${target} in a new tab`, 'user', 'result')
      tab = await Ext.tabs.create({ url: target, active: true }).catch(() => null)
      if (!tab || !tab.id) {
        return { text: `Error: could not open a tab for ${target}.`, isError: true }
      }
      await updateState(setIn(['tabIds', 'toPlay'], tab.id))
      const deadline = Date.now() + 20000
      while (Date.now() < deadline) {
        const t: any = await Ext.tabs.get(tab.id).catch(() => null)
        if (t && t.status === 'complete') { tab = t; break }
        await delayMs(250)
      }
    } else if (target) {
      this.params.logMessage(`Opening ${target}`, 'user', 'result')
      const navError = await this.navigateForInspect(tab.id, target)
      if (navError) return { text: navError, isError: true }
      tab = await Ext.tabs.get(tab.id).catch(() => tab)
    }

    if (!/^(https?:|file:)/.test((tab && tab.url) || '')) {
      return { text: `Error: cannot inspect this page (${tab && tab.url}) — only normal web pages are supported.`, isError: true }
    }

    this.params.logMessage('Reading page structure', 'user', 'result')

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: extractPageDigest
    })

    const frames = (results || [])
      .filter((r: any) => r && r.result)
      .map((r: any) => ({ frameId: r.frameId, ...r.result }))

    let text = JSON.stringify(frames.length === 1 ? frames[0] : frames, null, 1)
    if (text.length > 14000) {
      text = text.slice(0, 14000) + '\n... (truncated)'
    }
    return { text }
  }

  // draw a rectangle outline (3 px, clipped to the image) — used for the
  // green/pink relative boxes and the red retry-feedback box
  private drawRectOutline (image: any, x: number, y: number, w: number, h: number, color: number) {
    const thickness = 3
    const maxX = image.bitmap.width - 1
    const maxY = image.bitmap.height - 1
    const put = (px: number, py: number) => {
      if (px >= 0 && px <= maxX && py >= 0 && py <= maxY) {
        image.setPixelColor(color, px, py)
      }
    }
    for (let i = 0; i < thickness; i++) {
      for (let px = x; px < x + w; px++) {
        put(px, y + i)
        put(px, y + h - 1 - i)
      }
      for (let py = y; py < y + h; py++) {
        put(x + i, py)
        put(x + w - 1 - i, py)
      }
    }
  }

  // scale a rectangle from the model's screenshot coordinates back to raw
  // device pixels and clamp it into the image bounds
  private toRawRect (r: { x: number; y: number; w: number; h: number }) {
    const f = this.lastShot!.scaleFactor
    const W = this.lastShot!.width
    const H = this.lastShot!.height

    let x = Math.round(r.x / f)
    let y = Math.round(r.y / f)
    let w = Math.round(r.w / f)
    let h = Math.round(r.h / f)

    x = Math.max(0, Math.min(x, W - 1))
    y = Math.max(0, Math.min(y, H - 1))
    w = Math.max(1, Math.min(w, W - x))
    h = Math.max(1, Math.min(h, H - y))

    return { x, y, w, h }
  }

  private saveRelativeImage = async (args: any): Promise<MacroAgentToolResult> => {
    if (!this.lastShot) {
      return { text: 'Error: take a screenshot first — the box coordinates refer to the last screenshot.', isError: true }
    }

    const numKeys = ['anchor_x', 'anchor_y', 'anchor_width', 'anchor_height', 'target_x', 'target_y', 'target_width', 'target_height']
    if (numKeys.some((k) => typeof (args || {})[k] !== 'number' || isNaN(args[k]))) {
      return { text: `Error: save_relative_image requires numeric ${numKeys.join(', ')}.`, isError: true }
    }
    if (args.anchor_width < 14 || args.anchor_height < 14 || args.target_width < 8 || args.target_height < 8) {
      return { text: 'Error: boxes too small — the anchor box must be at least 14x14 px, the target box at least 8x8 px.', isError: true }
    }

    const anchor = this.toRawRect({ x: args.anchor_x, y: args.anchor_y, w: args.anchor_width, h: args.anchor_height })
    const target = this.toRawRect({ x: args.target_x, y: args.target_y, w: args.target_width, h: args.target_height })

    const baseName = String(args.name || 'ai_relative')
      .replace(/\.png$/i, '')
      // the model often reuses a file name from the macro, which already
      // carries the dpi suffix — strip it, it is re-appended below
      .replace(/_dpi_\d+$/i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60)

    // crop the union of both boxes with padding, so the outlines have room
    // and the contour detection finds closed rectangles
    const PAD = 8
    const left = Math.max(0, Math.min(anchor.x, target.x) - PAD)
    const top = Math.max(0, Math.min(anchor.y, target.y) - PAD)
    const right = Math.min(this.lastShot.width, Math.max(anchor.x + anchor.w, target.x + target.w) + PAD)
    const bottom = Math.min(this.lastShot.height, Math.max(anchor.y + anchor.h, target.y + target.h) + PAD)

    // Lazy-load jimp (~700 KB) so it stays out of the eager panel bundle
    const { Jimp } = await import('jimp')
    const image = await Jimp.read(this.lastShot.raw)
    image.crop({ x: left, y: top, w: right - left, h: bottom - top })

    // exact colors the kantusearch engine detects (±2 tolerance per channel):
    // green 0x00ff00 = anchor box, pink 0xfe1492 = relative target box
    const GREEN = 0x00ff00ff
    const PINK = 0xfe1492ff

    this.drawRectOutline(image, anchor.x - left, anchor.y - top, anchor.w, anchor.h, GREEN)
    this.drawRectOutline(image, target.x - left, target.y - top, target.w, target.h, PINK)

    const pngBuffer = await image.getBuffer('image/png')

    const dpi = Math.round(96 * (window.devicePixelRatio || 1))
    const fileName = `${baseName}_dpi_${dpi}.png`

    const visionStorage = getStorageManager().getVisionStorage()
    await visionStorage.write(fileName, new Blob([pngBuffer], { type: 'image/png' }))
    store.dispatch(act.listVisions())

    this.params.logMessage(`Saved relative vision image ${fileName} (green anchor + pink target)`, 'user', 'result')

    return {
      text: `OK — saved as "${fileName}" (green anchor box + pink target box), shown below. Verify the green box marks the anchor element and the pink box marks the click/move spot — if not, call save_relative_image again with corrected coordinates and the same name to overwrite it. Use it e.g. as: XClickRelative | Target: ${fileName}  or  XMoveRelative | Target: ${fileName}  (append @0.7 to adjust match confidence). The pink box area is clicked at the position relative to wherever the green anchor is found on the page.`,
      base64Image: Buffer.from(pngBuffer).toString('base64')
    }
  }

  private screenshot = async (desktop: boolean = false): Promise<MacroAgentToolResult> => {
    this.params.logMessage(desktop ? 'Taking desktop screenshot' : 'Taking screenshot', 'user', 'result')

    const raw = await this.params.captureScreenShotFunction(desktop ? { desktop: true } : undefined)
    if (!raw) {
      return { text: 'Error: failed to take a screenshot.', isError: true }
    }

    const processed: any = await this.screenshotter.processImage(raw)
    this.lastShot = {
      raw,
      scaleFactor: processed.scaleFactor || 1,
      width: processed.originalWidth,
      height: processed.originalHeight
    }

    const base64Image = Buffer.from(processed.scaledBuffer).toString('base64')
    const what = desktop ? 'the whole desktop/screen' : 'the current browser tab'
    return { text: `Screenshot of ${what} (${processed.scaledWidth}x${processed.scaledHeight} px, coordinates are absolute pixels in this image):`, base64Image }
  }

  private saveElementImage = async (args: any): Promise<MacroAgentToolResult> => {
    if (!this.lastShot) {
      return { text: 'Error: take a screenshot first — the crop coordinates refer to the last screenshot.', isError: true }
    }

    const { x, y, width, height, name } = args || {}
    if ([x, y, width, height].some((v) => typeof v !== 'number' || isNaN(v)) || width <= 0 || height <= 0) {
      return { text: 'Error: save_element_image requires numeric x, y, width, height (width/height > 0).', isError: true }
    }

    const baseName = String(name || 'ai_image')
      .replace(/\.png$/i, '')
      // the model often reuses a file name from the macro, which already
      // carries the dpi suffix — strip it, it is re-appended below
      .replace(/_dpi_\d+$/i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60)

    // model coordinates are in the (possibly downscaled) image it saw —
    // convert back to raw device pixels before cropping
    const f = this.lastShot.scaleFactor
    let rx = Math.round(x / f)
    let ry = Math.round(y / f)
    let rw = Math.round(width / f)
    let rh = Math.round(height / f)

    // clamp to image bounds
    rx = Math.max(0, Math.min(rx, this.lastShot.width - 1))
    ry = Math.max(0, Math.min(ry, this.lastShot.height - 1))
    rw = Math.max(1, Math.min(rw, this.lastShot.width - rx))
    rh = Math.max(1, Math.min(rh, this.lastShot.height - ry))

    const isRetry = this.savedCropNames.has(baseName)
    this.savedCropNames.add(baseName)

    // Lazy-load jimp (~700 KB) so it stays out of the eager panel bundle
    const { Jimp } = await import('jimp')
    const image = await Jimp.read(this.lastShot.raw)
    image.crop({ x: rx, y: ry, w: rw, h: rh })
    const pngBuffer = await image.getBuffer('image/png')

    // vision search scales matches by the _dpi_xx postfix; the raw capture is
    // in device pixels, so its dpi is 96 * devicePixelRatio
    const dpi = Math.round(96 * (window.devicePixelRatio || 1))
    const fileName = `${baseName}_dpi_${dpi}.png`

    const visionStorage = getStorageManager().getVisionStorage()
    await visionStorage.write(fileName, new Blob([pngBuffer], { type: 'image/png' }))
    store.dispatch(act.listVisions())

    this.params.logMessage(`Saved vision image ${fileName} (${rw}x${rh})`, 'user', 'result')

    const verifyText = await this.verifyCropUniqueness(pngBuffer)
    const usage = `Use it e.g. as: uiv.browser.click(uiv.findImage('${fileName}')) in a JS script ({minScore: 0.8} sets the match confidence; uiv.findImages(...)[1] picks the 2nd occurrence), or XClick | Target: ${fileName} in a table macro (@0.8 confidence, #2 second occurrence).`

    if (!isRetry) {
      return {
        text: `OK — saved as "${fileName}" (${rw}x${rh} px), shown below. Verify it shows the intended element — if it shows the wrong element or is badly cut off, call save_element_image again with corrected coordinates and the same name to overwrite it.${verifyText} ${usage}`,
        base64Image: Buffer.from(pngBuffer).toString('base64')
      }
    }

    // retry: return the crop in context — the surroundings plus a red outline
    // around the attempted box — so the model can see which way to correct
    const pad = Math.max(20, Math.round(80 / f))
    const ctxLeft = Math.max(0, rx - pad)
    const ctxTop = Math.max(0, ry - pad)
    const ctxRight = Math.min(this.lastShot.width, rx + rw + pad)
    const ctxBottom = Math.min(this.lastShot.height, ry + rh + pad)

    const ctxImage = await Jimp.read(this.lastShot.raw)
    this.drawRectOutline(ctxImage, rx, ry, rw, rh, 0xff0000ff)
    ctxImage.crop({ x: ctxLeft, y: ctxTop, w: ctxRight - ctxLeft, h: ctxBottom - ctxTop })
    const ctxBuffer = await ctxImage.getBuffer('image/png')

    return {
      text: `OK — overwrote "${fileName}" (${rw}x${rh} px). The saved image is the area INSIDE the red box in the picture below; the surroundings are shown for orientation only and are NOT part of the saved image. Check that the red box tightly encloses the intended element — if it is off, judge from the picture which direction and how far to move, then call save_element_image again with corrected coordinates and the same name.${verifyText} ${usage}`,
      base64Image: Buffer.from(ctxBuffer).toString('base64')
    }
  }

  // run the saved crop through the same kantusearch engine uiv.findImage
  // and XClick will use,
  // against the screenshot it was cut from. Exactly one match = unambiguous;
  // several matches mean the command may act on the wrong occurrence.
  private verifyCropUniqueness = async (pngBuffer: Buffer): Promise<string> => {
    try {
      const minSimilarity = Number(store.getState().config.defaultVisionSearchConfidence) || 0.6
      const results = await searchImageInExtension({
        patternImageUrl: 'data:image/png;base64,' + Buffer.from(pngBuffer).toString('base64'),
        targetImageUrl: 'data:image/png;base64,' + Buffer.from(this.lastShot!.raw).toString('base64'),
        minSimilarity,
        allowSizeVariation: false,
        enableGreenPinkBoxes: false,
        requireGreenPinkBoxes: false,
        patternScale: 1, // the pattern was cut from this very screenshot
        scaleDownRatio: 1,
        pageOffset: { x: 0, y: 0 },
        viewportOffset: { x: 0, y: 0 }
      })
      const n = results.length
      if (n === 1) {
        return ` Match check: the image matches exactly 1 spot on the page (confidence ${results[0].matched.score.toFixed(2)}) — unambiguous.`
      }
      if (n === 0) return '' // cannot really happen for a same-screenshot crop; stay silent rather than confuse the model
      const f = this.lastShot!.scaleFactor
      const spots = results
        .slice(0, 4)
        .map((r) => `${Math.round((r.matched.offsetLeft + r.matched.width / 2) * f)},${Math.round((r.matched.offsetTop + r.matched.height / 2) * f)}`)
        .join(' / ')
      const scores = results.map((r) => r.matched.score).sort((a, b) => b - a)
      const scoresText = scores
        .slice(0, 4)
        .map((s) => s.toFixed(2))
        .join(', ')
      const where = `centers at ${spots}${n > 4 ? ', ...' : ''}; scores ${scoresText}${n > 4 ? ', ...' : ''}`
      // Without a #n index the runtime clicks the HIGHEST-SCORING match, and the
      // crop was cut from this very screenshot, so the true spot scores ~1.0.
      // Multiple matches are only a problem when a lookalike scores nearly the
      // same — then rendering noise at runtime could flip the ranking.
      const runnerUp = scores[1]
      if (runnerUp <= 0.97) {
        return ` Match check: the image matches ${n} spots at confidence ${minSimilarity} (${where}), but the intended spot is the clear best match and the command clicks the highest-scoring match — the image is fine to use AS-IS, no re-crop needed. (Only if you need a different occurrence, append #n to the target — matches above the confidence are then counted top-to-bottom, left-to-right.)`
      }
      return ` WARNING: the image matches ${n} spots with near-identical scores (${where}, at confidence ${minSimilarity}) — the page contains visually identical copies of this crop, so best-match selection may click the wrong one. Either append #n to the target to pick the n-th occurrence (counted top-to-bottom, left-to-right among matches above the confidence), or save again with the same name using a crop that includes some visually UNIQUE surroundings — on repeating grids, merely enlarging the crop does not help.`
    } catch (e) {
      // verification is best-effort — never fail a successful save over it
      return ''
    }
  }
}
