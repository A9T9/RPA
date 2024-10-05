
type LogItem = {
  type:       string;
  text:       string;
  options:    Record<string, any>;
  id:         string;
  createTime: Date;
}

export const renderLogType = (log: LogItem): string => {
  switch (log.type) {
    case 'reflect':
      return '[info]'

    case 'error':
      return (log.options && log.options.ignored) ? '[error][ignored]' : '[error]'

    default:
      return `[${log.type}]`
  }
}

export const renderLog = (log: LogItem, withTimestamp: boolean = false): string => {
  const prefix = withTimestamp ? (log.createTime.toISOString() + ' - ') : ''
  return prefix + renderLogType(log) + ' ' + log.text
}
