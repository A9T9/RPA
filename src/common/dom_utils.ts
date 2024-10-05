import { globMatch } from './glob'
import { and } from './utils'

export const getStyle = function (dom: HTMLElement): Record<string, any> {
  if (!dom)   throw new Error('getStyle: dom does not exist')
  return getComputedStyle(dom)
}

export const setStyle = function (dom: HTMLElement, style: Record<string, any>): HTMLElement {
  if (!dom)   throw new Error('setStyle: dom does not exist')

  for (var i = 0, keys = Object.keys(style), len = keys.length; i < len; i++) {
    dom.style[keys[i] as any] = style[keys[i]]
  }

  return dom
}

export const pixel = function (num: number | string): string {
  if ((num + '').indexOf('px') !== -1)  return num as string
  return (num || 0) + 'px'
}

export type BindDragOptions = {
  onDragStart: Function;
  onDragEnd: Function;
  onDrag: Function;
  $el: HTMLElement;
  doc?: HTMLDocument;
  preventGlobalClick?: boolean;
}

export const bindDrag = (options: BindDragOptions): Function => {
  const { onDragStart, onDragEnd, onDrag, $el, preventGlobalClick = true, doc = document } = options
  let isDragging = false
  let startPos = { x: 0, y: 0 }

  const onMouseDown = (e: MouseEvent) => {
    isDragging = true
    startPos = { x: e.screenX, y: e.screenY }
    onDragStart(e)
  }
  const onMouseUp = (e: MouseEvent) => {
    if (!isDragging)  return
    isDragging = false
    const dx = e.screenX - startPos.x
    const dy = e.screenY - startPos.y
    onDragEnd(e, { dx, dy })
  }
  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging)  return

    const dx = e.screenX - startPos.x
    const dy = e.screenY - startPos.y
    onDrag(e, { dx, dy })

    e.preventDefault()
    e.stopPropagation()
  }
  const onClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  if (preventGlobalClick) {
    doc.addEventListener('click', onClick, true)
  }
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

export type BindContentEditableChangeOptions = {
  onChange: Function;
  doc: HTMLDocument;
}

export const bindContentEditableChange = (options: BindContentEditableChangeOptions): Function => {
  const { onChange, doc = document } = options

  let currentCE: HTMLElement | null = null
  let oldContent: string | null = null

  const onFocus = (e: Event) => {
    if (!e.target || (e.target as any).contentEditable !== 'true')  return
    currentCE   = e.target as HTMLElement
    oldContent  = currentCE.innerHTML
  }
  const onBlur = (e: Event) => {
    if (e.target !== currentCE) {
      // Do nothing
    } else if (currentCE && currentCE.innerHTML !== oldContent) {
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

export const scrollLeft = function (document: HTMLDocument): number {
  return document.documentElement.scrollLeft
}

export const scrollTop = function (document: HTMLDocument): number {
  return document.documentElement.scrollTop
}

export const domText = ($dom: HTMLElement): string => {
  const it  = $dom.innerText ? $dom.innerText.trim() : ''
  const tc  = $dom.textContent as string
  const pos = tc.toUpperCase().indexOf(it.toUpperCase())

  return pos === -1 ? it : tc.substr(pos, it.length)
}

export const isVisible = function (el: HTMLElement): boolean {
  if (<any>el === window.document) return true
  if (!el)  return true

  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.opacity === '0' || style.visibility === 'hidden')  return false

  return isVisible(el.parentNode as HTMLElement)
}

export const cssSelector = function (dom: Element | null | undefined): string {
  if (!dom) return ''
  if (dom.nodeType !== 1) return ''
  if (dom.tagName === 'BODY') return 'body'
  if (dom.id) return '#' + dom.id

  var classes = dom.className.split(/\s+/g)
                             .filter(function (item) {
                               return item && item.length
                             })

  var children = Array.from(
    dom.parentNode ? dom.parentNode.childNodes : []
  )
  .filter(function ($el) {
    return $el.nodeType === 1
  })

  var sameTag = children.filter(function ($el) {
    return ($el as Element).tagName === dom.tagName
  })

  var sameClass = children.filter(function ($el) {
    var cs = typeof ($el as Element).className === 'string' ? ($el as Element).className.split(/\s+/g) : []

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
  var ret = cssSelector(dom.parentNode as Element) + ' > ' + me
  return ret
  // return ret.replace(/\s*>\s*tbody\s*>?/g, ' ')
}

export const isPositionFixed = ($dom: HTMLElement): boolean => {
  if (!$dom || $dom === document.documentElement || $dom === document.body) return false
  return getComputedStyle($dom)['position'] === 'fixed' || isPositionFixed($dom.parentNode as HTMLElement)
}

export const offset = function (dom: Element) {
  if (!dom) return { left: 0, top: 0 }

  var rect = dom.getBoundingClientRect()

  return {
    left: rect.left + window.scrollX,
    top:  rect.top + window.scrollY
  }
}

export function accurateOffset (dom: HTMLElement | null): { left: number, top: number } {
  if (!dom) return { left: 0, top: 0 }

  const doc = dom.ownerDocument
  if (!doc || dom === doc.documentElement) return { left: 0, top: 0 }

  const parentOffset = accurateOffset(dom.offsetParent as (HTMLElement | null))

  return {
    left: parentOffset.left + dom.offsetLeft,
    top:  parentOffset.top   + dom.offsetTop
  }
}

export type PreloadImageResult = {
  $img: HTMLImageElement,
  width: number,
  height: number
}

export function preloadImage (url: string): Promise<PreloadImageResult> {
  return new Promise((resolve, reject) => {
    const $img = new Image()

    $img.onload = () => {
      resolve({
        $img,
        width: $img.width,
        height: $img.height
      })
    }
    $img.onerror = (e: any): any => {
      reject(e)
    }

    $img.src = url
  })
}

export function isFirefox (): boolean {
  return /Firefox/.test(window.navigator.userAgent)
}

export function svgNodetoString (svgNode: SVGElement): string {
  return svgNode.outerHTML
}

export function svgToBase64 (str: string): string {
  return 'data:image/svg+xml;base64,' + window.btoa(str)
}

export function canvasFromSVG (str: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const c   = document.createElement('canvas')
    const ctx = c.getContext('2d') as CanvasRenderingContext2D
    const img = document.createElement('img')
    const b64 = svgToBase64(str)
    const mw  = str.match(/<svg[\s\S]*?width="(.*?)"/m) as string[]
    const mh  = str.match(/<svg[\s\S]*?height="(.*?)"/m) as string[]
    const w   = parseInt(mw[1] as string, 10)
    const h   = parseInt(mh[1] as string, 10)

    img.src = b64
    img.onload = function () {
      c.width   = w
      c.height  = h
      ctx.drawImage(img, 0, 0, w, h)
      resolve(c)
    }

    img.onerror = function (e) {
      reject(e)
    }
  })
}

export function imageBlobFromSVG (str: string, mimeType = 'image/png', quality: number): Promise<Blob> {
  return canvasFromSVG(str)
  .then(canvas => {
    const p: Promise<Blob> = new Promise((resolve, reject) => {
      try {
        canvas.toBlob(resolve as any, mimeType, quality)
      } catch (e) {
        reject(e)
      }
    })

    return p
  })
}

export function imageDataFromUrl (url: string): Promise<ImageData> {
  return preloadImage(url)
  .then(({ $img, width, height }) => {
    const canvas  = document.createElement('canvas')
    canvas.width  = width
    canvas.height = height

    const context = canvas.getContext('2d') as CanvasRenderingContext2D
    context.drawImage(
      $img,
      0, 0,
      width, height
    )

    return context.getImageData(0, 0, width, height)
  })
}

export type Rect = { x: number, y: number, width: number, height: number }

export function subImage (imageUrl: string, rect: Rect): Promise<string> {
  return new Promise((resolve, reject) => {
    const $img = new Image()

    $img.onload = () => {
      const canvas  = document.createElement('canvas')
      canvas.width  = rect.width
      canvas.height = rect.height

      const context = canvas.getContext('2d') as CanvasRenderingContext2D
      context.drawImage(
        $img,
        0, 0,
        $img.width, $img.height,
        -1 * rect.x, -1 * rect.y,
        $img.width, $img.height
      )

      resolve(canvas.toDataURL())
    }

    $img.src = imageUrl
  })
}

export function rgbToHex (r: number, g: number, b: number) {
  if (r > 255 || g > 255 || b > 255) {
    throw 'Invalid color component'
  }

  return ((r << 16) | (g << 8) | b).toString(16)
}

export type GetPixelParams = {
  dataUrl: string;
  x: number;
  y: number;
}

export function getPixel (params: GetPixelParams): Promise<string> {
  const { x, y, dataUrl } = params

  return new Promise((resolve, reject) => {
    const $img = new Image()

    $img.onload = () => {
      const imgWidth = $img.width
      const imgHeight = $img.height

      if (x < 0 || y < 0 || x > imgWidth || y > imgHeight) {
        return reject(new Error(`${x}, ${y} is out of screenshot bound 0, 0 ~ ${imgWidth}, ${imgHeight}`))
      }

      const canvas  = document.createElement('canvas')
      canvas.width  = x + 5
      canvas.height = y + 5

      const context = canvas.getContext('2d') as CanvasRenderingContext2D
      context.drawImage(
        $img,
        0, 0,
        x + 5, y + 5,
        0, 0,
        x + 5, y + 5
      )

      let hex: string;

      try {
        const p = context.getImageData(x, y, 1, 1).data
        hex = '#' + ('000000' + rgbToHex(p[0], p[1], p[2])).slice(-6)
        resolve(hex)
      } catch (err) {
        const e = err as Error
        reject(new Error(`Failed to get pixel color` + (e?.message ? `: ${e.message}.` : '.')))
      }
    }

    $img.src = dataUrl
  })
}

export function scaleRect (rect: Rect, scale: number): Rect {
  return {
    x:      scale * rect.x,
    y:      scale * rect.y,
    width:  scale * rect.width,
    height: scale * rect.height,
  }
}

export function isEditable (el: HTMLElement) {
  if (el.contentEditable === 'true') {
    return true
  }

  const tag = (el.tagName || '').toLowerCase()

  if (['input', 'textarea'].indexOf(tag) === -1) {
    return false
  }

  const disabled = (el as HTMLInputElement).disabled
  const readOnly = (el as HTMLInputElement).readOnly

  return !disabled && !readOnly
}

export function hasAncestor(el: Node, checkAncestor: (node: Node) => boolean): boolean {
  let node: Node | null = el;

  while (node) {
    if (checkAncestor(node)) {
      return true;
    }
    node = node.parentNode;
  }

  return false;
}

export function getAncestor(el: Node, checkAncestor: (node: Node) => boolean): Node | null {
  let node: Node | null = el;

  while (node) {
    if (checkAncestor(node)) {
      return node;
    }
    node = node.parentNode;
  }

  return null;
}


export function getElementsByXPath (xpath: string): Node[] {
  const snapshot = document.evaluate(
    xpath,
    document.body,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  )
  const list: Node[] = []

  for (let i = 0, len = snapshot.snapshotLength; i < len; i++) {
    list.push(
      snapshot.snapshotItem(i) as Node
    )
  }

  return list
}

export function getElementByXPath (xpath: string): Node | undefined {
  return getElementsByXPath(xpath)[0]
}

export function assertLocator (str: string): boolean {
  const i = str.indexOf('=')

  // xpath
  if ((/^\//.test(str)))  return true
  // efp
  if (/^#elementfrompoint/i.test(str)) return true
  // Above is all locators that doesn't require '='
  if (i === -1) throw new Error('invalid locator, ' + str)

  const method  = str.substr(0, i)
  const value   = str.substr(i + 1)

  if (!value || !value.length) throw new Error('invalid locator, ' + str)

  switch (method && method.toLowerCase()) {
    case 'id':
    case 'name':
    case 'identifier':
    case 'link':
    case 'linktext':
    case 'partiallinktext':
    case 'css':
    case 'xpath':
      return true

    default:
      throw new Error('invalid locator, ' + str)
  }
}

export function isLocator (str: string): boolean {
  try {
    assertLocator(str)
    return true
  } catch (e) {
    return false
  }
}

// Note: parse the locator and return the element found accordingly
export function getElementByLocator (str: string, shouldWaitForVisible: boolean): Node | undefined {
  const i = str.indexOf('=')
  let el

  if ((/^\//.test(str))) {
    el = getElementByXPath(str)
  } else if (/^#elementfrompoint/i.test(str.trim())) {
    el = elementByElementFromPoint(str)
  } else if (i === -1) {
    throw new Error('getElementByLocator: invalid locator, ' + str)
  } else {
    const method      = str.substr(0, i)
    const value       = str.substr(i + 1)
    const lowerMethod = method && method.toLowerCase()

    switch (lowerMethod) {
      case 'id':
        el = document.getElementById(value)
        break

      case 'name':
        el = document.getElementsByName(value)[0]
        break

      case 'identifier':
        el = document.getElementById(value) || document.getElementsByName(value)[0]
        break

      case 'link-notused': {
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

      case 'link':
      case 'linktext':
      case 'partiallinktext': {
        const links       = [].slice.call(document.getElementsByTagName('a'))
        // Note: position support. eg. link=Download@POS=3
        let match   = value.match(/^(.+)@POS=(\d+)$/i)
        let realVal = value
        let index   = 0

        if (match) {
          realVal = match[1]
          index   = parseInt(match[2]) - 1
        }

        const pattern     = lowerMethod === 'partiallinktext' ? `*${realVal}*` : realVal
        const candidates  = links.filter(link => globMatch(pattern, domText(link), { flags: 'im' }))

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

  if (shouldWaitForVisible && !isVisible(el as HTMLElement)) {
    throw new Error('getElementByLocator: element is found but not visible yet')
  }

  return el
}

export function isElementFromPoint (str: string): boolean {
  return /^#elementfrompoint/i.test(str.trim())
}

export function viewportCoordinateByElementFromPoint (str: string): [number, number] {
  const reg = /^#elementfrompoint\s*\((\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\)/i
  const m   = str.trim().match(reg)

  if (!m) {
    throw new Error(`Invalid '#elementfrompoint' expression`)
  }

  const viewportX = parseFloat(m[1])
  const viewportY = parseFloat(m[2])

  if (viewportX <= 0 || viewportY <= 0) {
    throw new Error(`'#elementfrompoint' only accepts positive numbers`)
  }

  return [viewportX, viewportY]
}

export function elementByElementFromPoint (str: string): Element | null {
  const [x, y]  = viewportCoordinateByElementFromPoint(str)
  const el      = document.elementFromPoint(x, y)
  return el
}
