import { hmacSha256Hex, randomHex, digestsEqual } from './hmac_sha256.js'

// Request/reply over window.postMessage.
//
// Two channels share this transport:
//
// 1. Between content scripts of different frames in one tab (RUN_COMMAND into
//    a selected frame, IPC_CALL bubbling up to the top frame, SET_STATUS
//    broadcasts, frame offsets). Those windows are cross-origin, so
//    postMessage is the only way to reach them.
// 2. From a content script to inject.js in its own window (INJECT_RUN_EVAL).
//
// Everything a window receives is visible to every script in that window, and
// any window that holds a reference to another (a third-party iframe on the
// page, the opener) can post to it. So a request has to carry proof that a
// content script sent it, and that proof must be something the pages cannot
// reuse — a shared secret sent along would leak to the receiving page at the
// first message (OPEN-ISSUES 64, reported 2026-09).
//
// Channel 1: every content script fetches the extension's channel key from the
// background at startup (never through a window message) and signs each
// request with HMAC-SHA256 over the request id, a fresh nonce, a timestamp,
// the receiver's frame path and the payload. The receiver verifies the
// signature, that the path is its own (a message captured in one frame cannot
// be replayed into another), that the nonce is new and the timestamp recent.
//
// Channel 2: the receiver is page code and holds no key. It accepts only
// requests whose source is its own window — a page can already run anything
// in its own origin, other windows cannot. Requests to the own window are
// therefore sent unsigned, which also keeps the key out of the page's sight.
//
// Replies carry only the request id; the requester takes a reply from the
// window it addressed and ignores all others.

const TYPE           = 'SELENIUM_IDE_CS_MSG'
const AUTH_WINDOW_MS = 2 * 60 * 1000
const SEEN_NONCE_MAX = 5000

let keySource  = null   // () => Promise<string>
let keyPromise = null   // memoised success only

// Content scripts call this once at startup with a function that asks the
// background for the key (retrying while the background wakes). Contexts that
// never set a source — inject.js, extension pages — cannot send or accept
// signed requests.
export const setChannelKeySource = (fn) => {
  keySource  = fn
  keyPromise = null
}

const getChannelKey = () => {
  if (keyPromise) return keyPromise
  if (!keySource) return Promise.reject(new Error('E354: csPostMessage: no channel key in this context'))

  const p = Promise.resolve().then(keySource).then(key => {
    if (typeof key !== 'string' || !key) throw new Error('E355: csPostMessage: channel key not available')
    return key
  })
  p.catch(() => { if (keyPromise === p) keyPromise = null })
  keyPromise = p
  return p
}

// Position of a window in the tab's frame tree: its index in each ancestor's
// frame list, top first, as "1.0.2" ('' for the top window). `parent`,
// `top`, `length` and indexed access are on the cross-origin allowlist, so a
// sender can compute this for any window in the tab, not only its own.
export const framePath = (win) => {
  const path = []
  let w = win

  while (w && w !== w.top) {
    const parent = w.parent
    if (!parent || parent === w) break

    let index = -1
    for (let i = 0, n = parent.length; i < n; i++) {
      if (parent[i] === w) { index = i; break }
    }
    path.unshift(index)
    w = parent
  }

  return path.join('.')
}

const sign = (key, id, auth, payload) => {
  return hmacSha256Hex(key, JSON.stringify([id, auth.nonce, auth.ts, auth.path, payload]))
}

const seenNonces = new Set()

const rememberNonce = (nonce) => {
  if (seenNonces.size >= SEEN_NONCE_MAX) seenNonces.clear()
  seenNonces.add(nonce)
}

const verify = (key, data, win) => {
  const auth = data.auth
  if (!auth || typeof auth !== 'object') return false
  if (typeof auth.nonce !== 'string' || typeof auth.mac !== 'string' ||
      typeof auth.ts !== 'number' || typeof auth.path !== 'string') return false
  if (Math.abs(Date.now() - auth.ts) > AUTH_WINDOW_MS) return false
  if (auth.path !== framePath(win)) return false
  if (seenNonces.has(auth.nonce)) return false
  if (!digestsEqual(sign(key, data.id, auth, data.payload), auth.mac)) return false

  rememberNonce(auth.nonce)
  return true
}

export const postMessage = (targetWin, myWin, payload, target = '*', timeout = 60000) => {
  return new Promise((resolve, reject) => {
    if (!targetWin || !targetWin.postMessage) {
      throw new Error('E350: csPostMessage: targetWin is not a window')
    }

    if (!myWin || !myWin.addEventListener || !myWin.removeEventListener) {
      throw new Error('E351: csPostMessage: myWin is not a window')
    }

    const id = randomHex(16)
    let timer

    const cleanup = () => {
      myWin.removeEventListener('message', onMsg)
      clearTimeout(timer)
    }

    // Note: one listener per request, matched by id and by the window asked
    const onMsg = (e) => {
      const d = e.data
      if (!d || d.type !== TYPE || d.isRequest || d.id !== id) return
      if (e.source !== targetWin) return

      cleanup()

      if (d.error)                  return reject(new Error(d.error))
      if (d.payload !== undefined)  return resolve(d.payload)

      reject(new Error('E352: csPostMessage: No payload nor error found'))
    }

    myWin.addEventListener('message', onMsg)

    timer = setTimeout(() => {
      cleanup()
      reject(new Error(`E353: csPostMessage: timeout ${timeout} ms`))
    }, timeout)

    const pAuth = targetWin === myWin
      ? Promise.resolve(null)
      : getChannelKey().then(key => {
          const auth = { nonce: randomHex(16), ts: Date.now(), path: framePath(targetWin) }
          auth.mac   = sign(key, id, auth, payload)
          return auth
        })

    pAuth.then(auth => {
      const msg = { type: TYPE, id, isRequest: true, payload }
      if (auth) msg.auth = auth
      targetWin.postMessage(msg, target)
    }, err => {
      cleanup()
      reject(err)
    })
  })
}

const isRequest = (d) => !!d && d.type === TYPE && d.isRequest === true && typeof d.id === 'string'

const reply = (source, id, body) => {
  try {
    source.postMessage({ type: TYPE, id, isRequest: false, ...body }, '*')
  } catch (e) { /* source window gone */ }
}

// Note: wrapped with a new Promise to catch any exception during the execution of fn.
// Only a value other than undefined is answered — several listeners may share
// one window, each taking the requests it cares about.
const handle = (e, fn) => {
  const { id, payload } = e.data
  const source = e.source

  new Promise((resolve, reject) => {
    let ret

    try {
      ret = fn(payload, { source })
    } catch (err) {
      reject(err)
    }

    if (ret !== undefined) resolve(ret)
  })
  .then(
    (res) => reply(source, id, { payload: res }),
    (err) => reply(source, id, { error: err.message })
  )
}

// Signed requests from other frames' content scripts (channel 1). A request
// that arrives before the key has been fetched waits for it.
export const onMessage = (win, fn) => {
  if (!win || !win.addEventListener || !win.removeEventListener) {
    throw new Error('csOnMessage: not a window')
  }

  const onMsg = (e) => {
    if (!isRequest(e.data) || !e.data.auth) return

    getChannelKey().then(key => {
      if (!verify(key, e.data, win)) return
      handle(e, fn)
    }, () => {})
  }

  win.addEventListener('message', onMsg)
  return () => win.removeEventListener('message', onMsg)
}

// Requests from the same window only (channel 2, inject.js).
export const onSameWindowMessage = (win, fn) => {
  if (!win || !win.addEventListener || !win.removeEventListener) {
    throw new Error('csOnMessage: not a window')
  }

  const onMsg = (e) => {
    if (!isRequest(e.data)) return
    if (e.source !== win) return
    handle(e, fn)
  }

  win.addEventListener('message', onMsg)
  return () => win.removeEventListener('message', onMsg)
}
