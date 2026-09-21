import React, { useEffect, useState } from 'react'
import { Select, Progress, Tooltip } from 'antd'
import { OPENAI_COMPAT } from '@/common/constant'
import { getInstallId, getProKey, isProTier, uivInstallHeader } from '@/services/ai/uivision_free_tier'

export default function AIEnginePicker({ config, updateConfig, disabled = false }: any) {
  const [quota, setQuota] = useState<any>(null)
  const [now, setNow] = useState(Date.now())
  const active = config.aiProvider === 'uivision'
  const accountKey = isProTier(config) ? getProKey(config) : ''
  useEffect(() => {
    setQuota(null)
    if (!active) return
    let disposed = false
    let controller: AbortController | null = null
    let inFlight = false
    const refresh = async () => {
      setNow(Date.now())
      if (inFlight) return
      inFlight = true
      const requestController = new AbortController()
      controller = requestController
      const timeout = setTimeout(() => requestController.abort(), 10000)
      try {
        const key = accountKey || await getInstallId()
        const response = await fetch(OPENAI_COMPAT.UIVISION_BASE_URL + '/allowance', {
          signal: requestController.signal, credentials: 'omit',
          headers: { Authorization: 'Bearer ' + key, ...uivInstallHeader(OPENAI_COMPAT.UIVISION_BASE_URL) }
        })
        if (response.ok) {
          const data = await response.json()
          if (!disposed) setQuota(data)
        }
      } catch (_) { /* A failed status check must not disable chat. */ }
      finally { clearTimeout(timeout); inFlight = false }
    }
    refresh()
    const timer = setInterval(refresh, 30000)
    window.addEventListener('uiv-allowance-changed', refresh)
    return () => { disposed = true; controller?.abort(); clearInterval(timer); window.removeEventListener('uiv-allowance-changed', refresh) }
  }, [active, accountKey])
  if (!active) return null
  const valid = quota && Number.isFinite(quota.remainingPercent) && Number.isFinite(Number(quota.resetAt)) && Number(quota.resetAt) > now
  const usedPercent = valid ? Math.max(0, Math.min(100, 100 - quota.remainingPercent)) : 0
  const hours = valid ? Math.max(1, Math.ceil((quota.resetAt - now) / 3600000)) : null
  const usageText = valid ? `${Math.round(usedPercent)}% used · Resets in ${hours} ${hours === 1 ? 'hour' : 'hours'}` : 'Usage unavailable'
  const aiIcon = (smarter: boolean) => <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 9, fontWeight: 700, lineHeight: '16px', width: 26, border: '1px solid currentColor', borderRadius: 4 }}>
    AI<svg width="8" height="10" viewBox="0 0 12 14" fill="currentColor">
      <path d={smarter ? 'M6 0L7.7 4.9L12 7L7.7 9.1L6 14L4.3 9.1L0 7L4.3 4.9Z' : 'M7 0L1 8H5L4 14L11 5H7Z'} />
    </svg>
  </span>
  return <><Select aria-label="Chat engine" className="chat-engine-picker" variant="borderless" disabled={disabled} value={config.uivisionEngine === 'advanced' ? 'advanced' : 'standard'}
    popupMatchSelectWidth={false} placement="topRight" onChange={uivisionEngine => updateConfig({ uivisionEngine })}
    options={[
      { value: 'standard', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{aiIcon(false)}Faster</span> },
      { value: 'advanced', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{aiIcon(true)}Smarter</span> }
    ]}
    optionRender={option => <div>
      <strong>{option.label}</strong>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{option.value === 'advanced' ? 'Complex macros and debugging' : 'Simple tasks and quick edits'}</div>
    </div>}
    dropdownRender={menu => <div style={{ width: 250, maxWidth: 'calc(100vw - 40px)' }}>
      {menu}
      {valid && quota.remainingPercent <= 0 && <div style={{ padding: '8px 12px', fontSize: 12 }}>
        <a href="https://go.ui.vision/?help=aipro" target="_blank" rel="noreferrer">Daily allowance used — explore AI PRO</a>
      </div>}
    </div>}
  />
    {/* Anchor inward: a centered popup at the right edge can create a horizontal scrollbar. */}
    <Tooltip title={usageText} trigger={['hover', 'focus']} placement="topRight"
      overlayStyle={{ maxWidth: 'calc(100vw - 24px)' }}>
      <span className="chat-usage-meter" role="img" tabIndex={0} aria-label={usageText}>
        <Progress aria-hidden="true" type="circle" size={22} strokeWidth={9} percent={usedPercent} showInfo={false}
          strokeColor={valid && usedPercent >= 85 ? '#c47b36' : 'currentColor'}
          trailColor="var(--chat-usage-trail, #e5e7eb)" />
      </span>
    </Tooltip>
  </>
}
