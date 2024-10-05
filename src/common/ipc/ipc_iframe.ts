import { Ipc } from './ipc_promise'
import { onMessage, postMessage } from './cs_postmessage'
import { createListenerRegistry } from '../registry'
import { WeakConsecutive, withConsecutive } from '../consecutive';
import { retry } from '../ts_utils';

const postMsg = postMessage

type CommandArgs = {
  cmd: string,
  args: any
}

export const ipcForIframe = ({ targetWindow = window.top, timeout = 60000 } = {}): Ipc => {
  const registry    = createListenerRegistry()
  const listener    = ({ cmd, args }: CommandArgs) => registry.fire('call', { cmd, args })
  const removeOnMsg = onMessage(window, listener)

  return {
    ask: (cmd: string, args: any) => {
      return postMsg(targetWindow, window, { cmd, args }, '*', timeout)
    },
    onAsk: (fn: Function) => {
      registry.add(
        'call',
        ({ cmd, args }: CommandArgs) => fn(cmd, args)
      )
    },
    destroy: () => {
      removeOnMsg()
    }
  }
}

export interface CreateIframeOptions {
  url:          string,
  onLoad?:      () => void,
  width?:       number,
  height?:      number,
  ipcTimeout?:  number,
  domReady?:    WeakConsecutive
}

export interface CreateIframeAPI extends Ipc {
  $iframe:  HTMLIFrameElement
}

export const createIframe = (options: CreateIframeOptions): CreateIframeAPI => {
  const { url, width, height, onLoad, domReady, ipcTimeout = 60000 } = options
  const $iframe = document.createElement('iframe')
  const pLoad   = new Promise((resolve, reject) => {
    if (width)  $iframe.width   = '' + width
    if (height) $iframe.height  = '' + height

    $iframe.addEventListener('load', () => {
      if (typeof onLoad === 'function') {
        try { onLoad() } catch (e) {}
      }
      resolve()
    })
    $iframe.src = url
    document.body.appendChild($iframe)
  })
  const waitDomReady = (domReady: WeakConsecutive) => {
    return retry(() => {
      return withConsecutive(domReady, () => {
        return postMsg(
          $iframe.contentWindow as Window,
          window,
          { cmd: 'DOM_READY', args: {} },
          '*',
          1000
        )
        .then(() => true, () => false)
      })
      .then(() => undefined)
    }, {
      timeout:        ipcTimeout,
      shouldRetry:    (e: Error) => true,
      retryInterval:  1000
    })()
  }
  const pReady: Promise<any> = domReady ? pLoad.then(() => waitDomReady(domReady)) : pLoad
  const removeOnMsg = onMessage(window, ({ cmd, args }: CommandArgs) => {
    return wrappedOnAsk(cmd, args)
  })
  const wrappedOnAsk = (cmd: string, args: any) => {
    return registry.fire('call', { cmd, args })
  }
  const registry = createListenerRegistry()

  return {
    $iframe,
    destroy: () => {
      if ($iframe)  $iframe.remove()
      removeOnMsg()
    },
    ask: (cmd: string, args: any) => {
      return pReady.then(() => {
        return postMsg($iframe.contentWindow as Window, window, { cmd, args }, '*', ipcTimeout)
      }) as Promise<any>
    },
    onAsk: (fn: Function) => {
      registry.add(
        'call',
        ({ cmd, args }: CommandArgs) => fn(cmd, args)
      )
    }
  }
}
