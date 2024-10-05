import JSZip, { JSZipObject } from 'jszip'
import { getStorageManager, StorageStrategyType, StorageManager, StorageTarget } from '../storage'
import { flow } from '@/common/ts_utils'
import { StandardStorage } from '../storage/std/standard_storage';
import { fromJSONString } from '@/common/convert_utils';
import { ZipFolders } from './common';

export type RestoreBackupOptions = {
  file:    File;
  storage: StorageStrategyType;
}

export type RestoreBackupResult = {
  count: {
    macro:      number;
    testSuite:  number;
    screenshot: number;
    vision:     number;
    csv:        number;
  }
}

export function restoreBackup (options: RestoreBackupOptions): Promise<RestoreBackupResult> {
  const storageManager = getStorageManager(options.storage)

  return JSZip.loadAsync(options.file)
  .then(zip => {
    // 0. sort entries by folder/file, name
    // 1. Find all folders that is in valid root, create them one by one if not exists
    // 2. Find all files, write into storage

    const fileZipObjects: JSZipObject[] = []
    const folderZipObjects: JSZipObject[] = []

    zip.forEach((_, obj) => {
      if (obj.dir) {
        folderZipObjects.push(obj)
      } else {
        fileZipObjects.push(obj)
      }
    })

    sortZipObjectsInline(fileZipObjects)
    sortZipObjectsInline(folderZipObjects)

    const createAllFolders = () => {
      return flow(
        ...folderZipObjects.map(obj => {
          const res = getStorageAndPath({
            manager: storageManager,
            path:    obj.name
          })

          if (!res || res.relativePath === '.' || res.relativePath === '') {
            return () => Promise.resolve()
          }

          return () => {
            return res.storage.directoryExists(res.relativePath)
            .then(exists => {
              if (exists) {
                return
              }

              return res.storage.createDirectory(res.relativePath)
              .then(() => {})
            })
          }
        })
      )
    }

    const createAllFiles = () => {
      return flow(
        ...fileZipObjects.map(obj => {
          const res = getStorageAndPath({
            manager: storageManager,
            path:    obj.name
          })

          if (!res) {
            return () => Promise.resolve()
          }

          switch (res.target) {
            case StorageTarget.Macro: {
              return () => {
                return obj.async('text')
                .then(text => {
                  return res.storage.write(res.relativePath, fromJSONString(text))
                })
                .then(() => res.target)
              }
            }

            case StorageTarget.Screenshot:
            case StorageTarget.Vision:
            case StorageTarget.CSV: {
              return () => {
                return obj.async('blob')
                .then(blob => {
                  return res.storage.write(res.relativePath, blob)
                })
                .then(() => res.target)
              }
            }

            default: {
              return () => Promise.resolve()
            }
          }
        })
      )
      .then(results => {
        return {
          count: {
            macro:      results.filter((x: any) => x === StorageTarget.Macro).length,
            testSuite:  results.filter((x: any) => x === StorageTarget.TestSuite).length,
            screenshot: results.filter((x: any) => x === StorageTarget.Screenshot).length,
            vision:     results.filter((x: any) => x === StorageTarget.Vision).length,
            csv:        results.filter((x: any) => x === StorageTarget.CSV).length
          }
        }
      })
    }

    return createAllFolders().then(createAllFiles)
  })
}

export function sortZipObjectsInline (list: JSZipObject[]): void {
  list.sort((a, b) => {
    if (a.name < b.name) {
      return -1
    }

    if (a.name > b.name) {
      return 1
    }

    return 0
  })
}

export function sortZipObjects (list: JSZipObject[]): JSZipObject[] {
  const result = [...list]
  sortZipObjectsInline(result)
  return result
}

export type GetStorageAndPathOptions = {
  manager: StorageManager;
  path: string;
}

export type GetStorageAndPathResult = {
  storage:      StandardStorage;
  target:       StorageTarget;
  relativePath: string;
  dir:          boolean;
}

export function getStorageAndPath (options: GetStorageAndPathOptions): GetStorageAndPathResult | null {
  const DELIM   = '/'
  const parts   = options.path.split(DELIM).filter(part => part !== '.')
  const subPath = parts.slice(1).join(DELIM)
  const isDir   = parts[parts.length - 1] === ''

  const [storage, target] = (() => {
    switch (parts[0]) {
      case ZipFolders.Macros:
        return [options.manager.getMacroStorage(), StorageTarget.Macro]

      case ZipFolders.TestSuites:
        return [options.manager.getTestSuiteStorage(), StorageTarget.TestSuite]

      case ZipFolders.Csvs:
        return [options.manager.getCSVStorage(), StorageTarget.CSV]

      case ZipFolders.Screenshots:
        return [options.manager.getScreenshotStorage(), StorageTarget.Screenshot]

      case ZipFolders.Visions:
        return [options.manager.getVisionStorage(), StorageTarget.Vision]

      default:
        return [null, null]
    }
  })()

  if (!storage) {
    return null
  }

  return {
    storage:      storage as StandardStorage,
    target:       target as StorageTarget,
    dir:          isDir,
    relativePath: subPath
  }
}
