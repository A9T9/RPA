import { CaptureScreenshotService } from '@/common/capture_screenshot'
import { getXModule2API } from '@/services/xmodules2/native'
import { getDesktopDipAnchor, physToDipPoint, getDesktopCaptureHint } from '@/services/desktop_dip'
import { showDesktopBorder, showDesktopSearchAreaDip } from '@/services/desktop_border'
import { scaleRect, subImage } from '@/common/dom_utils'
import csIpc from '@/common/ipc/ipc_cs'
import { delay } from '@/common/ts_utils'
import { ensureExtName, getPageDpi } from '@/common/utils'
import Ext from '@/common/web_extension'
import { getState } from '@/ext/common/global_state'
import { store } from '@/redux'
import * as act from '@/actions'
import { Actions } from '@/actions/simple_actions'
import { getScreenshotInSearchArea, saveDataUrlToLastDesktopScreenshot, saveDataUrlToLastScreenshot } from '@/search_vision'
import { getNativeCVAPI } from '@/services/desktop'
import * as C from '@/common/constant'
import { getFileBufferFromScreenshotStorage } from '@/common/ai_vision'
import { getVarsInstance } from '@/common/variables'

// The hide-download-bar-during-X-runs machinery was REMOVED (2026-08-16).
// It existed for the old bottom download SHELF, which resized the viewport
// mid-macro and shifted click coordinates; Chrome ≥116 uses the toolbar
// download bubble, which resizes nothing — while the hide itself, when a run
// ended abnormally, left Chrome's download UI off BROWSER-WIDE until the
// extension re-enabled it or was uninstalled. bg.js still heals the stuck
// state on every service-worker start for users coming from affected builds.

export const withVisualHighlightHidden = (fn: any) => {
  const hide = () => csIpc.ask('PANEL_HIDE_VISION_HIGHLIGHT').catch(() => {})
  const show = () => csIpc.ask('PANEL_SHOW_VISION_HIGHLIGHT').catch(() => {})

  return hide()
    .then(() => fn())
    .then(
      (data: any) => {
        show()
        return data
      },
      (e: any) => {
        show()
        throw e
      }
    )
}

// (getSidePanelWidth and the "Side Panel is on the left" correction are GONE.
// They compensated for Chrome's DERIVED viewport origin (screenLeft + 8),
// which is blind to a left-docked panel. Since v10.0.76 the origin is
// MEASURED from trusted mouse events — screenX - clientX includes whatever
// sits left of the viewport — so the correction became a double-count when
// checked: verified 10.0.78 on Chrome, panel LEFT, box UNCHECKED, 9/9 hits at
// both 100% and 125% scaling. Firefox never needed it: mozInnerScreenX is
// exact. The rare 'derived' fallback (probe failed, W372 logged) loses the
// correction, but that path's origin was measured 64px wrong in y anyway —
// the checkbox never made it right.)

export const replaceEscapedChar = (str:string, command:any, field:string, shouldEscape = true) => {
  if (!shouldEscape) {
    return str
  }

  if (
    [
      'csvRead',
      'csvReadArray',
      'csvSave',
      'gotoIf',
      'if',
      'while',
      'gotoIf_v2',
      'if_v2',
      'while_v2',
      'XType',
      'elseif',
      'repeatIf',
      'executeScript',
      'executeScript_Sandbox',
      'executeAsyncScript',
      'executeAsyncScript_Sandbox'
    ].indexOf(command.cmd) !== -1 &&
    field === 'target'
  ) {
    return str
  }

  if (['csvSaveArray'].indexOf(command.cmd) !== -1 && field === 'value') {
    return str
  }

  if (['XRun', 'XRunAndWait'].indexOf(command.cmd) !== -1) {
    return str
  }

  return [
    [/\\n/g, '\n'],
    [/\\t/g, '\t'],
    [/\\b/g, '\b'],
    [/\\f/g, '\f'],
    [/\\t/g, '\t'],
    [/\\v/g, '\v']
  ].reduce((prev, [reg, c]) => {
    return prev.replace(reg, c)
  }, str)
}

// Cover the extension UI (IDE window and side panel render it from the same
// ocrInDesktopMode flag) while a desktop screenshot is captured: without it,
// desktop-scope OCR/vision reads the macro source and chat text shown in the
// panel and happily matches the script's own words. The classic desktop
// X*/OCR commands raise the flag for their whole duration (shouldShowOcrOverlay
// in run_command); this wrapper scopes it to ONE capture for every other path
// (JS-script desktop finders, uiv.shot.desktop, bridge screenshots) and leaves
// the flag alone when the classic flow already owns it.
// The macro-settable switch for that cover: store false into
// !CAPTURE_HIDE_GUI and desktop captures INCLUDE the extension UI — what the
// ClearSidebarLogViaGUI demos need, since they automate the side panel
// itself. Anything except an explicit false keeps the cover, so hiding stays
// the default, and a fresh run resets the variable to that default.
export const shouldHideGuiDuringCapture = (): boolean => {
  try {
    const v = getVarsInstance().get('!CAPTURE_HIDE_GUI')
    return !(v === false || String(v).toLowerCase() === 'false')
  } catch (e) {
    return true
  }
}

export const withDesktopCaptureCover = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (!shouldHideGuiDuringCapture()) return fn()

  const wasOn = !!(store.getState() as any).ocrInDesktopMode
  if (!wasOn) {
    store.dispatch(Actions.setOcrInDesktopMode(true))
    // let the panel repaint before the native capture grabs the screen
    await delay(() => {}, 150)
  }
  try {
    return await fn()
  } finally {
    if (!wasOn) store.dispatch(Actions.setOcrInDesktopMode(false))
  }
}

// The xmodule2 host captures the display the BROWSER is on (not always the
// primary), so a crop rect given in GLOBAL screen points must come down to
// that display's local space first — on a secondary display arranged left of
// the primary the global x is negative and the old math cropped garbage.
// Returns {x, y} of the display containing the rect's center, in points;
// (0,0) when it cannot tell (primary-only setups, errors).
// get_display_list units are platform-native: PHYSICAL virtual-screen pixels
// on Windows (same space as get_active_browser_outer_rect there), global
// points on macOS. The desktop coordinate space this extension works in is
// Chrome's DIP screen space (what page screenX/screenY report). On Windows
// the physical display origin comes down through the per-monitor window
// anchor (services/desktop_dip.ts) — dividing by one scale factor is only
// right while every display runs the same scaling. On macOS the raw values
// already ARE points; the anchor is null there and the fallback divides by
// scaleFactor 1 (a no-op), keeping old behavior.
const displayPointRect = (d: any): { x: number; y: number; width: number; height: number } => {
  const s = /windows/i.test(window.navigator.userAgent) && d.scaleFactor > 0 ? d.scaleFactor : 1
  return { x: d.x / s, y: d.y / s, width: d.width / s, height: d.height / s }
}

const displayOriginToDip = async (d: any): Promise<{ x: number; y: number }> => {
  const anchor = await getDesktopDipAnchor()
  // The anchor is exact for the display the browser is on — the only display
  // whose origin these helpers ever return (capture follows the browser).
  if (anchor) return physToDipPoint(anchor, { x: d.x, y: d.y })
  const p = displayPointRect(d)
  return { x: p.x, y: p.y }
}

export const desktopCaptureDisplayOrigin = async (
  displayHint?: { x: number; y: number; width: number; height: number } | null
): Promise<{ x: number; y: number }> => {
  try {
    const api = getXModule2API()
    // With a capture hint the captured display is KNOWN — the origin must be
    // that display's, not the foreground-browser guess (they differ exactly
    // when the hint matters: a non-browser app focused mid-run).
    if (displayHint) {
      const displays: any[] = await api.invoke('get_display_list')
      const hd = (displays || []).find((d: any) => d.x === displayHint.x && d.y === displayHint.y)
      if (hd) return await displayOriginToDip(hd)
    }
    const [displays, rect] = await Promise.all([
      api.invoke('get_display_list') as Promise<any[]>,
      api.invoke('get_active_browser_outer_rect', {}).catch(() => null)
    ])
    if (!displays || !displays.length || !rect) return { x: 0, y: 0 }
    // The browser rect and the raw display bounds share units per platform
    // (physical on Windows, points on macOS) — find in raw units, return in
    // DIP space.
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const d = displays.find((d: any) =>
      cx >= d.x && cx < d.x + d.width && cy >= d.y && cy < d.y + d.height)
    if (!d) return { x: 0, y: 0 }
    return await displayOriginToDip(d)
  } catch (e) {
    return { x: 0, y: 0 }
  }
}

const desktopDisplayOrigin = async (rect: { x: number; y: number; width: number; height: number }): Promise<{ x: number; y: number }> => {
  try {
    const displays: any[] = await getXModule2API().invoke('get_display_list')
    const anchor = await getDesktopDipAnchor()
    // The incoming rect is DIP space (a stored search result) — compare
    // against DIP display bounds. With an anchor the browser's display maps
    // exactly; other displays map approximately, but a crop rect from a
    // browser-display capture never lies in them.
    const toDip = (d: any) => anchor
      ? { ...physToDipPoint(anchor, { x: d.x, y: d.y }), width: d.width / anchor.dpr, height: d.height / anchor.dpr }
      : displayPointRect(d)
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const d = displays.map(toDip).find(p =>
      cx >= p.x && cx < p.x + p.width && cy >= p.y && cy < p.y + p.height)
    return d ? { x: d.x, y: d.y } : { x: 0, y: 0 }
  } catch (e) {
    return { x: 0, y: 0 }
  }
}

export const captureImage = async (args: any) => {
  console.log('captureImage args >>>', args)
  const { searchArea, storedImageRect, scaleDpi, isDesktop, devicePixelRatio } = args

  if (isDesktop) {
    const cvApi = getNativeCVAPI()
    // The desktop capture covers the display the BROWSER WINDOW is on, so
    // physical<->DIP conversion must use THAT display's scale — the anchor's
    // dpr. The panel's own devicePixelRatio (the `devicePixelRatio` arg)
    // describes the PANEL's display, which is a different number whenever the
    // IDE sits on a differently-scaled monitor than the play window (field
    // failure 2026-08-20: OCR boxes scaled by 1.25 on a 1.75 display, every
    // OCR/vision-aimed click missed). Anchor null (macOS, no host) keeps the
    // old factor.
    const anchorForScale = await getDesktopDipAnchor()
    const captureDpr = (anchorForScale && anchorForScale.dpr) || devicePixelRatio
    // Pin the capture to the play window's display (see desktop_dip.ts) —
    // without the hint the host follows the FOREGROUND window, which mid-run
    // may be a non-browser app (capture fell back to the primary display).
    // Same display = same border: desktop automation is visibly running here.
    const displayHint = await getDesktopCaptureHint()
    showDesktopBorder() // fire-and-forget; never delays the capture
    const crop = (imgSrc: string) => {
      switch (searchArea) {
        case 'rect': {
          if (!storedImageRect) {
            throw new Error('storedImageRect is required')
          }
          // area-limited desktop OCR/vision: dim everything outside the area
          showDesktopSearchAreaDip(storedImageRect, displayHint)
          // Note: Must scale up rect to screen coordinates — display-LOCAL
          // ones: the capture is of the display the browser is on.
          return desktopDisplayOrigin(storedImageRect).then(origin => {
            const local = {
              ...storedImageRect,
              x: storedImageRect.x - origin.x,
              y: storedImageRect.y - origin.y
            }
            return subImage(imgSrc, scaleRect(local, captureDpr))
          }).then((dataUrl) => ({
            dataUrl,
            offset: {
              x: storedImageRect.x,
              y: storedImageRect.y
            }
          }))
        }

        default: {
          // Full-display capture: word/match coordinates read off it are
          // display-LOCAL — anchor them with the display's global origin, or
          // desktop-OCR clicks land on the wrong monitor (found at Dell-local
          // (925,687), clicked at Retina-global (925,687) — the right-click
          // demo's exact miss).
          return desktopCaptureDisplayOrigin(displayHint).then(origin => ({
            dataUrl: imgSrc,
            offset: { x: origin.x, y: origin.y }
          }))
        }
      }
    }
    
    return withDesktopCaptureCover(() => cvApi.captureDesktop({ path: undefined, displayHint }))
      .then((hardDrivePath) => cvApi.readFileAsDataURL(hardDrivePath, true))
      .then((originalDataUrl) => {
        return crop(originalDataUrl).then(({ dataUrl, offset }) => {
          return Promise.all([saveDataUrlToLastScreenshot(dataUrl), saveDataUrlToLastDesktopScreenshot(originalDataUrl)]).then(() => ({
            dataUrl,
            offset,
            viewportOffset: offset,
            scale: 1 / captureDpr
          }))
        })
      })
  } else {
    const captureScreenshotService = new CaptureScreenshotService({
      captureVisibleTab: (windowId, options) => csIpc.ask('PANEL_CAPTURE_VISIBLE_TAB', { windowId, options }),
      onThrottleWait: (waitMs) => {
        store.dispatch(act.addLog('warning', `W370: Screenshot rate limit reached — waited ${waitMs}ms for the next screenshot slot (Chrome allows ~2 captures/sec). Visual/OCR steps in tight loops are slowed down by this; consider adding a pause between them.`))
      }
    })

    return getScreenshotInSearchArea({
      searchArea,
      storedImageRect,
      devicePixelRatio,
      captureScreenshotService,
      dpiScale: scaleDpi ? 96 / getPageDpi() : 1
    })
  }
}


export const captureScreenShot = async ({ vars, isDesktop }: { vars: any; isDesktop: boolean }) => {

  console.log('#220 captureScreenShot:>> vars.dump():>> ', vars.dump())
  console.log('#220 captureScreenShot:>> isDesktop:>> ', isDesktop)

  const storedImageRect = vars.get('!storedImageRect')
  const searchArea = vars.get('!visualSearchArea') || 'viewport'


  return captureImage({
      isDesktop,
      storedImageRect,
      searchArea: /\.png/i.test(searchArea) ? 'rect' : searchArea,
      scaleDpi: true,
      devicePixelRatio: window.devicePixelRatio
    })
      .then(() => delay(() => {}, 1000))
      .then(() => {
        const screenshotFileName = isDesktop
          ? ensureExtName('.png', C.LAST_DESKTOP_SCREENSHOT_FILE_NAME)
          : ensureExtName('.png', C.LAST_SCREENSHOT_FILE_NAME)

        console.log('#220 isDesktop:>> ', isDesktop)
        console.log('#220 screenshotFileName:>> ', screenshotFileName)

        // return null
        // logMessage('Screenshot taken', 'user', 'result')
        return getFileBufferFromScreenshotStorage(screenshotFileName).then((imageBuffer) => {
          return imageBuffer
        })
      })
  
}
