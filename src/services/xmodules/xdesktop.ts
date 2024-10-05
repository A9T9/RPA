import { XModule, XModuleTypes } from './common'
import { getNativeCVAPI, NativeCVAPI } from '../desktop'
import { singletonGetter } from '../../common/ts_utils'

export class XDesktop extends XModule<NativeCVAPI> {
  getName (): string {
    return XModuleTypes.XDesktop
  }

  getAPI (): NativeCVAPI {
    return getNativeCVAPI()
  }

  initConfig () {
    return this.getConfig()
  }

  sanityCheck (): Promise<boolean> {
    return Promise.all([
      this.getConfig(),
      this.getAPI().getVersion()
        .then(
          () => this.getAPI(),
          () => this.getAPI().reconnect()
        )
        .catch(e => {
          throw new Error('Error #301: Visual Desktop Automation XModule is not installed yet')
        })
    ])
    .then(() => true)
  }

  checkUpdate (): Promise<string> {
    return Promise.reject(new Error('checkUpdate is not implemented yet'))
	}

  checkUpdateLink (modVersion: string, extVersion: string): string {
    return `https://goto.ui.vision/x/idehelp?help=xdesktop_updatecheck&xversion=${modVersion}&kantuversion=${extVersion}`
  }

  downloadLink (): string {
    return 'https://goto.ui.vision/x/idehelp?help=xdesktop_download'
  }

  infoLink (): string {
    return 'https://goto.ui.vision/x/idehelp?help=xdesktop'
  }
}

export const getXDesktop = singletonGetter(() => {
  return new XDesktop()
})
