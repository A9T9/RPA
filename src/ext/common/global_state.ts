import storage from "@/common/storage"
import * as C from '@/common/constant'

export type ExtensionState = {
  status: string;
  pullback: boolean;
  heartBeatSecret: number;
  disableHeartBeat: boolean;
  pendingPlayingTab: boolean;
  xClickNeedCalibrationInfo: any;
  lastCsIpcSecret: string | null;
  timerSecret?: number;
  closingAllWindows: boolean;
  tabIds: {
    lastActivated: number[];
    lastInspect: number | null;
    lastRecord: number | null;
    toInspect: number | null;
    firstRecord: number | null;
    toRecord: number | null;
    lastPlay: number | null;
    firstPlay: number | null;
    toPlay: number | null;
    panel: number | null;
    lastPanelWindow: number | null;
  };
}

const defaultState: ExtensionState = {
  status: C.APP_STATUS.NORMAL,
  tabIds: {
    lastActivated: [],
    lastInspect: null,
    lastRecord: null,
    toInspect: null,
    firstRecord: null,
    toRecord: null,
    lastPlay: null,
    firstPlay: null,
    toPlay: null,
    panel: null,
    lastPanelWindow: null
  },
  pullback: false,
  // Note: heartBeatSecret = -1, means no heart beat available, and panel should not retry on heart beat lost
  heartBeatSecret: 0,
  // Note: disableHeartBeat = true, `checkHeartBeat` will stop working, it's useful for cases like close current tab
  disableHeartBeat: false,
  // Note: pendingPlayingTab = true, tells `getPlayTab` to wait until the current tab is closed and another tab is focused on
  pendingPlayingTab: false,
  xClickNeedCalibrationInfo: null,
  lastCsIpcSecret: null,
  closingAllWindows: false
}

export function getState (optionalKey?: string): any {
  return storage.get(C.STATE_STORAGE_KEY).then(state => {
    const st = state || defaultState

    if (typeof optionalKey === 'string') {
      return st[optionalKey]
    }

    return st
  })
}

export function updateState (updateFunc: Partial<ExtensionState> | ((state: ExtensionState) => ExtensionState)) {
  const fn = typeof updateFunc === 'function' ? updateFunc : (state: ExtensionState) => ({ ...state, ...updateFunc })

  return getState().then((state: ExtensionState) => {
    const result = fn(state)

    return storage.set(C.STATE_STORAGE_KEY, result).then(() => {})
  })
}
