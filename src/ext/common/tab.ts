import Ext from '@/common/web_extension'

import log from '@/common/log'
import { delay, retry, until } from '@/common/ts_utils'
import { getIpcCache } from '@/common/ipc/ipc_cache'
import { ExtensionState, getState, updateState } from './global_state'
import { activateTab, createTab, getTab, updateUrlForTab } from '@/common/tab_utils'
import storage from '@/common/storage'
import { SIDEPANEL_TAB_ID } from '@/common/ipc/ipc_bg_cs'
import { checkIfSidePanelOpen } from './sidepanel'
import { isSidePanelWindow } from '@/common/utils';

// Generate function to get ipc based on tabIdName and some error message
export function genGetTabIpc (tabIdName: string, purpose: string) {
  return (timeout = 100, before = Infinity) => {
    return retry(async () => {
      const state = await getState()
      const tabId = state.tabIds[tabIdName]

      if (!tabId) {
        return Promise.reject(new Error(`Error #150: No tab for ${purpose} yet`))
      }

      if (tabId === SIDEPANEL_TAB_ID) {
        return {id: SIDEPANEL_TAB_ID}
      } else {
        return Ext.tabs.get(tabId)
      }
    }, {
      timeout,
      retryInterval: 100,
      shouldRetry: () => true
    })()
    .then(tab => {
      if (!tab) {
        throw new Error(`Error #160: The ${purpose} tab seems to be closed`)
      }

      return getIpcCache().get(tab.id, timeout, before)
      .catch(e => {
        throw new Error(`Error #170: No ipc available for the ${purpose} tab`)
      })
    })
  }
}

export const getRecordTabIpc = genGetTabIpc('toRecord', 'recording')

export const getPlayTabIpc   = genGetTabIpc('toPlay', 'playing commands')

export const getInspectTabIpc  = genGetTabIpc('toInspect', 'inspect')

export const getPanelTabIpc  = genGetTabIpc('panel', 'dashboard')

export async function showPanelWindow ({ params, showSettingsOnStart, selectCommandIndex }: Record<string, any> = {}): Promise<boolean> {
  const state = await getState()

  if (showSettingsOnStart) {
    // update config
   await storage.get('config')
      .then(config => {
        storage.set('config', {
          ...config,
          showSettingsOnStart: true
        })
      })
  } else {
    // update config
    await storage.get('config')
      .then(config => {
        storage.set('config', {
          ...config,
          showSettingsOnStart: false,
          selectCommandIndex
        })
      })
  }

  const panelTabId = isSidePanelWindow() ?  state.tabIds.lastPanelWindow : state.tabIds.panel
  console.log('panelTabId :>> ', panelTabId)

  return activateTab(panelTabId, true)
  .then(
    (): boolean => false,
    (): Promise<boolean> => {
      console.log('activateTab failed, :>> ')
      return storage.get('config')
      .then(config => {
        config = config || {}
        return (config.size || {})[config.showSidebar ? 'with_sidebar' : 'standard']
      })
      .then(async (size) => {
        size = size || {
          width: 850,
          height: 775
        }

        const urlQuery = Object.keys(params || {})
                          .map(key => {
                            return `${key}=${params[key]}`
                          })
                          .join('&')
        const base = Ext.runtime.getURL('popup.html')
        const url  = urlQuery.length > 0 ? `${base}?${urlQuery}` : base

        await updateState({ closingAllWindows: false })

        return Ext.windows.create({
          url,
          type:   'popup',
          width:  size.width,
          height: size.height
        })
        .then((win: chrome.windows.Window) => {
         
          // because closing of sidepanel sends the IDE to background
          const isEdge = navigator.userAgent.includes('Edg');
          if (isEdge) {
            Ext.runtime.sendMessage({
              type: 'BringIDEToFront',
              windowId: win.id,
              delay: 2500 // 500ms + the delay in the next line   
            })
          }
          
          if (!Ext.isFirefox()) return

          // Refer to https://bugzilla.mozilla.org/show_bug.cgi?id=1425829
          // Firefox New popup window appears blank until right-click
          return delay(() => {
            return Ext.windows.update(win.id, {
              width: size.width + 1,
              height: size.height + 1
            })
          }, 1000)
        })
        .then(() => delay(() => true, 2000))
      })
    }
  )
}

export function withPanelIpc (options?: Record<string, any>) {
  return checkIfSidePanelOpen().then((isSidePanelOpen) => {
    if (isSidePanelOpen) {
      return getPanelTabIpc(6 * 1000)
    } else {
      return showPanelWindow(options)
      .then(() => getPanelTabIpc(6 * 1000))          
    }
  })
}

// Get the current tab for play, if url provided, it will be loaded in the tab
export async function getPlayTab (url?: string): Promise<chrome.tabs.Tab> {
  // Note: update error message to be more user friendly. But the original message is kept as comment
  // const theError  = new Error('Either a played tab or a url must be provided to start playing')
  const theError  = new Error('Error #180: No connection to browser tab')

  const createOne = async (url?: string): Promise<chrome.tabs.Tab> => {
    if (!url) throw theError

    const tab = await createTab(url)

    await updateState(state => ({
      ...state,
      tabIds: {
        ...state.tabIds,
        lastPlay: state.tabIds.toPlay,
        toPlay: tab.id,
        firstPlay: tab.id
      }
    }))

    return tab
  }

  const runRealLogic = (state: ExtensionState) => {
    if (!state.tabIds.toPlay && !url) {
      throw theError
    }

    if (!state.tabIds.toPlay) {
      return createOne(url)
    }

    return getTab(state.tabIds.toPlay)
    .then(
      (tab) => {
        if (!url) {
          return tab
        }

        // Note: must disable ipcCache manually here, so that further messages
        // won't be sent the old ipc
        getIpcCache().disable(tab.id)

        const finalUrl = (() => {
          try {
            
            const u = new URL(url, tab.url)
            return u.toString()
          } catch (e) {
            return url
          }
        })()
        
        return updateUrlForTab(tab, finalUrl,'open')
      },
      ()  => createOne(url)
    )
  }

  const state = await getState()

  if (state.pendingPlayingTab) {
    await until('pendingPlayingTab reset', () => {
      return {
        pass:   !state.pendingPlayingTab,
        result: true
      }
    }, 100, 5000)
  }

  return runRealLogic(state)
}

// Get the current tab for play, if url provided, it will be loaded in the tab
export async function getPlayTabOpenB (url?: string): Promise<chrome.tabs.Tab> {
  // Note: update error message to be more user friendly. But the original message is kept as comment
  // const theError  = new Error('Either a played tab or a url must be provided to start playing')
  const theError  = new Error('Error #180: No connection to browser tab')

  const createOne = async (url?: string): Promise<chrome.tabs.Tab> => {
    if (!url) throw theError

    const tab = await createTab(url)

    await updateState(state => ({
      ...state,
      tabIds: {
        ...state.tabIds,
        lastPlay: state.tabIds.toPlay,
        toPlay: tab.id,
        firstPlay: tab.id
      }
    }))

    return tab
  }

  const runRealLogic = (state: ExtensionState) => {
    if (!state.tabIds.toPlay && !url) {
      throw theError
    }

    if (!state.tabIds.toPlay) {
      return createOne(url)
    }

    return getTab(state.tabIds.toPlay)
    .then(
      (tab) => {
        if (!url) {
          return tab
        }

        // Note: must disable ipcCache manually here, so that further messages
        // won't be sent the old ipc
        getIpcCache().disable(tab.id)

        const finalUrl = (() => {
          try {
            
            const u = new URL(url, tab.url)
            return u.toString()
          } catch (e) {
            return url
          }
        })()
        
        return updateUrlForTab(tab, finalUrl,'openBrowser')
      },
      ()  => createOne(url)
    )
  }

  const state = await getState()

  if (state.pendingPlayingTab) {
    await until('pendingPlayingTab reset', () => {
      return {
        pass:   !state.pendingPlayingTab,
        result: true
      }
    }, 100, 5000)
  }

  return runRealLogic(state)
}

export async function getActiveTab (): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await Ext.tabs.query({ active: true, currentWindow: true })
  return tabs && tabs[0]
}

export async function getActiveTabId (): Promise<number | undefined> {
  const tab = await getActiveTab()
  return tab && tab.id
}
