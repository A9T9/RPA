import Ext from '@/common/web_extension'
import { getNativeXYAPI } from '@/services/xy'
import { findBeaconRect } from '@/services/xy/beacon'
import { callArea, mapCallArea } from './call_contract'

// Use the isolated extension world: measuring an area must not attach a new
// debugger and shrink the viewport AFTER the caller supplied its CSS box.
export async function viewportProbe(tabId: number, markerId = '', color = '', remove = false): Promise<any> {
  const results = await chrome.scripting.executeScript({target:{tabId}, func: (id, fill, drop) => {
    let b = id ? document.getElementById(id) : null
    if (drop) { if (b) b.remove(); return null }
    if (id) {
      if (!b) {
        b = document.createElement('div'); b.id = id
        b.style.cssText = 'position:fixed!important;right:24px!important;top:24px!important;width:160px!important;height:48px!important;z-index:2147483647!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;transform:none!important;opacity:1!important;pointer-events:none!important'
        document.documentElement.appendChild(b)
      }
      b.style.setProperty('background', fill, 'important')
      // Neutral tones survive color management. An opposite outline isolates
      // the rectangle even on a page with the same background color.
      b.style.setProperty('outline', '4px solid ' + (fill === '#202020' ? '#ffffff' : '#000000'), 'important')
    }
    const read = () => {
      const r = b && b.getBoundingClientRect()
      return {bx:r && r.left,by:r && r.top,width:innerWidth,height:innerHeight,dpr:devicePixelRatio,sx:screenX,sy:screenY,visible:document.visibilityState}
    }
    return id ? new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(read())))) : read()
  }, args:[markerId,color,remove]})
  if (!results.length || !results[0] || (!remove && !results[0].result)) throw new Error('Cannot read the browser viewport')
  return results[0].result
}

// Measure the rendered viewport against native pixels. Two colours at the
// same position identify our marker, including when another window has a
// similar solid region. No toolbar arithmetic or page game state is used.
export async function measureCallViewport (tab: any, area?: any): Promise<any> {
  const markerId = '__uiv_macro_call_' + crypto.randomUUID().replace(/-/g, '')
  const info = await viewportProbe(tab.id, markerId, '#202020')
  try {
    const viewportArea = callArea(area, info)
    const api = getNativeXYAPI()
    const rects: any[] = []
    for (const color of ['#202020', '#dfdfdf']) {
      await viewportProbe(tab.id, markerId, color)
      // Native captures can trail the compositor; bounded retries wait for the
      // marker itself, not an assumed paint delay.
      let found: any = null, observed: any = null
      for (let n = 0; n < 12; n++) {
        found = await findBeaconRect(api, color,
          { width: Math.floor(160 * info.dpr) - 3, height: Math.floor(48 * info.dpr) - 3 },
          { width: Math.ceil(160 * info.dpr) + 3, height: Math.ceil(48 * info.dpr) + 3 })
        observed = found
        if (found && Math.abs(found.width - 160 * info.dpr) <= 3 && Math.abs(found.height - 48 * info.dpr) <= 3) break
        found = null
        await new Promise(r => setTimeout(r, 50))
      }
      if (!found) throw new Error(`Cannot measure the browser viewport on screen. Keep the target browser visible and uncovered. Marker ${color}, expected ${160 * info.dpr}×${48 * info.dpr}, observed ${JSON.stringify(observed)}`)
      rects.push(found)
    }
    if (Math.abs(rects[0].x - rects[1].x) > 1 || Math.abs(rects[0].y - rects[1].y) > 1) throw new Error('Browser viewport moved while measuring it')
    const origin = { x: rects[1].x - info.bx * info.dpr, y: rects[1].y - info.by * info.dpr }
    const win: any = await Ext.windows.get(tab.windowId)
    return {
      scope: 'physical', area: mapCallArea(area, info, origin, info.dpr), viewportArea,
      viewport: { width: info.width, height: info.height }, pixelsPerCss: info.dpr,
      tabId: tab.id, windowId: tab.windowId,
      geometry: { sx: info.sx, sy: info.sy, width: info.width, height: info.height, dpr: info.dpr },
      window: { left: win.left, top: win.top, width: win.width, height: win.height }
    }
  } finally {
    await viewportProbe(tab.id, markerId, '', true).catch(() => {})
  }
}

export async function callViewportUnchanged (context: any): Promise<boolean> {
  const current = await viewportProbe(context.tabId)
  return current && current.visible === 'visible' && Object.keys(context.geometry).every(k => current[k] === context.geometry[k])
}
