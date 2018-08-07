import { message } from 'antd'
import varsFactory from './common/variables'
import Interpreter from './common/interpreter'
import { getCSVMan } from './common/csv_man'
import { parseFromCSV, stringifyToCSV } from './common/csv'
import { Player, getPlayer } from './common/player'
import csIpc from './common/ipc/ipc_cs'
import log from './common/log'
import { updateIn, setIn, objMap, dataURItoBlob, delay, retry } from './common/utils'
import * as C from './common/constant'
import * as act from './actions'
import { getScreenshotMan } from './common/screenshot_man'
import { getVisionMan } from './common/vision_man'
import Ext from './common/web_extension'
import FileSaver from './common/lib/file_saver'

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

class Timeout {
  constructor (callback) {
    this.callback = callback
  }

  reset (callback) {
    this.cancel()

    if (callback) {
      this.callback = callback
    }

    this.timer      = null
    this.timeout    = null
    this.startTime  = null
  }

  restart (newTimeout) {
    if (!this.timeout) {
      this.timeout    = newTimeout
      this.startTime  = new Date()
      this.timer      = setTimeout(this.callback, this.timeout)
    } else {
      const past = new Date() * 1 - this.startTime * 1
      const rest = newTimeout - past

      clearTimeout(this.timer)

      if (rest < 0) return this.callback()

      this.timeout  = newTimeout
      this.timer    = setTimeout(this.callback, rest)
    }
  }

  cancel () {
    clearTimeout(this.timer)
  }
}

const replaceEscapedChar = (str) => {
  return [
    [/\\n/g, '\n'],
    [/\\t/g, '\t']
  ].reduce((prev, [reg, c]) => {
    return prev.replace(reg, c)
  }, str)
}

const interpretSpecialCommands = ({ store, vars }) => {
  const commandRunners = [
    interpretCSVCommands({ store, vars }),
    interpretCsFreeCommands({ store, vars })
  ]

  return (command, index) => {
    return commandRunners.reduce((prev, cur) => {
      if (prev !== undefined) return prev
      return cur(command, index)
    }, undefined)
  }
}

const interpretCsFreeCommands = ({ store, vars }) => (command, index) => {
  const csvMan = getCSVMan()
  const ssMan  = getScreenshotMan()
  const { cmd, target, value, extra } = command
  const result = {
    isFlowLogic: true
  }

  log('interpretCsFreeCommands', command)

  switch (cmd) {
    case 'localStorageExport': {
      if (/\.csv$/i.test(target)) {
        return csvMan.exists(target)
        .then(existed => {
          if (!existed) throw new Error(`${target} doesn't exist`)

          return csvMan.read(target)
          .then(text => {
            FileSaver.saveAs(new Blob([text]), target)
            return result
          })
        })
      }

      if (/\.png$/i.test(target)) {
        return ssMan.exists(target)
        .then(existed => {
          if (!existed) throw new Error(`${target} doesn't exist`)

          return ssMan.read(target)
          .then(buffer => {
            FileSaver.saveAs(new Blob([new Uint8Array(buffer)]), target)
            return result
          })
        })
      }

      throw new Error(`${target} doesn't exist`)
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
        return getVisionMan().exists(fileName)
        .then(existed => {
          if (!existed) throw new Error(`${command}: No input image found for file name '${fileName}'`)
        })
      }

      const isNotVerifyOrAssert = ['visualVerify', 'visualAssert'].indexOf(cmd) === -1
      const [visionFileName, confidence] = target.split('@')
      const minSimilarity = confidence ? parseFloat(confidence) : store.getState().config.defaultVisionSearchConfidence
      const searchArea    = vars.get('!visualSearchArea')
      const timeout       = vars.get('!TIMEOUT_WAIT') * 1000

      const run = () => {
        return csIpc.ask('PANEL_CLEAR_VISION_RECTS_ON_PLAYING_PAGE')
        //#324 .then(() => delay(() => {}, 500))
        .then(() => csIpc.ask('PANEL_SEARCH_VISION_ON_PLAYING_PAGE', {
          visionFileName,
          minSimilarity,
          searchArea,
          storedImageRect: vars.get('!storedImageRect'),
          command: cmd
        }))
        .then(regions => {
          log('regions', regions)

          if (regions.length === 0) {
            throw new Error(`Image '${visionFileName}' (conf. = ${minSimilarity}) not found`)
          }

          const best = regions[0]
          csIpc.ask('PANEL_HIGHLIGHT_RECTS', { scoredRects: regions })

          return delay(() => ({
            byPass: true,
            vars: {
              '!imageX': best.left + best.width / 2,
              '!imageY': best.top + best.height / 2,
              ...(isNotVerifyOrAssert && value && value.length ? { [value]: regions.length } : {})
            }
          }), 100)
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
          csIpc.ask('PANEL_TIMEOUT_STATUS', { timeout, type: 'Vision waiting' })
        },
        onFinal: () => {
          csIpc.ask('PANEL_CLEAR_TIMEOUT_STATUS')
        }
      })

      return verifyPatternImage(visionFileName, cmd)
      .then(() => {
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

    case 'visionLimitSearchArea': {
      let area  = target.trim()
      let p     = Promise.resolve({ byPass: true })

      if (/^viewport$/.test(area)) {
        area = 'viewport'
      } else if (/^full$/.test(area)) {
        area = 'full'
      } else if (/^element:/.test(area)) {
        // Note: let cs page to process this case, it acts almost the same as a `storeImage` command
        p = Promise.resolve({ byPass: false })
      } else {
        throw new Error(`Target of visionLimitSearchArea could only be either 'viewport', 'full' or 'element:...'`)
      }

      vars.set({ '!visualSearchArea': area }, true)
      return p
    }

    case 'bringBrowserToForeground': {
      return csIpc.ask('PANEL_BRING_PLAYING_WINDOW_TO_FOREGROUND')
      .then(() => ({ byPass: true }))
    }

    case 'resize': {
      if (!/\s*\d+@\d+\s*/.test(target)) {
        throw new Error(`Syntax for target of resize command is x@y, e.g. 800@600`)
      }

      const [strWidth, strHeight] = target.split('@')
      const width   = parseInt(strWidth, 10)
      const height  = parseInt(strHeight, 10)

      log('resize', width, height)
      return csIpc.ask('PANEL_RESIZE_PLAY_TAB', { width, height })
      .then(({ actual, desired, diff }) => {
        if (diff.length === 0)  return { byPass: true }

        return {
          byPass: true,
          log: {
            warning: `Only able to resize it to ${actual.width}@${actual.height}, given ${desired.width}@${desired.height}`
          }
        }
      })
    }

    default:
      return undefined
  }
}

const interpretCSVCommands = ({ store, vars }) => (command, index) => {
  const csvMan = getCSVMan()
  const { cmd, target, value } = command

  switch (cmd) {
    case 'csvRead': {
      return csvMan.exists(target)
      .then(isExisted => {
        if (!isExisted) {
          vars.set({ '!CsvReadStatus': 'FILE_NOT_FOUND' }, true)
          throw new Error(`csv file '${target}' not exist`)
        }

        return csvMan.read(target)
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
        })
      })
      .then(() => ({
        isFlowLogic: true
      }))
    }

    case 'csvSave': {
      const csvLine = vars.get('!CSVLINE')

      if (!csvLine || !csvLine.length) {
        throw new Error('No data to save to csv')
      }

      return stringifyToCSV([csvLine])
      .then(newLineText => {
        const fileName = /\.csv$/i.test(target) ? target : (target + '.csv')

        return csvMan.exists(fileName)
        .then(isExisted => {
          if (!isExisted) {
            return csvMan.write(fileName, newLineText)
          }

          return csvMan.read(fileName)
          .then(originalText => {
            const text = (originalText + '\n' + newLineText).replace(/\n+/g, '\n')
            return csvMan.write(fileName, text)
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

    default:
      return undefined
  }
}

// Note: initialize the player, and listen to all events it emits
export const initPlayer = (store) => {
  const vars        = varsFactory()
  const interpreter = new Interpreter({ run: interpretSpecialCommands({vars, store}) })
  const tcPlayer    = initTestCasePlayer({store, vars, interpreter})
  const tsPlayer    = initTestSuitPlayer({store, tcPlayer})

  // Note: No need to return anything in this method.
  // Because both test case player and test suite player are cached in player.js
  // All later usage of player utilize `getPlayer` method
}

const initTestCasePlayer = ({ store, vars, interpreter }) => {
  const mainTracker = new TimeTracker()
  const loopTracker = new TimeTracker()
  const macroTimer  = new Timeout(() => player.stopWithError(new Error(`macro timeout ${vars.get('!TIMEOUT_MACRO')}s (change the value in the settings if needed)`)))
  const nextCommand = (playerState) => {
    const { resources, nextIndex } = playerState
    return resources[nextIndex + 1]
  }
  // Note: use this to track `onError` command
  // `onError` works like a global try catch, it takes effects on any commands coming after `onError`
  // Multilple `onError` are allowed, latter one overwrites previous one.
  // The scope of `onError` is current loop
  let onErrorCommand = null
  const player      = getPlayer({
    prepare: (state) => {
      // Each 'replay' has an independent variable scope,
      // with global variables as initial scope
      vars.reset({ keepGlobal: true })
      vars.set(state.public.scope || {}, true)
      vars.set({
        '!StatusOK': true,
        '!WaitForVisible': false,
        '!IMAGEX': 0,
        '!IMAGEY': 0
      })

      mainTracker.reset()
      loopTracker.reset()

      interpreter.reset()
      interpreter.preprocess(state.resources)

      return csIpc.ask('PANEL_START_PLAYING', {
        url: state.startUrl,
        shouldNotActivateTab: true
      })
    },
    run: (command, state) => {
      const useClipboard = /!clipboard/i.test(command.target + ';' + command.value)
      const prepare = !useClipboard
                          ? Promise.resolve({ useClipboard: false })
                          : csIpc.ask('GET_CLIPBOARD').then(clipboard => ({ useClipboard: true, clipboard }))

      if (Ext.isFirefox()) {
        switch (command.cmd) {
          case 'onDownload':
            store.dispatch(act.addLog('warning', 'onDownload - changing file names not supported by Firefox extension api yet'))
            break
        }
      }

      return prepare.then(({ useClipboard, clipboard = '' }) => {
        // Set clipboard variable if it is used
        if (useClipboard) {
          vars.set({ '!CLIPBOARD': clipboard })
        }

        // Set loop in every run
        vars.set({
          '!LOOP': state.loopsCursor,
          '!RUNTIME': loopTracker.elapsedInSeconds()
        }, true)

        if (command.cmd === 'open') {
          command = {...command, href: state.startUrl}
        }

        // Note: translate shorthand '#efp'
        if (command.target && /^#efp$/i.test(command.target.trim())) {
          // eslint-disable-next-line no-template-curly-in-string
          command.target = '#elementfrompoint (${!imageX}, ${!imageY})'
        }

        if (command.cmd !== 'comment') {
          // Replace variables in 'target' and 'value' of commands
          ;['target', 'value'].forEach(field => {
            if (command[field] === undefined) return

            const opts =  (command.cmd === 'storeEval' && field === 'target') ||
                          (command.cmd === 'gotoIf' && field === 'target') ||
                          (command.cmd === 'if' && field === 'target') ||
                          (command.cmd === 'while' && field === 'target')
                            ? { withHashNotation: true }
                            : {}

            command = {
              ...command,
              [field]: vars.render(
                replaceEscapedChar(
                  command.cmd === 'type' ? command[field] : command[field].trim()
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
          lastCommandOk:    vars.get('!LASTCOMMANDOK'),
          errorIgnore:      !!vars.get('!ERRORIGNORE'),
          waitForVisible:   !!vars.get('!WAITFORVISIBLE')
        }), command)

        // Note: all commands need to be run by interpreter before it is sent to bg
        // so that interpreter could pick those flow logic commands and do its job
        return interpreter.run(command, state.nextIndex)
        .then(result => {
          const { byPass, isFlowLogic, nextIndex, resetVars } = result

          // Record onError command
          if (command.cmd === 'onError') {
            onErrorCommand = command
          }

          if (byPass)       return Promise.resolve(result)
          if (isFlowLogic)  return Promise.resolve({ nextIndex })

          // Note: -1 will disable ipc timeout for 'pause' command
          const timeout = command.cmd === 'pause' ? -1 : null
          return csIpc.ask('PANEL_RUN_COMMAND', { command }, timeout)
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

          const continueNextLoop =  state.mode === Player.C.MODE.LOOP &&
                                    state.loopsCursor < state.loopsEnd &&
                                    store.getState().config.onErrorInLoop === 'continue_next_loop'

          if (continueNextLoop) {
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

      // Every command should return its window.url
      if (result && result.pageUrl) {
        vars.set({ '!URL': result.pageUrl }, true)
      }

      if (result && result.vars) {
        const newVars = objMap(val => {
          if (val.__undefined__)  return undefined
          return val
        }, result.vars)

        log('set vars', newVars)

        try {
          vars.set(newVars)

          // Note: if set value to !Clipboard, there is an async job we must get done before handleResult could return
          const clipBoardKey = Object.keys(result.vars).find(key => /!clipboard/i.test(key))
          if (clipBoardKey) {
            prepares.push(
              csIpc.ask('SET_CLIPBOARD', { value: result.vars[clipBoardKey] })
            )
          }

          // Note: if user sets !timeout_macro to some other value, re-calculate the time left
          const timeoutMacroKey = Object.keys(result.vars).find(key => /!timeout_macro/i.test(key))
          if (timeoutMacroKey) {
            macroTimer.restart(result.vars[timeoutMacroKey] * 1000)
          }
        } catch (e) {
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

        if (result.log.error) {
          store.dispatch(act.addPlayerErrorCommandIndex(state.nextIndex))
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

        getScreenshotMan().getLink(result.screenshot.name)
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
            getPlayer({ name: 'testCase' }).pause()
            csIpc.ask('PANEL_NOTIFY_AUTO_PAUSE', {})
            break

          default:
            throw new Error(`Control type '${result.control.type}' not supported yet`)
        }
      }

      if (/^(fast|medium|slow)$/i.test(vars.get('!REPLAYSPEED'))) {
        const val = vars.get('!REPLAYSPEED').toUpperCase()
        player.setPostDelay(({
          FAST: 0,
          MEDIUM: 300,
          SLOW: 2000
        })[val])
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

  player.on('LOOP_START', ({ loopsCursor }) => {
    // Note: set 'csv read line number' to loops whenever a new loop starts
    vars.set({
      '!CsvReadLineNumber': loopsCursor,
      '!visualSearchArea':  'viewport'
    }, true)

    loopTracker.reset()

    // Note: reset macro timeout on each loop
    macroTimer.reset()
    macroTimer.restart(vars.get('!TIMEOUT_MACRO') * 1000)

    // Note: reset onErrorCommand on each loop
    onErrorCommand = null
  })

  player.on('LOOP_RESTART', ({ currentLoop, loopsCursor }) => {
    csIpc.ask('PANEL_STOP_PLAYING', {})
    csIpc.ask('PANEL_START_PLAYING', { shouldNotActivateTab: true })
    store.dispatch(act.addLog('status', `Current loop: ${currentLoop}`))
  })

  player.on('START', ({ title, loopsCursor }) => {
    log('START')

    store.dispatch(act.startPlaying())

    store.dispatch(act.setPlayerState({
      status: C.PLAYER_STATUS.PLAYING,
      nextCommandIndex: null,
      errorCommandIndices: [],
      doneCommandIndices: []
    }))

    store.dispatch(act.addLog('status', `Playing macro ${title}`))
  })

  player.on('PAUSED', () => {
    log('PAUSED')
    store.dispatch(act.setPlayerState({
      status: C.PLAYER_STATUS.PAUSED
    }))

    store.dispatch(act.addLog('status', `Macro paused`))
  })

  player.on('RESUMED', () => {
    log('RESUMED')
    store.dispatch(act.setPlayerState({
      status: C.PLAYER_STATUS.PLAYING
    }))

    store.dispatch(act.addLog('status', `Macro resumed`))
  })

  player.on('END', (obj) => {
    log('END', obj)

    macroTimer.cancel()

    csIpc.ask('PANEL_STOP_PLAYING', {})

    store.dispatch(act.stopPlaying())

    store.dispatch(act.setPlayerState({
      status: C.PLAYER_STATUS.STOPPED,
      stopReason: obj.reason,
      nextCommandIndex: null,
      timeoutStatus: null
    }))

    const tcId = obj.extra && obj.extra.id

    switch (obj.reason) {
      case player.C.END_REASON.COMPLETE:
        if (tcId) store.dispatch(act.updateTestCasePlayStatus(tcId, C.TEST_CASE_STATUS.SUCCESS))
        message.success('Macro completed running', 1.5)
        break

      case player.C.END_REASON.ERROR:
        if (tcId) store.dispatch(act.updateTestCasePlayStatus(tcId, C.TEST_CASE_STATUS.ERROR))
        message.error('Macro encountered some error', 1.5)
        break
    }

    const logMsg = {
      [player.C.END_REASON.COMPLETE]: 'Macro completed',
      [player.C.END_REASON.ERROR]: 'Macro failed',
      [player.C.END_REASON.MANUAL]: 'Macro was stopped manually'
    }

    store.dispatch(act.addLog('info', logMsg[obj.reason] + ` (Runtime ${mainTracker.elapsedInSeconds()})`))

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
  })

  player.on('TO_PLAY', ({ index, currentLoop, loops, resource }) => {
    log('TO_PLAY', index, resource)
    store.dispatch(act.setPlayerState({
      timeoutStatus: null,
      nextCommandIndex: index,
      currentLoop,
      loops
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
    log('PLAYED_LIST', indices)
    store.dispatch(act.setPlayerState({
      doneCommandIndices: indices
    }))
  })

  player.on('ERROR', ({ errorIndex, msg, restart }) => {
    log.error(`command index: ${errorIndex}, Error: ${msg}`)
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

const initTestSuitPlayer = ({store, tcPlayer}) => {
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
    },
    run: (testCase, playerState) => {
      const tcId    = testCase.id
      const tcLoops = testCase.loops > 1 ? parseInt(testCase.loops, 10) : 1
      const state   = store.getState()
      const tcs     = state.editor.testCases
      const tc      = tcs.find(tc => tc.id === tcId)
      const openTc  = tc && tc.data.commands.find(c => c.cmd.toLowerCase() === 'open')

      if (!tc) {
        throw new Error('macro not exist')
      }

      // update editing && start to play tcPlayer
      store.dispatch(act.editTestCase(tc.id))
      store.dispatch(act.playerPlay({
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
        postDelay: state.config.playCommandInterval * 1000
      }))

      return new Promise((resolve, reject) => {
        setState({
          testCasePromiseHandlers: { resolve, reject }
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

    setState({
      tsId: extra.id,
      isPlaying: true,
      stopReason: null
    })

    store.dispatch(act.addLog('status', `Playing test suite ${title}`))
    store.dispatch(act.setPlayerMode(C.PLAYER_MODE.TEST_SUITE))
    store.dispatch(act.updateTestSuite(extra.id, (ts) => {
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

    store.dispatch(act.updateTestSuite(extra.id, (ts) => {
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
    store.dispatch(act.updateTestSuite(extra.id, (ts) => {
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

    setState({
      isPlaying: false
    })

    // Note: reset player mode to 'test case', it will only be 'test suite'
    // during replays of test suites
    store.dispatch(act.setPlayerMode(C.PLAYER_MODE.TEST_CASE))
    store.dispatch(act.updateTestSuite(extra.id, (ts) => {
      return {
        ...ts,
        playStatus: {
          ...ts.playStatus,
          isPlaying: false,
          currentIndex: -1
        }
      }
    }))

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

      state.reports.forEach(r => {
        const tcStatus = statusMap[r.stopReason] + (r.stopReason === Player.C.END_REASON.ERROR ? `: ${r.errMsg}` : '')
        lines.push(`${r.name} (${tcStatus}, Runtime: ${r.usedTime})`)
      })

      store.dispatch(act.addLog('info', lines.join('\n')))
    }, 200)
  })

  // Test Case Player: we should handle cases when test case player stops automatically
  tcPlayer.on('END', ({ reason, extra }) => {
    if (store.getState().player.mode !== C.PLAYER_MODE.TEST_SUITE)  return

    addReport({
      id: extra.id,
      name: extra.name,
      errMsg: state.lastErrMsg,
      stopReason: reason,
      usedTime: tcTracker.elapsedInSeconds()
    })

    // Avoid a 'stop' loop between tsPlayer and tcPlayer
    switch (reason) {
      case Player.C.END_REASON.MANUAL:
        break

      case Player.C.END_REASON.COMPLETE:
        state.testCasePromiseHandlers.resolve(true)
        break

      case Player.C.END_REASON.ERROR:
        store.dispatch(act.updateTestSuite(state.tsId, (ts) => {
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
