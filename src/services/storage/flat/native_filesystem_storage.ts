import mime from 'mime'
import { IWithLinkStorage, FlatStorage, FlatStorageOptions, Content, FileInfo, readableSize, checkFileName } from './storage'
import { getNativeFileSystemAPI, NativeFileAPI, FileSystemEntry, FileSystemEntryWithInfo, InvocationResult } from '@/services/filesystem'
import { KantuFileAccess } from '@/services/filesystem/kantu-file-access'
import { ReadFileType } from '@/common/filesystem'
import path from '@/common/lib/path'
import { dataURItoArrayBuffer, arrayBufferToString, sanitizeFileName } from '@/common/utils'
import { singletonGetterByKey } from '@/common/ts_utils'

export type NativeFileSystemFlatStorageOptions = FlatStorageOptions & {
  rootDir: string;
  baseDir: string;
  extensions: string[];
  shouldKeepExt: boolean;
  listFilter?: (files: FileInfo[]) => FileInfo[] | Promise<FileInfo[]>;
}

export class NativeFileSystemFlatStorage extends FlatStorage implements IWithLinkStorage {
  protected rootDir: string
  protected baseDir: string
  protected extensions: string[]
  protected shouldKeepExt: boolean
  protected listFilter: (files: FileInfo[]) => FileInfo[] | Promise<FileInfo[]> = (list) => list
  protected fs: NativeFileAPI
  protected displayedCount: number = 0
  protected totalCount: number = 0

  constructor (opts: NativeFileSystemFlatStorageOptions) {
    super({
      encode: opts.encode,
      decode: opts.decode
    })
    const { baseDir, rootDir, extensions, shouldKeepExt = false, listFilter } = opts

    if (!baseDir || baseDir === '/') {
      throw new Error(`Invalid baseDir, ${baseDir}`)
    }

    this.rootDir        = rootDir
    this.baseDir        = baseDir
    this.extensions     = extensions
    this.shouldKeepExt  = shouldKeepExt

    if (listFilter) {
      this.listFilter = listFilter
    }

    this.fs             = getNativeFileSystemAPI()
  }

  getDisplayCount () {
    return this.displayedCount
  }

  getTotalCount () {
    return this.totalCount
  }

  readAll (readFileType: ReadFileType = 'Text', onErrorFiles?: Function): Promise<({ fileName: string, content: Content })[]> {
    return this.list()
    .then(items => {
      return Promise.all(
        items.map(item => {
          return this.read(item.fileName, readFileType)
          .then(content => ({
            content,
            fileName: item.fileName
          }))
          // Note: Whenever there is error in reading file,
          // return null
          .catch(e => ({
            fileName:     item.fileName,
            fullFilePath: this.filePath(item.fileName),
            error:        new Error(`Error in parsing ${this.filePath(item.fileName)}:\n${e.message}`)
          }))
        })
      )
      .then(list => {
        const errorFiles = list.filter(item => (<any>item).error)
        if (onErrorFiles) onErrorFiles(errorFiles)

        return <({ fileName: string, content: Content })[]>list.filter((item: any) => item.content)
      })
    })
  }

  getLink (fileName: string): Promise<string> {
    return this.read(fileName, 'DataURL') as Promise<string>
  }

  __list (): Promise<FileInfo[]> {
    return this.ensureDir()
    .then(() => {
      return this.fs.getEntries({
        path: path.join(this.rootDir, this.baseDir),
        extensions: this.extensions
      })
      .then(data => {
        const entries: FileSystemEntryWithInfo[] = data.entries
        const errorCode = data.errorCode

        if (errorCode !== KantuFileAccess.ErrorCode.Succeeded) {
          throw new ErrorWithCode(getErrorMessageForCode(errorCode), errorCode)
        }

        const convertName = (entryName: string) => this.shouldKeepExt ? entryName : this.removeExt(entryName)
        const convert = (entry: FileSystemEntryWithInfo): FileInfo => {
          return {
            dir: this.baseDir,
            fileName: convertName(entry.name),
            lastModified: new Date(entry.lastWriteTime),
            size: readableSize(entry.length)
          }
        }
        const allList = entries.map(convert)

        return Promise.resolve(this.listFilter(allList))
        .then(displayList => {
          this.totalCount     = allList.length
          this.displayedCount = displayList.length

          return displayList
        })
      })
    })
  }

  exists (fileName: string): Promise<boolean> {
    return this.fs.fileExists({
      path: this.filePath(fileName)
    })
  }

  read (fileName: string, type: ReadFileType): Promise<Content> {
    const onResolve = (res: InvocationResult<string>) => {
      if (res.errorCode !== KantuFileAccess.ErrorCode.Succeeded) {
        throw new ErrorWithCode(`${fileName}: ` + getErrorMessageForCode(res.errorCode), res.errorCode)
      }

      const rawContent    = (<any>res).content
      const intermediate  = (() => {
        switch (type) {
          case 'Text':
          case 'DataURL':
            return rawContent

          case 'ArrayBuffer':
            return dataURItoArrayBuffer(rawContent)

          case 'BinaryString':
            return arrayBufferToString(dataURItoArrayBuffer(rawContent))
        }
      })()

      return this.decode(intermediate, fileName)
    }

    switch (type) {
      case 'Text':
        return this.fs.readAllTextCompat({
          path: this.filePath(fileName)
        })
        .then(onResolve)

      default:
        return this.fs.readAllBytesCompat({
          path: this.filePath(fileName)
        })
        .then(onResolve)
    }
  }

  __write (fileName: string, content: string): Promise<void> {
    return this.ensureDir()
    .then(() => this.encode(content, fileName))
    .then(encodedContent => {
      return this.fs.writeAllBytes({
        content:  encodedContent,
        path:     this.filePath(fileName, true),
      })
      .then(result => {
        if (!result) {
          throw new Error(`Failed to write to '${fileName}'`)
        }
      })
    })
  }

  __overwrite (fileName: string, content: any): Promise<void> {
    return this.remove(fileName)
    .catch(() => { /* Ignore any error */ })
    .then(() => this.write(fileName, content))
  }

  __clear (): Promise<void> {
    return this.list()
    .then(list => {
      const ps = list.map(file => {
        return this.remove(file.fileName)
      })

      return Promise.all(ps)
    })
    .then(() => {})
  }

  __remove (fileName: string): Promise<void> {
    return this.ensureDir()
    .then(() => {
      return this.fs.deleteFile({
        path: this.filePath(fileName)
      })
      .then(() => {})
    })
  }

  __rename (fileName: string, newName: string): Promise<void> {
    return this.ensureDir()
    .then(() => {
      return this.fs.moveFile({
        sourcePath: this.filePath(fileName),
        targetPath: this.filePath(newName, true)
      })
      .then(() => {})
    })
  }

  __copy (fileName: string, newName: string): Promise<void> {
    return this.ensureDir()
    .then(() => {
      return this.fs.copyFile({
        sourcePath: this.filePath(fileName),
        targetPath: this.filePath(newName, true)
      })
      .then(() => {})
    })
  }

  filePath (fileName: string, shouldSanitize: boolean = false) {
    const sanitized     = shouldSanitize ? sanitizeFileName(fileName) : fileName
    const existingExt   = path.extname(fileName)
    const ext           = this.extensions[0]
    const finalFileName = existingExt && existingExt.substr(1).toLowerCase() === ext.toLowerCase() ? sanitized: (sanitized + '.' + ext)

    return path.join(this.rootDir, this.baseDir, finalFileName)
  }

  private removeExt (fileNameWithExt: string) {
    const name: string = path.basename(fileNameWithExt)
    const ext: string  = path.extname(fileNameWithExt)
    const i: number    = name.lastIndexOf(ext)

    return name.substring(0, i)
  }

  ensureDir (): Promise<void> {
    const fs  = this.fs
    const dir = path.join(this.rootDir, this.baseDir)

    return fs.directoryExists({
      path: dir
    })
    .then(existed => {
      if (existed)  return existed
      return fs.createDirectory({
        path: dir
      })
    })
    .then(() => {})
  }
}

export const getNativeFileSystemFlatStorage = singletonGetterByKey(
  (opts: NativeFileSystemFlatStorageOptions) => {
    return path.join(opts.rootDir, opts.baseDir)
  },
  (opts: NativeFileSystemFlatStorageOptions) => {
    return new NativeFileSystemFlatStorage(opts)
  }
)

export class ErrorWithCode extends Error {
  public code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = 'ErrorWithCode'
    this.code = code

    // Note: better to keep stack trace
    // reference: https://stackoverflow.com/a/32749533/1755633
    let captured = true

    if (typeof Error.captureStackTrace === 'function') {
      try {
        Error.captureStackTrace(this, this.constructor)
      } catch (e) {
        captured = false
      }
    }

    if (!captured) {
      this.stack = (new Error(message)).stack
    }
  }
}

export function getErrorMessageForCode (code: KantuFileAccess.ErrorCode) {
  switch (code) {
    case KantuFileAccess.ErrorCode.Succeeded:
      return 'Success'

    case KantuFileAccess.ErrorCode.Failed:
      return 'Failed to load'

    case KantuFileAccess.ErrorCode.Truncated:
      return 'File too large to load'

    default:
      return `Unknown error code: ${code}`
  }
}
