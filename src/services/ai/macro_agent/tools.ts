import { getRunFrames } from '@/common/run_frames'
import * as act from '@/actions'
import { findSameNameMacro } from '@/actions'
import { getDeprecatedCommandReplacement } from '@/common/command'
import { fromJSONString, toJSONString } from '@/common/convert_utils'
import { isFirefox } from '@/common/dom_utils'
import { getPlayer, Player } from '@/common/player'
import { delayMs, setIn } from '@/common/utils'
import { updateState } from '@/ext/common/global_state'
import { getPlayTab } from '@/ext/common/tab'
import { isWebTab, pickBridgeTab } from '@/common/tab_utils'
import Ext from '@/common/web_extension'
import { store } from '@/redux'
import { getStorageManager } from '@/services/storage'
import { showDesktopLastInputMark, flashDesktopBorder } from '@/services/desktop_border'
import { ensureDesktopApp, getDesktopAppClient, macroRunTarget } from '@/services/desktop_app'
import { getNativeXYAPI } from '@/services/xy'
import { xmoduleVersionAtLeast } from '@/services/xmodules2/routing'
import { describeCommandTableScript, getClickTrail, getImageTrail, getOcrTrail, getPointTrail, isScriptRunning, runScript, stopScript } from '@/modules/script_runner'
import { transpileScript } from '@/modules/js_transpile'
import { isXModuleOcrAvailable } from '@/modules/ocr'
// Browser-scope image search on the Rust vision-core WASM engine (the only
// engine since 10.0.151; green/pink requests hard-fail with E347).
import { searchImageInExtensionRouted as searchImageInExtension } from '@/services/vision2/router'
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

// ---------------------------------------------------------- macro payloads
//
// A JS script reaches set_macro/create_macro through TWO levels of escaping
// when it travels inside macro_json: the program is a JSON string value, and
// that whole JSON document is itself a string inside the tool-call arguments.
// Models lose the inner level, and production logs showed it is by far the
// biggest tool-call failure class — a third of the chats that wrote a script
// hit it. Two shapes, every single time, and both come from selectors:
//
//   "Script":"uiv.$('xpath=//a[contains(@id, \'x\')]')"   \' is legal JS, not legal JSON
//   "Script":"uiv.$('css=[aria-label=\"Go\"]')"           a bare " ends the value early
//
// The real fix is the `script` parameter (see MACRO_AGENT_TOOLS): the program
// travels as a plain argument, the provider's own serializer escapes it once,
// and there is no second level left to get wrong. The repair below is the
// safety net for models that keep reaching for macro_json anyway. It runs
// ONLY after an honest parse has already failed, so a well-formed payload is
// never touched, and when every candidate fails the ORIGINAL parse error is
// what the model gets back — its character offsets still match what it sent.

const JSON_ESCAPE_RE = /\\(u[0-9a-fA-F]{4}|[\s\S])/g
const isValidJsonEscape = (esc: string): boolean => /^(["\\/bfnrt]|u[0-9a-fA-F]{4})$/.test(esc)

// \' -> \\' and \d -> \\d. An escape JSON does not know was meant as a LITERAL
// backslash in the JS source (xpath quoting, regex character classes), so the
// backslash is preserved rather than dropped — dropping it would silently
// turn /\d+/ into /d+/ and hand the user a macro that runs but is wrong.
const escapeStrayBackslashes = (s: string): string =>
  s.replace(JSON_ESCAPE_RE, (m, esc) => (isValidJsonEscape(esc) ? m : '\\\\' + esc))

// Decode a JSON string body leniently: valid escapes resolve, invalid ones
// keep their backslash, and a bare " is just a quote. JSON.stringify then
// re-encodes the result properly.
const decodeJsonStringLoose = (raw: string): string =>
  raw.replace(JSON_ESCAPE_RE, (m, esc) => {
    switch (esc) {
      case 'n': return '\n'
      case 't': return '\t'
      case 'r': return '\r'
      case 'b': return '\b'
      case 'f': return '\f'
      case '"': return '"'
      case '\\': return '\\'
      case '/': return '/'
      default:
        return esc.length === 5 && esc[0] === 'u'
          ? String.fromCharCode(parseInt(esc.slice(1), 16))
          : '\\' + esc
    }
  })

// Rewrite one string value as a correctly encoded JSON string. Where it ends
// is exactly what a stray quote destroys, so every quote that COULD close it is
// tried — earliest first, because the shortest value that still leaves a valid
// document is the right reading. Only quotes followed by , or } are candidates
// (JSON grammar), and the winner must actually produce a string under the key.
// Parameterized by key: macro_json carries the program under "Script", the
// tool-call arguments carry it under "script".
const repairStringValueEnvelope = (s: string, key: string): string[] => {
  const m = new RegExp(`"${key}"\\s*:\\s*"`).exec(s)
  if (!m) return []
  const valueStart = m.index + m[0].length
  const head = s.slice(0, valueStart - 1)
  const out: string[] = []
  for (let i = valueStart; i < s.length && out.length < 300; i++) {
    if (s[i] !== '"') continue
    if (!/^\s*[,}]/.test(s.slice(i + 1))) continue
    out.push(head + JSON.stringify(decodeJsonStringLoose(s.slice(valueStart, i))) + s.slice(i + 1))
  }
  return out
}

const repairScriptEnvelope = (s: string): string[] => repairStringValueEnvelope(s, 'Script')

// The same failure class one envelope further out: the tool-call `arguments`
// string itself is model-emitted JSON, and a big script under the "script"
// parameter breaks it exactly the way macro_json used to break — a hand-written
// \' or a bare " inside the program. Same repairs, applied to the arguments
// document; runs ONLY after an honest JSON.parse has failed, so a well-formed
// call is never touched. Returns the parsed arguments object or throws the
// ORIGINAL parse error (its character offsets still match what the model sent).
export const parseToolCallArgumentsLenient = (raw: string): any => {
  try {
    return JSON.parse(raw)
  } catch (firstError) {
    const candidates = [escapeStrayBackslashes(raw), ...repairStringValueEnvelope(raw, 'script'), ...repairStringValueEnvelope(raw, 'macro_json')]
    for (const candidate of candidates) {
      try {
        const obj = JSON.parse(candidate)
        if (obj && typeof obj === 'object') return obj
      } catch (e) {
        /* next candidate */
      }
    }
    throw firstError
  }
}

// A parse error alone ("position 8412") is useless to a model staring at a
// 10KB payload it cannot see — production showed it resending the same broken
// escape until it gave up. Point at the spot: the error text plus the raw
// characters around the failure offset.
export const describeJsonParseError = (raw: string, err: any): string => {
  const msg = String((err && err.message) || err)
  const m = /position (\d+)/i.exec(msg)
  if (!m) return msg
  const pos = parseInt(m[1], 10)
  const from = Math.max(0, pos - 90)
  const to = Math.min(raw.length, pos + 90)
  return `${msg} — the characters around that position: ${JSON.stringify(raw.slice(from, pos))} >>HERE>> ${JSON.stringify(raw.slice(pos, to))}`
}

// fromJSONString, with the escaping repairs above as a fallback. Throws the
// FIRST (real) error when nothing salvages the payload.
const parseMacroJsonLenient = (macroJson: string, fileName?: string): any => {
  try {
    return fromJSONString(macroJson, fileName)
  } catch (firstError) {
    const candidates = [escapeStrayBackslashes(macroJson), ...repairScriptEnvelope(macroJson)]
    for (const candidate of candidates) {
      try {
        // `script` is absent from fromJSONString's declared return type (it is
        // only there for JS script macros), hence the any
        const obj: any = fromJSONString(candidate, fileName)
        if (typeof obj.data.script === 'string' || obj.data.commands.length) return obj
      } catch (e) {
        /* next candidate */
      }
    }
    throw firstError
  }
}

// JS ONLY (OPEN-ISSUES 22, decided 2026-09-03): the agent tools create, edit
// and run JS script macros exclusively. Classic command-table macros stay
// fully supported in the Ui.Vision IDE and player — Claude just does not
// drive them: that path lacks the script runner's tab handling (21.1), its
// diagnostics and the self-checks a script can do, and every fix would have
// to be made twice. A table the user brings is converted, never edited.
const JS_ONLY_MESSAGE = (tool: string, macroName?: string, commandCount?: number): string => {
  const what = macroName ? `"${macroName}" is a classic command-table macro (${commandCount} commands)` : 'a command table ("Commands") is not accepted, only {"Name", "Script"}'
  return `Error: ${tool} works with JS script macros only — ${what}. Convert it to a script and work on the copy; the user's original table macro stays untouched in the IDE (where classic macros keep working as before): 1) get_macro (or open_macro + get_macro) to read the commands; 2) rewrite them as a JS script — most commands have a uiv.* form (open → uiv.goto, click → uiv.page.click, type → uiv.page.fill, XClick on an image → uiv.findImage + uiv.desktop.mouse.click, waits → the auto-wait of every finder), and anything without one runs verbatim as uiv.run('command', target, value); table control flow (if/while/gotoLabel/times) becomes plain JS; 3) create_macro {name, script}; 4) run_macro. Say in your summary that the macro is now a JS script and where the original is.`
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
      'Apply changes to the macro in the editor — for iterating on THE MACRO THIS CONVERSATION IS ABOUT. A request that is a DIFFERENT TASK from the open macro is create_macro, not set_macro: the editor happening to hold an older macro does not make an unrelated request a fix of it, and hijacking it leaves a macro whose name describes something it no longer does. For a JS script macro — which is what you always write — pass the program in "script" and nothing else. Only a command-table macro needs "macro_json" ({"Name": "...", "Commands": [{"Command": "...", "Target": "...", "Value": "..."}]}). The user\'s original macro file is NEVER overwritten: the first change to a user macro is saved as a new copy in the AI Generated folder (named after the original, or after "name" when given), which then becomes the macro you keep editing. If the current macro uses visual commands (XClick/visual/OCR), replacing them all with DOM commands is rejected unless allow_visual_to_dom is true — ask the user first. Returns the macro name that was written, or a validation error.',
    parameters: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          description:
            'PREFERRED for JS script macros: the complete program as plain modern JavaScript. Write it exactly as it should appear in the editor — real newlines and real quotes, NO JSON escaping (no \\n, no \\", no \\\'). The macro keeps its current name unless "name" is given.'
        },
        name: {
          type: 'string',
          description: 'Optional. Give the saved copy THIS name instead of deriving one from the old macro. Use it whenever your change alters WHAT THE MACRO DOES — the name should describe the new behaviour, not the task the file used to do.'
        },
        allow_visual_to_dom: {
          type: 'boolean',
          description: 'Set true ONLY after the user explicitly agreed to convert a visual macro to DOM-selector commands.'
        }
      },
      required: []
    }
  },
  {
    name: 'create_macro',
    description:
      'Create a NEW JS script macro and save it in the "AI Generated" folder under a new, unique name (_1/_2 appended if taken). Pass "name" and "script"; the .js suffix is added automatically. JS ONLY — there is no command-table form: a classic macro the user wants changed is converted to a script (get_macro → rewrite → create_macro), the original stays untouched. The previously open macro is left untouched. The new macro opens in the editor — refine it afterwards with set_macro, do not call create_macro again for fixes. Returns the final macro name.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Descriptive macro name, no extension (used with "script").'
        },
        script: {
          type: 'string',
          description:
            'PREFERRED for JS script macros: the complete program as plain modern JavaScript. Write it exactly as it should appear in the editor — real newlines and real quotes, NO JSON escaping (no \\n, no \\", no \\\').'
        },
      },
      required: ['name', 'script']
    }
  },
  {
    name: 'run_macro',
    description:
      'Run the JS script macro currently in the editor against the browser tab and wait for it to finish. A macro named "<name>.d.js" or whose first statement is "use desktop-app" runs in the helper app Ui.Vision for Desktop instead (the result is the app log; no page delta or screenshot). JS ONLY: a classic command-table macro is refused — convert it first (get_macro, rewrite as a script, create_macro) and run the copy. Returns the execution log, including the error and failing line (for scripts: the exact script line number) if it fails. Guard: if the editor holds an untouched preinstalled demo macro, the call is rejected — running it would fire commands the user never asked for; retry with confirm_demo_run: true only when the user explicitly asked to run or fix that demo.',
    parameters: {
      type: 'object',
      properties: {
        confirm_demo_run: {
          type: 'boolean',
          description: 'Set true ONLY when the user explicitly asked to run, test or fix the preinstalled demo macro currently in the editor.'
        },
        look: {
          type: 'string',
          enum: ['delta', 'tree', 'shot', 'both', 'none'],
          description: 'What to return about the page AFTER the run, so one call acts and looks: "delta" (default over the bridge) = the tree lines that appeared or disappeared since the last look; "tree" = the full tree (6000 chars); "shot" = a screenshot; "both"; "none".'
        }
      },
      required: []
    }
  },
  {
    // Playwright MCP's name (OPEN-ISSUES 30.18 naming rule); get_page is the
    // alias since 10.0.216
    name: 'browser_snapshot',
    description:
      'Returns a browser tab structure. mode "tree" (default over the MCP bridge): the page as an accessibility tree — one line per node with role, accessible name and state (value, checked, expanded, disabled, offscreen), nested by container, the way a screen reader reads it; every interactive node carries [ref=N], and ref=N is a LOCATOR you can act on right away: uiv.page.click(\'ref=12\'), uiv.page.fill(\'ref=7\', text), uiv.$(\'ref=12\') for a match object (uiv.browser.click(uiv.$(\'ref=12\'))). Refs are numbered per page load and renumbered on navigation — after uiv.goto or a link click, call browser_snapshot again. Sturdier than a ref: act by what the tree PRINTS, with the Playwright finders — uiv.getByRole(\'button\', {name: \'Rechnung erstellen\'}), uiv.getByLabel(\'Unternehmen/Institution\'), uiv.getByText(...); these survive re-renders and navigations. mode "fields" (default in the chat): URL, title, form fields, buttons and links, each with a ready-to-use locator (id=, name= or css=) plus its ref. Includes iframes. Use this before writing form-filling macros. Pass "url" to OPEN that page first and inspect it — that is the way to look at a page the browser is not on yet; never build and run a throwaway macro just to navigate. Omit "url" to inspect whatever tab is open now. Blind spot: cannot see into closed shadow roots or cross-origin iframes — an element visible in a screenshot but missing here (typical for cookie/consent banners) must be clicked visually — uiv.browser.click(uiv.ocr.findText(...)) or uiv.browser.click(uiv.findImage(...)) in a JS script — not hunted for in the DOM.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Optional. Navigate the tab here first, wait for the load, then inspect. http(s) or file URL; a bare domain like "ui.vision/contact" gets https:// added.'
        },
        mode: {
          type: 'string',
          enum: ['tree', 'fields'],
          description: 'Optional. "tree" = structure with [ref=N] on interactive nodes, text owners and represented containers (default over the MCP bridge); refs identify elements, not guaranteed actions. Tables stay compact; use find with row text for cell refs. "fields" = the classic fields/clickables list with locators (default in the chat).'
        },
        max_chars: {
          type: 'number',
          description: 'Optional, tree mode. Character budget for the tree, 2000-60000 (default 12000). The result says how many nodes were cut when the page is bigger.'
        },
        find: {
          type: 'string',
          description: 'Optional, tree mode. Return nodes whose line contains this text (case-insensitive: a role, name or word), with their refs. Matching table rows include individual cell refs, so a custom clickable cell can be targeted without guessing a selector. Small pages may return the whole tree. Example: "download", "button \"Close", "invoice".'
        }
      },
      required: []
    }
  },
  {
    name: 'click_at',
    description:
      'EXPLORATION ONLY: click the point (x, y) read off the MOST RECENT screenshot — the tool converts the picture\'s pixels to the page or screen itself, so "click the thing in the picture" is one call. Browser screenshots click in the tab (trusted CDP click, any frame); desktop screenshots click on the screen through the XModule. Returns what changed on the page (like run_macro look: "delta"). A point is NOT a locator: for a macro that will be saved, act by ref/locator (browser_snapshot) or by a saved element image instead.',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'Pixels from the left edge of the last screenshot (zoomed views count).' },
        y: { type: 'number', description: 'Pixels from the top edge of the last screenshot.' },
        look: { type: 'string', enum: ['delta', 'tree', 'shot', 'both', 'none'], description: 'What to return afterwards; default "delta".' }
      },
      required: ['x', 'y']
    }
  },
  {
    name: 'type_at',
    description:
      'EXPLORATION ONLY: click the point (x, y) of the MOST RECENT screenshot and type text there (${KEY_ENTER} and the other key names are allowed). Same conversion and same caveat as click_at. Returns what changed on the page.',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        text: { type: 'string', description: 'The text to type after the click; key names like ${KEY_ENTER}, ${KEY_TAB}, ${KEY_CTRL+a} are honoured.' },
        via: { type: 'string', enum: ['keys', 'clipboard'], description: 'How the text goes in. "keys" (default) types it as keystrokes. "clipboard" puts the text on the OS clipboard and presses ONE paste chord — layout-proof, so use it for text with characters a remote-control viewer or a foreign keyboard layout mangles (a "|" dropped over AnyDesk). Only a TRAILING run of key names (…${KEY_ENTER}) is still pressed as keys; key names elsewhere in the text are pasted literally.' },
        chord: { type: 'string', description: 'With via "clipboard": the focused app\'s paste shortcut in Playwright key names. Default Control+V (Meta+V on macOS); a Linux terminal needs "Control+Shift+V".' },
        settle: { type: 'number', description: 'With via "clipboard": milliseconds between writing the clipboard and pressing the chord, for the clipboard to reach the target. Default 1000. A remote-control viewer plus a VM inside it is TWO syncs (viewer to host, VMware Tools into the guest): give it 2000–3000, or the paste delivers the PREVIOUS clipboard content.' },
        look: { type: 'string', enum: ['delta', 'tree', 'shot', 'both', 'none'], description: 'What to return afterwards; default "delta".' }
      },
      required: ['x', 'y', 'text']
    }
  },
  {
    name: 'screenshot',
    description:
      'Returns a screenshot of the visible part of the current browser tab. The result states the image size in pixels; coordinates passed to save_element_image / save_relative_image are absolute pixels in this image, origin at the top-left corner. Pass scope: "desktop" to capture the WHOLE SCREEN instead (needs the RealUser XModule) — use it to see and verify desktop automation (uiv.desktop.*, XRun): check where a native window sits, whether it has focus, and what its display really shows. The extension panel is covered dark during a desktop capture, so its own text never pollutes the image.\n' +
      'ZOOM — pass x, y, width, height (all four) to get a MAGNIFIED view of that region of the screenshot you already have, instead of a new capture. A full-screen capture is shrunk to fit, which leaves small controls a few pixels wide: a toolbar icon, a checkbox, one table cell, a single digit. Guessing a crop box for something that small from the overview picks the NEIGHBOURING element about as often as the right one, so ZOOM FIRST whenever the target is under ~40 px in the overview, then read the box off the magnified view. The zoomed image becomes the coordinate frame for the next save_element_image / save_relative_image call — those convert back to real screen pixels themselves and still save native-resolution pixels, so never scale coordinates by hand. Regions nest (zoom into a zoom); screenshot with no region returns to the full view. scope is ignored when a region is given, because no new capture is taken.\n' +
      'MARKS — pass marks: "elements" to get the visible interactive elements NUMBERED on the picture (red boxes) with a legend mapping every number to its locator and viewport rect: pick a target by number and use its locator; never estimate a pixel off the picture. IMAGE CONTRACT: every picture you receive is the real capture; the only markings ever added are numbered candidate boxes (elements, image matches, OCR matches), blue search-area rectangles, arrows/rings for the macro\'s own input and a magnified inset — each number has a legend line with exact coordinates, nothing else is painted, and no marking is ever page content.',
    parameters: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['browser', 'desktop'],
          description: 'Optional. "browser" (default) = visible part of the current tab; "desktop" = the whole screen via the XModule.'
        },
        marks: {
          type: 'string',
          enum: ['elements'],
          description: 'Optional. "elements" numbers the visible interactive elements of the tab (browser scope only) and returns a number -> locator + rect legend. Ignored with a zoom region.'
        },
        x: { type: 'number', description: 'Optional zoom region: left edge, in pixels of the last screenshot. Give all four of x/y/width/height or none.' },
        y: { type: 'number', description: 'Zoom region: top edge.' },
        width: { type: 'number', description: 'Zoom region width. Include some surroundings — a region tight around the target gives nothing to judge its identity by.' },
        height: { type: 'number', description: 'Zoom region height.' }
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
      'Crop a rectangle from the MOST RECENT screenshot and save it as a vision image, for use with the visual finders — uiv.findImage(\'<name>.png\') in a JS script (e.g. uiv.browser.click(uiv.findImage(...))) — or in image-based table commands like "visualAssert | Target: <name>.png" or "XClick | Target: <name>.png". Coordinates are ABSOLUTE pixels in the last screenshot you received (origin top-left, NOT normalized to a 0-1000 scale). SIZING THE BOX: for a normal-sized control (a button, a labelled field) crop tightly with a few pixels of margin. For a SMALL element — a toolbar icon, a checkbox, an arrow, one grid cell — do NOT crop tight: a tiny picture has little structure to match on, and its same-sized neighbours look identical to it, so the runtime can match the wrong one. Take a WIDER box that keeps the target EXACTLY IN THE CENTRE and includes its stable neighbours (for one icon in a toolbar row: the icon to its left and the one to its right). This costs nothing at click time — the finders return the match CENTRE, so uiv.browser.click(uiv.findImage(...)) still lands on the target — and it is much harder to confuse. The exception is surroundings that CHANGE between runs (a badge, a counter, varying text): exclude those and stay tight. WHAT MAKES A CROP MATCHABLE IS STRUCTURE — edges, corners, outlines, text. The local image search has almost nothing to work with in a flat area of near-uniform colour, so a crop of a plain fill, a blank panel or a solid-colour shape matches unstably and can hit anywhere that colour appears; when the target itself is flat, widen the box until it takes in real detail (a border, a label, an adjacent control) and keep the target centred. The result reports both problems if it detects them. Returns the saved file name to use as Target, plus a picture of the SURROUNDINGS with a red box around the saved area, so you can check the crop against its neighbours — grabbing the element NEXT TO the intended one is the usual failure, and it is invisible without that context. If the box is off, call this tool again with corrected coordinates and THE SAME NAME to overwrite it; a new name leaves the wrong file in storage. IF THE TARGET IS SMALL in the current view (under ~40 px — a toolbar icon, a checkbox, one cell), do not guess the box from a shrunk overview: call screenshot with x/y/width/height around it first and read the coordinates off the magnified view. The result also reports how many spots on the page the image matches, which is a findability check only and never confirms that the right element was cropped.',
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
  // number -> element table for ref= locators (OPEN-ISSUES 14). Lives on
  // the window of the extension's ISOLATED world: page scripts never see
  // it, nothing is written into the DOM, and it dies with the document. The
  // same element keeps its number across calls within one page load.
  const refStore = (function () {
    const w: any = window
    if (!w.__uivRefs) w.__uivRefs = { seq: 0, map: new Map(), byEl: new WeakMap(), sig: new Map() }
    const s = w.__uivRefs
    if (!s.sig) s.sig = new Map()
    // KEEP THE THREE COPIES OF THIS BLOCK IDENTICAL (digest, tree, marks).
    // A framework that re-keys its form on every state change detaches the
    // numbered node while the same control is right there under a new node
    // (wise.com: five browser_snapshot round trips for one form, OPEN-ISSUES 20.4).
    // Remember an identity per number — tag, role/type/name attributes and
    // the label-ish text — so a detached ref can be re-resolved: by a stable
    // id first, else by the UNIQUE live node with the same identity.
    if (!s.sigOf) {
      s.sigOf = function (el: any): string {
        let t = el.getAttribute('aria-label') || ''
        if (!t && el.labels && el.labels.length) t = el.labels[0].innerText || ''
        if (!t) t = el.innerText || el.value || el.getAttribute('placeholder') || el.getAttribute('title') || el.getAttribute('alt') || ''
        t = String(t).replace(/\s+/g, ' ').trim().slice(0, 80)
        return el.tagName + '|' + (el.getAttribute('role') || '') + '|' + (el.getAttribute('type') || '') + '|' + (el.getAttribute('name') || '') + '|' + t
      }
      s.remember = function (n: number, el: any) {
        s.sig.set(n, { tag: el.tagName, id: el.getAttribute('id') || '', sig: s.sigOf(el) })
      }
      s.resolve = function (n: number): any {
        const old = s.map.get(n)
        if (!old) return { el: null, how: 'unknown' }
        if (old.isConnected) return { el: old, how: 'live' }
        const rec = s.sig.get(n)
        if (!rec) return { el: null, how: 'gone' }
        const label = rec.sig.split('|').pop()
        const doc = old.ownerDocument || document
        let found: any = null
        let how = ''
        if (rec.id) {
          const byId = doc.getElementById(rec.id)
          if (byId && byId.tagName === rec.tag) { found = byId; how = 'id' }
        }
        if (!found) {
          const all = doc.getElementsByTagName(rec.tag)
          const cands: any[] = []
          for (let i = 0; i < all.length; i++) if (s.sigOf(all[i]) === rec.sig) cands.push(all[i])
          if (cands.length === 1) { found = cands[0]; how = 'identity' }
          else return { el: null, how: cands.length ? 'ambiguous' : 'gone', count: cands.length, label: label }
        }
        s.map.set(n, found)
        s.byEl.set(found, n)
        return { el: found, how: how, label: label }
      }
    }
    return s
  })()
  const refFor = (el: Element): number => {
    let n = refStore.byEl.get(el)
    if (!n) {
      n = ++refStore.seq
      refStore.byEl.set(el, n)
      refStore.map.set(n, el)
    }
    refStore.remember(n, el) // refreshed every time: the label may have changed
    return n
  }
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

  // css=/xpath= locators stop at shadow boundaries, and so did this digest:
  // the radios and month buttons of a web-component form (Postbank's
  // db-radio / db-button, each in its own open shadow root) never made the
  // list, so the structure attached to a "not found" failure showed a page
  // WITHOUT the very dialog the macro was fighting, and the one locator kind
  // that reaches such nodes — ref= — was never suggested (OPEN-ISSUES 42.3).
  // Walk open shadow roots too; an entry from inside one gets locator 'ref=N'
  // (no css path can reach it) and shadow: true.
  const shadowRoots: any[] = []
  const collectShadowRoots = (root: any) => {
    const all = root.querySelectorAll('*')
    for (let i = 0; i < all.length; i++) {
      if (all[i].shadowRoot) { shadowRoots.push(all[i].shadowRoot); collectShadowRoots(all[i].shadowRoot) }
    }
  }
  collectShadowRoots(document)
  const inShadow = new WeakSet<any>()
  const queryDeep = (selector: string): any[] => {
    const out: any[] = Array.prototype.slice.call(document.querySelectorAll(selector))
    for (let r = 0; r < shadowRoots.length; r++) {
      const found = shadowRoots[r].querySelectorAll(selector)
      for (let i = 0; i < found.length; i++) { inShadow.add(found[i]); out.push(found[i]) }
    }
    return out
  }
  // An OPEN DIALOG comes first. The list is document order with a cap, and
  // a long navigation used to fill it before the dialog the macro died in
  // was reached — the attached digest was cut off hundreds of nav rows
  // before the "Als PDF exportieren" form (42.3).
  const visible = (e: any) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
  const dialogs: any[] = queryDeep('[role=dialog],[aria-modal=true],dialog[open],[role=alertdialog]').filter(visible)
  const dialogOf = (el: any): any => {
    let n: any = el
    while (n) {
      if (dialogs.indexOf(n) >= 0) return n
      n = n.parentNode || n.host // parentNode is null at a shadow root: step out through its host
    }
    return null
  }
  const dialogFirst = (els: any[]): any[] => {
    if (!dialogs.length) return els
    const inside: any[] = []
    const outside: any[] = []
    for (let i = 0; i < els.length; i++) (dialogOf(els[i]) ? inside : outside).push(els[i])
    return inside.concat(outside)
  }
  const dialogName = (d: any): string => {
    const h = d.querySelector('h1,h2,h3,h4,legend,[role=heading]')
    return String(d.getAttribute('aria-label') || (h && h.textContent) || d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)
  }
  let shadowCount = 0
  const place = (entry: any, el: any) => {
    if (inShadow.has(el)) { entry.locator = 'ref=' + entry.ref; entry.shadow = true; shadowCount++ }
    if (dialogs.length && dialogOf(el)) entry.inDialog = true
  }

  const fields: any[] = []
  dialogFirst(queryDeep('input, select, textarea')).forEach((el: any) => {
    if (fields.length >= 60) return
    const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase()
    if (type === 'hidden') return
    const field: any = {
      ref: refFor(el),
      locator: locatorFor(el),
      type,
      label: labelFor(el),
      placeholder: el.getAttribute('placeholder') || ''
    }
    if (el.tagName === 'SELECT') {
      field.options = Array.prototype.slice.call(el.options, 0, 20).map((o: any) => o.label || o.value)
    }
    place(field, el)
    fields.push(field)
  })

  const clickables: any[] = []
  // the cap used to be silent: on a page with a big navigation the buttons
  // that matter (main content, further down) simply never appeared and
  // nothing said the list was cut (OPEN-ISSUES 17.3) — count the rest
  let clickablesOmitted = 0
  // Icon-only controls (an <a role=button> holding only an <svg>, a trash/
  // download/close icon) used to be DROPPED here because their visible text
  // is empty — 15 invoice-download links on a billing page simply did not
  // exist for the agent (OPEN-ISSUES 29). Keep them and synthesize a label:
  // aria-label / labelledby / title → svg <title> / svg aria-label / img alt
  // → for anchors the host + last path segment of the href → the text of
  // the enclosing row. The href stays its own field: it says what the
  // control does ("…/pdf").
  const collapseText = (s: any, max: number) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max)
  const rowContext = (el: any): string => {
    const row = el.closest ? el.closest('[role=row], tr, li, [role=listitem]') : null
    return row ? collapseText(row.innerText, 80) : ''
  }
  const hrefHint = (href: string): string => {
    try {
      const u = new URL(href, location.href)
      const last = u.pathname.split('/').filter(Boolean).pop() || ''
      return u.host + (last ? '/…/' + last : '')
    } catch (e) { return href.slice(0, 40) }
  }
  dialogFirst(queryDeep('button, input[type=submit], input[type=button], a, [role=button], [role=link], [role=radio], [role=checkbox], [role=option], [role=menuitem], [role=tab]')).forEach((el: any) => {
    let text = collapseText(el.innerText || el.value, 60)
    let synthesized = false
    if (!text) {
      const by = el.getAttribute('aria-labelledby')
      const byEl = by ? document.getElementById(by.split(/\s+/)[0]) : null
      const svgTitle = el.querySelector ? el.querySelector('svg title') : null
      const svgEl = el.querySelector ? el.querySelector('svg[aria-label]') : null
      const imgEl = el.querySelector ? el.querySelector('img[alt]') : null
      const href = el.tagName === 'A' ? (el.getAttribute('href') || '') : ''
      text = collapseText(el.getAttribute('aria-label'), 60) ||
        (byEl ? collapseText(byEl.innerText, 60) : '') ||
        collapseText(el.getAttribute('title'), 60) ||
        (svgTitle ? collapseText(svgTitle.textContent, 60) : '') ||
        (svgEl ? collapseText(svgEl.getAttribute('aria-label'), 60) : '') ||
        (imgEl ? collapseText(imgEl.getAttribute('alt'), 60) : '') ||
        (href && href !== '#' && !/^javascript:/i.test(href) ? '(icon) ' + hrefHint(href) : '') ||
        (rowContext(el) ? '(icon) in row: ' + rowContext(el).slice(0, 50) : '')
      synthesized = !!text
      if (!text) return
    }
    // 60 used to be the cap: a settings page with a 50-link sidebar pushed
    // the 15 invoice-row controls at the bottom out of the list (29)
    if (clickables.length >= 150) { clickablesOmitted++; return }
    const entry: any = { ref: refFor(el), locator: locatorFor(el), tag: el.tagName.toLowerCase(), text }
    const role = el.getAttribute('role')
    if (role) entry.role = role
    if (el.tagName === 'A') {
      const href = el.getAttribute('href')
      if (href && href !== '#' && !/^javascript:/i.test(href)) entry.href = href.slice(0, 200)
    }
    if (synthesized) {
      entry.synthesized = true
      const ctx = rowContext(el)
      if (ctx) entry.context = ctx
    }
    place(entry, el)
    clickables.push(entry)
  })

  // no object spread here: this function is serialized into the page and
  // the compiler's spread helper would not travel with it
  const out: any = {
    url: location.href,
    title: document.title,
    fields,
    clickables
  }
  if (dialogs.length) {
    out.openDialog = dialogName(dialogs[0])
    out.dialogNote = 'an open dialog "' + out.openDialog + '" is listed FIRST (entries marked inDialog: true); the rest of the page sits behind it'
  }
  if (shadowCount) {
    out.shadowNote = shadowCount + ' entr' + (shadowCount === 1 ? 'y' : 'ies') + ' marked shadow: true sit inside open shadow roots — css=/xpath= locators cannot reach them; act by the ref= locator given (uiv.page.click(\'ref=N\'), uiv.$(\'ref=N\'))'
  }
  if (clickablesOmitted) {
    out.clickablesOmitted = clickablesOmitted
    out.note = clickablesOmitted + ' more clickable(s) NOT listed (150 shown, document order — a long navigation fills the list before the main content). Use mode "tree" with find, or locate the element with uiv.$$ and a css=/xpath= locator.'
  }
  return out
}

// Runs inside the page via chrome.scripting — must be fully self-contained.
// browser_snapshot {mode:'tree'} (OPEN-ISSUES 13): the page as an accessibility
// tree — role, accessible name, state (value/checked/expanded/disabled),
// nesting — the way a screen reader reads it, instead of a bag of selectors.
// Every interactive node carries [ref=N], usable as a locator right away.
// Injected with {allFrames: true}: like pageElementSearch, a frame only
// REPORTS if it is a reporting root (top frame, or a cross-origin child);
// same-origin child frames and open shadow roots are walked from their
// parent, so their refs land in the parent's table. Plain ES5 loops on
// purpose: the function is serialized into the page, so no compiled-in
// iteration helpers may appear.
function extractPageTree(maxNodes: number, find?: string) {
  // number -> element table for ref= locators (OPEN-ISSUES 14). Lives on
  // the window of the extension's ISOLATED world: page scripts never see
  // it, nothing is written into the DOM, and it dies with the document. The
  // same element keeps its number across calls within one page load.
  const refStore = (function () {
    const w: any = window
    if (!w.__uivRefs) w.__uivRefs = { seq: 0, map: new Map(), byEl: new WeakMap(), sig: new Map() }
    const s = w.__uivRefs
    if (!s.sig) s.sig = new Map()
    // KEEP THE THREE COPIES OF THIS BLOCK IDENTICAL (digest, tree, marks).
    // A framework that re-keys its form on every state change detaches the
    // numbered node while the same control is right there under a new node
    // (wise.com: five browser_snapshot round trips for one form, OPEN-ISSUES 20.4).
    // Remember an identity per number — tag, role/type/name attributes and
    // the label-ish text — so a detached ref can be re-resolved: by a stable
    // id first, else by the UNIQUE live node with the same identity.
    if (!s.sigOf) {
      s.sigOf = function (el: any): string {
        let t = el.getAttribute('aria-label') || ''
        if (!t && el.labels && el.labels.length) t = el.labels[0].innerText || ''
        if (!t) t = el.innerText || el.value || el.getAttribute('placeholder') || el.getAttribute('title') || el.getAttribute('alt') || ''
        t = String(t).replace(/\s+/g, ' ').trim().slice(0, 80)
        return el.tagName + '|' + (el.getAttribute('role') || '') + '|' + (el.getAttribute('type') || '') + '|' + (el.getAttribute('name') || '') + '|' + t
      }
      s.remember = function (n: number, el: any) {
        s.sig.set(n, { tag: el.tagName, id: el.getAttribute('id') || '', sig: s.sigOf(el) })
      }
      s.resolve = function (n: number): any {
        const old = s.map.get(n)
        if (!old) return { el: null, how: 'unknown' }
        if (old.isConnected) return { el: old, how: 'live' }
        const rec = s.sig.get(n)
        if (!rec) return { el: null, how: 'gone' }
        const label = rec.sig.split('|').pop()
        const doc = old.ownerDocument || document
        let found: any = null
        let how = ''
        if (rec.id) {
          const byId = doc.getElementById(rec.id)
          if (byId && byId.tagName === rec.tag) { found = byId; how = 'id' }
        }
        if (!found) {
          const all = doc.getElementsByTagName(rec.tag)
          const cands: any[] = []
          for (let i = 0; i < all.length; i++) if (s.sigOf(all[i]) === rec.sig) cands.push(all[i])
          if (cands.length === 1) { found = cands[0]; how = 'identity' }
          else return { el: null, how: cands.length ? 'ambiguous' : 'gone', count: cands.length, label: label }
        }
        s.map.set(n, found)
        s.byEl.set(found, n)
        return { el: found, how: how, label: label }
      }
    }
    return s
  })()
  const refFor = (el: Element): number => {
    let n = refStore.byEl.get(el)
    if (!n) {
      n = ++refStore.seq
      refStore.byEl.set(el, n)
      refStore.map.set(n, el)
    }
    refStore.remember(n, el) // refreshed every time: the label may have changed
    return n
  }

  if (window !== window.top) {
    let parentAccessible = true
    try { void (window.parent as any).document } catch (e) { parentAccessible = false }
    if (parentAccessible) return null
  }

  const LEAF: any = { button: 1, link: 1, textbox: 1, searchbox: 1, checkbox: 1, radio: 1, combobox: 1, option: 1, heading: 1, img: 1, menuitem: 1, menuitemcheckbox: 1, menuitemradio: 1, tab: 1, switch: 1, slider: 1, spinbutton: 1, progressbar: 1, file: 1 }
  // A plain cell/list item can carry its own text on one line. With child
  // elements, walk them normally so custom targets and nested controls survive.
  const TEXT_CONTAINER: any = { cell: 1, columnheader: 1, rowheader: 1, listitem: 1 }
  const INTERACTIVE: any = { button: 1, link: 1, textbox: 1, searchbox: 1, checkbox: 1, radio: 1, combobox: 1, listbox: 1, option: 1, menuitem: 1, menuitemcheckbox: 1, menuitemradio: 1, tab: 1, switch: 1, slider: 1, spinbutton: 1, file: 1 }
  const SKIP_TAG: any = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, SVG: 1, PATH: 1, HEAD: 1, META: 1, LINK: 1, TITLE: 1 }
  const TEXTBOX_INPUT: any = { text: 1, email: 1, url: 1, tel: 1, password: 1, date: 1, time: 1, 'datetime-local': 1, month: 1, week: 1, color: 1 }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const lines: string[] = []
  let total = 0
  let interactive = 0
  let truncated = false
  const query = String(find || '').trim().toLowerCase()

  const collapse = (s: string, max: number) => {
    const t = String(s || '').replace(/\s+/g, ' ').trim()
    return t.length > max ? t.slice(0, max - 1) + '…' : t
  }
  const q = (s: string) => '"' + s.replace(/"/g, '\\"') + '"'
  const attr = (el: Element, name: string) => el.getAttribute(name)

  const isHidden = (el: any): boolean => {
    if (SKIP_TAG[el.tagName]) return true
    if (attr(el, 'aria-hidden') === 'true') return true
    if (el.tagName === 'INPUT' && (attr(el, 'type') || '').toLowerCase() === 'hidden') return true
    const st = el.ownerDocument.defaultView.getComputedStyle(el)
    if (st.display === 'none' || st.visibility === 'hidden') return true
    return false
  }

  const roleOf = (el: any): string | null => {
    const explicit = (attr(el, 'role') || '').toLowerCase().split(/\s+/)[0]
    if (explicit === 'presentation' || explicit === 'none') return null
    if (explicit) return explicit
    const tag = el.tagName
    if (tag === 'A') return el.hasAttribute('href') ? 'link' : null
    if (tag === 'BUTTON' || tag === 'SUMMARY') return 'button'
    if (tag === 'INPUT') {
      const type = (attr(el, 'type') || 'text').toLowerCase()
      if (type === 'button' || type === 'submit' || type === 'reset' || type === 'image') return 'button'
      if (type === 'checkbox') return 'checkbox'
      if (type === 'radio') return 'radio'
      if (type === 'range') return 'slider'
      if (type === 'number') return 'spinbutton'
      if (type === 'search') return 'searchbox'
      if (type === 'file') return 'file'
      if (TEXTBOX_INPUT[type] || el.list) return 'textbox'
      return 'textbox'
    }
    if (tag === 'TEXTAREA') return 'textbox'
    if (tag === 'SELECT') return 'combobox'
    if (tag === 'OPTION') return null // listed with its <select>
    if (/^H[1-6]$/.test(tag)) return 'heading'
    if (tag === 'IMG') return attr(el, 'alt') ? 'img' : null
    if (tag === 'UL' || tag === 'OL') return 'list'
    if (tag === 'LI') return 'listitem'
    if (tag === 'NAV') return 'navigation'
    if (tag === 'MAIN') return 'main'
    if (tag === 'FORM') return 'form'
    if (tag === 'TABLE') return 'table'
    if (tag === 'TR') return 'row'
    if (tag === 'TD') return 'cell'
    if (tag === 'TH') return /^(row|rowgroup)$/i.test(attr(el, 'scope') || '') ? 'rowheader' : 'columnheader'
    if (tag === 'DIALOG') return 'dialog'
    if (tag === 'FIELDSET') return 'group'
    if (tag === 'IFRAME' || tag === 'FRAME') return 'frame'
    if (tag === 'LABEL') return null
    if (el.isContentEditable && attr(el, 'contenteditable') !== null) return 'textbox'
    return null
  }

  const textOf = (el: any, max: number) => collapse(el.innerText != null ? el.innerText : el.textContent, max)

  // Markup without for=/aria: the <label> (or heading-ish text) that sits
  // right before the control, at the control or up to two ancestors up.
  const precedingLabel = (el: any): string => {
    let node: any = el
    for (let up = 0; node && up < 3; up++) {
      let prev: any = node.previousElementSibling
      for (let back = 0; prev && back < 2; back++) {
        if (prev.tagName === 'LABEL' && !prev.control && !prev.querySelector('input,select,textarea')) return textOf(prev, 80)
        if (prev.tagName === 'LABEL') break
        prev = prev.previousElementSibling
      }
      node = node.parentElement
    }
    return ''
  }

  // set by nameOf: 'aria' when the name came from aria-label/aria-labelledby
  // (the visible text may say something else — OPEN-ISSUES 23.1)
  let nameFrom = ''
  const NATIVE_TAGS: any = { button: { BUTTON: 1, INPUT: 1, SUMMARY: 1 }, link: { A: 1 }, textbox: { INPUT: 1, TEXTAREA: 1 }, searchbox: { INPUT: 1 }, checkbox: { INPUT: 1 }, radio: { INPUT: 1 }, combobox: { SELECT: 1, INPUT: 1 }, listbox: { SELECT: 1 }, option: { OPTION: 1 }, slider: { INPUT: 1 }, spinbutton: { INPUT: 1 }, file: { INPUT: 1 } }
  // "button (div)": an ARIA role on a tag that is not its native element — a
  // locator written from the tree must use the TAG (24.2)
  const roleWord = (el: any, role: string): string => {
    const native = NATIVE_TAGS[role]
    if (!native || native[el.tagName]) return role
    return role + ' [tag=' + el.tagName.toLowerCase() + ']'
  }
  // the visible text when the accessible name came from aria-* and says
  // something else: the name is for a screen reader, the text is what a
  // click-by-text locator needs (23.1: link "download invoice" (text "Anzeigen"))
  const textNote = (el: any, name: string): string => {
    if (nameFrom !== 'aria') return ''
    const own = collapse(el.innerText != null ? el.innerText : '', 40)
    if (!own || own === name || name.indexOf(own) >= 0) return ''
    return ' (text ' + q(own) + ')'
  }
  // an interactive node with NO name (an icon-only link or button): say what
  // its icon is called and which row it sits in, so it is not just
  // "button [tag=a]" (OPEN-ISSUES 29)
  const nameless = (el: any): string => {
    let extra = ''
    const iconEl = el.querySelector ? el.querySelector('svg title, svg[aria-label], img[alt]') : null
    let icon = ''
    if (iconEl) {
      const t = String(iconEl.tagName || '').toLowerCase()
      icon = collapse(t === 'img' ? attr(iconEl, 'alt') : (t === 'title' ? iconEl.textContent : attr(iconEl, 'aria-label')), 40)
    }
    if (icon) extra += ' icon=' + q(icon)
    const row = el.closest ? el.closest('[role=row], tr, li, [role=listitem]') : null
    const ctx = row ? collapse(row.innerText, 60) : ''
    if (ctx) extra += ' context=' + q(ctx)
    return extra
  }
  // a long href keeps its TAIL — "…/pdf?s=ap" is the part that says what the
  // link does; the middle (tokens, ids) is what gets cut
  const shortHref = (href: string): string => (href.length <= 70 ? href : href.slice(0, 44) + '…' + href.slice(-22))

  const nameOf = (el: any, role: string): string => {
    nameFrom = ''
    const by = attr(el, 'aria-labelledby')
    if (by) {
      const parts: string[] = []
      const ids = by.split(/\s+/)
      for (let i = 0; i < ids.length; i++) {
        const t = el.ownerDocument.getElementById(ids[i])
        if (t) parts.push(textOf(t, 60))
      }
      const joined = collapse(parts.join(' '), 80)
      if (joined) { nameFrom = 'aria'; return joined }
    }
    const aria = attr(el, 'aria-label')
    if (aria) { nameFrom = 'aria'; return collapse(aria, 80) }
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || role === 'textbox' || role === 'combobox' || role === 'checkbox' || role === 'radio') {
      // a <label> that wraps SEVERAL controls (wise.com: one label around a
      // whole radiogroup of chips) names the group, not this control — it
      // is the last resort only, never the answer for five siblings at once
      // (OPEN-ISSUES 20.5)
      const CONTROLS = 'input,select,textarea,[role=radio],[role=checkbox],[role=switch],[role=textbox],[role=combobox]'
      const sole = (lbl: any) => !!lbl && lbl.querySelectorAll(CONTROLS).length <= 1
      let groupLabel = ''
      if (el.labels && el.labels.length) {
        if (sole(el.labels[0])) return textOf(el.labels[0], 80)
        groupLabel = textOf(el.labels[0], 80)
      }
      const wrap = el.closest ? el.closest('label') : null
      if (wrap) {
        if (sole(wrap)) return textOf(wrap, 80)
        groupLabel = groupLabel || textOf(wrap, 80)
      }
      // Native input buttons render their caption from value, not innerText.
      // Restrict this fallback to button types; a text/password value is data.
      if (tag === 'INPUT' && /^(button|submit|reset)$/i.test(el.type || '')) {
        const caption = collapse(el.value, 80)
        if (caption) return caption
      }
      if (role === 'checkbox' || role === 'radio') {
        const t = textOf(el, 80)
        if (t) return t
      }
      const ph = attr(el, 'placeholder')
      if (ph) return collapse(ph, 80)
      const ti = attr(el, 'title')
      if (ti) return collapse(ti, 80)
      return precedingLabel(el) || groupLabel
    }
    if (tag === 'IMG') return collapse(attr(el, 'alt') || '', 80)
    if (tag === 'FIELDSET') {
      const lg = el.querySelector('legend')
      return lg ? textOf(lg, 80) : ''
    }
    if (tag === 'IFRAME' || tag === 'FRAME') return collapse(attr(el, 'title') || attr(el, 'name') || attr(el, 'src') || '', 80)
    if (tag === 'TABLE') {
      const cap = el.querySelector('caption')
      return cap ? textOf(cap, 80) : ''
    }
    if (role === 'row') return '' // the children provide each cell's text/ref
    if (TEXT_CONTAINER[role]) return el.children.length ? '' : textOf(el, 80)
    if (LEAF[role] || role === 'dialog' || role === 'group' || role === 'navigation' || role === 'region') {
      const t = textOf(el, role === 'row' ? 160 : 80)
      if (t) {
        // a picker header whose text is just a placeholder ("Select…") is
        // named by the label above it, like a text field would be
        if (tag === 'SUMMARY' && /^(select|choose|pick)\b/i.test(t)) {
          const lbl = precedingLabel(el.parentElement || el)
          if (lbl) return lbl + ' (' + t + ')'
        }
        return t
      }
      const ti = attr(el, 'title')
      if (ti) return collapse(ti, 80)
    }
    return precedingLabel(el)
  }

  const stateOf = (el: any, role: string): string => {
    const s: string[] = []
    const tag = el.tagName
    if (role === 'heading') s.push('level=' + (attr(el, 'aria-level') || (/^H([1-6])$/.exec(tag) || [])[1] || '?'))
    if (el.disabled || attr(el, 'aria-disabled') === 'true') s.push('disabled')
    if (role === 'checkbox' || role === 'radio' || role === 'switch' || role === 'menuitemcheckbox' || role === 'menuitemradio') {
      const ac = attr(el, 'aria-checked')
      s.push('checked=' + (ac != null ? ac : String(!!el.checked)))
    }
    if (attr(el, 'aria-pressed') != null) s.push('pressed=' + attr(el, 'aria-pressed'))
    if (attr(el, 'aria-selected') != null) s.push('selected=' + attr(el, 'aria-selected'))
    if (attr(el, 'aria-expanded') != null) s.push('expanded=' + attr(el, 'aria-expanded'))
    else if (tag === 'SUMMARY' && el.parentElement && el.parentElement.tagName === 'DETAILS') s.push('expanded=' + String(!!el.parentElement.open))
    if (el.required || attr(el, 'aria-required') === 'true') s.push('required')
    if (el.readOnly) s.push('readonly')
    if (tag === 'SELECT') {
      const opt = el.options && el.options[el.selectedIndex]
      s.push('value=' + q(collapse(opt ? (opt.label || opt.value) : '', 60)))
      if (el.options && el.options.length <= 20) {
        const labels: string[] = []
        for (let i = 0; i < el.options.length; i++) labels.push(collapse(el.options[i].label || el.options[i].value, 30))
        s.push('options=[' + labels.join(' | ') + ']')
      } else if (el.options) s.push('options=' + el.options.length)
    } else if (role === 'textbox' || role === 'searchbox' || role === 'spinbutton' || role === 'slider' || role === 'combobox') {
      const type = (attr(el, 'type') || '').toLowerCase()
      if (type === 'password') s.push(el.value ? 'value=(hidden)' : 'value=""')
      else if (el.value != null && tag !== 'DIV') s.push('value=' + q(collapse(el.value, 60)))
      else if (el.isContentEditable) s.push('value=' + q(textOf(el, 60)))
    }
    // every anchor shows its href, whatever role it claims — an <a role=button>
    // with an svg inside is still a link to somewhere, and the href is the one
    // attribute that says WHAT it does (a "…/pdf" invoice link, 29)
    if (role === 'link' || tag === 'A') {
      const href = attr(el, 'href')
      if (href && href !== '#' && !/^javascript:/i.test(href)) s.push('href=' + q(shortHref(href)))
    }
    if (INTERACTIVE[role]) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && (r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh)) s.push('(offscreen)')
    }
    return s.length ? ' ' + s.join(' ') : ''
  }

  // Interactive nodes inside an OPEN shadow root are reachable by ref= only —
  // css=/xpath= stop at the boundary. The tree already walked such roots
  // (Postbank's db-radio / db-button web components), but nothing said so,
  // and the next locator was an xpath that timed out (OPEN-ISSUES 42.3):
  // mark them "(shadow)" and count them for the header.
  let shadowDepth = 0
  let shadowHosted = 0
  const shadowMark = (): string => {
    if (!shadowDepth) return ''
    shadowHosted++
    return ' (shadow)'
  }

  const emit = (depth: number, line: string) => {
    total++
    if (lines.length >= maxNodes) { truncated = true; return }
    let pad = ''
    for (let i = 0; i < depth; i++) pad += '  '
    lines.push(pad + '- ' + line)
  }

  const walkChildren = (parent: Node, depth: number) => {
    const kids = parent.childNodes
    for (let i = 0; i < kids.length; i++) visit(kids[i], depth)
  }

  const visit = (node: Node, depth: number) => {
    if (truncated) return
    if (node.nodeType === 3) {
      const t = collapse((node as any).nodeValue, 120)
      if (!t) return
      // a label's text belongs to its control's name (for=, wrapping, or
      // the preceding-label rule in nameOf) — never a text line of its own
      const p: any = node.parentElement
      if (p && p.tagName === 'LABEL') return
      // A ref identifies the text's owning element, without asserting that it
      // has a button role or an observable event listener. Delegated handlers
      // can therefore be reached through the same ordinary ref locator.
      emit(depth, 'text ' + q(t) + (p ? ' [tag=' + p.tagName.toLowerCase() + '] [ref=' + refFor(p) + ']' + shadowMark() : ''))
      return
    }
    if (node.nodeType !== 1) return
    const el: any = node
    if (isHidden(el)) {
      if (attr(el, 'aria-hidden') === 'true') {
        const raw = String(el.innerText != null ? el.innerText : '')
        if (raw.replace(/\s+/g, ' ').trim().length > 300) {
          const r = (attr(el, 'role') || '').toLowerCase()
          emit(depth, '(' + (r || el.tagName.toLowerCase()) + ' with ' + Math.round(raw.length / 100) * 100 + ' characters of content is HIDDEN — aria-hidden="true", usually the page behind an open dialog or drawer; close it to see it: ' + q(collapse(raw, 60)) + ')')
        }
      }
      return
    }
    const role = roleOf(el)
    if (!role) {
      if (el.shadowRoot) { shadowDepth++; walkChildren(el.shadowRoot, depth); shadowDepth-- }
      walkChildren(el, depth)
      return
    }
    if (role === 'frame') {
      let childDoc: any = null
      try { childDoc = el.contentDocument } catch (e) { childDoc = null }
      if (childDoc && childDoc.body) {
        emit(depth, 'frame ' + q(nameOf(el, role)))
        walkChildren(childDoc.body, depth + 1)
      } else {
        emit(depth, 'frame ' + q(nameOf(el, role)) + ' (cross-origin — reported separately below if reachable)')
      }
      return
    }
    if (role === 'row') {
      const cells = Array.from(el.children) as Element[]
      const cellRoles: any = { cell: 1, columnheader: 1, rowheader: 1 }
      // Keep the default table summary compact. A focused lookup expands
      // matching rows with cell identity, without guessing event handlers.
      // Unusual row markup falls through to the general walk below.
      if (cells.length && cells.every(cell => isHidden(cell) || cellRoles[roleOf(cell) || ''])) {
        const visible = cells.filter(cell => !isHidden(cell))
        const summary = collapse(visible.map(cell => textOf(cell, 40)).join(' | '), 160)
        const expand = query && (summary.toLowerCase().includes(query) || textOf(el, Infinity).toLowerCase().includes(query))
        const entries = expand ? visible.map(cell => {
          const cr = roleOf(cell) as string
          const cn = collapse(nameOf(cell, cr), 40)
          return cr + (cn ? ' ' + q(cn) : '') + ' [ref=' + refFor(cell) + ']' + shadowMark() + stateOf(cell, cr)
        }) : []
        const rn = nameOf(el, role) || (expand ? '' : summary)
        emit(depth, 'row' + (rn ? ' ' + q(rn) : '') + ' [ref=' + refFor(el) + ']' + shadowMark() + stateOf(el, role) + (entries.length ? ': ' + entries.join(' | ') : ''))
        for (const cell of visible as any[]) {
          if (!cell.children.length && !cell.shadowRoot) continue // text is inline
          if (cell.shadowRoot) { shadowDepth++; walkChildren(cell.shadowRoot, depth + 1); shadowDepth-- }
          walkChildren(cell, depth + 1)
        }
        return
      }
    }
    const name = nameOf(el, role)
    let line = roleWord(el, role) + (name ? ' ' + q(name) + textNote(el, name) : '')
    if (INTERACTIVE[role] && !name) line += nameless(el)
    if (INTERACTIVE[role]) {
      interactive++
    }
    // Identity and interactivity are separate: rows, cells, list items and
    // other represented elements also need refs even without a widget role.
    line += ' [ref=' + refFor(el) + ']' + shadowMark()
    line += stateOf(el, role)
    emit(depth, line)
    if (LEAF[role] || (TEXT_CONTAINER[role] && !el.children.length && !el.shadowRoot)) return
    if (el.shadowRoot) { shadowDepth++; walkChildren(el.shadowRoot, depth + 1); shadowDepth-- }
    walkChildren(el, depth + 1)
  }

  walkChildren(document.body || document.documentElement, 0)
  return { url: location.href, title: document.title, lines, total, interactive, truncated, shadowHosted, isTop: window === window.top }
}

// Runs inside the page via chrome.scripting — must be fully self-contained.
// A cross-origin frame numbered its refs from 1 like the top frame did;
// shift them by a per-frame base so numbers are unique page-wide (frames
// cannot coordinate with each other from inside). Idempotent per frame.
function rebasePageRefs(base: number) {
  const w: any = window
  const store = w.__uivRefs
  if (!store || store.base != null) return { rebased: false }
  const moved = new Map()
  store.map.forEach((el: any, n: number) => { moved.set(n + base, el); store.byEl.set(el, n + base) })
  store.map = moved
  if (store.sig) {
    const sig = new Map()
    store.sig.forEach((rec: any, n: number) => sig.set(n + base, rec))
    store.sig = sig
  }
  store.seq = store.seq + base
  store.base = base
  return { rebased: true }
}

// Runs inside the page via chrome.scripting — must be fully self-contained.
// The visible interactive elements with VIEWPORT rects, in reading order,
// for screenshot {marks: 'elements'}: the numbers drawn on the picture map
// 1:1 to these entries (locator + rect), which is what makes the picture
// actionable for a model — "click #7" instead of an estimated pixel.
function extractElementMarks() {
  // number -> element table for ref= locators (OPEN-ISSUES 14). Lives on
  // the window of the extension's ISOLATED world: page scripts never see
  // it, nothing is written into the DOM, and it dies with the document. The
  // same element keeps its number across calls within one page load.
  const refStore = (function () {
    const w: any = window
    if (!w.__uivRefs) w.__uivRefs = { seq: 0, map: new Map(), byEl: new WeakMap(), sig: new Map() }
    const s = w.__uivRefs
    if (!s.sig) s.sig = new Map()
    // KEEP THE THREE COPIES OF THIS BLOCK IDENTICAL (digest, tree, marks).
    // A framework that re-keys its form on every state change detaches the
    // numbered node while the same control is right there under a new node
    // (wise.com: five browser_snapshot round trips for one form, OPEN-ISSUES 20.4).
    // Remember an identity per number — tag, role/type/name attributes and
    // the label-ish text — so a detached ref can be re-resolved: by a stable
    // id first, else by the UNIQUE live node with the same identity.
    if (!s.sigOf) {
      s.sigOf = function (el: any): string {
        let t = el.getAttribute('aria-label') || ''
        if (!t && el.labels && el.labels.length) t = el.labels[0].innerText || ''
        if (!t) t = el.innerText || el.value || el.getAttribute('placeholder') || el.getAttribute('title') || el.getAttribute('alt') || ''
        t = String(t).replace(/\s+/g, ' ').trim().slice(0, 80)
        return el.tagName + '|' + (el.getAttribute('role') || '') + '|' + (el.getAttribute('type') || '') + '|' + (el.getAttribute('name') || '') + '|' + t
      }
      s.remember = function (n: number, el: any) {
        s.sig.set(n, { tag: el.tagName, id: el.getAttribute('id') || '', sig: s.sigOf(el) })
      }
      s.resolve = function (n: number): any {
        const old = s.map.get(n)
        if (!old) return { el: null, how: 'unknown' }
        if (old.isConnected) return { el: old, how: 'live' }
        const rec = s.sig.get(n)
        if (!rec) return { el: null, how: 'gone' }
        const label = rec.sig.split('|').pop()
        const doc = old.ownerDocument || document
        let found: any = null
        let how = ''
        if (rec.id) {
          const byId = doc.getElementById(rec.id)
          if (byId && byId.tagName === rec.tag) { found = byId; how = 'id' }
        }
        if (!found) {
          const all = doc.getElementsByTagName(rec.tag)
          const cands: any[] = []
          for (let i = 0; i < all.length; i++) if (s.sigOf(all[i]) === rec.sig) cands.push(all[i])
          if (cands.length === 1) { found = cands[0]; how = 'identity' }
          else return { el: null, how: cands.length ? 'ambiguous' : 'gone', count: cands.length, label: label }
        }
        s.map.set(n, found)
        s.byEl.set(found, n)
        return { el: found, how: how, label: label }
      }
    }
    return s
  })()
  const refFor = (el: Element): number => {
    let n = refStore.byEl.get(el)
    if (!n) {
      n = ++refStore.seq
      refStore.byEl.set(el, n)
      refStore.map.set(n, el)
    }
    refStore.remember(n, el) // refreshed every time: the label may have changed
    return n
  }
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

  const MAX = 40
  const vw = window.innerWidth
  const vh = window.innerHeight
  const out: any[] = []
  let truncated = false
  const sel = 'button, input, select, textarea, a[href], [role=button], [role=link], [role=tab], [role=menuitem], [role=checkbox], [role=radio], [contenteditable=true]'
  document.querySelectorAll(sel).forEach((el: any) => {
    const type = (el.getAttribute('type') || '').toLowerCase()
    if (type === 'hidden') return
    const r = el.getBoundingClientRect()
    if (r.width < 6 || r.height < 6) return
    if (r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh) return
    const st = window.getComputedStyle(el)
    if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) return
    const text = String(el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || '')
      .trim().replace(/\s+/g, ' ').slice(0, 40)
    out.push({
      ref: refFor(el),
      locator: locatorFor(el),
      tag: el.tagName.toLowerCase(),
      text,
      x: Math.round(r.left),
      y: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height)
    })
  })
  // reading order: rows top-to-bottom (10px tolerance), left-to-right
  out.sort((a, b) => (Math.abs(a.y - b.y) > 10 ? a.y - b.y : a.x - b.x))
  if (out.length > MAX) {
    truncated = true
    out.length = MAX
  }
  out.forEach((e, i) => { e.n = i + 1 })
  return { dpr: window.devicePixelRatio || 1, marks: out, truncated }
}

// A vision image a tool just wrote to storage. Passed to logMessage so the
// chat can SHOW the crop next to its file name — the model gets it in the
// tool result either way, the user used to get only the name.
export interface LoggedImage {
  dataUrl: string
  width: number
  height: number
}

export interface MacroAgentToolsParams {
  logMessage: (
    message: string,
    userOrAi?: ComputerUseMessageType,
    isActionOrResult?: 'action' | 'result',
    image?: LoggedImage
  ) => void
  shouldStop: () => boolean
  captureScreenShotFunction: (opts?: { desktop?: boolean }) => Promise<ArrayBuffer>
  // Firefox MV3 host-permission ask, provided by the PANEL (the shared
  // ensureAllUrlsPermission dialog). A hook instead of an import on purpose:
  // pulling antd into this service module — even via a dynamic import() —
  // created an async-chunk split point that duplicated antd into the bundle,
  // +230 KB on the store zip (measured 10.0.155 -> 10.0.165). Resolves true
  // when the user granted, false when declined. Optional: without it the
  // pre-flight falls back to a plain instructive error.
  askFirefoxHostPermission?: () => Promise<boolean>
  // WHO drives these tools decides where the panel lands around a run.
  // 'chat' (default): show the Macro tab while playing, return to AI Chat
  // afterwards — the chat transcript is where that user is reading.
  // 'mcp' (Claude Code over the bridge): the user follows the run in
  // Data > Logs (the bridge switches there on connect), so a run must NOT
  // drag the panel to the Macro tab and then dump the user in AI Chat
  // (user complaint 2026-09-02: "AI chat opened again, can't read the
  // logs"). The Macro tab keeps the aiRunningMacro icon so it still says
  // who is running; the panel returns to Data > Logs when the run ends.
  runOrigin?: 'chat' | 'mcp'
}

// Appended to every run that did NOT throw.
//
// "No error" is not "worked". A macro that clicks the wrong toolbar icon, opens
// the wrong extension, or reads the wrong value runs perfectly cleanly — the
// only thing that knows better is the log, and the model has just been handed
// it. Left unsaid, the agent treats a clean exit as done and hands the user a
// broken macro with the defect described in prose ("the detected extension was
// AdBlock, not the Authenticator") as though observing it were the same as
// fixing it. It is not: the user asked for a WORKING macro.
//
// This sits in the run result rather than the system prompt because it has to
// arrive at the moment the decision is made — right after the run, before the
// agent writes its summary.
const OUTCOME_CHECK =
  '\n\n--- did it actually do what was ASKED? ---\n' +
  'No error only means nothing threw. Compare the log above against the user\'s request, item by item. ' +
  'If the macro acted on the WRONG THING (opened the wrong extension or window, clicked the wrong item of several similar ones, read a value that is not the one asked for, logged a placeholder), that run FAILED — fix it and run again. ' +
  'Do NOT report such a run as a success with a caveat, and do NOT hand the problem back to the user as a limitation; noticing the defect is the start of the work, not the end of it. ' +
  'When the target was one of several look-alikes, the fix is mechanical rather than a re-guess: step to the neighbouring candidate and re-run, and keep going until the verification in the macro passes. ' +
  'And make the macro CHECK ITSELF: assert the thing it acted on is the right one (uiv.ocr.read / uiv.ai.ask on the result, then throw when it does not match), so a wrong outcome comes back as a failed run instead of a clean one. ' +
  'Only when the log shows the user\'s actual goal achieved is the macro done.'

// Classify a run failure so the transcript logs can separate the macro's OWN
// validation firing (a `throw` the model wrote — the macro RAN, the world was
// not as expected) from the code/platform actually breaking. Both currently
// read as "JS script FAILED: <text>" and are indistinguishable in the proxy
// logs, where they are ~43% + ~43% of all failures (retention.md §12.3/§12.6):
// splitting them is the one signal that says whether the guard bucket is
// health or breakage. Emitted as a trailing "[fail-class: X]" marker — the
// human message above it is left byte-identical so nothing model-facing shifts
// and existing log greps still match. Order matters: the most specific
// signatures win, and `guard` is the residue (an uncaught throw from user code
// carrying an arbitrary human message).
export type RunFailClass =
  | 'stopped'
  | 'syntax'
  | 'prepare'
  | 'runtime-js'
  | 'dom-not-found'
  | 'api-misuse'
  | 'environment'
  | 'guard'
const FAIL_CLASS_RULES: Array<[RunFailClass, RegExp]> = [
  ['stopped', /^Script stopped$|\bStop(ped)?\b.*user pressed Stop|chat turn was stopped/i],
  // pre-run compile failures (Babel/acorn) and the async/await rejection
  ['syntax', /^Syntax error:|does not compile|Unexpected token|Identifier '[^']*' has already been declared|async\/await is not supported/i],
  ['prepare', /Cannot prepare the macro|Run cancelled — unsaved|did not allow mutations/i],
  // the sandbox rejecting ordinary ES the model assumed exists, or a genuine
  // code bug — ReferenceError / TypeError shapes surface as bare messages
  ['runtime-js', /\bis not defined\b|\bis not a function\b|Cannot read propert|Cannot access|is not iterable|Invalid attempt to destructure|Assignment to constant|Maximum call stack|of undefined|of null\b/i],
  // Firefox host permission not granted — arrives EMBEDDED in a finder message
  // ("elementSearch: ... last error: Missing host permission"), so it must
  // outrank dom-not-found or it lands in the wrong bucket (seen live 2026-08-19)
  ['environment', /Missing host permission|has not been granted|XModule|native messaging|layout observation/i],
  // the single biggest REAL failure bucket: a locator/finder that matched nothing
  ['dom-not-found', /nothing found|findElements\(|elementSearch|timeout reached when looking for element|not found after|\bintrouvable\b|no element at point|the match is STALE/i],
  // the model using a uiv.* API wrong, or hitting a documented API limit
  ['api-misuse', /uiv\.evaluate.*accepts one|Function statements require a function name|not a text field|not a native <select>|LOCATOR STRING|got a match object|position:fixed|a region needs numeric|falls outside the last screenshot|uiv\.[a-z.]+ is not a function|csvRead|Invalid Record Length|a JS script is already running|a macro is already running/i],
  // the run could not happen for an environment/platform reason the user must fix
  ['environment', /E901|no browser tab|No ipc available|Error #170|Error #102|Lost contact|Another debugger|Detached while handling|Receiving end does not exist|unsafe-eval|Content Security Policy|runs in FIREFOX|E331|E900|E230|E709|E703|#301|File not found|does not exist|Page load .* time out/i]
]
export const classifyRunFailure = (text: string): RunFailClass => {
  const s = String(text || '')
  for (const [cls, re] of FAIL_CLASS_RULES) if (re.test(s)) return cls
  return 'guard'
}

// Browser-internal errors that reach the model as Chrome's raw text and say
// nothing about what to DO: "Detached while handling command." (23 chats in
// the 09-09 proxy drop, classed guard), "Another debugger is already attached
// to the tab with id: N" (21), "Could not establish connection. Receiving end
// does not exist" (8) — OPEN-ISSUES 44.3. The raw text stays (log greps), one
// sentence of cause + remedy is appended.
const ENVIRONMENT_HINTS: Array<[RegExp, string]> = [
  [/Detached while handling command/i,
    'the browser debugger session (uiv.browser.*) was detached in the middle of the command — the page navigated or reloaded, a dialog opened, or DevTools took the tab. The command was retried once automatically; if it keeps happening, wait for the new page first (uiv.$ on something that exists only after the navigation) and then act, or use uiv.page.click for that step'],
  [/Another debugger is already attached/i,
    'another debugger holds this tab — DevTools is open on it, or another automation/debugging extension is attached (Ui.Vision already released its own stale session, if it had one). Tell the user: Chrome\'s "<name> started debugging this browser" bar at the top of the tab names the holder and its Cancel button releases the tab; otherwise close DevTools for that tab or disable the other extension; the surest way out is to close the tab and open the page in a new tab, then run again. uiv.page.* (synthetic DOM events) works without the debugger, but a file upload needs it'],
  [/Receiving end does not exist|Could not establish connection/i,
    'the tab has no working content script — typical right after an extension update/reload, on a tab opened before the extension was installed, or on a page extensions cannot script. Reload that tab (uiv.goto(uiv.tabs.current().url) or a manual F5) and run again'],
]
export const withEnvironmentHint = (text: string): string => {
  const s = String(text || '')
  for (const [re, hint] of ENVIRONMENT_HINTS) if (re.test(s)) return `${s}\n→ ${hint}`
  return s
}

// 5x7 bitmap font (one 5-bit number per row, MSB = leftmost pixel) for the
// OCR-overlay captions. jimp's font plugin is not in the bundle, and these
// ~60 glyphs beat shipping font assets for one annotation feature. Rendered
// and visually verified before being committed — a glyph table that only
// LOOKS right in source is worse than none. Lowercase maps to uppercase;
// anything unknown renders as '?'.
const TINY_FONT: { [ch: string]: number[] } = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b11110, 0b10001, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  '3': [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  '6': [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  '.': [0, 0, 0, 0, 0, 0b01100, 0b01100],
  ',': [0, 0, 0, 0, 0, 0b00110, 0b01100],
  '-': [0, 0, 0, 0b01110, 0, 0, 0],
  '_': [0, 0, 0, 0, 0, 0, 0b11111],
  ':': [0, 0b01100, 0b01100, 0, 0b01100, 0b01100, 0],
  '/': [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
  '(': [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ')': [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  "'": [0b00100, 0b00100, 0, 0, 0, 0, 0],
  '"': [0b01010, 0b01010, 0, 0, 0, 0, 0],
  '?': [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0, 0b00100],
  '!': [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0, 0b00100],
  '%': [0b11001, 0b11010, 0b00010, 0b00100, 0b01000, 0b01011, 0b10011],
  '+': [0, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0],
  '&': [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  '$': [0b00100, 0b01111, 0b10100, 0b01110, 0b00101, 0b11110, 0b00100],
  '#': [0b01010, 0b01010, 0b11111, 0b01010, 0b11111, 0b01010, 0b01010],
  '@': [0b01110, 0b10001, 0b10111, 0b10101, 0b10110, 0b10000, 0b01110],
  '=': [0, 0, 0b11111, 0, 0b11111, 0, 0],
  '*': [0, 0b10101, 0b01110, 0b11111, 0b01110, 0b10101, 0],
  ' ': [0, 0, 0, 0, 0, 0, 0]
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
  // ALL macro ids the AI ever authored, persisted in extension storage: the
  // in-memory id above dies with every panel/extension reload, and during
  // iterative development (edit → reload extension → edit again) each
  // set_macro then copy-on-wrote to DemoX_1, DemoX_1_1, … while the runs
  // kept executing the stale original (observed live). AI-authored files
  // stay in-place-editable across reloads; user macros are still never
  // touched.
  private aiAuthoredMacroIds: Set<string> | null = null
  private static AI_AUTHORED_KEY = 'ai_authored_macro_ids'

  private loadAiAuthoredIds = async (): Promise<Set<string>> => {
    if (this.aiAuthoredMacroIds) return this.aiAuthoredMacroIds
    let ids: string[] = []
    try {
      const got = await Ext.storage.local.get(MacroAgentTools.AI_AUTHORED_KEY)
      ids = (got && got[MacroAgentTools.AI_AUTHORED_KEY]) || []
    } catch (e) { /* fresh install / storage unavailable — start empty */ }
    this.aiAuthoredMacroIds = new Set(Array.isArray(ids) ? ids : [])
    return this.aiAuthoredMacroIds
  }

  private rememberAiAuthored = async (id: string | null): Promise<void> => {
    if (!id) return
    const set = await this.loadAiAuthoredIds()
    set.add(id)
    // cap the stored list — oldest first out; 500 covers any real workload
    const list = Array.from(set).slice(-500)
    this.aiAuthoredMacroIds = new Set(list)
    try {
      await Ext.storage.local.set({ [MacroAgentTools.AI_AUTHORED_KEY]: list })
    } catch (e) { /* best-effort; worst case is one extra copy after reload */ }
  }
  // The screenshot frame the model's coordinates currently refer to.
  //
  // `raw` is ALWAYS the full capture at device resolution, and every crop is
  // cut from it — so a saved vision image is native pixels even when the model
  // was looking at a magnified region, which matters because findImage matches
  // the real screen at runtime and would never match interpolated pixels.
  // `origin` is the top-left of the frame the model saw inside `raw`, and
  // `scaleFactor` maps that frame's pixels to raw pixels: < 1 when the full
  // capture was downscaled into the model's image budget, > 1 when a region
  // was magnified. raw = origin + model / scaleFactor, for both cases.
  // when the last run_macro finished — a zoom whose base predates it is
  // magnifying a screen state that may no longer exist
  private lastRunAt = 0
  private lastRunTool = ''
  // how many run_macro calls of this instance ended OK — decides whether the
  // full OUTCOME_CHECK rides on the result (see outcomeCheckFor)
  private okRuns = 0

  // The full "did it actually do what was ASKED?" text is ~1.1k characters,
  // and it used to ride on EVERY successful run — a one-line cleanup script
  // paid for it as much as a real run (OPEN-ISSUES 33.2, Windows benchmark
  // 2026-09-05). It now comes with the runs where the wrong-target risk is
  // real: the first OK run this instance sees, a run after a 30-minute gap
  // (a new session on a long-lived bridge; relayed windows share one
  // instance), and any run that used a visual finder, the AI, or OS input —
  // the tiers that can act on a look-alike without an error. A plain
  // DOM-tier run gets one line that points back at the log. Failed runs
  // never carried the note (they carry the finder frames instead) and still
  // do not.
  private outcomeCheckFor = (logText: string, hadClickShot: boolean): string => {
    const gapMs = Date.now() - this.lastRunAt
    const first = this.okRuns === 0
    this.okRuns += 1
    const visual = hadClickShot || /Executing: uiv\.(findImage|findImages|findColor|ocr\.|ai\.|desktop\.)/.test(logText) || /\b(XClick|XType|XMove|OCR\w*|visionFind|visualAssert|visualVerify)\b/i.test(logText)
    if (first || gapMs > 30 * 60 * 1000 || visual) return OUTCOME_CHECK
    return '\n\n(No error only means nothing threw — check the log above against what was asked, item by item, before calling this done.)'
  }

  private lastShot: {
    raw: ArrayBuffer
    scaleFactor: number
    width: number
    height: number
    originX: number
    originY: number
    // scaleFactor of the FULL overview of this capture. Kept so a zoomed frame
    // can be unwound without a re-capture when the model sends coordinates
    // that belong to the full view.
    baseScale: number
    // which capture this frame is of — a region is only meaningful against the
    // same scope, and mixing them is how coordinates land out of bounds
    desktop: boolean
    // browser scope: the captured tab's devicePixelRatio (page zoom included),
    // the factor between capture pixels and the tab's CSS pixels
    tabDpr?: number | null
    takenAt?: number
  } | null = null
  // crops already saved via save_element_image, by name, with WHERE each was
  // cut (raw capture px + scope) — a second save with the same name is a
  // deliberate overwrite, and comparing the two rects is what separates a real
  // correction from a re-save of the same wrong spot
  private savedCrops = new Map<string, { x: number; y: number; w: number; h: number; desktop: boolean }>()
  // set by verifyCropUniqueness when the crop's best match is its OWN origin.
  // Measured proof beats a size rule of thumb: a 45x26 toolbar crop that
  // resolves correctly is a finished crop, and nagging about its size is how a
  // working image gets "refined" into a broken one.
  private lastCropVerified = false

  // see MacroAgentToolsParams.runOrigin
  private showRunTab = () => {
    if (this.params.runOrigin === 'mcp') {
      store.dispatch(act.updateUI({ aiRunningMacro: true }))
    } else {
      store.dispatch(act.updateUI({ sidebarTab: 'Macro', aiRunningMacro: true }))
    }
  }

  // the bridge session's play tab (OPEN-ISSUES 21.1): sticky across tool
  // calls — browser_snapshot, screenshot, marks and run_macro all look at the SAME
  // tab, and none of them follows the user's focus into another window
  private bridgeTab = async (): Promise<any | null> => {
    const { tab, note } = await pickBridgeTab()
    if (note) store.dispatch(act.addLog('warning', note))
    return tab
  }

  // The tab's OWN devicePixelRatio, measured in the tab: page zoom is part of
  // it (110% on a 125% display = 1.375), and the panel's ratio knows nothing
  // of the tab's zoom. click_at converted capture pixels with the panel's
  // ratio and, on a zoomed tab, landed 8% off — right off a 48 px button onto
  // the dialog backdrop (OPEN-ISSUES 70). Null when the tab cannot be asked
  // (browser-internal page): the panel's ratio stays the fallback.
  private tabDevicePixelRatio = async (): Promise<number | null> => {
    try {
      let tab: any = await this.bridgeTab()
      if (!isWebTab(tab)) tab = await getPlayTab().catch(() => null)
      if (!tab || typeof tab.id !== 'number' || !/^(https?:|file:)/.test(tab.url || '')) return null
      const r: any = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.devicePixelRatio })
      const v = r && r[0] ? r[0].result : null
      return typeof v === 'number' && v > 0 ? v : null
    } catch (e) {
      return null
    }
  }

  private restoreTabAfterRun = () => {
    if (this.params.runOrigin === 'mcp') {
      store.dispatch(act.updateUI({ sidebarTab: 'Logs', dataTab: 'Logs', aiRunningMacro: false }))
    } else {
      store.dispatch(act.updateUI({ sidebarTab: 'AiChat', aiRunningMacro: false }))
    }
  }

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
          return await this.setMacro(args || {}, !!(args && args.allow_visual_to_dom))
        case 'create_macro':
          return await this.createMacro(args || {})
        case 'run_macro':
          // "script"/"code" come from the MCP bridge only (its schema offers
          // them; the in-panel agent's does not — it keeps the create_macro →
          // run_macro flow so tested work ends up saved)
          return await this.runMacro(
            !!(args && args.confirm_demo_run),
            args && (args.script || args.code),
            args && args.log_limit,
            args && args.look
          )
        case 'browser_snapshot':
        case 'get_page': // pre-10.0.216 name, still sent by older bridges and prompts
          return await this.getPage(args && args.url, args && args.mode, args && args.max_chars, args && args.find)
        case 'click_at':
          return await this.clickAt(args || {}, '')
        case 'type_at':
          return await this.clickAt(args || {}, String((args && args.text) || ''))
        case 'screenshot':
          return await this.screenshot(!!(args && args.scope === 'desktop'), this.regionArg(args), !!(args && args.scope), args && args.marks)
        case 'save_element_image':
          return await this.saveElementImage(args)
        case 'save_relative_image':
          return await this.saveRelativeImage(args)
        default:
          return { text: `Unknown tool: ${name}`, isError: true }
      }
    } catch (e: any) {
      // a rejection without an Error object (a storage layer answering with
      // a bare string, or with nothing) used to print "failed: undefined" —
      // three Firefox users looped create_macro on it (OPEN-ISSUES 44.2)
      const reason = (e && e.message) || (e ? String(e) : '') || 'no reason reported — the storage layer rejected without an error message (browser file storage; try again, or check the Settings > Storage mode)'
      return { text: `Tool ${name} failed: ${reason}`, isError: true }
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
    return 'Error: the script is minified — everything on one line (or a few very long lines). Resubmit the SAME program formatted as readable multi-line JavaScript: one statement per line, normal indentation, real newlines. Do not change the logic. Pass it in the "script" parameter as plain text, not escaped into macro_json.'
  }

  // async/await is banned in scripts (every uiv.* call already waits; the
  // interpreter rejects the syntax) — the prompt says so, and a weaker model
  // wrote it anyway and burned two run round-trips on the syntax error.
  // Catching it at SUBMIT time turns those two runs into one corrective
  // resubmit, the same pattern as the checks around this one.
  private checkAsyncScript = (script: string): string | null => {
    if (!/\basync\s+function\b|\basync\s*\(|\bawait\s+/.test(script)) return null
    return 'Error: the script uses async/await, which does NOT exist in Ui.Vision JS macros — every uiv.* call already waits for its command to finish, so async buys nothing and the interpreter rejects the syntax. Resubmit the SAME logic with all async/await keywords removed (plain sequential calls).'
  }

  // The sandbox has no Set/Map/URL/Promise, and the model reaches for them
  // constantly ("Set is not defined" was the loudest runtime-js failure in the
  // Aug 16-19 field logs — retention.md §12). They cannot be safely polyfilled:
  // the transpiler compiles spread/for-of with iterableIsArray, so
  // [...new Set(a)] over an object-based Set polyfill would SILENTLY return
  // wrong data instead of erroring. So the fix is the checkAsyncScript pattern:
  // catch at save time, name the working replacement, let the model resubmit —
  // two failed runs become one corrective resubmit the user never sees.
  private checkSandboxUnsupported = (script: string): string | null => {
    // Set/Map/URL/URLSearchParams used to be rejected here too — the sandbox
    // polyfills them now (script_runner.js, ES6+ BUILT-INS section: Set/Map
    // are array-backed so [...set] spreads correctly). Only Promise is left:
    // it needs real engine support, and the uiv API is synchronous anyway.
    if (/\bnew\s+Promise\s*\(|\bPromise\s*\./.test(script)) {
      return 'Error: the script uses Promise, which does NOT exist in the Ui.Vision JS sandbox and would fail at run time with "Promise is not defined". The uiv.* API is synchronous — every call already waits — so resubmit the SAME logic as plain sequential code.'
    }
    return null
  }

  // uiv.browser.* rides on the debugger API, which Firefox does not give
  // extensions — such a script dies at its first click with E331. The system
  // prompt says so, but it says so on one line of a 25k-token prompt and
  // production logs show the model writing uiv.browser.click on Firefox
  // anyway. Catching it HERE means the user never runs the broken macro:
  // the model gets a corrective error and resubmits, same self-correct
  // pattern as checkDeprecatedCommands / checkMinifiedScript.
  private checkFirefoxUnsupported = (script: string): string | null => {
    if (!isFirefox()) return null
    // Catch the WHOLE uiv.browser.* tier, not just click/type/move: the tier
    // rides entirely on the debugger API Firefox withholds, so any method is a
    // guaranteed E331 at run time. Field logs (retention.md §12.5) show the
    // save-time guard rejecting the script and the model regenerating the SAME
    // tier — often because a call it also used slipped past the old three-name
    // list. Matching every method name closes that loop.
    const methods = Array.from(
      new Set((script.match(/\buiv\.browser\.([a-zA-Z]+)\s*\(/g) || [])
        .map((m) => (m.match(/\buiv\.browser\.([a-zA-Z]+)/) || [])[1])
        .filter(Boolean))
    )
    if (!methods.length) return null
    const list = methods.map((fn) => `uiv.browser.${fn}()`).join(', ')
    // the dominant Firefox failure is a coordinate/match click coming out of a
    // finder — name the exact replacement for that so the model does not just
    // re-emit uiv.browser.* with a different method
    const usesCoords = /\buiv\.browser\.(click|type|move)\s*\(\s*(\{|\d|match|el\b)/.test(script)
    const coordHint = usesCoords
      ? ' Your call passes a coordinate or a finder match: on Firefox, click by LOCATOR instead — uiv.page.click(\'css=...\') / uiv.page.fill(\'css=...\', text) dispatch straight on the element with no coordinates. Only reach for uiv.desktop.mouse.click(match) (real OS input through the Desktop Automation host) when the page genuinely requires OS-level input.'
      : ''
    return `Error: this macro runs in FIREFOX, and the script calls ${list}. The ENTIRE uiv.browser.* tier needs the browser debugger API, which Firefox does not provide to extensions — every one of those calls would fail at run time with E331, so switching one method for another in the same tier will not help. Resubmit the same program using uiv.page.* (uiv.page.click/type — DOM-level input, works everywhere) or, when the page needs real OS-level input (canvas apps, drag & drop, strict event checks), uiv.desktop.mouse.click(match) / uiv.desktop.keyboard.type(text) (real OS input through the Desktop Automation host; a browser finder match is accepted directly; note the mouse./keyboard. level — there is no uiv.desktop.click).${coordHint}`
  }

  // A script with a syntax error used to reach the user and die at RUN time
  // ("Syntax error: Unexpected token…" in the run log — Aug 11 field data).
  // The runner compiles the script through Babel anyway when it executes, so
  // running that same compile at SUBMIT time costs nothing new (the babel
  // chunk is lazy and cached per panel session) and turns a broken run the
  // user watches into a corrective resubmit the user never sees.
  private checkScriptParses = async (script: string): Promise<string | null> => {
    // command-table JSON handed over as a "script" (OPEN-ISSUES 35.4) —
    // the compile error alone ("Missing semicolon (2:8)") never said so
    const table = describeCommandTableScript(script)
    if (table) return `Error: ${table}. Resubmit the SAME steps as a JS script (uiv.* calls).`
    try {
      await transpileScript(script)
      return null
    } catch (e: any) {
      const line = e && typeof e.scriptLine === 'number' ? ` (script line ${e.scriptLine})` : ''
      return `Error: the script does not compile — ${(e && e.message) || e}${line}. Resubmit the SAME logic as valid JavaScript.`
    }
  }

  // uiv.findImage('x.png') can only match an image that exists in the Visuals
  // store, but production logs show the model writing such calls without ever
  // capturing the image — the macro then dies at run time with Error #121.
  // The store is known at save time, so the mismatch is caught HERE and the
  // model self-corrects (capture first, or find the target another way) —
  // same pattern as the checks above.
  //
  // Only string-literal file names are checked, and a name that also appears
  // OUTSIDE the finder calls is skipped: the script may legitimately create
  // it itself first (uiv.shot.area(match, 'x.png') … uiv.findImage('x.png')).
  private checkMissingImages = async (script: string): Promise<string | null> => {
    const finderRe = /\buiv\.findImages?\s*\(\s*(['"])([^'"\r\n]+?\.png)\1/gi
    const refs = new Set<string>()
    let m: RegExpExecArray | null
    while ((m = finderRe.exec(script))) refs.add(m[2])
    if (!refs.size) return null

    const outsideFinders = script.replace(finderRe, '')
    const candidates = Array.from(refs).filter((name) => !outsideFinders.includes(name))
    if (!candidates.length) return null

    const visionStorage = getStorageManager().getVisionStorage()
    const missing: string[] = []
    for (const name of candidates) {
      // the runtime lookup also accepts a _mac platform variant (search_vision)
      const macVariant = name.replace(/\.png$/i, '_mac.png')
      const exists = (await visionStorage.exists(name)) || (await visionStorage.exists(macVariant))
      if (!exists) missing.push(name)
    }
    if (!missing.length) return null

    const list = missing.map((n) => `'${n}'`).join(', ')
    return `Error: the script searches for ${list}, but no image with that name exists in the Visuals store — uiv.findImage can only match a picture that was captured first, so this macro would fail at run time with Error #121. Either capture the image now (the save_element_image tool, or uiv.shot.area(match, 'name.png') in the script BEFORE the findImage call), or find the target another way (DOM locator via uiv.$, or uiv.ocr.findText). Then resubmit.`
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

  private setMacro = async (args: any, allowVisualToDom: boolean): Promise<MacroAgentToolResult> => {
    const editing = this.getEditing()

    let obj: any
    // the program as a plain argument — no hand-written JSON escaping.
    // JS ONLY (OPEN-ISSUES 22): the agent tools neither write nor run
    // command-table macros; a table the user wants changed is converted.
    if (typeof args.script === 'string' && args.script.length) {
      obj = { name: this.getMacroName(), data: { commands: [], script: args.script } }
    } else if (typeof args.macro_json === 'string' && args.macro_json.length) {
      // the MCP bridge's schema hands the program over as macro_json with a
      // "Script" field — that IS the JS form; only a Commands table is refused
      try {
        obj = parseMacroJsonLenient(args.macro_json, this.getMacroName())
      } catch (e: any) {
        return { text: `Error: invalid macro JSON — ${e.message}`, isError: true }
      }
      if (typeof obj.data.script !== 'string' || !obj.data.script.length) return { text: JS_ONLY_MESSAGE('set_macro'), isError: true }
    } else {
      return {
        text: 'Error: set_macro requires "script" (the JS program, plain text).',
        isError: true
      }
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

    const asyncError = isScript ? this.checkAsyncScript(obj.data.script) : null
    if (asyncError) {
      return { text: asyncError, isError: true }
    }

    const sandboxError = isScript ? this.checkSandboxUnsupported(obj.data.script) : null
    if (sandboxError) {
      return { text: sandboxError, isError: true }
    }

    const firefoxError = isScript ? this.checkFirefoxUnsupported(obj.data.script) : null
    if (firefoxError) {
      return { text: firefoxError, isError: true }
    }

    const parseError = isScript ? await this.checkScriptParses(obj.data.script) : null
    if (parseError) {
      return { text: parseError, isError: true }
    }

    const missingImageError = isScript ? await this.checkMissingImages(obj.data.script) : null
    if (missingImageError) {
      return { text: missingImageError, isError: true }
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

    // editing a macro the AI authored (this session or any earlier one —
    // the persisted id set survives reloads) or an unsaved Untitled one:
    // update it in place
    const aiAuthored = srcId ? (await this.loadAiAuthoredIds()).has(srcId) : false
    if (!srcId || srcId === this.agentOwnedMacroId || aiAuthored) {
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
    //
    // The copy's name: the model's `name` argument when given, else derived
    // from the original. Deriving was the ONLY path for a long time, and it
    // produced lies: an agent asked for a different task while an old macro
    // sat in the editor "fixed" it into desktop_click_browser_toolbar_text_
    // ocr_1.js that actually opened the Chrome shortcuts page — the script
    // form pinned the old name, so even a conscientious model could not
    // rename the result to what it now does.
    const base = this.getMacroName()
    const keepJsExt = isScript || /\.js$/i.test(base)
    const askedRaw = typeof args.name === 'string' ? args.name : ''
    // dots stay: "<name>.d" marks a desktop-app macro (see macroRunTarget);
    // only a trailing dot goes (Windows file names)
    const askedStem = askedRaw
      .replace(/\.js$/i, '')
      .replace(/[^a-zA-Z0-9 ._-]/g, '_')
      .replace(/\.+$/, '')
      .trim()
      .slice(0, 60)
    const withExt = (b: string) => (keepJsExt ? `${b}.js` : b)

    let name: string
    if (askedStem) {
      name = withExt(askedStem)
      for (let i = 1; findSameNameMacro(name, store.getState().editor.testCases); i++) {
        name = withExt(`${askedStem}_${i}`)
      }
    } else {
      const stem = base.replace(/\.js$/i, '')
      name = withExt(`${stem}_1`)
      for (let i = 2; findSameNameMacro(name, store.getState().editor.testCases); i++) {
        name = withExt(`${stem}_${i}`)
      }
    }

    store.dispatch(act.setEditing({ ...obj.data, meta: editing.meta }))
    await store.dispatch(act.saveEditingAsNew(name, '/AI Generated'))

    const newSrc = store.getState().editor.editing.meta.src
    this.agentOwnedMacroId = (newSrc && newSrc.id) || null
    await this.rememberAiAuthored(this.agentOwnedMacroId)

    this.params.logMessage(`Saved fixed version as "AI Generated/${name}" (original untouched)`, 'user', 'result')

    return {
      text: `OK — your changes were saved as a NEW macro "${name}" (${desc}) in the "AI Generated" folder; the user's original macro "${base}" was NOT modified. "${name}" is now open in the editor and further set_macro calls will update it. YOUR NEXT ACTION IS run_macro — this macro has NOT been tested yet, and an untested macro is a guess. Do NOT reply to the user first, and do NOT ask permission to run it. Tell the user the new macro name.`
    }
  }

  private createMacro = async (args: any): Promise<MacroAgentToolResult> => {
    const state = store.getState()
    if (state.player.status !== Player.C.STATUS.STOPPED) {
      return { text: 'Error: a macro is currently running.', isError: true }
    }

    let obj: any
    // the program as a plain argument — no hand-written JSON escaping.
    // '__imported__' is the placeholder the naming code below reads as
    // "model gave no name", same as fromJSONString produces.
    if (typeof args.script === 'string' && args.script.length) {
      obj = { name: args.name ? String(args.name) : '__imported__', data: { commands: [], script: args.script } }
    } else if (typeof args.macro_json === 'string' && args.macro_json.length) {
      // the MCP bridge's schema hands the program over as macro_json with a
      // "Script" field — that IS the JS form; only a Commands table is refused
      try {
        obj = parseMacroJsonLenient(args.macro_json, undefined)
      } catch (e: any) {
        return { text: `Error: invalid macro JSON — ${e.message}`, isError: true }
      }
      if (typeof obj.data.script !== 'string' || !obj.data.script.length) return { text: JS_ONLY_MESSAGE('create_macro'), isError: true }
    } else {
      return {
        text: 'Error: create_macro requires "name" + "script" (the JS program, plain text).',
        isError: true
      }
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

    const asyncError =
      typeof obj.data.script === 'string' ? this.checkAsyncScript(obj.data.script) : null
    if (asyncError) {
      return { text: asyncError, isError: true }
    }

    const sandboxError =
      typeof obj.data.script === 'string' ? this.checkSandboxUnsupported(obj.data.script) : null
    if (sandboxError) {
      return { text: sandboxError, isError: true }
    }

    const firefoxError =
      typeof obj.data.script === 'string' ? this.checkFirefoxUnsupported(obj.data.script) : null
    if (firefoxError) {
      return { text: firefoxError, isError: true }
    }

    const parseError =
      typeof obj.data.script === 'string' ? await this.checkScriptParses(obj.data.script) : null
    if (parseError) {
      return { text: parseError, isError: true }
    }

    const missingImageError =
      typeof obj.data.script === 'string' ? await this.checkMissingImages(obj.data.script) : null
    if (missingImageError) {
      return { text: missingImageError, isError: true }
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
        .replace(/[^a-zA-Z0-9 ._-]/g, '_')
        .replace(/\.+$/, '')
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
    await this.rememberAiAuthored(this.agentOwnedMacroId)

    const desc = isScript ? 'JS script' : `${obj.data.commands.length} commands`
    this.params.logMessage(`Created macro "AI Generated/${name}" (${desc})`, 'user', 'result')

    return {
      text: `OK — created and saved a NEW macro named "${name}" (${desc}) in the "AI Generated" folder. It is now open in the editor; the previously open macro was not modified. YOUR NEXT ACTION IS run_macro — this macro has NOT been tested yet, and an untested macro is a guess. Do NOT reply to the user first, and do NOT ask permission to run it. Refine it with set_macro if it fails, and tell the user the macro name when you are done.`
    }
  }

  // Log tail with an HONEST cut: the head is dropped (the tail holds the
  // verdict-relevant lines), but the reader must KNOW lines are missing —
  // an unmarked cut reads as the complete log, and a wrong conclusion drawn
  // from a silently-shortened log cost a real debugging session.
  private capLogTail = (text: string, maxChars: number): string => {
    if (text.length <= maxChars) return text
    const cut = text.slice(-maxChars)
    const nl = cut.indexOf('\n')
    const tail = nl >= 0 ? cut.slice(nl + 1) : cut
    const omittedLines = Math.max(1, text.slice(0, text.length - tail.length).split('\n').length - 1)
    return `[… ${omittedLines} earlier log lines omitted (${text.length - tail.length} chars) — pass log_limit to run_macro for more …]\n${tail}`
  }

  private runMacro = async (confirmDemoRun: boolean, inlineScript?: any, logLimit?: number, look?: string): Promise<MacroAgentToolResult> => {
    // inline JS handed straight to run_macro (MCP bridge): run it directly —
    // the editor and stored macros are not touched, so it cannot race what
    // the user has open in the panel
    if (typeof inlineScript === 'string' && inlineScript.length) {
      const inlineParseError = await this.checkScriptParses(inlineScript)
      if (inlineParseError) return { text: inlineParseError, isError: true }
      if (macroRunTarget('', inlineScript) === 'desktop-app') {
        return this.runInDesktopApp('inline script', inlineScript, logLimit)
      }
      return this.runScriptMacro(inlineScript, 'inline script', logLimit, look)
    }

    const state = store.getState()
    const { commands } = state.editor.editing

    // JS script macro: run it through the script runner instead of the player
    const script = (state.editor.editing as any).script
    if (typeof script === 'string' && script.length) {
      // "use desktop-app" on top, or a "<name>.d.js" macro: the same routing
      // as the tree's Play button and the MCP bridge — the helper app runs it
      // (desktop tier, high speed)
      if (macroRunTarget(this.getMacroName(), script) === 'desktop-app') {
        return this.runInDesktopApp(this.getMacroName(), script, logLimit)
      }
      return this.runScriptMacro(script, undefined, logLimit, look)
    }

    if (!commands || !commands.length) {
      return { text: 'Error: the editor contains no script to run. Use create_macro first.', isError: true }
    }

    // JS ONLY (OPEN-ISSUES 22): the editor holds a classic command-table
    // macro — the agent tools do not run those (two code paths, one of them
    // without the script runner's tab handling, diagnostics and self-checks)
    return { text: JS_ONLY_MESSAGE('run_macro', this.getMacroName(), commands.length), isError: true }

    // (the classic table-player run that used to follow lived here until 10.0.192)
  }

  // run_macro for a desktop-app macro ("use desktop-app" directive or a .d.js
  // name): send it to Ui.Vision for Desktop and return its log the way the
  // browser run does (no screenshot, no page delta: the app has no page; ask
  // the app's own MCP connection for one). Shared by the in-panel chat and
  // the MCP bridge (both call execute).
  private runInDesktopApp = async (name: string, script: string, logLimit?: number): Promise<MacroAgentToolResult> => {
    const lines: string[] = []
    const push = (kind: string, text: string) => {
      lines.push('[' + kind + '] ' + text)
      store.dispatch(act.addLog(kind === 'echo' ? 'echo' : kind === 'error' ? 'error' : 'status', '[app] ' + text) as any)
    }
    const cfg: any = (store.getState() as any).config || {}
    this.params.logMessage(`Running JS script "${name}" in Ui.Vision for Desktop`, 'user', 'result')
    const started = await ensureDesktopApp(cfg, (t) => push('status', t))
    if (!started.ok) {
      return { text: 'Error: the macro asks for the desktop app ("use desktop-app" or a .d.js name) but it could not be started: ' + started.text, isError: true }
    }
    const fileName = name.replace(/^.*\//, '').replace(/\.js$/i, '') + '.js'
    const res: any = await getDesktopAppClient().runScript(fileName, script, (l: any) => { if (l.kind !== 'info') push(l.kind, l.text) })
    const limit = Math.max(1000, Math.min(40000, Number(logLimit) || 4000))
    let log = lines.join('\n')
    if (log.length > limit) log = '...' + lines.length + ' log lines, head omitted (log_limit ' + limit + ')...\n' + log.slice(-limit)
    const head = res.ok
      ? '"' + fileName + '" completed in Ui.Vision for Desktop (the helper app)'
      : '"' + fileName + '" FAILED in Ui.Vision for Desktop: ' + res.error
    return { text: head + '\n--- app log ---\n' + log, isError: !res.ok }
  }

  private runScriptMacro = async (script: string, label?: string, logLimit?: number, look?: string): Promise<MacroAgentToolResult> => {
    const stale = await this.clearStaleRun()
    if (stale) return { text: stale, isError: true }

    const noHostPerm = await this.ensureFirefoxHostPermission()
    if (noHostPerm) return { text: noHostPerm, isError: true }

    const runLogMarker = this.logMarker()
    this.params.logMessage(`Running JS script "${label || this.getMacroName()}"`, 'user', 'result')
    this.showRunTab()

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
      // label = "inline script" for run_macro {script}; the editor macro otherwise
      result = await runScript(script, { name: label || this.getMacroName(), stickyTab: true })
    } catch (e: any) {
      result = { ok: false, error: (e && e.message) || String(e), errorLine: null }
    } finally {
      clearInterval(stopWatch)
      this.restoreTabAfterRun()
    }

    const newLogs = this.logsSinceMarker(runLogMarker)
    const logCap = Math.max(1000, Math.min(40000, Number(logLimit) || 4000))
    const logText = this.capLogTail(newLogs
      .map((l: any) => `[${l.type}] ${l.text}`)
      .join('\n'), logCap)

    const runSeconds = Math.round((Date.now() - runStart) / 1000)
    const verdict = result.ok
      ? 'finished without errors'
      : result.error === 'Script stopped'
        ? `STOPPED after ${runSeconds}s — ${stoppedByChat ? 'the chat turn was stopped, which cuts off the running macro' : 'the user pressed Stop'}. This is NOT a macro error, and there is no execution limit: a deliberately endless macro (a while(true) repeater/monitor) can only ever end this way. If the log below shows its loop completing cycles correctly, treat the macro as verified.`
        : `FAILED: ${withEnvironmentHint(result.error)}${result.errorLine ? ` (script line ${result.errorLine})` : ''}`

    // final values of the script's top-level `var`s — published by the
    // runner into ui.scriptVars; often the fastest way to see WHERE a
    // script's logic went wrong (what a finder returned, what a check saw)
    const varsText = (() => {
      try {
        const vars = (store.getState().ui as any).scriptVars
        if (!vars || !Object.keys(vars).length) return ''
        // a uiv.$/uiv.$$ match (tag + rect + x/y + the __f/__i finder marks)
        // used to print as forty lines of attributes — with Gmail's jslog
        // blobs in them — per match; one line says what the reader needs
        const isMatch = (v: any) => v && typeof v === 'object' && !Array.isArray(v) && typeof v.tag === 'string' && v.rect && typeof v.rect === 'object' && (typeof v.__f === 'number' || 'frameLocal' in v)
        const oneLine = (m: any) => {
          const r = m.rect || {}
          const t = String(m.text || '').replace(/\s+/g, ' ').trim()
          return `<match ${m.tag}${t ? ' "' + (t.length > 60 ? t.slice(0, 60) + '…' : t) + '"' : ''} at ${m.x},${m.y} rect ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}${m.frameId ? ' frame ' + m.frameId : ''}${m.visible === false ? ' hidden' : ''}>`
        }
        const dump = JSON.stringify(vars, (_k, v) => (isMatch(v) ? oneLine(v) : v), 1)
        const varsCap = Math.max(2000, Math.min(40000, Number(logLimit) || 4000))
        const shown = dump.slice(0, varsCap)
        return `\n--- final JS variable values ---\n${shown}${dump.length > varsCap ? `\n[… variable dump truncated: ${dump.length - varsCap} more chars — pass log_limit to run_macro for more …]` : ''}`
      } catch (e) {
        return ''
      }
    })()

    this.lastRunAt = Date.now()
    this.lastRunTool = 'run_macro'
    // a FAILED run shows the last finder captures (one per finder call,
    // oldest → newest) instead of one end picture with every arrow on it:
    // the cause usually sits a step or two before the failing one
    const clickShot = (!result.ok && await this.runFramesImage()) || await this.clickTrailImage()
    const domMissAttachment = result.ok ? '' : await this.attachPageStructureOnDomMiss(result.error || '')
    // classify genuine failures only — a user Stop is its own category and
    // carries no failure signal (retention.md §12.6.1). The marker rides on the
    // VERDICT line (not the tail): the proxy truncates each logged message to
    // 2000 chars, and a failed run's text runs well past that, so a tail marker
    // would be sliced out of the log it exists to feed.
    const failClass =
      result.ok || result.error === 'Script stopped'
        ? ''
        : ` [fail-class: ${classifyRunFailure(result.error || '')}]`

    // act-and-look (OPEN-ISSUES 26.1/26.4): the page state after the run
    // rides along, so an exploratory step is ONE call instead of run + look.
    // "shot" follows the run's LAST OS-input command: a script of only
    // uiv.desktop.* calls used to come back with the browser tab's picture,
    // a page it never touched (OPEN-ISSUES 32.13); a browser-scope command
    // after the desktop ones puts the tab back in charge.
    const desktopRun = (() => {
      const lastDesktop = logText.lastIndexOf('Executing: uiv.desktop.')
      if (lastDesktop < 0) return false
      const lastBrowser = Math.max(logText.lastIndexOf('Executing: uiv.browser.'), logText.lastIndexOf('Executing: uiv.page.'))
      return lastDesktop > lastBrowser
    })()
    const after = await this.lookAfterAction(look, !!clickShot, desktopRun)
    return {
      text: `JS script ${verdict}.${failClass}\n--- log ---\n${logText || '(no log output)'}${varsText}${domMissAttachment}${clickShot ? clickShot.text : ''}${after.text}${result.ok ? this.outcomeCheckFor(logText, !!clickShot) : ''}`,
      base64Image: after.base64Image || (clickShot ? clickShot.base64Image : undefined)
    }
  }

  // the tree lines of the last look (browser_snapshot or a look after an action), so
  // the next look can report what CHANGED instead of everything (26.4)
  // a tree at or under this many lines is returned whole even when the call
  // asked for a "find" slice (OPEN-ISSUES 44.6)
  private static readonly SMALL_PAGE_LINES = 250
  private lastTreeLines: string[] | null = null
  private lastTreeCut = 0
  private lastTreeUrl = ''

  // `desktop`: the after-picture follows the scope the action was aimed at — a
  // click_at read off a DESKTOP screenshot used to hand back the browser tab
  // (the ui.vision play page) as "screenshot after the run", a page the click
  // never touched (OPEN-ISSUES 32.10)
  private lookAfterAction = async (look?: string, hasRunPicture = false, desktop = false): Promise<{ text: string; base64Image?: string }> => {
    const mode = look || (this.params.runOrigin === 'mcp' ? 'delta' : 'none')
    if (mode === 'none') return { text: '' }
    let text = ''
    let base64Image: string | undefined
    try {
      if (mode === 'tree' || mode === 'delta' || mode === 'both') {
        const tab = await this.bridgeTab()
        if (tab && tab.id && /^(https?:|file:)/.test(tab.url || '')) {
          const prevLines = this.lastTreeLines
          const prevUrl = this.lastTreeUrl
          const prevCut = this.lastTreeCut
          const tree = await this.getPageTree(tab, mode === 'delta' ? 20000 : 6000)
          if (!tree.isError) {
            if (mode === 'delta') {
              const lines = this.lastTreeLines || []
              if (!prevLines || prevUrl !== this.lastTreeUrl) {
                text = `\n--- page after the run (first look at ${this.lastTreeUrl}) ---\n${tree.text.slice(0, 6000)}${tree.text.length > 6000 ? '\n(… cut; browser_snapshot for the whole tree)' : ''}`
              } else {
                // compare WITHOUT the (offscreen) marker: a click that scrolls the
                // page flips it on every node of a long table, and the delta used
                // to read "50 new, 50 gone" — the same lines twice — burying the
                // three menu links that really appeared (OPEN-ISSUES 30.1). A node
                // that only moved on/off screen is counted, not listed.
                // a cross-origin frame header carries the frame's id, which
                // changes on every load — "[cross-origin frame 375: …]" vs 391
                // for the same Stripe helper frame — and its blank separator
                // lines; neither is a change the reader wants (30.3)
                const core = (l: string) => l.replace(/ \(offscreen\)$/, '').replace(/^\[cross-origin frame \d+: /, '[cross-origin frame: ')
                const real = (l: string) => l.trim() !== ''
                const prevSet = new Set(prevLines.map(core))
                const nowSet = new Set(lines.map(core))
                const added = lines.filter(l => real(l) && !prevSet.has(core(l)))
                const removed = prevLines.filter(l => real(l) && !nowSet.has(core(l)))
                const prevRaw = new Set(prevLines)
                let moved = lines.filter(l => prevSet.has(core(l)) && !prevRaw.has(l)).length
                // a dialog/popover opening puts the page behind it aria-hidden:
                // the whole page reads as "gone" (662 lines on Amazon) and the
                // three real new lines drown — collapse that (OPEN-ISSUES 30.13);
                // the mirror case when it closes: everything is "back"
                const hiddenNote = (l: string) => /content is HIDDEN — aria-hidden/.test(l)
                let dialogNote = ''
                if (added.some(hiddenNote) && removed.length > 8) {
                  dialogNote = ` — a dialog/popover opened: the page behind it went aria-hidden (${removed.length} lines hidden, not listed)`
                  removed.length = 0
                } else if (removed.some(hiddenNote) && added.length > 8) {
                  dialogNote = ` — the dialog/popover closed: the page behind it is visible again (${added.length} lines back, not listed)`
                  added.length = 0
                }
                const scrolled = dialogNote + (moved ? ` — scrolled: ${moved} node(s) moved on/off screen` : '') +
                  (prevCut > 0 && added.length ? ` — the previous look was cut ${prevCut} node(s) short, so its tail shows as new here` : '')
                if (!added.length && !removed.length) {
                  text = `\n--- page after the run: unchanged (${lines.length} nodes${scrolled}; ${this.lastTreeUrl}) ---`
                } else {
                  const cap = (arr: string[], n: number) => arr.slice(0, n).join('\n') + (arr.length > n ? `\n(… ${arr.length - n} more)` : '')
                  text = `\n--- page after the run: what changed (${added.length} new, ${removed.length} gone${scrolled}; ${this.lastTreeUrl}) ---` +
                    (added.length ? `\n+ ${cap(added, 60).replace(/\n/g, '\n+ ')}` : '') +
                    (removed.length ? `\n- ${cap(removed, 30).replace(/\n/g, '\n- ')}` : '')
                }
              }
            } else {
              text = `\n--- page after the run ---\n${tree.text}`
            }
          }
        }
      }
      if ((mode === 'shot' || mode === 'both') && !hasRunPicture) {
        const shot = await this.screenshot(desktop)
        if (!shot.isError && shot.base64Image) {
          base64Image = shot.base64Image
          text += `\n--- ${desktop ? 'screen' : 'screenshot'} after the run: ${shot.text.slice(0, 200)} ---`
        }
      }
    } catch (e: any) {
      text += `\n(look after the run failed: ${(e && e.message) || e})`
    }
    return { text, base64Image }
  }

  // How a tool-driven run is named in the run log: the caller as prefix
  // (mcp:click_at from the bridge, chat:click_at from the panel's AI chat), so
  // its "… completed (Runtime …)" line is never mistaken for a macro of that
  // name, and the uiv.* lines between stay recognisable as commands
  private toolLabel = (tool: string): string => `${this.params.runOrigin === 'mcp' ? 'mcp' : 'chat'}:${tool}`

  // The window in the foreground, from the host (2.0.17+; null before that
  // and on non-Windows). Best-effort: never throws, never reconnects.
  private foregroundWindow = async (): Promise<{ hwnd: number; title: string; class: string; x: number; y: number; width: number; height: number } | null> => {
    if (!xmoduleVersionAtLeast('2.0.17')) return null
    try {
      const api: any = getNativeXYAPI()
      const w = await api.getForegroundWindow()
      return w && typeof w.title === 'string' ? w : null
    } catch (e) {
      return null
    }
  }

  // A desktop exploration click that lands on a taskbar button, a viewer
  // window or a dialog changes which window is in front — and often moves
  // it: the AnyDesk viewer jumped 50 px when a click_at raised it, and every
  // later point read off the previous screenshot was off by that much
  // (OPEN-ISSUES 32.9). Say so, so the agent re-screenshots before its next
  // point instead of clicking into the void.
  private foregroundChangeNote = (before: any, after: any): string => {
    if (!before || !after) return ''
    const same = before.hwnd === after.hwnd
    const moved = same && (before.x !== after.x || before.y !== after.y || before.width !== after.width || before.height !== after.height)
    if (same && !moved) return ''
    const name = (w: any) => `"${(w.title || w.class || '?').slice(0, 80)}"`
    const rect = (w: any) => `${w.x},${w.y} ${w.width}x${w.height}`
    return same
      ? `\n(the foreground window ${name(after)} moved/resized: ${rect(before)} → ${rect(after)} physical px — positions read off the previous screenshot are stale, take a new screenshot before the next point)`
      : `\n(foreground window changed: ${name(before)} → ${name(after)} at ${rect(after)} physical px — the screen layout may have shifted; take a new screenshot before the next point)`
  }

  // click_at / type_at (OPEN-ISSUES 26.2): a point read off the last screenshot,
  // converted here — the exploration move that a saved macro must not contain
  private clickAt = async (args: any, text: string): Promise<MacroAgentToolResult> => {
    const tool = text ? 'type_at' : 'click_at'
    if (!this.lastShot) return { text: `Error: ${tool} needs a screenshot first — the point is read off the most recent one.`, isError: true }
    const x = Number(args.x)
    const y = Number(args.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { text: `Error: ${tool}: x and y must be numbers (pixels of the last screenshot).`, isError: true }
    const raw = this.toRawRect({ x, y, w: 1, h: 1 })
    const desktop = !!this.lastShot.desktop
    const scale = this.captureScale(desktop, this.lastShot.width) || 1
    const px = Math.round(raw.x / scale)
    const py = Math.round(raw.y / scale)
    const where = desktop ? `screen point ${px},${py} (logical px)` : `viewport point ${px},${py} (CSS px)`
    // the run log names the CALLER, not just the tool: "mcp:click_at completed"
    // next to "Executing: uiv.desktop.mouse.click" tells a tool call from a uiv
    // command at a glance (a bare "click_at completed" read like a macro name)
    const label = this.toolLabel(tool)
    const typed = text ? JSON.stringify(text) : ''
    // via "clipboard": paste the text, then press only a TRAILING run of
    // key names (the usual …${KEY_ENTER}) as keys — a paste cannot press
    // Enter, and a key name in the middle of pasted text is just text
    // ORDER for the clipboard path: write, settle, THEN the click, then the
    // chord. A VM inside a viewer pulls the host clipboard when its window
    // is grabbed (clicked) — clicking first pasted the PREVIOUS clipboard
    // content twice in a row (2026-09-05), 2500 ms settle notwithstanding.
    const viaClipboard = !!text && args.via === 'clipboard'
    const clickCmd = desktop
      ? `uiv.desktop.mouse.click(${px}, ${py});`
      : `uiv.browser.click({ x: ${px}, y: ${py}, scope: 'browser', frameId: 0 });`
    const clipboardScript = (): string => {
      const m = /((?:\$\{KEY_[^}]*\})+)$/.exec(text)
      const head = m ? text.slice(0, m.index) : text
      const tail = m ? m[1] : ''
      const settleMs = Number.isFinite(Number(args.settle)) && args.settle !== undefined && args.settle !== null ? Math.max(0, Math.round(Number(args.settle))) : 1000
      const chord = args.chord ? JSON.stringify(String(args.chord)) : `(uiv.getVar('!OS') === 'mac' ? 'Meta+V' : 'Control+V')`
      return `${head ? `uiv.clipboard.write(${JSON.stringify(head)}); uiv.sleep(${settleMs}); ` : ''}${clickCmd} uiv.sleep(300);${head ? ` uiv.desktop.keyboard.press(${chord});` : ''}${tail ? ` uiv.sleep(150); uiv.desktop.keyboard.type(${JSON.stringify(tail)});` : ''}`
    }
    const script = viaClipboard
      ? clipboardScript()
      : desktop
        ? `${clickCmd}${text ? ` uiv.sleep(150); uiv.desktop.keyboard.type(${typed});` : ''}`
        : `${clickCmd}${text ? ` uiv.sleep(150); uiv.browser.type(${typed});` : ''}`
    this.params.logMessage(`${label} → ${where}`, 'user', 'result')
    const runLogMarker = this.logMarker()
    const fgBefore = desktop ? await this.foregroundWindow() : null
    let result: { ok: boolean; error: string | null }
    try {
      result = await runScript(script, { name: label, stickyTab: true })
    } catch (e: any) {
      result = { ok: false, error: (e && e.message) || String(e) }
    } finally {
      this.restoreTabAfterRun()
    }
    const fgNote = fgBefore ? this.foregroundChangeNote(fgBefore, await this.foregroundWindow()) : ''
    const logText = this.capLogTail(this.logsSinceMarker(runLogMarker).filter((l: any) => l.type !== 'status').map((l: any) => `[${l.type}] ${l.text}`).join('\n'), 1500)
    // the person watching a desktop exploration (often over screen sharing)
    // gets a box that stays where the click landed — the click ring alone is
    // gone in half a second
    if (desktop && result.ok) showDesktopLastInputMark(3000)
    // an exploration click is a run like any other for the zoom's staleness
    // check: a region magnified right after it must not show the screen from
    // before the click (OPEN-ISSUES 32.8)
    this.lastRunAt = Date.now()
    this.lastRunTool = tool
    const after = await this.lookAfterAction(args.look || 'delta', false, desktop)
    const note = '\n(exploration only: a point is not a locator — for a macro that will be saved, act by ref/locator from browser_snapshot or by a saved element image)'
    return {
      text: `${tool} ${result.ok ? 'done' : 'FAILED: ' + result.error} — ${where}.\n--- log ---\n${logText || '(no log output)'}${fgNote}${after.text}${note}`,
      base64Image: after.base64Image,
      isError: !result.ok
    }
  }

  // After a DOM-locator "not found" run failure, the model's observed next
  // move is a BLIND retry: measured on the Aug 11 field logs, 5 of 6 such
  // failures went straight back to set_macro with a new selector guess, and
  // browser_snapshot was called zero times. So the page structure is attached to the
  // failure result itself — the retry then works from what the page actually
  // contains, and the round trip a voluntary browser_snapshot would cost is saved.
  //
  // DOM failures only: image/OCR misses already get the click-trail picture,
  // which is their analog of "what the page really looked like". Best-effort
  // by design — any problem here (tab gone, browser-internal page, injection
  // refused) returns '' and the run error goes back unmodified.
  private attachPageStructureOnDomMiss = async (errorText: string): Promise<string> => {
    try {
      const domMiss =
        /(?:findElements|elementSearch|domSelect|domType|domClick[A-Za-z]*)[^\n]*nothing found/.test(errorText) ||
        /timeout reached when looking for element/.test(errorText)
      if (!domMiss) return ''

      // the tab the run was driving; active-tab fallback (same chain as
      // runMacro's targeting, in reverse — after a run the play tab is the
      // page the macro died on, wherever the user's focus moved meanwhile)
      let tab: any = await getPlayTab().catch(() => null)
      if (!isWebTab(tab)) tab = await this.bridgeTab()
      if (!tab || !tab.id || !/^(https?:|file:)/.test(tab.url || '')) return ''

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: extractPageDigest
      })
      const frames = (results || [])
        .filter((r: any) => r && r.result)
        .map((r: any) => ({ frameId: r.frameId, ...r.result }))
      if (!frames.length) return ''

      let digest = JSON.stringify(frames.length === 1 ? frames[0] : frames, null, 1)
      if (digest.length > 6000) {
        digest = digest.slice(0, 6000) + '\n... (truncated — call browser_snapshot for the full structure)'
      }

      // Match the error's delimiters, not the first quoted fragment: XPath
      // and CSS locators routinely contain both kinds of quote themselves.
      const locMatch = /timeout reached when looking for element '([^\n]*)'(?:\r?$)/m.exec(errorText) ||
        /(?:findElements|elementSearch|domSelect|domType|domClick[A-Za-z]*)\('([^\n]*)'\): nothing found/.exec(errorText)
      const what = locMatch ? `The selector '${locMatch[1]}' was not found` : 'A locator was not found'
      // the digest lists an open dialog first and marks shadow-hosted entries
      // (42.3) — say so up front, where the cut-off cannot hide it, and name
      // the one locator kind that reaches a shadow-hosted node
      const f0: any = frames[0]
      const shadowN = (f0.clickables || []).concat(f0.fields || []).filter((e: any) => e && e.shadow).length
      const domLoc = locMatch && /^(css|xpath)=/i.test(locMatch[1])
      const hints =
        (f0.openDialog ? ` An open dialog "${f0.openDialog}" is listed first (inDialog: true).` : '') +
        (shadowN ? ` ${shadowN} listed element(s) sit inside open shadow roots (shadow: true, locator ref=N)${domLoc ? ' — a css=/xpath= locator cannot reach those, which is the likely reason this one found nothing' : ''}: act by their ref= locator (uiv.page.click('ref=N')).` : '')
      return `\n--- current page structure (auto-attached) ---\n${what} on the page the macro stopped on (${tab.url}). This is that page's structure RIGHT NOW — fix the macro using these real locators instead of guessing new ones.${hints} If the target is not in here either, this is the WRONG PAGE or the content is gated (login, popup): say so instead of retrying.\n${digest}`
    } catch (e) {
      return ''
    }
  }

  // Draw where the run actually clicked onto a fresh screenshot.
  //
  // "uiv.findImage('button.png') → click" in the log is unfalsifiable — it
  // reads exactly the same whether the finder matched the intended icon or its
  // neighbour, so a wrong match stayed invisible to the user AND to the model
  // until something downstream happened to notice. A picture of the screen
  // with the matches and resulting clicks marked on it settles it at a
  // glance, for both.
  //
  // FINDER runs only. A macro that clicks literal x/y coordinates has nothing
  // this picture can verify — the numbers land where the numbers say — and a
  // coordinate-heavy run (the Draw-a-cat demo: ~40 clicks, 11 drags) comes
  // back as a wall of arrows burying the very result it drew; the chat model
  // then read the markers as page content ("the drawing is covered by
  // overlays"). Deliberate coordinate testing has the range macros. So: no
  // findImage / OCR / ai.find / offset in the run → no picture.
  // The run-picture ring (common/run_frames): up to three captures the run's
  // visual finders made, composed side by side, oldest LEFT, newest RIGHT.
  // Each frame is exactly what that finder saw — no arrows, no boxes — and
  // the caption says which call it was. The same three files sit in Shots as
  // _run_last-2 / _run_last-1 / _run_last, so a human can open them too.
  private runFramesImage = async (): Promise<{ text: string; base64Image: string } | null> => {
    try {
      const frames = getRunFrames()
      if (!frames.length) return null
      const { Jimp } = await import('jimp')
      const imgs: any[] = []
      for (const fr of frames) {
        const buf: ArrayBuffer = fr.content instanceof ArrayBuffer ? fr.content : await (fr.content as Blob).arrayBuffer()
        imgs.push(await Jimp.read(Buffer.from(buf)))
      }
      const H = 720
      const GAP = 16
      imgs.forEach((im) => {
        const s = H / im.bitmap.height
        im.resize({ w: Math.max(1, Math.round(im.bitmap.width * s)), h: H })
      })
      const totalW = imgs.reduce((a, im) => a + im.bitmap.width, 0) + GAP * (imgs.length - 1)
      const strip = new Jimp({ width: totalW, height: H, color: 0x202020ff })
      let x = 0
      imgs.forEach((im) => { strip.composite(im, x, 0); x += im.bitmap.width + GAP })
      const processed: any = await this.screenshotter.processImage(await strip.getBuffer('image/png'))
      const names = ['_run_last-2', '_run_last-1', '_run_last'].slice(-frames.length)
      const captions = frames.map((fr, i) => `${i + 1} (${names[i]}.png, ${fr.scope}): ${fr.label || fr.tag}`).join(' | ')
      return {
        text:
          `\n\n--- the screen as the run's last visual finders saw it (${frames.length} capture${frames.length > 1 ? 's' : ''}, oldest LEFT → newest RIGHT; also in Shots as ${names.join(', ')}) ---\n` +
          `No arrows or boxes: each frame is exactly the capture that finder searched, taken BEFORE it acted. The cause of a failure usually sits one or two frames before the last one — compare them. ${captions}. Coordinates cannot be read off this composite; take a screenshot for that.`,
        base64Image: Buffer.from(processed.scaledBuffer).toString('base64')
      }
    } catch (e) {
      return null   // diagnostics only — never fail a run over it
    }
  }

  private clickTrailImage = async (): Promise<{ text: string; base64Image: string } | null> => {
    try {
      const trail = getClickTrail()
      const ocr = getOcrTrail()
      const images = getImageTrail()
      const derived = getPointTrail()
      if (!ocr.length && !images.length && !derived.length) return null

      // Screen and viewport coordinates cannot share one picture. Desktop wins
      // when present: it is the space browser UI lives in, which is where
      // aiming goes wrong.
      const desktop =
        trail.some((p: any) => p.scope === 'desktop') ||
        ocr.some((e: any) => e.scope === 'desktop') ||
        images.some((e: any) => e.scope === 'desktop') ||
        derived.some((e: any) => e.scope === 'desktop')
      const points = trail.filter((p: any) => (p.scope === 'desktop') === desktop)
      const ocrEntries = ocr.filter((e: any) => (e.scope === 'desktop') === desktop)
      const imageEntries = images.filter((e: any) => (e.scope === 'desktop') === desktop)
      const derivedPts = derived.filter((e: any) => (e.scope === 'desktop') === desktop)

      const tabDpr = desktop ? null : await this.tabDevicePixelRatio()
      const raw = await this.params.captureScreenShotFunction({ desktop })
      if (!raw) return null

      const { Jimp } = await import('jimp')
      const image = await Jimp.read(raw)
      const W = image.bitmap.width
      const H = image.bitmap.height

      // The capture is PHYSICAL pixels; the recorded points are not.
      // Desktop-tier points are LOGICAL screen coordinates — the XModule
      // multiplies them by the display scale when it clicks (the log's
      // "× 1.25" line), so the click lands right while a marker drawn from
      // the raw numbers sits at 1/1.25 (Windows 125%) or 1/2 (Mac Retina) of
      // the true position: arrows floated above-left of every icon they had
      // in fact hit. Derive the scale from the capture itself — physical
      // width over the display's logical width — rather than from the
      // panel's devicePixelRatio, which describes whichever monitor the
      // panel happens to sit on, not the one that was captured.
      const screenScale = window.screen && window.screen.width ? W / window.screen.width : window.devicePixelRatio || 1
      // Browser-tier points are viewport CSS px; the tab capture scales by the
      // page's devicePixelRatio — the TAB's, measured in it (page zoom counts),
      // the panel's only when the tab could not be asked.
      const dpr = tabDpr || window.devicePixelRatio || 1
      const toRaw = (v: number) => Math.round(v * (desktop ? screenScale : dpr))

      // ---- OCR layer FIRST, so click arrows stay on top of the word boxes.
      // Desktop-scope OCR matches share the CLICK coordinate space: the
      // finder pipeline divides desktop capture results by the display scale
      // so a match can feed uiv.desktop.mouse.click directly (which multiplies by
      // the scale again — the log's "× 1.75" line). They are LOGICAL screen
      // coordinates, same as desktop click points. The old "already physical
      // capture pixels" assumption here predated that normalization and drew
      // every OCR box at 1/scale of its true position (boxes floating
      // up-left of the words on any scaled display). Browser-scope OCR is
      // viewport CSS px like browser clicks.
      const ocrToRaw = (v: number) => Math.round(v * (desktop ? screenScale : dpr))
      // for the engine hint below: searches that ran on the weak Javascript
      // OCR while the XModule reader sat installed get called out per search
      const xmoduleOcr = ocrEntries.length ? await isXModuleOcrAvailable().catch(() => false) : false
      let ocrNumber = 0
      const ocrLegend: string[] = []
      let firstOcrPt: { x: number; y: number } | null = null
      for (const entry of ocrEntries) {
        // What OCR read goes into the TEXT, not onto the picture. The old
        // overlay painted EVERY recognised word marker-yellow with its
        // reading captioned underneath — for a human that is a fine "what
        // did OCR see" view (it still exists in the panel), but for the
        // model it turned the page into a wall of yellow boxes it had to
        // read AROUND (2026-08-22, Claude reviewing its own inputs). A model
        // wants the clean capture plus the readings as words it can compare
        // to the query — so: the readings closest to the query, as text.
        const readings = this.closestReadings(entry.query, entry.words || [])
        const startNumber = ocrNumber + 1
        const ocrMatchLines: string[] = []
        for (const m of entry.matches || []) {
          ocrNumber++
          const rx = ocrToRaw(m.rect.left)
          const ry = ocrToRaw(m.rect.top)
          const rw = Math.max(4, ocrToRaw(m.rect.width))
          const rh = Math.max(4, ocrToRaw(m.rect.height))
          // white-backed red box, same contrast trick as the arrows
          this.drawRectOutline(image, rx - 2, ry - 2, rw + 4, rh + 4, 0xffffffff)
          this.drawRectOutline(image, rx, ry, rw, rh, 0xff2020ff)
          this.drawNumberLabel(image, rx, Math.max(0, ry - 20), ocrNumber)
          if (!firstOcrPt) firstOcrPt = { x: ocrToRaw(m.x), y: ocrToRaw(m.y) }
          // the legend line the number on the picture resolves to — exact
          // coordinates in the macro's own space, so the model acts on the
          // legend and never estimates pixels off the picture
          ocrMatchLines.push(`#${ocrNumber} '${String(m.text || entry.query).slice(0, 30)}' at ${Math.round(m.x)},${Math.round(m.y)} (box ${Math.round(m.rect.left)},${Math.round(m.rect.top)} ${Math.round(m.rect.width)}x${Math.round(m.rect.height)})`)
        }
        const n = (entry.matches || []).length
        const hasWildcard = /[?*]/.test(entry.query)
        // Measure the query where its emptiness is visible, not in the model's
        // memory of the prompt. From the authenticator-TOTP transcript
        // (2026-08-11): the agent shipped findText('?*') — 11 matches, clicked
        // the FIRST, an arbitrary word (which, landing outside the extension
        // popup, also dismissed it) — and later pinned '513*', one run's
        // reading of a code that rotates every 30 seconds. Both runs logged
        // clean.
        const literalChars = String(entry.query).replace(/[?*\s]/g, '')
        // only a query that is (almost) nothing but wildcards matches any word;
        // a two-letter LITERAL like 'Ok' is a normal search (OPEN-ISSUES 18.4)
        const genericQuery = hasWildcard && literalChars.length <= 2
        const volatileDigits = !genericQuery && /^\d+$/.test(literalChars)
        const volatileHint = volatileDigits
          ? ` VALUE TRAP: '${literalChars}' is a NUMBER read off an earlier run. If it is a value that changes (a one-time code, a counter, a clock), no run can ever match it again — the digits are already different by the time the search runs. Search for what STAYS (the label or icon beside the value), uiv.offset from it to the value's position, and READ what is there — never make a changing value the search target.`
          : ''
        const genericMissHint = genericQuery
          ? ` This query matches ANY recognised word, so ZERO matches means OCR recognised NOTHING inside the searched region — no query wording can fix that. Escalate the reader ({engine: 99} when the XModule is installed, or uiv.ai.ask on a screenshot) or switch the step to an image / anchor+offset.`
          : ''
        const genericHitHint = genericQuery
          ? ` COIN-TOSS WARNING: strip the wildcards and this query is ${literalChars.length ? `just '${literalChars}'` : 'EMPTY'} — it matches ANY recognised word, so "the FIRST match" is an arbitrary word on the screen and every click built on it is a guess that still logs as a clean run. Do not ship this step: name literal text (stable stem + wildcard), or drop OCR here and use an image or a stable anchor + uiv.offset.`
          : n >= 4
            ? ` With ${n} matches, "the FIRST" is a position accident, not a choice — read off THIS picture which number is the intended target, then pin it (uiv.ocr.findTexts(...)[i]) or narrow the search with {area}.`
            : ''
        // a spaced query has a failure mode of its own: OCR often loses the
        // space, merging the words into ONE token that a two-word query can
        // never match — the bridged wildcard form matches every segmentation
        const spaceHint = /\s/.test(String(entry.query).trim())
          ? ` Your query contains a SPACE, and OCR often LOSES the space — the words merge into one token ("Web form" reads as "Webform"), which a two-word query cannot match however good its wildcards. Bridge the boundary instead: '${String(entry.query).trim().split(/\s+/).map((wd: string) => wd.slice(0, 3).toLowerCase()).join('*')}*' matches every segmentation and misread at once.`
          : ''
        // did this search run on the weaker cross-platform engine?
        // Explicitly asked, or defaulted to it (browser scope only — desktop
        // reads auto-upgrade to the OS reader when no engine is requested)
        const osLocalOcrName = /mac/i.test(window.navigator.userAgent) ? 'builtin_mac' : 'builtin_win'
        const configuredBuiltin = Number((store.getState().config as any).ocrEngine) === 98 || !(store.getState().config as any).ocrEngine
        const ranOnBuiltin =
          /^(98|javascript|builtin)$/i.test(String(entry.engine || '')) ||
          (!entry.engine && configuredBuiltin && entry.scope !== 'desktop')
        const engineHint =
          ranOnBuiltin && xmoduleOcr
            ? ` This search ran on the weaker cross-platform reader ('builtin') while the OS reader is INSTALLED — add {engine: '${osLocalOcrName}'} to the call; that is the default to write whenever the XModule is present, not an escalation.`
            : ''
        const wordCount = (entry.words || []).length
        const readingsText = readings.length
          ? ` OCR recognised ${wordCount} word${wordCount === 1 ? '' : 's'} in the searched region; the readings closest to the query: ${readings.map((r) => `'${r}'`).join(', ')}.`
          : wordCount
            ? ` OCR recognised ${wordCount} words in the searched region, none resembling the query.`
            : ' OCR recognised NO words at all in the searched region.'
        ocrLegend.push(
          n === 0
            ? `ocr.findText('${entry.query}'): NO match.${readingsText} If no listed reading is the target text, the engine cannot read it there.${engineHint}${spaceHint}${genericMissHint}${volatileHint}${hasWildcard ? '' : ` If a listed reading shows the word MISREAD, do NOT retarget the exact misreading — the same pixels read differently between captures (Webform one run, Webfom the next), so pinning one spelling fails on the next run. Anchor the STABLE STEM with wildcards instead: '${String(entry.query).slice(0, 5)}*'`}`
            : `ocr.findText('${entry.query}'): ${n} match${n > 1 ? `es, numbered ${startNumber}-${ocrNumber} — findText acts on the FIRST, check the number order picks the right one` : ` (red box ${ocrNumber})`}: ${ocrMatchLines.join('; ')}${genericHitHint}${volatileHint}${hasWildcard || n === 0 ? '' : `. NOTE: this query matched the EXACT current reading — if that reading is itself a misread (compare it with the page), it will flap between runs; make it stable with a wildcard on the stem before shipping`}`
        )
      }

      // ---- search areas: the region a finder was RESTRICTED to. "Found
      // nothing" with the area drawn is one glance — the target simply sits
      // outside the blue box. Image-search coordinates share the click space
      // (logical on desktop), OCR its own (physical on desktop).
      const BLUE = 0x2864dcff
      let areaCount = 0
      for (const entry of imageEntries) {
        if (!entry.area) continue
        this.drawRectOutline(image, toRaw(entry.area.left) - 2, toRaw(entry.area.top) - 2, toRaw(entry.area.width) + 4, toRaw(entry.area.height) + 4, 0xffffffff)
        this.drawRectOutline(image, toRaw(entry.area.left), toRaw(entry.area.top), toRaw(entry.area.width), toRaw(entry.area.height), BLUE)
        areaCount++
      }
      for (const entry of ocrEntries) {
        if (!entry.area) continue
        this.drawRectOutline(image, ocrToRaw(entry.area.left) - 2, ocrToRaw(entry.area.top) - 2, ocrToRaw(entry.area.width) + 4, ocrToRaw(entry.area.height) + 4, 0xffffffff)
        this.drawRectOutline(image, ocrToRaw(entry.area.left), ocrToRaw(entry.area.top), ocrToRaw(entry.area.width), ocrToRaw(entry.area.height), BLUE)
        areaCount++
      }

      // ---- offset compositions: anchor -> landing, as a line. The landing
      // usually gets a click arrow too; the line is the PROVENANCE — it shows
      // the step was derived, and from where, so a wrong dx/dy reads as a line
      // pointing somewhere silly instead of as an unexplained arrow.
      const GREEN = 0x18a034ff
      let offsetCount = 0
      for (const d of derivedPts) {
        if (d.kind !== 'offset') continue
        const ax = toRaw(d.ax)
        const ay = toRaw(d.ay)
        const lx = toRaw(d.x)
        const ly = toRaw(d.y)
        this.drawLine(image, ax, ay, lx, ly, 2, 0xffffffff)
        this.drawLine(image, ax, ay, lx, ly, 1, GREEN)
        // small filled anchor dot, ring on the landing point
        this.blendRect(image, ax - 3, ay - 3, 7, 7, 24, 160, 52, 1)
        this.drawRectOutline(image, lx - 6, ly - 6, 12, 12, GREEN)
        offsetCount++
      }

      // ---- image-search matches. The engine acts on the HIGHEST-SCORING
      // match, but uiv.findImages hands the list back in READING order — so
      // the numbers on the picture are READING order (what `matches[i]`
      // means to a script), and the acted-on best match is additionally
      // tagged BEST in RED. Numbering by rank instead confused both users
      // and the model: box "#1" sat after boxes the reading order put first.
      // Misses draw their best below-threshold candidates in grey: "0.62
      // against your 0.8" and "nothing anywhere" demand opposite fixes.
      const AMBER = 0xdd9000ff
      const imageLegend: string[] = []
      let firstImgPt: { x: number; y: number } | null = null
      for (const entry of imageEntries) {
        const matches = entry.matches || []
        // reading order: rows top-to-bottom (10px tolerance), left-to-right
        const reading = matches.slice().sort((a: any, b: any) =>
          Math.abs(a.rect.top - b.rect.top) > 10 ? a.rect.top - b.rect.top : a.rect.left - b.rect.left)
        const bestMatch = matches.reduce(
          (mx: any, m: any) => ((m.score || 0) > (mx ? mx.score || 0 : -1) ? m : mx), null)
        const imgMatchLines: string[] = []
        for (const m of reading) {
          const best = m === bestMatch
          const color = best ? 0xff2020ff : AMBER
          const rx = toRaw(m.rect.left)
          const ry = toRaw(m.rect.top)
          const rw = Math.max(4, toRaw(m.rect.width))
          const rh = Math.max(4, toRaw(m.rect.height))
          this.drawRectOutline(image, rx - 2, ry - 2, rw + 4, rh + 4, 0xffffffff)
          this.drawRectOutline(image, rx, ry, rw, rh, color)
          if (matches.length > 1) this.drawNumberLabel(image, rx, Math.max(0, ry - 20), reading.indexOf(m) + 1, color)
          if (best && matches.length > 1) this.captionAt(image, rx + 20, Math.max(0, ry - 16), 'BEST', 2, 0xff2020ff)
          this.captionAt(image, rx, ry + rh + 2, (m.score || 0).toFixed(2), 1, best ? 0xb01010ff : 0x8a5a00ff)
          if (!firstImgPt) firstImgPt = { x: toRaw(m.x), y: toRaw(m.y) }
          imgMatchLines.push(`#${reading.indexOf(m) + 1}${best ? ' BEST' : ''} at ${Math.round(m.x)},${Math.round(m.y)} (box ${Math.round(m.rect.left)},${Math.round(m.rect.top)} ${Math.round(m.rect.width)}x${Math.round(m.rect.height)}, score ${(m.score || 0).toFixed(2)})`)
        }
        for (const c of entry.candidates || []) {
          const rx = toRaw(c.rect.left)
          const ry = toRaw(c.rect.top)
          this.drawRectOutline(image, rx, ry, Math.max(4, toRaw(c.rect.width)), Math.max(4, toRaw(c.rect.height)), 0x808080ff)
          this.captionAt(image, rx, ry + Math.max(4, toRaw(c.rect.height)) + 2, (c.score || 0).toFixed(2), 1, 0x555555ff)
          if (!firstImgPt) firstImgPt = { x: toRaw(c.x), y: toRaw(c.y) }
        }
        const n = (entry.matches || []).length
        const nc = (entry.candidates || []).length
        imageLegend.push(
          n === 0
            ? nc === 0
              ? `findImage('${entry.image}'): NO match at ${entry.minScore} and nothing even close anywhere — the saved image no longer looks like anything on screen; recapture it`
              : `findImage('${entry.image}'): NO match at ${entry.minScore}, but GREY boxes show the closest below-threshold candidates with their scores — if one sits on the intended element, the image is right and the threshold is too strict; if none does, recapture`
            : `findImage('${entry.image}'): ${n} match${n > 1 ? `es, numbered in READING order (top-to-bottom, left-to-right — the same order uiv.findImages returns, so matches[i] is box #${'{i+1}'}). The RED box tagged BEST is the highest-scoring match, the one the runtime acts on; AMBER boxes are the other matches. Check the BEST box sits on the intended element, not a lookalike` : ` (red box)`}: ${imgMatchLines.join('; ')}`
        )
      }

      // ---- ai.find answers: where the MODEL pointed, before any click used
      // it — separates "the model pointed wrong" from "the click went wrong"
      const PURPLE = 0x9b30d0ff
      let aiCount = 0
      for (const d of derivedPts) {
        if (d.kind !== 'ai') continue
        const px = toRaw(d.x)
        const py = toRaw(d.y)
        this.drawRectOutline(image, px - 12, py - 12, 24, 24, 0xffffffff)
        this.drawRectOutline(image, px - 10, py - 10, 20, 20, PURPLE)
        this.captionAt(image, px + 14, py - 8, 'AI', 2, PURPLE)
        aiCount++
      }

      // ---- drag paths: down -> (moves) -> up as a polyline, ring at the
      // press, filled square at the release. A drag is otherwise invisible —
      // only its endpoints get arrows, which reads as two unrelated clicks.
      let dragCount = 0
      for (let i = 0; i < points.length; i++) {
        if (!/\.down$/.test(points[i].label)) continue
        const tier = points[i].label.split('.')[0]
        const path = [points[i]]
        let j = i + 1
        for (; j < points.length; j++) {
          if (!points[j].label.startsWith(tier + '.')) continue
          path.push(points[j])
          if (/\.up$/.test(points[j].label)) break
        }
        if (path.length < 2 || !/\.up$/.test(path[path.length - 1].label)) continue
        for (let k = 1; k < path.length; k++) {
          this.drawLine(image, toRaw(path[k - 1].x), toRaw(path[k - 1].y), toRaw(path[k].x), toRaw(path[k].y), 2, 0xffffffff)
          this.drawLine(image, toRaw(path[k - 1].x), toRaw(path[k - 1].y), toRaw(path[k].x), toRaw(path[k].y), 1, BLUE)
        }
        this.drawRectOutline(image, toRaw(path[0].x) - 6, toRaw(path[0].y) - 6, 12, 12, BLUE)
        this.blendRect(image, toRaw(path[path.length - 1].x) - 4, toRaw(path[path.length - 1].y) - 4, 9, 9, 40, 100, 220, 1)
        dragCount++
      }

      // only the LAST few actions are drawn: a 15-click run came back as a
      // wall of arrows that buried the result (OPEN-ISSUES 18.8) — earlier
      // ones are still listed in the text, just not on the picture
      const ARROWS_MAX = 3
      const arrowPts = points.slice(-ARROWS_MAX)
      let drawn = 0
      let lastPt: { x: number; y: number } | null = null
      for (const p of arrowPts) {
        const px = toRaw(p.x)
        const py = toRaw(p.y)
        if (px < 0 || py < 0 || px >= W || py >= H) continue
        this.drawClickArrow(image, px, py)
        lastPt = { x: px, y: py }
        drawn++
      }
      if (!drawn && !ocrNumber && !ocrLegend.length && !imgNumber && !imageLegend.length && !aiCount && !offsetCount) return null

      // magnified inset of the LAST click (the one whose result is on screen),
      // or of the first find when the run only searched
      const insetPt = lastPt || firstImgPt || firstOcrPt
      if (insetPt) await this.addClickInset(image, insetPt.x, insetPt.y)

      const processed: any = await this.screenshotter.processImage(await image.getBuffer('image/png'))
      const f = processed.scaleFactor || 1
      const firstShown = points.length - arrowPts.length
      const where = arrowPts
        .map((p: any, i: number) => `${firstShown + i + 1}. ${p.label} at ${p.x},${p.y}`)
        .join('; ')

      // the user sees the same picture in the chat — this is the whole point:
      // a wrong click is obvious to a human in one glance and invisible in a log
      const shotBase64 = Buffer.from(processed.scaledBuffer).toString('base64')
      const chatSummary = [
        drawn ? `Clicked at ${points.map((p: any) => `${p.x},${p.y}`).join('  ')}` : '',
        imageLegend.length ? `findImage: ${imageEntries.map((e: any) => `'${e.image}' ×${(e.matches || []).length}`).join(', ')}` : '',
        ocrLegend.length ? `OCR: ${ocrEntries.map((e: any) => `'${e.query}' ×${(e.matches || []).length}`).join(', ')}` : '',
        aiCount ? `ai.find ×${aiCount}` : '',
        dragCount ? `drag ×${dragCount}` : ''
      ].filter(Boolean).join(' — ')
      this.params.logMessage(
        `${chatSummary} — marked below`,
        'user',
        'result',
        {
          dataUrl: `data:image/png;base64,${shotBase64}`,
          width: processed.scaledWidth,
          height: processed.scaledHeight
        }
      )

      const clickText = drawn
        ? `an ARROW at ${points.length > ARROWS_MAX ? `each of the LAST ${ARROWS_MAX} of ${points.length} points this macro aimed input at (the ${firstShown} earlier ones are not drawn)` : 'every point this macro aimed input at'}, in order: ${where}. Check each arrow lands ON the thing the user named — a click on the wrong control is the single most common reason a macro "runs fine" and does nothing useful, and it looks identical in the log to a correct one.`
        : ''
      const ocrText = ocrLegend.length
        ? `\nOCR: RED numbered boxes are the query's matches — nothing else from OCR is drawn; what the engine read is given as text here. ${ocrLegend.join(' | ')}`
        : ''
      const imageText = imageLegend.length
        ? `\nImage-search overlay: boxes are numbered in READING order (the order uiv.findImages returns); the RED box tagged BEST is the highest-scoring match — the one the runtime acts on; AMBER boxes are the other matches, each with its score printed underneath; GREY boxes are the best below-threshold candidates on a miss. ${imageLegend.join(' | ')}`
        : ''
      const extrasText = [
        aiCount ? `PURPLE rings labelled AI mark where uiv.ai.find pointed — if a ring is off-target, the model pointed wrong, independent of any click` : '',
        offsetCount ? `GREEN lines show uiv.offset steps, anchor dot to landing ring — a line aiming somewhere silly means the dx/dy is wrong` : '',
        dragCount ? `BLUE polylines are drags, ring at the press, filled square at the release` : '',
        areaCount ? `BLUE rectangles are the {area} a finder was restricted to — a target outside its blue box can never be found by that call` : ''
      ].filter(Boolean)
      const extrasLine = extrasText.length ? `\n${extrasText.join('. ')}.` : ''

      // this capture becomes the zoom base too: a screenshot x/y/width/height
      // right after a run used to magnify the OLDER capture from the last
      // screenshot call — a screen state that no longer existed (OPEN-ISSUES
      // 18.2). `raw` is the unmarked capture; the arrows live on `image` only.
      this.lastShot = { raw, scaleFactor: f, width: W, height: H, originX: 0, originY: 0, baseScale: f, desktop, tabDpr, takenAt: Date.now() }

      return {
        text:
          `\n\n--- what the run actually did on screen ---\n` +
          `The picture below is the real ${desktop ? 'screen' : 'page'} after the run — the ONLY markings on it are the ones listed here, every numbered box resolves to a legend line with exact coordinates (act on those, never estimate pixels off the picture), and no marking is page content. It shows ${drawn ? clickText : 'its finder results marked.'}${imageText}${ocrText}${extrasLine}\n` +
          `(Click coordinates listed are ${desktop ? 'logical screen' : 'viewport'} pixels as the macro used them; the picture is scaled to ${Math.round(f * 100)}%.)`,
        base64Image: shotBase64
      }
    } catch (e) {
      // purely diagnostic — never fail a run over it
      return null
    }
  }

  // alpha-blend a filled rectangle over the image — the text-marker look; a
  // solid fill would hide the very words the overlay is about
  private blendRect (image: any, x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number) {
    const W = image.bitmap.width
    const H = image.bitmap.height
    const d = image.bitmap.data
    const x0 = Math.max(0, x)
    const y0 = Math.max(0, y)
    const x1 = Math.min(W, x + w)
    const y1 = Math.min(H, y + h)
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * W + xx) * 4
        d[i] = Math.round(d[i] * (1 - a) + r * a)
        d[i + 1] = Math.round(d[i + 1] * (1 - a) + g * a)
        d[i + 2] = Math.round(d[i + 2] * (1 - a) + b * a)
      }
    }
  }

  // Render text with the TINY_FONT table. Returns the drawn width.
  private drawTinyText (image: any, x: number, y: number, text: string, scale: number, color: number): number {
    const put = (px: number, py: number) => {
      if (px >= 0 && py >= 0 && px < image.bitmap.width && py < image.bitmap.height) image.setPixelColor(color, px, py)
    }
    let cx = x
    for (const raw of String(text)) {
      const key = TINY_FONT[raw] ? raw : TINY_FONT[raw.toUpperCase()] ? raw.toUpperCase() : '?'
      const rows = TINY_FONT[key]
      rows.forEach((row, ry) => {
        for (let rx = 0; rx < 5; rx++) {
          if (row & (0b10000 >> rx)) {
            for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) put(cx + rx * scale + a, y + ry * scale + b)
          }
        }
      })
      cx += 6 * scale
    }
    return cx - x
  }

  // One recognised word, in Copyfish's overlay dress (styles/cs.css there:
  // background rgba(255,215,15,0.5), font ~70% of the line height): golden
  // 50% fill over the original glyphs, and the text OCR read printed just
  // below, sized to the word — a fixed tiny caption was unreadable on a
  // full-desktop capture. Two deliberate departures from Copyfish: the
  // caption sits BELOW the word rather than over it (so page text and reading

  // The OCR readings most similar to a query, as text for the legend — the
  // replacement for painting every word onto the picture. Similarity is
  // deliberately crude (shared prefix + shared bigrams): it only has to
  // surface "Webfom" for "Webform", not rank a dictionary.
  private closestReadings (query: string, words: any[], limit: number = 6): string[] {
    const norm = (t: string) => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const q = norm(String(query || '').replace(/[?*]/g, ''))
    if (!q) return []
    const bigrams = (t: string) => { const out = new Set<string>(); for (let i = 0; i + 1 < t.length; i++) out.add(t.slice(i, i + 2)); return out }
    const qb = bigrams(q)
    const scored: Array<{ text: string; score: number }> = []
    const seen = new Set<string>()
    for (const w of words) {
      const raw = String(w && w.text || '').trim()
      const n = norm(raw)
      if (!n || seen.has(n)) continue
      seen.add(n)
      let prefix = 0
      while (prefix < n.length && prefix < q.length && n[prefix] === q[prefix]) prefix++
      let shared = 0
      for (const b of bigrams(n)) if (qb.has(b)) shared++
      const score = prefix * 2 + shared - Math.abs(n.length - q.length) * 0.25
      if (prefix >= 2 || shared >= 2) scored.push({ text: raw.slice(0, 30), score })
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.text)
  }

  // Number plate for OCR matches: white digits on a solid red tab. Drawn from
  // the same bitmap font because jimp's font plugin is not in the bundle (its
  // load-font entry point does not even typecheck here) and a glyph table
  // beats a 700KB dependency for two-digit numbers.
  private drawNumberLabel (image: any, x: number, y: number, n: number, plate: number = 0xff2020ff) {
    const S = 2 // 5x7 glyphs at 2x: 10x14, readable after the chat downscale
    const str = String(n)
    const plateW = str.length * 6 * S + 2 * S
    const plateH = 7 * S + 2 * S
    const put = (px: number, py: number, c: number) => {
      if (px >= 0 && py >= 0 && px < image.bitmap.width && py < image.bitmap.height) image.setPixelColor(c, px, py)
    }
    for (let yy = 0; yy < plateH; yy++) {
      for (let xx = 0; xx < plateW; xx++) put(x + xx, y + yy, plate)
    }
    this.drawTinyText(image, x + S, y + S, str, S, 0xffffffff)
  }

  // short text on a translucent white plate — score captions and the AI tag
  private captionAt (image: any, x: number, y: number, text: string, scale: number, color: number) {
    const tw = String(text).length * 6 * scale
    this.blendRect(image, x - 1, y - 1, tw + 3, 7 * scale + 3, 255, 255, 255, 0.78)
    this.drawTinyText(image, x, y, text, scale, color)
  }

  // Bresenham with a square brush — offset provenance lines and drag paths
  private drawLine (image: any, x0: number, y0: number, x1: number, y1: number, halfWidth: number, color: number) {
    const put = (px: number, py: number) => {
      if (px >= 0 && py >= 0 && px < image.bitmap.width && py < image.bitmap.height) image.setPixelColor(color, px, py)
    }
    let x = Math.round(x0)
    let y = Math.round(y0)
    const ex = Math.round(x1)
    const ey = Math.round(y1)
    const dx = Math.abs(ex - x)
    const dy = -Math.abs(ey - y)
    const sx = x < ex ? 1 : -1
    const sy = y < ey ? 1 : -1
    let err = dx + dy
    for (let guard = 0; guard < 100000; guard++) {
      for (let a = -halfWidth; a <= halfWidth; a++) {
        for (let b = -halfWidth; b <= halfWidth; b++) put(x + a, y + b)
      }
      if (x === ex && y === ey) break
      const e2 = 2 * err
      if (e2 >= dy) { err += dy; x += sx }
      if (e2 <= dx) { err += dx; y += sy }
    }
  }

  // A BIG arrow, not a crosshair. The chat shows this picture a few hundred
  // pixels wide, and a 28px crosshair on a full desktop shot survives that
  // downscale as a few faint dots — the user could not see where the click
  // went, which is the one thing the picture exists to show. So: a thick
  // diagonal shaft with a solid head landing on the point, drawn in white
  // first and red on top so it reads against any background.
  private drawClickArrow (image: any, x: number, y: number) {
    const W = image.bitmap.width
    const H = image.bitmap.height
    const RED = 0xff2020ff
    const WHITE = 0xffffffff

    // come in from whichever side has room, so the arrow never runs off-image
    const fromLeft = x > W * 0.25
    const fromTop = y > H * 0.25
    const dx = fromLeft ? -1 : 1
    const dy = fromTop ? -1 : 1

    const LEN = Math.max(60, Math.round(Math.min(W, H) * 0.07))
    const GAP = 10 // stop short so the clicked pixel stays visible
    const put = (px: number, py: number, c: number) => {
      if (px >= 0 && py >= 0 && px < W && py < H) image.setPixelColor(c, px, py)
    }

    // shaft, drawn twice: a fat white underlay then a thinner red core
    const shaft = (halfWidth: number, color: number) => {
      for (let d = GAP; d <= LEN; d++) {
        const cx = x + dx * d
        const cy = y + dy * d
        for (let a = -halfWidth; a <= halfWidth; a++) {
          for (let b = -halfWidth; b <= halfWidth; b++) put(cx + a, cy + b, color)
        }
      }
    }
    // solid triangular head filling the gap between shaft and target
    const head = (grow: number, color: number) => {
      for (let d = 0; d <= GAP + 6; d++) {
        const cx = x + dx * d
        const cy = y + dy * d
        const halfW = Math.round((d / (GAP + 6)) * (7 + grow)) + grow
        for (let a = -halfW; a <= halfW; a++) {
          // across the arrow direction
          put(cx + a, cy - a * dy * dx, color)
          put(cx + a, cy - a * dy * dx + 1, color)
        }
      }
    }

    shaft(4, WHITE)
    head(2, WHITE)
    shaft(2, RED)
    head(0, RED)

    // ring on the exact point, white-backed for the same reason
    this.drawRectOutline(image, x - 15, y - 15, 30, 30, WHITE)
    this.drawRectOutline(image, x - 13, y - 13, 26, 26, RED)
  }

  // Paste a magnified view of the click's surroundings into a corner of the
  // full screenshot. The overview says WHERE on screen; the inset says WHAT
  // was under the pointer — at full-desktop scale the second question is
  // unanswerable without it.
  private async addClickInset (image: any, x: number, y: number) {
    const { Jimp, ResizeStrategy } = await import('jimp')
    const W = image.bitmap.width
    const H = image.bitmap.height

    const SRC = Math.round(Math.min(W, H) * 0.09) // side of the area to magnify
    const sx = Math.max(0, Math.min(x - Math.round(SRC / 2), W - SRC))
    const sy = Math.max(0, Math.min(y - Math.round(SRC / 2), H - SRC))
    if (SRC < 20) return

    const inset = image.clone()
    inset.crop({ x: sx, y: sy, w: SRC, h: SRC })

    const OUT = Math.round(Math.min(W, H) * 0.3)
    inset.resize({ w: OUT, h: OUT, mode: ResizeStrategy.NEAREST_NEIGHBOR })

    // a crosshair at the click, in the inset's own magnified coordinates
    const z = OUT / SRC
    const ix = Math.round((x - sx) * z)
    const iy = Math.round((y - sy) * z)
    for (let d = 8; d <= Math.round(28 * z / 3); d++) {
      for (let t = -1; t <= 1; t++) {
        const put = (px: number, py: number) => {
          if (px >= 0 && py >= 0 && px < OUT && py < OUT) inset.setPixelColor(0xff2020ff, px, py)
        }
        put(ix + d, iy + t); put(ix - d, iy + t); put(ix + t, iy + d); put(ix + t, iy - d)
      }
    }
    this.drawRectOutline(inset, 0, 0, OUT, OUT, 0xff2020ff)

    // opposite corner from the click, so the inset never covers its own subject
    const px = x < W / 2 ? W - OUT - 8 : 8
    const py = y < H / 2 ? H - OUT - 8 : 8
    image.composite(inset, px, py)
    this.drawRectOutline(image, px - 2, py - 2, OUT + 4, OUT + 4, 0xffffffff)
  }

  // A macro or JS script left running from an EARLIER turn — an endless
  // while(true) repeater the user never stopped, or a run the extension's Stop
  // did not reach — used to make every later run_macro return "already
  // running". The chat was then wedged: the model could only tell the user to
  // click Stop, and field logs show users insisting "its paused" / "ok i
  // stopped it" while nothing recovered (retention.md §12.2/§12.8 — 50
  // conversations, 10% success, the one bug that is lethal per conversation).
  // A fresh run_macro IS the user asking to run THIS macro now, which
  // supersedes the stale one — so stop it ourselves, wait for it to actually
  // clear, then let the caller proceed. Returns an error string only when it
  // genuinely will not stop (truly wedged); that last-resort manual-Stop
  // message is now reached far less often than it was returned unconditionally.
  private clearStaleRun = async (): Promise<string | null> => {
    const scriptStuck = () => isScriptRunning()
    const playerStuck = () => store.getState().player.status !== Player.C.STATUS.STOPPED
    if (!scriptStuck() && !playerStuck()) return null

    this.params.logMessage(
      'A macro from an earlier turn is still running — stopping it before this run',
      'user',
      'result'
    )
    if (scriptStuck()) stopScript()
    if (playerStuck()) {
      try {
        getPlayer({ name: 'testCase' }).stop()
      } catch (e) {
        // player not initialized — nothing to stop
      }
    }

    // an endless loop needs a step to notice the stop flag, and the classic
    // player tears down asynchronously — give both a bounded moment to clear
    const deadline = Date.now() + 8000
    while (Date.now() < deadline) {
      if (!scriptStuck() && !playerStuck()) return null
      await delayMs(250)
    }
    return scriptStuck() || playerStuck()
      ? 'Error: a macro from an earlier run is still running and did not stop when asked. Ask the user to click Stop in the Ui.Vision panel (or reload the target tab), then run again.'
      : null
  }

  // Firefox MV3 treats host_permissions as OPT-IN: a fresh/temporary/upgraded
  // install starts with "<all_urls>" ungranted, content scripts inject nowhere,
  // and every page command dies with Error #170 ("No ipc available") after a
  // 5s retry — with the real cause (Firefox's "Missing host permission") never
  // reaching the surface. The panel's Play button asks for the grant
  // (dev_toolbar askPermission), but AI-chat and MCP-bridge runs call the
  // runner directly and bypassed it — diagnosed live 2026-08-19, and a slice
  // of the 69 #170 conversations in retention.md §12.2 is likely exactly this.
  // So the run path asks too: same dialog, and the OK click is the user
  // gesture Firefox requires for permissions.request(). Declined or unattended
  // (bridge run with nobody at the browser — 2min timeout) returns an error
  // that names the fix instead of #170.
  private ensureFirefoxHostPermission = async (): Promise<string | null> => {
    if (!isFirefox()) return null
    const granted = await Ext.permissions.contains({ origins: ['<all_urls>'] }).catch(() => true)
    if (granted) return null

    // the grant dialog itself lives with the panel (params hook, see
    // MacroAgentToolsParams.askFirefoxHostPermission for why it is not
    // imported here). 2min cap: an unattended bridge run must not hang a tool
    // call on a dialog nobody is there to click — the dialog may stay open,
    // and a late grant still satisfies the contains() check of the next run.
    const ask = this.params.askFirefoxHostPermission
    const ok = ask
      ? await Promise.race([
          ask().catch(() => false),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 120000))
        ])
      : false
    if (ok) return null
    return 'Error: Firefox is blocking macro replay — the "Access your data for all websites" permission has not been granted, so Ui.Vision cannot reach any web page (page commands would otherwise fail with Error #170 / "Missing host permission"). Firefox does not grant this at install; the user must approve it ONCE. Ask the user to run again and click Continue in the grant dialog, or to enable it manually: Firefox menu > Add-ons and themes (about:addons) > Ui.Vision RPA > Permissions > "Access your data for all websites". Until then, no macro that touches a page can work.'
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

  private getPage = async (url?: string, modeArg?: string, maxCharsArg?: number, find?: string): Promise<MacroAgentToolResult> => {
    // the chat's prompts and the auto-attached digest are tuned to the
    // fields list; an agent over the bridge reads pages far more often
    // and gets the tree unless it asks otherwise
    const mode = modeArg === 'tree' || modeArg === 'fields' ? modeArg : (this.params.runOrigin === 'mcp' ? 'tree' : 'fields')
    const wanted = (url || '').trim()
    const target = wanted ? (/^[a-z][a-z0-9+.-]*:/i.test(wanted) ? wanted : `https://${wanted}`) : ''
    if (target && !/^(https?:|file:)/i.test(target)) {
      return { text: `Error: cannot open ${target} — only http(s) and file URLs are supported.`, isError: true }
    }

    // same targeting as runMacro: the bridge session's tab (see comment there)
    let tab = await this.bridgeTab()
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
        return { text: 'Error: no browser tab available to inspect. Pass a url to browser_snapshot to open one.', isError: true }
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

    if (mode === 'tree') return this.getPageTree(tab, maxCharsArg, find)

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: extractPageDigest
    })

    const frames = (results || [])
      .filter((r: any) => r && r.result)
      .map((r: any) => ({ frameId: r.frameId, ...r.result }))

    let text = JSON.stringify(frames.length === 1 ? frames[0] : frames, null, 1)
    // 14000 cut the invoice rows of a billing page mid-list (29); the entries
    // that matter tend to sit at the END of the document order
    if (text.length > 40000) {
      text = text.slice(0, 40000) + '\n... (truncated — use mode "tree" with find, or max_chars)'
    }
    return { text }
  }

  // browser_snapshot {mode:'tree'} — see extractPageTree. Reporting roots come back
  // per frame; cross-origin roots get their refs shifted to a unique range
  // (frameId * 1000) so one page never shows the same number twice.
  private getPageTree = async (tab: any, maxCharsArg?: number, find?: string): Promise<MacroAgentToolResult> => {
    const maxChars = Math.max(2000, Math.min(60000, Number(maxCharsArg) || 12000))
    const maxNodes = Math.max(50, Math.round(maxChars / 30))
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: extractPageTree,
      args: [maxNodes, find || '']
    })
    const roots = (results || []).filter((r: any) => r && r.result)
    if (!roots.length) {
      return { text: 'Error: the page did not answer — it is still loading, or it is a page extensions cannot read (chrome://, the Web Store, a PDF in the viewer, an error page).', isError: true }
    }
    roots.sort((a: any, b: any) => (a.result.isTop ? 0 : 1) - (b.result.isTop ? 0 : 1))

    const parts: string[] = []
    let interactive = 0
    let shadowHosted = 0
    let cut = 0
    for (const r of roots) {
      const t: any = r.result
      shadowHosted += t.shadowHosted || 0
      let lines: string[] = t.lines || []
      if (!t.isTop && r.frameId) {
        const base = r.frameId * 1000
        const rb = await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [r.frameId] }, func: rebasePageRefs, args: [base] }).catch(() => null)
        if (rb && rb[0] && rb[0].result && rb[0].result.rebased) {
          lines = lines.map((l: string) => l.replace(/\[ref=(\d+)\]/g, (_m: string, n: string) => `[ref=${Number(n) + base}]`))
        }
        parts.push(`\n[cross-origin frame ${r.frameId}: ${t.url}]`)
      }
      interactive += t.interactive || 0
      if (t.truncated) cut += Math.max(0, (t.total || 0) - lines.length)
      parts.push(lines.join('\n'))
    }
    const top: any = roots[0].result
    // remembered for the next "what changed" look (26.4)
    this.lastTreeLines = parts.join('\n').split('\n')
    this.lastTreeUrl = top.url || ''
    // a look cut by max_chars is a SHORT baseline: everything past the cut
    // would come back as "new" in the next delta — say so there (30.1)
    this.lastTreeCut = cut
    // find: only the lines that mention the query, with their refs (26.3) —
    // a look-up costs a few lines instead of the whole tree
    let query = String(find || '').trim().toLowerCase()
    // A SMALL page answers a find with the whole tree: the filtered slice
    // invites a chain of look-ups (12 browser_snapshot calls in a row on a
    // 190-node page, each with another word — OPEN-ISSUES 44.6) when the
    // complete tree would have fitted in one answer.
    let smallPageNote = ''
    if (query && cut === 0 && this.lastTreeLines.length <= MacroAgentTools.SMALL_PAGE_LINES) {
      smallPageNote = `(small page: ${this.lastTreeLines.length} nodes, so the WHOLE tree follows instead of only the "${find}" matches — everything is here, no further browser_snapshot look-ups are needed for this page state)\n`
      query = ''
    }
    if (query) {
      const all = this.lastTreeLines
      const hits = all.filter(l => l.toLowerCase().indexOf(query) >= 0)
      const shown = hits.slice(0, 80)
      const shadowHit = shown.some(l => l.indexOf(' (shadow)') >= 0)
      const text = `URL: ${top.url}\nTitle: ${top.title}\n${hits.length} of ${all.length} nodes match "${find}"${hits.length > 80 ? ' (first 80 shown)' : ''}${cut > 0 ? ' — the tree was cut at ' + maxChars + ' chars, raise max_chars for a full search' : ''}:\n` +
        (shown.length ? shown.map(l => l.trim()).join('\n') : '(nothing — try a shorter or different word; browser_snapshot without find shows the whole tree)') +
        (shadowHit ? '\n(nodes marked (shadow) sit inside open shadow roots: css=/xpath= locators cannot reach them — act on those by ref= only)' : '')
      return { text }
    }
    const shadowLine = shadowHosted
      ? `${shadowHosted} node(s) marked (shadow) sit inside open shadow roots: css=/xpath= locators cannot reach them — act on those by ref= only.\n`
      : ''
    const head =
      `URL: ${top.url}\nTitle: ${top.title}\n` + smallPageNote +
      `${interactive} interactive nodes. Refs identify elements, not guaranteed actions: uiv.page.click('ref=12'), uiv.page.fill('ref=7', 'text'), uiv.$('ref=12'). Tables stay compact; use browser_snapshot with find set to a row's text for individual cell refs. Refs reset on navigation; snapshot again after page changes.\n` +
      shadowLine
    let text = head + parts.join('\n')
    if (text.length > maxChars) {
      cut += (text.length - maxChars) / 30
      text = text.slice(0, maxChars)
    }
    if (cut > 0) text += `\n(truncated: about ${Math.round(cut)} more nodes — raise max_chars, up to 60000, to see them)`
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

  // Map a rectangle from the model's current screenshot frame back to raw
  // device pixels in the full capture, and clamp it into the image bounds.
  // The origin term is what makes a magnified region work: after a zoom the
  // model reads coordinates off the magnified picture, and they land on the
  // right screen pixels without the model doing any arithmetic.
  private toRawRect (r: { x: number; y: number; w: number; h: number }) {
    const f = this.lastShot!.scaleFactor
    const W = this.lastShot!.width
    const H = this.lastShot!.height

    let x = this.lastShot!.originX + Math.round(r.x / f)
    let y = this.lastShot!.originY + Math.round(r.y / f)
    let w = Math.round(r.w / f)
    let h = Math.round(r.h / f)

    x = Math.max(0, Math.min(x, W - 1))
    y = Math.max(0, Math.min(y, H - 1))
    w = Math.max(1, Math.min(w, W - x))
    h = Math.max(1, Math.min(h, H - y))

    return { x, y, w, h }
  }

  // THE trap this note exists to close: every screenshot the model sees is
  // SHRUNK to fit its pixel budget, so a point read off the picture is not the
  // point on screen. save_element_image hides that (it converts), which makes
  // the discrepancy invisible right up until the model gives up on finders and
  // types coordinates into the macro by hand. Observed exactly once and it
  // clicked 500px off: the icon sat at 1219,76 in the image and 1730,113 on the
  // screen, the macro ran clean, and it opened the wrong thing.
  // physical capture px -> uiv logical px: the captured display's scale for a
  // desktop shot (physical width over the display's logical width, as the
  // trail picture derives it), the page's devicePixelRatio for a tab shot
  private captureScale (desktop: boolean, physicalWidth: number): number {
    if (desktop) return window.screen && window.screen.width ? physicalWidth / window.screen.width : (window.devicePixelRatio || 1)
    // the tab's ratio as measured at capture time (page zoom included); the
    // panel's is only a fallback for a tab that could not be asked
    if (this.lastShot && !this.lastShot.desktop && this.lastShot.tabDpr) return this.lastShot.tabDpr
    return window.devicePixelRatio || 1
  }

  private screenScaleNote (f: number, toLogical = 1, desktop = true): string {
    if (!f || f >= 0.995) return ''
    const pct = Math.round(f * 100)
    // a TAB capture is in viewport CSS pixels — the frame of uiv.browser.click,
    // uiv.$ rects and browser-scope finders — so the note must not talk about
    // the screen and uiv.desktop.mouse.click there (OPEN-ISSUES 20, seen 2026-09-03)
    if (!desktop) {
      const cssNum = 1 / f / (toLogical && toLogical > 0 ? toLogical : 1)
      const cssMul = cssNum.toFixed(2)
      // shrunk by the display scale only: the picture IS the viewport at
      // (near) 1:1 — a "0.99x too far up" warning would only confuse
      if (Math.abs(cssNum - 1) < 0.03) {
        return ' (This image is at ~1:1 with the tab\'s viewport CSS pixels — the frame uiv.browser.click, uiv.$ rects and browser-scope finders use — because the capture was only shrunk by the display scale. Still act by LOCATOR, never by a pixel estimated off the picture: browser_snapshot gives ref= locators, marks: "elements" numbers what you see here, and save_element_image + uiv.findImage handle anything without a locator.)'
      }
      return ` WARNING — THIS IMAGE IS ${pct}% OF THE REAL TAB, so its pixels are NOT viewport pixels: a point at (x,y) here is about (x*${cssMul}, y*${cssMul}) in the tab's viewport CSS pixels — the frame uiv.browser.click, uiv.$ rects and browser-scope finders use. NEVER copy a coordinate you read off this picture into uiv.browser.click / uiv.page.click, or into a macro in any form — it will land roughly ${cssMul}x too far up and to the left. Act by LOCATOR instead: browser_snapshot gives ref= locators, or use marks: "elements" here and click by the numbered locator; coordinates are safe ONLY where a tool converts them for you, which is save_element_image and save_relative_image (then uiv.findImage locates the target at run time).`
    }
    // uiv coordinates (desktop.click, finder results, {area}) are LOGICAL
    // pixels — physical / display scale — not the physical pixels of the
    // capture. Naming the physical factor alone sent an {area} 25% off on a
    // 125% display (OPEN-ISSUES 18.1); the logical factor is the useful one.
    const scale = toLogical && toLogical > 0 ? toLogical : 1
    const logicalMul = (1 / f / scale).toFixed(2)
    const scaleWord = Math.abs(scale - 1) > 0.01 ? ` (this display runs at ${Math.round(scale * 100)}% scale: uiv coordinates are physical pixels ÷ ${scale.toFixed(2)}, never the physical ×${(1 / f).toFixed(2)})` : ''
    return ` WARNING — THIS IMAGE IS ${pct}% OF THE REAL SCREEN, so its pixels are NOT screen pixels: a point at (x,y) here is about (x*${logicalMul}, y*${logicalMul}) in uiv's coordinate space — the LOGICAL screen pixels that uiv.desktop.mouse.click, finder results and {area} use${scaleWord}. NEVER copy a coordinate you read off this picture into uiv.desktop.mouse.click / uiv.browser.click / XClick, or into a macro in any form — it will land roughly ${logicalMul}x too far up and to the left. Coordinates are safe ONLY where a tool converts them for you, which is save_element_image and save_relative_image. To CLICK something, do not hand-write a position at all: save its image and let uiv.findImage locate it at run time, which is exact and survives the window moving.`
  }

  // x/y/width/height on `screenshot` mean "magnify this region of the last
  // one". Any of the four present counts as a region being intended — hand it
  // over even when incomplete, so the caller reports what is missing instead
  // of silently taking a fresh full screenshot whose coordinate frame is not
  // the one the model was about to read numbers off.
  private regionArg (args: any): any {
    if (!args) return undefined
    const present = ['x', 'y', 'width', 'height'].some((k) => args[k] !== undefined && args[k] !== null)
    return present ? { x: args.x, y: args.y, width: args.width, height: args.height } : undefined
  }

  // Magnification for a view the model has to READ detail from. Small crops
  // are upscaled toward TARGET_LONG_SIDE — a 34 px toolbar icon is simply not
  // judgeable at 34 px — capped at 4x, beyond which upscaling adds pixels but
  // no information. Anything that would blow the per-image budget is scaled
  // down instead. Nearest-neighbour keeps icon edges hard rather than smeared.
  private viewZoom (w: number, h: number): number {
    const TARGET_LONG_SIDE = 900
    const MAX_ZOOM = 4
    const maxPixels = this.screenshotter.MAX_PIXELS

    let z = Math.max(1, Math.min(MAX_ZOOM, TARGET_LONG_SIDE / Math.max(1, Math.max(w, h))))
    if (w * z * h * z > maxPixels) {
      z = Math.sqrt(maxPixels / Math.max(1, w * h))
    }
    return z
  }

  // Resize in place to `zoom`, nearest-neighbour, and report the exact output
  // size (rounding means the drawn-on coordinates must use these numbers).
  private async magnify (image: any, w: number, h: number, zoom: number) {
    const outW = Math.max(1, Math.round(w * zoom))
    const outH = Math.max(1, Math.round(h * zoom))
    if (outW !== w || outH !== h) {
      const { ResizeStrategy } = await import('jimp')
      image.resize({ w: outW, h: outH, mode: ResizeStrategy.NEAREST_NEIGHBOR })
    }
    return { outW, outH }
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

    const relBase64 = Buffer.from(pngBuffer).toString('base64')
    this.params.logMessage(`Saved relative vision image ${fileName} (green anchor + pink target)`, 'user', 'result', {
      dataUrl: `data:image/png;base64,${relBase64}`,
      width: right - left,
      height: bottom - top
    })

    return {
      text: `OK — saved as "${fileName}" (green anchor box + pink target box), shown below. Verify the green box marks the anchor element and the pink box marks the click/move spot — if not, call save_relative_image again with corrected coordinates and the same name to overwrite it. Use it e.g. as: XClickRelative | Target: ${fileName}  or  XMoveRelative | Target: ${fileName}  (append @0.7 to adjust match confidence). The pink box area is clicked at the position relative to wherever the green anchor is found on the page.`,
      base64Image: relBase64
    }
  }

  private screenshot = async (desktop: boolean = false, region?: any, scopeAsked: boolean = false, marks?: string): Promise<MacroAgentToolResult> => {
    // A region only means something against an image the model has ALREADY
    // seen, in the SAME scope. Two ways that fails, and both used to end in a
    // silently useless picture:
    //   - no screenshot yet: the coordinates can only be a guess
    //   - the model asked for a different scope in the same call (typically
    //     scope: "desktop" plus a region, while the last shot was the browser
    //     tab): the coordinates describe a capture that does not exist yet, so
    //     cropping them out of the previous one lands outside it and clamps to
    //     a 1x1 image. Observed in the wild — two wasted turns, then the agent
    //     gave up on the toolbar and guessed.
    // In both cases take the capture the model actually needs and say the
    // region was skipped, so the next call can aim with real coordinates.
    const scopeChanged = scopeAsked && !!this.lastShot && this.lastShot.desktop !== desktop
    const zoomWithoutBase = !!region && (!this.lastShot || scopeChanged)
    if (region && !zoomWithoutBase) {
      return await this.zoomScreenshot(region)
    }

    this.params.logMessage(desktop ? 'Taking desktop screenshot' : 'Taking screenshot', 'user', 'result')

    // always explicit (OPEN-ISSUES 20.3): with cvScope left on "desktop" the
    // capture used to come back as the whole screen while this tool labelled
    // it "the current browser tab" and zoomed/marked it in the tab's frame
    const tabDpr = desktop ? null : await this.tabDevicePixelRatio()
    let raw: ArrayBuffer | null = null
    try {
      raw = await this.params.captureScreenShotFunction({ desktop })
    } catch (e: any) {
      const msg = String((e && e.message) || e)
      // scope: "desktop" with no XModule used to hand the model Chrome's raw
      // "Specified native messaging host not found" (2% of 10.0.182 chats in
      // the 2026-09-06 drop, OPEN-ISSUES 35.5) — name the cause and the way on
      if (desktop && /native messaging host|no such native application/i.test(msg)) {
        return {
          text: `Error: a desktop screenshot needs the Desktop Automation XModule, which is NOT installed on this machine (browser reports: ${msg}). Use the browser scope (no scope argument) — it captures the current tab without the XModule — or the user can install it from https://ui.vision/rpa/x/download`,
          isError: true
        }
      }
      throw e
    }
    if (!raw) {
      return { text: 'Error: failed to take a screenshot.', isError: true }
    }
    // the frame a run would show, for 3 s: tells the person watching which
    // display was just captured (host-excluded from the capture itself)
    if (desktop) flashDesktopBorder(3000)

    // marks: 'elements' — the one markup with a measured benefit for a model
    // choosing a target: NUMBER the visible interactive elements and hand the
    // number -> locator/rect mapping over as text, so the answer is "#7",
    // never an estimated pixel. Drawn on a COPY: lastShot.raw stays the clean
    // capture save_element_image crops from.
    let modelBuffer: any = raw
    let markLegend = ''
    if (marks === 'elements' && !desktop) {
      try {
        let tab = await this.bridgeTab()
        if (!tab) tab = await getPlayTab().catch(() => null)
        if (!tab || !tab.id || !/^(https?:|file:)/.test(tab.url || '')) {
          markLegend = '\n(marks: "elements" skipped — no inspectable web tab.)'
        } else {
          const res: any = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractElementMarks })
          const data = res && res[0] && res[0].result
          const list: any[] = (data && data.marks) || []
          if (!list.length) {
            markLegend = '\n(marks: "elements": no visible interactive elements to number in this viewport.)'
          } else {
            const { Jimp } = await import('jimp')
            const img = await Jimp.read(raw)
            const dpr = (data && data.dpr) || 1
            for (const m of list) {
              const rx = Math.round(m.x * dpr)
              const ry = Math.round(m.y * dpr)
              const rw = Math.max(4, Math.round(m.width * dpr))
              const rh = Math.max(4, Math.round(m.height * dpr))
              this.drawRectOutline(img, rx - 2, ry - 2, rw + 4, rh + 4, 0xffffffff)
              this.drawRectOutline(img, rx, ry, rw, rh, 0xff2020ff)
              this.drawNumberLabel(img, rx, Math.max(0, ry - 20), m.n)
            }
            modelBuffer = await img.getBuffer('image/png')
            markLegend =
              `\nNUMBERED ELEMENTS — the red boxes and their numbers are the ONLY markings; everything else is the real page. Each number resolves to a locator here, so act by locator (uiv.$ / uiv.page.* / uiv.browser.click(uiv.$(locator))) and never by estimating a pixel off the picture: ` +
              list.map((m: any) => `#${m.n} ${m.tag}${m.text ? ` "${m.text}"` : ''} -> ${m.locator}${m.ref ? ` (ref=${m.ref})` : ''} at ${m.x},${m.y} ${m.width}x${m.height} (viewport CSS px)`).join(' | ') +
              (data.truncated ? ' | (more elements exist — only the first 40 in reading order are numbered; zoom or scroll to see others)' : '')
          }
        }
      } catch (e: any) {
        markLegend = `\n(marks: "elements" failed: ${(e && e.message) || e} — plain screenshot below.)`
      }
    } else if (marks && marks !== 'elements') {
      markLegend = `\n(unknown marks value "${marks}" ignored — the only supported value is "elements".)`
    } else if (marks === 'elements' && desktop) {
      markLegend = '\n(marks: "elements" needs the browser scope — a desktop capture has no DOM to number.)'
    }

    const processed: any = await this.screenshotter.processImage(modelBuffer)
    this.lastShot = {
      raw,
      scaleFactor: processed.scaleFactor || 1,
      width: processed.originalWidth,
      height: processed.originalHeight,
      originX: 0,
      originY: 0,
      baseScale: processed.scaleFactor || 1,
      desktop,
      tabDpr,
      takenAt: Date.now()
    }

    const base64Image = Buffer.from(processed.scaledBuffer).toString('base64')
    const what = desktop ? 'the whole desktop/screen' : 'the current browser tab'
    const skippedRegion = zoomWithoutBase
      ? scopeChanged
        ? ` (Your x/y/width/height were SKIPPED: you asked for ${desktop ? 'desktop' : 'browser'} scope, which is a different capture from the last one, so those coordinates did not describe anything yet. Here is the full ${desktop ? 'desktop' : 'browser'} view — read a region off THIS image and call screenshot again with it, and no scope.)`
        : ' (Your x/y/width/height were SKIPPED: a region magnifies the LAST screenshot, and there was none yet — those coordinates could only have been a guess. Here is the full view; call screenshot again with a region read off THIS image.)'
      : ''
    const zoomHint =
      processed.scaleFactor && processed.scaleFactor < 0.9
        ? ` This overview is the full capture shrunk to ${Math.round(processed.scaleFactor * 100)}% to fit — anything small in it (a toolbar icon, a checkbox, one cell) is too coarse here to place a crop box on. Call screenshot again with x/y/width/height around that area FIRST and read the coordinates off the magnified view.`
        : ''
    return {
      text: `Screenshot of ${what} (${processed.scaledWidth}x${processed.scaledHeight} px, coordinates are absolute pixels in this image):${skippedRegion}${zoomHint}${this.screenScaleNote(processed.scaleFactor || 1, this.captureScale(desktop, processed.originalWidth), desktop)}${markLegend}`,
      base64Image
    }
  }

  // Magnify a region of the screenshot already taken — no new capture, so the
  // zoom is guaranteed to show exactly the pixels the overview showed, and
  // nothing can have moved in between. The frame the model reads coordinates
  // from becomes this magnified view (lastShot.origin/scaleFactor), so the
  // save_* tools keep their one and only rule: "coordinates are absolute
  // pixels in the last image you received".
  private zoomScreenshot = async (region: any): Promise<MacroAgentToolResult> => {
    // screenshot() turns a region with no base into a plain capture, so this
    // is unreachable in practice — it stands as the type narrowing
    if (!this.lastShot) {
      return { text: 'Error: take a screenshot first — a region magnifies the last screenshot.', isError: true }
    }

    // An action ran AFTER the capture (click_at / type_at / run_macro): the
    // pixels in lastShot.raw are a screen that may no longer exist — a zoom
    // right after a type_at showed an empty terminal although the command had
    // already run, and the age note alone was skimmed past (OPEN-ISSUES 32.8).
    // Re-capture the same scope first. The model's coordinate frame survives
    // when the new capture has the old geometry (same screen / same viewport):
    // the region it is about to send still describes the same place.
    let refreshed = ''
    if (this.lastShot.takenAt && this.lastRunAt > this.lastShot.takenAt) {
      const prev = this.lastShot
      const ran = this.lastRunTool || 'an action'
      const fresh = await this.screenshot(!!prev.desktop)
      if (!fresh.isError && this.lastShot && this.lastShot.takenAt && this.lastShot.takenAt > prev.takenAt) {
        const sameFrame = this.lastShot.width === prev.width && this.lastShot.height === prev.height
        if (sameFrame) {
          this.lastShot = { ...this.lastShot, scaleFactor: prev.scaleFactor, originX: prev.originX, originY: prev.originY }
          refreshed = ` (${ran} ran after the previous capture, so this is magnified from a FRESH capture taken now — same geometry, your coordinates still apply)`
        } else {
          refreshed = ` (${ran} ran after the previous capture and the ${prev.desktop ? 'screen' : 'viewport'} size changed since — this is magnified from a FRESH capture in its FULL frame; re-read the region off the full view if it looks off)`
        }
      }
    }

    // Forgive the dominant region mistake instead of bouncing it. Field logs
    // (retention.md §12.2/§12.8) show the model constantly sending a region
    // with a valid point but missing / zero / NaN width & height, then burning
    // a turn on "a region needs numeric x, y, width and height". A point IS
    // enough intent to magnify: when x/y are usable, default a crop box around
    // them (a third of the frame's long side, clamped by toRawRect) and say so,
    // rather than erroring. Only a genuinely unusable x/y is unrecoverable.
    const x = Number(region && region.x)
    const y = Number(region && region.y)
    let width = Number(region && region.width)
    let height = Number(region && region.height)
    if (![x, y].every((v) => isFinite(v))) {
      return { text: 'Error: a region needs at least a numeric x and y (the point to magnify), in pixels of the last screenshot.', isError: true }
    }
    let defaultedBox = false
    if (![width, height].every((v) => isFinite(v) && v > 0)) {
      const frameLong = Math.max(
        (this.lastShot.width - this.lastShot.originX) * this.lastShot.scaleFactor,
        (this.lastShot.height - this.lastShot.originY) * this.lastShot.scaleFactor
      )
      const box = Math.max(120, Math.round(frameLong / 3))
      width = box
      height = box
      defaultedBox = true // x/y is then treated as the CENTRE of this box
    }

    const fits = (rect: any, asked: { w: number; h: number }) =>
      rect.w >= 4 && rect.h >= 4 && rect.w >= asked.w / 4 && rect.h >= asked.h / 4

    // when the box was defaulted, x/y is the CENTRE; otherwise x/y is the
    // top-left the model specified
    const boxX = defaultedBox ? x - width / 2 : x
    const boxY = defaultedBox ? y - height / 2 : y
    let r = this.toRawRect({ x: boxX, y: boxY, w: width, h: height })
    let asked = { w: Math.round(width / this.lastShot.scaleFactor), h: Math.round(height / this.lastShot.scaleFactor) }
    let unwound = false

    // A zoomed frame is a trap: every later region is read inside the magnified
    // view, so the moment the model reaches for coordinates it remembers from
    // the FULL screenshot, the region lands outside and clamps to a sliver. In
    // the wild that ended with the agent circling — "the screenshot tool
    // retained the previous zoom frame" — and giving up on the toolbar.
    // So when a region does not fit the magnified view, unwind to the full one
    // and try there before failing. No re-capture: the full pixels are still in
    // lastShot.raw, only the frame changes.
    const zoomed = this.lastShot.originX !== 0 || this.lastShot.originY !== 0
    if (!fits(r, asked) && zoomed) {
      this.lastShot = { ...this.lastShot, originX: 0, originY: 0, scaleFactor: this.lastShot.baseScale }
      r = this.toRawRect({ x: boxX, y: boxY, w: width, h: height })
      asked = { w: Math.round(width / this.lastShot.scaleFactor), h: Math.round(height / this.lastShot.scaleFactor) }
      unwound = true
    }

    if (!fits(r, asked)) {
      const frameW = Math.round((this.lastShot.width - this.lastShot.originX) * this.lastShot.scaleFactor)
      const frameH = Math.round((this.lastShot.height - this.lastShot.originY) * this.lastShot.scaleFactor)
      return {
        text: `Error: the region x=${x} y=${y} ${width}x${height} falls outside the last screenshot, so it collapsed to ${r.w}x${r.h} px. The image you are reading coordinates off is ${frameW}x${frameH} px, origin top-left — the whole region must sit inside that. If you meant a different capture (the whole screen rather than the browser tab), take that screenshot FIRST with scope and no region, then zoom into it.`,
        isError: true
      }
    }

    // A region covering (nearly) the whole frame is not a zoom, it is "show me
    // everything again". Magnifying it produces a sub-1x "zoom" — 2087x1119 at
    // 0.7x was observed, which is just the plain overview wearing a confusing
    // label. Hand back the overview honestly and reset the frame.
    const coversAll = r.w >= this.lastShot.width * 0.9 && r.h >= this.lastShot.height * 0.9
    if (coversAll) {
      this.lastShot = { ...this.lastShot, originX: 0, originY: 0, scaleFactor: this.lastShot.baseScale }
      const { Jimp: J } = await import('jimp')
      const full = await J.read(this.lastShot.raw)
      const shown: any = await this.screenshotter.processImage(await full.getBuffer('image/png'))
      this.params.logMessage('Back to the full view', 'user', 'result')
      return {
        text: `Full view (${shown.scaledWidth}x${shown.scaledHeight} px) — your region covered the whole screenshot, so this is the overview rather than a magnification.${this.screenScaleNote(shown.scaleFactor || 1, this.captureScale(this.lastShot.desktop, this.lastShot.width), this.lastShot.desktop)}`,
        base64Image: Buffer.from(shown.scaledBuffer).toString('base64')
      }
    }

    const zoom = this.viewZoom(r.w, r.h)

    const { Jimp } = await import('jimp')
    const image = await Jimp.read(this.lastShot.raw)
    image.crop({ x: r.x, y: r.y, w: r.w, h: r.h })
    const { outW, outH } = await this.magnify(image, r.w, r.h, zoom)
    const buffer = await image.getBuffer('image/png')

    // the model's coordinate frame is now this view — origin and scale are
    // what toRawRect uses to turn its numbers back into screen pixels
    const fullW = Math.round(this.lastShot.width * this.lastShot.baseScale)
    const fullH = Math.round(this.lastShot.height * this.lastShot.baseScale)
    this.lastShot = { ...this.lastShot, scaleFactor: zoom, originX: r.x, originY: r.y }

    this.params.logMessage(`Zooming into ${r.w}x${r.h} px at ${zoom.toFixed(1)}x`, 'user', 'result')

    // say how old the magnified capture is — and that a macro ran since, when
    // it did: the model otherwise reads a stale dialog as the current screen
    const takenAt = this.lastShot.takenAt || 0
    const ageS = takenAt ? Math.max(0, Math.round((Date.now() - takenAt) / 1000)) : null
    const staleNote = takenAt && this.lastRunAt > takenAt ? ` — ${this.lastRunTool || 'a macro'} RAN AFTER that capture and a fresh one could not be taken, so the screen may have changed; take a fresh screenshot (no region) if this view disagrees with the run's after-picture` : ''
    const ageText = refreshed || (ageS === null ? '' : ` (magnified from the capture taken ${ageS}s ago${staleNote})`)

    return {
      text: `Magnified view${ageText}: ${r.w}x${r.h} screen pixels shown at ${zoom.toFixed(1)}x as a ${outW}x${outH} image.${defaultedBox ? ` (You gave a point but no usable width/height, so a ${width}x${height}-px box was centred on x=${x},y=${y}. Pass width/height next time to frame it yourself.)` : ''}${unwound ? ' (Your region did not fit the magnified view it was sent against, so it was applied to the FULL view instead — that is what you are looking at now.)' : ''} COORDINATES ARE NOW ABSOLUTE PIXELS IN THIS MAGNIFIED IMAGE — save_element_image and save_relative_image convert them back to real screen pixels themselves, and still save the crop at native resolution, so read the box straight off this picture and do NOT scale anything by hand. To go WIDER again just ask for a bigger region (anything that does not fit this view is re-read against the full ${fullW}x${fullH} one), or take a screenshot with no region at all for a fresh full capture.`,
      base64Image: Buffer.from(buffer).toString('base64')
    }
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

    // model coordinates are in the frame it last saw — a downscaled overview
    // or a magnified region; toRawRect resolves both to raw device pixels
    const f = this.lastShot.scaleFactor
    const { x: rx, y: ry, w: rw, h: rh } = this.toRawRect({ x, y, w: width, h: height })

    // toRawRect CLAMPS into the capture, so a box running off its edge comes
    // back as a sliver instead of an error. A 1x34 crop was saved that way, and
    // the match check below then fed a 1-pixel-wide pattern to kantusearch,
    // which scans every position of a template carrying no information — the
    // chat hung there. Refuse the degenerate crop instead: it could never have
    // matched anything, and the model needs to know its box left the picture.
    const MIN_CROP_PX = 8
    const askedW = Math.round(width / f)
    const askedH = Math.round(height / f)
    if (rw < MIN_CROP_PX || rh < MIN_CROP_PX || rw < askedW / 2 || rh < askedH / 2) {
      const frameW = Math.round((this.lastShot.width - this.lastShot.originX) * f)
      const frameH = Math.round((this.lastShot.height - this.lastShot.originY) * f)
      return {
        text: `Error: nothing was saved — the box x=${x} y=${y} ${width}x${height} runs off the edge of the last screenshot, so it collapsed to ${rw}x${rh} px. The image you are reading coordinates off is ${frameW}x${frameH} px with its origin at the top-left, and the whole box has to sit inside that. Re-read the target's position in that image and call again; if the target is not in this view at all, take the screenshot that does contain it first.`,
        isError: true
      }
    }

    const prevCrop = this.savedCrops.get(baseName)
    const isRetry = !!prevCrop
    this.savedCrops.set(baseName, { x: rx, y: ry, w: rw, h: rh, desktop: this.lastShot.desktop })

    // Retry-only directional feedback: an overwrite is usually a CORRECTION,
    // and the one question the context picture cannot settle is "did the box
    // actually MOVE?" — at 20 px two neighbouring toolbar icons look alike, and
    // the model reads its own intention into the picture. Seen in the field
    // (authenticator transcript, 2026-08-11): three consecutive "corrected"
    // saves, every one still centred on the AdBlock icon one slot left of the
    // target. The rects know; say it outright. Same-scope raw px are directly
    // comparable (desktop captures share the screen, tab captures the
    // viewport); distances are reported ×f so they match the coordinates the
    // model is passing right now.
    let moveText = ''
    if (prevCrop && prevCrop.desktop === this.lastShot.desktop) {
      const dcx = rx + rw / 2 - (prevCrop.x + prevCrop.w / 2)
      const dcy = ry + rh / 2 - (prevCrop.y + prevCrop.h / 2)
      const dist = Math.hypot(dcx, dcy)
      const sameSpot = dist <= Math.max(8, Math.min(prevCrop.w, prevCrop.h) / 2)
      const widened = rw * rh > prevCrop.w * prevCrop.h * 1.3
      if (sameSpot && widened) {
        moveText = ` OVERWRITE CHECK: same centre as the previous save, WIDER box — the right correction when the crop was too small to be distinctive. But if the previous crop was centred on the WRONG ELEMENT, widening fixes nothing: the centre itself has to move onto the right element. Be sure which of the two corrections you meant.`
      } else if (sameSpot) {
        moveText = ` OVERWRITE CHECK — THE BOX DID NOT MOVE: its centre sits within ${Math.round(Math.max(1, dist) * f)}px of the previous '${baseName}' save, so these are essentially the SAME pixels again. If this re-save was meant to correct a wrong-element crop, nothing was corrected — you re-cropped the element you already had. Find the element the USER described in the surroundings picture below, read its position off THAT picture, and save again with the box visibly moved onto it.`
      } else {
        const horiz = Math.abs(dcx) >= 4 ? `${Math.round(Math.abs(dcx) * f)}px ${dcx > 0 ? 'RIGHT' : 'LEFT'}` : ''
        const vert = Math.abs(dcy) >= 4 ? `${Math.round(Math.abs(dcy) * f)}px ${dcy > 0 ? 'DOWN' : 'UP'}` : ''
        moveText = ` OVERWRITE CHECK: the box moved ${[horiz, vert].filter(Boolean).join(' and ')} compared with the previous save. Hold that against the correction you intended — if the target sits to the RIGHT of what you had, the move must be RIGHT — then confirm the red box below frames the described element.`
      }
    }

    // Lazy-load jimp (~700 KB) so it stays out of the eager panel bundle
    const { Jimp } = await import('jimp')
    const image = await Jimp.read(this.lastShot.raw)
    image.crop({ x: rx, y: ry, w: rw, h: rh })
    const structureTextRaw = this.cropStructureWarning(image)
    const pngBuffer = await image.getBuffer('image/png')

    // vision search scales matches by the _dpi_xx postfix; the raw capture is
    // in device pixels, so its dpi is 96 * devicePixelRatio
    const dpi = Math.round(96 * (window.devicePixelRatio || 1))
    const fileName = `${baseName}_dpi_${dpi}.png`

    const visionStorage = getStorageManager().getVisionStorage()
    await visionStorage.write(fileName, new Blob([pngBuffer], { type: 'image/png' }))
    store.dispatch(act.listVisions())

    const cropBase64 = Buffer.from(pngBuffer).toString('base64')
    this.params.logMessage(`Saved vision image ${fileName} (${rw}x${rh})`, 'user', 'result', {
      dataUrl: `data:image/png;base64,${cropBase64}`,
      width: rw,
      height: rh
    })

    this.lastCropVerified = false
    const verifyText = await this.verifyCropUniqueness(pngBuffer, rw, rh, rx, ry)
    const cropProven = this.lastCropVerified
    // same rule for the structure heuristic: it predicts a bad match, and the
    // search just measured a good one — the measurement wins
    const structureText = cropProven ? '' : structureTextRaw
    const usage = `Use it e.g. as: uiv.browser.click(uiv.findImage('${fileName}')) in a JS script ({minScore: 0.8} sets the match confidence; uiv.findImages(...)[1] picks the 2nd occurrence), or XClick | Target: ${fileName} in a table macro (@0.8 confidence, #2 second occurrence).`

    // A tiny template is a weak template: few pixels, little structure, and on
    // a row of same-sized controls the ONLY thing telling them apart is what
    // sits either side of them — exactly what a tight crop excludes. Measured
    // against the real engine on two icon rows holding the same three icons in
    // different orders: the lone icon matched 2 spots at 1.00 confidence (a
    // coin flip at runtime), while the same icon cropped WITH its left and
    // right neighbours matched exactly 1. Widening and centring costs nothing
    // at click time, because the finders return the match's CENTRE. Raised
    // here, where the crop's real size is known, rather than as general advice
    // the model has to remember to apply.
    const SMALL_CROP_PX = 50
    const smallCropAdvice =
      !cropProven && rw < SMALL_CROP_PX && rh < SMALL_CROP_PX
        ? ` SIZE WARNING — ${rw}x${rh} px is a very small template. NEVER NARROW A CROP TO CENTRE THE TARGET: widen the short side instead. Cutting a working 109px toolbar crop down to 55px to centre its icon is what made it match Chrome's Extensions button instead — the discarded neighbours were the only thing telling the two apart. Small templates match badly: there is little structure to lock onto, and on a row of same-sized controls (toolbar icons, grid cells, stepper buttons) every neighbour looks just like it, so the runtime can match the wrong one. USUALLY BETTER: save again with the SAME NAME using a WIDER box that keeps this element EXACTLY IN THE CENTRE and takes in its stable neighbours — for a toolbar icon, include the icon to its left AND the one to its right. Nothing else in the macro changes: uiv.findImage returns the match's CENTRE, so the click still lands on this element, and the wider picture is far harder to confuse. Keep it tight ONLY when the surroundings vary between runs (changing text, a badge, an unread counter), because then the wider crop would stop matching.`
        : ''

    // ALWAYS answer with the crop IN CONTEXT — surroundings plus a red box
    // around the saved area. A bare crop cannot be judged: a 34 px toolbar
    // icon looks like every other toolbar icon, so "did I grab the one right
    // of the blue icon?" is unanswerable from the crop alone, and the model
    // used to confirm a wrong crop as correct. The neighbours are the whole
    // evidence, and they are needed on the FIRST save at least as much as on
    // an overwrite — by the second call the wrong file already exists.
    const pad = Math.max(40, Math.round(80 / f), Math.round(0.6 * Math.max(rw, rh)))
    const ctxLeft = Math.max(0, rx - pad)
    const ctxTop = Math.max(0, ry - pad)
    const ctxRight = Math.min(this.lastShot.width, rx + rw + pad)
    const ctxBottom = Math.min(this.lastShot.height, ry + rh + pad)
    const ctxW = ctxRight - ctxLeft
    const ctxH = ctxBottom - ctxTop

    const ctxImage = await Jimp.read(this.lastShot.raw)
    ctxImage.crop({ x: ctxLeft, y: ctxTop, w: ctxW, h: ctxH })
    // magnify BEFORE drawing, so the outline stays a crisp 3 px line instead
    // of being upscaled into a fat blurred band over the element it frames
    const ctxZoom = this.viewZoom(ctxW, ctxH)
    await this.magnify(ctxImage, ctxW, ctxH, ctxZoom)
    this.drawRectOutline(
      ctxImage,
      Math.round((rx - ctxLeft) * ctxZoom),
      Math.round((ry - ctxTop) * ctxZoom),
      Math.round(rw * ctxZoom),
      Math.round(rh * ctxZoom),
      0xff0000ff
    )
    const ctxBuffer = await ctxImage.getBuffer('image/png')

    // The context picture is ctxZoom x RAW pixels, but the model's coordinates
    // are scaleFactor x RAW — so relative to the numbers it actually passes,
    // the picture is blown up by ctxZoom / f, which on a HiDPI overview is
    // ~8x rather than the ~4x a bare "at 4.0x" would suggest. Quoting only the
    // raw figure invites it to measure a correction in picture pixels and
    // apply it to frame coordinates, overshooting by exactly that ratio. So
    // give it the region's bounds IN ITS OWN COORDINATES — then a correction
    // can be stated absolutely, with no arithmetic at all — and the ratio only
    // as a fallback for measuring a distance.
    const viewLeft = Math.round((ctxLeft - this.lastShot.originX) * f)
    const viewTop = Math.round((ctxTop - this.lastShot.originY) * f)
    const viewRight = Math.round((ctxLeft + ctxW - this.lastShot.originX) * f)
    const viewBottom = Math.round((ctxTop + ctxH - this.lastShot.originY) * f)
    const pictureToFrame = ctxZoom / f

    const what = isRetry ? `OK — overwrote "${fileName}"` : `OK — saved as "${fileName}"`
    return {
      text: `${what} (${rw}x${rh} px).${moveText} The picture below shows the SURROUNDINGS of the crop; only the area inside the RED BOX was saved — the rest is orientation and is NOT in the file. Name the element inside the red box to yourself and check it against what the user asked for, including its NEIGHBOURS: picking the element next to the intended one is the common failure here, and it looks perfectly fine in a crop with no surroundings. TO CORRECT IT: this picture covers x ${viewLeft}-${viewRight}, y ${viewTop}-${viewBottom} in the SAME coordinates you pass to this tool, so work out where the box should sit in that range and state it directly — do not measure pixels in the picture, which is blown up ${pictureToFrame.toFixed(1)}x relative to those coordinates (divide by that if you do measure). Then call save_element_image again with THE SAME NAME (a new name leaves the wrong file behind and starts the guessing over).${smallCropAdvice}${structureText}${verifyText} ${usage}`,
      base64Image: Buffer.from(ctxBuffer).toString('base64')
    }
  }

  // The local image search matches on STRUCTURE — edges, corners, glyph and
  // icon outlines. A crop of near-uniform colour gives it nothing to lock
  // onto, because a flat patch correlates perfectly at EVERY offset inside any
  // larger flat region. Measured against the real kantusearch engine on a
  // controlled page (a row of identical flat blocks plus one with a ring):
  //
  //   solid 60x60 block            91 matches @0.6, 5 @0.95 (all scoring 1.00)
  //   flat 40x40 inside that block 196 matches @0.6, 22 @0.95 (ten at 1.00)
  //   same block + a white ring    1 match at every threshold
  //   smooth gradient              11 @0.6, 2 @0.95 — varies, but no hard detail
  //
  // One structural feature collapsed 91 candidates to 1. The failure is
  // invisible in the picture — a plain crop looks perfectly correct — and only
  // surfaces later as a macro clicking the wrong place, so measure it here
  // rather than hoping the model notices.
  private cropStructureWarning (image: any): string {
    try {
      const { width, height, data } = image.bitmap
      if (width < 2 || height < 2) return ''

      const lum = (i: number) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const EDGE_STEP = 12 // luminance jump that counts as an edge, out of 255

      let sum = 0
      let sumSq = 0
      let edges = 0
      let n = 0

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          const l = lum(i)
          sum += l
          sumSq += l * l
          n++
          const rightEdge = x + 1 < width && Math.abs(l - lum(i + 4)) > EDGE_STEP
          const downEdge = y + 1 < height && Math.abs(l - lum(i + width * 4)) > EDGE_STEP
          if (rightEdge || downEdge) edges++
        }
      }

      const mean = sum / n
      const stdDev = Math.sqrt(Math.max(0, sumSq / n - mean * mean))
      const edgePct = (edges / n) * 100

      // Edge DENSITY is the signal, not contrast: a smooth gradient has huge
      // brightness variation and still matches terribly, because the
      // correlation peak it produces is broad and slides. Low-contrast crops
      // full of fine detail (grey-on-grey text) score high here and are
      // correctly left alone. The absolute count is the second chance — a
      // large mostly-flat crop containing one real feature (a small label in
      // a wide empty panel) has a low density but plenty to lock onto.
      const EDGE_PCT_MIN = 4
      // 80, not 150: a two-letter label ("OK", "Go") on a flat button yields
      // ~130 edge pixels and matches perfectly well, so a higher floor would
      // fire the warning on one of the commonest good crops there is. The
      // genuinely unmatchable cases measured near zero.
      const EDGE_COUNT_MIN = 80
      if (edgePct >= EDGE_PCT_MIN || edges >= EDGE_COUNT_MIN) return ''

      return ` STRUCTURE WARNING: this crop has almost no structure to match on — only ${edgePct.toFixed(1)}% of its pixels sit on an edge (${edges} in total; brightness varies by ${stdDev.toFixed(0)}/255). The local image search locks onto edges, corners, outlines and text, so a flat patch of near-uniform colour — or a smooth gradient, which varies but has no hard detail — gives it nearly nothing: the score wobbles between runs and it can match wherever that tone appears. Save again with THE SAME NAME using a box that takes in real detail near the target — a border, a label, an icon outline, the neighbouring controls — and keep the intended element EXACTLY IN THE CENTRE so the click still lands on it.`
    } catch (e) {
      // advisory only — never fail a successful save over it
      return ''
    }
  }

  // run the saved crop through the same kantusearch engine uiv.findImage
  // and XClick will use, against the screenshot it was cut from.
  //
  // This answers ONE question — will the runtime find these pixels again, and
  // in one place or several. It cannot answer whether the RIGHT element was
  // cropped: the wrong icon matches exactly one spot just as cleanly as the
  // right one. The wording below has to keep those apart, because a confident
  // "unambiguous" next to a wrong crop reads as confirmation and ends the
  // model's checking right where it should have started.
  private verifyCropUniqueness = async (pngBuffer: Buffer, cropW: number, cropH: number, cropX: number = -1, cropY: number = -1): Promise<string> => {
    try {
      // Belt and braces with the degenerate-crop guard in saveElementImage: a
      // sliver of a pattern carries no information, so kantusearch scans every
      // position of the screen for it and the panel stops responding. Never
      // hand it one, whatever produced it.
      if (cropW < 8 || cropH < 8) return ''
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
      // THE decisive check: does the best match land where the crop was cut
      // from? uiv.findImage clicks the highest scorer, so if that is somewhere
      // else, the saved image points at the wrong thing — no matter how good
      // its score is. Seen in the wild: a 55px toolbar crop scored best on
      // Chrome's Extensions button ~49px away, the macro ran clean, and it
      // opened the wrong menu. Counting matches never caught it; comparing
      // positions does, and it is free.
      const best = cropX >= 0 ? results.slice().sort((a: any, b: any) => b.matched.score - a.matched.score)[0] : null
      if (best) {
        const dx = best.matched.offsetLeft - cropX
        const dy = best.matched.offsetTop - cropY
        const off = Math.round(Math.sqrt(dx * dx + dy * dy))
        if (off > Math.max(6, Math.min(cropW, cropH) / 2)) {
          return ` STOP — THIS IMAGE POINTS AT THE WRONG PLACE: it was cut from ${cropX},${cropY}, but its BEST match on the page is ${off}px away at ${best.matched.offsetLeft},${best.matched.offsetTop} (score ${best.matched.score.toFixed(2)}). uiv.findImage and XClick act on the highest-scoring match, so this file would drive the macro to that other spot, not to the element you cropped. The crop is not distinctive enough to tell the two apart. Save again with THE SAME NAME using a WIDER box — extend it to take in more surrounding structure — and do NOT simply shift or shrink it.`
        }
        // the crop demonstrably resolves to its own element: record that, so
        // the size/structure heuristics below stay quiet about a crop the
        // evidence says already works
        this.lastCropVerified = true
      }

      const n = results.length
      if (n === 1) {
        return ` Match check: these pixels are findable and occur exactly once on the page (confidence ${results[0].matched.score.toFixed(2)}), so at RUNTIME the command will act on a single unambiguous spot. This says NOTHING about whether you cropped the element the user asked for — a crop of the wrong element passes this check just as cleanly. Only the picture answers that.`
      }
      if (n === 0) return '' // cannot really happen for a same-screenshot crop; stay silent rather than confuse the model
      // The search ran over the FULL capture, so match positions come back in
      // raw device pixels — but the model reads coordinates in its current
      // frame, which after a zoom is offset by origin as well as scaled. Skip
      // the origin term and every reported centre is wrong the moment the
      // model has zoomed. Matches outside the zoomed view legitimately land
      // outside the image bounds (negative, or past its width), which is
      // information rather than an error: it says the lookalike is elsewhere
      // on screen, so it is called out instead of clamped away.
      const f = this.lastShot!.scaleFactor
      const ox = this.lastShot!.originX
      const oy = this.lastShot!.originY
      const zoomed = ox !== 0 || oy !== 0
      const toFrame = (rawX: number, rawY: number) => `${Math.round((rawX - ox) * f)},${Math.round((rawY - oy) * f)}`
      const spots = results
        .slice(0, 4)
        .map((r) => toFrame(r.matched.offsetLeft + r.matched.width / 2, r.matched.offsetTop + r.matched.height / 2))
        .join(' / ')
      const frameNote = zoomed
        ? ' (coordinates are in your current MAGNIFIED view; a match that sits outside it reads as negative or past the image edge, meaning the lookalike is elsewhere on the screen)'
        : ''
      const scores = results.map((r) => r.matched.score).sort((a, b) => b - a)
      const scoresText = scores
        .slice(0, 4)
        .map((s) => s.toFixed(2))
        .join(', ')
      const where = `centers at ${spots}${n > 4 ? ', ...' : ''}${frameNote}; scores ${scoresText}${n > 4 ? ', ...' : ''}`
      // Without a #n index the runtime clicks the HIGHEST-SCORING match, and the
      // crop was cut from this very screenshot, so the true spot scores ~1.0.
      // Multiple matches are only a problem when a lookalike scores nearly the
      // same — then rendering noise at runtime could flip the ranking.
      const runnerUp = scores[1]
      if (runnerUp <= 0.97) {
        return ` Match check: the image matches ${n} spots at confidence ${minSimilarity} (${where}), but the spot it was cut from is the clear best match and the command clicks the highest-scoring match — so no re-crop is needed FOR MATCHING (this check is about findability only; whether it is the right element is still yours to read off the picture). (Only if you need a different occurrence, append #n to the target — matches above the confidence are then counted top-to-bottom, left-to-right.)`
      }
      return ` WARNING: the image matches ${n} spots with near-identical scores (${where}, at confidence ${minSimilarity}) — the page contains visually identical copies of this crop, so best-match selection may click the wrong one. Either append #n to the target to pick the n-th occurrence (counted top-to-bottom, left-to-right among matches above the confidence), or save again with the same name using a crop that includes some visually UNIQUE surroundings — on repeating grids, merely enlarging the crop does not help.`
    } catch (e) {
      // verification is best-effort — never fail a successful save over it
      return ''
    }
  }
}
