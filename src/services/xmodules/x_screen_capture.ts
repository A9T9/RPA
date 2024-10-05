import { XModule, XModuleTypes } from './common'
import { getNativeXYAPI, NativeXYAPI } from '../xy'
import { singletonGetter } from '../../common/ts_utils'
import { NativeScreenCapture, getNativeScreenCapture } from '../screen_capture'

export class XScreenCapture extends XModule<NativeScreenCapture> {
  getName (): string {
    return XModuleTypes.XScreenCapture
  }

  getAPI (): NativeScreenCapture {
    return getNativeScreenCapture()
  }

  initConfig () {
    return this.getConfig()
  }

  sanityCheck (): Promise<boolean> {
    return Promise.all([
      this.getConfig(),
      this.getAPI().getVersion()
        .catch(e => {
          throw new Error('Error #301: Screen Capture XModule is not installed yet')
        })
    ])
    .then(() => true)
  }

  checkUpdate (): Promise<string> {
    return Promise.reject(new Error('checkUpdate is not implemented yet'))
	}

  checkUpdateLink (modVersion: string, extVersion: string): string {
    return `https://goto.ui.vision/x/idehelp?help=xscreencapture_updatecheck&xversion=${modVersion}&kantuversion=${extVersion}`
  }

  downloadLink (): string {
    return 'https://goto.ui.vision/x/idehelp?help=xscreencapture_download'
  }

  infoLink (): string {
    return 'https://goto.ui.vision/x/idehelp?help=xscreencapture'
  }
}

export const getXScreenCapture = singletonGetter(() => {
  return new XScreenCapture()
})
