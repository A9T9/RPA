// Desktop border indicator — the on-screen twin of the capture display hint.
//
// While desktop automation is active, the host draws a colored click-through
// frame around the display being automated (like Claude for Chrome's tab
// border, but on the desktop). The frame outlines the SAME display
// getDesktopCaptureHint selects for captures, so it doubles as a diagnostic:
// border on the wrong monitor = captures on the wrong monitor. The host
// keeps the frame out of its own captures (WDA_EXCLUDEFROMCAPTURE plus an
// in-process hide during capture — see xmodule2/host/src/border.rs).
//
// Windows and macOS (host 2.0.11+). On mac the capture hint stays null —
// the border call goes out RECTLESS and the host outlines the active
// display itself (the one captures target). Marks and the search area keep
// their physical-px wire values (the host converts to points — only it
// knows every display's scale); the DIP variants pass space:'points'
// because mac DIP == global points; input cues are already in points (the
// mac input space). Linux is a planned follow-up; Wayland-native gets none
// (no global geometry).
//
// Settings > Replay > Replay Helper (2026-08-21 model):
//   "Replay desktop animations" — config.playDesktopAnimations, default ON;
//     gates the border AND the match marks (the desktop twin of "Replay
//     browser animations" / playHighlightElements).
//   "Show border even during remote sessions" —
//     config.desktopBorderCaptureVisible, default OFF. When ON the overlays
//     skip DWM capture-exclusion: they become visible in RDP/screen-sharing
//     streams — and consequently in screenshots and OCR/vision captures too
//     (accepted: a thin frame at the display edge rarely disturbs a search).

import { getNativeCVAPI } from './desktop'
import { getDesktopCaptureHint, getDesktopDipAnchor, dipToPhysPoint, DisplayHintRect } from './desktop_dip'
import storage from '@/common/storage'
import { store } from '@/redux'
import * as act from '@/actions'
import * as C from '@/common/constant'

// One log line when the border goes up or comes down (and when a show
// fails) — the run log then answers "was the border on the right display"
// without a debugger. Deliberately NOT logged: the per-command skip checks
// (no run active, unchanged display), which fire constantly.
const blog = (msg: string) => {
  try { store.dispatch(act.addLog('info', `border: ${msg}`)) } catch (e) { /* logging only */ }
}

// The border RPCs ride the CV API connection deliberately: each native-
// messaging port spawns its OWN host process, and only the process that owns
// the border windows can hide them during its captures pre-Win10-2004 —
// captureDesktop / searchDesktop live on this same connection.
let shownRect: DisplayHintRect | null = null
// Generation guard: hide() bumps it, and a show() that resolved its display
// AFTER the hide must not resurrect the border (fire-and-forget show racing
// the end-of-run hide).
let generation = 0

// Cached briefly: input cues fire on EVERY desktop mouse event (a drag is a
// stream of moves), and a storage read per event would be pure overhead.
let settingsCache: { at: number, value: { enabled: boolean, captureVisible: boolean } } | null = null
const SETTINGS_CACHE_MS = 2000
// Overlays silently skipping because the setting is off looks exactly like
// "overlays are broken" (cost a live debugging session to tell apart) — say
// it ONCE per panel lifetime, in the log, when the first overlay is skipped.
let warnedDisabled = false

const overlaySettings = (): Promise<{ enabled: boolean, captureVisible: boolean }> => {
  if (settingsCache && Date.now() - settingsCache.at < SETTINGS_CACHE_MS) {
    return Promise.resolve(settingsCache.value)
  }
  return storage.get('config')
    .then((config: any) => ({
      enabled: !config || config.playDesktopAnimations !== false,
      captureVisible: !!(config && config.desktopBorderCaptureVisible)
    }))
    .catch(() => ({ enabled: true, captureVisible: false }))
    .then(value => {
      settingsCache = { at: Date.now(), value }
      if (!value.enabled && !warnedDisabled) {
        warnedDisabled = true
        blog('desktop overlays OFF — "Replay desktop animations" is unchecked in Settings > Replay')
      }
      return value
    })
}

// The border marks a RUN in progress — desktop captures also happen outside
// runs (the bridge's post-run result overlay, the select-area flow, settings
// test buttons), and those must not resurrect the frame after the run's END
// already hid it (observed live: the bridge's after-run screenshot re-showed
// it seconds after the epilogue hide).
const runActive = (): boolean => {
  try {
    const s: any = store.getState()
    return (s.player && s.player.status !== C.PLAYER_STATUS.STOPPED) ||
      !!(s.ui && s.ui.scriptRunning)
  } catch (e) {
    return false
  }
}

const sameRect = (a: DisplayHintRect, b: DisplayHintRect) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height

// Platforms with a host-side overlay implementation. Everything below
// no-ops elsewhere (Linux/Wayland) so callers can fire-and-forget.
const overlayOS = (): 'win' | 'mac' | null =>
  /windows/i.test(window.navigator.userAgent) ? 'win'
    : /macintosh|mac os x/i.test(window.navigator.userAgent) ? 'mac'
      : null

// mac sentinel for "the active display, resolved host-side" — the border
// RPC goes out without a rect; the zero rect only feeds the dedupe logic.
const MAC_ACTIVE_DISPLAY: DisplayHintRect = { x: 0, y: 0, width: 0, height: 0 }

// One show RPC in flight at a time; a failed show must NOT mark the border
// as shown (it did at first — the run's first show failed while the CV
// connection was still reconnecting, and every later call skipped as
// "already shown": border missing for the whole click phase, field-observed).
let pendingRect: DisplayHintRect | null = null

// Idempotent; safe to fire-and-forget from every desktop-scope command. The
// host RPC only goes out when the target display actually changed.
export const showDesktopBorder = (): Promise<void> => showBorder(false)

// outsideRun: the screenshot flash below — the only caller allowed past the
// run gate; note is appended to the "shown" log line
const showBorder = (outsideRun: boolean, note = ''): Promise<void> => {
  if (!outsideRun && !runActive()) return Promise.resolve()
  const gen = generation
  return Promise.all([overlaySettings(), getDesktopCaptureHint()])
    .then(([{ enabled, captureVisible }, hint]) => {
      // mac: no anchor-based hint — the host resolves the active display
      const target = hint || (overlayOS() === 'mac' ? MAC_ACTIVE_DISPLAY : null)
      if (!enabled || !target) return
      if (gen !== generation) return // a hide won the race — stay hidden
      if (shownRect && sameRect(shownRect, target)) return // already up there
      if (pendingRect && sameRect(pendingRect, target)) return // show in flight
      pendingRect = target
      const params = target === MAC_ACTIVE_DISPLAY
        ? { captureVisible } // rectless: host-side display resolution
        : { ...target, captureVisible }
      return (getNativeCVAPI() as any).showDisplayBorder(params)
        .then((r: any) => {
          pendingRect = null
          if (gen !== generation) {
            // a hide raced the RPC — take it down again
            return (getNativeCVAPI() as any).hideDisplayBorder({}).catch(() => {})
          }
          if (r && r.shown === false) {
            blog(`not shown: ${r.reason || 'unknown'}`)
            return
          }
          shownRect = target
          blog((target === MAC_ACTIVE_DISPLAY
            ? 'shown around the active display'
            : `shown around display at ${target.x},${target.y} (${target.width}x${target.height})`) + note)
        }, (e: any) => {
          pendingRect = null // failed ≠ shown: the next call retries
          blog(`show failed: ${(e && e.message) || e}`)
        })
    })
    .catch(() => { /* border is best-effort decoration, never fails a run */ })
}

export const hideDesktopBorder = (reason = 'run ended or mode off'): Promise<void> => {
  generation++
  if (flashTimer) { clearTimeout(flashTimer); flashTimer = null } // a run's hide outranks a pending flash hide
  // Never shown (e.g. plain browser runs) — do not touch the native host,
  // that would spawn it for nothing. (The host takes match marks down
  // together with the border; marks also expire on their own.)
  if (!shownRect && !pendingRect) return Promise.resolve()
  shownRect = null
  blog(`hidden (${reason})`)
  return (getNativeCVAPI() as any).hideDisplayBorder({})
    .then(() => {})
    .catch(() => { /* connection gone = host gone = border gone with it */ })
}

// Flash — the frame for a desktop capture taken OUTSIDE a run (the MCP and
// chat screenshot tools). A run's border is taken down by the run's end; a
// capture outside one has no end, so this show brings its own timer. Same
// gate (Replay desktop animations), same host-side exclusion from captures;
// called AFTER the capture, so it never meets the host's in-capture hide.
// A run that starts inside the window keeps its border: the timer only
// hides when no run is active by then, and a new flash restarts it.
let flashTimer: ReturnType<typeof setTimeout> | null = null
export const flashDesktopBorder = (durationMs = 3000): Promise<void> => {
  if (runActive()) return showDesktopBorder() // a run's border lives until the run ends
  if (flashTimer) { clearTimeout(flashTimer); flashTimer = null }
  return showBorder(true, ` for ${Math.round(durationMs / 1000)} s after a desktop screenshot`).then(() => {
    flashTimer = setTimeout(() => {
      flashTimer = null
      if (runActive()) return
      hideDesktopBorder('screenshot flash over').catch(() => {})
    }, durationMs)
  })
}

// ---------------------------------------------------------------------------
// Match marks — bounding boxes around desktop search matches, the desktop
// twin of the in-page highlight. Auto-expire host-side (default 1.5s), so
// there is nothing to hide and no stuck state. One color per finder type.
// ---------------------------------------------------------------------------

export type DesktopMatchType = 'image' | 'ocr'

const MARK_COLORS: Record<DesktopMatchType, string> = {
  image: '#2563eb', // blue — image search matches
  ocr: '#f59e0b'    // gold — OCR text matches
}

// Selected vs the other candidates (host 2.0.14+, older hosts ignore the
// per-mark fields and draw all alike): the match the command acts on is
// thick and opaque, the rest thin and translucent — same hue, so the color
// keeps meaning "which finder" and the weight "which one". Thickness alone
// is easy to miss on a HiDPI screen; alpha alone reads as a different KIND
// of match. Without a selected index (a plural finder handing the choice to
// the script) every mark keeps the default 3px/230 look.
const MARK_STYLE = {
  selected: { thickness: 5, alpha: 255 },
  other:    { thickness: 2, alpha: 110 }
}
const MAX_MARKS = 16

type MarkRect = { x: number, y: number, width: number, height: number }

// The wire array: the selected mark first (so the 16-mark cap never drops
// it), each rounded, styled when a selection exists.
const markPayload = (rects: MarkRect[], selectedIndex?: number) => {
  const styled = typeof selectedIndex === 'number' && selectedIndex >= 0 && selectedIndex < rects.length
  const ordered = styled
    ? [rects[selectedIndex!], ...rects.filter((_, i) => i !== selectedIndex)]
    : rects
  return ordered.slice(0, MAX_MARKS).map((r, i) => ({
    x: Math.round(r.x),
    y: Math.round(r.y),
    width: Math.round(r.width),
    height: Math.round(r.height),
    ...(styled ? (i === 0 ? MARK_STYLE.selected : MARK_STYLE.other) : {})
  }))
}

// Rects in global-anchored PHYSICAL pixels — exactly what the host's
// search_desktop results (matchedRect) carry, pass them through unchanged.
// selectedIndex: which rect the command acts on (see MARK_STYLE); omit when
// there is no such choice.
export const showDesktopMatchMarks = (
  rects: MarkRect[],
  type: DesktopMatchType,
  selectedIndex?: number
): Promise<void> => {
  if (!overlayOS()) return Promise.resolve()
  if (!rects || !rects.length) return Promise.resolve()
  return overlaySettings()
    .then(({ enabled, captureVisible }) => {
      if (!enabled) return
      return (getNativeCVAPI() as any).showMatchMarks({
        marks: markPayload(rects, selectedIndex),
        color: MARK_COLORS[type],
        captureVisible
      }).then(() => {})
    })
    .catch(() => { /* marks are best-effort decoration, never fail a find */ })
}

// ---------------------------------------------------------------------------
// Input cues — the desktop twin of the in-page cursor animation. One call
// per OS mouse event, at the PHYSICAL screen point the host is about to act
// on: click = expanding ring, move = small fading blip, down = persistent
// filled disc (the mouse-button-held symbol) that later moves drag along,
// up = disc removed with a ripple. The BUTTON is color-coded — that is the
// mouse-key-state symbol: left orange, right blue, middle green.
// ---------------------------------------------------------------------------

export type DesktopCueKind = 'click' | 'move' | 'down' | 'up'

const BUTTON_COLORS = ['#ff6a00', '#2563eb', '#16a34a'] // left, right, middle
// the keyboard cue's color — deliberately none of the mouse-button colors
const TYPE_CUE_COLOR = '#8b5cf6'

// Where OS input last acted, in physical screen px — the keyboard cue's
// anchor: keystrokes have no natural screen position, so they blip where
// the mouse last acted (usually the field just clicked).
let lastInputPoint: { x: number, y: number, scale: number } | null = null

export const showDesktopInputCue = (
  physX: number,
  physY: number,
  kind: DesktopCueKind,
  button: number,
  displayScale: number
): Promise<void> => {
  if (!overlayOS()) return Promise.resolve()
  lastInputPoint = { x: physX, y: physY, scale: displayScale }
  return overlaySettings()
    .then(({ enabled, captureVisible }) => {
      if (!enabled) return
      return (getNativeCVAPI() as any).showInputCue({
        x: Math.round(physX),
        y: Math.round(physY),
        kind,
        color: BUTTON_COLORS[button] || BUTTON_COLORS[0],
        // same apparent ring size at every display scaling
        radius: Math.round(17 * (displayScale > 0 ? displayScale : 1)),
        captureVisible
      }).then(() => {})
    })
    .catch(() => { /* cues are best-effort decoration, never fail input */ })
}

// Exploration marker (click_at / type_at): the ~450ms click ring is easy to
// miss over a screen-sharing stream, and the person watching wants to SEE
// where the agent's exploratory click landed. A box around the last input
// point, held for durationMs (host default 2500, capped at 10s) — the same
// match-mark overlay the finders use, in the left-button color. Honors the
// overlay settings like every cue (off = nothing; capture visibility as
// configured). Fire-and-forget; never fails the click.
export const showDesktopLastInputMark = (durationMs = 3000): Promise<void> => {
  if (!overlayOS()) return Promise.resolve()
  const p = lastInputPoint
  if (!p) return Promise.resolve()
  const half = Math.round(22 * (p.scale > 0 ? p.scale : 1))
  return overlaySettings()
    .then(({ enabled, captureVisible }) => {
      if (!enabled) return
      return (getNativeCVAPI() as any).showMatchMarks({
        marks: [{ x: Math.round(p.x) - half, y: Math.round(p.y) - half, width: half * 2, height: half * 2, thickness: 4, alpha: 255 }],
        color: BUTTON_COLORS[0],
        durationMs,
        captureVisible
      }).then(() => {})
    })
    .catch(() => { /* marks are best-effort decoration, never fail input */ })
}

// The keyboard twin: XType and uiv.desktop.keyboard.type show a SQUARE blip at the
// last input point — or near the active display's top-left corner when no
// mouse has acted yet. Fire-and-forget AFTER the keystroke RPC is issued,
// so it adds zero latency to the keys themselves.
// the raw captureVisible setting, for callers that hand overlays to the
// host themselves (the reflex engine passes it into reflex_run)
export const desktopOverlayCaptureVisible = (): Promise<boolean> =>
  overlaySettings().then(s => s.captureVisible).catch(() => false)

export const showDesktopTypeCue = (): Promise<void> => {
  if (!overlayOS()) return Promise.resolve()
  return overlaySettings()
    .then(async ({ enabled, captureVisible }) => {
      if (!enabled) return
      let p = lastInputPoint
      if (!p) {
        const hint = await getDesktopCaptureHint()
        if (!hint) return
        p = { x: hint.x + 60, y: hint.y + 60, scale: 1 }
      }
      return (getNativeCVAPI() as any).showInputCue({
        x: Math.round(p.x),
        y: Math.round(p.y),
        kind: 'type',
        color: TYPE_CUE_COLOR,
        radius: Math.round(17 * (p.scale > 0 ? p.scale : 1)),
        captureVisible
      }).then(() => {})
    })
    .catch(() => { /* cues are best-effort decoration, never fail input */ })
}

// Same, for rects in Chrome's DIP screen space (the OCR pipeline's space
// after its display-origin rebase): mapped to physical via the mixed-DPI
// window anchor. No anchor (macOS, no host) = no marks — a wrongly-scaled
// box is worse than none.
// ---------------------------------------------------------------------------
// Search-area shade — "the finder is looking HERE": when a desktop find is
// limited to an area, the host dims the rest of that display (translucent
// grey bands) and outlines the area, for a couple of seconds. Fire-and-
// forget right before the search; the overlay is capture-excluded, and even
// when captureVisible is on it only ever covers the parts the finder
// ignores anyway.
// ---------------------------------------------------------------------------

export const showDesktopSearchArea = (
  area: { x: number, y: number, width: number, height: number } | null | undefined,
  displayHint: DisplayHintRect | null | undefined,
  durationMs: number = 2500
): Promise<void> => {
  if (!overlayOS()) return Promise.resolve()
  if (!area || !(area.width > 0) || !(area.height > 0)) return Promise.resolve()
  return overlaySettings()
    .then(({ enabled, captureVisible }) => {
      if (!enabled) return
      return (getNativeCVAPI() as any).showSearchArea({
        x: Math.round(area.x),
        y: Math.round(area.y),
        width: Math.round(area.width),
        height: Math.round(area.height),
        display: displayHint || undefined,
        durationMs,
        captureVisible
      }).then(() => {})
    })
    .catch(() => { /* shade is best-effort decoration */ })
}

// Same, for an area in Chrome's DIP screen space (the OCR pipeline's
// storedImageRect) — converted through the window anchor like the marks.
export const showDesktopSearchAreaDip = (
  area: { x: number, y: number, width: number, height: number } | null | undefined,
  displayHint: DisplayHintRect | null | undefined
): Promise<void> => {
  const os = overlayOS()
  if (!os) return Promise.resolve()
  if (!area || !(area.width > 0) || !(area.height > 0)) return Promise.resolve()
  if (os === 'mac') {
    // mac DIP == global points: hand the host the values unchanged, tagged
    // so it skips its physical→points conversion
    return overlaySettings()
      .then(({ enabled, captureVisible }) => {
        if (!enabled) return
        return (getNativeCVAPI() as any).showSearchArea({
          x: Math.round(area.x),
          y: Math.round(area.y),
          width: Math.round(area.width),
          height: Math.round(area.height),
          display: displayHint || undefined,
          space: 'points',
          captureVisible
        }).then(() => {})
      })
      .catch(() => { /* shade is best-effort decoration */ })
  }
  return getDesktopDipAnchor()
    .then(anchor => {
      if (!anchor) return
      const p = dipToPhysPoint(anchor, { x: area.x, y: area.y })
      return showDesktopSearchArea(
        { x: p.x, y: p.y, width: area.width * anchor.dpr, height: area.height * anchor.dpr },
        displayHint
      )
    })
    .catch(() => { /* shade is best-effort decoration */ })
}

export const showDesktopMatchMarksDip = (
  rects: MarkRect[],
  type: DesktopMatchType,
  selectedIndex?: number
): Promise<void> => {
  const os = overlayOS()
  if (!os) return Promise.resolve()
  if (!rects || !rects.length) return Promise.resolve()
  if (os === 'mac') {
    // mac DIP == global points: pass through, tagged (see the shade above)
    return overlaySettings()
      .then(({ enabled, captureVisible }) => {
        if (!enabled) return
        return (getNativeCVAPI() as any).showMatchMarks({
          marks: markPayload(rects, selectedIndex),
          color: MARK_COLORS[type],
          space: 'points',
          captureVisible
        }).then(() => {})
      })
      .catch(() => { /* marks are best-effort decoration */ })
  }
  return getDesktopDipAnchor()
    .then(anchor => {
      if (!anchor) return
      return showDesktopMatchMarks(
        rects.map(r => {
          const p = dipToPhysPoint(anchor, { x: r.x, y: r.y })
          return { x: p.x, y: p.y, width: r.width * anchor.dpr, height: r.height * anchor.dpr }
        }),
        type,
        selectedIndex
      )
    })
    .catch(() => { /* marks are best-effort decoration */ })
}
