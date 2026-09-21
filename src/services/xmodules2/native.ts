import { NativeMessagingHost } from '../native_host'

// Client for the xmodule2 native host: ONE host name, ONE exe, the union of
// all method families (xfile + xy + cv + ocr). Dev install:
// xmodule2/install/install-dev.{ps1,sh}. Unlike the old hosts, errors come
// back as error RESPONSES and the connection stays usable — no reconnect
// dance needed (the reconnect() here exists only for parity with old code).
export const XMODULE2_HOST_NAME = 'com.a9t9.uivision.xmodule2'

class XModule2Host extends NativeMessagingHost {
  constructor () {
    super(XMODULE2_HOST_NAME)
  }
}

export type PermissionStatus = {
  accessibility: boolean;
  screenRecording: boolean;
}

export type OcrWord = { text: string; rect: { x: number; y: number; width: number; height: number } }
export type OcrResult = { text: string; lines: Array<{ text: string; words: OcrWord[] }> }

export type RunProcessResult = {
  exitCode: number | null;
  stdout?: string;
  stderr?: string;
  outputTruncated?: boolean;
}

export interface XModule2API {
  invoke: (method: string, params?: any) => Promise<any>;
  getVersion: () => Promise<string>;
  getPermissionStatus: () => Promise<PermissionStatus>;
  // Fires the OS permission dialog for one kind; `granted` reflects the
  // state in the CURRENT host process — after a fresh Allow, reconnect()
  // and re-check, because macOS only applies grants to new processes.
  requestPermission: (kind: 'accessibility' | 'screenRecording') => Promise<{ kind: string; granted: boolean }>;
  openPermissionPane: (kind: 'accessibility' | 'screenRecording') => Promise<boolean>;
  ocrImage: (params: { content?: string; path?: string; language?: string; engine?: 'ocrs' }) => Promise<OcrResult>;
  ocrLanguageList: () => Promise<string[]>;
  runProcess: (params: { fileName: string; arguments?: string; waitForExit?: boolean }) => Promise<RunProcessResult>;
  searchRelative: (params: any) => Promise<any>;
  reconnect: () => Promise<XModule2API>;
}

export type HostConnectDiagnosis = { title: string; detail: string }

// An Error that carries the browser's raw connectNative reason and its
// diagnosis, so UI can show advice instead of the bare message.
export type HostConnectError = Error & { connectError?: string; diagnosis?: HostConnectDiagnosis }

export function currentOsKey (): 'win' | 'mac' | 'linux' {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  return /windows/i.test(ua) ? 'win' : /mac/i.test(ua) ? 'mac' : 'linux'
}

// The diagnosis attached to an error by the connect path, or null when the
// error is something else (rootDir missing, folder not writable ...).
export function hostConnectDiagnosisOf (e: any): HostConnectDiagnosis | null {
  return (e && e.diagnosis && e.diagnosis.title) ? e.diagnosis as HostConnectDiagnosis : null
}

// The browser says WHY connectNative failed only as a prose string in
// chrome.runtime.lastError. Map the known strings to advice the user can act
// on — each class has a different fix, and "not installed" is the wrong
// answer for most of them (policy-blocked, allowlist-mismatched and
// AV-quarantined installs all LOOK "not installed" without this). Matched
// loosely because Chrome, Edge and Firefox each word them differently.
export function diagnoseHostConnectError (raw: string, os: 'win' | 'mac' | 'linux'): HostConnectDiagnosis {
  const msg = (raw || '').toLowerCase()
  const report = `Browser reports: "${raw}"`

  // Chrome/Edge: "Specified native messaging host not found."
  // Firefox: "No such native application com.a9t9.uivision.xmodule2"
  if (msg.indexOf('not found') >= 0 || msg.indexOf('no such native application') >= 0) {
    return {
      title: 'Native host not registered with this browser',
      detail:
        'The Desktop Automation app is not installed — or it is installed but this browser cannot see it. If you DID install it:\n' +
        '• Fully quit and reopen the browser (all windows — a new tab is not enough).\n' +
        (os === 'win'
          ? '• Install under the SAME Windows account the browser runs as — running the installer "as administrator" from a different account registers it for that account instead.\n' +
            '• Does your Windows user name contain a letter outside A–Z (ä, ö, é, ß …)? Desktop Automation installers before 2.1.31 then wrote a registration file the browsers cannot read — install 2.1.31 or newer, it rewrites the file. Double-clicking uivision-app.exe in %LOCALAPPDATA%\\UI.Vision\\DesktopAutomation shows the install self-check.\n' +
            '• On company-managed computers, Chrome/Edge can be set to ignore per-user hosts (NativeMessagingUserLevelHosts) or block them outright — look for native messaging entries in chrome://policy or edge://policy.\n'
          : '• Install for the same user account the browser runs as.\n') +
        report
    }
  }

  // Chrome/Edge: "Access to the specified native messaging host is forbidden."
  // (extension id missing from allowed_origins, or the host is blocklisted
  // by policy). Firefox words the allowlist case as a permission complaint.
  if (msg.indexOf('forbidden') >= 0 || msg.indexOf('does not have permission') >= 0) {
    return {
      title: 'Native host installed, but it refuses this extension',
      detail:
        "The host is registered, but this extension's ID is not on its allowlist — almost always an outdated Desktop Automation install. Reinstall the latest version, then fully restart the browser. On company-managed computers this can also be a NativeMessagingBlocklist policy (chrome://policy / edge://policy).\n" +
        report
    }
  }

  // Chrome/Edge: "Failed to start native messaging host." / "Native host has
  // exited." / "Error when communicating with the native messaging host."
  // Firefox reports a failed launch only as a generic unexpected error.
  if (msg.indexOf('failed to start') >= 0 || msg.indexOf('has exited') >= 0 ||
      msg.indexOf('communicating') >= 0 || msg.indexOf('unexpected error') >= 0) {
    return {
      title: 'Native host found, but it could not run',
      detail:
        'The app is registered, but the browser could not start it (or it exited right away).\n' +
        (os === 'win'
          ? '• Check the exe still exists: %LOCALAPPDATA%\\UI.Vision\\DesktopAutomation\\uivision-desktop-automation.exe — antivirus may have quarantined it (Windows Security > Protection history).\n' +
            '• Company policies (AppLocker and similar) that block programs in user folders cause the same failure.\n' +
            '• Reinstall, then fully restart the browser.\n'
          : '• Reinstall the Desktop Automation app, then fully restart the browser.\n') +
        report
    }
  }

  return {
    title: 'Native host not reachable',
    detail: `${raw}. Install or update the Desktop Automation app, then fully quit and reopen the browser.`
  }
}

let singleton: XModule2API | null = null

export function getXModule2API (): XModule2API {
  if (singleton) return singleton

  let host = new XModule2Host()
  let pReady = host.connectAsync()

  const invoke = (method: string, params: any = {}): Promise<any> => {
    return pReady.then(() => host.invokeAsync(method, params))
  }

  const api: XModule2API = {
    invoke,
    getVersion: () => invoke('get_version'),
    getPermissionStatus: () => invoke('get_permission_status'),
    requestPermission: (kind) => invoke('request_permission', { kind }),
    openPermissionPane: (kind) => invoke('open_permission_pane', { kind }),
    ocrImage: (params) => invoke('ocr_image', params),
    ocrLanguageList: () => invoke('ocr_language_list'),
    runProcess: (params) => invoke('run_process', params),
    searchRelative: (params) => invoke('search_relative', params),
    reconnect: () => {
      host.disconnect()
      host = new XModule2Host()
      pReady = host.connectAsync()
      return pReady.then(() => api)
    }
  }

  singleton = api
  return api
}
