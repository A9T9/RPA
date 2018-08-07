import * as Keysim from './lib/keysim'
import { splitKeep } from './utils'
import log from './log'

let keyboard = Keysim.Keyboard.US_ENGLISH

const findParentByTag = (el, tag) => {
  let p = el

  // eslint-disable-next-line no-cond-assign
  while (p = p.parentNode) {
    if (p.tagName === tag.toUpperCase()) {
      return p
    }
  }

  return null
}

const splitStringToChars = (str) => {
  const specialKeys = [
    'KEY_LEFT', 'KEY_UP', 'KEY_RIGHT', 'KEY_DOWN',
    'KEY_PGUP', 'KEY_PAGE_UP', 'KEY_PGDN', 'KEY_PAGE_DOWN',
    'KEY_BKSP', 'KEY_BACKSPACE', 'KEY_DEL', 'KEY_DELETE',
    'KEY_ENTER', 'KEY_TAB'
  ]
  const reg   = new RegExp(`\\$\\{(${specialKeys.join('|')})\\}`)
  const parts = splitKeep(reg, str)

  return parts.reduce((prev, cur) => {
    if (reg.test(cur)) {
      prev.push(cur)
    } else {
      prev = prev.concat(cur.split(''))
    }

    return prev
  }, [])
}

const getKeyStrokeAction = (str) => {
  const reg = /^\$\{([^}]+)\}$/
  let match

  // eslint-disable-next-line no-cond-assign
  if (match = str.match(reg)) {
    switch (match[1]) {
      case 'KEY_LEFT':
        return 'LEFT'

      case 'KEY_UP':
        return 'UP'

      case 'KEY_RIGHT':
        return 'RIGHT'

      case 'KEY_DOWN':
        return 'DOWN'

      case 'KEY_PGUP':
      case 'KEY_PAGE_UP':
        return 'PAGEUP'

      case 'KEY_PGDN':
      case 'KEY_PAGE_DOWN':
        return 'PAGEDOWN'

      case 'KEY_BKSP':
      case 'KEY_BACKSPACE':
        return 'BACKSPACE'

      case 'KEY_DEL':
      case 'KEY_DELETE':
        return 'DELETE'

      case 'KEY_ENTER':
        return 'ENTER'

      case 'KEY_TAB':
        return 'TAB'
    }
  }

  return str
}

const isEditable = (el) => {
  if (el.getAttribute('readonly') !== null) return false
  const tag   = el.tagName.toUpperCase()
  const type  = (el.type || '').toLowerCase()
  const editableTypes = [
    'text',
    'search',
    'tel',
    'url',
    'email',
    'password',
    'number'
  ]

  if (tag === 'TEXTAREA') return true
  if (tag === 'INPUT' && editableTypes.indexOf(type) !== -1)  return true

  return false
}

const maybeEditText = (target, c) => {
  if (!isEditable(target))  return
  if (c.length === 1) {
    if (!isNil(target.selectionStart)) {
      const lastStart = target.selectionStart
      target.value    = target.value.substring(0, target.selectionStart) + c +
                        target.value.substring(target.selectionEnd)

      setSelection(target, lastStart + 1)
    } else {
      target.value    = target.value + c
    }
  } else {
    switch (c) {
      case 'ENTER':
        target.value = target.value + '\n'
        setSelection(target, target.value.length)
        break
      case 'TAB':
        target.value = target.value + '\t'
        setSelection(target, target.value.length)
        break
      case 'LEFT':
        setSelection(target, target.selectionStart - 1)
        break
      case 'RIGHT':
        setSelection(target, target.selectionEnd + 1)
        break
      case 'BACKSPACE': {
        const pos    =  target.selectionStart
        target.value =  target.value.substring(0, target.selectionStart - 1) +
                        target.value.substring(target.selectionEnd)
        setSelection(target, pos - 1)
        break
      }
      case 'DELETE': {
        const pos    =  target.selectionEnd
        target.value =  target.value.substring(0, target.selectionStart) +
                        target.value.substring(target.selectionEnd + 1)
        setSelection(target, pos)
        break
      }
    }
  }
}

const maybeSubmitForm = (target, key) => {
  if (key !== 'ENTER')      return
  if (!isEditable(target))  return

  const form = findParentByTag(target, 'FORM')
  if (!form)                return

  form.submit()
}

const isNil = (val) => val === null || val === undefined

const setSelection = ($el, start, end) => {
  // Note: Inputs like number and email, doesn't support selectionEnd
  // for safety, make sure those values are not null or undefined (infers that it's available)
  if (!isNil($el.selectionStart)) {
    $el.selectionStart = start
  }

  if (!isNil($el.selectionEnd)) {
    $el.selectionEnd = (end !== undefined ? end : start)
  }
}

const replaceActionKey = (function () {
  const mapping = {
    0:  null,    // the NULL character
    8:  'BACKSPACE',
    9:  'TAB',
    10: 'ENTER', // \n  new line
    11:  null,   // \v  vertical tab
    12:  null,   // \f  form feed
    13:  null    // \r  carriage return
  }

  return (c) => {
    // Note: it means it's already key stroke action
    if (c.length > 1) return c
    return mapping[c.charCodeAt(0)] || c
  }
})()

export default function sendKeys (target, str, noSpecialKeys) {
  const rawChars  = noSpecialKeys ? str.split('') : splitStringToChars(str)
  const chars     = rawChars.map(replaceActionKey).filter(x => x && x.length)

  target.focus()
  if (target.value) {
    setSelection(target, target.value.length)
  }

  chars.forEach(c => {
    const action = getKeyStrokeAction(c)

    maybeEditText(target, action)
    // Note: This line will take care of KEYDOWN KEYPRESS KEYUP and TEXTINPUT
    keyboard.dispatchEventsForAction(action, target)

    if (!noSpecialKeys) {
      maybeSubmitForm(target, action)
    }
  })
}
