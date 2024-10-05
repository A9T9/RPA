import { ProxyData, AuthInfo } from './types'
import { BaseProxyManager } from './base'
import { convertToFirefoxProxyInfo } from './listener_api_proxy'
import csIpc from '@/common/ipc/ipc_cs'
import log from '@/common/log'
import { delay } from '@/common/ts_utils'

declare const browser: any

export class ProxyManagerViaPacAPI extends BaseProxyManager {
  private unbind = (): void => {}
  private isBound = false

  constructor () {
    super()
  }

  isSupported (): boolean {
    return typeof browser !== 'undefined' && browser.proxy && browser.proxy.register
  }

  isControllable (): Promise<boolean> {
    return Promise.resolve(true)
  }

  setProxy (proxy: ProxyData | null): Promise<void> {
    this.bind()

    this.proxy = proxy
    this.notifyProxyChange()

    // Not sure if 1s delay could be omitted. Just keep it here in case legacy pac api
    // takes time before proxy takes effect
    return browser.runtime.sendMessage({
      cmd: 'SET_PROXY',
      data: proxy ? convertToFirefoxProxyInfo(proxy) : null
    }, { toProxyScript: true })
    .then(() => delay(() => {}, 1000))
  }

  reset (): Promise<void> {
    this.proxy = null
    this.notifyProxyChange()

    return csIpc.ask('PANEL_SET_PROXY_FOR_PAC', { proxy: null })
    .then(() => delay(() => {}, 1000))
  }

  getAuth (host: string, port: string): AuthInfo | null {
    if (!this.proxy || !this.proxy.username) {
      return null
    }

    if (this.proxy.host === host && this.proxy.port === port) {
      return {
        username: this.proxy.username as string,
        password: this.proxy.password as string
      }
    }

    return null
  }

  private notifyProxyChange (): void {
    setTimeout(() => {
      this.registry.fire('change', this.proxy)
    }, 10)
  }

  private bind (): void {
    if (this.isBound) {
      return
    }

    this.isBound = true

    const pacListener = (data: any) => {
      if (data.type === 'PROXY_LOG') {
        log('PROXY_LOG', data)
      }
    }

    browser.proxy.register('firefox_pac.js')
    browser.runtime.onMessage.addListener(pacListener)

    this.unbind = (): void => {
      browser.proxy.unregister()
      browser.runtime.onMessage.removeListener(pacListener)
    }
  }
}
