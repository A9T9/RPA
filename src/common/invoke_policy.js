// Page payloads (including `from`) are untrusted. Only the IPC sender URL
// determines the origin; a DOM-event token would be readable by the page.
export function isInvokeOriginAllowed (url, entries = []) {
  try {
    const source = new URL(url)
    if (!/^https?:$/.test(source.protocol)) return false
    return entries.some(entry => {
      try { return new URL(entry).origin === source.origin } catch (_) { return false }
    })
  } catch (_) { return false }
}

export function migrateInvokeConfig (config = {}) {
  return config.websiteInvokePolicyVersion === 1 ? config : {
    ...config, allowRunFromHttpSchema: false, websiteInvokePolicyVersion: 1
  }
}

export function pageInvokePolicy (config, url, from) {
  if (from !== 'html' && from !== 'bookmark') throw new Error('E212: unknown source not allowed')
  if (from === 'bookmark' && !config.allowRunFromBookmark) {
    throw new Error('Error #103: Enable bookmark macro runs in Ui.Vision settings first')
  }
  const source = new URL(url)
  if (source.protocol === 'file:') {
    if (!config.allowRunFromFileSchema) throw new Error('Error #103: Enable local file macro runs in Ui.Vision settings first')
    return { confirm: false, commandVars: true }
  }
  if (!/^https?:$/.test(source.protocol)) throw new Error('E212: unsupported macro source')
  const enabled = config.websiteInvokePolicyVersion === 1 && config.allowRunFromHttpSchema
  if (!enabled && from !== 'bookmark') throw new Error('Error #104: Enable website macro runs in Ui.Vision settings first')
  const trusted = enabled && isInvokeOriginAllowed(url, config.websiteWhiteList)
  // With HTTP disabled even a whitelisted page claiming to be a bookmark
  // needs a fresh confirmation. The claim grants no unattended privilege.
  return { confirm: !trusted, commandVars: !!trusted }
}

export function pageInvokeOptions (options = {}, commandVars) {
  return Object.fromEntries(Object.entries(options).filter(([key]) =>
    commandVars || !/^cmd_var\d+$/i.test(key)))
}
