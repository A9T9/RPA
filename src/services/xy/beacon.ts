// Locate a solid BEACON rectangle the page painted in an exotic color — the
// Wayland origin probe (uiv.window.rect, XClick calibration) and the Linux
// self-click focus assist all draw one and ask the host where it is.
//
// find_rectangle is an EXACT scan (±5 per channel): right for a color nothing
// else on screen uses, and enough as long as the browser paints the CSS color
// it was given. It does not always. Measured live 2026-09-05 (Chrome 152 on
// GNOME Wayland, mid-session, nothing reconfigured): the window became
// color-managed and #fe3a9c came out as #fb5ead — in the TAB capture and on
// the screen alike, while getComputedStyle still said rgb(254,58,156). Every
// beacon read then failed with "not visible on screen" although it was
// plainly there, and every desktop demo behind it died on that one guard.
// The same happens by design on a wide-gamut display (a P3 screen shows an
// sRGB pink as a different triple). So a miss retries with the tolerant
// region scan — ±48 per channel is still nowhere near any real page color —
// and takes the LARGEST region of at least beacon size, which is what an
// exotic solid block of that hue can only be.
export type BeaconRect = { x: number, y: number, width: number, height: number, tolerant?: boolean }

export async function findBeaconRect (api: any, color: string, minSize?: { width: number, height: number }, maxSize?: { width: number, height: number }): Promise<BeaconRect> {
  const exact: BeaconRect = await api.findRectangle({ color })
  const minWidth = (minSize && minSize.width) || 40
  const minHeight = (minSize && minSize.height) || 12
  const fits = (r: BeaconRect) => r && r.width >= minWidth && r.height >= minHeight && (!maxSize || (r.width <= maxSize.width && r.height <= maxSize.height))
  if (fits(exact)) return exact
  try {
    const res = await api.findColorRegions({
      color,
      tolerance: 48,
      minWidth,
      minHeight
    })
    const regions: BeaconRect[] = ((res && res.regions) || []).filter(fits)
    if (!regions.length) return exact
    const best = regions.reduce((a, r) => (r.width * r.height > a.width * a.height ? r : a))
    return { x: best.x, y: best.y, width: best.width, height: best.height, tolerant: true }
  } catch (e) {
    return exact   // an old host without find_color_regions: the exact answer stands
  }
}
