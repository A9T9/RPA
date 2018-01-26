import { message } from 'antd'
import varsFactory from './common/variables'
import Interpreter from './common/interpreter'
import { getCSVMan } from './common/csv_man'
import { parseFromCSV, stringifyToCSV } from './common/csv'
import { Player, getPlayer } from './common/player'
import csIpc from './common/ipc/ipc_cs'
import log from './common/log'
import { updateIn, setIn } from './common/utils'
import * as C from './common/constant'
import * as act from './actions'

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
            vars.set({ '!CsvReadStatus': 'OK' }, true)
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
        return csvMan.exists(target)
        .then(isExisted => {
          if (!isExisted) {
            return csvMan.write(target, newLineText)
          }

          return csvMan.read(target)
          .then(originalText => {
            const text = (originalText + '\n' + newLineText).replace(/\n+/g, '\n')
            return csvMan.write(target, text)
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
      return false
  }
}

// Note: initialize the player, and listen to all events it emits
export const initPlayer = (store) => {
  const vars        = varsFactory()
  const interpreter = new Interpreter({ run: interpretCSVCommands({vars, store}) })
  const tcPlayer    = initTestCasePlayer({store, vars, interpreter})
  const tsPlayer    = initTestSuitPlayer({store, tcPlayer})
}

const initTestCasePlayer = ({ store, vars, interpreter }) => {
  const tracker     = new TimeTracker()
  const macroTimer  = new Timeout(() => player.stopWithError(new Error(`macro timeout ${vars.get('!TIMEOUT_MACRO')}s`)))
  const player      = getPlayer({
    prepare: (state) => {
      // Each 'replay' has an independent variable scope,
      // with global variables as initial scope
      vars.reset()
      vars.set(state.public.scope || {}, true)

      tracker.reset()

      interpreter.reset()
      interpreter.preprocess(state.resources)

      return csIpc.ask('PANEL_START_PLAYING', { url: state.startUrl })
    },
    run: (command, state) => {
      const useClipboard = /!clipboard/i.test(command.target + ';' + command.value)
      const prepare = !useClipboard
                          ? Promise.resolve({ useClipboard: false })
                          : csIpc.ask('GET_CLIPBOARD').then(clipboard => ({ useClipboard: true, clipboard }))

      return prepare.then(({ useClipboard, clipboard = '' }) => {
        // Set clipboard variable if it is used
        if (useClipboard) {
          vars.set({ '!CLIPBOARD': clipboard })
        }

        // Set loop in every run
        vars.set({
          '!LOOP': state.loopsCursor,
          '!RUNTIME': tracker.elapsedInSeconds()
        }, true)

        if (command.cmd === 'open') {
          command = {...command, href: state.startUrl}
        }

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

        // add timeout info to each command's extra
        // Please note that we must set the timeout info at runtime for each command,
        // so that timeout could be modified by some 'store' commands and affect
        // the rest of commands
        command = updateIn(['extra'], extra => ({
          ...(extra || {}),
          timeoutPageLoad:  vars.get('!TIMEOUT_PAGELOAD'),
          timeoutElement:   vars.get('!TIMEOUT_WAIT'),
          errorIgnore:      !!vars.get('!ERRORIGNORE')
        }), command)

        // Note: all commands need to be run by interpreter before it is sent to bg
        // so that interpreter could pick those flow logic commands and do its job
        return interpreter.run(command, state.nextIndex)
        .then(
          ({ isFlowLogic, nextIndex }) => {
            if (isFlowLogic)  return Promise.resolve({ nextIndex })

            // Note: -1 will disable ipc timeout for 'pause' command
            const timeout = command.cmd === 'pause' ? -1 : null
            return csIpc.ask('PANEL_RUN_COMMAND', { command }, timeout)
          },
          e => {
            // Note: if variable !ERRORIGNORE is set to true,
            // it will just log errors instead of a stop of whole macro
            if (vars.get('!ERRORIGNORE')) {
              return {
                log: {
                  error: e.message
                }
              }
            }

            throw e
          }
        )
      })
    },
    handleResult: (result, command, state) => {
      const prepares = []

      // Every command should return its window.url
      if (result && result.pageUrl) {
        vars.set({ '!URL': result.pageUrl }, true)
      }

      if (result && result.vars) {
        try {
          vars.set(result.vars)

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
        if (result.log.info)  store.dispatch(act.addLog('info', result.log.info))
        if (result.log.error) {
          store.dispatch(act.addPlayerErrorCommandIndex(state.nextIndex))
          store.dispatch(act.addLog('error', result.log.error))
          hasError = true
        }
      }

      if (command.cmd !== 'echo') {
        vars.set({ '!LastCommandOK': !hasError }, true)
      }

      if (result && result.screenshot) {
        store.dispatch(act.addLog('info', 'a new screenshot captured'))
        store.dispatch(act.addScreenshot(result.screenshot))
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

  player.on('LOOP_START', ({ loopsCursor }) => {
    // Note: set 'csv read line number' to loops whenever a new loop starts
    vars.set({ '!CsvReadLineNumber': loopsCursor }, true)

    // Note: reset macro timeout on each loop
    macroTimer.reset()
    macroTimer.restart(vars.get('!TIMEOUT_MACRO') * 1000)
  })

  player.on('LOOP_RESTART', ({ currentLoop, loopsCursor }) => {
    csIpc.ask('PANEL_STOP_PLAYING', {})
    csIpc.ask('PANEL_START_PLAYING', {})
    store.dispatch(act.addLog('info', `Current loop: ${currentLoop}`))
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

    store.dispatch(act.addLog('info', `Playing test case ${title}`))
  })

  player.on('PAUSED', () => {
    log('PAUSED')
    store.dispatch(act.setPlayerState({
      status: C.PLAYER_STATUS.PAUSED
    }))

    store.dispatch(act.addLog('info', `Test case paused`))
  })

  player.on('RESUMED', () => {
    log('RESUMED')
    store.dispatch(act.setPlayerState({
      status: C.PLAYER_STATUS.PLAYING
    }))

    store.dispatch(act.addLog('info', `Test case resumed`))
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
        message.success('Test case completed running', 1.5)
        break

      case player.C.END_REASON.ERROR:
        if (tcId) store.dispatch(act.updateTestCasePlayStatus(tcId, C.TEST_CASE_STATUS.ERROR))
        message.error('Test case encountered some error', 1.5)
        break
    }

    const logMsg = {
      [player.C.END_REASON.COMPLETE]: 'Test case completed',
      [player.C.END_REASON.ERROR]: 'Test case failed',
      [player.C.END_REASON.MANUAL]: 'Test case was stopped manually'
    }

    store.dispatch(act.addLog('info', logMsg[obj.reason] + ` (Runtime ${tracker.elapsedInSeconds()})`))

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
    store.dispatch(act.addLog('info', `Executing: ${str}`))

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

  player.on('ERROR', ({ errorIndex, msg }) => {
    log.error(`command index: ${errorIndex}, Error: ${msg}`)
    store.dispatch(act.addPlayerErrorCommandIndex(errorIndex))
    store.dispatch(act.addLog('error', msg))
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
    run: (testCase) => {
      const tcId    = testCase.id
      const tcLoops = testCase.loops > 1 ? parseInt(testCase.loops, 10) : 1
      const state   = store.getState()
      const tcs     = state.editor.testCases
      const tc      = tcs.find(tc => tc.id === tcId)
      const openTc  = tc && tc.data.commands.find(c => c.cmd.toLowerCase() === 'open')

      if (!tc) {
        throw new Error('test case not exist')
      }

      // update editing && start to play tcPlayer
      store.dispatch(act.editTestCase(tc.id))
      store.dispatch(act.playerPlay({
        extra: {
          id: tc.id,
          name: tc.name
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

    store.dispatch(act.addLog('info', `Playing test suite ${title}`))
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
    store.dispatch(act.addLog('info', `Test suite paused`))
    tcPlayer.pause()
  })

  tsPlayer.on('RESUMED', ({ extra }) => {
    log('RESUMED SUIITE')
    store.dispatch(act.addLog('info', `Test suite resumed`))
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

  tcPlayer.on('ERROR', ({ msg }) => {
    setState({
      lastErrMsg: msg
    })
  })

  return tsPlayer
}
