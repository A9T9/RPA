import Ext from '../common/web_extension'

const platform = Ext.isFirefox() ? 'firefox' : 'chrome'

export default {
  preinstallVersion: '3.3.1',
  urlAfterUpgrade: `https://ui.vision/web-automation/${platform}/whatsnew`,
  urlAfterInstall: `https://ui.vision/web-automation/${platform}/welcome`,
  urlAfterUninstall: `https://ui.vision/web-automation/${platform}/why`
}
