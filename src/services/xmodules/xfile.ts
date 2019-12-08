import { XModule, XModuleTypes } from './common'
import { getNativeFileSystemAPI, SpecialFolder, NativeFileAPI } from '../filesystem'
import { singletonGetter } from '../../common/ts_utils'
import path from '../../common/lib/path'

export class XFile extends XModule<NativeFileAPI> {
  getName (): string {
    return XModuleTypes.XFile
  }

  getAPI (): NativeFileAPI {
    return getNativeFileSystemAPI()
  }

  initConfig () {
    return this.getConfig()
    .then(config => {
      if (!config.rootDir) {
        const fsAPI = getNativeFileSystemAPI()

        return fsAPI.getSpecialFolderPath({ folder: SpecialFolder.UserDesktop })
        .then(profilePath => {
          const kantuDir = path.join(profilePath, 'kantu')

          return fsAPI.ensureDir({ path: kantuDir })
          .then(done => {
            this.setConfig({
              rootDir: done ? kantuDir : profilePath
            })
          })
        })
      }
    })
  }

  sanityCheck (): Promise<boolean> {
    return Promise.all([
      this.getConfig(),
      this.getAPI()
        .reconnect()
        .catch(e => {
          throw new Error('xFile is not installed yet')
        })
    ])
    .then(([config, api]) => {
      if (!config.rootDir) {
        throw new Error('rootDir is not set')
      }

      const checkDirectoryExists = () => {
        return api.directoryExists({ path: config.rootDir })
        .then(existed => {
          if (!existed) throw new Error(`Directory '${config.rootDir}' doesn't exists`)
          return true
        })
      }

      const checkDirectoryWritable = () => {
        const testDir = path.join(config.rootDir, '__kantu__' + Math.round(Math.random() * 100))

        return api.createDirectory({ path: testDir })
        .then(created => {
          if (!created) throw new Error()
          return api.removeDirectory({ path: testDir })
        })
        .then(deleted => {
          if (!deleted) throw new Error()
          return true
        })
        .catch(e => {
          throw new Error(`Directory '${config.rootDir}' is not writable`)
        })
      }

      return checkDirectoryExists()
      .then(checkDirectoryWritable)
    })
  }

  checkUpdate (): Promise<string> {
    return Promise.reject(new Error('checkUpdate is not implemented yet'))
	}

  checkUpdateLink (modVersion: string, extVersion: string): string {
    return `https://a9t9.com/x/idehelp?help=xfileaccess_updatecheck?xversion=${modVersion}&kantuversion=${extVersion}`
  }

  downloadLink (): string {
    return 'https://a9t9.com/x/idehelp?help=xfileaccess_download'
  }

  infoLink (): string {
    return 'https://a9t9.com/x/idehelp?help=xfileaccess'
  }
}

export const getXFile = singletonGetter<XFile>(() => {
  return new XFile()
})
