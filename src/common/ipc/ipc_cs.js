import { csInit } from './ipc_bg_cs'

const throwNotTop = () => {
  throw new Error('You are not a top window, not allowed to initialize/use csIpc')
}

// Note: csIpc is only available to top window
const ipc = window.top === window ? csInit() : {
  ask: throwNotTop,
  send: throwNotTop,
  onAsk: throwNotTop,
  destroy: throwNotTop
}

// Note: one ipc singleton per content script
export default ipc
