/* global PREINSTALL_CSV_LIST PREINSTALL_VISION_LIST */

import { message } from 'antd'
import { type3, types as T } from './action_types'
import { pick, until, on, map, compose, uid, delay, loadCsv, loadImage } from '../common/utils'
import csIpc from '../common/ipc/ipc_cs'
import storage from '../common/storage'
import { getStorageManager, StorageTarget, StorageStrategyType } from '../services/storage'
import { normalizeCommand } from '../models/test_case_model'
import { getPlayer } from '../common/player'
import backup from '../common/backup'
import log from '../common/log'
import { fromJSONString } from '../common/convert_utils'
import { parseTestSuite } from '../common/convert_suite_utils'
import config from '../config'
import preTcs from '../config/preinstall_macros'
import preTss from '../config/preinstall_suites'

let recordedCount = 0

const saveEditing = ({dispatch, getState}) => {
  const { editor }  = getState()
  const { editing } = editor

  storage.set('editing', editing)
}

const saveConfig = (function () {
  let lastSize = {}

  return ({dispatch, getState}) => {
    let { config } = getState()
    config = config || {}

    const savedSize = config.size ? config.size[config.showSidebar ? 'with_sidebar' : 'standard'] : null
    const finalSize = savedSize || (
      config.showSidebar
        ? {
          width: 850,
          height: 775
        } : {
          width: 520,
          height: 775
        }
    )

    if (finalSize.width !== lastSize.width ||
      finalSize.height !== lastSize.height) {
      storage.get('config')
      .then(oldConfig => {
        if (oldConfig.showSidebar === config.showSidebar) return

        if (finalSize.width !== window.outerWidth || finalSize.height !== window.outerHeight) {
          csIpc.ask('PANEL_RESIZE_WINDOW', { size: finalSize })
        }
      })
    }

    storage.set('config', config)
    lastSize = finalSize
  }
})()

export function setRoute (data) {
  return {
    type: T.SET_ROUTE,
    data
  }
}

export function startRecording () {
  recordedCount = 0

  return {
    types: type3('START_RECORDING'),
    promise: () => {
      setTimeout(() => {
        csIpc.ask('PANEL_TRY_TO_RECORD_OPEN_COMMAND')
      })

      return csIpc.ask('PANEL_START_RECORDING', {})
    }
  }
}

export function stopRecording () {
  return {
    types: type3('STOP_RECORDING'),
    promise: () => {
      return csIpc.ask('PANEL_STOP_RECORDING', {})
    }
  }
}

export function startInspecting () {
  return {
    types: type3('START_INSPECTING'),
    promise: () => {
      return csIpc.ask('PANEL_START_INSPECTING', {})
    }
  }
}

export function stopInspecting () {
  return {
    types: type3('STOP_INSPECTING'),
    promise: () => {
      return csIpc.ask('PANEL_STOP_INSPECTING', {})
    }
  }
}

export function startPlaying () {
  return {
    type: T.START_PLAYING,
    data: null
  }
}

export function stopPlaying () {
  return {
    type: T.STOP_PLAYING,
    data: null
  }
}

export function doneInspecting () {
  return {
    type: T.DONE_INSPECTING,
    data: {}
  }
}

export function appendCommand (cmdObj, fromRecord = false) {
  if (fromRecord) {
    recordedCount += 1
    // Note: show in badge the recorded count
    csIpc.ask('PANEL_UPDATE_BADGE', {
      type: 'record',
      text: '' + recordedCount
    })
  }

  return {
    type: T.APPEND_COMMAND,
    data: { command: cmdObj },
    post: saveEditing
  }
}

export function duplicateCommand (index) {
  return {
    type: T.DUPLICATE_COMMAND,
    data: { index },
    post: saveEditing
  }
}

export function insertCommand (cmdObj, index) {
  return {
    type: T.INSERT_COMMAND,
    data: {
      index,
      command: cmdObj
    },
    post: saveEditing
  }
}

export function updateCommand (cmdObj, index) {
  return {
    type: T.UPDATE_COMMAND,
    data: {
      command: cmdObj,
      index: index
    },
    post: saveEditing
  }
}

export function removeCommand (index) {
  return {
    type: T.REMOVE_COMMAND,
    data: { index },
    post: saveEditing
  }
}

export function selectCommand (index, forceClick) {
  return {
    type: T.SELECT_COMMAND,
    data: { index, forceClick },
    post: saveEditing
  }
}

export function cutCommand (index) {
  return {
    type: T.CUT_COMMAND,
    data: { indices: [index] },
    post: saveEditing
  }
}

export function copyCommand (index) {
  return {
    type: T.COPY_COMMAND,
    data: { indices: [index] }
  }
}

export function pasteCommand (index) {
  return {
    type: T.PASTE_COMMAND,
    data: { index },
    post: saveEditing
  }
}

export function normalizeCommands () {
  return {
    type: T.NORMALIZE_COMMANDS,
    data: {},
    post: saveEditing
  }
}

export function updateSelectedCommand (obj) {
  return {
    type: T.UPDATE_SELECTED_COMMAND,
    data: obj,
    post: saveEditing
  }
}

export function setSourceError (error) {
  return {
    type: T.SET_SOURCE_ERROR,
    data: error
  }
}

export function setSourceCurrent (str) {
  return {
    type: T.SET_SOURCE_CURRENT,
    data: str
  }
}

export function saveSourceCodeToEditing (str) {
  return (dispatch, getState) => {
    const { editing, editingSource } = getState().editor
    if (editingSource.pure === editing.current) return

    log('ACTION, saveSourceCodeToEditing', str)

    try {
      const obj = fromJSONString(str, 'untitled')

      dispatch(setEditing({
        ...obj.data,
        meta: editing.meta
      }))

      dispatch(setSourceError(null))
    } catch (e) {
      message.error('There are errors in the source')
      dispatch(setSourceError(e.message))
    }
  }
}

// In the form of redux-thunnk, it saves current editing test case to local storage
export function saveEditingAsExisted () {
  return (dispatch, getState) => {
    const state = getState()
    const src   = state.editor.editing.meta.src
    const tc    = state.editor.testCases.find(tc => tc.id === src.id)
    const data  = pick(['commands'], state.editor.editing)

    // Make sure, only 'cmd', 'value', 'target' are saved in storage
    data.commands = data.commands.map(normalizeCommand)

    return getStorageManager()
    .getMacroStorage()
    .write(tc.name, { ...tc, data })
    .then(() => {
      dispatch({
        type: T.SAVE_EDITING_AS_EXISTED,
        data: null,
        post: saveEditing
      })
    })
  }
}

// In the form of redux-thunnk, it saves the current editing test case as a new named test case
export function saveEditingAsNew (name) {
  return (dispatch, getState) => {
    const state = getState()
    const data  = pick(['commands'], state.editor.editing)
    const sameName = state.editor.testCases.find(tc => tc.name === name)

    if (sameName) {
      return Promise.reject(new Error('The macro name already exists!'))
    }

    const id = uid()

    return getStorageManager()
    .getMacroStorage()
    .write(name, { name, data, id })
    .then(() => {
      dispatch({
        type: T.SAVE_EDITING_AS_NEW,
        data: {
          id,
          name
        },
        post: saveEditing
      })
    })
  }
}

export function setTestCases (tcs) {
  return {
    type: T.SET_TEST_CASES,
    data: tcs,
    post: ({dispatch, getState}) => {
      const state = getState()
      const shouldSelectDefault = state.editor.testCases.length > 0 &&
                                  !state.editor.editing.meta.src &&
                                  state.editor.editing.commands.length === 0

      if (shouldSelectDefault) {
        dispatch(editTestCase(state.editor.testCases[0].id))
      }
    }
  }
}

export function resetEditing () {
  return (dispatch, getState) => {
    const state = getState()
    const { editing, testCases } = state.editor

    // Leave it if it's a new macro
    if (editing.meta && !editing.meta.src)  return
    if (testCases.length === 0) {
      dispatch(editNewTestCase())
    } else {
      const tcs = testCases.slice()
      tcs.sort((a, b) => {
        const nameA = a.name.toLowerCase()
        const nameB = b.name.toLowerCase()

        if (nameA < nameB) return -1
        if (nameA === nameB)  return 0
        return 1
      })
      dispatch(editTestCase(tcs[0].id))
    }
  }
}

export function setEditing (editing) {
  return {
    type: T.SET_EDITING,
    data: editing
  }
}

export function editTestCase (id) {
  return {
    type: T.EDIT_TEST_CASE,
    data: id,
    post: saveEditing
  }
}

export function editNewTestCase () {
  return {
    type: T.EDIT_NEW_TEST_CASE,
    data: null,
    post: saveEditing
  }
}

export function upsertTestCase (tc) {
  return (dispatch, getState) => {
    const state     = getState()
    const testCases = state.editor.testCases

    log('upsertTestCase', tc)

    return getStorageManager()
    .getMacroStorage()
    .write(tc.name, {
      id: uid(),
      ...tc
    })
  }
}

export function addTestCases (tcs, overwrite = false, storageStrategyType = null) {
  return (dispatch, getState) => {
    const state     = getState()
    const testCases = state.editor.testCases
    const validTcs  = overwrite ? tcs : tcs.filter(tc => !testCases.find(tcc => tcc.name === tc.name))
    const failTcs   = overwrite ? [] : tcs.filter(tc => testCases.find(tcc => tcc.name === tc.name))

    const passCount = validTcs.length
    const failCount = tcs.length - passCount

    if (passCount === 0) {
      return Promise.resolve({ passCount, failCount, failTcs })
    }

    return getStorageManager()
    .getStorageForTarget(StorageTarget.Macro, storageStrategyType || getStorageManager().getCurrentStrategyType())
    .bulkWrite(
      validTcs.map(tc => ({
        fileName: tc.name,
        content: {
          ...tc,
          id: uid(),
          udpateTime: new Date() * 1
        }
      }))
    )
    .then(() => ({ passCount, failCount, failTcs }))
  }
}

export function renameTestCase (name, tcId) {
  return (dispatch, getState) => {
    const state     = getState()
    const editingId = state.editor.editing.meta.src.id
    const tc        = state.editor.testCases.find(tc => tc.id === tcId)
    const sameName  = state.editor.testCases.find(tc => tc.name === name)

    if (!tc) {
      return Promise.reject(new Error(`No macro found with id '${tcId}'!`))
    }

    if (sameName) {
      return Promise.reject(new Error('The macro name already exists!'))
    }

    return getStorageManager()
    .getMacroStorage()
    .rename(tc.name, name)
    .then(() => {
      if (editingId === tcId) {
        dispatch({
          type: T.RENAME_TEST_CASE,
          data: name,
          post: saveEditing
        })
      }
    })
  }
}

export function removeTestCase (tcId) {
  return (dispatch, getState) => {
    const state = getState()
    const tc    = state.editor.testCases.find(tc => tc.id === tcId)
    const curId = state.editor.editing.meta.src.id
    const tss   = state.editor.testSuites.filter(ts => {
      return ts.cases.find(m => m.testCaseId === tcId)
    })

    if (tss.length > 0) {
      return Promise.reject(new Error(`Can't delete this macro for now, it's currently used in following test suites: ${tss.map(item => item.name)}`))
    }

    return getStorageManager()
    .getMacroStorage()
    .remove(tc.name)
    .then(() => {
      dispatch({
        type: T.REMOVE_TEST_CASE,
        data: {
          isCurrent: curId === tcId
        },
        post: saveEditing
      })
    })
    .catch(e => log.error(e.stack))
  }
}

export function removeCurrentTestCase () {
  return (dispatch, getState) => {
    const state = getState()
    const id    = state.editor.editing.meta.src.id

    return removeTestCase(id)(dispatch, getState)
  }
}

// Note: duplicate current editing and save to another
export function duplicateTestCase (newTestCaseName, tcId) {
  return (dispatch, getState) => {
    const state     = getState()
    const tc        = state.editor.testCases.find(tc => tc.id === tcId)
    const sameName  = state.editor.testCases.find(tc => tc.name === newTestCaseName)

    if (!tc) {
      return Promise.reject(new Error(`No macro found with id '${tcId}'!`))
    }

    if (sameName) {
      return Promise.reject(new Error('The macro name already exists!'))
    }

    return getStorageManager()
    .getMacroStorage()
    .write(newTestCaseName, {
      ...tc,
      id: uid(),
      name: newTestCaseName
    })
  }
}

export function setPlayerState (obj) {
  return {
    type: T.SET_PLAYER_STATE,
    data: obj
  }
}

export function setTimeoutStatus (args) {
  return (dispatch) => {
    dispatch(setPlayerState({
      timeoutStatus: args
    }))

    // Note: show in badge the timeout left
    csIpc.ask('PANEL_UPDATE_BADGE', {
      type: 'play',
      text: (args.total - args.past) / 1000 + 's'
    })
  }
}

export function addPlayerErrorCommandIndex (index) {
  return {
    type: T.PLAYER_ADD_ERROR_COMMAND_INDEX,
    data: index
  }
}

export function addLog (type, text, options = {}) {
  return {
    type: T.ADD_LOGS,
    data: [{
      type,
      text,
      options,
      id: uid(),
      createTime: new Date()
    }]
  }
}

export function clearLogs () {
  return {
    type: T.CLEAR_LOGS,
    data: null
  }
}

export function addScreenshot (screenshot) {
  return {
    type: T.ADD_SCREENSHOT,
    data: {
      ...screenshot,
      createTime: new Date()
    }
  }
}

export function clearScreenshots () {
  return {
    type: T.CLEAR_SCREENSHOTS,
    data: null,
    post: () => {
      return getStorageManager().getScreenshotStorage().clear()
    }
  }
}

export function addVision (vision) {
  return {
    type: T.ADD_VISION,
    data: {
      ...vision,
      createTime: new Date()
    }
  }
}

export function clearVisions () {
  return {
    type: T.CLEAR_VISIONS,
    data: null,
    post: () => {
      return getStorageManager()
      .getVisionStorage()
      .clear()
    }
  }
}

export function updateConfig (data) {
  return {
    type: T.UPDATE_CONFIG,
    data: data,
    post: saveConfig
  }
}

export function updateTestCasePlayStatus (id, status) {
  return (dispatch, getState) => {
    const state = getState()
    const tc    = state.editor.testCases.find(tc => tc.id === id)

    return getStorageManager()
    .getMacroStorage()
    .write(tc.name, { ...tc, status })
    .then(() => {
      dispatch({
        type: T.UPDATE_TEST_CASE_STATUS,
        data: { id, status }
      })
    })
  }
}

export function playerPlay (options) {
  return (dispatch, getState) => {
    const state       = getState()
    const { config }  = state
    const cfg         = pick(['playHighlightElements', 'playScrollElementsIntoView'], config)
    const macroName   = state.editor.editing.meta.src ? state.editor.editing.meta.src.name : 'Untitled'
    const scope       = {
      '!MACRONAME':         macroName,
      '!TIMEOUT_PAGELOAD':  parseInt(config.timeoutPageLoad, 10),
      '!TIMEOUT_WAIT':      parseInt(config.timeoutElement, 10),
      '!TIMEOUT_MACRO':     parseInt(config.timeoutMacro, 10),
      '!TIMEOUT_DOWNLOAD':  parseInt(config.timeoutDownload, 10),
      '!REPLAYSPEED': ({
        '0':    'FAST',
        '0.3':  'MEDIUM',
        '2':    'SLOW'
      })[options.postDelay / 1000] || 'MEDIUM',
      ...(options.overrideScope || {})
    }
    const breakpoints = state.player.breakpointIndices || []

    const opts = compose(
      on('resources'),
      map,
      on('extra')
    )((extra = {}) => ({
      ...extra,
      ...cfg,
      ...(options.commandExtra || {})
    }))(options)

    getPlayer().play({
      breakpoints,
      ...opts,
      public: {
        ...(opts.public || {}),
        scope
      }
    })
  }
}

export function listCSV () {
  return (dispatch, getState) => {
    const csvStorage = getStorageManager().getCSVStorage()

    csvStorage.list()
    .then(list => {
      return Promise.all(list.map(item => {
        return csvStorage.getLink(item.fileName)
        .then(url => ({
          url,
          name:       item.fileName,
          size:       item.size,
          createTime: new Date(item.lastModified)
        }))
      }))
    })
    .then(list => {
      dispatch({
        type: T.SET_CSV_LIST,
        data: list
      })
    })
  }
}

export function listScreenshots () {
  return (dispatch, getState) => {
    const man = getStorageManager().getScreenshotStorage()

    man.list().then(list => {
      list.reverse()

      log('listScreenshots', list)

      return Promise.all(list.map(item => {
        return man.getLink(item.fileName)
        .then(url => ({
          url,
          name:       item.fileName,
          createTime: new Date(item.lastModified)
        }))
      }))
    }).then(list => {
      dispatch({
        type: T.SET_SCREENSHOT_LIST,
        data: list
      })
    })
  }
}

export function listVisions () {
  return (dispatch, getState) => {
    const visionStorage = getStorageManager().getVisionStorage()

    visionStorage.list().then(list => {
      list.reverse()
      log('listVisions', list)

      return Promise.all(list.map(item => {
        return visionStorage.getLink(item.fileName)
        .then(url => ({
          url,
          name:       item.fileName,
          createTime: new Date(item.lastModified)
        }))
      }))
    }).then(list => {
      dispatch({
        type: T.SET_VISION_LIST,
        data: list
      })
    })
  }
}

export function setTestSuites (tss) {
  return {
    type: T.SET_TEST_SUITES,
    data: tss
  }
}

export function addTestSuite (ts) {
  return (dispatch, getState) => {
    return getStorageManager()
    .getTestSuiteStorage()
    .write(ts.name, {
      ...ts,
      id: uid(),
      updateTime: new Date() * 1
    })
  }
}

export function addTestSuites (tss, storageStrategyType = null) {
  return (dispatch, getState) => {
    const state     = getState()
    // const testCases = state.editor.testCases
    const validTss  = tss
    // const failTcs   = tcs.filter(tc => testCases.find(tcc => tcc.name === tc.name))

    const passCount = validTss.length
    const failCount = tss.length - passCount

    if (passCount === 0) {
      return Promise.resolve({ passCount, failCount, failTss: [] })
    }

    return getStorageManager()
    .getStorageForTarget(StorageTarget.TestSuite, storageStrategyType || getStorageManager().getCurrentStrategyType())
    .bulkWrite(
      validTss.map(ts => ({
        fileName: ts.name,
        content: {
          ...ts,
          id: uid(),
          updateTime: new Date() * 1
        }
      }))
    )
    .then(() => ({ passCount, failCount, failTss: [] }))
  }
}

export function updateTestSuite (id, data) {
  return (dispatch, getState) => {
    const state = getState()
    const ts    = state.editor.testSuites.find(ts => ts.id === id)

    const realData  = typeof data === 'function' ? data(ts) : data
    const revised   = {
      ...ts,
      ...realData
    }

    dispatch({
      type: T.UPDATE_TEST_SUITE,
      data: {
        id: id,
        updated: revised
      }
    })

    const suiteStorage  = getStorageManager().getTestSuiteStorage()
    const pRename       = realData.name && ts.name !== realData.name
                            ? suiteStorage.rename(ts.name, realData.name)
                            : Promise.resolve()
    const suiteName     = realData.name && ts.name !== realData.name ? realData.name : ts.name

    return pRename.then(() => suiteStorage.write(suiteName, revised))
  }
}

export function removeTestSuite (id) {
  return (dispatch, getState) => {
    const state = getState()
    const ts = state.editor.testSuites.find(ts => ts.id === id)

    if (!ts) throw new Error(`can't find test suite with id '${id}'`)

    return getStorageManager()
    .getTestSuiteStorage()
    .remove(ts.name)
  }
}

export function setPlayerMode (mode) {
  return {
    type: T.SET_PLAYER_STATE,
    data: { mode }
  }
}

export function runBackup () {
  return (dispatch, getState) => {
    const { config, editor } = getState()
    const {
      autoBackupTestCases,
      autoBackupTestSuites,
      autoBackupScreenshots,
      autoBackupCSVFiles,
      autoBackupVisionImages
    } = config

    const sm = getStorageManager()

    return Promise.all([
      sm.getCSVStorage().list(),
      sm.getScreenshotStorage().list(),
      sm.getVisionStorage().list()
    ])
    .then(([csvs, screenshots, visions]) => {
      return backup({
        csvs,
        screenshots,
        visions,
        testCases: editor.testCases,
        testSuites: editor.testSuites,
        backup: {
          testCase: autoBackupTestCases,
          testSuite: autoBackupTestSuites,
          screenshot: autoBackupScreenshots,
          csv: autoBackupCSVFiles,
          vision: autoBackupVisionImages
        }
      })
    })
    .catch(e => {
      log.error(e.stack)
    })
  }
}

export function setVariables (variables) {
  variables.sort((a, b) => {
    if (a.key < b.key)  return -1
    if (a.key > b.key)  return 1
    return 0
  })

  return {
    type: T.SET_VARIABLE_LIST,
    data: variables
  }
}

export function updateUI (data) {
  return {
    type: T.UPDATE_UI,
    data
  }
}

export function addBreakpoint (commandIndex) {
  return {
    type: T.ADD_BREAKPOINT,
    data: commandIndex
  }
}

export function removeBreakpoint (commandIndex) {
  return {
    type: T.REMOVE_BREAKPOINT,
    data: commandIndex
  }
}

export function setEditorActiveTab (tab) {
  return {
    type: T.SET_EDITOR_ACTIVE_TAB,
    data: tab
  }
}

export function preinstall (yesInstall = true) {
  return (dispatch, getState) => {
    const markThisVersion = () => {
      return storage.get('preinstall_info')
      .then((info = {}) => {
        const prevVersions = info.askedVersions || []
        const thisVersion  = config.preinstallVersion
        const hasThisOne   = prevVersions.indexOf(thisVersion) !== -1

        if (hasThisOne) return true

        return storage.set('preinstall_info', {
          ...info,
          askedVersions: [...prevVersions, thisVersion]
        })
      })
    }

    if (!yesInstall)  return markThisVersion()

    log('PREINSTALL_CSV_LIST', PREINSTALL_CSV_LIST)
    log('PREINSTALL_VISION_LIST', PREINSTALL_VISION_LIST)

    const installMacrosAndSuites = () => {
      if (!preTcs || !Object.keys(preTcs).length)  return Promise.resolve()

      const tcs = Object.keys(preTcs).map(key => {
        const str = JSON.stringify(preTcs[key])
        return fromJSONString(str, key)
      })

      dispatch(addTestCases(tcs, true, StorageStrategyType.Browser))

      // Note: test cases need to be save to indexed db before it reflects in store
      // so it may take some time before we can preinstall test suites
      return delay(() => {
        const state = getState()

        const tss   = preTss.map(ts => {
          return parseTestSuite(JSON.stringify(ts), state.editor.testCases)
        })
        dispatch(addTestSuites(tss, StorageStrategyType.Browser))
      }, 1000)
    }

    // Preinstall csv
    const installCsvs = () => {
      const list = PREINSTALL_CSV_LIST
      if (list.length === 0)  return Promise.resolve()

      // Note: preinstalled resources all go into browser mode
      const csvStorage  = getStorageManager().getStorageForTarget(StorageTarget.CSV, StorageStrategyType.Browser)
      const ps          = list.map(url => {
        const parts     = url.split('/')
        const fileName  = parts[parts.length - 1]

        return loadCsv(url)
        .then(text => {
          return csvStorage.write(fileName, new Blob([text]))
        })
      })

      return Promise.resolve(ps)
      // Note: delay needed for Firefox and slow Chrome
      .then(() => delay(() => {}, 3000))
      .then(() => {
        dispatch(listCSV())
      })
    }

    // Preinstall vision images
    const installVisionImages = () => {
      const list = PREINSTALL_VISION_LIST
      if (list.length === 0)  return Promise.resolve()

      // Note: preinstalled resources all go into browser mode
      const visionStorage   = getStorageManager().getStorageForTarget(StorageTarget.Vision, StorageStrategyType.Browser)
      const ps              = list.map(url => {
        const parts     = url.split('/')
        const fileName  = parts[parts.length - 1]

        return loadImage(url)
        .then(blob => {
          return visionStorage.write(fileName, blob)
        })
      })

      return Promise.resolve(ps)
      // Note: delay needed for Firefox and slow Chrome
      .then(() => delay(() => {}, 3000))
      .then(() => {
        dispatch(listVisions())
      })
    }

    return Promise.all([
      installMacrosAndSuites(),
      installCsvs(),
      installVisionImages()
    ])
    .then(markThisVersion)
  }
}
