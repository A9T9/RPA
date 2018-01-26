import { delay, until } from './utils'
import Ext from './web_extension'
import log from './log'
import dragMock from './drag_mock'
import sendKeys from './send_keys'
import inspector from './inspector'

const { domText } = inspector
const HIGHLIGHT_TIMEOUT = 500

const getElementByXPath = (xpath) => {
  const snapshot = document.evaluate(
    xpath,
    document.body,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  )

  return snapshot.snapshotItem(0)
}

// reference: https://github.com/timoxley/offset
const viewportOffset = (el) => {
  const box         = el.getBoundingClientRect()

  // Note: simply use bouddingClientRect since elementFromPoint uses
  // the same top/left relative to the current viewport/window instead of whole document
  return {
    top: box.top,
    left: box.left
  }
}

// Note: parse the locator and return the element found accordingly
export const getElementByLocator = (str) => {
  const i = str.indexOf('=')
  let el

  if ((/^\//.test(str))) {
    el = getElementByXPath(str)
  } else if (i === -1) {
    throw new Error('getElementByLocator: invalid locator, ' + str)
  } else {
    const method  = str.substr(0, i)
    const value   = str.substr(i + 1)

    switch (method && method.toLowerCase()) {
      case 'id':
        el = document.getElementById(value)
        break

      case 'name':
        el = document.getElementsByName(value)[0]
        break

      case 'identifier':
        el = document.getElementById(value) || document.getElementsByName(value)[0]
        break

      case 'link': {
        const links = [].slice.call(document.getElementsByTagName('a'))
        // Note: there are cases such as 'link=exact:xxx'
        let realVal = value.replace(/^exact:/, '')
        // Note: position support. eg. link=Download@POS=3
        let match   = realVal.match(/^(.+)@POS=(\d+)$/i)
        let index   = 0

        if (match) {
          realVal = match[1]
          index   = parseInt(match[2]) - 1
        }

        // Note: use textContent instead of innerText to avoid influence from text-transform
        const candidates = links.filter(a => domText(a) === realVal)
        el = candidates[index]
        break
      }

      case 'css':
        el = document.querySelector(value)
        break

      case 'xpath':
        el = getElementByXPath(value)
        break

      default:
        throw new Error('getElementByLocator: unsupported locator method, ' + method)
    }
  }

  if (!el) {
    throw new Error('getElementByLocator: fail to find element based on the locator, ' + str)
  }

  return el
}

export const getFrameByLocator = (str, helpers) => {
  const i = str.indexOf('=')

  // Note: try to parse format of 'index=0' and 'relative=top/parent'
  if (i !== -1) {
    const method  = str.substr(0, i)
    const value   = str.substr(i + 1)

    switch (method) {
      case 'index': {
        const index   = parseInt(value, 10)
        const frames  = window.frames
        const frame   = frames[index]

        if (!frame) {
          throw new Error(`Frame index out of range (index ${value} in ${frames.length} frames`)
        }

        return { frame }
      }

      case 'relative': {
        if (value === 'top') {
          return { frame: window.top }
        }

        if (value === 'parent') {
          return { frame: window.parent }
        }

        throw new Error('Unsupported relative type, ' + value)
      }
    }
  }

  // Note: consider it as name, if no '=' found and it has no xpath pattern
  if (i === -1 && !/^\//.test(str)) {
    str = 'name=' + str
  }

  const frameDom = getElementByLocator(str)

  if (!frameDom || !frameDom.contentWindow) {
    throw new Error(`The element found based on ${str} is NOT a frame/iframe`)
  }

  // Note: for those iframe/frame that don't have src, they won't load content_script.js
  // so we have to inject the script by ourselves
  if (!frameDom.getAttribute('src')) {
    const file  = Ext.extension.getURL('content_script.js')
    const doc   = frameDom.contentDocument
    const s     = doc.constructor.prototype.createElement.call(doc, 'script')

    s.setAttribute('type', 'text/javascript')
    s.setAttribute('src', file)

    doc.documentElement.appendChild(s)
    s.parentNode.removeChild(s)

    helpers.hackAlertConfirmPrompt(doc)
  }

  // Note: can't reurn the contentWindow directly, because Promise 'resolve' will
  // try to test its '.then' method, which will cause a cross origin violation
  // so, we wrap it in an object
  return { frame: frameDom.contentWindow }
}

export const run = (command, csIpc, helpers) => {
  const { cmd, target, value, extra } = command
  const delayWithTimeoutStatus = (type, timeout, promise) => {
    return new Promise((resolve, reject) => {
      let past = 0

      const timer = setInterval(() => {
        past += 1000
        csIpc.ask('CS_TIMEOUT_STATUS', {
          type,
          total: timeout,
          past
        })

        if (past >= timeout) {
          clearInterval(timer)
        }
      }, 1000)

      const p = promise.then(val => {
        clearInterval(timer)
        return val
      })

      resolve(p)
    })
  }
  const wrap = (fn, genOptions) => (...args) => {
    const options = genOptions(...args)

    return new Promise((resolve, reject) => {
      try {
        resolve(fn(...args))
      } catch (e) {
        reject(new Error(options.errorMsg))
      }
    })
  }
  const __getFrameByLocator = wrap(getFrameByLocator, (locator) => ({
    errorMsg: `time out when looking for frame '${locator}'`
  }))
  const __getElementByLocator = wrap(getElementByLocator, (locator) => ({
    errorMsg: `time out when looking for element '${locator}'`
  }))

  switch (cmd) {
    case 'open':
      if (window.noCommandsYet) {
        return true
      }

      return until('document.body', () => {
        return {
          pass: !!document.body,
          result: document.body
        }
      })
      .then(body => {
        window.location.href = command.target
        return true
      })

    case 'refresh':
      setTimeout(() => window.location.reload(), 0)
      return true

    case 'mouseOver': {
      return __getElementByLocator(target)
      .then(el => {
        try {
          if (extra.playScrollElementsIntoView) el.scrollIntoView()
          if (extra.playHighlightElements)      helpers.highlightDom(el, HIGHLIGHT_TIMEOUT)
        } catch (e) {
          log.error('error in scroll and highlight', e.message)
        }

        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
        return true
      })
    }

    case 'dragAndDropToObject': {
      return Promise.all([
        __getElementByLocator(target),
        __getElementByLocator(value)
      ])
      .then(([$src, $tgt]) => {
        dragMock.dragStart($src).drop($tgt)
        return true
      })
    }

    case 'clickAt': {
      return __getElementByLocator(target)
      .then(el => {
        if (!/^\d+\s*,\s*\d+$/.test(value)) {
          throw new Error(`invalid offset for clickAt: ${value}`)
        }

        const [x, y]        = value.split(',').map(str => parseInt(str.trim(), 10))
        const { top, left } = viewportOffset(el)
        const vx            = left + x
        const vy            = top + y
        const elToClick     = document.elementFromPoint(vx, vy)

        if (!elToClick) {
          throw new Error('Not able to find an element to click')
        }

        try {
          if (extra.playScrollElementsIntoView) elToClick.scrollIntoView()
          if (extra.playHighlightElements)      helpers.highlightDom(elToClick, HIGHLIGHT_TIMEOUT)
        } catch (e) {
          log.error('error in scroll and highlight')
        }

        elToClick.click()
        return true
      })
    }

    case 'click':
    case 'clickAndWait': {
      return __getElementByLocator(target)
      .then(el => {
        try {
          if (extra.playScrollElementsIntoView) el.scrollIntoView()
          if (extra.playHighlightElements)      helpers.highlightDom(el, HIGHLIGHT_TIMEOUT)
        } catch (e) {
          log.error('error in scroll and highlight')
        }

        el.click()
        return true
      })
    }

    case 'select':
    case 'selectAndWait': {
      return __getElementByLocator(target)
      .then(el => {
        const text    = value.replace(/^label=/, '')
        const options = [].slice.call(el.getElementsByTagName('option'))
        const option  = options.find(op => domText(op) === text)

        if (!option) {
          throw new Error(`cannot find option with label '${text}'`)
        }

        if (extra.playScrollElementsIntoView) el.scrollIntoView()
        if (extra.playHighlightElements)      helpers.highlightDom(el, HIGHLIGHT_TIMEOUT)

        el.value = option.value
        el.dispatchEvent(new Event('change'))

        return true
      })
    }

    case 'type': {
      return __getElementByLocator(target)
      .then(el => {
        const tag = el.tagName.toLowerCase()

        if (tag !== 'input' && tag !== 'textarea') {
          throw new Error('run command: element found is neither input nor textarea')
        }

        if (extra.playScrollElementsIntoView) el.scrollIntoView()
        if (extra.playHighlightElements)      helpers.highlightDom(el, HIGHLIGHT_TIMEOUT)

        // Note: need the help of chrome.debugger to set file path to file input
        if (el.type && el.type.toLowerCase() === 'file') {
          return csIpc.ask('CS_SET_FILE_INPUT_FILES', {
            files:    value.split(';'),
            selector: inspector.selector(el)
          })
        }

        el.value = value
        el.dispatchEvent(new Event('change'))

        return true
      })
      .catch(e => {
        if (/This input element accepts a filename/i.test(e.message)) {
          throw new Error('Sorry, upload can not be automated Chrome (API limitation).')
        }

        throw e
      })
    }

    case 'selectFrame': {
      return __getFrameByLocator(target, helpers)
      .then(frameWindow => {
        if (!frameWindow) {
          throw new Error('Invalid frame/iframe')
        }

        return frameWindow
      })
    }

    case 'pause': {
      const n = parseInt(target)

      if (isNaN(n) || n <= 0) {
        throw new Error('target of pause command must be a positive integer')
      }

      return delayWithTimeoutStatus('pause', n, delay(() => true, n))
    }

    case 'verifyText': {
      return __getElementByLocator(target)
      .then(el => {
        const text  = domText(el)

        if (text !== value) {
          return {
            log: {
              error: `text not matched, \n\texpected: "${value}", \n\tactual: "${text}"`
            }
          }
        }

        return true
      })
    }

    case 'verifyTitle': {
      if (target !== document.title) {
        return {
          log: {
            error: `title not matched, \n\texpected: "${target}", \n\tactual: "${document.title}"`
          }
        }
      }

      return true
    }

    case 'verifyElementPresent': {
      const { timeoutElement, retryInfo } = extra || {}

      return __getElementByLocator(target)
      .then(
        () => true,
        (e) => {
          const shotsLeft     = (timeoutElement * 1000 / retryInfo.retryInterval) - retryInfo.retryCount
          const isLastChance  = shotsLeft <= 1

          if (isLastChance) {
            return {
              log: {
                error: `'${target}' element not present`
              }
            }
          }

          throw e
        }
      )
    }

    case 'assertText': {
      return __getElementByLocator(target)
      .then(el => {
        const text  = domText(el)

        if (text !== value) {
          throw new Error(`text not matched, \n\texpected: "${value}", \n\tactual: "${text}"`)
        }

        return true
      })
    }

    case 'assertTitle': {
      if (target !== document.title) {
        throw new Error(`title not matched, \n\texpected: "${target}", \n\tactual: "${document.title}"`)
      }

      return true
    }

    case 'assertElementPresent': {
      return __getElementByLocator(target)
      .then(() => true)
    }

    case 'assertAlert': {
      const msg = document.body.getAttribute('data-alert')

      if (!msg) {
        throw new Error('no alert found!')
      }

      if (target !== '*' && msg !== target) {
        throw new Error(`unmatched alert msg, \n\texpected: "${target}", \n\tactual: "${msg}"`)
      }

      document.body.setAttribute('data-alert', '')
      return true
    }

    case 'assertConfirmation': {
      const msg = document.body.getAttribute('data-confirm')

      if (!msg) {
        throw new Error('no confirm found!')
      }

      if (target !== '*' && msg !== target) {
        throw new Error(`unmatched confirm msg, \n\texpected: "${target}", \n\tactual: "${msg}"`)
      }

      document.body.setAttribute('data-confirm', '')
      return true
    }

    case 'assertPrompt': {
      const msg = document.body.getAttribute('data-prompt')

      if (!msg) {
        throw new Error('no prompt found!')
      }

      if (target !== '*' && msg !== target) {
        throw new Error(`unmatched prompt msg, \n\texpected: "${target}", \n\tactual: "${msg}"`)
      }

      document.body.setAttribute('data-prompt', '')
      return true
    }

    case 'answerOnNextPrompt': {
      document.body.setAttribute('data-prompt-answer', target)
      return true
    }

    case 'waitForPageToLoad':
      return true

    case 'store':
      return {
        vars: {
          [value]: target
        }
      }

    case 'storeTitle': {
      return {
        vars: {
          [value]: document.title
        }
      }
    }

    case 'storeText': {
      return __getElementByLocator(target)
      .then(el => {
        return {
          vars: {
            [value]: domText(el)
          }
        }
      })
    }

    case 'storeAttribute': {
      const index = target.lastIndexOf('@')

      if (index === -1) {
        throw new Error(`invalid target for storeAttribute - ${target}`)
      }

      const locator   = target.substr(0, index)
      const attrName  = target.substr(index + 1)

      return __getElementByLocator(locator)
      .then(el => {
        const attr = el.getAttribute(attrName)

        if (!attr) {
          throw new Error(`missing attribute '${attrName}'`)
        }

        return {
          vars: {
            [value]:  attr
          }
        }
      })
    }

    case 'storeEval': {
      try {
        return {
          vars: {
            // eslint-disable-next-line no-eval
            [value]: window.eval(target)
          }
        }
      } catch (e) {
        throw new Error(`Error in runEval code: ${e.message}`)
      }
    }

    case 'storeValue': {
      return __getElementByLocator(target)
      .then(el => {
        const text  = el.value

        if (!text) {
          throw new Error('value not found')
        }

        return {
          vars: {
            [value]: text
          }
        }
      })
    }

    case 'verifyValue': {
      return __getElementByLocator(target)
      .then(el => {
        const text  = el.value

        if (text !== value) {
          return {
            log: {
              error: `value not matched, \n\texpected: "${value}", \n\tactual: "${text}"`
            }
          }
        }

        return true
      })
    }

    case 'assertValue': {
      return __getElementByLocator(target)
      .then(el => {
        const text  = el.value

        if (text !== value) {
          throw new Error(`value not matched, \n\texpected: "${value}", \n\tactual: "${text}"`)
        }

        return true
      })
    }

    case 'echo': {
      return {
        log: {
          info: target
        }
      }
    }

    case 'sendKeys': {
      return __getElementByLocator(target)
      .then(el => {
        sendKeys(el, value)
        return true
      })
    }

    case 'selectWindow': {
      const p = target && target.toUpperCase() === 'TAB=CLOSEALLOTHER'
                  ? csIpc.ask('CS_CLOSE_OTHER_TABS', {})
                  : csIpc.ask('CS_SELECT_WINDOW', { target })

      // Note: let `selectWindow` pass through cs and back to background,
      // to keep the flow more consistent with the other commands
      return p.then(() => true)
    }

    case 'captureScreenshot': {
      return csIpc.ask('CS_CAPTURE_SCREENSHOT', { target })
      .then(url => ({
        screenshot: {
          url,
          name: target || url.split('/').slice(-1)[0]
        }
      }))
    }

    case 'captureEntirePageScreenshot': {
      return csIpc.ask('CS_CAPTURE_FULL_SCREENSHOT', { target })
      .then(url => ({
        screenshot: {
          url,
          name: target || url.split('/').slice(-1)[0]
        }
      }))
    }

    case 'deleteAllCookies': {
      return csIpc.ask('CS_DELETE_ALL_COOKIES', {
        url: window.location.origin
      })
      .then(() => true)
    }

    case 'if':
    case 'while':
    case 'gotoIf': {
      try {
        return {
          // eslint-disable-next-line no-eval
          condition: window.eval(target)
        }
      } catch (e) {
        throw new Error(`Error in runEval condition of ${cmd}: ${e.message}`)
      }
    }

    default:
      throw new Error(`Command ${cmd} not supported yet`)
  }
}
