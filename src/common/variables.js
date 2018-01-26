
export default function varsFactory (options = {}, initial = {}) {
  const opts = {
    isInvalidInternalVar: (key) => {
      return key.indexOf('!') === 0 &&
              key !== '!TIMEOUT_PAGELOAD' &&
              key !== '!TIMEOUT_WAIT' &&
              key !== '!TIMEOUT_MACRO' &&
              key !== '!REPLAYSPEED' &&
              key !== '!LOOP' &&
              key !== '!URL' &&
              key !== '!MACRONAME' &&
              key !== '!RUNTIME' &&
              key !== '!CSVLINE' &&
              key !== '!CSVLINE' &&
              key !== '!LASTCOMMANDOK' &&
              key !== '!ERRORIGNORE' &&
              key !== '!CSVREADLINENUMBER' &&
              key !== '!CSVREADSTATUS' &&
              key !== '!CLIPBOARD' &&
              !/^!COL\d+$/i.test(key)
    },
    readonly: [
      '!LOOP', '!URL', '!MACRONAME', '!RUNTIME', '!LASTCOMMANDOK', '!CSVREADSTATUS',
      'KEY_LEFT', 'KEY_UP', 'KEY_RIGHT', 'KEY_DOWN',
      'KEY_PGUP', 'KEY_PAGE_UP', 'KEY_PGDN', 'KEY_PAGE_DOWN',
      'KEY_BKSP', 'KEY_BACKSPACE', 'KEY_DEL', 'KEY_DELETE',
      'KEY_ENTER', 'KEY_TAB'
    ],
    ...options
  }
  let vars = initial

  const self = {
    reset: () => {
      vars = {}
    },
    render: (str, options) => {
      let result = Object.keys(vars).reduce((prev, v) => {
        const reg = new RegExp(`\\$\\{${v}\\}`, 'gi')
        return prev.replace(reg, vars[v])
      }, str)

      if (options && options.withHashNotation) {
        result = Object.keys(vars).reduce((prev, v) => {
          const reg = new RegExp(`storedVars\\[('|")${v}\\1\\]`, 'gi')
          return prev.replace(reg, JSON.stringify(vars[v]))
        }, result)
      }

      return result
    },
    get: (field) => {
      return vars[field.toUpperCase()]
    },
    set: (obj, isAdmin) => {
      Object.keys(obj).forEach(key => {
        const targetKey = key.toUpperCase()

        // Note: special treatment for !CSVLINE
        if (/^!CSVLINE$/i.test(targetKey)) {
          let csvLine = self.get('!CSVLINE')

          if (csvLine === undefined) {
            csvLine = []
          } else if (!Array.isArray(csvLine)) {
            csvLine = [csvLine]
          }

          csvLine.push(obj[key])
          vars['!CSVLINE'] = csvLine

          return
        }

        if (!isAdmin && opts.readonly.indexOf(targetKey) !== -1) {
          throw new Error(`Cannot write to readony variable '${key}'`)
        }

        if (opts.isInvalidInternalVar(targetKey)) {
          throw new Error(`Not allowed to write to '${key}'`)
        }

        vars[targetKey] = obj[key]
      })
    },
    clear: (reg) => {
      Object.keys(vars).forEach(key => {
        if (reg.test(key)) {
          delete vars[key]
        }
      })
    },
    dump: () => ({...vars})
  }

  return self
}
