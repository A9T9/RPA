// The side panel's STANDING link to Ui.Vision for Desktop (the helper app).
//
// The panel dials the app when it opens and keeps reconnecting quietly (a
// refused local connect every 2..30 s while no app runs — nothing is logged).
// It exists for the reverse direction of desktop_app/index.ts: a plain .js
// macro played in the APP's Files tab is a BROWSER macro, and the app has no
// page — so it hands the macro's NAME to the newest panel that announced
// itself as a runner (hello {runner: true}), the way a bookmark or the
// command line starts one, and the panel plays it from its own macro tree.
// Both programs point at the SAME files on disk (hard-drive storage in the
// XModule home folder); when they do not, the app gets an error that says so
// instead of a silently different macro.
//   app -> panel: run_macro {id, name} | stop
//   panel -> app: log {id, kind, text} (streamed while the run lasts)
//                 | run_done {id, ok, error} | error {id, message}
// The app shows the streamed log in its Logs tab and the result in its
// status pill. Only ONE panel per browser is a runner; the app picks the
// newest connected one when several browsers are open.
import * as act from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { PLAYER_STATUS } from '@/common/constant'
import { getActiveWebTab, pickBridgeTab } from '@/common/tab_utils'
import { delayMs } from '@/common/utils'
import Ext from '@/common/web_extension'
import { isScriptRunning, runScript, stopScript } from '@/modules/script_runner'
import { getMacroFileNodeList } from '@/recomputed'
import { store } from '@/redux'
import { StorageStrategyType, getStorageManager } from '@/services/storage'
import { getXFile } from '@/services/xmodules/xfile'
import { desktopAppPort, getDesktopAppClient, macroRunTarget } from './index'
import { macroCallName, callArea } from './call_contract'
import { viewportProbe } from './call_viewport'

let started = false
let browserCallId: string | null = null
let browserCallCancelled = false

const configuredPort = (): number => {
  const cfg: any = (store.getState() as any).config || {}
  return desktopAppPort(cfg)
}

const addLog = (type: string, text: string) => { store.dispatch(act.addLog(type, text) as any) }

// run_macro's rule (mcp_bridge): a macro needs a web page to act on; a fresh
// browser (or one sitting on a chrome:// page) has none — open one
const ensureWebTab = async (): Promise<void> => {
  if (await getActiveWebTab()) return
  addLog('status', '[app] no web tab open — opening https://ui.vision as the play tab')
  const created: any = await Ext.tabs.create({ url: 'https://ui.vision', active: true })
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const t: any = await Ext.tabs.get(created.id).catch(() => null)
    if (t && t.status === 'complete') return
    await delayMs(250)
  }
}

// a tree path the way both sides spell it: forward slashes, no leading
// slash, no .js/.json, case-folded (the app lists "Demo/x.js", the tree
// node carries "Demo\x.js" on win32 file mode or "/Demo/x")
const normPath = (s: string): string =>
  String(s || '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.(js|json)$/i, '').toLowerCase()

// the extension's hard-drive macro folder: <xfile root>/macros (the rule of
// Settings > Desktop Automation > Settings (App))
const extensionMacroDir = async (): Promise<string> => {
  const config: any = await getXFile().getConfig().catch(() => null)
  const root = String((config && config.rootDir) || '')
  if (!root) return ''
  return root.replace(/[\\/]+$/, '') + (root.indexOf('\\') >= 0 ? '\\macros' : '/macros')
}

const sameDir = (a: string, b: string): boolean => {
  const n = (s: string) => s.replace(/\\/g, '/').replace(/\/+$/, '')
  const x = n(a); const y = n(b)
  // Windows paths (a backslash or a drive letter) compare case-insensitively
  const win = /\\|^[a-zA-Z]:/.test(a) || /\\|^[a-zA-Z]:/.test(b)
  return win ? x.toLowerCase() === y.toLowerCase() : x === y
}

// the tree node for a folder-relative name; re-lists from storage once on a
// miss (the folder structure can be mid-rebuild — same as the bridge)
const findMacroNode = async (name: string): Promise<any | null> => {
  const wanted = normPath(name)
  const find = () => (getMacroFileNodeList(store.getState() as any) || []).find((n: any) => normPath(n.relativePath || n.name || '') === wanted)
  let node = find()
  if (!node) {
    try {
      const entryNodes = await getStorageManager().getMacroStorage().listR()
      store.dispatch(simpleActions.setMacroFolderStructure(entryNodes as any) as any)
      await delayMs(150)
      node = find()
    } catch (e) { /* stale structure stays — reported below */ }
  }
  return node || null
}

// the panel's log, from a marker on: the id of the last line seen (the log
// is an array of {id, type, text}; a cleared log simply restarts the marker)
const newLogLines = (lastId: string | null): { lines: any[]; lastId: string | null } => {
  const logs: any[] = (store.getState() as any).logs || []
  if (!logs.length) return { lines: [], lastId: null }
  if (lastId === null) return { lines: [], lastId: logs[logs.length - 1].id }
  const idx = logs.findIndex((l: any) => l.id === lastId)
  const lines = idx === -1 ? [] : logs.slice(idx + 1)
  return { lines, lastId: logs[logs.length - 1].id }
}

const runForApp = async (msg: any) => {
  const client = getDesktopAppClient()
  const id = msg.id
  const name = String(msg.name || '')
  const fail = (message: string) => { addLog('error', `[app] ${message}`); client.reply({ type: 'error', id, message }) }
  if (!name) return fail('run_macro: no macro name')
  if (isScriptRunning()) return fail('a macro is already running in the browser — stop it in the side panel first')
  // An inline script the app received (an MCP run_macro carrying "use
  // browser") runs as-is; a named macro comes from the shared folder.
  let script: string | null = typeof msg.script === 'string' && msg.script.trim() ? msg.script : null
  if (script === null) {
    // the same files on disk, or say so: hard-drive storage ...
    if (getStorageManager().getCurrentStrategyType() !== StorageStrategyType.XFile) {
      return fail(`cannot play "${name}" for the desktop app: the browser extension keeps its macros in browser storage, not on disk — switch it to hard-drive storage in the XModule home folder so both programs see the same files`)
    }
    // ... in the app's folder
    const appDir = String((client.status && client.status.macroDir) || '')
    const extDir = await extensionMacroDir()
    if (appDir && extDir && !sameDir(appDir, extDir)) {
      return fail(`cannot play "${name}" for the desktop app: the app's macro folder (${appDir}) is not the extension's (${extDir}) — point both at the same XModule home folder (app: Settings > Macro folder; extension: Settings > Desktop Automation > Settings (App))`)
    }
    const node = await findMacroNode(name)
    if (!node) return fail(`"${name}" is not in the browser extension's macro tree (${extDir || 'hard-drive storage'}) — the app and the extension must use the same macro folder`)
    const macro: any = await getStorageManager().getMacroStorage().read(node.fullPath, 'Text').catch(() => null)
    const data = (macro && macro.data) || {}
    script = typeof data.script === 'string' ? data.script : (typeof data.Script === 'string' ? data.Script : null)
  }
  if (!script || !script.trim()) return fail(`"${name}" is not a JavaScript macro (the desktop app runs .js macros only)`)

  addLog('status', `[app] Ui.Vision for Desktop asks the browser to run "${name}"`)
  store.dispatch(act.updateUI({ sidebarTab: 'Logs' }) as any)
  // stream the panel's log to the app while the run lasts; the app prefixes
  // the lines with [browser] in its own Logs tab
  let marker = newLogLines(null).lastId
  const flush = () => {
    const r = newLogLines(marker)
    marker = r.lastId
    // the panel's own [app] lines are meant for the panel; the app prefixes [browser] itself
    for (const l of r.lines) client.reply({ type: 'log', id, kind: String(l.type || 'info'), text: String(l.text || '').replace(/^\[app\] /, '') })
  }
  const streamer = setInterval(flush, 300)
  let result: { ok: boolean; error: string | null; errorLine?: number | null }
  try {
    await ensureWebTab()
    result = await runScript(script, { name })
  } catch (e: any) {
    result = { ok: false, error: (e && e.message) || String(e) }
  } finally {
    clearInterval(streamer)
  }
  flush()
  const error = result.ok ? '' : `${result.error || 'failed'}${result.errorLine ? ` (script line ${result.errorLine})` : ''}`
  client.reply({ type: 'run_done', id, ok: !!result.ok, error })
}

// A desktop subroutine call resolves in the browser's own macro storage,
// including browser storage. It does not reset or edit the selected macro.
const callForApp = async (msg: any): Promise<void> => {
  const client = getDesktopAppClient()
  const id = String(msg.id || '')
  let streamer: any = null
  let previousEditing: any = null
  let previousCurrentMacro: any = null
  let flush = () => {}
  try {
    const name = macroCallName(msg.name)
    const player: any = (store.getState() as any).player
    if (isScriptRunning() || browserCallId || (player && player.status !== PLAYER_STATUS.STOPPED)) throw new Error('The browser is busy running another macro; a call back into a waiting parent is not supported')
    browserCallId = id
    browserCallCancelled = false
    previousEditing = (store.getState() as any).editor.editing
    previousCurrentMacro = (store.getState() as any).editor.currentMacro
    const node = await findMacroNode(name)
    if (!node) throw new Error(`Browser macro '${name}' was not found in the extension's macro storage`)
    const macro: any = await getStorageManager().getMacroStorage().read(node.fullPath, 'Text')
    const data = macro.data || {}
    const script = data.script || data.Script
    if (typeof script !== 'string' || !script.trim()) throw new Error(`'${name}' is not a JavaScript macro`)
    if (macroRunTarget(name, script) !== 'browser') throw new Error(`'${name}' is a desktop macro; uiv.browser.run needs a browser JavaScript macro`)
    addLog('status', `[desktop → browser: ${name}] called`)
    let marker = newLogLines(null).lastId
    flush = () => {
      const r = newLogLines(marker); marker = r.lastId
      for (const l of r.lines) client.reply({ type: 'browser_call_log', id, kind: l.type, text: `[${name}] ${l.text}`, time: l.createTime, seq: l.id })
    }
    streamer = setInterval(flush, 150)
    await ensureWebTab()
    // Keep calls on the receiving panel's automation tab, even when the
    // desktop caller or another browser window has taken foreground focus.
    const picked = await pickBridgeTab()
    const tab: any = picked.tab
    if (!tab) throw new Error('No browser tab is available')
    if (picked.note) addLog('info', picked.note)
    const viewport = await viewportProbe(tab.id)
    const context = { scope: 'browser', area: callArea(msg.options && msg.options.area, viewport), viewport, tabId: tab.id, windowId: tab.windowId }
    if (browserCallCancelled) throw new Error('Browser submacro call was cancelled')
    const result = await runScript(script, { name, args: msg.args || {}, context, macroId: node.fullPath, tabId: tab.id })
    flush()
    client.reply({ type: 'browser_call_done', id, ok: result.ok, value: result.value, error: result.ok ? '' : `${result.error || 'failed'}${result.errorLine ? ` (line ${result.errorLine})` : ''}` })
  } catch (e: any) {
    flush()
    client.reply({ type: 'browser_call_done', id, ok: false, error: e.message || String(e) })
  } finally {
    if (streamer) clearInterval(streamer)
    if (previousEditing && (store.getState() as any).editor.editing !== previousEditing) store.dispatch(act.setEditing(previousEditing) as any)
    if (previousEditing && (store.getState() as any).editor.currentMacro !== previousCurrentMacro) store.dispatch({ type: 'setCurrentMacro', data: previousCurrentMacro } as any)
    if (browserCallId === id) browserCallId = null
  }
}

// Called once when the side panel mounts. Idempotent.
export function initDesktopAppPanelLink (): void {
  if (started) return
  started = true
  const client = getDesktopAppClient()
  client.runner = true
  client.autoReconnect = true
  client.on((m: any) => {
    if (!m || typeof m !== 'object') return
    if (m.type === 'browser_call') { callForApp(m).catch(() => {}) }
    else if (m.type === 'cancel_browser_call' && m.id === browserCallId) { browserCallCancelled = true; stopScript() }
    else if (m.type === 'disconnected' && browserCallId) { browserCallCancelled = true; stopScript() }
    else if (m.type === 'run_macro') { runForApp(m).catch(() => { /* reported to the app already */ }) }
    else if (m.type === 'stop') { if (isScriptRunning()) { addLog('status', '[app] Stop pressed in Ui.Vision for Desktop'); stopScript() } }
    else if (m.type === 'status' && m.settings && typeof m.settings.playDesktopAnimations === 'boolean') {
      // "Play desktop animations" is ONE setting on both sides (shared
      // settings.json); the file is only pulled at boot, so a change made in
      // the app's Settings tab reaches the running panel through its status
      // push — otherwise a browser run started from the app kept the old value
      const cfg: any = (store.getState() as any).config || {}
      if ((cfg.playDesktopAnimations !== false) !== m.settings.playDesktopAnimations) {
        store.dispatch(act.updateConfig({ playDesktopAnimations: m.settings.playDesktopAnimations }) as any)
      }
    }
  })
  // connect now (silently — a missing app is the normal case for most users)
  // and follow a port change made in Settings
  let port = configuredPort()
  client.connect(port, '').catch(() => { /* onclose reconnects */ })
  setInterval(() => {
    const p = configuredPort()
    if (p !== port) { port = p; client.connect(port, '').catch(() => { /* onclose reconnects */ }) }
  }, 5000)
}
