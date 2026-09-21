# Benchmark: Ui.Vision MCP bridge vs Claude for Chrome (2026-09-05) — Playwright MCP added 2026-09-06, Codex Chrome added 2026-09-10

The original results below are historical. A fourth contender, the active
**Codex browser extension for Chrome**, was tested on Windows on 2026-09-10.
See the [Codex run and evidence](../benchmark-runs/2026-09-10-codex-chrome/README.md).
This is a different agent/session and date, not a controlled same-agent speed
comparison. Earlier generalizations about the other tools remain observations
from their original runs, not claims about the Codex extension.

![Infographic comparing open-source status, local LLM support, task outcomes, strengths, weaknesses and qualified timings for all four tools](../benchmark-runs/2026-09-10-codex-chrome/browser-benchmark-infographic-v4.png)

The added capability rows concern the browser tools, not their underlying AI
models or Codex CLI. Ui.Vision and Playwright MCP have public source releases
([Ui.Vision](https://github.com/A9T9/RPA),
[Playwright MCP](https://github.com/microsoft/playwright-mcp)). No public
open-source release was identified for the Claude/Codex Chrome extensions;
the infographic's `No*` is qualified accordingly. The separate
[Codex CLI](https://github.com/openai/codex) is open source.

Local LLM support means local inference through a compatible MCP client:
Ui.Vision documents [LM Studio setup](README.md#lm-studio-local-models-no-cloud)
and has a [recorded local-model run](../benchmark-runs/2026-09-06-qwen3.6-27b-lmstudio/README.md).
Playwright MCP supports arbitrary MCP clients; its local-LLM `Yes` is an
integration capability, not a local-model benchmark result from this run.
`No` refers to the tested Claude/Codex browser integrations. It does not imply
Codex CLI cannot use a local model or that target websites work offline.

| Task (original T1–T7 numbering) | Codex Chrome extension, 2026-09-10 |
|---|---|
| T1 eight-field form, no submit | **PARTIAL under strict readback rubric; VISUAL PASS.** Screenshot verifies all eight values. AX and read-only evaluation omit telephone/email values. Initial investigation: 5 REPL calls, 36.1 s through failed machine readback; later typed recovery and three fresh replays visually correct. |
| T2 table → five rows including CJK | **PASS.** Initial snapshot extraction: 34.1 s including failed locator/evaluate attempts and agent turns; settled replay: 1 REPL call, 3.16 s. All 15 cells extracted; CSV saved by host file I/O. Whitespace normalized by snapshot. |
| T3 three tabs opened, titles read, tabs closed | **PASS.** 1 REPL call / 16 browser API invocations, 9.56 s; closure checked against tab list. |
| T4 canvas-only invoice | **VISUAL PASS.** 1 REPL call, 3.92 s to screenshot; both lines read by model. No tool-returned OCR string. Fixture reconstructed because the original HTML was not committed. |
| T5 native Save As and file on disk | **BLOCKED — verification unavailable.** Original Ctrl+S + browser AX/screenshot took 0.223 s; native dialog and disk artifact were not verified. On retest, the desktop observation tool stopped before Ctrl+S because it could not determine Chrome's URL confidently enough for its policy checks. This is a blocked test, not a demonstrated save failure. |
| T6 browser-internal / extension pages | **BLOCKED.** `chrome://version` rejected by browser URL policy before navigation. No workaround attempted; `chrome://dino` and extension-page variants not run after that block. |
| T7 find download links on ui.vision | **PASS.** 1 REPL call, 2.60 s to homepage snapshot containing Chrome, Edge, Firefox install URLs and Desktop Automation download link. |
| Repeatability: T1 × 3 | **VISUAL PASS × 3**, strict readback still partial. 1 REPL call for loop; 1.888 / 1.697 / 1.694 s per iteration including reload, fresh AX refs, eight inputs, AX and screenshot. |

Codex's REPL can batch browser operations and reuse a program. It attaches to
the user's existing Chrome through the extension. In this run, the text
interfaces and screenshots exposed different form information: an empty text
read was not reliable evidence of an empty field. Native Save and restricted
URLs did not satisfy the benchmark. These are observations of the configured
tool surface, not proof of limitations of every Codex configuration.

## Codex Chrome extension — strengths

- **Reusable, batched browser programs.** The persistent JavaScript REPL ran
  all three form replays in one call, rebuilding refs from fresh AX state on
  each reload. Each iteration took 1.69–1.89 s and passed visually. T3 also
  completed the full three-tab lifecycle in one call, including closure checks.
- **Uses the user's existing Chrome.** Discovery identified an active
  extension connection, and the tests ran through that connection without
  launching a separate browser/profile. Logged-in workflows were not tested.
- **Text and visual observations complement each other.** DOM snapshots
  exposed all five table rows, including Chinese, and the browser install
  links. Screenshots made the canvas invoice readable and showed form values
  omitted by the text interfaces, allowing the agent to correct its diagnosis.
- **Can deliver reusable files alongside browser results.** This run saved
  replay code, JSON observations, screenshots and a five-row CSV in the repo.
  This is a strength of the combined Codex/browser/host workflow; those files
  were written through host file I/O, not an extension-native artifact store.

## Codex Chrome extension — weaknesses

- **Incomplete machine-readable form verification.** Telephone and email
  appeared correctly in screenshots but were empty in AX/evaluation output.
  T1 therefore remains partial under the strict readback rubric, even though
  the replays passed visually. The cause of the omission was not established.
- **The evaluation interface was not interchangeable with page JavaScript.**
  `FormData` was unavailable. On T2, a table locator evaluation timed out and
  direct table lookup returned null despite the table being in the snapshots.
  Parsing snapshot cells recovered the data, but normalized whitespace and
  tied the replay to the snapshot's text structure.
- **Recovery and interpretation cost agent turns.** Initial T1 investigation
  took 36.1 s through failed readback; initial T2 row extraction took 34.1 s.
  The agent initially mistook missing text values for failed input. Fast settled
  replay timings do not include this authoring and diagnosis cost.
- **Pixel verification still depended on model vision.** T4 returned an image,
  not an OCR string the script could assert against. The expected text was
  already known, so this run does not establish general OCR accuracy.
- **Native and restricted-page tasks were not completed.** T5 produced no
  verified native Save dialog/file outcome; browser-only screenshots could
  not establish the dialog's state. T6 was blocked by the tool URL policy.
  Neither result demonstrates the desktop reach that Ui.Vision exercised in
  its historical runs; other Codex configurations were not tested.
- **Replay requires the surrounding agent runtime.** The saved helpers use
  initialized CUA/browser handles. This run did not demonstrate a built-in
  macro library, scheduler, or unattended execution independent of that runtime.

## Original Ui.Vision / Claude for Chrome run — setup

Same agent (a Claude Code session), same browser (the user's Google Chrome
152, native Wayland on GNOME, 1.25 display scaling, Linux), same tasks.
Ui.Vision = extension 10.0.206/207 + Desktop Automation host 2.0.15 driven
through `uivision-mcp-bridge` 1.7.8 (`run_macro {script}`); Claude for
Chrome (C4C) = the `claude-in-chrome` MCP tools (`browser_batch`, `navigate`,
`read_page`, `find`, `form_input`, `javascript_tool`, `computer`).

Every task has a machine-checkable outcome. "Calls" = MCP tool calls the
agent issued; "actions" = items inside `browser_batch`. C4C wall-clock is
measured from shell timestamps around the calls and therefore INCLUDES the
agent's own turn latency between calls (the honest cost of driving a page
turn by turn); Ui.Vision wall-clock is the `run_macro` round trip of a
script the agent wrote once (writing it costs one model turn, like one C4C
turn — reruns are one call).

## Results

| Task | Ui.Vision (calls · s · result) | Claude for Chrome (calls/actions · s · result) |
|---|---|---|
| T1 form fill, 8 fields, values read back (httpbin.org/forms/post, no submit) | 1 · 2.4 / 2.0 / 2.0 (3 runs) · PASS | 3 / 12 · 35 · PASS |
| T2 table → rows (ui.vision/demo/table, 5 rows incl. CJK cell) | 1 · 1.8 · PASS, rows written to a CSV in the extension's file store | 1 / 2 · 15 · PASS, rows exist only in the agent's context |
| T3 three tabs opened, titles read, tabs closed | 1 · 4.2 · PASS | 2 / 12 · 22 · PASS (a created tab's id is only known after the batch ends) |
| T4 text that exists only as PIXELS (canvas-rendered invoice line) | 1 · 2.9 · PASS — local OCR read `INVOICE 2026-0917 TOTAL DUE: 1,234.56 EUR` verbatim, checked by regex | 1 / 3 · 24 · PASS — zoom screenshot, read by the model's vision (no machine-checkable string comes back; the first crop cut the second line) |
| T5 native Save dialog through the context menu / Ctrl+S, file on disk | PASS — 48 s incl. OCR scans (Right-click demo: OS right-click, OCR the menu, type the name, verify via `document.hasFocus()`, file in ~/Downloads) | FAIL by design — `key ctrl+s` goes to the renderer, no dialog, no OS input, no file system |
| T6 extension / browser-internal pages (`chrome-extension://…/options.html`, `chrome://dino`) | PASS via desktop scope (OCR + OS clicks reach any window; the JS tier refuses `uiv.tabs.select` on internal pages on purpose) | FAIL — `navigate` rewrites both to `https://chrome…` and lands on an error page |
| Repeatability (T1 × 3) | 1 call each, 2.0–2.4 s, identical result, the script is the artifact | every run is the full 3-call / 12-action sequence again; nothing reusable is left behind |

Both tools attach the DevTools debugger for trusted input, so both raise
Chrome's "started debugging this browser" bar (seen for "Ui.Vision" and for
"Claude" alike during the runs).

## Ui.Vision MCP — strengths

- **One call per task, ~2 s, deterministic.** A JS macro is a program: the
  agent thinks once, then `run_macro` replays it. T1 cost 1 call and 2 s per
  run against 3 calls / 12 actions / 35 s of turn-by-turn driving.
- **The artifact is the deliverable.** Scripts are saved macros (`create_macro`),
  rows land in the CSV store or Downloads, screenshots in Shots. C4C leaves
  the data in the chat.
- **Three input tiers, one API.** DOM (`uiv.page.*`), trusted CDP
  (`uiv.browser.*`) and real OS input (`uiv.desktop.*`) — the same match
  object feeds any tier. C4C has DOM + CDP only.
- **Pixels are first-class.** `uiv.findImage`, `uiv.ocr.findText/read`,
  `uiv.findColor`, `uiv.ai.find`, with machine-checkable results (T4 came
  back as a string the script asserted on). C4C "reads" pixels only through
  the model looking at a screenshot.
- **Reaches what an extension cannot see:** native dialogs, the browser's own
  UI, other apps, `chrome://` and extension pages (T5, T6).
- **Self-verifying runs.** Log, final variables, run pictures, perf line and
  fail-class per run; the bridge's result text pushes the agent to compare
  the log against the request instead of trusting "no error".
- **Rich diagnostics in failures**: an OCR miss returns the recognised text and
  a menu of alternatives; an image miss returns the best score and where the
  capture is stored.

## Ui.Vision MCP — weaknesses

- **Authoring cost and API surface.** The first run needs a script and the
  authoring guide; a typo is a full round trip. C4C's `read_page` +
  `form_input` by ref needs no code for simple pages.
- **One run at a time, panel must be open.** The panel executes the calls;
  a hung call wedges the extension side (`currentCallId`) until a browser
  restart; `open_panel` opens the app as a TAB on this rig (panel-as-tab),
  which breaks the sidebar-GUI demos and any macro that needs the panel
  visible.
- **Environment sensitivity of the visual tier**: fractional scaling
  (1.25) drops template scores (0.56–0.62 vs 0.60–0.65 bars); a
  color-managed window shifted a CSS color by 36/255 in one channel and
  broke every beacon read until made tolerant (fixed today); local OCR
  cannot read light-on-accent button labels (the GTK "Save" button).
- **Stored demos do not re-seed on update** (fresh profile or the Restore
  button only), and the restore button lives on an extension page.
- **Infobar side effects**: the first trusted click attaches the debugger
  and shrinks the viewport by 56 px — before today's fix a visual match
  taken before the attach clicked one slot too low (DemoBrowserClick), and
  the 3 s idle detach made the bar flicker mid-run (now held per run).

## Claude for Chrome — strengths

- **Zero setup, zero code.** Tabs, refs, `form_input`, `javascript_tool`
  and screenshots work immediately; `browser_batch` packs a whole page
  interaction into one round trip (T2 was one call).
- **Works on background tabs**: `visibilityState` was `hidden` and every
  action still worked, so the user's foreground tab is not disturbed.
- **Accessibility-tree refs** (`ref_N`) are a robust locator for the model;
  `find` takes natural language.
- **The model's vision is a strong OCR** for anything a screenshot shows.

## Claude for Chrome — weaknesses

- **Every run is a fresh conversation.** No macro, no file, no CSV, no
  scheduled replay — repeatability costs the full call sequence each time
  and the result lives in the transcript.
- **Extension-sandbox ceiling**: no OS input, no native dialogs, no file
  system, no `chrome://` or extension pages, no other apps (T5, T6 fail);
  `navigate` even mangles those URLs into `https://chrome://…`.
- **No pixel finders with coordinates the agent can assert on**; a
  screenshot read is an LLM judgment, and a crop can cut the target (T4).
- **Turn latency dominates**: 15–35 s per task here versus 2–4 s.
- **Tab creation inside a batch is blind** (ids arrive only when the batch
  ends), so multi-tab work needs an extra round trip.

## Bugs found during the sweep that fed this benchmark (all fixed in 10.0.207)

1. Trusted CDP click on a visual match hit the icon below the target after
   the debugger bar shrank the viewport (re-find on fresh attach).
2. `uiv.offset()` points re-found onto their anchor (offset now travels with
   the finder recipe).
3. Beacon reads failed on a color-managed window (tolerant fallback).
4. The 3 s idle debugger detach flickered the bar mid-run (held per run).
5. Demo fixes: consent wall as DOM button, text-tool offset fallback,
   `document.hasFocus()` as the OS-independent dialog proof, priming the
   attach before laying out the accuracy ranges.

See OPEN-ISSUES.md section 31 for the details and the sweep numbers.


## Windows run (2026-09-05, same day, second machine)

Windows 11 25H2, Chrome 152.0.7977.82, 2560x1440 at 125% scaling, extension
10.0.213, bridge 1.7.8 (relay mode), Desktop Automation host 2.0.17. Same
agent (Claude Code, Fable 5.1), both tool sets loaded in the same session.
Claude for Chrome wall-clock includes the agent turn latency between calls;
Ui.Vision "runtime" is the player perf line, "wall" adds the authoring turn.

| Task | Ui.Vision | Claude for Chrome |
|---|---|---|
| T1 form fill, 8 fields, values read back | 1 call, runtime 1.91 s (wall incl. authoring turn 20.5 s), PASS | 2 calls / 11 actions, 21.4 s, PASS |
| T2 table to rows (5 rows incl. CJK) | 1 call, 1.04 s, CSV written and read back, PASS | 1 call / 2 actions, 16.0 s, PASS, rows in transcript only |
| T3 canvas-only text | default engine (OCR.space PRO, pro1 endpoint): 4.20 s runtime, OCR 3.5 s; `{engine: 'xmodule'}`: 1.80 s runtime, OCR 1.1 s; regex-asserted, PASS | 1 call / 2 actions, 20.8 s, zoom screenshot read by the model, PASS (no string returned) |
| T4 chrome://version | PASS via desktop tier: Ctrl+L, clipboard paste, Enter, local OCR read `152.0.7977.82` 4.4 s after the keystroke; runtime 8.06 s incl. restoring the tab | FAIL: navigate rewrote to https://chrome://version |
| T5 native Save As, file on disk | attempt 1: dialog opened but the guard `uiv.ocr.findText('File name', {scope: 'desktop'})` with the default cloud engine took 16.4 s and missed, run marked failed (fail-class guard); a second call named + confirmed the file (C:\1tmp\bench_invoice_uiv.html, 943 bytes). Attempt 2 with a `document.hasFocus()` guard: 1 call, runtime 4.17 s, dialog took focus after 316 ms, closed after 2.5 s, file on disk | FAIL by design: `key ctrl+s` went to the renderer, no dialog on screen (checked with a desktop-scope capture), no file |
| T7 exploration: "find the download link" on ui.vision | `get_page {find: 'download'}` = 3 nodes, none the install links; `{find: 'install'}` = the 3 store links; 2 calls, 19.1 s | `find` (semantic) returned 6 links with one-line descriptions, 1 call, 32.0 s |
| Repeat T1 x3 | one call, 1598 / 1545 / 1377 ms per iteration, identical result | full 2-call sequence again, 41.0 s |

Observations from the Windows run
- Both tools raised Chrome's debugger bar ("'Claude' started debugging this browser" visible in the desktop capture).
- Ui.Vision brings its play tab to the front on every run (log: "script tab → #4 brought to front"); Claude for Chrome worked in a background tab.
- The side panel is a real side panel on Windows (the Linux rig had the panel-as-tab problem).
- Desktop-scope OCR returns the whole screen's text, other windows included (our chat transcript was in it). With the cloud default that text leaves the machine; pin `{engine: 'xmodule'}` for desktop reads.
- `get_authoring_guide` returned 139,355 characters and exceeded Claude Code's tool-result limit (spilled to a file, grep needed). Every `run_macro` result appends a ~1.1k-character self-check footer.
- The bridge ran in relay mode (this window forwarded to another window's bridge, 4 relays active) without any visible effect on the numbers.

Scripts (Windows run)

T1
```js
uiv.goto('https://httpbin.org/forms/post');
uiv.page.fill('name=custname', 'Ada Lovelace');
uiv.page.fill('name=custtel', '+49 30 1234567');
uiv.page.fill('name=custemail', 'ada@example.com');
uiv.page.click('css=input[name=size][value=medium]');
uiv.page.click('css=input[name=topping][value=bacon]');
uiv.page.click('css=input[name=topping][value=mushroom]');
uiv.page.fill('name=delivery', '12:30');
uiv.page.fill('name=comments', 'Ring twice, no bell');
const got = uiv.evaluate(`const m = new Map(); for (const [k, v] of new FormData(document.querySelector('form')).entries()) m.set(k, m.has(k) ? m.get(k) + ',' + v : v); return JSON.stringify(Object.fromEntries(m));`);
if (got !== WANT) throw new Error('form mismatch: ' + got);
```

T3 (local engine)
```js
uiv.goto('http://127.0.0.1:8765/invoice.html');
const text = uiv.ocr.read({engine: 'xmodule'});
const inv = text.match(/INVOICE\s+(\d{4}-\d{4})/), due = text.match(/TOTAL DUE:\s*([\d,]+\.\d{2})\s*EUR/);
if (!inv || !due) throw new Error('OCR did not yield both fields');
```

T5 (one-call version)
```js
uiv.goto('http://127.0.0.1:8765/invoice.html');
uiv.window.focus(); uiv.sleep(400);
uiv.desktop.keyboard.press('Control+S');
let open = false;
for (let i = 0; i < 20 && !open; i++) { uiv.sleep(250); open = !uiv.evaluate('return document.hasFocus()'); }
if (!open) throw new Error('no modal dialog took the focus after Ctrl+S');
uiv.sleep(500);
uiv.desktop.keyboard.insertText('bench_invoice_uiv2.html');
uiv.sleep(300);
uiv.desktop.keyboard.press('Enter');
let closed = false;
for (let i = 0; i < 20 && !closed; i++) { uiv.sleep(250); closed = uiv.evaluate('return document.hasFocus()'); }
if (!closed) throw new Error('dialog did not close after Enter');
```

T4
```js
uiv.goto('http://127.0.0.1:8765/invoice.html');
uiv.window.focus(); uiv.sleep(300);
uiv.desktop.keyboard.press('Control+L'); uiv.sleep(200);
uiv.desktop.keyboard.insertText('chrome://version'); uiv.desktop.keyboard.press('Enter'); uiv.sleep(1500);
const text = uiv.ocr.read({scope: 'desktop', engine: 'xmodule'});
const m = text.match(/Google Chrome[^\d]*(\d+\.\d+\.\d+\.\d+)/);
uiv.desktop.keyboard.press('Control+L'); uiv.sleep(200);
uiv.desktop.keyboard.insertText('http://127.0.0.1:8765/invoice.html'); uiv.desktop.keyboard.press('Enter');
if (!m) throw new Error('version not read from chrome://version');
```


## Playwright MCP run (Linux, 2026-09-06)

Third contender on the Linux rig: `@playwright/mcp` 0.0.80 (Microsoft's
Playwright MCP server), launched with `--browser chrome`, so it drives the
SAME Chrome build (152.0.7977.82) as the two runs above — but as its OWN
instance with its own profile, not the user's browser (no logins, no
extensions, an "unsupported command-line flag
--disable-blink-features=AutomationControlled" infobar instead of the
debugger bar). Same agent (Claude Code, Fable 5.1), same tasks, driven over
stdio through a small timing shim. "Tool" = server round trip; "wall" =
shell timestamps around the calls, so it includes the agent turns when
there were any. Ui.Vision on this day: extension 10.0.218, host 2.0.18.

| Task | Playwright MCP (calls · tool s · wall s · result) |
|---|---|
| T1 form fill, 8 fields, values read back | 3 calls (`navigate` → snapshot refs → `fill_form` → `evaluate`) · 1.9 · 32.5 incl. 3 agent turns, one of them lost to a schema slip (`ref` vs `target`) · PASS |
| T2 table → rows (5 rows incl. CJK) | 2 calls (`navigate`, `evaluate`) · 2.3 · 2.3 · PASS, rows in the transcript only; `run_code_unsafe` has no `require`, so no file can be written from the tool |
| T3 three tabs opened, titles read, tabs closed | 8 calls (`tabs new` ×3 with url, `list`, `close` ×3, `list`) · 1.1 · 1.2 · PASS — a new tab's index is known immediately, so the whole task fits one agent turn |
| T4 text that exists only as pixels (canvas invoice) | 2 calls (`navigate`, element `take_screenshot` of `#c`) · 0.2 · 0.2 + one model read · PASS by the model's vision: `INVOICE 2026-0917 / TOTAL DUE: 1,234.56 EUR`; no machine-checkable string comes back |
| T5 native Save dialog via Ctrl+S, file on disk | `press_key Control+s` 13 ms, then `document.hasFocus()` still `true`, no dialog on a desktop capture, no file · FAIL by design — the key goes to the renderer (CDP), Chrome's accelerator never fires |
| T6 browser-internal / extension pages | `chrome://version` PASS (0.1 s, innerText read back `152.0.7977.82`); `chrome://dino` renders (screenshot shows the dino) but `navigate` returns `net::ERR_INTERNET_DISCONNECTED`; `chrome-extension://…/options.html` FAIL `net::ERR_BLOCKED_BY_CLIENT` — Playwright's profile has no extensions |
| T7 exploration: "find the download link" on ui.vision | `navigate` + `find {text:'download'}` · 1.0 · 1.1 · 3 substring matches, the forum "Desktop Automation app" download link among them (plain text match, not semantic) |
| Repeat T1 × 3 by snapshot refs | FAIL ×3 — refs are minted per snapshot and change on every navigation (`e5` became `f21e5`), so a stored ref sequence never replays; each rerun needs a fresh snapshot and a model turn to read it |
| Repeat T1 × 3 by CSS selectors as `target` | 3 calls, 1.09 / 0.97 / 0.97 s wall, identical result, PASS — the selector-based `fill_form` call IS a reusable artifact, but it lives in the agent's context, not in the tool |
| Repeat T1 × 3 as one `browser_run_code_unsafe` program | 1 call, 0.88 / 0.87 / 1.28 s, PASS — Playwright's equivalent of `run_macro {script}` |

67 tool calls in total for the run; every `browser_evaluate` took a flat
~510 ms (a settle wait after the call), the other calls 4–300 ms once the
page was loaded.

Playwright MCP — strengths

- **Fast and deterministic by selector.** With CSS selectors or
  `getByRole` locators the turn-by-turn path is ~1 s per task and
  `run_code_unsafe` is one ~0.9 s call: the same order as Ui.Vision's
  `run_macro`, an order of magnitude under Claude for Chrome's 15–35 s.
- **Full Playwright API in one call.** `run_code_unsafe` takes an
  `async (page) => …` function: goto, fill, check, evaluate, return a value
  — a real program, like a JS macro.
- **Tabs, dialogs (JS ones), network log, console, file upload, PDF,
  requests** are all first-class tools; tab indices come back at once.
- **`chrome://` pages are reachable** in its own instance (T6 partial
  PASS) — the one place it beats an extension-based tool.
- **Snapshot refs** (`e5`, `f21e5`) plus accessible names give the model a
  robust locator without code, and `fill_form` fills a whole form per call.

Playwright MCP — weaknesses

- **It is not the user's browser.** A separate Chrome instance and profile:
  no cookies, logins, extensions or open tabs of the user; the extension
  page in T6 fails outright. (`--cdp-endpoint` / `--extension` modes exist
  but need the user's Chrome started for remote debugging or a bridge
  extension installed — not the default.)
- **Renderer-only input, like Claude for Chrome.** No OS keyboard or mouse,
  no native dialogs, no other windows: T5 fails the same way; a Save
  dialog, a GTK file chooser or a desktop app is out of reach.
- **Pixels are opaque to it.** Screenshots go to the model's eyes; there is
  no OCR, template or color finder returning coordinates or a string the
  script can assert on (T4 passes only by model judgement).
- **Nothing persists in the tool.** No macro store, no CSV, no scheduled
  replay; `run_code_unsafe` cannot even write a file (`require` is not
  defined). Refs die with the snapshot, so ref-based sequences are not
  replayable (repeat row).
- **Snapshots spill to disk** (`page-<ts>.yml` files the agent must read
  back with a second tool), and a schema slip costs a full turn like it
  does with any tool.

Where this leaves the three:

- Claude for Chrome: zero setup inside the user's real browser, slowest
  (turn latency), extension ceiling, nothing reusable.
- Playwright MCP: fastest pure-web driver with a scriptable one-call mode,
  but a sandboxed clone browser with the same renderer-only ceiling and no
  persistence.
- Ui.Vision MCP: one-call macros at Playwright speed that run in the user's
  own browser AND cross the OS boundary (native dialogs, other apps,
  chrome:// and extension pages via the desktop tier, OCR/image/color
  finders with assertable results), stored as macros/CSVs/screenshots —
  at the price of the authoring guide, the open panel and the visual
  tier's environment sensitivity.

Playwright calls (Linux run)

T1 one-call
```js
async (page) => {
  await page.goto('https://httpbin.org/forms/post');
  await page.fill('[name=custname]', 'Ada Lovelace');
  await page.fill('[name=custtel]', '+49 30 1234567');
  await page.fill('[name=custemail]', 'ada@example.com');
  await page.check('input[name=size][value=medium]');
  await page.check('input[name=topping][value=bacon]');
  await page.check('input[name=topping][value=mushroom]');
  await page.fill('[name=delivery]', '12:30');
  await page.fill('[name=comments]', 'Ring twice, no bell');
  return await page.evaluate(() => { const m = new Map(); for (const [k, v] of new FormData(document.querySelector('form')).entries()) m.set(k, m.has(k) ? m.get(k) + ',' + v : v); return JSON.stringify(Object.fromEntries(m)); });
}
```

T1 turn-by-turn (selector targets; with snapshot refs replace each target by the `eN` from the current snapshot)
```json
{"tool":"browser_fill_form","args":{"fields":[
 {"name":"Customer name","type":"textbox","target":"[name=custname]","value":"Ada Lovelace"},
 {"name":"Telephone","type":"textbox","target":"[name=custtel]","value":"+49 30 1234567"},
 {"name":"E-mail","type":"textbox","target":"[name=custemail]","value":"ada@example.com"},
 {"name":"Medium size","type":"radio","target":"input[name=size][value=medium]","value":"true"},
 {"name":"Bacon","type":"checkbox","target":"input[name=topping][value=bacon]","value":"true"},
 {"name":"Mushroom","type":"checkbox","target":"input[name=topping][value=mushroom]","value":"true"},
 {"name":"Delivery time","type":"textbox","target":"[name=delivery]","value":"12:30"},
 {"name":"Instructions","type":"textbox","target":"[name=comments]","value":"Ring twice, no bell"}]}}
```

T2
```js
() => JSON.stringify([...document.querySelector('table').querySelectorAll('tr')].map(tr => [...tr.children].map(td => td.innerText.trim())))
```

T4 (canvas served from a local `invoice.html` that draws both lines with `fillText`)
```json
{"tool":"browser_take_screenshot","args":{"element":"invoice canvas","target":"#c","filename":"t4-canvas.png"}}
```
