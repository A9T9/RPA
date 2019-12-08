import { MethodTypeInvocationNames } from './constants'
import { singletonGetter, snakeToCamel } from '../../common/ts_utils'
import { KantuFileAccessHost } from './kantu-file-access-host'
import { KantuFileAccess } from './kantu-file-access'
import path from '../../common/lib/path'

export type PromiseFunc           = (...args: any[]) => Promise<any>
export type DumbPromiseFunc<T>    = () => Promise<T>
export type PathPromiseFunc<T>    = (params: { path: string }) => Promise<T>
export type ListPromiseFunc<T>    = (params: { path: string, extensions: string[] }) => Promise<T>
export type WritePromiseFunc<T>   = (params: { path: string, content: any }) => Promise<T>
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

export interface NativeFileAPI {
  getVersion:             DumbPromiseFunc<string>,
  getFileSystemEntries:   ListPromiseFunc<{ entries: string[], errorCode: KantuFileAccess.ErrorCode }>,
  getDirectories:         PathPromiseFunc<any[]>,
  getFiles:               PathPromiseFunc<any[]>,
  getFileSystemEntryInfo: PathPromiseFunc<FileSystemEntryInfo>,
  getSpecialFolderPath:   SpecialFolderPromiseFunc,
  directoryExists:        PathPromiseFunc<boolean>,
  fileExists:             PathPromiseFunc<boolean>,
  createDirectory:        PathPromiseFunc<boolean>,
  removeDirectory:        PathPromiseFunc<boolean>,
  copyFile:               CopyPromiseFunc<boolean>,
  moveFile:               CopyPromiseFunc<boolean>,
  deleteFile:             PathPromiseFunc<boolean>,
  readAllText:            PathPromiseFunc<KantuFileAccess.InvocationResult<string>>,
  writeAllText:           WritePromiseFunc<boolean>,
  appendAllText:          WritePromiseFunc<boolean>,
  readAllBytes:           PathPromiseFunc<KantuFileAccess.InvocationResult<string>>,
  writeAllBytes:          WritePromiseFunc<boolean>,
  appendAllBytes:         WritePromiseFunc<boolean>,
  reconnect:              () => Promise<NativeFileAPI>,
  getEntries:             ListPromiseFunc<{ entries: FileSystemEntryWithInfo[], errorCode: KantuFileAccess.ErrorCode }>,
  ensureDir:              PathPromiseFunc<boolean>
}

export const getNativeFileSystemAPI = singletonGetter<NativeFileAPI>(() => {
  const nativeHost    = new KantuFileAccessHost()
  let pReady          = nativeHost.connectAsync().catch(e => {
    console.warn('pReady - error', e)
    throw e
  })
  const api: APIGroup =  MethodTypeInvocationNames.reduce((prev: APIGroup, method: string) => {
    const camel = snakeToCamel(method)
    prev[camel] = (() => {
      const fn = (params: any) => pReady.then(() => {
        return nativeHost.invokeAsync(method, params)
      })
      .catch(e => {
        // Note: Looks like for now whenever there is an error, you have to reconnect native host
        // otherwise, all commands return "Disconnected" afterwards
        const typeSafeAPI = <NativeFileAPI>(<any>api)
        typeSafeAPI.reconnect()
        throw e
      })
      return fn
    })()
    return prev
  }, <APIGroup>{
    reconnect: () => {
      nativeHost.disconnect()
      pReady = nativeHost.connectAsync()
      return pReady.then(() => api)
    },
    getEntries: (params: { path: string, extensions: string[] }): Promise<{ entries: FileSystemEntryWithInfo[], errorCode: KantuFileAccess.ErrorCode }> => {
      const typeSafeAPI: NativeFileAPI = <NativeFileAPI>(<any>api)

      return typeSafeAPI.getFileSystemEntries(params)
      .then(res => {
        const { errorCode, entries } = res

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
    }
  })

  return <NativeFileAPI>(<any>api)
})
