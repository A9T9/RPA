import chart from './chart.json'

export { chart }
export const COLOR_TOLERANCE = 6
// How far a measured anchor side may be from 24 css px × scale. The dark
// threshold (< 45) drops the anti-aliased edge rows of a square drawn at a
// fractional device pixel ratio - up to 1 px per edge - and a tab capture
// resampled to the expected size (Firefox rounds its capture width) blurs
// one more. Measured 2026-09-15 on Windows at 175 %: anchors 41x40 px where
// 42.4 were expected, so 2 px rejected every quad and the "Browser
// screenshot" path reported the chart as not found while the desktop
// capture of the same screen passed. The 32-bit stamp is the real
// validator; the geometry tolerance only has to keep look-alikes out.
export const SIZE_TOLERANCE = 4
export function chartRects (nonce) {
  const rects = [{ x: 0, y: 0, width: chart.width, height: chart.height, color: '#ffffff' }]
  chart.anchors.forEach(([x, y]) => rects.push({ x, y, width: 24, height: 24, color: '#000000' }))
  for (let i = 0; i < 32; i++) rects.push({ x: 104 + i * 8, y: 24, width: 8, height: 8, color: (nonce >>> i) & 1 ? '#000000' : '#ffffff' })
  chart.colors.forEach((color, i) => rects.push({ x: 48 + i % 6 * 64, y: 72 + Math.floor(i / 6) * 64, width: 48, height: 48, color }))
  return rects
}

// Geometry comes from four neutral anchors, independently of the expected
// DPI and colored patches. A fresh 32-bit stamp rejects cached/wrong frames.
export function analyzeChart ({ data, width, height }, nonce, expectedScale) {
  const rgb = (x, y) => {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || y < 0 || x >= width || y >= height) throw new Error('The chart is clipped. Keep the whole test chart visible and run the check again.')
    const p = (y * width + x) * 4
    return [data[p], data[p + 1], data[p + 2]]
  }
  const dark = (x, y) => { const p = (y * width + x) * 4; return data[p] < 45 && data[p + 1] < 45 && data[p + 2] < 45 }
  const candidates = []
  let previous = new Map()
  const finish = r => {
    const w = r.end - r.x, h = r.h
    if (w < 8 || w > 144 || h < 8 || h > 144 || w / h < 0.5 || w / h > 2) return
    if (r.x < 3 || r.y < 3 || r.end + 3 >= width || r.y + h + 3 >= height) return
    if (![[r.x - 3, r.y + h / 2], [r.end + 2, r.y + h / 2], [r.x + w / 2, r.y - 3], [r.x + w / 2, r.y + h + 2]].every(([x, y]) => rgb(x, y).every(v => v > 190))) return
    candidates.push({ x: r.x, y: r.y, w, h, cx: r.x + w / 2, cy: r.y + h / 2 })
  }
  for (let y = 0; y < height; y++) {
    const current = new Map()
    for (let x = 0; x < width;) {
      if (!dark(x, y)) { x++; continue }
      const start = x
      while (x < width && dark(x, y)) x++
      if (x - start < 8 || x - start > 144) continue
      const key = start + ':' + x
      const old = previous.get(key)
      current.set(key, old ? { ...old, h: old.h + 1 } : { x: start, end: x, y, h: 1 })
      previous.delete(key)
    }
    previous.forEach(finish); previous = current
  }
  previous.forEach(finish)
  if (candidates.length > 500) throw new Error('The chart could not be isolated. Keep only the compatibility chart visible and retry.')
  const matches = []
  // Why a chart was NOT found is what a support request needs: how many
  // dark squares were seen, how many anchor quads had the chart's geometry,
  // and how many of those carried a stale stamp (a cached or previous frame).
  let quads = 0, staleStamps = 0, pairs = 0
  for (const a of candidates) for (const b of candidates) {
    const sx = (b.cx - a.cx) / 424
    if (sx < 0.4 || sx > 6 || Math.abs(b.cy - a.cy) > 2 || Math.abs(a.w - 24 * sx) > SIZE_TOLERANCE || Math.abs(b.w - a.w) > SIZE_TOLERANCE) continue
    pairs++
    for (const c of candidates) {
      const sy = (c.cy - a.cy) / 264
      if (sy < 0.4 || sy > 6 || Math.abs(c.cx - a.cx) > 2 || Math.abs(c.h - 24 * sy) > SIZE_TOLERANCE || Math.abs(a.h - c.h) > SIZE_TOLERANCE) continue
      pairs++
      const d = candidates.find(d => Math.abs(d.cx - b.cx) <= 2 && Math.abs(d.cy - c.cy) <= 2 && Math.abs(d.w - b.w) <= SIZE_TOLERANCE && Math.abs(d.h - c.h) <= SIZE_TOLERANCE)
      if (!d) continue
      quads++
      const x = a.cx - 28 * sx, y = a.cy - 28 * sy
      if (x < -1 || y < -1 || x + chart.width * sx > width + 1 || y + chart.height * sy > height + 1) continue
      let stamp = 0
      for (let i = 0; i < 32; i++) if (rgb(x + (108 + i * 8) * sx, y + 28 * sy).every(v => v < 128)) stamp = (stamp | (1 << i)) >>> 0
      if (stamp === (nonce >>> 0)) matches.push({ x, y, sx, sy })
      else staleStamps++
    }
  }
  if (matches.length > 1) throw new Error('More than one current chart was captured. Close duplicate checks and retry.')
  if (matches.length === 0) {
    const seen = width + 'x' + height + ' px: ' + candidates.length + ' dark squares, ' + quads + ' with the chart\'s anchor geometry, ' + staleStamps + ' of those with a stamp from another frame'
    // Corner marks that pair up along one edge but never close the
    // rectangle: something sits over part of the chart (measured 2026-09-15:
    // Firefox's translation offer popped over the top-right corner on every
    // load of the Settings page and left 3 marks visible).
    if (quads === 0 && pairs > 0) throw new Error('Part of the chart is covered - its corner marks were found on one side only (' + seen + '). Close any popup, panel or window over the page and retry. No color or scaling verdict was inferred.')
    throw new Error('The current chart was not found in this capture (' + seen + '). Keep it fully visible, wait for screen sharing permission if requested, then retry. No color or scaling verdict was inferred.')
  }
  const area = matches[0]
  const patches = chart.colors.map((hex, i) => {
    const expected = [1, 3, 5].map(n => parseInt(hex.slice(n, n + 2), 16))
    const samples = []
    for (const dy of [12, 24, 36]) for (const dx of [12, 24, 36]) samples.push(rgb(area.x + (48 + i % 6 * 64 + dx) * area.sx, area.y + (72 + Math.floor(i / 6) * 64 + dy) * area.sy))
    const actual = [0, 1, 2].map(c => samples.map(s => s[c]).sort((a, b) => a - b)[4])
    const error = Math.max(...actual.map((v, c) => Math.abs(v - expected[c])))
    const spread = Math.max(...samples.flatMap(s => s.map((v, c) => Math.abs(v - actual[c]))))
    return { expected: hex, actual, error, spread }
  })
  const maxError = Math.max(...patches.map(p => p.error))
  const uniform = patches.every(p => p.spread <= COLOR_TOLERANCE)
  const scaleErrorPx = Math.max(Math.abs(area.sx - expectedScale) * chart.width, Math.abs(area.sy - expectedScale) * chart.height)
  return {
    color: { status: uniform && maxError <= COLOR_TOLERANCE ? 'pass' : 'mismatch', maxError, tolerance: COLOR_TOLERANCE, uniform, patches },
    geometry: { status: scaleErrorPx <= 2 ? 'pass' : 'mismatch', expectedScale, scaleX: area.sx, scaleY: area.sy, scaleErrorPx, x: area.x, y: area.y },
    image: { width, height }, correction: 'none'
  }
}

// A report is evidence for this rendering/capture environment only. Native
// identity is installation-local; these records never enter macro backups.
export function environmentKey (e) { return JSON.stringify(e) }

// The patch a support request needs: the one furthest from its CSS value.
export function worstPatch (color) {
  const p = (color?.patches || []).reduce((a, b) => (b.error > (a?.error ?? -1) ? b : a), null)
  if (!p) return ''
  const over = color.patches.filter(q => q.error > color.tolerance).length
  return over + ' of ' + color.patches.length + ' patches over ' + color.tolerance + '/255, worst ' + p.expected + ' captured as #' + p.actual.map(v => v.toString(16).padStart(2, '0')).join('') + ' (' + p.error + ')'
}

// Colours that differ on the browser paths only, while the desktop app's
// chart - the same capture, painted without colour management - comes back
// exact and every scale and coordinate passes: the display is colour-managed
// and the browser corrected the CSS colours for its profile (any Windows
// monitor with a vendor ICC profile, Auto Color Management or HDR; measured
// 2026-09-16 on a DELL U2724DE: #00ff00 on screen as #80fb41). That is a
// property of the display, not a defect of the install, so it is reported as
// "Corrected", not as a failure. A colour mismatch on the app path, or any
// geometry mismatch, stays a failure: those are the capture pipeline.
export function colorsCorrected (paths) {
  const app = paths.find(p => p.id === 'app-desktop')
  if (!app || app.status !== 'measured' || app.color?.status !== 'pass') return false
  if (paths.some(p => p.status === 'error' || p.geometry?.status === 'mismatch' || p.coordinates?.status === 'mismatch')) return false
  return paths.some(p => p.color?.status === 'mismatch')
}
export function colorVerdict (path, paths) {
  return path.color?.status === 'mismatch' && colorsCorrected(paths) ? 'corrected' : path.color?.status
}
export function reportStatus (paths) {
  if (paths.some(p => p.status === 'error' || p.geometry?.status === 'mismatch' || p.coordinates?.status === 'mismatch')) return 'Needs attention'
  if (paths.some(p => p.color?.status === 'mismatch') && !colorsCorrected(paths)) return 'Needs attention'
  if (paths.some(p => p.status === 'unavailable')) return 'Partly checked'
  return paths.length ? 'Checks passed' : 'Not checked'
}
