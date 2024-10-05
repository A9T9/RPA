import { Ipc } from './ipc_promise'
import { createIframe } from './ipc_iframe'
import Ext from '../web_extension'
import { getIpcCache } from './ipc_cache'
import { WeakConsecutive } from '../consecutive'
import { activateTab } from '../tab_utils'

export interface AskPageOptions {
  url:          string,
  cmd:          string,
  args:         any,
  ipcTimeout?:  number,
  domReady?:    WeakConsecutive,
  [s: string]:  any
}

export interface IframeAskPageOptions extends AskPageOptions {
  width?:       number,
  height?:      number,
  onLoad?:      () => void,
  domReady?:    WeakConsecutive
}

export interface TabAskPageOptions extends AskPageOptions {
  tabId?:       number
}

export interface CreateTabOptions {
  url:          string,
  tabId?:       number,
  keep?:        boolean,
  ipcTimeout?:  number,
  domReady?:    WeakConsecutive,
  popup?:       boolean,
  width?:       number,
  height?:      number,
  left?:        number,
  top?:         number,
  focus?:       boolean
}

export interface CreateTabAPI extends Ipc {
  getTab:       Function,
  getTabId:     Function
}

export const openPageInIframe = createIframe

export const askPageWithIframe = (options: IframeAskPageOptions): Promise<any> => {
  const iframeIpc = openPageInIframe({
    url:          options.url,
    width:        options.width,
    height:       options.height,
    ipcTimeout:   options.ipcTimeout,
    domReady:     options.domReady,
    onLoad:       options.onLoad
  })

  return iframeIpc.ask(options.cmd, options.args)
  .then((data: any) => {
    setTimeout(() => iframeIpc.destroy())
    return data
  })
}

export const openPageInTab = (options: CreateTabOptions): CreateTabAPI => {
  const isValidTab = (tabId: number): Promise<boolean> => {
    return Ext.tabs.get(tabId)
    .then((tab: any) => {
      return !!tab
    })
    .catch((e: Error) => false)
  }
  const updateExistingTabToUrl = (tabId: number, url: string) => {
    return isValidTab(tabId)
    .then(isValid => {
      return isValid ? Ext.tabs.update(tabId, { url }) : createNewTabWithUrl(url)
    })
  }
  const createNewTabWithUrl = (url: string) => {
    if (options.popup) {
      return Ext.windows.create({
        type:   'popup',
        url:    url,
        width:  Math.round(options.width || screen.availWidth),
        height: Math.round(options.height || screen.availHeight),
        left:   Math.round(options.left || 0),
        top:    Math.round(options.top || 0),
      })
      .then((win: any) => win.tabs[0])
    }

    return Ext.tabs.create({ url })
  }
  const { url, tabId, domReady }    = options
  const pTab: Promise<any>          = options.tabId ? updateExistingTabToUrl(tabId as number, url) : createNewTabWithUrl(url)
  const pIpc: Promise<CreateTabAPI> = pTab.then(tab => {
    const ipcStore  = getIpcCache()
    const pGetTab   = domReady ? ipcStore.domReadyGet(tab.id, 20 * 1000, domReady) : ipcStore.get(tab.id, 20 * 1000)

    return (options.focus ? activateTab(tab.id, true) : Promise.resolve())
    .then(() => pGetTab)
    .then(ipc => ({
      ...ipc,
      getTabId: () => tab.id,
      getTab:   () => Ext.tabs.get(tab.id),
      destroy:  () => {
        ipc.destroy()
        if (!options.tabId && !options.keep) {
          Ext.tabs.remove(tab.id)
        }
      }
    }))
  })

  return {
    destroy: () => {
      pIpc.then(ipc => ipc.destroy())
    },
    ask: (...args: any[]) => {
      return pIpc.then(ipc => ipc.ask(...args))
    },
    onAsk: (...args: any[]) => {
      pIpc.then(ipc => ipc.onAsk(...args))
    },
    getTab: () => {
      return pIpc.then(ipc => ipc.getTab())
    },
    getTabId: () => {
      return pIpc.then(ipc => ipc.getTabId())
    }
  }
}

export const askPageWithTab = (options: TabAskPageOptions): Promise<any> => {
  const tabAPI = openPageInTab({
    url:          options.url,
    tabId:        options.tabId,
    ipcTimeout:   options.ipcTimeout,
    domReady:     options.domReady
  })

  return tabAPI.ask(options.cmd, options.args)
  .then((data: any) => {
    setTimeout(() => tabAPI.destroy(), 0)
    return data
  })
}

export const askPageWithFixedTab = (() => {
  let curTabId: number | undefined = undefined

  return (options: TabAskPageOptions): Promise<any> => {
    const tabAPI = openPageInTab({
      url:          options.url,
      tabId:        options.tabId || curTabId,
      keep:         true,
      ipcTimeout:   options.ipcTimeout,
      domReady:     options.domReady
    })

    return tabAPI.getTabId()
    .then((tabId: number) => {
      curTabId = tabId

      return tabAPI.ask(options.cmd, options.args)
      .then((data: any) => {
        setTimeout(() => tabAPI.destroy(), 0)
        return data
      })
    })
  }
})()

