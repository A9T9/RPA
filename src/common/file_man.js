import fs from './filesystem'
import Ext from './web_extension'
import { validateStandardName, withFileExtension } from './utils'

const readableSize = (size) => {
  const kb = 1024
  const mb = kb * kb

  if (size < kb) {
    return size + ' byte'
  }

  if (size < mb) {
    return (size / kb).toFixed(1) + ' KB'
  }

  return (size / mb).toFixed(1) + ' MB'
}

export default class FileMan {
  constructor (opts = {}) {
    const { baseDir = 'share' } = opts

    if (!baseDir || baseDir === '/') {
      throw new Error(`Invalid baseDir, ${baseDir}`)
    }

    this.baseDir = baseDir

    // Note: create the folder in which we will store csv files
    fs.getDirectory(baseDir, true)
  }

  checkFileName (fileName) {
    withFileExtension(fileName, (baseName) => {
      try {
        validateStandardName(baseName, true)
      } catch (e) {
        throw new Error(`Invalid file name '${fileName}'. File name ` + e.message)
      }
      return baseName
    })
  }

  getLink (fileName) {
    const tmp = Ext.extension.getURL('temporary')
    return `filesystem:${tmp}/${this.__filePath(encodeURIComponent(fileName))}`
  }

  list () {
    return fs.list(this.baseDir)
    .then(fileEntries => {
      const ps = fileEntries.map(fileEntry => {
        return fs.getMetadata(fileEntry)
        .then(meta => ({
          dir: this.baseDir,
          fileName: fileEntry.name,
          size: readableSize(meta.size),
          lastModified: meta.modificationTime
        }))
      })
      return Promise.all(ps)
    })
  }

  exists (fileName) {
    return fs.exists(this.__filePath(fileName), { type: 'file' })
  }

  read (fileName) {
    return fs.readFile(this.__filePath(fileName), 'Text')
  }

  write (fileName, text) {
    return fs.writeFile(this.__filePath(fileName, true), new Blob([text]))
  }

  // Note: when you try to write on an existing file with file system api,
  // it won't clear old content, so we have to do it mannually
  overwrite (fileName, text) {
    return this.remove(fileName).catch(() => { /* Ignore any error */ })
    .then(() => this.write(fileName, text))
  }

  clear () {
    return this.list()
    .then(list => {
      const ps = list.map(file => {
        return this.remove(file.fileName)
      })

      return Promise.all(ps)
    })
  }

  remove (fileName) {
    return fs.removeFile(this.__filePath(fileName))
  }

  rename (fileName, newName) {
    return fs.moveFile(this.__filePath(fileName), this.__filePath(newName, true))
  }

  metadata (fileName) {
    return fs.getMetadata(this.__filePath(fileName))
  }

  __filePath (fileName, forceCheck) {
    if (forceCheck) {
      this.checkFileName(fileName)
    }

    return this.baseDir + '/' + fileName.toLowerCase()
  }
}
