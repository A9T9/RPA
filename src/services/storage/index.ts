import EventEmitter from 'eventemitter3'
import { IWithLinkStorage } from './flat/storage'
import { getBrowserFileSystemStandardStorage } from './std/browser_filesystem_storage'
import { getNativeFileSystemStandardStorage } from './std/native_filesystem_storage'
import { singletonGetter, forestSlice } from '../../common/ts_utils'
import { getXFile } from '../xmodules/xfile'
import { Macro, fromJSONString, toJSONString } from '../../common/convert_utils'
import { stringifyTestSuite, parseTestSuite } from '../../common/convert_suite_utils'
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
  TestSuite,
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
  getMacros: () => EntryNode[];
  getMaxMacroCount: (strategyType: StorageStrategyType) => Promise<number>;
  getConfig?: () => Record<string, any>;
}

export class StorageManager extends EventEmitter implements IStorageManager {
  private strategyType: StorageStrategyType = StorageStrategyType.Nil
  private getMacros: (() => EntryNode[]) = () => []
  private getMaxMacroCount: ((strategyType: StorageStrategyType) => Promise<number>) = (s) => Promise.resolve(Infinity)
  private getConfig?: () => Record<string, any>;

  constructor (strategyType: StorageStrategyType, extraOptions?: StorageManagerOptions) {
    super()
    this.setCurrentStrategyType(strategyType)

    if (extraOptions && extraOptions.getMacros) {
      this.getMacros = extraOptions.getMacros
    }

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
                const str = toJSONString({ ...data, commands: data.data.commands }, {
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

          case StorageTarget.TestSuite: {
            const storage = getBrowserFileSystemStandardStorage({
              baseDir: 'testsuites',
              extensions: ['json'],
              shouldKeepExt: false,
              decode: (text: string, filePath: string) => {
                console.log('test suite raw content', filePath, text, this.getMacros())
                const obj = parseTestSuite(text, { fileName: path.basename(filePath) })

                // Note: use filePath as id
                return {
                  ...obj,
                  id:   storage.filePath(filePath),
                  path: storage.relativePath(filePath)
                } as any
              },
              encode: (suite: any, fileName: string) => {
                const str = stringifyTestSuite(suite)
                return new Blob([str])
              }
            })

            // FIXE: it's for test
            ;(window as any).newTestSuiteStorage = storage

            return storage
          }

          case StorageTarget.CSV:
            return getBrowserFileSystemStandardStorage({
              baseDir:        'spreadsheets',
              extensions:     ['csv'],
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
            const storage = getNativeFileSystemStandardStorage({
              rootDir,
              baseDir: 'macros',
              extensions: ['json'],
              shouldKeepExt: false,
              listFilter: (entryNodes: EntryNode[]): Promise<EntryNode[]> => {
                return this.getMaxMacroCount(this.strategyType)
                .then(maxCount => {
                  return forestSlice(maxCount, entryNodes)
                })
              },
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
                const str = toJSONString({ ...data, commands: data.data.commands }, { withStatus: true, ignoreTargetOptions:false })
                // Note: NativeFileSystemStorage only supports writing file with DataURL
                // so have to convert it here in `encode`
                return blobToDataURL(new Blob([str]))
              }
            })
            return storage
          }

          case StorageTarget.TestSuite: {
            const storage = getNativeFileSystemStandardStorage({
              rootDir,
              baseDir: 'testsuites',
              extensions: ['json'],
              shouldKeepExt: false,
              decode: (text: string, filePath: string) => {
                const obj = parseTestSuite(text, { fileName: path.basename(filePath) })

                // Note: use filePath as id
                return {
                  ...obj,
                  id:   storage.filePath(filePath),
                  path: storage.relativePath(filePath)
                } as any
              },
              encode: (suite: any, fileName: string) => {
                const str = stringifyTestSuite(suite)

                return blobToDataURL(new Blob([str]))
              }
            })
            return storage
          }

          case StorageTarget.CSV:
            return getNativeFileSystemStandardStorage({
              rootDir,
              baseDir: 'datasources',
              extensions: ['csv'],
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

  getTestSuiteStorage (): StandardStorage {
    return this.getStorageForTarget(StorageTarget.TestSuite)
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

// Note: in panel window (`src/index.js`), `getStorageManager` is provided with `getMacros` in `extraOptions`
// While in `bg.js` or `csv_edtior.js`, `vision_editor.js`, `extraOptions` is omitted with no harm,
// because they don't read/write test suites
export const getStorageManager = singletonGetter((strategyType?: StorageStrategyType, extraOptions?: StorageManagerOptions) => {
  return new StorageManager(strategyType || StorageStrategyType.XFile, extraOptions)
})
