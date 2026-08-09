import { delay, dpiFromFileName, getPageDpi, ensureExtName, dataURItoBlob } from './common/utils'
import { isMac } from './common/ts_utils'
import { ComputerVisionType, isCVTypeForDesktop } from './common/cv_utils';
import { activateTab } from './common/tab_utils'
import { getStorageManager } from './services/storage'
import { getXDesktop } from './services/xmodules/xdesktop'
import { getNativeCVAPI, convertImageSearchResultIfAllCoordiatesBasedOnTopLeftScreen, ConvertResultItem } from './services/desktop'
import { DesktopScreenshot } from './desktop_screenshot_editor/types'
import { PageInfo, CaptureScreenshotService, scaleDataURI } from './common/capture_screenshot'
import { Rect, Point } from './common/types'
import * as C from './common/constant'
import { Ipc } from './common/ipc/ipc_promise';
import { getState } from './ext/common/global_state'
import { getPlayTabIpc } from './ext/common/tab'
import { searchImageInExtension } from './services/vision/adaptor'

export type SearchVisionParams = {
  visionFileName: string;
  minSimilarity: number;
  command: any;
  cvScope: ComputerVisionType;
  devicePixelRatio: number;
  captureScreenshotService: CaptureScreenshotService;
  searchArea?: string;
  storedImageRect?: Rect;
}

export type SearchVisionResult = {
  regions: ConvertResultItem[];
  imageInfo: {
    source: DesktopScreenshot.ImageSource;
    path: string;
  }
}

export function searchVision(args: SearchVisionParams): Promise<SearchVisionResult> {
  const { visionFileName, minSimilarity, searchArea = 'full', storedImageRect, command, cvScope, devicePixelRatio, captureScreenshotService } = args
  const commandExtra          = command.extra || {}
  const requireGreenPinkBoxes = !!commandExtra.relativeVisual
  const enableGreenPinkBoxes  = typeof commandExtra.relativeVisual === 'boolean' ? commandExtra.relativeVisual : /_relative\.png$/i.test(visionFileName)
  const patternDpi            = dpiFromFileName(visionFileName) || 96
  const pageDpi               = getPageDpi()
  const pStorageMan           = Promise.resolve(getStorageManager())
  // PLATFORM VARIANT: on macOS, 'tab_dpi_96.png' uses 'tab_mac_dpi_96.png'
  // instead when that file exists. Widgets are drawn by the OS, not by the
  // image search — the same control has different corner radii, fonts, focus
  // rings and antialiasing on macOS, so an image captured on Windows scores
  // just under the bar rather than failing outright (0.55-0.59 against a 0.60
  // default, measured on the shipped sidebar/toolbar anchors). Raising the
  // threshold would paper over it; shipping the platform's own pixels does
  // not. Falls back to the base name, so one image still serves every platform
  // where the target looks the same — which is why the plain black-on-white
  // range_* words need no variant.
  //
  // '_mac' goes BEFORE the dpi tag so '_dpi_<n>' stays the LAST element of the
  // name: the rescaler reads it, and the resource/rename paths anchor on it
  // ( /_dpi_\d+$/ and /(?:_dpi_\d+)?\.png$/ ), so a suffix after it would
  // quietly break them.
  const platformVariantOf     = (fileName: string): string | null => {
    if (!isMac()) return null
    if (/_mac(?:_dpi_\d+)?\.png$/i.test(fileName)) return null
    if (!/\.png$/i.test(fileName)) return null

    return /_dpi_\d+\.png$/i.test(fileName)
      ? fileName.replace(/(_dpi_\d+\.png)$/i, '_mac$1')
      : fileName.replace(/\.png$/i, '_mac.png')
  }
  const getPatternImage       = (fileName: string) => {
    return pStorageMan.then(storageMan => {
      const visionStorage = storageMan.getVisionStorage()
      const variant       = platformVariantOf(fileName)

      const pickName = () => {
        if (!variant) return Promise.resolve(fileName)
        return visionStorage.exists(variant)
        .then((hasVariant: boolean) => hasVariant ? variant : fileName)
        .catch(() => fileName)
      }

      return pickName().then((name: string) => {
        return visionStorage.exists(name)
        .then(existed => {
          if (!existed) throw new Error(`Error #121: ${command.cmd}: No input image found for file name '${fileName}'`)
          return visionStorage.read(name, 'DataURL')
        })
      })
    })
  }

  if (minSimilarity < 0.1 || minSimilarity > 1.0) {
    throw new Error('confidence should be between 0.1 and 1.0')
  }

  const isFullScreenshot = (searchArea !== 'rect' && !/\.png/i.test(searchArea)) || !storedImageRect
  // Note: storedImageRect is supposed to be also returned by this API call
  // thus it is scaled down by (1 / window.devicePixelRatio),
  // we should recover coordiates to screen pixels
  const searchAreaRect = isFullScreenshot ? undefined : {
    x:      window.devicePixelRatio * storedImageRect!.x,
    y:      window.devicePixelRatio * storedImageRect!.y,
    width:  window.devicePixelRatio * storedImageRect!.width,
    height: window.devicePixelRatio * storedImageRect!.height
  }

  const pRegions = (() => {
    switch (cvScope) {
      case 'desktop': {

        return getXDesktop().sanityCheck()
        .then(() => getPatternImage(visionFileName))
        .then(dataUrl => getNativeCVAPI().getImageFromDataUrl(dataUrl as string, patternDpi))
        .then(imageObj => {
          return getNativeCVAPI().searchDesktopWithGuard({
            pattern: imageObj,
            options: {
              minSimilarity,
              enableGreenPinkBoxes,
              requireGreenPinkBoxes,
              searchArea:         searchAreaRect,
              enableHighDpi:      true,
              allowSizeVariation: true,
              saveCaptureOnDisk:  true,
              limitSearchArea:    !isFullScreenshot
            }
          })
          .then(result => {
            return getNativeCVAPI().readFileAsDataURL(result.capturePath!, true)
            .then(dataUrl => {
              return saveDataUrlToLastDesktopScreenshot(dataUrl)
              // Note: convert coordinates to CSS pixels
              .then(() => convertImageSearchResultIfAllCoordiatesBasedOnTopLeftScreen(result, 1 / window.devicePixelRatio, searchAreaRect))
            })
          })
        })
      }

      case 'browser':
      default:
        // Browser scope always uses the in-extension WASM matcher — even when
        // the DesktopAutomation XModule is installed. One engine, identical
        // results for everyone, no native install needed; the XModule is only
        // used for desktop scope (screen capture + OS-level input) above.
        // The pattern is loaded UN-resized: the engine applies the
        // pattern→page DPI scale itself (searchImageScaled) AFTER green/pink
        // box detection — prescaling here interpolates away the exact box
        // colors on Retina/HiDPI and causes E601 (the native host has no
        // searchImageScaled equivalent, which is why it was dropped here; see
        // uivision-wasm docs/fix-e601-green-pink-dpi.md).
        return Promise.all([
          getPatternImage(visionFileName),
          getScreenshotInSearchArea({ searchArea, storedImageRect, devicePixelRatio, captureScreenshotService, dpiScale: 1 })
        ])
        .then(([patternDataUrl, targetImageInfo]) => {
          return searchImageInExtension({
            patternImageUrl: patternDataUrl as string,
            targetImageUrl: targetImageInfo.dataUrl,
            minSimilarity,
            allowSizeVariation: true,
            enableGreenPinkBoxes,
            requireGreenPinkBoxes,
            patternScale: pageDpi / patternDpi,
            // NEVER pass searchAreaRect here: every non-full browser capture
            // mode ('rect', '.png', 'element:') already delivers the CROPPED
            // area as the target image, with offsets rebased to the crop —
            // cropping again inside the matcher cuts the area out of its own
            // crop (a rect whose origin exceeds its size crops to nothing,
            // which is how {area}-limited finds matched nothing). The desktop
            // branch above is different: its capture is the full screen, so
            // the native matcher does need the rect.
            searchAreaRect: undefined,
            scaleDownRatio: window.devicePixelRatio,
            pageOffset: targetImageInfo.offset,
            viewportOffset: targetImageInfo.viewportOffset
          })
        })
    }
  })()

  return pRegions.then(regions => {
    return {
      regions,
      imageInfo: {
        source: DesktopScreenshot.ImageSource.Storage,
        path:   ensureExtName(
          '.png',
          isCVTypeForDesktop(cvScope) ? C.LAST_DESKTOP_SCREENSHOT_FILE_NAME : C.LAST_SCREENSHOT_FILE_NAME
        )
      }
    }
  })
}

export function saveDataUrlToScreenshot (fileName: string, dataUrl: string): Promise<void> {
  return getStorageManager()
  .getScreenshotStorage()
  .overwrite(
    ensureExtName('.png', fileName),
    dataURItoBlob(dataUrl)
  )
  // TODO:
  // getPanelTabIpc()
  // .then(panelIpc => {
  //   return panelIpc.ask('RESTORE_SCREENSHOTS')
  // })
}

export function saveDataUrlToLastScreenshot (dataUrl: string): Promise<void> {
  return saveDataUrlToScreenshot(C.LAST_SCREENSHOT_FILE_NAME, dataUrl)
}

export function saveDataUrlToLastDesktopScreenshot (dataUrl: string): Promise<void> {
  return saveDataUrlToScreenshot(C.LAST_DESKTOP_SCREENSHOT_FILE_NAME, dataUrl)
}

type GetScreenshotInSearchAreaParams = {
  searchArea: string;
  dpiScale: number;
  devicePixelRatio: number;
  captureScreenshotService: CaptureScreenshotService;
  storedImageRect?: Rect;
}

export function getScreenshotInSearchArea ({ searchArea, storedImageRect, dpiScale, devicePixelRatio, captureScreenshotService }: GetScreenshotInSearchAreaParams) {
  // Take png searh area as rect, it should have set `storedImageRect` in advance
  if (/\.png/.test(searchArea)) {
    searchArea = 'rect'
  }

  const capture = (ipc: Ipc, tabId: number) => {
    switch (searchArea) {
      case 'viewport':
        return Promise.all([
          ipc.ask('SCREENSHOT_PAGE_INFO', {}, C.CS_IPC_TIMEOUT),
          captureScreenshotService.captureScreen(tabId, devicePixelRatio)
        ])
        .then(([pageInfo, dataUrl]) => {
          saveDataUrlToLastScreenshot(dataUrl)

          return {
            offset: {
              x: pageInfo.originalX,
              y: pageInfo.originalY
            },
            viewportOffset: {
              x: 0,
              y: 0
            },
            dataUrl

          }
        })

      case 'full': {
        return Promise.all([
          ipc.ask('SCREENSHOT_PAGE_INFO', {}, C.CS_IPC_TIMEOUT),
          captureScreenshotService.captureFullScreen(tabId, {
            startCapture: (): Promise<PageInfo> => {
              return ipc.ask('START_CAPTURE_FULL_SCREENSHOT', {}, C.CS_IPC_TIMEOUT)
            },
            endCapture: (pageInfo: PageInfo): Promise<boolean> => {
              return ipc.ask('END_CAPTURE_FULL_SCREENSHOT', { pageInfo }, C.CS_IPC_TIMEOUT)
            },
            scrollPage: (offset: Point): Promise<Point> => {
              return ipc.ask('SCROLL_PAGE', { offset }, C.CS_IPC_TIMEOUT)
            }
          })
        ])
        .then(([pageInfo, dataUrl]) => {
          saveDataUrlToLastScreenshot(dataUrl as string)
          return {
            dataUrl,
            offset: {
              x: 0,
              y: 0
            },
            viewportOffset: {
              x: -1 * pageInfo.originalX,
              y: -1 * pageInfo.originalY
            }
          }
        })
      }

      case 'rect': {
        // Note: in this mode, `storedImageRect` is viewport based coordinates
        if (!storedImageRect) {
          throw new Error('rect mode: !storedImageRect should not be empty')
        }

        return ipc.ask('SCREENSHOT_PAGE_INFO')
        .then((pageInfo: PageInfo) => {
          return captureScreenshotService.captureScreenInSelectionSimple(tabId, {
            rect:               storedImageRect,
            devicePixelRatio:   pageInfo.devicePixelRatio
          })
          .then((dataUrl: string | Blob) => {
            saveDataUrlToLastScreenshot(dataUrl as string)

            return ({
              dataUrl,
              offset: {
                x: storedImageRect.x + pageInfo.originalX,
                y: storedImageRect.y + pageInfo.originalY
              },
              viewportOffset: {
                x: storedImageRect.x,
                y: storedImageRect.y
              }
            })
          })
        })
      }

      default: {
        if (/^element:/i.test(searchArea)) {
          // Note: in this mode, `storedImageRect` is document based coordinates
          if (!storedImageRect) {
            throw new Error('!storedImageRect should not be empty')
          }

          const fileName = ensureExtName('.png', C.LAST_SCREENSHOT_FILE_NAME)

          return Promise.all([
            ipc.ask('SCREENSHOT_PAGE_INFO', {}, C.CS_IPC_TIMEOUT),
            getStorageManager()
              .getScreenshotStorage()
              .read(fileName, 'DataURL')
          ])
          .then(([pageInfo, dataUrl]) => {
            return {
              dataUrl,
              offset: {
                x: storedImageRect.x,
                y: storedImageRect.y
              },
              viewportOffset: {
                x: storedImageRect.x - pageInfo.originalX,
                y: storedImageRect.y - pageInfo.originalY
              }
            }
          })
        }

        throw new Error(`Unsupported searchArea '${searchArea}'`)
      }
    }
  }

  return Promise.all([getPlayTabIpc(), getState()])
  .then(([ipc, state]) => {
    const toPlayTabId = state.tabIds.toPlay

    return activateTab(toPlayTabId, true)
    .then(() => delay(() => {}, C.SCREENSHOT_DELAY))
    .then(() => capture(ipc, toPlayTabId))
    .then(obj => {
      return scaleDataURI(obj.dataUrl, dpiScale)
      .then(dataUrl => ({
        dataUrl,
        offset:         obj.offset,
        viewportOffset: obj.viewportOffset
      }))
    })
  })
}
