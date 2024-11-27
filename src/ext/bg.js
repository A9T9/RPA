/* global browser */

import Ext from '../common/web_extension'
import {
  until, delay, setIn, pick, splitIntoTwo, retry, uid, and,
  ensureExtName, withTimeout
} from '../common/utils'
import { SIDEPANEL_PORT_NAME, bgInit } from '../common/ipc/ipc_bg_cs'
import * as C from '../common/constant'
import log from '../common/log'
import clipboard from '../common/clipboard'
import storage from '../common/storage'
import { setFileInputFiles } from '../common/debugger'
import { getDownloadMan } from '../common/download_man'
import config from '../config'
import { StorageManager, StorageStrategyType } from '../services/storage'
import { getXFile } from '../services/xmodules/xfile'
import { resizeViewportOfTab } from '../common/resize_window'
import { getIpcCache } from '../common/ipc/ipc_cache'
import { getTab, getCurrentTab, activateTab, updateUrlForTab, getAllTabs } from '../common/tab_utils'
import { runInDesktopScreenshotEditor } from '../desktop_screenshot_editor/service'
import { DesktopScreenshot } from '../desktop_screenshot_editor/types'
import { singletonGetterByKey, singletonGetter } from '../common/ts_utils';
import { setProxy, getProxyManager } from '../services/proxy'
import { LogService } from '../services/log'
import { getContextMenuService } from '../services/contextMenu'
import { getState, updateState } from './common/global_state'
import { genGetTabIpc, getActiveTab, getActiveTabId, getPlayTab, showPanelWindow, withPanelIpc } from './common/tab'
import { DownloadMan } from '../common/download_man'
import { SIDEPANEL_TAB_ID } from '../common/ipc/ipc_bg_cs'
import { checkIfSidePanelOpen } from '@/ext/common/sidepanel'
import interceptLog from '@/common/intercept_log'
import { getWindowSize } from '../common/resize_window'

const downloadMan = new DownloadMan();

interceptLog()

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

const bindEvents = () => {
  Ext.action.onClicked.addListener((tab) => {
    if(Ext.isFirefox()) {
      // if browser is firefox
      // placeholder for now
      if (showSidePanel) {
        // debugger;
        Ext.sidebarAction.open()
      } else {
        isUpgradeViewed()
        .then(isViewed => {
          if (isViewed) {
            return showPanelWindow().then(isWindowCreated => {
              if (isWindowCreated) {
                getLogServiceForBg().updateLogFileName()
                getLogServiceForBg().logWithTime('Ui.Vision started')
              }
            })
          } else {
            Ext.action.setBadgeText({ text: '' })
            Ext.storage.local.set({
              upgrade_not_viewed: ''
            })
            return Ext.tabs.create({
              url: config.urlAfterUpgrade
            })
          }
        })
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
        } else {
          closeSidePanel(tab.id).then(() => {
            isSidePanelOpen = false
          })
        }
      } else {
        closeSidePanel(tab.id).then(() => {
          isSidePanelOpen = false
        })
  
        isUpgradeViewed()
        .then(isViewed => {
          if (isViewed) {
            return showPanelWindow().then(isWindowCreated => {
              if (isWindowCreated) {
                getLogServiceForBg().updateLogFileName()
                getLogServiceForBg().logWithTime('Ui.Vision started')
              }
            })
          } else {
            Ext.action.setBadgeText({ text: '' })
            Ext.storage.local.set({
              upgrade_not_viewed: ''
            })
            return Ext.tabs.create({
              url: config.urlAfterUpgrade
            })
          }
        })
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
          if (tab && tab.id) {
            // This is the main purpose for this callback: Update tabIds.toPlay to new active tab
            updateState(setIn(['tabIds', 'toPlay'], tab.id))
          }
        })
      })
    }
    if (tabId === state.tabIds.panel && !state.closingAllWindows) {
      logKantuClosing()
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

  // it caused issues in chrome:
  // storage.addListener(([storage]) => {
  //   console.log('storage changed:>> ', storage)
  //   if (storage.key === 'config' && storage.newValue.showSidePanel !== storage.oldValue.showSidePanel) {
  //     showSidePanel = storage.newValue.showSidePanel
  //     ;getState().then((state) => {
  //       isSidePanelOpen = state.tabIds.panel === SIDEPANEL_TAB_ID
  //     })
  //   }
  // })

  const getCalculatedShowSidePanelValue =  (config) => {
    let value = false;
    if (config) {
      if (config.oneTimeShowSidePanel &&  [true, false].includes(config.oneTimeShowSidePanel)) {
        value = config.oneTimeShowSidePanel;
      } else {
        value = config.showSidePanel;
      }
    }
    return value;
  }

  if (Ext.isFirefox()) {
    storage.addListener(([storage]) => {
      if (storage.key === 'config' ) {
        console.log('config changed:>> ', storage)
        if (storage.newValue.oneTimeShowSidePanel !== storage.oldValue.oneTimeShowSidePanel &&  [true, false].includes(storage.newValue.oneTimeShowSidePanel)) {
          showSidePanel = storage.newValue.oneTimeShowSidePanel          
        } else {
          showSidePanel = storage.newValue.showSidePanel
          ;getState().then((state) => {
            isSidePanelOpen = state.tabIds.panel === SIDEPANEL_TAB_ID
          })
        }
      }
    })
  }

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

  // Note: set the activated tab as the one to play
  Ext.tabs.onActivated.addListener(async (activeInfo) => {
    manageKeepSWAlive()

    const [state, tab] = await Promise.all([
      getState(),
      Ext.tabs.get(activeInfo.tabId)
    ])

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

// Processor for all message background could receive
// All messages from panel starts with 'PANEL_'
// All messages from content script starts with 'CS_'
const onRequest = async (cmd, args) => {
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

    case 'PANEL_CAPTURE_VISIBLE_TAB': {
      return Ext.tabs.captureVisibleTab(args.windowId, args.options).catch(e => {
        console.log('captureVisibleTab e:>>', e)
        if(e == "Error: Missing activeTab permission"){
          throw new Error('Error E144: Screenshot permission issue. To fix, please reload extension.' + 
            'To do so, go to extension settings and turn the blue switch OFF and then ON again.')
        } 
        throw e;
      })
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
        id: 'verifyText',
        title: 'Verify Text',
        contexts: ['page', 'selection']
      }, {
        id: 'verifyTitle',
        title: 'Verify Title',
        contexts: ['page', 'selection']
      }, {
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
      // Note: reset download manager to clear any previous downloads
      getDownloadMan().reset()
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

      // Note: reset download manager to clear any previous downloads
      getDownloadMan().reset()

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

    case 'PANEL_DISABLE_DOWNLOAD_BAR': {
      // Ext.downloads.setShelfEnabled(false)
      Ext.downloads.setUiOptions({enabled: false})
      return delay(() => true, 1000)
    }

    case 'PANEL_ENABLE_DOWNLOAD_BAR': {
      // Ext.downloads.setShelfEnabled(true)
      Ext.downloads.setUiOptions({enabled: true})
      return delay(() => true, 1000)
    }

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
        return pTab.then(tab => {
          log('getCurrentTab - ', tab)

          const isValidTab    = !!tab && !!tab.id
          const isPanelTab    = isValidTab && tab.id === state.tabIds.panel

          return updateState(
            setIn(
              ['tabIds', 'toPlay'],
              (isValidTab && !isPanelTab) ? tab.id : null
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
        log('selectWindow, got tab', tab)

        return getIpcCache().domReadyGet(tab.id, 30000)
        .catch(e => {
          // args.target = 'tab=open' is a valid value, so this is commented out.
          // if (/tab=\s*open\s*/i.test(args.target)) {
          //   throw new Error('E211: To open a new tab, a valid URL is needed')
          // }
          throw new Error(`E225: DOM failed to be ready in 30sec.`) 
        })
        .then(ipc => {
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

          return activateTab(tab.id)
        })
      })
      .catch(e => {
        if (e.message.includes('DOM failed to be ready in')) {
          throw e
        } 
        //new Error(`failed to find the tab with locator '${args.target}'`)
         /*IN case when index 0 tab not found*/
        return Promise.all([
            Ext.windows.getCurrent()
          ])
          .then((window) => {  
        return Ext.tabs.query({ active: true, windowId: window.id })
        .then(async (tabs) => {
        if (!tabs || !tabs.length)  return false
          log('in initPlayTab, set toPlay to', tabs[0])
          const ctab  = tabs.filter(r => r.active === true && r.url.indexOf('chrome-extension://')==-1)
          const offset = parseInt(locator, 10);
          let wt = await checkTaIsPresent(ctab[0].index+offset,tabs[0].windowId);
          let tab = wt == "" ? ctab[0] : wt;
          if((tab.index  == 0 && offset == 0) || wt !=""){//when playtab index is 0
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
          }else{
           throw new Error(`E212: failed to find the tab with locator '${args.target}'`)
            //log.error(e.stack)
           //throw e
          }
          
      })
    })
    //throw new Error(`failed to find the tab with locator '${args.target}'`)
    
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

    case 'CS_ON_DOWNLOAD': {
      const p = getDownloadMan().prepareDownload(args.fileName, {
        wait:             !!args.wait,
        timeout:          args.timeout,
        timeoutForStart:  args.timeoutForStart
      })
      return true
    }

    case 'CS_INVOKE': {
      return storage.get('config')
      .then(async(config = {}) => {
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
        

        const from        = (args.testCase && args.testCase.from) || (args.testSuite && args.testSuite.from)

        switch (from) {
          case 'bookmark': {
            if (!config.allowRunFromBookmark) {
              throw new Error('[Message from RPA] Error E103: To run a macro or a test suite from bookmarks, you need to allow it in the Ui.Vision settings first')
            }
            break
          }

          case 'html': {
            const isFileSchema = /^file:\/\//.test(args.sender.url)
            const isHttpSchema = /^https?:\/\//.test(args.sender.url)

            if (isFileSchema && !config.allowRunFromFileSchema) {
              throw new Error('Error #103: To run test suite from local file, enable it in Ui.Vision settings first')
            }

            if (isHttpSchema && !config.allowRunFromHttpSchema) {
              throw new Error('Error #104: To run test suite from public website, enable it in Ui.Vision settings first')
            }

            break
          }

          default:
            throw new Error('E212: unknown source not allowed')
        }

        return withPanelIpc({
          params: { from }
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
      .then((config = {}) => {
        const isFileSchema = /^file:\/\//.test(args.sender.url)
        const isHttpSchema = /^https?:\/\//.test(args.sender.url)

        if (isFileSchema && !config.allowRunFromFileSchema) {
          throw new Error('Error #105: To run macro from local file, enable it in RPA settings first')
        }

        if (isHttpSchema && !config.allowRunFromHttpSchema) {
          throw new Error('Error #105: To run macro from public website, enable it in the RPA settings first')
        }

        return withPanelIpc({ params: { from } })
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
      withPanelIpc({
        params: { settings: true }
      })
      .then(ipc => {
        return ipc.ask('OPEN_SETTINGS')
      })
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

const initIPC = async () => {
  const tabs = await getAllTabs()
  const tabIdDict = tabs.reduce((prev, cur) => {
    prev[cur.id] = true
    return prev
  }, {})

  const remainingTabIdDict = await getIpcCache().cleanup(tabIdDict)

  // Restore connection with existing pages, it's for cases when background turns inactive and then active again
  Object.keys(remainingTabIdDict).forEach(tabIdStr => {
    const tabId = parseInt(tabIdStr)

    getIpcCache().get(tabId).then(ipc => {
      ipc.onAsk(onRequest)
    })
  })

  bgInit(async (tabId, cuid, ipc) => {
    if (!await getIpcCache().has(tabId, cuid)) {
      log('connect cs/sp ipc: tabId, cuid, ipc:>> ', tabId, cuid, ipc)
      getIpcCache().set(tabId, ipc, cuid)
      ipc.onAsk(onRequest)
    }
  }, getLogServiceForBg)
}

const initOnInstalled = () => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    Ext.runtime.setUninstallURL(config.urlAfterUninstall)

    chrome.runtime.onInstalled.addListener(({ reason, previousVersion }) => {
      // * Why doesn't it fire in firefox?
      switch (reason) {
        case 'install': {
          storage.get('config')
          .then(config => {
            return storage.set('config', {
              ...config,
              showTestCaseTab: false
            })
          })
          
          return Ext.tabs.create({
              url: config.urlAfterInstall
            })
        }

        case 'update': {
          Ext.action.setBadgeText({ text: 'NEW' })
          Ext.action.setBadgeBackgroundColor({ color: '#4444FF' })       
          return Ext.storage.local.set({
            upgrade_not_viewed: 'not_viewed'
          })
        }        
      }
    })
  }
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

bindEvents()
initIPC()
initOnInstalled()
initPlayTab()
initDownloadMan()
initProxyMan()
getContextMenuService().destroyMenus()

self.clip = clipboard
