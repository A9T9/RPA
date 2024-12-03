

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
    'deleteAllCookies': CommandScope.WebOnly,
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

export function normalizeCommandName (str: string) {
  if (!str) {
    return '';
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

    case 'storeEval':
    case 'endif':
    case 'endwhile':
    case 'resize':
      return cmd + '_deprecated'

    default:
      return cmd
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
    case 'deleteAllCookies':
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
