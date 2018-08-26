import Ext from '../common/web_extension'
import {
  until, delay, setIn, pick, splitIntoTwo, retry, uid,
  randomName, dataURItoBlob, getScreenDpi, dpiFromFileName, ensureExtName
} from '../common/utils'
import { bgInit } from '../common/ipc/ipc_bg_cs'
import * as C from '../common/constant'
import log from '../common/log'
import clipboard from '../common/clipboard'
import {
  saveScreen, saveFullScreen, captureScreenInSelection, scaleDataURI,
  captureFullScreen, captureScreen, captureScreenInSelectionSimple
} from '../common/capture_screenshot'
import storage from '../common/storage'
import { setFileInputFiles } from '../common/debugger'
import { getDownloadMan } from '../common/download_man'
import config from '../config'
import { getScreenshotMan } from '../common/screenshot_man'
import { searchImage } from '../common/imagesearch/adaptor.ts'
import { getVisionMan } from '../common/vision_man';
import { resizeViewportOfTab } from '../common/resize_window'
import { getIpcCache } from '../common/ipc/ipc_cache'

// Note: in Ubuntu, you have to take some delay after activating some tab, otherwise there are chances
// Chrome still think the panel is the window you want to take screenshot, and weird enough in Ubuntu,
// You can't take screenshot of tabs with 'chrome-extension://' schema, even if it's your own extension
const SCREENSHOT_DELAY = /Linux/i.test(window.navigator.userAgent) ? 200 : 0

const state = {
  status: C.APP_STATUS.NORMAL,
  tabIds: {
    lastInspect: null,
    lastRecord: null,
    toInspect: null,
    firstRecord: null,
    toRecord: null,
    lastPlay: null,
    firstPlay: null,
    toPlay: null,
    panel: null
  },
  pullback: false,
  // Note: heartBeatSecret = -1, means no heart beat available, and panel should not retry on heart beat lost
  heartBeatSecret: 0
}

const updateHeartBeatSecret = ({ disabled = false } = {}) => {
  if (disabled) {
    state.heartBeatSecret = -1
  } else {
    state.heartBeatSecret = (Math.max(0, state.heartBeatSecret) + 1) % 10000
  }
}

const createTab = (url) => {
  return Ext.tabs.create({ url, active: true })
}

const activateTab = (tabId, focusWindow) => {
  return Ext.tabs.get(tabId)
  .then(tab => {
    const p = focusWindow ? Ext.windows.update(tab.windowId, { focused: true })
                          : Promise.resolve()

    return p.then(() => Ext.tabs.update(tab.id, { active: true }))
    .then(() => tab)
  })
}

const getTab = (tabId) => {
  return Ext.tabs.get(tabId)
}

// Generate function to get ipc based on tabIdName and some error message
const genGetTabIpc = (tabIdName, purpose) => (timeout = 100, before = Infinity) => {
  const tabId = state.tabIds[tabIdName]

  if (!tabId) {
    return Promise.reject(new Error(`No tab for ${purpose} yet`))
  }

  return Ext.tabs.get(tabId)
  .then(tab => {
    if (!tab) {
      throw new Error(`The ${purpose} tab seems to be closed`)
    }

    return getIpcCache().get(tab.id, timeout, before)
    .catch(e => {
      throw new Error(`No ipc available for the ${purpose} tab`)
    })
  })
}

const getRecordTabIpc = genGetTabIpc('toRecord', 'recording')

const getPlayTabIpc   = genGetTabIpc('toPlay', 'playing commands')

const getPanelTabIpc  = genGetTabIpc('panel', 'dashboard')

// Get the current tab for play, if url provided, it will be loaded in the tab
const getPlayTab  = (url) => {
  // Note: update error message to be more user friendly. But the original message is kept as comment
  // const theError  = new Error('Either a played tab or a url must be provided to start playing')
  const theError  = new Error('No connection to browser tab')

  log('getPlayTab', url, state.tabIds.toPlay)

  const createOne = (url) => {
    if (!url) throw theError

    return createTab(url)
      .then(tab => {
        state.tabIds.lastPlay = state.tabIds.toPlay
        state.tabIds.toPlay = state.tabIds.firstPlay = tab.id
        return tab
      })
  }

  if (!state.tabIds.toPlay && !url) {
    throw theError
  }

  if (!state.tabIds.toPlay) {
    return createOne(url)
  }

  return getTab(state.tabIds.toPlay)
    .then(
      (tab) => {
        if (!url) {
          return tab
        }

        // Note: must disable ipcCache manually here, so that further messages
        // won't be sent the old ipc
        getIpcCache().disable(tab.id)

        return Ext.tabs.update(tab.id, { url })
      },
      ()  => createOne(url)
    )
}

const showPanelWindow = () => {
  return activateTab(state.tabIds.panel, true)
  .catch(() => {
    storage.get('config')
    .then(config => {
      config = config || {}
      return (config.size || {})[config.showSidebar ? 'with_sidebar' : 'standard']
    })
    .then(size => {
      size = size || {
        width: 850,
        height: 775
      }

      Ext.windows.create({
        type:   'popup',
        url:    Ext.extension.getURL('popup.html'),
        width:  size.width,
        height: size.height
      })
      .then(win => {
        if (!Ext.isFirefox()) return

        // Refer to https://bugzilla.mozilla.org/show_bug.cgi?id=1425829
        // Firefox New popup window appears blank until right-click
        return delay(() => {
          return Ext.windows.update(win.id, {
            width: size.width + 1,
            height: size.height + 1
          })
        }, 1000)
      })

      return true
    })
  })
}

const withPanelIpc = () => {
  return showPanelWindow()
  .then(() => until('panel tab id recorded', () => ({
    pass: state.tabIds.panel
  })))
  .then(() => delay(() => {}, 2000))
  .then(() => getPanelTabIpc(2000))
}

const showBadge = (options) => {
  const { clear, text, color, blink } = {
    clear: false,
    text: '',
    color: '#ff0000',
    blink: 0,
    ...(options || {})
  }

  if (clear) {
    return Ext.browserAction.setBadgeText({ text: '' })
  }

  Ext.browserAction.setBadgeBackgroundColor({ color })
  Ext.browserAction.setBadgeText({ text })

  if (blink) {
    setTimeout(() => {
      Ext.browserAction.getBadgeText({})
      .then(curText => {
        if (curText !== text) return false
        return Ext.browserAction.setBadgeText({ text: '' })
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
    if (tab.url.indexOf(Ext.extension.getURL('')) !== -1) return

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
  return Ext.tabs.get(tabId)
  .then(tab => {
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
        throw new Error(`isTabActiveAndFocused: unknown app status, '${state.status}'`)
    }
  })
  .catch(e => false)
}

const bindEvents = () => {
  Ext.browserAction.onClicked.addListener(() => {
    isUpgradeViewed()
    .then(isViewed => {
      if (isViewed) {
        return showPanelWindow()
      } else {
        Ext.browserAction.setBadgeText({ text: '' })
        Ext.storage.local.set({
          upgrade_not_viewed: ''
        })
        return Ext.tabs.create({
          url: config.urlAfterUpgrade
        })
      }
    })
  })

  Ext.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tab.active)  return

    isTabActiveAndFocused(tabId)
    .then(isFocused => {
      if (!isFocused) return
      return notifyPanelAboutActiveTab(tabId)
    })
  })

  Ext.windows.onFocusChanged.addListener((windowId) => {
    Ext.tabs.query({ windowId, active: true })
    .then(tabs => {
      if (tabs.length === 0) return

      getIpcCache().get(tabs[0].id, 100)
      .then(
        ipc => ipc.ask('TAB_ACTIVATED', {}),
        e => 'Comment: ingore this error'
      )
    })
  })

  // Note: set the activated tab as the one to play
  Ext.tabs.onActivated.addListener((activeInfo) => {
    if (activeInfo.tabId === state.tabIds.panel)  return

    getIpcCache().get(activeInfo.tabId, 100)
    .then(
      ipc => ipc.ask('TAB_ACTIVATED', {}),
      e => 'Comment: ingore this error'
    )

    notifyPanelAboutActiveTab(activeInfo.tabId)

    switch (state.status) {
      case C.APP_STATUS.NORMAL:
        // Note: In Firefox, without this delay of 100ms, `tab.url` will still be 'about:config'
        // so have to wait for the url to take effect
        setTimeout(() => {
          Ext.tabs.get(activeInfo.tabId)
          .then(tab => {
            if (tab.url.indexOf(Ext.extension.getURL('')) !== -1) return

            log('in tab activated, set toPlay to ', activeInfo)
            state.tabIds.lastPlay = state.tabIds.toPlay
            state.tabIds.toPlay = state.tabIds.firstPlay = activeInfo.tabId
          })
        }, 100)

        break

      case C.APP_STATUS.RECORDER: {
        // Note: three things to do when switch tab in recording
        // 1. set the new tab to RECORDING status,
        // 2. and the original one back to NORMAL status
        // 3. commit a `selectWindow` command
        //
        // Have to wait for the new tab establish connection with background
        getIpcCache().get(activeInfo.tabId, 5000)
        // Note: wait for 1 second, expecting commands from original page to be committed
        .then(ipc => delay(() => ipc, 1000))
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
        .then(() => {
          // Note: get window locator & update recording tab
          const oldTabId = state.tabIds.firstRecord
          const newTabId = activeInfo.tabId

          return Promise.all([
            Ext.tabs.get(oldTabId),
            Ext.tabs.get(newTabId)
          ])
          .then(([oldTab, newTab]) => {
            const result = []

            // update recording tab
            state.tabIds.toRecord = activeInfo.tabId

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
          .then(() => notifyRecordCommand(command))
        })
        .catch(e => {
          log.error(e.stack)
        })

        break
      }
    }
  })
}

// usage:
// 1. set tabId for inspector:  `setInspectorTabId(someTabId)`
// 2. clear tabId for inspector: `setInspectorTabId(null, true)`
const setInspectorTabId = (tabId, shouldRemove, noNotify) => {
  state.tabIds.lastInspect = state.tabIds.toInspect

  if (tabId) {
    state.tabIds.toInspect = tabId
    return Promise.resolve(true)
  } else if (shouldRemove) {
    if (state.tabIds.toInspect) {
      state.tabIds.toInspect = null

      if (noNotify) return Promise.resolve(true)

      return getIpcCache().get(state.tabIds.toInspect)
      .then(ipc => ipc.ask('STOP_INSPECTING'))
      .catch(e => log(e.stack))
    }
    return Promise.resolve(true)
  }
}

const startSendingTimeoutStatus = (timeout, type = 'wait') => {
  let past = 0

  if (state.timer)  clearInterval(state.timer)
  state.timer = setInterval(() => {
    past += 1000

    getPanelTabIpc().then(panelIpc => {
      panelIpc.ask('TIMEOUT_STATUS', {
        type,
        past,
        total: timeout
      })
    })

    if (past >= timeout) {
      clearInterval(state.timer)
    }
  }, 1000)

  return () => clearInterval(state.timer)
}

// Processor for all message background could receive
// All messages from panel starts with 'PANEL_'
// All messages from content script starts with 'CS_'
const onRequest = (cmd, args) => {
  if (cmd !== 'CS_ACTIVATE_ME') {
    log('onAsk', cmd, args)
  }

  switch (cmd) {
    // Mark the tab as panel.
    case 'I_AM_PANEL':
      state.tabIds.panel = args.sender.tab.id

      // Note: when the panel first open first, it could be marked as the tab to play
      // That's something we don't want to happen
      if (state.tabIds.toPlay === args.sender.tab.id) {
        log('I am panel, set toPlay to null')
        state.tabIds.toPlay = state.tabIds.firstPlay = state.tabIds.lastPlay
      }

      return true

    case 'PANEL_TIME_FOR_BACKUP':
      return isTimeToBackup().then(obj => obj.timeout)

    case 'PANEL_START_RECORDING':
      log('Start to record...')
      state.status = C.APP_STATUS.RECORDER
      toggleRecordingBadge(true)
      return true

    case 'PANEL_STOP_RECORDING':
      log('Stop recording...')

      getRecordTabIpc()
      .then(ipc => {
        ipc.ask('SET_STATUS', {
          status: C.CONTENT_SCRIPT_STATUS.NORMAL
        })
      })

      state.status = C.APP_STATUS.NORMAL
      state.tabIds.lastRecord   = state.tabIds.toRecord
      state.tabIds.toRecord     = null
      state.tabIds.firstRecord  = null

      toggleRecordingBadge(false)
      return true

    case 'PANEL_TRY_TO_RECORD_OPEN_COMMAND': {
      if (state.status !== C.APP_STATUS.RECORDER) {
        throw new Error('Not in recorder mode')
      }

      // Well, `getPlayTab` is actually 'get current active tab'
      return getPlayTab()
      .then(tab => {
        log('PANEL_TRY_TO_RECORD_OPEN_COMMAND', tab)

        if (!/^(https?:|file:)/.test(tab.url)) {
          throw new Error('Not a valid url to record as open command')
        }

        state.tabIds.toRecord = state.tabIds.firstRecord = tab.id

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
      state.status = C.APP_STATUS.INSPECTOR
      toggleInspectingBadge(true)
      return true

    case 'PANEL_STOP_INSPECTING':
      log('start to inspect...')
      state.status = C.APP_STATUS.NORMAL

      toggleInspectingBadge(false)
      return setInspectorTabId(null, true)

    case 'PANEL_START_PLAYING': {
      log('start to play...')
      state.status = C.APP_STATUS.PLAYER

      togglePlayingBadge(true)
      // Note: reset download manager to clear any previous downloads
      getDownloadMan().reset()

      if (state.timer) clearInterval(state.timer)

      return true
      // .catch(e => {
      //   togglePlayingBadge(false)
      //   throw e
      // })
    }

    case 'PANEL_HEART_BEAT': {
      return state.heartBeatSecret
    }

    case 'PANEL_RUN_COMMAND': {
      if (state.timer)  clearInterval(state.timer)

      const shouldWaitForDownloadAfterRun = (command) => {
        log('shouldWaitForDownloadAfterRun', command)
        if (command.cmd === 'click') return true
        return false
      }
      const checkHeartBeat = (timeout, before) => {
        updateHeartBeatSecret()

        return getPlayTabIpc(timeout, before)
        .then(ipc => ipc.ask('HEART_BEAT', { timeout, before }))
        .catch(e => {
          log.error('at least I catched it', e.message)
          throw new Error('heart beat error thrown')
        })
      }
      const shoudWaitForCommand = (command) => {
        log('shoudWaitForCommand', command)
        return /andWait/i.test(command.cmd) || command.cmd === 'open'
      }

      // Note: There are several versions of runCommandXXX here. One by one, they have a better tolerence of error
      // 1. runCommand:
      //      Run a command, and wait until we can confirm that command is completed (e.g.  xxxAndWait)
      //
      // 2. runCommandWithRetry:
      //      Enhance runCommand with retry mechanism, only retry when element is not found
      //
      // 3. runCommandWithClosureAndErrorProcess:
      //      Include `args` in closure, and take care of `errorIgnore`
      //
      // 4. runWithHeartBeat:
      //      Run a heart beat check along with `runCommandWithClosureAndErrorProcess`.
      //      Heart beat check requires cs Ipc must be created before heart beat check starts.
      //      With this, we can ensure the page is not closed or refreshed
      //
      // 5. runWithHeartBeatRetry:
      //      Run `runWithHeartBeat` with retry mechanism. only retry when it's a 'lost heart beat' error
      //      When closed/refresh is detected, it will try to send same command to that tab again.
      //

      const runCommand = (args, retryInfo) => {
        return getPlayTabIpc()
        .then(ipc => {
          // Note: each command keeps target page's status as PLAYING
          ipc.ask('SET_STATUS', { status: C.CONTENT_SCRIPT_STATUS.PLAYING })

          let gotHeartBeat = false

          const innerCheckHeartBeat = () => {
            // Note: ignore any exception when checking heart beat
            // possible exception: no tab for play, no ipc
            return checkHeartBeat()
            .then(
              () => { gotHeartBeat = true },
              e => { log.error(e); return null }
            )
          }

          // res format: { data, isIFrame }
          const wait = (res) => {
            const shouldWait      = shoudWaitForCommand(args.command)
            const shouldResetIpc  = !res.isIFrame && (/AndWait/i.test(args.command.cmd) ||
                                                      args.command.cmd === 'refresh')
            if (!shouldWait) return Promise.resolve(res.data)

            log('wait!!!!', res)
            const timeoutPageLoad   = ((res.data && res.data.extra && res.data.extra.timeoutPageLoad) || 60) * 1000
            const timeoutHeartbeat  = ((res.data && res.data.extra && res.data.extra.timeoutElement) || 10) * 1000

            // Note: for clickAndWait etc.,  must disable ipc to avoid
            // any further message (like heart beat) to be sent to the original ipc
            if (shouldResetIpc) {
              getIpcCache().disable(state.tabIds.toPlay)
            }

            // Note: put some delay here because there are cases when next command's
            // heart beat request is answered by previous page
            return delay(() => {}, 2000)
            // A standlone `checkHeartBeat to make sure we don't have to wait until's
            // first interval to pass the check
            .then(() => innerCheckHeartBeat())
            .then(() => {
              return until('player tab heart beat check', () => {
                innerCheckHeartBeat()

                return {
                  pass: gotHeartBeat,
                  result: true
                }
              }, 100, timeoutHeartbeat)
              .catch(e => {
                const { cmd }   = args.command
                const isAndWait = /AndWait/.test(cmd)

                if (isAndWait) {
                  const instead = cmd.replace('AndWait', '')
                  throw new Error(`'${cmd}' failed. No page load event detected after ${timeoutHeartbeat / 1000} seconds. Try '${instead}' instead.`)
                } else {
                  throw new Error(`${cmd}' failed. No page load event detected after ${timeoutHeartbeat / 1000} seconds.`)
                }
              })
            })
            // Note: must get the new ipc here.
            // The previous ipc is useless after a new page load
            .then(() => getPlayTabIpc())
            .then(ipc => {
              // Note: send timeout status to dashboard once we get the heart beat
              // and start to wait for dom ready
              const clear = startSendingTimeoutStatus(timeoutPageLoad)
              return ipc.ask('DOM_READY', {}, timeoutPageLoad)
                .then(
                  () => {
                    clear()
                    ipc.ask('HACK_ALERT', {})
                  },
                  () => {
                    clear()
                    throw new Error(`page load ${timeoutPageLoad / 1000} seconds time out`)
                  }
                )
            })
            .then(() => res.data)
          }

          // Note: clear timer whenever we execute a new command, and it's not a retry
          if (state.timer && retryInfo.retryCount === 0)  clearInterval(state.timer)

          // Note: -1 will disable ipc timeout for 'pause' command
          const ipcTimeout = (function () {
            switch (args.command.cmd) {
              case 'open':    return ((args.command.extra && args.command.extra.timeoutPageLoad) || 60) * 1000
              case 'pause':   return -1
              default:        return null
            }
          })()

          return ipc.ask('DOM_READY', {})
          .then(() => {
            return ipc.ask('RUN_COMMAND', {
              command: {
                ...args.command,
                extra: {
                  ...(args.command.extra || {}),
                  retryInfo
                }
              }
            }, ipcTimeout)
          })
          .then(wait)
        })
        .catch(e => {
          log.error('all catched by runCommand - ' + e.message)
          throw e
        })
      }

      const timeout = args.command.extra.timeoutElement * 1000
      const runCommandWithRetry = (...args) => {
        // Note: add timerSecret to ensure it won't clear timer that is not created by this function call
        const timerSecret = Math.random()
        state.timerSecret = timerSecret

        const fn = retry(runCommand, {
          timeout,
          shouldRetry: (e) => {
            log('runCommandWithRetry - shouldRetry', e.message)

            return e.message &&
                    (e.message.indexOf('timeout reached when looking for') !== -1 ||
                     e.message.indexOf('element is found but not visible yet') !== -1 ||
                     e.message.indexOf('IPC Promise has been destroyed') !== -1)
          },
          onFirstFail: (e) => {
            const title = e && e.message && e.message.indexOf('element is found but not visible yet') !== -1
                              ? 'Tag waiting' // All use Tag Waiting for now  // 'Visible waiting'
                              : 'Tag waiting'

            startSendingTimeoutStatus(timeout, title)
          },
          onFinal: (err, data) => {
            log('onFinal', err, data)
            if (state.timer && state.timerSecret === timerSecret)  clearInterval(state.timer)
          }
        })

        return fn(...args)
      }

      const runCommandWithClosureAndErrorProcess = () => {
        return runCommandWithRetry(args)
        .catch(e => {
          // Note: if variable !ERRORIGNORE is set to true,
          // it will just log errors instead of a stop of whole macro
          if (args.command.extra && args.command.extra.errorIgnore) {
            return {
              log: {
                error: e.message
              }
            }
          }

          throw e
        })
      }

      const runWithHeartBeat = () => {
        const infiniteCheckHeartBeat = (() => {
          const startTime = new Date().getTime()
          let stop = false

          const fn = () => {
            log('starting heart beat')
            // Note: do not check heart beat when
            // 1. it's a 'open' command, which is supposed to reconnect ipc
            // 2. it's going to download files, which will kind of reload page and reconnect ipc
            if (shoudWaitForCommand(args.command) ||
                getDownloadMan().hasPendingDownload()) {
              updateHeartBeatSecret({ disabled: true })
              return new Promise(() => {})
            }

            if (stop) return Promise.resolve()

            return checkHeartBeat(100, startTime)
            .then(
              () => delay(() => {}, 1000).then(fn),
              e => {
                log.error('lost heart beart!!', e.stack)
                throw new Error('lost heart beat when running command')
              }
            )
          }
          fn.stop = () => {
            log('stopping heart beat')
            stop = true
          }

          return fn
        })()

        return Promise.race([
          runCommandWithClosureAndErrorProcess()
            .then(data => {
              infiniteCheckHeartBeat.stop()
              return data
            })
            .catch(e => {
              infiniteCheckHeartBeat.stop()
              throw e
            }),
          infiniteCheckHeartBeat()
        ])
      }

      const runWithHeartBeatRetry = retry(runWithHeartBeat, {
        timeout,
        shouldRetry: (e) => {
          log('runWithHeartBeatRetry - shouldRetry', e.message)
          return e && e.message && e.message.indexOf('lost heart beat when running command') !== -1
        }
      })

      const runEternally = () => {
        return new Promise((resolve, reject) => {
          const p = runWithHeartBeatRetry().then(data => {
            if (shouldWaitForDownloadAfterRun(args.command)) {
              // Note: wait for download to either be create or completed
              return getDownloadMan().waitForDownloadIfAny()
              .then(() => data)
            }

            return data
          })
          .then(data => {
            // Note: use bg to set pageUrl, so that we can be sure that this `pageUrl` is 100% correct
            return Ext.tabs.get(state.tabIds.toPlay)
            .then(tab => ({ ...data, pageUrl: tab.url }))
            .catch(e => {
              log.error('Error in fetching play tab url')
              return data
            })
          })

          resolve(p)
        })
      }

      const prepare = () => {
        return getPlayTab()
        // Note: catch any error, and make it run 'getPlayTab(args.url)' instead
        .catch(e => ({ id: -1 }))
        .then(tab => {
          log('after first getPlayTab', tab)
          const openUrlInTab = () => {
            const { cmd, target } = args.command
            if (cmd !== 'open') throw new Error('no play tab found')

            return getPlayTab(target)
            .then(tab => ({ tab, hasOpenedUrl: true }))
          }

          return getIpcCache().get(tab.id, 100)
          .then(
            ipc => {
              // Note: test if the ipc is still active,
              // if it's not, try to open url as if that ipc doesn't exist at all
              // return ipc.ask('HEART_BEAT', {}, 500)
              // .then(() => ({ tab, hasOpenedUrl: false }))
              // .catch(openUrlInTab)
              return { tab, hasOpenedUrl: false }
            },
            e => {
              return openUrlInTab()
            }
          )
        })
        .then(({ tab, hasOpenedUrl }) => {
          // const p = args.shouldNotActivateTab ? Promise.resolve() : activateTab(tab.id, true)
          const p = Promise.resolve()

          // Note: wait for tab to confirm it has loaded
          return p
          .then(() => getIpcCache().get(tab.id, 6000 * 10))
          .then(ipc => {
            const p = !hasOpenedUrl ? Promise.resolve() : ipc.ask('MARK_NO_COMMANDS_YET', {})
            return p.then(() => ipc.ask('SET_STATUS', { status: C.CONTENT_SCRIPT_STATUS.PLAYING }))
          })
        })
      }

      return prepare()
      .then(runEternally)
      .catch(e => {
        log.error('catched by runEternally', e.stack)

        if (e && e.message && (
              e.message.indexOf('lost heart beat when running command') !== -1 ||
              e.message.indexOf('Could not establish connection') !== -1
            )) {
          return runEternally()
        }
        throw e
      })
    }

    case 'PANEL_STOP_PLAYING': {
      togglePlayingBadge(false)
      state.status = C.APP_STATUS.NORMAL

      // Note: reset download manager to clear any previous downloads
      getDownloadMan().reset()

      // Note: reset firstPlay to current toPlay when stopped playing
      // userful for playing loop (reset firstPlay after each loop)
      state.tabIds.firstPlay = state.tabIds.toPlay

      if (state.timer) clearInterval(state.timer)

      // Note: let cs know that it should exit playing mode
      return getIpcCache().get(state.tabIds.toPlay)
      .then(ipc => ipc.ask('SET_STATUS', { status: C.CONTENT_SCRIPT_STATUS.NORMAL }))
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
          throw new Error('No where to look for the dom')
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
      .then(list => {
        const foundedList = list.filter(x => x.result)

        if (foundedList.length === 0) {
          throw new Error('DOM not found')
        }

        const item = foundedList.length === 2
                        ? foundedList.find(item => item.type === args.lastOperation)
                        : foundedList[0]

        const tabId = state.tabIds[item.type === 'record' ? 'lastRecord' : 'toPlay']

        return activateTab(tabId, true)
        .then(() => item.ipc.ask('HIGHLIGHT_DOM', { locator: args.locator }))
      })
    }

    case 'PANEL_HIGHLIGHT_RECT': {
      return getPlayTabIpc()
      .then(ipc => ipc.ask('HIGHLIGHT_RECT', args))
    }

    case 'PANEL_HIGHLIGHT_RECTS': {
      return getPlayTabIpc()
      .then(ipc => ipc.ask('HIGHLIGHT_RECTS', args))
    }

    case 'PANEL_RESIZE_WINDOW': {
      if (!state.tabIds.panel) {
        throw new Error('Panel not available')
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
        throw new Error(`unknown type for updating badge, '${args.type}'`)
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
      closeAllWindows()
      return true
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

    case 'PANEL_BRING_PLAYING_WINDOW_TO_FOREGROUND': {
      return getPlayTab()
      .then(tab => activateTab(tab.id, true))
      .catch(e => showPanelWindow())
      .then(() => true)
    }

    case 'PANEL_RESIZE_PLAY_TAB': {
      return getPlayTab()
      .then(tab => resizeViewportOfTab(tab.id, args))
    }

    case 'PANEL_SELECT_AREA_ON_CURRENT_PAGE': {
      return getPlayTabIpc()
      .then(ipc => {
        activateTab(state.tabIds.toPlay, true)
        return ipc.ask('SELECT_SCREEN_AREA')
      })
      .catch(e => {
        log.error(e.stack)
        throw new Error('Not able to take screenshot on the current tab')
      })
    }

    case 'PANEL_CLEAR_VISION_RECTS_ON_PLAYING_PAGE': {
      return getPlayTabIpc()
      .then(ipc => ipc.ask('CLEAR_VISION_RECTS'))
    }

    case 'PANEL_SEARCH_VISION_ON_PLAYING_PAGE': {
      const { visionFileName, minSimilarity, searchArea = 'full', storedImageRect, command } = args
      const patternDpi      = dpiFromFileName(visionFileName) || 96
      const screenDpi       = getScreenDpi()
      const dpiScale        = patternDpi / screenDpi
      const man             = getVisionMan()
      const getPatternImage = (fileName) => {
        return man.exists(fileName)
        .then(existed => {
          if (!existed) throw new Error(`${command}: No input image found for file name '${fileName}'`)
          return man.readAsDataURL(fileName)
        })
      }
      const saveDataUrlToLastScreenshot = (dataUrl) => {
        return getScreenshotMan().overwrite(
          ensureExtName('.png', C.LAST_SCREENSHOT_FILE_NAME),
          dataURItoBlob(dataUrl)
        )
        .then(() => {
          getPanelTabIpc()
          .then(panelIpc => {
            return panelIpc.ask('RESTORE_SCREENSHOTS')
          })
        })
      }
      const getTargetImage  = () => {
        const capture = (ipc, tabId) => {
          switch (searchArea) {
            case 'viewport':
              return Promise.all([
                ipc.ask('SCREENSHOT_PAGE_INFO'),
                captureScreen(tabId)
              ])
              .then(([pageInfo, dataUrl]) => {
                saveDataUrlToLastScreenshot(dataUrl)

                return {
                  offset: {
                    x: pageInfo.originalX,
                    y: pageInfo.originalY
                  },
                  dataUrl
                }
              })

            case 'full': {
              return captureFullScreen(tabId, {
                startCapture: () => {
                  return ipc.ask('START_CAPTURE_FULL_SCREENSHOT', {})
                },
                endCapture: (pageInfo) => {
                  return ipc.ask('END_CAPTURE_FULL_SCREENSHOT', { pageInfo })
                },
                scrollPage: (offset) => {
                  return ipc.ask('SCROLL_PAGE', { offset })
                }
              })
              .then(dataUrl => {
                saveDataUrlToLastScreenshot(dataUrl)
                return { dataUrl, offset: { x: 0, y: 0 } }
              })
            }

            default: {
              if (/^element:/i.test(searchArea)) {
                if (!storedImageRect) {
                  throw new Error('!storedImageRect should not be empty')
                }

                const man = getScreenshotMan()
                const fileName = ensureExtName('.png', C.LAST_SCREENSHOT_FILE_NAME)

                return man.readAsDataURL(fileName)
                .then(dataUrl => ({
                  dataUrl,
                  offset: {
                    x: storedImageRect.x,
                    y: storedImageRect.y
                  }
                }))
              }

              throw new Error(`Unsupported searchArea '${searchArea}'`)
            }
          }
        }

        return getPlayTabIpc()
        .then(ipc => {
          const toPlayTabId = state.tabIds.toPlay

          log('getTargetImage tabIds', state.tabIds, toPlayTabId)

          return activateTab(toPlayTabId, true)
          .then(() => delay(() => {}, SCREENSHOT_DELAY))
          .then(() => capture(ipc, toPlayTabId))
          .then(obj => {
            return scaleDataURI(obj.dataUrl, dpiScale)
            .then(dataUrl => ({
              dataUrl,
              offset: obj.offset
            }))
          })
        })
      }

      if (minSimilarity < 0.1 || minSimilarity > 1.0) {
        throw new Error('confidence should be between 0.1 and 1.0')
      }

      return Promise.all([
        getPatternImage(visionFileName),
        getTargetImage()
      ])
      .then(([patternImageUrl, targetImageInfo]) => {
        const targetImageUrl  = targetImageInfo.dataUrl
        const offset          = targetImageInfo.offset

        return searchImage({
          patternImageUrl,
          targetImageUrl,
          minSimilarity,
          allowSizeVariation: true,
          scaleDownRatio:     dpiScale * window.devicePixelRatio,
          offsetX:            offset.x || 0,
          offsetY:            offset.y || 0
        })
      })
    }

    case 'PANEL_TIMEOUT_STATUS': {
      startSendingTimeoutStatus(args.timeout, args.type)
      return true
    }

    case 'PANEL_CLEAR_TIMEOUT_STATUS': {
      clearInterval(state.timer)
      return true
    }

    case 'CS_STORE_SCREENSHOT_IN_SELECTION': {
      const { rect, devicePixelRatio, fileName } = args
      const tabId = args.sender.tab.id

      return getIpcCache().get(tabId)
      .then(ipc => {
        return activateTab(state.tabIds.toPlay, true)
        .then(() => delay(() => {}, SCREENSHOT_DELAY))
        .then(() => captureScreenInSelection(state.tabIds.toPlay, { rect, devicePixelRatio }, {
          startCapture: () => {
            return ipc.ask('START_CAPTURE_FULL_SCREENSHOT', { hideScrollbar: false })
          },
          endCapture: (pageInfo) => {
            return ipc.ask('END_CAPTURE_FULL_SCREENSHOT', { pageInfo })
          },
          scrollPage: (offset) => {
            return ipc.ask('SCROLL_PAGE', { offset })
          }
        }))
        .then(dataUrl => {
          const man = getScreenshotMan()

          return man.overwrite(fileName, dataURItoBlob(dataUrl))
          .then(() => {
            getPanelTabIpc()
            .then(panelIpc => {
              return panelIpc.ask('RESTORE_SCREENSHOTS')
            })

            return fileName
          })
        })
      })
    }

    case 'CS_SCREEN_AREA_SELECTED': {
      const { rect, devicePixelRatio } = args
      const tabId = args.sender.tab.id

      log('CS_SCREEN_AREA_SELECTED', rect, devicePixelRatio, tabId)

      return captureScreenInSelectionSimple(args.sender.tab.id, { rect, devicePixelRatio })
      .then(dataUrl => {
        log('CS_SCREEN_AREA_SELECTED', 'got reuslt', dataUrl.length)
        return withPanelIpc()
        .then(panelIpc => {
          return panelIpc.ask('ADD_VISION_IMAGE', { dataUrl })
        })
      })
      .catch(e => {
        log.error(e.stack)
        throw e
      })
    }

    case 'CS_DONE_INSPECTING':
      log('done inspecting...')
      state.status              = C.APP_STATUS.NORMAL

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
      // log('CS_ACTIVATE_ME state.status', state.status)

      switch (state.status) {
        case C.APP_STATUS.INSPECTOR:
          if (!state.tabIds.toInspect) {
            state.tabIds.toInspect = args.sender.tab.id

            setTimeout(() => {
              getIpcCache().get(state.tabIds.toInspect)
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
        state.tabIds.toRecord = state.tabIds.firstRecord = args.sender.tab.id
      }

      if (state.tabIds.toRecord !== args.sender.tab.id) {
        return false
      }

      // Note: if receive a pullback cmd, we need to set the flag,
      // and strip Wait from any xxxAndWait command
      if (args.cmd === 'pullback') {
        state.pullback = true
        setTimeout(() => { state.pullback = false }, pullbackTimeout * 2)
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
      .then(panelIpc => {
        if (isFirst) {
          panelIpc.ask('RECORD_ADD_COMMAND', {
            cmd: 'open',
            target: args.url
          })
        }

        // Note: remove AndWait from commands if we got a pullback
        if (state.pullback) {
          args.cmd = args.cmd.replace('AndWait', '')
          state.pullback = false
        }

        return panelIpc.ask('RECORD_ADD_COMMAND', args)
      })
      .then(() => storage.get('config'))
      .then(config => {
        if (config.recordNotification && state.status === C.APP_STATUS.RECORDER) {
          notifyRecordCommand(args)
        }
      })
      .then(() => true)
    }

    case 'CS_CLOSE_OTHER_TABS': {
      const tabId = args.sender.tab.id

      return Ext.tabs.get(tabId)
      .then(tab => {
        return Ext.tabs.query({ windowId: tab.windowId })
        .then(tabs => tabs.filter(t => t.id !== tabId))
        .then(tabs => Ext.tabs.remove(tabs.map(t => t.id)))
      })
      .then(() => true)
    }

    case 'CS_SELECT_WINDOW': {
      const oldTablId       = args.sender.tab.id
      const [type, locator] = splitIntoTwo('=', args.target)

      if (!locator) {
        throw new Error(`invalid window locator, '${args.target}'`)
      }

      let pGetTabs

      switch (type.toLowerCase()) {
        case 'title':
          pGetTabs = Ext.tabs.query({ title: locator })
          break

        case 'tab': {
          if (/^\s*open\s*$/i.test(locator)) {
            pGetTabs = Ext.tabs.create({ url: args.value })
            .then(tab => [tab])
          } else {
            const offset = parseInt(locator, 10)

            if (isNaN(offset)) {
              throw new Error(`invalid tab offset, '${locator}'`)
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
          throw new Error(`window locator type '${type}' not supported`)
      }

      return pGetTabs
      .then(tabs => {
        if (tabs.length === 0) {
          throw new Error(`failed to find the tab with locator '${args.target}'`)
        }
        return tabs[0]
      })
      .then(tab => {
        log('selectWindow, got tab', tab)

        return getIpcCache().get(tab.id, 10000)
        .catch(e => {
          if (/tab=\s*open\s*/i.test(args.target)) {
            throw new Error('To open a new tab, a valid URL is needed')
          }
          throw e
        })
        .then(ipc => {
          log('selectWindow, got ipc', ipc)

          return ipc.ask('DOM_READY', {})
          .then(() => {
            ipc.ask('SET_STATUS', {
              status: C.CONTENT_SCRIPT_STATUS.PLAYING
            })

            return true
          })
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
        .then(() => {
          state.tabIds.lastPlay = state.tabIds.toPlay
          state.tabIds.toPlay = tab.id
          return activateTab(tab.id)
        })
      })
      .catch(e => {
        log.error(e.stack)
        throw e
      })
    }

    case 'CS_CAPTURE_SCREENSHOT':
      return activateTab(state.tabIds.toPlay, true)
      .then(() => delay(() => {}, SCREENSHOT_DELAY))
      .then(() => saveScreen(state.tabIds.toPlay, args.fileName))

    case 'CS_CAPTURE_FULL_SCREENSHOT':
      return activateTab(state.tabIds.toPlay, true)
      .then(() => delay(() => {}, SCREENSHOT_DELAY))
      .then(getPlayTabIpc)
      .then(ipc => {
        return saveFullScreen(state.tabIds.toPlay, args.fileName, {
          startCapture: () => {
            return ipc.ask('START_CAPTURE_FULL_SCREENSHOT', {})
          },
          endCapture: (pageInfo) => {
            return ipc.ask('END_CAPTURE_FULL_SCREENSHOT', { pageInfo })
          },
          scrollPage: (offset) => {
            return ipc.ask('SCROLL_PAGE', { offset })
          }
        })
      })

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
      return setFileInputFiles({
        tabId:    args.sender.tab.id,
        selector: args.selector,
        files:    args.files
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
      .then(config => {
        const isTestCase  = !!args.testCase
        const isTestSuite = !!args.testSuite
        const from        = (args.testCase && args.testCase.from) || (args.testSuite && args.testSuite.from)

        switch (from) {
          case 'bookmark': {
            if (!config.allowRunFromBookmark) {
              throw new Error('To run macro / test suite from bookmarks, enable it in kantu settings first')
            }
            break
          }

          case 'html': {
            if (!isTestSuite) {
              throw new Error('not allowed to run from local file')
            }

            const isFileSchema = /^file:\/\//.test(args.sender.url)
            const isHttpSchema = /^https?:\/\//.test(args.sender.url)

            if (isFileSchema && !config.allowRunFromFileSchema) {
              throw new Error('To run test suite from local file, enable it in kantu settings first')
            }

            if (isHttpSchema && !config.allowRunFromHttpSchema) {
              throw new Error('To run test suite from public website, enable it in kantu settings first')
            }

            break
          }

          default:
            throw new Error('unknown source not allowed')
        }

        return withPanelIpc()
        .then(panelIpc => {
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

    case 'CS_IMPORT_HTML_AND_INVOKE': {
      return storage.get('config')
      .then(config => {
        const isFileSchema = /^file:\/\//.test(args.sender.url)
        const isHttpSchema = /^https?:\/\//.test(args.sender.url)

        if (isFileSchema && !config.allowRunFromFileSchema) {
          throw new Error('To run macro from local file, enable it in kantu settings first')
        }

        if (isHttpSchema && !config.allowRunFromHttpSchema) {
          throw new Error('To run macro from public website, enable it in kantu settings first')
        }

        return withPanelIpc()
        .then(panelIpc => {
          return panelIpc.ask('IMPORT_HTML_AND_RUN', args)
        })
      })
    }

    case 'CS_ADD_LOG': {
      return getPanelTabIpc()
      .then(ipc => ipc.ask('ADD_LOG', args))
    }

    case 'SET_CLIPBOARD': {
      clipboard.set(args.value)
      return true
    }

    case 'GET_CLIPBOARD': {
      return clipboard.get()
    }

    default:
      return 'unknown'
  }
}

const initIPC = () => {
  bgInit((tabId, cuid, ipc) => {
    log('connect cs ipc', tabId, cuid, ipc)
    getIpcCache().set(tabId, ipc, cuid)
    ipc.onAsk(onRequest)
  })
}

const initOnInstalled = () => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    Ext.runtime.setUninstallURL(config.urlAfterUninstall)

    Ext.runtime.onInstalled.addListener(({ reason }) => {
      switch (reason) {
        case 'install':
          return Ext.tabs.create({
            url: config.urlAfterInstall
          })

        case 'update':
          Ext.browserAction.setBadgeText({ text: 'NEW' })
          Ext.browserAction.setBadgeBackgroundColor({ color: '#4444FF' })
          return Ext.storage.local.set({
            upgrade_not_viewed: 'not_viewed'
          })
      }
    })
  }
}

const initPlayTab = () => {
  return Ext.windows.getCurrent()
  .then(window => {
    return Ext.tabs.query({ active: true, windowId: window.id })
    .then(tabs => {
      if (!tabs || !tabs.length)  return false
      log('in initPlayTab, set toPlay to', tabs[0])
      state.tabIds.lastPlay = state.tabIds.toPlay
      state.tabIds.toPlay = tabs[0].id
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
}

bindEvents()
initIPC()
initOnInstalled()
initPlayTab()
initDownloadMan()

window.clip = clipboard
