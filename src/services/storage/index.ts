import EventEmitter from 'eventemitter3'
import { IWithLinkStorage } from './flat/storage'
import { getBrowserFileSystemStandardStorage } from './std/browser_filesystem_storage'
import { getNativeFileSystemStandardStorage } from './std/native_filesystem_storage'
import { singletonGetter, forestSlice } from '../../common/ts_utils'
import { getXFile } from '../xmodules/xfile'
import { Macro, fromJSONString, toJSONString, fromJsFileText, toJsFileText } from '../../common/convert_utils'
import { blobToDataURL } from '../../common/utils'
import { StandardStorage, Entry, EntryNode, Content } from './std/standard_storage';
import path from '@/common/lib/path';
import { ReadFileType } from '@/common/filesystem'

export enum StorageStrategyType {
  Browser = 'browser',
  XFile = 'xfile',
  Nil = 'nil'
}

export enum StorageTarget {
  Macro,
  CSV,
  Screenshot,
  Vision
}

export enum StorageManagerEvent {
  StrategyTypeChanged = 'StrategyTypeChanged',
  RootDirChanged = 'RootDirChanged',
  ForceReload = 'ForceReload'
}

export interface IStorageManager {
  getCurrentStrategyType: () => StorageStrategyType;
  setCurrentStrategyType: (type: StorageStrategyType) => boolean;
  getStorageForTarget: (target: StorageTarget) => StandardStorage;
  isStrategyTypeAvailable: (type: StorageStrategyType) => Promise<boolean>;
}

export type StorageManagerOptions = {
  getMaxMacroCount: (strategyType: StorageStrategyType) => Promise<number>;
  getConfig?: () => Record<string, any>;
}

export class StorageManager extends EventEmitter implements IStorageManager {
  private strategyType: StorageStrategyType = StorageStrategyType.Nil
  private getMaxMacroCount: ((strategyType: StorageStrategyType) => Promise<number>) = (s) => Promise.resolve(Infinity)
  private getConfig?: () => Record<string, any>;

  constructor (strategyType: StorageStrategyType, extraOptions?: StorageManagerOptions) {
    super()
    this.setCurrentStrategyType(strategyType)

    if (extraOptions && extraOptions.getMaxMacroCount) {
      this.getMaxMacroCount = extraOptions.getMaxMacroCount
    }

    this.getConfig = extraOptions?.getConfig;
  }

  isXFileMode () {
    return this.strategyType === StorageStrategyType.XFile
  }

  isBrowserMode () {
    return this.strategyType === StorageStrategyType.Browser
  }

  getCurrentStrategyType () {
    return this.strategyType
  }

  setCurrentStrategyType (type: StorageStrategyType): boolean {
    const needChange = type !== this.strategyType

    if (needChange) {
      setTimeout(() => {
        this.emit(StorageManagerEvent.StrategyTypeChanged, type)
      }, 0)

      this.strategyType = type
    }

    return needChange
  }

  isStrategyTypeAvailable (type: StorageStrategyType): Promise<boolean> {
    switch (type) {
      case StorageStrategyType.Browser:
        return Promise.resolve(true)

      case StorageStrategyType.XFile:
        return getXFile().sanityCheck()

      default:
        throw new Error(`type '${type}' is not supported`)
    }
  }

  getStorageForTarget (target: StorageTarget, forceStrategytype?: StorageStrategyType): StandardStorage {
    switch (forceStrategytype || this.strategyType) {
      case StorageStrategyType.Browser: {
        switch (target) {
          case StorageTarget.Macro: {
            const storage = getBrowserFileSystemStandardStorage({
              baseDir: 'macros',
              extensions: ['json'],
              shouldKeepExt: false,
              decode: (text: string, filePath: string) => {
                const obj = fromJSONString(text, path.basename(filePath), { withStatus: true })

                // Note: use filePath as id
                return {
                  ...obj,
                  id:   storage.filePath(filePath),
                  path: storage.relativePath(filePath)
                } as any
              },
              encode: (data: any, fileName: string) => {
                // commands AND script live under data.data — hoist both;
                // forgetting script here silently stripped the program from
                // every saved JS script macro (toJSONString reads obj.script)
                const str = toJSONString({ ...data, commands: data.data.commands, script: data.data.script }, {
                  withStatus: true,
                  ignoreTargetOptions: false //!!this.getConfig?.()?.saveAlternativeLocators
                })
                // Note: BrowserFileSystemStorage only supports writing file with Blob
                // so have to convert it here in `encode`
                return new Blob([str])
              }
            })

            // FIXE: it's for test
            ;(window as any).newMacroStorage = storage

            return storage
          }

          case StorageTarget.CSV:
            return getBrowserFileSystemStandardStorage({
              baseDir:        'spreadsheets',
              // one store, two views: .csv is parsed tabular data (uiv.csv.*),
              // .txt is raw text (uiv.text.*) — both live in the CSV/TXT tab
              extensions:     ['csv', 'txt'],
              shouldKeepExt:  true,
              transformFileName: (path: string) => {
                return path.toLowerCase()
              }
            })

          case StorageTarget.Screenshot:
            return getBrowserFileSystemStandardStorage({
              baseDir:        'screenshots',
              extensions:     ['png'],
              shouldKeepExt:  true,
              transformFileName: (path: string) => {
                return path.toLowerCase()
              }
            })

          case StorageTarget.Vision:
            return getBrowserFileSystemStandardStorage({
              baseDir:        'visions',
              extensions:     ['png'],
              shouldKeepExt:  true,
              transformFileName: (path: string) => {
                return path.toLowerCase()
              }
            })
        }
      }

      case StorageStrategyType.XFile: {
        const { rootDir } = getXFile().getCachedConfig()

        switch (target) {
          case StorageTarget.Macro: {
            // JS script macros (names ending in .js) live on disk as PLAIN
            // .js files — the file is the program, editable in any editor.
            // Classic macros stay .json, and legacy <name>.js.json files
            // (script wrapped in the JSON envelope) keep working: they list
            // and decode as before, and in-place saves keep their envelope.
            const isJsFile = (p: string) => /\.js$/i.test(p)

            const storage = getNativeFileSystemStandardStorage({
              rootDir,
              baseDir: 'macros',
              extensions: ['json', 'js'],
              shouldKeepExt: false,
              listFilter: (entryNodes: EntryNode[]): Promise<EntryNode[]> => {
                return this.getMaxMacroCount(this.strategyType)
                .then(maxCount => {
                  return forestSlice(maxCount, entryNodes)
                })
              },
              decode: (text: string, filePath: string) => {
                const obj = isJsFile(filePath)
                  ? fromJsFileText(text, path.basename(filePath))
                  : fromJSONString(text, path.basename(filePath), { withStatus: true })

                // Note: use filePath as id
                return {
                  ...obj,
                  id:   storage.filePath(filePath),
                  path: storage.relativePath(filePath)
                } as any
              },
              encode: (data: any, fileName: string) => {
                // the target FILE decides the format: *.js gets the raw
                // program text (toJsFileText throws for a classic macro
                // misnamed *.js), everything else the JSON envelope
                const str = isJsFile(fileName)
                  ? toJsFileText({ ...data, script: data.data.script })
                  // hoist script alongside commands — see the browser-mode note
                  : toJSONString({ ...data, commands: data.data.commands, script: data.data.script }, { withStatus: true, ignoreTargetOptions: false })
                // Note: NativeFileSystemStorage only supports writing file with DataURL
                // so have to convert it here in `encode`
                return blobToDataURL(new Blob([str]))
              }
            })
            return storage
          }

          case StorageTarget.CSV:
            return getNativeFileSystemStandardStorage({
              rootDir,
              baseDir: 'datasources',
              // .csv = parsed tabular data (uiv.csv.*), .txt = raw text
              // (uiv.text.*); the /datasources folder holds both
              extensions: ['csv', 'txt'],
              shouldKeepExt: true,
              allowAbsoluteFilePath: true,
              encode: ((text: string, fileName: string) => {
                return blobToDataURL(new Blob([text]))
              }) as any
            })

          case StorageTarget.Vision:
            return getNativeFileSystemStandardStorage({
              rootDir,
              baseDir: 'images',
              extensions: ['png'],
              shouldKeepExt: true,
              decode: xFileDecodeImage,
              encode: ((imageBlob: Blob, fileName: string) => {
                return blobToDataURL(imageBlob)
              }) as any
            })

          case StorageTarget.Screenshot:
            return getNativeFileSystemStandardStorage({
              rootDir,
              baseDir: 'screenshots',
              extensions: ['png'],
              shouldKeepExt: true,
              decode: xFileDecodeImage,
              encode: ((imageBlob: Blob, fileName: string) => {
                return blobToDataURL(imageBlob)
              }) as any
            })
        }
      }

      default:
        throw new Error(`Unsupported strategy type: '${this.strategyType}'`)
    }
  }

  getMacroStorage (): StandardStorage {
    return this.getStorageForTarget(StorageTarget.Macro)
  }

  getCSVStorage (): StandardStorage & IWithLinkStorage {
    return <StandardStorage & IWithLinkStorage>this.getStorageForTarget(StorageTarget.CSV)
  }

  getVisionStorage () {
    return <StandardStorage & IWithLinkStorage>this.getStorageForTarget(StorageTarget.Vision)
  }

  getScreenshotStorage (): StandardStorage & IWithLinkStorage {
    return <StandardStorage & IWithLinkStorage>this.getStorageForTarget(StorageTarget.Screenshot)
  }
}

function xFileDecodeImage (data: Content, fileName: string, readFileType: ReadFileType): any {
  if (readFileType !== 'DataURL') {
    return data
  }

  if ((data as string).substr(0, 11) === 'data:image') {
    return data
  }

  return 'data:image/png;base64,' + (data as string)
}

export const getStorageManager = singletonGetter((strategyType?: StorageStrategyType, extraOptions?: StorageManagerOptions) => {
  return new StorageManager(strategyType || StorageStrategyType.XFile, extraOptions)
})
