import { ProxyData } from './types'
import { BaseProxyManager } from './base'

declare const chrome: any

export class ProxyManagerViaSettingsAPI extends BaseProxyManager {
  private isBound = false

  constructor () {
    super()
  }

  isSupported (): boolean {
    return typeof chrome !== 'undefined' && chrome.proxy && chrome.proxy.settings && chrome.proxy.settings.onChange
  }

  isControllable (incognito: boolean): Promise<boolean> {
    return new Promise((resolve, reject): void => {
      chrome.proxy.settings.get({ incognito: !!incognito }, (details: any): void => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError)
        }

        const { levelOfControl } = details
        const inControl = ['controllable_by_this_extension', 'controlled_by_this_extension'].indexOf(levelOfControl) !== -1

        resolve(inControl)
      })
    })
  }

  setProxy (proxy: ProxyData): Promise<void> {
    this.bindProxyChange()

    this.proxy = proxy

    return new Promise((resolve, reject): void => {
      chrome.proxy.settings.set({
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: proxy.type,
              host:   proxy.host,
              port:   parseInt(proxy.port, 10)
            }
          }
        }
      }, (): void => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError)
        }
        resolve()
      })
    })
  }

  reset (): Promise<void> {
    return new Promise((resolve, reject): void => {
      chrome.proxy.settings.set({
        value: {
          mode: 'direct'
        }
      }, (): void => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError)
        }
        resolve()
      })
    })
  }

  private bindProxyChange (): void {
    if (this.isBound) {
      return
    }

    this.isBound = true

    chrome.proxy.settings.onChange.addListener((details: any): void => {
      const proxyData: ProxyData | null = this.fromChromeDetails(details)

      // Proxy data returned by fromChromeDetails doesn't contain username/password
      // so must avoid it overwrites the one with auth info
      this.setLocalProxyIfIsNew(proxyData)
      this.registry.fire('change', proxyData)
    })
  }

  private fetchProxyFromSettings (): Promise<void> {
    return new Promise<void>((resolve, reject): void => {
      chrome.proxy.settings.get({ incognito: false }, (details: any): void => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError)
        }

        const proxyData: ProxyData | null = this.fromChromeDetails(details)

        this.setLocalProxyIfIsNew(proxyData)
        this.registry.fire('change', proxyData)
        resolve()
      })
    })
  }

  private fromChromeDetails (details: any): ProxyData | null {
    if (details.value.mode !== 'fixed_servers' || !details.value.rules || !details.value.rules.singleProxy) {
      return null
    }

    const singleProxy = details.value.rules.singleProxy

    return {
      host: singleProxy.host,
      port: '' + singleProxy.port,
      type: singleProxy.scheme
    }
  }

  private setLocalProxyIfIsNew (proxyData: ProxyData | null): void {
    if (proxyData?.host !== this.proxy?.host ||
        proxyData?.port !== this.proxy?.port) {
      this.proxy = proxyData
    }
  }
}
