// Macro names cross browser storage, Windows files and JSON/MCP boundaries.
// Display and lookup must use the same separators on every platform.
export function macroDisplayPath (name) {
  return String(name || '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.json$/i, '')
}
