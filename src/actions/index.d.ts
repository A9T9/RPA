import { Macro } from "@/services/player/macro";
import { MacroResultStatus } from "@/services/kv_data/macro_extra_data"
import { EntryNode } from "@/services/storage/std/standard_storage"
import { StorageStrategyType } from "@/services/storage";
import { MacroInState } from "@/reducers/state";

declare const editTestCase: (macroId: string) => any
declare const saveEditingAsExisted: () => any
declare const editNewTestCase: () => any
declare const setMacrosExtra: (macrosExtra: any, opts?: { shouldPersist?: boolean }) => any
declare const findSameNameMacro: (name: string, macros: Macro[]) => Macro | undefined
declare const findSamePathMacro: (path: string, macros: EntryNode[]) => EntryNode | undefined
declare const findMacrosInFolder: (folderPath: string, macros: Macro[]) => Macro[]
declare const updateMacroPlayStatus: (macroId: string, status: MacroResultStatus | null) => any
declare const updateUI: (data: any) => any
declare const saveEditing: (api: any) => void
declare const selectCommand: (index: number, forceClick?: boolean) => any
declare const copyCommand: (index: number) => any
declare const cutCommand: (index: number) => any
declare const pasteCommand: (index: number) => any
declare const addLog: (type: string, text: string, options?: Record<string, any>) => any
declare const clearLogs: () => any
declare const addTestCases: (data: { folder?: string; overwrite?: boolean; storageStrategyType?: StorageStrategyType; macros: MacroInState[] }) => any
declare const listCSV: () => any
declare const listVisions: () => any
declare const listScreenshots: () => any
declare const updateConfig: (partialConfig: Record<string, any>) => any

export {
  saveEditingAsExisted,
  editTestCase,
  editNewTestCase,
  updateMacroPlayStatus,
  setMacrosExtra,
  findSameNameMacro,
  findSamePathMacro,
  updateUI,
  saveEditing,
  selectCommand,
  copyCommand,
  cutCommand,
  pasteCommand,
  addLog,
  addTestCases,
  listCSV,
  listVisions,
  listScreenshots,
  updateConfig
}
