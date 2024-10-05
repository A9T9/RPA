import { KeyValueData } from './common'
import { singletonGetter } from '../../common/ts_utils'

export enum MacroResultStatus {
  Normal  = 'NORMAL',
  Success = 'SUCCESS',
  Error   = 'ERROR',
  ErrorInSub = 'ERROR_IN_SUB'
}

export type MacroExtraData = {
  status:                 MacroResultStatus;
  breakpointIndices:      number[];
  doneCommandIndices:     number[];
  errorCommandIndices:    number[];
  warningCommandIndices?: number[];
  folded:                 boolean;
}

export class MacroExtraKeyValueData extends KeyValueData<MacroExtraData> {
  static STORAGE_KEY = 'macro_extra'

  public getAll () {
    return super.get("") as any as Promise<Record<string, MacroExtraData>>
  }

  protected getMainKeyAndSubKeys (key: string): [string, string[]] {
    const [mainKey, subKeys] = super.getMainKeyAndSubKeys(key)

    return [
      MacroExtraKeyValueData.STORAGE_KEY,
      [mainKey].concat(subKeys).filter(x => x && x.length)
    ]
  }
}

export const getMacroExtraKeyValueData = singletonGetter(() => new MacroExtraKeyValueData())
