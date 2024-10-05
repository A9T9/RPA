import Ext from '@/common/web_extension'
import storage from '@/common/storage'
import { singletonGetter } from "@/common/ts_utils"
import { LicenseService } from "./service"
import { LegacyXModuleStatus, LicenseInfo } from './types'
import { updateConfig } from "@/actions"

export const getLicenseService: (() => LicenseService) = singletonGetter((): LicenseService => {
  return new LicenseService({
    getVersion: (): Promise<string> => {
      return Promise.resolve(Ext.runtime.getManifest().version)
    },
    getLegacyXModuleStatus: (): LegacyXModuleStatus => {
      return (window as any)['store'].getState().config.xmodulesStatus
    },
    setLegacyXModuleStatus: (status: LegacyXModuleStatus): Promise<void> => {
      return Promise.resolve(
        (window as any)['store'].dispatch(updateConfig({ xmodulesStatus: status }))
      )
    },
    save: (license: LicenseInfo): Promise<void> => {
      return storage.set(LicenseService.StorageKey, license).then(() => {})
    },
    read: (): Promise<LicenseInfo | null> => {
      return storage.get(LicenseService.StorageKey).then(license => license ?? null)
    }
  })
})
