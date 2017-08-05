import { delay } from './utils'

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
        // Note: there are cases such as 'link=exact:xxx'
        const realVal = value.replace(/^exact:/, '')
        const links   = [].slice.call(document.getElementsByTagName('a'))
        // Note: use textContent instead of innerText to avoid influence from text-transform
        el = links.find(a => a.textContent === realVal)
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

export const run = (command, csIpc) => {
  const { cmd, target, value } = command

  switch (cmd) {
    case 'open':
      if (command.href && window.location.href !== command.href) {
        window.location.href = command.href
      }
      return true

    case 'click':
    case 'clickAndWait': {
      const el = getElementByLocator(target)
      el.click()
      return true
    }

    case 'select':
    case 'selectAndWait': {
      const text    = value.replace(/^label=/, '')
      const el      = getElementByLocator(target)
      const options = [].slice.call(el.getElementsByTagName('option'))
      const option  = options.find(op => op.textContent === text)

      if (!option) {
        throw new Error(`cannot find option with label '${text}'`)
      }

      el.value = option.value
      el.dispatchEvent(new Event('change'))

      return true
    }

    case 'type': {
      const el = getElementByLocator(target)
      const tag = el.tagName.toLowerCase()

      if (tag !== 'input' && tag !== 'textarea') {
        throw new Error('run command: element found is neither input nor textarea')
      }

      el.value = value
      el.dispatchEvent(new Event('change'))

      return true
    }

    case 'pause': {
      const n = parseInt(target)

      if (isNaN(n) || n <= 0) {
        throw new Error('target of pause command must be a positive integer')
      }

      const delayWithTimeoutStatus = (timeout, value) => {
        return new Promise((resolve, reject) => {
          let past = 0

          const timer = setInterval(() => {
            past += 1000
            csIpc.ask('CS_TIMEOUT_STATUS', {
              type: 'pause',
              total: n,
              past
            })

            if (past >= n) {
              clearInterval(timer)
              resolve(value)
            }
          }, 1000)
        })
      }

      return delayWithTimeoutStatus(n, true)
    }

    case 'waitForPageToLoad':
      return true

    default:
      throw new Error(`Command ${cmd} not supported yet`)
  }
}
