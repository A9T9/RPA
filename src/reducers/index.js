import URL from 'url-parse'
import isEqual from 'lodash.isequal'
import { types as T } from '../actions/action_types'
import { setIn, updateIn, compose, pick } from '../common/utils'
import * as C from '../common/constant'

const newTestCaseEditing = {
  commands: [],
  baseUrl: '',
  meta: {
    src: null,
    hasUnsaved: true,
    selectedIndex: -1
  }
}

// * editor
//    * testCases:          all test cases stored in indexedDB
//    * editing:            the current test cases being edited
//    * clipbard            for copy / cut / paste
//
// * player                 the state for player
//    * nextCommandIndex    the current command beging executed
//    * errorCommandIndex   the command that encounters some error
//    * doneCommandIndices  commands that have been executed
//    * currentLoop         the current round
//    * loops               how many rounds to run totally

const initialState = {
  status: C.APP_STATUS.NORMAL,
  recorderStatus: C.RECORDER_STATUS.STOPPED,
  inspectorStatus: C.INSPECTOR_STATUS.STOPPED,
  editor: {
    testCases: [],
    editing: {
      ...newTestCaseEditing
    },
    clipboard: {
      commands: []
    }
  },
  player: {
    status: C.PLAYER_STATUS.STOPPED,
    stopReason: null,
    currentLoop: 0,
    loops: 0,
    nextCommandIndex: null,
    errorCommandIndex: null,
    doneCommandIndices: [],
    playInterval: 0,
    timeoutStatus: {
      type: null,
      total: null,
      past: null
    }
  },
  logs: []
}

// Note: for update the `hasUnsaved` status in editing.meta
const updateHasUnSaved = (state) => {
  const { meta, ...data } = state.editor.editing
  const id = meta.src && meta.src.id
  if (!id)  return state

  const tc = state.editor.testCases.find(tc => tc.id === id)
  if (!tc)  return state

  const hasUnsaved = !isEqual(tc.data, data)
  return setIn(['editor', 'editing', 'meta', 'hasUnsaved'], hasUnsaved, state)
}

export default function reducer (state = initialState, action) {
  switch (action.type) {
    case T.START_RECORDING_SUCCESS:
      return {
        ...state,
        status: C.APP_STATUS.RECORDER,
        recorderStatus: C.APP_STATUS.PENDING,
        player: {
          ...state.player,
          nextCommandIndex: null,
          errorCommandIndex: null,
          doneCommandIndices: []
        }
      }
    case T.STOP_RECORDING_SUCCESS:
      return {
        ...state,
        status: C.APP_STATUS.NORMAL,
        recorderStatus: C.RECORDER_STATUS.STOPPED
      }
    case T.START_INSPECTING_SUCCESS:
      return {
        ...state,
        status: C.APP_STATUS.INSPECTOR,
        inspectorStatus: C.INSPECTOR_STATUS.PENDING
      }
    case T.STOP_INSPECTING_SUCCESS:
    case T.DONE_INSPECTING:
      return {
        ...state,
        status: C.APP_STATUS.NORMAL,
        recorderStatus: C.INSPECTOR_STATUS.STOPPED
      }

    case T.START_PLAYING:
      return {
        ...state,
        status: C.APP_STATUS.PLAYER
      }

    case T.STOP_PLAYING:
      return {
        ...state,
        status: C.APP_STATUS.NORMAL
      }

    case T.APPEND_COMMAND:
      return updateHasUnSaved(
        updateIn(
          ['editor', 'editing', 'commands'],
          (commands) => [...commands, action.data.command],
          state
        )
      )
    case T.INSERT_COMMAND:
      return updateHasUnSaved(
        updateIn(
          ['editor', 'editing', 'commands'],
          (commands) => {
            const { index, command } = action.data
            commands.splice(index, 0, command)
            return [...commands]
          },
          state
        )
      )
    case T.UPDATE_COMMAND:
      return updateHasUnSaved(
        setIn(
          ['editor', 'editing', 'commands', action.data.index],
          action.data.command,
          state
        )
      )
    case T.REMOVE_COMMAND:
      return updateHasUnSaved(
        updateIn(
          ['editor', 'editing', 'commands'],
          (commands) => {
            const { index, command } = action.data
            commands.splice(index, 1)
            return [...commands]
          },
          state
        )
      )
    case T.SELECT_COMMAND:
      return setIn(
        ['editor', 'editing', 'meta', 'selectedIndex'],
        (action.data.forceClick ||
          state.editor.editing.meta.selectedIndex !== action.data.index)
              ? action.data.index
              : -1,
        state
      )

    case T.CUT_COMMAND: {
      const commands = action.data.indices.map(i => state.editor.editing.commands[i])

      return compose(
        setIn(['editor', 'clipboard', 'commands'], commands),
        updateIn(
          ['editor', 'editing', 'commands'],
          (commands) => commands.filter((c, i) => action.data.indices.indexOf(i) === -1)
        )
      )(state)
    }

    case T.COPY_COMMAND: {
      const commands = action.data.indices.map(i => state.editor.editing.commands[i])
      return setIn(['editor', 'clipboard', 'commands'], commands, state)
    }

    case T.PASTE_COMMAND: {
      const { commands } = state.editor.clipboard

      return updateIn(
        ['editor', 'editing', 'commands'],
        (cmds) => {
          cmds.splice(action.data.index + 1, 0, ...commands)
          return [...cmds]
        },
        state
      )
    }

    case T.UPDATE_SELECTED_COMMAND:
      return updateHasUnSaved(
        updateIn(
          ['editor', 'editing', 'commands', state.editor.editing.meta.selectedIndex],
          (cmdObj) => ({...cmdObj, ...action.data}),
          state
        )
      )
    case T.SET_COMMAND_BASE_URL: {
      if (state.editor.editing.baseUrl && state.editor.editing.baseUrl.length) {
        return state
      }

      const url     = new URL(action.data)
      const origin  = url.origin
      const path    = url.href.replace(origin, '')

      return updateHasUnSaved(
        compose(
          setIn(['editor', 'editing', 'baseUrl'], origin + '/'),
          updateIn(
            ['editor', 'editing', 'commands'],
            (commands) => [
              { cmd: 'open', target: path, value: null },
              ...commands
            ]
          )
        )(state)
      )
    }
    case T.UPDATE_BASE_URL:
      return updateHasUnSaved(
        setIn(['editor', 'editing', 'baseUrl'], action.data, state)
      )

    case T.SAVE_EDITING_AS_EXISTED:
      return setIn(['editor', 'editing', 'meta', 'hasUnsaved'], false, state)

    case T.SAVE_EDITING_AS_NEW:
      return updateIn(
        ['editor', 'editing', 'meta'],
        (meta) => ({
          ...meta,
          hasUnsaved: false,
          src: pick(['id', 'name'], action.data)
        }),
        state
      )

    case T.SET_TEST_CASES:
      console.log('testcases', action.data)
      return setIn(['editor', 'testCases'], action.data, state)

    case T.SET_EDITING:
      if (!action.data) return state
      return updateHasUnSaved(
        setIn(['editor', 'editing'], action.data, state)
      )

    case T.EDIT_TEST_CASE: {
      const { testCases } = state.editor
      const tc = testCases.find(tc => tc.id === action.data)

      if (!tc)  return state

      return compose(
        setIn(
          ['editor', 'editing'],
          {
            ...tc.data,
            meta: {
              selectedIndex: -1,
              hasUnsaved: false,
              src: pick(['id', 'name'], tc)
            }
          }
        ),
        updateIn(
          ['player'],
          (player) => ({
            ...player,
            status: C.PLAYER_STATUS.STOPPED,
            stopReason: null,
            nextCommandIndex: null,
            errorCommandIndex: null,
            doneCommandIndices: []
          })
        )
      )(state)
    }

    case T.RENAME_TEST_CASE:
      return setIn(['editor', 'editing', 'meta', 'src', 'name'], action.data, state)

    case T.REMOVE_CURRENT_TEST_CASE: {
      const { id } = state.editor.editing.meta.src
      const { selectedIndex } = state.editor.editing.meta
      const candidates        = state.editor.testCases.filter(tc => tc.id !== id)
      let lastIndex           = state.editor.testCases.findIndex(tc => tc.id === id)
      let editing

      if (candidates.length === 0) {
        editing = {...newTestCaseEditing}
      } else {
        const index = lastIndex === -1
                        ? 0
                        : lastIndex < candidates.length ? lastIndex : (lastIndex - 1)
        const tc    = candidates[index]

        editing     = {
          ...tc.data,
          meta: {
            src: pick(['id', 'name'], tc),
            hasUnsaved: false,
            selectedIndex: index
          }
        }
      }

      return setIn(['editor', 'editing'], editing, state)
    }

    case T.EDIT_NEW_TEST_CASE: {
      return compose(
        setIn(
          ['editor', 'editing'],
          {...newTestCaseEditing}
        ),
        updateIn(['player'], (player) => ({
          ...player,
          nextCommandIndex: null,
          errorCommandIndex: null,
          doneCommandIndices: []
        }))
      )(state)
    }

    case T.SET_PLAYER_STATE:
      return updateIn(['player'], (playerState) => ({...playerState, ...action.data}), state)

    case T.ADD_LOGS:
      return {
        ...state,
        logs: [...state.logs, ...action.data]
      }

    case T.CLEAR_LOGS:
      return {
        ...state,
        logs: []
      }

    default:
      return state
  }
}
