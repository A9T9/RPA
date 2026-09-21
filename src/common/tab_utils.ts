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

// never target an extension page (side panel / IDE opened as a tab) or a
// browser special page — content scripts cannot run there
export const isWebTab = (tab: any): boolean => {
  return !!tab && !/^(chrome|moz|edge)-extension:|^(chrome|about|edge):/.test(tab.url || '')
}

// The tab a run should target: the focused window's active web tab.
// Ext.tabs.query({ active: true }) alone returns one active tab PER WINDOW in
// window order (not recency) — with an IDE window or an unrelated window
// around, tabs[0] can be the wrong window's tab (or an extension page).
export const getActiveWebTab = async (): Promise<any | null> => {
  const focused = (await Ext.tabs.query({ active: true, lastFocusedWindow: true }).catch(() => [])).filter(isWebTab)
  if (focused.length) return focused[0]

  const active = (await Ext.tabs.query({ active: true }).catch(() => [])).filter(isWebTab)
  return active.length ? active[0] : null
}

// The BRIDGE session's play tab (OPEN-ISSUES 21.1). Every bridge tool
// (run_macro, browser_snapshot, screenshot, marks) used to pick "the focused window's
// active web tab" afresh — so a user browsing in a SECOND window between two
// tool calls silently became the target, and the next uiv.goto would have
// navigated THEIR page. Rule now: the session keeps its tab. The user's
// focus is followed only INSIDE that tab's window (they opened the next site
// there on purpose — "site open"); a focused tab in another window is
// reported, not adopted. No sticky tab yet (first call, or it was closed)
// → the old pick.
let bridgeTabId: number | null = null
export const setBridgeTab = (id: number | null) => { bridgeTabId = id }
export const pickBridgeTab = async (): Promise<{ tab: any | null; note: string }> => {
  const title = (t: any) => String((t && (t.title || t.url)) || '').slice(0, 50)
  const sticky = bridgeTabId != null ? await Ext.tabs.get(bridgeTabId).catch(() => null) : null
  const stickyOk = isWebTab(sticky) ? sticky : null
  if (!stickyOk) bridgeTabId = null
  const focused = (await Ext.tabs.query({ active: true, lastFocusedWindow: true }).catch(() => []))[0]
  const focusedWeb = isWebTab(focused) ? focused : null
  let tab: any = null
  let note = ''
  if (stickyOk && focusedWeb && focusedWeb.windowId === stickyOk.windowId) {
    tab = focusedWeb
  } else if (stickyOk) {
    tab = stickyOk
    if (focusedWeb) {
      note = `the focused window shows "${title(focusedWeb)}" — keeping the run on its own tab #${(stickyOk.index || 0) + 1} "${title(stickyOk)}" in the window of the previous run (a bridge run never follows the user's focus into another window; open the next site in the run's window, or uiv.tabs.select({url: '…'}) to move it)`
    }
  } else {
    // no session tab yet (first call, or after a reload): the HOME window —
    // the one hosting the Ui.Vision panel — before the focused one. The
    // first pick after a reload used to land on the user's other window
    // and the script's uiv.goto replaced their page (seen 2026-09-03).
    let home: any = null
    try {
      const win = await (Ext as any).windows.getCurrent()
      const inHome = win ? (await Ext.tabs.query({ active: true, windowId: win.id }).catch(() => [])).filter(isWebTab) : []
      home = inHome[0] || null
    } catch (e) { home = null }
    tab = home || await getActiveWebTab()
    if (tab && focusedWeb && focusedWeb.windowId !== tab.windowId) {
      note = `starting on tab #${(tab.index || 0) + 1} "${title(tab)}" in the Ui.Vision panel's window, not on "${title(focusedWeb)}" in the focused window — a bridge session works in the panel's window; uiv.tabs.select({url: '…'}) moves it`
    }
  }
  if (tab) bridgeTabId = tab.id
  return { tab, note }
}

// The active tab, whatever it happens to show. Last resort for starting a run
// when there is no web tab anywhere — a freshly started browser sitting on its
// new tab page, where refusing to start meant the Play button did nothing at
// all. `open` copes with a browser-internal page: the player loads the URL
// into it (preparePlayTab in ext/popup/run_command.ts). Extension pages stay
// excluded — navigating one away would take down the IDE / side panel.
export const getActiveNonExtensionTab = async (): Promise<any | null> => {
  const usable = (tab: any): boolean => !!tab && !/^(chrome|moz|edge)-extension:/i.test(tab.url || '')

  const focused = (await Ext.tabs.query({ active: true, lastFocusedWindow: true }).catch(() => [])).filter(usable)
  if (focused.length) return focused[0]

  const active = (await Ext.tabs.query({ active: true }).catch(() => [])).filter(usable)
  return active.length ? active[0] : null
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
