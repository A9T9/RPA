// Desktop captures must observe the selected window without switching tabs.
// A zoom inherits the previous capture's scope, even when scope is omitted.
export function toolNeedsWebTab (tool, args = {}) {
  if (tool === 'run_macro' || tool === 'browser_snapshot' || tool === 'get_page') return true
  if (tool !== 'screenshot' || args.scope === 'desktop') return false
  const zoom = ['x', 'y', 'width', 'height'].every(key => typeof args[key] === 'number')
  return !zoom
}
