// Settings > Desktop Automation > Settings (App) — Ui.Vision for Desktop, the helper app (Rust): a
// native program that runs JS macros against the DESKTOP without a browser
// tab, driven by MCP or this extension. Everything about it lives on this
// one tab so the web-automation majority never meets it: connection,
// status, the settings we push to it, and a test run with live logs.
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import { Button, message } from 'antd'

import * as actions from '@/actions'
import { State } from '@/reducers/state'
import { getXFile } from '@/services/xmodules/xfile'
import { DesktopAppLog, DesktopAppStatus, connectDesktopApp, desktopAppPort, getDesktopAppClient } from '@/services/desktop_app'
import { getXModule2API } from '@/services/xmodules2/native'
import HardDriveHint from './hard_drive_hint'
import { isMac } from '@/common/ts_utils'
import { pullSharedSettings, SyncResult } from '@/services/shared_settings'
import { probeXModules2 } from '@/services/xmodules2/routing'

interface Props {
  config: { [key: string]: any }
  updateConfig: (config: { [key: string]: any }) => void
}

interface OwnState {
  connecting: boolean
  connectMsg: { ok: boolean; text: string } | null
  status: DesktopAppStatus | null
  xfileRootDir: string
  macros: string[]
  logs: DesktopAppLog[]
  testRunning: boolean
  // OPEN-ISSUES 38: last reconciliation with <home>/settings.json + keys.json
  sync: SyncResult | null
  syncing: boolean
}

export const TEST_SCRIPT = `// Desktop app self-test (runs INSIDE the app, no browser involved)
uiv.log('self-test: OS=' + uiv.getVar('!OS'));
var t0 = Date.now();
var m = uiv.findColors('#535353', { scope: 'desktop', area: { x: 100, y: 150, width: 800, height: 300 }, tolerance: 40, timeout: 0, required: false });
uiv.log('findColors on an 800x300 area: ' + m.length + ' regions in ' + Math.round(Date.now() - t0) + ' ms');
uiv.desktop.mouse.move(300, 300);
uiv.sleep(300);
uiv.log('self-test done', 'green');`

class DesktopAppTab extends React.Component<Props, OwnState> {
  state: OwnState = {
    connecting: false,
    connectMsg: null,
    status: null,
    xfileRootDir: '',
    macros: [],
    logs: [],
    testRunning: false,
    sync: null,
    syncing: false
  }
  private off: (() => void) | null = null

  componentDidMount () {
    getXFile().getConfig().then((config: any) => {
      this.setState({ xfileRootDir: (config && config.rootDir) || '' })
    }).catch(() => {})
    this.syncSharedFiles()
    const client = getDesktopAppClient()
    this.off = client.on((msg) => {
      if (msg.type === 'status') this.onStatus(msg)
      if (msg.type === 'disconnected') this.setState({ status: null })
      if (msg.type === 'macros') this.setState({ macros: msg.names || [] })
    })
    client.autoReconnect = true
    if (client.connected && client.status) this.onStatus(client.status)
    else this.connect()
  }

  componentWillUnmount () {
    if (this.off) this.off()
  }

  // reconcile config with the shared files (file wins when newer) and show the result
  syncSharedFiles = () => {
    this.setState({ syncing: true })
    probeXModules2().then(active => {
      if (!active) return { direction: 'none', changed: [], errors: ['Desktop Automation module not connected'], paths: null } as SyncResult
      return pullSharedSettings(this.props.config, this.props.updateConfig)
    }).then(sync => this.setState({ sync, syncing: false })).catch(e => this.setState({ syncing: false, sync: { direction: 'none', changed: [], errors: [String(e && e.message || e)], paths: null } }))
  }

  // the app listens on the MCP bridge port + 1 (Settings > AI); no field of its own
  port = () => desktopAppPort(this.props.config)

  // the extension's home folder (Settings > Desktop Automation > Setup): its macros subfolder
  // is where hard-drive storage keeps .js macros
  homeMacroDir = () => {
    const root = this.state.xfileRootDir
    if (!root) return ''
    return root.replace(/[\\/]+$/, '') + (root.indexOf('\\') >= 0 ? '\\macros' : '/macros')
  }

  onStatus = (st: DesktopAppStatus) => { this.setState({ status: st }) }

  // Connect; when the app is not running, ask the native host to start it
  // (the app IS the host when installed as one: launch_app) and keep trying
  // for a while — a cold start takes several seconds.
  connect = (attempt = 0) => {
    const total = 12 // x 2s
    this.setState({ connecting: true, connectMsg: attempt ? { ok: false, text: `Starting the desktop app… (${attempt * 2}s)` } : null })
    connectDesktopApp(this.port(), '').then((r) => {
      if (r.ok) {
        this.setState({ connecting: false, connectMsg: r })
        getDesktopAppClient().listMacros().then(m => this.setState({ macros: m.names })).catch(() => {})
        return
      }
      if (attempt === 0) {
        return this.launchApp().then((ok) => {
          if (!ok) { this.setState({ connecting: false }); return }
          return new Promise(resolve => setTimeout(resolve, 2000)).then(() => this.connect(1))
        })
      }
      if (attempt < total) {
        return new Promise(resolve => setTimeout(resolve, 2000)).then(() => this.connect(attempt + 1))
      }
      this.setState({ connecting: false, connectMsg: { ok: false, text: `The desktop app was started but did not answer on port ${this.port()} within ${total * 2}s. Look at the app window (its Logs tab) — the port may be taken by another program.` } })
    })
  }

  // Start the app through the native host (launch_app). Resolves true when
  // the host accepted; sets a clear message when this install has no app.
  launchApp = (): Promise<boolean> => {
    this.setState({ connectMsg: { ok: false, text: 'Starting the desktop app…' } })
    return getXModule2API().invoke('launch_app', {}).then(() => true).catch((e: any) => {
      const msg = String(e && e.message || e)
      const text = /not_available/.test(msg)
        ? 'This Desktop Automation install does not include the desktop app yet (plain XModule host). Update Desktop Automation to a version that ships the app (Settings > Desktop Automation > Setup (XModules2) > Check for updates).'
        : /Unknown method|unknown method/i.test(msg)
          ? 'The installed Desktop Automation host is too old to start the app — update it (Settings > Desktop Automation > Setup (XModules2)).'
          : `Could not start the desktop app: ${msg}`
      this.setState({ connecting: false, connectMsg: { ok: false, text } })
      return false
    })
  }

  runTest = (attempt = 0) => {
    this.setState({ testRunning: true, logs: [] })
    getDesktopAppClient().runScript('extension-self-test', TEST_SCRIPT, (l) => {
      this.setState((s) => ({ logs: s.logs.concat([l]).slice(-40) }))
    }).catch((e) => {
      // the app runs one macro at a time: a run that is just finishing wins
      // the race with our click — wait a moment and try once more
      if (attempt === 0 && /already running/i.test(e.message)) {
        return new Promise(resolve => setTimeout(resolve, 800)).then(() => { this.runTest(1); throw new Error('__retry__') })
      }
      throw e
    }).then((r) => {
      this.setState({ testRunning: false })
      if (r.ok) message.success('The desktop app ran the test macro', 3)
      else message.error(`Test run failed: ${r.error}`, 10)
    }).catch((e) => {
      if (e.message === '__retry__') return
      this.setState({ testRunning: false })
      message.error(e.message, 10)
    })
  }

  renderStatus () {
    const { status, connectMsg, connecting } = this.state
    const client = getDesktopAppClient()
    if (!client.connected || !status) {
      return (
        <div style={{ marginTop: 8 }}>
          {connectMsg && !connectMsg.ok && <div style={{ color: '#cf1322' }}>{connectMsg.text}</div>}
          {!connectMsg && !connecting && <div style={{ color: '#6b7280' }}>Not connected.</div>}
        </div>
      )
    }
    const p = status.permissions || {}
    const permText = (v: boolean | undefined) => v === undefined ? 'n/a' : v ? 'granted' : 'NOT granted'
    return (
      <div style={{ marginTop: 8, lineHeight: '22px' }}>
        <div style={{ color: '#166534' }}>Connected: desktop app v{status.appVersion}, native host {status.hostVersion} (port {client.port})</div>
        <div>Run: {status.running ? <b>running "{status.runName}" ({Math.round(status.runtimeS)}s)</b> : `idle${status.lastResult ? ` — last run ${status.lastResult}` : ''}`}</div>
        <div>MCP bridge (app side): {status.mcp.status}{status.mcp.tool ? ` — ${status.mcp.tool}` : ''}</div>
        {isMac() && <div>macOS permissions: Accessibility {permText(p.accessibility)}, Screen Recording {permText(p.screenRecording)}</div>}
        <div style={{ color: '#6b7280' }}>Data folder: {status.dataDir}</div>
      </div>
    )
  }

  render () {
    const { config, updateConfig } = this.props
    const { status, connecting, xfileRootDir, logs, testRunning } = this.state
    const connected = !!getDesktopAppClient().connected && !!status
    return (
      <div className="desktop-app-pane">
        <p style={{ maxWidth: 720 }}>
          Ui.Vision for Desktop is the small helper app that comes with the Desktop Automation module. It runs JavaScript macros against the desktop
          (real mouse, keyboard, screen search, OCR) with no browser tab involved — at native speed, driven by
          this extension or by an AI agent over the MCP bridge. It uses the same <code>uiv</code> API as JS macros
          here (desktop tier only). Optional: nothing changes for web automation if it is off.
        </p>

        <div style={{ maxWidth: 720, marginTop: 12, padding: '10px 12px', background: '#f6f8fa', borderRadius: 6 }}>
          <b>Shared settings files.</b> The app and this extension read the same two files in the Desktop Automation home folder:
          <code>settings.json</code> (storage mode, macro folder, OCR engine, AI provider, MCP bridge, failsafe, animations) and
          <code>keys.json</code> (API keys — keep it private; it ships with <code>ui-vision-ai-free</code> = the free tier).
          Edit them by hand if you like: the newer side wins, unknown keys are kept, invalid JSON is left untouched.
          <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 12 }}>
            {this.state.sync && this.state.sync.paths ? this.state.sync.paths.homeDir : (this.state.xfileRootDir || '(home folder not set yet — Settings > Setup (XModules2))')}
          </div>
          <div className="row" style={{ marginTop: 6, alignItems: 'center' }}>
            <Button size="small" loading={this.state.syncing} onClick={this.syncSharedFiles}>Sync now</Button>
            <span style={{ marginLeft: 8, fontSize: 12, color: '#555' }}>
              {this.state.sync ? (
                this.state.sync.errors.length ? this.state.sync.errors.join('; ')
                  : this.state.sync.direction === 'none' ? 'In sync.'
                    : this.state.sync.direction === 'seeded' ? 'Files created from the current settings.'
                      : (this.state.sync.direction === 'pulled' ? 'Applied from the files: ' : 'Written: ') + this.state.sync.changed.join(', ')
              ) : ''}
            </span>
          </div>
        </div>


        <div className="row" style={{ marginTop: 12 }}>
          <Button onClick={() => this.connect(0)} loading={connecting} disabled={connecting}>
            {connected ? 'Reconnect' : 'Connect'}
          </Button>
          <Button style={{ marginLeft: 8 }} disabled={connecting} onClick={() => { this.launchApp().then((ok) => { if (ok) setTimeout(() => this.connect(1), 2000) }) }}>
            Start the desktop app
          </Button>
          <span style={{ marginLeft: 12, color: '#6b7280' }}>Local port {this.port()} — the MCP bridge port + 1 (Settings &gt; AI).</span>
        </div>
        {this.renderStatus()}

        <h3 style={{ marginTop: 28 }}>Macro folder</h3>
        <HardDriveHint config={config} updateConfig={updateConfig} reason="The desktop app can only see macros that are FILES, so with hard-drive mode both programs share the same macro folder." />
        <div className="row">
          <span>{xfileRootDir ? this.homeMacroDir() : 'not set yet'}</span>
        </div>
        <div style={{ color: '#6b7280', marginTop: 4, maxWidth: 720 }}>
          The <i>macros</i> subfolder of the Desktop Automation home folder: hard-drive storage keeps its .js macros there, so
          the app and this extension see the same files — no sync. To use another folder, change the home folder in{' '}
          <a href="#desktop-automation">Setup (XModules2)</a>.
        </div>
        {/* Nothing is pushed to the app any more (2026-09-09): failsafe corner,
            animations, AI provider, MCP bridge and the macro folder all come
            from the shared settings.json / keys.json that both sides read. */}

        <h3 style={{ marginTop: 28 }}>Test</h3>
        <div className="row">
          <Button onClick={() => this.runTest(0)} loading={testRunning} disabled={!connected || (status ? status.running : false)}>Run test macro in the app</Button>
          <Button style={{ marginLeft: 8 }} danger disabled={!connected || !(status && status.running)} onClick={() => getDesktopAppClient().stop()}>Stop</Button>
          <span style={{ marginLeft: 12, color: '#6b7280' }}>A short desktop-only macro: one screen search and a mouse move, logged live below.</span>
        </div>
        {logs.length > 0 && (
          <pre style={{ marginTop: 8, maxHeight: 220, overflow: 'auto', background: '#f4f6f9', padding: 8, fontSize: 12 }}>
            {logs.map(l => `${l.time} [${l.kind}] ${l.text}`).join('\n')}
          </pre>
        )}

      </div>
    )
  }
}

export default connect(
  (state: State) => ({
    config: (state as any).config
  }),
  (dispatch: Dispatch) => bindActionCreators({ ...actions } as any, dispatch)
)(DesktopAppTab as any)
