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
  // called with the numbers the conversion actually used, right before the
  // native host fires — the ONLY way to see where a click that "succeeded"
  // was aimed. On Firefox the origin is exact (mozInnerScreenX); on Chrome it
  // is DERIVED from screenLeft/outerHeight guesses, and when a guess is wrong
  // the click lands off-viewport with no error anywhere. One line in the run
  // log turns that from an afternoon of theorizing into a subtraction.
  onTrace?: (info: { viewportRect: Rect, scalingFactor: number, screenX: number, screenY: number }) => void;
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
  sendDesktopMouseEvent:        (event: MouseEvent) => Promise<boolean>;
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

        const screenX = event.x * scalingFactor + offsetX * scalingFactor
        const screenY = event.y * scalingFactor + offsetY * scalingFactor

        if (options.onTrace) {
          try { options.onTrace({ viewportRect, scalingFactor, screenX, screenY }) } catch (e) { /* trace only */ }
        }

        return typeSafeAPI.sendMouseEvent({
          type:   event.type,
          button: event.button,
          x:      screenX,
          y:      screenY
        })
      })
      .catch(e => {
        console.error(e)
        return false
      })
    },
    // DESKTOP-scope coordinates need the SAME scalingFactor as the viewport
    // path above — only without a viewport offset, since they are already
    // screen-relative. They come out of the desktop CAPTURE, which is in
    // logical (DPI-virtualized) pixels: 1671x898 on a physically 2089x1123
    // screen at 125% Windows scaling. The native host places the cursor in
    // PHYSICAL pixels, so handing it the logical number un-scaled lands every
    // click at coord/1.25 — compressed toward the screen origin, wrong by more
    // the further out the target sits.
    //
    // Measured with DesktopClickAccuracyRange at 125%: desktop-scope finders
    // were accurate to ~1px, yet their clicks missed by -231px at x=501 and
    // -301px at x=851 — slope exactly 0.2, which is 1 - 1/1.25. Known-
    // coordinate shots on the viewport path were pixel-perfect in the same run,
    // which is what isolated the fault to this call.
    //
    // A no-op where it has always worked: scalingFactor is 1 on a 100% display,
    // and 1 on macOS Retina too (devicePixelRatio 2 / backingScaleFactor 2),
    // because there the OS already takes mouse coordinates in CSS points.
    sendDesktopMouseEvent: (event: MouseEvent, opts?: { onTrace?: (info: { scalingFactor: number, screenX: number, screenY: number }) => void }): Promise<boolean> => {
      const typeSafeAPI = api as any as NativeXYAPI

      return typeSafeAPI.getScalingFactor()
      .then(scalingFactor => {
        const screenX = event.x * scalingFactor
        const screenY = event.y * scalingFactor
        if (opts && opts.onTrace) {
          try { opts.onTrace({ scalingFactor, screenX, screenY }) } catch (e) { /* trace only */ }
        }
        return typeSafeAPI.sendMouseEvent({
          type:   event.type,
          button: event.button,
          x:      screenX,
          y:      screenY
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
