import * as act from '@/actions'
import { Actions } from '@/actions/simple_actions'
import { aiPromptGetPromptAndImageArrayBuffers, getFileBufferFromScreenshotStorage } from '@/common/ai_vision'
import { CaptureScreenshotService } from '@/common/capture_screenshot'
import clipboard from '@/common/clipboard'
import { parseImageTarget } from '@/common/command'
import * as C from '@/common/constant'
import { ComputerVisionType, isCVTypeForDesktop } from '@/common/cv_utils'
import { getPixel, isFirefox, isLocator, scaleRect, subImage } from '@/common/dom_utils'
import { decryptIfNeeded } from '@/common/encrypt'
import { evaluateScript } from '@/common/eval'
import csIpc from '@/common/ipc/ipc_cs'
import FileSaver from '@/common/lib/file_saver'
import log from '@/common/log'
import { renderLog } from '@/common/macro_log'
import { getPlayer } from '@/common/player'
import { activateTab } from '@/common/tab_utils'
import {
  compose,
  flatten,
  id,
  isMac,
  milliSecondsToStringInSecond,
  parseBoolLike,
  safeUpdateIn,
  strictParseBoolLike,
  withCountDown
} from '@/common/ts_utils'
import {
  and,
  cloneSerializableLocalStorage,
  dataURItoBlob,
  delay,
  ensureExtName,
  getPageDpi,
  isSidePanelWindowAsync,
  loadImage,
  objMap,
  retry,
  setIn,
  splitIntoTwo,
  updateIn
} from '@/common/utils'
import { getVarsInstance } from '@/common/variables'
import Ext from '@/common/web_extension'
import { prompt } from '@/components/prompt'
import config from '@/config'
import { DesktopScreenshot } from '@/desktop_screenshot_editor/types'
import { getState, updateState } from '@/ext/common/global_state'
import { getPlayTab, getPlayTabIpc } from '@/ext/common/tab'
import { runCommandInPlayTab } from '@/ext/popup/run_command'
import { clearTimerForTimeoutStatus, startSendingTimeoutStatus } from '@/ext/popup/timeout_counter'
import { findMacroNodeWithCaseInsensitiveRelativePath } from '@/recomputed'
import { getScreenshotInSearchArea, saveDataUrlToLastDesktopScreenshot, saveDataUrlToLastScreenshot, searchVision } from '@/search_vision'
import AnthropicService from '@/services/ai/anthropic/anthropic.service'
// import { runComputerUseService } from '@/services/ai/computer_use/computer_use.service'
import { getNativeCVAPI } from '@/services/desktop'
import { getNativeFileSystemAPI } from '@/services/filesystem'
import { MacroResultStatus } from '@/services/kv_data/macro_extra_data'
import { allWordsWithPosition, ocrMatchCenter, runDownloadLog, scaleOcrTextSearchMatch, searchTextInOCRResponse } from '@/services/ocr'
import { convertOcrLanguageToTesseractLanguage, OCRLanguage } from '@/services/ocr/languages'
import { OcrHighlightType } from '@/services/ocr/types'
import { getMacroCallStack } from '@/services/player/call_stack/call_stack'
import { MacroStatus } from '@/services/player/macro'
import { getMacroMonitor } from '@/services/player/monitor/macro_monitor'
import { MacroInspector } from '@/services/player/monitor/types'
import { parseProxyUrl, setProxy } from '@/services/proxy'
import { ProxyScheme } from '@/services/proxy/types'
import { getStorageManager } from '@/services/storage'
import { getXUserIO } from '@/services/xmodules/x_user_io'
import { getXFile } from '@/services/xmodules/xfile'
import { getXLocal } from '@/services/xmodules/xlocal'
import { getNativeXYAPI, MouseButton, MouseEventType } from '@/services/xy'
import { InterpreterInstance, PlayerInstance } from '@/init_player'
import { getOcrResponse, guardOcrSettings } from '@/modules/ocr'
import { store } from '@/redux'
import { xCmdCounter } from './counters'
import {
  hideDownloadBar,
  withVisualHighlightHidden,
  getSidePanelWidth,
  replaceEscapedChar,
  captureImage,
  captureScreenShot
} from './helper'
import { ComputerUseService } from '@/services/ai/computer_use/service'

const captureScreenshotService = new CaptureScreenshotService({
  captureVisibleTab: (windowId, options) => csIpc.ask('PANEL_CAPTURE_VISIBLE_TAB', { windowId, options })
})

export const askBackgroundToRunCommand = async ({
  command,
  state,
  store,
  vars,
  preRun
}: {
  command: any
  state: any
  store: any
  vars: any
  preRun?: any
}) => {
  console.log('askBackgroundToRunCommand command :>> ', command)
  // ** commands are by default superfast except it has any !REPLAYSPEED command in lower index that has v1 as suffix like: fastv1
  const superFast = /^(nodisplay|fast|medium|slow)$/i.test(vars.get('!REPLAYSPEED')) ? true : false

  // const vars_ = getVarsInstance().dump()
  // console.log('vars_ :>> ', vars_)

  const firstOnDownloadIndex = state.resources.findIndex((command: any) => command.cmd === 'onDownload')
  let hasOnDownloadCmd = false
  if (firstOnDownloadIndex !== -1) {
    const nextIndex = state.nextIndex
    if (firstOnDownloadIndex < nextIndex) {
      hasOnDownloadCmd = true
    }
  }

  const useClipboard = /!clipboard/i.test(command.target + ';' + command.value)
  const prepare: Promise<{
    useClipboard: boolean
    clipboard?: string
  }> = !useClipboard ? Promise.resolve({ useClipboard: false }) : Promise.resolve({ useClipboard: true, clipboard: clipboard.get() })

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
      vars.set(
        {
          '!LOOP': state.loopsCursor
        },
        true
      )
    }

    vars.set(
      {
        '!RUNTIME': milliSecondsToStringInSecond(
          getMacroMonitor().getDataFromInspector(getMacroCallStack().bottom().id, MacroInspector.LoopTimer)
        )
      },
      true
    )

    if (command.cmd === 'open' || command.cmd === 'openBrowser') {
      // const indexR = vars.get('!CURRENT_TAB_NUMBER_RELATIVE') + 1;
      // vars.set({ '!CURRENT_TAB_NUMBER_RELATIVE': indexR}, true)
      command = { ...command, href: state.startUrl }
    }

    // Note: translate shorthand '#efp'
    if (command.target && /^#efp$/i.test(command.target.trim())) {
      // eslint-disable-next-line no-template-curly-in-string
      command.target = '#elementfrompoint (${!imageX}, ${!imageY})'
    }

    const isRelatedToExecuteScript =
      [
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
      ;['target', 'value'].forEach((field) => {
        if (command[field] === undefined) return

        const oldEval =
          (command.cmd === 'storeEval' && field === 'target') ||
          (command.cmd === 'gotoIfxxx' && field === 'target') ||
          (command.cmd === 'ifxxx' && field === 'target') ||
          (command.cmd === 'whilexxx' && field === 'target')
        const opts: any = oldEval ? { withHashNotation: true } : {}

        opts.shouldStringify = oldEval || isRelatedToExecuteScript

        command = {
          ...command,
          [field]: vars.render(
            replaceEscapedChar(
              ['type'].includes(command.cmd) ? command[field] : command[field].trim(),
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
    command = updateIn(
      ['extra'],
      (extra) => ({
        ...(extra || {}),
        timeoutPageLoad: vars.get('!TIMEOUT_PAGELOAD'),
        timeoutElement: vars.get('!TIMEOUT_WAIT'),
        timeoutDownload: vars.get('!TIMEOUT_DOWNLOAD'),
        timeoutDownloadStart: vars.get('!TIMEOUT_DOWNLOAD_START') || Math.max(10, vars.get('!TIMEOUT_WAIT')),
        lastCommandOk: vars.get('!LASTCOMMANDOK'),
        errorIgnore: !!vars.get('!ERRORIGNORE'),
        waitForVisible: !!vars.get('!WAITFORVISIBLE'),
        superFast: superFast,
        hasOnDownloadCmd: hasOnDownloadCmd
      }),
      command
    )

    return preRun(command, state, (command: any) => {
      const runCommandInPlayTab_result = runCommandInPlayTab(command)
      console.log('runCommandInPlayTab_result:>> ', runCommandInPlayTab_result)
      return runCommandInPlayTab_result
    })
  })
}

const runXMouseKeyboardCommand = (command: any) => {
  const { cmd, target, value, extra } = command
  console.log('#220 runXMouseKeyboardCommand command:>> ', command)
  const isDesktop_ = command.spExtra?.isDesktop

  const vars = getVarsInstance()

  const isDesktopMode = isDesktop_ !== undefined ? isDesktop_ : isCVTypeForDesktop(vars.get('!CVSCOPE'))

  console.log('#220 runXMouseKeyboardCommand isDesktopMode:>> ', isDesktopMode)

  switch (cmd) {
    case 'XType': {
      return getXUserIO()
        .sanityCheck()
        .then(() => {
          if (xCmdCounter.get() === 1) {
            return hideDownloadBar()
          }
        })
        .then(() => delay(() => {}, 300))
        .then(() => decryptIfNeeded(target))
        .then((text) => {
          return getNativeXYAPI()
            .sendText({ text })
            .then((success) => {
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

      return getXUserIO()
        .sanityCheck()
        .then(() => {
          if (xCmdCounter.get() === 1) {
            return hideDownloadBar()
          }
        })
        .then(() => {
          return getNativeXYAPI()
            .sendMouseWheelEvent({
              deltaX,
              deltaY: 0,
              deltaZ: 0
            })
            .then((success) => {
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
      const parseTarget = (target = '', cmd: any) => {
        let trimmedTarget = target.trim()

        const relativeCommands = ['XMoveTextRelative', 'XClickTextRelative']
        const regexForTarget = /^.*#R.*,.*$/
        if (relativeCommands.includes(cmd) && !regexForTarget.test(trimmedTarget)) {
          throw new Error(`Error E310: Relative coordinates missing. Format should be: word#R(X),(Y)`)
        }

        // const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'))
        console.log('#220: parseTarget isDesktopMode:>> ', isDesktopMode)

        updateState(setIn(['curent_cmd'], cmd))
        localStorage.setItem('curent_cmd', cmd)

        if (/^ocr=/i.test(trimmedTarget)) {
          guardOcrSettings({ store })

          return {
            type: 'ocr',
            value: { query: trimmedTarget.substr(4) }
          }
        }

        if (cmd === 'XMoveText') {
          guardOcrSettings({ store })

          return {
            type: 'ocrTextXmove',
            value: { query: trimmedTarget }
          }
        }
        if (cmd === 'XMoveTextRelative') {
          //  setIn(['caliber_trget'], trimmedTarget)
          updateState(setIn(['caliber_trget'], trimmedTarget))
          updateState(setIn(['curent_cmd'], cmd))
          localStorage.setItem('curent_cmd', cmd)
          localStorage.setItem('caliber_trget', trimmedTarget)
          localStorage.setItem('isDesktopMode', JSON.stringify(isDesktopMode))
          guardOcrSettings({ store })
          return {
            type: 'ocrTextXmoveRelative',
            value: { query: trimmedTarget }
          }
        }

        if (cmd === 'XClickText' && !/^text=/i.test(trimmedTarget)) {
          guardOcrSettings({ store })
          3
          return {
            type: 'ocrText',
            value: { query: trimmedTarget }
          }
        }

        if (cmd === 'XClickTextRelative' && /#R/i.test(trimmedTarget)) {
          if (checkIfNumberFound(trimmedTarget)) {
            throw new Error('Wrong input ' + trimmedTarget)
          }
          updateState(setIn(['caliber_trget'], trimmedTarget))
          updateState(setIn(['curent_cmd'], cmd))
          localStorage.setItem('curent_cmd', cmd)
          localStorage.setItem('caliber_trget', trimmedTarget)
          localStorage.setItem('isDesktopMode', JSON.stringify(isDesktopMode))
          guardOcrSettings({ store })
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
        const parts = str.split('#')
        for (let i = 0; i < parts.length; i++) {
          if (/\d/.test(parts[i])) {
            return false
          }
        }
        return true
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
      const parseValue = {
        XClick: parseValueForXClick,
        XClickText: parseValueForXClick,
        XClickRelative: parseValueForXClick,
        XClickTextRelative: parseValueForXClick,
        OCRExtractbyTextRelative: parseValueForXClick,
        XMove: parseValueForXMove,
        XMoveText: parseValueForXMove,
        XMoveTextRelative: parseValueForXMove,
        XMoveRelative: parseValueForXMove
      }[cmd]

      let isRelative = /relative/i.test(cmd) && !/XClickText/i.test(cmd)
      if (
        (/relative/i.test(cmd) && cmd === 'OCRExtractbyTextRelative') ||
        (/relative/i.test(cmd) && cmd === 'XMoveTextRelative') ||
        (/relative/i.test(cmd) && cmd === 'visionLimitSearchAreabyTextRelative')
      ) {
        isRelative = false
      }

      return getXUserIO()
        .sanityCheck()
        .then(() => {
          if (xCmdCounter.get() === 1) {
            return hideDownloadBar()
          }
        })
        .then(() => {
          const realTarget = parseTarget(target, cmd)
          const realValue = parseValue(value)

          const pNativeXYParams = (() => {
            if (isRelative && realTarget.type !== 'visual_search') {
              throw new Error(`E319: ${cmd} only accepts a vision image as target`)
            }

            log('realTarget:>> ', realTarget)

            const runCommandForLocator = (command: any) => {
              console.log('runCommandForLocator command :>> ', command)
              const vars = getVarsInstance()
              return askBackgroundToRunCommand({
                vars,
                store,
                command,
                state: PlayerInstance.getInstance().getState(),
                preRun: (command: any, state: any, askBgToRun: any) => askBgToRun(command)
              })
            }

            switch (realTarget.type) {
              case 'locator': {
                return runCommandForLocator({
                  ...command,
                  cmd: 'locate',
                  target: realTarget.value.locator,
                  value: ''
                })
                  .then((result) => {
                    const { rect } = result
                    if (!rect) throw new Error('E320: no rect data returned')

                    const x = rect.x + rect.width / 2
                    const y = rect.y + rect.height / 2

                    if (isNaN(x)) throw new Error('empty x')
                    if (isNaN(y)) throw new Error('empty y')

                    return {
                      type: 'viewport',
                      offset: { x, y }
                    }
                  })
                  .then(getSidePanelWidth)
                  .then(([sidePanelWidth, result]) => {
                    result.offset.x = result.offset.x + sidePanelWidth
                    return result
                  })
              }

              case 'visual_search': {
                return runCsFreeCommands(
                  {
                    ...command,
                    cmd: 'visualAssert',
                    target: realTarget.value.query,
                    value: '',
                    extra: {
                      ...(command.extra || {}),
                      // Note: `relativeVisual` is used in bg.js, for call of `visualAssert` that doesn't specify relativeVisual,
                      // it still uses file name postfix "_relative" to tell whether it's relative (green/pink boxes) or not
                      relativeVisual: isRelative
                    }
                  },
                  undefined,
                  command
                )
                  .then((result) => {
                    const { best } = result
                    if (!best) throw new Error('E321: no best found from result of verifyAssert triggered by XClick')

                    const isForDesktop = isCVTypeForDesktop(vars.get('!CVSCOPE'))
                    const x = best.viewportLeft + best.width / 2
                    const y = best.viewportTop + best.height / 2

                    if (isNaN(x)) throw new Error('empty x')
                    if (isNaN(y)) throw new Error('empty y')

                    return {
                      type: isForDesktop ? 'desktop' : 'viewport',
                      offset: { x, y },
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
                    return prev
                  })
              }

              case 'ocr': {
                return runCsFreeCommands({
                  ...command,
                  cmd: 'OCRSearch',
                  target: realTarget.value.query,
                  value: '__ocrResult__'
                }).then((result) => {
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
                return csIpc
                  .ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
                  .catch(() => {})
                  .then(() => delay(() => {}, 1000))
                  .then(() => {
                    return Promise.all([
                      runCsFreeCommands({
                        ...command,
                        cmd: 'OCRSearch',
                        target: realTarget.value.query,
                        mode_type: 'local',
                        value: '__ocrResult__'
                      }),
                      isCVTypeForDesktop(vars.get('!CVSCOPE')) ? getNativeXYAPI().getScalingFactor() : Promise.resolve(1)
                    ])
                  })
                  .then(([result, scalingFactor]) => {
                    const { best } = result
                    if (!best) throw new Error(`E323: no match found for '${target}'`)

                    let xC = result.best.words[0].word.Left
                    let yC = result.best.words[0].word.Top
                    let HeightR = result.best.words[0].word.Height
                    let WidthR = result.best.words[0].word.Width

                    function getCoordinates(str) {
                      var regex = /TL(-?\d+),(-?\d+)BR(-?\d+),(-?\d+)/
                      var matches = str.match(regex)

                      var x1 = parseInt(matches[1])
                      var y1 = parseInt(matches[2])
                      var x2 = parseInt(matches[3])
                      var y2 = parseInt(matches[4])

                      return [x1, y1, x2, y2]
                    }

                    const cal_tragte = localStorage.getItem('caliber_trget') ? localStorage.getItem('caliber_trget') : ''
                    const caliberTick = cal_tragte
                    const countCalObj = getCoordinates(caliberTick)

                    const rectTop = yC + countCalObj[1]
                    const rectLeft = xC + countCalObj[0]
                    const rectWidth = countCalObj[2] - countCalObj[0]
                    const rectHeight = countCalObj[3] - countCalObj[1]

                    const lang = vars.get('!ocrLanguage').toLowerCase()
                    const engine = vars.get('!ocrEngine')
                    const scale = vars.get('!ocrScale')
                    const isTable = vars.get('!ocrTableExtraction')
                    const ocrApiTimeout = config.ocr.apiTimeout
                    const isRelative = /relative/i.test(cmd)

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
                          x: rectLeft / scalingFactor,
                          y: rectTop / scalingFactor,
                          width: rectWidth / scalingFactor,
                          height: rectHeight / scalingFactor
                        },
                        isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE'))
                      }).then(({ response, offset, viewportOffset }) => {
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

                        return {
                          byPass: true,
                          vars: {
                            [value]: response.ParsedResults && response.ParsedResults[0] ? response.ParsedResults[0].ParsedText : ''
                          }
                        }
                      })
                    })
                  })
              }

              case 'ocrTextXmoveRelative': {
                let isRelative = /relative/i.test(cmd) && !/XMoveText/i.test(cmd)
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
                        value: '__ocrResult__'
                      }),
                      isCVTypeForDesktop(vars.get('!CVSCOPE')) ? getNativeXYAPI().getScalingFactor() : Promise.resolve(1)
                    ])
                  })
                  .then(([result, scalingFactor]) => {
                    const isDesk = isCVTypeForDesktop(vars.get('!CVSCOPE'))
                    if (extra && extra.debugVisual && isDesk) {
                      return {
                        byPass: true,
                        vars: {
                          [value]: ''
                        }
                      }
                    }

                    const { best } = result
                    if (!best) throw new Error(`E311: No OCR text match found for '${target}'`)

                    let rect = {
                      x: result.best.words[0].word.Left,
                      y: result.best.words[0].word.Top,
                      height: result.best.words[0].word.Height,
                      width: result.best.words[0].word.Width
                    }

                    let getTickCounter = (str) => {
                      function getNumberSet(num, type) {
                        if (parseInt(num) > 0 && type == 'X') {
                          return ['>', parseInt(num)]
                        } else if (parseInt(num) < 0 && type == 'X') {
                          return ['<', parseInt(num.replace('-', ''))]
                        } else if (parseInt(num) > 0 && type == 'Y') {
                          return ['^', parseInt(num)]
                        } else {
                          return ['v', parseInt(num.replace('-', ''))]
                        }
                      }

                      function getAllNumbersWithSign(str) {
                        const matches = str.match(/-?\d+/g)
                        if (matches) {
                          return matches
                        }
                        return null
                      }

                      if (str.indexOf('#R') !== -1) {
                        // ABC #R-6,3
                        const parts = str.split('#R')
                        const nums = getAllNumbersWithSign(parts[1])
                        const [x1, y1] = getNumberSet(nums[0], 'X')
                        let [x2, y2] = getNumberSet(nums[1], 'Y') // 3
                        let valueObj = {}
                        valueObj[x1] = y1
                        valueObj[x2] = y2
                        return valueObj
                      }
                    }

                    let ocrCalibration = store.getState().config.ocrCalibration_internal
                      ? store.getState().config.ocrCalibration_internal
                      : 6
                    // const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'))
                    if (!isDesktopMode) {
                      ocrCalibration = 7
                    }

                    const caliberTick = command.target
                    const countCalObj = getTickCounter(caliberTick) as any
                    for (var x in countCalObj) {
                      if (x == 'v') {
                        rect['y'] = rect['y'] + ocrCalibration * countCalObj[x] // down (add in y offset)
                      }
                      if (x == '>') {
                        rect['x'] = rect['x'] + ocrCalibration * countCalObj[x] // right (add in x offset)
                      }
                      if (x == '<') {
                        rect['x'] = rect['x'] - ocrCalibration * countCalObj[x] // left (minus in x offset)
                      }
                      if (x == '^') {
                        rect['y'] = rect['y'] - ocrCalibration * countCalObj[x] // up (minus in y offset)
                      }
                    }

                    let isDesktop = isCVTypeForDesktop(vars.get('!CVSCOPE'))
                    // return csIpc.ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
                    // .catch(() => {})
                    // .then(() => delay(() => {}, 1000))
                    return delay(() => {}, 10).then(() => {
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
                let isRelative = /relative/i.test(cmd) && !/XMoveText/i.test(cmd)
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
                        value: '__ocrResult__'
                      }),
                      isCVTypeForDesktop(vars.get('!CVSCOPE')) ? getNativeXYAPI().getScalingFactor() : Promise.resolve(1)
                    ])
                  })
                  .then(([result, scalingFactor]) => {
                    const isDesk = isCVTypeForDesktop(vars.get('!CVSCOPE'))

                    if (extra && extra.debugVisual && isDesk) {
                      return {
                        byPass: true,
                        vars: {
                          [value]: ''
                        }
                      }
                    }

                    const { best } = result
                    if (!best) throw new Error(`E311: No OCR text match found for '${target}'`)

                    let rect = {
                      x: result.best.words[0].word.Left,
                      y: result.best.words[0].word.Top,
                      height: result.best.words[0].word.Height,
                      width: result.best.words[0].word.Width
                    }

                    let isDesktop = isCVTypeForDesktop(vars.get('!CVSCOPE'))

                    // return csIpc
                    //   .ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
                    //   .catch(() => {})
                    //   .then(() => delay(() => {}, 1000))

                    return delay(() => {}, 10).then(() => {
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

              case 'ocrText': {
                return runCsFreeCommands({
                  ...command,
                  cmd: 'OCRSearch',
                  target: realTarget.value.query,
                  mode_type: 'local',
                  value: '__ocrResult__'
                })
                  .then((result) => {
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
                    return prev
                  })
              }

              case 'desktop_coordinates': {
                const { coordinates } = realTarget.value

                if (extra && extra.debugVisual) {
                  console.log('desktop_coordinates debugVisual extra:>>', extra)

                  const useLatestScreenShot = !!command.spExtra?.useLatestScreenShot

                  return (
                    !useLatestScreenShot
                      ? captureImage({
                          isDesktop: true,
                          storedImageRect: null,
                          // searchArea: /\.png/i.test(searchArea) ? 'rect' : searchArea,
                          scaleDpi: true,
                          devicePixelRatio: window.devicePixelRatio
                        }).then(() => delay(() => {}, 500))
                      : Promise.resolve()
                  ).then(() => {
                    const imageInfo = {
                      source: DesktopScreenshot.ImageSource.Storage,
                      path: ensureExtName('.png', C.LAST_DESKTOP_SCREENSHOT_FILE_NAME)
                    }

                    const x = parseInt(coordinates[0], 10)
                    const y = parseInt(coordinates[1], 10)

                    return csIpc
                      .ask('PANEL_HIGHLIGHT_DESKTOP_X', {
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
                        return {
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
                    return result
                  })
              }
            }
          })()

          return pNativeXYParams.then(({ type, offset, originalResult = {} }) => {
            console.log('pNativeXYParams:>> isDesktopMode:', isDesktopMode)
            // Note: should not bring play tab to front if it's in desktop mode
            const prepare = isDesktopMode //isCVTypeForDesktop(vars.get('!CVSCOPE'))
              ? Promise.resolve()
              : runCsFreeCommands({ cmd: 'bringBrowserToForeground' })

            return prepare
              .then(() => delay(() => {}, 300))
              .then(() => {
                const api = getNativeXYAPI()
                const [button, eventType] = (() => {
                  switch (realValue) {
                    case '#left':
                      return [MouseButton.Left, MouseEventType.Click]
                    case '#middle':
                      return [MouseButton.Middle, MouseEventType.Click]
                    case '#right':
                      return [MouseButton.Right, MouseEventType.Click]
                    case '#doubleclick':
                      return [MouseButton.Left, MouseEventType.DoubleClick]
                    case '#tripleclick':
                      return [MouseButton.Left, MouseEventType.TripleClick]
                    case '#shiftclick':
                      return [MouseButton.Left, MouseEventType.ShiftClick]
                    case '#ctrlclick':
                      return [MouseButton.Left, MouseEventType.CtrlClick]
                    case '#move':
                      return [MouseButton.Left, MouseEventType.Move]
                    case '#up':
                      return [MouseButton.Left, MouseEventType.Up]
                    case '#down':
                      return [MouseButton.Left, MouseEventType.Down]
                    default:
                      throw new Error(`:E324: Unsupported realValue: ${realValue}`)
                  }
                })()

                var event = {
                  button,
                  x: Math.round(offset.x), // test avoid 65.5 etc
                  y: Math.round(offset.y),
                  type: eventType
                }

                // check command is TextRelative and calculate by caliber
                if (command.cmd == 'XClickTextRelative') {
                  let getTickCounter = (str) => {
                    function getNumberSet(num, type) {
                      if (parseInt(num) > 0 && type == 'X') {
                        return ['>', parseInt(num)]
                      } else if (parseInt(num) < 0 && type == 'X') {
                        return ['<', parseInt(num.replace('-', ''))]
                      } else if (parseInt(num) > 0 && type == 'Y') {
                        return ['^', parseInt(num)]
                      } else {
                        return ['v', parseInt(num.replace('-', ''))]
                      }
                    }

                    function getAllNumbersWithSign(str) {
                      const matches = str.match(/-?\d+/g)
                      if (matches) {
                        return matches
                      }
                      return null
                    }

                    if (str.indexOf('#R') !== -1) {
                      // ABC #R-6,3
                      const parts = str.split('#R')
                      const nums = getAllNumbersWithSign(parts[1])
                      const [x1, y1] = getNumberSet(nums[0], 'X')
                      let [x2, y2] = getNumberSet(nums[1], 'Y') // 3
                      let valueObj = {}
                      valueObj[x1] = y1
                      valueObj[x2] = y2
                      return valueObj
                    }

                    // return str.split('').reduce((total, letter) => {
                    //   total[letter] ? total[letter]++ : total[letter] = 1;
                    //   return total;
                    // }, {});
                  }

                  let ocrCalibration = store.getState().config.ocrCalibration_internal ? store.getState().config.ocrCalibration_internal : 6
                  // const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'))
                  if (!isDesktopMode) {
                    ocrCalibration = 7
                  }
                  // const caliberTick = command.target.split('#R')[1]; //old methode target
                  const caliberTick = command.target
                  const countCalObj = getTickCounter(caliberTick)
                  for (var x in countCalObj) {
                    if (x == 'v') {
                      event['y'] = event['y'] + ocrCalibration * countCalObj[x] // down (add in y offset)
                    }
                    if (x == '>') {
                      event['x'] = event['x'] + ocrCalibration * countCalObj[x] // right (add in x offset)
                    }
                    if (x == '<') {
                      event['x'] = event['x'] - ocrCalibration * countCalObj[x] // left (minus in x offset)
                    }
                    if (x == '^') {
                      event['y'] = event['y'] - ocrCalibration * countCalObj[x] // up (minus in y offset)
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
                const pSendMouseEvent =
                  type === 'desktop'
                    ? api.sendMouseEvent(event)
                    : api.sendViewportMouseEvent(event, {
                        getViewportRectInScreen: () => {
                          return csIpc.ask('PANEL_GET_VIEWPORT_RECT_IN_SCREEN')
                        }
                      })

                store.dispatch(Actions.setOcrInDesktopMode(false))

                return pSendMouseEvent.then((success) => {
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

    default:
      break
  }
}

const runCommand = (command: any, index?: any, parentCommand?: any) => {
  const { cmd, target: target_, value, extra } = command
  const target = target_ as string
  const vars = getVarsInstance()
  const csvStorage = getStorageManager().getCSVStorage()
  const ssStorage = getStorageManager().getScreenshotStorage()
  const getTcPlayer = () => PlayerInstance.getInstance()
  const playerState = getTcPlayer().getState()

  const result = {
    isFlowLogic: true
  }
  const macroStorage = getStorageManager().getMacroStorage()
  const path = macroStorage.getPathLib()

  const resolvePath = (subpath: any) => {
    subpath = subpath.replace(/\\/g, '/')

    if (subpath.indexOf('/') === 0) {
      return path.normalize(subpath).replace(/^(\/|\\)/, '')
    } else {
      const curMacroRelativePath = getStorageManager().getMacroStorage().relativePath(playerState.extra.macroId)
      const curMacroDirPath = path.dirname(curMacroRelativePath)

      return path.join(curMacroDirPath, subpath)
    }
  }

  switch (cmd) {
    case 'repeatIf':
    case 'elseif':
    case 'if_v2':
    case 'while_v2':
    case 'gotoIf_v2':
    case 'if':
    case 'while':
    case 'gotoIf': {
      log(`Executing ${cmd}: ${target}`)

      return evaluateScript(target).then(
        (result: any) => {
          return {
            condition: result,
            byPass: true
          }
        },
        (e: any) => {
          throw new Error(`Error in condition of ${cmd}: ${e.message}`)
        }
      )
    }

    case 'times': {
      const interpreter = InterpreterInstance.getInstance() // getInterpreter()
      const timesKey = interpreter.getKeyForTimes(index)
      const cursor = 1 + (interpreter.getExtraByKey(timesKey) || 0)
      const max = parseInt(target, 10)

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
        byPass: true
      }
    }

    case 'forEach': {
      const interpreter = InterpreterInstance.getInstance() // getInterpreter()
      const forEachKey = `forEach_${index}`
      let tagHasBreak = interpreter.hasBreak(index)
      if (tagHasBreak) {
        interpreter.removeBreak(index)
      }

      const current = interpreter.getExtraByKey(forEachKey)
      const cursor = tagHasBreak ? 0 : 1 + (current === undefined ? -1 : current)
      const list = vars.get(target)

      if (!Array.isArray(list)) {
        throw new Error('target must be an array')
      }

      const len = list.length
      const shouldContinue = cursor < len
      const varsToSet = shouldContinue ? { [value]: list[cursor] } : null

      vars.set(
        {
          '!FOREACH': cursor
        },
        true
      )

      if (!shouldContinue) {
        interpreter.removeExtraByKey(forEachKey)
      } else {
        interpreter.setExtraByKey(forEachKey, cursor)
      }

      return {
        vars: varsToSet,
        condition: shouldContinue,
        byPass: true
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
        .then((result: any) => {
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
        .catch((e: any) => {
          throw new Error(`Error in executeScript_Sandbox code: ${e.message}`)
        })
    }

    case 'setProxy': {
      const p = (() => {
        if (/direct/i.test(target && target.trim())) {
          return setProxy(null).then(() => store.dispatch(act.addLog('info', 'Proxy reset to none')))
        }

        const [proxyUrl, auth] = (() => {
          if (/default/i.test(target && target.trim())) {
            return [store.getState().config.defaultProxy, store.getState().config.defaultProxyAuth]
          }
          return [target, value]
        })()

        const proxy = parseProxyUrl(proxyUrl, auth)
        const isSocks = proxy.type === ProxyScheme.Socks4 || proxy.type === ProxyScheme.Socks5
        const hasAuth = !!proxy.username

        if (isSocks && hasAuth && !isFirefox()) {
          store.dispatch(act.addLog('warning', `Browser doesn't support authentication on socks proxy`))
        }

        return setProxy(proxy).then(() => {
          vars.set(
            {
              '!PROXY_EXEC_COUNT': 1 + (vars.get('!PROXY_EXEC_COUNT') || 0)
            },
            true
          )

          store.dispatch(act.addLog('info', 'Proxy set to ' + proxyUrl))
        })
      })()

      return p.then(() => ({ byPass: true }))
    }

    case 'run': {
      const state = store.getState()
      const macroRelativePath = resolvePath(target)
      const macroNode = findMacroNodeWithCaseInsensitiveRelativePath(state, macroRelativePath)
      const macroStorage = getStorageManager().getMacroStorage()

      return macroStorage.read((macroNode && macroNode.fullPath) || macroRelativePath, 'Text').then((macro: any) => {
        const openCmd: any = macro.data.commands.find(
          (command: any) => command.cmd.toLowerCase() === 'open' || command.cmd.toLowerCase() === 'openBrowser'
        )
        const playerState = (act as any).commonPlayerState(
          store.getState(),
          {
            extra: {
              id: macro.id
            },
            mode: getPlayer().C.MODE.STRAIGHT,
            startIndex: 0,
            startUrl: openCmd ? openCmd.target : null,
            resources: macro.data.commands,
            postDelay: state.config.playCommandInterval * 1000,
            isStep: getPlayer().getState().isStep,
            loopsCursor: 1,
            loopsStart: 1,
            loopsEnd: 1
          },
          macro.id,
          macro.name
        )

        return delay(() => {}, 10)
          .then(() =>
            getMacroCallStack().call(macro, {
              playerState,
              status: MacroStatus.Running,
              nextIndex: 0,
              commandResults: []
            })
          )
          .then(() => {
            store.dispatch(act.updateMacroPlayStatus(macro.id, MacroResultStatus.Success))

            return {
              byPass: true
            }
          })
      })
    }

    case 'store': {
      let target_ = target
      const tessLang: OCRLanguage = target.toLowerCase() as OCRLanguage

      // if value == '!ocrlanguage' and engine == 98 (tesseract)
      // then transform the target (eg. ger) to tesseract language code (deu)
      if (value == '!ocrlanguage') {
        let engine_ = store.getState().config.ocrEngine
        if (engine_ == 98) {
          target_ = convertOcrLanguageToTesseractLanguage(tessLang)
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
      return isSidePanelWindowAsync(window)
        .then((isSidePanel) => {
          if (!isSidePanel) {
            return csIpc.ask('PANEL_BRING_PANEL_TO_FOREGROUND')
          }
        })
        .then(() => prompt({ message, value: defaultAnswer || '' }))
        .then((text) => ({
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

          store.dispatch(
            act.setTimeoutStatus({
              past,
              total,
              type: 'pause'
            })
          )
        }
      }).then(() => ({ byPass: true }))
    }

    case 'localStorageExport': {
      const deleteAfterExport = /\s*#DeleteAfterExport\s*/i.test(value)

      if (/^\path=/i.test(target)) {
        getXLocal()
          .getVersionLocal()
          .then((data) => {
            const { installed } = data
            const text = store.getState().logs.map(renderLog).join('\n')
            const ua = window.navigator.userAgent
            const path = target.split('path=')[1]

            function os() {
              if (/windows/i.test(ua)) return 'windows'
              if (/mac/i.test(ua)) return 'mac'
              return 'linux'
            }

            if (installed) {
              let osType = os()
              runDownloadLog(text, path, osType).then((data) => {
                log(data)
              })
            } else {
              const text = store.getState().logs.map(renderLog).join('\n')
              FileSaver.saveAs(new Blob([text]), 'uivision_log.txt')

              if (deleteAfterExport) {
                store.dispatch((act as any).clearLogs())
              }
            }
          })
        return result
      }

      if (/^\s*log\s*$/i.test(target)) {
        const text = store.getState().logs.map(renderLog).join('\n')
        FileSaver.saveAs(new Blob([text]), 'uivision_log.txt')

        if (deleteAfterExport) {
          store.dispatch((act as any).clearLogs())
        }
        return result
      }

      if (/\.csv$/i.test(target)) {
        return csvStorage.exists(target).then((existed) => {
          if (!existed) throw new Error(`${target} doesn't exist`)

          return csvStorage.read(target, 'Text').then((text) => {
            FileSaver.saveAs(new Blob([text]), target)

            if (deleteAfterExport) {
              csvStorage.remove(target).then(() => store.dispatch(act.listCSV()))
            }

            return result
          })
        })
      }

      if (/\.png$/i.test(target)) {
        return ssStorage.exists(target).then((existed) => {
          if (!existed) throw new Error(`${target} doesn't exist`)

          return ssStorage.read(target, 'ArrayBuffer').then((buffer) => {
            FileSaver.saveAs(new Blob([new Uint8Array(buffer as ArrayBuffer)]), target)

            if (deleteAfterExport) {
              ssStorage.remove(target).then(() => store.dispatch(act.listScreenshots()))
            }

            return result
          })
        })
      }

      throw new Error(`${target} doesn't exist`)
    }

    case 'OCRSearch': {
      guardOcrSettings({ store })

      if (!value || !value.length) {
        throw new Error('value is required')
      }
      const curent_cmd = localStorage.curent_cmd
      const lang = vars.get('!ocrLanguage').toLowerCase()
      const engine = vars.get('!ocrEngine') || store.getState().config.ocrEngine
      const scale = vars.get('!ocrScale')
      const isTable = vars.get('!ocrTableExtraction')
      const timeout = vars.get('!TIMEOUT_WAIT') * 1000
      const searchArea = vars.get('!visualSearchArea') || 'viewport'
      const storedImageRect = vars.get('!storedImageRect')
      const ocrApiTimeout = config.ocr.apiTimeout
      const [str, index, hasPos] = (() => {
        let match = target.match(/^(.+)@POS=(\d+)$/i)
        if (!match) return [target, 0, false]
        return [match[1], parseInt(match[2]) - 1, true]
      })()
      const isLog = command.mode_type != undefined && command.mode_type == 'local' ? 'NA' : true
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
          isLog: isLog
        }).then(async ({ response, offset, viewportOffset }: any) => {
          console.log('getOcrResponse response :>> ', response)

          // const state = await getState()
          const viewportBasedParseResults = safeUpdateIn(
            ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
            (word: any) => ({
              ...word,
              Top: word.Top + viewportOffset.y,
              Left: word.Left + viewportOffset.x
            }),
            response.ParsedResults
          )
          const documentBasedParseResults = safeUpdateIn(
            ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
            (word: any) => ({
              ...word,
              Top: word.Top + offset.y,
              Left: word.Left + offset.x
            }),
            response.ParsedResults
          )
          const searchResult = searchTextInOCRResponse({
            text: str,
            index: index,
            exhaust: true,
            parsedResults: viewportBasedParseResults
          })
          const { hit, all } = searchResult

          console.log('searchResult :>> ', searchResult)
          console.log('command :>> ', command)

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
              vars.set(
                {
                  '!ocrx': center.x,
                  '!ocry': center.y,
                  '!ocrwidth': center.width,
                  '!ocrheight': center.height,
                  '!ocr_left_x': center.x - center.width / 2,
                  '!ocr_right_x': center.x + center.width / 2
                },
                true
              )

              return {
                [value]: hasPos ? 1 : all.length,
                '!ocrx': center.x,
                '!ocry': center.y,
                '!ocrwidth': center.width,
                '!ocrheight': center.height,
                '!ocr_left_x': center.x - center.width / 2,
                '!ocr_right_x': center.x + center.width / 2
              }
            }
          })()

          const textHasWildcard = str.includes('*') || str.includes('?')

          const ocrMatches = [
            // All words identified by OCR into one group
            {
              similarity: 1,
              highlight: OcrHighlightType.Identified,
              words: allWordsWithPosition(
                documentBasedParseResults,
                flatten(all.map((item: any) => item.words.map((word: any) => word.position)))
              )
            },
            // All matched and one top matched
            ...compose(
              all[index]
                ? setIn([index, 'highlight'], textHasWildcard ? OcrHighlightType.WildcardTopMatched : OcrHighlightType.TopMatched)
                : (x: any) => x,
              setIn(['[]', 'highlight'], textHasWildcard ? OcrHighlightType.WildcardMatched : OcrHighlightType.Matched),
              updateIn(['[]', 'words', '[]', 'word'], (word: any) => ({
                ...word,
                Top: word.Top + offset.y - viewportOffset.y,
                Left: word.Left + offset.x + viewportOffset.x
              }))
            )(all)
          ]

          if (
            extra &&
            extra.debugVisual &&
            curent_cmd != 'OCRExtractbyTextRelative' &&
            curent_cmd != 'visionLimitSearchAreabyTextRelative'
          ) {
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
            localStorage.setItem('ocrMatches_preview', JSON.stringify(ocrMatches))
          }

          const pScaleFactor = isCVTypeForDesktop(vars.get('!CVSCOPE')) ? getNativeXYAPI().getScalingFactor() : Promise.resolve(1)

          // Note: In desktop mode, `!ocrx`, `!ocry` and `best` should be desktop coordinates
          return pScaleFactor.then((factor) => {
            return compose(
              newVars['!ocrx'] === undefined ? id : safeUpdateIn(['vars', '!ocrx'], (n: any) => n * factor),
              newVars['!ocry'] === undefined ? id : safeUpdateIn(['vars', '!ocry'], (n: any) => n * factor),
              safeUpdateIn(['best'], (match: any) => (match && match.similarity ? scaleOcrTextSearchMatch(match, factor) : null))
            )({
              vars: newVars,
              byPass: true,
              best: hit
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

        return runWithRetry().catch((e) => {
          // Note: extra.throwError === true, when "Find" button is used
          if (cmd === 'OCRSearch' || (extra && extra.throwError)) {
            throw e
          }

          return {
            byPass: true,
            ...(isNotVerifyOrAssert && value && value.length
              ? {
                  vars: {
                    [value]: 0
                  }
                }
              : {}),
            ...(cmd === 'visualVerify'
              ? {
                  log: {
                    error: e.message
                  }
                }
              : {})
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

      return aiPromptGetPromptAndImageArrayBuffers(target)
        .then(({ prompt, mainImageBuffer, searchImageBuffer }) => {
          let anthropicAPIKey = store.getState().config.anthropicAPIKey
          console.log('anthropicAPIKey :>> ', anthropicAPIKey)

          const anthropicService = new AnthropicService(anthropicAPIKey)
          const promptText = prompt

          store.dispatch(act.addLog('info', 'Calling Anthropic API'))
          const start = Date.now()

          // return anthropicService?.readTextInImage(imageBuffer).then((response) => {
          return anthropicService
            ?.aiPromptProcessImage(mainImageBuffer, searchImageBuffer, promptText)
            .then(({ coords, isSinglePoint, aiResponse }) => {
              const end = Date.now()
              const time = (end - start) / 1000
              const timeStr = time.toFixed(2)
              store.dispatch(act.addLog('info', `Result received (${timeStr}s): Answer is: ${aiResponse}`))

              // found the target
              const newVars = (() => {
                vars.set(
                  {
                    [value]: aiResponse
                  },
                  true
                )
                return {
                  [value]: aiResponse
                }
              })()

              console.log('newVars:>> ', newVars)
              console.log(`newVars['!ai1'] === undefined: ${newVars['!ai1'] === undefined}`)

              return compose()({
                vars: newVars,
                byPass: true
              })
            })
            .catch((error) => {
              throw new Error(error.message)
            })
        })
        .catch((error) => {
          throw new Error(error.message)
        })
    }

    case 'aiComputerUse': {
      console.log('aiComputerUse...')

      if (!target || !target.length) {
        throw new Error('target is required')
      }

      const isDesktop = isCVTypeForDesktop(vars.get('!CVSCOPE'))
      console.log('#220 isDesktop:>> ', isDesktop)
      const captureScreenShotFunction = () => {
        return captureScreenShot({
          vars,
          isDesktop
        })
      }

      const computerUseService = new ComputerUseService({
        runCsFreeCommands: runCsFreeCommands,
        value: null,
        captureScreenShotFunction,
        isDesktop
      })

      return computerUseService.run(target, value, vars)
    }

    case 'aiScreenXY': {
      console.log('aiScreenXY...')

      if (!target || !target.length) {
        throw new Error('target is required')
      }

      const isDesktop = isCVTypeForDesktop(vars.get('!CVSCOPE'))
      const storedImageRect = vars.get('!storedImageRect')
      const searchArea = vars.get('!visualSearchArea') || 'viewport'

      return (
        (isDesktop ? Promise.resolve() : csIpc.ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE'))
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

            return getFileBufferFromScreenshotStorage(screenshotFileName)
              .then((imageBuffer) => {
                let anthropicAPIKey = store.getState().config.anthropicAPIKey
                console.log('anthropicAPIKey :>> ', anthropicAPIKey)

                const anthropicService = new AnthropicService(anthropicAPIKey)
                const promptText = target

                store.dispatch(act.addLog('info', 'Calling Anthropic API'))
                const start = Date.now()

                // TODO: refactoring code required in regard to scaleFactor / macScaleFactor / window.devicePixelRatio
                return anthropicService
                  ?.aiScreenXYProcessImage(imageBuffer, promptText)
                  .then(({ coords, aiResponse }) => {
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
                          '!ai2': ai2
                        },
                        true
                      )
                      return {
                        [value]: aiResponse,
                        '!ai1': ai1,
                        '!ai2': ai2
                      }
                    })()

                    console.log('newVars:>> ', newVars)
                    console.log(`newVars['!ai1'] === undefined: ${newVars['!ai1'] === undefined}`)

                    if (extra && extra.debugVisual) {
                      if (isDesktop) {
                        console.log('debugVisual extra:>>', extra)

                        captureImage({
                          isDesktop: true,
                          storedImageRect: null,
                          scaleDpi: true,
                          devicePixelRatio: window.devicePixelRatio
                        })
                          .then(() => delay(() => {}, 1000))
                          .then(() => {
                            const imageInfo = {
                              source: DesktopScreenshot.ImageSource.Storage,
                              path: ensureExtName('.png', C.LAST_DESKTOP_SCREENSHOT_FILE_NAME)
                            }

                            const x = ai1
                            const y = ai2

                            return csIpc
                              .ask('PANEL_HIGHLIGHT_DESKTOP_X', {
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
                                return {
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

                    if (isDesktop) {
                      newVars = (() => {
                        vars.set(
                          {
                            [value]: aiResponse,
                            '!ai1': ai1ForDesktop,
                            '!ai2': ai2ForDesktop
                          },
                          true
                        )
                        return {
                          [value]: aiResponse,
                          '!ai1': ai1ForDesktop,
                          '!ai2': ai2ForDesktop
                        }
                      })()
                    }

                    return compose(
                      //#224
                      ...(isDesktop
                        ? [
                            newVars['!ai1'] === undefined ? id : safeUpdateIn(['vars', '!ai1'], (n) => ai1ForDesktop),
                            newVars['!ai2'] === undefined ? id : safeUpdateIn(['vars', '!ai2'], (n) => ai2ForDesktop)
                          ]
                        : [
                            newVars['!ai1'] === undefined ? id : safeUpdateIn(['vars', '!ai1'], (n) => ai1),
                            newVars['!ai2'] === undefined ? id : safeUpdateIn(['vars', '!ai2'], (n) => ai2)
                          ])
                    )({
                      vars: newVars,
                      byPass: true
                    })
                  })
                  .catch((error) => {
                    throw new Error(error.message)
                  })
              })
              .catch((error) => {
                throw new Error(error.message)
              })
          })
          .catch((error) => {
            throw new Error(error.message)
          })
      )
    }

    case 'OCRExtractScreenshot':
      guardOcrSettings({ store })

      if (!value || !value.length) {
        throw new Error('value is required')
      }

      const lang = vars.get('!ocrLanguage').toLowerCase()
      const engine = vars.get('!ocrEngine')
      const scale = vars.get('!ocrScale')
      const ocrApiTimeout = config.ocr.apiTimeout

      let ssImageName = /\.(png)$/i.test(target) ? target : null
      console.log('ssImageName :>> ', ssImageName)

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
              .then((dataUrl) => {
                throw new Error(`E505: OCRExtractScreenshot uses images from the Screenshot tab as input`)
              })
          })
          .then((dataUrl) => {
            return dataUrl
          })
          .then((imageDataUrl) => {
            console.log('imageDataUrl :>> ', imageDataUrl)
            if (imageDataUrl) {
              return getOcrResponse({
                store,
                lang,
                scale,
                engine,
                ocrApiTimeout,
                imageDataUrl
              }).then(({ response }) => {
                return {
                  byPass: true,
                  vars: {
                    [value]: response.ParsedResults && response.ParsedResults[0] ? response.ParsedResults[0].ParsedText : ''
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
      guardOcrSettings({ store })

      if (!value || !value.length) {
        throw new Error('value is required')
      }

      const lang = vars.get('!ocrLanguage').toLowerCase()
      const engine = vars.get('!ocrEngine')
      const scale = vars.get('!ocrScale')
      const isTable = vars.get('!ocrTableExtraction')
      const ocrApiTimeout = config.ocr.apiTimeout
      const isRelative = /relative/i.test(cmd)

      const ocrExtractFromBrowserPage = () => {
        return csIpc
          .ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
          .catch(() => {})
          .then(() => delay(() => {}, 1000))
          .then(() => {
            return Promise.all([
              runCsFreeCommands({
                ...command,
                cmd: 'visualAssert',
                target: target,
                value: '',
                extra: {
                  ...(command.extra || {}),
                  // Note: `relativeVisual` is used in bg.js, for call of `visualAssert` that doesn't specify relativeVisual,
                  // it still uses file name postfix "_relative" to tell whether it's relative (green/pink boxes) or not
                  relativeVisual: isRelative,
                  debugVisual: false
                }
              }),
              isCVTypeForDesktop(vars.get('!CVSCOPE')) ? getNativeXYAPI().getScalingFactor() : Promise.resolve(1)
            ])
          })
          .then(([result, scalingFactor]) => {
            const { best } = result
            if (!best) throw new Error(`E311: No OCR text match found for '${target}'`)

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
                  x: best.viewportLeft / scalingFactor,
                  y: best.viewportTop / scalingFactor,
                  width: best.width / scalingFactor,
                  height: best.height / scalingFactor
                },
                isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE'))
              }).then(({ response, offset, viewportOffset }) => {
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
                    [value]: response.ParsedResults && response.ParsedResults[0] ? response.ParsedResults[0].ParsedText : ''
                  }
                }
              })
            })
          })
      }

      return ocrExtractFromBrowserPage()
    }
    case 'OCRExtractbyTextRelative': {
      guardOcrSettings({ store })

      const lang = vars.get('!ocrLanguage').toLowerCase()
      const engine = vars.get('!ocrEngine')
      const scale = vars.get('!ocrScale')
      const isTable = vars.get('!ocrTableExtraction')
      const ocrApiTimeout = config.ocr.apiTimeout
      const isRelative = /relative/i.test(cmd)
      let trimmedTarget = target.trim()
      const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'))
      updateState(setIn(['caliber_trget'], trimmedTarget))
      updateState(setIn(['curent_cmd'], cmd))
      localStorage.setItem('curent_cmd', cmd)
      localStorage.setItem('caliber_trget', trimmedTarget)
      localStorage.setItem('isDesktopMode', isDesktopMode)
      const defaultWh = 'W30H10'

      const regexForTarget = /^.*#R.*,.*$/

      if (!regexForTarget.test(trimmedTarget)) {
        throw new Error('Wrong input ' + trimmedTarget)
      }

      if (trimmedTarget.indexOf('W') === -1 && trimmedTarget.indexOf('H') === -1) {
        trimmedTarget = trimmedTarget + defaultWh
      }

      if (trimmedTarget.indexOf('#R') == -1 || trimmedTarget.includes(' ') || trimmedTarget.includes('X')) {
        throw new Error('Wrong input ' + trimmedTarget)
      }
      if (trimmedTarget.indexOf('W') === -1 || trimmedTarget.indexOf('H') === -1) {
        throw new Error('Wrong input ' + trimmedTarget)
      }

      var indexW = trimmedTarget.indexOf('W')
      var indexH = trimmedTarget.indexOf('H')

      if (indexW !== -1 && indexH !== -1 && indexW < indexH) {
        log("'W' appears first in the string")
      } else {
        // Note: reason for this changes is we are using regex accordingly in getCoordinates function for commands.
        // Extract the values of 'W' and 'H' from the string
        let wValue = trimmedTarget.match(/W(\d+)/)[1]
        let hValue = trimmedTarget.match(/H(\d+)/)[1]

        trimmedTarget = trimmedTarget.replace(/W(\d+)/, `H${hValue}`)

        trimmedTarget = trimmedTarget.replace(/H(\d+)/, `W${wValue}`)

        localStorage.setItem('caliber_trget', trimmedTarget)
      }

      return csIpc
        .ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
        .catch(() => {})
        .then(() => delay(() => {}, 1000))
        .then(() => {
          return Promise.all([
            runCsFreeCommands({
              ...command,
              cmd: 'OCRSearch',
              target: trimmedTarget.split('#')[0],
              value: '__ocrResult__'
            }),
            isCVTypeForDesktop(vars.get('!CVSCOPE')) ? getNativeXYAPI().getScalingFactor() : Promise.resolve(1)
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
          if (!best) throw new Error(`E311: No OCR text match found for '${target}'`)

          let xC = result.best.words[0].word.Left
          let yC = result.best.words[0].word.Top
          let HeightR = result.best.words[0].word.Height
          let WidthR = result.best.words[0].word.Width

          let yD = 0
          let xD = 0

          function getCoordinates(str) {
            // var regex = /TL(-?\d+),(-?\d+)BR(-?\d+),(-?\d+)/;
            var regex = /R(-?\d+),(-?\d+)W(-?\d+)H(-?\d+)/
            var matches = str.match(regex)

            var x = parseInt(matches[1])
            var y = parseInt(matches[2])
            var W = parseInt(matches[3])
            var H = parseInt(matches[4])

            return [x, y, W, H]
          }

          const cal_tragte = localStorage.getItem('caliber_trget') ? localStorage.getItem('caliber_trget') : ''
          let caliberTick = cal_tragte

          if (caliberTick.indexOf('W') == -1 || caliberTick.indexOf('H') == -1) {
            caliberTick = caliberTick + 'W30H10'
          }

          function getTickCounter(str) {
            function getNumberSet(num, type) {
              if (parseInt(num) > 0 && type == 'X') {
                return ['>', parseInt(num)]
              } else if (parseInt(num) < 0 && type == 'X') {
                return ['<', parseInt(String(num).replace('-', ''))]
              } else if (parseInt(num) > 0 && type == 'Y') {
                return ['^', parseInt(num)]
              } else {
                return ['v', parseInt(String(num).replace('-', ''))]
              }
            }

            const nums = getCoordinates(str)
            const [x1, y1] = getNumberSet(nums[0], 'X')
            let [x2, y2] = getNumberSet(nums[1], 'Y')
            let valueObj = {}
            valueObj[x1] = y1
            valueObj[x2] = y2
            return valueObj
          }

          const countCalObj = getTickCounter(caliberTick)

          // let ocrCalibration = !!localStorage.getItem('ocrCalibration') ? localStorage.getItem('ocrCalibration') : 7;
          // const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'));
          // if(isDesktopMode == "false"){
          //   ocrCalibration = 7;
          // }

          let ocrCalibration = store.getState().config.ocrCalibration_internal ? store.getState().config.ocrCalibration_internal : 6
          const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'))
          if (!isDesktopMode) {
            ocrCalibration = 7
          }

          for (var x in countCalObj) {
            if (x === 'v' || x === 'v') {
              yD += yC + ocrCalibration * countCalObj[x] // down (add in y offset)
            }
            if (x === '>') {
              xD += xC + ocrCalibration * countCalObj[x] // right (add in x offset)
            }
            if (x === '<') {
              xD += xC - ocrCalibration * countCalObj[x] // left (minus in x offset)
            }
            if (x === '^') {
              yD += yC - ocrCalibration * countCalObj[x] // up (minus in y offset)
            }
          }

          const all_nums = getCoordinates(caliberTick)
          const rectTop = yD
          const rectLeft = xD
          const rectWidth = ocrCalibration * all_nums[2]
          const rectHeight = ocrCalibration * all_nums[3]

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
                x: rectLeft / scalingFactor,
                y: rectTop / scalingFactor,
                width: rectWidth / scalingFactor,
                height: rectHeight / scalingFactor
              },
              isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE'))
            }).then(({ response, offset, viewportOffset }) => {
              const documentBasedParseResults = safeUpdateIn(
                ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
                (word) => ({
                  ...word,
                  Top: word.Top + offset.y,
                  Left: word.Left + offset.x
                }),
                response.ParsedResults
              )

              let ocrMatches = [
                // All words identified by OCR into one group
                {
                  similarity: 1,
                  highlight: OcrHighlightType.Matched,
                  words: allWordsWithPosition(documentBasedParseResults, [])
                }
              ]
              // Note: This code is now needed for preview window for command OCRExtractbyTextRelative.
              if (extra && extra.debugVisual) {
                // show overlay on website
                let ocrMatches_preview = localStorage.getItem('ocrMatches_preview')
                ocrMatches = ocrMatches_preview ? JSON.parse(ocrMatches_preview) : ocrMatches
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
                  [value]: response.ParsedResults && response.ParsedResults[0] ? response.ParsedResults[0].ParsedText : ''
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
          .then((existed) => {
            if (!existed)
              throw new Error(`Error #120: ${(parentCommand?.cmd || cmd) + ':' || ''}: No input image found for file name '${fileName}'`)
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
        fileName: visionFileName,
        confidence: minSimilarity = store.getState().config.defaultVisionSearchConfidence,
        index: rawIndex
      } = imageTarget

      const resultIndex = typeof rawIndex !== 'number' || isNaN(rawIndex) ? 0 : rawIndex
      const isNotVerifyOrAssert = ['visualVerify', 'visualAssert'].indexOf(cmd) === -1
      const searchArea = vars.get('!visualSearchArea')
      const timeout = vars.get('!TIMEOUT_WAIT') * 1000
      const cvScope = vars.get('!CVSCOPE')

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

        return getBlob()
          .then((blob) => {
            return getStorageManager().getVisionStorage().write(visionFileName, blob)
          })
          .then(() => {
            store.dispatch(act.listVisions())
          })
      }

      const run = () => {
        const prepare = isCVTypeForDesktop(cvScope) ? Promise.resolve() : csIpc.ask('PANEL_CLEAR_VISION_RECTS_ON_PLAYING_PAGE')

        return prepare
          .then(saveImageFirstIfNeeded)
          .then(() =>
            searchVision({
              visionFileName,
              minSimilarity,
              searchArea,
              cvScope,
              command,
              captureScreenshotService,
              devicePixelRatio: window.devicePixelRatio,
              storedImageRect: vars.get('!storedImageRect')
            })
          )
          .then(({ regions, imageInfo }) => {
            log('regions', regions, imageInfo)

            const notFound = regions.length === 0
            const outOfRange = regions.length <= resultIndex

            if (notFound || outOfRange) {
              // Reset image related vars to 0 if not found
              vars.set(
                {
                  '!imageX': 0,
                  '!imageY': 0,
                  '!imageWidth': 0,
                  '!imageHeight': 0
                },
                true
              )

              if (notFound) {
                throw new Error(`Image '${visionFileName}' (conf. = ${minSimilarity}) not found`)
              }

              if (outOfRange) {
                throw new Error(
                  `Found ${regions.length} ${regions.length > 1 ? 'matches' : 'match'}, but you are looking for #${resultIndex + 1}`
                )
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
                const vSign = Math.sign(a.matched.offsetTop - b.matched.offsetTop)
                const hSign = Math.sign(a.matched.offsetLeft - b.matched.offsetLeft)

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
                  scoredRects: regions.map((r) => ({
                    ...r.matched,
                    left: r.matched.pageLeft,
                    top: r.matched.pageTop
                  }))
                })
              }
            } else if (extra && extra.debugVisual) {
              console.log('extra:>>', extra)
              const convert = (rect, index, type) => {
                if (!rect) return null

                return {
                  type,
                  index,
                  x: rect.viewportLeft,
                  y: rect.viewportTop,
                  width: rect.width,
                  height: rect.height,
                  score: rect.score
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
                        i === resultIndex ? DesktopScreenshot.RectType.ReferenceOfBestMatch : DesktopScreenshot.RectType.Reference
                      ),
                      convert(r.matched, i, i === resultIndex ? DesktopScreenshot.RectType.BestMatch : DesktopScreenshot.RectType.Match)
                    ].filter((x) => x)
                  })
                )
              })
            }

            const pScaleFactor = isCVTypeForDesktop(cvScope) ? getNativeXYAPI().getScalingFactor() : Promise.resolve(1)

            // Note: Make sure `best`, `!imageX` and `!imageY` are all desktop coordinates (for later use in XClick)
            // While in PANEL_HIGHLIGHT_DESKTOP_RECTS, it uses css coordinates
            const top = best.viewportTop
            const left = best.viewportLeft

            return pScaleFactor
              .then((factor) => ({
                byPass: true,
                vars: {
                  '!imageX': Math.round(factor * (left + best.width / 2)),
                  '!imageY': Math.round(factor * (top + best.height / 2)),
                  '!imageWidth': Math.round(factor * best.width),
                  '!imageHeight': Math.round(factor * best.height),
                  ...(isNotVerifyOrAssert && value && value.length ? { [value]: regions.length } : {})
                },
                best: objMap((n) => n * factor, best)
              }))
              .then((res) => delay(() => res, 100))
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

      return verifyPatternImage(visionFileName, cmd).then(() => {
        return runWithRetry().catch((e) => {
          // Note: extra.throwError === true, when "Find" button is used
          if (cmd === 'visualAssert' || (extra && extra.throwError)) {
            throw e
          }

          return {
            byPass: true,
            ...(isNotVerifyOrAssert && value && value.length
              ? {
                  vars: {
                    [value]: 0
                  }
                }
              : {}),
            ...(cmd === 'visualVerify'
              ? {
                  log: {
                    error: e.message
                  }
                }
              : {})
          }
        })
      })
    }

    case 'visionLimitSearchArea':
    case 'visionLimitSearchAreaRelative': {
      const isRelative = /relative/i.test(cmd)
      let area = target.trim()
      let p = Promise.resolve({ byPass: true })

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
            return getNativeXYAPI()
              .getScalingFactor()
              .then((factor) => {
                return {
                  x: rect.x / factor,
                  y: rect.y / factor,
                  width: rect.width / factor,
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
        const coordinates = area
          .replace(/^area=/i, '')
          .split(/\s*,\s*/g)
          .map((str) => parseFloat(str.trim()))

        const isValid = coordinates.length === 4 && and(...coordinates.map((n) => typeof n === 'number' && !isNaN(n)))

        if (!isValid) {
          throw new Error('area should be in format of "area=x1,y1,x2,y2"')
        }

        const rect = {
          x: coordinates[0],
          y: coordinates[1],
          width: coordinates[2] - coordinates[0],
          height: coordinates[3] - coordinates[1]
        }

        vars.set({ '!visualSearchArea': 'rect' }, true)

        return scale(rect).then((finalRect) => {
          return setImageRectVarAndTakeScreenshot({
            isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE')),
            searchArea: 'rect',
            rect: finalRect
          }).then(() => ({ byPass: true }))
        })
      }

      if (/\.png/.test(area)) {
        return runCsFreeCommands({
          ...command,
          cmd: 'visualAssert',
          target: area,
          value: '',
          extra: {
            ...(command.extra || {}),
            // Note: `relativeVisual` is used in bg.js, for call of `visualAssert` that doesn't specify relativeVisual,
            // it still uses file name postfix "_relative" to tell whether it's relative (green/pink boxes) or not
            relativeVisual: isRelative
          }
        }).then((result) => {
          const { best } = result
          if (!best) throw new Error(`No match found for ${area} in screenshot`)

          vars.set({ '!visualSearchArea': area }, true)

          return scale({
            // Note: In desktop mode, coordinates returned by `visualXXX` is already desktop mouse coordinates
            // must convert it back to css coordinates (for later use in image cropping or preview highlight)
            x: best.offsetLeft,
            y: best.offsetTop,
            width: best.width,
            height: best.height
          })
            .then((rect) => {
              return setImageRectVarAndTakeScreenshot({
                rect,
                searchArea: area,
                isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE'))
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

            return csIpc.ask('PANEL_CLEAR_VISION_RECTS_ON_PLAYING_PAGE').then(() => {
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
      guardOcrSettings({ store })

      const lang = vars.get('!ocrLanguage').toLowerCase()
      const engine = vars.get('!ocrEngine')
      const scale = vars.get('!ocrScale')
      const isTable = vars.get('!ocrTableExtraction')
      const ocrApiTimeout = config.ocr.apiTimeout
      const isRelative = /relative/i.test(cmd)
      let trimmedTarget = target.trim()
      const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'))
      updateState(setIn(['caliber_trget'], trimmedTarget))
      updateState(setIn(['curent_cmd'], cmd))
      localStorage.setItem('curent_cmd', cmd)
      localStorage.setItem('caliber_trget', trimmedTarget)
      localStorage.setItem('isDesktopMode', isDesktopMode)
      const defaultWh = 'W30H10'

      const regexForTarget = /^.*#R.*,.*$/

      if (!regexForTarget.test(trimmedTarget)) {
        throw new Error(`Error E310: Relative coordinates missing. Format should be: word#R(X),(Y)`)
      }

      if (trimmedTarget.indexOf('W') === -1 && trimmedTarget.indexOf('H') === -1) {
        trimmedTarget = trimmedTarget + defaultWh
      }

      if (trimmedTarget.indexOf('#R') == -1 || trimmedTarget.includes(' ') || trimmedTarget.includes('X')) {
        throw new Error('Wrong input ' + trimmedTarget)
      }
      if (trimmedTarget.indexOf('W') === -1 || trimmedTarget.indexOf('H') === -1) {
        throw new Error('Wrong input ' + trimmedTarget)
      }

      var indexW = trimmedTarget.indexOf('W')
      var indexH = trimmedTarget.indexOf('H')

      if (indexW !== -1 && indexH !== -1 && indexW < indexH) {
        log("'W' appears first in the string")
      } else {
        // Note: reason for this changes is we are using regex accordingly in getCoordinates function for commands.
        // Extract the values of 'W' and 'H' from the string
        let wValue = trimmedTarget.match(/W(\d+)/)[1]
        let hValue = trimmedTarget.match(/H(\d+)/)[1]

        trimmedTarget = trimmedTarget.replace(/W(\d+)/, `H${hValue}`)

        trimmedTarget = trimmedTarget.replace(/H(\d+)/, `W${wValue}`)

        localStorage.setItem('caliber_trget', trimmedTarget)
      }

      return csIpc
        .ask('PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE')
        .catch(() => {})
        .then(() => delay(() => {}, 1000))
        .then(() => {
          return Promise.all([
            runCsFreeCommands({
              ...command,
              cmd: 'OCRSearch',
              target: trimmedTarget.split('#')[0],
              value: '__ocrResult__'
            }),
            isCVTypeForDesktop(vars.get('!CVSCOPE')) ? getNativeXYAPI().getScalingFactor() : Promise.resolve(1)
          ])
        })
        .then(([result, scalingFactor]) => {
          store.dispatch(Actions.setOcrInDesktopMode(false))

          const { best } = result
          if (!best) throw new Error(`E311: No OCR text match found for '${target}'`)

          let xC = result.best.words[0].word.Left
          let yC = result.best.words[0].word.Top
          let HeightR = result.best.words[0].word.Height
          let WidthR = result.best.words[0].word.Width

          let yD = 0
          let xD = 0

          function getCoordinates(str) {
            // var regex = /TL(-?\d+),(-?\d+)BR(-?\d+),(-?\d+)/;
            var regex = /R(-?\d+),(-?\d+)W(-?\d+)H(-?\d+)/
            var matches = str.match(regex)

            var x = parseInt(matches[1])
            var y = parseInt(matches[2])
            var W = parseInt(matches[3])
            var H = parseInt(matches[4])

            return [x, y, W, H]
          }

          const cal_tragte = localStorage.getItem('caliber_trget') ? localStorage.getItem('caliber_trget') : ''
          let caliberTick = cal_tragte

          if (caliberTick.indexOf('W') == -1 || caliberTick.indexOf('H') == -1) {
            caliberTick = caliberTick + 'W30H10'
          }

          function getTickCounter(str) {
            function getNumberSet(num, type) {
              if (parseInt(num) > 0 && type == 'X') {
                return ['>', parseInt(num)]
              } else if (parseInt(num) < 0 && type == 'X') {
                return ['<', parseInt(String(num).replace('-', ''))]
              } else if (parseInt(num) > 0 && type == 'Y') {
                return ['^', parseInt(num)]
              } else {
                return ['v', parseInt(String(num).replace('-', ''))]
              }
            }

            const nums = getCoordinates(str)
            const [x1, y1] = getNumberSet(nums[0], 'X')
            let [x2, y2] = getNumberSet(nums[1], 'Y')
            let valueObj = {}
            valueObj[x1] = y1
            valueObj[x2] = y2
            return valueObj
          }

          const countCalObj = getTickCounter(caliberTick)

          // let ocrCalibration = !!localStorage.getItem('ocrCalibration') ? localStorage.getItem('ocrCalibration') : 7;
          // const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'));
          // if(isDesktopMode == "false"){
          //   ocrCalibration = 7;
          // }

          let ocrCalibration = store.getState().config.ocrCalibration_internal ? store.getState().config.ocrCalibration_internal : 6
          const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'))
          if (!isDesktopMode) {
            ocrCalibration = 7
          }

          for (var x in countCalObj) {
            if (x === 'v' || x === 'v') {
              yD += yC + ocrCalibration * countCalObj[x] // down (add in y offset)
            }
            if (x === '>') {
              xD += xC + ocrCalibration * countCalObj[x] // right (add in x offset)
            }
            if (x === '<') {
              xD += xC - ocrCalibration * countCalObj[x] // left (minus in x offset)
            }
            if (x === '^') {
              yD += yC - ocrCalibration * countCalObj[x] // up (minus in y offset)
            }
          }

          const all_nums = getCoordinates(caliberTick)
          const rectTop = yD
          const rectLeft = xD
          const rectWidth = ocrCalibration * all_nums[2]
          const rectHeight = ocrCalibration * all_nums[3]

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
                x: rectLeft / scalingFactor,
                y: rectTop / scalingFactor,
                width: rectWidth / scalingFactor,
                height: rectHeight / scalingFactor
              },
              isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE'))
            }).then(({ response, offset, viewportOffset }) => {
              const documentBasedParseResults = safeUpdateIn(
                ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
                (word) => ({
                  ...word,
                  Top: word.Top + offset.y,
                  Left: word.Left + offset.x
                }),
                response.ParsedResults
              )

              let ocrMatches = [
                // All words identified by OCR into one group
                {
                  similarity: 1,
                  highlight: OcrHighlightType.Matched,
                  words: allWordsWithPosition(documentBasedParseResults, [])
                }
              ]

              // Note: This code is now needed for preview window for command OCRExtractbyTextRelative.
              if (extra && extra.debugVisual) {
                // show overlay on website
                let ocrMatches_preview = localStorage.getItem('ocrMatches_preview')
                ocrMatches = ocrMatches_preview ? JSON.parse(ocrMatches_preview) : ocrMatches
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
                isDesktop: isCVTypeForDesktop(vars.get('!CVSCOPE')),
                searchArea: 'rect',
                rect: targetRect
              }).then(() => ({ byPass: true }))
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
      const rectSize = 16
      const type = vars.get('!CVSCOPE')
      const getScreenshot = (state) => {
        switch (type) {
          case 'browser': {
            const toPlayTabId = state.tabIds.toPlay

            return (
              activateTab(toPlayTabId, true)
                .then(() => delay(() => {}, C.SCREENSHOT_DELAY))
                // Set scale factor to 1 / devicePixelRatio, so that the screenshot is in css pixel.
                .then(() => captureScreenshotService.captureScreen(toPlayTabId, devicePixelRatio, isFirefox() ? 1 : 1 / devicePixelRatio))
                .then((dataUrl) => {
                  saveDataUrlToLastScreenshot(dataUrl)
                  return dataUrl
                })
            )
          }

          case 'desktop': {
            const cvApi = getNativeCVAPI()

            // On the other hand, desktop screenshot is in device pixel
            return cvApi
              .captureDesktop({ path: undefined })
              .then((hardDrivePath) => cvApi.readFileAsDataURL(hardDrivePath, true))
              .then((dataUrl) => {
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
        .then((dataUrl) => {
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
                  path: ensureExtName('.png', C.LAST_DESKTOP_SCREENSHOT_FILE_NAME)
                },
                screenAvailableSize: {
                  width: screen.availWidth,
                  height: screen.availHeight
                },
                selectedIndex: 0,
                scoredRects: [
                  {
                    x: scale * (y - rectSize / 2),
                    y: scale * (x - rectSize / 2),
                    width: scale * rectSize,
                    height: scale * rectSize,
                    text: colorHex,
                    type: DesktopScreenshot.RectType.BestMatch
                  }
                ]
              })
            }
          } else {
            csIpc.ask('PANEL_SCREENSHOT_PAGE_INFO').then((pageInfo: any) => {
              csIpc.ask('PANEL_HIGHLIGHT_RECT', {
                rect: {
                  top: pageInfo.originalY + y - rectSize / 2,
                  left: pageInfo.originalX + x - rectSize / 2,
                  width: rectSize,
                  height: rectSize,
                  text: colorHex
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

      return getXFile()
        .sanityCheck()
        .then(() =>
          getNativeFileSystemAPI().runProcess({
            fileName,
            waitForExit,
            arguments: args
          })
        )
        .then((result) => {
          if (cmd === 'XRunAndWait') {
            vars.set(
              {
                '!XRUN_EXITCODE': result.exitCode
              },
              true
            )

            store.dispatch(act.addLog('info', `App close detected, Exit code=${result.exitCode}`))
          }

          return { byPass: true }
        })
    }

    case 'XDesktopAutomation': {
      const shouldEnableDesktopAutomation = parseBoolLike(target, false)

      store.dispatch(act.updateUI({ shouldEnableDesktopAutomation }))
      vars.set(
        {
          '!CVSCOPE': shouldEnableDesktopAutomation ? 'desktop' : 'browser'
        },
        true
      )

      return Promise.resolve({ byPass: true })
    }

    case 'bringBrowserToForeground': {
      let shouldHide

      try {
        shouldHide = target === '' || target === undefined ? false : !strictParseBoolLike(target)
      } catch (e) {
        throw new Error('E310: Invalid target for bringBrowserToForeground. It should be true / false or leave it blank')
      }

      const p = shouldHide ? csIpc.ask('PANEL_MINIMIZE_ALL_WINDOWS_BUT_PANEL') : csIpc.ask('PANEL_BRING_PLAYING_WINDOW_TO_FOREGROUND')

      return p.then(() => ({ byPass: true }))
    }

    case 'bringIDEandBrowserToBackground': {
      return csIpc.ask('PANEL_MINIMIZE_ALL_WINDOWS').then(() => ({ byPass: true }))
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
      const width = parseInt(strWidth, 10)
      const height = parseInt(strHeight, 10)

      log('resize', width, height)
      return csIpc
        .ask('PANEL_RESIZE_PLAY_TAB', {
          viewportSize: { width, height },
          screenAvailableRect: {
            x: window.screen.availLeft,
            y: window.screen.availTop,
            width: window.screen.availWidth,
            height: window.screen.availHeight
          }
        })
        .then(({ actual, desired, diff }: { actual: any; desired: any; diff: any }) => {
          if (diff.length === 0) return { byPass: true }

          return {
            byPass: true,
            log: {
              warning: `W367: Only able to resize it to ${actual.width}@${actual.height}, given ${desired.width}@${desired.height}`
            }
          }
        })
    }

    case 'XType':
    case 'XMouseWheel':
    case 'XMove':
    case 'XMoveText':
    case 'XMoveTextRelative':
    case 'XMoveRelative':
    case 'XClickRelative':
    case 'XClickTextRelative':
    case 'XClickText':
    case 'XClick':
      const api = getNativeXYAPI()
      return runXMouseKeyboardCommand(command)

    case 'captureDesktopScreenshot': {
      const cvApi = getNativeCVAPI()
      const isJustFileName = (str) => !/[\\/]/.test(str)
      const path = target && target.trim()
      const filePath = path && path.length > 0 ? ensureExtName('.png', path) : undefined
      const next =
        filePath && isJustFileName(filePath)
          ? (actualPath) => {
              return cvApi.readFileAsBlob(actualPath).then((blob) => {
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
      return cvApi
        .captureDesktop({ path: filePath })
        .then(next)
        .then(() => ({
          byPass: true
        }))
    }

    case 'captureScreenshot': {
      const fileName = ensureExtName('.png', target)
      const devicePixelRatio = window.devicePixelRatio

      return getState()
        .then((state) => {
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

      return getState()
        .then((state) => {
          return activateTab(state.tabIds.toPlay, true)
            .then(() => delay(() => {}, C.SCREENSHOT_DELAY))
            .then(getPlayTabIpc)
            .then((ipc) => {
              return captureScreenshotService.saveFullScreen(getStorageManager().getScreenshotStorage(), state.tabIds.toPlay, fileName, {
                startCapture: () => {
                  return ipc.ask('START_CAPTURE_FULL_SCREENSHOT', {}, C.CS_IPC_TIMEOUT)
                },
                endCapture: (pageInfo) => {
                  return ipc.ask('END_CAPTURE_FULL_SCREENSHOT', { pageInfo }, C.CS_IPC_TIMEOUT)
                },
                scrollPage: (offset) => {
                  return ipc.ask('SCROLL_PAGE', { offset }, C.CS_IPC_TIMEOUT)
                }
              })
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
        return getPlayTab().then((tab) => {
          return {
            byPass: true,
            pageUrl: tab.url,
            index: tab.index
          }
        })
      })
    }

    default:
      return undefined
  }
}

export const runCsFreeCommands = (command: any, index?: any, parentCommand?: any): any => {
  const { cmd } = command

  const vars = getVarsInstance()
  console.log('#233 runCsFreeCommands vars:>> ', vars.dump())

  const playerState = PlayerInstance.getInstance().getState()

  const shouldShowOcrOverlay = (cmd: any) => {
    const isDesktopMode = isCVTypeForDesktop(vars.get('!CVSCOPE'))
    const isApplicableCmd = [
      'XClickText',
      'XClickTextRelative',
      'XMoveText',
      'XMoveTextRelative',
      'OCRSearch',
      'OCRExtractbyTextRelative'
    ].includes(cmd)

    if (isApplicableCmd && isDesktopMode) {
      return true
    } else {
      return false
    }
  }

  if (shouldShowOcrOverlay(cmd)) {
    store.dispatch(Actions.setOcrInDesktopMode(true))
  }

  console.log('cmd:>> ==`' + cmd + '`')

  return runCommand(command, index, parentCommand)
}
