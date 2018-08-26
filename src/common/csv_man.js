import fs from './filesystem'
import FileMan from './file_man'
import Ext from './web_extension'

export class CSVMan extends FileMan {
  constructor (opts = {}) {
    super({ ...opts, baseDir: 'spreadsheets' })
  }

  getLink (fileName) {
    if (!Ext.isFirefox()) return Promise.resolve(super.getLink(fileName) + '?' + new Date().getTime())

    // Note: Except for Chrome, the filesystem API we use is a polyfill from idb.filesystem.js
    // idb.filesystem.js works great but the only problem is that you can't use 'filesystem:' schema to retrieve that file
    // so here, we have to convert the file to data url
    return fs.readFile(this.__filePath(fileName), 'DataURL')
  }
}

let man

export function getCSVMan (opts = {}) {
  if (opts) {
    man = new CSVMan(opts)
  }

  if (!man) {
    throw new Error('csv manager not initialized')
  }

  return man
}
