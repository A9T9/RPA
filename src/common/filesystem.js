// idb.filesystem.js is required for Firefox because it doesn't support `requestFileSystem` and `webkitRequestFileSystem`
import 'idb.filesystem.js'

const fs = (function () {
  const requestFileSystem = self.requestFileSystem || self.webkitRequestFileSystem

  if (!requestFileSystem) {
    console.warn('requestFileSystem not supported')
    return undefined
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

  const ensureDirectory = (dir, fs) => {
    return getDirectory(dir, true, fs)
  }

  const rmdir = (dir, fs) => {
    return getDirectory(dir, false, fs)
    .then((directoryEntry) => {
      return new Promise((resolve, reject) => {
        directoryEntry.remove(resolve, reject)
      })
    })
  }

  const rmdirR = (dir, fs) => {
    return getDirectory(dir, false, fs)
    .then((directoryEntry) => {
      return new Promise((resolve, reject) => {
        return directoryEntry.removeRecursively(resolve, reject)
      })
    })
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
    .catch(e => {
      console.warn('list', e.code, e.name, e.message)
      throw e
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
    .catch(e => {
      console.warn('readFile', e.code, e.name, e.message)
      throw e
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
    .catch(e => {
      console.warn(e.code, e.name, e.message)
      throw e
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
    .catch(e => {
      console.warn('removeFile', e.code, e.name, e.message)
      throw e
    })
  }

  const moveFile = (srcPath, targetPath) => {
    return getFS()
    .then(fs => {
      return Promise.all([
        fileLocator(srcPath, fs),
        fileLocator(targetPath, fs)
      ])
      .then(tuple => {
        const srcDirEntry = tuple[0].directoryEntry
        const srcFileName = tuple[0].fileName
        const tgtDirEntry = tuple[1].directoryEntry
        const tgtFileName = tuple[1].fileName

        return new Promise((resolve, reject) => {
          srcDirEntry.getFile(srcFileName, {}, (fileEntry) => {
            try {
              fileEntry.moveTo(tgtDirEntry, tgtFileName, resolve, reject)
            } catch (e) {
              // Note: For firefox, we use `idb.filesystem.js`, but it hasn't implemented `moveTo` method
              // so we have to mock it with read / write / remove
              readFile(srcPath, 'ArrayBuffer')
              .then(arrayBuffer => writeFile(targetPath, new Blob([new Uint8Array(arrayBuffer)])))
              .then(() => removeFile(srcPath))
              .then(resolve, reject)
            }
          }, reject)
        })
      })
    })
  }

  const copyFile = (srcPath, targetPath) => {
    return getFS()
    .then(fs => {
      return Promise.all([
        fileLocator(srcPath, fs),
        fileLocator(targetPath, fs)
      ])
      .then(tuple => {
        const srcDirEntry = tuple[0].directoryEntry
        const srcFileName = tuple[0].fileName
        const tgtDirEntry = tuple[1].directoryEntry
        const tgtFileName = tuple[1].fileName

        return new Promise((resolve, reject) => {
          srcDirEntry.getFile(srcFileName, {}, (fileEntry) => {
            try {
              fileEntry.copyTo(tgtDirEntry, tgtFileName, resolve, reject)
            } catch (e) {
              // Note: For firefox, we use `idb.filesystem.js`, but it hasn't implemented `copyTo` method
              // so we have to mock it with read / write
              readFile(srcPath, 'ArrayBuffer')
              .then(arrayBuffer => writeFile(targetPath, new Blob([new Uint8Array(arrayBuffer)])))
              .then(resolve, reject)
            }
          }, reject)
        })
      })
    })
    .catch(e => {
      console.warn('copyFile', e.code, e.name, e.message)
      throw e
    })
  }

  const getMetadata = (filePath, isDirectory = false) => {
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
          const args = [
            fileName,
            { create: false },
            (entry) => {
              entry.getMetadata(resolve)
            },
            reject
          ]

          if (isDirectory) {
            directoryEntry.getDirectory(...args)
          } else {
            directoryEntry.getFile(...args)
          }
        })
      })
    })
    .catch(e => {
      console.warn('getMetadata', e.code, e.name, e.message)
      throw e
    })
  }

  const existsStat = (entryPath) => {
    return getFS()
    .then(fs => {
      return fileLocator(entryPath, fs)
      .then(({ directoryEntry, fileName }) => {
        const isSomeEntry = (getMethodName) =>  {
          return new Promise((resolve) => {
            directoryEntry[getMethodName](
              fileName,
              { create: false },
              (data) => {
                resolve(true)
              },
              () => resolve(false)
            )
          })
        }

        const pIsFile = isSomeEntry('getFile')
        const pIsDir  = isSomeEntry('getDirectory')

        return Promise.all([pIsFile, pIsDir])
        .then(([isFile, isDirectory]) => {
          return {
            isFile,
            isDirectory
          }
        })
      })
    })
    .catch(e => {
      // DOMException.NOT_FOUND_ERR === 8
      if (e && e.code === 8) {
        return {
          isFile:      false,
          isDirectory: false
        }
      }

      console.warn('fs.exists', e.code, e.name, e.message)
      throw e
    })
  }

  const exists = (entryPath, { type } = {}) => {
    return existsStat(entryPath)
    .then((stat) => {
      switch (type) {
        case 'file':
          return stat.isFile

        case 'directory':
          return stat.isDirectory

        default:
          return stat.isFile || stat.isDirectory
      }
    })
  }

  return {
    list,
    readFile,
    writeFile,
    removeFile,
    moveFile,
    copyFile,
    getDirectory,
    getMetadata,
    ensureDirectory,
    exists,
    existsStat,
    rmdir,
    rmdirR
  }
})()

// For test only
self.fs = fs

export default fs
