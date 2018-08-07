import Registry from './registry'
import { validateStandardName } from '../common/utils'

const keyConstants = [
  'KEY_LEFT', 'KEY_UP', 'KEY_RIGHT', 'KEY_DOWN',
  'KEY_PGUP', 'KEY_PAGE_UP', 'KEY_PGDN', 'KEY_PAGE_DOWN',
  'KEY_BKSP', 'KEY_BACKSPACE', 'KEY_DEL', 'KEY_DELETE',
  'KEY_ENTER', 'KEY_TAB'
]

const DEFAULT_KEY = 'main'
const cache = {}

const validateVariableName = (name) => {
  if (name.charAt(0) === '!') {
    name = name.substr(1)
  }

  try {
    validateStandardName(name)
  } catch (e) {
    throw new Error(`Invalid variable name '${name}'. A variable name ` + e.message)
  }

  return true
}

export default function varsFactory (name = DEFAULT_KEY, options = {}, initial = {}) {
  const opts = {
    isInvalidInternalVar: (key) => {
      return key.indexOf('!') === 0 &&
              key !== '!TIMEOUT_PAGELOAD' &&
              key !== '!TIMEOUT_WAIT' &&
              key !== '!TIMEOUT_MACRO' &&
              key !== '!TIMEOUT_DOWNLOAD' &&
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
              key !== '!CSVREADMAXROW' &&
              key !== '!CLIPBOARD' &&
              key !== '!STATUSOK' &&
              key !== '!WAITFORVISIBLE' &&
              key !== '!IMAGEX' &&
              key !== '!IMAGEY' &&
              key !== '!VISUALSEARCHAREA' &&
              key !== '!STOREDIMAGERECT' &&
              !/^!COL\d+$/i.test(key)
    },
    readonly: [
      '!LOOP', '!URL', '!MACRONAME', '!RUNTIME', '!LASTCOMMANDOK', '!CSVREADSTATUS', '!CSVREADMAXROW', '!VISUALSEARCHAREA',
      ...keyConstants
    ],
    typeCheck: {
      '!REPLAYSPEED':       (val) => ['SLOW', 'MEDIUM', 'FAST'].indexOf((val || '').toUpperCase()) !== -1,
      '!TIMEOUT_PAGELOAD':  (val) => parseInt(val, 10) >= 0,
      '!TIMEOUT_WAIT':      (val) => parseInt(val, 10) >= 0,
      '!TIMEOUT_MACRO':     (val) => parseInt(val, 10) >= 0,
      '!TIMEOUT_DOWNLOAD':  (val) => parseInt(val, 10) >= 0,
      '!CSVREADLINENUMBER': (val) => parseInt(val, 10) >= 0
    },
    normalize: (key, val) => {
      const upperKey = key.toUpperCase()
      const acceptStringTrueFalse = (val) => {
        if (val === 'true')   return true
        if (val === 'false')  return false
        return val
      }
      const num = (s) => parseFloat(s)

      switch (upperKey) {
        case '!ERRORIGNORE':
        case '!WAITFORVISIBLE':
          return acceptStringTrueFalse(val)

        case '!TIMEOUT_PAGELOAD':
        case '!TIMEOUT_WAIT':
        case '!TIMEOUT_MACRO':
        case '!TIMEOUT_DOWNLOAD':
          return num(val)

        default:
          return val
      }
    },
    ...options
  }
  let vars = initial

  const listeners     = new Registry({ process: (fn, data, eventName) => fn(data) })
  const fireOnChange  = () => listeners.fire('change', { vars: Object.assign({}, vars) })
  const self = {
    reset: (options = {}) => {
      if (options.keepGlobal) {
        const globals = Object.keys(vars).reduce((prev, key) => {
          if (/^global/i.test(key)) prev[key] = vars[key]
          return prev
        }, {})

        vars = globals
      } else {
        vars = {}
      }

      fireOnChange()
    },
    render: (str, options) => {
      const getVar = key => {
        const upperKey = (key || '').toUpperCase()

        if (upperKey in vars) {
          return vars[upperKey]
        } else {
          if (/^!/.test(upperKey)) throw new Error(`Internal variable "${upperKey}" not supported`)
          else throw new Error(`variable "${upperKey}" is not defined`)
        }
      }
      const replaceAllVars = (str, reg, getKey = args => args[1], decorate = x => x) => {
        return str.replace(reg, (...args) => {
          const variable = (getKey(args) || '').toUpperCase()
          // Note: keep as it is if it's a KEY_XXX variable, which should be handled by command runner
          if (keyConstants.indexOf(variable) !== -1)  return args[0]
          return decorate(getVar(variable))
        })
      }
      const regDollar     = new RegExp(`\\$\\{(!?\\w+)\\}`, 'gi')
      const regStoredVars = new RegExp(`storedVars\\[('|")(!?\\w+)\\1\\]`, 'gi')

      let result = replaceAllVars(str, regDollar)

      if (options && options.withHashNotation) {
        result = replaceAllVars(result, regStoredVars, args => args[2], x => JSON.stringify(x))
      }

      return result
    },
    get: (field) => {
      return vars[field.toUpperCase()]
    },
    set: (obj, isAdmin) => {
      Object.keys(obj).forEach(key => {
        const trimmedKey = key.trim()
        if (trimmedKey.length === 0)  return

        validateVariableName(trimmedKey)

        const targetKey = trimmedKey.toUpperCase()

        // Note: prevent variable with empty name
        if (targetKey.length === 0) return

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

        if (opts.typeCheck[targetKey] && !opts.typeCheck[targetKey](obj[key])) {
          throw new Error(`Value '${obj[key]}' not supported for variable "${targetKey}"`)
        }

        vars[targetKey] = opts.normalize(key, obj[key])
      })

      fireOnChange()
    },
    clear: (reg) => {
      Object.keys(vars).forEach(key => {
        if (reg.test(key)) {
          delete vars[key]
        }
      })

      fireOnChange()
    },
    isReadOnly: (variable) => {
      const str = (variable && variable.toUpperCase) ? variable.toUpperCase() : ''
      return opts.readonly.indexOf(str) !== -1
    },
    dump: () => ({...vars}),
    onChange: (fn) => {
      listeners.add('change', fn)
      return () => listeners.remove('change', fn)
    }
  }

  cache[name] = self
  return self
}

export const getVarsInstance = (name = DEFAULT_KEY) => {
  return cache[name]
}

export const createVarsFilter = ({ withUserDefined = true, withCommonInternal, withAdvancedInternal }) => {
  const checkUserDefined    = (name) => !/^!/.test(name)
  const checkCommonInternal = (name) => {
    const list = ['!url', '!clipboard', '!runtime', '!statusok', '!errorignore'].map(x => x.toUpperCase())
    return list.indexOf(name.toUpperCase()) !== -1
  }
  const checkAdvancedInternal = (name) => /^!/.test(name) && !checkCommonInternal(name)
  const orCheck = (fns) => {
    return (...args) => {
      for (let i = 0, len = fns.length; i < len; i++) {
        if (fns[i](...args))  return true
      }
      return false
    }
  }
  const list = [
    withUserDefined ? checkUserDefined : null,
    withCommonInternal ? checkCommonInternal : null,
    withAdvancedInternal ? checkAdvancedInternal : null
  ]
  .filter(x => !!x)

  return orCheck(list)
}
