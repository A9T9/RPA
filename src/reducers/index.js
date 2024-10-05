import URL from 'url-parse'
import isEqual from 'lodash.isequal'
import { types as T } from '../actions/action_types'
import { ActionTypes } from '../actions/simple_actions'
import { setIn, updateIn, compose, pick, partial } from '../common/utils'
import { normalizeCommand, normalizeTestCase } from '../models/test_case_model'
import { toJSONString } from '../common/convert_utils'
import * as C from '../common/constant'
import log from '../common/log';
import { safeSetIn, safeUpdateIn } from '../common/ts_utils'
import { getCurrentMacroId, getMacroFileNodeList, getShouldIgnoreTargetOptions } from '../recomputed'
import { initialState, newTestCaseEditing } from './state'

// Note: for update the `hasUnsaved` status in editing.meta
const updateHasUnSaved = (state) => {
  const { meta, ...data } = state.editor.editing
  const id = meta.src && meta.src.id
  if (!id) return state

  const currentMacro = state.editor.currentMacro
  const normalizedEditing = normalizeTestCase({ data })
  const hasUnsaved = !isEqual(currentMacro && currentMacro.data, normalizedEditing.data)

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
  const str = toJSONString(macro, {
    ignoreTargetOptions: getShouldIgnoreTargetOptions(state)
  })
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
  // log('setEditingSourceCurrent', macro)

  const str = toJSONString(macro, {
    ignoreTargetOptions: getShouldIgnoreTargetOptions(state)
  })
  return updateIn(['editor', 'editingSource'], editingSource => ({ ...editingSource, pure: str, current: str }), state)
}

const saveEditingSourceCurrent = (state) => {
  const { current } = state.editor.editingSource
  return updateIn(['editor', 'editingSource'], editingSource => ({ ...editingSource, pure: current, original: current }), state)
}

const setEditingSourceOriginalAndPure = (macro, state) => {
  const str = toJSONString(macro, {
    ignoreTargetOptions: getShouldIgnoreTargetOptions(state)
  })
  return updateIn(['editor', 'editingSource'], editingSource => ({ ...editingSource, pure: str, original: str }), state)
}

// for test purpose
export const INCREMENT = 'INCREMENT';

export default function reducer (state = initialState, action) {
  switch (action.type) {
    // for test purpose
    case INCREMENT:
      return { ...state, count: state.count + 1 };
    case T.START_RECORDING_SUCCESS:
      return {
        ...state,
        status: C.APP_STATUS.RECORDER,
        recorderStatus: C.APP_STATUS.PENDING,
        player: {
          ...state.player,
          nextCommandIndex: null
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
        safeUpdateIn(
          ['editor', 'macrosExtra', getCurrentMacroId(state), 'breakpointIndices'],
          (indices) => updateBreakpointIndices(indices || [], 'add', action.data.index + 1)
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
          ['editor', 'editing', 'meta', 'indexToInsertRecorded'],
          (recordIndex) => {
            if (recordIndex === undefined || recordIndex === null || recordIndex < 0) {
              return recordIndex
            }
            return recordIndex + (action.data.index <= recordIndex ? 1 : 0)
          }
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
        safeUpdateIn(
          ['editor', 'macrosExtra', getCurrentMacroId(state), 'breakpointIndices'],
          (indices) => {
            return updateBreakpointIndices(indices || [], 'add', action.data.index)
          }
        )
      )(state)

    case T.UPDATE_COMMAND:
      return compose(
        setEditingSourceCurrent,
        updateHasUnSaved,
        updateIn(
          ['editor', 'editing', 'commands', action.data.index],
          (cmdObj) => ({...cmdObj, ...action.data.command})
        )
      )(state)

    case T.REMOVE_COMMAND:
      return compose(
        setEditingSourceCurrent,
        updateHasUnSaved,
        (state) => {
          const { commands, meta } = state.editor.editing
          const isSelectedIndexStillValid = meta.selectedIndex >= 0 && meta.selectedIndex < commands.length

          if (isSelectedIndexStillValid) {
            return state
          }

          const startDistance     = action.data.index
          const endDistance       = commands.length - action.data.index - 1
          const nextSelectedIndex = startDistance < endDistance ? 0 : (commands.length - 1)

          return setIn(['editor', 'editing', 'meta', 'selectedIndex'], nextSelectedIndex, state)
        },
        updateIn(
          ['editor', 'editing', 'commands'],
          (commands) => {
            const { index } = action.data
            const newCommands = commands.slice()
            newCommands.splice(index, 1)
            return newCommands
          }
        ),
        safeUpdateIn(
          ['editor', 'macrosExtra', getCurrentMacroId(state), 'breakpointIndices'],
          (indices) => updateBreakpointIndices(indices || [], 'delete', action.data.index)
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

    case T.UPDATE_EDITING:
      return compose(
        setIn(
          ['editor', 'editing'],
          action.data.editing
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
        safeUpdateIn(
          ['editor', 'macrosExtra', getCurrentMacroId(state), 'breakpointIndices'],
          (indices) => updateBreakpointIndices(indices || [], 'delete', action.data.indices)
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
        safeUpdateIn(
          ['editor', 'macrosExtra', getCurrentMacroId(state), 'breakpointIndices'],
          (indices) => updateBreakpointIndices(indices || [], 'add', commands.map(_ => action.data.index + 1))
        )
      )(state)
    }

    case ActionTypes.moveCommands: {
      const { commands = [] } = state.editor.editing
      const { startIndex, endIndex } = action.data

      if (startIndex < 0 || startIndex >= commands.length) {
        throw new Error('startIndex is out of range')
      }

      if (endIndex < 0 || endIndex >= commands.length) {
        throw new Error('endIndex is out of range')
      }

      if (endIndex === startIndex) {
        throw new Error('startIndex and endIndex must be different')
      }

      const newCommands = [...commands]

      newCommands.splice(startIndex, 1)
      newCommands.splice(endIndex, 0, commands[startIndex])

      return compose(
        setEditingSourceCurrent,
        updateHasUnSaved,
        setIn(['editor', 'editing', 'commands'], newCommands),
        updateIn(['editor', 'editing', 'meta', 'selectedIndex'], (selectedIndex) => {
          switch (selectedIndex) {
            case startIndex:    return endIndex
            case endIndex:      return startIndex
            default:            return selectedIndex
          }
        })
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
          (cmdObj) => normalizeCommand({...cmdObj, ...action.data})
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

    case ActionTypes.updateTestSuite: {
      const { id, updated } = action.data
      const index = state.editor.testSuites.findIndex(ts => ts.id === id)

      if (index === -1) return state
      return setIn(['editor', 'testSuites', index], updated, state)
    }

    case T.UPDATE_TEST_SUITE_STATUS: {
      const { id, extra } = action.data
      if (!id)  return state

      return updateIn(
        ['editor', 'testSuitesExtra'],
        data => ({...data, [id]: extra}),
        state
      )
    }

    case T.SET_EDITING:
      // log('REDUCER SET_EDITING', action.data)

      if (!action.data) return state
      return compose(
        setEditingSourceCurrent,
        updateHasUnSaved,
        setIn(['editor', 'editing'], action.data)
      )(state)

    case T.EDIT_TEST_CASE: {
      const { id } = state.editor.editing.meta.src || {}

      if (!action.data.macro)  return state

      const macro = action.data.macro

      return compose(
        setIn(
          ['editor', 'editing'],
          {
            ...macro.data,
            meta: {
              selectedIndex: -1,
              hasUnsaved: false,
              src: pick(['id', 'name'], macro)
            }
          }
        ),
        updateIn(
          ['player'],
          (player) => ({
            ...player,
            status: C.PLAYER_STATUS.STOPPED,
            stopReason: null,
            nextCommandIndex: null
          })
        ),
        resetEditingSource({
          name:     macro.name,
          commands: macro.data.commands
        }),
        updateHasUnSaved
      )(state)
    }

    case T.SET_ONE_MACRO_EXTRA: {
      const { id, extra } = action.data

      if (!id)  return state

      return safeSetIn(
        ['editor', 'macrosExtra', id],
        extra,
        state
      )
    }

    case T.UPDATE_ONE_MACRO_EXTRA: {
      const { id, extra } = action.data

      if (!id)  return state

      return safeUpdateIn(
        ['editor', 'macrosExtra', id],
        (data) => ({ ...data, ...extra }),
        state
      )
    }

    case ActionTypes.renameTestCase:
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
          nextCommandIndex: null
        })),
        resetEditingSource({
          name:     'Untitled',
          commands: []
        })
      )(state)
    }

    case T.SET_MACROS_EXTRA: {
      return setIn(['editor', 'macrosExtra'], action.data, state)
    }

    case T.SET_TEST_SUITES_EXTRA: {
      return setIn(['editor', 'testSuitesExtra'], action.data, state)
    }

    case ActionTypes.setMacroFolderStructure: {
      return setIn(['editor', 'macroFolderStructure'], action.data, state)
    }

    case ActionTypes.setTestSuiteFolderStructure: {
      return setIn(['editor', 'testSuiteFolderStructure'], action.data, state)
    }

    case T.SET_PLAYER_STATE:
      return compose(
        updateIn(['player'], (playerState) => ({...playerState, ...action.data})),
        updateIn(['noDisplayInPlay'], (noDisplayInPlay) => {
          // Reset noDisplay to false when macro stops playing
          return action.data.status === C.PLAYER_STATUS.STOPPED ? false : noDisplayInPlay
        }),
        updateIn(['ocrInDesktopMode'], (ocrInDesktopMode) => {
          // Reset ocrInDesktopMode to false when macro stops playing
          return action.data.status === C.PLAYER_STATUS.STOPPED ? false : ocrInDesktopMode
        }),
        updateIn(['replaySpeedOverrideToFastMode'], (replaySpeedOverrideToFastMode) => {
          // Reset replaySpeedOverrideToFastMode to false when macro stops playing
          return action.data.status === C.PLAYER_STATUS.STOPPED ? false : replaySpeedOverrideToFastMode
        })
      )(state)

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

    case T.UPDATE_PROXY: {
      return {
        ...state,
        proxy: action.data
      }
    }

    case ActionTypes.setIsDraggingCommand: {
      return setIn(['editor', 'isDraggingCommand'], action.data, state)
    }

    case ActionTypes.setCurrentMacro: {
      return setIn(['editor', 'currentMacro'], action.data, state)
    }

    case ActionTypes.setIsLoadingMacros: {
      return setIn(['isLoadingMacros'], action.data, state)
    }

    case ActionTypes.setFrom: {
      return setIn(['from'], action.data, state)
    }

    case ActionTypes.setNoDisplayInPlay: {
      return setIn(['noDisplayInPlay'], action.data, state)
    }

    case ActionTypes.setOcrInDesktopMode: {
      return setIn(['ocrInDesktopMode'], action.data, state)
    }

    case ActionTypes.setReplaySpeedOverrideToFastMode: {
      return setIn(['replaySpeedOverrideToFastMode'], action.data, state)
    }

    case ActionTypes.setMacroQuery: {
      return setIn(['macroQuery'], action.data, state)
    }

    case ActionTypes.setIndexToInsertRecorded: {
      return setIn(
        ['editor', 'editing', 'meta', 'indexToInsertRecorded'],
        action.data,
        state
      )
    }

    case ActionTypes.toggleRecorderSkipOpen: {
      return updateIn(
        ['recorder', 'skipOpen'],
        (skipOpen) => action.data !== undefined ? action.data : !skipOpen,
        state
      )
    }

    default:
      return state
  }
}
