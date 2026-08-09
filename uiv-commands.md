# Table commands → `uiv.*` JS API — mapping overview

Living document: updated as the `uiv.*` API grows. For every classic
(command-table) command this page shows the JS way to do it — either a
**native `uiv.*` method** or, where none exists yet, the **legacy bridge**
`uiv.run('command', 'target', 'value')`, which runs any classic command from
inside a script.

Basics of the JS API (details in the AI system prompt and
`src/modules/script_runner.js`):

- Scripts are **modern JavaScript**: `let`/`const`, arrow functions, template
  literals, destructuring, spread/rest, default params, `for...of`, classes,
  optional chaining and `??` all work (compiled to ES5 for the sandbox before
  each run). Two exceptions: **no `async`/`await`** — every `uiv.*` call already
  waits, and using it fails with a message saying so — and **no `Promise`,
  `Map` or `Set`** (the common methods like `Array.includes/find`,
  `Object.assign/values/entries` and `String.includes/startsWith/padStart` are
  provided).
- All `uiv.*` calls look **synchronous** and **throw a real JS exception** on
  failure — `try/catch` works.
- The API deliberately separates the **DOM world** (HTML locators) from the
  **visual world** (pixels — computer vision and OCR).
- Every finder **auto-waits** for the `!TIMEOUT_WAIT` value from Settings and
  throws on timeout; with `{required: false}` a miss returns `[]` / `null`
  instead. The setting is read at call time, so `uiv.setVar('!TIMEOUT_WAIT', …)`
  at runtime does **not** change it — pass `{timeout: seconds}` per call.
  Matches are `{x, y, rect, text, value, tag, visible, frameLocal}` in viewport
  CSS pixels.
- **Optional steps** — a cookie bar, a popup that is only sometimes there — are
  the singular finder plus a null check. And `{required: false}` does **not**
  shorten the wait: the finder still polls until the timeout, the flag only
  decides whether the deadline throws or returns `null`. So an optional step
  needs a short `timeout` as well, or every run without the popup pays the full
  `!TIMEOUT_WAIT`:

  ```js
  const x = uiv.findImage('close.png', {required: false, timeout: 2});
  if (x) uiv.browser.click(x);   // absent → skipped: no exception, no 10s wait
  ```

  Never feed a `{required: false}` result straight into an action —
  `uiv.browser.click(uiv.findImage('close.png', {required: false}))` throws on
  the `null` it just asked for. And do not wrap that in `try/catch` to silence
  it: `{required: false}` is for **absence**, `try/catch` is for **errors**, and
  stacking them reports a typo'd file name as "not present".
- **Before `ocr.findText`, read back what OCR actually saw.** Targeting by text is a
  first-class technique — **buttons included**, and usually better than a
  picture: no file to maintain, and it survives a redesign, a theme change, a
  different DPI and a different screen size. The only question is whether the
  built-in OCR can *read* that particular text, and OCR is the one finder that
  can fail because the text was **misread** rather than absent — no timeout
  distinguishes the two. So probe rather than guess, with the script form of
  **Settings > OCR > Show OCR Overlay**:

  ```js
  const seen = uiv.ocr.read();   // everything recognised, as one string
  uiv.log(seen, 'blue');
  ```

  That one call answers all three questions at once:
  - **In there? Then `ocr.findText` is the right tool** — use it, buttons included,
    and stop worrying about the font.
  - **Not in there at all? Change the reader, not the technique.** This engine
    can't read it here, however long `ocr.findText` waits. Two ways out:

    ```js
    uiv.browser.click(uiv.ai.find('the blue "Accept all" button'));  // the model reads it
    uiv.browser.click(uiv.findImage('accept_all.png'));              // pixels, no reading
    ```

    `uiv.ai.find` returns a match like any other finder and an LLM reads text
    the local engine cannot — white on blue, tiny, stylised — so the step stays
    textual with no image file to maintain. It does **not** auto-wait and every
    call is billable, so wait for the page yourself first and never put it in a
    retry loop. A picture is the choice when the target is a fixed graphic, or
    when the macro must run with no AI configured. A longer timeout or different
    wording fixes neither — the recognised text is the same every pass.

    For targets with **no DOM element** — canvas widgets, cross-origin visuals,
    the desktop — where no tool can capture an element image, create the
    template from a script with `uiv.shot.area` **while authoring**: locate the
    target once (a finder, or `uiv.ai.find`), crop it, verify the saved image
    with a run, and ship a macro that uses plain `uiv.findImage`. Don't ship
    macros that re-run `ai.find` and re-crop at runtime when the image match
    fails: one mis-located point caches the wrong pixels, and the macro then
    clicks the wrong spot forever *without ever failing loudly again* — a macro
    that breaks visibly gets fixed in the AI chat; one that "heals" itself
    wrongly never does.

    **Second best — anchor on a word OCR *did* read**, and step to the target
    from it. The recognised text is your menu of anchors:

    ```js
    uiv.browser.click(uiv.offset(uiv.ocr.findText('Privacy Policy'), 420, -30));
    ```

    This is the JS answer to the classic `…TextRelative` family (`word#R420,-30`)
    — and there is **deliberately no relative command in `uiv.`**: a finder plus
    `uiv.offset` already composes one, with no relative-image file and no `#R`
    string to get wrong. It works because an unreadable button usually sits a
    fixed distance from perfectly readable body text. Offsets are measured from
    the anchor's **centre**, the same origin the classic commands use, so
    numbers copied from a table macro carry over unchanged.

    (A DOM locator is better than both where one exists; another reader —
    `{engine: 'xmodule'}` or `{engine: 'ocrspace_engine2'}` — sometimes rescues
    it.) The built-in **Javascript OCR** loses
    light-on-dark button labels ("Accept all" white on blue) and small glyphs
    most often — which is why cookie banners and consent dialogs are image work,
    not OCR work.
  - **In there but misspelled?** Match the typo with wildcards — `?` and `*`
    work per word: `uiv.ocr.findText('Acc*pt all')`.
  - **In there several times?** `ocr.findText` returns the **first**. Use
    `uiv.ocr.findTexts(...)` and index the one you meant.
- **A click waits for its navigation; typing does not.**
  `uiv.browser.type('${KEY_ENTER}')` submits and returns at once. When the
  keystroke navigates, say so — `{nav: true}` turns on the same settle watch
  clicks get automatically:

  ```js
  uiv.browser.type('${KEY_ENTER}', {nav: true});   // next call sees the NEW page
  ```

  To also **verify** where you landed, wait for something **only the new page
  has** — the wait target must be unique to the state you are waiting for:

  ```js
  const h1 = uiv.$('xpath=//h1[contains(., "Solar cell")]');  // auto-waits
  ```

  `uiv.$('css=h1')` is the trap: an `h1` exists on the old page too, so it
  matches the **stale** one instantly and no waiting happens. Never poll for a
  navigation with `Date.now()` + `uiv.sleep` on the URL — the URL commits before
  the load finishes, so the loop races the thing it is meant to guard.
- **Do not `uiv.sleep` after an action.** Finders auto-wait, `uiv.open` waits for
  the page load, and a click that navigates is waited for automatically — so
  wait for the *thing*, not for a *time*: `uiv.$('css=.results')` after a search
  is both faster and more reliable than `uiv.sleep(3000)`. Legitimate sleeps are
  settling an animation that changes nothing findable, and pacing a poll loop —
  say which in a comment.
- **Matches are snapshots, not live handles.** A finder result is a copy taken
  at find time — a stored match's `.text` / `.value` **never update**, so
  re-reading one in a loop polls frozen data forever (the page fills in, the
  script never sees it). To wait for content, tell the finder instead:

  ```js
  // waits until the async result actually arrives — one call, no loop
  const r = uiv.$('id=txtAreaParsedResult', {hasText: true, timeout: 60});
  uiv.log(r.value);
  ```

  `{hasText: true}` = non-empty text/value, `{hasText: 'substring'}` =
  case-insensitive substring, `{textMatches: 'regex'}` = regex (DOM finders
  only). If a loop is truly unavoidable, re-run the finder inside it — never
  re-read a match found before the loop.
- Variables are shared with the classic engine — **special `!` variables
  included**: `uiv.getVar('!LASTCOMMANDOK')`,
  `uiv.setVar('!TIMEOUT_PAGELOAD', 60)`. Same pool the `${...}` syntax uses,
  same names. See [Special variables](#special-variables). The exceptions are
  table-macros-only: `!URL` — in JS ask the page
  (`uiv.eval('return location.href')`) — `!CURRENT_TAB_NUMBER` — in JS the
  `uiv.tabs.*` calls return the position — and the `csvRead` family
  (`!COL1…`, `!CSVREAD*`, `!csvLine`) — in JS `uiv.csv.read(file)` returns the
  rows as a real array.

## The native `uiv.*` API

**DOM world** (locators: `css=` `id=` `name=` `link=` `xpath=`, bare = css):

| Method | What it does |
|---|---|
| `uiv.$(locator)` | **first** DOM match (no `[0]` needed) — all frames incl. cross-origin + open shadow roots |
| locators | `css=` `id=` `name=` `xpath=` `link=` (exact anchor text); bare string = css. For a PARTIAL link match use `xpath=//a[contains(normalize-space(.), 'text')]` — `contains(text(), …)` reads only the first direct text node and skips whitespace normalisation |
| `uiv.$$(locator)` | **all** DOM matches (array) |
| `uiv.findElements(locator, opts)` | long form with options: `{timeout, required: false, includeHidden: true, hasText, textMatches}` |
| **wait for content** | `{hasText: true}` retries until the match's text/value is **non-empty**, `{hasText: 'substring'}` until it contains the substring (case-insensitive), `{textMatches: 'regex'}` until it matches — `uiv.$('id=result', {hasText: true, timeout: 60})` waits out an async result in one call, no poll loop |
| `uiv.page.click('css=#buy')` | every input action accepts DOM locator strings directly |

**Visual world** (pixels — anything the eye sees, any frame/canvas):

| Method | What it does |
|---|---|
| `uiv.findImage('button.png')` | **first** computer-vision match (adds `score`); `uiv.findImages` for all |
| `uiv.ocr.findText('Checkout')` | **first** match of rendered text — WHERE it is (`?`/`*` wildcards per word); `uiv.ocr.findTexts` for all |
| `uiv.ocr.read()` | OCR proper: pixels IN, **text OUT** (one string). `{area: match \| rect}` reads **one region** — "the number next to 'Total'" is `uiv.ocr.read({area: {x: t.rect.left + t.rect.width, y: t.rect.top, width: 120, height: t.rect.height}})` with `t = uiv.ocr.findText('Total')` (the composed form of `OCRExtractRelative`). `{scope: 'desktop'}` reads the screen; `{image: 'shot.png'}` a saved screenshot. For text in the DOM use `.text` — exact and free. **Run it before `ocr.findText`** to see what OCR recognised — absent, misread or duplicated are three different problems and only this tells them apart (the script form of *Show OCR Overlay*) |
| `uiv.shot.area(match \| rect, name)` | crop a region into **vision storage**, so `uiv.findImage(name)` finds it from then on — the odd one out among `shot.*` on purpose. An **authoring** tool: creates a match template for targets with no DOM element (canvas, desktop), where an element image can't be captured any other way — locate once, crop, verify with a run, ship plain `findImage`. Not a runtime repair mechanism (see the OCR section for why). A finder match carries its rect; a bare point (`uiv.ai.find`) needs `{width, height}` and the crop centres on it |
| `uiv.findImages(image, opts)` | all matches: `{minScore: 0.1–1, timeout, required, relative, scope}` |
| **relative images** | a green anchor + pink target image needs `{relative: true}` — it is auto-detected ONLY when the file name ends in `_relative.png`. Without it the whole picture (boxes included) is matched as a plain pattern and simply never found |
| `uiv.ocr.findTexts(text, opts)` | all matches: `{engine, language, timeout, required, scope}` — `{scope: 'desktop'}` searches the **screen** and returns screen-pixel matches for `uiv.desktop.*` (the composed `XClickText`) |
| **OCR engine** | scripts NAME the reader, they never number it: `'javascript'` (built in), `'xmodule'` (XModule Local OCR, Windows/macOS, best on native UI), `'ocrspace_engine1'` / `'ocrspace_engine2'` / `'ocrspace_engine3'` (cloud, API key required). Engine NUMBERS are classic-macro syntax and are rejected with the name to use. Omit `engine` to use the one configured in Settings > OCR — except `{scope: 'desktop'}`, which upgrades an unpinned Javascript OCR to `'xmodule'` when it is installed |
| `uiv.offset(match, dx, dy)` | a match shifted by dx/dy — the JS form of `word#R8,-14`. Measured from the match's point (its **centre**), so offsets from a table macro carry over unchanged. Returns a **match**, so `scope`/`frameId` travel with it |
| `uiv.browser.click(uiv.findImage('buy.png'))` | a visual click is always explicit — never a bare string |
| **optional click** | `const m = uiv.findImage('close.png', {required: false, timeout: 2}); if (m) uiv.browser.click(m);` — the finder returns `null` when it is absent, so the result is **checked**, never passed straight to the click |

**Actions — pick the input tier**

How the input reaches the page is what decides whether it works, so every
action names its tier. There is no bare `uiv.click` / `uiv.type` / `uiv.move`.

| Tier | Reaches the page via | Use it for |
|---|---|---|
| `uiv.page.*` | content script, synthetic DOM events | **fastest**; form filling, background tabs |
| `uiv.browser.*` | debugger API (CDP) — the `B` commands | sites that ignore synthetic events; canvas, drag & drop. Not on Firefox |
| `uiv.desktop.*` | XModule native host — the `X` commands | OS dialogs and anything outside the page (screen pixels) |

Three or more calls of one tier in a row read better aliased —
`const p = uiv.page, b = uiv.browser, x = uiv.desktop;` then `p.type(...)`,
`b.click(...)`, `x.type(...)`. (`x` also echoes the classic `XClick` family.)

| Method | What it does |
|---|---|
| `uiv.page.type(locator \| match, text)` | **fills a field in one call** — finds it, focuses it, sets the value (the classic `type`). The fast path for forms. A match is filled where it was found, so fields in cross-origin frames work too |
| `uiv.page.click('css=locator' \| match)` | synthetic DOM click; some sites ignore it — then escalate to `uiv.browser.click` with the same locator |
| `uiv.page.select(locator, 'Option')` | pick a `<select>` option by visible label (also `'value=…'` / `'index=N'`); fires input+change, works on hidden/styled selects, waits for a triggered reload; errors list the available options |
| `uiv.browser.click('css=locator' \| match \| x, y)` | trusted click (CDP); waits automatically when it triggers a page load |
| `uiv.browser.move('css=locator' \| match \| x, y)` | trusted mouse-over |
| `uiv.browser.type(text)` | trusted keystrokes into the **focused** element (throws if no input is focused — or just use `uiv.page.type`); `${KEY_ENTER}` etc. work. A navigating keystroke wants `{nav: true}`: `uiv.browser.type('${KEY_ENTER}', {nav: true})` waits for the page the ENTER triggers, the same settle watch clicks get automatically |
| `uiv.desktop.click(match \| x, y)` / `.move(...)` | real OS mouse input in **screen** pixels; rejects viewport matches — pass `uiv.findImage(file, {scope: 'desktop'})` |
| `uiv.desktop.type(text)` | real OS keystrokes (XType) — works outside the browser too |

**Page & misc**:

| Method | What it does |
|---|---|
| `uiv.open(url)` | navigate + wait for the page load |
| `uiv.eval('return …')` | run JS **inside the website** (MAIN world; must `return`) |
| `uiv.log(text, color)` | log line; color like echo (`green`, `red`, …, `'#shownotification'`) |
| `uiv.banner(html[, opts])` | **on-page overlay** for the person watching the browser — progress ("Page 1 done, moving on") or a hand-off ("your turn: fill the captcha"). HTML allowed; each call replaces the last banner; survives navigation; click-through (never blocks page or macro); auto-hidden during visual-finder screenshots. `uiv.banner('')` hides it; a run's last banner lingers a few seconds after success, errors/stops clear it. Options: `{seconds: 5}` auto-hide, `{position: 'bottom'}`, `{tone: 'green'}` for a green success look, `{icon: false}` to drop the small "Ui.Vision" origin label |
| `uiv.sleep(ms \| '2s' \| '1m')` | wait a fixed time — **last resort**: finders, `uiv.open` and navigating clicks already wait by themselves. Sleeps ≥1.5s show a countdown in the status bar, like the finder auto-waits |
| `uiv.exit(reason?)` | end the run **early, as a success** — the graceful ending for guard clauses ("wrong browser", "nothing to do today"): reports green, logs the reason, keeps the last `uiv.banner` up. The **failed** ending stays `throw new Error(...)` — red run, banner cleared. Never use it to paper over a failed check |
| `uiv.getVar(name[, default])` / `uiv.setVar(name, value)` | shared variable pool, special `!` variables included — see [Special variables](#special-variables) |
| `uiv.clipboard.read()` / `uiv.clipboard.write(text)` | the **OS clipboard**, read fresh / replaced — the precise way to get a value out of a native app or selection: `uiv.desktop.type('${KEY_CTRL+KEY_C}'); const v = uiv.clipboard.read()` beats OCR every time. (`uiv.getVar/setVar('!CLIPBOARD')` are aliases) |
| `uiv.csv.read(file)` | rows as a real 2D array — `[['a','b'], …]` |
| `uiv.csv.append(file, row)` | add one row (or an array of rows); creates the file if new |
| `uiv.csv.write(file, rows)` | overwrite with a 2D array |
| `uiv.csv.exists(file)` / `uiv.csv.list()` | test one file / list them all |
| `uiv.shot.viewport(name)` / `uiv.shot.page(name)` | screenshot of the visible page / the whole page — **returns the file name** |
| `uiv.shot.element(locator, name)` | screenshot of one element (classic `storeImage`) |
| `uiv.shot.desktop(name)` | screenshot of the whole screen (XModule) |
| `uiv.files.list()` / `uiv.files.exists(name)` | **every** stored file (screenshots *and* CSV/TXT) / test one, without throwing. `uiv.csv.list()` is the CSV/TXT tab alone |
| `uiv.files.remove(name)` | **delete** a file from UI.Vision storage. Takes any stored name, so the export-then-clean-up pair is two plain lines: `uiv.exportToDownloads(f); uiv.files.remove(f);` (the export copies the bytes out before the download starts, so removing next is safe) |
| `uiv.exportToDownloads(name)` | copy a file out of UI.Vision storage into the browser's **Downloads** folder — `.png`, `.csv`, `.txt` or `log`. Also spelled `uiv.files.exportToDownloads` — same function, the spelling that reads right beside `list`/`exists`/`remove`. `log` works on this verb only: the run log is rendered on the spot, so there is nothing to list or delete |
| `uiv.download(what[, opts])` | download a file from the **web** into the browser's Downloads folder and **return the name it got on disk**. Three forms: a locator (`uiv.download('css=a.installer')` — "save link as": the element's `href`/`src`, no click; also the way to download images), a plain URL, or a **function** for downloads only a click can start (JS blobs, POST exports): `uiv.download(function () { uiv.page.click('id=export'); }, {as: 'report.csv'})` — the trigger runs between arming and waiting, so its download is captured, renamed and awaited. Options: `{as: 'name.ext'}` rename, `{timeout: 60}` seconds for completion (default `!TIMEOUT_DOWNLOAD`), `{wait: false}` fire-and-forget. Replaces the classic `onDownload`/`saveItem` pair and reading `!LAST_DOWNLOADED_FILE_NAME` by hand |
| `uiv.ai.ask(prompt, {images})` | one round trip — text (+images) in, text out. Answers a question; **touches nothing**. `{json: true}` returns a **parsed object/array** instead of prose: the model is told to answer JSON-only and the reply is parsed with one corrective retry — use it whenever the answer feeds code, not a log line |
| `uiv.ai.find(question[, opts])` | screenshot + question → a **match** — the fourth finder, alongside `$` / `findImage` / `ocr.findText`. Does **not** auto-wait: each attempt is a model call. `{scope: 'desktop'}` sends the model a **whole-screen** shot and returns screen coordinates — the way to ai.find native UI (OS dialogs, menus); per call, no `XDesktopAutomation` toggle needed |

> **How accurate is `uiv.ai.find`?** Measured against targets at known positions:
> coordinates land within roughly **1–2% of the image size** — fine for a button,
> marginal for anything under ~30px tall.
>
> The failure worth knowing about is **repeating layouts**. Given four boxes that
> were *not* evenly spaced, the model returned four *evenly spaced* answers — it
> extrapolated instead of measuring. Toolbar icon rows, list rows, grids and table
> cells are all this shape. For the Nth item of a repeating set use a real finder
> (`uiv.$$('css=…')[n]`, or an image/text unique to that item) and keep
> `uiv.ai.find` for targets that look distinctive.
| `uiv.ai.computerUse(task)` | the computer-use **agent loop** (screenshot → action → repeat). **Clicks and types** to carry out a task — not a way to get an answer |

> **Provider support.** All three run on whatever AI is configured in
> Settings > AI — the free UI.Vision tier, Anthropic, OpenRouter or a local
> model. `uiv.ai.ask` and `uiv.ai.find` use Anthropic's own request path when
> that provider is selected, and an OpenAI-compatible one otherwise.
| `uiv.run(cmd, target, value)` | legacy bridge: any classic command |

Old names `elementSearch` / `imageSearch` / `textSearch` remain as silent
aliases of the `find*` long forms (existing macros keep running) — don't use
them in new scripts.

---

## Navigation, pages & windows

| Table command | JS |
|---|---|
| `open` | `uiv.open('https://…')` — creates a tab automatically when only browser-internal pages (chrome://) are open |
| `openBrowser` | `uiv.run('openBrowser', url)` |
| `refresh` | `uiv.run('refresh')` |
| `selectWindow` (tab=N / tab=open / tab=close / title=…) | **native:** `uiv.tabs.select(n)` / `uiv.tabs.open(url)` / `uiv.tabs.close()` — indexes are **absolute** (1..N left to right, what the tab bar shows), *not* start-tab-relative like the classic command, and every call returns `{index, title, url, active, current}` so the script can **verify** where it landed; `uiv.tabs.list()` shows all tabs, with `current: true` on the tab the script acts on — the position read that replaces `!CURRENT_TAB_NUMBER`. A click that opens a new tab still does **not** switch to it — select it explicitly. (`uiv.run('selectWindow', …)` remains for `title=…` matching) |
| `setWindowSize` | `uiv.run('setWindowSize', '1366x768')` |
| `bringBrowserToForeground` | **`uiv.window.focus()`** — a PRECONDITION for `uiv.desktop.*`, not a nicety: OS input goes to whatever window is frontmost, so a background browser sends the clicks into another application. Browser-scope X commands front the window themselves; desktop scope deliberately does not (a desktop macro may be aiming at another app), so call it first, before `uiv.open`. Needs no tab — it works on a browser showing no web page yet |
| `bringIDEandBrowserToBackground` | **`uiv.window.minimize()`** — the opposite: minimizes the browser AND the IDE, to automate an application sitting behind them |
| `selectFrame` | **not needed** — the DOM finders pierce same-origin *and* cross-origin frames by themselves. (Do not use via `uiv.run`: its state does not persist between bridge calls.) |

## Clicking, typing & form input

| Table command | JS |
|---|---|
| `click` | `uiv.page.click('css=#buy')` — same tier as the table command. Ignored by some sites? `uiv.browser.click('css=#buy')` |
| `mouseOver` | `uiv.browser.move('css=#buy')` |
| `type` | `uiv.page.type('css=#field', 'text')` — one call, identical semantics to the table command (set-value, multiline, hidden inputs). Real keystrokes instead: `uiv.browser.click('css=#field'); uiv.browser.type('text')` |
| `sendKeys` | `uiv.browser.type('text ${KEY_ENTER}')` (focused element) or `uiv.run('sendKeys', locator, text)` |
| `select` | `uiv.page.select(locator, 'Option')` — native; custom dropdown widgets: click open + click the option |
| `addSelection` / `removeSelection` | `uiv.run('addSelection', locator, 'label=…')` etc. |
| `check` / `uncheck` | `uiv.run('check', locator)` / `uiv.run('uncheck', locator)` |
| `editContent` | `uiv.run('editContent', locator, html)` — or `uiv.browser.click` + `uiv.browser.type` for contenteditable fields |
| `BClick` / `BMove` / `BType` | native: `uiv.browser.click` / `.move` / `.type` **are** the B (CDP) commands |
| `BClickText` / `BMoveText` | `uiv.browser.click(uiv.ocr.findText('Checkout'))` / `uiv.browser.move(uiv.ocr.findText(…))` |
| `BClickRelative` / `BMoveRelative` | `uiv.browser.click(uiv.findImage('green_pink.png'))` (relative images work in the vision finder) |
| `BClickTextRelative` / `BMoveTextRelative` | `uiv.browser.click(uiv.offset(uiv.ocr.findText('word'), 10, 20))` — **no relative command exists in `uiv.` on purpose**: a finder plus `uiv.offset` already composes one out of parts that each do one job, so there is nothing new to learn and nothing new to document. The legacy `uiv.run('BClickTextRelative', 'word#R10,20')` still works if you are porting a macro line by line |
| `XClick` / `XMove` / `XType` | native: `uiv.desktop.click` / `.move` / `.type` — screen pixels, XModule required |

## Finding & waiting

| Table command | JS |
|---|---|
| `pause` | `uiv.sleep('2s')` — but most ports need no wait at all: the next finder auto-waits, so a `pause` that only guarded a slow page simply disappears |
| `waitForElementVisible` | `uiv.$(locator)` — auto-waits and throws on timeout (that *is* the wait) |
| `waitForElementPresent` | `uiv.findElements(locator, {includeHidden: true})` |
| `waitForElementNotVisible` / `waitForElementNotPresent` | poll: `while (uiv.findElements(locator, {required:false, timeout:1}).length) { uiv.sleep('1s'); }` — or `uiv.run('waitForElementNotVisible', locator)` |

## Reading & storing values

Most classic `store*` commands have **no `uiv.*` equivalent on purpose** — a
line of JavaScript already does the job:

```js
uiv.$('css=h1').text                                    // storeText
uiv.$('id=email').value                                 // storeValue
uiv.eval("return document.querySelector('#x').getAttribute('size')")  // storeAttribute
uiv.eval('return document.title')                       // storeTitle
uiv.$$('xpath=//tr').length                             // storeXpathCount
```

Use `uiv.run` only for what the page itself cannot do: writing a file
(screenshots, `storeImage`, `OCRExtract*`, `localStorageExport`), driving the
browser (`selectWindow`), or OS-level work. Downloads left this list:
`uiv.download` covers them (see the Page & misc table).

| Table command | JS |
|---|---|
| `store` | `var x = 'value';` — or `uiv.setVar('name', 'value')` when classic commands need it (e.g. `uiv.setVar('!TIMEOUT_PAGELOAD', 60)`, which then holds for the rest of the run) |
| `storeText` | `var t = uiv.$('css=#x').text;` |
| `storeValue` | `var v = uiv.$('css=#x').value;` |
| `storeTitle` | `var title = uiv.eval('return document.title');` |
| `storeAttribute` | `var href = uiv.eval('return document.querySelector("#x").href');` — or `uiv.run('storeAttribute', 'locator@href', 'var')` + `uiv.getVar('var')` |
| `storeXpathCount` | `var n = uiv.findElements('xpath=…', {required:false}).length;` |
| `storeChecked` | `var c = uiv.eval('return document.querySelector("#x").checked');` |
| `storeImage` | `uiv.run('storeImage', 'image.png', 'var')` |
| `sourceSearch` | `uiv.run('sourceSearch', pattern, 'var')` |
| `sourceExtract` | `uiv.run('sourceExtract', pattern, 'var')` |
| `localStorageExport` | `uiv.run('localStorageExport', target)` |

## Special variables

UI.Vision's `!` variables are read and written from JS **by name** — the same
names a table macro uses in `${...}`. There is no separate JS namespace:

```js
uiv.setVar('!TIMEOUT_PAGELOAD', 60);           // holds for the rest of the run
uiv.open('https://ui.vision/demo/tabs');       // '!' variables exist from here on
var ok = uiv.getVar('!LASTCOMMANDOK');         // result of the last command
var url = uiv.eval('return location.href');    // NOT !URL — see rule 4
```

Six rules make this predictable:

1. **Environment facts are always readable; results come after their command.**
   `!BROWSER`, `!OS`, the `!TIMEOUT_*` values, `!OCRLANGUAGE`/`!OCRENGINE` and
   `!CVSCOPE` are pre-seeded before the first script line — a browser guard
   clause at the top of a macro just works. RESULT variables
   (`!XRUN_EXITCODE`, `!STATUSOK`, `!LAST_DOWNLOADED_FILE_NAME`, …) are filled
   in by commands: read them right after the `uiv.*` call that produces them,
   before that `getVar` throws.
2. **`getVar` fails loudly.** An unknown name (`'!TIMEOOUT_WAIT'`) and a
   variable that is not set yet both throw, instead of silently returning
   `undefined` and turning into `NaN` three lines later. When "unset" is a
   legitimate state, pass a default and opt out:
   `uiv.getVar('!LAST_DOWNLOADED_FILE_NAME', null)`.
3. **Match data comes from the finder, not from variables.** `!IMAGEX/Y`,
   `!IMAGEWIDTH/HEIGHT`, `!OCRX/Y/WIDTH/HEIGHT` and `!AI1`–`!AI4` throw in
   JS — they are how one table command hands its match to the next, and a JS
   finder **returns** its match: `m.x` / `m.y` is the click point, `m.rect`
   the box, `uiv.ai.find(question)` returns the match `!AI1`–`!AI4` carried.
   A fixed offset from a match is `uiv.offset(m, dx, dy)` — the JS form of
   the `*Relative` targets, in every scope. `!STATUSOK` stays readable but is
   reset by the next `uiv.*` call that runs a command — read it immediately
   and keep the value in a JS variable.
4. **`!URL` throws — read the page instead.** Only commands that go through the
   classic player refresh it, so in a script it holds the *previous* page after
   `uiv.page.click(match)`, `uiv.desktop.*` or an OCR call, and it is one command
   behind even on the paths that do refresh it. `uiv.getVar('!URL')` and `${!URL}`
   passed to `uiv.run` both fail with that explanation. The current URL is
   `uiv.eval('return location.href')`; on a page that cannot run scripts
   (`chrome://`, the PDF viewer, an error page) `uiv.tabs.list()` carries a `url`
   per tab. `!URL` keeps working unchanged in table macros.
5. **Tab position comes from `uiv.tabs.*`, not a variable.** `!CURRENT_TAB_NUMBER`
   throws in JS for the same reason as `!URL`: only classic-player commands
   refresh it, so next to `uiv.tabs.select/open/close` it silently holds the old
   position. Every `uiv.tabs.*` call returns `{index, title, url, active,
   current}`, and `uiv.tabs.list()` marks the tab the script acts on with
   `current: true` — indexes 1-based, left to right, what the tab bar shows
   (the classic variable was 0-based). `${!CURRENT_TAB_NUMBER}` passed to
   `uiv.run` fails the same way. Table macros keep both, unchanged.
6. **CSV data comes from `uiv.csv.read`, not variables.** The whole `csvRead`
   bookkeeping family — `!COL1…`, `!CSVREADSTATUS`, `!CSVREADMAXROW`,
   `!CSVREADLINENUMBER`, `!csvLine` — throws in JS, read **and** write: it is
   how table commands pass rows to each other, and a script has arrays for
   that. `var rows = uiv.csv.read('data.csv')` — `rows[0][0]` is what `!COL1`
   held on row 1, `rows.length` replaces `!CSVREADMAXROW`, the loop index
   replaces `!CSVREADLINENUMBER`, and a missing file throws instead of setting
   `!CSVREADSTATUS`. The same applies to the classic loop counters `!TIMES` /
   `!FOREACH` (a JS loop has its own counter) and to `!VISUALSEARCHAREA` /
   `!STOREDIMAGERECT` (pass `{area: …}` to the finder call itself). All of
   them keep working unchanged in table macros.

| Variable | | |
|---|---|---|
| `!URL` | table macros only | URL of the current page — throws in JS, use `uiv.eval('return location.href')` |
| `!CURRENT_TAB_NUMBER` | table macros only | 0-based index of the play tab — throws in JS, use `uiv.tabs.list()` (the `current: true` entry, 1-based) |
| `!LASTCOMMANDOK`, `!STATUSOK` | read-only / writable | result of the last command |
| `!COL1`, `!COL2`, … | table macros only | current CSV row after `csvRead` — throws in JS, use `uiv.csv.read(file)` |
| `!CSVREADSTATUS`, `!CSVREADMAXROW`, `!CSVREADLINENUMBER` | table macros only | CSV read state — throws in JS, `uiv.csv.read` returns all rows at once |
| `!IMAGEX`, `!IMAGEY`, `!IMAGEWIDTH`, `!IMAGEHEIGHT` | table macros only | last visual match — throws in JS, the finder returns the match (`m.x`, `m.rect`) |
| `!OCRX`, `!OCRY`, `!OCRWIDTH`, `!OCRHEIGHT` | table macros only | last OCR match — throws in JS, `uiv.ocr.findText` returns the match |
| `!AI1`–`!AI4` | table macros only | AI command results — throws in JS, `uiv.ai.find(question)` returns the match |
| `!TIMEOUT_PAGELOAD`, `!TIMEOUT_WAIT`, `!TIMEOUT_MACRO`, `!TIMEOUT_DOWNLOAD` | writable | timeouts, in seconds |
| `!REPLAYSPEED` | writable | `FAST` / `MEDIUM` / `SLOW` |
| `!ERRORIGNORE` | writable | keep going after an error |
| `!CLIPBOARD` | read/write | the **OS clipboard** — alias of `uiv.clipboard.read()` / `uiv.clipboard.write(text)` (prefer those in scripts): e.g. `uiv.desktop.type('${KEY_CTRL+KEY_C}')` then `uiv.clipboard.read()` extracts a value from a native app without OCR |
| `!LAST_DOWNLOADED_FILE_NAME` | read-only | most recent download |
| `!BROWSER`, `!OS` | read-only | environment |

**`!CURRENT_TAB_NUMBER_RELATIVE` is deprecated** (along with its
`_INDEX` / `_ID` bookkeeping companions) and **cannot work in a JS script**:
each classic-bridge `uiv.*` call is its own mini player run and re-baselines
it. Reading it throws, rather than returning a number that looks right and
isn't. Table macros that already use it keep working. In JS, capture the start
index once and subtract — same numbers, and it is what the DemoTabs demo does:

```js
uiv.open('https://ui.vision/demo/tabs');
var tabIndex = function () { return uiv.tabs.list().find(function (t) { return t.current; }).index; };
var startTab = tabIndex();
function tabRel () { return tabIndex() - startTab; }
```

Finder auto-wait reads the `!TIMEOUT_WAIT` **setting** at call time, so writing
the variable at runtime does not change it — use `{timeout: seconds}` per call.

## Assertions & checks

In JS an assertion is just an `if` + `throw` — the run fails with your
message and the exact line:

```js
var title = uiv.eval('return document.title');
if (title.indexOf('Solar cell') === -1) {
  throw new Error('unexpected title: ' + title);
}
```

| Table command | JS |
|---|---|
| `assert` | `if (uiv.getVar('x') !== 'expected') throw new Error(…)` |
| `assertText` | `uiv.$(locator).text` → compare → `throw` |
| `assertTitle` | read the title, compare, `throw` |
| `assertValue` | `uiv.$(locator).value` → compare → `throw` |
| `assertChecked` / `assertNotChecked` | read `.checked` via `uiv.eval`, compare, `throw` |
| `assertElementPresent` | `uiv.findElements(locator, {includeHidden:true})` — throws by itself when missing |
| `assertElementNotPresent` | `if (uiv.findElements(locator, {required:false}).length) throw new Error(…)` |

## Control flow

All plain JavaScript — these table commands have **no `uiv.` form at all**:

| Table command | JS |
|---|---|
| `if` / `else` / `elseif` / `end` | `if (…) { … } else if (…) { … } else { … }` |
| `while` / `end` | `while (…) { … }` |
| `times` / `end` | `for (var i = 0; i < n; i++) { … }` |
| `forEach` | `for (var i = 0; i < arr.length; i++) { … }` |
| `do` / `repeatIf` | `do { … } while (…)` |
| `break` / `continue` | `break;` / `continue;` |
| `label` / `gotoLabel` / `gotoIf` | not needed — use functions, loops, `if` |
| `comment` | `// a comment` |
| `throwError` | `throw new Error('message')` |
| `onError` | `try { … } catch (e) { … }` |

## Visual search & OCR

| Table command | JS |
|---|---|
| `visualSearch` | `uiv.findImage('button.png')` / `uiv.findImages('button.png', {minScore: 0.8})` |
| `visualAssert` | `uiv.findImage('button.png')` — throws when not found |
| `visualGetPixelColor` | `uiv.run('visualGetPixelColor', 'x,y', 'var')` |
| `visionLimitSearchArea` (and its `*Relative` variants) | **blocked in scripts** — a setting on line 12 must not silently change what "find" means on line 40. Pass the region per call instead: `uiv.findImage('handle.png', {area: match \| {x, y, width, height}})`, same `{area}` on `uiv.ocr.findText(s)` and `uiv.ocr.read` |
| `OCRSearch` | `uiv.ocr.findTexts('Checkout', {required:false}).length` |
| `OCRExtractRelative` | compose it: find the anchor, read the region next to it — `var t = uiv.findImage('img.png'); var v = uiv.ocr.read({area: {x: t.rect.left + t.rect.width, y: t.rect.top, width: 120, height: t.rect.height}});` (legacy `uiv.run('OCRExtractRelative', 'img.png', 'var')` still works) |
| `OCRExtractbyTextRelative` | `uiv.run('OCRExtractbyTextRelative', 'word#R…', 'var')` |
| `OCRExtractScreenshot` | `uiv.run('OCRExtractScreenshot', 'image.png', 'var')` |

## Screenshots

| Table command | JS |
|---|---|
| `captureScreenshot` | `uiv.run('captureScreenshot', 'name')` |
| `captureEntirePageScreenshot` | `uiv.run('captureEntirePageScreenshot', 'name')` |
| `captureDesktopScreenshot` | `uiv.run('captureDesktopScreenshot', 'name')` |

## CSV & data

CSV files are **real 2D JS arrays** — no variable pool, no magic names:

```js
const rows = uiv.csv.read('data.csv');        // [['a','b'], ['1','2']]
rows.forEach(r => uiv.log(r[1]));

uiv.csv.append('log.csv', [Date.now(), stars]);   // one row; creates the file
uiv.csv.write('data.csv', rows);                  // overwrite
if (uiv.csv.exists('data.csv')) { … }             // test without throwing
uiv.csv.list();                                   // -> ['data.csv', 'log.csv']
```

Same files the CSV tab and the classic `csvRead`/`csvSave` commands use; the
`.csv` suffix is added when missing.

| Table command | JS |
|---|---|
| `csvReadArray` | `uiv.csv.read(file)` — returns the array directly |
| `csvSaveArray` | `uiv.csv.write(file, rows)` |
| `csvSave` + `!csvLine` | `uiv.csv.append(file, row)` — **do not** use `!csvLine` in a script: it is a hidden accumulator that takes one cell per `store` and cannot be read back |
| `csvRead` (row-by-row into `!COL1`…) | `uiv.csv.read(file)` then index the array; `!CsvReadLineNumber` bookkeeping disappears |

## Scripting, dialogs, downloads & misc

| Table command | JS |
|---|---|
| `executeScript` | `uiv.eval('return …')` (page world) |
| `executeScript_Sandbox` | **not needed** — the whole script *is* the sandbox engine; just write JS |
| `run` (call another macro) | **rejected in scripts** — the classic `run` hands the called macro to the classic player's loop, which a script does not use, so it would silently never execute. Reuse code with an include: `// @include <folder path>/shared.js` splices the file in before the script compiles (`uiv.main` is `true` only in the file that was started) |
| `echo` | `uiv.log('text', 'green')` |
| `prompt` | `uiv.run('prompt', 'question@default', 'var')` + `uiv.getVar('var')` |
| `assertAlert` / `assertConfirmation` / `assertPrompt` | `uiv.run('assertAlert', expected)` etc. |
| `answerOnNextPrompt` | `uiv.run('answerOnNextPrompt', answer)` |
| `onDownload` | `uiv.download(trigger[, {as}])` — the arm-then-click dance collapses into one call: `uiv.download(function () { uiv.page.click('id=export'); }, {as: 'report.csv'})`. `uiv.run('onDownload', …)` still works line-for-line when porting |
| `saveItem` | `uiv.download(locator[, {as}])` — grabs the element's `href`/`src` without clicking, returns the on-disk name. `uiv.run('saveItem', …)` still works line-for-line when porting |
| `deleteCookies` | `uiv.run('deleteCookies')` (current site only) |
| `setProxy` | `uiv.run('setProxy', 'host:port', 'user:pass')` |

## Desktop automation & XModule (OS-level)

All desktop-scope work goes through the bridge — the native `uiv.*` input
methods are browser-scope (CDP) by design:

| Table command | JS |
|---|---|
| `XDesktopAutomation` | classic macros only — in a script, scope is **per call**: `{scope: 'desktop'}` on the finders and on `uiv.ai.find`, `uiv.desktop.*` for input. The toggle is sticky global state (the same trap as `visionLimitSearchArea`); `uiv.run('XDesktopAutomation', ...)` still works for converted macros but new scripts should not need it |
| `XClick` / `XClickText` / `XClickRelative` / `XClickTextRelative` | `XClickText` composes natively: `uiv.desktop.click(uiv.ocr.findText('OK', {scope: 'desktop'}))` — screen-pixel OCR matches feed the desktop tier. The rest: `uiv.run('XClick', target)` etc. |
| `XMove` / `XMoveText` / `XMoveRelative` / `XMoveTextRelative` | `uiv.run('XMove', target)` etc. |
| `XType` | `uiv.run('XType', 'text${KEY_ENTER}')` |
| `XMouseWheel` | `uiv.run('XMouseWheel', delta)` |
| `XRun` / `XRunAndWait` | `uiv.run('XRun', 'app.exe', 'args')` — launching does **not** focus the new window, and AppActivate-style helper scripts are refused by the Windows foreground lock. Focus with a real OS click on the window's title bar before typing: `uiv.desktop.click(uiv.ocr.findText('Window*Title', {scope: 'desktop'}))`. UWP/Store apps launch better via shell activation: `uiv.run('XRun', 'explorer.exe', 'shell:appsFolder\<AUMID>')`. Note: desktop capture/OCR/clicks cover the **primary display only** |

## AI commands

| Table command | JS |
|---|---|
| `aiPrompt` | `uiv.run('aiPrompt', prompt, 'var')` |
| `aiScreenXY` | `uiv.run('aiScreenXY', description, 'var')` |
| `aiComputerUse` | `uiv.run('aiComputerUse', task, 'var')` |

---

Deprecated table commands (`clickAt`, `clickAndWait`, the `verify*` family,
`dragAndDropToObject`, …) are omitted — they are hidden from new-macro
authoring; their documented replacements apply here too.
