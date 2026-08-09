import { createSelector } from 'reselect'
import { UNTITLED_ID, APP_STATUS, PLAYER_STATUS } from '@/common/constant'
import { Macro, Command } from '@/services/player/macro'
import { MacroExtraData, MacroResultStatus } from '@/services/kv_data/macro_extra_data'
import { EntryNode } from '@/services/storage/std/standard_storage';
import { FileNodeData, FileNodeType } from '@/components/tree_file';
import { treeMap, flatten, traverseTree, TraverseTreeResult, id, treeFilter } from '@/common/ts_utils';
import { Without } from '@/common/types';
import { State, FolderExtraData, RunBy, FocusArea } from '@/reducers/state';
import { PREINSTALL_ROOT_FOLDER, PREINSTALL_CLASSIC_ROOT_FOLDER } from '@/config/preinstall_macros';

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

// Both editors are always available and the tree always shows every macro, so
// there is no longer a mode to be in: an EXISTING macro opens in the editor its
// own format needs (isScriptMacroView), and a NEW one is a JS script, which is
// the recommended format and the one the AI writes.
//
// This used to read config.showClassicMacros, set once at install time from
// "is this an upgrade?". That made a new blank macro open as a command table
// for every upgrading user — and with the Settings checkbox gone there was no
// way back out of it. Kept as a named constant rather than inlined at the four
// call sites, so the decision stays in one place if it ever changes again.
export const isJsFirstMode = (_state: State): boolean => true


// a JS script macro is recognized by its data, not by the .js name suffix:
// the program lives in editing.script (Commands stays empty)
export const isScriptMacroEditing = (state: State): boolean =>
  typeof (state.editor.editing as any).script === 'string'

// True when the JS script editor is the macro view to show / route to.
// Sources of truth, in order: an explicit dev-mode switch to the JS view
// (activeTab), then JS-first mode showing every script macro — and the empty
// Untitled state — as JS. Table macros keep the table as fallback.
// THE one answer to "does this macro get the JS editor?" — used by the sidebar
// Macro tab, the IDE tab list and the IDE's own routing. It was three separate
// rules before, and each of them was wrong at least once, in a different way:
// one bailed before checking whether the macro was a script, one mounted the
// script editor for command-table macros, and one honoured a tab selection
// that is STICKY ACROSS MACROS and so showed the previous macro's script.
//
// Note what is deliberately NOT an input: editor.activeTab. A macro is a
// script or it is not, and no tab click can change that. Letting the tab
// decide is exactly what produced "select a table macro, still see JS". The
// tab bar's job is to reflect this, which is why the views that do not apply
// are disabled rather than clickable.
export const isScriptMacroView = (state: State): boolean => {
  // a JSON parse error pins the user to the source view until it is fixed
  if (state.editor.editingSource.error) return false

  // the macro IS a script
  if (isScriptMacroEditing(state)) return true

  // a brand new, never-saved, empty macro: the only case with a real choice,
  // and jsFirst decides it
  const editing = state.editor.editing
  const src = editing.meta && editing.meta.src
  const isEmptyUntitled = !src && (!editing.commands || editing.commands.length === 0)
  return isJsFirstMode(state) && isEmptyUntitled
}

// kept as the old name for existing imports
export const isScriptViewActive = isScriptMacroView

export function hasUnsavedMacro (state: State): boolean {
  const { editor } = state
  const { editing, editingSource, activeTab } = editor

  if (editing.meta.src == null )  return false

  if (!editing.meta.src && editing.meta.src!= null )  return true

  switch (activeTab) {
    // script_view: script edits live in editing.script and are tracked by
    // the same hasUnsaved meta flag as command edits
    case 'script_view':
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
      const id    = data.fullPath
      const extra = macrosExtra[id]

      if (extra && typeof (extra as any).folded === 'boolean') {
        return (extra as any).folded
      }

      if (!data.isDirectory) {
        return false
      }

      const relPath = String(data.relativePath || '').replace(/\\/g, '/')

      // Sub folders always start collapsed: opening a folder should reveal its
      // own macros, not cascade every level below it open at once.
      if (relPath.indexOf('/') !== -1) {
        return true
      }

      // Never-toggled TOP-LEVEL folders default to open — EXCEPT the shipped
      // demo folders, which start collapsed so a fresh install (which writes the
      // whole JS demo set) still opens with the user's own macros in view.
      // The first manual toggle persists a folded value and wins from then on.
      return relPath === PREINSTALL_ROOT_FOLDER || relPath === PREINSTALL_CLASSIC_ROOT_FOLDER
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
    // The tree shows EVERY macro. It used to hide the Classic demo folder in
    // JS-first mode, which meant a user could own macros the tree denied —
    // the worst kind of missing. Which EDITOR a macro opens in is decided per
    // macro (isScriptMacroView), so the tree never has to take a position.
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