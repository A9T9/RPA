# Ui.Vision MCP

**Ui.Vision MCP** is an MCP server for browser and desktop automation with OCR,
image recognition and real mouse and keyboard input. It connects any MCP client
— Claude Code, Claude Desktop, Cursor, Windsurf, VS Code, LM Studio — to the
[Ui.Vision RPA](https://ui.vision) browser extension and the Ui.Vision for
Desktop app. The agent writes automation scripts (JavaScript on the `uiv.*`
API), runs them, reads the log and screenshots, and iterates. Web pages are
driven through the DOM or Chrome's trusted input (CDP); everything else on the
screen — desktop applications, legacy Windows software, remote desktops,
Citrix, PDFs, canvas and video — is driven visually through OCR and image
search. That screen-level reach is what sets it apart from DOM-only servers
such as Playwright MCP or Chrome DevTools MCP.

npm package: `uivision-mcp-bridge`. The process is a *bridge*: it relays MCP
tool calls over a local WebSocket to the extension, where they execute.

```bash
npx uivision-mcp-bridge --setup
```

registers the server with every MCP client found on the machine; then enable
the bridge in the Ui.Vision side panel (Settings → AI). Details under
[Setup](#setup).

## Tools

The server exposes the same tools the extension's built-in AI chat uses:
`create_macro`, `set_macro`, `run_macro`, `browser_snapshot`, `screenshot`
and the vision-image helpers (`save_element_image`, `save_relative_image`),
plus `list_macros` / `open_macro` / `delete_macro` (cleanup of agent-created
macros — restricted to the "AI Generated" folder), `get_authoring_guide` (the
uiv.* JS API reference — clients read it before writing their first macro; JS
script macros are the preferred form), `open_panel`, `select_browser`,
`bridge_status`, `reload_extension`, `run_selftest` (every Settings >
Desktop Automation self-test in one call, answered with `SELFTEST: ALL OK` or
`SELFTEST: PROBLEMS FOUND` plus one line per test - the first thing to run
when a macro misbehaves; the same report is behind the "Copy report" button
in Settings, for support, the forum, or an AI without MCP), and desktop
`click_at` / `type_at`. If no
web page tab is open when a macro runs, the extension opens https://ui.vision
as the play tab automatically.

While the bridge executes tool calls, the side panel shows a
**"Claude (MCP) is controlling Ui.Vision"** banner, and `run_macro` /
`set_macro` refuse to act if the editor no longer shows the macro the session
last opened — so an agent cannot silently run or edit a macro the user
switched to in the panel meanwhile.

`run_macro` takes its target explicitly: `macro` (a stored macro name from
`list_macros` — opened, then run) or `script` (inline JS run directly, nothing
saved). With neither it runs whatever the editor holds, guarded by the race
check above.

## How it works

```
Claude Code  ── MCP (stdio) ──►  uivision-mcp-bridge.js  ◄── WebSocket (127.0.0.1) ──  Ui.Vision extension
```

The bridge is the rendezvous point: Claude Code launches it as an MCP server;
the extension's side panel dials out to its local WebSocket server (browser
extensions cannot accept incoming connections). Tool calls are forwarded to
the extension and executed there.

While the bridge is connected the side panel shows a purple **MCP: chrome#1**
strip above the tabs (extension 10.0.183+): the connection label, the client
behind the bridge ("Claude connected", "LM Studio connected" — bridge 1.7.9
reads it from its parent process; 10.0.215+ shows it), the tool it is
executing right now, and a red **STOP** button. STOP halts the
running macro, answers the in-flight call with "stopped by the user", and
switches the bridge off (Settings > AI to re-enable). The panel switches to
Data > Logs on connect; every bridge line there is tagged `[MCP]`.

Bridge 1.7.13+ uses the MCP `initialize.clientInfo.name` for the caller label,
with parent-process detection only as a fallback. Relayed calls preserve their
own caller name, even when initialization follows the relay handshake. An
unnamed relay appears as "MCP client", never as the bridge owner's client.

## Setup

1. **Run the installer** once in a terminal (npm fetches the bridge
   automatically):

   ```bash
   npx uivision-mcp-bridge --setup
   ```

   It writes the `uivision` server entry into every MCP client it finds on the
   machine — Claude Code (`~/.claude.json`), Claude Desktop, Cursor, Windsurf
   and VS Code — and then prints the pairing token for step 2. Existing config
   is merged, not replaced, and a `.uivision-backup` copy is written first. A
   config file that is not valid JSON is reported and left untouched.

   `--setup` exists because `claude mcp add ...` needs the `claude` CLI on
   PATH, and it is not there in the desktop app, the VS Code extension, Cursor
   or Windsurf. For a client the installer does not know, add this by hand
   (VS Code nests it under `"servers"` instead of `"mcpServers"`):

   ```json
   { "mcpServers": { "uivision": { "command": "npx", "args": ["-y", "uivision-mcp-bridge"] } } }
   ```

   Working from a checkout of this repo instead: `cd mcp && npm install`, then
   register `node /absolute/path/to/mcp/uivision-mcp-bridge.js`.

   MCP clients load their servers at **startup** — after registering, quit the
   client completely and reopen it (a new session or tab is not enough), then
   check with `/mcp` that `uivision` is listed. If the client was running while
   `--setup` wrote its config, quit it and run `--setup` once more: some clients
   rewrite their config on exit and would drop the entry.

2. **Enable the bridge in Ui.Vision**: open the Ui.Vision side panel →
   Settings → AI → *MCP bridge (Claude Code)* → enable it, keep the default
   port (50888) unless you changed it, click *Test*.

   **No pairing token is needed on current browsers** (bridge 1.7+): the
   browser stamps the WebSocket handshake with the extension's origin, which
   web content cannot forge, so the bridge recognises the real Ui.Vision
   extension directly. The token field stays as a fallback — fill it in only if
   *Test* reports one is required (an older bridge, or a connection that sends
   no origin). Dev/test browsers (unpacked/temporarily loaded extension, or a
   Firefox Developer/Beta build) additionally get the bridge switch ON by
   default; store installs keep the opt-in switch.

   Need the fallback token? It is in `~/.uivision_mcp_token`; `--setup` prints
   it again; or just ask the AI — while the extension is unpaired every bridge
   tool result carries the token value, so the agent can show it to you in chat
   without reading any file.

3. **Keep the side panel open** — the tools execute in the side panel context.
   If it is closed, tool calls return "extension not connected".

   **The AI reopens the panel itself when needed** (extension 10.0.170+ with
   bridge 1.5+): the extension keeps a thin background *wake channel* to the
   bridge, and the `open_panel` tool opens the Ui.Vision app in a tab over it
   — even when the browser sits in the tray with zero windows (a window is
   created). The extension never opens anything on its own: reopening is
   always an explicit agent action (the deliberate exception: after the
   agent's own `reload_extension`, the panel comes back automatically so the
   build-reload-verify loop closes). If the browser process itself is not
   running, the agent starts it from its shell (`start chrome`), waits a few
   seconds for the wake channel, and calls `open_panel` — so a macro run can
   begin with the browser fully closed. Closing the panel by hand still
   pauses everything until an agent explicitly asks for it back; the panel's
   Logs tab records each reopen as "[MCP] panel reopen trace".

Then just chat in Claude Code: *"Use Ui.Vision to build a macro that logs into
example.com and downloads the report"* — Claude creates the macro, runs it,
reads the log, and iterates. You can watch it work live in the side panel.

### LM Studio (local models, no cloud)

LM Studio's chat (0.3.17+) is an MCP client too, so a local model can drive
Ui.Vision the same way. Add the server to `~/.lmstudio/mcp.json` (forward
slashes — a Windows backslash path is not valid JSON):

```json
{ "mcpServers": { "uivision": { "command": "npx", "args": ["-y", "uivision-mcp-bridge"] } } }
```

LM Studio picks the file up without a restart: in a chat, open the right
sidebar's *Integrations* tab and switch **mcp/uivision** on. The first tool
call spawns the bridge; LM Studio asks *Proceed / Deny* for every call unless
you tick *Always allow any tool from mcp/uivision*. Pick a model with tool
calling and vision, loaded with a **large context** — verified 2026-09-06
with Qwen3.6-27B (Q4_K_M) on a 24 GB GPU, loaded as
`lms load qwen/qwen3.6-27b --gpu max -c 65536 --parallel 1` (`--parallel 1`
matters: the default 4 slots multiply the KV cache and spill to system RAM).
If Claude Code's bridge already owns port 50888, LM Studio's copy becomes a
relay through it — both clients share the one extension.

The same LM Studio server also serves as the chat model *inside* the
extension: Settings > AI > *Local — OpenAI-compatible*, base URL
`http://localhost:1234/v1`, model = the LM Studio identifier. The chat's
instructions alone are ~40k tokens, so the model needs a 64k+ context window.

## Options

| Option | Default | Notes |
|---|---|---|
| `--setup` | — | One-shot installer: registers the bridge with every MCP client on the machine, prints the pairing token, exits. Never starts a server. Combine with `--port` to register a non-default port. |
| `--port <n>` / `UIVISION_MCP_PORT` | `50888` | WebSocket port (127.0.0.1 only). Must match the port in Ui.Vision settings. |
| `--token <t>` / `UIVISION_MCP_TOKEN` | auto-generated | Shared secret; auto-persisted to `.uivision_mcp_token` in the user's home directory when not passed. |

## Browser support

Verified on **Chrome** (side panel) and **Firefox** (sidebar, same panel code)
— tested 2026-07-28 on Firefox 154: connect + toast, all uiv.* guard errors,
`{area}`-limited visual finds with correct coordinate rebase, and `shot.area`
authoring all behave identically. Macros driving `uiv.browser.*` (CDP trusted
input) remain Chrome-only; on Firefox use `uiv.page.*` / `uiv.desktop.*`.

### Several browsers at once (bridge 1.4+)

Since bridge 1.7.10 `select_browser` is **per MCP client**: when Claude Code
and LM Studio share one bridge, each keeps its own target (LM Studio can drive
Chrome while Claude Code watches through Edge). A client that never called
`select_browser` uses the newest connection. Note that Edge running the same
build as Chrome reports the same extension id — the bridge tells the two
apart by browser family.


Every browser — and every instance or profile of one — keeps its **own**
connection to the bridge, labelled `family#n` in connect order: `chrome#1`,
`chrome#2`, `firefox#1`, … The label shows in the extension's panel footer
(`MCP: chrome#1`) and in Settings > AI, so you can tell instances apart at a
glance. Tool calls go to the **active** connection — the most recently
connected browser by default; the `select_browser` tool switches (a bare
family name like `"firefox"` means the newest of that family, `"chrome#2"`
pins the exact instance), and `bridge_status` lists every connection with the
active one marked. Verified live: Chrome and Firefox running the full Core
demo set in parallel over one bridge.

`open_panel` (bridge 1.7.3+) tells instances apart by their extension origin,
so two copies of the extension in one browser — say the Web Store build and
an unpacked development build in the same Chrome — are woken independently:
with the store copy connected, `open_panel` still reopens the panel of the
unpacked one. `bridge_status` shows each wake channel's extension id.

## Security

- The WebSocket server binds to `127.0.0.1` only — nothing is reachable from
  the network.
- Connections authenticate by **origin**: the browser stamps the handshake with
  the extension's origin and web content cannot forge it, so the bridge admits a
  first-party Ui.Vision extension (an allowlisted `chrome-extension://…` id, or
  any `moz-extension://…`) with no token. A web page's origin is its site, so a
  page dialing `127.0.0.1` is rejected outright — and a socket can only *receive*
  forwarded tool calls anyway, never issue them. Connections that carry no origin
  (a native local client) still authenticate with the shared token within 5
  seconds or are dropped. A malicious native process can spoof an origin header,
  but it already has full machine access, so this changes nothing for that case.
- The extension applies the same guardrails as its built-in AI chat: user
  macro files are never overwritten (edits are saved as copies in the
  "AI Generated" folder), and preinstalled demo macros are not run without
  explicit confirmation.

## Troubleshooting

- **No `uivision` tools in the session at all**: the client was not restarted
  after `--setup`, or was running while `--setup` wrote its config. Quit it
  completely, re-run `--setup`, reopen.
- Ask Claude to call the `bridge_status` tool — it reports whether the
  extension is connected, and while unpaired it returns the pairing token.
- Bridge logs go to stderr (visible via `claude --debug` or in Claude Code's
  MCP logs).
- Several Claude Code windows open at once (bridge 1.7.5+): each window
  starts its own bridge, only one can own the port. The others switch to
  relay mode and forward their tool calls through the owner, so every
  window has working tools. `bridge_status` says when a window is relaying.
  When the owning window closes, a relay takes the port over.
- "Port in use" with an OLDER bridge on the port (pre-1.7.5): the log names
  the owning pid; restart the MCP server in that window or close it. Or pick
  a different `--port` (and update it in Ui.Vision settings).
