import { XModule, XModuleTypes } from './common'
import { getNativeFileSystemAPI, SpecialFolder, NativeFileAPI } from '../filesystem'
import { singletonGetter } from '../../common/ts_utils'
import path from '../../common/lib/path'

export class xLocal extends XModule<NativeFileAPI> {
  getName (): string {
    return XModuleTypes.XLocal
  }

  getAPI (): NativeFileAPI {
    return getNativeFileSystemAPI()
  }
   getVersionLocal (){
    return this.getConfig()
    .then(config => {
    return this.getAPI()
    .reconnect()
    .catch(e => {
      throw new Error(`${this.getName()} is not installed yet`)
    })
    .then(api => {
      return api.getVersion()
      .then(version => ({
        version,
        installed: true
      }))
    })
    .catch(e => ({
      installed: false
    }))
  })
  }

  getLangs () {
    return this.getConfig()
    .then(config => {
        const fsAPI = getNativeFileSystemAPI()
        return fsAPI.getSpecialFolderPath({ folder: SpecialFolder.UserProfile })
        .then(profilePath => {
          const uivision = path.join(profilePath, '\\AppData\\Roaming\\UI.Vision\\XModules\\ocr')
          return fsAPI.ensureDir({ path: uivision })
          .then(Opath => {
           let path =uivision;
           let filepath = path+'\\ocrexe\\ocrcl1.exe';
           const Arguments = "get-installed-lng"+" "+path+"\\ocrlang.json";
           let ocrOutputJson = path+"\\ocrlang.json";
           let params={
            fileName: filepath,
            arguments: Arguments,
            waitForExit: true
          }
         return fsAPI.runProcess(params).
          then(res => {
            if (res != undefined  && res.exitCode !=null && res.exitCode > 0) {
              let params={
                path: ocrOutputJson,
                waitForExit: true
              }
              return fsAPI.readAllBytes(params);
            }else{
              return 
              
            }
          }).
          then(json => {
            if (json){
              if ( json.errorCode == 0 ) {
                console.log(json.content);
                return json.content;
              }else{
                return false;
              }
            }
          }).
          catch(() => console.log({result: false}));


        })
        })
        .catch(e => {
          // Ignore host not found error, `initConfig` is supposed to be called on start
          // But we can't guarantee that native fs module is already installed
          if (!/Specified native messaging host not found/.test(e)) {
            throw e
          }
        })

    })
  }

  initConfig () {
    return this.getConfig()
    .then(config => {
      if (!config.rootDir) {
        const fsAPI = getNativeFileSystemAPI()

        return fsAPI.getSpecialFolderPath({ folder: SpecialFolder.UserDesktop })
        .then(profilePath => {
          const kantuDir = path.join(profilePath, 'uivision')

          return fsAPI.ensureDir({ path: kantuDir })
          .then(done => {
            this.setConfig({
              rootDir: done ? kantuDir : profilePath
            })
          })
        })
        .catch(e => {
          // Ignore host not found error, `initConfig` is supposed to be called on start
          // But we can't guarantee that native fs module is already installed
          if (!/Specified native messaging host not found/.test(e)) {
            throw e
          }
        })
      }
    })
  }

  sanityCheck (simple?: boolean): Promise<boolean> {
    return Promise.all([
      this.getConfig(),
      this.getAPI().getVersion()
        .then(
          () => this.getAPI(),
          () => this.getAPI().reconnect()
        )
        .catch(e => {
          throw new Error('xFile is not installed yet')
        })
    ])
    .then(([config, api]) => {
      if (simple) {
        return true
      }

      if (!config.rootDir) {
        throw new Error('rootDir is not set')
      }

      const checkDirectoryExists = () => {
        return api.directoryExists({ path: config.rootDir })
        .then((existed: boolean) => {
          if (!existed) throw new Error(`Directory '${config.rootDir}' doesn't exist`)
          return true
        })
      }

      const checkDirectoryWritable = () => {
        const testDir = path.join(config.rootDir, '__kantu__' + Math.round(Math.random() * 100))

        return api.createDirectory({ path: testDir })
        .then((created: boolean) => {
          if (!created) throw new Error()
          return api.removeDirectory({ path: testDir })
        })
        .then((deleted: boolean) => {
          if (!deleted) throw new Error()
          return true
        })
        .catch((e: Error) => {
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
    return `https://goto.ui.vision/x/idehelp?help=xmodule-ocr_updatecheck&xversion=${modVersion}&kantuversion=${extVersion}`
  }

  downloadLink (): string {
    return 'https://goto.ui.vision/x/idehelp?help=xmodule-ocr_download'
  }

  infoLink (): string {
    return 'https://goto.ui.vision/x/idehelp?help=xmodule-ocr'
  }
}

export const getXLocal = singletonGetter(() => {
  return new xLocal()
})
