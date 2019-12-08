import { MethodTypeInvocationNames } from './constants'
import { singletonGetter, snakeToCamel } from '../../common/ts_utils'
import { KantuXYHost } from './kantu-xy-host'
import { getFocusedWindowSize, WindowSize } from '../../common/resize_window'

export type PromiseFunc = (...args: any[]) => Promise<any>
export type APIGroup    = Record<string, PromiseFunc>

export enum MouseButton {
  Left,
  Right,
  Middle
}

export enum MouseEventType {
  Move,
  Down,
  Up,
  Click,
  DoubleClick
}

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MouseEvent = {
  type: MouseEventType;
  button: MouseButton;
  x: number;
  y: number;
}

export interface NativeXYAPI {
  getVersion:                   () => Promise<string>;
  sendMouseEvent:               (event: MouseEvent) => Promise<boolean>;
  sendText:                     (param: { text: string }) => Promise<boolean>;
  getActiveBrowserOuterRect:    () => Promise<Rect>;
  findRectangle:                (hexColor: { color: string }) => Promise<Rect>;
  getScreenBackingScaleFactor:  () => Promise<number>;
  reconnect:                    () => Promise<NativeXYAPI>;
  sendViewportMouseEvent:       (event: MouseEvent, options: { needCalibration: PromiseFunc, markPage: PromiseFunc, unmarkPage: PromiseFunc }) => Promise<boolean>;
}

export const getNativeXYAPI = singletonGetter<NativeXYAPI>(() => {
  const nativeHost    = new KantuXYHost()
  let pReady          = nativeHost.connectAsync().catch(e => {
    console.warn('pReady - error', e)
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
          const typeSafeAPI = <NativeXYAPI>(<any>api)
          typeSafeAPI.reconnect()
          throw e
        })
      })
      return fn
    })()
    return prev
  }, <APIGroup>{
    reconnect: () => {
      nativeHost.disconnect()
      pReady = nativeHost.connectAsync()
      return pReady.then(() => api)
    },
    sendViewportMouseEvent: (event: MouseEvent, options: { needCalibration: PromiseFunc, markPage: PromiseFunc, unmarkPage: PromiseFunc }): Promise<boolean> => {
      const typeSafeAPI       = <NativeXYAPI>(<any>api)
      const hasCache          = findRectangleCache !== null
      const pNeedCalibration  = options.needCalibration().then(isNeeded => isNeeded || !hasCache)

      return pNeedCalibration.then((isNeeded: boolean) => {
        const { markPage, unmarkPage, findViewportRectInWindow } = 
          isNeeded ? {
            markPage:   options.markPage,
            unmarkPage: options.unmarkPage,
            findViewportRectInWindow: (hexColor: { color: string }) => typeSafeAPI.findRectangle(hexColor)
          } : {
            markPage:   () => Promise.resolve(),
            unmarkPage: () => Promise.resolve(),
            findViewportRectInWindow: (options: { color: string }) => Promise.resolve(<Rect>findRectangleCache)
          }

        return markPage()
        .then(() => Promise.all([
          findViewportRectInWindow({ color: '#00ff00' }),
          getFocusedWindowSize()
        ]))
        .then(tuple => {
          const viewportRect: Rect    = tuple[0]
          const winSize: WindowSize   = tuple[1]

          // Note: cache this value
          findRectangleCache = viewportRect
  
          // Note: `winSize.window.width - winSize.viewport.width` shall always be no less than real left padding
          // while `findRectangle` doesn't always return correct value (larger than actual one)
          // so we try to take the minimun of those two
          const offsetX = winSize.window.left + Math.min(viewportRect.x, winSize.window.width - winSize.viewport.width)
          const offsetY = winSize.window.top + Math.min(viewportRect.y, winSize.window.height - winSize.viewport.height)
  
          return unmarkPage()
          .then(() => typeSafeAPI.sendMouseEvent({
            type:   event.type,
            button: event.button,
            x:      event.x + offsetX,
            y:      event.y + offsetY
          }))
        })
      })
      .catch(e => {
        console.error(e)
        return false
      })
    }
  })
  let findRectangleCache: Rect | null = null

  return <NativeXYAPI>(<any>api)
})
