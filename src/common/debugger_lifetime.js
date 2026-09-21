// Only extension UI documents need a lifetime owner outside their document.
// Worker/background callers already outlive the panel and use their own timers.
export const DEBUGGER_LIFETIME_PORT = 'uiv_debugger_lifetime'

export function createDebuggerLifetimeClient (runtime) {
  let port = null, nextId = 0
  const pending = new Map()
  const connect = () => {
    if (port) return port
    const current = runtime.connect({ name: DEBUGGER_LIFETIME_PORT })
    port = current
    current.onMessage.addListener(message => {
      const request = pending.get(message.id)
      if (!request) return
      pending.delete(message.id)
      if (message.error) request.reject(new Error(message.error))
      else request.resolve()
    })
    current.onDisconnect.addListener(() => {
      // Read lastError so Chrome does not report an unchecked port failure.
      const reason = runtime.lastError && runtime.lastError.message
      if (port === current) port = null
      for (const request of pending.values()) request.reject(new Error(reason || 'Debugger lifetime connection closed'))
      pending.clear()
    })
    return current
  }
  return (method, debuggee, version) => new Promise((resolve, reject) => {
    const id = ++nextId
    try {
      const current = connect()
      pending.set(id, { resolve, reject })
      current.postMessage({ id, method, tabId: debuggee.tabId, version })
    } catch (error) { pending.delete(id); reject(error) }
  })
}

// Registered synchronously in the background, including on worker wakeup.
// All attach/detach operations and disconnect cleanup share the same queue:
// cleanup cannot run before an in-flight attach finishes and leave it orphaned.
export function bindDebuggerLifetimes (runtime, debuggerApi, report = console.warn) {
  const owners = new Map()
  let tail = Promise.resolve()
  const enqueue = fn => {
    const result = tail.then(fn)
    tail = result.catch(() => {})
    return result
  }
  if (debuggerApi.onDetach) debuggerApi.onDetach.addListener(source => owners.delete(source.tabId))
  runtime.onConnect.addListener(port => {
    if (port.name !== DEBUGGER_LIFETIME_PORT) return
    const sender = port.sender || {}
    if (sender.id !== runtime.id || !(sender.url || '').startsWith(runtime.getURL(''))) {
      port.disconnect()
      return
    }
    let closed = false
    const answer = message => { if (!closed) { try { port.postMessage(message) } catch (_) {} } }
    port.onMessage.addListener(message => {
      enqueue(async () => {
        if (closed) throw new Error('Debugger owner closed')
        if (!Number.isInteger(message.tabId) || message.tabId < 0 || !['attach', 'detach'].includes(message.method)) throw new Error('Invalid debugger lifetime request')
        const target = { tabId: message.tabId }
        const owner = owners.get(target.tabId)
        if (owner && owner !== port) throw new Error('This tab is controlled by another Ui.Vision panel. Finish its run before using this panel.')
        if (message.method === 'attach') {
          await debuggerApi.attach(target, message.version)
          owners.set(target.tabId, port)
        } else {
          await debuggerApi.detach(target)
          if (owners.get(target.tabId) === port) owners.delete(target.tabId)
        }
      }).then(() => answer({ id: message.id }), error => answer({ id: message.id, error: error.message || String(error) }))
    })
    port.onDisconnect.addListener(() => {
      closed = true
      enqueue(async () => {
        for (const [tabId, owner] of owners) {
          if (owner !== port) continue
          try { await debuggerApi.detach({ tabId }) }
          catch (error) { report('Debugger cleanup after panel close: ' + String(error)) }
          finally { if (owners.get(tabId) === port) owners.delete(tabId) }
        }
      }).catch(report)
    })
  })
}
