// Execution locality is source-line coverage, not elapsed time or network bytes.
// Only actual AI/OCR requests mark a line cloud; normal website access is local
// automation. Repeated visits/retries count the same source line once.
const runs = new Map()

export function startExecutionLocality (id, reset = false) {
  if (reset) {
    for (const run of runs.values()) run.active = false
    runs.clear()
  }
  runs.set(id, { active: true, lines: new Set(), cloud: new Set(), current: null })
}

export function visitExecutionLine (key) {
  if (key == null) return
  for (const run of runs.values()) {
    run.current = key
    run.lines.add(key)
  }
}

export function visitScriptExecutionLine (interp, describeLine) {
  const stack = interp.getStateStack()
  for (let i = stack.length - 1; i >= 0; i--) {
    const node = stack[i].node
    if (!node || !node.loc || node.loc.source !== 'code' || /^(Program|BlockStatement|EmptyStatement)$/.test(node.type)) continue
    const line = describeLine(node.loc.start.line)
    if (line) {
      visitExecutionLine('script:' + line)
      return
    }
  }
}

// Capture attribution before asynchronous preparation. A late request from an
// ended run must never charge a later run. The provider is the resolved provider
// used by the request, not a guess from the macro name or current settings.
export function captureExecutionCloudCall (provider) {
  const targets = provider === 'local' ? [] : Array.from(runs.values(), run => [run, run.current])
  return () => {
    for (const [run, line] of targets) {
      if (!run.active) continue
      const key = line == null ? 'unattributed cloud request' : line
      run.lines.add(key)
      run.cloud.add(key)
    }
  }
}

export function finishExecutionLocality (id, clear = false) {
  const run = runs.get(id)
  let summary = ''
  if (run) {
    // Do not round a small nonzero cloud share up to "100% local".
    const percent = run.cloud.size === 0 ? 100 : Math.min(99, Math.round(100 * (1 - run.cloud.size / run.lines.size)))
    summary = `${percent}% local execution${run.cloud.size === 0 ? ', no cloud used' : ''}`
    run.active = false
    runs.delete(id)
  }
  if (clear) {
    for (const remaining of runs.values()) remaining.active = false
    runs.clear()
  }
  return summary
}
