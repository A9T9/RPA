import URL from 'url-parse'
import isEqual from 'lodash.isequal'
import { types as T } from '../actions/action_types'
import { setIn, updateIn, compose, pick, partial } from '../common/utils'
import { normalizeCommand, normalizeTestCase } from '../models/test_case_model'
import { toJSONString } from '../common/convert_utils'
import * as C from '../common/constant'
import log from '../common/log';

const newTestCaseEditing = {
  commands: [],
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
//    * errorCommandIndices commands that encounters some error
//    * doneCommandIndices  commands that have been executed
//    * currentLoop         the current round
//    * loops               how many rounds to run totally

const initialState = {
  status: C.APP_STATUS.NORMAL,
  recorderStatus: C.RECORDER_STATUS.STOPPED,
  inspectorStatus: C.INSPECTOR_STATUS.STOPPED,
  editor: {
    testSuites: [],
    testCases: [],
    editing: {
      ...newTestCaseEditing
    },
    editingSource: {
      // Saved version
      original: null,
      // Version before editing
      pure:     null,
      // Version keeping track of any editing
      current:  null,
      error:    null
    },
    clipboard: {
      commands: []
    },
    activeTab: 'table_view'
  },
  player: {
    mode: C.PLAYER_MODE.TEST_CASE,
    status: C.PLAYER_STATUS.STOPPED,
    stopReason: null,
    currentLoop: 0,
    loops: 0,
    nextCommandIndex: null,
    errorCommandIndices: [],
    doneCommandIndices: [],
    breakpointIndices: [],
    playInterval: 0,
    timeoutStatus: {
      type: null,
      total: null,
      past: null
    }
  },
  variables: [],
  logs: [],
  screenshots: [],
  csvs: [],
  visions: [],
  config: {},
  ui: {}
}

// Note: for update the `hasUnsaved` status in editing.meta
const updateHasUnSaved = (state) => {
  const { meta, ...data } = state.editor.editing
  const id = meta.src && meta.src.id
  if (!id)  return state

  const tc = state.editor.testCases.find(tc => tc.id === id)
  if (!tc)  return state

  const normalizedEditing = normalizeTestCase({ data })
  const hasUnsaved = !isEqual(tc.data, normalizedEditing.data)
  return setIn(['editor', 'editing', 'meta', 'hasUnsaved'], hasUnsaved, state)
}

const updateBreakpointIndices = (indices, action, actionIndex) => {
  const handleSingleAction = (indices, action, actionIndex) => {
    switch (action) {
      case 'add': {
        let result = indices.slice()

        for (let i = 0, len = indices.length; i < len; i++) {
          if (result[i] >= actionIndex) {
            result[i] += 1
          }
        }

        return result
      }

      case 'delete': {
        let result = indices.slice()

        for (let i = indices.length - 1; i >= 0; i--) {
          if (result[i] > actionIndex) {
            result[i] -= 1
          } else if (result[i] === actionIndex) {
            result.splice(i, 1)
          }
        }

        return result
      }

      default:
        throw new Error(`updateBreakpointIndices: unknown action, '${action}'`)
    }
  }

  if (typeof actionIndex === 'number') {
    return handleSingleAction(indices, action, actionIndex)
  }

  if (Array.isArray(actionIndex)) {
    // Note: sort action indices as desc.  Bigger indice will be handled earlier, so that it won't affect others
    const actionIndices = actionIndex.slice()
    actionIndices.sort((a, b) => b - a)

    return actionIndices.reduce((indices, actionIndex) => {
      return handleSingleAction(indices, action, actionIndex)
    }, indices)
  }

  throw new Error('updateBreakpointIndices: actionIndex should be either number or an array of number')
}

const resetEditingSource = partial((macro, state) => {
  log('resetEditingSource', macro)
  const str = toJSONString(macro)
  return setIn(
    ['editor', 'editingSource'],
    {
      original: str,
      pure:     str,
      current:  str,
      error:    null
    },
    state
  )
})

const setEditingSourceCurrent = (state) => {
  const macro = {
    name:     state.editor.editing.meta.src ? state.editor.editing.meta.src.name : 'Untitled',
    commands: state.editor.editing.commands
  }
  log('setEditingSourceCurrent', macro)

  const str = toJSONString(macro)
  return updateIn(['editor', 'editingSource'], editingSource => ({ ...editingSource, pure: str, current: str }), state)
}

const saveEditingSourceCurrent = (state) => {
  const { current } = state.editor.editingSource
  return updateIn(['editor', 'editingSource'], editingSource => ({ ...editingSource, pure: current, original: current }), state)
}

const setEditingSourceOriginalAndPure = (macro, state) => {
  const str = toJSONString(macro)
  return updateIn(['editor', 'editingSource'], editingSource => ({ ...editingSource, pure: str, original: str }), state)
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
          errorCommandIndices: [],
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
      return compose(
        setEditingSourceCurrent,
        updateHasUnSaved,
        updateIn(
          ['editor', 'editing', 'commands'],
          (commands) => [...commands, action.data.command]
        )
      )(state)

    case T.DUPLICATE_COMMAND:
      return compose(
        setEditingSourceCurrent,
        updateHasUnSaved,
        setIn(
          ['editor', 'editing', 'meta', 'selectedIndex'],
          action.data.index + 1
        ),
        updateIn(
          ['editor', 'editing', 'commands'],
          (commands) => {
            const { index }   = action.data
            const newCommands = commands.slice()
            newCommands.splice(index + 1, 0, commands[index])
            return newCommands
          }
        ),
        updateIn(
          ['player', 'breakpointIndices'],
          (indices) => updateBreakpointIndices(indices, 'add', action.data.index + 1)
        )
      )(state)

    case T.INSERT_COMMAND:
      return compose(
        setEditingSourceCurrent,
        updateHasUnSaved,
        setIn(
          ['editor', 'editing', 'meta', 'selectedIndex'],
          action.data.index
        ),
        updateIn(
          ['editor', 'editing', 'commands'],
          (commands) => {
            const { index, command } = action.data
            const newCommands = commands.slice()
            newCommands.splice(index, 0, command)
            return newCommands
          }
        ),
        updateIn(
          ['player', 'breakpointIndices'],
          (indices) => updateBreakpointIndices(indices, 'add', action.data.index)
        )
      )(state)

    case T.UPDATE_COMMAND:
      return compose(
        setEditingSourceCurrent,
        updateHasUnSaved,
        setIn(
          ['editor', 'editing', 'commands', action.data.index],
          action.data.command
        )
      )(state)

    case T.REMOVE_COMMAND:
      return compose(
        setEditingSourceCurrent,
        updateHasUnSaved,
        updateIn(
          ['editor', 'editing', 'commands'],
          (commands) => {
            const { index } = action.data
            const newCommands = commands.slice()
            newCommands.splice(index, 1)
            return newCommands
          }
        ),
        updateIn(
          ['player', 'breakpointIndices'],
          (indices) => updateBreakpointIndices(indices, 'delete', action.data.index)
        )
      )(state)

    case T.SELECT_COMMAND:
      return compose(
        setIn(
          ['editor', 'editing', 'meta', 'selectedIndex'],
          (action.data.forceClick ||
            state.editor.editing.meta.selectedIndex !== action.data.index)
                ? action.data.index
                : -1
        ),
        // Note: normalize commands whenever switching between commands in normal mode
        state.status === C.APP_STATUS.NORMAL
          ? updateIn(
            ['editor', 'editing', 'commands'],
            (cmds) => cmds.map(normalizeCommand)
          )
          : x => x
      )(state)

    case T.CUT_COMMAND: {
      const commands = action.data.indices.map(i => state.editor.editing.commands[i])

      return compose(
        setEditingSourceCurrent,
        updateHasUnSaved,
        setIn(['editor', 'clipboard', 'commands'], commands),
        updateIn(
          ['editor', 'editing', 'commands'],
          (commands) => {
            const newCommands = commands.slice()
            return newCommands.filter((c, i) => action.data.indices.indexOf(i) === -1)
          }
        ),
        updateIn(
          ['player', 'breakpointIndices'],
          (indices) => updateBreakpointIndices(indices, 'delete', action.data.indices)
        )
      )(state)
    }

    case T.COPY_COMMAND: {
      const commands = action.data.indices.map(i => state.editor.editing.commands[i])
      return setIn(['editor', 'clipboard', 'commands'], commands, state)
    }

    case T.PASTE_COMMAND: {
      const { commands } = state.editor.clipboard

      return compose(
        setEditingSourceCurrent,
        updateHasUnSaved,
        updateIn(
          ['editor', 'editing', 'commands'],
          (cmds) => {
            const newCmds = cmds.slice()
            newCmds.splice(action.data.index + 1, 0, ...commands)
            return newCmds
          }
        ),
        updateIn(
          ['player', 'breakpointIndices'],
          (indices) => updateBreakpointIndices(indices, 'add', commands.map(_ => action.data.index + 1))
        )
      )(state)
    }

    case T.NORMALIZE_COMMANDS:
      return updateIn(
        ['editor', 'editing', 'commands'],
        (cmds) => cmds.map(normalizeCommand),
        state
      )

    case T.UPDATE_SELECTED_COMMAND:
      if (state.editor.editing.meta.selectedIndex === -1) {
        return state
      }

      return compose(
        setEditingSourceCurrent,
        updateHasUnSaved,
        updateIn(
          ['editor', 'editing', 'commands', state.editor.editing.meta.selectedIndex],
          (cmdObj) => ({...cmdObj, ...action.data})
        )
      )(state)

    case T.SAVE_EDITING_AS_EXISTED:
      return compose(
        setIn(['editor', 'editing', 'meta', 'hasUnsaved'], false),
        saveEditingSourceCurrent
      )(state)

    case T.SAVE_EDITING_AS_NEW:
      return compose(
        updateIn(
          ['editor', 'editing', 'meta'],
          (meta) => ({
            ...meta,
            hasUnsaved: false,
            src: pick(['id', 'name'], action.data)
          })
        ),
        saveEditingSourceCurrent
      )(state)

    case T.SET_TEST_CASES: {
      return compose(
        (state) => {
          const { src } = state.editor.editing.meta
          if (!src) return state

          const tc = state.editor.testCases.find(tc => tc.id === src.id)
          if (!tc)  return state

          return setEditingSourceOriginalAndPure({
            name: tc.name,
            commands: tc.data.commands
          }, state)
        },
        setIn(['editor', 'testCases'], action.data)
      )(state)
    }

    case T.SET_TEST_SUITES:
      return setIn(['editor', 'testSuites'], action.data, state)

    case T.UPDATE_TEST_SUITE: {
      const { id, updated } = action.data
      const index = state.editor.testSuites.findIndex(ts => ts.id === id)

      if (index === -1) return state
      return setIn(['editor', 'testSuites', index], updated, state)
    }

    case T.SET_EDITING:
      log('REDUCER SET_EDITING', action.data)

      if (!action.data) return state
      return compose(
        setEditingSourceCurrent,
        updateHasUnSaved,
        setIn(['editor', 'editing'], action.data)
      )(state)

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
            errorCommandIndices: [],
            doneCommandIndices: [],
            breakpointIndices: []
          })
        ),
        resetEditingSource({
          name:     tc.name,
          commands: tc.data.commands
        })
      )(state)
    }

    case T.UPDATE_TEST_CASE_STATUS: {
      const { id, status } = action.data
      if (!id)  return state

      const { testCases } = state.editor
      const index = testCases.findIndex(tc => tc.id === id)
      if (index === -1) return state

      return setIn(
        ['editor', 'testCases', index, 'status'],
        status,
        state
      )
    }

    case T.RENAME_TEST_CASE:
      return setIn(['editor', 'editing', 'meta', 'src', 'name'], action.data, state)

    case T.REMOVE_TEST_CASE: {
      if (!action.data.isCurrent) return state

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
          errorCommandIndices: [],
          doneCommandIndices: [],
          breakpointIndices: []
        })),
        resetEditingSource({
          name:     'Untitled',
          commands: []
        })
      )(state)
    }

    case T.SET_PLAYER_STATE:
      return updateIn(['player'], (playerState) => ({...playerState, ...action.data}), state)

    case T.PLAYER_ADD_ERROR_COMMAND_INDEX:
      return updateIn(
        ['player', 'errorCommandIndices'],
        (indices) => [...indices, action.data],
        state
      )

    case T.ADD_BREAKPOINT:
      return updateIn(
        ['player', 'breakpointIndices'],
        (indices) => indices.indexOf(action.data) === -1 ? [...indices, action.data] : indices,
        state
      )

    case T.REMOVE_BREAKPOINT:
      return updateIn(
        ['player', 'breakpointIndices'],
        (indices) => indices.filter(index => index !== action.data),
        state
      )

    case T.ADD_LOGS:
      return {
        ...state,
        logs: [...state.logs, ...action.data].slice(-500)
      }

    case T.CLEAR_LOGS:
      return {
        ...state,
        logs: []
      }

    case T.ADD_SCREENSHOT:
      return {
        ...state,
        screenshots: [
          ...state.screenshots,
          action.data
        ]
      }

    case T.CLEAR_SCREENSHOTS:
      return {
        ...state,
        screenshots: []
      }

    case T.UPDATE_CONFIG:
      return updateIn(
        ['config'],
        (cfg) => ({...cfg, ...action.data}),
        state
      )

    case T.SET_CSV_LIST:
      return {
        ...state,
        csvs: action.data
      }

    case T.SET_SCREENSHOT_LIST:
      return {
        ...state,
        screenshots: action.data
      }

    case T.SET_VISION_LIST:
      return {
        ...state,
        visions: action.data
      }

    case T.SET_VARIABLE_LIST:
      return {
        ...state,
        variables: action.data
      }

    case T.UPDATE_UI: {
      return updateIn(['ui'], ui => ({...ui, ...action.data}), state)
    }

    case T.SET_EDITOR_ACTIVE_TAB: {
      return setIn(['editor', 'activeTab'], action.data, state)
    }

    case T.SET_SOURCE_ERROR: {
      return setIn(['editor', 'editingSource', 'error'], action.data, state)
    }

    case T.SET_SOURCE_CURRENT: {
      return setIn(['editor', 'editingSource', 'current'], action.data, state)
    }

    default:
      return state
  }
}
