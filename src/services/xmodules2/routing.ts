import { getXModule2API } from './native'

// Since 10.0.151 the xmodule2 native host (Desktop Automation) is the ONLY
// native backend — the classic XModules generation (FileAccess, RealUser,
// DesktopAutomation, ScreenCapture hosts) is no longer supported. There is
// no routing switch anymore: every native call goes to the single-exe host,
// and when it is not installed the call fails with an install hint.
//
// The probe below only answers "is the host installed/reachable" for status
// UI (settings tabs, MCP bridge hello, AI request headers). It runs once at
// startup (and can be forced, e.g. from the settings self-test) and the
// result is read SYNCHRONOUSLY via xmodules2Active(): callers sit in deep
// promise chains where an async lookup per call would reshuffle timing.

let reachable = false
let probing: Promise<boolean> | null = null
// Native host version from the probe's get_version — '' until known /
// when no host is installed. Shown in settings, sent in the bridge hello
// and as X-UIV-XModule-Version on AI requests.
let hostVersion = ''

export function probeXModules2 (force = false): Promise<boolean> {
  if (!probing || force) {
    const remember = (v: string) => { hostVersion = String(v || ''); return true }
    // First try over the existing connection (cheap, no churn); a dead
    // connection makes every later call on it fail too, so ONE failed
    // attempt earns a reconnect-and-retry before answering false.
    probing = getXModule2API().getVersion().then(
      remember,
      () => getXModule2API().reconnect().then(api => api.getVersion()).then(
        remember,
        () => { hostVersion = ''; return false })
    )
      .then(ok => {
        reachable = ok
        // A FALSE answer must not be cached for the page's lifetime: one
        // failed probe (host still spawning, transient disconnect) left
        // every later xmodules2Active() consumer stuck on the negative
        // answer until a full page reload. Success stays memoized; failure
        // invites the next caller to retry.
        if (!ok) probing = null
        return ok
      })
  }
  return probing
}

// Kick the probe as soon as any consumer module loads.
probeXModules2()

export function xmodules2Active (): boolean {
  return reachable
}

// '' = unknown or not installed; refreshed by every probe.
export function getXModuleVersion (): string {
  return hostVersion
}

// ---------------------------------------------------------------------------
// Minimum native-host version this extension needs. Bump it whenever the
// extension starts relying on RPCs or behavior newer hosts introduced (the
// host version lives in xmodule2/host/Cargo.toml). An older host still
// connects and serves what it can — so "outdated" is a LOUD warning with a
// download prompt (run log + Settings > Desktop Automation), not a hard stop.
export const MIN_XMODULE2_VERSION = '2.1.30'

const olderThan = (a: string, b: string): boolean => {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0)
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d !== 0) return d < 0
  }
  return false
}

// True when the given (or last probed) host version is below the minimum.
// '' (not probed / not installed) is NOT outdated — the missing-host case
// already has its own install errors and status line.
export function xmoduleVersionOutdated (version: string = hostVersion): boolean {
  return !!version && olderThan(version, MIN_XMODULE2_VERSION)
}

// Download link keyed to the OS, same target the settings install link uses.
const osKey = (): string => {
  try {
    const ua = navigator.userAgent
    return /windows/i.test(ua) ? 'win' : /macintosh|mac os x/i.test(ua) ? 'mac' : 'linux'
  } catch (e) {
    return 'win'
  }
}

// Null when the host is current (or unknown); otherwise the full warning
// line, shared by the run log and any status UI that wants the text form.
// True when the connected host is known and at least `version`. Gate a call
// to an RPC newer hosts introduced on this — an unknown method makes the
// native-messaging layer reconnect the host, which is far worse than
// skipping an optional extra.
export function xmoduleVersionAtLeast (version: string): boolean {
  return !!hostVersion && !olderThan(hostVersion, version)
}

export function xmoduleOutdatedWarning (): string | null {
  if (!xmoduleVersionOutdated()) return null
  return `⚠️ UPDATE NEEDED: the installed Ui.Vision for Desktop app is v${hostVersion}, ` +
    `but this extension needs at least v${MIN_XMODULE2_VERSION}. Desktop automation commands may fail ` +
    `or misbehave until it is updated. Download the latest version: https://go.ui.vision/?help=desktop_${osKey()} ` +
    `(details: Settings > Desktop Automation)`
}

// One downgrade pointer for EVERY Version 9 feature that Version 10 dropped
// (green/pink patterns, classic XModules, ...): append it to any
// incompatibility error so the user always learns the way back.
export const V9_DOWNGRADE_URL = 'https://go.ui.vision/?help=getv9'
export const v9DowngradeNote =
  ' If you are not ready to upgrade to V10 yet, you can download Ui.Vision Version 9' +
  ` and XModules for it: ${V9_DOWNGRADE_URL}`

// Green/pink (relative) patterns are not supported by the new XModules
// generation (by design; anchor+offset replaces them). One message
// everywhere, written for BOTH human and AI macro authors: cause, file,
// migration path, and the downgrade option for users not ready for V10.
export function greenPinkUnsupportedError (fileName?: string): Error {
  return new Error(
    `E347: this macro uses a green/pink (relative) pattern${fileName ? ` ('${fileName}')` : ''}` +
    ' — not supported by Desktop Automation (the new XModules generation).' +
    ' Migrate: (a) re-capture the target as a plain image WITHOUT green/pink boxes and search/click it directly,' +
    ' or (b) convert to a JS macro and click an anchor match with a coordinate offset' +
    ' (the relative-click pattern; a table-command anchor+offset API is planned).' +
    v9DowngradeNote
  )
}
