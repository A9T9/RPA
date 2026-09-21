import { Registry } from './registry'
import { validateStandardName, and } from '../common/utils'
import { isValidOCRLanguage } from '../services/ocr/languages'
import { id } from './ts_utils'
import { ComputerVisionType } from './cv_utils'

const standardKeyConstants = [
  'KEY_LEFT', 'KEY_UP', 'KEY_RIGHT', 'KEY_DOWN',
  // KEY_ARROW_* aliases: the names the AI keeps writing (OPEN-ISSUES 35.7)
  'KEY_ARROW_LEFT', 'KEY_ARROW_UP', 'KEY_ARROW_RIGHT', 'KEY_ARROW_DOWN',
  'KEY_PGUP', 'KEY_PAGE_UP', 'KEY_PGDN', 'KEY_PAGE_DOWN',
  'KEY_BKSP', 'KEY_BACKSPACE', 'KEY_DEL', 'KEY_DELETE',
  'KEY_ENTER', 'KEY_TAB', 'KEY_ESC', 'KEY_SPACE', 'KEY_HOME', 'KEY_END',
  // punctuation keys — Chrome's zoom (Ctrl+'-', Ctrl+'+'/'=') had no spelling
  // at all (OPEN-ISSUES 24.5); the host knows these names from 2.0.15
  'KEY_MINUS', 'KEY_PLUS', 'KEY_EQUALS', 'KEY_EQUAL', 'KEY_COMMA', 'KEY_PERIOD', 'KEY_SEMICOLON', 'KEY_SLASH',
  'KEY_NUMPAD_ADD', 'KEY_NUMPAD_SUBTRACT', 'KEY_NUM_ADD', 'KEY_NUM_SUBTRACT'
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
  // a combo: KEY_ names joined by '+'; the LAST member may also be one
  // literal printable character — ${KEY_CTRL+-}, ${KEY_CTRL+=}, even
  // ${KEY_CTRL++} — so no name is needed for a key with a face (24.5)
  const m = /^(KEY_\w+(?:\+KEY_\w+)*)(\+[^\s])?$/i.exec(String(pattern || ''))
  if (m) {
    const keys = m[1].toUpperCase().split('+')
    return and(...keys.map(s => keyConstants.indexOf(s) !== -1))
  }
  return false
}

const DEFAULT_KEY = 'main'
const cache = {}

// Variables on their way out, plus table-macro-only variables. Like
// DEPRECATED_COMMANDS in common/command.ts, deprecation is about new
// authoring — table macros that already use them keep working unchanged.
// `jsError` is set when the variable cannot work in a JS script at all:
// reading (or writing) it there fails with this message instead of handing
// back a plausible-looking value that is silently meaningless. `pattern`
// matches a family of names (!COL1, !COL2, …) where `name` is exact.
export const DEPRECATED_VARIABLES = [
  {
    name: '!URL',
    note: 'table macros only; in JS read the page itself with eval("return location.href")',
    jsError:
      "'!URL' is a table-macro variable and cannot be trusted in a JS script: it is only refreshed by commands that go through the classic player, " +
      'so after uiv.page.click(match), uiv.desktop.* or an OCR call it still holds the PREVIOUS page — and even on the paths that do refresh it, ' +
      'the URL is captured before the click\'s navigation finishes, leaving it one command behind. ' +
      'Read the page instead: uiv.evaluate(\'return location.href\'). ' +
      'On a page that cannot run scripts (chrome://, the PDF viewer, an error page) use uiv.tabs.list() — every entry carries its url.'
  },
  {
    name: '!CURRENT_TAB_NUMBER',
    note: 'table macros only; in JS every uiv.tabs.* call returns the position, and uiv.tabs.list() marks the script tab with current: true',
    jsError:
      "'!CURRENT_TAB_NUMBER' is a table-macro variable and cannot be trusted in a JS script: only classic-player commands refresh it, " +
      'so next to uiv.tabs.select/open/close it silently holds the OLD position. The tabs API returns the position directly: ' +
      'every uiv.tabs.* call returns {index, title, url, active, current}, and uiv.tabs.list() marks the tab your commands act on with current: true — ' +
      'var tab = uiv.tabs.list().find(function (t) { return t.current; }). Indexes are 1-based left to right, what the tab bar shows (this variable was 0-based).'
  },
  {
    name: '!CURRENT_TAB_NUMBER_RELATIVE',
    note: 'deprecated — table macros only; in JS compute it from uiv.tabs.list()',
    jsError:
      "'!CURRENT_TAB_NUMBER_RELATIVE' is deprecated and cannot work in a JS script: every classic-bridge uiv call is its own macro run and re-baselines it, so any value read here is meaningless. " +
      'Compute it instead — capture the start position once and subtract: ' +
      'var tabIndex = function () { return uiv.tabs.list().find(function (t) { return t.current; }).index; }; var startTab = tabIndex(); … tabIndex() - startTab'
  },
  {
    name: '!CURRENT_TAB_NUMBER_RELATIVE_INDEX',
    note: 'deprecated — internal player bookkeeping for the relative tab baseline',
    jsError:
      "'!CURRENT_TAB_NUMBER_RELATIVE_INDEX' is deprecated internal player bookkeeping and is re-set before every uiv call. " +
      'uiv.tabs.list() shows the live positions — the entry with current: true is the tab your commands act on.'
  },
  {
    name: '!CURRENT_TAB_NUMBER_RELATIVE_ID',
    note: 'deprecated — internal player bookkeeping for the relative tab baseline',
    jsError:
      "'!CURRENT_TAB_NUMBER_RELATIVE_ID' is deprecated internal player bookkeeping and is re-set before every uiv call. " +
      'uiv.tabs.list() shows the live positions — the entry with current: true is the tab your commands act on.'
  },
  {
    name: '!COL1',
    pattern: /^!COL\d+$/,
    note: 'table macros only; in JS uiv.csv.read(file) returns all rows as a 2D array',
    jsError:
      "'!COL1', '!COL2', … are how the classic csvRead command hands the current row to the NEXT table command — a script does not need that channel: " +
      "uiv.csv.read('file.csv') returns ALL rows as a real 2D array. var rows = uiv.csv.read('data.csv'); rows[0][0] is what !COL1 held on row 1 — " +
      'loop with rows.forEach(function (row, i) { … }).'
  },
  {
    name: '!CSVREADSTATUS',
    pattern: /^!CSVREAD(STATUS|MAXROW|LINENUMBER)$/,
    note: 'table macros only; csvRead bookkeeping — in JS uiv.csv.read(file) makes it unnecessary',
    jsError:
      "'!CSVREADSTATUS', '!CSVREADMAXROW' and '!CSVREADLINENUMBER' are row-by-row bookkeeping for the classic csvRead command, which is not available in a JS script. " +
      "uiv.csv.read('file.csv') returns all rows at once: rows.length replaces !CSVREADMAXROW, the loop index replaces !CSVREADLINENUMBER, " +
      'and a missing file throws instead of setting !CSVREADSTATUS.'
  },
  {
    name: '!CSVLINE',
    note: 'table macros only; a hidden one-cell-per-write accumulator — in JS a row is just an array',
    jsError:
      "'!csvLine' is a hidden accumulator: each write appends ONE CELL to a row that only exists until csvSave flushes it, and nothing can read it back. " +
      "In a script a row is just an array — build it and write it with uiv.csv.append('file.csv', [a, b, c])."
  },
  {
    name: '!TIMES',
    pattern: /^!(TIMES|FOREACH)$/,
    note: 'table macros only; loop counters of the times/forEach commands — a JS loop has its own',
    jsError:
      "'!TIMES' and '!FOREACH' are the loop counters of the classic times/forEach commands, and those block commands cannot run in a JS script. " +
      'A JS loop carries its own counter: for (var i = 1; i <= n; i++) { … } or rows.forEach(function (row, i) { … }).'
  },
  {
    name: '!IMAGEX',
    pattern: /^!IMAGE(X|Y|WIDTH|HEIGHT)$/,
    note: 'table macros only; in JS the visual finder returns the match',
    jsError:
      "'!IMAGEX', '!IMAGEY', '!IMAGEWIDTH' and '!IMAGEHEIGHT' are how a table macro reads its last visual match — a JS finder RETURNS the match: " +
      "var m = uiv.findImage('button.png'); m.x / m.y is the click point, m.rect.width / m.rect.height the size. " +
      'For a fixed offset use uiv.offset(m, dx, dy) — the JS form of the *Relative targets — instead of doing the arithmetic yourself.'
  },
  {
    name: '!OCRX',
    pattern: /^!(OCR(X|Y|WIDTH|HEIGHT)|OCR_LEFT_X|OCR_RIGHT_X)$/,
    note: 'table macros only; in JS uiv.ocr.findText returns the match',
    jsError:
      "'!OCRX', '!OCRY', '!OCRWIDTH' and '!OCRHEIGHT' are how a table macro reads its last OCR match — uiv.ocr.findText(text) RETURNS the match: " +
      'm.x / m.y is the click point, m.rect the box. For a fixed offset use uiv.offset(m, dx, dy) — the JS form of the *TextRelative targets ' +
      "(desktop scope composes the same way: uiv.desktop.mouse.click(uiv.offset(uiv.ocr.findText('mc', {scope: 'desktop'}), 8, -14)))."
  },
  {
    name: '!AI1',
    pattern: /^!AI[1-4]$/,
    note: 'table macros only; uiv.ai.find(question) returns the match',
    jsError:
      "'!AI1'–'!AI4' are how the aiScreenXY command hands coordinates to the NEXT table command — a script does not need that channel: " +
      "uiv.ai.find(question) RETURNS the match: var p = uiv.ai.find('the search icon'); uiv.browser.click(p). " +
      'The variables are overwritten by the next uiv call, so reading them only ever worked by accident of ordering.'
  },
  {
    name: '!VISUALSEARCHAREA',
    pattern: /^!(VISUALSEARCHAREA|STOREDIMAGERECT)$/,
    note: 'table macros only; visionLimitSearchArea/storeImage bookkeeping — in JS pass {area: …} per call',
    jsError:
      "'!VISUALSEARCHAREA' and '!STOREDIMAGERECT' are bookkeeping for visionLimitSearchArea, which is not available in a JS script (a setting on line 12 " +
      'must not silently change what "find" means on line 40). Pass the region to the call itself: ' +
      "uiv.findImage('handle.png', {area: match | {x, y, width, height}}), uiv.ocr.findText(text, {area: …}) or uiv.ocr.read({area: …}) — " +
      'and every finder match carries its own rectangle as match.rect.'
  }
]

export const getDeprecatedVariable = (name) => {
  const key = ((name || '') + '').trim().toUpperCase()
  return DEPRECATED_VARIABLES.find(item => (
    item.pattern ? item.pattern.test(key) : item.name === key
  )) || null
}

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
              key !== '!CAPTURE_HIDE_GUI' &&
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
      '!OCRENGINE':         (val) => [1, 2, 3, 4, 5, 6, 7, 8, 90, 98, 99].indexOf(parseInt(val, 10)) !== -1,
      '!OCRSCALE':          isBoolean,
      // Coordinate variables accept any finite integer: on a multi-monitor
      // mac, a display arranged left of (or above) the primary has
      // legitimately NEGATIVE global coordinates. Sizes stay non-negative.
      '!OCRX':              (val) => Number.isFinite(parseInt(val, 10)),
      '!OCRY':              (val) => Number.isFinite(parseInt(val, 10)),
      '!OCRHEIGHT':              (val) => parseInt(val, 10) >= 0,
      '!OCRWIDTH':              (val) => parseInt(val, 10) >= 0,
      '!OCR_LEFT_X':        (val) => Number.isFinite(parseInt(val, 10)),
      '!OCR_RIGHT_X':        (val) => Number.isFinite(parseInt(val, 10)),
      '!AI1':               (val) => Number.isFinite(parseInt(val, 10)),
      '!AI2':               (val) => Number.isFinite(parseInt(val, 10)),
      '!AI3':               (val) => Number.isFinite(parseInt(val, 10)),
      '!AI4':               (val) => Number.isFinite(parseInt(val, 10)),
      '!ERRORIGNORE':       isBoolean,
      '!STATUSOK':          isBoolean,
      '!WAITFORVISIBLE':    isBoolean,
      '!STRINGESCAPE':      isBoolean,
      '!GLOBAL_TESTSUITE_STOP_ON_ERROR': isBoolean,
      // false = desktop captures INCLUDE the extension UI (side panel and IDE
      // window) instead of hiding it behind the capture cover — the switch
      // the ClearSidebarLogViaGUI demos flip. Unset/true = hide (default).
      '!CAPTURE_HIDE_GUI':  isBoolean,
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
        case '!CAPTURE_HIDE_GUI':
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
    // Does the pool currently hold a value for this name? `get` alone cannot
    // answer that — an unset name and a name set to undefined both read as
    // undefined, which is what made uiv.getVar silently return undefined for
    // typos. Own-property check: keys are stored uppercased, so an inherited
    // Object.prototype member can never masquerade as a variable.
    has: (field) => {
      const key = ((field || '') + '').trim().toUpperCase()
      return key.length > 0 && Object.prototype.hasOwnProperty.call(vars, key)
    },
    // Is this a name the engine knows? Plain (non-'!') names are always fine;
    // '!' names are checked against the internal-variable allowlist above,
    // which stays the ONE place those names are maintained.
    isSupportedName: (field) => {
      const key = ((field || '') + '').trim().toUpperCase()
      if (key.length === 0) return false
      return key.indexOf('!') !== 0 || !opts.isInvalidInternalVar(key)
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
