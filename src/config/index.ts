import Ext from '../common/web_extension'

const platform = Ext.isFirefox() ? 'firefox' : 'chrome'

export default {
  preinstall: {
    // 9.9.9: the Classic and JS folders moved below one root folder,
    // "Demo and QA Test Scripts", so the tree opens with the user's own
    // macros at the root. Existing installs are re-offered the demos at the
    // new place; the old top-level folders stay until deleted by hand.
    // 9.9.10: the JS demos compose relative clicks from plain anchor images
    // (slider_warmth / draw_toolbar_top) + uiv.offset — existing installs
    // need the re-offer to receive those two new vision images.
    // 9.9.11: Chrome-only demos live in "Browser Vision (Chrome, Edge)";
    // the Core demos use plain DOM input and run on Firefox too, with
    // *Chrome variants for trusted CDP input.
    // 9.9.12: demo csv/vision resources install into the CURRENT storage
    // mode — file-mode installs that took 9.9.11 got the macros but not the
    // images they search for, so the offer must fire once more.
    // 9.9.13: the JS demo set installs on FRESH installs again (folder starts
    // collapsed); the "JS" level is gone — its sub-folders sit directly below
    // "Demo and QA Test Scripts" — and the classic set moved to its own
    // top-level "Demo and QA Test Scripts (Classic)" folder (button-only).
    // 9.9.14: DesktopClickAccuracyRange demo — existing installs need the
    // re-offer to receive the three range_*_dpi_96 word images its image-
    // search part searches for.
    // 9.9.15: that demo's parts 2+3 moved to desktop scope — the browser-scope
    // version passed on machines where every desktop macro missed, so existing
    // installs need the corrected macro, not just the images.
    // 9.9.16: its part 2 reads with the XModule OCR (what desktop scope really
    // uses) instead of the Javascript one, which missed words and made the
    // coordinate measurement inconclusive; OCR engines are named, not numbered.
    // 9.9.17: the demos call uiv.window.focus() instead of
    // uiv.run('bringBrowserToForeground') — existing installs need the migrated
    // macros, since the old form is the first line of every desktop demo.
    // 9.9.18: range demo cosmetics — title says desktop.Click (the JS API
    // name, not the classic XClick), targets numbered left to right.
    // 9.9.19: range demo waits for stable window geometry after the CDP
    // self-test — Chrome's debugger notice auto-hiding mid-run slid the
    // viewport 55px between an OCR capture and its click.
    // 9.9.20: parts 2+3 search inside the browser window's own screen rect
    // (whole-screen OCR matched a word shown in ANOTHER window and clicked
    // there); sighting retry aims at page center so a transient origin shift
    // cannot push it off the bottom edge; title casing Ui.Vision.
    // 9.9.21: verdict thresholds scale with dpr — one quantization-wobbled
    // shot at 125% (6-8px, everything else perfect) read as a scaling-bug
    // FAIL; tolerance is now ~5*dpr and the slope alarm 0.05 (real bug: 0.2).
    // 9.9.22: wait for the debugger notice to be GONE, not merely stable —
    // it is perfectly stable while up, so the settle loop exited with the bar
    // showing and the detach 3s later shifted the first scored shot by 8px.
    // 9.9.23: macOS variants of the side-panel anchors
    // (sidebar_{datatab,logstab,clearlog}_mac_dpi_96.png). searchVision prefers
    // a '_mac' image on macOS and falls back to the base one everywhere else,
    // so existing installs need the re-offer to receive the new files — the
    // Windows captures scored 0.55-0.59 against the 0.60 bar on macOS, where
    // the OS draws the same controls with different fonts and corner radii.
    version: '9.9.23',
    macroFolder: '/'
  },
  nativeMessaging: {
    idleTimeBeforeDisconnect: 1e4 // 10 seconds
  },
  urlAfterUpgrade: 'https://go.ui.vision/?help=k_update',
  urlAfterInstall: 'https://go.ui.vision/?help=k_welcome',
  urlAfterUninstall: 'https://go.ui.vision/?help=k_why',
  performanceLimit: {
    fileCount: Infinity
  },
  xmodulesLimit: {
    unregistered: {
      upgradeUrl: 'https://go.ui.vision/?help=k_xupgradepro'
    },
    free: {
      upgradeUrl: 'https://go.ui.vision/?help=k_xupgradepro'
    },
    pro: {
      upgradeUrl: 'https://go.ui.vision/?help=k_xupgrade_contactsupport'
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
