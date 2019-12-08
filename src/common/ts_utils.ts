export type SingletonFactory<T> = (...args: any[]) => T

export function singletonGetter<T> (factoryFn: SingletonFactory<T>): SingletonFactory<T> {
  let instance: T | null = null

  return (...args: any[]) => {
    if (instance) return instance
    instance = factoryFn(...args)
    return <T>instance
  }
}

export type KeyFunc = (...args: any[]) => string

export function singletonGetterByKey<T> (getKey: KeyFunc, factoryFn: SingletonFactory<T>): SingletonFactory<T> {
  let cache: Record<string, T> = {}

  return (...args: any[]) => {
    const key = getKey(...args)
    if (cache[key]) return cache[key]
    cache[key] = factoryFn(...args)
    return <T>cache[key]
  }
}

export function capitalInitial (str: string): string {
  return str.charAt(0).toUpperCase() + str.substr(1)
}

export function snakeToCamel (kebabStr: string): string {
  const list = kebabStr.split('_')
  return list[0] + list.slice(1).map(capitalInitial).join('')
}
