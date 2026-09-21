import { usageStatisticsDefault } from '@/services/usage/preferences'
import { migrateInvokeConfig } from './common/invoke_policy'
import { withDebugger } from './common/debugger'
/* global PREINSTALL_CSV_LIST PREINSTALL_VISION_LIST */

import React, { lazy } from 'react'
import ReactDOM from 'react-dom'
import { HashRouter } from 'react-router-dom'
import { ConfigProvider, message } from 'antd'
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
import { PREINSTALL_ROOT_FOLDER } from './config/preinstall_macros'
import { polyfillTimeoutFunctions } from './services/timeout/cs_timeout'
import { FlatStorageEvent } from './services/storage/flat/storage'
import { getXFile } from './services/xmodules/xfile'
import { getXLocal } from './services/xmodules/xlocal'
import { runDownloadLog } from './services/ocr'
import { commandWithoutBaseUrl } from './models/test_case_model'
import storage from './common/storage'
import { delay, randomName, dataURItoBlob, getPageDpi, parseQuery } from './common/utils'
import { parseBoolLike, flow, until, guardVoidPromise } from './common/ts_utils'
import { fromJSONString, fromHtml } from './common/convert_utils'
import { runScript } from './modules/script_runner'
import * as C from './common/constant'
import log from './common/log'
import { renderLog } from './common/macro_log'
import { getVarsInstance } from './common/variables'
import { Player, getPlayer } from './common/player'
import getSaveTestCase from './components/save_test_case'
import { ocrLanguageOptions } from './services/ocr/languages'
import {
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
  installWelcomeMacro,
  restoreDemoMacros,
  setMacrosExtra,
  findSameNameMacro,
  renameVisionImage,
  updateProxy,
  insertCommand,
  updateEditingScript
} from './actions'
import { recordedCommandToJs } from './common/recorded_command_to_js'
import { getDownloadMan } from './common/download_man'
import { getMacroExtraKeyValueData } from './services/kv_data/macro_extra_data'
import { getMigrateMacroTestSuiteToBrowserFileSystem } from './services/migration/jobs/2019_04_01_macro_suite_storage'
import { getKantuMigrationService } from './services/migration'
import { MigrationJobType } from './services/migration/types'
import { Actions } from './actions/simple_actions'
import { getLogService } from './services/log';
import { getMacroFileNodeList, findMacroNodeWithCaseInsensitiveRelativePath, findMacroFolderWithCaseInsensitiveRelativePath, getShouldLoadResources, editorCommandCount, getIndexToInsertRecorded, isScriptViewActive } from './recomputed'
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
import { getState as getBgState } from './ext/common/global_state'
import { installGoUivLinkDecorator } from './common/uiv_link'
import { isDevTestBrowser } from './services/mcp_bridge'

const App = lazy(() => import('./app'));
const SidepanelApp = lazy(() => import('./sidepanel_app'));

interceptLog()

// tag help links with gui=sidebar|ide + version — usage stats on go.ui.vision
// tell us which interface users actually prefer
installGoUivLinkDecorator()

polyfillTimeoutFunctions(csIpc)

handleDelegatedBrowserFileSystemAPI()

// TEST-ONLY (js-macro-test1): handle jsdev hooks BEFORE any panel IPC —
// a second "panel" page (sidepanel.html opened as a tab for testing) can
// hang in the IPC handshake below, so the reload hook must not wait for it.
// The early title stamp distinguishes "page loaded" from "init completed".
if (isSidePanelWindow() && /[?&]jsdev_/.test(window.location.search)) {
  document.title = 'JSDEV|page-loaded'
  if (/[?&]jsdev_reload=1/.test(window.location.search)) {
    document.title = 'JSDEV|reloading'
    setTimeout(() => Ext.runtime.reload(), 100)
  }
}

let DefaultStorageMode =  StorageStrategyType.Browser

// TODO: uncomment/fix later
// const store = createStore(
//   reducer,
//   window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
// )

const captureScreenshotService = new CaptureScreenshotService({
  captureVisibleTab: (windowId, options) => csIpc.ask('PANEL_CAPTURE_VISIBLE_TAB', { windowId, options }),
  onThrottleWait: (waitMs) => {
    store.dispatch(addLog('warning', `W370: Screenshot rate limit reached — waited ${waitMs}ms for the next screenshot slot (Chrome allows ~2 captures/sec). Visual/OCR steps in tight loops are slowed down by this; consider adding a pause between them.`))
  }
})

// FIXME: better not passing store via `window` object
window['store'] = store

//let isSidePanel = window.location.href.includes('sidepanel.html');

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript

// Fresher look for the side panel via antd v5 design tokens (rounded corners,
// softer borders). Scoped to the side panel window so the IDE keeps its look.
const sidePanelTheme = {
  token: {
    borderRadius: 8,
    controlHeight: 30,
    colorBorder: '#d9dde3',
    colorPrimary: '#1a6ce0'
  }
}

const render = () => root.render(
  <DndProvider backend={HTML5Backend}>
    <ConfigProvider locale={en_US} theme={isSidePanelWindow() ? sidePanelTheme : undefined}>
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
      // Note: an existing install has a previously persisted config; a fresh install has none.
      // Used to give new installs sidebar-first defaults without changing existing setups.
      const isExistingInstall = !!(config && Object.keys(config).length > 0)

      const cfg = {
        // "This config was created by a first run, not restored" — read by
        // bg.js initUpgradeDetectionByVersion to tell a just-born config from
        // a genuine pre-existing profile. Needed because on Firefox the
        // sidebar auto-opens at install (open_at_install) and this very write
        // RACES the background's fresh-install check, which used to misread
        // the brand-new profile as an upgrade and skip the welcome page.
        // ...config merges last, so a stored value always wins.
        configBornFresh: !isExistingInstall,
        // Note: side panel is the default entry point for new installs (sidebar-first UI).
        // Existing installs keep whatever value is already stored in config.
        showSidePanel: true,
        // The JS editor is always available; the only switch is whether the
        // classic command table is shown too (Settings > General). EXISTING
        // installs get it, because someone who upgrades and cannot find their
        // table macros will reasonably assume the upgrade ate them. New
        // installs get JS only.
        showClassicMacros: isExistingInstall,
        // false until the one-time "which editor(s)?" dialog has been answered
        // (macro_setup_dialog.js). Upgrading users need to be TOLD their
        // macros are still there; new users get the recommendation.
        macroSetupDone: false,
        useDarkTheme: false,
        sidePanelOnLeft: false,
        anthropicAPIKey: '',
        // custom system prompt for the sidebar AI chat (macro assistant);
        // empty = use the built-in default from macro_agent/service.ts
        aiMacroAgentSystemPrompt: '',
        // DEV: send this build's prompt on the Ui.Vision tier instead of the
        // server-served one — for testing prompt edits without a proxy deploy
        aiDevLocalPrompt: false,
        showSidebar: false,
        showBottomArea: true,
        playScrollElementsIntoView: true,
        playHighlightElements: true,
        // desktop automation overlays (Windows; drawn by the xmodule2 host):
        // display border while automation runs + bounding boxes around
        // image/OCR matches — see services/desktop_border.ts
        playDesktopAnimations: true,
        // sub-option: skip DWM capture-exclusion so the overlays show in
        // RDP/screen-sharing streams — and consequently in screenshots and
        // OCR/vision captures too
        desktopBorderCaptureVisible: false,
        // command interval: fast (no delay) is the default since the 2026-07
        // settings cleanup; the setting itself moved to Settings > Advanced
        playCommandInterval: 0,
        // selenium related
        saveAlternativeLocators: true,
        recordNotification: true,
        showTestCaseTab: true,
        logFilter: 'All',
        onErrorInLoop: 'continue_next_loop',
        // Run macros from outside
        allowRunFromBookmark: true,
        allowRunFromFileSchema: true,
        allowRunFromHttpSchema: false,
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
        // vision related
        cvScope: 'browser',
        defaultVisionSearchConfidence: 0.6,
        useDesktopScreenCapture: true,
        // proxy related,
        defaultProxy: '',
        defaultProxyAuth: '',
        turnOffProxyAfterReplay: true,
        ...config,
      }

      cfg.shareUsageStatistics = usageStatisticsDefault(cfg)
      Object.assign(cfg, migrateInvokeConfig(cfg))

      // Migration from the single jsFirstMode checkbox to the pair above.
      // Anyone who had explicitly turned JS-first OFF wanted the classic views,
      // so honour that; ON meant JS only. Runs once — jsFirstMode is dropped
      // afterwards so this cannot re-apply over a later choice.
      if (config && config.jsFirstMode !== undefined) {
        cfg.showClassicMacros = config.jsFirstMode === false
        delete cfg.jsFirstMode
      }

      // Dev/test browsers get the MCP bridge ON by default (user decision
      // 2026-08-18), the same detection that waives the pairing token: on a
      // dev rig the bridge is wanted and the switch is pure friction. Only
      // when the switch was never touched — ...config merged above, so an
      // explicit OFF is a stored false and wins; store installs in end-user
      // browsers are not 'development' and keep the opt-in default.
      const maybeDefaultBridgeOn = cfg.mcpBridgeEnabled === undefined
        ? isDevTestBrowser().then(dev => { if (dev) cfg.mcpBridgeEnabled = true })
        : Promise.resolve()

      return maybeDefaultBridgeOn.then(() => {
        store.dispatch(updateConfig(cfg))
        // OPEN-ISSUES 38: shared settings.json / keys.json in the home folder
        // win over this copy when newer (only once the module answers)
        import('@/services/xmodules2/routing').then(r => r.probeXModules2()).then(active => {
          if (!active) return
          return import('@/services/shared_settings').then(s => s.pullSharedSettings(store.getState().config, patch => store.dispatch(updateConfig(patch))))
        }).catch(() => {})
        return cfg
      })
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

    // Note: it's better to keep kantu open if it's opened manually before.
    // closeRPA closes only what the run opened: the IDE window always (it
    // exists for the run), the side panel only when the background auto-
    // opened it for this bookmark run (tryOpenSidePanelForRun sets
    // sidePanelAutoOpenedForRun) — a panel the user had docked before the
    // bookmark click stays open. window.close() from inside the Chrome side
    // panel document closes the panel; on Firefox the sidebar cannot be
    // closed programmatically outside a user gesture, and the flag is never
    // set there.
    if (!err && reason === Player.C.END_REASON.COMPLETE && closeRPA && !closeBrowser) {
      const closeAfterDebuggerCleanup = () => {
        setTimeout(() => {
          withDebugger.detachNow().then(() => window.close()).catch(e => {
            log.warn('Debugger cleanup failed; keeping the panel open: ', e.message)
          })
        }, 1000)
      }
      if (!isSidePanelWindow()) {
        // Close kantu panel
        closeAfterDebuggerCleanup()
      } else {
        getBgState().then(state => {
          if (state && state.sidePanelAutoOpenedForRun) {
            closeAfterDebuggerCleanup()
          }
        }).catch(() => { /* background state unavailable — keep the panel */ })
      }
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

const validParams = C.INVOKE_URL_PARAMS

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
      // a line for the panel log from the background (e.g. "content script
      // re-injected" after an extension reload — ext/common/tab.ts)
      // Two payload shapes arrive here: {type, text} from the background
      // and {info | warning | error} from content scripts via CS_ADD_LOG
      // (the "secondary locator" warning, the aria-expanded hint of 30.5).
      // A second `case 'ADD_LOG'` further down used to handle the latter,
      // but a switch takes the FIRST match — every content-script warning
      // came out as an empty "[info]" line since this case was added.
      case 'ADD_LOG': {
        if (!args) return false
        if (args.info)    store.dispatch(addLog('info', args.info, args.options))
        if (args.warning) store.dispatch(addLog('warning', args.warning))
        if (args.error)   store.dispatch(addLog('error', args.error))
        if (args.text || args.type) store.dispatch(addLog(args.type || 'info', String(args.text || '')))
        return true
      }

      case 'PROXY_UPDATE': {
        store.dispatch(
          updateProxy(args.proxy)
        )
        return true
      }

      case 'INSPECT_RESULT':
        store.dispatch(doneInspecting())
        // JS script view open (explicitly via dev mode, or through JS-first
        // routing): route the picked locator to the script editor (inserted
        // at the cursor) instead of the edit form's Target field
        if (isScriptViewActive(store.getState())) {
          store.dispatch(updateUI({
            scriptPickedLocator: {
              target: args.locatorInfo.target,
              at: Date.now()
            }
          }))
          return true
        }
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

        // JS editor open: the recorded action lands as a uiv.* line appended
        // to the open script (the editor mirrors editing.script live) —
        // recording never touches the command table in this mode
        if (isScriptViewActive(state)) {
          const script = typeof state.editor.editing.script === 'string'
            ? state.editor.editing.script
            : ''
          const sep = script.length === 0 || /\n$/.test(script) ? '' : '\n'
          store.dispatch(updateEditingScript(script + sep + recordedCommandToJs(args) + '\n'))
          return true
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

            // JS script macros carry their program in `script` and an empty
            // command table — the player would "play" that empty table and
            // report success after 0.00s. Route them to the script runner,
            // the same path as the editor's Run button. closeRPA / savelog /
            // closeBrowser reuse the player callback; cmd_varN reach the
            // script via seedVars, set after the runner's variable reset.
            if (tc.data && typeof tc.data.script === 'string' && tc.data.script.trim()) {
              prepareBeforeRun(options)

              const callback = genPlayerPlayCallback({ options, installed, version })

              store.dispatch(editTestCase(tc.id))
              checkIfSidePanelOpen().then(() => {
                store.dispatch(updateUI({ sidebarTab: 'Macro' }))
              })

              return runScript(tc.data.script, { seedVars: genOverrideScope({ options }) })
              .then(({ ok, error }) => {
                if (ok) return callback(null, Player.C.END_REASON.COMPLETE)
                if (error === 'Script stopped') return callback(new Error(error), Player.C.END_REASON.MANUAL)
                return callback(new Error(error || 'Script failed'))
              }, callback)
            }

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
                  // FILES only, subfolders included — this branch used to
                  // return direct children unfiltered (folder entries too),
                  // while the storage branch below has always used the
                  // recursive listR + isFile filter
                  const collectFiles = (node) => (node.children || []).reduce(
                    (acc, child) => child.isFile
                      ? (acc.push(child), acc)
                      : acc.concat(collectFiles(child)),
                    []
                  )
                  return folder ? collectFiles(folder) : []
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
            // Note: saved test suites were removed; only folder-based
            // test suites (folder=... in the command line) are supported
            message.error(`Test suites are no longer supported. Use folder=... to play all macros in a folder.`)
            return false
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

// A fresh install starts with THREE macros at the tree root — the welcome
// tour "A short welcome tour.js", "Like Ui.Vision？Give us a star 🌟.js" and
// "Draw a cat🐱.js" — plus the full JS demo set in the "Demo and QA Test
// Scripts" folder (with its csv/vision resources). The folder starts
// collapsed (see getFolded in recomputed/index.ts), so the root macros stay
// in view. The CLASSIC demo set is never auto-installed; it arrives only via
// Settings > General > "For Tech Support/QA" > Restore Demo Macros (Classic),
// into "Demo and QA Test Scripts (Classic)". The version marker is still
// written, so installs that predate this keep their upgrade history
// consistent and the sets are written only once, not on every startup.
function installFreshMacroSet () {
  return store.dispatch(installWelcomeMacro())
  .then(() => store.dispatch(restoreDemoMacros('js')))
}

// Does "Demo and QA Test Scripts" exist in the CURRENT macro storage? A
// backend that is not usable (hard-drive mode without a root) counts as "no".
function demoFolderExists () {
  try {
    const macroStorage = getStorageManager().getMacroStorage()
    const p = macroStorage.getPathLib()
    return Promise.resolve(macroStorage.directoryExists(p.join(globalConfig.preinstall.macroFolder, PREINSTALL_ROOT_FOLDER)))
    .catch(() => false)
  } catch (e) {
    return Promise.resolve(false)
  }
}

function tryPreinstall () {
  return storage.get('preinstall_info')
  .then(info => {
    const askedVersions = (info && info.askedVersions) || []
    const thisVersion = globalConfig.preinstall.version
    if (askedVersions.indexOf(thisVersion) !== -1) return false

    // Fresh install: welcome macros + the JS demo set. Existing install with
    // a new demo-set version: the JS demo folder is rewritten from the
    // shipped set (delete + write, like the Settings restore button) - but
    // ONLY while that folder still exists. A user who deleted it said no to
    // the demos; they come back only through Settings > Advanced > Replay >
    // Restore Demo Macros (rule 2026-09-16, replaces the overwrite option).
    const installOnFresh = !info
      ? installFreshMacroSet()
      : demoFolderExists().then(exists => (
        exists
          ? store.dispatch(restoreDemoMacros('js'))
            .then(() => log('demo macros rewritten for demo-set version ' + thisVersion))
          : log('demo folder absent - not recreated for demo-set version ' + thisVersion + ' (Restore Demo Macros brings it back)')
      ))

    // The version marker is written ONLY after the install actually
    // succeeded. It used to be written unconditionally, with the failure
    // swallowed by a .catch right here — so one transient error (a storage
    // backend that was not ready yet, a hard-drive root that did not exist)
    // left the profile permanently marked as "already offered" and the user
    // never got the demos, on this or any later start.
    return installOnFresh.then(() => storage.set('preinstall_info', {
      ...(info || {}),
      askedVersions: [...askedVersions, thisVersion]
    }))
  })
}

// The macro set above is written into ONE storage backend — whichever is
// current when it runs, which on a fresh install is always browser storage.
// Installing the FileAccess XModule and switching Storage Mode to "File
// system (on hard drive)" therefore drops the user into a backend nobody
// ever seeded: empty macro tree, no welcome tour, no demos, no csv/vision
// resources for the demos to find. That is the "XModules installed, no demo
// macros" report — nothing failed, the demos were simply written somewhere
// else. So seed a backend the first time it is selected, and remember it in
// preinstall_info.seededModes so this happens at most once per backend.
//
// The install only fires while the backend's macro tree is still EMPTY, so
// an existing hard-drive library is never written into; a backend that
// already holds macros is just recorded as seeded.
function ensureStorageModeSeeded (type) {
  if (type !== StorageStrategyType.Browser && type !== StorageStrategyType.XFile) {
    return Promise.resolve()
  }

  const markSeeded = () => storage.get('preinstall_info')
  .then(cur => storage.set('preinstall_info', {
    ...(cur || {}),
    seededModes: [...new Set([...((cur && cur.seededModes) || []), type])]
  }))

  return storage.get('preinstall_info')
  .then(info => {
    const seededModes = (info && info.seededModes) || []
    if (seededModes.indexOf(type) !== -1) return

    // listR throws when the backend is not usable at all (hard-drive mode
    // with no reachable root dir) — that is not the moment to seed it
    return getStorageManager().getMacroStorage().listR()
    .then(entryNodes => {
      if (entryNodes && entryNodes.length > 0) return markSeeded()

      log(`seeding demo macros into '${type}' storage`)
      return installFreshMacroSet().then(markSeeded)
    })
  })
  .catch(e => {
    log.warn(`could not seed '${type}' storage: ${e && e.message}`)
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
      // seed BEFORE reloading, so a backend selected for the first time
      // shows its starter macros in the very first tree render
      .then(() => ensureStorageModeSeeded(type))
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

  // Follow storage changes made in OTHER extension pages. The settings page
  // (options.html) has its own StorageManager singleton whose events never
  // leave that page — so a mode switch or "Reload files" there used to change
  // nothing here (field report 2026-08-27). Two signals arrive through the
  // persisted config instead:
  // - config.storageMode changed: switch the LOCAL manager; that fires the
  //   StrategyTypeChanged handler above (seed + reload + select macro).
  // - config.storageReloadNonce bumped (requestCrossPageForceReload): turn it
  //   into a local ForceReload.
  storage.addListener((changes) => {
    const change = (changes || []).find(c => c.key === 'config')
    if (!change || !change.newValue) return
    const oldCfg = change.oldValue || {}

    const newMode = change.newValue.storageMode
    if (newMode && newMode !== oldCfg.storageMode &&
        newMode !== getStorageManager().getCurrentStrategyType()) {
      try {
        getStorageManager().setCurrentStrategyType(newMode)
      } catch (e) {
        log.warn('could not follow storage mode change from another page', e)
      }
    }

    const nonce = change.newValue.storageReloadNonce
    if (nonce && nonce !== oldCfg.storageReloadNonce) {
      getStorageManager().emit(StorageManagerEvent.ForceReload)
    }
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
  // covers the profile that STARTS in hard-drive mode (the mode is
  // persisted, so no StrategyTypeChanged fires on a later start)
  .then(() => ensureStorageModeSeeded(getStorageManager().getCurrentStrategyType()))
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

    // TEST-ONLY (js-macro-test1): URL-param hooks so automation can reload
    // the extension and smoke-test the JS script runner — see script_dev_hooks
    if (isSidePanelWindow()) {
      import('./modules/script_dev_hooks')
        .then(m => m.initScriptDevHooks())
        .catch(() => { /* dev hooks are best-effort */ })
    }
  })
}

// getStorageManager is a singleton getter: the FIRST call fixes the storage
// strategy, and its no-argument fallback is XFile. So reaching init() without
// having called it here put the whole app into hard-drive mode no matter what
// the config said — macros written and read somewhere the user never chose.
// Both paths below therefore configure it, the failure path with the same
// browser default a fresh config carries.
const initStorageManager = (storageMode) => {
  getStorageManager(storageMode || StorageStrategyType.Browser, {
    getConfig: () => store.getState().config,
    // no macro/folder cap on any storage strategy (the XFile licence limit
    // was retired 2026-07-26)
    getMaxMacroCount: () => Promise.resolve(Infinity)
  })
}

Promise.all([
  restoreConfig(),
  getXFile().getConfig(),
  getLicenseService().getLatestInfo()
])
.then(([config, xFileConfig]) => {
  // Note: This is the first call of getStorageManager
  initStorageManager(config.storageMode)
  init()
}, (e) => {
  log.warn('startup config failed, falling back to browser storage', e)
  initStorageManager(StorageStrategyType.Browser)
  init()
})
