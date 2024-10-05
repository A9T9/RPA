// Log factory is quite simple, just a wrapper on console.log
// so that you can use the same API, at the same, achieve following features
// 1. Hide all logs in production
// 2. Extend it to save logs in local storage / or send it back to you backend (for debug or analysis)

interface Logger {
  (...args: any[]): void,
  log: (...args: any[]) => void,
  info: (...args: any[]) => void,
  warn: (...args: any[]) => void,
  error: (...args: any[]) => void
}

export function logFactory (enabled: Boolean): Logger {
  let isEnabled = !!enabled

  const obj = ['log', 'info', 'warn', 'error'].reduce((prev : any, method : string) => {
    prev[method] = (...args : any[]) => {
      if (!isEnabled) return

      (console[method as keyof Console] as Function)(
        (new Date()).toISOString(),
        ' - ',
        ...args
      )
    }
    return prev
  }, {})

  return (<any>Object).assign(obj.log, obj, {
    enable:   () => { isEnabled = true },
    disable:  () => { isEnabled = false }
  })
}

const logger: Logger = logFactory(
  process.env.NODE_ENV !== 'production'
)

export default logger
