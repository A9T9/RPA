import { delay } from './ts_utils'
import Ext from './web_extension'
import { getState, updateState } from '../../src/ext/common/global_state'
import { any } from 'prop-types'

export const createTab = (url: string): Promise<any> => {
  return Ext.tabs.create({ url, active: true })
}

export const activateTab = (tabId: number, focusWindow: boolean = false): Promise<any> => {
  return Ext.tabs.get(tabId)
  .then((tab: any) => {
    const p = focusWindow ? Ext.windows.update(tab.windowId, { focused: true })
                          : Promise.resolve()

    return p.then(() => Ext.tabs.update(tab.id, { active: true }))
    .then(() => tab)
  })
}

export const getTab = async (tabId: number): Promise<any> => {
  try { 
    return Ext.tabs.get(tabId)
  } catch {
    return Ext.tabs.query({ active: true })
  }  
}

export const getCurrentTab = (winId?: number): Promise<any> => {
  const pWin = winId ? Ext.windows.get(winId) : Ext.windows.getLastFocused()

  return pWin.then((win: any) => {
    return Ext.tabs.query({ active: true, windowId: win.id })
    .then((tabs: any[]) => tabs[0])
  })
}

export async function updateUrlForTab (tabId: any | number, url: string, cmd: string): Promise<any> {
  const tab = typeof tabId === "number" ? (await Ext.tabs.get(tabId)) : tabId
  const tabUrl = new URL(tab.url)
  const newUrl = new URL(url)
  const isSamePath = tabUrl.origin + tabUrl.pathname === newUrl.origin + tabUrl.pathname
  // Browsers won't reload the page if the new url is only different in hash
  const noReload = isSamePath && !!newUrl.hash?.length
  const state = await getState()
  let bwindowId = state.tabIds.bwindowId;

  let doFlag=[];
  let wTabs = await Ext.windows.getAll();
  for (var i=wTabs.length-1; i>=0; i--) {
    if (wTabs[i].id === bwindowId) {
      doFlag = wTabs[i];
       
      break;
    }
  }
  //let bwindowId = state.tabIds.bwindowId ? state.tabIds.bwindowId : '';
  if(cmd == "openBrowser" && doFlag.length == 0){
  await Ext.windows.create({ url: url })
  const winTab = await getCurrentTab()
  bwindowId=winTab.windowId;
  await updateState(state => ({
    ...state,
    tabIds: {
      ...state.tabIds,
      lastPlay: state.tabIds.toPlay,
      toPlay: winTab.id,
      firstPlay: winTab.id,
      bwindowId:winTab.windowId
    }
  }))
  return await getTab(winTab.id)
  }else{
    const wTab = doFlag.length  !=0 ? await getCurrentTab(doFlag.id) : '';
    //const targetTabId = wTab !="" && cmd == "openBrowser" ? wTab.id : tab.id;
    const targetTabId = tab.id;
    if (noReload) {
      await Ext.tabs.update(targetTabId, { url: "about:blank" })
      await delay(() => {}, 100)
    }
    
    await Ext.tabs.update(targetTabId, { url }) 
    return await getTab(targetTabId)
  }
  
  
}

 export function getAllWindows(): Promise<any[]> {
  return Ext.windows.getAll()
}

export function getAllTabsInWindow(windowId: number): Promise<any[]> {
  return Ext.windows.get(windowId, { populate: true }).then((win: any) => win?.tabs ?? [])
}

export async function getAllTabs(): Promise<any[]> {
  const wins = await getAllWindows();
  const list: any[] = await Promise.all(wins.map((win: any) => getAllTabsInWindow(win.id)));

  return [].concat(...list);
}
