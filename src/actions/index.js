import { message } from 'antd'
import { type3, types as T } from './action_types'
import { pick, until, on, map, compose, uid } from '../common/utils'
import csIpc from '../common/ipc/ipc_cs'
import storage from '../common/storage'
import testCaseModel, { normalizeCommand } from '../models/test_case_model'
import testSuiteModel from '../models/test_suite_model'
import { getPlayer } from '../common/player'
import { getCSVMan } from '../common/csv_man'
import { getScreenshotMan } from '../common/screenshot_man'
import { getVisionMan } from '../common/vision_man'
import backup from '../common/backup'
import log from '../common/log'
import { fromJSONString } from '../common/convert_utils'

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

    return testCaseModel.update(src.id, {...tc, data})
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

    return testCaseModel.insert({name, data})
    .then(id => {
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
    const existedTc = testCases.find(item => item.name === tc.name)

    log('upsertTestCase', tc)
    if (!existedTc) return testCaseModel.insert(tc)
    return testCaseModel.update(existedTc.id, tc)
  }
}

export function addTestCases (tcs) {
  return (dispatch, getState) => {
    const state     = getState()
    const testCases = state.editor.testCases
    const validTcs  = tcs.filter(tc => !testCases.find(tcc => tcc.name === tc.name))
    const failTcs   = tcs.filter(tc => testCases.find(tcc => tcc.name === tc.name))

    const passCount = validTcs.length
    const failCount = tcs.length - passCount

    if (passCount === 0) {
      return Promise.resolve({ passCount, failCount, failTcs })
    }

    return testCaseModel.bulkInsert(validTcs)
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

    return testCaseModel.update(tcId, {...tc, name})
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
    const curId = state.editor.editing.meta.src.id
    const tss   = state.editor.testSuites.filter(ts => {
      return ts.cases.find(m => m.testCaseId === tcId)
    })

    if (tss.length > 0) {
      return Promise.reject(new Error(`Can't delete this macro for now, it's currently used in following test suites: ${tss.map(item => item.name)}`))
    }

    return testCaseModel.remove(tcId)
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

    return testCaseModel.insert({ ...tc, name: newTestCaseName })
  }
}

export function setPlayerState (obj) {
  return {
    type: T.SET_PLAYER_STATE,
    data: obj
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
      return getScreenshotMan().clear()
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
      return getVisionMan().clear()
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

    return testCaseModel.update(id, {...tc, status})
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
    getCSVMan().list().then(list => {
      dispatch({
        type: T.SET_CSV_LIST,
        data: list
      })
    })
  }
}

export function listScreenshots () {
  return (dispatch, getState) => {
    const man = getScreenshotMan()

    man.list().then(list => {
      list.reverse()

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
    const man = getVisionMan()

    man.list().then(list => {
      list.reverse()

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
    return testSuiteModel.insert(ts)
  }
}

export function addTestSuites (tss) {
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

    return testSuiteModel.bulkInsert(validTss)
    .then(() => ({ passCount, failCount, failTss: [] }))
  }
}

export function updateTestSuite (id, data) {
  return (dispatch, getState) => {
    const state = getState()
    const ts    = state.editor.testSuites.find(ts => ts.id === id)

    const revised = {
      ...ts,
      ...(typeof data === 'function' ? data(ts) : data)
    }

    dispatch({
      type: T.UPDATE_TEST_SUITE,
      data: {
        id: id,
        updated: revised
      }
    })

    return testSuiteModel.update(id, revised)
  }
}

export function removeTestSuite (id) {
  return (dispatch, getState) => {
    return testSuiteModel.remove(id)
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

    return Promise.all([
      getCSVMan().list(),
      getScreenshotMan().list(),
      getVisionMan().list()
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
