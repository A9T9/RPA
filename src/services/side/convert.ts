import { SideCommand, SideCommandText, SideMacro, SideProject } from "./types"
import { Command } from "../player/macro"
import { Macro } from "@/common/convert_utils"
import { flatten, uniqueName } from "@/common/ts_utils"
import { getStorageManager } from "@/services/storage"
import log from "@/common/log"
import { sanitizeFileName } from "@/common/utils";

export type ImportSideProjectResult = {
  projectName: string;
  folderName: string;
  macros: {
    successCount: number;
    ignoreCount:  number;
    errorCount:   number;
    errors:       Array<{ name: string, error: string}>;
  };
  suites: {
    successCount: number;
    ignoreCount:  number;
    errorCount:   number;
    errors:       Array<{ name: string, error: string}>;
  };
}

export function importSideProject (project: SideProject): Promise<ImportSideProjectResult> {
  const folderName   = sanitizeFileName(project.name)
  const macroStorage = getStorageManager().getMacroStorage()
  const path         = macroStorage.getPathLib()

  return uniqueName(folderName, {
    check: (name) => {
      return macroStorage.directoryExists(name)
      .then(result => !result)
    }
  })
  .then(finalFolderName => {
    return macroStorage.createDirectory(finalFolderName)
    .then(() => {
      return Promise.all(
        project.tests.map(sideMacro => {
          sideMacro.name  = sanitizeFileName(sideMacro.name)

          const filePath  = path.join(finalFolderName, sideMacro.name + '.json')
          const macro     = convertSideMacro(sideMacro, project.url)

          return macroStorage.write(filePath, {
            name: macro.name,
            data: {
              commands: macro.commands
            }
          })
          .then(
            () => true,
            (e) => {
              log(e)
              return e.message
            }
          )
        })
      )
      .then(list => {
        return {
          successCount: list.filter((x: any) => x && typeof x === 'boolean').length,
          errorCount:   list.filter((x: any) => typeof x === 'string').length,
          errors:       list.filter((x: any) => typeof x === 'string'),
          ignoreCount:  0
        }
      })
    })
    .then(macrosResult => {
      return {
        projectName: project.name,
        folderName: finalFolderName,
        macros: macrosResult,
        suites: {
          successCount: 0,
          ignoreCount: project.suites.length,
          errorCount: 0,
          errors: []
        }
      }
    })
  })
}

export function convertSideMacro (macro: SideMacro, baseUrl: string): Macro {
  return {
    name:     macro.name,
    commands: flatten(
      macro.commands.map(command => convertSideCommand(command, baseUrl))
    )
  }
}

export function convertSideCommand (command: SideCommand, baseUrl: string): Command[] {
  if (command.command === 'open') {
    return [{
      cmd:    'open',
      target: resolveUrl(baseUrl, command.target),
      value:  ''
    }]
  }

  if (isSameNameSupported(command.command)) {
    return [{
      cmd:    command.command,
      target: command.target,
      value:  command.value,
      ...(command.targets ? { targetOptions: command.targets.map(item => item[0]) } : {})
    }]
  }

  const res = convertSideCommandMapping(command)

  if (res.length > 0) {
    return res
  }

  return [{
    cmd:    'comment',
    target: `${command.command} // ${command.target}`,
    value:  command.value
  }]
}

function isSameNameSupported (name: SideCommandText): boolean {
  switch (name) {
    case 'open':
    case 'select':
    case 'type':
    case 'pause':
    case 'addSelection':
    case 'answerOnNextPrompt':
    case 'assertAlert':
    case 'assertChecked':
    case 'assertConfirmation':
    case 'assertEditable':
    case 'assertElementPresent':
    case 'assertElementNotPresent':
    case 'assertNotEditable':
    case 'assertNotChecked':
    case 'assertPrompt':
    case 'assertTitle':
    case 'assertText':
    case 'assertValue':
    case 'check':
    case 'click':
    case 'saveItem':
    case 'clickAt':
    case 'do':
    case 'dragAndDropToObject':
    case 'echo':
    case 'editContent':
    case 'else':
    case 'elseIf':
    case 'end':
    case 'executeAsyncScript':
    case 'executeScript':
    case 'forEach':
    case 'mouseOver':
    case 'repeatIf':
    case 'removeSelection':
    case 'run':
    case 'select':
    case 'selectFrame':
    case 'sendKeys':
    case 'setWindowSize':
    case 'store':
    case 'storeAttribute':
    case 'storeText':
    case 'storeTitle':
    case 'storeValue':
    case 'storeXpathCount':
    case 'times':
    case 'uncheck':
    case 'verifyChecked':
    case 'verifyText':
    case 'verifyTitle':
    case 'verifyValue':
    case 'verifyEditable':
    case 'verifyElementPresent':
    case 'verifyElementNotPresent':
    case 'verifyNotChecked':
    case 'verifyNotEditable':
    case 'waitForElementVisible':
    case 'waitForElementNotVisible':
    case 'waitForElementPresent':
    case 'waitForElementNotPresent':
      return true

    default:
      return false
  }
}

function convertSideCommandMapping (command: SideCommand): Command[] {
  const withTimeoutWaitChanged = (value: string, command: Command): Command[] => {
    return [{
        cmd:    'store',
        target: '${!TIMEOUT_WAIT}',
        value:  '__LAST_TIMEOUT_WAIT__'
      }, {
        cmd:    'store',
        target: (parseFloat(value) / 1000).toFixed(3),
        value:  '!TIMEOUT_WAIT'
      },
      command,
      {
        cmd:    'store',
        target: '${__LAST_TIMEOUT_WAIT__}',
        value:  '!TIMEOUT_WAIT'
      }]

  }

  switch (command.command) {
    case 'runScript': {
      return [{
        cmd:    'executeScript',
        target: command.target,
        value:  ''
      }]
    }

    case 'if': {
      return [{
        cmd:    'if', //war if_v2 xxx
        target: command.target,
        value:  command.value
      }]
    }

    case 'while': {
      return [{
        cmd:    'while', //war _v2 xxx
        target: command.target,
        value:  command.value
      }]
    }

    default:
      return []
  }
}

function resolveUrl (baseUrl: string, url: string): string {
  if (/^https?:\/\//.test(url)) {
    return url
  }

  if (url.charAt(0) === '/') {
    const u = new URL(baseUrl)
    return u.origin + url
  }

  return baseUrl + url
}