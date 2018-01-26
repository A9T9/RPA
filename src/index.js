import React from 'react'
import ReactDOM from 'react-dom'
import {HashRouter} from 'react-router-dom'
import { message, LocaleProvider } from 'antd'
import enUS from 'antd/lib/locale-provider/en_US'

import App from './app'
import { Provider, createStore, reducer } from './redux'
import { initPlayer } from './init_player'
import csIpc from './common/ipc/ipc_cs'
import testCaseModel, { eliminateBaseUrl, commandWithoutBaseUrl } from './models/test_case_model'
import testSuiteModel from './models/test_suite_model'
import storage from './common/storage'
import { fromJSONString } from './common/convert_utils'
import { parseTestSuite } from './common/convert_suite_utils'
import * as C from './common/constant'
import log from './common/log'
import { getCSVMan } from './common/csv_man'
import { getScreenshotMan } from './common/screenshot_man'
import preTcs from './config/preinstall_macros'
import preTss from './config/preinstall_suites'
import {
  addTestCases,
  setTestCases,
  setTestSuites,
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
  listCSV,
  listScreenshots,
  addTestSuites
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

  const restoreTestSuites = () => {
    return testSuiteModel.list()
      .then(tss => {
        tss.sort((a, b) => {
          const aname = a.name.toLowerCase()
          const bname = b.name.toLowerCase()

          if (aname < bname)  return -1
          if (aname > bname)  return 1
          if (aname === bname) {
            return b.updateTime - a.updateTime
          }
        })

        store.dispatch(
          setTestSuites(tss)
        )
      })
  }

  ;['updating', 'creating', 'deleting'].forEach(eventName => {
    testCaseModel.table.hook(eventName, () => {
      log('eventName', eventName)
      setTimeout(restoreTestCases, 50)
    })
  })

  ;['updating', 'creating', 'deleting'].forEach(eventName => {
    testSuiteModel.table.hook(eventName, () => {
      log('eventName', eventName)
      setTimeout(restoreTestSuites, 50)
    })
  })

  restoreTestCases()
  restoreTestSuites()
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
        playCommandInterval: 0.3,
        recordNotification: true,
        // timeout in seconds
        timeoutPageLoad: 60,
        timeoutElement: 10,
        timeoutMacro: 300,
        // backup relative
        enableAutoBackup: true,
        autoBackupInterval: 7,
        autoBackupTestCases: true,
        autoBackupTestSuites: true,
        autoBackupScreenshots: true,
        autoBackupCSVFiles: true,
        ...config
      }
      store.dispatch(updateConfig(cfg))
    })
}

const restoreCSV = () => {
  getCSVMan({ baseDir: 'spreadsheets' })
  store.dispatch(listCSV())
}

const restoreScreenshots = () => {
  getScreenshotMan({ baseDir: 'screenshots' })
  store.dispatch(listScreenshots())
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
bindIpcEvent()
bindWindowEvents()
initPlayer(store)
restoreEditing()
restoreConfig()
restoreCSV()
restoreScreenshots()

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

  // Note: test cases need to be save to indexed db before it reflects in store
  // so it may take some time before we can preinstall test suites
  setTimeout(() => {
    const state = store.getState()

    const tss   = preTss.map(ts => {
      return parseTestSuite(JSON.stringify(ts), state.editor.testCases)
    })
    store.dispatch(addTestSuites(tss))

    return storage.set('preinstall', 'done')
  }, 1000)
})

render(App)
