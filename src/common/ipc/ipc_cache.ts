import { retry, until, singletonGetter } from '../ts_utils'
import { withConsecutive, WeakConsecutive } from '../consecutive'
import { Ipc } from './ipc_promise'
import storage from '../storage'
import { openBgWithCs } from './ipc_bg_cs'

enum IpcStatus {
  Off,
  On
}

type TabIpcItem = {
  ipc:       Ipc;
  cuid:      number;
  status:    IpcStatus;
  timestamp: number;
}

const ipcCacheStorageKey = 'ipc_cache'

export class IpcCache {
  private cuidIpcMap: Record<string, Ipc> = {}

  fetch(): Promise<Record<string, TabIpcItem>> {
    return storage.get(ipcCacheStorageKey).then(cache => cache || {})
  }


  has (tabId: number, cuid?: number): Promise<boolean> {
    return this.fetch().then(cache => {
      const item = cache[tabId]
      return !!item && (!cuid || item.cuid == cuid)
    })
  }

  get (tabId: number, timeout = 2000, before = Infinity): Promise<Ipc> {
    return until('ipc by tab id', () => {
      return this.fetch().then((cache: Record<string, TabIpcItem>) => {
        const ipcObj  = cache[tabId]
        const enabled = ipcObj && ipcObj.status === IpcStatus.On
        const valid = enabled && (before === Infinity || before > ipcObj.timestamp)

        if (!valid) {
          return {
            pass: false,
            result: null as any
          }
        }

        return {
          pass:   true,
          result: this.getCachedIpc(`${ipcObj.cuid}`, tabId),
        }
      })
    }, 100, timeout)
  }

  domReadyGet (tabId: number, timeout = 60 * 1000, c: WeakConsecutive = true): Promise<Ipc> {
    return retry(() => {
      return this.get(tabId)
      .then(ipc => {
        // Note: must respond to DOM READY for multiple times in line,
        // before we can be sure that it's ready
        return withConsecutive(c, () => {
          return ipc.ask('DOM_READY', {}, 1000)
          .then(() => true, () => false)
        })
        .then(() => ipc)
      })
    }, {
      timeout,
      retryInterval: 1000,
      shouldRetry: (e) => true
    })()
  }

  set (tabId: number, ipc: Ipc, cuid: number): Promise<void> {
    return this.fetch().then(cache => {
      cache[tabId] = {
        ipc,
        cuid,
        status: 1,
        timestamp: new Date().getTime()
      }
      // remove functions from cache object to avoid errors in saving object in storage in firefox
      let cacheObj = JSON.parse(JSON.stringify(cache))
      return storage.set(ipcCacheStorageKey, cacheObj).then(() => {})
    })
  }

  setStatus (tabId: number, status: IpcStatus, updateTimestamp = false): Promise<boolean> {
    return this.fetch().then(cache => {
      const found = cache[tabId]
      if (!found) return false

      found.status = status

      if (updateTimestamp) {
        found.timestamp = new Date().getTime()
      }

      return storage.set(ipcCacheStorageKey, cache)
    })
  }

  enable (tabId: number): Promise<boolean> {
    return this.setStatus(tabId, IpcStatus.On, true)
  }

  disable (tabId: number): Promise<boolean> {
    return this.setStatus(tabId, IpcStatus.Off)
  }

  getCuid (tabId: number): Promise<number | null> {
    return this.fetch().then(cache => {
      const found = cache[tabId]
      if (!found) return null
      return found.cuid
    })
  }

  del (tabId: number): Promise<void> {
    return this.fetch().then(cache => {
      delete cache[tabId]
      return storage.set(ipcCacheStorageKey, cache).then(() => {})
    })
  }

  cleanup (tabIdDict: Record<string, boolean>): Promise<Record<string, TabIpcItem>> {
    return this.fetch().then(cache => {
      Object.keys(cache).forEach(tabId => {
        if (!tabIdDict[tabId]) {
          delete cache[tabId]
        }
      })

      return storage.set(ipcCacheStorageKey, cache).then(() => cache)
    })
  }

  private getCachedIpc (cuid: string, tabId: number): Ipc {
    if (!this.cuidIpcMap[cuid]) {
      this.cuidIpcMap[cuid] = openBgWithCs(cuid).ipcBg(tabId)
    }

    return this.cuidIpcMap[cuid]
  }
}

export const getIpcCache = singletonGetter(() => new IpcCache)
