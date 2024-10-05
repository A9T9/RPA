import ipcPromise from './ipc_promise'
import { getIpcCache } from './ipc_cache'
import Ext from '../web_extension'
import log from '../log'
import { retry, withTimeout, mockAPIWith } from '../utils'

const TIMEOUT = -1;
// this is a constant number to identify sidePanel
export const SIDEPANEL_TAB_ID = 999999999
// sidepanel port name
export const SIDEPANEL_PORT_NAME = 'uiv_sidepanel'
// this is a constant string to identify sidePanel
const SIDEPANEL_CUID = 'uiv-sidepanel'

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
      // limiting the size of 'sender' reduces memory leak
      obj.sender = {
        tab: {
          id: sender.tab?.id
        },
        url: sender.url
      }
      return obj
    }

    // `sender` contains tab info. Background may need this to store the corresponding
    // relationship between tabId and ipc instance
    const addSenderToArgsOnAskBg = (obj, sender) => {
      if (!obj || typeof obj !== 'object')  return obj

      // two things required for sender object
      // sender.tab.id
      // sender.url
      // OR
      // isSidePanel, isFileSchema, isHttpSchema

      // limiting the size of 'sender' reduces memory leak
       obj.sender  = {
        tab: {
          id: sender.tab?.id // sender can be sidepanel
        },
        url: sender.url
      }
      return obj
    }

    Ext.runtime.onMessage.addListener((req, sender, sendResponse) => {
      if (req.type === wrap('CS_ANSWER_BG') || req.type === wrap('CS_ASK_BG')) {
        sendResponse(true)
      }

      bgListeners.forEach(listener => listener(req, sender))
      return true
    })

    return ipcPromise({
      timeout: TIMEOUT,
      ask: function (uid, cmd, args) {
        // Note: We need to send request to the same tab where the response is from
        // check if the response is from sidePanel
        if (tabId === SIDEPANEL_TAB_ID) {
          // send request to sidePanel
          return Ext.runtime.sendMessage({
            type: wrap('BG_ASK_CS'),
            uid,
            cmd,
            args
          })
        } else {
          return Ext.tabs.sendMessage(tabId, {
            type: wrap('BG_ASK_CS'),
            uid,
            cmd,
            args
          })
        }
      },
      onAnswer: function (fn) {
        bgListeners.push((req, sender) => {
          if (req.type !== wrap('CS_ANSWER_BG'))  return
          fn(req.uid, req.err, addSender(req.data, sender))
        })
      },
      onAsk: function (fn) {
        bgListeners.push((req, sender) => {
          if (req.type !== wrap('CS_ASK_BG'))  return
          if (req.cmd == 'PANEL_LOG') {
            // this is handled upstream, so that it cannot create memory leak
            return;
          } else {
            let reqArgs = addSenderToArgsOnAskBg(req.args, sender)
            fn(req.uid, req.cmd, reqArgs)
          }
        })
      },
      answer: function (uid, err, data) {
        // check if the request is from sidePanel
        if (tabId === SIDEPANEL_TAB_ID) {
          // send response to sidePanel
          return Ext.runtime.sendMessage({
            type: wrap('BG_ANSWER_CS'),
            uid,
            err,
            data
          })
        } else {
          return Ext.tabs.sendMessage(tabId, {
            type: wrap('BG_ANSWER_CS'),
            uid,
            err,
            data
          })
        }
      },
      destroy: function () {
        bgListeners = []
      }
    })
  }

  // factory function to generate ipc promise for content scripts
  // this will run in content script or app running in a separate window (having a tabId)
  const ipcCs = (checkReady) => {
    let csListeners = []
    Ext.runtime.onMessage.addListener((req, sender, sendResponse) => {
      if (req.type === wrap('BG_ANSWER_CS') || req.type === wrap('BG_ASK_CS')) {
        sendResponse(true)
      }

      csListeners.forEach(listener => listener(req, sender))
      return true
    })

    return ipcPromise({
      timeout: TIMEOUT,
      checkReady: checkReady,
      ask: function (uid, cmd, args) {
        // log('cs ask', uid, cmd, args)
        return Ext.runtime.sendMessage({
          type: wrap('CS_ASK_BG'),
          uid,
          cmd,
          args
        })
      },
      onAnswer: function (fn) {
        csListeners.push((req, sender) => {
          if (req.type !== wrap('BG_ANSWER_CS'))  return
          fn(req.uid, req.err, req.data)
        })
      },
      onAsk: function (fn) {
        csListeners.push((req, sender) => {
          if (req.type !== wrap('BG_ASK_CS'))  return
          fn(req.uid, req.cmd, req.args)
        })
      },
      answer: function (uid, err, data) {
        return Ext.runtime.sendMessage({
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

  // factory function to generate ipc promise for sidePanel
  const ipcSp = (checkReady) => {
    let csListeners = []
    // this will run in sidePanel. A sidePanel doesn't have a tabId, so we use a random number instead
    Ext.runtime.onMessage.addListener((req, sender, sendResponse) => {
      if (req.type === wrap('BG_ANSWER_CS') || req.type === wrap('BG_ASK_CS')) {
        sendResponse(true)
      }

      csListeners.forEach(listener => listener(req, sender))
      return true
    })

    return ipcPromise({
      timeout: TIMEOUT,
      checkReady: checkReady,
      ask: function (uid, cmd, args) {
        // log('CS_ASK_BG', uid, cmd, args)
        return Ext.runtime.sendMessage({
          type: wrap('CS_ASK_BG'),
          uid,
          cmd,
          args
        })
      },
      onAnswer: function (fn) {
        csListeners.push((req, sender) => {
          if (req.type !== wrap('BG_ANSWER_CS'))  return
          fn(req.uid, req.err, req.data)
        })
      },
      onAsk: function (fn) {
        csListeners.push((req, sender) => {
          if (req.type !== wrap('BG_ASK_CS'))  return
          fn(req.uid, req.cmd, req.args)
        })
      },
      answer: function (uid, err, data) {
        return Ext.runtime.sendMessage({
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
    ipcSp,
    ipcBg
  }
}

// Helper function to init ipc promise instance for content scripts
// The idea here is to send CONNECT message to background when initializing
export const csInit = (noRecover = false) => {
  const cuid = '' + Math.floor(Math.random() * 10000)

  if (noRecover) {
    Ext.runtime.sendMessage({
      type: 'CONNECT',
      cuid: cuid
    })
    return openBgWithCs(cuid).ipcCs()
  }

  // log('sending Connect...')

  // Note: Ext.runtime.getURL is available in content script, but not injected js
  // We use it here to detect whether it is loaded by content script or injected
  // Calling runtime.sendMessage in injected js will cause an uncatchable exception
  if (!Ext.runtime.getURL) return

  // try this process in case we're in none-src frame
  try {
    // let connected     = false
    // const checkReady  = () => {
    //   if (connected)  return Promise.resolve(true)
    //   return Promise.reject(new Error('cs not connected with bg yet'))
    // }
    const reconnect   = () => {
      return withTimeout(500, () => {
        return Ext.runtime.sendMessage({
          type: 'RECONNECT'
        })
        .then(cuid => {
          // log('got existing cuid', cuid)
          if (cuid) return openBgWithCs(cuid).ipcCs()
          throw new Error('failed to reconnect')
        })
      })
    }
    const connectBg   = () => {
      return withTimeout(1000, () => {
        return Ext.runtime.sendMessage({
          type: 'CONNECT',
          cuid: cuid
        })
        .then(done => {
          if (done) return openBgWithCs(cuid).ipcCs()
          throw new Error('not done')
        })
      })
    }
    const tryConnect = retry(connectBg, {
      shouldRetry: () => true,
      retryInterval: 1000, // 1000 from testing purpose. default value: 0,
      timeout: 5000
    })

    // Note: Strategy here
    // 1. Try to recover connection with background (get the existing cuid)
    // 2. If cuid not found, try to create new connection (cuid) with background
    // 3. Both of these two steps above are async, but this api itself is synchronous,
    //    so we have to create a mock API and return it first
    const enhancedConnect = () => {
      return reconnect()
      .catch(() => tryConnect())
      .catch(e => {
        log.error('Failed to create cs ipc')
        throw e
      })
    }

    return mockAPIWith(
      enhancedConnect,
      {
        ask:     () => Promise.reject(new Error('mock ask')),
        onAsk:   (...args) => { /* log('mock onAsk', ...args ) */ },
        destroy: () => {},
        secret:  cuid
      },
      ['ask']
    )
  } catch (e) {
    log.error(e.stack)
  }
}

// Helper function to init ipc promise instance for sidePanel
// The idea here is to send CONNECT message to background when initializing
export const spInit = () => {
   const cuid = SIDEPANEL_CUID
  try {
    // log('sending Connect...')
    const connectBg   = () => {
      return withTimeout(1000, () => {
        return Ext.runtime.sendMessage({
          type: 'CONNECT',
          cuid: cuid
        })
        .then(done => {
          if (done) return openBgWithCs(cuid).ipcSp()
          throw new Error('sp connect not done')
        })
      })
    }
    const tryConnect = retry(connectBg, {
      shouldRetry: () => true,
      retryInterval: 1000, // 1000 from testing purpose. default value: 0,
      timeout: 5000
    })

    // Note: Strategy here
    // 1. Try to recover connection with background (get the existing cuid)
    // 2. If cuid not found, try to create new connection (cuid) with background
    // 3. Both of these two steps above are async, but this api itself is synchronous,
    //    so we have to create a mock API and return it first
    const enhancedConnect = () => {
      return tryConnect()
      .catch(e => {
        log.error('Failed to create cs ipc - spInit')
        throw e
      })
    }

    return mockAPIWith(
      enhancedConnect,
      {
        ask:     () => Promise.reject(new Error('mock ask')),
        onAsk:   (...args) => { /* log('mock onAsk', ...args) */ },
        destroy: () => {},
        secret:  cuid
      },
      ['ask']
    )
  } catch (e) {
    log.error(e.stack)
  }
}

// Helper function to init ipc promise instance for background
// it accepts a `fn` function to handle CONNECT message from content scripts
export const bgInit = (fn, getLogServiceForBg) => {
  Ext.runtime.onMessage.addListener((req, sender, sendResponse) => {

    // this is handled here to prevent memory leak from 'PANEL_LOG'  
    if(req.cmd == 'PANEL_LOG'){
      return getLogServiceForBg().log(req.args.log)
    }

    switch (req.type) {
      case 'CONNECT': {
        if (req.cuid) {
          if (req.cuid === SIDEPANEL_CUID) {
            fn(SIDEPANEL_TAB_ID, SIDEPANEL_CUID, openBgWithCs(SIDEPANEL_CUID).ipcBg(SIDEPANEL_TAB_ID))
            sendResponse(true)
          } else {
            fn(sender.tab.id, req.cuid, openBgWithCs(req.cuid).ipcBg(sender.tab.id))
            sendResponse(true)
          }
        }
        break
      }
      case 'RECONNECT': {
        getIpcCache().getCuid(sender.tab.id).then(async (cuid) => {
          if (cuid) {
            await getIpcCache().enable(sender.tab.id)
          }

          sendResponse(cuid || null)
        })

        break
      }
      case 'BringIDEToFront':{
        let delay = req.delay || 0        
        setTimeout(() => {
          Ext.windows.update(req.windowId, { focused: true })
        }, delay) 
        break
      }
    }

    return true
  })
}
