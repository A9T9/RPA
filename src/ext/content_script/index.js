import Ext from '../../common/web_extension'
import storage from '../../common/storage'
import csIpc from '../../common/ipc/ipc_cs'
import { postMessage, onMessage } from '../../common/ipc/cs_postmessage'
import inspector from '../../common/inspector'
import * as C from '../../common/constant'
import { setIn, updateIn, until, parseQuery, objMap } from '../../common/utils'
import { bindContentEditableChange, isPositionFixed } from '../../common/dom_utils'
import { run, getElementByLocator } from '../../common/command_runner'
import { captureClientAPI } from '../../common/capture_screenshot'
import { encryptIfNeeded } from '../../common/encrypt'
import log from '../../common/log'
import { selectArea } from './select_area'

const MASK_CLICK_FADE_TIMEOUT = 2000
const oops = process.env.NODE_ENV === 'production'
                ? () => {}
                : (e) => log.error(e.stack)

const state = {
  status: C.CONTENT_SCRIPT_STATUS.NORMAL,
  // Note: it decides whether we're running commands
  // in the current window or some iframe/frame
  playingFrame: window,
  // Note: current frame stack when recording, it helps
  // to generate `selectFrame` commands
  recordingFrameStack: [],
  // Note: snapshot of extension config (content script cares about click/clickAt when recording)
  // It is supposed to be updated when user activates that page
  config: {}
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
    if (remove && factory)  return factory.clear()
    if (mask)               return mask

    factory = inspector.maskFactory()

    const maskClick   = factory.gen({ background: 'green', border: '2px solid purple' })
    const maskHover   = factory.gen({ background: '#ffa800', border: '2px solid purple' })

    addLogoImg(maskClick)
    addLogoImg(maskHover)

    console.log('maskClick', maskClick)

    mask = { maskClick, maskHover }

    document.body.appendChild(maskClick)
    document.body.appendChild(maskHover)

    return mask
  }
})()

const createLogoImg = () => {
  // Note: Ext.extension.getURL is available in content script, but not injected js
  // So there are cases when content_script.js is run as injected js, where `Ext.extension.getURL`
  // is not available
  // Weird enough, `Ext.extension.getURL` always works well in macOS
  const url   = Ext.extension.getURL ? Ext.extension.getURL('logo.png') : ''
  const img   = new Image()

  img.src     = url
  return img
}

const addWaitInCommand = (cmdObj) => {
  const { cmd } = cmdObj

  switch (cmd) {
    case 'click':
    case 'clickAt':
      return {...cmdObj, cmd: 'clickAndWait', value: ''}

    case 'select':
      return {...cmdObj, cmd: 'selectAndWait'}

    default:
      return cmdObj
  }
}

// report recorded commands to background.
// transform `leave` event to clickAndWait / selectAndWait event based on the last command
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
          obj = addWaitInCommand(last)
        } else {
          return
        }

        break
      }
      case 'click':
      case 'clickAt':
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

const highlightDom = ($dom, timeout) => {
  const mask = getMask()

  inspector.showMaskOver(mask.maskClick, $dom)

  setTimeout(() => {
    inspector.setStyle(mask.maskClick, { display: 'none' })
  }, timeout || MASK_CLICK_FADE_TIMEOUT)
}

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
    $text.innerText = parseFloat(rect.score).toFixed(2)

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
      document.body.appendChild($mask)
    }

    if (opts.scrollIntoView) {
      $mask.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }

    if (timeout && timeout > 0) {
      timer = setTimeout(() => {
        inspector.setStyle($mask, { display: 'none' })
      }, timeout)
    }

    return () => {
      inspector.setStyle($mask, { display: 'none' })
      $mask.remove()
    }
  }
}

const highlightRect = createHighlightRect()

const highlightRects = (function () {
  const topMatchedOptions = {
    rectStyle: {
      borderColor: '#ff00ff',
      color: '#ff00ff'
    }
  }
  let destroy

  return (rects, timeout) => {
    if (destroy)  destroy()
    const destroyFns = rects.map((rect, i) => createHighlightRect(i === 0 ? topMatchedOptions : {})(rect, timeout))
    destroy = () => destroyFns.forEach(destroy => destroy())
    return destroy
  }
})()

const onClick = (e) => {
  if (!isValidClick(e.target))  return

  const targetInfo = inspector.getLocator(e.target, true)

  log('onClick, switch  case', state.config.recordClickType)
  switch (state.config.recordClickType) {
    case 'clickAt':
      reportCommand({
        ...targetInfo,
        cmd: 'clickAt',
        value: (function () {
          const { clientX, clientY } = e
          const { top, left } = e.target.getBoundingClientRect()
          const x = Math.round(clientX - left)
          const y = Math.round(clientY - top)

          return `${x},${y}`
        })()
      })
      break

    case 'click':
    default:
      reportCommand({
        ...targetInfo,
        cmd: 'click'
      })
      break
  }
}

const onChange = (e) => {
  if (isValidSelect(e.target)) {
    const value = e.target.value
    const $option = Array.from(e.target.children).find($op => $op.value === value)

    reportCommand({
      cmd: 'select',
      value: 'label=' + inspector.domText($option).trim(),
      ...inspector.getLocator(e.target, true)
    })
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

const onDragDrop = (function () {
  let dragStart = null

  return (e) => {
    switch (e.type) {
      case 'dragstart': {
        dragStart = inspector.getLocator(e.target, true)
        break
      }
      case 'drop': {
        if (!dragStart) return
        const tmp   = inspector.getLocator(e.target, true)
        const drop  = {
          value: tmp.target,
          valueOptions: tmp.targetOptions
        }

        reportCommand({
          cmd: 'dragAndDropToObject',
          ...dragStart,
          ...drop
        })

        dragStart = null
      }
    }
  }
})()

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
  document.addEventListener('change', onChange, true)
  document.addEventListener('dragstart', onDragDrop, true)
  document.addEventListener('drop', onDragDrop, true)
  window.addEventListener('beforeunload', onLeave, true)

  unbindContentEditableEvents = bindContentEditableChange({ onChange: onContentEditableChange })
}

const unbindEventsToRecord = () => {
  document.removeEventListener('click', onClick, true)
  document.removeEventListener('change', onChange, true)
  document.removeEventListener('dragstart', onDragDrop, true)
  document.removeEventListener('drop', onDragDrop, true)
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
        return true

      case 'SET_STATUS': {
        updateStatus(args)
        return true
      }

      case 'DOM_READY':
        return waitForDomReady(false)

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
        highlightRect(args.scoredRect)
        return true
      }

      case 'HIGHLIGHT_RECTS': {
        highlightRects(args.scoredRects)
        return true
      }

      case 'CLEAR_VISION_RECTS': {
        // Note: it will clear previous rects
        highlightRects([])
        return true
      }

      case 'HACK_ALERT': {
        hackAlertConfirmPrompt()
        return true
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
        return selectArea({
          promise:  true,
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
  })

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
    log('onMessage', action, data, source)

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
          postMessage(window.parent, window, {
            action: 'RESET_PLAYING_FRAME',
            data: 'TOP'
          })
        }

        return true
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

      case 'SOURCE_BOUNDING_BOX_OFFSET': {
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
          action: 'SOURCE_BOUNDING_BOX_OFFSET',
          data: {}
        })
        .then(parentOffset => {
          return {
            x: rect.x + parentOffset.x,
            y: rect.y + parentOffset.y
          }
        })
      }
    }
  })
}

const bindInvokeEvent = () => {
  // Macros
  window.addEventListener('kantuRunMacro', (e) => {
    log('invoke event', e)
    window.dispatchEvent(new CustomEvent('kantuInvokeSuccess'))

    const queries = parseQuery(window.location.search)
    csIpc.ask('CS_INVOKE', { testCase: e.detail, options: queries })
    .catch(e => alert('[kantu] ' + e.message))
  })

  window.addEventListener('kantuSaveAndRunMacro', (e) => {
    log('save and run macro event', e)
    window.dispatchEvent(new CustomEvent('kantuInvokeSuccess'))

    const queries = parseQuery(window.location.search)
    const direct  = window.location.protocol === 'file:' && !!queries['direct']
    const agree   = direct || confirm('Kantu: Do you want to import and run this macro?\n\nNote: To run the macro without this confirmation box, add the \'?direct=1\' switch to the URL. Example: file:///xx/xx/macro.html?direct=1')

    if (agree) {
      csIpc.ask('CS_IMPORT_HTML_AND_INVOKE', {...e.detail, from: 'html', options: queries})
      .catch(e => alert('[kantu] ' + e.message))
    }
  })

  // Test Suites
  window.addEventListener('kantuRunTestSuite', (e) => {
    log('invoke event', e)
    window.dispatchEvent(new CustomEvent('kantuInvokeSuccess'))

    const queries = parseQuery(window.location.search)
    csIpc.ask('CS_INVOKE', { testSuite: e.detail, options: queries })
    .catch(e => alert('[kantu] ' + e.message))
  })
}

const hackAlertConfirmPrompt = (doc = document) => {
  const script = `
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
  `
  const s     = doc.constructor.prototype.createElement.call(doc, 'script')

  s.setAttribute('type', 'text/javascript')
  s.text = script

  doc.documentElement.appendChild(s)
  s.parentNode.removeChild(s)
}

const restoreAlertConfirmPrompt = () => {
  const script = `
    if (window.oldAlert)    window.alert = window.oldAlert
    if (window.oldConfirm)  window.confirm = window.oldConfirm
    if (window.oldPrompt)   window.prompt = window.oldPrompt
  `
  const s     = document.constructor.prototype.createElement.call(document, 'script')

  s.setAttribute('type', 'text/javascript')
  s.text = script

  document.documentElement.appendChild(s)
  s.parentNode.removeChild(s)
}

const init = () => {
  unbindEventsToRecord()
  bindEventsToRecord()

  bindEventsToInspect()
  bindOnMessage()
  loadConfig()

  // Note: only bind ipc events if it's the top window
  if (window.top === window) {
    bindIPCListener()
    bindInvokeEvent()
  } else {
    onUrlChange(init)
  }
}

const runCommand = (command) => {
  if (!command.cmd) {
    throw new Error('runCommand: must provide cmd')
  }

  // if it's an 'open' command, it must be executed in the top window
  if (state.playingFrame === window || command.cmd === 'open') {
    // Note: both top and inner frames could run commands here
    // So must use superCsIpc instead of csIpc
    const ret = run(command, superCsIpc, { highlightDom, hackAlertConfirmPrompt })

    // Note: `run` returns the contentWindow of the selected frame
    if (command.cmd === 'selectFrame') {
      return ret.then(({ frame }) => {
        // let outside window know that playingFrame has been changed, if it's parent or top
        if (frame !== window && (frame === window.top || frame === window.parent)) {
          postMessage(window.parent, window, {
            action: 'RESET_PLAYING_FRAME',
            data: frame === window.top ? 'TOP' : 'PARENT'
          })

          // set playingFrame to own window, get ready for later commands if any
          state.playingFrame = window
        } else {
          state.playingFrame = frame
        }

        return Promise.resolve({
          pageUrl: window.location.href,
          extra: command.extra
        })
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
    // log('passing command to frame...', state.playingFrame, '...', window.location.href)
    // Note: pass on the command if our window is not the current playing one
    return postMessage(state.playingFrame, window, {
      action: 'RUN_COMMAND',
      data: command
    })
  }
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
  storage.get('config')
  .then(config => {
    state.config = config

    // IMPORTANT: broadcast status change to all frames inside
    broadcastToAllFrames('UPDATE_CONFIG', config)    
  })
}

init()
