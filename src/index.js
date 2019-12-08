/* global PREINSTALL_CSV_LIST PREINSTALL_VISION_LIST */

import React from 'react'
import ReactDOM from 'react-dom'
import {HashRouter} from 'react-router-dom'
import { message, LocaleProvider } from 'antd'
import enUS from 'antd/lib/locale-provider/en_US'

import config from './config'
import FileSaver from './common/lib/file_saver'
import App from './app'
import { Provider, createStore, reducer } from './redux'
import { initPlayer } from './init_player'
import Ext from './common/web_extension'
import csIpc from './common/ipc/ipc_cs'
import { getStorageManager, StorageManagerEvent, StorageStrategyType, StorageTarget } from './services/storage'
import { FlatStorageEvent } from './services/storage/storage'
import { getXFile } from './services/xmodules/xfile'
import { eliminateBaseUrl, commandWithoutBaseUrl } from './models/test_case_model'
import storage from './common/storage'
import { delay, randomName, dataURItoBlob, loadCsv, loadImage, getScreenDpi } from './common/utils'
import { fromJSONString, fromHtml } from './common/convert_utils'
import { parseTestSuite } from './common/convert_suite_utils'
import * as C from './common/constant'
import log from './common/log'
import { renderLog } from './common/macro_log'
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
  updateUI,
  resetEditing,
  preinstall
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

const timestampCache  = {}
const DURATION        = 2000

// Note: listen to any db changes and restore all data from db to redux store
// All test cases are stored in indexeddb (dexie)
const bindMacroAndTestSuites = () => {
  const curStorageMode  = getStorageManager().getCurrentStrategyType()
  const macroStorage    = getStorageManager().getMacroStorage()
  const suiteStorage    = getStorageManager().getTestSuiteStorage()
  const onError         = (errorList) => {
    errorList
    .filter(item => item.fileName !== '__Untitled__')
    .forEach(errorItem => {
      const key = errorItem.fullFilePath

      if (!timestampCache[key] || new Date() * 1 - timestampCache[key] > DURATION) {
        timestampCache[key] = new Date() * 1
        store.dispatch(addLog('warning', errorItem.error.message))
      }
    })
  }

  const restoreTestCases = () => {
    return macroStorage.readAll('Text', onError)
    .then(items => items.map(item => item.content))
    .then(tcs => {
      log('restoreTestCases - macroStorage - tcs', tcs)

      store.dispatch(
        setTestCases(tcs.map(eliminateBaseUrl))
      )
    })
  }

  const restoreTestSuites = () => {
    return suiteStorage.readAll('Text', onError)
    .then(items => items.map(item => item.content))
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

      log('restoreTestSuites - suiteStorage - tss', tss)

      store.dispatch(
        setTestSuites(tss)
      )
    })
  }

  // FIXME: need to unbind previous listeners when bindMacroAndTestSuites is called for more than once
  ;[FlatStorageEvent.ListChanged, FlatStorageEvent.FilesChanged].forEach(eventName => {
    macroStorage.off(eventName)
    macroStorage.on(eventName, () => {
      if (curStorageMode !== getStorageManager().getCurrentStrategyType())  return
      log('macroStorage - eventName', eventName)
      setTimeout(restoreTestCases, 50)
    })
  })

  ;[FlatStorageEvent.ListChanged, FlatStorageEvent.FilesChanged].forEach(eventName => {
    suiteStorage.off(eventName)
    suiteStorage.on(eventName, () => {
      if (curStorageMode !== getStorageManager().getCurrentStrategyType())  return
      log('suiteStorage - eventName', eventName)
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
        // xmodules related
        storageMode: StorageStrategyType.Browser,
        ...config
      }
      store.dispatch(updateConfig(cfg))
      return cfg
    })
}

const restoreCSV = () => {
  // Note: just try to init storage. Eg. For browser fs, it will try to create root folder
  getStorageManager().getCSVStorage()
  store.dispatch(listCSV())
}

const restoreScreenshots = () => {
  getStorageManager().getScreenshotStorage()
  store.dispatch(listScreenshots())
}

const restoreVisions = () => {
  getStorageManager().getVisionStorage()
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
        if (store.getState().status !== C.APP_STATUS.NORMAL) {
          message.error('can only run macros when it is not recording or playing')
          return false
        }

        const { testCase, options } = args
        const storageMode = testCase.storageMode || StorageStrategyType.Browser
        const storageMan  = getStorageManager()

        storageMan.isStrategyTypeAvailable(storageMode)
        .catch(e => {
          message.error(e.message)
          throw e
        })
        .then(() => {
          storageMan.setCurrentStrategyType(storageMode)
          return delay(() => {}, 1000)
        })
        .then(() => {
          const state = store.getState()
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
        })

        return true
      }

      case 'RUN_TEST_SUITE': {
        if (store.getState().status !== C.APP_STATUS.NORMAL) {
          message.error('can only run test suites when it is not recording or playing')
          return false
        }

        const { testSuite, options } = args
        const storageMode = testSuite.storageMode || StorageStrategyType.Browser
        const storageMan  = getStorageManager()

        storageMan.isStrategyTypeAvailable(storageMode)
        .catch(e => {
          message.error(e.message)
          throw e
        })
        .then(() => {
          storageMan.setCurrentStrategyType(storageMode)
          return delay(() => {}, 1000)
        })
        .then(() => {
          const state = store.getState()

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
        })

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

        const storageMode = args.storageMode || StorageStrategyType.Browser
        const storageMan  = getStorageManager()

        return storageMan.isStrategyTypeAvailable(storageMode)
        .catch(e => {
          message.error(e.message)
          throw e
        })
        .then(() => {
          storageMan.setCurrentStrategyType(storageMode)
          return delay(() => {}, 1000)
        })
        .then(() => {
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
        })
      }

      case 'ADD_VISION_IMAGE': {
        const { dataUrl } = args
        const fileName    = `${randomName()}_dpi_${getScreenDpi()}.png`

        getStorageManager()
        .getVisionStorage()
        .write(fileName, dataURItoBlob(dataUrl))
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

function tryPreinstall () {
  storage.get('preinstall_info')
  .then(info => {
    const status = (() => {
      if (!info)  return 'fresh'

      const { askedVersions = [] } = info
      if (askedVersions.indexOf(config.preinstallVersion) === -1) return 'new_version_available'

      return 'up_to_date'
    })()

    switch (status) {
      case 'fresh':
        return store.dispatch(preinstall())

      case 'new_version_available':
        return store.dispatch(updateUI({ newPreinstallVersion: true }))

      case 'up_to_date':
      default:
        return false
    }
  })
}

function reloadResources () {
  bindMacroAndTestSuites()
  restoreCSV()
  restoreScreenshots()
  restoreVisions()

  setTimeout(() => {
    store.dispatch(resetEditing())
  }, 200)
}

function bindStorageModeChanged () {
  getStorageManager().on(StorageManagerEvent.StrategyTypeChanged, (type) => {
    reloadResources()
  })

  getStorageManager().on(StorageManagerEvent.RootDirChanged, (type) => {
    reloadResources()
  })

  getStorageManager().on(StorageManagerEvent.ForceReload, (type) => {
    reloadResources()
  })
}

function init () {
  bindMacroAndTestSuites()
  bindIpcEvent()
  bindWindowEvents()
  bindVariableChange()
  bindStorageModeChanged()
  initPlayer(store)
  restoreEditing()
  restoreConfig()
  restoreCSV()
  restoreScreenshots()
  restoreVisions()
  initSaveTestCase()
  tryPreinstall()

  csIpc.ask('I_AM_PANEL', {})

  document.title = document.title + ' ' + Ext.runtime.getManifest().version

  csIpc.ask('PANEL_CURRENT_PLAY_TAB_INFO')
  .then(updatePageTitle)

  render(App)
}

Promise.all([
  restoreConfig(),
  getXFile().getConfig()
])
.then(([config, xFileConfig]) => {
  // Note: This is the first call of getStorageManager
  // and it must passed in `getMacros` to make test suite work
  getStorageManager(config.storageMode, {
    getMacros: () => store.getState().editor.testCases
  })

  init()
}, init)
