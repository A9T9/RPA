
export const postMessage: <T>(targetWin: Window, myWin: Window, payload: any, target?: string, timeout?: number) => Promise<T>

// signed requests from other frames' content scripts
export const onMessage: (win: Window, fn: Function) => Function

// requests from the same window only (inject.js)
export const onSameWindowMessage: (win: Window, fn: Function) => Function

// content scripts: how to obtain the channel key from the background
export const setChannelKeySource: (fn: () => Promise<string>) => void

export const framePath: (win: Window) => string
