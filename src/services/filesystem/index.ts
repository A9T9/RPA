import { MethodTypeInvocationNames } from './constants'
import { KantuFileAccessHost } from './kantu-file-access-host'
import { KantuFileAccess } from './kantu-file-access'
import { singletonGetter, snakeToCamel, until } from '@/common/ts_utils'
import log from '@/common/log'
import path from '@/common/lib/path'
import { utf8 } from '@/common/utf8'
import { base64 } from '@/common/base64'
import { blobToDataURL } from '@/common/utils'
import semver from 'semver'
import config from '@/config'

export type PromiseFunc           = (...args: any[]) => Promise<any>
export type DumbPromiseFunc<T>    = () => Promise<T>
export type PathPromiseFunc<T>    = (params: { path: string }) => Promise<T>
export type ListPromiseFunc<T>    = (params: { path: string, extensions: string[], brief?: boolean }) => Promise<T>
export type WritePromiseFunc<T>   = (params: { path: string, content: any }) => Promise<T>
export type RangePromiseFunc<T>   = (params: { path: string, rangeStart: number }) => Promise<T>
export type CopyPromiseFunc<T>    = (params: { sourcePath: string, targetPath: string }) => Promise<T>
export type SpecialFolderPromiseFunc = (params: { folder: SpecialFolder }) => Promise<string>
export type APIGroup              = Record<string, PromiseFunc>

export enum SpecialFolder {
  UserProfile,
  UserDesktop
}

export type FileSystemEntry = {
  name: string;
  isDirectory: boolean;
}

export type FileSystemEntryInfo = {
  isDirectory: boolean;
  lastWriteTime: number; // Unix Epoch in milliseconds
  length: number;
}

export type FileSystemEntryWithInfo = FileSystemEntry & FileSystemEntryInfo

export type FileRangeBuffer = {
  rangeStart: number;
  rangeEnd: number;
  buffer: string;
}

export type ProcessStartInfo = {
  fileName: string;
  arguments: string;
  waitForExit: boolean;
}

export type ProcessExitInfo = {
  exitCode: number | null;
}

export type InvocationResult<T> = {
  errorCode: KantuFileAccess.ErrorCode;
  content:   T;
}

export type RunProcessOptions = {
  fileName:    string;
  arguments:   string;
  waitForExit: boolean;
}

export interface NativeFileAPI {
  getVersion:             DumbPromiseFunc<string>;
  getFileSystemEntries:   ListPromiseFunc<{ entries: string[]; errorCode: KantuFileAccess.ErrorCode }>;
  getDirectories:         PathPromiseFunc<any[]>;
  getFiles:               PathPromiseFunc<any[]>;
  getFileSystemEntryInfo: PathPromiseFunc<FileSystemEntryInfo>;
  getSpecialFolderPath:   SpecialFolderPromiseFunc;
  directoryExists:        PathPromiseFunc<boolean>;
  fileExists:             PathPromiseFunc<boolean>;
  createDirectory:        PathPromiseFunc<boolean>;
  removeDirectory:        PathPromiseFunc<boolean>;
  copyFile:               CopyPromiseFunc<boolean>;
  moveFile:               CopyPromiseFunc<boolean>;
  deleteFile:             PathPromiseFunc<boolean>;
  readAllText:            PathPromiseFunc<InvocationResult<string>>;
  readAllTextCompat:      PathPromiseFunc<InvocationResult<string>>;
  writeAllText:           WritePromiseFunc<boolean>;
  appendAllText:          WritePromiseFunc<boolean>;
  readAllBytes:           PathPromiseFunc<InvocationResult<string>>;
  readAllBytesCompat:     PathPromiseFunc<InvocationResult<string>>;
  writeAllBytes:          WritePromiseFunc<boolean>;
  appendAllBytes:         WritePromiseFunc<boolean>;
  getFileSize:            PathPromiseFunc<number>;
  readFileRange:          RangePromiseFunc<FileRangeBuffer>;
  reconnect:              () => Promise<NativeFileAPI>;
  getEntries:             ListPromiseFunc<{ entries: FileSystemEntryWithInfo[]; errorCode: KantuFileAccess.ErrorCode }>;
  ensureDir:              PathPromiseFunc<boolean>;
  readBigFile:            PathPromiseFunc<Uint8Array>;
  isReadBigFileSupported: () => Promise<boolean>;
  runProcess:             (params: RunProcessOptions) => Promise<ProcessExitInfo>;
}

export const getNativeFileSystemAPI = singletonGetter(() => {
  const nativeHost    = new KantuFileAccessHost()
  let pReady          = nativeHost.connectAsync().catch(e => {
    log.warn('pReady - error', e)
    throw e
  })
  let pendingRequestCount = 0
  const api: APIGroup =  MethodTypeInvocationNames.reduce((prev: APIGroup, method: string) => {
    const camel = snakeToCamel(method)

    if (prev[camel]) {
      return prev
    }

    prev[camel] = (() => {
      const fn = (params: any) => pReady.then(() => {
        pendingRequestCount += 1
        return nativeHost.invokeAsync(method, params)
      })
      .then(
        (data) => {
          pendingRequestCount -= 1
          return data
        },
        e => {
          //pendingRequestCount -= 1 // caused ~10s delay if no xmodule installed
		  pendingRequestCount = 0
          // Note: Looks like for now whenever there is an error, you have to reconnect native host
          // otherwise, all commands return "Disconnected" afterwards
          const typeSafeAPI = <NativeFileAPI>(<any>api)
          typeSafeAPI.reconnect().catch(() => {})
          throw e
        }
      )

      return fn
    })()

    return prev
  }, <APIGroup>{
    reconnect: () => {
      return until('pendingRequestCount === 0', () => {
        return {
          pass: pendingRequestCount === 0,
          result: true
        }
      })
      .then(() => {
        log(`FileSystem - reconnect`, new Error().stack)
        nativeHost.disconnect()
        pReady = nativeHost.connectAsync()
        return pReady.then(() => api)
      })
    },
    getEntries: (params: { path: string, extensions: string[], brief?: boolean; }): Promise<{ entries: FileSystemEntryWithInfo[], errorCode: KantuFileAccess.ErrorCode }> => {
      const typeSafeAPI: NativeFileAPI = <NativeFileAPI>(<any>api)

      return typeSafeAPI.getFileSystemEntries(params)
      .then(res => {
        const { errorCode, entries } = res

        if (params.brief) {
          return Promise.resolve({
            errorCode,
            entries: entries.map((name: string) => ({
              name,
              length: 0,
              isDirectory: false,
              lastWriteTime: 0
            }))
          })
        }

        return Promise.all(
          entries.map((name: string) => {
            const entryPath = path.join(params.path, name)

            return typeSafeAPI.getFileSystemEntryInfo({ path: entryPath })
            .then(info => ({
              name,
              length:         info.length,
              isDirectory:    info.isDirectory,
              lastWriteTime:  info.lastWriteTime
            }))
          })
        )
        .then(entryInfos => ({
          errorCode,
          entries: entryInfos
        }))
      })
    },
    ensureDir: (params: { path: string }): Promise<boolean> => {
      const typeSafeAPI: NativeFileAPI = <NativeFileAPI>(<any>api)

      return typeSafeAPI.directoryExists({
        path: params.path
      })
      .then(exists => {
        if (exists) return true

        return typeSafeAPI.ensureDir({ path: path.dirname(params.path) })
        .then(done => {
          if (!done)  return false
          return typeSafeAPI.createDirectory({ path: params.path })
        })
      })
      .catch(e => false)
    },
    readBigFile: (params: { path: string }): Promise<Uint8Array> => {
      const typeSafeAPI= api as any as NativeFileAPI

      return typeSafeAPI.getFileSize(params)
      .then((fileSize: number) => {
        if (fileSize === 0) {
          return new Uint8Array(0)
        }

        const content = [] as number[]
        const go = (pos: number): Promise<Uint8Array> => {
          return typeSafeAPI.readFileRange({
            path: params.path,
            rangeStart: pos
          })
          .then(result => {
            const data = base64.decode(result.buffer)

            if (data) {
              for (let i = 0; i < data.length; i++) {
                content.push(data[i])
              }
            }

            if (result.rangeEnd <= pos || result.rangeEnd >= fileSize) {
              return new Uint8Array(content)
            }

            return go(result.rangeEnd)
          })
        }

        return go(0)
      })
    },
    isReadBigFileSupported: (): Promise<boolean> => {
      const typeSafeAPI= api as any as NativeFileAPI

      return typeSafeAPI.getVersion()
      .then(version => {
        return !semver.lt(version, config.xfile.minVersionToReadBigFile)
      })
    },
    readAllTextCompat: (params: { path: string }): Promise<InvocationResult<string>> => {
      const typeSafeAPI= api as any as NativeFileAPI

      return typeSafeAPI.isReadBigFileSupported()
      .then(supported => {
        if (!supported) {
          return typeSafeAPI.readAllText(params)
        }

        return typeSafeAPI.readBigFile(params)
        .then(content => {
          const text = utf8.decode(content)

          return {
            errorCode: 0,
            content:   text
          }
        })
      })
    },
    readAllBytesCompat: (params: { path: string }): Promise<InvocationResult<string>> => {
      const typeSafeAPI= api as any as NativeFileAPI

      return typeSafeAPI.isReadBigFileSupported()
      .then(supported => {
        if (!supported) {
          return typeSafeAPI.readAllBytes(params)
        }

        return typeSafeAPI.readBigFile(params)
        .then(content => {
          return blobToDataURL(new Blob([content]))
          .then(dataUrl => ({
            errorCode: 0,
            content:   dataUrl
          }))
        })
      })
    },
  })

  return <NativeFileAPI>(<any>api)
})
