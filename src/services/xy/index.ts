import { MethodTypeInvocationNames } from './constants'
import { singletonGetter, snakeToCamel } from '../../common/ts_utils'
import { NativeMessagingHost } from '../native_host'
import { XMODULE2_HOST_NAME } from '../xmodules2/native'
import { getFocusedWindowSize, WindowSize } from '../../common/resize_window'
import Ext from '../../common/web_extension'
import { xmodules2Active } from '../xmodules2/routing'
import { getXModule2API } from '../xmodules2/native'
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

const makeXYAPI = (nativeHost: NativeMessagingHost): NativeXYAPI => {
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
    // Windows mixed-DPI anchor. ONE scaling factor cannot map Chrome's global
    // DIP screen space to the OS's physical virtual-screen space when displays
    // run different scaling: the per-display factors differ AND Chrome re-packs
    // the DIP origins (a 2560px-wide 125% primary spans 2048 DIP, so the
    // 175% display to its right starts at DIP 2048 but physical 2560 — ×1.75
    // overshoots every click on it by 1024px, measured live 2026-08-16).
    // But both spaces agree on one point: the focused browser window's
    // top-left corner. chrome.windows reports it in DIP; the host's
    // GetWindowRect reports the same corner in physical px (the DWM outer
    // rect would be ~8 DIP short — invisible resize borders); and everything
    // inside ONE window sits on ONE display, where devicePixelRatio is the
    // entire scale. So:
    //   phys = physWin + (dip − dipWin) × dpr
    //   dip  = dipWin + (phys − physWin) ÷ dpr
    // On uniform-scale setups physWin = dipWin × factor and this reduces
    // exactly to the old ×/÷ scalingFactor. null = anchor unavailable
    // (macOS points, classic host, no browser window) → callers keep the
    // old one-factor math.
    getDesktopAnchor: (pageMetrics?: { dpr: number, zoom: number, availLeft: number, availTop: number, screenWidth: number, screenHeight: number }): Promise<{ dipX: number, dipY: number, physX: number, physY: number, physW?: number, physH?: number, dpr: number, why?: string } | null> => {
      const isWin = /windows/i.test(window.navigator.userAgent)
      if (!isWin) return Promise.resolve(null)
      // a `why` (and no dipX) instead of bare null: the trace line prints it,
      // so a silently-degraded run says WHICH leg of the anchor failed
      const failed = (why: string) => ({ why } as any)
      if (!xmodules2Active()) return Promise.resolve(failed('routing-off'))
      // The display scale of the PLAY page's display, when the caller measured
      // it in the play tab (its devicePixelRatio includes the page zoom —
      // divide that back out). This code runs in the PANEL, and the panel may
      // sit on a DIFFERENT display than the play window (IDE on a second
      // monitor): using the panel's own devicePixelRatio here rejected a
      // perfectly good window anchor and then anchored the fallback on the
      // IDE's display — every OS click landed on the IDE's monitor (field
      // failure 2026-08-20, mixed-scaling dual monitor).
      const pageDpr = pageMetrics && pageMetrics.dpr > 0
        ? pageMetrics.dpr / (pageMetrics.zoom > 0 ? pageMetrics.zoom : 1)
        : null

      // FALLBACK when the window anchor is unavailable: anchor on the
      // DISPLAY instead. screen.availLeft/availTop is the display's DIP
      // origin (exact unless the taskbar sits on the left/top edge) and the
      // host's display list carries the physical origin. The display is
      // matched by SIZE — its physical width/height must equal screen.width/
      // height × dpr — which is also immune to Firefox's fractional dpr
      // (Firefox reports screen.* consistently with its own dpr). The screen
      // values come from the PLAY page when the caller passed them (the
      // display the clicks must land on); the panel's own screen is the
      // legacy fallback for callers without page context.
      const displayAnchor = (): Promise<any> =>
        getXModule2API().invoke('get_display_list')
          .then((displays: any) => {
            const src = pageMetrics && pageDpr
              ? { availLeft: pageMetrics.availLeft, availTop: pageMetrics.availTop, width: pageMetrics.screenWidth, height: pageMetrics.screenHeight, dpr: pageDpr }
              : { availLeft: (window.screen as any).availLeft || 0, availTop: (window.screen as any).availTop || 0, width: window.screen.width, height: window.screen.height, dpr: window.devicePixelRatio }
            const sw = src.width * src.dpr
            const sh = src.height * src.dpr
            const hits = (displays || []).filter((d: any) =>
              Math.abs(d.width - sw) <= 8 && Math.abs(d.height - sh) <= 8)
            if (hits.length !== 1) return failed('display-anchor: ' + hits.length + ' size matches')
            return {
              dipX: src.availLeft,
              dipY: src.availTop,
              physX: hits[0].x,
              physY: hits[0].y,
              // anchored area's physical size — here the whole display
              physW: hits[0].width,
              physH: hits[0].height,
              dpr: src.dpr
            }
          })
          .catch((e: any) => failed('display-anchor: ' + String((e && e.message) || e)))

      const typeSafeAPI = api as any as NativeXYAPI
      lastMouseEventError = ''
      return Promise.all([
        Ext.windows.getLastFocused().catch((e: any) => ({ __err: String((e && e.message) || e) })),
        (typeSafeAPI as any).getActiveBrowserWindowRect().catch((e: any) => ({ __err: String((e && e.message) || e) }))
      ])
      .then(([win, rect]: [any, any]) => {
        if (win && win.__err) return failed('windows-api: ' + win.__err)
        if (rect && rect.__err) return failed('host-rect: ' + rect.__err)
        if (!win || typeof win.left !== 'number' || !(win.width > 0) || !(win.height > 0)) return failed('no-win-bounds')
        if (!rect || typeof rect.x !== 'number') return displayAnchor()
        // VALIDATE that both halves describe the SAME window: the host reads
        // the FOREGROUND window, which is not always the play window —
        // Electron apps (the Claude desktop app!) share the Chrome_WidgetWin_
        // class and pass the host's browser check, and mixing Claude's
        // physical corner with Chrome's DIP corner produced clicks ~2500px
        // off (measured live 2026-08-16). Same window ⇒ the physical/DIP
        // ratios of width and height agree — and that shared ratio IS the
        // window's own display scale, so no external devicePixelRatio is
        // needed (the panel's was the wrong one whenever the panel sat on a
        // differently-scaled display).
        const wr = rect.width / win.width
        const hr = rect.height / win.height
        const sameWindow = wr >= 0.5 && wr <= 5 &&
          Math.abs(rect.width - win.width * hr) <= 8 &&
          Math.abs(rect.height - win.height * wr) <= 8
        if (!sameWindow) return displayAnchor()
        // The anchor maps points correctly on ITS OWN display (and on any
        // display at the same scale). When the caller told us the play page's
        // display scale and the anchored window's differs, that window sits on
        // a differently-scaled display than the page the clicks aim at — the
        // display fallback (keyed on the page's screen) is right, this anchor
        // is not.
        if (pageDpr && Math.abs(wr - pageDpr) > 0.03) return displayAnchor()
        // physW/physH: the window's physical size, so consumers can reason
        // about the window's CENTER (a window overhanging a display edge
        // has its top-left corner on the wrong display — the center says
        // where the window really lives)
        // Windows display scale is an integer percent (125, 150, ... and the
        // custom-scaling slider is integer too), so snap the width ratio to
        // 1/100: a 680-DIP-wide window gives 849/680 = 1.2485 for a 125%
        // display, and a click 3000 physical px from the window corner would
        // land 4 px short of where the finder pointed.
        return { dipX: win.left, dipY: win.top, physX: rect.x, physY: rect.y, physW: rect.width, physH: rect.height, dpr: Math.round(wr * 100) / 100 }
      })
      .catch((e: any) => failed(String((e && e.message) || e)))
    },
    sendViewportMouseEvent: (
      event: MouseEvent,
      options: SendViewportMouseEventParams
    ): Promise<boolean> => {
      const typeSafeAPI = api as any as NativeXYAPI
      lastMouseEventError = ''

      return Promise.all([
        options.getViewportRectInScreen(),
        getFocusedWindowSize(),
        typeSafeAPI.getScalingFactor()
      ])
      .then(async tuple => {
        const viewportRect: Rect    = tuple[0]
        const winSize: WindowSize   = tuple[1]
        const scalingFactor: number = tuple[2]
        // the rect was measured in the PLAY tab, and rides the page's display
        // metrics along — the anchor must judge scale by the display the page
        // is on, never by the panel's (the IDE may be on another monitor)
        const a                     = await (api as any).getDesktopAnchor((viewportRect as any)?.pageMetrics)
        const anchor                = a && typeof a.dipX === 'number' ? a : null

        // viewport point + measured viewport origin = global DIP. The event
        // coordinates are the PLAY PAGE's CSS pixels — at browser zoom ≠ 100%
        // those differ from DIP by the zoom factor (a page at 80% put every
        // browser-scope click short by exactly 0.8x, the forum slope
        // signature), so multiply them out with the tab's zoom (shipped in
        // pageMetrics). Chrome origins ('measured'/'derived') are already
        // DIP; Firefox's 'exact' origin is mozInnerScreenX, which lives in
        // the page's own CSS pixel space — there the whole sum scales.
        const pm = (viewportRect as any).pageMetrics
        const zoom = pm && pm.zoom > 0 ? pm.zoom : 1
        const isExact = (viewportRect as any).source === 'exact'
        const dipX = isExact ? (event.x + viewportRect.x) * zoom : event.x * zoom + viewportRect.x
        const dipY = isExact ? (event.y + viewportRect.y) * zoom : event.y * zoom + viewportRect.y

        // per-display mapping when the anchor is available (Windows,
        // xmodule2); one-factor mapping everywhere else — see getDesktopAnchor
        const screenX = anchor ? anchor.physX + (dipX - anchor.dipX) * anchor.dpr : dipX * scalingFactor
        const screenY = anchor ? anchor.physY + (dipY - anchor.dipY) * anchor.dpr : dipY * scalingFactor

        if (options.onTrace) {
          // the zoom rides in the trace whenever it participates — a click
          // that misses on a zoomed page must say so in the run log
          const zoomNote = zoom !== 1 ? `page zoom ${Math.round(zoom * 100)}%` : undefined
          const anchorNote = [
            anchor ? 'anchored' : (a && a.why ? 'anchor-off: ' + a.why : undefined),
            zoomNote
          ].filter(Boolean).join(', ') || undefined
          try { options.onTrace({ viewportRect, scalingFactor: anchor ? anchor.dpr : scalingFactor, screenX, screenY, anchorNote } as any) } catch (e) { /* trace only */ }
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
        lastMouseEventError = String((e && e.message) || e)
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
      lastMouseEventError = ''

      return Promise.all([
        typeSafeAPI.getScalingFactor(),
        (api as any).getDesktopAnchor()
      ])
      .then(([scalingFactor, a]) => {
        const anchor = a && typeof a.dipX === 'number' ? a : null
        // event.x/y are global DIP screen coordinates — per-display mapping
        // when the anchor is available, one-factor mapping otherwise
        const screenX = anchor ? anchor.physX + (event.x - anchor.dipX) * anchor.dpr : event.x * scalingFactor
        const screenY = anchor ? anchor.physY + (event.y - anchor.dipY) * anchor.dpr : event.y * scalingFactor
        if (opts && opts.onTrace) {
          try { opts.onTrace({ scalingFactor: anchor ? anchor.dpr : scalingFactor, screenX, screenY }) } catch (e) { /* trace only */ }
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
        lastMouseEventError = String((e && e.message) || e)
        return false
      })
    }
  })

  return <NativeXYAPI>(<any>api)
}

// The xmodule2 host — the only xy backend since 10.0.151 (input goes
// through enigo, browser rect through DWM/CGWindowList — see
// xmodule2/host/src/xclick.rs).
// The host answers a refused OS input with an error RESPONSE (input_blocked
// when Windows discarded the injection, input_failed, ...). sendMouseEvent
// keeps its boolean contract, so the text is parked here for the E201
// thrower to append — without it a blocked desktop click reads as a bare
// "Failed to XClick" and the cause (a remote-control input lock, an
// elevated window) stays invisible.
let lastMouseEventError = ''
export const getLastMouseEventError = (): string => lastMouseEventError

export const getNativeXYAPI = singletonGetter(() => makeXYAPI(new NativeMessagingHost(XMODULE2_HOST_NAME)))
