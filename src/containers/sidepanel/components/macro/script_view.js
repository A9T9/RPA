import { Button, Modal, message } from 'antd'
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
import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/hint/show-hint.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage } from '@fortawesome/free-regular-svg-icons/faImage'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlass'
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
import { isScriptPaused, isScriptRunning, onScriptEvent, probeFind, runScript, setScriptBreakpoints, stopScript } from '@/modules/script_runner'
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
  { text: '$(', displayText: "$('css=#buy') -> FIRST DOM match {x,y,rect,text,value,..} - all frames + shadow roots, auto-waits, throws if none" },
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
  { text: 'desktop.click(', displayText: "desktop.click(match | x, y) - real OS click in SCREEN pixels (XModule); reaches OS dialogs. Needs a desktop-scope match: uiv.findImage(f, {scope:'desktop'})" },
  { text: 'desktop.type(', displayText: 'desktop.type(text) - real OS keystrokes (XModule); works outside the browser too' },
  { text: 'desktop.move(', displayText: 'desktop.move(match | x, y) - real OS mouse-move in SCREEN pixels (XModule)' },
  { text: 'desktop.down(', displayText: 'desktop.down(match | x, y) - real OS mouse BUTTON DOWN; pair with desktop.up for a drag' },
  { text: 'desktop.up(', displayText: 'desktop.up(match | x, y) - real OS mouse BUTTON UP; the other half of a desktop.down drag' },
  { text: 'window.focus(', displayText: 'window.focus() - bring the BROWSER WINDOW to the front. A PRECONDITION for uiv.desktop.*: OS input goes to whatever window is frontmost, so call it before uiv.open in a desktop macro' },
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
  { text: 'exportToDownloads(', displayText: "exportToDownloads('x.png' | 'x.csv' | 'log') - copy a file out of Ui.Vision storage into the browser's Downloads folder. Also uiv.files.exportToDownloads" },
  { text: 'files.remove(', displayText: "files.remove('x.png' | 'x.csv' | 'x.txt') - DELETE a file from Ui.Vision storage. Takes any stored name, so it pairs with exportToDownloads: export it, then remove it" },
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
  { text: 'tabs.open(', displayText: 'tabs.open(url) - NEW tab on url, waits for load (uiv.open navigates the CURRENT tab instead); returns {index, title, url, active, current}' },
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

// Find button: extract the finder call + its literal first argument from a
// script line, e.g. `var m = uiv.findImage('buy.png')` or `uiv.page.click('css=#buy')`
// the optional tier segment matters: a tier call is uiv.page.click('css=..'),
// and the old flat pattern silently stopped matching every one of them
const FIND_RE = /uiv\.(?:(?:page|browser|desktop|ocr)\.)?(findElements|findElement|findImages|findImage|findTexts|findText|\$\$|\$|click|move)\(\s*(['"])((?:\\.|(?!\2).)*?)\2/
// The OPTIONS on the same line, for the ones that change what "find" means.
// Without these the Find button answered a different question from the script
// it is sitting in: {scope: 'desktop'} searches the SCREEN, and probing it
// against the browser viewport reported "no matches" for an image that is
// plainly there — the whole point of the button is to tell those two apart.
// minScore/engine/language matter for the same reason: a probe run at the
// default threshold or the configured OCR engine is not the call on the line.
// Same-line literals only; the target already has that constraint.
const FIND_OPT_SCOPE = /\bscope\s*:\s*(['"])(desktop|browser)\1/
const FIND_OPT_MIN_SCORE = /\bminScore\s*:\s*(\d*\.?\d+)/
const FIND_OPT_ENGINE = /\bengine\s*:\s*(['"])(\w+)\1/
const FIND_OPT_LANGUAGE = /\blanguage\s*:\s*(['"])(\w+)\1/

const parseFindOptions = (line) => {
  const opts = {}
  const scope = FIND_OPT_SCOPE.exec(line)
  if (scope) opts.scope = scope[2]
  const minScore = FIND_OPT_MIN_SCORE.exec(line)
  if (minScore) opts.minScore = Number(minScore[1])
  const engine = FIND_OPT_ENGINE.exec(line)
  if (engine) opts.engine = engine[2]
  const language = FIND_OPT_LANGUAGE.exec(line)
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

// syntax highlighting overlay: color every known uiv.* call, and mark
// unknown uiv.* names as probable typos
const KNOWN_UIV = new Set([
  ...UIV_METHODS.map(m => m.text.replace(/\(.*$/, '')),
  // the input tiers themselves — `const b = uiv.browser` is a legitimate use
  // of the bare namespace, and the overlay must not flag it as a typo
  'page', 'browser', 'desktop', 'csv', 'ocr', 'ai', 'shot',
  // the rest of the namespaces, same reason (`const t = uiv.tabs`)
  'tabs', 'window', 'text', 'clipboard',
  // not a call: the "am I the top-level macro, or included?" flag
  'main',
  // aliases kept in the polyfill (log/sleep synonyms)
  'echo', 'pause'
])

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
    lineScope: null
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
    const m = FIND_RE.exec(line)
    if (!m) {
      message.info("Put the cursor on a line with a uiv finder or click/move ('...') — the argument must be a literal string", 3.5)
      return
    }
    const kind = FIND_KIND[m[1]]
    const target = m[3].replace(/\\(.)/g, '$1')
    const opts = parseFindOptions(line)
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
  onClickSelectImage = async () => {
    if (this.state.running || this.state.finding) return
    const onDesktop = isCVTypeForDesktop(this.props.config.cvScope)
    try {
      // a desktop capture covers the whole screen INCLUDING this panel, so
      // honour the configured delay that lets the user get out of the way
      if (onDesktop && this.props.config.waitBeforeDesktopScreenCapture && this.props.config.secondsBeforeDesktopScreenCapture > 0) {
        message.info(`About to take desktop screenshot in ${this.props.config.secondsBeforeDesktopScreenCapture} seconds`)
        await delay(() => {}, this.props.config.secondsBeforeDesktopScreenCapture * 1000)
      }
      const res = onDesktop
        ? await selectAreaOnDesktop({ width: screen.availWidth, height: screen.availHeight })
        : await csIpc.ask('PANEL_SELECT_AREA_ON_CURRENT_PAGE')
      // second arg false: name prompt + save only, no edit-form coupling
      const finalName = await this.props.renameVisionImage(res.fileName, false)
      if (finalName) this.insertFinderSnippet('image', finalName, 'Image', onDesktop)
    } catch (e) {
      message.error(`Select image: ${(e && e.message) || e}`, 2.5)
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
    const lineScope = FIND_RE.test(line) ? (parseFindOptions(line).scope || 'browser') : null
    if (lineScope !== this.state.lineScope) this.setState({ lineScope })

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
    const { running, finding, toolsOpen, lineScope } = this.state
    const busy = running || finding
    // the Image tool captures wherever the app's Vision scope points, so the
    // button has to say which — a screen grab and a page grab look identical
    // until the crop comes back showing the wrong thing
    const onDesktopScope = isCVTypeForDesktop(this.props.config.cvScope)

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
              title={"Test the finder on the current line — the LINE decides where it looks, so {scope: 'desktop'} searches the screen and anything else the page. Browser matches flash on the page; screen matches are drawn on the desktop screenshot."}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
              <span> Find</span>
              {scopeBadge(lineScope)}
            </Button>
            <Button
              disabled={busy}
              onClick={this.onClickSelect}
              title="Pick an ELEMENT on the page — its locator is inserted at the cursor. Always the browser: the desktop has no elements to pick, only pixels, so capture an image of it instead."
            >
              {this.props.status === C.APP_STATUS.INSPECTOR ? 'Cancel' : 'Select'}
              {scopeBadge('browser')}
            </Button>
            <Button
              disabled={busy}
              onClick={this.onClickSelectImage}
              title={onDesktopScope
                ? 'Vision scope is DESKTOP: drag a rectangle on the SCREEN — the crop is saved and a desktop-scoped imageSearch for it is inserted at the cursor'
                : 'Vision scope is BROWSER: drag a rectangle on the page — the crop is saved and an imageSearch for it is inserted at the cursor'}
            >
              <FontAwesomeIcon icon={faImage} />
              <span> Image</span>
              {scopeBadge(onDesktopScope ? 'desktop' : 'browser')}
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
            extraKeys: {
              'Ctrl-Space': (cm) => cm.showHint({ hint: uivHint, completeSingle: false })
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
    hasUnsaved: hasUnsavedMacro(state),
    devMode: !!state.config.sidebarDevMode,
    // the Vision scope + desktop-capture delay the Select image tool obeys
    config: state.config
  }),
  dispatch => bindActionCreators({ ...actions }, dispatch)
)(ScriptView)
