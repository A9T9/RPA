// Settings > Desktop Automation (formerly "XModules 2") — the single native
// app that serves file access, real input, desktop vision and OCR. Since
// 10.0.151 it is REQUIRED for all native features: the classic XModules
// generation is no longer supported (Windows keeps only the classic
// ScreenCapture selection helper, see Settings > Vision).
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import { Button, message } from 'antd'

import * as actions from '@/actions'
import { getXModule2API, diagnoseHostConnectError, PermissionStatus } from '@/services/xmodules2/native'
import { goUivUrl } from '@/common/uiv_link'
import { getNativeCVAPI } from '@/services/desktop'
import { getNativeXYAPI, MouseButton, MouseEventType } from '@/services/xy'
import { getDesktopDipAnchor, dipToPhysPoint, getDesktopCaptureHint } from '@/services/desktop_dip'
import { probeXModules2, xmodules2Active, getXModuleVersion, xmoduleVersionOutdated, MIN_XMODULE2_VERSION } from '@/services/xmodules2/routing'
import { searchImageInExtension as searchV2 } from '@/services/vision2/adaptor'
import { getXFile } from '@/services/xmodules/xfile'
import { Input } from 'antd'
import { isLinux, isMac } from '@/common/ts_utils'
import { State } from '@/reducers/state'
import Ext from '@/common/web_extension'
import HardDriveHint from './hard_drive_hint'
import VisualCompatibility from './visual_compatibility'
import { colorVerdict, colorsCorrected, worstPatch } from '@/services/visual_compatibility/analyze'
import { getDesktopAppClient, ensureDesktopApp } from '@/services/desktop_app'
import { TEST_SCRIPT as APP_TEST_SCRIPT } from './desktop_app'

type TestResult = { ok: boolean; title: string; detail: string }
// One run of every test on this page — the "Run all self-tests" button and
// the MCP tool run_selftest. The bridge opens this page as a tab with
// #desktop-automation?selftest=<token> and reads the summary back from
// storage.local under 'selftest_result_<token>': the tests need this page
// (the visual chart is drawn into it, the input test listens for the
// mousemove it caused), so they cannot run in the panel. The plain-text
// report (selfTestReportText) is what the tool returns and what "Copy
// report" puts on the clipboard — for support, the forum, or an AI without
// MCP access.
type SelfTestEntry = TestResult & { id: string; label: string; skipped?: boolean; report?: any }
type SelfTestSummary = { status: 'running' | 'done'; startedAt: string; finishedAt: string | null; allOk: boolean; problems: string[]; results: SelfTestEntry[]; environment: string }
const SELF_TEST_IDS = ['host', 'wasm', 'capture', 'input', 'file', 'visual', 'app']
export function selfTestReportText (s: SelfTestSummary): string {
  const head = s.status !== 'done'
    ? 'SELFTEST: STILL RUNNING - ' + s.results.length + ' of ' + SELF_TEST_IDS.length + ' tests finished'
    : s.allOk ? 'SELFTEST: ALL OK - ' + s.results.length + ' tests passed' : 'SELFTEST: PROBLEMS FOUND - ' + s.problems.length + ' of ' + s.results.length + ' tests failed'
  const lines = s.results.map((r, i) => (i + 1) + '. ' + (r.ok ? '✓ ' : '✗ ') + r.label + ' - ' + r.title + (r.detail ? ': ' + r.detail : ''))
  return [head, s.environment, ...lines, 'Checked ' + s.startedAt].join('\n')
}

const OS_KEY = /windows/i.test(navigator.userAgent) ? 'win' : /mac/i.test(navigator.userAgent) ? 'mac' : 'linux'
const OS_LABEL = OS_KEY === 'win' ? 'Windows' : OS_KEY === 'mac' ? 'macOS' : 'Linux'

interface Props {
  config: { [key: string]: any }
  updateConfig: (config: { [key: string]: any }) => void
}

interface OwnState {
  hostTest: TestResult | null
  fileTest: TestResult | null
  fileTesting: boolean
  hostTesting: boolean
  wasmTest: TestResult | null
  wasmTesting: boolean
  rootDir: string
  rootDirDirty: boolean
  routingActive: boolean
  hostVersion: string
  // Direct install check, independent of the async routing probe: answers
  // even before the probe's first success.
  daStatus: 'checking' | 'installed' | 'missing'
  daVersion: string
  perms: PermissionStatus | null
  permBusy: string | null
  captureTest: TestResult | null
  captureTesting: boolean
  capturePreview: string | null
  inputTest: TestResult | null
  inputTesting: boolean
  visualTesting: boolean
  visualAutoToken: string | null
  selfTestRunning: boolean
  selfTestSummary: SelfTestSummary | null
}

// Tiny self-contained fixture: a patterned tile drawn on canvas, searched in
// a larger canvas that embeds it at a known position. Proves worker + wasm
// load + match end-to-end inside the real extension context.
const makeWasmSelfTest = (): { patternUrl: string; targetUrl: string } => {
  const drawTile = (ctx: CanvasRenderingContext2D, ox: number, oy: number) => {
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? `rgb(${40 + x * 30},80,200)` : `rgb(220,${180 - y * 20},60)`
        ctx.fillRect(ox + x * 4, oy + y * 4, 4, 4)
      }
    }
  }
  const pat = document.createElement('canvas')
  pat.width = 20; pat.height = 20
  drawTile(pat.getContext('2d') as CanvasRenderingContext2D, 0, 0)

  const target = document.createElement('canvas')
  target.width = 120; target.height = 90
  const tctx = target.getContext('2d') as CanvasRenderingContext2D
  tctx.fillStyle = '#888'
  tctx.fillRect(0, 0, 120, 90)
  drawTile(tctx, 70, 40)

  return { patternUrl: pat.toDataURL(), targetUrl: target.toDataURL() }
}

class XModules2Tab extends React.Component<Props, OwnState> {
  state: OwnState = {
    hostTest: null,
    hostTesting: false,
    wasmTest: null,
    wasmTesting: false,
    rootDir: '',
    rootDirDirty: false,
    routingActive: xmodules2Active(),
    hostVersion: getXModuleVersion(),
    daStatus: 'checking',
    daVersion: '',
    perms: null,
    permBusy: null,
    captureTest: null,
    captureTesting: false,
    capturePreview: null,
    fileTest: null,
    fileTesting: false,
    inputTest: null,
    inputTesting: false,
    visualTesting: false,
    visualAutoToken: null,
    selfTestRunning: false,
    selfTestSummary: null
  }

  private permTimer: number | null = null

  componentDidMount () {
    // The home directory is the same stored value the classic FileAccess
    // XModule used, so an existing path carries over with no migration step.
    getXFile().getConfig().then((config: any) => {
      this.setState({ rootDir: (config && config.rootDir) || '' })
    }).catch(() => {})
    probeXModules2().then(active => this.setState({ routingActive: active, hostVersion: getXModuleVersion() }))
    this.checkInstalled()
    // opened by the MCP bridge's run_selftest: start right away, report by token
    const query = new URLSearchParams(window.location.hash.split('?')[1] || '')
    const token = query.get('selftest')
    if (token) window.setTimeout(() => this.runSelfTest(token, query.get('tests') || ''), 300)
    if (isMac()) {
      this.refreshPerms()
      // macOS applies fresh grants only to NEW processes, so each poll
      // reconnects for a truthful read — the ~10ms respawn is the design win
      // that makes live red->green flips possible at all.
      this.permTimer = window.setInterval(this.refreshPerms, 3000)
    } else if (isLinux()) {
      // Wayland capture permission (XDG portal) — the host caches the
      // verdict, so one fetch is enough; Request access refreshes it.
      this.refreshPerms()
    }
  }

  private visualResolve: ((r: { report?: any, error?: string }) => void) | null = null

  onVisualResult = (r: { report?: any, error?: string }) => {
    const f = this.visualResolve
    this.visualResolve = null
    if (f) f(r)
  }

  runSelfTest = async (token: string | null, testsCsv = '') => {
    if (this.state.selfTestRunning) return
    const wanted = testsCsv.split(',').map(s => s.trim()).filter(Boolean)
    const want = (id: string) => !wanted.length || wanted.includes(id)
    const startedAt = new Date().toISOString()
    const results: SelfTestEntry[] = []
    const browser = (navigator.userAgent.match(/(Firefox|Edg|Chrome)\/[\d.]+/) || ['browser'])[0]
    const summary = (status: 'running' | 'done'): SelfTestSummary => ({
      status, startedAt, finishedAt: status === 'done' ? new Date().toISOString() : null,
      allOk: results.every(r => r.ok), problems: results.filter(r => !r.ok).map(r => r.label + ': ' + r.title), results,
      environment: 'Ui.Vision ' + Ext.runtime.getManifest().version + ', ' + browser + ', ' + OS_KEY + ', host ' + (this.state.hostVersion || getXModuleVersion() || 'not connected') + ', devicePixelRatio ' + window.devicePixelRatio
    })
    const publish = async (status: 'running' | 'done') => {
      const s = summary(status)
      this.setState({ selfTestSummary: s })
      if (token) await Ext.storage.local.set({ ['selftest_result_' + token]: s }).catch(() => {})
    }
    // the existing test methods report through component state; wait for it
    const waitState = (testing: string, result: string) => new Promise<TestResult>((resolve, reject) => {
      const t0 = Date.now()
      const tick = () => {
        const s: any = this.state
        if (!s[testing] && s[result]) return resolve(s[result])
        if (Date.now() - t0 > 90000) return reject(new Error('no result within 90 s'))
        window.setTimeout(tick, 100)
      }
      window.setTimeout(tick, 150)
    })
    const step = async (id: string, label: string, fn: () => Promise<TestResult & { skipped?: boolean; report?: any }>) => {
      if (!want(id)) return
      try { results.push({ id, label, ...(await fn()) }) }
      catch (e) { results.push({ id, label, ok: false, title: label + ' did not finish', detail: String((e as any)?.message || e) }) }
      await publish('running')
    }
    this.setState({ selfTestRunning: true, selfTestSummary: null })
    await publish('running')
    try {
      await step('host', 'Native host connection', () => { this.testHost(); return waitState('hostTesting', 'hostTest') })
      await step('wasm', 'WASM image search engine', () => { this.testWasm(); return waitState('wasmTesting', 'wasmTest') })
      await step('capture', 'Desktop screenshot', () => { this.testCapture(); return waitState('captureTesting', 'captureTest') })
      await step('input', 'Real mouse input', () => { this.testDesktopInput(); return waitState('inputTesting', 'inputTest') })
      await step('file', 'Home directory read/write', () => {
        if (!this.state.rootDir) return Promise.resolve({ ok: true, skipped: true, title: 'Skipped - no home directory set', detail: 'Enter a folder under Home directory and Save to include this test.' })
        this.testFileRW()
        return waitState('fileTesting', 'fileTest')
      })
      await step('visual', 'Visual compatibility', () => new Promise<{ report?: any, error?: string }>(resolve => {
        this.visualResolve = resolve
        this.setState({ visualAutoToken: (token || 'ui') + '-' + Date.now() })
      }).then(r => {
        if (r.error || !r.report) return { ok: false, title: 'Visual compatibility check did not finish', detail: r.error || 'no report' }
        const v = (x: any) => x === 'pass' ? 'passed' : x === 'corrected' ? 'corrected' : x === 'mismatch' ? 'DIFFERS' : 'not checked'
        const rep = r.report
        // A colour verdict other than "passed" carries its worst patch: that
        // number is what support or an AI needs, and the JSON on disk is the
        // only other place it exists.
        const colors = (p: any) => { const c = colorVerdict(p, rep.paths); return v(c) + (c === 'pass' || !p.color ? '' : ' (' + worstPatch(p.color) + ')') }
        const corrected = colorsCorrected(rep.paths)
        return {
          ok: rep.status === 'Checks passed',
          title: rep.status,
          detail: rep.paths.map((p: any) => p.label + ': colors ' + colors(p) + ', scaling ' + v(p.geometry?.status) + (p.coordinates ? ', coordinates ' + v(p.coordinates?.status) : '') + (p.error ? ' -> ' + p.error : '')).join(' | ')
            + (corrected ? ' | Corrected = this display is color-managed: the browser renders CSS colors through the monitor profile, the desktop app does not. Desktop-scope findImage/findColor of browser content see the on-screen values (read them with uiv.pixels, or force the browser to sRGB).' : '')
            + (rep.file ? ' | Full measurements: ' + rep.file : ''),
          report: {
            status: rep.status, checkedAt: rep.checkedAt,
            environment: { dpr: rep.environment?.dpr, zoom: rep.environment?.zoom, host: rep.environment?.host },
            paths: rep.paths.map((p: any) => ({ label: p.label, status: p.status, color: p.color?.status, geometry: p.geometry?.status, coordinates: p.coordinates?.status, scale: p.geometry ? [p.geometry.scaleX, p.geometry.scaleY] : undefined, error: p.error }))
          }
        }
      }))
      await step('app', 'Desktop app test macro', async () => {
        const c = await ensureDesktopApp(this.props.config, () => {})
        if (!c.ok) throw new Error(c.text)
        const logs: string[] = []
        const r = await getDesktopAppClient().runScript('extension-self-test', APP_TEST_SCRIPT, l => { logs.push(l.text) })
        return r.ok
          ? { ok: true, title: 'The desktop app ran the test macro', detail: logs.slice(-3).join(' | ') }
          : { ok: false, title: 'The desktop app test macro failed', detail: r.error }
      })
    } finally {
      this.setState({ selfTestRunning: false })
      await publish('done')
    }
  }

  renderSelfTestSummary (s: SelfTestSummary) {
    const done = s.status === 'done'
    const color = !done ? '#d46b08' : s.allOk ? '#389e0d' : '#cf1322'
    const head = !done
      ? 'Running… ' + s.results.length + ' of ' + SELF_TEST_IDS.length + ' tests finished - hands off the mouse'
      : s.allOk ? 'ALL OK - ' + s.results.length + ' tests passed' : 'PROBLEMS FOUND - ' + s.problems.length + ' of ' + s.results.length + ' tests failed'
    return (
      <div style={{ marginTop: '8px' }} data-testid="selftest-summary">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 'bold', color }}>{head}</span>
          {done && (
            <Button size="small" onClick={() => navigator.clipboard.writeText(selfTestReportText(s)).then(() => message.success('Report copied - paste it to support, the forum, or your AI assistant.'), e => message.error(String(e)))}>
              Copy report
            </Button>
          )}
        </div>
        <ol style={{ margin: '6px 0 0', paddingLeft: '22px' }}>
          {s.results.map(r => (
            <li key={r.id} style={{ color: r.ok ? undefined : '#cf1322' }}>
              {r.ok ? '✓' : '✗'} <b>{r.label}</b> - {r.title}{r.detail ? ': ' + r.detail : ''}
            </li>
          ))}
        </ol>
      </div>
    )
  }

  componentWillUnmount () {
    if (this.permTimer !== null) window.clearInterval(this.permTimer)
  }

  refreshPerms = () => {
    // Never reconnect while a test or request is mid-flight — a reconnect
    // kills every in-flight call on the shared connection (the capture
    // test's multi-second file read included). And only reconnect while
    // something is still red: fresh grants only reach NEW host processes,
    // so the respawn is what makes the red->green flip visible — but once
    // everything is green, polling the existing connection is enough.
    if (this.state.permBusy || this.state.captureTesting || this.state.hostTesting || this.state.visualTesting) return
    const api = getXModule2API()
    const allGreen = !!(this.state.perms && this.state.perms.accessibility && this.state.perms.screenRecording)
    const ready = allGreen ? Promise.resolve(api) : api.reconnect()
    ready
      .then(a => a.getPermissionStatus())
      .then((perms: PermissionStatus) => this.setState({ perms }))
      .catch(() => this.setState({ perms: null }))
  }

  requestPerm = (kind: 'accessibility' | 'screenRecording') => {
    this.setState({ permBusy: kind })
    getXModule2API().requestPermission(kind)
      .then((res: any) => {
        if (isMac()) {
          message.info('If macOS showed an Allow prompt, approve it — the light turns green within a few seconds. No prompt? A stale entry may exist: open System Settings and remove the xmodule2 entry first, then request again.')
        } else if (res && res.granted) {
          message.success('Access granted.')
        } else {
          message.info(kind === 'screenRecording'
            ? 'If the system screenshot dialog appeared, complete it (take/share the screenshot) — that grants capture permanently. If nothing appeared, try again.'
            : 'If the system sharing dialog appeared, enable input and click Share — the answer is remembered. If nothing appeared, try again.')
        }
      })
      .catch(e => message.error(String((e as any).message || e)))
      // Clear permBusy BEFORE refreshing — refreshPerms early-returns while
      // a request is in flight, so refreshing first would be a no-op and the
      // card would stay stale until a manual reload.
      .then(() => new Promise<void>(resolve => this.setState({ permBusy: null }, resolve)))
      .then(() => this.refreshPerms())
  }

  openPane = (kind: 'accessibility' | 'screenRecording') => {
    getXModule2API().openPermissionPane(kind).catch(e => message.error(String((e as any).message || e)))
  }

  testCapture = () => {
    this.setState({ captureTesting: true, captureTest: null, capturePreview: null })
    const started = Date.now()
    getXModule2API().reconnect()
      .then(api => api.invoke('capture_desktop', {}))
      .then((path: string) =>
        // Show the user WHAT was captured — a wallpaper-only image (the
        // stale-grant trap) is obvious at a glance in the thumbnail.
        getNativeCVAPI().readFileAsDataURL(path, true)
          .then(dataUrl => this.setState({
            captureTest: {
              ok: true,
              title: `Screen capture working (${Date.now() - started}ms)`,
              detail: `Captured the display the browser is on (saved to ${path}). The preview below is exactly what desktop vision sees${isMac() ? ' - if it shows only your wallpaper, the Screen Recording grant is stale: remove the xmodule2 entry in System Settings and grant it again.' : '.'}`
            },
            capturePreview: dataUrl,
            captureTesting: false
          }))
          .catch(() => this.setState({
            captureTest: {
              ok: true,
              title: `Screen capture working (${Date.now() - started}ms)`,
              detail: `Captured to ${path} (preview unavailable).`
            },
            captureTesting: false
          }))
      )
      .catch(e => this.setState({
        captureTest: { ok: false, title: 'Screen capture failed', detail: String((e as any).message || e) },
        captureTesting: false
      }))
  }

  // "Show active screen": flash the orange display frame on the display
  // desktop automation would capture right now (the same hint every
  // capture/search RPC uses) — the one-click answer to "which monitor is
  // Ui.Vision looking at?" on multi-monitor setups. captureVisible so the
  // user sees it even over a remote session; auto-hides after a moment.
  //
  // Windows: resolve the display hint here (physical px) and pass the rect.
  // macOS: pass NO rect — the host resolves "the active display" itself in
  // point space (border.rs show_display_border, rect optional), and the
  // Windows-only hint helper returns null on a Mac anyway. Linux: the host
  // has no frame yet — say so honestly instead of blaming a missing host
  // (field report 2026-08-27: a Mac with a working host got told the frame
  // "needs the Windows native host").
  showActiveScreen = () => {
    if (OS_KEY === 'linux') {
      message.info('The display frame is not available on Linux yet — desktop automation captures the display the browser window is on.')
      return
    }

    const pHint = OS_KEY === 'win' ? getDesktopCaptureHint() : Promise.resolve(null)
    pHint
      .then(hint => {
        if (OS_KEY === 'win' && !hint) {
          message.info('No active display to show — is the Desktop Automation host connected? (Run all self-tests above.)')
          return
        }
        return (getNativeCVAPI() as any).showDisplayBorder({ ...(hint || {}), captureVisible: true })
          .then((r: any) => {
            if (r && r.shown === false) {
              message.info(`Display frame not shown: ${r.reason || 'unknown'}`)
              return
            }
            setTimeout(() => {
              (getNativeCVAPI() as any).hideDisplayBorder({}).catch(() => { /* best-effort */ })
            }, 3000)
          })
      })
      .catch(e => {
        const msg = String((e && e.message) || e)
        // an old installed host predates show_display_border — name the cure
        if (/unknown|unsupported|no such|not supported|method/i.test(msg)) {
          message.error(`The installed Desktop Automation host does not support the display frame yet — please update it (host >= ${MIN_XMODULE2_VERSION}). (${msg})`)
        } else {
          message.error(`Could not show the display frame: ${msg}`)
        }
      })
  }

  saveRootDir = () => {
    getXFile().setConfig({ rootDir: this.state.rootDir }).then(ok => {
      this.setState({ rootDirDirty: false })
      message[ok ? 'success' : 'error'](ok ? 'Home directory saved' : 'Could not save home directory')
      // OPEN-ISSUES 38: the desktop app finds settings.json/keys.json through
      // the host's pointer file — keep it in step with the extension's choice
      // (host 2.1.0+; older hosts do not know the method, which is fine)
      if (ok) getXModule2API().invoke('set_home_dir', { path: this.state.rootDir }).catch(() => {})
    })
  }

  // "Reachable" only means the native host answered get_version. It says
  // NOTHING about whether the input events it posts actually reach the
  // screen: on macOS, without an Accessibility grant, the OS silently
  // discards them and every macro then fails somewhere far away ("element
  // not found") with no hint that input was never delivered.
  //
  // So actually deliver one. Park the OS cursor at the centre of THIS window
  // and let this very page say whether it arrived: a mousemove carries
  // clientX/clientY, so the page measures the result instead of trusting the
  // host's "true". That also checks the coordinate conversion for free — a
  // pointer that lands somewhere else reports the ratio it actually hit.
  testDesktopInput = () => {
    const api: any = getNativeXYAPI()
    const expectX = Math.round(window.innerWidth / 2)
    const expectY = Math.round(window.innerHeight / 2)
    let got: { x: number, y: number } | null = null

    const onMove = (e: any) => { got = { x: e.clientX, y: e.clientY } }
    const finish = (r: TestResult) => {
      window.removeEventListener('mousemove', onMove, true)
      this.setState({ inputTest: r, inputTesting: false })
    }

    this.setState({ inputTesting: true, inputTest: null })
    window.addEventListener('mousemove', onMove, true)

    // viewport origin in CSS points: exact on Firefox, derived on Chrome
    const moz = (window as any).mozInnerScreenX
    const originX = typeof moz !== 'undefined' ? moz : window.screenLeft
    const originY = typeof moz !== 'undefined'
      ? (window as any).mozInnerScreenY
      : window.screenTop + (window.outerHeight - window.innerHeight)

    // Aim through the SAME per-monitor DIP anchor the macro click path uses
    // (services/desktop_dip); anchor unavailable (macOS points) falls back to
    // sendDesktopMouseEvent's one-factor math, correct there. ONE shot is
    // not enough for a verdict: the window origin here is ESTIMATED from
    // screenLeft/outerHeight (Chrome offers nothing better), and that
    // estimate alone was 15px off on a 175% display while every macro click
    // was pixel-perfect (macros MEASURE their origin from a landed click).
    // So this test does the same as the accuracy-range demos: a sighting
    // shot, then one corrected shot — only a miss AFTER correction is real.
    const fire = (aimX: number, aimY: number): Promise<{ x: number, y: number } | null> => {
      got = null
      return getDesktopDipAnchor().catch(() => null)
        .then((anchor: any) => {
          if (anchor) {
            const p = dipToPhysPoint(anchor, { x: aimX, y: aimY })
            return api.sendMouseEvent({
              type: MouseEventType.Move,
              button: MouseButton.Left,
              x: Math.round(p.x),
              y: Math.round(p.y)
            })
          }
          return api.sendDesktopMouseEvent({
            type: MouseEventType.Move,
            button: MouseButton.Left,
            x: aimX,
            y: aimY
          })
        })
        .then(() => new Promise((resolve) => setTimeout(resolve, 900)))
        .then(() => got)
    }

    fire(originX + expectX, originY + expectY)
      .then((hit1) => {
        if (!hit1) return { hit: null as any, corrected: 0 }
        const d1 = Math.max(Math.abs(hit1.x - expectX), Math.abs(hit1.y - expectY))
        if (d1 <= 12) return { hit: hit1, corrected: 0 }
        // sighting shot landed but off — correct by the measured delta and
        // shoot once more; macros learn their origin the same way
        return fire(originX + expectX + (expectX - hit1.x), originY + expectY + (expectY - hit1.y))
          .then((hit2) => ({ hit: hit2, corrected: d1 }))
      })
      .then(({ hit, corrected }) => {
        if (!hit) {
          finish({
            ok: false,
            title: 'The native app is installed, but the pointer never arrived on this window.',
            detail: 'FIRST: did you touch the mouse or trackpad while the test ran? Your own movement overrides the one being tested and this result means nothing — run it again without touching anything. Otherwise, two real causes. (1) ANOTHER WINDOW IS COVERING this one at its centre — the pointer moved, but onto that window instead, so this page never saw it. Move other windows off the browser and test again; that is the likelier cause if desktop macros used to work.' +
              (isMac()
                ? ' (2) macOS is discarding the events entirely: the Accessibility permission above must be green. Grant it via "Request access", then QUIT and reopen the browser so the helper restarts.'
                : ' (2) The native app is installed but not working — check for an update.')
          })
          return
        }

        const dx = hit.x - expectX
        const dy = hit.y - expectY

        if (Math.abs(dx) <= 12 && Math.abs(dy) <= 12) {
          finish({
            ok: true,
            title: 'Desktop input works.',
            detail: `The pointer was placed within ${Math.max(Math.abs(dx), Math.abs(dy))}px of the requested spot, so OS-level clicks and keystrokes are being delivered and the screen-coordinate conversion is correct on this display.` +
              (corrected ? ` (The first shot needed a ${corrected}px calibration — that is the browser's own window-origin estimate, which macro clicks measure away exactly like this test just did.)` : '')
          })
          return
        }

        const ratioX = expectX ? (hit.x + 0) / expectX : 0
        finish({
          ok: false,
          title: 'Input is delivered, but it lands in the wrong place.',
          detail: `Asked for (${expectX}, ${expectY}) inside this window and the pointer arrived at (${hit.x}, ${hit.y}) — off by ${dx},${dy}px (about ${ratioX.toFixed(2)}x) even after a calibration shot. Clicks will miss their targets. This is a screen-scaling mismatch, not a permission problem; report it with this display's scaling setting (devicePixelRatio ${window.devicePixelRatio}).`
        })
      })
      .catch((e: Error) => {
        finish({
          ok: false,
          title: 'Could not reach the native app.',
          detail: `${e && e.message ? e.message : e}. Install or update the Desktop Automation module, then try again.`
        })
      })
  }

  // Feeds the "Status:" line at the top. Same connect-or-reconnect dance as
  // the routing probe, but asked directly so the answer reflects the actual
  // install even when the routing switch is off. A connection that neither
  // answers nor disconnects must not leave the line on "checking" forever.
  checkInstalled = () => {
    const api = getXModule2API()
    const timeout = new Promise<never>((resolve, reject) =>
      window.setTimeout(() => reject(new Error('timeout')), 10000))
    Promise.race([
      api.getVersion().catch(() => api.reconnect().then(a => a.getVersion())),
      timeout
    ])
      .then(version => this.setState({ daStatus: 'installed', daVersion: String(version || '') }))
      .catch(() => this.setState({ daStatus: 'missing' }))
  }

  testHost = () => {
    this.setState({ hostTesting: true, hostTest: null })
    const api = getXModule2API()
    // A successful connect also refreshes the routing probe, so hard-drive
    // mode & JS macros pick the new host up right away.
    probeXModules2(true).then(active => this.setState({ routingActive: active }))
    // A connection that neither answers nor formally disconnects (seen in the
    // wild) must resolve to an error, not spin forever.
    const timeout = new Promise<never>((resolve, reject) =>
      window.setTimeout(() => reject(new Error('No response within 15s — the connection neither succeeded nor failed')), 15000))
    Promise.race([api.getVersion(), timeout])
      .then(version => api.getPermissionStatus().then((perms: PermissionStatus) => {
        const permNote = isMac()
          ? ` · accessibility: ${perms.accessibility ? 'granted' : 'MISSING'} · screen recording: ${perms.screenRecording ? 'granted' : 'MISSING'}`
          : ''
        // Which display is the browser on? Desktop vision follows it.
        return Promise.all([
          api.invoke('get_display_list').catch(() => null),
          api.invoke('get_active_browser_outer_rect', {}).catch(() => null)
        ]).then(([displays, rect]: [any[] | null, any | null]) => {
          let displayNote = ''
          if (displays && displays.length) {
            const on = rect && displays.find(d =>
              rect.x + rect.width / 2 >= d.x && rect.x + rect.width / 2 < d.x + d.width &&
              rect.y + rect.height / 2 >= d.y && rect.y + rect.height / 2 < d.y + d.height)
            const where = on
              ? `browser on "${on.name || 'display ' + on.id}" (${on.width}x${on.height} @${on.scaleFactor}x, ${on.dpi} dpi)${on.isPrimary ? ', primary' : ''}`
              : 'browser display not detected — desktop vision uses the primary display'
            displayNote = ` · ${displays.length} display${displays.length > 1 ? 's' : ''} detected, ${where}`
          }
          this.setState({
            hostTest: { ok: true, title: `Native host connected (v${version})`, detail: `One exe serves file access, input, vision, OCR and run-process${permNote}${displayNote}` },
            hostTesting: false,
            daStatus: 'installed',
            daVersion: String(version || '')
          })
        })
      }))
      .catch(e => {
        // The connect error string (chrome.runtime.lastError, surfaced by
        // NativeMessagingHost.disconnect) distinguishes not-installed from
        // policy-blocked, allowlist-mismatched and won't-start installs —
        // each needs different advice.
        const diag = diagnoseHostConnectError(String((e && e.message) || e), OS_KEY)
        this.setState({
          hostTest: { ok: false, title: diag.title, detail: diag.detail },
          hostTesting: false
        })
      })
  }

  testWasm = () => {
    this.setState({ wasmTesting: true, wasmTest: null })
    const { patternUrl, targetUrl } = makeWasmSelfTest()
    const started = Date.now()
    searchV2({
      patternImageUrl: patternUrl,
      targetImageUrl: targetUrl,
      minSimilarity: 0.9,
      allowSizeVariation: false,
      enableGreenPinkBoxes: false,
      requireGreenPinkBoxes: false,
      patternScale: 1,
      scaleDownRatio: 1,
      pageOffset: { x: 0, y: 0 },
      viewportOffset: { x: 0, y: 0 }
    })
      .then(results => {
        const hit = results[0] && results[0].matched
        const ok = !!hit && Math.abs(hit.offsetLeft - 70) <= 1 && Math.abs(hit.offsetTop - 40) <= 1
        this.setState({
          wasmTest: ok
            ? { ok: true, title: `WASM engine working (${Date.now() - started}ms)`, detail: `Found the test pattern at (${Math.round(hit.offsetLeft)},${Math.round(hit.offsetTop)}), score ${hit.score.toFixed(3)}` }
            : { ok: false, title: 'WASM engine returned a wrong result', detail: JSON.stringify(results).slice(0, 200) },
          wasmTesting: false
        })
      })
      .catch(e => this.setState({
        wasmTest: { ok: false, title: 'WASM engine failed', detail: String(e.message || e) },
        wasmTesting: false
      }))
  }

  renderPermCard (kind: 'accessibility' | 'screenRecording', title: string, why: string) {
    const granted = this.state.perms ? this.state.perms[kind] : null
    const dot = granted === null ? '#d9d9d9' : granted ? '#52c41a' : '#f5222d'
    const label = granted === null ? 'unknown' : granted ? 'Granted' : 'Denied'
    return (
      <div style={{
        padding: '10px 14px', borderRadius: '6px', border: '1px solid #e8e8e8',
        marginTop: '8px', background: '#fafafa'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block', width: '10px', height: '10px',
            borderRadius: '50%', background: dot
          }} />
          <b>{title}</b>
          <span style={{ color: granted ? '#389e0d' : '#cf1322' }}>{label}</span>
        </div>
        <div style={{ margin: '6px 0', color: '#666' }}>{why}</div>
        {granted ? null : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              size="small"
              type="primary"
              loading={this.state.permBusy === kind}
              onClick={() => this.requestPerm(kind)}
            >
              Request access
            </Button>
            {isMac() ? (
              <Button size="small" onClick={() => this.openPane(kind)}>
                Open System Settings
              </Button>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  // Round-trip a small file through the configured home directory: proves
  // the native app can actually read AND write where macros will (hard-drive
  // storage, CSV/vision resources), not just that it answers pings.
  testFileRW = () => {
    const dir = (this.state.rootDir || '').trim()
    if (!dir) {
      this.setState({ fileTest: { ok: false, title: 'No home directory set', detail: 'Enter a folder above and press Save first.' } })
      return
    }
    this.setState({ fileTesting: true, fileTest: null })
    const api = getXModule2API()
    const sep = /^[A-Za-z]:\\|\\/.test(dir) ? '\\' : '/'
    const path = dir.replace(/[\\/]+$/, '') + sep + 'uivision_rw_test.txt'
    const text = 'Ui.Vision read/write test ' + new Date().toISOString()
    // ensure the folder exists first (a fresh path from the input above may
    // not), then check EVERY step — write_all_text answers false on failure
    // rather than throwing, and an unchecked false made the read report
    // 'different content' instead of the real problem
    api.invoke('create_directory', { path: dir })
      .then((ok: any) => {
        if (ok === false) throw new Error(`could not create the folder ${dir}`)
        return api.invoke('write_all_text', { path, content: text })
      })
      .then((ok: any) => {
        if (ok === false) throw new Error(`could not write ${path} — is the folder writable?`)
        return api.invoke('read_all_text', { path })
      })
      .then((read: any) => {
        const got = typeof read === 'string' ? read : (read && read.content) || ''
        if (got !== text) throw new Error(`read back different content (${String(got).slice(0, 40)}…)`)
        return api.invoke('delete_file', { path })
      })
      .then(() => this.setState({ fileTesting: false, fileTest: { ok: true, title: 'Test read/write ok', detail: `Wrote, read back and removed ${path}` } }))
      .catch((e: any) => this.setState({ fileTesting: false, fileTest: { ok: false, title: 'Read/write test failed', detail: String((e && e.message) || e) } }))
  }

  renderCaptureTest () {
    return (
      <div style={{ marginTop: '8px' }}>
        {/* the screenshot test itself runs from "Run all self-tests" at the
            top; only the frame flash keeps its own button */}
        <Button size="small" onClick={this.showActiveScreen}>
          Show active screen
        </Button>
        {this.renderResult(this.state.captureTest)}
        {this.state.capturePreview ? (
          <a href={this.state.capturePreview} target="_blank" rel="noreferrer" title="Open full-size capture">
            <img
              src={this.state.capturePreview}
              alt="Desktop capture preview"
              style={{ marginTop: '8px', maxWidth: '100%', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            />
          </a>
        ) : null}
      </div>
    )
  }

  renderPermissions () {
    // The screenshot test is useful on every OS (on Windows/Linux there is
    // no permission model, but capture can still fail — Wayland, drivers);
    // the permission cards themselves are a macOS concept.
    if (isLinux()) {
      // Wayland needs a one-time capture grant through the desktop portal —
      // same shape as the macOS Screen Recording card. On X11 sessions the
      // host always reports granted, so the card simply shows green.
      return (
        <div style={{ marginTop: '20px' }}>
          <h4>Linux permissions</h4>
          <p style={{ marginBottom: '4px' }}>
            On Wayland desktops the system asks once before apps may capture
            the screen. Request access and confirm the dialog — the desktop
            remembers the answer.
          </p>
          {this.renderPermCard('screenRecording', 'Screen capture (desktop portal)',
            'Required to capture the screen for desktop image search and OCR. X11 sessions need no grant.')}
          {this.renderPermCard('accessibility', 'Remote input (desktop portal)',
            'Required to send real mouse clicks and keystrokes (XClick, XType) on Wayland desktops. The system asks once; the answer is remembered.')}
          {this.renderCaptureTest()}
        </div>
      )
    }
    if (!isMac()) {
      return (
        <div style={{ marginTop: '20px' }}>
          <h4>Desktop capture</h4>
          <p style={{ marginBottom: '4px' }}>
            Verify the native app can capture the screen for desktop image
            search and OCR.
          </p>
          {this.renderCaptureTest()}
        </div>
      )
    }
    return (
      <div style={{ marginTop: '20px' }}>
        <h4>macOS permissions</h4>
        <p style={{ marginBottom: '4px' }}>
          The native app needs two system permissions. The lights update live —
          after granting, green shows within a few seconds.
        </p>
        {this.renderPermCard('accessibility', 'Accessibility',
          'Required to send real mouse clicks and keystrokes (XClick, XType).')}
        {this.renderPermCard('screenRecording', 'Screen & System Audio Recording',
          'Required to capture the screen for desktop image search and OCR. Without it, captures silently show only the wallpaper.')}
        {this.renderCaptureTest()}
      </div>
    )
  }

  renderResult (result: TestResult | null) {
    if (!result) return null
    return (
      <div style={{
        marginTop: '8px', padding: '8px 12px', borderRadius: '4px',
        background: result.ok ? '#f6ffed' : '#fff2f0',
        border: `1px solid ${result.ok ? '#b7eb8f' : '#ffccc7'}`
      }}>
        <b>{result.title}</b>
        {/* pre-line: the host-connect diagnosis is a bullet list */}
        <div style={{ marginTop: '4px', whiteSpace: 'pre-line' }}>{result.detail}</div>
      </div>
    )
  }

  render () {
    return (
      <div style={{ maxWidth: '640px' }}>
        <div style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #e8e8e8', marginBottom: '12px', background: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Button type="primary" onClick={() => this.runSelfTest(null)} loading={this.state.selfTestRunning} data-testid="run-selftest">Run all self-tests</Button>
            <span>Runs every test in turn: host connection, WASM engine, desktop screenshot, real mouse input, home directory, visual compatibility, desktop app; the results appear in their sections below. Keep your hands off the mouse while it runs (about half a minute). The report can be copied for support, the forum, or your AI assistant; AI agents get the same run as the MCP tool <code>run_selftest</code>.</span>
          </div>
          {this.state.selfTestSummary && this.renderSelfTestSummary(this.state.selfTestSummary)}
        </div>
        {this.state.daStatus === 'installed' && (
          <HardDriveHint config={this.props.config} updateConfig={this.props.updateConfig} reason="Desktop Automation is installed, so macros can live as files in your home folder — required for the desktop app, and the folder is backed up like any other." />
        )}
        {/* The "required since 10.0.151" / V9-downgrade explanation lives in
            the error messages (E347 etc., see routing.ts v9DowngradeNote) and
            on the homepage — NOT here: new users have no old version to miss,
            and the warning only confuses them. */}
        <p>
          <b>Ui.Vision for Desktop (the Desktop Automation module + helper app) is the new generation of the
          XModules</b>: one app instead of four, faster start, DPI-aware
          image search, in-app OCR, and errors that never require a
          reconnect.{' '}
          (<a
            href={goUivUrl('https://go.ui.vision/?help=desktop_readmore')}
            target="_blank"
            rel="noopener noreferrer"
          >read more</a>)
        </p>
        {/* Outdated host = subtle failures in every desktop command; the
            banner is deliberately the loudest thing on this page. The
            missing-host case keeps its own red Status line below. */}
        {this.state.daStatus === 'installed' && xmoduleVersionOutdated(this.state.daVersion) ? (
          <div style={{
            padding: '12px 16px', borderRadius: '6px', marginBottom: '14px',
            background: '#fff2f0', border: '2px solid #ff4d4f'
          }}>
            <div style={{ color: '#cf1322', fontSize: '15px', fontWeight: 'bold' }}>
              ⚠️ Update needed: the Desktop Automation app is outdated
            </div>
            <div style={{ margin: '6px 0' }}>
              Installed is v{this.state.daVersion}, but this extension needs at
              least <b>v{MIN_XMODULE2_VERSION}</b>. Desktop automation commands
              may fail or misbehave until it is updated.
            </div>
            <a
              href={goUivUrl(`https://go.ui.vision/?help=desktop_${OS_KEY}`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <b>Download the latest Desktop Automation module for {OS_LABEL}</b>
            </a>
          </div>
        ) : null}
        <p>
          <b>Status:</b>{' '}
          {this.state.daStatus === 'installed' ? (
            <>
              <span style={{ color: '#389e0d' }}>Installed (v{this.state.daVersion || '?'})</span>{' · '}
              <a
                href={goUivUrl(`https://go.ui.vision/?help=da_update_check&xversion=${this.state.daVersion}&kantuversion=${(() => { try { return Ext.runtime.getManifest().version } catch (e) { return '' } })()}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Check for updates
              </a>
            </>
          ) : this.state.daStatus === 'missing' ? (
            <>
              <span style={{ color: '#cf1322' }}>Not installed</span>{' — '}
              <a
                href={goUivUrl(`https://go.ui.vision/?help=desktop_${OS_KEY}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                download the Desktop Automation module for {OS_LABEL}
              </a>
            </>
          ) : 'checking…'}
        </p>

        {this.state.routingActive ? (
          <p style={{ color: '#389e0d' }}>
            <b>Active{this.state.hostVersion ? ` — native app v${this.state.hostVersion}` : ''}:</b>{' '}
            the native app is installed and serving all macros, desktop
            vision, file access and local OCR.
          </p>
        ) : null}

        <h4 style={{ marginTop: '8px' }}>Home directory</h4>
        <p style={{ marginBottom: '6px' }}>
          Where macros, screenshots and data files live. A path set in an
          earlier Ui.Vision version applies here automatically.
        </p>
        <div style={{ display: 'flex', gap: '8px', maxWidth: '480px' }}>
          <Input
            value={this.state.rootDir}
            placeholder="e.g. C:\Users\me\uivision"
            onChange={e => this.setState({ rootDir: e.target.value, rootDirDirty: true })}
          />
          <Button type="primary" disabled={!this.state.rootDirDirty} onClick={this.saveRootDir}>
            Save
          </Button>
        </div>
        {this.renderResult(this.state.fileTest)}

        {/* separates the Home-directory block (moved up under the switch)
            from the native-app tests — the r/w result box otherwise butts
            against the next heading */}
        <hr style={{ margin: '24px 0 16px', border: 0, borderTop: '1px solid #eee' }} />

        <h4 style={{ marginTop: 0 }}>Native app (desktop automation, OCR, XRunAndWait)</h4>
        {/* host and real-input tests run from "Run all self-tests" at the top
            (2026-09-15: one button instead of five); their results land here */}
        {this.renderResult(this.state.hostTest)}
        {/* The test MOVES the real pointer, so a hand on the mouse or
            trackpad invalidates it: that movement fires its own mousemove
            and the test would read it as the native app's. Say so while it
            runs, not afterwards. */}
        {this.state.inputTesting ? (
          <div style={{ marginTop: '8px', color: '#d46b08', fontWeight: 'bold' }}>
            Moving the mouse pointer — DO NOT touch the mouse or trackpad until this
            finishes (about a second). Your own movement would be measured instead.
          </div>
        ) : null}
        {this.renderResult(this.state.inputTest)}

        {this.renderPermissions()}
        <VisualCompatibility config={this.props.config} onBusy={visualTesting => this.setState({ visualTesting })} autoRun={this.state.visualAutoToken} onResult={this.onVisualResult} />
      </div>
    )
  }
}

export default connect(
  (state: State) => ({
    config: (state as any).config
  }),
  (dispatch: Dispatch) => bindActionCreators({ ...actions } as any, dispatch)
)(XModules2Tab as any)
