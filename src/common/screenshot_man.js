import fs from './filesystem'
import FileMan from './file_man'

export class ScreenshotMan extends FileMan {
  constructor (opts = {}) {
    super({ ...opts, baseDir: 'screenshots' })
  }

  write (fileName, blob) {
    return fs.writeFile(this.__filePath(fileName), blob)
  }

  read (fileName) {
    return fs.readFile(this.__filePath(fileName), 'ArrayBuffer')
  }
}

let man

export function getScreenshotMan (opts = {}) {
  if (opts) {
    man = new ScreenshotMan(opts)
  }

  if (!man) {
    throw new Error('screenshot manager not initialized')
  }

  return man
}
