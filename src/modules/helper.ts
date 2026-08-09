import { CaptureScreenshotService } from '@/common/capture_screenshot'
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

export const hideDownloadBar = () => csIpc.ask('PANEL_DISABLE_DOWNLOAD_BAR', {}).catch(() => true)

const showDownloadbar = () => csIpc.ask('PANEL_ENABLE_DOWNLOAD_BAR', {}).catch((e: any) => true)
export const showDownloadBarFinally = (hasXCommand: () => boolean, fn: () => any) => {
  return Promise.resolve(fn()).then(
    (data) => {
      if (!hasXCommand()) {
        return data
      }

      return showDownloadbar().then(() => data)
    },
    (e) => {
      if (!hasXCommand()) {
        return Promise.reject(e)
      }

      return showDownloadbar().then(() => Promise.reject(e))
    }
  )
}

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

export const captureImage = async (args: any) => {
  console.log('captureImage args >>>', args)
  const { searchArea, storedImageRect, scaleDpi, isDesktop, devicePixelRatio } = args

  if (isDesktop) {
    const cvApi = getNativeCVAPI()
    const crop = (imgSrc: string) => {
      switch (searchArea) {
        case 'rect': {
          if (!storedImageRect) {
            throw new Error('storedImageRect is required')
          }
          // Note: Must scale up rect to screen coordinates
          return subImage(imgSrc, scaleRect(storedImageRect, devicePixelRatio)).then((dataUrl) => ({
            dataUrl,
            offset: {
              x: storedImageRect.x,
              y: storedImageRect.y
            }
          }))
        }

        default: {
          return Promise.resolve({
            dataUrl: imgSrc,
            offset: { x: 0, y: 0 }
          })
        }
      }
    }
    
    return withDesktopCaptureCover(() => cvApi.captureDesktop({ path: undefined }))
      .then((hardDrivePath) => cvApi.readFileAsDataURL(hardDrivePath, true))
      .then((originalDataUrl) => {
        return crop(originalDataUrl).then(({ dataUrl, offset }) => {
          return Promise.all([saveDataUrlToLastScreenshot(dataUrl), saveDataUrlToLastDesktopScreenshot(originalDataUrl)]).then(() => ({
            dataUrl,
            offset,
            viewportOffset: offset,
            scale: 1 / devicePixelRatio
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
