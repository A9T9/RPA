import axios, { AxiosError } from 'axios'
import config from '@/config'
import { urlWithQueries } from '@/common/ts_utils'
import { LicenseInfo, LicenseType } from '@/services/license/types'

export type CheckLicenseParams = {
  licenseKey: string;
  version: string;
}

export type ValidLicenseResult = {
  data1a: string;
  data1b: string;
  data2a: string;
  data2b: string;
  status: 'on';
  product: LicenseType
}

export type ExpiredValidLicenseResult = {
  status: 'off';
  product: LicenseType;
}

export type InvalidLicenseResult = {
  status: 'key_not_found';
}

export type CheckLicenseResult = ValidLicenseResult | ExpiredValidLicenseResult | InvalidLicenseResult

export function isNetworkError (error: AxiosError): boolean {
  return error.message === 'Network Error'
}

export function convertToLicenseInfo (result: CheckLicenseResult, licenseKey: string): LicenseInfo {
  switch (result.status) {
    case 'key_not_found':
      return { licenseKey, status: 'key_not_found' }

    case 'off':
      return { licenseKey, status: 'off', type: result.product }

    case 'on':
      return {
        licenseKey,
        status:       'on',
        type:         result.product,
        name:         result.data1a,
        upgradeUrl:   result.data1b,
        maxOcrCalls:  parseInt(result.data2b)
      }
  }
}

export function checkLicense (params: CheckLicenseParams): Promise<LicenseInfo> {
  const url = urlWithQueries(config.license.api.url, {
    version:    params.version,
    licensekey: params.licenseKey
  })

  return axios.get(url).then(res => {
    const result = res.data as CheckLicenseResult
    return convertToLicenseInfo(result, params.licenseKey)
  })
  .catch((e: AxiosError) => {
    if (e.response) {
      throw new Error((e.response.data as string))
    }

    return Promise.reject(e)
  })
}
