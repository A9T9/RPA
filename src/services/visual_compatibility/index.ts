import Ext from '@/common/web_extension'
import csIpc from '@/common/ipc/ipc_cs'
import { CaptureScreenshotService } from '@/common/capture_screenshot'
import { getXModule2API } from '@/services/xmodules2/native'
import { getNativeCVAPI } from '@/services/desktop'
import { getDesktopAppClient, ensureDesktopApp } from '@/services/desktop_app'
import { analyzeChart, chart, chartRects, environmentKey, reportStatus } from './analyze'

const LOCAL_KEY = 'visualCompatibilityLocalV1'
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const errorText = (e: any) => String(e?.message || e)
let running = false

async function localState () {
  const stored = (await Ext.storage.local.get(LOCAL_KEY))[LOCAL_KEY]
  if (stored) return stored
  const state = { profileId: crypto.randomUUID(), reports: [] }
  await Ext.storage.local.set({ [LOCAL_KEY]: state })
  return state
}

export async function compatibilityState () {
  const local = await localState()
  try { return { ...(await getXModule2API().invoke('get_visual_compatibility')), profileId: local.profileId, storage: 'machine' } }
  catch (e) { return { machineId: local.profileId, profileId: local.profileId, reports: local.reports, storage: 'profile', nativeError: errorText(e) } }
}

async function currentTab () {
  return new Promise<any>((resolve, reject) => chrome.tabs.getCurrent(tab => {
    if (chrome.runtime.lastError || !tab?.id) reject(new Error('Open Settings in a browser tab to run this check.'))
    else resolve(tab)
  }))
}

export async function compatibilityEnvironment (state: any) {
  const tab = await currentTab()
  const s: any = window.screen
  return {
    chartVersion: chart.version, machineId: state.machineId, profileId: state.profileId,
    browser: navigator.userAgent, extension: Ext.runtime.getManifest().version,
    host: state.hostVersion || '', zoom: await Ext.tabs.getZoom(tab.id), dpr: devicePixelRatio,
    screen: { width: s.width, height: s.height, left: s.availLeft || 0, top: s.availTop || 0, colorDepth: s.colorDepth },
    displays: state.displays || []
  }
}

async function pixels (url: string): Promise<ImageData> {
  const image = new Image()
  image.src = url
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

async function nativeImage (capture: any) {
  try { return await pixels(await getNativeCVAPI().readFileAsDataURL(capture.path, true)) }
  finally { await getXModule2API().invoke('delete_file', { path: capture.path }).catch(() => {}) }
}

// Save a capture to the downloads folder from this extension page: through
// the background's download helper when it answers, else with the downloads
// API directly. A multi-megabyte data: URL is turned into a blob URL first -
// Firefox refuses data: URLs of that size in runtime messages and downloads.
async function saveCapture (dataUrl: string, filename: string) {
  const blob = await (await fetch(dataUrl)).blob()
  const url = URL.createObjectURL(blob)
  try {
    try { await csIpc.ask('PANEL_DOWNLOAD_URL', { url, filename }, 8000); return } catch (_) { /* fall through to the direct API */ }
    const g: any = globalThis as any
    const api: any = (g.browser && g.browser.downloads) || (g.chrome && g.chrome.downloads)
    if (!api || !api.download) throw new Error('downloads API not available on this page')
    await new Promise<void>((resolve, reject) => {
      const p = api.download({ url, filename, conflictAction: 'overwrite', saveAs: false }, (id: any) => {
        const err = (chrome as any).runtime && (chrome as any).runtime.lastError
        if (err) reject(new Error(err.message)); else if (id !== undefined) resolve()
      })
      if (p && typeof p.then === 'function') p.then(() => resolve(), (e: any) => reject(e))
    })
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }
}

function showChart (nonce: number, cancel: () => void) {
  if (innerWidth < 510 || innerHeight < 390) throw new Error('Enlarge the Settings window so the whole test chart fits (at least 510 × 390).')
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:white;color:black;'
  const root = host.attachShadow({ mode: 'closed' })
  const panel = document.createElement('div')
  panel.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:white;'
  const canvas = document.createElement('canvas')
  canvas.width = chart.width; canvas.height = chart.height
  canvas.style.cssText = 'width:480px;height:320px;flex-shrink:0;'
  const ctx = canvas.getContext('2d')!
  chartRects(nonce).forEach((r: any) => { ctx.fillStyle = r.color; ctx.fillRect(r.x, r.y, r.width, r.height) })
  const label = document.createElement('div')
  label.textContent = 'Checking visual compatibility — keep this chart visible'
  label.style.cssText = 'position:absolute;top:12px;left:0;right:0;text-align:center;font:14px sans-serif;color:black;'
  const stop = document.createElement('button')
  stop.textContent = 'Cancel check'; stop.onclick = cancel
  stop.style.cssText = 'position:absolute;bottom:10px;left:calc(50% - 50px);width:100px;height:28px;color:black;background:white;border:1px solid #888;'
  panel.append(canvas, label, stop); root.append(panel); document.body.append(host)
  return { host, canvas }
}

export async function runCompatibilityCheck (config: any, signal: AbortSignal, progress: (s: string) => void, cancel: () => void) {
  if (running) throw new Error('A visual compatibility check is already running in this Settings page.')
  running = true
  const paths: any[] = []
  let overlay: ReturnType<typeof showChart> | null = null
  let appShown = false
  const app = getDesktopAppClient()
  const assertActive = () => { if (signal.aborted) throw new Error('Check cancelled. Previous results were kept.') }
  let state: any
  let environment: any
  try {
    state = await compatibilityState(); environment = await compatibilityEnvironment(state)
    const tab = await currentTab()
    // Do not interrupt the app's current macro to display a test chart.
    if (app.connected && (await app.getStatus()).running) throw new Error('Finish the running desktop macro before checking visual compatibility.')
    const nonce = crypto.getRandomValues(new Uint32Array(1))[0]
    assertActive()
    overlay = showChart(nonce, cancel)
    // The desktop-capture paths photograph the SCREEN: a Settings window
    // behind another window (the tab was opened by run_selftest while the
    // user reads elsewhere) shows the capture no chart at all. Front it -
    // position, size and active tab stay the same, so checkGeometry holds.
    // windows.update({focused}) is refused by Windows for a process that is
    // not the last input source (the MCP-driven runs kept the window behind
    // and the desktop captures saw no chart); the host's focus_browser does
    // the ALT-nudge dance that is allowed to front a window and polls until
    // the shell has moved it. Fall back to the browser API without a host.
    try {
      let fronted = false
      if (state.storage === 'machine') {
        try { const r: any = await getXModule2API().invoke('focus_browser'); fronted = !!(r && r.focused === true) } catch (_) { /* older host - browser API below */ }
      }
      if (!fronted) await Ext.windows.update(tab.windowId, { focused: true })
      for (let i = 0; i < 10; i++) {
        const w: any = await Ext.windows.get(tab.windowId)
        if (w && w.focused) break
        await sleep(100)
      }
      await sleep(250)
    } catch (_) { /* best effort - the check tells if the chart stayed hidden */ }
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const rect = overlay.canvas.getBoundingClientRect()
    const initial = { x: screenX, y: screenY, w: innerWidth, h: innerHeight, dpr: devicePixelRatio }
    const checkGeometry = async () => {
      assertActive()
      const active = await Ext.tabs.get(tab.id)
      if (!active.active || document.visibilityState !== 'visible' || initial.x !== screenX || initial.y !== screenY || initial.w !== innerWidth || initial.h !== innerHeight || initial.dpr !== devicePixelRatio) throw new Error('The browser moved, resized, changed zoom, or switched tabs during the check. Run it again with the chart visible.')
    }
    const runPath = async (id: string, label: string, fn: () => Promise<any>) => {
      assertActive(); progress(label)
      try { paths.push({ id, label, status: 'measured', ...(await fn()) }) }
      catch (e) { assertActive(); paths.push({ id, label, status: 'error', error: errorText(e) }) }
    }
    await runPath('browser', 'Browser screenshot', async () => {
      await checkGeometry()
      const service = new CaptureScreenshotService({ captureVisibleTab: (_, options) => Ext.tabs.captureVisibleTab(tab.windowId, options) })
      // The ratio the service applied to the raw tab capture, and the image it
      // produced, go into the failure text: a chart that the desktop capture
      // finds but the tab screenshot does not is a scaling question, and the
      // numbers answer it without a debugger (Firefox 175 %, 2026-09-15).
      let ratio = 1
      const dataUrl = await service.captureScreen(tab.id, initial.dpr, (r: number) => { ratio = r })
      const image = await pixels(dataUrl)
      let result: any
      try { result = analyzeChart(image, nonce, initial.dpr) }
      catch (e) {
        // The failing capture itself is the evidence support needs: save it
        // to the downloads folder (the only file sink an extension page has
        // without the desktop host) and name the file in the error.
        const file = 'uivision-visual-compatibility-browser-capture.png'
        let saved = ''
        try {
          await saveCapture(dataUrl, file)
          saved = ' The capture was saved to your downloads folder as ' + file + ' - attach it to a support request.'
        } catch (err) { saved = ' (The capture could not be saved to downloads: ' + errorText(err) + ')' }
        throw new Error(errorText(e) + ' Tab screenshot: ' + image.width + '×' + image.height + ' px after scaling the raw capture by ' + ratio.toFixed(4) + '; viewport ' + initial.w + '×' + initial.h + ' css px at ×' + initial.dpr.toFixed(4) + ', so ' + Math.round(initial.w * initial.dpr) + '×' + Math.round(initial.h * initial.dpr) + ' px were expected.' + saved)
      }
      await checkGeometry()
      const offsetError = Math.max(Math.abs(result.geometry.x - rect.x * initial.dpr), Math.abs(result.geometry.y - rect.y * initial.dpr))
      return { ...result, coordinates: { status: offsetError <= 2 ? 'pass' : 'mismatch', errorPx: offsetError } }
    })
    if (state.storage === 'machine') {
      await runPath('browser-desktop', 'Browser through desktop capture', async () => {
        await checkGeometry()
        let last: any
        let lastCapture: any = null
        let lastDataUrl = ''
        for (let attempt = 0; attempt < 4; attempt++) {
          assertActive()
          const capture = await getXModule2API().invoke('capture_visual_compatibility', {})
          try {
            // read the file ourselves (not nativeImage) so a failing capture
            // can be saved for support below
            let dataUrl = ''
            try { dataUrl = await getNativeCVAPI().readFileAsDataURL(capture.path, true) }
            finally { await getXModule2API().invoke('delete_file', { path: capture.path }).catch(() => {}) }
            lastCapture = capture; lastDataUrl = dataUrl
            const result = analyzeChart(await pixels(dataUrl), nonce, initial.dpr)
            await checkGeometry()
            return { ...result, display: { x: capture.x, y: capture.y, width: capture.width, height: capture.height, dpi: capture.dpi }, viewportOrigin: { x: capture.x + result.geometry.x - rect.x * result.geometry.scaleX, y: capture.y + result.geometry.y - rect.y * result.geometry.scaleY } }
          } catch (e) { last = e; await sleep(150) }
        }
        // same evidence as for the tab screenshot: the capture goes to the
        // downloads folder and the error names what was captured where
        let saved = ''
        if (lastDataUrl) {
          const file = 'uivision-visual-compatibility-desktop-capture.png'
          try { await saveCapture(lastDataUrl, file); saved = ' The last desktop capture was saved to your downloads folder as ' + file + '.' } catch (err) { saved = ' (The desktop capture could not be saved to downloads: ' + errorText(err) + ')' }
        }
        const where = lastCapture ? ' Desktop capture: ' + lastCapture.width + 'x' + lastCapture.height + ' px at ' + lastCapture.x + ',' + lastCapture.y + ' (' + lastCapture.dpi + ' dpi); browser window at ' + screenX + ',' + screenY + ' css px, viewport ' + initial.w + 'x' + initial.h + '.' : ''
        throw new Error(errorText(last) + where + saved)
      })
      overlay.host.remove(); overlay = null
      await runPath('app-desktop', 'Desktop app through desktop capture', async () => {
        assertActive()
        const connected = await ensureDesktopApp(config, progress)
        if (!connected.ok) throw new Error(connected.text)
        if ((await app.getStatus()).running) throw new Error('Finish the running desktop macro, then run this check again.')
        appShown = true
        const stamp = crypto.getRandomValues(new Uint32Array(1))[0]
        await app.visualChart('show', stamp)
        let ready: any
        for (let i = 0; i < 25; i++) {
          assertActive(); await sleep(160); ready = await app.visualChart('status')
          if (ready.error) throw new Error(ready.error)
          if (ready.ready) break
        }
        if (!ready?.ready) throw new Error('The desktop app did not paint its chart. Bring its window into view and retry.')
        let last: any
        for (let i = 0; i < 4; i++) {
          assertActive()
          const shot = await app.visualChart('capture')
          try {
            const result = analyzeChart(await nativeImage(shot.capture), stamp, shot.scale)
            return { ...result, display: { x: shot.capture.x, y: shot.capture.y, width: shot.capture.width, height: shot.capture.height, dpi: shot.capture.dpi } }
          } catch (e) { last = e; await sleep(160) }
        }
        throw last
      })
    } else {
      for (const [id, label] of [['browser-desktop', 'Browser through desktop capture'], ['app-desktop', 'Desktop app through desktop capture']]) paths.push({ id, label, status: 'unavailable', error: 'Install or update Ui.Vision for Desktop to 2.1.24 or later, then run this check again. ' + (state.nativeError || '') })
    }
    assertActive()
    // file: where the host keeps the full measurements (hosts >= 2.1.36 name
    // it) - the self-test text and the section print it for support.
    const report = { schema: 1, machineId: state.machineId, profileId: state.profileId, checkedAt: new Date().toISOString(), environment, environmentKey: environmentKey(environment), paths, status: reportStatus(paths), correction: 'none', input: 'not tested', file: state.storage === 'machine' && state.path ? String(state.path) : undefined }
    progress('Saving results…')
    if (state.storage === 'machine') await getXModule2API().invoke('save_visual_compatibility', { report })
    else {
      const local = await localState()
      await Ext.storage.local.set({ [LOCAL_KEY]: { ...local, reports: [...local.reports, report].slice(-20) } })
    }
    return report
  } finally {
    overlay?.host.remove()
    if (appShown) await app.visualChart('hide').catch(() => {})
    running = false
  }
}
