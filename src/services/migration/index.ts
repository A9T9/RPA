import {  MigrationJobType, MigrationRecord } from './types'
import { MigrationService } from './common'
import { getMigrationKeyValueData } from '@/services/kv_data/migration_data'
import { getMigrateMacroTestSuiteToBrowserFileSystem } from '@/services/migration/jobs/2019_04_01_macro_suite_storage'
import { singletonGetter } from '@/common/ts_utils'

export class KantuMigrationService extends MigrationService {
  constructor () {
    super({
      storage: {
        get (type: MigrationJobType) {
          return getMigrationKeyValueData().get(type)
        },
        set (type: MigrationJobType, data: MigrationRecord) {
          return getMigrationKeyValueData().set(type, data)
          .then(() => true)
        },
        getAll () {
          return getMigrationKeyValueData().getAll()
          .then((dict) => {
            return Object.keys(dict).map((key) => dict[key])
          })
        }
      },
      jobs: [
        getMigrateMacroTestSuiteToBrowserFileSystem()
      ]
    })
  }
}

export const getKantuMigrationService = singletonGetter(() => {
  return new KantuMigrationService()
})
