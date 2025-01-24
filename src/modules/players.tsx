import * as act from '@/actions'
import { Actions } from '@/actions/simple_actions'
import clipboard from '@/common/clipboard'
import * as C from '@/common/constant'
import csIpc from '@/common/ipc/ipc_cs'
import log from '@/common/log'
import { getPlayer, Player } from '@/common/player'
import { milliSecondsToStringInSecond } from '@/common/ts_utils'
import { objMap } from '@/common/utils'
import Ext from '@/common/web_extension'
import { getPlayTab } from '@/ext/common/tab'
import { getCurrentMacroId } from '@/recomputed'
import { MacroResultStatus } from '@/services/kv_data/macro_extra_data'
import { getMacroCallStack } from '@/services/player/call_stack/call_stack'
import { getMacroMonitor } from '@/services/player/monitor/macro_monitor'
import { MacroInspector } from '@/services/player/monitor/types'
import { getStorageManager } from '@/services/storage'
import { message } from 'antd'
import React from 'react'
import { ocrCmdCounter, xCmdCounter, proxyCounter } from '@/modules/counters'

import {
  askBackgroundToRunCommand
} from '@/modules/run_command'

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
  startTime: Date  = new Date()

  constructor () {
    this.reset()
  }

  reset () {
    this.startTime = new Date()
  }

  elapsed () {
    return (new Date().getTime() - this.startTime.getTime())
  }

  elapsedInSeconds () {
    const diff = this.elapsed()
    return (diff / 1000).toFixed(2) + 's'
  }
}

const setProxy = (proxy) => {
  return csIpc.ask('PANEL_SET_PROXY', { proxy })
}

const checkRelativeIndexArr = [];
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

function isPausedOrStopped (str) {
  return /player: paused or stopped/.test(str)
}

export const initTestCasePlayer = ({ store, vars, interpreter, xCmdCounter, ocrCmdCounter, proxyCounter }) => {
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
        // checkRelativeIndexArr = [];
        checkRelativeIndexArr.length = 0;
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

export const initTestSuitPlayer = ({store, vars, tcPlayer, xCmdCounter, ocrCmdCounter, proxyCounter}) => {
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
