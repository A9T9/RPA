import Ext from '../common/web_extension'
import { until, delay, setIn } from '../common/utils'
import { bgInit } from '../common/ipc/ipc_bg_cs'
import * as C from '../common/constant'

const state = {
  status: C.APP_STATUS.NORMAL,
  tabIds: {
    lastInspect: null,
    lastRecord: null,
    toInspect: null,
    toRecord: null,
    toPlay: null,
    panel: null
  },
  ipcCache: {}
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
        state.tabIds.toPlay = tab.id
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

const toggleRecordingBadge = (isRecording) => {
  Ext.browserAction.setBadgeBackgroundColor({ color: '#ff0000' })
  Ext.browserAction.setBadgeText({ text: isRecording ? 'R' : '' })
}

const toggleInspectingBadge = (isRecording) => {
  Ext.browserAction.setBadgeBackgroundColor({ color: '#ffa800' })
  Ext.browserAction.setBadgeText({ text: isRecording ? 'S' : '' })
}

const togglePlayingBadge = (isPlaying) => {
  Ext.browserAction.setBadgeBackgroundColor({ color: '#14c756' })
  Ext.browserAction.setBadgeText({ text: isPlaying ? 'P' : '' })
}

const bindEvents = () => {
  Ext.browserAction.onClicked.addListener(() => {
    activateTab(state.tabIds.panel)
    .catch(() => {
      window.open(
        Ext.extension.getURL('popup.html')
        , 'idePanel'
        , 'width=520,height=775,toolbar=no,resizable=no,scrollbars=no'
      )
    })
  })

  // Note: set the activated tab as the one to play
  Ext.tabs.onActivated.addListener((activeInfo) => {
    if (activeInfo.tabId === state.tabIds.panel)  return
    state.tabIds.toPlay = activeInfo.tabId
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
        .catch(e => console.log(e.stack))
    }
    return Promise.resolve(true)
  }
}

// Processor for all message background could receive
// All messages from panel starts with 'PANEL_'
// All messages from content script starts with 'CS_'
const onRequest = (cmd, args) => {
  console.log('onAsk', cmd, args)

  switch (cmd) {
    // Mark the tab as panel.
    case 'I_AM_PANEL':
      state.tabIds.panel = args.sender.tab.id

      // Note: when the panel first open first, it could be marked as the tab to play
      // That's something we don't want to happen
      if (state.tabIds.toPlay === args.sender.tab.id) {
        state.tabIds.toPlay = null
      }

      return true

    case 'PANEL_START_RECORDING':
      console.log('Start to record...')
      state.status = C.APP_STATUS.RECORDER
      toggleRecordingBadge(true)
      return true

    case 'PANEL_STOP_RECORDING':
      console.log('Stop recording...')
      state.status = C.APP_STATUS.NORMAL
      state.tabIds.lastRecord = state.tabIds.toRecord
      state.tabIds.toRecord   = null

      toggleRecordingBadge(false)
      return true

    case 'PANEL_START_INSPECTING':
      console.log('start to inspect...')
      state.status = C.APP_STATUS.INSPECTOR
      toggleInspectingBadge(true)
      return true

    case 'PANEL_STOP_INSPECTING':
      console.log('start to inspect...')
      state.status = C.APP_STATUS.NORMAL

      toggleInspectingBadge(false)
      return setInspectorTabId(null, true)

    case 'PANEL_START_PLAYING': {
      console.log('start to play...')
      state.status = C.APP_STATUS.PLAYER

      togglePlayingBadge(true)

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
        const startSendingTimeoutStatus = () => {
          let past = 0

          const timer = setInterval(() => {
            past += 1000

            getPanelTabIpc().then(panelIpc => {
              panelIpc.ask('TIMEOUT_STATUS', {
                type: 'wait',
                total: 60 * 1000,
                past
              })
            })
          }, 1000)

          return () => clearInterval(timer)
        }
        const wait = (res) => {
          const shouldWait      = /wait/i.test(args.command.cmd) || args.command.cmd === 'open'
          const shouldResetIpc  = /AndWait/i.test(args.command.cmd)
          if (!shouldWait) return Promise.resolve(res)

          // Note: for clickAndWait etc.,  must reset ipc to avoid
          // any further message (like heart beat) to be sent to the original ipc
          if (shouldResetIpc)   ipc.destroy()

          // Note: put some delay here because there are cases when next command's
          // heart beat request is answered by previous page
          return delay(() => {}, 2000)
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
            const clear = startSendingTimeoutStatus()
            return ipc.ask('DOM_READY', {})
              .then(clear, clear)
          })
          .then(() => res)
        }

        return ipc.ask('RUN_COMMAND', { command: args.command })
          .then(wait)
      })
    }

    case 'PANEL_STOP_PLAYING': {
      togglePlayingBadge(false)

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

    case 'CS_DONE_INSPECTING':
      console.log('done inspecting...')
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
      console.log('CS_ACTIVATE_ME state.status', state.status)

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
      let isFirst = false

      if (state.status !== C.APP_STATUS.RECORDER) {
        return false
      }

      if (!state.tabIds.toRecord) {
        isFirst = true
        state.tabIds.toRecord = args.sender.tab.id
      }

      if (state.tabIds.toRecord !== args.sender.tab.id) {
        return false
      }

      setTimeout(() => {
        const ipc = state.ipcCache[state.tabIds.toRecord]
        ipc.ask('SET_STATUS', {
          status: C.CONTENT_SCRIPT_STATUS.RECORDING
        })
      }, 0)

      return getPanelTabIpc()
      .then(panelIpc => {
        if (isFirst) {
          panelIpc.ask('RECORD_BASE_URL', { url: args.url })
        }

        return panelIpc.ask('RECORD_ADD_COMMAND', args)
      })
    }

    case 'CS_TIMEOUT_STATUS':
      return getPanelTabIpc()
      .then(ipc => ipc.ask('TIMEOUT_STATUS', args))

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

bindEvents()
initIPC()
