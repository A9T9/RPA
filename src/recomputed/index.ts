import { createSelector } from 'reselect'
import { UNTITLED_ID, APP_STATUS, PLAYER_STATUS } from '@/common/constant'
import { Macro, Command } from '@/services/player/macro'
import { MacroExtraData, MacroResultStatus } from '@/services/kv_data/macro_extra_data'
import { TestSuite } from '@/common/convert_suite_utils';
import { TestSuitExtraData } from '@/services/kv_data/test_suite_extra_data';
import { EntryNode } from '@/services/storage/std/standard_storage';
import { FileNodeData, FileNodeType } from '@/components/tree_file';
import { treeMap, flatten, traverseTree, TraverseTreeResult, id, treeFilter } from '@/common/ts_utils';
import { Without } from '@/common/types';
import { State, FolderExtraData, RunBy, FocusArea } from '@/reducers/state';

export const getTestSuitesWithAllInfo = createSelector(
  [
    (state: State) => state.editor.testSuites,
    (state: State) => state.editor.testSuitesExtra
  ],
  (testSuites: TestSuite[], testSuitesExtra: Record<string, TestSuitExtraData>) => {
    const getKey = (ts: TestSuite) => ts.id

    return testSuites.map(ts => {
      const key   = getKey(ts)
      const extra = testSuitesExtra[key || '']

      return {
        ...ts,
        ...(extra || {})
      }
    })
  }
)

export const getCurrentMacroId = createSelector(
  [
    (state: State) => state.editor.editing.meta.src
  ],
  (src: any): string => {
    return src ? src.id : UNTITLED_ID
  }
)

export const getBreakpoints = createSelector(
  [
    (state: State) => state.editor.macrosExtra,
    getCurrentMacroId
  ],
  (macrosExtra: Record<string, FolderExtraData | MacroExtraData>, macroId: string) => {
    const extra = macrosExtra[macroId] || {}
    return (extra as any).breakpointIndices || []
  }
)

export function getBreakpointsByMacroId (state: State, macroId: string) {
  const macrosExtra = state.editor.macrosExtra
  const extra       = macrosExtra[macroId] || {}

  return (extra as any).breakpointIndices || []
}

export const getDoneCommandIndices = createSelector(
  [
    (state: State) => state.editor.macrosExtra,
    getCurrentMacroId
  ],
  (macrosExtra: Record<string, FolderExtraData | MacroExtraData>, macroId: string) => {
    const extra = macrosExtra[macroId] || {}
    return (extra as any).doneCommandIndices || []
  }
)

export const getWarningCommandIndices = createSelector(
  [
    (state: State) => state.editor.macrosExtra,
    getCurrentMacroId
  ],
  (macrosExtra: Record<string, FolderExtraData | MacroExtraData>, macroId: string) => {
    const extra = macrosExtra[macroId] || {}
    return (extra as any).warningCommandIndices || []
  }
)

export const getErrorCommandIndices = createSelector(
  [
    (state: State) => state.editor.macrosExtra,
    getCurrentMacroId
  ],
  (macrosExtra: Record<string, FolderExtraData | MacroExtraData>, macroId: string) => {
    const extra = macrosExtra[macroId] || {}
    return (extra as any).errorCommandIndices || []
  }
)

export const isFocusOnCommandTable = createSelector(
  [(state: State) => state],
  (state: State) => state.ui.focusArea === FocusArea.CommandTable
)

export const isFocusOnSidebar = createSelector(
  [(state: State) => state],
  (state: State) => state.ui.focusArea === FocusArea.Sidebar
)

export const getConfig = createSelector(
  [(state: State) => state.config],
  id
)

export const getShouldSaveAlternativeLocators = createSelector(
  [getConfig],
  (config): boolean => !!config.saveAlternativeLocators
)

export const getShouldIgnoreTargetOptions = createSelector(
  [getConfig],
  (config): boolean => !config.saveAlternativeLocators
)

export function hasUnsavedMacro (state: State): boolean {
  const { editor } = state
  const { editing, editingSource, activeTab } = editor

  if (editing.meta.src == null )  return false

  if (!editing.meta.src && editing.meta.src!= null )  return true

  switch (activeTab) {
    case 'table_view': {
      const { hasUnsaved }: any = editing.meta || {}
      return hasUnsaved
    }

    case 'source_view': {
      return editingSource.original !== editingSource.current
    }

    default:
      throw new Error('Unknown activeTab')
  }
}

export function findMacroNodeWithCaseInsensitiveField (state: State, field: 'name' | 'relativePath' | 'fullPath', value: string, isDirectory: boolean = false): EntryNode | undefined {
  const nodes      = isDirectory ? getMacroFolderNodeList(state) : getMacroFileNodeList(state)
  const transform  = (path: string): string => path.toLowerCase().replace(/\\/g, '/').replace(/\.json$/i, '')
  const toMatch    = transform(value)

  return nodes.find(node => {
    if (isDirectory !== node.isDirectory) {
      return false
    }
    return transform(node.fullPath) === toMatch || transform(node[field]) === toMatch
  })
}

export function findMacroNodeWithCaseInsensitiveFullPath (state: State, fullPath: string): EntryNode | undefined {
  return findMacroNodeWithCaseInsensitiveField(state, 'fullPath', fullPath)
}

export function findMacroNodeWithCaseInsensitiveRelativePath (state: State, relativePath: string): EntryNode | undefined {
  return findMacroNodeWithCaseInsensitiveField(state, 'relativePath', relativePath)
}

export function findMacroFolderWithCaseInsensitiveRelativePath (state: State, relativePath: string): EntryNode | undefined {
  return findMacroNodeWithCaseInsensitiveField(state, 'relativePath', relativePath, true)
}

export function editorSelectedCommand (state: State): Command | null {
  const { meta, commands } = state.editor.editing

  if (!meta || meta.selectedIndex === -1) return null
  return commands[meta.selectedIndex] || null
}

export function editorSelectedCommandIndex (state: State): number | null {
  const { meta } = state.editor.editing
  return meta ? meta.selectedIndex : null
}

export function editorCommandCount (state: State): number {
  const { commands } = state.editor.editing
  return commands.length
}

export function entryNodeToFileNodeData (
  entryNode:    EntryNode,
  getClassName: (data: Without<EntryNode, 'children'>) => string,
  getFolded:    (data: Without<EntryNode, 'children'>) => boolean
): FileNodeData {
  return treeMap((entryData: Without<EntryNode, 'children'>, paths: number[]): Without<FileNodeData, 'children'> => {
    return {
      id:         entryData.fullPath,
      type:       entryData.isFile ? FileNodeType.File : FileNodeType.Folder,
      level:      paths.length,
      selected:   false,
      name:       entryData.name,
      entryPath:  entryData.fullPath,
      folded:     getFolded(entryData),
      className:  getClassName(entryData)
    }
  }, entryNode)
}

export const getEditor = (state: State) => state.editor

export const getMacroFolderStructure = createSelector(
  [getEditor],
  (editor: any): EntryNode[] => {
    return editor.macroFolderStructure
  }
)

export const getMacrosExtra = createSelector(
  [getEditor],
  (editor: any) => {
    return editor.macrosExtra
  }
)

export const getMacroFileNodeData = createSelector(
  [
    getMacroFolderStructure,
    getMacrosExtra,
    getCurrentMacroId,
    isFocusOnSidebar,
  ],
  (macroFolderStructure: EntryNode[], macrosExtra: Record<string, MacroExtraData>, macroId: string, sidebarFocused: boolean): FileNodeData[] => {
    const getClassName = (data: Without<EntryNode, 'children'>): string => {
      const klasses: string[] = []
      const id     = data.fullPath
      const status = macrosExtra[id] && macrosExtra[id].status

      klasses.push(
        (() => {
          switch (status) {
            case MacroResultStatus.Success:
              return 'success'

            case MacroResultStatus.Error:
              return 'error'

            case MacroResultStatus.ErrorInSub:
              return 'error-in-sub'

            default:
              return 'normal'
          }
        })()
      )

      if (macroId === id) {
        klasses.push('selected')
      }

      if (!sidebarFocused) {
        klasses.push('blur')
      }

      return klasses.join(' ')
    }
    const getFolded = (data: Without<EntryNode, 'children'>): boolean => {
      const id = data.fullPath
      const folded = macrosExtra[id] && macrosExtra[id].folded || false

      return folded
    }

    return macroFolderStructure.map((node) => {
      return entryNodeToFileNodeData(node, getClassName, getFolded)
    })
  }
)

export const getFilteredMacroFileNodeData = createSelector(
  [
    getMacroFileNodeData,
    (state: State) => state.macroQuery
  ],
  (macroFileNodeData: FileNodeData[], searchText: string): FileNodeData[] => {
    const trimSearchText        = searchText.trim().toLowerCase()
    const filteredFileNodeData  = (() => {
      if (trimSearchText.length === 0) {
        return macroFileNodeData
      }

      return macroFileNodeData.map((node) => {
        const filteredNode = treeFilter(
          (data) => data.name.toLowerCase().indexOf(trimSearchText) !== -1,
          node
        )

        if (!filteredNode) {
          return null
        }

        return treeMap(
          (data) => ({
            ...data,
            folded: false
          }),
          filteredNode
        )
      })
      .filter(node => node)
    })()

    return filteredFileNodeData as FileNodeData[]
  }
)

export const getMacroFileNodeList = createSelector(
  [getMacroFolderStructure],
  (macroFolderStructure: EntryNode[]): EntryNode[] => {
    const findAllMacros = (root: EntryNode): EntryNode[] => {
      const result: EntryNode[] = []

      traverseTree((node: EntryNode) => {
        if (node.isFile) {
          result.push(node)
        }
        return TraverseTreeResult.Normal
      }, root)

      return result
    }

    return flatten(
      macroFolderStructure.map(findAllMacros)
    )
  }
)

export const getMacroFolderNodeList = createSelector(
  [getMacroFolderStructure],
  (macroFolderStructure: EntryNode[]): EntryNode[] => {
    const findAllFolders = (root: EntryNode): EntryNode[] => {
      const result: EntryNode[] = []

      traverseTree((node: EntryNode) => {
        if (node.isDirectory) {
          result.push(node)
        }
        return TraverseTreeResult.Normal
      }, root)

      return result
    }

    return flatten(
      macroFolderStructure.map(findAllFolders)
    )
  }
)

export const isMacroFolderNodeListEmpty = createSelector(
  [getMacroFolderNodeList],
  (entries: EntryNode[]): boolean => {
    return entries.length === 0
  }
)

export const getIndexToInsertRecorded = createSelector([
  (state: State) => state.editor.editing.meta.indexToInsertRecorded
], id)

export const getStatus = createSelector([(state: State) => state.status], id)

export const getShouldLoadResources = createSelector(
  [(state: State) => state.from],
  (from: RunBy) => from === RunBy.Manual
)

export const getShowSidePanel = createSelector(
  [(state: State) => state.config.showSidePanel],
  id
);

export const isPlaying = createSelector(
  [getStatus, id],
  (appStatus: string, state: State) => {
    return appStatus === APP_STATUS.PLAYER && state.player.status === PLAYER_STATUS.PLAYING
  }
)

export const isNoDisplay = createSelector(
  [isPlaying, id],
  (isPlaying: boolean, state: State) => {
    return isPlaying && state.noDisplayInPlay
  }
)

export const isOcrInDesktopMode = createSelector(
  [isPlaying, id],
  (isPlaying: boolean, state: State) => {
    return state.ocrInDesktopMode
  }
)

export const isReplaySpeedOverrideToFastMode = createSelector(
  [isPlaying, id],
  (isPlaying: boolean, state: State) => {
    return isPlaying && state.replaySpeedOverrideToFastMode
  }
)