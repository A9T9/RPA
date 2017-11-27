
const fs = (function () {
  const requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem

  if (!requestFileSystem) {
    throw new Error('requestFileSystem not supported')
  }

  const dumbSize  = 1024 * 1024
  const maxSize   = 5 * 1024 * 1024
  const getFS = (size) => {
    size = size || maxSize

    return new Promise((resolve, reject) => {
      requestFileSystem(window.TEMPORARY, size, resolve, reject)
    })
  }

  const getDirectory = (dir, shouldCreate, fs) => {
    const parts   = (Array.isArray(dir) ? dir : dir.split('/')).filter(p => p && p.length)
    const getDir  = (parts, directoryEntry) => {
      if (!parts || !parts.length)  return Promise.resolve(directoryEntry)

      return new Promise((resolve, reject) => {
        directoryEntry.getDirectory(
          parts[0],
          { create: !!shouldCreate },
          (dirEntry) => resolve(dirEntry),
          (e) => reject(e)
        )
      })
      .then(entry => getDir(parts.slice(1), entry))
    }

    const pFS = fs ? Promise.resolve(fs) : getFS(dumbSize)
    return pFS.then(fs => getDir(parts, fs.root))
  }

  // @return a Promise of [FileSystemEntries]
  const list = (dir = '/') => {
    return getFS(dumbSize)
    .then(fs => {
      return new Promise((resolve, reject) => {
        getDirectory(dir).then(dirEntry => {
          let result      = []
          const dirReader = dirEntry.createReader()
          const read = () => {
            dirReader.readEntries(entries => {
              if (entries.length === 0) {
                resolve(result.sort())
              } else {
                result = result.concat(Array.from(entries))
                read()
              }
            }, reject)
          }

          read()
        })
        .catch(reject)
      })
    })
  }

  const fileLocator = (filePath, fs) => {
    const parts = filePath.split('/')
    return getDirectory(parts.slice(0, -1), false, fs)
    .then(directoryEntry => ({
      directoryEntry,
      fileName: parts.slice(-1)[0]
    }))
  }

  const readFile = (filePath, type) => {
    if (['ArrayBuffer', 'BinaryString', 'DataURL', 'Text'].indexOf(type) === -1) {
      throw new Error(`invalid readFile type, '${type}'`)
    }

    return getFS()
    .then(fs => {
      return fileLocator(filePath, fs)
      .then(({ directoryEntry, fileName }) => {
        return new Promise((resolve, reject) => {
          directoryEntry.getFile(fileName, {}, (fileEntry) => {
            fileEntry.file(file => {
              const reader = new FileReader()

              reader.onerror    = reject
              reader.onloadend  = function () {
                resolve(this.result)
              }

              switch (type) {
                case 'ArrayBuffer':   return reader.readAsArrayBuffer(file)
                case 'BinaryString':  return reader.readAsBinaryString(file)
                case 'DataURL':       return reader.readAsDataURL(file)
                case 'Text':          return reader.readAsText(file)
                default:              throw new Error(`unsupported data type, '${type}`)
              }
            }, reject)
          }, reject)
        })
      })
    })
  }

  const writeFile = (filePath, blob, size) => {
    return getFS(size)
    .then(fs => {
      return fileLocator(filePath, fs)
      .then(({ directoryEntry, fileName }) => {
        return new Promise((resolve, reject) => {
          directoryEntry.getFile(fileName, { create: true }, (fileEntry) => {
            fileEntry.createWriter(fileWriter => {
              fileWriter.onwriteend = () => resolve(fileEntry.toURL())
              fileWriter.onerror    = reject

              fileWriter.write(blob)
            })
          }, reject)
        })
      })
    })
  }

  const removeFile = (filePath) => {
    return getFS()
    .then(fs => {
      return fileLocator(filePath, fs)
      .then(({ directoryEntry, fileName }) => {
        return new Promise((resolve, reject) => {
          directoryEntry.getFile(fileName, { create: true }, (fileEntry) => {
            fileEntry.remove(resolve, reject)
          }, reject)
        })
      })
    })
  }

  const getMetadata = (filePath) => {
    return getFS()
    .then(fs => {
      if (filePath.getMetadata) {
        return new Promise((resolve, reject) => {
          return filePath.getMetadata(resolve)
        })
      }

      return fileLocator(filePath, fs)
      .then(({ directoryEntry, fileName }) => {
        return new Promise((resolve, reject) => {
          directoryEntry.getFile(fileName, { create: true }, (fileEntry) => {
            fileEntry.getMetadata(resolve)
          }, reject)
        })
      })
    })
  }

  const exists = (filePath, { type } = {}) => {
    return getFS()
    .then(fs => {
      return fileLocator(filePath, fs)
      .then(({ directoryEntry, fileName }) => {
        const isSomeEntry = (getMethodName) =>  {
          return new Promise((resolve) => {
            directoryEntry[getMethodName](
              fileName,
              { create: false },
              () => resolve(true),
              () => resolve(false)
            )
          })
        }

        const pIsFile = isSomeEntry('getFile')
        const pIsDir  = isSomeEntry('getDirectory')

        return Promise.all([pIsFile, pIsDir])
        .then(([isFile, isDir]) => {
          switch (type) {
            case 'file':        return isFile
            case 'directory':   return isDir
            default:            return isFile || isDir
          }
        })
      })
    })
  }

  return {
    list,
    readFile,
    writeFile,
    removeFile,
    getDirectory,
    getMetadata,
    exists
  }
})()

// For test only
window.fs = fs

export default fs
