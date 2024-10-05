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
            if (response.error.length > 0) {
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
      (e: Error) => {
        sendResponse({
          result: "",
          error: e.message
        })
      }
    )

    return true
  })
}
