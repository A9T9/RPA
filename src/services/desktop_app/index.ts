// Client for the Ui.Vision DESKTOP APP (the standalone Rust app): a local
// WebSocket on 127.0.0.1:<port> the app listens on. Same handshake shape as
// the MCP bridge client — the app trusts our extension Origin, so no token
// is needed in normal installs; a dev build (unpacked, Firefox Developer
// Edition) has no store origin and pairs through the same dev waiver the
// bridge honours (hello.devBrowser); the bridge token is the last fallback.
// Protocol: see xmodule2/app/src/ext.rs.
//   -> hello {runner?, browser?} | get_status | set_settings {settings}
//      | run_script {id, name, script} | stop | list_macros | get_macro {name}
//      | save_macro | ping
//   <- hello_ok | status | log | run_done | macros | macro | error | pong
// The reverse direction (the app hands a BROWSER macro to the extension —
// a plain .js played in the app's Files tab) is the side panel's standing
// link, see panel_link.ts: the app sends run_script / stop to the newest
// connection that said `runner: true` in its hello, the panel answers with
// log lines and run_done.

import { isDevTestBrowser } from '@/services/mcp_bridge/detect'

export const DESKTOP_APP = {
  DEFAULT_PORT: 50889
}

// Resolved once at load: the detection is async, the hello is sent from a
// synchronous onopen. False until it resolves, which only ever means one
// extra reconnect on a dev rig, never a wrong answer on a store install.
let devBrowser = false
isDevTestBrowser().then(dev => { devBrowser = dev }).catch(() => { /* keep false */ })
// The app listens on the MCP bridge port + 1 (one shared setting, so several
// browser profiles cannot fight over a second one): 50888 -> 50889 by default.
export function desktopAppPort (config: any): number {
  const p = parseInt(config && config.mcpBridgePort, 10)
  return (p > 0 && p < 65535 ? p : DESKTOP_APP.DEFAULT_PORT - 1) + 1
}

export type DesktopAppStatus = {
  appVersion: string
  hostVersion: string
  running: boolean
  // app 2.1.35+: the app's JS engine alone (running also counts a browser
  // run the app dispatched to the extension)
  engineRunning?: boolean
  runName: string
  runtimeS: number
  lastResult: string
  mcp: { status: string; tool: string }
  permissions: { accessibility?: boolean; screenRecording?: boolean } | null
  settings: {
    mcpBridgeEnabled: boolean
    mcpBridgePort: number
    playDesktopAnimations: boolean
    macroDir: string
    failsafeCorner: string
  }
  dataDir: string
  macroDir: string
  // OPEN-ISSUES 38: the shared settings files (app 2.1.0+)
  homeDir?: string
  settingsPath?: string
  keysPath?: string
  editor: { name: string; dirty: boolean }
}

export type DesktopAppLog = { seq: number; time: string; kind: string; text: string; color: string; run: string; callId?: string }

// Where a JS macro wants to run. A directive prologue at the top of the
// file — a plain string statement like "use strict", which every JS engine
// ignores — marks a macro for the helper app (Ui.Vision for Desktop):
//     "use desktop-app";
// Played from the macro tree, such a macro goes to the app when the app is
// enabled or the Desktop Automation module can start it; otherwise it runs in
// the browser with a log line saying why. Only the first 20 lines count
// (comments and blank lines may precede it), so a stray string deep in the
// code never changes the target.
export type RunTarget = 'browser' | 'desktop-app'
export const RUN_IN_APP_DIRECTIVE = '"use desktop-app";'
// The directive in the prologue (the string statements before the first
// real one), or null when the macro carries none.
export function scriptDirective (script: string): RunTarget | null {
  const head = String(script || '').split(/\r?\n/).slice(0, 20)
  for (const line of head) {
    const t = line.trim()
    if (!t || t.startsWith('//')) continue
    // An explicit semicolon ends the directive even if another statement or
    // comment follows on this line. Do not require one statement per line.
    if (/^(['"])use desktop-app\1(?:\s*;|\s*$)/.test(t)) return 'desktop-app'
    if (/^(['"])use browser\1(?:\s*;|\s*$)/.test(t)) return 'browser'
    // the first real statement ends the prologue
    if (!/^(['"]).*\1\s*;?$/.test(t)) break
  }
  return null
}
export function scriptRunTarget (script: string): RunTarget {
  return scriptDirective(script) || 'browser'
}

// Naming convention: "<name>.d.js" (shown as "<name>.d" in the tree; d =
// desktop app) is a desktop-app macro too. The helper app lists .d.js
// macros and directive macros only (plus an "all .js" switch), and the
// extension plays either kind in the app. An explicit directive wins over
// the name ("use browser" inside x.d.js runs in the browser).
export const DESKTOP_MACRO_SUFFIX = '.d.js'
export function isDesktopMacroName (name: string): boolean {
  return /\.d(\.js)?$/i.test(String(name || '').trim())
}
export function macroRunTarget (name: string, script: string): RunTarget {
  return scriptDirective(script) || (isDesktopMacroName(name) ? 'desktop-app' : 'browser')
}

// the browser family for the app's log ("sent to chrome 10.0.221") — the
// same reading the MCP bridge makes of the User-Agent
export function browserFamily (): string {
  const s = (typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : '').toLowerCase()
  if (s.includes('firefox')) return 'firefox'
  if (s.includes('edg/')) return 'edge'
  if (s.includes('opr/') || s.includes('opera')) return 'opera'
  if (s.includes('vivaldi')) return 'vivaldi'
  if (s.includes('brave')) return 'brave'
  if (s.includes('chrome')) return 'chrome'
  return 'browser'
}

type Listener = (msg: any) => void

class DesktopAppClient {
  private ws: WebSocket | null = null
  private listeners = new Set<Listener>()
  private helloWaiter: ((r: { ok: boolean; text: string }) => void) | null = null
  status: DesktopAppStatus | null = null
  connected = false
  port = DESKTOP_APP.DEFAULT_PORT
  // reconnect on our own while the feature is enabled (the app restarts,
  // the user starts it later); the tab sets this from the config switch
  autoReconnect = false
  // this context can run browser macros for the app (the side panel sets
  // it; the Settings page has no runner and must not receive run requests)
  runner = false
  private token = ''
  private reconnectTimer: any = null
  private reconnectMs = 2000

  on (fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn) }

  private emit (msg: any) { this.listeners.forEach(fn => { try { fn(msg) } catch (e) { /* listener bug must not kill the socket */ } }) }

  disconnect () {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    const ws = this.ws
    this.ws = null
    this.connected = false
    this.status = null
    if (ws) { try { ws.close() } catch (e) { /* already closed */ } }
    this.emit({ type: 'disconnected' })
  }

  // Connect (or reconnect) and resolve when the app answered the hello.
  connect (port: number, token: string): Promise<{ ok: boolean; text: string }> {
    this.disconnect()
    this.port = port
    this.token = token
    // Firefox delays every new WebSocket to a host:port that recently failed
    // (doubling, up to 60 s) - a retry loop that keeps opening sockets while
    // the app is down locks the whole extension out for a minute afterwards
    // (measured 2026-09-15: the app answered a Node probe in 40 ms while the
    // extension's sockets stayed CONNECTING). So ask the native host whether
    // the port is open first and open a socket only when it is.
    return probeAppPort(port).then(open => {
      if (open === false) return { ok: false, text: `The desktop app is not listening on port ${port} - start it (or check the port in its Settings tab).` }
      // Port known open: the app WILL answer, but Firefox may hold the socket
      // in CONNECTING for several seconds after earlier failures (its
      // reconnect back-off; measured 4.5 s right after an app start) - wait
      // for it instead of declaring the app absent after 4 s.
      return this.openSocket(port, token, open === true ? 15000 : 4000)
    })
  }

  private openSocket (port: number, token: string, helloTimeoutMs = 4000): Promise<{ ok: boolean; text: string }> {
    return new Promise((resolve) => {
      let ws: WebSocket
      try {
        ws = new WebSocket(`ws://127.0.0.1:${port}/`)
      } catch (e: any) {
        resolve({ ok: false, text: `Cannot open ws://127.0.0.1:${port}/ — ${e.message}` })
        return
      }
      this.ws = ws
      let settled = false
      const done = (r: { ok: boolean; text: string }) => { if (!settled) { settled = true; resolve(r) } }
      this.helloWaiter = done
      // which half failed matters: a socket that never opened means nothing
      // listens on the port (app not running, other port, blocked); an open
      // socket without hello_ok means the app is there but did not answer
      const timer = setTimeout(() => done({ ok: false, text: `No answer from the desktop app on port ${port} - ${ws.readyState === WebSocket.OPEN ? 'the socket is open but the app did not answer the hello within ' + Math.round(helloTimeoutMs / 1000) + ' s' : 'nothing accepted the connection within ' + Math.round(helloTimeoutMs / 1000) + ' s (socket state ' + ws.readyState + ') - is it running, and on this port?'}` }), helloTimeoutMs)
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'hello',
          token,
          // the waiver the MCP bridge honours too: an unpacked / temporarily
          // loaded build or Firefox Developer Edition has no store origin
          devBrowser,
          client: 'uivision-extension',
          version: (chrome.runtime.getManifest && chrome.runtime.getManifest().version) || '',
          runner: this.runner,
          browser: browserFamily()
        }))
      }
      ws.onmessage = (event) => {
        let msg: any
        try { msg = JSON.parse(String(event.data)) } catch (e) { return }
        if (msg.type === 'hello_ok') {
          clearTimeout(timer)
          this.connected = true
          this.reconnectMs = 2000
          done({ ok: true, text: `Connected to the Ui.Vision desktop app v${msg.appVersion} (host ${msg.hostVersion}) on port ${port}.` })
        } else if (msg.type === 'status') {
          this.status = msg
        } else if (msg.type === 'error' && !this.connected) {
          clearTimeout(timer)
          done({ ok: false, text: `The desktop app refused the connection: ${msg.message}` })
        }
        this.emit(msg)
      }
      ws.onerror = () => { /* onclose follows with the verdict */ }
      ws.onclose = () => {
        clearTimeout(timer)
        if (this.ws === ws) {
          this.ws = null
          this.connected = false
          this.status = null
          this.emit({ type: 'disconnected' })
          if (this.autoReconnect && !this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null
              if (this.autoReconnect) this.connect(this.port, this.token)
            }, this.reconnectMs)
            this.reconnectMs = Math.min(this.reconnectMs * 2, 30000)
          }
        }
        done({ ok: false, text: `Could not connect to the desktop app on port ${port}. Start the Ui.Vision desktop app (or check the port in its Settings tab).` })
      }
    })
  }

  private send (msg: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false
    this.ws.send(JSON.stringify(msg))
    return true
  }

  // a message TO the app outside the request/reply helpers (the panel link's
  // log lines and run_done for a run the app asked for)
  reply (msg: any): boolean { return this.send(msg) }

  // one request, first matching reply (or error) within timeoutMs
  private request (msg: any, replyType: string, timeoutMs = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.send(msg)) { reject(new Error('not connected to the desktop app')); return }
      const off = this.on((m) => {
        if (m.type === replyType && (msg.id === undefined || m.id === msg.id)) { off(); clearTimeout(t); resolve(m) }
        if (m.type === 'error' && (m.id === undefined || m.id === msg.id)) { off(); clearTimeout(t); reject(new Error(m.message)) }
      })
      const t = setTimeout(() => { off(); reject(new Error(`no ${replyType} from the desktop app within ${timeoutMs}ms`)) }, timeoutMs)
    })
  }

  getStatus (): Promise<DesktopAppStatus> { return this.request({ type: 'get_status' }, 'status') }
  visualChart (action: 'show' | 'status' | 'capture' | 'hide', nonce?: number): Promise<any> {
    return this.request({ type: 'visual_chart', action, nonce, id: 'visual-' + crypto.randomUUID() }, 'visual_chart_result', 15000).then(r => r.result)
  }
  setSettings (settings: Partial<DesktopAppStatus['settings']>): Promise<void> {
    return this.request({ type: 'set_settings', settings }, 'set_settings_ok').then(() => undefined)
  }
  listMacros (): Promise<{ names: string[]; dir: string }> { return this.request({ type: 'list_macros' }, 'macros') }
  stop () { this.send({ type: 'stop' }) }

  // A subroutine call has its own result and log stream. Never accept a
  // completion from another run or leave a caller hanging after disconnect.
  callMacro (request: any, onLog: (l: DesktopAppLog) => void, timeoutMs: number): { promise: Promise<any>; cancel: () => void } {
    const id = 'call-' + crypto.randomUUID()
    const cancel = () => { this.send({ type: 'cancel_macro_call', id }) }
    const promise = new Promise((resolve, reject) => {
      let timer: any
      const off = this.on((m) => {
        if (m.type === 'log' && m.callId === id) onLog(m)
        else if (m.type === 'macro_call_done' && m.id === id) {
          off(); clearTimeout(timer)
          if (m.ok) resolve(m.value === undefined ? null : m.value)
          else reject(new Error(`Desktop macro '${request.name}': ${m.error || 'failed'}`))
        } else if (m.type === 'disconnected') { off(); clearTimeout(timer); reject(new Error('Desktop app disconnected during the macro call')) }
      })
      timer = setTimeout(() => { cancel(); off(); reject(new Error(`Desktop macro '${request.name}' timed out after ${timeoutMs} ms`)) }, timeoutMs)
      if (!this.send({ ...request, type: 'macro_call', id })) { off(); clearTimeout(timer); reject(new Error('Desktop app is not connected')) }
    })
    return { promise, cancel }
  }

  // Run a JS macro IN THE APP; onLog receives every log line the app writes
  // while the run lasts (the app streams its whole log to us).
  runScript (name: string, script: string, onLog?: (l: DesktopAppLog) => void, timeoutMs = 15 * 60 * 1000): Promise<{ ok: boolean; error: string }> {
    const id = 'ext-' + Date.now().toString(36)
    return new Promise((resolve, reject) => {
      if (!this.send({ type: 'run_script', id, name, script })) { reject(new Error('not connected to the desktop app')); return }
      const off = this.on((m) => {
        if (m.type === 'log' && onLog) onLog(m)
        if (m.type === 'run_done' && m.id === id) { off(); clearTimeout(t); resolve({ ok: !!m.ok, error: String(m.error || '') }) }
        if (m.type === 'error' && m.id === id) { off(); clearTimeout(t); reject(new Error(m.message)) }
      })
      const t = setTimeout(() => { off(); reject(new Error('the run did not finish in time')) }, timeoutMs)
    })
  }
}

let client: DesktopAppClient | null = null
export function getDesktopAppClient (): DesktopAppClient {
  if (!client) client = new DesktopAppClient()
  return client
}

// Settings > Desktop Automation > Settings (App) "Connect" button: connect and report, keeping the
// connection open for the status display.
export function connectDesktopApp (port: number, token: string): Promise<{ ok: boolean; text: string }> {
  return getDesktopAppClient().connect(port, token)
}

// Make sure the app is reachable: connect, and if that fails ask the native
// host (the app itself, when installed as the host) to launch it, then retry
// for a while. Shared by the Settings tab and the macro tree's
// "Play in Desktop App".
// null = no host to ask (or a host older than 2.1.32): the caller opens the
// socket as before; true/false = the host's 300 ms TCP verdict
async function probeAppPort (port: number): Promise<boolean | null> {
  try {
    const m = await import('@/services/xmodules2/native')
    const r: any = await m.getXModule2API().invoke('probe_port', { port })
    return r && typeof r.open === 'boolean' ? r.open : null
  } catch (e) { return null }
}

// opts.background: the app is being started for a macro (uiv.app.run) - it
// opens minimized so it does not sit on top of what the macro watches
export function ensureDesktopApp (config: any, onProgress?: (text: string) => void, opts: { background?: boolean } = {}): Promise<{ ok: boolean; text: string }> {
  const client = getDesktopAppClient()
  const port = desktopAppPort(config)
  const token = '' // the app trusts the extension origin; no token
  if (client.connected) return Promise.resolve({ ok: true, text: 'connected' })
  client.autoReconnect = true
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  const launch = () => import('@/services/xmodules2/native').then(m => m.getXModule2API().invoke('launch_app', { background: !!opts.background })).catch(() => null)
  return probeAppPort(port).then(open => {
    if (open === null) {
      // no host probe: the old socket-based loop
      const attempt = (n: number): Promise<{ ok: boolean; text: string }> => client.connect(port, token).then((r) => {
        if (r.ok || n >= 6) return r
        if (onProgress) onProgress(n === 0 ? 'Desktop app not running - asking the native host to start it…' : `Waiting for the desktop app (${n})…`)
        return (n === 0 ? launch() : Promise.resolve(null)).then(() => wait(n === 0 ? 3000 : 2500)).then(() => attempt(n + 1))
      })
      return attempt(0)
    }
    if (open) return client.connect(port, token)
    if (onProgress) onProgress('Desktop app not running - asking the native host to start it…')
    return launch().then(async () => {
      // the app binds its port ~0.5 s after start; poll the host, not sockets
      for (let i = 0; i < 40; i++) {
        await wait(500)
        if (await probeAppPort(port)) return client.connect(port, token)
        if (onProgress && i % 4 === 3) onProgress(`Waiting for the desktop app (${(i + 1) / 4})…`)
      }
      return { ok: false, text: `The desktop app did not open port ${port} within 20 s after the native host started it - check its window for an error, or start it by hand.` }
    })
  })
}
