
export type LegacyXModuleStatus = 'unregistered' | 'free' | 'pro' | 'checked_by_remote'

export enum LicenseType {
  Enterprise = 'ui-ee',
  Personal = 'ui-personal',
  Player = 'ui-player',
  Pro = 'ui-pro'
}

export type LicenseStatus = 'on' | 'off' | 'key_not_found'

export type InvalidLicenseInfo = {
  status: 'key_not_found'
}

export type ExpiredLicenseInfo = {
  status: 'off';
  type: LicenseType;
}

export type ValidLicenseInfo = {
  name:         string;
  type:         LicenseType;
  status:       'on';
  upgradeUrl:   string;
  maxOcrCalls:  number;
}

export type LicenseKeyInfo = {
  licenseKey: string;
}

export type LicenseInfo = LicenseKeyInfo & (ValidLicenseInfo | InvalidLicenseInfo | ExpiredLicenseInfo)

export enum Feature {
  Replay,
  Record,
  Edit
}

export interface ILicenseService {
  checkLicense (license: string): Promise<LicenseInfo>;
  recheckLicenseIfPossible (): Promise<boolean>;
  getLatestInfo (): Promise<LicenseInfo | null>;
  canPerform (feature: Feature): boolean;
  hasNoLicense (): boolean;
  isLicenseExpired (): boolean;
  isPersonalLicense (): boolean;
  isPlayerLicense (): boolean;
  isProLicense (): boolean;
  getEditionName (): string;
  getUpgradeUrl (): string;
  getMaxOcrCalls (): number;
  getMaxXCommandCalls (): number;
  getMaxProxyCalls (): number;
  getMaxXFileMacros (): number;
}
