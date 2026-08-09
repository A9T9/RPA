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
getLangs (osType:any) {
    return this.getConfig()
    .then(config => {
      const { rootDir } = getXFile().getCachedConfig();
        const fsAPI = getNativeFileSystemAPI()
        return fsAPI.getSpecialFolderPath({ folder: SpecialFolder.UserProfile })
        .then(profilePath => {
          const uivision = osType == "mac"?'/Library/uivision-xmodules/2.2.2/xmodules/': path.join(profilePath, '\\AppData\\Roaming\\Ui.Vision\\XModules\\ocr');
          // ensureDir the directory we WRITE to, not the one we read the
          // binary from. It used to ensure `uivision` — the XModules install
          // folder, which by definition already exists — while the output went
          // to <rootDir>/logs, which on a fresh profile does not. The OCR
          // binary does NOT create a missing output directory and still exits
          // 0 when the write fails, so the exitCode check below passed, the
          // read of the absent file failed, and Settings reported the module as
          // "Not Installed" on a machine where it was installed and working.
          const logsDir = osType == "mac" ? rootDir + "/logs" : rootDir + "\\logs"
          return fsAPI.ensureDir({ path: logsDir })
          .then(Opath => {
           let path =uivision;
           let outputpath = rootDir;
           let filepath: string = '', Arguments = '';
           let ocrOutputJson:any='';
           if (osType == "mac") {
            filepath =  path+'/ocr3';
						Arguments = " --in get-installed-lng --out "+outputpath+"/logs/ocrlang.json";
						ocrOutputJson = outputpath+"/logs/ocrlang.json";
          }else{
            filepath = path+'\\ocrexe\\ocrcl1.exe';
						Arguments = "get-installed-lng "+outputpath+"\\logs\\ocrlang.json";
						ocrOutputJson = outputpath+"\\logs\\ocrlang.json";
          }

           let params={
            fileName: filepath,
            arguments: Arguments,
            waitForExit: true
          }
         return fsAPI.runProcess(params).
          then(res => {
            if (res != undefined  && res.exitCode !=null && res.exitCode >= 0) {
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
    return `https://go.ui.vision/?help=xfileaccess_updatecheck&xversion=${modVersion}&kantuversion=${extVersion}`
  }

  downloadLink (): string {
    return 'https://go.ui.vision/?help=xfileaccess_download'
  }

  infoLink (): string {
    return 'https://go.ui.vision/?help=xfileaccess'
  }
}

export const getXFile = singletonGetter(() => {
  return new XFile()
})
