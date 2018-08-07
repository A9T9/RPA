import Ext from './web_extension'
import { delay } from './utils'
import log from './log'

const calcOffset = (screenTotal, screenOffset, oldOffset, oldSize, newSize, preferStart = false) => {
  const isCloserToStart = preferStart || oldOffset < (screenTotal - oldOffset - oldSize)

  log('calcOffset', screenTotal, oldOffset, oldSize, newSize, preferStart)

  if (isCloserToStart) {
    return oldOffset

    // Note: comment out a smarter position for now
    // if (newSize < oldSize) {
    //   return oldOffset
    // }

    // if (newSize < oldSize + oldOffset - screenOffset) {
    //   return oldSize + oldOffset - newSize
    // }

    // return screenOffset
  }

  if (!isCloserToStart) {
    const oldEndOffset = screenOffset + screenTotal - oldOffset - oldSize

    return oldSize + oldOffset - newSize

    // Note: comment out a smarter position for now
    // if (newSize < oldSize) {
    //   return oldSize + oldOffset - newSize
    // }

    // if (newSize < oldSize + oldEndOffset) {
    //   return oldOffset
    // }

    // return screenOffset + screenTotal - newSize
  }
}

// winSize.width
// winSize.height
export function resizeWindow (winId, winSize) {
  const sw    = screen.availWidth
  const sh    = screen.availHeight
  const sl    = screen.availLeft
  const st    = screen.availTop

  return Ext.windows.get(winId)
  .then(win => {
    const lastLeft    = win.left
    const lastTop     = win.top
    const lastWidth   = win.width
    const lastHeight  = win.height

    return Ext.windows.update(winId, winSize)
    .then(win => {
      const left = calcOffset(sw, sl, lastLeft, lastWidth, win.width)
      const top  = calcOffset(sh, st, lastTop, lastHeight, win.height, true)

      Ext.windows.update(winId, { left, top })

      const actual = {
        width:  win.width,
        height: win.height
      }

      return {
        actual,
        desired:  winSize,
        diff:     ['width', 'height'].filter(key => actual[key] !== winSize[key])
      }
    })
  })
}

// pureViewportSize.width
// pureViewportSize.height
// referenceViewportWindowSize.window.width
// referenceViewportWindowSize.window.height
// referenceViewportWindowSize.viewport.width
// referenceViewportWindowSize.viewport.height
export function resizeViewport (winId, pureViewportSize, count = 1) {
  const maxRetry = 2
  log('resizeViewport, ROUND', count)

  return getWindowSize(winId)
  .then(currentSize => {
    log('currentSize!!!!')
    logWindowSize(currentSize)

    const dx = currentSize.window.width - currentSize.viewport.width
    const dy = currentSize.window.height - currentSize.viewport.height

    const newWinSize = {
      width:  dx + pureViewportSize.width,
      height: dy + pureViewportSize.height
    }

    log('size set to', newWinSize)
    return resizeWindow(winId, newWinSize)
    .then(() => getWindowSize(winId))
    .then(newSize => {
      log('newSize!!!!')
      logWindowSize(newSize)

      const data = {
        actual:   newSize.viewport,
        desired:  pureViewportSize,
        diff:     ['width', 'height'].filter(key => newSize.viewport[key] !== pureViewportSize[key])
      }

      if (data.diff.length === 0 || count >= maxRetry) {
        return data
      }

      return delay(() => {}, 0)
      .then(() => resizeViewport(winId, pureViewportSize, count + 1))
    })
  })
}

export function resizeViewportOfTab (tabId, pureViewportSize) {
  return Ext.tabs.get(tabId)
  .then(tab => resizeViewport(tab.windowId, pureViewportSize))
}

// size.window.width
// size.window.height
// size.window.left
// size.window.top
// size.viewport.wdith
// size.viewport.height
export function getWindowSize (winId) {
  return Ext.windows.get(winId, { populate: true })
  .then(win => {
    const tab = win.tabs.find(tab => tab.active)

    return {
      window: {
        width:  win.width,
        height: win.height,
        left:   win.left,
        top:    win.top
      },
      viewport: {
        width:  tab.width,
        height: tab.height
      }
    }
  })
}

function logWindowSize (winSize) {
  log(winSize.window, winSize.viewport)
  log('dx = ', winSize.window.width - winSize.viewport.width)
  log('dy = ', winSize.window.height - winSize.viewport.height)
}
