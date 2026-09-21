import { Button, Modal, message } from 'antd'
import { prompt } from '@/components/prompt'
import { DownOutlined, UpOutlined } from '@ant-design/icons'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { UnControlled as CodeMirror } from 'react-codemirror2'
import 'codemirror/lib/codemirror'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/hint/show-hint'
// in-editor search: Ctrl-F find, Ctrl-G next, Shift-Ctrl-G prev,
// Shift-Ctrl-F replace, Alt-G jump to line — stock CM5 addons, the dialog
// renders inside the editor so the browser's own find never opens
import '@/common/cm_search'
import 'codemirror/addon/search/searchcursor'
import 'codemirror/addon/search/jump-to-line'
import 'codemirror/addon/dialog/dialog'
// select a token -> its other uses light up; current line gets a tint
// (the dark theme styled the active line years before the addon was wired);
// Ctrl-/ comments the selection in and out — the debugging workhorse
import 'codemirror/addon/search/match-highlighter'
import 'codemirror/addon/selection/active-line'
import 'codemirror/addon/comment/comment'
import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/hint/show-hint.css'
import 'codemirror/addon/dialog/dialog.css'
import '@/styles/cm-extras.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage } from '@fortawesome/free-regular-svg-icons/faImage'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlass'
import { faStopwatch } from '@fortawesome/free-solid-svg-icons/faStopwatch'
// scope badges: a monitor for the screen, a browser window for the page
import { faDesktop } from '@fortawesome/free-solid-svg-icons/faDesktop'
import { faWindowMaximize } from '@fortawesome/free-regular-svg-icons/faWindowMaximize'
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay'
import { faStop } from '@fortawesome/free-solid-svg-icons/faStop'

import * as actions from '@/actions'
import { selectableCommands } from '@/common/command'
import * as C from '@/common/constant'
import { isCVTypeForDesktop } from '@/common/cv_utils'
import { delay } from '@/common/utils'
import { selectAreaOnDesktop } from '@/ext/common/desktop_vision'
import csIpc from '@/common/ipc/ipc_cs'
import { MenuItemType, showContextMenu } from '@/components/context_menu'
import getSaveTestCase from '@/components/save_test_case'
import { STARTER_SCRIPT } from '@/config/preinstall_js_scripts'
import { FocusArea } from '@/reducers/state'
import { getStorageManager } from '@/services/storage'
import { isScriptPaused, isScriptRunning, onScriptEvent, POLYFILL, probeFind, runScript, setScriptBreakpoints, stopScript } from '@/modules/script_runner'
import { hasUnsavedMacro } from '@/recomputed'
import './script_view.scss'

// The JS script editor — the main macro view in JS-first mode (both in the
// side panel Macro tab and in the IDE window). Scripts run line-by-line in
// the sandboxed interpreter; the active line is highlighted while it runs,
// like the table's row highlight.
//
// Script source of truth: editing.script in redux — the same lifecycle as
// table commands. Edits mark the macro unsaved, the normal save flows
// (Save button here, save-before-play, "unsaved changes" dialogs) apply,
// and the main Play button runs editing.script. With no macro open, typing
// seeds an Untitled script macro that "Save.." turns into a .js file.
//
// One legacy exception: a TABLE macro open while the dev-mode "JS" view is
// selected — the editor is then a local playground (nothing is written into
// the table macro) with its own Run button.

// autocomplete: the uiv.* API (mirrors the polyfill in script_runner.js).
// DOM world: $ / $$ / findElements + locator strings.
// Visual world: img / ocr / findImages / ocr.findTexts — always explicit.
// Input is split by TIER (page / browser / desktop); see the polyfill header.
const UIV_METHODS = [
  { text: '$(', displayText: "$('css=#buy') -> FIRST DOM match {x,y,rect,text,value,attributes,..}; m.getAttribute('href') reads an attribute (find-time snapshot) - all frames + shadow roots, auto-waits, throws if none" },
  { text: '$$(', displayText: "$$('css=tr') -> ALL DOM matches (array)" },
  { text: 'findImage(', displayText: "findImage('button.png') -> FIRST visual match {x,y,rect,score} - computer vision, auto-waits" },
  { text: 'ocr.findText(', displayText: "ocr.findText('Checkout') -> FIRST match of rendered text {x,y,rect,text} - finds WHERE text is (OCR), auto-waits; {scope:'desktop'} searches the SCREEN for uiv.desktop.*" },
  { text: 'ocr.read(', displayText: "ocr.read() -> the text in the viewport as a string; {area: match|rect} reads ONE region, {scope:'desktop'} the screen, {image:'shot.png'} a saved screenshot. Reading the DOM? use uiv.$('css=h1').text instead" },
  { text: 'page.type(', displayText: "page.type('id=email' | match, 'a@b.com') - FASTEST way to fill a field: sets the value in one step, no click needed; a match is filled in its own frame" },
  { text: 'page.click(', displayText: "page.click('css=#buy' | match) - synthetic DOM click (fast, background tabs OK); sites that check for trusted input ignore it -> use browser.click" },
  { text: 'page.select(', displayText: "page.select('css=#sort', 'Most recent') - pick a <select> option by visible label (or 'value=..' / 'index=N'); error lists the available options" },
  { text: 'browser.click(', displayText: "browser.click('css=locator' | match | x, y) - TRUSTED click via CDP, no XModule; visual = browser.click(uiv.findImage(..))" },
  { text: 'browser.type(', displayText: "browser.type('text') - trusted keystrokes into the FOCUSED element; key codes like '${KEY_ENTER}' work. A navigating ENTER wants {nav: true} - waits for the page it triggers" },
  { text: 'browser.move(', displayText: "browser.move('css=locator' | match | x, y) - trusted mouse-over" },
  { text: 'browser.down(', displayText: 'browser.down(match | x, y) - trusted mouse BUTTON DOWN; pair with browser.up for a drag' },
  { text: 'browser.up(', displayText: 'browser.up(match | x, y) - trusted mouse BUTTON UP; the other half of a browser.down drag' },
  { text: 'browser.mouse.move(', displayText: 'browser.mouse.move(x, y) - trusted pointer move in viewport CSS pixels' },
  { text: 'browser.mouse.wheel(', displayText: 'browser.mouse.wheel(deltaX, deltaY) - trusted scrolling at the current pointer; CSS pixels, positive right/down; Chromium only' },
  { text: 'desktop.keyboard.down(', displayText: "desktop.keyboard.down('Shift') - hold an OS key; released at run end" },
  { text: 'desktop.keyboard.up(', displayText: "desktop.keyboard.up('Shift') - release an OS key" },
  { text: 'desktop.keyboard.press(', displayText: "desktop.keyboard.press('Space', {delay:30}) - tap, optional duration in ms" },
  { text: 'window.move(', displayText: 'window.move(x, y) - move the browser window in screen coordinates' },
  { text: 'lastCapture(', displayText: 'lastCapture() - last desktop capture ID, epoch time and age in ms' },
  { text: 'requireAppVersion(', displayText: "requireAppVersion('2.1.40') - require a desktop app version" },
  { text: 'browser.keyboard.down(', displayText: "browser.keyboard.down('a') - hold one key; consecutive calls hold multiple keys, repeated down sends repeat; release with up" },
  { text: 'browser.keyboard.up(', displayText: "browser.keyboard.up('a') - release one held key; Playwright key names, including Shift and ControlOrMeta" },
  { text: 'page.scrollIntoViewIfNeeded(', displayText: "page.scrollIntoViewIfNeeded('css=#target', {timeout: 3000}) - reveal a DOM target only when not fully visible; timeout in milliseconds, 0 disables it; also available on a DOM match" },
  { text: 'desktop.click(', displayText: "desktop.click(match | x, y) - real OS click in SCREEN pixels (XModule); reaches OS dialogs. Needs a desktop-scope match: uiv.findImage(f, {scope:'desktop'})" },
  { text: 'desktop.type(', displayText: 'desktop.type(text) - real OS keystrokes (XModule); works outside the browser too' },
  { text: 'desktop.move(', displayText: 'desktop.move(match | x, y) - real OS mouse-move in SCREEN pixels (XModule)' },
  { text: 'desktop.down(', displayText: 'desktop.down(match | x, y) - real OS mouse BUTTON DOWN; pair with desktop.up for a drag' },
  { text: 'desktop.up(', displayText: 'desktop.up(match | x, y) - real OS mouse BUTTON UP; the other half of a desktop.down drag' },
  { text: 'desktop.mouse.wheel(', displayText: 'desktop.mouse.wheel(deltaX, deltaY) - native scrolling at the OS pointer; input pixels, positive right/down; Ui.Vision for Desktop 2.1.38+' },
  { text: 'window.focus(', displayText: 'window.focus() - bring the BROWSER WINDOW to the front. A PRECONDITION for uiv.desktop.*: OS input goes to whatever window is frontmost, so call it before uiv.goto in a desktop macro' },
  { text: 'window.resize(', displayText: 'window.resize(1280, 900) -> the ACHIEVED viewport {width, height} - pins the layout a macro was written for; a narrow window flips responsive sites to their mobile layout' },
  { text: 'window.minimize(', displayText: 'window.minimize() - minimize the browser AND the IDE, to automate an application sitting behind them' },
  { text: 'shot.viewport(', displayText: "shot.viewport('name') -> file name; screenshot of the VISIBLE page. Pipe it: uiv.ocr.read({image: uiv.shot.viewport()})" },
  { text: 'shot.page(', displayText: "shot.page('name') -> file name; screenshot of the WHOLE page (scroll-stitched)" },
  { text: 'shot.element(', displayText: "shot.element('css=#logo', 'name') -> file name; screenshot of ONE element (locator string, not a match)" },
  { text: 'shot.desktop(', displayText: "shot.desktop('name') -> file name; screenshot of the whole SCREEN (XModule)" },
  { text: 'shot.area(', displayText: "shot.area(match, 'name.png') -> crop the match's box into VISION storage, so uiv.findImage('name.png') finds it from now on; a bare point (ai.find) needs {width, height}" },
  { text: 'ai.ask(', displayText: "ai.ask('question', {images: ['shot.png']}) -> the model's answer as text; {json: true} -> a PARSED object/array instead of prose (told to answer JSON-only, parsed with one retry)" },
  { text: 'ai.find(', displayText: "ai.find('the search icon') -> a MATCH {x,y} found by the MODEL — the 4th finder, feed it to browser.click/desktop.click. Does NOT auto-wait (each try is a model call)" },
  { text: 'ai.computerUse(', displayText: "ai.computerUse('fill this form and submit') -> an AGENT that clicks and types until the task is done; returns its final report. Not a way to ask a question — that is ai.ask" },
  { text: 'csv.read(', displayText: "csv.read('data.csv') -> rows as a real 2D array [['a','b'], ...]" },
  { text: 'csv.append(', displayText: "csv.append('log.csv', [ts, value]) - add one row (or an array of rows); creates the file if new" },
  { text: 'csv.write(', displayText: "csv.write('data.csv', rows) - OVERWRITE with a 2D array" },
  { text: 'csv.exists(', displayText: "csv.exists('data.csv') -> true/false, without throwing" },
  { text: 'files.exportToDownloads(', displayText: "files.exportToDownloads('x.png' | 'x.csv' | 'log') - copy ONE file out of Ui.Vision storage into the browser's Downloads folder (the whole store is never exported at once)" },
  { text: 'files.remove(', displayText: "files.remove('x.png' | 'x.csv' | 'x.txt') - DELETE one file from Ui.Vision storage. Takes any stored name, so it pairs with files.exportToDownloads: export it, then remove it" },
  { text: 'files.list(', displayText: 'files.list() -> names of EVERY stored file, screenshots and CSV/TXT alike (csv.list() is the CSV/TXT tab only)' },
  { text: 'files.exists(', displayText: "files.exists('x.png') -> true/false for any stored file, without throwing" },
  { text: 'download(', displayText: "download('css=a.installer' | url | function, {as: 'name.ext', timeout, wait}) - download from the WEB, returns the on-disk file name; a locator grabs its href/src without clicking, a function runs as the trigger for click-only downloads" },
  { text: 'csv.list(', displayText: 'csv.list() -> names of all stored CSV files' },
  { text: 'text.read(', displayText: "text.read('prompts.csv') -> the file's RAW text, no CSV parsing - the fix for one-per-line lists saved as .csv that the strict csv.read can never parse. Split it yourself: .split(/\\r?\\n/)" },
  { text: 'text.write(', displayText: "text.write('notes.txt', string) - write raw text; any known extension is kept as given" },
  { text: 'clipboard.read(', displayText: 'clipboard.read() -> the system clipboard as a string' },
  { text: 'clipboard.write(', displayText: 'clipboard.write(text) - put text on the system clipboard' },
  { text: 'exit(', displayText: "exit('reason') - end the run EARLY and GREEN (a precondition is missing, nothing to do). Not an error: throw for that" },
  { text: 'findElement(', displayText: "findElement('css=#buy') - alias of uiv.$, the FIRST DOM match" },
  { text: 'open(', displayText: 'open(url) - navigate the tab, waits for page load' },
  { text: 'tabs.select(', displayText: 'tabs.select(2) - switch to tab #2 (ABSOLUTE, 1-based, left to right); returns {index, title, url, active, current} so the script can verify where it landed' },
  { text: 'tabs.list(', displayText: 'tabs.list() -> all tabs of the window as [{index, title, url, active, current}, ...]; current: true = the tab the script acts on (the position read - !CURRENT_TAB_NUMBER is table-macros-only)' },
  { text: 'tabs.open(', displayText: 'tabs.open(url) - NEW tab on url, waits for load (uiv.goto navigates the CURRENT tab instead); returns {index, title, url, active, current}' },
  { text: 'tabs.close(', displayText: 'tabs.close() - close the current tab, land on its neighbour; returns the new current tab' },
  { text: 'eval(', displayText: "eval('return document.title') - run JS in the page, returns the result" },
  { text: 'log(', displayText: "log(text, color) - write to the log panel; color optional (green/red/blue/..., '#shownotification' = browser notification)" },
  { text: 'banner(', displayText: "banner(html[, {seconds, tone: 'green', position: 'bottom', icon: false}]) - message overlay ON the page, for the person watching; each call replaces the last, '' hides it" },
  { text: 'sleep(', displayText: "sleep(ms or '2s' / '1m')" },
  { text: 'getVar(', displayText: "getVar('name' | '!LASTCOMMANDOK'[, default]) - read a Ui.Vision variable, special ones included (!LASTCOMMANDOK, !TIMEOUT_WAIT); throws on an unknown name or one that is not set yet. Table-macros-only names throw here with the JS replacement: !URL (eval('return location.href')), !CURRENT_TAB_NUMBER (tabs.list(), current: true entry), the csvRead family !COL1/!CSVREAD* (csv.read(file)), and the finder-result vars !IMAGEX/!OCRX/!AI1 (the finder returns the match - match.x, match.rect; offsets via offset(match, dx, dy))" },
  { text: 'setVar(', displayText: "setVar('name' | '!TIMEOUT_PAGELOAD', value) - write a variable; readonly system vars (!CURRENT_TAB_NUMBER, !LASTCOMMANDOK, ...) are rejected" },
  { text: 'findElements(', displayText: "findElements('css=tr', {timeout, required, includeHidden}) -> all DOM matches, with options" },
  { text: 'findImages(', displayText: "findImages('button.png', {minScore: 0.8, scope, area: match | rect}) -> all visual matches; {area} searches ONE region only. Relative click = uiv.offset(match, dx, dy); green/pink relative images are classic-commands-only" },
  { text: 'offset(', displayText: "offset(match, dx, dy) -> the match shifted by dx/dy (from its CENTRE) — the JS form of 'word#R8,-14'. Returns a match, so scope travels with it" },
  { text: 'ocr.findTexts(', displayText: "ocr.findTexts('Checkout', {engine, language, area: match | rect}) -> all OCR matches; {area} searches ONE region only" },
  { text: 'run(', displayText: 'run(cmd, target, value) - LEGACY bridge: any classic command; prefer the core API' }
]

// two completion contexts: `uiv.<prefix>` -> API methods,
// `uiv.run('<prefix>` -> all (non-deprecated) Ui.Vision command names
function uivHint (cm) {
  const cur = cm.getCursor()
  const before = cm.getLine(cur.line).slice(0, cur.ch)

  const cmdCtx = /uiv\.run\(\s*['"]([\w]*)$/.exec(before)
  if (cmdCtx) {
    const prefix = cmdCtx[1].toLowerCase()
    const list = selectableCommands
      .filter(c => c.toLowerCase().indexOf(prefix) === 0)
      .map(c => ({ text: c, displayText: c }))
    if (!list.length) return null
    return {
      list,
      from: { line: cur.line, ch: cur.ch - cmdCtx[1].length },
      to: cur
    }
  }

  const apiCtx = /uiv\.([\w$]*)$/.exec(before)
  if (apiCtx) {
    const prefix = apiCtx[1].toLowerCase()
    const list = UIV_METHODS.filter(m => m.text.toLowerCase().indexOf(prefix) === 0)
    if (!list.length) return null
    return {
      list,
      from: { line: cur.line, ch: cur.ch - apiCtx[1].length },
      to: cur
    }
  }

  return null
}

// Find button: every call on the line whose FIRST argument is a literal
// string, in source order — `var m = uiv.findImage('buy.png')`,
// `uiv.page.click('css=#buy')`, `find('buy.png')`. The candidates are read by
// SHAPE and the NAMES are resolved afterwards (resolveFinderOnLine), because
// what a finder is called is up to the script. The shipped demos alias the
// tier and wrap the finder:
//     const t = uiv.desktop;
//     const FIND = { scope: 'desktop' };
//     const find = (name, minScore) => uiv.findImage(name, ... FIND);
//     t.click(find('draw_text1_dpi_96.png'));
// and against a pattern rooted in a literal `uiv.` the last line matched
// nothing: Find answered "put the cursor on a line with a uiv finder" while
// pointing at a line that has one.
const CALL_RE = /(?:([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\.\s*)?([A-Za-z_$][\w$]*)\s*\(\s*(['"])((?:\\.|(?!\3).)*?)\3/g
// Same shape but the first argument is an IDENTIFIER — `uiv.ocr.findTexts(q)`,
// `uiv.ai.find(what)`. The name is resolved against a one-line string
// declaration when the script has one; otherwise Find asks the user for the
// value instead of pretending there is no finder on the line.
const VAR_CALL_RE = /(?:([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\.\s*)?([A-Za-z_$][\w$]*)\s*\(\s*([A-Za-z_$][\w$]*)\s*[,)]/g
// `const q = 'Data*';` — resolves an identifier target to its literal
const STR_DECL_RE = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])((?:\\.|(?!\2).)*)\2\s*;?\s*$/
// The OPTIONS that change what "find" means. Without these the Find button
// answered a different question from the script it is sitting in:
// {scope: 'desktop'} searches the SCREEN, and probing it against the browser
// viewport reported "no matches" for an image that is plainly there — the
// whole point of the button is to tell those two apart. minScore/engine/
// language matter for the same reason: a probe run at the default threshold
// or the configured OCR engine is not the call on the line.
// Read over the line first, then over the wrapper the line calls — a wrapper
// holds exactly these options and the line does not show them.
const FIND_OPT_SCOPE = /\bscope\s*:\s*(['"])(desktop|browser)\1/
const FIND_OPT_MIN_SCORE = /\bminScore\s*:\s*(\d*\.?\d+)/
const FIND_OPT_ENGINE = /\bengine\s*:\s*(['"])(\w+)\1/
const FIND_OPT_LANGUAGE = /\blanguage\s*:\s*(['"])(\w+)\1/

// `text` is the line, plus (for a wrapped finder) the wrapper's own source
// after it — first match wins, so the line always overrules the wrapper.
const parseFindOptions = (text) => {
  const opts = {}
  const scope = FIND_OPT_SCOPE.exec(text)
  if (scope) opts.scope = scope[2]
  const minScore = FIND_OPT_MIN_SCORE.exec(text)
  if (minScore) opts.minScore = Number(minScore[1])
  const engine = FIND_OPT_ENGINE.exec(text)
  if (engine) opts.engine = engine[2]
  const language = FIND_OPT_LANGUAGE.exec(text)
  if (language) opts.language = language[2]
  return opts
}

// Where a tool will act, as a small badge next to its label: a monitor for the
// SCREEN, a browser window for the page. Screen and page captures look
// identical until the crop comes back showing the wrong thing, and a "no
// matches" from the wrong surface reads exactly like a real miss — so the
// three tools say which one they mean before they are clicked, rather than
// after. null renders nothing (the cursor is on a line with no finder at all).
const scopeBadge = (scope) => {
  if (scope !== 'desktop' && scope !== 'browser') return null
  const onDesktop = scope === 'desktop'
  return (
    <FontAwesomeIcon
      icon={onDesktop ? faDesktop : faWindowMaximize}
      className={`script-scope-badge script-scope-${scope}`}
      title={onDesktop ? 'Searches the SCREEN (desktop scope)' : 'Searches the browser page'}
    />
  )
}

// probe engine per call name (click/move strings are DOM locators)
const FIND_KIND = {
  '$': 'elementSearch',
  '$$': 'elementSearch',
  findElement: 'elementSearch',
  findElements: 'elementSearch',
  click: 'elementSearch',
  move: 'elementSearch',
  findImage: 'imageSearch',
  findImages: 'imageSearch',
  findText: 'textSearch',
  findTexts: 'textSearch'
}

// uiv.ai.find is a finder too — probing it is ONE real (billed) model call,
// so unlike the free finders it runs only on the explicit button click.
const finderKind = (tier, name) => (tier === 'ai' && name === 'find' ? 'ai' : FIND_KIND[name])

// --- resolving the names on the line against the rest of the script ---------
//
// This is a regex read of the source, not a parse. A declaration that does not
// fit on one line (plus, for a function, its braces) is simply not resolved,
// and Find says it found no finder rather than probing a guess.

// The uiv finder inside a wrapper body, and the name it passes as the target.
const BODY_FINDER_RE = /\buiv\s*\.\s*(?:(page|browser|desktop|ocr|ai)\s*\.\s*)?(findElements|findElement|findImages|findImage|findTexts|findText|find|\$\$|\$|click|move)\s*\(\s*([A-Za-z_$][\w$]*)\s*[,)]/
// `const FIND = { scope: 'desktop' };` — a wrapper's shared options usually sit
// in one of these, and a probe that does not follow the name runs in the wrong
// scope: the very confusion this button exists to clear up.
const OBJECT_DECL_RE = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(\{[^{}]*\})\s*;?\s*$/
// `const find = uiv.findImage;` — a rename, with no wrapper around it
const RENAME_DECL_RE = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*uiv\s*\.\s*(?:(page|browser|desktop|ocr|ai)\s*\.\s*)?([A-Za-z_$][\w$]*)\s*;?\s*$/
// `const find = (name, minScore) => ...` / `const find = n => ...`
const ARROW_DECL_RE = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>\s*(.*)$/
// `function find (name) { ... }` / `const find = function (name) { ... }`
const FUNC_DECL_RE = /^\s*(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*function\b)\s*\(([^)]*)\)\s*(.*)$/

// `\b` is the wrong boundary for a JS identifier: `$` is a word character to
// the language and a non-word one to the regex engine. Excluding a leading dot
// keeps `FIND` from matching the property in `opts.FIND`.
const identRe = (name, suffix, flags) =>
  new RegExp('(^|[^\\w$.])' + name.replace(/\$/g, '\\$') + '(?![\\w$])' + (suffix || ''), flags)

const braceDelta = (s) => (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length

// What the rest of the script says about the names used on a finder line:
// the object literals it may pass as options, and the wrappers it may call
// instead of a uiv finder.
const buildScriptContext = (src) => {
  // split on every line ending, not just \n: a script imported or pasted with
  // CRLF would otherwise leave a \r on each line, and `.` and `$` do not match
  // a carriage return — every declaration below ends in one of them, so a
  // CRLF script resolved no wrappers at all
  const lines = src.split(/\r\n|\r|\n/)
  // null-prototype: these are looked up by a name taken from the script, and
  // a script may well call something toString or constructor
  const objects = Object.create(null)   // name -> object-literal source
  const wrappers = Object.create(null)  // name -> { kind, body, params }
  const strings = Object.create(null)   // name -> string-literal value

  lines.forEach((text, i) => {
    const obj = OBJECT_DECL_RE.exec(text)
    if (obj) {
      objects[obj[1]] = obj[2]
      return
    }

    const str = STR_DECL_RE.exec(text)
    if (str) {
      strings[str[1]] = str[3].replace(/\\(.)/g, '$1')
      return
    }

    const rename = RENAME_DECL_RE.exec(text)
    if (rename) {
      const kind = finderKind(rename[2], rename[3])
      if (kind) wrappers[rename[1]] = { kind, body: '', params: [] }
      return
    }

    const arrow = ARROW_DECL_RE.exec(text)
    const func = arrow ? null : FUNC_DECL_RE.exec(text)
    if (!arrow && !func) return

    const name = arrow ? arrow[1] : (func[1] || func[2])
    const paramText = arrow ? (arrow[2] !== undefined ? arrow[2] : arrow[3]) : func[3]
    const params = paramText.split(',').map(s => s.trim()).filter(Boolean)

    // A body that runs past the declaration line: read on until the braces
    // balance, bounded — a peek, not a parse. The balance test is what keeps a
    // one-line arrow from swallowing the statements after it and claiming the
    // NEXT finder in the file as its own.
    let body = arrow ? arrow[4] : func[4]
    let depth = braceDelta(body)
    for (let j = i + 1; depth > 0 && j < lines.length && j - i <= 12; j++) {
      body += '\n' + lines[j]
      depth += braceDelta(lines[j])
    }

    const f = BODY_FINDER_RE.exec(body)
    if (!f) return
    const kind = finderKind(f[1], f[2])
    // Only a PASS-THROUGH wrapper can be probed with the call site's string.
    // When the body finds something else (a fixed file name, a computed one),
    // the literal on the line is not the target, and probing it anyway would
    // answer a question the script never asked.
    if (kind && f[3] === params[0]) wrappers[name] = { kind, body, params }
  })

  return { objects, wrappers, strings }
}

// One entry is enough: the source is re-read on every cursor move, and it is
// the same source nearly every time.
let scriptContextSrc = null
let scriptContext = null
const getScriptContext = (getSrc) => {
  const src = getSrc()
  if (src !== scriptContextSrc) {
    scriptContextSrc = src
    scriptContext = buildScriptContext(src)
  }
  return scriptContext
}

// What would Find search for on this line? -> { kind, target, opts }, or null
// when the line holds no finder call at all. `getSrc` is a getter rather than
// the source itself: resolving a name is the slow path, and a plain uiv.* line
// never needs the rest of the file.
const resolveFinderOnLine = (line, getSrc) => {
  CALL_RE.lastIndex = 0
  let m

  while ((m = CALL_RE.exec(line)) !== null) {
    const receiver = (m[1] || '').replace(/\s/g, '')
    const name = m[2]
    const target = m[4].replace(/\\(.)/g, '$1')

    // Called on something: the method name decides, whatever it is called on.
    // The receiver may be an alias (`const t = uiv.desktop; t.click('css=..')`)
    // or the uiv tier itself, and neither changes what the call searches.
    if (receiver) {
      const kind = finderKind(/(^|\.)ai$/.test(receiver) ? 'ai' : null, name)
      if (kind) return { kind, target, opts: parseFindOptions(line) }
      continue
    }

    // Bare: only a wrapper the script itself declares.
    const context = getScriptContext(getSrc)
    const wrapper = context.wrappers[name]
    if (!wrapper) continue

    let body = wrapper.body
    // A positional argument the wrapper turns into an option: `find('x.png',
    // 0.4)` is the demos' own minScore, and probing at the default threshold
    // instead produces exactly the "no matches" the button is meant to
    // explain. Bind the literal to the parameter it lands on — not where that
    // name is a KEY, or `{minScore: minScore}` would lose its key.
    const rest = line.slice(m.index + m[0].length)
    const positional = /^\s*,\s*(-?\d*\.?\d+)\s*\)/.exec(rest)
    if (positional && /^[A-Za-z_$][\w$]*$/.test(wrapper.params[1] || '')) {
      body = body.replace(identRe(wrapper.params[1], '(?!\\s*:)', 'g'), '$1' + positional[1])
    }

    // the wrapper's own source, and the object literals it names — that is
    // where {scope: 'desktop'} lives when the line does not spell it out
    const texts = [line, body]
    Object.keys(context.objects).forEach((key) => {
      if (identRe(key).test(body)) texts.push(context.objects[key])
    })

    return { kind: wrapper.kind, target, opts: parseFindOptions(texts.join('\n')) }
  }

  // No string-literal call on the line — an IDENTIFIER target then:
  // `uiv.ocr.findTexts(q)`, `uiv.ai.find(what)`. Resolve the name against a
  // one-line string declaration; unresolved is still a finder — the caller
  // shows the kind and asks the user for the value on click.
  VAR_CALL_RE.lastIndex = 0
  while ((m = VAR_CALL_RE.exec(line)) !== null) {
    const receiver = (m[1] || '').replace(/\s/g, '')
    const name = m[2]
    const varName = m[3]
    if (!receiver) continue
    // click/move take coordinate variables all the time — an identifier there
    // is almost never a locator string, so the variable pass skips them
    if (name === 'click' || name === 'move') continue
    const kind = finderKind(/(^|\.)ai$/.test(receiver) ? 'ai' : null, name)
    if (!kind) continue
    const context = getScriptContext(getSrc)
    const resolved = context.strings[varName]
    return {
      kind,
      target: resolved !== undefined ? resolved : null,
      targetVar: varName,
      opts: parseFindOptions(line)
    }
  }

  return null
}

// syntax highlighting overlay: color every known uiv.* call, and mark
// unknown uiv.* names as probable typos.
// DERIVED from the polyfill, never hand-listed. A hand-list rots the moment
// the API grows and then LIES about working code: uiv.files shipped in
// 10.0.105 and the overlay went on painting uiv.files.remove as a typo.
// Every name in the API — namespace, method, alias, and the uiv.main flag —
// is a top-level `uiv.x =` or `uiv.x.y =` in the polyfill, so this regex is
// the whole set by construction. The two-segment cap matches the overlay's
// own path regex below; the polyfill has no deeper nesting.
const KNOWN_UIV = new Set(
  [...POLYFILL.matchAll(/^uiv\.([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*=/gm)].map(m => m[1])
)

const uivOverlay = {
  token: (stream) => {
    // tier calls are dotted (uiv.page.click), so consume the whole path —
    // matching only the first segment marked every tier call as a typo
    const m = stream.match(/^uiv\.([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)/)
    if (m) return KNOWN_UIV.has(m[1]) ? 'uiv-call' : 'uiv-unknown'
    while (stream.next() != null) {
      if (stream.match(/^uiv\./, false)) break
    }
    return null
  }
}

class ScriptView extends React.Component {
  state = {
    height: 0,
    running: isScriptRunning(),
    // 'stopped' | 'running' | 'paused' — mirrors the runner
    scriptStatus: isScriptRunning() ? (isScriptPaused() ? 'paused' : 'running') : 'stopped',
    finding: false,
    toolsOpen: false, // dev-mode "Script tools" drawer (Find/Select/...)
    // thumbnail of the vision image named on the cursor's line (drawer only)
    imagePreviewUrl: null,
    imagePreviewName: null,
    // 'desktop' | 'browser' | null — where the finder on the CURSOR's line
    // would search, shown as a badge on Find
    lineScope: null,
    // { kind, target } of the finder on the cursor's line (null = none) —
    // drives the Find button's label: Find Element (locator…) / Find Image /
    // Find Text (word…) / Find ai.find (question…)
    lineFinder: null,
    // seconds left in the delayed-capture countdown ("..." menu);
    // null = no countdown running
    captureCountdown: null,
    // the "..." mini-menu next to Select image
    captureMenuOpen: false
  }

  _lastPreviewFile = null

  // dev tooling (drawer, context menu, breakpoints): dev mode in the side
  // panel, always in the IDE window
  showDevTools () {
    return !!(this.props.ideMode || this.props.devMode)
  }

  text = null
  editor = null
  rootEl = null
  activeLine = null
  errorLine = null
  pendingLine = null
  lineRaf = null
  lastRevealAt = null
  unsubscribes = []
  // UnControlled CodeMirror replaces the WHOLE document (cursor jump!)
  // whenever its `value` prop changes — and this component re-renders on
  // every keystroke now that edits dispatch to redux. So the prop is pinned
  // to the mount-time text and never changes; every later content change
  // (macro switch, external set_macro, examples) goes through
  // editor.setValue() in componentDidUpdate / loadExample instead.
  initialText = this.getText()

  getSrc () {
    const { editing } = this.props
    return (editing && editing.meta && editing.meta.src) || null
  }

  getMacroName () {
    const src = this.getSrc()
    return src && src.name && src.name.length ? src.name : 'Untitled'
  }

  // the open macro's script from redux, or null when the open macro is a
  // table macro (or nothing is loaded yet)
  getReduxScript () {
    const { editing } = this.props
    return editing && typeof editing.script === 'string' ? editing.script : null
  }

  // whether this editor writes into editing.script: script macros and the
  // empty Untitled state do; a table macro shown via the dev "JS" view is a
  // local playground and does not
  isReduxBacked () {
    if (this.getReduxScript() !== null) return true
    const { editing } = this.props
    return !this.getSrc() && (!editing.commands || editing.commands.length === 0)
  }

  isPlayground () {
    return !this.isReduxBacked()
  }

  getText () {
    if (this.text !== null) return this.text
    const script = this.getReduxScript()
    if (script !== null) return script
    return STARTER_SCRIPT
  }

  onChange = (editor, data, text) => {
    this.text = text
    if (this.isReduxBacked() && text !== this.getReduxScript()) {
      this.props.updateEditingScript(text)
    }
  }

  clearLine (line, cls) {
    if (this.editor && line !== null) {
      this.editor.removeLineClass(line - 1, 'background', cls)
    }
  }

  // Move the blue active-line marker. Coalesced to one update per animation
  // frame: fast lines (store, echo …) can advance several times between two
  // paints, and applying every intermediate move — each its own CodeMirror
  // display update — made the marker flicker. Per frame only the newest line
  // is painted, add-before-remove, batched into a single CM operation.
  onLine = (line) => {
    if (!this.editor) return
    this.pendingLine = line
    if (this.lineRaf) return
    this.lineRaf = requestAnimationFrame(() => {
      this.lineRaf = null
      const next = this.pendingLine
      if (!this.editor || next === null || next === this.activeLine) return
      const prev = this.activeLine
      this.activeLine = next
      this.editor.operation(() => {
        this.editor.addLineClass(next - 1, 'background', 'script-active-line')
        if (prev !== null) this.editor.removeLineClass(prev - 1, 'background', 'script-active-line')
        this.editor.scrollIntoView({ line: next - 1, ch: 0 }, 40)
      })
    })
  }

  cancelPendingLine () {
    if (this.lineRaf) {
      cancelAnimationFrame(this.lineRaf)
      this.lineRaf = null
    }
    this.pendingLine = null
  }

  // One-shot "Jump to line" request from a log entry's link
  // (ui.scriptRevealLine). Consumed by `at` nonce; the timestamp guard keeps
  // a remount (tab switch) from re-jumping on a stale request.
  maybeReveal () {
    const reveal = this.props.revealLine
    if (!this.editor || !reveal || typeof reveal.line !== 'number') return
    if (this.lastRevealAt === reveal.at) return
    this.lastRevealAt = reveal.at
    if (Date.now() - reveal.at > 5000) return

    const line = reveal.line - 1
    this.editor.setCursor({ line, ch: 0 })
    this.editor.scrollIntoView({ line, ch: 0 }, 60)
    this.editor.focus()
    // flash the line unless the post-run error mark already colors it
    if (this.errorLine !== reveal.line) {
      this.editor.addLineClass(line, 'background', 'script-error-line')
      setTimeout(() => {
        if (this.editor && this.errorLine !== reveal.line) {
          this.editor.removeLineClass(line, 'background', 'script-error-line')
        }
      }, 2000)
    }
  }

  onDone = ({ ok, error, errorLine }) => {
    // a queued marker move must not resurrect the highlight after the run
    this.cancelPendingLine()
    this.clearLine(this.activeLine, 'script-active-line')
    this.activeLine = null
    if (!ok && errorLine && this.editor) {
      this.errorLine = errorLine
      this.editor.addLineClass(errorLine - 1, 'background', 'script-error-line')
    }
  }

  onStatus = (status) => {
    this.setState({
      scriptStatus: status,
      // 'paused' still counts as running: the editor stays read-only and the
      // helper buttons stay disabled until the run actually ends
      running: status !== 'stopped'
    })
  }

  // start a run with loud failure reporting — any failure to even start must
  // be visible AND persistent (the toast disappears, the log line stays)
  startScript (code, opts) {
    if (this.state.running) return
    // clear leftovers from the previous run
    this.clearLine(this.errorLine, 'script-error-line')
    this.errorLine = null
    const reportStartFailure = (e) => {
      const msg = `Script failed to start: ${(e && e.message) || e}`
      message.error(msg, 3)
      try { this.props.addLog('error', msg) } catch (e2) { /* log panel unavailable */ }
      console.error('JS script start failure', e)
    }
    try {
      runScript(code, opts).catch(reportStartFailure)
    } catch (e) {
      reportStartFailure(e)
    }
  }

  // Run button for the legacy playground case only — script macros run via
  // the main Play button (which reads editing.script)
  onClickRun = () => {
    this.startScript(this.getText())
  }

  // ---------------------------------------------------------------------
  // breakpoints: red dots in the gutter; the run pauses when it reaches a
  // marked line. The view owns the markers (they travel with their lines
  // through edits) and mirrors the current line numbers into the runner.
  // ---------------------------------------------------------------------

  makeBreakpointMarker () {
    const el = document.createElement('div')
    el.className = 'script-breakpoint-dot'
    el.title = 'Breakpoint — the run pauses here (click to remove)'
    return el
  }

  hasBreakpointAt (line) {
    if (!this.editor) return false
    const info = this.editor.lineInfo(line)
    return !!(info && info.gutterMarkers && info.gutterMarkers.breakpoints)
  }

  toggleBreakpoint = (line) => {
    if (!this.editor) return
    this.editor.setGutterMarker(
      line,
      'breakpoints',
      this.hasBreakpointAt(line) ? null : this.makeBreakpointMarker()
    )
    this.syncBreakpoints()
  }

  onGutterClick = (cm, line) => {
    if (!this.showDevTools()) return
    this.toggleBreakpoint(line)
  }

  syncBreakpoints = () => {
    if (!this.editor) return
    const lines = []
    this.editor.eachLine((handle) => {
      const info = this.editor.lineInfo(handle)
      if (info && info.gutterMarkers && info.gutterMarkers.breakpoints) {
        lines.push(info.line + 1) // runner lines are 1-based
      }
    })
    setScriptBreakpoints(lines)
  }

  // ---------------------------------------------------------------------
  // context menu (dev tooling): the table's row menu, translated to lines
  // ---------------------------------------------------------------------

  onContextMenu = (e) => {
    // plain users keep the native browser menu (with its native Copy/Paste)
    if (!this.showDevTools() || !this.editor) return
    e.preventDefault()
    e.stopPropagation()

    // like the table selects the clicked row: move the cursor to the click
    const pos = this.editor.coordsChar({ left: e.clientX, top: e.clientY })
    if (!this.editor.somethingSelected()) this.editor.setCursor(pos)

    showContextMenu({
      x: e.clientX,
      y: e.clientY,
      onHide: () => {},
      menuItems: this.buildContextMenuItems(pos.line)
    })
  }

  ctxCopy = (line, cut) => {
    const doc = this.editor
    const isSelection = doc.somethingSelected()
    const text = isSelection ? doc.getSelection() : (doc.getLine(line) || '')

    const removeSource = () => {
      if (!cut) return
      if (isSelection) doc.replaceSelection('')
      else doc.replaceRange('', { line, ch: 0 }, { line: line + 1, ch: 0 })
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(removeSource, () => {
        message.info('Clipboard blocked — use Ctrl+C / Ctrl+X', 2)
      })
    } else {
      message.info('Clipboard unavailable — use Ctrl+C / Ctrl+X', 2)
    }
  }

  ctxPaste = () => {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(
        (text) => { this.editor.replaceSelection(text); this.editor.focus() },
        () => { message.info('Clipboard read blocked — press Ctrl+V instead', 2.5) }
      )
    } else {
      message.info('Clipboard unavailable — press Ctrl+V instead', 2.5)
    }
  }

  ctxDeleteLine = (line) => {
    const doc = this.editor
    if (doc.somethingSelected()) doc.replaceSelection('')
    else doc.replaceRange('', { line, ch: 0 }, { line: line + 1, ch: 0 })
    doc.focus()
  }

  ctxInsertLine = (line) => {
    const doc = this.editor
    const cur = doc.getLine(line) || ''
    doc.replaceRange('\n', { line, ch: cur.length })
    doc.setCursor({ line: line + 1, ch: 0 })
    doc.focus()
  }

  // "Execute this command": run ONLY this line, in a fresh interpreter but
  // with the shared variable pool kept — blank lines pad the source so line
  // numbers (highlight, errors) still match the editor
  ctxRunLine = (line) => {
    const text = this.editor.getLine(line) || ''
    if (!text.trim()) return message.info('Nothing to run on this line', 1.5)
    this.startScript('\n'.repeat(line) + text, { keepVars: true })
  }

  // "Play from here and keep vars": everything before the line is skipped —
  // JS vars defined above will not exist (uiv.getVar values survive)
  ctxRunFromHere = (line) => {
    const lines = this.editor.getValue().split('\n')
    this.startScript('\n'.repeat(line) + lines.slice(line).join('\n'), { keepVars: true })
  }

  // "Play to this point": full run that pauses when it reaches the line
  ctxRunToLine = (line) => {
    this.startScript(this.getText(), { runToLine: line + 1 })
  }

  buildContextMenuItems (line) {
    const { running } = this.state
    const btn = (content, onClick, disabled = false) => ({
      type: MenuItemType.Button,
      disabled,
      data: { content, onClick }
    })
    const divider = { type: MenuItemType.Divider, data: {} }

    return [
      btn('Cut', () => this.ctxCopy(line, true), running),
      btn('Copy', () => this.ctxCopy(line, false)),
      btn('Paste', () => this.ctxPaste(), running),
      btn('Delete line', () => this.ctxDeleteLine(line), running),
      btn('Insert new line', () => this.ctxInsertLine(line), running),
      divider,
      btn(this.hasBreakpointAt(line) ? 'Remove breakpoint' : 'Add breakpoint', () => this.toggleBreakpoint(line)),
      divider,
      btn('Run this line', () => this.ctxRunLine(line), running),
      btn('Run from here (keep vars)', () => this.ctxRunFromHere(line), running),
      btn('Run to this line', () => this.ctxRunToLine(line), running)
    ]
  }

  onClickStop = () => {
    stopScript()
  }

  onClickSave = () => {
    const name = this.getMacroName()
    getSaveTestCase().saveAs(name === 'Untitled' ? 'my_script' : name)
  }

  onClickCancelEdits = () => {
    const src = this.getSrc()
    if (!src || !src.id) return

    // easy to hit by accident, and it discards everything — always confirm
    Modal.confirm({
      title: 'Discard unsaved changes?',
      content: `This undoes all unsaved changes in macro "${this.getMacroName()}".`,
      okText: 'Discard',
      okButtonProps: { danger: true },
      cancelText: 'Keep editing',
      onOk: () => {
        // re-load the saved version; componentDidUpdate syncs the editor
        this.props.editTestCase(src.id)
      },
      onCancel: () => {}
    })
  }

  // "// →" comment on the line below `lineNo` (replacing a previous one
  // there), keeping the line's indentation — used by Select/Image so a
  // picked locator never garbles a non-empty code line
  writeCommentBelow (lineNo, text) {
    if (!this.editor) return
    const doc = this.editor
    const cur = doc.getLine(lineNo) || ''
    const indent = (cur.match(/^\s*/) || [''])[0]
    const comment = `${indent}// → ${text}`
    const next = doc.getLine(lineNo + 1)

    if (next !== undefined && /^\s*\/\/ →/.test(next)) {
      doc.replaceRange(comment, { line: lineNo + 1, ch: 0 }, { line: lineNo + 1, ch: next.length })
    } else {
      doc.replaceRange('\n' + comment, { line: lineNo, ch: cur.length })
    }
  }

  // test the finder on the cursor's line against the live page — the JS-view
  // equivalent of the edit form's Find button. Result: page flash + toast +
  // log line (deliberately NOT written into the script)
  onClickFind = async () => {
    if (!this.editor || this.state.running || this.state.finding) return
    const lineNo = this.editor.getCursor().line
    const line = this.editor.getLine(lineNo) || ''
    const found = resolveFinderOnLine(line, () => this.editor.getValue())
    if (!found) {
      message.info("Put the cursor on a line that finds something — a uiv finder or click/move, or a wrapper around one, with a literal string ('...') as the target", 3.5)
      return
    }
    const { kind, opts } = found
    let target = found.target
    if (target == null) {
      // the line's target is a variable the script does not resolve to a
      // string — ask, rather than pretending there is no finder here
      target = await prompt({
        title: 'Find: value needed',
        message: `The target on this line is the variable '${found.targetVar}', whose value the editor cannot work out. Enter the value to test with:`,
        value: ''
      })
      if (target == null || !String(target).trim()) return
      target = String(target).trim()
    }
    if (kind === 'ai') {
      // heads-up, not a refusal: unlike the free finders this probe is a real
      // (billed) model call, and its answer is fresh each run
      message.info('Testing uiv.ai.find — one real model call…', 2)
    }
    const onDesktop = opts.scope === 'desktop'

    this.setState({ finding: true })
    // highlight the probed line while the search runs (visual link between
    // the code line and the flashing matches on the page)
    this.editor.addLineClass(lineNo, 'background', 'script-find-line')
    try {
      const r = await probeFind(kind, target, opts)
      if (!r.ok) {
        message.error(`Find: ${r.error}`, 3)
      } else if (r.count === 0) {
        message.warning(
          `Find: no matches for ${kind}('${target}')` +
          (onDesktop ? ' on the SCREEN' : '') +
          (r.hiddenCount ? ` — ${r.hiddenCount} hidden match(es) exist; reveal the element first (click its toggle/icon)` : ''),
          3.5
        )
      } else if (onDesktop) {
        // a screen search cannot be flashed inside the page — the matches are
        // drawn on the capture itself, in the desktop screenshot viewer
        message.success(`Find: ${r.count} match(es) on the SCREEN — shown on the screenshot`, 2.5)
      } else {
        message.success(`Find: ${r.count} match(es) — highlighted on the page`, 2)
      }
    } finally {
      this.editor.removeLineClass(lineNo, 'background', 'script-find-line')
      this.setState({ finding: false })
    }
  }

  // Select: activate the element inspector; the picked locator comes back via
  // ui.scriptPickedLocator (see INSPECT_RESULT in index.js) and is inserted
  // at the cursor
  onClickSelect = () => {
    if (this.props.status === C.APP_STATUS.INSPECTOR) {
      this.props.stopInspecting()
    } else {
      this.props.startInspecting()
    }
  }

  // kind: 'dom' (locator string) | 'image' (vision file) — the snippets keep
  // the DOM vs visual separation visible.
  //
  // A DESKTOP capture has to produce a desktop-scoped line. The image was
  // cropped from the SCREEN, so uiv.findImage without {scope: 'desktop'} would
  // search the browser viewport for it and never match — and the click has to
  // be the desktop tier too, because a screen-pixel match is refused by the
  // browser tier outright (deliberately: viewport pixels and screen pixels are
  // not interchangeable). Inserting the browser form after a screen capture
  // handed the user a line that could not work.
  insertFinderSnippet (kind, arg, label, onDesktop) {
    if (!this.editor) return
    const escaped = String(arg).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const finder = onDesktop
      ? `uiv.findImage('${escaped}', { scope: 'desktop' })`
      : `uiv.findImage('${escaped}')`
    // browser tier for the inserted click: trusted CDP input is what works on
    // sites that ignore synthetic events, and a picked element is usually one
    // the user wants actually pressed (uiv.page.click is the faster alternative)
    const statement = kind === 'image'
      ? `${onDesktop ? 'uiv.desktop' : 'uiv.browser'}.click(${finder});`
      : `uiv.browser.click('${escaped}');`
    const expression = kind === 'image'
      ? finder
      : `uiv.$('${escaped}')`

    const cur = this.editor.getCursor()
    const line = this.editor.getLine(cur.line) || ''

    if (line.trim() === '') {
      // empty line: a whole ready-to-run statement right here
      this.editor.replaceSelection(statement)
      this.editor.focus()
      message.success(`${label} inserted`, 1.5)
    } else {
      // non-empty line: never garble it — the picked expression lands as a
      // "// →" comment on the line below (replacing a previous one there)
      this.writeCommentBelow(cur.line, expression)
      this.editor.focus()
      message.success(`${label} added as a comment below the line`, 2)
    }
  }

  insertPickedLocator (locator) {
    this.insertFinderSnippet('dom', locator, 'Locator')
  }

  // Select image: drag a rectangle — the crop is saved to the vision storage
  // (with the usual rename prompt) and an imageSearch for it lands at the
  // cursor.
  //
  // WHERE the rectangle is dragged follows the app's Vision scope setting
  // (config.cvScope), the same one the classic edit form, the header and the
  // dev toolbar already obey. This view used to crop from the page and nowhere
  // else, so a user working on a desktop macro — scope already set to desktop
  // — could not capture anything outside the browser, and the tool silently
  // did something other than what the rest of the UI said it would.
  onClickSelectImage = () => this.doSelectImage(0)

  // "5s" button: capture after a FIXED 5-second countdown (time to bring
  // another window to the front before the screen is grabbed). This replaced
  // the old Settings > Vision "wait N seconds before desktop screenshot"
  // checkbox — the delay lives on the button that needs it, hard-coded.
  onClickSelectImageDelayed = () => this.doSelectImage(5)

  doSelectImage = async (delaySec) => {
    if (this.state.running || this.state.finding || this.state.captureCountdown != null) return
    const onDesktop = isCVTypeForDesktop(this.props.config.cvScope)
    try {
      // a desktop capture covers the whole screen INCLUDING this panel — the
      // countdown (shown live on the button) lets the user get out of the way
      for (let s = delaySec; s > 0; s--) {
        this.setState({ captureCountdown: s })
        await delay(() => {}, 1000)
      }
      this.setState({ captureCountdown: null })
      const res = onDesktop
        ? await selectAreaOnDesktop({ width: screen.availWidth, height: screen.availHeight })
        : await csIpc.ask('PANEL_SELECT_AREA_ON_CURRENT_PAGE')
      // second arg false: name prompt + save only, no edit-form coupling
      const finalName = await this.props.renameVisionImage(res.fileName, false)
      if (finalName) this.insertFinderSnippet('image', finalName, 'Image', onDesktop)
    } catch (e) {
      message.error(`Select image: ${(e && e.message) || e}`, 2.5)
    } finally {
      if (this.state.captureCountdown != null) this.setState({ captureCountdown: null })
    }
  }

  // Both surfaces size the editor in pixels (see measureIde /
  // measureSidePanel). CodeMirror caches its layout measurements and only recomputes them on
  // refresh(). Everything that changes the editor's box behind its back leaves
  // those numbers stale: switching side panel tabs (it is laid out while
  // hidden, so it measures zero), dragging the panel wider, the run panel or
  // the unsaved bar appearing. The most visible symptom is the GUTTER — its
  // horizontal offset is derived from the cached width, so once the content
  // scrolls sideways the gutter stops tracking and sits on top of the code as
  // a grey bar. Coalesced into one frame: measure() can fire several times per
  // update and refresh() relayouts the whole document.
  refreshEditor = () => {
    if (!this.editor || this.refreshRaf) return
    this.refreshRaf = requestAnimationFrame(() => {
      this.refreshRaf = null
      if (this.editor) this.editor.refresh()
    })
  }

  // did the editor's own box change since the last measure?
  boxChanged = () => {
    const w = this.rootEl ? this.rootEl.clientWidth : 0
    const h = this.rootEl ? this.rootEl.clientHeight : 0
    const changed = w !== this.lastBoxW || h !== this.lastBoxH
    this.lastBoxW = w
    this.lastBoxH = h
    return changed
  }

  measure = () => {
    const boxChanged = this.boxChanged()
    const height = this.props.ideMode ? this.measureIde() : this.measureSidePanel()
    if (height === null) return

    if (height !== this.state.height) this.setState({ height }, this.refreshEditor)
    else if (boxChanged) this.refreshEditor()
  }

  // IDE window: the editor IS the tab pane, and the tab layout has already
  // resolved that pane's height — take it directly instead of redoing the
  // holder arithmetic (the holder is one level further out and includes the
  // tab content's padding, which is what left a white band under the toolbar).
  measureIde () {
    const $pane = this.rootEl ? this.rootEl.parentElement : null
    return $pane ? Math.max(150, $pane.clientHeight) : null
  }

  // Side panel: the tab pane is content-driven, so the height has to be
  // derived — the holder minus the siblings stacked above and below the
  // editor. NOT minus .script-toolbar: that toolbar lives INSIDE the box being
  // sized, so subtracting it left a gap exactly one toolbar tall underneath.
  measureSidePanel () {
    const $holder = this.rootEl && this.rootEl.closest
      ? this.rootEl.closest('.ant-tabs-content-holder')
      : null
    if (!$holder) return null

    const $header = document.querySelector('.macro-header')
    const $runPanel = document.querySelector('.sidepanel-run-panel')
    const $devToolbar = document.querySelector('.macro-dev-toolbar')
    return Math.max(
      150,
      $holder.clientHeight -
        ($header ? $header.offsetHeight : 0) -
        ($runPanel ? $runPanel.offsetHeight : 0) -
        ($devToolbar ? $devToolbar.offsetHeight : 0)
    )
  }

  // The editor's height is DERIVED from its siblings (header, run panel, the
  // two toolbars), so it goes stale whenever one of them changes size without
  // a React update: the run panel growing as logs arrive, or shrinking when a
  // run ends. Too tall and the editor overflows; too short and the container
  // is left with a band of empty space under the dev toolbar. Watching the
  // siblings is the only way to catch a CSS-driven resize.
  observeLayout () {
    if (typeof ResizeObserver === 'undefined' || this.resizeObserver) return

    this.resizeObserver = new ResizeObserver(() => this.measure())

    const targets = [
      this.rootEl && this.rootEl.closest ? this.rootEl.closest('.ant-tabs-content-holder') : null,
      // IDE window: the pane is what measureIde reads, and it also resizes on
      // its own when the log panel below is folded/unfolded
      this.props.ideMode && this.rootEl ? this.rootEl.parentElement : null,
      document.querySelector('.macro-header'),
      document.querySelector('.sidepanel-run-panel'),
      document.querySelector('.macro-dev-toolbar')
    ]
    targets.forEach(el => { if (el) this.resizeObserver.observe(el) })
  }

  componentDidMount () {
    this.measure()
    // first layout pass: the container is usually still settling when the
    // editor mounts, so its initial measurements are taken against the wrong box
    this.refreshEditor()
    this.observeLayout()
    window.addEventListener('resize', this.measure)
    this.unsubscribes = [
      onScriptEvent('line', this.onLine),
      onScriptEvent('status', this.onStatus),
      onScriptEvent('done', this.onDone)
    ]

    // empty Untitled state: seed the starter script into editing.script so
    // the main Play button has something to run before the first keystroke
    const { editing } = this.props
    if (
      !this.getSrc() &&
      typeof editing.script !== 'string' &&
      (!editing.commands || editing.commands.length === 0)
    ) {
      this.props.updateEditingScript(this.getText())
    }

    // a fresh mount can arrive WITH a pending reveal (jump from the Logs tab
    // mounts the Macro tab's editor in the same beat)
    this.maybeReveal()
  }

  componentDidUpdate (prevProps) {
    if (this.editor && !this.state.running) {
      const prevSrc = prevProps.editing && prevProps.editing.meta && prevProps.editing.meta.src
      const src = this.getSrc()
      const prevId = prevSrc && prevSrc.id
      const id = src && src.id

      if (prevId !== id) {
        // switching to another macro: load that macro's script
        this.text = null
        const text = this.getText()
        if (this.editor.getValue() !== text) {
          this.editor.setValue(text)
        }
      } else {
        // same macro, script changed elsewhere (e.g. the AI chat's set_macro,
        // or the recorder appending uiv.* lines): mirror it. After local
        // typing redux equals the editor text, so this only fires for
        // genuinely external updates.
        const script = this.getReduxScript()
        const cur = this.editor.getValue()
        if (script !== null && cur !== script) {
          this.text = script
          if (script.length > cur.length && script.slice(0, cur.length) === cur) {
            // pure append (recorded lines arrive one by one): add the tail and
            // show it, instead of setValue's full replace + cursor/scroll reset
            const end = this.editor.posFromIndex(cur.length)
            this.editor.replaceRange(script.slice(cur.length), end)
            this.editor.scrollIntoView(this.editor.posFromIndex(script.length))
          } else {
            this.editor.setValue(script)
          }
        }
      }
    }

    // a locator picked with the Select button arrived from the inspector
    const prevPick = prevProps.pickedLocator
    const pick = this.props.pickedLocator
    if (pick && pick.target && (!prevPick || prevPick.at !== pick.at)) {
      this.insertPickedLocator(pick.target)
    }

    // the toolbar height changes when the unsaved bar (dis)appears — re-derive
    // the available editor height (setState inside is change-guarded)
    this.measure()

    // the run panel and dev toolbar come and go with dev mode and with script
    // runs; re-point the observer at whatever exists now
    this.reobserveLayout()

    this.maybeReveal()
  }

  reobserveLayout () {
    if (!this.resizeObserver) return this.observeLayout()
    this.resizeObserver.disconnect()
    this.resizeObserver = null
    this.observeLayout()
  }

  componentWillUnmount () {
    this.cancelPendingLine()
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (this.refreshRaf) cancelAnimationFrame(this.refreshRaf)
    window.removeEventListener('resize', this.measure)
    if (this.editor) {
      try {
        this.editor.getWrapperElement().removeEventListener('contextmenu', this.onContextMenu)
      } catch (e) { /* editor already gone */ }
    }
    this.unsubscribes.forEach(fn => fn())
    this.unsubscribes = []
  }

  // Only the IDLE hint lives here. Run state — "running", and the auto-wait
  // countdown that used to sit in this row — belongs to the status bar, which
  // is where the user already looks and which has room to wrap it. Printing it
  // in both places meant the same sentence twice on a narrow panel.
  renderStatusHint () {
    if (this.state.scriptStatus === 'paused') {
      return 'Paused — resume or stop with the play controls'
    }
    if (this.state.running) return ''
    return "JavaScript - type 'uiv.' for the command list"
  }

  toggleTools = () => {
    this.setState({ toolsOpen: !this.state.toolsOpen })
  }

  // cursor moved: when the line names a vision image ('button.png'), load
  // its thumbnail for the tools drawer — the JS-view counterpart of the
  // table's image hover preview
  onCursorActivity = (cm) => {
    const line = cm.getLine(cm.getCursor().line) || ''

    // Which scope would Find use on THIS line? Find reads the line, not the
    // app's Vision scope, so the answer changes as the cursor moves — and the
    // badge on the button is where it becomes visible BEFORE clicking. null
    // when the line holds no finder at all, and the badge disappears.
    const found = resolveFinderOnLine(line, () => cm.getValue())
    const lineScope = found ? (found.opts.scope || 'browser') : null
    if (lineScope !== this.state.lineScope) this.setState({ lineScope })

    // ...and WHAT it finds, for the button label. target null = an identifier
    // the script does not resolve — the label shows the variable name and the
    // click asks for the value. minScore rides along so the Find Image label
    // can show the confidence the probe will use.
    const lineFinder = found
      ? {
          kind: found.kind,
          target: found.target != null ? String(found.target) : null,
          targetVar: found.targetVar || null,
          minScore: found.opts && found.opts.minScore != null ? found.opts.minScore : null
        }
      : null
    const prevFinder = this.state.lineFinder
    const finderKey = (f) => f ? `${f.kind}|${f.target}|${f.targetVar}|${f.minScore}` : ''
    if (finderKey(lineFinder) !== finderKey(prevFinder)) {
      this.setState({ lineFinder })
    }

    const m = /['"]([^'"]*\.png)['"]/i.exec(line)
    const file = m ? m[1].split('@')[0] : null

    if (file === this._lastPreviewFile) return
    this._lastPreviewFile = file

    if (!file) {
      if (this.state.imagePreviewUrl) this.setState({ imagePreviewUrl: null, imagePreviewName: null })
      return
    }

    const visionStorage = getStorageManager().getVisionStorage()
    visionStorage.exists(file)
      .then((existed) => (existed ? visionStorage.getLink(file) : './img/not_found.png'))
      .then((url) => {
        // ignore stale async results after the cursor moved on
        if (this._lastPreviewFile === file) {
          this.setState({ imagePreviewUrl: url, imagePreviewName: file })
        }
      })
      .catch(() => {
        if (this._lastPreviewFile === file) {
          this.setState({ imagePreviewUrl: null, imagePreviewName: null })
        }
      })
  }

  // clicking the thumbnail preview jumps to the image's listing in the
  // Visual tab — the JS-view counterpart of the table's "Jump to image"
  jumpToVisualTab (file) {
    // the list may never have been fetched on this surface yet
    this.props.listVisions()

    if (this.props.ideMode) {
      // IDE window: the Visual list lives in the bottom panel, whose active
      // tab is component-local state — switch it through the tab element,
      // the same way the table's "Jump to image" does. Unfold first: a click
      // on a folded panel would land on a hidden pane.
      this.props.updateConfig({ showBottomArea: true })
      const $tab = Array.from(document.querySelectorAll('.logs-screenshots .ant-tabs-tab'))
        .find(el => el.innerText.indexOf('Visual') !== -1)
      if ($tab) $tab.click()
    } else {
      // side panel: Data tab > Visual sub-tab, both in redux
      this.props.updateUI({ sidebarTab: 'Logs', dataTab: 'Vision' })
    }

    // the list renders asynchronously (tab mount + storage fetch), so poll
    // briefly for the row before giving up
    const tryScroll = (attempt) => {
      const $row = document.getElementById(file)
      if ($row) {
        $row.scrollIntoView({ block: 'center', behavior: 'smooth' })
      } else if (attempt < 8) {
        setTimeout(() => tryScroll(attempt + 1), 250)
      } else {
        message.info(`'${file}' is not in the Visual list`, 2.5)
      }
    }
    setTimeout(() => tryScroll(0), 200)
  }

  // dev-mode drawer with the script helpers — same collapsed-header pattern
  // as the table's command editor / Logs & Variables panels
  renderToolsDrawer () {
    const { running, finding, toolsOpen, lineScope, captureCountdown } = this.state
    const busy = running || finding || captureCountdown != null
    // the Image tool captures wherever the app's Vision scope points, so the
    // button has to say which — a screen grab and a page grab look identical
    // until the crop comes back showing the wrong thing
    const onDesktopScope = isCVTypeForDesktop(this.props.config.cvScope)

    // Find says WHAT it would test on the cursor's line — "Find" alone made
    // the user check the line first; the label does that reading for them.
    // An unresolved variable target shows as (name?) and prompts on click.
    const trunc = (s) => (s && s.length > 10 ? s.slice(0, 10) + '…' : s)
    const lf = this.state.lineFinder
    const lfShown = lf ? (lf.target != null ? trunc(lf.target) : `${trunc(lf.targetVar || '?')}?`) : ''
    // the confidence the probe will use: the line's own minScore, else the
    // configured default — shown on the label so a miss at a strict
    // threshold explains itself
    const lfScore = lf && lf.kind === 'imageSearch'
      ? (lf.minScore != null ? lf.minScore : (this.props.config.defaultVisionSearchConfidence || 0.6))
      : null
    const findLabel = !lf ? 'Find'
      : lf.kind === 'elementSearch' ? `Find Element (${lfShown})`
      : lf.kind === 'imageSearch' ? `Find Image @${lfScore}`
      : lf.kind === 'textSearch' ? `Find Text (${lfShown})`
      : lf.kind === 'ai' ? `Find ai.find (${lfShown})`
      : 'Find'

    return (
      <div className="script-tools-drawer">
        <div className="script-tools-header" onClick={this.toggleTools}>
          <span className="script-tools-title">Script tools</span>
          <Button
            size="small"
            type="text"
            title={toolsOpen ? 'Collapse' : 'Expand'}
            icon={toolsOpen ? <DownOutlined /> : <UpOutlined />}
            onClick={(e) => { e.stopPropagation(); this.toggleTools() }}
          />
        </div>
        {toolsOpen ? (
          <>
          {/* Find row — the button names what the cursor's line finds; for an
              image line the preview sits DIRECTLY NEXT to the button */}
          <div className="script-tools-row">
            {this.isPlayground() ? (
              running ? (
                <Button danger onClick={this.onClickStop}>
                  <FontAwesomeIcon icon={faStop} />
                  <span> Stop</span>
                </Button>
              ) : (
                <Button type="primary" onClick={this.onClickRun} title="Run this scratch script (the open table macro is not changed)">
                  <FontAwesomeIcon icon={faPlay} />
                  <span> Run</span>
                </Button>
              )
            ) : null}
            <Button
              disabled={busy}
              onClick={this.onClickFind}
              title={"Test the finder on the current line — the LINE decides where it looks, so {scope: 'desktop'} searches the screen and anything else the page. Browser matches flash on the page; screen matches are drawn on the desktop screenshot. An ai.find line makes one real (billed) model call."}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
              <span> {findLabel}</span>
              {scopeBadge(lineScope)}
            </Button>
            {/* The preview is a screenshot of a UI control sitting in a row of
                UI controls, so without a label it reads as one more button —
                the file name is what makes it legible as a picture OF
                something. Clicking it jumps to the image's listing in the
                Visual tab (the table view's "Jump to image", JS-view style). */}
            {this.state.imagePreviewUrl ? (
              <span
                className="script-image-preview"
                title={`${this.state.imagePreviewName} — click to show it in the Visual tab`}
                onClick={() => this.jumpToVisualTab(this.state.imagePreviewName)}
              >
                <span className="script-image-preview-label">{this.state.imagePreviewName}</span>
                <img src={this.state.imagePreviewUrl} alt={this.state.imagePreviewName || 'image'} />
              </span>
            ) : null}
          </div>
          {/* Select row */}
          <div className="script-tools-row">
            <Button
              disabled={busy}
              onClick={this.onClickSelect}
              title="Pick an ELEMENT on the page — its locator is inserted at the cursor. Always the browser: the desktop has no elements to pick, only pixels, so capture an image of it instead."
            >
              {this.props.status === C.APP_STATUS.INSPECTOR ? 'Cancel' : 'Select element'}
              {scopeBadge('browser')}
            </Button>
            {/* main click captures right away; the ... opens a small menu
                with the fixed 5-second countdown option (shown live on the
                button). The menu is a PLAIN DIV inside the drawer — the
                antd Dropdown popup silently never appeared in the docked
                side panel, with the defaults AND with explicit
                trigger/placement/zIndex, so: no popup machinery at all. */}
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Button
                disabled={busy}
                onClick={this.onClickSelectImage}
                title={onDesktopScope
                  ? 'Vision scope is DESKTOP: drag a rectangle on the SCREEN — the crop is saved and a desktop-scoped imageSearch for it is inserted at the cursor'
                  : 'Vision scope is BROWSER: drag a rectangle on the page — the crop is saved and an imageSearch for it is inserted at the cursor'}
              >
                <FontAwesomeIcon icon={faImage} />
                <span> {captureCountdown != null ? `Capturing in ${captureCountdown}…` : 'Select image'}</span>
                {captureCountdown == null ? scopeBadge(onDesktopScope ? 'desktop' : 'browser') : null}
              </Button>
              <Button
                disabled={busy}
                style={{ marginLeft: -1, paddingLeft: 8, paddingRight: 8 }}
                onClick={() => this.setState({ captureMenuOpen: !this.state.captureMenuOpen })}
                title="Timed capture options"
              >
                <FontAwesomeIcon icon={faStopwatch} />
              </Button>
              {this.state.captureMenuOpen ? (
                <div className="script-capture-menu" onClick={() => this.setState({ captureMenuOpen: false })}>
                  <div className="script-capture-menu-item" onClick={this.onClickSelectImageDelayed}>
                    Capture after 5 s countdown (time to switch windows)
                  </div>
                </div>
              ) : null}
            </span>
          </div>
          </>
        ) : null}
      </div>
    )
  }

  // docked bar below the code: save actions + run status. The script helper
  // buttons live in the dev-mode drawer above it; demo scripts live in the
  // tree's Demos folder (the Examples dropdown is gone).
  renderToolbar () {
    const { running } = this.state
    const src = this.getSrc()
    const showUnsavedBar = !!(src && src.id && this.props.hasUnsaved && !running)
    // Untitled script: offer saving it as a real .js macro file once there
    // is content (hasUnsavedMacro never covers the Untitled state)
    const showSaveAs = !src && this.isReduxBacked() && !running

    return (
      <div className="script-toolbar">
        {showUnsavedBar ? (
          <div className="script-unsaved-bar">
            <span className="unsaved-note">Unsaved changes</span>
            <span className="unsaved-actions">
              <Button size="small" type="primary" onClick={this.onClickSave}>
                Save
              </Button>
              <Button size="small" title="Discard the unsaved changes" onClick={this.onClickCancelEdits}>
                Cancel
              </Button>
            </span>
          </div>
        ) : null}
        {/* IDE window: always available (it is the power surface);
            side panel: dev mode only */}
        {this.props.ideMode || this.props.devMode ? this.renderToolsDrawer() : null}
        <div className="script-status-row">
          {showSaveAs ? (
            <Button size="small" onClick={this.onClickSave} title="Save this script as a macro file">
              Save..
            </Button>
          ) : null}
          <span className="script-hint">{this.renderStatusHint()}</span>
        </div>
      </div>
    )
  }

  render () {
    const { running } = this.state

    return (
      <div
        className="sidepanel-script-view"
        ref={el => { this.rootEl = el }}
        style={this.state.height ? { height: this.state.height + 'px', flex: 'none' } : null}
      >
        <CodeMirror
          value={this.initialText}
          onChange={this.onChange}
          // Claim the focus area, like the JSON source view does. The macro
          // tree binds up/down on the DOCUMENT (capture phase) to step through
          // macros, guarded only by focusArea — so while it still said
          // "Sidebar" from opening the macro, every cursor up/down in this
          // editor jumped to another macro instead of moving the caret.
          onFocus={() => this.props.updateUI({ focusArea: FocusArea.CodeSource })}
          editorDidMount={(editor) => {
            this.editor = editor
            // color uiv.* calls (and flag typo'd method names)
            editor.addOverlay(uivOverlay)
            // vision-image thumbnail for the line under the cursor
            editor.on('cursorActivity', this.onCursorActivity)
            // breakpoints: click the gutter to toggle; markers travel with
            // their lines through edits, so re-sync the runner on changes
            editor.on('gutterClick', this.onGutterClick)
            editor.on('change', this.syncBreakpoints)
            // dev context menu (Run this line / from here / to here, ...)
            editor.getWrapperElement().addEventListener('contextmenu', this.onContextMenu)
            // pop the hint list while typing `uiv.` / `uiv.run('` (and keep
            // filtering as more characters arrive); completeSingle=false so a
            // single match never auto-inserts under the user's fingers
            editor.on('inputRead', (cm, change) => {
              if (cm.state.completionActive) return
              const ch = change.text[change.text.length - 1]
              if (ch !== '.' && ch !== "'" && ch !== '"' && !/[\w$]/.test(ch)) return
              const cur = cm.getCursor()
              const before = cm.getLine(cur.line).slice(0, cur.ch)
              if (/uiv\.[\w$]*$/.test(before) || /uiv\.run\(\s*['"][\w]*$/.test(before)) {
                cm.showHint({ hint: uivHint, completeSingle: false })
              }
            })
          }}
          options={{
            mode: 'javascript',
            lineNumbers: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            readOnly: running,
            // breakpoint gutter only where the dev tooling shows
            gutters: this.showDevTools()
              ? ['CodeMirror-linenumbers', 'breakpoints']
              : ['CodeMirror-linenumbers'],
            styleActiveLine: true,
            // showToken: highlight on double-click/selection of a word;
            // wordsOnly keeps punctuation selections from lighting up noise
            highlightSelectionMatches: { showToken: /\w/, wordsOnly: true },
            extraKeys: {
              'Ctrl-Space': (cm) => cm.showHint({ hint: uivHint, completeSingle: false }),
              'Ctrl-/': 'toggleComment',
              'Cmd-/': 'toggleComment'
            }
          }}
        />
        {this.renderToolbar()}
      </div>
    )
  }
}

export default connect(
  state => ({
    editing: state.editor.editing,
    status: state.status,
    pickedLocator: state.ui.scriptPickedLocator,
    revealLine: state.ui.scriptRevealLine,
    hasUnsaved: hasUnsavedMacro(state),
    devMode: !!state.config.sidebarDevMode,
    // the Vision scope + desktop-capture delay the Select image tool obeys
    config: state.config
  }),
  dispatch => bindActionCreators({ ...actions }, dispatch)
)(ScriptView)
