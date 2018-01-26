import Ext from './web_extension'
import { partial, composePromiseFn } from './utils'

const PROTOCOL_VERSION = '1.2'
const ClEANUP_TIMEOUT = 0

export const withDebugger = (function () {
  const state = {
    connected: null,
    cleanupTimer: null
  }

  const setState = (obj) => {
    Object.assign(state, obj)
  }

  const cancelCleanup = () => {
    if (state.cleanupTimer) clearTimeout(state.cleanupTimer)
    setState({ cleanupTimer: null })
  }

  const isSameDebuggee = (a, b) => {
    return a && b && a.tabId && b.tabId && a.tabId === b.tabId
  }

  return (debuggee, fn) => {
    const attach = (debuggee) => {
      if (isSameDebuggee(state.connected, debuggee)) {
        cancelCleanup()
        return Promise.resolve()
      }

      return detach(state.connected)
      .then(() => Ext.debugger.attach(debuggee, PROTOCOL_VERSION))
      .then(() => setState({ connected: debuggee }))
    }
    const detach = (debuggee) => {
      if (!debuggee)  return Promise.resolve()

      return Ext.debugger.detach(debuggee)
      .then(() => {
        if (state.cleanupTimer) clearTimeout(state.cleanupTimer)

        setState({
          connected: null,
          cleanupTimer: null
        })
      }, e => console.error('error in detach', e.stack))
    }
    const scheduleDetach = () => {
      const timer = setTimeout(() => detach(debuggee), ClEANUP_TIMEOUT)
      setState({ cleanupTimer: timer })
    }
    const sendCommand = (cmd, params) => {
      return Ext.debugger.sendCommand(debuggee, cmd, params)
    }
    const onEvent = (callback) => {
      Ext.debugger.onEvent.addListener(callback)
    }
    const onDetach = (callback) => {
      Ext.debugger.onDetach.addListener(callback)
    }

    return new Promise((resolve, reject) => {
      const done = (error, result) => {
        scheduleDetach()

        if (error)  return reject(error)
        else        return resolve(result)
      }

      return attach(debuggee).then(
        () => {
          fn({ sendCommand, onEvent, onDetach, done })
        },
        e => reject(e)
      )
    })
  }
})()

const __getDocument = ({ sendCommand, done }) => () => {
  return sendCommand('DOM.getDocument')
  .then(obj => obj.root)
}

const __querySelector = ({ sendCommand, done }) => partial((selector, nodeId) => {
  return sendCommand('DOM.querySelector', { nodeId, selector })
  .then(res => res && res.nodeId)
})

const __setFileInputFiles = ({ sendCommand, done }) => partial((files, nodeId) => {
  return sendCommand('DOM.setFileInputFiles', { nodeId, files })
  .then(() => true)
})

export const setFileInputFiles = ({ tabId, selector, files }) => {
  return withDebugger({ tabId }, api => {
    const go = composePromiseFn(
      __setFileInputFiles(api)(files),
      __querySelector(api)(selector),
      node => node.nodeId,
      __getDocument(api)
    )

    return go().then(res => api.done(null, res))
  })
}
