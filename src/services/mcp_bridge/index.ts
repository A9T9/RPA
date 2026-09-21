import { reportUsage } from '@/services/usage'
import { ensureAllUrlsPermission } from '@/common/firefox_permission'
import { message } from 'antd'
import { getXModuleVersion, xmodules2Active } from '@/services/xmodules2/routing'
import * as act from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { MCP_BRIDGE, PLAYER_MODE, PLAYER_STATUS } from '@/common/constant'
import { getPlayer } from '@/common/player'
import { stopScript } from '@/modules/script_runner'
import { getActiveWebTab, isWebTab } from '@/common/tab_utils'
import { macroDisplayPath } from '@/common/macro_path'
import { getVarsInstance } from '@/common/variables'
import { delayMs } from '@/common/utils'
import Ext from '@/common/web_extension'
import { captureScreenShot } from '@/modules/helper'
import { getMacroFileNodeList } from '@/recomputed'
import { store } from '@/redux'
import { getStorageManager } from '@/services/storage'
import { DEFAULT_MACRO_AGENT_SYSTEM_PROMPT } from '@/services/ai/macro_agent/service'
import { getChatForBridge } from '@/containers/sidepanel/components/ai_chat/bridge_hook'
import { isDevTestBrowser } from './detect'
import { getAIProviderConfig } from '@/services/ai/computer_use/service'
import { PRO_KEY_CONFIG_NAME } from '@/services/ai/uivision_free_tier'
import { MacroAgentTools } from '@/services/ai/macro_agent/tools'
import { toolNeedsWebTab } from './web_tab_policy'

// MCP bridge client — lets Claude Code (or any MCP client) drive Ui.Vision.
//
// The local bridge process (mcp/uivision-mcp-bridge.js) runs a WebSocket
// server on 127.0.0.1; this client dials out to it from the SIDE PANEL
// context (the tools need the panel: redux store, screenshot pipeline,
// devicePixelRatio) and executes forwarded tool calls with the same
// MacroAgentTools the built-in AI chat uses. Enabled via Settings > AI
// (config.mcpBridgeEnabled / mcpBridgePort / mcpBridgeToken); the panel must
// be open for the connection to exist — by design, so the user can watch.

// The two things a stuck user has almost always missed: they never ran the
// installer, or they ran it and did not FULLY restart the MCP client (servers
// are loaded only at startup, so an already-open client never spawns the
// bridge and the port stays dead). Say both wherever the bridge is unreachable
// — "is the bridge process running?" alone leaves them with nothing to try.
const NOT_REACHABLE_HINT =
  'Run "npx uivision-mcp-bridge --setup" in a terminal, then fully restart Claude Code (a new session/tab is not enough) — MCP servers load only at startup.'

// Where to get the token, said the same way everywhere.
const TOKEN_HINT =
  'The setup command prints it; it is also in the .uivision_mcp_token file in your home folder, and the AI can read it off the bridge and show it to you.'

const RECONNECT_MIN_MS = 3000
// capped low: after the bridge process restarts (new Claude Code session),
// the panel should be back within seconds — a 60s cap read as "it hangs"
const RECONNECT_MAX_MS = 15000

type BridgeToolCall = { type: 'tool_call'; id: string; tool: string; args: any; clientName?: string }

// answered even while another tool call is running — static text or plain
// storage/config reads, nothing that touches the editor or the last screenshot
const PURE_READ_TOOLS = new Set(['get_authoring_guide', 'list_macros', 'get_ai_settings'])

class McpBridgeClient {
  private ws: WebSocket | null = null
  private tools: MacroAgentTools | null = null
  private reconnectMs = RECONNECT_MIN_MS
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connectionKey = '' // "enabled|port|token" the current socket was opened with
  // Dev/test browsers connect WITHOUT the pairing token (user decision
  // 2026-08-16): the token exists so no OTHER local app hijacks an end
  // user's bridge, but on a dev rig it is pure friction. 'development'
  // installType = unpacked/temporarily-loaded extension (Chrome for
  // Testing rigs, web-ext, load-unpacked), and a Firefox version with a
  // 'b' suffix = Developer Edition / Beta channel. Regular store installs
  // in end-user browsers keep requiring the token.
  private devBrowser = false
  private currentCallId: string | null = null
  // MCP client behind the bridge, from hello_ok (null on pre-1.7.9 bridges)
  private clientName: string | null = null
  private cancelledIds = new Set<string>()
  private wasConnected = false
  // the macro id THIS session last put into the editor (open/create/set) —
  // run_macro and set_macro check it so an agent call cannot silently land on
  // a macro the USER opened in the panel meanwhile (that race once re-ran a
  // user's download macro)
  private lastTouchedMacroId: string | null = null
  private bannerClearTimer: ReturnType<typeof setTimeout> | null = null
  // the reconnect loop retries a bad token every few seconds — complain once
  // per config change, not once per retry
  private tokenErrorShown = false
  // "replaced by new connection" fires every few seconds while TWO browsers
  // fight over the bridge — warn loudly, but at most once a minute
  private replacedWarnAt = 0
  // one-shot callback for the Settings > AI "Test" button: the next
  // hello_ok/close settles it with a human-readable verdict
  private testWaiter: ((r: { ok: boolean; text: string }) => void) | null = null

  // pid of the bridge process behind the last hello_ok (bridge 1.7.4+): a
  // reconnect that lands on a different pid means the bridge PROCESS was
  // replaced, which is the usual story behind an unexplained "Disconnected"
  private lastBridgePid: number | null = null

  // one log line per state change in the Logs tab — noisy retries stay silent.
  // Own log class 'mcp' (renders as [MCP]) so the trail of what Claude does
  // reads at a glance; errors keep the error class (red, in the Error filter)
  // and carry the [MCP] marker in the text instead.
  private log = (text: string, type: 'info' | 'error' = 'info') => {
    if (type === 'error') {
      store.dispatch(act.addLog('error', `[MCP] ${text}`, { noStack: true }) as any)
    } else {
      store.dispatch(act.addLog('mcp', text, { noStack: true }) as any)
    }
  }

  // "Show the log by default when MCP is on" (user request 2026-09-02): the
  // Data > Logs view is where the tool-call trail lands, so the panel goes
  // there when the bridge connects. The panel reopens on the user's LAST
  // CLICKED tab (config.lastSidebarTab, often AI Chat), so the first connect
  // of a panel lifetime always switches — except while a chat run is in
  // progress, which has its own live status. Later reconnects respect a
  // user who has since moved to AI Chat on purpose.
  private logsTabShown = false
  private showLogsTab = () => {
    const ui = (store.getState() as any).ui || {}
    const chat = getChatForBridge()
    if (chat && chat.running()) return
    if (ui.sidebarTab === 'AiChat' && this.logsTabShown) return
    this.logsTabShown = true
    store.dispatch(act.updateUI({ sidebarTab: 'Logs', dataTab: 'Logs' }) as any)
  }

  private getConfig = () => {
    const config = store.getState().config as any
    return {
      enabled: !!config.mcpBridgeEnabled,
      port: parseInt(config.mcpBridgePort, 10) || MCP_BRIDGE.DEFAULT_PORT,
      token: '' // bridge 1.7+ pairs by origin; no user-facing token any more
    }
  }

  detectDevBrowser = () => {
    isDevTestBrowser().then(dev => { this.devBrowser = dev })
  }

  // called on every store change — (re)connects or disconnects to match config
  sync = () => {
    const { enabled, port, token } = this.getConfig()
    const key = `${enabled}|${port}|${token}`
    if (key === this.connectionKey) return
    this.connectionKey = key
    this.tokenErrorShown = false

    this.teardown()
    if (enabled) this.connect()
  }

  private teardown = () => {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      const ws = this.ws
      this.ws = null // onclose sees null -> no reconnect
      try { ws.close() } catch (e) { /* already closed */ }
    }
    this.reconnectMs = RECONNECT_MIN_MS
  }

  private scheduleReconnect = () => {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.getConfig().enabled) this.connect()
    }, this.reconnectMs)
    this.reconnectMs = Math.min(this.reconnectMs * 2, RECONNECT_MAX_MS)
  }

  private connect = () => {
    const { port, token } = this.getConfig()
    let ws: WebSocket
    try {
      ws = new WebSocket(`ws://127.0.0.1:${port}/`)
    } catch (e) {
      this.scheduleReconnect()
      return
    }
    this.ws = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'hello',
        token,
        devBrowser: this.devBrowser,
        client: 'uivision-extension',
        version: (chrome.runtime.getManifest && chrome.runtime.getManifest().version) || '',
        // native Desktop Automation host version ('' = not installed /
        // unknown yet) — the probe fills it shortly after startup, and the
        // bridge shows it in bridge_status for external runners
        xmoduleVersion: getXModuleVersion()
      }))
    }

    ws.onmessage = (event) => {
      let msg: any
      try {
        msg = JSON.parse(String(event.data))
      } catch (e) {
        return
      }
      if (msg.type === 'hello_ok') {
        this.reconnectMs = RECONNECT_MIN_MS
        this.wasConnected = true
        // the connection label the bridge assigned THIS browser ("chrome#1",
        // "firefox#2") — several browsers may be connected at once (bridge
        // 1.4+), and the label is how the user and the agent tell them
        // apart. Shown in the panel footer and Settings > AI. Pre-1.4
        // bridges send no label — 'connected' keeps the badge honest.
        const label = String(msg.label || 'connected')
        const pid = msg.pid ? Number(msg.pid) : null
        const newProcess = pid != null && this.lastBridgePid != null && pid !== this.lastBridgePid
        if (pid != null) this.lastBridgePid = pid
        store.dispatch(simpleActions.setMcpBridgeLabel(label) as any)
        // which MCP client owns the bridge (bridge 1.7.9+: "Claude", "LM
        // Studio", ...) — the panel names it instead of assuming Claude Code
        const client = msg.clientName ? String(msg.clientName) : null
        this.clientName = client
        store.dispatch(simpleActions.setMcpBridgeClient(client) as any)
        if (this.testWaiter) this.testWaiter({ ok: true, text: `Connected to the MCP bridge on port ${port} as ${label}.` })
        this.log(
          `Connected to the MCP bridge (port ${port}${pid ? `, pid ${pid}` : ''}) as ${label}` +
          (newProcess ? ' — a NEW bridge process; the previous one exited (the MCP client restarted its servers, or a new session started)' : '') +
          ` — ${client || 'the MCP client'} can now control Ui.Vision`
        )
        // No toast here: the controlbar shows a persistent "MCP: <label>" badge
        // and the Settings > AI Test button has its own confirmation (testWaiter).
        // The 3 s antd message sat over the tab row and blocked tab selection
        // on every panel open / bridge reconnect (2026-09-09).
        this.showLogsTab()
      } else if (msg.type === 'tool_call') {
        this.handleToolCall(msg as BridgeToolCall)
      } else if (msg.type === 'cancel' && msg.id) {
        this.cancelledIds.add(msg.id)
        // The client withdrew the call (Claude Code: the user rejected the
        // tool use, or aborted). The flag above is only POLLED between
        // steps — a 2-minute download loop ran to the end after a rejected
        // run_macro (OPEN-ISSUES 30.11). Stop the runners now, the way the
        // panel's STOP button does, but keep the bridge up.
        if (msg.id === this.currentCallId) {
          try { stopScript() } catch (e) { /* no script running */ }
          const player = (store.getState() as any).player
          if (player && player.status !== PLAYER_STATUS.STOPPED) {
            const name = player.mode === PLAYER_MODE.TEST_SUITE ? 'testSuite' : 'testCase'
            try { getPlayer({ name }).stop() } catch (e) { /* player not initialised here */ }
          }
          const chat = getChatForBridge()
          if (chat && chat.running()) chat.stop()
          this.log('the MCP client cancelled the running call (rejected or aborted on the Claude side) — the run was stopped', 'error')
        }
      }
    }

    ws.onclose = (event) => {
      // the footer badge and Settings must not keep showing a dead label —
      // clear it for teardown-closes too (this.ws already null then)
      store.dispatch(simpleActions.setMcpBridgeLabel(null) as any)
      store.dispatch(simpleActions.setMcpBridgeClient(null) as any)
      if (this.ws !== ws) return // closed by teardown
      this.ws = null
      if (this.testWaiter) {
        // the Test button is waiting on this attempt — turn the close code
        // into a verdict (the reconnect loop below still runs as usual)
        if (event && event.code === 4003) {
          this.testWaiter({ ok: false, text: `The bridge on port ${port} rejected the token. ${TOKEN_HINT}` })
        } else if (event && event.code === 4002) {
          this.testWaiter({ ok: false, text: 'Reached the bridge, but another browser immediately took the connection — disable the MCP bridge in that browser.' })
        } else {
          this.testWaiter({ ok: false, text: `Could not reach the bridge on 127.0.0.1:${port}. ${NOT_REACHABLE_HINT}` })
        }
      }
      if (event && event.code === 4002) {
        // the bridge holds ONE extension connection ("newest wins") — this
        // close means another browser with the same token just took it.
        // Without a visible warning the two sides silently steal it back
        // and forth every few seconds and tool calls land in whichever
        // browser happens to hold the socket.
        this.wasConnected = false
        const now = Date.now()
        if (now - this.replacedWarnAt > 60000) {
          this.replacedWarnAt = now
          this.log('Another browser took the MCP bridge connection — enable the bridge in only ONE browser (Settings > AI).', 'error')
          message.warning('MCP bridge: another browser took the connection — disable the bridge there or here', 6)
        }
        // rejoin on the slow cadence: stealing the socket right back would
        // only continue the ping-pong
        this.reconnectMs = RECONNECT_MAX_MS
      } else if (this.wasConnected) {
        this.wasConnected = false
        // the close code is the only clue to WHY. 1006 = the socket dropped
        // without a close frame: the bridge process exited or was killed —
        // Claude Code restarting its MCP servers (session restart, /mcp
        // reconnect) is the everyday case. 1000/1001 = the bridge closed on
        // purpose (its reason string says why). The bridge itself never
        // times a tool connection out and sends no keepalive pings, so an
        // idle disconnect is not something it does by design.
        const code = (event && event.code) || 0
        const reason = (event && event.reason) || ''
        this.log(
          `Disconnected from the MCP bridge (close code ${code || '?'}${reason ? `: ${reason}` : ''}` +
          (code === 1006 ? ' — the bridge process went away, e.g. the MCP client restarted its servers or the session ended' : '') +
          ') — retrying in the background'
        )
      } else if (event && event.code === 4003 && !this.tokenErrorShown) {
        // the server rejects a bad token BEFORE hello_ok, so without this the
        // failure is completely silent and the client just retries forever
        this.tokenErrorShown = true
        this.log(`The MCP bridge rejected the connection: wrong or missing token. ${TOKEN_HINT}`, 'error')
        message.error('MCP bridge: wrong token — see Settings > AI', 5)
      }
      this.scheduleReconnect()
    }

    ws.onerror = () => { /* onclose follows and handles the retry */ }
  }

  // Settings > AI "Test" button: answer NOW instead of leaving the user to
  // guess whether the background reconnect loop is getting anywhere. Already
  // connected reports success immediately; otherwise one fresh connection
  // attempt is forced (the backoff may be sitting out up to 15s) and its
  // hello_ok / close code becomes the verdict.
  test = (): Promise<{ ok: boolean; text: string }> => {
    const { enabled, port } = this.getConfig()
    if (!enabled) {
      return Promise.resolve({ ok: false, text: 'The MCP bridge is switched off — enable it first.' })
    }
    // No token pre-check: bridge 1.7+ recognises this extension by its origin
    // and pairs without a token. If a token IS still required (older bridge, or
    // a connection with no origin), the handshake below reports it as a 4003.
    if (this.wasConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve({ ok: true, text: `Connected to the MCP bridge on port ${port}.` })
    }
    return new Promise((resolve) => {
      let settled = false
      const finish = (r: { ok: boolean; text: string }) => {
        if (settled) return
        settled = true
        if (this.testWaiter === finish) this.testWaiter = null
        resolve(r)
      }
      this.testWaiter = finish
      // nothing at all answered — neither hello_ok nor a close event
      setTimeout(() => finish({ ok: false, text: `No answer from 127.0.0.1:${port} within 5 seconds. ${NOT_REACHABLE_HINT}` }), 5000)
      this.teardown()
      this.connect()
    })
  }

  // The panel's red STOP button: halt whatever is running and cut the bridge.
  // Order matters — the in-flight call is answered FIRST so Claude reads "the
  // user stopped you" instead of "extension disconnected", then the config
  // flip tears the socket down (sync() → teardown, synchronous) and keeps it
  // down until the user re-enables the bridge in Settings > AI.
  emergencyStop = () => {
    const callId = this.currentCallId
    // shouldStop → a running script / run_macro bails at its next check ...
    if (callId) this.cancelledIds.add(callId)
    // ... but that flag is polled, and the user wants NOW: stop the runners
    try { stopScript() } catch (e) { /* no script running */ }
    const player = (store.getState() as any).player
    if (player && player.status !== PLAYER_STATUS.STOPPED) {
      const name = player.mode === PLAYER_MODE.TEST_SUITE ? 'testSuite' : 'testCase'
      try { getPlayer({ name }).stop() } catch (e) { /* player not initialised here */ }
    }
    // a chat run the agent started via send_chat keeps driving otherwise
    const chat = getChatForBridge()
    if (chat && chat.running()) chat.stop()
    if (callId && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'tool_result',
          id: callId,
          text: 'Error: STOPPED BY THE USER — they pressed the emergency stop in the Ui.Vision panel. The macro was halted and the MCP bridge is now switched off. Do not retry: the user must re-enable the bridge in Settings > AI before any call can work again.',
          isError: true
        }))
      } catch (e) { /* socket already gone */ }
    }
    if (this.bannerClearTimer) {
      clearTimeout(this.bannerClearTimer)
      this.bannerClearTimer = null
    }
    store.dispatch(act.updateUI({ mcpControl: null }) as any)
    this.log('EMERGENCY STOP — macro stopped, MCP bridge switched off. Re-enable it in Settings > AI when ready.', 'error')
    message.warning('MCP bridge stopped — re-enable it in Settings > AI', 6)
    // last: flips config → sync() → teardown() closes the socket. The reply
    // above must already be on the wire.
    store.dispatch(act.updateConfig({ mcpBridgeEnabled: false }) as any)
  }

  private getTools = (): MacroAgentTools => {
    if (!this.tools) {
      this.tools = new MacroAgentTools({
        runOrigin: 'mcp',
        logMessage: (message) => this.log(message),
        // the bridge REQUIRES the side panel open, so the grant dialog has a
        // place to show; an unattended run is capped by the 2min timeout in
        // ensureFirefoxHostPermission
        askFirefoxHostPermission: ensureAllUrlsPermission,
        // the bridge's cancel message (Claude Code hit Esc) stops a running
        // script; the player run is stopped via the same flag in tools.ts
        shouldStop: () => this.currentCallId != null && this.cancelledIds.has(this.currentCallId),
        captureScreenShotFunction: async (opts?: { desktop?: boolean }) => {
          const vars = getVarsInstance()
          // an explicit scope from the tool wins in BOTH directions (the
          // screenshot tool promises "the browser tab unless scope: desktop");
          // only a call without one follows the CV scope setting like the
          // classic commands do (OPEN-ISSUES 20.3)
          const isDesktop = (opts && typeof opts.desktop === 'boolean') ? opts.desktop : (store.getState().config as any).cvScope === 'desktop'
          const shot = await captureScreenShot({ vars, isDesktop })
          if (!shot) throw new Error('screenshot capture failed')
          return shot
        }
      })
    }
    return this.tools
  }

  // --- "under MCP control" banner ------------------------------------------
  // ui.mcpControl drives a banner in the side panel: the user must be able to
  // SEE that an external agent is driving the extension, because they may be
  // working in the same panel. Set on every call; cleared a moment after the
  // last call ends, so back-to-back calls read as one continuous session
  // instead of a flickering banner.
  // a relayed call names the client it came from (LM Studio next to Claude
  // Code share one bridge); a direct call is the bridge owner's client
  private callerName = (call: BridgeToolCall): string => String(call.clientName || this.clientName || 'MCP client')

  private showBanner = (tool: string, client?: string) => {
    if (this.bannerClearTimer) {
      clearTimeout(this.bannerClearTimer)
      this.bannerClearTimer = null
    }
    store.dispatch(act.updateUI({ mcpControl: { tool, client: client || null } }) as any)
  }

  private scheduleBannerClear = () => {
    if (this.bannerClearTimer) clearTimeout(this.bannerClearTimer)
    this.bannerClearTimer = setTimeout(() => {
      this.bannerClearTimer = null
      store.dispatch(act.updateUI({ mcpControl: null }) as any)
    }, 2500)
  }

  // id formats drift for the same file (tree fullPath vs stored id) — compare
  // like actions/removeTestCase does
  private normId = (p: any): string => String(p || '').toLowerCase().replace(/\\/g, '/').replace(/\.json$/i, '')

  private currentEditingId = (): string | null => {
    const src = (store.getState() as any).editor.editing.meta && (store.getState() as any).editor.editing.meta.src
    return (src && src.id) || null
  }

  private rememberEditorMacro = () => {
    this.lastTouchedMacroId = this.currentEditingId()
  }

  // the guard for editor-state tools: refuse to act if the editor no longer
  // shows the macro this session last opened/created/edited — the user (or
  // another session) switched it in between
  private editorRaceError = (tool: string): { text: string; isError: true } | null => {
    if (!this.lastTouchedMacroId) return null // nothing tracked yet — "act on what is open" flow
    const now = this.currentEditingId()
    if (this.normId(now) === this.normId(this.lastTouchedMacroId)) return null
    return {
      text: `Error: the editor no longer shows the macro this session last worked on (it now shows "${now || 'an unsaved macro'}") — ` +
        'someone is using the panel, or another session switched macros. Call open_macro with the macro you mean, then retry ' +
        `${tool}. Never assume the editor still holds what you left there.`,
      isError: true
    }
  }

  // What an external runner needs to plan a sweep: the ACTIVE provider (as
  // the chat will actually resolve it, fallbacks included), which providers
  // hold a key (booleans only — the keys themselves never cross the bridge),
  // and the settings that change what a run means (scope, OCR engine).
  private aiSettingsReport = (): string => {
    const config = store.getState().config as any
    const active = getAIProviderConfig()
    return JSON.stringify({
      active: { provider: active.provider, tier: (active as any).tier, model: active.model, label: active.label },
      keys_configured: {
        openrouter: !!(config.openRouterAPIKey || '').trim(),
        anthropic: !!(config.anthropicAPIKey || '').trim(),
        uivision_pro: !!(config[PRO_KEY_CONFIG_NAME] || '').trim()
      },
      models: {
        openrouter: config.openRouterModel || '',
        anthropic: config.anthropicModel || '',
        local: config.localAIModel || '',
        local_base_url: config.localAIBaseURL || ''
      },
      cv_scope: config.cvScope || 'browser',
      ocr_engine: Number(config.ocrEngine) || 98,
      // prompt provenance — a benchmark run is not attributable without it:
      // dev_local_prompt true = this build's prompt goes up even on the
      // Ui.Vision tier (server-served prompt skipped)
      dev_local_prompt: !!config.aiDevLocalPrompt,
      prompt_overridden: !!(config.aiMacroAgentSystemPrompt || '').trim()
    }, null, 1)
  }

  // What is the runner doing RIGHT NOW — name, state and the freshest log
  // lines. Answerable during a run (see the gate bypass in handleToolCall);
  // before it existed, every long run was a minutes-long black box.
  private runStatus = (args: any): { text: string } => {
    const s: any = store.getState()
    const playerStatus = s.player && s.player.status
    const scriptRunning = !!(s.ui && s.ui.scriptRunning)
    const running = scriptRunning || (playerStatus && playerStatus !== 'STOPPED')
    const src = s.editor && s.editor.editing && s.editor.editing.meta && s.editor.editing.meta.src
    const name = (src && src.name) || '(unsaved editor content)'
    const n = Math.max(1, Math.min(100, Number(args.lines) || 20))
    const logs = ((s.logs || []) as any[])
      .slice(-n)
      .map((l: any) => `[${l.type}] ${String(l.text).slice(0, 300)}`)
      .join('\n')
    const busy = this.currentCallId ? ' A bridge tool call (likely run_macro) is in flight.' : ''
    return {
      text:
        `Run ${running ? 'IN PROGRESS' : 'not running'} — editor: "${name}"${playerStatus && playerStatus !== 'STOPPED' ? `, player ${playerStatus}` : ''}.${busy}\n` +
        `--- last ${n} log lines ---\n${logs || '(log is empty)'}`
    }
  }

  private handleToolCall = async (call: BridgeToolCall) => {
    const reply = (result: { text: string; base64Image?: string; isError?: boolean }) => {
      if (!result.isError) reportUsage('mcp', call.tool)
      this.cancelledIds.delete(call.id)
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'tool_result', id: call.id, ...result }))
      }
    }

    // LIVE run visibility: run_status is a pure READ and must answer while
    // run_macro is still executing — that is its whole point. It never
    // touches the stateful tool machinery, so it skips the gate below.
    if (call.tool === 'run_status') {
      try {
        reply(this.runStatus(call.args || {}))
      } catch (e) {
        reply({ text: `Error: run_status failed: ${(e as any)?.message || e}`, isError: true })
      }
      return
    }

    // a mid-run screenshot is a visual peek at the same screen the macro is
    // driving — it reads pixels only and does not steal the play tab, so it
    // may also pass the gate (its lastShot bookkeeping belongs to the
    // AGENT's crop workflow, which is idle while a run is in progress)
    if (call.tool === 'screenshot' && this.currentCallId) {
      try {
        reply(await this.getTools().execute('screenshot', call.args || {}))
      } catch (e) {
        reply({ text: `Error: screenshot failed: ${(e as any)?.message || e}`, isError: true })
      }
      return
    }

    // Pure reads that touch neither the editor nor lastShot answer while
    // another call is in flight too. Two MCP clients share one bridge in
    // practice (LM Studio's chat next to Claude Code, 2026-09-06): the second
    // client asked for the authoring guide — static text — while the first
    // client's click was still running, got the rejection below, and wrote
    // its macro without ever reading the guide.
    if (this.currentCallId && PURE_READ_TOOLS.has(call.tool)) {
      this.log(`${this.callerName(call)}: ${call.tool} (read, answered while another call runs)`)
      try {
        if (call.tool === 'get_authoring_guide') reply({ text: DEFAULT_MACRO_AGENT_SYSTEM_PROMPT })
        else if (call.tool === 'list_macros') reply(this.listMacros())
        else reply({ text: this.aiSettingsReport() })
      } catch (e) {
        reply({ text: `Error: ${call.tool} failed: ${(e as any)?.message || e}`, isError: true })
      }
      return
    }

    // the tools are stateful (editor, lastShot) — one call at a time
    if (this.currentCallId) {
      reply({ text: 'Error: another tool call is still running. Wait for it to finish. (run_status, screenshot, get_authoring_guide, list_macros and get_ai_settings are exempt — use the first two to watch a running macro.)', isError: true })
      return
    }

    this.currentCallId = call.id
    const why = call.args && call.args.why
    this.log(`${this.callerName(call)}: ${call.tool}${why ? ` — ${why}` : ''}`)
    this.showBanner(call.tool, this.callerName(call))

    try {
      // these need a web page to act on; a fresh browser (or one sitting on a
      // chrome:// page) has none — open one instead of failing the call
      if (toolNeedsWebTab(call.tool, call.args || {})) {
        await this.ensureWebTab()
      }

      // run_macro's explicit targets (user request 2026-08-20): "macro" names
      // a stored macro to open+run, "script"/"code" is inline JS to run
      // directly. Without them run_macro plays whatever the editor holds —
      // which silently ran the WRONG macro whenever a caller believed a name
      // argument worked.
      const runArgs: any = call.tool === 'run_macro' ? call.args || {} : null
      const runInline: string | null =
        runArgs && typeof runArgs.script === 'string' && runArgs.script.length
          ? runArgs.script
          : runArgs && typeof runArgs.code === 'string' && runArgs.code.length
            ? runArgs.code
            : null
      const runNamed: string | null =
        runArgs && typeof runArgs.macro === 'string' && runArgs.macro.length
          ? runArgs.macro
          : null

      // editor-state tools must not race a user working in the panel — except
      // a run_macro with an explicit target, which does not depend on what the
      // editor happens to hold
      if ((call.tool === 'run_macro' && !runInline && !runNamed) || call.tool === 'set_macro') {
        const race = this.editorRaceError(call.tool)
        if (race) {
          reply(race)
          return
        }
      }

      switch (call.tool) {
        case 'run_macro': {
          if (runInline && runNamed) {
            reply({ text: 'Error: pass either "macro" (run a stored macro) or "script" (run inline JS), not both.', isError: true })
            break
          }
          if (runNamed) {
            const opened = await this.openMacro(runNamed)
            if (opened.isError) {
              reply(opened)
              break
            }
          }
          // a "use desktop-app" / "<name>.d.js" macro is routed to Ui.Vision
          // for Desktop inside the tool itself (shared with the in-panel chat)
          reply(await this.getTools().execute('run_macro', call.args || {}))
          break
        }
        case 'list_macros':
          reply(this.listMacros())
          break
        case 'open_macro':
          reply(await this.openMacro(call.args && call.args.name))
          break
        case 'delete_macro':
          reply(await this.deleteMacro(call.args && call.args.name))
          break
        case 'get_authoring_guide':
          // the same tuned instructions the in-panel AI chat works with —
          // command table, uiv.* JS API, locator and OCR rules
          reply({ text: DEFAULT_MACRO_AGENT_SYSTEM_PROMPT })
          break
        // Self-test pair: send_chat feeds a prompt to the REAL in-panel chat
        // (the configured model runs it, with its own tools — nothing is
        // simulated), get_chat polls the live transcript. Split in two because
        // a chat run takes minutes and the bridge serializes tool calls — a
        // blocking send_chat would freeze every other tool for its duration.
        case 'send_chat': {
          const msg = call.args && call.args.message
          if (!msg || typeof msg !== 'string') {
            reply({ text: 'Error: send_chat needs a "message" string.', isError: true })
            break
          }
          store.dispatch(act.updateUI({ sidebarTab: 'AiChat' }) as any)
          // the pane mounts on first activation of its tab — let React commit
          await new Promise((resolve) => setTimeout(resolve, 300))
          const chat = getChatForBridge()
          if (!chat) {
            reply({ text: 'Error: the AI Chat pane did not mount — is the side panel open?', isError: true })
            break
          }
          const wantsNewChat = !!(call.args && call.args.new_chat)
          if (chat.running() && !wantsNewChat) {
            reply({ text: 'Error: a chat run is already in progress — poll get_chat until running:false, or pass new_chat:true to abandon it.', isError: true })
            break
          }
          if (wantsNewChat) {
            chat.newChat()
            // newChat() clears processRunning via setState, but send() reads
            // this.state SYNCHRONOUSLY — calling it in the same tick sees the
            // stale processRunning=true and silently no-ops (observed: a
            // benchmark task "ran" for 12 minutes as an empty conversation).
            // Give React a beat to flush before sending.
            await new Promise((resolve) => setTimeout(resolve, 400))
          }
          chat.send(msg)
          reply({ text: 'Chat message sent — the agent is running. Poll get_chat; running:false means the turn finished.' })
          break
        }
        case 'get_chat': {
          const chat = getChatForBridge()
          if (!chat) {
            reply({ text: 'Error: the AI Chat pane is not mounted — send_chat opens it.', isError: true })
            break
          }
          const items = chat.transcript()
          const lines = items.map((it) => `${it.sender}: ${it.message}`).join('\n')
          reply({ text: `running: ${chat.running()}\n--- transcript, ${items.length} items ---\n${lines}` })
          break
        }
        // Self-reload: picks up freshly built files from disk, exactly like
        // the chrome://extensions reload button. This context (the panel)
        // dies with it and cannot reopen itself — sidePanel.open demands a
        // user gesture — so a storage flag asks bg.js on startup to reopen
        // the same app as a normal TAB, which needs no gesture; the bridge
        // then reconnects from the tab and its hello carries the new version.
        case 'reload_extension': {
          try {
            await Ext.storage.local.set({ mcp_reopen_panel_after_reload: true })
          } catch (e) {}
          // NATIVE chrome.runtime.reload, not Ext.runtime — the wrapper's
          // runtime surface has no reload, and the first shipped version of
          // this tool called the undefined method inside a silent catch: the
          // socket never dropped, the fast "reconnect" was the connection
          // that never broke, and only the listener log told the truth.
          const reloadFn =
            (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.reload && (() => chrome.runtime.reload())) ||
            (typeof browser !== 'undefined' && (browser as any).runtime && (browser as any).runtime.reload && (() => (browser as any).runtime.reload()))
          if (!reloadFn) {
            reply({ text: 'Error: runtime.reload is not available in this context — the extension cannot self-reload here.', isError: true })
            break
          }
          reply({ text: 'Reloading the extension from disk NOW. The bridge socket dies with the panel; on startup the panel app reopens as a tab and reconnects — the next hello\'s version says which build is loaded. VERIFY THE DROP: a reconnect without a preceding disconnect means no reload happened. If no reconnect arrives within ~15s, the new build failed to start: a human has to look at chrome://extensions.' })
          setTimeout(reloadFn, 500)
          break
        }
        // Settings pair for independent AI runs (benchmark sweeps across
        // providers/models). Deliberately bounded: switches between providers
        // the user ALREADY configured; API keys are never readable nor
        // settable over the bridge — keys go in via Settings > AI only.
        case 'get_ai_settings': {
          reply({ text: this.aiSettingsReport() })
          break
        }
        // One call runs every self-test of Settings > Desktop Automation and
        // answers with ALL OK / PROBLEMS FOUND plus one line per test — the
        // agent's first move when a macro misbehaves. The tests need the
        // Settings page (the visual chart is drawn into it, the input test
        // listens for the mousemove it caused), so the page opens as a tab
        // with a token in the hash and reports back through storage.local.
        case 'run_selftest': {
          reply(await this.runSelfTest(call.args || {}))
          break
        }
        case 'set_ai_settings': {
          const a = call.args || {}
          if (a.api_key !== undefined || a.apiKey !== undefined || a.key !== undefined || a.token !== undefined) {
            reply({ text: 'Error: API keys cannot be set over the bridge — enter them in Settings > AI. This tool only switches between already-configured providers and models.', isError: true })
            break
          }
          const runningChat = getChatForBridge()
          if (runningChat && runningChat.running()) {
            reply({ text: 'Error: a chat run is in progress — switching AI settings now would change the model between its tool calls. Poll get_chat until running:false first.', isError: true })
            break
          }
          const config = store.getState().config as any
          const upd: any = {}
          if (a.provider !== undefined) {
            if (!['uivision', 'openrouter', 'anthropic', 'local'].includes(a.provider)) {
              reply({ text: `Error: unknown provider "${a.provider}" — valid: uivision, openrouter, anthropic, local.`, isError: true })
              break
            }
            if (a.provider === 'openrouter' && !(config.openRouterAPIKey || '').trim()) {
              reply({ text: 'Error: no OpenRouter API key is stored — the user must add it in Settings > AI before the bridge can switch to OpenRouter.', isError: true })
              break
            }
            if (a.provider === 'anthropic' && !(config.anthropicAPIKey || '').trim()) {
              reply({ text: 'Error: no Anthropic API key is stored — the user must add it in Settings > AI before the bridge can switch to Anthropic.', isError: true })
              break
            }
            upd.aiProvider = a.provider
          }
          if (a.uivision_tier !== undefined) {
            if (!['free', 'pro'].includes(a.uivision_tier)) {
              reply({ text: `Error: uivision_tier must be "free" or "pro", got "${a.uivision_tier}".`, isError: true })
              break
            }
            if (a.uivision_tier === 'pro' && !(config[PRO_KEY_CONFIG_NAME] || '').trim()) {
              reply({ text: 'Error: no Ui.Vision AI PRO key is stored — without it "pro" silently falls back to free quota. The user must enter the PRO key in Settings > AI.', isError: true })
              break
            }
            upd.uivisionTier = a.uivision_tier
          }
          if (a.openrouter_model !== undefined) upd.openRouterModel = String(a.openrouter_model)
          if (a.anthropic_model !== undefined) upd.anthropicModel = String(a.anthropic_model)
          if (a.local_model !== undefined) upd.localAIModel = String(a.local_model)
          if (a.local_base_url !== undefined) upd.localAIBaseURL = String(a.local_base_url)
          if (a.cv_scope !== undefined) {
            if (!['browser', 'desktop'].includes(a.cv_scope)) {
              reply({ text: `Error: cv_scope must be "browser" or "desktop", got "${a.cv_scope}".`, isError: true })
              break
            }
            upd.cvScope = a.cv_scope
          }
          if (a.dev_local_prompt !== undefined) {
            upd.aiDevLocalPrompt = !!a.dev_local_prompt
          }
          if (a.ocr_engine !== undefined) {
            const n = Number(a.ocr_engine)
            if (![1, 2, 3, 90, 98, 99].includes(n)) {
              reply({ text: `Error: ocr_engine must be one of 1, 2, 3 (OCR.Space), 90 (AI provider), 98 (built-in cross-platform), 99 (OS reader), got "${a.ocr_engine}".`, isError: true })
              break
            }
            upd.ocrEngine = n
          }
          if (!Object.keys(upd).length) {
            reply({ text: 'Error: nothing to change — pass provider, uivision_tier, openrouter_model, anthropic_model, local_model, local_base_url, cv_scope, ocr_engine and/or dev_local_prompt.', isError: true })
            break
          }
          store.dispatch(act.updateConfig(upd) as any)
          this.log(`AI settings changed over the bridge: ${JSON.stringify(upd)}`)
          reply({ text: `Applied ${JSON.stringify(upd)}. Takes effect from the NEXT chat/AI call (a new sampling is created when provider|model|baseURL change).\n${this.aiSettingsReport()}` })
          break
        }
        default: {
          const result = await this.getTools().execute(call.tool, call.args || {})
          // create_macro / set_macro leave their (possibly newly created)
          // macro open in the editor — that is now this session's macro
          if (call.tool === 'create_macro' || call.tool === 'set_macro') {
            this.rememberEditorMacro()
          }
          reply(result)
        }
      }
    } catch (e: any) {
      reply({ text: `Tool ${call.tool} failed: ${(e && e.message) || e}`, isError: true })
    } finally {
      this.currentCallId = null
      this.scheduleBannerClear()
    }
  }

  // run_macro / screenshot / browser_snapshot target the active web tab; when none
  // exists (fresh browser, chrome:// page focused) open ui.vision instead of
  // failing — the macro's own open command navigates away as needed
  private runSelfTest = async (args: any): Promise<{ text: string; isError?: boolean }> => {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36)
    const tests = Array.isArray(args.tests) ? args.tests.filter((t: any) => typeof t === 'string').join(',') : ''
    const timeoutMs = Math.min(Math.max(Number(args.timeout_seconds) || 240, 30), 600) * 1000
    const key = 'selftest_result_' + token
    const url = Ext.runtime.getURL('options.html') + '#desktop-automation?selftest=' + token + (tests ? '&tests=' + encodeURIComponent(tests) : '')
    const tab: any = await Ext.tabs.create({ url, active: true })
    const started = Date.now()
    let last: any = null
    try {
      while (Date.now() - started < timeoutMs) {
        await delayMs(500)
        const stored = (await Ext.storage.local.get(key))[key]
        if (stored) last = stored
        if (stored && stored.status === 'done') break
      }
    } finally {
      await Ext.storage.local.remove(key).catch(() => {})
      if (!args.keep_open && tab && tab.id) await Ext.tabs.remove(tab.id).catch(() => {})
    }
    const seconds = Math.round(timeoutMs / 1000)
    if (!last) return { text: 'Error: the Settings page did not report back within ' + seconds + 's - it has to stay the active tab of a visible browser window while the tests run.', isError: true }
    const done = last.status === 'done'
    // same text as the page's "Copy report" button (selfTestReportText),
    // rebuilt here so the panel bundle does not import the settings tab
    const head = !done
      ? 'SELFTEST: TIMED OUT after ' + seconds + 's - ' + last.results.length + ' tests finished'
      : last.allOk ? 'SELFTEST: ALL OK - ' + last.results.length + ' tests passed' : 'SELFTEST: PROBLEMS FOUND - ' + last.problems.length + ' of ' + last.results.length + ' tests failed'
    const lines = last.results.map((r: any) => (r.ok ? '✓ ' : '✗ ') + r.label + ' - ' + r.title + (r.detail ? ': ' + r.detail : ''))
    const tail = done && !args.keep_open ? 'The Settings tab was closed again (keep_open: true leaves it open with the results).' : ''
    return { text: [head, last.environment, ...lines, tail].filter(Boolean).join('\n'), isError: !done }
  }

  private ensureWebTab = async (): Promise<void> => {
    if (await getActiveWebTab()) return
    // an existing web tab beats a new one: a tool call made while a
    // browser-internal page (Settings, the panel tab) is active must not
    // open one more ui.vision tab per call - activate the most recently
    // used web tab instead, the focused window first, any window after
    const focused = ((await Ext.tabs.query({ lastFocusedWindow: true }).catch(() => [])) as any[]).filter(isWebTab)
    const candidates = focused.length ? focused : ((await Ext.tabs.query({}).catch(() => [])) as any[]).filter(isWebTab)
    if (candidates.length) {
      const pick = candidates.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0]
      this.log(`No web tab active - switching to tab "${pick.title || pick.url}"`)
      await Ext.tabs.update(pick.id, { active: true }).catch(() => {})
      if ((Ext as any).windows && pick.windowId !== undefined) await (Ext as any).windows.update(pick.windowId, { focused: true }).catch(() => {})
      return
    }
    this.log('No web tab open — opening https://ui.vision as the play tab')
    const created: any = await Ext.tabs.create({ url: 'https://ui.vision', active: true })
    const deadline = Date.now() + 20000
    while (Date.now() < deadline) {
      const t: any = await Ext.tabs.get(created.id).catch(() => null)
      if (t && t.status === 'complete') return
      await delayMs(250)
    }
    // page still loading after 20s — let the tool proceed against the tab anyway
  }

  // the authoritative macro list is the folder structure (file nodes) — NOT
  // editor.testCases, which is never populated in this build (SET_TEST_CASES
  // has no dispatchers); reading it made list_macros report an empty tree
  private getMacroNodes = (): any[] => getMacroFileNodeList(store.getState() as any) || []

  // display/match name: tree path without leading slash and .json extension
  private nodeDisplayName = (node: any): string =>
    macroDisplayPath(node.relativePath || node.name)

  private listMacros = () => {
    const nodes = this.getMacroNodes()
    if (!nodes.length) {
      return { text: 'No macros stored yet. Use create_macro to build one.' }
    }
    const names = nodes.map(this.nodeDisplayName).sort()
    return { text: `${names.length} macros (folder paths relative to the macro root):\n${names.join('\n')}` }
  }

  // find a macro node by tree path or bare file name; retries once after a
  // storage re-list, because the folder structure can be mid-rebuild
  private resolveMacroNode = async (name: string): Promise<any | null> => {
    const wanted = macroDisplayPath(name).toLowerCase()
    const findNode = () => this.getMacroNodes().find((n: any) => {
      const rel = this.nodeDisplayName(n).toLowerCase()
      const base = macroDisplayPath(n.name).toLowerCase()
      return rel === wanted || base === wanted
    })
    let node = findNode()
    if (!node) {
      // the folder structure rebuilds on storage-change events and can be
      // mid-rebuild (observed: a whole subfolder transiently missing right
      // after a run or a demo restore) — re-list from storage and retry once
      try {
        const entryNodes = await getStorageManager().getMacroStorage().listR()
        store.dispatch(simpleActions.setMacroFolderStructure(entryNodes as any) as any)
        await delayMs(150)
        node = findNode()
      } catch (e) { /* stale structure stays — the caller reports it */ }
    }
    return node || null
  }

  private noSuchMacroError = (name: string): { text: string; isError: true } => {
    const wanted = macroDisplayPath(name).toLowerCase()
    const similar = this.getMacroNodes()
      .map(this.nodeDisplayName)
      .filter((n: string) => n.toLowerCase().includes(wanted))
      .slice(0, 10)
    return {
      text: `Error: no macro named "${name}".${similar.length ? ` Similar names: ${similar.join(', ')}` : ' Use list_macros to see what exists.'}`,
      isError: true
    }
  }

  private openMacro = async (name: string): Promise<{ text: string; isError?: boolean }> => {
    if (!name || typeof name !== 'string') {
      return { text: 'Error: open_macro requires a macro name (see list_macros).', isError: true }
    }

    // try the (possibly stale) tree first; on a verification failure below,
    // re-list from storage and try once more — external file changes (a
    // rename on disk) leave tree nodes pointing at paths that no longer exist
    for (let attempt = 0; attempt < 2; attempt++) {
      const node = attempt === 0
        ? await this.resolveMacroNode(name)
        : await (async () => {
          try {
            const entryNodes = await getStorageManager().getMacroStorage().listR()
            store.dispatch(simpleActions.setMacroFolderStructure(entryNodes as any) as any)
            await delayMs(150)
          } catch (e) { /* stale structure stays; resolve may still work */ }
          return this.resolveMacroNode(name)
        })()
      if (!node) return this.noSuchMacroError(name)

      store.dispatch(act.editTestCase(node.fullPath) as any)
      await delayMs(300) // let the editor state settle before reading it back

      // VERIFY the editor actually switched — editTestCase fails silently
      // when the node's file vanished (renamed/deleted on disk), and
      // reporting "Opened X" while the editor still shows Y once made a
      // session act on the wrong macro
      const editing = (store.getState() as any).editor.editing
      const editingName = (editing.meta && editing.meta.src && editing.meta.src.name) || ''
      if (this.normId(editingName) === this.normId(String(node.name || ''))) {
        this.rememberEditorMacro()
        const macro = await this.getTools().execute('get_macro', {})
        return { text: `Opened "${this.nodeDisplayName(node)}" in the editor.\n${macro.text}` }
      }
    }

    return {
      text: `Error: "${name}" is listed but could not be opened — its file may have been renamed or deleted outside Ui.Vision. The macro list was refreshed; call list_macros and retry.`,
      isError: true
    }
  }

  // cleanup for the scratch macros a session creates. Restricted to the
  // "AI Generated" folder on purpose: an agent may delete what agents create;
  // everything else is the user's and is deleted in the panel, by the user.
  private deleteMacro = async (name: string): Promise<{ text: string; isError?: boolean }> => {
    if (!name || typeof name !== 'string') {
      return { text: 'Error: delete_macro requires a macro name (see list_macros).', isError: true }
    }
    const node = await this.resolveMacroNode(name)
    if (!node) return this.noSuchMacroError(name)
    const displayName = this.nodeDisplayName(node)
    // both separators: browser-mode paths use '/', win32 file mode '\'
    if (!/^AI Generated[\\/]/i.test(displayName)) {
      return {
        text: `Error: "${displayName}" is not in the "AI Generated" folder — delete_macro only removes agent-created macros there. The user deletes everything else in the panel.`,
        isError: true
      }
    }
    await store.dispatch(act.removeTestCase(node.fullPath) as any)
    if (this.normId(this.lastTouchedMacroId) === this.normId(node.fullPath)) {
      this.lastTouchedMacroId = null
    }
    this.log(`Deleted "${displayName}"`)
    return { text: `Deleted "${displayName}" from the "AI Generated" folder.` }
  }
}

let instance: McpBridgeClient | null = null

// moved to ./detect so bg.js can use it without pulling this panel-heavy
// module into the service worker; re-exported to keep existing importers
export { isDevTestBrowser } from './detect'

// Idempotent — called from the side panel's componentDidMount. Subscribes to
// the store so enabling/disabling or editing port/token in Settings takes
// effect immediately, without a panel reload.
export function initMcpBridge (): void {
  if (instance) return
  instance = new McpBridgeClient()
  instance.detectDevBrowser()
  store.subscribe(instance.sync)
  instance.sync()

  // Surface bg.js's open_panel action trail (mcp_reopen_trace) in the Logs
  // tab: those actions run when nobody is watching, so this trail is the
  // ONLY way to see why a panel did or did not come back.
  Ext.storage.local.get('mcp_reopen_trace').then((o: any) => {
    const raw: string[] = (o && o.mcp_reopen_trace) || []
    // bg.js stamps each line with a full ISO timestamp (it needs to sort
    // across worker restarts); here only the last 24h matter, shown as
    // "MM-DD HH:MM:SS" — the 24-char stamp ate half a panel row
    const dayAgo = Date.now() - 24 * 3600 * 1000
    const lines = raw.map((line) => {
      const m = /^(\d{4}-(\d\d-\d\d)T(\d\d:\d\d:\d\d)\.\d+Z)\s*(.*)$/.exec(line)
      if (!m) return line
      if (Date.parse(m[1]) < dayAgo) return null
      return `${m[2]} ${m[3]} ${m[4]}`
    }).filter((l): l is string => !!l)
    if (!lines.length) return
    store.dispatch(act.addLog('mcp', `panel reopen trace:\n${lines.join('\n')}`, { noStack: true }) as any)
  }).catch(() => { /* trace is best-effort */ })
}

// The side panel's STOP button (see renderMcpControlBanner) — no-op when the
// bridge client was never initialised in this context
export function emergencyStopMcp (): void {
  if (instance) instance.emergencyStop()
}

// Passive connection listing for the Settings page: one probe hello, no
// side effects on the panel's real connection. Resolves null when the
// bridge is unreachable/off (the settings then simply show nothing) —
// distinct from testMcpBridge, which turns every state into a verdict
// sentence for the Test button.
export function probeBridgeConnections (): Promise<{ connections: string[], active: string | null } | null> {
  const config = store.getState().config as any
  if (!config.mcpBridgeEnabled) return Promise.resolve(null)
  const port = parseInt(config.mcpBridgePort, 10) || MCP_BRIDGE.DEFAULT_PORT
  const token = '' // bridge 1.7+ pairs by origin

  return isDevTestBrowser().then(dev => new Promise((resolve) => {
    let ws: WebSocket
    let settled = false
    const finish = (r: { connections: string[], active: string | null } | null) => {
      if (settled) return
      settled = true
      try { if (ws) ws.close() } catch (e) { /* already closed */ }
      resolve(r)
    }
    try {
      ws = new WebSocket(`ws://127.0.0.1:${port}/`)
    } catch (e) {
      return finish(null)
    }
    setTimeout(() => finish(null), 3000)
    ws.onopen = () => {
      // devBrowser mirrors the real detection — the token waiver must not
      // be claimed by a store install (same rule as the live client)
      ws.send(JSON.stringify({ type: 'hello', token, probe: true, devBrowser: dev, client: 'uivision-extension' }))
    }
    ws.onmessage = (event) => {
      let msg: any
      try { msg = JSON.parse(String(event.data)) } catch (e) { return }
      if (msg.type === 'hello_ok') {
        finish({
          connections: Array.isArray(msg.connections) ? msg.connections : [],
          active: msg.active || null
        })
      }
    }
    ws.onclose = () => finish(null)
    ws.onerror = () => { /* onclose follows */ }
  }))
}

// The Settings > AI "Test" button. Settings always open in the IDE window,
// where the bridge client does NOT run (it lives in the side panel) — so
// when there is no client here, run a one-shot PROBE instead: same hello,
// plus probe:true, which the bridge answers and closes WITHOUT touching the
// side panel's real connection. (A pre-probe bridge treats it as a normal
// hello — the test still answers correctly, but briefly takes the panel's
// connection, which rejoins on its own within ~15s.)
export function testMcpBridge (): Promise<{ ok: boolean; text: string }> {
  if (instance) return instance.test()

  const config = store.getState().config as any
  const port = parseInt(config.mcpBridgePort, 10) || MCP_BRIDGE.DEFAULT_PORT
  const token = '' // bridge 1.7+ pairs by origin
  if (!config.mcpBridgeEnabled) {
    return Promise.resolve({ ok: false, text: 'The MCP bridge is switched off — enable it first.' })
  }
  // No token pre-check: bridge 1.7+ pairs by origin, so a token-less setup is
  // valid. A bridge that still needs a token answers the probe below with 4003.

  return new Promise((resolve) => {
    let ws: WebSocket
    let settled = false
    const finish = (r: { ok: boolean; text: string }) => {
      if (settled) return
      settled = true
      try { if (ws) ws.close() } catch (e) { /* already closed */ }
      resolve(r)
    }
    try {
      ws = new WebSocket(`ws://127.0.0.1:${port}/`)
    } catch (e) {
      return finish({ ok: false, text: `Could not open a socket to 127.0.0.1:${port}.` })
    }
    setTimeout(() => finish({ ok: false, text: `No answer from 127.0.0.1:${port} within 5 seconds. ${NOT_REACHABLE_HINT}` }), 5000)

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'hello', token, probe: true, client: 'uivision-settings-test' }))
    }
    ws.onmessage = (event) => {
      let msg: any
      try { msg = JSON.parse(String(event.data)) } catch (e) { return }
      if (msg.type === 'hello_ok') {
        // bridge 1.4+ reports every connected browser by label; the label
        // marked active is where tool calls go (select_browser switches)
        const conns: string[] = Array.isArray(msg.connections) ? msg.connections : []
        const who = conns.length
          ? ` Connected: ${conns.map(l => l === msg.active ? `${l} (active)` : l).join(', ')}.`
          : ''
        finish(msg.extensionConnected
          ? { ok: true, text: `Bridge on port ${port} reachable, token correct — side panel connected.${who} Everything works.` }
          : { ok: true, text: `Bridge on port ${port} reachable and the token is correct. Now open the side panel — the bridge client runs there and connects within seconds.` })
      }
    }
    ws.onclose = (event) => {
      if (event && event.code === 4003) {
        finish({ ok: false, text: `The bridge on port ${port} rejected the token. ${TOKEN_HINT}` })
      } else {
        finish({ ok: false, text: `Could not reach the bridge on 127.0.0.1:${port}. ${NOT_REACHABLE_HINT}` })
      }
    }
    ws.onerror = () => { /* onclose follows and reports */ }
  })
}
