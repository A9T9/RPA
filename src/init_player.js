import React from 'react'
import { message } from 'antd'
import varsFactory, { getVarsInstance } from './common/variables'
import Interpreter from './common/interpreter'
import { evaluateScript } from './common/eval'
import { getStorageManager } from './services/storage'
import { parseFromCSV, stringifyToCSV } from './common/csv'
import { Player, getPlayer } from './common/player'
import csIpc from './common/ipc/ipc_cs'
import log from './common/log'
import { updateIn, setIn, objMap, dataURItoBlob, delay, retry, and, loadImage, ensureExtName, getPageDpi, splitIntoTwo, isSidePanelWindowAsync, cloneSerializableLocalStorage } from './common/utils'
import * as C from './common/constant'
import * as act from './actions'
import { Actions } from './actions/simple_actions'
import Ext from '@/common/web_extension'
import FileSaver from './common/lib/file_saver'
import { renderLog } from './common/macro_log'
import { getNativeXYAPI, MouseButton, MouseEventType } from './services/xy'
import { getNativeCVAPI } from './services/desktop'
import { getXUserIO } from './services/xmodules/x_user_io'
import { getXLocal } from './services/xmodules/xlocal'
import { runOCR, runDownloadLog, runOCRLocal, runOCRTesseractC, searchTextInOCRResponse, ocrMatchCenter, allWordsWithPosition, scaleOcrResponseCoordinates, scaleOcrTextSearchMatch, isOcrSpaceFreeKey } from './services/ocr'
import { compose, flatten, safeUpdateIn, parseBoolLike, clone, milliSecondsToStringInSecond, id, strictParseBoolLike, withCountDown, countDown, isMac, isWindows } from './common/ts_utils'
import { readableSize } from './services/storage/flat/storage'
import { OcrHighlightType } from './services/ocr/types'
import { Counter } from './common/counter/counter'
import { getOcrCommandCounter } from './services/ocr/command_counter'
import { getOcrEndpointPicker } from './services/ocr/endpoint_picker'
import { prompt } from './components/prompt'
import { DesktopScreenshot } from './desktop_screenshot_editor/types'
import { createMacroCallStack, getMacroCallStack } from './services/player/call_stack/call_stack'
import { getCommandResults, MacroStatus } from './services/player/macro'
import { CallStackEvent } from './services/player/call_stack/types'
import { getMacroMonitor, MacroParamsProviderType } from './services/player/monitor/macro_monitor'
import { getDoneCommandIndices, getWarningCommandIndices, getErrorCommandIndices, getCurrentMacroId, findMacroNodeWithCaseInsensitiveRelativePath } from './recomputed'
import { MacroInspector } from './services/player/monitor/types'
import { isExtensionResourceOnlyCommand, parseImageTarget } from './common/command';
import { getNativeFileSystemAPI } from './services/filesystem';
import { parseProxyUrl } from './services/proxy'
import { ProxyScheme } from './services/proxy/types'
import { getXFile } from './services/xmodules/xfile'
import { MacroResultStatus } from './services/kv_data/macro_extra_data'
import { getPixel, isFirefox, isLocator, scaleRect, subImage } from './common/dom_utils'
import path, { posix as pathPosix, win32 as pathWin32 } from './common/lib/path'
import { decryptIfNeeded } from './common/encrypt'
import { getLicenseService } from './services/license'
import { ComputerVisionType, isCVTypeForDesktop } from './common/cv_utils'
import { getScreenshotInSearchArea, saveDataUrlToLastDesktopScreenshot, saveDataUrlToLastScreenshot, searchVision } from './search_vision'
import config from '@/config'
import { activateTab } from './common/tab_utils'
import { CaptureScreenshotService } from './common/capture_screenshot'
import { getState, updateState } from './ext/common/global_state'
import { getPlayTab, getPlayTabIpc } from './ext/common/tab'
import { runCommandInPlayTab } from './ext/popup/run_command'
import clipboard from './common/clipboard'
import { clearTimerForTimeoutStatus, startSendingTimeoutStatus } from './ext/popup/timeout_counter'
import { convertOcrLanguageToTesseractLanguage } from './services/ocr/languages'
import AnthropicService from '@/services/anthropic/anthropic.service'
import { parseAiVisionTarget, aiScreenXYImageBuffers, aiPromptGetPromptAndImageArrayBuffers, getFileBufferFromScreenshotStorage } from './common/ai_vision'
import Sampling from '@/services/ai/computer-use/sampling'

const REPLAY_SPEED_DELAY = {
  NODISPLAYV1: 1,
  NODISPLAY: 1,
  FASTV1: 1, // avoid UI freezing (DemoCsvReadArray: Fast=0 is ~30-40% faster as no UI updates)
  FAST: 1, 
  MEDIUMV1: 300,
  MEDIUM: 300,
  SLOWV1: 2000,
  SLOW: 2000
}

class TimeTracker {
  constructor () {
    this.reset()
  }

  reset () {
    this.startTime = new Date()
  }

  elapsed () {
    return (new Date() - this.startTime)
  }

  elapsedInSeconds () {
    const diff = this.elapsed()
    return (diff / 1000).toFixed(2) + 's'
  }
}
const captureScreenshotService = new CaptureScreenshotService({
  captureVisibleTab: (windowId, options) => csIpc.ask('PANEL_CAPTURE_VISIBLE_TAB', { windowId, options })
})

const setProxy = (proxy) => {
  return csIpc.ask('PANEL_SET_PROXY', { proxy })
}

let checkRelativeIndexArr = [];
const checkRelativeIndex = (index) => {
  const Count  = checkRelativeIndexArr.filter(r => r === index).length
  if (Count == 0) {
    checkRelativeIndexArr.push(index);
    return (1);
  } else {
    return (0);
  }
}

const checkRelativeTabId = (tabId) => {
  return new Promise((resolve, reject) => {
    Ext.tabs.get(tabId)
    .then(tab => {
      if (tab.length != 0) {
        resolve(true);
      } else { resolve(false); }
    }).catch(e => {
      resolve(false);
    })
  })
}

const getTabIdwithIndex0 = (tabId) => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({}, function (tabs) {
      const ctab  = tabs.filter(r => r.active === true && r.url.indexOf('chrome-extension://') == -1) // TODO: add "moz-extension://" too ??
      resolve(ctab[0])
    });
  })
}

const replaceEscapedChar = (str, command, field, shouldEscape = true) => {
  if (!shouldEscape) {
    return str
  }

  if ([
    'csvRead', 'csvReadArray', 'csvSave',
    'gotoIf', 'if', 'while',
    'gotoIf_v2', 'if_v2', 'while_v2', 'XType',
    'elseif',
    'repeatIf',
    'executeScript',
    'executeScript_Sandbox',
    'executeAsyncScript',
    'executeAsyncScript_Sandbox'
    ].indexOf(command.cmd) !== -1 && field === 'target') {
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

function captureImage (args) {
  console.log('captureImage args >>>', args)
  const { searchArea, storedImageRect, scaleDpi, isDesktop, devicePixelRatio } = args

  if (isDesktop) {
    const cvApi = getNativeCVAPI()
    const crop  = (imgSrc) => {
      switch (searchArea) {
        case 'rect': {
          if (!storedImageRect) {
            throw new Error('storedImageRect is required')
          }
          // Note: Must scale up rect to screen coordinates
          return subImage(imgSrc, scaleRect(storedImageRect, devicePixelRatio))
          .then(dataUrl => ({
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
            offset:  { x: 0, y: 0 }
          })
        }
      }
    }
    return cvApi.captureDesktop({ path: undefined })
    .then(hardDrivePath => cvApi.readFileAsDataURL(hardDrivePath, true))
    .then(originalDataUrl => {
      return crop(originalDataUrl)
      .then(({ dataUrl, offset }) => {
        return Promise.all([
          saveDataUrlToLastScreenshot(dataUrl),
          saveDataUrlToLastDesktopScreenshot(originalDataUrl)
        ])
        .then(() => ({
          dataUrl,
          offset,
          viewportOffset: offset,
          scale: 1 / devicePixelRatio
        }))
      })
    })
  } else {
    return getScreenshotInSearchArea({
      searchArea,
      storedImageRect,
      devicePixelRatio,
      captureScreenshotService,
      dpiScale: scaleDpi ? (96 / getPageDpi()) : 1
    })
  }
}

const getOcrResponse = ({ 
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

  return new Promise((resolve, reject)  => {
    // Note: must make sure `getOcrCommandCounter` is called with args before this (currently it's in `initPlayer`)
    const ocrCmdCounter = getOcrCommandCounter()
    const getApiAndKey = () => {
      let stateConfig = store.getState().config
      console.log('config :>> ', config);
      console.log('stateConfig :>> ', stateConfig);
      const { ocrMode, ocrEngine, ocrSpaceApiKey, ocrOfflineURL, ocrOfflineAPIKey } = stateConfig;

      console.log('ocrMode :>> ', ocrMode)
      console.log('ocrSpaceApiKey :>> ', ocrSpaceApiKey) 

      switch (ocrMode) {
        case 'enabled': {

          if (!ocrSpaceApiKey) {
            throw new Error('Please set OCR API key first')
          }

          const ocrEndpointPicker = getOcrEndpointPicker();
         
          // For sample keys check: https://github.com/teamdocs/sidebar_uiv/issues/106
          // All free keys start with "K8...". 
          const isFreeApiKey = isOcrSpaceFreeKey(ocrSpaceApiKey) 
 
          if (!isFreeApiKey) {
            // it's a pro key 
            let proOcrEndpoint;
            if (ocrEngine == 1) {
              proOcrEndpoint = config.ocr.proApi1Endpoint
            } else if (ocrEngine == 2) {
              proOcrEndpoint = config.ocr.proApi2Endpoint
            }

            let server = ocrEndpointPicker.setSingleServerInstance({
              "id":  ocrEngine.toString(),
              "key": ocrSpaceApiKey,
              "url": proOcrEndpoint
            })
            return server; 

          } else {
            let server = ocrEndpointPicker.setSingleServerInstance({
              "id": "3",
              "key": ocrSpaceApiKey,
              "url": config.ocr.freeApiEndpoint
            })
            return server;
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

      return getLicenseService().recheckLicenseIfPossible().then(() => {
        const isExpired = getLicenseService().isLicenseExpired()

        if (isExpired) {
          throw new Error('Activation check failed. Reset to free edition. If you believe this was an error, please contact tech support')
        }
      })
    })()

   let dataURLObjPromise = imageDataUrl ? Promise.resolve({ dataUrl: imageDataUrl}) : prepare
     .then(() => isDesktop ? Promise.resolve() : csIpc.ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE'))
     // Note: add 1s delay here to make sure old OCR overlayed are cleared before taking new screenshot
     .then(() => delay(() => {}, 1000))
     .then(() => captureImage({
       isDesktop,
       storedImageRect,
       searchArea: /\.png/i.test(searchArea) ? 'rect' : searchArea,
       scaleDpi: true,
       devicePixelRatio: window.devicePixelRatio
     }))    
     
    return dataURLObjPromise.then(({ dataUrl, offset = {x: 0, y: 0}, viewportOffset = {x: 0, y: 0}, scale = 1 }) => {  
      // console.log('final dataUrl :>> ', dataUrl);

      const blob            = dataURItoBlob(dataUrl)
      const fileSize        = readableSize(blob.size)
      const startTime       = new Date() * 1
      const getDuration     = (startTime, endTime) => ((endTime - startTime) / 1000).toFixed(1) + 's'
      const cancelCountDown = countDown({
        interval: 1000,
        timeout:  ocrApiTimeout,
        onTick:   ({ past, total }) => {
          store.dispatch(act.setTimeoutStatus({
            past,
            total,
            type: 'OCR in progress'
          }))
        }
      })

      // Note: check in advance so that it throws error before making OCR requests
      ocrCmdCounter.check()
      if (store.getState().player.status != 'STOPPED') {
        store.dispatch(act.addLog('info', `OCR (${lang}) started (${fileSize})`))
      }

      if (engine == 98) {

        const tesseractLanguage = convertOcrLanguageToTesseractLanguage(lang)
        
        const tesseractResult = runOCRTesseractC({
          engine,
          image:              dataUrl.split(',')[1],
          imageDataURL:       dataUrl,
          language:           tesseractLanguage,
          totalTimeout:       ocrApiTimeout,
          singleApiTimeout:   config.ocr.singleApiTimeout,
          os:(() => {
            const ua = window.navigator.userAgent
            if (/windows/i.test(ua))  return 'windows'
              if (/mac/i.test(ua))      return 'mac'
                return 'linux'
            })(),
            isOverlayRequired:  true },
            (log, isNetwork) =>{
              // console.log('log :>> ', log);
              if(isNetwork && 'loading language traineddata' === log.status) {
                const progressInPercentText = (log.progress * 100).toFixed(0) + '%'
                store.dispatch(act.addLog('info', `Loading OCR (${lang}) language - ${progressInPercentText}`))
              }
            }          
          )
            .then(data => {

              console.log('tess data :>> ', data);
              let ocrRes = data; 
    
              cancelCountDown()
              if (store.getState().player.status != 'STOPPED') {
                store.dispatch(act.addLog('info', `OCR result received (${getDuration(startTime, new Date().getTime())} from Javascript OCR)`))
              }
              return {
                offset,
                viewportOffset,
                response: scaleOcrResponseCoordinates(ocrRes, scale)
              }
            })

            console.log('tesseractResult:>>', tesseractResult) 
            return tesseractResult;
      } else if (engine == 99) {

        const startTime = new Date().getTime();
       let xModuleOcrResult =  runOCRLocal({
          engine,
          image:              dataUrl.split(',')[1],
          language:           lang,
          totalTimeout:       ocrApiTimeout,
          singleApiTimeout:   config.ocr.singleApiTimeout,
          os:(() => {
            const ua = window.navigator.userAgent
            if (/windows/i.test(ua))  return 'windows'
              if (/mac/i.test(ua))      return 'mac'
                return 'linux'
            })(),
            isOverlayRequired:  true})
        .then(data => {
          const b = new Buffer.from(data, 'base64');
          const results = b.toString();
          const ocrRes  = JSON.parse(results);

          console.log('local ocrRes :>> ', ocrRes);

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

        console.log('xModuleOcrResult :>> ', xModuleOcrResult);

        return xModuleOcrResult;

      } else {
        const remoteOcrResult = runOCR({
          engine,
          isTable,
          scale:              ocrScale,
          image:              dataUrl,
          language:           lang,
          totalTimeout:       ocrApiTimeout,
          singleApiTimeout:   config.ocr.singleApiTimeout,
          isOverlayRequired:  true,
          getApiUrlAndApiKey: () => {
            return getApiAndKey()
            .then(data => {
              console.log('getApiUrlAndApiKey data :>> ', data);
            //  store.dispatch(act.addLog('info', `OCR request is sent to ${data.url}`))
            return data
          })
          },
          shouldRetry: () => {
            const { ocrMode } = store.getState().config
            console.log('shouldRetry :>> ');

            switch (ocrMode) {
              case 'enabled':
                return getOcrEndpointPicker().isAllDown().then(down => !down)
              case 'offline_enabled':
              case 'disabled':
                return false
            }
          },
          didGetResponse: (data) => {
            const { server, startTime, endTime, response, error } = data
            const id = server.id || server.url

            console.log('didGetResponse data:>> ', data);

            return getOcrEndpointPicker().validServers().then(result => {
              // It hasn't marked current api, so it's safer to tell we have next to try if there are gte 2 servers.
              const hasNextToTry = result.servers.length >= 2

              let endpointType = server.url == config.ocr.proApi1Endpoint ? 'pro1' :
              server.url == config.ocr.proApi2Endpoint ? 'pro2' : 'free'

              if (response) {
                store.dispatch(act.addLog('info', `OCR result received (${getDuration(startTime, endTime)} from ${endpointType} endpoint)`))
              } else if (error) {
                store.dispatch(
                  act.addLog(
                    'warning',
                    `Error in OCR endpoint ${id} after ${getDuration(startTime, endTime)}: ${error.message}` + (hasNextToTry ? ' - trying next.' : '')
                    )
                  )
              }

              if (id && response) {
                getOcrEndpointPicker().use(id)
              }

              if (!id)  return Promise.resolve()
              // Note: only mark server as error if browser is online
            if (!window.navigator.onLine) return Promise.resolve()

              return getOcrEndpointPicker().report(id, {
                lastError:             error,
                lastOcrExitCode:       response ? response.OCRExitCode : undefined,
                lastRequestTimestamp:  startTime,
                lastResponseTimestamp: endTime,
                lastTotalMilliseconds: endTime - startTime
              })
            .then(() => {})
          })
          }
        })
        .then(
          data => {
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
          e => {
            cancelCountDown()

            if (/All OCR servers are down/i.test(e.message)) {
              getOcrEndpointPicker().reset()
            }

            throw e
          }
          )

          console.log('remoteOcrResult :>> ', remoteOcrResult);

          return remoteOcrResult;
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
        Top:  word.Top  + offset.y,
        Left: word.Left + offset.x
      }),
      response.ParsedResults
      )
    const viewportBasedParseResults = safeUpdateIn(
      ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
      (word) => ({
        ...word,
        Top:  word.Top  + viewportOffset.y,
        Left: word.Left + viewportOffset.x
      }),
      response.ParsedResults
      )
    const [str, index, hasPos] = (() => {
      let match   = 'OCRTEXTX'.match(/^(.+)@POS=(\d+)$/i)
      if (!match) return ['OCRTEXTX', 0, false]
        return [match[1], parseInt(match[2]) - 1, true]
    })()

    const searchResult = searchTextInOCRResponse({
      text:           str,
      index:          index,
      exhaust:        true,
      parsedResults:  viewportBasedParseResults
    })

    const { hit, all } = searchResult;
    if (hit) {
      const center = ocrMatchCenter(hit);
      const calibrateNumber = (center.width * window.devicePixelRatio) / (hit.words[0].word.WordText).length
      store.getState().config.ocrCalibration_internal = calibrateNumber;
      updateState(setIn(['ocrCalibration_internal'], calibrateNumber)); localStorage.setItem('ocrCalibration', calibrateNumber);
    }

    const ocrMatches = [
      // All words identified by OCR into one group
      {
        similarity: 1,
        highlight:  OcrHighlightType.Matched,
        words:      allWordsWithPosition(documentBasedParseResults, [])
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
    e => {
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

    console.log('response :>> ', response); 

    const documentBasedParseResults = safeUpdateIn(
      ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
      (word) => ({
        ...word,
        Top:  word.Top  + offset.y,
        Left: word.Left + offset.x
      }),
      response.ParsedResults
      )

    const ocrMatches = [
      // All words identified by OCR into one group
      {
        similarity: 1,
        highlight:  OcrHighlightType.Matched,
        words:      allWordsWithPosition(documentBasedParseResults, [])
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
    e => {
      clearBadge()
      throw e
    }
    )
}

const withVisualHighlightHidden = (fn) => {
  const hide = () => csIpc.ask('PANEL_HIDE_VISION_HIGHLIGHT').catch(() => {})
  const show = () => csIpc.ask('PANEL_SHOW_VISION_HIGHLIGHT').catch(() => {})

  return hide()
  .then(() => fn())
  .then(
    data => {
      show()
      return data
    },
    e => {
      show()
      throw e
    }
    )
}

const hideDownloadBar = () => csIpc.ask('PANEL_DISABLE_DOWNLOAD_BAR', {}).catch(e => true)
const showDownloadbar = () => csIpc.ask('PANEL_ENABLE_DOWNLOAD_BAR', {}).catch(e => true)
const showDownloadBarFinally = (hasXCommand, fn) => {
  return Promise.resolve(fn())
  .then(
    data => {
      if (!hasXCommand()) {
        return data
      }

      return showDownloadbar()
      .then(() => data)
    },
    e => {
      if (!hasXCommand()) {
        return Promise.reject(e)
      }

      return showDownloadbar()
      .then(() => Promise.reject(e))
    }
    )
}

const interpretSpecialCommands = ({ store, vars, getTcPlayer, getInterpreter, xCmdCounter }) => {
  const commandRunners = [
  interpretCSVCommands({ store, vars, getTcPlayer, getInterpreter, xCmdCounter }),
  interpretCsFreeCommands({ store, vars, getTcPlayer, getInterpreter, xCmdCounter })
  ]

  return (command, index) => {
    return commandRunners.reduce((prev, cur) => {
      if (prev !== undefined) return prev
        return cur(command, index)
    }, undefined)
  }
}

const interpretCsFreeCommands = ({ store, vars, getTcPlayer, getInterpreter, xCmdCounter }) => {
  const runCsFreeCommands = (command, index, parentCommand) => {
    const csvStorage   = getStorageManager().getCSVStorage()
    const ssStorage    = getStorageManager().getScreenshotStorage()
    const macroStorage = getStorageManager().getMacroStorage()
    const path         = macroStorage.getPathLib()
    // console.log('command :>> ', command);
    // console.log('parentCommand :>> ', parentCommand);
    const { cmd, target, value, extra } = command
    const result = {
      isFlowLogic: true
    }
    const runCommand = (command) => {
      // console.log('runCommand command :>> ', command);
      return askBackgroundToRunCommand({
        vars,
        store,
        command,
        state: getTcPlayer().getState(),
        preRun: (command, state, askBgToRun) => askBgToRun(command)
      })
    }
    const guardOcrSettings = () => {
      if (store.getState().config.ocrMode === 'disabled' && 
        ((store.getState().config.ocrEngine != 99 && vars.get('!ocrEngine') != 99) &&
        (store.getState().config.ocrEngine != 98 && vars.get('!ocrEngine') != 98))     
      ) {
        throw new Error('OCR feature disabled.')
      }
    }

    const playerState          = getTcPlayer().getState()
    const curMacroRelativePath = getStorageManager().getMacroStorage().relativePath(playerState.extra.macroId)
    const curMacroDirPath      = path.dirname(curMacroRelativePath)
    const resolvePath = (subpath) => {
      subpath = subpath.replace(/\\/g, '/')

      if (subpath.indexOf('/') === 0) {
        return path.normalize(subpath).replace(/^(\/|\\)/, '')
      } else {
        return path.join(curMacroDirPath, subpath)
      }
    }

    const getSidePanelWidth =  async (args) => {
      // sidepanel has a padding around it's content
      const sidePanelPadding = 20;
      let config = await store.getState().config;
      if (config && !config.sidePanelOnLeft) {
        return Promise.resolve([0, args])
      } else {
        return getState().then(globalState => {
          return Ext.tabs.get(globalState.tabIds.toPlay).then(playTab =>
            Ext.windows.get(playTab.windowId).then(playWindow => {
              let sidePanelWidth = playWindow.width - playTab.width - sidePanelPadding;
              return [sidePanelWidth, args]
             }
            )
          )
        })
      }
    }   

    const shouldShowOcrOverlay = (cmd) => {
      const isDesktopMode = isCVTypeForDesktop(vars.get("!CVSCOPE"));
      const isApplicableCmd = [
        'XClickText',
        'XClickTextRelative',
        'XMoveText',
        'XMoveTextRelative',
		    'OCRSearch',
        'OCRExtractbyTextRelative'
      ].includes(cmd);

      if (isApplicableCmd && isDesktopMode) {
        return true;
      } else {
        return false;
      }
    };

    if (shouldShowOcrOverlay(cmd)) {
      store.dispatch(Actions.setOcrInDesktopMode(true))
    }

    console.log('cmd:>> `' + cmd + '`')

    switch (cmd) {
      case 'repeatIf':
      case 'elseif':
      case 'if_v2':
      case 'while_v2':
      case 'gotoIf_v2':
      case 'if':
      case 'while':
      case 'gotoIf': 	  {
        log(`Executing ${cmd}: ${target}`)

        return evaluateScript(target)
        .then(
          (result) => {
            return {
              condition: result,
              byPass:    true
            }
          },
          (e) => {
            throw new Error(`Error in condition of ${cmd}: ${e.message}`)
          }
          )
      }

      case 'times': {
        const interpreter = getInterpreter()
        const timesKey    = interpreter.getKeyForTimes(index)
        const cursor      = 1 + (interpreter.getExtraByKey(timesKey) || 0)
        const max         = parseInt(target, 10)

        if (isNaN(max)) {
          throw new Error('target must be a positive number')
        }

        if (max < 1) {
          return {
            condition: false,
            byPass: true
          }
        }

        const shouldContinue = cursor <= max

        if (shouldContinue) {
          interpreter.setExtraByKey(timesKey, cursor)
          vars.set({ '!TIMES': cursor }, true)
        } else {
          interpreter.removeExtraByKey(timesKey)

          const key = interpreter.getKeyForSurroundingTimes(index)
          const nextCursor = interpreter.getExtraByKey(key)

          if (nextCursor !== undefined) {
            vars.set({ '!TIMES': nextCursor }, true)
          } else {
            vars.set({ '!TIMES': cursor }, true)
          }
        }

        return {
          condition: shouldContinue,
          byPass:    true
        }
      }

      case 'forEach': {
        const interpreter = getInterpreter()
        const forEachKey  = `forEach_${index}`        
        let tagHasBreak = interpreter.hasBreak(index)
        if (tagHasBreak) {
          interpreter.removeBreak(index)
        }

        const current = interpreter.getExtraByKey(forEachKey)
        const cursor  = tagHasBreak ? 0 : 1 + (current === undefined ? -1 : current)
        const list    = vars.get(target)

        if (!Array.isArray(list)) {
          throw new Error('target must be an array')
        }

        const len = list.length
        const shouldContinue = cursor < len
        const varsToSet = shouldContinue ? { [value]: list[cursor] } : null

        vars.set({
          '!FOREACH': cursor
        }, true)

        if (!shouldContinue) {
          interpreter.removeExtraByKey(forEachKey)
        } else {
          interpreter.setExtraByKey(forEachKey, cursor)
        }

        return {
          vars:      varsToSet,
          condition: shouldContinue,
          byPass:    true
        }
      }

      case 'assert':
      case 'verify': {
        const isAssert = cmd === 'assert'
        const varName = target

        if (!varName || !varName.length) {
          throw new Error(`${cmd}: target is required as variable name`)
        }

        const actualString = `${vars.get(varName)}`
        const expectedString = `${value}`

        if (actualString === expectedString) {
          return { byPass: true }
        }

        const message = `Expected variable ${varName} to be ${expectedString}, but it is ${actualString}`

        if (isAssert) {
          throw new Error(message)
        }

        return {
          byPass: true,
          log: {
            error: message
          }
        }
      }

      case 'executeScript_Sandbox':
      case 'executeAsyncScript_Sandbox': {
        const code = `;(function () { ${target} })();`

        return evaluateScript(code)
        .then(result => {
          if (value && value.length) {
            return {
              byPass: true,
              vars: {
                [value]: result
              }
            }
          }

          return {
            byPass: true
          }
        })
        .catch(e => {
          throw new Error(`Error in executeScript_Sandbox code: ${e.message}`)
        })
      }

      case 'setProxy': {
        const p = (() => {
          if (/direct/i.test(target && target.trim())) {
            return setProxy(null)
            .then(() => store.dispatch(act.addLog('info', 'Proxy reset to none')))
          }

          const [proxyUrl, auth] = (() => {
            if (/default/i.test(target && target.trim())) {
              return [
              store.getState().config.defaultProxy,
              store.getState().config.defaultProxyAuth
              ]
            }
            return [target, value]
          })()

          const proxy   = parseProxyUrl(proxyUrl, auth)
          const isSocks = proxy.type === ProxyScheme.Socks4 || proxy.type === ProxyScheme.Socks5;
          const hasAuth = !!proxy.username

          if (isSocks && hasAuth && !isFirefox()) {
            store.dispatch(act.addLog('warning', `Browser doesn't support authentication on socks proxy`))
          }

          return setProxy(proxy)
          .then(() => {
            vars.set({
              '!PROXY_EXEC_COUNT': 1 + (vars.get('!PROXY_EXEC_COUNT') || 0)
            }, true)

            store.dispatch(act.addLog('info', 'Proxy set to ' + proxyUrl))
          })
        })()

        return p.then(() => ({ byPass: true }))
      }

      case 'run': {
        const state             = store.getState()
        const macroRelativePath = resolvePath(target)
        const macroNode         = findMacroNodeWithCaseInsensitiveRelativePath(state, macroRelativePath)
        const macroStorage      = getStorageManager().getMacroStorage()

        return macroStorage.read((macroNode && macroNode.fullPath) || macroRelativePath, 'Text')
        .then(macro => {
          const openCmd     = macro.data.commands.find(command => command.cmd.toLowerCase() === 'open' || command.cmd.toLowerCase() === 'openBrowser')
          const playerState = act.commonPlayerState(
            store.getState(),
            {
              extra: {
                id: macro.id
              },
              mode:         getPlayer().C.MODE.STRAIGHT,
              startIndex:   0,
              startUrl:     openCmd ? openCmd.target : null,
              resources:    macro.data.commands,
              postDelay:    state.config.playCommandInterval * 1000,
              isStep:       getPlayer().getState().isStep,
              loopsCursor:  1,
              loopsStart:   1,
              loopsEnd:     1
            },
            macro.id,
            macro.name
            )

          return delay(() => {}, 10)
          .then(() => getMacroCallStack().call(macro, {
            playerState,
            status:          MacroStatus.Running,
            nextIndex:       0,
            commandResults:  []
          }))
          .then(() => {
            store.dispatch(act.updateMacroPlayStatus(macro.id, MacroResultStatus.Success))

            return {
              byPass: true
            }
          })
        })
      }

      case 'store': {
        let target_ = target;

        // if value == '!ocrlanguage' and engine == 98 (tesseract) 
        // then transform the target (eg. ger) to tesseract language code (deu)
        if (value == '!ocrlanguage' ) {   
          let engine_ = store.getState().config.ocrEngine;
          if (engine_ == 98) {
            target_ = convertOcrLanguageToTesseractLanguage(target);
          }     
        }

        return {
          byPass: true,
          vars: {
            [value]: target_
          }
        }
      }

      case 'echo': {
        const extra = (function () {
          if (value === '#shownotification') {
             return { options: { notification: true } }
          }        
          if (value) {
            return { options: { color: value } }
          }                        
          return {}
        })()

        // console.log('echo target :>> ', target);        

        return {
          byPass: true,
          log: {
            info: target,
            ...extra
          }
        }
      }

      case 'prompt': {
        const [_, message, defaultAnswer] = target.match(/^([^@]+)(?:@(.+))?$/)
        return isSidePanelWindowAsync(window).then((isSidePanel) => {
          if (!isSidePanel) {
            return csIpc.ask('PANEL_BRING_PANEL_TO_FOREGROUND')
          }
        })
        .then(() => prompt({ message, value: defaultAnswer || '' }))
        .then(text => ({
          byPass: true,
          vars: {
            [value]: text
          }
        }))
      }

      case 'throwError': {
        throw new Error(target)
      }

      case 'pause': {
        const n = parseInt(target)

        if (!target || !target.length || n === 0) {
          return {
            byPass: true,
            control: {
              type: 'pause'
            }
          }
        }

        if (isNaN(n) || n < 0) {
          throw new Error('target of pause command must be a positive integer')
        }

        const currentPlayUID = getTcPlayer().getPlayUID()

        return withCountDown({
          timeout: n,
          interval: 1000,
          onTick: ({ total, past, cancel }) => {
            if (store.getState().player.status !== C.PLAYER_STATUS.PLAYING) {
              return cancel()
            }

            if (!getTcPlayer().checkPlayUID(currentPlayUID)) {
              return cancel()
            }

            store.dispatch(act.setTimeoutStatus({
              past,
              total,
              type: 'pause'
            }))
          }
        })
        .then(() => ({ byPass: true }))
      }

      case 'localStorageExport': {
        const deleteAfterExport = /\s*#DeleteAfterExport\s*/i.test(value)

        if (/^\path=/i.test(target)) {
          getXLocal().getVersionLocal().then(data => {
            const { installed, version } = data
            const text = store.getState().logs.map(renderLog).join('\n')
            const ua = window.navigator.userAgent
            const path = target.split('path=')[1];

            function os () {
              if (/windows/i.test(ua))  return 'windows'
                if (/mac/i.test(ua))      return 'mac'
                  return 'linux'
              }

              if (installed)  {
                let osType = os();
                runDownloadLog(text, path, osType)
                .then(data => {
                  log(data)
                })
              } else {
                const text = store.getState().logs.map(renderLog).join('\n')
                FileSaver.saveAs(new Blob([text]), 'uivision_log.txt')

                if (deleteAfterExport) {
                  store.dispatch(act.clearLogs())
                }
              }
            })
          return result
        }

        if (/^\s*log\s*$/i.test(target)) {
          const text = store.getState().logs.map(renderLog).join('\n')
          FileSaver.saveAs(new Blob([text]), 'uivision_log.txt')

          if (deleteAfterExport) {
            store.dispatch(act.clearLogs())
          }
          return result
        }

        if (/\.csv$/i.test(target)) {
          return csvStorage.exists(target)
          .then(existed => {
            if (!existed) throw new Error(`${target} doesn't exist`)

              return csvStorage.read(target, 'Text')
            .then(text => {
              FileSaver.saveAs(new Blob([text]), target)

              if (deleteAfterExport) {
                csvStorage.remove(target)
                .then(() => store.dispatch(act.listCSV()))
              }

              return result
            })
          })
        }

        if (/\.png$/i.test(target)) {
          return ssStorage.exists(target)
          .then(existed => {
            if (!existed) throw new Error(`${target} doesn't exist`)

              return ssStorage.read(target, 'ArrayBuffer')
            .then(buffer => {
              FileSaver.saveAs(new Blob([new Uint8Array(buffer)]), target)

              if (deleteAfterExport) {
                ssStorage.remove(target)
                .then(() => store.dispatch(act.listScreenshots()))
              }

              return result
            })
          })
        }

        throw new Error(`${target} doesn't exist`)
      }

      case 'OCRSearch': {
        guardOcrSettings()

        if (!value || !value.length) {
          throw new Error('value is required')
        }
        const curent_cmd = localStorage.curent_cmd;
        const lang            = vars.get('!ocrLanguage').toLowerCase()
        const engine          = vars.get('!ocrEngine') || store.getState().config.ocrEngine
        const scale           = vars.get('!ocrScale')
        const isTable         = vars.get('!ocrTableExtraction')
        const timeout       = vars.get('!TIMEOUT_WAIT') * 1000
        const searchArea      = vars.get('!visualSearchArea') || 'viewport'
        const storedImageRect = vars.get('!storedImageRect')
        const ocrApiTimeout   = config.ocr.apiTimeout
        const [str, index, hasPos] = (() => {
          let match   = target.match(/^(.+)@POS=(\d+)$/i)
          if (!match) return [target, 0, false]
            return [match[1], parseInt(match[2]) - 1, true]
        })()
        const isLog          = command.mode_type != undefined && command.mode_type == 'local' ? 'NA' : true;
        const run = () => {
          return getOcrResponse({
            store,
            lang,
            scale,
            engine,
            isTable,
            searchArea,
            storedImageRect,
            ocrApiTimeout,
            isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE')),
            isLog:isLog
          })
          .then(async ({ response, offset, viewportOffset }) => {


            console.log('getOcrResponse response :>> ', response);

            // const state = await getState()
            const viewportBasedParseResults = safeUpdateIn(
              ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
              (word) => ({
                ...word,
                Top:  word.Top  + viewportOffset.y,
                Left: word.Left + viewportOffset.x
              }),
              response.ParsedResults
              )
            const documentBasedParseResults = safeUpdateIn(
              ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
              (word) => ({
                ...word,
                Top:  word.Top  + offset.y,
                Left: word.Left + offset.x
              }),
              response.ParsedResults
              )
            const searchResult = searchTextInOCRResponse({
              text:           str,
              index:          index,
              exhaust:        true,
              parsedResults:  viewportBasedParseResults
            })
            const { hit, all } = searchResult

            console.log('searchResult :>> ', searchResult);
            console.log('command :>> ', command);


            // if (command.extra && command.extra.throwError != undefined && command.extra.throwError != true)
            if (command.mode_type != undefined && command.mode_type == 'local' && command.extra && command.extra.throwError != true) {
              // when press Find button not want retry
              if (searchResult.all.length == 0) {
                throw new Error(`E311: OCR text match for '${str}' not found`)
              }
            }

            const newVars = (() => {
              if (!hit) {
                return {
                  [value]: 0,
                  '!ocrx': 0,
                  '!ocry': 0,
                  '!ocrwidth': 0,
                  '!ocrheight': 0,
                  '!ocr_left_x': 0,
                  '!ocr_right_x': 0
                }
              } else {
                const center = ocrMatchCenter(hit)

              // Note: when '@POS=xx' is used, the possible values are only 0 and 1
              vars.set({
                '!ocrx': center.x,
                '!ocry': center.y,
                '!ocrwidth': center.width,
                '!ocrheight': center.height,
                '!ocr_left_x': (center.x - (center.width / 2)),
                '!ocr_right_x': (center.x + (center.width / 2))
              }, true)

              return {
                [value]: hasPos ? 1 : all.length,
                '!ocrx': center.x,
                '!ocry': center.y,
                '!ocrwidth': center.width,
                '!ocrheight': center.height,
                '!ocr_left_x': (center.x - (center.width / 2)),
                '!ocr_right_x': (center.x + (center.width / 2))
              }
            }
          })()

          const textHasWildcard = str.includes('*') || str.includes('?')

          const ocrMatches = [
            // All words identified by OCR into one group
            {
              similarity: 1,
              highlight:  OcrHighlightType.Identified,
              words:      allWordsWithPosition(
                documentBasedParseResults,
                flatten(
                  all.map(item => item.words.map(word => word.position))
                  )
                )
            },
            // All matched and one top matched
            ...compose(
              all[index]
              ? setIn(
                [index, 'highlight'],
                textHasWildcard ? OcrHighlightType.WildcardTopMatched : OcrHighlightType.TopMatched
                )
              : (x) => x,
              setIn(
                ['[]', 'highlight'],
                textHasWildcard ? OcrHighlightType.WildcardMatched : OcrHighlightType.Matched
                ),
              updateIn(
                ['[]', 'words', '[]', 'word'],
                (word) => ({
                  ...word,
                  Top:  word.Top  + offset.y - viewportOffset.y,
                  Left: word.Left + offset.x + viewportOffset.x
                })
                )
              )(all)
            ]

            if (extra && extra.debugVisual && curent_cmd != 'OCRExtractbyTextRelative' && curent_cmd != 'visionLimitSearchAreabyTextRelative') {
            // show overlay on website
            csIpc.ask('PANEL_HIGHLIGHT_OCR_MATCHES', {
              ocrMatches,
              isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE')),
              screenAvailableSize: {
                width: screen.availWidth,
                height: screen.availHeight
              },
              localStorage: cloneSerializableLocalStorage(localStorage)
            })
          } else {
            // Note: store ocrMatches for preview window when Find button click (OCRExtractbyTextRelative);
            localStorage.setItem('ocrMatches_preview', JSON.stringify(ocrMatches));
          }

          const pScaleFactor = isCVTypeForDesktop(vars.get('!CVSCOPE'))
          ? getNativeXYAPI().getScalingFactor()
          : Promise.resolve(1)

          // Note: In desktop mode, `!ocrx`, `!ocry` and `best` should be desktop coordinates
          return pScaleFactor
          .then(factor => {
            return compose(
              newVars['!ocrx'] === undefined
              ? id
              : safeUpdateIn(
                ['vars', '!ocrx'],
                n => n * factor
                ),
              newVars['!ocry'] === undefined
              ? id
              : safeUpdateIn(
                ['vars', '!ocry'],
                n => n * factor
                ),
              safeUpdateIn(
                ['best'],
                match => (match && match.similarity ? scaleOcrTextSearchMatch(match, factor) : null)
                )
              )({
                vars: newVars,
                byPass: true,
                best:   hit
              })
            })
        })
        }

        if (command.mode_type !== undefined && command.mode_type === 'local') {
          const runWithRetry = retry(run, {
            timeout,
            shouldRetry: (e) => {
              return store.getState().status === C.APP_STATUS.PLAYER && /OCR.*\ not found/.test(e.message)
            },
            retryInterval: (retryCount, lastRetryInterval) => {
              return 0.5 + 0.25 * retryCount
            },
            onFirstFail: () => {
              startSendingTimeoutStatus(timeout, 'Vision waiting')
            },
            onFinal: () => {
              clearTimerForTimeoutStatus()
            }
          })

          return runWithRetry().catch(e => {
            // Note: extra.throwError === true, when "Find" button is used
            if (cmd === 'OCRSearch' || (extra && extra.throwError)) {
              throw e
            }

            return {
              byPass: true,
              ...(isNotVerifyOrAssert && value && value.length ? {
                vars: {
                  [value]: 0
                }
              } : {}),
              ...(cmd === 'visualVerify' ? {
                log: {
                  error: e.message
                }
              } : {})
            }
          })
        } else {
          return run()
        }
      }

      case 'aiPrompt': {
        console.log('aiPrompt...')

        if (!target || !target.length) {
          throw new Error('target is required')
        }
       
        return aiPromptGetPromptAndImageArrayBuffers(target).then(({prompt, mainImageBuffer, searchImageBuffer}) => {


          let anthropicAPIKey = store.getState().config.anthropicAPIKey;
          console.log('anthropicAPIKey :>> ', anthropicAPIKey);

          const anthropicService = new AnthropicService(anthropicAPIKey)             
          const promptText = prompt

          store.dispatch(act.addLog('info', 'Calling Anthropic API'))
          const start = Date.now()

          // return anthropicService?.readTextInImage(imageBuffer).then((response) => {
          return anthropicService?.aiPromptProcessImage(mainImageBuffer, searchImageBuffer, promptText).then(({coords,
            isSinglePoint, aiResponse}) => {
              
            const end = Date.now()
            const time = (end - start) / 1000
            const timeStr = time.toFixed(2)
            store.dispatch(act.addLog('info', `Result received (${timeStr}s): Answer is: ${aiResponse}`))


            // found the target
            const newVars = (() => {                     
              vars.set(
                {
                  [value]: aiResponse,
                },
                true
              )
              return {
                [value]: aiResponse,
              }                      
            })()

            console.log('newVars:>> ', newVars)
            console.log(`newVars['!ai1'] === undefined: ${newVars['!ai1'] === undefined}`)

            return compose(
            )({
              vars: newVars,
              byPass: true,
            })
          }).catch((error) => {
            throw new Error(error.message)

          })

      }).catch((error) => {
        throw new Error(error.message)

      })
              
      }

      case 'aiComputerUse':{
        console.log('aiComputerUse...')

        if (!target || !target.length) {
          throw new Error('target is required')
        }

        
       // useOrAi = 'user' | 'ai'
       // isActionOrResult = 'action' | 'result'
       const logMessage = (message, userOrAi = null, isActionOrResult = false) => {
        if (userOrAi === 'ai') {
          if (isActionOrResult === 'action') {
            store.dispatch(act.addLog('a', `Action: ${message}`))
          } else {
           store.dispatch(act.addLog('a', `${message}`))
          }
        } else if(userOrAi === 'user') {
          if (isActionOrResult === 'result') {
            store.dispatch(act.addLog('u', `Result: ${message}`))    
          } else {
            store.dispatch(act.addLog('u', `${message}`))
          }      
        } else {
          store.dispatch(act.addLog('info', `${message}`))          
        }
       }

        const isDesktop = isCVTypeForDesktop(vars.get('!CVSCOPE'))

        const captureScreenShotFunction = () => {            
          const storedImageRect = vars.get('!storedImageRect')
          const searchArea      = vars.get('!visualSearchArea') || 'viewport'       

          return (isDesktop ? Promise.resolve() :  csIpc.ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE'))
            // Note: add 1s delay here to make sure old OCR overlayed are cleared before taking new screenshot
            .then(() => delay(() => {}, 1000))
            .then(() => {     
              return captureImage({
                isDesktop,
                storedImageRect,
                searchArea: /\.png/i.test(searchArea) ? 'rect' : searchArea,
                scaleDpi: true,
                devicePixelRatio: window.devicePixelRatio
              })
            })
            .then(() => delay(() => {}, 1000))
            .then(() => {
              const screenshotFileName = isDesktop
              ? ensureExtName('.png', C.LAST_DESKTOP_SCREENSHOT_FILE_NAME)
              : ensureExtName('.png', C.LAST_SCREENSHOT_FILE_NAME)   
              logMessage('Screenshot taken', 'user', 'result')  
              return getFileBufferFromScreenshotStorage(screenshotFileName).then((imageBuffer) => {                
                return imageBuffer
              })
            })
        }

        const handleMouseAction = async (action, scaleFactor) => {
          // console.log('handleMouseAction:>> action::', action)
          console.log('isDesktop:>> ', isDesktop)
          console.log('scaleFactor:>> ', scaleFactor)

          const originalCoords = isWindows() && !isDesktop ?                 
          {
            x: Math.round(action.x / scaleFactor / window.devicePixelRatio),
            y: Math.round(action.y / scaleFactor  / window.devicePixelRatio)
          }:          
          {
            x: Math.round(action.x / scaleFactor),
            y: Math.round(action.y / scaleFactor)
          }

           console.log('originalCoords:>> ', originalCoords)

          const executeMouseCommand = (command) => {   
            console.log('executeMouseCommand:>> command:>> ', command)   
               
            const target = `${originalCoords.x },${originalCoords.y}`   
            switch (command) {
              case 'mouse_move':
                store.dispatch(act.addLog('info', `Running XMove command target: ${target}`))
                return runCsFreeCommands({ 
                  cmd:    'XMove', 
                  target: `${originalCoords.x},${originalCoords.y}`,
                })                 
              case 'left_click':
                store.dispatch(act.addLog('info', `Running XClick command target: ${target}`))
                return runCsFreeCommands({
                  cmd:    'XClick',
                  target: `${originalCoords.x},${originalCoords.y}`, 
                }) 
              case 'right_click':
                store.dispatch(act.addLog('info', `Running XClick (#right) command target: ${target}`))
                return runCsFreeCommands({
                  cmd:    'XClick',
                  target: `${originalCoords.x},${originalCoords.y}`,
                  value:  '#right',
                })
              default:
                console.log('handleMouseAction:>> unknown command:>> ', command)
                return Promise.resolve()
            }
          }

          const uiVisionCmd = action.command === 'mouse_move' ? 'XMove' : 'XClick'
          
          return executeMouseCommand(action.command).then ((result) => {
            console.log('handleMouseAction:>> result:>> ', result)
           
            logMessage(`${uiVisionCmd} ${originalCoords.x},${originalCoords.y} (Scale factor: ${scaleFactor.toFixed(5)})`, 'user', 'result')  
                return {
              success: true
            }
          }).then ((result) => {
            if (result.success) {
              const actionText = action.command === 'mouse_move' ? 'Moved' :
                  action.command === 'left_click' ? 'Left clicked' :
                  'Right clicked';
              return {
                success: true,
                message: `${actionText} at ${originalCoords.x},${originalCoords.y}`,
                coordinates: originalCoords
              };
            }
          })         
        }

        const  handleKeyboardAction = async (action) => {
          console.log('handleKeyboardAction:>> action::', action)          

          const executeKeyboardCommand = (action) => {
            console.log('executeKeyboardCommand:>> action:>> ', action)
            switch (action.type) {
              case 'keyboard':
              case 'text':
                store.dispatch(act.addLog('info', `Running XType command, value: ${action.value}`))

                return runCsFreeCommands({
                  cmd:    'XType',
                  target: action.value,
                })
              default:
                console.error('executeKeyboardCommand:>> unknown command:>> ', action.type)
                return Promise.resolve()
            }
          }

          return executeKeyboardCommand(action).then ((result) => {
             return {
               success: true
             }
          })
       }

       let currentLoop = 0
       const getTerminationRequest = (_currentLoop) => {
        const state = store.getState()
        currentLoop = _currentLoop
        const maxLoop = state.config.aiComputerUseMaxLoops
         if (_currentLoop > maxLoop) {
           return 'max_loop_reached';
         }
         if (state.player.status === Player.C.STATUS.STOPPED) {
           return 'player_stopped';
         }    
       }
 
        const promptText = target // `You are using a web browser. All click and move actions must include coordinates. If you need to scroll down the page, use the keyboard e. g. PageDown.`
        try {
          // console.log('Creating Sampling instance...')
          let anthropicAPIKey = store.getState().config.anthropicAPIKey;
          console.log('anthropicAPIKey :>> ', anthropicAPIKey);

          const sampling = new Sampling(anthropicAPIKey, C.ANTHROPIC.COMPUTER_USE_MODEL, promptText, 
            captureScreenShotFunction,  handleMouseAction, handleKeyboardAction,
            getTerminationRequest, logMessage
          );

          logMessage('Computer Use sequence start:')

          const userPrompt = target
          logMessage(userPrompt, 'user')
      
          console.log('Running sampling...')
          //  const result = await sampling.run('Use the calculator to calculate 5 + 8 and verify the result. Then stop.');
          //  const result = await sampling.run('You see a web form. Fill out all fields that you see. Use random but realistic data for names and email. Ignore drop downs. Scroll down with keyboard if needed. Submit the page. Then stop.');
          //  anti spam stops this. good.   const result = await sampling.run('You see a website of a forum. Sign up for a new account. Fill out all fields that you see. Use random but realistic data for names and email. Ignore drop downs. Scroll down with keyboard if needed. Submit the page. Then stop. Skip all MOUSE MOVE commands. Just use CLICK.');
          //  const result = await sampling.run('You see a website. Look for big firefox icon. If not found, use Page_down to scroll down. Look again. Do this until you found the Firefox or at the end of the page. Then stop.');
          //  const result = await sampling.run('Look at the desktop and find the Firefox icon. Click it to open Firefox. When Firefox is open, use CTRL+L to jump to the Firefox address bar (this is where the URL is). Then enter https://ui.vision into the address bar. Press Enter to load the website. Verify the website has loaded. Then stop. Always return x y coordinates with the CLICK and MOVE commands.');
          //  const result = await sampling.run('Type CTRL+L in Ui.Vision syntax. That is ${KEY_CTRL+KEY_L}.Then stop.');
          //  const result = await sampling.run('All left_click amd move actions must include coordinates. A calculator is open on the desktop. Use it to calculate 5 + 8 and verify the result. Then stop.');
          // return  sampling.run('You see a website. A tic tac toe game is open. You are Player 1. Play the game and win. Then stop.', getTerminationRequest).then((result) => {
          return  sampling.run(userPrompt).then((result) => {
            console.log('Sampling completed. Result:>>', JSON.stringify(result, null, 2))  

            if(result.stopReason === 'max_loop_reached') {
              throw new Error('E501: Loop Limit Reached. Increase if needed.')
            } else if (result.stopReason === 'player_stopped') {
              logMessage(`Computer Use sequence ended (${currentLoop + 1} loops)`)
              return {
                byPass: true,
                log: {
                  info: 'Player stopped manually.'
                }
              }
            } else {

              const messages = result//.content[0].text
              const aiMessages = messages.filter((message) => message.role === 'assistant')
              const aiResponse = aiMessages[aiMessages.length - 1]?.content?.[0]?.text

              // found the target
              const newVars = (() => {                     
                vars.set(
                  {
                    [value]: aiResponse,
                  },
                  true
                )
                return {
                  [value]: aiResponse,
                }                      
              })() 

              return compose(
                )({
                  vars: newVars,
                  byPass: true,
                })
            }
 
          }).catch((error) => {
            console.error('Error in aiComputerUse:', error)
            throw error
          })
       
        } catch (error) {
          console.error('Error in aiComputerUse:', error)
          throw error
        } 
      }

      case 'aiScreenXY': {
        console.log('aiScreenXY...')

        if (!target || !target.length) {
          throw new Error('target is required')
        }

        const isDesktop = isCVTypeForDesktop(vars.get('!CVSCOPE'))
        const storedImageRect = vars.get('!storedImageRect')
        const searchArea      = vars.get('!visualSearchArea') || 'viewport' 
    
        return (isDesktop ? Promise.resolve() :  csIpc.ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE'))
            // Note: add 1s delay here to make sure old OCR overlayed are cleared before taking new screenshot
            .then(() => delay(() => {}, 1000))
            .then(() => {     
              return captureImage({
                isDesktop,
                storedImageRect,
                searchArea: /\.png/i.test(searchArea) ? 'rect' : searchArea,
                scaleDpi: true,
                devicePixelRatio: window.devicePixelRatio
              })
            })
            .then(() => delay(() => {}, 500))
            .then(() => {

              const screenshotFileName = isDesktop
              ? ensureExtName('.png', C.LAST_DESKTOP_SCREENSHOT_FILE_NAME)
              : ensureExtName('.png', C.LAST_SCREENSHOT_FILE_NAME)
            
               return getFileBufferFromScreenshotStorage(screenshotFileName).then((imageBuffer) => {

                  let anthropicAPIKey = store.getState().config.anthropicAPIKey;
                  console.log('anthropicAPIKey :>> ', anthropicAPIKey);

                  const anthropicService = new AnthropicService(anthropicAPIKey)             
                  const promptText = target

                  store.dispatch(act.addLog('info', 'Calling Anthropic API'))
                  const start = Date.now()

                  // TODO: refactoring code required in regard to scaleFactor / macScaleFactor / window.devicePixelRatio 
                  return anthropicService?.aiScreenXYProcessImage(imageBuffer, promptText).then(({coords,
                     aiResponse}) => {

                    const end = Date.now()
                    const time = (end - start) / 1000
                    const timeStr = time.toFixed(2)
                    store.dispatch(act.addLog('info', `Result received (${timeStr}s): Answer is: ${aiResponse}`))

                    const ai1 = coords[0].x || 0
                    const ai2 = coords[0].y || 0

                    let newVars = (() => {                     
                      vars.set(
                        {
                          [value]: aiResponse,
                          '!ai1': ai1,
                          '!ai2': ai2,
                        },
                        true
                      )
                      return {
                        [value]: aiResponse,
                        '!ai1': ai1,
                        '!ai2': ai2,
                      }                      
                    })()

                    console.log('newVars:>> ', newVars)
                    console.log(`newVars['!ai1'] === undefined: ${newVars['!ai1'] === undefined}`)

                    if (extra && extra.debugVisual) {
                      if (isDesktop) {
                        console.log('debugVisual extra:>>', extra)
                     
                        captureImage({
                          isDesktop : true,
                          storedImageRect: null,
                          scaleDpi: true,
                          devicePixelRatio: window.devicePixelRatio
                        })                
                        .then(() => delay(() => {}, 1000))
                        .then(() => { 
      
                          const imageInfo = {
                            source: DesktopScreenshot.ImageSource.Storage,
                            path:   ensureExtName(
                              '.png',
                              C.LAST_DESKTOP_SCREENSHOT_FILE_NAME
                            )
                          } 
        
                          const x = ai1
                          const y = ai2
      
                          return csIpc.ask('PANEL_HIGHLIGHT_DESKTOP_X', {
                              imageInfo,
                              screenAvailableSize: {
                                width: screen.availWidth,
                                height: screen.availHeight
                              },
                              coordinates: {
                                x: x,
                                y: y
                              }
                            })
                            .then(() => {
                              return  {
                                type: 'desktop',
                                offset: {
                                  x: x,
                                  y: y
                                }
                              }
                            })
                        })

                      } else {
                    
  
                        csIpc.ask('PANEL_HIGHLIGHT_X', {
                            offset: {
                              x: ai1,
                              y: ai2
                            }
                          })
                        } 
                    } 

                    console.log('window.devicePixelRatio:>> ', window.devicePixelRatio)

                    // offsetting window.devicePixelRatio windows machine included in aiScreenXYProcessImage
                    // for mac it's required why??
                    let ai1ForDesktop = isMac() ? ai1 : ai1 * window.devicePixelRatio
                    let ai2ForDesktop = isMac() ? ai2 : ai2 * window.devicePixelRatio
                 
                    if (isDesktop){
                      newVars = (() => {                     
                        vars.set(
                          {
                            [value]: aiResponse,
                            '!ai1': ai1ForDesktop,
                            '!ai2': ai2ForDesktop,
                          },
                          true
                        )
                        return {
                          [value]: aiResponse,
                          '!ai1': ai1ForDesktop,
                          '!ai2': ai2ForDesktop,
                        }                      
                      })()
                    }


 
                    return compose( //#224
                      ...(isDesktop ? [
                      newVars['!ai1'] === undefined ? id : safeUpdateIn(['vars', '!ai1'], (n) => ai1ForDesktop),
                      newVars['!ai2'] === undefined ? id : safeUpdateIn(['vars', '!ai2'], (n) => ai2ForDesktop)
                      ] : [
                      newVars['!ai1'] === undefined ? id : safeUpdateIn(['vars', '!ai1'], (n) => ai1),
                      newVars['!ai2'] === undefined ? id : safeUpdateIn(['vars', '!ai2'], (n) => ai2)
                      ])
                    )({
                      vars: newVars,
                      byPass: true
                    });

                  }).catch((error) => {
                    throw new Error(error.message)
                  })
              }).catch((error) => {
                throw new Error(error.message)
              })
            })
            .catch((error) => {
              throw new Error(error.message)
            })
        
      }



      case 'OCRExtractScreenshot':
        guardOcrSettings()

        if (!value || !value.length) {
          throw new Error('value is required')
        }

        const lang            = vars.get('!ocrLanguage').toLowerCase()
        const engine          = vars.get('!ocrEngine')
        const scale           = vars.get('!ocrScale')
        const ocrApiTimeout   = config.ocr.apiTimeout        

        let ssImageName = /\.(png)$/i.test(target) ? target : null
        console.log('ssImageName :>> ', ssImageName);

        if (ssImageName) {
          return getStorageManager()
          .getScreenshotStorage()
          .read(ssImageName, 'DataURL')
          .catch(() => {
            // search in vision
            return getStorageManager()
            .getVisionStorage()
            .read(ssImageName, 'DataURL')
            .catch(() => {
              throw new Error(`${ssImageName} not found in Screenshots`)
            })
            .then(dataUrl => {
              throw new Error(`E505: OCRExtractScreenshot uses images from the Screenshot tab as input`)
            })
          })
          .then(dataUrl => {
            return dataUrl;
          }).then((imageDataUrl) => {
            console.log('imageDataUrl :>> ', imageDataUrl);
            if(imageDataUrl) {
              return getOcrResponse({
                store,
                lang,
                scale,
                engine,
                ocrApiTimeout,
                imageDataUrl,
                })
                .then(({ response }) => {
                  return {
                    byPass: true,
                    vars: {
                      [value]: response.ParsedResults && response.ParsedResults[0]
                      ? response.ParsedResults[0].ParsedText
                      : ''
                    }
                  }
                })
            } else {
              throw new Error('Screenshot not found')
            }
          })
        } else {
          throw new Error('target is expected to have *.png extension')
        }
      case 'OCRExtract':
        throw new Error('E318: OCRExtract has been deprecated, use OCRExtractRelative or OCRExtractScreenshot instead')
      case 'OCRExtractRelative': {
        guardOcrSettings()

        if (!value || !value.length) {
          throw new Error('value is required')
        }

        const lang            = vars.get('!ocrLanguage').toLowerCase()
        const engine          = vars.get('!ocrEngine')
        const scale           = vars.get('!ocrScale')
        const isTable         = vars.get('!ocrTableExtraction')
        const ocrApiTimeout   = config.ocr.apiTimeout
        const isRelative      = /relative/i.test(cmd)

        const ocrExtractFromBrowserPage = () => {
          return csIpc.ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
          .catch(() => {})
          .then(() => delay(() => {}, 1000))
          .then(() => {
            return Promise.all([
              runCsFreeCommands({
                ...command,
                cmd:    'visualAssert',
                target: target,
                value:  '',
                extra: {
                  ...(command.extra || {}),
                        // Note: `relativeVisual` is used in bg.js, for call of `visualAssert` that doesn't specify relativeVisual,
                        // it still uses file name postfix "_relative" to tell whether it's relative (green/pink boxes) or not
                        relativeVisual: isRelative,
                        debugVisual: false
                      }
                    }),
              isCVTypeForDesktop(vars.get('!CVSCOPE'))
              ? getNativeXYAPI().getScalingFactor()
              : Promise.resolve(1)
              ])
          })
          .then(([result, scalingFactor]) => {
            const { best } = result
            if (!best)  throw new Error(`E311: No OCR text match found for '${target}'`)

              return withVisualHighlightHidden(() => {
                return getOcrResponse({
                  store,
                  lang,
                  scale,
                  engine,
                  isTable,
                  ocrApiTimeout,
                  searchArea: 'rect',
                  storedImageRect: {
                        // Note: In desktop mode, coordinates returned by `visualXXX` is already desktop mouse coordinates
                        // must convert it back to css coordinates (for later use in image cropping or preview highlight)
                        x:        best.viewportLeft / scalingFactor,
                        y:        best.viewportTop / scalingFactor,
                        width:    best.width / scalingFactor,
                        height:   best.height / scalingFactor
                      },
                      isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE'))
                    })
                .then(({ response, offset, viewportOffset }) => {
                  const documentBasedParseResults = safeUpdateIn(
                    ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
                    (word) => ({
                      ...word,
                      Top:  word.Top  + offset.y,
                      Left: word.Left + offset.x
                    }),
                    response.ParsedResults
                    )

                  const ocrMatches = [
                        // All words identified by OCR into one group
                        {
                          similarity: 1,
                          highlight:  OcrHighlightType.Matched,
                          words:      allWordsWithPosition(documentBasedParseResults, [])
                        }
                        ]

                        if (extra && extra.debugVisual) {
                        // show overlay on website
                        csIpc.ask('PANEL_HIGHLIGHT_OCR_MATCHES', {
                          ocrMatches,
                          isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE')),
                          screenAvailableSize: {
                            width: screen.availWidth,
                            height: screen.availHeight
                          },
                          localStorage: cloneSerializableLocalStorage(localStorage)

                        })
                      }

                      return {
                        byPass: true,
                        vars: {
                          [value]: response.ParsedResults && response.ParsedResults[0]
                          ? response.ParsedResults[0].ParsedText
                          : ''
                        }
                      }
                    })
              })
          })
        }

        return ocrExtractFromBrowserPage();

      }
      case 'OCRExtractbyTextRelative': {
        guardOcrSettings()

        const lang            = vars.get('!ocrLanguage').toLowerCase()
        const engine          = vars.get('!ocrEngine')
        const scale           = vars.get('!ocrScale')
        const isTable         = vars.get('!ocrTableExtraction')
        const ocrApiTimeout   = config.ocr.apiTimeout
        const isRelative      = /relative/i.test(cmd)
        let trimmedTarget = target.trim();
        const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'));
        updateState(setIn(['caliber_trget'], trimmedTarget));
        updateState(setIn(['curent_cmd'], cmd));
        localStorage.setItem('curent_cmd', cmd);
        localStorage.setItem('caliber_trget', trimmedTarget);
        localStorage.setItem('isDesktopMode', isDesktopMode);
        const defaultWh = 'W30H10';

        const regexForTarget = /^.*#R.*,.*$/;

        if (!regexForTarget.test(trimmedTarget)) {
          throw new Error('Wrong input ' + trimmedTarget)
        }

        if (trimmedTarget.indexOf('W') === -1 && trimmedTarget.indexOf('H') === -1) {
          trimmedTarget = trimmedTarget + defaultWh;
        }

        if ((trimmedTarget.indexOf('#R') == -1) || trimmedTarget.includes(' ') || trimmedTarget.includes('X')) {
          throw new Error('Wrong input ' + trimmedTarget)
        }
        if (trimmedTarget.indexOf('W') === -1 || trimmedTarget.indexOf('H') === -1) {
          throw new Error('Wrong input ' + trimmedTarget)
        }

        var indexW = trimmedTarget.indexOf('W');
        var indexH = trimmedTarget.indexOf('H');

        if (indexW !== -1 && indexH !== -1 && indexW < indexH) {
          log("'W' appears first in the string");
        } else {
          // Note: reason for this changes is we are using regex accordingly in getCoordinates function for commands.
          // Extract the values of 'W' and 'H' from the string
          let wValue = trimmedTarget.match(/W(\d+)/)[1];
          let hValue = trimmedTarget.match(/H(\d+)/)[1];

          trimmedTarget = trimmedTarget.replace(/W(\d+)/, `H${hValue}`);

          trimmedTarget = trimmedTarget.replace(/H(\d+)/, `W${wValue}`);

          localStorage.setItem('caliber_trget', trimmedTarget);
        }

        return csIpc.ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
        .catch(() => {})
        .then(() => delay(() => {}, 1000))
        .then(() => {
          return Promise.all([
            runCsFreeCommands({
              ...command,
              cmd:    'OCRSearch',
              target: trimmedTarget.split('#')[0],
              value:  '__ocrResult__'
            }),
            isCVTypeForDesktop(vars.get('!CVSCOPE'))
            ? getNativeXYAPI().getScalingFactor()
            : Promise.resolve(1)
            ])
        })
        .then(([result, scalingFactor]) => {
          store.dispatch(Actions.setOcrInDesktopMode(false))

          // const isDesk = isCVTypeForDesktop(vars.get('!CVSCOPE'));
          // Note: This part is commented to get slected area screenshot on FInd button click
          // if (extra && extra.debugVisual && isDesk) {
          //   return {
          //     byPass: true,
          //     vars: {
          //       [value]: ''
          //     }
          //   }
          // }

          const { best } = result
          if (!best)  throw new Error(`E311: No OCR text match found for '${target}'`)

          let xC = result.best.words[0].word.Left;
          let yC = result.best.words[0].word.Top;
          let HeightR = result.best.words[0].word.Height;
          let WidthR = result.best.words[0].word.Width;

          let yD = 0; let xD = 0;

          function getCoordinates (str) {
              // var regex = /TL(-?\d+),(-?\d+)BR(-?\d+),(-?\d+)/;
              var regex = /R(-?\d+),(-?\d+)W(-?\d+)H(-?\d+)/;
              var matches = str.match(regex);

              var x = parseInt(matches[1]);
              var y = parseInt(matches[2]);
              var W = parseInt(matches[3]);
              var H = parseInt(matches[4]);

              return [x, y, W, H];
          }

          const cal_tragte = localStorage.getItem('caliber_trget') ? localStorage.getItem('caliber_trget') : '';
          let caliberTick = cal_tragte;

          if (caliberTick.indexOf('W') == -1 || caliberTick.indexOf('H') == -1) {
            caliberTick = caliberTick + 'W30H10';
          }

          function getTickCounter (str) {
            function getNumberSet (num, type) {
              if (parseInt(num) > 0 && type == 'X') {
                return ['>', parseInt(num)];
              } else if (parseInt(num) < 0 && type == 'X') {
                return ['<', parseInt(String(num).replace('-', ''))];
              } else if (parseInt(num) > 0 && type == 'Y') {
                return ['^', parseInt(num)];
              } else {
                return ['v', parseInt(String(num).replace('-', ''))];
              }
            }

            const nums = getCoordinates(str);
            const [x1, y1] = getNumberSet(nums[0], 'X');
            let [x2, y2] = getNumberSet(nums[1], 'Y'); ;
            let valueObj = {};
            valueObj[x1] = y1;
            valueObj[x2] = y2;
            return valueObj;
          };

          const countCalObj = getTickCounter(caliberTick);

          // let ocrCalibration = !!localStorage.getItem('ocrCalibration') ? localStorage.getItem('ocrCalibration') : 7;
          // const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'));
          // if(isDesktopMode == "false"){
          //   ocrCalibration = 7;
          // }

          let ocrCalibration = store.getState().config.ocrCalibration_internal ? store.getState().config.ocrCalibration_internal : 6;
          const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'));
          if (!isDesktopMode) {
            ocrCalibration = 7;
          }

          for (var x in countCalObj) {
            if (x === 'v' || x === 'v') {
              yD += yC + ocrCalibration * countCalObj[x]; // down (add in y offset)
            }
            if (x === '>') {
              xD += xC + ocrCalibration * countCalObj[x]; // right (add in x offset)
            }
            if (x === '<') {
              xD += xC - ocrCalibration * countCalObj[x]; // left (minus in x offset)
            }
            if (x === '^') {
              yD += yC - ocrCalibration * countCalObj[x]; // up (minus in y offset)
            }
          }

          const all_nums = getCoordinates(caliberTick);
          const rectTop = yD;
          const rectLeft = xD;
          const rectWidth = ocrCalibration * all_nums[2];
          const rectHeight = ocrCalibration * all_nums[3];

          return withVisualHighlightHidden(() => {
            return getOcrResponse({
              store,
              lang,
              scale,
              engine,
              isTable,
              ocrApiTimeout,
              searchArea: 'rect',
              storedImageRect: {
                              x:        rectLeft / scalingFactor,
                              y:        rectTop / scalingFactor,
                              width:    rectWidth / scalingFactor,
                              height:   rectHeight / scalingFactor
                              },
                    isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE'))
                  })
            .then(({ response, offset, viewportOffset }) => {
              const documentBasedParseResults = safeUpdateIn(
                ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
                (word) => ({
                  ...word,
                  Top:  word.Top  + offset.y,
                  Left: word.Left + offset.x
                }),
                response.ParsedResults
                )

              let ocrMatches = [
                      // All words identified by OCR into one group
                      {
                        similarity: 1,
                        highlight:  OcrHighlightType.Matched,
                        words:      allWordsWithPosition(documentBasedParseResults, [])
                      }
                      ]
                    // Note: This code is now needed for preview window for command OCRExtractbyTextRelative.
                      if (extra && extra.debugVisual) {
                      // show overlay on website
                      let ocrMatches_preview = localStorage.getItem('ocrMatches_preview');
                      ocrMatches = ocrMatches_preview ? JSON.parse(ocrMatches_preview) : ocrMatches;
                      csIpc.ask('PANEL_HIGHLIGHT_OCR_MATCHES', {
                        ocrMatches,
                        isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE')),
                        screenAvailableSize: {
                          width: screen.availWidth,
                          height: screen.availHeight
                        },
                        localStorage: cloneSerializableLocalStorage(localStorage)
                      })
                    }

                    return {
                      byPass: true,
                      vars: {
                        [value]: response.ParsedResults && response.ParsedResults[0]
                        ? response.ParsedResults[0].ParsedText
                        : ''
                      }
                    }
                  })
          })
        })
      }

      case 'visualVerify':
      case 'visualAssert':
      case 'visualSearch':
      case 'visionFind': {
        if (cmd === 'visualSearch') {
          if (!value || !value.length) {
            throw new Error(`${cmd}: Must specify a variable to save the result`)
          }
        }

        const verifyPatternImage = (fileName, command) => {
          return getStorageManager()
          .getVisionStorage()
          .exists(fileName)
          .then(existed => {
            if (!existed) throw new Error(`Error #120: ${(parentCommand?.cmd || cmd) + ':' || ''}: No input image found for file name '${fileName}'`)
          })
        }

        const imageTarget = parseImageTarget(target)

        if (!target) {
          throw new Error(`Target should be like 'abc.png@0.8#1'`)
        }

        if (!imageTarget) {
          throw new Error(`Error #120: ${(parentCommand?.cmd || cmd) + ':' || ''} No input image found for file name '${fileName}'`)
        }

        const {
          imageUrl,
          fileName:   visionFileName,
          confidence: minSimilarity = store.getState().config.defaultVisionSearchConfidence,
          index:      rawIndex
        } = imageTarget

        const resultIndex   = typeof rawIndex !== 'number' || isNaN(rawIndex) ? 0 : rawIndex
        const isNotVerifyOrAssert = ['visualVerify', 'visualAssert'].indexOf(cmd) === -1
        const searchArea    = vars.get('!visualSearchArea')
        const timeout       = vars.get('!TIMEOUT_WAIT') * 1000
        const cvScope       = vars.get('!CVSCOPE')

        const saveImageFirstIfNeeded = () => {
          if (!imageUrl || !imageUrl.length) {
            return Promise.resolve()
          }

          const getBlob = () => {
            if (imageUrl.indexOf('data:') === 0) {
              return Promise.resolve(dataURItoBlob(imageUrl))
            }

            return loadImage(imageUrl)
          }

          return getBlob().then(blob => {
            return getStorageManager()
            .getVisionStorage()
            .write(visionFileName, blob)
          })
          .then(() => {
            store.dispatch(act.listVisions())
          })
        }

        const run = () => {
          const prepare = isCVTypeForDesktop(cvScope)
          ? Promise.resolve()
          : csIpc.ask('PANEL_CLEAR_VISION_RECTS_ON_PLAYING_PAGE')
                                  // #324 .then(() => delay(() => {}, 500))

                                  return prepare
                                  .then(saveImageFirstIfNeeded)
                                  .then(() => searchVision({
                                    visionFileName,
                                    minSimilarity,
                                    searchArea,
                                    cvScope,
                                    command,
                                    captureScreenshotService,
                                    devicePixelRatio: window.devicePixelRatio,
                                    storedImageRect:  vars.get('!storedImageRect')
                                  }))
                                  .then(({ regions, imageInfo }) => {
                                    log('regions', regions, imageInfo)

                                    const notFound   = regions.length === 0
                                    const outOfRange = regions.length <= resultIndex

                                    if (notFound || outOfRange) {
                    // Reset image related vars to 0 if not found
                    vars.set({
                      '!imageX':      0,
                      '!imageY':      0,
                      '!imageWidth':  0,
                      '!imageHeight': 0
                    }, true)

                    if (notFound) {
                      throw new Error(`Image '${visionFileName}' (conf. = ${minSimilarity}) not found`)
                    }

                    if (outOfRange) {
                      throw new Error(`Found ${regions.length} ${regions.length > 1 ? 'matches' : 'match'}, but you are looking for #${resultIndex + 1}`)
                    }
                  }

                  // Note: if rawIndex is set, sort by top > left (treat all matches above threshold equally)
                  // otherwise, by score > top > left (= BEST match from all above threshold, see #836)
                  if (resultIndex === rawIndex) {
                    regions.sort((a, b) => {
                      const vSign = Math.sign(a.matched.offsetTop - b.matched.offsetTop)
                      const hSign = Math.sign(a.matched.offsetLeft - b.matched.offsetLeft)

                      return vSign || hSign
                    })
                  } else {
                    regions.sort((a, b) => {
                      const scoreSign = Math.sign(b.matched.score - a.matched.score)
                      const vSign     = Math.sign(a.matched.offsetTop - b.matched.offsetTop)
                      const hSign     = Math.sign(a.matched.offsetLeft - b.matched.offsetLeft)

                      return scoreSign || vSign || hSign
                    })
                  }

                  const best = regions[resultIndex].matched

                  if (!isCVTypeForDesktop(cvScope)) {
                    console.log('!isCVTypeForDesktop::>> cvScope', cvScope)
                    const shouldHighlightElements = store.getState().config.playHighlightElements || (extra && extra.debugVisual)

                    if (shouldHighlightElements) {
                      csIpc.ask('PANEL_HIGHLIGHT_RECTS', {
                        selectedIndex: resultIndex,
                        scoredRects:   regions.map(r => ({
                          ...r.matched,
                          left: r.matched.pageLeft,
                          top: r.matched.pageTop
                        }))
                      })
                    }
                  } else if (extra && extra.debugVisual) {
                    console.log('extra:>>', extra)
                    const convert = (rect, index, type) => {
                      if (!rect)  return null

                        return {
                          type,
                          index,
                          x:      rect.viewportLeft,
                          y:      rect.viewportTop,
                          width:  rect.width,
                          height: rect.height,
                          score:  rect.score
                        }
                      }

                      csIpc.ask('PANEL_HIGHLIGHT_DESKTOP_RECTS', {
                        imageInfo,
                        screenAvailableSize: {
                          width: screen.availWidth,
                          height: screen.availHeight
                        },
                        selectedIndex: resultIndex,
                        scoredRects: flatten(
                          regions.map((r, i) => {
                            return [
                            convert(
                              r.reference,
                              i,
                              i === resultIndex
                              ? DesktopScreenshot.RectType.ReferenceOfBestMatch
                              : DesktopScreenshot.RectType.Reference
                              ),
                            convert(
                              r.matched,
                              i,
                              i === resultIndex
                              ? DesktopScreenshot.RectType.BestMatch
                              : DesktopScreenshot.RectType.Match
                              )
                            ].filter(x => x)
                          })
                          )
                      })
                    }

                    const pScaleFactor = isCVTypeForDesktop(cvScope)
                    ? getNativeXYAPI().getScalingFactor()
                    : Promise.resolve(1)

                  // Note: Make sure `best`, `!imageX` and `!imageY` are all desktop coordinates (for later use in XClick)
                  // While in PANEL_HIGHLIGHT_DESKTOP_RECTS, it uses css coordinates
                  const top = best.viewportTop
                  const left = best.viewportLeft

                  return pScaleFactor.then(factor => ({
                    byPass: true,
                    vars: {
                      '!imageX':      Math.round(factor * (left + best.width / 2)),
                      '!imageY':      Math.round(factor * (top + best.height / 2)),
                      '!imageWidth':  Math.round(factor * best.width),
                      '!imageHeight': Math.round(factor * best.height),
                      ...(isNotVerifyOrAssert && value && value.length ? { [value]: regions.length } : {})
                    },
                    best: objMap(n => n * factor, best)
                  }))
                  .then(res => delay(() => res, 100))
                })
      }
      const runWithRetry = retry(run, {
        timeout,
        shouldRetry: (e) => {
          return store.getState().status === C.APP_STATUS.PLAYER && /Image.*\(conf\. =.*\) not found/.test(e.message)
        },
        retryInterval: (retryCount, lastRetryInterval) => {
          return 0.5 + 0.25 * retryCount
        },
        onFirstFail: () => {
          startSendingTimeoutStatus(timeout, 'Vision waiting')
        },
        onFinal: () => {
          clearTimerForTimeoutStatus()
        }
      })

      return verifyPatternImage(visionFileName, cmd)
      .then(() =>  {
        return runWithRetry()
        .catch(e => {
                  // Note: extra.throwError === true, when "Find" button is used
                  if (cmd === 'visualAssert' || (extra && extra.throwError)) {
                    throw e
                  }

                  return {
                    byPass: true,
                    ...(isNotVerifyOrAssert && value && value.length ? {
                      vars: {
                        [value]: 0
                      }
                    } : {}),
                    ...(cmd === 'visualVerify' ? {
                      log: {
                        error: e.message
                      }
                    } : {})
                  }
                })
      })
      }

      case 'visionLimitSearchArea':
      case 'visionLimitSearchAreaRelative': {
        const isRelative = /relative/i.test(cmd)
        let area  = target.trim()
        let p     = Promise.resolve({ byPass: true })

              // This method is helping you to debug visionLimitSearchArea
              // It takes screenshot according to coordinates to be set
              //
              // Overall, visionLimitSearchArea takes screenshot on the search area if its value is not viewport or full
              // `element: xxx` achieve that by sharing same logic as storeImage (you can find it in command_runner.js)
              const setImageRectVarAndTakeScreenshot = ({ rect, isDesktop, searchArea }) => {
                vars.set({ '!storedImageRect': rect }, true)

                return captureImage({
                  isDesktop,
                  storedImageRect: rect,
                  searchArea: /\.png/i.test(searchArea) ? 'rect' : searchArea,
                  scaleDpi: true,
                  devicePixelRatio: window.devicePixelRatio
                })
              }

              // Note: In desktop mode, we assume coordinates users provide in 'area=...' are returned by `visualXXX`,
              // which is already desktop mouse coordinates, we must convert it back to css coordinates (for later use in image cropping or preview highlight)
              const scale = (rect) => {
                switch (vars.get('!CVSCOPE')) {
                  case ComputerVisionType.Browser:
                  return Promise.resolve(rect)

                  case ComputerVisionType.Desktop:
                  case ComputerVisionType.DesktopScreenCapture:
                  return getNativeXYAPI().getScalingFactor()
                  .then(factor => {
                    return {
                      x:      rect.x / factor,
                      y:      rect.y / factor,
                      width:  rect.width / factor,
                      height: rect.height / factor
                    }
                  })
                }
              }

              if (isRelative && !/\.png/i.test(area)) {
                throw new Error(`${cmd} only accepts a vision image as target`)
              }

              if (/^viewport$/.test(area)) {
                vars.set({ '!visualSearchArea': 'viewport' }, true)
                return p
              }

              if (/^full$/.test(area)) {
                vars.set({ '!visualSearchArea': 'full' }, true)
                return p
              }

              if (/^area=/i.test(area)) {
                const coordinates = area.replace(/^area=/i, '')
                .split(/\s*,\s*/g)
                .map(str => parseFloat(str.trim()))

                const isValid = coordinates.length === 4 && and(...coordinates.map(n => typeof n === 'number' && !isNaN(n)))

                if (!isValid) {
                  throw new Error('area should be in format of "area=x1,y1,x2,y2"')
                }

                const rect = {
                  x:      coordinates[0],
                  y:      coordinates[1],
                  width:  coordinates[2] - coordinates[0],
                  height: coordinates[3] - coordinates[1]
                }

                vars.set({ '!visualSearchArea': 'rect' }, true)

                return scale(rect)
                .then(finalRect => {
                  return setImageRectVarAndTakeScreenshot({
                    isDesktop:  isCVTypeForDesktop(vars.get('!CVSCOPE')),
                    searchArea: 'rect',
                    rect:       finalRect
                  })
                  .then(() => ({ byPass: true }))
                })
              }

              if (/\.png/.test(area)) {
                return runCsFreeCommands({
                  ...command,
                  cmd:    'visualAssert',
                  target: area,
                  value:  '',
                  extra: {
                    ...(command.extra || {}),
                    // Note: `relativeVisual` is used in bg.js, for call of `visualAssert` that doesn't specify relativeVisual,
                    // it still uses file name postfix "_relative" to tell whether it's relative (green/pink boxes) or not
                    relativeVisual: isRelative
                  }
                })
                .then(result => {
                  const { best } = result
                  if (!best)  throw new Error(`No match found for ${area} in screenshot`)

                    vars.set({ '!visualSearchArea': area }, true)

                  return scale({
                    // Note: In desktop mode, coordinates returned by `visualXXX` is already desktop mouse coordinates
                    // must convert it back to css coordinates (for later use in image cropping or preview highlight)
                    x:      best.offsetLeft,
                    y:      best.offsetTop,
                    width:  best.width,
                    height: best.height
                  })
                  .then((rect) => {
                    return setImageRectVarAndTakeScreenshot({
                      rect,
                      searchArea: area,
                      isDesktop:  isCVTypeForDesktop(vars.get('!CVSCOPE'))
                    })
                  })
                  .then(() => ({ byPass: true }))
                })
              }

              // If it doesn't match patterns above, we assume it's element in browser mode, or an vision image in desktop mode
              switch (vars.get('!CVSCOPE')) {
                case ComputerVisionType.Browser:
                if (/^element:/.test(area)) {
                  vars.set({ '!visualSearchArea': area }, true)

                  return csIpc.ask('PANEL_CLEAR_VISION_RECTS_ON_PLAYING_PAGE')
                  .then(() => {
                      // Note: let cs page to process this case, it acts almost the same as a `storeImage` command
                      return Promise.resolve({ byPass: false })
                    })
                } else {
                  throw new Error(`E360: Target of visionLimitSearchArea could only be either 'viewport', 'full' or 'element:...'`)
                }

                case ComputerVisionType.Desktop:
                case ComputerVisionType.DesktopScreenCapture:
                throw new Error('E361: In desktop mode, target of visionLimitSearchArea could only be a vision image name or area')
              }

              break
      }

      case 'visionLimitSearchAreabyTextRelative': {
        guardOcrSettings()

        const lang            = vars.get('!ocrLanguage').toLowerCase()
        const engine          = vars.get('!ocrEngine')
        const scale           = vars.get('!ocrScale')
        const isTable         = vars.get('!ocrTableExtraction')
        const ocrApiTimeout   = config.ocr.apiTimeout
        const isRelative      = /relative/i.test(cmd)
        let trimmedTarget = target.trim();
        const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'));
        updateState(setIn(['caliber_trget'], trimmedTarget));
        updateState(setIn(['curent_cmd'], cmd));
        localStorage.setItem('curent_cmd', cmd);
        localStorage.setItem('caliber_trget', trimmedTarget);
        localStorage.setItem('isDesktopMode', isDesktopMode);
        const defaultWh = 'W30H10';

        const regexForTarget = /^.*#R.*,.*$/;

        if (!regexForTarget.test(trimmedTarget)) {
          throw new Error(`Error E310: Relative coordinates missing. Format should be: word#R(X),(Y)`)  
        }

        if (trimmedTarget.indexOf('W') === -1 && trimmedTarget.indexOf('H') === -1) {
          trimmedTarget = trimmedTarget + defaultWh;
        }

        if ((trimmedTarget.indexOf('#R') == -1) || trimmedTarget.includes(' ') || trimmedTarget.includes('X')) {
          throw new Error('Wrong input ' + trimmedTarget)
        }
        if (trimmedTarget.indexOf('W') === -1 || trimmedTarget.indexOf('H') === -1) {
          throw new Error('Wrong input ' + trimmedTarget)
        }

        var indexW = trimmedTarget.indexOf('W');
        var indexH = trimmedTarget.indexOf('H');

        if (indexW !== -1 && indexH !== -1 && indexW < indexH) {
          log("'W' appears first in the string");
        } else {
          // Note: reason for this changes is we are using regex accordingly in getCoordinates function for commands.
          // Extract the values of 'W' and 'H' from the string
          let wValue = trimmedTarget.match(/W(\d+)/)[1];
          let hValue = trimmedTarget.match(/H(\d+)/)[1];

          trimmedTarget = trimmedTarget.replace(/W(\d+)/, `H${hValue}`);

          trimmedTarget = trimmedTarget.replace(/H(\d+)/, `W${wValue}`);

          localStorage.setItem('caliber_trget', trimmedTarget);
        }

        return csIpc.ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
        .catch(() => {})
        .then(() => delay(() => {}, 1000))
        .then(() => {
          return Promise.all([
            runCsFreeCommands({
              ...command,
              cmd:    'OCRSearch',
              target: trimmedTarget.split('#')[0],
              value:  '__ocrResult__'
            }),
            isCVTypeForDesktop(vars.get('!CVSCOPE'))
            ? getNativeXYAPI().getScalingFactor()
            : Promise.resolve(1)
            ])
        })
        .then(([result, scalingFactor]) => {
          store.dispatch(Actions.setOcrInDesktopMode(false))

          const { best } = result
          if (!best)  throw new Error(`E311: No OCR text match found for '${target}'`)

          let xC = result.best.words[0].word.Left;
          let yC = result.best.words[0].word.Top;
          let HeightR = result.best.words[0].word.Height;
          let WidthR = result.best.words[0].word.Width;

          let yD = 0; let xD = 0;

          function getCoordinates (str) {
              // var regex = /TL(-?\d+),(-?\d+)BR(-?\d+),(-?\d+)/;
              var regex = /R(-?\d+),(-?\d+)W(-?\d+)H(-?\d+)/;
              var matches = str.match(regex);

              var x = parseInt(matches[1]);
              var y = parseInt(matches[2]);
              var W = parseInt(matches[3]);
              var H = parseInt(matches[4]);

              return [x, y, W, H];
          }

          const cal_tragte = localStorage.getItem('caliber_trget') ? localStorage.getItem('caliber_trget') : '';
          let caliberTick = cal_tragte;

          if (caliberTick.indexOf('W') == -1 || caliberTick.indexOf('H') == -1) {
            caliberTick = caliberTick + 'W30H10';
          }

          function getTickCounter (str) {
            function getNumberSet (num, type) {
              if (parseInt(num) > 0 && type == 'X') {
                return ['>', parseInt(num)];
              } else if (parseInt(num) < 0 && type == 'X') {
                return ['<', parseInt(String(num).replace('-', ''))];
              } else if (parseInt(num) > 0 && type == 'Y') {
                return ['^', parseInt(num)];
              } else {
                return ['v', parseInt(String(num).replace('-', ''))];
              }
            }

            const nums = getCoordinates(str);
            const [x1, y1] = getNumberSet(nums[0], 'X');
            let [x2, y2] = getNumberSet(nums[1], 'Y'); ;
            let valueObj = {};
            valueObj[x1] = y1;
            valueObj[x2] = y2;
            return valueObj;
          };

          const countCalObj = getTickCounter(caliberTick);

          // let ocrCalibration = !!localStorage.getItem('ocrCalibration') ? localStorage.getItem('ocrCalibration') : 7;
          // const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'));
          // if(isDesktopMode == "false"){
          //   ocrCalibration = 7;
          // }

          let ocrCalibration = store.getState().config.ocrCalibration_internal ? store.getState().config.ocrCalibration_internal : 6;
          const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'));
          if (!isDesktopMode) {
            ocrCalibration = 7;
          }

          for (var x in countCalObj) {
            if (x === 'v' || x === 'v') {
              yD += yC + ocrCalibration * countCalObj[x]; // down (add in y offset)
            }
            if (x === '>') {
              xD += xC + ocrCalibration * countCalObj[x]; // right (add in x offset)
            }
            if (x === '<') {
              xD += xC - ocrCalibration * countCalObj[x]; // left (minus in x offset)
            }
            if (x === '^') {
              yD += yC - ocrCalibration * countCalObj[x]; // up (minus in y offset)
            }
          }

          const all_nums = getCoordinates(caliberTick);
          const rectTop = yD;
          const rectLeft = xD;
          const rectWidth = ocrCalibration * all_nums[2];
          const rectHeight = ocrCalibration * all_nums[3];

          const targetRect = {
            x: rectLeft,
            y: rectTop,
            width: rectWidth,
            height: rectHeight
          }

          return withVisualHighlightHidden(() => {
            return getOcrResponse({
              store,
              lang,
              scale,
              engine,
              isTable,
              ocrApiTimeout,
              searchArea: 'rect',
              storedImageRect: {
                              x:        rectLeft / scalingFactor,
                              y:        rectTop / scalingFactor,
                              width:    rectWidth / scalingFactor,
                              height:   rectHeight / scalingFactor
                              },
                    isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE'))
                  })
            .then(({ response, offset, viewportOffset }) => {
              const documentBasedParseResults = safeUpdateIn(
                ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
                (word) => ({
                  ...word,
                  Top:  word.Top  + offset.y,
                  Left: word.Left + offset.x
                }),
                response.ParsedResults
                )

              let ocrMatches = [
                // All words identified by OCR into one group
                {
                  similarity: 1,
                  highlight:  OcrHighlightType.Matched,
                  words:      allWordsWithPosition(documentBasedParseResults, [])
                }
                ]

                    // Note: This code is now needed for preview window for command OCRExtractbyTextRelative.
                      if (extra && extra.debugVisual) {
                      // show overlay on website
                      let ocrMatches_preview = localStorage.getItem('ocrMatches_preview');
                      ocrMatches = ocrMatches_preview ? JSON.parse(ocrMatches_preview) : ocrMatches;
                      csIpc.ask('PANEL_HIGHLIGHT_OCR_MATCHES', {
                        ocrMatches,
                        isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE')),
                        screenAvailableSize: {
                          width: screen.availWidth,
                          height: screen.availHeight
                        },
                        localStorage: cloneSerializableLocalStorage(localStorage)
                      })
                    }

                    const setImageRectVarAndTakeScreenshot = ({ rect, isDesktop, searchArea }) => {
                      vars.set({ '!storedImageRect': rect }, true)
      
                      return captureImage({
                        isDesktop,
                        storedImageRect: rect,
                        searchArea: /\.png/i.test(searchArea) ? 'rect' : searchArea,
                        scaleDpi: true,
                        devicePixelRatio: window.devicePixelRatio
                      })
                    }
                    vars.set({ '!visualSearchArea': 'rect' }, true)

                    return setImageRectVarAndTakeScreenshot({
                      isDesktop:  isCVTypeForDesktop(vars.get('!CVSCOPE')),
                      searchArea: 'rect',
                      rect:       targetRect
                    })
                    .then(() => ({ byPass: true }))

                   
                  })
          })
        })
      }

      case 'visualGetPixelColor': {
        const targetReg = /^\s*(\d+)\s*,\s*(\d+)\s*$/

        if (!targetReg.test(target)) {
          throw new Error('E362: visualGetPixelColor: target must be a position in this fomrat: 100,200')
        }

        if (!value || !value.length) {
          throw new Error('E363: visualGetPixelColor: must specify a variable name as value')
        }

        const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'))
        const [_, xStr, yStr] = target.match(targetReg)
        const x = parseInt(xStr, 10)
        const y = parseInt(yStr, 10)
        const rectSize = 16;
        const type = vars.get('!CVSCOPE')
        const getScreenshot = (state) => {
          switch (type) {
            case 'browser': {
              const toPlayTabId = state.tabIds.toPlay

              return activateTab(toPlayTabId, true)
              .then(() => delay(() => {}, C.SCREENSHOT_DELAY))
              // Set scale factor to 1 / devicePixelRatio, so that the screenshot is in css pixel.
              .then(() => captureScreenshotService.captureScreen(toPlayTabId, devicePixelRatio, isFirefox() ? 1 :  1 / devicePixelRatio))
              .then(dataUrl => {
                saveDataUrlToLastScreenshot(dataUrl)
                return dataUrl
              })
            }

            case 'desktop': {
              const cvApi = getNativeCVAPI()

              // On the other hand, desktop screenshot is in device pixel
              return cvApi.captureDesktop({ path: undefined })
              .then(hardDrivePath => cvApi.readFileAsDataURL(hardDrivePath, true))
              .then(dataUrl => {
                saveDataUrlToLastDesktopScreenshot(dataUrl)
                return dataUrl
              })
            }

            default:
            throw new Error(`E364: Unsupported type: ${type}`)
          }
        }

        return getState()
        .then(getScreenshot)
        .then(dataUrl => {
          return getPixel({ dataUrl, x, y })
        })
        .then((colorHex) => {
          if (isDesktopMode) {
            if (extra && extra.debugVisual) {
              // This scaling is due to we show desktop screenshot in its base size, so retina screens like 2560 x 1440
              // are shown as 2560 x 1440 (css px) images instead of its device size 5120 x 2880.
              // That said, the image is scaled down by 2, so we need to do the same to rects
              const scale = 1 / window.devicePixelRatio

              csIpc.ask('PANEL_HIGHLIGHT_DESKTOP_RECTS', {
                imageInfo: {
                  source: DesktopScreenshot.ImageSource.Storage,
                  path:   ensureExtName('.png', C.LAST_DESKTOP_SCREENSHOT_FILE_NAME)
                },
                screenAvailableSize: {
                  width: screen.availWidth,
                  height: screen.availHeight
                },
                selectedIndex: 0,
                scoredRects: [{
                  x:      scale * (y - rectSize / 2),
                  y:      scale * (x - rectSize / 2),
                  width:  scale * rectSize,
                  height: scale * rectSize,
                  text:   colorHex,
                  type:   DesktopScreenshot.RectType.BestMatch
                }]
              })
            }
          } else {
            csIpc.ask('PANEL_SCREENSHOT_PAGE_INFO')
            .then(pageInfo => {
              csIpc.ask('PANEL_HIGHLIGHT_RECT', {
                rect: {
                  top:    pageInfo.originalY + y - rectSize / 2,
                  left:   pageInfo.originalX + x - rectSize / 2,
                  width:  rectSize,
                  height: rectSize,
                  text:   colorHex
                }
              })
            })
          }

          vars.set({ [value]: colorHex })
          return { byPass: true }
        })
      }

      case 'XRun':
      case 'XRunAndWait': {
        const fileName = target
        const args = value
        const waitForExit = /AndWait/.test(cmd)

        return getXFile().sanityCheck()
        .then(() => getNativeFileSystemAPI().runProcess({
          fileName,
          waitForExit,
          arguments: args
        }))
        .then(result => {
          if (cmd === 'XRunAndWait') {
            vars.set({
              '!XRUN_EXITCODE': result.exitCode
            }, true)

            store.dispatch(act.addLog('info', `App close detected, Exit code=${result.exitCode}`))
          }

          return { byPass: true }
        })
      }

      case 'XDesktopAutomation': {
        const shouldEnableDesktopAutomation = parseBoolLike(target, false)

        store.dispatch(act.updateUI({ shouldEnableDesktopAutomation }))
        vars.set({
          '!CVSCOPE': shouldEnableDesktopAutomation ? 'desktop' : 'browser'
        }, true)

        return Promise.resolve({ byPass: true })
      }

      case 'bringBrowserToForeground': {
        let shouldHide

        try {
          shouldHide = target === '' || target === undefined ? false : !strictParseBoolLike(target);
        } catch (e) {
          throw new Error('E310: Invalid target for bringBrowserToForeground. It should be true / false or leave it blank')
        }

        const p = shouldHide
        ? csIpc.ask('PANEL_MINIMIZE_ALL_WINDOWS_BUT_PANEL')
        : csIpc.ask('PANEL_BRING_PLAYING_WINDOW_TO_FOREGROUND')

        return p.then(() => ({ byPass: true }))
      }

      case 'bringIDEandBrowserToBackground': {
        return csIpc.ask('PANEL_MINIMIZE_ALL_WINDOWS')
        .then(() => ({ byPass: true }))
      }

      case 'setWindowSize':
      case 'resize': {
        const [strWidth, strHeight] = (() => {
          if (cmd === 'resize') {
            if (!/\s*\d+@\d+\s*/.test(target)) {
              throw new Error(`E365: Syntax for target of resize command is x@y, e.g. 800@600`)
            }
            return target.split('@')
          } else {
            if (!/\s*\d+x\d+\s*/i.test(target)) {
              throw new Error(`E366: Syntax for target of setWindowSize command is WidthxHeight, e.g. 800x600`)
            }
            return target.split(/x/i)
          }
        })()
        const width   = parseInt(strWidth, 10)
        const height  = parseInt(strHeight, 10)

        log('resize', width, height)
        return csIpc.ask('PANEL_RESIZE_PLAY_TAB', {
          viewportSize: { width, height },
          screenAvailableRect: {
            x: window.screen.availLeft,
            y: window.screen.availTop,
            width: window.screen.availWidth,
            height: window.screen.availHeight
          }
        })
        .then(({ actual, desired, diff }) => {
          if (diff.length === 0)  return { byPass: true }

            return {
              byPass: true,
              log: {
                warning: `W367: Only able to resize it to ${actual.width}@${actual.height}, given ${desired.width}@${desired.height}`
              }
            }
          })
      }

      case 'XType': {
        return getXUserIO().sanityCheck()
        // .then(() => csIpc.ask('PANEL_IS_PLAYING_WINDOW_IN_FOREGROUND'))
        // .then(isInForeGround => {
        //   if (isInForeGround) return
        //   return runCsFreeCommands({ cmd: 'bringBrowserToForeground' })
        // })
        .then(() => {
          if (xCmdCounter.get() === 1) {
            return hideDownloadBar()
          }
        })
        .then(() => delay(() => {}, 300))
        .then(() => decryptIfNeeded(target))
        .then(text => {
          return getNativeXYAPI().sendText({ text })
          .then(success => {
            if (!success) throw new Error(`E311: Failed to XType '${target}'`)
              return { byPass: true }
          })
        })
      }

      case 'XMouseWheel': {
        const deltaX = parseFloat(target)

        if (isNaN(deltaX)) {
          throw new Error('E312: Target of XMouseWheel must be a number')
        }

        return getXUserIO().sanityCheck()
        .then(() => {
          if (xCmdCounter.get() === 1) {
            return hideDownloadBar()
          }
        })
        .then(() => {
          return getNativeXYAPI().sendMouseWheelEvent({
            deltaX,
            deltaY: 0,
            deltaZ: 0
          })
          .then(success => {
            if (!success) throw new Error(`E313: Failed to XMouseWheel '${target}'`)
              return { byPass: true }
          })
        })
      }

      case 'XMove':
      case 'XMoveText':
      case 'XMoveTextRelative':
      case 'XMoveRelative':
      case 'XClickRelative':
      case 'XClickTextRelative':
      case 'XClickText':
      case 'XClick': {
        const parseTarget = (target = '', cmd) => {
          let trimmedTarget = target.trim()

          const relativeCommands = [ "XMoveTextRelative", "XClickTextRelative"]
          const regexForTarget = /^.*#R.*,.*$/;
          if (relativeCommands.includes(cmd) && !regexForTarget.test(trimmedTarget)) {
            throw new Error(`Error E310: Relative coordinates missing. Format should be: word#R(X),(Y)`)            
          }

          const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'))
          updateState(setIn(['curent_cmd'], cmd))
          localStorage.setItem('curent_cmd', cmd);

          if (/^ocr=/i.test(trimmedTarget)) {
            guardOcrSettings()

            return {
              type: 'ocr',
              value: { query: trimmedTarget.substr(4) }
            }
          }

          if (cmd === 'XMoveText') {
            guardOcrSettings()

            return {
              type: 'ocrTextXmove',
              value: { query: trimmedTarget }
            }
          }
          if (cmd === 'XMoveTextRelative') {
            const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'));
            updateState(setIn(['caliber_trget'], trimmedTarget));
            updateState(setIn(['curent_cmd'], cmd));
            localStorage.setItem('curent_cmd', cmd);
            localStorage.setItem('caliber_trget', trimmedTarget);
            localStorage.setItem('isDesktopMode', isDesktopMode);
            guardOcrSettings()
            return {
              type: 'ocrTextXmoveRelative',
              value: { query: trimmedTarget }
            }
          }

          if (cmd === 'XClickText' && !(/^text=/i.test(trimmedTarget))) {
            guardOcrSettings()
            3
            return {
              type: 'ocrText',
              value: { query: trimmedTarget }
            }
          }
          if (cmd === 'XClickTextRelative' && (/#R/i.test(trimmedTarget)))  {
            if ((checkIfNumberFound(trimmedTarget))) {
              throw new Error('Wrong input ' + trimmedTarget)
            }
            const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'));
            updateState(setIn(['caliber_trget'], trimmedTarget));
            updateState(setIn(['curent_cmd'], cmd));
            localStorage.setItem('curent_cmd', cmd);
            localStorage.setItem('caliber_trget', trimmedTarget);
            localStorage.setItem('isDesktopMode', isDesktopMode);
            guardOcrSettings()
            return {
              type: 'ocrText',
              value: { query: trimmedTarget.split('#R')[0] }
            }
          }

          if (isLocator(trimmedTarget)) {
            if (isDesktopMode) {
              throw new Error('E315: Locator is not support in desktop mode')
            }

            return {
              type: 'locator',
              value: { locator: trimmedTarget }
            }
          }

          if (/^[dD](\d+(\.\d+)?)\s*,\s*(\d+(\.\d+)?)$/.test(trimmedTarget)) {
            return {
              type: 'desktop_coordinates',
              value: { coordinates: trimmedTarget.substr(1).split(/\s*,\s*/) }
            }
          }

          if (/^(\d+(\.\d+)?)\s*,\s*(\d+(\.\d+)?)$/.test(trimmedTarget)) {
            return {
              type: isDesktopMode ? 'desktop_coordinates' : 'viewport_coordinates',
              value: { coordinates: trimmedTarget.split(/\s*,\s*/) }
            }
          }

          if (/^.*\.png(@\d\.\d+)?(#\d+)?(\[[^\]]+\])?$/.test(trimmedTarget)) {
            return {
              type: 'visual_search',
              value: { query: trimmedTarget }
            }
          }

          // fixit: it may not be XClick only??
          throw new Error(`E316: XClick: invalid target, '${target}'`)
        }
        const checkIfNumberFound = (str = '') => {
          const parts = str.split('#');
          for (let i = 0; i < parts.length; i++) {
            if (/\d/.test(parts[i])) {
              return false;
            }
          }
          return true;
        }

        const parseValueForXClick = (value = '') => {
          const normalValue = value.trim().toLowerCase()

          switch (normalValue) {
            case '':
            return '#left'

            case '#left':
            case '#middle':
            case '#right':
            case '#doubleclick':
            case '#tripleclick':
            case '#shiftclick':
            case '#ctrlclick':
            return normalValue

            default:
            throw new Error(`E317: XClick: invalid value, '${value}'`)
          }
        }
        const parseValueForXMove = (value = '') => {
          const normalValue = value.trim().toLowerCase()

          switch (normalValue) {
            case '':
            return '#move'

            case '#move':
            case '#up':
            case '#down':
            return normalValue

            default:
            throw new Error(`E318: XMove: invalid value, '${value}'`)
          }
        }
        const parseValue = ({
          XClick:         parseValueForXClick,
          XClickText:     parseValueForXClick,
          XClickRelative: parseValueForXClick,
          XClickTextRelative: parseValueForXClick,
          OCRExtractbyTextRelative:parseValueForXClick,
          XMove:          parseValueForXMove,
          XMoveText:          parseValueForXMove,
          XMoveTextRelative:  parseValueForXMove,
          XMoveRelative:  parseValueForXMove
        })[cmd]

        let isRelative = (/relative/i.test(cmd) && !(/XClickText/i.test(cmd)));
        if ((/relative/i.test(cmd) && cmd === 'OCRExtractbyTextRelative') || (/relative/i.test(cmd) && cmd === 'XMoveTextRelative') || (/relative/i.test(cmd) && cmd === 'visionLimitSearchAreabyTextRelative'))  {
          isRelative = false;
        }

        return getXUserIO().sanityCheck()
        .then(() => {
          if (xCmdCounter.get() === 1) {
            return hideDownloadBar()
          }
        })
        .then(() => {
          const realTarget = parseTarget(target, cmd)
          const realValue  = parseValue(value)

          const pNativeXYParams = (() => {
            if (isRelative && realTarget.type !== 'visual_search') {
              throw new Error(`E319: ${cmd} only accepts a vision image as target`)
            }

            log('realTarget:>> ', realTarget)

            switch (realTarget.type) {
              case 'locator': {
                return runCommand({
                  ...command,
                  cmd:    'locate',
                  target: realTarget.value.locator,
                  value:  ''
                })
                .then(result => {
                  const { rect } = result
                  if (!rect)  throw new Error('E320: no rect data returned')

                  const x = rect.x + rect.width / 2
                  const y = rect.y + rect.height / 2

                  if (isNaN(x))  throw new Error('empty x')
                    if (isNaN(y))  throw new Error('empty y')

                      return {
                        type: 'viewport',
                        offset: { x, y }
                      }
                    })
                    .then(getSidePanelWidth)
                    .then(([sidePanelWidth, result]) => {
                      result.offset.x = result.offset.x + sidePanelWidth
                      return result;
                    })
              }

              case 'visual_search': {
                return runCsFreeCommands({
                  ...command,
                  cmd:    'visualAssert',
                  target: realTarget.value.query,
                  value:  '',
                  extra: {
                    ...(command.extra || {}),
                    // Note: `relativeVisual` is used in bg.js, for call of `visualAssert` that doesn't specify relativeVisual,
                    // it still uses file name postfix "_relative" to tell whether it's relative (green/pink boxes) or not
                    relativeVisual: isRelative
                  }
                }, undefined, command)
                .then(result => {
                  const { best } = result
                  if (!best)  throw new Error('E321: no best found from result of verifyAssert triggered by XClick')

                    const isForDesktop = isCVTypeForDesktop(vars.get('!CVSCOPE'))
                    const x = best.viewportLeft + best.width / 2;
                    const y = best.viewportTop + best.height / 2;

                    if (isNaN(x))  throw new Error('empty x')
                      if (isNaN(y))  throw new Error('empty y')

                      return {
                        type:           isForDesktop ? 'desktop' : 'viewport',
                        offset:         { x, y },
                        originalResult: result
                      }
                })
                .then(getSidePanelWidth)
                .then(([sidePanelWidth, prev]) => {
                  // we need this for visual_search
                  // eg. DemoXMove
                  if (prev.type === 'viewport') {
                    prev.offset.x = prev.offset.x + sidePanelWidth
                  }
                  return prev;
                })
              }

              case 'ocr': {
                return runCsFreeCommands({
                  ...command,
                  cmd:    'OCRSearch',
                  target: realTarget.value.query,
                  value:  '__ocrResult__'
                })
                .then(result => {
                  const { best } = result
                  if (!best) throw new Error(`E322: no match found for '${target}'`)

                    return {
                      type: isCVTypeForDesktop(vars.get('!CVSCOPE')) ? 'desktop' : 'viewport',
                      offset: ocrMatchCenter(best),
                      originalResult: result
                    }
                  })
              }

              case 'ocrTextR': {
                return csIpc.ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
                .catch(() => {})
                .then(() => delay(() => {}, 1000))
                .then(() => {
                  return Promise.all([
                    runCsFreeCommands({
                      ...command,
                      cmd:    'OCRSearch',
                      target: realTarget.value.query,
                      mode_type: 'local',
                      value:  '__ocrResult__'
                    }),
                    isCVTypeForDesktop(vars.get('!CVSCOPE'))
                    ? getNativeXYAPI().getScalingFactor()
                    : Promise.resolve(1)
                    ])
                })
                .then(([result, scalingFactor]) => {
                  const { best } = result
                  if (!best) throw new Error(`E323: no match found for '${target}'`)

                    let xC = result.best.words[0].word.Left;
                  let yC = result.best.words[0].word.Top;
                  let HeightR = result.best.words[0].word.Height;
                  let WidthR = result.best.words[0].word.Width;

                  function getCoordinates (str) {
                    var regex = /TL(-?\d+),(-?\d+)BR(-?\d+),(-?\d+)/;
                    var matches = str.match(regex);

                    var x1 = parseInt(matches[1]);
                    var y1 = parseInt(matches[2]);
                    var x2 = parseInt(matches[3]);
                    var y2 = parseInt(matches[4]);

                    return [x1, y1, x2, y2];
                  }

                  const cal_tragte = localStorage.getItem('caliber_trget') ? localStorage.getItem('caliber_trget') : '';
                  const caliberTick = cal_tragte;
                  const countCalObj = getCoordinates(caliberTick);

                  const rectTop = yC + (countCalObj[1]);
                  const rectLeft = xC + (countCalObj[0]);
                  const rectWidth = countCalObj[2] - countCalObj[0];
                  const rectHeight = countCalObj[3] - countCalObj[1];

                  const lang            = vars.get('!ocrLanguage').toLowerCase()
                  const engine          = vars.get('!ocrEngine')
                  const scale           = vars.get('!ocrScale')
                  const isTable         = vars.get('!ocrTableExtraction')
                  const ocrApiTimeout   = config.ocr.apiTimeout
                  const isRelative      = /relative/i.test(cmd)

                  return withVisualHighlightHidden(() => {
                    return getOcrResponse({
                      store,
                      lang,
                      scale,
                      engine,
                      isTable,
                      ocrApiTimeout,
                      searchArea: 'rect',
                      storedImageRect: {
                        // Note: In desktop mode, coordinates returned by `visualXXX` is already desktop mouse coordinates
                        // must convert it back to css coordinates (for later use in image cropping or preview highlight)
                        x:        rectLeft / scalingFactor,
                        y:        rectTop / scalingFactor,
                        width:    rectWidth / scalingFactor,
                        height:   rectHeight / scalingFactor
                      },
                      isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE'))
                    })
                    .then(({ response, offset, viewportOffset }) => {
                      const documentBasedParseResults = safeUpdateIn(
                        ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
                        (word) => ({
                          ...word,
                          Top:  word.Top  + offset.y,
                          Left: word.Left + offset.x
                        }),
                        response.ParsedResults
                        )

                      const ocrMatches = [
                        // All words identified by OCR into one group
                        {
                          similarity: 1,
                          highlight:  OcrHighlightType.Matched,
                          words:      allWordsWithPosition(documentBasedParseResults, [])
                        }
                        ]

                        return {
                          byPass: true,
                          vars: {
                            [value]: response.ParsedResults && response.ParsedResults[0]
                            ? response.ParsedResults[0].ParsedText
                            : ''
                          }

                        }
                      })
                  })
                })
              }

              case 'ocrTextXmoveRelative': {
                let isRelative =
                  /relative/i.test(cmd) && !/XMoveText/i.test(cmd);
                return csIpc
                  .ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
                  .catch(() => {})
                  .then(() => delay(() => {}, 1000))
                  .then(() => {
                    return Promise.all([
                      runCsFreeCommands({
                        ...command,
                        cmd: 'OCRSearch',
                        target: target.split('#')[0],
                        mode_type: 'local',
                        value: '__ocrResult__',
                      }),
                      isCVTypeForDesktop(vars.get('!CVSCOPE'))
                        ? getNativeXYAPI().getScalingFactor()
                        : Promise.resolve(1),
                    ]);
                  })
                  .then(([result, scalingFactor]) => {
                    const isDesk = isCVTypeForDesktop(vars.get('!CVSCOPE'));
                    if (extra && extra.debugVisual && isDesk) {
                      return {
                        byPass: true,
                        vars: {
                          [value]: '',
                        },
                      };
                    }

                      const { best } = result
                      if (!best)  throw new Error(`E311: No OCR text match found for '${target}'`)

                      let rect = {
                        x : result.best.words[0].word.Left,
                        y :result.best.words[0].word.Top,
                        height :result.best.words[0].word.Height,
                        width :result.best.words[0].word.Width
                      }

                      let getTickCounter = str => {
                        function getNumberSet (num, type) {
                          if (parseInt(num) > 0 && type == 'X') {
                            return ['>', parseInt(num)];
                          } else if (parseInt(num) < 0 && type == 'X') {
                            return ['<', parseInt(num.replace('-', ''))];
                          } else if (parseInt(num) > 0 && type == 'Y') {
                            return ['^', parseInt(num)];
                          } else {
                            return ['v', parseInt(num.replace('-', ''))];
                          }
                        }

                        function getAllNumbersWithSign (str) {
                          const matches = str.match(/-?\d+/g);
                          if (matches) {
                            return matches;
                          }
                          return null;
                        }

                        if (str.indexOf('#R') !== -1) { // ABC #R-6,3
                          const parts = str.split('#R');
                          const nums = getAllNumbersWithSign(parts[1]);
                          const [x1, y1] = getNumberSet(nums[0], 'X');
                            let [x2, y2] = getNumberSet(nums[1], 'Y'); ; // 3
                            let valueObj = {};
                            valueObj[x1] = y1;
                            valueObj[x2] = y2;
                            return valueObj;
                          }
                      };

                      let ocrCalibration = store.getState().config.ocrCalibration_internal ? store.getState().config.ocrCalibration_internal : 6;
                      const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'));
                      if (!isDesktopMode) {
                        ocrCalibration = 7;
                      }

                      const caliberTick = command.target;
                      const countCalObj = getTickCounter(caliberTick);
                      for (var x in countCalObj) {
                        if (x == 'v') {
                          rect['y'] = rect['y'] + ocrCalibration * countCalObj[x]; // down (add in y offset)
                        }
                        if (x == '>') {
                          rect['x'] = rect['x'] + ocrCalibration * countCalObj[x]; // right (add in x offset)
                        }
                        if (x == '<') {
                          rect['x'] = rect['x'] - ocrCalibration * countCalObj[x]; // left (minus in x offset)
                        }
                        if (x == '^') {
                          rect['y'] = rect['y'] - ocrCalibration * countCalObj[x]; // up (minus in y offset)
                        }
                      }

                      let isDesktop = isCVTypeForDesktop(vars.get('!CVSCOPE'));
                      // return csIpc.ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
                      // .catch(() => {})
                      // .then(() => delay(() => {}, 1000))
                      return delay(() => {}, 10)
                      .then(() => {
                        const coordinates = [rect.x, rect.y]
                        if (isDesktop) {
                          return Promise.resolve({
                            type: 'desktop',
                            offset: {
                              x: parseFloat(coordinates[0]),
                              y: parseFloat(coordinates[1])
                            }
                          })
                        } else {
                          return Promise.resolve({
                            type: 'viewport',
                            offset: {
                              x: parseFloat(coordinates[0]),
                              y: parseFloat(coordinates[1])
                            }
                          })
                        }
                    })
                  })
              }

              case 'ocrTextXmove': {
                let isRelative = /relative/i.test(cmd) && !/XMoveText/i.test(cmd);
                return csIpc
                  .ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
                  .catch(() => {})
                  .then(() => delay(() => {}, 1000))
                  .then(() => {
                    return Promise.all([
                      runCsFreeCommands({
                        ...command,
                        cmd: 'OCRSearch',
                        target: target,
                        mode_type: 'local',
                        value: '__ocrResult__',
                      }),
                      isCVTypeForDesktop(vars.get('!CVSCOPE'))
                        ? getNativeXYAPI().getScalingFactor()
                        : Promise.resolve(1),
                    ]);
                  })
                  .then(([result, scalingFactor]) => {
                    const isDesk = isCVTypeForDesktop(vars.get('!CVSCOPE'));

                    if (extra && extra.debugVisual && isDesk) { 
                      return {
                        byPass: true,
                        vars: {
                          [value]: '',
                        },
                      };
                    }

                    const { best } = result;
                    if (!best)
                      throw new Error(
                        `E311: No OCR text match found for '${target}'`
                      );

                    let rect = {
                      x: result.best.words[0].word.Left,
                      y: result.best.words[0].word.Top,
                      height: result.best.words[0].word.Height,
                      width: result.best.words[0].word.Width,
                    };

                    let isDesktop = isCVTypeForDesktop(vars.get('!CVSCOPE'));

                    // return csIpc
                    //   .ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
                    //   .catch(() => {})
                    //   .then(() => delay(() => {}, 1000))

                    return delay(() => {}, 10)  
                      .then(() => {
                        const coordinates = [rect.x, rect.y];
                        if (isDesktop) {
                          return Promise.resolve({
                            type: 'desktop',
                            offset: {
                              x: parseFloat(coordinates[0]),
                              y: parseFloat(coordinates[1]),
                            },
                          })
                        } else {
                          return Promise.resolve({
                            type: 'viewport',
                            offset: {
                              x: parseFloat(coordinates[0]),
                              y: parseFloat(coordinates[1]),
                            },
                          })
                        }
                      })
                  })
              }

              case 'ocrText': {
                return runCsFreeCommands({
                  ...command,
                  cmd:    'OCRSearch',
                  target: realTarget.value.query,
                  mode_type: 'local',
                  value:  '__ocrResult__'
                })
                  .then(result => {
                    const { best } = result
                    if (!best) throw new Error(`E323: no match found for '${target}'`)

                    return {
                      type: isCVTypeForDesktop(vars.get('!CVSCOPE')) ? 'desktop' : 'viewport',
                      offset: ocrMatchCenter(best),
                      originalResult: result
                    }
                  })
                  .then(getSidePanelWidth)
                  .then(([sidePanelWidth, prev]) => {
                    // we need this for ocrText
                    if (prev.type === 'viewport') {
                      prev.offset.x = prev.offset.x + sidePanelWidth
                    }
                    return prev;
                  })
              }

              case 'desktop_coordinates': {
                const { coordinates } = realTarget.value

                // let isDesktop = isCVTypeForDesktop(vars.get('!CVSCOPE'));
                // console.log('isDesktop:>> ', isDesktop)            

                if (extra && extra.debugVisual) {
                  console.log('desktop_coordinates debugVisual extra:>>', extra)
                   
                  return captureImage({
                    isDesktop : true,
                    storedImageRect: null,
                    // searchArea: /\.png/i.test(searchArea) ? 'rect' : searchArea,
                    scaleDpi: true,
                    devicePixelRatio: window.devicePixelRatio
                  })                
                  .then(() => delay(() => {}, 500))
                  .then(() => { 

                    const imageInfo = {
                      source: DesktopScreenshot.ImageSource.Storage,
                      path:   ensureExtName(
                        '.png',
                        C.LAST_DESKTOP_SCREENSHOT_FILE_NAME
                      )
                    } 
  
                    const x = parseInt(coordinates[0], 10)
                    const y = parseInt(coordinates[1], 10)

                    return csIpc.ask('PANEL_HIGHLIGHT_DESKTOP_X', {
                        imageInfo,
                        screenAvailableSize: {
                          width: screen.availWidth,
                          height: screen.availHeight
                        },
                        coordinates: {
                          x: x / window.devicePixelRatio,
                          y: y / window.devicePixelRatio
                        }
                      })
                      .then(() => {
                        return  {
                          type: 'desktop',
                          offset: {
                            x: x,
                            y: y
                          }
                        }
                      })
                  })
                }
                
                return Promise.resolve({
                  type: 'desktop',
                  offset: {
                    x: parseFloat(coordinates[0]),
                    y: parseFloat(coordinates[1])
                  }
                })
              }

              case 'viewport_coordinates': {
                const { coordinates } = realTarget.value

                if (extra && extra.debugVisual) {    
                 csIpc.ask('PANEL_HIGHLIGHT_X', {
                    offset: {
                      x: parseFloat(coordinates[0]),
                      y: parseFloat(coordinates[1])
                    }
                  })
                }


                return Promise.resolve({
                  type: 'viewport',
                  offset: {
                    x: parseFloat(coordinates[0]),
                    y: parseFloat(coordinates[1])
                  }
                })
                .then(getSidePanelWidth)
                .then(([sidePanelWidth, result]) => {
                  result.offset.x = result.offset.x + sidePanelWidth
                  return result;
                })
              }
            }
          })()

          return pNativeXYParams.then(({ type, offset, originalResult = {} }) => {
            // Note: should not bring play tab to front if it's in desktop mode
            const prepare = isCVTypeForDesktop(vars.get('!CVSCOPE'))
            ? Promise.resolve()
            : runCsFreeCommands({ cmd: 'bringBrowserToForeground' })

            return prepare
            .then(() => delay(() => {}, 300))
            .then(() => {
              const api = getNativeXYAPI()
              const [button, eventType] = (() => {
                switch (realValue) {
                  case '#left':         return [MouseButton.Left, MouseEventType.Click]
                  case '#middle':       return [MouseButton.Middle, MouseEventType.Click]
                  case '#right':        return [MouseButton.Right, MouseEventType.Click]
                  case '#doubleclick':  return [MouseButton.Left, MouseEventType.DoubleClick]
                  case '#tripleclick':  return [MouseButton.Left, MouseEventType.TripleClick]
                  case '#shiftclick':   return [MouseButton.Left, MouseEventType.ShiftClick]
                  case '#ctrlclick':    return [MouseButton.Left, MouseEventType.CtrlClick]
                  case '#move':         return [MouseButton.Left, MouseEventType.Move]
                  case '#up':           return [MouseButton.Left, MouseEventType.Up]
                  case '#down':         return [MouseButton.Left, MouseEventType.Down]
                  default:              throw new Error(`:E324: Unsupported realValue: ${realValue}`)
                }
              })()

              var event = {
                button,
                x:    Math.round(offset.x), // test avoid 65.5 etc
                y:    Math.round(offset.y),
                type: eventType
              }

              // check command is TextRelative and calculate by caliber
              if (command.cmd == 'XClickTextRelative') {
                let getTickCounter = str => {
                  function getNumberSet (num, type) {
                    if (parseInt(num) > 0 && type == 'X') {
                      return ['>', parseInt(num)];
                    } else if (parseInt(num) < 0 && type == 'X') {
                      return ['<', parseInt(num.replace('-', ''))];
                    } else if (parseInt(num) > 0 && type == 'Y') {
                      return ['^', parseInt(num)];
                    } else {
                      return ['v', parseInt(num.replace('-', ''))];
                    }
                  }

                  function getAllNumbersWithSign (str) {
                    const matches = str.match(/-?\d+/g);
                    if (matches) {
                      return matches;
                    }
                    return null;
                  }

                  if (str.indexOf('#R') !== -1) { // ABC #R-6,3
                    const parts = str.split('#R');
                    const nums = getAllNumbersWithSign(parts[1]);
                    const [x1, y1] = getNumberSet(nums[0], 'X');
                      let [x2, y2] = getNumberSet(nums[1], 'Y'); ; // 3
                      let valueObj = {};
                      valueObj[x1] = y1;
                      valueObj[x2] = y2;
                      return valueObj;
                    }

                  // return str.split('').reduce((total, letter) => {
                  //   total[letter] ? total[letter]++ : total[letter] = 1;
                  //   return total;
                  // }, {});
                };

                let ocrCalibration = store.getState().config.ocrCalibration_internal ? store.getState().config.ocrCalibration_internal : 6;
                const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'));
                if (!isDesktopMode) {
                  ocrCalibration = 7;
                }
                // const caliberTick = command.target.split('#R')[1]; //old methode target
                const caliberTick = command.target;
                const countCalObj = getTickCounter(caliberTick);
                for (var x in countCalObj) {
                  if (x == 'v') {
                    event['y'] = event['y'] + ocrCalibration * countCalObj[x]; // down (add in y offset)
                  }
                  if (x == '>') {
                    event['x'] = event['x'] + ocrCalibration * countCalObj[x]; // right (add in x offset)
                  }
                  if (x == '<') {
                    event['x'] = event['x'] - ocrCalibration * countCalObj[x]; // left (minus in x offset)
                  }
                  if (x == '^') {
                    event['y'] = event['y'] - ocrCalibration * countCalObj[x]; // up (minus in y offset)
                  }
                }
              }

              if (['XClickTextRelative', 'XMoveTextRelative'].includes(command.cmd)) {
                if (!originalResult || !originalResult.vars) {
                  originalResult = {
                    vars: {}
                  }
                }
                originalResult.vars['!ocrx'] = event['x']
                originalResult.vars['!ocry'] = event['y']
              }

              log('event ===', event)
              const pSendMouseEvent = type === 'desktop'
              ? api.sendMouseEvent(event)
              : api.sendViewportMouseEvent(event, {
                getViewportRectInScreen: () => {
                  return csIpc.ask('PANEL_GET_VIEWPORT_RECT_IN_SCREEN')
                }
              })
              
              store.dispatch(Actions.setOcrInDesktopMode(false))

              return pSendMouseEvent.then(success => {
                if (!success) throw new Error(`E201: Failed to ${cmd} ${type} coordinates at [${offset.x}, ${offset.y}]`)

                // Note: `originalResult` is used by visualAssert to update !imageX and !imageY
              return {
                ...originalResult,
                byPass: true
              }
            })
            })
          })
        })
      }

      case 'captureDesktopScreenshot': {
        const cvApi           = getNativeCVAPI()
        const isJustFileName  = (str) => !/[\\/]/.test(str)
        const path            = target && target.trim()
        const filePath        = path && path.length > 0 ? ensureExtName('.png', path) : undefined
        const next            = filePath && isJustFileName(filePath)
        ? (actualPath) => {
          return cvApi.readFileAsBlob(actualPath)
          .then(blob => {
            return getStorageManager()
            .getScreenshotStorage()
            .overwrite(path, blob)
            .then(() => {
              store.dispatch(act.listScreenshots())
              store.dispatch(act.addLog('info', `desktop screenshot saved to screenshot storage with file name '${path}'`))
            })
          })
        }
        : (actualPath) => {
          store.dispatch(act.addLog('info', `desktop screenshot saved to hard drive at '${actualPath}'`))
        }
        return cvApi.captureDesktop({ path: filePath})
        .then(next)
        .then(() => ({
          byPass: true
        }))
      }

      case 'captureScreenshot': {
        const fileName = ensureExtName('.png', target)
        const devicePixelRatio = window.devicePixelRatio

        return getState().then(state => {
          return activateTab(state.tabIds.toPlay, true)
          .then(() => delay(() => {}, C.SCREENSHOT_DELAY))
          .then(() => {
            return captureScreenshotService.saveScreen(
              getStorageManager().getScreenshotStorage(),
              state.tabIds.toPlay,
              fileName,
              devicePixelRatio
              )
          })
        })
        .then(({ fileName, url }) => ({
          screenshot: {
            url,
            name: fileName
          },
          byPass: true
        }))
      }

      case 'captureEntirePageScreenshot': {
        const originalFileName = ensureExtName('.png', target)
        // replace % with _ to avoid error in file name
        const fileName = originalFileName.replace(/%/g, '_')

        return getState().then(state => {
          return activateTab(state.tabIds.toPlay, true)
          .then(() => delay(() => {}, C.SCREENSHOT_DELAY))
          .then(getPlayTabIpc)
          .then(ipc => {
            return captureScreenshotService.saveFullScreen(
              getStorageManager().getScreenshotStorage(),
              state.tabIds.toPlay,
              fileName,
              {
                startCapture: () => {
                  return ipc.ask('START_CAPTURE_FULL_SCREENSHOT', {}, C.CS_IPC_TIMEOUT)
                },
                endCapture: (pageInfo) => {
                  return ipc.ask('END_CAPTURE_FULL_SCREENSHOT', { pageInfo }, C.CS_IPC_TIMEOUT)
                },
                scrollPage: (offset) => {
                  return ipc.ask('SCROLL_PAGE', { offset }, C.CS_IPC_TIMEOUT)
                }
              }
              )
          })
        })
        .then(({ fileName, url }) => ({
          screenshot: {
            url,
            name: fileName
          },
          byPass: true
        }))
      }

      case 'selectWindow': {
        const p = (() => {
          switch (target && target.toUpperCase()) {
            case 'TAB=CLOSEALLOTHER':
            return csIpc.ask('PANEL_CLOSE_OTHER_TABS', {})

            case 'TAB=CLOSE':
            return csIpc.ask('PANEL_CLOSE_CURRENT_TAB', {})

            default:
            const [type, locator] = splitIntoTwo('=', target)
            return csIpc.ask('PANEL_SELECT_WINDOW', { target, value })
          }
        })()

        // Note: let `selectWindow` pass through cs and back to background,
        // to keep the flow more consistent with the other commands
        return p.then(() => {
          return getPlayTab().then(tab => {
            return {
              byPass: true,
              pageUrl: tab.url,
              index:tab.index
            }
          })
        })      
      }

      default:
      return undefined
    }
  }

  return runCsFreeCommands
}

const interpretCSVCommands = ({ store, vars }) => (command, index) => {
  const csvStorage = getStorageManager().getCSVStorage()
  const { cmd, target, value } = command
  const assertCsvExist = (target) => {
    return csvStorage.exists(target)
    .then(isExisted => {
      if (isExisted) {
        if (!vars.get('!CsvReadLineNumber')) {
          vars.set({ '!CsvReadLineNumber': 1 }, true)
        }
        return
      }

      vars.set({ '!CsvReadStatus': 'FILE_NOT_FOUND' }, true)

      let errMsg = `E325: csv file '${target}' does not exist`

      if (getStorageManager().isBrowserMode() &&
        (pathPosix.isAbsolute(target) || pathWin32.isAbsolute(target))) {
        errMsg += '. Full path works only in hard-drive mode.'
    }

    throw new Error(errMsg)
  });
  }

  switch (cmd) {
    case 'csvRead': {
      if (value && value.length > 0) {
        store.dispatch(act.addLog('warning', 'csvRead: Value field should be empty (not used)'))
      }

      return assertCsvExist(target).then(() => {
        return csvStorage.read(target, 'Text')
        .then(parseFromCSV)
        .then(rows => {
          // Note: !CsvReadLineNumber starts from 1
          const index = vars.get('!CsvReadLineNumber') - 1
          const row   = rows[index]

          if (index >= rows.length) {
            vars.set({ '!CsvReadStatus': 'END_OF_FILE' }, true)
            throw new Error('end of csv file reached')
          } else {
            vars.set({
              '!CsvReadStatus': 'OK',
              '!CsvReadMaxRow': rows.length
            }, true)
          }

          vars.clear(/^!COL\d+$/i)

          row.forEach((data, i) => {
            vars.set({ [`!COL${i + 1}`]: data })
          })

          return {
            isFlowLogic: true
          }
        })
      })
    }

    case 'csvSave': {
      const csvLine = vars.get('!CSVLINE')

      if (!csvLine || !csvLine.length) {
        throw new Error('No data to save to csv')
      }

      return stringifyToCSV([csvLine])
      .then(newLineText => {
        const fileName = /\.csv$/i.test(target) ? target : (target + '.csv')

        return csvStorage.exists(fileName)
        .then(isExisted => {
          if (!isExisted) {
            return csvStorage.write(fileName, new Blob([newLineText]))
          }

          return csvStorage.read(fileName, 'Text')
          .then(originalText => {
            const text = (originalText + '\n' + newLineText).replace(/\n+/g, '\n')
            return csvStorage.overwrite(fileName, new Blob([text]))
          })
        })
      })
      .then(() => {
        vars.clear(/^!CSVLINE$/)
        store.dispatch(act.listCSV())
      })
      .then(() => ({
        isFlowLogic: true
      }))
    }

    case 'csvReadArray': {
      if (!value || !value.length) {
        throw new Error('E326: Please provide variable name as value')
      }

      return assertCsvExist(target).then(() => {
        return csvStorage.read(target, 'Text')
        .then(parseFromCSV)
        .then(
          rows => {
            vars.set({
              '!CsvReadStatus': true,
              '!CsvReadMaxRow': rows.length
            }, true)

            return {
              byPass: true,
              vars: {
                [value]: rows
              }
            }
          },
          e => {
            vars.set({ '!CsvReadStatus': false }, true)
            return Promise.reject(e)
          }
          )
      })
    }

    case 'csvSaveArray': {
      if (!value || !value.length) {
        throw new Error('E327: Please provide csv file name as value')
      }

      if (!target || !target.length) {
        throw new Error('E328: Please provide array variable name as target')
      }

      const arr = vars.get(target)

      if (!arr) {
        throw new Error(`E329: No variable found with name '${target}'`)
      }

      const isValidCsvArray = Array.isArray(arr) && Array.from(arr).every(item => Array.isArray(item))

      if (!isValidCsvArray) {
        throw new Error('E330: Array must be two dimensional array')
      }

      return stringifyToCSV(arr)
      .then(csvText => {
        const fileName = /\.csv$/i.test(value) ? value : (value + '.csv')
        return csvStorage.overwrite(fileName, new Blob([csvText]))
      })
      .then(() => {
        store.dispatch(act.listCSV())
      })
      .then(() => ({
        isFlowLogic: true
      }))
    }

    default:
    return undefined
  }
}

// Note: initialize the player, and listen to all events it emits
export const initPlayer = (store) => {
  const vars           = varsFactory('main', {}, { '!TESTSUITE_LOOP': 1 })
  const macroCallStack = createMacroCallStack({
    getCurrentMacroRunningStatus: () => {
      const playerState     = tcPlayer.getState()
      const reducerState    = store.getState()
      const commandResults  = getCommandResults({
        count:          playerState.resources.length,
        doneIndices:    getDoneCommandIndices(reducerState),
        errorIndices:   getErrorCommandIndices(reducerState),
        warningIndices: getWarningCommandIndices(reducerState)
      })

      return {
        playerState,
        commandResults,
        status:           MacroStatus.Running,
        nextIndex:        playerState.nextIndex,
        interpreterState: interpreter.backupState()
      }
    },
    updateSelectedMacro: (macro, runningStatus) => {
      return store.dispatch(act.editTestCase(macro.id))
    },
    restorePlayerState: (macro, runningStatus) => {
      // Steps:
      // 1. Restore macro player state
      // 2. Restore player state in reducer
      const { playerState, interpreterState = clone(Interpreter.DefaultState) } = runningStatus

      tcPlayer.setState(playerState)

      store.dispatch(act.setPlayerState({
        // Note: since we don't show loop info for subroutines,
        // `currentLoop` and `loops` in reducer state is always for initial call frame,
        // so no neep to restore that info from call stack before playing any frame
        //
        // currentLoop:         playerState.loopsCursor - playerState.loopsStart + 1,
        // loops:               playerState.loopsEnd - playerState.loopsStart + 1,
        nextCommandIndex:    playerState.nextIndex
      }))

      interpreter.restoreState(interpreterState)
    },
    playMacro: (macro, runningStatus, { isBottom, isResume, frameId }) => {
      // Note: do not use clone here, otherwise will lose `callback` in playerState
      const playerState = { ...runningStatus.playerState }

      playerState.noEndEvent = !isBottom

      // Note: frameId in extra will be available in all kinds of player events,
      // frameId is used as id for monitor, so that we can control monitors in player events
      playerState.extra = {
        ...(playerState.extra || {}),
        frameId,
        macroId:            macro.id,
        isBottomFrame:      isBottom,
        isBackFromCalling:  isResume
      }

      return showDownloadBarFinally(
        () => xCmdCounter.get() > 0,
        () => {
          if (isResume) {
            tcPlayer.setState(playerState)
            // Note: already increase `nextIndex` by one
            tcPlayer.__setNext(runningStatus.nextIndex)

            return tcPlayer.play(
              tcPlayer.getState()
              )
          } else {
            const needDelayAfterLoop = and(
              ...playerState.resources.map(command => isExtensionResourceOnlyCommand(command.cmd))
              )
            const args = {
              ...playerState,
              needDelayAfterLoop
            }
            return tcPlayer.play(args)
          }
        }
      )
    }
  })

  const ocrCmdCounter = getOcrCommandCounter({
    initial: 0,
    getMax: () => getLicenseService().getMaxOcrCalls(),
    onMax: (cur, max, initial) => {
      throw new Error(`OCR conversion limit reached`)
    }
  })
  const xCmdCounter = new Counter({
    initial: 0,
    getMax: () => getLicenseService().getMaxXCommandCalls(),
    onMax: (cur, max, initial) => {
      throw new Error(`XClick/XClickText/XClickTextRelative/XMoveText/XMoveTextRelative/XMove/XType ${max} commands limit reached`)
    }
  })
  const proxyCounter = new Counter({
    initial: 0,
    getMax: () => getLicenseService().getMaxProxyCalls(),
    onMax: (cur, max, initial) => {
      throw new Error(`PROXY ${max} commands limit reached`)
    }
  })
  const interpreter = new Interpreter({
    run: interpretSpecialCommands({
      vars,
      store,
      xCmdCounter,
      getTcPlayer: () => tcPlayer,
      getInterpreter: () => interpreter
    })
  })
  const tcPlayer    = initTestCasePlayer({store, vars, interpreter, xCmdCounter, ocrCmdCounter, proxyCounter})
  // **important: don't remove tsPlayer. It's actually used by context menu "Testsuite: play all in folder"
  const tsPlayer    = initTestSuitPlayer({store, vars, tcPlayer, xCmdCounter, ocrCmdCounter, proxyCounter})

  initMacroMonitor({ vars, store })

  macroCallStack.on(CallStackEvent.BeforeRun, (macroInfoList) => {
    const lastMacroInfo = macroInfoList[macroInfoList.length - 1]
    const lastName      = lastMacroInfo.name
    const prevNames     = macroInfoList.slice(0, -1).map((item) => `'${item.name}'`)

    if (prevNames.length > 0) {
      store.dispatch(act.addLog('status', `Running '${lastName}', called by ${prevNames.join(' > ')}`))
    }
  })

  macroCallStack.on(CallStackEvent.AfterReturn, (macroInfoList) => {
    const lastMacroInfo = macroInfoList[macroInfoList.length - 1]
    const lastName      = lastMacroInfo.name
    const lastFrameId   = lastMacroInfo.frameId
    const prevNames     = macroInfoList.slice(0, -1).map((item) => `'${item.name}'`)

    getMacroMonitor().removeTarget(lastFrameId)

    if (prevNames.length > 0) {
      store.dispatch(act.addLog('status', `Finished running '${lastName}', returning to ${prevNames.join(' > ')}`))
    }
  })

  csIpc.onAsk((cmd, args) => {
    switch (cmd) {
      case 'DOWNLOAD_COMPLETE': {
        const fileName = args ? path.basename(args.filename) : null

        if (!fileName) {
          return false
        }
        vars.set({ '!LAST_DOWNLOADED_FILE_NAME': fileName }, true)
        return true
      }
    }
  })

  // Note: No need to return anything in this method.
  // Because both test case player and test suite player are cached in player.js
  // All later usage of player utilize `getPlayer` method
}

// Note: Standalone function to ask background to run a command
const askBackgroundToRunCommand = ({ command, state, store, vars, preRun }) => {
  // ** commands are by default superfast except it has any !REPLAYSPEED command in lower index that has v1 as suffix like: fastv1
  const superFast = /^(nodisplay|fast|medium|slow)$/i.test(vars.get('!REPLAYSPEED')) ? true : false

  // const vars_ = getVarsInstance().dump()
  // console.log('vars_ :>> ', vars_)

  const firstOnDownloadIndex = state.resources.findIndex(command => command.cmd === 'onDownload')
  let hasOnDownloadCmd = false
  if (firstOnDownloadIndex !== -1) {
    const nextIndex = state.nextIndex
    if (firstOnDownloadIndex < nextIndex) {
      hasOnDownloadCmd = true
    }
  }   

  const useClipboard = /!clipboard/i.test(command.target + ';' + command.value)
  const prepare = !useClipboard
  ? Promise.resolve({ useClipboard: false })
  : Promise.resolve({ useClipboard: true, clipboard: clipboard.get() })

  if (Ext.isFirefox()) {
    switch (command.cmd) {
      case 'onDownload':
      store.dispatch(act.addLog('warning', 'onDownload - changing file names not supported by Firefox extension api yet'))
      break
    }
  }

  switch (command.cmd) {
    case 'XType':
    if (command.value && command.value.length > 0) {
      throw new Error(`E340: XType currently doesn't use the "Value" field`)
    }

    break
  }

  return prepare.then(({ useClipboard, clipboard = '' }) => {
    // Set clipboard variable if it is used
    if (useClipboard) {
      vars.set({ '!CLIPBOARD': clipboard })
    }

    if (state.extra.isBottomFrame) {
      vars.set({
        '!LOOP': state.loopsCursor
      }, true)
    }

    vars.set({
      '!RUNTIME':   milliSecondsToStringInSecond(
        getMacroMonitor().getDataFromInspector(
          getMacroCallStack().bottom().id,
          MacroInspector.LoopTimer
          )
        )
    }, true)

    if (command.cmd === 'open' || command.cmd === 'openBrowser') {
      // const indexR = vars.get('!CURRENT_TAB_NUMBER_RELATIVE') + 1;
      // vars.set({ '!CURRENT_TAB_NUMBER_RELATIVE': indexR}, true)
      command = {...command, href: state.startUrl}
    }

    // Note: translate shorthand '#efp'
    if (command.target && /^#efp$/i.test(command.target.trim())) {
      // eslint-disable-next-line no-template-curly-in-string
      command.target = '#elementfrompoint (${!imageX}, ${!imageY})'
    }

    const isRelatedToExecuteScript = [
    'executeScript',
    'executeScript_Sandbox',
    'executeAsyncScript',
    'executeAsyncScript_Sandbox',
    'if_v2',
    'while_v2',
    'gotoIf_v2',
    'if',
    'while',
    'gotoIf',
    'elseif',
    'repeatIf'
    ].indexOf(command.cmd) !== -1

    if (command.cmd !== 'comment') {
      // Replace variables in 'target' and 'value' of commands
      ;['target', 'value'].forEach(field => {
        if (command[field] === undefined) return

          const oldEval = (command.cmd === 'storeEval' && field === 'target') ||
        (command.cmd === 'gotoIfxxx' && field === 'target') ||
        (command.cmd === 'ifxxx' && field === 'target') ||
        (command.cmd === 'whilexxx' && field === 'target')
        const opts = oldEval
        ? { withHashNotation: true }
        : {}

        opts.shouldStringify = oldEval || isRelatedToExecuteScript

        command = {
          ...command,
          [field]: vars.render(
            replaceEscapedChar(
              ['type'].includes(command.cmd)  ? command[field] : command[field].trim(),
              command,
              field,
              vars.get('!StringEscape')
              ),
            opts
            )
        }
      })
    }

    
    // add timeout info to each command's extra
    // Please note that we must set the timeout info at runtime for each command,
    // so that timeout could be modified by some 'store' commands and affect
    // the rest of commands
    command = updateIn(['extra'], extra => ({
      ...(extra || {}),
      timeoutPageLoad:  vars.get('!TIMEOUT_PAGELOAD'),
      timeoutElement:   vars.get('!TIMEOUT_WAIT'),
      timeoutDownload:  vars.get('!TIMEOUT_DOWNLOAD'),
      timeoutDownloadStart: vars.get('!TIMEOUT_DOWNLOAD_START') || Math.max(10, vars.get('!TIMEOUT_WAIT')),
      lastCommandOk:    vars.get('!LASTCOMMANDOK'),
      errorIgnore:      !!vars.get('!ERRORIGNORE'),
      waitForVisible:   !!vars.get('!WAITFORVISIBLE'),
      superFast:        superFast,
      hasOnDownloadCmd: hasOnDownloadCmd
    }), command)


    return preRun(command, state, (command) => {
      const runCommandInPlayTab_result = runCommandInPlayTab(command)
      console.log('runCommandInPlayTab_result:>> ', runCommandInPlayTab_result)
      return runCommandInPlayTab_result;
    })
  })
}

function initMacroMonitor ({ store, vars }) {
  getMacroMonitor((actionType, name, id, notBatch) => {
    switch (actionType) {
      case MacroParamsProviderType.Constructor: {
        switch (name) {
          case MacroInspector.Countdown:
          return [
          () => {
            getPlayer().stopWithError(
              new Error(
                `E351: macro '${getMacroCallStack().peek().resource.name}' timeout ${vars.get('!TIMEOUT_MACRO')}s (change the value in the settings if needed)`
                )
              )
          }
          ]

          case MacroInspector.Timer:
          case MacroInspector.LoopTimer:
          default:
          return []
        }
      }

      case MacroParamsProviderType.Restart: {
        switch (name) {
          case MacroInspector.Countdown:
          return [
          vars.get('!TIMEOUT_MACRO') * 1000,
          true
          ]

          case MacroInspector.Timer:
          case MacroInspector.LoopTimer:
          default:
          return []
        }
      }
    }
  })
}

function isPausedOrStopped (str) {
  return /player: paused or stopped/.test(str)
}

const initTestCasePlayer = ({ store, vars, interpreter, xCmdCounter, ocrCmdCounter, proxyCounter }) => {
  // Note: use this to track `onError` command
  // `onError` works like a global try catch, it takes effects on any commands coming after `onError`
  // Multilple `onError` are allowed, latter one overwrites previous one.
  // The scope of `onError` is current loop 
  let onErrorCommand = null
  const player      = getPlayer({
    prepare: (state) => {
      // Each 'replay' has an independent variable scope,
      // with global variables as initial scope

      if (state.extra.isBottomFrame && !state.extra.isBackFromCalling) {
        if (state.keepVariables != 'yes') {
          vars.reset({ keepGlobal: true })
        }
        checkRelativeIndexArr = [];
        vars.set(state.public.scope || {}, true)
        vars.set({
          '!StatusOK': true,
          '!WaitForVisible': false,
          '!StringEscape': true,
          '!IMAGEX': 0,
          '!IMAGEY': 0,
          '!OCRX': 0,
          '!OCRY': 0,
          '!OCRHEIGHT': 0,
          '!OCRWIDTH': 0,
          '!AI1': 0,
          '!AI2': 0,
          '!AI3': 0,
          '!AI4': 0,
          '!LAST_DOWNLOADED_FILE_NAME':vars.get('!LAST_DOWNLOADED_FILE_NAME') || '',
          '!URL': state.playUrl || '',
          '!CURRENT_TAB_NUMBER':state.playtabIndex,
          '!CURRENT_TAB_NUMBER_RELATIVE':0,
          '!CURRENT_TAB_NUMBER_RELATIVE_INDEX':state.playtabIndex,
          '!CURRENT_TAB_NUMBER_RELATIVE_ID':state.playtabId,
          '!OCRENGINE': store.getState().config.ocrEngine,
          '!OCRLANGUAGE': store.getState().config.ocrLanguage,
          '!BROWSER': Ext.isFirefox() ? 'firefox' : 'chrome',
          '!OS': (() => {
            const ua = window.navigator.userAgent
            if (/windows/i.test(ua))  return 'windows'
              if (/mac/i.test(ua))      return 'mac'
                return 'linux'
            })()
          }, true)
      }

      if (!state.extra.isBackFromCalling) {
        interpreter.reset()
        interpreter.preprocess(state.resources)
      }

      return csIpc.ask('PANEL_START_PLAYING', {
        url: state.startUrl,
        shouldNotActivateTab: true
      })
    },
    run: (command, state) => {
      return askBackgroundToRunCommand({
        command,
        state,
        store,
        vars,
        preRun: (command, state, askBgToRun) => {
          // Note: all commands need to be run by interpreter before it is sent to bg
          // so that interpreter could pick those flow logic commands and do its job

          return new Promise((resolve, reject) => {
            // Note: inc() has a chance to throw xCommand limit reached error,
            // so it's easier to keep it in the Promise constructor
            if (/^(XType|XClick|XClickText|XMove|XMoveText|XMoveTextRelative|XClickRelative|XClickTextRelative|XMoveRelative|XMouseWheel)$/i.test(command.cmd)) {
              xCmdCounter.inc()
            }

            if (command.cmd === 'setProxy') {
              // Note: do not need this as we already metion proxy permission in manifest
              // let {permissionText} = store.getState().config;
              // if( permissionText != "Permission OK"){
              //   throw new Error(`Please request proxy permission in settings`)
              // }
              proxyCounter.inc()
            }

            interpreter.run(command, state.nextIndex)
            .then(async (result) => {
              const { byPass, isFlowLogic, nextIndex, resetVars } = result
              if (result.index != undefined) {
                const isFound = checkRelativeIndex(result.index);
                if (isFound == 1 || 1) {
                  const isFoundTab = await checkRelativeTabId(vars.get('!CURRENT_TAB_NUMBER_RELATIVE_ID'));
                  let CURRENT_TAB_NUMBER_RELATIVE_INDEX = isFoundTab ? vars.get('!CURRENT_TAB_NUMBER_RELATIVE_INDEX') : 'NA';
                  // const indexR = vars.get('!CURRENT_TAB_NUMBER_RELATIVE') + 1;
                  // const indexR = result.index - CURRENT_TAB_NUMBER_RELATIVE_INDEX;
                  if (state.mode == 'LOOP' && state.nextIndex == 1) {
                    CURRENT_TAB_NUMBER_RELATIVE_INDEX = 0;
                  }
                  if (CURRENT_TAB_NUMBER_RELATIVE_INDEX == 'NA') {
                    let tabF = await getTabIdwithIndex0();
                    CURRENT_TAB_NUMBER_RELATIVE_INDEX = tabF['index'] != undefined ? tabF['index'] : 0;
                    vars.set({ '!CURRENT_TAB_NUMBER_RELATIVE_ID': tabF['id']}, true)
                    vars.set({ '!CURRENT_TAB_NUMBER_RELATIVE_INDEX': tabF['index']}, true)
                  }
                  // const indexR =  CURRENT_TAB_NUMBER_RELATIVE_INDEX == 0 ? 0: result.index - CURRENT_TAB_NUMBER_RELATIVE_INDEX;
                  const indexR =  result.index - CURRENT_TAB_NUMBER_RELATIVE_INDEX;
                  vars.set({ '!CURRENT_TAB_NUMBER_RELATIVE': indexR}, true)
                }

                vars.set({ '!CURRENT_TAB_NUMBER': result.index }, true)
              }

              // Record onError command
              if (command.cmd === 'onError') {
                onErrorCommand = command
              }
             
              // fix sandbox array issue
              if (command.cmd == 'executeScript_Sandbox') {
                // console.log('executeScript_Sandbox result:>>', result)

                let resultVars = result.vars
                if (!resultVars) {
                  throw new Error('E503: A variable is required in the value field.')
                }
                 
                let varKey = Object.keys(resultVars)[0] // always the first key
                let varValue = Object.values(resultVars)[0] // always the first value
                console.log('varKey:>> ', varKey)
                console.log('varValue:>> ', varValue)
 
                const convertObjFormatToRealObj = (obj) => {
                  if(!obj) return obj
                  // console.log('obj:>> ', obj)
                  let newObj
                  if (obj?.properties) {
                    let varValueType =  obj.class == "Array" ? 'array' : 'object'
                    console.log('varValueType:>> ', varValueType) 
                    if (varValueType == 'array') {
                      // it's an array
                      newObj = []
                      for (let i = 0; i < obj.properties.length; i++) {
                        newObj.push(convertObjFormatToRealObj(obj.properties[i]))
                      }
                    } else {
                      // it's an object
                      newObj = {}
                      newObj = convertObjFormatToRealObj(obj.properties)
                    }
                  } else {
                    // console.log('last obj:>> ', obj)
                    let newKeys = Object.keys(obj)
                    let values = Object.values(obj)
                    let hasObjectOrArray = values.some(val => val?.properties)
                    if (hasObjectOrArray) {
                      newObj = {}
                      for (let i = 0; i < newKeys.length; i++) {
                        newObj[newKeys[i]] = convertObjFormatToRealObj(values[i])
                      }
                    } else {
                      newObj = obj
                    }
                  }
                  return newObj
                }

                let finalValue = convertObjFormatToRealObj(varValue)
                // console.log('finalValue:>> ', finalValue)
                           
                // put explicitly
                const result_ = {
                  byPass,
                  vars: {
                    [varKey]: finalValue
                  }
                }
                
                return Promise.resolve(result_)                
              }

              if (byPass) return Promise.resolve(result)

              if (isFlowLogic)  return Promise.resolve({ nextIndex })

              return askBgToRun(command)
            })
            .then(resolve, reject)
          })
        }
      })
      .catch(e => {
        // Note: it will just log errors instead of a stop of whole macro, in following situations
        // 1. variable !ERRORIGNORE is set to true
        // 2. There is an `onError` command ahead in current loop.
        // 3. it's in loop mode, and it's not the last loop, and onErrorInLoop is continue_next_loop,
        if (vars.get('!ERRORIGNORE')) {
          return {
            log: {
              error: e.message
            }
          }
        }

        if (onErrorCommand) {
          const value           = onErrorCommand.value && onErrorCommand.value.trim()
          const target          = onErrorCommand.target && onErrorCommand.target.trim()

          if (/^#restart$/i.test(target)) {
            store.dispatch(act.addLog('status', 'onError - about to restart'))

            e.restart = true
            throw e
          } else if (/^#goto$/i.test(target)) {
            store.dispatch(act.addLog('status', `onError - about to goto label '${value}'`))

            return Promise.resolve({
              log: {
                error: e.message
              },
              nextIndex: interpreter.commandIndexByLabel(value)
            })
          }
        }

        const isPausedStopped  = isPausedOrStopped(e.message)
        const continueNextLoop =  state.mode === Player.C.MODE.LOOP &&
        state.loopsCursor < state.loopsEnd &&
        store.getState().config.onErrorInLoop === 'continue_next_loop'

        if (continueNextLoop) {
          if (isPausedStopped) {
            return {
              // Note: simply set nextIndex to command count, it will enter next loop
              nextIndex: state.resources.length
            }
          }

          return {
            log: {
              error: e.message
            },
            // Note: simply set nextIndex to command count, it will enter next loop
            nextIndex: state.resources.length
          }
        }

        // Note: set these status values to false
        // status of those logs above will be taken care of by `handleResult`
        vars.set({
          '!LastCommandOK': false,
          '!StatusOK': false
        }, true)

        throw e
      })
    },
    handleResult: (result, command, state) => {
      const prepares = []
      const getCurrentPlayer = () => {
        const state = store.getState()

        switch (state.player.mode) {
          case C.PLAYER_MODE.TEST_CASE:
          return getPlayer({ name: 'testCase' })

          case C.PLAYER_MODE.TEST_SUITE:
          return getPlayer({ name: 'testSuite' })
        }
      }

      getPlayTab().then(tab => {
        vars.set({ '!CURRENT_TAB_NUMBER': tab.index }, true)
      })
      // Every command should return its window.url
      if (result && result.pageUrl) {
        vars.set({ '!URL': result.pageUrl }, true)
      }

      if (result && result.vars) {
        const newVars = objMap(val => {
          if (val && val.__undefined__)  return undefined
            return val
        }, result.vars)

        log('set vars', newVars)

        try {
          vars.set(newVars)

          // Note: if set value to !Clipboard, there is an async job we must get done before handleResult could return
          const clipBoardKey = Object.keys(result.vars).find(key => /!clipboard/i.test(key))
          if (clipBoardKey) {
            prepares.push(
              Promise.resolve(clipboard.set(result.vars[clipBoardKey]))
              )
          }

          // Note: if user sets !timeout_macro to some other value, re-calculate the time left
          const timeoutMacroKey = Object.keys(result.vars).find(key => /!timeout_macro/i.test(key))

          if (timeoutMacroKey) {
            const frameId = getMacroCallStack().peek().id
            getMacroMonitor().restartInspector(frameId, MacroInspector.Countdown)
          }
        } catch (e) {
          console.log
          if (newVars['!ocrlanguage']) {
            let ocrEngine = vars.get('!ocrEngine') ||  store.getState().config.ocrEngine

            let ocrEngineName = ocrEngine == 99 ? 'XModule' : 
            ocrEngine == 98 ? 'JavaScript OCR' :
            (ocrEngine == 1  || ocrEngine == 2)? 'OCR.Space Engine' : 'OCR Engine'

            return Promise.reject(new Error(`E502: ${ocrEngineName} encountered a problem`))
          }
          return Promise.reject(e)
        }
      }

      let hasError = false

      if (result && result.log) {
        if (result.log.info) {
          store.dispatch(act.addLog('echo', result.log.info, result.log.options))

          if (result.log.options && result.log.options.notification) {
            csIpc.ask('PANEL_NOTIFY_ECHO', { text: result.log.info })
          }
        }

        if (result.log.warning) {
          store.dispatch(act.addLog('warning', result.log.warning, result.log.options))
        }

        if (result.log.error && !isPausedOrStopped(result.log.error)) {
          store.dispatch(act.addPlayerWarningCommandIndex(state.nextIndex))
          store.dispatch(act.addLog('error', result.log.error, { ignored: true }))
          hasError = true
        }
      }

      // From spec: !StatusOK, very similar to !LastCommandOK but it does not get reset by a “good” command.
      // If set to error, it remains like this. But a user can use store | true | !StatusOK to manually reset it.
      if (command.cmd !== 'echo') {
        vars.set({ '!LastCommandOK': !hasError }, true)
      }

      if (hasError) {
        vars.set({ '!StatusOK': false }, true)
      }

      if (result && result.screenshot) {
        store.dispatch(act.addLog('info', 'a new screenshot captured'))

        getStorageManager()
        .getScreenshotStorage()
        .getLink(result.screenshot.name)
        .then(link => ({
          ...result.screenshot,
          url: link
        }))
        .then(ss => {
          store.dispatch(act.listScreenshots())
        })
        .catch(e => {
          log.error('screenshot obj error 1', e)
          log.error('screenshot obj error stack', e.stack)
        })
      }

      if (result && result.control) {
        switch (result.control.type) {
          case 'pause':
            // Important: should only pause test case player, not test suite player
            // Because once test suite player is paused, it is supposed to run the test case from start again
            csIpc.ask('PANEL_NOTIFY_AUTO_PAUSE', {})

            // pause() returns a promise that doesn't resolve,
            // must return that promise here to pause any further execution
            return getPlayer({ name: 'testCase' }).pause()

            default:
            throw new Error(`Control type '${result.control.type}' not supported yet`)
        }
      }

      if (/^(nodisplay|fast|medium|slow)$/i.test(vars.get('!REPLAYSPEED'))) {
        player.setSuperFastMode(true)
      } else {
        player.setSuperFastMode(false)
      }

      if(store.getState().replaySpeedOverrideToFastMode && 
      (state.postDelay !== REPLAY_SPEED_DELAY['FAST'] || store.getState().noDisplayInPlay)) {
        store.dispatch(Actions.setNoDisplayInPlay(false))
        player.setPostDelay(REPLAY_SPEED_DELAY['FAST'])

      } else {
        if (/^(fastv1|fast|mediumv1|medium|slowv1|slow|nodisplayv1|nodisplay)$/i.test(vars.get('!REPLAYSPEED'))) {
          const val = vars.get('!REPLAYSPEED').toUpperCase()

          player.setPostDelay(REPLAY_SPEED_DELAY[val])
        }

        const replaySpeedKey = Object.keys(result.vars || {}).find(key => key.toUpperCase() === '!REPLAYSPEED')

        // Save nodisplay to store to reflect it in rendering
        // if !REPLAYSPEED is updated in vars
        if (replaySpeedKey) {
          store.dispatch(
            Actions.setNoDisplayInPlay(
              /^nodisplayv1$/i.test(vars.get('!REPLAYSPEED')) || /^nodisplay$/i.test(vars.get('!REPLAYSPEED'))
              )
            )
        }
      }

      // For those flow logic that set nextIndex directly in Interpreter.run method
      if (result && result.nextIndex !== undefined) {
        return Promise.all(prepares).then(() => result.nextIndex)
      }

      // For those flow logic that has to get result from bg
      // and return nextIndex in Interpreter.postRun
      return Promise.all(prepares)
      .then(() => interpreter.postRun(command, state.nextIndex, result))
      .then((data = {}) => data.nextIndex)
    }
  }, {
    preDelay: 0
  })

  player.on('BREAKPOINT', () => {
    csIpc.ask('PANEL_NOTIFY_BREAKPOINT', {})
  })

  player.on('LOOP_START', ({ loopsCursor, extra }) => {
    if (extra.isBottomFrame) {
      // Note: set 'csv read line number' to loops whenever a new loop starts
      vars.set({
        '!CsvReadLineNumber': loopsCursor,
        '!visualSearchArea':  'viewport',
        '!StatusOK': true
      }, true)
    }

    const { frameId } = extra

    // Note: reset macro timeout, and loop timer on each loop
    getMacroMonitor().restartInspector(frameId, MacroInspector.LoopTimer)
    getMacroMonitor().restartInspector(frameId, MacroInspector.Countdown)

    if (extra.isBottomFrame) {
      // Note: reset onErrorCommand on each loop
      onErrorCommand = null
    }
  })

  player.on('LOOP_RESTART', ({ currentLoop, loopsCursor }) => {
    csIpc.ask('PANEL_STOP_PLAYING', {})
    csIpc.ask('PANEL_START_PLAYING', { shouldNotActivateTab: true })
    store.dispatch(act.addLog('status', `Current loop: ${currentLoop}`))
  })

  player.on('START', ({ title, extra, loopsCursor }) => {
    log('START')

    if (store.getState().player.mode === C.PLAYER_MODE.TEST_CASE &&
      extra.isBottomFrame && !extra.isBackFromCalling) {
      xCmdCounter.reset()
      proxyCounter.reset()
    }

    store.dispatch(act.startPlaying())

    store.dispatch(act.setPlayerState({
      status: C.PLAYER_STATUS.PLAYING,
      nextCommandIndex: null
    }))

    if (!extra.isBackFromCalling) {
      store.dispatch(act.updateMacroExtra(
        getCurrentMacroId(store.getState()),
        {
          doneCommandIndices:    [],
          errorCommandIndices:   [],
          warningCommandIndices: []
        }
      ))
    }

    store.dispatch(act.addLog('status', `Playing macro ${title}`))
  })

  player.on('PREPARED', ({ extra }) => {
    if (!extra.isBackFromCalling) {
        // PREPARED event means all variables are already set
        const { frameId } = extra
        getMacroMonitor().addTarget(frameId)
      }
    })

  player.on('PAUSED', () => {
    log('PAUSED')
    store.dispatch(act.setPlayerState({
      status: C.PLAYER_STATUS.PAUSED
    }))

    store.dispatch(act.addLog('status', `Macro paused`))

      // Pause all monitors (timers, coundown)
      getMacroMonitor().pause()
    })

  player.on('RESUMED', () => {
    log('RESUMED')
    store.dispatch(act.setPlayerState({
      status: C.PLAYER_STATUS.PLAYING
    }))

    store.dispatch(act.addLog('status', `Macro resumed`))

      // Resume all monitors (timers, coundown)
      getMacroMonitor().resume()
    })

  player.on('END', (obj) => {
    log('END', obj)

    csIpc.ask('PANEL_STOP_PLAYING', {})

    store.dispatch(act.stopPlaying())

    const state = store.getState()
    const extraState = state.player.nextCommandIndex !== null ? { lastNextCommandIndex: state.player.nextCommandIndex } : {}

    store.dispatch(act.setPlayerState({
      status: C.PLAYER_STATUS.STOPPED,
      stopReason: obj.reason,
      nextCommandIndex: null,
      timeoutStatus: null,
      ...extraState
    }))

    if (vars.get('!PROXY_EXEC_COUNT') > 0 && store.getState().config.turnOffProxyAfterReplay) {
      setProxy(null)
      store.dispatch(act.addLog('info', 'Proxy reset to none'))
    }

    const tcId = obj.extra && obj.extra.id

    switch (obj.reason) {
      case player.C.END_REASON.COMPLETE:
      if (tcId) store.dispatch(act.updateMacroPlayStatus(tcId, MacroResultStatus.Success))
        message.success('Macro completed running', 1.5)
      break

      case player.C.END_REASON.ERROR:
      const stacks = getMacroCallStack().toArray();
      const len = stacks.length;

      stacks.forEach((item, i) => {
        const status = i === len - 1 ? MacroResultStatus.Error : MacroResultStatus.ErrorInSub
        store.dispatch(act.updateMacroPlayStatus(item.resource.id, status))
      });

      message.error('Macro encountered some error', 1.5)
      break
    }

    const logMsg = {
      [player.C.END_REASON.COMPLETE]: 'Macro completed',
      [player.C.END_REASON.ERROR]: 'Macro failed',
      [player.C.END_REASON.MANUAL]: 'Macro was stopped manually'
    }

    const { frameId } = obj.extra
    const ms = getMacroMonitor().getDataFromInspector(frameId, MacroInspector.Timer)

    store.dispatch(
      act.addLog(
        'info',
        logMsg[obj.reason] + ` (Runtime ${milliSecondsToStringInSecond(ms)})`
        )
      )

    getMacroMonitor().stopInspector(frameId, MacroInspector.Timer)
    getMacroMonitor().stopInspector(frameId, MacroInspector.LoopTimer)
    getMacroMonitor().stopInspector(frameId, MacroInspector.Countdown)

      // Note: show in badage the play result
      if (obj.reason === player.C.END_REASON.COMPLETE ||
        obj.reason === player.C.END_REASON.ERROR) {
        csIpc.ask('PANEL_UPDATE_BADGE', {
          type: 'play',
          blink: 5000,
          text: obj.reason === player.C.END_REASON.COMPLETE ? 'done' : 'err',
          ...(obj.reason === player.C.END_REASON.COMPLETE ? {} : { color: 'orange' })
        })
    }

    if (store.getState().player.mode !== C.PLAYER_MODE.TEST_SUITE) {
      store.dispatch(act.updateUI({ shouldEnableDesktopAutomation: undefined }))
    }

    // on player end, reset super fast mode
    // player.setSuperFastMode(false)
  })

  player.on('TO_PLAY', ({ index, currentLoop, loops, resource, extra }) => {
    // log('TO_PLAY', index, resource, 'currentLoop', currentLoop)

    store.dispatch(act.setPlayerState({
      timeoutStatus: null,
      nextCommandIndex: index,
      ...(extra.isBottomFrame ? {
        currentLoop,
        loops
      } : {})
    }))

    const triple  = [resource.cmd, resource.target, resource.value]
    const str     = ['', ...triple, ''].join(' | ')
    store.dispatch(act.addLog('reflect', `Executing: ${str}`))

      // Note: show in badage the current command index (start from 1)
      csIpc.ask('PANEL_UPDATE_BADGE', {
        type: 'play',
        text: '' + (index + 1)
      })
    })

  player.on('PLAYED_LIST', ({ indices }) => {
    // log('PLAYED_LIST', indices)

    store.dispatch(
      act.updateMacroDoneCommandsIndices(
        getCurrentMacroId(store.getState()),
        indices
        )
      )
  })

  player.on('ERROR', ({ errorIndex, msg, stack, restart }) => {
    log.error(`command index: ${errorIndex}, Error: ${msg}, Stack: ${stack}`)
    store.dispatch(act.addPlayerErrorCommandIndex(errorIndex))
    store.dispatch(act.addLog('error', msg))

      // Note: restart this player if restart is set to true in error, and it's not in test suite mode
      // Delay the execution so that 'END' event is emitted, and player is in stopped state
      if (restart && store.getState().player.mode === C.PLAYER_MODE.TEST_CASE) {
        setTimeout(() => player.replayLastConfig(), 50)
      }
    })

  player.on('DELAY', ({ total, past }) => {
    store.dispatch(act.setPlayerState({
      timeoutStatus: {
        type: 'delay',
        total,
        past
      }
    }))
  })

  return player
}

const initTestSuitPlayer = ({store, vars, tcPlayer, xCmdCounter, ocrCmdCounter, proxyCounter}) => {
  const tsTracker = new TimeTracker()
  const tcTracker = new TimeTracker()
  let state = {
    isPlaying: false,
    tsId: null,
    lastErrMsg: '',
    testCasePromiseHandlers: null,
    reports: [],
    stopReason: null

  }
  const setState = (st) => {
    state = {
      ...state,
      ...st
    }
  }
  const addReport = (report) => {
    setState({
      reports: state.reports.concat(report)
    })
  }
  const tsPlayer  = getPlayer({
    name: 'testSuite',
    prepare: () => {
      setState({
        isPlaying: true,
        reports: []
      })

      vars.set({
        '!TESTSUITE_LOOP': 1,
        '!GLOBAL_TESTSUITE_STOP_ON_ERROR': false
      }, true)
    },
    run: (testCase, playerState) => {
      const tcId    = testCase.id
      const tcLoops = testCase.loops > 1 ? parseInt(testCase.loops, 10) : 1
      const state   = store.getState()

      return getStorageManager().getMacroStorage().read(tcId, 'Text')
      .then(tc => {
        const openTc  = tc && tc.data.commands.find(c => c.cmd.toLowerCase() === 'open' || c.cmd.toLowerCase() === 'openBrowser')

        if (!tc) {
          throw new Error('macro does not exist')
        }

        // update editing && start to play tcPlayer
        store.dispatch(act.editTestCase(tc.id))
        store.dispatch(act.playerPlay({
          macroId: tc.id,
          title: tc.name,
          extra: {
            id: tc.id,
            name: tc.name,
            shouldNotActivateTab: true
          },
          mode: tcLoops === 1 ? Player.C.MODE.STRAIGHT : Player.C.MODE.LOOP,
          loopsStart: 1,
          loopsEnd: tcLoops,
          startIndex: 0,
          startUrl: openTc ? openTc.target : null,
          resources: tc.data.commands,
          postDelay: state.config.playCommandInterval * 1000,
          // Note: This logic is to make sure !CMD_VAR${n} only take effect on first macro in a test suite
          overrideScope: playerState.nextIndex !== 0 ? {} : playerState.public.scope
        }))

        return new Promise((resolve, reject) => {
          setState({
            testCasePromiseHandlers: { resolve, reject }
          })
        })
      })
    },
    handleResult: (result, testCase, state) => {
      // return undefined, so that player will play the next one
      return Promise.resolve(undefined)
    }
  }, { preDelay: 0 })

  tsPlayer.on('START', ({ title, extra }) => {
    log('START SUITE')
    tsTracker.reset()
    xCmdCounter.reset()
    proxyCounter.reset()

    setState({
      tsId: extra.id,
      isPlaying: true,
      stopReason: null
    })

    store.dispatch(act.addLog('status', `Playing test suite ${title}`))
    store.dispatch(act.setPlayerMode(C.PLAYER_MODE.TEST_SUITE))
    store.dispatch(Actions.updateTestSuite(extra.id, (ts) => {
      return {
        ...ts,
        playStatus: {
          isPlaying: true,
          currentIndex: -1,
          errorIndices: [],
          doneIndices: []
        }
      }
    }))
  })

  tsPlayer.on('LOOP_START', ({ loopsCursor }) => {
    vars.set({
      '!TESTSUITE_LOOP': loopsCursor
    }, true)
  })

  tsPlayer.on('LOOP_RESTART', ({ currentLoop }) => {
    store.dispatch(act.addLog('status', `Current test suite loop: ${currentLoop}`))
  })

  tsPlayer.on('PAUSED', ({ extra }) => {
    log('PAUSED SUITE')
    store.dispatch(act.addLog('status', `Test suite paused`))
    tcPlayer.pause()
  })

  tsPlayer.on('RESUMED', ({ extra }) => {
    log('RESUMED SUIITE')
    store.dispatch(act.addLog('status', `Test suite resumed`))
    tcPlayer.resume()
  })

  tsPlayer.on('TO_PLAY', ({ index, extra }) => {
    tcTracker.reset()

    setState({
      lastErrMsg: '',
      tcIndex: index
    })

    store.dispatch(Actions.updateTestSuite(extra.id, (ts) => {
      return {
        ...ts,
        playStatus: {
          ...ts.playStatus,
          currentIndex: index
        }
      }
    }))
  })

  tsPlayer.on('PLAYED_LIST', ({ indices, extra }) => {
    store.dispatch(Actions.updateTestSuite(extra.id, (ts) => {
      return {
        ...ts,
        playStatus: {
          ...ts.playStatus,
          doneIndices: indices
        }
      }
    }))
  })

  tsPlayer.on('END', ({ reason, extra, opts }) => {
    if (!state.isPlaying)  return

      vars.set({
        '!TESTSUITE_LOOP': 1
      }, true)

    setState({
      isPlaying: false
    })

    // Note: reset player mode to 'test case', it will only be 'test suite'
    // during replays of test suites
    store.dispatch(act.setPlayerMode(C.PLAYER_MODE.TEST_CASE))
    store.dispatch(Actions.updateTestSuite(extra.id, (ts) => {
      return {
        ...ts,
        playStatus: {
          ...ts.playStatus,
          isPlaying: false,
          currentIndex: -1
        }
      }
    }))

    store.dispatch(act.updateUI({ shouldEnableDesktopAutomation: undefined }))

    if (reason === Player.C.END_REASON.MANUAL && (!opts || !opts.tcPlayerStopped)) {
      tcPlayer.stop()
    }

    // Note: give it some time, in case we're stopping tc player above
    setTimeout(() => {
      const totalCount    = state.reports.length
      const failureCount  = state.reports.filter(r => r.stopReason === Player.C.END_REASON.ERROR).length
      const successCount  = totalCount - failureCount

      const statusMap = {
        [Player.C.END_REASON.MANUAL]: 'Manually stopped',
        [Player.C.END_REASON.COMPLETE]: 'OK',
        [Player.C.END_REASON.ERROR]: 'Error'
      }
      const tsStatus = statusMap[state.stopReason || reason]
      const lines = [
      `Test Suite name: ${extra.name}`,
      `Start Time: ${tsTracker.startTime.toString()}`,
      `Overall status: ${tsStatus}, Runtime: ${tsTracker.elapsedInSeconds()}`,
      `Macro run: ${totalCount}`,
      `Success: ${successCount}`,
      `Failure: ${failureCount}`,
      `Macro executed:`
      ]

      const render = ({ renderText }) => {
        return [
        <span>{lines.join('\n')}</span>,
        ...state.reports.map((r, i) => {
          return (
          <div>
          {r.name}&nbsp;
          ({statusMap[r.stopReason]}{r.stopReason === Player.C.END_REASON.ERROR ? ': ' : ''}
          {r.stopReason === Player.C.END_REASON.ERROR ? renderText({ type: 'error', text: r.errMsg, stack: r.stack }) : null}
          , Runtime: {r.usedTime})
          </div>
          )
        })
        ]
      }

      store.dispatch(act.addLog('report', render))
    }, 200)
  })

  // Test Case Player: we should handle cases when test case player stops automatically
  tcPlayer.on('END', ({ reason, extra }) => {
    if (store.getState().player.mode !== C.PLAYER_MODE.TEST_SUITE)  return

      const btm = getMacroCallStack().bottom()
    const callStack = getMacroCallStack().toArray()
    const storeState = store.getState()
    const nextCommandIndex = storeState.player.lastNextCommandIndex

    addReport({
      id:         btm.resource.id,
      name:       btm.resource.name,
      errMsg:     state.lastErrMsg,
      stopReason: reason,
      usedTime:   tcTracker.elapsedInSeconds(),
      stack:      callStack.map((item, i) => ({
        macroId:      item.resource.id,
        macroName:    item.resource.name,
        commandIndex: i === callStack.length - 1 ? nextCommandIndex : item.runningStatus.nextIndex,
        isSubroutine: i !== 0
      }))
    })

    // Avoid a 'stop' loop between tsPlayer and tcPlayer
    switch (reason) {
      case Player.C.END_REASON.MANUAL:
      break

      case Player.C.END_REASON.COMPLETE:
      // Note: delay the next macro run of test suite for a little bit,
      // so call stack has time to take care of itself first (like pop current frame)
      setTimeout(() => {
        state.testCasePromiseHandlers.resolve(true)
      }, 10)
      break

      case Player.C.END_REASON.ERROR:
      store.dispatch(Actions.updateTestSuite(state.tsId, (ts) => {
        return {
          ...ts,
          playStatus: {
            ...ts.playStatus,
            errorIndices: ts.playStatus.errorIndices.concat([tsPlayer.state.nextIndex])
          }
        }
      }))

      setState({
        stopReason: Player.C.END_REASON.ERROR
      })

      if (vars.get('!GLOBAL_TESTSUITE_STOP_ON_ERROR')) {
        state.testCasePromiseHandlers.reject(new Error())
        tsPlayer.stop({ tcPlayerStopped: true })
        break
      }

      // Updated on 2017-12-15, Even if there is error, test suite should move on to next macro
      // Note: tell tsPlayer not to trigger tcPlayer stop again
      // tsPlayer.stop({ tcPlayerStopped: true })
      state.testCasePromiseHandlers.resolve(true)
      break
    }
  })

  tcPlayer.on('ERROR', ({ msg, restart }) => {
    setState({
      lastErrMsg: msg
    })

    // Note: restart this player if restart is set to true in error, and it's not in test suite mode
    // Delay the execution so that 'END' event is emitted, and player is in stopped state
    //
    // Note that a couple moments after tcPlayer encounters an error and enter stopped state, it tries to set player mode
    // back to test case mode  (in tsPlayer 'END' event)
    if (restart && store.getState().player.mode === C.PLAYER_MODE.TEST_SUITE) {
      setTimeout(() => tsPlayer.replayLastConfig(), 50)
    }
  })

  return tsPlayer
}
