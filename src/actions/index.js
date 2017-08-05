import { type3, types as T } from './action_types'
import { pick } from '../common/utils'
import csIpc from '../common/ipc/ipc_cs'
import storage from '../common/storage'
import testCaseModel from '../models/test_case_model'

export function setRoute (data) {
  return {
    type: T.SET_ROUTE,
    data
  }
}

export function startRecording () {
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

const saveEditing = ({dispatch, getState}) => {
  const { editor }  = getState()
  const { editing } = editor

  storage.set('editing', editing)
}

export function appendCommand (cmdObj) {
  return {
    type: T.APPEND_COMMAND,
    data: { command: cmdObj },
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

export function updateSelectedCommand (obj) {
  return {
    type: T.UPDATE_SELECTED_COMMAND,
    data: obj,
    post: saveEditing
  }
}

export function setCommandBaseUrl (url) {
  return {
    type: T.SET_COMMAND_BASE_URL,
    data: url,
    post: saveEditing
  }
}

export function updateBaseUrl (url) {
  return {
    type: T.UPDATE_BASE_URL,
    data: url,
    post: saveEditing
  }
}

// In the form of redux-thunnk, it saves current editing test case to local storage
export function saveEditingAsExisted () {
  return (dispatch, getState) => {
    const state = getState()
    const src   = state.editor.editing.meta.src
    const tc    = state.editor.testCases.find(tc => tc.id === src.id)
    const data  = pick(['commands', 'baseUrl'], state.editor.editing)

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
    const data  = pick(['commands', 'baseUrl'], state.editor.editing)

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
    data: tcs
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
    return testCaseModel.bulkInsert(tcs)
  }
}

export function renameTestCase (name) {
  return (dispatch, getState) => {
    const state = getState()
    const id    = state.editor.editing.meta.src.id
    const tc    = state.editor.testCases.find(tc => tc.id === id)

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
      .catch(e => console.err(e.stack))
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
