/// <reference types="filesystem"/>

export interface IBrowserFileSystem {
  list: (dir: string) => Promise<Entry[]>;
  readFile: (filePath: string, type: ReadFileType) => Promise<string | ArrayBuffer | null>;
  writeFile: (filePath: string, blob: Blob, size?: number) => Promise<string>;
  removeFile: (filePath: string) => Promise<void>;
  moveFile: (sourcePath: string, targetPath: string) => Promise<Entry>;
  copyFile: (sourcePath: string, targetPath: string) => Promise<Entry>;
  getDirectory: (dir: string, shouldCreate: boolean, fs?: IBrowserFileSystem) => Promise<DirectoryEntry>;
  getMetadata: (filePath: string | Entry, isDirectory?: boolean) => Promise<Metadata>;
  exists: (path: string, options?: { type: 'file' | 'directory' }) => Promise<boolean>;
  existsStat: (path: string) => Promise<{ isFile: boolean, isDirectory: boolean }>;
  ensureDirectory: (dir: string, fs?: IBrowserFileSystem) => Promise<DirectoryEntry>;
  rmdir: (dir: string, fs?: IBrowserFileSystem) => Promise<void>;
  rmdirR: (dir: string, fs?: IBrowserFileSystem) => Promise<void>;
}

export type ReadFileType = 'ArrayBuffer' | 'BinaryString' | 'DataURL' | 'Text'

declare const fs: IBrowserFileSystem

export default fs
