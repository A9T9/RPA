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
      .catch(() => {
        // No usable content-script connection. The common cause on a tab that
        // was open BEFORE an extension reload/update: Chrome does not inject
        // manifest content scripts into existing tabs, so the page has none
        // until it is reloaded — every page command died with #170 and the
        // user had to guess "reload the tab" (OPEN-ISSUES 17.1). Inject it
        // now, once, and retry the lookup; the probe inside makes this a
        // no-op when a script is alive and something else is wrong.
        return reinjectContentScript(tab)
        .then(injected => {
          if (!injected) throw new Error('no injection')
          log('content script re-injected into tab', tab.id, '— retrying ipc lookup')
          return getIpcCache().get(tab.id, 5000, before)
        })
        .catch(() => {
          throw new Error(`Error #170: No ipc available for the ${purpose} tab — the page has no working content script. Typical after an extension reload/update on a tab that was already open: reload the tab (F5) and run again.`)
        })
      })
    })
  }
}

// Inject content_script.js into a tab that lost it (an extension reload or
// update leaves every already-open tab without one — Chrome only injects
// manifest content scripts on navigation). Returns true when an injection
// was made, false when the tab cannot take one or already has a live script.
export async function reinjectContentScript (tab: any): Promise<boolean> {
  const scripting = (Ext as any).scripting
  if (!tab || !tab.id || !scripting || typeof scripting.executeScript !== 'function') return false
  const url = tab.url || tab.pendingUrl || ''
  // browser-internal and extension pages never take a content script
  if (!/^(https?|file):/i.test(url)) return false
  // still loading: the manifest injection is on its way, do not double it
  if (tab.status && tab.status !== 'complete') return false
  // isolated-world probe — the content script sets this flag when it runs
  const alive = await Promise.resolve(scripting.executeScript({
    target: { tabId: tab.id },
    func: () => !!(window as any).__uivContentScriptLoaded
  }))
  .then((r: any) => !!(r && r[0] && r[0].result))
  .catch(() => true)   // cannot probe (blocked page): never inject blindly
  if (alive) return false
  log('reinjecting content_script.js into tab', tab.id, url)
  await scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['content_script.js'] })
  // say so in the panel log — the run continues, but the user should know
  // why the first command took a moment and that no tab reload was needed
  getPanelTabIpc()
    .then(ipc => ipc.ask('ADD_LOG', { type: 'info', text: `content script re-injected into tab #${(tab.index || 0) + 1} (${url.slice(0, 60)}) — the tab was open before the extension was reloaded or updated` }))
    .catch(() => {})
  return true
}

export const getRecordTabIpc = genGetTabIpc('toRecord', 'recording')

export const getPlayTabIpc   = genGetTabIpc('toPlay', 'playing commands')

export const getInspectTabIpc  = genGetTabIpc('toInspect', 'inspect')

export const getPanelTabIpc  = genGetTabIpc('panel', 'dashboard')

export async function showPanelWindow ({ params, selectCommandIndex }: Record<string, any> = {}): Promise<boolean> {
  const state = await getState()

  await storage.get('config')
    .then(config => {
      storage.set('config', {
        ...config,
        selectCommandIndex
      })
    })

  const panelTabId = isSidePanelWindow() ?  state.tabIds.lastPanelWindow : state.tabIds.panel
  console.log('panelTabId :>> ', panelTabId)

  // After a browser restart or extension reload, `panelTabId` is a stale value
  // restored from storage. The browser may have since assigned that same tab id
  // to an unrelated tab (e.g. a Google search tab), so activating it blindly
  // would focus the wrong tab instead of opening the extension. Only reuse the
  // stored tab when it really is our panel page; otherwise fall through to
  // creating a fresh panel window.
  const isReusablePanelTab = await (async (): Promise<boolean> => {
    if (panelTabId == null || panelTabId === SIDEPANEL_TAB_ID) return false
    try {
      const tab = await Ext.tabs.get(panelTabId)
      const url = (tab && (tab.url || tab.pendingUrl)) || ''
      return url.startsWith(Ext.runtime.getURL('popup.html')) ||
             url.startsWith(Ext.runtime.getURL('sidepanel.html'))
    } catch (e) {
      return false
    }
  })()

  return (isReusablePanelTab ? activateTab(panelTabId, true) : Promise.reject(new Error('panel tab not reusable')))
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

// The IDE's docked AI-chat panel is a fixed-width column; widen/narrow the
// popup window when it toggles so the chat doesn't squeeze the command table.
// No-op when the window is maximized/fullscreen. Called from the explicit
// toggle actions only — never from config hydration, which would grow the
// window a bit on every IDE start.
export function resizeIdeWindowForAiChat (show: boolean, panelWidth?: number): Promise<void> {
  // panel content width (user-resizable, config.ideAiChatWidth) + its 1px
  // border — must match the panel's footprint exactly, otherwise the editor
  // area jumps by the difference on every toggle
  const size = (panelWidth || 320) + 1
  const delta = show ? size : -size
  return Ext.windows.getCurrent()
    .then((win: chrome.windows.Window) => {
      if (!win || win.state !== 'normal') return
      return Ext.windows.update(win.id, { width: Math.max(520, (win.width || 850) + delta) })
    })
    .then(() => {}, () => {})
}

// Settings live on the options page (options.html), a normal browser tab —
// one settings surface for the side panel, the IDE window and the background.
// Legacy tab keys from the old settings modal map onto the page's sections.
const SETTINGS_SECTION_MAP: Record<string, string> = {
  replay: 'general',
  advanced: 'replay',
  advanced_replay: 'replay',
  advanced_proxy: 'proxy',
  advanced_security: 'security'
}

export async function openSettings (section?: string): Promise<void> {
  const normalized = section ? (SETTINGS_SECTION_MAP[section] || section) : ''
  const base = Ext.runtime.getURL('options.html')
  const url = normalized ? `${base}#${normalized}` : base

  // reuse an already-open settings tab in any window; updating only the hash
  // fires hashchange in the page (section switch) without a reload
  const allTabs: chrome.tabs.Tab[] = await Ext.tabs.query({}).catch(() => [])
  const existing = (allTabs || []).find(t => (((t as any).url || (t as any).pendingUrl) || '').startsWith(base))
  if (existing && existing.id != null) {
    await Ext.tabs.update(existing.id, { active: true, ...(normalized ? { url } : {}) })
    if (existing.windowId != null) {
      await Ext.windows.update(existing.windowId, { focused: true }).catch(() => {})
    }
    return
  }

  // open in a NORMAL browser window — a bare tabs.create from the IDE (a
  // popup-type window) would put the settings tab inside the IDE window
  const wins: chrome.windows.Window[] = await Ext.windows
    .getAll({ windowTypes: ['normal'] })
    .catch(() => [] as chrome.windows.Window[])
  const target = (wins || []).find(w => w.focused) || (wins || [])[0]

  if (target && target.id != null) {
    await Ext.tabs.create({ windowId: target.id, url, active: true })
    await Ext.windows.update(target.id, { focused: true }).catch(() => {})
  } else {
    // no browser window at all (edge case) — create one
    await Ext.windows.create({ url })
  }
}

export function withPanelIpc (options?: Record<string, any>) {
  const openViaWindow = () => {
    return showPanelWindow(options)
    .then(() => getPanelTabIpc(6 * 1000))
  }

  // Sidebar-first: the caller already kicked off chrome.sidePanel.open() in
  // the user-gesture context (see tryOpenSidePanelForRun in bg.js — it cannot
  // be done here, any prior await voids the gesture). Poll until the panel
  // page has booted and registered itself, then use it; if it never shows up,
  // fall back to the IDE window.
  if (options && options.panelAlreadyOpening) {
    const deadline = Date.now() + 10 * 1000

    const poll = (): Promise<any> => {
      return checkIfSidePanelOpen().then((isOpen) => {
        if (isOpen) return getPanelTabIpc(6 * 1000)
        if (Date.now() > deadline) return openViaWindow()
        return delay(poll, 500)
      })
    }

    return poll()
  }

  return checkIfSidePanelOpen().then((isSidePanelOpen) => {
    if (isSidePanelOpen) {
      return getPanelTabIpc(6 * 1000)
    }

    return openViaWindow()
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
