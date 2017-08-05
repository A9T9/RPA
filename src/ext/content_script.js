import csIpc from '../common/ipc/ipc_cs'
import inspector from '../common/inspector'
import * as C from '../common/constant'
import { setIn, until } from '../common/utils'
import { run, getElementByLocator } from '../common/command_runner'

const MASK_CLICK_FADE_TIMEOUT = 2000

const state = {
  status: C.CONTENT_SCRIPT_STATUS.NORMAL
}

// Two masks to show on page
// 1. mask on click
// 2. mask on hover
const getMask = (function () {
  let mask, factory

  return (remove) => {
    if (remove && factory)  return factory.clear()
    if (mask)               return mask

    factory = inspector.maskFactory()

    const maskClick   = factory.gen({ background: 'green' })
    const maskHover   = factory.gen({ background: '#ffa800' })

    mask = { maskClick, maskHover }

    document.body.appendChild(maskClick)
    document.body.appendChild(maskHover)

    return mask
  }
})()

const addWaitInCommand = (cmdObj) => {
  const { cmd } = cmdObj

  switch (cmd) {
    case 'click':
      return {...cmdObj, cmd: 'clickAndWait'}

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

    console.log('to report', obj)

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
      case 'select': {
        timer = setTimeout(() => {
          csIpc.ask('CS_RECORD_ADD_COMMAND', obj)
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

    csIpc.ask('CS_RECORD_ADD_COMMAND', obj)
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

const highlightDom = ($dom) => {
  const mask = getMask()

  inspector.showMaskOver(mask.maskClick, $dom)

  setTimeout(() => {
    inspector.setStyle(mask.maskClick, { display: 'none' })
  }, MASK_CLICK_FADE_TIMEOUT)
}

const onClick = (e) => {
  if (!isValidClick(e.target))  return

  reportCommand({
    cmd: 'click',
    target: inspector.getLocator(e.target)
  })
}

const onChange = (e) => {
  if (isValidSelect(e.target)) {
    const value = e.target.value
    const $option = Array.from(e.target.children).find($op => $op.value === value)

    reportCommand({
      cmd: 'select',
      target: inspector.getLocator(e.target),
      value: 'label=' + $option.textContent
    })
  } else if (isValidType(e.target)) {
    reportCommand({
      cmd: 'type',
      target: inspector.getLocator(e.target),
      value: e.target.value
    })
  }
}

const onLeave = (e) => {
  reportCommand({
    cmd: 'leave',
    target: null,
    value: null
  })
}

const bindEventsToRecord = () => {
  document.addEventListener('click', onClick)
  document.addEventListener('change', onChange)
  window.addEventListener('beforeunload', onLeave)
}

const unbindEventsToRecord = () => {
  document.removeEventListener('click', onClick)
  document.removeEventListener('change', onChange)
  window.removeEventListener('beforeunload', onLeave)
}

const waitForDomReady = (accurate) => {
  return until('dom ready', () => {
    return {
      pass: ['complete', 'interactive'].slice(0, accurate ? 1 : 2).indexOf(document.readyState) !== -1,
      result: true
    }
  }, 1000, 6000 * 10)
}

const init = () => {
  bindEventsToRecord()

  csIpc.onAsk((cmd, args) => {
    console.log(cmd, args)

    switch (cmd) {
      case 'HEART_BEAT':
        return true

      case 'SET_STATUS':
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

        return true

      case 'DOM_READY':
        return waitForDomReady(true)

      case 'RUN_COMMAND':
        return runCommand(args.command, csIpc)

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
        highlightDom($el)
        return true
      }

      default:
        throw new Error('cmd not supported: ' + cmd)
    }
  })

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

        return csIpc.ask('CS_DONE_INSPECTING', {
          xpath: inspector.getLocator(e.target)
        })
      }

      default:
        break
    }
  })

  // bind mouse over event for applying for a inspector role
  document.addEventListener('mouseover', (e) => {
    if (state.status === C.CONTENT_SCRIPT_STATUS.NORMAL) {
      return csIpc.ask('CS_ACTIVATE_ME', {})
    }
  })

  // bind mouse move event to show hover mask in inspecting
  document.addEventListener('mousemove', (e) => {
    if (state.status !== C.CONTENT_SCRIPT_STATUS.INSPECTING)  return

    const mask = getMask()
    inspector.showMaskOver(mask.maskHover, e.target)
  })
}

const runCommand = (command, csIpc) => {
  if (!command.cmd) {
    throw new Error('runCommand: must provide cmd')
  }

  return run(command, csIpc)
}

init()
