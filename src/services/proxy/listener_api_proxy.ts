
import { IProxyManager, ProxyData, ProxyScheme, AuthInfo, FirefoxProxyInfo, FirefoxProxyType } from './types'
import { BaseProxyManager } from './base'

declare const browser: any

export function convertToFirefoxProxyInfo (proxy: ProxyData): FirefoxProxyInfo {
  return {
    ...proxy,
    type: (proxy.type === ProxyScheme.Socks5 ? FirefoxProxyType.Socks5 : proxy.type) as FirefoxProxyType
  }
}

export class ProxyManagerViaListenerAPI extends BaseProxyManager {
  private unbind = (): void => {}
  private isBound =false

  constructor () {
    super()
  }

  isSupported (): boolean {
    return typeof browser !== 'undefined' && browser.proxy && browser.proxy.onRequest
  }

  isControllable (incognito: boolean): Promise<boolean> {
    return Promise.resolve(true)
  }

  setProxy (proxy: ProxyData | null): Promise<void> {
    this.bind()
    this.proxy = proxy
    this.notifyProxyChange()
    return Promise.resolve()
  }

  reset (): Promise<void> {
    this.proxy = null
    this.notifyProxyChange()
    return Promise.resolve()
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

    const listener = this.onProxyRequest.bind(this)
    browser.proxy.onRequest.addListener(listener, { urls: ['<all_urls>'] })
    this.unbind = () => browser.proxy.onRequest.removeListener(listener)
  }

  private onProxyRequest (requestInfo: any): Partial<FirefoxProxyInfo> {
    return this.proxy ? convertToFirefoxProxyInfo(this.proxy) : { type: FirefoxProxyType.Direct }
  }
}
