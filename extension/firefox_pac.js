/* global browser */

let settings = null

browser.runtime.onMessage.addListener((data, sender, sendResponse) => {
  if (!data.cmd)  return

  switch (data.cmd) {
    case 'SET_PROXY':
      settings = data.data
      log({ settings })
      return sendResponse(true)

    case 'GET_PROXY':
      return sendResponse({ proxy: settings })

    default:
      log(`unsupported cmd: ${data.cmd}`)
      break
  }
})

function FindProxyForURL (url, host) {
  return renderProxy(settings)
}

function renderProxy (settings) {
  if (settings && settings.host && settings.port) {
    var str = `PROXY ${settings.host}:${settings.port}`
    return str
  }

  return 'DIRECT'
}

function log (data) {
  browser.runtime.sendMessage(Object.assign({
    type: 'PROXY_LOG'
  }, data))
}
