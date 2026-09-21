import React from 'react'
import { Button, Tag, message } from 'antd'
import csIpc from '@/common/ipc/ipc_cs'
import { compatibilityState, compatibilityEnvironment, runCompatibilityCheck } from '@/services/visual_compatibility'
import { environmentKey, reportStatus, colorsCorrected, colorVerdict, worstPatch } from '@/services/visual_compatibility/analyze'

// autoRun: a token; each new value starts one check without a click (the
// self-test runner sets it). onResult gets the report or the error text.
export default function VisualCompatibility ({ config, onBusy, autoRun, onResult }: { config: any, onBusy: (busy: boolean) => void, autoRun?: string | null, onResult?: (r: { report?: any, error?: string }) => void }) {
  const [report, setReport] = React.useState<any>(null)
  const [scope, setScope] = React.useState('this machine')
  const [stale, setStale] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [progress, setProgress] = React.useState('')
  const [error, setError] = React.useState('')
  const controller = React.useRef<AbortController | null>(null)
  const refresh = async () => {
    try {
      const state = await compatibilityState()
      const environment = await compatibilityEnvironment(state)
      const reports = (state.reports || []).filter((r: any) => r.profileId === state.profileId)
      const last = reports[reports.length - 1] || null
      setReport(last); setStale(!!last && last.environmentKey !== environmentKey(environment))
      setScope(state.storage === 'machine' ? 'this machine' : 'this browser profile')
    } catch (e: any) { setError(String(e?.message || e)) }
    finally { setLoading(false) }
  }
  React.useEffect(() => {
    refresh()
    const onFocus = () => { if (!controller.current) refresh() }
    window.addEventListener('focus', onFocus)
    return () => { controller.current?.abort(); window.removeEventListener('focus', onFocus) }
  }, [])
  const run = async () => {
    const c = new AbortController(); controller.current = c
    setBusy(true); onBusy(true); setError('')
    try { const r = await runCompatibilityCheck(config, c.signal, setProgress, () => c.abort()); setReport(r); setStale(false); onResult?.({ report: r }) }
    catch (e: any) { setError(String(e?.message || e)); onResult?.({ error: String(e?.message || e) }) }
    finally { controller.current = null; setBusy(false); onBusy(false); setProgress(''); refresh() }
  }
  const lastAuto = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!autoRun || loading || autoRun === lastAuto.current) return
    lastAuto.current = autoRun
    run()
  }, [autoRun, loading])
  const verdict = (value: string) => value === 'pass' ? 'Passed' : value === 'corrected' ? 'Corrected' : value === 'mismatch' ? 'Differs' : 'Not checked'
  // Status from the paths, not the saved word: a report saved before the
  // "Corrected" rule existed still says "Needs attention" for a colour-managed display.
  const status = report ? reportStatus(report.paths) : ''
  const corrected = !!report && colorsCorrected(report.paths)
  return <section aria-label="Visual compatibility" style={{ marginTop: 24, padding: 16, border: '1px solid #d9d9d9', borderRadius: 8 }}>
    <h4 style={{ marginTop: 0 }}>Visual compatibility</h4>
    <p>Check colors, scaling, and browser screenshot coordinates on this display. The browser and desktop app briefly show a test chart.</p>
    <Button type="primary" onClick={run} loading={busy} disabled={loading} data-testid="check-visual-compatibility">Check visual compatibility</Button>
    {busy && <Button onClick={() => controller.current?.abort()} style={{ marginLeft: 8 }}>Cancel</Button>}
    <div role="status" aria-live="polite" style={{ marginTop: 10 }}>
      {busy ? progress : loading ? 'Reading saved results…' : report ? <><Tag color={stale ? 'orange' : status === 'Checks passed' ? 'green' : 'orange'}>{stale ? 'Check again — settings changed' : status}</Tag>Last checked on {scope}: {new Date(report.checkedAt).toLocaleString()}</> : `Not checked on ${scope} yet.`}
    </div>
    {error && <p role="alert" style={{ color: '#cf1322', marginTop: 10 }}>{error}</p>}
    {report && <>
      <table style={{ width: '100%', marginTop: 12, textAlign: 'left' }}>
        <thead><tr><th>Capture path</th><th>Colors</th><th>Scaling</th></tr></thead>
        <tbody>{report.paths.map((p: any) => <tr key={p.id}><td style={{ padding: '6px 0' }}>{p.label}</td><td>{verdict(colorVerdict(p, report.paths))}</td><td>{verdict(p.geometry?.status)}</td></tr>)}</tbody>
      </table>
      {corrected && <p style={{ marginTop: 6 }}>Corrected: this display is color-managed, so the browser renders CSS colors through the monitor profile and the desktop app does not. Desktop-scope findImage and findColor of browser content see the on-screen values, not the CSS values; read them with uiv.pixels, or force the browser to sRGB.</p>}
      {report.paths.filter((p: any) => p.error).map((p: any) => <p key={p.id}><b>{p.label}:</b> {p.error}</p>)}
      <details style={{ marginTop: 10 }}><summary>Measurement details</summary>
        {report.paths.filter((p: any) => p.geometry).map((p: any) => <div key={p.id} style={{ marginTop: 10 }}><b>{p.label}</b><div>Scale: {p.geometry.scaleX.toFixed(3)} × {p.geometry.scaleY.toFixed(3)} pixels per logical pixel; expected {p.geometry.expectedScale.toFixed(3)}. Largest color channel difference: {p.color.maxError}/255 (allowed {p.color.tolerance}){p.color.maxError > p.color.tolerance ? ': ' + worstPatch(p.color) : ''}.</div>{p.coordinates && <div>Browser coordinates: {verdict(p.coordinates.status)} ({p.coordinates.errorPx.toFixed(2)} pixels difference).</div>}</div>)}
        <p>Mouse and keyboard delivery are covered by the separate input tests. This report does not establish color accuracy for every other application.</p>
        <Button size="small" onClick={async () => {
          const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
          try { await csIpc.ask('PANEL_DOWNLOAD_URL', { url, filename: 'uivision-visual-compatibility.json' }); message.success('Results saved — check your downloads.') }
          catch (e: any) { message.error(String(e?.message || e)) }
          finally { URL.revokeObjectURL(url) }
        }}>Save results</Button>
        <Button size="small" style={{ marginLeft: 8 }} onClick={() => navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => message.success('Results copied.'), e => message.error(String(e)))}>Copy results</Button>
      </details>
      <p style={{ marginTop: 10, marginBottom: 0 }}>Results are saved locally{report.file ? ' in ' + report.file : ''}. Ui.Vision applies no color correction. Run again after changing displays, HDR, or color profiles.</p>
    </>}
  </section>
}
