import { KeyValueData } from '@/services/kv_data/common'
import { singletonGetter } from '@/common/ts_utils'
import { MigrationRecord } from '@/services/migration/types'

export class MigrationKeyValueData extends KeyValueData<MigrationRecord> {
  static STORAGE_KEY = 'migration_records'

  public getAll () {
    return super.get("") as any as Promise<Record<string, MigrationRecord>>
  }

  protected getMainKeyAndSubKeys (key: string): [string, string[]] {
    const [mainKey, subKeys] = super.getMainKeyAndSubKeys(key)

    return [
      MigrationKeyValueData.STORAGE_KEY,
      [mainKey].concat(subKeys).filter(x => x && x.length)
    ]
  }
}

export const getMigrationKeyValueData = singletonGetter(() => new MigrationKeyValueData())
