import EventEmitter from 'eventemitter3'
import fs, { ReadFileType } from '@/common/filesystem'
import debounce = require('lodash.debounce')
import { Tree } from '@/common/types'
import { flatten, nodeCount, sum } from '@/common/ts_utils'
import { posix, win32 } from '@/common/lib/path'
import { EEXIST, ENOTDIR, ENOENT } from '../error'

export type Content = string | ArrayBuffer | null

export type Entry = {
  dir:          string;
  name:         string;
  relativePath: string;
  fullPath:     string;
  size:         number;
  isFile:       boolean;
  isDirectory:  boolean;
  lastModified: Date;
}

export type EntryNode = Tree<Entry>

export interface IStandardStorage {
  list: (directoryPath: string) => Promise<Entry[]>;
  listR: (directoryPath: string) => Promise<EntryNode[]>;
  stat: (path: string) => Promise<Entry>;

  exists: (path: string) => Promise<boolean>;
  fileExists: (path: string) => Promise<boolean>;
  directoryExists: (path: string) => Promise<boolean>;

  read: (filePath: string, type: ReadFileType) => Promise<Content>;
  readR: (directoryPath: string, readFileType?: ReadFileType, onErrorFiles?: Function) => Promise<Array<{ filePath: string, content: Content }>>;

  write:      (filePath: string, content: Content) => Promise<void>;
  overwrite:  (filePath: string, content: Content) => Promise<void>;
  bulkWrite: (list: Array<{ filePath: string, content: Content }>) => Promise<void>;

  createDirectory (directoryPath: string): Promise<void>;
  ensureDirectory (directoryPath: string): Promise<void>;

  removeFile: (filePath: string) => Promise<void>;
  removeDirectory: (directoryPath: string) => Promise<void>;
  removeEmptyDirectory: (directoryPath: string) => Promise<void>;
  remove: (path: string) => Promise<void>;
  clear: () => Promise<void>;

  moveFile: (filePath: string, newPath: string) => Promise<void>;
  copyFile: (filePath: string, newPath: string) => Promise<void>;
  moveDirectory: (directoryPath: string, newPath: string) => Promise<void>;
  copyDirectory: (directoryPath: string, newPath: string) => Promise<void>;
  move: (path: string, newPath: string, isSourceDirectory?: boolean, isTargetDirectory?: boolean) => Promise<void>;
  copy: (path: string, newPath: string, isSourceDirectory?: boolean, isTargetDirectory?: boolean) => Promise<void>;

  // These three are introduced to be compatible with FlatStorage
  readAll:    () => Promise<({ fileName: string, content: Content })[]>;
  rename:     (filePath: string, newPath: string) => Promise<void>;
  ensureDir:  () => Promise<void>;

  dirPath: (dir: string) => string;
  filePath: (filePath: string, shouldSanitize?: boolean) => string;
  relativePath: (filePath: string, isDirectory?: boolean) => string;
  isWin32Path: () => boolean;
  isTargetInSourceDirectory (targetPath: string, sourcePath: string): boolean;
}

export enum StorageEvent {
  ListChanged   = 'list_changed',
  FilesChanged  = 'files_changed'
}

export enum EntryStatus {
  Unknown,
  NonExistent,
  File,
  Directory
}

export type StandardStorageOptions = {
  encode?: (data: Content, fileName: string) => (any | Promise<any>);
  decode?: (data: any, fileName: string, readFileType: ReadFileType) => (Content | Promise<Content>);
  listFilter?: (entries: EntryNode[]) => EntryNode[] | Promise<EntryNode[]>;
}

export abstract class StandardStorage extends EventEmitter implements IStandardStorage {
  public abstract read (filePath: string, type: ReadFileType): Promise<Content>;
  public abstract stat (path: string, isDirectory?: boolean): Promise<Entry>;
  public abstract dirPath (dir: string): string;
  public abstract filePath (filePath: string, shouldSanitize?: boolean): string;
  public abstract isWin32Path (): boolean;

  protected abstract __list (directoryPath: string, brief?: boolean): Promise<Entry[]>
  protected abstract __write (filePath: string, content: any): Promise<void>
  protected abstract __overwrite (filePath: string, content: any): Promise<void>
  protected abstract __removeFile (filePath: string): Promise<void>;
  protected abstract __removeEmptyDirectory (directoryPath: string): Promise<void>;
  protected abstract __moveFile (filePath: string, newPath: string): Promise<void>;
  protected abstract __copyFile (filePath: string, newPath: string): Promise<void>;
  protected abstract __createDirectory (directoryPath: string): Promise<void>;

  protected encode: (data: any, fileName: string) => Content | Promise<Content> = (x, fileName) => <Content>x
  protected decode: (data: Content, fileName: string, readFileType: ReadFileType) => any | Promise<any> = (x, fileName) => x

  protected displayedCount: number = 0
  protected totalCount: number = 0
  protected listFilter: (entries: EntryNode[]) => EntryNode[] | Promise<EntryNode[]> = (list) => list

  constructor (options: StandardStorageOptions = {}) {
    super()

    if (options.decode) {
      this.decode = options.decode
    }

    if (options.encode) {
      this.encode = options.encode
    }

    if (options.listFilter) {
      this.listFilter = options.listFilter
    }
  }

  getPathLib (): any {
    // Note: only subclass knows whether it should use win32/posix style path
    return this.isWin32Path() ? win32 : posix
  }

  relativePath (entryPath: string, isDirectory?: boolean): string {
    const absPath   = isDirectory ? this.dirPath(entryPath) : this.filePath(entryPath)
    const rootPath  = this.dirPath('/')

    return this.getPathLib().relative(rootPath, absPath)
  }

  entryPath (entryPath: string, isDirectory?: boolean): string {
    return isDirectory ? this.dirPath(entryPath) : this.filePath(entryPath)
  }

  list (directoryPath: string = '/', brief: boolean = false): Promise<Entry[]> {
    return this.__list(directoryPath, brief)
    .then((items: Entry[]) => {
      return this.sortEntries(items)
    })
  }

  listR (directoryPath: string = '/'): Promise<EntryNode[]> {
    const listDir = (dir: string): Promise<EntryNode[]> => {
      return this.list(dir, false)
      .then((entries: Entry[]) => {
        return Promise.all(
          entries.map((entry) => {
            if (entry.isDirectory) {
              return listDir(entry.fullPath)
            }
            return Promise.resolve(null)
          })
        )
        .then((listOfEntries: Array<EntryNode[] | null>) => {
          return this.sortEntries(
            entries.map((entry, i) => ({
              ...entry,
              children: listOfEntries[i] || []
            }))
          )
        })
      })
    }

    return listDir(directoryPath)
    .then((entryNodes: EntryNode[]) => {
      if (directoryPath !== '/') {
        return entryNodes
      }

      return Promise.resolve(
        this.listFilter(entryNodes)
      )
      .then(displayEntryNodes => {
        this.totalCount     = sum(...entryNodes.map(nodeCount))
        this.displayedCount = sum(...displayEntryNodes.map(nodeCount))

        return displayEntryNodes
      })
    })
  }

  getDisplayCount () {
    return this.displayedCount
  }

  getTotalCount () {
    return this.totalCount
  }

  exists (path: string): Promise<boolean> {
    return this.stat(path)
    .then(
      ({ isFile, isDirectory }) => isFile || isDirectory,
      () => false
    )
  }

  fileExists (path: string): Promise<boolean> {
    return this.stat(path)
    .then(
      (entry) => entry.isFile,
      () => false
    )
  }

  directoryExists (path: string): Promise<boolean> {
    return this.stat(path, true)
    .then(
      (entry) => {
        return entry.isDirectory
      },
      () => false
    )
  }

  readR (
    directoryPath: string,
    readFileType: ReadFileType = 'Text',
    onErrorFiles?: Function
  ): Promise<Array<{ filePath: string, content: Content }>> {
    return this.listR(directoryPath)
    .then((entryNodes: EntryNode[]) => {
      return Promise.all(
        entryNodes.map((node) => {
          if (node.isFile) {
            return this.read(node.fullPath, readFileType)
            .then((content) => [{
              content:  content as any,
              filePath: node.fullPath
            }])
          }

          if (node.isDirectory) {
            return this.readR(node.fullPath, readFileType)
          }

          throw new Error('Not file or directory')
        })
      )
      .then((result: Array<Array<{ filePath: string, content: Content }>>) => {
        return flatten(result)
      })
    })
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

  bulkWrite (list: ({ filePath: string, content: any })[]): Promise<void> {
    return Promise.all(
      list.map(item => this.write(item.filePath, item.content))
    )
    .then(() => {})
  }

  removeFile (filePath: string): Promise<void> {
    return this.__removeFile(filePath)
    .then(() => {
      this.emitListChanged()
    })
  }

  removeEmptyDirectory (directoryPath: string): Promise<void> {
    return this.__removeEmptyDirectory(directoryPath)
    .then(() => {
      this.emitListChanged()
    })
  }

  removeDirectory (directoryPath: string): Promise<void> {
    return this.remove(directoryPath, true)
  }

  remove (path: string, isDirectory?: boolean): Promise<void> {
    return this.stat(path, isDirectory)
    .then((entry) => {
      if (entry.isFile) {
        return this.removeFile(entry.fullPath)
      }

      if (entry.isDirectory) {
        return this.list(entry.fullPath)
        .then((entries) => {
          return Promise.all(
            entries.map((item) => this.remove(item.fullPath, item.isDirectory))
          )
          .then(() => this.removeEmptyDirectory(entry.fullPath))
        })
      }

      throw new Error('Not file or directory')
    })
  }

  clear (): Promise<void> {
    return this.list('/')
    .then((entries) => {
      return Promise.all(
        entries.map((entry) => this.remove(entry.fullPath))
      )
      .then(() => {})
    })
  }

  moveFile (filePath: string, newPath: string): Promise<void> {
    return this.__moveFile(filePath, newPath)
    .then(() => {
      this.emitListChanged()
    })
  }

  copyFile (filePath: string, newPath: string): Promise<void> {
    return this.__copyFile(filePath, newPath)
    .then(() => {
      this.emitListChanged()
    })
  }

  moveDirectory (directoryPath: string, newPath: string): Promise<void> {
    return this.move(directoryPath, newPath, true, true)
  }

  copyDirectory (directoryPath: string, newPath: string): Promise<void> {
    return this.copy(directoryPath, newPath, true, true)
  }

  move (src: string, dst: string, isSourceDirectory?: boolean, isTargetDirectory?: boolean): Promise<void> {
    const absSrc = this.entryPath(src, isSourceDirectory)
    const absDst = this.entryPath(dst, isTargetDirectory)

    if (absSrc === absDst) {
      throw new Error('move: src should not be the same as dst')
    }

    if (this.getPathLib().dirname(absSrc) === absDst) {
      throw new Error('move: cannot move to original dir')
    }

    if (isSourceDirectory && isTargetDirectory && this.isTargetInSourceDirectory(dst, src)) {
      throw new Error('Cannot move a directory into its sub directory')
    }

    // It's slow to copy then remove. Subclass should definitely
    // override this method if it has native support for move operation
    return this.copy(src, dst, isSourceDirectory, isTargetDirectory)
    .then(() => this.remove(src, isSourceDirectory))
  }

  copy (src: string, dst: string, isSourceDirectory?: boolean, isTargetDirectory?: boolean): Promise<void> {
    const srcDir    = this.getPathLib().dirname(src)
    const dstDir    = this.getPathLib().dirname(dst)
    const isSameDir = srcDir === dstDir

    if (src === dst) {
      throw new Error('copy: dst should not be the same as src')
    }

    return Promise.all([
      this.getEntryStatus(src, isSourceDirectory),
      this.getEntryStatus(dst, isTargetDirectory),
      isSameDir? Promise.resolve(EntryStatus.Directory) : this.getEntryStatus(this.getPathLib().dirname(dst), true)
    ])
    .then((triple: [EntryStatus, EntryStatus, EntryStatus]) => {
      const [srcStatus, dstStatus, dstDirStatus] = triple

      if (dstDirStatus !== EntryStatus.Directory) {
        throw new ENOTDIR(this.getPathLib().dirname(dst))
      }

      switch (srcStatus) {
        case EntryStatus.NonExistent:
          throw new ENOENT(src)

        case EntryStatus.Unknown:
          throw new Error(`source (${src}) exists but is neither a file nor a directory`)

        case EntryStatus.File: {
          switch (dstStatus) {
            case EntryStatus.File:
              throw new EEXIST(dst)

            case EntryStatus.Unknown:
              throw new Error(`dst '${dst}' is neither a file nor directory`)

            case EntryStatus.Directory: {
              const dstFilePath = this.getPathLib().resolve(dst, this.getPathLib().basename(src))
              return this.copyFile(src, dstFilePath)
            }

            case EntryStatus.NonExistent: {
              return this.copyFile(src, dst)
            }
          }
        }

        case EntryStatus.Directory: {
          switch (dstStatus) {
            case EntryStatus.File:
              throw new Error(`dst '${dst}' is an existing file, but src '${src}' is a directory`)

            case EntryStatus.Unknown:
              throw new Error(`dst '${dst}' is neither a file nor directory`)

            case EntryStatus.Directory: {
              if (this.isTargetInSourceDirectory(dst, src)) {
                throw new Error('Cannot copy a directory into its sub directory')
              }

              const dstDir = this.getPathLib().resolve(dst, this.getPathLib().basename(src))

              return this.ensureDirectory(dstDir)
              .then(() => this.copyAllInDirectory(src, dstDir))
            }

            case EntryStatus.NonExistent: {
              return this.ensureDirectory(dst)
              .then(() => this.copyAllInDirectory(src, dst))
            }
          }
        }
      }
    })
  }

  createDirectory (directoryPath: string): Promise<void> {
    return this.mkdir(directoryPath, false)
  }

  ensureDirectory (directoryPath: string): Promise<void> {
    return this.getEntryStatus(directoryPath, true)
    .then((status) => {
      switch (status) {
        case EntryStatus.File:
        case EntryStatus.Unknown:
          throw new EEXIST()

        case EntryStatus.Directory:
          return

        case EntryStatus.NonExistent:
          return this.mkdir(directoryPath, true)
      }
    })
  }

  ensureDir (): Promise<void> {
    return this.ensureDirectory('/')
  }

  rename (filePath: string, newPath: string): Promise<void> {
    return this.move(filePath, newPath)
  }

  readAll (readFileType: ReadFileType = 'Text', onErrorFiles?: Function): Promise<({ fileName: string, content: Content })[]> {
    return this.list('/')
    .then((items: Entry[]) => {
      return Promise.all(
        items
        .filter(item => item.isFile)
        .map(item => {
          return this.read(item.fullPath, readFileType)
          .then(content => ({
            content,
            fileName: item.name
          }))
          // Note: Whenever there is error in reading file,
          // return null
          .catch(e => {
            return {
              fileName:     item.name,
              fullFilePath: item.fullPath,
              error:        new Error(`Error in parsing ${item.fullPath}:\n${e.message}`)
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

  isTargetInSourceDirectory (targetPath: string, sourcePath: string): boolean {
    const dstPath = this.dirPath(targetPath)
    const srcPath = this.dirPath(sourcePath)
    const sep     = this.getPathLib().sep

    const relativePath = this.getPathLib().relative(srcPath, dstPath)
    const parts        = relativePath.split(sep)

    return parts.indexOf('..') === -1
  }

  protected sortEntries <T extends Entry> (entries: T[]): T[] {
    // Sort entries in this order
    // 1. Directories come before files
    // 2. Inside directories or files, sort it alphabetically a-z (ignore case)
    const items = [...entries]

    items.sort((a, b) => {
      if (a.isDirectory && b.isFile) {
        return -1
      }

      if (a.isFile && b.isDirectory) {
        return 1
      }

      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()

      if (aName < bName)  return -1
      if (aName > bName)  return 1
      return 0
    })

    return items
  }

  protected copyAllInDirectory (srcDir: string, dstDir: string): Promise<void> {
    return this.list(srcDir)
    .then((entries: Entry[]) => {
      return Promise.all(
        entries.map((entry) => {
          if (entry.isFile) {
            return this.copyFile(
              entry.fullPath,
              this.getPathLib().resolve(dstDir, entry.name)
            )
          }

          if (entry.isDirectory) {
            const dstSubDir = this.getPathLib().resolve(dstDir, entry.name)

            return this.ensureDirectory(dstSubDir)
            .then(() => this.copyAllInDirectory(entry.fullPath, dstSubDir))
          }

          return Promise.resolve()
        })
      )
      .then(() => {})
    })
  }

  protected mkdir (dir: string, sureAboutNonExistent: boolean = false): Promise<void> {
    const makeSureNonExistent = () => {
      if (sureAboutNonExistent) {
        return Promise.resolve()
      }

      return this.getEntryStatus(dir, true)
      .then((status) => {
        if (status !== EntryStatus.NonExistent) {
          throw new EEXIST(dir)
        }
      })
    }

    return makeSureNonExistent()
    .then(() => {
      const parentDir = this.getPathLib().dirname(dir)

      if (parentDir === '/') {
        return this.__createDirectory(dir)
      }

      return this.getEntryStatus(parentDir, true)
      .then((status) => {
        switch (status) {
          case EntryStatus.File:
          case EntryStatus.Unknown:
            throw new EEXIST(parentDir)

          case EntryStatus.Directory:
            return this.__createDirectory(dir)

          case EntryStatus.NonExistent:
            return this.mkdir(parentDir, true)
            .then(() => this.__createDirectory(dir))
        }
      })
    })
    .then(() => {
      this.emitListChanged()
    })
  }

  protected getEntryStatus (path: string, isDirectory?: boolean) {
    return this.stat(path, isDirectory)
    .then(
      (entry: Entry) => {
        if (entry.isFile)       return EntryStatus.File
        if (entry.isDirectory)  return EntryStatus.Directory

        return EntryStatus.NonExistent
      },
      (e: Error) => {
        return EntryStatus.NonExistent
      }
    )
  }

  // Q: Why do we need debounce for followingemitXXX?
  // A: So that there could be more than 1 invocation of emitXXX in one operation
  //    And it will just emit once. For downstream like React / Vue, it won't trigger
  //    unnecessary render

  // Note: list changed event is for move (rename) / remove / clear / write a new file
  protected emitListChanged = debounce(() => {
    // FIXME:
    this.list('/')
    .then(fileInfos => {
      this.emit(StorageEvent.ListChanged, fileInfos)
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

      this.emit(StorageEvent.FilesChanged, changedFiles)
    })
  }, 100)
}

