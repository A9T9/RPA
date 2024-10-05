import storage from '../../common/storage'
import { safeSetIn, getIn, safeUpdateIn, concurrent } from '../../common/ts_utils'

export interface IKeyValueData<T> {
  get:    (key: string) => Promise<T>;
  set:    (key: string, value: T) => Promise<T>;
  update: (key: string, updater: (data: T) => T) => Promise<T>;
}

export function parseKey (key: string): string[] {
  return key.split('::').filter(s => s.length > 0)
}

export class KeyValueData<T> implements IKeyValueData<T> {
  private withOneLock = concurrent(1)((run: Function): any => {
    return new Promise((resolve, reject) => {
      try {
        Promise.resolve(run()).then(resolve, reject)
      } catch (e) {
        reject(e)
      }
    })
  })

  get (key: string): Promise<T> {
    const [mainKey, subKeys] = this.getMainKeyAndSubKeys(key)

    return storage.get(mainKey)
    .then((data: any = {}) => {
      const result = getIn(subKeys, data) as T
      return result
    })
  }

  set (key: string, value: T): Promise<T> {
    return this.withOneLock(() => {
      const [mainKey, subKeys] = this.getMainKeyAndSubKeys(key)

      return storage.get(mainKey)
      .then((data: any = {}) => {
        const updated = safeSetIn(subKeys, value, data)

        return storage.set(mainKey, updated)
        .then(() => getIn(subKeys, updated))
      })
    })
  }

  update (key: string, updater: (data: T) => T): Promise<T> {
    return this.withOneLock(() => {
      const [mainKey, subKeys] = this.getMainKeyAndSubKeys(key)

      return storage.get(mainKey)
      .then((data: any = {}) => {
        const updated = safeUpdateIn(subKeys, updater, data)

        return storage.set(mainKey, updated)
        .then(() => getIn(subKeys, updated))
      })
    })
  }

  protected getMainKeyAndSubKeys (key: string): [string, string[]] {
    const keys    = parseKey(key)
    const mainKey = keys[0]
    const subKeys = keys.slice(1)

    return [mainKey, subKeys]
  }
}
