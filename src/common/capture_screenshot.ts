/* globals chrome */

import Ext from './web_extension'
import { Size, Point, Rect } from './types'
import { delay, dataURItoBlob } from './utils'
import { throttlePromiseFunc } from './ts_utils'
import { IStandardStorage } from '@/services/storage/std/standard_storage'
import { IWithLinkStorage } from '@/services/storage/flat/storage'

export function imageSizeFromDataURI (dataURI: string): Promise<Size> {
  return createImageBitmap(dataURItoBlob(dataURI))
    .then((img: ImageBitmap): Size => ({
      width: img.width,
      height: img.height
    }))
}

export function getScreenshotRatio (dataURI: string, tabId: number, devicePixelRatio: number): Promise<number> {
  return Promise.all([
    imageSizeFromDataURI(dataURI),
    Ext.tabs.get(tabId)
  ])
  .then(tuple => {
    const [size, tab] = tuple
    return tab.width * devicePixelRatio / size.width
  })
}

export function scaleDataURI (dataURI: string, scale: number): Promise<string> {
  if (scale === 1)  return Promise.resolve(dataURI)

  return imageSizeFromDataURI(dataURI)
  .then(size => {
    const canvas = createCanvas(size.width, size.height, scale)
    return drawOnCanvas({
      canvas,
      dataURI,
      x: 0,
      y: 0,
      width:  size.width * scale,
      height: size.height * scale
    })
    .then(() => canvas.toDataURL())
  })
}

function pCompose (list: Array<(arg: any) => Promise<any>>) {
  return list.reduce((prev, fn) => {
    return prev.then(fn)
  }, Promise.resolve())
}

type CaptureVisibleTabFunc = (windowId?: number | null, options?: chrome.tabs.CaptureVisibleTabOptions) => Promise<string>

export type CaptureScreenshotServiceParams = {
  captureVisibleTab: CaptureVisibleTabFunc
}

export class CaptureScreenshotService {
  private captureVisibleTab: CaptureVisibleTabFunc

  constructor (private params: CaptureScreenshotServiceParams) {
    // default value to be 2
    const MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND = 
    typeof chrome !== 'undefined' &&
    typeof chrome.tabs !== 'undefined' &&
    typeof (chrome.tabs as any).MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND === 'number'
      ?  (chrome.tabs as any).MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND : 2

    this.captureVisibleTab = throttlePromiseFunc(this.params.captureVisibleTab, MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND * 1000 + 100)
  }

  saveScreen (screenshotStorage: IStandardStorage & IWithLinkStorage, tabId: number, fileName: string, devicePixelRatio: number): Promise<{ url: string; fileName: string }> {
    return this.captureScreenBlob(tabId, devicePixelRatio)
    .then(screenBlob => {
      return screenshotStorage.overwrite(fileName, screenBlob as any)
      .then(() => {
        return screenshotStorage.getLink(fileName)
      })
      .then(
        (url: string) => {
          return ({ url, fileName })
        },
        (e: Error) => {
          return Promise.reject(e)
        }
      )
    })
  }

  saveFullScreen (screenshotStorage: IStandardStorage & IWithLinkStorage, tabId: number, fileName: string, clientAPI: CaptureClientAPI) {
    return this.captureFullScreen(tabId, clientAPI, { blob: true })
    .then(screenBlob => {
      return screenshotStorage.overwrite(fileName, screenBlob as string)
      .then(() => screenshotStorage.getLink(fileName))
      .then(url => ({ url, fileName }))
    })
  }

  captureScreen (tabId: number, devicePixelRatio: number, presetScreenshotRatio?: number | ((ratio: number) => void)): Promise<string> {
    const is2ndArgFunction    = typeof presetScreenshotRatio === 'function'
    const hasScreenshotRatio  = !!presetScreenshotRatio && !is2ndArgFunction
    const pDataURI  = this.captureVisibleTab(null, { format: 'png' })
    const pRatio    = hasScreenshotRatio  ? Promise.resolve(presetScreenshotRatio as number)
                                          : pDataURI.then((dataURI: string) => getScreenshotRatio(dataURI, tabId, devicePixelRatio))

    return Promise.all([pDataURI, pRatio])
    .then(tuple => {
      const [dataURI, screenshotRatio] = tuple
      // Note: leak the info about screenshotRatio on purpose
      if (!hasScreenshotRatio && is2ndArgFunction) (presetScreenshotRatio as ((ratio: number) => void))(screenshotRatio)
      if (screenshotRatio === 1)  return dataURI
      return scaleDataURI(dataURI, screenshotRatio)
    })
  }

  captureFullScreen (tabId: number, { startCapture, scrollPage, endCapture }: CaptureClientAPI = captureClientAPI, options = {}) {
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

      const captureScreen = this.createCaptureScreenWithCachedScreenshotRatio(devicePixelRatio)
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
      const convert = opts.blob ? dataURItoBlob : (x: string) => x

      return pCompose(todos)
      .then(() => convert(canvas.toDataURL()))
    })
  }

  captureScreenInSelectionSimple (
    tabId: number,
    { rect, devicePixelRatio }: { rect: Rect; devicePixelRatio: number },
    options: { blob?: boolean } = {}
  ) {
    const opts = {
      blob: false,
      ...options
    }
    const convert = opts.blob ? dataURItoBlob : (x: string) => x
    const canvas  = createCanvas(rect.width, rect.height, devicePixelRatio)

    return this.captureScreen(tabId, devicePixelRatio)
    .then(dataURI => drawOnCanvas({
      canvas,
      dataURI,
      x:      -1 * rect.x * devicePixelRatio,
      y:      -1 * rect.y * devicePixelRatio
    }))
    .then(() => convert(canvas.toDataURL()))
  }

  captureScreenInSelection (
    tabId: number,
    { rect, devicePixelRatio }: { rect: Rect; devicePixelRatio: number },
    { startCapture, scrollPage, endCapture }: CaptureClientAPI,
    options: { blob?: boolean } = {}
  ) {
    const opts = {
      blob: false,
      ...options
    }
    const convert = opts.blob ? dataURItoBlob : (x: string) => x

    return withPageInfo(startCapture, endCapture, pageInfo => {
      const maxSide       = Math.floor(32767 / devicePixelRatio)
      pageInfo.pageWidth  = Math.min(maxSide, pageInfo.pageWidth)
      pageInfo.pageHeight = Math.min(maxSide, pageInfo.pageHeight)

      const captureScreen = this.createCaptureScreenWithCachedScreenshotRatio(devicePixelRatio)
      const canvas        = createCanvas(rect.width, rect.height, devicePixelRatio)
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

  private createCaptureScreenWithCachedScreenshotRatio (devicePixelRatio: number) {
    let screenshotRatio: number

    return (tabId: number) => {
      return this.captureScreen(tabId, devicePixelRatio, screenshotRatio || function (ratio) { screenshotRatio = ratio })
    }
  }

  private captureScreenBlob (tabId: number, devicePixelRatio: number): Promise<Blob> {
    return this.captureScreen(tabId, devicePixelRatio).then(dataURItoBlob)
  }
}

type GetAllScrollOffsetsParams = {
  pageWidth: number;
  pageHeight: number;
  windowWidth: number;
  windowHeight: number;
  topPadding?: number;
}

function getAllScrollOffsets ({ pageWidth, pageHeight, windowWidth, windowHeight, topPadding = 150 }: GetAllScrollOffsetsParams): Point[] {
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
  { x, y, width, height }: Rect,
  { windowWidth, windowHeight, topPadding = 150 }: GetAllScrollOffsetsParams
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

function createCanvas (width: number, height: number, pixelRatio = 1): HTMLCanvasElement {
  if (typeof window === 'undefined') {
    return new (self as any).OffscreenCanvas(width * pixelRatio, height * pixelRatio)
  }

  const canvas = document.createElement('canvas')
  canvas.width  = width * pixelRatio
  canvas.height = height * pixelRatio
  return canvas
}

type DrawOnCanvasParams = Point & Partial<Size> & {
  canvas: HTMLCanvasElement;
  dataURI: string;
}

function drawOnCanvas ({ canvas, dataURI, x, y, width, height }: DrawOnCanvasParams) {
  return createImageBitmap(dataURItoBlob(dataURI))
  .then((image: ImageBitmap) => {
    canvas.getContext('2d')!.drawImage(image, 0, 0, image.width, image.height, x, y, width || image.width, height || image.height)
    return { x, y, width, height }
  })
}

function withPageInfo <T> (
  startCapture: (opts?: { hideScrollbar?: boolean }) => Promise<PageInfo>,
  endCapture: (pageInfo: PageInfo) => Promise<boolean>,
  callback: (pageInfo: PageInfo) => Promise<T>
) {
  return startCapture()
  .then(pageInfo => {
    // Note: in case sender contains any non-serializable data
    delete (pageInfo as any).sender

    return callback(pageInfo)
    .then(result => {
      endCapture(pageInfo)
      return result
    })
  })
}


export type PageInfo = {
  pageWidth:    number;
  pageHeight:   number;
  windowWidth:  number;
  windowHeight: number;
  hasBody:      boolean;
  originalX:    number;
  originalY:    number;
  originalOverflowStyle: string;
  originalBodyOverflowYStyle?: string;
  devicePixelRatio: number;
}

export type CaptureClientAPI = {
  startCapture: (opts?: { hideScrollbar?: boolean }) => Promise<PageInfo>;
  endCapture: (pageInfo: PageInfo) => Promise<boolean>;
  scrollPage: ({ x, y }: Point, opts?: { index: number; total: number }) => Promise<Point>;
  getPageInfo?: () => PageInfo;
}

export const captureClientAPI = {
  getPageInfo: (): PageInfo => {
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
  startCapture: ({ hideScrollbar = true } = {}): Promise<PageInfo> => {
    const body      = document.body
    const pageInfo  = captureClientAPI.getPageInfo!()

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
  scrollPage: ({ x, y }: Point, opts?: { index: number; total: number }): Promise<Point> => {
    window.scrollTo(x, y)

    return delay(() => ({
      x: window.scrollX,
      y: window.scrollY
    }), 100)
  },
  endCapture: (pageInfo: PageInfo) => {
    const {
      originalX, originalY, hasBody,
      originalOverflowStyle,
      originalBodyOverflowYStyle
    } = pageInfo

    if (hasBody) {
      document.body.style.overflowY = originalBodyOverflowYStyle ?? ''
    }

    document.documentElement.style.overflow = originalOverflowStyle
    window.scrollTo(originalX, originalY)

    return Promise.resolve(true)
  }
}
