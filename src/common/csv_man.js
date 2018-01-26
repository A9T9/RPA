import FileMan from './file_man'

export class CSVMan extends FileMan {
  constructor (opts = {}) {
    super({ ...opts, baseDir: 'spreadsheets' })
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
