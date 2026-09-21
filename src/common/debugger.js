import Ext from './web_extension'
import { partial, composePromiseFn } from './utils'
import { createDebuggerLifetimeClient } from './debugger_lifetime'

const PROTOCOL_VERSION = '1.2'
const ClEANUP_TIMEOUT = 0

let lifetimeRequest = null
const debuggerAction = (method, debuggee, version) => {
  const isPanel = typeof window !== 'undefined' && /\/(popup|sidepanel)\.html$/.test(window.location.pathname)
  if (!isPanel) return method === 'attach' ? Ext.debugger.attach(debuggee, version) : Ext.debugger.detach(debuggee)
  if (!lifetimeRequest) lifetimeRequest = createDebuggerLifetimeClient(chrome.runtime)
  return lifetimeRequest(method, debuggee, version)
}

export const withDebugger = (function () {
  const state = {
    connected: null,
    cleanupTimer: null,
    externalDetachListener: null
  }

  const setState = (obj) => {
    Object.assign(state, obj)
  }

  const cancelCleanup = () => {
    if (state.cleanupTimer) clearTimeout(state.cleanupTimer)
    setState({ cleanupTimer: null })
  }

  // Auto-close waits for this promise; it must not leave a timer in the page
  // that is about to disappear. Manual close is handled by the lifetime port.
  const detachNow = async () => {
    cancelCleanup()
    const target = state.connected
    if (!target) return
    await debuggerAction('detach', target)
    if (isSameDebuggee(state.connected, target)) setState({ connected: null })
  }

  const isSameDebuggee = (a, b) => {
    return a && b && a.tabId && b.tabId && a.tabId === b.tabId
  }

  // The user can detach us externally (the "started debugging" infobar's Cancel
  // button, or opening DevTools on the tab). Without clearing our state, the
  // next call would assume it's still attached and fail on sendCommand.
  const ensureExternalDetachListener = () => {
    if (state.externalDetachListener) return

    const listener = (source) => {
      if (isSameDebuggee(state.connected, source)) {
        cancelCleanup()
        setState({ connected: null })
      }
    }
    Ext.debugger.onDetach.addListener(listener)
    setState({ externalDetachListener: listener })
  }

  const run = (debuggee, fn, options = {}) => {
    const cleanupTimeout = options.cleanupTimeout || ClEANUP_TIMEOUT

    const attach = (debuggee) => {
      // On Firefox the web_extension adapter leaves Ext.debugger as an empty
      // stub (no chrome.debugger API), so fail with a clear message instead of
      // crashing on Ext.debugger.onDetach.addListener below
      if (typeof Ext.debugger.attach !== 'function') {
        return Promise.reject(new Error('E331: This command needs the browser debugger API, which Firefox does not provide to extensions (Chrome/Edge only)'))
      }

      ensureExternalDetachListener()

      if (isSameDebuggee(state.connected, debuggee)) {
        cancelCleanup()
        return Promise.resolve()
      }

      return detach(state.connected)
      .then(() => debuggerAction('attach', debuggee, PROTOCOL_VERSION).catch(e => {
        if (!ALREADY_ATTACHED_RE.test(String(e && e.message))) throw e
        // "Another debugger is already attached to the tab with id: N" while
        // OUR state says nothing is attached (OPEN-ISSUES 57, seen live
        // 2026-09-13 with Chrome's bar naming Ui.Vision itself): the service
        // worker forgot a session Chrome still holds (worker restart, or a
        // lost detach). Only the owner can detach a session, so one detach
        // attempt tells the two cases apart: it succeeds for our own stale
        // session (re-attach and carry on), and a foreign holder (DevTools,
        // another extension) answers "not attached" — then the original
        // error stands and the caller gets the hint.
        return debuggerAction('detach', debuggee).then(
          () => debuggerAction('attach', debuggee, PROTOCOL_VERSION),
          () => { throw e }
        )
      }))
      .then(() => setState({ connected: debuggee }))
    }
    const detach = (debuggee) => {
      if (!debuggee)  return Promise.resolve()

      return debuggerAction('detach', debuggee)
      .then(() => {
        if (state.cleanupTimer) clearTimeout(state.cleanupTimer)

        setState({
          connected: null,
          cleanupTimer: null
        })
      }, e => console.error('error in detach', e.stack))
    }
    const scheduleDetach = () => {
      const timer = setTimeout(() => detach(debuggee), cleanupTimeout)
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

    const once = () => new Promise((resolve, reject) => {
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

    // "Detached while handling command." (23 chats in the 09-09 proxy drop,
    // OPEN-ISSUES 44.3): the session died in the middle of a command. Two
    // causes, told apart by the tab: the command itself navigated the page
    // (the click landed — Chrome only lost the channel for the answer), or
    // DevTools / a dialog / another extension took the tab. Navigation is
    // treated as delivered (a replay would click AGAIN on the new page);
    // anything else gets one fresh attach and a replay.
    const tabId = debuggee && debuggee.tabId
    const tabState = () => (typeof tabId === 'number' ? Ext.tabs.get(tabId).catch(() => null) : Promise.resolve(null))
    return tabState().then(before => once().catch(e => {
      if (options.__retried || !DETACHED_RE.test(String(e && e.message))) throw e
      setState({ connected: null, cleanupTimer: null })
      return new Promise(r => setTimeout(r, 300)).then(tabState).then(after => {
        const navigated = !!(before && after && (after.url !== before.url || after.status === 'loading'))
        if (navigated) return true
        return run(debuggee, fn, { ...options, __retried: true })
      })
    }))
  }
  const DETACHED_RE = /Detached while handling command/i
  const ALREADY_ATTACHED_RE = /Another debugger is already attached/i
  // Whether OUR debugger session is attached to that tab right now (the idle
  // detach has not fired, the user has not cancelled it). Callers that must
  // know whether the NEXT attach will be a fresh one — and so raise Chrome's
  // "is debugging" infobar, which shrinks the viewport — ask this first.
  run.isAttached = (tabId) => !!(state.connected && state.connected.tabId === tabId)
  run.attachedTabId = () => (state.connected ? state.connected.tabId : null)
  run.detachNow = detachNow
  return run
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
