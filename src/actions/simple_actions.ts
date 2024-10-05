import React from 'react'
import { Dispatch } from 'redux'
import { message, Modal } from 'antd'
import scrollIntoView from 'scroll-into-view-if-needed'
import { objMap, until, pathsInNodeList, addInBetween, setIn, ancestorsInNodesList, updateIn, safeUpdateIn, normalizeHtmlId, flatternTree, flatten, delay, findNodeInTree, findNodeInForest, nodeByOffset, getExtName, resolvePath, clone } from '@/common/ts_utils'
import { EntryNode, Entry, StandardStorage } from '@/services/storage/std/standard_storage'
import { getStorageManager, StorageStrategyType, StorageManagerEvent } from '@/services/storage'
import { compose } from '@/common/ts_utils'
import { prompt } from '@/components/prompt'
import log from '@/common/log'
import storage from '../common/storage'
import { saveEditingAsExisted,editTestCase, editNewTestCase, setMacrosExtra, findSamePathMacro, saveEditing, updateMacroPlayStatus, updateUI,selectCommand, copyCommand, cutCommand, pasteCommand, addLog, addTestCases, listCSV, listVisions } from './index'
import { getCurrentMacroId, getMacroFileNodeData, getMacrosExtra, getTestSuitesWithAllInfo, getMacroFileNodeList, findMacroNodeWithCaseInsensitiveFullPath, getMacroFolderNodeList, getFilteredMacroFileNodeData, findMacroNodeWithCaseInsensitiveRelativePath, getShouldIgnoreTargetOptions } from '@/recomputed'
import { FileNodeData, FileNodeType } from '@/components/tree_file'
import { MacroExtraData } from '@/services/kv_data/macro_extra_data'
import { TestSuite } from '@/common/convert_suite_utils'
import { Updater, Tree } from '@/common/types'
import { getTestSuiteExtraKeyValueData } from '@/services/kv_data/test_suite_extra_data'
import { normalizeTestSuite } from '@/models/test_suite_model'
import { uniqueName, sanitizeFileName, arrayBufferToString } from '@/common/utils'
import globalConfig from '@/config'
import { MacroCommand, Macro, toJSONString, toHtml, fromHtml, fromJSONString } from '@/common/convert_utils'
import { RunBy, MacroInState } from '@/reducers/state'
import { MiscKey, getMiscData } from '@/services/kv_data/misc_data'
import { UNTITLED_ID } from '@/common/constant'
import getSaveTestCase from '@/components/save_test_case'
import FileSaver from '@/common/lib/file_saver'
import { canCommandRunMacro, canCommandReadCsv, canCommandReadImage, parseImageTarget } from '@/common/command'
import JSZip from 'jszip'
import { Command } from '@/services/player/macro'
import config from '@/config'
import { getLicenseService } from '@/services/license'

export type GetMacroIdChangesOptions = {
  entryPath:      string;
  isDirectory:    boolean;
  getNewFilePath: (oldFullPath: string) => string;
}

export function getMacroIdChanges (options: GetMacroIdChangesOptions): Promise<Record<string, string>> {
  const { entryPath, isDirectory, getNewFilePath } = options
  const macroStorage  = getStorageManager().getMacroStorage()
  const entryFullPath = macroStorage.entryPath(entryPath, isDirectory)

  if (!isDirectory) {
    return Promise.resolve({
      [entryFullPath]: getNewFilePath(entryFullPath)
    })
  }

  return macroStorage.listR(entryFullPath)
  .then((entryNodes) => {
    const listOfNodes = entryNodes.map(node => flatternTree(node))
    const nodes: Entry[] = flatten(listOfNodes)

    return nodes
    .map((node) => node.fullPath)
    .reduce((prev, oldMacroPath) => {
      prev[oldMacroPath] = getNewFilePath(oldMacroPath)
      return prev
    }, {} as Record<string, string>)
  })
}

export type WithMacroIdChangesOptions = GetMacroIdChangesOptions & {
  dispatch: Dispatch<any>,
  run: () => Promise<void>
}

export function withMacroIdChanges (options: WithMacroIdChangesOptions) {
  return getMacroIdChanges(options)
  .then(macroIdChanges => {
    return Promise.resolve(
      options.run()
    )
    // Note: the delay is waiting for macro ids updated in state
    .then(() => delay(() => {}, 1000))
    .then(() => {
      options.dispatch(
        Actions.updateMacroIdsInTestSuites(macroIdChanges) as any
      )
    })
  })
}

export type CheckNodeShowUpParams = {
  dispatch:    Dispatch<any>;
  getState:    Function;
  message:     string;
  fullPath:    string;
  switchToIt?: boolean;
}

export function checkNodeShowUp (params: CheckNodeShowUpParams) {
  const { dispatch, getState, fullPath, message, switchToIt = true } = params

  return until('node shows up', () => {
    const state = getState()
    const { macroFolderStructure } = getState().editor
    const macroNodes = getMacroFileNodeList(state)
    const nodes: EntryNode[] = flatten(macroFolderStructure.map(flatternTree))
    const found: EntryNode | undefined = nodes.find((item: EntryNode) => item.fullPath === fullPath)
    const foundInTestCases = macroNodes.find((item) => item.fullPath === fullPath)

    // Note: testCases are slower than macorFolderStructure, because testCases need to read file
    // So have to wait for both
    return {
      pass: !!found && !!foundInTestCases,
      result: found
    }
  }, 100, 10 * 1000)
  .then(
    () => {
      if (switchToIt) {
        dispatch(editTestCase(fullPath))
      }
      dispatch(Actions.ensureTreeNodeUnfoldedForCurrentMacroNode() as any)
    },
    (e) => {
      log.error(e);
      fileFolderNotShown({
        dispatch,
        getState,
        message
      });
    }
  )
}

export type FileFolderNotShownParams = {
  dispatch: Dispatch<any>;
  getState: Function;
  message:  string;
}

export function fileFolderNotShown (params: FileFolderNotShownParams) {
  const { dispatch, getState, message } = params
  const { config } = getState()
  const { storageMode, xmodulesStatus = 'unregistered' } = config

  if (storageMode !== StorageStrategyType.XFile) {
    return
  }

  if (getLicenseService().isProLicense() || getLicenseService().isPlayerLicense()) {
    return
  }

  const reason = (() => {
    if (getLicenseService().hasNoLicense()) {
      return `${getLicenseService().getMaxXFileMacros()} macro/folder limit in free version`
    }

    if (getLicenseService().isPersonalLicense()) {
      return `${getLicenseService().getMaxXFileMacros()} macro/folder limit in Free Edition. Please use the PRO or ENTERPRISE Edition for unlimited direct file access.`
    }

    throw new Error('Unknown cases')
  })()

  Modal.warn({
    title:   'Please upgrade your XModule plan',
    content: `${message}, but not displayed due to ${reason}`,
    okText:  'OK',
    onOk: (): void => {
      dispatch(
        updateUI({ showSettings: true, settingsTab: 'register' })
      )
    }
  })
}

export const ActionFactories = {
  setNoDisplayInPlay: (name: string) => (noDisplayInPlay: boolean) => {
    return createAction(name, noDisplayInPlay)
  },
  setOcrInDesktopMode: (name: string) => (ocrInDesktopMode: boolean) => {
    return createAction(name, ocrInDesktopMode)
  },
  setReplaySpeedOverrideToFastMode: (name: string) => (replaySpeedOverrideToFastMode: boolean) => {
    return createAction(name, replaySpeedOverrideToFastMode)
  },
  setFrom: (name: string) => (from: RunBy) => {
    return createThunkAction((dispatch, getState) => {
      const { from: oldFrom } = getState()

      if (from === RunBy.Manual && oldFrom !== RunBy.Manual) {
        getStorageManager().emit(StorageManagerEvent.ForceReload)
      }

      dispatch(createAction(name, from) as any)
    })
  },
  setIsLoadingMacros: (name: string) => (isLoading: boolean) => {
    return createAction(name, isLoading)
  },
  setCurrentMacro: (name: string) => (macro: Macro) => {
    return createAction(name, macro)
  },
  copyCurrentCommand: (name: string) => () => {
    return createThunkAction((dispatch, getState) => {
      const { selectedIndex } = getState().editor.editing.meta

      if (selectedIndex === -1) {
        return
      }

      dispatch(copyCommand(selectedIndex))
    })
  },
  cutCurrentCommand: (name: string) => () => {
    return createThunkAction((dispatch, getState) => {
      const { selectedIndex } = getState().editor.editing.meta

      if (selectedIndex === -1) {
        return
      }

      dispatch(cutCommand(selectedIndex))
    })
  },
  pasteAtCurrentCommand: (name: string) => () => {
    return createThunkAction((dispatch, getState) => {
      const { selectedIndex } = getState().editor.editing.meta

      if (selectedIndex === -1) {
        return
      }

      dispatch(pasteCommand(selectedIndex))
    })
  },
  selectNextCommand: (name: string) => () => {
    return createThunkAction((dispatch, getState) => {
      const { meta, commands } = getState().editor.editing
      const { selectedIndex } = meta

      if (selectedIndex < commands.length - 1) {
        dispatch(selectCommand(selectedIndex + 1, true) as any)
      }
    })
  },
  selectPrevCommand: (name: string) => () => {
    return createThunkAction((dispatch, getState) => {
      const { meta, commands } = getState().editor.editing
      const { selectedIndex } = meta

      if (selectedIndex > 0) {
        dispatch(selectCommand(selectedIndex - 1, true) as any)
      }
    })
  },
  moveCommands: (name: string) => (startIndex: number, endIndex: number) => {
    return createAction(name, { startIndex, endIndex })
  },
  setIsDraggingCommand: (name: string) => (isDraggingCommand: boolean) => {
    return createAction(name, isDraggingCommand)
  },
  setMacroFolderStructure: (name: string) => (entryNodes: EntryNode[]) => {
    return createAction(name, entryNodes)
  },
  setTestSuiteFolderStructure: (name: string) => (entryNodes: EntryNode[]) => {
    return createAction(name, entryNodes)
  },
  macroCreateFolder: (name: string) => (options: { name: string, dir: string }) => {
    return createThunkAction((dispatch, getState) => {
      const macroStorage = getStorageManager().getMacroStorage()
      const path      = macroStorage.getPathLib()
      const parentDir = macroStorage.dirPath(options.dir)

      return prompt({
        width: 400,
        title: 'Create folder as..',
        message: '',
        value: '',
        placeholder: 'Folder name',
        selectionStart: 0,
        selectionEnd: 0,
        okText: 'Create',
        cancelText: 'Cancel',
        onCancel: () => Promise.resolve(true),
        onOk: (newName: string) => {
          const newFullPath = path.join(parentDir, sanitizeFileName(newName))

          return macroStorage.directoryExists(newFullPath)
          .then(exists => {
            if (exists) {
              const msg = `'${newName}' already exists`
              message.error(msg)
              throw new Error(msg)
            }

            return getStorageManager().getMacroStorage().createDirectory(
              newFullPath
            )
            .then(
              () => {
                message.success(`Created folder '${newName}'`)

                checkNodeShowUp({
                  getState,
                  dispatch,
                  fullPath: newFullPath,
                  switchToIt: false,
                  message: 'Folder created'
                })

                return true
              },
              (e) => {
                log.error(e)
                const msg = 'Failed to create folder: ' + e.message
                message.error(msg)
                throw new Error(msg)
              }
            )
          })
        }
      })
    })
  },
  macroDeleteFolder: (name: string) => (options: { dir: string }) => {
    // TODO: check if any macro is in use of some test suite

    return createThunkAction((dispatch, getState) => {
      const { dir }             = options
      const macroStorage        = getStorageManager().getMacroStorage()
      const assertNoMacroInUse  = () => {
        return getMacroIdChanges({
          entryPath:      macroStorage.dirPath(dir),
          isDirectory:    true,
          getNewFilePath: (str) => str
        })
        .then(macroIdChanges => {
          const state       = getState()
          const testSuites  = getTestSuitesWithAllInfo(state)
          const oldMacroIds = Object.keys(macroIdChanges)
          const problems    = [] as Array<{ macroPath: string, testSuiteName: string }>

          oldMacroIds.forEach((oldMacroId: string) => {
            testSuites.forEach((ts) => {
              if (ts.cases.find(obj => obj.testCaseId === oldMacroId)) {
                problems.push({
                  macroPath:     macroStorage.relativePath(oldMacroId),
                  testSuiteName: ts.name
                })
              }
            })
          })

          if (problems.length > 0) {
            const cnt   = 3
            const main  = problems.slice(0, cnt)
                          .map(obj => `"${obj.macroPath}" is still used in test suite "${obj.testSuiteName}"`)
                          .join('\n')
            const extra = problems.length <= cnt ? '' : `\n...\n(And ${problems.length - 1} more macro references)`
            const msg   = main + extra

            throw new Error(msg)
          }
        })
      }

      if (confirm(`Sure to delete ${dir} and all its content?`)) {
        return assertNoMacroInUse()
        .then(() => macroStorage.remove(dir, true))
        .catch((e: Error) => {
          Modal.warn({
            title:   'Failed to delete folder',
            content: e.message.split('\n').map(str => React.createElement('li', null, str)),
            okText:  'OK'
          })
        })

      }
    })
  },
  macroMoveEntry: (name: string) => (data: {entryId: string, dirId: string, isSourceDirectory: boolean }) => {
    return createThunkAction((dispatch, getState) => {
      const macroStorage      = getStorageManager().getMacroStorage()
      const path              = macroStorage.getPathLib()
      const getNewFilePath    = (oldMacroPath: string) => {
        const dirName           = path.basename(data.entryId)
        const oldDirFullPath    = macroStorage.dirPath(data.entryId)
        const relativePath      = path.relative(oldMacroPath, oldDirFullPath)
        return path.join(data.dirId, dirName, relativePath)
      }
      const moveEntry = () => macroStorage.move(data.entryId, data.dirId, data.isSourceDirectory, true)

      return withMacroIdChanges({
        dispatch,
        getNewFilePath,
        run:          moveEntry,
        entryPath:    data.entryId,
        isDirectory:  data.isSourceDirectory
      })
      .catch((e: Error) => {
        message.error(e.message)
      })
    })
  },
  macroRenameFolder: (name: string) => (options: { dir: string }) => {
    return createThunkAction((dispatch, getState) => {
      const { dir }       = options
      const macroStorage  = getStorageManager().getMacroStorage()
      const path          = macroStorage.getPathLib()
      const dirFullPath   = macroStorage.dirPath(dir)
      const folderName    = path.basename(dirFullPath)
      const parentDir     = path.dirname(dirFullPath)
      const editingId     = getState().editor.editing.meta.src.id
      const isEditingCur  = editingId.indexOf(dirFullPath + path.sep) === 0

      return prompt({
        width: 400,
        title: 'Rename the folder as..',
        message: '',
        value: folderName,
        placeholder: 'Folder name',
        selectionStart: 0,
        selectionEnd: folderName.length,
        okText: 'Rename',
        cancelText: 'Cancel',
        onCancel: () => Promise.resolve(true),
        onOk: (newName: string) => {
          const newFullPath = path.join(parentDir, sanitizeFileName(newName))

          return macroStorage.directoryExists(newFullPath)
          .then(exists => {
            if (exists) {
              const msg = `'${newName}' already exists`
              message.error(msg)
              throw new Error(msg)
            }

            return withMacroIdChanges({
              dispatch,
              isDirectory:    true,
              entryPath:      dirFullPath,
              getNewFilePath: (oldMacroPath: string) => {
                const relativePath = path.relative(oldMacroPath, dirFullPath)
                return path.join(newFullPath, relativePath)
              },
              run: () => {
                return macroStorage.moveDirectory(dirFullPath, newFullPath)
                .then(
                  () => {
                    message.success(`Renamed to '${newName}'`)

                    checkNodeShowUp({
                      getState,
                      dispatch,
                      fullPath: newFullPath,
                      switchToIt: false,
                      message: 'Folder renamed'
                    })

                    if (isEditingCur) {
                      const newMacroPath = editingId.replace(dirFullPath, newFullPath)
                      dispatch(editTestCase(newMacroPath))
                    }
                  },
                  (e) => {
                    log.error(e)
                    const msg = 'Failed to rename: ' + e.message
                    message.error(msg)
                    throw new Error(msg)
                  }
                )
              }
            })
            .then(() => true)
          })
        }
      })
    })
  },
  macroCreateFile: (name: string) => (options: { dir: string }) => {
    return createThunkAction((dispatch, getState) => {
      const { dir }       = options
      const macroStorage  = getStorageManager().getMacroStorage()
      const path          = macroStorage.getPathLib()

      return prompt({
        width: 400,
        title: 'Create new macro as..',
        message: '',
        value: '',
        placeholder: 'Macro name',
        selectionStart: 0,
        selectionEnd: 0,
        okText: 'Confirm',
        cancelText: 'Cancel',
        onCancel: () => Promise.resolve(true),
        onOk: (macroName: string) => {
          const filePath = path.join(dir, `${sanitizeFileName(macroName)}.json`)
          const fullPath = macroStorage.filePath(filePath)

          return macroStorage.fileExists(fullPath)
          .then(exists => {
            if (exists) {
              const msg = `'${macroName}' already exists`
              message.error(msg)
              throw new Error(msg)
            }

            return macroStorage.write(filePath, {
              name: macroName,
              data: {
                commands: []
              }
            })
            .then(
              () => {
                message.success(`Created macro '${macroName}'`)

                checkNodeShowUp({
                  getState,
                  dispatch,
                  fullPath,
                  message: 'New macro created'
                })

                return true
              },
              (e: Error) => {
                log.error(e)
                const msg = 'Failed to create macro: ' + e.message
                message.error(msg)
                throw new Error(msg)
              }
            )
          })
        }
      })
    })
  },
  ensureTreeNodeUnfoldedForCurrentMacroNode: (name: string) => (options?: { scrollIntoView?: boolean }) => {
    const opts = {
      scrollIntoView: true,
      ...(options || {})
    }

    return createThunkAction((dispatch, getState) => {
      const state       = getState()
      const macroId: string = getCurrentMacroId(state)
      const macrosExtra = getMacrosExtra(state)
      const fileNodes   = getMacroFileNodeData(state)
      const ancestors   = ancestorsInNodesList<FileNodeData>((node) => node.id === macroId, fileNodes)

      const scrollIfNeeded = () => {
        if (opts.scrollIntoView) {
          setTimeout(() => {
            const id  = normalizeHtmlId(macroId)
            const $el = document.getElementById(id)

            if ($el) {
              scrollIntoView($el, { behavior: 'smooth', block: 'nearest' })
            }
          }, 100)
        }
      }

      if (!ancestors || !ancestors.length) {
        return scrollIfNeeded()
      }

      const updates: Function[] = ancestors.map((node) => {
        return safeUpdateIn([node.id], (data: MacroExtraData) => ({
          ...(data || {}),
          folded: false
        }))
      })
      const newMacrosExtra = compose(...updates)(macrosExtra)

      dispatch(setMacrosExtra(newMacrosExtra, { shouldPersist: true }))

      scrollIfNeeded()
    })
  },
  updateMacroIdsInTestSuites: (name: string) => (macroIdChanges: Record<string, string>) => {
    return createThunkAction((dispatch, getState) => {
      const state       = getState()
      const testSuites  = getTestSuitesWithAllInfo(state)
      const oldMacroIds = Object.keys(macroIdChanges)

      oldMacroIds.forEach((oldMacroId: string) => {
        const newMacroId = macroIdChanges[oldMacroId]
         //dispatch(saveEditingAsExisted());
        const state  = getState()
        const { editing, isDraggingCommand } = state.editor
        storage.set('editing', editing)
        //document.querySelector('.select-case button').click()

        testSuites.forEach((ts) => {
          const indices = ts.cases.reduce((prev, obj, i) => {
            if (obj.testCaseId === oldMacroId) {
              prev.push(i)
            }
            return prev
          }, [] as number[])

          if (indices.length === 0) {
            return
          }

          const cases = compose(
            ...indices.map(i => setIn([i, 'testCaseId'], newMacroId))
          )(ts.cases)

          dispatch(
            Actions.updateTestSuite(ts.id as any, { cases }) as any
          )
        })
      })
    })
  },
  updateTestSuite: (name: string) => (id: string, data: Partial<TestSuite> | Updater<Partial<TestSuite>>) => {
    return createThunkAction((dispatch, getState) => {
      const state       = getState()
      const testSuites  = getTestSuitesWithAllInfo(state)
      const ts          = testSuites.find(ts => ts.id === id)

      if (!ts) {
        return
      }

      const realData    = typeof data === 'function' ? data(ts) : data
      const hasRename   = realData.name && ts.name !== realData.name

      if (hasRename) {
        const hasDuplciateName = !!testSuites.find(ts => ts.id !== id && ts.name === realData.name)

        if (hasDuplciateName) {
          return Promise.reject(new Error(`The test suite name '${realData.name}' already exists!`))
        }
      }

      // Note: revised may contain `playStatus`
      const revised   = {
        ...ts,
        ...realData
      }

      const suiteStorage  = getStorageManager().getTestSuiteStorage()
      const suiteName     = hasRename ? realData.name : ts.name
      const pRename       = hasRename ? suiteStorage.rename(ts.name, realData.name as string)
                                      : Promise.resolve()
      const pStoreExtra   = hasRename && getStorageManager().isXFileMode()
                              ? getTestSuiteExtraKeyValueData()
                                .set(id, {
                                  fold:       false,
                                  playStatus: {}
                                })
                              : getTestSuiteExtraKeyValueData()
                                .set(id, {
                                  fold:       revised.fold,
                                  playStatus: revised.playStatus || {}
                                })

      dispatch({
        type: name,
        data: {
          id: id,
          updated: normalizeTestSuite(revised)
        }
      })

      if (hasRename && getStorageManager().isXFileMode()) {
        // Reset test suite status
        dispatch({
          type: 'UPDATE_TEST_SUITE_STATUS',
          data: {
            id,
            extra: {
              fold:       false,
              playStatus: {}
            }
          }
        })
      } else {
        dispatch({
          type: 'UPDATE_TEST_SUITE_STATUS',
          data: {
            id,
            extra: {
              fold:       revised.fold,
              playStatus: revised.playStatus || {}
            }
          }
        })
      }

      return Promise.all([
        pRename,
        pStoreExtra
      ])
      .then(() => suiteStorage.write(suiteName as string, revised))
    })
  },
  renameTestCase: (name: string) => (newName: string, fullPath: string) => {
    return createThunkAction((dispatch, getState) => {
      const macroStorage = getStorageManager().getMacroStorage()
      const path      = macroStorage.getPathLib()
      const state     = getState()
      const editingId = state.editor.editing.meta.src.id
      const newPath   = macroStorage.filePath(path.join(path.dirname(fullPath), sanitizeFileName(newName)))

      return macroStorage.fileExists(fullPath)
      .then(exists => {
        if (!exists) {
          throw new Error(`No macro found with id '${fullPath}'!`)
        }

        return macroStorage.fileExists(newPath)
        .then(exists => {
          if (exists) {
            throw new Error('The macro name already exists!')
          }
        })
      })
      .then(() => {
        if (getStorageManager().isXFileMode()) {
          // Reset test case status
          dispatch(
            updateMacroPlayStatus(fullPath, null)
          )
        }

        return withMacroIdChanges({
          dispatch,
          entryPath:      fullPath,
          isDirectory:    false,
          getNewFilePath: (_: string) => newPath,
          run: () => {
            return getStorageManager()
            .getMacroStorage()
            .rename(fullPath, newPath)
            .then(() => {
              if (editingId === fullPath) {
                dispatch({
                  type: name,
                  data: newName,
                  post: saveEditing
                })
              }
            })
          }
        })
        .then(() => {
          const isRenamingCurrentMacro = editingId === fullPath

          if (isRenamingCurrentMacro) {
            dispatch(editTestCase(newPath))
          }

          checkNodeShowUp({
            getState,
            dispatch,
            fullPath: newPath,
            switchToIt: false,
            message: 'Macro renamed'
          })
        })
      })
    })
  },
  duplicateTestCase: (name: string) => (macro: EntryNode) => {
    return createThunkAction((dispatch, getState) => {
      const macroStorage = getStorageManager().getMacroStorage()
      const path         = macroStorage.getPathLib()
      const dirPath      = path.dirname(macro.fullPath)
      const getNewPath   = (newName: string) => path.join(dirPath, `${newName}.json`)
      const getNewName   = () => {
        return uniqueName(macro.name, {
          generate: (old, step = 1) => {
            const reg = /-(\d+)$/
            const m   = old.match(reg)

            if (!m) return `${old}-${step}`
            return old.replace(reg, (_, n) => `-${parseInt(n, 10) + step}`)
          },
          check: (fileName) => {
            return macroStorage.fileExists(getNewPath(fileName)).then(exists => !exists)
          }
        })
      }

      return getNewName()
      .then(newMacroName => {
        return prompt({
          width: 400,
          title: 'Duplicate macro as..',
          message: '',
          value: newMacroName,
          placeholder: 'Macro name',
          selectionStart: 0,
          selectionEnd: newMacroName.length,
          okText: 'Duplicate',
          cancelText: 'Cancel',
          onCancel: () => Promise.resolve(true),
          onOk: (macroName: string) => {
            const fullPath = macroStorage.filePath(
              getNewPath(sanitizeFileName(macroName))
            )

            return macroStorage.fileExists(fullPath)
            .then(exists => {
              if (exists) {
                const msg = `'${macroName}' already exists`
                message.error(msg)
                throw new Error(msg)
              }

              return macroStorage.copy(macro.fullPath, fullPath, false, false)
              .then(
                () => {
                  message.success(`Successfully duplicated as '${macroName}'`)

                  // Note: need to wait until it's reflected in redux
                  checkNodeShowUp({
                    getState,
                    dispatch,
                    fullPath,
                    message: 'Macro duplicated'
                  })

                  return true
                },
                (e: Error) => {
                  log.error(e)
                  const msg = 'Failed to duplicate macro: ' + e.message
                  message.error(msg)
                  throw new Error(msg)
                }
              )
            })
          }
        })
      })
    })
  },
  duplicateVisionImage: (name: string) => (imageName: string) => {
    return createThunkAction((dispatch, getState) => {
      const visionStorage = getStorageManager().getVisionStorage()
      const path         = visionStorage.getPathLib()
      const dirPath      = path.dirname(imageName)
      const getNewPath   = (newName: string) => path.join(dirPath, newName)
      const getNewName   = () => {
        return uniqueName(imageName, {
          generate: (old, step = 1) => {
            const reg = /-(\d+)$/
            const m   = old.match(reg)

            if (!m) return `${old}-${step}`
            return old.replace(reg, (_, n) => `-${parseInt(n, 10) + step}`)
          },
          check: (fileName) => {
            return visionStorage.fileExists(getNewPath(fileName)).then(exists => {
              return !exists
            })
          }
        })
      }

      return getNewName()
      .then(newImageName => {
        return prompt({
          width: 400,
          title: 'Duplicate vision image as..',
          message: '',
          value: newImageName,
          placeholder: 'Macro name',
          selectionStart: 0,
          selectionEnd: newImageName.length,
          okText: 'Duplicate',
          cancelText: 'Cancel',
          onCancel: () => Promise.resolve(true),
          onOk: (finalImageName: string) => {
            const fullPath = visionStorage.filePath(
              getNewPath(sanitizeFileName(finalImageName))
            )

            return visionStorage.fileExists(fullPath)
            .then(exists => {
              if (exists) {
                const msg = `'${finalImageName}' already exists`
                message.error(msg)
                throw new Error(msg)
              }

              return visionStorage.copy(imageName, fullPath, false, false)
              .then(
                () => {
                  message.success(`Successfully duplicated as '${finalImageName}'`)
                  dispatch(listVisions())
                  return true
                },
                (e: Error) => {
                  log.error(e)
                  const msg = 'Failed to duplicate vision image: ' + e.message
                  message.error(msg)
                  throw new Error(msg)
                }
              )
            })
          }
        })
      })
    })
  },
  selectInitialMacro: (name: string) => (mode: StorageStrategyType) => {
    return createThunkAction((dispatch, getState) => {
      const key = ((): MiscKey => {
        switch (mode) {
          case StorageStrategyType.Browser:
            return MiscKey.BrowserModeLastMacroId

          case StorageStrategyType.XFile:
            return MiscKey.XFileModeLastMacroId

          default:
            throw new Error(`Invalid mode: ${mode}`)
        }
      })()

      return getMiscData().get(key)
      .then((macroFullPath?: string) => {
        const state = getState()
        const found = macroFullPath ? findMacroNodeWithCaseInsensitiveFullPath(state, macroFullPath) : null

        log('selectInitialMacro', key, macroFullPath, found, state)

        if (found) {
          return macroFullPath as string
        }

        const rootNodes = getMacroFolderNodeList(state)
        const first = findNodeInForest<EntryNode>(node => node.isFile, rootNodes)

        return first ? first.fullPath : null
      })
      .then((macroFullPath: string | null) => {
        if (macroFullPath) {
          dispatch(editTestCase(macroFullPath))
        } else {
          dispatch(editNewTestCase())
        }
      })
    })
  },
  editMacroByOffset: (name: string) => (offset: number) => {
    return createThunkAction((dispatch, getState) => {
      const state = getState()

      if (state.ui.isSaving) {
        return
      }

      const trees = getFilteredMacroFileNodeData(state)
      const macroId = getCurrentMacroId(state)

      if (macroId === UNTITLED_ID) {
        return
      }

      const found = nodeByOffset({
        offset,
        tree: trees,
        isTargetQualified: (node: FileNodeData): boolean => {
          return node.id === macroId
        },
        isCandidateQualified: (node: FileNodeData): boolean => {
          return node.type === FileNodeType.File
        }
      })

      if (!found) {
        return
      }

      return dispatch(editTestCase(found.id))
      .then(() => {
        dispatch(Actions.ensureTreeNodeUnfoldedForCurrentMacroNode({ scrollIntoView: true }) as any)
      })
    })
  },
  setMacroQuery: (name: string) => (query: string) => {
    return createAction(name, query)
  },
  setIndexToInsertRecorded: (name: string) => (index: number) => {
    return createAction(name, index)
  },
  toggleRecorderSkipOpen: (name: string) => (force?: boolean) => {
    return createAction(name, force)
  },
  scrollToCommandAtIndex: (name: string) => (commandIndex: number) => {
    return createThunkAction(() => {
      const $tableBody = document.querySelector('.table-wrapper .ReactVirtualized__Table__Grid')
      const itemHeight = config.ui.commandItemHeight

      if (!$tableBody) {
        return
      }

      const totalHeight = $tableBody.clientHeight
      const scrollTop   = $tableBody.scrollTop
      const isAboveScrollArea = itemHeight * commandIndex < scrollTop
      const isBelowScrollArea = itemHeight * (commandIndex + 3) > scrollTop + totalHeight

      if (isAboveScrollArea) {
        $tableBody.scrollTop = itemHeight * commandIndex
      } else if (isBelowScrollArea) {
        $tableBody.scrollTop = itemHeight * (commandIndex + 3) - totalHeight
      }
    })
  },
  gotoLineInMacro: (name: string) => (macroId: string, commandIndex: number) => {
    return createThunkAction((dispatch, getState) => {
      const state = getState()
      const currentMacroId = getCurrentMacroId(state)

      const saveMacro = macroId === currentMacroId
        ? () => Promise.resolve(true)
        : () => {
            return getSaveTestCase({ dispatch, getState }).saveOrNot({
              cancelText: 'Cancel'
            })
          }

      const gotoLine = () => {
        return Promise.resolve(
          dispatch(editTestCase(macroId))
        )
        .then(() => {
          dispatch(selectCommand(commandIndex, true))
          dispatch(Actions.scrollToCommandAtIndex(commandIndex) as any)
        })
      }

      saveMacro().then(success => {
        if (success) {
          return gotoLine()
        }
      })
      .catch(e => {
        log.warn(e)
      })
    })
  },
  downloadMacroAsJson: (name: string) => (macroId: string) => {
    return createThunkAction((dispatch, getState) => {
      return getStorageManager().getMacroStorage().read(macroId, 'Text')
      .then(content => {
        const macro = content as any as MacroInState;
        const downloadJson = (): void => {
          const str = toJSONString({ name: macro.name, commands: macro.data.commands }, {
            ignoreTargetOptions: getShouldIgnoreTargetOptions(getState())
          })
          const blob = new Blob([str], { type: 'text/plain;charset=utf-8' })

          FileSaver.saveAs(blob, `${macro.name}.json`, true)
        }
        const involveOtherResources = (): boolean => {
          const imageRelatedCommands = macro.data.commands.filter(command => {
            return !canCommandReadImage(command.cmd) ? false : parseImageTarget(command.target)?.fileName
          })
          const csvRelatedCommands = macro.data.commands.filter(cmd => canCommandReadCsv(cmd.cmd))
          const macroRelatedCommands = macro.data.commands.filter(cmd => canCommandRunMacro(cmd.cmd))

          if (imageRelatedCommands.length === 0 &&
              csvRelatedCommands.length === 0 &&
              macroRelatedCommands.length === 0
          ) {
            return false
          }

          return true
        }

        if (!involveOtherResources()) {
          return downloadJson()
        }

        return prompt({
          width: 400,
          title: 'Export as zip instead?',
          message: 'This macro contains images/csv.\nDo you want to use the ZIP export option instead?',
          noInput: true,
          closable: false,
          okText: 'ZIP',
          cancelText: 'JSON',
          onCancel: () => {
            downloadJson()
            return Promise.resolve(true)
          },
          onOk: () => {
            dispatch(Actions.downloadMacroAsZip(macroId) as any)
            return Promise.resolve(true)
          }
        })
        .then(() => {})
      })
    })
  },
  downloadMacroAsHTML: (name: string) => (macroId: string) => {
    return createThunkAction((dispatch, getState) => {
      return getStorageManager().getMacroStorage().read(macroId, 'Text')
      .then(content => {
        const macro = content as any as MacroInState;
        const str = toHtml({ name: macro.name, commands: macro.data.commands })
        const blob = new Blob([str], { type: 'text/plain;charset=utf-8' })

        FileSaver.saveAs(blob, `${macro.name}.html`, true)
      })
    })
  },
  downloadMacroAsZip: (name: string) => (macroId: string) => {
    return createThunkAction((dispatch, getState) => {
      const zip  = new JSZip()
      const warn = (msg: string): void => dispatch(addLog('warning', msg))

      const imageDict: Record<string, boolean> = {}
      const csvDict: Record<string, boolean> = {}
      const macroDict: Record<string, boolean> = {}

      const bundleMacroIntoZip = (macroId: string, isSubMacro?: boolean): Promise<void> => {
        const macroStorage = getStorageManager().getMacroStorage()
        const path = macroStorage.getPathLib()

        return macroStorage.read(macroId, 'Text')
        .then(content => {
          const macro = content as any as MacroInState
          const macroToSave = clone(macro) as MacroInState
          const imageRelatedCommands = macro.data.commands.filter(cmd => canCommandReadImage(cmd.cmd))
          const csvRelatedCommands   = macro.data.commands.filter(cmd => canCommandReadCsv(cmd.cmd))
          const macroRelatedCommands = [] as Command[]

          // Since all macros are saved in the same folder now,
          // macro paths in `run` commands should be changed accordingly
          macro.data.commands.forEach((cmd, i) => {
            if (canCommandRunMacro(cmd.cmd)) {
              macroRelatedCommands.push(cmd)
              macroToSave.data.commands[i].target = path.basename(cmd.target)
            }
          })

          Promise.all([
            ...imageRelatedCommands.map(command => {
              const imageFileName = parseImageTarget(command.target)?.fileName

              if (!imageFileName || imageDict[imageFileName]) {
                return Promise.resolve()
              }

              imageDict[imageFileName] = true

              return getStorageManager().getVisionStorage().read(imageFileName, 'ArrayBuffer')
              .then(buffer => {
                zip.file(imageFileName, buffer as any, { binary: true })
              })
              .catch((e: Error) => {
                warn(`Failed to add ${imageFileName} into zip: ${e.message}`)
              })
            }),
            ...csvRelatedCommands.map(command => {
              const csvFileName = command.target

              if (!csvFileName || csvDict[csvFileName]) {
                return Promise.resolve()
              }

              csvDict[csvFileName] = true

              return getStorageManager().getCSVStorage().read(csvFileName, 'Text')
              .then(text => {
                zip.file(csvFileName, text as string)
              })
              .catch((e: Error) => {
                warn(`Failed to add ${csvFileName} into zip: ${e.message}`)
              })
            }),
            ...macroRelatedCommands.map(command => {
              const subMacroRelativePath = resolvePath(
                macroStorage.getPathLib(),
                macroStorage.relativePath(macroId),
                command.target
              )
              const subMacroNode = findMacroNodeWithCaseInsensitiveRelativePath(getState(), subMacroRelativePath)
              const subMacroId   = subMacroNode ? subMacroNode.fullPath : subMacroRelativePath

              if (macroDict[subMacroId]) {
                return Promise.resolve()
              }

              return bundleMacroIntoZip(subMacroId, true)
            })
          ])
          .then(() => {
            zip.file(
              macroToSave.name + '.json',
              toJSONString({ name: macroToSave.name, commands: macroToSave.data.commands })
            )

            if (isSubMacro) {
              return
            }

            return zip.generateAsync({ type: 'blob' })
            .then((blob) => FileSaver.saveAs(blob, `${macroToSave.name}.zip`))
          })
        })
      }

      return bundleMacroIntoZip(macroId)
        .catch((e: Error) => {
          warn(`Failed to save zip file: ${e.message}`)
        })
    })
  },
  readFilesAndImportTestCases: (name: string) => (params: {
    folder?: string;
    files:   File[];
    type:    ReadFileType;
    process: (content: any, fileName: string, file: File) => Promise<ImportMacroResult>;
  }) => {
    const { type, process, folder, files: rawFiles } = params

    return createThunkAction((dispatch, getState) => {
      const files = Array.from(rawFiles)

      if (!files || !files.length) {
        return
      }

      const read = (file: File): Promise<{ data?: ImportMacroResult, err?: Error, fileName?: string }> => {
        return new Promise((resolve, reject) => {
          const reader  = new FileReader()

          reader.onload = (event) => {
            const content = event.target?.result

            new Promise<ImportMacroResult>(resolve => resolve(process(content, file.name, file)))
              .then(result => {
                if (!result || !result.macros.length) {
                  return resolve({
                    err: new Error('Failed to parse macro'),
                    fileName: file.name
                  })
                }

                const { macros, images = [], csvs = [] } = result

                resolve({
                  data: { macros, images, csvs }
                })
              })
              .catch((e: Error) => {
                resolve({ err: e, fileName: file.name })
              })
          }

          switch (type) {
            case 'text':
              return reader.readAsText(file)

            case 'data_url':
              return reader.readAsDataURL(file)

            case 'binary_string':
              return reader.readAsBinaryString(file)

            case 'array_buffer':
              return reader.readAsArrayBuffer(file)
          }
        })
      }

      const saveResource = <T extends 'text' | 'blob'> (
        storage: StandardStorage,
        fileName: string,
        type: T,
        content: { text: string; blob: Blob }[T]
      ): Promise<{ fileName?: string; error?: string }> => {
        const blob = type === 'text' ? new Blob([content]) : (content as Blob)

        return storage.fileExists(fileName)
        .then(exists => {
          if (exists) {
            return { error: `${fileName} already exists` }
          }

          return storage.write(fileName, blob)
            .then(() => ({ fileName }))
            .catch((e: Error) => ({ error: `Failed to save ${fileName}: ${e.message}` }))
        })
      }

      const saveAllForMacro = (item: ImportMacroResult): Promise<{ macros: MacroInState[]; csvImported: string[]; pngImported: string[]; errors: string[]; }> => {
        return Promise.all([
          Promise.all(item.csvs.map(csv => {
            return saveResource(getStorageManager().getCSVStorage(), csv.fileName, 'text', csv.content)
          })),
          Promise.all(item.images.map(csv => {
            return saveResource(getStorageManager().getVisionStorage(), csv.fileName, 'blob', csv.content)
          }))
        ])
        .then((tuple) => {
          const [csvResult, pngResult] = tuple

          return Promise.resolve({
            macros:       item.macros,
            csvImported:  csvResult.filter(x => x.fileName).map(x => x.fileName!),
            pngImported:  pngResult.filter(x => x.fileName).map(x => x.fileName!),
            errors: [
              ...csvResult.filter(x => x.error).map(x => x.error!),
              ...pngResult.filter(x => x.error).map(x => x.error!)
            ]
          })
        })
      }

      Promise.all(files.map(read))
      .then(list => {
        const doneList = list.filter(x => x.data)
        const failList = list.filter(x => x.err)

        return Promise.all(
          doneList.map(item => saveAllForMacro(item.data!))
        )
        .then(saveResourceResults => {
          return dispatch(
            addTestCases({
              folder,
              macros: flatten(doneList.map(x => x.data!.macros))
            })
          )
          .then(({ passCount, failCount, failTcs }: any) => {
            message.info(
              [
                `${passCount} macro${passCount > 1 ? 's' : ''} imported!`,
                `${failList.length + failCount} macro${(failList.length + failCount) > 1 ? 's' : ''} failed!`
              ].join(', '),
              3
            )

            failList.forEach(fail => {
              dispatch(
                addLog('error', `in parsing ${fail.fileName}: ${fail.err!.message}`)
              )
            })

            failTcs.forEach((fail: any) => {
              dispatch(
                addLog('error', `duplicated macro name: ${fail.name}`, {
                  noStack: true
                })
              )
            })

            const allCsvs   = flatten(saveResourceResults.map(item => item.csvImported))
            const allPngs   = flatten(saveResourceResults.map(item => item.pngImported))
            const allErrors = flatten(saveResourceResults.map(item => item.errors))

            const allMacroNames = flatten(
              saveResourceResults.map(item => item.macros)
            )
            .filter(item => !failTcs.find((fail: any) => fail.name == item.name))
            .map(item => item.name)

            if (allMacroNames.length > 0) {
              dispatch(
                addLog('info', `${allMacroNames.length} ${allMacroNames.length > 1 ? 'macros' : 'macro'} imported:\n${allMacroNames.join('\n')}`)
              )
            }

            if (allCsvs.length > 0) {
              dispatch(
                addLog('info', `${allCsvs.length} CSV imported:\n${allCsvs.join('\n')}`)
              )
              dispatch(listCSV())
            }

            if (allPngs.length > 0) {
              dispatch(
                addLog('info', `${allPngs.length} PNG imported:\n${allPngs.join('\n')}`)
              )
              dispatch(listVisions())
            }

            if (allErrors.length > 0) {
              dispatch(
                addLog('error', `${allErrors.length} ${allErrors.length > 1 ? 'errors' : 'error'} in importing csv/png:\n${allErrors.join('\n')}`)
              )
            }
          })
        })
        .catch(e => {
          dispatch(
            addLog('error', e.message, {
              noStack: true
            })
          )
        })
      })
    })
  },
  importMacroHtml: (name: string) => (files: File[], folder?: string) => {
    return createThunkAction((dispatch, getState) => {
      const process = (content: string, fileName: string) => ({
        macros: [fromHtml(content)],
        csvs:   [],
        images: []
      })

      dispatch(
        Actions.readFilesAndImportTestCases({
          folder,
          files,
          process,
          type: 'text'
        }) as any
      )
    })
  },
  importMacroJsonOrZipFiles: (name: string) => (files: File[], folder?: string) => {
    return createThunkAction((dispatch, getState) => {
      const process = (content: ArrayBuffer, fileName: string, file: File) => {
        if (/.json$/i.test(fileName)) {
          const str = arrayBufferToString(content)

          return Promise.resolve({
            macros: [fromJSONString(str, fileName)],
            csvs:   [],
            images: []
          })
        }

        return JSZip.loadAsync(content)
        .then(zip => {
          const pJsonList = [] as Array<Promise<{ fileName: string; content: string }>>
          const pCsvList  = [] as Array<Promise<{ fileName: string; content: string }>>
          const pPngList  = [] as Array<Promise<{ fileName: string; content: Blob }>>

          zip.forEach((relativePath: string, file: JSZip.JSZipObject): void => {
            const extName = getExtName(relativePath).toLowerCase()

            switch (extName) {
              case '.csv':
                pCsvList.push(
                  file.async('text').then(content => ({ content, fileName: relativePath }))
                )
                break

              case '.png':
                pPngList.push(
                  file.async('blob').then(content => ({ content, fileName: relativePath }))
                )
                break

              case '.json':
                pJsonList.push(
                  file.async('text').then(content => ({ content, fileName: relativePath }))
                )
                break
            }
          })

          if (pJsonList.length === 0) {
            throw new Error('No json file found in zip')
          }

          return Promise.all([
            Promise.all(pJsonList),
            Promise.all(pCsvList),
            Promise.all(pPngList)
          ])
          .then(triple => {
            const macros = triple[0].map(obj => fromJSONString(obj.content, obj.fileName))

            return {
              macros,
              csvs:   triple[1],
              images: triple[2]
            }
          })
        })
      }

      dispatch(
        Actions.readFilesAndImportTestCases({
          files,
          folder,
          process,
          type: 'array_buffer'
        }) as any
      )
    })
  }
}

export type ReadFileType = 'text' | 'data_url' | 'binary_string' | 'array_buffer'

export type ImportMacroResult = {
  macros:  MacroInState[];
  images: Array<{ fileName: string; content: Blob }>;
  csvs:   Array<{ fileName: string; content: string }>;
}

export const ActionTypes = objMap((_: any, key: string) => <ActionType>key, ActionFactories)

export const Actions = objMap((factory: ActionFactory<any>, key: string, i: number) => {
  return factory(ActionTypes[<ActionType>key])
}, ActionFactories)

export function createAction<T> (type: string, data: T): ActionObject<T> {
  return {
    type,
    data
  }
}

export type Thunk = (dispatch: Dispatch<any>, getState: () => any) => void

export function createThunkAction (thunk: Thunk) {
  return thunk
}

// Note: type safe action and reducer
// reference: https://medium.com/@martin_hotell/improved-redux-type-safety-with-typescript-2-8-2c11a8062575

export type Func = (...args: any[]) => any

export type ActionCreators = Record<string, Func>

export type ActionsUnion<T extends ActionCreators> = ReturnType<T[keyof T]>

export type ActionObject<T> = Thunk | {
  type:   string;
  data:   T;
  post?:  any;
}

export type ActionFactory<T> = (name: string) => (...payload: any[]) => ActionObject<T>

export type ActionType = keyof typeof ActionFactories

export type Actions = ActionsUnion<typeof Actions>
