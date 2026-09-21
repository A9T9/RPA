#!/usr/bin/env node
// Ui.Vision MCP bridge — lets Claude Code (or any MCP client) build and run
// Ui.Vision macros.
//
// Architecture: this process is the rendezvous point between two clients that
// both dial OUT to it:
//   - the MCP client (Claude Code) talks JSON-RPC 2.0 over stdio (MCP stdio
//     transport, newline-delimited)
//   - the Ui.Vision browser extension connects to the WebSocket server this
//     process runs on 127.0.0.1 (extensions cannot accept incoming
//     connections, but outbound WebSockets are fine)
// Tool calls arriving over MCP are forwarded to the extension over the
// socket; the extension executes them with the same tool implementations its
// built-in AI chat uses (src/services/ai/macro_agent/tools.ts) and sends the
// result back.
//
// Usage:  node uivision-mcp-bridge.js [--port 50888] [--token <secret>]
// Register with Claude Code:
//   claude mcp add uivision -- node /path/to/uivision-mcp-bridge.js
//
// stdout is reserved for MCP JSON-RPC — all logging goes to stderr.

'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { WebSocketServer } = require('ws')

const VERSION = '1.7.18'

// Which MCP client launched this bridge — best effort from the parent
// process name, so the extension's MCP strip can say "LM Studio connected"
// instead of assuming Claude Code (which it did until 10.0.215; LM Studio's
// chat became a real client on 2026-09-06). Empty when unknown.
const detectClient = () => {
  // walk up the parent chain: the bridge is usually two hops below the
  // client (client → node/npx wrapper → bridge), and LM Studio spawns it
  // from its own bundled node.exe
  const isWrapper = (n) => /^(node|npm|npx|cmd|sh|bash|zsh|powershell|pwsh|conhost|node_modules)$/i.test(n)
  let chain = []
  try {
    const { execSync } = require('child_process')
    if (!process.ppid) return ''
    if (process.platform === 'win32') {
      // wmic is gone from Windows 11 24H2+; one PowerShell call walks the chain
      const script = `$p=${process.ppid}; for($i=0; $i -lt 5 -and $p; $i++) { $x = Get-CimInstance Win32_Process -Filter "ProcessId=$p"; if (!$x) { break }; Write-Output $x.Name; $p = $x.ParentProcessId }`
      const out = execSync(`powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`, { encoding: 'utf8', timeout: 8000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
      chain = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    } else {
      let pid = process.ppid
      for (let i = 0; i < 5 && pid && pid > 1; i++) {
        // ppid is the LAST token; the command path may itself contain spaces
        // (the Claude desktop app lives under "Application Support" on macOS —
        // a whitespace split labelled the client "Library", seen 2026-09-09)
        const out = execSync(`ps -o comm=,ppid= -p ${pid}`, { encoding: 'utf8', timeout: 4000, stdio: ['ignore', 'pipe', 'ignore'] }).trim()
        if (!out) break
        const m = /^(.*?)\s+(\d+)\s*$/.exec(out)
        if (!m) break
        chain.push(String(m[1] || '').trim().split('/').pop())
        pid = parseInt(m[2], 10)
      }
    }
  } catch (e) {
    return ''
  }
  for (let name of chain) {
    name = name.replace(/\.exe$/i, '').trim()
    if (!name || isWrapper(name)) continue
    if (/lm[ -]?studio/i.test(name)) return 'LM Studio'
    if (/^claude/i.test(name)) return 'Claude'
    if (/^code$/i.test(name)) return 'VS Code'
    if (/cursor/i.test(name)) return 'Cursor'
    if (/windsurf/i.test(name)) return 'Windsurf'
    return name
  }
  return ''
}
// MCP initialize identifies the caller more reliably than process ancestry
// (especially through wrappers). Keep ancestry only as a legacy fallback.
const clientLabel = (name) => typeof name === 'string' ? name.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 120) : ''
let CLIENT = detectClient()
const DEFAULT_PORT = 50888
// MCP protocol revisions this bridge knows; echo the client's if recognized
const KNOWN_PROTOCOL_VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18']
const LATEST_PROTOCOL_VERSION = '2025-06-18'

// run_macro can legitimately take many minutes (the extension caps a run at
// 10 min); everything else should answer quickly
const TOOL_TIMEOUT_MS = { run_macro: 15 * 60 * 1000, run_selftest: 11 * 60 * 1000, default: 3 * 60 * 1000 }

const log = (...args) => process.stderr.write(`[uivision-mcp] ${args.join(' ')}\n`)

// ---------------------------------------------------------------------------
// config: port + shared token
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2)
const argValue = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null
}

const port = parseInt(argValue('--port') || process.env.UIVISION_MCP_PORT || '', 10) || DEFAULT_PORT

// `--setup` is the one-shot installer users run by hand: it registers this
// bridge with every MCP client on the machine, then prints the pairing token.
// It never starts a server or the stdio loop.
const isSetup = argv.includes('--setup')

// The token authenticates the extension: the WebSocket server only accepts a
// connection whose hello message carries it. Sources, in order: --token arg,
// env var, a token file next to this script (auto-generated on first run —
// paste its value into Ui.Vision Settings > AI > MCP bridge).
// the token lives in the user's HOME dir, not next to the script: under npx
// the package dir is a prunable cache (a vanished token would silently
// regenerate and stop matching the extension setting), and a token inside
// the package folder is one `npm publish` away from being shipped
const TOKEN_FILE = path.join(os.homedir(), '.uivision_mcp_token')
// pre-1.0 installs kept the token next to the script — migrate it once
const LEGACY_TOKEN_FILE = path.join(__dirname, '.uivision_mcp_token')
const loadToken = () => {
  const explicit = argValue('--token') || process.env.UIVISION_MCP_TOKEN
  if (explicit) return explicit.trim()
  try {
    const existing = fs.readFileSync(TOKEN_FILE, 'utf8').trim()
    if (existing) return existing
  } catch (e) {
    /* not in home yet — check the legacy location, then generate */
  }
  try {
    const legacy = fs.readFileSync(LEGACY_TOKEN_FILE, 'utf8').trim()
    if (legacy) {
      fs.writeFileSync(TOKEN_FILE, legacy + '\n', { mode: 0o600 })
      log(`migrated auth token to ${TOKEN_FILE}`)
      return legacy
    }
  } catch (e) {
    /* no legacy token either — first run, generate below */
  }
  // 10 chars is plenty for a localhost-only secret, and short enough to
  // retype into the extension settings by hand. The "uiv" prefix makes the
  // token recognizable as a Ui.Vision bridge token at a glance.
  const fresh = 'uiv' + crypto.randomBytes(4).toString('hex').slice(0, 7)
  fs.writeFileSync(TOKEN_FILE, fresh + '\n', { mode: 0o600 })
  // log the value, not just the path: when run manually in a terminal this is
  // the only place the user ever sees the token (it is a localhost-only
  // secret, and they are about to paste it into the extension anyway).
  // --setup prints its own, better-formatted block — don't say it twice.
  if (!isSetup) {
    log(`generated new auth token: ${fresh} (saved in ${TOKEN_FILE}) — paste it into Ui.Vision Settings > AI > MCP bridge`)
  }
  return fresh
}
const token = loadToken()

const tokenMatches = (candidate) => {
  const a = Buffer.from(String(candidate || ''))
  const b = Buffer.from(token)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// ---------------------------------------------------------------------------
// origin-based auth: the real replacement for the pairing token
// ---------------------------------------------------------------------------
// The browser stamps the WebSocket handshake's Origin header itself, and web
// content CANNOT forge it. So a connection whose Origin is one of Ui.Vision's
// own extension ids is provably the real extension — no pairing token needed.
// This is what lets end users skip the token entirely.
//
// Keep this list in sync with the native-host `allowed_origins` in
// xmodule2/install/*  — the SAME first-party ids the native messaging host
// already trusts. The bridge grants strictly LESS than native messaging
// (which runs native code), so reusing that trust set is safe. When a new
// extension id is added to the installers, add it here too.
//
// Threat model: a page cannot obtain an extension Origin, so this shuts out
// the only realistic attacker (a website dialing 127.0.0.1). A malicious
// NATIVE process can still spoof any Origin header — but it already has full
// machine access and could bypass the old token via the devBrowser waiver
// anyway, so nothing is lost there.
const ALLOWED_EXTENSION_IDS = new Set([
  'dpdlhdbnlaefobeejcgfidghdllhemkl',
  'chfonhilonimekkjdiojngiemaajoele',
  'kknkjjhfadpnkmbdhmemjlklhhffkgal',
  'fffapfncphmnlbhgcmbkdhpbjfbjcfco',
  'gcbalfbdmfieckjlnblleoemohcganoc',
  'ngkbmimfhhaabikggkeidhgfgjddfidk',
  'mkplanokebelajeokbfnigdkhkefgdif',
  'eenjdnjldapjajjofmldgmkjaienebbj',
  'jdbefnbncfiifdekmeohplnebhmfcndm',
  'fpfipmndcbfnofbedjokcjlfogdpmcop',
  'ejfgcoabhgdgaafjeindjmegacbklcin',
  'cacjdaggjlpecjdbjgjmiphpkmoaijgg',
  'goapmjinbaeomoemgdcnnhoedopjnddd',
  'jlefpjinggjhccheobegboicdcacepfg',
  'hpoonbmpnckidjpkjlmnkhgnhabknlbi',
  'ankheondabfngkjomknppbpkjcdabdlg',
  'jojbdbfemceclndeblooholmmgeokafd',
  'nmiimijaeongfopoekkmbcnjogeeonkm',
  'mjnohhoofkffamdjmhjjhmbeigaidoap',
  'pjikodlihcbfhbanledgiemnlaaonajf',
  'pnlnlllfndogekhamjaoncbhokadcifj'
])

// Classify a handshake Origin:
//   'trusted' — a first-party extension page: an allowlisted chrome-extension
//               id, or any moz-extension (Firefox mints a random per-install
//               UUID, so no static id list is possible — but a website can
//               never carry a moz-extension origin either, so the scheme is
//               enough). Accepted WITHOUT a token.
//   'web'     — an http/https page. A browser always sends this for a page's
//               WebSocket and it cannot be forged by page script, so any web
//               origin here is a website, never our extension. REJECTED.
//   'other'   — no Origin header (a native local client — curl, a native app),
//               or a non-allowlisted extension id (e.g. a self-built/unpacked
//               dev extension). Falls back to the token or the dev waiver,
//               exactly as before.
const classifyOrigin = (origin) => {
  const o = String(origin || '').trim().toLowerCase()
  if (!o) return 'other'
  const chromeExt = /^chrome-extension:\/\/([a-p]{32})\/?$/.exec(o)
  if (chromeExt) return ALLOWED_EXTENSION_IDS.has(chromeExt[1]) ? 'trusted' : 'other'
  if (o.startsWith('moz-extension://')) return 'trusted'
  if (o.startsWith('http://') || o.startsWith('https://')) return 'web'
  return 'other'
}

// ---------------------------------------------------------------------------
// --setup: register the bridge with the MCP clients installed on this machine
// ---------------------------------------------------------------------------
// Exists because the documented `claude mcp add ...` needs the claude CLI on
// PATH, which it is not in the desktop app, the VS Code extension, Cursor or
// Windsurf — the single biggest reason first-time setup fails. Writing the
// JSON entry ourselves works everywhere.

const HOME = os.homedir()

const claudeDesktopDir = () => {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming'), 'Claude')
  }
  if (process.platform === 'darwin') return path.join(HOME, 'Library', 'Application Support', 'Claude')
  return path.join(HOME, '.config', 'Claude')
}

// `key` differs by client: VS Code nests servers under "servers", the rest use
// "mcpServers". `probe` is what proves the client is installed — we only touch
// config for apps actually present, so setup never litters the home dir.
const SETUP_TARGETS = [
  {
    name: 'Claude Code',
    file: path.join(HOME, '.claude.json'),
    key: 'mcpServers',
    probe: [path.join(HOME, '.claude.json'), path.join(HOME, '.claude')]
  },
  {
    name: 'Claude Desktop',
    file: path.join(claudeDesktopDir(), 'claude_desktop_config.json'),
    key: 'mcpServers',
    probe: [claudeDesktopDir()]
  },
  {
    name: 'Cursor',
    file: path.join(HOME, '.cursor', 'mcp.json'),
    key: 'mcpServers',
    probe: [path.join(HOME, '.cursor')]
  },
  {
    name: 'Windsurf',
    file: path.join(HOME, '.codeium', 'windsurf', 'mcp_config.json'),
    key: 'mcpServers',
    probe: [path.join(HOME, '.codeium', 'windsurf')]
  },
  {
    name: 'VS Code',
    file: path.join(HOME, '.vscode', 'mcp.json'),
    key: 'servers',
    probe: [path.join(HOME, '.vscode')]
  }
]

const exists = (p) => {
  try { fs.accessSync(p); return true } catch (e) { return false }
}

// --port is carried into the entry so a user who moved the bridge off 50888
// keeps that port after setup
const serverEntry = () => {
  const args = ['-y', 'uivision-mcp-bridge']
  if (port !== DEFAULT_PORT) args.push('--port', String(port))
  return { command: 'npx', args }
}

const registerWith = (target) => {
  let config = {}
  const had = exists(target.file)

  if (had) {
    let raw
    try {
      raw = fs.readFileSync(target.file, 'utf8')
    } catch (e) {
      return { ok: false, text: `could not read ${target.file} — ${e.message}` }
    }
    if (raw.trim()) {
      try {
        config = JSON.parse(raw)
      } catch (e) {
        // never overwrite a config we cannot parse: the user would lose every
        // other MCP server they have registered
        return { ok: false, text: `${target.file} is not valid JSON — add the entry by hand` }
      }
    }
    try {
      fs.writeFileSync(target.file + '.uivision-backup', raw)
    } catch (e) {
      /* best effort — a missing backup is not worth aborting setup over */
    }
  }

  if (!config[target.key] || typeof config[target.key] !== 'object') config[target.key] = {}
  const unchanged = JSON.stringify(config[target.key].uivision || null) === JSON.stringify(serverEntry())
  config[target.key].uivision = serverEntry()

  try {
    fs.mkdirSync(path.dirname(target.file), { recursive: true })
    fs.writeFileSync(target.file, JSON.stringify(config, null, 2) + '\n')
  } catch (e) {
    return { ok: false, text: `could not write ${target.file} — ${e.message}` }
  }
  return {
    ok: true,
    text: unchanged ? `already registered — ${target.file}` : `registered — ${target.file}${had ? ' (backup saved)' : ''}`
  }
}

const runSetup = () => {
  const out = (s) => process.stdout.write(s + '\n')
  out('')
  out(`  Ui.Vision MCP bridge v${VERSION} — setup`)
  out('  ' + '='.repeat(52))
  out('')

  const found = SETUP_TARGETS.filter((t) => t.probe.some(exists))
  const results = []

  if (!found.length) {
    // nothing detected: Claude Code is by far the common case and its config
    // is a plain file we can create, so set that up rather than dead-ending
    out('  No MCP client detected — setting up Claude Code by default.')
    out('')
    results.push({ name: SETUP_TARGETS[0].name, ...registerWith(SETUP_TARGETS[0]) })
  } else {
    for (const t of found) results.push({ name: t.name, ...registerWith(t) })
  }

  out('  MCP clients')
  for (const r of results) out(`    ${r.ok ? '[ok]' : '[! ]'} ${r.name.padEnd(15)} ${r.text}`)
  out('')
  out('  Pair the browser — usually NO token needed')
  out('')
  out('  Open the Ui.Vision side panel, go to Settings > AI >')
  out('  "MCP bridge (Claude Code)", switch it ON, check the port reads')
  out(`  ${port}, and click Test. Current Chrome/Edge/Firefox are recognised`)
  out("  by the extension's own origin and pair automatically.")
  out('')
  out('  Fallback pairing token — only if Test says a token is required')
  out('  (older browser, or a connection that sends no origin):')
  out('')
  out(`      ${token}`)
  out('')
  out('  >> NOW QUIT AND REOPEN THE APP(S) LISTED ABOVE <<')
  out('  MCP servers load only at startup, so an app that was already running')
  out('  will not see Ui.Vision. Quit it completely — opening a new chat,')
  out('  session or tab is not enough. If it was running while this command')
  out('  wrote its config, quit it and run this command once more: some apps')
  out('  rewrite their config on exit and would drop the entry.')
  out('')
  out('  Then ask it: "build a Ui.Vision macro that ..."')
  out('  Docs: https://ui.vision/mcp')
  out('')

  process.exit(results.every((r) => r.ok) ? 0 : 1)
}

if (isSetup) runSetup()

// ---------------------------------------------------------------------------
// tool definitions (MCP side)
// ---------------------------------------------------------------------------
// Keep in sync with src/services/ai/macro_agent/tools.ts — the extension
// executes these by name; list_macros and open_macro are implemented in the
// extension's bridge dispatch (src/services/mcp_bridge), bridge_status here.

const WHY = {
  why: {
    type: 'string',
    description: 'One short sentence shown in the Ui.Vision log: what this call does and why.'
  }
}

const TOOLS = [
  {
    name: 'bridge_status',
    description:
      'Reports whether the Ui.Vision browser extension is currently connected to this bridge. Call this first if other tools fail — it tells you whether the extension side panel is open and the bridge is enabled in its settings. Several browsers can be connected at once; the status lists each one by label (chrome#1, firefox#1, ...) and marks the ACTIVE one that tool calls go to.',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'run_status',
    description:
      'What the macro runner is doing RIGHT NOW: whether a run is in progress, which macro the editor holds, and the freshest log lines. Unlike every other tool, this ANSWERS WHILE run_macro is still executing (extension 10.0.172+) — poll it from a second client/session to watch a long run live instead of waiting blind. screenshot is likewise answerable mid-run for a visual peek.',
    inputSchema: {
      type: 'object',
      properties: {
        lines: { type: 'number', description: 'How many of the latest log lines to include (1-100, default 20).' }
      },
      required: []
    }
  },
  {
    name: 'select_browser',
    description:
      'Switches which connected browser the other tools talk to. Several browsers (or several instances of one browser) can hold a bridge connection at the same time; bridge_status lists their labels. Pass a full label ("chrome#2") for an exact instance, or a bare family name ("firefox") for the most recently connected instance of that family.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Connection label from bridge_status: "chrome#1", "firefox#2", or a bare family name like "firefox".' },
        ...WHY
      },
      required: ['target']
    }
  },
  {
    name: 'open_panel',
    description:
      'Opens the Ui.Vision panel when the extension is NOT connected: signals the browser over a background wake channel (extension 10.0.170+) to open the Ui.Vision app in a tab. This is the ONLY way the panel opens without a human click — the extension never opens it by itself. Works when the panel or its tab was closed, and even when the browser sits in the tray with zero windows (a window is created). Call this whenever bridge_status shows no tool connection but a wake channel; the panel connects within a few seconds. Pass target ("chrome", "firefox") to wake one browser family; omit to wake every browser that is not yet connected. If it reports no wake channel, the browser process is not running (or the extension predates 10.0.170) — a human must start the browser, then retry.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Optional browser family from bridge_status ("chrome", "firefox", "edge", ...). Omit to wake all disconnected browsers.' },
        ...WHY
      },
      required: []
    }
  },
  {
    name: 'list_macros',
    description:
      'Lists all macros stored in Ui.Vision (name and id). Use open_macro to load one into the editor before reading or running it.',
    inputSchema: { type: 'object', properties: { ...WHY }, required: [] }
  },
  {
    name: 'open_macro',
    description:
      'Opens the macro with the given name in the Ui.Vision editor and returns its JSON. Subsequent get_macro/set_macro/run_macro calls operate on it. Note: unsaved editor changes may be discarded.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Macro name as returned by list_macros' }, ...WHY },
      required: ['name']
    }
  },
  {
    name: 'get_authoring_guide',
    description:
      'Returns the Ui.Vision macro authoring guide: the uiv.* JavaScript API for JS script macros (finders, actions, OCR, vision), the classic command table, locator rules and best practices. CALL THIS ONCE BEFORE WRITING YOUR FIRST MACRO in a session — macros written without it usually use invented APIs and fail.',
    inputSchema: { type: 'object', properties: { ...WHY }, required: [] }
  },
  {
    name: 'get_macro',
    description:
      'Returns the macro currently loaded in the Ui.Vision editor, as Ui.Vision JSON. A JS script macro comes back with a "Script" field (its program) instead of Commands.',
    inputSchema: { type: 'object', properties: { ...WHY }, required: [] }
  },
  {
    name: 'send_chat',
    description:
      'Sends a message to the REAL in-panel AI Chat — the configured chat model runs it with its own agent tools, exactly as if a user had typed it. Returns immediately; a chat run takes minutes, so poll get_chat until it reports running:false. For self-testing the chat agent end-to-end.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The chat message, verbatim as a user would type it' },
        new_chat: { type: 'boolean', description: 'Start a fresh conversation first (abandons any run in progress)' },
        ...WHY
      },
      required: ['message']
    }
  },
  {
    name: 'get_chat',
    description:
      'Returns the in-panel AI Chat transcript and whether a run is in progress (running:true/false). Poll this after send_chat; the transcript is text-only (inline images are omitted).',
    inputSchema: { type: 'object', properties: { ...WHY }, required: [] }
  },
  {
    name: 'reload_extension',
    description:
      'Reloads the Ui.Vision extension from disk (same as the chrome://extensions reload button) — the way to load a freshly built version without a human click. The bridge connection dies with the panel; on startup the panel app reopens as a TAB and reconnects, and the new hello reports the loaded version. If no reconnect arrives within ~15s the new build failed to start and needs a human at chrome://extensions.',
    inputSchema: { type: 'object', properties: { ...WHY }, required: [] }
  },
  {
    name: 'run_selftest',
    description:
      'Runs every self-test of Settings > Desktop Automation in one go: native host connection, WASM image-search engine, desktop screenshot, real mouse input delivery, home-directory read/write, visual compatibility (colors, scaling, screenshot coordinates) and a test macro inside the desktop app - and returns ONE report that starts with "SELFTEST: ALL OK" or "SELFTEST: PROBLEMS FOUND", then one line per test with verdict and detail. Call it FIRST when a macro misbehaves (clicks land elsewhere, colors or images are not found, nothing happens on the desktop): it separates an environment problem from a macro problem in about half a minute. The Settings page opens as a tab while the tests run (the visual test shows a chart, the input test moves the mouse - hands off) and closes again unless keep_open. Pass tests to run a subset.',
    inputSchema: {
      type: 'object',
      properties: {
        tests: { type: 'array', items: { type: 'string', enum: ['host', 'wasm', 'capture', 'input', 'file', 'visual', 'app'] }, description: 'Subset of tests to run; default: all.' },
        keep_open: { type: 'boolean', description: 'Leave the Settings tab open with the results (default false).' },
        timeout_seconds: { type: 'number', description: 'Longest wait for the report, 30-600 (default 240).' },
        ...WHY
      },
      required: []
    }
  },
  {
    name: 'get_ai_settings',
    description:
      'Reports the ACTIVE AI provider/model as the chat will resolve it, which providers have keys stored (booleans only — keys never cross the bridge), the per-provider model settings, computer-vision scope and OCR engine. Call before set_ai_settings to plan a change.',
    inputSchema: { type: 'object', properties: { ...WHY }, required: [] }
  },
  {
    name: 'set_ai_settings',
    description:
      'Switches AI settings for independent runs (e.g. benchmark sweeps): provider (uivision | openrouter | anthropic | local), uivision_tier (free | pro), openrouter_model / anthropic_model / local_model / local_base_url, cv_scope (browser | desktop), ocr_engine (1|2|3 OCR.Space, 90 AI provider, 98 built-in cross-platform, 99 OS reader). Only switches between providers the user already configured — API keys can NOT be set or read over the bridge (Settings > AI is the only way in). Refused while a chat run is in progress. Takes effect from the next AI call.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['uivision', 'openrouter', 'anthropic', 'local'] },
        uivision_tier: { type: 'string', enum: ['free', 'pro'] },
        openrouter_model: { type: 'string', description: 'e.g. "openai/gpt-5.6-luna"' },
        anthropic_model: { type: 'string' },
        local_model: { type: 'string' },
        local_base_url: { type: 'string' },
        cv_scope: { type: 'string', enum: ['browser', 'desktop'] },
        ocr_engine: { type: 'number' },
        ...WHY
      },
      required: []
    }
  },
  {
    name: 'set_macro',
    description:
      'Apply changes to the macro in the Ui.Vision editor — pass the complete Ui.Vision JSON. PREFER the JS script form {"Name": "name", "Script": "<JavaScript using the uiv.* API>"} over the classic Commands table (call get_authoring_guide for the uiv.* API before writing your first script). When fixing or extending a classic Commands-table macro, CONVERT it to a JS script in the same call and fix it there, preserving its targeting technique (visual stays visual) — recommend the conversion in your summary; keep the classic form only if the user explicitly insists on a table macro. The user\'s original macro file is never overwritten: the first change to a user macro is saved as a new copy in the "AI Generated" folder, which then becomes the macro being edited. Returns the macro name that was written, or a validation error.',
    inputSchema: {
      type: 'object',
      properties: {
        macro_json: { type: 'string', description: 'The complete macro as a Ui.Vision JSON string.' },
        allow_visual_to_dom: {
          type: 'boolean',
          description: 'Set true ONLY after the user explicitly agreed to convert a visual macro to DOM-selector commands.'
        },
        ...WHY
      },
      required: ['macro_json']
    }
  },
  {
    name: 'create_macro',
    description:
      'Create a NEW macro from the given Ui.Vision JSON and save it in the "AI Generated" folder under a new, unique name. PREFER the JS script form {"Name": "...", "Script": "<JavaScript using the uiv.* API>"} over the classic Commands table — scripts are modern JS with real control flow and are the recommended way to build macros. Call get_authoring_guide for the uiv.* API before writing your first script. The new macro opens in the editor — refine it afterwards with set_macro. Returns the final macro name.',
    inputSchema: {
      type: 'object',
      properties: {
        macro_json: { type: 'string', description: 'The complete macro as a Ui.Vision JSON string, including a descriptive Name.' },
        ...WHY
      },
      required: ['macro_json']
    }
  },
  {
    name: 'delete_macro',
    description:
      'Delete a macro from the "AI Generated" folder — cleanup for scratch and test macros this or an earlier session created there. Only macros inside "AI Generated" can be deleted; everything else is refused (the user deletes those in the panel). Returns a confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Macro name as returned by list_macros — must be under "AI Generated/".' },
        ...WHY
      },
      required: ['name']
    }
  },
  {
    name: 'run_macro',
    description:
      'Run a macro against the browser tab and wait for it to finish (can take minutes). Three forms: pass "macro" (a name from list_macros) to open and run that stored macro; pass "script" (inline JavaScript) to run code directly without creating a macro; pass neither to run whatever is currently open in the editor — that last form depends on editor state, so prefer naming the target. Returns the execution log, including the error and failing line if it fails, plus a picture of the page/screen after the run with ONLY the macro\'s own actions and finder results marked: arrows at its clicks, numbered boxes at image/OCR matches (each number resolves to a legend line with exact coordinates), blue search-area rectangles, a magnified inset of the last click. No other overlay is painted — read what OCR recognised from the text legend, not the picture.',
    inputSchema: {
      type: 'object',
      properties: {
        macro: {
          type: 'string',
          description: 'Name of a stored macro (as returned by list_macros, e.g. "AI Generated/my_macro.js") — it is opened into the editor and then run. Mutually exclusive with "script".'
        },
        script: {
          type: 'string',
          description: 'Inline JS script to run directly — plain modern JavaScript with real newlines and real quotes, NO JSON escaping. The editor and stored macros are not touched; use create_macro instead when the script is worth keeping. Mutually exclusive with "macro".'
        },
        log_limit: {
          type: 'number',
          description: 'Max characters of run log (and of the final-variables dump) to return, 1000-40000; default 4000. When the log is longer, its HEAD is dropped and an explicit "…N earlier log lines omitted" marker says so — raise this when debugging a loopy macro whose early lines matter.'
        },
        look: {
          type: 'string',
          enum: ['delta', 'tree', 'shot', 'both', 'none'],
          description: 'What to return about the page AFTER the run, so one call acts and looks: "delta" (default) = the tree lines that appeared or disappeared since the last look, with refs; "tree" = the full tree (6000 chars); "shot" = a screenshot; "both"; "none".'
        },
        ...WHY
      },
      required: []
    }
  },
  {
    name: 'browser_snapshot',
    description:
      'Returns the structure of the browser tab Ui.Vision plays in. Default mode "tree": the page as an accessibility tree — one line per node with role, accessible name and state (value, checked, expanded, disabled, offscreen), nested by container. Every interactive node carries [ref=N], and ref=N is a LOCATOR: act on it right away with uiv.page.click(\'ref=12\'), uiv.page.fill(\'ref=7\', text) or uiv.$(\'ref=12\') (match object, e.g. uiv.browser.click(uiv.$(\'ref=12\'))). Refs are numbered per page load and renumbered on navigation: call browser_snapshot again after uiv.goto or a navigating click. mode "fields": the classic list of form fields, buttons and links with id=/name=/css= locators plus refs. Pass "url" to open that page first; omit it to inspect the current tab. Cannot see into closed shadow roots; cross-origin iframes are listed separately.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Optional. Navigate the tab here first, wait for the load, then inspect.' },
        mode: { type: 'string', enum: ['tree', 'fields'], description: 'Optional. "tree" (default): structure with [ref=N] on interactive nodes, visible text owners and represented containers. Refs identify elements, not guaranteed actions. Tables stay compact; use find with row text for cell refs. "fields": fields/clickables list with locators.' },
        max_chars: { type: 'number', description: 'Optional, tree mode: character budget 2000-60000 (default 12000); the result reports how many nodes were cut.' },
        find: { type: 'string', description: 'Optional, tree mode. Return nodes whose line contains this text (case-insensitive: a role, name or word), with their refs. Matching table rows include individual cell refs. Small pages may return the whole tree. Example: "download", "invoice", "button \"Close".' },
        ...WHY
      },
      required: []
    }
  },
  {
    name: 'click_at',
    description:
      'EXPLORATION ONLY: click the point (x, y) read off the MOST RECENT screenshot — the extension converts the picture\'s pixels to the page or screen itself, so "click the thing in the picture" is one call. A browser screenshot clicks in the tab (trusted click, any frame); a desktop screenshot clicks on the screen through the XModule. Returns what changed on the page afterwards (like run_macro look: "delta"). A point is NOT a locator: for a macro that will be saved, act by ref/locator (browser_snapshot) or by a saved element image instead.',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'Pixels from the left edge of the last screenshot (a zoomed view counts as the last screenshot).' },
        y: { type: 'number', description: 'Pixels from the top edge of the last screenshot.' },
        look: { type: 'string', enum: ['delta', 'tree', 'shot', 'both', 'none'], description: 'What to return afterwards; default "delta".' },
        ...WHY
      },
      required: ['x', 'y']
    }
  },
  {
    name: 'type_at',
    description:
      'EXPLORATION ONLY: click the point (x, y) of the MOST RECENT screenshot and type text there (key names like ${KEY_ENTER}, ${KEY_TAB}, ${KEY_CTRL+a} are honoured). Same conversion and same caveat as click_at. Returns what changed on the page afterwards.',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        text: { type: 'string', description: 'The text to type after the click.' },
        look: { type: 'string', enum: ['delta', 'tree', 'shot', 'both', 'none'], description: 'What to return afterwards; default "delta".' },
        ...WHY
      },
      required: ['x', 'y', 'text']
    }
  },
  {
    name: 'screenshot',
    description:
      'Returns a screenshot of the visible part of the browser tab Ui.Vision plays in. Coordinates passed to save_element_image / save_relative_image are absolute pixels in this image. ' +
      'scope: "desktop" captures the WHOLE SCREEN instead (needs the RealUser XModule) — the way to see browser UI outside the page (toolbar, extension popups, native dialogs) and to verify desktop automation. ' +
      'ZOOM: pass x/y/width/height (all four) to get a MAGNIFIED view of that region of the screenshot you already have, instead of a new capture. A full-screen capture is shrunk to fit, leaving a toolbar icon or checkbox a few pixels wide — too coarse to place a crop box on, and guessing one there picks the NEIGHBOURING element about as often as the right one. Zoom first whenever the target is under ~40 px, then read coordinates off the magnified view; it becomes the coordinate frame for the next save_element_image call. Regions nest; a call with no region returns to the full view. On the very first screenshot a region is skipped (there is nothing to magnify yet) and you get the full capture. ' +
      'MARKS: pass marks: "elements" to get the visible interactive elements NUMBERED on the picture (red boxes) plus a legend mapping every number to its locator and viewport rect — pick by number, act by locator, never by a pixel estimated off the picture. IMAGE CONTRACT (this tool and run_macro alike): every picture is the real capture; the only markings ever added are numbered candidate boxes (elements, image matches, OCR matches), blue search-area rectangles, arrows/rings for the macro\'s own input and a magnified inset of the last click — each number has a legend line with exact coordinates, nothing else is painted (no OCR word overlay), and no marking is ever page content.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['browser', 'desktop'], description: 'Optional. "browser" (default) = the current tab; "desktop" = the whole screen via the XModule.' },
        marks: { type: 'string', enum: ['elements'], description: 'Optional. "elements" numbers the visible interactive elements of the tab (browser scope only) and returns a number -> locator + rect legend. Ignored with a zoom region.' },
        x: { type: 'number', description: 'Optional zoom region: left edge, in pixels of the last screenshot. Give all four of x/y/width/height or none.' },
        y: { type: 'number', description: 'Zoom region: top edge.' },
        width: { type: 'number', description: 'Zoom region width. Include surroundings — a region tight around the target gives nothing to judge its identity by.' },
        height: { type: 'number', description: 'Zoom region height.' },
        ...WHY
      },
      required: []
    }
  },
  {
    name: 'save_element_image',
    description:
      'Crop a rectangle from the MOST RECENT screenshot and save it as a Ui.Vision vision image, for image-based commands like "XClick | Target: <name>.png" or uiv.findImage(\'<name>.png\') in a JS script. Coordinates are absolute pixels in the last screenshot (or in the last magnified view, which converts back itself — never scale by hand). ' +
      'SIZING: crop a normal control tightly with a few px of margin, but do NOT crop a SMALL or FLAT target tight — the matcher keys on structure, and a plain patch matches everywhere while one icon in a row of icons looks like all its neighbours. For those, take a WIDER box with the target EXACTLY CENTRED, including stable surroundings (for a toolbar icon: the icons to its left and right). Clicks still land on the target, because the finders return the match CENTRE. ' +
      'Returns the saved file name plus a picture of the SURROUNDINGS with a red box around the saved area, so you can check the crop against its neighbours, and warns when the crop is too small or too featureless to match reliably. Re-crop with THE SAME NAME to overwrite.',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        name: { type: 'string', description: 'Base name for the image file (letters, digits, underscore)' },
        ...WHY
      },
      required: ['x', 'y', 'width', 'height', 'name']
    }
  },
  {
    name: 'save_relative_image',
    description:
      'Create a green/pink RELATIVE vision image from the MOST RECENT screenshot, for commands like "BClickRelative | Target: <name>.png". The green box marks the anchor element that is searched on the page; the pink box marks where to click, relative to the anchor. Coordinates are absolute pixels in the last screenshot.',
    inputSchema: {
      type: 'object',
      properties: {
        anchor_x: { type: 'number' },
        anchor_y: { type: 'number' },
        anchor_width: { type: 'number' },
        anchor_height: { type: 'number' },
        target_x: { type: 'number' },
        target_y: { type: 'number' },
        target_width: { type: 'number' },
        target_height: { type: 'number' },
        name: { type: 'string', description: 'Base name for the image file (letters, digits, underscore)' },
        ...WHY
      },
      required: [
        'anchor_x', 'anchor_y', 'anchor_width', 'anchor_height',
        'target_x', 'target_y', 'target_width', 'target_height', 'name'
      ]
    }
  }
]

// ---------------------------------------------------------------------------
// WebSocket server — the extension side
// ---------------------------------------------------------------------------

// Authenticated extension connections — SEVERAL browsers (or several
// instances/profiles of one browser) may hold one each, at the same time.
// Each entry: { ws, label, family, version, xmoduleVersion, connectedAt }.
// The label is family#n (chrome#1, firefox#2, ...): the family read from the
// WebSocket handshake's User-Agent (works for any extension build, old ones
// included), the number counting up per family in connection order. Tool
// calls go to the ACTIVE connection — the most recent hello by default, or
// whatever select_browser picked; when the active one closes, the most
// recent survivor takes over.
const connections = []
let activeConn = null
const familyCounters = new Map() // family -> highest #n handed out

// Per-client browser target (bridge 1.7.10). Several MCP clients share one
// bridge (Claude Code windows, LM Studio); before, select_browser moved ONE
// global pointer, so a client watching through Firefox re-aimed every other
// client's next call at Firefox too (LM Studio driving Chrome while Claude
// Code watched via Firefox, 2026-09-06). Now each client — the stdio client
// of this process and every relay — carries its own pin; the global
// activeConn (newest hello) stays the default for clients that never pinned.
const stdioClient = { kind: 'stdio', clientName: CLIENT, pin: null }
const anonClient = { kind: 'relay', clientName: '', pin: null }
const allClients = () => [stdioClient, ...relays]
const targetFor = (who) => (who && who.pin && connections.includes(who.pin)) ? who.pin : activeConn
// a fresh bridge (LM Studio starts one per turn) gets its first tool call
// before the extension has re-dialled — wait a moment instead of failing
const waitForConn = (ms) => new Promise((resolve) => {
  const until = Date.now() + ms
  const tick = () => { if (activeConn || Date.now() >= until) return resolve(); setTimeout(tick, 200) }
  tick()
})

// Wake channels (extension 10.0.170+, bridge 1.5+): a THIN presence socket
// from each browser's background service worker — no tools run over it. Its
// one purpose is open_panel: when the panel (and with it the real tool
// connection) was closed by hand, the wake channel is the only way back in
// without a human click. Entries: { ws, family, version, connectedAt }.
const wakeChannels = []

// Ping every wake channel every 20s: WebSocket traffic is what keeps the
// MV3 service worker holding the other end alive (Chrome kills an idle
// worker after ~30s — with it would die the wake channel itself).
const WAKE_PING_MS = 20000
setInterval(() => {
  for (const w of wakeChannels) {
    try { w.ws.send(JSON.stringify({ type: 'ping' })) } catch (e) { /* close handler cleans up */ }
  }
}, WAKE_PING_MS).unref()

const uaFamily = (ua) => {
  const s = String(ua || '').toLowerCase()
  if (s.includes('firefox')) return 'firefox'
  if (s.includes('edg/')) return 'edge'
  if (s.includes('opr/') || s.includes('opera')) return 'opera'
  if (s.includes('vivaldi')) return 'vivaldi'
  if (s.includes('brave')) return 'brave'
  if (s.includes('chrome')) return 'chrome'
  return 'browser'
}

// "chrome#2" -> that exact entry; "chrome" -> the newest chrome entry
const findConn = (target) => {
  const t = String(target || '').trim().toLowerCase()
  if (!t) return null
  const exact = connections.find((c) => c.label === t)
  if (exact) return exact
  const family = connections.filter((c) => c.family === t)
  return family.length ? family[family.length - 1] : null
}

// One browser INSTANCE is identified by its browser family PLUS its
// extension origin (Chrome: the extension id — a Web Store copy and an
// unpacked dist/ in the same browser are two instances with two ids;
// Firefox: a per-install moz-extension UUID). The family is part of the key
// because Edge speaks chrome-extension:// with the SAME id as Chrome for the
// same build (Web Store install or unpacked dist/) — keyed on origin alone,
// open_panel took Edge's wake channel for the already-connected Chrome and
// answered "no matching wake channel" while listing edge (2026-09-06).
// Clients that send no Origin header fall back to the family alone.
const instanceKey = (x) => `${x.family || ''}|${x.origin || ''}`
const shortId = (origin) => {
  const m = /^[a-z]+-extension:\/\/([^/]+)/i.exec(String(origin || ''))
  return m ? m[1] : ''
}

const connLine = (c) =>
  `${c.label}: extension v${c.version || '?'}${c.xmoduleVersion ? ` · host v${c.xmoduleVersion}` : ' · host not connected at hello time'}${c === activeConn ? '  <-- ACTIVE' : ''}`

const pendingCalls = new Map() // id -> { resolve, timer, conn }

// ---------------------------------------------------------------------------
// One port, many Claude Code windows (bridge 1.7.5)
//
// The bridge is registered as a user-scoped MCP server, so EVERY Claude Code
// window spawns its own copy, and all of them want port 50888. Before 1.7.5
// the first one won and the rest died with EADDRINUSE — which Claude Code
// reports as a bare "Connection closed", the extension keeps saying
// "connected" (to the winner), and the user has no idea why THIS window has
// no tools. Now the loser becomes a RELAY: it connects to the winner over the
// same port as a token-authed client and forwards its tool calls, so every
// window gets working tools and they share the one extension. When the
// winner exits (its window closed), a relay tries to take the port itself
// and the extension reconnects to it.
// ---------------------------------------------------------------------------
let wss = null            // the server, once WE own the port
let relay = null          // relay-mode state while ANOTHER bridge owns it
const relays = []         // relay clients attached to THIS bridge

// best-effort "pid 1234" of whoever holds the port, for the log line only
const portOwner = () => {
  try {
    const { execSync } = require('child_process')
    if (process.platform === 'win32') {
      const out = execSync('netstat -ano -p tcp', { encoding: 'utf8', timeout: 4000, windowsHide: true })
      const line = out.split('\n').find((l) => l.includes(`:${port} `) && l.includes('LISTENING'))
      const pid = line && line.trim().split(/\s+/).pop()
      return pid ? `pid ${pid}` : ''
    }
    const pid = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: 'utf8', timeout: 4000 }).toString().trim().split('\n')[0]
    return pid ? `pid ${pid}` : ''
  } catch (e) {
    return ''
  }
}

const startServer = () => {
  const server = new WebSocketServer({ host: '127.0.0.1', port })
  server.on('listening', () => {
    wss = server
    log(`WebSocket server listening on ws://127.0.0.1:${port} (for the Ui.Vision extension)`)
  })
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      const owner = portOwner()
      log(`port ${port} is already in use${owner ? ` by ${owner}` : ''} — almost certainly the bridge of ANOTHER MCP client (every Claude Code window, and LM Studio, starts its own copy). Switching to relay mode: this window's tool calls are forwarded to that bridge.`)
      try { server.close() } catch (e2) { /* never listened */ }
      startRelay()
      return
    }
    log(`WebSocket server error: ${e.message}`)
  })
  server.on('connection', onConnection)
}

const onConnection = (ws, req) => {
  let authed = false
  const ua = (req && req.headers && req.headers['user-agent']) || ''
  const origin = (req && req.headers && req.headers.origin) || ''
  const originKind = classifyOrigin(origin)
  const authTimer = setTimeout(() => {
    if (!authed) ws.close(4001, 'auth timeout')
  }, 5000)

  ws.on('message', (data) => {
    let msg
    try {
      msg = JSON.parse(data.toString())
    } catch (e) {
      return
    }

    if (!authed) {
      // A web page's WebSocket ALWAYS carries its (unforgeable) Origin, and no
      // page has any legitimate reason to reach the bridge — a socket can only
      // RECEIVE forwarded tool calls, so the most a page could do is
      // impersonate the extension to intercept args and spoof results. Shut it
      // out before the token is even considered. (This also closes the old
      // hole where a page could send devBrowser:true to skip the token.)
      if (originKind === 'web') {
        log(`rejected connection: web page origin ${origin} — the bridge only talks to the Ui.Vision extension`)
        clearTimeout(authTimer)
        ws.close(4003, 'origin not allowed')
        return
      }
      // A trusted extension origin (allowlisted chrome-extension id, or any
      // moz-extension) is proof this is the real extension — no token needed.
      // Dev/test browsers (unpacked installs, Firefox Developer/Beta) and
      // origin-less native clients still fall back to the token or the
      // self-declared dev waiver, exactly as before.
      const trustedOrigin = originKind === 'trusted'
      const devWaiver = msg.type === 'hello' && msg.devBrowser === true && msg.client === 'uivision-extension'
      if (msg.type === 'hello' && (trustedOrigin || tokenMatches(msg.token) || devWaiver)) {
        // probe (the extension's Settings > AI "Test" button, which runs in a
        // window WITHOUT the bridge client): validate the token, report
        // whether the side panel is connected, close — do NOT touch the real
        // extension connections
        if (msg.probe) {
          clearTimeout(authTimer)
          ws.send(JSON.stringify({
            type: 'hello_ok',
            bridgeVersion: VERSION,
            extensionConnected: connections.length > 0,
            // the Settings page shows these — it has no live connection of
            // its own, so the probe is how it learns who is connected
            connections: connections.map((c) => c.label),
            active: activeConn ? activeConn.label : null
          }))
          try { ws.close(1000, 'probe done') } catch (e) { /* already gone */ }
          log('token probe OK (Settings > AI "Test" button)')
          return
        }
        // relay client: the bridge of ANOTHER Claude Code window that lost
        // the race for the port (see startRelay). Token-authed only — it has
        // no Origin, and the dev waiver is for extensions. Never a tool
        // target: it SENDS tool calls, it does not execute them.
        if (msg.relay === true) {
          if (!tokenMatches(msg.token)) {
            log('rejected relay client: bad token')
            clearTimeout(authTimer)
            ws.close(4003, 'bad token')
            return
          }
          authed = true
          clearTimeout(authTimer)
          const r = { kind: 'relay', ws, pid: msg.pid || 0, clientName: String(msg.clientName || ''), pin: null, connectedAt: Date.now() }
          relays.push(r)
          ws.send(JSON.stringify({ type: 'hello_ok', bridgeVersion: VERSION, relay: true, pid: process.pid }))
          log(`relay client connected (bridge pid ${r.pid || '?'} of ${r.clientName || 'another MCP client'}) — ${relays.length} relay${relays.length > 1 ? 's' : ''} attached`)
          return
        }
        // wake channel: presence only, never a tool target — MUST stay out
        // of `connections`, or it would become the ACTIVE conn and swallow
        // tool calls it cannot execute
        if (msg.role === 'wake') {
          authed = true
          clearTimeout(authTimer)
          const wake = { ws, origin, family: uaFamily(ua), version: msg.version || '', connectedAt: Date.now() }
          wakeChannels.push(wake)
          ws.send(JSON.stringify({ type: 'hello_ok', bridgeVersion: VERSION, role: 'wake' }))
          log(`wake channel connected (${wake.family}${shortId(origin) ? ' ' + shortId(origin) : ''}, extension v${wake.version || '?'}) — open_panel can reopen this browser's panel`)
          return
        }
        authed = true
        clearTimeout(authTimer)
        // No "newest wins" steal: every browser (and every instance of one)
        // keeps its own connection, labelled family#n. The newest hello
        // becomes the ACTIVE target; select_browser switches at will. A
        // reopened panel in the SAME instance shows up as a fresh label —
        // its dead predecessor drops off on close, so nothing fights.
        const family = uaFamily(ua)
        const n = (familyCounters.get(family) || 0) + 1
        familyCounters.set(family, n)
        const conn = {
          ws,
          origin,
          label: `${family}#${n}`,
          family,
          version: msg.version || '',
          xmoduleVersion: msg.xmoduleVersion || '',
          connectedAt: Date.now()
        }
        connections.push(conn)
        activeConn = conn
        // the label rides back in hello_ok so the extension can show the
        // user which connection THIS browser is (Settings > AI)
        // pid: lets the extension tell "reconnected to the same bridge" from
        // "a NEW bridge process" in its log — the latter is what an
        // unexplained Disconnected a moment earlier almost always was
        ws.send(JSON.stringify({ type: 'hello_ok', bridgeVersion: VERSION, label: conn.label, pid: process.pid, clientName: CLIENT }))
        const authVia = trustedOrigin
          ? `trusted origin ${origin}`
          : tokenMatches(msg.token) ? 'token' : 'dev/test waiver'
        log(`Ui.Vision extension connected as ${conn.label} (${msg.client || 'unknown'} ${msg.version || ''}) — authed via ${authVia}${connections.length > 1 ? ` — ${connections.length} browsers connected, ${conn.label} is now active` : ''}`)
      } else {
        log('rejected connection: bad or missing token')
        ws.close(4003, 'bad token')
      }
      return
    }

    // a relay client's forwarded call: run it exactly like a stdio call and
    // send the outcome back; the cancel key mirrors the stdio one
    if (msg.type === 'relay_call') {
      const fromRelay = relays.find((x) => x.ws === ws)
      // initialize may arrive AFTER the relay handshake. Carry the current
      // caller on each request; never substitute the port owner's identity.
      if (fromRelay && typeof msg.clientName === 'string') fromRelay.clientName = clientLabel(msg.clientName)
      executeTool(String(msg.name || ''), msg.arguments || {}, `relay:${msg.id}`, fromRelay || anonClient).then((r) => {
        try { ws.send(JSON.stringify(Object.assign({ type: 'relay_result', id: msg.id }, r))) } catch (e) { /* relay gone */ }
      })
      return
    }
    if (msg.type === 'relay_cancel') {
      cancelByKey(`relay:${msg.id}`)
      return
    }

    if (msg.type === 'tool_result' && pendingCalls.has(msg.id)) {
      const pending = pendingCalls.get(msg.id)
      if (pending.conn.ws !== ws) return
      pendingCalls.delete(msg.id)
      clearTimeout(pending.timer)
      pending.resolve(msg)
    }

    // wake-channel chatter: pong answers our keepalive ping; wake_ack is the
    // extension's report of what an open_panel signal did (informational —
    // the real success signal is the panel's hello arriving)
    if (msg.type === 'wake_ack') {
      const w = wakeChannels.find((x) => x.ws === ws)
      log(`open_panel (${(w && w.family) || '?'}): ${msg.status || 'no status'}`)
    }
  })

  ws.on('close', (code, reason) => {
    clearTimeout(authTimer)
    const why = `close code ${code || '?'}${reason && reason.length ? `: ${reason}` : ''}`
    const relayIdx = relays.findIndex((r) => r.ws === ws)
    if (relayIdx !== -1) {
      const goneRelay = relays.splice(relayIdx, 1)[0]
      log(`relay client (bridge pid ${goneRelay.pid || '?'}) disconnected (${why})`)
      return
    }
    const wakeIdx = wakeChannels.findIndex((w) => w.ws === ws)
    if (wakeIdx !== -1) {
      const goneWake = wakeChannels.splice(wakeIdx, 1)[0]
      log(`wake channel (${goneWake.family}) disconnected`)
      return
    }
    const idx = connections.findIndex((c) => c.ws === ws)
    if (idx === -1) return
    const gone = connections.splice(idx, 1)[0]
    log(`Ui.Vision extension ${gone.label} disconnected (${why})`)
    for (const c of allClients()) if (c.pin === gone) c.pin = null
    if (activeConn === gone) {
      // most recent survivor takes over — same rule as a fresh hello
      activeConn = connections.length ? connections[connections.length - 1] : null
      if (activeConn) log(`${activeConn.label} is now the active browser`)
    }
    // Pins can target an older connection. Only fail calls owned by this
    // socket, whether or not it happened to be the newest connection.
    for (const [id, pending] of pendingCalls) {
      if (pending.conn !== gone) continue
      pendingCalls.delete(id)
      clearTimeout(pending.timer)
      pending.resolve({ id, text: `Error: the Ui.Vision extension (${gone.label}) disconnected while the call was running.`, isError: true })
    }
  })

  ws.on('error', () => { /* close handler does the cleanup */ })
}

// --- relay mode (we lost the port) -----------------------------------------
const relayPending = new Map() // relay call id -> { resolve, timer }
let relaySeq = 0
const RELAY_RETRY_MS = 3000

const startRelay = () => {
  const { WebSocket } = require('ws')
  const ws = new WebSocket(`ws://127.0.0.1:${port}`)
  const state = { ws, pid: 0, ready: false }
  relay = state
  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'hello', client: 'uivision-mcp-relay', relay: true, token, pid: process.pid, version: VERSION, clientName: CLIENT }))
  })
  ws.on('message', (data) => {
    let msg
    try { msg = JSON.parse(data.toString()) } catch (e) { return }
    if (msg.type === 'hello_ok') {
      if (msg.relay !== true) {
        // an OLDER bridge (pre-1.7.5) took us for an extension and would
        // route tool calls at us — get out before it does
        log(`the bridge owning port ${port} is v${msg.bridgeVersion || '?'} without relay support — restart the MCP server in the Claude Code window that started it (or close that window); retrying in ${RELAY_RETRY_MS / 1000}s`)
        try { ws.close(1000, 'no relay support') } catch (e) { /* gone */ }
        return
      }
      state.pid = msg.pid || 0
      state.ready = true
      log(`relay mode: this ${CLIENT || 'client'}'s tool calls go through the bridge of another MCP client (pid ${state.pid || '?'}) on port ${port}`)
      return
    }
    if (msg.type === 'relay_result' && relayPending.has(msg.id)) {
      const p = relayPending.get(msg.id)
      relayPending.delete(msg.id)
      clearTimeout(p.timer)
      p.resolve(msg)
    }
  })
  const gone = () => {
    if (relay !== state) return
    relay = null
    for (const [, p] of relayPending) {
      clearTimeout(p.timer)
      p.resolve(textResult('Error: the bridge this window was relaying through went away while the call was running — retry.', true))
    }
    relayPending.clear()
    if (state.ready) log(`relay target (pid ${state.pid || '?'}) went away — trying to take over port ${port}`)
    // the port may be free now (that window closed): try to own it; if
    // another bridge got there first this lands back in relay mode
    setTimeout(startServer, state.ready ? 500 : RELAY_RETRY_MS)
  }
  ws.on('close', gone)
  ws.on('error', () => { /* close follows */ })
}

const relayCall = (name, args, cancelKey) => new Promise((resolve) => {
  if (!relay || !relay.ready) {
    resolve(textResult(`Error: this MCP client's bridge is in relay mode (port ${port} belongs to another client's bridge) but the relay is not connected yet — retry in a few seconds.`, true))
    return
  }
  const id = `${process.pid}-${++relaySeq}`
  const timeoutMs = (TOOL_TIMEOUT_MS[name] || TOOL_TIMEOUT_MS.default) + 5000
  const timer = setTimeout(() => {
    relayPending.delete(id)
    rpcToWsCall.delete(cancelKey)
    resolve(textResult(`Error: relayed tool "${name}" timed out.`, true))
  }, timeoutMs)
  relayPending.set(id, {
    timer,
    resolve: (msg) => {
      rpcToWsCall.delete(cancelKey)
      if (msg.cancelled) { resolve({ cancelled: true }); return }
      if (msg.error) { resolve({ error: msg.error }); return }
      let content = msg.content || []
      if (name === 'bridge_status') {
        content = [{ type: 'text', text: `Relay mode: this MCP client has no bridge of its own on port ${port} — its tool calls are forwarded to the bridge of another client (pid ${relay ? relay.pid : '?'}). Everything below is that bridge's view.\n` }].concat(content)
      }
      resolve({ content, isError: !!msg.isError })
    }
  })
  rpcToWsCall.set(cancelKey, id)
  try {
    relay.ws.send(JSON.stringify({ type: 'relay_call', id, name, arguments: args || {}, clientName: stdioClient.clientName || 'MCP client' }))
  } catch (e) {
    clearTimeout(timer)
    relayPending.delete(id)
    rpcToWsCall.delete(cancelKey)
    resolve(textResult(`Error: relay send failed — ${e.message}`, true))
  }
})

const relayCancel = (id) => {
  const p = relayPending.get(id)
  if (p) {
    relayPending.delete(id)
    clearTimeout(p.timer)
    p.resolve({ cancelled: true })
  }
  if (relay && relay.ws) {
    try { relay.ws.send(JSON.stringify({ type: 'relay_cancel', id })) } catch (e) { /* best effort */ }
  }
}

// This text is the agent's only setup instructions when pairing has not
// happened yet, so it carries the token VALUE rather than the token's path.
// Telling the agent to go read a dotfile is fragile: sandboxes and permission
// classifiers routinely block reads of files in the home dir, and an agent
// that cannot complete the step improvises instead (writing the macro to a
// file, hand-editing MCP config) — the exact failure this text exists to
// prevent. Handing over the value costs nothing: the MCP client already
// spawned this process, so it is inside the trust boundary either way.
const NOT_CONNECTED_TEXT =
  'The Ui.Vision extension is not connected to the bridge yet. Walk the user through pairing — do NOT skip it, and do NOT fall back to writing macros to files:\n' +
  `(1) Ask them to open the Ui.Vision side panel > Settings > AI, switch ON "MCP bridge (Claude Code)", check the port reads ${port}, and click Test.\n` +
  '(2) Keep the side panel open while you work.\n' +
  `Pairing is automatic on current Chrome/Edge/Firefox — the bridge recognises the Ui.Vision extension by its origin, so NO pairing token is needed. Only if Test still reports the token is required, show the user this value to paste into the token field:  ${token}\n` +
  `(the same value is stored in ${TOKEN_FILE}).\n` +
  'Setup docs: https://ui.vision/mcp'

// send a tool call to the ACTIVE extension connection under a caller-chosen
// id (the id is pre-generated so notifications/cancelled can find the
// in-flight call)
const callExtensionTool = async (wsId, tool, args, who) => {
  if (!activeConn) await waitForConn(8000)
  const conn = targetFor(who)
  if (!conn) {
    return { text: NOT_CONNECTED_TEXT, isError: true }
  }
  const clientName = (who && who.clientName) || 'MCP client'
  return new Promise((resolve) => {
    const timeoutMs = TOOL_TIMEOUT_MS[tool] || TOOL_TIMEOUT_MS.default
    const timer = setTimeout(() => {
      pendingCalls.delete(wsId)
      resolve({ text: `Error: tool "${tool}" timed out after ${Math.round(timeoutMs / 1000)}s.`, isError: true })
    }, timeoutMs)
    pendingCalls.set(wsId, { resolve, timer, conn })
    try {
      conn.ws.send(JSON.stringify({ type: 'tool_call', id: wsId, tool, args: args || {}, clientName }))
    } catch (e) {
      clearTimeout(timer)
      pendingCalls.delete(wsId)
      resolve({ text: `Error: could not reach the extension — ${e.message}`, isError: true })
    }
  })
}

const cancelExtensionCall = (id, conn) => {
  if (conn) {
    try { conn.ws.send(JSON.stringify({ type: 'cancel', id })) } catch (e) { /* best effort */ }
  }
}

// ---------------------------------------------------------------------------
// MCP stdio server — the Claude Code side (newline-delimited JSON-RPC 2.0)
// ---------------------------------------------------------------------------

const writeMessage = (msg) => process.stdout.write(JSON.stringify(msg) + '\n')
const writeResult = (id, result) => writeMessage({ jsonrpc: '2.0', id, result })
const writeError = (id, code, message) => writeMessage({ jsonrpc: '2.0', id, error: { code, message } })

// cancel key (stdio rpc id, or "relay:<id>" for a relay client's call) ->
// extension call id (or relay call id), for cancellation forwarding
const rpcToWsCall = new Map()

const textResult = (text, isError) => ({ content: [{ type: 'text', text }], isError: !!isError })

const bridgeStatusText = (who) => {
  const mine = who && who.pin && connections.includes(who.pin) ? who.pin : null
  const wakeNote = wakeChannels.length
    ? `\nWake channels: ${wakeChannels.map((w) => `${w.family} (v${w.version || '?'}${shortId(w.origin) ? ', id ' + shortId(w.origin) : ''})`).join(', ')} — open_panel can reopen a disconnected browser's panel without user action.`
    : ''
  const relayNote = relays.length
    ? `\nRelays: ${relays.length} other MCP client${relays.length > 1 ? 's' : ''} (${relays.map((r) => `${r.clientName || 'unknown client'}, bridge pid ${r.pid || '?'}`).join('; ')}) forward their tool calls through this bridge.`
    : ''
  if (connections.length) {
    return `Bridge v${VERSION} (${CLIENT || 'unknown client'}) on port ${port}: ${connections.length} browser connection${connections.length > 1 ? 's' : ''}:\n` +
      connections.map((c) => '  ' + connLine(c)).join('\n') +
      (mine ? `\nYOUR calls go to ${mine.label} (pinned with select_browser).` : `\nYour calls go to the ACTIVE connection (newest) — pin one for yourself with select_browser; other clients on this bridge keep their own.`) +
      ` All tools are available. (Versions are what the browser had LOADED at connect time — after a rebuild/reinstall they refresh on the next reconnect.)` +
      wakeNote + relayNote
  }
  if (wakeChannels.length) {
    return `Bridge v${VERSION} on port ${port}: no tool connection, BUT a browser is running with a wake channel:${wakeNote}\nCall open_panel FIRST — it reopens the panel in seconds, no user action needed. Only fall back to the pairing walkthrough if open_panel fails.` + relayNote
  }
  return `Bridge v${VERSION} on port ${port}: Ui.Vision extension is NOT connected. ${NOT_CONNECTED_TEXT}` + relayNote
}

const openPanel = (args) => new Promise((resolve) => {
  const t = String(args.target || '').trim().toLowerCase()
  // never wake an instance that already holds a live tool connection — with
  // no target given, "wake all" must not pop tabs in connected browsers.
  // Matched per INSTANCE (extension origin), not per family: a dev rig runs
  // the Web Store copy and an unpacked dist/ in the same Chrome, and the
  // second one must be wakeable while the first is connected.
  const connectedKeys = new Set(connections.map(instanceKey))
  const targets = wakeChannels.filter((w) => (t ? w.family === t : true) && !connectedKeys.has(instanceKey(w)))
  if (t && !targets.length && connections.some((c) => c.family === t)) {
    resolve(textResult(`${t} is already connected (${connections.filter((c) => c.family === t).map((c) => c.label).join(', ')}) — nothing to wake.`, false))
    return
  }
  if (!targets.length) {
    const have = wakeChannels.length ? `Wake channels present: ${wakeChannels.map((w) => w.family).join(', ')}.` : 'No wake channel is connected at all.'
    resolve(textResult(`Cannot wake ${t || 'any browser'}: no matching wake channel. ${have} Either the browser process is not running, or its extension predates 10.0.170. If the browser is not running, start it yourself from your shell (Windows: "start chrome" / "start msedge" / "start firefox"; macOS: open -a "Google Chrome") — the extension's worker boots with the browser and connects the wake channel within seconds; then call open_panel again.`, true))
    return
  }
  const before = new Set(connections.map((c) => c.label))
  for (const w of targets) {
    try { w.ws.send(JSON.stringify({ type: 'open_panel' })) } catch (e) { /* its close handler cleans up */ }
  }
  log(`open_panel: waking ${targets.map((w) => `${w.family}${shortId(w.origin) ? ' ' + shortId(w.origin) : ''}`).join(', ')}`)
  // success = a NEW tool connection from a woken instance within 20s
  const wokenKeys = new Set(targets.map(instanceKey))
  const deadline = Date.now() + 20000
  const poll = () => {
    const fresh = connections.filter((c) => !before.has(c.label) && wokenKeys.has(instanceKey(c)))
    if (fresh.length) {
      resolve(textResult(`Panel reopened and connected: ${fresh.map(connLine).join('; ')}. Tool calls go to the ACTIVE connection.`, false))
      return
    }
    if (Date.now() > deadline) {
      resolve(textResult(`Wake signal sent to ${targets.map((w) => w.family).join(', ')}, but no panel connected within 20s. The browser may be blocked (locked profile dialog, crashed window) — a human has to look.`, true))
      return
    }
    setTimeout(poll, 500)
  }
  poll()
})

// Run one tool. Shared by the stdio path (this window's Claude Code) and the
// relay path (another window's bridge forwarding ITS Claude Code's call).
// Resolves { content, isError }, { cancelled: true } (answer nothing — per
// spec a cancelled request gets no response), or { error: { code, message } }.
// get_page: Ui.Vision's pre-1.7.11 name for browser_snapshot (Playwright MCP's
// name is the definition since bridge 1.7.11 / extension 10.0.216 — the
// OPEN-ISSUES 30.18 naming rule). Kept as an alias so existing prompts,
// runbooks and older clients keep working.
{
  const snapshot = TOOLS.find((t) => t.name === 'browser_snapshot')
  if (snapshot) TOOLS.push({ ...snapshot, name: 'get_page', description: 'Alias of browser_snapshot (the older Ui.Vision name) — identical behaviour. ' + snapshot.description })
}

const executeTool = async (name, args, cancelKey, who) => {
  who = who || stdioClient
  if (!TOOLS.some((t) => t.name === name)) return { error: { code: -32602, message: `Unknown tool: ${name}` } }
  if (name === 'get_page') name = 'browser_snapshot'

  // not our port: the bridge that owns it runs the call
  if (relay) return relayCall(name, args, cancelKey)

  if (name === 'bridge_status') return textResult(bridgeStatusText(who), false)
  if (name === 'open_panel') return openPanel(args)

  if (name === 'select_browser') {
    const conn = findConn(args.target)
    if (!conn) {
      const have = connections.length ? `Connected right now: ${connections.map((c) => c.label).join(', ')}.` : 'No browser is connected right now.'
      return textResult(`No connection matches "${args.target || ''}". ${have}`, true)
    }
    who.pin = conn
    log(`select_browser: ${conn.label} is now the browser for ${who.clientName || (who.kind === 'stdio' ? 'this client' : 'a relay client')}`)
    return textResult(`Your browser is now ${connLine(conn)}. All of YOUR tool calls go there until your next select_browser or until it disconnects; other MCP clients on this bridge keep their own choice.`, false)
  }

  const wsId = crypto.randomUUID()
  rpcToWsCall.set(cancelKey, wsId)
  const result = await callExtensionTool(wsId, name, args, who)
  rpcToWsCall.delete(cancelKey)
  if (result.cancelled) return { cancelled: true }

  const content = [{ type: 'text', text: result.text || '' }]
  if (result.base64Image) {
    content.push({ type: 'image', data: result.base64Image, mimeType: 'image/png' })
  }
  return { content, isError: !!result.isError }
}

const handleToolsCall = async (rpcId, params) => {
  const name = (params && params.name) || ''
  const args = (params && params.arguments) || {}
  const r = await executeTool(name, args, rpcId)
  if (r.cancelled) return
  if (r.error) {
    writeError(rpcId, r.error.code, r.error.message)
    return
  }
  writeResult(rpcId, { content: r.content, isError: !!r.isError })
}

// cancel the in-flight call behind a cancel key (stdio rpc id or relay key)
const cancelByKey = (key) => {
  if (!rpcToWsCall.has(key)) return
  const callId = rpcToWsCall.get(key)
  rpcToWsCall.delete(key)
  if (relay) {
    relayCancel(callId)
    return
  }
  const pending = pendingCalls.get(callId)
  if (pending) {
    pendingCalls.delete(callId)
    clearTimeout(pending.timer)
    // resolve with a marker — the caller then skips the response
    pending.resolve({ cancelled: true })
  }
  cancelExtensionCall(callId, pending && pending.conn)
}

const handleRpc = (msg) => {
  const { id, method, params } = msg

  // notifications (no id)
  if (id === undefined || id === null) {
    if (method === 'notifications/cancelled' && params) cancelByKey(params.requestId)
    return
  }

  switch (method) {
    case 'initialize': {
      const declaredClient = clientLabel(params && params.clientInfo && params.clientInfo.name)
      if (declaredClient) CLIENT = stdioClient.clientName = declaredClient
      const requested = params && params.protocolVersion
      const protocolVersion = KNOWN_PROTOCOL_VERSIONS.includes(requested) ? requested : LATEST_PROTOCOL_VERSION
      writeResult(id, {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: 'uivision-mcp-bridge', title: 'Ui.Vision MCP', version: VERSION }
      })
      break
    }
    case 'ping':
      writeResult(id, {})
      break
    case 'tools/list':
      writeResult(id, { tools: TOOLS })
      break
    case 'tools/call':
      handleToolsCall(id, params).catch((e) => writeError(id, -32603, `Internal error: ${e.message}`))
      break
    default:
      writeError(id, -32601, `Method not found: ${method}`)
  }
}

let stdinBuffer = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  stdinBuffer += chunk
  let nl
  while ((nl = stdinBuffer.indexOf('\n')) >= 0) {
    const line = stdinBuffer.slice(0, nl).trim()
    stdinBuffer = stdinBuffer.slice(nl + 1)
    if (!line) continue
    let msg
    try {
      msg = JSON.parse(line)
    } catch (e) {
      log(`ignoring non-JSON stdin line: ${line.slice(0, 120)}`)
      continue
    }
    try {
      handleRpc(msg)
    } catch (e) {
      log(`error handling ${msg.method}: ${e.message}`)
      if (msg.id !== undefined && msg.id !== null) writeError(msg.id, -32603, e.message)
    }
  }
})

// MCP client went away -> shut down (Claude Code closes stdin on exit)
process.stdin.on('end', () => {
  log('stdin closed — shutting down')
  process.exit(0)
})
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

startServer()
log(`uivision-mcp-bridge v${VERSION} started (MCP on stdio, extension socket on 127.0.0.1:${port})`)
