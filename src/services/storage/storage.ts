import * as EventEmitter from 'eventemitter3'
import { ReadFileType as RFT } from '../../common/filesystem'
import { withFileExtension, validateStandardName } from '../../common/utils'
import debounce = require('lodash.debounce')
import { StorageManager } from '.';

export type ReadFileType = RFT

export type Content = string | ArrayBuffer | null

export interface IFlatStorage {
  list:       () => Promise<FileInfo[]>;
  exists:     (fileName: string) => Promise<boolean>;
  read:       (fileName: string, type: ReadFileType) => Promise<Content>;
  readAll:    () => Promise<({ fileName: string, content: Content })[]>
  bulkWrite:  (list: ({ fileName: string, content: any })[]) => Promise<void>;
  write:      (fileName: string, content: any) => Promise<void>;
  overwrite:  (fileName: string, content: any) => Promise<void>;
  clear:      () => Promise<void>;
  remove:     (fileName: string) => Promise<void>;
  rename:     (fileName: string, newName: string) => Promise<void>;
}

export interface IWithLinkStorage {
  getLink:    (fileName: string) => Promise<string>
}

export type FileInfo = {
  dir: string;
  fileName: string;
  size: string;
  lastModified: Date;
}

export enum FlatStorageEvent {
  ListChanged   = 'list_changed',
  FilesChanged  = 'files_changed'
}

export type FlatStorageOptions = {
  encode?: (data: Content, fileName: string) => any | Promise<any>;
  decode?: (data: any, fileName: string) => Content | Promise<Content>;
}

export abstract class FlatStorage extends EventEmitter implements IFlatStorage {
  abstract list (): Promise<FileInfo[]>
  abstract exists (fileName: string): Promise<boolean>
  abstract read (fileName: string, type: ReadFileType): Promise<Content>

  protected abstract __write (fileName: string, content: any): Promise<void>
  protected abstract __overwrite (fileName: string, content: any): Promise<void>
  protected abstract __clear (): Promise<void>
  protected abstract __remove (fileName: string): Promise<void>
  protected abstract __rename (fileName: string, newName: string): Promise<void>

  protected encode: (data: any, fileName: string) => Content | Promise<Content> = (x, fileName) => <Content>x
  protected decode: (data: Content, fileName: string) => any | Promise<any> = (x, fileName) => x

  constructor (options: FlatStorageOptions = {}) {
    super()

    if (options.decode) {
      this.decode = options.decode
    }

    if (options.encode) {
      this.encode = options.encode
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
        })
      )
    })
  }

  bulkWrite (list: ({ fileName: string, content: any })[]): Promise<void> {
    return Promise.all(
      list.map(item => this.write(item.fileName, item.content))
    )
    .then(() => {})
  }

  write (fileName: string, content: any): Promise<void> {
    return this.exists(fileName)
    .then(isExist => {
      const next = () => {
        if (!isExist) this.emitListChanged()
        this.emitFilesChanged([fileName])
      }

      return this.__write(fileName, content)
      .then(next)
    })
  }

  overwrite (fileName: string, content: any): Promise<void> {
    return this.__overwrite(fileName, content)
    .then(() => {
      this.emitFilesChanged([fileName])
    })
  }

  clear (): Promise<void> {
    return this.__clear()
    .then(() => {
      this.emitListChanged()
    })
  }

  remove (fileName: string): Promise<void> {
    return this.__remove(fileName)
    .then(() => {
      this.emitListChanged()
    })
  }

  rename (fileName: string, newName: string): Promise<void> {
    return this.__rename(fileName, newName)
    .then(() => {
      this.emitListChanged()
      this.emitFilesChanged([newName])
    })
  }

  // Q: Why do we need debounce for followingemitXXX?
  // A: So that there could be more than 1 invocation of emitXXX in one operation
  //    And it will just emit once. For downstream like React / Vue, it won't trigger
  //    unnecessary render

  // Note: list changed event is for move (rename) / remove / clear / write a new file
  protected emitListChanged = debounce(() => {
    this.list()
    .then(fileInfos => {
      this.emit(FlatStorageEvent.ListChanged, fileInfos)
    })
  }, 100)

  // Note: files changed event is for write file only  (rename excluded)
  protected emitFilesChanged (fileNames: string[]) {
    this.changedFileNames = fileNames.reduce((prev: string[], fileName: string) => {
      if (prev.indexOf(fileName) === -1) prev.push(fileName)
      return prev
    }, this.changedFileNames)

    this.__emitFilesChanged()
  }

  protected changedFileNames: string[] = []

  protected __emitFilesChanged = debounce(() => {
    const fileNames = this.changedFileNames

    // Note: clear changedFileNames right after this method is called,
    // instead of waiting till promise resolved
    // so that new file changes won't be blocked or affect current emit
    this.changedFileNames = []

    return Promise.all(
      fileNames.map(fileName => {
        return this.read(fileName, 'Text')
        .catch(() => null)
      })
    )
    .then(contents => {
      if (contents.length === 0)  return

      // Note: in case some files don't exist any more, filter by content
      const changedFiles = contents.map((content, i) => ({
        content,
        fileName: fileNames[i]
      }))
      .filter(item => !!item.content)
      
      this.emit(FlatStorageEvent.FilesChanged, changedFiles)
    })
  }, 100)
}

export const readableSize = (byteSize: number): string => {
  const kb = 1024
  const mb = kb * kb

  if (byteSize < kb) {
    return byteSize + ' byte'
  }

  if (byteSize < mb) {
    return (byteSize / kb).toFixed(1) + ' KB'
  }

  return (byteSize / mb).toFixed(1) + ' MB'
}

export function checkFileName (fileName: string): void {
  withFileExtension(fileName, (baseName: string) => {
    try {
      validateStandardName(baseName, true)
    } catch (e) {
      throw new Error(`Invalid file name '${fileName}'. File name ` + e.message)
    }
    return baseName
  })
}
