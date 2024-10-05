import { MethodTypeInvocationNames } from './constants'
import { singletonGetter, snakeToCamel, concatUint8Array } from '../../common/ts_utils'
import { KantuCVHost } from './kantu-cv-host'
import { KantuCV } from './kantu-cv'
import { base64 } from './base64'
import { dataURItoArrayBuffer, blobToDataURL, blobToText, arrayBufferToString } from '../../common/utils'
import { imageDataFromUrl } from '../../common/dom_utils'
import log from '../../common/log'
import path from '../../common/lib/path'
import { Point, Rect } from '@/common/types'

export type PromiseFunc = (...args: any[]) => Promise<any>
export type APIGroup    = Record<string, PromiseFunc>

type FilePath = string;
type DataURL  = string;

export interface NativeCVAPI {
  getVersion:             () => Promise<string>;
  getDesktopDpi:          () => Promise<KantuCV.DpiInfo>;
  getMaxFileRange:        () => Promise<number>;
  getImageInfo:           (params: { content: DataURL }) => Promise<KantuCV.ImageInfo>;
  captureDesktop:         (params: { path?: FilePath }) => Promise<FilePath>;
  searchImage:            (params: { image: KantuCV.Image, pattern: KantuCV.Image, options: KantuCV.ImageSearchOptions }) => Promise<KantuCV.ImageSearchResult>;
  searchImageWithGuard:   (params: { image: KantuCV.Image, pattern: KantuCV.Image, options: KantuCV.ImageSearchOptions }) => Promise<KantuCV.ImageSearchResult>;
  searchDesktop:          (params: { pattern: KantuCV.Image, options: KantuCV.ImageSearchOptions }) => Promise<KantuCV.ImageSearchResult>;
  searchDesktopWithGuard: (params: { pattern: KantuCV.Image, options: KantuCV.ImageSearchOptions }) => Promise<KantuCV.ImageSearchResult>;
  getFileSize:            (params: { path: FilePath }) => Promise<number>;
  readFileRange:          (params: { path: FilePath, rangeStart?: number, rangeEnd?: number }) => Promise<KantuCV.FileRangeBuffer>;
  reconnect:              () => Promise<NativeCVAPI>;
  readFileAsArrayBuffer:  (filePath: FilePath) => Promise<ArrayBuffer>;
  readFileAsBlob:         (filePath: FilePath) => Promise<Blob>;
  readFileAsDataURL:      (filePath: FilePath, withBase64Prefix?: boolean) => Promise<string>;
  readFileAsText:         (filePath: FilePath) => Promise<string>;
  readFileAsBinaryString: (filePath: FilePath) => Promise<string>;
  getImageFromDataUrl:    (dataUrl: DataURL, dpi?: number) => Promise<KantuCV.Image>;
}

export const getNativeCVAPI = singletonGetter(() => {
  const nativeHost    = new KantuCVHost()
  let pReady          = nativeHost.connectAsync().catch(e => {
    log.warn('pReady - error', e)
    throw e
  })
  const api: APIGroup =  MethodTypeInvocationNames.reduce((prev: APIGroup, method: string) => {
    const camel = snakeToCamel(method)
    prev[camel] = (() => {
      const fn = (params: any) => pReady.then(() => {
        return nativeHost.invokeAsync(method, params)
        .catch(e => {
          // Note: Looks like for now whenever there is an error, you have to reconnect native host
          // otherwise, all commands return "Disconnected" afterwards
          const typeSafeAPI = <NativeCVAPI>(<any>api)
          typeSafeAPI.reconnect().catch(() => {})

          // Note: For now, native host doesn't provide any useful error message if captureDesktop fails
          // but for most cases it's due to directory not exist
          if (camel === 'captureDesktop') {
            const filePath = params.path

            if (filePath && /[\\/]/.test(filePath)) {
              throw new Error(`Failed to captureDesktop, please confirm directory exists at '${path.dirname(filePath)}'`)
            }
          }

          throw e
        })
      })
      return fn
    })()
    return prev
  },  <APIGroup>{
    reconnect: () => {
      nativeHost.disconnect()
      pReady = nativeHost.connectAsync()
      return pReady.then(() => api)
    },
    searchDesktopWithGuard: (params): Promise<KantuCV.ImageSearchResult> => {
      const typeSafeAPI = <NativeCVAPI>(<any>api)
      return typeSafeAPI.searchDesktop(params).then(guardSearchResult)
    },
    searchImageWithGuard: (params): Promise<KantuCV.ImageSearchResult> => {
      const typeSafeAPI = <NativeCVAPI>(<any>api)
      return typeSafeAPI.searchImage(params).then(guardSearchResult)
    },
    getImageFromDataUrl: (dataUrl: DataURL, dpi?: number): Promise<KantuCV.Image> => {
      const typeSafeAPI = <NativeCVAPI>(<any>api)
      const removeBase64Prefix = (str: string) => {
        const b64 = 'base64,'
        const i   = str.indexOf(b64)

        if (i === -1) return str
        return str.substr(i + b64.length)
      }

      return typeSafeAPI.getImageInfo({ content: removeBase64Prefix(dataUrl) })
      .then(info => {
        const DEFAULT_DPI = 96
        const dpiX = info.dpiX || dpi || DEFAULT_DPI
        const dpiY = info.dpiY || dpi || DEFAULT_DPI

        return serializeDataUrl(dataUrl, dpiX, dpiY)
      })
    },
    readFileAsArrayBuffer: (filePath: FilePath): Promise<ArrayBuffer> => {
      const typeSafeAPI = <NativeCVAPI>(<any>api)
      const readMore = (
        filePath:   FilePath,
        totalSize:  number = Infinity,
        rangeStart: number = 0,
        dataUrls:   string[] = []
      ): Promise<DataURL[]> => {
        return typeSafeAPI.readFileRange({
          rangeStart,
          path: filePath
        })
        .then(range => {
          const result = range.rangeEnd > range.rangeStart ? dataUrls.concat([range.buffer]) : dataUrls

          if (range.rangeEnd >= totalSize || range.rangeEnd <= range.rangeStart) return result
          return readMore(filePath, totalSize, range.rangeEnd, result)
        })
      }

      return typeSafeAPI.getFileSize({ path: filePath })
      .then(fileSize => readMore(filePath, fileSize, 0, []))
      .then(dataUrls => {
        const arr = concatUint8Array(
          ...dataUrls.map(dataUrl => new Uint8Array(dataURItoArrayBuffer(dataUrl)))
        )

        return arr.buffer
      })
    },
    readFileAsBlob: (filePath: FilePath): Promise<Blob> => {
      const typeSafeAPI = <NativeCVAPI>(<any>api)

      return typeSafeAPI.readFileAsArrayBuffer(filePath)
      .then(buffer => new Blob([buffer]))
    },
    readFileAsDataURL: (filePath: FilePath, withBase64Prefix = true): Promise<string> => {
      const typeSafeAPI = <NativeCVAPI>(<any>api)

      return typeSafeAPI.readFileAsBlob(filePath)
      .then(blob => blobToDataURL(blob, withBase64Prefix))
    },
    readFileAsText: (filePath: FilePath): Promise<string> => {
      const typeSafeAPI = <NativeCVAPI>(<any>api)

      return typeSafeAPI.readFileAsBlob(filePath)
      .then(blob => blobToText(blob))
    },
    readFileAsBinaryString: (filePath: FilePath): Promise<string> => {
      const typeSafeAPI = <NativeCVAPI>(<any>api)

      return typeSafeAPI.readFileAsArrayBuffer(filePath)
      .then(buffer => arrayBufferToString(buffer))
    }
  })

  return <NativeCVAPI>(<any>api)
})

export function guardSearchResult (result: KantuCV.ImageSearchResult): KantuCV.ImageSearchResult {
  switch (result.errorCode) {
    case KantuCV.ImageSearchErrorCode.Ok:
      return result

    case KantuCV.ImageSearchErrorCode.NoGreenPinkBoxes:
      throw new Error('E601: Cannot find green and/or pink boxes')

    case KantuCV.ImageSearchErrorCode.NoPinkBox:
      throw new Error('E602: Pattern image contains green box but does not contain pink box')

    case KantuCV.ImageSearchErrorCode.TooManyGreenBox:
      throw new Error('E603: Pattern image contains more than one green box')

    case KantuCV.ImageSearchErrorCode.TooManyPinkBox:
      throw new Error('E604: Pattern image contains more than one pink box')

    case KantuCV.ImageSearchErrorCode.Fail:
      throw new Error('E605: Unspecified error has occured')

    default:
      throw new Error(`E606: Unknown error code ${result.errorCode}`)
  }
}

// Note: `matched` is pink box,  `reference` is green box
export type ConvertResultItem = {
  matched:   teamdocs.FindResult;
  reference: teamdocs.FindResult | null;
}

export function convertImageSearchResultIfAllCoordiatesBasedOnTopLeftScreen (result: KantuCV.ImageSearchResult, scale: number = 1, searchArea?: Rect): ConvertResultItem[] {
  const { errorCode, containsGreenPinkBoxes, regions } = result
  const convert = (region: KantuCV.ImageSearchRegion): ConvertResultItem => {
    const searchAreaX = searchArea?.x ?? 0;
    const searchAreaY = searchArea?.y ?? 0;

    // All x, y in relativeRect and matchedRect are relatve to the whole screen
    if (!region.relativeRect) {
      return {
        matched: {
          offsetLeft:   scale * region.matchedRect.x - scale * searchAreaX,
          offsetTop:    scale * region.matchedRect.y - scale * searchAreaY,
          viewportLeft: scale * region.matchedRect.x,
          viewportTop:  scale * region.matchedRect.y,
          pageLeft:     scale * region.matchedRect.x,
          pageTop:      scale * region.matchedRect.y,
          width:        scale * region.matchedRect.width,
          height:       scale * region.matchedRect.height,
          score:        region.score
        },
        reference: null
      }
    } else {
      return {
        matched: {
          offsetLeft:   scale * region.relativeRect.x - scale * searchAreaX,
          offsetTop:    scale * region.relativeRect.y - scale * searchAreaY,
          viewportLeft: scale * region.relativeRect.x,
          viewportTop:  scale * region.relativeRect.y,
          pageLeft:     scale * region.relativeRect.x,
          pageTop:      scale * region.relativeRect.y,
          width:        scale * region.relativeRect.width,
          height:       scale * region.relativeRect.height,
          score:        region.score
        },
        reference: {
          offsetLeft:   scale * region.matchedRect.x - scale * searchAreaX,
          offsetTop:    scale * region.matchedRect.y - scale * searchAreaY,
          viewportLeft: scale * region.matchedRect.x,
          viewportTop:  scale * region.matchedRect.y,
          pageLeft:     scale * region.matchedRect.x,
          pageTop:      scale * region.matchedRect.y,
          width:        scale * region.matchedRect.width,
          height:       scale * region.matchedRect.height,
          score:        region.score
        }
      }
    }
  }

  return regions.map(r => convert(r))
}

export function convertImageSearchResultForPage (result: KantuCV.ImageSearchResult, scale: number, pageOffset: Point, viewportOffset: Point): ConvertResultItem[] {
  const convert = (region: KantuCV.ImageSearchRegion): ConvertResultItem => {
    if (!region.relativeRect) {
      return {
        reference: null,
        matched: {
          offsetLeft:   scale * region.matchedRect.x,
          offsetTop:    scale * region.matchedRect.y,
          viewportLeft: scale * region.matchedRect.x + viewportOffset.x,
          viewportTop:  scale * region.matchedRect.y + viewportOffset.y,
          pageLeft:     scale * region.matchedRect.x + pageOffset.x,
          pageTop:      scale * region.matchedRect.y + pageOffset.y,
          width:        scale * region.matchedRect.width,
          height:       scale * region.matchedRect.height,
          score:        region.score
        }
      }
    } else {
      return {
        reference: {
          offsetLeft:   scale * region.matchedRect.x,
          offsetTop:    scale * region.matchedRect.y,
          viewportLeft: scale * region.matchedRect.x + viewportOffset.x,
          viewportTop:  scale * region.matchedRect.y + viewportOffset.y,
          pageLeft:     scale * region.matchedRect.x + pageOffset.x,
          pageTop:      scale * region.matchedRect.y + pageOffset.y,
          width:        scale * region.matchedRect.width,
          height:       scale * region.matchedRect.height,
          score:        region.score
        },
        matched: {
          offsetLeft:   scale * region.relativeRect.x,
          offsetTop:    scale * region.relativeRect.y,
          viewportLeft: scale * region.relativeRect.x + viewportOffset.x,
          viewportTop:  scale * region.relativeRect.y + viewportOffset.y,
          pageLeft:     scale * region.relativeRect.x + pageOffset.x,
          pageTop:      scale * region.relativeRect.y + pageOffset.y,
          width:        scale * region.relativeRect.width,
          height:       scale * region.relativeRect.height,
          score:        region.score
        }
      }
    }
  }

  return result.regions.map(r => convert(r))
}

export function serializeImageData (imageData: ImageData, dpiX: number, dpiY: number): KantuCV.Image {
  // Convert RGBA -> RGB -> Base64
  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;
  const rgb = new Uint8Array(w * h * 3);

  for (let y = 0; y < h; ++y) {
    for (let x = 0; x < w; ++x) {
      const base = y * w + x;
      const k = 3 * base;
      const j = 4 * base;

      rgb[k + 0] = src[j + 0];
      rgb[k + 1] = src[j + 1];
      rgb[k + 2] = src[j + 2];
    }
  }

  const data = base64.encode(rgb);
  return {
    width: w,
    height: h,
    dpiX,
    dpiY,
    data
  };
}

export function serializeDataUrl (dataUrl: string, dpiX: number, dpiY: number): Promise<KantuCV.Image> {
  return imageDataFromUrl(dataUrl)
  .then(imageData => serializeImageData(imageData, dpiX, dpiY))
}
