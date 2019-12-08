import { IWithLinkStorage, FlatStorageOptions, FlatStorage, FileInfo, readableSize, checkFileName } from './storage'
import fs, { ReadFileType } from '../../common/filesystem'
import { singletonGetterByKey } from '../../common/ts_utils'
import Ext = require('../../common/web_extension')

const isFirefox = () => {
  return /Firefox/.test(window.navigator.userAgent)
}

export type BrowserFileSystemFlatStorageOptions = FlatStorageOptions & {
  baseDir?: string;
}

export class BrowserFileSystemFlatStorage extends FlatStorage implements IWithLinkStorage {
  protected baseDir: string

  constructor (opts: BrowserFileSystemFlatStorageOptions) {
    super({
      encode: opts.encode,
      decode: opts.decode
    })
    const { baseDir = 'share' } = opts

    if (!baseDir || baseDir === '/') {
      throw new Error(`Invalid baseDir, ${baseDir}`)
    }

    this.baseDir = baseDir

    // Note: create the folder in which we will store files
    fs.getDirectory(baseDir, true)
  }

  getLink (fileName: string): Promise<string> {
    if (!isFirefox()) {
      const tmp   = Ext.extension.getURL('temporary')
      const link  = `filesystem:${tmp}/${this.filePath(encodeURIComponent(fileName))}`
      return Promise.resolve(link + '?' + new Date().getTime())
    } else {
      // Note: Except for Chrome, the filesystem API we use is a polyfill from idb.filesystem.js
      // idb.filesystem.js works great but the only problem is that you can't use 'filesystem:' schema to retrieve that file
      // so here, we have to convert the file to data url
      return <Promise<string>>this.read(this.filePath(fileName), 'DataURL')
    }
  }

  list (): Promise<FileInfo[]> {
    return fs.list(this.baseDir)
    .then(fileEntries => {
      const ps = fileEntries.map(fileEntry => {
        return fs.getMetadata(fileEntry)
        .then(meta => ({
          dir: this.baseDir,
          fileName: fileEntry.name,
          size: readableSize(meta.size),
          lastModified: meta.modificationTime
        }))
      })
      return Promise.all(ps)
    })
  }

  exists (fileName: string): Promise<boolean> {
    return fs.exists(this.filePath(fileName), { type: 'file' })
  }

  read (fileName: string, type: ReadFileType): Promise<string | ArrayBuffer | null> {
    return fs.readFile(this.filePath(fileName), type)
    .then(intermediate => this.decode(intermediate, fileName))
  }

  __write (fileName: string, content: Blob): Promise<void> {
    return Promise.resolve(this.encode(content, fileName))
    .then((encodedContent: any) => fs.writeFile(this.filePath(fileName, true), encodedContent))
    .then(() => {})
  }

  __overwrite (fileName: string, content: Blob): Promise<void> {
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
    return fs.removeFile(this.filePath(fileName))
  }

  __rename (fileName: string, newName: string): Promise<void> {
    return fs.moveFile(this.filePath(fileName), this.filePath(newName, true))
    .then(() => {})
  }

  private filePath (fileName: string, forceCheck?: boolean) {
    if (forceCheck) {
      checkFileName(fileName)
    }

    return this.baseDir + '/' + fileName.toLowerCase()
  }
}

export const getBrowserFileSystemFlatStorage = singletonGetterByKey<BrowserFileSystemFlatStorage>(
  (opts: BrowserFileSystemFlatStorageOptions) => {
    return (opts && opts.baseDir) || 'share'
  },
  (opts: BrowserFileSystemFlatStorageOptions) => {
    return new BrowserFileSystemFlatStorage(opts)
  }
) 