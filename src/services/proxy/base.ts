import { IProxyManager, ProxyData, AuthInfo, ProxyListener, UnbindFunc } from './types'
import { Registry, Listener, createListenerRegistry } from '@/common/registry'

export abstract class BaseProxyManager implements IProxyManager {
  public abstract isSupported (): boolean
  public abstract isControllable (incognito: boolean): Promise<boolean>
  public abstract setProxy (proxy: ProxyData): Promise<void>
  public abstract reset (): Promise<void>

  protected proxy: ProxyData | null = null
  protected registry: Registry<Listener> = createListenerRegistry();

  getProxy (): Promise<ProxyData | null> {
    return Promise.resolve(this.proxy)
  }

  getAuth (host: string, port: string): AuthInfo | null {
    if (!this.proxy || !this.proxy.username) {
      return null
    }

    // port could be number, so must convert it to string before compare
    if (this.proxy.host === host && this.proxy.port === '' + port) {
      return {
        username: this.proxy.username as string,
        password: this.proxy.password as string
      }
    }

    return null
  }

  onChange (listener: ProxyListener): UnbindFunc {
    this.registry.add('change', listener)
    return (): void => { this.registry.remove('change', listener) }
  }
}
