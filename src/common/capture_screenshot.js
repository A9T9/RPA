import Ext from './web_extension'
import fs from './filesystem'
import { getScreenshotMan } from '../common/screenshot_man'
import { delay, dataURItoBlob } from '../common/utils'

function getActiveTabInfo () {
  return Ext.windows.getLastFocused()
  .then(win => {
    return Ext.tabs.query({ active: true, windowId: win.id })
    .then(tabs => tabs[0])
  })
}

export function imageSizeFromDataURI (dataURI) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    img.src = dataURI
  })
}

export function getScreenshotRatio (dataURI, tabId, devicePixelRatio) {
  return Promise.all([
    imageSizeFromDataURI(dataURI),
    Ext.tabs.get(tabId)
  ])
  .then(tuple => {
    const [size, tab] = tuple
    return tab.width * devicePixelRatio / size.width
  })
}

export function scaleDataURI (dataURI, scale) {
  if (scale === 1)  return Promise.resolve(dataURI)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve(img)
    }
    img.src = dataURI
  })
  .then(img => {
    const canvas = createCanvas(img.naturalWidth, img.naturalHeight, scale)
    return drawOnCanvas({
      canvas,
      dataURI,
      x: 0,
      y: 0,
      width:  img.naturalWidth * scale,
      height: img.naturalHeight * scale
    })
    .then(() => canvas.toDataURL())
  })
}

export function captureScreen (tabId, presetScreenshotRatio) {
  const is2ndArgFunction    = typeof presetScreenshotRatio === 'function'
  const hasScreenshotRatio  = presetScreenshotRatio && !is2ndArgFunction
  const pDataURI  = Ext.tabs.captureVisibleTab(null, { format: 'png' })
  const pRatio    = hasScreenshotRatio  ? Promise.resolve(presetScreenshotRatio)
                                        : pDataURI.then(dataURI => getScreenshotRatio(dataURI, tabId, window.devicePixelRatio))

  return Promise.all([pDataURI, pRatio])
  .then(tuple => {
    const [dataURI, screenshotRatio] = tuple
    // Note: leak the info about screenshotRatio on purpose
    if (!hasScreenshotRatio && is2ndArgFunction) presetScreenshotRatio(screenshotRatio)
    if (screenshotRatio === 1)  return dataURI
    return scaleDataURI(dataURI, screenshotRatio)
  })
}

export function createCaptureScreenWithCachedScreenshotRatio () {
  let screenshotRatio

  return (tabId) => {
    return captureScreen(tabId, screenshotRatio || function (ratio) { screenshotRatio = ratio })
  }
}

function captureScreenBlob (tabId) {
  return captureScreen(tabId).then(dataURItoBlob)
}

export function saveScreen (tabId, fileName) {
  return captureScreenBlob(tabId)
  .then(screenBlob => {
    return getScreenshotMan().overwrite(fileName, screenBlob)
    .then(url => ({
      url,
      fileName
    }))
  })
}

function pCompose (list) {
  return list.reduce((prev, fn) => {
    return prev.then(fn)
  }, Promise.resolve())
}

function getAllScrollOffsets ({ pageWidth, pageHeight, windowWidth, windowHeight, topPadding = 150 }) {
  const topPad  = windowHeight > topPadding ? topPadding : 0
  const xStep   = windowWidth
  const yStep   = windowHeight - topPad
  const result  = []

  // Note: bottom comes first so that when we render those screenshots one by one to the final canvas,
  // those at top will overwrite top padding part of those at bottom, it is useful if that page has some fixed header
  for (let y = pageHeight - windowHeight; y > -1 * yStep; y -= yStep) {
    for (let x = 0; x < pageWidth; x += xStep) {
      result.push({ x, y })
    }
  }

  return result
}

function getAllScrollOffsetsForRect (
  { x, y, width, height },
  { pageWidth, pageHeight, windowWidth, windowHeight, originalX, originalY, topPadding = 150 }
) {
  const topPad  = windowHeight > topPadding ? topPadding : 0
  const xStep   = windowWidth
  const yStep   = windowHeight - topPad
  const result  = []

  for (let sy = y + height - windowHeight; sy > y - yStep; sy -= yStep) {
    for (let sx = x; sx < x + width; sx += xStep) {
      result.push({ x: sx, y: sy })
    }
  }

  if (result.length === 0) {
    result.push({ x: x, y: y + height - windowHeight })
  }

  return result
}

function createCanvas (width, height, pixelRatio = 1) {
  const canvas = document.createElement('canvas')
  canvas.width  = width * pixelRatio
  canvas.height = height * pixelRatio
  return canvas
}

function drawOnCanvas ({ canvas, dataURI, x, y, width, height }) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height, x, y, width || image.width, height || image.height)
      resolve({
        x,
        y,
        width,
        height
      })
    }

    image.src = dataURI
  })
}

function withPageInfo (startCapture, endCapture, callback) {
  return startCapture()
  .then(pageInfo => {
    // Note: in case sender contains any non-serializable data
    delete pageInfo.sender

    return callback(pageInfo)
    .then(result => {
      endCapture(pageInfo)
      return result
    })
  })
}

export function captureFullScreen (tabId, { startCapture, scrollPage, endCapture } = captureClientAPI, options = {}) {
  const opts = {
    blob: false,
    ...options
  }

  return withPageInfo(startCapture, endCapture, pageInfo => {
    const devicePixelRatio = pageInfo.devicePixelRatio

    // Note: cut down page width and height
    // reference: https://stackoverflow.com/questions/6081483/maximum-size-of-a-canvas-element/11585939#11585939
    const maxSide       = Math.floor(32767 / devicePixelRatio)
    pageInfo.pageWidth  = Math.min(maxSide, pageInfo.pageWidth)
    pageInfo.pageHeight = Math.min(maxSide, pageInfo.pageHeight)

    const captureScreen = createCaptureScreenWithCachedScreenshotRatio()
    const canvas        = createCanvas(pageInfo.pageWidth, pageInfo.pageHeight, devicePixelRatio)
    const scrollOffsets = getAllScrollOffsets(pageInfo)
    const todos         = scrollOffsets.map((offset, i) => () => {
      return scrollPage(offset, { index: i, total: scrollOffsets.length })
      .then(realOffset => {
        return captureScreen(tabId)
        .then(dataURI => drawOnCanvas({
          canvas,
          dataURI,
          x:      realOffset.x * devicePixelRatio,
          y:      realOffset.y * devicePixelRatio,
          width:  pageInfo.windowWidth * devicePixelRatio,
          height: pageInfo.windowHeight * devicePixelRatio
        }))
      })
    })
    const convert = opts.blob ? dataURItoBlob : x => x

    return pCompose(todos)
    .then(() => convert(canvas.toDataURL()))
  })
}

export function captureScreenInSelectionSimple (tabId, { rect, devicePixelRatio }, options = {}) {
  const opts = {
    blob: false,
    ...options
  }
  const convert = opts.blob ? dataURItoBlob : x => x
  const ratio   = devicePixelRatio
  const canvas  = createCanvas(rect.width, rect.height, ratio)

  return captureScreen(tabId)
  .then(dataURI => drawOnCanvas({
    canvas,
    dataURI,
    x:      -1 * rect.x * devicePixelRatio,
    y:      -1 * rect.y * devicePixelRatio
  }))
  .then(() => convert(canvas.toDataURL()))
}

export function captureScreenInSelection (tabId, { rect, devicePixelRatio }, { startCapture, scrollPage, endCapture }, options = {}) {
  const opts = {
    blob: false,
    ...options
  }
  const convert = opts.blob ? dataURItoBlob : x => x
  const ratio   = devicePixelRatio

  return withPageInfo(startCapture, endCapture, pageInfo => {
    const maxSide       = Math.floor(32767 / ratio)
    pageInfo.pageWidth  = Math.min(maxSide, pageInfo.pageWidth)
    pageInfo.pageHeight = Math.min(maxSide, pageInfo.pageHeight)

    const captureScreen = createCaptureScreenWithCachedScreenshotRatio()
    const canvas        = createCanvas(rect.width, rect.height, ratio)
    const scrollOffsets = getAllScrollOffsetsForRect(rect, pageInfo)
    const todos         = scrollOffsets.map((offset, i) => () => {
      return scrollPage(offset, { index: i, total: scrollOffsets.length })
      .then(realOffset => {
        return captureScreen(tabId)
        .then(dataURI => drawOnCanvas({
          canvas,
          dataURI,
          x:      (realOffset.x - rect.x) * devicePixelRatio,
          y:      (realOffset.y - rect.y) * devicePixelRatio,
          width:  pageInfo.windowWidth * devicePixelRatio,
          height: pageInfo.windowHeight * devicePixelRatio
        }))
      })
    })

    return pCompose(todos)
    .then(() => convert(canvas.toDataURL()))
  })
}

export const captureClientAPI = {
  getPageInfo: () => {
    const body = document.body
    const widths = [
      document.documentElement.clientWidth,
      document.documentElement.scrollWidth,
      document.documentElement.offsetWidth,
      body ? body.scrollWidth : 0,
      body ? body.offsetWidth : 0
    ]
    const heights = [
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0
    ]

    const data = {
      pageWidth:    Math.max(...widths),
      pageHeight:   Math.max(...heights),
      windowWidth:  window.innerWidth,
      windowHeight: window.innerHeight,
      hasBody:      !!body,
      originalX:    window.scrollX,
      originalY:    window.scrollY,
      originalOverflowStyle: document.documentElement.style.overflow,
      originalBodyOverflowYStyle: body && body.style.overflowY,
      devicePixelRatio: window.devicePixelRatio
    }

    return data
  },
  startCapture: ({ hideScrollbar = true } = {}) => {
    const body      = document.body
    const pageInfo  = captureClientAPI.getPageInfo()

    // Note: try to make pages with bad scrolling work, e.g., ones with
    // `body { overflow-y: scroll; }` can break `window.scrollTo`
    if (body) {
      body.style.overflowY = 'visible'
    }

    if (hideScrollbar) {
      // Disable all scrollbars. We'll restore the scrollbar state when we're done
      // taking the screenshots.
      document.documentElement.style.overflow = 'hidden'
    }

    return Promise.resolve(pageInfo)
  },
  scrollPage: ({ x, y }) => {
    window.scrollTo(x, y)

    return delay(() => ({
      x: window.scrollX,
      y: window.scrollY
    }), 100)
  },
  endCapture: (pageInfo) => {
    const {
      originalX, originalY, hasBody,
      originalOverflowStyle,
      originalBodyOverflowYStyle
    } = pageInfo

    if (hasBody) {
      document.body.style.overflowY = originalBodyOverflowYStyle
    }

    document.documentElement.style.overflow = originalOverflowStyle
    window.scrollTo(originalX, originalY)

    return Promise.resolve(true)
  }
}

export function saveFullScreen (tabId, fileName, clientAPI) {
  return captureFullScreen(tabId, clientAPI, { blob: true })
  .then(screenBlob => {
    return getScreenshotMan().overwrite(fileName, screenBlob)
    .then(url => ({
      url,
      fileName
    }))
  })
}
