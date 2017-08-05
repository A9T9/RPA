import { csInit } from './ipc_bg_cs'

const ipc = csInit()

// Note: one ipc singleton per content script
export default ipc
