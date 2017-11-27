
export const logFactory = (enabled) => {
  let isEnabled = !!enabled

  const obj = ['log', 'info', 'warn', 'error'].reduce((prev, method) => {
    prev[method] = (...args) => {
      if (!isEnabled) return
      console[method]((new Date()).toISOString(), ' - ', ...args)
    }
    return prev
  }, {})

  return Object.assign(obj.log, obj, {
    enable:   () => { isEnabled = true },
    disable:  () => { isEnabled = false }
  })
}

export default logFactory(
  process.env.NODE_ENV !== 'production'
)
