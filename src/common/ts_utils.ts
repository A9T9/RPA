import { Tree, Size, Rect, Point, Quadrant } from './types'
import log from './log'

export type AnyFunc = (...argss: any[]) => any
export type SingletonFactory<FuncT extends AnyFunc> = (...args: Parameters<FuncT> | []) => ReturnType<FuncT>

export function singletonGetter<T extends AnyFunc> (factoryFn: T): SingletonFactory<T> {
  let instance: ReturnType<T> | null = null

  return (...args: Parameters<T> | []): ReturnType<T> => {
    if (instance) return instance
    instance = factoryFn(...args)
    return instance as ReturnType<T>
  }
}

export type KeyFunc = (...args: any[]) => string

export function singletonGetterByKey<T extends AnyFunc> (getKey: KeyFunc, factoryFn: T): SingletonFactory<T> {
  let cache: Record<string, ReturnType<T>> = {}

  return (...args: Parameters<T> | []) => {
    const key = getKey(...args)
    if (cache[key]) return cache[key]
    cache[key] = factoryFn(...args)
    return cache[key] as ReturnType<T>
  }
}

export function id <T> (x: T): T {
  return x
}

export function capitalInitial (str: string): string {
  return str.charAt(0).toUpperCase() + str.substr(1)
}

export function snakeToCamel (kebabStr: string): string {
  const list = kebabStr.split('_')
  return list[0] + list.slice(1).map(capitalInitial).join('')
}

export const delay = (fn: Function, timeout: number): Promise<any> => {
  return new Promise((resolve: Function, reject: Function) => {
    setTimeout(() => {
      try {
        resolve(fn())
      } catch (e) {
        reject(e)
      }
    }, timeout)
  })
}

interface CheckResult<T> {
  pass: boolean,
  result: T
}

type CheckFunction<T> = () => CheckResult<T> | Promise<CheckResult<T>>

export const until = <T>(name: string, check: CheckFunction<T>, interval = 1000, expire = 10000): Promise<T> => {
  const start = new Date().getTime()
  const go    = async () => {
    if (expire && new Date().getTime() - start >= expire) {
      throw new Error(`until: ${name} expired!`)
    }

    const { pass, result } = await Promise.resolve(check())

    if (pass) return Promise.resolve(result)
    return delay(go, interval)
  }

  return new Promise((resolve, reject) => {
    try {
      resolve(go())
    } catch (e) {
      reject(e)
    }
  })
}

export const range = (start: number, end: number, step = 1): number[] => {
  const ret = []

  for (let i = start; i < end; i += step) {
    ret.push(i)
  }

  return ret
}

export const partial = (fn: Function) => {
  const len = fn.length
  let arbitary: any

  arbitary = (curArgs: any, leftArgCnt: number) => (...args: any[]) => {
    if (args.length >= leftArgCnt) {
      return fn.apply(null, curArgs.concat(args))
    }

    return arbitary(curArgs.concat(args), leftArgCnt - args.length)
  }

  return arbitary([], len)
}

export const reduceRight = (fn: Function, initial: any, list: any[]) => {
  let ret = initial

  for (let i = list.length - 1; i >= 0; i--) {
    ret = fn(list[i], ret)
  }

  return ret
}

export const compose = (...args: Function[]) => {
  return reduceRight((cur: any, prev: any) => {
    return (x: any) => cur(prev(x))
  }, (x: any) => x, args)
}

export const map = partial((fn: Function, list: any[]) => {
  const result = []

  for (let i = 0, len = list.length; i < len; i++) {
    result.push(fn(list[i]))
  }

  return result
})

export const on = partial((key: (number|string), fn: Function, dict: (any[]|object)): (any[]|object) => {
  if (Array.isArray(dict)) {
    return [
      ...dict.slice(0, <number> key),
      fn(dict[<any> key]),
      ...dict.slice(<number> key + 1)
    ]
  }

  return Object.assign({}, dict, {
    [key]: fn((<Record<string, any>> dict)[key])
  })
})

export const updateIn = partial((keys: string[], fn: Function, obj: object): object => {
  const updater = compose.apply(null, keys.map(key => key === '[]' ? map : on(key)))
  return updater(fn)(obj)
})

export const setIn = partial((keys: string[], value: Function, obj: object): object => {
  const updater = compose.apply(null, keys.map(key => key === '[]' ? map : on(key)))
  return updater(() => value)(obj)
})

export const getIn = partial((keys: string[], obj: object) => {
  return keys.reduce((prev: any, key) => {
    if (!prev)  return prev
    return prev[key]
  }, obj)
})

export const safeMap = partial((fn: Function, list: any[]) => {
  const result    = []
  const safeList  = list || []

  for (let i = 0, len = safeList.length; i < len; i++) {
    result.push(fn(safeList[i]))
  }

  return result
})

export const safeOn = partial((key: (number|string), fn: Function, dict: (any[]|object)): (any[]|object) => {
  if (Array.isArray(dict)) {
    return [
      ...dict.slice(0, <number> key),
      fn(dict[<any> key]),
      ...dict.slice(<number> key + 1)
    ]
  }

  return Object.assign({}, dict, {
    [key]: fn((<Record<string, any>> (dict || {}))[key])
  })
})

export const safeUpdateIn = partial((keys: string[], fn: Function, obj: object): object => {
  const updater = compose.apply(null, keys.map(key => key === '[]' ? safeMap : safeOn(key)))
  return updater(fn)(obj)
})

export const safeSetIn = partial((keys: string[], value: Function, obj: object): object => {
  const updater = compose.apply(null, keys.map(key => key === '[]' ? safeMap : safeOn(key)))
  return updater(() => value)(obj)
})

export const pick = (keys: string[], obj: Record<string, any>): Record<string, any> => {
  return keys.reduce((prev: Record<string, any>, key: string) => {
    prev[key] = obj[key]
    return prev
  }, {})
}

export const pickIfExist = (keys: string[], obj: Record<string, any>): Record<string, any> => {
  return keys.reduce((prev: Record<string, any>, key: string) => {
    if (obj[key] !== undefined) {
      prev[key] = obj[key]
    }
    return prev
  }, {})
}

export const without = (keys: string[], obj: Record<string, any>): Record<string, any> => {
  return Object.keys(obj).reduce((prev: Record<string, any>, key: string) => {
    if (keys.indexOf(key) === -1) {
      prev[key] = obj[key]
    }
    return prev
  }, {})
}

export const uid = (): string => {
  return '' + (new Date().getTime()) + '.' +
         Math.floor(Math.random() * 10000000).toString(16)
}

export const flatten = <T>(list: T[][]): T[] => {
  return ([] as T[]).concat.apply([], list);
}

export const zipWith = (fn: Function, ...listOfList: any[][]): any[] => {
  const len = Math.min(...listOfList.map(list => list.length))
  const res = []

  for (let i = 0; i < len; i++) {
    res.push(fn(...listOfList.map(list => list[i])))
  }

  return res
}

export const and = (...list: boolean[]) => list.reduce((prev, cur) => prev && cur, true)

export const or = (...list: boolean[]) => list.reduce((prev, cur) => prev || cur, false)

export type WithPostfixOptions = {
  str:  string;
  fn:   WithFileExtensionFunc;
  reg:  RegExp;
}

export const withPostfix = (options: WithPostfixOptions): MaybePromise<string> => {
  const { reg, str, fn } = options
  const m = str.match(reg)

  const extName   = m ? m[0] : ''
  const baseName  = m ? str.replace(reg, '') : str
  const result    = fn(baseName, (name) => name + extName)

  if (result === null || result === undefined) {
    throw new Error('withPostfix: should not return null/undefined')
  }

  if (typeof (result as any).then === 'function') {
    return (result as any).then((name: string) => name + extName) as Promise<string>
  }

  return result + extName
}

export type MaybePromise<T> = T | Promise<T>

export type WithFileExtensionFunc = (baseName: string, getFullName: ((name: string) => string)) => MaybePromise<string>

export const withFileExtension = (origName: string, fn: WithFileExtensionFunc): MaybePromise<string> => {
  return withPostfix({
    fn,
    str: origName,
    reg: /\.\w+$/
  })
}

export function getExtName (fileName: string): string {
  return withFileExtension(fileName, () => '') as string
}

export type UniqueNameOptions = {
  generate?:    (oldName: string, step: number) => string;
  check?:       (fullName: string) => MaybePromise<boolean>;
  postfixReg?:  RegExp
}

export const uniqueName = (name: string, options?: UniqueNameOptions): Promise<string> => {
  const opts: Required<UniqueNameOptions> = {
    generate: (old, step = 1) => {
      const reg = /_(\d+)$/
      const m   = old.match(reg)

      if (!m) return `${old}_${step}`
      return old.replace(reg, (_, n) => `_${parseInt(n, 10) + step}`)
    },
    check: () => Promise.resolve(true),
    postfixReg: /\.\w+$/,
    ...(options || {})
  }
  const { generate, check, postfixReg } = opts

  return <Promise<string>> withPostfix({
    str: name,
    reg: postfixReg,
    fn: (baseName, getFullName) => {
      const go = (fileName: string, step: number): Promise<string> => {
        return Promise.resolve(
          check(getFullName(fileName))
        )
        .then(pass => {
          if (pass) return fileName
          return go(generate(fileName, step), step)
        })
      }

      return go(baseName, 1)
    }
  })
}

export const objFilter = (filter: Function, obj: Record<string, any>): Record<string, any> => {
  return Object.keys(obj).reduce((prev, key, i) => {
    if (filter(obj[key], key, i)) {
      prev[key] = obj[key]
    }
    return prev
  }, {} as Record<string, any>)
}

export function throttle (fn: Function, timeout: number) {
  let lastTime = 0

  return (...args: any[]) => {
    const now = new Date().getTime()
    if (now - lastTime < timeout) return

    lastTime = now
    return fn(...args)
  }
}

export type RetryOptions = {
  timeout?:       number,
  retryInterval?: number | RetryIntervalFactory,
  onFirstFail?:   Function,
  onFinal?:       Function,
  shouldRetry?:   (e: Error) => boolean | Promise<boolean>,
}

export type PromiseFunction<T, ArgsType extends any[] = any[]> = (...args: ArgsType) => Promise<T>

export type RetryIntervalFactory = (retryCount: number, lastInterval: number) => number

export const retry = <T>(fn: PromiseFunction<T>, options: RetryOptions): PromiseFunction<T> => (...args) => {
  const { timeout, onFirstFail, onFinal, shouldRetry, retryInterval } = {
    timeout: 5000,
    retryInterval: 1000,
    onFirstFail:  <Function>(() => {}),
    onFinal:      <Function>(() => {}),
    shouldRetry:  (e: Error) => false,
    ...options
  }

  let retryCount    = 0
  let lastError: Error | null
  let timerToClear: any
  let done          = false

  const wrappedOnFinal = (...args: any[]) => {
    done = true

    if (timerToClear) {
      clearTimeout(timerToClear)
    }

    return onFinal(...args)
  }

  const intervalMan = (function () {
    let lastInterval: number
    const intervalFactory: RetryIntervalFactory = (function () {
      switch (typeof retryInterval) {
        case 'function':
          return <RetryIntervalFactory>retryInterval

        case 'number':
          return <RetryIntervalFactory>((retryCount, lastInterval) => retryInterval)

        default:
          throw new Error('retryInterval must be either a number or a function')
      }
    })()

    return {
      getLastInterval: () => lastInterval,
      getInterval: () => {
        const interval = intervalFactory(retryCount, lastInterval)
        lastInterval = interval
        return interval
      }
    }
  })()

  const onError = (e: Error, _throwErr?: (e: Error) => any) => {
    const throwErr = _throwErr || ((e: Error) => Promise.reject(e))

    if (retryCount === 0) {
      onFirstFail(e)
    }

    return new Promise(resolve => {
      resolve(shouldRetry(e))
    })
    .then((should) => {
      if (!should) {
        wrappedOnFinal(e)
        return throwErr(e)
      }
      lastError = e

      const p: Promise<T> = new Promise((resolve, reject) => {
        if (retryCount++ === 0) {
          timerToClear = setTimeout(() => {
            wrappedOnFinal(lastError)
            reject(lastError)
          }, timeout)
        }

        if (done) return

        delay(run, intervalMan.getInterval())
        .then(
          resolve,
          (e: Error) => resolve(onError(e, (err: Error) => reject(e)))
        )
      })

      return p
    })
  }

  const run = (): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      try {
        const res = fn(...args, {
          retryCount,
          retryInterval: intervalMan.getLastInterval()
        })
        resolve(res)
      } catch (e) {
        reject(e)
      }
    })
    .catch(onError)
  }

  return run()
  .then((result) => {
    wrappedOnFinal(null, result)
    return result
  })
}

export type RetryWithCountOptions = {
  count:    number;
  interval: number;
}

export function retryWithCount<T> (options: RetryWithCountOptions, fn: PromiseFunction<T>): PromiseFunction<T> {
  let n = 0

  return retry<T>(fn, {
    timeout:       99999,
    retryInterval: options.interval,
    shouldRetry:   () => ++n <= options.count
  })
}

export function flow (...fns: Array<Function>): Promise<any> {
  const result = new Array(fns.length)
  const finalPromise = fns.reduce((prev: Promise<any>, fn: Function, i: number) => {
    return prev.then((res) => {
      if (i > 0) {
        result[i - 1] = res
      }
      return fn(res)
    })
  }, Promise.resolve())

  return finalPromise.then((res) => {
    result[fns.length - 1] = res
    return result
  })
}

type PromiseFunc<T> = (...args: any[]) => Promise<T>

export function guardVoidPromise (fn: Function): PromiseFunc<void> {
  return (...args: any[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        resolve(fn(...args))
      } catch (e) {
        reject(e)
      }
    })
    .then(
      () => {},
      (e: Error) => {
        log.error(e)
      }
    )
  }
}

export function parseBoolLike (value: any, fallback: boolean = false): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return !!value
  }

  if (value === undefined) {
    return fallback
  }

  try {
    const val = JSON.parse(value.toLowerCase())
    return !!val
  } catch (e) {
    return fallback
  }
}

export function strictParseBoolLike (value: any): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  const result = JSON.parse(value.toLowerCase())

  if (typeof result !== 'boolean') {
    throw new Error('Not a boolean')
  }

  return result
}

export function sum (...list: number[]): number {
  return list.reduce((x, y) => x + y, 0)
}

export function concatUint8Array (...arrays: Uint8Array[]): Uint8Array {
  const totalLength = sum(...arrays.map(arr => arr.length))
  const result      = new Uint8Array(totalLength)

  for (let i = 0, offset = 0, len = arrays.length; i < len; i += 1) {
    result.set(arrays[i], offset)
    offset += arrays[i].length
  }

  return result
}

export function withPromise <T> (factory: () => T | Promise<T>): Promise<T> {
  return new Promise((resolve) => {
    resolve(factory())
  })
}

export function clone <T> (data: T): T {
  if (data === undefined) return undefined as any
  return JSON.parse(JSON.stringify(data))
}

export type  ObjMapFunc<ValueT, ResultT> = (value: ValueT, key: string, i: number, whole: Record<string, ValueT>) => ResultT

export const objMap = <T extends Record<string, any>, ResultT>(fn: ObjMapFunc<T[keyof T], ResultT>, obj: T): Record<keyof T, ResultT> => {
  const keys = typeof obj === 'object' ? Object.keys(obj) : []

  return keys.reduce((prev: Record<string, any>, key, i) => {
    prev[key] = fn(obj[key], key, i, obj)
    return prev
  }, <any> {}) as Record<keyof T, ResultT>
}

export function milliSecondsToStringInSecond (ms: number) {
  return (ms / 1000).toFixed(2) + 's'
}

interface ConcurrentQueueObj {
  resolve:  Function,
  reject:   Function
}

type ConcurrentReturnedFunction = (f: Function, object?: any) => any

export const concurrent = function (max: number): ConcurrentReturnedFunction {
  var queue: ConcurrentQueueObj[] = []
  var running: number = 0
  var free = function (): void {
    running--
    check()
  }
  const check   = function (): void {
    if (running >= max || queue.length <= 0)  return

    var tuple = <ConcurrentQueueObj>queue.shift()
    var resolve = tuple.resolve
    running++
    resolve(free)
  }
  const wait = function (): Promise<Function> {
    return new Promise(function (resolve, reject) {
      queue.push({ resolve, reject })
      check()
    })
  }
  const wrap = function (fn: Function, context: any) {
    return function () {
      const args = [].slice.apply(arguments)

      return wait()
      .then(function (done) {
        return fn.apply(context, args)
        .then(
          function (ret: any) {
            done()
            return ret
          },
          function (error: Error) {
            done()
            throw error
          }
        )
      })
    }
  }

  return wrap;
}

export function errorClassFactory (name: string) {
  return class extends Error {
    public code: string

    constructor (...args: any[]) {
      super(...args)
      this.code = name

      if (this.message) {
        this.message = name + ': ' + this.message
      } else {
        this.message = name;
      }
    }
  }
}

export function treeMap <A extends Record<string, any>, B extends Record<string, any>> (
  mapper: (data: A, paths: number[]) => B,
  tree: Tree<A>,
  paths: number[] = []
): Tree<B> {
  return {
    ...mapper(tree as any, paths),
    children: tree.children.map((subnode, i) => {
      return treeMap(mapper, subnode, [...paths, i])
    })
  }
}

export function treeFilter <T> (
  predicate: (data: T, paths: number[]) => boolean,
  tree: Tree<T>,
  paths: number[] = []
): Tree<T> | null {
  if (predicate(tree, paths)) {
    return tree
  }

  const children: Array<Tree<T> | null> = tree.children.map((subnode, i) => {
    return treeFilter(predicate, subnode, [...paths, i])
  })
  const validChildren = children.filter((item) => item) as Tree<T>[]

  return validChildren.length === 0 ? null : { ...tree, children: validChildren }
}

export function treeSlice <T> (max: number, tree: Tree<T>): Tree<T> | null {
  let root: Tree<T> | null  = null
  let count = 0

  traverseTree((data: T, paths: number[]) => {
    if (++count > max) {
      return TraverseTreeResult.Stop
    }

    if (paths.length === 0) {
      root = { ...data, children: [] }
    } else {
      const finalIndex = paths[paths.length - 1]
      const parent = paths.slice(0, -1).reduce((node, index) => {
        return node.children[index] as Tree<T>
      }, root as Tree<T>)

      parent.children[finalIndex] = { ...data, children: [] }
    }

    return TraverseTreeResult.Normal
  }, tree)

  return root
}

export function forestSlice <T> (max: number, forest: Tree<T>[]): Tree<T>[] {
  const newTree = { children: forest } as Tree<T>
  const result  = treeSlice(max + 1, newTree)

  return result ? result.children : []
}

export function isTreeEqual <T> (isNodeEqual: (na: T, nb: T) => boolean, a: Tree<T>, b: Tree<T>): boolean {
  const aChildren = a.children || []
  const bChildren = b.children || []
  const alen = aChildren.length
  const blen = bChildren.length

  if (alen !== blen) {
    return false
  }

  if (!isNodeEqual(a, b)) {
    return false
  }

  for (let i = 0; i < alen; i++) {
    if (!isTreeEqual(isNodeEqual, a.children[i], b.children[i])) {
      return false
    }
  }

  return true
}

export function isForestEqual <T> (isNodeEqual: (na: T, nb: T) => boolean, a: Tree<T>[], b: Tree<T>[]): boolean {
  if (a.length !== b.length) {
    return false
  }

  for (let i = 0, len = a.length; i < len; i++) {
    if (!isTreeEqual(isNodeEqual, a[i], b[i])) {
      return false
    }
  }

  return true
}

export function nodeCount <T> (tree: Tree<T>): number {
  let count = 0

  traverseTree(() => {
    count++
    return TraverseTreeResult.Normal
  }, tree)

  return count
}

export enum TraverseTreeResult {
  Normal,
  Skip,
  Stop
}

export type TraverseTreeFunc<T> = (node: Tree<T>, paths: number[]) => TraverseTreeResult

export function traverseTree <T> (fn: TraverseTreeFunc<T>, node: Tree<T>, paths: number[] = []): TraverseTreeResult {
  const intent = fn(node, paths)

  if (intent !== TraverseTreeResult.Normal) {
    return intent
  }

  const childCount = node.children ? node.children.length : 0
  const children   = node.children || []

  for (let i = 0; i < childCount; i++) {
    if (traverseTree(fn, children[i], [...paths, i]) === TraverseTreeResult.Stop) {
      return TraverseTreeResult.Stop
    }
  }

  return TraverseTreeResult.Normal
}

export type NodePredicate<T> = (node: Tree<T>, paths: number[]) => boolean

export function pathsInNode <T> (predicate: NodePredicate<T>, root: Tree<T>): number[] | null {
  let result: number[] | null = null

  traverseTree((node, paths) => {
    if (predicate(node, paths)) {
      result = paths
      return TraverseTreeResult.Stop
    }
    return TraverseTreeResult.Normal
  }, root)

  return result ? result : null
}

export function ancestorsInNode <T> (predicate: NodePredicate<T>, root: Tree<T>): Array<Tree<T>> | null {
  const paths = pathsInNode(predicate, root)

  if (paths === null) {
    return null
  }

  const ancestorPaths = paths.slice(0, -1)
  const keys = addInBetween<string | number>('children', ancestorPaths)

  return ancestorPaths.map((_, index) => {
    const subKeys = keys.slice(0, index * 2 + 1)
    return getIn(subKeys, root.children)
  })
}

export function pathsInNodeList <T> (predicate: NodePredicate<T>, nodes: Array<Tree<T>>): number[] | null {
  for (let i = 0, len = nodes.length; i < len; i++) {
    const paths = pathsInNode(predicate, nodes[i])

    if (paths !== null) {
      return [i, ...paths]
    }
  }

  return null
}

export function ancestorsInNodesList <T> (predicate: NodePredicate<T>, nodes: Array<Tree<T>>): Array<Tree<T>> | null {
  for (let i = 0, len = nodes.length; i < len; i++) {
    const ancestors = ancestorsInNode(predicate, nodes[i])

    if (ancestors !== null) {
      return [nodes[i], ...ancestors]
    }
  }

  return null
}

export function flattenTreeWithPaths <T> (tree: Tree<T>): Array<{ node: T, paths: number[] }> {
  const result = [] as Array<{ node: T, paths: number[] }>

  traverseTree((node ,paths) => {
    result.push({
      paths,
      node: without(['children'], node) as T,
    })

    return TraverseTreeResult.Normal
  }, tree)

  return result
}

export function flatternTree <T> (tree: Tree<T>): T[] {
  return flattenTreeWithPaths(tree).map(item => item.node)
}

export function findNodeInTree <T> (predicate: NodePredicate<T>, tree: Tree<T>): T | null {
  let result: T | null = null

  traverseTree((node, paths) => {
    if (predicate(node, paths)) {
      result = node
      return TraverseTreeResult.Stop
    }
    return TraverseTreeResult.Normal
  }, tree)

  return result
}

export function findNodeInForest <T> (predicate: NodePredicate<T>, forest: Array<Tree<T>>): T | null {
  for (let i = 0, len = forest.length; i < len; i++) {
    const result = findNodeInTree(predicate, forest[i])

    if (result) {
      return result
    }
  }

  return null
}

export type MaybeArray<T> = T | T[]

export function toArray <T> (list: MaybeArray<T>): T[] {
  return Array.isArray(list) ? (list as T[]) : [list as T]
}

export type NodeByOffsetParams<T> = {
  tree:                 MaybeArray<Tree<T>>;
  isTargetQualified:    NodePredicate<T>;
  isCandidateQualified: NodePredicate<T>;
  offset:               number;
}

export function nodeByOffset <T> (params: NodeByOffsetParams<T>): Tree<T> | null {
  const { tree, isTargetQualified, isCandidateQualified, offset } = params

  if (Math.floor(offset) !== offset) {
    throw new Error(`offset must be integer. It's now ${offset}`)
  }

  let ret: Tree<T> | null = null

  const trees = toArray(tree)
  const cache: Array<Tree<T>> = []
  const maxCache = 1 + Math.ceil(Math.abs(offset))

  // Note: if offset is negative, which means you're looking for some item ahead,
  // we can get it from cache. Otherwise, use offsetLeft as counter until we reach the item.
  // So `found` could only be tree if `offset` is a positive integer
  let offsetLeft = Math.max(0, offset)
  let found = false

  for (let i = 0, len = trees.length; i < len; i++) {
    const traverseResult = traverseTree((node, paths) => {
      const qualified = isCandidateQualified(node, paths)

      if (!qualified) {
        return TraverseTreeResult.Normal
      }

      if (offset < 0) {
        cache.push(node)

        if (cache.length > maxCache) {
          cache.shift()
        }
      }

      if (offset > 0 && found) {
        offsetLeft -= 1

        if (offsetLeft === 0) {
          ret = node
          return TraverseTreeResult.Stop
        }
      }

      if (isTargetQualified(node, paths)) {
        if (offset <= 0) {
          const index = cache.length - 1 + offset
          ret = index >= 0 ? cache[index] : null
          return TraverseTreeResult.Stop
        } else {
          found = true
        }
      }

      return TraverseTreeResult.Normal
    }, trees[i])

    if (traverseResult === TraverseTreeResult.Stop) {
      break
    }
  }

  return ret
}

export type PointToFitRectOptions = {
  bound:  Rect;
  size:   Size;
  point:  Point;
}

export function pointToFitRect (data: PointToFitRectOptions): Point {
  const { bound, size, point } = data

  const lBorder = bound.x
  const rBorder = bound.x + bound.width
  const tBorder = bound.y
  const bBorder = bound.y + bound.height

  const x = (() => {
    if (point.x + size.width <= rBorder) {
      return point.x
    }

    if (point.x - size.width >= lBorder) {
      return point.x - size.width
    }

    return rBorder - size.width
  })()

  const y = (() => {
    if (point.y + size.height <= bBorder) {
      return point.y
    }

    if (point.y - size.height >= tBorder) {
      return point.y - size.height
    }

    return bBorder - size.height
  })()

  return { x, y }
}

export function addInBetween <T> (item: T, list: T[]): T[] {
  const result: T[] = []

  for (let i = 0, len = list.length; i < len; i++) {
    if (i !== 0) {
      result.push(item)
    }
    result.push(list[i])
  }

  return result
}

export function normalizeHtmlId (str: string): string {
  return str.replace(/[^A-Za-z0-9_-]/g, '_')
}

export const unique = <T>(list: T[], getKey: (item: T) => string): T[] => {
  let cache: Record<string, any> = {}

  const result = list.reduce((prev: T[], cur) => {
    const key = getKey(cur)

    if (!cache[key]) {
      cache[key] = true
      prev.push(cur)
    }
    return prev
  }, [])

  return result
}

export const uniqueStrings = (...list: string[]): string[] => {
  return unique<string>(list, x => x)
}


export interface Consecutive {
  interval?: number,
  count: number
}

export type WeakConsecutive = boolean | Consecutive

export type ConsecutiveFunction = () => Promise<boolean>

export function consecutive (c: WeakConsecutive): Consecutive {
  if (typeof c === 'boolean') {
    return {
      interval: 0,
      count: c ? 1 : 0
    }
  }
  return c
}

const timeout = (duration: number) => {
  return new Promise(resolve => {
    setTimeout(resolve, duration)
  })
}

export function withConsecutive(c: WeakConsecutive, fn: ConsecutiveFunction): Promise<boolean> {
  const { interval, count } = consecutive(c)
  let counter = count

  const next = (pass: boolean): Promise<boolean> => {
    if (!pass)            throw new Error('failed to run consecutive')
    if (counter-- <= 0)   return Promise.resolve(true)

    return timeout(interval || 0).then(fn).then(next)
  }

  return fn()
  .then(next)
}

export function readFileAsText (file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader  = new FileReader()

    reader.onload = (readerEvent: any) => {
      try {
        const text = readerEvent.target.result
        resolve(text)
      } catch (e) {
        reject(e)
      }
    }

    reader.readAsText(file)
  })
}


export function assertExhausted (_: never, msg?: string): void {
  throw new Error('switch case not exhausted' + (msg ? (': ' + msg) : ''))
}

export function pad2digits (n: number): string {
  if (n >= 0 && n < 10) {
    return '0' + n
  }
  return '' + n
}

export function repeatStr (n: number, str: string): string {
  let s: string = ''

  for (let i = 0; i < n; i++) {
    s += str
  }

  return s
}

export function isMac (): boolean {
  const userAgent = window.navigator.userAgent
  return !!/macintosh/i.test(userAgent) || (/mac os x/i.test(userAgent) && !/like mac os x/i.test(userAgent))
}

export function isWindows (): boolean {
  const userAgent = window.navigator.userAgent
  return !!/windows/i.test(userAgent)
}

export function resolvePath (path: any, basePath: string, relativePath: string): string {
  const dirPath = path.dirname(basePath)

  relativePath = relativePath.replace(/\\/g, '/')

  if (relativePath.indexOf('/') === 0) {
    return path.normalize(relativePath).replace(/^(\/|\\)/, '')
  } else {
    return path.join(dirPath, relativePath)
  }
}

export type CountDownOptions = {
  timeout:      number;
  interval:     number;
  onTick:       (data: { past: number, total: number }) => void;
  onTimeout?:   (data: { past: number, total: number }) => void;
}

export function countDown (options: CountDownOptions): Function {
  const { interval, timeout, onTick, onTimeout } = options
  let past = 0

  const timer = setInterval(() => {
    past += interval

    try {
      onTick({ past, total: timeout })
    } catch (e) {
      console.warn(e)
    }

    if (past >= timeout) {
      clearInterval(timer)

      if (typeof onTimeout === 'function') {
        try {
          onTimeout({ past, total: timeout })
        } catch (e) {
          console.warn(e)
        }
      }
    }
  }, options.interval)

  return () => clearInterval(timer)
}

export type WithCountDownParams = {
  interval: number;
  timeout: number;
  onTick: (params: { cancel: () => void; past: number; total: number }) => void;
}

export const withCountDown = (options: WithCountDownParams) => {
  const { interval, timeout, onTick } = options
  let past = 0

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      past += interval

      try {
        onTick({ cancel, past, total: timeout })
      } catch (e) { console.error(e) }

      if (past >= timeout)  clearInterval(timer)
    }, interval)

    const cancel = () => clearInterval(timer)

    const p = delay(() => {}, timeout)
    .then(() => clearInterval(timer))

    resolve(p)
  })
}

export function urlWithQueries (url: string, queries: Record<string, any> = {}): string {
  const hasQuery = Object.keys(queries).length > 0

  if (!hasQuery) {
    return url
  }

  const queryStr = Object.keys(queries).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queries[key]?.toString())}`).join('&')
  return `${url}?${queryStr}`
}

export function throttlePromiseFunc <Func extends PromiseFunc<any>> (fn: Func, interval: number): Func {
  if (interval <= 0) {
    throw new Error("Interval must be positive number")
  }

  let p: Promise<void> = Promise.resolve()

  const generatedFunc = (...args: Parameters<Func>): ReturnType<Func> => {
    const ret = p.then(() => {
      console.log("in generatedFunc...", args)
      return fn(...args)
    })

    p = ret.then(
      () => delay(() => {}, interval),
      () => delay(() => {}, interval)
    )

    return ret as ReturnType<Func>
  };

  return generatedFunc as any as Func
}
