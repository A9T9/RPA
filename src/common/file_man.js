import fs from './filesystem'
import Ext from './web_extension'

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
    return fs.writeFile(this.__filePath(fileName), new Blob([text]))
  }

  // Note: when you try to write on an existing file with file system api,
  // it won't clear old content, so we have to do it mannually
  overwrite (fileName, text) {
    return this.remove(fileName).catch(() => { /* Ignore any error */ })
    .then(() => this.write(fileName, text))
  }

  remove (fileName) {
    return fs.removeFile(this.__filePath(fileName))
  }

  metadata (fileName) {
    return fs.getMetadata(this.__filePath(fileName))
  }

  __filePath (fileName) {
    return this.baseDir + '/' + fileName
  }
}
