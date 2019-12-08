import Ext from '../common/web_extension'

const platform = Ext.isFirefox() ? 'firefox' : 'chrome'

export default {
  preinstallVersion: '3.3.1',
  urlAfterUpgrade: `https://a9t9.com/kantu/web-automation/${platform}/whatsnew`,
  urlAfterInstall: `https://a9t9.com/kantu/web-automation/${platform}/welcome`,
  urlAfterUninstall: `https://a9t9.com/kantu/web-automation/${platform}/why`
}
