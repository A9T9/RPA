import { insertScript } from '@/common/utils'
import { retry, until } from '@/common/ts_utils'
import Ext from '@/common/web_extension'
import log from '@/common/log'
import { postMessage } from '@/common/ipc/cs_postmessage'
import config from '@/config'

let scriptInjectedOnce: boolean;

export type EvalAPI = {
  eval(code: string): Promise<unknown>
}

export async function evalViaInject(code: string): Promise<unknown> {
  const api = await untilInjected()
  // log('sending INJECT_RUN_EVAL >>>>>>',code)
  return api.eval(code)
}

export async function hackAlertInject(code: string): Promise<unknown> {
  const api = await untilHackAlertInjected() // old: await untilInjected() // new: await untilHackAlertInjected()
  // log('sending INJECT_RUN_EVAL >>>>>>',code)
  return api.eval(code)
}

export function untilHackAlertInjected (): Promise<EvalAPI> {
  const api: EvalAPI = {
    eval: (code) => {
      log('sending INJECT_RUN_EVAL')
      
      return postMessage(window, window, { cmd: 'INJECT_RUN_EVAL', args: {code} }, '*', 5000)
      .then((data) => {
        log('eval result', data)
        return (data as { result: unknown }).result
      })
    }
  }

  const injected = !!document.body.getAttribute('data-injected')

  if (injected) {
    return Promise.resolve(api)
  }

  // issue #32
  // check against injecting twice 
  // injecting more than once is causing script to run twice eg: { "Command": "executeScript", "Target": "console.log('test')" }
  if(!scriptInjectedOnce){
    scriptInjectedOnce = true
    insertScript(Ext.runtime.getURL('inject.js'))
  }

  return retry(() => {
    // log('sending INJECT_READY untilHackAlertInjected')
    return postMessage(window, window, { cmd: 'INJECT_READY' }, '*', 500)
  }, {
    shouldRetry: () => true,
    timeout: 5000,
    retryInterval: 0
  })()
  .then(() => api)
  .catch(e => {
    log(e.stack)
    throw new Error('fail to inject (ha)')
  })
}

export function untilInjected (minTimeout:number = config.executeScript.minimumTimeout): Promise<EvalAPI> {
  const api: EvalAPI = {
    eval: (code) => {
      log('sending INJECT_RUN_EVAL')
      
      return postMessage(window, window, { cmd: 'INJECT_RUN_EVAL', args: {code} }, '*', minTimeout)
      .then((data) => {
        log('eval result', data)
        return (data as { result: unknown }).result
      })
    }
  }
  const injected = !!document.body.getAttribute('data-injected')

  if (injected) {
    return Promise.resolve(api)
  }

  insertScript(Ext.runtime.getURL('inject.js'))

  return retry(() => {
    log('sending INJECT_READY')
    return postMessage(window, window, { cmd: 'INJECT_READY' }, '*', 500)
  }, {
    shouldRetry: () => true,
    timeout: 5000,
    retryInterval: 0
  })()
  .then(() => api)
  .catch(e => {
    log(e.stack)
    throw new Error('fail to inject')
  })
}
