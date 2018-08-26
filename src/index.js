/* global PREINSTALL_CSV_LIST PREINSTALL_VISION_LIST */

import React from 'react'
import ReactDOM from 'react-dom'
import {HashRouter} from 'react-router-dom'
import { message, LocaleProvider } from 'antd'
import enUS from 'antd/lib/locale-provider/en_US'

import FileSaver from './common/lib/file_saver'
import App from './app'
import { Provider, createStore, reducer } from './redux'
import { initPlayer } from './init_player'
import Ext from './common/web_extension'
import csIpc from './common/ipc/ipc_cs'
import testCaseModel, { eliminateBaseUrl, commandWithoutBaseUrl } from './models/test_case_model'
import testSuiteModel from './models/test_suite_model'
import storage from './common/storage'
import { delay, randomName, dataURItoBlob, loadCsv, loadImage, getScreenDpi } from './common/utils'
import { fromJSONString, fromHtml } from './common/convert_utils'
import { parseTestSuite } from './common/convert_suite_utils'
import * as C from './common/constant'
import log from './common/log'
import { renderLog } from './common/macro_log'
import { getCSVMan } from './common/csv_man'
import { getScreenshotMan } from './common/screenshot_man'
import { getVisionMan } from './common/vision_man'
import { getVarsInstance } from './common/variables'
import { Player, getPlayer } from './common/player'
import getSaveTestCase from './components/save_test_case'
import preTcs from './config/preinstall_macros'
import preTss from './config/preinstall_suites'
import {
  addTestCases,
  setTestCases,
  setTestSuites,
  setEditing,
  setPlayerState,
  setTimeoutStatus,
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
  listVisions,
  addTestSuites,
  editTestCase,
  playerPlay,
  upsertTestCase,
  setVariables,
  updateUI
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
        recordClickType: 'click',
        logFilter: 'All',
        onErrorInLoop: 'continue_next_loop',
        defaultVisionSearchConfidence: 0.8,
        // Run macros from outside
        allowRunFromBookmark: true,
        allowRunFromFileSchema: true,
        allowRunFromHttpSchema: false,
        // timeout in seconds
        timeoutPageLoad: 60,
        timeoutElement: 10,
        timeoutMacro: 900,
        timeoutDownload: 60,
        // backup relative
        lastBackupActionTime: new Date() * 1,
        enableAutoBackup: true,
        autoBackupInterval: 7,
        autoBackupTestCases: true,
        autoBackupTestSuites: true,
        autoBackupScreenshots: true,
        autoBackupCSVFiles: true,
        autoBackupVisionImages: true,
        // security relative
        shouldEncryptPassword: 'no',
        masterPassword: '',
        // variable relative
        showCommonInternalVariables: true,
        showAdvancedInternalVariables: false,
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

const restoreVisions = () => {
  getVisionMan({ baseDir: 'visions' })
  store.dispatch(listVisions())
}

const downloadTextFile = (text, fileName) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  FileSaver.saveAs(blob, fileName)
}

const genPlayerPlayCallback = ({ options }) => (err, reason) => {
  if (options.savelog) {
    const logs        = store.getState().logs
    const errorLog    = logs.find(log => log.type === 'error' && !(log.options && log.options.ignored))
    const error       = err || (errorLog && { message: errorLog.text })
    const logTitle    = error ? `Status=Error: ${error.message}` : `Status=OK`
    const logContent  = logs.map(renderLog)
    const text        = [logTitle, '###', ...logContent].join('\n')
    downloadTextFile(text, decodeURIComponent(options.savelog))
  }

  if (options.close) {
    // Close all tabs If close option is set
    setTimeout(() => {
      csIpc.ask('PANEL_CLOSE_ALL_WINDOWS', {})
    }, 1000)
  }

  if (!err && reason === Player.C.END_REASON.COMPLETE) {
    // Close kantu panel
    setTimeout(() => {
      window.close()
    }, 1000)
  }
}

const bindIpcEvent = () => {
  csIpc.onAsk((cmd, args) => {
    log(cmd, args)

    switch (cmd) {
      case 'INSPECT_RESULT':
        store.dispatch(doneInspecting())
        store.dispatch(updateSelectedCommand({
          target: args.locatorInfo.target,
          targetOptions: args.locatorInfo.targetOptions
        }))
        return true

      case 'RECORD_ADD_COMMAND':
        log('got add command', cmd, args)
        store.dispatch(appendCommand(args, true))
        return true

      case 'TIMEOUT_STATUS':
        if (store.getState().status !== C.APP_STATUS.PLAYER)  return false

        store.dispatch(setTimeoutStatus(args))
        return true

      case 'RUN_TEST_CASE': {
        const state = store.getState()
        if (state.status !== C.APP_STATUS.NORMAL) {
          message.error('can only run macros when it is not recording or playing')
          return false
        }

        const { testCase, options } = args
        const tc = state.editor.testCases.find(tc => tc.name === testCase.name)
        if (!tc) {
          message.error(`no macro found with name '${testCase.name}'`)
          return false
        }

        const openTc  = tc.data.commands.find(item => item.cmd.toLowerCase() === 'open')

        store.dispatch(editTestCase(tc.id))
        store.dispatch(playerPlay({
          title: testCase.name,
          extra: {
            id: tc && tc.id
          },
          mode:       Player.C.MODE.STRAIGHT,
          startIndex: 0,
          startUrl:   openTc ? openTc.target : null,
          resources:  tc.data.commands,
          postDelay:  state.player.playInterval * 1000,
          callback:   genPlayerPlayCallback({ options })
        }))

        store.dispatch(updateUI({ sidebarTab: 'macros' }))
        return true
      }

      case 'RUN_TEST_SUITE': {
        const state = store.getState()
        if (state.status !== C.APP_STATUS.NORMAL) {
          message.error('can only run test suites when it is not recording or playing')
          return false
        }

        const { testSuite, options } = args
        const ts = state.editor.testSuites.find(ts => ts.name === testSuite.name)
        if (!ts) {
          message.error(`no macro found with name '${testSuite.name}'`)
          return false
        }

        getPlayer({ name: 'testSuite' }).play({
          title: ts.name,
          extra: {
            id: ts.id,
            name: ts.name
          },
          mode: getPlayer().C.MODE.STRAIGHT,
          startIndex: 0,
          resources: ts.cases.map(item => ({
            id:     item.testCaseId,
            loops:  item.loops
          })),
          callback: genPlayerPlayCallback({ options })
        })

        store.dispatch(updateUI({ sidebarTab: 'test_suites' }))
        return true
      }

      case 'IMPORT_HTML_AND_RUN': {
        const { options } = args
        let testCase

        try {
          testCase = fromHtml(args.html)
        } catch (e) {
          message.error('Failed to parse html', 1.5)
          return false
        }

        store.dispatch(upsertTestCase(testCase))

        return delay(() => {
          const state = store.getState()
          const tc = state.editor.testCases.find(tc => tc.name === testCase.name)
          const openTc  = tc.data.commands.find(item => item.cmd.toLowerCase() === 'open')

          store.dispatch(editTestCase(tc.id))
          store.dispatch(playerPlay({
            title: tc.name,
            extra: {
              id: tc && tc.id
            },
            mode:       Player.C.MODE.STRAIGHT,
            startIndex: 0,
            startUrl:   openTc ? openTc.target : null,
            resources:  tc.data.commands,
            postDelay:  state.player.playInterval * 1000,
            callback:   genPlayerPlayCallback({ options })
          }))
          return true
        }, 1000)
        .catch(e => {
          log.error(e.stack)
          throw e
        })
      }

      case 'ADD_VISION_IMAGE': {
        const { dataUrl } = args
        const fileName    = `${randomName()}_dpi_${getScreenDpi()}.png`
        const man         = getVisionMan()

        man.write(fileName, dataURItoBlob(dataUrl))
        .then(restoreVisions)
        .catch(e => log.error(e.stack))

        return { fileName }
      }

      case 'RESTORE_SCREENSHOTS': {
        restoreScreenshots()
        return true
      }

      case 'UPDATE_ACTIVE_TAB': {
        updatePageTitle(args)
        return true
      }

      case 'ADD_LOG': {
        if (!args)          return false
        if (args.info)      store.dispatch(addLog('info', args.info, args.options))
        if (args.warning)   store.dispatch(addLog('warning', args.warning))
        if (args.error)     store.dispatch(addLog('error', args.error))

        return true
      }
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

const bindVariableChange = () => {
  // Note: bind to onChange in next tick, to make sure vars instance is already initialized
  // so that `bindVariableChange` could be executed before `initPlayer`
  setTimeout(() => {
    getVarsInstance().onChange(({ vars }) => {
      const variables = Object.keys(vars).map(key => ({ key, value: vars[key] }))
      store.dispatch(setVariables(variables))
    })
  }, 0)
}

const initSaveTestCase = () => {
  getSaveTestCase(store)
}

const updatePageTitle = (args) => {
  // Note: Firefox includes page url in title, there could be not enough space for tab title
  if (Ext.isFirefox())  return true
  const origTitle = document.title.replace(/ - .*$/, '')
  document.title = `${origTitle} - (Tab: ${args.title})`
}

const preinstall = () => {
  log('PREINSTALL_CSV_LIST', PREINSTALL_CSV_LIST)
  log('PREINSTALL_VISION_LIST', PREINSTALL_VISION_LIST)

  // Preinstall macros and test suites
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

  // Preinstall csv
  storage.get('preinstall_csv')
  .then(val => {
    if (val)  return

    const list = PREINSTALL_CSV_LIST
    if (list.length === 0)  return

    const man  = getCSVMan()
    const ps   = list.map(url => {
      const parts     = url.split('/')
      const fileName  = parts[parts.length - 1]

      return loadCsv(url)
      .then(text => {
        return man.write(fileName, text)
      })
    })

    return Promise.resolve(ps)
    // Note: delay needed for Firefox and slow Chrome
    .then(() => delay(() => {}, 3000))
    .then(() => {
      store.dispatch(listCSV())
    })
  })
  .then(() => storage.set('preinstall_csv', 'done'))

  // Preinstall vision images
  storage.get('preinstall_vision')
  .then(val => {
    if (val)  return

    const list = PREINSTALL_VISION_LIST
    if (list.length === 0)  return

    const man  = getVisionMan()
    const ps   = list.map(url => {
      const parts     = url.split('/')
      const fileName  = parts[parts.length - 1]

      return loadImage(url)
      .then(blob => {
        return man.write(fileName, blob)
      })
    })

    return Promise.resolve(ps)
    // Note: delay needed for Firefox and slow Chrome
    .then(() => delay(() => {}, 3000))
    .then(() => {
      store.dispatch(listVisions())
    })
  })
  .then(() => storage.set('preinstall_vision', 'done'))
}

bindDB()
bindIpcEvent()
bindWindowEvents()
bindVariableChange()
initPlayer(store)
restoreEditing()
restoreConfig()
restoreCSV()
restoreScreenshots()
restoreVisions()
initSaveTestCase()
preinstall()

csIpc.ask('I_AM_PANEL', {})

document.title = document.title + ' ' + Ext.runtime.getManifest().version

csIpc.ask('PANEL_CURRENT_PLAY_TAB_INFO')
.then(updatePageTitle)

render(App)
