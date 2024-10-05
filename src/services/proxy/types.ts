
export enum ProxyScheme {
  Http = 'http',
  Https = 'https',
  Socks4 = 'socks4',
  Socks5 = 'socks5'
}

export type ProxyData = {
  type:      ProxyScheme;
  host:      string;
  port:      string;
  username?: string;
  password?: string;
}

export type ProxyListener = (newProxy: ProxyData | null) => void

export type UnbindFunc = () => void

export interface IProxyManager {
  isSupported (): boolean;
  isControllable (incognito: boolean): Promise<boolean>;
  getProxy (): Promise<ProxyData | null>;
  setProxy (proxy: ProxyData | null): Promise<void>;
  reset (): Promise<void>;
  getAuth (host: string, port: string): AuthInfo | null;
  onChange (listener: ProxyListener): UnbindFunc;
}

export interface IProxyHttpAuth {
  bind (): void;
  unbind (): void;
}

export type AuthInfo = {
  username: string;
  password: string;
}

export type ProxyHttpAuthParams = {
  getAuth: (host: string, port: string) => AuthInfo | null
}

export enum FirefoxProxyType {
  Direct = 'direct',
  Http = 'http',
  Https = 'https',
  Socks4 = 'socks4',
  Socks5 = 'socks'
}

export type FirefoxProxyInfo = {
  type:      FirefoxProxyType;
  host:      string;
  port:      string;
  username?: string;
  password?: string;
}
