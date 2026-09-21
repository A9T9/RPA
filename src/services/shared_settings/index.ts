// Shared settings files in the XModule home folder (OPEN-ISSUES 38).
//
// With the Desktop Automation module installed, two JSON files next to the
// macros are the source of truth for the machine-level settings — read by
// this extension AND by the desktop helper app (Ui.Vision for Desktop):
//   <home>/settings.json   the shareable subset (no secrets)
//   <home>/keys.json       API keys (kept apart so settings.json can travel)
// Browser storage stays the boot copy: the extension needs its config before
// the native host answers, so the files are MIRRORED into config, not used
// in its place. Conflict rule: the file wins when its modification time is
// newer than our last write (config.sharedSettingsWrittenAt); we write the
// files whenever a shared key changes in config. Unknown keys in the files
// survive a rewrite; a file that does not parse is reported and left alone.
import { getXModule2API } from '@/services/xmodules2/native'
import { getXFile } from '@/services/xmodules/xfile'
import { probeXModules2 } from '@/services/xmodules2/routing'

export const FREE_TIER_KEY = 'ui-vision-ai-free'
export const SETTINGS_FILE = 'settings.json'
export const KEYS_FILE = 'keys.json'

// the shareable subset of the extension config (extension key names = the
// file's key names; the desktop app reads the same names)
export const SHARED_SETTINGS_KEYS = [
  'storageMode', 'macroDir',
  'ocrEngine', 'ocrMode', 'ocrLanguage',
  'aiProvider', 'uivisionTier', 'anthropicModel', 'openRouterModel', 'localAIBaseURL', 'localAIModel',
  'mcpBridgeEnabled', 'mcpBridgePort',
  'desktopAppEnabled',
  'failsafeCorner', 'playDesktopAnimations'
]

// keys.json slot -> extension config key holding that secret
export const KEY_SLOTS: { [slot: string]: string } = {
  uivisionAi: 'uivisionProKey',
  openrouter: 'openRouterAPIKey',
  anthropic: 'anthropicAPIKey',
  ocrSpace: 'ocrSpaceApiKey'
}

// "no key / free tier" — the placeholder shipped in keys.json counts as empty
export const isFreeTierKey = (k: any): boolean => {
  const s = String(k || '').trim()
  return s === '' || s.toLowerCase() === FREE_TIER_KEY
}

type Paths = {
  homeDir: string
  settingsPath: string
  keysPath: string
  settingsMtime: number | null
  keysMtime: number | null
}

const joinPath = (dir: string, file: string): string => {
  const sep = dir.indexOf('\\') >= 0 && dir.indexOf('/') < 0 ? '\\' : '/'
  return dir.replace(/[\\/]+$/, '') + sep + file
}

// Host ≥ 2.1.0 answers get_settings_paths (with mtimes); older hosts only
// give us the home folder the extension chose itself.
export const getPaths = async (): Promise<Paths | null> => {
  const api = getXModule2API()
  try {
    const p: any = await api.invoke('get_settings_paths', {})
    if (p && p.settingsPath) {
      return {
        homeDir: p.homeDir, settingsPath: p.settingsPath, keysPath: p.keysPath,
        settingsMtime: typeof p.settingsMtime === 'number' ? p.settingsMtime : null,
        keysMtime: typeof p.keysMtime === 'number' ? p.keysMtime : null
      }
    }
  } catch (e) { /* older host */ }
  const rootDir = (getXFile().getCachedConfig() || {}).rootDir
  if (!rootDir) return null
  return { homeDir: rootDir, settingsPath: joinPath(rootDir, SETTINGS_FILE), keysPath: joinPath(rootDir, KEYS_FILE), settingsMtime: null, keysMtime: null }
}

const readText = async (path: string): Promise<string | null> => {
  const api = getXModule2API()
  try {
    const exists: any = await api.invoke('file_exists', { path })
    if (exists === false || (exists && exists.exists === false)) return null
    const r: any = await api.invoke('read_all_text', { path })
    return typeof r === 'string' ? r : (r && typeof r.content === 'string' ? r.content : null)
  } catch (e) {
    return null
  }
}

const writeText = async (path: string, text: string): Promise<void> => {
  const api = getXModule2API()
  const dir = path.replace(/[\\/][^\\/]*$/, '')
  try { await api.invoke('create_directory', { path: dir }) } catch (e) { /* exists */ }
  await api.invoke('write_all_text', { path, content: text })
}

const parse = (text: string | null, what: string): { obj: any | null, error?: string } => {
  if (text === null) return { obj: null }
  try {
    const v = JSON.parse(text.replace(/^﻿/, ''))
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { obj: null, error: `${what} is not a JSON object — left untouched` }
    return { obj: v }
  } catch (e: any) {
    return { obj: null, error: `${what} has invalid JSON (${e.message}) — left untouched, fix it and save again` }
  }
}

const pickShared = (config: any): { [k: string]: any } => {
  const out: { [k: string]: any } = {}
  for (const k of SHARED_SETTINGS_KEYS) if (config[k] !== undefined) out[k] = config[k]
  return out
}

const keysFromConfig = (config: any): { [slot: string]: string } => {
  const out: { [slot: string]: string } = {}
  for (const slot of Object.keys(KEY_SLOTS)) {
    const v = String(config[KEY_SLOTS[slot]] || '').trim()
    // the free-tier placeholder keeps the shipped file self-explaining
    out[slot] = slot === 'uivisionAi' && v === '' ? FREE_TIER_KEY : v
  }
  return out
}

const stable = (o: any): string => JSON.stringify(o, Object.keys(o).sort())

export type SyncResult = {
  direction: 'pulled' | 'pushed' | 'seeded' | 'none'
  changed: string[]
  errors: string[]
  paths: Paths | null
}

// Boot-time reconciliation. `updateConfig` receives the keys to change in
// config (called at most once). Returns what happened, for the Settings tab.
export const pullSharedSettings = async (config: any, updateConfig: (patch: any) => void): Promise<SyncResult> => {
  const errors: string[] = []
  const paths = await getPaths()
  if (!paths) return { direction: 'none', changed: [], errors: ['no home folder yet'], paths: null }

  const sText = await readText(paths.settingsPath)
  const kText = await readText(paths.keysPath)
  const s = parse(sText, SETTINGS_FILE)
  const k = parse(kText, KEYS_FILE)
  if (s.error) errors.push(s.error)
  if (k.error) errors.push(k.error)

  // nothing on disk yet: seed both files from the config we have
  if (sText === null && !s.error) {
    await writeText(paths.settingsPath, JSON.stringify(pickShared(config), null, 2) + '\n')
    if (kText === null) await writeText(paths.keysPath, JSON.stringify(keysFromConfig(config), null, 2) + '\n')
    updateConfig({ sharedSettingsWrittenAt: Date.now() })
    return { direction: 'seeded', changed: SHARED_SETTINGS_KEYS.slice(), errors, paths }
  }

  const writtenAt: number = Number(config.sharedSettingsWrittenAt || 0)
  const fileNewer = (mtime: number | null) => mtime === null ? true : mtime > writtenAt + 1500
  const patch: any = {}
  const changed: string[] = []

  if (s.obj && fileNewer(paths.settingsMtime)) {
    for (const key of SHARED_SETTINGS_KEYS) {
      if (s.obj[key] !== undefined && stable({ v: s.obj[key] }) !== stable({ v: config[key] })) { patch[key] = s.obj[key]; changed.push(key) }
    }
  }
  if (k.obj && fileNewer(paths.keysMtime)) {
    for (const slot of Object.keys(KEY_SLOTS)) {
      if (k.obj[slot] === undefined) continue
      const raw = String(k.obj[slot] || '').trim()
      const val = slot === 'uivisionAi' && isFreeTierKey(raw) ? '' : raw
      const cfgKey = KEY_SLOTS[slot]
      if (val !== String(config[cfgKey] || '').trim()) { patch[cfgKey] = val; changed.push(cfgKey) }
    }
    if (patch.uivisionProKey !== undefined) patch.uivisionTier = patch.uivisionProKey ? 'pro' : 'free'
  }
  if (changed.length) {
    patch.sharedSettingsWrittenAt = Date.now()
    updateConfig(patch)
    return { direction: 'pulled', changed, errors, paths }
  }
  return { direction: 'none', changed, errors, paths }
}

let lastPushed = ''
// Write the shared subset + keys after a config change (debounced by
// content: nothing is written when the subset did not change). Merge into
// the files so unknown keys survive; never touch a file that does not parse.
export const pushSharedSettings = async (config: any): Promise<SyncResult> => {
  const errors: string[] = []
  const subset = pickShared(config)
  const keys = keysFromConfig(config)
  const sig = stable(subset) + '|' + stable(keys)
  if (sig === lastPushed) return { direction: 'none', changed: [], errors, paths: null }
  const paths = await getPaths()
  if (!paths) return { direction: 'none', changed: [], errors: ['no home folder yet'], paths: null }

  const s = parse(await readText(paths.settingsPath), SETTINGS_FILE)
  const k = parse(await readText(paths.keysPath), KEYS_FILE)
  if (s.error) errors.push(s.error)
  if (k.error) errors.push(k.error)
  const changed: string[] = []
  if (!s.error) {
    const merged = Object.assign({}, s.obj || {}, subset)
    if (stable(merged) !== stable(s.obj || {})) { await writeText(paths.settingsPath, JSON.stringify(merged, null, 2) + '\n'); changed.push(SETTINGS_FILE) }
  }
  if (!k.error) {
    const merged = Object.assign({}, k.obj || {}, keys)
    if (stable(merged) !== stable(k.obj || {})) { await writeText(paths.keysPath, JSON.stringify(merged, null, 2) + '\n'); changed.push(KEYS_FILE) }
  }
  lastPushed = sig
  return { direction: changed.length ? 'pushed' : 'none', changed, errors, paths }
}

// Fire-and-forget hook for config writers (saveConfig): only when the
// module answers, never blocking the UI, errors to the console only.
let pushTimer: any = null
// `markWritten(ts)` records the write time in config (sharedSettingsWrittenAt)
// so the next pull knows which side is newer; that config write comes back
// through saveConfig, but its subset is unchanged, so it stops here.
export const scheduleSharedSettingsPush = (config: any, markWritten?: (ts: number) => void): void => {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    probeXModules2().then(active => {
      if (!active) return
      return pushSharedSettings(config).then(r => {
        if (r.errors.length) console.warn('shared settings:', r.errors.join('; '))
        if (r.direction === 'pushed' && markWritten) markWritten(Date.now())
      })
    }).catch(e => console.warn('shared settings push failed', e))
  }, 800)
}
