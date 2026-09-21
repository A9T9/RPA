import { getVarsInstance } from '@/common/variables'
import * as act from '@/actions'
import csIpc from '@/common/ipc/ipc_cs'
import { countDown, safeUpdateIn } from '@/common/ts_utils'
import { cloneSerializableLocalStorage, dataURItoBlob, delay, setIn } from '@/common/utils'
import config from '@/config'
import { updateState } from '@/ext/common/global_state'
import { getLicenseService } from '@/services/license'
import {
  allWordsWithPosition,
  isOcrSpaceFreeKey,
  ocrMatchCenter,
  runOCR,
  runOCRLocal,
  scaleOcrResponseCoordinates,
  searchTextInOCRResponse
} from '@/services/ocr'
import { getOcrCommandCounter } from '@/services/ocr/command_counter'
import { OcrHighlightType } from '@/services/ocr/types'
import { readableSize } from '@/services/storage/flat/storage'
import { captureImage } from './helper'
import { getXFile } from '@/services/xmodules/xfile'
import { runAiProviderOcr, AI_PROVIDER_OCR_ENGINE } from '@/services/ai/aiocr/service'

// --- XModule Local OCR availability probe -----------------------------------
// AUTHORING-time helper, deliberately NOT used to switch engines at runtime:
// the engine a macro runs with is exactly the configured/requested one, so
// runs stay predictable. The probe feeds the environment info the AI macro
// author sees, so it can SUGGEST the best reader ({engine: 'xmodule'} when the
// XModule is installed) while the macro is being written. Cached: a hit for
// the session, a miss for 60s (a freshly installed XModule is picked up
// without a reload).
let xmoduleOcrProbe: { available: boolean; at: number } | null = null
export const isXModuleOcrAvailable = (refresh = false): Promise<boolean> => {
  if (refresh) xmoduleOcrProbe = null
  if (xmoduleOcrProbe && (xmoduleOcrProbe.available || Date.now() - xmoduleOcrProbe.at < 60000)) {
    return Promise.resolve(xmoduleOcrProbe.available)
  }
  return Promise.race([
    getXFile()
      .getVersion()
      .then((info: any) => !!(info && info.installed)),
    delay(() => false, 3000)
  ])
    .catch(() => false)
    .then((available: boolean) => {
      xmoduleOcrProbe = { available, at: Date.now() }
      return available
    })
}

let loggedDesktopEngine = false

export const getOcrResponse = async ({
  searchArea,
  storedImageRect,
  ocrApiTimeout,
  store,
  lang,
  engine,
  engineExplicit,
  scale,
  isTable,
  isDesktop,
  isLog,
  imageDataUrl
}: any) => {
  const ocrScale = scale

  // DESKTOP SCOPE ONLY: the cross-platform ocrs engine (98, "builtin") is
  // never the best default here — a desktop read already requires the
  // XModule (the capture itself comes from it), and the OS reader
  // (Windows.Media.Ocr / Apple Vision, 99) reads native UI measurably
  // better (benchmarks in xmodule2/HANDOVER.md: "excellent" vs "fair"). So
  // when the caller did not ask for a specific engine and the configured
  // one is 98, desktop reads use 99. Browser-scope reads are untouched:
  // they run with exactly the configured engine. (On Linux both numbers
  // reach the same ocrs engine, so the upgrade is a no-op there.)
  //
  // "did not ask for a specific engine" is the CALLER's word (engineExplicit):
  // a user configured to 98 who passes {engine: 'builtin'} explicitly keeps
  // the cross-platform engine even at desktop scope.
  const localOcrOs = true
  const askedForEngine = engineExplicit !== undefined
    ? !!engineExplicit
    : Number(store.getState().config.ocrEngine) !== 98 // legacy callers: old proxy
  if (isDesktop && localOcrOs && Number(engine) === 98 && !askedForEngine) {
    if (await isXModuleOcrAvailable()) {
      if (!loggedDesktopEngine) {
        loggedDesktopEngine = true
        store.dispatch(
          act.addLog('info', "Desktop OCR: using the OS reader ({engine: 'builtin_win'/'builtin_mac'}) — it reads native UI better than the cross-platform engine. Pass {engine: 'builtin'} to force the cross-platform engine.")
        )
      }
      engine = 99
    }
  }

  return new Promise((resolve, reject) => {
    // Note: must make sure `getOcrCommandCounter` is called with args before this (currently it's in `initPlayer`)
    const ocrCmdCounter = getOcrCommandCounter()
    // Pro keys have two interchangeable endpoints (apipro1 / apipro2). For each
    // OCR command we try them in a random order: pick one, and if it fails fall
    // over to the other; if both fail we report an error. This queue holds the
    // not-yet-tried endpoints for the current command and is rebuilt per command
    // (per getOcrResponse call), so there is no persisted endpoint history.
    let proEndpointQueue: Array<{ id: string, key: string, url: string }> | null = null
    const getApiAndKey = () => {
      let stateConfig = store.getState().config
      console.log('config :>> ', config)
      console.log('stateConfig :>> ', stateConfig)
      const { ocrMode, ocrEngine, ocrSpaceApiKey } = stateConfig

      console.log('ocrMode :>> ', ocrMode)

      switch (ocrMode) {
        case 'enabled': {
          // the shared keys.json placeholder ("ui-vision-ai-free") is the
          // Ui.Vision AI free tier, not an OCR.space key (OPEN-ISSUES 38)
          if (!ocrSpaceApiKey || String(ocrSpaceApiKey).trim().toLowerCase() === 'ui-vision-ai-free') {
            throw new Error('Please set OCR API key first')
          }

          // For sample keys check: https://github.com/teamdocs/sidebar_uiv/issues/106
          // All free keys start with "K8...".
          const isFreeApiKey = isOcrSpaceFreeKey(ocrSpaceApiKey)

          if (isFreeApiKey) {
            // Free keys have a single endpoint, so there is nothing to fail over to.
            return Promise.resolve({
              id: 'free',
              key: ocrSpaceApiKey,
              url: config.ocr.freeApiEndpoint
            })
          }

          // Pro key: apipro1 and apipro2 are interchangeable (the engine is
          // selected via the OCREngine request param, not the URL). Try them in
          // a random order, falling over to the other one if the first fails.
          if (!proEndpointQueue) {
            const pros = [
              { id: 'pro1', key: ocrSpaceApiKey, url: config.ocr.proApi1Endpoint },
              { id: 'pro2', key: ocrSpaceApiKey, url: config.ocr.proApi2Endpoint }
            ]
            proEndpointQueue = Math.random() < 0.5 ? pros : [pros[1], pros[0]]
          }

          const next = proEndpointQueue.shift()
          if (!next) {
            throw new Error('All OCR servers are down')
          }
          return Promise.resolve(next)
        }

        default: {
          throw new Error('Please enable OCR first')
        }
      }
    }

    // There used to be a licence re-check here, fired on the conversion that
    // crossed the free OCR quota. The quota is gone (the config number it
    // compared against was already Infinity, so the branch had been dead), and
    // with it the reason to re-check mid-run.
    const prepare = Promise.resolve()

    let dataURLObjPromise = imageDataUrl
      ? Promise.resolve({ dataUrl: imageDataUrl })
      : prepare
          .then(() => (isDesktop ? Promise.resolve() : csIpc.ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')))
          // Note: add 1s delay here to make sure old OCR overlayed are cleared before taking new screenshot
          .then(() => delay(() => {}, 1000))
          .then(() =>
            captureImage({
              isDesktop,
              storedImageRect,
              searchArea: /\.png/i.test(searchArea) ? 'rect' : searchArea,
              scaleDpi: true,
              devicePixelRatio: window.devicePixelRatio
            })
          )

    return dataURLObjPromise
      .then(({ dataUrl, offset = { x: 0, y: 0 }, viewportOffset = { x: 0, y: 0 }, scale = 1 }) => {
        // console.log('final dataUrl :>> ', dataUrl);

        const blob = dataURItoBlob(dataUrl)
        const fileSize = readableSize(blob.size)
        const startTime = new Date() * 1
        const getDuration = (startTime, endTime) => ((endTime - startTime) / 1000).toFixed(1) + 's'
        const cancelCountDown = countDown({
          interval: 1000,
          timeout: ocrApiTimeout,
          onTick: ({ past, total }) => {
            store.dispatch(
              act.setTimeoutStatus({
                past,
                total,
                type: 'OCR in progress'
              })
            )
          }
        })

        // Note: check in advance so that it throws error before making OCR requests
        ocrCmdCounter.check()
        // Engine numbers: 98 = 'builtin' (cross-platform ocrs in the
        // XModule host — the number the removed Tesseract engine used, kept
        // so stored configs stay valid), 99 = the OS reader
        // ('builtin_win'/'builtin_mac'), 90 = 'aiprovider' (the configured
        // AI provider as OCR engine), 1/2/3 = OCR.Space cloud.
        const engineLabel =
          engine == 99 ? 'Local OS' :
          engine == 98 ? 'Local cross-platform' :
          engine == AI_PROVIDER_OCR_ENGINE ? 'AI provider' :
          'Cloud E' + engine
        if (store.getState().player.status != 'STOPPED') {
          store.dispatch(act.addLog('info', `OCR (${lang}, ${engineLabel}) started (${fileSize})`))
        }

        console.log('#233 engine:>> ', engine)

        if (engine == AI_PROVIDER_OCR_ENGINE) {
          // The AI provider as OCR engine — same integration surface as the
          // cloud engines (word boxes in the OCR.Space shape), same log
          // rhythm; shows up as task 'aiocr' in the proxy log.
          const startTime = new Date().getTime()
          return runAiProviderOcr(dataUrl).then((ocrRes) => {
            cancelCountDown()
            if (store.getState().player.status != 'STOPPED') {
              store.dispatch(act.addLog('info', `OCR result received (${getDuration(startTime, new Date().getTime())} from the AI provider)`))
            }
            return {
              offset,
              viewportOffset,
              response: scaleOcrResponseCoordinates(ocrRes, scale)
            }
          }, (e) => {
            cancelCountDown()
            throw e
          })
        }

        if (engine == 99 || engine == 98) {
          const startTime = new Date().getTime()
          let xModuleOcrResult = runOCRLocal({
            engine,
            localEngine: engine == 98 ? 'ocrs' : undefined,
            image: dataUrl.split(',')[1],
            language: lang,
            totalTimeout: ocrApiTimeout,
            singleApiTimeout: config.ocr.singleApiTimeout,
            os: (() => {
              const ua = window.navigator.userAgent
              if (/windows/i.test(ua)) return 'windows'
              if (/mac/i.test(ua)) return 'mac'
              return 'linux'
            })(),
            isOverlayRequired: true
          }).then((data) => {
            const b = new Buffer.from(data, 'base64')
            const results = b.toString()
            const ocrRes = JSON.parse(results)

            console.log('local ocrRes :>> ', ocrRes)

            cancelCountDown()
            if (store.getState().player.status != 'STOPPED') {
              store.dispatch(act.addLog('info', `OCR result received (${getDuration(startTime, new Date().getTime())} from XModule OCR)`))
            }
            return {
              offset,
              viewportOffset,
              response: scaleOcrResponseCoordinates(ocrRes, scale)
            }
          })

          console.log('xModuleOcrResult :>> ', xModuleOcrResult)

          return xModuleOcrResult
        } else {
          const remoteOcrResult = runOCR({
            engine,
            isTable,
            scale: ocrScale,
            image: dataUrl,
            language: lang,
            totalTimeout: ocrApiTimeout,
            singleApiTimeout: config.ocr.singleApiTimeout,
            isOverlayRequired: true,
            getApiUrlAndApiKey: () => {
              return getApiAndKey().then((data) => {
                //  store.dispatch(act.addLog('info', `OCR request is sent to ${data.url}`))
                return data
              })
            },
            shouldRetry: () => {
              const { ocrMode } = store.getState().config
              console.log('shouldRetry :>> ')

              // Retry only when there is still an untried pro endpoint to fail
              // over to. Free/offline have a single endpoint, so never retry.
              return ocrMode === 'enabled' && proEndpointQueue != null && proEndpointQueue.length > 0
            },
            didGetResponse: (data) => {
              const { server, startTime, endTime, response, error } = data

              console.log('didGetResponse data:>> ', data)

              // Another endpoint is left to try only if the failover queue still
              // has an entry (pro keys, first failure).
              const hasNextToTry = proEndpointQueue != null && proEndpointQueue.length > 0

              const endpointType =
                server.url == config.ocr.proApi1Endpoint ? 'pro1' : server.url == config.ocr.proApi2Endpoint ? 'pro2' : 'free'

              if (response) {
                store.dispatch(
                  act.addLog('info', `OCR result received (${getDuration(startTime, endTime)} from ${endpointType} endpoint)`)
                )
              } else if (error) {
                store.dispatch(
                  act.addLog(
                    'warning',
                    `Error in OCR endpoint ${endpointType} after ${getDuration(startTime, endTime)}: ${error.message}` +
                      (hasNextToTry ? ' - trying next.' : '')
                  )
                )
              }

              return Promise.resolve()
            }
          }).then(
            (data) => {
              cancelCountDown()

              // Don't increase ocr counter if it's a local ocr requests
              if (store.getState().config.ocrMode === 'enabled') {
                ocrCmdCounter.inc()
              }

              return {
                offset,
                viewportOffset,
                response: scaleOcrResponseCoordinates(data, scale)
              }
            },
            (e) => {
              cancelCountDown()
              throw e
            }
          )

          console.log('remoteOcrResult :>> ', remoteOcrResult)

          return remoteOcrResult
        }
      })
      .then(resolve, reject)
  })
}

// calibration OCR
export const ocrViewportCalibration = ({ store, isDesktop }) => {
  const clearBadge = () => csIpc.ask('PANEL_UPDATE_BADGE', { type: 'play', clear: true })

  return getOcrResponse({
    store,
    isDesktop,
    lang: store.getState().config.ocrLanguage,
    engine: store.getState().config.ocrEngine,
    scale: 'true',
    searchArea: 'viewport',
    storedImageRect: null,
    ocrApiTimeout: config.ocr.apiTimeout
  })
    .then(({ response, offset, viewportOffset }) => {
      const documentBasedParseResults = safeUpdateIn(
        ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
        (word) => ({
          ...word,
          Top: word.Top + offset.y,
          Left: word.Left + offset.x
        }),
        response.ParsedResults
      )
      const viewportBasedParseResults = safeUpdateIn(
        ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
        (word) => ({
          ...word,
          Top: word.Top + viewportOffset.y,
          Left: word.Left + viewportOffset.x
        }),
        response.ParsedResults
      )
      const [str, index, hasPos] = (() => {
        let match = 'OCRTEXTX'.match(/^(.+)@POS=(\d+)$/i)
        if (!match) return ['OCRTEXTX', 0, false]
        return [match[1], parseInt(match[2]) - 1, true]
      })()

      const searchResult = searchTextInOCRResponse({
        text: str,
        index: index,
        exhaust: true,
        parsedResults: viewportBasedParseResults
      })

      const { hit, all } = searchResult
      if (hit) {
        const center = ocrMatchCenter(hit)
        // logical px per character: the tick is added to the match's click
        // point, which is in logical px in every scope (the × devicePixelRatio
        // dates from the v9 physical-px desktop contract)
        const calibrateNumber = center.width / hit.words[0].word.WordText.length
        store.getState().config.ocrCalibration_internal = calibrateNumber
        updateState(setIn(['ocrCalibration_internal'], calibrateNumber))
        localStorage.setItem('ocrCalibration', calibrateNumber)
      }

      const ocrMatches = [
        // All words identified by OCR into one group
        {
          similarity: 1,
          highlight: OcrHighlightType.Matched,
          words: allWordsWithPosition(documentBasedParseResults, [])
        }
      ]

      // show overlay on website
      return csIpc.ask('PANEL_HIGHLIGHT_OCR_MATCHES', {
        ocrMatches,
        isDesktop,
        screenAvailableSize: {
          width: screen.availWidth,
          height: screen.availHeight
        },
        localStorage: cloneSerializableLocalStorage(localStorage)
      })
    })
    .then(
      () => {
        clearBadge()
      },
      (e) => {
        clearBadge()
        throw e
      }
    )
}

export const ocrViewport = ({ store, isDesktop }) => {
  const clearBadge = () => csIpc.ask('PANEL_UPDATE_BADGE', { type: 'play', clear: true })

  return getOcrResponse({
    store,
    isDesktop,
    lang: store.getState().config.ocrLanguage,
    engine: store.getState().config.ocrEngine,
    scale: 'true',
    searchArea: 'viewport',
    storedImageRect: null,
    ocrApiTimeout: config.ocr.apiTimeout
  })
    .then(({ response, offset, viewportOffset }) => {
      console.log('response :>> ', response)

      // The desktop overlay VIEWER draws over the raw capture, so it needs
      // capture-LOCAL coordinates; the offset (the display's global origin
      // since browser-display following) is for click consumers. Browser
      // overlays draw in the page and keep the offset mapping.
      const overlayParseResults = isDesktop
        ? response.ParsedResults
        : safeUpdateIn(
          ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
          (word) => ({
            ...word,
            Top: word.Top + offset.y,
            Left: word.Left + offset.x
          }),
          response.ParsedResults
        )

      const ocrMatches = [
        // All words identified by OCR into one group
        {
          similarity: 1,
          highlight: OcrHighlightType.Matched,
          words: allWordsWithPosition(overlayParseResults, [])
        }
      ]

      // show overlay on website
      //
      return csIpc.ask('PANEL_HIGHLIGHT_OCR_MATCHES', {
        ocrMatches,
        isDesktop,
        screenAvailableSize: {
          width: screen.availWidth,
          height: screen.availHeight
        },
        localStorage: cloneSerializableLocalStorage(localStorage),
        showOcrOverlay: true
      })
    })
    .then(
      () => {
        clearBadge()
      },
      (e) => {
        clearBadge()
        throw e
      }
    )
}

// "OCR disabled" means "no OCR.Space account configured" — it is a statement
// about the CLOUD engines. The two LOCAL readers (98 Javascript, 99 XModule)
// need no account, no key and no network, so they are exempt.
//
// `engine` is the reader THIS call asked for. A JS script names its engine per
// call — uiv.ocr.read({engine: 'xmodule'}) — instead of setting !ocrEngine, and
// without this argument that call was refused with "OCR feature disabled." on
// exactly the install the local engine exists for: XModule present, no cloud
// key. Callers that pass nothing (the classic commands) are unchanged: the
// configured engine and the !ocrEngine variable still decide.
export const guardOcrSettings = ({ store, engine }: any = {}) => {
  // engines that need no OCR.Space account: the two local readers (98
  // cross-platform, 99 OS) and the AI provider (90, its own key/config)
  const noAccountNeeded = (v: any) => v == 98 || v == 99 || v == AI_PROVIDER_OCR_ENGINE
  const vars = getVarsInstance()
  if (
    store.getState().config.ocrMode === 'disabled' &&
    !noAccountNeeded(engine) &&
    !noAccountNeeded(store.getState().config.ocrEngine) &&
    !noAccountNeeded(vars.get('!ocrEngine'))
  ) {
    throw new Error(
      'OCR feature disabled — Settings > OCR has no OCR.Space API key, so the OCR.Space cloud engines cannot run. ' +
      'Either get a free key at https://ocr.space/ocrapi and enter it there, or use a reader that needs no account: ' +
      "the local readers ({engine: 'builtin'} cross-platform, {engine: 'builtin_win'}/{engine: 'builtin_mac'} OS reader — both need the Desktop Automation XModule) " +
      "or the configured AI provider ({engine: 'aiprovider'})."
    )
  }
}
