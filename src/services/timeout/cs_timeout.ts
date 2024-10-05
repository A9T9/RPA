import { Ipc } from '@/common/ipc/ipc_promise'
import log from "../../common/log"

const oldSetTimeout    = window.setTimeout
const oldClearTimeout  = window.clearTimeout
const oldSetInterval   = window.setInterval
const oldClearInterval = window.clearInterval

type AnyFunc = (...args: any[]) => any

function uid (): number {
  return Math.floor(Math.random() * 1e8)
}

export function polyfillTimeoutFunctions (csIpc: Ipc): void {
  const timeoutRecords: Record<number, boolean> = {}

  function createSetTimeoutViaBackground (identity?: number) {
    const id = identity ?? uid()

    return function setTimeoutViaBackground <Func extends AnyFunc> (fn: Func, timeout: number = 0, ...args: Parameters<Func>): number {
      timeoutRecords[id] = true

      csIpc.ask('TIMEOUT', { id, timeout }).then((identity: number): void => {
        if (!timeoutRecords[identity]) {
          return
        }

        fn(...args)
      })
      .catch((e: Error) => {
        log.error('Error in setTimeout', e.stack)
      });

      return id
    }
  }

  function clearTimeoutViaBackground (id: number): void {
    delete timeoutRecords[id]
  }

  // Call both native setTimeout and setTimeoutViaBackground
  // and take the first one resolved
  function smartSetTimeout <Func extends AnyFunc> (fn: Func, timeout: number = 0, ...args: Parameters<Func>): number {
    let done = false
    const wrappedFn = (...args: Parameters<Func>): ReturnType<Func> | null => {
      if (done) {
        return null
      }

      done = true
      return fn(...args)
    }

    const id = oldSetTimeout(wrappedFn, timeout, ...args)
    createSetTimeoutViaBackground(id)(wrappedFn, timeout, ...args)

    return id
  }

  const intervalRecords: Record<number, boolean> = {}

  function smartSetInterval <Func extends AnyFunc> (fn: Func, timeout: number = 0, ...args: Parameters<Func>): number {
    const id = uid()
    const wrappedFn = (): void => {
      if (!intervalRecords[id]) {
        return
      }

      smartSetTimeout(wrappedFn, timeout)
      fn(...args)
    }

    intervalRecords[id] = true
    smartSetTimeout(wrappedFn, timeout)

    return id
  }

  function clearIntervalViaBackground (id: number): void {
    delete intervalRecords[id]
  }

  const runBoth = (f1: Function, f2: Function): Function => {
    return (...args: any[]): any => {
      f1(...args)
      f2(...args)
    }
  }

  (window as any).setTimeout    = smartSetTimeout;
  (window as any).clearTimeout  = runBoth(clearTimeoutViaBackground, oldClearTimeout);
  (window as any).setInterval   = smartSetInterval;
  (window as any).clearInterval = clearIntervalViaBackground;
}
