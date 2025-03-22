import { isFirefox } from '@/common/dom_utils'
import { getState, updateState, ExtensionState } from '../common/global_state'
import { Command } from '@/services/player/macro'
import Ext from '@/common/web_extension'
import log from '@/common/log'
import ipc from '@/common/ipc/ipc_cs'
import * as C from '@/common/constant'
import { delay, retry } from '@/common/ts_utils'
import { clearTimerForTimeoutStatus, startSendingTimeoutStatus } from './timeout_counter'
import { withTimeout } from '@/common/utils'
import { getPlayTab, getPlayTabOpenB } from '../common/tab'

// Note: There are several versions of runCommandXXX here. One by one, they have a better tolerence of error
// 1. sendRunCommand:
//      Run a command, and wait until we can confirm that command is completed (e.g.  xxxAndWait)
//
// 2. runCommandWithRetry:
//      Enhance sendRunCommand with retry mechanism, only retry when element is not found
//
// 3. runCommandWithClosureAndErrorProcess:
//      Include `args` in closure, and take care of `errorIgnore`
//
// 4. runWithHeartBeat:
//      Run a heart beat check along with `runCommandWithClosureAndErrorProcess`.
//      Heart beat check requires cs Ipc must be created before heart beat check starts.
//      With this, we can ensure the page is not closed or refreshed
//
// 5. runWithRetryOnLostHeartBeat:
//      Run `runWithHeartBeat` with retry mechanism. only retry when it's a 'lost heart beat' error
//      When closed/refresh is detected, it will try to send same command to that tab again.

export async function runCommandInPlayTab(command: Command): Promise<RunCommandResult> {
  log('2. runCommandInPlayTab:>> command:', command)
  clearTimerForTimeoutStatus()

  const superFast = (command.extra?.superFast && !['open'].includes(command.cmd)) || false

  // Note: `disableHeartBeat` is only set to true when current tab will
  // be closed ("reload tab" / "change url" excluded).
  // For exmaple `selectWindow tab=close`
  // TODO: maybe omit it?? it takes 15ms.
  if (!superFast) {
    await updateState({ disableHeartBeat: false })
  }

  // TODO: reduce time here or Omit it??. it takes 100ms
  // **Solution: prepare the tab only once in the beginning of the macro
  const shouldSkipCommandRun = superFast ? false : await preparePlayTab(command)
  console.log('shouldSkipCommandRun:>>', shouldSkipCommandRun, command)

  // fix here:
  //|| command.cmd !== 'open'

  if (command.cmd === 'open') {
    console.log("shouldSkipCommandRun:>> command.cmd === 'open'")

    const timeoutPageLoad = getTimeoutPageLoad(command)

    const promise1 = callPlayTab({
      command: 'DOM_READY',
      args: {},
      ipcCallTimeout: timeoutPageLoad
    })

    const promise2 = callPlayTab({
      command: 'HACK_ALERT',
      args: {},
      ipcCallTimeout: C.CS_IPC_TIMEOUT
    })

    await Promise.all([promise1, promise2]).then(() => {})
  }

  if (shouldSkipCommandRun) {
    return {}
  }

  try {
    return await runWithRetryOnLostHeartBeat(command)
  } catch (err) {
    const e = err as Error
    log.error('catched in runCommandInPlayTab', e.stack)

    if (
      e &&
      e.message &&
      (e.message.indexOf('lost heart beat when running command') !== -1 || e.message.indexOf('Could not establish connection') !== -1)
    ) {
      return await runWithRetryOnLostHeartBeat(command)
    }

    return Promise.reject(e)
  }
}

function updateHeartBeatSecret(options?: { disabled?: boolean }): Promise<void> {
  if (options?.disabled) {
    return updateState({ heartBeatSecret: -1 })
  } else {
    return updateState((state) => {
      const oldHeartBeatSecret = state.heartBeatSecret || 0

      return {
        ...state,
        heartBeatSecret: (Math.max(0, oldHeartBeatSecret) + 1) % 10000
      }
    })
  }
}

type PlayTabIPCParams = {
  tabIpcTimeout?: number
  tabIpcNoLaterThan?: number
  ipcCallTimeout?: number
  command: string
  args: any
}

function callPlayTab<T = any>(params: PlayTabIPCParams): Promise<T> {
  const defaultTimeout = 100
  // Default expired at is infinity, but to make it easy to pass it via ipc,
  // use the double of current timestamp
  const defaultNoLaterThan = Date.now() * 2
  const defaultIpcCallTimeout = -1

  const ipcTimeout = params.tabIpcTimeout ?? defaultTimeout
  const ipcNoLaterThan = params.tabIpcNoLaterThan ?? defaultNoLaterThan
  const ipcCallTimeout = params.ipcCallTimeout ?? defaultIpcCallTimeout

  return ipc.ask(
    'PANEL_CALL_PLAY_TAB',
    {
      ipcTimeout,
      ipcNoLaterThan,
      payload: {
        command: params.command,
        args: params.args
      }
    },
    ipcCallTimeout
  )
}

type CheckHeartBeatResponse = {
  secret: string
}

async function checkHeartBeat(tabIpcTimeout?: number, tabIpcExpiredAt?: number): Promise<CheckHeartBeatResponse> {
  const disableHeartBeat = await getState('disableHeartBeat')

  if (disableHeartBeat) {
    return { secret: 'heart_beat_disabled' }
  }

  await updateHeartBeatSecret()

  return callPlayTab<CheckHeartBeatResponse>({
    tabIpcTimeout,
    tabIpcNoLaterThan: tabIpcExpiredAt,
    command: 'HEART_BEAT',
    args: {}
  }).catch((e) => {
    log.error('at least I catched it', e.message)
    throw new Error('heart beat error thrown')
  })
}

function shouldWaitForDownloadAfterRun(command: Command): boolean {
  // log('shouldWaitForDownloadAfterRun', command)
  return command.cmd === 'click'
}

function shouldWaitForCommand(command: Command): boolean {
  log('shouldWaitForCommand:>>', command)
  return /andWait/i.test(command.cmd) || ['open', 'refresh'].indexOf(command.cmd) !== -1
}

function getCommandTimeout(command: Command): number {
  const defaultTimeout = command.extra.timeoutElement * 1000

  switch (command.cmd) {
    case 'waitForElementVisible':
    case 'waitForElementNotVisible':
    case 'waitForElementPresent':
    case 'waitForElementNotPresent': {
      const timeout = parseInt(command.value, 10)
      return !isNaN(timeout) ? timeout : defaultTimeout
    }

    default:
      return defaultTimeout
  }
}

// Note: -1 will disable ipc timeout for 'pause', and 'onDownload' command
function getIpcTimeout(command: Command): number {
  const pageLoadTimeout = (command?.extra?.timeoutPageLoad || 60) * 1000

  switch (command.cmd) {
    case 'open':
    case 'openBrowser':
    case 'clickAndWait':
    case 'selectAndWait':
      return pageLoadTimeout

    case 'selectWindow': {
      const target = command.target
      const isTabOpen = (target && target.toUpperCase()) === 'TAB=OPEN'

      return isTabOpen ? pageLoadTimeout : getCommandTimeout(command)
    }

    case 'pause':
    case 'onDownload':
    case 'captureEntirePageScreenshot':
      return -1

    default:
      return getCommandTimeout(command)
  }
}

function getTimeoutPageLoad(command: Command): number {
  return (command?.extra?.timeoutPageLoad || 60) * 1000
}

function withPageLoadCheck<T>(command: Command, timeoutPageLoad: number, promiseFunc: () => Promise<T>): Promise<T> {
  const shouldWait = shouldWaitForCommand(command)
  console.log('shouldWait:>>', shouldWait)

  if (!shouldWait) {
    return promiseFunc()
  }

  // Note: send timeout status to dashboard once "xxxWait" and "open" returns
  const clear = startSendingTimeoutStatus(timeoutPageLoad)

  return Promise.race([
    promiseFunc().then(
      (data) => {
        clear()
        return data
      },
      (e) => {
        clear()
        throw e
      }
    ),
    delay(() => {
      throw new Error(`Error #230: Page load ${timeoutPageLoad / 1000} seconds time out`)
    }, timeoutPageLoad)
  ])
}

type RunCommandResult = {
  pageUrl?: string
  vars?: Record<string, unknown>
  log?: {
    info?: string
    warning?: string
    error?: string
    options?: {
      notification?: boolean
      noStack?: boolean
    }
  }
  screenshot?: {
    name: string
  }
  extra?: Record<string, unknown>
}

type RunCommandResponse<T = any> = {
  data: RunCommandResult
  isIFrame: boolean
}

function waitForCommandToComplete(command: Command, res: RunCommandResponse): Promise<void> {
  const timeoutPageLoad = getTimeoutPageLoad(command)
  const timeoutHeartbeat = ((res?.data?.extra?.timeoutElement as number) || 10) * 1000
  const shouldWait = shouldWaitForCommand(command)

  // console.log('shouldWait=:>>', shouldWait)
  // console.log('shouldWait=:>> command', command)

  if (!shouldWait) {
    return Promise.resolve()
  }

  return delay(() => {}, 2000)
    .then(() => {
      // Note: After refresh/redirect, ipc secret in content script changes,
      // use this fact to tell whether a page is loaded or not
      return retry(
        () => {
          return checkHeartBeat().then(async (heartBeatResult) => {
            const lastSecret = await getState('lastCsIpcSecret')
            const heartBeatSecret = heartBeatResult.secret

            if (lastSecret === heartBeatSecret) {
              throw new Error('Error #220: Still same ipc secret')
            }
            return true
          })
        },
        {
          shouldRetry: () => true,
          timeout: timeoutHeartbeat,
          retryInterval: 250
        }
      )()
    })
    .catch((e) => {
      const { cmd } = command
      const isAndWait = /AndWait/.test(cmd)

      console.warn(e)

      if (isAndWait) {
        const instead = cmd.replace('AndWait', '')
        throw new Error(
          `Error #200: '${cmd}' failed. No page load event detected after ${timeoutHeartbeat / 1000} seconds. Try '${instead}' instead. Error details: ` +
            e.message
        )
      } else {
        throw new Error(
          `Error #210: '${cmd}' failed. No page load event detected after ${timeoutHeartbeat / 1000}s (!TIMEOUT_WAIT). Error details: ` +
            e.message
        )
      }
    })
    .then(() => {
      const promise1 = callPlayTab({
        command: 'DOM_READY',
        args: {},
        ipcCallTimeout: timeoutPageLoad
      })

      const promise2 = callPlayTab({
        command: 'HACK_ALERT',
        args: {},
        ipcCallTimeout: C.CS_IPC_TIMEOUT
      })

      return Promise.all([promise1, promise2]).then(() => {})
    })
}

async function sendRunCommand(command: Command, retryInfo: any): Promise<RunCommandResult> {
  const state = await getState()
  const ipcTimeout = getIpcTimeout(command)

  console.log('sendRunCommand command:>> ', command)

  const superFast = (command.extra?.superFast && !['open'].includes(command.cmd)) || false

  if (state.status !== C.APP_STATUS.PLAYER) {
    throw new Error("can't run command when it's not in player mode")
  }

  // Note: clear timer whenever we execute a new command, and it's not a retry
  if (retryInfo.retryCount === 0) {
    clearTimerForTimeoutStatus()
  }

  // TODO: re-consider this, it takes 80+ms
  // Note: each command keeps target page's status as PLAYING
  if (!superFast) {
    await callPlayTab({
      command: 'SET_STATUS',
      args: {
        status: C.CONTENT_SCRIPT_STATUS.PLAYING
      }
    })
  }

  // TODO: re-consider this, it takes 20ms
  if (!superFast) {
    await callPlayTab({
      command: 'DOM_READY',
      args: {},
      ipcCallTimeout: ipcTimeout
    })
  }

  console.log('run command:>> ', command)

  const res = await callPlayTab<RunCommandResponse>({
    command: 'RUN_COMMAND',
    args: {
      command: {
        ...command,
        extra: {
          ...(command.extra || {}),
          retryInfo
        }
      }
    },
    ipcCallTimeout: ipcTimeout
  })

  await withPageLoadCheck(command, getTimeoutPageLoad(command), () => waitForCommandToComplete(command, res))

  const secret = (res.data as any)?.secret

  if (secret) {
    await updateState({ lastCsIpcSecret: secret })
  }

  return res.data
}

function isTimeoutError(msg: string): boolean {
  return (
    !!msg &&
    (msg.indexOf('timeout reached when looking for') !== -1 ||
      msg.indexOf('timeout reached when waiting for') !== -1 ||
      msg.indexOf('element is found but not visible yet') !== -1 ||
      msg.indexOf('IPC Promise has been destroyed') !== -1)
  )
}

async function runCommandWithRetry(command: Command): Promise<RunCommandResult> {
  // Note: add timerSecret to ensure it won't clear timer that is not created by this function call
  const timerSecret = Math.random()
  await updateState({ timerSecret })

  console.log(`runCommandWithRetry:>> command:>> `, command)

  const commandTimeout = getCommandTimeout(command)
  const maxRetryOnIpcTimeout = 1
  let retryCountOnIpcTimeout = 0

  const fn = retry(sendRunCommand, {
    timeout: commandTimeout,
    shouldRetry: (e) => {
      log('runCommandWithRetry - shouldRetry', e.message)

      // Note: for rare cases when guest page doesn't respond to RUN_COMMAND, it will timeout for `timeoutElement`
      // And we should retry RUN_COMMAND for only once in that case, and also show this as warning to users
      // related issue: #513
      if (/ipcPromise.*timeout/i.test(e.message)) {
        if (retryCountOnIpcTimeout < maxRetryOnIpcTimeout) {
          callPlayTab({
            command: 'ADD_LOG',
            args: {
              warning: 'Warning #300: Web page connection issue. Retrying last command.'
            }
          })

          retryCountOnIpcTimeout++
          return true
        } else {
          return false
        }
      }

      return isTimeoutError(e.message)
    },
    onFirstFail: (e: Error) => {
      const title =
        e && e.message && e.message.indexOf('element is found but not visible yet') !== -1
          ? 'Tag waiting' // All use Tag Waiting for now  // 'Visible waiting'
          : 'Tag waiting'

      startSendingTimeoutStatus(commandTimeout, title)
    },
    onFinal: async (err: Error, data: any) => {
      const state = await getState()
      log('onFinal', err, data)

      if (state.timer && state.timerSecret === timerSecret) {
        clearInterval(state.timer)
      }
    }
  })

  try {
    return (await fn(command)) as Promise<RunCommandResult>
  } catch (err) {
    const e = err as Error

    if (!isTimeoutError(e.message)) {
      return Promise.reject(e)
    }

    if (command.targetOptions && command.targetOptions.length) {
      return sendRunCommand(command, { final: true })
    }

    return Promise.reject(e)
  }
}

function runCommandWithClosureAndErrorProcess(command: Command): Promise<RunCommandResult> {
  return runCommandWithRetry(command).catch((e) => {
    console.log('runCommandWithClosureAndErrorProcess c:>>', e)
    // Return default value for storeXXX commands
    if (['storeText', 'storeValue', 'storeChecked', 'storeAttribute'].indexOf(command.cmd) !== -1) {
      const value = command.value
      const LOCATOR_NOT_FOUND = '#LNF'

      return {
        vars: {
          [value]: LOCATOR_NOT_FOUND
        },
        log: {
          error: e.message
        }
      }
    }

    // Note: if variable !ERRORIGNORE is set to true,
    // it will just log errors instead of a stop of whole macro
    if (command.extra?.errorIgnore) {
      return {
        log: {
          error: e.message
        }
      }
    }

    throw e
  })
}

function runWithHeartBeat(command: Command): Promise<RunCommandResult> {
  const isTabOpenForSelectWindow = command.cmd === 'selectWindow' && /^\s*tab=open\s*$/i.test(command.target)

  const superFast = (command.extra?.superFast && !['open'].includes(command.cmd)) || false
  console.log('2a. runWithHeartBeat:>> superFast:', superFast)

  const neverResolvePromise = new Promise<void>(() => {})
  const [infiniteCheckHeartBeat, stopInfiniteCheck] = (() => {
    const startTime = new Date().getTime()
    let stop = false

    const check = (): Promise<void> => {
      // log('starting heart beat')
      // Note: do not check heart beat when
      // 1. it's a 'open' command, which is supposed to reconnect ipc
      // 2. it's going to download files, which will kind of reload page and reconnect ipc

      const pNoNeedForHearBeat = ((): Promise<boolean> => {
        if (shouldWaitForCommand(command)) {
          return Promise.resolve(true)
        }

        return ipc.ask('PANEL_HAS_PENDING_DOWNLOAD', {})
      })()

      return pNoNeedForHearBeat.then((noNeedForHeartBeat) => {
        if (noNeedForHeartBeat) {
          updateHeartBeatSecret({ disabled: true })
          return neverResolvePromise
        }

        if (stop) {
          return Promise.resolve()
        }

        return checkHeartBeat(100, startTime).then(
          () => delay(check, 1000),
          (e) => {
            log.error('lost heart beart!!', e.stack)
            throw new Error('lost heart beat when running command')
          }
        )
      })
    }

    const stopIt = () => {
      // log('stopping heart beat')
      stop = true
    }

    return [check, stopIt]
  })()

  return Promise.race([
    runCommandWithClosureAndErrorProcess(command)
      .then((data) => {
        console.log('runCommandWithClosureAndErrorProcess data:>> ', data)
        stopInfiniteCheck()
        return data
      })
      .catch((e) => {
        stopInfiniteCheck()
        return Promise.reject(e)
      }),
    superFast
      ? (new Promise(() => {}) as any as Promise<RunCommandResult>)
      : ((isTabOpenForSelectWindow ? new Promise(() => {}) : infiniteCheckHeartBeat()) as any as Promise<RunCommandResult>)
  ])
}

async function runWithRetryOnLostHeartBeat(command: Command): Promise<RunCommandResult> {
  const runWithHeartBeatRetry = retry(runWithHeartBeat, {
    timeout: getCommandTimeout(command),
    shouldRetry: (e) => {
      log('runWithHeartBeatRetry - shouldRetry', e.message)
      return !!e && !!e.message && e.message.indexOf('lost heart beat when running command') !== -1
    },
    retryInterval: (retryCount, lastRetryInterval) => {
      return Math.max(1 * 1000, Math.min(5 * 1000, lastRetryInterval * 1.2))
    }
  })

  const superFast = (command.extra?.superFast && !['open'].includes(command.cmd)) || false
  console.log('2b. runWithRetryOnLostHeartBeat:>> superFast', superFast)

  const result = await runWithHeartBeatRetry(command)

  const hasOnDownloadCmd = command.extra?.hasOnDownloadCmd

  // TODO: it takes some considerable amount of time in case of 'click' command, try to optimize it
  if (hasOnDownloadCmd && shouldWaitForDownloadAfterRun(command)) {
    console.log('waiting for download:>>')
    // Note: wait for download to either be create or completed
    await ipc.ask('PANEL_WAIT_FOR_ANY_DOWNLOAD', {})
  }

  // log('before PANEL_WAIT_FOR_ANY_DOWNLOAD')
  // await ipc.ask('PANEL_WAIT_FOR_ANY_DOWNLOAD', {})
  // log('after PANEL_WAIT_FOR_ANY_DOWNLOAD')

  const state: ExtensionState = await getState()

  try {
    // Note: use bg to set pageUrl, so that we can be sure that this `pageUrl` is 100% correct
    const tab = await Ext.tabs.get(state.tabIds.toPlay)
    return { ...result, pageUrl: tab.url }
  } catch (e) {
    log.error('Error in fetching play tab url')
    return result
  }
}

type PreparePlayTabIntermediateResult = {
  tab: chrome.tabs.Tab
  shouldSkipCommandRun: boolean
  hasOpenedUrl: boolean
}

async function openNewUrlInPlayTab(command: Command, startPageLoadCountDown: () => void): Promise<PreparePlayTabIntermediateResult> {
  const { cmd, target, value } = command
  const [isOpenCommand, shouldSkipCommandRun, url] = (() => {
    if (cmd === 'open' || cmd === 'openBrowser') {
      return [true, false, target]
    }

    if (cmd === 'selectWindow' && target && target.toLowerCase().trim() === 'tab=open') {
      return [true, true, value]
    }

    return [false, false, null]
  })()

  if (!isOpenCommand) {
    throw new Error('Error #101: Ui.Vision is not connected to a browser tab')
  }

  startPageLoadCountDown()
  if (cmd === 'openBrowser') {
    return getPlayTabOpenB(url! as string).then(
      (tab: chrome.tabs.Tab) => ({ tab, shouldSkipCommandRun, hasOpenedUrl: true }) as PreparePlayTabIntermediateResult
    )
  } else {
    return getPlayTab(url! as string).then(
      (tab: chrome.tabs.Tab) => ({ tab, shouldSkipCommandRun, hasOpenedUrl: true }) as PreparePlayTabIntermediateResult
    )
  }
}

function preparePlayTabIPC(
  command: Command,
  tab: chrome.tabs.Tab,
  startCountDown: () => void,
  stopCountDown: () => void
): Promise<PreparePlayTabIntermediateResult> {
  return ipc
    .ask('PANEL_CS_IPC_READY', {
      tabId: tab.id!,
      timeout: 100
    })
    .then(
      () => {
        return { tab, hasOpenedUrl: false } as PreparePlayTabIntermediateResult
      },
      () => {
        return openNewUrlInPlayTab(command, startCountDown)
      }
    )
    .then(({ tab, hasOpenedUrl, shouldSkipCommandRun }: PreparePlayTabIntermediateResult) => {
      return callPlayTab({
        command: 'HEART_BEAT',
        args: '',
        tabIpcTimeout: getTimeoutPageLoad(command)
      }).then(() => {
        stopCountDown()
        return { tab, hasOpenedUrl, shouldSkipCommandRun }
      })
    })
}

function ensurePlayTabIPC(
  command: Command,
  tab: chrome.tabs.Tab,
  startCountDown: () => void,
  stopCountDown: () => void
): Promise<PreparePlayTabIntermediateResult> {
  // Note: in case the playing tab exists but not has a broken page, and is not reachable by tabs.sendMessage
  // We should try to run open command again if any
  let timeout = getTimeoutPageLoad(command)
  return withTimeout(timeout, async () => {
    try {
      return await preparePlayTabIPC(command, tab, startCountDown, stopCountDown)
    } catch (err) {
      const e = err as Error

      if (!/Could not establish connection/.test(e.message)) {
        return Promise.reject(e)
      }

      const newTabResult = await openNewUrlInPlayTab(command, startCountDown)
      return await preparePlayTabIPC(command, newTabResult.tab, startCountDown, stopCountDown)
    }
  }).catch((e) => {
    if (/withTimeout/.test(e.message)) {
      throw new Error(`Ui.Vision fails to open this url`)
    }

    if (e.message === 'timeout') {
      throw new Error(`Error #230: Page load ${timeout / 1000} seconds time out`)
    }

    throw e
  })
}

function createCountDown(timeout: number): [() => void, () => void] {
  let stopPageLoadCountDown: () => void = () => {}
  const startPageLoadCountDown = () => {
    stopPageLoadCountDown()
    stopPageLoadCountDown = startSendingTimeoutStatus(timeout)
  }

  return [startPageLoadCountDown, stopPageLoadCountDown]
}

function isChromeSpecialPage(url: string): boolean {
  return url.startsWith('chrome://') || url.startsWith('chrome-error://')
}

function waitForPageLoadComplete(tab: chrome.tabs.Tab): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const timeout = 60 * 1000
    const interval = 300
    let elapsed = 0
    const timer = setInterval(() => {
      elapsed += interval
      if (elapsed > timeout) {
        clearInterval(timer)
        reject(new Error('timeout'))
      }

      Ext.scripting
        .executeScript({
          target: { tabId: tab.id },
          func: () => {
            return document.readyState
          }
        })
        .then((result: any) => {
          // wait for document ready
          if (result && result[0].result === 'complete') {
            clearInterval(timer)
            resolve(true)
          }
        })
        .catch((e: any) => {
          console.log('executeScript err:>> ', e)
          if (timeout < elapsed) {
            reject(new Error('E231: Page load error'))
          }
        })
    }, interval)
  })
}

function preparePlayTab(command: Command): Promise<boolean> {
  const [startPageLoadCountDown, stopPageLoadCountDown] = createCountDown(getTimeoutPageLoad(command))
  console.log('preparePlayTab:>> command:>>', command)
  return (
    getPlayTab()
      // Note: catch any error, and make it run 'getPlayTab(args.url)' instead
      .catch((e: Error) => ({ id: -1 }) as chrome.tabs.Tab)
      .then((tab: chrome.tabs.Tab) => {
        // to check if the playTab window is closed
        const windowId = tab.windowId
        // check if window is closed
        return Ext.windows.get(windowId, { populate: true }).then((win: any) => {
          // when window is closed, it will return a popup window
          if (
            win &&
            win.type == 'popup' &&
            win.tabs.length === 1 &&
            (win.tabs[0].url.startsWith(`chrome-extension://${Ext.runtime.id}`) || win.tabs[0].url.match(/moz-extension:\/\/[a-z0-9-]+\//))
          ) {
            throw new Error('E530: No browser open. Please close the IDE and then start the browser.')
          }
          return tab
        })
      })
      .then((tab: chrome.tabs.Tab) => {
        // log('after first getPlayTab', tab)

        const ipcTimeout = getIpcTimeout(command)
        const timeoutPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error(`Error #230: Page load ${ipcTimeout / 1000} seconds time out`))
          }, ipcTimeout)
        })

        // On Firefox, it does get ipc from "about:blank", but somehow the connection is not good
        // it's always reconnecting. so instead of trying to run command on "about:blank",
        // redirect it to meaningful url
        const nonresponsiveFirefoxURLs = ['about:home', 'about:blank', 'about:config', 'about:debugging']

        // if tab.url starts with any of the nonresponsiveFirefoxURLs
        if (Ext.isFirefox() && nonresponsiveFirefoxURLs.some((url) => tab.url!.startsWith(url))) {
          const openNewURLPromise = openNewUrlInPlayTab(command, startPageLoadCountDown).then(() => waitForPageLoadComplete(tab))
          return Promise.race([openNewURLPromise, timeoutPromise.then(() => false)])
        }

        // For chrome special URLs like "chrome://extensions/", "chrome://settings/" etc,
        // if command is "open", we should open it in the same tab
        // and wait for it to be ready
        // in some uncertain cases url property in tab object is turned out not to be available
        if (!tab.url || isChromeSpecialPage(tab.url!)) {
          const openNewURLPromise = openNewUrlInPlayTab(command, startPageLoadCountDown).then(() => waitForPageLoadComplete(tab))
          return Promise.race([openNewURLPromise, timeoutPromise.then(() => false)])
        }

        return ensurePlayTabIPC(command, tab, startPageLoadCountDown, stopPageLoadCountDown).then(
          ({ tab, hasOpenedUrl, shouldSkipCommandRun }) => {
            // const p = args.shouldNotActivateTab ? Promise.resolve() : activateTab(tab.id, true)
            const p = Promise.resolve()

            // Note: wait for tab to confirm it has loaded
            return p
              .then(() =>
                ipc.ask('PANEL_CS_IPC_READY', {
                  tabId: tab.id!,
                  timeout: 6000 * 10
                })
              )
              .then(async () => {
                if (hasOpenedUrl) {
                  await callPlayTab({
                    command: 'MARK_NO_COMMANDS_YET',
                    args: {},
                    ipcCallTimeout: C.CS_IPC_TIMEOUT
                  })
                }

                await callPlayTab({
                  command: 'SET_STATUS',
                  args: { status: C.CONTENT_SCRIPT_STATUS.PLAYING },
                  ipcCallTimeout: C.CS_IPC_TIMEOUT
                })
              })
              .then(() => shouldSkipCommandRun)
          }
        )
      })
  )
}
