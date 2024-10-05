import Ext from '../common/web_extension'

const platform = Ext.isFirefox() ? 'firefox' : 'chrome'

export default {
  preinstall: {
    version: '5.8.8',
    macroFolder: '/Demo'
  },
  nativeMessaging: {
    idleTimeBeforeDisconnect: 1e4 // 10 seconds
  },
  urlAfterUpgrade: 'https://goto.ui.vision/x/idehelp?help=k_update',
  urlAfterInstall: 'https://goto.ui.vision/x/idehelp?help=k_welcome',
  urlAfterUninstall: 'https://goto.ui.vision/x/idehelp?help=k_why',
  performanceLimit: {
    fileCount: Infinity
  },
  xmodulesLimit: {
    unregistered: {
      ocrCommandCount: 100,
      xCommandCount: Infinity,
      xFileMacroCount: 10,
      proxyExecCount: Infinity,
      upgradeUrl: 'https://goto.ui.vision/x/idehelp?help=k_xupgradepro'
    },
    free: {
      ocrCommandCount: 250,
      xCommandCount: Infinity,
      xFileMacroCount: 20,
      proxyExecCount: Infinity,
      upgradeUrl: 'https://goto.ui.vision/x/idehelp?help=k_xupgradepro'
    },
    pro: {
      ocrCommandCount: 500,
      xCommandCount: Infinity,
      xFileMacroCount: Infinity,
      proxyExecCount: Infinity,
      upgradeUrl: 'https://goto.ui.vision/x/idehelp?help=k_xupgrade_contactsupport'
    }
  },
  xfile: {
    minVersionToReadBigFile: '1.0.10'
  },
  ocr: {
    freeApiEndpoint: 'https://api.ocr.space/parse/image',
    proApi1Endpoint: 'https://apipro1.ocr.space/parse/image',
    proApi2Endpoint: 'https://apipro2.ocr.space/parse/image',
    
    apiTimeout: 60 * 1000,
    singleApiTimeout: 30 * 1000,
    apiHealthyResponseTime: 20 * 1000,
    resetTime: 24 * 3600 * 1000
  },
  license: {
    api: {
      url: 'https://license1.ocr.space/api/status'
    }
  },
  icons: {
    normal: 'logo38.png',
    inverted: 'inverted_logo_38.png'
  },
  forceMigrationRemedy: false,
  iframePostMessageTimeout: 500,
  ui: {
    commandItemHeight: 35
  },
  commandRunner: {
    sendKeysMaxCharCount: 1000
  },
  executeScript: {
    minimumTimeout: 5000
  }
}
