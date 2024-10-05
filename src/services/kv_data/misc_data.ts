import { KeyValueData } from './common'
import { singletonGetter } from '../../common/ts_utils'

export enum MiscKey {
  BrowserModeLastMacroId = 'browser_mode_last_macro_id',
  XFileModeLastMacroId   = 'xfile_mode_last_macro_id'
}

export class MiscData extends KeyValueData<any> {
  static STORAGE_KEY = 'misc_data'

  protected getMainKeyAndSubKeys (key: string): [string, string[]] {
    const [mainKey, subKeys] = super.getMainKeyAndSubKeys(key)

    return [
      MiscData.STORAGE_KEY,
      [mainKey].concat(subKeys).filter(x => x && x.length)
    ]
  }
}

export const getMiscData = singletonGetter(() => new MiscData())
