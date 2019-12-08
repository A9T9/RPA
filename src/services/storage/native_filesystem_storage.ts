import * as mime from 'mime'
import { IWithLinkStorage, FlatStorage, FlatStorageOptions, Content, FileInfo, readableSize, checkFileName } from './storage'
import { getNativeFileSystemAPI, NativeFileAPI, FileSystemEntry, FileSystemEntryWithInfo } from '../filesystem'
import { KantuFileAccess } from '../filesystem/kantu-file-access'
import { ReadFileType } from '../../common/filesystem'
import path from '../../common/lib/path'
import { dataURItoArrayBuffer, arrayBufferToString } from '../../common/utils'
import { singletonGetterByKey } from '../../common/ts_utils'

export type NativeFileSystemFlatStorageOptions = FlatStorageOptions & {
  rootDir: string;
  baseDir: string;
  extensions: string[];
  shouldKeepExt: boolean
}

export class NativeFileSystemFlatStorage extends FlatStorage implements IWithLinkStorage {
  protected rootDir: string
  protected baseDir: string
  protected extensions: string[]
  protected shouldKeepExt: boolean
  protected fs: NativeFileAPI

  constructor (opts: NativeFileSystemFlatStorageOptions) {
    super({
      encode: opts.encode,
      decode: opts.decode
    })
    const { baseDir, rootDir, extensions, shouldKeepExt = false } = opts

    if (!baseDir || baseDir === '/') {
      throw new Error(`Invalid baseDir, ${baseDir}`)
    }

    this.rootDir        = rootDir
    this.baseDir        = baseDir
    this.extensions     = extensions
    this.shouldKeepExt  = shouldKeepExt
    this.fs             = getNativeFileSystemAPI()
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
    return this.read(fileName, 'DataURL')
    .then((dataUrlWithoutPrefix) => {
      const ext     = this.extensions[0]
      const mimeStr = mime.getType(ext)
      if (!mimeStr || !mimeStr.length)  throw new Error(`Failed to find mime type for '${ext}'`)

      return `data:${mimeStr};base64,${dataUrlWithoutPrefix}`
    })
  }

  list (): Promise<FileInfo[]> {
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
          throw new Error(`failed to list, error code: ${errorCode}`)
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
  
        return entries.map(convert)
      })
    })
  }

  exists (fileName: string): Promise<boolean> {
    return this.fs.fileExists({
      path: this.filePath(fileName)
    })
  }

  read (fileName: string, type: ReadFileType): Promise<Content> {
    const onResolve = (res: KantuFileAccess.InvocationResult<string>) => {
      if (res.errorCode !== KantuFileAccess.ErrorCode.Succeeded) {
        throw new Error(`failed to read file '${fileName}', error code: ${res.errorCode}`)
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
        return this.fs.readAllText({
          path: this.filePath(fileName)
        })
        .then(onResolve)

      default:
        return this.fs.readAllBytes({
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
        path:     this.filePath(fileName),
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

  private filePath (fileName: string, forceCheck?: boolean) {
    if (forceCheck) {
      checkFileName(fileName)
    }

    const existingExt   = path.extname(fileName)
    const ext           = this.extensions[0]
    const finalFileName = existingExt && existingExt.substr(1).toLowerCase() === ext.toLowerCase() ? fileName: (fileName + '.' + ext)

    return path.join(this.rootDir, this.baseDir, finalFileName)
  }

  private removeExt (fileNameWithExt: string) {
    const name: string = path.basename(fileNameWithExt)
    const ext: string  = path.extname(fileNameWithExt)
    const i: number    = name.lastIndexOf(ext)

    return name.substring(0, i)
  }

  private ensureDir (): Promise<boolean> {
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
  }
}

export const getNativeFileSystemFlatStorage = singletonGetterByKey<NativeFileSystemFlatStorage>(
  (opts: NativeFileSystemFlatStorageOptions) => {
    return path.join(opts.rootDir, opts.baseDir)
  },
  (opts: NativeFileSystemFlatStorageOptions) => {
    return new NativeFileSystemFlatStorage(opts)
  }
)
