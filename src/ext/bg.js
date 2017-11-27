import Ext from '../common/web_extension'
import { until, delay, setIn, pick, splitIntoTwo } from '../common/utils'
import { bgInit } from '../common/ipc/ipc_bg_cs'
import * as C from '../common/constant'
import log from '../common/log'
import saveScreen from '../common/capture_screenshot'
import storage from '../common/storage'
import config from '../config'

const state = {
  status: C.APP_STATUS.NORMAL,
  tabIds: {
    lastInspect: null,
    lastRecord: null,
    toInspect: null,
    firstRecord: null,
    toRecord: null,
    firstPlay: null,
    toPlay: null,
    panel: null
  },
  ipcCache: {},
  pullback: false
}

const createTab = (url) => {
  return Ext.tabs.create({ url, active: true })
}

const activateTab = (tabId) => {
  return Ext.tabs.get(tabId)
  .then(tab => {
    return Ext.windows.update(tab.windowId, { focused: true })
    .then(() => {
      return Ext.tabs.update(tab.id, { active: true })
    })
    .then(() => tab)
  })
}

// Generate function to get ipc based on tabIdName and some error message
const genGetTabIpc = (tabIdName, purpose) => () => {
  const tabId = state.tabIds[tabIdName]

  if (!tabId) {
    return Promise.reject(new Error(`No tab for ${purpose} yet`))
  }

  return Ext.tabs.get(tabId)
  .then(tab => {
    if (!tab) {
      throw new Error(`The ${purpose} tab seems to be closed`)
    }

    const ipc = state.ipcCache[tab.id]

    if (!ipc) {
      throw new Error(`No ipc available for the ${purpose} tab`)
    }

    return ipc
  })
}

const getRecordTabIpc = genGetTabIpc('toRecord', 'recording')

const getPlayTabIpc   = genGetTabIpc('toPlay', 'playing commands')

const getPanelTabIpc  = genGetTabIpc('panel', 'dashboard')

// Get the current tab for play, if url provided, it will be loaded in the tab
const getPlayTab  = (url) => {
  const theError  = new Error('Either a played tab or a url must be provided to start playing')
  const createOne = (url) => {
    if (!url) throw theError

    return createTab(url)
      .then(tab => {
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

  return activateTab(state.tabIds.toPlay)
    .then(
      (tab) => {
        if (!url) {
          return tab
        }

        // Note: must clear ipcCache manually here, so that further messages
        // won't be sent the old ipc
        state.ipcCache[tab.id] = null
        return Ext.tabs.update(tab.id, { url })
      },
      ()  => createOne(url)
    )
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
  Ext.notifications.create({
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
}

const bindEvents = () => {
  Ext.browserAction.onClicked.addListener(() => {
    isUpgradeViewed()
    .then(isViewed => {
      if (isViewed) {
        return activateTab(state.tabIds.panel)
        .catch(() => {
          storage.get('config')
          .then(config => {
            config = config || {}
            return (config.size || {})[config.showSidebar ? 'with_sidebar' : 'standard']
          })
          .then(size => {
            size = size || {
              width: 520,
              height: 775
            }

            window.open(
              Ext.extension.getURL('popup.html')
              , 'idePanel'
              , `width=${size.width},height=${size.height},toolbar=no,resizable=no,scrollbars=no`
            )

            return true
          })
        })
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

  // Note: set the activated tab as the one to play
  Ext.tabs.onActivated.addListener((activeInfo) => {
    if (activeInfo.tabId === state.tabIds.panel)  return

    switch (state.status) {
      case C.APP_STATUS.NORMAL:
        Ext.tabs.get(activeInfo.tabId)
        .then(tab => {
          if (tab.url.indexOf(Ext.extension.getURL('')) === -1) {
            state.tabIds.toPlay = state.tabIds.firstPlay = activeInfo.tabId
          }
        })
        break

      case C.APP_STATUS.RECORDER: {
        // Note: three things to do when switch tab in recording
        // 1. set the new tab to RECORDING status,
        // 2. and the original one back to NORMAL status
        // 3. commit a `selectWindow` command
        //
        // Have to wait for the new tab establish connection with background
        until('new tab creates ipc', () => {
          return {
            pass: state.ipcCache[activeInfo.tabId],
            result: state.ipcCache[activeInfo.tabId]
          }
        })
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

      return state.ipcCache[state.tabIds.toInspect].ask('STOP_INSPECTING')
        .catch(e => log(e.stack))
    }
    return Promise.resolve(true)
  }
}

// Processor for all message background could receive
// All messages from panel starts with 'PANEL_'
// All messages from content script starts with 'CS_'
const onRequest = (cmd, args) => {
  log('onAsk', cmd, args)

  switch (cmd) {
    // Mark the tab as panel.
    case 'I_AM_PANEL':
      state.tabIds.panel = args.sender.tab.id

      // Note: when the panel first open first, it could be marked as the tab to play
      // That's something we don't want to happen
      if (state.tabIds.toPlay === args.sender.tab.id) {
        state.tabIds.toPlay = state.tabIds.firstPlay = null
      }

      return true

    case 'PANEL_START_RECORDING':
      log('Start to record...')
      state.status = C.APP_STATUS.RECORDER
      toggleRecordingBadge(true)
      return true

    case 'PANEL_STOP_RECORDING':
      log('Stop recording...')
      state.status = C.APP_STATUS.NORMAL
      state.tabIds.lastRecord   = state.tabIds.toRecord
      state.tabIds.toRecord     = null
      state.tabIds.firstRecord  = null

      toggleRecordingBadge(false)
      return true

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

      if (state.timer) clearInterval(state.timer)

      return getPlayTab(args.url)
        .then(tab => {
          // Note: wait for tab to confirm it has loaded
          return until('ipc of tab to play', () => {
            return {
              pass: !!state.ipcCache[tab.id],
              result: state.ipcCache[tab.id]
            }
          }, 1000, 6000 * 10)
          .then(ipc => {
            return ipc.ask('SET_STATUS', { status: C.CONTENT_SCRIPT_STATUS.PLAYING })
          })
        })
        .catch(e => {
          togglePlayingBadge(false)
          throw e
        })
    }

    case 'PANEL_RUN_COMMAND': {
      const runCommand = (args, retryInfo) => {
        return getPlayTabIpc()
        .then(ipc => {
          let gotHeartBeat = false

          const checkHeartBeat = () => {
            // Note: ignore any exception when checking heart beat
            // possible exception: no tab for play, no ipc
            return getPlayTabIpc()
              .then(ipc => ipc.ask('HEART_BEAT', {}))
              .then(
                () => { gotHeartBeat = true },
                () => { return null }
              )
          }
          const startSendingTimeoutStatus = (timeout) => {
            let past = 0

            state.timer = setInterval(() => {
              past += 1000

              getPanelTabIpc().then(panelIpc => {
                panelIpc.ask('TIMEOUT_STATUS', {
                  type: 'wait',
                  total: timeout,
                  past
                })
              })
            }, 1000)

            return () => clearInterval(state.timer)
          }
          // res format: { data, isIFrame }
          const wait = (res) => {
            const shouldWait      = /wait/i.test(args.command.cmd) || args.command.cmd === 'open'
            const shouldResetIpc  = !res.isIFrame && (/AndWait/i.test(args.command.cmd) ||
                                                      args.command.cmd === 'refresh')
            if (!shouldWait) return Promise.resolve(res.data)

            log('wait!!!!', res)
            const timeoutPageLoad = ((res.data && res.data.extra && res.data.extra.timeoutPageLoad) || 60) * 1000

            // Note: for clickAndWait etc.,  must reset ipc to avoid
            // any further message (like heart beat) to be sent to the original ipc
            if (shouldResetIpc)   ipc.destroy()

            // Note: put some delay here because there are cases when next command's
            // heart beat request is answered by previous page
            return delay(() => {}, 2000)
            // A standlone `checkHeartBeat to make sure we don't have to wait until's 
            // first interval to pass the check
            .then(() => checkHeartBeat())
            .then(() => {
              return until('player tab heart beat check', () => {
                checkHeartBeat()

                return {
                  pass: gotHeartBeat,
                  result: true
                }
              }, 100, 1000 * 10)
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

          return ipc.ask('DOM_READY', {})
          .then(() => ipc.ask('RUN_COMMAND', {
            command: {
              ...args.command,
              extra: {
                ...(args.command.extra || {}),
                retryInfo
              }
            }
          }))
          .then(wait)
        })
      }

      const retry = (fn, options) => (...args) => {
        const { timeout, onFirstFail, onFinal, shouldRetry, retryInterval } = {
          timeout: 5000,
          retryInterval: 1000,
          onFirstFail:  () => {},
          onFinal:      () => {},
          shouldRetry:  () => false,
          ...options
        }
        const wrappedOnFinal = (...args) => {
          if (timerToClear) {
            clearTimeout(timerToClear)
          }

          return onFinal(...args)
        }

        let retryCount    = 0
        let lastError     = null
        let timerToClear  = null

        const onError = e => {
          if (!shouldRetry(e)) {
            wrappedOnFinal(e)
            throw e
          }
          lastError = e

          return new Promise((resolve, reject) => {
            if (retryCount++ === 0) {
              onFirstFail(...args)
              timerToClear = setTimeout(() => {
                wrappedOnFinal(lastError)
                reject(lastError)
              }, timeout)
            }

            delay(run, retryInterval)
            .then(resolve, onError)
          })
        }

        const run = () => {
          return fn(...args, { retryCount, retryInterval }).catch(onError)
        }

        return run()
        .then((result) => {
          wrappedOnFinal(null, result)
          return result
        })
      }

      let timer     = null
      const timeout = args.command.extra.timeoutElement * 1000

      const runCommandWithRetry = retry(runCommand, {
        timeout,
        shouldRetry: (e) => {
          return e.message && e.message.indexOf('time out when looking for') !== -1
        },
        onFirstFail: () => {
          let past  = 0
          state.timer = setInterval(() => {
            past += 1000

            getPanelTabIpc()
            .then(ipc => {
              ipc.ask('TIMEOUT_STATUS', {
                type: 'Tag waiting',
                total: timeout,
                past
              })

              if (past >= timeout) {
                clearInterval(state.timer)
              }
            })
          }, 1000)
        },
        onFinal: (err, data) => {
          log('onFinal', err, data)
          if (state.timer)  clearInterval(state.timer)
        }
      })

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

    case 'PANEL_STOP_PLAYING': {
      togglePlayingBadge(false)
      state.status = C.APP_STATUS.NORMAL

      // Note: reset firstPlay to current toPlay when stopped playing
      // userful for playing loop (reset firstPlay after each loop)
      state.tabIds.firstPlay = state.tabIds.toPlay

      if (state.timer) clearInterval(state.timer)

      // Note: let cs know that it should exit playing mode
      const ipc = state.ipcCache[state.tabIds.toPlay]
      return ipc.ask('SET_STATUS', { status: C.CONTENT_SCRIPT_STATUS.NORMAL })
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

        return activateTab(tabId)
        .then(() => item.ipc.ask('HIGHLIGHT_DOM', { locator: args.locator }))
      })
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

    case 'CS_DONE_INSPECTING':
      log('done inspecting...')
      state.status              = C.APP_STATUS.NORMAL

      toggleInspectingBadge(false)
      setInspectorTabId(null, true, true)
      activateTab(state.tabIds.panel)

      return getPanelTabIpc()
      .then(panelIpc => {
        return panelIpc.ask('INSPECT_RESULT', {
          xpath: args.xpath
        })
      })

    // It's used for inspecting. The first tab which sends a CS_ACTIVATE_ME event
    // on mouse over event will be the one for us to inspect
    case 'CS_ACTIVATE_ME':
      log('CS_ACTIVATE_ME state.status', state.status)

      switch (state.status) {
        case C.APP_STATUS.INSPECTOR:
          if (!state.tabIds.toInspect) {
            state.tabIds.toInspect = args.sender.tab.id

            setTimeout(() => {
              const ipc = state.ipcCache[state.tabIds.toInspect]
              ipc.ask('SET_STATUS', {
                status: C.CONTENT_SCRIPT_STATUS.INSPECTING
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
        const ipc = state.ipcCache[state.tabIds.toRecord]
        ipc.ask('SET_STATUS', {
          status: C.CONTENT_SCRIPT_STATUS.RECORDING
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
        if (config.recordNotification) {
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

      let pQueryObj

      switch (type.toLowerCase()) {
        case 'title':
          pQueryObj = Promise.resolve({ title: locator })
          break

        case 'tab': {
          const offset = parseInt(locator, 10)

          if (isNaN(offset)) {
            throw new Error(`invalid tab offset, '${locator}'`)
          }

          pQueryObj = Ext.tabs.get(state.tabIds.firstPlay)
            .then(tab => ({
              windowId: tab.windowId,
              index: tab.index + offset
            }))

          break
        }

        default:
          throw new Error(`window locator type '${type}' not supported`)
      }

      return pQueryObj
      .then(queryObj => Ext.tabs.query(queryObj))
      .then(tabs => {
        if (tabs.length === 0) {
          throw new Error(`failed to find the tab with locator '${args.target}'`)
        }
        return tabs[0]
      })
      .then(tab => {
        log('selectWindow, got tab', tab)

        return until('new tab creates ipc', () => {
          return {
            pass: state.ipcCache[tab.id],
            result: state.ipcCache[tab.id]
          }
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

          state.ipcCache[oldTablId].ask('SET_STATUS', {
            status: C.CONTENT_SCRIPT_STATUS.NORMAL
          })
        })
        .then(() => {
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
      return activateTab(state.tabIds.toPlay)
      .then(saveScreen)

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

    default:
      return 'unknown'
  }
}

const initIPC = () => {
  bgInit((tabId, ipc) => {
    state.ipcCache[tabId] = ipc
    ipc.onAsk(onRequest)
  })
}

const initOnInstalled = () => {
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

const initPlayTab = () => {
  return Ext.windows.getCurrent()
  .then(window => {
    return Ext.tabs.query({ active: true, windowId: window.id })
    .then(tabs => {
      console.log('tabs', tabs)
      if (!tabs || !tabs.length)  return false
      state.tabIds.toPlay = tabs[0].id
      return true
    })
  })
}

bindEvents()
initIPC()
initOnInstalled()
initPlayTab()
