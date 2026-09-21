import { usageStatisticsDefault } from './preferences'
import Ext from '@/common/web_extension'
import storage from '@/common/storage'
import { OPENAI_COMPAT } from '@/common/constant'
import { getInstallId } from '@/services/ai/install_id'
import { commandScopes } from '@/common/command'

const KEY = 'usageStatisticsV1'
const LAST_ATTEMPT_DAY = 'usageStatisticsLastAttemptDay'
const allowed: Record<string, Set<string>> = {
  macro: new Set(['script.ok', 'script.failed', 'script.stopped', 'classic.ok', 'classic.failed', 'classic.stopped']),
  ai: new Set(['free', 'pro', 'own-key', 'local']),
  mcp: new Set(['run_macro', 'screenshot', 'browser_snapshot', 'get_page', 'click_at', 'type_at', 'send_chat', 'create_macro', 'set_macro', 'save_macro']),
  xmodule: new Set(['used']),
  command: new Set(Object.keys(commandScopes)),
  api: new Set(['page', 'browser', 'desktop', 'ocr', 'ai', 'evaluate', 'csv', 'other'])
}
let chain: Promise<any> = Promise.resolve()
let controller: AbortController | null = null
const serial = (fn: () => Promise<any>) => { chain = chain.then(fn).catch(() => {}); return chain }

async function enabled() { return usageStatisticsDefault(await storage.get('config') || {}) }

async function clearUnsent() {
  const data = await storage.get(KEY)
  // Keep only acknowledged totals so re-enabling today cannot reset the
  // cumulative sequence and undercount new activity at the server.
  if (data?.acknowledged) await storage.set(KEY, { days: JSON.parse(JSON.stringify(data.acknowledged)), acknowledged: data.acknowledged })
  else await storage.remove(KEY)
}

async function flush() {
  if (!(await enabled())) return clearUnsent()
  const data = await storage.get(KEY)
  if (!data || !Object.keys(data.days || {}).length) return
  if (JSON.stringify(data.days) === JSON.stringify(data.acknowledged)) return
  const today = new Date().toISOString().slice(0, 10)
  if (await storage.get(LAST_ATTEMPT_DAY) === today) return
  const requestController = new AbortController()
  controller = requestController
  const timeout = setTimeout(() => requestController.abort(), 10000)
  try {
    const installId = await getInstallId()
    if (!(await enabled())) return
    // Persist before sending: worker restarts, failures and preference changes
    // must not cause more than one attempt per UTC day. Retry on a later day's
    // startup or activity; cumulative totals retain usage collected meanwhile.
    await storage.set(LAST_ATTEMPT_DAY, today)
    if (!(await enabled())) return
    // Cumulative daily counters make retries idempotent. No per-action timestamps.
    const response = await fetch(OPENAI_COMPAT.UIVISION_BASE_URL + '/usage', {
      method: 'POST', credentials: 'omit', signal: requestController.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema: 1, installId, version: Ext.runtime.getManifest().version, days: data.days })
    })
    if (response.ok && await enabled()) await storage.set(KEY, { ...data, acknowledged: JSON.parse(JSON.stringify(data.days)) })
  } finally { clearTimeout(timeout); controller = null }
}

export function startUsageStatistics() {
  Ext.runtime.onMessage.addListener((msg: any, sender: any) => {
    if (msg?.type !== 'UIV_USAGE_COUNT' || sender.id !== Ext.runtime.id ||
        !String(sender.url || '').startsWith(Ext.runtime.getURL('')) ||
        !Array.isArray(msg.counts) || msg.counts.length > 400) return
    const accepted = msg.counts.filter((item: any) => allowed[item.category]?.has(item.name) &&
      Number.isInteger(item.count) && item.count > 0 && item.count <= 1000000)
    if (!accepted.length) return
    serial(async () => {
      if (!(await enabled())) return
      const data = (await storage.get(KEY)) || { days: {} }
      const day = new Date().toISOString().slice(0, 10)
      const counts = data.days[day] || (data.days[day] = {})
      for (const item of accepted) {
        const key = item.category + ':' + item.name
        counts[key] = Math.min(1000000, (counts[key] || 0) + item.count)
      }
      const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      for (const field of ['days', 'acknowledged']) {
        for (const d of Object.keys(data[field] || {})) if (d < cutoff) delete data[field][d]
      }
      // Recheck after asynchronous reads: turning off must not recreate a queue.
      if (await enabled()) {
        await storage.set(KEY, data)
        await flush()
      }
    })
  })
  Ext.storage.onChanged.addListener((changes: any, area: string) => {
    if (area === 'local' && changes.config && !usageStatisticsDefault(changes.config.newValue)) {
      controller?.abort()
      serial(clearUnsent)
    }
  })
  // Use ordinary extension startup/activity; no scheduled background wakeups.
  serial(flush)
}
