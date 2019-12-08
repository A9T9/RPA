
export const withFileExtension: (origName: string, fn: Function) => string | Promise<string>

export const validateStandardName: (name: string, isFileName?: boolean) => void

export const uid: () => string

export const blobToDataURL: (blob: Blob) => Promise<string>

export const dataURItoArrayBuffer: (dataURI: string) => ArrayBuffer

export const dataURItoBlob: (dataURI: string) => Blob

export const arrayBufferToString: (ab: ArrayBuffer) => string

export const stringToArrayBuffer: (str: string) => ArrayBuffer

export const and: (...args: boolean[]) => boolean
