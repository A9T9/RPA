import Ext from './web_extension'
import fs from './filesystem'
import { getScreenshotMan } from '../common/screenshot_man'
import { delay } from '../common/utils'

// refer to https://stackoverflow.com/questions/12168909/blob-from-dataurl
function dataURItoBlob (dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(',')[1]);

  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length);

  // create a view into the buffer
  var ia = new Uint8Array(ab);

  // set the bytes of the buffer to the correct values
  for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  var blob = new Blob([ab], {type: mimeString});
  return blob;
}

function getActiveTabInfo () {
  return Ext.windows.getLastFocused()
  .then(win => {
    return Ext.tabs.query({ active: true, windowId: win.id })
    .then(tabs => tabs[0])
  })
}

function captureScreenBlob () {
  return Ext.tabs.captureVisibleTab(null, { format: 'png' })
  .then(dataURItoBlob)
}

export function saveScreen () {
  return Promise.all([
    getActiveTabInfo(),
    captureScreenBlob()
  ])
  .then(([tabInfo, screenBlob]) => {
    const fileName = `${Date.now()}_${encodeURIComponent(tabInfo.title)}.png`

    return getScreenshotMan().write(fileName, screenBlob)
    .then(url => url)
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

function createCanvas (width, height, pixelRatio = 1) {
  const canvas = document.createElement('canvas')
  canvas.width  = width * pixelRatio
  canvas.height = height * pixelRatio
  return canvas
}

function drawOnCanvas ({ canvas, dataURI, x, y }) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      canvas.getContext('2d').drawImage(image, x, y)
      resolve({
        x,
        y,
        width: image.width,
        heigth: image.height
      })
    }

    image.src = dataURI
  })
}

function captureFullScreenBlob ({ startCapture, scrollPage, endCapture }) {
  return startCapture()
  .then(pageInfo => {
    const canvas        = createCanvas(pageInfo.pageWidth, pageInfo.pageHeight, pageInfo.devicePixelRatio)
    const scrollOffsets = getAllScrollOffsets(pageInfo)
    const todos         = scrollOffsets.map((offset) => () => {
      return scrollPage(offset)
      .then(realOffset => {
        return Ext.tabs.captureVisibleTab(null, { format: 'png' })
        .then(dataURI => drawOnCanvas({
          canvas,
          dataURI,
          x: realOffset.x * pageInfo.devicePixelRatio,
          y: realOffset.y * pageInfo.devicePixelRatio
        }))
      })
    })

    return pCompose(todos)
    .then(() => dataURItoBlob(canvas.toDataURL()))
    .then(result => {
      endCapture(pageInfo)
      return result
    })
  })
}

export const captureClientAPI = {
  startCapture: () => {
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

    // Note: try to make pages with bad scrolling work, e.g., ones with
    // `body { overflow-y: scroll; }` can break `window.scrollTo`
    if (body) {
      body.style.overflowY = 'visible'
    }

    // Disable all scrollbars. We'll restore the scrollbar state when we're done
    // taking the screenshots.
    document.documentElement.style.overflow = 'hidden'

    return Promise.resolve(data)
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

export function saveFullScreen (clientAPI) {
  return Promise.all([
    getActiveTabInfo(),
    captureFullScreenBlob(clientAPI)
  ])
  .then(([tabInfo, screenBlob]) => {
    const fileName = `${Date.now()}_${encodeURIComponent(tabInfo.title)}_full.png`

    return getScreenshotMan().write(fileName, screenBlob)
    .then(url => url)
  })
}
