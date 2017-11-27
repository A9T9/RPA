import { type3, types as T } from './action_types'
import { pick, until, on, map, compose } from '../common/utils'
import csIpc from '../common/ipc/ipc_cs'
import storage from '../common/storage'
import testCaseModel, { normalizeCommand } from '../models/test_case_model'
import { getPlayer } from '../common/player'
import { getCSVMan } from '../common/csv_man'
import log from '../common/log'

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

    storage.set('config', config)

    const savedSize = config.size ? config.size[config.showSidebar ? 'with_sidebar' : 'standard'] : null
    const finalSize = savedSize || (
      config.showSidebar
        ? {
          width: 720,
          height: 775
        } : {
          width: 520,
          height: 775
        }
    )

    if (finalSize.width !== lastSize.width ||
      finalSize.height !== lastSize.height) {
      until('find app dom', () => {
        const $app = document.querySelector('.app')
        return {
          pass: !!$app,
          result: $app
        }
      }, 100)
      .then($app => {
        if (config.showSidebar) {
          $app.classList.add('with-sidebar')
        } else {
          $app.classList.remove('with-sidebar')
        }
      })

      if (finalSize.width !== window.outerWidth || finalSize.height !== window.outerHeight) {
        csIpc.ask('PANEL_RESIZE_WINDOW', { size: finalSize })
      }

      lastSize = finalSize
    }
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
      command: cmdObj,
      index: index
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
      return Promise.reject(new Error('The test case name already exists!'))
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

export function renameTestCase (name) {
  return (dispatch, getState) => {
    const state = getState()
    const id    = state.editor.editing.meta.src.id
    const tc    = state.editor.testCases.find(tc => tc.id === id)
    const sameName = state.editor.testCases.find(tc => tc.id !== id && tc.name === name)

    if (sameName) {
      return Promise.reject(new Error('The test case name already exists!'))
    }

    return testCaseModel.update(id, {...tc, name})
      .then(() => {
        dispatch({
          type: T.RENAME_TEST_CASE,
          data: name,
          post: saveEditing
        })
      })
  }
}

export function removeCurrentTestCase () {
  return (dispatch, getState) => {
    const state = getState()
    const id    = state.editor.editing.meta.src.id

    return testCaseModel.remove(id)
      .then(() => {
        dispatch({
          type: T.REMOVE_CURRENT_TEST_CASE,
          data: null,
          post: saveEditing
        })
      })
      .catch(e => log.error(e.stack))
  }
}

// Note: duplicate current editing and save to another
export function duplicateTestCase (newTestCaseName) {
  return saveEditingAsNew(newTestCaseName)
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

export function addLog (type, text) {
  return {
    type: T.ADD_LOGS,
    data: [{
      type,
      text,
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
    data: null
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
    const state     = getState()
    const { config } = state
    const cfg        = pick(['playHighlightElements', 'playScrollElementsIntoView'], config)
    const macroName  = state.editor.editing.meta.src ? state.editor.editing.meta.src.name : 'Untitled'
    const scope      = {
      '!MACRONAME':         macroName,
      '!TIMEOUT_PAGELOAD':  parseInt(config.timeoutPageLoad, 10),
      '!TIMEOUT_WAIT':      parseInt(config.timeoutElement, 10),
      '!REPLAYSPEED': ({
        '0':    'FAST',
        '0.3':  'MEDIUM',
        '2':    'SLOW'
      })[options.postDelay]
    }

    const opts = compose(
      on('resources'),
      map,
      on('extra')
    )((extra = {}) => ({
      ...extra,
      ...cfg
    }))(options)

    getPlayer().play({
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
