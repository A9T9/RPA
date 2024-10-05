
export const postMessage: <T>(targetWin: Window, myWin: Window, payload: any, target?: string, timeout?: number) => Promise<T>

export const onMessage: (win: Window, fn: Function) => Function
