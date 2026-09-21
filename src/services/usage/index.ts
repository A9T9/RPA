import { usageStatisticsDefault } from './preferences'
import Ext from '@/common/web_extension'

const pending = new Map<string, { category: string; name: string; count: number }>()
let timer: ReturnType<typeof setTimeout> | null = null
let enabled = false
let preferenceRevision = 0
Ext.storage.local.get('config').then((data: any) => {
  if (preferenceRevision === 0) enabled = usageStatisticsDefault(data.config)
}).catch(() => {})
Ext.storage.onChanged.addListener((changes: any, area: string) => {
  if (area !== 'local' || !changes.config) return
  preferenceRevision++
  enabled = usageStatisticsDefault(changes.config.newValue)
  if (!enabled) {
    pending.clear()
    if (timer) clearTimeout(timer)
    timer = null
  }
})
// Coalesce busy macro loops so measurement does not add storage work per command.
export function reportUsage(category: string, name: string) {
  if (!enabled) return
  const key = category + ':' + name
  const previous = pending.get(key)
  if (previous) previous.count = Math.min(1000000, previous.count + 1)
  else if (pending.size < 400) pending.set(key, { category, name, count: 1 })
  if (timer) return
  timer = setTimeout(() => {
    const counts = [...pending.values()]
    pending.clear()
    timer = null
    Ext.runtime.sendMessage({ type: 'UIV_USAGE_COUNT', counts }).catch(() => {})
  }, 1000)
}
