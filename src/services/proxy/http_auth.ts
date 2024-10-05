import { IProxyHttpAuth, ProxyHttpAuthParams, AuthInfo } from './types'
import Ext from '../../common/web_extension'
import { singletonGetter } from '@/common/ts_utils'

export class ProxyHttpAuth implements IProxyHttpAuth {
  private getAuth: (host: string, port: string) => AuthInfo | null
  private unbindListener = (): void => {}
  private bound: boolean = false

  constructor (params: ProxyHttpAuthParams) {
    this.getAuth = params.getAuth
  }

  bind (): void {
    if (this.bound) {
      return
    }

    this.bound = true

    const listener = this.onAuthRequired.bind(this)

    Ext.webRequest.onAuthRequired.addListener(
      listener,
      { urls: ['<all_urls>'] },
      ['blocking']
    )

    this.unbindListener = (): void => Ext.webRequest.onAuthRequired.removeListener(listener)
  }

  unbind (): void {
    if (!this.bound) {
      return
    }

    this.unbindListener()
    this.bound = false
  }

  private onAuthRequired (details: any): any {
    if (!details.isProxy) {
      return {}
    }

    const auth = this.getAuth(
      details.challenger.host,
      '' + details.challenger.port
    )

    return auth ? { authCredentials: auth } : {}
  }
}
