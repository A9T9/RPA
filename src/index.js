/* global PREINSTALL_CSV_LIST PREINSTALL_VISION_LIST */

import React, { lazy } from 'react'
import ReactDOM from 'react-dom'
import { HashRouter } from 'react-router-dom'
import { ConfigProvider, message, LocaleProvider } from 'antd'
import en_US from "antd/lib/locale/en_US"
import HTML5Backend from 'react-dnd-html5-backend'
import { DndProvider } from 'react-dnd'
import FuzzySet from 'fuzzyset.js'
import semver from 'semver'

import globalConfig from './config'
import path from './common/lib/path'
import FileSaver from './common/lib/file_saver'
import { Provider, createStore, reducer, store } from './redux'
import { initPlayer } from './init_player'
import Ext from './common/web_extension'
import csIpc from './common/ipc/ipc_cs'
import { getStorageManager, StorageManagerEvent, StorageStrategyType } from './services/storage'
import { polyfillTimeoutFunctions } from './services/timeout/cs_timeout'
import { FlatStorageEvent } from './services/storage/flat/storage'
import { getXFile } from './services/xmodules/xfile'
import { getXLocal } from './services/xmodules/xlocal'
import { runDownloadLog } from './services/ocr'
import { commandWithoutBaseUrl } from './models/test_case_model'
import { normalizeTestSuite } from './models/test_suite_model'
import storage from './common/storage'
import { delay, randomName, dataURItoBlob, getPageDpi, parseQuery } from './common/utils'
import { parseBoolLike, flow, until, guardVoidPromise } from './common/ts_utils'
import { fromJSONString, fromHtml } from './common/convert_utils'
import * as C from './common/constant'
import log from './common/log'
import { renderLog } from './common/macro_log'
import { getVarsInstance } from './common/variables'
import { Player, getPlayer } from './common/player'
import getSaveTestCase from './components/save_test_case'
import { ocrLanguageOptions } from './services/ocr/languages'
import {
  setTestSuites,
  setEditing,
  setTimeoutStatus,
  updateConfig,
  addLog,
  clearLogs,
  doneInspecting,
  updateSelectedCommand,
  appendCommand,
  listCSV,
  listScreenshots,
  listVisions,
  editTestCase,
  playerPlay,
  upsertTestCase,
  setVariables,
  updateUI,
  resetEditingIfNeeded,
  preinstall,
  setMacrosExtra,
  setTestSuitesExtra,
  findSameNameMacro,
  findSameNameTestSuite,
  renameVisionImage,
  updateProxy,
  insertCommand
} from './actions'
import { getDownloadMan } from './common/download_man'
import { getMacroExtraKeyValueData } from './services/kv_data/macro_extra_data'
import { getMigrateMacroTestSuiteToBrowserFileSystem } from './services/migration/jobs/2019_04_01_macro_suite_storage'
import { getKantuMigrationService } from './services/migration'
import { MigrationJobType } from './services/migration/types'
import { Actions } from './actions/simple_actions'
import { getLogService } from './services/log';
import { getMacroFileNodeList, findMacroNodeWithCaseInsensitiveRelativePath, findMacroFolderWithCaseInsensitiveRelativePath, getShouldLoadResources, editorCommandCount, getIndexToInsertRecorded } from './recomputed'
import { RunBy } from './reducers/state'
import { getLicenseService } from './services/license'
import { handleDelegatedBrowserFileSystemAPI } from './services/storage/common/filesystem_delegate/delegate'
import { CaptureScreenshotService } from './common/capture_screenshot'
import { getIpcCache } from './common/ipc/ipc_cache'
import { activateTab } from './common/tab_utils'
import { onTimeoutStatus } from './ext/popup/timeout_counter'
import { checkIfSidePanelOpen } from './ext/common/sidepanel'
import interceptLog from './common/intercept_log'
import { createRoot } from 'react-dom/client'
import { isSidePanelWindow } from './common/utils'

const App = lazy(() => import('./app'));
const SidepanelApp = lazy(() => import('./sidepanel_app'));

interceptLog()

polyfillTimeoutFunctions(csIpc)

handleDelegatedBrowserFileSystemAPI()

let DefaultStorageMode =  StorageStrategyType.Browser

// TODO: uncomment/fix later
// const store = createStore(
//   reducer,
//   window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
// )

const captureScreenshotService = new CaptureScreenshotService({
  captureVisibleTab: (windowId, options) => csIpc.ask('PANEL_CAPTURE_VISIBLE_TAB', { windowId, options })
})

// FIXME: better not passing store via `window` object
window['store'] = store

//let isSidePanel = window.location.href.includes('sidepanel.html');

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
const render = () => root.render(
  <DndProvider backend={HTML5Backend}>
    <ConfigProvider locale={en_US}>
      <Provider store={store}>
        <HashRouter>
          { isSidePanelWindow() ? <SidepanelApp/> : <App /> }
        </HashRouter>
      </Provider>
    </ConfigProvider>
  </DndProvider>
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
    store.dispatch(Actions.setIsLoadingMacros(true))

    const pMacrosExtra = getMacroExtraKeyValueData().getAll()
    .then(data => {
      // log('restoreMacrosExtra', data)

      store.dispatch(
        setMacrosExtra(data)
      )
    })

    const pFolderStructure = (() => {
      if (!getShouldLoadResources(store.getState())) {
        return Promise.resolve()
      }

      return macroStorage.listR()
      .then(entryNodes => {
        // log('restoreMacroFolderStructure', entryNodes)

        store.dispatch(
          Actions.setMacroFolderStructure(entryNodes)
        )
      })
    })()

    return Promise.all([pMacrosExtra, pFolderStructure])
    .finally(() => store.dispatch(Actions.setIsLoadingMacros(false)))
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

  return flow(
    guardVoidPromise(restoreTestCases)
  );
}

// Note: editing is stored in localstorage
const restoreEditing = () => {
  return storage.get('editing')
    .then(editing => {
      if (!editing) return

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

// preset #210 
// uncomment the following line to activate it
// DefaultStorageMode =  StorageStrategyType.XFile


const restoreConfig = () => {
  return storage.get('config')
    .then(config => {
      const cfg = {
        showSidePanel: false,
        useDarkTheme: false,
        sidePanelOnLeft: false,
        anthropicAPIKey: '',
        aiComputerUseMaxLoops: 50,
        useInitialPromptInAiChat: true,
        aiChatSidebarPrompt: 'Describe what you see, in 10 words or less.',
        showSettingsOnStart: false,
        showSidebar: false,
        showBottomArea: true,
        playScrollElementsIntoView: true,
        playHighlightElements: true,
        playCommandInterval: 0.3,
        // selenium related
        saveAlternativeLocators: true,
        recordNotification: true,
        recordClickType: 'click',
        showTestCaseTab: true,
        logFilter: 'All',
        onErrorInLoop: 'continue_next_loop',
        // Run macros from outside
        allowRunFromBookmark: true,
        allowRunFromFileSchema: true,
        allowRunFromHttpSchema: true,
        // timeout in seconds
        timeoutPageLoad: 60,
        timeoutElement: 10,
        timeoutMacro: 0,
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
        storageMode: DefaultStorageMode,
        xmodulesStatus: 'unregistered',
        // orc related
        ocrCalibration: 6,
        ocrCalibration_internal:6,
        ocrScaling: 100,
        ocrEngine: 98,
        ocrMode: 'enabled', // 'disabled',
        ocrLanguage: 'eng',
        ocrLanguageOption: ocrLanguageOptions,
        ocrOfflineURL: '',
        ocrOfflineAPIKey: '',
        // vision related
        cvScope: 'browser',
        defaultVisionSearchConfidence: 0.6,
        useDesktopScreenCapture: true,
        waitBeforeDesktopScreenCapture: false,
        secondsBeforeDesktopScreenCapture: 3,
        // proxy related,
        defaultProxy: '',
        defaultProxyAuth: '',
        turnOffProxyAfterReplay: true,
        ...config,
      }
      store.dispatch(updateConfig(cfg))
      return cfg
    })
}

const restoreCSV = () => {
  if (!getShouldLoadResources(store.getState())) {
    return Promise.resolve()
  }

  // Note: just try to init storage. Eg. For browser fs, it will try to create root folder
  getStorageManager().getCSVStorage()
  return store.dispatch(listCSV())
}

const restoreScreenshots = () => {
  getStorageManager().getScreenshotStorage()
  return store.dispatch(listScreenshots())
}

const restoreVisions = () => {
  if (!getShouldLoadResources(store.getState())) {
    return Promise.resolve()
  }

  getStorageManager().getVisionStorage()
  return store.dispatch(listVisions())
}

const downloadTextFile = (text, fileName) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  FileSaver.saveAs(blob, fileName)
}

const prepareBeforeRun = (options) => {
  if (options.savelog) {
    store.dispatch(clearLogs())
  }
}

const genPlayerPlayCallback = ({ options,installed}) => {
  // Only run this callback once, we've added it to two places
  // 1. Player callback
  // 2. Promise finally of the entire macro run
  let alreadyRun = false;
  return (err, reason) => {
    if (alreadyRun) {
      return
    }

    alreadyRun = true

    let pSaveLog = delay(() => {}, 1000)
    
    if (options.savelog) {
      const isFullPath  = /\\|\//.test(options.savelog)
      
      const logs        = store.getState().logs
      const errorLog    = logs.find(log => log.type === 'error' && !(log.options && log.options.ignored))
      const error       = err || (errorLog && { message: errorLog.text })
      const logTitle    = error ? `Status=Error: ${error.message}` : `Status=OK`
      const logContent  = logs.map(log => renderLog(log, false))
      const text        = [logTitle, '###', ...logContent].join('\n')

      if (isFullPath) {              
        const ua = window.navigator.userAgent
        const path = options.savelog;

        function os() {
          if (/windows/i.test(ua))  return 'windows'
          if (/mac/i.test(ua))      return 'mac'
          return 'linux'
        }
        
        if (installed && installed!=undefined )  {
          let osType = os();
          runDownloadLog(text,path,osType)
          .then(data => {
            return getDownloadMan().prepareDownload(options.savelog)
          })          
        } else {
          pSaveLog = delay(() => {}, 500).then(() => {
            downloadTextFile(text, decodeURIComponent(options.savelog))
            // Note: We have to wait until savelog download completes if there is any
            return getDownloadMan().prepareDownload(options.savelog)
          })        
        }        
      } else {
        if (!isFullPath || !getStorageManager().isXFileMode()) {
          pSaveLog = delay(() => {}, 500).then(() => {
            downloadTextFile(text, decodeURIComponent(options.savelog))
            // Note: We have to wait until savelog download completes if there is any
            return getDownloadMan().prepareDownload(options.savelog)
          })
        } else {
        pSaveLog = getLogService().logTo(options.savelog, text)
        }            
      } 
    } 

    const closeBrowser  = parseBoolLike(options.closeBrowser, false)
    const closeRPA      = parseBoolLike(options.closeRPA !== undefined ? options.closeRPA : options.closeKantu, true)

    if (closeBrowser && reason !== Player.C.END_REASON.MANUAL) {
      // Close all tabs If close option is set
      pSaveLog
      .catch(e => {
        log.warn('Save log error: ', e.message)
      })
      .then(() => csIpc.ask('PANEL_CLOSE_ALL_WINDOWS', {}))
    }

    // Note: it's better to keep kantu open if it's opened manually before
    if (!err && reason === Player.C.END_REASON.COMPLETE && closeRPA && !closeBrowser) {
      // Close kantu panel
      setTimeout(() => {
        window.close()
      }, 1000)
    }
  }

  
}

const genOverrideScope = ({ options }) => {
  return Object.keys(options || {}).reduce((prev, key) => {
    const m = key.match(/^cmd_var(1|2|3)$/i)
    if (!m) return prev

    prev[`!CMD_VAR${m[1]}`] = options[key]
    return prev
  }, {})
}

const validParams = [
  'direct', 'closeBrowser', 'closeKantu', 'closeRPA', 'continueInLastUsedTab', 'nodisplay',
  'folder', 'savelog', 'storage', 'macro', 'testsuite', 'storageMode', 'loadmacrotree',
  'cmd_var1', 'cmd_var2', 'cmd_var3', 'cmd_var4', 'cmd_var5', 'cmd_var6',
  'cmd_var7', 'cmd_var8', 'cmd_var9', 'cmd_var10'
]

const fuzzyObj = new FuzzySet(validParams)

const initFromCommandLineArgs = (args) => {
  const loadMacroTree = parseBoolLike(args.loadmacrotree)
  const noDisplay     = parseBoolLike(args.nodisplay, false)

  if (loadMacroTree) {
    store.dispatch(Actions.setFrom(RunBy.Manual))
  }

  if (noDisplay) {
    store.dispatch(Actions.setNoDisplayInPlay(true))
  }
}

const guardCommandLineArgs = (args, storageMode) => {
  // Check params
  const keys = Object.keys(args)
  const checkName = (pattern, str) => {
    if (typeof pattern === 'string') {
      return pattern === str
    } else {
      return pattern.test(str)
    }
  }
  const checkValue = (name, value) => {
    switch (name) {
      case 'continueInLastUsedTab':
      case 'closeKantu':
      case 'closeRPA':
      case 'closeBrowser':
      case 'direct':
      case 'loadmacrotree':
      case 'nodisplay':
        if (/^0|1|true|false$/i.test(value)) {
          return true
        } else {
          throw new Error(`"${name}" should be 0, 1, true or false, but now it's ${value}`)
        }

      case 'storage':
        if (['browser', 'xfile'].indexOf(value) !== -1) {
          return true
        } else {
          throw new Error(`"${name}" should be either browser or xfile, but now it's ${value}`)
        }

      default:
        return true
    }
  }

  keys.forEach(key => {
    if (key.trim().length === 0) {
      return
    }

    const isValid = validParams.find(name => checkName(name, key))

    if (!isValid) {
      const match = fuzzyObj.get(key)
      const guess = !match || !match[0] || !match[0][1] ? '' : `, do you mean "${match[0][1]}"?`
      store.dispatch(addLog('warning', `Unknown command line parameter: "${key}"${guess}`))
    }

    try {
      checkValue(key, args[key])
    } catch (e) {
      store.dispatch(addLog('warning', `Invalid value for cmd line arg: ${e.message}`))
    }
  })
}

const bindIpcEvent = () => {
  const prepareByOptions = (options = {}) => {
    const lowerCaseOptions = Object.keys(options).reduce((prev, key) => {
      prev[key.toLowerCase()] = options[key]
      return prev
    }, {})

    if (parseBoolLike(lowerCaseOptions.continueinlastusedtab, false)) {
      return csIpc.ask('PANEL_CLOSE_CURRENT_TAB_AND_SWITCH_TO_LAST_PLAYED')
    } else {
      return Promise.resolve()
    }
  }

  const handleCommand = (cmd, args) => {
    // log(cmd, args)

    switch (cmd) {
      case 'PROXY_UPDATE': {
        store.dispatch(
          updateProxy(args.proxy)
        )
        return true
      }

      case 'OPEN_SETTINGS':
        store.dispatch(
          updateUI({ showSettings: true })
        )
        return true

      case 'INSPECT_RESULT':
        store.dispatch(doneInspecting())
        store.dispatch(updateSelectedCommand({
          target: args.locatorInfo.target,
          targetOptions: args.locatorInfo.targetOptions
        }))
        return true

      case 'RECORD_ADD_COMMAND':
        log('got add command', cmd, args)
        const state         = store.getState()
        const commandCount  = editorCommandCount(state)
        const recordIndex   = getIndexToInsertRecorded(state)
        const shouldSkip    = state.recorder.skipOpen && args.cmd === 'open'

        store.dispatch(Actions.toggleRecorderSkipOpen(false))

        if (shouldSkip) {
          return false
        }

        if (recordIndex > 0 && recordIndex <= commandCount) {
          store.dispatch(insertCommand(args, recordIndex, true))
        } else {
          store.dispatch(appendCommand(args, true))
        }

        return true
        case 'TIMEOUT_STATUS':
          if (store.getState().status !== C.APP_STATUS.PLAYER) {
            return
          }
          if (args.playUID && !getPlayer().checkPlayUID(args.playUID)) {
            return
          }
      
          store.dispatch(setTimeoutStatus(args))
          return true;
      case 'RUN_TEST_CASE': {
        if (store.getState().status !== C.APP_STATUS.NORMAL) {
          message.error('can only run macros when it is not recording or playing')
          return false
        }

        const { testCase, options } = args

        guardCommandLineArgs(options)
        initFromCommandLineArgs(options)

        const storageMan  = getStorageManager()
        const storageMode = testCase.storageMode || storageMan.getCurrentStrategyType()

        storageMan.isStrategyTypeAvailable(storageMode)
        .catch(e => {
          message.error(e.message)
          throw e
        })
        .then(() => {
          const needChange = storageMan.setCurrentStrategyType(storageMode)
          store.dispatch(updateConfig({ storageMode }))
          return needChange ? delay(() => reloadResources.onLastReloadFinished(), 100) : undefined
        })
        .then(() => prepareByOptions(options))
        .then(() => {
          const state = store.getState()
          const shouldLoadResources = getShouldLoadResources(state)

          if (!shouldLoadResources) {
            return Promise.resolve(true)
          }

          return new Promise((resolve) => {
            resolve(reloadResources.onLastReloadFinished ? reloadResources.onLastReloadFinished() : null)
          })
          .then(() => until('macros ready', () => {
            const state = store.getState()
            const macroNodes = getMacroFileNodeList(state)

            return {
              pass:   macroNodes && macroNodes.length > 0,
              result: true
            }
          }, 1000, 20 * 1000))
        })
        .then(() => {
          // Note: for backward compatibility, still use `name` field (which makes sense in flat fs mode) to store `path`
          // after we migrate to standard folder mode
          const state = store.getState()
          const shouldLoadResources = getShouldLoadResources(state)
          let macroPath = testCase.name

          if (shouldLoadResources) {
            const found = findMacroNodeWithCaseInsensitiveRelativePath(state, testCase.name)

            if (!found) {
              throw new Error(`Can't find macro with name "${testCase.name}"`)
            }

            macroPath = found.fullPath
          } else if (path.isAbsolute(macroPath) && getStorageManager().isXFileMode()) {
            const msg = [
              `Absolute path locations like "${macroPath}" are not supported yet. `,
              `Macro location must be relative to macro root folder (currently "${getXFile().getCachedConfig().rootDir}")`
            ].join('')

            throw new Error(msg)
          }

          const errorMsg = `No macro found with path '${macroPath}'`

          return storageMan.getMacroStorage().read(macroPath, 'Text')
          .then(
            macro => {
              if (!macro) {
                message.error(errorMsg)
                throw new Error(errorMsg)
              }

              return macro
            },
            (e) => {
              if (/File size cannot be determined.|A requested file or directory could not be found/.test(e.message)) {
                throw new Error(errorMsg)
              } else {
                return Promise.reject(e)
              }
            }
          )
          .then(tc => {
            getXLocal().getVersionLocal().then(data => {
            const { installed, version } = data
            const openTc  = tc.data.commands.find(item => item.cmd.toLowerCase() === 'open')

            prepareBeforeRun(options)

            const callback = genPlayerPlayCallback({ options,installed,version })

            store.dispatch(editTestCase(tc.id))
            store.dispatch(playerPlay({
              macroId: tc && tc.id,
              title: macroPath,
              extra: {
                id: tc && tc.id
              },
              mode:           Player.C.MODE.STRAIGHT,
              startIndex:     0,
              startUrl:       openTc ? openTc.target : null,
              resources:      tc.data.commands,
              postDelay:      state.player.playInterval * 1000,
              overrideScope:  genOverrideScope({ options }),
              callback:       callback
            }))
            .finally(callback)

            checkIfSidePanelOpen().then((isOpen) => {
              store.dispatch(updateUI({ sidebarTab: 'Macro' }))
            })
          })
        })
        })
        .catch(e => {
          store.dispatch(addLog('error', e.message))
        })

        return true
      }      

      case 'RUN_TEST_SUITE': {
        if (store.getState().status !== C.APP_STATUS.NORMAL) {
          message.error('can only run test suites when it is not recording or playing')
          return false
        }

        const { testSuite, options } = args

        guardCommandLineArgs(options)
        initFromCommandLineArgs(options)

        const storageMode = testSuite.storageMode || StorageStrategyType.Browser
        const storageMan  = getStorageManager()

        storageMan.isStrategyTypeAvailable(storageMode)
        .catch(e => {
          message.error(e.message)
          throw e
        })
        .then(() => {
          const needChange = storageMan.setCurrentStrategyType(storageMode)
          return needChange ? delay(() => {}, 1000) : undefined
        })
        .then(() => prepareByOptions(options))
        .then(() => {
          const state = store.getState()
          const shouldLoadResources = getShouldLoadResources(state)

          if (testSuite.macroFolder && testSuite.macroFolder.length > 0) {
            const pMacroNodes = (() => {
              if (shouldLoadResources) {
                return until('macros ready', () => {
                  const state = store.getState()
                  const macroNodes = getMacroFileNodeList(state)

                  return {
                    pass:   macroNodes && macroNodes.length > 0,
                    result: macroNodes
                  }
                }, 1000, 20 * 1000)
                .then(() => {
                  const folder = findMacroFolderWithCaseInsensitiveRelativePath(store.getState(), testSuite.macroFolder)
                  return (folder && folder.children) || []
                })
              }

              return storageMan.getMacroStorage().listR(testSuite.macroFolder)
              .then(nodes => nodes.filter(node => node.isFile))
            })()

            return pMacroNodes.then((foundNodes) => {
              const macroStorage = storageMan.getMacroStorage()
              const dirPath      = macroStorage.dirPath(testSuite.macroFolder.replace(/\\/g, '/'))
              const path         = macroStorage.getPathLib()
              const folderName   = path.basename(dirPath)

              if (foundNodes.length === 0) {
                throw new Error(`No folder found for ${testSuite.macroFolder}, or no macro found in it`)
              }

              prepareBeforeRun(options)

              getPlayer({ name: 'testSuite' }).play({
                title:      folderName,
                mode:       getPlayer().C.MODE.STRAIGHT,
                startIndex: 0,
                resources:  foundNodes.map(item => ({
                  id:       item.fullPath,
                  loops:    1
                })),
                extra: {
                  id:   dirPath,
                  name: folderName
                },
                public: {
                  scope: genOverrideScope({ options })
                },
                callback: genPlayerPlayCallback({ options })
              })
            })
          }

          if (testSuite.name && testSuite.name.length > 0) {
            const pTestSuite = (() => {
              if (shouldLoadResources) {
                return until('testSuites ready', () => {
                  const state = store.getState()
                  const { testSuites } = state.editor

                  return {
                    pass:   testSuites && testSuites.length > 0,
                    result: true
                  }
                })
                .then(() => {
                  const state = store.getState()
                  return findSameNameTestSuite(testSuite.name, state.editor.testSuites)
                })
              }

              return storageMan.getTestSuiteStorage().read(testSuite.name, 'Text')
            })()

            return pTestSuite.then((ts) => {
              if (!ts) {
                message.error(`no macro found with name '${testSuite.name}'`)
                return false
              }

              prepareBeforeRun(options)

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
                public: {
                  scope: genOverrideScope({ options })
                },
                callback: genPlayerPlayCallback({ options })
              })

              return store.dispatch(updateUI({ sidebarTab: 'test_suites' }))
            })
          }
        })
        .catch(e => {
          store.dispatch(addLog('error', e.message))
        })

        return true
      }
      
      case 'IMPORT_AND_RUN': {
        const { options } = args
        let testCase

        if (args.html) {
          try {
            testCase = fromHtml(args.html)
          } catch (e) {
            message.error('Failed to parse html', 1.5)
            return false
          }
        }

        if (args.json) {
          try {
            const jsonStr = typeof args.json === 'string' ? args.json : JSON.stringify(args.json)
            testCase = fromJSONString(jsonStr)
          } catch (e) {
            message.error('Failed to parse json', 1.5)
            return false
          }
        }

        if (!testCase) {
          message.error('Nothing to import')
          return false
        }

        guardCommandLineArgs(options)

        const storageMode = args.storageMode || StorageStrategyType.Browser
        const storageMan  = getStorageManager()

        return storageMan.isStrategyTypeAvailable(storageMode)
        .catch(e => {
          message.error(e.message)
          throw e
        })
        .then(() => {
          const needChange = storageMan.setCurrentStrategyType(storageMode)
          return needChange ? delay(() => {}, 1000) : undefined
        })
        .then(() => prepareByOptions(options))
        .then(() => {
          const state = store.getState()
          const shouldLoadResources = getShouldLoadResources(state)

          if (!shouldLoadResources) {
            return Promise.resolve(true)
          }

          return new Promise((resolve) => {
            resolve(reloadResources.onLastReloadFinished ? reloadResources.onLastReloadFinished() : null)
          })
          .then(() => {
            return until('macros ready', () => {
              const state = store.getState()
              const macroNodes = getMacroFileNodeList(state)

              return {
                pass:   macroNodes && macroNodes.length > 0,
                result: true
              }
            }, 1000, 20 * 1000)
          })
        })
        .then(() => {
          return store.dispatch(upsertTestCase(testCase))
          .then(() => store.dispatch(editTestCase(testCase.name)))
          .then((macro) => {
              const state = store.getState()
              const openTc = macro.data.commands.find(command => command.cmd.toLowerCase() === 'open')

              store.dispatch(playerPlay({
                macroId: macro.id,
                title: macro.name,
                extra: {
                  id: macro.id
                },
                mode:           Player.C.MODE.STRAIGHT,
                startIndex:     0,
                startUrl:       openTc ? openTc.target : null,
                resources:      macro.data.commands,
                postDelay:      state.player.playInterval * 1000,
                overrideScope:  genOverrideScope({ options }),
                callback:       genPlayerPlayCallback({ options })
              }))
              return true
          })
          .catch(e => {
            log.error(e.stack)
            throw e
          })
        })
      }

      case 'ADD_VISION_IMAGE': {
        const { dataUrl, requireRename = false } = args
        const fileName    = `${randomName()}_dpi_${getPageDpi()}.png`

        return getStorageManager()
        .getVisionStorage()
        .write(fileName, dataURItoBlob(dataUrl))
        .then(restoreVisions)
        .then(() => {
          if (!requireRename) return { fileName }

          return store.dispatch(
            renameVisionImage(fileName)
          )
          .then(fileName => {
            restoreVisions()
            return { fileName }
          })
        })
      }

      case 'RESTORE_SCREENSHOTS': {
        restoreScreenshots()
        return true
      }

      case 'UPDATE_ACTIVE_TAB': {
        updatePageTitle(args)
        return true
      }

      case 'IS_ACTIVE': {
        return true
      }

      case 'ADD_LOG': {
        if (!args)          return false
        if (args.info)      store.dispatch(addLog('info', args.info, args.options))
        if (args.warning)   store.dispatch(addLog('warning', args.warning))
        if (args.error)     store.dispatch(addLog('error', args.error))

        return true
      }

      case 'SCREEN_AREA_SELECTED': {
        return captureScreenshotService.captureScreenInSelectionSimple(
          args.tabId,
          {
            rect: args.rect,
            devicePixelRatio: args.devicePixelRatio
          }
        )
        .then(dataUrl => {
          return handleCommand('ADD_VISION_IMAGE', { dataUrl, requireRename: false })
        })
      }

      case 'STORE_SCREENSHOT_IN_SELECTION': {
        const { tabId, rect, devicePixelRatio, fileName } = args

        return getIpcCache().get(tabId).then(ipc => {
          return activateTab(tabId, true)
          .then(() => delay(() => {}, C.SCREENSHOT_DELAY))
          .then(() => captureScreenshotService.captureScreenInSelection(tabId, { rect, devicePixelRatio }, {
            startCapture: () => {
              return ipc.ask('START_CAPTURE_FULL_SCREENSHOT', { hideScrollbar: false })
            },
            endCapture: (pageInfo) => {
              return ipc.ask('END_CAPTURE_FULL_SCREENSHOT', { pageInfo })
            },
            scrollPage: (offset) => {
              return ipc.ask('SCROLL_PAGE', { offset })
            }
          }))
          .then(dataUrl => {
            return getStorageManager().getScreenshotStorage()
            .overwrite(fileName, dataURItoBlob(dataUrl))
            .then(() => {
              handleCommand('RESTORE_SCREENSHOTS')
              return fileName
            })
          })
        })
      }
    }
  }

  csIpc.onAsk(handleCommand)

  // It's for the call from popup page
  window.handleCommand = handleCommand
}

const bindWindowEvents = () => {
  // reset status to normal when panel closed
  window.addEventListener('beforeunload', () => {
    csIpc.ask('PANEL_STOP_RECORDING', {})
    csIpc.ask('PANEL_STOP_PLAYING', {})
  })

  window.addEventListener('resize', () => {
    // if sidepanel return, we need to update the size
    // const isSidePanel = window.location.href.includes('sidepanel.html')
    if (isSidePanelWindow()) {
      return
    }

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

  window.addEventListener('message', (e) => {
    switch (e.data && e.data.type) {
      case 'RELOAD_VISIONS':
        return store.dispatch(listVisions())
    }
  })

  onTimeoutStatus((payload) => {
    if (store.getState().status !== C.APP_STATUS.PLAYER) {
      return
    }
    if (payload.playUID && !getPlayer().checkPlayUID(payload.playUID)) {
      return
    }

    store.dispatch(setTimeoutStatus(payload))
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
  return storage.get('preinstall_info')
  .then(info => {
    const status = (() => {
      if (!info)  return 'fresh'

      const { askedVersions = [] } = info
      if (askedVersions.indexOf(globalConfig.preinstall.version) === -1) return 'new_version_available'

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
  const p = bindMacroAndTestSuites()
  .then(() => {
    return flow(
      guardVoidPromise(restoreCSV),
      guardVoidPromise(restoreVisions),
      guardVoidPromise(restoreScreenshots),
      guardVoidPromise(() => store.dispatch(resetEditingIfNeeded()))
    )
  })

  reloadResources.onLastReloadFinished = (callback) => callback ? p.then(callback) : p
  return p
}

function checkXFileVersion () {
  return getXFile().getVersion()
  .then(versionInfo => {
    if (!versionInfo.version) {
      return
    }

    if (semver.lt(versionInfo.version, globalConfig.xfile.minVersionToReadBigFile)) {
      const msg = `Can not read/save screenshot on hard-drive. Please upgrade FileAccess XModule to latest version (>= ${globalConfig.xfile.minVersionToReadBigFile}).`

      message.warn(msg)
      store.dispatch(addLog('warning', msg))
    }
  })
}

function bindStorageModeChanged () {
  let first = true

  getStorageManager().on(StorageManagerEvent.StrategyTypeChanged, (type) => {
    if (first) {
      first = false
      return
    }

    try {
      const p = (() => {
        if (type === StorageStrategyType.XFile) {
          return checkXFileVersion()
        }

        return Promise.resolve()
      })()

      p
      .then(reloadResources)
      .then(() => {
        store.dispatch(Actions.selectInitialMacro(type))
      })
    } catch (e) {
      log.warn(e)
    }
  })

  getStorageManager().on(StorageManagerEvent.RootDirChanged, (type) => {
    reloadResources()
  })

  getStorageManager().on(StorageManagerEvent.ForceReload, (type) => {
    reloadResources()
  })
}

function remedyMigrationIfNeeded () {
  const todo = []
  const shouldRemedyMacroFsMigration = getMigrateMacroTestSuiteToBrowserFileSystem().shouldMigrate() &&
                                        !getKantuMigrationService().isMigrated(MigrationJobType.MigrateMacroTestSuiteToBrowserFileSystem)

  if (shouldRemedyMacroFsMigration || globalConfig.forceMigrationRemedy) {
    alert(`Kantu introduced an internal storage migration in this version. It isn't supposed to disturb you, but looks like there is some unexpected error: \n\n=> Solution: After you click OK Kantu is going to download your macros and test suites from the old storage into a ZIP file. You can then manually import the macros back into the new Kantu version.\n\nIf you see this dialog, please also inform us at team@a9t9.com or in the user forum about the issue.`)
    todo.push(() => getMigrateMacroTestSuiteToBrowserFileSystem().remedy())
  }

  return flow(...todo)
}

function initFromQuery () {
  const queries = parseQuery(window.location.search)

  store.dispatch(Actions.setFrom(queries.from || RunBy.Manual))

  if (queries.settings) {
    store.dispatch(updateUI({
      showSettings: true
    }))
  }
}

function initProxyState () {
  csIpc.ask('PANEL_GET_PROXY')
  .then(proxy => {
    store.dispatch(
      updateProxy(proxy)
    )
  })
}

function init () {
  initFromQuery()
  bindIpcEvent()
  bindWindowEvents()
  bindVariableChange()
  bindStorageModeChanged()
  initPlayer(store)
  restoreEditing()
  restoreConfig()
  initSaveTestCase()
  initProxyState()

  tryPreinstall()
  .catch((e) => {
    log.warn('Error in preinstall', e)
  })
  .then(() => {
    reloadResources()
  })

  setTimeout(() => {
    remedyMigrationIfNeeded()
  }, 1000)

  csIpc.ask('I_AM_PANEL', {})

  document.title = document.title + ' ' + Ext.runtime.getManifest().version

  csIpc.ask('PANEL_CURRENT_PLAY_TAB_INFO')
  .then(updatePageTitle)

  storage.get('config')
  .then(config => {
    if (config && config.useDarkTheme) {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    render(config)    
  })
}

Promise.all([
  restoreConfig(),
  getXFile().getConfig(),
  getLicenseService().getLatestInfo()
])
.then(([config, xFileConfig]) => {
  // Note: This is the first call of getStorageManager
  // and it must passed in `getMacros` to make test suite work
  getStorageManager(config.storageMode, {
    getConfig: () => store.getState().config,
    getMacros: () => getMacroFileNodeList(store.getState()),
    getMaxMacroCount: (strategyType) => {
      const count = (() => {
        switch (strategyType) {
          case StorageStrategyType.XFile:
            return getLicenseService().getMaxXFileMacros()

          case StorageStrategyType.Browser:
          default:
            return Infinity
        }
      })()

      return Promise.resolve(count)
    }
  })

  init()
}, init)
