import storage from '../../common/storage'

export enum XModuleTypes {
  XFile = 'xFile',
  XUserIO = 'xClick'
}

export type VersionInfo = {
  installed: boolean;
  version?: string;
}

export interface IXModule {
  getVersion: () => Promise<VersionInfo>;
  sanityCheck: () => Promise<boolean>;
  checkUpdate?: () => Promise<string>;
  downloadLink: () => string;
  infoLink: () => string;
  checkUpdateLink: (modVersion: string, extVersion: string) => string;
  setConfig: (config: Record<string, any>) => Promise<boolean>;
  getConfig: () => Promise<Record<string, any>>;
  getCachedConfig: () => Record<string, any>;
}

export interface IXModuleInternal {
  getName: () => string;
  getAPI: () => IXModuleBasicAPI;
  initConfig: () => Promise<any>;
}

export interface IXModuleBasicAPI {
  reconnect: () => Promise<IXModuleBasicAPI>;
  getVersion: () => Promise<string>;
}

export abstract class XModule<T extends IXModuleBasicAPI> implements IXModule, IXModuleInternal {
  protected cachedConfig: Record<string, any> = {}

  abstract getName (): string
  abstract getAPI (): T
  abstract checkUpdate (): Promise<string>
  abstract downloadLink (): string
  abstract infoLink (): string
  abstract checkUpdateLink (modVersion: string, extVersion: string): string
  abstract sanityCheck (): Promise<boolean>
  abstract initConfig (): Promise<any>

  constructor () {
    this.initConfig()
  }

  getVersion (): Promise<VersionInfo> {
    return this.getAPI()
    .reconnect()
    .catch(e => {
      throw new Error(`${this.getName} is not installed yet`)
    })
    .then(api => {
      return api.getVersion()
      .then(version => ({
        version,
        installed: true
      }))
    })
    .catch(e => ({
      installed: false
    }))
  }

  setConfig (config: Record<string, any>): Promise<boolean> {
    this.cachedConfig = {
      ...this.cachedConfig,
      ...config
    }

    return this.getConfig()
    .then(oldConfig => {
      const nextConfig = {
        ...oldConfig,
        ...config
      }

      return storage.set(this.getStoreKey(), nextConfig)
      .then(success => {
        if (success) {
          this.cachedConfig = nextConfig
        }

        return success
      })
    })
  }

  getConfig (): Promise<Record<string, any>> {
    return storage.get(this.getStoreKey())
    .then(data => {
      this.cachedConfig =  data || {}
      return this.cachedConfig
    })
  }

  getCachedConfig (): Record<string, any> {
    return this.cachedConfig
  }

  protected getStoreKey (): string {
    return this.getName().toLowerCase()
  }
}
