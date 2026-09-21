// An unconfigured installation has not selected the free tier yet.
export function isFreeUsageTier(config = {}) {
  config = config || {}
  return config.aiProvider === 'uivision' && config.uivisionTier !== 'pro'
}

export function usageStatisticsDefault(config = {}) {
  config = config || {}
  if (isFreeUsageTier(config)) return true
  if (typeof config.shareUsageStatistics === 'boolean') return config.shareUsageStatistics
  return false
}
