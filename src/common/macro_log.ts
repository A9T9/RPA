
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

    case 'mcp':
      // lines the MCP bridge writes (Claude Code driving the extension):
      // short on purpose — "[info] [Claude bridge]" ate a third of a
      // 260px panel row before the actual text began
      return '[MCP]'

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
