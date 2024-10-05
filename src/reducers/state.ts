import { TestSuite } from "@/common/convert_suite_utils";
import { Command } from "@/services/player/macro";
import { MacroExtraData } from "@/services/kv_data/macro_extra_data";
import { EntryNode } from "@/services/storage/std/standard_storage";
import { TestSuitExtraData } from "@/services/kv_data/test_suite_extra_data";
import { ProxyData } from "@/services/proxy/types";
import * as C from '../common/constant'
import { Macro } from "@/common/convert_utils";

export type MacroInState = {
  id:         string;
  name:       string;
  path:       string;
  data: {
    commands: Command[];
  };
}

export type FolderExtraData = {
  folded: boolean;
}

type ID = string;

type Resource = {
  url:        string;
  name:       string;
  createTime: Date;
}

type Editing = {
  commands: Command[];
  meta: {
    src: null | {
      id:   ID;
      name: string;
    };
    hasUnsaved:    boolean;
    selectedIndex: number;
    indexToInsertRecorded?: number;
  };
}

export enum RunBy {
  Html = 'html',
  Bookmark = 'bookmark',
  Manual = 'manual'
}

export function stringForRunBy (type: RunBy): string {
  switch (type) {
    case RunBy.Bookmark:
      return 'bookmark'

    case RunBy.Html:
      return 'command line'

    case RunBy.Manual:
      return 'manual'
  }
}

export type LogType = 'status' | 'reflect' | 'echo' | 'info' | 'warning' | 'error' | 'report'

export type LogSource = {
  macroId:       string;
  macroName:     string;
  commandIndex:  number;
  isSubroutine?: boolean;
}

export type LogItem = {
  type:       LogType;
  text:       string;
  id:         string;
  stack:      LogSource[];
  createTime: Date;
  options:    Record<string, any>;
}

export type State = {
  count: number; // test property
  config:          Record<string, any>;
  status:          string;
  recorderStatus:  string;
  inspectorStatus: string;

  isLoadingMacros: boolean;
  from: RunBy;
  noDisplayInPlay: boolean;
  ocrInDesktopMode: boolean;
  replaySpeedOverrideToFastMode: boolean;

  editor: {
    testSuites:                TestSuite[];
    testCases:                 MacroInState[];
    macrosExtra:               Record<ID, FolderExtraData | MacroExtraData>;
    macroFolderStructure:      EntryNode[];
    testSuitesExtra:           Record<ID, TestSuitExtraData>;
    testSuitesFolderStructure: EntryNode[];
    currentMacro:              Macro | null;
    editing: Editing;
    editingSource: {
      original: string | null;
      pure:     string | null;
      current:  string | null;
      error:    string | null;
    };
    clipboard: {
      commands: Command[];
    };
    activeTab: 'table_view' | 'source_view';
    isDraggingCommand: boolean;
  };

  player: {
    mode:             string;
    status:           string;
    stopReason:       string | null;
    currentLoop:      number;
    loops:            number;
    nextCommandIndex: number | null;
    playInterval:     number;
    timeoutStatus: {
      type:  string | null;
      total: number | null;
      past:  number | null;
    };
  };

  recorder: {
    skipOpen: boolean;
  };

  variables: Array<{ key: string; value: any; }>;
  logs: LogItem[];
  csvs: Array<Resource & { size: number }>;
  visions: Resource[];
  screenshots: Resource[];
  proxy: ProxyData | null;
  ui: UIConfig;
  macroQuery: string;
}

export type UIConfig = {
  newPreinstallVersion?: boolean;
  showSettings?: boolean;
  settingsTab?: string;
  sidebarTab?: 'Macro';
  showWebsiteWhiteList?: boolean;
  showXFileNotInstalledDialog?: boolean;
  focusArea?: FocusArea;
  isSaving?: boolean;
}

export enum FocusArea {
  Unknown = 'unknown',
  Sidebar = 'sidebar',
  CommandTable = 'command_table',
  CodeSource = 'code_source'
}

export const newTestCaseEditing: Editing = {
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
//    * currentLoop         the current round
//    * loops               how many rounds to run totally

export const initialState: State = {
  count: 0 , // test value
  status: C.APP_STATUS.NORMAL,
  recorderStatus: C.RECORDER_STATUS.STOPPED,
  inspectorStatus: C.INSPECTOR_STATUS.STOPPED,
  isLoadingMacros: false,
  from: RunBy.Manual,
  noDisplayInPlay: false,
  ocrInDesktopMode: false,
  replaySpeedOverrideToFastMode: false,
  editor: {
    testSuites: [],
    testCases: [],
    currentMacro: null,
    // macrosExtra is used to store:
    // * status
    // * breakpoints
    // * doneCommandIndices
    // * errorCommandIndices
    // * warningCommandIndices
    macrosExtra: {},
    // `macroFolderStructure` just holds folder and path info,
    // while macro content is still in `testCases`.
    // Similar case for `testSuitesFolderStructure`
    macroFolderStructure: [],
    testSuitesExtra: {},
    testSuitesFolderStructure: [],
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
    activeTab: 'table_view',
    isDraggingCommand: false
  },
  player: {
    mode: C.PLAYER_MODE.TEST_CASE,
    status: C.PLAYER_STATUS.STOPPED,
    stopReason: null,
    currentLoop: 0,
    loops: 0,
    nextCommandIndex: null,
    playInterval: 0,
    timeoutStatus: {
      type: null,
      total: null,
      past: null
    }
  },
  recorder: {
    skipOpen: false
  },
  variables: [],
  logs: [],
  screenshots: [],
  csvs: [],
  visions: [],
  config: {},
  proxy: null,
  ui: {
    focusArea: FocusArea.Unknown
  },
  macroQuery: ''
}
