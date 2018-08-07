import { setStyle, pixel, bindDrag } from '../../common/dom_utils'
import { Box, BOX_ANCHOR_POS } from '../../common/box'
import Ext from '../../common/web_extension'

export const commonStyle = {
  boxSizing:  'border-box',
  fontFamily: 'Arial'
}

export const createEl = ({ tag = 'div', attrs = {}, style = {}, text }) => {
  const $el = document.createElement(tag)

  Object.keys(attrs).forEach(key => {
    $el.setAttribute(key, attrs[key])
  })

  if (text && text.length) {
    $el.innerText = text
  }

  setStyle($el, style)
  return $el
}

export const createRect = (opts) => {
  const containerStyle = {
    ...commonStyle,
    position: 'absolute',
    zIndex:   100000,
    top:      pixel(opts.top),
    left:     pixel(opts.left),
    width:    pixel(opts.width),
    height:   pixel(opts.height),
    ...(opts.containerStyle || {})
  }
  const rectStyle = {
    ...commonStyle,
    width:    '100%',
    height:   '100%',
    border:   `${opts.rectBorderWidth}px solid rgb(239, 93, 143)`,
    cursor:   'move',
    background: 'transparent',
    ...(opts.rectStyle || {})
  }

  const $container = createEl({ style: containerStyle })
  const $rectangle = createEl({ style: rectStyle })

  $container.appendChild($rectangle)
  document.body.appendChild($container)

  return {
    $container,
    $rectangle,
    destroy: () => {
      $container.remove()
    },
    hide: () => {
      setStyle($container, { display: 'none' })
    },
    show: () => {
      setStyle($container, { display: 'block' })
    }
  }
}

const createOverlay = () => {
  const $overlay = createEl({
    style: {
      position:   'fixed',
      zIndex:     9000,
      top:        0,
      bottom:     0,
      left:       0,
      right:      0,
      background: 'transparent',
      cursor:     'crosshair'
    }
  })

  document.body.appendChild($overlay)
  return () => $overlay.remove()
}

export const selectArea = ({ done, promise = false }) => {
  const go = (done) => {
    const state = {
      box: null,
      activated: false,
      startPos: null,
      rect: null
    }
    const resetBodyStyle = (function () {
      const userSelectKey = Ext.isFirefox() ? '-moz-user-select' : 'user-select'
      const style = window.getComputedStyle(document.body)
      const oldCursor = style.cursor
      const oldUserSelect = style[userSelectKey]

      setStyle(document.body, {
        cursor: 'crosshair',
        [userSelectKey]: 'none'
      })
      return () => setStyle(document.body, { cursor: oldCursor, [userSelectKey]: oldUserSelect })
    })()

    const removeOverlay = createOverlay()
    const unbindDrag = bindDrag({
      $el: document,
      onDragStart: (e) => {
        e.preventDefault()

        state.activated = true
        state.startPos  = {
          x: e.pageX,
          y: e.pageY
        }
      },
      onDragEnd: (e) => {
        e.preventDefault()

        state.activated = false

        if (state.box) {
          state.box.moveAnchorEnd()

          const boundingRect = rectObj.$container.getBoundingClientRect()
          API.hide()

          // Note: API.hide() takes some time to have effect
          setTimeout(() => {
            done(state.rect, boundingRect)
            API.destroy()
          }, 100)
        }
      },
      onDrag: (e, { dx, dy }) => {
        e.preventDefault()

        if (!state.activated) return

        if (!state.box) {
          const rect = {
            x:      state.startPos.x,
            y:      state.startPos.y,
            width:  dx,
            height: dy
          }
          state.rect  = rect
          state.box   = new Box({
            ...rect,
            onStateChange: ({ rect }) => {
              state.rect = rect
              API.show()
              API.updatePos(rect)
            }
          })

          state.box.moveAnchorStart({
            anchorPos: BOX_ANCHOR_POS.BOTTOM_RIGHT
          })
        }

        state.box.moveAnchor({
          x: e.pageX,
          y: e.pageY
        })
      }
    })

    const rectObj = createRect({
      top:          -999,
      left:         -999,
      width:        0,
      height:       0,
      rectStyle: {
        border:     '1px solid #ff00ff',
        background: 'rgba(0, 0, 255, 0.1)'
      }
    })
    const API = {
      updatePos: (rect) => {
        setStyle(rectObj.$container, {
          top:    pixel(rect.y),
          left:   pixel(rect.x),
          width:  pixel(rect.width),
          height: pixel(rect.height)
        })
      },
      destroy: () => {
        resetBodyStyle()
        unbindDrag()
        removeOverlay()
        rectObj.destroy()

        setTimeout(() => {
          document.removeEventListener('click', onClick, true)
          document.removeEventListener('keydown', onKeyDown, true)
        }, 0)
      },
      hide: () => {
        rectObj.hide()
      },
      show: () => {
        rectObj.show()
      }
    }

    const onClick = (e) => {
      console.log('trigger select_area onclick')
      e.preventDefault()
      e.stopPropagation()
      API.destroy()
    }
    const onKeyDown = (e) => e.keyCode === 27 && API.destroy()

    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKeyDown, true)

    API.hide()
    return API
  }

  if (!promise) return go(done)

  return new Promise((resolve, reject) => {
    const wrappedDone = (...args) => {
      resolve(done(...args))
    }

    go(wrappedDone)
  })
}
