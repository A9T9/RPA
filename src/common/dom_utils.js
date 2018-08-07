import { and } from './utils'

export const getStyle = function (dom) {
  if (!dom)   throw new Error('getStyle: dom not exist')
  return getComputedStyle(dom)
}

export const setStyle = function (dom, style) {
  if (!dom)   throw new Error('setStyle: dom not exist')

  for (var i = 0, keys = Object.keys(style), len = keys.length; i < len; i++) {
    dom.style[keys[i]] = style[keys[i]]
  }

  return dom
}

export const pixel = function (num) {
  if ((num + '').indexOf('px') !== -1)  return num
  return (num || 0) + 'px'
}

export const bindDrag = ({ onDragStart, onDragEnd, onDrag, $el, doc = document }) => {
  let isDragging = false
  let startPos = { x: 0, y: 0 }

  const onMouseDown = (e) => {
    isDragging = true
    startPos = { x: e.screenX, y: e.screenY }
    onDragStart(e)
  }
  const onMouseUp = (e) => {
    if (!isDragging)  return
    isDragging = false
    const dx = e.screenX - startPos.x
    const dy = e.screenY - startPos.y
    onDragEnd(e, { dx, dy })
  }
  const onMouseMove = (e) => {
    if (!isDragging)  return

    const dx = e.screenX - startPos.x
    const dy = e.screenY - startPos.y
    onDrag(e, { dx, dy })

    e.preventDefault()
    e.stopPropagation()
  }
  const onClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  doc.addEventListener('click', onClick, true)
  doc.addEventListener('mousemove', onMouseMove, true)
  doc.addEventListener('mouseup', onMouseUp, true)
  $el.addEventListener('mousedown', onMouseDown, true)

  return () => {
    doc.removeEventListener('click', onClick, true)
    doc.removeEventListener('mousemove', onMouseMove, true)
    doc.removeEventListener('mouseup', onMouseUp, true)
    $el.removeEventListener('mousedown', onMouseDown, true)
  }
}

export const bindContentEditableChange = ({ onChange, doc = document }) => {
  let currentCE   = null
  let oldContent  = null

  const onFocus = (e) => {
    if (e.target.contentEditable !== 'true')  return
    currentCE   = e.target
    oldContent  = currentCE.innerHTML
  }
  const onBlur = (e) => {
    if (e.target !== currentCE) {
      // Do nothing
    } else if (currentCE.innerHTML !== oldContent) {
      onChange(e)
    }

    currentCE   = null
    oldContent  = null
  }

  doc.addEventListener('focus', onFocus, true)
  doc.addEventListener('blur', onBlur, true)

  return () => {
    doc.removeEventListener('focus', onFocus, true)
    doc.removeEventListener('blur', onBlur, true)
  }
}

export const scrollLeft = function (document) {
  return document.documentElement.scrollLeft
}

export const scrollTop = function (document) {
  return document.documentElement.scrollTop
}

export const domText = ($dom) => {
  const it  = $dom.innerText && $dom.innerText.trim()
  const tc  = $dom.textContent
  const pos = tc.toUpperCase().indexOf(it.toUpperCase())

  return tc.substr(pos, it.length)
}

export const isVisible = function (el) {
  if (el === window.document) return true
  if (!el)  return true

  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.opacity === '0' || style.visibility === 'hidden')  return false

  return isVisible(el.parentNode)
}

export const cssSelector = function (dom) {
  if (dom.nodeType !== 1) return ''
  if (dom.tagName === 'BODY') return 'body'
  if (dom.id) return '#' + dom.id

  var classes = dom.className.split(/\s+/g)
                             .filter(function (item) {
                               return item && item.length
                             })

  var children = Array.from(dom.parentNode.childNodes).filter(function ($el) {
    return $el.nodeType === 1
  })

  var sameTag = children.filter(function ($el) {
    return $el.tagName === dom.tagName
  })

  var sameClass = children.filter(function ($el) {
    var cs = $el.className.split(/\s+/g)

    return and(...classes.map(function (c) {
      return cs.indexOf(c) !== -1
    }))
  })

  var extra = ''

  if (sameTag.length === 1) {
    extra = ''
  } else if (classes.length && sameClass.length === 1) {
    extra = '.' + classes.join('.')
  } else {
    extra = ':nth-child(' + (1 + children.findIndex(function (item) { return item === dom; })) + ')'
  }

  var me = dom.tagName.toLowerCase() + extra

  // Note: browser will add an extra 'tbody' when tr directly in table, which will cause an wrong selector,
  // so the hack is to remove all tbody here
  var ret = cssSelector(dom.parentNode) + ' > ' + me
  return ret
  // return ret.replace(/\s*>\s*tbody\s*>?/g, ' ')
}

export const isPositionFixed = ($dom) => {
  if (!$dom || $dom === document.documentElement || $dom === document.body) return false
  return getComputedStyle($dom)['position'] === 'fixed' || isPositionFixed($dom.parentNode)
}
