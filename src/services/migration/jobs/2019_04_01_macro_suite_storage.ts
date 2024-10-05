import { IMigrationJob, MigrationJobMeta, MigrationJobType, VersionRange } from '@/services/migration/types'
import { getIndexeddbFlatStorage } from '@/services/storage/flat/indexeddb_storage'
import { getBrowserFileSystemFlatStorage, BrowserFileSystemFlatStorage } from '@/services/storage/flat/browser_filesystem_storage'
import { getStorageManager, StorageTarget, StorageStrategyType, StorageManager } from '@/services/storage'
import { Macro } from '@/common/convert_utils'
import { getMacroExtraKeyValueData } from '@/services/kv_data/macro_extra_data';
import fs from '@/common/filesystem'
import { backup } from '@/services/backup/backup'
import { singletonGetter } from '@/common/ts_utils'

export class MigrateMacroTestSuiteToBrowserFileSystem implements IMigrationJob {
  private oldMacros: Macro[] = []

  getMeta (): MigrationJobMeta {
    return {
      createdAt: new Date('2019-04-01').getTime(),
      goal: [
        `Migrate macros and test suites from indexedDB storage to Browser File System storage`,
        `In order to prepare for an easy support for deep folder structure`,
        `Note: the old indexedDB storage WILL NOT be cleared, just in case any user loses his data during migration`,
        `The real clean up could be done in future releases, in the form of another migration job`
      ].join('. ')
    }
  }

  getType (): MigrationJobType {
    return MigrationJobType.MigrateMacroTestSuiteToBrowserFileSystem
  }

  previousVersionRange (): VersionRange {
    return '<=4.0.1'
  }

  shouldMigrate (): Promise<boolean> {
    const oldMacroStorage     = this.getOldMacroStorage()
    const oldTestSuiteStorage = this.getOldTestSuiteStorage()

    return Promise.all([
      oldMacroStorage.list().then((list) => list.length),
      oldTestSuiteStorage.list().then((list) => list.length)
    ])
    .then(([macroCount, testSuiteCount]) => {
      return macroCount > 0 || testSuiteCount > 0
    })
  }

  migrate (): Promise<boolean> {
    const migrateMacros = () => {
      return this.getOldMacroStorage().readAll()
      .then((fileObjs) => {
        console.log('this.getOldMacroStorage().readAll()', fileObjs)

        this.oldMacros = fileObjs.map((obj) => obj.content as any as Macro)

        return fs.ensureDirectory('/macros')
        .then(() => this.getNewMacroStorage().bulkWrite(fileObjs))
      })
      .then(() => true)
    }

    const migrateTestSuites = () => {
      return this.getOldTestSuiteStorage().readAll()
      .then((fileObjs) => {
        console.log('this.getOldTestSuiteStorage().readAll()', fileObjs)

        return fs.ensureDirectory('/testsuites')
        .then(() => this.getNewTestSuiteStorage().bulkWrite(fileObjs))
      })
      .then(() => true)
    }

    const migrateMacroExtra = () => {
      return getMacroExtraKeyValueData().getAll()
      .then((allMacroExtra) => {
        this.oldMacros.forEach(macro => {
          const newId = this.getNewMacroStorage().filePath(macro.name)
          const oldId = macro.id as string

          if (allMacroExtra[oldId]) {
            allMacroExtra[newId] = allMacroExtra[oldId]
          }
        })

        return getMacroExtraKeyValueData().set('', allMacroExtra as any)
      })
    }

    return migrateMacros()
    .then(() => migrateTestSuites())
    .then(() => migrateMacroExtra())
    .then(() => true)
  }

  remedy () {
    // Download the old macros and test suites in zip
    const readOldMacros = () => {
      return this.getOldMacroStorage().readAll()
      .then((fileObjs) => {
        this.oldMacros = fileObjs.map((obj) => obj.content as any as Macro)
        return this.oldMacros
      })
    }

    const readOldTestSuites = () => {
      return this.getOldTestSuiteStorage().readAll()
      .then((fileObjs) => {
        return fileObjs.map((obj) => obj.content as any)
      })
    }

    return readOldMacros()
    .then(macros => {
      return readOldTestSuites()
      .then(testSuites => {
        return backup({
          backup: {
            testCase:  true,
            testSuite: true
          },
          macroNodes:  macros,
          testSuites: testSuites
        })
      })
    })
  }

  private getOldMacroStorage () {
    return getIndexeddbFlatStorage({
      table: 'testCases'
    })
  }

  private getOldTestSuiteStorage () {
    return getIndexeddbFlatStorage({
      table: 'testSuites'
    })
  }

  private getNewMacroStorage () {
    return this.getStorageManager().getStorageForTarget(
      StorageTarget.Macro,
      StorageStrategyType.Browser
    ) as any
  }

  private getNewTestSuiteStorage () {
    return this.getStorageManager().getStorageForTarget(
      StorageTarget.TestSuite,
      StorageStrategyType.Browser
    ) as any
  }

  private getStorageManager () {
    return new StorageManager(
      StorageStrategyType.Browser,
      {
        getMacros: () => this.oldMacros as any,
        getMaxMacroCount: () => Promise.resolve(Infinity)
      }
    )
  }
}

export const getMigrateMacroTestSuiteToBrowserFileSystem = singletonGetter(() => {
  return new MigrateMacroTestSuiteToBrowserFileSystem()
})
