import React from 'react'
import ReactDOM from 'react-dom'
import { LocaleProvider, Button, Checkbox, Modal, message } from 'antd'
import enUS from 'antd/lib/locale-provider/en_US'

import storage from '../common/storage'
import FileSaver from '../common/lib/file_saver'
import { getStorageManager, StorageStrategyType } from '../services/storage'
import { getXFile } from '../services/xmodules/xfile'
import { parseQuery, cn } from '../common/utils'
import { throttle, delay, withFileExtension } from '../common/ts_utils';
import { offset, preloadImage, imageBlobFromSVG, svgNodetoString } from '../common/dom_utils'
import { EditorState, Editor, PieceState, CannotCreateError } from './controllers/editor';
import { Point, BoxAnchorPosition, getAnchorRects as getAnchorRectsForBox } from './controllers/box';
import { polyfillTimeoutFunctions } from '@/services/timeout/cs_timeout'
import csIpc from '@/common/ipc/ipc_cs'

import 'antd/dist/antd.css'
import './index.scss'

polyfillTimeoutFunctions(csIpc)

const rootEl = document.getElementById('root');
const render = () => ReactDOM.render(
  <LocaleProvider locale={enUS}>
    <App />
  </LocaleProvider>,
  rootEl
);

enum Mode {
  Normal,
  Creating,
  Moving,
  Resizing
}

type Props = {}

type State = {
  mode:               Mode,
  ready:              boolean;
  imageUrl:           string | undefined;
  imageWidth:         number;
  imageHeight:        number;
  editor:             EditorState | undefined;
  creating:           boolean;
  moving:             boolean;
  isMouseDown:        boolean;
  disableMouseDown:   boolean;
  mouseDownPoint:     Point | undefined;
  pieceId:            string | undefined;
  shouldAddRelativeInFileName: boolean;
}

class App extends React.Component<Props, State> {
  private controller: Editor | undefined
  private svg: SVGElement | undefined

  public state: State = {
    mode:             Mode.Normal,
    ready:            false,
    imageUrl:         undefined,
    imageWidth:       0,
    imageHeight:      0,
    editor:           undefined,
    creating:         false,
    moving:           false,
    isMouseDown:      false,
    disableMouseDown: false,
    mouseDownPoint:   undefined,
    pieceId:          undefined,
    shouldAddRelativeInFileName: false
  }

  throttledWarn = throttle(message.warn, 3000)

  onClickCancel = () => {
    if (!this.hasAnyChanges())  return window.close()

    return Modal.confirm({
      title: `Unsaved changes in image "${this.getVisionFileName()}"`,
      content: 'Do you want to discard your changes?',
      okText: 'Yes. Close window',
      cancelText: 'No. Go back',
      onOk: () => {
        return window.close()
      },
      onCancel: () => {
        return Promise.resolve(true)
      }
    })
  }

  onClickSaveAndClose = () => {
    if (!this.hasAnyChanges()) return

    const hideAnchors = () => {
      if (this.controller) {
        this.controller.cancelSelectPiece()
      }
      return delay(() => {}, 20)
    }
    const getFileName = () => {
      return withFileExtension(
        this.getVisionFileName(),
        (baseName) => {
          if (!this.state.shouldAddRelativeInFileName)  return baseName
          if (/_relative$/i.test(baseName)) return baseName
          return baseName + '_relative'
        }
      ) as string;
    }
    const finalFileName = getFileName()

    return hideAnchors()
    .then(() => imageBlobFromSVG(svgNodetoString(this.svg as SVGElement), 'image/png', 1.0))
    .then(blob => {
      return getStorageManager()
      .getVisionStorage()
      .overwrite(finalFileName, blob)
    })
    .then(() => {
      const kantuWindow = window.opener as Window
      kantuWindow.postMessage({ type: 'RELOAD_VISIONS'}, '*')

      message.success('Successfully saved')
      return delay(() => {}, 1000)
    })
    .then(() => {
      window.close()
    })
  }

  onKeyDown = (e: KeyboardEvent) => {
    if (!e.target || (e.target as HTMLElement).tagName.toUpperCase() === 'TEXTAREA')  return
    if (!this.state.editor) return
    if (!this.controller)   return

    if (this.state.editor.piece.active) {
      let hit = true

      switch (e.key) {
        case 'Delete':
        case 'Backspace': {
          this.controller.removePiece(this.state.editor.piece.active)
          break
        }
        case 'ArrowUp': {
          this.controller.movePieceDirectly(this.state.editor.piece.active, { dx: 0, dy: e.shiftKey ? -10 : -1 })
          break
        }
        case 'ArrowDown': {
          this.controller.movePieceDirectly(this.state.editor.piece.active, { dx: 0, dy: e.shiftKey ? 10 : 1 })
          break
        }
        case 'ArrowLeft': {
          this.controller.movePieceDirectly(this.state.editor.piece.active, { dy: 0, dx: e.shiftKey ? -10 : -1 })
          break
        }
        case 'ArrowRight': {
          this.controller.movePieceDirectly(this.state.editor.piece.active, { dy: 0, dx: e.shiftKey ? 10 : 1 })
          break
        }
        default:
          hit = false
          break
      }

      if (hit) {
        e.preventDefault()
      }
    }
  }

  svgOffsetPoint = (pageX: number, pageY: number) => {
    const svg           = this.svg as SVGElement
    const svgOffset     = offset(svg)
    const { viewport }  = this.state.editor as EditorState

    return {
      x: viewport.x + pageX - svgOffset.left,
      y: viewport.y + pageY - svgOffset.top
    }
  }

  xSvg2DOM = (x: number) => {
    const svg           = this.svg as SVGElement
    const svgOffset     = offset(svg)
    const { viewport }  = this.state.editor as EditorState

    return  x - viewport.x + svgOffset.left
  }

  ySvg2DOM = (y: number) => {
    const svg           = this.svg as SVGElement
    const svgOffset     = offset(svg)
    const { viewport }  = this.state.editor as EditorState

    return  y - viewport.y + svgOffset.top
  }

  onEditorClick = () => {
    if (!this.state.creating && !this.state.moving && this.controller) {
      this.controller.cancelSelectPiece()
    }
  }

  onEdtiorMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    if (!this.controller) return
    if (this.state.disableMouseDown)  return
    if (!this.state.editor || !this.state.editor.tool.active) return

    const point = this.svgOffsetPoint(e.pageX, e.pageY)

    switch (this.state.editor.tool.active) {
      case 'text': {
        const activePiece = this.getActivePiece()

        if (activePiece && activePiece.type === 'text') {
          // Do nothing
        } else {
          try {
            this.controller.createPiece(point, {
              data: {
                text: '',
                editing: true
              }
            })
          } catch (e) {
            if (e instanceof CannotCreateError) {
              this.throttledWarn(e.message)
            }
          }
        }

        break
      }

      default: {
        this.setState({
          mode: Mode.Creating,
          isMouseDown: true,
          mouseDownPoint: this.svgOffsetPoint(e.pageX, e.pageY)
        })
      }
    }
  }

  onEdtiorMouseUp = (e: MouseEvent) => {
    if (!this.controller) return

    const nextState = {
      isMouseDown:  false,
      creating:     false,
      moving:       false,
      mode:         Mode.Normal
    }

    switch (this.state.mode) {
      case Mode.Resizing: {
        const { pieceId } = this.state
        if (!pieceId) throw new Error('no pieceId found')
        this.controller.movePieceAnchorEnd(pieceId)
        break
      }

      case Mode.Moving: {
        const { pieceId } = this.state
        if (!pieceId) throw new Error('no pieceId found')
        this.controller.movePieceEnd(pieceId)
        break
      }
    }

    // Note: wait for onEditorClick to be triggered first, then set creating to false
    setTimeout(() => {
      this.setState(nextState)
    }, 0)
  }

  onEditorMouseMove = (e: MouseEvent) => {
    if (!this.controller) return
    if (!this.state.isMouseDown)  return

    switch (this.state.mode) {
      case Mode.Creating: {
        const { mouseDownPoint } = this.state
        if (!mouseDownPoint)  throw new Error('no mouse down point found')

        const pieceInfo = (() => {
          try {
            return this.controller.createPiece(mouseDownPoint)
          } catch (e) {
            if (e instanceof CannotCreateError) {
              this.throttledWarn(e.message)
            }
          }
        })()

        if (!pieceInfo) return

        this.setState({
          creating: true
        })

        this.movePieceAnchorStart(pieceInfo.id, pieceInfo.defaultAnchorPos)
        break
      }

      case Mode.Resizing: {
        const { pieceId } = this.state
        if (!pieceId) throw new Error('no pieceId found')
        this.controller.movePieceAnchor(pieceId, this.svgOffsetPoint(e.pageX, e.pageY), { fit: e.shiftKey })
        break
      }

      case Mode.Moving: {
        const { pieceId } = this.state
        if (!pieceId) throw new Error('no pieceId found')
        this.controller.movePiece(pieceId, this.svgOffsetPoint(e.pageX, e.pageY))
        this.setState({ moving: true })
        break
      }
    }
  }

  getActivePiece () {
    const { piece } = this.state.editor as EditorState
    if (!piece.active || !piece.list)  return

    return piece.list.find(item => item.id === piece.active)
  }

  movePieceAnchorStart (pieceId: string, anchorPos: BoxAnchorPosition) {
    if (!this.controller) return
    this.controller.movePieceAnchorStart(pieceId, anchorPos)

    this.setState({
      pieceId,
      mode: Mode.Resizing,
      isMouseDown: true
    })
  }

  movePieceStart (pieceId: string, point: Point) {
    if (!this.controller) return
    this.controller.movePieceStart(pieceId, point)

    this.setState({
      pieceId,
      mode: Mode.Moving,
      isMouseDown: true
    })
  }

  bindKeyEvents () {
    document.addEventListener('keydown', this.onKeyDown, true)
  }

  unbindKeyEvents () {
    document.removeEventListener('keydown', this.onKeyDown, true)
  }

  hasAnyChanges () {
    const editor = this.state.editor as EditorState
    return editor.piece.list.length > 0
  }

  getVisionFileName () {
    const queryObj = parseQuery(window.location.search)
    return queryObj.vision
  }

  componentDidMount () {
    const visionFile = this.getVisionFileName()

    if (!visionFile) return

    document.title = visionFile + ' - Image Editor (RPA Computer Vision)'

    getStorageManager()
    .getVisionStorage()
    .read(visionFile, 'DataURL')
    .then(dataUrl => {
      if (!dataUrl) throw new Error('File is empty')
      let url = dataUrl as string

      return preloadImage(url)
    })
    .then(data => {
      this.controller = new Editor({
        viewport: {
          x: 0,
          y: 0,
          width: data.width,
          height: data.height
        },
        onStateChange: (editorState: EditorState) => {
          this.setState({
            editor: editorState
          })
        },
        canCreatePiece: (key: string, state: EditorState): boolean => {
          switch (key) {
            case 'pinkBox':
            case 'greenBox':
              const found = state.piece.list.find(item => item.type === key)
              return !found
          }

          return true
        }
      })

      this.setState({
        imageUrl:     data.$img.src,
        imageWidth:   data.width,
        imageHeight:  data.height,
        ready:        true
      })

      this.bindKeyEvents()
    })
    .catch(e => {
      message.error(e.message)
    })
  }

  componentWillUnmount () {
    this.unbindKeyEvents()
  }

  renderAnchors (options: any) {
    const { id, rect, category } = options

    const getAnchorRects = getAnchorRectsForBox
    const anchors = getAnchorRects({ rect })

    return (
      <g>
        {anchors.map(item => (
          <rect
            {...item.rect}
            key={item.anchorPos}
            className={`anchor anchor-${item.anchorPos}`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
              e.stopPropagation()
              this.movePieceAnchorStart(id, item.anchorPos)
            }}
          />
        ))}
      </g>
    )
  }

  renderRect (data: PieceState, isActive: boolean, commonProps: Record<string, any>) {
    const { rect } = data

    return (
      <g key={data.id} >
        <rect {...rect} {...commonProps} />
        {isActive ? this.renderAnchors(data) : null}
      </g>
    )
  }

  renderPieces () {
    const { piece } = this.state.editor as EditorState
    const renderSinglePiece = (item: PieceState) => {
      const commonProps = {
        className:    'piece',
        style:        item.style || {},
        onClick:      (e: MouseEvent) => {
          if (!this.controller)   return
          if (this.state.moving)  return
          e.stopPropagation()
          this.controller.selectPiece(item.id)
        },
        onMouseDown:  (e: MouseEvent) => {
          e.stopPropagation()
          this.movePieceStart(item.id, this.svgOffsetPoint(e.pageX, e.pageY))
        }
      }
      const isActive = item.id === piece.active

      switch (item.type) {
        case 'box':
        case 'greenBox':
        case 'pinkBox':
          return this.renderRect(item, isActive, commonProps)
      }
    }

    return (
      <g>
        {(piece.list || []).map(renderSinglePiece)}
      </g>
    )
  }

  render () {
    const ready   = this.state.ready
    const editor  = this.state.editor as EditorState

    if (!ready || !editor || !this.controller)  return <div />

    return (
      <div className="vision-editor">
        <div className="editor-main">
          <div className="editor-toolbox">
            <h3>Relative Clicks</h3>

            <div className="tool-item">
              <label>Anchor Image:</label>

              <button
                className={cn("tool-button green-button", { active: editor.tool.active === 'greenBox' })}
                onClick={() => {
                  if (!this.controller) return
                  this.controller.toggleSelectTool('greenBox')
                }}
              >
                Green Box
              </button>
            </div>

            <div className="tool-item">
              <label>Click Area:</label>

              <button
                className={cn("tool-button pink-button", { active: editor.tool.active === 'pinkBox' })}
                onClick={() => {
                  if (!this.controller) return
                  this.controller.toggleSelectTool('pinkBox')
                }}
              >
                Pink Box
              </button>
            </div>

            {/* <div className="relative-checkbox">
              <Checkbox
                onChange={e => this.setState({ shouldAddRelativeInFileName: (e.target as any).checked })}
                checked={this.state.shouldAddRelativeInFileName}
              >
                Add "_relative" to the file name
              </Checkbox>
            </div> */}
          </div>

          <div className="editor-canvas-scroller">
            <div className="editor-canvas">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                width={editor.viewport.width}
                height={editor.viewport.height}
                viewBox={`${editor.viewport.x} ${editor.viewport.y} ${editor.viewport.width} ${editor.viewport.height}`}
                ref={ref => { this.svg = ref as SVGElement }}
                onClick={this.onEditorClick}
                onMouseDown={this.onEdtiorMouseDown as any}
                onMouseUp={this.onEdtiorMouseUp as any}
                onMouseMove={this.onEditorMouseMove as any}
                className={cn({
                  'with-tool':  !editor.tool.active
                }, editor.tool.active || {})}
              >
                <defs>
                  <filter id="shadow">
                    <feDropShadow dx="4" dy="8" stdDeviation="4"/>
                  </filter>
                </defs>
                {/* <rect fill="#003300" x={0} y={0} width={screenshot.width} height={screenshot.height} /> */}
                <image
                  xlinkHref={this.state.imageUrl}
                  x={0}
                  y={0}
                  width={this.state.imageWidth}
                  height={this.state.imageHeight}
                />
                {this.renderPieces()}
              </svg>
            </div>
          </div>

        </div>

        <div className="editor-bottom">
          <a
            className="editor-tips"
            target="_blank"
            href="https://ui.vision/x/idehelp?help=relative_clicks"
          >
            Info: What are relative clicks?
          </a>
          <div className="editor-actions">
            <Button
              onClick={this.onClickCancel}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              disabled={!this.hasAnyChanges()}
              onClick={this.onClickSaveAndClose}
            >
              Save + Close
            </Button>
          </div>
        </div>
      </div>
    )
  }
}

function restoreConfig () {
  return storage.get('config')
  .then((config = {}) => {
    return {
      storageMode: StorageStrategyType.Browser,
      ...config
    }
  })
}

function init () {
  return Promise.all([
    restoreConfig(),
    getXFile().getConfig()
  ])
  .then(([config, xFileConfig]) => {
    getStorageManager(config.storageMode)
    render()
  }, render)
}

init()

