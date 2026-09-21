// Run pictures: the last screen captures a run's VISUAL FINDERS made, kept
// for debugging (OPEN-ISSUES 18.8/18.9).
//
// No capture is ever taken for this. Image search, OCR and ai.find capture
// the screen anyway, and every such capture is written to the working files
// `__lastscreenshot.png` / `__last_desktop_screenshot.png` in the Shots
// storage; the storage layer hands each of those writes to recordRunFrame.
// A ring keeps the last three, ONE per finder call (a waiting finder retries
// every 500 ms and would otherwise fill the ring with near-identical frames),
// and at the end of the run they are written to `_run_last.png`,
// `_run_last-1.png`, `_run_last-2.png` — newest first, overwritten every
// run (leftovers of a longer earlier run are removed, the set is always one
// run's), so Shots never grows and the names can be quoted in docs and logs.
// The leading underscore sorts them to the top of the Shots list next to the
// working files, which is where users look when a run went wrong.
//
// A run that used no visual finder produces nothing here: a DOM click needs
// no picture. Anyone who wants one takes a screenshot on purpose.

export type RunFrameScope = 'browser' | 'desktop'

export type RunFrame = {
  content: any            // Blob or ArrayBuffer, exactly as the finder wrote it
  scope: RunFrameScope
  tag: string             // the step (bridge op / command index) the capture belongs to
  label: string           // human-readable step, e.g. "uiv.ocr.findText March"
  at: number
}

export const RUN_FRAME_NAMES = ['_run_last', '_run_last-1', '_run_last-2']
const SIZE = RUN_FRAME_NAMES.length

type RunKind = 'script' | 'classic'

let frames: RunFrame[] = []
let step = { tag: '', label: '' }
let active = false
let runKind: RunKind = 'classic'

// Called at the start of a run. `kind` decides whose step tags count: a JS
// script runs its classic one-command players silently, and their command
// index (always the same) would merge every finder of the script into one
// frame — so during a script run only the script runner's tags are taken.
export function startRunFrames (kind: RunKind = 'classic') {
  frames = []
  step = { tag: '', label: '' }
  active = true
  runKind = kind
}

export function isRunFramesActive () {
  return active
}

export function setRunFrameStep (tag: string, label: string, kind: RunKind = 'classic') {
  if (!active) return
  if (runKind === 'script' && kind !== 'script') return
  step = { tag: String(tag || ''), label: String(label || '').slice(0, 80) }
}

// Hooked into the Shots storage writes (services/storage/std/standard_storage.ts).
export function recordRunFrame (fileName: string, content: any) {
  if (!active || !content) return
  const m = /^(__lastscreenshot|__last_desktop_screenshot)(\.png)?$/i.exec(String(fileName || ''))
  if (!m) return
  const scope: RunFrameScope = /desktop/i.test(m[1]) ? 'desktop' : 'browser'
  const tag = step.tag || 'run'
  const last = frames[frames.length - 1]
  if (last && last.tag === tag) {
    // same finder call, later retry frame: keep only the last one
    last.content = content
    last.scope = scope
    last.label = step.label
    last.at = Date.now()
    return
  }
  frames.push({ content, scope, tag, label: step.label, at: Date.now() })
  if (frames.length > SIZE) frames.shift()
}

// Oldest first. Copies, so callers cannot disturb the ring.
export function getRunFrames (): RunFrame[] {
  return frames.slice()
}

// Called at the end of a run: writes the ring to Shots, newest first, and
// returns what was written. Stops recording — captures after this point
// (the MCP tool's own after-run picture, a user's screenshot) are not run
// frames. Best-effort: a storage error never fails a run.
export async function flushRunFrames (): Promise<{ name: string; frame: RunFrame }[]> {
  active = false
  if (!frames.length) return []
  const out: { name: string; frame: RunFrame }[] = []
  try {
    // lazy import: the storage layer imports this module for the hook, and a
    // static import back would be a cycle
    const { getStorageManager } = await import('../services/storage')
    const storage = getStorageManager().getScreenshotStorage()
    const newestFirst = frames.slice().reverse().slice(0, SIZE)
    // Written OLDEST first. The Shots list shows each file's WRITE time (the
    // storage keeps no capture time), and writing newest-first stamped
    // _run_last.png a second OLDER than _run_last-2.png — the order the
    // names promise was contradicted by the timestamps beside them (user
    // report 2026-09-05). Oldest-first makes the write order the capture
    // order; the capture clock time itself is in the run-end log line.
    const written: boolean[] = []
    for (let i = newestFirst.length - 1; i >= 0; i--) {
      try {
        await storage.overwrite(RUN_FRAME_NAMES[i] + '.png', newestFirst[i].content)
        written[i] = true
      } catch (e) { /* best-effort */ }
    }
    for (let i = 0; i < newestFirst.length; i++) {
      if (written[i]) out.push({ name: RUN_FRAME_NAMES[i] + '.png', frame: newestFirst[i] })
    }
    // A run with fewer captures than the last one must not leave the older
    // run's -1/-2 behind as if they belonged to this run: same report — a
    // one-finder run showed a fresh _run_last.png next to two pictures from
    // two minutes earlier. The set is always ONE run's.
    for (let i = newestFirst.length; i < SIZE; i++) {
      try { await storage.removeFile(RUN_FRAME_NAMES[i] + '.png') } catch (e) { /* not there */ }
    }
  } catch (e) { /* best-effort */ }
  return out
}

// One log line for the run end, shared by the script runner and the player.
export function describeRunFrames (written: { name: string; frame: RunFrame }[]): string {
  if (!written.length) return ''
  const clock = (t: number) => {
    const d = new Date(t)
    const two = (n: number) => (n < 10 ? '0' + n : String(n))
    return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`
  }
  return `run pictures in Shots (newest first): ${written.map(w => `${w.name} ← ${w.frame.label || w.frame.tag} @${clock(w.frame.at)}`).join(' | ')} — the screen as the last visual finders saw it (the Shots list shows write times, the @times are the captures)`
}
