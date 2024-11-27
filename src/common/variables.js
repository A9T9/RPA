import { Registry } from './registry'
import { validateStandardName, and } from '../common/utils'
import { isValidOCRLanguage } from '../services/ocr/languages'
import { id } from './ts_utils'
import { ComputerVisionType } from './cv_utils'

const standardKeyConstants = [
  'KEY_LEFT', 'KEY_UP', 'KEY_RIGHT', 'KEY_DOWN',
  'KEY_PGUP', 'KEY_PAGE_UP', 'KEY_PGDN', 'KEY_PAGE_DOWN',
  'KEY_BKSP', 'KEY_BACKSPACE', 'KEY_DEL', 'KEY_DELETE',
  'KEY_ENTER', 'KEY_TAB', 'KEY_ESC', 'KEY_SPACE', 'KEY_HOME', 'KEY_END'
]

const metaKeyConstants = [
  'KEY_CTRL', 'KEY_ALT', 'KEY_SHIFT', 'KEY_WIN', 'KEY_CMD', 'KEY_META'
]

const fnKeyConstants = [
  'KEY_F1', 'KEY_F2', 'KEY_F3', 'KEY_F4', 'KEY_F5', 'KEY_F6', 'KEY_F7',
  'KEY_F8', 'KEY_F9', 'KEY_F10', 'KEY_F11', 'KEY_F12', 'KEY_F13', 'KEY_F14', 'KEY_F15'
]

const numericKeyConstants = [
  'KEY_Num0', 'KEY_Num1', 'KEY_Num2', 'KEY_Num3', 'KEY_Num4', 'KEY_Num5', 'KEY_Num6', 'KEY_Num7', 'KEY_Num8', 'KEY_Num9'
]

const numberKeyConstants = [
  'KEY_0', 'KEY_1', 'KEY_2', 'KEY_3', 'KEY_4', 'KEY_5', 'KEY_6', 'KEY_7', 'KEY_8', 'KEY_9'
]

const letterKeyConstants = [
  'KEY_A', 'KEY_B', 'KEY_C', 'KEY_D', 'KEY_E', 'KEY_F', 'KEY_G', 'KEY_H',
  'KEY_I', 'KEY_J', 'KEY_K', 'KEY_L', 'KEY_M', 'KEY_N', 'KEY_O', 'KEY_P',
  'KEY_Q', 'KEY_R', 'KEY_S', 'KEY_T', 'KEY_U', 'KEY_V', 'KEY_W', 'KEY_X', 'KEY_Y', 'KEY_Z'
]

const keyConstants = [
  ...standardKeyConstants,
  ...metaKeyConstants,
  ...fnKeyConstants,
  ...numberKeyConstants,
  ...numericKeyConstants,
  ...letterKeyConstants
]
.map(key => key.toUpperCase())

const isValidKeyConstant = (pattern) => {
  const str = pattern && pattern.toUpperCase()

  if (keyConstants.indexOf(str) !== -1) return true
  if (/^KEY_\w+(\+KEY_\w+)*$/.test(str)) {
    const keys = str.split('+')
    return and(...keys.map(s => keyConstants.indexOf(s) !== -1))
  }
  return false
}

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

const regDollarV2   = /\$\{((!?\w+)((\.\w+|\[(\d+|\$\{!?\w+\})\])*))\}/gi
const regStoredVars = /storedVars\[('|")((!?\w+)((\.\w+|\[(\d+|\$\{!?\w+\})\])*))\1\]/gi

function substrToList (substr) {
  const regSubstr = /\.(\w+)|\[(\d+|\$\{!?\w+\})\]/gi
  const normalizedStr = substr && substr.trim()

  if (!normalizedStr || normalizedStr.length === 0) {
    return []
  }

  const result = []
  let lastEndIndex = -1
  let m

  // eslint-disable-next-line no-cond-assign
  while (m = regSubstr.exec(substr)) {
    if (!m || m.index !== lastEndIndex + 1) {
      throw new Error('Invalid variable expression')
    }

    result.push(m[1] || m[2])
    lastEndIndex = lastEndIndex + m[0].length
  }

  if (lastEndIndex !== normalizedStr.length - 1) {
    throw new Error('Invalid variable expression ending')
  }

  return result
}

function listToSubstr (list) {
  return list.map(str => {
    return /^\d+$/.test(str) ? `[${str}]` : `.${str}`
  })
  .join('')
}

export default function varsFactory (name = DEFAULT_KEY, options = {}, initial = {}) {
  const isBoolean = (val) => ['TRUE', 'FALSE'].indexOf((val + '').toUpperCase()) !== -1
  const opts = {
    isInvalidInternalVar: (key) => {
      return key.indexOf('!') === 0 &&
              key !== '!TIMEOUT_PAGELOAD' &&
              key !== '!TIMEOUT_WAIT' &&
              key !== '!TIMEOUT_MACRO' &&
              key !== '!TIMEOUT_DOWNLOAD' &&
              key !== '!TIMEOUT_DOWNLOAD_START' &&
              key !== '!REPLAYSPEED' &&
              key !== '!LOOP' &&
              key !== '!TESTSUITE_LOOP' &&
              key !== '!URL' &&
              key !== '!CURRENT_TAB_NUMBER' &&
              key !== '!CURRENT_TAB_NUMBER_RELATIVE' &&
              key !== '!CURRENT_TAB_NUMBER_RELATIVE_INDEX' &&
              key !== '!CURRENT_TAB_NUMBER_RELATIVE_ID' &&
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
              key !== '!IMAGEWIDTH' &&
              key !== '!IMAGEHEIGHT' &&
              key !== '!VISUALSEARCHAREA' &&
              key !== '!STOREDIMAGERECT' &&
              key !== '!STRINGESCAPE' &&
              key !== '!CMD_VAR1' &&
              key !== '!CMD_VAR2' &&
              key !== '!CMD_VAR3' &&
              key !== '!OCRLANGUAGE' &&
              key !== '!OCRENGINE' &&
              key !== '!OCRSCALE' &&
              key !== '!OCRTABLEEXTRACTION' &&
              key !== '!OCRX' &&
              key !== '!OCRY' &&
              key !== '!OCRHEIGHT' &&
              key !== '!OCRWIDTH' &&
              key !== '!OCR_LEFT_X' &&
              key !== '!OCR_RIGHT_X' &&
              key !== '!AI1' &&
              key !== '!AI2' &&
              key !== '!AI3' &&
              key !== '!AI4' &&
              key !== '!BROWSER' &&
              key !== '!OS' &&
              key !== '!TIMES' &&
              key !== '!FOREACH' &&
              key !== '!CVSCOPE' &&
              key !== '!XRUN_EXITCODE' &&
              key !== '!PROXY_EXEC_COUNT' &&
              key !== '!GLOBAL_TESTSUITE_STOP_ON_ERROR' &&
              key !== '!LAST_DOWNLOADED_FILE_NAME' &&
              !/^!COL\d+$/i.test(key)
    },
    readonly: [
      '!LOOP', 'TESTSUITE_LOOP', '!URL','!CURRENT_TAB_NUMBER','!CURRENT_TAB_NUMBER_RELATIVE','!CURRENT_TAB_NUMBER_RELATIVE_ID','!CURRENT_TAB_NUMBER_RELATIVE_INDEX','!MACRONAME', '!RUNTIME', '!LASTCOMMANDOK',
      '!CSVREADSTATUS', '!CSVREADMAXROW', '!VISUALSEARCHAREA',
      '!BROWSER', '!OS', '!CVSCOPE', '!XRUN_EXITCODE', '!PROXY_EXEC_COUNT',
      '!TIMES', '!FOREACH', '!LAST_DOWNLOADED_FILE_NAME',
      ...keyConstants
    ],
    typeCheck: {
      '!REPLAYSPEED':       (val) => ['SLOWV1', 'SLOW', 'MEDIUMV1', 'MEDIUM', 'FASTV1', 'FAST', 'NODISPLAYV1', 'NODISPLAY'].indexOf((val || '').toUpperCase()) !== -1,
      '!TIMEOUT_PAGELOAD':  (val) => parseInt(val, 10) >= 0,
      '!TIMEOUT_WAIT':      (val) => parseInt(val, 10) >= 0,
      '!TIMEOUT_MACRO':     (val) => parseInt(val, 10) >= 0,
      '!TIMEOUT_DOWNLOAD':  (val) => parseInt(val, 10) >= 0,
      '!TIMEOUT_DOWNLOAD_START': (val) => parseInt(val, 10) >= 0,
      '!CSVREADLINENUMBER': (val) => parseInt(val, 10) >= 0,
      '!OCRLANGUAGE':       (val,store) => isValidOCRLanguage(val,window['store']),
      '!OCRENGINE':         (val) => [1, 2, 98, 99].indexOf(parseInt(val, 10)) !== -1,
      '!OCRSCALE':          isBoolean,
      '!OCRX':              (val) => parseInt(val, 10) >= 0,
      '!OCRY':              (val) => parseInt(val, 10) >= 0,
      '!OCRHEIGHT':              (val) => parseInt(val, 10) >= 0,
      '!OCRWIDTH':              (val) => parseInt(val, 10) >= 0,
      '!OCR_LEFT_X':        (val) => parseInt(val, 10) >= 0,
      '!OCR_RIGHT_X':        (val) => parseInt(val, 10) >= 0,
      '!AI1':               (val) => parseInt(val, 10) >= 0,
      '!AI2':               (val) => parseInt(val, 10) >= 0,
      '!AI3':               (val) => parseInt(val, 10) >= 0,
      '!AI4':               (val) => parseInt(val, 10) >= 0,
      '!ERRORIGNORE':       isBoolean,
      '!STATUSOK':          isBoolean,
      '!WAITFORVISIBLE':    isBoolean,
      '!STRINGESCAPE':      isBoolean,
      '!GLOBAL_TESTSUITE_STOP_ON_ERROR': isBoolean,
      '!CVSCOPE':           (val) => [ComputerVisionType.Browser, ComputerVisionType.Desktop, ComputerVisionType.DesktopScreenCapture].indexOf(val) !== -1
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
        case '!STATUSOK':
        case '!WAITFORVISIBLE':
        case '!STRINGESCAPE':
        case '!GLOBAL_TESTSUITE_STOP_ON_ERROR':
        case '!OCRSCALE':
        case '!OCRTABLEEXTRACTION':
          return acceptStringTrueFalse(val)

        case '!TIMEOUT_PAGELOAD':
        case '!TIMEOUT_WAIT':
        case '!TIMEOUT_MACRO':
        case '!TIMEOUT_DOWNLOAD':
        case '!TIMEOUT_DOWNLOAD_START':
        case '!OCRENGINE':
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
          if (/^!?global/i.test(key) || /^!TESTSUITE_LOOP$/i.test(key)) {
            prev[key] = vars[key]
          }
          return prev
        }, {})

        vars = globals
      } else {
        vars = {}
      }

      fireOnChange()
    },
    render: (str, options) => {
      const [reg, mainIndex, subIndex] = options && options.withHashNotation
                                                    ? [regStoredVars, 3, 4]
                                                    : [regDollarV2, 2, 3]
      const decorate = options && options.shouldStringify
                          ? (x) => JSON.stringify(x)
                          : id

      return self.replaceAllVars({
        str,
        reg,
        decorate,
        getVarName: (args) => args[mainIndex],
        getSubstring: (args) => args[subIndex]
      })
    },
    replaceAllVars: (params) => {
      const {
        str,
        reg,
        getVarName = (args) => args[1],
        getSubstring = (args) => args[2],
        decorate = (val) => val
      } = params

      return str.replace(reg, (...args) => {
        const variable = (getVarName(args) || '').toUpperCase()
        const subs = substrToList(getSubstring(args)).map(key => self.render(key))

        // Note: keep as it is if it's a KEY_XXX variable, which should be handled by command runner
        if (isValidKeyConstant(variable)) {
          return args[0]
        }

        console.log('variable, subs, args >>>', variable, subs, args)

        const root = self.getVarForRender(variable)
        const rawValue = subs.reduce((prev, key, i) => {
          if (prev === null || prev === undefined) {
            throw new Error(`${variable}${listToSubstr(subs.slice(0, i))} is ${prev}`)
          }
          return prev[key]
        }, root)

        return decorate(rawValue, args)
      })
    },
    getVarForRender: (key) => {
      const upperKey = (key || '').toUpperCase()

      console.log('upperKey:>> ', upperKey)
      console.log('vars:>> ', vars)

      if (upperKey in vars) {
        return vars[upperKey]
      } else {
        if (/^!cmd_var(1|2|3)$/i.test(upperKey))  return 'NOT_SET'

        if (/^!/.test(upperKey)) {
          throw new Error(`Internal variable "${upperKey}" not supported`)
        } else {
          throw new Error(`variable "${upperKey}" is not defined`)
        }
      }
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
          throw new Error(`Cannot write to readonly variable '${key}'`)
        }

        if (opts.isInvalidInternalVar(targetKey)) {
          throw new Error(`Not allowed to write to '${key}'`)
        }

        if (opts.typeCheck[targetKey] && !opts.typeCheck[targetKey](obj[key])) {
          throw new Error(`Value '${obj[key]}' is not supported for variable "${targetKey}"`)
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
