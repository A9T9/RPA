import fs, { IBrowserFileSystem } from '@/common/filesystem'

const FS_API = 'fs_api'
const fsFuncs = [
  'list',
  'readFile',
  'writeFile',
  'removeFile',
  'moveFile',
  'copyFile',
  'getDirectory',
  'getMetadata',
  'exists',
  'existsStat',
  'ensureDirectory',
  'rmdir',
  'rmdirR',
]

type Payload = {
  type: string;
  method: keyof IBrowserFileSystem;
  args: string;
}

type Response = {
  result: string;
  error: string;
}

export function getBrowserFileSystem(): IBrowserFileSystem {
  return fs ?? delegateBrowserFileSystemAPI()
}

export function delegateBrowserFileSystemAPI(): IBrowserFileSystem {
  return fsFuncs.reduce((api, funcName) => {
    api[funcName] = (...args: any[]) => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: FS_API,
            method: funcName,
            args: JSON.stringify(args)
          } as Payload,
          (response: Response) => {
            // no answer at all (the background side did not run the handler,
            // or the message channel died) used to throw inside this callback
            // and leave the promise pending; an error without text became
            // "failed: undefined" for the AI agent (OPEN-ISSUES 44.2)
            if (!response) {
              const why = (chrome.runtime.lastError && chrome.runtime.lastError.message) || 'no answer from the background filesystem handler'
              return reject(new Error(`browser file storage: ${why}`))
            }
            if (response.error && response.error.length > 0) {
              return reject(new Error(response.error))
            }

            if (response.result === "undefined") {
              return resolve(undefined)
            }

            try {
              resolve(JSON.parse(response.result))
            } catch (e) {
              reject(e)
            }
          }
        )
      })
    }
    return api
  }, {} as any) as IBrowserFileSystem
}

export function handleDelegatedBrowserFileSystemAPI(): void {
  chrome.runtime.onMessage.addListener((message: Payload, sender, sendResponse: (response: Response) => void) => {
    if (message?.type != FS_API) {
      return
    }

    if (!fs) {
      sendResponse({
        result: "",
        error: "fs is not available on handler side",
      })
      return true
    }

    const method: keyof IBrowserFileSystem = message.method

    if (!fsFuncs.includes(method)) {
      sendResponse({
        result: "",
        error: `unknown fs method: ${method}`,
      })
      return true
    }

    let args: any[]

    try {
      args = JSON.parse(message.args)
    } catch (e) {
      sendResponse({
        result: "",
        error: (e as Error).message
      })
      return true
    }

    const fn = fs[method] as Function

    fn(...args).then(
      (data: any) => {
        sendResponse({
          result: data === undefined ? "undefined" : JSON.stringify(data),
          error: "",
        })
      },
      (e: any) => {
        // the idb.filesystem.js polyfill (Firefox) rejects with plain
        // strings and bare DOMExceptions too — never send an empty reason
        const reason = (e && e.message) || (e ? String(e) : '') || `browser file storage: ${method} failed without an error message`
        sendResponse({
          result: "",
          error: reason
        })
      }
    )

    return true
  })
}
