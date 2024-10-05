import { IProxyManager, ProxyData, ProxyScheme, AuthInfo } from './types'
import { ProxyManagerViaListenerAPI } from './listener_api_proxy'
import { ProxyManagerViaSettingsAPI } from './settings_api_proxy'
import { ProxyManagerViaPacAPI } from './pac_api_proxy'
import { ProxyHttpAuth } from './http_auth'
import msg from '@/common/messages'
import { assertExhausted } from '@/common/ts_utils'

const allAvailableProxyManagers = [
  new ProxyManagerViaListenerAPI(),
  new ProxyManagerViaPacAPI(),
  new ProxyManagerViaSettingsAPI()
]

const proxyHttpAuth = new ProxyHttpAuth({
  getAuth: (host: string, port: string): AuthInfo | null => {
    return getProxyManager().getAuth(host, port)
  }
})

export function getProxyManager (): IProxyManager {
  for (let i = 0, len = allAvailableProxyManagers.length; i < len; i++) {
    if (allAvailableProxyManagers[i].isSupported()) {
      return allAvailableProxyManagers[i]
    }
  }

  throw new Error('Unable to use proxy')
}

export function setProxy (proxy: ProxyData | null): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const proxyManager = getProxyManager()

    // Default to not incognito mode
    proxyManager.isControllable(false)
    .then((controllable: boolean) => {
      if (!controllable) {
        throw new Error(msg.proxy.notControllable)
      }

      proxyHttpAuth.bind()

      if (!proxy) {
        return proxyManager.reset()
      }

      return proxyManager.setProxy(proxy)
    })
    .then(resolve, reject)
  })
}

export function parseProxyUrl (proxyUrl: string, usernameAndPassword?: string): ProxyData {
  const url     = new URL(proxyUrl)
  // URL has problem parsing non-standard url like socks4://0.0.0.0
  // hostname will be empty string, so we have to replace protocol with http
  const httpUrl = new URL(proxyUrl.replace(/\s*socks[45]/i, 'http'))
  const host    = httpUrl.hostname

  const type = ((): ProxyScheme => {
    switch (url.protocol) {
      case 'http:':
        return ProxyScheme.Http

      case 'https:':
        return ProxyScheme.Https

      case 'socks4:':
        return ProxyScheme.Socks4

      case 'socks5:':
        return ProxyScheme.Socks5

      default:
        throw new Error('Invalid proxy protocol')
    }
  })()

  const port = ((): string => {
    if (httpUrl.port) {
      return httpUrl.port
    }

    switch (type) {
      case ProxyScheme.Http:
        return '80'

      case ProxyScheme.Https:
        return '443'

      case ProxyScheme.Socks4:
      case ProxyScheme.Socks5:
        return '1080'
    }
  })()

  if (!host || !host.length) {
    throw new Error('No host found in proxy')
  }

  if (!port || isNaN(parseInt(port, 10))) {
    throw new Error('No valid port found in proxy')
  }

  const { username, password } = ((): { username?: string, password?: string } => {
    if (!usernameAndPassword || !usernameAndPassword.length) {
      return {}
    }

    const index = usernameAndPassword.indexOf(',')

    if (index === -1) {
      return { username: usernameAndPassword }
    }

    return {
      username: usernameAndPassword.substr(0, index),
      password: usernameAndPassword.substr(index + 1)
    }
  })()

  return {
    type,
    host,
    port,
    username,
    password
  }
}
