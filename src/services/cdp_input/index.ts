import Ext from '@/common/web_extension'
// @ts-ignore -- plain JS module without type declarations
import { withDebugger } from '@/common/debugger'
import { MouseButton, MouseEventType, MouseEvent } from '@/services/xy'

// Dispatches trusted mouse input to a tab via the Chrome DevTools Protocol
// (chrome.debugger + Input.dispatchMouseEvent) — same primitives Puppeteer and
// "Claude for Chrome" use. Used by the BClick/BMove commands, so browser-scope
// clicks need no XModule install. Coordinates are CSS pixels relative to the
// page viewport of the target tab (no screen/DPI conversion involved).

// Keep the debugger attached for a while after each event so consecutive
// B-commands in a macro reuse one attachment (avoids re-attach latency and
// infobar flicker). withDebugger cancels the cleanup when reused in time.
const DETACH_AFTER_IDLE_MS = 3000

// CDP Input.dispatchMouseEvent modifier bitmask
const MODIFIER_CTRL = 2
const MODIFIER_SHIFT = 8

const CDP_BUTTON_NAME: Record<MouseButton, string> = {
  [MouseButton.Left]: 'left',
  [MouseButton.Right]: 'right',
  [MouseButton.Middle]: 'middle'
}

type CdpMouseEventParams = {
  type: 'mouseMoved' | 'mousePressed' | 'mouseReleased';
  x: number;
  y: number;
  button: string;
  buttons?: number;
  clickCount?: number;
  modifiers?: number;
}

// Whether a #down left-button press is still held (drag in progress). Needed
// because drag targets (sliders etc.) only follow `mousemove` events that carry
// the pressed-buttons state — an OS cursor does this physically, CDP must say
// it explicitly (`buttons: 1`). Tracked across commands: BMove|a,b|#down ...
// BMove|x,y|#up is the documented drag idiom.
const dragState = { leftButtonHeld: false }

const buildEventSequence = (event: MouseEvent): CdpMouseEventParams[] => {
  const { x, y } = event
  const button = CDP_BUTTON_NAME[event.button] || 'left'
  const move: CdpMouseEventParams = dragState.leftButtonHeld
    ? { type: 'mouseMoved', x, y, button: 'left', buttons: 1 }
    : { type: 'mouseMoved', x, y, button: 'none' }
  const clickPair = (clickCount: number, modifiers?: number): CdpMouseEventParams[] => [
    { type: 'mousePressed', x, y, button, clickCount, modifiers },
    { type: 'mouseReleased', x, y, button, clickCount, modifiers }
  ]

  switch (event.type) {
    case MouseEventType.Move:
      return [move]
    case MouseEventType.Down:
      dragState.leftButtonHeld = true
      return [move, { type: 'mousePressed', x, y, button, clickCount: 1 }]
    case MouseEventType.Up:
      dragState.leftButtonHeld = false
      // Move to the release point with the button still held so drag targets
      // (e.g. range sliders) track the motion, then release there
      return [
        { type: 'mouseMoved', x, y, button: 'left', buttons: 1 },
        { type: 'mouseReleased', x, y, button, clickCount: 1 }
      ]
    case MouseEventType.Click:
      dragState.leftButtonHeld = false
      return [move, ...clickPair(1)]
    case MouseEventType.DoubleClick:
      dragState.leftButtonHeld = false
      return [move, ...clickPair(1), ...clickPair(2)]
    case MouseEventType.TripleClick:
      dragState.leftButtonHeld = false
      return [move, ...clickPair(1), ...clickPair(2), ...clickPair(3)]
    case MouseEventType.CtrlClick:
      dragState.leftButtonHeld = false
      return [move, ...clickPair(1, MODIFIER_CTRL)]
    case MouseEventType.ShiftClick:
      dragState.leftButtonHeld = false
      return [move, ...clickPair(1, MODIFIER_SHIFT)]
    default:
      throw new Error(`E330: Unsupported mouse event type for browser input: ${event.type}`)
  }
}

// --- Keyboard (BType) ---

type KeyDef = {
  key: string;
  code: string;
  keyCode: number;
  text?: string;
}

// ${KEY_*} tokens supported by XType, mapped to CDP dispatchKeyEvent params.
// OS-level keys (KEY_WIN alone, Alt+Tab etc.) cannot work via CDP — browser only.
const KEY_DEFINITIONS: Record<string, KeyDef> = {
  KEY_ENTER:     { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
  KEY_TAB:       { key: 'Tab', code: 'Tab', keyCode: 9 },
  KEY_ESC:       { key: 'Escape', code: 'Escape', keyCode: 27 },
  KEY_SPACE:     { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
  KEY_HOME:      { key: 'Home', code: 'Home', keyCode: 36 },
  KEY_END:       { key: 'End', code: 'End', keyCode: 35 },
  KEY_LEFT:      { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  KEY_UP:        { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  KEY_RIGHT:     { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  KEY_DOWN:      { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  KEY_PGUP:      { key: 'PageUp', code: 'PageUp', keyCode: 33 },
  KEY_PAGE_UP:   { key: 'PageUp', code: 'PageUp', keyCode: 33 },
  KEY_PGDN:      { key: 'PageDown', code: 'PageDown', keyCode: 34 },
  KEY_PAGE_DOWN: { key: 'PageDown', code: 'PageDown', keyCode: 34 },
  KEY_BKSP:      { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  KEY_BACKSPACE: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  KEY_DEL:       { key: 'Delete', code: 'Delete', keyCode: 46 },
  KEY_DELETE:    { key: 'Delete', code: 'Delete', keyCode: 46 }
}

// F1..F15
for (let i = 1; i <= 15; i++) {
  KEY_DEFINITIONS[`KEY_F${i}`] = { key: `F${i}`, code: `F${i}`, keyCode: 111 + i }
}
// KEY_A..KEY_Z, KEY_0..KEY_9, KEY_Num0..KEY_Num9
for (let c = 65; c <= 90; c++) {
  const ch = String.fromCharCode(c)
  KEY_DEFINITIONS[`KEY_${ch}`] = { key: ch.toLowerCase(), code: `Key${ch}`, keyCode: c, text: ch.toLowerCase() }
}
for (let d = 0; d <= 9; d++) {
  KEY_DEFINITIONS[`KEY_${d}`] = { key: String(d), code: `Digit${d}`, keyCode: 48 + d, text: String(d) }
  KEY_DEFINITIONS[`KEY_NUM${d}`] = { key: String(d), code: `Numpad${d}`, keyCode: 96 + d, text: String(d) }
}

const MODIFIER_KEYS: Record<string, { name: string; bit: number; keyCode: number; code: string }> = {
  KEY_CTRL:  { name: 'Control', bit: 2, keyCode: 17, code: 'ControlLeft' },
  KEY_ALT:   { name: 'Alt', bit: 1, keyCode: 18, code: 'AltLeft' },
  KEY_SHIFT: { name: 'Shift', bit: 8, keyCode: 16, code: 'ShiftLeft' },
  KEY_WIN:   { name: 'Meta', bit: 4, keyCode: 91, code: 'MetaLeft' },
  KEY_CMD:   { name: 'Meta', bit: 4, keyCode: 91, code: 'MetaLeft' },
  KEY_META:  { name: 'Meta', bit: 4, keyCode: 91, code: 'MetaLeft' }
}

type CdpKeyEventParams = Record<string, any>

const charEvents = (ch: string): CdpKeyEventParams[] => {
  const upper = ch.toUpperCase()
  const isLetterOrDigit = /^[a-zA-Z0-9]$/.test(ch)

  const base: CdpKeyEventParams = {
    key: ch,
    text: ch,
    unmodifiedText: ch,
    ...(isLetterOrDigit ? { windowsVirtualKeyCode: upper.charCodeAt(0), nativeVirtualKeyCode: upper.charCodeAt(0) } : {})
  }

  return [
    { ...base, type: 'keyDown' },
    { ...base, type: 'keyUp', text: undefined, unmodifiedText: undefined }
  ]
}

const specialKeyEvents = (def: KeyDef, modifiers = 0): CdpKeyEventParams[] => {
  const base: CdpKeyEventParams = {
    key: def.key,
    code: def.code,
    windowsVirtualKeyCode: def.keyCode,
    nativeVirtualKeyCode: def.keyCode,
    modifiers
  }
  return [
    { ...base, type: 'keyDown', ...(def.text ? { text: def.text, unmodifiedText: def.text } : {}) },
    { ...base, type: 'keyUp' }
  ]
}

// Handles single tokens (KEY_ENTER) and combos (KEY_CTRL+KEY_A):
// modifiers go down first, then the main key with the modifier bitmask, then up in reverse
const keyTokenEvents = (token: string): CdpKeyEventParams[] => {
  const parts = token.toUpperCase().split('+')
  const modifierParts = parts.filter(p => MODIFIER_KEYS[p])
  const mainParts = parts.filter(p => !MODIFIER_KEYS[p])
  const modifierBits = modifierParts.reduce((bits, p) => bits | MODIFIER_KEYS[p].bit, 0)

  const downs: CdpKeyEventParams[] = []
  const ups: CdpKeyEventParams[] = []

  modifierParts.forEach((p, i) => {
    const mod = MODIFIER_KEYS[p]
    const bitsSoFar = modifierParts.slice(0, i + 1).reduce((bits, q) => bits | MODIFIER_KEYS[q].bit, 0)
    downs.push({ type: 'keyDown', key: mod.name, code: mod.code, windowsVirtualKeyCode: mod.keyCode, nativeVirtualKeyCode: mod.keyCode, modifiers: bitsSoFar })
    ups.unshift({ type: 'keyUp', key: mod.name, code: mod.code, windowsVirtualKeyCode: mod.keyCode, nativeVirtualKeyCode: mod.keyCode, modifiers: modifierParts.slice(0, i).reduce((bits, q) => bits | MODIFIER_KEYS[q].bit, 0) })
  })

  const mains = mainParts.reduce((events: CdpKeyEventParams[], p) => {
    const def = KEY_DEFINITIONS[p]
    if (!def) throw new Error(`E336: BType: unsupported key '\${${p}}' for browser input`)
    // Inside a modifier combo, do not send the printable text (Ctrl+A must
    // select all, not type the letter "a")
    const defForCombo = modifierBits ? { ...def, text: undefined } : def
    return events.concat(specialKeyEvents(defForCombo, modifierBits))
  }, [])

  return [...downs, ...mains, ...ups]
}

// Splits an XType-style text into events: plain characters are typed one by
// one; ${KEY_*} and ${KEY_X+KEY_Y} tokens become special-key sequences
export const buildTypeEventSequence = (text: string): CdpKeyEventParams[] => {
  const tokenReg = /\$\{(KEY_[a-zA-Z0-9_+]+)\}/g
  const events: CdpKeyEventParams[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const pushChars = (str: string) => {
    for (const ch of str) {
      events.push(...charEvents(ch))
    }
  }

  // eslint-disable-next-line no-cond-assign
  while (match = tokenReg.exec(text)) {
    pushChars(text.slice(lastIndex, match.index))
    events.push(...keyTokenEvents(match[1]))
    lastIndex = match.index + match[0].length
  }
  pushChars(text.slice(lastIndex))

  return events
}

// The web_extension adapter always creates Ext.debugger as an object, but on
// Firefox it stays an empty stub (no chrome.debugger API) — so a truthiness
// check passes and the crash surfaces later as "debugger.onDetach is
// undefined". Check for the actual method instead.
// Whether trusted CDP input exists at all — Firefox never provides the
// debugger API. Callers with an OS-input alternative (the XModule) can route
// around the B commands up front instead of failing with E331 (the
// computer-use agent does this: on Firefox its browser-scope actions run as
// XClick/XType).
export const isCdpInputAvailable = (): boolean =>
  !!(Ext.debugger && typeof (Ext.debugger as any).attach === 'function')

const ensureDebuggerApi = (commands: string, alternative: string) => {
  if (isCdpInputAvailable()) return

  if (Ext.isFirefox()) {
    throw new Error(`E331: ${commands} not supported by Firefox at the moment — Firefox does not provide the debugger API to extensions. Use ${alternative} instead`)
  }
  throw new Error(`E331: ${commands} require the debugger API (Chrome/Edge only)`)
}

export const sendCdpTypeText = (tabId: number, text: string): Promise<boolean> => {
  ensureDebuggerApi('BType is', 'XType (XModule)')
  if (typeof tabId !== 'number') {
    throw new Error('E332: BType: no tab to play in')
  }

  const events = buildTypeEventSequence(text)

  return withDebugger(
    { tabId },
    (api: any) => {
      const dispatchAll = events.reduce(
        (prev: Promise<any>, params: CdpKeyEventParams) => prev.then(() => api.sendCommand('Input.dispatchKeyEvent', params)),
        Promise.resolve()
      )

      return dispatchAll.then(
        () => api.done(null, true),
        (e: Error) => api.done(e)
      )
    },
    { cleanupTimeout: DETACH_AFTER_IDLE_MS }
  )
}

export const sendCdpMouseEvent = (tabId: number, event: MouseEvent): Promise<boolean> => {
  ensureDebuggerApi('BClick/BMove commands are', 'XClick/XClickText (XModule) or DOM commands (Click, ClickAt)')
  if (typeof tabId !== 'number') {
    throw new Error('E332: BClick/BMove: no tab to play in')
  }

  const events = buildEventSequence(event)

  return withDebugger(
    { tabId },
    (api: any) => {
      const dispatchAll = events.reduce(
        (prev: Promise<any>, params: CdpMouseEventParams) => prev.then(() => api.sendCommand('Input.dispatchMouseEvent', params)),
        Promise.resolve()
      )

      return dispatchAll.then(
        () => api.done(null, true),
        (e: Error) => api.done(e)
      )
    },
    { cleanupTimeout: DETACH_AFTER_IDLE_MS }
  )
}

// The screen-origin calibration probe (see run_command's getViewportRectInScreen).
//
// The sampler that measures the origin is a mousemove listener on the play
// tab's TOP document, and a plugin-hosted viewport swallows the probe: Chrome's
// built-in PDF viewer fills the page with an <embed> that is an OUT-OF-PROCESS
// frame, so a CDP mouse move over it is routed to that frame and the top
// document never sees the event. Measured 2026-08-09 on
// download.ui.vision/demo/pdf-test.pdf, side panel docked left: the probe never
// produced a measurement, the derived fallback came out 378px wrong in x (the
// panel's width, which screenLeft + 8 knows nothing about) and 275px in y, and
// the FIRST browser-scope XClick on every freshly loaded PDF landed there. The
// second one was always right — the mis-aimed OS mouse move the first click
// performs generates a real trusted mousemove, which calibrates it. Reloading
// the PDF without moving the mouse reproduced the miss every time, while the
// identical sequence on an ordinary HTML page measured correctly.
//
// So give the top document something of its own to be hit: a transparent
// full-viewport overlay, added and removed inside the SAME debugger session as
// the move, so the hit test resolves in the top frame. On an ordinary page this
// changes nothing (the probe already worked there); on a plugin page it is the
// difference between a measured origin and a click hundreds of pixels away.
const PROBE_OVERLAY_ID = '__uivision_screen_origin_probe__'

// Resolves only once the overlay has been COMPOSITED and the viewport has
// stopped moving. Two separate reasons to wait, both measured:
//
// (1) Hit-testing does not consult the DOM — it runs in the browser process
//     against the last committed compositor frame — so a move dispatched in the
//     same tick as the insert is routed by the OLD hit-test data, straight back
//     into the plugin frame. That defeated the first version of this fix: the
//     overlay was in the DOM, the move ignored it. Hence the animation frames.
//
// (2) Attaching the debugger raises Chrome's "is debugging" infobar, which
//     pushes the page down ~56px and shrinks innerHeight — and during that
//     animation the event's own coordinates and window.innerHeight update at
//     DIFFERENT moments. A sample taken mid-transition pairs an already-shifted
//     oy with a stale innerHeight, and GET_VIEWPORT_RECT_IN_SCREEN's barShift
//     correction then double-counts the bar. Measured 2026-08-09 on one page
//     nobody touched: origin y of 254 during the animation, then 201 with the
//     bar up and 145 with it gone — 254 is 201 plus one whole bar height, and a
//     click aimed with it lands a bar height away. So wait for innerHeight to
//     hold still before letting the probe's event be dispatched; once the
//     SAMPLE is clean, later reads self-correct as the bar comes and goes.
//
// Capped, because a page that resizes continuously (an animating layout) would
// otherwise never settle — a late probe still beats no probe.
const ADD_PROBE_OVERLAY = `new Promise(function (resolve) {
  var d = document.getElementById(${JSON.stringify(PROBE_OVERLAY_ID)});
  if (!d) {
    d = document.createElement('div');
    d.id = ${JSON.stringify(PROBE_OVERLAY_ID)};
    d.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147483647;background:transparent;pointer-events:auto';
    (document.body || document.documentElement).appendChild(d);
  }
  var last = -1, stable = 0, waited = 0;
  (function settle () {
    var h = window.innerHeight;
    stable = h === last ? stable + 1 : 0;
    last = h;
    if (stable >= 3 || waited >= 1500) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { resolve(true) });
      });
      return;
    }
    waited += 60;
    setTimeout(settle, 60);
  })();
})`

const REMOVE_PROBE_OVERLAY = `(function () {
  var d = document.getElementById(${JSON.stringify(PROBE_OVERLAY_ID)});
  if (d && d.parentNode) d.parentNode.removeChild(d);
  return true;
})()`

export const calibrateScreenOriginViaCdp = (tabId: number): Promise<boolean> => {
  ensureDebuggerApi('the screen-origin probe is', 'XClick with the mouse already over the page')
  if (typeof tabId !== 'number') return Promise.resolve(false)

  return withDebugger(
    { tabId },
    (api: any) => {
      const evaluate = (expression: string, awaitPromise = false) =>
        api.sendCommand('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
      // The overlay must come down even if the move throws — a page left with
      // an invisible full-viewport div would swallow every later click, a far
      // worse bug than the one this fixes.
      const takeDown = (finish: () => any) => evaluate(REMOVE_PROBE_OVERLAY).then(finish, finish)

      // TWO moves at different points: a mousemove to the position the pointer
      // is already at can be coalesced away, and the sampler only needs one
      // event to fire — whichever of the two lands is enough.
      return evaluate(ADD_PROBE_OVERLAY, true)
        .then(() => api.sendCommand('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: 1,
          y: 1,
          button: 'none'
        }))
        .then(() => api.sendCommand('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: 12,
          y: 12,
          button: 'none'
        }))
        .then(
          () => takeDown(() => api.done(null, true)),
          (e: Error) => takeDown(() => api.done(e))
        )
    },
    { cleanupTimeout: DETACH_AFTER_IDLE_MS }
  )
}
