import { Rect, BoxAnchorPosition, Point, Box, BoxState } from './box'
import { GreenBox } from './green_box'
import { PinkBox } from './pink_box'
import { setIn, uid, compose, updateIn } from '../../common/ts_utils';

// Note: There could be more types for Tool in the future
export type Tool   = typeof Box
export type Piece  = Box
export type PieceState = BoxState

export type SelectableList<ItemType, KeyType> = {
  list:   ItemType[];
  active: KeyType | null;
}

export type EditorState = {
  viewport: Rect;
  tool:     SelectableList<Tool, string>;
  piece:    SelectableList<PieceState, string>;
  settings: Record<string, any>;
}

export type EditorLocal = {
  pieces:         Piece[];
  availableTools: Tool[];
  move:           Record<string, { id: string, point: Point }>;
  moveAnchor:     Record<string, { id: string, anchorPos: BoxAnchorPosition }>;
}

export type EditorOptions = {
  onStateChange:    (state: EditorState, lastState: EditorState) => void;
  canCreatePiece:   (pieceType: string, state: EditorState) => boolean;
  availableTools?:  Tool[];
  viewport?:        Rect;
}

export class CannotCreateError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'CannotCreateError';

    // Note: better to keep stack trace
    // reference: https://stackoverflow.com/a/32749533/1755633
    let captured = true

    if (typeof Error.captureStackTrace === 'function') {
      try {
        Error.captureStackTrace(this, this.constructor)
      } catch (e) {
        captured = false
      }
    }

    if (!captured) {
      this.stack = (new Error(message)).stack
    }
  }
}

export class Editor {
  private onStateChange: (state: EditorState, lastState: EditorState) => void
  private canCreatePiece: (pieceType: string, state: EditorState) => boolean

  private state: EditorState = {
    viewport: {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    },
    tool: {
      list: [],
      active: null
    },
    settings: [],
    piece: {
      list: [],
      active: null
    }
  }

  private local: EditorLocal = {
    pieces: [],
    availableTools: [],
    move: {},
    moveAnchor: {}
  }

  constructor (options: EditorOptions) {
    const opts = Object.assign({
      availableTools: [GreenBox, PinkBox],
      onStateChange:  () => {},
      canCreatePiece: () => true
    }, options)

    this.onStateChange  = opts.onStateChange
    this.canCreatePiece = opts.canCreatePiece

    this.__setLocal({ availableTools: opts.availableTools })

    this.__setState({
      ...(opts.viewport ? { viewport: opts.viewport } : {}),
      tool: {
        list:   opts.availableTools,
        active: null
      }
    })
  }

  setViewport (viewport: Rect) {
    this.__setState({ viewport })
  }

  toggleSelectTool (key: string) {
    const Klass = this.local.availableTools.find(Klass => Klass.key === key)
    if (!Klass) throw new Error(`Invalid ToolClass key '${key}'`)

    const active = key === this.state.tool.active ? null : key

    this.__setState(
      setIn(['tool', 'active'], active, this.state)
    )
  }

  createPiece (point: Point, extra = {}): { id: string, defaultAnchorPos: BoxAnchorPosition } | null {
    if (!this.state.tool.active)  return null

    const { x, y }  = point
    const key       = this.state.tool.active
    const Klass     = this.local.availableTools.find(item => item.key === key) as (typeof Box)

    if (!Klass) throw new Error(`ToolClass with key '${key}' not found`)
    if (!this.canCreatePiece(key, this.state)) throw new CannotCreateError(`cannot create this kind of piece any more`)

    const id = uid()
    const piece = new Klass({
      ...extra,
      id,
      x,
      y,
      onStateChange: (state, old) => {
        const foundIndex  = this.state.piece.list.findIndex(item => item.id === id)
        const index       = foundIndex !== -1 ? foundIndex : this.state.piece.list.length

        this.__setState(
          setIn(['piece', 'list', index], state, this.state)
        )
      }
    })

    this.__setLocal({
      pieces: [...this.local.pieces, piece]
    })

    this.__setState(
      compose(
        setIn(['piece', 'list', this.state.piece.list.length], piece.getState()),
        setIn(['piece', 'active'], id),
        setIn(['piece', 'creating'], true)
      )(this.state)
    )

    return {
      id,
      defaultAnchorPos: piece.getDefaultAnchorPos()
    }
  }

  selectPiece (id: string): void {
    this.__setState(
      setIn(['piece', 'active'], id, this.state)
    )
  }

  cancelSelectPiece (): void {
    if (!this.state.piece.active) return

    this.__setState(
      setIn(['piece', 'active'], null, this.state)
    )
  }

  removePiece (id: string): void {
    const index = this.state.piece.list.findIndex(item => item.id === id)
    if (index === -1) return

    this.__setState(
      compose(
        updateIn(['piece', 'list'], (list: PieceState[]) => list.filter(item => item.id !== id)),
        updateIn(['piece', 'active'], (activeId: string) => activeId === id ? null : activeId)
      )(this.state)
    )
  }

  setPieceStyle (id: string, style: Record<string, any>): void {
    const piece = this.__findPiece(id)
    piece.setStyle(style)
  }

  setPieceData (id: string, data: any): void {
    const piece = this.__findPiece(id)
    piece.setData(data)
  }

  movePieceStart (id: string, point: Point): void {
    const piece = this.__findPiece(id)

    this.__setLocal(
      setIn(['move', id], { id, point }, this.local)
    )

    piece.moveBoxStart()
  }

  movePiece (id: string, point: Point): void {
    const piece = this.__findPiece(id)
    const data  = this.local.move[id]
    if (!data || !data.point) throw new Error('No initial cursor point saved')

    const dx = point.x - data.point.x
    const dy = point.y - data.point.y

    piece.moveBox({ dx, dy })
  }

  movePieceEnd (id: string): void {
    const piece = this.__findPiece(id)

    this.__setLocal(
      setIn(['move', id], null, this.local)
    )

    piece.moveBoxEnd()
  }

  movePieceDirectly (id: string, { dx, dy }: any): void {
    const piece = this.__findPiece(id)

    piece.moveBoxStart()
    piece.moveBox({ dx, dy })
    piece.moveBoxEnd()
  }

  movePieceAnchorStart (id: string, anchorPos: BoxAnchorPosition): void {
    const piece = this.__findPiece(id)

    this.__setLocal(
      setIn(['moveAnchor', id], { id, anchorPos }, this.local)
    )

    piece.moveAnchorStart({ anchorPos })
  }

  movePieceAnchor (id: string, point: Point, options = {}): void {
    const piece = this.__findPiece(id)
    piece.moveAnchor(point, options)
  }

  movePieceAnchorEnd (id: string): void {
    const piece = this.__findPiece(id)

    this.__setLocal(
      setIn(['moveAnchor', id], null, this.local)
    )

    piece.moveAnchorEnd()
  }

  __findPiece (id: string): Piece {
    const piece = this.local.pieces.find(item => item.getId() === id)
    if (!piece)  throw new Error(`Piece with id '${id}' not found`)
    return piece
  }

  __setState (obj: Partial<EditorState>) {
    const last = this.state

    this.state = {
      ...this.state,
      ...obj
    }

    this.onStateChange(this.state, last)
  }

  __setLocal (obj: Partial<EditorLocal>) {
    this.local = {
      ...this.local,
      ...obj
    }
  }
}
