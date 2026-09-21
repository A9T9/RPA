import Ext from '@/common/web_extension'
// @ts-ignore -- plain JS module without type declarations
import { withDebugger } from '@/common/debugger'
import { MouseButton, MouseEventType, MouseEvent, getNativeXYAPI } from '@/services/xy'
import { findBeaconRect } from '@/services/xy/beacon'

// Dispatches trusted mouse input to a tab via the Chrome DevTools Protocol
// (chrome.debugger + Input.dispatchMouseEvent) — same primitives Puppeteer and
// "Claude for Chrome" use. Used by the BClick/BMove commands, so browser-scope
// clicks need no XModule install. Coordinates are CSS pixels relative to the
// page viewport of the target tab (no screen/DPI conversion involved).

// Keep the debugger attached for a while after each event so consecutive
// B-commands in a macro reuse one attachment (avoids re-attach latency and
// infobar flicker). withDebugger cancels the cleanup when reused in time.
const DETACH_AFTER_IDLE_MS = 3000

// While a JS macro RUNS, the attachment is held instead: the 3s idle detach
// made Chrome's "is debugging" infobar come and go between commands, and
// every appearance shrinks the viewport by ~56px (every disappearance grows
// it back) — bottom-anchored page furniture, position:fixed overlays and
// the viewport-to-screen origin all moved under the macro's feet (measured
// live 2026-09-05: DesktopClickAccuracyRange built its range before the
// first trusted click, the bar then clipped its calibration pad away).
// One attach per run, released when the run ends (script_runner).
const HOLD_DURING_RUN_MS = 30 * 60 * 1000
let holdDuringRun = false
const detachTimeout = () => (holdDuringRun ? HOLD_DURING_RUN_MS : DETACH_AFTER_IDLE_MS)
export const holdCdpAttachDuringRun = (on: boolean): void => {
  holdDuringRun = !!on
  if (on) return
  // released: re-arm the short idle detach on whatever is still attached
  const tabId = typeof withDebugger.attachedTabId === 'function' ? withDebugger.attachedTabId() : null
  if (typeof tabId !== 'number') return
  withDebugger({ tabId }, (api: any) => api.done(null, true), { cleanupTimeout: DETACH_AFTER_IDLE_MS }).catch(() => {})
}

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
// Pointer state belongs to the tab, as it does to Playwright's page.mouse.
const pointerPositions = new Map<number, { x: number, y: number }>()
if (Ext.tabs && Ext.tabs.onRemoved) Ext.tabs.onRemoved.addListener((id: number) => pointerPositions.delete(id))

export const sendCdpWheelEvent = (tabId: number, deltaX: number, deltaY: number): Promise<boolean> => {
  ensureDebuggerApi('uiv.browser.mouse.wheel is', 'uiv.desktop.mouse.wheel (Desktop Automation app)')
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) throw new Error('mouse.wheel: deltaX and deltaY must be finite numbers')
  const point = pointerPositions.get(tabId) || { x: 0, y: 0 }
  return withDebugger({ tabId }, (api: any) => {
    api.sendCommand('Input.dispatchMouseEvent', {
      type: 'mouseWheel', ...point, deltaX, deltaY,
      button: 'none', buttons: dragState.leftButtonHeld ? 1 : 0, modifiers: heldModifiers(tabId)
    }).then(() => api.done(null, true), (e: Error) => api.done(e))
  }, { cleanupTimeout: detachTimeout() })
}

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
  // KEY_ARROW_* aliases — the names the AI keeps writing (OPEN-ISSUES 35.7)
  KEY_ARROW_LEFT:  { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  KEY_ARROW_UP:    { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  KEY_ARROW_RIGHT: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  KEY_ARROW_DOWN:  { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  KEY_PGUP:      { key: 'PageUp', code: 'PageUp', keyCode: 33 },
  KEY_PAGE_UP:   { key: 'PageUp', code: 'PageUp', keyCode: 33 },
  KEY_PGDN:      { key: 'PageDown', code: 'PageDown', keyCode: 34 },
  KEY_PAGE_DOWN: { key: 'PageDown', code: 'PageDown', keyCode: 34 },
  KEY_BKSP:      { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  KEY_BACKSPACE: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  KEY_DEL:       { key: 'Delete', code: 'Delete', keyCode: 46 },
  KEY_DELETE:    { key: 'Delete', code: 'Delete', keyCode: 46 },
  // punctuation (OPEN-ISSUES 24.5) — the same names the XModule host takes
  KEY_MINUS:     { key: '-', code: 'Minus', keyCode: 189, text: '-' },
  KEY_PLUS:      { key: '+', code: 'Equal', keyCode: 187, text: '+' },
  KEY_EQUALS:    { key: '=', code: 'Equal', keyCode: 187, text: '=' },
  KEY_EQUAL:     { key: '=', code: 'Equal', keyCode: 187, text: '=' },
  KEY_COMMA:     { key: ',', code: 'Comma', keyCode: 188, text: ',' },
  KEY_PERIOD:    { key: '.', code: 'Period', keyCode: 190, text: '.' },
  KEY_SEMICOLON: { key: ';', code: 'Semicolon', keyCode: 186, text: ';' },
  KEY_SLASH:     { key: '/', code: 'Slash', keyCode: 191, text: '/' },
  KEY_NUMPAD_ADD:      { key: '+', code: 'NumpadAdd', keyCode: 107, text: '+' },
  KEY_NUMPAD_SUBTRACT: { key: '-', code: 'NumpadSubtract', keyCode: 109, text: '-' },
  KEY_NUM_ADD:         { key: '+', code: 'NumpadAdd', keyCode: 107, text: '+' },
  KEY_NUM_SUBTRACT:    { key: '-', code: 'NumpadSubtract', keyCode: 109, text: '-' }
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

// macOS: Chrome does NOT run the editing shortcuts for a synthesized Cmd+key
// event by itself — Cmd+A via CDP moved the caret and left the field's text
// in place (measured live: DemoBrowserType typed "SeleniumRobotic process
// automation" into Wikipedia's search box). The renderer only performs
// these when the event names them in `commands` (the same trick
// Puppeteer/Playwright use for Meta shortcuts on mac). Windows/Linux need
// nothing: Ctrl+A is interpreted by the renderer from the key event alone.
const IS_MAC = /Mac|iPhone|iPad/.test((typeof navigator !== 'undefined' && navigator.platform) || '')
const MAC_META_COMMANDS: Record<string, string> = {
  KeyA: 'SelectAll', KeyC: 'Copy', KeyX: 'Cut', KeyV: 'Paste', KeyZ: 'Undo', KeyY: 'Redo'
}
const withEditingCommands = (ev: CdpKeyEventParams, def: KeyDef, modifierBits: number): CdpKeyEventParams => {
  if (!IS_MAC || !(modifierBits & 4)) return ev
  const code = def.code || (def.key && def.key.length === 1 ? 'Key' + def.key.toUpperCase() : '')
  const command = code === 'KeyZ' && (modifierBits & 8) ? 'Redo' : MAC_META_COMMANDS[code]
  return command ? { ...ev, commands: [command] } : ev
}

// Handles single tokens (KEY_ENTER) and combos (KEY_CTRL+KEY_A):
// modifiers go down first, then the main key with the modifier bitmask, then up in reverse
// Pressed keys belong to the tab and survive between calls until up() or
// end-of-run cleanup. Store only events that Chrome accepted.
type HeldKey = KeyDef & { modifier: number; raw: string; location?: number }
const heldKeys = new Map<number, Map<string, HeldKey>>()
const keyboardFocusTabs = new Set<number>()
const heldModifiers = (tabId: number): number =>
  Array.from((heldKeys.get(tabId) || new Map()).values()).reduce((bits, key) => bits | key.modifier, 0)
if (Ext.tabs && Ext.tabs.onRemoved) Ext.tabs.onRemoved.addListener((id: number) => { heldKeys.delete(id); keyboardFocusTabs.delete(id) })

const heldKeyDefinition = (raw: string): HeldKey => {
  const key = raw === 'ControlOrMeta' ? (IS_MAC ? 'Meta' : 'Control') : raw
  for (const mod of Object.values(MODIFIER_KEYS)) {
    if (key === mod.name || key === mod.code || key === mod.name + 'Right') {
      return {key:mod.name, code:key.endsWith('Right') ? mod.name+'Right' : mod.code,
        keyCode:mod.keyCode, modifier:mod.bit, raw, location:key.endsWith('Right') ? 2 : 1}
    }
  }
  const def = Object.values(KEY_DEFINITIONS).find(d => d.key === key || d.code === key)
  if (def) return {...def, modifier:0, raw}
  if (/^[A-Z]$/.test(key)) return {key, code:'Key'+key, keyCode:key.charCodeAt(0), text:key, modifier:0, raw}
  // US physical punctuation names and shifted characters, as in Playwright.
  const punctuation = [
    ['Backquote','~','\x60',192], ['Minus','_','-',189], ['Equal','+','=',187],
    ['BracketLeft','{','[',219], ['BracketRight','}',']',221], ['Backslash','|','\\',220],
    ['Semicolon',':',';',186], ['Quote','"',"'",222], ['Comma','<',',',188],
    ['Period','>','.',190], ['Slash','?','/',191]
  ] as const
  for (const [code, shifted, plain, keyCode] of punctuation) {
    if ([code, shifted, plain].includes(key as any)) {
      const value = key === code ? plain : key
      return {key:value,code,keyCode,text:value,modifier:0,raw}
    }
  }
  const shiftedDigit = ')!@#$%^&*('.indexOf(key)
  if (key.length === 1 && shiftedDigit >= 0) {
    return {key,code:'Digit'+shiftedDigit,keyCode:48+shiftedDigit,text:key,modifier:0,raw}
  }
  throw new Error("keyboard.down/up: unknown key '"+raw+"'; pass one Playwright key such as 'a', 'KeyW', 'ArrowDown', or 'Shift'")
}

export const sendCdpKeyEvent = (tabId: number, key: string, down: boolean): Promise<boolean> => {
  ensureDebuggerApi('uiv.browser.keyboard.down/up are', 'uiv.desktop.keyboard.down/up in the desktop app')
  if (typeof key !== 'string' || !key) throw new Error('keyboard.down/up: key must be a nonempty string')
  const def = heldKeyDefinition(key)
  const before = heldKeys.get(tabId) || new Map<string, HeldKey>()
  const next = new Map(before)
  if (down) next.set(def.code, def)
  else next.delete(def.code)
  const modifiers = Array.from(next.values()).reduce((bits, k) => bits | k.modifier, 0)
  let value = def.key
  if (modifiers & 8) {
    if (/^[a-z]$/.test(value)) value = value.toUpperCase()
    else {
      const plain = '0123456789\x60-=[]\\;\x27,./'
      const shifted = ')!@#$%^&*(~_+{}|:"<>?'
      const i = plain.indexOf(value)
      if (value.length === 1 && i >= 0) value = shifted[i]
    }
  }
  const text = down && def.text && !(modifiers & ~8) ? value : undefined
  const event = withEditingCommands({
    type:down ? (text ? 'keyDown' : 'rawKeyDown') : 'keyUp',
    key:value, code:def.code, windowsVirtualKeyCode:def.keyCode,
    nativeVirtualKeyCode:def.keyCode, modifiers,
    ...(def.location ? {location:def.location} : {}),
    ...(down ? {autoRepeat:before.has(def.code)} : {}),
    ...(text ? {text,unmodifiedText:def.text} : {})
  }, def, down ? modifiers : 0)
  return withDebugger({tabId}, (api:any) => {
    // Playwright enables focus emulation for its pages too. CDP can otherwise
    // acknowledge a key event without delivering it when another window has
    // focus. Restore the normal focus state when this macro ends.
    api.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: true }).then(() => {
      keyboardFocusTabs.add(tabId)
      return api.sendCommand('Input.dispatchKeyEvent', event)
    }).then(() => {
      if (next.size) heldKeys.set(tabId, next)
      else heldKeys.delete(tabId)
      api.done(null,true)
    }, (e:Error) => api.done(e))
  }, {cleanupTimeout:detachTimeout()})
}

export const releaseCdpKeys = async (): Promise<void> => {
  const failures: string[] = []
  for (const [tabId, keys] of Array.from(heldKeys.entries())) {
    for (const key of Array.from(keys.values()).reverse()) {
      try { await sendCdpKeyEvent(tabId, key.raw, false) }
      catch (e) { failures.push(String(e)) }
    }
  }
  for (const tabId of Array.from(keyboardFocusTabs)) {
    try {
      await withDebugger({tabId}, (api:any) => {
        api.sendCommand('Emulation.setFocusEmulationEnabled', {enabled:false})
          .then(() => api.done(null,true), (e:Error) => api.done(e))
      }, {cleanupTimeout:detachTimeout()})
      keyboardFocusTabs.delete(tabId)
    } catch (e) { failures.push(String(e)) }
  }
  if (failures.length) throw new Error('Could not release held browser keys: '+failures.join('; '))
}

const keyTokenEvents = (token: string): CdpKeyEventParams[] => {
  // a literal '+' as the last member arrives as a trailing "++" (24.5)
  const rawParts = token.replace(/\+\+$/, '+\u0001').split('+').map(p => (p === '\u0001' ? '+' : p))
  const parts = rawParts.map(p => (p.length === 1 ? p : p.toUpperCase()))
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
    // one literal printable character as the key: ${KEY_CTRL+-} (24.5)
    const def = KEY_DEFINITIONS[p] || (p.length === 1 && !/\s/.test(p)
      ? { key: p, code: '', keyCode: p.toUpperCase().charCodeAt(0), text: p }
      : undefined)
    if (!def) throw new Error(`E336: BType: unsupported key '\${${p}}' for browser input`)
    // Inside a modifier combo, do not send the printable text (Ctrl+A must
    // select all, not type the letter "a")
    const defForCombo = modifierBits ? { ...def, text: undefined } : def
    return events.concat(specialKeyEvents(defForCombo, modifierBits).map(ev =>
      ev.type === 'keyDown' ? withEditingCommands(ev, def, modifierBits) : ev))
  }, [])

  return [...downs, ...mains, ...ups]
}

// Splits an XType-style text into events: plain characters are typed one by
// one; ${KEY_*} and ${KEY_X+KEY_Y} tokens become special-key sequences
export const buildTypeEventSequence = (text: string): CdpKeyEventParams[] => {
  // the last member may be a literal character (${KEY_CTRL+-}, ${KEY_CTRL+=})
  const tokenReg = /\$\{(KEY_[a-zA-Z0-9_+]+(?:\+[^\s}])?)\}/g
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
  ensureDebuggerApi(
    'BType (uiv.browser.type) is',
    'uiv.page.fill() or uiv.desktop.keyboard.type() in a JS script — XType (XModule) or the Type command in a command table'
  )
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
    { cleanupTimeout: detachTimeout() }
  )
}

// Page JavaScript through the debugger session. Runtime.evaluate is not bound
// by the page's Content-Security-Policy, so it runs where the content
// script's string eval is refused (chatgpt.com, Stripe checkouts, most banks
// — 25 conversations in the 09-09 proxy drop, OPEN-ISSUES 44.4). The code is
// the classic executeScript body ("return document.title"), so it is wrapped
// in a function; a thrown exception comes back as the same "Error in
// executeScript code" shape the content-script path produces. Chromium only.
export const cdpEvaluate = (tabId: number, code: string): Promise<any> => {
  ensureDebuggerApi('uiv.evaluate on a page whose CSP forbids eval is', 'uiv.$ / uiv.page.* to read and act on the DOM')
  if (typeof tabId !== 'number') {
    throw new Error('E332: uiv.evaluate: no tab to play in')
  }
  const expression = `(function () {\n${code}\n})()`
  return withDebugger(
    { tabId },
    (api: any) => {
      api.sendCommand('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }).then(
        (res: any) => {
          const ex = res && res.exceptionDetails
          if (ex) {
            const msg = (ex.exception && (ex.exception.description || ex.exception.value)) || ex.text || 'exception'
            return api.done(new Error(`Error in executeScript code: ${String(msg).split('\n')[0]}`))
          }
          api.done(null, res && res.result ? res.result.value : undefined)
        },
        (e: Error) => api.done(e)
      )
    },
    { cleanupTimeout: detachTimeout() }
  )
}

export const sendCdpMouseEvent = (tabId: number, event: MouseEvent): Promise<boolean> => {
  ensureDebuggerApi(
    'BClick/BMove (uiv.browser.click / uiv.browser.hover) are',
    'uiv.page.click() or uiv.desktop.mouse.click() in a JS script — XClick/XClickText (XModule) or Click/ClickAt in a command table'
  )
  if (typeof tabId !== 'number') {
    throw new Error('E332: BClick/BMove: no tab to play in')
  }

  const events = buildEventSequence(event)

  return withDebugger(
    { tabId },
    (api: any) => {
      const dispatchAll = events.reduce(
        (prev: Promise<any>, params: CdpMouseEventParams) => prev.then(() => api.sendCommand('Input.dispatchMouseEvent', { ...params, modifiers: (params.modifiers || 0) | heldModifiers(tabId) })),
        Promise.resolve()
      )

      return dispatchAll.then(
        () => { pointerPositions.set(tabId, { x: event.x, y: event.y }); api.done(null, true) },
        (e: Error) => api.done(e)
      )
    },
    { cleanupTimeout: detachTimeout() }
  )
}

// Attach the debugger BEFORE a visual match's coordinates are consumed.
//
// The first CDP event on a tab attaches the debugger, and Chrome's "is
// debugging" infobar then shrinks the viewport by its height — AFTER the
// finder took its screenshot. Bottom-anchored page furniture moves up under
// the click: measured live 2026-09-05 (Linux) on DemoBrowserClick — the
// sketch.io + button found at viewport y=620 got the folder icon one slot
// below on every run, and the XClick twin had the same miss on macOS before
// its calibration move. The fix is not a coordinate correction (top-anchored
// targets do NOT move, centered ones move half a bar) but a RE-FIND once the
// viewport has settled — script_runner's settleVisualPointForCdp does that,
// and this is the attach-and-settle half of it. Returns whether the attach
// was fresh (an already attached session cannot have moved anything) and the
// settled innerHeight, so the caller can compare it with the pre-attach one.
const SETTLE_INNER_HEIGHT = `new Promise(function (resolve) {
  var last = -1, stable = 0, waited = 0;
  (function settle () {
    var h = window.innerHeight;
    stable = h === last ? stable + 1 : 0;
    last = h;
    if (stable >= 3 || waited >= 1500) { resolve(h); return; }
    waited += 60;
    setTimeout(settle, 60);
  })();
})`

// Whether the next CDP event on that tab will be a FRESH attach (and so raise
// the infobar) — the runner's raw-point settle asks before it spends a
// content-script round trip on resolving the point.
export const isCdpAttached = (tabId: number): boolean => !!withDebugger.isAttached(tabId)

export const primeCdpAttach = (tabId: number): Promise<{ fresh: boolean, innerHeight: number | null }> => {
  const fresh = !withDebugger.isAttached(tabId)
  return withDebugger(
    { tabId },
    (api: any) => {
      api.sendCommand('Runtime.evaluate', { expression: SETTLE_INNER_HEIGHT, awaitPromise: true, returnByValue: true }).then(
        (r: any) => api.done(null, { fresh, innerHeight: r && r.result && typeof r.result.value === 'number' ? r.result.value : null }),
        () => api.done(null, { fresh, innerHeight: null })
      )
    },
    { cleanupTimeout: detachTimeout() }
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


// Wayland: window.screenX and every event.screenX are anchored to a window
// position the compositor never reveals (both read as if the window sat at
// 0,0) — measured live as a CONSTANT dx=-47 dy=-30 CSS px miss on every
// XClick. The only truthful source is VISUAL: render a beacon at the
// viewport's top-RIGHT corner (the left half is what other windows usually
// cover), have the native host locate its exact-color rectangle on the real
// screen, and derive the absolute viewport origin from the beacon's right
// edge. Cached briefly — one measurement serves a burst of clicks.
const BEACON_ID = '__uiv_origin_probe'
const BEACON_COLOR = '#fe3a9c'
let beaconCache: { at: number, key: string, origin: { x: number, y: number } } | null = null

export const measureViewportOriginViaBeacon = (tabId: number): Promise<{ x: number, y: number } | null> => {
  if (typeof tabId !== 'number') return Promise.resolve(null)

  const ADD = `(function () {
    var b = document.getElementById(${JSON.stringify(BEACON_ID)});
    if (!b) {
      b = document.createElement('div');
      b.id = ${JSON.stringify(BEACON_ID)};
      (document.body || document.documentElement).appendChild(b);
    }
    b.style.cssText = 'position:fixed;right:0;top:12px;width:140px;height:36px;background:${BEACON_COLOR};z-index:2147483647;margin:0;padding:0;border:0;pointer-events:none';
    var r = b.getBoundingClientRect();
    return JSON.stringify({ bx: r.left, by: r.top, iw: window.innerWidth, sl: window.screenLeft, st: window.screenTop, dpr: window.devicePixelRatio });
  })()`
  const REMOVE = `(function () {
    var b = document.getElementById(${JSON.stringify(BEACON_ID)});
    if (b && b.parentNode) b.parentNode.removeChild(b);
    return true;
  })()`

  return withDebugger(
    { tabId },
    (api: any) => {
      const evaluate = (expression: string) =>
        api.sendCommand('Runtime.evaluate', { expression, returnByValue: true })
      const takeDown = (finish: () => any) => evaluate(REMOVE).then(finish, finish)

      return evaluate(ADD)
        .then((res: any) => {
          const info = JSON.parse(res && res.result && res.result.value || '{}')
          const key = [tabId, info.iw, info.bx, info.by, info.sl, info.st, info.dpr].join('|')
          if (beaconCache && beaconCache.key === key && Date.now() - beaconCache.at < 3000) {
            return beaconCache.origin
          }
          const xyAPI: any = getNativeXYAPI()
          // small delay so the beacon is painted and captured
          return new Promise(r => setTimeout(r, 250))
            .then(() => Promise.all([xyAPI.getScalingFactor(), findBeaconRect(xyAPI, BEACON_COLOR)]))
            .then(([scaling, found]: [number, any]) => {
              if (!found || !(found.width > 0)) return null
              // Anchor on the beacon's own getBoundingClientRect, not on
              // innerWidth arithmetic: a classic scrollbar sits between
              // 'right:0' and the innerWidth edge, which measured as a
              // constant 26px screen miss. bcr is the beacon's exact CSS
              // viewport position — origin is simply found/scale - bcr.
              // (top:12px, not 0: the browser paints a ~7px translucent
              // toolbar shadow over the very top of the page, which eats
              // the beacon's first rows in the capture and measured as a
              // constant +6.4px click miss straight down.)
              const origin = {
                x: found.x / scaling - (Number(info.bx) || 0),
                y: found.y / scaling - (Number(info.by) || 0)
              }
              beaconCache = { at: Date.now(), key, origin }
              return origin
            })
        })
        .then(
          (origin: any) => takeDown(() => api.done(null, origin)),
          (e: Error) => takeDown(() => api.done(e))
        )
    },
    { cleanupTimeout: detachTimeout() }
  ).catch(() => null)
}

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
    { cleanupTimeout: detachTimeout() }
  )
}
