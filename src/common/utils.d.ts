import { string } from 'prop-types'

export const withFileExtension: (origName: string, fn: Function) => string | Promise<string>

export const validateStandardName: (name: string, isFileName?: boolean) => void

export const sanitizeFileName: (fileName: string) => string

export const uid: () => string

export const blobToDataURL: (blob: Blob, withBase64Prefix?: boolean) => Promise<string>

export const blobToText: (blob: Blob) => Promise<string>

export const dataURItoArrayBuffer: (dataURI: string) => ArrayBuffer

export const dataURItoBlob: (dataURI: string) => Blob

export const arrayBufferToString: (ab: ArrayBuffer) => string

export const stringToArrayBuffer: (str: string) => ArrayBuffer

export const and: (...args: boolean[]) => boolean

export const bindOnce: (target: EventTarget, eventName: string, fn: EventListener) => void

export const subjectiveBindOnce: (target: EventTarget, eventName: string, fn: EventListener) => void

export const bind: (target: EventTarget, eventName: string, fn: EventListener) => void

export const parseQuery: (str: string) => Record<string, any>

export const cloneSerializableLocalStorage: (localStorage: any) => any

export type ClassNameItem = string | null | Record<string, boolean>

export const cn: (...args: ClassNameItem[]) => string

export type UniqueNameOptions = {
  generate?: (oldName: string, step: number) => string
  check?: (name: string) => Promise<boolean>
}

export const uniqueName: (oldName: string, options?: UniqueNameOptions) => Promise<string>

export const withTimeout: (timeout: number, fn: (cancelFunc: () => void) => any) => Promise<any>

export const nameFactory: () => (name: string) => string

export const loadImage: (url: string) => Promise<Blob>

export const dpiFromFileName: (fileName: string) => number

export const getPageDpi: () => number

export const ensureExtName: (ext: string, name: string) => string

export const delay: <T>(fn: () => T, timeout: number) => Promise<T>

export function insertScript(filePath: string): void

export function waitForRenderComplete(selector?: string, timeout?: number): Promise<void>

export function delayMs(ms: number): Promise<void>

export function isSidePanelWindowAsync(window: Window): Promise<boolean>

export function objMap<T, R>(fn: (value: T, key: string, index: number) => R, obj: Record<string, T>): Record<string, R>

export function retry<T>(
  fn: (arg: any, options: { retryCount: number; retryInterval: number }) => Promise<T>,
  options: {
    timeout?: number
    onFirstFail?: (error: any) => void
    onFinal?: (error: any, result: T) => void
    shouldRetry?: (error: any, retryCount: number) => boolean
    retryInterval?: number | ((retryCount: number, lastInterval: number) => number)
  }
): (...args: any[]) => Promise<T>


type Key = string | number | '[]'
export function updateIn<T, O extends Record<string, any>>(keys: Key[], value: T, obj?: O): O
export declare const setIn: <T, O extends Record<string, any>>(keys: Key[], value: T, obj?: O) => O

export declare function splitIntoTwo(pattern: string, str: string): [string] | [string, string]
