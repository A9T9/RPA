import { until } from '../utils'

export class IpcCache {
  constructor () {
    this.cache = {}
  }

  get (tabId, timeout = 2000, before = Infinity) {
    return until('ipc by tab id', () => {
      const ipcObj  = this.cache[tabId]
      const enabled = ipcObj && ipcObj.status === 1
      const ipc     = ipcObj && ipcObj.ipc

      return {
        pass:   enabled && !!ipc && (before === Infinity || before > ipcObj.timestamp),
        result: ipc
      }
    }, 100, timeout)
  }

  set (tabId, ipc, cuid) {
    this.cache[tabId] = {
      ipc,
      cuid,
      status: 1,
      timestamp: new Date().getTime()
    }
  }

  setStatus (tabId, status, updateTimestamp = false) {
    const found = this.cache[tabId]
    if (!found) return false

    found.status = status

    if (updateTimestamp) {
      found.timestamp = new Date().getTime()
    }

    return true
  }

  enable (tabId) {
    return this.setStatus(tabId, 1, true)
  }

  disable (tabId) {
    return this.setStatus(tabId, 0)
  }

  getCuid (tabId) {
    const found = this.cache[tabId]
    if (!found) return null
    return found.cuid
  }

  del (tabId) {
    delete this.cache[tabId]
  }
}

let instance

export function getIpcCache () {
  if (instance) return instance
  instance = new IpcCache()
  return instance
}
