import { MethodTypeInvocationNames } from './constants'
import { singletonGetter, snakeToCamel } from '../../common/ts_utils'
import { KantuXYHost } from './kantu-xy-host'
import { getFocusedWindowSize, WindowSize } from '../../common/resize_window'
import log from '../../common/log'

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
  DoubleClick,
  CtrlClick,
  ShiftClick,
  TripleClick
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

export type MouseWheelEvent = {
  deltaX: number;
  deltaY: number;
  deltaZ: number;
}

export type SendViewportMouseEventParams = {
  getViewportRectInScreen: PromiseFunc;
}

export interface NativeXYAPI {
  getVersion:                   () => Promise<string>;
  sendMouseEvent:               (event: MouseEvent) => Promise<boolean>;
  sendMouseWheelEvent:          (event: MouseWheelEvent) => Promise<boolean>;
  sendText:                     (param: { text: string }) => Promise<boolean>;
  getActiveBrowserOuterRect:    () => Promise<Rect>;
  getScreenBackingScaleFactor:  () => Promise<number>;
  getScalingFactor:             () => Promise<number>;
  reconnect:                    () => Promise<NativeXYAPI>;
  sendViewportMouseEvent:       (event: MouseEvent, options: SendViewportMouseEventParams) => Promise<boolean>;
}

export const getNativeXYAPI = singletonGetter(() => {
  const nativeHost    = new KantuXYHost()
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
          const typeSafeAPI = <NativeXYAPI>(<any>api)
          typeSafeAPI.reconnect().catch(() => {})
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
    // Note: This factor equals to ScreenMouseCoornidate / CssMouseCoordinate
    getScalingFactor: () => {
      const typeSafeAPI       = <NativeXYAPI>(<any>api)

      return typeSafeAPI.getScreenBackingScaleFactor()
      .then(screenBackingFactor => window.devicePixelRatio / screenBackingFactor)
    },
    sendViewportMouseEvent: (
      event: MouseEvent,
      options: SendViewportMouseEventParams
    ): Promise<boolean> => {
      const typeSafeAPI = api as any as NativeXYAPI

      return Promise.all([
        options.getViewportRectInScreen(),
        getFocusedWindowSize(),
        typeSafeAPI.getScalingFactor()
      ])
      .then(tuple => {
        const viewportRect: Rect    = tuple[0]
        const winSize: WindowSize   = tuple[1]
        const scalingFactor: number = tuple[2]

        const offsetX = viewportRect.x
        const offsetY = viewportRect.y

        return typeSafeAPI.sendMouseEvent({
          type:   event.type,
          button: event.button,
          x:      event.x * scalingFactor + offsetX * scalingFactor,
          y:      event.y * scalingFactor + offsetY * scalingFactor
        })
      })
      .catch(e => {
        console.error(e)
        return false
      })
    }
  })

  return <NativeXYAPI>(<any>api)
})
