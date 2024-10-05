import { Feature, ILicenseService, LegacyXModuleStatus, LicenseInfo, LicenseType, ValidLicenseInfo } from './types'
import * as HttpAPI from '@/services/api/http_api'
import config from '@/config'

export type LicenseServiceParams = {
  getLegacyXModuleStatus: () => LegacyXModuleStatus;
  setLegacyXModuleStatus: (status: LegacyXModuleStatus) => Promise<void>;
  getVersion: () => Promise<string>;
  save: (license: LicenseInfo) => Promise<void>;
  read: () => Promise<LicenseInfo | null>;
}

export class LicenseService implements ILicenseService {
  static StorageKey = 'a9t9'

  private license: LicenseInfo | null = null

  private get legacyXModuleStatus (): LegacyXModuleStatus {
    return this.params.getLegacyXModuleStatus()
  }

  constructor (private params: LicenseServiceParams) {
    this.getLatestInfo()
  }

  checkLicense (licenseKey: string): Promise<LicenseInfo> {
    return this.params.getVersion().then(version => {
      return HttpAPI.checkLicense({
        licenseKey,
        version
      })
    })
    .then(license => {
      // Only persist valid license
      if (license.status === 'key_not_found') {
        return license
      }

      this.license = license

      return Promise.all([
        this.params.save(license),
        this.params.setLegacyXModuleStatus('checked_by_remote')
      ])
      .then(() => license)
    })
  }

  recheckLicenseIfPossible (): Promise<boolean> {
    if (this.legacyXModuleStatus !== 'checked_by_remote' || !this.license) {
      return Promise.resolve(false)
    }

    return this.checkLicense(this.license?.licenseKey).then(() => true)
  }

  getLatestInfo (): Promise<LicenseInfo | null> {
    return Promise.all([
      this.params.read()
    ])
    .then(tuple => {
      this.license = tuple[0]
      return tuple[0]
    })
  }

  canPerform (feature: Feature): boolean {
    if (this.legacyXModuleStatus !== 'checked_by_remote') {
      return true
    }

    const licenseType = (this.license as ValidLicenseInfo).type ?? LicenseType.Personal

    switch (licenseType) {
      case LicenseType.Enterprise:
      case LicenseType.Personal:
      case LicenseType.Pro:
        return true

      case LicenseType.Player:
        return feature === Feature.Replay
    }
  }

  isProLicense (): boolean {
    switch (this.legacyXModuleStatus) {
      case 'pro':
        return true

      case 'checked_by_remote':
        return this.license?.status === 'on' &&
                (this.license.type === LicenseType.Pro || this.license.type === LicenseType.Enterprise)

      default:
        return false
    }
  }

  isPersonalLicense (): boolean {
    switch (this.legacyXModuleStatus) {
      case 'free':
        return true

      case 'checked_by_remote':
        return this.license?.status === 'on' &&
                this.license.type === LicenseType.Personal

      default:
        return false
    }
  }

  isPlayerLicense (): boolean {
    switch (this.legacyXModuleStatus) {
      case 'checked_by_remote':
        return this.license?.status === 'on' &&
                this.license.type === LicenseType.Player

      default:
        return false
    }
  }

  hasNoLicense (): boolean {
    switch (this.legacyXModuleStatus) {
      case 'unregistered':
        return true

      case 'checked_by_remote':
        return !this.license || this.license.status !== 'on'

      default:
        return false
    }
  }

  isLicenseExpired (): boolean {
    return this.legacyXModuleStatus === 'checked_by_remote' && this.license?.status === 'off'
  }

  getEditionName (): string {
    if (this.legacyXModuleStatus === 'checked_by_remote' && this.license?.status === 'on') {
      return this.license.name
    }

    switch (this.legacyXModuleStatus) {
      case 'free':
        return 'Personal Edition'

      case 'pro':
        return 'PRO Edition'

      case 'unregistered':
      case 'checked_by_remote':
      default:
        return 'Free Edition'
    }
  }

  getUpgradeUrl (): string {
    if (this.legacyXModuleStatus === 'checked_by_remote' && this.license?.status === 'on') {
      return this.license.upgradeUrl
    }

    switch (this.legacyXModuleStatus) {
      case 'free':
        return config.xmodulesLimit.free.upgradeUrl

      case 'pro':
        return config.xmodulesLimit.pro.upgradeUrl

      case 'unregistered':
      case 'checked_by_remote':
      default:
        return config.xmodulesLimit.unregistered.upgradeUrl
    }
  }

  getMaxOcrCalls (): number {
    if (this.legacyXModuleStatus === 'checked_by_remote' && this.license?.status === 'on') {
      return this.license.maxOcrCalls
    }

    switch (this.legacyXModuleStatus) {
      case 'free':
        return config.xmodulesLimit.free.ocrCommandCount

      case 'pro':
        return config.xmodulesLimit.pro.ocrCommandCount

      case 'checked_by_remote':
      case 'unregistered':
      default:
        return config.xmodulesLimit.unregistered.ocrCommandCount
    }
  }

  getMaxXCommandCalls (): number {
    const status = this.convertToLegacyStatus()

    switch (status) {

      case 'free':
        return config.xmodulesLimit.free.xCommandCount

      case 'pro':
        return config.xmodulesLimit.pro.xCommandCount

      case 'unregistered':
      default:
        return config.xmodulesLimit.unregistered.xCommandCount
    }
  }

  getMaxProxyCalls (): number {
    const status = this.convertToLegacyStatus()

    switch (status) {
      case 'free':
        return config.xmodulesLimit.free.proxyExecCount

      case 'pro':
        return config.xmodulesLimit.pro.proxyExecCount

      case 'unregistered':
      default:
        return config.xmodulesLimit.unregistered.proxyExecCount
    }
  }

  getMaxXFileMacros (): number {
    const status = this.convertToLegacyStatus()

    switch (status) {
      case 'free':
        return config.xmodulesLimit.free.xFileMacroCount

      case 'pro':
        return config.xmodulesLimit.pro.xFileMacroCount

      case 'unregistered':
      default:
        return config.xmodulesLimit.unregistered.xFileMacroCount
    }
  }

  private convertToLegacyStatus (): LegacyXModuleStatus {
      if (this.legacyXModuleStatus && this.legacyXModuleStatus !== 'checked_by_remote') {
        return this.legacyXModuleStatus
      }

      if (this.license?.status !== 'on') {
        return 'unregistered'
      }

      switch (this.license.type) {
        case LicenseType.Player:
        case LicenseType.Enterprise:
        case LicenseType.Pro:
          return 'pro'

        case LicenseType.Personal:
          return 'free'
      }
  }
}
