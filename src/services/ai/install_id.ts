import storage from '@/common/storage'
const INSTALL_ID_STORAGE_KEY = 'uivisionAIInstallId'

let cachedInstallId: string | null = null

// 20 chars [A-Za-z0-9] containing the "4499" marker the proxy validates
const generateInstallId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let id = ''
  for (let i = 0; i < 16; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id.slice(0, 8) + '4499' + id.slice(8)
}

export const getInstallId = async (): Promise<string> => {
  if (cachedInstallId) return cachedInstallId
  const stored = await storage.get(INSTALL_ID_STORAGE_KEY)
  if (typeof stored === 'string' && stored.length > 0) {
    cachedInstallId = stored
    return stored
  }
  const id = generateInstallId()
  cachedInstallId = id
  await storage.set(INSTALL_ID_STORAGE_KEY, id)
  return id
}

// getAIProviderConfig() is synchronous, so the ID must be available without
// awaiting. The module-load warm-up below makes that the normal case; the
// generate-first fallback only covers AI use before the warm-up finished, and
// still keeps a previously stored ID once the read returns.
export const getInstallIdSync = (): string => {
  if (cachedInstallId) return cachedInstallId
  const tentative = generateInstallId()
  cachedInstallId = tentative
  storage
    .get(INSTALL_ID_STORAGE_KEY)
    .then((stored: any) => {
      if (typeof stored === 'string' && stored.length > 0) {
        cachedInstallId = stored
      } else {
        return storage.set(INSTALL_ID_STORAGE_KEY, tentative)
      }
    })
    .catch(() => {})
  return tentative
}

getInstallId().catch(() => {})
