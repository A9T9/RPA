

export enum CommandScope {
  All = 1,
  WebOnly,
  DesktopOnly
}

export const commandScopes = {
    'open': CommandScope.WebOnly,
    'openBrowser': CommandScope.WebOnly,
    'click': CommandScope.WebOnly,
    'clickAndWait': CommandScope.WebOnly,
    'saveItem': CommandScope.WebOnly,
    'select': CommandScope.WebOnly,
    'selectAndWait': CommandScope.WebOnly,
    'addSelection': CommandScope.WebOnly,
    'removeSelection': CommandScope.WebOnly,
    'type': CommandScope.WebOnly,
    'pause': CommandScope.All,
    'waitForPageToLoad': CommandScope.WebOnly,
    'selectFrame': CommandScope.WebOnly,
    'assertAlert': CommandScope.WebOnly,
    'assertConfirmation': CommandScope.WebOnly,
    'assertPrompt': CommandScope.WebOnly,
    'answerOnNextPrompt': CommandScope.WebOnly,
    'store': CommandScope.All,
    'storeText': CommandScope.WebOnly,
    'storeTitle': CommandScope.WebOnly,
    'storeAttribute': CommandScope.WebOnly,
    'storeXpathCount': CommandScope.WebOnly,
    'assertText': CommandScope.WebOnly,
    'assertTitle': CommandScope.WebOnly,
    'clickAt': CommandScope.WebOnly,
    'echo': CommandScope.All,
    'mouseOver': CommandScope.WebOnly,
    'verifyText': CommandScope.WebOnly,
    'verifyTitle': CommandScope.WebOnly,
    'sendKeys': CommandScope.WebOnly,
    'dragAndDropToObject': CommandScope.WebOnly,
    'selectWindow': CommandScope.WebOnly,
    'captureScreenshot': CommandScope.WebOnly,
    'captureDesktopScreenshot': CommandScope.DesktopOnly,
    'refresh': CommandScope.WebOnly,
    'assert': CommandScope.All,
    'assertElementPresent': CommandScope.WebOnly,
    'assertElementNotPresent': CommandScope.WebOnly,
    'assertEditable': CommandScope.WebOnly,
    'assertNotEditable': CommandScope.WebOnly,
    'verify': CommandScope.All,
    'verifyElementPresent': CommandScope.WebOnly,
    'verifyElementNotPresent': CommandScope.WebOnly,
    'verifyEditable': CommandScope.WebOnly,
    'verifyNotEditable': CommandScope.WebOnly,
    'deleteCookies': CommandScope.WebOnly,
    'label': CommandScope.All,
    'gotoLabel': CommandScope.All,
    'csvRead': CommandScope.All,
    'csvReadArray': CommandScope.All,
    'csvSave': CommandScope.All,
    'csvSaveArray': CommandScope.All,
    'storeValue': CommandScope.WebOnly,
    'assertValue': CommandScope.WebOnly,
    'verifyValue': CommandScope.WebOnly,
    'storeChecked': CommandScope.WebOnly,
    'captureEntirePageScreenshot': CommandScope.WebOnly,
    'onDownload': CommandScope.WebOnly,
    'throwError': CommandScope.All,
    'comment': CommandScope.All,
    'waitForElementVisible': CommandScope.WebOnly,
    'waitForElementNotVisible': CommandScope.WebOnly,
    'waitForElementPresent': CommandScope.WebOnly,
    'waitForElementNotPresent': CommandScope.WebOnly,
    'onError': CommandScope.All,
    'sourceSearch': CommandScope.WebOnly,
    'sourceExtract': CommandScope.WebOnly,
    'storeImage': CommandScope.WebOnly,
    'localStorageExport': CommandScope.All,
    'visionLimitSearchArea': CommandScope.All,
    'visionLimitSearchAreaRelative': CommandScope.All,
    'visionLimitSearchAreabyTextRelative': CommandScope.All,
    'visualSearch': CommandScope.All,
    'visualVerify': CommandScope.All,
    'visualAssert': CommandScope.All,
    'visualGetPixelColor': CommandScope.All,
    'editContent': CommandScope.WebOnly,
    'bringBrowserToForeground': CommandScope.All,
    'bringIDEandBrowserToBackground': CommandScope.All,
    'setWindowSize': CommandScope.All,
    'prompt': CommandScope.WebOnly,

    // NOTE: the B commands (BClick/BMove/BType/...) are NOT table commands.
    // Trusted CDP input is a JS-script-only feature (uiv.browser.*); the
    // B-command engine in run_command.ts is internal plumbing behind it.

    'XRun': CommandScope.All,
    'XRunAndWait': CommandScope.All,
    'XClick': CommandScope.All,
    'XClickRelative': CommandScope.All,
    'XClickTextRelative': CommandScope.All,
    'XClickText': CommandScope.All,
    'XMoveText': CommandScope.All,
    'XMoveTextRelative': CommandScope.All,
    'XType': CommandScope.All,
    'XMove': CommandScope.All,
    'XMoveRelative': CommandScope.All,
    'XMouseWheel': CommandScope.All,
    'XDesktopAutomation': CommandScope.All,

    'OCRSearch': CommandScope.All,
    'OCRExtractRelative': CommandScope.All,
    'OCRExtractbyTextRelative': CommandScope.All,
    'OCRExtractScreenshot': CommandScope.All,

    'aiPrompt': CommandScope.All,
    'aiScreenXY': CommandScope.All,
    'aiComputerUse': CommandScope.All,

    'setProxy': CommandScope.All,
    'run': CommandScope.All,

    'executeScript': CommandScope.All,
    'executeScript_Sandbox': CommandScope.All,

    'check': CommandScope.WebOnly,
    'uncheck': CommandScope.WebOnly,
    'assertChecked': CommandScope.WebOnly,
    'assertNotChecked': CommandScope.WebOnly,
    'verifyChecked': CommandScope.WebOnly,
    'verifyNotChecked': CommandScope.WebOnly,

    //'while',
    // 'endWhile',
    'do': CommandScope.All,
    'repeatIf': CommandScope.All,
    //'if',
    'else': CommandScope.All,
    'elseif': CommandScope.All,
    // 'endif',
    'end': CommandScope.All,
    'if': CommandScope.All,      // war _v2
    'while': CommandScope.All,   // war _v2
    'gotoIf': CommandScope.All, // war _v2
    'times': CommandScope.All,
    'forEach': CommandScope.All,
    'break': CommandScope.All,
    'continue': CommandScope.All
}

export type Command = keyof typeof commandScopes


export const availableCommands = (() => {
  const list = Object.keys(commandScopes)
  list.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1)

  return list
})()

export const availableCommandsForDesktop = availableCommands.filter(isCommandAvailableForDesktop)

// Deprecated command names and their modern replacements. Single source of
// truth shared by the editor display (commandText) and the AI macro agent
// (system prompt + macro validation) — extend this list when a command gets
// retired. Matching is case-insensitive.
export const DEPRECATED_COMMANDS: Array<{ cmd: string; replacement: string }> = [
  { cmd: 'endWhile', replacement: 'end' },
  { cmd: 'endIf', replacement: 'end' },
  { cmd: 'endTimes', replacement: 'end' },
  { cmd: 'if_v2', replacement: 'if' },
  { cmd: 'while_v2', replacement: 'while' },
  { cmd: 'gotoIf_v2', replacement: 'gotoIf' },
  { cmd: 'storeEval', replacement: 'executeScript_Sandbox' },
  { cmd: 'resize', replacement: 'setWindowSize' },
  // 2026-07: visual search + click on #elementFromPoint(${!imageX}, ${!imageY})
  // (shorthand: #efp) replaces coordinate clicking
  { cmd: 'clickAt', replacement: 'click with an #efp / #elementFromPoint target' },
  // 2026-07 agentic cleanup: the *AndWait aliases share the exact code path with
  // their base commands (page-load waiting is automatic), the verify* family is
  // soft-fail assert (use assert* + !errorignore instead), and the editability
  // checks have near-zero real-world use
  { cmd: 'clickAndWait', replacement: 'click' },
  { cmd: 'selectAndWait', replacement: 'select' },
  { cmd: 'waitForPageToLoad', replacement: 'waitForElementVisible if needed — page-load waiting is automatic' },
  { cmd: 'visionFind', replacement: 'visualSearch' },
  { cmd: 'visualVerify', replacement: 'visualAssert' },
  { cmd: 'verify', replacement: 'assert' },
  { cmd: 'verifyText', replacement: 'assertText' },
  { cmd: 'verifyTitle', replacement: 'assertTitle' },
  { cmd: 'verifyValue', replacement: 'assertValue' },
  { cmd: 'verifyChecked', replacement: 'assertChecked' },
  { cmd: 'verifyNotChecked', replacement: 'assertNotChecked' },
  { cmd: 'verifyElementPresent', replacement: 'assertElementPresent' },
  { cmd: 'verifyElementNotPresent', replacement: 'assertElementNotPresent' },
  { cmd: 'verifyEditable', replacement: 'an executeScript check on disabled/readOnly' },
  { cmd: 'verifyNotEditable', replacement: 'an executeScript check on disabled/readOnly' },
  { cmd: 'assertEditable', replacement: 'an executeScript check on disabled/readOnly' },
  { cmd: 'assertNotEditable', replacement: 'an executeScript check on disabled/readOnly' },
  // synthetic DOM drag events are ignored by most modern sites; trusted CDP
  // dragging lives in JS scripts (press, move, release)
  { cmd: 'dragAndDropToObject', replacement: 'a JS script: uiv.browser.down(start), then uiv.browser.up(end)' }
]

export function getDeprecatedCommandReplacement (cmd: string): string | null {
  if (!cmd) return null
  const lower = cmd.toLowerCase()
  const found = DEPRECATED_COMMANDS.find(item => item.cmd.toLowerCase() === lower)
  return found ? found.replacement : null
}

// Commands offered in the editor's command dropdown: everything except the
// deprecated ones. Deprecated commands stay fully valid — existing macros
// load, display (flagged _deprecated) and play — they are only hidden from
// new-macro authoring.
export const selectableCommands = availableCommands.filter(cmd => !getDeprecatedCommandReplacement(cmd))
export const selectableCommandsForDesktop = selectableCommands.filter(isCommandAvailableForDesktop)

// Renamed commands: old name -> new canonical name, accepted SILENTLY when a
// macro is loaded (unlike DEPRECATED_COMMANDS, which the editor flags and the
// AI agent rejects). Keys must be lowercase.
const RENAMED_COMMANDS: { [key: string]: string } = {
  // 2026-07: it only ever deleted the current site's cookies, so the "All"
  // in the name was misleading
  'deleteallcookies': 'deleteCookies'
}

export function normalizeCommandName (str: string) {
  if (!str) {
    return '';
  }

  const renamed = RENAMED_COMMANDS[str.toLowerCase()]
  if (renamed) {
    return renamed
  }

  const lower = str.toLowerCase()
  const lowerCommands = availableCommands.map(str => str.toLowerCase())
  const index = lowerCommands.findIndex(cmd => cmd === lower)

  return index === -1 ? str : availableCommands[index]
}

export function commandText (cmd: string) {
  switch (cmd) {
    case 'ifxxx':  //war _v1
    case 'whilexxx':
    case 'gotoIfxxx':
      return cmd + '_v1_deprecated'

    default:
      // single source of truth: everything in DEPRECATED_COMMANDS gets the
      // _deprecated suffix in the editor display
      return getDeprecatedCommandReplacement(cmd) ? cmd + '_deprecated' : cmd
  }
}

export function isValidCmd (str: string) {
  return availableCommands.indexOf(str) !== -1
}

export function isExtensionResourceOnlyCommand (str: string) {
  switch (str) {
    case 'if':
    case 'while':
    case 'gotoIf':
    case 'if_v2':
    case 'while_v2':
    case 'gotoIf_v2':
    case 'executeScript_Sandbox':
    case 'run':
    case 'store':
    case 'echo':
    case 'prompt':
    case 'throwError':
    case 'pause':
    case 'localStorageExport':
      return true

    default:
      return false
  }
}

export function canCommandReadImage (str: string) {
  switch (str) {
    case 'visualSearch':
    case 'visualVerify':
    case 'visualAssert':
    case 'XClick':
    case 'XClickText':
    case 'XClickTextRelative':
    case 'XClickRelative':
    case 'XMove':
    case 'XMoveText':
    case 'XMoveTextRelative':
    case 'XMoveRelative':
    case 'OCRExtract':
    case 'OCRExtractRelative':
      return true

    default:
      return false
  }
}

export function canCommandReadCsv (str: string) {
  switch (str) {
    case 'csvRead':
    case 'csvReadArray':
      return true

    default:
      return false
  }
}

export function canCommandRunMacro (str: string) {
  switch (str) {
    case 'run':
      return true

    default:
      return false
  }
}

export function doesCommandSupportTargetOptions (str: string) {
  switch (str) {
    case 'click':
    case 'saveItem':
    case 'clickAndWait':
    case 'select':
    case 'selectAndWait':
    case 'type':
    case 'mouseOver':
    case 'verifyText':
    case 'sendKeys':
    case 'dragAndDropToObject':
    case 'assertElementPresent':
    case 'assertEditable':
    case 'assertNotEditable':
    case 'verifyElementPresent':
    case 'verifyEditable':
    case 'verifyNotEditable':
    case 'storeValue':
    case 'assertValue':
    case 'verifyValue':
    case 'storeChecked':
    case 'waitForElementVisible':
    case 'waitForElementPresent':
    case 'XClick':
    case 'XClickRelative':
    case 'XClickTextRelative':
    case 'XClickText':
    case 'XMoveText':
    case 'XMoveTextRelative':
    case 'XMove':
    case 'XMoveRelative':
    case 'check':
    case 'uncheck':
    case 'assertChecked':
    case 'assertNotChecked':
    case 'verifyChecked':
    case 'verifyNotChecked':
    case 'aiPrompt':
    case 'aiScreenXY':
    case 'aiComputerUse':
      return true

    default:
      return false
  }
}

export function canCommandFind (str: string): boolean {
  switch (str) {
    case 'echo':
    case 'open':
    case 'openBrowser':
    case 'pause':
    case 'waitForPageToLoad':
    case 'assertAlert':
    case 'assertConfirmation':
    case 'assertPrompt':
    case 'answerOnNextPrompt':
    case 'store':
    case 'storeTitle':
    case 'assertTitle':
    case 'verifyTitle':
    case 'selectWindow':
    case 'captureScreenshot':
    case 'captureDesktopScreenshot':
    case 'refresh':
    case 'deleteCookies':
    case 'label':
    case 'gotoLabel':
    case 'csvRead':
    case 'csvReadArray':
    case 'csvSave':
    case 'csvSaveArray':
    case 'captureEntirePageScreenshot':
    case 'onDownload':
    case 'throwError':
    case 'comment':
    case 'onError':
    case 'sourceSearch':
    case 'sourceExtract':
    case 'localStorageExport':
    case 'visionLimitSearchArea':
    case 'visualGetPixelColor':
    case 'bringBrowserToForeground':
    case 'bringIDEandBrowserToBackground':
    case 'setWindowSize':
    case 'prompt':
    case 'XRun':
    case 'XRunAndWait':
    case 'XDesktopAutomation':
    case 'setProxy':
    case 'run':
    case 'executeScript':
    case 'executeScript_Sandbox':
    case 'do':
    case 'repeatIf':
    case 'else':
    case 'elseif':
    case 'end':
    case 'if_v2':
    case 'while_v2':
    case 'gotoIf_v2':
    case 'times':
    case 'forEach':
    case 'OCRExtractScreenshot':
    case 'aiPrompt':
    case 'aiComputerUse':
      return false

    default:
      return true
  }
}

export function canCommandSelect (str: string): boolean {
  const canFind = canCommandFind(str)

  if (canFind) {
    return canFind
  }

  switch (str) {
    case 'visualGetPixelColor':
    case 'setWindowSize':
      return true

    default:
      return false
  }
}

export function isCommandAvailableForDesktop (command: string): boolean {
  const scope: CommandScope = commandScopes[command as Command]

  if (!scope) {
    return false
  }

  return scope === CommandScope.All || scope === CommandScope.DesktopOnly
}

export type IndentResult = {
  selfIndent: number;
  nextIndent: number;
}

export function indentCreatedByCommand (str: string): IndentResult {
  switch (str) {
    case 'if':
    case 'if_v2':
    case 'while':
    case 'while_v2':
    case 'do':
    case 'times':
    case 'forEach':
      return {
        selfIndent: 0,
        nextIndent: 1
      }

    case 'else':
    case 'elseif':
      return {
        selfIndent: -1,
        nextIndent: 1
      }

    case 'end':
    case 'endif':
    case 'endwhile':
    case 'repeatIf':
      return {
        selfIndent: -1,
        nextIndent: 0
      }

    default:
      return {
        selfIndent: 0,
        nextIndent: 0
      }
  }
}

export type ImageTarget = {
  fileName:   string;
  confidence?: number;
  index?:      number;
  imageUrl?:  string;
}

export function parseImageTarget (target: string): ImageTarget | null {
  if (!target || !target.length) {
    return null
  }

  const reg = /^([^@#]+?\.png)(?:@([\d.]+))?(?:#(\d+))?(?:\[([^\]]+)\])?$/
  const m   = target.match(reg)

  if (!m) {
    return null
  }
  // throw new Error(`Target should be like 'abc.png@0.8#1'`)

  const fileName   = m[1]
  const confidence = m[2] ? parseFloat(m[2]) : undefined
  const index      = m[3] ? (parseInt(m[3]) - 1) : undefined
  const imageUrl   = m[4]

  return { fileName, confidence, index, imageUrl }
}

// JS script macros have no command table to inspect — their vision images and
// CSVs are referenced inside string literals of the program text instead
// (uiv.findImage('button.png'), uiv.csv.read('data.csv'), classic-style
// 'img.png@0.8' via uiv.run). Scan for such names so features that walk a
// macro's resources (zip export etc.) see them too. Names with path
// separators are skipped: storage file names never have them, those are
// local paths (e.g. file-upload targets).
export function parseScriptResources (script: string): { images: string[], csvs: string[] } {
  const images: Record<string, boolean> = {}
  const csvs: Record<string, boolean> = {}
  const reg = /(['"`])([^'"`\r\n]{1,300}?\.(?:png|csv))(?:@[\d.]+)?(?:#\d+)?\1/gi
  let m: RegExpExecArray | null

  while ((m = reg.exec(script || ''))) {
    const name = m[2]
    if (/[\\/]/.test(name)) continue
    if (/\.png$/i.test(name)) {
      images[name] = true
    } else {
      csvs[name] = true
    }
  }

  return { images: Object.keys(images), csvs: Object.keys(csvs) }
}
