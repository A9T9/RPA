import { reportUsage } from '@/services/usage'
import { startExecutionLocality, visitScriptExecutionLine, finishExecutionLocality } from '../common/execution_locality'
import { startRunFrames, setRunFrameStep, flushRunFrames, describeRunFrames } from '../common/run_frames'
import * as act from '@/actions'
import { CaptureScreenshotService } from '@/common/capture_screenshot'
import clipboard from '@/common/clipboard'
import { parseFromCSV, stringifyToCSV } from '@/common/csv'
import { isCVTypeForDesktop } from '@/common/cv_utils'
import { getStorageManager, StorageStrategyType } from '@/services/storage'
import csIpc from '@/common/ipc/ipc_cs'
import { getPlayer, Player } from '@/common/player'
import { milliSecondsToStringInSecond, safeUpdateIn, isMac as isMacOS, isWindows as isWindowsOS, isLinux as isLinuxOS } from '@/common/ts_utils'
import { getNativeFileSystemAPI } from '@/services/filesystem'
import { getNativeXYAPI } from '@/services/xy'
import { findBeaconRect } from '@/services/xy/beacon'
import semver from 'semver'
import { getXModule2API } from '@/services/xmodules2/native'
import { getVarsInstance, getDeprecatedVariable } from '@/common/variables'
import Interpreter from '@/common/vendor/js-interpreter'
import Ext from '@/common/web_extension'
import config from '@/config'
import { getState as getGlobalState, updateState } from '@/ext/common/global_state'
import { getPlayTab } from '@/ext/common/tab'
import { activateTab } from '@/common/tab_utils'
import { MacroResultStatus } from '@/services/kv_data/macro_extra_data'
// side-effect import: initializes the OCR command counter singleton that
// getOcrResponse asserts on (same pattern as initPlayer)
import { xCmdCounter } from '@/modules/counters'
import { transpileScript } from '@/modules/js_transpile'
import { installEvaluateFunctionSource } from '@/modules/evaluate_function'
import { frameMergedPosition, locateMergedLine, resolveIncludes } from '@/modules/js_includes'
import { getOcrResponse, guardOcrSettings } from '@/modules/ocr'
import { askBackgroundToRunCommand, runCsFreeCommands, getCdpInputFallbackCount } from '@/modules/run_command'
import { isCdpInputAvailable, isCdpAttached, primeCdpAttach, holdCdpAttachDuringRun, cdpEvaluate, sendCdpWheelEvent, sendCdpKeyEvent, releaseCdpKeys } from '@/services/cdp_input'
import { pickBridgeTab, setBridgeTab } from '@/common/tab_utils'
import { getLastDownloadPath, getLastDownloadInfo } from '@/common/last_download'
import { getFileBufferFromScreenshotStorage } from '@/common/ai_vision'
import { getMacroCallStack } from '@/services/player/call_stack/call_stack'
import { getMacroMonitor } from '@/services/player/monitor/macro_monitor'
import { hasUnsavedMacro } from '@/recomputed'
import { store } from '@/redux'
import { searchVision } from '@/search_vision'
import { ocrLanguageTag, ocrMatchRect, searchTextInOCRResponse } from '@/services/ocr'
import { OcrHighlightType } from '@/services/ocr/types'
import { delayMs, setIn, dataURItoBlob, ensureExtName, cloneSerializableLocalStorage } from '@/common/utils'
import { subImage } from '@/common/dom_utils'
import * as C from '@/common/constant'
import { DesktopScreenshot } from '@/desktop_screenshot_editor/types'
import { captureImage, withDesktopCaptureCover } from '@/modules/helper'
import { getDesktopCaptureHint } from '@/services/desktop_dip'
import { showDesktopBorder, hideDesktopBorder, showDesktopMatchMarksDip, showDesktopSearchArea, desktopOverlayCaptureVisible } from '@/services/desktop_border'
import { xmoduleOutdatedWarning } from '@/services/xmodules2/routing'
import getSaveTestCase from '@/components/save_test_case'
import { ensureDesktopApp, getDesktopAppClient } from '@/services/desktop_app'
import { macroCallName, standaloneDesktopCall } from '@/services/desktop_app/call_contract'
import { scriptLocator } from '@/common/script_locator'
import { measureCallViewport, callViewportUnchanged } from '@/services/desktop_app/call_viewport'

// Runner for JS script macros (V11 experiment, branch js-macro-test1).
//
// API design ("framework, not transliterated commands"): the script — plain
// ES5 running in the vendored JS-Interpreter — gets a SMALL set of
// primitives. Three finders share one geometry contract (arrays of
// { x, y, rect, ... } in viewport CSS pixels, auto-waiting, throwing on
// timeout), one trusted input layer consumes it, plus page eval/open and a
// legacy bridge to every classic command:
//
//   find:  uiv.elementSearch(locator, opts)   DOM
//          uiv.imageSearch(image, opts)       computer vision
//          uiv.textSearch(text, opts)         OCR
//   act:   one namespace per INPUT TIER, because how the input reaches the
//          page is the thing that decides whether it works:
//            uiv.page.click/type/select      content script, synthetic events
//            uiv.browser.click/type/move    CDP, trusted, no XModule
//            uiv.desktop.mouse.click/type/move    XModule, real OS input
//   page:  uiv.goto(url), uiv.evaluate(pageFunction, arg) / uiv.evaluate(code)
//   misc:  uiv.log, uiv.sleep, uiv.getVar, uiv.setVar, uiv.prompt (later)
//   legacy bridge: uiv.run(cmd, target, value) — any classic command
//
// All uiv calls look synchronous inside the script (the interpreter suspends
// until the bridge resolves); results cross the bridge as JSON strings to
// avoid pseudo-object conversion edge cases. The step loop yields constantly,
// which is what makes Stop reliable and line highlighting possible.

// ---------------------------------------------------------------------------
// interpreter-side polyfill: turns bridge results into return values and
// real JS exceptions (so try/catch works around any uiv call)
// ---------------------------------------------------------------------------
// Precomputed NFD decompositions for the sandbox's String.normalize polyfill:
// Latin-1 Supplement + Latin Extended-A/B, Greek with tonos, Cyrillic, and
// Latin Extended Additional — the slice macro code folds in practice
// (accent-stripping via .normalize('NFD').replace(/[\u0300-\u036f]/g, '')).
// Built with the engine's own normalize so the data cannot drift, and
// emitted as ONE line so POLYFILL_LINES stays honest.
const NFD_TABLE_JSON = JSON.stringify((() => {
  const t = {}
  for (const [lo, hi] of [[0x00C0, 0x024F], [0x0386, 0x03CE], [0x0400, 0x045F], [0x1E00, 0x1EFF]]) {
    for (let c = lo; c <= hi; c++) {
      const s = String.fromCharCode(c)
      const d = s.normalize('NFD')
      if (d !== s) t[s] = d
    }
  }
  return t
})())

// Exported because the script editor's syntax overlay derives the set of real
// uiv.* names from it (script_view.js) — a hand-kept copy of the API there
// went stale the moment uiv.files shipped.
export const POLYFILL = `var uiv = {};
// true for the file being run. With @include, the resolver re-stamps the flag
// per segment (false before included parts, true before the main body) — but a
// script WITHOUT includes never went through that injection, so without this
// default a standalone "if (uiv.main)" self-test silently skipped (real bug).
uiv.main = true;
uiv.__bridge = function (op, args) {
  var r = __uiv_bridge(op, JSON.stringify(args === undefined ? {} : args));
  if (!r.ok) { throw new Error(r.error); }
  if (r.value === undefined || r.value === null) { return undefined; }
  return JSON.parse(r.value);
};
uiv.__opts = function (base, opts) {
  if (opts) { for (var k in opts) { base[k] = opts[k]; } }
  return base;
};
uiv.__xy = function (x, y, fn) {
  var frameId = 0
  var frameLocal = false
  var scope = ''
  var tag = ''
  var elementId = null
  var elementSignature = null
  // A finder given {required: false} reports a miss as null. Acting on that
  // null is the single most common way to misuse the option, and the generic
  // "need finite (x, y)" below points at the ACTION, not at the missing check —
  // so name the real mistake here, with the fix.
  if (x === null || x === undefined) {
    throw new Error(fn + ": the finder found no match, so there is nothing to act on. {required: false} makes a miss return null INSTEAD of throwing, which means the result has to be CHECKED: var m = uiv.findImage('file.png', {required: false, timeout: 2}); if (m) { " + fn + "(m); }");
  }
  var offscreen = false
  var find = null
  var findIndex = 0
  var findOffset = null
  if (x !== null && typeof x === 'object') {
    frameId = x.frameId || 0
    frameLocal = !!x.frameLocal
    scope = x.scope || ''
    tag = x.tag || ''
    elementId = x.elementId || null
    elementSignature = x.elementSignature || null
    offscreen = !!x.offscreen
    if (typeof x.__f === 'number' && uiv.__finds[x.__f]) {
      find = uiv.__finds[x.__f]; findIndex = x.__i || 0;
      // a uiv.offset() point: the re-find lands on the ANCHOR, so the offset
      // has to be re-applied to the fresh position
      if (x.__dx || x.__dy) { findOffset = { dx: x.__dx || 0, dy: x.__dy || 0 }; }
    }
    y = x.y
    x = x.x
  }
  if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) { throw new Error(fn + ': need finite (x, y) numbers or a match object from a finder'); }
  // tag travels with the point so DOM clicks can detect a stale target.
  // offscreen marks a match the finder could NOT scroll into the viewport
  // (position:fixed container larger than the window) - the DOM point
  // actions refuse it with the real reason instead of clicking blind.
  var r = { x: x, y: y, frameId: frameId, frameLocal: frameLocal, scope: scope, tag: tag, elementId: elementId, elementSignature: elementSignature };
  if (offscreen) { r.offscreen = true; }
  if (find) {
    r.find = find; r.findIndex = findIndex;
    if (findOffset) { r.findOffset = findOffset; }
  }
  return r;
};
uiv.goto = function (url) { return uiv.__bridge('open', { url: String(url) }); };
uiv.evaluate = function (pageFunction, arg) {
  if (arguments.length > 2 || (typeof pageFunction !== 'function' && typeof pageFunction !== 'string')) {
    throw new Error("uiv.evaluate in this macro runtime accepts a script string or a page function with one optional data argument: uiv.evaluate(selector => document.querySelector(selector).textContent, '#title'). Pass multiple values in one object or array. Macro calls remain sequential; do not add async/await.");
  }
  if (typeof pageFunction === 'string') {
    if (arguments.length > 1) throw new Error("uiv.evaluate script strings do not accept a second argument. Use uiv.evaluate(data => document.querySelector(data.selector).textContent, {selector: '#title'}) to pass data, or uiv.evaluate('return document.title') without an argument.");
    return uiv.__bridge('eval', { code: pageFunction });
  }
  var source = __uiv_evaluate_source(pageFunction);
  if (!source.ok) throw new Error(source.error);
  var seen = [];
  function validate(value) {
    var type = typeof value;
    if (value === null || type === 'string' || type === 'boolean' || (type === 'number' && isFinite(value))) return;
    if (type !== 'object' || seen.indexOf(value) !== -1 ||
        (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
      throw new Error("uiv.evaluate data must be JSON-compatible: null, strings, booleans, finite numbers, arrays or plain objects, without cycles, functions or nested undefined. Convert other values explicitly before passing them; DOM handles are not supported. Only the whole argument may be undefined or omitted.");
    }
    seen.push(value);
    if (Array.isArray(value)) { for (var i = 0; i < value.length; i++) validate(value[i]); }
    else { var keys = Object.keys(value); for (var j = 0; j < keys.length; j++) validate(value[keys[j]]); }
    seen.pop();
  }
  if (arg !== undefined) validate(arg);
  var argumentCode = arg === undefined ? 'void 0' : 'JSON.parse(' + JSON.stringify(JSON.stringify(arg)) + ')';
  try {
    return uiv.__bridge('eval', { code: 'return (' + source.source + ')(' + argumentCode + ');', pageFunction: true });
  } catch (e) {
    throw new Error('uiv.evaluate page function failed: ' + e.message + '. The function runs in the page; macro variables and uiv are unavailable there. Pass data explicitly: uiv.evaluate(data => data.text, {text: "hello"}).');
  }
};
// FINDERS. Singular returns ONE match (or null with {required:false}),
// plural returns an ARRAY — the name's number is the return's number.
//   uiv.$ / uiv.$$                        DOM, by locator
//   uiv.findImage / uiv.findImages        pixels, by picture
//   uiv.ocr.findText / uiv.ocr.findTexts  pixels, by rendered text (OCR)
// Naming rule: UNMARKED finders are exact (uiv.$, uiv.findImage — pixels
// either match or they don't); NAMESPACED finders carry their engine's
// caveats with them — uiv.ocr.* is fuzzy (misreads, wildcards, the quality
// rules of uiv.ocr.read, which runs the same engine), uiv.ai.find is
// billable. ocr.findText is a FINDER, not a reader: it answers "where is
// this text?" and returns coordinates. Turning pixels into text — "what does
// this say?" — is uiv.ocr.read(), which is what OCR actually means.
// Both VISUAL finders take {area: match | rect}: search ONE REGION instead of
// the whole viewport/screen — faster, and N identical widgets stop mattering
// when the search happens inside the right one's rect. Same shapes as
// uiv.ocr.read({area}); a bare rect is read in the finder's scope, a match
// from the OTHER scope is rejected (viewport px are not screen px).
// uiv.ocr.findText(s) also takes {image: 'x.png'} like uiv.ocr.read: search a
// STORED image instead of the live viewport/screen. Matches are in IMAGE
// pixels (scope 'image', not clickable), {area} then crops in image pixels,
// and there is no auto-wait — a stored image cannot change.
// The DOM finder also takes CONTENT wait-conditions: {hasText: true} retries
// until a match's text/value is NON-EMPTY, {hasText: 'substring'} until it
// contains the substring (case-insensitive), {textMatches: 'regex' | /re/}
// until it matches the regex. Matches are SNAPSHOTS — copies taken at find
// time, never live handles — so these options are THE way to wait for text
// to appear; re-reading a stored match in a loop polls frozen data forever.
// A DOM match also carries the element's attributes: m.getAttribute('href')
// reads them Selenium-style (find-time copy, like .text/.value — null when
// the attribute is absent), and m.attributes is the whole map.
uiv.__getAttr = function (name) {
  if (typeof name !== 'string' || !name) { throw new Error("getAttribute: needs an attribute name, e.g. m.getAttribute('href')"); }
  var a = this.attributes || {};
  if (a[name] !== undefined) { return a[name]; }
  // HTML attribute names are lowercase in the DOM however the page spelled
  // them; SVG ones (viewBox) are case-sensitive, hence exact-first
  var lower = name.toLowerCase();
  return a[lower] !== undefined ? a[lower] : null;
};
uiv.findElements = function (locator, opts) {
  var o = uiv.__opts({ locator: String(locator) }, opts);
  // a RegExp cannot cross the JSON bridge (it stringifies to {}) — send its parts
  if (o.textMatches && typeof o.textMatches === 'object' && o.textMatches.source !== undefined) {
    o.textMatches = {
      source: String(o.textMatches.source),
      flags: o.textMatches.flags !== undefined ? String(o.textMatches.flags) : ((o.textMatches.ignoreCase ? 'i' : '') + (o.textMatches.multiline ? 'm' : ''))
    };
  }
  var matches = uiv.__bridge('elementSearch', o);
  // remember the find call behind each match (registry id, not the spec
  // itself, so variable dumps stay readable): uiv.browser.click re-runs it
  // right before the CDP dispatch and clicks the element's CURRENT position
  var fid = uiv.__finds.push(o) - 1;
  for (var i = 0; i < matches.length; i++) { matches[i].getAttribute = uiv.__getAttr; matches[i].__f = fid; matches[i].__i = i; uiv.__domMethods(matches[i]); }
  return matches;
};
// Playwright's locator methods on a DOM match (find-time copies, like .text
// and .value): innerText(), textContent(), inputValue(), isVisible(),
// isChecked(), isEnabled(). The universal fields stay .text/.value/.rect on
// EVERY match — an OCR or image match (browser or desktop) has no DOM, so
// there these methods say so instead of "not a function".
uiv.__domMethods = function (m) {
  m.innerText = function () { return m.text || ''; };
  m.textContent = function () { return m.text || ''; };
  m.inputValue = function () {
    if (m.value === undefined || m.value === null) { throw new Error('inputValue(): this ' + (m.tag || 'element') + ' is not an input, textarea or select — read .text (innerText()) instead'); }
    return String(m.value);
  };
  m.scrollIntoViewIfNeeded = function (opts) { return uiv.page.scrollIntoViewIfNeeded(m, opts); };
  m.isVisible = function () { return m.visible !== false; };
  m.isEnabled = function () { return !m.disabled; };
  m.isChecked = function () {
    if (m.checked === undefined) { throw new Error("isChecked(): this " + (m.tag || 'element') + " is not a checkbox or radio button, and no checkbox belongs to it (a <label> resolves to its box, a wrapper to the single box inside it) - find the input itself, e.g. uiv.$('css=input[type=checkbox]')"); }
    return !!m.checked;
  };
  return m;
};
uiv.__nonDomMethods = function (list, kind) {
  var names = ['innerText', 'textContent', 'inputValue', 'isVisible', 'isChecked', 'isEnabled', 'scrollIntoViewIfNeeded'];
  for (var i = 0; i < list.length; i++) {
    (function (m) {
      for (var n = 0; n < names.length; n++) {
        (function (name) {
          m[name] = function () { throw new Error(name + '() is a DOM method — this is ' + kind + ' match' + (m.scope === 'desktop' ? ' on the desktop' : '') + ', it has no DOM: use .text' + (kind === 'an OCR' ? ' (the recognised words)' : '') + ', .rect and .x/.y, or uiv.ocr.read / uiv.ai.ask to read what is there'); };
        })(names[n]);
      }
    })(list[i]);
  }
  return list;
};
uiv.__finds = [];
// Visual finders remember their call too (same registry as the DOM finder):
// a BROWSER match was measured on a screenshot, and the first trusted CDP
// click after it attaches the debugger, whose infobar shrinks the viewport —
// uiv.browser.* re-run the finder when that happened (settleVisualPointForCdp)
uiv.__visualFind = function (op, spec, kind) {
  var ms = uiv.__nonDomMethods(uiv.__bridge(op, spec), kind);
  var fid = uiv.__finds.push({ __visual: op, spec: spec }) - 1;
  for (var i = 0; i < ms.length; i++) { if (ms[i] && ms[i].scope === 'browser') { ms[i].__f = fid; ms[i].__i = i; } }
  return ms;
};
uiv.findImages = function (image, opts) { return uiv.__visualFind('imageSearch', uiv.__opts({ image: String(image) }, opts), 'an image'); };
uiv.ocr = {};
uiv.ocr.findTexts = function (text, opts) { return uiv.__visualFind('textSearch', uiv.__opts({ text: String(text) }, opts), 'an OCR'); };
uiv.__first = function (arr) { return arr.length ? arr[0] : null; };

// Act at a fixed offset FROM a match — what the classic *Relative commands
// spell as "word#R8,-14". The offset is measured from the match's POINT, which
// is its centre, so every offset a table macro used carries over unchanged.
//
//   uiv.browser.click(uiv.offset(uiv.ocr.findText('mc'), 8, -14));
//
// It returns a MATCH, not bare numbers, so scope / frameId / frameLocal travel
// with it: uiv.browser.click(m.x + 8, m.y - 14) would silently drop the scope
// tag and defeat the guard that stops viewport pixels being used as screen
// pixels.
uiv.offset = function (match, dx, dy) {
  if (match === null || typeof match !== 'object') {
    throw new Error("uiv.offset: needs a match from a finder, e.g. uiv.offset(uiv.ocr.findText('Total'), 8, -14)");
  }
  if (typeof dx !== 'number' || typeof dy !== 'number' || !isFinite(dx) || !isFinite(dy)) {
    throw new Error('uiv.offset: dx and dy must be numbers of pixels');
  }
  var out = {};
  for (var k in match) { out[k] = match[k]; }
  out.x = match.x + dx;
  out.y = match.y + dy;
  // the finder recipe (__f/__i) travels with the point so the click can re-run
  // the finder — and then it must re-apply THIS offset, or a re-found anchor
  // would be clicked instead of the target beside it
  out.__dx = (match.__dx || 0) + dx;
  out.__dy = (match.__dy || 0) + dy;
  // the rect moves WITH the point - an offset match is the whole match
  // shifted, so uiv.shot.area / uiv.ocr.read({area}) crop where the offset
  // points, not where the anchor was
  if (match.rect) {
    out.rect = { left: match.rect.left + dx, top: match.rect.top + dy, width: match.rect.width, height: match.rect.height };
  }
  // provenance ping for the post-run picture: anchor -> landing. A wrong
  // dx/dy is otherwise invisible until the click that uses the result.
  uiv.__bridge('offsetTrace', { ax: match.x, ay: match.y, x: out.x, y: out.y, scope: match.scope || '' });
  return out;
};
uiv.$ = function (locator, opts) { return uiv.__first(uiv.findElements(locator, opts)); };
uiv.$$ = uiv.findElements;
// Finders by ACCESSIBLE NAME, named like Playwright's (OPEN-ISSUES 30.18):
// what browser_snapshot's tree prints — 'button "Rechnung erstellen"', 'textbox
// "Unternehmen/Institution"' — is directly usable, and survives the
// re-renders that renumber refs. Each returns the FIRST match (like uiv.$);
// {all: true} returns every match; {exact: true} = whole-string, case-
// sensitive (default: case-insensitive substring, Playwright's default);
// timeout/required/includeHidden as for uiv.$. The match is a locator too:
// uiv.page.click(uiv.getByRole('button', {name: 'Speichern'})).
uiv.by = function (kind, spec) { return 'by=' + JSON.stringify(Object.assign({ kind: kind }, spec)); };
uiv.__getBy = function (kind, spec, opts) {
  opts = opts || {};
  var loc = uiv.by(kind, Object.assign(spec, { exact: !!opts.exact }));
  var o = {}; for (var k in opts) { if (k !== 'exact' && k !== 'all' && k !== 'name') o[k] = opts[k]; }
  var list = uiv.findElements(loc, o);
  return opts.all ? list : uiv.__first(list);
};
uiv.getByLabel = function (text, opts) { return uiv.__getBy('label', { text: String(text) }, opts); };
uiv.getByRole = function (role, opts) { opts = opts || {}; return uiv.__getBy('role', { role: String(role), name: opts.name != null ? String(opts.name) : undefined }, opts); };
uiv.getByText = function (text, opts) { return uiv.__getBy('text', { text: String(text) }, opts); };
uiv.getByPlaceholder = function (text, opts) { return uiv.__getBy('placeholder', { text: String(text) }, opts); };
uiv.getByTitle = function (text, opts) { return uiv.__getBy('title', { text: String(text) }, opts); };
uiv.getByAltText = function (text, opts) { return uiv.__getBy('alt', { text: String(text) }, opts); };
uiv.getByTestId = function (id, opts) { return uiv.__getBy('testid', { text: String(id) }, Object.assign({ exact: true }, opts || {})); };
// Playwright's verbs for verbs that already exist (same feature, same name —
// resolved at call time, so the order of definition does not matter):
//   goto -> open, evaluate -> eval, page.fill -> page.type (SETS the value),
//   page.selectOption -> page.select, browser.hover -> browser.move,
//   browser.press('Control+S') / desktop.press -> type with the KEY_ names
// the older spellings stay as aliases of the Playwright-named originals
uiv.__pressKeys = function (combo) {
  var parts = String(combo).split('+');
  var mods = [], key = parts.length ? parts[parts.length - 1] : '';
  if (parts.length > 1 && key === '') { key = '+'; parts.pop(); }
  for (var i = 0; i < parts.length - 1; i++) {
    var m = parts[i].toLowerCase();
    mods.push(m === 'control' || m === 'ctrl' ? 'KEY_CTRL' : m === 'shift' ? 'KEY_SHIFT' : m === 'alt' ? 'KEY_ALT' : (m === 'meta' || m === 'command' || m === 'cmd') ? 'KEY_META' : 'KEY_' + parts[i].toUpperCase());
  }
  var names = { enter: 'KEY_ENTER', return: 'KEY_ENTER', tab: 'KEY_TAB', escape: 'KEY_ESC', esc: 'KEY_ESC', backspace: 'KEY_BACKSPACE', delete: 'KEY_DELETE', del: 'KEY_DELETE',
    arrowup: 'KEY_UP', arrowdown: 'KEY_DOWN', arrowleft: 'KEY_LEFT', arrowright: 'KEY_RIGHT', up: 'KEY_UP', down: 'KEY_DOWN', left: 'KEY_LEFT', right: 'KEY_RIGHT',
    home: 'KEY_HOME', end: 'KEY_END', pageup: 'KEY_PAGE_UP', pagedown: 'KEY_PAGE_DOWN', space: 'KEY_SPACE' };
  var k = key.toLowerCase();
  var name = names[k] || (/^f([1-9]|1[0-5])$/.test(k) ? 'KEY_' + k.toUpperCase() : null);
  if (name) return mods.length ? '\${' + mods.join('+') + '+' + name + '}' : '\${' + name + '}';
  if (key.length === 1) return mods.length ? '\${' + mods.join('+') + '+' + (/[A-Za-z]/.test(key) ? key.toLowerCase() : key) + '}' : key;
  throw new Error("press: unknown key '" + key + "' — Playwright key names (Enter, Tab, Escape, ArrowDown, Control+S, F5) or a single character");
};
uiv.findElement = uiv.$;
// findImages returns READING order (click-the-3rd semantics); the singular
// finder still acts on the BEST match, which the plural list flags
uiv.findImage = function (image, opts) {
  var ms = uiv.findImages(image, opts);
  if (ms && ms.length) { for (var i = 0; i < ms.length; i++) { if (ms[i].best) return ms[i]; } }
  return uiv.__first(ms);
};
// Color finder — for SOLID areas, which template matching is deliberately
// blind to (a flat pattern has zero variance; findImage defines it as
// matching nothing). Status LEDs, progress fills, color-coded badges.
// Same geometry contract as the other finders; reading order; 'best' flags
// the LARGEST region and uiv.findColor returns it.
uiv.findColors = function (color, opts) { return uiv.__visualFind('colorSearch', uiv.__opts({ color: String(color) }, opts), 'a color'); };
// The real on-screen colours of a patch: a display colour profile changes what a CSS colour looks like, so sample it and search for THAT.
uiv.pixels = function (area, opts) { return uiv.__bridge('pixels', uiv.__opts({ area: area }, opts)); };
uiv.pixel = function (x, y, opts) { return uiv.pixels({ x: x, y: y, width: 1, height: 1 }, opts).colors[0]; };
uiv.findColor = function (color, opts) {
  var ms = uiv.findColors(color, opts);
  if (ms && ms.length) { for (var i = 0; i < ms.length; i++) { if (ms[i].best) return ms[i]; } }
  return uiv.__first(ms);
};
uiv.ocr.findText = function (text, opts) { return uiv.__first(uiv.ocr.findTexts(text, opts)); };
// (The 2026-07 rename of the OCR finder into uiv.ocr.* kept top-level
// uiv.findText/findTexts as shims that threw the new spelling. Dropped: the
// API is still in its breaking-changes window, no demo, doc or prompt uses the
// old names, and carrying them meant the editor had to treat two identifiers
// as "known" purely to mark them red.)

// OCR proper: pixels IN, text OUT. The only way to read text that is not in
// the DOM — canvas, a PDF in the browser viewer, an image, the desktop. For
// text that IS in the DOM use uiv.$('css=h1').text: exact, instant, free.
// Options: {area: match | rect} reads ONE REGION instead of the whole
// viewport — "the number next to 'Total'" is
//   uiv.ocr.read({area: {x: t.rect.left + t.rect.width, y: t.rect.top, width: 120, height: t.rect.height}})
// with t = uiv.ocr.findText('Total'). {scope: 'desktop'} reads the screen
// (area then in screen pixels). {image: 'shot.png'} reads a saved screenshot.
uiv.ocr.read = function (opts) { return uiv.__bridge('ocrRead', opts || {}); };

// TABS. The script is pinned to ONE tab (the play tab); these move that pin.
// Indexes are ABSOLUTE: 1..N left to right in the current window, exactly what
// the tab bar shows — NOT relative to the starting tab like the classic
// selectWindow. Every call returns {index, title, url, active, current} of the
// tab that is now current, so the script can VERIFY it landed where it meant
// to. 'current' marks the SCRIPT's tab (the one commands act on) — that is the
// position read, replacing the table-macro !CURRENT_TAB_NUMBER variable, which
// classic bookkeeping leaves stale next to these calls and getVar refuses.
// 'active' is the browser's active tab; the two differ if the user clicks
// another tab mid-run.
//   uiv.tabs.list()             -> the run's window as [{index, window, title, url, active, current}, ...]
//   uiv.tabs.list({all: true})  -> every window (window = 1-based window number)
//   uiv.tabs.select(2)          -> switch to tab #2 of the run's window
//   uiv.tabs.select(entry)      -> an entry from uiv.tabs.list() (any window)
//   uiv.tabs.select({url: 'stripe.com'}) / {title: 'Invoice'} -> substring match, any window
//   uiv.tabs.select({newest: true}) -> the tab opened LAST (a click's target=_blank, a popup)
//   uiv.tabs.open(url)          -> NEW tab on url (uiv.goto navigates the CURRENT tab)
//   uiv.tabs.close()            -> close the current tab, land on its neighbour
//   uiv.tabs.close(which)       -> close that tab (same forms as select), stay where we are
// (OPEN-ISSUES 21.2/21.3: the classic selectWindow | tab=open CREATES a tab —
// it never adopts one a click opened; that is what {newest: true} is for.)
uiv.tabs = {};
uiv.tabs.__which = function (fn, which, optional) {
  if (which === undefined || which === null) { if (optional) return {}; }
  else if (typeof which === 'number' && isFinite(which)) return { index: which };
  else if (which && typeof which === 'object') {
    if (typeof which.index === 'number') return { index: which.index, window: which.window };
    if (typeof which.url === 'string') return { url: which.url };
    if (typeof which.title === 'string') return { title: which.title };
    if (which.newest) return { newest: true };
  }
  throw new Error(fn + ": pass a tab number (1-based, uiv.tabs.list() shows them), an entry from uiv.tabs.list(), or a matcher: {url: 'stripe.com'} / {title: 'Invoice'} (substring, any window) / {newest: true} for the tab opened last (a click's target=_blank link, a popup)");
};
uiv.tabs.list = function (opts) { return uiv.__bridge('tabsList', { all: !!(opts && opts.all) }); };
uiv.tabs.select = function (which) { return uiv.__bridge('tabsSelect', uiv.tabs.__which('uiv.tabs.select', which, false)); };
uiv.tabs.open = function (url) { return uiv.__bridge('tabsOpen', { url: String(url) }); };
uiv.tabs.close = function (which) { return uiv.__bridge('tabsClose', uiv.tabs.__which('uiv.tabs.close', which, true)); };
// WINDOW: uiv.window.resize(width, height) sets the PAGE VIEWPORT size by
// resizing the browser window (window chrome and the side panel's width are
// accounted for). Returns the ACHIEVED viewport {width, height} — verify it,
// a screen smaller than the request clamps the result. Use it to PIN the
// layout a macro was written for: a narrow window flips responsive sites to
// their mobile layout (tables hidden behind cards, filter bars turned into
// position:fixed overlays), the #1 cause of "works sometimes" macros.
uiv.window = {};
uiv.window.resize = function (width, height) {
  if (typeof width !== 'number' || typeof height !== 'number' || !isFinite(width) || !isFinite(height) || width < 100 || height < 100) { throw new Error('uiv.window.resize: needs the viewport width and height in CSS pixels, both >= 100 — e.g. uiv.window.resize(1280, 900)'); }
  return uiv.__bridge('windowResize', { width: Math.round(width), height: Math.round(height) });
};
// uiv.window.focus() brings the browser window to the FRONT. Not a nicety for
// desktop macros — a PRECONDITION: uiv.desktop.* is real OS input, and the OS
// delivers it to whatever window is frontmost, so a background browser means
// the clicks land in another application. Browser-scope X commands front the
// window by themselves; DESKTOP scope deliberately does not, because a desktop
// macro may be aiming at another app on purpose. So the macro says when.
// Call it first, before the uiv.goto.
uiv.window.focus = function () { return uiv.__bridge('windowFocus', {}); };
// The opposite: minimize the browser AND the IDE, e.g. to automate an
// application sitting behind them.
uiv.window.minimize = function () { return uiv.__bridge('windowMinimize', {}); };
// The browser window's TRUE position and size on screen, in CSS-screen
// coordinates — the coordinate space desktop {area} rectangles use — plus
// viewport: {width,height} in CSS px, the size uiv.window.resize takes. On
// Wayland window.screenX/screenY REPORT 0 (the compositor hides window
// positions), so any area built from them slides to the screen corner and
// reads the wrong pixels; this call measures the real origin instead
// (visual beacon located by the native host). Use it wherever a macro
// would have used window.screenX/screenY.
uiv.window.rect = function () { return uiv.__bridge('windowRect', {}); };
uiv.__domTarget = function (s, fn) {
  if (/\.png\s*$/i.test(s) || /^\s*(img|image|ocr|text)\s*=/i.test(s)) {
    throw new Error(fn + ": '" + s + "' looks like a VISUAL target - locator strings are DOM only (css= id= name= link= xpath=); use " + fn + "(uiv.findImage('file.png')) or " + fn + "(uiv.ocr.findText('word')) for visual targets");
  }
  return uiv.$(s);
};
// INPUT TIERS. Every input action names how it reaches the page, because the
// three ways behave differently and the difference is what people debug:
//   uiv.page.*      content script - synthetic DOM events, no CDP, no XModule.
//                  Fastest, works in a background tab, but sites that check
//                  for trusted input ignore it.
//   uiv.browser.*  Chrome DevTools Protocol (BClick/BType/BMove) - trusted
//                  input inside the page, no XModule, viewport CSS pixels.
//   uiv.desktop.*  XModule native host (XClick/XType/XMove) - real OS input,
//                  reaches OS dialogs, needs the XModule. SCREEN pixels by
//                  default; browser-scope matches (or {scope: 'browser'})
//                  aim it at VIEWPORT positions like the classic XClick in
//                  browser mode.
// There is deliberately no bare uiv.click/uiv.type/uiv.move: which tier they
// meant was invisible at the call site, which is exactly the thing that goes
// wrong at 2am.
// INVARIANT: no tier method uses \`this\` — they reach the bridge through the
// global \`uiv\`. That is what makes both \`var b = uiv.browser; b.click(...)\`
// and \`var c = uiv.browser.click; c(...)\` work for people who want shorter
// names. Switching any of them to this.__bridge would break that silently.
uiv.page = {};
uiv.browser = {};
uiv.browser.mouse = {};
uiv.browser.keyboard = {};
uiv.__browserKey = function (key, down) {
  if (typeof key !== 'string' || !key) { throw new Error('keyboard.down/up: key must be a nonempty string'); }
  return uiv.__bridge('bKey', { key: key, down: down });
};
uiv.browser.keyboard.down = function (key) { return uiv.__browserKey(key, true); };
uiv.browser.keyboard.up = function (key) { return uiv.__browserKey(key, false); };
uiv.desktop = {};
// Playwright shape: uiv.desktop.mouse.{click, move, down, up} and uiv.desktop.keyboard.{press, type, insertText, down, up}
uiv.desktop.mouse = {};
uiv.desktop.keyboard = {};

// A match from uiv.$/uiv.img/uiv.ocr carries scope: browser matches are
// VIEWPORT css px, desktop matches are SCREEN px. Feeding one to the other
// tier clicks a believable but wrong place, so it is rejected outright.
uiv.__requireScope = function (p, want, fn) {
  if (p.scope && p.scope !== want) {
    throw new Error(fn + ': that match is in ' + p.scope + ' coordinates, but ' + fn + ' needs ' + want +
      ' coordinates - ' + (want === 'desktop'
        ? "find it with uiv.findImage(file, {scope: 'desktop'}) for desktop clicks"
        : 'use uiv.desktop.* for desktop matches, or find it with a browser finder (uiv.$ / uiv.img / uiv.ocr)'));
  }
};

// Same operation, same Playwright name. A DOM match re-resolves its finder;
// a screenshot/OCR point cannot identify an element outside the viewport.
uiv.page.scrollIntoViewIfNeeded = function (target, opts) {
  var spec;
  if (typeof target === 'string') { spec = { locator: target, index: 0 }; }
  else if (target && target.__f !== undefined && uiv.__finds[target.__f] && !uiv.__finds[target.__f].__visual) {
    spec = { find: uiv.__finds[target.__f], locator: uiv.__finds[target.__f].locator, index: target.__i || 0 };
  } else { throw new Error('scrollIntoViewIfNeeded: pass a DOM locator or a DOM finder match; image/OCR matches have no DOM element'); }
  if (opts && opts.timeout !== undefined) {
    if (typeof opts.timeout !== 'number' || !isFinite(opts.timeout) || opts.timeout < 0) { throw new Error('scrollIntoViewIfNeeded: timeout must be a non-negative number of milliseconds'); }
    spec.timeout = opts.timeout;
  }
  return uiv.__bridge('domScrollIntoView', spec);
};
uiv.__wheel = function (op, dx, dy, fn) {
  if (typeof dx !== 'number' || typeof dy !== 'number' || !isFinite(dx) || !isFinite(dy)) {
    throw new Error(fn + ': needs finite numeric (deltaX, deltaY), horizontal first; positive is right/down');
  }
  return uiv.__bridge(op, { deltaX: dx, deltaY: dy });
};
uiv.browser.mouse.wheel = function (deltaX, deltaY) { return uiv.__wheel('bWheel', deltaX, deltaY, 'uiv.browser.mouse.wheel'); };
uiv.desktop.mouse.wheel = function (deltaX, deltaY) { return uiv.__wheel('xWheel', deltaX, deltaY, 'uiv.desktop.mouse.wheel'); };

uiv.page.click = function (target, opts) {
  if (opts && opts.button !== undefined && String(opts.button).toLowerCase() !== 'left') {
    throw new Error("uiv.page.click: synthetic DOM clicks are left-button only - a synthetic right-click reaches almost nothing (no native menu, most pages ignore it). Use uiv.browser.click(target, {button: '" + opts.button + "'}) for a trusted click");
  }
  if (typeof target === 'string') { return uiv.__bridge('domClickLocator', { locator: target }); }
  var p = uiv.__xy(target, undefined, 'uiv.page.click');
  uiv.__requireScope(p, 'browser', 'uiv.page.click');
  return uiv.__bridge('domClickAt', p);
};
uiv.page.fill = function (target, text) {
  if (arguments.length < 2) { throw new Error("uiv.page.fill: needs the field AND the text - uiv.page.fill('id=email', 'a@b.com'). To send keystrokes to whatever has focus, use uiv.browser.type(text)"); }
  // a match from a finder is filled where it was FOUND: re-resolving a locator
  // would be slower, and for a match inside a cross-origin frame impossible
  if (target !== null && typeof target === 'object') {
    var p = uiv.__xy(target, undefined, 'uiv.page.fill');
    uiv.__requireScope(p, 'browser', 'uiv.page.fill');
    p.text = String(text);
    return uiv.__bridge('domTypeAt', p);
  }
  return uiv.__bridge('domType', { locator: String(target), text: String(text) });
};
uiv.page.selectOption = function (locator, option, opts) {
  // Without this the missing option becomes the STRING "undefined" and the
  // call burns the full auto-wait searching the dropdown for an option by
  // that name - reported as "no option matching 'undefined'", which reads
  // like a page problem rather than a typo in the script.
  if (arguments.length < 2) { throw new Error("uiv.page.selectOption: needs the dropdown AND the option - uiv.page.selectOption('id=sort', 'Most recent'). The option is matched by its VISIBLE LABEL; 'value=xyz' or 'index=2' pick it by value or position instead"); }
  // A match object stringifies to '[object Object]', which then burns the
  // full auto-wait searching the page for that literal selector (seen in the
  // field). Unlike click/type, select cannot act at a point - it resolves
  // the <select> element itself, so it needs the locator STRING.
  // A finder MATCH (uiv.$, findImage, ocr.findText) instead of a locator: the
  // page side resolves the <select> under that point — or the one a label /
  // wrapper at the point belongs to. Used to be refused (38 chats/week kept
  // making the call anyway, OPEN-ISSUES 35.8). Cross-origin frame matches
  // carry frame-local coordinates the top document cannot resolve.
  if (locator !== null && typeof locator === 'object') {
    var p = uiv.__xy(locator, undefined, 'uiv.page.selectOption');
    uiv.__requireScope(p, 'browser', 'uiv.page.selectOption');
    if (p.frameLocal) { throw new Error("uiv.page.selectOption: this match sits inside a cross-origin frame - pass the dropdown's LOCATOR STRING instead: uiv.page.selectOption('id=country', 'Germany')"); }
    return uiv.__bridge('domSelect', uiv.__opts({ locator: 'point=' + p.x + ',' + p.y, option: String(option) }, opts));
  }
  return uiv.__bridge('domSelect', uiv.__opts({ locator: String(locator), option: String(option) }, opts));
};

// {button: 'left' | 'middle' | 'right'} on the coordinate tiers (browser,
// desktop) - the same buttons the classic BClick/XClick take as #middle /
// #right. Normalizes to '' for left so the wire format stays unchanged.
uiv.__button = function (opts, fn) {
  if (!opts || opts.button === undefined) { return ''; }
  var b = String(opts.button).toLowerCase();
  if (b === 'left') { return ''; }
  if (b === 'middle' || b === 'right') { return b; }
  throw new Error(fn + ": {button: '" + opts.button + "'} is not a mouse button - use 'left', 'middle' or 'right'");
};
uiv.browser.click = function (x, y, opts) {
  if (typeof x === 'string') { return uiv.browser.click(uiv.__domTarget(x, 'uiv.browser.click'), y, opts); }
  // (match, opts) form: the options land in the y slot
  if (y !== null && typeof y === 'object' && opts === undefined) { opts = y; y = undefined; }
  var p = uiv.__xy(x, y, 'uiv.browser.click');
  uiv.__requireScope(p, 'browser', 'uiv.browser.click');
  var button = uiv.__button(opts, 'uiv.browser.click');
  // cross-origin frame matches carry FRAME-local coordinates; CDP only speaks
  // top-viewport, so those route to a DOM click inside that frame
  if (p.frameLocal) {
    if (button) { throw new Error('uiv.browser.click: {button: "' + button + '"} does not work on matches inside cross-origin frames (they get a DOM click, which is left-button only)'); }
    return uiv.__bridge('domClickAt', p);
  }
  if (button) { p.button = button; }
  return uiv.__bridge('bClick', p);
};
uiv.browser.hover = function (x, y) {
  if (typeof x === 'string') { return uiv.browser.hover(uiv.__domTarget(x, 'uiv.browser.hover')); }
  var p = uiv.__xy(x, y, 'uiv.browser.hover');
  uiv.__requireScope(p, 'browser', 'uiv.browser.hover');
  if (p.frameLocal) { throw new Error('uiv.browser.hover: matches inside cross-origin frames support click only (their coordinates are frame-local); use uiv.img/uiv.ocr for hover'); }
  return uiv.__bridge('bMove', p);
};
// {nav: true}: a click that navigates is waited for automatically, but a
// keyboard submit is not - ENTER returns before the navigation it caused.
// The option turns on the same settle watch the clicks use:
//   uiv.browser.type('\${KEY_ENTER}', {nav: true});   // next call sees the NEW page
uiv.browser.type = function (text, opts) { return uiv.__bridge('bType', uiv.__opts({ text: String(text) }, opts)); };
// Drag: press at one point, release at another. The button stays held between
// the two calls, and every uiv.browser.hover in between drags with it — which
// is what sliders and drag handles need, since they only follow mousemove
// events that carry the pressed-button state.
//   b.down(uiv.findImage('handle.png'));  b.up(x + 200, y);
uiv.browser.down = function (x, y) { return uiv.__bridge('bDown', uiv.__requireBrowserPoint(x, y, 'uiv.browser.down')); };
uiv.browser.up = function (x, y) { return uiv.__bridge('bUp', uiv.__requireBrowserPoint(x, y, 'uiv.browser.up')); };
uiv.__requireBrowserPoint = function (x, y, fn) {
  if (typeof x === 'string') { x = uiv.__domTarget(x, fn); }
  var p = uiv.__xy(x, y, fn);
  uiv.__requireScope(p, 'browser', fn);
  return p;
};

// The desktop tier speaks BOTH coordinate spaces, like the classic XClick
// (whose x,y means screen or viewport depending on XDesktopAutomation):
//   - a desktop-scope match, or bare numbers          -> SCREEN pixels
//   - a browser-scope match (any browser finder), or
//     bare numbers with {scope: 'browser'}            -> VIEWPORT pixels
// A viewport-space desktop click aims the real OS input at a page position
// (window offset + side panel are corrected for, the browser is brought to
// the foreground first) — the way to OS-click something a browser finder
// located, e.g. on Firefox where uiv.browser.* (CDP) does not exist.
uiv.__desktopPoint = function (x, y, opts, fn) {
  if (typeof x === 'string') { throw new Error(fn + ": locator strings are DOM only - pass a match (uiv.findImage('file.png', {scope: 'desktop'}), or any browser finder for a viewport-space click) or coordinates"); }
  if (y !== null && typeof y === 'object' && typeof x === 'number') { throw new Error(fn + ': needs (x, y[, opts]) - the second argument must be the y coordinate'); }
  var p = uiv.__xy(x, y, fn);
  if (p.frameLocal) { throw new Error(fn + ': matches inside cross-origin frames carry frame-local coordinates, which cannot be mapped to the screen - use uiv.findImage/uiv.ocr.findText (they see the frame as pixels)'); }
  if (opts && opts.scope !== undefined) {
    var s = String(opts.scope).toLowerCase();
    if (s !== 'browser' && s !== 'desktop') { throw new Error(fn + ": {scope: '" + opts.scope + "'} - use 'browser' (viewport px) or 'desktop' (screen px)"); }
    if (p.scope && p.scope !== s) { throw new Error(fn + ": that match already carries " + p.scope + " coordinates - {scope: '" + s + "'} contradicts it; drop the option"); }
    p.scope = s;
  }
  if (!p.scope) { p.scope = 'desktop'; }
  return p;
};
uiv.desktop.mouse.click = function (x, y, opts) {
  if (y !== null && typeof y === 'object' && opts === undefined) { opts = y; y = undefined; }
  var p = uiv.__desktopPoint(x, y, opts, 'uiv.desktop.mouse.click');
  var button = uiv.__button(opts, 'uiv.desktop.mouse.click');
  if (button) { p.button = button; }
  return uiv.__bridge('xClick', p);
};
uiv.desktop.mouse.move = function (x, y, opts) {
  if (y !== null && typeof y === 'object' && opts === undefined) { opts = y; y = undefined; }
  return uiv.__bridge('xMove', uiv.__desktopPoint(x, y, opts, 'uiv.desktop.mouse.move'));
};
uiv.desktop.keyboard.type = function (text) { return uiv.__bridge('xType', { text: String(text) }); };
// Playwright's verbs on the tiers (same feature, same name):
uiv.page.type = uiv.page.fill;
uiv.page.select = uiv.page.selectOption;
// Playwright's check / uncheck / setChecked. A label, a styled wrapper or the
// text next to the box resolves to the checkbox (label.control, the single
// input inside, aria-labelledby) — the shapes the model kept handing to
// isChecked() and getting "this label is not a checkbox" for (12 chats in the
// 09-09 proxy drop; "uiv.page.check does not exist" 11 more, OPEN-ISSUES 44.5).
// A string locator is resolved by uiv.$ first (any strategy, the usual
// dom-not-found diagnosis); a match acts where it was found.
uiv.page.setChecked = function (target, checked, opts) {
  if (arguments.length < 2) { throw new Error("uiv.page.setChecked: needs the checkbox AND true/false - uiv.page.setChecked('id=agree', true); uiv.page.check(target) / uiv.page.uncheck(target) are the short forms"); }
  var m = (typeof target === 'string') ? uiv.$(target, opts) : target;
  var p = uiv.__xy(m, undefined, 'uiv.page.setChecked');
  uiv.__requireScope(p, 'browser', 'uiv.page.setChecked');
  if (p.frameLocal) {
    // a cross-origin frame: the classic command resolves locators in every frame
    if (typeof target !== 'string') { throw new Error("uiv.page.setChecked: this match sits inside a cross-origin frame - pass the checkbox's LOCATOR STRING instead: uiv.page.check('id=agree')"); }
    return uiv.run(checked ? 'check' : 'uncheck', target);
  }
  return uiv.__bridge('domCheck', { locator: 'point=' + p.x + ',' + p.y, checked: !!checked, what: typeof target === 'string' ? target : ('the match at ' + p.x + ',' + p.y) });
};
uiv.page.check = function (target, opts) { return uiv.page.setChecked(target, true, opts); };
uiv.page.uncheck = function (target, opts) { return uiv.page.setChecked(target, false, opts); };
uiv.browser.move = uiv.browser.hover;
// Existing flat names remain aliases; new mouse examples use Playwright's shape.
uiv.browser.mouse.move = uiv.browser.move;
uiv.browser.mouse.click = uiv.browser.click;
uiv.browser.press = function (combo, opts) { return uiv.browser.type(uiv.__pressKeys(combo), opts); };
uiv.desktop.keyboard.press = function (combo) { return uiv.desktop.keyboard.type(uiv.__pressKeys(combo)); };
// Text in WITHOUT keystrokes for its characters: the OS clipboard plus ONE
// paste chord. Keyboard layouts, dead keys and AltGr never come into it, so
// this is the way to enter arbitrary text into a window on the far side of
// a remote-control viewer — AnyDesk re-synthesises keystrokes through the
// FAR side's layout and dropped every "|" of a shell command even as real
// keystrokes (OPEN-ISSUES 32.7), while it syncs the clipboard verbatim.
// Playwright's name (keyboard.insertText = text in, no key events); paste
// is the alias. opts.chord: the paste shortcut of the focused app — default
// Control+V (Meta+V on macOS); a Linux terminal wants 'Control+Shift+V'.
// opts.settle: ms between the clipboard write and the chord, for the sync
// to reach the target (default 1000; 0 is fine locally). A viewer WITH a
// VM inside is two syncs — AnyDesk to the host, VMware Tools into the
// guest — and 600 ms delivered the PREVIOUS clipboard content there
// (measured 2026-09-05): give such a target 2000–3000. The clipboard KEEPS
// the text afterwards, like a manual copy would.
// opts.focus: a point ([x, y] or {x, y}) or a finder match to CLICK after
// the clipboard write and before the chord. ORDER MATTERS for a VM: VMware
// Tools copies the host clipboard into the guest when the VM window is
// grabbed (clicked) — a click BEFORE the write pulls the previous content
// and the paste delivers stale text (measured 2026-09-05, twice). So: write,
// settle, focus-click, paste.
// hold / release one key (press() is the tap): uiv.desktop.keyboard.down('ArrowDown'); ... uiv.desktop.keyboard.up('ArrowDown');
uiv.__holdKeys = function (combo) {
  // a bare modifier ('Shift', 'Control', 'Alt', 'Meta') can be held on its own
  var m = { shift: 'KEY_SHIFT', control: 'KEY_CTRL', ctrl: 'KEY_CTRL', alt: 'KEY_ALT', option: 'KEY_ALT', meta: 'KEY_META', command: 'KEY_META', cmd: 'KEY_META' }[String(combo).toLowerCase()];
  return m ? '\${' + m + '}' : uiv.__pressKeys(combo);
};
uiv.desktop.keyboard.down = function (combo) { return uiv.__bridge('keyDown', { text: uiv.__holdKeys(combo) }); };
uiv.desktop.keyboard.up = function (combo) { return uiv.__bridge('keyUp', { text: uiv.__holdKeys(combo) }); };
// move the browser window (screen points): uiv.window.move(0, 30)
uiv.window.move = function (x, y) { return uiv.__bridge('windowMove', { x: Number(x), y: Number(y) }); };
// press with a hold (Playwright's \`delay\`: ms between key down and key up): a 2 ms tap is dropped by
// games and canvas apps now and then, 30 ms is not — uiv.desktop.keyboard.press('Space', { delay: 30 })
uiv.__pressTap = uiv.desktop.keyboard.press;
uiv.desktop.keyboard.press = function (combo, opts) {
  if (opts && opts.delay > 0) { uiv.desktop.keyboard.down(combo); try { uiv.sleep(opts.delay); } finally { uiv.desktop.keyboard.up(combo); } return; }
  return uiv.__pressTap(combo);
};
// the most recent screen read: { captureId, captureTimeMs, captureAgeMs } — also when a finder found nothing
uiv.lastCapture = function () { return uiv.__bridge('lastCapture', {}); };
// Fail early with a useful upgrade message; compare numeric version parts.
uiv.requireAppVersion = function (minimum) {
  minimum = String(minimum);
  if (!/^\\d+\\.\\d+\\.\\d+$/.test(minimum)) throw new Error('uiv.requireAppVersion: use a minimum version such as 2.1.10');
  var actual = String(uiv.getVar('!XMODULE_VERSION', ''));
  var match = /^(\\d+)\\.(\\d+)\\.(\\d+)(-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$/.exec(actual);
  var needed = minimum.split('.').map(Number), comparison = 0;
  if (match) for (var i = 0; i < 3; i++) {
    if (Number(match[i + 1]) !== needed[i]) { comparison = Number(match[i + 1]) > needed[i] ? 1 : -1; break; }
  }
  if (!match || comparison < 0 || (comparison === 0 && match[4])) {
    throw new Error('This macro requires Ui.Vision Desktop ' + minimum + ' or newer; running ' + (actual || 'an unknown version') + '. Update Ui.Vision for Desktop and restart it.');
  }
  return actual;
};

uiv.desktop.keyboard.insertText = function (text, opts) {
  opts = opts || {};
  var chord = opts.chord || (uiv.getVar('!OS') === 'mac' ? 'Meta+V' : 'Control+V');
  var settle = opts.settle === undefined ? 1000 : Number(opts.settle);
  uiv.clipboard.write(text === undefined || text === null ? '' : String(text));
  if (settle > 0) uiv.sleep(settle);
  if (opts.focus !== undefined && opts.focus !== null) {
    var f = opts.focus;
    if (Array.isArray(f)) uiv.desktop.mouse.click(f[0], f[1]); else uiv.desktop.mouse.click(f);
    uiv.sleep(opts.focusPause === undefined ? 300 : Number(opts.focusPause));
  }
  return uiv.desktop.keyboard.press(chord);
};
// WAIT FOR MOTION TO SETTLE (or to start) — the desktop-scope answer to
// every guessed sleep after an animation, spinner, load bar or transition:
//   uiv.desktop.waitStill({x, y, width, height})            -> waits until the
//     area's pixels STOP CHANGING for stillMs (default 800), then returns
//     {waitedMs}. Options: {stillMs, timeout (s, default 15), required}.
//     Screen px, same space as the desktop finders' rects.
//   uiv.desktop.waitChange(area, opts)  -> the inverse: returns the moment
//     the area CHANGES at all (a result rendered, a counter ticked).
// Both throw on timeout like the finders; {required: false} returns
// {waitedMs, timedOut: true} instead. Sampling runs in-host at native rate
// (region capture), so the answer is precise to ~60ms.
//   uiv.desktop.mouse.click('Export'); uiv.desktop.waitStill(progressArea); ...
uiv.desktop.waitStill = function (area, opts) { return uiv.__bridge('waitStill', uiv.__opts({ area: area, until: 'still' }, opts)); };
uiv.desktop.waitChange = function (area, opts) { return uiv.__bridge('waitStill', uiv.__opts({ area: area, until: 'change' }, opts)); };
// undocumented / experimental — see xmodule2/host/src/reflex.rs
// drag with real OS input — same press/move/release shape as uiv.browser;
// both coordinate spaces work here too (see uiv.__desktopPoint above)
uiv.desktop.mouse.down = function (x, y, opts) {
  if (y !== null && typeof y === 'object' && opts === undefined) { opts = y; y = undefined; }
  return uiv.__bridge('xDown', uiv.__desktopPoint(x, y, opts, 'uiv.desktop.down'));
};
uiv.desktop.mouse.up = function (x, y, opts) {
  if (y !== null && typeof y === 'object' && opts === undefined) { opts = y; y = undefined; }
  return uiv.__bridge('xUp', uiv.__desktopPoint(x, y, opts, 'uiv.desktop.up'));
};
// The flat names from before the Playwright shape (uiv.desktop.click / move /
// down / up / type / press, v10.0.12 - 10.0.2xx) stay as aliases: they are a
// published API, shipped demos and user macros were written against them, and
// dropping them (d3fb7ca, 2026-09-12) killed two accuracy tests with
// "x.click is not a function" (2026-09-16). No this binding, same rule as above.
uiv.desktop.click = function () { return uiv.desktop.mouse.click.apply(null, arguments); };
uiv.desktop.move = function () { return uiv.desktop.mouse.move.apply(null, arguments); };
uiv.desktop.down = function () { return uiv.desktop.mouse.down.apply(null, arguments); };
uiv.desktop.up = function () { return uiv.desktop.mouse.up.apply(null, arguments); };
uiv.desktop.type = function () { return uiv.desktop.keyboard.type.apply(null, arguments); };
uiv.desktop.press = function () { return uiv.desktop.keyboard.press.apply(null, arguments); };
uiv.run = function (cmd, target, value) { return uiv.__bridge('run', { cmd: String(cmd), target: target === undefined ? '' : String(target), value: value === undefined ? '' : String(value) }); };
uiv.log = function (text, color) { __uiv_log(String(text), color === undefined ? '' : String(color)); };
// ON-PAGE progress banner — uiv.log's sibling for the PERSON WATCHING the
// browser, not the log panel. Shows text (HTML allowed) as an overlay on the
// current page; each call replaces the previous banner. uiv.banner('') hides
// it. Options: {seconds: 5} auto-hide, {position: 'bottom'}.
uiv.banner = function (html, opts) { return uiv.__bridge('banner', uiv.__opts({ html: (html === undefined || html === null) ? '' : String(html) }, opts)); };
uiv.sleep = function (ms) {
  var r = __uiv_pause(ms === undefined ? 0 : ms);
  if (!r.ok) { throw new Error(r.error); }
};
// END THE RUN EARLY, AS A SUCCESS — the graceful ending for guard clauses
// ("wrong browser", "nothing left to do today"): the run stops right here,
// is reported green, logs the reason and keeps the current banner up.
// The failed ending is "throw new Error(...)" — that clears the banner and
// marks the run red. uiv.exit is host-flagged, so even a catch-all
// try/catch around it cannot accidentally keep the run alive.
uiv.exit = function (reason) {
  __uiv_exit(reason === undefined || reason === null ? '' : String(reason));
  throw new Error('__uiv_exit__');
};
// SCREENSHOTS. These WRITE FILES rather than return values, which is why they
// are not finders — but the file name comes back, so a shot feeds straight
// into the readers:
//   uiv.ocr.read({ image: uiv.shot.page('article') })
//   uiv.ai.ask('what is the total?', { images: [uiv.shot.viewport()] })
// Names get .png appended when missing, and omitting the name reuses a
// scratch file — fine for "capture it, read it, forget it".
uiv.shot = {};
uiv.shot.viewport = function (name) { return uiv.__bridge('shotViewport', { name: uiv.__shotName(name) }); };
uiv.shot.page = function (name) { return uiv.__bridge('shotPage', { name: uiv.__shotName(name) }); };
uiv.shot.desktop = function (name) { return uiv.__bridge('shotDesktop', { name: uiv.__shotName(name) }); };
uiv.shot.element = function (locator, name) {
  if (locator === null || typeof locator === 'object') {
    throw new Error('uiv.shot.element: needs a LOCATOR string, not a match — the screenshot is taken by the classic storeImage command, which resolves the element itself');
  }
  return uiv.__bridge('shotElement', { locator: String(locator), name: uiv.__shotName(name) });
};
uiv.__shotName = function (name) {
  var n = (name === undefined || name === null || name === '') ? '__uiv_shot' : String(name);
  return /\.png$/i.test(n) ? n : n + '.png';
};
// The odd one out: shot.area writes to VISION storage, not screenshot storage,
// because its purpose is creating a MATCH TEMPLATE - crop a region once, find
// it later with uiv.findImage(name). For AUTHORING: the way to create an image
// for targets that have no DOM element (canvas, cross-origin visuals, the
// desktop), where the chat's save_element_image cannot reach - locate the
// target with a finder or uiv.ai.find while BUILDING the macro, crop, verify
// with a run, ship plain findImage. Not a runtime repair tool: re-cropping
// from ai.find when the image match fails caches WRONG pixels on a single
// mis-located point, and the macro then clicks the wrong spot forever without
// ever failing loudly again.
// A match from uiv.$/findImage/ocr.findText carries its own rect; a bare point
// (uiv.ai.find) does not, so {width, height} is required there and the crop
// is centred on the point. The name is required - an unfindable crop is
// pointless.
uiv.shot.area = function (target, name, opts) {
  if (target === null || typeof target !== 'object') {
    throw new Error("uiv.shot.area: needs a match or a rect - uiv.shot.area(uiv.ocr.findText('Total'), 'total.png')");
  }
  if (name === undefined || name === null || String(name) === '') {
    throw new Error('uiv.shot.area: a file name is required - the point of saving the crop is finding it again with uiv.findImage(name)');
  }
  opts = opts || {};
  var r = target.rect || (typeof target.width === 'number' ? target : null);
  var w = opts.width !== undefined ? opts.width : (r ? r.width : undefined);
  var h = opts.height !== undefined ? opts.height : (r ? r.height : undefined);
  if (typeof w !== 'number' || typeof h !== 'number' || !isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) {
    throw new Error('uiv.shot.area: no crop size - matches from uiv.$/uiv.findImage/uiv.ocr.findText carry a rect, but a bare point (uiv.ai.find) does not; pass {width, height} explicitly');
  }
  var x, y;
  if (r && opts.width === undefined && opts.height === undefined) {
    // the match's own box, verbatim
    x = r.left !== undefined ? r.left : r.x;
    y = r.top !== undefined ? r.top : r.y;
  } else {
    // explicit size: centre the crop on the match POINT
    var cx = typeof target.x === 'number' ? target.x : (r.left !== undefined ? r.left : r.x) + w / 2;
    var cy = typeof target.y === 'number' ? target.y : (r.top !== undefined ? r.top : r.y) + h / 2;
    x = cx - w / 2;
    y = cy - h / 2;
  }
  if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) {
    throw new Error('uiv.shot.area: cannot work out the crop position from that value');
  }
  return uiv.__bridge('shotArea', { rect: { x: x, y: y, width: w, height: h }, scope: target.scope || '', name: String(name), store: opts.store || '' });
};

// THE MODEL. Three calls, because they are three different things — only the
// first is "a prompt":
//   uiv.ai.ask     one round trip: text (+images) in, text out
//   uiv.ai.find    screenshot + question -> a MATCH, so it feeds the input
//                  tiers like uiv.$ / uiv.findImage / uiv.ocr.findText. It is the
//                  FOURTH FINDER, which is why it is named find. The work is
//                  not the prompt: it is the capture, the DPI rescale and
//                  parsing coordinates out of the reply.
//                  UNLIKE the other finders it does NOT auto-wait and retry:
//                  every attempt is a billable model call, and a second look
//                  at the same screenshot rarely gives a different answer.
//                  Wait for the page yourself (uiv.$ on something stable, or
//                  uiv.sleep) before asking.
// PROVIDER SUPPORT: both run on whatever AI is configured — the free
// Ui.Vision tier, Anthropic, OpenRouter or a local model. Anthropic keeps its
// own request path; everything else goes through an OpenAI-compatible one.
uiv.ai = {};
// ask options: {images: ['shot.png']} attaches screenshots; {json: true} makes
// the reply MACHINE-READABLE - the model is told to answer with only JSON, the
// reply is parsed (one corrective retry on failure), and ask returns the
// parsed value, not a string:
//   var rows = uiv.ai.ask('every flight number visible, as a JSON array', {images: [uiv.shot.viewport()], json: true});
// Use it whenever the answer feeds code rather than a log line - regexing
// prose out of a model reply is the fragile version of this option.
uiv.ai.ask = function (prompt, opts) { return uiv.__bridge('aiAsk', uiv.__opts({ prompt: String(prompt) }, opts)); };
uiv.ai.find = function (question, opts) { return uiv.__bridge('aiFind', uiv.__opts({ question: String(question) }, opts)); };
uiv.ai.computerUse = function (task, opts) { return uiv.__bridge('aiComputerUse', uiv.__opts({ task: String(task) }, opts)); };

// CSV files as real arrays. Rows are arrays of cells: [['a','b'], ['c','d']].
// The .csv suffix is added when missing, and these are the SAME files the CSV
// tab and the classic csvRead/csvSave commands use.
uiv.csv = {};
uiv.csv.read = function (file) { return uiv.__bridge('csvRead', { file: String(file) }); };
uiv.csv.write = function (file, rows) { return uiv.__bridge('csvWrite', { file: String(file), rows: rows }); };
uiv.csv.append = function (file, rows) {
  // a single row is the common case — accept it without the extra brackets
  var many = rows && rows.length && Object.prototype.toString.call(rows[0]) === '[object Array]';
  return uiv.__bridge('csvAppend', { file: String(file), rows: many ? rows : [rows] });
};
uiv.csv.exists = function (file) { return uiv.__bridge('csvExists', { file: String(file) }); };
uiv.csv.list = function () { return uiv.__bridge('csvList', {}); };

// Plain-text files — the RAW view of the SAME store (the CSV/TXT tab):
// no CSV parsing, no quoting rules, commas and quotes stay literal. THE way
// to read a list the user pasted one-per-line (prompts, keywords, URLs):
//   var lines = uiv.text.read('prompts.txt').split(/\\r?\\n/)
//     .map(function (s) { return s.trim(); }).filter(Boolean);
// (split on /\\r?\\n/, not plain LF — Windows files end lines with CRLF — and
// filter(Boolean) drops the ghost entry a trailing newline creates.)
// read() takes .txt and .csv alike (a "csv" that is really a plain list reads
// fine here); an extension-less name tries name.txt, then name.csv.
// write(file, text) stores the string as-is; no extension defaults to .txt.
uiv.text = {};
uiv.text.read = function (file) { return uiv.__bridge('textRead', { file: String(file) }); };
uiv.text.write = function (file, text) { return uiv.__bridge('textWrite', { file: String(file), text: text === undefined || text === null ? '' : String(text) }); };

// The file STORE itself. uiv.csv.* and uiv.text.* DECODE a file (as rows, as
// a string) and uiv.shot.* CAPTURES one — listing, testing, deleting and
// copying one out do none of that. They take a NAME and do not care what is
// inside it, so they live together here instead of being copied into every
// format namespace. That is also what lets a name FLOW: uiv.shot.viewport()
// hands back a name and uiv.files.remove(name) accepts it without the caller
// ever working out which kind of file it was.
//   uiv.files.list()                       every stored file, all three tabs
//   uiv.files.exists('article.png')        true/false, never throws
//   uiv.files.remove('results.csv')        delete it from Ui.Vision storage
//   uiv.files.exportToDownloads('a.png')   copy ONE file to the Downloads folder
// Every verb but list() acts on the ONE name it is given — the namespace is
// where the file verbs live, not a plural to export or delete in bulk.
//
// WHICH TAB a name means: .csv and .txt are the CSV/TXT tab. .png is in TWO —
// Screenshots (captures: uiv.shot.viewport/page/element) and Vision (the match
// images uiv.findImage and XClick search for: uiv.shot.area, and the AI chat's
// save_element_image). You do NOT normally say which: the name is looked up,
// and whichever tab holds it wins, so a name still flows straight from the call
// that made it — uiv.files.remove(uiv.shot.area(m, 'btn.png')) just works.
// Only a name sitting in BOTH tabs is ambiguous, and then every verb takes
// {store: 'vision'} / {store: 'screenshots'} / {store: 'csv'} to settle it:
//   uiv.files.remove('btn.png', {store: 'vision'})
//   uiv.files.list({store: 'vision'})      just the Vision tab
// A name with no extension is looked up as .txt, then .csv, then .png.
uiv.files = {};
uiv.files.list = function (opts) { return uiv.__bridge('filesList', uiv.__opts({}, opts)); };
uiv.files.exists = function (name, opts) { return uiv.__bridge('filesExists', uiv.__opts({ name: String(name) }, opts)); };
uiv.files.remove = function (name, opts) { return uiv.__bridge('filesRemove', uiv.__opts({ name: String(name) }, opts)); };

// Copy ONE file OUT of Ui.Vision's own storage into the browser's Downloads
// folder. File-type agnostic on purpose — a screenshot, a CSV and the log are
// the same operation, and splitting it across uiv.shot and uiv.csv would have
// made the caller pick a namespace for something that does not care.
//   uiv.files.exportToDownloads('article.png')
//   uiv.files.exportToDownloads('results.csv')
//   uiv.files.exportToDownloads('notes.txt')   raw text from the CSV/TXT tab
//   uiv.files.exportToDownloads('log')         the run log as a text file
// 'log' works only on this verb: the run log is rendered on the spot, so
// there is no entry to list or delete. Same tab rules as the other verbs,
// {store} included — a vision image exports like any other file.
uiv.files.exportToDownloads = function (name, opts) { return uiv.__bridge('exportToDownloads', uiv.__opts({ name: String(name) }, opts)); };
// MOVED. It was reachable both ways for one release, which bought nothing and
// cost the editor overlay, which knew only the short spelling and painted the
// documented one as a typo. One verb, one place — and it takes a name, so the
// place is uiv.files. The stub stays so the old spelling says where it went
// instead of failing with "not a function".

// Download a file from the WEB the way the user would, and get the name it
// got on disk back (the browser's Downloads folder). Three forms, one verb:
//   uiv.download('css=a.installer')                       "save link as": the element's href/src, no click
//   uiv.download('https://example.com/f.zip')             a plain URL
//   uiv.download(function () { uiv.page.click('id=export'); }, {as: 'report.csv'})
//     for downloads only a CLICK can start (JS-generated blobs, POST exports):
//     the trigger runs between arming and waiting, so the download it causes
//     is captured, renamed and awaited
// Options: {as: 'name.ext'} rename on disk, {timeout: 60} seconds to wait for
// completion (default !TIMEOUT_DOWNLOAD), {wait: false} fire-and-forget.
// Replaces the classic onDownload/saveItem pair and reading
// !LAST_DOWNLOADED_FILE_NAME by hand.
//   {blob: true} (trigger form only): for a "PDF" button that BUILDS the file
//   in the page (fetch -> Blob -> URL.createObjectURL) and window.open()s it
//   into a viewer tab — that starts no download, so the plain trigger form
//   times out with "no download started" while uiv.tabs.list shows a new
//   blob: tab (Vodafone's invoice archive, OPEN-ISSUES 30.7). With the flag
//   the runtime hooks the page's blob creation before the trigger, keeps the
//   viewer tab from opening, waits for the blob, and saves it under 'as'
//   through a page-side download link inside the armed window. Needs
//   uiv.evaluate (a strict-CSP page refuses it — then the fallback is the
//   viewer's own download button, desktop scope).
uiv.__blobHook = function () {
  uiv.evaluate("if (!window.__uivBlobHook) { window.__uivBlobHook = true; var o = URL.createObjectURL.bind(URL); URL.createObjectURL = function (b) { var u = o(b); window.__uivBlobLast = { blob: b, url: u, t: Date.now() }; return u; }; window.open = function () { return { focus: function () {}, close: function () {}, location: {}, document: { write: function () {} } }; }; } window.__uivBlobLast = null; return 1");
};
uiv.__blobSave = function (as, startS) {
  var deadline = Date.now() + Math.max(1, startS) * 1000;
  var have = false;
  while (!have && Date.now() < deadline) {
    uiv.sleep(250);
    have = uiv.evaluate("return !!(window.__uivBlobLast && window.__uivBlobLast.blob)");
  }
  if (!have) { throw new Error('uiv.download {blob: true}: the trigger created no blob within ' + startS + 's (URL.createObjectURL was never called) — the button may download or navigate the ordinary way; try without the flag, or raise !TIMEOUT_WAIT for a slow server'); }
  return uiv.evaluate("var a = document.createElement('a'); a.href = window.__uivBlobLast.url; a.download = " + JSON.stringify(String(as || 'download')) + "; document.body.appendChild(a); a.click(); a.remove(); return window.__uivBlobLast.blob.size");
};
uiv.download = function (what, opts) {
  opts = opts || {};
  var base = { as: opts.as ? String(opts.as) : '', wait: opts.wait !== false };
  if (opts.timeout !== undefined) { base.timeout = Number(opts.timeout); }
  if (opts.blob && typeof what !== 'function') { throw new Error("uiv.download: {blob: true} goes with the TRIGGER form — uiv.download(function () { uiv.browser.click(btn); }, {as: 'x.pdf', blob: true})"); }
  if (typeof what === 'function') {
    if (opts.blob) { uiv.__blobHook(); }
    uiv.__bridge('downloadArm', base);
    try {
      what(); // the script's own trigger — usually a click
      if (opts.blob) { uiv.__blobSave(base.as, parseFloat(uiv.getVar('!TIMEOUT_WAIT')) || 10); }
    } catch (e) {
      // the arm would otherwise outlive this call and block the next one
      uiv.__bridge('downloadDisarm', { reason: 'uiv.download: the trigger threw before a download started: ' + (e && e.message ? e.message : e) });
      throw e;
    }
    return uiv.__bridge('downloadWait', base);
  }
  // a finder MATCH is none of the three forms — stringified it becomes
  // '[object Object]', which then times out as a locator that can never match
  if (what !== null && typeof what === 'object') {
    throw new Error("uiv.download takes a locator STRING, a URL, or a trigger function - not a finder match. To download an element picked by position, pass the position AS a locator: uiv.download('xpath=(//img)[4]')");
  }
  var s = String(what);
  // a blob: URL belongs to the document that made it — the downloads API
  // cannot fetch it, and treating it as a LOCATOR used to burn the whole
  // element timeout on "looking for element 'blob:…'" (30.7)
  if (/^blob:/i.test(s)) { throw new Error("uiv.download: a blob: URL can only be saved by the page that created it — use the trigger form with {blob: true}: uiv.download(function () { uiv.browser.click(btn); }, {as: 'x.pdf', blob: true})"); }
  if (/^(https?|file|data):/i.test(s)) { base.url = s; } else { base.locator = s; }
  return uiv.__bridge('download', base);
};
// uiv.screenshot({element: match | locator, as: 'name.png'}) — crop the tab
// capture to that element; {area: {x, y, width, height}} crops a viewport
// region; nothing = the whole viewport. Saved under Shots as the name and,
// with 'as', exported to the download folder in the same call. Returns
// {name, exported, cropped}. (OPEN-ISSUES 24.3)
uiv.getVar = function (name, fallback) {
  if (/^\\s*!xmodule_version\\s*$/i.test(String(name))) {
    try { return uiv.__bridge('appVersion', {}); } catch (e) { if (arguments.length > 1) return fallback; throw e; }
  }
  // !CLIPBOARD is the OS clipboard — read it FRESH through the bridge (the
  // variable-pool copy is only refreshed by classic commands, so in a script
  // it would silently hand back stale data)
  if (/^\\s*!clipboard\\s*$/i.test(String(name))) {
    if (arguments.length > 1) {
      try { return uiv.__bridge('clipboardRead', {}); } catch (e) { return fallback; }
    }
    return uiv.__bridge('clipboardRead', {});
  }
  var r = __uiv_get(String(name), arguments.length > 1);
  if (!r.ok) { throw new Error(r.error); }
  if (r.unset) { return fallback; }
  return r.value;
};
uiv.setVar = function (name, value) {
  // symmetric: writing !CLIPBOARD puts the text on the real OS clipboard too
  if (/^\\s*!clipboard\\s*$/i.test(String(name))) {
    uiv.__bridge('clipboardWrite', { text: value === undefined || value === null ? '' : String(value) });
    return;
  }
  var r = __uiv_set(String(name), value);
  if (!r.ok) { throw new Error(r.error); }
};
// OS clipboard, first-class: read() returns the current clipboard text fresh,
// write(text) replaces it. getVar/setVar('!CLIPBOARD') are aliases of these
// (kept for classic-macro parity) — both talk to the REAL clipboard.
// (assignment style, not an object literal, like every other namespace here:
// the editor overlay derives the known-name set from these uiv.x.y = lines)
uiv.clipboard = {};
uiv.clipboard.read = function () { return uiv.__bridge('clipboardRead', {}); };
uiv.clipboard.write = function (text) { uiv.__bridge('clipboardWrite', { text: text === undefined || text === null ? '' : String(text) }); };
// ---------------------------------------------------------------------------
// WRONG-NAME SHIMS. One week of production proxy logs (Aug 2026) shows the
// AI agent inventing these names at scale (uiv.text.exists 268x, uiv.refresh
// 196x, uiv.page.check 182x, uiv.findTexts 177x, uiv.page.executeScript 176x,
// uiv.runMacro 90x, uiv.browser.executeScript 80x) — and a bare "is not a
// function" leaves the user pasting an opaque error back into the chat.
// Each shim throws the name that EXISTS, so the model self-corrects in one
// round — same pattern as the uiv.exportToDownloads move shim above.
// BRACKET assignments on purpose: the editor overlay (script_view.js
// KNOWN_UIV) collects real API names from top-level "uiv.x =" lines, and
// these names must KEEP flagging as unknown there — they are errors with
// better wording, not API.
uiv['findText'] = function () { throw new Error("uiv.findText does not exist - OCR text search is uiv.ocr.findText(text, opts) (first match) / uiv.ocr.findTexts (all matches); a DOM element is found with uiv.$(locator)"); };
uiv['findTexts'] = function () { throw new Error("uiv.findTexts does not exist - it is uiv.ocr.findTexts(text, opts) (all OCR matches; singular uiv.ocr.findText returns the first)"); };
uiv['refresh'] = function () { throw new Error("uiv.refresh does not exist - reload the page through the classic bridge: uiv.run('refresh') (the reload is waited for automatically)"); };
uiv['runMacro'] = function () { throw new Error("uiv.runMacro does not exist - a JS script reuses code via include: put the shared functions in a .js macro and splice it in with a comment line // @include Folder/Name.js (resolved before compile; uiv.main stays true only in the started file)"); };
uiv.text['exists'] = function () { throw new Error("uiv.text.exists does not exist - file existence lives once in the STORE api: uiv.files.exists(name). uiv.text.read/write only decode a stored file as raw text"); };
uiv.page['executeScript'] = function () { throw new Error("uiv.page.executeScript does not exist - page JavaScript is uiv.evaluate(code): the code STRING runs in the page and its return value comes back, e.g. uiv.evaluate('return document.title')"); };
uiv.browser['executeScript'] = function () { throw new Error("uiv.browser.executeScript does not exist - page JavaScript is uiv.evaluate(code); uiv.browser.* only carries CDP input (click/type/move)"); };
// NO-DOM SHIMS. "document is not defined" is the #3 sandbox error in the
// same logs (749x/week): the model writes page-DOM code at macro scope.
// Concrete methods that throw the working replacement turn that dead end
// into a one-round self-correct. Only FUNCTIONS are defined (no body /
// innerText data properties): a property read cannot throw a helpful
// error in ES5, and half-real data would be worse than a clear miss.
var document = {};
(function () {
  function noDom (n) { return function () { throw new Error("document." + n + ": the macro sandbox has NO DOM. Find elements with uiv.$(locator) / uiv.$$(locator) (each match carries .text/.value/.rect), or run real page JS with uiv.evaluate(code) - the code string executes in the page: uiv.evaluate('return document.title')"); }; }
  var fns = ['querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName', 'getElementsByTagName', 'getElementsByName', 'createElement', 'addEventListener', 'evaluate', 'write'];
  for (var i = 0; i < fns.length; i++) { document[fns[i]] = noDom(fns[i]); }
})();
var prompt = function () { throw new Error("prompt() dialogs do not exist in the sandbox - ask through the classic command: uiv.run('prompt', 'Your question@default value', 'answer'); var answer = uiv.getVar('answer');"); };
var confirm = function () { throw new Error("confirm() dialogs do not exist in the sandbox - use uiv.run('prompt', 'Type y to continue@y', 'ok') and test uiv.getVar('ok')"); };
// Cross-runtime subroutines pass explicit JSON snapshots, not shared globals.
uiv.args = typeof __uiv_call_data === 'undefined' ? {} : __uiv_call_data.args;
uiv.context = typeof __uiv_call_data === 'undefined' ? {} : __uiv_call_data.context;
uiv.__callData = function(value) {
  var seen=[];
  function check(v, depth) {
    if(depth>64)throw Error('Macro data is nested too deeply');
    if(v===null || typeof v==='string' || typeof v==='boolean')return;
    if(typeof v==='number' && isFinite(v))return;
    if(typeof v!=='object')throw Error('Macro data must contain only JSON values (no functions, undefined or non-finite numbers)');
    if(seen.indexOf(v)>=0)throw Error('Macro data cannot contain circular references');
    if(!Array.isArray(v) && Object.getPrototypeOf(v)!==Object.prototype && Object.getPrototypeOf(v)!==null)throw Error('Macro data must use plain objects or arrays');
    seen.push(v);
    if(Array.isArray(v)){for(var i=0;i<v.length;i++)check(v[i],depth+1);}
    else {var keys=Object.keys(v);for(var j=0;j<keys.length;j++)check(v[keys[j]],depth+1);}
    seen.pop();
  }
  check(value,0);
  var text=JSON.stringify(value);if(text.length>1048576)throw Error('Macro data exceeds 1 MB');
  return JSON.parse(text);
};
uiv.__macroCall = function(op,name,args,opts) {
  args=args===undefined?{}:args; opts=opts===undefined?{}:opts;
  if(!args || Array.isArray(args) || typeof args!=='object')throw Error('Macro arguments must be a plain object');
  if(!opts || Array.isArray(opts) || typeof opts!=='object')throw Error('Macro call options must be a plain object');
  if(opts.timeoutMs!==undefined && (typeof opts.timeoutMs!=='number' || !isFinite(opts.timeoutMs) || opts.timeoutMs<1 || opts.timeoutMs>3600000 || Math.floor(opts.timeoutMs)!==opts.timeoutMs))throw Error('timeoutMs must be an integer between 1 and 3600000');
  if(typeof name!=='string')throw Error('Macro name must be a string');
  return uiv.__bridge(op,{name:name,args:uiv.__callData(args),options:uiv.__callData(opts)});
};
uiv.app = uiv.app || {};
uiv.app.run = function(name,args,opts){return uiv.__macroCall('appRun',name,args,opts);};
uiv.browser.run = function(name,args,opts){return uiv.__macroCall('browserRun',name,args,opts);};
// Sets the value returned when the macro finishes successfully. It does not exit.
uiv.result = function(value){return uiv.__bridge('macroResult',{value:uiv.__callData(value)});};
var alert = function () { throw new Error("alert() dialogs do not exist in the sandbox - uiv.log(text) writes to the log; uiv.run('echo', text, '#shownotification') shows a browser notification"); };
` +
// ES6+ BUILT-INS. Babel compiles syntax, not library: a script may say
// `rows.includes(x)` and the sandbox (ES5.1) has no such method. These are
// the ones macro code actually reaches for — ranked by one week of
// production proxy logs (Aug 2026: normalize ~1300x, URL 857x, Set 476x,
// fromEntries 329x). Each is guarded, so a future interpreter that ships
// them natively wins. Set and Map are ARRAY-BACKED on purpose: the
// transpiler compiles [...set] with iterableIsArray (array concat), so an
// object-based polyfill would silently concat the OBJECT — an instance that
// IS an array with methods attached spreads, Array.froms and for...ofs
// correctly (tradeoff: `x instanceof Set` is false; size is a maintained
// property, not a getter). matchAll and Array.prototype.entries return
// ARRAYS instead of iterators — the correct shape under iterableIsArray.
// normalize does real NFD/NFKD for the European ranges via the table
// computed above (NFD_TABLE_JSON); NFC/NFKC pass through unchanged, which
// is exactly what accent-stripping needs. URL handles absolute URLs plus
// base-relative resolution; searchParams edits do NOT write back to .href.
// Promise stays absent — it needs real engine support and the uiv API is
// synchronous; the AI agent still catches it at save time
// (checkSandboxUnsupported in macro_agent/tools.ts).
`if (!Array.prototype.includes) { Array.prototype.includes = function (v) { for (var i = 0; i < this.length; i++) { if (this[i] === v || (v !== v && this[i] !== this[i])) return true; } return false; }; }
if (!Array.prototype.find) { Array.prototype.find = function (fn, t) { for (var i = 0; i < this.length; i++) { if (fn.call(t, this[i], i, this)) return this[i]; } return undefined; }; }
if (!Array.prototype.findIndex) { Array.prototype.findIndex = function (fn, t) { for (var i = 0; i < this.length; i++) { if (fn.call(t, this[i], i, this)) return i; } return -1; }; }
if (!Array.from) { Array.from = function (a, fn, t) { var out = []; for (var i = 0; i < a.length; i++) { out.push(fn ? fn.call(t, a[i], i) : a[i]); } return out; }; }
if (!Array.isArray) { Array.isArray = function (a) { return Object.prototype.toString.call(a) === '[object Array]'; }; }
if (!String.prototype.includes) { String.prototype.includes = function (s, p) { return this.indexOf(s, p || 0) !== -1; }; }
if (!String.prototype.startsWith) { String.prototype.startsWith = function (s, p) { return this.substr(p || 0, s.length) === s; }; }
if (!String.prototype.endsWith) { String.prototype.endsWith = function (s, p) { var e = p === undefined ? this.length : p; return this.substring(e - s.length, e) === s; }; }
if (!String.prototype.trimStart) { String.prototype.trimStart = function () { return this.replace(/^\\s+/, ''); }; }
if (!String.prototype.trimEnd) { String.prototype.trimEnd = function () { return this.replace(/\\s+$/, ''); }; }
if (!String.prototype.padStart) { String.prototype.padStart = function (n, p) { var s = String(this); p = p === undefined ? ' ' : String(p); while (s.length < n && p.length) { s = p.charAt((p.length - 1) - ((s.length - String(this).length) % p.length)) + s; } return s; }; }
if (!String.prototype.repeat) { String.prototype.repeat = function (n) { var s = ''; for (var i = 0; i < n; i++) { s += this; } return s; }; }
if (!Object.assign) { Object.assign = function (t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (!s) continue; for (var k in s) { if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; } } return t; }; }
if (!Object.values) { Object.values = function (o) { return Object.keys(o).map(function (k) { return o[k]; }); }; }
if (!Object.entries) { Object.entries = function (o) { return Object.keys(o).map(function (k) { return [k, o[k]]; }); }; }
if (!Number.isInteger) { Number.isInteger = function (v) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v; }; }
if (!Number.isNaN) { Number.isNaN = function (v) { return v !== v; }; }
if (!Number.isFinite) { Number.isFinite = function (v) { return typeof v === 'number' && isFinite(v); }; }
if (!Math.imul) { Math.imul = function (a, b) { var ah = (a >>> 16) & 0xffff; var al = a & 0xffff; var bh = (b >>> 16) & 0xffff; var bl = b & 0xffff; return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0)) | 0; }; }
if (!String.prototype.padEnd) { String.prototype.padEnd = function (n, p) { var s = String(this); p = p === undefined ? ' ' : String(p); while (s.length < n && p.length) { s += p.charAt((s.length - String(this).length) % p.length); } return s; }; }
if (!String.prototype.replaceAll) { String.prototype.replaceAll = function (s, r) { if (s instanceof RegExp) { if (!s.global) { throw new TypeError('replaceAll called with a non-global RegExp - add the g flag'); } return this.replace(s, r); } return this.replace(new RegExp(String(s).replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'g'), r); }; }
if (!String.prototype.matchAll) { String.prototype.matchAll = function (re) { var r; if (re instanceof RegExp) { if (!re.global) { throw new TypeError('matchAll called with a non-global RegExp - add the g flag'); } r = new RegExp(re.source, 'g' + (re.ignoreCase ? 'i' : '') + (re.multiline ? 'm' : '')); } else { r = new RegExp(String(re), 'g'); } var s = String(this); var out = []; var m; while ((m = r.exec(s)) !== null) { out.push(m); if (m.index === r.lastIndex) { r.lastIndex++; } } return out; }; }
if (!Array.prototype.at) { Array.prototype.at = function (i) { i = i < 0 ? Math.ceil(i) : Math.floor(i); if (i < 0) { i += this.length; } return i >= 0 && i < this.length ? this[i] : undefined; }; }
if (!Array.prototype.flat) { Array.prototype.flat = function (d) { d = d === undefined ? 1 : d; var out = []; for (var i = 0; i < this.length; i++) { var v = this[i]; if (d > 0 && Array.isArray(v)) { var f = v.flat(d - 1); for (var j = 0; j < f.length; j++) { out.push(f[j]); } } else { out.push(v); } } return out; }; }
if (!Array.prototype.flatMap) { Array.prototype.flatMap = function (fn, t) { return this.map(function (v, i, a) { return fn.call(t, v, i, a); }).flat(1); }; }
if (!Array.prototype.entries) { Array.prototype.entries = function () { var out = []; for (var i = 0; i < this.length; i++) { out.push([i, this[i]]); } return out; }; }
if (!Object.fromEntries) { Object.fromEntries = function (pairs) { var o = {}; for (var i = 0; i < pairs.length; i++) { o[pairs[i][0]] = pairs[i][1]; } return o; }; }
if (!Number.parseFloat) { Number.parseFloat = parseFloat; }
if (!Number.parseInt) { Number.parseInt = parseInt; }
var __uivNFD = ${NFD_TABLE_JSON};
if (!String.prototype.normalize) { String.prototype.normalize = function (form) { form = form === undefined ? 'NFC' : String(form); if (form !== 'NFC' && form !== 'NFD' && form !== 'NFKC' && form !== 'NFKD') { throw new RangeError('normalize: form must be NFC, NFD, NFKC or NFKD'); } var s = String(this); if (form === 'NFC' || form === 'NFKC') { return s; } var out = ''; for (var i = 0; i < s.length; i++) { out += __uivNFD[s.charAt(i)] || s.charAt(i); } return out; }; }
if (typeof Set === 'undefined') {
var Set = function (init) {
  var a = [];
  a.size = 0;
  a.has = function (v) { return a.indexOf(v) !== -1; };
  a.add = function (v) { if (a.indexOf(v) === -1) { a.push(v); a.size = a.length; } return a; };
  a['delete'] = function (v) { var i = a.indexOf(v); if (i === -1) { return false; } a.splice(i, 1); a.size = a.length; return true; };
  a.clear = function () { a.length = 0; a.size = 0; };
  a.forEach = function (fn, t) { for (var i = 0; i < a.length; i++) { fn.call(t, a[i], a[i], a); } };
  a.values = function () { return a.slice(); };
  a.keys = a.values;
  if (init) { for (var i = 0; i < init.length; i++) { a.add(init[i]); } }
  return a;
};
}
if (typeof Map === 'undefined') {
var Map = function (init) {
  var a = [];
  a.size = 0;
  function idx (k) { for (var i = 0; i < a.length; i++) { if (a[i][0] === k) { return i; } } return -1; }
  a.get = function (k) { var i = idx(k); return i === -1 ? undefined : a[i][1]; };
  a.set = function (k, v) { var i = idx(k); if (i === -1) { a.push([k, v]); a.size = a.length; } else { a[i][1] = v; } return a; };
  a.has = function (k) { return idx(k) !== -1; };
  a['delete'] = function (k) { var i = idx(k); if (i === -1) { return false; } a.splice(i, 1); a.size = a.length; return true; };
  a.clear = function () { a.length = 0; a.size = 0; };
  a.forEach = function (fn, t) { for (var i = 0; i < a.length; i++) { fn.call(t, a[i][1], a[i][0], a); } };
  a.keys = function () { var out = []; for (var i = 0; i < a.length; i++) { out.push(a[i][0]); } return out; };
  a.values = function () { var out = []; for (var i = 0; i < a.length; i++) { out.push(a[i][1]); } return out; };
  a.entries = function () { return a.slice(); };
  if (init) { for (var i = 0; i < init.length; i++) { a.set(init[i][0], init[i][1]); } }
  return a;
};
}
if (typeof URLSearchParams === 'undefined') {
var URLSearchParams = function (init) {
  var p = [];
  function dec (s) { try { return decodeURIComponent(s.replace(/\\+/g, ' ')); } catch (e) { return s; } }
  init = init === undefined || init === null ? '' : String(init);
  if (init.charAt(0) === '?') { init = init.substring(1); }
  if (init) {
    var parts = init.split('&');
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) { continue; }
      var eq = parts[i].indexOf('=');
      p.push([dec(eq === -1 ? parts[i] : parts[i].substring(0, eq)), eq === -1 ? '' : dec(parts[i].substring(eq + 1))]);
    }
  }
  this.__p = p;
};
URLSearchParams.prototype.get = function (k) { k = String(k); for (var i = 0; i < this.__p.length; i++) { if (this.__p[i][0] === k) { return this.__p[i][1]; } } return null; };
URLSearchParams.prototype.getAll = function (k) { k = String(k); var out = []; for (var i = 0; i < this.__p.length; i++) { if (this.__p[i][0] === k) { out.push(this.__p[i][1]); } } return out; };
URLSearchParams.prototype.has = function (k) { return this.get(k) !== null; };
URLSearchParams.prototype.append = function (k, v) { this.__p.push([String(k), String(v)]); };
URLSearchParams.prototype.set = function (k, v) { k = String(k); var kept = []; var done = false; for (var i = 0; i < this.__p.length; i++) { if (this.__p[i][0] === k) { if (!done) { kept.push([k, String(v)]); done = true; } } else { kept.push(this.__p[i]); } } if (!done) { kept.push([k, String(v)]); } this.__p = kept; };
URLSearchParams.prototype['delete'] = function (k) { k = String(k); var kept = []; for (var i = 0; i < this.__p.length; i++) { if (this.__p[i][0] !== k) { kept.push(this.__p[i]); } } this.__p = kept; };
URLSearchParams.prototype.forEach = function (fn, t) { for (var i = 0; i < this.__p.length; i++) { fn.call(t, this.__p[i][1], this.__p[i][0], this); } };
URLSearchParams.prototype.keys = function () { var out = []; for (var i = 0; i < this.__p.length; i++) { out.push(this.__p[i][0]); } return out; };
URLSearchParams.prototype.values = function () { var out = []; for (var i = 0; i < this.__p.length; i++) { out.push(this.__p[i][1]); } return out; };
URLSearchParams.prototype.entries = function () { return this.__p.slice(); };
URLSearchParams.prototype.toString = function () { var out = []; for (var i = 0; i < this.__p.length; i++) { out.push(encodeURIComponent(this.__p[i][0]) + '=' + encodeURIComponent(this.__p[i][1])); } return out.join('&'); };
}
if (typeof URL === 'undefined') {
var URL = function (url, base) {
  url = String(url);
  var m = url.match(/^([a-zA-Z][a-zA-Z0-9+.\\-]*:)\\/\\/([^\\/?#]*)([^?#]*)(\\?[^#]*)?(#[\\s\\S]*)?$/);
  if (!m && base !== undefined && base !== null) {
    var b = base instanceof URL ? base : new URL(String(base));
    if (url.indexOf('//') === 0) { return new URL(b.protocol + url); }
    if (url.charAt(0) === '/') { return new URL(b.origin + url); }
    if (url.charAt(0) === '?' || url.charAt(0) === '#') { return new URL(b.origin + b.pathname + url); }
    return new URL(b.origin + b.pathname.substring(0, b.pathname.lastIndexOf('/') + 1) + url);
  }
  if (!m) { throw new TypeError('Invalid URL: ' + url + (base === undefined ? ' (a relative URL needs a base: new URL(path, absoluteBase))' : '')); }
  this.protocol = m[1];
  var h = m[2];
  var at = h.lastIndexOf('@');
  if (at !== -1) { h = h.substring(at + 1); }
  this.host = h;
  var br = h.indexOf(']');
  var ci = h.lastIndexOf(':');
  if (ci > br) { this.hostname = h.substring(0, ci); this.port = h.substring(ci + 1); } else { this.hostname = h; this.port = ''; }
  this.pathname = m[3] || '/';
  this.search = m[4] || '';
  this.hash = m[5] || '';
  this.origin = this.protocol + '//' + this.host;
  this.href = this.origin + this.pathname + this.search + this.hash;
  this.searchParams = new URLSearchParams(this.search);
};
URL.prototype.toString = function () { return this.href; };
URL.prototype.toJSON = function () { return this.href; };
}
`
// Lines the polyfill occupies — subtracted so reported lines match the
// user's script (the polyfill is prepended to the same interpreter program).
const POLYFILL_LINES = POLYFILL.split('\n').length - 1

const listeners = {
  line: [],   // (lineNumber) — 1-based line in the user's script now executing
  status: [], // (status) — 'running' | 'paused' | 'stopped'
  done: [],   // ({ ok, error, errorLine }) — run finished
  wait: []    // ({ label, remainingS } | null) — auto-wait countdown ticks
}

const heldDesktopKeys = new Set()
let running = false
let scriptReturnValue = null
let activeAppCall = null
let executionMacroId = null
let stopRequested = false
let firstCommandDone = false
// uiv.exit(reason): the reason string (may be ''), or null when no exit was
// requested. Host-side on purpose — a script's catch-all try/catch can
// swallow the sandbox throw, but not this flag.
let exitRequested = null

// debugging state: breakpoints pause the run when a marked line is reached;
// pauseScript() pauses at the next line change; runToLine (per run) is a
// one-shot pause target ("Run to this line")
let paused = false
let pauseRequested = false
let runToLine = null
let breakpoints = new Set()

// the view owns the gutter markers and mirrors them here (1-based lines)
export function setScriptBreakpoints (lines) {
  breakpoints = new Set(lines || [])
}

export function isScriptPaused () {
  return paused
}

export function pauseScript () {
  if (running && !paused) pauseRequested = true
}

export function resumeScript () {
  pauseRequested = false
  paused = false
}

// single-step while paused: release the hold and re-arm the pause for the
// next line change — the run advances exactly one script line.
// (To START a run in step mode: runScript(code) followed by pauseScript() —
// the pause request is consumed at the first line.)
export function stepScript () {
  if (!running || !paused) return
  pauseRequested = true
  paused = false
}

export function onScriptEvent (type, fn) {
  listeners[type].push(fn)
  return () => {
    const i = listeners[type].indexOf(fn)
    if (i !== -1) listeners[type].splice(i, 1)
  }
}

function emit (type, arg) {
  listeners[type].forEach(fn => {
    try { fn(arg) } catch (e) { /* listener errors must not kill the run */ }
  })
}

export function isScriptRunning () {
  return running
}

export function stopScript () {
  if (!running) return
  stopRequested = true
  if (activeAppCall) activeAppCall.cancel()
  paused = false
  pauseRequested = false
  // a legacy-bridge command may be mid-run in the player — stop that too
  try {
    getPlayer({ name: 'testCase' }).stop()
  } catch (e) {
    // player not initialized or already stopped — the step loop still exits
  }
  // ...and a fast-path command has no player to stop, so end the session
  // directly: that drops the content script out of playing mode, which is what
  // cuts short a command still waiting on an element. Fire and forget — the
  // run's own teardown calls this again and it no-ops the second time.
  endScriptSession().catch(() => { /* best-effort */ })
}

// Babel's generated-line -> merged-source-line map for the current run (null
// when the script needed no transpiling, i.e. the mapping is the identity)
let scriptLineMap = null

// Which merged-source line came from which file, once @include has spliced
// them together (null when the script includes nothing). Only lines from the
// MAIN file can be highlighted in the editor — the user is not looking at the
// included ones — but errors in them still report file and line.
let scriptSegments = null

function toScriptLine (interpLine) {
  const line = interpLine - POLYFILL_LINES
  if (line <= 0) return null
  const merged = scriptLineMap ? (scriptLineMap[line] || null) : line
  if (merged === null) return null // compiler scaffolding, not user code
  if (!scriptSegments) return merged

  // inside an @included file: no editor line to highlight (the user is not
  // looking at that file), so the marker holds where it was
  const at = locateMergedLine(scriptSegments, merged)
  return at && at.isMain ? at.line : null
}

// Human-readable position for ERRORS, which must name the file when the
// failing line lives in an included one.
function describeScriptLine (interpLine) {
  const line = interpLine - POLYFILL_LINES
  if (line <= 0) return null
  const merged = scriptLineMap ? (scriptLineMap[line] || null) : line
  if (merged === null) return null
  if (!scriptSegments) return `line ${merged}`

  const at = locateMergedLine(scriptSegments, merged)
  if (!at) return null
  return at.isMain ? `line ${at.line}` : `${at.path} line ${at.line}`
}

// When the merged @include program fails to compile, Babel's position is
// often the END of the program — an unclosed brace consumes everything after
// it, so the parser only gives up at EOF, far from the mistake and always in
// merged-line numbering that matches no file the user can open (field report
// 2026-09-01: an error pinned to the blank last line of every script that
// pulled in one broken library). Re-parsing each spliced file on its own
// pinpoints the real one: a file that fails alone holds a genuine syntax
// error, and its positions need no mapping. If every file parses alone (the
// failure only emerges from the concatenation, e.g. an ASI edge at a file
// boundary), fall back to mapping the merged position.
async function locateCompileError (mergedCode, segments, e) {
  const mergedLines = String(mergedCode).split('\n')

  for (const seg of segments) {
    const part = mergedLines.slice(seg.startLine - 1, seg.startLine - 1 + seg.lineCount).join('\n')
    try {
      await transpileScript(part)
    } catch (partErr) {
      if (typeof partErr.scriptLine !== 'number') continue
      return {
        errorLine: seg.isMain ? partErr.scriptLine : null,
        errorWhere: seg.isMain ? `line ${partErr.scriptLine}` : `${seg.path} line ${partErr.scriptLine}`,
        // positions in a lone file are exact, so Babel's own message —
        // embedded code frame included — is right as it stands
        message: (partErr && partErr.message) || String(partErr)
      }
    }
  }

  const hit = locateMergedLine(segments, e.scriptLine)
  if (!hit) return { errorLine: null, errorWhere: null, message: null }
  const firstLine = String((e && e.message) || e).split('\n')[0].replace(/\s*\(\d+:\d+\)$/, '')
  const frame = frameMergedPosition(mergedCode, segments, e.scriptLine, e.scriptColumn)
  return {
    errorLine: hit.isMain ? hit.line : null,
    errorWhere: hit.isMain ? `line ${hit.line}` : `${hit.path} line ${hit.line}`,
    message: firstLine + (frame ? '\n\n' + frame : '') + (e.hint ? '\n\n' + e.hint : '')
  }
}

// Current line of the user's script, from the deepest stack node that carries
// a source location (loc is present because PARSE_OPTIONS.locations is set).
// Only nodes from the user program count (loc.source === 'code', set by the
// interpreter's parse_): the interpreter implements Array/String/JSON methods
// as its own JS polyfills, and while execution is inside one of those the top
// stack nodes carry line numbers of THAT source — reporting them made the
// step/pause UI show impossible lines ("paused at line 445"). Skipping them
// walks down to the user's call site instead.
function currentInterpLine (interp) {
  const stack = interp.getStateStack()
  for (let i = stack.length - 1; i >= 0; i--) {
    const node = stack[i].node
    if (node && node.loc && node.loc.source === 'code') {
      return node.loc.start.line
    }
  }
  return null
}

function currentScriptLine (interp) {
  const raw = currentInterpLine(interp)
  return raw === null ? null : toScriptLine(raw)
}

// ---------------------------------------------------------------------------
// shared plumbing: tab targeting, screenshots, auto-wait
// ---------------------------------------------------------------------------

// never target an extension page (e.g. the side panel opened as a tab)
const isWebTab = (t) => t && !/^(chrome|moz|edge)-extension:|^(chrome|about|edge):/.test(t.url || '')

// The script's pinned tab for this run. Re-resolving "the active tab" per
// command made scripts silently follow whatever became active between
// commands (leftover tab=open tabs, user clicks) — the classic player never
// does that: one play tab per session, moved only by selectWindow. Same
// rule here: pinned at the first command, changed only when a selectWindow
// bridge command retargets the play tab (see runOneCommand).
let scriptTabId = null

// The tab this run STARTED on. Relative `selectWindow tab=N` locators count
// from tabIds.firstPlay, and every bridge command is its own mini player run
// whose stop handler rebases firstPlay to the tab the command ended on
// (bg.js PANEL_STOP_PLAYING). A classic macro stops once, at the very end, so
// its base survives the whole run; without pinning it here the base moved one
// tab per command and `tab=1` meant "the tab after the previous command's
// tab" instead of "the first tab after the one the macro started on".
let scriptBaseTabId = null

// Settings the player re-seeds from the app config before EVERY bridge command
// (commonPlayerState builds `scope`, players.tsx prepare applies it), so a
// script's `uiv.setVar('!TIMEOUT_PAGELOAD', 60)` was silently gone by the next
// uiv call. Remember such writes and replay them as overrideScope, which
// commonPlayerState spreads last — the script's value then wins for the rest
// of the run, the way a classic macro's `store` does.
// !CVSCOPE is here for uiv.run('XDesktopAutomation', ...): the command writes
// the var, but every player-path command marks the session stale and the next
// startScriptSession re-seeded !CVSCOPE from config — silently dropping
// desktop mode, so ai.find/OCR captured the viewport again (real bug).
// !CAPTURE_HIDE_GUI (false = desktop captures show the extension UI, see
// shouldHideGuiDuringCapture) rides along for the same reason: the
// ClearSidebarLogViaGUI demos set it once at the top and every later
// desktop find must still see it.
const SCRIPT_SCOPE_KEYS = ['!TIMEOUT_PAGELOAD', '!TIMEOUT_WAIT', '!TIMEOUT_MACRO', '!TIMEOUT_DOWNLOAD', '!REPLAYSPEED', '!CVSCOPE', '!CAPTURE_HIDE_GUI']
let scriptScopeOverrides = {}

// Wall clock for the whole run, reported at the end the way a table macro
// reports its own ("Macro completed (Runtime 3.02s)") and published as
// !RUNTIME so a script can read its own elapsed time mid-run.
let scriptStartedAt = null

const scriptRuntimeMs = () => (scriptStartedAt === null ? 0 : Date.now() - scriptStartedAt)

// Per-run timing. A JS script is much slower per command than the same table
// macro, and reasoning about it from the code has been wrong twice — so every
// run now reports where its time actually went. One summary line in the log,
// per-command detail in the devtools console.
let perfStats = null

function perfReset () {
  perfStats = { n: 0, tab: 0, dispatch: 0, wait: 0, run: 0, total: 0, first: 0, max: 0, maxCmd: '' }
}

// the uiv.* spelling of a bridge op, for log lines a script author reads
// (OPEN-ISSUES 23.2) — '' for ops that have none (uiv.run keeps the classic name)
function uivNameForOp (op) {
  const map = {
    bClick: 'uiv.browser.click', bMove: 'uiv.browser.hover', bDown: 'uiv.browser.down', bUp: 'uiv.browser.up', bType: 'uiv.browser.type',
    xClick: 'uiv.desktop.mouse.click', xMove: 'uiv.desktop.mouse.move', xDown: 'uiv.desktop.down', xUp: 'uiv.desktop.up', xType: 'uiv.desktop.keyboard.type',
    domClickLocator: 'uiv.page.click', domClickAt: 'uiv.page.click', domType: 'uiv.page.fill', domTypeAt: 'uiv.page.fill', pageSelect: 'uiv.page.selectOption',
    open: 'uiv.goto', eval: 'uiv.evaluate', elementSearch: 'uiv.$', imageSearch: 'uiv.findImage', ocrRead: 'uiv.ocr.read', ocrFind: 'uiv.ocr.findText',
    download: 'uiv.download', downloadArm: 'uiv.download', downloadWait: 'uiv.download', screenshot: 'uiv.screenshot',
    tabsList: 'uiv.tabs.list', tabsSelect: 'uiv.tabs.select', tabsOpen: 'uiv.tabs.open', tabsClose: 'uiv.tabs.close', windowResize: 'uiv.window.resize', windowFocus: 'uiv.window.focus'
  }
  return map[op] || ''
}
let bridgeOpLabel = ''
// the uiv.* line logBridgeCall wrote for the op in flight ('' when it wrote
// none): the player's per-command "Executing: | saveItem | …" reflect line is
// skipped while this is set — the locator form of uiv.download used to log
// BOTH, and the second one named the very command the guide tells scripts
// never to use (OPEN-ISSUES 30.2)
let bridgeOpLogged = ''

function perfRecord (cmd, t) {
  if (!perfStats) return

  const startedAt = t.startedAt || t.dispatched
  const total = t.ended - t.begin

  perfStats.n += 1
  perfStats.tab += t.tabResolved - t.begin        // resolve + pin the tab
  perfStats.dispatch += t.dispatched - t.tabResolved  // build + dispatch playerPlay
  perfStats.wait += startedAt - t.dispatched      // dispatch -> the run starts
  perfStats.run += t.ended - startedAt            // the run itself
  perfStats.total += total

  if (perfStats.n === 1) perfStats.first = total
  if (total > perfStats.max) {
    perfStats.max = total
    perfStats.maxCmd = bridgeOpLabel || cmd
  }
}

// One line, written at the end of every run. Console logging is stripped from
// production builds, so the numbers have to travel in the log panel.
function perfSummary () {
  if (!perfStats || !perfStats.n) return

  const avg = (key) => Math.round(perfStats[key] / perfStats.n)

  store.dispatch(act.addLog(
    'info',
    `perf: ${perfStats.n} commands, avg ${avg('total')}ms each ` +
    `(tab ${avg('tab')}, dispatch ${avg('dispatch')}, wait-start ${avg('wait')}, run ${avg('run')}) — ` +
    `first ${perfStats.first}ms, slowest ${perfStats.maxCmd} ${perfStats.max}ms`
  ))
}

function rememberScriptScopeOverride (name, value) {
  const key = String(name).trim().toUpperCase()
  if (SCRIPT_SCOPE_KEYS.indexOf(key) !== -1) {
    scriptScopeOverrides[key] = value
  }
}

// Which-tab notice for a fallback pick (see below): when the pick happens for
// a command that does not USE the tab (tabFree — desktop scope, store/echo),
// saying "the macro plays tab X" would be wrong, so the notice is parked here
// and emitted by the first getTargetTab call that actually needs the tab.
let pendingTabPickNotice = null

async function getTargetTab (opts) {
  const tabFree = !!(opts && opts.tabFree)
  let lostPinReason = null
  if (scriptTabId !== null) {
    const pinned = await Ext.tabs.get(scriptTabId).catch(() => null)
    if (isWebTab(pinned)) {
      if (pendingTabPickNotice && !tabFree) {
        store.dispatch(act.addLog(pendingTabPickNotice.level, pendingTabPickNotice.msg))
        pendingTabPickNotice = null
      }
      return pinned
    }
    // re-resolve below — and SAY so: the fallback lands on the focused
    // window's active tab, i.e. whatever the user is looking at, and a run
    // that silently switches tabs mid-flight is a debugging trap
    lostPinReason = pinned ? 'previous pinned tab left the web (browser-internal page)' : 'previous pinned tab was closed'
    scriptTabId = null
  }

  // prefer the focused window's active tab (query without lastFocusedWindow
  // returns one active tab per window, in window order — not recency)
  let tab = null
  const focusedActiveRaw = await Ext.tabs.query({ active: true, lastFocusedWindow: true }).catch(() => [])
  const focusedActive = focusedActiveRaw.filter(isWebTab)
  if (focusedActive.length) tab = focusedActive[0]

  if (!tab) {
    const activeTabs = (await Ext.tabs.query({ active: true })).filter(isWebTab)
    tab = activeTabs.length ? activeTabs[0] : null
  }
  if (!tab) {
    tab = await getPlayTab().catch(() => null)
    if (!isWebTab(tab)) tab = null
  }
  if (!tab) {
    const all = (await Ext.tabs.query({})).filter(isWebTab)
    tab = all.length ? all[0] : null
  }

  if (tab) {
    scriptTabId = tab.id
    if (lostPinReason) {
      store.dispatch(act.addLog('info', `script tab → #${(tab.index || 0) + 1} "${(tab.title || tab.url || '').slice(0, 50)}" (${lostPinReason})`))
    } else if (!focusedActive.length) {
      // The tab the user is LOOKING AT is unusable (a browser/extension page,
      // or no focused window at all), so the run plays a tab they may not see
      // — possibly in an unfocused window, where pages even load invisibly.
      // Field data (OPEN-ISSUES #11) shows this silent fallback reads as
      // "the macro does nothing", so name the tab out loud, once per pin.
      const looking = focusedActiveRaw[0]
      const ownPage = looking && (looking.url || '').startsWith(Ext.runtime.getURL(''))
      const target = `the macro plays tab "${(tab.title || tab.url || '').slice(0, 50)}"${tab.active ? '' : ' (background)'}`
      let notice
      if (ownPage) {
        // run started from our own IDE window / panel / settings page — the
        // fallback IS the designed behavior, just say which tab was picked
        notice = { level: 'info', msg: `${target}.` }
      } else {
        const from = looking ? `the current tab is a browser page (${(looking.url || '').slice(0, 40)})` : 'no browser window has focus'
        notice = {
          level: 'warning',
          msg: `${from} — ${target} instead. Bring that tab to front to watch the run.`
        }
      }
      if (tabFree) {
        // this command never touches the tab (desktop scope, store/echo…) —
        // park the notice for the first command that does; a desktop-only
        // macro then never emits it at all
        pendingTabPickNotice = notice
      } else {
        store.dispatch(act.addLog(notice.level, notice.msg))
      }
    }
  }
  return tab
}

// A JavaScript run owns its tab independently of the classic player. Focus
// that exact tab; the classic background play tab can still name an older one.
// Preserve tab-free focus for a script which has not selected a web tab yet.
async function getWindowTargetTab () {
  if (scriptTabId !== null) {
    const tab = await Ext.tabs.get(scriptTabId).catch(() => null)
    if (tab) return tab
  }
  return getStartTabForOpen()
}

async function bringScriptWindowForward () {
  if (scriptTabId !== null) await activateTab(scriptTabId, true)
  else await csIpc.ask('PANEL_BRING_PLAYING_WINDOW_TO_FOREGROUND')
}

// Restore the run's base tab right before a command runs — bg rebases
// firstPlay whenever a player run (or the script session) STOPS, so the
// restore must happen after every stop that can still fire. If the base tab
// is gone (the script closed it via tab=close), the current tab becomes the
// new base — same as a classic run, where closing the start tab leaves the
// survivor as base.
async function restoreRunTabStateFor (tab) {
  if (!tab) return
  if (scriptBaseTabId !== null) {
    const baseAlive = await Ext.tabs.get(scriptBaseTabId).then(() => true, () => false)
    if (!baseAlive) scriptBaseTabId = null
  }
  if (scriptBaseTabId === null) scriptBaseTabId = tab.id

  const baseTabId = scriptBaseTabId
  await updateState(state => ({
    ...state,
    tabIds: { ...state.tabIds, toPlay: tab.id, firstPlay: baseTabId }
  }))
}

// Starting tab for `open` / `openBrowser`. Unlike every other command these
// may legitimately start on a browser-internal page (chrome://extensions,
// about:blank …): navigating away IS the command's job, and the player's
// prepare step has a dedicated path for it — load the URL into that tab, wait
// for the page, then skip re-running the command (run_command.ts:858).
//
// Handing it a freshly created about:blank tab instead took the OTHER branch:
// about:blank can never host a content script, so the IPC probe failed, the
// recovery path navigated the tab AND still let the open command run through
// the content script. That second navigation killed the IPC that had just
// connected, the retry loop kept re-navigating, and the run died on the 60s
// page-load timeout (Error #230). Classic table macros never hit this because
// they hand the player the active tab as-is, chrome:// page and all.
async function getStartTabForOpen () {
  const usable = (t) => t && !/^(chrome|moz|edge)-extension:/.test(t.url || '')

  const focused = (await Ext.tabs.query({ active: true, lastFocusedWindow: true }).catch(() => [])).filter(usable)
  if (focused.length) return focused[0]

  const active = (await Ext.tabs.query({ active: true }).catch(() => [])).filter(usable)
  if (active.length) return active[0]

  const all = (await Ext.tabs.query({}).catch(() => [])).filter(usable)
  return all.length ? all[0] : null
}

// Last resort for `open` when the browser has no usable tab at all: create one
// on the target URL and let it finish loading, so a content script is in place
// when the command runs. (Creating an about:blank tab here is what the comment
// above describes — it has no content script, ever.)
async function createTabForOpen (url) {
  const tab = await Ext.tabs.create({ url })
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    const t = await Ext.tabs.get(tab.id).catch(() => null)
    if (!t) return null
    if (t.status === 'complete') return t
    await delayMs(200)
  }
  return tab
}

// ---------------------------------------------------------------------------
// uiv.goto — native implementation
// ---------------------------------------------------------------------------
// Navigates the pinned tab with tabs.update and waits on the browser's own
// load state. The classic pipeline ran `open` THROUGH the page: the old
// page's content script scheduled the navigation (CS_LOAD_URL) and the panel
// then INFERRED completion from a changed content-script ipc secret — but the
// baseline it compared against stores the PRE-navigation secret
// (run_command.ts, lastCsIpcSecret), so on a reused tab the check could pass
// before the navigation even started. The script then drove the PREVIOUS page
// and the late reload wiped its work mid-run (seen live 2026-08-07: a
// pj-ranking macro filled its filters on the stale page, the delayed load
// reset them, tbody>tr never appeared). The background needs no old page and
// no inference: tabs.update starts the load, tab.status says when it is done.
// uiv.run('open', url) still takes the classic player path — the escape hatch.

// How long "tab says complete" keeps being treated as the OLD page's status.
// Right after tabs.update the tab still reports the previous page's
// 'complete' for a beat, so completion only counts once this navigation has
// been SEEN starting — or after this grace, which covers navigations that
// never produce load events at all (a pure #fragment move, a url that turns
// into a download).
const OPEN_NAV_DETECT_MS = 1500

async function waitForOpenLoad (tabId, url, navSeqBefore, seenLoading) {
  const capMs = (parseFloat(store.getState().config.timeoutPageLoad) || 60) * 1000
  const start = Date.now()
  let last = null
  while (Date.now() - start < capMs) {
    if (stopRequested) return { ok: false, error: 'Script stopped' }
    const t = await Ext.tabs.get(tabId).catch(() => null)
    if (!t) return { ok: false, error: 'uiv.goto: the tab was closed while the page was loading' }
    last = t
    // three detectors, because each can miss alone: status polling (misses
    // sub-50ms loads), pendingUrl (Chrome only), the run watcher's event
    // counter (absent when tabs.onUpdated is unavailable)
    if (t.status === 'loading' || t.pendingUrl || navSeq !== navSeqBefore) seenLoading = true
    if (t.status === 'complete' && !t.pendingUrl && (seenLoading || Date.now() - start >= OPEN_NAV_DETECT_MS)) {
      navPending = false
      return { ok: true }
    }
    await delayMs(50)
  }
  return { ok: false, error: `Error #230: Page load ${Math.round(capMs / 1000)} seconds time out — ${url} did not finish loading (tab status '${(last && last.status) || 'unknown'}')` }
}

async function nativeOpen (url, timing) {
  if (store.getState().player.status !== Player.C.STATUS.STOPPED) {
    return { ok: false, error: E900_PLAYER_BUSY }
  }

  // The classic path variable-rendered ${...} in the target on the way out;
  // this path takes the url as the JS value it already is. Refuse the syntax
  // rather than navigating to it literally.
  if (/\$\{[^}]*\}/.test(url)) {
    return { ok: false, error: `uiv.goto: '${url}' contains a \${...} token — a JS script passes values directly, e.g. uiv.goto('https://example.com/page/' + n)` }
  }

  let tab = await getTargetTab()
  let navigated = false // tab created ON the target url — no tabs.update needed

  // No usable web tab — create one on the target URL and let the common wait
  // below watch it load (same do-the-thing-that-cannot-get-stuck reasoning as
  // the classic prologue's createTabForOpen).
  if (!tab) {
    try {
      const created = await Ext.tabs.create({ url })
      if (created) {
        tab = created
        scriptTabId = created.id
        navigated = true
        store.dispatch(act.addLog('info', `No web tab open — created one for ${url}`))
      }
    } catch (e) { /* invalid url or no window — the paths below report it */ }
  }
  if (!tab) {
    tab = await getStartTabForOpen()
    if (tab) {
      scriptTabId = tab.id
      store.dispatch(act.addLog('info', `Starting from browser-internal page ${tab.url || '(no url)'}`))
    }
  }
  if (!tab) return { ok: false, error: E901_NO_TAB }

  // open's job is to SHOW a page — and Chrome throttles loading in background
  // tabs, so fronting the tab is also what keeps the load from crawling.
  // Check the WINDOW too: when the user's focused tab is unusable (e.g. the
  // settings page), the fallback tab is often the active tab of another,
  // unfocused window — `t.active` alone is true there and the page loaded
  // invisibly behind whatever the user was looking at (field report
  // 2026-08-27, BrowserClickAccuracyRange with options.html focused).
  try {
    const t = await Ext.tabs.get(tab.id)
    const win = await Ext.windows.get(t.windowId).catch(() => null)
    if (!t.active || (win && !win.focused)) {
      await activateTab(t.id, true)
      store.dispatch(act.addLog('info', `script tab → #${(t.index || 0) + 1} brought to front for open`))
    }
  } catch (e) { /* tab may be gone — the wait below reports it */ }

  await restoreRunTabStateFor(tab)
  timing.tabResolved = Date.now()

  // CS_LOAD_URL resolved relative urls against the current page; keep that
  const finalUrl = (() => {
    try { return new URL(url, tab.url || undefined).toString() } catch (e) { return url }
  })()

  const navSeqBefore = navSeq
  let seenLoading = navigated // a freshly created tab is already loading it
  timing.dispatched = Date.now()
  timing.startedAt = timing.dispatched

  if (!navigated) {
    let updated = null
    try {
      updated = await Ext.tabs.update(tab.id, { url: finalUrl })
    } catch (e) {
      return { ok: false, error: `uiv.goto: the browser rejected '${finalUrl}' — ${(e && e.message) || e}` }
    }
    // Chrome usually marks the pending navigation on the answer already —
    // seed the detector so an ultra-fast (cached) load cannot slip past the
    // first poll and pay the OPEN_NAV_DETECT_MS grace for nothing
    if (updated && (updated.status === 'loading' || updated.pendingUrl)) seenLoading = true
  }

  const r = await waitForOpenLoad(tab.id, finalUrl, navSeqBefore, seenLoading)
  if (!r.ok) return r

  // Give the new page's content script a beat to register before the first
  // page-touching command probes it. Best-effort and bounded: a page that
  // cannot host one (file: without access, the web store) lets the NEXT
  // command report the real problem. On a reused tab id the bg ipc cache
  // answers from the old entry anyway — the wait only earns its keep on a
  // brand-new tab.
  if (/^(https?|file):/i.test(finalUrl)) {
    await csIpc.ask('PANEL_CS_IPC_READY', { tabId: tab.id, timeout: 10000 }, 12000)
      .catch(() => { /* see above */ })
  }

  const loaded = await Ext.tabs.get(tab.id).catch(() => null)
  if (loaded) getVarsInstance().set({ '!URL': loaded.url || '' }, true)
  return { ok: true }
}

// same capture plumbing the panel app uses (index.js)
let captureService = null
function getCaptureService () {
  if (!captureService) {
    captureService = new CaptureScreenshotService({
      captureVisibleTab: (windowId, options) => csIpc.ask('PANEL_CAPTURE_VISIBLE_TAB', { windowId, options })
    })
  }
  return captureService
}

// ---------------------------------------------------------------------------
// Throttle-immune delay for the RUNNER's own pacing (sleeps, retry gaps,
// timed key presses). When the panel runs as a hidden TAB, Chrome throttles
// its timers — setTimeout(180) silently becomes ~1s, which wrecks every
// timing-sensitive macro (measured live). The background service worker's
// timers are not tab-throttled, so waits are delegated there; a local
// setTimeout is the fallback when the worker is unreachable. Drift is
// measured either way, and the first big drift logs a loud warning naming
// the cause instead of leaving "mysteriously late" runs to archaeology.
// ---------------------------------------------------------------------------
let warnedTimerDrift = false

async function runnerDelayMs (ms) {
  const t0 = Date.now()
  let mode = 'bg'
  try {
    // the bg handler caps at 5s; slice longer waits
    let left = ms
    while (left > 0) {
      const chunk = Math.min(5000, left)
      await csIpc.ask('PANEL_PRECISE_DELAY', { ms: chunk })
      left -= chunk
      if (stopRequested) return
    }
  } catch (e) {
    mode = 'local'
    await delayMs(Math.max(0, ms - (Date.now() - t0)))
  }
  const drift = Date.now() - t0 - ms
  if (!warnedTimerDrift && drift > Math.max(300, ms)) {
    warnedTimerDrift = true
    emitLogSafe(`W371: a ${ms}ms wait took ${ms + drift}ms (${mode} timer) — the browser is throttling the panel's timers, which usually means the Ui.Vision panel is a HIDDEN tab. Keep the panel visible (side panel, or its own window) while timing-sensitive macros run.`)
  }
}

function emitLogSafe (msg) {
  try { store.dispatch(act.addLog('warning', msg)) } catch (e) { /* logging only */ }
}

function defaultFindTimeoutS () {
  const s = parseFloat(store.getState().config.timeoutElement)
  return Number.isFinite(s) && s > 0 ? s : 10
}

// Auto-wait: retry `findOnce` (returns an array) until it yields >=1 match or
// the timeout expires. Throws on timeout unless required === false ([]).
// Errors that retrying cannot fix (missing image file etc.) rethrow at once.
// `describeEmpty` (optional) contributes extra diagnosis to the timeout
// message — e.g. "matches exist but are hidden".
// READING ORDER for finder results (findImages, ocr.findTexts): rows
// top-to-bottom, then left-to-right, so "the 3rd match" is the 3rd on
// screen. Rows are clustered by PROXIMITY — a match joins the current row
// while its centre is within half a match height of the row's first
// member — NOT by quantized bins: the old Math.round(y / rowH) sort put
// two words of ONE line into neighbouring bins whenever their centres
// straddled a bin edge (measured on macOS desktop OCR: x-order
// 159,499,665,329,840 for five identical words on a single line, caught
// by the OrderingCheck demo), and the Nth click landed on the wrong word.
function readingOrder (matches) {
  const byY = matches.slice().sort((a, b) => a.y - b.y)
  const rowOf = new Map()
  let row = -1
  let rowY = -Infinity
  for (const m of byY) {
    const tol = Math.max(1, ((m.rect && m.rect.height) || 0) / 2)
    if (m.y - rowY > tol) { row++; rowY = m.y }
    rowOf.set(m, row)
  }
  return byY.sort((a, b) => (rowOf.get(a) - rowOf.get(b)) || (a.x - b.x))
}

// A command-table macro (the classic JSON) pasted into a JS macro's Script
// field compiles as JavaScript and dies with "Syntax error: Missing semicolon
// (2:8)" — 1–3% of chats in the 2026-09-06 log drop, after which the model
// argues with the user about which format the editor "saved" (OPEN-ISSUES
// 35.4). Recognise it BEFORE compiling and say what it is. Tolerates a
// commented-out first line ("//{"), editor line numbers pasted along
// ("1\n{\n2\n\"Name\"…") and a bare fragment of a Commands list.
// Returns the error text, or null for anything that is not a table.
export function describeCommandTableScript (script) {
  let s = String(script || '').replace(/^\s*\/\/[ \t]*(?=\{)/, '').trim()
  if (!s.startsWith('{') && !/^\d+\s*\n\s*\{/.test(s)) return null
  const parse = (text) => { try { return JSON.parse(text) } catch (e) { return null } }
  let obj = parse(s)
  if (!obj) {
    // editor line numbers interleaved with the JSON lines
    const stripped = s.replace(/^\d+\s*\n/, '').replace(/\n\s*\d+\s*(?=\n)/g, '')
    obj = parse(stripped)
  }
  let n = null
  let name = ''
  if (obj && typeof obj === 'object' && Array.isArray(obj.Commands)) {
    n = obj.Commands.length
    name = typeof obj.Name === 'string' ? obj.Name : ''
  } else if (!obj && /^\{[\s\S]{0,400}"Command"\s*:/.test(s)) {
    n = (s.match(/"Command"\s*:/g) || []).length // a fragment: {Command…},{Command…}
  }
  if (n === null) return null
  return `this is a classic COMMAND-TABLE macro (JSON with ${n} command${n === 1 ? '' : 's'}${name ? `, "${name}"` : ''}) pasted into a JS script macro — it is not JavaScript, so it cannot run here. Either import it as a macro file (panel: Macros > Import), paste it into a command-table macro, or convert it to a JS script`
}

async function retryFind (findOnce, { timeoutS, required, label, retryDelayMs = 500, describeEmpty }) {
  // 0 is a real value: ONE look, no wait — the probe form {timeout: 0,
  // required: false} (OPEN-ISSUES 23.4); only undefined/null/NaN mean default
  const givenS = timeoutS != null && Number.isFinite(Number(timeoutS)) && Number(timeoutS) >= 0 ? Number(timeoutS) : null
  const timeoutMs = (givenS != null ? givenS : defaultFindTimeoutS()) * 1000
  const deadline = Date.now() + timeoutMs
  let lastError = null

  try {
    for (;;) {
      if (stopRequested) throw new Error('Script stopped')

      let matches = []
      try {
        matches = await findOnce()
        lastError = null
      } catch (e) {
        // errors retrying cannot fix fail immediately: missing image file,
        // OCR disabled/misconfigured, no tab
        if (/#121|No input image|E90[0-9]|enable OCR|OCR feature disabled|\bref=\d+( is unknown| is gone|: no refs exist)/i.test((e && e.message) || '')) throw e
        lastError = e
      }

      if (matches && matches.length) return matches

      if (Date.now() >= deadline) {
        if (required === false) return []
        // awaited: the image finder's diagnosis re-runs the search at the
        // lowest confidence to report how close the best candidate got
        const extra = describeEmpty ? await describeEmpty() : ''
        throw new Error(
          `${label}: nothing found within ${Math.round(timeoutMs / 1000)}s` +
          (extra ? ` — ${extra}` : '') +
          (lastError ? ` (last error: ${lastError.message})` : '')
        )
      }

      // countdown for the view — without it, auto-waiting looks like a hang
      emit('wait', { label, remainingS: Math.ceil((deadline - Date.now()) / 1000) })

      await runnerDelayMs(Math.min(retryDelayMs, Math.max(50, deadline - Date.now())))
    }
  } finally {
    emit('wait', null)
  }
}

// ---------------------------------------------------------------------------
// finder: elementSearch — DOM lookup injected into the page (top frame, v1)
// ---------------------------------------------------------------------------

// Serialized into the page by chrome.scripting; must be self-contained.
// Injected with {allFrames: true}: every frame runs this walker, but a frame
// only REPORTS if it is a "reporting root" — the top frame, or a frame whose
// parent cannot see it (a cross-origin boundary, where the extension has an
// agent inside even though page JS cannot pierce — the same federation trick
// the classic selectFrame machinery uses). Same-origin child frames return
// empty: their parent's walk already covers them with correct offsets.
// Matches from non-top roots carry frame-LOCAL coordinates and are marked
// frameLocal — uiv.browser.click routes those to a DOM click in the frame.
function pageElementSearch (locator, opts) {
  if (window !== window.top) {
    var parentAccessible = true
    try { void window.parent.document } catch (e) { parentAccessible = false }
    if (parentAccessible) return { ok: true, matches: [] }
  }
  var isTopRoot = (window === window.top)

  // Search contexts: the document, every OPEN shadow root, and every
  // SAME-ORIGIN frame/iframe document — all recursive (Playwright-style
  // piercing; frames stop being an API concept, like selectFrame never
  // existed). Each context carries the viewport offset of its containing
  // frame chain so child rects come back in TOP-viewport CSS pixels.
  // Invisible to this walk (vision finders cover those): closed shadow
  // roots, cross-origin frames.
  function collectContexts () {
    var out = []
    function walk (root, ox, oy) {
      out.push({ root: root, ox: ox, oy: oy })
      var all = root.querySelectorAll('*')
      for (var i = 0; i < all.length; i++) {
        var el = all[i]
        if (el.shadowRoot) walk(el.shadowRoot, ox, oy)
        var tag = el.tagName
        if (tag === 'IFRAME' || tag === 'FRAME') {
          var childDoc = null
          try { childDoc = el.contentDocument } catch (e) { childDoc = null } // cross-origin
          if (childDoc) {
            var fr = el.getBoundingClientRect()
            walk(childDoc, ox + fr.left + (el.clientLeft || 0), oy + fr.top + (el.clientTop || 0))
          }
        }
      }
    }
    walk(document, 0, 0)
    return out
  }

  // returns entries { el, ox, oy }
  function queryAll (selector) {
    var ctxs = collectContexts()
    var entries = []
    for (var i = 0; i < ctxs.length; i++) {
      var found = ctxs[i].root.querySelectorAll(selector)
      for (var j = 0; j < found.length; j++) {
        entries.push({ el: found[j], ox: ctxs[i].ox, oy: ctxs[i].oy })
      }
    }
    return entries
  }

  function cssEscape (v) {
    return (window.CSS && CSS.escape) ? CSS.escape(v) : v.replace(/(["\\#.;?&,\s])/g, '\\$1')
  }

  // set when a ref= was re-resolved after a re-render (OPEN-ISSUES 20.4);
  // travels back in the result so the panel can log it
  var refNote = ''

  // ---- accessible name and role, the way browser_snapshot's tree computes them ----
  // (Playwright's getByLabel / getByRole / getByText / getByPlaceholder /
  // getByTitle / getByAltText arrive here as by={"kind":…} — OPEN-ISSUES 30.18)
  function norm (s) { return String(s || '').replace(/\s+/g, ' ').trim() }
  function textMatches (have, want, exact) {
    have = norm(have); want = norm(want)
    if (!want) return false
    return exact ? have === want : have.toLowerCase().indexOf(want.toLowerCase()) >= 0
  }
  function ownText (el) {
    var out = ''
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) out += n.textContent
    return norm(out)
  }
  // innerText, not textContent: adjacent inline elements ("<span>Rechnung
  // </span><span>erstellen</span>", icon spans) read as one word in
  // textContent and as the displayed words in innerText — the tree names
  // come from the displayed text, so the finders must match them
  function shownText (el) {
    var t = el.innerText
    if (t === undefined || t === null || (t === '' && el.textContent)) t = el.textContent
    return norm(t)
  }
  function labelText (lab, control) {
    return shownText(lab)
  }
  function labelsOf (el) {
    var out = []
    var root = el.getRootNode ? el.getRootNode() : document
    if (el.id && root.querySelectorAll) {
      var fors = root.querySelectorAll('label[for="' + cssEscape(el.id) + '"]')
      for (var f = 0; f < fors.length; f++) out.push(labelText(fors[f], el))
    }
    var wrap = el.closest ? el.closest('label') : null
    if (wrap) out.push(labelText(wrap, el))
    var by = el.getAttribute('aria-labelledby')
    if (by) {
      var ids = by.split(/\s+/)
      for (var b = 0; b < ids.length; b++) { var ref = root.getElementById ? root.getElementById(ids[b]) : document.getElementById(ids[b]); if (ref) out.push(norm(ref.textContent)) }
    }
    var al = el.getAttribute('aria-label')
    if (al) out.push(norm(al))
    return out
  }
  function accName (el) {
    var labs = labelsOf(el)
    if (labs.length && labs[0]) return labs[0]
    var tag = el.tagName
    if (tag === 'IMG' || tag === 'AREA') return norm(el.getAttribute('alt'))
    if (tag === 'INPUT' && /^(button|submit|reset|image)$/i.test(el.type || '')) return norm(el.value || el.getAttribute('alt'))
    if (/^(BUTTON|A|SUMMARY|OPTION|LEGEND|TH|TD|H1|H2|H3|H4|H5|H6|LI|LABEL)$/.test(tag) || el.getAttribute('role')) {
      var t = shownText(el)
      if (t) return t
      var img = el.querySelector && el.querySelector('img[alt], svg title, [aria-label]')
      if (img) return norm(img.getAttribute('alt') || img.getAttribute('aria-label') || img.textContent)
    }
    return norm(el.getAttribute('title') || el.getAttribute('placeholder'))
  }
  function implicitRole (el) {
    var tag = el.tagName, type = (el.getAttribute('type') || 'text').toLowerCase()
    switch (tag) {
      case 'A': case 'AREA': return el.hasAttribute('href') ? 'link' : ''
      case 'BUTTON': return 'button'
      case 'INPUT':
        if (/^(button|submit|reset|image)$/.test(type)) return 'button'
        if (type === 'checkbox') return 'checkbox'
        if (type === 'radio') return 'radio'
        if (type === 'range') return 'slider'
        if (type === 'number') return 'spinbutton'
        if (type === 'search') return 'searchbox'
        if (/^(hidden)$/.test(type)) return ''
        return el.hasAttribute('list') ? 'combobox' : 'textbox'
      case 'TEXTAREA': return 'textbox'
      case 'SELECT': return el.multiple || el.size > 1 ? 'listbox' : 'combobox'
      case 'OPTION': return 'option'
      case 'IMG': return 'img'
      case 'H1': case 'H2': case 'H3': case 'H4': case 'H5': case 'H6': return 'heading'
      case 'UL': case 'OL': return 'list'
      case 'LI': return 'listitem'
      case 'TABLE': return 'table'
      case 'TR': return 'row'
      case 'TH': return /^(row|rowgroup)$/i.test(el.getAttribute('scope') || '') ? 'rowheader' : 'columnheader'
      case 'TD': return 'cell'
      case 'NAV': return 'navigation'
      case 'MAIN': return 'main'
      case 'FORM': return 'form'
      case 'DIALOG': return 'dialog'
      case 'SUMMARY': return 'button'
      case 'PROGRESS': return 'progressbar'
      case 'HR': return 'separator'
      case 'ARTICLE': return 'article'
      case 'ASIDE': return 'complementary'
      case 'HEADER': return 'banner'
      case 'FOOTER': return 'contentinfo'
      case 'SECTION': return 'region'
      default: return ''
    }
  }
  function roleOf (el) {
    var r = (el.getAttribute('role') || '').trim().split(/\s+/)[0]
    return r ? r.toLowerCase() : implicitRole(el)
  }
  function resolveBy (spec) {
    var out = [], all, i, el
    var want = spec.text != null ? String(spec.text) : ''
    var exact = !!spec.exact
    switch (spec.kind) {
      case 'label':
        all = queryAll('input:not([type=hidden]), select, textarea, button, [role=textbox], [role=combobox], [role=listbox], [role=checkbox], [role=radio], [role=switch], [role=slider], [role=spinbutton], [role=searchbox], [contenteditable=true], [contenteditable=""]')
        for (i = 0; i < all.length; i++) {
          var labs = labelsOf(all[i].el)
          for (var l = 0; l < labs.length; l++) if (textMatches(labs[l], want, exact)) { out.push(all[i]); break }
        }
        break
      case 'role': {
        var role = String(spec.role || '').toLowerCase()
        all = queryAll('*')
        for (i = 0; i < all.length; i++) {
          el = all[i].el
          if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue
          if (roleOf(el) !== role) continue
          if (spec.name != null && String(spec.name) !== '' && !textMatches(accName(el), String(spec.name), exact)) continue
          out.push(all[i])
        }
        break
      }
      case 'text': {
        all = queryAll('*')
        var innermost = []
        for (i = 0; i < all.length; i++) {
          el = all[i].el
          if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|HTML|HEAD|BODY)$/.test(el.tagName)) continue
          if (textMatches(ownText(el), want, exact) || (el.children.length === 0 && textMatches(shownText(el), want, exact))) out.push(all[i])
          else if (textMatches(shownText(el), want, exact)) innermost.push(all[i])
        }
        if (!out.length) {
          // no element holds the text in its own text nodes (it spans
          // children): the innermost elements that contain it
          for (i = 0; i < innermost.length; i++) {
            var deeper = false
            for (var j = 0; j < innermost.length; j++) if (j !== i && innermost[i].el !== innermost[j].el && innermost[i].el.contains(innermost[j].el)) { deeper = true; break }
            if (!deeper) out.push(innermost[i])
          }
        }
        break
      }
      case 'testid':
        all = queryAll('[data-testid], [data-test-id], [data-test]')
        for (i = 0; i < all.length; i++) { el = all[i].el; if (textMatches(el.getAttribute('data-testid') || el.getAttribute('data-test-id') || el.getAttribute('data-test'), want, exact)) out.push(all[i]) }
        break
      case 'placeholder':
        all = queryAll('[placeholder]')
        for (i = 0; i < all.length; i++) if (textMatches(all[i].el.getAttribute('placeholder'), want, exact)) out.push(all[i])
        break
      case 'title':
        all = queryAll('[title]')
        for (i = 0; i < all.length; i++) if (textMatches(all[i].el.getAttribute('title'), want, exact)) out.push(all[i])
        break
      case 'alt':
        all = queryAll('img[alt], area[alt], input[type=image][alt], [role=img][aria-label]')
        for (i = 0; i < all.length; i++) if (textMatches(all[i].el.getAttribute('alt') || all[i].el.getAttribute('aria-label'), want, exact)) out.push(all[i])
        break
      default:
        throw new Error('by= locator: unknown kind "' + spec.kind + '"')
    }
    return out
  }

  function resolveElements (loc) {
    var m = /^([A-Za-z]+)=([\s\S]*)$/.exec(loc)
    var strategy = m ? m[1].toLowerCase() : (/^\s*[(/]{1}/.test(loc) ? 'xpath' : 'css')
    var value = m ? m[2] : loc
    var entries = []
    var i
    switch (strategy) {
      case 'by': {
        var spec
        try { spec = JSON.parse(value) } catch (e) { throw new Error('by= locator: not valid JSON — use uiv.getByRole / getByLabel / getByText / getByPlaceholder / getByTitle / getByAltText, which build it') }
        entries = resolveBy(spec)
        break
      }
      case 'id':
        entries = queryAll('#' + cssEscape(value))
        break
      case 'name':
        entries = queryAll('[name="' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]')
        break
      // Exact anchor text only — there is deliberately no partialLink=
      // strategy, because xpath already covers substrings and one locator
      // vocabulary beats two. The matching form is
      //   xpath=//a[contains(normalize-space(.), 'text')]
      // NOT contains(text(), ...), which reads only the first direct text node
      // (so <a><span>Buy</span></a> misses) and does not collapse whitespace.
      // This case compares the anchor's whole textContent, normalized, so it
      // handles both of those for the exact-match case.
      case 'link': {
        var anchors = queryAll('a')
        var wanted = value.replace(/\s+/g, ' ').trim()
        for (i = 0; i < anchors.length; i++) {
          var t = (anchors[i].el.textContent || '').replace(/\s+/g, ' ').trim()
          if (t === wanted) entries.push(anchors[i])
        }
        break
      }
      // Selenium-IDE spellings, NOT script strategies — without these cases
      // they fall through to querySelectorAll('linkText=...'), which fails
      // as an invalid CSS selector after burning the whole auto-wait
      case 'linktext':
      case 'partiallinktext':
        throw new Error("'" + strategy + "=' is not a JS-script locator - use link=... for the exact anchor text, or xpath=//a[contains(normalize-space(.), '...')] for a partial match")
      case 'xpath': {
        // XPath pierces same-origin frame documents but not shadow trees
        // (document.evaluate needs a Document; shadow roots aren't one)
        var ctxs = collectContexts()
        for (var c = 0; c < ctxs.length; c++) {
          if (ctxs[c].root.nodeType !== 9) continue
          var doc = ctxs[c].root
          var it = doc.evaluate(value, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
          for (i = 0; i < it.snapshotLength; i++) {
            var node = it.snapshotItem(i)
            if (node && node.nodeType === 1) entries.push({ el: node, ox: ctxs[c].ox, oy: ctxs[c].oy })
          }
        }
        break
      }
      // ref=N — an element browser_snapshot / screenshot marks numbered earlier in
      // this page load. The number -> element table (window.__uivRefs) is
      // per frame in the extension's isolated world; browser_snapshot walks
      // same-origin child frames from the top frame, so their elements sit
      // in the TOP frame's table and get their frame offset applied here.
      // A cross-origin frame keeps its own table and answers for itself.
      case 'ref': {
        var refStore = window.__uivRefs
        var refNo = parseInt(value, 10)
        var refEl = refStore && refStore.map ? refStore.map.get(refNo) : null
        if (!refEl) {
          // another reporting root may own this number — always for a
          // rebased (>= 1000) cross-origin ref (OPEN-ISSUES 24.1)
          if (!isTopRoot || refNo >= 1000) break
          throw new Error(refStore
            ? 'ref=' + value + ' is unknown in this page - refs are numbered by browser_snapshot and renumbered on navigation: call browser_snapshot again'
            : 'ref=' + value + ': no refs exist yet in this page - call browser_snapshot (or screenshot {marks: "elements"}) first; refs die on navigation')
        }
        if (!refEl.isConnected) {
          // re-rendered under a new node: adopt it by stable id or unique
          // identity (OPEN-ISSUES 20.4) — only a real disappearance fails
          var rr = typeof refStore.resolve === 'function' ? refStore.resolve(refNo) : null
          if (!rr || !rr.el) {
            var why = rr && rr.how === 'ambiguous'
              ? ' and ' + rr.count + ' live elements look alike (' + rr.label + ')'
              : ' and no live element with the same tag, id or label exists'
            throw new Error('ref=' + value + ' is gone - the page re-rendered that element after browser_snapshot' + why + '; call browser_snapshot again')
          }
          refEl = rr.el
          refNote = 'ref=' + value + ' was re-rendered by the page — re-resolved by its ' + (rr.how === 'id' ? 'id' : 'identity') + ' (' + rr.label + ')'
        }
        var rox = 0
        var roy = 0
        var fw = refEl.ownerDocument && refEl.ownerDocument.defaultView
        try {
          while (fw && fw !== window && fw.frameElement) {
            var fe = fw.frameElement
            var frr = fe.getBoundingClientRect()
            rox += frr.left + (fe.clientLeft || 0)
            roy += frr.top + (fe.clientTop || 0)
            fw = fw.parent
          }
        } catch (e) { /* cross-origin boundary: keep what we have */ }
        entries.push({ el: refEl, ox: rox, oy: roy })
        break
      }
      case 'css':
      default:
        entries = queryAll(strategy === 'css' ? value : loc)
    }
    return entries
  }

  function isVisible (el, rect) {
    if (rect.width <= 0 || rect.height <= 0) return false
    var style = window.getComputedStyle(el)
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
  }

  // one measured pass: resolve + shift rects into top-viewport coordinates.
  // Skipped-but-existing hidden elements are COUNTED — "your element exists
  // but is invisible" is the single most useful diagnosis when a responsive
  // layout collapses something behind a toggle (narrow viewports are the
  // norm here: the side panel takes width from the page).
  function snapshot () {
    var entries = resolveElements(locator)
    var withRects = []
    var hiddenCount = 0
    for (var i = 0; i < entries.length; i++) {
      var el = entries[i].el
      var rc = el.getBoundingClientRect()
      var visible = isVisible(el, rc)
      var viaLabel = false
      if (!visible && !(opts && opts.includeHidden)) {
        // a styled radio/checkbox hides its <input> behind a visible <label>
        // (Postbank's export dialog, most design systems): the label IS the
        // clickable thing — take it, and say so (OPEN-ISSUES 30.9)
        var lab = null
        if (!(opts && opts.scrollIntoViewIfNeeded) && el.tagName === 'INPUT' && /^(radio|checkbox)$/i.test(el.type || '')) {
          if (el.id && window.CSS && CSS.escape) lab = document.querySelector('label[for="' + CSS.escape(el.id) + '"]')
          if (!lab && el.closest) lab = el.closest('label')
          if (lab) {
            var lrc = lab.getBoundingClientRect()
            if (isVisible(lab, lrc)) { el = lab; rc = lrc; visible = true; viaLabel = true }
            else lab = null
          }
        }
        if (!lab) {
          hiddenCount++
          continue
        }
      }
      withRects.push({
        el: el,
        viaLabel: viaLabel,
        visible: visible,
        rect: {
          left: rc.left + entries[i].ox,
          top: rc.top + entries[i].oy,
          width: rc.width,
          height: rc.height
        }
      })
    }
    return { withRects: withRects, hiddenCount: hiddenCount }
  }

  try {
    var snap = snapshot()
    var withRects = snap.withRects

    if (opts && opts.scrollIntoViewIfNeeded) {
      var chosen = withRects[opts.index || 0];
      if (!chosen) return { ok: true, matches: [] };
      var elToScroll = chosen.el;
      // IntersectionObserver includes clipping by nested scroll containers.
      // BoundingClientRect vs window alone misses an element clipped by a panel.
      return new Promise(function (resolve) {
        var observer = new IntersectionObserver(function (entries) {
          clearTimeout(timer); observer.disconnect(); resolve(entries[0].intersectionRatio);
        });
        var timer = setTimeout(function () { observer.disconnect(); resolve(null); }, opts.observationTimeout || 1000);
        observer.observe(elToScroll);
      }).then(function (ratio) {
        if (ratio === null) return { ok: false, retryable: true, error: 'scrollIntoViewIfNeeded: the page did not provide a layout observation' };
        if (!elToScroll.isConnected) return { ok: true, matches: [] };
        if (ratio < 1) elToScroll.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        return { ok: true, matches: [{}] };
      }).catch(function (error) { return { ok: false, error: String(error) }; });
    }

    // default: bring the first match into view, then re-measure everything
    // (coordinates are only click-valid for elements inside the viewport).
    // scrollIntoView propagates through same-origin ancestor frames, so
    // frame offsets change too — a full re-snapshot re-derives them.
    var scrollDefeated = false
    var isOut = function (r) {
      return r.top < 0 || r.left < 0 ||
        (r.top + r.height) > window.innerHeight || (r.left + r.width) > window.innerWidth
    }
    if (withRects.length && (!opts || opts.scroll !== false)) {
      if (isOut(withRects[0].rect)) {
        withRects[0].el.scrollIntoView({ block: 'center', inline: 'center' })
        snap = snapshot()
        withRects = snap.withRects
        // scrollIntoView is a spec'd NO-OP for elements in a position:fixed
        // subtree — seen live on pj-ranking.de's mobile layout, where the
        // submit button sits in a fixed filter form TALLER than the window:
        // nothing can ever scroll it into the viewport. Mark the match, so
        // the click refuses with the real reason instead of scrolling the
        // window under the fixed overlay and hitting whatever shows through.
        if (withRects.length && isOut(withRects[0].rect)) scrollDefeated = true
      }
    }

    var matches = []
    for (var k = 0; k < withRects.length; k++) {
      var el = withRects[k].el
      var rc = withRects[k].rect
      // every attribute travels with the snapshot, so m.getAttribute (attached
      // interpreter-side) can answer without a live handle — same find-time
      // copy contract as .text/.value, 2000-char cap per attribute value
      var attrs = {}
      for (var an = 0; el.attributes && an < el.attributes.length; an++) {
        attrs[el.attributes[an].name] = String(el.attributes[an].value).slice(0, 2000)
      }
      // .text is a find-time COPY: capped, and the cut is MARKED so a reader
      // cannot mistake the head of a long page for the whole page (a payments
      // list read through uiv.$('xpath=//body').text showed 5 of 20 entries
      // and looked complete — OPEN-ISSUES 30.14). Whole-page containers get a
      // wider cap; anything longer is read with uiv.evaluate.
      var rawText = ((el.innerText !== undefined ? el.innerText : el.textContent) || '').trim()
      var textCap = /^(BODY|MAIN|ARTICLE|HTML)$/.test(el.tagName || '') ? 20000 : 2000
      // Isolated-world registry: retain identity without adding attributes to the page.
      // Bounded and weak: removed DOM nodes are not retained by long chats.
      var registry = window.__uivElementTargets;
      if (!registry) registry = window.__uivElementTargets = { ids: new WeakMap(), nodes: new Map(), next: 0, epoch: Math.random().toString(36).slice(2) };
      var elementId = registry.ids.get(el);
      if (!elementId || !registry.nodes.has(elementId)) {
        elementId = registry.epoch + ':' + (++registry.next);
        registry.ids.set(el, elementId);
        registry.nodes.set(elementId, { ref: new WeakRef(el) });
        if (registry.nodes.size > 2048) registry.nodes.delete(registry.nodes.keys().next().value);
      }
      var m = {
        elementId: elementId,
        elementSignature: JSON.stringify([el.id, el.getAttribute('name'), el.getAttribute('href'), rawText.slice(0, 2000)]),
        x: Math.round(rc.left + rc.width / 2),
        y: Math.round(rc.top + rc.height / 2),
        rect: { left: Math.round(rc.left), top: Math.round(rc.top), width: Math.round(rc.width), height: Math.round(rc.height) },
        text: rawText.length > textCap ? rawText.slice(0, textCap) + ' …[cut at ' + textCap + ' chars, ' + (rawText.length - textCap) + ' more — read long text with uiv.evaluate("return document.querySelector(sel).innerText")]' : rawText,
        // .value: a form field can hold a whole document (a forum post in a
        // composer textarea), and a script that reads it, edits it and fills
        // it back MUST get all of it — a silent 2000-char slice here shortened
        // a 2697-char forum post to its first 2000 chars on 2026-09-06 (found
        // 2026-09-10, OPEN-ISSUES 50). Wide cap, and the cut is MARKED like
        // .text so a round trip can never look complete when it is not.
        value: el.value !== undefined ? (function (v) {
          var valueCap = 20000
          return v.length > valueCap ? v.slice(0, valueCap) + ' …[cut at ' + valueCap + ' chars, ' + (v.length - valueCap) + ' more — read a long value with uiv.evaluate("return document.querySelector(sel).value")]' : v
        })(String(el.value)) : undefined,
        tag: (el.tagName || '').toLowerCase(),
        attributes: attrs,
        visible: withRects[k].visible,
        // the box's state — read off the box a <label> / wrapper / labelling
        // text BELONGS to when the match itself is not one (Playwright's
        // retargeting; 12 chats hit "this label is not a checkbox" in the
        // 09-09 proxy drop, OPEN-ISSUES 44.5)
        checked: (function (e) {
          var isBox = function (x) { return !!(x && x.tagName && ((x.tagName === 'INPUT' && /^(checkbox|radio)$/i.test(x.type || '')) || /^(checkbox|radio|switch|menuitemcheckbox|menuitemradio)$/.test((x.getAttribute && x.getAttribute('role')) || ''))) }
          var box = isBox(e) ? e : null
          if (!box && e.closest) { var lab = e.closest('label'); if (lab && lab.control && isBox(lab.control)) box = lab.control }
          if (!box && e.querySelectorAll) { var inner = e.querySelectorAll('input[type=checkbox],input[type=radio],[role=checkbox],[role=radio],[role=switch]'); if (inner.length === 1) box = inner[0] }
          if (!box && e.id) { var by = document.querySelector('[aria-labelledby~="' + e.id.replace(/"/g, '\\"') + '"]'); if (isBox(by)) box = by }
          if (!box) return undefined
          return box.tagName === 'INPUT' && box.checked !== undefined ? !!box.checked : box.getAttribute('aria-checked') === 'true'
        })(el),
        disabled: !!(el.disabled || el.getAttribute('aria-disabled') === 'true'),
        // frame-local coordinates (cross-origin root): click via DOM path
        frameLocal: !isTopRoot
      }
      if (k === 0 && scrollDefeated) m.offscreen = true
      if (withRects[k].viaLabel) m.viaLabel = true
      matches.push(m)
    }
    // a minimized window (or one without layout) measures every element as
    // 0×0 — that is not "hidden behind a toggle" (OPEN-ISSUES 30.10)
    var noLayout = (window === window.top) && (window.innerWidth === 0 || window.innerHeight === 0)
    return { ok: true, matches: matches, hiddenCount: snap.hiddenCount, noLayout: noLayout || undefined, note: refNote || undefined }
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) }
  }
}

// Serialized into the page (top frame): set a checkbox / radio / ARIA switch
// to a wanted state — uiv.page.check / uncheck / setChecked (OPEN-ISSUES 44.5).
// The point ("point=x,y", top-viewport CSS px) is resolved like
// pageSelectOption; whatever sits there is walked to its control: the input
// itself, a <label>'s .control, the single box inside a wrapper, the element
// an aria-labelledby names, or an enclosing role=checkbox/radio/switch. The
// change is made the way a user makes it — a click on the control — and only
// when that did not take (framework-controlled inputs), by setting .checked
// and firing input+change. A radio cannot be unchecked (Playwright's rule).
function pageSetChecked (locator, wanted) {
  try {
    if (window !== window.top) return { found: false }
    var m = /^point=([\s\S]*)$/.exec(locator)
    if (!m) return { found: true, ok: false, error: 'uiv.page.setChecked: internal - expected a point locator' }
    var pt = m[1].split(',')
    var px = parseFloat(pt[0])
    var py = parseFloat(pt[1])
    var at = document.elementFromPoint(px, py)
    for (;;) {
      while (at && at.shadowRoot) {
        var inner = at.shadowRoot.elementFromPoint(px, py)
        if (!inner || inner === at) break
        at = inner
      }
      var ftag = at && at.tagName ? at.tagName.toLowerCase() : ''
      if ((ftag === 'iframe' || ftag === 'frame') && at.contentDocument) {
        var fr = at.getBoundingClientRect()
        px = px - fr.left - (at.clientLeft || 0)
        py = py - fr.top - (at.clientTop || 0)
        at = at.contentDocument.elementFromPoint(px, py)
        continue
      }
      break
    }
    if (!at) return { found: true, ok: false, error: 'no element at point ' + m[1] + ' any more - the match is STALE: the page scrolled, re-rendered or navigated between the finder and this call. Find it again right before acting' }
    var isBox = function (x) {
      if (!x || !x.tagName) return false
      if (x.tagName === 'INPUT' && /^(checkbox|radio)$/i.test(x.type || '')) return true
      var role = x.getAttribute ? (x.getAttribute('role') || '') : ''
      return /^(checkbox|radio|switch|menuitemcheckbox|menuitemradio)$/.test(role)
    }
    var el = null
    if (isBox(at)) el = at
    if (!el && at.closest) { var lab = at.closest('label'); if (lab && lab.control && isBox(lab.control)) el = lab.control }
    if (!el && at.querySelectorAll) { var boxes = at.querySelectorAll('input[type=checkbox],input[type=radio],[role=checkbox],[role=radio],[role=switch]'); if (boxes.length === 1) el = boxes[0] }
    if (!el && at.id) { var by = document.querySelector('[aria-labelledby~="' + at.id.replace(/"/g, '\\"') + '"]'); if (isBox(by)) el = by }
    if (!el && at.closest) el = at.closest('[role=checkbox],[role=radio],[role=switch]')
    if (!el) return { found: true, ok: false, error: 'E903: the element at ' + m[1] + ' is <' + (at.tagName || '?').toLowerCase() + '> and no checkbox belongs to it (not a box, not a label of one, no single box inside it) - find the input itself, e.g. uiv.$(\'css=input[type=checkbox]\') or the role=checkbox node from browser_snapshot' }
    var state = function () { return el.checked !== undefined && el.tagName === 'INPUT' ? !!el.checked : el.getAttribute('aria-checked') === 'true' }
    var tag = (el.tagName || '').toLowerCase() + (el.type ? '[' + String(el.type).toLowerCase() + ']' : (el.getAttribute('role') ? '[role=' + el.getAttribute('role') + ']' : ''))
    var before = state()
    if (before === !!wanted) return { found: true, ok: true, tag: tag, changed: false }
    if (!wanted && el.tagName === 'INPUT' && /^radio$/i.test(el.type || '')) {
      return { found: true, ok: false, error: 'uiv.page.uncheck: a radio button cannot be unchecked - check another radio of the same group instead' }
    }
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') {
      return { found: true, ok: false, error: 'uiv.page.setChecked: the ' + tag + ' is disabled - the page does not let it be changed right now' }
    }
    try { el.click() } catch (e1) { /* fall through to the property route */ }
    if (state() !== !!wanted && el.tagName === 'INPUT') {
      el.checked = !!wanted
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }
    if (state() !== !!wanted) {
      return { found: true, ok: false, error: 'uiv.page.setChecked: clicked the ' + tag + ' but it stayed ' + (before ? 'checked' : 'unchecked') + ' - the page reverted it (a controlled widget, or a handler that refused). Try uiv.browser.click on it, or look for the widget\'s own control' }
    }
    return { found: true, ok: true, tag: tag, changed: true }
  } catch (e) {
    return { found: true, ok: false, error: 'uiv.page.setChecked: ' + ((e && e.message) || String(e)) }
  }
}

// Serialized into the page (every frame): pick an option in a native
// <select>. Works even when the select is visually hidden behind a custom
// skin. Fires input+change (the framework-event recipe); failure results
// carry ACTIONABLE errors: the available options on a label mismatch, and
// a custom-widget recipe when the element is not a <select> at all.
function pageSelectOption (locator, option) {
  try {
    var m = /^([A-Za-z]+)=([\s\S]*)$/.exec(locator)
    var strategy = m ? m[1].toLowerCase() : 'css'
    var value = m ? m[2] : locator
    var el = null
    if (strategy === 'point') {
      // a finder match ("point=x,y" in top-viewport CSS px, OPEN-ISSUES
      // 35.8): the <select> under the point, or the one a label / wrapper
      // at the point belongs to. Only the top frame resolves a top-viewport
      // point; same-origin frames are descended into like pageDomClickAt.
      if (window !== window.top) return { found: false }
      var pt = value.split(',')
      var px = parseFloat(pt[0])
      var py = parseFloat(pt[1])
      var at = document.elementFromPoint(px, py)
      for (;;) {
        while (at && at.shadowRoot) {
          var inner = at.shadowRoot.elementFromPoint(px, py)
          if (!inner || inner === at) break
          at = inner
        }
        var ftag = at && at.tagName ? at.tagName.toLowerCase() : ''
        if ((ftag === 'iframe' || ftag === 'frame') && at.contentDocument) {
          var fr = at.getBoundingClientRect()
          px = px - fr.left - (at.clientLeft || 0)
          py = py - fr.top - (at.clientTop || 0)
          at = at.contentDocument.elementFromPoint(px, py)
          continue
        }
        break
      }
      if (!at) return { found: true, ok: false, error: 'no element at point ' + value + ' any more - the match is STALE: the page scrolled, re-rendered or navigated between the finder and this call. Re-run the finder right before selecting' }
      el = at.closest ? at.closest('select') : null
      if (!el) {
        var lab = at.closest ? at.closest('label') : null
        if (lab && lab.control && (lab.control.tagName || '').toLowerCase() === 'select') el = lab.control
      }
      if (!el && at.querySelectorAll) {
        var sels = at.querySelectorAll('select')
        if (sels.length === 1) el = sels[0]
      }
      if (!el) return { found: true, ok: false, error: 'E903: the match at ' + value + ' is <' + (at.tagName || '?').toLowerCase() + '>, not a native <select> - it is a custom dropdown widget: uiv.page.click it open first, then click the option (as text or by locator)' }
    } else if (strategy === 'id') el = document.getElementById(value)
    else if (strategy === 'name') el = document.getElementsByName(value)[0] || null
    else if (strategy === 'xpath') {
      var r = document.evaluate(value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      el = r.singleNodeValue
    } else el = document.querySelector(value)

    if (!el) return { found: false }
    if (!el.options || (el.tagName || '').toLowerCase() !== 'select') {
      return { found: true, ok: false, error: "E903: element <" + (el.tagName || '?').toLowerCase() + "> is not a native <select> - it is a custom dropdown widget: uiv.page.click it open first, then click the option by its own locator or visible text" }
    }

    var opt = String(option)
    var byValue = /^value=/.test(opt)
    var byIndex = /^index=(\d+)$/.exec(opt)
    var wanted = opt.replace(/^(label=|value=)/, '').trim()
    var labels = []
    var hit = null
    for (var i = 0; i < el.options.length; i++) {
      var o = el.options[i]
      var label = (o.label || o.text || '').trim()
      labels.push(label)
      if (byIndex ? i === parseInt(byIndex[1], 10)
        : byValue ? o.value === wanted
          : label === wanted) { if (!hit) hit = o }
    }
    if (!hit) return { found: true, ok: false, error: "option '" + option + "' not found - available options: " + labels.join(' | ') }

    el.value = hit.value
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return { found: true, ok: true, value: hit.value, label: (hit.label || hit.text || '').trim() }
  } catch (e) {
    return { found: true, ok: false, error: (e && e.message) || String(e) }
  }
}

// DOM click executed INSIDE a specific frame at frame-local coordinates —
// classic-`click`-command parity for cross-origin frame matches. Focuses the
// element too, so a following uiv.browser.type (CDP keys go to the focused
// element, whatever frame it is in) works cross-frame.
// NOTE: pageDomClickAt / pageTypeAt are serialized into the page one at a
// time (chrome.scripting func injection) — they must stay fully
// self-contained, hence the duplicated scroll block in both.
function pageDomClickAt (x, y, expectTag, offscreen, elementId, offset, elementSignature) {
  try {
    var intended = null;
    if (elementId) {
      var saved = window.__uivElementTargets && window.__uivElementTargets.nodes.get(elementId);
      intended = saved && saved.ref.deref();
      if (!intended || !intended.isConnected) return { ok: false, error: 'The DOM target was removed, replaced or expired. Find the intended element again before acting; no action was performed.' };
      var currentText = ((intended.innerText !== undefined ? intended.innerText : intended.textContent) || '').trim();
      if (elementSignature && JSON.stringify([intended.id, intended.getAttribute('name'), intended.getAttribute('href'), currentText.slice(0, 2000)]) !== elementSignature)
        return { ok: false, error: 'The DOM target identity or text changed since it was found. Find the intended element again; no action was performed.' };
      intended.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      var box = intended.getBoundingClientRect();
      x = box.left + box.width / 2 + (offset && Number(offset.dx) || 0);
      y = box.top + box.height / 2 + (offset && Number(offset.dy) || 0);
      if (!box.width || !box.height || intended.disabled || intended.getAttribute('aria-disabled') === 'true') return { ok: false, error: 'The intended DOM target is hidden or disabled; no action was performed.' };
      // Validate covering elements in each same-origin ancestor frame as well.
      var child = intended.ownerDocument.defaultView;
      var parentX = x, parentY = y;
      while (child && child !== window) {
        var frame = child.frameElement;
        if (!frame) break;
        var rect = frame.getBoundingClientRect();
        parentX += rect.left + (frame.clientLeft || 0); parentY += rect.top + (frame.clientTop || 0);
        var cover = frame.ownerDocument.elementFromPoint(parentX, parentY);
        while (cover && cover.shadowRoot) { var innerCover = cover.shadowRoot.elementFromPoint(parentX,parentY); if (!innerCover || innerCover === cover) break; cover = innerCover; }
        if (cover !== frame) return { ok: false, error: 'The frame containing the intended target is covered; no action was performed.' };
        child = child.parent;
      }
      offscreen = false;
    }

    // A match the finder could not scroll into the viewport (position:fixed
    // container larger than the window — a broken mobile layout; a human in
    // this window cannot click it either). Window-scrolling cannot help (the
    // container is viewport-anchored) and elementFromPoint cannot see outside
    // the viewport, so say what IS possible instead of clicking blind.
    if (offscreen && (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight)) {
      return { ok: false, error: 'this match sits outside the viewport in a position:fixed container larger than the window, so it CANNOT be scrolled into view — a coordinate click cannot reach it (a person in this window cannot click it either). Click it by LOCATOR instead, which dispatches on the element itself without coordinates: uiv.page.click(\'css=...\') — or pin a desktop-size viewport right after uiv.goto: uiv.window.resize(1280, 900)' }
    }
    // elementFromPoint sees only the VIEWPORT: a match below the fold
    // (find-time y beyond the window height) resolves to null even though the
    // element is fine. Classic locator clicks auto-scroll their element into
    // view — this is the point-based equivalent.
    if (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) {
      var bx = window.scrollX
      var by = window.scrollY
      window.scrollBy({
        left: x < 0 || x > window.innerWidth ? x - window.innerWidth / 2 : 0,
        top: y < 0 || y > window.innerHeight ? y - window.innerHeight / 2 : 0,
        behavior: 'instant'
      })
      x -= window.scrollX - bx
      y -= window.scrollY - by
    }
    var win = intended ? intended.ownerDocument.defaultView : window
    var el = win.document.elementFromPoint(x, y)
    for (;;) {
      // descend through open shadow roots to the innermost element
      while (el && el.shadowRoot) {
        var inner = el.shadowRoot.elementFromPoint(x, y)
        if (!inner || inner === el) break
        el = inner
      }
      // descend into SAME-ORIGIN frames: the finder pierces them and reports
      // top-viewport coordinates, so the point lands on the <frame>/<iframe>
      // element here — translate to frame-local coordinates and continue
      // inside (cross-origin frames never reach this code: their matches are
      // frameLocal and this function is injected into that frame directly)
      var ftag = el && el.tagName ? el.tagName.toLowerCase() : ''
      if ((ftag === 'iframe' || ftag === 'frame') && el.contentDocument) {
        var fr = el.getBoundingClientRect()
        x = x - fr.left - (el.clientLeft || 0)
        y = y - fr.top - (el.clientTop || 0)
        win = el.contentWindow || win
        el = el.contentDocument.elementFromPoint(x, y)
        continue
      }
      break
    }
    if (intended && !(offset && (offset.dx || offset.dy)) && el !== intended && !intended.contains(el) && !(el && el.closest && el.closest('label') && el.closest('label').control === intended)) return { ok: false, error: 'The intended DOM target is covered by another element; no action was performed.' };
    if (intended && !(offset && (offset.dx || offset.dy))) el = intended;
    if (!el) return { ok: false, error: 'no element at point ' + x + ',' + y + ' any more - the match is STALE: the page scrolled, re-rendered or navigated between the finder and this action. Re-run the finder immediately before acting on it, and never reuse a match across a click, navigation or scroll' }
    // The finder recorded what it matched (expectTag); if the point now
    // resolves to something that is neither that element nor inside it, the
    // page has MOVED between find and click (sticky bars collapse on scroll,
    // layouts reflow) and this click would silently hit the wrong thing —
    // the failure mode behind "the macro clicked and nothing happened".
    if (expectTag) {
      var want = String(expectTag).toLowerCase()
      var probe = el
      var onTarget = false
      while (probe) {
        if ((probe.tagName || '').toLowerCase() === want) { onTarget = true; break }
        probe = probe.parentElement || (probe.getRootNode && probe.getRootNode().host) || null
      }
      if (!onTarget && /^(input|select|textarea)$/.test(want)) {
        // styled checkbox / radio / switch: the <input> the finder matched
        // sits under its <label> (or a wrapper the label owns) — the browser
        // forwards a label click to the control, so this point IS right.
        // label/input + legend/input were 289 rejected records in the
        // 2026-09-06 drop (OPEN-ISSUES 35.9).
        var lab = el.closest ? el.closest('label') : null
        if (lab && lab.control && (lab.control.tagName || '').toLowerCase() === want) onTarget = true
      }
      if (!onTarget) {
        return { ok: false, error: 'the point ' + x + ',' + y + ' now resolves to <' + (el.tagName || '?').toLowerCase() + '>, not the <' + want + '> the finder matched - the page moved or re-rendered between the find and this click (sticky/collapsing bars do this when the page scrolls). Re-run the finder IMMEDIATELY before acting, or click by locator instead - uiv.page.click(\'css=...\') dispatches on the element itself, coordinates not involved' }
      }
    }
    if (el.focus) el.focus()
    var opts = { bubbles: true, cancelable: true, composed: true, view: win, clientX: x, clientY: y }
    el.dispatchEvent(new MouseEvent('mousedown', opts))
    el.dispatchEvent(new MouseEvent('mouseup', opts))
    el.dispatchEvent(new MouseEvent('click', opts))
    return { ok: true, tag: (el.tagName || '').toLowerCase() }
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) }
  }
}

// Serialized into the page (a specific frame): fill the field at a point.
// This is the match-object form of uiv.page.fill — the finder already located
// the element, so re-resolving a locator string would be both slower and, for
// a match inside a cross-origin frame, impossible.
//
// Value setting goes through the prototype's native setter before the events
// are fired: React (and anything else tracking its own value) ignores a plain
// `el.value = x` assignment and would re-render the field back to empty.
function pageTypeAt (x, y, text, offscreen, elementId, offset, elementSignature) {
  try {
    var intended = null;
    if (elementId) {
      var saved = window.__uivElementTargets && window.__uivElementTargets.nodes.get(elementId);
      intended = saved && saved.ref.deref();
      if (!intended || !intended.isConnected) return { ok: false, error: 'The DOM target was removed, replaced or expired. Find the intended element again before acting; no action was performed.' };
      var currentText = ((intended.innerText !== undefined ? intended.innerText : intended.textContent) || '').trim();
      if (elementSignature && JSON.stringify([intended.id, intended.getAttribute('name'), intended.getAttribute('href'), currentText.slice(0, 2000)]) !== elementSignature)
        return { ok: false, error: 'The DOM target identity or text changed since it was found. Find the intended element again; no action was performed.' };
      intended.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      var box = intended.getBoundingClientRect();
      x = box.left + box.width / 2 + (offset && Number(offset.dx) || 0);
      y = box.top + box.height / 2 + (offset && Number(offset.dy) || 0);
      if (!box.width || !box.height || intended.disabled || intended.getAttribute('aria-disabled') === 'true') return { ok: false, error: 'The intended DOM target is hidden or disabled; no action was performed.' };
      // Validate covering elements in each same-origin ancestor frame as well.
      var child = intended.ownerDocument.defaultView;
      var parentX = x, parentY = y;
      while (child && child !== window) {
        var frame = child.frameElement;
        if (!frame) break;
        var rect = frame.getBoundingClientRect();
        parentX += rect.left + (frame.clientLeft || 0); parentY += rect.top + (frame.clientTop || 0);
        var cover = frame.ownerDocument.elementFromPoint(parentX, parentY);
        while (cover && cover.shadowRoot) { var innerCover = cover.shadowRoot.elementFromPoint(parentX,parentY); if (!innerCover || innerCover === cover) break; cover = innerCover; }
        if (cover !== frame) return { ok: false, error: 'The frame containing the intended target is covered; no action was performed.' };
        child = child.parent;
      }
      offscreen = false;
    }

    // unreachable-match refusal — see pageDomClickAt (self-contained copy)
    if (offscreen && (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight)) {
      return { ok: false, error: 'this match sits outside the viewport in a position:fixed container larger than the window, so it CANNOT be scrolled into view - a coordinate action cannot reach it. Type by LOCATOR instead: uiv.page.fill(\'css=...\', text) - or pin a desktop-size viewport right after uiv.goto: uiv.window.resize(1280, 900)' }
    }
    // same viewport-scroll correction as pageDomClickAt (self-contained on
    // purpose — these functions are injected into the page one at a time)
    if (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) {
      var bx = window.scrollX
      var by = window.scrollY
      window.scrollBy({
        left: x < 0 || x > window.innerWidth ? x - window.innerWidth / 2 : 0,
        top: y < 0 || y > window.innerHeight ? y - window.innerHeight / 2 : 0,
        behavior: 'instant'
      })
      x -= window.scrollX - bx
      y -= window.scrollY - by
    }
    var win = intended ? intended.ownerDocument.defaultView : window
    var el = win.document.elementFromPoint(x, y)
    for (;;) {
      while (el && el.shadowRoot) {
        var inner = el.shadowRoot.elementFromPoint(x, y)
        if (!inner || inner === el) break
        el = inner
      }
      // same-origin frame descent — see pageDomClickAt (self-contained copy)
      var ftag = el && el.tagName ? el.tagName.toLowerCase() : ''
      if ((ftag === 'iframe' || ftag === 'frame') && el.contentDocument) {
        var fr = el.getBoundingClientRect()
        x = x - fr.left - (el.clientLeft || 0)
        y = y - fr.top - (el.clientTop || 0)
        win = el.contentWindow || win
        el = el.contentDocument.elementFromPoint(x, y)
        continue
      }
      break
    }
    if (intended && !(offset && (offset.dx || offset.dy)) && el !== intended && !intended.contains(el) && !(el && el.closest && el.closest('label') && el.closest('label').control === intended)) return { ok: false, error: 'The intended DOM target is covered by another element; no action was performed.' };
    if (intended && !(offset && (offset.dx || offset.dy))) el = intended;
    if (!el) return { ok: false, error: 'no element at point ' + x + ',' + y + ' any more - the match is STALE: the page scrolled, re-rendered or navigated between the finder and this action. Re-run the finder immediately before acting on it, and never reuse a match across a click, navigation or scroll' }

    var tag = (el.tagName || '').toLowerCase()
    var editable = tag === 'input' || tag === 'textarea'

    if (!editable && !el.isContentEditable) {
      // A visual/OCR match lands on the field's LABEL or a wrapper <div>,
      // not the field itself — 2.5% of chats in the 2026-09-06 drop ended
      // on "the match at x,y is <div>, not a text field" (OPEN-ISSUES 35.8).
      // Resolve the way a click on the label would: the label's control,
      // else the ONE text field inside the element.
      var ctl = null
      var lab = el.closest ? el.closest('label') : null
      if (lab && lab.control) ctl = lab.control
      if (!ctl && el.querySelectorAll) {
        var inner = el.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]),textarea,[contenteditable=""],[contenteditable="true"]')
        if (inner.length === 1) ctl = inner[0]
      }
      if (ctl) {
        el = ctl
        tag = (el.tagName || '').toLowerCase()
        editable = tag === 'input' || tag === 'textarea'
      }
    }
    if (!editable && !el.isContentEditable) {
      return { ok: false, error: 'the match at ' + x + ',' + y + ' is <' + tag + '>, not a text field - uiv.page.fill needs an input, textarea or contenteditable element' }
    }
    if (el.type && String(el.type).toLowerCase() === 'file') {
      return { ok: false, error: 'file inputs cannot be filled by typing - use uiv.run(\'type\', locator, path) which routes file paths through the debugger API' }
    }

    if (el.focus) el.focus()

    if (editable) {
      // the element's OWN realm's prototype: an element inside a same-origin
      // frame has that frame's HTMLInputElement, not the top window's
      var proto = tag === 'textarea' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype
      var desc = Object.getOwnPropertyDescriptor(proto, 'value')
      if (desc && desc.set) {
        desc.set.call(el, String(text))
      } else {
        el.value = String(text)
      }
    } else {
      el.textContent = String(text)
    }

    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return { ok: true, tag: tag }
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) }
  }
}

// Resolves { matches, hiddenCount } — hiddenCount is how many elements
// matched the locator but were skipped as invisible (summed over frames);
// it turns a bare "nothing found" timeout into an actionable diagnosis.
// Content wait-conditions ({hasText, textMatches}) for the DOM finder: the
// auto-wait keeps retrying until a match's text/value satisfies them, which is
// the declarative replacement for hand-rolled poll loops. (Those loops are a
// trap here: matches are point-in-time snapshots, so re-reading a stored
// match's .value never sees the page change.) A condition passes if EITHER
// the element's text or its input value satisfies it. Returns null when
// neither option is set; throws on an invalid regex BEFORE any retrying, so
// the mistake fails in milliseconds, not after the full find timeout.
function elementContentCheck (args) {
  const has = args.hasText
  const rx = args.textMatches
  const wantHas = has === true || (typeof has === 'string' && has !== '')

  let re = null
  if (rx !== undefined && rx !== null && rx !== false) {
    // {source, flags} when the script passed a RegExp (see the polyfill), a
    // plain string otherwise. 'g'/'y' are stripped: a sticky lastIndex would
    // make .test() alternate between hit and miss across retries.
    const source = (typeof rx === 'object' && rx.source !== undefined) ? String(rx.source) : String(rx)
    const flags = ((typeof rx === 'object' && rx.flags) ? String(rx.flags) : '').replace(/[gy]/g, '')
    try {
      re = new RegExp(source, flags)
    } catch (e) {
      throw new Error(`findElements: textMatches is not a valid regular expression: ${e.message}`)
    }
  }
  if (!wantHas && !re) return null

  const needle = typeof has === 'string' ? has.toLowerCase() : null
  const label = [
    has === true ? 'hasText: true' : null,
    needle !== null ? `hasText: ${JSON.stringify(has)}` : null,
    re ? `textMatches: /${re.source}/${re.flags}` : null
  ].filter(Boolean).join(', ')

  const test = (m) => {
    const texts = [m.text || '', m.value !== undefined && m.value !== null ? String(m.value) : '']
    const hasOk = !wantHas || texts.some(t => (has === true ? t.trim() !== '' : t.toLowerCase().includes(needle)))
    const reOk = !re || texts.some(t => re.test(t))
    return hasOk && reOk
  }
  return { test, label }
}

// Selenium-IDE locator spellings that are NOT script strategies. The injected
// resolver throws on them too, but that error only surfaces when the search
// times out — this check fails the call IMMEDIATELY instead of burning the
// whole auto-wait first (seen in production: classic-macro locators pasted
// into scripts).
function scriptLocatorError (locator) {
  const m = /^\s*(linkText|partialLinkText)\s*=\s*([\s\S]*)$/i.exec(String(locator || ''))
  if (!m) return null
  const text = m[2].trim().slice(0, 60)
  return `'${m[1]}=' is not a JS-script locator — use link=${text} for the exact anchor text, or xpath=//a[contains(normalize-space(.), '${text}')] for a partial match`
}

// Why a TEXT locator misses text that IS on the page: an invisible character
// inside it — a non-breaking space (U+00A0) between "Jun" and "26", a soft
// hyphen, a zero-width space. The match object's .text normalizes them away,
// so the author cannot see the difference and keeps retrying the same
// locator (OPEN-ISSUES 17.8, platform.claude.com billing table). Runs on the
// failure path only, once: takes the longest quoted literal out of the
// locator and looks for it in the page with those characters normalized.
async function invisibleCharDiagnosis (tab, locator) {
  const lits = []
  const re = /(["'])((?:(?!\1).){3,}?)\1/g
  let m
  while ((m = re.exec(String(locator || '')))) lits.push(m[2])
  if (!lits.length) return ''
  const literal = lits.sort((a, b) => b.length - a.length)[0]
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: pageInvisibleCharProbe,
      args: [literal]
    })
    const r = results && results[0] && results[0].result
    if (!r || !r.found) return ''
    return `the text ${JSON.stringify(literal)} IS on the page, but with invisible characters inside — the page has ${JSON.stringify(r.shown)} (${r.chars}). A text match compares raw characters, so it never matches. Match a piece without the gap, e.g. contains(., ${JSON.stringify(r.piece)}), or normalize it: contains(translate(., '\u00a0', ' '), ${JSON.stringify(literal)})`
  } catch (e) {
    return ''
  }
}

// Runs inside the page via chrome.scripting — must be self-contained.
function pageInvisibleCharProbe (literal) {
  var INV = /[\u00a0\u00ad\u200b\u200c\u200d\u2060\ufeff]/g
  var NAMES = { '\u00a0': 'U+00A0 no-break space', '\u00ad': 'U+00AD soft hyphen', '\u200b': 'U+200B zero-width space', '\u200c': 'U+200C', '\u200d': 'U+200D', '\u2060': 'U+2060 word joiner', '\ufeff': 'U+FEFF' }
  var MARK = { '\u00a0': '⍽', '\u00ad': '[SHY]', '\u200b': '[ZWSP]', '\u200c': '[ZWNJ]', '\u200d': '[ZWJ]', '\u2060': '[WJ]', '\ufeff': '[BOM]' }
  var norm = function (s) { return s.replace(INV, function (c) { return c === '\u00a0' ? ' ' : '' }).replace(/\s+/g, ' ') }
  var want = norm(literal)
  if (!want) return { found: false }
  var walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT)
  var node
  while ((node = walker.nextNode())) {
    var raw = node.nodeValue || ''
    if (!INV.test(raw)) { INV.lastIndex = 0; continue }
    INV.lastIndex = 0
    if (raw.indexOf(literal) >= 0) continue          // matches raw too — not the problem
    if (norm(raw).indexOf(want) < 0) continue
    var chars = {}
    raw.replace(INV, function (c) { chars[NAMES[c] || c] = true; return c })
    // the longest run of the literal's words that sits inside ONE fragment
    // between invisible characters — that piece matches with plain contains()
    var words = want.split(' ')
    var best = ''
    raw.split(INV).forEach(function (frag) {
      var f = norm(frag)
      for (var i = 0; i < words.length; i++) {
        for (var j = words.length; j > i; j--) {
          var w = words.slice(i, j).join(' ')
          if (w.length > best.length && f.indexOf(w) >= 0) best = w
        }
      }
    })
    return {
      found: true,
      shown: raw.replace(INV, function (c) { return MARK[c] || '[U+' + c.charCodeAt(0).toString(16) + ']' }).trim().slice(0, 100),
      chars: Object.keys(chars).join(', '),
      piece: best || words.sort(function (a, b) { return b.length - a.length })[0]
    }
  }
  // the literal may span elements — a body-level check still tells the story
  var body = document.body ? (document.body.innerText || '') : ''
  if (body.indexOf(literal) < 0 && norm(body).indexOf(want) >= 0) {
    return { found: true, shown: '(spread over several elements)', chars: 'a no-break space or zero-width character between the parts', piece: want.split(' ').sort(function (a, b) { return b.length - a.length })[0] }
  }
  return { found: false }
}

// A browser-tier click at a DOM match: re-run the finder right before the
// CDP dispatch and wait for the element to stop moving. The match was
// measured when the finder ran; a smooth scroll or a collapsing header still
// in motion puts the element elsewhere by the time CDP clicks (o2 billing
// page: rect top 559 at find time, click fired at 548 — 11px above the
// button, OPEN-ISSUES 17.5). page.click guards this with elementFromPoint;
// the CDP tier re-reads the position instead of clicking the stale one.
// Only for plain finds (locator + visibility options): a find with text
// filters could re-index onto a different element, so it is left alone.
// Runs inside the page via chrome.scripting — must be self-contained.
// Scrolls the window so a viewport point lands mid-screen when it is outside
// the viewport; returns true when it scrolled (the caller re-measures).
function pageScrollPointIntoView (x, y) {
  var w = window.innerWidth
  var h = window.innerHeight
  if (x >= 0 && x <= w && y >= 0 && y <= h) return false
  var bx = window.scrollX
  var by = window.scrollY
  window.scrollBy({
    left: x < 0 || x > w ? x - w / 2 : 0,
    top: y < 0 || y > h ? y - h / 2 : 0,
    behavior: 'instant'
  })
  return window.scrollX !== bx || window.scrollY !== by
}

// A visual match (image / OCR / color, browser scope) was measured on a
// screenshot taken BEFORE the debugger was attached. The FIRST trusted CDP
// event on a tab attaches it, and Chrome's "is debugging" infobar then
// shrinks the viewport by its height — bottom-anchored page furniture moves
// up under the click. Measured live 2026-09-05 (Linux): DemoBrowserClick's
// sketch.io + button, found at viewport y=620, got the folder icon one slot
// below on every run; the XClick twin had the same miss on macOS before its
// calibration move (run_command). DOM matches are re-read by settleDomPoint;
// visual matches re-run their finder here — only when the attach was FRESH
// and the viewport height actually changed, so an already attached session
// (idle detach 3s) costs one CDP round trip and nothing else. A coordinate
// correction would be wrong: top-anchored targets do not move at all,
// centered ones move half a bar — only a re-find knows.
async function settleVisualPointForCdp (args, fn) {
  if (!args || !args.find || !args.find.__visual || args.frameLocal || (args.scope && args.scope !== 'browser')) return args
  if (!isCdpInputAvailable()) return args
  const tab = await getTargetTab()
  if (!tab) return args
  let before = null
  try {
    const r = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.innerHeight })
    before = r && r[0] ? r[0].result : null
  } catch (e) { return args }
  let primed = null
  try { primed = await primeCdpAttach(tab.id) } catch (e) { return args }   // the click itself reports an attach failure
  if (!primed || !primed.fresh || typeof primed.innerHeight !== 'number' || typeof before !== 'number' || primed.innerHeight === before) return args
  const delta = before - primed.innerHeight
  const idx = args.findIndex || 0
  try {
    const r = await dispatchBridgeInner(args.find.__visual, { ...args.find.spec, timeout: 3 })
    if (!r || !r.ok) throw new Error((r && r.error) || 'the finder failed')
    const list = JSON.parse(r.value || '[]')
    const m0 = Array.isArray(list) ? list[idx] : null
    if (!m0) throw new Error(`the finder now returns ${Array.isArray(list) ? list.length : 0} match(es), the click was aimed at #${idx + 1}`)
    // a uiv.offset() point: the re-find gives the anchor, put the offset back
    const off = args.findOffset || { dx: 0, dy: 0 }
    const m = { x: m0.x + (off.dx || 0), y: m0.y + (off.dy || 0) }
    store.dispatch(act.addLog('info', `${fn}: attaching the debugger for the first trusted click raised Chrome's "is debugging" bar, which shrank the viewport by ${delta}px after the target was found — re-found it at ${Math.round(m.x)},${Math.round(m.y)} (was ${Math.round(args.x)},${Math.round(args.y)})`))
    return { ...args, x: m.x, y: m.y }
  } catch (e) {
    store.dispatch(act.addLog('warning', `${fn}: the viewport shrank by ${delta}px after the target was found (Chrome's "is debugging" bar) and the target could not be re-found (${(e && e.message) || e}) — clicking where the finder measured it`))
    return args
  }
}

// A RAW point — uiv.browser.click({x, y}), which is also what the MCP and
// chat click_at emit — has no finder to re-run (settleVisualPointForCdp) and
// no element to re-read (settleDomPoint), so the first trusted click on an
// idle tab shifted the layout under it and hit whatever moved into its place:
// three misses in a row on Google Flights' centred calendar dialog, ~27 CSS px
// each (OPEN-ISSUES 69). The bar cannot be avoided (Chrome raises it on every
// attach) and a coordinate correction would be wrong (top-anchored targets do
// not move, centred ones move half a bar), so the point is turned into an
// ELEMENT while the geometry it was measured in still holds: before the
// attach, elementFromPoint plus the point's offset inside that element, held
// in the content script's isolated world; after the attach has settled, the
// element is measured again and the click goes where it is now. Costs one
// executeScript before the first trusted click of an idle tab and nothing
// otherwise: an attached session cannot move anything, and an unchanged
// height means nothing moved. Every way this can fail — a page that takes
// no content script, no element under the point, the element re-rendered
// away by the resize — falls back to the raw point WITH a warning naming the
// height change, never silently.
function pageHoldPointElement (x, y) {
  var el = document.elementFromPoint(x, y)
  window.__uivHeldPoint = null
  if (!el) return { innerHeight: window.innerHeight, held: false }
  var r = el.getBoundingClientRect()
  window.__uivHeldPoint = { el: el, dx: x - r.left, dy: y - r.top, w: r.width, h: r.height }
  return { innerHeight: window.innerHeight, held: true, tag: el.tagName.toLowerCase() }
}

function pageReadHeldPointElement () {
  var held = window.__uivHeldPoint
  window.__uivHeldPoint = null
  if (!held || !held.el) return { error: 'no element was held' }
  if (!held.el.isConnected) return { error: 'the element under the point was removed from the page (re-rendered on the resize)' }
  var r = held.el.getBoundingClientRect()
  if (!r.width && !r.height) return { error: 'the element under the point has no layout any more' }
  return { x: r.left + held.dx, y: r.top + held.dy, resized: r.width !== held.w || r.height !== held.h, tag: held.el.tagName.toLowerCase() }
}

async function settleRawPointForCdp (args, fn) {
  if (!args || args.find || args.frameLocal || (args.scope && args.scope !== 'browser')) return args
  if (typeof args.x !== 'number' || typeof args.y !== 'number') return args
  if (!isCdpInputAvailable()) return args
  const tab = await getTargetTab()
  if (!tab || isCdpAttached(tab.id)) return args   // an attached session cannot move anything
  const px = Math.round(args.x)
  const py = Math.round(args.y)
  let held = null
  let holdError = null
  try {
    const r = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: pageHoldPointElement, args: [px, py] })
    held = r && r[0] ? r[0].result : null
    if (!held) holdError = 'the page did not answer'
    else if (!held.held) holdError = 'no element under the point'
  } catch (e) { holdError = (e && e.message) || String(e) }
  let primed = null
  try { primed = await primeCdpAttach(tab.id) } catch (e) { return args }   // the click itself reports an attach failure
  if (!primed || !primed.fresh || typeof primed.innerHeight !== 'number') return args
  const bar = `${fn}: attaching the debugger for the first trusted click raised Chrome's "is debugging" bar`
  if (holdError) {
    store.dispatch(act.addLog('warning', `${bar}, and the point ${px},${py} could not be tied to an element beforehand (${holdError}) — clicking the raw point, which may hit whatever the bar moved there`))
    return args
  }
  if (typeof held.innerHeight !== 'number' || held.innerHeight === primed.innerHeight) return args
  const delta = held.innerHeight - primed.innerHeight
  const changed = `${bar}, which changed the viewport height by ${delta}px after the point was measured`
  try {
    const r = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: pageReadHeldPointElement })
    const m = r && r[0] ? r[0].result : null
    if (!m || m.error) throw new Error((m && m.error) || 'the element could not be read back')
    const moved = Math.abs(m.x - px) >= 1 || Math.abs(m.y - py) >= 1
    const size = m.resized ? ' (the element also changed size, the offset inside it is approximate)' : ''
    store.dispatch(act.addLog('info', `${changed} — the <${m.tag}> under ${px},${py} ${moved ? `moved, clicking it at ${Math.round(m.x)},${Math.round(m.y)}` : 'did not move'}${size}`))
    return moved ? { ...args, x: m.x, y: m.y } : args
  } catch (e) {
    store.dispatch(act.addLog('warning', `${changed}, and the element under ${px},${py} could not be re-read (${(e && e.message) || e}) — clicking the raw point, which may hit whatever moved there`))
    return args
  }
}

// Read the same node after debugger attachment/layout changes. Never select the
// old ordinal from a newly ordered result list or fall back to saved coordinates.
function pageReadDomTarget (elementId, signature, offset) {
  var saved = window.__uivElementTargets && window.__uivElementTargets.nodes.get(elementId)
  var el = saved && saved.ref.deref()
  if (!el || !el.isConnected) return { error: 'DOM target was removed, replaced or expired. Find the intended element again.' }
  var text = ((el.innerText !== undefined ? el.innerText : el.textContent) || '').trim()
  if (signature && signature !== JSON.stringify([el.id, el.getAttribute('name'), el.getAttribute('href'), text.slice(0, 2000)])) {
    return { error: 'DOM target identity or text changed. Find the intended element again.' }
  }
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  var r = el.getBoundingClientRect()
  if (!r.width || !r.height || el.disabled || el.getAttribute('aria-disabled') === 'true') return { error: 'The DOM target is hidden or disabled.' }
  var x = r.left + r.width / 2 + (offset && Number(offset.dx) || 0)
  var y = r.top + r.height / 2 + (offset && Number(offset.dy) || 0)
  var win = el.ownerDocument.defaultView
  var target = el
  while (win) {
    var hit = win.document.elementFromPoint(x, y)
    while (hit && hit.shadowRoot) {
      var inner = hit.shadowRoot.elementFromPoint(x, y)
      if (!inner || inner === hit) break
      hit = inner
    }
    var label = hit && hit.closest && hit.closest('label')
    if (!(offset && (offset.dx || offset.dy)) && hit !== target && !target.contains(hit) && !(label && label.control === target)) return { error: 'The intended DOM target is covered. No click was performed.' }
    if (win === window) break
    var frame = win.frameElement
    if (!frame) return { error: 'The target frame is no longer available.' }
    var fr = frame.getBoundingClientRect()
    x += fr.left + (frame.clientLeft || 0)
    y += fr.top + (frame.clientTop || 0)
    target = frame
    win = win.parent
  }
  return { x: x, y: y }
}

async function settleDomPoint (args, fn) {
  if (args && args.elementId && !args.frameLocal) {
    const tab = await getTargetTab()
    if (!tab) throw new Error(E901_NO_TAB)
    if (isCdpInputAvailable()) await primeCdpAttach(tab.id)
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [args.frameId || 0] },
      func: pageReadDomTarget,
      args: [args.elementId, args.elementSignature || null, args.findOffset || null]
    })
    const point = result && result[0] && result[0].result
    if (!point || point.error) throw new Error(fn + ': ' + ((point && point.error) || 'The DOM target frame did not answer.'))
    return { ...args, x: point.x, y: point.y, offscreen: false }
  }
  if (!args || !args.find || args.frameLocal || (args.scope && args.scope !== 'browser')) return args
  const allowed = ['locator', 'scroll', 'includeHidden', 'timeout', 'required']
  if (Object.keys(args.find).some(k => !allowed.includes(k))) return args
  const tab = await getTargetTab()
  if (!tab) return args
  // a re-read that cannot be done is said so, once, in the log — otherwise a
  // stale click is indistinguishable from a re-read that found no movement
  const giveUp = (why) => {
    store.dispatch(act.addLog('info', `${fn}: could not re-read the element's position before the click (${why}) — clicking where the finder measured it`))
    return args
  }
  // the finder scrolls only its FIRST match into view; a match further down
  // the list can sit outside the viewport, and CDP coordinates outside the
  // viewport hit nothing — silently. Scroll such a point into view first
  // (window scroll, like pageDomClickAt does) and measure again.
  const spec = { ...args.find, required: false, timeout: 1, scroll: false }
  let prev = null
  let fresh = null
  let scrolled = 0
  const deadline = Date.now() + 1500
  while (Date.now() < deadline) {
    let m = null
    try {
      const r = await elementSearchOnce(tab, spec)
      const list = r.matches || []
      m = list[args.findIndex || 0] || null
      if (!m) return giveUp(`the finder now returns ${list.length} match(es), the click was aimed at #${(args.findIndex || 0) + 1}`)
      if (!m.offscreen && scrolled < 3) {
        const vp = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: pageScrollPointIntoView, args: [Math.round(m.x), Math.round(m.y)] })
        const moved = vp && vp[0] && vp[0].result
        if (moved) { scrolled++; prev = null; await delayMs(80); continue }   // measure again after the scroll
      }
    } catch (e) { return giveUp((e && e.message) || String(e)) }
    if (prev && Math.abs(m.x - prev.x) < 1 && Math.abs(m.y - prev.y) < 1) { fresh = m; break }
    prev = m
    await delayMs(120)
  }
  if (!fresh) fresh = prev
  if (!fresh) return args
  // a uiv.offset() point is the element's position PLUS the offset — the
  // re-read gives the element, so put the offset back (without this the
  // click landed ON the anchor element instead of beside it)
  const off = args.findOffset || { dx: 0, dy: 0 }
  fresh = { ...fresh, x: fresh.x + (off.dx || 0), y: fresh.y + (off.dy || 0) }
  if (Math.abs(fresh.x - args.x) >= 2 || Math.abs(fresh.y - args.y) >= 2) {
    store.dispatch(act.addLog('info', `${fn}: the ${off.dx || off.dy ? 'anchor element' : 'element'} moved from ${Math.round(args.x)},${Math.round(args.y)} to ${Math.round(fresh.x)},${Math.round(fresh.y)} since the finder ran (scroll or relayout still in motion) — clicking its current position`))
  }
  return { ...args, x: fresh.x, y: fresh.y, offscreen: !!fresh.offscreen }
}

async function elementSearchOnce (tab, args) {
  let noLayout = false
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: pageElementSearch,
    args: [args.locator, { scroll: args.scroll, includeHidden: args.includeHidden }]
  })

  const frames = (results || []).filter(r => r && r.result)
  if (!frames.length) throw new Error('elementSearch: the page did not answer the search — it is still loading, or it is a page extensions cannot read (chrome://, the Chrome Web Store, a PDF in the viewer, an error page). Wait for the load with uiv.goto(url), and on an unreadable page use the visual finders (uiv.findImage / uiv.ocr.findText), which work on pixels instead of the DOM')

  // top frame first (absolute viewport coords), then cross-origin roots
  frames.sort((a, b) => (a.frameId === 0 ? 0 : 1) - (b.frameId === 0 ? 0 : 1))

  let matches = []
  let hiddenCount = 0
  let firstError = null
  for (const fr of frames) {
    const r = fr.result
    if (!r.ok) {
      if (!firstError) firstError = r.error
      continue
    }
    hiddenCount += r.hiddenCount || 0
    if (r.noLayout) noLayout = true
    // a ref= that survived a re-render by re-resolution (OPEN-ISSUES 20.4):
    // say so once, so a later mis-click has its explanation in the log
    if (r.note) { try { store.dispatch(act.addLog('info', r.note)) } catch (e) { /* logging only */ } }
    matches = matches.concat((r.matches || []).map((m, frameIndex) => ({ ...m, frameId: fr.frameId, frameIndex })))
  }
  if (!matches.length && firstError) throw new Error(`elementSearch: ${firstError}`)
  if (matches.length && matches[0].viaLabel && !viaLabelNoted.has(String(args.locator))) {
    // once per locator per run — a click resolves the locator several times
    viaLabelNoted.add(String(args.locator))
    store.dispatch(act.addLog('info', `${String(args.locator).slice(0, 60)} is a hidden radio/checkbox input — its visible <label> is the match, so a click lands on the label (which toggles the input)`))
  }
  if (!matches.length && !hiddenCount && /^ref=\d{4,}$/.test(String(args.locator).trim())) {
    throw new Error(`elementSearch: ${String(args.locator).trim()} is unknown in every frame — a ref above 1000 belongs to a cross-origin frame; refs are renumbered on navigation and the frame may have reloaded: call browser_snapshot again`)
  }
  return { matches, hiddenCount, noLayout }
}

// uiv.page.click/type with a cross-origin frame's ref: the classic locator
// path resolves in the top frame only, so route through the finder and the
// frame-local click/type (OPEN-ISSUES 24.1)
async function crossFrameRefMatch (locator) {
  const m = /^ref=(\d+)$/.exec(String(locator || '').trim())
  // by= (getByRole/getByLabel/…) has no classic resolver: resolve it with the
  // finder and hand the DOM tier the point, same as a cross-frame ref
  const byLoc = /^by=/.test(String(locator || '').trim())
  if (!byLoc && (!m || Number(m[1]) < 1000)) return null
  const tab = await getTargetTab()
  if (!tab) return null
  const r = await elementSearchOnce(tab, { locator: String(locator).trim() })
  if (r.matches && r.matches[0]) return r.matches[0]
  // the frame answered but the element is not clickable — say that, instead
  // of falling through to the top-frame path and its "unknown" verdict
  if (byLoc) {
    return { error: r.hiddenCount
      ? `${String(locator).trim().slice(0, 80)} matches ${r.hiddenCount} element(s) but they are HIDDEN — reveal them first, or pass {includeHidden: true} to read`
      : `nothing on the page has that accessible name/role — ${String(locator).trim().slice(0, 80)}. browser_snapshot shows the names the tree computes; the default match is a case-insensitive substring, {exact: true} the whole string` }
  }
  return { error: r.hiddenCount
    ? `${String(locator).trim()} exists in its frame but is HIDDEN (collapsed/invisible) — reveal it first, or read it with uiv.$(ref, {includeHidden: true})`
    : `${String(locator).trim()} is unknown in every frame — refs are renumbered on navigation and the frame may have reloaded: call browser_snapshot again` }
}

// ---------------------------------------------------------------------------
// finder: imageSearch — the same vision pipeline BClick/visualSearch uses
// ---------------------------------------------------------------------------

// The confidence the search actually ran at: the call's {minScore}, else the
// configured default. Shared with the miss diagnosis, which has to name the
// bar the best candidate failed to clear.
function effectiveMinScore (args) {
  return typeof args.minScore === 'number'
    ? args.minScore
    : (Number(store.getState().config.defaultVisionSearchConfidence) || 0.6)
}

// Why an image search found nothing — the one thing the caller cannot see for
// themselves, because the matcher drops everything below the threshold before
// it returns. So on the failure path (once, after the run has already lost its
// timeout) search AGAIN at the engine's floor of 0.1 and report how close the
// best candidate on the page actually got. "scored 0.71, your bar is 0.80" and
// "nothing resembled it at all" are opposite problems with opposite fixes, and
// a bare "nothing found" makes them look identical — which is what sends people
// into the one dead end that cannot work here: raising the timeout.
async function describeImageMiss (args) {
  const min = effectiveMinScore(args)
  let best = null
  let probe = []
  try {
    probe = await imageSearchOnce({ ...args, minScore: 0.1 })
    best = probe.reduce((top, m) => (top === null || m.score > top ? m.score : top), null)
  } catch (e) {
    return '' // probe failed (file gone, tab closed) — the plain miss stands
  }

  const seen = 'Ui.Vision searched the image it was given against what is on screen right now; the exact capture it compared is saved as "__lastscreenshot" in screenshot storage — open it to see what the search actually looked at.'

  // STALE XMODULE DPI, the failure that is otherwise invisible. Desktop-scope
  // search rescales the pattern from its file name's dpi to the screen dpi the
  // XModule reports — and the native host reads that ONCE, at startup. Change
  // Windows display scaling without restarting the browser and every template
  // is scaled by the OLD factor forever: nothing matches, no message mentions
  // scale, and the natural response (re-capture the images, lower minScore)
  // makes it worse. Seen live 2026-08-08: 125% -> 100% with no restart scaled a
  // 101x38 template to 126x47, 0/3 matches; restarting the browser restored
  // 3/3 at score 1.00.
  //
  // The size is taken from the probe's own candidates, which report the rect
  // the SCALED pattern occupies — no extra call, no guess. Deliberately NOT
  // derived from getScalingFactor(): that is devicePixelRatio /
  // screenBackingScaleFactor, which tracks the BROWSER's view, so comparing it
  // against devicePixelRatio always agrees and would never fire.
  const searchedAtNote = (probeMatches) => {
    if (args.scope !== 'desktop' || !probeMatches || !probeMatches.length) return ''
    const r = probeMatches[0].rect
    if (!r || !r.width) return ''
    return ` It searched for a ${Math.round(r.width)}x${Math.round(r.height)} pattern: desktop scope rescales the image from the dpi in its FILE NAME to the screen dpi the XModule reports. If that is not the size '${args.image}' actually is, the dpi is off — with the new Desktop Automation module (XModules 2) the dpi is read per call from the display the BROWSER WINDOW is on (mixed-DPI setups get each display's own value; make sure the window sits mostly on the intended display), while the classic XModule reads ONE global dpi at startup, so changing display scaling without restarting the browser leaves every '_dpi_' image matched at the wrong size. On the classic module, restart the browser BEFORE re-capturing any image.`
  }

  if (best === null) {
    return `nothing on the page resembled '${args.image}' even at the lowest confidence (0.1), so the target is NOT ON SCREEN — it has not rendered yet, is scrolled out of the viewport, or something covers it (cookie banner, overlay, popup). Scroll it into view or dismiss the overlay first. If it IS visible to you, the image file itself is wrong or stale: re-capture it with save_element_image / uiv.shot.area. A longer timeout cannot fix either case.${searchedAtNote(probe)} ${seen}`
  }

  const pct = (n) => Number(n).toFixed(2)
  if (best >= min - 0.15) {
    return `the closest candidate scored ${pct(best)}, just under the required ${pct(min)} — the element is almost certainly THERE but renders slightly differently than when the image was captured: page zoom other than 100%, a different screen DPI, a theme/dark-mode change, or plain antialiasing. Either lower the bar for this call — uiv.findImage('${args.image}', {minScore: ${pct(Math.max(0.1, Math.floor(best * 100) / 100))}}) — or re-capture the image on this page at 100% zoom, which is the more durable fix.${searchedAtNote(probe)} ${seen}`
  }

  return `the closest candidate scored only ${pct(best)} against a required ${pct(min)} — that is not a near miss, it is a different element, so lowering minScore would only buy a confident click on the wrong thing. Either the image is from another page or another state of this one (re-capture it here with save_element_image / uiv.shot.area), or the target is not visible right now. When the target carries readable text, uiv.ocr.findText survives redesigns that break a pixel match; when it is in the DOM, uiv.$ is exact and free.${searchedAtNote(probe)} ${seen}`
}

async function imageSearchOnce (args) {
  const minScore = effectiveMinScore(args)

  // searchVision resolves + activates the tab from global state's toPlay id —
  // pin it to our target tab first (review finding: otherwise a stale or
  // non-capturable toPlay tab gets screenshotted while click targets another)
  if (args.scope !== 'desktop') {
    const tab = await getTargetTab()
    if (!tab) throw new Error(E901_NO_TAB)
    await updateState(setIn(['tabIds', 'toPlay'], tab.id))
  }

  // {area: match | rect} limits THIS search to one region — the composed,
  // per-call form of the classic visionLimitSearchArea, which is blocked in
  // scripts (a setting on line 12 must not silently change what "find" means
  // on line 40; see the 'run' case). No area → 'viewport', never
  // searchVision's 'full' default: a scroll-stitched page capture returns
  // off-viewport coordinates that are invalid to click.
  const area = normalizeFinderArea(args.area, 'uiv.findImage', args.scope)

  const fileName = /\.png$/i.test(args.image) ? args.image : `${args.image}.png`
  // Green/pink RELATIVE images (a green anchor that is searched for, a pink
  // box marking where to act) are CLASSIC-COMMAND territory (BClickRelative,
  // XMoveRelative, ...) — deliberately NOT part of uiv.*, same rule as the
  // *TextRelative family: a finder plus uiv.offset composes the relative
  // click out of parts. Scale-proof offsets come from the anchor's own
  // measured size (fractions of match.rect), which is the same adaptation the
  // pink box got from the engine. Both roads in are closed LOUDLY, because
  // matching a green/pink file as a plain pattern fails silently — the drawn
  // boxes match nothing on any page.
  const composeHint =
    "compose it instead: save a PLAIN image of the anchor and act at an offset from its match — " +
    "uiv.offset(uiv.findImage('anchor.png'), dx, dy). For scale-proof offsets derive dx/dy from the " +
    "anchor's own size, e.g. uiv.offset(m, Math.round(0.5 * m.rect.width), 0)."
  if (args.relative !== undefined) {
    throw new Error(`uiv.findImage: the {relative} option was removed — ${composeHint}`)
  }
  if (/_relative\.png$/i.test(fileName)) {
    throw new Error(
      `uiv.findImage: '${fileName}' is a green/pink RELATIVE image, which uiv.findImage does not match — ` +
      `as a plain pattern the drawn boxes match nothing, so this fails loudly instead. ${composeHint}`
    )
  }
  const result = await searchVision({
    visionFileName: fileName,
    minSimilarity: minScore,
    command: {
      cmd: 'imageSearch',
      extra: {}
    },
    cvScope: args.scope === 'desktop' ? 'desktop' : 'browser',
    devicePixelRatio: window.devicePixelRatio,
    searchArea: area ? 'rect' : 'viewport',
    storedImageRect: area || undefined,
    captureScreenshotService: getCaptureService(),
    // desktop overlay: emphasize the BEST-score match — the one uiv.findImage
    // returns and the plural list flags `best`
    markSelection: { index: 0, explicit: false }
  })

  const toRect = (f) => ({
    left: Math.round(f.viewportLeft),
    top: Math.round(f.viewportTop),
    width: Math.round(f.width),
    height: Math.round(f.height)
  })

  // regions are { matched, reference }: `matched` is always the plain pattern
  // rect here — green/pink relative matching is refused above, so `reference`
  // is never set on this path.
  // viewportLeft/Top are viewport CSS px in browser scope; in desktop scope
  // they are screen coordinates (documented API caveat).
  return (result.regions || []).map(r => {
    const m = r.matched
    return {
      x: Math.round(m.viewportLeft + m.width / 2),
      y: Math.round(m.viewportTop + m.height / 2),
      rect: toRect(m),
      score: m.score
    }
  })
}

// ---------------------------------------------------------------------------
// legacy command bridge (player pipeline) — open / eval / input / uiv.run
// ---------------------------------------------------------------------------

// The player pipeline requires a real macro in storage: the call stack's
// updateSelectedMacro does editTestCase(macroId), which reads the macro file.
//
// When a SAVED script macro is open, the run happens in place — the first
// bridge command's playerPlay auto-saves it (same save-before-replay rule as
// classic macros), so the editTestCase reload is a no-op for the editor.
// Otherwise (Untitled scratch, or the dev playground over a table macro) the
// run targets a scratch macro that CARRIES the script, so the editor keeps
// showing the code after the forced editTestCase switch.
const SCRATCH_MACRO = '#jsscript'

async function prepareRunMacro (code, storedMacroId) {
  // A submacro was read explicitly from storage. Its execution must not save
  // or replace unrelated edits in the browser's currently selected macro.
  if (storedMacroId) return true
  const state = store.getState()
  const editing = state.editor.editing
  const src = editing.meta && editing.meta.src

  if (src && src.id && typeof editing.script === 'string') {
    return true
  }

  const saved = await getSaveTestCase().saveOrNot()
  if (!saved) return false

  await store.dispatch(act.upsertTestCase({ name: SCRATCH_MACRO, data: { commands: [], script: code } }))
  await store.dispatch(act.editTestCase(SCRATCH_MACRO))
  return true
}

// ---------------------------------------------------------------------------
// fast path: one script SESSION instead of one macro RUN per command
// ---------------------------------------------------------------------------
// Every uiv.* call used to dispatch a full playerPlay: prepare (IPC to bg,
// variable re-seed, interpreter reset), START, the command, END, stop, and the
// bg stop handler rebasing tab state — roughly a third of a second of
// orchestration around a few ms of actual work. A table macro pays that once
// for ALL its commands; the script paid it per command, which is why the same
// work took ~8x longer as a script.
//
// So the script now opens ONE session (the bits prepare does that must happen,
// done once) and sends individual commands straight to askBackgroundToRunCommand
// — the same function the player's run step calls, minus the interpreter (a
// script has its own control flow; it needs no flow-logic preprocessing).
//
// Commands that move the play tab or drive macro control flow are NOT on this
// path: they rely on the player's prepare/stop lifecycle. They keep using the
// player and cost what they always did — a script runs them once, not once
// per loop iteration. (`uiv.goto` used to be the prime example; it is native
// now — see nativeOpen — and only uiv.run('open', …) still takes the player.)
//
// TWO gates, deliberately. A caller must ASK for the fast path ({fast: true}),
// and the command must also be on this list. Only the tier ops ask: they build
// their own commands and know the shape (B/X commands always get "x,y" here,
// never a locator — a locator target sends BClick down a branch that recurses
// through the LIVE player state, which a session run does not have). Anything
// the user hands to uiv.run stays on the player path, whatever it is.
const FAST_PATH_COMMANDS = /^(click|type|BClick|BType|BMove|XClick|XType|XMove|executeScript)$/i

// ${!URL}, ${!COL1}, ${!CURRENT_TAB_NUMBER}, … written into a command a
// SCRIPT issues — see runOneCommand. Every ${!name} token is checked against
// DEPRECATED_VARIABLES, so the render-time door and getVar refuse the same
// names with the same workaround.
const BANG_VAR_IN_TEXT = /\$\{\s*(!\w+)\s*\}/g

const findBlockedVarInText = (text) => {
  let m
  BANG_VAR_IN_TEXT.lastIndex = 0
  // eslint-disable-next-line no-cond-assign
  while (m = BANG_VAR_IN_TEXT.exec(text)) {
    const deprecated = getDeprecatedVariable(m[1])
    if (deprecated && deprecated.jsError) {
      return { name: m[1], jsError: deprecated.jsError }
    }
  }
  return null
}

// Shared by the classic path (runOneCommand) and nativeOpen.
const E900_PLAYER_BUSY = 'E900: another macro is already running, so this command cannot start — press Stop in the side panel and run the script again. If nothing looks like it is running, a previous run was interrupted and left the player busy: reload the side panel (close and reopen it) to clear that state'

// One text for the whole runner. This used to be the bare "E901: no browser
// tab available" in nine places and the explaining version in exactly one —
// the same failure told the reader what to do or nothing at all depending on
// which op hit it.
const E901_NO_TAB = 'E901: no browser tab available to run this in — only browser-internal pages (chrome://, the new-tab page, extension pages) are open, and commands cannot run there. Start the script with uiv.goto(url), which creates a normal tab by itself, or switch to a web page first'

// Was two different sentences for one condition ("a script is running" from
// the finder probe, "A script is already running" from the runner).
const SCRIPT_ALREADY_RUNNING = 'A script is already running — press Stop in the side panel before starting another one. (One run at a time is deliberate: two scripts would drive the same tab and fight over the variable pool.)'

let scriptSessionActive = false

// The player's stop handler puts the app back into NORMAL status and tells the
// content script to leave playing mode, so any command that went through the
// player invalidates our session — the next fast command re-opens it.
let scriptSessionStale = false

// Everything players.tsx `prepare` seeds that a command can read, applied once
// per script run instead of once per command. Timeouts come from the app config
// the same way commonPlayerState builds them; uiv.setVar writes land in the
// same pool afterwards and are NOT overwritten again (which is the bug
// scriptScopeOverrides existed to work around on the old path).
// A command run through askBackgroundToRunCommand expects to be inside a
// RUNNING MACRO: it reads getMacroCallStack().bottom().id and asks the macro
// monitor for that frame's loop timer to fill !RUNTIME. The player builds that
// frame in playerPlay; the session path has to build its own, or the very first
// fast command dies with "empty stack" (and, with a frame but no monitor
// target, with "Can't find monitor target").
//
// playerPlay CLEARS the call stack, so every player-path command (uiv.goto,
// uiv.run) wipes this frame — which is exactly what scriptSessionStale marks,
// and why this is re-established rather than pushed once per run.
const SCRIPT_FRAME_NAME = 'JS Script'
let scriptFrameId = null
let scriptFrameSeq = 0

function pushScriptFrame () {
  try {
    const stack = getMacroCallStack()
    if (scriptFrameId && !stack.isEmpty() && stack.bottom().id === scriptFrameId) return

    // The previous frame's MONITOR target survives a player-path command:
    // playerPlay clears the call stack, not the monitor, and popScriptFrame
    // only runs at end of script. Without this, an hours-long run that mixes
    // player commands (uiv.goto / uiv.run / ai / shot) with fast commands
    // leaks one target — inspectors with running timers included — per
    // session re-establish.
    if (scriptFrameId) {
      try { getMacroMonitor().removeTarget(scriptFrameId) } catch (e) { /* already gone */ }
    }

    scriptFrameId = `jsscript-frame-${++scriptFrameSeq}`
    // push, not call(): call() would RUN the resource as a macro. This frame
    // exists only so the command pipeline can find a bottom frame.
    stack.push({
      id: scriptFrameId,
      resource: { id: scriptFrameId, name: SCRIPT_FRAME_NAME, commands: [] },
      runningStatus: { status: 'Running', nextIndex: 0, commandResults: [] }
    })
    getMacroMonitor().addTarget(scriptFrameId)
  } catch (e) {
    // never let bookkeeping kill a run — worst case !RUNTIME is unavailable
    scriptFrameId = null
  }
}

function popScriptFrame () {
  if (!scriptFrameId) return
  try {
    getMacroMonitor().removeTarget(scriptFrameId)
    const stack = getMacroCallStack()
    if (!stack.isEmpty() && stack.peek().id === scriptFrameId) stack.pop()
  } catch (e) { /* already cleared by a player run */ }
  scriptFrameId = null
}

async function startScriptSession (tab) {
  if (scriptSessionActive && !scriptSessionStale) return

  pushScriptFrame()

  const vars = getVarsInstance()
  const { config } = store.getState()

  vars.set({
    '!TIMEOUT_PAGELOAD': parseFloat(config.timeoutPageLoad),
    '!TIMEOUT_WAIT': parseFloat(config.timeoutElement),
    '!TIMEOUT_MACRO': parseFloat(config.timeoutMacro),
    '!TIMEOUT_DOWNLOAD': parseFloat(config.timeoutDownload),
    '!OCRLANGUAGE': config.ocrLanguage,
    '!OCRENGINE': config.ocrEngine,
    '!CVSCOPE': config.cvScope,
    '!REPLAYSPEED': 'FAST',
    '!MACRONAME': 'JS Script',
    '!StatusOK': true,
    '!WaitForVisible': false,
    '!StringEscape': true,
    '!BROWSER': Ext.isFirefox() ? 'firefox' : 'chrome',
    '!OS': (() => {
      const ua = window.navigator.userAgent
      if (/windows/i.test(ua)) return 'windows'
      if (/mac/i.test(ua)) return 'mac'
      return 'linux'
    })(),
    ...scriptScopeOverrides // a uiv.setVar'd timeout still wins
  }, true)

  if (tab) {
    vars.set({
      '!URL': tab.url || '',
      '!CURRENT_TAB_NUMBER': tab.index
    }, true)
  }

  await csIpc.ask('PANEL_START_PLAYING', { url: null, shouldNotActivateTab: true })
    .catch(() => { /* bg unreachable — the command itself will report it */ })

  scriptSessionActive = true
  scriptSessionStale = false
}

async function endScriptSession () {
  if (!scriptSessionActive) return
  scriptSessionActive = false
  scriptSessionStale = false
  popScriptFrame()
  await csIpc.ask('PANEL_STOP_PLAYING', {}).catch(() => { /* best-effort */ })
}

// What players.tsx handleResult does with a finished command's result: every
// command reports its page URL, and commands that produce a value (store*,
// executeScript, csv*, OCR*) report it in result.vars. The `__undefined__`
// sentinel is how "this variable is set, to undefined" survives the IPC hop.
function applyCommandResultVars (result) {
  if (!result) return
  const vars = getVarsInstance()

  if (result.pageUrl) vars.set({ '!URL': result.pageUrl }, true)
  if (!result.vars) return

  const newVars = {}
  Object.keys(result.vars).forEach(key => {
    const val = result.vars[key]
    newVars[key] = val && val.__undefined__ ? undefined : val
  })
  vars.set(newVars)

  // writing !CLIPBOARD has to reach the real clipboard too (the player does
  // this as well); fire and forget, it must not fail the command
  const clipboardKey = Object.keys(result.vars).find(k => /!clipboard/i.test(k))
  if (clipboardKey) {
    Promise.resolve(clipboard.set(result.vars[clipboardKey])).catch(() => { /* best-effort */ })
  }
}

// One command, straight to the background. Resolves { ok, error } like the
// player path — but the error comes from the command's own rejection instead of
// being reverse-engineered out of the log panel.
async function runOneCommandFast (cmd, target, value, cmdFields, tab, timing) {
  await startScriptSession(tab)

  // The replay-helper flags ride in each command's extra. The player path gets
  // them from commonPlayerState; the session path skips that, which silently
  // made "Highlight elements during replay" a no-op for uiv.page.click/type.
  const { playHighlightElements, playScrollElementsIntoView } = store.getState().config
  const command = {
    cmd,
    target,
    value,
    ...(cmdFields || {}),
    extra: { playHighlightElements, playScrollElementsIntoView, ...(cmdFields && cmdFields.extra) }
  }
  timing.dispatched = Date.now()
  timing.startedAt = timing.dispatched

  try {
    const result = await askBackgroundToRunCommand({
      command,
      // the minimum askBackgroundToRunCommand reads: `resources` for its
      // onDownload scan, `nextIndex` to bound it, `extra` for the isBottomFrame
      // (loop) check a script never needs
      state: { resources: [command], nextIndex: 0, extra: {}, startUrl: null },
      store,
      vars: getVarsInstance(),
      // The player's preRun runs the interpreter, which does TWO jobs: macro
      // flow logic (if/while/gotoIf — a script has its own, so we skip it) AND
      // ROUTING. Routing is not optional: B/X commands, OCR and CSV run
      // panel-side in runCsFreeCommands, everything else goes to the content
      // script in the play tab. Skipping it sent BClick/BType/XClick to the
      // content script, which does not implement them — so uiv.browser.* and
      // uiv.desktop.* failed while uiv.page.* (real content-script commands)
      // worked. Mirror the player's contract: handled here, or pass it on.
      preRun: (finalCommand, _state, askBgToRun) => {
        // the player counts X commands here too — it enforces the licence
        // limit AND drives the first-X-command download-bar hiding, so a
        // script must not get to run X commands uncounted
        if (/^(XType|XClick|XClickText|XMove|XMoveText|XMoveTextRelative|XClickRelative|XClickTextRelative|XMoveRelative|XMouseWheel)$/i.test(finalCommand.cmd)) {
          xCmdCounter.inc() // throws when the limit is reached — surfaces as a command error
        }
        const csFree = runCsFreeCommands(finalCommand, 0)
        return csFree === undefined ? askBgToRun(finalCommand) : csFree
      }
    })
    // A command's OUTPUT comes back in its result, and the player's
    // handleResult is what writes it into the variable pool. Dropping it meant
    // uiv.evaluate (executeScript storing into __uiv_ret) always read back
    // undefined — the command ran, the value went nowhere.
    applyCommandResultVars(result)

    // askBackgroundToRunCommand derives !RUNTIME from the call stack frame's
    // loop timer, which restarts whenever a player-path command clears the
    // frame. The script's own clock is the honest answer, so it wins.
    getVarsInstance().set({ '!RUNTIME': milliSecondsToStringInSecond(scriptRuntimeMs()) }, true)
    return { ok: true }
  } catch (e) {
    let msg = (e && e.message) ? e.message : String(e)
    // a CSP refusal quotes the page's WHOLE policy (nonces, dozens of
    // domains — 16k chars on pinterest); the 'eval' bridge case retries
    // through CDP and rewrites the verdict, but this log line reached the
    // model unchanged in every run log (OPEN-ISSUES 44.4)
    if (/Content Security Policy directive/.test(msg)) {
      msg = msg.replace(/(Content Security Policy directive)[\s\S]*$/, '$1 (the page forbids string eval; policy text omitted)').slice(0, 300)
    }
    // the player used to write this line; the log is where users look
    store.dispatch(act.addLog('error', msg))
    return { ok: false, error: msg }
  }
}

// Run one classic command and wait for it to finish. Resolves { ok, error } —
// never rejects. `cmdFields` merges extra fields into the command resource
// (e.g. spExtra). Takes the session fast path where it is safe, and the full
// player pipeline for tab-moving and flow commands.
async function runOneCommand (cmd, target, value, cmdFields, opts) {
  const timing = { begin: Date.now() }
  const state = store.getState()

  if (state.player.status !== Player.C.STATUS.STOPPED) {
    return { ok: false, error: E900_PLAYER_BUSY }
  }

  // Every command a script issues gets its target/value variable-rendered on
  // the way out (askBackgroundToRunCommand), so ${!URL} would resolve here the
  // same way getVar('!URL') would — to the PREVIOUS page — and ${!COL1} to a
  // row nothing in a script can have read. getVar already refuses these
  // (DEPRECATED_VARIABLES); this closes the render-time door, which is not
  // just uiv.run: uiv.page.fill(locator, '${!URL}') renders too.
  const literalTarget = !!(cmdFields && cmdFields.extra && cmdFields.extra.literalTarget)
  const blockedVar = findBlockedVarInText(`${literalTarget ? '' : target || ''}\n${value || ''}`)
  if (blockedVar) {
    return {
      ok: false,
      error: `'\${${blockedVar.name}}' cannot be used in a JS script (here: ${cmd}) — ${blockedVar.jsError}`
    }
  }

  const src = state.editor.editing.meta.src
  const macroId = executionMacroId || (src && src.id)

  // commands the player runs entirely in the panel (byPass, no content
  // script, no tab — see the store/echo/... cases in run_command.ts): they
  // must work even when only browser-internal pages are open.
  // XDesktopAutomation qualifies too — it only flips !CVSCOPE panel-side, and
  // desktop-scope scripts must be able to run it before any web tab exists
  // (demanding a tab here killed every desktop demo started from a fresh
  // browser with E901 on its first line).
  //
  // The X input family joins them WHEN IT IS IN DESKTOP SCOPE. Those commands
  // are real OS input: the XModule sends them to the screen, and the finders
  // that produced their coordinates already run tab-free ({scope: 'desktop'}
  // skips getTargetTab everywhere). Demanding a tab only for the click was the
  // XDesktopAutomation bug one level down — a script could FIND on the desktop
  // but not CLICK there, so the ClearSidebarLogViaGUI demos (which automate
  // the side panel itself and need no web page at all) died with E901 on their
  // first click whenever the browser showed only internal pages.
  // BROWSER-scope X commands still need the tab: their coordinates are
  // viewport pixels the XModule path converts using the tab's window geometry.
  const isXInputCmd = /^(XType|XClick|XClickText|XMove|XMoveText|XMoveTextRelative|XClickRelative|XClickTextRelative|XMoveRelative|XMouseWheel)$/i.test(cmd)
  // the tier ops pin the space in spExtra.isDesktop; anything else (uiv.run of
  // a bare XClick) follows the run's !CVSCOPE, same as run_command does
  const spExtra = (cmdFields && cmdFields.spExtra) || {}
  const isDesktopScope = typeof spExtra.isDesktop === 'boolean'
    ? spExtra.isDesktop
    : isCVTypeForDesktop(getVarsInstance().get('!CVSCOPE'))

  // bringBrowserToForeground / bringIDEandBrowserToBackground are the same
  // shape as XDesktopAutomation: one IPC ask to the panel, byPass: true, no
  // content script and no tab. They are also the FIRST line of every desktop
  // demo, so demanding a tab made a freshly started browser fail before it
  // could reach the uiv.goto that would have created one — E901 on line 30 of
  // DesktopClickAccuracyRange, which is precisely the failure the desktop
  // exemption below was added to stop.
  const isTabFreeCmd = /^(store|echo|comment|pause|throwError|XDesktopAutomation|bringBrowserToForeground|bringIDEandBrowserToBackground)$/i.test(cmd) ||
    (isXInputCmd && isDesktopScope)

  const isOpenCmd = /^(open|openBrowser)$/i.test(cmd)

  let tab = await getTargetTab({ tabFree: isTabFreeCmd })

  // No usable WEB tab — the browser is showing only extension pages,
  // chrome://settings, a new-tab page and the like.
  //
  // This used to hand `open` that browser-internal tab and let the player's
  // special-page recovery navigate it: openNewUrlInPlayTab, then poll until
  // the tab leaves the chrome:// page. That recovery is fragile — when it does
  // not take, nothing reports an error, the poll just spins until the 60s
  // page-load timeout (Error #230), which is the failure this path has
  // produced more than once.
  //
  // So do the thing that cannot get stuck: create a tab ON the target URL and
  // let it load. The command then runs against a normal http(s) tab with a
  // content script already in it — the ordinary path, no recovery involved.
  if (!tab && isOpenCmd) {
    try {
      tab = await createTabForOpen(target)
      if (tab) {
        scriptTabId = tab.id
        store.dispatch(act.addLog('info', `No web tab open — created one for ${target}`))
      }
    } catch (e) { /* fall back to the browser-internal tab below */ }
  }
  // Tab creation itself failed (rare: no window to create it in). Fall back to
  // the old behaviour rather than giving up — a slow path beats no path.
  if (!tab && isOpenCmd) {
    tab = await getStartTabForOpen()
    if (tab) {
      scriptTabId = tab.id
      store.dispatch(act.addLog('info', `Starting from browser-internal page ${tab.url || '(no url)'}`))
    }
  }
  if (!tab && !isTabFreeCmd) {
    return { ok: false, error: E901_NO_TAB }
  }

  // open navigates and then WAITS for the load — and Chrome THROTTLES loading
  // in background tabs. When the user's active tab is a chrome:// page, the
  // fallbacks above resolve to a web tab they are NOT looking at (typically
  // the previous run's play tab), the throttled load never reaches 'complete',
  // and the run dies at the 60s #230 timeout. open's job is to SHOW a page:
  // bring the tab to the front before navigating — that un-throttles the load
  // and the user watches the run instead of a frozen chrome:// screen.
  if (isOpenCmd && tab && tab.id != null) {
    try {
      const t = await Ext.tabs.get(tab.id)
      // window check: a tab active in an UNFOCUSED window still loads
      // throttled and invisibly — see the twin comment in nativeOpen
      const win = await Ext.windows.get(t.windowId).catch(() => null)
      if (!t.active || (win && !win.focused)) {
        await activateTab(t.id, true)
        store.dispatch(act.addLog('info', `script tab → #${(t.index || 0) + 1} brought to front for open`))
      }
    } catch (e) { /* tab may be gone — the command itself will report it */ }
  }

  // Starting a command on a non-http tab is the setup behind every Error #230
  // this path has produced. Say so in the log: without it the run just stalls
  // for 60s and the report says nothing about which tab it was working on.
  if (tab && !/^https?:|^file:/i.test(tab.url || '')) {
    store.dispatch(act.addLog(
      'info',
      `${cmd} starts on a non-web tab: #${(tab.index || 0) + 1} "${tab.url || '(no url)'}" (${tab.status || 'unknown'})`
    ))
  }
  const restoreRunTabState = () => restoreRunTabStateFor(tab)

  // Mark the run's start by the last log entry's id, NOT by logs.length: the
  // store keeps only the last 500 entries, so once that cap is reached the
  // length stays pinned and slice(lengthBefore) is [] for every later run —
  // which here means a failing command's error log goes unseen and the
  // command reports ok:true.
  const logsBeforeRun = store.getState().logs
  const runLogMarker = logsBeforeRun.length ? logsBeforeRun[logsBeforeRun.length - 1].id : null
  timing.tabResolved = Date.now()

  // The session path: no playerPlay, no start/stop lifecycle, no polling for a
  // run that is already over by the time we notice it started.
  if (opts && opts.fast && FAST_PATH_COMMANDS.test(cmd)) {
    await restoreRunTabState()
    const r = await runOneCommandFast(cmd, target, value, cmdFields, tab, timing)
    firstCommandDone = true
    timing.ended = Date.now()
    perfRecord(cmd, timing)
    return stopRequested ? { ok: false, error: 'Script stopped' } : r
  }

  // Anything else keeps the full player pipeline. CLOSE the session first: the
  // player expects to drive the app through NORMAL -> PLAYER -> NORMAL itself,
  // and a classic `open` (reachable here via uiv.run('open', …)) relies on
  // that teardown to invalidate the content script's IPC. Leaving our session
  // open across it left the old connection cached, so the page-load probe kept
  // seeing the same ipc secret after the navigation and failed with #210/#220
  // on the SECOND open of a script. Cost is one stop per player-path command —
  // and those are the rare ones (uiv.run, ai.*), not the per-loop-iteration
  // ones.
  await endScriptSession()
  scriptSessionStale = true

  // ... and only NOW restore the base tab: the session stop above rebased
  // firstPlay to the tab the session ended on, which — when page ops had
  // moved to another tab — silently shifted the anchor that selectWindow
  // tab=N counts from. Symptom: the FIRST selectWindow of a run resolved
  // correctly, the SECOND one counted from the wrong tab and failed with
  // E210/E212 (seen in DemoTabs: tab=1 worked, tab=2 "not found").
  await restoreRunTabState()

  // fast commands (store, echo, eval) can start AND finish between two
  // status polls — track the player's per-run playUID instead
  const prevPlayUID = (() => {
    try { return getPlayer({ name: 'testCase' }).getState().playUID } catch (e) { return null }
  })()

  // The play pipeline can fail BEFORE the player ever starts — the
  // save-before-run step resolving false, its auto-save rejecting, or the
  // call stack's prepare (tab resolution) throwing. Dispatched
  // fire-and-forget, every one of those was a mute 10s stall ending in a
  // generic E902 ("sometimes open hangs"). Capture the outcome so the E902
  // can name its cause — and log it the moment it happens.
  let playerPlayFailure = null
  Promise.resolve(store.dispatch(act.playerPlay({
    macroId,
    skipSave: !!executionMacroId,
    title: 'JS Script',
    extra: { scriptSilent: true, loggedAs: bridgeOpLogged },
    mode: Player.C.MODE.STRAIGHT,
    playUrl: tab ? tab.url : '',
    playtabIndex: tab ? tab.index : 0,
    playtabId: tab ? tab.id : null,
    startIndex: 0,
    startUrl: /^(open|openBrowser)$/i.test(cmd) ? target : null,
    resources: [{ cmd, target, value, ...(cmdFields || {}) }],
    postDelay: 0,
    // first bridge call starts a fresh variable scope (like a normal macro
    // run), later calls keep it so vars persist across the whole script
    // vars were reset once at script start (runScript) — a per-command reset
    // here would wipe values the script uiv.setVar'd before its first command
    keepVariables: 'yes',
    // settings the script changed with uiv.setVar beat the app config, which
    // prepare would otherwise re-apply on top of them for this command
    overrideScope: { ...scriptScopeOverrides },
    isStep: false
  }))).then(started => {
    if (started === false) {
      playerPlayFailure = 'the save-before-run step did not save (dialog cancelled or dismissed, or the save failed)'
    }
  }).catch(e => {
    playerPlayFailure = (e && e.message) ? e.message : String(e)
    // only worth a log line while the player never started — a rejection
    // after a started run is that run's own failure, reported elsewhere
    if (!timing.startedAt) {
      store.dispatch(act.addLog('error', `player did not start for '${cmd}': ${playerPlayFailure}`))
    }
  })

  timing.dispatched = Date.now()

  const started = await waitForPlayerToStop(prevPlayUID, timing)
  firstCommandDone = true

  timing.ended = Date.now()
  perfRecord(cmd, timing)

  if (stopRequested) {
    return { ok: false, error: 'Script stopped' }
  }
  if (!started) {
    // include everything known about WHY — this error used to be a guess
    const st = store.getState()
    const diag = playerPlayFailure
      ? `cause: ${playerPlayFailure}`
      : `no failure reported — player status '${st.player.status}', ` +
        `${hasUnsavedMacro(st) ? 'editor has UNSAVED changes (a save dialog may be waiting)' : 'editor is saved'}. ` +
        'A manual macro run from the Files tab usually resets a stuck play state — please report this on the forum'
    return { ok: false, error: `E902: command '${cmd}' did not start within 10s — ${diag}` }
  }

  // selectWindow (tab=N / tab=open / tab=close) legitimately retargets the
  // play tab in the background — adopt its choice as the script's pinned tab.
  // Only for selectWindow: bg also mirrors user tab-clicks into toPlay while
  // idle, and adopting those would re-introduce the drift this pin prevents.
  if (/^selectWindow$/i.test(cmd)) {
    try {
      const g = await getGlobalState()
      const bgToPlay = g && g.tabIds && g.tabIds.toPlay
      if (bgToPlay && bgToPlay !== scriptTabId) {
        let t = await Ext.tabs.get(bgToPlay).catch(() => null)
        // A popup the site opened with window.open('about:blank') gets its
        // real location a beat later. Adopting only web tabs is right, but
        // deciding while the popup still reads about:blank left the script
        // pinned to the OLD tab — its finders ran there while the error
        // report (taken from bg's toPlay) showed the popup's page
        // (OPEN-ISSUES 17.9, Stripe invoice popups). Wait for the popup to
        // leave about:blank and finish loading, bounded, then decide.
        const deadline = Date.now() + 10000
        while (t && !stopRequested && Date.now() < deadline &&
               (/^about:blank$/i.test(t.url || '') || t.status !== 'complete') &&
               !/^(chrome|moz|edge)-extension:|^(chrome|edge):/.test(t.url || '')) {
          emit('wait', { label: 'selectWindow — page loading', remainingS: Math.ceil((deadline - Date.now()) / 1000) })
          await delayMs(150)
          t = await Ext.tabs.get(bgToPlay).catch(() => null)
        }
        emit('wait', null)
        if (isWebTab(t)) {
          scriptTabId = bgToPlay
          store.dispatch(act.addLog('info', `script tab → #${t.index + 1} "${(t.title || t.url || '').slice(0, 50)}"`))
        }
      }
    } catch (e) { /* keep the current pin */ }
  }

  // a vanished marker (evicted past the 500 cap, or a cleared log) means
  // everything still in the store is newer — take it all
  const logsNow = store.getState().logs
  const markerIdx = runLogMarker === null ? -1 : logsNow.findIndex(l => l.id === runLogMarker)
  const newLogs = logsNow.slice(markerIdx + 1)
  const errorLog = newLogs.filter(l => l.type === 'error').pop()
  if (errorLog) {
    return { ok: false, error: String(errorLog.text) }
  }
  return { ok: true }
}

// Resolves true once a run has started and finished, false if it never
// started. Start detection uses the player's playUID (a fresh random per
// play()) — a fast command can start AND finish between two status checks, so
// "status left STOPPED" alone misses them entirely.
async function waitForPlayerToStop (prevPlayUID, timing) {
  const playUIDChanged = () => {
    try {
      return getPlayer({ name: 'testCase' }).getState().playUID !== prevPlayUID
    } catch (e) {
      return false
    }
  }

  const isStopped = () => store.getState().player.status === Player.C.STATUS.STOPPED

  // The player's END event is the fast path — polling alone rounded every
  // command up to the next tick, which on a script of one-command runs is pure
  // latency (a uiv.browser.type costs single-digit ms of real work). The interval stays
  // as a safety net and to detect a run that never started; it is only reading
  // in-memory state, no IPC.
  const player = (() => {
    try { return getPlayer({ name: 'testCase' }) } catch (e) { return null }
  })()

  return new Promise(resolve => {
    const startWait = Date.now()
    const maxMs = 15 * 60 * 1000
    let started = false
    let settled = false
    let timer = null

    const finish = (value) => {
      if (settled) return
      settled = true
      if (timer) clearInterval(timer)
      if (player && player.off) {
        try { player.off('END', check) } catch (e) { /* listener already gone */ }
      }
      resolve(value)
    }

    function check () {
      if (settled) return

      if (!started && (playUIDChanged() || !isStopped())) {
        started = true
        if (timing && !timing.startedAt) timing.startedAt = Date.now()
      }

      if (stopRequested) {
        if (started) {
          try { getPlayer({ name: 'testCase' }).stop() } catch (e) { /* already stopped */ }
        }
        return finish(started)
      }

      // finished = our run happened (uid changed) AND the player is idle again
      if (started && playUIDChanged() && isStopped()) return finish(true)

      if (!started && Date.now() - startWait > 10000) return finish(false)
      if (Date.now() - startWait > maxMs) return finish(true)
    }

    // END fires before redux has settled the status, so it triggers a check
    // rather than resolving directly — the check confirms STOPPED first,
    // otherwise the next command would see "another macro is already running"
    if (player && player.on) player.on('END', check)

    timer = setInterval(check, 10)
    check()
  })
}

// ---------------------------------------------------------------------------
// navigation watcher
// ---------------------------------------------------------------------------
// A click that triggers navigation returns BEFORE the new page loads, so the
// next uiv call would race it and read the OLD page ("I clicked the link but
// nothing changed"). The first version handled that by POLLING the tab for a
// flat 500ms after EVERY click — correct, and the single biggest cost in a
// form-filling script: 20 clicks meant 10 seconds spent detecting the zero
// navigations those clicks actually caused.
//
// Instead the run arms one chrome.tabs.onUpdated listener (already covered by
// the "tabs" permission — webNavigation would add a scary new one) and pays
// only when something really navigates:
//   - clicks watch briefly for a navigation to START, since the click
//     itself returns before the event fires, then wait for it to COMPLETE
//   - every page-touching op awaits quiescence first, so a navigation that
//     begins late is still caught before the next command reads the DOM
// ---------------------------------------------------------------------------
// uiv.banner — on-page progress overlay ("Page 1 done, moving on", "fill the
// captcha"). One fixed-id element per tab, idempotent to re-inject — the same
// pattern as the automation border (automation_tab_mark.js). pointer-events
// none: the banner can never block the macro or the user.
// ---------------------------------------------------------------------------

const BANNER_ID = '__uivision_script_banner__'

// runs inside the page (chrome.scripting.executeScript) — no closures allowed.
// Look & feel matches the side panel's status bar chip (tone-idle light blue,
// brand blue #1a6ce0). A small "Ui.Vision" label sits ON the top border line
// (fieldset-legend style) so the message is clearly from the extension, not
// from the website — pure text, so no data-URI/CSP fragility on any site.
// {icon: false} hides the label. tone 'green' switches to the status bar's
// success palette — nice for "done" messages; default is the idle light blue.
const injectedShowBanner = (id, html, position, showBrand, tone) => {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('div')
    el.id = id
    document.documentElement.appendChild(el)
  }
  const green = tone === 'green'
  el.style.cssText = [
    'position: fixed',
    position === 'bottom' ? 'bottom: 24px' : 'top: 24px',
    'left: 50%',
    'transform: translateX(-50%)',
    'display: flex',
    'align-items: center',
    'gap: 12px',
    'max-width: min(84vw, 760px)',
    'padding: 13px 22px',
    'border-radius: 12px',
    green
      ? 'background: linear-gradient(180deg, #fbfff5 0%, #f0fbe4 100%)'
      : 'background: linear-gradient(180deg, #f4faff 0%, #e9f3fd 100%)',
    green ? 'border: 1px solid #b7eb8f' : 'border: 1px solid #b7d7f4',
    'color: #1f2d3d',
    'font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif',
    'text-align: left',
    green
      ? 'box-shadow: 0 8px 28px rgba(56, 158, 13, 0.25), 0 2px 6px rgba(0, 0, 0, 0.10)'
      : 'box-shadow: 0 8px 28px rgba(26, 108, 224, 0.28), 0 2px 6px rgba(0, 0, 0, 0.10)',
    'z-index: 2147483647',
    'pointer-events: none'
  ].join(';')

  el.innerHTML = ''
  if (showBrand !== false) {
    const brand = document.createElement('div')
    brand.textContent = 'Ui.Vision'
    brand.style.cssText = [
      'position: absolute',
      'top: -9px',
      'left: 16px',
      'padding: 1px 8px',
      'border-radius: 999px',
      green ? 'background: #fbfff5' : 'background: #f4faff',
      green ? 'border: 1px solid #b7eb8f' : 'border: 1px solid #b7d7f4',
      green ? 'color: #389e0d' : 'color: #1a6ce0',
      'font: 600 11px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif',
      'letter-spacing: 0.3px'
    ].join(';')
    el.appendChild(brand)
  }
  const msg = document.createElement('div')
  msg.style.cssText = 'min-width: 0'
  // innerHTML is fine trust-wise: the script author already has full page
  // access via uiv.evaluate, and innerHTML never executes <script> anyway
  msg.innerHTML = html
  el.appendChild(msg)
}

const injectedRemoveBanner = (id) => {
  const el = document.getElementById(id)
  if (el) el.remove()
}

const injectedSetBannerVisible = (id, visible) => {
  const el = document.getElementById(id)
  if (el) el.style.visibility = visible ? 'visible' : 'hidden'
}

// { tabId, html, position, icon, tone, timer } while a banner is showing,
// else null. Module-level (not per-run): the end-of-run grace timer outlives
// runScript.
let bannerState = null

async function bannerShow (args) {
  if (bannerState && bannerState.timer) {
    clearTimeout(bannerState.timer)
    bannerState.timer = null
  }
  const html = String(args.html || '')
  if (!html) return bannerClear()

  const tab = await getTargetTab()
  if (!tab) throw new Error(E901_NO_TAB)

  // banner moved to another tab: remove the old element first
  if (bannerState && bannerState.tabId !== tab.id) await bannerClear()

  const position = args.position === 'bottom' ? 'bottom' : 'top'
  const icon = args.icon !== false
  const tone = args.tone === 'green' ? 'green' : 'blue'
  bannerState = { tabId: tab.id, html, position, icon, tone, timer: null }
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: injectedShowBanner,
    args: [BANNER_ID, html, position, icon, tone]
  })

  const seconds = parseFloat(args.seconds)
  if (seconds > 0) {
    bannerState.timer = setTimeout(() => { bannerClear().catch(() => {}) }, seconds * 1000)
  }
}

async function bannerClear () {
  if (!bannerState) return
  const { tabId, timer } = bannerState
  if (timer) clearTimeout(timer)
  bannerState = null
  try {
    await chrome.scripting.executeScript({ target: { tabId }, func: injectedRemoveBanner, args: [BANNER_ID] })
  } catch (e) { /* tab already gone — nothing to remove */ }
}

// The visual finders screenshot the page, and a banner in the shot can occlude
// the match or add phantom OCR words — hide it around every capture-based
// find. Hidden for the WHOLE find, not per attempt: no flicker during
// auto-wait retries.
async function withBannerHidden (fn) {
  await bannerSetVisible(false)
  try {
    return await fn()
  } finally {
    await bannerSetVisible(true)
  }
}

async function bannerSetVisible (visible) {
  if (!bannerState) return
  try {
    await chrome.scripting.executeScript({
      target: { tabId: bannerState.tabId },
      func: injectedSetBannerVisible,
      args: [BANNER_ID, visible]
    })
  } catch (e) { /* tab gone — the next banner call re-resolves */ }
}

// Run finished: errors and stops clear the banner immediately (a stale
// "working..." overlay after a crash misleads), while a successful run leaves
// the final message up for a grace period — demos end ON a closing banner.
// An explicit {seconds} timer set by the script stays in charge if pending.
const BANNER_END_OF_RUN_GRACE_MS = 8000

function bannerEndOfRun (ok) {
  if (!bannerState) return
  if (!ok) {
    bannerClear().catch(() => {})
    return
  }
  if (!bannerState.timer) {
    bannerState.timer = setTimeout(() => { bannerClear().catch(() => {}) }, BANNER_END_OF_RUN_GRACE_MS)
  }
}

let navPending = false
// Counts navigation STARTS on the pinned tab. waitForOpenLoad snapshots it
// before navigating: navPending alone can flip true and back false between
// two of its polls (a fast load), the counter cannot.
let navSeq = 0
let navListener = null

function armNavigationWatcher () {
  if (navListener) return
  navListener = (tabId, changeInfo) => {
    // keep the banner alive across navigations (the element dies with the old
    // document) — injected at loading AND complete like the automation border,
    // so it reappears as early as the new document allows
    if (bannerState && tabId === bannerState.tabId && (changeInfo.status === 'loading' || changeInfo.status === 'complete')) {
      chrome.scripting.executeScript({
        target: { tabId },
        func: injectedShowBanner,
        args: [BANNER_ID, bannerState.html, bannerState.position, bannerState.icon, bannerState.tone]
      }).catch(() => { /* mid-navigation limbo — the 'complete' pass follows */ })
    }
    if (scriptTabId === null || tabId !== scriptTabId) return
    if (changeInfo.status === 'loading') { navPending = true; navSeq++ }
    else if (changeInfo.status === 'complete') navPending = false
  }
  try {
    Ext.tabs.onUpdated.addListener(navListener)
  } catch (e) {
    navListener = null // no listener API — awaitPageQuiet then falls back to polling
  }
}

function disarmNavigationWatcher () {
  if (navListener) {
    try { Ext.tabs.onUpdated.removeListener(navListener) } catch (e) { /* already gone */ }
    navListener = null
  }
  navPending = false
}

// Wait until the pinned tab has finished navigating. The normal case — nothing
// in flight — returns without a single tab round trip, which is the whole
// point: this is called before every page-touching op.
async function awaitPageQuiet () {
  if (scriptTabId === null) return
  // no listener (Firefox stub / addListener threw): fall back to one direct
  // status read rather than trusting a flag nothing maintains
  if (!navListener) {
    const t = await Ext.tabs.get(scriptTabId).catch(() => null)
    navPending = !!(t && (t.status === 'loading' || t.pendingUrl))
  }
  if (!navPending) return

  const capMs = (parseFloat(store.getState().config.timeoutPageLoad) || 60) * 1000
  const start = Date.now()
  try {
    while (navPending && Date.now() - start < capMs) {
      if (stopRequested) return
      const t = await Ext.tabs.get(scriptTabId).catch(() => null)
      if (!t) return // tab closed — let the next command report it
      if (t.status === 'complete' && !t.pendingUrl) {
        navPending = false
        return
      }
      emit('wait', { label: 'page loading', remainingS: Math.ceil((capMs - (Date.now() - start)) / 1000) })
      await delayMs(50)
    }
  } finally {
    emit('wait', null)
  }
}

// The click has already returned when this runs, so a navigation it caused may
// still be a few ms from firing its event — hence a short START window. It is
// a ceiling, not a delay: the loop exits the moment the event arrives.
const NAV_START_WATCH_MS = 150

async function settleAfterClick () {
  // Tag alone cannot rule out navigation: INPUT includes submit/image buttons,
  // and even a text field can navigate from its click handler.
  const until = Date.now() + NAV_START_WATCH_MS
  while (!navPending && Date.now() < until) {
    if (stopRequested) return
    await delayMs(25)
  }
  // onUpdated can arrive after this window even though the browser is already
  // loading. Confirm once directly before trusting the event flag; pendingUrl
  // also catches a provisional navigation while status still says complete.
  if (scriptTabId !== null) {
    const tab = await Ext.tabs.get(scriptTabId).catch(() => null)
    if (tab && (tab.status === 'loading' || tab.pendingUrl)) navPending = true
  }
  await awaitPageQuiet()
}

// interruptible sleep; accepts ms number or '5s' / '2m' strings
async function scriptPause (input) {
  let ms = 0
  if (typeof input === 'number') {
    ms = input
  } else {
    const m = /^\s*(\d+(?:\.\d+)?)\s*(ms|s|m)?\s*$/i.exec(String(input))
    if (!m) return { ok: false, error: `uiv.sleep: cannot parse duration '${input}' — pass milliseconds as a number (uiv.sleep(1500)) or a string with a unit: '500ms', '5s', '2m'. (Before adding a sleep at all: finders auto-wait, uiv.goto waits for the load, and a click that navigates is waited for — wait for the THING with uiv.$ instead of for a time.)` }
    ms = parseFloat(m[1]) * ({ ms: 1, s: 1000, m: 60000 }[(m[2] || 'ms').toLowerCase()])
  }

  const until = Date.now() + ms
  // countdown in the status bar, like the finders and page loads — a long
  // sleep otherwise looks like a hang. Sub-1.5s sleeps only flicker the bar.
  const showCountdown = ms >= 1500
  try {
    while (Date.now() < until) {
      if (stopRequested) return { ok: false, error: 'Script stopped' }
      if (showCountdown) emit('wait', { label: 'sleep', remainingS: Math.ceil((until - Date.now()) / 1000), countdownOnly: true })
      await runnerDelayMs(Math.min(1000, until - Date.now()))
    }
  } finally {
    if (showCountdown) emit('wait', null)
  }
  return { ok: true }
}

// Run one ai* command and hand back what it stored.
//
// The prompt goes in through a VARIABLE rather than straight into the target,
// because a command's target is variable-rendered on its way to the browser:
// a prompt containing ${...} — asking about template syntax, pasting page
// source — would otherwise be silently rewritten before the model ever saw it.
// Substitution is a single pass, so the text that lands in its place is not
// rescanned.
async function runAiCommand (cmd, promptText) {
  const vars = getVarsInstance()
  vars.set({ __uiv_ai_prompt: String(promptText) })

  const r = await runOneCommand(cmd, '${__uiv_ai_prompt}', '__uiv_ai_out')
  if (!r.ok) throw new Error(r.error)

  const out = vars.get('__uiv_ai_out')
  return out === undefined ? '' : out
}

// ---------------------------------------------------------------------------
// OCR engine NAMES — a JS script names its reader, it does not number it.
// ---------------------------------------------------------------------------
// 98/99/1/2/3 are a Settings/OCR.Space implementation detail that says nothing
// about which reader you get: "engine 2" and "engine 99" read the same to
// anyone who has not memorised the table. Classic table macros keep the
// numbers; scripts get the names.
//
// A number is REFUSED here rather than quietly accepted. Silently taking both
// would leave every macro, doc and log free to keep using numbers, which is
// the state this replaces — and a macro pasted over from the classic side
// would run with a reader nobody chose. The error names the replacement, so
// the fix is the next thing you read.
const OCR_ENGINE_NAMES = {
  builtin:          98, // cross-platform ocrs in the XModule host — the SAME recognition on every OS
  javascript:       98, // deprecated alias (the removed Tesseract engine's name)
  builtin_win:      99, // OS reader: Windows.Media.Ocr
  builtin_mac:      99, // OS reader: Apple Vision
  xmodule:          99, // deprecated alias of builtin_win/builtin_mac
  aiprovider:       90, // the configured AI provider as OCR engine (task 'aiocr')
  ocrspace_engine1:  1,
  ocrspace_engine2:  2,
  ocrspace_engine3:  3
}
// the name shown when a caller sends a bare number: the OS-appropriate one
const OS_LOCAL_OCR_NAME = /mac/i.test((typeof navigator !== 'undefined' && navigator.userAgent) || '') ? 'builtin_mac' : 'builtin_win'
const OCR_ENGINE_BY_NUMBER = { 98: 'builtin', 99: OS_LOCAL_OCR_NAME, 90: 'aiprovider', 1: 'ocrspace_engine1', 2: 'ocrspace_engine2', 3: 'ocrspace_engine3' }
const OCR_ENGINE_LIST = Object.keys(OCR_ENGINE_NAMES).filter(n => n !== 'javascript' && n !== 'xmodule').map(n => `'${n}'`).join(', ')

// undefined when the caller passed nothing — the difference between "no engine
// asked for" and "this engine asked for" decides the desktop-scope default
// (see getOcrResponse), so it must survive as undefined rather than a fallback.
const resolveOcrEngine = (value, where) => {
  if (value === undefined || value === null || value === '') return undefined

  const key = String(value).trim().toLowerCase()
  if (Object.prototype.hasOwnProperty.call(OCR_ENGINE_NAMES, key)) {
    return OCR_ENGINE_NAMES[key]
  }

  const named = OCR_ENGINE_BY_NUMBER[key]
  if (named) {
    throw new Error(
      `${where}: {engine: ${JSON.stringify(value)}} — engine NUMBERS are classic-macro syntax. A JS script names its reader: {engine: '${named}'}. Valid: ${OCR_ENGINE_LIST}`
    )
  }
  throw new Error(`${where}: unknown OCR engine ${JSON.stringify(value)}. Valid: ${OCR_ENGINE_LIST}`)
}

// ---------------------------------------------------------------------------
// OCR reader — uiv.ocr.read()
// ---------------------------------------------------------------------------
// The counterpart to ocr.findText: instead of searching the recognised words for
// something you already know, hand back everything that was recognised.
//   uiv.ocr.read()                       the browser viewport
//   uiv.ocr.read({ area: match | rect }) ONE REGION of it — the classic
//                                        OCRExtract*Relative flows, composed
//                                        from a finder + plain JS instead
//   uiv.ocr.read({ scope: 'desktop' })   the screen (area then in screen px)
//   uiv.ocr.read({ image: 'x.png' })     a stored image (classic
//                                        OCRExtractScreenshot) — {area} then
//                                        crops in IMAGE pixels, and {engine}
//                                        picks the reader per call, so a
//                                        capture loop can shoot first and read
//                                        each part with the XModule Local OCR
//                                        afterwards
// Returns the text as a string. Options {engine, language} match the finders.
async function ocrReadText (args) {
  const state = store.getState()
  const engineAsked = resolveOcrEngine(args.engine, 'uiv.ocr.read')
  const engine = engineAsked !== undefined ? engineAsked : state.config.ocrEngine
  // AFTER the engine is resolved, not before: {engine: 'xmodule'} needs no
  // OCR.Space account, so the "OCR disabled" guard must see which reader this
  // call asked for.
  guardOcrSettings({ store, engine })

  const lang = String(args.language || state.config.ocrLanguage || 'eng').toLowerCase()
  const rect = normalizeRectArg(args.area, 'uiv.ocr.read')

  if (args.image) {
    // A stored image is read directly: load it out of storage, crop to {area}
    // if one was given, and hand the pixels to the engine THIS call asked for.
    // (This used to route through the classic OCRExtractScreenshot command,
    // which reads the whole file with the Settings > OCR engine — {engine} and
    // {area} were silently ignored.) {area} is in IMAGE pixels — the stored
    // capture's own coordinate space, not the viewport's: a shot taken at
    // devicePixelRatio 2 is twice the CSS size, and a finder match's rect
    // would land on the wrong half of it.
    const name = String(args.image)
    const resolved = await resolveStoredFile(/\.png$/i.test(name) ? name : `${name}.png`, 'uiv.ocr.read', false, args.store)
    if (resolved.missingFrom) {
      throw new Error(`uiv.ocr.read: image '${resolved.fileName}' is not stored — looked in ${resolved.missingFrom.map(s => s.label).join(' and ')}. uiv.shot.viewport/page/element/desktop capture one; uiv.files.list() shows what exists`)
    }
    const stored = await resolved.fileStore.get().read(resolved.fileName, 'DataURL')
    const imageDataUrl = rect ? await subImage(stored, rect) : stored
    const { response } = await getOcrResponse({
      ocrApiTimeout: config.ocr.apiTimeout,
      store,
      lang,
      engine,
      engineExplicit: engineAsked !== undefined,
      scale: 'true',
      isTable: false,
      isDesktop: false,
      isLog: false,
      imageDataUrl
    })
    return parsedResultsToText(response)
  }

  const isDesktop = args.scope === 'desktop'

  if (!isDesktop) {
    const tab = await getTargetTab()
    if (!tab) throw new Error(E901_NO_TAB)
    await updateState(setIn(['tabIds', 'toPlay'], tab.id))
  }

  const { response } = await getOcrResponse({
    searchArea: rect ? 'rect' : 'viewport',
    storedImageRect: rect,
    ocrApiTimeout: config.ocr.apiTimeout,
    store,
    lang,
    engine,
    engineExplicit: engineAsked !== undefined,
    scale: 'true',
    isTable: false,
    isDesktop,
    isLog: false
  })

  return parsedResultsToText(response)
}

// {area: ...} accepts a match from any finder (its rect is used) or a bare
// rect — {left, top, width, height} like match.rect, or {x, y, width, height}.
// Returns the {x, y, width, height} shape the capture pipeline wants, or null
// when no area was given.
// {area} on the visual finders (uiv.findImage(s), uiv.ocr.findText(s)): a
// per-call search region — the composed form of the classic
// visionLimitSearchArea SETTING, which is blocked in scripts because state
// set on line 12 must not silently change what "find" means on line 40.
// A match carries its coordinate space, so mixing spaces fails loudly here;
// a bare {x, y, width, height} rect is interpreted in the FINDER's scope
// (viewport CSS px in browser scope, screen px in desktop scope) — the same
// rule uiv.ocr.read({area}) documents.
function normalizeFinderArea (area, fn, finderScope) {
  const rect = normalizeRectArg(area, fn)
  if (!rect) return null
  if (area.frameLocal === true) {
    throw new Error(
      `${fn}: the {area} match is frame-local (found in a cross-origin iframe), so its rect is not in ` +
      'viewport coordinates and cannot define a search area — anchor the area on something outside that iframe'
    )
  }
  const want = finderScope === 'desktop' ? 'desktop' : 'browser'
  const got = typeof area.scope === 'string' ? area.scope : null
  if (got && got !== want) {
    throw new Error(
      `${fn}: the {area} match is in ${got === 'desktop' ? 'SCREEN' : 'VIEWPORT'} coordinates but this search runs in the ` +
      `${want === 'desktop' ? 'SCREEN' : 'VIEWPORT'} — find the area anchor with the same {scope} as this search. ` +
      '(A bare {x, y, width, height} rect is always interpreted in the finder\'s own scope.)'
    )
  }
  return rect
}

function normalizeRectArg (area, fn) {
  if (area === undefined || area === null) return null
  if (typeof area !== 'object') throw new Error(`${fn}: area must be a match from a finder or a rect {x, y, width, height}`)
  const r = area.rect || area
  const x = r.left !== undefined ? r.left : r.x
  const y = r.top !== undefined ? r.top : r.y
  const ok = [x, y, r.width, r.height].every(v => typeof v === 'number' && isFinite(v))
  if (!ok || r.width <= 0 || r.height <= 0) {
    throw new Error(`${fn}: area needs {x|left, y|top, width, height} (all finite, size > 0) or a match from a finder`)
  }
  return { x: Math.round(x), y: Math.round(y), width: Math.round(r.width), height: Math.round(r.height) }
}

// Everything an OCR pass recognised, as one string — what the "Show OCR
// Overlay" button displays. Shared with ocr.findTexts, which reports it back when
// a search finds nothing: the pass already ran, so the answer to "why didn't
// it match?" costs nothing extra to include.
function parsedResultsToText (response) {
  return ((response && response.ParsedResults) || [])
    .map(r => r.ParsedText || '')
    .join('\n')
    .replace(/\r\n/g, '\n')
}

// OCR reader escalation, environment-aware — the note names the next step(s)
// for the AUTHOR to write into the macro; the engine is never switched at
// runtime. Options by what this install has: the OS reader ({engine:
// 'builtin_win'/'builtin_mac'}) reads native UI and screenshots far better
// than the cross-platform 'builtin' engine; uiv.ai.ask with a screenshot is
// a first-class reader too (free with a LOCAL model); the OCR.Space cloud
// OCR (engines 2/3, both auto-detect the text language — never 1) needs an
// API key; without one, {engine: 'aiprovider'} runs the configured AI
// provider as the OCR engine — and still mention the free ocr.space key
// rather than settling for the bad read.
function ocrSpaceUpgradeNote () {
  const cfg = store.getState().config || {}
  if ([1, 2, 3].includes(cfg.ocrEngine)) return '' // already reading with OCR.Space
  const osLocalOcr = `{engine: '${OS_LOCAL_OCR_NAME}'}`
  const xmoduleHint = cfg.ocrEngine == 99
    ? ''
    : ` If the Desktop Automation XModule is installed, retry with ${osLocalOcr} (the OS reader) — it reads native UI and screenshots far better than the cross-platform 'builtin' engine.`
  const aiHint = " uiv.ai.ask('what does ... say?', {images: [uiv.shot.viewport()]}) (uiv.shot.desktop() for screen reads) or uiv.ai.find('the <target>') read what OCR cannot" + (cfg.aiProvider === 'local' ? ' — and with the LOCAL model configured here, at no per-call cost.' : ' (one billable model call each).')
  return cfg.ocrSpaceApiKey
    ? ' BETTER READER AVAILABLE:' + xmoduleHint + " An OCR.Space API key is configured in this install — the cloud OCR (run by the Ui.Vision team) reads far more than the local engines, especially light-on-dark text: {engine: 'ocrspace_engine2'} for finders/anything that clicks (accurate coordinates); {engine: 'ocrspace_engine3'} for pure uiv.ocr.read (best text; coordinates less accurate). Both auto-detect the text language." + aiHint
    : ' BETTER READER AVAILABLE:' + xmoduleHint + aiHint + " When the local readers are not good enough (not even via an anchor word + uiv.offset) and no OCR.Space account is configured, {engine: 'aiprovider'} runs the configured AI provider as the OCR engine — integrated with findText/read like a cloud engine (billable; word coordinates approximate). The OCR.Space cloud OCR remains the stronger dedicated OCR — it needs a FREE API key from https://ocr.space/ocrapi, entered under Settings > OCR ({engine: 'ocrspace_engine2'} for finders/clicking, {engine: 'ocrspace_engine3'} for pure reads; both auto-detect the language): mention the free account to the user — do not silently settle for the bad read."
}

// Why an OCR search matched nothing, in one line for the Find probe's log.
function ocrMissNote (text) {
  const seen = summariseOcrText(text, 300)
  return seen
    ? ` — OCR recognised: "${seen}". If your word is not in there, OCR cannot read it here: match the target with a picture (uiv.findImage), or anchor on one of the words above and step to it with uiv.offset(match, dx, dy).${ocrSpaceUpgradeNote()}`
    : ` — OCR recognised no text at all here (check the engine and language under Settings > OCR).${ocrSpaceUpgradeNote()}`
}

// A model's "JSON" reply, made parseable: strip markdown fences and any prose
// preamble before the first brace/bracket, then JSON.parse — which still
// throws on genuinely broken output, by design (the aiAsk caller retries).
function parseJsonReply (text) {
  let s = String(text || '').trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```\s*$/i.exec(s)
  if (fence) s = fence[1].trim()
  const start = s.search(/[[{]/)
  if (start > 0) s = s.slice(start)
  return JSON.parse(s)
}

// The same text folded onto one line for an error message, capped so a dense
// page cannot bury the rest of the diagnosis.
function summariseOcrText (text, limit = 800) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim()
  if (!flat) return ''
  return flat.length > limit
    ? `${flat.slice(0, limit)}… (${flat.length} characters in total)`
    : flat
}

// ---------------------------------------------------------------------------
// CSV files — the same storage the CSV tab and the classic csv* commands use
// ---------------------------------------------------------------------------
// A script cannot touch the filesystem: the interpreter has no fs, no Blob, no
// fetch. It does not need one — CSV files already live in a storage layer
// (IndexedDB in browser mode, the real disk in XFile mode), so these ops just
// hand it real JS arrays. That replaces the `!csvLine` accumulator idiom,
// where a hidden magic variable collected one row at a time and nothing could
// read it back.

const csvFileName = (name) => {
  const n = String(name || '').trim()
  if (!n) throw new Error('csv: a file name is required')
  return /\.csv$/i.test(n) ? n : `${n}.csv`
}

const getCsvStorage = () => getStorageManager().getCSVStorage()

async function csvReadRows (name) {
  const fileName = csvFileName(name)
  const exists = await getCsvStorage().exists(fileName)
  if (!exists) {
    throw new Error(`csv: file '${fileName}' does not exist — uiv.csv.list() shows what is there, uiv.csv.exists('${fileName}') tests without throwing`)
  }
  const text = await getCsvStorage().read(fileName, 'Text')
  return parseFromCSV(text)
}

// every row must be an array — a flat list of strings is the likely mistake,
// and silently writing it as one column per character helps nobody
function assertRows (rows, fn) {
  if (!Array.isArray(rows)) throw new Error(`${fn}: needs an array of rows, e.g. [['a', 'b'], ['c', 'd']]`)
  rows.forEach((row, i) => {
    if (!Array.isArray(row)) {
      throw new Error(`${fn}: row ${i + 1} is not an array — a CSV row is a list of cells: [['${String(row)}']] for a single-column row`)
    }
  })
  return rows
}

async function csvWriteRows (name, rows) {
  const fileName = csvFileName(name)
  const text = await stringifyToCSV(rows)
  await getCsvStorage().overwrite(fileName, new Blob([text]))
  store.dispatch(act.listCSV()) // the CSV tab mirrors the file list
  return fileName
}

// uiv.text.* — the RAW view of the same store. An explicit .txt/.csv is used
// as-is; an extension-less name resolves to whichever exists (.txt first),
// and defaults to .txt for a new file — so text.read('prompts') finds either
// prompts.txt or prompts.csv without the caller caring which one was saved.
async function textFileName (name) {
  const n = String(name || '').trim()
  if (!n) throw new Error('text: a file name is required')
  if (/\.(txt|csv)$/i.test(n)) return n
  const txt = `${n}.txt`
  if (await getCsvStorage().exists(txt)) return txt
  const csv = `${n}.csv`
  if (await getCsvStorage().exists(csv)) return csv
  return txt
}

async function textReadRaw (name) {
  const fileName = await textFileName(name)
  const exists = await getCsvStorage().exists(fileName)
  if (!exists) {
    throw new Error(`text: file '${fileName}' does not exist — uiv.csv.list() shows the CSV/TXT tab's files, uiv.csv.exists('${fileName}') tests without throwing`)
  }
  return getCsvStorage().read(fileName, 'Text')
}

async function textWriteRaw (name, text) {
  const fileName = await textFileName(name)
  await getCsvStorage().overwrite(fileName, new Blob([String(text)]))
  store.dispatch(act.listCSV()) // the CSV/TXT tab mirrors the file list
  return fileName
}

// uiv.files.* — the store verbs. Extension alone cannot route them, because
// .png lives in TWO tabs: Screenshots (captures — uiv.shot.viewport/page/
// element) and Vision (match templates — uiv.shot.area, and the AI chat's
// save_element_image). So a .png name is resolved by LOOKING: whichever tab
// actually holds it wins, and only a name present in both needs the caller to
// say which, via {store: 'vision'} / {store: 'screenshots'}.
//
// Resolving by lookup rather than by an explicit argument is what keeps the
// property this namespace exists for — a name FLOWS. uiv.shot.area() hands
// back a name and uiv.files.remove(name) takes it, with the caller never
// working out which kind of file it was; making vision images the one case
// that needs a flag would have broken exactly the verb that motivated this.
// Screenshots is probed first, so a collision keeps resolving the way it
// always did for callers that never knew Vision existed.
const FILE_STORES = [
  { id: 'csv', ext: /\.(csv|txt)$/i, defaultExt: '.txt', label: 'the CSV/TXT tab', get: () => getStorageManager().getCSVStorage(), refresh: () => act.listCSV() },
  { id: 'screenshots', ext: /\.png$/i, defaultExt: '.png', label: 'the Screenshots tab', get: () => getStorageManager().getScreenshotStorage(), refresh: () => act.listScreenshots() },
  { id: 'vision', ext: /\.png$/i, defaultExt: '.png', label: 'the Vision tab', get: () => getStorageManager().getVisionStorage(), refresh: () => act.listVisions() }
]

const STORE_IDS = FILE_STORES.map(s => s.id)

// every store whose extension matches — one for .csv/.txt, two for .png
const fileStoresFor = (fileName) => FILE_STORES.filter(s => s.ext.test(fileName))

const storeById = (id, fn) => {
  const hit = FILE_STORES.find(s => s.id === id)
  if (!hit) {
    throw new Error(`${fn}: unknown {store: '${id}'} — the stores are ${STORE_IDS.map(s => `'${s}'`).join(', ')} ('vision' holds the images uiv.findImage matches, 'screenshots' the captures)`)
  }
  return hit
}

// Resolve a name to {fileName, fileStore}. `soft` is for the predicate:
// uiv.files.exists must answer false rather than throw, or it cannot be used
// to guard the calls that do throw. `storeId` skips the lookup when the caller
// already knows which tab it means — the way out of an ambiguous name, and the
// way to name a file that does not exist yet.
async function resolveStoredFile (name, fn, soft, storeId) {
  const n = String(name || '').trim()
  if (!n) throw new Error(`${fn}: a file name is required`)

  if (storeId) {
    const forced = storeById(storeId, fn)
    return { fileName: forced.ext.test(n) ? n : `${n}${forced.defaultExt}`, fileStore: forced }
  }

  // Bare 'log' is the one target exportToDownloads accepts that is not a
  // file: it is rendered from the log state on the spot, so there is nothing
  // to list, test or delete. Only the BARE word is reserved — a stored file
  // really can be called log.txt, and shadowing it here would make a file the
  // user can see in the tab impossible to delete.
  if (/^log$/i.test(n)) {
    if (soft) return null
    throw new Error(`${fn}: 'log' is the run log, not a stored file — uiv.files.exportToDownloads('log') saves it to the Downloads folder, and that is the only verb it has. A stored file named log needs its extension: ${fn}('log.txt')`)
  }

  const candidates = fileStoresFor(n)

  if (candidates.length === 1) return { fileName: n, fileStore: candidates[0] }

  if (candidates.length > 1) {
    const hits = []
    for (const s of candidates) {
      if (await s.get().exists(n)) hits.push(s)
    }
    if (hits.length === 1) return { fileName: n, fileStore: hits[0] }
    if (hits.length > 1) {
      // exists() only has to answer "yes", and both answers are yes
      if (soft) return { fileName: n, fileStore: hits[0] }
      throw new Error(`${fn}: '${n}' is in BOTH ${hits.map(s => s.label).join(' and ')} — say which one you mean with ${hits.map(s => `{store: '${s.id}'}`).join(' or ')}, e.g. ${fn}('${n}', {store: 'vision'})`)
    }
    // in neither: hand back the first candidate so the caller reports one
    // concrete name, and the stores it looked in
    return soft ? null : { fileName: n, fileStore: candidates[0], missingFrom: candidates }
  }

  if (/\.[a-z0-9]+$/i.test(n)) {
    if (soft) return null
    throw new Error(`${fn}: Ui.Vision does not store '${n}' — .csv and .txt live in the CSV/TXT tab, .png in the Screenshots tab (captures) or the Vision tab (match images)`)
  }

  // no extension: probe in the order text.read resolves, widened to shots and
  // vision images (a .png candidate yields two probes, screenshots first)
  for (const ext of ['.txt', '.csv', '.png']) {
    const candidate = n + ext
    for (const fileStore of fileStoresFor(candidate)) {
      if (await fileStore.get().exists(candidate)) return { fileName: candidate, fileStore }
    }
  }
  // nothing matched — fall back to the .txt default so the caller reports one
  // concrete missing name instead of four maybes
  return soft ? null : { fileName: `${n}.txt`, fileStore: FILE_STORES[0] }
}

// ---------------------------------------------------------------------------
// bridge dispatcher — every op resolves { ok, error?, value?: JSON string }
// ---------------------------------------------------------------------------

const asValue = (v) => ({ ok: true, value: v === undefined ? undefined : JSON.stringify(v) })

// Round to integers. NO clamping: on a multi-monitor mac a display arranged
// left of the primary has legitimately NEGATIVE global coordinates, and the
// clamp sent every click there to x=0 (parseTarget accepts negatives now).
// uiv.download's trigger form: remember which input op ran between the arm
// and the wait, so a start timeout can name the likely cause for THAT tier
// (a trusted click that started nothing = a slow server; a synthetic click
// = Chrome's multiple-downloads prompt) — OPEN-ISSUES 19.2
let downloadArmed = false
let downloadTrigger = ''
// files uiv.download captured in this run: from the 2nd one on, a trusted
// click that starts nothing points at Chrome's "download multiple files"
// prompt first (OPEN-ISSUES 30.8)
let downloadsCapturedThisRun = 0
// locators already reported as "hidden input → label" in this run (30.9)
let viaLabelNoted = new Set()
// URL-form downloads per URL in this run (30.12) and the last opened page's
// signature (title + text length + node count) for "the page did not change"
let urlDownloadsThisRun = new Map()
let lastOpenSig = null

const coordTarget = ({ x, y }) => `${Math.round(x)},${Math.round(y)}`

// {button: 'right' | 'middle'} from the polyfill becomes the classic click
// Value ('#right' / '#middle'); absent or 'left' is the empty default. The
// polyfill already validated the name — parseValueForXClick re-checks anyway.
const buttonValue = ({ button }) => (button ? `#${button}` : '')

// Ops that read or act on page content. Each waits for a navigation already in
// flight to finish first — that, not a fixed post-click sleep, is what keeps a
// command from reading the page the previous click just navigated away from.
const PAGE_OPS = /^(domScrollIntoView|bWheel|bKey|eval|elementSearch|imageSearch|textSearch|domClickLocator|domClickAt|domType|domTypeAt|domSelect|bClick|bMove|bDown|bUp|bType|banner)$/

// One "Executing:" line per uiv call, like the classic player writes per
// command. Ops routed through the player (run, ai.*, ocr, shot.*,
// exportToDownloads) already log there — they are NOT in this map, or they
// would log twice. Pure reads (tabs.list, csv.read/exists/list) stay quiet.
// Long runs: the log reducer keeps only the last 500 lines, so an hours-long
// loop rotates the log instead of growing it.
const BRIDGE_OP_LOG_NAMES = {
  domScrollIntoView: 'scrollIntoViewIfNeeded',
  bWheel: 'uiv.browser.mouse.wheel',
  bKey: 'uiv.browser.keyboard.down/up',
  xWheel: 'uiv.desktop.mouse.wheel',
  open: 'uiv.goto',
  eval: 'uiv.evaluate',
  elementSearch: 'uiv.$',
  imageSearch: 'uiv.findImage',
  textSearch: 'uiv.ocr.findText',
  domClickLocator: 'uiv.page.click',
  domClickAt: 'uiv.page.click',
  domType: 'uiv.page.fill',
  domTypeAt: 'uiv.page.fill',
  domSelect: 'uiv.page.selectOption',
  bClick: 'uiv.browser.click',
  bMove: 'uiv.browser.hover',
  bDown: 'uiv.browser.down',
  bUp: 'uiv.browser.up',
  bType: 'uiv.browser.type',
  xClick: 'uiv.desktop.mouse.click',
  xMove: 'uiv.desktop.mouse.move',
  xDown: 'uiv.desktop.down',
  xUp: 'uiv.desktop.up',
  xType: 'uiv.desktop.keyboard.type',
  tabsSelect: 'uiv.tabs.select',
  tabsOpen: 'uiv.tabs.open',
  tabsClose: 'uiv.tabs.close',
  windowResize: 'uiv.window.resize',
  windowRect: 'uiv.window.rect',
  csvWrite: 'uiv.csv.write',
  csvAppend: 'uiv.csv.append',
  textWrite: 'uiv.text.write',
  filesRemove: 'uiv.files.remove',
  shotArea: 'uiv.shot.area',
  banner: 'uiv.banner',
  download: 'uiv.download',
  downloadArm: 'uiv.download (arm)',
  downloadWait: 'uiv.download (wait)',
  downloadDisarm: 'uiv.download (disarm)'
}

let bridgeOpSeq = 0

function logBridgeCall (op, args) {
  const name = BRIDGE_OP_LOG_NAMES[op]
  if (!name) return
  bridgeOpLogged = name
  let detail = ''
  try {
    detail = JSON.stringify(args)
    if (detail === '{}') detail = ''
    else if (detail.length > 150) detail = detail.slice(0, 150) + '…'
    // the run-picture ring files a finder's capture under the call that made it
    setRunFrameStep(`op#${++bridgeOpSeq}`, `${name} ${detail}`.trim(), 'script')
  } catch (e) { /* unserializable args stay blank */ }
  store.dispatch(act.addLog('info', `Executing: ${name} ${detail}`.trim()))
}

// The tail of uiv.download: block until the armed download completes (the
// download manager rejects on its own timeout), then return the name the file
// actually got on disk. DOWNLOAD_COMPLETE writes !LAST_DOWNLOADED_FILE_NAME
// panel-side a beat after the wait unblocks — hence the short poll.
// After uiv.goto: when the new URL differs from the previous open only in
// its query/hash and the document looks identical (same title, same text
// length, same node count), the site ignored the parameter — say so, or a
// loop over "pages" scrapes the same page over and over (OPEN-ISSUES 30.12)
// Internal page probes (page signature, dialog shape, focus, window
// dimensions, measuring beacons) run in the extension's ISOLATED world via
// chrome.scripting — the page's Content Security Policy does not apply
// there. They used to go through the classic executeScript command, which
// evaluates its string in the PAGE world (inject.js → eval), and a strict
// CSP (script-src without 'unsafe-eval' — banking sites) refuses that: on
// banking.postbank.de every uiv.download logged "Error in executeScript
// code: Evaluating a string as JavaScript violates the following Content
// Security Policy directive" at (arm) and (wait), the shape probe returned
// nothing, and the run's verdict blamed Chrome's download prompt while the
// PDF was landing on disk a second later (OPEN-ISSUES 42.1). `func` must be
// self-contained (serialized into the page); `args` JSON. Returns
// { ok, value }; the page-world command is the fallback only where
// chrome.scripting cannot reach the tab (no scripting API, browser-internal
// page) so the older path keeps working where it did before.
async function probePage (func, args, fallbackCode, varName) {
  try {
    const tab = await getTargetTab()
    if (tab && tab.id && typeof chrome !== 'undefined' && chrome.scripting && chrome.scripting.executeScript) {
      const rs = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func, args: args || [] })
      if (rs && rs.length) return { ok: true, value: rs[0].result }
    }
  } catch (e) { /* fall through to the page-world command */ }
  if (!fallbackCode) return { ok: false, value: undefined }
  const r = await runOneCommand('executeScript', fallbackCode, varName, null, { fast: true })
  return { ok: !!r.ok, value: r.ok ? getVarsInstance().get(varName) : undefined }
}

async function notePageUnchanged (url) {
  try {
    const r = await probePage(
      function () { return document.title + '|' + (document.body ? document.body.innerText.length : 0) + '|' + document.querySelectorAll('*').length },
      [],
      "return document.title + '|' + (document.body ? document.body.innerText.length : 0) + '|' + document.querySelectorAll('*').length", '__uiv_pagesig')
    if (!r.ok) return
    const sig = String(r.value || '')
    const base = url.replace(/[?#].*$/, '')
    if (lastOpenSig && lastOpenSig.base === base && lastOpenSig.url !== url && lastOpenSig.sig === sig && sig) {
      store.dispatch(act.addLog('warning', `uiv.goto: the page did NOT change — same title, text length and node count as the previous open of ${base} although the URL differs only in its query/hash (${url.slice(base.length, base.length + 60)}). The site ignores that parameter; page through its own controls (a "next" link/button, a selector) and check that the first row differs.`))
    }
    lastOpenSig = { base, url, sig }
  } catch (e) { /* diagnosis only */ }
}

// The page's dialogs/forms and node count — captured when uiv.download arms,
// compared when no download came: a trigger that OPENED A FORM ("Angabe
// Rechnungsadresse" with the real download button inside) used to be
// reported as a slow server (OPEN-ISSUES 30.17)
async function pageShape () {
  try {
    const r = await probePage(
      function () {
        return {
          n: document.querySelectorAll('*').length,
          d: Array.prototype.slice.call(document.querySelectorAll('[role=dialog],[aria-modal=true],dialog[open],form,[role=alertdialog]'))
            .filter(function (e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
            .map(function (e) { var h = e.querySelector('h1,h2,h3,h4,legend,[role=heading]'); return (e.getAttribute('aria-label') || (h && h.textContent) || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) })
        }
      },
      [],
      "return JSON.stringify({n: document.querySelectorAll('*').length, d: Array.prototype.slice.call(document.querySelectorAll('[role=dialog],[aria-modal=true],dialog[open],form,[role=alertdialog]')).filter(function (e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }).map(function (e) { var h = e.querySelector('h1,h2,h3,h4,legend,[role=heading]'); return (e.getAttribute('aria-label') || (h && h.textContent) || e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60) })})", '__uiv_shape')
    if (!r.ok || r.value == null) return null
    return typeof r.value === 'string' ? JSON.parse(r.value) : r.value
  } catch (e) { return null }
}
let armShape = null

async function waitForArmedDownload (wait, timeoutS, wantedAs) {
  if (!wait) return asValue(undefined)
  // countdown against the download's own timeout — the wait blocks in one
  // IPC call, so without the tick a slow download reads as a hang
  const capMs = (parseFloat(timeoutS) || 60) * 1000
  const started = Date.now()
  const tick = setInterval(() => {
    emit('wait', { label: 'download', remainingS: Math.ceil((capMs - (Date.now() - started)) / 1000) })
  }, 500)
  try {
    await csIpc.ask('PANEL_WAIT_FOR_ANY_DOWNLOAD', {})
  } catch (e) {
    if (!/download start expired/.test(String(e && e.message || e))) throw e
    // The trigger ran but Chrome created no download inside the start
    // window. The download manager releases the arm on this timeout, so the
    // script's next uiv.download works. The usual cause on a site whose
    // button fetches the file and saves a blob: a SYNTHETIC click
    // (uiv.page.click) carries no user activation, so Chrome files the
    // download as "automatic" and holds the second one from that site
    // behind its "download multiple files" permission prompt until a human
    // clicks Allow — seen on o2online.de (OPEN-ISSUES 16): the files landed
    // minutes later, under the site's own names, the second Allow was clicked.
    const startS = parseFloat(getVarsInstance().get('!TIMEOUT_WAIT')) || 10
    // suggest a window that is actually larger than the one that just expired
    const suggestS = Math.max(30, Math.ceil(startS * 2))
    // did the trigger open a form/dialog instead? (30.17)
    let opened = ''
    try {
      const now = await pageShape()
      if (now && armShape) {
        const before = new Set(armShape.d || [])
        const fresh = (now.d || []).filter(d => d && !before.has(d))
        if (fresh.length || (now.n - armShape.n) > 40) {
          opened = `The click OPENED ${fresh.length ? 'a form/dialog ("' + fresh[0] + '")' : 'new content (' + (now.n - armShape.n) + ' new nodes)'} instead of starting a download — the real download button is probably in it: call browser_snapshot, then arm uiv.download on THAT button (a "Generate"/"Create"/"Rechnung erstellen" step comes first on many sites). `
        }
      }
    } catch (e) { /* diagnosis only */ }
    const trusted = /^(bClick|xClick|bType|xType)$/.test(downloadTrigger)
    const demoted = /fell back to DOM/.test(downloadTrigger)
    const synthetic = /^dom/.test(downloadTrigger)
    const cause = demoted
      ? `The trigger was uiv.browser.click, but Chrome's debugger input is vetoed on this page (W371) and it FELL BACK to a DOM click — a synthetic click with no user activation, so Chrome's "download multiple files automatically" prompt applies after all. Allow it once on the page, or use real OS input as the trigger: uiv.download(() => uiv.desktop.mouse.click(...), ...). A slow server is the other cause: raise the start window with uiv.setVar('!TIMEOUT_WAIT', ${suggestS}).`
      : trusted
        ? (downloadsCapturedThisRun > 0
          ? `The trigger was a TRUSTED click (${downloadTrigger}) and this run has already captured ${downloadsCapturedThisRun} file(s) — the FIRST suspect is Chrome's "download multiple files" prompt: on a site that fetches the file and saves it afterwards, the click's user activation is spent by the time the page saves, so from the second file on Chrome holds the download until a human clicks Allow (the held file then arrives late, under the site's own name, and lands in whatever uiv.download is armed THEN). Allow automatic downloads for the site once (chrome://settings/content/automaticDownloads) or use {blob: true} on the trigger form — its save happens inside the click's activation, no prompt. A slow server is the other cause: raise the start window with uiv.setVar('!TIMEOUT_WAIT', ${suggestS}).`
          : `The trigger was a TRUSTED click (${downloadTrigger}), so the usual cause is the server still generating the file — raise the start window before the call: uiv.setVar('!TIMEOUT_WAIT', ${suggestS}). If the site fetches the file and saves it afterwards, Chrome's "download multiple files" prompt applies from the SECOND file on despite the trusted click (the activation is spent by then) — {blob: true} on the trigger form avoids it.`)
        // the slow-server hint used to be dropped for a synthetic trigger — but a
        // bank's "PDF wird vorbereitet" export took 11 s after a uiv.page.click
        // and arrived fine, one second after this verdict blamed the prompt (42.1)
        : `If the trigger was a synthetic click (uiv.page.click), Chrome may be holding the file behind its "download multiple files automatically" prompt — such clicks carry no user activation. Use a trusted click as the trigger: uiv.download(() => uiv.browser.click(locator), ...). A server still generating the file ("your PDF is being prepared") is the other cause, as likely: raise the start window before the call with uiv.setVar('!TIMEOUT_WAIT', ${suggestS})${synthetic ? ' — a file that then lands late, under the site\'s own name, in the download folder says it was this one' : ''}.`
    throw new Error(`uiv.download: no download started within ${startS}s of the trigger (the start window is !TIMEOUT_WAIT; {timeout} covers the transfer once it has started). ${opened}${cause} The arm has been released; the next uiv.download can proceed.`)
  } finally {
    downloadArmed = false
    clearInterval(tick)
    emit('wait', null)
  }
  const vars = getVarsInstance()
  const deadline = Date.now() + 3000
  while (!vars.get('!LAST_DOWNLOADED_FILE_NAME') && Date.now() < deadline) {
    await delayMs(100)
  }
  const name = vars.get('!LAST_DOWNLOADED_FILE_NAME') || ''
  // with several browsers connected the name alone does not say WHERE the
  // file is — log the path the browser reported (OPEN-ISSUES 23.5)
  if (name) {
    // two DOWNLOAD_COMPLETE copies race for the same file (bg's old bare
    // listener and DownloadMan's); give the one with the site name a beat
    await delayMs(200)
    const info = getLastDownloadInfo()
    const p = info.path || getLastDownloadPath()
    downloadsCapturedThisRun++
    // the site's own name for the file is the evidence that a late file
    // from an earlier trigger was captured under this arm's name (30.8)
    const site = info.siteName && info.siteName !== name ? ` (the site named it "${info.siteName}")` : ''
    store.dispatch(act.addLog('info', (p ? `downloaded: ${p}` : `downloaded: ${name} (into the browser's download folder)`) + site))
    // the caller asked for x.pdf and got x.htm: the server's type wins, but a
    // script that only checks the return value carries on with an HTML page
    // named like an invoice (OPEN-ISSUES 30.15)
    const wantExt = wantedAs && /\.[A-Za-z0-9]{1,5}$/.test(String(wantedAs)) ? String(wantedAs).split('.').pop().toLowerCase() : ''
    const gotExt = /\.[A-Za-z0-9]{1,5}$/.test(name) ? name.split('.').pop().toLowerCase() : ''
    if (wantExt && gotExt && wantExt !== gotExt) {
      store.dispatch(act.addLog('warning', `uiv.download asked for a .${wantExt} file and the server sent .${gotExt} ("${name}") — that URL is a page or a different kind of file, not the .${wantExt} you wanted; check the link (a "print" or "view" URL instead of the document URL is the usual cause).`))
    }
    // the same file again: a loop re-fetching one link, or a page that did
    // not change between "pages" (OPEN-ISSUES 30.12)
    if (info.duplicateOf) {
      store.dispatch(act.addLog('warning', `this file is IDENTICAL to "${info.duplicateOf.name}" saved ${info.duplicateOf.secondsAgo} s ago in this run (same URL, or same site name and size) — is the loop re-fetching the same link? If a page navigation preceded it, the page probably did not change.`))
    }
    if (info.orphanWarning > 0) {
      store.dispatch(act.addLog('warning', `this run has ${info.orphanWarning} earlier uiv.download trigger(s) whose start window expired — the file just saved as "${name}" may be one of THOSE arriving late (Chrome's "download multiple files" prompt holds files until Allow is clicked; a slow server does the same).${info.siteName ? ` The site named it "${info.siteName}" — ` : ' '}check that it is the file this call asked for before trusting the name.`))
    }
  }
  // '' used to be returned as a clean result (OPEN-ISSUES 19.1): a download
  // that ended without a file is a failure, and the caller must hear so
  if (!name) {
    throw new Error("uiv.download: the download ended without a file — it was interrupted or refused before any bytes arrived (a server that rejects requests the page itself did not make, a blocked file type, or a download the page never started). For a link behind a login use the page's own click: uiv.download(() => uiv.browser.click(locator), {as: 'name.pdf'}). If the file DID land in the download folder, its name event was late — check there.")
  }
  return asValue(name)
}

// The classic click/type auto-wait for their element INSIDE the player
// pipeline (runCommandWithRetry's 'Tag waiting' ticker) — a channel the
// script status bar does not render, and which the panel drops anyway on the
// session fast path (app status never reaches PLAYER there, see
// onTimeoutStatus in index.js). So a uiv.page.click on a missing element
// read as a hang for the whole !TIMEOUT_WAIT. Emit the script runner's own
// countdown around the call instead, exactly like the 'open' case does for
// page loads. The first tick fires at 500ms — a click that hits an element
// already on the page stays countdown-free.
async function withElementWaitCountdown (label, fn) {
  const timeoutS = parseFloat(getVarsInstance().get('!TIMEOUT_WAIT'))
  const capMs = (Number.isFinite(timeoutS) && timeoutS > 0 ? timeoutS : defaultFindTimeoutS()) * 1000
  const started = Date.now()
  const tick = setInterval(() => {
    emit('wait', { label, remainingS: Math.max(0, Math.ceil((capMs - (Date.now() - started)) / 1000)) })
  }, 500)
  try {
    return await fn()
  } finally {
    clearInterval(tick)
    emit('wait', null)
  }
}

// Every input the run aimed at a POINT, in the order it happened.
//
// A macro that clicks the wrong thing looks identical in the log to one that
// clicks the right thing — both say "Executing: uiv.desktop.mouse.click 1712,108".
// Neither the user nor the agent can tell which happened without seeing WHERE
// that was on screen, so the coordinates are kept and drawn onto a screenshot
// after the run (see runScriptMacro in macro_agent/tools.ts).
//
// Only point-aimed input is recorded: uiv.page.click resolves a DOM element
// itself and cannot be off by a neighbour, which is the failure this exists to
// make visible.
const CLICK_TRAIL_OPS = {
  xClick: 'desktop.click',
  xMove: 'desktop.move',
  xDown: 'desktop.down',
  xUp: 'desktop.up',
  bClick: 'browser.click',
  bMove: 'browser.move',
  bDown: 'browser.down',
  bUp: 'browser.up'
}
const CLICK_TRAIL_MAX = 40
let clickTrail = []

export function getClickTrail () {
  return clickTrail.slice()
}

// The run's OCR text searches, one entry per SETTLED uiv.ocr.findText(s) call
// (recorded after the auto-wait retry loop resolves, not per attempt — a
// 30-second wait polls the same search fifteen times and is still ONE search).
// Feeds the same post-run picture as the click trail: matches as numbered
// boxes, plus a light outline for every word the engine recognised, so "found
// the wrong occurrence" and "OCR never saw the word" are both visible at a
// glance instead of being inferred from a text dump.
const OCR_TRAIL_MAX = 6
let ocrTrail = []

export function getOcrTrail () {
  return ocrTrail.slice()
}

function recordOcrTrail (entry) {
  if (ocrTrail.length >= OCR_TRAIL_MAX) return
  ocrTrail.push(entry)
}

// The run's IMAGE searches, one settled entry per uiv.findImage(s) call.
// Same job as the OCR trail: the runtime acts on the highest-scoring match
// invisibly, so "matched the wrong lookalike" and "nothing scored above the
// threshold" both need the picture. On a MISS a single low-bar rescue pass
// records the best below-threshold candidates — the difference between "best
// candidate 0.62 against your 0.8, right spot, lower minScore" and "nothing
// anywhere, recapture the image" is two OPPOSITE fixes that a bare not-found
// cannot distinguish.
const IMAGE_TRAIL_MAX = 6
let imageTrail = []

export function getImageTrail () {
  return imageTrail.slice()
}

function recordImageTrail (entry) {
  if (imageTrail.length >= IMAGE_TRAIL_MAX) return
  imageTrail.push(entry)
}

// Points the run derived rather than clicked: uiv.ai.find answers and
// uiv.offset compositions (anchor -> landing). A wrong ai.find point or a
// wrong dx/dy is invisible until the click that uses it acts on the wrong
// thing — marking the derivation separates "the model pointed wrong" from
// "the click executed wrong".
const POINT_TRAIL_MAX = 20
let pointTrail = []

export function getPointTrail () {
  return pointTrail.slice()
}

function recordPointTrail (entry) {
  if (pointTrail.length >= POINT_TRAIL_MAX) return
  pointTrail.push(entry)
}

// a recordable {left,top,width,height} out of a finder's {area} option — a
// finder match (carries .rect) or a bare rect; anything else records nothing
function areaRectOf (area) {
  if (!area || typeof area !== 'object') return null
  const r = area.rect && typeof area.rect === 'object' ? area.rect : area
  const left = Number(r.left !== undefined ? r.left : r.x)
  const top = Number(r.top !== undefined ? r.top : r.y)
  const width = Number(r.width)
  const height = Number(r.height)
  if (![left, top, width, height].every(isFinite) || width <= 0 || height <= 0) return null
  return { left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height) }
}

function recordClickTrail (op, args) {
  const label = CLICK_TRAIL_OPS[op]
  if (!label || !args) return
  const x = Number(args.x)
  const y = Number(args.y)
  if (!isFinite(x) || !isFinite(y)) return
  if (clickTrail.length >= CLICK_TRAIL_MAX) return
  clickTrail.push({
    x: Math.round(x),
    y: Math.round(y),
    // desktop = screen pixels; browser = viewport CSS pixels. The two cannot be
    // drawn on the same picture, so the consumer picks by scope.
    scope: args.scope === 'browser' || op[0] === 'b' ? 'browser' : 'desktop',
    label
  })
}

// per-op wall-time profile, split into prelude (logging/trail/vars) and the
// op body — read+reset via the 'profDump' op. Cheap enough to always run.
const __uivProf = { ops: {} }
function __profAdd (op, preludeMs, bodyMs) {
  const p = __uivProf.ops[op] = __uivProf.ops[op] || { n: 0, preludeMs: 0, bodyMs: 0 }
  p.n++; p.preludeMs += preludeMs; p.bodyMs += bodyMs
}

async function dispatchBridge (op, args) {
  if (op === 'profDump') {
    const out = { ops: __uivProf.ops }
    __uivProf.ops = {}
    return { ok: true, value: JSON.stringify(out) }
  }
  const __t0 = performance.now()
  const __fb0 = getCdpInputFallbackCount()
  bridgeOpLabel = uivNameForOp(op)
  const __r = await dispatchBridgeInner(op, args)
  const usageName = uivNameForOp(op)
  const family = /^uiv\.(page|browser|desktop|ocr|ai|csv)\./.exec(usageName)
  reportUsage('api', family ? family[1] : op === 'eval' ? 'evaluate' : 'other')
  if (family && family[1] === 'desktop') reportUsage('xmodule', 'used')
  bridgeOpLabel = ''
  bridgeOpLogged = ''
  if (downloadArmed && /^(bClick|bType)$/.test(op) && getCdpInputFallbackCount() !== __fb0) downloadTrigger = op + ' fell back to DOM'
  __profAdd(op, __uivProf.lastPrelude || 0, performance.now() - __t0 - (__uivProf.lastPrelude || 0))
  return __r
}

async function dispatchBridgeInner (op, args) {
  if (downloadArmed && /^(bClick|xClick|domClickLocator|domClickAt|domType|domTypeAt|bType|xType)$/.test(op)) downloadTrigger = op
  const __p0 = performance.now()
  logBridgeCall(op, args)
  recordClickTrail(op, args)
  // keep the script's clock honest on EVERY uiv call — the guide-recommended
  // poll-loop guard parseFloat(uiv.getVar('!RUNTIME')) hung forever when the
  // loop body only contained ops that skipped the classic-path update at
  // handleRunResult (e.g. ocr.read({scope: 'desktop'}) + sleep)
  try { getVarsInstance().set({ '!RUNTIME': milliSecondsToStringInSecond(scriptRuntimeMs()) }, true) } catch (e) { /* best-effort */ }
  if (/^(domClickLocator|domType|domSelect)$/.test(op)) args = { ...args, locator: scriptLocator(args.locator) }
  if (PAGE_OPS.test(op)) await awaitPageQuiet()
  __uivProf.lastPrelude = performance.now() - __p0

  switch (op) {
    case 'macroResult': scriptReturnValue = args.value; return asValue(undefined)
    case 'browserRun': throw new Error(
      'uiv.browser.run(...) is a desktop-to-browser call, but the current macro already runs in the browser. ' +
      'To reuse another browser JavaScript macro, move its reusable logic into a function, include its file, and call that function.\n\n' +
      'Example library (Lib/Shared.js):\n' +
      'function runShared(input) { return { total: input.left + input.right }; }\n\n' +
      'Example caller:\n' +
      '// @include Lib/Shared.js\n' +
      'var result = runShared({left: 2, right: 3});\n\n' +
      'Use the actual macro-tree path and put the // @include directive on its own line. Includes are resolved before compilation and share the caller\'s runtime and variables. ' +
      'Pass values with function arguments and return; uiv.args and uiv.result do not create a separate call for an include. ' +
      'Guard any standalone entrypoint in the included file with if (uiv.main) { ... } so it does not run automatically when included. ' +
      'Do not substitute uiv.run("run", ...) or uiv.runMacro(...): neither is supported in browser JavaScript macros. ' +
      'Do not route through the desktop app to call back into this waiting browser; it will be busy.'
    )
    case 'appRun': {
      const name = macroCallName(args.name)
      const standalone = standaloneDesktopCall(args.options)
      // background: an app started for a macro opens minimized (host >= 2.1.32)
      const connected = await ensureDesktopApp(store.getState().config, text => store.dispatch(act.addLog('status', text)), { background: true })
      if (!connected.ok) throw new Error(connected.text)
      const client = getDesktopAppClient()
      const status = await client.getStatus()
      // Busy means the app's own JS engine is running. status.running also
      // counts a BROWSER run the app dispatched to us (its status pill shows
      // it), and that run is very possibly this very script: a browser
      // launcher played through the app's MCP (Play Flappy Bird from Browser)
      // calls uiv.app.run while the app still books the browser run as
      // running - refusing that stalled every launcher demo routed through
      // the app (dev1 2026-09-16). App 2.1.35+ reports the engine separately;
      // older apps only have the combined flag.
      const engineBusy = typeof status.engineRunning === 'boolean' ? status.engineRunning : status.running
      if (engineBusy) throw new Error('The desktop app is busy running another macro; wait for it to finish before calling uiv.app.run')
      const version = String(status.appVersion || '').split('.').map(Number)
      if (version[0] < 2 || (version[0] === 2 && (version[1] < 1 || (version[1] === 1 && version[2] < 18)))) throw new Error('uiv.app.run requires Ui.Vision for Desktop 2.1.18 or newer')
      if (standalone && !semver.gte(String(status.appVersion || '0.0.0'), '2.1.40')) throw new Error("uiv.app.run with scope 'desktop' requires Ui.Vision Desktop 2.1.40 or newer. Update the app and restart it.")
      let context = { scope: 'desktop' }
      if (!standalone) {
        const tab = await getTargetTab()
        if (!tab) throw new Error("uiv.app.run cannot measure a viewport on a browser-internal page. For an independent desktop macro use uiv.app.run('Folder/Macro.d.js', {}, {scope:'desktop'}); it receives no browser area and owns its window setup.")
        const focused = await dispatchBridgeInner('windowFocus', {})
        if (!focused.ok) return focused
        context = await measureCallViewport(tab, args.options.area)
      }
      if (stopRequested) throw new Error('Script stopped')
      store.dispatch(act.addLog('status', '[desktop: ' + name + '] called' + (standalone ? ' (standalone desktop)' : '; measured browser area')))
      let geometryError = null, checking = false
      const call = client.callMacro({ name, args: args.args, context }, l => {
        store.dispatch(act.addLog(l.kind === 'mcp' ? 'info' : l.kind, `[desktop: ${name}] ${l.time} ${l.text}`, { color: l.color || undefined, macroCallId: l.callId, remoteSeq: l.seq }))
      }, args.options.timeoutMs || 900000)
      activeAppCall = call
      const watch = setInterval(async () => {
        if (standalone || checking || geometryError) return
        checking = true
        try {
          if (!(await callViewportUnchanged(context))) { geometryError = 'Browser viewport changed during the desktop call. The call was stopped; measure the area again before retrying.'; call.cancel() }
        } catch (e) { geometryError = 'Browser tab became unavailable during the desktop call'; call.cancel() }
        finally { checking = false }
      }, 1000)
      try {
        const value = await call.promise
        if (geometryError) throw new Error(geometryError)
        if (stopRequested) throw new Error('Script stopped')
        store.dispatch(act.addLog('status', `[desktop: ${name}] returned`))
        return asValue(value)
      } catch (e) { throw new Error(geometryError || e.message || String(e)) }
      finally { clearInterval(watch); if (activeAppCall === call) activeAppCall = null }
    }
    case 'open': {
      // page-load countdown on the same 'wait' channel the finders use — a
      // silent stall here looked like a freeze for up to timeoutPageLoad (60s)
      // and hid the fact that the run was waiting on a page, not hung
      const capMs = (parseFloat(store.getState().config.timeoutPageLoad) || 60) * 1000
      const openStart = Date.now()
      const tick = setInterval(() => {
        emit('wait', { label: `open ${String(args.url).slice(0, 60)}`, remainingS: Math.ceil((capMs - (Date.now() - openStart)) / 1000) })
      }, 500)
      const timing = { begin: openStart }
      try {
        const r = await nativeOpen(String(args.url), timing)
        if (r.ok) await notePageUnchanged(String(args.url))
        return r.ok ? asValue(undefined) : r
      } finally {
        clearInterval(tick)
        emit('wait', null)
        firstCommandDone = true
        // perf only for opens that got past tab resolution — an E900/E901
        // refusal says nothing about where run time goes
        if (timing.tabResolved) {
          timing.ended = Date.now()
          perfRecord('open', timing)
        }
      }
    }

    case 'run': {
      // The classic CSV commands are the ONE case where the legacy bridge is a
      // trap rather than an escape hatch: they work through !csvLine and
      // !CsvReadLineNumber, hidden state a script cannot see or reason about,
      // and uiv.csv.* replaces every one of them with a plain array. Prompt
      // text alone did not stop the AI reaching for csvSave, so the runner
      // says so at the point of use, with the replacement named.
      const csvReplacement = {
        csvsave: "uiv.csv.append(file, row) — appends ONE row and creates the file if needed",
        csvsavearray: "uiv.csv.write(file, rows) — overwrites with a 2D array",
        csvreadarray: "uiv.csv.read(file) — returns the rows as a real 2D array",
        csvread: "uiv.csv.read(file) — returns ALL rows at once; loop over them instead of tracking !CsvReadLineNumber"
      }[String(args.cmd || '').toLowerCase()]

      if (csvReplacement) {
        return {
          ok: false,
          error: `uiv.run('${args.cmd}', ...) is not supported in a JS script — use ${csvReplacement}. (These commands pass data through the hidden !csvLine / !CsvReadLineNumber variables; uiv.csv.* uses plain arrays.)`
        }
      }

      // The classic 'run' command CANNOT work from a script: it pushes the
      // called macro onto the classic player's call stack and relies on the
      // player's main loop to execute it — but every uiv.run is a one-shot
      // mini-run, so the frame is pushed and never played (and a called .js
      // macro has no Commands at all, its program lives in Script). Without
      // this rejection the call "succeeds" while the called macro silently
      // never runs — a reported user bug.
      if (/^run$/i.test(String(args.cmd || ''))) {
        return {
          ok: false,
          error: "uiv.run('run', ...) is not supported in a JS script — the classic run command hands the called macro to the classic player's loop, which a script run does not use, so the called macro would never execute. Reuse code with an INCLUDE instead: put the shared functions in a .js macro and splice it in with a comment line like  // @include Demo and QA Test Scripts/Core/Sub/Sub_DemoCsvRead_FillForm.js  — the file is inserted before the script compiles (uiv.main is true only in the file that was started, so an included file can carry its own self-test)."
        }
      }

      // visionLimitSearchArea (and its *Relative variants) is the same trap:
      // a SETTING that silently applies to every LATER vision search. In a
      // script the search area is per-call.
      if (/^visionLimitSearchArea/i.test(String(args.cmd || ''))) {
        return {
          ok: false,
          error: `uiv.run('${args.cmd}', ...) is not supported in a JS script — pass the region to the finder itself: ` +
            "uiv.findImage('handle.png', {area: uiv.$('css=#panel')}) or {area: {x, y, width, height}} " +
            '(uiv.ocr.findText takes {area} too). The classic command is hidden state that changes what every ' +
            'later search means; {area} applies to exactly one call.'
        }
      }

      const r = await runOneCommand(args.cmd, args.target, args.value)
      if (r.ok && /^XDesktopAutomation$/i.test(String(args.cmd || ''))) {
        // the command stored the new scope in !CVSCOPE — remember it as a
        // scope override so the session re-seed cannot clobber it (see
        // SCRIPT_SCOPE_KEYS)
        rememberScriptScopeOverride('!CVSCOPE', getVarsInstance().get('!CVSCOPE'))
      }
      return r.ok ? asValue(undefined) : r
    }

    case 'eval': {
      // page-world execution via the classic executeScript command; the
      // result comes back through its Value-variable convention
      const vars = getVarsInstance()
      const r = await runOneCommand('executeScript', args.code, '__uiv_ret', args.pageFunction ? { extra: { literalTarget: true } } : null, { fast: true })
      if (!r.ok) {
        // a CSP that bans unsafe-eval (chatgpt.com, Stripe pages, most banks)
        // is a property of the site — say what DOES work there instead of
        // handing back Chrome's raw policy text (OPEN-ISSUES 17.2)
        if (/unsafe-eval|Content Security Policy|Trusted Type/i.test(String(r.error || ''))) {
          // Chrome's message carries the page's WHOLE policy — nonces and
          // dozens of domains, 16k chars on pinterest — which then rides in
          // the chat history forever (OPEN-ISSUES 44.4); one line says it all
          const cspError = String(r.error).replace(/(Content Security Policy directive)[\s\S]*$/, '$1 (the page forbids string eval; policy text omitted)').slice(0, 300)
          // Chromium: the debugger session is not bound by the page's CSP —
          // Runtime.evaluate runs the same code where the content script's
          // eval was refused (the uiv.browser.* tier holds that session anyway)
          if (isCdpInputAvailable()) {
            const tab = await getTargetTab()
            if (tab) {
              try {
                const v = await cdpEvaluate(tab.id, String(args.code))
                store.dispatch(act.addLog('echo', "evaluate: this page's CSP refused the content-script eval — the code ran through the browser debugger session (CDP Runtime.evaluate) instead"))
                return asValue(v)
              } catch (e) {
                return { ok: false, error: `${cspError}; the debugger-session fallback (CDP Runtime.evaluate) failed too: ${(e && e.message) || e}\n→ Read the DOM through the content script instead, which no page CSP can block: uiv.$('css=…').text / .value / .getAttribute('href'), uiv.$$('css=a').map(m => m.attributes), and act with uiv.page.click / uiv.browser.click.` }
              }
            }
          }
          return { ok: false, error: `${cspError}\n→ This site's CSP blocks page-world eval (uiv.evaluate / executeScript) — not a macro bug, do not retry. Read the DOM through the content script instead, which no page CSP can block: uiv.$('css=…').text / .value / .getAttribute('href'), uiv.$$('css=a').map(m => m.attributes), and act with uiv.page.click / uiv.browser.click. Only calling the site's own JS functions has no CSP-proof route.` }
        }
        return r
      }
      return asValue(vars.get('__uiv_ret'))
    }

    case 'elementSearch': {
      const tab = await getTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
      const locErr = scriptLocatorError(args.locator)
      if (locErr) return { ok: false, error: `findElements: ${locErr}` }
      const content = elementContentCheck(args)
      let hiddenCount = 0
      let noLayout = false
      let contentMissCount = 0
      let contentMissSeen = ''
      const matches = await retryFind(
        async () => {
          const r = await elementSearchOnce(tab, args)
          hiddenCount = r.hiddenCount
          noLayout = !!r.noLayout
          if (!content) return r.matches
          const passing = r.matches.filter(content.test)
          contentMissCount = r.matches.length - passing.length
          if (!passing.length && r.matches.length) {
            // for the timeout diagnosis: what the closest candidate DID say
            const m = r.matches[0]
            contentMissSeen = String((m.value !== undefined && m.value !== null && m.value !== '' ? m.value : m.text) || '').slice(0, 120)
          }
          return passing
        },
        {
          timeoutS: args.timeout,
          required: args.required,
          label: `findElements('${args.locator}')`,
          describeEmpty: async () => {
            if (content && contentMissCount > 0) {
              return `${contentMissCount} element(s) DO match the locator but their text/value never satisfied {${content.label}} — last seen: ${JSON.stringify(contentMissSeen)}`
            }
            if (/^by=/.test(String(args.locator))) {
              // a getByRole/getByLabel/… miss: say how names match (30.18)
              const spec = (() => { try { return JSON.parse(String(args.locator).slice(3)) } catch (e) { return {} } })()
              const what = spec.kind === 'role' ? `no ${spec.role}${spec.name ? ' named "' + spec.name + '"' : ''}` : `nothing with ${spec.kind} "${spec.text}"`
              return `${what} on the page${hiddenCount ? ` (${hiddenCount} hidden match(es) exist — reveal them, or {includeHidden: true} to read)` : ''}. Names are the tree's accessible names (browser_snapshot shows them); the default match is a case-insensitive SUBSTRING, {exact: true} the whole string — check the spelling against browser_snapshot, and the role (a link styled as a button is role "link")`
            }
            if (noLayout) return `the tab's window is MINIMIZED or has no layout (window.innerWidth is 0) — nothing in it can be visible or clickable, whatever the locator. Restore the window (uiv.window.focus()) or use a tab in a visible window${hiddenCount > 0 ? ` (${hiddenCount} element(s) match the locator)` : ''}`
            return hiddenCount > 0
              ? `${hiddenCount} matching element(s) DO exist but are HIDDEN (collapsed/invisible, e.g. a responsive search box or menu behind a toggle — the side panel narrows the page). Reveal it first (click the toggle/icon that opens it), or pass {includeHidden: true} if you only need to READ it`
              : await invisibleCharDiagnosis(tab, args.locator)
          }
        }
      )
      // scope travels with every match so the input tiers can refuse a match
      // measured in the wrong coordinate system (see uiv.__requireScope)
      return asValue(matches.map(m => ({ ...m, scope: 'browser' })))
    }

    case 'banner': {
      await bannerShow(args)
      return asValue(undefined)
    }

    case 'imageSearch': {
      let lastImageMatches = []
      // one settled trail entry per CALL (finally: a required miss throws).
      // On a miss, ONE extra low-bar pass collects the best below-threshold
      // candidates — local WASM matching, a single pass, only on failure.
      const recordSettled = async () => {
        let candidates = []
        if (!lastImageMatches.length) {
          try {
            const rescue = await imageSearchOnce({ ...args, minScore: 0.25 })
            candidates = (rescue || [])
              .sort((a, b) => (b.score || 0) - (a.score || 0))
              .slice(0, 3)
              .map(m => ({ x: m.x, y: m.y, rect: m.rect, score: m.score }))
          } catch (e) { /* diagnostics only — the original miss stands */ }
        }
        recordImageTrail({
          image: String(args.image),
          minScore: effectiveMinScore(args),
          scope: args.scope === 'desktop' ? 'desktop' : 'browser',
          area: areaRectOf(args.area),
          matches: (lastImageMatches || []).slice(0, 10).map(m => ({ x: m.x, y: m.y, rect: m.rect, score: m.score })),
          candidates
        })
      }
      // a banner in the capture can occlude the match — see withBannerHidden
      const matches = await withBannerHidden(() => retryFind(
        async () => {
          const r = await imageSearchOnce(args)
          lastImageMatches = r
          return r
        },
        {
          timeoutS: args.timeout,
          required: args.required,
          label: `findImages('${args.image}')`,
          describeEmpty: () => describeImageMiss(args)
        }
      )).finally(recordSettled)
      const scope = args.scope === 'desktop' ? 'desktop' : 'browser'
      // READING ORDER, not score order: with several look-alike matches,
      // "click the 3rd one" (matches[2]) must mean the 3rd on screen —
      // engines return best-score-first, which shuffles equally-good
      // matches nondeterministically (measured x-order 860,520,180,691,351
      // by the OrderingCheck demo). Rows are clustered by PROXIMITY (see
      // readingOrder) so near-equal baselines count as one row. uiv.findImage
      // (singular) keeps returning the BEST match: it picks the entry
      // flagged best below, not blindly index 0.
      const best = matches.reduce((p, m) => (m.score || 0) > ((p && p.score) || 0) ? m : p, null)
      const ordered = readingOrder(matches)
      return asValue(ordered.map(m => ({ ...m, scope, best: m === best })))
    }

    case 'pixels': {
      // uiv.pixels(area, {scope, capture}): the captured colours of a patch,
      // row-major '#rrggbb'. Desktop scope reads the screen through the host
      // (the finder capture path, so capture:'same' serves the retained
      // picture); browser scope reads the play tab's viewport capture.
      const scope = args.scope === 'desktop' ? 'desktop' : 'browser'
      const area = normalizeFinderArea(args.area, 'uiv.pixels', args.scope)
      if (!area) throw new Error(`uiv.pixels: pass an area {x, y, width, height} in ${scope === 'desktop' ? 'screen' : 'viewport CSS'} coordinates (at most 16384 captured pixels)`)
      const dpr = window.devicePixelRatio || 1
      if (scope === 'desktop') {
        showDesktopBorder()
        const params = {
          area: { x: area.x * dpr, y: area.y * dpr, width: area.width * dpr, height: area.height * dpr },
          displayHint: await getDesktopCaptureHint()
        }
        if (args.capture) params.capture = String(args.capture)
        const res = await withDesktopCaptureCover(() => getXModule2API().invoke('read_pixels', params))
        return asValue({
          x: Math.round(res.x / dpr), y: Math.round(res.y / dpr), width: res.width, height: res.height, scale: dpr,
          colors: res.colors, captureId: res.captureId, captureTimeMs: res.captureTimeMs, captureAgeMs: res.captureAgeMs
        })
      }
      const w = Math.max(1, Math.round(area.width * dpr)), h = Math.max(1, Math.round(area.height * dpr))
      if (w * h > 16384) throw new Error(`uiv.pixels: area ${w}x${h} exceeds 16384 captured pixels — sample a smaller patch`)
      const tab = await getTargetTab()
      if (!tab) throw new Error(E901_NO_TAB)
      await updateState(setIn(['tabIds', 'toPlay'], tab.id))
      const shot = await captureImage({ isDesktop: false, searchArea: 'viewport', storedImageRect: undefined, scaleDpi: false, devicePixelRatio: dpr })
      const img = await new Promise((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = () => reject(new Error('uiv.pixels: could not decode the viewport capture'))
        i.src = shot.dataUrl
      })
      const cv = document.createElement('canvas')
      cv.width = img.width
      cv.height = img.height
      const ctx = cv.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)
      const x0 = Math.round(area.x * dpr), y0 = Math.round(area.y * dpr)
      if (x0 < 0 || y0 < 0 || x0 + w > cv.width || y0 + h > cv.height) throw new Error('uiv.pixels: the area lies outside the visible viewport')
      const data = ctx.getImageData(x0, y0, w, h).data
      const colors = []
      for (let i = 0; i < w * h; i++) colors.push('#' + ((1 << 24) | (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2]).toString(16).slice(1))
      return asValue({ x: area.x, y: area.y, width: w, height: h, scale: dpr, colors, captureId: null, captureTimeMs: null, captureAgeMs: null })
    }
    case 'colorSearch': {
      const scope = args.scope === 'desktop' ? 'desktop' : 'browser'
      const colorStr = String(args.color || '')
      const hexMatch = /^#?([0-9a-fA-F]{6})$/.exec(colorStr)
      if (!hexMatch) {
        throw new Error(`uiv.findColor: '${colorStr}' is not a '#rrggbb' color`)
      }
      const hex = hexMatch[1]
      const target = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
      const tolerance = Math.max(0, Math.min(255, Math.round(Number(args.tolerance) || 0)))
      const area = normalizeFinderArea(args.area, 'uiv.findColor', args.scope)
      // min region size in CSS px — single anti-aliased pixels are noise
      const minW = Math.max(1, Math.round(Number(args.minWidth) || 3))
      const minH = Math.max(1, Math.round(Number(args.minHeight) || 3))
      const dpr = window.devicePixelRatio || 1

      // JS port of the host's connected-components scan, for viewport
      // captures: RGBA pixels -> tolerance mask -> 4-neighborhood BFS ->
      // bounding boxes (raster order comes from the caller's sort)
      const scanRegions = (data, w, h, minWpx, minHpx) => {
        const bin = new Uint8Array(w * h)
        for (let i = 0; i < w * h; i++) {
          const o = i * 4
          if (Math.abs(data[o] - target[0]) <= tolerance &&
              Math.abs(data[o + 1] - target[1]) <= tolerance &&
              Math.abs(data[o + 2] - target[2]) <= tolerance) bin[i] = 1
        }
        const seen = new Uint8Array(w * h)
        const queue = new Int32Array(w * h)
        const out = []
        for (let start = 0; start < w * h; start++) {
          if (!bin[start] || seen[start]) continue
          seen[start] = 1
          let qh = 0, qt = 0
          queue[qt++] = start
          let minX = start % w, maxX = minX, minY = (start / w) | 0, maxY = minY
          while (qh < qt) {
            const i = queue[qh++]
            const x = i % w, y = (i / w) | 0
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
            if (x > 0 && bin[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; queue[qt++] = i - 1 }
            if (x + 1 < w && bin[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; queue[qt++] = i + 1 }
            if (y > 0 && bin[i - w] && !seen[i - w]) { seen[i - w] = 1; queue[qt++] = i - w }
            if (y + 1 < h && bin[i + w] && !seen[i + w]) { seen[i + w] = 1; queue[qt++] = i + w }
          }
          const bw = maxX - minX + 1
          const bh = maxY - minY + 1
          if (bw >= minWpx && bh >= minHpx) out.push({ x: minX, y: minY, width: bw, height: bh })
        }
        return out
      }

      // shared desktop plumbing: build the host params (physical px) once.
      // css/points -> physical is the display's PIXEL RATIO on every OS —
      // the input scalingFactor is 1 on mac (CGEvent takes points), and
      // using it here left findColor results in physical px, double the
      // click coordinates on a Retina display (found live: the dino demo's
      // zone math searched 130px above a line that was 260 physical px
      // below the dino). The searchArea below always used dpr; now the
      // min sizes and the result mapping agree with it.
      const desktopColorParams = async (api) => {
        const params = {
          color: '#' + hex,
          tolerance,
          minWidth: Math.max(1, Math.round(minW * dpr)),
          minHeight: Math.max(1, Math.round(minH * dpr))
        }
        if (area) {
          // css-screen -> physical global, the host's result space
          params.searchArea = {
            x: area.x * dpr,
            y: area.y * dpr,
            width: area.width * dpr,
            height: area.height * dpr
          }
        }
        // same panel cover as every other desktop capture (and the same
        // !CAPTURE_HIDE_GUI demo switch): the panel may show the color
        showDesktopBorder() // desktop automation is visibly running here
        params.displayHint = await getDesktopCaptureHint()
        if (params.searchArea) showDesktopSearchArea(params.searchArea, params.displayHint)
        return { params }
      }
      const mapDesktopRegions = (regions) => (regions || []).map(r => ({
        rect: {
          left: Math.round(r.x / dpr),
          top: Math.round(r.y / dpr),
          width: Math.round(r.width / dpr),
          height: Math.round(r.height / dpr)
        },
        x: Math.round((r.x + r.width / 2) / dpr),
        y: Math.round((r.y + r.height / 2) / dpr)
      }))

      const searchOnce = async () => {
        if (scope === 'desktop') {
          const api = getNativeXYAPI()
          const { params } = await desktopColorParams(api)
          const res = await withDesktopCaptureCover(() => api.findColorRegions(params))
          return mapDesktopRegions(res && res.regions)
        }

        // browser scope: capture the play tab's viewport, scan in-process
        const tab = await getTargetTab()
        if (!tab) throw new Error(E901_NO_TAB)
        await updateState(setIn(['tabIds', 'toPlay'], tab.id))
        const shot = await captureImage({
          isDesktop: false,
          searchArea: 'viewport',
          storedImageRect: undefined,
          scaleDpi: false,
          devicePixelRatio: dpr
        })
        const img = await new Promise((resolve, reject) => {
          const i = new Image()
          i.onload = () => resolve(i)
          i.onerror = () => reject(new Error('uiv.findColor: could not decode the viewport capture'))
          i.src = shot.dataUrl
        })
        const cv = document.createElement('canvas')
        cv.width = img.width
        cv.height = img.height
        const ctx = cv.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, cv.width, cv.height).data
        // capture pixels are dpr-scaled viewport CSS
        const found = scanRegions(data, cv.width, cv.height, Math.max(1, Math.round(minW * dpr)), Math.max(1, Math.round(minH * dpr)))
        let list = found.map(r => ({
          rect: {
            left: Math.round(r.x / dpr),
            top: Math.round(r.y / dpr),
            width: Math.round(r.width / dpr),
            height: Math.round(r.height / dpr)
          },
          x: Math.round((r.x + r.width / 2) / dpr),
          y: Math.round((r.y + r.height / 2) / dpr)
        }))
        if (area) {
          list = list.filter(m => m.x >= area.x && m.x <= area.x + area.width && m.y >= area.y && m.y <= area.y + area.height)
        }
        return list
      }

      const colorDescribeEmpty = () => `no region of color #${hex}${tolerance ? ` (tolerance ${tolerance})` : ''} of at least ${minW}x${minH}px is on the ${scope === 'desktop' ? 'screen' : 'page'}${area ? ' inside the given area' : ''}. findColor matches SOLID areas by pixel color — for anything with texture or text use uiv.findImage / uiv.ocr.findText instead. Anti-aliased or theme-shifted colors need {tolerance: 10..60}.`

      // Desktop scope waits IN-HOST (wait_for_color_regions polls capture +
      // scan at native rate, like wait_for_image): one RPC instead of an
      // extension-side retry loop whose per-attempt round-trip (~300-500ms
      // measured) is far too slow for anything reactive. Old hosts without
      // the method fall back to the classic loop below.
      let matches
      if (scope === 'desktop') {
        const api = getNativeXYAPI()
        const timeoutS = args.timeout != null && Number(args.timeout) >= 0 ? Number(args.timeout) : defaultFindTimeoutS()
        const label = `findColors('#${hex}')`
        try {
          const { params } = await desktopColorParams(api)
          params.timeoutMs = Math.round(timeoutS * 1000)
          emit('wait', { label, remainingS: Math.ceil(timeoutS) })
          const res = await withDesktopCaptureCover(() => api.waitForColorRegions(params))
            .finally(() => emit('wait', null))
          matches = mapDesktopRegions(res && res.regions)
          if (!matches.length && args.required !== false) {
            throw new Error(`${label}: nothing found within ${Math.round(timeoutS)}s — ${colorDescribeEmpty()}`)
          }
        } catch (e) {
          if (!/Unknown method/i.test((e && e.message) || '')) throw e
          matches = undefined // pre-2.0.10 host: classic extension-side loop
        }
      }

      if (matches === undefined) {
        matches = await retryFind(searchOnce, {
          timeoutS: args.timeout,
          required: args.required,
          label: `findColors('#${hex}')`,
          describeEmpty: colorDescribeEmpty
        })
      }
      // reading order + 'best' = the LARGEST region (color has no match
      // score; the biggest patch is the intended swatch in practice)
      const rowH = Math.max(1, (matches[0] && matches[0].rect && matches[0].rect.height / 2) || 1)
      const best = matches.reduce((p, m) => (m.rect.width * m.rect.height) > ((p && p.rect.width * p.rect.height) || 0) ? m : p, null)
      const ordered = matches.slice().sort((a, b) =>
        (Math.round(a.y / rowH) - Math.round(b.y / rowH)) || (a.x - b.x))
      return asValue(ordered.map(m => ({ ...m, scope, best: m === best })))
    }

    case 'textSearch': {
      // each attempt is a full OCR conversion (potentially a cloud API call
      // that counts against the user's quota) — pace retries accordingly
      // "not found" by OCR is ambiguous in a way no other finder's is: the text
      // may be absent, or present and MISREAD. Retrying cannot tell those apart
      // and neither can a longer timeout — only the recognised text can. The
      // pass already produced it, so the miss reports it instead of leaving the
      // caller to guess and fail slower.
      // {image}: a stored image cannot change, so there is nothing to
      // auto-wait for — one OCR pass, no retries (each could bill the cloud
      // OCR again), and no trail entry (the post-run picture shows the live
      // viewport/screen; image-pixel boxes belong to neither).
      if (args.image) {
        const r = await textSearchOnce(args)
        if (!r.matches.length && args.required !== false) {
          const seen = summariseOcrText(r.text)
          throw new Error(
            `uiv.ocr.findTexts('${args.text}'): nothing found in image '${args.image}'` +
            (seen
              ? ` — OCR recognised: "${seen}". Is your word in there? Wildcards match per word: uiv.ocr.findText('Acc*pt')`
              : ' — OCR recognised no text at all in it (check the engine and language under Settings > OCR, or pass {engine, language})') +
            ocrSpaceUpgradeNote()
          )
        }
        return asValue(readingOrder(r.matches).map(m => ({ ...m, scope: 'image' })))
      }
      let lastOcrText = ''
      let lastWords = []
      let lastMatches = []
      // one settled trail entry per CALL, hit or miss — recorded in finally
      // because a required miss THROWS out of retryFind, and the miss is
      // exactly the case the post-run picture is for
      const recordSettled = () => recordOcrTrail({
        query: String(args.text),
        scope: args.scope === 'desktop' ? 'desktop' : 'browser',
        area: areaRectOf(args.area),
        // which reader the CALL asked for (null = the configured default) —
        // the run-result legend uses it to flag searches that ran on the weak
        // Javascript OCR while the XModule reader sat installed
        engine: args.engine !== undefined && args.engine !== null ? String(args.engine) : null,
        matches: (lastMatches || []).slice(0, 20).map(m => ({ x: m.x, y: m.y, rect: m.rect, text: m.text })),
        words: lastWords
      })
      const attemptOnce = async () => {
        const r = await textSearchOnce(args)
        lastOcrText = r.text
        lastWords = r.words || []
        lastMatches = r.matches
        return r.matches
      }
      const retryOpts = (timeoutS) => ({
          timeoutS,
          required: args.required,
          label: `ocr.findTexts('${args.text}')`,
          retryDelayMs: 2000,
          describeEmpty: () => {
            const seen = summariseOcrText(lastOcrText)
            if (!seen) {
              return `OCR recognised NO text at all here, so this is an OCR problem rather than a search problem: check the engine and language under Settings > OCR (or pass {engine, language}), and make sure the page is actually visible.${ocrSpaceUpgradeNote()}`
            }
            return `a search can only match what OCR RECOGNISED, which on this page was: "${seen}" — and no longer timeout changes that text. Is your word in there? If NOT, this engine cannot read it here — which is not a reason to stop targeting by text, only to change the READER. Two ways: (1) uiv.ai.find('the blue "Accept all" button') hands back a match like any finder, and the model reads what the local engine cannot, so no image file is needed (it does not auto-wait and each call is billable — wait for the page yourself first); (2) save a picture of the target (the Image button in Script tools, or uiv.shot.area from a script) and use uiv.findImage('file.png'), which compares pixels and ignores the font. Either fixes it; a longer timeout and different wording do not. The local OCR engines lose light-on-dark button labels ("Accept all" white on blue) and small glyphs most often, and those are exactly the things a picture matches perfectly. Second best, when a picture is awkward: ANCHOR ON A WORD OCR DID READ and step to the target from there — every word listed above is a candidate, and the recognised text is exactly the menu to pick from. uiv.browser.click(uiv.offset(uiv.ocr.findText('Privacy Policy'), 420, -30)) — the JS answer to the classic word#R420,-30 relative target, composed from a finder plus uiv.offset rather than a relative command: unreadable buttons usually sit a fixed distance from perfectly readable body text. (If the element is in the DOM, a locator beats both.)${ocrSpaceUpgradeNote()} Only if you CAN see the word in the recognised text but spelled differently is ocr.findText still the right tool — then match the misreading with wildcards, which work per word: uiv.ocr.findText('Acc*pt all')`
          }
      })

      // which reader would run: an explicit {engine} else the configured one
      const engineAskedForWait = resolveOcrEngine(args.engine, 'uiv.ocr.findText')
      const localHostEngine = engineAskedForWait !== undefined ? engineAskedForWait : store.getState().config.ocrEngine

      // Desktop scope with a LOCAL reader (ocrs or the OS engine) waits
      // IN-HOST between extension passes: wait_for_text captures + OCRs +
      // matches at native rate in ONE RPC, where the classic loop pays the
      // full per-command dispatch on every 2s attempt. The extension pass
      // stays AUTHORITATIVE for the result — coordinates, the trail picture
      // and the recognised-text diagnostics all come from textSearchOnce;
      // the host hit is only the tripwire that ends the wait. Sliced to 5s
      // so a pattern the host's simpler matcher reads differently still gets
      // an extension pass at a bounded cadence (worst case this degrades to
      // a 5s retry loop, never to a miss). Hosts without the method fall
      // back to the classic loop for the remaining time.
      const hostAssistedTextWait = async () => {
        const label = `ocr.findTexts('${args.text}')`
        const timeoutS = args.timeout != null && Number(args.timeout) >= 0 ? Number(args.timeout) : defaultFindTimeoutS()
        const t0 = Date.now()
        const first = await attemptOnce()
        if (first.length) return first
        const api = getNativeXYAPI()
        const dpr = window.devicePixelRatio
        const params = { text: String(args.text), intervalMs: 300 }
        if (localHostEngine === 98) params.engine = 'ocrs'
        const langTag = ocrLanguageTag(args.language || store.getState().config.ocrLanguage)
        if (langTag) params.language = langTag
        const area = normalizeFinderArea(args.area, 'uiv.ocr.findText', args.scope)
        if (area) {
          // css-screen -> physical global, the host's search space (same
          // conversion as the desktop color path)
          params.searchArea = { x: area.x * dpr, y: area.y * dpr, width: area.width * dpr, height: area.height * dpr }
        }
        showDesktopBorder() // desktop automation is visibly running here
        params.displayHint = await getDesktopCaptureHint()
        if (params.searchArea) showDesktopSearchArea(params.searchArea, params.displayHint)
        try {
          while (true) {
            const remainingMs = Math.round(timeoutS * 1000) - (Date.now() - t0)
            // a sub-second tail slice cannot beat the confirm pass it would
            // trigger — the timeout is better spent reporting the miss
            if (remainingMs <= 500) break
            emit('wait', { label, remainingS: Math.ceil(remainingMs / 1000) })
            let hostRes
            try {
              // the confirming extension pass (~2.5s) runs AFTER the slice —
              // budget it inside the remaining time, or the last slice plus
              // its confirm overshoot the caller's timeout by a full pass
              hostRes = await withDesktopCaptureCover(() => api.waitForText({ ...params, timeoutMs: Math.max(500, Math.min(remainingMs - 2500, 5000)) }))
            } catch (e) {
              if (!/Unknown method/i.test((e && e.message) || '')) throw e
              // pre-2.0.12 host: classic extension-side loop for the rest
              return retryFind(attemptOnce, retryOpts(Math.max(1, Math.round(remainingMs / 1000))))
            }
            // host hit OR slice elapsed — the extension pass decides either way
            const m = await attemptOnce()
            if (m.length) return m
            // the host matched what the extension's matcher does not (engine
            // settings differ, exotic pattern): do not hot-loop on that
            // disagreement — the text is not going anywhere
            if (hostRes && hostRes.found) await new Promise(r => setTimeout(r, 1000))
          }
        } finally {
          emit('wait', null)
        }
        if (args.required === false) return []
        throw new Error(`${label}: nothing found within ${Math.round(timeoutS)}s — ${retryOpts(timeoutS).describeEmpty()}`)
      }

      // withBannerHidden: banner text in the capture would come back as
      // phantom OCR words
      const matches = await withBannerHidden(() =>
        args.scope === 'desktop' && (localHostEngine === 98 || localHostEngine === 99)
          ? hostAssistedTextWait()
          : retryFind(attemptOnce, retryOpts(args.timeout))
      ).finally(recordSettled)
      const scope = args.scope === 'desktop' ? 'desktop' : 'browser'
      // READING ORDER, same contract as findImages: with several identical
      // words on screen, "the 3rd match" must be the 3rd on the page, not
      // whatever the engine ranked 3rd (measured x-order 351,521,181,690,861
      // for five identical words by the OrderingCheck demo).
      const ordered = readingOrder(matches)
      return asValue(ordered.map(m => ({ ...m, scope })))
    }

    // --- dom tier: content script, synthetic events -------------------------
    // The classic click/type commands. No CDP attach, no XModule, and `type`
    // sets the value in ONE command — no separate click to focus the field
    // first, which is what makes it the fast path for form filling.
    case 'domScrollIntoView': {
      const tab = await getTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
      const locErr = scriptLocatorError(args.locator)
      if (locErr) throw new Error('scrollIntoViewIfNeeded: ' + locErr)
      const timeout = args.timeout === undefined ? Number(getVarsInstance().get('!TIMEOUT_WAIT') || 10) * 1000 : args.timeout
      const deadline = timeout === 0 ? Infinity : Date.now() + timeout
      let previous = null
      const content = elementContentCheck(args.find || {})
      while (Date.now() <= deadline) {
        if (stopRequested) throw new Error('scrollIntoViewIfNeeded: stopped')
        const result = await elementSearchOnce(tab, { locator: args.locator, scroll: false })
        const matches = content ? result.matches.filter(content.test) : result.matches
        const match = matches[args.index || 0]
        if (match && previous && match.frameId === previous.frameId && JSON.stringify(match.rect) === JSON.stringify(previous.rect)) {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, frameIds: [match.frameId] },
            func: pageElementSearch,
            args: [args.locator, { scrollIntoViewIfNeeded: true, index: match.frameIndex, observationTimeout: Math.max(1, Math.min(1000, deadline - Date.now())) }]
          })
          const r = results && results[0] && results[0].result
          if (r && !r.ok && !r.retryable) throw new Error(r.error)
          if (r && r.ok && r.matches.length) return asValue(undefined)
        }
        previous = match
        await delayMs(50)
      }
      throw new Error('scrollIntoViewIfNeeded: element was not attached, visible and stable within ' + timeout + ' ms: ' + args.locator)
    }

    case 'bWheel': {
      const tab = await getTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
      await sendCdpWheelEvent(tab.id, args.deltaX, args.deltaY)
      return asValue(undefined)
    }

    case 'bKey': {
      const tab = await getTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
      await sendCdpKeyEvent(tab.id, args.key, args.down)
      return asValue(undefined)
    }

    case 'xWheel': {
      const api = getXModule2API()
      const version = await api.getVersion()
      if (!semver.valid(version) || semver.lt(version, '2.1.38')) throw new Error('uiv.desktop.mouse.wheel requires Ui.Vision for Desktop 2.1.38 or newer; update the app and restart the browser')
      await api.invoke('send_mouse_wheel_event', { deltaX: args.deltaX, deltaY: args.deltaY, unit: 'pixel' })
      return asValue(undefined)
    }

    case 'domClickLocator': {
      const cm = await crossFrameRefMatch(args.locator)
      if (cm && cm.error) return { ok: false, error: 'uiv.page.click: ' + cm.error }
      if (cm) return dispatchBridgeInner('domClickAt', { x: cm.x, y: cm.y, frameId: cm.frameId, tag: cm.tag, offscreen: !!cm.offscreen })
      const r = await withElementWaitCountdown(
        `uiv.page.click('${String(args.locator).slice(0, 80)}')`,
        () => runOneCommand('click', args.locator, '', { spExtra: { requireVisibleClick: true } }, { fast: true })
      )
      if (!r.ok) return r
      await settleAfterClick()
      return asValue(undefined)
    }

    case 'domType': {
      const tm = await crossFrameRefMatch(args.locator)
      if (tm && tm.error) return { ok: false, error: 'uiv.page.fill: ' + tm.error }
      if (tm) return dispatchBridgeInner('domTypeAt', { ...tm, text: args.text, offscreen: !!tm.offscreen })
      const r = await withElementWaitCountdown(
        `uiv.page.fill('${String(args.locator).slice(0, 80)}')`,
        () => runOneCommand('type', args.locator, args.text, null, { fast: true })
      )
      return r.ok ? asValue(undefined) : r
    }

    // uiv.page.fill(match, text) — fill the field the finder already located,
    // in its own frame (works for cross-origin frames, where a locator cannot
    // reach). Same tier as domType: DOM value + input/change events, no CDP.
    case 'domTypeAt': {
      const tab = await getTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [args.frameId || 0] },
        func: pageTypeAt,
        args: [Math.round(args.x), Math.round(args.y), String(args.text), !!args.offscreen, args.elementId || null, args.findOffset || null, args.elementSignature || null]
      })
      const r = results && results[0] && results[0].result
      if (!r) return { ok: false, error: `uiv.page.fill: frame ${args.frameId} did not answer — it was removed or navigated between the finder and this call, so the match is stale. Re-run the finder right before typing (a match from before a click or navigation cannot be used afterwards)` }
      if (!r.ok) return { ok: false, error: `uiv.page.fill: ${r.error}` }
      return asValue(undefined)
    }

    // DOM click at a point, executed INSIDE a specific frame — used for
    // uiv.page.click(match) and as the automatic route for matches in
    // cross-origin frames, whose coordinates are frame-local and therefore
    // meaningless to CDP
    case 'domClickAt': {
      const tab = await getTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [args.frameId || 0] },
        func: pageDomClickAt,
        args: [Math.round(args.x), Math.round(args.y), args.tag || '', !!args.offscreen, args.elementId || null, args.findOffset || null, args.elementSignature || null]
      })
      const r = results && results[0] && results[0].result
      if (!r) return { ok: false, error: `uiv.page.click: frame ${args.frameId} did not answer — it was removed or navigated between the finder and this call, so the match is stale. Re-run the finder right before clicking (a match from before a click or navigation cannot be used afterwards)` }
      if (!r.ok) return { ok: false, error: `uiv.page.click (frame ${args.frameId}): ${r.error}` }
      if (args.frameId) store.dispatch(act.addLog('echo', `DOM click in frame ${args.frameId} (<${r.tag}>)`))
      await settleAfterClick()
      return asValue(undefined)
    }

    // --- browser tier: CDP (B family) ---------------------------------------
    // Trusted input with no XModule install needed, viewport CSS px consumed
    // as-is (no side-panel or DPI correction — sendCdpMouseEvent passes x/y
    // straight to Input.dispatchMouseEvent). spExtra pins browser
    // interpretation so a desktop !CVSCOPE cannot re-read "x,y" as screen px.
    case 'bClick': {
      args = await settleDomPoint(args, 'uiv.browser.click')
      args = await settleVisualPointForCdp(args, 'uiv.browser.click')
      args = await settleRawPointForCdp(args, 'uiv.browser.click')
      const r = await runOneCommand('BClick', coordTarget(args), buttonValue(args), { spExtra: { isDesktop: false } }, { fast: true })
      if (!r.ok) return r
      await settleAfterClick()
      return asValue(undefined)
    }

    case 'bMove': {
      args = await settleVisualPointForCdp(args, 'uiv.browser.hover')
      args = await settleRawPointForCdp(args, 'uiv.browser.hover')
      const r = await runOneCommand('BMove', coordTarget(args), '', { spExtra: { isDesktop: false } }, { fast: true })
      return r.ok ? asValue(undefined) : r
    }

    // press / release, so a drag can span several calls: down holds the
    // button, every bMove while it is held drags, up releases (see
    // uiv.browser.down)
    case 'bDown':
    case 'bUp': {
      args = await settleVisualPointForCdp(args, op === 'bDown' ? 'uiv.browser.down' : 'uiv.browser.up')
      args = await settleRawPointForCdp(args, op === 'bDown' ? 'uiv.browser.down' : 'uiv.browser.up')
      const r = await runOneCommand('BMove', coordTarget(args), op === 'bDown' ? '#down' : '#up',
        { spExtra: { isDesktop: false } }, { fast: true })
      return r.ok ? asValue(undefined) : r
    }

    // --- desktop tier: XModule native host (X family) -----------------------
    // Real OS input. The point's scope picks the classic XClick coordinate
    // mode: 'desktop' = SCREEN pixels, 'browser' = VIEWPORT pixels (the
    // XModule path converts — side panel + window offset — and brings the
    // browser to the foreground first). spExtra pins that choice so a stray
    // !CVSCOPE cannot re-read the coordinates in the other space.
    case 'xClick': {
      const r = await runOneCommand('XClick', coordTarget(args), buttonValue(args), { spExtra: { isDesktop: args.scope !== 'browser', viaJsMacro: true } }, { fast: true })
      if (!r.ok) return r
      // an OS-level click can land anywhere, including outside the browser —
      // only watch the tab when it plausibly hit the page
      await settleAfterClick()
      return asValue(undefined)
    }

    case 'xMove': {
      const r = await runOneCommand('XMove', coordTarget(args), '', { spExtra: { isDesktop: args.scope !== 'browser', viaJsMacro: true } }, { fast: true })
      return r.ok ? asValue(undefined) : r
    }

    case 'xDown':
    case 'xUp': {
      const r = await runOneCommand('XMove', coordTarget(args), op === 'xDown' ? '#down' : '#up',
        { spExtra: { isDesktop: args.scope !== 'browser', viaJsMacro: true } }, { fast: true })
      return r.ok ? asValue(undefined) : r
    }

    case 'waitStill': {
      // uiv.desktop.waitStill / waitChange — the host samples the area at
      // native rate (region capture) and returns when it settles / changes.
      const api = getNativeXYAPI()
      const dpr = window.devicePixelRatio || 1
      const rect = normalizeRectArg(args.area, 'uiv.desktop.waitStill')
      if (!rect) throw new Error('uiv.desktop.waitStill: pass the area to watch — {x, y, width, height} in screen px, or a match from a desktop finder')
      const wantChange = args.until === 'change'
      const fnName = wantChange ? 'uiv.desktop.waitChange' : 'uiv.desktop.waitStill'
      const timeoutS = Number(args.timeout) > 0 ? Number(args.timeout) : 15
      showDesktopBorder()
      const displayHint = await getDesktopCaptureHint()
      emit('wait', { label: fnName, remainingS: Math.ceil(timeoutS) })
      try {
        const res = await withDesktopCaptureCover(() => api.waitForStill({
          area: { x: rect.x * dpr, y: rect.y * dpr, width: rect.width * dpr, height: rect.height * dpr },
          until: wantChange ? 'change' : 'still',
          ...(args.stillMs ? { stillMs: Number(args.stillMs) } : {}),
          timeoutMs: Math.round(timeoutS * 1000),
          displayHint
        }))
        const done = wantChange ? (res && res.changed) : (res && res.stilled)
        if (!done) {
          if (args.required === false) return asValue({ waitedMs: res && res.elapsedMs, timedOut: true })
          throw new Error(fnName + ': the area ' + (wantChange ? 'did not change' : 'kept changing') + ' within ' + timeoutS + 's' + (wantChange ? '' : ' — is something animating inside it (a cursor, a video, a spinner that never ends)?'))
        }
        return asValue({ waitedMs: res.elapsedMs })
      } finally {
        emit('wait', null)
      }
    }

    case 'reflex': {
      // uiv.desktop.reflex — hand the rule set to the host's reflex engine
      // (xmodule2 reflex_run) and block until it returns the firing journal.
      // The host works in PHYSICAL px; the script speaks the desktop
      // finders' screen px — convert areas/thresholds/click points in, and
      // the journal's rects back out.
      const api = getNativeXYAPI()
      const scaling = await api.getScalingFactor()
      const dpr = window.devicePixelRatio || 1
      const rulesIn = Array.isArray(args.rules) ? args.rules : []
      if (!rulesIn.length) throw new Error('uiv.desktop.reflex: pass {rules: [...]} — see the API comment for the shape')
      const toPhysArea = (a) => a && ({ x: a.x * dpr, y: a.y * dpr, width: a.width * dpr, height: a.height * dpr })
      const rules = rulesIn.map((r, i) => {
        if (!r || !r.watch || !r.action) throw new Error(`uiv.desktop.reflex: rule ${i} needs {watch, action}`)
        const watch = { ...r.watch }
        if (watch.area) watch.area = toPhysArea(watch.area)
        if (watch.minWidth) watch.minWidth = Math.max(1, Math.round(watch.minWidth * scaling))
        if (watch.minHeight) watch.minHeight = Math.max(1, Math.round(watch.minHeight * scaling))
        const out = { ...r, watch }
        if (r.when && (typeof r.when.leftBelow === 'number' || typeof r.when.reachesBelow === 'number')) {
          out.when = {}
          if (typeof r.when.leftBelow === 'number') out.when.leftBelow = r.when.leftBelow * dpr
          if (typeof r.when.reachesBelow === 'number') out.when.reachesBelow = r.when.reachesBelow * dpr
        }
        if (r.action && r.action.click) {
          out.action = { ...r.action, click: { ...r.action.click, x: r.action.click.x * dpr, y: r.action.click.y * dpr } }
        }
        return out
      })
      showDesktopBorder() // desktop automation is visibly running here
      const displayHint = await getDesktopCaptureHint()
      const timeoutMs = Math.min(600000, Math.max(200, Number(args.timeoutMs) || 30000))
      emit('wait', { label: 'desktop.reflex', remainingS: Math.ceil(timeoutMs / 1000) })
      try {
        // the search-area shade over the UNION of the watched areas, so the
        // whole reflex phase stays visibly marked (the shade caps at 10s per
        // show; slice-driven callers re-enter here and refresh it)
        const cueCaptureVisible = await desktopOverlayCaptureVisible()
        const withArea = rules.filter(r => r.watch && r.watch.area)
        if (withArea.length === rules.length && rules.length) {
          const u = withArea.reduce((acc, r) => {
            const a = r.watch.area
            const x0 = Math.min(acc.x0, a.x)
            const y0 = Math.min(acc.y0, a.y)
            return {
              x0,
              y0,
              x1: Math.max(acc.x1, a.x + a.width),
              y1: Math.max(acc.y1, a.y + a.height)
            }
          }, { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity })
          showDesktopSearchArea(
            { x: u.x0, y: u.y0, width: u.x1 - u.x0, height: u.y1 - u.y0 },
            displayHint,
            Math.min(timeoutMs + 1000, 10000)
          )
        }
        const res = await withDesktopCaptureCover(() => api.reflexRun({
          rules,
          displayHint,
          timeoutMs,
          // rides to the host's cue drawing: with the remote-session
          // visibility setting ON, the reflex squares show in RDP/AnyDesk
          // streams like every other overlay
          captureVisible: cueCaptureVisible,
          ...(args.quietMs ? { quietMs: Number(args.quietMs) } : {})
        }))
        const firings = ((res && res.firings) || []).map(f => ({
          ...f,
          x: Math.round(f.x / scaling),
          y: Math.round(f.y / scaling),
          width: Math.round(f.width / scaling),
          height: Math.round(f.height / scaling)
        }))
        return asValue({ firings, elapsedMs: res && res.elapsedMs, ended: res && res.ended })
      } finally {
        emit('wait', null)
      }
    }

    case 'appVersion':
      return asValue(await getXModule2API().getVersion())
    case 'lastCapture': {
      try { return asValue(await getXModule2API().invoke('get_last_capture')) }
      catch (e) {
        if (/unknown|not.supported|not.implemented/i.test(String(e))) throw new Error('uiv.lastCapture() in browser macros requires Ui.Vision Desktop 2.1.40 or newer. Update the app and restart it. Native response: ' + String(e))
        throw e
      }
    }
    case 'keyDown':
    case 'keyUp': {
      // Track before sending: a lost response can still have injected a down.
      if (op === 'keyDown') heldDesktopKeys.add(args.text)
      await getXModule2API().invoke('send_text', { text: args.text, hold: op === 'keyDown' })
      if (op === 'keyUp') heldDesktopKeys.delete(args.text)
      return asValue(undefined)
    }
    case 'windowMove': {
      if (!Number.isFinite(args.x) || !Number.isFinite(args.y)) throw new Error('uiv.window.move(x, y): use finite screen coordinates')
      const tab = await getWindowTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
      await Ext.windows.update(tab.windowId, { state: 'normal' })
      const moved = await Ext.windows.update(tab.windowId, { left: Math.round(args.x), top: Math.round(args.y) })
      return asValue({ x: moved.left, y: moved.top, width: moved.width, height: moved.height })
    }
    case 'xType': {
      // Typing has no coordinates, so the browser/desktop split does not apply
      // to it — the keystrokes go to whatever the OS has focused, which is the
      // whole point of the desktop tier. Passing no spExtra made it fall back
      // to !CVSCOPE, and under the default browser scope the runner then
      // demanded a web tab: uiv.desktop.mouse.click opened an extension popup
      // (tab-free, correctly), and the uiv.desktop.keyboard.type on the next line died
      // with E901 because only browser-internal pages were open. XType itself
      // ignores the flag (see runXMouseKeyboardCommand), so pinning it desktop
      // changes nothing but the tab requirement it should never have had.
      const r = await runOneCommand('XType', args.text, '', { spExtra: { isDesktop: true, viaJsMacro: true } }, { fast: true })
      return r.ok ? asValue(undefined) : r
    }

    case 'domCheck': {
      const tab = await getTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
      const verb = args.checked ? 'check' : 'uncheck'
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: pageSetChecked,
        args: [args.locator, !!args.checked]
      })
      const hit = (results || []).map(r => r && r.result).filter(r => r && r.found)[0]
      if (!hit) return { ok: false, error: `uiv.page.${verb}: ${args.what || args.locator} did not resolve to anything on the page` }
      if (!hit.ok) return { ok: false, error: hit.error }
      store.dispatch(act.addLog('echo', `${verb}: ${hit.tag} ${hit.changed ? (args.checked ? 'checked' : 'unchecked') : 'was already ' + (args.checked ? 'checked' : 'unchecked')}`))
      return asValue(undefined)
    }

    case 'domSelect': {
      const tab = await getTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
      let hit = null
      await retryFind(
        async () => {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: pageSelectOption,
            args: [args.locator, args.option]
          })
          const frames = (results || []).map(r => r && r.result).filter(Boolean)
          const foundFrames = frames.filter(r => r.found)
          if (!foundFrames.length) return [] // select not on the page yet — keep waiting
          const okHit = foundFrames.find(r => r.ok)
          if (okHit) {
            hit = okHit
            return [okHit]
          }
          // found but failed: E903 (custom widget) fails fast via retryFind's
          // fatal-error list; a wrong option label retries (async option lists)
          throw new Error(foundFrames[0].error || `uiv.page.selectOption: found the dropdown but could not pick '${args.option}' — no reason reported. Check the option exists (the error normally lists the available labels), or select it by 'value=…' / 'index=N' instead`)
        },
        { timeoutS: args.timeout, required: args.required, label: `uiv.page.selectOption('${args.locator}', '${args.option}')` }
      )
      if (hit) {
        store.dispatch(act.addLog('echo', `select: '${hit.label}' chosen (value=${hit.value})`))
        // Changing a select can reload/navigate (sort orders, filters), so
        // watch for navigation after the selection as well as after clicks.
        await settleAfterClick()
      }
      return asValue(undefined)
    }

    case 'bType': {
      // NO focus guard here (removed 2026-08): keystrokes go to whatever the
      // page has focused, exactly like the classic BType. Where the typed text
      // ends up is for the MACRO to verify — read the field/result back and
      // throw on mismatch ("a script must prove its own success"); a
      // background probe cannot outguess pages with erratic focus handling.
      const r = await runOneCommand('BType', args.text, '', { spExtra: { isDesktop: false } }, { fast: true })
      if (!r.ok) return r
      // {nav: true}: a keyboard submit (ENTER) navigates but, unlike a click,
      // carries no automatic wait — opt in to the same settle watch here, so
      // the next call sees the page the keystroke navigated to
      if (args.nav) await settleAfterClick()
      return asValue(undefined)
    }

    // --- screenshots: write a file, return its name -------------------------
    case 'shotViewport':
    case 'shotPage':
    case 'shotDesktop':
    case 'shotElement': {
      const CMD = {
        shotViewport: 'captureScreenshot',
        shotPage: 'captureEntirePageScreenshot',
        shotDesktop: 'captureDesktopScreenshot',
        shotElement: 'storeImage'
      }[op]

      // storeImage is the odd one: the LOCATOR is its target and the file name
      // its value; the others take the name as the target
      const r = op === 'shotElement'
        ? await runOneCommand(CMD, args.locator, args.name)
        : await runOneCommand(CMD, args.name, '')

      if (!r.ok) return r
      // hand the name back so the shot can be piped into ocr.read / ai.ask
      return asValue(args.name)
    }

    // Crop a region into VISION storage (not screenshot storage): the point of
    // the crop is to be FOUND again — uiv.findImage(name) — which is what
    // makes the self-healing pattern work: an expensive finder (uiv.ai.find)
    // locates the target once, shot.area caches its pixels, and every later
    // run matches them for free.
    case 'shotArea': {
      const isDesktop = args.scope === 'desktop'
      const rect = normalizeRectArg({ rect: args.rect }, 'uiv.shot.area')
      if (!rect) return { ok: false, error: 'uiv.shot.area: the crop rectangle has no size — the match it came from is zero-width/height, which happens when the element is collapsed, hidden or scrolled out of the viewport. Scroll it into view (or reveal it) and find it again, or pass an explicit {width, height}' }

      if (!isDesktop) {
        // pin the capture to the script's tab, same as the visual finders
        const tab = await getTargetTab()
        if (!tab) throw new Error(E901_NO_TAB)
        await updateState(setIn(['tabIds', 'toPlay'], tab.id))
      }

      const { dataUrl } = await captureImage({
        isDesktop,
        storedImageRect: rect,
        searchArea: 'rect',
        scaleDpi: true,
        devicePixelRatio: window.devicePixelRatio
      })

      const fileName = /\.png$/i.test(args.name) ? args.name : `${args.name}.png`
      if (args.store === 'screenshots') {
        // {store: 'screenshots'}: an AREA capture as a plain screenshot — for
        // evidence shots (a game's end state, a dialog) that belong in the
        // Screenshots tab, not as a findImage template
        await getStorageManager().getScreenshotStorage().write(fileName, dataURItoBlob(dataUrl))
        try { await store.dispatch(act.listScreenshots()) } catch (e) { /* list refresh is cosmetic */ }
        store.dispatch(act.addLog('echo', `shot.area: saved ${rect.width}x${rect.height}px crop as screenshot '${fileName}'`))
        return asValue(fileName)
      }
      await getStorageManager().getVisionStorage().write(fileName, dataURItoBlob(dataUrl))
      // refresh the vision list so the new image shows up in the UI at once
      try { await store.dispatch(act.listVisions()) } catch (e) { /* list refresh is cosmetic */ }
      store.dispatch(act.addLog('echo', `shot.area: saved ${rect.width}x${rect.height}px crop as vision image '${fileName}' — uiv.findImage('${fileName}') finds it from now on`))
      return asValue(fileName)
    }

    // --- tabs: absolute 1-based indexes, every call returns where we are ----
    case 'tabsList':
    case 'tabsSelect':
    case 'tabsOpen':
    case 'tabsClose': {
      // anchor on the window of the CURRENT script tab, so a multi-window
      // setup counts the tabs of the window the run actually works in
      const cur = await getTargetTab()
      const wins = await Ext.windows.getAll({ populate: false }).catch(() => [])
      const winNo = (windowId) => { const i = wins.findIndex(w => w.id === windowId); return i < 0 ? 0 : i + 1 }
      const curWin = cur ? cur.windowId : (wins[0] ? wins[0].id : undefined)
      // `current` = the script's tab, the position read that replaces the
      // table-macro !CURRENT_TAB_NUMBER variable (stale next to these calls,
      // so getVar refuses it). `active` = the browser's active tab; they
      // differ if the user clicks another tab mid-run. `index` is the tab's
      // position in ITS window (1-based), `window` the window's number.
      const info = (t, curId) => ({ index: (t.index || 0) + 1, window: winNo(t.windowId), title: t.title || '', url: t.url || '', active: !!t.active, current: t.id === curId })
      const tag = (t) => `#${(t.index || 0) + 1}${t.windowId !== curWin ? ' (window ' + winNo(t.windowId) + ')' : ''}`
      // the run's window first, then the others in window order
      const listOf = async (all) => {
        const tabs = await Ext.tabs.query(all ? {} : { windowId: curWin })
        return tabs.sort((a, b) => ((a.windowId === curWin ? 0 : 1) - (b.windowId === curWin ? 0 : 1)) || (winNo(a.windowId) - winNo(b.windowId)) || ((a.index || 0) - (b.index || 0)))
      }

      if (op === 'tabsList') {
        return asValue((await listOf(!!args.all)).map(t => info(t, cur && cur.id)))
      }

      // select/close take a number, a list entry {index, window} or a matcher
      // ({url}/{title} substring in any window, {newest: true}) — OPEN-ISSUES 21.3
      const findTab = async (a, verb) => {
        if (typeof a.index === 'number') {
          const windowId = a.window ? (wins[a.window - 1] ? wins[a.window - 1].id : undefined) : curWin
          if (windowId === undefined) return { error: `${verb}: window ${a.window} does not exist — uiv.tabs.list({all: true}) shows the windows` }
          const tabs = (await Ext.tabs.query({ windowId })).sort((x, y) => (x.index || 0) - (y.index || 0))
          if (!Number.isInteger(a.index) || a.index < 1 || a.index > tabs.length) {
            return { error: `${verb}: tab ${a.index} does not exist — window ${winNo(windowId)} has ${tabs.length} tab(s), numbered 1..${tabs.length} left to right (uiv.tabs.list() shows them). The index is ABSOLUTE, unlike the classic selectWindow's start-tab-relative counting` }
          }
          return { tab: tabs[a.index - 1], how: '' }
        }
        const all = await listOf(true)
        const curId = cur ? cur.id : -1
        if (a.newest) {
          // tab ids are handed out in creation order: the highest id is the
          // tab opened last (a click's target=_blank, a popup) — the run's
          // own window first, any window if it has no other tab
          const own = all.filter(t => t.windowId === curWin && t.id !== curId)
          const pool = own.length ? own : all.filter(t => t.id !== curId)
          if (!pool.length) return { error: `${verb}: no other tab exists — nothing was opened` }
          return { tab: pool.reduce((m, t) => (t.id > m.id ? t : m), pool[0]), how: 'the tab opened last' }
        }
        const field = a.url != null ? 'url' : 'title'
        const needle = String(a[field]).toLowerCase()
        const hits = all.filter(t => String(t[field] || '').toLowerCase().indexOf(needle) >= 0)
        if (!hits.length) {
          return { error: `${verb}: no tab whose ${field} contains "${needle}" — open tabs: ${all.map(t => tag(t) + ' ' + String(t[field] || '').slice(0, 50)).join(' | ')}` }
        }
        // several: the run's own window first, then the newest
        const best = hits.slice().sort((x, y) => ((x.windowId === curWin ? 0 : 1) - (y.windowId === curWin ? 0 : 1)) || (y.id - x.id))[0]
        return { tab: best, how: hits.length > 1 ? `${hits.length} tabs match "${needle}", took the newest in the run's window` : `by ${field} "${needle}"` }
      }

      if (op === 'tabsSelect') {
        const f = await findTab(args, 'uiv.tabs.select')
        if (f.error) return { ok: false, error: f.error }
        let t = f.tab
        // Firefox creates a tab as about:blank (status already "complete")
        // and navigates it a beat later — a tabs.select right after
        // tabs.open / a link that opened a tab was refused as
        // "browser-internal" (measured live: DemoTabs on Firefox). Give a
        // blank tab a moment to show its real url before judging it.
        if (/^about:blank$/i.test(t.url || '')) {
          const until = Date.now() + 3000
          while (Date.now() < until) {
            const now = await Ext.tabs.get(t.id).catch(() => null)
            if (!now) break
            t = now
            if (!/^about:blank$/i.test(now.url || '')) break
            await delayMs(150)
          }
        }
        if (!isWebTab(t)) {
          return { ok: false, error: `uiv.tabs.select: tab ${tag(t)} is a browser-internal page (${t.url || 'no url'}) — commands cannot run there, so refusing to switch to it` }
        }
        // another window: bring it to the front too, the way a person would
        if (t.windowId !== curWin) await Ext.windows.update(t.windowId, { focused: true }).catch(() => {})
        await Ext.tabs.update(t.id, { active: true })
        // A tab still loading — or a popup still on about:blank whose site
        // sets the location a beat later — is not ready for a finder: the
        // first uiv.$ after the switch ran against the vanishing blank
        // document and burned its whole wait (OPEN-ISSUES 17.9). Let the
        // load finish first, bounded, with the usual countdown.
        let settled = t
        const deadline = Date.now() + 10000
        try {
          while (Date.now() < deadline) {
            if (stopRequested) return { ok: false, error: 'Script stopped' }
            const now = await Ext.tabs.get(t.id).catch(() => null)
            if (!now) break
            settled = now
            const blank = /^about:blank$/i.test(now.url || '') && !now.pendingUrl
            if (now.status === 'complete' && !blank) break
            emit('wait', { label: 'tabs.select — page loading', remainingS: Math.ceil((deadline - Date.now()) / 1000) })
            await delayMs(150)
          }
        } finally {
          emit('wait', null)
        }
        scriptTabId = t.id
        store.dispatch(act.addLog('info', `script tab → ${tag(t)} "${(settled.title || settled.url || '').slice(0, 50)}"${f.how ? ' — ' + f.how : ''}`))
        return asValue(info(settled, t.id))
      }

      if (op === 'tabsOpen') {
        // a NEW tab on the url — uiv.goto navigates the CURRENT tab instead
        const t = await Ext.tabs.create(cur ? { url: args.url, windowId: cur.windowId } : { url: args.url })
        const deadline = Date.now() + 30000
        let loaded = t
        try {
          while (Date.now() < deadline) {
            if (stopRequested) return { ok: false, error: 'Script stopped' }
            const now = await Ext.tabs.get(t.id).catch(() => null)
            if (!now) return { ok: false, error: 'uiv.tabs.open: the new tab was closed before it finished loading' }
            loaded = now
            // "complete" on about:blank is Firefox's freshly created tab
            // BEFORE it navigates to the url — not the page (see tabsSelect)
            const stillBlank = /^about:blank$/i.test(now.url || '') && !/^about:blank$/i.test(String(args.url || ''))
            if (now.status === 'complete' && !stillBlank) break
            // same status-bar countdown the other page loads show
            emit('wait', { label: 'tabs.open — page loading', remainingS: Math.ceil((deadline - Date.now()) / 1000) })
            await delayMs(200)
          }
        } finally {
          emit('wait', null)
        }
        scriptTabId = t.id
        store.dispatch(act.addLog('info', `script tab → #${(loaded.index || 0) + 1} (new) "${(loaded.title || loaded.url || '').slice(0, 50)}"`))
        return asValue(info(loaded, t.id))
      }

      // tabsClose: no argument closes the CURRENT tab and lands on the
      // active tab of the same window (never another window's — 21.1); an
      // argument (number / entry / matcher) closes THAT tab and stays put
      let victim = cur
      let other = false
      if (args && (typeof args.index === 'number' || args.url != null || args.title != null || args.newest)) {
        const f = await findTab(args, 'uiv.tabs.close')
        if (f.error) return { ok: false, error: f.error }
        victim = f.tab
        other = !!(cur && victim.id !== cur.id)
      }
      if (!victim) return { ok: false, error: 'uiv.tabs.close: no current tab to close' }
      await Ext.tabs.remove(victim.id).catch(() => {})
      if (other) {
        store.dispatch(act.addLog('info', `closed tab ${tag(victim)} "${(victim.title || victim.url || '').slice(0, 50)}" — the script stays on its tab`))
        return asValue(info(cur, cur.id))
      }
      scriptTabId = null
      let next = (await Ext.tabs.query({ windowId: curWin, active: true }).catch(() => []))[0]
      if (isWebTab(next)) scriptTabId = next.id
      else next = await getTargetTab()
      if (!next) return asValue(null)
      store.dispatch(act.addLog('info', `script tab → ${tag(next)} "${(next.title || next.url || '').slice(0, 50)}" (previous tab closed)`))
      return asValue(info(next, next.id))
    }

    // Resize the browser window so the PAGE VIEWPORT reaches the given size —
    // the JS form of the classic resize/setWindowSize commands, same bg
    // plumbing (PANEL_RESIZE_PLAY_TAB → resizeViewportOfTab). Returns the
    // achieved viewport, because a screen smaller than the request clamps it
    // and the macro should get to check what it actually runs in.
    case 'windowResize': {
      const tab = await getTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
      await restoreRunTabStateFor(tab) // bg resolves the window from toPlay
      const r = await csIpc.ask('PANEL_RESIZE_PLAY_TAB', {
        viewportSize: { width: args.width, height: args.height },
        screenAvailableRect: {
          x: window.screen.availLeft,
          y: window.screen.availTop,
          width: window.screen.availWidth,
          height: window.screen.availHeight
        }
      })
      const actual = (r && r.actual) || { width: args.width, height: args.height }
      if (r && r.diff && r.diff.length) {
        store.dispatch(act.addLog('warning', `W367: only able to resize the viewport to ${actual.width}x${actual.height}, asked for ${args.width}x${args.height} (screen limit)`))
      }
      return asValue({ width: actual.width, height: actual.height })
    }

    case 'windowRect': {
      // NO tab requirement up front: a desktop-only macro legitimately runs
      // with nothing but browser-internal pages open (chrome://dino, the
      // panel itself), and the native host answers the rect without one.
      // Only the beacon fallback further down needs a web page.
      const api = getNativeXYAPI()
      const scaling = await api.getScalingFactor().catch(() => window.devicePixelRatio || 1)
      // Viewport size comes from the TABS api, which needs no content
      // script and therefore also answers on browser-internal pages
      // (chrome://dino). It is the size uiv.window.resize takes, so a macro
      // can change ONE axis and hand the other one straight back.
      const vpSize = await csIpc.ask('PANEL_GET_WINDOW_SIZE_OF_PLAY_TAB').catch(() => null)
      const viewport = vpSize && vpSize.viewport && vpSize.viewport.width > 0
        ? { width: vpSize.viewport.width, height: vpSize.viewport.height }
        : null

      // 1st choice: the host knows the outer rect (X11, Windows, macOS) —
      // physical pixels, converted to CSS-screen via the scaling factor.
      try {
        const hostRect = await api.getActiveBrowserOuterRect()
        if (hostRect && hostRect.width > 0) {
          return asValue({
            x: Math.round(hostRect.x / scaling),
            y: Math.round(hostRect.y / scaling),
            width: Math.round(hostRect.width / scaling),
            height: Math.round(hostRect.height / scaling),
            source: 'host',
            viewport: viewport
          })
        }
      } catch (e) { /* wayland: rect is null by design — measure instead */ }

      // The beacon fallback below DOES need the page's own numbers; the
      // host path above does not, and demanding them first made the whole
      // call fail on exactly the browser-internal pages where the host
      // answer is the only one available anyway.
      const tab = await getTargetTab()
      if (!tab) return { ok: false, error: 'uiv.window.rect: the native host could not locate the browser window, and the fallback measurement needs a normal web page (only browser-internal pages are open) — is the Desktop Automation host installed and the browser window on screen?' }
      const dims = await probePage(
        function () { return { ow: window.outerWidth, oh: window.outerHeight, iw: window.innerWidth, ih: window.innerHeight, sx: window.screenX, sy: window.screenY } },
        [],
        'return { ow: window.outerWidth, oh: window.outerHeight, iw: window.innerWidth, ih: window.innerHeight, sx: window.screenX, sy: window.screenY }',
        '__uiv_windims')
      const d = dims.ok ? dims.value : null
      if (!d) return { ok: false, error: 'uiv.window.rect: could not read window dimensions from the page' }

      // Wayland: measure the viewport origin with a beacon (the compositor
      // hides window positions from everyone, including the browser itself —
      // screenX above reads 0). The window's top chrome height comes from
      // outer-inner, all of it above the viewport (CSD Chrome).
      const BEACON = '#fe3a9c'
      try {
        // right-anchored beacon (the left half of a window is the part most
        // often covered by another app). top:12px, not 0: the browser paints
        // a ~7px translucent toolbar shadow over the very top of the page,
        // which eats the beacon's first rows in the capture (measured as a
        // constant +6.4px y bias). The beacon reports its own
        // getBoundingClientRect so the origin math needs NO innerWidth
        // arithmetic — a classic scrollbar between 'right:0' and the
        // innerWidth edge measured as a constant 15px x error.
        const inject =
          "var b = document.createElement('div');" +
          "b.id = '__uiv_origin_beacon';" +
          "b.style.cssText = 'position:fixed;right:0;top:12px;width:140px;height:36px;background:" + BEACON + ";z-index:2147483647;margin:0;padding:0;border:0';" +
          "document.documentElement.appendChild(b);" +
          "var r = b.getBoundingClientRect();" +
          "return { bx: r.left, by: r.top }"
        const r = await probePage(
          function (color) {
            var b = document.createElement('div')
            b.id = '__uiv_origin_beacon'
            b.style.cssText = 'position:fixed;right:0;top:12px;width:140px;height:36px;background:' + color + ';z-index:2147483647;margin:0;padding:0;border:0'
            document.documentElement.appendChild(b)
            var rr = b.getBoundingClientRect()
            return { bx: rr.left, by: rr.top }
          },
          [BEACON], inject, '__uiv_origin_b')
        if (!r.ok) return { ok: false, error: 'uiv.window.rect: could not inject the measuring beacon' }
        const beaconPos = r.value || { bx: 0, by: 12 }
        await delayMs(300)
        const found = await findBeaconRect(api, BEACON)
        if (!found || !(found.width > 0)) {
          return { ok: false, error: 'uiv.window.rect: the measuring beacon was not visible on screen — is the browser window covered or on another display?' }
        }
        const vx = found.x / scaling - (Number(beaconPos.bx) || 0)
        const vy = found.y / scaling - (Number(beaconPos.by) || 0)
        const chromeH = d.oh - d.ih
        return asValue({
          x: Math.round(vx),
          y: Math.round(vy - chromeH),
          width: d.ow,
          height: d.oh,
          source: 'beacon',
          viewport: viewport || { width: d.iw, height: d.ih }
        })
      } finally {
        try {
          await probePage(
            function () { var b = document.getElementById('__uiv_origin_beacon'); if (b) b.remove(); return true },
            [],
            "var b = document.getElementById('__uiv_origin_beacon'); if (b) b.remove(); return true",
            '__uiv_origin_rm')
        } catch (e) { /* page may have navigated */ }
      }
    }

    // Window focus, both directions. Unlike windowResize these need NO tab:
    // they are one IPC ask to the panel, which is the whole point — they are
    // the first line of a desktop macro, run before any page exists. (The
    // classic bringBrowserToForeground is tab-free in runOneCommand for the
    // same reason; these go straight to the panel and skip it entirely.)
    // Bring the browser to the front — and CONFIRM it actually came, because
    // everything a desktop macro does next lands on whatever window is really
    // in front. windows.update({focused:true}) raises the window inside the
    // browser, but it does not always raise the BROWSER above another
    // application: macOS restricts that, and on any platform the user clicking
    // elsewhere takes focus straight back.
    //
    // Unconfirmed, that failure is silent and dangerous. Measured on macOS with
    // a chat window in front: OpenBrowserDevTools called focus, believed it,
    // and typed  document.title = 'Hello from Ui.Vision'  into the CHAT, which
    // sent it as a message. A macro that types into an unknown application can
    // hit an editor, a terminal or a message box, and the run log will only
    // ever say the command "never reached the page".
    //
    // document.hasFocus() in the play tab is the honest check: it is false
    // whenever the browser is not the active application. Retry the activation
    // a few times (focus can take a moment, and a transient steal is worth one
    // more attempt), then FAIL LOUDLY rather than let the keystrokes escape.
    case 'windowFocus': {
      const vars = getVarsInstance()
      const deadline = Date.now() + 3000
      let attempt = 0
      let triedOsActivate = false

      // macOS ONLY: when the browser is not the active application, no
      // extension API can raise it — the OS reserves app activation. The
      // FileAccess XModule can, though, because `open -b <bundle-id>` is
      // exactly the supported way to activate an app, so try that once before
      // giving up. Bundle ids are tried in order per browser family (release,
      // dev/beta, nightly/canary); `open -b` exits non-zero on an id that is
      // not installed, so the wrong ones simply fall through. Silently skipped
      // when the XModule is absent — the caller still gets the honest error.
      const osActivateOnMac = async () => {
        if (triedOsActivate || !isMacOS()) return
        triedOsActivate = true

        const browser = String(getVarsInstance().get('!BROWSER') || '').toLowerCase()
        const ids = /chrome/.test(browser)
          ? ['com.google.Chrome', 'com.google.Chrome.beta', 'com.google.Chrome.canary']
          : /edge/.test(browser)
            ? ['com.microsoft.edgemac', 'com.microsoft.edgemac.Beta']
            : ['org.mozilla.firefox', 'org.mozilla.firefoxdeveloperedition', 'org.mozilla.nightly']

        for (const id of ids) {
          try {
            const res = await getNativeFileSystemAPI().runProcess({
              fileName: '/usr/bin/open',
              arguments: `-b ${id}`,
              waitForExit: true
            })
            if (res && res.exitCode === 0) {
              await delayMs(400)
              return true
            }
          } catch (e) {
            return false // XModule not installed / not reachable — nothing more to try
          }
        }
        return false
      }

      // Windows analog of the mac `open -b` assist. The foreground lock
      // lets no extension API raise the browser above the app the user is
      // working in — windows.update({focused:true}) only flashes the
      // taskbar entry (measured live: XType keystrokes went into a chat
      // app). The HOST process may take the foreground through the OS's
      // documented escape hatches, and it knows which browser instance
      // launched it — focus_browser raises that window and answers with
      // GetForegroundWindow's verdict. That verdict, not hasFocus(), is
      // the authority on Windows: Firefox answers document.hasFocus()
      // TRUE in the play tab while another application is foreground
      // (measured live — the old guard declared success and the
      // keystrokes went into a chat window).
      //   'focused'     the browser window IS foreground now
      //   'denied'      host answered, could not front it — hasFocus must
      //                 not overrule this, it may be lying
      //   'unavailable' no host / pre-2.0.5 — fall back to hasFocus
      let hostFocusBroken = false
      const hostFocusWindows = async () => {
        if (hostFocusBroken || !isWindowsOS()) return 'unavailable'
        try {
          const r = await getXModule2API().invoke('focus_browser')
          if (r && r.focused === true) {
            await delayMs(200) // let the activation settle
            return 'focused'
          }
          return 'denied'
        } catch (e) {
          hostFocusBroken = true // absent or old host — do not ask again
          return 'unavailable'
        }
      }

      // Wayland analog of the mac `open -b` assist. The compositor refuses
      // focus-stealing from background apps, and the browser's window rect
      // is hidden by design — but a REAL click through the RemoteDesktop
      // portal focuses whatever it lands on. So the page renders a solid
      // beacon in an exotic color, the host's find_rectangle (exact-color
      // scan, no pattern files) locates it on screen, and one desktop click
      // on the beacon brings the browser to the front legitimately.
      let triedSelfClick = false
      const selfClickActivateLinux = async () => {
        if (triedSelfClick || !isLinuxOS()) return false
        triedSelfClick = true
        const BEACON = '#3afe9c'
        try {
          const inject =
            "var b = document.createElement('div');" +
            "b.id = '__uiv_focus_beacon';" +
            "b.style.cssText = 'position:fixed;right:8px;top:8px;width:180px;height:48px;background:" + BEACON + ";z-index:2147483647';" +
            "document.documentElement.appendChild(b);" +
            "return true"
          const r = await probePage(
            function (color) {
              var b = document.createElement('div')
              b.id = '__uiv_focus_beacon'
              b.style.cssText = 'position:fixed;right:8px;top:8px;width:180px;height:48px;background:' + color + ';z-index:2147483647'
              document.documentElement.appendChild(b)
              return true
            },
            [BEACON], inject, '__uiv_beacon')
          if (!r.ok) return false
          await delayMs(300) // paint + capture pipeline
          const api = getNativeXYAPI()
          const rect = await findBeaconRect(api, BEACON)
          if (!rect || !(rect.width > 0)) return false
          // find_rectangle reports PHYSICAL pixels; sendDesktopMouseEvent
          // multiplies logical by the scaling factor — divide first.
          const dpr = window.devicePixelRatio || 1
          await api.sendDesktopMouseEvent({
            type: 3 /* click */, button: 0 /* left */,
            x: Math.round((rect.x + rect.width / 2) / dpr),
            y: Math.round((rect.y + rect.height / 2) / dpr)
          })
          await delayMs(300)
          return true
        } catch (e) {
          return false
        } finally {
          try {
            await probePage(
              function () { var b = document.getElementById('__uiv_focus_beacon'); if (b) b.remove(); return true },
              [],
              "var b = document.getElementById('__uiv_focus_beacon'); if (b) b.remove(); return true",
              '__uiv_beacon_rm')
          } catch (e) { /* page may have navigated — beacon went with it */ }
        }
      }

      for (;;) {
        await bringScriptWindowForward()
        attempt++

        // Windows first, and BEFORE the document checks: the host raises the
        // window and reports GetForegroundWindow's verdict — the OS's own
        // answer to the question the documents can only guess at.
        const hostSays = await hostFocusWindows()
        if (hostSays === 'focused') {
          // The native helper activates the browser process. Re-select our
          // window/tab after that assist if the process has several windows.
          await bringScriptWindowForward()
          return asValue(undefined)
        }

        // Ask BOTH documents. The question is "is the browser the active
        // application", and either surface answering yes settles it — but
        // neither answers it alone. The side panel runs this code, and while
        // IT holds the keyboard focus the play tab's hasFocus() is false even
        // with the browser frontmost; that false negative failed every
        // panel-driving demo (ClearSidebarLogViaGUI_*, which click the panel
        // itself) while OpenBrowserDevTools, whose focus sits in the page,
        // passed in the same run. When another APPLICATION is in front, both
        // are false — which is the case this guard exists for.
        // Skipped when the host just said 'denied': the OS stated another
        // app holds the foreground, and on Firefox hasFocus() answers true
        // regardless (measured live) — a yes here would be that lie.
        if (hostSays !== 'denied') {
          if (document.hasFocus()) return asValue(undefined)

          const r = await probePage(function () { return document.hasFocus() }, [], 'return document.hasFocus()', '__uiv_focus')
          if (r.ok && r.value === true) return asValue(undefined)
        }

        // One OS-level attempt, after the cheap path has visibly failed. A
        // zero exit from `open -b` means macOS ACTIVATED the app, and that is
        // a stronger answer than hasFocus() can give: focus may legitimately
        // sit somewhere neither document can see — DevTools being the case
        // that bit here, where the browser is plainly frontmost (its console
        // had just accepted typed input) yet page and panel both report false.
        // Accept the OS's word for it.
        if (attempt >= 2 && await osActivateOnMac()) return asValue(undefined)

        // Linux/Wayland: one self-click attempt, then loop back so
        // hasFocus() confirms the click actually moved focus to us.
        if (attempt >= 2) await selfClickActivateLinux()

        if (Date.now() >= deadline) {
          return {
            ok: false,
            error: `uiv.window.focus(): the browser did not come to the front after ${attempt} attempts — another application still has it. ` +
              `Real OS input (uiv.desktop.mouse.click / .type, XClick / XType) goes to the FOCUSED window, so continuing would send clicks and keystrokes into that other application instead of the browser. ` +
              `Click the browser window once and re-run, and keep it uncovered while a desktop macro runs. ` +
              // WHY it could not be raised differs by platform, and the wrong
              // explanation sends the user looking in the wrong place. macOS
              // reserves app activation outright; Windows and Linux let only
              // the current foreground app hand focus over, so the request
              // flashes the taskbar entry instead of raising the window.
              (isMacOS()
                ? `(On macOS an extension cannot always raise the browser above another app — the operating system reserves that.)`
                : `(An application that is not in the foreground cannot take focus for itself — the request only flashes the browser's taskbar entry.)`)
          }
        }

        await delayMs(250)
      }
    }

    case 'windowMinimize': {
      await csIpc.ask('PANEL_MINIMIZE_ALL_WINDOWS')
      return asValue(undefined)
    }

    // storage -> the browser's Downloads folder, whatever the file is
    case 'exportToDownloads': {
      // 'log' is rendered from log state, not read from a store — it has no
      // name to resolve, so it goes straight through
      if (/^log$/i.test(String(args.name || '').trim())) {
        const r = await runOneCommand('localStorageExport', args.name, '')
        return r.ok ? asValue(args.name) : r
      }

      // Resolve here rather than leaving it to the classic command, so an
      // ambiguous .png gets the same "say which tab" error the other verbs
      // give, and {store} is honoured. The resolved tab rides along in the
      // command's own fields — no classic-syntax token for it to get wrong.
      const { fileName, fileStore, missingFrom } = await resolveStoredFile(args.name, 'uiv.files.exportToDownloads', false, args.store)
      if (!(await fileStore.get().exists(fileName))) {
        const where = missingFrom ? ` (looked in ${missingFrom.map(s => s.label).join(' and ')})` : ''
        throw new Error(`uiv.files.exportToDownloads: '${fileName}' does not exist${where} — uiv.files.list() shows what is there, uiv.files.exists('${fileName}') tests without throwing`)
      }

      const r = await runOneCommand('localStorageExport', fileName, '', { uivStore: fileStore.id })
      return r.ok ? asValue(fileName) : r
    }

    // --- OS clipboard ------------------------------------------------------
    // uiv.getVar('!CLIPBOARD') / uiv.setVar('!CLIPBOARD', ...) route here so a
    // script always talks to the REAL clipboard — the variable-pool copy is
    // stale in a script (only classic commands that name !clipboard refresh it)
    case 'clipboardRead': {
      const text = await clipboard.get()
      if (text === undefined) {
        return { ok: false, error: "getVar: the browser denied reading the OS clipboard (no readable text on it, or clipboard access blocked)" }
      }
      getVarsInstance().set({ '!CLIPBOARD': text })   // keep the classic pool in sync
      return asValue(text)
    }

    case 'clipboardWrite': {
      const text = String(args.text === undefined || args.text === null ? '' : args.text)
      await clipboard.set(text)
      getVarsInstance().set({ '!CLIPBOARD': text })
      return asValue(undefined)
    }

    // --- uiv.download ------------------------------------------------------
    // Arm the background download manager (rename + completion tracking for
    // the NEXT download), start the download, wait, return the on-disk name.
    // 'downloadArm'/'downloadWait' are the two-phase thunk form: arm, let the
    // script run its own trigger (a click), then wait — the same contract the
    // classic onDownload + click pair has, minus the hidden state.
    // uiv.screenshot — viewport capture, optionally cropped to an element or
    // area, saved under Shots and (with 'as') exported (OPEN-ISSUES 24.3)
    case 'screenshot': {
      const tab = await getTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
      const stem = String(args.as || args.name || 'screenshot').replace(/\.png$/i, '').replace(/[\\/:*?"<>|]/g, '_')
      const fileName = stem + '.png'
      let rect = null
      let note = ''
      const foreignNote = 'the element sits in a cross-origin frame whose position on the page is unknown here — kept the whole viewport instead of cropping'
      if (args.locator) {
        const r = await elementSearchOnce(tab, { locator: String(args.locator) })
        const m = r.matches && r.matches[0]
        if (!m) return { ok: false, error: `uiv.screenshot: nothing matches '${args.locator}'${r.hiddenCount ? ` (${r.hiddenCount} hidden match(es) exist)` : ''}` }
        if (m.frameLocal) note = foreignNote
        else rect = m.rect
      } else if (args.rect) {
        if (args.frameLocal) note = foreignNote
        else rect = args.rect
      } else if (args.area) {
        rect = { left: args.area.x, top: args.area.y, width: args.area.width, height: args.area.height }
      }
      const cap = await runOneCommand('captureScreenshot', fileName, '')
      if (!cap.ok) return cap
      let cropped = false
      if (rect) {
        try {
          const buf = await getFileBufferFromScreenshotStorage(fileName)
          if (!buf) throw new Error('capture not found in Shots')
          const { Jimp } = await import('jimp')
          const img = await Jimp.read(buf)
          const W = img.bitmap.width
          const H = img.bitmap.height
          // the stored capture is in PHYSICAL px (1683 wide for a 1347 px CSS
          // viewport at 125%), finder rects are CSS px — scale by the ratio of
          // the capture width to the document's client width
          let scale = 1
          try {
            const hr = await elementSearchOnce(tab, { locator: 'css=html' })
            const cw = hr.matches && hr.matches[0] && hr.matches[0].rect && hr.matches[0].rect.width
            if (cw > 0) scale = W / cw
          } catch (e) { /* keep 1 */ }
          const x = Math.max(0, Math.round(rect.left * scale))
          const y = Math.max(0, Math.round(rect.top * scale))
          const w = Math.min(W - x, Math.round(rect.width * scale))
          const h = Math.min(H - y, Math.round(rect.height * scale))
          if (w < 2 || h < 2) {
            note = `the region ${Math.round(rect.left)},${Math.round(rect.top)} ${Math.round(rect.width)}x${Math.round(rect.height)} lies outside the ${W}x${H} viewport capture — kept the whole capture (scroll the element into view first)`
          } else {
            img.crop({ x, y, w, h })
            const out = await img.getBuffer('image/png')
            await getStorageManager().getScreenshotStorage().overwrite(fileName, new Blob([out], { type: 'image/png' }))
            cropped = true
          }
        } catch (e) {
          note = 'crop failed (' + ((e && e.message) || e) + ') — kept the whole capture'
        }
      }
      let exported = ''
      if (args.as) {
        const ex = await runOneCommand('localStorageExport', fileName, '')
        if (!ex.ok) return ex
        exported = fileName
      }
      if (note) store.dispatch(act.addLog('warning', 'uiv.screenshot: ' + note))
      return asValue({ name: fileName, exported, cropped })
    }

    case 'download':
    case 'downloadArm': {
      const vars = getVarsInstance()
      const wait = args.wait !== false
      const timeoutS = args.timeout != null ? parseFloat(args.timeout) : (parseFloat(vars.get('!TIMEOUT_DOWNLOAD')) || 60)
      const startS = parseFloat(vars.get('!TIMEOUT_WAIT')) || 10
      armShape = await pageShape()
      await csIpc.ask('PANEL_ON_DOWNLOAD', {
        fileName: args.as || '',
        wait,
        timeout: timeoutS * 1000,
        timeoutForStart: startS * 1000
      })
      // a name left over from an earlier download must not read as this one's
      vars.set({ '!LAST_DOWNLOADED_FILE_NAME': '' }, true)
      downloadArmed = true
      downloadTrigger = ''
      if (op === 'downloadArm') return asValue(undefined)

      // a URL/locator form that fails BEFORE any download starts (element not
      // found, downloads.download refused) must release the arm, or the
      // script's next uiv.download is refused with "only one not-created
      // download allowed at a time" (OPEN-ISSUES 19.3)
      const disarm = async () => {
        downloadArmed = false
        await csIpc.ask('PANEL_CANCEL_PENDING_DOWNLOAD', { reason: 'uiv.download: nothing started' }).catch(() => {})
      }
      if (args.url) {
        // the URL form fetching the SAME URL a third time in one run is a
        // loop gone wrong (Amazon: the "next page" that never came, 28
        // copies of four invoices) — refuse, the warning came on the 2nd
        const seen = (urlDownloadsThisRun.get(String(args.url)) || 0) + 1
        urlDownloadsThisRun.set(String(args.url), seen)
        if (seen >= 3) {
          await disarm()
          return { ok: false, error: `uiv.download: this URL has already been downloaded ${seen - 1} times in this run — refusing the ${seen}${seen === 3 ? 'rd' : 'th'} copy. A loop is fetching the same link; if it pages through a list, the page did not change (check that the first row differs before downloading again).` }
        }
        // plain URL: straight to chrome.downloads in the background
        try {
          await csIpc.ask('PANEL_DOWNLOAD_URL', { url: String(args.url) })
        } catch (e) {
          await disarm()
          throw e
        }
      } else {
        // locator: the classic saveItem does the element resolution (all
        // frames) and href/src extraction — proven plumbing, reused as is
        const r = await runOneCommand('saveItem', args.locator, '')
        if (!r.ok) { await disarm(); return r }
      }
      return waitForArmedDownload(wait, timeoutS, args.as)
    }

    case 'downloadWait': {
      const vars = getVarsInstance()
      const timeoutS = args.timeout != null ? parseFloat(args.timeout) : (parseFloat(vars.get('!TIMEOUT_DOWNLOAD')) || 60)
      return waitForArmedDownload(args.wait !== false, timeoutS, args.as)
    }

    // the trigger threw: drop the armed-but-not-started download so the
    // script's next uiv.download is not refused with "only one not-created
    // download allowed at a time"
    case 'downloadDisarm': {
      downloadArmed = false
      await csIpc.ask('PANEL_CANCEL_PENDING_DOWNLOAD', { reason: args.reason ? String(args.reason) : '' })
      return asValue(undefined)
    }

    // --- the model ---------------------------------------------------------
    case 'aiAsk': {
      const images = Array.isArray(args.images) ? args.images : (args.images ? [args.images] : [])
      const ask = (prompt) => runAiCommand('aiPrompt', images.concat([prompt]).join('#')) // aiPrompt's target is "img1#img2#the prompt"

      if (!args.json) {
        return asValue(await ask(args.prompt))
      }

      // {json: true}: the model is told to answer machine-readably, and the
      // reply is PARSED here so the script gets a value, not prose to regex.
      // One corrective retry — a second identical ask rarely helps, but a
      // "that was not valid JSON" correction usually does.
      const jsonPrompt = String(args.prompt) +
        '\n\nRespond with ONLY valid JSON (a single object or array). No prose, no explanation, no markdown fences.'
      const first = await ask(jsonPrompt)
      try {
        return asValue(parseJsonReply(first))
      } catch (e) {
        store.dispatch(act.addLog('warning', `uiv.ai.ask: reply was not valid JSON (${e.message}) — asking once more with a correction`))
        const second = await ask(jsonPrompt + `\n\nYour previous reply was not valid JSON (parse error: ${e.message}). Reply again with ONLY the corrected JSON.`)
        try {
          return asValue(parseJsonReply(second))
        } catch (e2) {
          return { ok: false, error: `uiv.ai.ask({json: true}): the model did not return valid JSON, even after a retry (${e2.message}). Reply started: "${String(second).slice(0, 200)}"` }
        }
      }
    }

    case 'aiFind': {
      const vars = getVarsInstance()
      // {scope: 'desktop'} per call — the aiScreenXY command reads !CVSCOPE to
      // decide what it screenshots, and without this option the only way to a
      // desktop-scope ai.find was the sticky global XDesktopAutomation toggle
      // (hidden state, the anti-pattern the per-call options exist to avoid).
      // Set the scope for THIS call and restore the previous one afterwards.
      const wantScope = args.scope === 'desktop' ? 'desktop' : (args.scope === 'browser' ? 'browser' : null)
      const prevScope = wantScope ? vars.get('!CVSCOPE') : null
      if (wantScope) {
        vars.set({ '!CVSCOPE': wantScope }, true)
        rememberScriptScopeOverride('!CVSCOPE', wantScope)
      }
      try {
        // withBannerHidden, for the same reason imageSearch and textSearch use
        // it: ai.find is a capture-based finder, so a banner left up lands in
        // the screenshot the MODEL is shown. Worse here than for OCR — the
        // banner is a block of prose in the middle of the image, competing for
        // the model's attention with the thing it was asked to locate.
        await withBannerHidden(() => runAiCommand('aiScreenXY', args.question))
      } finally {
        if (wantScope) {
          vars.set({ '!CVSCOPE': prevScope }, true)
          rememberScriptScopeOverride('!CVSCOPE', prevScope)
        }
      }
      const x = Number(vars.get('!AI1'))
      const y = Number(vars.get('!AI2'))
      if (!isFinite(x) || !isFinite(y)) {
        return { ok: false, error: `uiv.ai.find: the model did not return usable coordinates for '${args.question}' — it could not tell where that is on the screenshot. Describe the target by what it LOOKS like and where it sits ('the blue Accept all button at the bottom of the cookie bar'), and make sure it is actually visible in the viewport (ai.find does NOT auto-wait — wait for the page with uiv.$ first). If it stays unreliable, use a real finder instead: uiv.$ for anything in the DOM, uiv.ocr.findText for rendered text, or save_element_image + uiv.findImage for a fixed graphic` }
      }
      // a real match object, so it composes with uiv.browser.* / uiv.desktop.*
      // and the scope guard catches a desktop point used in the browser tier.
      // A per-call scope wins; otherwise the global CV scope tags the match.
      const scope = wantScope || (/desktop/i.test(String(vars.get('!CVSCOPE') || '')) ? 'desktop' : 'browser')
      // trail: an ai.find point that lands off-target is invisible until the
      // click that uses it — mark WHERE the model pointed, tagged as such
      recordPointTrail({ kind: 'ai', x: Math.round(x), y: Math.round(y), scope, label: String(args.question || '').slice(0, 60) })
      return asValue({ x: Math.round(x), y: Math.round(y), scope })
    }

    case 'aiComputerUse': {
      const value = await runAiCommand('aiComputerUse', args.task)
      return asValue(value)
    }

    // fire-and-forget provenance ping from the uiv.offset polyfill: anchor
    // point -> derived landing point, so the post-run picture can draw the
    // step. Never fails, never blocks anything meaningful.
    case 'offsetTrace': {
      const ax = Number(args.ax)
      const ay = Number(args.ay)
      const x = Number(args.x)
      const y = Number(args.y)
      if ([ax, ay, x, y].every(isFinite)) {
        recordPointTrail({ kind: 'offset', ax: Math.round(ax), ay: Math.round(ay), x: Math.round(x), y: Math.round(y), scope: args.scope === 'desktop' ? 'desktop' : 'browser' })
      }
      return asValue(undefined)
    }

    // OCR proper — the reader. textSearch answers "where is X"; this answers
    // "what does this say", which nothing else in the API can do.
    case 'ocrRead':
      return asValue(await ocrReadText(args))

    case 'csvRead':
      return asValue(await csvReadRows(args.file))

    case 'csvWrite': {
      const rows = assertRows(args.rows, 'uiv.csv.write')
      return asValue(await csvWriteRows(args.file, rows))
    }

    // read + concat + write. Doing it in one op is the point: every logging
    // macro otherwise reinvents it, and two scripts appending at once would
    // interleave a read-modify-write done in script code.
    case 'csvAppend': {
      const rows = assertRows(args.rows, 'uiv.csv.append')
      const fileName = csvFileName(args.file)
      const existing = (await getCsvStorage().exists(fileName)) ? await csvReadRows(fileName) : []
      return asValue(await csvWriteRows(fileName, existing.concat(rows)))
    }

    case 'csvExists':
      return asValue(await getCsvStorage().exists(csvFileName(args.file)))

    case 'csvList': {
      // storage entries carry `name` (see Entry in standard_storage.ts) — the
      // old `f.fileName` read a property that never existed, so csv.list()
      // returned a list of empty strings
      const files = await getCsvStorage().list()
      return asValue((files || []).map(f => f.name).filter(Boolean))
    }

    // --- the file store: the verbs that take a name, whatever the file is ---
    case 'filesList': {
      // every store, one flat list of FILE names — folders are entries too
      // (Entry carries isDirectory), and a folder is not something the other
      // uiv.files verbs can act on. {store} narrows it to one tab.
      const stores = args.store ? [storeById(args.store, 'uiv.files.list')] : FILE_STORES
      const lists = await Promise.all(stores.map(s => s.get().list()))
      const names = lists.reduce((all, files) => {
        return all.concat((files || []).filter(f => !f.isDirectory).map(f => f.name))
      }, [])
      // the same .png name can sit in Screenshots AND Vision; list() answers
      // "which names are stored", so it reports such a name once
      return asValue(names.filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).sort())
    }

    case 'filesExists': {
      const hit = await resolveStoredFile(args.name, 'uiv.files.exists', true, args.store)
      return asValue(hit ? await hit.fileStore.get().exists(hit.fileName) : false)
    }

    case 'filesRemove': {
      const { fileName, fileStore, missingFrom } = await resolveStoredFile(args.name, 'uiv.files.remove', false, args.store)
      if (!(await fileStore.get().exists(fileName))) {
        const where = missingFrom ? ` (looked in ${missingFrom.map(s => s.label).join(' and ')})` : ''
        throw new Error(`uiv.files.remove: '${fileName}' does not exist${where} — uiv.files.list() shows what is there, uiv.files.exists('${fileName}') tests without throwing`)
      }
      // awaited, unlike the classic #DeleteAfterExport, which fires the remove
      // and returns: a script that deletes a file and asks for it on the next
      // line must not still find it
      await fileStore.get().remove(fileName)
      store.dispatch(fileStore.refresh())
      return asValue(fileName)
    }

    // raw text over the same store — see textFileName for the name rules
    case 'textRead':
      return asValue(await textReadRaw(args.file))

    case 'textWrite': {
      const fn = await textWriteRaw(args.file, args.text)
      // it is NOT a disk file — say where it went and how to get it out (30.16)
      store.dispatch(act.addLog('info', `uiv.text.write: "${fn}" saved in the extension's CSV/Text store (Ui.Vision panel → CSV/TXT tab), not in the download folder — uiv.files.exportToDownloads('${fn}') writes it there`))
      return asValue(fn)
    }

    default:
      return { ok: false, error: `unknown uiv bridge op '${op}'` }
  }
}

// ---------------------------------------------------------------------------
// finder: textSearch — OCR over the current viewport (the same chain
// XClickText uses: getOcrResponse → searchTextInOCRResponse → ocrMatchRect).
// Word matching supports ? / * wildcards per word, case-insensitive.
// ---------------------------------------------------------------------------

async function textSearchOnce (args) {
  // Resolved before the guard: {engine: 'xmodule'} needs no OCR.Space account,
  // so the "OCR disabled" guard must see which reader this call asked for.
  const engineAsked = resolveOcrEngine(args.engine, 'uiv.ocr.findText')
  guardOcrSettings({ store, engine: engineAsked })

  const state = store.getState()
  const engine = engineAsked !== undefined ? engineAsked : state.config.ocrEngine
  const lang = String(args.language || state.config.ocrLanguage || 'eng').toLowerCase()

  if (args.image) {
    // {image: 'x.png'} searches a STORED IMAGE instead of the live viewport /
    // screen — same source rules as uiv.ocr.read({image}), so the reader and
    // the finder stay symmetric. Matches come back in IMAGE pixels tagged
    // scope 'image' — not clickable in either tier (the scope guard says so
    // loudly) — and {area} crops in image pixels too.
    const rect = normalizeRectArg(args.area, 'uiv.ocr.findText')
    const name = String(args.image)
    const resolved = await resolveStoredFile(/\.png$/i.test(name) ? name : `${name}.png`, 'uiv.ocr.findText', false, args.store)
    if (resolved.missingFrom) {
      throw new Error(`uiv.ocr.findText: image '${resolved.fileName}' is not stored — looked in ${resolved.missingFrom.map(s => s.label).join(' and ')}. uiv.shot.viewport/page/element/desktop capture one; uiv.files.list() shows what exists`)
    }
    const stored = await resolved.fileStore.get().read(resolved.fileName, 'DataURL')
    const imageDataUrl = rect ? await subImage(stored, rect) : stored
    const { response } = await getOcrResponse({
      ocrApiTimeout: config.ocr.apiTimeout,
      store,
      lang,
      engine,
      engineExplicit: engineAsked !== undefined,
      scale: 'true',
      isTable: false,
      isDesktop: false,
      isLog: false,
      imageDataUrl
    })
    return collectTextMatches(response, rect ? { x: rect.x, y: rect.y } : { x: 0, y: 0 }, args.text)
  }

  // {scope: 'desktop'} OCRs the whole screen instead of the viewport — the
  // matches come back in SCREEN pixels, tagged scope: 'desktop', so they feed
  // uiv.desktop.* and the scope guard rejects them in the browser tier. Same
  // coordinate handling as the classic XClickText: the desktop capture is
  // physical pixels, which is what the XModule clicks in.
  const isDesktop = args.scope === 'desktop'

  if (!isDesktop) {
    const tab = await getTargetTab()
    if (!tab) throw new Error(E901_NO_TAB)
    // the capture path resolves the tab via global state's toPlay id
    await updateState(setIn(['tabIds', 'toPlay'], tab.id))
  }

  // {area: match | rect} limits THIS search to one region — same option and
  // scope rules as uiv.findImage; visionLimitSearchArea is blocked in scripts
  const area = normalizeFinderArea(args.area, 'uiv.ocr.findText', args.scope)

  const { response, viewportOffset } = await getOcrResponse({
    searchArea: area ? 'rect' : 'viewport',
    storedImageRect: area,
    ocrApiTimeout: config.ocr.apiTimeout,
    store,
    lang,
    engine,
    engineExplicit: engineAsked !== undefined,
    scale: 'true',
    isTable: false,
    isDesktop,
    isLog: false
  })

  const out = collectTextMatches(response, viewportOffset, args.text)

  // bounding boxes on the actual desktop (gold = OCR match) — the match
  // rects are global DIP screen coords in desktop scope; fire-and-forget.
  // The first match is emphasized: it is what uiv.ocr.findText returns.
  if (isDesktop && out.matches.length) {
    showDesktopMatchMarksDip(out.matches.map(m => ({ x: m.rect.left, y: m.rect.top, width: m.rect.width, height: m.rect.height })), 'ocr', 0)
  }

  return out
}

// Shared tail of every OCR text search: rebase the recognised words by
// `offset` (viewport offset for live captures, the crop origin for stored
// images), run the wildcard word search, and shape matches + the word list
// for the post-run picture.
function collectTextMatches (response, offset, text) {
  // rebase OCR word coords into the caller's space (offset is {0,0} for the
  // 'viewport' search area, but keep the rebase for correctness)
  const rebased = safeUpdateIn(
    ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
    (w) => ({ ...w, Top: w.Top + offset.y, Left: w.Left + offset.x }),
    (response && response.ParsedResults) || []
  )

  const { all } = searchTextInOCRResponse({
    text,
    index: 0,
    exhaust: true,
    parsedResults: rebased
  })

  const matches = (all || []).map(m => {
    const rect = ocrMatchRect(m)
    return {
      x: Math.round(rect.x + rect.width / 2),
      y: Math.round(rect.y + rect.height / 2),
      rect: { left: Math.round(rect.x), top: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      text: m.words.map(w => w.word.WordText).join(' ')
    }
  })

  // EVERY word the engine recognised, with its box — the raw material for the
  // post-run "what OCR saw" picture (see ocrTrail below). Capped: a text-heavy
  // page yields hundreds, and past ~300 the overlay is noise anyway.
  const words = []
  outer:
  for (const pr of rebased) {
    const lines = (pr && pr.TextOverlay && pr.TextOverlay.Lines) || []
    for (const line of lines) {
      for (const w of (line.Words || [])) {
        words.push({
          left: Math.round(w.Left),
          top: Math.round(w.Top),
          width: Math.round(w.Width),
          height: Math.round(w.Height),
          // what the engine READ here — printed under the highlight so a
          // misread shows as a visible disagreement with the page
          text: String(w.WordText || '').slice(0, 24)
        })
        if (words.length >= 300) break outer
      }
    }
  }

  // hand the recognised text back with the matches: on a miss it is the whole
  // diagnosis, and this pass already paid for it
  return { matches, text: parsedResultsToText(response), words }
}

// ---------------------------------------------------------------------------
// Find probe: test a single finder without running a script — the JS-view
// equivalent of the edit form's Find button. Flashes match outlines on the
// page (into the right frame for frame-local matches) and logs a summary.
// ---------------------------------------------------------------------------

// Serialized into the page; draws self-removing outline boxes for rects
// given in this frame's viewport coordinates.
function pageFlashRects (rects) {
  try {
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i]
      var box = document.createElement('div')
      box.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;' +
        'border:2px solid #ff5f2e;border-radius:3px;background:rgba(255,95,46,0.15);' +
        'box-sizing:border-box;transition:opacity 0.3s;' +
        'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;'
      if (rects.length > 1) {
        var label = document.createElement('span')
        label.textContent = String(i + 1)
        label.style.cssText = 'position:absolute;left:-2px;top:-16px;background:#ff5f2e;color:#fff;' +
          'font:bold 10px/14px sans-serif;padding:0 4px;border-radius:2px;'
        box.appendChild(label)
      }
      document.documentElement.appendChild(box)
      ;(function (el) {
        setTimeout(function () { el.style.opacity = '0' }, 1700)
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el) }, 2100)
      })(box)
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) }
  }
}

// Single finder attempt (no auto-wait retry — Find should answer NOW).
// Never rejects; logs the outcome either way.
// `opts` carries the options read off the probed line — above all {scope}.
// Without it this probed the browser viewport whatever the line said, so
// {scope: 'desktop'} reported "no matches" for an image sitting on the screen
// in plain view, and the button that exists to answer "why didn't it match?"
// was itself the reason. minScore/engine/language are passed for the same
// reason: probing at a different threshold or with a different OCR engine
// answers a question the script never asked.
export async function probeFind (kind, target, opts = {}) {
  if (running) return { ok: false, error: SCRIPT_ALREADY_RUNNING }

  const onDesktop = opts.scope === 'desktop'

  try {
    // Find always targets the tab the user is looking at right now — never
    // a tab pinned by a previous script run. A DESKTOP search needs no tab at
    // all (the XModule captures the screen), and demanding one made the probe
    // fail with E901 on a browser showing nothing but a chrome:// page — the
    // exact situation a desktop macro is usually written in.
    scriptTabId = null
    let tab = null
    if (!onDesktop) {
      tab = await getTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
    }

    let matches = []
    let hiddenCount = 0
    let ocrText = ''
    let ocrWords = []
    switch (kind) {
      case 'elementSearch': {
        if (onDesktop) {
          return {
            ok: false,
            error: "a DOM locator has no meaning on the desktop — {scope: 'desktop'} searches the screen, where there are no elements, only pixels. Find an image (uiv.findImage) or OCR text (uiv.ocr.findText) there instead."
          }
        }
        const r = await elementSearchOnce(tab, { locator: target })
        matches = r.matches
        hiddenCount = r.hiddenCount
        break
      }
      case 'imageSearch':
        matches = await imageSearchOnce({ image: target, scope: opts.scope, minScore: opts.minScore })
        break
      case 'textSearch': {
        const r = await textSearchOnce({ text: target, scope: opts.scope, engine: opts.engine, language: opts.language })
        matches = r.matches
        ocrText = r.text
        ocrWords = r.words || []
        break
      }
      case 'ai': {
        // ONE real model call — Find on a uiv.ai.find line asks the model the
        // user explicitly wrote about. Unlike the free finders the answer is
        // fresh (and billed) each time, so this runs only on the button click.
        const vars = getVarsInstance()
        const wantScope = opts.scope === 'desktop' ? 'desktop' : (opts.scope === 'browser' ? 'browser' : null)
        const prevScope = wantScope ? vars.get('!CVSCOPE') : null
        if (wantScope) vars.set({ '!CVSCOPE': wantScope }, true)
        try {
          await withBannerHidden(() => runAiCommand('aiScreenXY', target))
        } finally {
          if (wantScope) vars.set({ '!CVSCOPE': prevScope }, true)
        }
        const ax = Number(vars.get('!AI1'))
        const ay = Number(vars.get('!AI2'))
        if (!isFinite(ax) || !isFinite(ay)) {
          return { ok: false, error: `the model did not return usable coordinates for '${target}' — describe the target by what it LOOKS like and where it sits, and make sure it is visible` }
        }
        // a point, not a box — a small rect around it lets the normal match
        // display (page flash / screenshot viewer) show where the model points
        matches = [{ x: Math.round(ax), y: Math.round(ay), rect: { left: Math.round(ax) - 14, top: Math.round(ay) - 14, width: 28, height: 28 } }]
        break
      }
      default:
        return { ok: false, error: `unknown finder '${kind}'` }
    }

    // SHOW the matches. Two different surfaces, because the coordinates live
    // in two different spaces.
    //
    // Desktop OCR: ALWAYS open the capture with the full OCR overlay — every
    // recognised word plus the query matches — hit or MISS. A bare "no
    // matches on the SCREEN" left the user staring at a word plainly on
    // screen (measured: 'BETA') with no way to see what the reader saw; the
    // overlay is the same picture the OCR test button shows, and it answers
    // whether the reader or the query is at fault in one look.
    if (onDesktop && kind === 'textSearch') {
      try {
        const posWord = (text, r, i) => ({
          word: { WordText: text, Left: r.left, Top: r.top, Width: r.width, Height: r.height },
          position: { pIndex: 0, lIndex: 0, wIndex: i }
        })
        const ocrMatches = [{
          similarity: 1,
          highlight: OcrHighlightType.Identified,
          words: (ocrWords || []).map((w, i) => posWord(w.text, w, i))
        }]
        if (matches.length) {
          ocrMatches.push({
            similarity: 1,
            highlight: OcrHighlightType.TopMatched,
            words: matches.map((m, i) => posWord(m.text, m.rect, 1000 + i))
          })
        }
        await csIpc.ask('PANEL_HIGHLIGHT_OCR_MATCHES', {
          ocrMatches,
          isDesktop: true,
          screenAvailableSize: { width: screen.availWidth, height: screen.availHeight },
          localStorage: cloneSerializableLocalStorage(localStorage),
          showOcrOverlay: true
        })
      } catch (e) { /* showing the overlay is best-effort — the log still has it */ }
    }

    // Screen search: the rects are SCREEN pixels, so drawing them inside the
    // page would point at an unrelated spot. The desktop screenshot editor is
    // the surface that CAN show them — it opens the capture the search just
    // took (searchVision saves it as __lastdesktopscreenshot) and draws the
    // boxes on it, which is the same thing the classic visual commands show in
    // debug mode. Best match first, so it is the one highlighted. Shown on a
    // MISS too, with "no match" written on the picture — a bare "no matches
    // on the SCREEN" gave the user nothing to look at (user report), and the
    // capture is what answers whether the image or the screen changed.
    if (onDesktop && kind !== 'textSearch') {
      try {
        // Where the capture actually IS depends on the storage strategy — with
        // XFile it lives on disk, not in extension storage, and asking for the
        // wrong one opens the viewer on nothing. This is the same check the
        // desktop OCR overlay makes in bg.js.
        const source = getStorageManager().getCurrentStrategyType() === StorageStrategyType.XFile
          ? DesktopScreenshot.ImageSource.HardDrive
          : DesktopScreenshot.ImageSource.Storage
        await csIpc.ask('PANEL_HIGHLIGHT_DESKTOP_RECTS', {
          imageInfo: {
            source,
            path: ensureExtName('.png', C.LAST_DESKTOP_SCREENSHOT_FILE_NAME)
          },
          screenAvailableSize: { width: screen.availWidth, height: screen.availHeight },
          selectedIndex: 0,
          scoredRects: matches.length
            ? matches.map((m, i) => ({
                type: i === 0 ? DesktopScreenshot.RectType.BestMatch : DesktopScreenshot.RectType.Match,
                index: i,
                x: m.rect.left,
                y: m.rect.top,
                width: m.rect.width,
                height: m.rect.height,
                score: m.score
              }))
            // no match: one labelled banner rect pinned top-left, so the
            // verdict is written ON the capture the search actually used
            : [{
                type: DesktopScreenshot.RectType.Match,
                index: 0,
                x: 16,
                y: 16,
                width: 420,
                height: 30,
                text: `NO MATCH for '${target}'` + (opts.minScore != null ? ` at minScore ${opts.minScore}` : '')
              }]
        })
      } catch (e) { /* showing the result is best-effort — the log still has it */ }
    }

    // Browser search: flash the matches in the page, grouped by frame
    // (frame-local rects stay local).
    const byFrame = {}
    if (!onDesktop) {
      for (const m of matches) {
        const fid = m.frameId || 0
        if (!byFrame[fid]) byFrame[fid] = []
        byFrame[fid].push(m.rect)
      }
      for (const fid of Object.keys(byFrame)) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id, frameIds: [parseInt(fid, 10)] },
            func: pageFlashRects,
            args: [byFrame[fid]]
          })
        } catch (e) { /* flashing is best-effort */ }
      }
    }

    const first = matches[0]
    // a miss is the interesting case, so say what is known about it: hidden
    // matches for the DOM, and for OCR the text it actually recognised — the
    // Find button is where "why didn't it match?" gets asked
    const hiddenNote = !matches.length && hiddenCount > 0
      ? ` — but ${hiddenCount} HIDDEN match(es) exist (element is collapsed/invisible; reveal it first)`
      : (!matches.length && kind === 'textSearch' ? ocrMissNote(ocrText) : '')
    // one human-readable result line — logged here, and returned so the JS
    // view can write it as a comment below the probed script line
    const summary = `${matches.length} match(es)` +
      (first
        ? ` — first at (${first.x}, ${first.y})` +
          (first.text ? ` text='${String(first.text).slice(0, 60)}'` : '') +
          (first.score !== undefined ? ` score=${Number(first.score).toFixed(2)}` : '') +
          (first.frameLocal ? ` [frame ${first.frameId}, frame-local]` : '')
        : hiddenNote)
    const displayName = { elementSearch: 'findElements', imageSearch: 'findImages', textSearch: 'ocr.findTexts', ai: 'ai.find' }[kind] || kind
    // name the scope in the log: "no matches" means something different on the
    // screen than in the viewport, and the coordinates below are in different
    // spaces too (screen pixels vs viewport CSS pixels)
    const where = onDesktop ? ", {scope: 'desktop'}" : ''
    store.dispatch(act.addLog(
      matches.length ? 'echo' : 'warning',
      `Find ${displayName}('${target}'${where}): ${summary}${onDesktop && matches.length ? ' [SCREEN pixels]' : ''}`
    ))
    return { ok: true, count: matches.length, hiddenCount, summary }
  } catch (e) {
    const msg = (e && e.message) || String(e)
    store.dispatch(act.addLog('error', `Find ('${target}') failed: ${msg}`))
    return { ok: false, error: msg }
  }
}

// ---------------------------------------------------------------------------
// live JS variables: the user's top-level `var`s, published to ui.scriptVars
// so the Variables tab can show them next to the Ui.Vision variables
// ---------------------------------------------------------------------------

// names present in the global scope BEFORE any user code runs: interpreter
// built-ins, the uiv polyfill and the native bridge functions
let baselineGlobalNames = null
function getBaselineGlobalNames () {
  if (!baselineGlobalNames) {
    const bare = new Interpreter(POLYFILL)
    baselineGlobalNames = new Set(Object.keys(bare.globalObject.properties))
    ;['__uiv_bridge', '__uiv_pause', '__uiv_exit', '__uiv_get', '__uiv_set', '__uiv_log'].forEach(n => baselineGlobalNames.add(n))
  }
  return baselineGlobalNames
}

// The source the user actually wrote, used to tell their variables apart from
// Babel's. Compiling ES6 injects helpers and temporaries into the global scope
// (_createClass, _slicedToArray, _i, _step, ...) which would otherwise fill the
// Variables tab with names the user never typed. A name that does not appear
// anywhere in their source is not theirs.
let scriptSourceText = ''

function isUserVarName (name) {
  if (!scriptLineMap) return true // no transpiling happened, nothing injected
  if (!scriptSourceText) return true
  return new RegExp('\\b' + String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(scriptSourceText)
}

// top-level `var`s of the running script with their current values.
// Function-LOCAL variables are not visible (they live in call scopes, not
// the global object) — documented limitation of the live variable view.
function collectScriptVars (interp) {
  const out = {}
  try {
    const baseline = getBaselineGlobalNames()
    const props = interp.globalObject.properties
    for (const name in props) {
      if (baseline.has(name)) continue
      if (!isUserVarName(name)) continue
      const pseudo = props[name]
      if (pseudo && pseudo.class === 'Function') {
        out[name] = '[function]'
        continue
      }
      try {
        out[name] = interp.pseudoToNative(pseudo)
      } catch (e) {
        out[name] = '[unserializable]'
      }
    }
  } catch (e) { /* variable display is best-effort */ }
  return out
}

function publishScriptVars (interp) {
  try {
    store.dispatch(act.updateUI({ scriptVars: collectScriptVars(interp) }))
  } catch (e) { /* best-effort */ }
}

// Is anyone actually looking? The Variables tab exists only in dev mode
// (run_panel.js), so outside it the per-line publish walks every global,
// converts each value through pseudoToNative and re-renders a panel nobody can
// see — on EVERY executed line. The end-of-run publish is unconditional: the
// AI agent reads the final values from ui.scriptVars regardless of dev mode,
// and the panel must be right if the user turns dev mode on afterwards.
function shouldPublishLiveVars () {
  try {
    return !!store.getState().config.sidebarDevMode
  } catch (e) {
    return false
  }
}

// ---------------------------------------------------------------------------
// interpreter setup + run loop
// ---------------------------------------------------------------------------

function buildInterpreter (code, opts = {}) {
  // node.loc is required for line highlighting
  Interpreter.PARSE_OPTIONS = Interpreter.PARSE_OPTIONS || {}
  Interpreter.PARSE_OPTIONS.locations = true

  const vars = getVarsInstance()

  const interpreter = new Interpreter(POLYFILL + code, (interp, globalObject) => {
    installEvaluateFunctionSource(interp, globalObject, opts.evaluateFunctions)
    interp.setProperty(globalObject, '__uiv_call_data', interp.nativeToPseudo({ args: opts.args || {}, context: opts.context || {} }))
    // the callback MUST always fire — a rejected bridge promise would leave
    // the interpreter suspended forever with no error anywhere
    interp.setProperty(globalObject, '__uiv_bridge', interp.createAsyncFunction(
      function (op, argsJson, cb) {
        let args = {}
        try { args = JSON.parse(String(argsJson)) } catch (e) { /* keep {} */ }
        Promise.resolve()
          .then(() => dispatchBridge(String(op), args))
          .catch(e => ({ ok: false, error: `${op}: ${(e && e.message) || e}` }))
          .then(result => cb(interp.nativeToPseudo(result)))
      }
    ))

    interp.setProperty(globalObject, '__uiv_pause', interp.createAsyncFunction(
      function (input, cb) {
        scriptPause(interp.pseudoToNative(input))
          .catch(e => ({ ok: false, error: `sleep: ${(e && e.message) || e}` }))
          .then(result => cb(interp.nativeToPseudo(result)))
      }
    ))

    // uiv.exit: record the reason on the host, then the sandbox throws its
    // marker error — the run loop ends the run as a SUCCESS on either signal
    interp.setProperty(globalObject, '__uiv_exit', interp.createNativeFunction(
      function (reason) {
        exitRequested = String(reason === undefined || reason === null ? '' : reason)
      }
    ))

    interp.setProperty(globalObject, '__uiv_get', interp.createNativeFunction(
      function (name, hasFallback) {
        // {ok, value, unset, error} — the polyfill turns !ok into a real
        // script error. Never throw natively: that escapes step() and kills
        // the run uncatchably. Returning undefined for every failure (the
        // previous behaviour) made a typo'd '!TIMEOOUT_WAIT' and a genuinely
        // unset '!STATUSOK' indistinguishable, surfacing as NaN further down.
        try {
          const key = String(name).trim()

          if (!key) {
            return interp.nativeToPseudo({ ok: false, error: "getVar: needs a variable name, e.g. uiv.getVar('!LASTCOMMANDOK')" })
          }

          // table-macros-only and deprecated variables (finder-result vars,
          // the csvRead family, !URL, …): fail with the workaround rather
          // than hand back a value only a table command chain could consume
          const deprecated = getDeprecatedVariable(key)
          if (deprecated && deprecated.jsError) {
            return interp.nativeToPseudo({ ok: false, error: `getVar: ${deprecated.jsError}` })
          }

          if (!vars.isSupportedName(key)) {
            return interp.nativeToPseudo({
              ok: false,
              error: `getVar: '${key}' is not a Ui.Vision special variable — check the spelling against the !variable list (a plain script value needs no '!')`
            })
          }

          // a variable holding undefined counts as unset: executeScript with
          // no return value stores exactly that, and returning it would be the
          // silent-undefined-becomes-NaN failure this contract exists to stop
          if (!vars.has(key) || vars.get(key) === undefined) {
            if (hasFallback) return interp.nativeToPseudo({ ok: true, unset: true })

            const hint = key.charAt(0) === '!'
              ? 'it is filled in by Ui.Vision commands — read it right after the uiv call that produces it (environment facts like !BROWSER/!OS and the config values are pre-seeded and always readable; RESULT variables only exist after their command)'
              : `set it with uiv.setVar('${key}', …) first, or run the command that stores into it`

            return interp.nativeToPseudo({
              ok: false,
              error: `getVar: '${key}' is not set — ${hint}. To allow it, pass a default: uiv.getVar('${key}', null)`
            })
          }

          return interp.nativeToPseudo({ ok: true, value: vars.get(key) })
        } catch (e) {
          return interp.nativeToPseudo({ ok: false, error: `getVar: ${(e && e.message) || e}` })
        }
      }
    ))

    interp.setProperty(globalObject, '__uiv_set', interp.createNativeFunction(
      function (name, value) {
        // never throw natively — a bare native throw escapes interp.step()
        // and kills the run uncatchably (review finding); no isAdmin, so
        // readonly system vars are protected like the classic store command
        try {
          const key = String(name)

          // table-macro-only variables (the csvRead family, !csvLine, the
          // search-area bookkeeping, …) are refused on the WRITE side too —
          // the write would succeed silently and mean nothing, since nothing
          // in a script can consume it
          const deprecatedWrite = getDeprecatedVariable(key)
          if (deprecatedWrite && deprecatedWrite.jsError) {
            return interp.nativeToPseudo({ ok: false, error: `setVar: ${deprecatedWrite.jsError}` })
          }

          const native = interp.pseudoToNative(value)
          vars.set({ [key]: native }, false)
          rememberScriptScopeOverride(key, native)
          return interp.nativeToPseudo({ ok: true })
        } catch (e) {
          return interp.nativeToPseudo({ ok: false, error: `setVar: ${(e && e.message) || e}` })
        }
      }
    ))

    interp.setProperty(globalObject, '__uiv_log', interp.createNativeFunction(
      function (text, color) {
        // second argument behaves like echo's Value: a color name, or
        // '#shownotification' for a browser notification
        const c = color === undefined || color === null ? '' : String(color)
        const options = c === '#shownotification'
          ? { notification: true }
          : (c ? { color: c } : undefined)
        store.dispatch(act.addLog('echo', String(text), options))
        if (options && options.notification) {
          csIpc.ask('PANEL_NOTIFY_ECHO', { text: String(text) }).catch(() => { /* best-effort */ })
        }
      }
    ))
  })

  // Regexes run NATIVELY (mode 1), not in the default mode-2 blob-URL Web
  // Worker: Firefox's extension-page CSP blocks blob workers, the worker
  // never answers, and when the 1s regexp timeout fired its asynchronous
  // throw landed outside a step — the run ENDED silently, reported as
  // completed, at the first regex in any script (uiv.browser.click(locator)
  // hits one inside the polyfill's __domTarget). Native mode is the same
  // trust model as the rest of the runner: the script's author already has
  // uiv.evaluate, and the classic player runs user regexes natively too — the
  // worker only guarded against self-inflicted catastrophic backtracking.
  interpreter['REGEXP_MODE'] = 1

  return interpreter
}

// Macrotask yield without setTimeout's nesting clamp. Chrome clamps nested
// setTimeout(0) to 4ms after the fifth level — with the run loop yielding on
// every executed line, that clamp (not the CPU) was the speed limit of a
// pure-JS loop: ~250 lines/s. A MessageChannel message is a real macrotask
// (rendering and input still get their turn between yields) with no clamp.
const yieldMacrotask = (() => {
  let channel = null
  let pendingResolve = null
  return () => new Promise(resolve => {
    if (!channel) {
      channel = new MessageChannel()
      channel.port1.onmessage = () => {
        const r = pendingResolve
        pendingResolve = null
        if (r) r()
      }
    }
    pendingResolve = resolve
    channel.port2.postMessage(null)
  })
})()

// opts: { runToLine: N }  — pause when line N (1-based) is reached
//       { keepVars: true } — keep the variable pool from the previous run
//                            ("Run this line" / "Run from here" context items)
//       { seedVars: {} }   — variables set AFTER the fresh-run reset, e.g.
//                            !CMD_VAR1..N from a bookmark/html invocation
export async function runScript (code, opts = {}) {
  if (running) {
    throw new Error(SCRIPT_ALREADY_RUNNING)
  }

  running = true
  startExecutionLocality('script')
  scriptReturnValue = null
  executionMacroId = opts.macroId || null
  stopRequested = false
  firstCommandDone = false
  paused = false
  pauseRequested = false
  runToLine = typeof opts.runToLine === 'number' ? opts.runToLine : null
  scriptTabId = typeof opts.tabId === 'number' ? opts.tabId : null // a subcall uses the viewport it measured
  pendingTabPickNotice = null // and a parked which-tab notice dies with the old pin
  if (opts.stickyTab) {
    // a bridge run (Claude Code's run_macro) keeps the session's tab instead
    // of following the user's focus into another window (OPEN-ISSUES 21.1)
    try {
      const picked = await pickBridgeTab()
      if (picked.tab) {
        scriptTabId = picked.tab.id
        if (picked.note) store.dispatch(act.addLog('warning', picked.note))
      }
    } catch (e) { /* the usual pick below */ }
  }
  scriptBaseTabId = null // ... and a fresh base for relative tab=N locators
  scriptScopeOverrides = {} // ... and no leftover setVar'd timeouts
  clickTrail = [] // ... and no click points carried over from the last run
  bridgeOpSeq = 0
  startRunFrames('script') // ... and a fresh ring of finder captures (run pictures)
  holdCdpAttachDuringRun(true) // one debugger attach per run — see cdp_input
  ocrTrail = [] // ... nor last run's OCR searches
  imageTrail = [] // ... nor its image searches
  pointTrail = [] // ... nor its ai.find / offset points
  scriptSessionActive = false // ... and a fresh command session
  scriptSessionStale = false
  scriptFrameId = null
  scriptStartedAt = Date.now() // wall clock for the end-of-run Runtime line
  perfReset()
  downloadsCapturedThisRun = 0
  viaLabelNoted = new Set()
  urlDownloadsThisRun = new Map()
  lastOpenSig = null
  armNavigationWatcher() // one listener for the run; see settleAfterClick
  emit('status', 'running')
  // hold the automation tab mark for the whole script: without this, every
  // uiv.* call would group/ungroup the tab and re-inject the border
  csIpc.ask('PANEL_SCRIPT_RUN_MARK', { marked: true }).catch(() => { /* cosmetic */ })
  // name the script in the log, like the table player's "Playing macro X" —
  // with several macros in a session, an unnamed start line is ambiguous.
  // opts.name wins: an INLINE script (Claude Code's run_macro {script})
  // never touches the editor, so the editor's macro name would label the
  // started/completed/failed lines with a macro that did not run.
  const scriptName = (() => {
    if (opts.name) return opts.name
    try {
      const src = store.getState().editor.editing.meta.src
      return src && src.name && src.name.length ? src.name : 'Untitled'
    } catch (e) {
      return 'Untitled'
    }
  })()
  store.dispatch(act.addLog('status', `${scriptName} started`))
  // outdated native host = subtle failures all over — say it at the top of
  // EVERY run log, where the person debugging the run actually looks
  const xmoduleWarn = xmoduleOutdatedWarning()
  if (xmoduleWarn) store.dispatch(act.addLog('warning', xmoduleWarn))
  // fresh run, fresh live-variable view (Variables tab)
  // scriptRunning travels in the SAME redux slice the status bar reads, so it
  // cannot go stale relative to the line number the way a module-level flag in
  // another file can
  try { store.dispatch(act.updateUI({ scriptVars: {}, scriptLine: null, scriptRunning: true })) } catch (e) { /* best-effort */ }

  const Status = Interpreter.Status
  let ok = false
  let error = null
  let errorLine = null
  let errorWhere = null
  exitRequested = null // per-run: set by uiv.exit(reason)
  // last position as TEXT ("line 12" / "lib/forms.js line 4"). lastLine only
  // holds lines of the main file, because that is all the editor can mark —
  // an error inside an included file would otherwise report nothing.
  let lastLine = null
  let lastWhere = null

  // the legacy command bridge needs a macro that exists in storage (see
  // prepareRunMacro); do this before touching the interpreter so a
  // cancelled dialog aborts cleanly
  try {
    const prepared = await prepareRunMacro(code, opts.macroId)
    if (!prepared) {
      error = 'Run cancelled — unsaved macro dialog was dismissed'
    } else if (!opts.keepVars) {
      // fresh variable scope once per script (bridge commands then always
      // run with keepVariables so uiv.setVar survives across them);
      // keepVars: partial runs from the context menu reuse the pool
      getVarsInstance().reset({ keepGlobal: true })
    }
    if (prepared) {
      // STATIC facts are readable from the FIRST line of a script —
      // uiv.getVar('!BROWSER') / ('!OS') at the top of a macro (a browser
      // guard clause, a per-OS shortcut table) must not require a uiv command
      // to have run first. These are environment facts and config values, not
      // command results; the session start re-seeds them later along with the
      // setVar-override bookkeeping, which is harmless.
      const cfg = store.getState().config
      getVarsInstance().set({
        '!BROWSER': Ext.isFirefox() ? 'firefox' : 'chrome',
        '!OS': (() => {
          const ua = window.navigator.userAgent
          if (/windows/i.test(ua)) return 'windows'
          if (/mac/i.test(ua)) return 'mac'
          return 'linux'
        })(),
        '!TIMEOUT_PAGELOAD': parseFloat(cfg.timeoutPageLoad),
        '!TIMEOUT_WAIT': parseFloat(cfg.timeoutElement),
        '!TIMEOUT_MACRO': parseFloat(cfg.timeoutMacro),
        '!TIMEOUT_DOWNLOAD': parseFloat(cfg.timeoutDownload),
        '!OCRLANGUAGE': cfg.ocrLanguage,
        '!OCRENGINE': cfg.ocrEngine,
        '!CVSCOPE': cfg.cvScope
      }, true)
    }
    if (prepared && opts.seedVars && Object.keys(opts.seedVars).length) {
      // after the reset, so an invocation's !CMD_VARn survive into the run
      getVarsInstance().set(opts.seedVars)
    }
  } catch (e) {
    // storage APIs reject with the raw event from their onerror handler,
    // which stringifies to "[object Event]" and buries the real cause (field
    // data: a user stuck on exactly that message, asking the AI chat why).
    // Name what the event actually carries instead.
    let reason = (e && e.message)
      || (e && e.target && e.target.error && e.target.error.message)
      || (e && e.type ? `'${e.type}' event from ${(e.target && e.target.constructor && e.target.constructor.name) || 'the storage layer'}` : String(e))
    // Gecko's InvalidStateError wording for a profile that refuses IndexedDB
    // writes — a Firefox private window (pre-115 semantics) or a "never
    // remember history" profile. Field data 2026-08-13: two users hit this
    // as an unexplained dead end. Say what it means and what to do; NOT a
    // Chrome-incognito case (extension IndexedDB works there).
    if (/did not allow mutations/i.test(String(reason))) {
      reason = 'Firefox is blocking extension storage writes in this profile — this happens in private-browsing windows and in profiles set to "never remember history". Macros cannot be saved or run from such a profile: open a normal Firefox window (or disable permanent private browsing in Firefox Settings > Privacy & Security) and try again'
    }
    error = `Cannot prepare the macro for the script run: ${reason}`
  }

  // ES6+ -> ES5 for the sandbox. Babel is lazy-loaded here, so a session that
  // never runs a script never pays for it. `scriptLineMap` then translates
  // every reported position back to the line the user wrote — the debugger
  // (marker, breakpoints, error lines) works on user lines throughout.
  let runnableCode = code
  let evaluateFunctions = {}
  scriptLineMap = null
  scriptSegments = null
  scriptSourceText = code

  // @include is resolved BEFORE compiling: the included files become part of
  // one program, so shared code is real functions with real arguments and
  // return values rather than values smuggled through the variable pool.
  let mergedCode = code
  if (!error) {
    try {
      const src = store.getState().editor.editing.meta.src
      const merged = await resolveIncludes(code, opts.macroId || (src && src.id))
      if (merged.segments.length > 1) {
        mergedCode = merged.source
        scriptSegments = merged.segments
        scriptSourceText = merged.source // included names are user names too
        const files = merged.segments.filter(seg => !seg.isMain).map(seg => seg.path)
        store.dispatch(act.addLog('info', `@include: ${files.join(', ')}`))
      }
    } catch (e) {
      error = (e && e.message) || String(e)
    }
  }

  if (!error) {
    const table = describeCommandTableScript(mergedCode)
    if (table) error = table
  }

  if (!error) {
    try {
      const compiled = await transpileScript(mergedCode)
      runnableCode = compiled.code
      evaluateFunctions = compiled.evaluateFunctions
      scriptLineMap = compiled.lineMap
    } catch (e) {
      // syntax errors and the async/await rejection land here. For a plain
      // script Babel parsed the user's own source, so its positions are
      // exact. Once @include has spliced files into one program they are
      // merged-source positions: map them back to the file and line the
      // user wrote, the way the runtime path does in describeScriptLine —
      // errorLine may only ever carry a MAIN-file line (it feeds the
      // editor's jump-to-line), an included file's position goes in
      // errorWhere as text.
      error = (e && e.message) || String(e)
      if (e && typeof e.scriptLine === 'number') {
        if (!scriptSegments) {
          errorLine = e.scriptLine
        } else {
          const located = await locateCompileError(mergedCode, scriptSegments, e)
          errorLine = located.errorLine
          errorWhere = located.errorWhere
          if (located.message) error = located.message
        }
      }
    }
  }

  let interp = null
  try {
    if (!error) interp = buildInterpreter(runnableCode, { ...opts, evaluateFunctions })
  } catch (e) {
    // acorn syntax error — its line numbers include the uiv polyfill prefix;
    // shift both the message "(line:col)" and .loc back to user-script lines
    let msg = (e && e.message) ? e.message : String(e)
    msg = msg.replace(/\((\d+):(\d+)\)/, (m, l, c) => `(${Math.max(1, parseInt(l, 10) - POLYFILL_LINES)}:${c})`)
    if (e && e.loc && typeof e.loc.line === 'number') {
      errorLine = toScriptLine(e.loc.line)
      errorWhere = describeScriptLine(e.loc.line)
    }
    error = `Syntax error: ${msg}`
  }

  try {
    if (error) throw new Error('__uiv_pre_run_error__')
    // Pacing is a TIME budget, not a per-line one: yield the thread every
    // ~12ms so the page paints (line highlight, logs) and Stop stays
    // responsive, and let compute-heavy stretches run at interpreter speed
    // in between. The line highlight itself stays per-line (emit('line') is
    // rAF-coalesced and cheap); only the redux work is throttled.
    let lastYieldAt = performance.now()
    let lastLineDispatchAt = 0

    for (;;) {
      if (stopRequested) {
        error = 'Script stopped'
        break
      }

      // uiv.exit called: end the run as a success — checked here (not only in
      // the catch below) so a try/catch that swallowed the marker throw still
      // ends the run at the next step
      if (exitRequested !== null) {
        ok = true
        break
      }

      const status = interp.getStatus()
      if (status === Status.DONE) {
        ok = true
        break
      }
      if (status === Status.ASYNC || status === Status.TASK) {
        await delayMs(15)
        continue
      }

      visitScriptExecutionLine(interp, describeScriptLine)
      interp.step()

      const rawLine = currentInterpLine(interp)
      if (rawLine !== null) {
        const where = describeScriptLine(rawLine)
        if (where) lastWhere = where
      }

      const line = rawLine === null ? null : toScriptLine(rawLine)
      if (line !== null && line !== lastLine) {
        lastLine = line
        emit('line', line)
        // Status bar "Line N" and the dev-mode Variables tab are redux
        // dispatches — a re-render of every connected component per executed
        // line. At most ~10x/s: faster is unreadable, and unthrottled it was
        // a large share of a hot loop's cost.
        const nowMs = performance.now()
        if (nowMs - lastLineDispatchAt >= 100) {
          lastLineDispatchAt = nowMs
          try { store.dispatch(act.updateUI({ scriptLine: line })) } catch (e) { /* best-effort */ }
          if (shouldPublishLiveVars()) publishScriptVars(interp)
        }

        // breakpoint / "Run to this line" / manual pause: hold at the start
        // of this line until resumed (Stop still works while paused)
        const hitRunTo = runToLine !== null && line >= runToLine
        if (breakpoints.has(line) || hitRunTo || pauseRequested) {
          if (hitRunTo) runToLine = null // one-shot
          pauseRequested = false
          paused = true
          // the throttle above may have skipped this line — while paused no
          // further dispatch comes, so the status bar must be forced current
          try { store.dispatch(act.updateUI({ scriptLine: line })) } catch (e) { /* best-effort */ }
          if (shouldPublishLiveVars()) publishScriptVars(interp)
          emit('status', 'paused')
          store.dispatch(act.addLog('status', `${scriptName} paused at line ${line}`))
          while (paused && !stopRequested) {
            await delayMs(100)
          }
          if (!stopRequested) {
            emit('status', 'running')
            store.dispatch(act.addLog('status', 'JS script resumed'))
          }
        }
      }

      if (performance.now() - lastYieldAt >= 12) {
        await yieldMacrotask()
        lastYieldAt = performance.now()
      }
    }
  } catch (e) {
    if (exitRequested !== null || (e && e.message === '__uiv_exit__')) {
      // uiv.exit's marker throw escaping the script is the NORMAL exit path
      if (exitRequested === null) exitRequested = ''
      ok = true
    } else if (!e || e.message !== '__uiv_pre_run_error__') {
      // unhandled script throws land here (pre-run errors were handled above)
      error = (e && e.message) ? e.message : String(e)
      // "KEY_CTRL is not defined": a key NAME written as a JS identifier —
      // 17 chats in the 2026-09-06 drop (OPEN-ISSUES 35.7); say the string form
      const keyRef = /^(KEY_[A-Z0-9_]+) is not defined$/.exec(error)
      if (keyRef) {
        error += ` — key names are TEXT inside the typed string, not JS variables: uiv.browser.type('\${${keyRef[1]}}'), a combo as '\${KEY_CTRL+KEY_F}', or uiv.browser.press('Control+F')`
      }
      errorLine = lastLine
      errorWhere = lastWhere
    }
  }

  for (const text of Array.from(heldDesktopKeys).reverse()) {
    try {
      await getXModule2API().invoke('send_text', { text, hold: false })
      heldDesktopKeys.delete(text)
    } catch (e) { store.dispatch(act.addLog('warning', 'Failed to release desktop key ' + text + ': ' + String(e))) }
  }
  try { await releaseCdpKeys() }
  catch (e) { store.dispatch(act.addLog('warning', String(e))) }
  running = false
  // the tab this run ended on is the bridge session's tab from now on
  if (opts.stickyTab && scriptTabId !== null) setBridgeTab(scriptTabId)
  stopRequested = false
  paused = false
  pauseRequested = false
  runToLine = null
  // stale banners mislead: clear on error/stop, linger briefly on success
  // (BEFORE disarming the watcher, so ordering reads right — the grace timer
  // itself needs no listener)
  bannerEndOfRun(ok)
  disarmNavigationWatcher()
  // close the command session opened by the first fast-path command — this is
  // the single PANEL_STOP_PLAYING for the whole run (badge, content-script
  // mode, tab rebase), where before there was one per uiv.* call
  await endScriptSession()

  // release the tab mark held for the whole run (see PANEL_SCRIPT_RUN_MARK)
  csIpc.ask('PANEL_SCRIPT_RUN_MARK', { marked: false }).catch(() => { /* cosmetic */ })

  // the run is over — take down the desktop border indicator (no-op if no
  // desktop-scope command ever showed it)
  hideDesktopBorder()

  // final variable values stay inspectable after the run; the line marker is
  // not meaningful once nothing is executing
  if (interp) publishScriptVars(interp)
  try {
    // The failure text travels in redux too, not only as a log line: "Fix with
    // AI" builds its prompt from the last error, and searching the log for one
    // has already come back empty once — leaving the AI with the useless
    // placeholder "an error".
    store.dispatch(act.updateUI({
      scriptLine: null,
      scriptRunning: false,
      scriptError: ok ? null : (error || null),
      scriptErrorWhere: ok ? null : (errorWhere || null)
    }))
  } catch (e) { /* best-effort */ }

  // run pictures: the last finder captures go to Shots as _run_last*.png
  try {
    const written = await flushRunFrames()
    if (written.length) store.dispatch(act.addLog('info', describeRunFrames(written)))
  } catch (e) { /* best-effort */ }

  holdCdpAttachDuringRun(false) // the run is over: back to the short idle detach
  perfSummary()

  // total wall clock, worded like the table macro's end line ("Macro completed
  // (Runtime 3.02s)") so both macro types read the same in the log
  const runtime = milliSecondsToStringInSecond(scriptRuntimeMs())
  const locality = finishExecutionLocality('script')
  try { getVarsInstance().set({ '!RUNTIME': runtime }, true) } catch (e) { /* best-effort */ }

  if (ok) {
    if (exitRequested !== null) {
      store.dispatch(act.addLog('info', `${scriptName} ended early by uiv.exit${exitRequested ? `: ${exitRequested}` : ''}`))
    }
    store.dispatch(act.addLog('info', `${scriptName} completed (Runtime ${runtime}, ${locality})`, { localExecution: locality.endsWith(', no cloud used') }))
  } else {
    // structured jump target for the log's "Jump to line" link — the same
    // main-file line the editor marks red at run end (an error inside an
    // @include'd file carries its position in errorWhere text only)
    const jumpOpts = (() => {
      if (error === 'Script stopped' || typeof errorLine !== 'number') return {}
      try {
        const src = store.getState().editor.editing.meta.src
        const macroId = opts.macroId || (src && src.id)
        return macroId ? { scriptJump: { macroId, line: errorLine } } : {}
      } catch (e) {
        return {}
      }
    })()
    store.dispatch(act.addLog('error', `${scriptName} ${error === 'Script stopped' ? 'stopped' : 'failed'}: ${error}${errorWhere ? ` (${errorWhere})` : (errorLine ? ` (line ${errorLine})` : '')} (Runtime ${runtime})`, jumpOpts))
    // a failed run must show WHY without hunting: pop the Logs drawer open
    if (error !== 'Script stopped') {
      try { store.dispatch(act.updateUI({ runPanelOpen: true, runPanelTab: 'Logs' })) } catch (e) { /* best-effort */ }
    }
  }

  // tree feedback parity with classic runs: mark the script macro's file
  // green/red (manual stop marks nothing, like the classic player)
  try {
    const editing = store.getState().editor.editing
    const src = editing.meta && editing.meta.src
    const macroId = opts.macroId || (src && src.id)
    if (macroId && (opts.macroId || typeof editing.script === 'string') && error !== 'Script stopped') {
      store.dispatch(act.updateMacroPlayStatus(macroId, ok ? MacroResultStatus.Success : MacroResultStatus.Error))
    }
  } catch (e) { /* badge is best-effort */ }

  emit('status', 'stopped')
  reportUsage('macro', ok ? 'script.ok' : error === 'Script stopped' ? 'script.stopped' : 'script.failed')
  emit('done', { ok, error, errorLine })
  executionMacroId = null
  return { ok, error, errorLine, value: ok ? scriptReturnValue : null }
}
