import { KeyValueData } from './common'
import { singletonGetter } from '../../common/ts_utils'

export type TestSuitePlayStatus = {
  isPlaying?:      boolean;
  currentIndex?:   number;
  errorIndices?:   number[];
  doneIndices?:    number[];
}

export type TestSuitExtraData = {
  fold:       boolean;
  playStatus: TestSuitePlayStatus;
}

export class TestSuiteExtraKeyValueData extends KeyValueData<TestSuitExtraData> {
  static STORAGE_KEY = 'test_suite_extra'

  public getAll () {
    return super.get("")
  }

  protected getMainKeyAndSubKeys (key: string): [string, string[]] {
    const [mainKey, subKeys] = super.getMainKeyAndSubKeys(key)

    return [
      TestSuiteExtraKeyValueData.STORAGE_KEY,
      [mainKey].concat(subKeys).filter(x => x && x.length)
    ]
  }
}

export const getTestSuiteExtraKeyValueData = singletonGetter(() => new TestSuiteExtraKeyValueData())
