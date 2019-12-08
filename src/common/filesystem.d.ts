/// <reference types="filesystem"/>

export interface IBrowserFileSystem {
  list: (dir: string) => Promise<Entry[]>;
  readFile: (filePath: string, type: ReadFileType) => Promise<string | ArrayBuffer | null>;
  writeFile: (filePath: string, blob: Blob, size?: number) => Promise<string>;
  removeFile: (filePath: string) => Promise<void>;
  moveFile: (sourcePath: string, targetPath: string) => Promise<Entry>;
  getDirectory: (dir: string, shouldCreate: boolean, fs?: IBrowserFileSystem) => Promise<DirectoryEntry>;
  getMetadata: (filePath: string | Entry) => Promise<Metadata>;
  exists: (path: string, options?: { type: 'file' | 'directory' }) => Promise<boolean>
}

export type ReadFileType = 'ArrayBuffer' | 'BinaryString' | 'DataURL' | 'Text'

declare const fs: IBrowserFileSystem

export default fs
