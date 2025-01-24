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
import { getOcrEndpointPicker } from '@/services/ocr/endpoint_picker'
import { convertOcrLanguageToTesseractLanguage } from '@/services/ocr/languages'
import { OcrHighlightType } from '@/services/ocr/types'
import { readableSize } from '@/services/storage/flat/storage'
import { captureImage } from './helper'

export const getOcrResponse = ({
  searchArea,
  storedImageRect,
  ocrApiTimeout,
  store,
  lang,
  engine,
  scale,
  isTable,
  isDesktop,
  isLog,
  imageDataUrl
}) => {
  const ocrScale = scale

  return new Promise((resolve, reject) => {
    // Note: must make sure `getOcrCommandCounter` is called with args before this (currently it's in `initPlayer`)
    const ocrCmdCounter = getOcrCommandCounter()
    const getApiAndKey = () => {
      let stateConfig = store.getState().config
      console.log('config :>> ', config)
      console.log('stateConfig :>> ', stateConfig)
      const { ocrMode, ocrEngine, ocrSpaceApiKey, ocrOfflineURL, ocrOfflineAPIKey } = stateConfig

      console.log('ocrMode :>> ', ocrMode)
      console.log('ocrSpaceApiKey :>> ', ocrSpaceApiKey)

      switch (ocrMode) {
        case 'enabled': {
          if (!ocrSpaceApiKey) {
            throw new Error('Please set OCR API key first')
          }

          const ocrEndpointPicker = getOcrEndpointPicker()

          // For sample keys check: https://github.com/teamdocs/sidebar_uiv/issues/106
          // All free keys start with "K8...".
          const isFreeApiKey = isOcrSpaceFreeKey(ocrSpaceApiKey)

          if (!isFreeApiKey) {
            // it's a pro key
            let proOcrEndpoint
            if (ocrEngine == 1) {
              proOcrEndpoint = config.ocr.proApi1Endpoint
            } else if (ocrEngine == 2) {
              proOcrEndpoint = config.ocr.proApi2Endpoint
            }

            let server = ocrEndpointPicker.setSingleServerInstance({
              id: ocrEngine.toString(),
              key: ocrSpaceApiKey,
              url: proOcrEndpoint
            })
            return server
          } else {
            let server = ocrEndpointPicker.setSingleServerInstance({
              id: '3',
              key: ocrSpaceApiKey,
              url: config.ocr.freeApiEndpoint
            })
            return server
          }
        }

        case 'offline_enabled': {
          if (!/^https?:\/\//.test(ocrOfflineURL)) {
            throw new Error('Please set local OCR API first')
          }

          if (!ocrOfflineAPIKey || !ocrOfflineAPIKey.length) {
            throw new Error('Please set local OCR API key first')
          }

          return Promise.resolve({
            url: ocrOfflineURL,
            key: ocrOfflineAPIKey
          })
        }

        default: {
          throw new Error('Please enable OCR first')
        }
      }
    }

    const prepare = (() => {
      // If version is not free version and the user reaches the 100th online OCR conversions,
      // then - before making the 101 conversion - call the API for a license check.
      // Of course, only if we've cached the license key and previous license check result
      if (getLicenseService().hasNoLicense() || ocrCmdCounter.get() !== config.xmodulesLimit.unregistered.ocrCommandCount) {
        return Promise.resolve()
      }

      return getLicenseService()
        .recheckLicenseIfPossible()
        .then(() => {
          const isExpired = getLicenseService().isLicenseExpired()

          if (isExpired) {
            throw new Error('Activation check failed. Reset to free edition. If you believe this was an error, please contact tech support')
          }
        })
    })()

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
        if (store.getState().player.status != 'STOPPED') {
          store.dispatch(act.addLog('info', `OCR (${lang}) started (${fileSize})`))
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
                console.log('getApiUrlAndApiKey data :>> ', data)
                //  store.dispatch(act.addLog('info', `OCR request is sent to ${data.url}`))
                return data
              })
            },
            shouldRetry: () => {
              const { ocrMode } = store.getState().config
              console.log('shouldRetry :>> ')

              switch (ocrMode) {
                case 'enabled':
                  return getOcrEndpointPicker()
                    .isAllDown()
                    .then((down) => !down)
                case 'offline_enabled':
                case 'disabled':
                  return false
              }
            },
            didGetResponse: (data) => {
              const { server, startTime, endTime, response, error } = data
              const id = server.id || server.url

              console.log('didGetResponse data:>> ', data)

              return getOcrEndpointPicker()
                .validServers()
                .then((result) => {
                  // It hasn't marked current api, so it's safer to tell we have next to try if there are gte 2 servers.
                  const hasNextToTry = result.servers.length >= 2

                  let endpointType =
                    server.url == config.ocr.proApi1Endpoint ? 'pro1' : server.url == config.ocr.proApi2Endpoint ? 'pro2' : 'free'

                  if (response) {
                    store.dispatch(
                      act.addLog('info', `OCR result received (${getDuration(startTime, endTime)} from ${endpointType} endpoint)`)
                    )
                  } else if (error) {
                    store.dispatch(
                      act.addLog(
                        'warning',
                        `Error in OCR endpoint ${id} after ${getDuration(startTime, endTime)}: ${error.message}` +
                          (hasNextToTry ? ' - trying next.' : '')
                      )
                    )
                  }

                  if (id && response) {
                    getOcrEndpointPicker().use(id)
                  }

                  if (!id) return Promise.resolve()
                  // Note: only mark server as error if browser is online
                  if (!window.navigator.onLine) return Promise.resolve()

                  return getOcrEndpointPicker()
                    .report(id, {
                      lastError: error,
                      lastOcrExitCode: response ? response.OCRExitCode : undefined,
                      lastRequestTimestamp: startTime,
                      lastResponseTimestamp: endTime,
                      lastTotalMilliseconds: endTime - startTime
                    })
                    .then(() => {})
                })
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

              if (/All OCR servers are down/i.test(e.message)) {
                getOcrEndpointPicker().reset()
              }

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

export const guardOcrSettings = ({ store }) => {
  const vars = getVarsInstance()
  if (
    store.getState().config.ocrMode === 'disabled' &&
    store.getState().config.ocrEngine != 99 &&
    vars.get('!ocrEngine') != 99 &&
    store.getState().config.ocrEngine != 98 &&
    vars.get('!ocrEngine') != 98
  ) {
    throw new Error('OCR feature disabled.')
  }
}
