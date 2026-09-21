// Dev/test browser detection (user decision 2026-08-16): the MCP pairing
// token is waived in browsers used for development — 'development'
// installType means an unpacked/temporarily-loaded extension (Chrome for
// Testing rigs, web-ext, chrome://extensions load-unpacked), and a Firefox
// version with a 'b' suffix is Developer Edition / Beta. Regular store
// installs in end-user browsers keep requiring the token. Used by the
// bridge client (hello flag), the settings UI (explains the waiver) and
// bg.js's reopen-after-reload probe.
//
// Lives in its own module WITHOUT imports on purpose: bg.js (the MV3 service
// worker) needs it, and importing mcp_bridge/index.ts there would pull the
// whole panel bundle (antd, chat hook, tools) into the worker.
export function isDevTestBrowser (): Promise<boolean> {
  const byInstallType = new Promise<boolean>(resolve => {
    try {
      chrome.management.getSelf((info: any) => {
        resolve(!!(info && info.installType === 'development'))
      })
    } catch (e) { resolve(false) }
  })
  const byFirefoxDevBuild = new Promise<boolean>(resolve => {
    try {
      const rt: any = chrome.runtime as any
      if (typeof rt.getBrowserInfo !== 'function') return resolve(false) // not Firefox
      // On Firefox the STORE build carries the fixed id kantu@a9t9.com; any
      // other id is a developer build (the dist_ff gecko id, a temporary
      // add-on, a policy-installed dev xpi). Channel sniffing is not
      // reliable — Developer Edition's application.ini reports a plain
      // version — but the id is deterministic.
      resolve(chrome.runtime.id !== 'kantu@a9t9.com')
    } catch (e) { resolve(false) }
  })
  return Promise.all([byInstallType, byFirefoxDevBuild]).then(([a, b]) => a || b)
}
