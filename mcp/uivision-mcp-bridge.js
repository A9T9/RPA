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

const VERSION = '1.2.0'
const DEFAULT_PORT = 50888
// MCP protocol revisions this bridge knows; echo the client's if recognized
const KNOWN_PROTOCOL_VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18']
const LATEST_PROTOCOL_VERSION = '2025-06-18'

// run_macro can legitimately take many minutes (the extension caps a run at
// 10 min); everything else should answer quickly
const TOOL_TIMEOUT_MS = { run_macro: 15 * 60 * 1000, default: 3 * 60 * 1000 }

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
  out('  Your Ui.Vision pairing token')
  out('')
  out(`      ${token}`)
  out('')
  out('  Paste it into the browser: open the Ui.Vision side panel, go to')
  out('  Settings > AI > "MCP bridge (Claude Code)", switch it ON, paste the')
  out(`  token, check the port reads ${port}, then click Test.`)
  out('')
  out('  >> NOW QUIT AND REOPEN THE APP(S) LISTED ABOVE <<')
  out('  MCP servers load only at startup, so an app that was already running')
  out('  will not see Ui.Vision. Quit it completely — opening a new chat,')
  out('  session or tab is not enough. If it was running while this command')
  out('  wrote its config, quit it and run this command once more: some apps')
  out('  rewrite their config on exit and would drop the entry.')
  out('')
  out('  Then ask it: "build a Ui.Vision macro that ..."')
  out('  Docs: https://ui.vision/ai/mcp-bridge')
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
      'Reports whether the Ui.Vision browser extension is currently connected to this bridge. Call this first if other tools fail — it tells you whether the extension side panel is open and the bridge is enabled in its settings.',
    inputSchema: { type: 'object', properties: {}, required: [] }
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
      'Run the macro currently in the Ui.Vision editor against the browser tab and wait for it to finish (can take minutes). Returns the execution log, including the error and failing line if it fails.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm_demo_run: {
          type: 'boolean',
          description: 'Set true ONLY when the user explicitly asked to run, test or fix the preinstalled demo macro currently in the editor.'
        },
        ...WHY
      },
      required: []
    }
  },
  {
    name: 'get_page',
    description:
      'Returns the structure of the browser tab Ui.Vision plays in: URL, title, form fields, buttons and links, each with a ready-to-use locator (id=, name= or css=). Includes iframes. Pass "url" to open that page first and inspect it; omit it to inspect the current tab. Cannot see into closed shadow roots or cross-origin iframes.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Optional. Navigate the tab here first, wait for the load, then inspect.' },
        ...WHY
      },
      required: []
    }
  },
  {
    name: 'screenshot',
    description:
      'Returns a screenshot of the visible part of the browser tab Ui.Vision plays in. Coordinates passed to save_element_image / save_relative_image are absolute pixels in this image.',
    inputSchema: { type: 'object', properties: { ...WHY }, required: [] }
  },
  {
    name: 'save_element_image',
    description:
      'Crop a rectangle from the MOST RECENT screenshot and save it as a Ui.Vision vision image, for image-based commands like "BClick | Target: <name>.png". Coordinates are absolute pixels in the last screenshot. Returns the saved file name plus the cropped image for verification.',
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

let extensionSocket = null // the (single) authenticated extension connection
// version the extension reported in its hello — bridge_status shows it so a
// stale loaded build (dist/dist_ff rebuilt but never reloaded in the browser)
// is visible instead of being mistaken for a code bug
let extensionVersion = ''
const pendingCalls = new Map() // id -> { resolve, timer }

const wss = new WebSocketServer({ host: '127.0.0.1', port })

wss.on('listening', () => log(`WebSocket server listening on ws://127.0.0.1:${port} (for the Ui.Vision extension)`))
wss.on('error', (e) => {
  log(`WebSocket server error: ${e.message}`)
  if (e.code === 'EADDRINUSE') {
    log(`port ${port} is in use — another bridge running? Pass --port to change it.`)
    process.exit(1)
  }
})

wss.on('connection', (ws) => {
  let authed = false
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
      if (msg.type === 'hello' && tokenMatches(msg.token)) {
        // probe (the extension's Settings > AI "Test" button, which runs in a
        // window WITHOUT the bridge client): validate the token, report
        // whether the side panel is connected, close — do NOT touch the real
        // extension connection
        if (msg.probe) {
          clearTimeout(authTimer)
          ws.send(JSON.stringify({ type: 'hello_ok', bridgeVersion: VERSION, extensionConnected: !!extensionSocket }))
          try { ws.close(1000, 'probe done') } catch (e) { /* already gone */ }
          log('token probe OK (Settings > AI "Test" button)')
          return
        }
        authed = true
        clearTimeout(authTimer)
        // newest connection wins (e.g. the side panel was reopened)
        if (extensionSocket && extensionSocket !== ws) {
          try { extensionSocket.close(4002, 'replaced by new connection') } catch (e) { /* already gone */ }
        }
        extensionSocket = ws
        extensionVersion = msg.version || ''
        ws.send(JSON.stringify({ type: 'hello_ok', bridgeVersion: VERSION }))
        log(`Ui.Vision extension connected (${msg.client || 'unknown'} ${msg.version || ''})`)
      } else {
        log('rejected connection: bad or missing token')
        ws.close(4003, 'bad token')
      }
      return
    }

    if (msg.type === 'tool_result' && pendingCalls.has(msg.id)) {
      const pending = pendingCalls.get(msg.id)
      pendingCalls.delete(msg.id)
      clearTimeout(pending.timer)
      pending.resolve(msg)
    }
  })

  ws.on('close', () => {
    clearTimeout(authTimer)
    if (extensionSocket === ws) {
      extensionSocket = null
      extensionVersion = ''
      log('Ui.Vision extension disconnected')
      // fail pending calls rather than letting them hang to timeout
      for (const [id, pending] of pendingCalls) {
        clearTimeout(pending.timer)
        pending.resolve({ id, text: 'Error: the Ui.Vision extension disconnected while the call was running.', isError: true })
      }
      pendingCalls.clear()
    }
  })

  ws.on('error', () => { /* close handler does the cleanup */ })
})

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
  `(1) Show them this pairing token verbatim in your reply — they cannot continue without it:  ${token}\n` +
  `(2) Ask them to open the Ui.Vision side panel > Settings > AI, switch ON "MCP bridge (Claude Code)", paste that token, check the port reads ${port}, and click Test.\n` +
  '(3) The side panel must stay open while you work.\n' +
  `(The same value is stored in ${TOKEN_FILE} — but you do not need to read it, the token above is authoritative.)\n` +
  'Setup docs: https://ui.vision/ai/mcp-bridge'

// send a tool call to the extension under a caller-chosen id (the id is
// pre-generated so notifications/cancelled can find the in-flight call)
const callExtensionTool = (wsId, tool, args) => {
  if (!extensionSocket) {
    return Promise.resolve({ text: NOT_CONNECTED_TEXT, isError: true })
  }
  return new Promise((resolve) => {
    const timeoutMs = TOOL_TIMEOUT_MS[tool] || TOOL_TIMEOUT_MS.default
    const timer = setTimeout(() => {
      pendingCalls.delete(wsId)
      resolve({ text: `Error: tool "${tool}" timed out after ${Math.round(timeoutMs / 1000)}s.`, isError: true })
    }, timeoutMs)
    pendingCalls.set(wsId, { resolve, timer })
    try {
      extensionSocket.send(JSON.stringify({ type: 'tool_call', id: wsId, tool, args: args || {} }))
    } catch (e) {
      clearTimeout(timer)
      pendingCalls.delete(wsId)
      resolve({ text: `Error: could not reach the extension — ${e.message}`, isError: true })
    }
  })
}

const cancelExtensionCall = (id) => {
  if (extensionSocket) {
    try { extensionSocket.send(JSON.stringify({ type: 'cancel', id })) } catch (e) { /* best effort */ }
  }
}

// ---------------------------------------------------------------------------
// MCP stdio server — the Claude Code side (newline-delimited JSON-RPC 2.0)
// ---------------------------------------------------------------------------

const writeMessage = (msg) => process.stdout.write(JSON.stringify(msg) + '\n')
const writeResult = (id, result) => writeMessage({ jsonrpc: '2.0', id, result })
const writeError = (id, code, message) => writeMessage({ jsonrpc: '2.0', id, error: { code, message } })

// tools/call id -> extension call id, for cancellation forwarding
const rpcToWsCall = new Map()

const handleToolsCall = async (rpcId, params) => {
  const name = (params && params.name) || ''
  const args = (params && params.arguments) || {}

  if (!TOOLS.some((t) => t.name === name)) {
    writeError(rpcId, -32602, `Unknown tool: ${name}`)
    return
  }

  if (name === 'bridge_status') {
    const text = extensionSocket
      ? `Bridge v${VERSION} on port ${port}: Ui.Vision extension v${extensionVersion || '?'} is CONNECTED. All tools are available. (That version is the build the browser has LOADED — after a rebuild it only changes once the extension is reloaded.)`
      : `Bridge v${VERSION} on port ${port}: Ui.Vision extension is NOT connected. ${NOT_CONNECTED_TEXT}`
    writeResult(rpcId, { content: [{ type: 'text', text }], isError: false })
    return
  }

  const wsId = crypto.randomUUID()
  rpcToWsCall.set(rpcId, wsId)
  const result = await callExtensionTool(wsId, name, args)
  rpcToWsCall.delete(rpcId)
  if (result.cancelled) return

  const content = [{ type: 'text', text: result.text || '' }]
  if (result.base64Image) {
    content.push({ type: 'image', data: result.base64Image, mimeType: 'image/png' })
  }
  writeResult(rpcId, { content, isError: !!result.isError })
}

const handleRpc = (msg) => {
  const { id, method, params } = msg

  // notifications (no id)
  if (id === undefined || id === null) {
    if (method === 'notifications/cancelled' && params && rpcToWsCall.has(params.requestId)) {
      const wsId = rpcToWsCall.get(params.requestId)
      rpcToWsCall.delete(params.requestId)
      const pending = pendingCalls.get(wsId)
      if (pending) {
        pendingCalls.delete(wsId)
        clearTimeout(pending.timer)
        // resolve with a marker — handleToolsCall then skips the response
        // (per spec a cancelled request gets no answer)
        pending.resolve({ cancelled: true })
      }
      cancelExtensionCall(wsId)
    }
    return
  }

  switch (method) {
    case 'initialize': {
      const requested = params && params.protocolVersion
      const protocolVersion = KNOWN_PROTOCOL_VERSIONS.includes(requested) ? requested : LATEST_PROTOCOL_VERSION
      writeResult(id, {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: 'uivision-mcp-bridge', version: VERSION }
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

log(`uivision-mcp-bridge v${VERSION} started (MCP on stdio, extension socket on 127.0.0.1:${port})`)
