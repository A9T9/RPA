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
    // 9.9.24: two ai.find accuracy ranges, so a user whose ai.find clicks miss
    // can measure it instead of guessing — existing installs need the re-offer
    // to receive them. XModules_Desktop/Desktop_Ai.Find_ClickAccuracyRange covers
    // the desktop path, which is the one whose coordinates get converted
    // per-OS after the model answers (it caught a dpr-squared error on Windows
    // at 125% scaling, where OCR and image search — already in screen points —
    // stay fine); LLM AI Commands/Ai.Find_ClickAccuracyRange covers the
    // viewport path and needs no XModule, so it is the control that says
    // whether the model or the conversion is at fault. Both found a real bug
    // at 125% scaling (dpr-squared on the desktop path, an un-rescaled capture
    // on the browser one), so the pair also ships two model-free CONTROLS that
    // cost nothing to run and belong in any regression pass over input:
    // XModules/XClickAccuracyRange and
    // "Browser Vision (Chrome, Edge)/BrowserClickAccuracyRange" click five
    // KNOWN coordinates and measure where they land — when a control passes and
    // its ai.find range fails, the coordinate was wrong before the click.
    // The existing DesktopClickAccuracyRange gains the same on-page progress
    // banner and PASS/FAIL light as the rest.
    // 9.9.25: the browser and desktop range demos' part 3 collected only the
    // LAST findImages error — with several shipped images missing, the verdict
    // named one file; errors now accumulate per image and the none-matched and
    // inconclusive verdicts list them all.
    // 9.9.26 (mac pass): DemoXMove drops the x>=0 clamp on its search band
    // (negative global coordinates are legitimate on multi-monitor macs);
    // the cat demo waits for the excalidraw text editor before typing; the
    // range demos' no-usable-coordinates verdict tells model problems from
    // extension-side rejections; fresh sidebar_logstab_mac_dpi_192 capture.
    // 9.9.27: JS demo folders renamed — 'XModules' -> 'Real User Input',
    // 'XModules_Desktop' -> 'Desktop Automation' (matching the module's
    // product name). (Since 10.0.165, restore deletes the demo folder
    // wholesale before rewriting it, so old-path copies clean themselves up.)
    // 9.9.28: uiv.findColor / uiv.findColors (solid-area color finder, both
    // scopes) + its two demos: Browser Vision DemoFindColor (status LEDs)
    // and Desktop Automation DemoFindColor_StarTab (clicks the panel's AI
    // Chat tab by its sparkle's gold).
    // 10.0.220 (2026-09-08): JS demo folder 'Desktop Automation' split into
    // 'Desktop Automation (desktop + browser)' (demos that need uiv.goto /
    // uiv.browser) and 'Desktop App (high speed)' (demos that run in the
    // helper app Ui.Vision for Desktop, marked with the "use desktop-app"
    // directive; + the app's own GUI SelfTest and ClickAccuracyRange).
    // Also: a macro named "<name>.d.js" (d = desktop app) runs in the app
    // like a directive macro; the app lists .d.js + directive macros only
    // (folder tree, "all .js" switch). Every demo in "Desktop App (high
    // speed)" is named .d.js now; the two GUI tests reset the strip by the
    // truth variable (a second run used to trip over its own label).
    // 9.9.29: Play Offline Dino Game v53 - browser-window-confined scans
    // (a desktop icon impersonated the idle dino), live-game ruler (the
    // chrome://dino idle page draws a half-size dino), measured field
    // edge (the docked side panel defeated the game-over detector), and
    // auto-widening of too-narrow game windows (width only).
    // 9.9.30: Play Offline Dino Game v83 - LEAN rewrite: plays in the
    // CURRENT tab, only Space+Up are ever sent, proportional field
    // discovery (ground line at ~48% of the viewport height), geometry
    // cache + per-scale speed calibration persisted, group-tail jump
    // aiming (a tight cactus pair is ONE jump; obstacles are not points).
    // 9.9.31 (2026-09-10): "Desktop App (high speed)" holds ONLY the app's
    // own demos (GUI SelfTest, ClickAccuracyRange, Play Chrome Dino Game —
    // embedded from xmodule2/app/macros by scripts/sync_app_demos.js, so
    // restore writes the file the app seeds). The extension-born Play
    // Offline Dino Game v83 is gone (an older generation of the same demo
    // next to the app's). DemoFindColor_StarTab and the two ClearSidebar
    // LogViaGUI_* app variants (_local_ocr, _ai.find) moved back to
    // "Desktop Automation (desktop + browser)" as plain .js: they drive the
    // REAL side panel, which only exists when the extension plays them.
    // 9.9.32 (2026-09-15): "Browser and Desktop" launchers (Play Flappy Bird /
    // Play Dino from Browser) and the Firefox-capable start click. From this
    // version on, EXISTING installs receive the shipped set automatically on
    // every bump as long as their demo folder still exists (a deleted folder
    // stays deleted; the Settings restore button is the only way back) — the
    // set used to be written once, on a fresh install only, so every profile
    // seeded earlier kept asking where the new demos were.
    // 9.9.33 (2026-09-16): the two launchers moved from their own "Browser and
    // Desktop" folder into "Desktop Automation (desktop + browser)", where the
    // other browser-plus-desktop demos live (user request) - existing installs
    // need the rewrite to lose the old folder.
    // 9.9.34 (2026-09-16): folders renamed to say where a demo runs - "Core" ->
    // "Browser Core", "Real User Input" -> "Browser Real User Input", "Desktop
    // Automation (desktop + browser)" -> "Browser plus Desktop Automation"
    // (user request); existing installs need the rewrite to lose the old names.
    // 9.9.35 (2026-09-16): "Browser Real User Input" merged into "Browser plus
    // Desktop Automation" (both need the desktop host and act on a browser
    // page; the finder's scope is not a folder-level distinction). Its demos
    // are named after the JS API they show: DemoDesktopClick (was DemoXClick),
    // DemoDesktopDrag (DemoXMove), DemoDesktopKeyboard (DemoXType),
    // DemoRunProgram (DemoXRun), "Draw a cat - desktop input version". The
    // control range XClickAccuracyRange is gone - DesktopClickAccuracyRange
    // part 1 is the same five-bullseye test.
    // 9.9.36 (2026-09-16): the accuracy ranges are AccuracyTest_<what>:
    // AccuracyTest_BrowserClick, _BrowserAiFind, _DesktopClick, _DesktopAiFind
    // and the app's AccuracyTest_DesktopApp.d.js (was Desktop App
    // ClickAccuracyRange.d.js; the app renames a seeded copy).
    // 9.9.37 (2026-09-16): AccuracyTest_DesktopAiFind joins the other ai.find
    // demos in "LLM AI Commands"; the two desktop accuracy tests skip the Chrome
    // debugger-bar preflight on Firefox.
    // 9.9.38 (2026-09-16): "Play Flappy Bird from Browser" scrolls the canvas
    // to the top of the viewport before its covered check and names a viewport
    // smaller than the canvas (a clamped 960x820 resize on a short screen).
    // 9.9.39 (2026-09-16): DemoScrolling (uiv.browser/desktop.mouse.wheel,
    // scrollIntoViewIfNeeded) and DemoHeldKeys (uiv.browser.keyboard.down/up)
    // in "Browser Core" - written 2026-09-12 on codex/scrolling-api, merged now.
    // 9.9.40 (2026-09-16): DemoDesktopWheel (uiv.desktop.mouse.wheel, real OS
    // wheel at the pointer) joins DemoDesktopClick/Drag/Keyboard.
    // 9.9.42: Dino score OCR retries fresh frames and rejects HI-only reads.
    version: '9.9.42',
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
