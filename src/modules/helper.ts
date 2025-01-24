import { CaptureScreenshotService } from '@/common/capture_screenshot'
import { scaleRect, subImage } from '@/common/dom_utils'
import csIpc from '@/common/ipc/ipc_cs'
import { delay } from '@/common/ts_utils'
import { ensureExtName, getPageDpi } from '@/common/utils'
import Ext from '@/common/web_extension'
import { getState } from '@/ext/common/global_state'
import { store } from '@/redux'
import { getScreenshotInSearchArea, saveDataUrlToLastDesktopScreenshot, saveDataUrlToLastScreenshot } from '@/search_vision'
import { getNativeCVAPI } from '@/services/desktop'
import * as C from '@/common/constant'
import { getFileBufferFromScreenshotStorage } from '@/common/ai_vision'

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

export const getSidePanelWidth = async (args: any) => {
  // sidepanel has a padding around it's content
  const sidePanelPadding = 20
  let config = await store.getState().config
  if (config && !config.sidePanelOnLeft) {
    return Promise.resolve([0, args])
  } else {
    return getState().then((globalState: any) => {
      return Ext.tabs.get(globalState.tabIds.toPlay).then((playTab: any) =>
        Ext.windows.get(playTab.windowId).then((playWindow: any) => {
          let sidePanelWidth = playWindow.width - playTab.width - sidePanelPadding
          return [sidePanelWidth, args]
        })
      )
    })
  }
}

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
    
    return cvApi
      .captureDesktop({ path: undefined })
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
      captureVisibleTab: (windowId, options) => csIpc.ask('PANEL_CAPTURE_VISIBLE_TAB', { windowId, options })
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
