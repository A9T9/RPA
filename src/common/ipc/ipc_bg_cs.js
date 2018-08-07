import ipcPromise from './ipc_promise'
import Ext from '../web_extension'
import log from '../log'
import { retry, withTimeout } from '../utils'

const TIMEOUT = -1

// Note: `cuid` is a kind of unique id so that you can create multiple
// ipc promise instances between the same two end points
export const openBgWithCs = (cuid) => {
  const wrap = (str) => str + '_' + cuid

  // factory function to generate ipc promise instance for background
  // `tabId` is needed to identify which tab to send messages to
  const ipcBg = (tabId) => {
    let bgListeners = []

    // `sender` contains tab info. Background may need this to store the corresponding
    // relationship between tabId and ipc instance
    const addSender = (obj, sender) => {
      if (!obj || typeof obj !== 'object')  return obj

      obj.sender  = sender
      return obj
    }

    Ext.runtime.onMessage.addListener((req, sender, sendResponse) => {
      bgListeners.forEach(listener => listener(req, sender, sendResponse))
      return true
    })

    return ipcPromise({
      timeout: TIMEOUT,
      ask: function (uid, cmd, args) {
        Ext.tabs.sendMessage(tabId, {
          type: wrap('BG_ASK_CS'),
          uid,
          cmd,
          args
        })
      },
      onAnswer: function (fn) {
        bgListeners.push((req, sender, response) => {
          if (req.type !== wrap('CS_ANSWER_BG'))  return
          fn(req.uid, req.err, addSender(req.data, sender))
        })
      },
      onAsk: function (fn) {
        bgListeners.push((req, sender, response) => {
          if (req.type !== wrap('CS_ASK_BG'))  return
          fn(req.uid, req.cmd, addSender(req.args, sender))
        })
      },
      answer: function (uid, err, data) {
        Ext.tabs.sendMessage(tabId, {
          type: wrap('BG_ANSWER_CS'),
          uid,
          err,
          data
        })
      },
      destroy: function () {
        bgListeners = []
      }
    })
  }

  // factory function to generate ipc promise for content scripts
  const ipcCs = (checkReady) => {
    let csListeners = []

    Ext.runtime.onMessage.addListener((req, sender, sendResponse) => {
      csListeners.forEach(listener => listener(req, sender, sendResponse))
      return true
    })

    return ipcPromise({
      timeout: TIMEOUT,
      checkReady: checkReady,
      ask: function (uid, cmd, args) {
        // log('cs ask', uid, cmd, args)
        Ext.runtime.sendMessage({
          type: wrap('CS_ASK_BG'),
          uid,
          cmd,
          args
        })
      },
      onAnswer: function (fn) {
        csListeners.push((req, sender, response) => {
          if (req.type !== wrap('BG_ANSWER_CS'))  return
          fn(req.uid, req.err, req.data)
        })
      },
      onAsk: function (fn) {
        csListeners.push((req, sender, response) => {
          if (req.type !== wrap('BG_ASK_CS'))  return
          fn(req.uid, req.cmd, req.args)
        })
      },
      answer: function (uid, err, data) {
        Ext.runtime.sendMessage({
          type: wrap('CS_ANSWER_BG'),
          uid,
          err,
          data
        })
      },
      destroy: function () {
        csListeners = []
      }
    })
  }

  return {
    ipcCs,
    ipcBg
  }
}

// Helper function to init ipc promise instance for content scripts
// The idea here is to send CONNECT message to background when initializing
export const csInit = () => {
  const cuid = '' + Math.floor(Math.random() * 10000)

  log('sending Connect...')

  // Note: Ext.extension.getURL is available in content script, but not injected js
  // We use it here to detect whether it is loaded by content script or injected
  // Calling runtime.sendMessage in injected js will cause an uncatchable exception
  if (!Ext.extension.getURL) return

  // try this process in case we're in none-src frame
  try {
    let connected     = false
    const checkReady  = () => {
      if (connected)  return Promise.resolve(true)
      return Promise.reject(new Error('cs not connected with bg yet'))
    }
    const connectBg   = () => {
      return withTimeout(1000, (cancelTimeout) => {
        return Ext.runtime.sendMessage({
          type: 'CONNECT',
          cuid: cuid
        })
        .then(done => {
          if (done) {
            connected = true
            cancelTimeout()
            return true
          }
          throw new Error('not done')
        })
      })
    }
    const tryConnect = retry(connectBg, {
      shouldRetry: () => true,
      retryInterval: 0,
      timeout: 5000
    })

    tryConnect().catch(e => {
      log.error(e)
    })

    return openBgWithCs(cuid).ipcCs(checkReady)
  } catch (e) {
    log.error(e.stack)
  }
}

// Helper function to init ipc promise instance for background
// it accepts a `fn` function to handle CONNECT message from content scripts
export const bgInit = (fn) => {
  Ext.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.type === 'CONNECT' && req.cuid) {
      fn(sender.tab.id, openBgWithCs(req.cuid).ipcBg(sender.tab.id))
      sendResponse(true)
    }
    return true
  })
}
