import { startUsageStatistics } from '../services/usage/background'
startUsageStatistics()
import { pageInvokePolicy, pageInvokeOptions } from '../common/invoke_policy'
import { bindDebuggerLifetimes } from '../common/debugger_lifetime'
/* global browser */

import Ext from '../common/web_extension'
import {
  until, delay, setIn, pick, splitIntoTwo, retry, uid, and,
  ensureExtName, withTimeout
} from '../common/utils'
import { SIDEPANEL_PORT_NAME, bgInit, initBgMessageHub } from '../common/ipc/ipc_bg_cs'
import * as C from '../common/constant'
import log from '../common/log'
import clipboard from '../common/clipboard'
import storage from '../common/storage'
import { setFileInputFiles } from '../common/debugger'
import { getDownloadMan } from '../common/download_man'
import { goUivUrl } from '../common/uiv_link'
import config from '../config'
import { StorageManager, StorageStrategyType } from '../services/storage'
import { getXFile } from '../services/xmodules/xfile'
import { resizeViewportOfTab } from '../common/resize_window'
import { ensureIpcSessionId, getIpcCache } from '../common/ipc/ipc_cache'
import { ensureChannelKey } from '../common/ipc/cs_channel_key'
import { getTab, getCurrentTab, activateTab, updateUrlForTab, getAllTabs } from '../common/tab_utils'
import { runInDesktopScreenshotEditor } from '../desktop_screenshot_editor/service'
import { DesktopScreenshot } from '../desktop_screenshot_editor/types'
import { singletonGetterByKey, singletonGetter } from '../common/ts_utils';
import { setProxy, getProxyManager } from '../services/proxy'
import { LogService } from '../services/log'
import { getContextMenuService } from '../services/contextMenu'
import { getState, updateState } from './common/global_state'
import { genGetTabIpc, getActiveTab, getActiveTabId, getPlayTab, openSettings, reinjectContentScript, showPanelWindow, withPanelIpc } from './common/tab'
import { DownloadMan } from '../common/download_man'
import { SIDEPANEL_TAB_ID } from '../common/ipc/ipc_bg_cs'
import { checkIfSidePanelOpen } from '@/ext/common/sidepanel'
import interceptLog from '@/common/intercept_log'
import { getWindowSize } from '../common/resize_window'
import { markAutomationTab, unmarkAutomationTabs, bindAutomationTabMarkEvents } from './automation_tab_mark'
import { isDevTestBrowser } from '../services/mcp_bridge/detect'

const downloadMan = new DownloadMan();

// Blob exports (localStorageExport & friends): current Chromium does not
// reliably apply downloads.download()'s `filename` option to blob: URLs — on
// Chrome 151/Windows the extension gets rewritten from the blob's MIME type
// (test.csv lands as test.txt), on Chromium 150/Linux whole names degrade to
// the blob UUID. The name has to be suggested from onDeterminingFilename
// instead. The pending map is keyed by blob URL (unique per export) and
// mirrored in storage.session because this service worker can be evicted
// between queueing the download and Chrome asking for its name.
const pendingBlobDownloadNames = {}
const PENDING_BLOB_NAMES_KEY = 'pending_blob_download_names'

const isOwnBlobUrl = (url) => /^blob:(chrome|moz)-extension:/.test(url || '')

const rememberBlobDownloadName = (url, filename) => {
  pendingBlobDownloadNames[url] = filename
  if (!(chrome.storage && chrome.storage.session)) return Promise.resolve()
  return chrome.storage.session.get(PENDING_BLOB_NAMES_KEY)
    .then((data) => {
      const map = (data && data[PENDING_BLOB_NAMES_KEY]) || {}
      map[url] = filename
      return chrome.storage.session.set({ [PENDING_BLOB_NAMES_KEY]: map })
    })
    .catch(() => {})
}

const forgetBlobDownloadName = (url) => {
  delete pendingBlobDownloadNames[url]
  if (!(chrome.storage && chrome.storage.session)) return
  chrome.storage.session.get(PENDING_BLOB_NAMES_KEY)
    .then((data) => {
      const map = (data && data[PENDING_BLOB_NAMES_KEY]) || {}
      if (!(url in map)) return
      delete map[url]
      return chrome.storage.session.set({ [PENDING_BLOB_NAMES_KEY]: map })
    })
    .catch(() => {})
}

// Registered at module top level so it survives service-worker restarts.
// Firefox has no onDeterminingFilename — there the `filename` option itself
// still applies, so the guard is the whole Firefox story.
if (chrome.downloads && chrome.downloads.onDeterminingFilename) {
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    // THE one onDeterminingFilename listener for the whole extension:
    // Chrome refuses a second one ("Too many listeners."), which is why
    // DownloadMan does not register its own — downloads it owns (armed by
    // onDownload / uiv.download) are dispatched to its rename logic here.
    const man = getDownloadMan()
    if (man.findById(item.id)) {
      return man.determineFileNameListener(item, suggest)
    }
    // everything else: only downloads whose blob URL this extension minted
    if (!isOwnBlobUrl(item.url)) return
    const hit = pendingBlobDownloadNames[item.url]
    if (hit) {
      suggest({ filename: hit, conflictAction: 'uniquify' })
      return
    }
    if (!(chrome.storage && chrome.storage.session)) return
    // worker restarted since the export was queued — the map survives in
    // session storage; async suggest requires returning true
    chrome.storage.session.get(PENDING_BLOB_NAMES_KEY)
      .then((data) => {
        const name = data && data[PENDING_BLOB_NAMES_KEY] && data[PENDING_BLOB_NAMES_KEY][item.url]
        suggest(name ? { filename: name, conflictAction: 'uniquify' } : undefined)
      })
      .catch(() => suggest())
    return true
  })
}

// HEAL Chrome's download UI on every service-worker start. Older builds hid
// the download shelf during X-command runs (the pre-116 bottom shelf resized
// the viewport and shifted click coordinates), and a run interrupted the
// wrong way left it OFF — Chrome keeps it off BROWSER-WIDE, persistently,
// until this extension re-enables it or is uninstalled (reported live
// 2026-08-16: "downloads work but the indicator is gone; uninstalling
// Ui.Vision brings it back"). The hide itself is gone (the ≥116 toolbar
// bubble resizes nothing), but this heal must STAY: it is what un-sticks
// users updating from a build that disabled the UI, and it costs nothing
// when the UI is already on. Requires the "downloads.ui" permission, which
// stays in the manifest (also reserved for future download features).
if (chrome.downloads && chrome.downloads.setUiOptions) {
  try {
    chrome.downloads.setUiOptions({ enabled: true }, () => {
      // swallow "permission missing" & co — healing is best-effort
      void chrome.runtime.lastError
    })
  } catch (e) { /* API present but refused: nothing to heal with */ }
}

interceptLog()

// tab-strip group + glow border for the tab being recorded/replayed
bindAutomationTabMarkEvents()

const checkTaIsPresent = async(idexId,wid) => {
  return new Promise((resolve,reject) => {
    chrome.tabs.query({ windowId: wid}, function(tabs) {
      var doFlag = "";
      for (var i=tabs.length-1; i>=0; i--) {
        if (tabs[i].index === idexId) {
          doFlag = tabs[i];
          break;
        }
      }
      resolve(doFlag);
      
    });    
    
 });

}

const checkWindowisOpen = async(toplayId) => {
  return new Promise((resolve,reject) => {
    chrome.tabs.query({}, function(tabs) {
      var doFlag = [];
      for (var i=tabs.length-1; i>=0; i--) {
        if (tabs[i].id === toplayId) {
          doFlag = tabs[i];
          break;
        }
      }
      resolve(doFlag);
      
    });    
    
 });

}

const getToplayTabId = async() =>{
  return new Promise((resolve,reject) => {
  return Ext.tabs.query({ active: true})
    .then(async (tabs) => {
      resolve(tabs[0]) 
    }); 
      
    })
}
const getRecordTabIpc = genGetTabIpc('toRecord', 'recording')

const getPlayTabIpc   = genGetTabIpc('toPlay', 'playing commands')

const getInspectTabIpc  = genGetTabIpc('toInspect', 'inspect')

const getPanelTabIpc  = genGetTabIpc('panel', 'dashboard')

const showBadge = (options) => {
  const { clear, text, color, blink } = {
    clear: false,
    text: '',
    color: '#ff0000',
    blink: 0,
    ...(options || {})
  }

  if (clear) {
    return Ext.action.setBadgeText({ text: '' })
  }

  Ext.action.setBadgeBackgroundColor({ color })
  Ext.action.setBadgeText({ text })

  if (blink) {
    setTimeout(() => {
      Ext.action.getBadgeText({})
      .then(curText => {
        if (curText !== text) return false
        return Ext.action.setBadgeText({ text: '' })
      })
    }, blink)
  }

  return true
}

const toggleRecordingBadge = (isRecording, options) => {
  return showBadge({
    color: '#ff0000',
    text: 'R',
    ...(options || {}),
    clear: !isRecording
  })
}

const toggleInspectingBadge = (isInspecting, options) => {
  return showBadge({
    color: '#ffa800',
    text: 'S',
    ...(options || {}),
    clear: !isInspecting
  })
}

const togglePlayingBadge = (isPlaying, options) => {
  return showBadge({
    color: '#14c756',
    text: 'P',
    ...(options || {}),
    clear: !isPlaying
  })
}

const isUpgradeViewed = () => {
  return Ext.storage.local.get('upgrade_not_viewed')
  .then(obj => obj['upgrade_not_viewed'] !== 'not_viewed')
}

// Shows the "what's new" page once after an update, and resolves to true if it
// did. onInstalled only ARMS this (badge + upgrade_not_viewed); the page itself
// waits for the next toolbar click, so an update that lands while the browser
// is busy doesn't interrupt anything.
//
// Always a NEW tab — never a navigation of whatever the user is looking at.
//
// Callable right after chrome.sidePanel.open(): it awaits before touching the
// tabs API, but tabs.create() needs no user gesture, so nothing is lost. Do NOT
// await it before opening the panel — that would void the gesture.
const showUpgradePageIfNeeded = () => {
  return isUpgradeViewed()
  .then(isViewed => {
    if (isViewed) return false

    Ext.action.setBadgeText({ text: '' })

    return Ext.storage.local.set({ upgrade_not_viewed: '' })
    .then(() => Ext.tabs.create({
      // gui=bg + the version: the click decorator cannot reach a tab the
      // background opens, and this is the page that most wants to know which
      // version the user just landed on
      url: goUivUrl(config.urlAfterUpgrade, 'bg'),
      active: true
    }))
    .then(() => true)
  })
  .catch(e => {
    log.warn(`could not show the upgrade page: ${e && e.message}`)
    return false
  })
}

const showPanelWindowAndLog = () => {
  return showPanelWindow().then(isWindowCreated => {
    if (isWindowCreated) {
      getLogServiceForBg().updateLogFileName()
      getLogServiceForBg().logWithTime('Ui.Vision started')
    }
  })
}

const notifyRecordCommand = (command) => {
  const notifId = uid()

  Ext.notifications.create(notifId, {
    type: 'basic',
    iconUrl: './logo.png',
    title: 'Record command!',
    message: (function () {
      const list = []

      list.push(`command: ${command.cmd}`)
      if (command.target)  list.push(`target: ${command.target}`)
      if (command.value)   list.push(`value: ${command.value}`)

      return list.join('\n')
    })()
  })

  // Note: close record notifications right away, so that notifications won't be stacked
  setTimeout(() => {
    Ext.notifications.clear(notifId)
    .catch(e => log.error(e))
  }, 2000)
}

const notifyAutoPause = () => {
  Ext.notifications.create({
    type: 'basic',
    iconUrl: './logo.png',
    title: 'Replay paused!',
    message: 'Auto paused by command'
  })
}

const notifyBreakpoint = () => {
  Ext.notifications.create({
    type: 'basic',
    iconUrl: './logo.png',
    title: 'Replay paused!',
    message: 'Auto paused by breakpoint'
  })
}

const notifyEcho = (text) => {
  Ext.notifications.create({
    type: 'basic',
    iconUrl: './logo.png',
    title: 'Echo',
    message: text
  })
}

const closeAllWindows = () => {
  return Ext.windows.getAll()
  .then(wins => {
    return Promise.all(wins.map(win => Ext.windows.remove(win.id)))
  })
}

const isTimeToBackup = () => {
  return storage.get('config')
  .then(config => {
    const { enableAutoBackup, lastBackupActionTime, autoBackupInterval } = config

    if (!enableAutoBackup) {
      return {
        timeout: false,
        remain: -1
      }
    }

    const diff = new Date() * 1 - (lastBackupActionTime || 0)
    return {
      timeout: diff > autoBackupInterval * 24 * 3600000,
      remain: diff
    }
  })
}

const notifyPanelAboutActiveTab = (activeTabId) => {
  Promise.all([
    Ext.tabs.get(activeTabId),
    getPanelTabIpc().catch(() => null)
  ])
  .then(tuple => {
    const [tab, panelIpc] = tuple
    if (!panelIpc)  return
    if (tab.url.indexOf(Ext.runtime.getURL('')) !== -1) return

    if (!tab.title || tab.title.trim().length === 0) {
      return delay(() => notifyPanelAboutActiveTab(activeTabId), 200)
    }

    return panelIpc.ask('UPDATE_ACTIVE_TAB', {
      url: tab.url,
      title: tab.title
    })
  })
}

const isTabActiveAndFocused = (tabId) => {
  return Promise.all([
    Ext.tabs.get(tabId),
    getState()
  ])
  .then(([tab, state]) => {
    if (!tab.active)  return false

    switch (state.status) {
      case C.APP_STATUS.NORMAL:
        return Ext.windows.get(tab.windowId)
        .then(win => win.focused)

      case C.APP_STATUS.PLAYER:
        return tabId === state.tabIds.toPlay

      case C.APP_STATUS.RECORDER:
        return tabId === state.tabIds.toRecord

      default:
        throw new Error(`E213: isTabActiveAndFocused: unknown app status, '${state.status}'`)
    }
  })
  .catch(e => false)
}

const getStorageManagerForBg = singletonGetterByKey(
  (mode) => mode,
  (mode, extraOptions) => new StorageManager(mode, extraOptions)
)

const getCurrentStorageManager = () => {
  const restoreConfig = () => {
    return storage.get('config')
  }

  return Promise.all([
    restoreConfig(),
    getXFile().getConfig()
  ])
  .then(([config, xFileConfig]) => {
    return getStorageManagerForBg(config.storageMode)
  })
}

const getLogServiceForBg = singletonGetter(() => {
  return new LogService({
    waitForStorageManager: getCurrentStorageManager
  })
})

function logKantuClosing () {
  return getLogServiceForBg().logWithTime('Ui.Vision closing')
}

const closeSidePanel = () => {
  if(Ext.isFirefox()) {
    Ext.sidebarAction.close().then(() => {
      // debugger; 
    })
  } else {
    return Ext.sidePanel.setOptions({
        enabled: false
      }).then(() => {
        Ext.sidePanel.setOptions({
          enabled: true
        })
      })
  }
}

// Try to open the side panel on the given tab (sidebar-first run surface).
// MUST be called synchronously while handling the message triggered by the
// user's click (e.g. a bookmark run) — chrome.sidePanel.open() rejects once
// the user gesture is gone, which happens after any `await`.
// Resolves to true if the side panel is opening.
// true while the sidebar AI macro agent is working (PANEL_AI_TAB_MARK):
// replays it starts get the orange 'ai' tab mark instead of blue, and stopping
// such a replay keeps the mark — the agent's turn is not over yet.
// Module-local on purpose: an MV3 worker restart mid-turn just falls back to
// the normal replay marks.
let aiTabMarkActive = false

// true while a JS script is running. A script dispatches every uiv.* call as
// its own player run, so the normal per-run mark/unmark would create and
// dissolve a Chrome tab group AND inject the border script three times for
// EVERY line — hundreds of milliseconds of pure decoration per command, plus a
// flickering tab strip. Instead the mark is held for the whole script: the
// first command marks the tab, this flag stops the per-command unmark (which
// makes every later mark a no-op — markAutomationTab returns early when the
// tab is already marked), and the runner clears it once when the script ends.
let scriptRunActive = false

// A tab that can carry a mark at all: real, and not one of our own extension
// pages (marking the side panel or the IDE window frames Ui.Vision itself).
const isMarkableTab = (tab) => {
  return !!tab && !!tab.id && !!tab.url &&
    tab.url.indexOf(Ext.runtime.getURL('')) === -1
}

const tryOpenSidePanelForRun = (tabId) => {
  try {
    if (!tabId || Ext.isFirefox() || typeof chrome === 'undefined' || !chrome.sidePanel || !chrome.sidePanel.open) {
      return Promise.resolve(false)
    }

    // Whether this call is what OPENS the panel (vs. finding it already
    // open). A closeRPA=1 run closes only what it opened — the panel a user
    // had docked before the bookmark click stays open (see the closeRPA
    // block in index.js). The check is STARTED synchronously (before open,
    // so it sees the pre-open state) but only awaited after — any await
    // ahead of chrome.sidePanel.open() would void the user gesture.
    const pWasOpen = checkIfSidePanelOpen().catch(() => false)

    // fire-and-forget on purpose: awaiting setOptions would lose the gesture
    chrome.sidePanel.setOptions({ enabled: true })

    return chrome.sidePanel.open({ tabId }).then(
      () => pWasOpen.then(wasOpen => {
        updateState(setIn(['sidePanelAutoOpenedForRun'], !wasOpen))
        return true
      }),
      (e) => {
        log.warn(`could not open side panel for run, falling back to IDE window: ${e && e.message}`)
        return false
      }
    )
  } catch (e) {
    return Promise.resolve(false)
  }
}

// --- MCP bridge: background helpers (service-worker side) ------------------
// Deliberately self-contained: importing the panel's bridge client into the
// service worker would drag the whole panel bundle in.
//
// DESIGN (user decision 2026-08-20): the extension NEVER opens its panel on
// its own — "Chrome popping up stuff by itself is crap". The MCP client is
// the master: it reopens the panel explicitly via the bridge's open_panel
// tool, carried by the wake channel below. The only exception is the
// mcp_reopen_panel_after_reload flag above, which executes a reopen the
// AGENT itself requested with reload_extension.

// Same family rules as uaFamily() in mcp/uivision-mcp-bridge.js — both sides
// read the same user agent string, so the computed family matches the
// family#n labels the bridge hands out.
const bridgeUaFamily = () => {
  const s = String((typeof navigator !== 'undefined' && navigator.userAgent) || '').toLowerCase()
  if (s.includes('firefox')) return 'firefox'
  if (s.includes('edg/')) return 'edge'
  if (s.includes('opr/') || s.includes('opera')) return 'opera'
  if (s.includes('vivaldi')) return 'vivaldi'
  if (s.includes('brave')) return 'brave'
  if (s.includes('chrome')) return 'chrome'
  return 'browser'
}

// One probe hello (the same probe:true the Settings "Test" button uses — the
// bridge answers and closes without touching real connections). Resolves
// { reachable, version, thisBrowserConnected } and never rejects; version is
// the bridge's semver string ('' when unreachable). thisBrowserConnected
// checks for a connection of THIS browser's family — Chrome and Firefox rigs
// run side by side, so firefox#1 being connected must not stop Chrome from
// coming back.
const probeBridge = (port, token, devBrowser) => new Promise((resolve) => {
  let ws
  let settled = false
  const finish = (r) => {
    if (settled) return
    settled = true
    try { if (ws) ws.close() } catch (e) { /* already closed */ }
    resolve(r)
  }
  const unreachable = { reachable: false, version: '', thisBrowserConnected: false }
  try {
    ws = new WebSocket(`ws://127.0.0.1:${port}/`)
  } catch (e) {
    return finish(unreachable)
  }
  setTimeout(() => finish(unreachable), 3000)
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'hello', token, probe: true, devBrowser, client: 'uivision-extension' }))
  }
  ws.onmessage = (event) => {
    let msg
    try { msg = JSON.parse(String(event.data)) } catch (e) { return }
    if (msg.type !== 'hello_ok') return
    const family = bridgeUaFamily()
    const thisBrowserConnected = Array.isArray(msg.connections)
      ? msg.connections.some((label) => String(label).indexOf(family + '#') === 0)
      : !!msg.extensionConnected // pre-1.4 bridge: single connection, no labels
    finish({ reachable: true, version: String(msg.bridgeVersion || ''), thisBrowserConnected })
  }
  // unreachable, or token rejected (close 4003) — either way stay quiet
  ws.onclose = () => finish(unreachable)
  ws.onerror = () => { /* onclose follows */ }
})

// stored config + dev detection resolved to what the bridge features need;
// same enabled-semantics as the panel's restoreConfig (an untouched switch is
// ON in dev/test browsers, an explicit stored false wins)
const resolveBridgeConfig = () => {
  return Promise.all([storage.get('config'), isDevTestBrowser()])
  .then(([cfg, devBrowser]) => ({
    enabled: cfg && cfg.mcpBridgeEnabled !== undefined ? !!cfg.mcpBridgeEnabled : devBrowser,
    storedEnabled: cfg ? String(cfg.mcpBridgeEnabled) : 'no config',
    port: parseInt(cfg && cfg.mcpBridgePort, 10) || C.MCP_BRIDGE.DEFAULT_PORT,
    token: '', // bridge 1.7+ pairs by origin; no user-facing token any more
    devBrowser
  }))
}

// belt to the probe's braces: never open a SECOND panel-app tab (covers the
// race where the flag path's tab exists but has not connected yet)
const panelAppTabExists = () => {
  return Ext.tabs.query({ url: Ext.runtime.getURL('sidepanel.html') + '*' })
    .then((tabs) => !!(tabs && tabs.length), () => false)
}

// Trail of the last panel-reopen actions (open_panel calls), persisted so
// the panel can show it in the Logs tab on its next open — the actions run
// when nobody is watching, so without this trail a "panel did not reopen"
// report is undebuggable: there is no console anyone reads.
const bridgeReopenTrace = (step) => {
  const line = `${new Date().toISOString()} ${step}`
  return Ext.storage.local.get('mcp_reopen_trace').then((o) => {
    const arr = ((o && o.mcp_reopen_trace) || []).concat(line).slice(-20)
    return Ext.storage.local.set({ mcp_reopen_trace: arr })
  }).catch(() => {})
}

// --- MCP bridge: wake channel ----------------------------------------------
// A THIN presence socket from this worker to the bridge (role:'wake', bridge
// 1.5+, no tools). It exists so the MCP client can reopen the panel app ON
// REQUEST via the bridge's open_panel tool — the ONLY way the panel ever
// opens without a human click. Closing the panel still means pause: nothing
// automatic brings it back, an agent asking for it does, visibly (banner,
// Logs trace). The bridge pings every 20s; answering keeps this worker alive
// while the browser sits in the tray — exactly when the channel matters.

const WAKE_RECONNECT_MIN_MS = 5000
const WAKE_RECONNECT_MAX_MS = 60000
// a pre-1.5 bridge would register a wake hello as a TOOL connection and
// route calls into this worker, where nothing executes them — never connect
// to one; re-check rarely in case the user upgrades the bridge
const WAKE_OLD_BRIDGE_RETRY_MS = 10 * 60 * 1000

let wakeWs = null
let wakeRetryTimer = null
let wakeRetryMs = WAKE_RECONNECT_MIN_MS

const scheduleWakeRetry = (fixedMs) => {
  if (wakeRetryTimer) return
  wakeRetryTimer = setTimeout(() => {
    wakeRetryTimer = null
    connectWakeChannel()
  }, fixedMs || wakeRetryMs)
  if (!fixedMs) wakeRetryMs = Math.min(wakeRetryMs * 2, WAKE_RECONNECT_MAX_MS)
}

const openPanelForWake = (ws) => {
  const ack = (status) => {
    bridgeReopenTrace(`open_panel: ${status}`)
    try { ws.send(JSON.stringify({ type: 'wake_ack', status })) } catch (e) { /* bridge gone */ }
  }
  Promise.all([panelAppTabExists(), checkIfSidePanelOpen()])
  .then(([tabOpen, panelOpen]) => {
    if (tabOpen || panelOpen) return ack('already open')
    return Ext.windows.getAll().then((wins) => {
      const normal = (wins || []).filter((w) => !w.type || w.type === 'normal')
      const url = Ext.runtime.getURL('sidepanel.html')
      // zero windows = tray-resident browser: a tab needs a window to live in
      return (normal.length ? Ext.tabs.create({ url }) : Ext.windows.create({ url }))
      .then(() => ack('opening panel app'))
    })
  })
  .catch((e) => ack(`error: ${(e && e.message) || e}`))
}

const connectWakeChannel = () => {
  if (wakeWs) return
  resolveBridgeConfig()
  .then(({ enabled, port, token, devBrowser }) => {
    if (!enabled) return // the config listener below re-arms on enable
    return probeBridge(port, token, devBrowser).then((p) => {
      if (!p.reachable) return scheduleWakeRetry()
      const parts = String(p.version).split('.').map(Number)
      if (!(parts[0] > 1 || (parts[0] === 1 && parts[1] >= 5))) return scheduleWakeRetry(WAKE_OLD_BRIDGE_RETRY_MS)

      let ws
      try {
        ws = new WebSocket(`ws://127.0.0.1:${port}/`)
      } catch (e) {
        return scheduleWakeRetry()
      }
      wakeWs = ws
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'hello',
          role: 'wake',
          token,
          devBrowser,
          client: 'uivision-extension',
          version: (chrome.runtime.getManifest && chrome.runtime.getManifest().version) || ''
        }))
      }
      ws.onmessage = (event) => {
        let msg
        try { msg = JSON.parse(String(event.data)) } catch (e) { return }
        if (msg.type === 'hello_ok') {
          wakeRetryMs = WAKE_RECONNECT_MIN_MS
        } else if (msg.type === 'ping') {
          // this traffic is what keeps the worker (and the channel) alive
          try { ws.send(JSON.stringify({ type: 'pong' })) } catch (e) { /* onclose follows */ }
        } else if (msg.type === 'open_panel') {
          openPanelForWake(ws)
        }
      }
      ws.onclose = () => {
        if (wakeWs === ws) wakeWs = null
        scheduleWakeRetry()
      }
      ws.onerror = () => { /* onclose follows */ }
    })
  })
  .catch(() => scheduleWakeRetry())
}

// No timer tricks for a SLEEPING worker (an idle tray browser): if the wake
// channel is down because the worker died, the MCP client — the master —
// starts or touches the browser itself; the worker boots with it, this
// module's top-level connect runs, and open_panel works seconds later.

// react to Settings > AI changes: reconnect with fresh port/token, or drop
// the channel when the bridge gets switched off
Ext.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes || !changes.config) return
  if (wakeWs) {
    const ws = wakeWs
    wakeWs = null // its onclose sees null -> no auto-retry with stale config
    try { ws.close() } catch (e) { /* already closed */ }
  }
  wakeRetryMs = WAKE_RECONNECT_MIN_MS
  connectWakeChannel()
})

const bindEvents = () => {
  Ext.action.onClicked.addListener((tab) => {
    if(Ext.isFirefox()) {
      // if browser is firefox
      // placeholder for now
      if (showSidePanel) {
        // debugger;
        Ext.sidebarAction.open()
        // the sidebar is the entry point now, so this click is the first
        // interaction after an update just as much as an IDE-window click was
        showUpgradePageIfNeeded()
      } else {
        showUpgradePageIfNeeded()
        .then(didShow => didShow ? undefined : showPanelWindowAndLog())
      }
    } else {
      // if browser is chrome or edge
      if (showSidePanel) {
        if (!isSidePanelOpen) {
          Ext.sidePanel.setOptions({
            enabled: true
          })
          // keeping it in then block will cause error
          Ext.sidePanel.open({
            tabId: tab.id
          }).then((e) => {
            isSidePanelOpen = true
          }).catch(() => {
            isSidePanelOpen = false
          })
          // after open(), never before: this awaits storage, and any await
          // ahead of open() voids the user gesture. Only on the opening click —
          // a click that closes the panel should not pop a tab.
          showUpgradePageIfNeeded()
        } else {
          // Self-preservation: the side panel IS the runtime for macro runs,
          // JS scripts and AI-agent turns — closing it kills them mid-flight,
          // and a live run can CAUSE this click: desktop-scope automation
          // aiming at the toolbar hit the Ui.Vision icon itself and shut down
          // its own runner (authenticator task, 2026-08-11). While anything
          // runs, the toggle-close is a no-op; a human who wants to stop has
          // the panel's own stop button. (This cannot protect against a click
          // on ANOTHER extension's icon — Chrome allows one side panel, so a
          // foreign panel opening evicts ours with no event to veto.)
          getState().then(state => {
            if (state.status === C.APP_STATUS.PLAYER || scriptRunActive || aiTabMarkActive) {
              log('icon click ignored: a run is in progress and closing the side panel would kill it')
              return
            }
            closeSidePanel(tab.id).then(() => {
              isSidePanelOpen = false
            })
          })
        }
      } else {
        closeSidePanel(tab.id).then(() => {
          isSidePanelOpen = false
        })

        showUpgradePageIfNeeded()
        .then(didShow => didShow ? undefined : showPanelWindowAndLog())
      }
    }
  })

  Ext.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    const state = await getState()

    // Closing playing tab in player mode
    if (state.status === C.APP_STATUS.PLAYER && tabId === state.tabIds.toPlay) {
      // Note: If it's closed by `selectWindow tab=close` command, ignore it
      if (state.pendingPlayingTab) {
        return
      }

      return Ext.windows.get(removeInfo.windowId, { populate: true })
      .then(win => {
        const pActiveTab = !win
          ? getCurrentTab()
            .then(tab => {
              if (!tab) return null
              // Do nothing if window is also closed and Kantu window is focused
              if (tab.id === state.tabIds.panel)  return null
              return tab
            })
          : Promise.resolve(
            win.tabs.find(tab => tab.active)
          )

        return pActiveTab.then(tab => {
          // Never retarget the run onto a browser-internal or another
          // extension's tab (an adblocker's "blocked" page, chrome:// ...) —
          // the next capture/injection/CDP attach would die on "Cannot access
          // a chrome-extension:// URL". Prefer a web tab from the same window.
          const isWebTab = t => t && /^(https?|file):/i.test(t.url || '')
          if (!isWebTab(tab) && win && win.tabs) {
            tab = win.tabs.find(t => t.id !== tabId && isWebTab(t)) || tab
          }
          if (tab && tab.id) {
            // This is the main purpose for this callback: Update tabIds.toPlay to new active tab
            updateState(setIn(['tabIds', 'toPlay'], tab.id))
          }
        })
      })
    }
    if (tabId === state.tabIds.panel && !state.closingAllWindows) {
      logKantuClosing()

      // Note: sidebar-first design — the side panel stays open while the editor
      // window is popped out, and the editor window registers itself as the
      // panel (I_AM_PANEL). If the editor window closes while the side panel is
      // still connected, hand panel routing back to the side panel, otherwise
      // recording/inspect/invoke would target a dead tab.
      if (isSidePanelOpen && tabId !== SIDEPANEL_TAB_ID) {
        updateState(setIn(['tabIds', 'panel'], SIDEPANEL_TAB_ID))
      }
    }
  })

  Ext.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tab.active)  return

    isTabActiveAndFocused(tabId)
    .then(isFocused => {
      if (!isFocused) return
      return notifyPanelAboutActiveTab(tabId)
    })
  })

  const getCalculatedShowSidePanelValue =  (config) => {
    if (config) {
      if (config.oneTimeShowSidePanel &&  [true, false].includes(config.oneTimeShowSidePanel)) {
        return config.oneTimeShowSidePanel;
      }
      if ([true, false].includes(config.showSidePanel)) {
        return config.showSidePanel;
      }
    }
    // no stored preference yet (fresh install, before the panel page has ever run):
    // side panel is the default entry point
    return true;
  }

  // Keep the cached showSidePanel in sync with config written by ANY page.
  // It cannot be read inside the icon-click handler — any await before
  // Ext.sidePanel.open() voids the user gesture — so the value must already
  // be correct by then. Refreshing only on focus/tab-activation was not
  // enough once Settings moved into a browser TAB: unchecking "Open Side
  // Panel by default" and clicking the toolbar icon in the same window fires
  // neither event, so the icon kept using the previous value.
  // (An older version of this listener compared against storage.oldValue,
  // which is undefined the first time a key is written — that is the Chrome
  // breakage it was disabled for. Recomputing from newValue avoids it.)
  storage.addListener((changes) => {
    const configChange = (changes || []).find(c => c && c.key === 'config')
    if (!configChange || !configChange.newValue) return

    showSidePanel = getCalculatedShowSidePanelValue(configChange.newValue)
    manageKeepSWAlive()

    getState().then((state) => {
      isSidePanelOpen = state.tabIds.panel === SIDEPANEL_TAB_ID
    }, () => {})
  })

  // these three variables are used for the feature of opening side panel on icon click according to the settings stored in storage->config
  // using async functions to get the active tab id, and the showSidePanel variable from storage config will cause an error.
  // https://stackoverflow.com/questions/77213045/error-sidepanel-open-may-only-be-called-in-response-to-a-user-gesture-re
  let showSidePanel, isSidePanelOpen, keepAliveInterval

  // keep service worker alive only when side panel is set to open on icon click
  const manageKeepSWAlive = async () => {
    return storage.get('config')
    .then((config) => {
      // because we cannot read this storage value between user clicking extension icon and calling Ext.sidePanel.open
      showSidePanel = getCalculatedShowSidePanelValue(config) // config && config.showSidePanel
      if (showSidePanel && !keepAliveInterval) {
        keepAliveInterval = setInterval(() => {
          Ext.runtime.getPlatformInfo()
        }, 25e3)
      } else if (!showSidePanel && keepAliveInterval) {
        clearInterval(keepAliveInterval)
        keepAliveInterval = null
      }
    })
  }

  Ext.windows.onFocusChanged.addListener((windowId) => {
    manageKeepSWAlive()

    Ext.tabs.query({ windowId, active: true })
    .then(tabs => {
      if (tabs.length === 0) return
      getIpcCache().get(tabs[0].id, 100)
      .then(
        ipc => ipc.ask('TAB_ACTIVATED', {}),
        e => 'Comment: ignore this error'
      )
    })
  })

  Ext.runtime.onStartup.addListener(async () => {
      manageKeepSWAlive()
  });

  // also run once at service worker start, so a fresh install answers the very
  // first icon click correctly (onStartup does not fire on install)
  manageKeepSWAlive()

  // After a bridge-triggered self-reload (runtime.reload), reopen the panel
  // app as a normal TAB: the side panel cannot reopen itself (sidePanel.open
  // demands a user gesture), a tab needs none, and the MCP bridge reconnects
  // from the tab so an automated build-reload-verify loop closes without a
  // human click. Top-level on purpose — runtime.reload restarts the worker
  // WITHOUT firing onStartup (that is browser-launch only).
  Ext.storage.local.get('mcp_reopen_panel_after_reload').then((flags) => {
    if (!flags || !flags.mcp_reopen_panel_after_reload) return
    // clear BEFORE opening: if the order were reversed, a failing clear would
    // open one more tab on every worker start, forever
    return Ext.storage.local.remove('mcp_reopen_panel_after_reload').then(() =>
      Ext.tabs.create({ url: Ext.runtime.getURL('sidepanel.html') })
    )
  }).catch((e) => {
    // LOUD on purpose. The first version of this hook died silently on a
    // wrapper method that did not exist (storage.local had no 'remove' in
    // web_extension.js), and the silent catch turned a one-line fix into a
    // debugging session across two reload cycles.
    console.error('mcp reopen-after-reload failed:', e && e.message)
  })

  // Note: set the activated tab as the one to play
  Ext.tabs.onActivated.addListener(async (activeInfo) => {
    manageKeepSWAlive()

    const [state, tab] = await Promise.all([
      getState(),
      Ext.tabs.get(activeInfo.tabId)
    ])

    // keep the toolbar-icon toggle and panel routing in sync with reality
    checkIfSidePanelOpen().then((isOpen) => {
      isSidePanelOpen = isOpen
    })

    if (activeInfo.tabId === state.tabIds.panel ||
        tab.url.indexOf(Ext.runtime.getURL('')) !== -1) {
      return
    }

    // Just in case we add panel tabId into it before we know it's a panel
    await updateState(state => ({
      ...state,
      tabIds: {
        ...state.tabIds,
        lastActivated: state.tabIds.lastActivated
          .concat(activeInfo.tabId)
          .filter(tabId => tabId !== state.tabIds.panel)
          .slice(-2)
      }
    }))

    getIpcCache().get(activeInfo.tabId, 100)
    .then(
      ipc => ipc.ask('TAB_ACTIVATED', {}),
      e => 'Comment: ingore this error'
    )

    notifyPanelAboutActiveTab(activeInfo.tabId)

    switch (state.status) {
      case C.APP_STATUS.NORMAL:
        if (activeInfo.tabId === state.tabIds.panel) {
          return
        }

        const updateTabIds = () => {
          Ext.tabs.get(activeInfo.tabId)
          .then(tab => {
            if (tab.url.indexOf(Ext.runtime.getURL('')) !== -1) return
            if (activeInfo.tabId === state.tabIds.panel) return

            log('in tab activated, set toPlay to ', activeInfo)

            return updateState(state => ({
              ...state,
              tabIds: {
                ...state.tabIds,
                lastPlay: state.tabIds.toPlay,
                toPlay: activeInfo.tabId,
                firstPlay: activeInfo.tabId
              }
            }))
          })
        }

        // Note: In Firefox, without this delay of 100ms, `tab.url` will still be 'about:config'
        // so have to wait for the url to take effect
        if (Ext.isFirefox()) {
          setTimeout(updateTabIds, 100)
        } else {
          updateTabIds()
        }

        break

      case C.APP_STATUS.RECORDER: {
        // Note: three things to do when switch tab in recording
        // 1. set the new tab to RECORDING status,
        // 2. and the original one back to NORMAL status
        // 3. commit a `selectWindow` command
        //
        // Have to wait for the new tab establish connection with background
        getIpcCache().get(activeInfo.tabId, 5000)
        // Note: wait for 2 seconds, expecting commands from original page to be committed
        .then(ipc => delay(() => ipc, 2000))
        .then(ipc => {
          return ipc.ask('SET_STATUS', {
            status: C.CONTENT_SCRIPT_STATUS.RECORDING
          })
        })
        .then(() => {
          // Note: set the original tab to NORMAL status
          // only if the new tab is set to RECORDING status
          return getRecordTabIpc()
          .then(ipc => {
            ipc.ask('SET_STATUS', {
              status: C.CONTENT_SCRIPT_STATUS.NORMAL
            })
          })
        })
        .then(() => getState())
        .then(state => {
          // Note: get window locator & update recording tab
          const oldTabId = state.tabIds.firstRecord
          const newTabId = activeInfo.tabId

          return Promise.all([
            Ext.tabs.get(oldTabId),
            Ext.tabs.get(newTabId)
          ])
          .then(async ([oldTab, newTab]) => {
            const result = []

            // update recording tab
            await updateState(setIn(['tabIds', 'toRecord'], activeInfo.tabId))
            markAutomationTab(activeInfo.tabId, 'recording')

            if (oldTab.windowId === newTab.windowId) {
              result.push(`tab=${newTab.index - oldTab.index}`)
            }

            result.push(`title=${newTab.title}`)

            return {
              target: result[0],
              targetOptions: result
            }
          })
        })
        .then(data => {
          // Note: commit the `selectWindow` command
          const command = {
            cmd: 'selectWindow',
            ...data
          }

          return getPanelTabIpc()
          .then(panelIpc => panelIpc.ask('RECORD_ADD_COMMAND', command))
          .then(shouldNotify => {
            if (shouldNotify) {
              notifyRecordCommand(command)
            }
          })
        })
        .catch(e => {
          log.error(e.stack)
        })

        break
      }
    }
  })

  Ext.runtime.onConnect.addListener(function (port) {
    if (port.name === SIDEPANEL_PORT_NAME) {
      console.log('side panel connected')
      isSidePanelOpen = true

      port.onDisconnect.addListener(async () => {
        console.log('side panel disconnected')
        isSidePanelOpen = false
        // the auto-opened-for-run marker describes THIS panel session only
        updateState(setIn(['sidePanelAutoOpenedForRun'], false))

        // Note: sidebar-first design — side panel and editor window can be open
        // at the same time. If the side panel closes while it holds panel
        // routing, hand it over to the (still open) editor window if there is one.
        const state = await getState()
        if (state.tabIds.panel === SIDEPANEL_TAB_ID && state.tabIds.lastPanelWindow) {
          try {
            const tab = await Ext.tabs.get(state.tabIds.lastPanelWindow)
            const url = (tab && (tab.url || tab.pendingUrl)) || ''
            if (url.indexOf('popup.html') !== -1) {
              await updateState(setIn(['tabIds', 'panel'], state.tabIds.lastPanelWindow))
            }
          } catch (e) {
            // no editor window open — nothing to hand over to
          }
        }
      });
    }
  });

  // Ext.downloads.onDeterminingFilename.addListener(async(downloadItem, suggest) => {
  //   const downloadId = downloadItem.id; // Store the downloadItem.id in a separate variable
  //   await delay(() => {}, 5000)
  //  console.log("Proposed filename: " + downloadItem);
  //   var downloadItem={filename:downloadItem.filename}

  //   const item = downloadMan.findById(downloadId)
  //   if (!item){
  //     getPanelTabIpc().then(panelIpc => {
  //       panelIpc.ask('DOWNLOAD_COMPLETE', downloadItem) 
  //     })
  //     return
  //   } 

  //   const tmpName   = item.fileName.trim()
  //   const fileName  = tmpName === '' || tmpName === '*' ? null : tmpName

  //   var downloadItem={filename:fileName}

  //   getPanelTabIpc().then(panelIpc => {
  //     panelIpc.ask('DOWNLOAD_COMPLETE', downloadItem) 
  //   })

  //   if (fileName) {
  //     return suggest({
  //       filename: fileName,
  //       conflictAction: 'uniquify'
  //     })
  //   }
    


  // });
  
  // Ext.downloads.onDeterminingFilename.addListener(function(downloadItem, suggest) {
  //   console.log("Proposed filename: " + downloadItem);
  //   var downloadItem={filename:downloadItem.filename}
    
  //   const item = this.findById(downloadItem.id)
  //   if (!item)  return

  //   const tmpName   = item.fileName.trim()
  //   const fileName  = tmpName === '' || tmpName === '*' ? null : tmpName

  //   if (fileName) {
  //     return suggest({
  //       filename: fileName,
  //       conflictAction: 'uniquify'
  //     })
  //   }
    
  //   getPanelTabIpc().then(panelIpc => {
  //     panelIpc.ask('DOWNLOAD_COMPLETE', downloadItem) 
  //   })
  // });
  
  Ext.downloads.onChanged.addListener(function (e) {
    let downloadDelta = e;
    getPanelTabIpc().then(panelIpc => {
    if (typeof downloadDelta.state !== "undefined") {
      if (downloadDelta.state.current === "complete") {
          chrome.downloads.search({id: downloadDelta.id}, function(downloadItems) {
          if(downloadItems && downloadItems.length > 0) {
            console.log("Downloaded file name111: " + downloadItems[0].filename);
            let downloadItem={filename:downloadItems[0].filename}
            panelIpc.ask('DOWNLOAD_COMPLETE', downloadItem)      

          }
        });
          storage.get('config')
          .then(async(config = {}) => {
            const state = await getState();
            if(config.cvScope ==="browser" && state.status=="PLAYER"){
              setTimeout(function() {
                chrome.downloads.erase({state: "complete"});
              }, 2000)
            }
          })
        
      }
    }
  })
  });
}

// usage:
// 1. set tabId for inspector:  `setInspectorTabId(someTabId)`
// 2. clear tabId for inspector: `setInspectorTabId(null, true)`
const setInspectorTabId = async (tabId, shouldRemove, noNotify) => {
  const state = await getState()
  const lastInspect = state.tabIds.toInspect

  await updateState(state => ({
    ...state,
    tabIds: {
      ...state.tabIds,
      lastInspect,
      toInspect: tabId
    }
  }))

  if (shouldRemove) {
    if (lastInspect) {
      if (noNotify) {
        return Promise.resolve(true)
      }

      return getIpcCache().get(lastInspect)
      .then(ipc => ipc.ask('STOP_INSPECTING'))
      .catch(e => log(e.stack))
    }

    return Promise.resolve(true)
  }
}

const startSendingTimeoutStatus = (timeout, type = 'wait') => {
  let timer

  const p = getState().then(state => {
    let past = 0

    if (state.timer)  clearInterval(state.timer)

    timer = setInterval(() => {
      past += 1000

      getPanelTabIpc().then(panelIpc => {
        panelIpc.ask('TIMEOUT_STATUS', {
          type,
          past,
          total: timeout
        })
      })

      if (past >= timeout) {
        clearInterval(timer)
      }
    }, 1000)

    return updateState({ timer })
  })

  return () => p.then(() => clearInterval(timer))
}

const pacListener = (data) => {
  if (data.type === 'PROXY_LOG') {
    log('PROXY_LOG', data)
  }
}

// Authorize page requests before opening UI. The IDE-window fallback handles
// browsers that no longer retain a user gesture after the asynchronous check.
const authorizePageInvoke = async (args, config, from) => {
  const policy = pageInvokePolicy(config, args.sender.url, from)
  args.options = pageInvokeOptions(args.options, policy.commandVars)
  if (policy.confirm) {
    const ipc = await getIpcCache().get(args.sender.tab.id)
    const accepted = await ipc.ask('CONFIRM_PAGE_INVOKE', { url: args.sender.url })
    if (accepted !== true) throw new Error('Website macro run was not approved. Reload the page to try again.')
  }
  // Ignore any page-provided opening hint. Consent comes before UI side effects.
  args._pSidePanelOpening = tryOpenSidePanelForRun(args.sender.tab.id)
}

const onRequest = (cmd, args) => {
  // A page must be authorized before it can open the panel or alter run state.
  return onRequestAsync(cmd, args)
}

// Processor for all message background could receive
// All messages from panel starts with 'PANEL_'
// All messages from content script starts with 'CS_'
const onRequestAsync = async (cmd, args) => {
  const state = await getState()

  if (cmd !== 'CS_ACTIVATE_ME' && cmd !== 'TIMEOUT') {
    log('onAsk', cmd, args)
  }

  switch (cmd) {
    // Mark the tab as panel.
    case 'I_AM_PANEL':
      // 0.5s delay to make sure toPlay is set in tabs.onActivated event
      await delay(() => {}, 500)
      // When panel window is opened, it's always in normal mode,
      // so make sure contextMenus for record mode are removed
      
       

      let isSidePanel = args.sender.tab?.id === SIDEPANEL_TAB_ID || 
                        args.sender.url === `chrome-extension://${Ext.runtime.id}/sidepanel.html` ||
                        args.sender.url.match(/moz-extension:\/\/[a-z0-9-]+\/sidepanel.html/)
      let panelTabId = isSidePanel ? SIDEPANEL_TAB_ID : args.sender.tab.id;
      await updateState(setIn(['tabIds', 'panel'], panelTabId))
      if (!isSidePanel) { 
        updateState(setIn(['tabIds', 'lastPanelWindow'], panelTabId))
      }

      getContextMenuService().destroyMenus()

      // Note: when the panel first open first, it could be marked as the tab to play
      // That's something we don't want to happen
      if (args.sender.tab && args.sender.tab.id && state.tabIds.toPlay === args.sender.tab.id) {
        await updateState(state => ({
          ...state,
          tabIds: {
            ...state.tabIds,
            toPlay: state.tabIds.lastPlay,
            firstPlay: state.tabIds.lastPlay,
            lastActivated: state.tabIds.lastActivated.filter(id => id !== args.sender.tab.id)
          }
        }))
      }

      return true

    // case 'PANEL_SET_SHOW_SIDE_PANEL': {
    //   console.log('args.showSidePanel:>> ', args.showSidePanel)
    //   // return getLogServiceForBg().log(args.log)
    //   window.showSidePanel = args.showSidePanel
    //   return true
    // }

    case 'PANEL_PRECISE_DELAY': {
      // Throttle-immune timer for the script runner: a panel that runs as a
      // HIDDEN TAB gets Chrome's background-tab timer throttling — its
      // setTimeout(180) silently becomes ~1s, which wrecks every
      // timing-sensitive macro (measured live: scheduled key presses landed
      // ~1s late). The service worker's timers are not tab-throttled, so
      // the panel delegates short waits here. Capped: SW timers beyond a
      // few seconds risk the worker's idle shutdown — the caller slices.
      const ms = Math.max(0, Math.min(5000, Number(args.ms) || 0))
      return new Promise(resolve => setTimeout(() => resolve(true), ms))
    }

    case 'PANEL_CAPTURE_VISIBLE_TAB': {
      // Chrome caps captureVisibleTab at ~2 calls/sec per extension. The panel
      // side throttles, but this funnel also serves callers outside that
      // throttle — on a quota error, wait a slot and retry instead of failing
      // the macro command.
      const captureWithRetry = (retriesLeft) => {
        return Ext.tabs.captureVisibleTab(args.windowId, args.options).catch(e => {
          console.log('captureVisibleTab e:>>', e)
          const msg = (e && e.message) || String(e)
          if (/MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND/.test(msg) && retriesLeft > 0) {
            return new Promise(resolve => setTimeout(resolve, 700))
              .then(() => captureWithRetry(retriesLeft - 1))
          }
          if(e == "Error: Missing activeTab permission"){
            throw new Error('Error E144: Screenshot permission issue. To fix, please reload extension.' +
              'To do so, go to extension settings and turn the blue switch OFF and then ON again.')
          }
          // captureVisibleTab shoots the WINDOW's ACTIVE tab, not the play
          // tab. When another extension's page (chrome-extension://...) or a
          // browser-internal page took over the active slot mid-run, Chrome
          // refuses with "Cannot access a chrome-extension:// URL of
          // different extension" & co (regression: bahn.de macro). Skip the
          // foreign tab gracefully: re-activate the play tab and retry.
          if (/cannot access/i.test(msg)) {
            return getState()
              .then(state => Ext.tabs.get(state.tabIds.toPlay).catch(() => null))
              .then(playTab => {
                if (retriesLeft > 0 && playTab && !playTab.active && /^(https?|file):/i.test(playTab.url || '')) {
                  log('captureVisibleTab blocked by a non-capturable active tab — re-activating play tab', playTab.id)
                  return activateTab(playTab.id, true)
                    .then(() => new Promise(resolve => setTimeout(resolve, 300)))
                    .then(() => captureWithRetry(retriesLeft - 1))
                }
                throw new Error('Error E145: Screenshot failed - the active tab is a browser-internal page or belongs to another extension, so it cannot be captured (' + msg + '). Switch back to the web page being automated and run the macro again.')
              })
          }
          throw e;
        })
      }
      return captureWithRetry(2)
    }

    case 'PANEL_SET_PROXY': {
      return setProxy(args.proxy)
      .then(() => true)
    }

    case 'PANEL_GET_PROXY': {
      return getProxyManager().getProxy()
    }

    case 'PANEL_TIME_FOR_BACKUP':
      return isTimeToBackup().then(obj => obj.timeout)

    case 'PANEL_LOG':
      return getLogServiceForBg().log(args.log)

    case 'PANEL_CALL_PLAY_TAB': {
      const { ipcTimeout, ipcNoLaterThan, payload } = args

      return getPlayTabIpc(ipcTimeout, ipcNoLaterThan).then((ipc) => {
        return ipc.ask(payload.command, payload.args)
      })
    }

    case 'PANEL_CS_IPC_READY': {
      const { tabId, timeout } = args
      return getIpcCache().get(tabId, timeout).then(() => true)
    }

    case 'PANEL_HAS_PENDING_DOWNLOAD': {
      return getDownloadMan().hasPendingDownload()
    }

    case 'PANEL_WAIT_FOR_ANY_DOWNLOAD': {
      return getDownloadMan().waitForDownloadIfAny().then(() => true)
    }

    case 'PANEL_START_RECORDING': {
      log('Start to record...')
      await updateState({ status: C.APP_STATUS.RECORDER })

      setInspectorTabId(null, true)
      toggleRecordingBadge(true)

      const menuInfos = [{
        id: 'assertText',
        title: 'Assert Text',
        contexts: ['page', 'selection']
      }, {
        id: 'assertTitle',
        title: 'Assert Title',
        contexts: ['page', 'selection']
      }]
      .map(item => ({
        ...item,
        onclick: () => {
          getRecordTabIpc()
          .then(ipc => ipc.ask('CONTEXT_MENU_IN_RECORDING', { command: item.id }))
        }
      }))

      getContextMenuService().createMenus(menuInfos)

      const list = state.tabIds.lastActivated.filter(id => id !== state.tabIds.panel)
      const lastActivatedTabId = list[list.length - 1]

      if (lastActivatedTabId) {
        activateTab(lastActivatedTabId, true)
        .then(() => markAutomationTab(lastActivatedTabId, 'recording'))
        .catch(e => {
          log.warn(`Failed to activate current tab: ${e.message}`)
        })
      }

      return true
    }

    case 'PANEL_STOP_RECORDING':
      log('Stop recording...')

      getContextMenuService().destroyMenus()
      getRecordTabIpc()
      .then(ipc => {
        ipc.ask('SET_STATUS', {
          status: C.CONTENT_SCRIPT_STATUS.NORMAL
        })
      })

      await updateState(state => ({
        ...state,
        status: C.APP_STATUS.NORMAL,
        tabIds: {
          ...state.tabIds,
          toRecord: null,
          firstRecord: null,
          lastRecord: state.tabIds.toRecord
        }
      }))

      toggleRecordingBadge(false)
      unmarkAutomationTabs()
      return true

    case 'PANEL_TRY_TO_RECORD_OPEN_COMMAND': {
      if (state.status !== C.APP_STATUS.RECORDER) {
        throw new Error('E215: Not in recorder mode')
      }

      // Well, `getPlayTab` is actually 'get current active tab'
      return getPlayTab()
      .then(async (tab) => {
        log('PANEL_TRY_TO_RECORD_OPEN_COMMAND', tab)

        if (!/^(https?:|file:)/.test(tab.url)) {
          throw new Error('E216: Not a valid url to record as open command')
        }

        await updateState(state => ({
          ...state,
          tabIds: {
            ...state.tabIds,
            toRecord: tab.id,
            firstRecord: tab.id
          }
        }))

        markAutomationTab(tab.id, 'recording')

        getPanelTabIpc()
        .then(panelIpc => {
          const command = {
            cmd: 'open',
            target: tab.url
          }

          panelIpc.ask('RECORD_ADD_COMMAND', command)
          notifyRecordCommand(command)
        })

        return true
      })
    }

    case 'PANEL_START_INSPECTING':
      log('start to inspect...')
      toggleInspectingBadge(true)

      if (state.tabIds.toPlay) {
        activateTab(state.tabIds.toPlay, true)
      }

      await updateState({ status: C.APP_STATUS.INSPECTOR })
      return true

    case 'PANEL_STOP_INSPECTING':
      log('start to inspect...')
      await updateState({ status: C.APP_STATUS.NORMAL })

      toggleInspectingBadge(false)
      return setInspectorTabId(null, true)

    case 'PANEL_START_PLAYING': {
      log('start to play...')
      await updateState({
        status: C.APP_STATUS.PLAYER,
        pendingPlayingTab: false,
        xClickNeedCalibrationInfo: null
      })

      storage.get('config')
      .then(async(config = {}) => {
        const state = await getState();
        if(config.cvScope ==="browser" && state.status=="PLAYER"){
          setTimeout(function() {
            chrome.downloads.erase({state: "complete"});
          }, 2000)
        }
      })
      
      setInspectorTabId(null, true)
      togglePlayingBadge(true)

      // mark the tab being replayed (blue group + border); the tab id is set
      // by the panel right before it starts the player
      getState().then(state => markAutomationTab(state.tabIds.toPlay, aiTabMarkActive ? 'ai' : 'playing'))

      // Note: reset download manager to clear any previous downloads — but
      // NOT mid JS-script: every player-path uiv.* call STARTs/STOPs its own
      // run, and wiping here killed a download armed one call earlier
      // (uiv.download's arm, or uiv.run('onDownload') before a click)
      if (!scriptRunActive) getDownloadMan().reset()
      // Re-check log service to see if xfile is ready to write log
      getLogServiceForBg().check()

      if (state.timer) clearInterval(state.timer)
      
      return true
      // .catch(e => {
      //   togglePlayingBadge(false)
      //   throw e
      // })
    }

    case 'PANEL_HEART_BEAT': {
      return getState('heartBeatSecret').then((secret = 0) => secret)
    }

    case 'PANEL_STOP_PLAYING': {
      // IMPORTANT: make updating status to normal the first thing in this branch,
      // otherwise it might accidently overwrite the status of following PANEL_START_PLAYING
      await updateState(state => ({
        ...state,
        status: C.APP_STATUS.NORMAL,
        tabIds: {
          ...state.tabIds,
          // Note: reset firstPlay to current toPlay when stopped playing
          // userful for playing loop (reset firstPlay after each loop)
          firstPlay: state.tabIds.toPlay,
          // reset lastPlay here is useful for ContinueInLastUsedTab
          lastPlay: state.tabIds.toPlay
        }
      }))

      // Note: let cs know that it should exit playing mode
      getIpcCache().get(state.tabIds.toPlay)
      .then(ipc => ipc.ask('SET_STATUS', { status: C.CONTENT_SCRIPT_STATUS.NORMAL }, C.CS_IPC_TIMEOUT))

      togglePlayingBadge(false)
      // Keep the mark when the run is one step of something longer: an AI
      // agent turn (cleared by PANEL_AI_TAB_MARK) or a JS script, whose every
      // uiv.* call is its own run (cleared by PANEL_SCRIPT_RUN_MARK)
      if (!aiTabMarkActive && !scriptRunActive) {
        unmarkAutomationTabs()
      }

      // Note: reset download manager to clear any previous downloads — same
      // JS-script exception as in PANEL_START_PLAYING above
      if (!scriptRunActive) getDownloadMan().reset()

      if (state.timer) clearInterval(state.timer)

      return true
    }

    // corresponding to the 'find' functionality on dashboard panel
    // It will find either the last play tab or record tab to look for the passed in locator
    case 'PANEL_HIGHLIGHT_DOM': {
      return Promise.all([
        getRecordTabIpc()
          .then(ipc => ({ ipc, type: 'record' }))
          .catch(() => null),
        getPlayTabIpc()
          .then(ipc => ({ ipc, type: 'play' }))
          .catch(() => null)
      ])
      .then(tuple => {
        if (!tuple[0] && !tuple[1]) {
          throw new Error('E218: No where to look for the dom')
        }

        return tuple.filter(x => !!x)
      })
      .then(list => {
        return Promise.all(
          list.map(({ ipc, type }) => {
            return ipc.ask('FIND_DOM', { locator: args.locator })
            .then((result) => ({ result, type, ipc }))
          })
        )
      })
      .then(async (list) => {
        const foundedList = list.filter(x => x.result)

        if (foundedList.length === 0) {
          throw new Error('E219: DOM not found')
        }

        const item = foundedList.length === 2
                        ? foundedList.find(item => item.type === args.lastOperation)
                        : foundedList[0]

        const state = await getState()
        const tabId = state.tabIds[item.type === 'record' ? 'lastRecord' : 'toPlay']

        return activateTab(tabId, true)
        .then(() => item.ipc.ask('HIGHLIGHT_DOM', { locator: args.locator,cmd: args.cmd }))
      })
    }

    case 'PANEL_HIGHLIGHT_RECT': {
      return getPlayTabIpc()
      .then(ipc => ipc.ask('HIGHLIGHT_RECT', args, C.CS_IPC_TIMEOUT))
    }

    case 'PANEL_HIGHLIGHT_X': {
      return getPlayTabIpc()
      .then(ipc => ipc.ask('HIGHLIGHT_X', args, C.CS_IPC_TIMEOUT))
    }

    case 'PANEL_SHOW_BROWSER_CURSOR': {
      return getPlayTabIpc()
      .then(ipc => ipc.ask('SHOW_BROWSER_CURSOR', args, C.CS_IPC_TIMEOUT))
    }

    case 'PANEL_HIGHLIGHT_RECTS': {
      console.log('PANEL_HIGHLIGHT_RECTS:>>', args)
      return getPlayTabIpc()
      .then(ipc => ipc.ask('HIGHLIGHT_RECTS', args, C.CS_IPC_TIMEOUT))
    }

    case 'PANEL_HIGHLIGHT_DESKTOP_RECTS': {
      return runInDesktopScreenshotEditor(args.screenAvailableSize, {
        type: DesktopScreenshot.RequestType.DisplayVisualResult,
        data: {
          rects: args.scoredRects,
          image: args.imageInfo
        }
      })
    }

    case 'PANEL_HIGHLIGHT_DESKTOP_X': {
      return runInDesktopScreenshotEditor(args.screenAvailableSize, {
        type: DesktopScreenshot.RequestType.DisplayVisualX,
        data: {
          rects: [{...args.coordinates}],
          image: args.imageInfo
        }
      })
    }

    case 'PANEL_HIGHLIGHT_OCR_MATCHES': {
      if (args.isDesktop) {
        return getCurrentStorageManager()
        .then(storageManager => {
          const source = storageManager.getCurrentStrategyType() === StorageStrategyType.XFile
                            ? DesktopScreenshot.ImageSource.HardDrive
                            : DesktopScreenshot.ImageSource.Storage

          return runInDesktopScreenshotEditor(args.screenAvailableSize, {
            type: DesktopScreenshot.RequestType.DisplayOcrResult,
            data: {
              ocrMatches: args.ocrMatches,
              image: {
                source,
                path: ensureExtName('.png', C.LAST_DESKTOP_SCREENSHOT_FILE_NAME)
              }
            }
          })
        })
      } else {
        return getPlayTabIpc()
        .then(ipc => ipc.ask('HIGHLIGHT_OCR_MATCHES', args, C.CS_IPC_TIMEOUT))
      }
    }

    case 'PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE': {
      return getPlayTabIpc()
      .then(ipc => {
        return Promise.all([
          ipc.ask('CLEAR_VISION_RECTS', {}, C.CS_IPC_TIMEOUT),
          ipc.ask('CLEAR_OCR_MATCHES', {}, C.CS_IPC_TIMEOUT)
        ])
      })
    }

    case 'PANEL_RESIZE_WINDOW': {
      if (!state.tabIds.panel) {
        throw new Error('E220: Panel not available')
      }

      return Ext.tabs.get(state.tabIds.panel)
      .then(tab => {
        return Ext.windows.update(tab.windowId, pick(['width', 'height'], {
          ...args.size,
          width: args.size.width,
          height: args.size.height
        }))
      })
    }

    case 'PANEL_AI_TAB_MARK': {
      // Orange mark (tab group + page border) on the tab the sidebar AI agent
      // is working on, held for the whole agent turn — same orange as the AI
      // chat's action text, so the user can connect the two.
      aiTabMarkActive = !!args.marked

      if (!args.marked) {
        return unmarkAutomationTabs().then(() => true)
      }

      return getCurrentTab().then(tab => {
        if (!isMarkableTab(tab)) return false
        return markAutomationTab(tab.id, 'ai').then(() => true)
      })
    }

    case 'PANEL_SCRIPT_RUN_MARK': {
      // Held for a whole JS script run — see scriptRunActive above. The mark
      // itself is applied by the first command's PANEL_START_PLAYING; this
      // only keeps the per-command stops from tearing it down again.
      scriptRunActive = !!args.marked

      // download-manager hygiene at the script boundary: per-command resets
      // are skipped while the script runs (see PANEL_START/STOP_PLAYING), so
      // clear leftovers here — on start (a previous run may have died armed)
      // and on end
      getDownloadMan().reset()

      if (!args.marked && !aiTabMarkActive) {
        return unmarkAutomationTabs().then(() => true)
      }

      return true
    }

    case 'PANEL_UPDATE_BADGE': {
      const dict = {
        play: togglePlayingBadge,
        record: toggleRecordingBadge,
        inspect: toggleInspectingBadge
      }
      const fn = dict[args.type]

      if (!fn) {
        throw new Error(`E221: unknown type for updating badge, '${args.type}'`)
      }

      return fn(!args.clear, args)
    }

    case 'PANEL_NOTIFY_AUTO_PAUSE': {
      notifyAutoPause()
      return true
    }

    case 'PANEL_NOTIFY_BREAKPOINT': {
      notifyBreakpoint()
      return true
    }

    case 'PANEL_NOTIFY_ECHO': {
      notifyEcho(args.text)
      return true
    }

    case 'PANEL_CLOSE_ALL_WINDOWS': {
      await updateState({ closingAllWindows: true })

      return logKantuClosing()
      .catch(e => {
        log.warn('E222: Error in log => RPA closing: ', e.message)
      })
      .then(() => {
        closeAllWindows()
        return true
      })
    }

    case 'PANEL_CURRENT_PLAY_TAB_INFO': {
      return getPlayTab()
      .then(tab => {
        return {
          url: tab.url,
          title: tab.title
        }
      })
    }

    case 'PANEL_MINIMIZE_ALL_WINDOWS_BUT_PANEL': {
      const pPanelTab   = !state.tabIds.panel ? Promise.resolve() : Ext.tabs.get(state.tabIds.panel)
      const pAllWindows = Ext.windows.getAll()

      return Promise.all([pPanelTab, pAllWindows])
      .then(([tab, wins]) => {
        const list = !tab ? wins : wins.filter(win => win.id !== tab.windowId)
        return Promise.all(list.map(win => Ext.windows.update(win.id, { state: 'minimized' })))
      })
      .then(() => delay(() => true, 500))
    }

    case 'PANEL_MINIMIZE_ALL_WINDOWS': {
      return Ext.windows.getAll()
      .then(wins => {
        return Promise.all(
          wins.map(win => Ext.windows.update(win.id, { state: 'minimized' }))
        )
        .then(() => delay(() => true, 500))
      })
    }

    case 'PANEL_BRING_PANEL_TO_FOREGROUND': {
      return showPanelWindow()
      .then(() => true)
    }

    case 'PANEL_BRING_PLAYING_WINDOW_TO_FOREGROUND': {
      return getPlayTab()
      .then(tab => activateTab(tab.id, true))
      .catch(e => showPanelWindow())
      .then(() => true)
    }

/*    case 'PANEL_IS_PLAYING_WINDOW_IN_FOREGROUND': {
      return getPlayTab()
      .then(tab => {
        if (!tab) return false

        return Ext.windows.get(tab.windowId)
        .then(win => !!win.focused)
      })
    }
*/

    case 'PANEL_RESIZE_PLAY_TAB': {
      return getPlayTab()
      .then(tab => resizeViewportOfTab(tab.id, args.viewportSize, args.screenAvailableRect))
    }
   
    case 'PANEL_GET_WINDOW_SIZE_OF_PLAY_TAB': {
      return getPlayTab()
      .then(tab => {
        console.log('PANEL_GET_WINDOW_SIZE_OF_PLAY_TAB tab:>> ', tab)
       return getWindowSize(tab.windowId)
      })
    }

    case 'PANEL_SELECT_AREA_ON_CURRENT_PAGE': {
      return getPlayTabIpc()
      .then(ipc => {
        activateTab(state.tabIds.toPlay, true)
        return ipc.ask('SELECT_SCREEN_AREA')
      })
      .catch(e => {
        log.error(e.stack)
        throw new Error('E205: Not able to take screenshot on the current tab')
      })
    }

    case 'PANEL_CLEAR_VISION_RECTS_ON_PLAYING_PAGE': {
      return getPlayTabIpc()
      .then(ipc => {
        return Promise.all([
          ipc.ask('CLEAR_VISION_RECTS', {}, C.CS_IPC_TIMEOUT),
          ipc.ask('CLEAR_OCR_MATCHES', {}, C.CS_IPC_TIMEOUT)
        ])
      })
    }

    case 'PANEL_HIDE_VISION_HIGHLIGHT': {
      return getPlayTabIpc()
      .then(ipc => ipc.ask('HIDE_VISION_RECTS', {}, C.CS_IPC_TIMEOUT))
    }

    case 'PANEL_SHOW_VISION_HIGHLIGHT': {
      return getPlayTabIpc()
      .then(ipc => ipc.ask('SHOW_VISION_RECTS', {}, C.CS_IPC_TIMEOUT))
    }

    case 'PANEL_SCREENSHOT_PAGE_INFO': {
      return getPlayTabIpc()
      .then(ipc => ipc.ask('SCREENSHOT_PAGE_INFO', {}, C.CS_IPC_TIMEOUT))
    }

    case 'PANEL_TOGGLE_HIGHLIGHT_VIEWPORT': {
      return getPlayTabIpc()
      .then(ipc => ipc.ask('TOGGLE_HIGHLIGHT_VIEWPORT', args, C.CS_IPC_TIMEOUT))
    }

    // PANEL_DISABLE_DOWNLOAD_BAR / PANEL_ENABLE_DOWNLOAD_BAR were REMOVED
    // (2026-08-16): they hid Chrome's download UI during X-command runs for
    // the old bottom shelf's sake (it resized the viewport; the ≥116 toolbar
    // bubble does not), and an abnormally-ended run left the UI off
    // browser-wide. The startup heal above keeps rescuing users coming from
    // builds that still disabled it.

    case 'PANEL_GET_VIEWPORT_RECT_IN_SCREEN': {
      return Promise.all([
        getPlayTabIpc(),
        getPlayTab().then(tab => {
          return Ext.tabs.getZoom(tab.id)
        })
      ])
      .then(([ipc, zoom]) => {
        return getPlayTabIpc().then(ipc => ipc.ask('GET_VIEWPORT_RECT_IN_SCREEN', { zoom }))
      })
    }

    case 'PANEL_XCLICK_NEED_CALIBRATION': {
      const last = state.xClickNeedCalibrationInfo
      const getWindowInfo = (win, tabId) => ({
        id:           win.id,
        top:          win.top,
        left:         win.left,
        width:        win.width,
        height:       win.height,
        activeTabId:  tabId
      })
      const isWindowInfoEqual = (a, b) => {
        return and(
          ...'id, top, left, width, height, activeTabId'.split(/,\s*/g).map(key => a[key] === b[key])
        )
      }
      // Note: we take every request as it will do calibration
      // and next request should get `false` (no need for more calibration, unless there are window change or window resize)
      return getPlayTab()
      .then(tab => {
        if (!tab) throw new Error('E206: no play tab found for calibration')

        return Ext.windows.get(tab.windowId)
        .then(async (win) => {
          const winInfo = getWindowInfo(win, tab.id)

          log('CALIBRATION NEED???', last, winInfo)

          // Note: cache last value
          await updateState({ xClickNeedCalibrationInfo: winInfo })

          return !isWindowInfoEqual(winInfo, last || {})
        })
      })
    }

    case 'PANEL_CLOSE_CURRENT_TAB_AND_SWITCH_TO_LAST_PLAYED': {
      return getPlayTab()
      .then(currentTab => {
        return Ext.windows.get(currentTab.windowId, { populate: true })
        .then(async (win) => {
          if (win.tabs.length < 2)  return true

          const index     = win.tabs.findIndex(tab => tab.id === currentTab.id)
          const prevIndex = (index - 1 + win.tabs.length) % win.tabs.length
          const prevTab   = win.tabs[prevIndex]
          const state     = await getState()

          const pNextTab = (() => {
            if (state.tabIds.lastPlay) {
              return Ext.tabs.get(state.tabIds.lastPlay)
              .catch(() => prevTab)
            } else {
              return Promise.resolve(prevTab)
            }
          })()

          if(currentTab.id == state.tabIds.lastPlay){
            return Ext.tabs.get(currentTab.id)
            .then(() => pNextTab)
            .then(nextTab => activateTab(nextTab.id))
            .then(() => delay(() => {}, 500))
            .then(() => true)
          }else{
          return Ext.tabs.remove(currentTab.id)
          .then(() => pNextTab)
          .then(nextTab => activateTab(nextTab.id))
          // Note: add this delay to avoid Error #101
          // looks like when the pc is quick enough, there are chances
          // that next macro run fails to find the tab for replay
          .then(() => delay(() => {}, 500))
          .then(() => true)
          }
        })
      })
    }

    case 'PANEL_OPEN_IN_SIDEPANEL': {
      // we cannot open sidepanel using ipc

  
    }

    case 'CS_LOAD_URL': {
      const tabId = args.sender.tab.id
      const url = args.url
      const cmd = args.cmd

      return getTab(tabId).then(tab => {
        const finalUrl = (() => {
          try {
            const u = new URL(url, tab.url);
            return u.toString();
          } catch (e) {
            return url;
          }
        })()

        return updateUrlForTab(tabId, finalUrl, cmd).then(() => true)
      })
    }

    case 'CS_STORE_SCREENSHOT_IN_SELECTION': {
      const { rect, devicePixelRatio, fileName } = args
      const tabId = args.sender.tab.id

      return getPanelTabIpc().then(ipc => {
        return ipc.ask('STORE_SCREENSHOT_IN_SELECTION', {
          rect,
          tabId,
          fileName,
          devicePixelRatio
        })
      })
    }

    case 'CS_SCREEN_AREA_SELECTED': {
      const { rect, devicePixelRatio } = args
      const tabId = args.sender.tab.id

      log('CS_SCREEN_AREA_SELECTED', rect, devicePixelRatio, tabId)

      return getPanelTabIpc().then(ipc => {
        return ipc.ask('SCREEN_AREA_SELECTED', {
          rect,
          tabId,
          devicePixelRatio
        })
        .then((data) => {
          return withPanelIpc().then(() => data)
        })
      })
    }

    case 'CS_DONE_INSPECTING':
      log('done inspecting...')

      await updateState({ status: C.APP_STATUS.NORMAL })

      toggleInspectingBadge(false)
      setInspectorTabId(null, true, true)
      activateTab(state.tabIds.panel, true)

      return getPanelTabIpc()
      .then(panelIpc => {
        return panelIpc.ask('INSPECT_RESULT', args)
      })

    // It's used for inspecting. The first tab which sends a CS_ACTIVATE_ME event
    // on mouse over event will be the one for us to inspect
    case 'CS_ACTIVATE_ME':
      switch (state.status) {
        case C.APP_STATUS.INSPECTOR:
          if (!state.tabIds.toInspect) {
            const tabId = args.sender.tab.id
            await updateState(setIn(['tabIds', 'toInspect'], tabId))

            setTimeout(() => {
              getIpcCache().get(tabId)
              .then(ipc => {
                return ipc.ask('SET_STATUS', {
                  status: C.CONTENT_SCRIPT_STATUS.INSPECTING
                })
              })
            }, 0)

            return true
          }
          break
      }
      return false

    case 'CS_RECORD_ADD_COMMAND': {
      const pullbackTimeout = 1000
      let isFirst   = false

      if (state.status !== C.APP_STATUS.RECORDER) {
        return false
      }

      if (!state.tabIds.toRecord) {
        isFirst = true

        await updateState(state => ({
          ...state,
          tabIds: {
            ...state.tabIds,
            toRecord: args.sender.tab.id,
            firstRecord: args.sender.tab.id
          }
        }))
      }

      if (state.tabIds.toRecord !== args.sender.tab.id) {
        return false
      }

      // Note: if receive a pullback cmd, we need to set the flag,
      // and strip Wait from any xxxAndWait command
      if (args.cmd === 'pullback') {
        updateState({ pullback: true })
        setTimeout(() => updateState({ pullback: false }), pullbackTimeout * 2)
        return false
      }

      setTimeout(() => {
        getIpcCache().get(state.tabIds.toRecord)
        .then(ipc => {
          return ipc.ask('SET_STATUS', {
            status: C.CONTENT_SCRIPT_STATUS.RECORDING
          })
        })
      }, 0)

      return delay(() => {}, pullbackTimeout)
      .then(() => getPanelTabIpc())
      .then(async (panelIpc) => {
        if (isFirst) {
          panelIpc.ask('RECORD_ADD_COMMAND', {
            cmd: 'open',
            target: args.url
          })
        }

        // Note: remove AndWait from commands if we got a pullback
        const state = await getState()

        if (state.pullback) {
          args.cmd = args.cmd.replace('AndWait', '')
          await updateState({ pullback: false })
        }

        return panelIpc.ask('RECORD_ADD_COMMAND', args)
      })
      .then(() => Promise.all([
        storage.get('config'),
        getState()
      ]))
      .then(([config, state]) => {
        if (config.recordNotification && state.status === C.APP_STATUS.RECORDER) {
          notifyRecordCommand(args)
        }
      })
      .then(() => true)
    }

    case 'PANEL_CLOSE_OTHER_TABS': {
      const tabId = state.tabIds.toPlay

      return Ext.tabs.get(tabId)
      .then(tab => {
        return Ext.tabs.query({ windowId: tab.windowId })
        .then(tabs => tabs.filter(t => t.id !== tabId))
        .then(tabs => Ext.tabs.remove(tabs.map(t => t.id)))
      })
      .then(() => true)
    }

    case 'PANEL_CLOSE_CURRENT_TAB': {
      const tabId = state.tabIds.toPlay

      // Note: must disable heart beat check here, since the heart beat of current tab is destined to be lost
      // The following two states are dedicated to this close tab task
      await updateState({
        disableHeartBeat: true,
        pendingPlayingTab: true
      })

      const closeTabAndGetNextTabOnWindow = (winId) => {
        return Ext.tabs.remove(tabId)
        .then(() => delay(() => getCurrentTab(winId), 1000))
      }

      const withKantuWindowMinimized = (fn) => {
        const getPanelWinId = () => Ext.tabs.get(state.tabIds.panel).then(tab => tab.windowId)
        const minimize      = () => getPanelWinId().then(winId => Ext.windows.update(winId, { state: 'minimized' }))
        const restore       = () => getPanelWinId().then(winId => Ext.windows.update(winId, { state: 'normal' }))

        return minimize()
        .then(() => delay(() => {}, 1000))
        .then(fn)
        .then(
          data => {
            restore()
            return data
          },
          e => {
            restore()
            throw e
          }
        )
      }

      const closeAndGetNextTab  = () => {
        return Ext.tabs.get(tabId)
        .then(tab => {
          // Note: If the current tab is the only tab in its window, we won't know which one is the next focused window,
          // if Kantu window happens to be on the top. In this case, we need to focus on the tab
          // that is going to be closed first
          return Ext.windows.get(tab.windowId, { populate: true })
          .then(win => {
            if (win.tabs.length !== 1) {
              return closeTabAndGetNextTabOnWindow(tab.windowId)
            }

            // If Kantu window is now on top, try to pick the next one (by minimize Kantu window)
            // Otherwise pick the current tab will be fine
            return getCurrentTab()
            .then(tab => {
              if (tab && tab.id !== state.tabIds.panel) {
                return closeTabAndGetNextTabOnWindow()
                .then(tab => {
                  if (tab && tab.id === state.tabIds.panel) {
                    return withKantuWindowMinimized(getCurrentTab)
                  }
                  return tab
                })
              }

              return withKantuWindowMinimized(closeTabAndGetNextTabOnWindow)
            })
          })
        })
        .catch(e => {
          log.error(e)
        })
      }

      const runWithTab = (pTab) => {
        return pTab.then(async (tab) => {
          log('getCurrentTab - ', tab)

          const isUsableTab = (t) => !!t && !!t.id &&
            t.id !== state.tabIds.panel &&
            (t.url || '').indexOf(Ext.runtime.getURL('')) === -1

          // e.g. on macOS the IDE window can be the last-focused window when
          // the played tab closes — writing null here made the very next
          // command fail with "Error #180: No connection to browser tab".
          // Fall back to the focused normal window's active tab first.
          if (!isUsableTab(tab)) {
            tab = await Ext.windows.getLastFocused({ populate: true, windowTypes: ['normal'] })
              .then(win => ((win && win.tabs) || []).find(t => t.active))
              .catch(() => null)
          }

          return updateState(
            setIn(
              ['tabIds', 'toPlay'],
              isUsableTab(tab) ? tab.id : null
            )
          )
        })
        .catch(() => {})
        .then(() => {
          // Note: should always reset pendingPlayingTab, no matter there is an error or not
          log('resetting pendingPlayingTab')
          return updateState({ pendingPlayingTab: false })
        })
      }

      return runWithTab(
        closeAndGetNextTab()
      )
      .then(() => true)
    }

    case 'PANEL_SELECT_WINDOW': {
      const oldTablId       = state.tabIds.toPlay
      const [type, locator] = splitIntoTwo('=', args.target)

      if (!locator) {
        throw new Error(`E207: invalid window locator, '${args.target}'`)
      }

      let pGetTabs

      switch (type.toLowerCase()) {
        case 'title':
          pGetTabs = Ext.tabs.query({ title: locator })
          break

        case 'tab': {
          if (/^\s*open\s*$/i.test(locator)) {
            // tab=open CREATES a tab on the Value url. Without one it used to
            // open the extension's root page (a stray "chrome-extension://…/"
            // tab, OPEN-ISSUES 21.2/21.4) — refuse instead and say what the
            // caller probably wanted
            if (!args.value || !String(args.value).trim()) {
              throw new Error('E211: selectWindow | tab=open needs a URL in the Value column — it CREATES a new tab there. To switch to a tab that a click just opened, use selectWindow | tab=N (N counted from the start tab) or, in a script, uiv.tabs.select({newest: true})')
            }
            pGetTabs = Ext.tabs.get(state.tabIds.toPlay)
              .then(tab => Ext.tabs.create({ url: args.value, windowId: tab.windowId }))
              .then(tab => [tab])
          } else {
            const offset = parseInt(locator, 10)

            if (isNaN(offset)) {
              throw new Error(`E208: Invalid tab offset, '${locator}'`)
            }

            pGetTabs = Ext.tabs.get(state.tabIds.firstPlay)
            .then(tab => Ext.tabs.query({
              windowId: tab.windowId,
              index: tab.index + offset
            }))
          }

          break
        }

        default:
          throw new Error(`E209: window locator type '${type}' not supported`)
      }

      return pGetTabs
      .then(tabs => {
        if (tabs.length === 0) {
          throw new Error(`E210: failed to find the tab with locator '${args.target}'`)
        } 
        return tabs[0]
      })
      .then(tab => {
        // Popup pattern: the site does window.open('about:blank') and sets the
        // popup's location a moment later. At this point the tab still says
        // about:blank, which the uninjectable check below took for a
        // browser-internal page — no DOM-ready wait, and the next command ran
        // against the vanishing blank document (OPEN-ISSUES 17.9, Stripe
        // invoice popups). Give such a tab a few seconds to start its real
        // navigation before deciding what it is.
        const blankPopup = /^about:blank$/i.test(tab.url || '') && !tab.pendingUrl && !/tab\s*=\s*open/i.test(String(args.target))
        if (!blankPopup) return tab
        const deadline = Date.now() + 5000
        const poll = () => Ext.tabs.get(tab.id).then(t => {
          if (!t) return tab
          if ((t.url && !/^about:blank$/i.test(t.url)) || t.pendingUrl) return t
          if (Date.now() >= deadline) return t
          return new Promise(resolve => setTimeout(resolve, 150)).then(poll)
        }).catch(() => tab)
        return poll()
      })
      .then(tab => {
        log('selectWindow, got tab', tab)

        // Browser-internal pages (chrome://, edge://, about:) never load a
        // content script, so the DOM-ready wait below can only burn its full
        // 30s and throw E225 — even though the tab opened and selected fine.
        // Resolve immediately instead: the tab is usable for real-input
        // automation (XClick/XType/desktop vision), just not for page
        // commands, which fail with their own targeted errors when tried.
        // a JUST-created tab can report empty url AND pendingUrl — the
        // REQUESTED url (tab=open's value) is the reliable signal there
        const requestedUrl = /tab\s*=\s*open/i.test(String(args.target)) ? String(args.value || '') : ''
        // a popup that is navigating away from about:blank reports url
        // 'about:blank' AND a pendingUrl — the pending one is the page the
        // tab is about to be, so it decides
        const effectiveUrl = (tab.url && !/^about:blank$/i.test(tab.url)) ? tab.url : (tab.pendingUrl || requestedUrl || tab.url || '')
        const uninjectable = /^(chrome|edge|about|chrome-extension|moz-extension|view-source):/i.test(effectiveUrl)
        if (uninjectable) {
          log('selectWindow: browser-internal page, no content script to wait for', tab.url || tab.pendingUrl)
          // register + activate INLINE: the shared chain below was observed
          // not updating toPlay for this branch, and a stale toPlay makes
          // the next play-tab activation bury the tab just selected
          return updateState(state => ({
            ...state,
            tabIds: {
              ...state.tabIds,
              lastPlay: state.tabIds.toPlay,
              toPlay: tab.id
            }
          }))
          .then(() => activateTab(tab.id))
          .then(() => true)
        }

        // a tab that was open BEFORE an extension update/reload has no content
        // script any more: the DOM-ready wait below burned its full 30 s and
        // threw E225 although the tab was fine (OPEN-ISSUES 21.5, seen after
        // reload_extension on the claude.ai tab). Re-inject first, like the
        // script runner does (17.1); a healthy tab is a cheap probe.
        return (uninjectable ? Promise.resolve(null) : reinjectContentScript(tab).catch(() => false).then(() => getIpcCache().domReadyGet(tab.id, 30000))
        .catch(e => {
          // args.target = 'tab=open' is a valid value, so this is commented out.
          // if (/tab=\s*open\s*/i.test(args.target)) {
          //   throw new Error('E211: To open a new tab, a valid URL is needed')
          // }
          throw new Error(`E225: DOM failed to be ready in 30sec.`)
        }))
        .then(ipc => {
          if (!ipc) return true // browser-internal page: selected, no page IPC
          return Promise.resolve(ipc).then(ipc => {
          log('selectWindow, got ipc', ipc)
          const domReadyTimeout = 20000
          return ipc.ask('DOM_READY', {}, domReadyTimeout)
          .catch(e => {
            log.error(e)
            // most likely, ipc is not running properly in this tab     
            throw new Error(`E226: DOM failed to be ready in ${domReadyTimeout} ms'`)
          })
          .then(() => {
            ipc.ask('SET_STATUS', {
              status: C.CONTENT_SCRIPT_STATUS.PLAYING
            })
            return true
          })
          })
        })
        .catch(e => {
          console.error("DOM_READY Error ==:>> ", e)
          throw e
        })
        .then(() => {
          // Note: set the original tab to NORMAL status
          // only if the new tab is set to PLAYING status
          log('selectWindow, set orignial to normal')

          getIpcCache().get(oldTablId)
          .then(ipc => {
            return ipc.ask('SET_STATUS', {
              status: C.CONTENT_SCRIPT_STATUS.NORMAL
            })
          })
        })
        .then(async () => {
          await updateState(state => ({
            ...state,
            tabIds: {
              ...state.tabIds,
              lastPlay: state.tabIds.toPlay,
              toPlay: tab.id
            }
          }))

          // selectWindow switched the replay to another tab — mark it too
          markAutomationTab(tab.id, aiTabMarkActive ? 'ai' : 'playing')

          return activateTab(tab.id)
        })
      })
      .catch(e => {
        if (e.message.includes('DOM failed to be ready in')) {
          throw e
        } 
         /*In case when index 0 tab not found: re-anchor on the focused normal
           window's active web tab. Previous version passed the un-destructured
           Promise.all array as `window` (windowId ended up undefined, so the
           query returned one active tab per window in window order) and mixed
           tabs[0].windowId with ctab[0].index — on multi-window setups (e.g.
           macOS with the IDE window or an unrelated window first) it targeted
           a tab in the wrong window. */
        return Ext.windows.getLastFocused({ populate: true, windowTypes: ['normal'] })
          .then(async (win) => {
            const tabs = (win && win.tabs) || []
            const ctab = tabs.filter(r => r.active === true && r.url.indexOf('chrome-extension://') == -1)
            if (!ctab.length) {
              throw new Error(`E212: failed to find the tab with locator '${args.target}'`)
            }
            log('selectWindow fallback, re-anchoring on', ctab[0])
            const offset = parseInt(locator, 10);
            let wt = await checkTaIsPresent(ctab[0].index + offset, ctab[0].windowId);
            let tab = wt == "" ? ctab[0] : wt;
            if ((tab.index == 0 && offset == 0) || wt != "") {//when playtab index is 0
              await updateState(state => ({
                ...state,
                tabIds: {
                  ...state.tabIds,
                  lastPlay: state.tabIds.toPlay,
                  toPlay: tab.id,
                  firstPlay: ctab[0].id
                }
              }))
              return activateTab(tab.id)
            } else {
              throw new Error(`E212: failed to find the tab with locator '${args.target}'`)
            }
          })
      })
    }

    case 'CS_TIMEOUT_STATUS':
      return getPanelTabIpc()
      .then(ipc => ipc.ask('TIMEOUT_STATUS', args))

    case 'CS_DELETE_ALL_COOKIES': {
      const { url } = args

      return Ext.cookies.getAll({ url })
      .then(cookies => {
        const ps = cookies.map(c => Ext.cookies.remove({
          url: `${url}${c.path}`,
          name: c.name
        }))

        return Promise.all(ps)
      })
    }

    case 'CS_SET_FILE_INPUT_FILES': {      
      return chrome.extension.isAllowedFileSchemeAccess().then((isAllowed) => {
        if (!isAllowed) {
          throw new Error('E510: Please allow access to file urls')
        }
      }).catch(e => {
        throw e
      }).then(() => {
        return setFileInputFiles({
          tabId:    args.sender.tab.id,
          selector: args.selector,
          files:    args.files
        })
      })
    }

    // PANEL_ alias: uiv.download arms straight from the side panel — no
    // content-script hop, and it works before any page is involved
    case 'PANEL_ON_DOWNLOAD':
    case 'CS_ON_DOWNLOAD': {
      const p = getDownloadMan().prepareDownload(args.fileName, {
        wait:             !!args.wait,
        timeout:          args.timeout,
        timeoutForStart:  args.timeoutForStart
      })
      // the outcome is read through PANEL_WAIT_FOR_ANY_DOWNLOAD; an
      // interrupted download rejecting here would only be "unhandled" noise
      p.catch(() => {})
      return true
    }

    // uiv.download's trigger threw before any download could start: free the
    // arm so the script's next uiv.download can arm again (see DownloadMan)
    case 'PANEL_CANCEL_PENDING_DOWNLOAD': {
      return getDownloadMan().cancelPendingDownload(args.reason)
    }

    // saveItem: start a real download of any URL from the background — the
    // downloads API ignores page CORS/CSP, unlike an in-page <a download>.
    // PANEL_ alias: uiv.download's plain-URL form, sent from the side panel
    case 'PANEL_DOWNLOAD_URL':
    case 'CS_DOWNLOAD_URL': {
      const label = cmd === 'PANEL_DOWNLOAD_URL' ? 'uiv.download' : 'saveItem'
      // A named extension-blob download is a panel export (localStorageExport
      // & friends): its name must go through the pending map (see the
      // onDeterminingFilename listener at the top of this file) BEFORE the
      // download starts — the naming event can fire before the id callback.
      // Exports are also waited to completion so the caller gets the ACTUAL
      // on-disk name back instead of trusting the requested one; they are
      // small in-memory blobs, so completion is immediate.
      const isBlobExport = !!args.filename && isOwnBlobUrl(args.url)

      // poll instead of onChanged bookkeeping — search() also works when the
      // completion happened while this worker was evicted
      const waitForDownloadEnd = (id, timeout) => {
        const startTime = Date.now()
        let last = null
        const check = () => new Promise((res) => chrome.downloads.search({ id }, (items) => res(items && items[0])))
          .then((item) => {
            // the record is GONE: the erase-completed-downloads timer (the
            // onChanged listener above, browser scope while playing) removed
            // it between two polls. An erased record had finished — waiting
            // on turned every such export into a 30 s stall (OPEN-ISSUES 25.2:
            // "slowest uiv.screenshot 30220ms")
            if (!item) return last || { id, state: 'complete', erased: true }
            last = item
            if (item.state !== 'in_progress') return item
            if (Date.now() - startTime > timeout) return item
            return delay(check, 200)
          })
        return check()
      }

      const prepare = isBlobExport ? rememberBlobDownloadName(args.url, args.filename) : Promise.resolve()

      return prepare.then(() => new Promise((resolve, reject) => {
        const options = { url: args.url }
        if (args.filename) options.filename = args.filename

        chrome.downloads.download(options, (downloadId) => {
          if (chrome.runtime.lastError || downloadId === undefined) {
            const reason = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'unknown error'
            if (isBlobExport) forgetBlobDownloadName(args.url)
            // e.g. the derived filename is rejected — retry letting Chrome name it
            if (args.filename) {
              return chrome.downloads.download({ url: args.url }, (retryId) => {
                if (chrome.runtime.lastError || retryId === undefined) {
                  reject(new Error(`${label}: download failed - ${reason}`))
                } else {
                  resolve(true)
                }
              })
            }
            return reject(new Error(`${label}: download failed - ${reason}`))
          }

          if (!isBlobExport) return resolve(true)

          waitForDownloadEnd(downloadId, 30000)
            .then((item) => {
              forgetBlobDownloadName(args.url)
              if (item && item.state === 'interrupted') {
                return reject(new Error(`${label}: download interrupted (${item.error || 'unknown reason'})`))
              }
              const path = (item && item.filename) || ''
              const base = path.split(/[\\/]/).pop()
              resolve({ fileName: base || args.filename })
            })
        })
      }))
    }

    case 'CS_INVOKE': {
      return storage.get('config')
      .then(async(config = {}) => {
        const from = (args.testCase && args.testCase.from) || (args.testSuite && args.testSuite.from)
        await authorizePageInvoke(args, config, from)
        const state = await getState()
        const tabId = state.tabIds.toPlay
        const wTab = tabId !="" ? await checkWindowisOpen(tabId) : '';
        const tab = wTab != "" ? wTab : await getToplayTabId();
        await updateState(state => ({
          ...state,
          tabIds: {
            ...state.tabIds,
            lastPlay: state.tabIds.lastPlay,
            toPlay: tab.id,
            firstPlay: tab.id
          }
        }))
        

        // Authorization has completed. Open the panel now; without a browser
        // user gesture, withPanelIpc uses its IDE-window fallback.
        const sidePanelOpening = await (args._pSidePanelOpening || Promise.resolve(false))

        return withPanelIpc({
          params: { from },
          panelAlreadyOpening: sidePanelOpening
        })
        .then(panelIpc => {
          // in case of side panel
          if (!panelIpc) return false;

          if (args.testCase) {
            return panelIpc.ask('RUN_TEST_CASE', {
              testCase: args.testCase,
              options:  args.options
            })
          }

          if (args.testSuite) {
            return panelIpc.ask('RUN_TEST_SUITE', {
              testSuite:  args.testSuite,
              options:    args.options
            })
          }

          return true
        })
      })
    }

    case 'CS_IMPORT_AND_INVOKE': {
      const from = args.from

      return storage.get('config')
      .then(async (config = {}) => {
        await authorizePageInvoke(args, config, from)

        return (args._pSidePanelOpening || Promise.resolve(false))
        .then(sidePanelOpening => withPanelIpc({
          params: { from },
          panelAlreadyOpening: sidePanelOpening
        }))
        .then(panelIpc => {
          return panelIpc.ask('IMPORT_AND_RUN', args)
        })
      })
    }

    case 'CS_ADD_LOG': {
      return getPanelTabIpc()
      .then(ipc => ipc.ask('ADD_LOG', args))
    }

    case 'CS_OPEN_PANEL_SETTINGS': {
      // settings live on the options page now — open/focus its browser tab
      openSettings()
      .catch(e => {
        console.error(e)
      })
      return true
    }

    case 'DESKTOP_EDITOR_ADD_VISION_IMAGE': {
      return withPanelIpc()
      .then(ipc => {
        return ipc.ask('ADD_VISION_IMAGE', {
          dataUrl:       args.dataUrl,
          requireRename: true
        })
      })
    }

    case 'TIMEOUT': {
      // log('TIMEOUT', args.timeout, args.id)
      return delay(() => args.id, args.timeout)
    }

    default:
      return 'unknown'
  }
}

// The hub replays messages queued during init at markReady() — in finally, so
// a throwing init can never leave the panel's (or a content script's) message
// parked until the hub's 10 s failsafe.
const initIPC = async () => {
  try {
    await restoreIPC()
  } finally {
    initBgMessageHub().markReady()
  }
}

const restoreIPC = async () => {
  // First: every cache entry is stamped with the session it was created in, and
  // reads ignore the rest. Must happen before cleanup (which drops entries from
  // earlier sessions) and before bgInit accepts the first CONNECT (whose entry
  // has to carry the current session). A woken service worker finds the same id
  // and keeps its live entries — see ipc_cache.ts.
  await ensureIpcSessionId()

  // Same lifetime as the session id: the key content scripts sign their
  // window messages with, answered to CS_CHANNEL_KEY (ipc_bg_cs.js).
  await ensureChannelKey()

  const tabs = await getAllTabs()
  const tabIdDict = tabs.reduce((prev, cur) => {
    prev[cur.id] = true
    return prev
  }, {})

  const remainingTabIdDict = await getIpcCache().cleanup(tabIdDict)

  // Restore connection with existing pages, it's for cases when background turns inactive and then active again.
  // Awaited for the enabled entries: the message hub replays whatever arrived
  // during this init once markReady() runs (see initBgMessageHub in
  // ipc_bg_cs.js), and the replay is only useful after these listeners exist.
  // A disabled entry (status Off) is polled by get() for up to 2 s and must not
  // delay everyone else — it is restored in the background as before.
  const restore = (tabIdStr) => {
    const tabId = parseInt(tabIdStr)
    return getIpcCache().get(tabId).then(ipc => {
      ipc.onAsk(onRequest)
    }, () => {})
  }
  const entries = Object.keys(remainingTabIdDict)
  await Promise.all(entries.filter(id => remainingTabIdDict[id].status === 1).map(restore))
  entries.filter(id => remainingTabIdDict[id].status !== 1).forEach(restore)

  bgInit(async (tabId, cuid, ipc) => {
    if (!await getIpcCache().has(tabId, cuid)) {
      log('connect cs/sp ipc: tabId, cuid, ipc:>> ', tabId, cuid, ipc)
      getIpcCache().set(tabId, ipc, cuid)
      ipc.onAsk(onRequest)
    }
  }, getLogServiceForBg)
}

// Records "this profile just moved to a new version": badge + the flag that
// makes the next toolbar click open the what's new page (showUpgradePageIfNeeded).
// Deliberately does NOT open anything itself — an update lands while the user is
// mid-browse, or during a browser start, and neither is a moment to steal a tab.
//
// Idempotent, because two independent detectors call it (onInstalled and the
// version compare below) and on Chrome both fire for the same update.
const markUpgraded = () => {
  Ext.action.setBadgeText({ text: 'NEW' })
  Ext.action.setBadgeBackgroundColor({ color: '#4444FF' })

  // Say "not a fresh install" OUT LOUD. The install branch only ever writes
  // true, so without this the upgrade case is an ABSENT key, and isFreshInstall
  // has to infer it from showClassicMacros — a config value nothing else needs
  // any more. One explicit false here makes the flag authoritative in both
  // directions and leaves that inference as a genuine last resort.
  storage.get('config')
  .then(config => storage.set('config', {
    ...config,
    macroFreshInstall: false
  }))

  return Ext.storage.local.set({
    upgrade_not_viewed: 'not_viewed'
  })
}

// Gives a brand new profile its new-user defaults and opens the welcome page.
// Unlike an update, an install IS the user's own action, so opening the tab
// right away interrupts nothing.
//
// Note the write ordering: index.js restoreConfig() merges `...config` LAST, so
// everything set here survives the panel's first run — including the two flags
// it would otherwise have guessed wrong, since by then a config exists and its
// isExistingInstall check would call this profile an upgrade.
const markFreshInstall = () => {
  storage.get('config')
  .then(config => {
    return storage.set('config', {
      ...config,
      showTestCaseTab: false,
      // side panel lands on the AI Chat tab on its first open (the
      // flag is cleared there after use)
      openAiChatTabOnce: true,
      // The browser's own answer to "is this a new user?". restoreConfig
      // can only ask whether a config exists, which is true for any
      // reload of an unpacked extension — so it cannot tell a genuine
      // first install from an update, and the setup dialog was
      // recommending the upgrade path to brand new users.
      macroFreshInstall: true,
      showClassicMacros: false,
      // Same marker restoreConfig() stamps: this config was born at install,
      // not carried over from an earlier build. On Chrome this write races
      // initUpgradeDetectionByVersion's config read (onInstalled fires on the
      // same background start), and without the marker losing that race made
      // a brand-new profile look like a pre-marker upgrade — welcome page
      // PLUS the NEW badge / what's-new.
      configBornFresh: true
    })
  })

  return Ext.tabs.create({
    url: goUivUrl(config.urlAfterInstall, 'bg'),
    active: true
  })
}

const initOnInstalled = () => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    // re-set on every background start, so the version it carries is the one
    // the user actually uninstalls from rather than the one they installed
    Ext.runtime.setUninstallURL(goUivUrl(config.urlAfterUninstall, 'bg'))

    chrome.runtime.onInstalled.addListener(({ reason, previousVersion }) => {
      // * Why doesn't it fire in firefox?
      switch (reason) {
        case 'install': {
          return markFreshInstall()
        }

        case 'update': {
          return markUpgraded()
        }
      }
    })
  }
}

const LAST_SEEN_VERSION_KEY = 'last_seen_version'

// The other half of update detection, for the browsers onInstalled forgets.
// Firefox never fires runtime.onInstalled, so on Firefox the upgrade flag was
// never armed at all and the what's new page could not open however the icon
// click behaved. Comparing the manifest version against the last one we stored
// catches the same event from the other side, on every background start.
//
// Cheap enough to run on every MV3 service-worker wake: one storage read, and
// once the versions match it does nothing.
const initUpgradeDetectionByVersion = () => {
  if (typeof process === 'undefined' || process.env.NODE_ENV !== 'production') {
    return Promise.resolve()
  }

  const version = Ext.runtime.getManifest().version

  return Ext.storage.local.get(LAST_SEEN_VERSION_KEY)
  .then(obj => {
    const lastSeen = obj[LAST_SEEN_VERSION_KEY]

    // Nothing stored yet: either a brand new profile, or an existing user on
    // the first build that records the version. Telling those apart is what
    // decides between the welcome page and staying quiet — and it is only
    // possible here, before anything has had a chance to write a config.
    if (!lastSeen) {
      return Ext.storage.local.set({ [LAST_SEEN_VERSION_KEY]: version })
      .then(() => storage.get('config'))
      .then(existingConfig => {
        // A config WITHOUT the born-fresh marker means this profile ran a
        // pre-marker build before, so it is an upgrade — arm the badge and
        // the "what's new" page (opens on the next toolbar click) like any
        // other update; markUpgraded is idempotent, so Chrome reaching here
        // after onInstalled('update') already fired is harmless.
        // A config WITH configBornFresh is NOT an existing profile: two
        // install-time writes race this very read — on Firefox the sidebar
        // auto-opens at install (open_at_install) and restoreConfig() writes
        // a config; on Chrome markFreshInstall() from onInstalled('install')
        // does. Before the marker existed, losing either race misread a
        // brand-new profile as an upgrade (Firefox: welcome page silently
        // skipped; Chrome: what's-new armed on top of the welcome page).
        if (existingConfig && Object.keys(existingConfig).length > 0 && !existingConfig.configBornFresh) {
          return markUpgraded()
        }

        // Chrome/Edge already did this from onInstalled('install') — reaching
        // here too would open the welcome page twice.
        if (!Ext.isFirefox()) return

        log('fresh install detected by version seed (firefox)')
        return markFreshInstall()
      })
    }

    if (lastSeen === version) return

    log(`version changed: ${lastSeen} -> ${version}`)

    return Ext.storage.local.set({ [LAST_SEEN_VERSION_KEY]: version })
    .then(() => markUpgraded())
  })
  .catch(e => {
    log.warn(`could not check for a version change: ${e && e.message}`)
  })
}

// With service worker, this method could be called multiple times as background,
// must make sure that it only set those tabIds when it's in normal mode
// (not playing/recording/inspecting)
const initPlayTab = () => {
  return Promise.all([
    Ext.windows.getCurrent(),
    getState()
  ])
  .then(([window, state]) => { // *** this line has been fixed. Look for any unintended side effects ***    
    // console.log('state:>> ', state)
    // console.log('window:>> ', window)
    if (state.status !== C.APP_STATUS.NORMAL) {
      return false
    }

    return Ext.tabs.query({ active: true, windowId: window.id })
    .then(async (tabs) => {
      if (!tabs || !tabs.length)  return false
      if (tabs[0].id === state.tabIds.panel) return false

      log('in initPlayTab, set toPlay to', tabs[0])

      await updateState(state => ({
        ...state,
        tabIds: {
          ...state.tabIds,
          lastPlay: state.tabIds.toPlay,
          toPlay: tabs[0].id,
          firstPlay: tabs[0].id
        }
      }))

      return true
    })
  })
}

const initDownloadMan = () => {
  getDownloadMan().onCountDown(data => {
    getPanelTabIpc().then(panelIpc => {
      panelIpc.ask('TIMEOUT_STATUS', {
        ...data,
        type: 'download'
      })
    })
  })

  getDownloadMan().onDownloadComplete(downloadItem => {
    getPanelTabIpc().then(panelIpc => {
      panelIpc.ask('DOWNLOAD_COMPLETE', downloadItem)
    })
  })
  // a late arrival from an expired uiv.download arm (OPEN-ISSUES 30.8)
  getDownloadMan().onNote(note => {
    getPanelTabIpc().then(panelIpc => panelIpc.ask('ADD_LOG', note)).catch(() => {})
  })
}

const initProxyMan = () => {
  const onProxyChange = async (newProxy) => {
    const img = newProxy ? config.icons.inverted : config.icons.normal
    Ext.action.setIcon({ path: img })

    const state = await getState()

    if (state.tabIds.panel) {
      getPanelTabIpc()
      .then(ipc => ipc.ask('PROXY_UPDATE', { proxy: newProxy }))
      .catch(e => log.warn(e))
    }
  }

  getProxyManager().getProxy().then(onProxyChange)
  getProxyManager().onChange(onProxyChange)
}

// FIRST, and synchronously: the one runtime.onMessage listener Firefox persists
// across event-page termination (initBgMessageHub in ipc_bg_cs.js) — everything
// the panel and the content scripts send goes through it, queued until initIPC
// has restored the cached connections
initBgMessageHub()
bindDebuggerLifetimes(chrome.runtime, Ext.debugger, message => log.warn(message))
bindEvents()
connectWakeChannel() // MCP wake channel — no-op unless the bridge is enabled
initIPC()
initOnInstalled()
initUpgradeDetectionByVersion()
initPlayTab()
initDownloadMan()
initProxyMan()
getContextMenuService().destroyMenus()

self.clip = clipboard
