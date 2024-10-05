/* global PREINSTALL_CSV_LIST PREINSTALL_VISION_LIST */

import { message } from 'antd'
import { type3, types as T } from './action_types'
import { pick, until, on, map, compose, uid, delay, loadCsv, loadImage, withFileExtension, validateStandardName } from '../common/utils'
import csIpc from '../common/ipc/ipc_cs'
import storage from '../common/storage'
import { getStorageManager, StorageTarget, StorageStrategyType } from '../services/storage'
import { normalizeCommand, normalizeTestCase } from '../models/test_case_model'
import { getPlayer } from '../common/player'
import { backup } from '../services/backup/backup'
import log from '../common/log'
import { fromJSONString } from '../common/convert_utils'
import config from '../config'
import preTcs from '../config/preinstall_macros'
import { getMacroExtraKeyValueData } from '../services/kv_data/macro_extra_data'
import { getTestSuitesWithAllInfo, getBreakpoints, getBreakpointsByMacroId, getCurrentMacroId, getErrorCommandIndices, getWarningCommandIndices, getMacrosExtra, getMacroFileNodeList, hasUnsavedMacro } from '../recomputed'
import { prompt } from '../components/prompt'
import { isValidCmd } from '../common/command'
import { getMacroCallStack } from '../services/player/call_stack/call_stack'
import { MacroStatus } from '../services/player/macro'
import getSaveTestCase from '../components/save_test_case'
import { posix as path } from '../common/lib/path'
import { uniqueStrings, flow } from '../common/ts_utils'
import { renderLog } from '../common/macro_log'
import { getLogService } from '../services/log'
import { getMiscData, MiscKey } from '../services/kv_data/misc_data'
import { INCREMENT } from '../reducers'

let recordedCount = 0

const saveEditing = ({ dispatch, getState }) => {
  const state  = getState()
  const { editing, isDraggingCommand } = state.editor

  if (isDraggingCommand) {
    return
  }

  storage.set('editing', editing)
}

const saveMacroExtra = (id) => ({ dispatch, getState }) => {
  const state   = getState()

  if (state.editor.isDraggingCommand) {
    return
  }

  const macroId = id || getCurrentMacroId(state)
  const updated = state.editor.macrosExtra[macroId] || {}

  return getMacroExtraKeyValueData().update(macroId, (data) => {
    return {
      ...data,
      ...updated
    }
  })
}

const saveWholeMacrosExtra = ({ dispatch, getState }) => {
  const state       = getState()
  const macrosExtra = getMacrosExtra(state)

  return getMacroExtraKeyValueData().set('', macrosExtra)
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
          width: 860,
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
        if ((oldConfig && oldConfig.showSidebar) === config.showSidebar) return

        if (finalSize.width !== window.outerWidth || finalSize.height !== window.outerHeight) {
          csIpc.ask('PANEL_RESIZE_WINDOW', { size: finalSize })
        }
      })
    }

    storage.set('config', config)
    lastSize = finalSize
  }
})()

const toLower = (str) => (str || '').toLowerCase()

export function findSameNameMacro (name, macros) {
  return macros.find(tc => toLower(tc.name) === toLower(name))
}

export function findSamePathMacro (path, macroNodes) {
  const converPath = (str) => toLower(str).replace(/.json$/, '')
  return macroNodes.find(node => converPath(node.relativePath) === converPath(path))
}

export function findMacrosInFolder (folderPath, macroNodes) {
  const lowerFolderPath = toLower(folderPath)

  return macroNodes.filter(macroNode => {
    const lowerMacroFullPath = toLower(macroNode.fullPath)

    if (lowerMacroFullPath.indexOf(lowerFolderPath) !== 0) {
      return false
    }

    const parts = lowerMacroFullPath.substr(lowerFolderPath.length).split(/\/|\\/g)

    if (parts.length !== 2 || parts[0] !== '') {
      return false
    }

    return true
  })
}

export function findSameNameTestSuite (name, testSuites) {
  return testSuites.find(ts => toLower(ts.name) === toLower(name))
}

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
      return csIpc.ask('PANEL_START_RECORDING', {}).then(() => {
        return csIpc.ask('PANEL_TRY_TO_RECORD_OPEN_COMMAND')
      })
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

export function increaseRecordedCount () {
  recordedCount += 1
  // Note: show in badge the recorded count
  csIpc.ask('PANEL_UPDATE_BADGE', {
    type: 'record',
    text: '' + recordedCount
  })
}

export function appendCommand (cmdObj, fromRecord = false) {
  if (fromRecord) {
    increaseRecordedCount()
  }

  return {
    type: T.APPEND_COMMAND,
    data: { command: normalizeCommand(cmdObj) },
    post: [
      saveEditing,
      saveMacroExtra()
    ]
  }
}

export function duplicateCommand (index) {
  return {
    type: T.DUPLICATE_COMMAND,
    data: { index },
    post: [
      saveEditing,
      saveMacroExtra()
    ]
  }
}

export function insertCommand (cmdObj, index, fromRecord = false) {
  if (fromRecord) {
    increaseRecordedCount()
  }

  return {
    type: T.INSERT_COMMAND,
    data: {
      index,
      command: normalizeCommand(cmdObj)
    },
    post: [
      saveEditing,
      saveMacroExtra()
    ]
  }
}

export function updateCommand (cmdObj, index) {
  return {
    type: T.UPDATE_COMMAND,
    data: {
      command: normalizeCommand(cmdObj),
      index: index
    },
    post: saveEditing
  }
}

export function removeCommand (index) {
  return {
    type: T.REMOVE_COMMAND,
    data: { index },
    post: [
      saveEditing,
      saveMacroExtra()
    ]
  }
}

export function selectCommand (index, forceClick) {
  return {
    type: T.SELECT_COMMAND,
    data: { index, forceClick },
    post: saveEditing
  }
}

// Note: consider this action as patch for updating commands in redux state only
export function updateEditing (editing) {
  return {
    type: T.UPDATE_EDITING,
    data: { editing },
    post: []
  }
}

export function cutCommand (index) {
  return {
    type: T.CUT_COMMAND,
    data: { indices: [index] },
    post: [
      saveEditing,
      saveMacroExtra()
    ]
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
    post: [
      saveEditing,
      saveMacroExtra()
    ]
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

export function toggleComment (commandIndex) {
  return (dispatch, getState) => {
    const state    = getState()
    const commands = state.editor.editing.commands
    const command  = commands[commandIndex]

    if (!command || !command.cmd || !command.cmd.length)  {
      return
    }

    // Note: for commented out command, its data looks like:
    // {
    //   cmd:     'comment',
    //   target:  'originalCmd // originalTarget
    //   value:   not touched
    // }
    if (command.cmd === 'comment') {
      const separator = ' // '
      const index     = command.target.indexOf(separator)
      if (index === -1) return

      const cmd = command.target.substr(0, index)
      if (!isValidCmd(cmd)) return

      const target = command.target.substr(index + separator.length)

      return dispatch(updateCommand({
        ...command,
        cmd,
        target
      }, commandIndex))
    } else {
      return dispatch(updateCommand({
        ...command,
        cmd:    'comment',
        target: `${command.cmd} // ${command.target || ''}`
      }, commandIndex))
    }
  }
}

export function toggleCommentOnSelectedCommand () {
  return (dispatch, getState) => {
    const state    = getState()
    const index    = state.editor.editing.meta.selectedIndex

    dispatch(toggleComment(index))
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

    // log('ACTION, saveSourceCodeToEditing', str)

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
    
    const state   = getState()
    const src     = state.editor.editing.meta.src
    const macroId = src.id
    const data    = pick(['commands'], state.editor.editing)
    const macroStorage = getStorageManager().getMacroStorage()

    if (!macroId) {
      throw new Error(`Can't find macro with path '${macroId}'`)
    }

    // Make sure, only 'cmd', 'value', 'target' are saved in storage
    data.commands = data.commands.map(normalizeCommand)

    if (hasUnsavedMacro(state)) {
      // Reset test case status
      dispatch(
        updateMacroPlayStatus(macroId, null)
      )
    }

    return macroStorage.read(macroId, 'Text')
    .then(macro => {
      const updatedMacro = { ...macro, data }

      dispatch({
        type: 'setCurrentMacro',
        data: updatedMacro
      })

      return macroStorage.write(macroId, updatedMacro)
    })
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
    const sameName = findSameNameMacro(name, state.editor.testCases)

    if (sameName) {
      return Promise.reject(new Error('The macro name already exists!'))
    }

    const relativePath = '/' + name + '.json'
    const id = getStorageManager().getMacroStorage().filePath(relativePath)
    const newMacro = { id, name, data }

    return getStorageManager()
    .getMacroStorage()
    .write(relativePath, newMacro)
    .then(() => {
      dispatch({
        type: 'setCurrentMacro',
        data: newMacro
      })

      return dispatch({
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

export function setTestCases (testCases) {
  const tcs = testCases.slice()

  tcs.sort((a, b) => {
    const nameA = a.name.toLowerCase()
    const nameB = b.name.toLowerCase()

    if (nameA < nameB) return -1
    if (nameA === nameB)  return 0
    return 1
  })

  return {
    type: T.SET_TEST_CASES,
    data: tcs,
    post: ({dispatch, getState}) => {
      const state = getState()
      const macroNodes = getMacroFileNodeList(state)
      const shouldSelectDefault = macroNodes.length > 0 &&
                                  !state.editor.editing.meta.src &&
                                  state.editor.editing.commands.length === 0

      if (shouldSelectDefault) {
        dispatch(editTestCase(macroNodes[0].fullPath))
      }
    }
  }
}

export function resetEditing () {
  return (dispatch, getState) => {
    const state = getState()
    const { editing } = state.editor
    const macroNodes = getMacroFileNodeList(state)

    // Leave it if it's a new macro
    if (editing.meta && !editing.meta.src)  return
    if (macroNodes.length === 0) {
      dispatch(editNewTestCase())
    } else {
      dispatch(editTestCase(macroNodes[0].fullPath))
    }
  }
}

export function resetEditingIfNeeded () {
  return (dispatch, getState) => {
    const state = getState()
    const { editing } = state.editor
    const lastTcId = editing.meta.src && editing.meta.src.id

    if (!lastTcId)  return resetEditing()(dispatch, getState)
    dispatch(editTestCase(lastTcId))
  }
}

export function setEditing (editing) {
  return {
    type: T.SET_EDITING,
    data: editing
  }
}

export function editTestCase (id) {
  return (dispatch, getState) => {
    return getStorageManager().getMacroStorage().read(id, 'Text')
    .then(rawMacro => {
      const macro = normalizeTestCase(rawMacro)

      dispatch({
        type: 'setCurrentMacro',
        data: macro
      })

      dispatch({
        type: T.EDIT_TEST_CASE,
        data: {
          id,
          macro
        },
        post: saveEditing
      })

      // Save last edited macro id for each mode,
      // so that we can recover to it after switching mode
      const mode = getStorageManager().getCurrentStrategyType()
      const key = (() => {
        switch (mode) {
          case StorageStrategyType.Browser:
            return MiscKey.BrowserModeLastMacroId

          case StorageStrategyType.XFile:
            return MiscKey.XFileModeLastMacroId

          default:
            throw new Error(`Invalid mode: ${mode}`)
        }
      })()

      getMiscData().set(key, id)

      return macro
    })
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
    return getStorageManager()
    .getMacroStorage()
    .write(tc.name, {
      id: uid(),
      ...tc
    })
  }
}

export function addTestCases ({ macros, folder = '/', overwrite = false, storageStrategyType = null }) {
  return (dispatch, getState) => {
    const storage = getStorageManager()
                    .getStorageForTarget(
                      StorageTarget.Macro,
                      storageStrategyType || getStorageManager().getCurrentStrategyType()
                    )
    const state        = getState()
    const dirToCompare = folder === '/' ? '' : storage.relativePath(folder, true)
    const allMacros    = getMacroFileNodeList(state)
    const macroNodes   = allMacros.filter(node => {
      const rawDir = storage.getPathLib().dirname(node.fullPath)
      const dir    = storage.relativePath(rawDir, true)

      return dirToCompare === dir
    })
    const failTcs    = []
    const validTcs   = []

    macros.forEach(macro => {
      const isValid = overwrite || !macroNodes.find(node => node.name === macro.name)

      if (isValid) {
        validTcs.push(macro)
      } else {
        failTcs.push(macro)
      }
    })

    const passCount = validTcs.length
    const failCount = macros.length - passCount

    if (passCount === 0) {
      return Promise.resolve({ passCount, failCount, failTcs })
    }

    const macrosToWrite = validTcs.map(tc => ({
      filePath: path.join(folder, `${tc.name}.json`),
      content: {
        ...tc,
        id: uid(),
        udpateTime: new Date() * 1
      }
    }))

    return storage.ensureDirectory(folder)
    .then(() => storage.bulkWrite(macrosToWrite))
    .then(() => ({ passCount, failCount, failTcs }))
  }
}

export function removeTestCase (macroId) {
  return (dispatch, getState) => {
    const state = getState()
    const curId = state.editor.editing.meta.src && state.editor.editing.meta.src.id
    const tss   = state.editor.testSuites.filter(ts => {
      return ts.cases.find(m => m.testCaseId === macroId)
    })

    if (tss.length > 0) {
      return Promise.reject(new Error(`Can't delete this macro for now, it's currently used in following test suites: ${tss.map(item => item.name)}`))
    }

    // Reset test case status
    dispatch(
      updateMacroPlayStatus(macroId, null)
    )

    return getStorageManager()
    .getMacroStorage()
    .remove(macroId)
    .then(() => {
      dispatch({
        type: T.REMOVE_TEST_CASE,
        data: {
          isCurrent: curId === macroId
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

export function addPlayerWarningCommandIndex (index) {
  return (dispatch, getState) => {
    const state               = getState()
    const macroId             = getCurrentMacroId(state)
    const indices             = getWarningCommandIndices(state)
    const warningCommandIndices = indices.indexOf(index) === -1
                                  ? [...indices, index]
                                  :  indices
    dispatch(
      updateMacroExtra(macroId, { warningCommandIndices })
    )
  }
}

export function addPlayerErrorCommandIndex (index) {
  return (dispatch, getState) => {
    const state               = getState()
    const macroId             = getCurrentMacroId(state)
    const indices             = getErrorCommandIndices(state)
    const errorCommandIndices = indices.indexOf(index) === -1
                                  ? [...indices, index]
                                  :  indices
    dispatch(
      updateMacroExtra(macroId, { errorCommandIndices })
    )
  }
}

// test function
export const increment = () => ({ type: INCREMENT, data: 'anything' });

export function addLog (type, text, options = {}) {
  return (dispatch, getState) => {
    const state = getState()
    const callStack = options.noStack ? [] : getMacroCallStack().toArray()
    const logItem = {
      type,
      text,
      options,
      id: uid(),
      createTime: new Date(),
      stack: callStack.map((item, i) => ({
        macroId:      item.resource.id,
        macroName:    item.resource.name,
        commandIndex: i === callStack.length - 1 ? state.player.nextCommandIndex : item.runningStatus.nextIndex,
        isSubroutine: i !== 0
      }))
    }

    if (state.config.logFilter !== 'None') {
      // Also write file to hard drive when it's in xfile mode
      setTimeout(() => {
        if(logItem.type == "report"){
          let report = document.querySelector('.report').textContent;
          logItem.text = report;
        }
        csIpc.ask('PANEL_LOG', { log: renderLog(logItem, true) })
      }, 0)
    }

    return dispatch({
      type: T.ADD_LOGS,
      data: [logItem]
    })
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

export function setMacrosExtra (data, options = {}) {
  const opts = {
    shouldPersist: false,
    ...options
  }

  return {
    type: T.SET_MACROS_EXTRA,
    data: data || {},
    post: opts.shouldPersist ? saveWholeMacrosExtra : () => {}
  }
}

export function setTestSuitesExtra (data) {
  return {
    type: T.SET_TEST_SUITES_EXTRA,
    data: data || {}
  }
}

export function updateMacroExtra (id, extra) {
  // TODO: the key for extra info should be different,
  // something like storage mode + storage path + file name
  return {
    type: T.UPDATE_ONE_MACRO_EXTRA,
    data: { id, extra },
    post: saveMacroExtra(id)
  }
}

export function updateMacroPlayStatus (id, status) {
  return (dispatch, getState) => {
    dispatch(updateMacroExtra(id, { status }))
  }
}

export function updateMacroBreakpoints (id, breakpointIndices) {
  return (dispatch, getState) => {
    dispatch(updateMacroExtra(id, { breakpointIndices }))
  }
}

export function updateMacroDoneCommandsIndices (id, doneCommandIndices) {
  return (dispatch, getState) => {
    dispatch(updateMacroExtra(id, { doneCommandIndices }))
  }
}

export function updateMacroErrorCommandsIndices (id, errorCommandIndices) {
  return (dispatch, getState) => {
    dispatch(updateMacroExtra(id, { errorCommandIndices }))
  }
}

export function updateMacroWarningCommandsIndices (id, warningCommandIndices) {
  return (dispatch, getState) => {
    dispatch(updateMacroExtra(id, { warningCommandIndices }))
  }
}

export function updateProxy (proxy) {
  return {
    type: T.UPDATE_PROXY,
    data: proxy
  }
}

export function commonPlayerState (state, options, macroId, macroName) {
  const { config }  = state
  const cfg         = pick(['playHighlightElements', 'playScrollElementsIntoView'], config)
  const finalMacroName = (() => {
    if (macroName) {
      return macroName
    }

    if (!macroId) {
      return state.editor.editing.meta.src ? state.editor.editing.meta.src.name : 'Untitled'
    }

    const macro = getMacroFileNodeList(state).find(node => node.fullPath === macroId)

    if (!macro) {
      throw new Error(`can't find macro with id '${macroId}'`)
    }

    return macro.name
  })()
  const scope       = {
    '!MACRONAME':         finalMacroName,
    '!TIMEOUT_PAGELOAD':  parseFloat(config.timeoutPageLoad),
    '!TIMEOUT_WAIT':      parseFloat(config.timeoutElement),
    '!TIMEOUT_MACRO':     parseFloat(config.timeoutMacro),
    '!TIMEOUT_DOWNLOAD':  parseFloat(config.timeoutDownload),
    '!OCRLANGUAGE':       config.ocrLanguage,
    '!CVSCOPE':           config.cvScope,
    '!REPLAYSPEED': ({
      '0':    'FASTV1',
      '0':    'FAST',
      '0.3':  'MEDIUMV1',
      '0.3':  'MEDIUM',
      '2':    'SLOWV1',
      '2':    'SLOW'
    })[options.postDelay / 1000] || 'MEDIUM',
    ...(options.overrideScope || {})
  }

  const breakpoints = macroId ? getBreakpointsByMacroId(state, macroId) : getBreakpoints(state)

  const opts = compose(
    on('resources'),
    map,
    on('extra')
  )((extra = {}) => ({
    ...extra,
    ...cfg,
    ...(options.commandExtra || {})
  }))(options)

  const playerState = {
    title: finalMacroName,
    ...opts,
    public: {
      ...(opts.public || {}),
      scope
    },
    breakpoints: [...breakpoints, ...(options.breakpoints || [])]
  }

  return playerState
}

export function playerPlay (options) {
  // Filter out empty commands
  const opts = {
    ...options,
    resources: (options.resources || []).filter(res => res.cmd && res.cmd.length > 0)
  }

  return (dispatch, getState) => {
    return getSaveTestCase()
    .saveOrNot({
      getContent: (data) => 'You must save macro before replay',
      okText:           'Save',
      cancelText:       'Cancel',
      autoSaveExisting: true
    })
    .then(saved => {
      if (!saved) return

      const state       = getState()
      const playerState = commonPlayerState(state, opts, opts.macroId, opts.title)

      getMacroCallStack().clear()

      return getMacroCallStack().call({
        id:       opts.macroId,
        name:     playerState.title,
        commands: opts.resources
      }, {
        playerState,
        status:           MacroStatus.Running,
        nextIndex:        opts.startIndex,
        commandResults:   []
      })
    })
  }
}

export function listCSV () {
  return (dispatch, getState) => {
    const csvStorage = getStorageManager().getCSVStorage()

    csvStorage.list()
    .then(list => {
      return Promise.all(list.map(item => {
        return {
          name:       item.name,
          size:       item.size,
          fullPath:   item.fullPath,
          createTime: new Date(item.lastModified)
        }
      }))
    })
    .then(list => {
      dispatch({
        type: T.SET_CSV_LIST,
        data: list
      })
    })
    .catch(e => {
      log.error('listCSV error', e)
      return Promise.reject(e)
    })
  }
}

export function listScreenshots () {
  return (dispatch, getState) => {
    const man = getStorageManager().getScreenshotStorage()

    return man.list().then(list => {
      // log('listScreenshots', list)

      return list.map(item => ({
        name:       item.name,
        fullPath:   item.fullPath,
        createTime: new Date(item.lastModified)
      }))
    })
    .then(list => {
      dispatch({
        type: T.SET_SCREENSHOT_LIST,
        data: list
      })
    })
    .catch(e => {
      log.error('listScreenshots error', e)
      return Promise.reject(e)
    })
  }
}

export function listVisions () {
  return (dispatch, getState) => {
    const visionStorage = getStorageManager().getVisionStorage()

    return visionStorage.list().then(list => {
      // log('listVisions', list)

      return list.map(item => ({
        name:       item.name,
        fullPath:   item.fullPath,
        createTime: new Date(item.lastModified)
      }))
    })
    .then(list => {
      dispatch({
        type: T.SET_VISION_LIST,
        data: list
      })
    })
    .catch(e => {
      log.error('listVisions error', e)
      return Promise.reject(e)
    })
  }
}

export function renameVisionImage (fileName, shouldUpdateCommand = true) {
  return (dispatch, getState) => {
    return withFileExtension(fileName, (baseName, addExtName) => {
      return prompt({
        title:   'Image Name',
        message: `Note: Please keep the '_dpi_xx' postfix`,
        value:   baseName,
        keepOpenOnError: true,
        selectionEnd: (() => {
          const m = baseName.match(/_dpi_\d+/i)
          if (!m) return undefined
          return m.index
        })(),
        onOk: (finalBaseName) => {
          // Note: a small timeout to prevent "select" button from accepting "enter" keypress
          const timeout = delay(() => true, 100)
          if (finalBaseName === baseName) return timeout

          try {
            validateStandardName(finalBaseName, true)
          } catch (e) {
            message.error(e.message)
            throw e
          }

          return getStorageManager()
          .getVisionStorage()
          .exists(addExtName(finalBaseName))
          .then(result => {
            if (result) {
              const msg = `'${addExtName(finalBaseName)}' already exists`
              message.error(msg)
              throw new Error(msg)
            }

            return getStorageManager()
            .getVisionStorage()
            .rename(fileName, addExtName(finalBaseName))
            .then(() => timeout)
            .catch(e => {
              // Note: If there is error in renaming like duplicate names,
              // it should show error message and let users try again
              message.error(e.message)
              throw e
            })
          })
        }
      })
      .then(finalFullName => {
        // If users click "Cancel" button, we should delete it #479
        // Have to give it private name, since withFileExtenion will try to add '.png'
        if (!finalFullName) {
          return getStorageManager()
          .getVisionStorage()
          .remove(addExtName(baseName))
          .then(() => dispatch(listVisions()))
          .then(() => '__kantu_deleted__')
        }

        return finalFullName
      })
    })
    .then(finalFullName => {
      // It means it's deleted (user clicks "cancel")
      if (/__kantu_deleted__/.test(finalFullName)) return

      if (shouldUpdateCommand) {
        dispatch(updateSelectedCommand({ target: finalFullName }))
      }
      dispatch(listVisions())
      message.success(`Saved vision as ${finalFullName}`)
      return finalFullName
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
    const state = getState()
    const existingtestSuites  = getTestSuitesWithAllInfo(state)
    const hasDuplicateName    = !!existingtestSuites.find(item => ts.name === item.name)

    if (hasDuplicateName) {
      return Promise.reject(new Error(`The test suite name '${ts.name}' already exists!`))
    }

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
    const state = getState()
    const existingtestSuites = getTestSuitesWithAllInfo(state)

    const validTss  = tss.filter(ts => !existingtestSuites.find(item => item.name === ts.name))
    const passCount = validTss.length
    const failCount = tss.length - passCount

    if (passCount === 0) {
      return Promise.resolve({ passCount, failCount, failTss: [] })
    }

    const storage = getStorageManager()
                    .getStorageForTarget(
                      StorageTarget.TestSuite, storageStrategyType ||
                      getStorageManager().getCurrentStrategyType()
                    )

    const testSuitesToWrite = validTss.map(ts => ({
      filePath: ts.name,
      content: {
        ...ts,
        id: uid(),
        updateTime: new Date() * 1
      }
    }))

    return storage.ensureDir()
    .then(() => storage.bulkWrite(testSuitesToWrite))
    .then(() => ({ passCount, failCount, failTss: [] }))
  }
}

export function removeTestSuite (id) {
  return (dispatch, getState) => {
    const state = getState()
    const ts = state.editor.testSuites.find(ts => ts.id === id)

    if (!ts) throw new Error(`can't find test suite with id '${id}'`)

    // Reset test suite status
    dispatch({
      type: T.UPDATE_TEST_SUITE_STATUS,
      data: {
        id,
        extra: {
          fold:       false,
          playStatus: {}
        }
      }
    })

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
    const state = getState()
    const { config, editor } = state
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
        macroNodes: getMacroFileNodeList(state),
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

export function addBreakpoint (macroId, commandIndex) {
  return (dispatch, getState) => {
    const state      = getState()
    const extra      = state.editor.macrosExtra[macroId] || {}
    const indices    = extra.breakpointIndices || []
    const newIndices = indices.indexOf(commandIndex) === -1 ? [...indices, commandIndex] : indices

    dispatch(
      updateMacroBreakpoints(macroId, newIndices)
    )
  }
}

export function removeBreakpoint (macroId, commandIndex) {
  return (dispatch, getState) => {
    const state      = getState()
    const extra      = state.editor.macrosExtra[macroId] || {}
    const indices    = extra.breakpointIndices || []
    const newIndices = indices.filter(index => index !== commandIndex)

    dispatch(
      updateMacroBreakpoints(macroId, newIndices)
    )
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
        const thisVersion  = config.preinstall.version
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

      const installMacros = () => {
        const macroStorage = getStorageManager().getMacroStorage()
        const path = macroStorage.getPathLib()
        const folders = Object.keys(preTcs).map(relativePath => {
          return path.join(
            config.preinstall.macroFolder,
            path.dirname(relativePath)
          )
        })
        const uniqueFolders = uniqueStrings(...folders)

        return flow(
          ...uniqueFolders.map(dirPath => () => macroStorage.ensureDirectory(dirPath))
        )
        .then(() => {
          return Promise.all(
            Object.keys(preTcs).map(relativePath => {
              const macroName = path.basename(relativePath)
              const filePath  = macroStorage.filePath(
                path.join(
                  config.preinstall.macroFolder,
                  relativePath
                )
              )
              const str   = JSON.stringify(preTcs[relativePath])
              const macro = fromJSONString(str, macroName)

              return macroStorage.write(filePath, macro)
            })
          )
        })
      }

      return flow(installMacros)
    }

    // Preinstall csv
    const installCsvs = () => {
      const list = PREINSTALL_CSV_LIST
      if (list.length === 0)  return Promise.resolve()

      // Note: preinstalled resources all go into browser mode
      const csvStorage  = getStorageManager().getStorageForTarget(StorageTarget.CSV, StorageStrategyType.Browser)

      return csvStorage.ensureDir()
      .then(() => {
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
      })
    }

    // Preinstall vision images
    const installVisionImages = () => {
      const list = PREINSTALL_VISION_LIST
      if (list.length === 0)  return Promise.resolve()

      // Note: preinstalled resources all go into browser mode
      const visionStorage   = getStorageManager().getStorageForTarget(StorageTarget.Vision, StorageStrategyType.Browser)

      return visionStorage.ensureDir()
      .then(() => {
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
