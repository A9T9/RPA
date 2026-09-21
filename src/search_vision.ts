import { delay, dpiFromFileName, getPageDpi, ensureExtName, dataURItoBlob } from './common/utils'
import { isMac, isLinux } from './common/ts_utils'
import { ComputerVisionType, isCVTypeForDesktop } from './common/cv_utils';
import { activateTab } from './common/tab_utils'
import { getStorageManager } from './services/storage'
import { greenPinkUnsupportedError } from './services/xmodules2/routing'
import { getNativeCVAPI, convertImageSearchResultIfAllCoordiatesBasedOnTopLeftScreen, ConvertResultItem } from './services/desktop'
import { getDesktopDipAnchor, dipToPhysPoint, dipShiftOf, getDesktopCaptureHint } from './services/desktop_dip'
import { DesktopScreenshot } from './desktop_screenshot_editor/types'
import { PageInfo, CaptureScreenshotService, scaleDataURI } from './common/capture_screenshot'
import { Rect, Point } from './common/types'
import * as C from './common/constant'
import { Ipc } from './common/ipc/ipc_promise';
import { getState } from './ext/common/global_state'
import { withDesktopCaptureCover } from './modules/helper'
import { showDesktopBorder, showDesktopMatchMarks, showDesktopSearchArea } from './services/desktop_border'
import { getPlayTabIpc } from './ext/common/tab'
// Browser-scope image search on the Rust vision-core WASM engine (the only
// engine since 10.0.151; green/pink requests hard-fail with E347).
import { searchImageInExtensionRouted as searchImageInExtension } from './services/vision2/router'

export type SearchVisionParams = {
  visionFileName: string;
  minSimilarity: number;
  command: any;
  cvScope: ComputerVisionType;
  devicePixelRatio: number;
  captureScreenshotService: CaptureScreenshotService;
  searchArea?: string;
  storedImageRect?: Rect;
  // Which match the caller will act on, for the desktop overlay only: the
  // index into the SORTED list — reading order (top, left) when the target
  // named an index explicitly ('#2'), best-score-first otherwise — the same
  // rule run_command applies after this returns. Known before the search
  // starts, so the marks fire at the same moment as before, selected mark
  // emphasized. Omit = every mark drawn alike.
  markSelection?: { index: number, explicit: boolean };
}

// The overlay's twin of run_command's post-search sort, on the RAW host
// regions: returns the original index of the region the command will use,
// or undefined when the index is out of range (the command fails then).
export const pickRegionIndex = (
  regions: Array<{ matchedRect: { x: number, y: number }, score: number }>,
  selection: { index: number, explicit: boolean }
): number | undefined => {
  const order = regions.map((_, i) => i).sort((ia, ib) => {
    const a = regions[ia], b = regions[ib]
    const scoreSign = selection.explicit ? 0 : Math.sign(b.score - a.score)
    const vSign = Math.sign(a.matchedRect.y - b.matchedRect.y)
    const hSign = Math.sign(a.matchedRect.x - b.matchedRect.x)
    return scoreSign || vSign || hSign
  })
  return order[selection.index]
}

export type SearchVisionResult = {
  regions: ConvertResultItem[];
  imageInfo: {
    source: DesktopScreenshot.ImageSource;
    path: string;
  }
}

export function searchVision(args: SearchVisionParams): Promise<SearchVisionResult> {
  const { visionFileName, minSimilarity, searchArea = 'full', storedImageRect, command, cvScope, devicePixelRatio, captureScreenshotService, markSelection } = args
  const commandExtra          = command.extra || {}
  const requireGreenPinkBoxes = !!commandExtra.relativeVisual
  const enableGreenPinkBoxes  = typeof commandExtra.relativeVisual === 'boolean' ? commandExtra.relativeVisual : /_relative\.png$/i.test(visionFileName)
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
  //
  // The variant may carry a DIFFERENT dpi tag than the query: most Macs are
  // high-dpi, so Mac anchors are captured at native Retina resolution and
  // shipped as '_mac_dpi_192.png' — on a 192-dpi screen that matches 1:1 with
  // no rescale roundtrip. A same-dpi '_mac' variant stays the second choice.
  // Because the resolved name can change the dpi, getPatternImage returns the
  // dpi to use alongside the data; callers must not read it off the query.
  const platformVariantsOf    = (fileName: string): string[] => {
    if (/_(?:mac|linux)(?:_dpi_\d+)?\.png$/i.test(fileName)) return []
    if (!/\.png$/i.test(fileName)) return []

    // Linux mirrors the Mac arm for the same reason (font rasterizing and
    // widget pixels differ enough to sit just under the score bar), with one
    // twist: GNOME-Wayland browsers routinely self-scale (dpr 1.25 on a
    // scale-1.0 monitor), so the Linux anchors are captured at that render
    // scale and shipped as '_linux_dpi_120.png' (96 x 1.25). The dpi tag
    // feeds the same wire-dpi arithmetic as every pattern, so the variant
    // still resolves correctly on Linux systems at other scale factors.
    // DESKTOP scope only: viewport captures are CSS-sized, where the base
    // dpr-1 pattern already matches 1:1 (measured 0.95+) and the 1.25x
    // variant is the one that mismatches (measured 0.78).
    if (isLinux() && isCVTypeForDesktop(cvScope)) {
      const candidates = /_dpi_\d+\.png$/i.test(fileName)
        ? [
            fileName.replace(/_dpi_\d+\.png$/i, '_linux_dpi_120.png'),
            fileName.replace(/(_dpi_\d+\.png)$/i, '_linux$1')
          ]
        : [fileName.replace(/\.png$/i, '_linux.png')]
      return candidates.filter((name, i) => candidates.indexOf(name) === i)
    }
    if (!isMac()) return []

    const candidates = /_dpi_\d+\.png$/i.test(fileName)
      ? [
          fileName.replace(/_dpi_\d+\.png$/i, '_mac_dpi_192.png'),
          fileName.replace(/(_dpi_\d+\.png)$/i, '_mac$1')
        ]
      : [fileName.replace(/\.png$/i, '_mac.png')]
    return candidates.filter((name, i) => candidates.indexOf(name) === i)
  }
  const getPatternImage       = (fileName: string): Promise<{ dataUrl: string; dpi: number }> => {
    return pStorageMan.then(storageMan => {
      const visionStorage = storageMan.getVisionStorage()
      const variants      = platformVariantsOf(fileName)

      const pickName = (i: number = 0): Promise<string> => {
        if (i >= variants.length) return Promise.resolve(fileName)
        return visionStorage.exists(variants[i])
        .then((hasVariant: boolean) => hasVariant ? variants[i] : pickName(i + 1))
        .catch(() => pickName(i + 1))
      }

      return pickName().then((name: string) => {
        return visionStorage.exists(name)
        .then(existed => {
          if (!existed) throw new Error(`Error #121: ${command.cmd}: No input image found for file name '${fileName}'`)
          return visionStorage.read(name, 'DataURL')
          .then((dataUrl: any) => ({ dataUrl: dataUrl as string, dpi: dpiFromFileName(name) || 96 }))
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
  // The xmodule2 host handles global-anchored areas itself (it localizes
  // to the display the browser is on, where a secondary display's global
  // origin is legitimately negative) — pass the raw rect through. (On
  // Windows the desktop branch below replaces the ×dPR origin with the
  // per-monitor DIP anchor mapping; this value is its fallback.)
  const searchAreaRect = isFullScreenshot ? undefined : {
    x: window.devicePixelRatio * storedImageRect!.x,
    y: window.devicePixelRatio * storedImageRect!.y,
    width: window.devicePixelRatio * storedImageRect!.width,
    height: window.devicePixelRatio * storedImageRect!.height
  }

  const pRegions = (() => {
    switch (cvScope) {
      case 'desktop': {
        // Desktop vision runs on the xmodule2 host. Green/pink patterns
        // HARD-FAIL (never migrated by design): the error carries the
        // migration path and the V9 downgrade option.
        if (enableGreenPinkBoxes || requireGreenPinkBoxes) {
          return Promise.reject(greenPinkUnsupportedError(visionFileName))
        }
        const cvAPI = () => getNativeCVAPI()

        return Promise.resolve(true)
        .then(() => Promise.all([
          getPatternImage(visionFileName),
          // the host's screen dpi — used to reconcile the browser's OWN
          // scale with the monitor's below
          (cvAPI() as any).getDesktopDpi({}).then((d: any) => Number(d && d.dpiX) || Number(d) || 96).catch(() => 96),
          // Windows mixed-DPI: map the DIP area / matches through the window
          // anchor instead of one dPR factor (see services/desktop_dip.ts).
          getDesktopDipAnchor(),
          // Pin the host's capture to the play window's display — the
          // foreground heuristic picks the wrong monitor when a non-browser
          // app is focused mid-run (see services/desktop_dip.ts).
          getDesktopCaptureHint()
        ]))
        .then(([pattern, hostDpi, anchor, displayHint]: [any, number, any, any]) => {
          // BROWSER-SELF-SCALE CORRECTION (found on Wayland): patterns are
          // stored at CSS density and the host scales them by
          // haystackDpi/patternDpi. That is correct when the browser's
          // devicePixelRatio equals the monitor scale (Windows 125%: dpr
          // 1.25 on a 120-dpi screen; mac Retina: dpr 2 on 192), and wrong
          // when the browser scales ITSELF on an unscaled monitor (Wayland:
          // dpr 1.25 on a 96-dpi screen — content renders 1.25x physical,
          // but the prior computes 96/96=1 and searches 20% small; measured
          // 0.57 best score on a pixel-identical target). Dividing the
          // pattern dpi by the browser's self-scale (dpr * 96 / hostDpi)
          // makes the prior equal the true on-screen scale everywhere; on
          // aligned platforms the factor is exactly 1 and nothing changes.
          // The dpr that matters is the CAPTURE display's — the anchor's dpr
          // (the display the browser window is on). This code runs in the
          // PANEL, whose own devicePixelRatio describes the panel's display:
          // a different scale whenever the IDE sits on another monitor
          // (field failure 2026-08-20). Anchor null keeps the old factor.
          const captureDpr = (anchor && anchor.dpr) || window.devicePixelRatio || 1
          const selfScale = captureDpr * 96 / hostDpi
          const wireDpi = pattern.dpi / selfScale
          return cvAPI().getImageFromDataUrl(pattern.dataUrl, wireDpi)
            .then((imageObj: any) => [imageObj, anchor, displayHint])
        })
        .then(([imageObj, anchor, displayHint]: [any, any, any]) => {
          // The host wants the area in global PHYSICAL px. storedImageRect is
          // global DIP — anchored mapping when available, ×dPR otherwise.
          const hostSearchArea = (anchor && searchAreaRect && storedImageRect)
            ? (() => {
                const p = dipToPhysPoint(anchor, storedImageRect)
                return {
                  x: p.x,
                  y: p.y,
                  width: anchor.dpr * storedImageRect.width,
                  height: anchor.dpr * storedImageRect.height
                }
              })()
            : searchAreaRect
          // Same panel cover as desktop OCR (and the same !CAPTURE_HIDE_GUI
          // demo switch): the host captures the screen itself for this
          // search, and without the cover a desktop image search can match
          // pattern crops shown in the panel's own log/editor.
          showDesktopBorder() // desktop automation is visibly running here
          // area-limited search: dim everything the finder will ignore
          if (!isFullScreenshot && hostSearchArea) showDesktopSearchArea(hostSearchArea, displayHint)
          return withDesktopCaptureCover(() => cvAPI().searchDesktopWithGuard({
            pattern: imageObj,
            displayHint,
            options: {
              minSimilarity,
              enableGreenPinkBoxes,
              requireGreenPinkBoxes,
              searchArea:         hostSearchArea,
              enableHighDpi:      true,
              allowSizeVariation: true,
              saveCaptureOnDisk:  true,
              limitSearchArea:    !isFullScreenshot
            }
          }))
          .then(result => {
            // bounding boxes on the actual desktop (blue = image match) —
            // matchedRect is already in the global physical pixels the host
            // overlay draws in; fire-and-forget decoration. The match the
            // command will act on is emphasized (see markSelection).
            const regions = result.regions || []
            showDesktopMatchMarks(
              regions.map(r => r.matchedRect),
              'image',
              markSelection ? pickRegionIndex(regions, markSelection) : undefined
            )
            return cvAPI().readFileAsDataURL(result.capturePath!, true)
            .then(dataUrl => {
              return saveDataUrlToLastDesktopScreenshot(dataUrl)
              // Note: convert coordinates to CSS pixels — absolute fields get
              // the DIP shift so they line up with page screenX/Y coordinates
              // on mixed-scaling multi-monitor setups (zero shift otherwise).
              // The divisor must be the CAPTURE display's scale (anchor.dpr),
              // not the panel's devicePixelRatio: phys/anchorDpr + dipShift
              // is exactly physToDipPoint, and only that closes on a display
              // scaled differently than the panel's (2026-08-20).
              .then(() => convertImageSearchResultIfAllCoordiatesBasedOnTopLeftScreen(
                result,
                1 / ((anchor && anchor.dpr) || window.devicePixelRatio),
                hostSearchArea,
                anchor ? dipShiftOf(anchor) : undefined
              ))
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
        .then(([pattern, targetImageInfo]) => {
          return searchImageInExtension({
            patternImageUrl: pattern.dataUrl,
            targetImageUrl: targetImageInfo.dataUrl,
            minSimilarity,
            allowSizeVariation: true,
            enableGreenPinkBoxes,
            requireGreenPinkBoxes,
            patternScale: pageDpi / pattern.dpi,
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
