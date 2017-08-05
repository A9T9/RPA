import ipcPromise from './ipc_promise'
import Ext from '../web_extension'

const TIMEOUT = 1000 * 60

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
  const ipcCs = () => {
    let csListeners = []

    Ext.runtime.onMessage.addListener((req, sender, sendResponse) => {
      csListeners.forEach(listener => listener(req, sender, sendResponse))
      return true
    })

    return ipcPromise({
      timeout: TIMEOUT,
      ask: function (uid, cmd, args) {
        // console.log('cs ask', uid, cmd, args)
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

  console.log('sending Connect...')
  Ext.runtime.sendMessage({
    type: 'CONNECT',
    cuid: cuid
  })

  return openBgWithCs(cuid).ipcCs()
}

// Helper function to init ipc promise instance for background
// it accepts a `fn` function to handle CONNECT message from content scripts
export const bgInit = (fn) => {
  Ext.runtime.onMessage.addListener((req, sender) => {
    if (req.type === 'CONNECT' && req.cuid) {
      fn(sender.tab.id, openBgWithCs(req.cuid).ipcBg(sender.tab.id))
    }
    return true
  })
}
