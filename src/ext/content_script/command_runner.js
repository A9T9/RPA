import isElementEditable from 'dom-element-is-natively-editable'
import glob2reg from 'kd-glob-to-regexp'
import { globMatch } from '../../common/glob'
import { until, toRegExp, ensureExtName } from '../../common/utils'
import {
  scrollLeft, scrollTop, domText, isEditable, cssSelector, getAncestor,
  getElementsByXPath, getElementByLocator,
  isElementFromPoint, viewportCoordinateByElementFromPoint
} from '../../common/dom_utils'
import { compose, partial, uniqueStrings } from '../../common/ts_utils'
import { postMessage } from '../../common/ipc/cs_postmessage'
import Ext from '../../common/web_extension'
import log from '../../common/log'
import dragMock from './drag_mock'
import sendKeys from '../../common/send_keys'
import { decryptIfNeeded } from '../../common/encrypt'
import { LAST_SCREENSHOT_FILE_NAME } from '../../common/constant'
import { untilInjected } from './eval'
import config from '@/config'

const HIGHLIGHT_TIMEOUT = 500

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

const getIframeViewportOffset = () => {
  if (window === window.top) {
    return Promise.resolve({ x: 0, y: 0 })
  }

  return postMessage(window.parent, window, {
    action: 'SOURCE_VIEWPORT_OFFSET',
    data: {}
  })
}

const focusIfEditable = ($el) => {
  if (isElementEditable($el) && typeof $el.focus === 'function') {
    $el.focus()
  }
}

// We now save targetOptions in command, if main target can't be found (extra?.retryInfo.final === true),
// it should try all targetOptions just for once
export const getElementByLocatorWithTargetOptions = (locator, shouldWaitForVisible, command, csIpc) => {
  const { extra, targetOptions } = command || {}

  if (extra &&
      extra.retryInfo &&
      extra.retryInfo.final &&
      targetOptions &&
      targetOptions.length
  ) {
    for (let i = 0, len = targetOptions.length; i < len; i++) {
      const target = targetOptions[i]

      try {
        const el = getElementByLocator(target, shouldWaitForVisible)

        csIpc.ask('CS_ADD_LOG', {
          warning: `Element found with secondary locator "${target}". To use it by default, update the target field to use it as primary locator.`
        })

        return el;
      } catch (e) {
        if (i === len - 1) {
          throw e
        }
      }
    }
  }

  return getElementByLocator(locator, shouldWaitForVisible)
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
  if (i === -1 && !/^\/.*/.test(str)) {
    str = 'name=' + str
  }

  const frameDom = getElementByLocator(str)

  if (!frameDom || !frameDom.contentWindow) {
    throw new Error(`The element found based on ${str} is NOT a frame/iframe`)
  }

  // Note: for those iframe/frame that don't have src, they won't load content_script.js
  // so we have to inject the script by ourselves
  if (!frameDom.getAttribute('src')) {
    const file  = Ext.runtime.getURL('content_script.js')
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
  const wrapWithPromiseAndErrorMessageTransform = partial((getLocator, fn) => {
    return wrap(fn, (...args) => {
      const locator = getLocator(...args)

      return ({
        errorMsg: (msg) => {
          if (/element is found but not visible yet/.test(msg)) {
            return `element is found but not visible yet for '${locator}' (use !WaitForVisible = false to disable waiting for visible)`
          }

          return `timeout reached when looking for element '${locator}'`
        }
      })
    })
  })
  const wrapWithLogForEfp = partial((getLocator, fn) => {
    return (...args) => {
       const el = fn(...args)
       const locator = getLocator(...args)

      if (isElementFromPoint(locator)) {
        let elXpath = 'unkown'

        try {
          elXpath = helpers.xpath(el)
        } catch (e) {}

        const msg = `${locator} => xpath "${elXpath}"`

        csIpc.ask('CS_ADD_LOG', { info: msg })
      }

      return el
    }
  })
  const wrapWithSearchForInput = (fn) => {
    return (...args) => {
      const el = fn(...args)

      if (!el || el.tagName === 'INPUT') {
        return el
      }

      const label = getAncestor(el, (node) => node.tagName === 'LABEL')

      if (!label) {
        return el
      }

      const input = label.querySelector('input')

      return input || el
    }
  }
  const getElementByLocatorWithLogForEfp = wrapWithLogForEfp(
    getElementByLocatorWithTargetOptions,
    (locator) => locator
  )
  const __getFrameByLocator = wrap(getFrameByLocator, (locator) => ({
    errorMsg: (msg) => {
      return `timeout reached when looking for frame '${locator}'`
    }
  }))
  const __getElementByLocator = compose(
    wrapWithPromiseAndErrorMessageTransform((locator) => locator),
    wrapWithLogForEfp((locator) => locator)
  )(getElementByLocatorWithTargetOptions)

  const __getInputElementByLocator = compose(
    wrapWithPromiseAndErrorMessageTransform((locator) => locator),
    wrapWithLogForEfp((locator) => locator),
    wrapWithSearchForInput
  )(getElementByLocatorWithTargetOptions)

  const __expectNoElementByLocator = (locator, shouldWaitForVisible) => {
    return __getElementByLocator(locator, shouldWaitForVisible)
    .then(
      () => {
        if (shouldWaitForVisible) {
          throw new Error(`timeout reached when waiting for element '${locator}' to be not present`)
        } else {
          throw new Error(`timeout reached when waiting for element '${locator}' to be not visible`)
        }
      },
      () => {
        return true
      }
    )
  }

  console.log('run cmd:>>', cmd)

  switch (cmd) {
    case 'openBrowser':
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
        setTimeout(() => {
          csIpc.ask('CS_LOAD_URL', { url: command.target, cmd: command.cmd }).then(() => true)
        })
        return true;
      })

    case 'refresh':
      setTimeout(() => window.location.reload(), 0)
      return true

    case 'mouseOver': {
      return __getElementByLocator(target, false, command, csIpc)
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

    // Note: 'locate' command is only for internal use
    case 'locate': {
      return __getElementByLocator(target, false, command, csIpc)
      .then(el => {
        try {
          if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' })
          if (extra.playHighlightElements)      helpers.highlightDom(el, HIGHLIGHT_TIMEOUT)
        } catch (e) {
          log.error('error in scroll and highlight', e.message)
        }

        const vpOffset = viewportOffset(el)

        return getIframeViewportOffset()
        .then(windowOffset => {
          return {
            rect: {
              x:      vpOffset.left + windowOffset.x,
              y:      vpOffset.top + windowOffset.y,
              width:  el.offsetWidth,
              height: el.offsetHeight
            }
          }
        })
      })
    }

    case 'dragAndDropToObject': {
      return Promise.all([
        __getElementByLocator(target, false, command, csIpc),
        __getElementByLocator(value)
      ])
      .then(([$src, $tgt]) => {
        return dragMock.triggerDragEvent($src, $tgt).then(() => true)
      })
    }

    case 'waitForElementVisible':
    case 'waitForVisible': {
      return __getElementByLocator(target, true, command, csIpc)
      .then(() => true)
    }

    case 'waitForElementNotVisible': {
      return __expectNoElementByLocator(target, true)
      .then(() => true)
    }

    case 'waitForElementPresent': {
      return __getElementByLocator(target, false, command, csIpc)
      .then(() => true)
    }

    case 'waitForElementNotPresent': {
      return __expectNoElementByLocator(target, false)
      .then(() => true)
    }

    case 'clickAt': {
      const isEfp   = isElementFromPoint(target)
      const pTarget = (function () {
        if (!isEfp) return Promise.resolve(target)
        return getIframeViewportOffset()
        .then(iframeOffset => {
          log('iframeOffset', iframeOffset)
          const [x, y] = viewportCoordinateByElementFromPoint(target)
          return `#elementfrompoint (${x - iframeOffset.x}, ${y - iframeOffset.y})`
        })
      })()

      return pTarget.then(target => {
        return __getElementByLocator(target, extra.waitForVisible, command, csIpc)
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

          focusIfEditable(el)
          return true
        })
      })
    }
    case 'saveItem':
    case 'click':
    case 'clickAndWait': {
      return __getElementByLocator(target, extra.waitForVisible, command, csIpc)
      .then(el => {
        try {
          if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' })
          if (command.cmd === 'saveItem') {
            var img = el
            var url = img.src
            var filename = url.substring(url.lastIndexOf('/') + 1)
            var a = document.createElement('a')
            a.href = url;
            a.download = filename
            document.body.appendChild(a)
            a.click();
            document.body.removeChild(a)
          }
          if (extra.playHighlightElements)      helpers.highlightDom(el, HIGHLIGHT_TIMEOUT)
        } catch (e) {
          log.error('error in scroll and highlight')
        }

        ;['mousedown', 'mouseup', 'click'].forEach(eventType => {
          if (eventType === 'click' && typeof el.click === 'function') {
            return el.click()
          }

          el.dispatchEvent(
            new MouseEvent(eventType, {
              view: window,
              bubbles: true,
              cancelable: true
            })
          )
        })

        //  csIpc.ask('CS_ON_DOWNLOAD', {
        //   fileName: "",
        //   wait: (value || '').trim() === 'true',
        //   timeout: extra.timeoutDownload * 1000,
        //   timeoutForStart: extra.timeoutDownloadStart * 1000
        // })

        focusIfEditable(el)
        return true
      })
    }

    case 'check':
    case 'uncheck': {
      return __getInputElementByLocator(target, extra.waitForVisible, command, csIpc)
      .then(el => {
        el.checked = cmd === 'check'
        el.dispatchEvent(new Event('change', {
          target: el,
          bubbles: true
        }))
        return true
      })
    }

    case 'addSelection':
    case 'removeSelection':
    case 'select':
    case 'selectAndWait': {
      return __getElementByLocator(target, extra.waitForVisible, command, csIpc)
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

        switch (cmd) {
          case 'addSelection':
            option.selected = true
            break

          case 'removeSelection':
            option.selected = false
            break

          default:
            el.value = option.value
            break
        }

        el.dispatchEvent(new Event('change', {
          target: el,
          bubbles: true
        }))
        return true
      })
    }

    case 'type': {
      return __getElementByLocator(target, extra.waitForVisible, command, csIpc)
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

        focusIfEditable(el)

        return decryptIfNeeded(value, el)
        .then(realValue => {
          el.value = ''

          if (realValue.length <= config.commandRunner.sendKeysMaxCharCount) {
            sendKeys(el, realValue, true)
          }

          el.value = realValue
          el.dispatchEvent(new Event('change', {
            target: el,
            bubbles: true
          }))
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
      return __getElementByLocator(target, extra.waitForVisible, command, csIpc)
      .then(el => {
        if (el.contentEditable !== 'true') {
          throw new Error(`Target is not contenteditable`)
        }

        if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' })
        if (extra.playHighlightElements)      helpers.highlightDom(el, HIGHLIGHT_TIMEOUT)

        el.focus()
        el.innerHTML = value
        el.blur()

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
      return __getElementByLocator(target, false, command, csIpc)
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

      return __getElementByLocator(target, false, command, csIpc)
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

    case 'verifyElementNotPresent': {
      const { timeoutElement, retryInfo } = extra || {}

      return __expectNoElementByLocator(target)
      .then(
        () => true,
        (e) => {
          const shotsLeft     = (timeoutElement * 1000 / retryInfo.retryInterval) - retryInfo.retryCount
          const isLastChance  = shotsLeft <= 1

          if (isLastChance) {
            return {
              log: {
                error: `'${target}' element is still present`
              }
            }
          }

          throw e
        }
      )
    }

    case 'verifyEditable': {
      return __getElementByLocator(target, false, command, csIpc)
      .then(el => {
        const editable = isEditable(el)

        if (!editable) {
          return {
            log: {
              error: `'${target}' is not editable`
            }
          }
        }

        return true
      })
    }

    case 'verifyNotEditable': {
      return __getElementByLocator(target, false, command, csIpc)
      .then(el => {
        const editable = isEditable(el)

        if (editable) {
          return {
            log: {
              error: `'${target}' is editable`
            }
          }
        }

        return true
      })
    }

    case 'verifyChecked': {
      return __getInputElementByLocator(target, false, command, csIpc)
      .then(el => {
        const checked  = !!el.checked

        if (!checked) {
          return {
            log: {
              error: `'${target}' is not checked`
            }
          }
        }

        return true
      })
    }
    case 'verifyNotChecked': {
      return __getInputElementByLocator(target, false, command, csIpc)
      .then(el => {
        const checked  = !!el.checked

        if (checked) {
          return {
            log: {
              error: `'${target}' is checked`
            }
          }
        }

        return true
      })
    }

    case 'verifyAttribute': {
      const index = target.lastIndexOf('@')

      if (index === -1) {
        throw new Error(`invalid target for verifyAttribute - ${target}`)
      }

      const locator   = target.substr(0, index)
      const attrName  = target.substr(index + 1)

      return __getElementByLocator(locator, false, command, csIpc)
      .then(el => {
        const attr = el.getAttribute(attrName)

        if (!globMatch(value, attr)) {
          return {
            log: {
              error: `attribute not matched, \n\texpected: "${value}", \n\tactual: "${attr}"`
            }
          }
        }

        return true
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
      return __getElementByLocator(target, false, command, csIpc)
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
      return __getElementByLocator(target, false, command, csIpc)
      .then(() => true)
    }

    case 'assertElementNotPresent': {
      return __expectNoElementByLocator(target)
    }

    case 'assertChecked': {
      return __getInputElementByLocator(target, false, command, csIpc)
      .then(el => {
        const checked  = !!el.checked

        if (!checked) {
          throw new Error(`'${target}' is not checked`)
        }

        return true
      })
    }

    case 'assertNotChecked': {
      return __getInputElementByLocator(target, false, command, csIpc)
      .then(el => {
        const checked  = !!el.checked

        if (checked) {
          throw new Error(`'${target}' is checked`)
        }

        return true
      })
    }

    case 'assertEditable': {
      return __getElementByLocator(target, false, command, csIpc)
      .then(el => {
        const editable = isEditable(el)

        if (!editable) {
          throw new Error(`'${target}' is not editable`)
        }

        return true
      })
    }

    case 'assertNotEditable': {
      return __getElementByLocator(target, false, command, csIpc)
      .then(el => {
        const editable = isEditable(el)

        if (editable) {
          throw new Error(`'${target}' is editable`)
        }

        return true
      })
    }

    case 'assertAttribute': {
      const index = target.lastIndexOf('@')

      if (index === -1) {
        throw new Error(`invalid target for assertAttribute - ${target}`)
      }

      const locator   = target.substr(0, index)
      const attrName  = target.substr(index + 1)

      return __getElementByLocator(locator, false, command, csIpc)
      .then(el => {
        const attr = el.getAttribute(attrName)

        if (!globMatch(value, attr)) {
          throw new Error(`attribute not matched, \n\texpected: "${value}", \n\tactual: "${attr}"`)
        }

        return true
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

    case 'storeXpathCount': {
      const i           = target.indexOf('=')
      const method      = target.substr(0, i)
      const xpathStr    = target.substr(i + 1)
      const lowerMethod = method && method.toLowerCase()

      if (lowerMethod !== 'xpath') {
        throw new Error(`storeXpathCount: target should start with "xpath="`)
      }

      return {
        vars: {
          [value]: getElementsByXPath(xpathStr).length
        }
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
      return __getElementByLocator(target, false, command, csIpc)
      .then((el) => {
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

      return __getElementByLocator(locator, false, command, csIpc)
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
      return __getElementByLocator(target, false, command, csIpc)
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
      return __getElementByLocator(target, false, command, csIpc)
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
      return __getElementByLocator(target, false, command, csIpc)
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
      return __getElementByLocator(target, false, command, csIpc)
      .then(el => {
        const text  = el.value

        if (!globMatch(value, text)) {
          throw new Error(`value not matched, \n\texpected: "${value}", \n\tactual: "${text}"`)
        }

        return true
      })
    }

    case 'executeScript':
    case 'executeAsyncScript': {
      let minimumTimeout = config.executeScript.minimumTimeout // 5000
      let userDefinedTimeout = extra.timeoutElement ? extra.timeoutElement * 1000 : 0
      const maxTimeout =  userDefinedTimeout > minimumTimeout ? userDefinedTimeout : minimumTimeout

      return untilInjected(maxTimeout)
      .then(api => {
        const code = `Promise.resolve((function () { ${target} })());`

        return api.eval(code)
        .then(result => {
          if (value && value.length) {
            return {
              vars: {
                [value]: result
              }
            }
          }

          return true
        })
        .catch(e => {
          throw new Error(`Error in ${cmd} code: ${e.message}`)
        })
      })
    }

    case 'sendKeys': {
      return __getElementByLocator(target, false, command, csIpc)
      .then(el => {
        focusIfEditable(el)
        sendKeys(el, value)
        return true
      })
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
        if (!/^regex(=|:)/i.test(rest)) {
          return null
        }

        const raw   = rest.replace(/^regex(=|:)/i, '')
        const reg   = /^\/(.*)\/([gimsuy]+)?$/

        if (!reg.test(raw)) {
          return toRegExp(
            raw.replace(/^\/|\/g?$/g, ''),
            { needEncode: false, flag: 'g' }
          )
        }

        const match = raw.match(reg)

        if (!match || !match.length) {
          return null
        }

        const [_, regexpText, flags] = match
        const flagText = uniqueStrings('g', ...flags.split('')).join('')

        return toRegExp(
          regexpText,
          { needEncode: false, flag: flagText }
        )
      })()
      const regexpForText = (function () {
        if (regexp) return null
        const raw = rest.replace(/^text(=|:)/i, '')

        if (cmd === 'sourceExtract' && !/\*/.test(raw)) {
          throw new Error('Missing * or REGEX in sourceExtract. Extracting a plain text doesn\'t make much sense')
        }

        // flag 's': Allows . to match newline characters. (Added in ES2018, not yet supported in Firefox).
        // reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Advanced_searching_with_flags_2
        const flags = RegExp.prototype.hasOwnProperty('dotAll') ? 'gs' : 'g'
        return glob2reg(raw, { flags, capture: true, nonGreedy: true })
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

    case 'onDownload': {
      return csIpc.ask('CS_ON_DOWNLOAD', {
        fileName: target,
        wait: (value || '').trim() === 'true',
        timeout: extra.timeoutDownload * 1000,
        timeoutForStart: extra.timeoutDownloadStart * 1000
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
      return untilInjected()
      .then(api => {
        return api.eval(target)
      })
      .then(result => {
        return { condition: result }
      })
    }

    default:
      throw new Error(`Command ${cmd} not supported yet`)
  }
}
