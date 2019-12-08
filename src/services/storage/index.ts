import * as EventEmitter from 'eventemitter3'
import { FlatStorage, IWithLinkStorage } from './storage'
import { getIndexeddbFlatStorage } from './indexeddb_storage'
import { getBrowserFileSystemFlatStorage } from './browser_filesystem_storage'
import { getNativeFileSystemFlatStorage } from './native_filesystem_storage'
import { getNativeFileSystemAPI } from '../filesystem'
import { singletonGetter } from '../../common/ts_utils'
import { getXFile } from '../xmodules/xfile'
import { Macro, fromJSONString, toJSONString } from '../../common/convert_utils'
import { stringifyTestSuite, parseTestSuite, TestSuite } from '../../common/convert_suite_utils'
import { uid, blobToDataURL } from '../../common/utils'

export enum StorageStrategyType {
  Browser = 'browser',
  XFile = 'xfile'
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
  setCurrentStrategyType: (type: StorageStrategyType) => void;
  getStorageForTarget: (target: StorageTarget) => FlatStorage;
  isStrategyTypeAvailable: (type: StorageStrategyType) => Promise<boolean>;
}

export type StorageManagerOptions = {
  getMacros: () => Macro[]
}

export class StorageManager extends EventEmitter implements IStorageManager {
  private strategyType: StorageStrategyType = StorageStrategyType.Browser
  private getMacros: (() => Macro[]) = () => []

  constructor (strategyType: StorageStrategyType, extraOptions?: StorageManagerOptions) {
    super()
    this.setCurrentStrategyType(strategyType)

    if (extraOptions) {
      this.getMacros = extraOptions.getMacros
    }
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

  setCurrentStrategyType (type: StorageStrategyType) {
    if (type !== this.strategyType) {
      setTimeout(() => {
        this.emit(StorageManagerEvent.StrategyTypeChanged, type)
      }, 0)
    }

    this.strategyType = type
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

  getStorageForTarget (target: StorageTarget, forceStrategytype?: StorageStrategyType): FlatStorage {
    switch (forceStrategytype || this.strategyType) {
      case StorageStrategyType.Browser: {
        switch (target) {
          case StorageTarget.Macro:
            return getIndexeddbFlatStorage({
              table: 'testCases'
            })

          case StorageTarget.TestSuite:
            return getIndexeddbFlatStorage({
              table: 'testSuites'
            })

          case StorageTarget.CSV:
            return getBrowserFileSystemFlatStorage({
              baseDir: 'spreadsheets'
            })

          case StorageTarget.Screenshot:
            return getBrowserFileSystemFlatStorage({
              baseDir: 'screenshots'
            })

          case StorageTarget.Vision:
            return getBrowserFileSystemFlatStorage({
              baseDir: 'visions'
            })
        }
      }

      case StorageStrategyType.XFile: {
        const { rootDir } = getXFile().getCachedConfig()

        switch (target) {
          case StorageTarget.Macro: {
            const storage = getNativeFileSystemFlatStorage({
              rootDir,
              baseDir: 'macros',
              extensions: ['json'],
              decode: (text: string, fileName: string) => {
                const obj = fromJSONString(text, fileName, { withStatus: true, withId: true })

                // FIXME: Here is a side effect when decoding
                // To keep macro id consistent, have to write new generated id back to storage
                if (!obj.id) {
                  obj.id = uid()
                  storage.write(fileName, obj)
                }
                
                return obj
              },
              encode: (data: any, fileName: string) => {
                const str = toJSONString({ ...data, commands: data.data.commands }, { withStatus: true, withId: true })
                // Note: NativeFileSystemStorage only supports writing file with DataURL
                // so have to convert it here in `encode`
                return blobToDataURL(new Blob([str]))
              }
            })
            return storage
          }

          case StorageTarget.TestSuite: {
            const storage = getNativeFileSystemFlatStorage({
              rootDir,
              baseDir: 'testsuites',
              extensions: ['json'],
              decode: (text: string, fileName: string) => {
                const obj = parseTestSuite(text, this.getMacros(), { withFold: true, withId: true, withPlayStatus: true })
                
                // FIXME: Here is a side effect when decoding
                // To keep macro id consistent, have to write new generated id back to storage
                if (!obj.id) {
                  obj.id = uid()
                  storage.write(fileName, obj)
                }
                
                return obj
              },
              encode: (suite: any, fileName: string) => {
                const str = stringifyTestSuite(suite, this.getMacros(), { withFold: true, withId: true, withPlayStatus: true })
                return blobToDataURL(new Blob([str]))
              }
            })
            return storage
          }

          case StorageTarget.CSV:
            return getNativeFileSystemFlatStorage({
              rootDir,
              baseDir: 'datasources',
              extensions: ['csv'],
              shouldKeepExt: true,
              encode: (text: string, fileName: string) => {
                return blobToDataURL(new Blob([text]))
              }
            })

          case StorageTarget.Vision:
            return getNativeFileSystemFlatStorage({
              rootDir,
              baseDir: 'images',
              extensions: ['png'],
              shouldKeepExt: true,
              encode: (imageBlob: Blob, fileName: string) => {
                return blobToDataURL(imageBlob)
              }
            })

          case StorageTarget.Screenshot:
            return getBrowserFileSystemFlatStorage({
              baseDir: 'screenshots'
            })
        }
      }

      default:
        throw new Error(`Unsupported strategy type: '${this.strategyType}'`)
    }
  }

  getMacroStorage (): FlatStorage {
    return this.getStorageForTarget(StorageTarget.Macro)
  }

  getTestSuiteStorage (): FlatStorage {
    return this.getStorageForTarget(StorageTarget.TestSuite)
  }

  getCSVStorage (): FlatStorage & IWithLinkStorage {
    return <FlatStorage & IWithLinkStorage>this.getStorageForTarget(StorageTarget.CSV)
  }
  
  getVisionStorage () {
    return <FlatStorage & IWithLinkStorage>this.getStorageForTarget(StorageTarget.Vision)
  }

  getScreenshotStorage (): FlatStorage & IWithLinkStorage {
    return <FlatStorage & IWithLinkStorage>this.getStorageForTarget(StorageTarget.Screenshot)
  }
}

// Note: in panel window (`src/index.js`), `getStorageManager` is provided with `getMacros` in `extraOptions`
// While in `bg.js` or `csv_edtior.js`, `vision_editor.js`, `extraOptions` is omitted with no harm,
// because they don't read/write test suites
export const getStorageManager = singletonGetter<StorageManager>((strategyType?: StorageStrategyType, extraOptions?: StorageManagerOptions) => {
  return new StorageManager(strategyType || StorageStrategyType.XFile, extraOptions)
})
