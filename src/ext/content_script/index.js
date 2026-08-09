import Ext from '../../common/web_extension'
import storage from '../../common/storage'
import csIpc from '../../common/ipc/ipc_cs'
import { postMessage, onMessage } from '../../common/ipc/cs_postmessage'
import inspector from '../../common/inspector'
import * as C from '../../common/constant'
import { pick, setIn, updateIn, until, parseQuery, objMap, bindOnce, bind, withTimeout, subjectiveBindOnce } from '../../common/utils'
import { bindContentEditableChange, setStyle, domText, isFirefox, getElementByLocator } from '../../common/dom_utils'
import { hackAlertInject } from './eval'
import { run } from './command_runner'
import { captureClientAPI } from '../../common/capture_screenshot'
import { encryptIfNeeded } from '../../common/encrypt'
import log from '../../common/log'
import { selectAreaPromise } from './select_area'
import { getOrcMatchesHighlighter } from '../../services/ocr/highlighter'
import { polyfillTimeoutFunctions } from '../../services/timeout/cs_timeout'
import { DevicePixelRatioService } from '../../services/dpr'
import { ViewportRectService } from '../../services/viewport_rect'
import config from '../../config';
import { getState, updateState } from '../common/global_state'
import  interceptLog from '@/common/intercept_log'

interceptLog()

console.log('content_script.js loaded:>>')

if (window.top === window && !isFirefox()) {
  polyfillTimeoutFunctions(csIpc)
}

const MASK_CLICK_FADE_TIMEOUT = 2000
const oops = process.env.NODE_ENV === 'production'
                ? () => {}
                : (e) => log.error(e.stack)

// PASSIVE screen-origin sampler (Chrome only in effect; Firefox never reads
// it — mozInnerScreenX is exact). Every trusted mouse event carries the
// viewport's true screen position as screenX - clientX, so the page tells us
// the number Chrome has no API for, for free, every time the user moves the
// mouse. GET_VIEWPORT_RECT_IN_SCREEN prefers this over the derived
// screenLeft/outerHeight guess (measured 64px wrong on a real system); when no
// mouse event has happened yet, the XClick path fires one CDP mouse-move to
// generate one. screenLeft/Top are snapshotted so a window move between the
// sample and its use is corrected instead of invalidating it. Untrusted
// events are ignored — a page can dispatchEvent() any screenX it likes, and
// this number aims real OS clicks.
let lastScreenOrigin = null
document.addEventListener('mousemove', (e) => {
  if (!e.isTrusted) return
  lastScreenOrigin = {
    ox: e.screenX - e.clientX,
    oy: e.screenY - e.clientY,
    screenLeft: window.screenLeft,
    screenTop: window.screenTop,
    // inner/outer heights let a later reader detect IN-WINDOW chrome coming or
    // going — above all Chrome's own debugger notice, which appears with the
    // very CDP probe that feeds this sampler and auto-hides seconds later,
    // sliding the viewport up by its height with NO change to screenLeft/Top.
    // Measured live: one click aimed 55px low in exactly that window.
    innerHeight: window.innerHeight,
    outerHeight: window.outerHeight,
    // page zoom changes devicePixelRatio in Chrome and re-scales client
    // coordinates — a sample from another zoom is not correctable, only stale
    dpr: window.devicePixelRatio
  }
}, { capture: true, passive: true })

const state = {
  status: C.CONTENT_SCRIPT_STATUS.NORMAL,
  // Note: it decides whether we're running commands
  // in the current window or some iframe/frame
  playingFrame: window,
  // Note: current frame stack when recording, it helps
  // to generate `selectFrame` commands
  recordingFrameStack: [],
  // Note: snapshot of extension config
  // It is supposed to be updated when user activates that page
  config: {},
  // Note: To achieve verifyText, we need contextmenu event on page plus menu item click event from background
  elementOnContextMenu: null
}

// Note: Whether it's top or inner window, a content script has the need
// to send IPC message to background. But in our design, only the top window
// has access to the real csIpc, while inner frames have to bubble up the messages
// to the top window.
// So inner windows are provided with a fake csIpc, which post messages to its parent
const superCsIpc =
  window.top === window
    ? csIpc
    : {
      ask: (ipcAction, ipcData) => {
        return postMessage(window.parent, window, {
          action: 'IPC_CALL',
          data: { ipcAction, ipcData }
        })
      }
    }

const calcSelectFrameCmds = (frameStack) => {
  var xs  = state.recordingFrameStack
  var ys  = frameStack
  var len = Math.min(xs.length, ys.length)
  var tpl = { cmd: 'selectFrame', url: window.location.href }
  var ret = []
  var i   = 0

  for (i = 0; i < len; i++) {
    if (xs[i] !== ys[i]) {
      break
    }
  }

  if (i === 0) {
    // No need for relative=top, if state.recordingFrameStack is empty
    if (xs.length !== 0) {
      ret.push({ ...tpl, target: 'relative=top' })
    }
  } else if (i < len) {
    for (let j = i; j < xs.length; j++) {
      ret.push({ ...tpl, target: 'relative=parent' })
    }
  }

  for (let j = i; j < ys.length; j++) {
    ret.push({ ...tpl, target: ys[j] })
  }

  return ret
}

// Two masks to show on page
// 1. mask on click
// 2. mask on hover
const getMask = (function () {
  let mask, factory

  const addLogoImg = ($dom) => {
    const $img = createLogoImg()

    inspector.setStyle($img, {
      position: 'absolute',
      top: '-25px',
      left: '0',
      width: '20px',
      height: '20px'
    })

    $dom.appendChild($img)
  }

  return (remove) => {
    if (remove && factory) {
      mask = null
      return factory.clear()
    }

    if (mask) {
      return mask
    }

    factory = inspector.maskFactory()

    // Brand blue for the acted-on element, amber for hover — the old flat
    // green box with a purple border sat at 50% opacity, which muddied both
    // the fill AND the border. A translucent fill with a FULLY opaque border
    // reads as a crisp outline instead of a wash, and lets the element itself
    // stay legible underneath. zIndex 999 lost against any modern overlay;
    // these sit just below the automation border's 2147483647.
    const maskClick = factory.gen({
      background: 'rgba(26, 108, 224, 0.16)',
      border: '2px solid #1a6ce0',
      borderRadius: '4px',
      boxShadow: '0 0 0 3px rgba(26, 108, 224, 0.14), 0 2px 12px rgba(26, 108, 224, 0.30)',
      opacity: 1,
      zIndex: '2147483000'
    })
    const maskHover = factory.gen({
      background: 'rgba(255, 149, 0, 0.16)',
      border: '2px solid #ff9500',
      borderRadius: '4px',
      boxShadow: '0 0 0 3px rgba(255, 149, 0, 0.14)',
      opacity: 1,
      zIndex: '2147483000'
    })

    addLogoImg(maskClick)
    addLogoImg(maskHover)

    mask = { maskClick, maskHover }

    document.documentElement.appendChild(maskClick)
    document.documentElement.appendChild(maskHover)

    return mask
  }
})()

const createLogoImg = () => {
  // Note: Ext.runtime.getURL is available in content script, but not injected js
  // So there are cases when content_script.js is run as injected js, where `Ext.runtime.getURL`
  // is not available
  // Weird enough, `Ext.runtime.getURL` always works well in macOS
  const url   = Ext.runtime.getURL ? Ext.runtime.getURL('logo.png') : ''
  const img   = new Image()

  img.src     = url
  return img
}

// report recorded commands to background.
// a `leave` right after a click/select flushes that debounced command as-is —
// the *AndWait variants are deprecated, page-load waiting is automatic
const reportCommand = (function () {
  const LEAVE_INTERVAL  = 500
  let last              = null
  let lastTime          = null
  let timer             = null

  return (obj) => {
    obj = {...obj, url: window.location.href}

    log('to report', obj)

    // Change back to top frame if it was recording inside
    if (state.recordingFrameStack.length > 0) {
      state.recordingFrameStack = []

      superCsIpc.ask('CS_RECORD_ADD_COMMAND', {
        cmd: 'selectFrame',
        target: 'relative=top',
        url: window.location.href
      })
      .catch(oops)
    }

    switch (obj.cmd) {
      case 'leave': {
        if (timer) {
          clearTimeout(timer)
        }

        if ((new Date() - lastTime) < LEAVE_INTERVAL) {
          obj = last
        } else {
          return
        }

        break
      }
      case 'click':
      case 'select': {
        timer = setTimeout(() => {
          superCsIpc.ask('CS_RECORD_ADD_COMMAND', obj)
          .catch(oops)
        }, LEAVE_INTERVAL)

        last      = obj
        lastTime  = new Date()

        return
      }

      default:
        break
    }

    last      = obj
    lastTime  = new Date()

    superCsIpc.ask('CS_RECORD_ADD_COMMAND', obj)
    .catch(oops)
  }
})()

const isValidClick = (el) => {
  // Note: all elements are allowed to be recorded when clicked
  return true

  // if (el === document.body) return false
  //
  // const tag   = el.tagName.toLowerCase()
  // const type  = el.getAttribute('type')
  // const role  = el.getAttribute('role')
  //
  // if (tag === 'a' || tag === 'button')  return true
  // if (tag === 'input' && ['radio', 'checkbox'].indexOf(type) !== -1)  return true
  // if (['link', 'button', 'checkbox', 'radio'].indexOf(role) !== -1)   return true
  //
  // return isValidClick(el.parentNode)
}

const isValidSelect = (el) => {
  const tag = el.tagName.toLowerCase()

  if (['option', 'select'].indexOf(tag) !== -1) return true
  return false
}

const isValidType = (el) => {
  const tag   = el.tagName.toLowerCase()
  const type  = el.getAttribute('type')

  if (tag === 'textarea') return true
  if (tag === 'input' && ['radio, checkbox'].indexOf(type) === -1)  return true

  return false
}

// The replay highlight (uiv.page.click/type, the classic click/type commands).
// The mask used to just appear and vanish; it now pops in and fades out.
//
// COSTS NOTHING IN REPLAY TIME, by construction: element.animate() is
// fire-and-forget and animates only opacity/transform, which the compositor
// handles off the main thread — no layout, no paint, and nothing awaited. The
// caller dispatches its click on the very next line, exactly as before; the
// animation simply plays over it.
let maskAnim = null

const highlightDom = ($dom, timeout) => {
  const mask = getMask()
  const ms = timeout || MASK_CLICK_FADE_TIMEOUT

  inspector.showMaskOver(mask.maskClick, $dom)

  // A finished fill:forwards animation would keep the mask at its faded-out
  // opacity, so the NEXT highlight would draw nothing — cancel first, which
  // also restarts the pop cleanly when two commands hit the same element.
  if (maskAnim) {
    try { maskAnim.cancel() } catch (e) { /* already gone */ }
    maskAnim = null
  }

  if (typeof mask.maskClick.animate === 'function') {
    try {
      maskAnim = mask.maskClick.animate([
        { opacity: 0, transform: 'scale(1.06)' },
        { opacity: 1, transform: 'scale(1)', offset: 0.18 },
        { opacity: 1, transform: 'scale(1)', offset: 0.72 },
        { opacity: 0, transform: 'scale(1.02)' }
      ], {
        duration: ms,
        easing: 'cubic-bezier(0.2, 0, 0.2, 1)',
        // hold the faded-out frame until the timer below hides the element,
        // otherwise it snaps back to full opacity for a frame and flickers
        fill: 'forwards'
      })
    } catch (e) { /* no Web Animations here — the mask still shows, unanimated */ }
  }

  setTimeout(() => {
    inspector.setStyle(mask.maskClick, { display: 'none' })
  }, ms)
}


const createHighlightX = function (opts = {}) {
  const $mask = document.createElement('div')


  $mask.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="16px" height="16px">
      <line x1="8" y1="8" x2="56" y2="56" stroke="red" stroke-width="12"></line>
      <line x1="56" y1="8" x2="8" y2="56" stroke="red" stroke-width="12"></line>
    </svg>
                `
  let timer

  inspector.setStyle($mask, {
    position: 'absolute',
    zIndex: 110001,
    display: 'none',
    pointerEvents: 'none'
  })

  
  return (rect, timeout) => {
    clearTimeout(timer)

    inspector.setStyle($mask, {
      display:  'block',
      top:      `${rect.top - 8}px`,
      left:     `${rect.left - 8}px`,
    })

    if (!$mask.parentNode) {
      document.documentElement.appendChild($mask)
    }

    if (opts.scrollIntoView) {
      $mask.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }

    if (timeout && timeout > 0) {
      timer = setTimeout(() => {
        inspector.setStyle($mask, { display: 'none' })
      }, timeout)
    }

    const fn = () => {
      inspector.setStyle($mask, { display: 'none' })
      $mask.remove()
    }

    Object.assign(fn, {
      hide: () => inspector.setStyle($mask, { display: 'none' }),
      show: () => inspector.setStyle($mask, { display: 'block' })
    })

    return fn
  }
}

const highlightX = createHighlightX()

// Big animated cursor shown while trusted CDP input is dispatched
// (uiv.browser.* / the internal BClick/BMove engine).
// CDP events never move the real OS mouse, so without this overlay the user
// gets zero visual feedback (same idea as the cursor in "Claude for Chrome").
// The cursor glides to each new position, shows a ripple on clicks, and
// fades out after a short idle period.
const createBrowserCursor = function () {
  const GLIDE_MS = 100
  const HIDE_AFTER_MS = 3000
  let $cursor = null
  let visible = false
  let hideTimer

  const ensure = () => {
    if ($cursor && $cursor.isConnected) return $cursor

    $cursor = document.createElement('div')
    // Tip of the arrow sits at the container origin, so translate(x, y)
    // puts the tip exactly on the target point
    $cursor.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"
           style="display: block; transform: translate(-2px, -1px); filter: drop-shadow(0 1px 2px rgba(0,0,0,.45))">
        <path d="M2 1 L2 19 L7 14.5 L10 21.5 L13.2 20.1 L10.3 13.2 L17 13 Z"
              fill="#1e6fd9" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"></path>
      </svg>
    `

    // UI Vision logo below the arrow, so it's clear who is moving the mouse
    const $logo = createLogoImg()
    inspector.setStyle($logo, {
      position: 'absolute',
      left: '12px',
      top: '32px',
      width: '18px',
      height: '18px',
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.45))'
    })
    $cursor.appendChild($logo)

    inspector.setStyle($cursor, {
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 2147483647,
      pointerEvents: 'none',
      opacity: 0,
      transition: `transform ${GLIDE_MS}ms ease-out, opacity 150ms ease-out`,
      willChange: 'transform'
    })

    document.documentElement.appendChild($cursor)
    return $cursor
  }

  const ripple = (x, y) => {
    const $r = document.createElement('div')

    inspector.setStyle($r, {
      position: 'fixed',
      left: `${x - 18}px`,
      top: `${y - 18}px`,
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      border: '3px solid rgba(46, 204, 113, .9)',
      pointerEvents: 'none',
      zIndex: 2147483646
    })

    document.documentElement.appendChild($r)

    const anim = $r.animate(
      [
        { transform: 'scale(.3)', opacity: 1 },
        { transform: 'scale(1.4)', opacity: 0 }
      ],
      { duration: 450, easing: 'ease-out' }
    )
    anim.onfinish = () => $r.remove()
  }

  return ({ x, y, isClick }) => {
    const $el = ensure()
    clearTimeout(hideTimer)

    if (!visible) {
      // First appearance: pop in at the target instead of gliding across
      // the whole page from (0, 0)
      $el.style.transition = 'none'
      $el.style.transform = `translate(${x}px, ${y}px)`
      $el.getBoundingClientRect() // flush styles so the next transform animates
      $el.style.transition = `transform ${GLIDE_MS}ms ease-out, opacity 150ms ease-out`
      visible = true
    }

    inspector.setStyle($el, {
      opacity: 1,
      transform: `translate(${x}px, ${y}px)`
    })

    hideTimer = setTimeout(() => {
      visible = false
      if ($cursor) inspector.setStyle($cursor, { opacity: 0 })
    }, HIDE_AFTER_MS)

    if (!isClick) return Promise.resolve(true)

    // Resolve after the glide so the caller can dispatch the real click once
    // the cursor has visually arrived
    return new Promise((resolve) => {
      setTimeout(() => {
        ripple(x, y)
        resolve(true)
      }, GLIDE_MS + 20)
    })
  }
}

const browserCursor = createBrowserCursor()

const createHighlightRect = function (opts = {}) {
  const $mask = document.createElement('div')
  const $text = document.createElement('div')
  let timer

  inspector.setStyle($mask, {
    position: 'absolute',
    zIndex: 110001,
    border: '1px solid orange',
    color: 'orange',
    display: 'none',
    pointerEvents: 'none'
  })

  inspector.setStyle($text, {
    position: 'absolute',
    top: 0,
    left: 0,
    transform: 'translate(-100%, -100%)',
    fontSize: '14px'
  })

  $mask.appendChild($text)

  return (rect, timeout) => {
    clearTimeout(timer)
    $text.innerText = rect.text ? rect.text : (parseFloat(rect.score).toFixed(2) + ` #${rect.index + 1}`)

    inspector.setStyle($mask, {
      display:  'block',
      top:      `${rect.top}px`,
      left:     `${rect.left}px`,
      width:    `${rect.width}px`,
      height:   `${rect.height}px`,
      ...(opts.rectStyle || {})
    })

    inspector.setStyle($text, opts.textStyle || {})

    if (!$mask.parentNode) {
      document.documentElement.appendChild($mask)
    }

    if (opts.scrollIntoView) {
      $mask.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }

    if (timeout && timeout > 0) {
      timer = setTimeout(() => {
        inspector.setStyle($mask, { display: 'none' })
      }, timeout)
    }

    const fn = () => {
      inspector.setStyle($mask, { display: 'none' })
      $mask.remove()
    }

    Object.assign(fn, {
      hide: () => inspector.setStyle($mask, { display: 'none' }),
      show: () => inspector.setStyle($mask, { display: 'block' })
    })

    return fn
  }
}

const highlightRect = createHighlightRect()

const highlightRects = (function () {
  const topMatchedOptions = {
    rectStyle: {
      borderColor: '#ff0000',
      color: '#ff0000'
    }
  }
  let destroy

  const fn = (rects, timeout) => {
    if (destroy)  destroy()

    const destroyFns = rects.map((rect, i) => {
      rect.index = i
      return createHighlightRect(rect.selected ? topMatchedOptions : {})(rect, timeout)
    })

    destroy = () => destroyFns.forEach(destroy => destroy())

    Object.assign(destroy, {
      hide: () => destroyFns.forEach(fn => fn.hide && fn.hide()),
      show: () => destroyFns.forEach(fn => fn.show && fn.show())
    })

    return destroy
  }

  Object.assign(fn, {
    hide: () => destroy.hide(),
    show: () => destroy.show()
  })

  return fn
})()

const initMultipleSelect = ($select) => {
  if ($select && $select.nodeName && $select.nodeName.toLowerCase() === 'select' && $select.multiple) {
    Array.from($select.options).forEach($option => {
      $option.lastSelected = $option.selected
    })
  }
}

const onContextMenu = (e) => {
  state.elementOnContextMenu = e.target
}

const onClick = (e) => {
  if (!isValidClick(e.target))  return
  (async()=>{
    const allState= await getState();
    if(allState['curent_cmd'] == "XClickTextRelative" && allState.status!="NORMAL"){
      const rect = e.target.getBoundingClientRect();
      getOrcMatchesHighlighter().highlightRelative(rect);
      updateState(setIn(['curent_cmd'], ''));
      //e.target.style.border='2px solid #fe1492';
    }  
    
})()
  const targetInfo = inspector.getLocator(e.target, true)

  // clickAt is deprecated — recording always emits a plain click
  reportCommand({
    ...targetInfo,
    cmd: 'click'
  })

  if (e.target.nodeName.toLowerCase() === 'option') {
    initMultipleSelect(e.target.parentNode)
  }
}

const onFocus = (e) => {
  if (e.target.nodeName.toLowerCase() === 'select' && e.target.multiple) {
    initMultipleSelect(e.target)
  }
}

const onChange = (e) => {
  if (isValidSelect(e.target)) {
    const isMultipleSelect = !!e.target.multiple

    if (!isMultipleSelect) {
      const value = e.target.value
      const $option = Array.from(e.target.children).find($op => $op.value === value)

      reportCommand({
        cmd: 'select',
        value: 'label=' + inspector.domText($option).trim(),
        ...inspector.getLocator(e.target, true)
      })
    } else {
      Array.from(e.target.options).forEach($option => {
        if ($option.lastSelected !== $option.selected) {
          reportCommand({
            cmd:    $option.selected ? 'addSelection' : 'removeSelection',
            value:  'label=' + inspector.domText($option).trim(),
            ...inspector.getLocator(e.target, true)
          })
        }

        $option.lastSelected = $option.selected
      })
    }
  } else if (isValidType(e.target)) {
    const value = (e.target.value || '').replace(/\n/g, '\\n')

    encryptIfNeeded(value, e.target)
    .then(realValue => {
      reportCommand({
        cmd: 'type',
        value: realValue,
        ...inspector.getLocator(e.target, true)
      })
    })
  }
}

const onContentEditableChange = (e) => {
  reportCommand({
    cmd:    'editContent',
    value:  e.target.innerHTML,
    ...inspector.getLocator(e.target, true)
  })
}

const onLeave = (e) => {
  reportCommand({
    cmd: 'leave',
    target: null,
    value: null
  })

  setTimeout(() => {
    reportCommand({
      cmd: 'pullback',
      target: null,
      value: null
    })
  }, 800)
}

let unbindContentEditableEvents

const bindEventsToRecord = () => {
  document.addEventListener('click', onClick, true)
  document.addEventListener('focus', onFocus, true)
  document.addEventListener('change', onChange, true)
  document.addEventListener('contextmenu', onContextMenu, true)
  window.addEventListener('beforeunload', onLeave, true)

  unbindContentEditableEvents = bindContentEditableChange({ onChange: onContentEditableChange })
}

const unbindEventsToRecord = () => {
  document.removeEventListener('click', onClick, true)
  document.removeEventListener('focus', onFocus, true)
  document.removeEventListener('change', onChange, true)
  document.removeEventListener('contextmenu', onContextMenu, true)
  window.removeEventListener('beforeunload', onLeave, true)

  if (unbindContentEditableEvents) {
    unbindContentEditableEvents()
  }
}

const waitForDomReady = (accurate) => {
  return until('dom ready', () => {
    return {
      pass: ['complete', 'interactive'].slice(0, accurate ? 1 : 2).indexOf(document.readyState) !== -1,
      result: true
    }
  }, 1000, 6000 * 10)
}

const broadcastToAllFrames = (action, data) => {
  // IMPORTANT: broadcast status change to all frames inside
  const frames = window.frames

  for (let i = 0, len = frames.length; i < len; i++) {
    postMessage(frames[i], window, {
      action,
      data
    })
  }
}

const updateStatus = (args) => {
  if (!args.status) {
    throw new Error('SET_STATUS: missing args.status')
  }
  if (!C.CONTENT_SCRIPT_STATUS[args.status]) {
    throw new Error('SET_STATUS: invalid args.status - ' + args.status)
  }

  Object.assign(state, {
    status: args.status
  })

  if (args.status === C.CONTENT_SCRIPT_STATUS.NORMAL ||
      args.status === C.CONTENT_SCRIPT_STATUS.RECORDING) {
    bindEventsToRecord()
  } else {
    unbindEventsToRecord()
  }

  // replace alert/confirm/prompt with our version when playing
  if (args.status === C.CONTENT_SCRIPT_STATUS.PLAYING) {
    hackAlertConfirmPrompt()
  } else {
    restoreAlertConfirmPrompt()
  }

  // Note: clear recording frame stack whenever it stops recording
  if (args.status === C.CONTENT_SCRIPT_STATUS.NORMAL) {
    state.recordingFrameStack = []
    state.playingFrame = window
  }

  // IMPORTANT: broadcast status change to all frames inside
  broadcastToAllFrames('SET_STATUS', args)
}

const bindIPCListener = () => {
  // Note: need to check csIpc in case it's a none-src iframe into which we
  // inject content_script.js. It has no access to chrome api, thus no csIpc available
  if (!csIpc) return 

  // Note: csIpc instead of superIpc, because only top window is able
  // to listen to ipc events from bg
  csIpc.onAsk((cmd, args) => {
    log(cmd, args)
    
    switch (cmd) {
      case 'HEART_BEAT':
        return {
          secret: csIpc.secret
        }

      case 'SET_STATUS': {
        updateStatus(args)
        return true
      }

      case 'DOM_READY':
        return waitForDomReady(false)

      case 'STOP_INSPECTING': {
        getMask(true)
        updateStatus({ status: C.CONTENT_SCRIPT_STATUS.NORMAL })
        return true
      }

      case 'RUN_COMMAND':
        return runCommand(args.command)
        .catch(e => {
          // Mark that there is already at least one command run
          window.noCommandsYet = false

          log.error(e.stack)
          throw e
        })
        .then(data => {
          // Mark that there is already at least one command run
          window.noCommandsYet = false

          if (state.playingFrame !== window) {
            return { data, isIFrame: true }
          }

          return { data }
        })

      case 'FIND_DOM': {
        try {
          const $el = getElementByLocator(args.locator)
          return true
        } catch (e) {
          return false
        }
      }

      case 'HIGHLIGHT_DOM': {
        const $el = getElementByLocator(args.locator)

        if ($el) {
          $el.scrollIntoView({ block: 'center' })
          highlightDom($el)
        }

        return true
      }

      case 'HIGHLIGHT_RECT': {
        highlightRect(args.rect, args)
        return true
      }

      case 'HIGHLIGHT_X': {
        const rect  = {
          top:    args.offset.y ,
          left:   args.offset.x ,          
          // width: 40, 
          // height: 60
        }
        highlightX(rect, args)
        return true
      }

      case 'SHOW_BROWSER_CURSOR': {
        return browserCursor(args)
      }

      case 'HIGHLIGHT_RECTS': {
        highlightRects(args.scoredRects.map((rect, i) => {
          return {
            ...rect,
            selected: i === args.selectedIndex
          }
        }))
        return true
      }

      case 'CLEAR_VISION_RECTS': {
        // Note: it will clear previous rects
        highlightRects([])
        return true
      }

      case 'HIDE_VISION_RECTS': {
        highlightRects.hide()
        return true
      }

      case 'SHOW_VISION_RECTS': {
        highlightRects.show()
        return true
      }

      case 'HIGHLIGHT_OCR_MATCHES': {
        getOrcMatchesHighlighter().updateStates(args.localStorage);
        getOrcMatchesHighlighter().highlight(args.ocrMatches, args.showOcrOverlay)
        return true
      }

      case 'CLEAR_OCR_MATCHES': {
        getOrcMatchesHighlighter().clear()
        return true
      }

      case 'HACK_ALERT': {
        return hackAlertConfirmPrompt()
        .then(
          () => true,
          () => true
        )
      }

      case 'MARK_NO_COMMANDS_YET': {
        window.noCommandsYet = true
        return true
      }

      case 'SCREENSHOT_PAGE_INFO': {
        return captureClientAPI.getPageInfo()
      }

      case 'START_CAPTURE_FULL_SCREENSHOT': {
        return captureClientAPI.startCapture(args || {})
      }

      case 'END_CAPTURE_FULL_SCREENSHOT': {
        return captureClientAPI.endCapture(args.pageInfo)
      }

      case 'SCROLL_PAGE': {
        return captureClientAPI.scrollPage(args.offset)
      }

      case 'TAB_ACTIVATED': {
        loadConfig()
        return
      }

      case 'SELECT_SCREEN_AREA': {
        return selectAreaPromise({
          done:     (rect, boundingRect) => {
            log('SELECT_SCREEN_AREA  - selectArea', rect, boundingRect)
            return csIpc.ask('CS_SCREEN_AREA_SELECTED', {
              rect: {
                x: boundingRect.x,
                y: boundingRect.y,
                width: boundingRect.width,
                height: boundingRect.height
              },
              devicePixelRatio: window.devicePixelRatio
            })
          }
        })
      }

      case 'TOGGLE_HIGHLIGHT_VIEWPORT': {
        const on  = args.on
        const id  = '__kantu_viewport_highlight__'
        const $el = document.getElementById(id)

        if ($el) {
          $el.remove()
        }

        if (on) {
          const $dom = document.createElement('div')
          $dom.id = id
          $dom.innerText = 'Calibrating Computer Vision...'

          setStyle($dom, {
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 120001,
            background: '#00ff00',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 'bold',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center'
          })

          document.documentElement.appendChild($dom)
        }

        return true
      }

      case 'CONTEXT_MENU_IN_RECORDING': {
        switch (args && args.command) {
          case 'assertText':
            if (!state.elementOnContextMenu) {
              break
            }

            reportCommand({
              ...inspector.getLocator(state.elementOnContextMenu, true),
              cmd:   args.command,
              value: domText(state.elementOnContextMenu)
            })
            break

          case 'assertTitle':
            reportCommand({
              cmd:    args.command,
              target: document.title
            })
            break
        }

        return true
      }

      case 'GET_VIEWPORT_RECT_IN_SCREEN': {
        const dprService = new DevicePixelRatioService({
          getZoom: () => Promise.resolve(args.zoom)
        })
        const viewportRectService = new ViewportRectService({
          devicePixelRatioService: dprService
        })

        return viewportRectService.getViewportRectInScreen().then(rect => {
          // Firefox: the service used mozInnerScreenX — exact, nothing to add
          if (typeof window.mozInnerScreenX !== 'undefined') {
            return { ...rect, source: 'exact' }
          }
          // Chrome: the service DERIVED the origin from screenLeft/outerHeight
          // guesses (fixed 8px border, all vertical chrome assumed above the
          // viewport) — measured 64px wrong on a real system, sending every
          // browser-scope XClick off target. A trusted mouse event knows the
          // truth: screenX - clientX IS the origin. lastScreenOrigin holds the
          // most recent one (any real user mouse-move, or the CDP calibration
          // probe the XClick path fires when none has happened yet); a window
          // move since then shows up in screenLeft/Top and shifts it.
          if (lastScreenOrigin && lastScreenOrigin.dpr === window.devicePixelRatio) {
            // barShift: in-window chrome (Chrome's debugger notice) appearing
            // or disappearing since the sample — innerHeight changed while
            // outerHeight did not. A window RESIZE moves both by the same
            // amount and cancels out; a top-edge resize shows up in screenTop.
            const barShift = (window.innerHeight - lastScreenOrigin.innerHeight) -
              (window.outerHeight - lastScreenOrigin.outerHeight)
            return {
              ...rect,
              x: lastScreenOrigin.ox + (window.screenLeft - lastScreenOrigin.screenLeft),
              y: lastScreenOrigin.oy + (window.screenTop - lastScreenOrigin.screenTop) - barShift,
              source: 'measured'
            }
          }
          return { ...rect, source: 'derived' }
        })
      }

      default:
        throw new Error('cmd not supported: ' + cmd)
    }
  })
}

const bindEventsToInspect = () => {
  // Bind click events for inspecting
  document.addEventListener('click', (e) => {
    switch (state.status) {
      case C.CONTENT_SCRIPT_STATUS.INSPECTING: {
        e.preventDefault()
        e.stopPropagation()

        const mask = getMask()

        inspector.setStyle(mask.maskHover, { display: 'none' })
        inspector.showMaskOver(mask.maskClick, e.target)

        setTimeout(() => {
          inspector.setStyle(mask.maskClick, { display: 'none' })
        }, MASK_CLICK_FADE_TIMEOUT)

        Object.assign(state, {
          status: C.CONTENT_SCRIPT_STATUS.NORMAL
        })

        return superCsIpc.ask('CS_DONE_INSPECTING', {
          locatorInfo: inspector.getLocator(e.target, true)
        })
        .catch(oops)
      }

      default:
        break
    }
  }, true)

  // bind mouse over event for applying for a inspector role
  document.addEventListener('mouseover', (e) => {
    if (state.status === C.CONTENT_SCRIPT_STATUS.NORMAL) {
      return superCsIpc.ask('CS_ACTIVATE_ME', {})
      .catch(oops)
    }
  })

  // bind mouse move event to show hover mask in inspecting
  document.addEventListener('mousemove', (e) => {
    if (state.status !== C.CONTENT_SCRIPT_STATUS.INSPECTING)  return

    const mask = getMask()
    inspector.showMaskOver(mask.maskHover, e.target)
  })
}

const bindOnMessage = () => {
  onMessage(window, ({ action, data }, { source }) => {
    // Should not log source here, because it might cause accessing a cross origin frame error
    log('onMessage', action, data)

    switch (action) {
      case 'SET_STATUS':
        updateStatus(data)
        return true

      case 'UPDATE_CONFIG': {
        state.config = data
        return true
      }

      // inner frames may receive this message when there are
      // some previous `selectFrame` command
      case 'RUN_COMMAND':
        // runCommand will decide whether to run in this window or pass on
        return runCommand(data)

      // inner frames send IPC_CALL to background,
      // It will go step by step up to the topmost frame, which has
      // the access to csIpc
      case 'IPC_CALL':
        // When recording, need to calculate `selectFrame` by ourselves
        // * for inner frames, add current frame locator to frame stack
        // * for top frame, send `selectFrame` commands before the original command
        //   and keep track of the latest frame stack
        if (data.ipcAction === 'CS_RECORD_ADD_COMMAND' && data.ipcData.cmd !== 'pullback') {
          // Note: Do not send any RECORD_ADD_COMMAND in playing mode
          if (state.status === C.CONTENT_SCRIPT_STATUS.PLAYING) {
            return false
          }

          data = updateIn(
            ['ipcData', 'frameStack'],
            (stack = []) => [inspector.getFrameLocator(source, window), ...stack],
            data
          )

          if (window.top === window) {
            calcSelectFrameCmds(data.ipcData.frameStack).forEach(cmd => {
              csIpc.ask('CS_RECORD_ADD_COMMAND', cmd)
              .catch(oops)
            })

            state.recordingFrameStack = data.ipcData.frameStack
          }
        }

        if (window.top === window) {
          return csIpc.ask(data.ipcAction, data.ipcData)
          .catch(oops)
        } else {
          return postMessage(window.parent, window, { action, data })
        }

      case 'RESET_PLAYING_FRAME': {
        state.playingFrame = window

        // pass on RESET_PLAYING_FRAME to parent, all the way till top window
        if (data === 'TOP' && window.top !== window) {
          return withTimeout(config.iframePostMessageTimeout, () => {
            return postMessage(window.parent, window, {
              action: 'RESET_PLAYING_FRAME',
              data: 'TOP'
            })
          })
          .then(() => true)
        }

        return Promise.resolve(true)
      }

      case 'SOURCE_PAGE_OFFSET': {
        const $frames = [
          ...Array.from(document.getElementsByTagName('iframe')),
          ...Array.from(document.getElementsByTagName('frame'))
        ]
        const $frameElement = $frames.find($frame => $frame.contentWindow === source)
        const offset        = inspector.offset($frameElement, true)
        const x             = offset.left
        const y             = offset.top
        log('SOURCE_PAGE_OFFSET, iframeDOM', $frameElement)

        if (window.top === window) {
          return { x, y }
        }

        return postMessage(window.parent, window, {
          action: 'SOURCE_PAGE_OFFSET',
          data: {}
        })
        .then(parentOffset => {
          return {
            x: x + parentOffset.x,
            y: y + parentOffset.y
          }
        })
      }

      case 'SOURCE_VIEWPORT_OFFSET': {
        const $frames = [
          ...Array.from(document.getElementsByTagName('iframe')),
          ...Array.from(document.getElementsByTagName('frame'))
        ]
        const $frameElement = $frames.find($frame => $frame.contentWindow === source)
        const rect = $frameElement.getBoundingClientRect()

        if (window.top === window) {
          return {
            x: rect.x,
            y: rect.y
          }
        }

        return postMessage(window.parent, window, {
          action: 'SOURCE_VIEWPORT_OFFSET',
          data: {}
        })
        .then(parentOffset => {
          return {
            x: rect.x + parentOffset.x,
            y: rect.y + parentOffset.y
          }
        })
      }

      case 'DOM_READY':
        return waitForDomReady(false)
    }
  })
}

const isUrlInWhiteList = (url) => {
  const { websiteWhiteList = [] } = state.config

  return websiteWhiteList.reduce((prev, cur) => {
    if (prev) return prev
    return url.indexOf(cur) === 0
  }, false)
}

const bindInvokeEvent = () => {
  const doesQueriesContainMacroOrTestSuite = (queries = {}) => {
    return queries['macro'] || queries['testsuite'] || queries['folder']
  }
  const decorateOptions = (options, detail) => {
    return {
      loadmacrotree: '0',
      continueInLastUsedTab: '1',
      ...options,
      ...(detail ? pick(['closeKantu', 'closeRPA', 'loadmacrotree'], detail) : {})
    }
  }
  const runCsInvokeFromQueries = (queries = {}) => {
    const userStorageMode    = queries.storageMode ? queries.storageMode.toLowerCase() : ''
    const isValidStorageMode = ['browser', 'xfile'].indexOf(userStorageMode) !== -1
    const storageMode        = isValidStorageMode ? userStorageMode : 'browser'

    if (queries['macro']) {
      return csIpc.ask('CS_INVOKE', {
        testCase: {
          storageMode,
          name: queries['macro'],
          from: 'html'
        },
        options: decorateOptions(queries)
      })
      .catch(e => alert('[Ui.Vision] ' + e.message))
    }

    if (queries['folder']) {
      return csIpc.ask('CS_INVOKE', {
        testSuite: {
          storageMode,
          macroFolder: queries['folder'],
          from: 'html'
        },
        options: decorateOptions(queries)
      })
    }

    if (queries['testsuite']) {
      return csIpc.ask('CS_INVOKE', {
        testSuite: {
          storageMode,
          name: queries['testsuite'],
          from: 'html'
        },
        options: decorateOptions(queries)
      })
      .catch(e => alert('[Ui.Vision] ' + e.message))
    }
  }
  const isFile  = window.location.protocol === 'file:'

  // Macros
  bind(window, 'kantuRunMacro', (e) => {
    log('invoke event', e)
    window.dispatchEvent(new CustomEvent('kantuInvokeSuccess'))

    // a bookmark run can start on ANY page, so only the query params
    // Ui.Vision actually understands may merge into the options — the rest
    // (?production=true, ?ionicplatform=md, ...) belong to the page and used
    // to surface as "Unknown command line parameter" warnings
    const queries = pick(C.INVOKE_URL_PARAMS, parseQuery(window.location.search))

    csIpc.ask('CS_INVOKE', {
      testCase: e.detail,
      options:  decorateOptions({
        continueInLastUsedTab: '0',
        ...queries
      }, e.detail)
    })
    .catch(e => alert('[Ui.Vision] ' + e.message))
  });

  (isFile ? bindOnce : subjectiveBindOnce)(window, 'kantuSaveAndRunMacro', (e) => {
    const run = () => {
      log('save and run macro event:>> e:', e)
      window.dispatchEvent(new CustomEvent('kantuInvokeSuccess'))

      if (!e.detail || (!e.detail.html && !e.detail.json)) {
        return alert('[Ui.Vision] invalid data format')
      }

      const queries     = parseQuery(window.location.search)
      const direct      = !!queries['direct'] || (e.detail.json && e.detail.direct)
      const storageMode = queries['storage'] || e.detail.storageMode || 'browser'

      const msgDirectParam      = 'Ui.Vision: Do you want to import and run this macro?\n\nNote: To remove this dialog, add \'?direct=1\' switch to the URL. Example: file:///xx/xx/macro.html?direct=1  For embedded macros, add "direct: true" to the call.'
      const msgWebsiteWhiteList = 'Ui.Vision: Do you want to import and run this macro?\n\nNote: To remove this dialog, add this site to whitelist in the Ui.Vision settings'

      if (isFile && !direct) {
        const agree = confirm(msgDirectParam)
        if (!agree) return
      }

      if (!isFile) {
        if (!state.config.allowRunFromHttpSchema) {
          return alert('[Message from Ui.Vision] Error #110: To run an embedded macro from a website, you need to allow it in the RPA settings first')
        }

        if (!isUrlInWhiteList(window.location.href)) {
          const agree = confirm(msgWebsiteWhiteList)
          if (!agree) return
        } else if (!direct) {
          const agree = confirm(msgDirectParam)
          if (!agree) return
        }
      }

      if (doesQueriesContainMacroOrTestSuite(queries)) {
        console.log('doesQueriesContainMacroOrTestSuite:>> queries: ', queries)
        return runCsInvokeFromQueries({ ...queries, storageMode })
      } else if (e.detail.noImport) {
        const msg = 'Command line must include one of these params: macro, folder'
        alert(msg)
        throw new Error(msg)
      }

      const extraOptions = !isFile ? { continueInLastUsedTab: '0' } : {}

      return csIpc.ask('CS_IMPORT_AND_INVOKE', {
        ...e.detail,
        from:     'html',
        options:  decorateOptions({ ...queries, ...extraOptions }, e.detail)
      })
      .catch(e => alert('[Ui.Vision] ' + e.message))
    }

    loadConfig()
    .catch(e => {})
    .then(run)
  })

// we don't need this
// Test Suites
//   bind(window, 'kantuRunTestSuite', (e) => {
//     log('invoke event', e)
//     window.dispatchEvent(new CustomEvent('kantuInvokeSuccess'))

//     const queries = parseQuery(window.location.search)
//     const storageMode = queries['storage'] || e.detail.storageMode || 'browser'

//     if (doesQueriesContainMacroOrTestSuite(queries)) {
//       return runCsInvokeFromQueries({
//         ...queries,
//         storageMode
//       })
//     }

//     return csIpc.ask('CS_INVOKE', {
//       testSuite: e.detail,
//       options: decorateOptions(queries, e.detail)
//     })
//     .catch(e => alert('[Ui.Vision] ' + e.message))
//   })
}

const hackAlertConfirmPrompt = (doc = document) => {
  const script = `(function () {
    if (!window.oldAlert)     window.oldAlert   = window.alert
    if (!window.oldConfirm)   window.oldConfirm = window.confirm
    if (!window.oldPrompt)    window.oldPrompt  = window.prompt

    window.alert = function (str) {
      document.body.setAttribute('data-alert', str)
    }

    window.confirm = function (str) {
      document.body.setAttribute('data-confirm', str)
      return true
    }

    window.prompt = function (str) {
      var answer = document.body.getAttribute('data-prompt-answer')
      document.body.setAttribute('data-prompt', str)
      document.body.setAttribute('data-prompt-answer', '')
      return answer
    }
  })();`

  return hackAlertInject(script)
}

const restoreAlertConfirmPrompt = () => {
  const script = `(function () {
    if (window.oldAlert)    window.alert = window.oldAlert
    if (window.oldConfirm)  window.confirm = window.oldConfirm
    if (window.oldPrompt)   window.prompt = window.oldPrompt
  });`

  return hackAlertInject(script)
}

const init = () => {
  unbindEventsToRecord()
  bindEventsToRecord()

  bindEventsToInspect()
  bindOnMessage()

  toggleBodyMark(true)

  loadConfig()
  .then(config => removeBodyMarkIfNecessary(config))

  // Note: only bind ipc events if it's the top window
  if (window.top === window) {
    bindIPCListener()
    bindInvokeEvent()
  } else {
    onUrlChange(init)
  }
}

const toggleBodyMark = (shouldMark) => {
  const $root = document.documentElement

  if (!$root) {
    return
  }

  if (shouldMark) {
    $root.setAttribute('data-kantu', 1)
  } else {
    $root.removeAttribute('data-kantu')
  }
}

const removeBodyMarkIfNecessary = (config) => {
  switch (window.location.protocol) {
    case 'file:':
      if (!config.allowRunFromFileSchema) {
        toggleBodyMark(false)
      }
      break

    case 'http:':
    case 'https:':
      if (!config.allowRunFromHttpSchema) {
        toggleBodyMark(false)
      }
      break

    default:
      toggleBodyMark(false)
  }
}

const runCommand = (command) => {
  console.log('runCommand command :>> ', command)
  if (!command.cmd) {
    throw new Error('runCommand: must provide cmd')
  }

  const pResult = (() => {
    console.log('pResult state :>> ', state)
    // if it's an 'open' command, it must be executed in the top window
    if (state.playingFrame === window || command.cmd === 'open') {
      // Note: both top and inner frames could run commands here
      // So must use superCsIpc instead of csIpc
      const ret = run(command, superCsIpc, {
        highlightDom,
        hackAlertConfirmPrompt,
        xpath: inspector.xpath
      })

      // Note: `run` returns the contentWindow of the selected frame
      if (command.cmd === 'selectFrame') {
        return ret.then(({ frame }) => {
          const p = (() => {
            // let outside window know that playingFrame has been changed, if it's parent or top
            if (frame !== window && (frame === window.top || frame === window.parent)) {
              // set playingFrame to own window, get ready for later commands if any
              state.playingFrame = window

              return withTimeout(config.iframePostMessageTimeout, () => {
                return postMessage(window.parent, window, {
                  action: 'RESET_PLAYING_FRAME',
                  data: frame === window.top ? 'TOP' : 'PARENT'
                })
              })
            } else {
              state.playingFrame = frame

              return Promise.resolve()
            }
          })()

          return p.then(() => ({
            pageUrl: window.location.href,
            extra: command.extra
          }))
        })
      }

      // Extra info passed on to background, it contains timeout info
      const wrapResult = (ret) => {
        return {
          ...(typeof ret === 'object' ? ret : {}),
          pageUrl: window.location.href,
          extra: command.extra,
          // Note: undefined value in an Object will be eliminated during message passing,
          // Have to transform it into an object first, and convert it back in front end
          vars: !ret.vars ? undefined : objMap(val => {
            return val !== undefined ? val : { __undefined__: true }
          }, ret.vars)
        }
      }

      return Promise.resolve(ret).then(wrapResult)
    } else {
      const isFrameRemoved = (frame) => !frame.parent

      if (isFrameRemoved(state.playingFrame)) {
        throw new Error('The selected frame has been removed. You may want to use another selectFrame before its removal')
      }



      // log('passing command to frame...', state.playingFrame, '...', window.location.href)
      // Note: pass on the command if our window is not the current playing one
      return postMessage(state.playingFrame, window, {
        action: 'RUN_COMMAND',
        data: command
      })
    }
  })()

  // Note: set ipc secret on response, so that background could know whether a page has refreshed or redirected
  // only mark it on top-most window
  return pResult.then(result => {

    console.log('pResult result:>> ', result);
    const secret = result.secret || (() => {
      if (window.top === window) {
        return csIpc.secret
      }

      window.kantuSecret = window.kantuSecret || ('' + Math.floor(Math.random() * 10000))
      return window.kantuSecret
    })()

    return {
      ...result,
      secret
    }
  })
}

// Note: for cases like https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_onblur
// There is a kind of strange refresh in the iframe on right hand side,
// while content script is not reloaded in the mean time, it causes that iframe not able to be recorded
// So we have to listen to url change in iframes for this case.
const onUrlChange = (function () {
  let callback  = () => {}
  let lastUrl   = window.location.href
  const check   = () => {
    if (window.location.href !== lastUrl) {
      log('url changed', lastUrl, window.location.href)
      lastUrl = window.location.href
      callback()
    }
  }

  if (window.top === window) {
    return () => {}
  }

  setInterval(check, 2000)

  return (fn) => {
    callback = fn
  }
})()

const loadConfig = () => {
  return storage.get('config')
  .then(config => {
    state.config = config

    // IMPORTANT: broadcast status change to all frames inside
    broadcastToAllFrames('UPDATE_CONFIG', config)

    return config
  })
}

init()
