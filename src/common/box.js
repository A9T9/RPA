
export const BOX_ANCHOR_POS = {
  TOP_LEFT: 1,
  TOP_RIGHT: 2,
  BOTTOM_RIGHT: 3,
  BOTTOM_LEFT: 4
}

export const fitSquarePoint = (movingPoint, fixedPoint) => {
  const mp    = movingPoint
  const fp    = fixedPoint
  const xlen  = Math.abs(mp.x - fp.x)
  const ylen  = Math.abs(mp.y - fp.y)
  const len   = Math.min(xlen, ylen)

  return {
    x: fp.x + Math.sign(mp.x - fp.x) * len,
    y: fp.y + Math.sign(mp.y - fp.y) * len
  }
}

export const calcRectAndAnchor = (movingPoint, fixedPoint) => {
  const mp = movingPoint
  const fp = fixedPoint
  let pos  = null
  let tlp  = null

  if (mp.x <= fp.x && mp.y <= fp.y) {
    pos = BOX_ANCHOR_POS.TOP_LEFT
    tlp = mp
  } else if (mp.x > fp.x && mp.y > fp.y) {
    pos = BOX_ANCHOR_POS.BOTTOM_RIGHT
    tlp = fp
  } else if (mp.x > fp.x) {
    pos = BOX_ANCHOR_POS.TOP_RIGHT
    tlp = { x: fp.x, y: mp.y }
  } else if (mp.y > fp.y) {
    pos = BOX_ANCHOR_POS.BOTTOM_LEFT
    tlp = { x: mp.x, y: fp.y }
  }

  return {
    rect: {
      x: tlp.x,
      y: tlp.y,
      width: Math.abs(mp.x - fp.x),
      height: Math.abs(mp.y - fp.y)
    },
    anchorPos: pos
  }
}

export const pointAtPos = (rect, pos) => {
  switch (pos) {
    case BOX_ANCHOR_POS.TOP_LEFT:
      return {
        x: rect.x,
        y: rect.y
      }
    case BOX_ANCHOR_POS.TOP_RIGHT:
      return {
        x: rect.x + rect.width,
        y: rect.y
      }
    case BOX_ANCHOR_POS.BOTTOM_RIGHT:
      return {
        x: rect.x + rect.width,
        y: rect.y + rect.height
      }
    case BOX_ANCHOR_POS.BOTTOM_LEFT:
      return {
        x: rect.x,
        y: rect.y + rect.height
      }
  }
}

export const diagonalPos = (pos) => {
  switch (pos) {
    case BOX_ANCHOR_POS.TOP_LEFT:
      return BOX_ANCHOR_POS.BOTTOM_RIGHT

    case BOX_ANCHOR_POS.TOP_RIGHT:
      return BOX_ANCHOR_POS.BOTTOM_LEFT

    case BOX_ANCHOR_POS.BOTTOM_RIGHT:
      return BOX_ANCHOR_POS.TOP_LEFT

    case BOX_ANCHOR_POS.BOTTOM_LEFT:
      return BOX_ANCHOR_POS.TOP_RIGHT
  }
}

export const diagonalPoint = (rect, anchorPos) => {
  return pointAtPos(rect, diagonalPos(anchorPos))
}

export const genGetAnchorRects = (ANCHOR_POS, pointAtPos) => ({ rect, size = 5 }) => {
  const values = (obj) => Object.keys(obj).map(key => obj[key])
  const createRect = (point, size) => ({
    x: point.x - size,
    y: point.y - size,
    width: size * 2,
    height: size * 2
  })

  return values(ANCHOR_POS).map(pos => {
    return {
      anchorPos: pos,
      rect: createRect(pointAtPos(rect, pos), size)
    }
  })
}

export const getAnchorRects = genGetAnchorRects(BOX_ANCHOR_POS, pointAtPos)

export class Box {
  // Note: possible settings
  static settings = []
  static category = 'rect'
  static defaultAnchorPos = BOX_ANCHOR_POS.BOTTOM_RIGHT

  state = {
    type: 'box',
    data: null,
    style: {},
    rect: {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    }
  }

  local = {}

  constructor (options) {
    const opts = Object.assign({
      firstSilence: true,
      transform: x => x,
      onStateChange: () => {}
    }, options)

    this.transform = opts.transform
    this.onStateChange = opts.onStateChange
    this.normalizeRect = opts.normalizeRect || (x => x)

    this.__setState({
      id:     opts.id,
      data:   opts.data,
      type:   this.getType(),
      style:  this.getDefaultStyle(),
      category: this.getCategory(),
      rect: {
        x:      opts.x,
        y:      opts.y,
        width:  opts.width || 0,
        height: opts.height || 0
      }
    }, { silent: opts.firstSilence })
  }

  getType () {
    return 'box'
  }

  getCategory () {
    return Box.category
  }

  getDefaultAnchorPos () {
    return BOX_ANCHOR_POS.BOTTOM_RIGHT
  }

  getDefaultStyle () {
    return {}
  }

  getId () {
    return this.state.id
  }

  getState () {
    return this.transform(this.state)
  }

  processIncomingStyle (style) {
    return style
  }

  setStyle (obj) {
    this.__setState({
      style: {
        ...this.state.style,
        ...this.processIncomingStyle(obj)
      }
    })
  }

  setData (data) {
    this.__setState({ data })
  }

  moveAnchorStart ({ anchorPos }) {
    this.__setLocal({
      oldPoint:     pointAtPos(this.state.rect, anchorPos),
      oldAnchorPos: anchorPos,
      anchorPos:    anchorPos
    })
  }

  moveAnchor ({ x, y }, { fit } = {}) {
    const old     = this.state.rect
    const pos     = this.local.anchorPos
    const fixed   = diagonalPoint(old, pos)
    const moving  = !fit ? { x, y } : fitSquarePoint({ x, y }, fixed)
    const res     = calcRectAndAnchor(moving, fixed)

    this.__setLocal({ anchorPos: res.anchorPos })
    this.__setState({ rect: this.normalizeRect(res.rect, 'moveAnchor') })
  }

  moveAnchorEnd () {
    this.__setLocal({
      oldPoint:     null,
      oldAnchorPos: null,
      anchorPos:    null
    })
  }

  moveBoxStart () {
    this.__setLocal({
      oldRect: { ...this.state.rect }
    })
  }

  moveBox ({ dx, dy }) {
    const old = this.local.oldRect
    const upd = {
      ...old,
      x: old.x + dx,
      y: old.y + dy
    }

    this.__setState({ rect: this.normalizeRect(upd, 'moveBox') })
  }

  moveBoxEnd () {
    this.__setLocal({
      oldRect: null
    })
  }

  __setState (obj, opts = {}) {
    const last = this.getState()

    this.state = {
      ...this.state,
      ...obj
    }

    if (opts.silent)  return

    const fn      = () => this.onStateChange(this.getState(), last)
    const invoke  = opts.nextTick ? (fn) => setTimeout(fn, 0) : (fn) => fn()

    invoke(fn)
  }

  __setLocal (obj) {
    this.local = {
      ...this.local,
      ...obj
    }
  }
}
