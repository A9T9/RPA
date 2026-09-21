// Chrome DIP screen space <-> OS physical virtual-screen space, per display.
//
// ONE scaling factor cannot bridge the two on Windows when displays run
// different scaling (125% + 175% measured live 2026-08-16): the per-display
// factors differ AND Chrome re-packs the DIP origins (a 2560px-wide 125%
// primary spans 2048 DIP, so the 175% display to its right starts at DIP
// 2048 but physical 2560 — one-factor math overshot clicks there by 1024px).
//
// The bridge is a WINDOW ANCHOR: chrome.windows reports the focused browser
// window's top-left in DIP, the xmodule2 host's GetWindowRect reports the
// SAME corner in physical px, and everything inside one window sits on one
// display where devicePixelRatio is the entire scale. So:
//   phys = physWin + (dip − dipWin) × dpr
//   dip  = dipWin + (phys − physWin) ÷ dpr
// On uniform-scale setups physWin = dipWin × factor and both reduce exactly
// to the old ×/÷ scalingFactor — anchor math is a strict generalization.
//
// The anchor is null on macOS (points everywhere, nothing to fix) and when
// no browser window is in front — callers keep the old one-factor math then.

import { getNativeXYAPI } from './xy'
import { getXModule2API } from './xmodules2/native'
import csIpc from '../common/ipc/ipc_cs'

export type DesktopDipAnchor = {
  dipX: number
  dipY: number
  physX: number
  physY: number
  // physical size of the anchored area (the browser window, or the whole
  // display on the display-anchor fallback) — lets consumers reason about
  // the CENTER instead of the corner
  physW?: number
  physH?: number
  dpr: number
}

// Clicks and searches ask several times per command; the window can move
// between commands but not meaningfully within one, so a short cache saves
// the repeated chrome.windows + host round-trips without going stale.
let cache: { at: number, value: DesktopDipAnchor | null } | null = null
const CACHE_MS = 300

export const getDesktopDipAnchor = (): Promise<DesktopDipAnchor | null> => {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_MS) return Promise.resolve(cache.value)
  return (getNativeXYAPI() as any).getDesktopAnchor()
    .then((a: any) => {
      // {why} = anchor unavailable, tagged with the reason — callers get null
      const value: DesktopDipAnchor | null = a && typeof a.dipX === 'number' ? a : null
      cache = { at: Date.now(), value }
      return value
    })
    .catch(() => {
      cache = { at: Date.now(), value: null }
      return null
    })
}

export const dipToPhysPoint = (a: DesktopDipAnchor, p: { x: number, y: number }) => ({
  x: a.physX + (p.x - a.dipX) * a.dpr,
  y: a.physY + (p.y - a.dipY) * a.dpr
})

export const physToDipPoint = (a: DesktopDipAnchor, p: { x: number, y: number }) => ({
  x: a.dipX + (p.x - a.physX) / a.dpr,
  y: a.dipY + (p.y - a.physY) / a.dpr
})

// The additive shift that turns "physical ÷ dpr" (the old one-factor result)
// into true DIP: dip = phys/dpr + dipShift. Zero on uniform-scale setups.
export const dipShiftOf = (a: DesktopDipAnchor) => ({
  x: a.dipX - a.physX / a.dpr,
  y: a.dipY - a.physY / a.dpr
})

// ---------------------------------------------------------------------------
// Capture display hint (Windows)
//
// The host's capture-display selection keys on the FOREGROUND browser window
// (xmodule2/host/src/cv.rs active_display). That heuristic is wrong exactly
// when it matters: with a non-browser app focused mid-run, capture falls back
// to the primary display while the page sits on monitor 2 (OCR/image search
// then scan the wrong screen — observed live); and in desktop mode right
// after clicking Play, the IDE panel window itself qualifies as "the browser"
// and its monitor wins. The fix: the extension KNOWS the play window (the
// anchor's physical corner), matches it against get_display_list, and passes
// that display's physical bounds as `displayHint` on every capture/search
// RPC — the host then captures that display regardless of what is focused.
// null = no hint (anchor unavailable, non-Windows) → host keeps the
// foreground heuristic, i.e. exactly the old behavior.
// ---------------------------------------------------------------------------

export type DisplayHintRect = { x: number, y: number, width: number, height: number }

// Displays move/rescale rarely; don't pay a host round-trip per capture.
let displayListCache: { at: number, value: any[] } | null = null
const DISPLAY_LIST_CACHE_MS = 5000

const getDisplayList = (): Promise<any[]> => {
  const now = Date.now()
  if (displayListCache && now - displayListCache.at < DISPLAY_LIST_CACHE_MS) {
    return Promise.resolve(displayListCache.value)
  }
  return getXModule2API().invoke('get_display_list')
    .then((displays: any[]) => {
      displayListCache = { at: Date.now(), value: displays || [] }
      return displayListCache.value
    })
}

// The anchor that aims the hint. The cached no-arg anchor degrades to a
// display anchor keyed on the PANEL's screen when no browser window is
// foreground (a non-browser app focused mid-run — the exact case the hint
// exists for), and the panel may sit on the IDE's monitor. The play page's
// own display metrics (shipped with the viewport rect since the 2026-08-20
// panel-dpr fix) re-key that fallback on the PAGE's display; fetching them
// can itself fail outside a run (no play tab) — then the cached anchor is
// all there is.
const anchorForHint = (): Promise<DesktopDipAnchor | null> => {
  const pPageMetrics = new Promise<any>((resolve) => {
    const timer = setTimeout(() => resolve(null), 800)
    csIpc.ask('PANEL_GET_VIEWPORT_RECT_IN_SCREEN')
      .then((rect: any) => { clearTimeout(timer); resolve(rect && rect.pageMetrics) })
      .catch(() => { clearTimeout(timer); resolve(null) })
  })
  return pPageMetrics
    .then((pageMetrics: any) => {
      if (!pageMetrics) return getDesktopDipAnchor()
      return (getNativeXYAPI() as any).getDesktopAnchor(pageMetrics)
        .then((a: any) => (a && typeof a.dipX === 'number' ? a : null))
        .catch(() => getDesktopDipAnchor())
    })
    .catch(() => getDesktopDipAnchor())
}

// Short cache: the hint is asked before EVERY desktop capture/search, and
// resolving it costs an IPC into the play tab (whose main thread may be
// busy — a page running a 60fps canvas answered in hundreds of ms, measured
// while a vision loop starved on exactly this preamble). Displays and the
// play window don't move meaningfully within a second and a half.
let hintCache: { at: number, value: DisplayHintRect | null } | null = null
const HINT_CACHE_MS = 1500

export const getDesktopCaptureHint = (): Promise<DisplayHintRect | null> => {
  // Windows-only for now — macOS/Linux keep the foreground heuristic
  // unchanged (their anchor is null anyway, and get_display_list units
  // differ: points on macOS, physical px on Windows — the space the host
  // compares hints in).
  if (!/windows/i.test(window.navigator.userAgent)) return Promise.resolve(null)
  if (hintCache && Date.now() - hintCache.at < HINT_CACHE_MS) {
    return Promise.resolve(hintCache.value)
  }
  return anchorForHint()
    .then(anchor => {
      if (!anchor) return null
      return getDisplayList().then(displays => {
        if (!displays || !displays.length) return null
        // Probe the anchored window's CENTER, not its corner: a window that
        // straddles a display boundary (or a maximized window, whose
        // GetWindowRect left/top sit ~8px OUTSIDE its display behind the
        // invisible resize borders) has its top-left on the WRONG display —
        // the center says where the window really lives. Without a size
        // (older anchor shape) fall back to the old inward nudge.
        const px = anchor.physX + (anchor.physW && anchor.physW > 0 ? anchor.physW / 2 : 16)
        const py = anchor.physY + (anchor.physH && anchor.physH > 0 ? anchor.physH / 2 : 16)
        const containing = displays.find((d: any) =>
          px >= d.x && px < d.x + d.width && py >= d.y && py < d.y + d.height)
        const d = containing || displays.reduce((best: any, d: any) => {
          // window dragged mostly off-screen: nearest display by distance
          // from the probe point to the display's bounds
          const dx = Math.max(d.x - px, 0, px - (d.x + d.width))
          const dy = Math.max(d.y - py, 0, py - (d.y + d.height))
          const dist = dx * dx + dy * dy
          return (!best || dist < best.dist) ? { d, dist } : best
        }, null)?.d
        if (!d) return null
        return { x: d.x, y: d.y, width: d.width, height: d.height }
      })
    })
    .catch(() => null)
    .then((value: DisplayHintRect | null) => {
      hintCache = { at: Date.now(), value }
      return value
    })
}
