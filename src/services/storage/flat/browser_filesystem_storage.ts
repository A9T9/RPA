import { IWithLinkStorage, FlatStorageOptions, FlatStorage, FileInfo, readableSize, Content } from './storage'
import fs, { ReadFileType } from '@/common/filesystem'
import { singletonGetterByKey } from '@/common/ts_utils'
import Ext = require('@/common/web_extension')
import { sanitizeFileName } from '@/common/utils'
import path from '@/common/lib/path'

const isFirefox = () => {
  return /Firefox/.test(window.navigator.userAgent)
}

export type BrowserFileSystemFlatStorageOptions = FlatStorageOptions & {
  baseDir?: string;
  extensions: string[];
  shouldKeepExt: boolean;
  transformFileName?: (path: string) => string;
}

export class BrowserFileSystemFlatStorage extends FlatStorage implements IWithLinkStorage {
  protected baseDir: string
  protected extensions: string[]
  protected shouldKeepExt: boolean
  protected displayedCount: number = 0
  protected totalCount: number = 0
  protected transformFileName = (path: string) => path

  constructor (opts: BrowserFileSystemFlatStorageOptions) {
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

    this.baseDir       = baseDir
    this.extensions    = extensions
    this.shouldKeepExt = shouldKeepExt

    // Note: create the folder in which we will store files
    fs.getDirectory(baseDir, true)
  }

  getDisplayCount () {
    return this.displayedCount
  }

  getTotalCount () {
    return this.totalCount
  }

  getLink (fileName: string): Promise<string> {
    if (!isFirefox()) {
      const tmp   = Ext.runtime.getURL('temporary')
      const link  = `filesystem:${tmp}/${this.filePath(encodeURIComponent(fileName))}`
      return Promise.resolve(link + '?' + new Date().getTime())
    } else {
      // Note: Except for Chrome, the filesystem API we use is a polyfill from idb.filesystem.js
      // idb.filesystem.js works great but the only problem is that you can't use 'filesystem:' schema to retrieve that file
      // so here, we have to convert the file to data url
      return <Promise<string>>this.read(fileName, 'DataURL')
    }
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
          .catch(e => {
            return {
              fileName:     item.fileName,
              fullFilePath: this.filePath(item.fileName),
              error:        new Error(`Error in parsing ${this.filePath(item.fileName)}:\n${e.message}`)
            }
          })
        })
      )
      .then(list => {
        const errorFiles = list.filter(item => (<any>item).error)
        if (onErrorFiles) onErrorFiles(errorFiles)

        return <({ fileName: string, content: Content })[]>list.filter((item: any) => item.content)
      })
    })
  }

  __list (): Promise<FileInfo[]> {
    const convertName = (entryName: string) => this.shouldKeepExt ? entryName : this.removeExt(entryName)

    return this.ensureDir()
    .then(() => fs.list(this.baseDir))
    .then(fileEntries => {
      const ps = fileEntries.map(fileEntry => {
        return fs.getMetadata(fileEntry)
        .then(meta => ({
          dir:          this.baseDir,
          fileName:     this.transformFileName(convertName(fileEntry.name)),
          size:         readableSize(meta.size),
          lastModified: meta.modificationTime
        }))
      })

      return Promise.all(ps)
      .then(list => {
        list.sort((a, b) => {
          if (a.fileName < b.fileName)  return -1
          if (a.fileName > b.fileName)  return 1
          return 0
        })

        this.totalCount     = list.length
        this.displayedCount = list.length

        return list
      })
    })
  }

  exists (fileName: string): Promise<boolean> {
    return fs.exists(this.filePath(fileName), { type: 'file' })
  }

  read (fileName: string, type: ReadFileType): Promise<string | ArrayBuffer | null> {
    return fs.readFile(this.filePath(fileName), type)
    .then(intermediate => this.decode(intermediate, fileName))
  }

  __write (fileName: string, content: any): Promise<void> {
    return this.ensureDir()
    .then(() => this.remove(fileName))
    .catch(() => { /* Ignore any error */ })
    .then(() => this.encode(content, fileName))
    .then((encodedContent: any) => fs.writeFile(this.filePath(fileName, true), encodedContent))
    .then(() => {})
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
    .then(() => fs.removeFile(this.filePath(fileName)))
  }

  __rename (fileName: string, newName: string): Promise<void> {
    return this.ensureDir()
    .then(() => {
      return fs.moveFile(
        this.filePath(fileName),
        this.filePath(newName, true)
      )
    })
    .then(() => {})
  }

  __copy (fileName: string, newName: string): Promise<void> {
    return this.ensureDir()
    .then(() => {
      return fs.copyFile(
        this.filePath(fileName),
        this.filePath(newName, true)
      )
    })
    .then(() => {})
  }

  filePath (fileName: string, shouldSanitize: boolean = false) {
    const sanitized     = shouldSanitize ? sanitizeFileName(fileName) : fileName
    const existingExt   = path.extname(fileName)
    const ext           = this.extensions[0]
    const finalFileName = existingExt && existingExt.substr(1).toLowerCase() === ext.toLowerCase() ? sanitized: (sanitized + '.' + ext)

    return this.baseDir + '/' + this.transformFileName(finalFileName)
  }

  ensureDir (): Promise<void> {
    return fs.ensureDirectory(this.baseDir)
    .then(() => {})
  }

  private removeExt (fileNameWithExt: string) {
    const name: string = path.basename(fileNameWithExt)
    const ext: string  = path.extname(fileNameWithExt)
    const i: number    = name.lastIndexOf(ext)

    return name.substring(0, i)
  }
}

export const getBrowserFileSystemFlatStorage = singletonGetterByKey(
  (opts: BrowserFileSystemFlatStorageOptions) => {
    return (opts && opts.baseDir) || 'share'
  },
  (opts: BrowserFileSystemFlatStorageOptions) => {
    return new BrowserFileSystemFlatStorage(opts)
  }
)
