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
  runOCRTesseractC,
  scaleOcrResponseCoordinates,
  searchTextInOCRResponse
} from '@/services/ocr'
import { getOcrCommandCounter } from '@/services/ocr/command_counter'
import { convertOcrLanguageToTesseractLanguage } from '@/services/ocr/languages'
import { OcrHighlightType } from '@/services/ocr/types'
import { readableSize } from '@/services/storage/flat/storage'
import { captureImage } from './helper'
import { getXFile } from '@/services/xmodules/xfile'

// --- XModule Local OCR availability probe -----------------------------------
// AUTHORING-time helper, deliberately NOT used to switch engines at runtime:
// the engine a macro runs with is exactly the configured/requested one, so
// runs stay predictable. The probe feeds the environment info the AI macro
// author sees, so it can SUGGEST the best reader ({engine: 'xmodule'} when the
// XModule is installed) while the macro is being written. Cached: a hit for
// the session, a miss for 60s (a freshly installed XModule is picked up
// without a reload).
let xmoduleOcrProbe: { available: boolean; at: number } | null = null
export const isXModuleOcrAvailable = (): Promise<boolean> => {
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

  // DESKTOP SCOPE ONLY: the Javascript OCR (98) is never the right default
  // here — a desktop read already requires the XModule (the capture itself
  // comes from it), and the XModule's Local OCR reads native UI far better,
  // while the JS engine loses window titles, menu entries and selected
  // (white-on-highlight) text. So when the caller did not ask for a specific
  // engine and the configured one is 98, desktop reads use 99. Browser-scope
  // reads are untouched: they run with exactly the configured engine.
  // Local OCR ships for Windows and macOS only — on Linux the JS engine
  // stays the default (the availability probe alone would not catch that,
  // since the XModule itself does exist there).
  //
  // "did not ask for a specific engine" is now the CALLER's word (engineExplicit),
  // not the guess `config.ocrEngine === 98` — which was wrong for the one case
  // the log message promises: a user configured to 98 who passes {engine: 98}
  // got silently upgraded to 99 anyway. DesktopClickAccuracyRange part 2 tests
  // the Javascript OCR by name, so that silent swap would make it test the
  // wrong engine and report the other one's accuracy.
  const localOcrOs = !/linux/i.test(window.navigator.userAgent) || /(windows|mac os|macintosh)/i.test(window.navigator.userAgent)
  const askedForEngine = engineExplicit !== undefined
    ? !!engineExplicit
    : Number(store.getState().config.ocrEngine) !== 98 // legacy callers: old proxy
  if (isDesktop && localOcrOs && Number(engine) === 98 && !askedForEngine) {
    if (await isXModuleOcrAvailable()) {
      if (!loggedDesktopEngine) {
        loggedDesktopEngine = true
        store.dispatch(
          act.addLog('info', "Desktop OCR: using the XModule Local OCR ({engine: 'xmodule'}) — it reads native UI far better than the Javascript OCR. Pass {engine: 'javascript'} to force the Javascript engine.")
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
          if (!ocrSpaceApiKey) {
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
        // Short label for the OCR engine being used: Cloud E1/E2/E3 for the
        // OCR.Space cloud engines, JS for the Javascript (Tesseract) engine,
        // Local for the XModule local OCR.
        const engineLabel = engine == 98 ? 'JS'
                          : engine == 99 ? 'Local'
                          : 'Cloud E' + engine
        if (store.getState().player.status != 'STOPPED') {
          store.dispatch(act.addLog('info', `OCR (${lang}, ${engineLabel}) started (${fileSize})`))
        }

        console.log('#233 engine:>> ', engine)

        if (engine == 98) {
          const tesseractLanguage = convertOcrLanguageToTesseractLanguage(lang.toLowerCase())

          const tesseractResult = runOCRTesseractC(
            {
              engine,
              image: dataUrl.split(',')[1],
              imageDataURL: dataUrl,
              language: tesseractLanguage,
              totalTimeout: ocrApiTimeout,
              singleApiTimeout: config.ocr.singleApiTimeout,
              os: (() => {
                const ua = window.navigator.userAgent
                if (/windows/i.test(ua)) return 'windows'
                if (/mac/i.test(ua)) return 'mac'
                return 'linux'
              })(),
              isOverlayRequired: true
            },
            (log, isNetwork) => {
              // console.log('log :>> ', log);
              if (isNetwork && 'loading language traineddata' === log.status) {
                const progressInPercentText = (log.progress * 100).toFixed(0) + '%'
                store.dispatch(act.addLog('info', `Loading OCR (${lang}) language - ${progressInPercentText}`))
              }
            }
          ).then((data) => {
            console.log('tess data :>> ', data)
            let ocrRes = data

            cancelCountDown()
            if (store.getState().player.status != 'STOPPED') {
              store.dispatch(
                act.addLog('info', `OCR result received (${getDuration(startTime, new Date().getTime())} from Javascript OCR)`)
              )
            }
            return {
              offset,
              viewportOffset,
              response: scaleOcrResponseCoordinates(ocrRes, scale)
            }
          })

          console.log('tesseractResult:>>', tesseractResult)
          return tesseractResult
        } else if (engine == 99) {
          const startTime = new Date().getTime()
          let xModuleOcrResult = runOCRLocal({
            engine,
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
        const calibrateNumber = (center.width * window.devicePixelRatio) / hit.words[0].word.WordText.length
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

      const documentBasedParseResults = safeUpdateIn(
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
          words: allWordsWithPosition(documentBasedParseResults, [])
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
  const isLocal = (v: any) => v == 98 || v == 99
  const vars = getVarsInstance()
  if (
    store.getState().config.ocrMode === 'disabled' &&
    !isLocal(engine) &&
    !isLocal(store.getState().config.ocrEngine) &&
    !isLocal(vars.get('!ocrEngine'))
  ) {
    throw new Error(
      'OCR feature disabled — Settings > OCR has no OCR.Space API key, so the cloud OCR engines cannot run. ' +
      'Either get a free key at https://ocr.space/ocrapi and enter it there, or use a reader that needs no account: ' +
      "the XModule Local OCR (engine 99, {engine: 'xmodule'} in a JS script) or the built-in Javascript OCR " +
      "(engine 98, {engine: 'javascript'})."
    )
  }
}
