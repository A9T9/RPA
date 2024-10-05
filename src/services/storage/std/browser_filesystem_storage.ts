import { StandardStorage, Content, Entry, StandardStorageOptions } from './standard_storage'
import { IBrowserFileSystem, ReadFileType } from '@/common/filesystem'
import { posix as path } from '@/common/lib/path'
import { sanitizeFileName } from '@/common/utils'
import { IWithLinkStorage } from '../flat/storage'
import { isFirefox } from '@/common/dom_utils'
import Ext from '@/common/web_extension'
import { singletonGetterByKey } from '@/common/ts_utils'
import { getBrowserFileSystem } from '@/services/storage/common/filesystem_delegate/delegate'

export type BrowserFileSystemsStandardStorageOptions = StandardStorageOptions & {
  baseDir?: string;
  extensions: string[];
  shouldKeepExt: boolean;
  transformFileName?: (path: string) => string;
}

export class BrowserFileSystemStandardStorage extends StandardStorage implements IWithLinkStorage {
  protected fs: IBrowserFileSystem
  protected baseDir: string
  protected extensions: string[]
  protected shouldKeepExt: boolean
  protected transformFileName = (path: string) => path

  constructor (opts: BrowserFileSystemsStandardStorageOptions) {
    super({
      encode: opts.encode,
      decode: opts.decode
    })
    const { extensions, shouldKeepExt, transformFileName, baseDir = 'share' } = opts

    if (!baseDir || baseDir === '/') {
      throw new Error(`Invalid baseDir, ${baseDir}`)
    }

    if (transformFileName) {
      this.transformFileName = transformFileName
    }

    this.fs            = getBrowserFileSystem()
    this.baseDir       = baseDir
    this.extensions    = extensions
    this.shouldKeepExt = shouldKeepExt

    // Note: create the folder in which we will store files
    this.fs.getDirectory(baseDir, true)
  }

  public getLink (filePath: string): Promise<string> {
    if (!isFirefox()) {
      const tmp   = Ext.runtime.getURL('temporary')
      const link  = `filesystem:${tmp}/${this.filePath(filePath)}`
      return Promise.resolve(link + '?' + new Date().getTime())
    } else {
      // Note: Except for Chrome, the filesystem API we use is a polyfill from idb.filesystem.js
      // idb.filesystem.js works great but the only problem is that you can't use 'filesystem:' schema to retrieve that file
      // so here, we have to convert the file to data url
      return <Promise<string>>this.read(filePath, 'DataURL')
    }
  }

  public read (filePath: string, type: ReadFileType): Promise<Content> {
    const fullPath     = this.filePath(filePath)
    const relativePath = path.relative(this.dirPath('/'), fullPath)

    return this.fs.readFile(fullPath, type)
    .then(
      intermediate => this.decode(intermediate, relativePath, type),
      error => {
        if (error.message.indexOf("A requested file or directory could not be found") !== -1) {
          throw new Error(`Error #301: File not found (file names are case-sensitive): ${filePath}`)
        }
        return Promise.reject(error)
      }
    )
  }

  public stat (entryPath: string, isDir?: boolean): Promise<Entry> {
    const name         = path.basename(entryPath)
    const dir          = path.dirname(entryPath)
    const fullPath     = isDir ? this.dirPath(entryPath) : this.filePath(entryPath)
    const relativePath = path.relative(this.dirPath('/'), fullPath)

    return this.fs.existsStat(fullPath)
    .then(({ isFile, isDirectory }) => {
      // Note: idb.filesystem.js (we use it as polyfill for firefox) doesn't support getMetadata on folder yet
      // so we simply set size/lastModified to empty value for now.

      if (!isFile) {
        return {
          dir,
          name,
          fullPath,
          relativePath,
          isFile,
          isDirectory,
          size: 0,
          lastModified: new Date(0)
        }
      }

      return this.fs.getMetadata(fullPath, isDirectory)
      .then((meta) => {
        return {
          dir,
          name,
          fullPath,
          relativePath,
          isFile,
          isDirectory,
          size: meta.size,
          lastModified: meta.modificationTime
        }
      })
    })
  }

  protected __list (directoryPath: string = '/', brief: boolean = false): Promise<Entry[]> {
    // TODO: Ignore brief param for browser fs for now
    const convertName = (entryName: string, isDirectory: boolean) => {
      return this.shouldKeepExt || isDirectory ? entryName : this.removeExt(entryName)
    }

    return this.ensureBaseDir()
    .then(() => this.fs.list(
      this.dirPath(directoryPath)
    ))
    .then(fileEntries => {
      const ps = fileEntries.map(fileEntry => {
        return this.stat(fileEntry.fullPath, fileEntry.isDirectory)
        .then((stat) => ({
          ...stat,
          name: this.transformFileName(convertName(stat.name, fileEntry.isDirectory))
        }))
      })

      return Promise.all(ps)
      .then(list => {
        list.sort((a, b) => {
          if (a.name < b.name)  return -1
          if (a.name > b.name)  return 1
          return 0
        })

        this.totalCount     = list.length
        this.displayedCount = list.length

        return list
      })
    })
  }

  protected __write (filePath: string, content: any): Promise<void> {
    return this.ensureBaseDir()
    .then(() => this.remove(filePath))
    .catch(() => { /* Ignore any error */ })
    .then(() => this.encode(content, filePath))
    .then((encodedContent: any) => this.fs.writeFile(this.filePath(filePath, true), encodedContent))
    .then(() => {})
  }

  protected __overwrite (filePath: string, content: any): Promise<void> {
    return this.__write(filePath, content)
  }

  protected __removeFile (filePath: string): Promise<void> {
    return this.fs.removeFile(this.filePath(filePath))
  }

  protected __removeEmptyDirectory (directoryPath: string): Promise<void> {
    return this.fs.rmdir(this.dirPath(directoryPath))
  }

  protected __moveFile (filePath: string, newPath: string): Promise<void> {
    return this.fs.moveFile(
      this.filePath(filePath),
      this.filePath(newPath, true)
    )
    .then(() => {})
  }

  protected __copyFile (filePath: string, newPath: string): Promise<void> {
    return this.fs.copyFile(
      this.filePath(filePath),
      this.filePath(newPath, true)
    )
    .then(() => {})
  }

  protected __createDirectory (directoryPath: string): Promise<void> {
    return this.fs.getDirectory(this.dirPath(directoryPath, true), true)
    .then(() => {})
  }

  public dirPath (dir: string, shouldSanitize: boolean = false) {
    const path = this.getPathLib()
    const absPath = (() => {
      if (this.isStartWithBaseDir(dir)) {
        return dir
      } else {
        return path.join('/', this.baseDir, dir)
      }
    })()

    const dirName       = path.dirname(absPath)
    const baseName      = path.basename(absPath)
    const sanitized     = shouldSanitize ? sanitizeFileName(baseName) : baseName

    return path.join(dirName, sanitized)
  }

  public isWin32Path (): boolean {
    return false
  }

  public filePath (filePath: string, shouldSanitize: boolean = false) {
    const dirName       = path.dirname(filePath)
    const baseName      = path.basename(filePath)
    const sanitized     = shouldSanitize ? sanitizeFileName(baseName) : baseName
    const existingExt   = path.extname(baseName)
    const ext           = this.extensions[0]
    const finalFileName = existingExt && existingExt.substr(1).toLowerCase() === ext.toLowerCase() ? sanitized: (sanitized + '.' + ext)

    if (this.isStartWithBaseDir(dirName)) {
      return path.join(dirName, this.transformFileName(finalFileName))
    } else {
      return path.join('/', this.baseDir, dirName, this.transformFileName(finalFileName))
    }
  }

  private isStartWithBaseDir (str: string): boolean {
    return str.indexOf('/' + this.baseDir) === 0
  }

  private ensureBaseDir (): Promise<void> {
    return this.fs.ensureDirectory(this.baseDir)
    .then(() => {})
  }

  private removeExt (fileNameWithExt: string) {
    const name: string = path.basename(fileNameWithExt)
    const ext: string  = path.extname(fileNameWithExt)
    const i: number    = name.lastIndexOf(ext)

    return name.substring(0, i)
  }
}


export const getBrowserFileSystemStandardStorage = singletonGetterByKey(
  (opts: BrowserFileSystemsStandardStorageOptions) => {
    return (opts && opts.baseDir) || 'share'
  },
  (opts: BrowserFileSystemsStandardStorageOptions) => {
    return new BrowserFileSystemStandardStorage(opts)
  }
)
