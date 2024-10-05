import { Ipc } from './ipc_promise'

export const SIDEPANEL_TAB_ID: number

export const SIDEPANEL_PORT_NAME: string

export const openBgWithCs: (cuid: string) => {
  ipcCs: () => Ipc;
  ipcSp: () => Ipc;
  ipcBg: (tabId: number) => Ipc;
}

export const csInit: (noRecover?: boolean) => Ipc;

export const spInit: (noRecover?: boolean) => Ipc;

export const bgInit: (fn: (tabId: number, ipc: Ipc) => void, getLogServiceForBg: () => any) => void
