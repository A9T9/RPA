import glob2reg from 'kd-glob-to-regexp'
import { delay, until, toRegExp, insertScript, retry, ensureExtName, withCountDown } from './utils'
import { scrollLeft, scrollTop, domText, isVisible, cssSelector } from './dom_utils'
import { postMessage } from './ipc/cs_postmessage'
import Ext from './web_extension'
import log from './log'
import dragMock from './drag_mock'
import sendKeys from './send_keys'
import { decryptIfNeeded } from './encrypt'
import { LAST_SCREENSHOT_FILE_NAME } from './constant'

const HIGHLIGHT_TIMEOUT = 500

const globMatch = (pattern, text) => glob2reg(pattern).test(text)

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

const untilInjected = () => {
  const api = {
    eval: (code) => {
      log('sending INJECT_RUN_EVAL')
      return postMessage(window, window, { cmd: 'INJECT_RUN_EVAL', args: {code} }, '*', 5000)
      .then(data => {
        log('eval result', data)
        return data.result
      })
    }
  }
  const injected = !!document.body.getAttribute('data-injected')
  if (injected) return Promise.resolve(api)

  insertScript(Ext.extension.getURL('inject.js'))

  return retry(() => {
    log('sending INJECT_READY')
    return postMessage(window, window, { cmd: 'INJECT_READY' }, '*', 500)
  }, {
    shouldRetry: () => true,
    timeout: 5000,
    retryInterval: 0
  })()
  .then(() => api)
  .catch(e => {
    log(e.stack)
    throw new Error('fail to inject')
  })
}

const isElementFromPoint = (str) => /^#elementfrompoint/i.test(str.trim())

const pageCoordinateByElementFromPoint = (str) => {
  const reg = /^#elementfrompoint\s*\((\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\)/i
  const m   = str.trim().match(reg)

  if (!m) {
    throw new Error(`Invalid '#elementfrompoint' expression`)
  }

  const pageX = parseFloat(m[1])
  const pageY = parseFloat(m[2])

  if (pageX <= 0 || pageY <= 0) {
    throw new Error(`'#elementfrompoint' only accepts positive numbers`)
  }

  return [pageX, pageY]
}

const viewportCoordinateByElementFromPoint = (str) => {
  const [pageX, pageY] = pageCoordinateByElementFromPoint(str)
  const offset  = 0
  const x       = offset + pageX - scrollLeft(document)
  const y       = offset + pageY - scrollTop(document)

  return [x, y]
}

const elementByElementFromPoint = (str) => {
  const [x, y]  = viewportCoordinateByElementFromPoint(str)
  const el      = document.elementFromPoint(x, y)

  return el
}

// Note: parse the locator and return the element found accordingly
export const getElementByLocator = (str, shouldWaitForVisible) => {
  const i = str.indexOf('=')
  let el

  if ((/^\//.test(str))) {
    el = getElementByXPath(str)
  } else if (/^#elementfrompoint/i.test(str.trim())) {
    el = elementByElementFromPoint(str)
    log('elementfrompoint', el)
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
        const candidates = links.filter(a => globMatch(realVal, domText(a)))
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

  if (shouldWaitForVisible && !isVisible(el)) {
    throw new Error('getElementByLocator: element is found but not visible yet')
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

  // Note: can't return the contentWindow directly, because Promise 'resolve' will
  // try to test its '.then' method, which will cause a cross origin violation
  // so, we wrap it in an object
  return { frame: frameDom.contentWindow }
}

export const run = (command, csIpc, helpers) => {
  const { cmd, target, value, extra } = command
  const wrap = (fn, genOptions) => (...args) => {
    const options = genOptions(...args)

    return new Promise((resolve, reject) => {
      try {
        resolve(fn(...args))
      } catch (e) {
        reject(new Error(options.errorMsg(e.message)))
      }
    })
  }
  const getElementByLocatorWithLogForEfp = (locator) => {
    const el = getElementByLocator(locator)

    if (isElementFromPoint(locator)) {
      let elXpath = 'unkown'

      try {
        elXpath = helpers.xpath(el)
      } catch (e) {}

      const msg = `${locator} => xpath "${elXpath}"`

      console.log(msg, el)
      csIpc.ask('CS_ADD_LOG', { info: msg })
    }

    return el
  }
  const __getFrameByLocator = wrap(getFrameByLocator, (locator) => ({
    errorMsg: (msg) => {
      return `timeout reached when looking for frame '${locator}'`
    }
  }))
  const __getElementByLocator = wrap(getElementByLocatorWithLogForEfp, (locator) => ({
    errorMsg: (msg) => {
      if (/element is found but not visible yet/.test(msg)) {
        return `element is found but not visible yet for '${locator}' (use !WaitForVisible = false to disable waiting for visible)`
      }

      return `timeout reached when looking for element '${locator}'`
    }
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
          if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' })
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
        dragMock.triggerDragEvent($src, $tgt)
        return true
      })
    }

    case 'waitForVisible': {
      return __getElementByLocator(target, true)
      .then(() => true)
    }

    case 'clickAt': {
      const getIframeOffset = () => {
        if (window === window.top) {
          return Promise.resolve({ x: 0, y: 0 })
        }

        return postMessage(window.parent, window, {
          action: 'SOURCE_PAGE_OFFSET',
          data: {}
        })
      }
      const isEfp   = isElementFromPoint(target)
      const pTarget = (function () {
        if (!isEfp) return Promise.resolve(target)
        return getIframeOffset()
        .then(iframeOffset => {
          log('iframeOffset', iframeOffset)
          const [x, y] = viewportCoordinateByElementFromPoint(target)
          return `#elementfrompoint (${x - iframeOffset.x}, ${y - iframeOffset.y})`
        })
      })()

      return pTarget.then(target => {
        return __getElementByLocator(target, extra.waitForVisible)
        .then(el => {
          if (!/^\d+\s*,\s*\d+$/.test(value) && !isElementFromPoint(target)) {
            throw new Error(`invalid offset for clickAt: ${value}`)
          }

          const scrollAndHighlight = () => {
            try {
              if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' })
              if (extra.playHighlightElements)      helpers.highlightDom(el, HIGHLIGHT_TIMEOUT)
            } catch (e) {
              log.error('error in scroll and highlight')
            }
          }

          const [origClientX, origClientY] = (function () {
            if (isEfp) {
              return viewportCoordinateByElementFromPoint(target)
            } else {
              const [x, y]        = value.split(',').map(str => parseInt(str.trim(), 10))
              const { top, left } = viewportOffset(el)
              return [left + x, top + y]
            }
          })()

          const lastScrollX   = window.scrollX
          const lastScrollY   = window.scrollY

          if (!isEfp) scrollAndHighlight()

          const clientX       = origClientX + (lastScrollX - window.scrollX)
          const clientY       = origClientY + (lastScrollY - window.scrollY)

          log('clickAt clientX/clientY', clientX, clientY)

          ;['mousedown', 'mouseup', 'click'].forEach(eventType => {
            el.dispatchEvent(
              new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX,
                clientY
              })
            )
          })

          // Note: delay scroll and highlight for efp,
          // otherwise that scroll could mess up the whole coodirnate calculation
          if (isEfp) scrollAndHighlight()

          return true
        })
      })
    }

    case 'click':
    case 'clickAndWait': {
      return __getElementByLocator(target, extra.waitForVisible)
      .then(el => {
        try {
          if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' })
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
      return __getElementByLocator(target, extra.waitForVisible)
      .then(el => {
        const options     = [].slice.call(el.getElementsByTagName('option'))
        const i           = value.indexOf('=')
        const optionType  = value.substring(0, i)
        const optionValue = value.substring(i + 1)

        const option = (function () {
          switch (optionType) {
            case 'label':
              return options.find(op => globMatch(optionValue, domText(op).trim()))

            case 'index':
              return options.find((_, index) => index === parseInt(optionValue))

            case 'id':
              return options.find((op, index) => op.id === optionValue)

            case 'value':
              return options.find(op => op.value === optionValue)

            default:
              throw new Error(`Option type "${optionType}" not supported`)
          }
        })()

        if (!option) {
          throw new Error(`cannot find option with '${value}'`)
        }

        if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' })
        if (extra.playHighlightElements)      helpers.highlightDom(el, HIGHLIGHT_TIMEOUT)

        el.value = option.value
        el.dispatchEvent(new Event('change'))

        return true
      })
    }

    case 'type': {
      return __getElementByLocator(target, extra.waitForVisible)
      .then(el => {
        const tag = el.tagName.toLowerCase()

        if (tag !== 'input' && tag !== 'textarea') {
          throw new Error('run command: element found is neither input nor textarea')
        }

        if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' })
        if (extra.playHighlightElements)      helpers.highlightDom(el, HIGHLIGHT_TIMEOUT)

        // Note: need the help of chrome.debugger to set file path to file input
        if (el.type && el.type.toLowerCase() === 'file') {
          if (Ext.isFirefox()) {
            throw new Error('Setting file path fo file inputs is not supported by Firefox extension api yet')
          }

          return csIpc.ask('CS_SET_FILE_INPUT_FILES', {
            files:    value.split(';'),
            selector: cssSelector(el)
          })
        }

        return decryptIfNeeded(value, el)
        .then(realValue => {
          el.value = ''
          sendKeys(el, realValue, true)

          el.value = realValue
          el.dispatchEvent(new Event('change'))
          return true
        })
      })
      .catch(e => {
        if (/This input element accepts a filename/i.test(e.message)) {
          throw new Error('Sorry, upload can not be automated Chrome (API limitation).')
        }

        throw e
      })
    }

    case 'editContent': {
      return __getElementByLocator(target, extra.waitForVisible)
      .then(el => {
        if (el.contentEditable !== 'true') {
          throw new Error(`Target is not contenteditable`)
        }

        if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' })
        if (extra.playHighlightElements)      helpers.highlightDom(el, HIGHLIGHT_TIMEOUT)

        el.innerHTML = value
        return true
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

    case 'verifyText': {
      return __getElementByLocator(target)
      .then(el => {
        const text  = domText(el)

        if (!globMatch(value, text)) {
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
      if (!globMatch(target, document.title)) {
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

    case 'verifyChecked': {
      return __getElementByLocator(target)
      .then(el => {
        const checked  = !!el.checked

        if (!checked) {
          return {
            log: {
              error: `'${target}' is not checked`
            }
          }
        }
      })
    }

    case 'verifyAttribute': {
      const index = target.lastIndexOf('@')

      if (index === -1) {
        throw new Error(`invalid target for verifyAttribute - ${target}`)
      }

      const locator   = target.substr(0, index)
      const attrName  = target.substr(index + 1)

      return __getElementByLocator(locator)
      .then(el => {
        const attr = el.getAttribute(attrName)

        if (!globMatch(value, attr)) {
          return {
            log: {
              error: `attribute not matched, \n\texpected: "${value}", \n\tactual: "${attr}"`
            }
          }
        }
      })
    }

    case 'verifyError': {
      if (extra.lastCommandOk) {
        return {
          log: {
            error: target
          }
        }
      }

      return true
    }

    case 'assertText': {
      return __getElementByLocator(target)
      .then(el => {
        const text  = domText(el)

        if (!globMatch(value, text)) {
          throw new Error(`text not matched, \n\texpected: "${value}", \n\tactual: "${text}"`)
        }

        return true
      })
    }

    case 'assertTitle': {
      if (!globMatch(target, document.title)) {
        throw new Error(`title not matched, \n\texpected: "${target}", \n\tactual: "${document.title}"`)
      }

      return true
    }

    case 'assertElementPresent': {
      return __getElementByLocator(target)
      .then(() => true)
    }

    case 'assertChecked': {
      return __getElementByLocator(target)
      .then(el => {
        const checked  = !!el.checked

        if (!checked) {
          throw new Error(`'${target}' is not checked`)
        }
      })
    }

    case 'assertAttribute': {
      const index = target.lastIndexOf('@')

      if (index === -1) {
        throw new Error(`invalid target for assertAttribute - ${target}`)
      }

      const locator   = target.substr(0, index)
      const attrName  = target.substr(index + 1)

      return __getElementByLocator(locator)
      .then(el => {
        const attr = el.getAttribute(attrName)

        if (!globMatch(value, attr)) {
          throw new Error(`attribute not matched, \n\texpected: "${value}", \n\tactual: "${attr}"`)
        }
      })
    }

    case 'assertError': {
      if (extra.lastCommandOk) {
        throw new Error(target)
      }

      return true
    }

    case 'assertAlert': {
      const msg = document.body.getAttribute('data-alert')

      if (!msg) {
        throw new Error('no alert found!')
      }

      if (!globMatch(target, msg)) {
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

      if (!globMatch(target, msg)) {
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

      if (!globMatch(target, msg)) {
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
      return untilInjected()
      .then(api => {
        return api.eval(target)
        .then(result => ({
          vars: {
            [value]: result
          }
        }))
        .catch(e => {
          throw new Error(`Error in runEval code: ${e.message}`)
        })
      })
    }

    case 'storeValue': {
      return __getElementByLocator(target)
      .then(el => {
        const text  = el.value || ''

        return {
          vars: {
            [value]: text
          }
        }
      })
    }

    case 'storeChecked': {
      return __getElementByLocator(target)
      .then(el => {
        const checked  = !!el.checked

        return {
          vars: {
            [value]: checked
          }
        }
      })
    }

    case 'verifyValue': {
      return __getElementByLocator(target)
      .then(el => {
        const text  = el.value

        if (!globMatch(value, text)) {
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

        if (!globMatch(value, text)) {
          throw new Error(`value not matched, \n\texpected: "${value}", \n\tactual: "${text}"`)
        }

        return true
      })
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
                  : csIpc.ask('CS_SELECT_WINDOW', { target, value })

      // Note: let `selectWindow` pass through cs and back to background,
      // to keep the flow more consistent with the other commands
      return p.then(() => true)
    }

    case 'sourceSearch':
    case 'sourceExtract': {
      if (!target) {
        throw new Error('Must provide text / regular expression to search for')
      }

      if (!value) {
        throw new Error('Must specify a variable to save the result')
      }

      const getMatchAndCaptureIndex = (str) => {
        const nonZeroIndex = (n, offset = 0) => {
          if (n === undefined)  return 0
          return Math.max(0, parseInt(n, 10) + offset)
        }
        const m = /@\s*(\d+)(?:\s*,\s*(\d+))?\s*$/.exec(str)

        if (!m) {
          return {
            rest:         str,
            matchIndex:   0,
            captureIndex: 0
          }
        }

        return {
          rest:         str.substring(0, m.index),
          matchIndex:   nonZeroIndex(m[1], -1),
          captureIndex: nonZeroIndex(m[2])
        }
      }

      // Note: get matchIndex captureIndex first, no matter it's for regexp or simple text
      const { rest, matchIndex, captureIndex } = getMatchAndCaptureIndex(target)

      if (cmd === 'sourceSearch' && rest !== target) {
        throw new Error('The @ parameter is only supported in sourceExtract')
      }

      const regexp = (function () {
        if (!/^regex(=|:)/i.test(rest))  return null

        const raw         = rest.replace(/^regex(=|:)/i, '')
        const regexpText  = raw.replace(/^\/|\/g?$/g, '')

        return toRegExp(
          regexpText,
          { needEncode: false, flag: 'g' }
        )
      })()
      const regexpForText = (function () {
        if (regexp) return null
        const raw = rest.replace(/^text(=|:)/i, '')

        if (cmd === 'sourceExtract' && !/\*/.test(raw)) {
          throw new Error('Missing * or REGEX in sourceExtract. Extracting a plain text doesn\'t make much sense')
        }

        return glob2reg(raw, { capture: true, flags: 'g' })
      })()
      const matches = (function () {
        const html    = document.documentElement.outerHTML
        const reg     = regexp || regexpForText
        const result  = []
        let m

        // eslint-disable-next-line no-cond-assign
        while (m = reg.exec(html)) {
          result.push(m)

          // Note: save some energy, if it's already enough to get what users want
          if (cmd === 'sourceExtract' && result.length >= matchIndex + 1) {
            break
          }
        }

        return result
      })()

      log('matches', matches, regexp, regexpForText)

      if (cmd === 'sourceSearch') {
        return {
          vars: {
            [value]: matches.length
          }
        }
      }

      if (cmd === 'sourceExtract') {
        const guard   = str => str !== undefined ? str : '#nomatchfound'

        return {
          vars: {
            [value]: guard(
              (matches[matchIndex] || [])[captureIndex]
            )
          }
        }
      }

      throw new Error('Impossible to reach here')
    }

    case 'visionLimitSearchArea':
    case 'storeImage': {
      const run = (locator, fileName) => {
        return __getElementByLocator(locator)
        .then(el => {
          if (!fileName || !fileName.length) {
            throw new Error(`storeImage: 'value' is required as image name`)
          }

          const clientRect = el.getBoundingClientRect()
          const pSourceOffset = (function () {
            if (window.top === window) {
              return Promise.resolve({ x: 0, y: 0 })
            }

            // Note: it's too complicated to take screenshot of element deep in iframe stack
            // if you have to scroll each level of iframe to get the full image of it.
            el.scrollIntoView()

            return postMessage(window.parent, window, {
              action: 'SOURCE_PAGE_OFFSET',
              data: {}
            })
          })()

          return pSourceOffset.then(sourceOffset => {
            const rect = {
              x:      sourceOffset.x + clientRect.x + scrollLeft(document),
              y:      sourceOffset.y + clientRect.y + scrollTop(document),
              width:  clientRect.width,
              height: clientRect.height
            }

            return csIpc.ask('CS_STORE_SCREENSHOT_IN_SELECTION', {
              rect,
              fileName: ensureExtName('.png', fileName),
              devicePixelRatio: window.devicePixelRatio
            })
            .then(() => ({
              vars: {
                '!storedImageRect': rect
              }
            }))
          })
        })
      }

      let locator, fileName

      if (cmd === 'storeImage') {
        locator   = target
        fileName  = value
      } else if (cmd === 'visionLimitSearchArea') {
        locator   = target.trim().replace(/^element:/i, '').trim()
        fileName  = LAST_SCREENSHOT_FILE_NAME
      }

      return run(locator, fileName)
    }

    case 'captureScreenshot': {
      if (!target || !target.length) {
        throw new Error(`captureScreenshot: 'target' is required as file name`)
      }

      return csIpc.ask('CS_CAPTURE_SCREENSHOT', { fileName: ensureExtName('.png', target) })
      .then(({ fileName, url }) => ({
        screenshot: {
          url,
          name: fileName
        }
      }))
    }

    case 'captureEntirePageScreenshot': {
      if (!target || !target.length) {
        throw new Error(`captureEntirePageScreenshot: 'target' is required as file name`)
      }

      return csIpc.ask('CS_CAPTURE_FULL_SCREENSHOT', { fileName: ensureExtName('.png', target) })
      .then(({ fileName, url }) => ({
        screenshot: {
          url,
          name: fileName
        }
      }))
    }

    case 'onDownload': {
      return csIpc.ask('CS_ON_DOWNLOAD', {
        fileName: target,
        wait: (value || '').trim() === 'true',
        timeout: extra.timeoutDownload * 1000,
        timeoutForStart: Math.max(10, extra.timeoutElement) * 1000
      })
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
