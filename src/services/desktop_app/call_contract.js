// Pure contract shared by the caller, viewport mapper and regression checks.
export function macroCallName (name) {
  if (typeof name !== 'string' || !name.trim() || /[\x00-\x1f:]/.test(name) || /^[\\/]/.test(name) || name.split(/[\\/]/).some(p => p === '..')) {
    throw new Error('Macro name must be a folder-relative JavaScript macro name')
  }
  return /\.js$/i.test(name) ? name : name + '.js'
}

// A standalone desktop call has no browser viewport to measure or monitor.
// Keep this explicit: never silently fall back when viewport measurement fails.
export function standaloneDesktopCall (options = {}) {
  if (options.scope === undefined || options.scope === 'browser') return false
  if (options.scope !== 'desktop') throw new Error("uiv.app.run: scope must be 'browser' or 'desktop'")
  if (options.area !== undefined) throw new Error("uiv.app.run with scope 'desktop' runs independently of a browser area. Omit area, or use scope 'browser' for a measured viewport area.")
  return true
}

// Half a CSS pixel of slack at the viewport edges: getBoundingClientRect
// returns fractional boxes (a canvas laid out at y 84.1015625 and scrolled to
// the top starts at 0.1015625, so its 640 px end at 640.1 in a 640 px
// viewport). Such a box is clipped to the viewport, not refused; a box a whole
// pixel outside is still a wrong box.
const EDGE_SLACK = 0.5

export function callArea (area, viewport) {
  const r = area === undefined ? { x: 0, y: 0, width: viewport.width, height: viewport.height } : area
  if (!r || !['x', 'y', 'width', 'height'].every(k => typeof r[k] === 'number' && Number.isFinite(r[k])) || r.x < -EDGE_SLACK || r.y < -EDGE_SLACK || r.width <= 0 || r.height <= 0 || r.x + r.width > viewport.width + EDGE_SLACK || r.y + r.height > viewport.height + EDGE_SLACK) {
    throw new Error('area must be a positive {x, y, width, height} box inside the browser viewport (CSS pixels)')
  }
  const x = Math.max(0, r.x), y = Math.max(0, r.y)
  return { x, y, width: Math.min(r.x + r.width, viewport.width) - x, height: Math.min(r.y + r.height, viewport.height) - y }
}

// Physical capture pixels, never the panel's DPI or a guessed toolbar height.
export function mapCallArea (area, viewport, origin, pixelsPerCss) {
  if (!(pixelsPerCss > 0) || !Number.isFinite(pixelsPerCss) || !origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) throw new Error('Browser viewport has no measured screen transform')
  const r = callArea(area, viewport)
  return { x: origin.x + r.x * pixelsPerCss, y: origin.y + r.y * pixelsPerCss, width: r.width * pixelsPerCss, height: r.height * pixelsPerCss }
}
