import { csInit, spInit } from './ipc_bg_cs'

const throwNotTop = () => {
  throw new Error('You are not a top window, not allowed to initialize/use csIpc')
}

// browser.runtime.id in firefox extension isn't necessarily found in window.location.href 
// window.location.href  eg. "moz-extension://add2840d-0b3e-41f0-8da1-55d780cc5dd8/sidepanel.html"
const isSidepanelInFirefox = typeof window !== 'undefined' && window.location.href.match(/moz-extension:\/\/[a-z0-9-]+\/sidepanel.html/); 

let isSidepanel = false;
if (typeof window !== 'undefined' && ( 
    window.location.href.startsWith(`chrome-extension://${chrome.runtime.id}/sidepanel.html`) || 
    isSidepanelInFirefox
  )) {
    isSidepanel = true;
}

// Note: csIpc is only available to top window
const ipc = typeof window !== 'undefined' && window.top === window ? (isSidepanel ? spInit() : csInit()) : {
  ask: throwNotTop,
  send: throwNotTop,
  onAsk: throwNotTop,
  destroy: throwNotTop
}

// Note: one ipc singleton per content script
export default ipc
