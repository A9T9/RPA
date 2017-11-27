import React from 'react'
import ReactDOM from 'react-dom'
import {HashRouter} from 'react-router-dom'
import { message, LocaleProvider } from 'antd'
import enUS from 'antd/lib/locale-provider/en_US'

import App from './app'
import { Provider, createStore, reducer } from './redux'
import csIpc from './common/ipc/ipc_cs'
import testCaseModel, { eliminateBaseUrl, commandWithoutBaseUrl } from './models/test_case_model'
import storage from './common/storage'
import { getPlayer } from './common/player'
import { delay, updateIn, pick } from './common/utils'
import { fromJSONString } from './common/convert_utils'
import * as C from './common/constant'
import log from './common/log'
import { parseFromCSV, stringifyToCSV } from './common/csv'
import varsFactory from './common/variables'
import Interpreter from './common/interpreter'
import { getCSVMan } from './common/csv_man'
import preTcs from './config/preinstall_macros'
import {
  addTestCases,
  setTestCases,
  setEditing,
  setPlayerState,
  updateConfig,
  addLog,
  addScreenshot,
  startPlaying,
  stopPlaying,
  updateTestCasePlayStatus,
  addPlayerErrorCommandIndex,
  doneInspecting,
  updateSelectedCommand,
  appendCommand,
  listCSV
} from './actions'

const store = createStore(
  reducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)

const rootEl = document.getElementById('root');
const render = Component =>
  ReactDOM.render(
    <LocaleProvider locale={enUS}>
      <Provider store={store}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>
    </LocaleProvider>,
    rootEl
  );

// Note: listen to any db changes and restore all data from db to redux store
// All test cases are stored in indexeddb (dexie)
const bindDB = () => {
  const restoreTestCases = () => {
    return testCaseModel.list()
      .then(tcs => {
        store.dispatch(
          setTestCases(tcs.map(eliminateBaseUrl))
        )
      })
  }

  ['updating', 'creating', 'deleting'].forEach(eventName => {
    testCaseModel.table.hook(eventName, () => {
      log('eventName', eventName)
      setTimeout(restoreTestCases, 50)
    })
  })

  restoreTestCases()
}

// Note: editing is stored in localstorage
const restoreEditing = () => {
  return storage.get('editing')
    .then(editing => {
      let finalEditing = editing

      if (editing.baseUrl) {
        finalEditing = {...editing}
        finalEditing.commands = finalEditing.commands.map(
          commandWithoutBaseUrl(editing.baseUrl)
        )
        delete finalEditing.baseUrl
      }

      store.dispatch(
        setEditing(finalEditing)
      )
    })
}

const restoreConfig = () => {
  return storage.get('config')
    .then(config => {
      const cfg = {
        showSidebar: true,
        playScrollElementsIntoView: true,
        playHighlightElements: true,
        playCommandInterval: 0,
        recordNotification: true,
        // timeout in seconds
        timeoutPageLoad: 60,
        timeoutElement: 10,
        ...config
      }
      store.dispatch(updateConfig(cfg))
    })
}

const restoreCSV = () => {
  getCSVMan({ baseDir: 'spreadsheets' })
  store.dispatch(listCSV())
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

// Note: initialize the player, and listen to all events it emits
const bindPlayer = () => {
  const replaceEscapedChar = (str) => {
    return [
      [/\\n/g, '\n'],
      [/\\t/g, '\t']
    ].reduce((prev, [reg, c]) => {
      return prev.replace(reg, c)
    }, str)
  }

  const interpretCSVCommands = (command, index) => {
    const csvMan = getCSVMan()
    const { cmd, target, value } = command

    switch (cmd) {
      case 'csvRead': {
        return csvMan.exists(target)
        .then(isExisted => {
          if (!isExisted) {
            throw new Error(`csv file '${target}' not exist`)
          }

          return csvMan.read(target)
          .then(parseFromCSV)
          .then(rows => {
            // Note: !LOOP starts from 1
            const index = vars.get('!LOOP') - 1
            const row   = rows[index]

            if (index >= rows.length) {
              throw new Error('end of csv file reached')
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
          store.dispatch(listCSV())
        })
        .then(() => ({
          isFlowLogic: true
        }))
      }

      default:
        return false
    }
  }

  const interpreter = new Interpreter({ run: interpretCSVCommands })
  const tracker     = new TimeTracker()
  const vars        = varsFactory()
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
                      (command.cmd === 'while' && field === 'target')
                        ? { withHashNotation: true }
                        : {}

        command = {
          ...command,
          [field]: vars.render(
            replaceEscapedChar(command[field]),
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
      .then(({ isFlowLogic, nextIndex }) => {
        if (isFlowLogic)  return Promise.resolve({ nextIndex })
        return csIpc.ask('PANEL_RUN_COMMAND', { command })
      })
    },
    handleResult: (result, command, state) => {
      // Every command should return its window.url
      if (result && result.pageUrl) {
        vars.set({ '!URL': result.pageUrl }, true)
      }

      if (result && result.vars) {
        try {
          vars.set(result.vars)
        } catch (e) {
          return Promise.reject(e)
        }
      }

      let hasError = false

      if (result && result.log) {
        if (result.log.info)  store.dispatch(addLog('info', result.log.info))
        if (result.log.error) {
          store.dispatch(addPlayerErrorCommandIndex(state.nextIndex))
          store.dispatch(addLog('error', result.log.error))
          hasError = true
        }
      }

      vars.set({ '!LastCommandOK': !hasError }, true)

      if (result && result.screenshot) {
        store.dispatch(addLog('info', 'a new screenshot captured'))
        store.dispatch(addScreenshot(result.screenshot))
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
        return Promise.resolve(result.nextIndex)
      }

      // For those flow logic that has to get result from bg
      // and return nextIndex in Interpreter.postRun
      return interpreter.postRun(command, state.nextIndex, result)
      .then((data = {}) => data.nextIndex)
    }
  }, {
    preDelay: 0
  })

  player.on('LOOP_RESTART', ({ currentLoop }) => {
    csIpc.ask('PANEL_STOP_PLAYING', {})
    csIpc.ask('PANEL_START_PLAYING', {})
    store.dispatch(addLog('info', `Current loop: ${currentLoop}`))
  })

  player.on('START', ({ title }) => {
    log('START')

    store.dispatch(startPlaying())

    store.dispatch(setPlayerState({
      status: C.PLAYER_STATUS.PLAYING,
      nextCommandIndex: null,
      errorCommandIndices: [],
      doneCommandIndices: []
    }))

    store.dispatch(addLog('info', `Playing test case ${title}`))
  })

  player.on('PAUSED', () => {
    log('PAUSED')
    store.dispatch(setPlayerState({
      status: C.PLAYER_STATUS.PAUSED
    }))

    store.dispatch(addLog('info', `Test case paused`))
  })

  player.on('RESUMED', () => {
    log('RESUMED')
    store.dispatch(setPlayerState({
      status: C.PLAYER_STATUS.PLAYING
    }))

    store.dispatch(addLog('info', `Test case resumed`))
  })

  player.on('END', (obj) => {
    log('END', obj)
    csIpc.ask('PANEL_STOP_PLAYING', {})

    store.dispatch(stopPlaying())

    store.dispatch(setPlayerState({
      status: C.PLAYER_STATUS.STOPPED,
      stopReason: obj.reason,
      nextCommandIndex: null,
      timeoutStatus: null
    }))

    const tcId = obj.extra && obj.extra.id

    switch (obj.reason) {
      case player.C.END_REASON.COMPLETE:
        if (tcId) store.dispatch(updateTestCasePlayStatus(tcId, C.TEST_CASE_STATUS.SUCCESS))
        message.success('Test case completed running', 1.5)
        break

      case player.C.END_REASON.ERROR:
        if (tcId) store.dispatch(updateTestCasePlayStatus(tcId, C.TEST_CASE_STATUS.ERROR))
        message.error('Test case encountered some error', 1.5)
        break
    }

    const logMsg = {
      [player.C.END_REASON.COMPLETE]: 'Test case completed',
      [player.C.END_REASON.ERROR]: 'Test case failed',
      [player.C.END_REASON.MANUAL]: 'Test case was stopped manually'
    }

    store.dispatch(addLog('info', logMsg[obj.reason] + ` (Runtime ${tracker.elapsedInSeconds()})`))

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
    log('TO_PLAYER', index)
    store.dispatch(setPlayerState({
      timeoutStatus: null,
      nextCommandIndex: index,
      currentLoop,
      loops
    }))

    const triple  = [resource.cmd, resource.target, resource.value]
    const str     = ['', ...triple, ''].join(' | ')
    store.dispatch(addLog('info', `Executing: ${str}`))

    // Note: show in badage the current command index (start from 1)
    csIpc.ask('PANEL_UPDATE_BADGE', {
      type: 'play',
      text: '' + (index + 1)
    })
  })

  player.on('PLAYED_LIST', ({ indices }) => {
    log('PLAYED_LIST', indices)
    store.dispatch(setPlayerState({
      doneCommandIndices: indices
    }))
  })

  player.on('ERROR', ({ errorIndex, msg }) => {
    log.error(`command index: ${errorIndex}, Error: ${msg}`)
    store.dispatch(addPlayerErrorCommandIndex(errorIndex))
    store.dispatch(addLog('error', msg))
  })

  player.on('DELAY', ({ total, past }) => {
    store.dispatch(setPlayerState({
      timeoutStatus: {
        type: 'delay',
        total,
        past
      }
    }))
  })
}

const bindIpcEvent = () => {
  csIpc.onAsk((cmd, args) => {
    switch (cmd) {
      case 'INSPECT_RESULT':
        store.dispatch(doneInspecting())
        store.dispatch(updateSelectedCommand({ target: args.xpath }))
        return true

      case 'RECORD_ADD_COMMAND':
        log('got add command', cmd, args)
        store.dispatch(appendCommand(args, true))
        return true

      case 'TIMEOUT_STATUS':
        if (store.getState().status !== C.APP_STATUS.PLAYER)  return false

        store.dispatch(setPlayerState({
          timeoutStatus: args
        }))

        // Note: show in badge the timeout left
        csIpc.ask('PANEL_UPDATE_BADGE', {
          type: 'play',
          text: (args.total - args.past) / 1000 + 's'
        })
        return true
    }
  })
}

const bindWindowEvents = () => {
  // reset status to normal when panel closed
  window.addEventListener('beforeunload', () => {
    csIpc.ask('PANEL_STOP_RECORDING', {})
    csIpc.ask('PANEL_STOP_PLAYING', {})
  })

  window.addEventListener('resize', () => {
    const size = {
      width: window.outerWidth,
      height: window.outerHeight
    }
    const state = store.getState()
    store.dispatch(updateConfig({
      size: {
        ...state.config.size,
        [state.config.showSidebar ? 'with_sidebar' : 'standard']: size
      }
    }))
  })
}

bindDB()
bindPlayer()
bindIpcEvent()
bindWindowEvents()
restoreEditing()
restoreConfig()
restoreCSV()

csIpc.ask('I_AM_PANEL', {})

storage.get('preinstall')
.then(val => {
  if (val)  return
  if (!preTcs || !Object.keys(preTcs).length)  return

  const tcs = Object.keys(preTcs).map(key => {
    const str = JSON.stringify(preTcs[key])
    return fromJSONString(str, key)
  })

  store.dispatch(addTestCases(tcs))
  return storage.set('preinstall', 'done')
})

render(App)

if (module.hot) module.hot.accept('./app', () => render(App));
