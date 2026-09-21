import { reportUsage } from '@/services/usage'
import Anthropic from '@anthropic-ai/sdk'
import { getXModuleVersion } from '@/services/xmodules2/routing'

import Ext from '@/common/web_extension'
import { store } from '@/redux'
import csIpc from '@/common/ipc/ipc_cs'
import { toJSONString } from '@/common/convert_utils'
import { isFirefox } from '@/common/dom_utils'
import { isMac, isWindows } from '@/common/ts_utils'
import { STARTER_SCRIPT } from '@/config/preinstall_js_scripts'
import { delayMs } from '@/common/utils'
import { chatCompletionsUrl } from '@/common/uiv_link'
import { getXModule2API } from '@/services/xmodules2/native'
import { isXModuleOcrAvailable } from '@/modules/ocr'
import { NO_ANTHROPIC_API_KEY_ERROR } from '../anthropic'
import { getAIProviderConfig } from '../computer_use/service'
import { ensureAllUrlsPermission } from '@/common/firefox_permission'
import { isFreeTierConsentPending, mapUIVisionFreeTierError, uivInstallHeader } from '../uivision_free_tier'
import { openrouterReasoningParam, isReasoningMandatoryError, markReasoningMandatory } from '../openai_compatible/reasoning'
import { ComputerUseMessageType } from '../computer_use/model'
import { MACRO_AGENT_TOOLS, MacroAgentTools, MacroAgentToolResult, LoggedImage, isUntouchedPreinstallDemo, parseToolCallArgumentsLenient, describeJsonParseError } from './tools'
import { MACRO_AGENT_SYSTEM_PROMPT } from '@macro-agent-prompt'

// Agent that builds and fixes Ui.Vision macros from the AI chat tab.
// It replaces the old computer-use chat: instead of clicking coordinates on
// screenshots, the model edits the macro in the editor, runs it through the
// real player, reads the logs, and iterates. Works with all configured
// providers (Anthropic native tools, OpenAI-compatible function tools).

// The built-in system prompt. Users can override it in Settings > AI (stored
// in config.aiMacroAgentSystemPrompt; empty = use this default, so prompt
// improvements shipped in updates reach everyone who didn't customize it).
// The default system prompt is resolved at BUILD time via the
// @macro-agent-prompt alias: prompt_full.PRIVATE.ts when present (private dev
// repo), prompt_basic.ts otherwise (public open-source copy, and any build
// with PUBLIC_BUILD=1 — which is how store releases are made, so the shipped
// bundle matches the open repo). On the Ui.Vision tier the server serves the
// full prompt either way via the UIV-PROMPT stub below; own-key providers and
// the E712 fallback use whatever this build embeds.
export const DEFAULT_MACRO_AGENT_SYSTEM_PROMPT = MACRO_AGENT_SYSTEM_PROMPT

// Server-served prompt contract version (HANDOVER-server-prompt-extension.md
// in the uivision-ai-proxy repo). On the Ui.Vision tier with the default
// prompt, requests carry a "UIV-PROMPT: v<n>" stub instead of the full ~114 KB
// system prompt and the literal string "UIV-TOOLS" instead of the tool
// schemas; the proxy expands both from its prompts/ files. Bump the version
// ONLY when the tool contract or prompt STRUCTURE changes (new/removed tool,
// changed schema) — wording-only prompt changes are a server-side file edit
// and need no bump. Release rule: regenerate and deploy the proxy's files
// (make-prompts.js) BEFORE shipping an extension release that changes
// DEFAULT_MACRO_AGENT_SYSTEM_PROMPT or MACRO_AGENT_TOOLS.
const UIV_PROMPT_STUB_VERSION = 1

// effective system prompt: the user's override from Settings > AI, or the
// default — plus the runtime environment (browser + XModule state), so the
// model knows e.g. that uiv.browser.* cannot work here on Firefox, and whether
// XClick/XType would run or fail with Error #301
// Firefox has no debugger API, so the uiv.browser.* tier does not exist there
// and set_macro refuses a script that calls it. The Environment sentence at
// the END of the prompt said so — and 52 of 117 Firefox installs in the 09-09
// proxy drop still got the refusal, about 6 times per chat, the model
// re-offending inside the same conversation (OPEN-ISSUES 44.1). So on Firefox
// the prompt gets a banner at the TOP and the uiv.browser.* bullet is replaced;
// the tool descriptions stop naming uiv.browser.click. The proxy applies the
// same overlay to the prompt it serves (aiproxy.js applyFirefoxOverlay, keyed
// on the Environment tail the client appends); this one covers own-key
// providers, where the extension sends the full prompt itself.
export const FIREFOX_PROMPT_BANNER =
  'THIS INSTALL RUNS FIREFOX — uiv.browser.* DOES NOT EXIST HERE. Firefox gives extensions no debugger API, so uiv.browser.click / type / hover / press / down / up / move are refused by set_macro and create_macro before the script runs. ' +
  'Clicks are uiv.page.click, typing is uiv.page.fill (keys as text: uiv.page.fill(field, \'${KEY_ENTER}\')), and real OS input is uiv.desktop.* (needs the XModule). Wherever this prompt mentions uiv.browser.*, read uiv.page.* instead.\n\n'
const FIREFOX_BROWSER_BULLET = '$1NOT AVAILABLE IN FIREFOX (this install): every uiv.browser.* call is refused before the script runs — use uiv.page.* (synthetic DOM events) or uiv.desktop.* (XModule) instead.'
export const applyFirefoxPromptOverlay = (prompt: string, firefox: boolean = isFirefox()): string => {
  if (!firefox) return prompt
  return FIREFOX_PROMPT_BANNER + prompt.replace(/^( {2}\* uiv\.browser\.\* — ).*$/m, FIREFOX_BROWSER_BULLET)
}
export const applyFirefoxToolOverlay = <T,>(defs: T, firefox: boolean = isFirefox()): T =>
  firefox ? JSON.parse(JSON.stringify(defs).replace(/uiv\.browser\.click/g, 'uiv.page.click')) : defs
const agentToolDefs = () => applyFirefoxToolOverlay(MACRO_AGENT_TOOLS)

const getSystemPrompt = (xmoduleStatus: string, localOcrAvailable: boolean): string => {
  const override = (store.getState().config.aiMacroAgentSystemPrompt || '').trim()
  const prompt = applyFirefoxPromptOverlay(override.length > 0 ? override : DEFAULT_MACRO_AGENT_SYSTEM_PROMPT)
  // The AI writes JS SCRIPTS, always — for new macros AND for fixes. In-format
  // table fixes generated user support and bug reports (fixes gone wrong), so
  // a table macro that needs fixing is converted to a script first; the
  // copy-on-write in set_macro keeps the user's original table file intact.
  // The classic command reference stays in the prompt above — it is what the
  // agent needs to READ the table macro it is converting, and uiv.run needs
  // the command list. If table generation is ever wanted back, this is the one
  // place that decides it.
  const jsFirstNote = '\n\nMACRO FORMAT — NOT A CHOICE: ALWAYS produce JS script macros. Never produce a command table ({"Commands": [...]}), whatever the "when script, when table" rule above says, and not even when the user asks for one — reply that the assistant writes JS scripts and build the script. HOW TO PASS IT: use the "script" parameter of create_macro/set_macro (with "name" on create_macro) and write the program as PLAIN JAVASCRIPT — real newlines, real quotes, no JSON escaping of any kind. Do NOT wrap it in macro_json: that makes you escape the program into a JSON string by hand, and a selector like css=[aria-label="Go"] or xpath=//a[contains(@id, \'x\')] then breaks the JSON. macro_json exists for command tables only. This includes FIXES: when the macro to fix or extend is a command-table macro, convert it to a JS script and fix it there in the same set_macro call — the change is saved as a new copy, the original table file is never modified; recommend the conversion in your summary (script fixes are far more reliable) rather than asking permission first. Preserve the targeting TECHNIQUE while converting (visual stays visual — see PRESERVE THE TECHNIQUE). The command reference above is what you need to READ the table macro you are converting, and for uiv.run(command, target, value), which reaches every classic command from inside a script. FORMAT the script as readable multi-line JavaScript — one statement per line, normal indentation — NEVER as a minified one-liner: it is what the user reads and edits in the editor, and a single-line script is rejected by set_macro/create_macro.'

  // OCR reader guidance for the AUTHOR (see the prompt's OCR section). The
  // engine is NEVER switched at runtime — a macro runs with exactly the
  // configured/requested engine — so the best available reader is suggested
  // HERE, at creation time, for the agent to write into the macro.
  const cfg = store.getState().config || {}
  const ocrEngine = cfg.ocrEngine
  const cloudHint = cfg.ocrSpaceApiKey
    ? "an OCR.Space API key IS configured — when local OCR reads badly, use {engine: 'ocrspace_engine2'} (finders/clicking) or {engine: 'ocrspace_engine3'} (best pure-text reads; x/y less accurate — coordinate fallback only when engine2 fails); both auto-detect the text language"
    : "NO OCR.Space API key configured — when local OCR reads badly (not even the anchor-word + uiv.offset trick helps), use the AI provider as OCR engine ({engine: 'aiprovider'} — integrated with findText/read like a cloud engine, billable, approximate coordinates), or uiv.ai.ask with a screenshot for pure reads; also mention that a FREE key from https://ocr.space/ocrapi entered under Settings > OCR is the stronger dedicated OCR"
  // JS scripts NAME the reader — engine numbers are classic-macro syntax and
  // are refused outright by uiv.ocr.* (resolveOcrEngine). This line is where
  // the agent learns which reader to write, so it must speak in names only:
  // a number leaking in here becomes a macro that fails on its first OCR step.
  const osLocalName = isMac() ? 'builtin_mac' : 'builtin_win'
  const engineName = ({ 98: 'builtin', 99: osLocalName, 90: 'aiprovider', 1: 'ocrspace_engine1', 2: 'ocrspace_engine2', 3: 'ocrspace_engine3' } as any)[ocrEngine] || 'builtin'
  const ocrNote = [1, 2, 3].includes(ocrEngine)
    ? `default reader is the OCR.Space cloud ('${engineName}')${ocrEngine === 1 ? " — 'ocrspace_engine1' reads worst of the cloud engines: write {engine: 'ocrspace_engine2'} (clicking) or {engine: 'ocrspace_engine3'} (pure reads) into OCR steps instead; both auto-detect the text language" : ''}`
    : ocrEngine === 90
      ? `default reader is the AI provider ('aiprovider' — billable, approximate word coordinates); the local OS reader ({engine: '${osLocalName}'}) is ${localOcrAvailable ? 'AVAILABLE — prefer it for finders/clicking (free, instant, exact boxes)' : 'not installed'}; ${cloudHint}`
      : `default reader is '${engineName}' (local); the OS reader ({engine: '${osLocalName}'}) is ${localOcrAvailable ? `AVAILABLE — write {engine: '${osLocalName}'} into EVERY uiv.ocr.* step you generate, browser scope included, as the DEFAULT, not as an escalation: it reads UI text (light-on-dark labels, small glyphs, autocomplete dropdowns) better than the cross-platform 'builtin' engine, and a macro that starts on the weaker reader usually comes back to you as 'OCR found nothing'. Omit the engine only when the XModule is absent` : 'not installed'}; ${cloudHint}`

  // OS matters for generated macros: modifier keys (KEY_CMD vs KEY_CTRL),
  // file-path conventions, and which XModule installer to recommend.
  // CONTRACT: the proxy parses the Environment line below for per-install
  // metrics (browser/OS/XModule) — see HANDOVER-env-logging.md in the
  // uivision-ai-proxy repo before rewording anything up to "OCR:".
  const osName = isWindows() ? 'Windows' : isMac() ? 'macOS' : 'Linux'
  return `${prompt}${jsFirstNote}\n\nEnvironment: the extension is running in ${isFirefox() ? 'Firefox' : 'a Chromium-based browser (Chrome/Edge)'} on ${osName}. RealUser Simulation XModule (needed for uiv.desktop.* and the classic X commands): ${xmoduleStatus}. OCR: ${ocrNote}.`
}

// uiv.desktop.* (and the classic X command family) needs the Desktop
// Automation native app (xmodule2). Probed once per chat turn (cheap
// native-messaging ping) so the prompt's Environment line reflects the
// current state.
const detectXModuleStatus = async (): Promise<string> => {
  try {
    const version = await Promise.race([
      getXModule2API().getVersion(),
      delayMs(3000).then(() => null as any)
    ])
    if (!version) return 'status unknown (detection timed out)'
    return `installed (version ${version || 'unknown'})`
  } catch (e) {
    return 'NOT installed'
  }
}

export interface MacroAgentServiceParams {
  // the optional 4th argument carries a vision image a tool just created, so
  // the chat can show the crop and not just its file name
  logMessage: (
    message: string,
    userOrAi?: ComputerUseMessageType,
    isActionOrResult?: 'action' | 'result',
    image?: LoggedImage
  ) => void
  shouldStop: () => boolean
  captureScreenShotFunction: (opts?: { desktop?: boolean }) => Promise<ArrayBuffer>
}

export class MacroAgentService {
  private tools: MacroAgentTools
  // conversation history, in the currently-configured provider's format
  private messages: any[] = []
  // Bumped by every run() and by createNewChat(). Each run captures its own
  // generation and bails after every await if it no longer matches — so a
  // turn abandoned by "new chat" (or orphaned by a newer run) cannot log
  // into the fresh conversation or push into the just-cleared history.
  private generation = 0
  private samplingKey = ''
  // XModule install state shown in the system prompt's Environment line,
  // refreshed at the start of every run()
  private xmoduleStatus = 'status unknown'
  private localOcrAvailable = false

  constructor(private params: MacroAgentServiceParams) {
    this.tools = new MacroAgentTools({
      logMessage: params.logMessage,
      shouldStop: params.shouldStop,
      captureScreenShotFunction: params.captureScreenShotFunction,
      askFirefoxHostPermission: ensureAllUrlsPermission
    })
  }

  createNewChat = () => {
    this.generation++
    this.messages = []
    // the abandoned turn skips its own unmark (it lost the generation), so
    // the tab marker is cleared here
    csIpc.ask('PANEL_AI_TAB_MARK', { marked: false }).catch(() => {})
  }

  private getMaxLoops(): number {
    return 50
  }

  // Context the model gets along with the user's request: current macro + last logs
  private buildInitialContext(prompt: string): string {
    const state = store.getState()
    const { editing } = state.editor
    const src = editing.meta && editing.meta.src
    const name = src && src.name ? src.name : 'Untitled'

    const macroText = (() => {
      const script = (editing as any).script
      // the untouched starter tutorial (auto-seeded into an empty editor in
      // JS-first mode) is not user content — don't let the model anchor on it
      if (!src && typeof script === 'string' && script === STARTER_SCRIPT) {
        return '(the editor shows the untouched starter tutorial script — treat it as empty)'
      }
      // JS script macro: the program lives in `script`, Commands stays empty
      if (typeof script === 'string' && script.length) {
        return toJSONString({ name, commands: [], script } as any, { ignoreTargetOptions: true })
      }
      return editing.commands && editing.commands.length
        ? toJSONString({ name, commands: editing.commands }, { ignoreTargetOptions: true })
        : '(the editor is empty — no macro loaded)'
    })()

    // an untouched preinstalled demo was almost certainly auto-selected as
    // "first macro in the tree", not chosen by the user — say so, or the
    // model anchors on it for unrelated requests (the tic-tac-toe incident)
    const macroHeader = isUntouchedPreinstallDemo(editing)
      ? `Macro currently in the editor ("${name}") — NOTE: this is a PREINSTALLED DEMO macro the user has not edited; it was most likely auto-selected, not deliberately opened. Unless the user's request refers to it, it is unrelated context — do not run, modify or borrow from it:`
      : `Macro currently in the editor ("${name}"):`

    const logTail = (state.logs || [])
      .slice(-15)
      .map((l: any) => `[${l.type}] ${l.text}`)
      .join('\n')

    return [
      `User request: ${prompt}`,
      '',
      macroHeader,
      macroText,
      '',
      logTail ? `Most recent log lines:\n${logTail}` : '(no recent log entries)'
    ].join('\n')
  }

  run = async (prompt: string): Promise<void> => {
    // this run's generation; also instantly orphans any earlier run that is
    // somehow still in flight (stopped-but-awaiting-API turns must not revive
    // when a new send flips the panel's running flag back to true)
    const gen = ++this.generation
    const providerConfig = getAIProviderConfig()

    if (providerConfig.provider === 'uivision' && isFreeTierConsentPending(store.getState().config)) {
      throw new Error('One-time AI setup needed: choose the free Ui.Vision AI in the AI chat, or pick a provider in Settings > AI.')
    }
    if (providerConfig.provider === 'anthropic' && !providerConfig.apiKey) {
      throw new Error(NO_ANTHROPIC_API_KEY_ERROR)
    }
    if (providerConfig.provider === 'openrouter' && !providerConfig.apiKey) {
      throw new Error('No OpenRouter API key set. Please enter it in Settings > AI.')
    }
    if (providerConfig.provider === 'local' && !providerConfig.model) {
      throw new Error('No local AI model name set. Please enter it in Settings > AI.')
    }

    // provider/model switch invalidates the stored history format
    const key = `${providerConfig.provider}|${providerConfig.model}|${providerConfig.baseURL}`
    if (key !== this.samplingKey) {
      this.messages = []
      this.samplingKey = key
    }

    const isFirstTurn = this.messages.length === 0
    const userText = isFirstTurn ? this.buildInitialContext(prompt) : prompt

    this.xmoduleStatus = await detectXModuleStatus()
    // Local OCR availability is authoring-time info: the Environment line
    // tells the agent to WRITE {engine: 'xmodule'} into OCR steps when available —
    // the engine is never switched automatically at runtime
    this.localOcrAvailable = await isXModuleOcrAvailable().catch(() => false)

    if (gen !== this.generation) return

    // orange marker (tab group + border) on the browser tab for the whole
    // agent turn — same orange as the AI action text in the chat
    csIpc.ask('PANEL_AI_TAB_MARK', { marked: true }).catch(() => {})

    try {
      if (providerConfig.provider === 'anthropic') {
        await this.runAnthropic(providerConfig.apiKey, providerConfig.model, userText, gen)
      } else {
        await this.runOpenAICompatible(providerConfig.baseURL, providerConfig.apiKey, providerConfig.model, userText, providerConfig.label, providerConfig.provider, gen)
      }
    } catch (error: any) {
      // an abandoned turn's failure is nobody's news — surfacing it would put
      // an error from the OLD chat into the NEW one
      if (gen !== this.generation || this.params.shouldStop()) return
      // FIRST, because it is the only branch that reads the proxy's error
      // CODE: E711 is a 401 and the generic "invalid API key" text below would
      // otherwise bury the one thing that matters — the key was replaced and
      // the new one has to be entered.
      const freeTierMessage = mapUIVisionFreeTierError(error?.message || '', providerConfig.tier === 'pro')
      if (freeTierMessage) {
        throw new Error(freeTierMessage)
      }
      if (error && error.message && error.message.includes('Missing Authentication header')) {
        // OpenRouter's 401 when the Bearer token parses as empty — in practice
        // a paste artifact (whitespace or "Sk-" capitalization) in the key
        throw new Error('The API key looks malformed (extra spaces or a capitalized "Sk-" prefix?). Please re-enter it in Settings > AI.')
      }
      if (error && error.message && (error.message.includes('invalid x-api-key') || error.message.includes('HTTP 401'))) {
        throw new Error('Invalid API key. Please re-enter the API key, and save it.')
      }
      throw new Error(`E353: ${providerConfig.label} API returned error: ${error.message}`)
    } finally {
      // a newer run owns the marker now — only the current run may clear it
      if (gen === this.generation) {
        csIpc.ask('PANEL_AI_TAB_MARK', { marked: false }).catch(() => {})
      }
    }
  }

  // ---------------------------------------------------------------- Anthropic

  private runAnthropic = async (apiKey: string, model: string, userText: string, gen: number): Promise<void> => {
    const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

    const tools = agentToolDefs().map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters
    }))

    this.backfillMissingToolResultsAnthropic()
    // the backfill may have ended the history on a stub user message, and
    // Anthropic requires strictly alternating roles — merge instead of
    // pushing a second consecutive user message
    const lastMsg: any = this.messages[this.messages.length - 1]
    if (lastMsg && lastMsg.role === 'user' && Array.isArray(lastMsg.content)) {
      lastMsg.content.push({ type: 'text', text: userText })
    } else {
      this.messages.push({ role: 'user', content: [{ type: 'text', text: userText }] })
    }
    this.trimHistoryToBudget()
    this.pruneOldImages()

    for (let loop = 0; loop < this.getMaxLoops(); loop++) {
      if (this.params.shouldStop()) return

      // cache the growing history: strip old markers, mark the newest block
      const messagesWithCache = this.messages.map((m: any) => ({
        ...m,
        content: Array.isArray(m.content)
          ? m.content.map((block: any) => {
              if (block && typeof block === 'object' && block.cache_control) {
                const { cache_control, ...rest } = block
                return rest
              }
              return block
            })
          : m.content
      }))
      const lastMessage = messagesWithCache[messagesWithCache.length - 1]
      if (lastMessage && Array.isArray(lastMessage.content) && lastMessage.content.length > 0) {
        const lastIndex = lastMessage.content.length - 1
        const lastBlock = lastMessage.content[lastIndex]
        if (lastBlock && typeof lastBlock === 'object') {
          lastMessage.content[lastIndex] = { ...lastBlock, cache_control: { type: 'ephemeral' } }
        }
      }

      this.params.logMessage(`Calling API (Anthropic ${model})`, 'status')

      // 16384, not 4096: a set_macro carrying a real script IS the output.
      // The 27KB accuracy-range demo is ~8k tokens, so under the old 4096 cap
      // every faithful refactor truncated at max_tokens — which non-streaming
      // Anthropic delivers as a tool_use with EMPTY input. Opus retried the
      // "empty" call ten times before giving up (benchmark T9, 2026-08-13).
      const response = await anthropic.messages.create({
        model,
        max_tokens: 16384,
        system: [{ type: 'text', text: getSystemPrompt(this.xmoduleStatus, this.localOcrAvailable), cache_control: { type: 'ephemeral' } } as any],
        tools: tools as any,
        messages: messagesWithCache
      })

      // stopped or abandoned while waiting: discard the whole response.
      // Nothing of it has been pushed yet, so the history stays consistent
      // (it simply ends at the user message).
      if (gen !== this.generation || this.params.shouldStop()) return

      const usage: any = (response as any).usage
      const cachedTokens = usage?.cache_read_input_tokens || 0
      const cachedText = cachedTokens > 0 ? ` / ${cachedTokens} cached` : ''
      this.params.logMessage(`API call complete (tokens: ${usage?.input_tokens ?? '?'} in${cachedText} / ${usage?.output_tokens ?? '?'} out)`, 'status')

      if (response.content?.length) reportUsage('ai', 'own-key')
      this.messages.push({ role: 'assistant', content: response.content })

      for (const block of response.content) {
        if ((block as any).type === 'text' && (block as any).text) {
          this.params.logMessage((block as any).text, 'ai')
        }
      }

      // A response cut off at the token limit delivers its unfinished
      // tool_use with empty input — executing that produces a misleading
      // "requires script" error and the model re-sends the same doomed call.
      // Name the real problem instead, visibly and to the model.
      const truncated = (response as any).stop_reason === 'max_tokens'
      if (truncated) {
        this.params.logMessage('The response hit the output-token limit — a tool call this turn may have arrived incomplete', 'status')
      }

      const toolUses = response.content.filter((b: any) => b.type === 'tool_use')
      if (!toolUses.length) return

      const toolResults: any[] = []
      for (const toolUse of toolUses as any[]) {
        if (gen !== this.generation) return
        // Stop pressed mid-turn: the assistant message with its tool_use
        // blocks is already in the history, so every id still needs an
        // answer — an unanswered tool_use poisons the chat permanently
        // (see backfillMissingToolResults for the OpenAI-side twin).
        if (this.params.shouldStop()) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: [{ type: 'text', text: 'Stopped by the user before this tool ran.' }]
          })
          continue
        }

        if (truncated && (!toolUse.input || !Object.keys(toolUse.input).length)) {
          this.params.logMessage(`${toolUse.name} — arrived empty: the response was cut off at the output-token limit`, 'ai', 'action')
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: [{ type: 'text', text: 'This tool call arrived EMPTY — your response hit the output-token limit before the arguments finished, so nothing was executed. Resend the call once; if it truncates again, the payload is too large for one response — send a shorter script (trim comments) or split the change into smaller edits.' }],
            is_error: true
          })
          continue
        }

        const why = toolUse.input && toolUse.input.why ? String(toolUse.input.why) : ''
        this.params.logMessage(why ? `${toolUse.name} — ${why}` : toolUse.name, 'ai', 'action')
        const result: MacroAgentToolResult = await this.tools.execute(toolUse.name, toolUse.input)
        if (gen !== this.generation) return

        const content: any[] = [{ type: 'text', text: result.text }]
        if (result.base64Image) {
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: result.base64Image }
          })
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content,
          is_error: !!result.isError
        })
      }

      this.messages.push({ role: 'user', content: toolResults })
    }

    this.params.logMessage('E501: AI stopped after 50 loops. Send a follow-up request to continue, or split the task into smaller steps.', 'ai')
  }

  // A tool call whose result never got pushed poisons the history PERMANENTLY:
  // this.messages survives the turn (only createNewChat clears it), and the
  // API rejects every later request with "No tool output found for function
  // call <id>" — the chat is dead until the user starts a new one. The tool
  // executor catches its own errors, so the gap needs something else to go
  // wrong between the assistant push and the tool push (the panel closing
  // under logMessage, an aborted turn); rare in the wild, but the failure is
  // terminal, so the history is repaired here instead of guarded there.
  private backfillMissingToolResults = () => {
    for (let i = 0; i < this.messages.length; i++) {
      const m: any = this.messages[i]
      if (m.role !== 'assistant' || !Array.isArray(m.tool_calls) || !m.tool_calls.length) continue

      // Everything belonging to this assistant turn: the role:"tool" answers
      // plus the "Image belonging to..." user companions. Providers require
      // the answers DIRECTLY after the assistant message, so a companion
      // interleaved between two answers (multi-tool turn whose early tool
      // returned a screenshot — written by versions before the deferred
      // image push above) is itself the "No tool output found" poison, even
      // when nothing is missing. Collect the whole block, then rebuild it
      // as answers → stubs → companions.
      const answered = new Set<string>()
      const results: any[] = []
      const companions: any[] = []
      let outOfOrder = false
      let j = i + 1
      for (; j < this.messages.length; j++) {
        const next: any = this.messages[j]
        if (next.role === 'tool') {
          if (companions.length) outOfOrder = true
          answered.add(next.tool_call_id)
          results.push(next)
        } else if (this.isToolImageCompanion(next)) {
          companions.push(next)
        } else break
      }

      const missing = m.tool_calls.filter((c: any) => !answered.has(c.id))
      if (!missing.length && !outOfOrder) continue

      const stubs = missing.map((c: any) => ({
        role: 'tool',
        tool_call_id: c.id,
        content: 'The previous turn ended before this tool ran, so there is no result. Call it again if you still need it.'
      }))
      this.messages.splice(i + 1, j - (i + 1), ...results, ...stubs, ...companions)
    }
  }

  // the user message that carries a tool result's screenshot (see the
  // deferred image push in runOpenAICompatible)
  private isToolImageCompanion = (m: any): boolean =>
    !!m && m.role === 'user' && Array.isArray(m.content) &&
    m.content.some((p: any) => p && p.type === 'image_url') &&
    typeof m.content[0]?.text === 'string' &&
    m.content[0].text.startsWith('Image belonging to the')

  // A chat that outgrows the model's context dies with a provider 400 and
  // never recovers ("requested about 1,582,135 tokens ... maximum is
  // 1,050,000" — the same user hit it twice, Aug 22 proxy logs; nothing
  // client-side trimmed old turns, and production requests reach p99=342
  // messages). Chars are the token proxy (~4:1); images are priced flat
  // because base64 length wildly overstates their token cost. The budget is
  // far above any healthy conversation — a stop-loss, not a tuner.
  private static readonly HISTORY_CHAR_BUDGET = 2_000_000 // ~500k tokens
  private static readonly TRIM_NOTE =
    '[Note: this chat grew past the context budget, so its OLDEST messages were removed. Ask the user again for anything from that early part you still need.]\n\n'

  private trimHistoryToBudget = () => {
    const cost = (m: any): number => {
      let n = 0
      if (typeof m.content === 'string') n += m.content.length
      else if (Array.isArray(m.content)) {
        for (const p of m.content) {
          if (p && typeof p.text === 'string') n += p.text.length
          else if (p && (p.type === 'image_url' || p.type === 'image')) n += 4000
          else n += JSON.stringify(p ?? '').length
        }
      }
      if (m.tool_calls) n += JSON.stringify(m.tool_calls).length
      return n
    }

    let total = 0
    for (const m of this.messages) total += cost(m)
    if (total <= MacroAgentService.HISTORY_CHAR_BUDGET) return

    // Walk forward dropping cost until under budget, then extend the cut to
    // the next SAFE boundary: a plain user message — never a role:"tool"
    // answer, an image companion, or an Anthropic tool_result carrier
    // (starting the kept history inside a tool exchange is the same protocol
    // poison the backfills above repair). The system prompt always stays.
    const first = (this.messages[0] as any)?.role === 'system' ? 1 : 0
    let cut = first
    while (cut < this.messages.length - 1 && total > MacroAgentService.HISTORY_CHAR_BUDGET) {
      total -= cost(this.messages[cut])
      cut++
    }
    const isSafeStart = (m: any): boolean =>
      !!m && m.role === 'user' && !this.isToolImageCompanion(m) &&
      !(Array.isArray(m.content) && m.content.some((p: any) => p && p.type === 'tool_result'))
    while (cut < this.messages.length - 1 && !isSafeStart(this.messages[cut])) cut++
    if (cut <= first || !isSafeStart(this.messages[cut])) return // nothing safely trimmable

    const removed = cut - first
    this.messages.splice(first, removed)
    // the note rides INSIDE the first kept user message — a standalone user
    // message would break Anthropic's strict role alternation
    const keep: any = this.messages[first]
    if (typeof keep.content === 'string') keep.content = MacroAgentService.TRIM_NOTE + keep.content
    else if (Array.isArray(keep.content)) keep.content = [{ type: 'text', text: MacroAgentService.TRIM_NOTE }, ...keep.content]
    this.params.logMessage(`Long chat: removed the ${removed} oldest messages to stay under the model context limit`, 'status')
  }

  // Screenshots pile up and nothing touched them below the 2M-char stop-loss:
  // 2,571 images in 580 conversations of the 09-09 proxy drop, 1,710 of
  // 9,301 run results carrying a picture (OPEN-ISSUES 44.7). An old picture is
  // worthless to the model — the page has moved on — but rides along on every
  // later request. Pruned in BATCHES on purpose: editing an old message breaks
  // the provider's prompt cache from that point, so "keep only the last 3" on
  // every turn would re-bill the whole tail each turn; letting them pile up to
  // IMAGES_MAX and cutting back to IMAGES_KEEP breaks the cache once per ~5
  // images. Both history formats: OpenAI image_url parts (the companion user
  // message) and Anthropic image blocks (inside tool_result content).
  private static readonly IMAGES_MAX = 8
  private static readonly IMAGES_KEEP = 3
  private static readonly IMAGE_STUB =
    '[screenshot removed — an older turn; the page has changed since. Take a new screenshot or browser_snapshot if you need to see the current state]'

  private pruneOldImages = () => {
    const isImg = (p: any) => !!p && (p.type === 'image_url' || p.type === 'image')
    const slots: Array<{ arr: any[], i: number }> = []
    for (const m of this.messages as any[]) {
      if (!m || !Array.isArray(m.content)) continue
      for (let i = 0; i < m.content.length; i++) {
        const p = m.content[i]
        if (isImg(p)) slots.push({ arr: m.content, i })
        else if (p && p.type === 'tool_result' && Array.isArray(p.content)) {
          for (let j = 0; j < p.content.length; j++) if (isImg(p.content[j])) slots.push({ arr: p.content, i: j })
        }
      }
    }
    if (slots.length <= MacroAgentService.IMAGES_MAX) return
    const drop = slots.slice(0, slots.length - MacroAgentService.IMAGES_KEEP)
    for (const s of drop) s.arr[s.i] = { type: 'text', text: MacroAgentService.IMAGE_STUB }
    this.params.logMessage(`Long chat: ${drop.length} older screenshots removed from the history (the newest ${MacroAgentService.IMAGES_KEEP} stay)`, 'status')
  }

  // Anthropic-format twin: tool_use blocks live in assistant content arrays
  // and their answers are tool_result blocks in the NEXT user message. The
  // mid-loop abandon path (generation change during a tool run) returns
  // before the collected results are pushed, and unlike the OpenAI side
  // there was no repair for that — the dangling tool_use then 400s every
  // later request of the chat, permanently (Aug 12 field data shows exactly
  // this failure class staying stuck across an hour of retries).
  private backfillMissingToolResultsAnthropic = () => {
    for (let i = 0; i < this.messages.length; i++) {
      const m: any = this.messages[i]
      if (m.role !== 'assistant' || !Array.isArray(m.content)) continue
      const uses = m.content.filter((b: any) => b && b.type === 'tool_use')
      if (!uses.length) continue

      const next: any = this.messages[i + 1]
      const nextIsResults =
        next && next.role === 'user' && Array.isArray(next.content) &&
        next.content.some((b: any) => b && b.type === 'tool_result')
      const answered = new Set(
        nextIsResults
          ? next.content.filter((b: any) => b && b.type === 'tool_result').map((b: any) => b.tool_use_id)
          : []
      )
      const missing = uses.filter((u: any) => !answered.has(u.id))
      if (!missing.length) continue

      const stubs = missing.map((u: any) => ({
        type: 'tool_result',
        tool_use_id: u.id,
        content: [{ type: 'text', text: 'The previous turn ended before this tool ran, so there is no result. Call it again if you still need it.' }]
      }))
      if (nextIsResults) {
        // every tool_use must be answered in that SAME user message
        next.content = [...stubs, ...next.content]
      } else {
        this.messages.splice(i + 1, 0, { role: 'user', content: stubs })
      }
    }
  }

  // ------------------------------------------------------- OpenAI-compatible

  private runOpenAICompatible = async (
    baseURL: string,
    apiKey: string,
    model: string,
    userText: string,
    providerLabel: string,
    provider: string,
    gen: number
  ): Promise<void> => {
    const tools = agentToolDefs().map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters }
    }))

    // Server-served prompt (see UIV_PROMPT_STUB_VERSION above): only for the
    // Ui.Vision tier — other providers never contact our proxy — and only with
    // the DEFAULT prompt: a user override is a deliberate choice and keeps
    // being sent in full (the proxy never touches a system message that does
    // not start with "UIV-PROMPT:").
    // DEV SWITCH (Settings > AI, aiDevLocalPrompt / bridge dev_local_prompt):
    // send THIS BUILD's prompt instead of the stub, so prompt edits are
    // testable on the Ui.Vision tier without a proxy deploy. Without it, an
    // edited local prompt silently runs against the server's OLD copy —
    // which invalidates benchmark comparisons without any visible sign.
    const devLocalPrompt = !!store.getState().config.aiDevLocalPrompt
    const isUiVisionDefaultPrompt =
      provider === 'uivision' && !devLocalPrompt && !(store.getState().config.aiMacroAgentSystemPrompt || '').trim()
    if (devLocalPrompt && provider === 'uivision') {
      this.params.logMessage('DEV: sending the local build\'s prompt (server-served prompt skipped)', 'status')
    }

    // The history always holds the FULL prompt — the stub is substituted at
    // request-build time only, so provider switches mid-chat and the E712
    // retry stay trivial. Everything after the stub's first line (the
    // Environment sentence) is appended verbatim to the server-side prompt,
    // keeping the proxy's env-metrics parsing contract intact.
    const toStub = (full: string): string => {
      const at = full.lastIndexOf('\n\nEnvironment: ')
      return `UIV-PROMPT: v${UIV_PROMPT_STUB_VERSION}\n${at < 0 ? '' : full.slice(at + 2)}`
    }

    const buildRequestBody = (useStub: boolean): any => {
      const body: any = {
        model,
        messages: useStub
          ? this.messages.map((m, i) => (i === 0 && m.role === 'system' ? { ...m, content: toStub(String(m.content)) } : m))
          : this.messages,
        tools: useStub ? 'UIV-TOOLS' : tools,
        // 16384, not 4096: a set_macro carrying a real script IS the output —
        // under 4096 a big script truncated mid-arguments, which this path
        // sees as invalid tool-call JSON (benchmark T9, 2026-08-13)
        max_tokens: 16384,
        temperature: 0
      }
      // reasoning off for OpenRouter (unified param, only sent there): keeps
      // thinking tokens from eating the max_tokens budget of long tool calls
      // and measurably improves rule-following (see openai_compatible/sampling.ts)
      if (/openrouter\.ai/i.test(baseURL)) body.reasoning = openrouterReasoningParam(model)
      return body
    }

    if (this.messages.length === 0) {
      // Start the conversation with current capabilities; refresh them on subsequent turns too.
      this.messages.push({ role: 'system', content: getSystemPrompt(this.xmoduleStatus, this.localOcrAvailable) })
    }
    if (this.messages[0]?.role === 'system') this.messages[0].content = getSystemPrompt(this.xmoduleStatus, this.localOcrAvailable)
    this.backfillMissingToolResults()
    this.messages.push({ role: 'user', content: [{ type: 'text', text: userText }] })
    this.trimHistoryToBudget()
    this.pruneOldImages()

    const turnEngine = store.getState().config.uivisionEngine === 'advanced' ? 'advanced' : 'standard'
    let emptyReplyNudges = 0
    for (let loop = 0; loop < this.getMaxLoops(); loop++) {
      if (this.params.shouldStop()) return

      // uivision: the server picks the model — show only the provider label
      // (startsWith, so "Ui.Vision AI PRO" does not start leaking the
      // placeholder model name into the chat)
      this.params.logMessage(providerLabel.startsWith('Ui.Vision AI') ? `Calling API (${providerLabel})` : `Calling API (${providerLabel} ${model})`, 'status')

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
      headers['X-Title'] = 'Ui.Vision RPA'
      // device id — our proxy only; on PRO the Bearer header is the account key
      Object.assign(headers, uivInstallHeader(baseURL))
      if (provider === 'uivision') headers['X-UIV-Engine'] = turnEngine
      // the chat writes and fixes macros: it needs instruction-following and
      // code, not spatial grounding — a different model choice from aiScreenXY
      headers['X-UIV-Task'] = 'aichat'
      // build cohort marker (retention.md 9.4) — hint, not a trust boundary
      headers['X-UIV-Version'] = Ext.runtime.getManifest().version
      headers['X-UIV-XModule-Version'] = getXModuleVersion()

      let res = await fetch(chatCompletionsUrl(baseURL), {
        method: 'POST',
        headers,
        body: JSON.stringify(buildRequestBody(isUiVisionDefaultPrompt))
      })
      // Failed/empty responses can still consume provider credit.
      if (provider === 'uivision') window.dispatchEvent(new Event('uiv-allowance-changed'))

      // E712: the proxy got the stub but has no prompt/tools files loaded (bad
      // deploy) — it refuses to forward, because a bare stub reaching the
      // model would produce garbage with no error anywhere. The full prompt is
      // in the binary anyway: retry once with it, so a botched server deploy
      // degrades to current behavior instead of an outage.
      if (!res.ok && isUiVisionDefaultPrompt) {
        const errBody = await res.text().catch(() => '')
        if (!errBody.includes('E712')) {
          throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 400)}`)
        }
        res = await fetch(chatCompletionsUrl(baseURL), {
          method: 'POST',
          headers,
          body: JSON.stringify(buildRequestBody(false))
        })
      }

      // Models that refuse reasoning-off (HTTP 400 "Reasoning is mandatory",
      // e.g. gemini-3.7-flash): remember the model, rebuild the body — it now
      // gets {effort:'low'} — and retry once.
      if (!res.ok && /openrouter\.ai/i.test(baseURL)) {
        const errBody = await res.text().catch(() => '')
        if (!isReasoningMandatoryError(res.status, errBody)) {
          throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 400)}`)
        }
        markReasoningMandatory(model)
        res = await fetch(chatCompletionsUrl(baseURL), {
          method: 'POST',
          headers,
          body: JSON.stringify(buildRequestBody(isUiVisionDefaultPrompt))
        })
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 400)}`)
      }

      window.dispatchEvent(new Event('uiv-allowance-changed'))
      const data = await res.json()

      // stopped or abandoned while waiting: discard the whole response —
      // nothing of it has been pushed yet, so the history stays consistent
      if (gen !== this.generation || this.params.shouldStop()) return

      const message = data?.choices?.[0]?.message
      if (!message) {
        throw new Error(`Empty response from model: ${JSON.stringify(data).slice(0, 400)}`)
      }

      // finish_reason "length" = the response was cut off at max_tokens; a
      // tool call in it likely carries truncated (= unparseable) arguments
      const responseTruncated = data?.choices?.[0]?.finish_reason === 'length'
      if (responseTruncated) {
        this.params.logMessage('The response hit the output-token limit — a tool call this turn may have arrived incomplete', 'status')
      }

      const usage = data.usage
      this.params.logMessage(
        `API call complete (tokens: ${usage?.prompt_tokens ?? '?'} in / ${usage?.completion_tokens ?? '?'} out)`,
        'status'
      )

      // some providers return content as an array of parts instead of a string
      const contentText =
        typeof message.content === 'string'
          ? message.content
          : Array.isArray(message.content)
            ? message.content
                .filter((p: any) => p && p.type === 'text' && p.text)
                .map((p: any) => p.text)
                .join('\n')
            : ''
      if (contentText && contentText.trim()) {
        this.params.logMessage(contentText, 'ai')
      }

      if (contentText.trim() || message.tool_calls?.length) reportUsage('ai', provider === 'uivision' ? (getAIProviderConfig().tier === 'pro' ? 'pro' : 'free') : provider === 'local' ? 'local' : 'own-key')
      this.messages.push({ role: 'assistant', content: message.content ?? '', tool_calls: message.tool_calls })

      const toolCalls = message.tool_calls || []
      if (!toolCalls.length) {
        // No tool call AND no text: that is never a useful final answer — the
        // turn would just end with the user seeing NOTHING (gemini-3.7-flash
        // did this repeatedly after image-bearing tool results, benchmark
        // 2026-08-25). Nudge the model to continue, visibly and at most twice
        // per turn, so a persistent-empty model still terminates.
        if (!contentText.trim() && emptyReplyNudges < 2) {
          emptyReplyNudges++
          this.params.logMessage('The model returned an empty reply — asking it to continue', 'status')
          this.messages.push({
            role: 'user',
            content: [{
              type: 'text',
              text: 'Your last reply was empty — no text and no tool call, so the user saw nothing. Continue the task with the next tool call; if you are done or stuck, say so in text: report what was achieved, what failed, and what you would try next.'
            }]
          })
          continue
        }
        if (!contentText.trim()) throw new Error('The AI returned no text or action after two retries. Your saved macro is unchanged by this empty reply. Try again or choose another engine.')
        return
      }
      // tool-result images are pushed AFTER the whole tool block (see below)
      const deferredImages: any[] = []

      for (const toolCall of toolCalls) {
        if (gen !== this.generation) return
        // Stop pressed mid-turn: the assistant message with its tool_calls is
        // already in the history, so every id still needs a role:"tool"
        // answer — an unanswered call poisons the chat (backfill would repair
        // it on the next send, but answering now keeps the history clean)
        if (this.params.shouldStop()) {
          this.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: 'Stopped by the user before this tool ran.'
          })
          continue
        }

        // The arguments string is model-emitted JSON, and a large "script"
        // value is escaping-hostile (nested template literals, quotes,
        // backslashes) — the dominant failure was models resending broken
        // payloads invisibly until they gave up (2026-08-13, benchmark T9).
        // Three defenses, in order: the lenient repair that already saves
        // macro_json payloads, a VISIBLE action line when the call still
        // cannot be read (a silently skipped call looks like "no attempt" in
        // the transcript), and an error echo that points AT the broken spot
        // instead of echoing the first 200 chars of a 10KB payload.
        const rawArgs = toolCall.function?.arguments || '{}'
        let args: any = {}
        try {
          args = JSON.parse(rawArgs)
        } catch (parseError) {
          try {
            args = parseToolCallArgumentsLenient(rawArgs)
            this.params.logMessage(
              `${toolCall.function?.name || 'tool'} — the call arrived with a broken JSON escape in its arguments; repaired automatically`,
              'status'
            )
          } catch (e) {
            const name = toolCall.function?.name || 'tool'
            const reason = responseTruncated ? 'the response was cut off at the output-token limit mid-arguments' : 'the arguments were not valid JSON'
            this.params.logMessage(`${name} — rejected before it ran: ${reason}`, 'ai', 'action')
            this.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: responseTruncated
                ? 'This tool call arrived CUT OFF — your response hit the output-token limit mid-arguments, so nothing was executed. Resend the call once; if it truncates again, the payload is too large for one response — send a shorter script (trim comments) or split the change into smaller edits.'
                : `Invalid tool arguments (not JSON): ${describeJsonParseError(rawArgs, parseError)}\n` +
                  'Resend the SAME call with valid JSON arguments. If you are passing a program in "script": it is a PLAIN TEXT parameter — write real newlines and real quotes and let your serializer do the one round of escaping; these breaks are almost always a quote or backslash escaped by hand.'
            })
            continue
          }
        }

        const name = toolCall.function?.name
        const why = args && args.why ? String(args.why) : ''
        this.params.logMessage(why ? `${name} — ${why}` : name, 'ai', 'action')
        const result: MacroAgentToolResult = await this.tools.execute(name, args)
        if (gen !== this.generation) return

        this.messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result.text
        })

        // images cannot ride inside role:"tool" messages portably — but they
        // must NOT be pushed here either: OpenAI-format providers require
        // every tool answer DIRECTLY after the assistant message, and a
        // user message interleaved between two answers of a multi-tool turn
        // 400s every later request with "No tool output found for function
        // call ..." — the permanently-stuck-chat class in the Aug 20/24
        // proxy logs. Collect, push after the block.
        if (result.base64Image) {
          deferredImages.push({
            role: 'user',
            content: [
              { type: 'text', text: `Image belonging to the ${name} tool result above:` },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${result.base64Image}` } }
            ]
          })
        }
      }

      this.messages.push(...deferredImages)
    }

    this.params.logMessage('E501: AI stopped after 50 loops. Send a follow-up request to continue, or split the task into smaller steps.', 'ai')
  }
}
