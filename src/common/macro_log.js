
export const renderLogType = (log) => {
  switch (log.type) {
    case 'reflect':
      return '[info]'

    case 'error':
      return (log.options && log.options.ignored) ? '[error][ignored]' : '[error]'

    default:
      return `[${log.type}]`
  }
}

export const renderLog = (log) => {
  return renderLogType(log) + ' ' + log.text
}
