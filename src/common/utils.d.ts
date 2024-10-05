import { string } from "prop-types";

export const withFileExtension: (origName: string, fn: Function) => string | Promise<string>

export const validateStandardName: (name: string, isFileName?: boolean) => void

export const sanitizeFileName: (fileName: string) => string

export const uid: () => string

export const blobToDataURL: (blob: Blob, withBase64Prefix?: boolean) => Promise<string>

export const blobToText: (blob: Blob) => Promise<string>;

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

export const cn: (...args: ClassNameItem[]) => string;

export type UniqueNameOptions = {
  generate?: (oldName: string, step: number) => string;
  check?:    (name: string) => Promise<boolean>;
}

export const uniqueName: (oldName: string, options?: UniqueNameOptions) => Promise<string>;

export const withTimeout: (timeout: number, fn: (cancelFunc: () => void) => any) => Promise<any>;

export const nameFactory: () => (name: string) => string;

export const loadImage: (url: string) => Promise<Blob>;

export const dpiFromFileName: (fileName: string) => number;

export const getPageDpi: () => number;

export const ensureExtName: (ext: string, name: string) => string;

export const delay: <T> (fn: () => T, timeout: number) => Promise<T>;

export function insertScript(filePath: string): void;

export function waitForRenderComplete(selector?:string, timeout?:number): Promise<void>;

export function delayMs(ms: number): Promise<void>;
