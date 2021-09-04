import { objFilter } from "../../common/ts_utils";

export enum BoxAnchorPosition {
  TopLeft     = 1,
  TopRight    = 2,
  BottomRight = 3,
  BottomLeft  = 4
}

export type Point = {
  x: number;
  y: number;
}

export type Rect = {
  x:      number;
  y:      number;
  width:  number;
  height: number;
}

export type PositionedRect = {
  rect:       Rect;
  anchorPos:  BoxAnchorPosition;
}

export const fitSquarePoint = (movingPoint: Point, fixedPoint: Point): Point => {
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

export const calcRectAndAnchor = (movingPoint: Point, fixedPoint: Point): PositionedRect => {
  const mp = movingPoint
  const fp = fixedPoint
  let pos: BoxAnchorPosition | null  = null
  let tlp: Point | null  = null

  if (mp.x <= fp.x && mp.y <= fp.y) {
    pos = BoxAnchorPosition.TopLeft
    tlp = mp
  } else if (mp.x > fp.x && mp.y > fp.y) {
    pos = BoxAnchorPosition.BottomRight
    tlp = fp
  } else if (mp.x > fp.x) {
    pos = BoxAnchorPosition.TopRight
    tlp = { x: fp.x, y: mp.y }
  } else if (mp.y > fp.y) {
    pos = BoxAnchorPosition.BottomLeft
    tlp = { x: mp.x, y: fp.y }
  }

  if (!tlp) throw new Error('Impossible tlp')
  if (!pos) throw new Error('Impossible pos')

  return {
    rect: {
      x:      tlp.x,
      y:      tlp.y,
      width:  Math.abs(mp.x - fp.x),
      height: Math.abs(mp.y - fp.y)
    },
    anchorPos: pos
  }
}

export const pointAtPos = (rect: Rect, pos: BoxAnchorPosition): Point => {
  switch (pos) {
    case BoxAnchorPosition.TopLeft:
      return {
        x: rect.x,
        y: rect.y
      }
    case BoxAnchorPosition.TopRight:
      return {
        x: rect.x + rect.width,
        y: rect.y
      }
    case BoxAnchorPosition.BottomRight:
      return {
        x: rect.x + rect.width,
        y: rect.y + rect.height
      }
    case BoxAnchorPosition.BottomLeft:
      return {
        x: rect.x,
        y: rect.y + rect.height
      }
  }
}

export const diagonalPos = (pos: BoxAnchorPosition): BoxAnchorPosition => {
  switch (pos) {
    case BoxAnchorPosition.TopLeft:
      return BoxAnchorPosition.BottomRight

    case BoxAnchorPosition.TopRight:
      return BoxAnchorPosition.BottomLeft

    case BoxAnchorPosition.BottomRight:
      return BoxAnchorPosition.TopLeft

    case BoxAnchorPosition.BottomLeft:
      return BoxAnchorPosition.TopRight
  }
}

export const diagonalPoint = (rect: Rect, anchorPos: BoxAnchorPosition): Point => {
  return pointAtPos(rect, diagonalPos(anchorPos))
}

export const genGetAnchorRects = (ANCHOR_POS: Record<string, number>, pointAtPos: (r: Rect, p: BoxAnchorPosition) => Point) =>  {
  return (options: { rect: Rect, size?: number }): PositionedRect[] => {
    const { rect, size = 5 }  = options
    const values              = (obj: Record<string, any>): any[] => Object.keys(obj).map(key => obj[key])
    const createRect          = (point: Point, size: number) => ({
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
}

export const getAnchorRects = genGetAnchorRects(
  objFilter((val: any) => typeof val === 'number', BoxAnchorPosition),
  pointAtPos
)

export type BoxOptions = {
  x:              number;
  y:              number;
  width?:         number;
  height?:        number;
  id?:            string;
  data?:          any;
  type?:          string;
  transform?:     (state: BoxState) => BoxState;
  onStateChange?: (state: BoxState, lastState: BoxState) => void;
}

export type BoxState = {
  id:         string;
  category?:  string;
  type:       string;
  data:       any;
  style:      Record<string, string>;
  rect:       Rect;
}

export type BoxLocal = {
  anchorPos?:     BoxAnchorPosition | null;
  oldAnchorPos?:  BoxAnchorPosition | null;
  oldPoint?:      Point | null;
  oldRect?:       Rect | null;
}

export class Box {
  // Note: possible settings
  static settings         = []
  static category         = 'rect'
  static key              = 'box'
  static defaultAnchorPos = BoxAnchorPosition.BottomRight

  private transform:      (state: BoxState) => BoxState;
  private onStateChange:  (state: BoxState, lastState: BoxState) => void;

  private state: BoxState = {
    id:   '' + Math.random(),
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

  private local: BoxLocal = {}

  constructor (options: BoxOptions) {
    const opts = Object.assign({
      transform:      (x: any) => x,
      onStateChange:  () => {}
    }, options)

    this.transform      = opts.transform
    this.onStateChange  = opts.onStateChange

    this.__setState({
      id:       opts.id,
      data:     opts.data,
      type:     this.getType(),
      style:    this.getDefaultStyle(),
      category: this.getCategory(),
      rect: {
        x:      opts.x,
        y:      opts.y,
        width:  opts.width || 0,
        height: opts.height || 0
      }
    }, { silent: true })
  }

  getType () {
    return 'box'
  }

  getCategory () {
    return Box.category
  }

  getDefaultAnchorPos () {
    return BoxAnchorPosition.BottomRight
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

  getStyle () {
    return this.state.style
  }

  processIncomingStyle (style: Record<string, any>) {
    return style
  }

  setStyle (obj: Record<string, any>) {
    this.__setState({
      style: {
        ...this.state.style,
        ...this.processIncomingStyle(obj)
      }
    })
  }

  setData (data: any) {
    this.__setState({ data })
  }

  moveAnchorStart ({ anchorPos }: { anchorPos: BoxAnchorPosition }) {
    this.__setLocal({
      oldPoint:     pointAtPos(this.state.rect, anchorPos),
      oldAnchorPos: anchorPos,
      anchorPos:    anchorPos
    })
  }

  moveAnchor (point: Point, options: Record<string, any> = {}) {
    const old     = this.state.rect
    const pos     = this.local.anchorPos
    const fixed   = diagonalPoint(old, pos as BoxAnchorPosition)
    const moving  = !options.fit ? point : fitSquarePoint(point, fixed)
    const res     = calcRectAndAnchor(moving, fixed)

    this.__setLocal({ anchorPos: res.anchorPos })
    this.__setState({ rect: res.rect })
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

  moveBox ({ dx, dy }: { dx: number, dy: number }) {
    const old = this.local.oldRect as Rect
    this.__setState({
      rect: {
        ...old,
        x: old.x + dx,
        y: old.y + dy
      }
    })
  }

  moveBoxEnd () {
    this.__setLocal({
      oldRect: null
    })
  }

  __setState (obj: Partial<BoxState>, opts: Record<string, any> = {}) {
    const last = this.getState()

    this.state = {
      ...this.state,
      ...obj
    }

    if (opts.silent)  return

    const fn      = () => this.onStateChange(this.getState(), last)
    const invoke  = opts.nextTick ? (fn: Function) => setTimeout(fn, 0) : (fn: Function) => fn()

    invoke(fn)
  }

  __setLocal (obj: Partial<BoxLocal>) {
    this.local = {
      ...this.local,
      ...obj
    }
  }
}
