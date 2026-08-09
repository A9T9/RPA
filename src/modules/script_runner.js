import * as act from '@/actions'
import { CaptureScreenshotService } from '@/common/capture_screenshot'
import clipboard from '@/common/clipboard'
import { parseFromCSV, stringifyToCSV } from '@/common/csv'
import { isCVTypeForDesktop } from '@/common/cv_utils'
import { getStorageManager, StorageStrategyType } from '@/services/storage'
import csIpc from '@/common/ipc/ipc_cs'
import { getPlayer, Player } from '@/common/player'
import { milliSecondsToStringInSecond, safeUpdateIn, isMac as isMacOS } from '@/common/ts_utils'
import { getNativeFileSystemAPI } from '@/services/filesystem'
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
import { locateMergedLine, resolveIncludes } from '@/modules/js_includes'
import { getOcrResponse, guardOcrSettings } from '@/modules/ocr'
import { askBackgroundToRunCommand, runCsFreeCommands } from '@/modules/run_command'
import { getMacroCallStack } from '@/services/player/call_stack/call_stack'
import { getMacroMonitor } from '@/services/player/monitor/macro_monitor'
import { hasUnsavedMacro } from '@/recomputed'
import { store } from '@/redux'
import { searchVision } from '@/search_vision'
import { ocrMatchRect, searchTextInOCRResponse } from '@/services/ocr'
import { delayMs, setIn, dataURItoBlob, ensureExtName } from '@/common/utils'
import * as C from '@/common/constant'
import { DesktopScreenshot } from '@/desktop_screenshot_editor/types'
import { captureImage } from '@/modules/helper'
import getSaveTestCase from '@/components/save_test_case'

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
//            uiv.desktop.click/type/move    XModule, real OS input
//   page:  uiv.open(url), uiv.eval(code)
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
const POLYFILL = `var uiv = {};
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
  // A finder given {required: false} reports a miss as null. Acting on that
  // null is the single most common way to misuse the option, and the generic
  // "need finite (x, y)" below points at the ACTION, not at the missing check —
  // so name the real mistake here, with the fix.
  if (x === null || x === undefined) {
    throw new Error(fn + ": the finder found no match, so there is nothing to act on. {required: false} makes a miss return null INSTEAD of throwing, which means the result has to be CHECKED: var m = uiv.findImage('file.png', {required: false, timeout: 2}); if (m) { " + fn + "(m); }");
  }
  var offscreen = false
  if (x !== null && typeof x === 'object') {
    frameId = x.frameId || 0
    frameLocal = !!x.frameLocal
    scope = x.scope || ''
    tag = x.tag || ''
    offscreen = !!x.offscreen
    y = x.y
    x = x.x
  }
  if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) { throw new Error(fn + ': need finite (x, y) numbers or a match object from a finder'); }
  // tag travels with the point so the click can skip the navigation watch for
  // elements that cannot navigate (text fields) - see settleAfterClick.
  // offscreen marks a match the finder could NOT scroll into the viewport
  // (position:fixed container larger than the window) - the DOM point
  // actions refuse it with the real reason instead of clicking blind.
  var r = { x: x, y: y, frameId: frameId, frameLocal: frameLocal, scope: scope, tag: tag };
  if (offscreen) { r.offscreen = true; }
  return r;
};
uiv.open = function (url) { return uiv.__bridge('open', { url: String(url) }); };
uiv.eval = function (code) { return uiv.__bridge('eval', { code: String(code) }); };
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
// The DOM finder also takes CONTENT wait-conditions: {hasText: true} retries
// until a match's text/value is NON-EMPTY, {hasText: 'substring'} until it
// contains the substring (case-insensitive), {textMatches: 'regex' | /re/}
// until it matches the regex. Matches are SNAPSHOTS — copies taken at find
// time, never live handles — so these options are THE way to wait for text
// to appear; re-reading a stored match in a loop polls frozen data forever.
uiv.findElements = function (locator, opts) {
  var o = uiv.__opts({ locator: String(locator) }, opts);
  // a RegExp cannot cross the JSON bridge (it stringifies to {}) — send its parts
  if (o.textMatches && typeof o.textMatches === 'object' && o.textMatches.source !== undefined) {
    o.textMatches = {
      source: String(o.textMatches.source),
      flags: o.textMatches.flags !== undefined ? String(o.textMatches.flags) : ((o.textMatches.ignoreCase ? 'i' : '') + (o.textMatches.multiline ? 'm' : ''))
    };
  }
  return uiv.__bridge('elementSearch', o);
};
uiv.findImages = function (image, opts) { return uiv.__bridge('imageSearch', uiv.__opts({ image: String(image) }, opts)); };
uiv.ocr = {};
uiv.ocr.findTexts = function (text, opts) { return uiv.__bridge('textSearch', uiv.__opts({ text: String(text) }, opts)); };
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
  // the rect moves WITH the point - an offset match is the whole match
  // shifted, so uiv.shot.area / uiv.ocr.read({area}) crop where the offset
  // points, not where the anchor was
  if (match.rect) {
    out.rect = { left: match.rect.left + dx, top: match.rect.top + dy, width: match.rect.width, height: match.rect.height };
  }
  return out;
};
uiv.$ = function (locator, opts) { return uiv.__first(uiv.findElements(locator, opts)); };
uiv.$$ = uiv.findElements;
uiv.findElement = uiv.$;
uiv.findImage = function (image, opts) { return uiv.__first(uiv.findImages(image, opts)); };
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
//   uiv.tabs.list()      -> all tabs as [{index, title, url, active, current}, ...]
//   uiv.tabs.select(2)   -> switch to tab #2
//   uiv.tabs.open(url)   -> NEW tab on url (uiv.open navigates the CURRENT tab)
//   uiv.tabs.close()     -> close the current tab, land on its neighbour
uiv.tabs = {};
uiv.tabs.list = function () { return uiv.__bridge('tabsList', {}); };
uiv.tabs.select = function (n) {
  if (typeof n !== 'number' || !isFinite(n)) { throw new Error('uiv.tabs.select: needs a tab number, 1-based left to right — uiv.tabs.list() shows them'); }
  return uiv.__bridge('tabsSelect', { index: n });
};
uiv.tabs.open = function (url) { return uiv.__bridge('tabsOpen', { url: String(url) }); };
uiv.tabs.close = function () { return uiv.__bridge('tabsClose', {}); };
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
// Call it first, before the uiv.open.
uiv.window.focus = function () { return uiv.__bridge('windowFocus', {}); };
// The opposite: minimize the browser AND the IDE, e.g. to automate an
// application sitting behind them.
uiv.window.minimize = function () { return uiv.__bridge('windowMinimize', {}); };
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
uiv.desktop = {};

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

uiv.page.click = function (target, opts) {
  if (opts && opts.button !== undefined && String(opts.button).toLowerCase() !== 'left') {
    throw new Error("uiv.page.click: synthetic DOM clicks are left-button only - a synthetic right-click reaches almost nothing (no native menu, most pages ignore it). Use uiv.browser.click(target, {button: '" + opts.button + "'}) for a trusted click");
  }
  if (typeof target === 'string') { return uiv.__bridge('domClickLocator', { locator: target }); }
  var p = uiv.__xy(target, undefined, 'uiv.page.click');
  uiv.__requireScope(p, 'browser', 'uiv.page.click');
  return uiv.__bridge('domClickAt', p);
};
uiv.page.type = function (target, text) {
  if (arguments.length < 2) { throw new Error("uiv.page.type: needs the field AND the text - uiv.page.type('id=email', 'a@b.com'). To send keystrokes to whatever has focus, use uiv.browser.type(text)"); }
  // a match from a finder is filled where it was FOUND: re-resolving a locator
  // would be slower, and for a match inside a cross-origin frame impossible
  if (target !== null && typeof target === 'object') {
    var p = uiv.__xy(target, undefined, 'uiv.page.type');
    uiv.__requireScope(p, 'browser', 'uiv.page.type');
    p.text = String(text);
    return uiv.__bridge('domTypeAt', p);
  }
  return uiv.__bridge('domType', { locator: String(target), text: String(text) });
};
uiv.page.select = function (locator, option, opts) {
  // Without this the missing option becomes the STRING "undefined" and the
  // call burns the full auto-wait searching the dropdown for an option by
  // that name - reported as "no option matching 'undefined'", which reads
  // like a page problem rather than a typo in the script.
  if (arguments.length < 2) { throw new Error("uiv.page.select: needs the dropdown AND the option - uiv.page.select('id=sort', 'Most recent'). The option is matched by its VISIBLE LABEL; 'value=xyz' or 'index=2' pick it by value or position instead"); }
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
uiv.browser.move = function (x, y) {
  if (typeof x === 'string') { return uiv.browser.move(uiv.__domTarget(x, 'uiv.browser.move')); }
  var p = uiv.__xy(x, y, 'uiv.browser.move');
  uiv.__requireScope(p, 'browser', 'uiv.browser.move');
  if (p.frameLocal) { throw new Error('uiv.browser.move: matches inside cross-origin frames support click only (their coordinates are frame-local); use uiv.img/uiv.ocr for hover'); }
  return uiv.__bridge('bMove', p);
};
// {nav: true}: a click that navigates is waited for automatically, but a
// keyboard submit is not - ENTER returns before the navigation it caused.
// The option turns on the same settle watch the clicks use:
//   uiv.browser.type('\${KEY_ENTER}', {nav: true});   // next call sees the NEW page
uiv.browser.type = function (text, opts) { return uiv.__bridge('bType', uiv.__opts({ text: String(text) }, opts)); };
// Drag: press at one point, release at another. The button stays held between
// the two calls, and every uiv.browser.move in between drags with it — which
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
uiv.desktop.click = function (x, y, opts) {
  if (y !== null && typeof y === 'object' && opts === undefined) { opts = y; y = undefined; }
  var p = uiv.__desktopPoint(x, y, opts, 'uiv.desktop.click');
  var button = uiv.__button(opts, 'uiv.desktop.click');
  if (button) { p.button = button; }
  return uiv.__bridge('xClick', p);
};
uiv.desktop.move = function (x, y, opts) {
  if (y !== null && typeof y === 'object' && opts === undefined) { opts = y; y = undefined; }
  return uiv.__bridge('xMove', uiv.__desktopPoint(x, y, opts, 'uiv.desktop.move'));
};
uiv.desktop.type = function (text) { return uiv.__bridge('xType', { text: String(text) }); };
// drag with real OS input — same press/move/release shape as uiv.browser;
// both coordinate spaces work here too (see uiv.__desktopPoint above)
uiv.desktop.down = function (x, y, opts) {
  if (y !== null && typeof y === 'object' && opts === undefined) { opts = y; y = undefined; }
  return uiv.__bridge('xDown', uiv.__desktopPoint(x, y, opts, 'uiv.desktop.down'));
};
uiv.desktop.up = function (x, y, opts) {
  if (y !== null && typeof y === 'object' && opts === undefined) { opts = y; y = undefined; }
  return uiv.__bridge('xUp', uiv.__desktopPoint(x, y, opts, 'uiv.desktop.up'));
};
uiv.run = function (cmd, target, value) { return uiv.__bridge('run', { cmd: String(cmd), target: target === undefined ? '' : String(target), value: value === undefined ? '' : String(value) }); };
uiv.log = function (text, color) { __uiv_log(String(text), color === undefined ? '' : String(color)); };
uiv.echo = uiv.log;
// ON-PAGE progress banner — uiv.log's sibling for the PERSON WATCHING the
// browser, not the log panel. Shows text (HTML allowed) as an overlay on the
// current page; each call replaces the previous banner. uiv.banner('') hides
// it. Options: {seconds: 5} auto-hide, {position: 'bottom'}.
uiv.banner = function (html, opts) { return uiv.__bridge('banner', uiv.__opts({ html: (html === undefined || html === null) ? '' : String(html) }, opts)); };
uiv.sleep = function (ms) {
  var r = __uiv_pause(ms === undefined ? 0 : ms);
  if (!r.ok) { throw new Error(r.error); }
};
uiv.pause = uiv.sleep;
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
  return uiv.__bridge('shotArea', { rect: { x: x, y: y, width: w, height: h }, scope: target.scope || '', name: String(name) });
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
//   uiv.ai.computerUse  the agent LOOP (screenshot -> action -> repeat), which
//                       CLICKS AND TYPES to carry out a task
//
// ask vs computerUse — not interchangeable. ask is ONE round trip that
// answers a question and touches nothing; computerUse is an agent LOOP that
// clicks and types in the browser until the task is done. Reaching for
// computerUse because ask is unavailable means sending an agent off to ACT
// when all you wanted was an answer.
//
// PROVIDER SUPPORT: all three run on whatever AI is configured — the free
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
// a string) and uiv.shot.* CAPTURES one — listing, testing and deleting do
// none of that. They take a NAME and do not care what is inside it, so they
// live together here instead of being copied into every format namespace.
// That is also what lets a name FLOW: uiv.shot.viewport() hands back a name
// and uiv.files.remove(name) accepts it without the caller ever working out
// which kind of file it was.
//   uiv.files.list()                    every stored file, both tabs
//   uiv.files.exists('article.png')     true/false, never throws
//   uiv.files.remove('results.csv')     delete it from Ui.Vision storage
//   uiv.files.exportToDownloads(name)   copy it to the browser's Downloads
// .csv and .txt are the CSV/TXT tab, .png the Screenshots tab; a name with no
// extension is looked up as .txt, then .csv, then .png.
uiv.files = {};
uiv.files.list = function () { return uiv.__bridge('filesList', {}); };
uiv.files.exists = function (name) { return uiv.__bridge('filesExists', { name: String(name) }); };
uiv.files.remove = function (name) { return uiv.__bridge('filesRemove', { name: String(name) }); };

// Copy a file OUT of Ui.Vision's own storage into the browser's Downloads
// folder. File-type agnostic on purpose — a screenshot, a CSV and the log are
// the same operation, and splitting it across uiv.shot and uiv.csv would have
// made the caller pick a namespace for something that does not care.
//   uiv.exportToDownloads('article.png')
//   uiv.exportToDownloads('results.csv')
//   uiv.exportToDownloads('notes.txt')    raw text from the CSV/TXT tab
//   uiv.exportToDownloads('log')          the run log as a text file
// Also reachable as uiv.files.exportToDownloads — same function, and the
// spelling that reads right next to list/exists/remove. 'log' works only on
// this verb: the run log has no entry to list or delete.
uiv.exportToDownloads = function (name) { return uiv.__bridge('exportToDownloads', { name: String(name) }); };
uiv.files.exportToDownloads = uiv.exportToDownloads;

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
uiv.download = function (what, opts) {
  opts = opts || {};
  var base = { as: opts.as ? String(opts.as) : '', wait: opts.wait !== false };
  if (opts.timeout !== undefined) { base.timeout = Number(opts.timeout); }
  if (typeof what === 'function') {
    uiv.__bridge('downloadArm', base);
    what(); // the script's own trigger — usually a click
    return uiv.__bridge('downloadWait', base);
  }
  // a finder MATCH is none of the three forms — stringified it becomes
  // '[object Object]', which then times out as a locator that can never match
  if (what !== null && typeof what === 'object') {
    throw new Error("uiv.download takes a locator STRING, a URL, or a trigger function - not a finder match. To download an element picked by position, pass the position AS a locator: uiv.download('xpath=(//img)[4]')");
  }
  var s = String(what);
  if (/^(https?|file):/i.test(s)) { base.url = s; } else { base.locator = s; }
  return uiv.__bridge('download', base);
};
uiv.getVar = function (name, fallback) {
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
uiv.clipboard = {
  read: function () { return uiv.__bridge('clipboardRead', {}); },
  write: function (text) { uiv.__bridge('clipboardWrite', { text: text === undefined || text === null ? '' : String(text) }); }
};
` +
// ES6 BUILT-INS. Babel compiles syntax, not library: a script may say
// `rows.includes(x)` and the sandbox (ES5.1) has no such method. These are the
// ones macro code actually reaches for. Each is guarded, so a future
// interpreter that ships them natively wins. Map/Set/Promise are deliberately
// absent — they need real engine support, and the uiv API is synchronous.
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

let running = false
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
    perfStats.maxCmd = cmd
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

async function getTargetTab () {
  let lostPinReason = null
  if (scriptTabId !== null) {
    const pinned = await Ext.tabs.get(scriptTabId).catch(() => null)
    if (isWebTab(pinned)) return pinned
    // re-resolve below — and SAY so: the fallback lands on the focused
    // window's active tab, i.e. whatever the user is looking at, and a run
    // that silently switches tabs mid-flight is a debugging trap
    lostPinReason = pinned ? 'previous pinned tab left the web (browser-internal page)' : 'previous pinned tab was closed'
    scriptTabId = null
  }

  // prefer the focused window's active tab (query without lastFocusedWindow
  // returns one active tab per window, in window order — not recency)
  let tab = null
  const focusedActive = (await Ext.tabs.query({ active: true, lastFocusedWindow: true }).catch(() => [])).filter(isWebTab)
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
    }
  }
  return tab
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
// uiv.open — native implementation
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
    if (!t) return { ok: false, error: 'uiv.open: the tab was closed while the page was loading' }
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
    return { ok: false, error: `uiv.open: '${url}' contains a \${...} token — a JS script passes values directly, e.g. uiv.open('https://example.com/page/' + n)` }
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
  // tabs, so fronting the tab is also what keeps the load from crawling
  try {
    const t = await Ext.tabs.get(tab.id)
    if (!t.active) {
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
      return { ok: false, error: `uiv.open: the browser rejected '${finalUrl}' — ${(e && e.message) || e}` }
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

function defaultFindTimeoutS () {
  const s = parseFloat(store.getState().config.timeoutElement)
  return Number.isFinite(s) && s > 0 ? s : 10
}

// Auto-wait: retry `findOnce` (returns an array) until it yields >=1 match or
// the timeout expires. Throws on timeout unless required === false ([]).
// Errors that retrying cannot fix (missing image file etc.) rethrow at once.
// `describeEmpty` (optional) contributes extra diagnosis to the timeout
// message — e.g. "matches exist but are hidden".
async function retryFind (findOnce, { timeoutS, required, label, retryDelayMs = 500, describeEmpty }) {
  const timeoutMs = (timeoutS || defaultFindTimeoutS()) * 1000
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
        if (/#121|No input image|E90[0-9]|enable OCR|OCR feature disabled/i.test((e && e.message) || '')) throw e
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

      await delayMs(Math.min(retryDelayMs, Math.max(50, deadline - Date.now())))
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

  function resolveElements (loc) {
    var m = /^([A-Za-z]+)=([\s\S]*)$/.exec(loc)
    var strategy = m ? m[1].toLowerCase() : (/^\s*[(/]{1}/.test(loc) ? 'xpath' : 'css')
    var value = m ? m[2] : loc
    var entries = []
    var i
    switch (strategy) {
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
      if (!visible && !(opts && opts.includeHidden)) {
        hiddenCount++
        continue
      }
      withRects.push({
        el: el,
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
      var m = {
        x: Math.round(rc.left + rc.width / 2),
        y: Math.round(rc.top + rc.height / 2),
        rect: { left: Math.round(rc.left), top: Math.round(rc.top), width: Math.round(rc.width), height: Math.round(rc.height) },
        text: ((el.innerText !== undefined ? el.innerText : el.textContent) || '').trim().slice(0, 2000),
        value: el.value !== undefined ? String(el.value).slice(0, 2000) : undefined,
        tag: (el.tagName || '').toLowerCase(),
        visible: withRects[k].visible,
        // frame-local coordinates (cross-origin root): click via DOM path
        frameLocal: !isTopRoot
      }
      if (k === 0 && scrollDefeated) m.offscreen = true
      matches.push(m)
    }
    return { ok: true, matches: matches, hiddenCount: snap.hiddenCount }
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) }
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
    if (strategy === 'id') el = document.getElementById(value)
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
function pageDomClickAt (x, y, expectTag, offscreen) {
  try {
    // A match the finder could not scroll into the viewport (position:fixed
    // container larger than the window — a broken mobile layout; a human in
    // this window cannot click it either). Window-scrolling cannot help (the
    // container is viewport-anchored) and elementFromPoint cannot see outside
    // the viewport, so say what IS possible instead of clicking blind.
    if (offscreen && (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight)) {
      return { ok: false, error: 'this match sits outside the viewport in a position:fixed container larger than the window, so it CANNOT be scrolled into view — a coordinate click cannot reach it (a person in this window cannot click it either). Click it by LOCATOR instead, which dispatches on the element itself without coordinates: uiv.page.click(\'css=...\') — or pin a desktop-size viewport right after uiv.open: uiv.window.resize(1280, 900)' }
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
    var win = window
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
// This is the match-object form of uiv.page.type — the finder already located
// the element, so re-resolving a locator string would be both slower and, for
// a match inside a cross-origin frame, impossible.
//
// Value setting goes through the prototype's native setter before the events
// are fired: React (and anything else tracking its own value) ignores a plain
// `el.value = x` assignment and would re-render the field back to empty.
function pageTypeAt (x, y, text, offscreen) {
  try {
    // unreachable-match refusal — see pageDomClickAt (self-contained copy)
    if (offscreen && (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight)) {
      return { ok: false, error: 'this match sits outside the viewport in a position:fixed container larger than the window, so it CANNOT be scrolled into view - a coordinate action cannot reach it. Type by LOCATOR instead: uiv.page.type(\'css=...\', text) - or pin a desktop-size viewport right after uiv.open: uiv.window.resize(1280, 900)' }
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
    var win = window
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
    if (!el) return { ok: false, error: 'no element at point ' + x + ',' + y + ' any more - the match is STALE: the page scrolled, re-rendered or navigated between the finder and this action. Re-run the finder immediately before acting on it, and never reuse a match across a click, navigation or scroll' }

    var tag = (el.tagName || '').toLowerCase()
    var editable = tag === 'input' || tag === 'textarea'

    if (!editable && !el.isContentEditable) {
      return { ok: false, error: 'the match at ' + x + ',' + y + ' is <' + tag + '>, not a text field - uiv.page.type needs an input, textarea or contenteditable element' }
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

async function elementSearchOnce (tab, args) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: pageElementSearch,
    args: [args.locator, { scroll: args.scroll, includeHidden: args.includeHidden }]
  })

  const frames = (results || []).filter(r => r && r.result)
  if (!frames.length) throw new Error('elementSearch: the page did not answer the search — it is still loading, or it is a page extensions cannot read (chrome://, the Chrome Web Store, a PDF in the viewer, an error page). Wait for the load with uiv.open(url), and on an unreadable page use the visual finders (uiv.findImage / uiv.ocr.findText), which work on pixels instead of the DOM')

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
    matches = matches.concat((r.matches || []).map(m => ({ ...m, frameId: fr.frameId })))
  }
  if (!matches.length && firstError) throw new Error(`elementSearch: ${firstError}`)
  return { matches, hiddenCount }
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
    return ` It searched for a ${Math.round(r.width)}x${Math.round(r.height)} pattern: desktop scope rescales the image from the dpi in its FILE NAME to the screen dpi the XModule reports. If that is not the size '${args.image}' actually is, the XModule's dpi is stale — it reads the display DPI once when it starts, so changing Windows display scaling WITHOUT restarting the browser leaves every '_dpi_' image matched at the wrong size, and nothing can hit. Restart the browser (which restarts the XModule) BEFORE re-capturing any image.`
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
    captureScreenshotService: getCaptureService()
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

async function prepareRunMacro (code) {
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
// per loop iteration. (`uiv.open` used to be the prime example; it is native
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
const E901_NO_TAB = 'E901: no browser tab available to run this in — only browser-internal pages (chrome://, the new-tab page, extension pages) are open, and commands cannot run there. Start the script with uiv.open(url), which creates a normal tab by itself, or switch to a web page first'

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
// playerPlay CLEARS the call stack, so every player-path command (uiv.open,
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
    // player commands (uiv.open / uiv.run / ai / shot) with fast commands
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
    extra: { playHighlightElements, playScrollElementsIntoView },
    ...(cmdFields || {})
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
    // uiv.eval (executeScript storing into __uiv_ret) always read back
    // undefined — the command ran, the value went nowhere.
    applyCommandResultVars(result)

    // askBackgroundToRunCommand derives !RUNTIME from the call stack frame's
    // loop timer, which restarts whenever a player-path command clears the
    // frame. The script's own clock is the honest answer, so it wins.
    getVarsInstance().set({ '!RUNTIME': milliSecondsToStringInSecond(scriptRuntimeMs()) }, true)
    return { ok: true }
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e)
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
  // just uiv.run: uiv.page.type(locator, '${!URL}') renders too.
  const blockedVar = findBlockedVarInText(`${target || ''}\n${value || ''}`)
  if (blockedVar) {
    return {
      ok: false,
      error: `'\${${blockedVar.name}}' cannot be used in a JS script (here: ${cmd}) — ${blockedVar.jsError}`
    }
  }

  const src = state.editor.editing.meta.src
  const macroId = src && src.id

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
  // could reach the uiv.open that would have created one — E901 on line 30 of
  // DesktopClickAccuracyRange, which is precisely the failure the desktop
  // exemption below was added to stop.
  const isTabFreeCmd = /^(store|echo|comment|pause|throwError|XDesktopAutomation|bringBrowserToForeground|bringIDEandBrowserToBackground)$/i.test(cmd) ||
    (isXInputCmd && isDesktopScope)

  const isOpenCmd = /^(open|openBrowser)$/i.test(cmd)

  let tab = await getTargetTab()

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
      if (!t.active) {
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
    title: 'JS Script',
    extra: { scriptSilent: true },
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
        const t = await Ext.tabs.get(bgToPlay).catch(() => null)
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
//   - clicks on elements that cannot navigate (text fields) skip the watch
//   - other clicks watch briefly for a navigation to START, since the click
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
  // access via uiv.eval, and innerHTML never executes <script> anyway
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
    navPending = !!(t && t.status === 'loading')
  }
  if (!navPending) return

  const capMs = (parseFloat(store.getState().config.timeoutPageLoad) || 60) * 1000
  const start = Date.now()
  try {
    while (navPending && Date.now() - start < capMs) {
      if (stopRequested) return
      const t = await Ext.tabs.get(scriptTabId).catch(() => null)
      if (!t) return // tab closed — let the next command report it
      if (t.status === 'complete') {
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

// Elements whose click cannot navigate. Focusing a text field is the single
// most common click in a macro and the one the old flat wait punished worst.
const NON_NAVIGATING_TAGS = /^(input|textarea)$/i

async function settleAfterClick (tag) {
  if (tag && NON_NAVIGATING_TAGS.test(String(tag))) return

  const until = Date.now() + NAV_START_WATCH_MS
  while (!navPending && Date.now() < until) {
    if (stopRequested) return
    await delayMs(25)
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
    if (!m) return { ok: false, error: `uiv.sleep: cannot parse duration '${input}' — pass milliseconds as a number (uiv.sleep(1500)) or a string with a unit: '500ms', '5s', '2m'. (Before adding a sleep at all: finders auto-wait, uiv.open waits for the load, and a click that navigates is waited for — wait for the THING with uiv.$ instead of for a time.)` }
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
      await delayMs(Math.min(200, until - Date.now()))
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
  javascript:       98, // built in, no install
  xmodule:          99, // XModule Local OCR — Windows/macOS only
  ocrspace_engine1:  1,
  ocrspace_engine2:  2,
  ocrspace_engine3:  3
}
const OCR_ENGINE_BY_NUMBER = { 98: 'javascript', 99: 'xmodule', 1: 'ocrspace_engine1', 2: 'ocrspace_engine2', 3: 'ocrspace_engine3' }
const OCR_ENGINE_LIST = Object.keys(OCR_ENGINE_NAMES).map(n => `'${n}'`).join(', ')

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
//   uiv.ocr.read({ image: 'x.png' })     a stored screenshot (classic
//                                        OCRExtractScreenshot)
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

  if (args.image) {
    // a stored screenshot goes through the classic command, which knows how to
    // load the file out of vision storage
    const r = await runOneCommand('OCRExtractScreenshot', String(args.image), '__uiv_ocr_text')
    if (!r.ok) return Promise.reject(new Error(r.error))
    return getVarsInstance().get('__uiv_ocr_text')
  }

  const isDesktop = args.scope === 'desktop'
  const rect = normalizeRectArg(args.area, 'uiv.ocr.read')

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
// runtime. Options by what this install has: the XModule Local OCR ({engine:
// 99}) reads native UI and screenshots far better than the Javascript OCR;
// uiv.ai.ask with a screenshot is a first-class reader too (free with a LOCAL
// model); the OCR.Space cloud OCR (engines 2/3, both auto-detect the text
// language — never 1) needs an API key; with none of those, ASK the user
// about the free ocr.space key rather than settling for the bad read.
function ocrSpaceUpgradeNote () {
  const cfg = store.getState().config || {}
  if ([1, 2, 3].includes(cfg.ocrEngine)) return '' // already reading with OCR.Space
  const xmoduleHint = cfg.ocrEngine == 99
    ? ''
    : " If the RealUser XModule is installed, retry with {engine: 'xmodule'} (XModule Local OCR) — it reads native UI and screenshots far better than the Javascript OCR."
  const aiHint = " uiv.ai.ask('what does ... say?', {images: [uiv.shot.viewport()]}) (uiv.shot.desktop() for screen reads) or uiv.ai.find('the <target>') read what OCR cannot" + (cfg.aiProvider === 'local' ? ' — and with the LOCAL model configured here, at no per-call cost.' : ' (one billable model call each).')
  return cfg.ocrSpaceApiKey
    ? ' BETTER READER AVAILABLE:' + xmoduleHint + " An OCR.Space API key is configured in this install — the cloud OCR (run by the Ui.Vision team) reads far more than the local engines, especially light-on-dark text: {engine: 'ocrspace_engine2'} for finders/anything that clicks (accurate coordinates); {engine: 'ocrspace_engine3'} for pure uiv.ocr.read (best text; coordinates less accurate). Both auto-detect the text language." + aiHint
    : ' BETTER READER AVAILABLE:' + xmoduleHint + aiHint + " Alternatively the OCR.Space cloud OCR reads far more than the local engines — it needs a FREE API key from https://ocr.space/ocrapi, entered under Settings > OCR ({engine: 'ocrspace_engine2'} for finders/clicking, {engine: 'ocrspace_engine3'} for pure reads; both auto-detect the language): ASK the user whether they want the free account — do not silently settle for the bad read."
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

// uiv.files.* — the store verbs. They route by EXTENSION, not by namespace,
// on the same split localStorageExport has always used, so exporting and
// removing the same name can never mean two different files.
const FILE_STORES = [
  { ext: /\.(csv|txt)$/i, get: () => getStorageManager().getCSVStorage(), refresh: () => act.listCSV() },
  { ext: /\.png$/i, get: () => getStorageManager().getScreenshotStorage(), refresh: () => act.listScreenshots() }
]

const fileStoreFor = (fileName) => FILE_STORES.find(s => s.ext.test(fileName)) || null

// Resolve a name to {fileName, fileStore}. `soft` is for the predicate:
// uiv.files.exists must answer false rather than throw, or it cannot be used
// to guard the calls that do throw.
async function resolveStoredFile (name, fn, soft) {
  const n = String(name || '').trim()
  if (!n) throw new Error(`${fn}: a file name is required`)

  // Bare 'log' is the one target exportToDownloads accepts that is not a
  // file: it is rendered from the log state on the spot, so there is nothing
  // to list, test or delete. Only the BARE word is reserved — a stored file
  // really can be called log.txt, and shadowing it here would make a file the
  // user can see in the tab impossible to delete.
  if (/^log$/i.test(n)) {
    if (soft) return null
    throw new Error(`${fn}: 'log' is the run log, not a stored file — uiv.exportToDownloads('log') saves it to the Downloads folder, and that is the only verb it has. A stored file named log needs its extension: ${fn}('log.txt')`)
  }

  const direct = fileStoreFor(n)
  if (direct) return { fileName: n, fileStore: direct }

  if (/\.[a-z0-9]+$/i.test(n)) {
    if (soft) return null
    throw new Error(`${fn}: Ui.Vision does not store '${n}' — .csv and .txt live in the CSV/TXT tab, .png in the Screenshots tab`)
  }

  // no extension: probe in the order text.read resolves, widened to shots
  for (const ext of ['.txt', '.csv', '.png']) {
    const candidate = n + ext
    const fileStore = fileStoreFor(candidate)
    if (await fileStore.get().exists(candidate)) return { fileName: candidate, fileStore }
  }
  // nothing matched — fall back to the .txt default so the caller reports one
  // concrete missing name instead of three maybes
  return soft ? null : { fileName: `${n}.txt`, fileStore: FILE_STORES[0] }
}

// ---------------------------------------------------------------------------
// bridge dispatcher — every op resolves { ok, error?, value?: JSON string }
// ---------------------------------------------------------------------------

const asValue = (v) => ({ ok: true, value: v === undefined ? undefined : JSON.stringify(v) })

// parseTarget's coordinate regex rejects negatives — clamp (an off-viewport
// match center can round below 0) and round to integers
const coordTarget = ({ x, y }) => `${Math.max(0, Math.round(x))},${Math.max(0, Math.round(y))}`

// {button: 'right' | 'middle'} from the polyfill becomes the classic click
// Value ('#right' / '#middle'); absent or 'left' is the empty default. The
// polyfill already validated the name — parseValueForXClick re-checks anyway.
const buttonValue = ({ button }) => (button ? `#${button}` : '')

// Ops that read or act on page content. Each waits for a navigation already in
// flight to finish first — that, not a fixed post-click sleep, is what keeps a
// command from reading the page the previous click just navigated away from.
const PAGE_OPS = /^(eval|elementSearch|imageSearch|textSearch|domClickLocator|domClickAt|domType|domTypeAt|domSelect|bClick|bMove|bDown|bUp|bType|banner)$/

// One "Executing:" line per uiv call, like the classic player writes per
// command. Ops routed through the player (run, ai.*, ocr, shot.*,
// exportToDownloads) already log there — they are NOT in this map, or they
// would log twice. Pure reads (tabs.list, csv.read/exists/list) stay quiet.
// Long runs: the log reducer keeps only the last 500 lines, so an hours-long
// loop rotates the log instead of growing it.
const BRIDGE_OP_LOG_NAMES = {
  open: 'uiv.open',
  eval: 'uiv.eval',
  elementSearch: 'uiv.$',
  imageSearch: 'uiv.findImage',
  textSearch: 'uiv.ocr.findText',
  domClickLocator: 'uiv.page.click',
  domClickAt: 'uiv.page.click',
  domType: 'uiv.page.type',
  domTypeAt: 'uiv.page.type',
  domSelect: 'uiv.page.select',
  bClick: 'uiv.browser.click',
  bMove: 'uiv.browser.move',
  bDown: 'uiv.browser.down',
  bUp: 'uiv.browser.up',
  bType: 'uiv.browser.type',
  xClick: 'uiv.desktop.click',
  xMove: 'uiv.desktop.move',
  xDown: 'uiv.desktop.down',
  xUp: 'uiv.desktop.up',
  xType: 'uiv.desktop.type',
  tabsSelect: 'uiv.tabs.select',
  tabsOpen: 'uiv.tabs.open',
  tabsClose: 'uiv.tabs.close',
  windowResize: 'uiv.window.resize',
  csvWrite: 'uiv.csv.write',
  csvAppend: 'uiv.csv.append',
  textWrite: 'uiv.text.write',
  filesRemove: 'uiv.files.remove',
  shotArea: 'uiv.shot.area',
  banner: 'uiv.banner',
  download: 'uiv.download',
  downloadArm: 'uiv.download (arm)',
  downloadWait: 'uiv.download (wait)'
}

function logBridgeCall (op, args) {
  const name = BRIDGE_OP_LOG_NAMES[op]
  if (!name) return
  let detail = ''
  try {
    detail = JSON.stringify(args)
    if (detail === '{}') detail = ''
    else if (detail.length > 150) detail = detail.slice(0, 150) + '…'
  } catch (e) { /* unserializable args stay blank */ }
  store.dispatch(act.addLog('info', `Executing: ${name} ${detail}`.trim()))
}

// The tail of uiv.download: block until the armed download completes (the
// download manager rejects on its own timeout), then return the name the file
// actually got on disk. DOWNLOAD_COMPLETE writes !LAST_DOWNLOADED_FILE_NAME
// panel-side a beat after the wait unblocks — hence the short poll.
async function waitForArmedDownload (wait, timeoutS) {
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
  } finally {
    clearInterval(tick)
    emit('wait', null)
  }
  const vars = getVarsInstance()
  const deadline = Date.now() + 3000
  while (!vars.get('!LAST_DOWNLOADED_FILE_NAME') && Date.now() < deadline) {
    await delayMs(100)
  }
  return asValue(vars.get('!LAST_DOWNLOADED_FILE_NAME') || '')
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

async function dispatchBridge (op, args) {
  logBridgeCall(op, args)
  // keep the script's clock honest on EVERY uiv call — the guide-recommended
  // poll-loop guard parseFloat(uiv.getVar('!RUNTIME')) hung forever when the
  // loop body only contained ops that skipped the classic-path update at
  // handleRunResult (e.g. ocr.read({scope: 'desktop'}) + sleep)
  try { getVarsInstance().set({ '!RUNTIME': milliSecondsToStringInSecond(scriptRuntimeMs()) }, true) } catch (e) { /* best-effort */ }
  if (PAGE_OPS.test(op)) await awaitPageQuiet()

  switch (op) {
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
      const r = await runOneCommand('executeScript', args.code, '__uiv_ret', null, { fast: true })
      if (!r.ok) return r
      return asValue(vars.get('__uiv_ret'))
    }

    case 'elementSearch': {
      const tab = await getTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
      const locErr = scriptLocatorError(args.locator)
      if (locErr) return { ok: false, error: `findElements: ${locErr}` }
      const content = elementContentCheck(args)
      let hiddenCount = 0
      let contentMissCount = 0
      let contentMissSeen = ''
      const matches = await retryFind(
        async () => {
          const r = await elementSearchOnce(tab, args)
          hiddenCount = r.hiddenCount
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
          describeEmpty: () => {
            if (content && contentMissCount > 0) {
              return `${contentMissCount} element(s) DO match the locator but their text/value never satisfied {${content.label}} — last seen: ${JSON.stringify(contentMissSeen)}`
            }
            return hiddenCount > 0
              ? `${hiddenCount} matching element(s) DO exist but are HIDDEN (collapsed/invisible, e.g. a responsive search box or menu behind a toggle — the side panel narrows the page). Reveal it first (click the toggle/icon that opens it), or pass {includeHidden: true} if you only need to READ it`
              : ''
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
      // a banner in the capture can occlude the match — see withBannerHidden
      const matches = await withBannerHidden(() => retryFind(
        () => imageSearchOnce(args),
        {
          timeoutS: args.timeout,
          required: args.required,
          label: `findImages('${args.image}')`,
          describeEmpty: () => describeImageMiss(args)
        }
      ))
      const scope = args.scope === 'desktop' ? 'desktop' : 'browser'
      return asValue(matches.map(m => ({ ...m, scope })))
    }

    case 'textSearch': {
      // each attempt is a full OCR conversion (potentially a cloud API call
      // that counts against the user's quota) — pace retries accordingly
      // "not found" by OCR is ambiguous in a way no other finder's is: the text
      // may be absent, or present and MISREAD. Retrying cannot tell those apart
      // and neither can a longer timeout — only the recognised text can. The
      // pass already produced it, so the miss reports it instead of leaving the
      // caller to guess and fail slower.
      let lastOcrText = ''
      // withBannerHidden: banner text in the capture would come back as
      // phantom OCR words
      const matches = await withBannerHidden(() => retryFind(
        async () => {
          const r = await textSearchOnce(args)
          lastOcrText = r.text
          return r.matches
        },
        {
          timeoutS: args.timeout,
          required: args.required,
          label: `ocr.findTexts('${args.text}')`,
          retryDelayMs: 2000,
          describeEmpty: () => {
            const seen = summariseOcrText(lastOcrText)
            if (!seen) {
              return `OCR recognised NO text at all here, so this is an OCR problem rather than a search problem: check the engine and language under Settings > OCR (or pass {engine, language}), and make sure the page is actually visible.${ocrSpaceUpgradeNote()}`
            }
            return `a search can only match what OCR RECOGNISED, which on this page was: "${seen}" — and no longer timeout changes that text. Is your word in there? If NOT, this engine cannot read it here — which is not a reason to stop targeting by text, only to change the READER. Two ways: (1) uiv.ai.find('the blue "Accept all" button') hands back a match like any finder, and the model reads what the local engine cannot, so no image file is needed (it does not auto-wait and each call is billable — wait for the page yourself first); (2) save a picture of the target (the Image button in Script tools, or uiv.shot.area from a script) and use uiv.findImage('file.png'), which compares pixels and ignores the font. Either fixes it; a longer timeout and different wording do not. The built-in Javascript OCR loses light-on-dark button labels ("Accept all" white on blue) and small glyphs most often, and those are exactly the things a picture matches perfectly. Second best, when a picture is awkward: ANCHOR ON A WORD OCR DID READ and step to the target from there — every word listed above is a candidate, and the recognised text is exactly the menu to pick from. uiv.browser.click(uiv.offset(uiv.ocr.findText('Privacy Policy'), 420, -30)) — the JS answer to the classic word#R420,-30 relative target, composed from a finder plus uiv.offset rather than a relative command: unreadable buttons usually sit a fixed distance from perfectly readable body text. (If the element is in the DOM, a locator beats both.)${ocrSpaceUpgradeNote()} Only if you CAN see the word in the recognised text but spelled differently is ocr.findText still the right tool — then match the misreading with wildcards, which work per word: uiv.ocr.findText('Acc*pt all')`
          }
        }
      ))
      const scope = args.scope === 'desktop' ? 'desktop' : 'browser'
      return asValue(matches.map(m => ({ ...m, scope })))
    }

    // --- dom tier: content script, synthetic events -------------------------
    // The classic click/type commands. No CDP attach, no XModule, and `type`
    // sets the value in ONE command — no separate click to focus the field
    // first, which is what makes it the fast path for form filling.
    case 'domClickLocator': {
      const r = await withElementWaitCountdown(
        `uiv.page.click('${String(args.locator).slice(0, 80)}')`,
        () => runOneCommand('click', args.locator, '', null, { fast: true })
      )
      if (!r.ok) return r
      await settleAfterClick(null)
      return asValue(undefined)
    }

    case 'domType': {
      const r = await withElementWaitCountdown(
        `uiv.page.type('${String(args.locator).slice(0, 80)}')`,
        () => runOneCommand('type', args.locator, args.text, null, { fast: true })
      )
      return r.ok ? asValue(undefined) : r
    }

    // uiv.page.type(match, text) — fill the field the finder already located,
    // in its own frame (works for cross-origin frames, where a locator cannot
    // reach). Same tier as domType: DOM value + input/change events, no CDP.
    case 'domTypeAt': {
      const tab = await getTargetTab()
      if (!tab) return { ok: false, error: E901_NO_TAB }
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [args.frameId || 0] },
        func: pageTypeAt,
        args: [Math.round(args.x), Math.round(args.y), String(args.text), !!args.offscreen]
      })
      const r = results && results[0] && results[0].result
      if (!r) return { ok: false, error: `uiv.page.type: frame ${args.frameId} did not answer — it was removed or navigated between the finder and this call, so the match is stale. Re-run the finder right before typing (a match from before a click or navigation cannot be used afterwards)` }
      if (!r.ok) return { ok: false, error: `uiv.page.type: ${r.error}` }
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
        args: [Math.round(args.x), Math.round(args.y), args.tag || '', !!args.offscreen]
      })
      const r = results && results[0] && results[0].result
      if (!r) return { ok: false, error: `uiv.page.click: frame ${args.frameId} did not answer — it was removed or navigated between the finder and this call, so the match is stale. Re-run the finder right before clicking (a match from before a click or navigation cannot be used afterwards)` }
      if (!r.ok) return { ok: false, error: `uiv.page.click (frame ${args.frameId}): ${r.error}` }
      if (args.frameId) store.dispatch(act.addLog('echo', `DOM click in frame ${args.frameId} (<${r.tag}>)`))
      await settleAfterClick(r.tag || args.tag)
      return asValue(undefined)
    }

    // --- browser tier: CDP (B family) ---------------------------------------
    // Trusted input with no XModule install needed, viewport CSS px consumed
    // as-is (no side-panel or DPI correction — sendCdpMouseEvent passes x/y
    // straight to Input.dispatchMouseEvent). spExtra pins browser
    // interpretation so a desktop !CVSCOPE cannot re-read "x,y" as screen px.
    case 'bClick': {
      const r = await runOneCommand('BClick', coordTarget(args), buttonValue(args), { spExtra: { isDesktop: false } }, { fast: true })
      if (!r.ok) return r
      await settleAfterClick(args.tag)
      return asValue(undefined)
    }

    case 'bMove': {
      const r = await runOneCommand('BMove', coordTarget(args), '', { spExtra: { isDesktop: false } }, { fast: true })
      return r.ok ? asValue(undefined) : r
    }

    // press / release, so a drag can span several calls: down holds the
    // button, every bMove while it is held drags, up releases (see
    // uiv.browser.down)
    case 'bDown':
    case 'bUp': {
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
      const r = await runOneCommand('XClick', coordTarget(args), buttonValue(args), { spExtra: { isDesktop: args.scope !== 'browser' } }, { fast: true })
      if (!r.ok) return r
      // an OS-level click can land anywhere, including outside the browser —
      // only watch the tab when it plausibly hit the page
      await settleAfterClick(args.tag)
      return asValue(undefined)
    }

    case 'xMove': {
      const r = await runOneCommand('XMove', coordTarget(args), '', { spExtra: { isDesktop: args.scope !== 'browser' } }, { fast: true })
      return r.ok ? asValue(undefined) : r
    }

    case 'xDown':
    case 'xUp': {
      const r = await runOneCommand('XMove', coordTarget(args), op === 'xDown' ? '#down' : '#up',
        { spExtra: { isDesktop: args.scope !== 'browser' } }, { fast: true })
      return r.ok ? asValue(undefined) : r
    }

    case 'xType': {
      const r = await runOneCommand('XType', args.text, '', null, { fast: true })
      return r.ok ? asValue(undefined) : r
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
          throw new Error(foundFrames[0].error || `uiv.page.select: found the dropdown but could not pick '${args.option}' — no reason reported. Check the option exists (the error normally lists the available labels), or select it by 'value=…' / 'index=N' instead`)
        },
        { timeoutS: args.timeout, required: args.required, label: `uiv.page.select('${args.locator}', '${args.option}')` }
      )
      if (hit) {
        store.dispatch(act.addLog('echo', `select: '${hit.label}' chosen (value=${hit.value})`))
        // changing a select often reloads/navigates (sort orders, filters);
        // <select> itself never navigates on click, so ask for the watch
        // explicitly rather than through the tag shortcut
        await settleAfterClick(null)
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
      if (args.nav) await settleAfterClick(null)
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
      const query = cur ? { windowId: cur.windowId } : {}
      // `current` = the script's tab, the position read that replaces the
      // table-macro !CURRENT_TAB_NUMBER variable (stale next to these calls,
      // so getVar refuses it). `active` = the browser's active tab; they
      // differ if the user clicks another tab mid-run.
      const info = (t, i, curId) => ({ index: i + 1, title: t.title || '', url: t.url || '', active: !!t.active, current: t.id === curId })

      if (op === 'tabsList') {
        const tabs = await Ext.tabs.query(query)
        return asValue(tabs.map((t, i) => info(t, i, cur && cur.id)))
      }

      if (op === 'tabsSelect') {
        const n = args.index
        const tabs = await Ext.tabs.query(query)
        if (!Number.isInteger(n) || n < 1 || n > tabs.length) {
          return { ok: false, error: `uiv.tabs.select: tab ${n} does not exist — the window has ${tabs.length} tab(s), numbered 1..${tabs.length} left to right (uiv.tabs.list() shows them). The index is ABSOLUTE, unlike the classic selectWindow's start-tab-relative counting` }
        }
        const t = tabs[n - 1]
        if (!isWebTab(t)) {
          return { ok: false, error: `uiv.tabs.select: tab ${n} is a browser-internal page (${t.url || 'no url'}) — commands cannot run there, so refusing to switch to it` }
        }
        await Ext.tabs.update(t.id, { active: true })
        scriptTabId = t.id
        store.dispatch(act.addLog('info', `script tab → #${n} "${(t.title || t.url || '').slice(0, 50)}"`))
        return asValue(info(t, n - 1, t.id))
      }

      if (op === 'tabsOpen') {
        // a NEW tab on the url — uiv.open navigates the CURRENT tab instead
        const t = await Ext.tabs.create(cur ? { url: args.url, windowId: cur.windowId } : { url: args.url })
        const deadline = Date.now() + 30000
        let loaded = t
        try {
          while (Date.now() < deadline) {
            if (stopRequested) return { ok: false, error: 'Script stopped' }
            const now = await Ext.tabs.get(t.id).catch(() => null)
            if (!now) return { ok: false, error: 'uiv.tabs.open: the new tab was closed before it finished loading' }
            loaded = now
            if (now.status === 'complete') break
            // same status-bar countdown the other page loads show
            emit('wait', { label: 'tabs.open — page loading', remainingS: Math.ceil((deadline - Date.now()) / 1000) })
            await delayMs(200)
          }
        } finally {
          emit('wait', null)
        }
        scriptTabId = t.id
        const tabs = await Ext.tabs.query(cur ? { windowId: cur.windowId } : {})
        const idx = Math.max(0, tabs.findIndex(x => x.id === t.id))
        store.dispatch(act.addLog('info', `script tab → #${idx + 1} (new) "${(loaded.title || loaded.url || '').slice(0, 50)}"`))
        return asValue(info(loaded, idx, t.id))
      }

      // tabsClose: close the current tab, land on whatever the browser
      // activates next (its neighbour), re-pin, report where we are
      if (!cur) return { ok: false, error: 'uiv.tabs.close: no current tab to close' }
      await Ext.tabs.remove(cur.id).catch(() => {})
      scriptTabId = null
      const next = await getTargetTab()
      if (!next) return asValue(null)
      const tabs = await Ext.tabs.query({ windowId: next.windowId })
      const idx = Math.max(0, tabs.findIndex(x => x.id === next.id))
      store.dispatch(act.addLog('info', `script tab → #${idx + 1} "${(next.title || next.url || '').slice(0, 50)}" (previous tab closed)`))
      return asValue(info(next, idx, next.id))
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

      for (;;) {
        await csIpc.ask('PANEL_BRING_PLAYING_WINDOW_TO_FOREGROUND')
        attempt++

        // Ask BOTH documents. The question is "is the browser the active
        // application", and either surface answering yes settles it — but
        // neither answers it alone. The side panel runs this code, and while
        // IT holds the keyboard focus the play tab's hasFocus() is false even
        // with the browser frontmost; that false negative failed every
        // panel-driving demo (ClearSidebarLogViaGUI_*, which click the panel
        // itself) while OpenBrowserDevTools, whose focus sits in the page,
        // passed in the same run. When another APPLICATION is in front, both
        // are false — which is the case this guard exists for.
        if (document.hasFocus()) return asValue(undefined)

        const r = await runOneCommand('executeScript', 'return document.hasFocus()', '__uiv_focus', null, { fast: true })
        if (r.ok && vars.get('__uiv_focus') === true) return asValue(undefined)

        // One OS-level attempt, after the cheap path has visibly failed. A
        // zero exit from `open -b` means macOS ACTIVATED the app, and that is
        // a stronger answer than hasFocus() can give: focus may legitimately
        // sit somewhere neither document can see — DevTools being the case
        // that bit here, where the browser is plainly frontmost (its console
        // had just accepted typed input) yet page and panel both report false.
        // Accept the OS's word for it.
        if (attempt >= 2 && await osActivateOnMac()) return asValue(undefined)

        if (Date.now() >= deadline) {
          return {
            ok: false,
            error: `uiv.window.focus(): the browser did not come to the front after ${attempt} attempts — another application still has it. ` +
              `Real OS input (uiv.desktop.click / .type, XClick / XType) goes to the FOCUSED window, so continuing would send clicks and keystrokes into that other application instead of the browser. ` +
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
      const r = await runOneCommand('localStorageExport', args.name, '')
      return r.ok ? asValue(args.name) : r
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
    case 'download':
    case 'downloadArm': {
      const vars = getVarsInstance()
      const wait = args.wait !== false
      const timeoutS = args.timeout != null ? parseFloat(args.timeout) : (parseFloat(vars.get('!TIMEOUT_DOWNLOAD')) || 60)
      const startS = parseFloat(vars.get('!TIMEOUT_WAIT')) || 10
      await csIpc.ask('PANEL_ON_DOWNLOAD', {
        fileName: args.as || '',
        wait,
        timeout: timeoutS * 1000,
        timeoutForStart: startS * 1000
      })
      // a name left over from an earlier download must not read as this one's
      vars.set({ '!LAST_DOWNLOADED_FILE_NAME': '' }, true)
      if (op === 'downloadArm') return asValue(undefined)

      if (args.url) {
        // plain URL: straight to chrome.downloads in the background
        await csIpc.ask('PANEL_DOWNLOAD_URL', { url: String(args.url) })
      } else {
        // locator: the classic saveItem does the element resolution (all
        // frames) and href/src extraction — proven plumbing, reused as is
        const r = await runOneCommand('saveItem', args.locator, '')
        if (!r.ok) return r
      }
      return waitForArmedDownload(wait, timeoutS)
    }

    case 'downloadWait': {
      const vars = getVarsInstance()
      const timeoutS = args.timeout != null ? parseFloat(args.timeout) : (parseFloat(vars.get('!TIMEOUT_DOWNLOAD')) || 60)
      return waitForArmedDownload(args.wait !== false, timeoutS)
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
        await runAiCommand('aiScreenXY', args.question)
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
      return asValue({ x: Math.round(x), y: Math.round(y), scope })
    }

    case 'aiComputerUse': {
      const value = await runAiCommand('aiComputerUse', args.task)
      return asValue(value)
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
      // both stores, one flat list of FILE names — folders are entries too
      // (Entry carries isDirectory), and a folder is not something the other
      // uiv.files verbs can act on
      const lists = await Promise.all(FILE_STORES.map(s => s.get().list()))
      const names = lists.reduce((all, files) => {
        return all.concat((files || []).filter(f => !f.isDirectory).map(f => f.name))
      }, [])
      return asValue(names.filter(Boolean).sort())
    }

    case 'filesExists': {
      const hit = await resolveStoredFile(args.name, 'uiv.files.exists', true)
      return asValue(hit ? await hit.fileStore.get().exists(hit.fileName) : false)
    }

    case 'filesRemove': {
      const { fileName, fileStore } = await resolveStoredFile(args.name, 'uiv.files.remove')
      if (!(await fileStore.get().exists(fileName))) {
        throw new Error(`uiv.files.remove: '${fileName}' does not exist — uiv.files.list() shows what is there, uiv.files.exists('${fileName}') tests without throwing`)
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

    case 'textWrite':
      return asValue(await textWriteRaw(args.file, args.text))

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

  const state = store.getState()
  const engine = engineAsked !== undefined ? engineAsked : state.config.ocrEngine
  const lang = String(args.language || state.config.ocrLanguage || 'eng').toLowerCase()

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

  // rebase OCR word coords to viewport CSS px (offset is {0,0} for the
  // 'viewport' search area, but keep the rebase for correctness)
  const rebased = safeUpdateIn(
    ['[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
    (w) => ({ ...w, Top: w.Top + viewportOffset.y, Left: w.Left + viewportOffset.x }),
    (response && response.ParsedResults) || []
  )

  const { all } = searchTextInOCRResponse({
    text: args.text,
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

  // hand the recognised text back with the matches: on a miss it is the whole
  // diagnosis, and this pass already paid for it
  return { matches, text: parsedResultsToText(response) }
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
        break
      }
      default:
        return { ok: false, error: `unknown finder '${kind}'` }
    }

    // SHOW the matches. Two different surfaces, because the coordinates live
    // in two different spaces.
    //
    // Screen search: the rects are SCREEN pixels, so drawing them inside the
    // page would point at an unrelated spot. The desktop screenshot editor is
    // the surface that CAN show them — it opens the capture the search just
    // took (searchVision saves it as __lastdesktopscreenshot) and draws the
    // boxes on it, which is the same thing the classic visual commands show in
    // debug mode. Best match first, so it is the one highlighted.
    if (onDesktop && matches.length) {
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
          scoredRects: matches.map((m, i) => ({
            type: i === 0 ? DesktopScreenshot.RectType.BestMatch : DesktopScreenshot.RectType.Match,
            index: i,
            x: m.rect.left,
            y: m.rect.top,
            width: m.rect.width,
            height: m.rect.height,
            score: m.score
          }))
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
    const displayName = { elementSearch: 'findElements', imageSearch: 'findImages', textSearch: 'ocr.findTexts' }[kind] || kind
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

function buildInterpreter (code) {
  // node.loc is required for line highlighting
  Interpreter.PARSE_OPTIONS = Interpreter.PARSE_OPTIONS || {}
  Interpreter.PARSE_OPTIONS.locations = true

  const vars = getVarsInstance()

  const interpreter = new Interpreter(POLYFILL + code, (interp, globalObject) => {
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
  // uiv.eval, and the classic player runs user regexes natively too — the
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
  stopRequested = false
  firstCommandDone = false
  paused = false
  pauseRequested = false
  runToLine = typeof opts.runToLine === 'number' ? opts.runToLine : null
  scriptTabId = null // each run pins its tab chain fresh
  scriptBaseTabId = null // ... and a fresh base for relative tab=N locators
  scriptScopeOverrides = {} // ... and no leftover setVar'd timeouts
  scriptSessionActive = false // ... and a fresh command session
  scriptSessionStale = false
  scriptFrameId = null
  scriptStartedAt = Date.now() // wall clock for the end-of-run Runtime line
  perfReset()
  armNavigationWatcher() // one listener for the run; see settleAfterClick
  emit('status', 'running')
  // hold the automation tab mark for the whole script: without this, every
  // uiv.* call would group/ungroup the tab and re-inject the border
  csIpc.ask('PANEL_SCRIPT_RUN_MARK', { marked: true }).catch(() => { /* cosmetic */ })
  // name the script in the log, like the table player's "Playing macro X" —
  // with several macros in a session, an unnamed start line is ambiguous
  const scriptName = (() => {
    try {
      const src = store.getState().editor.editing.meta.src
      return src && src.name && src.name.length ? src.name : 'Untitled'
    } catch (e) {
      return 'Untitled'
    }
  })()
  store.dispatch(act.addLog('status', `${scriptName} started`))
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
    const prepared = await prepareRunMacro(code)
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
    error = `Cannot prepare the macro for the script run: ${(e && e.message) || e}`
  }

  // ES6+ -> ES5 for the sandbox. Babel is lazy-loaded here, so a session that
  // never runs a script never pays for it. `scriptLineMap` then translates
  // every reported position back to the line the user wrote — the debugger
  // (marker, breakpoints, error lines) works on user lines throughout.
  let runnableCode = code
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
      const merged = await resolveIncludes(code, src && src.id)
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
    try {
      const compiled = await transpileScript(mergedCode)
      runnableCode = compiled.code
      scriptLineMap = compiled.lineMap
    } catch (e) {
      // syntax errors and the async/await rejection land here; Babel reports
      // positions in the user's own source, so they need no offsetting
      error = (e && e.message) || String(e)
      if (e && typeof e.scriptLine === 'number') errorLine = e.scriptLine
    }
  }

  let interp = null
  try {
    if (!error) interp = buildInterpreter(runnableCode)
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
      errorLine = lastLine
      errorWhere = lastWhere
    }
  }

  running = false
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

  perfSummary()

  // total wall clock, worded like the table macro's end line ("Macro completed
  // (Runtime 3.02s)") so both macro types read the same in the log
  const runtime = milliSecondsToStringInSecond(scriptRuntimeMs())
  try { getVarsInstance().set({ '!RUNTIME': runtime }, true) } catch (e) { /* best-effort */ }

  if (ok) {
    if (exitRequested !== null) {
      store.dispatch(act.addLog('info', `${scriptName} ended early by uiv.exit${exitRequested ? `: ${exitRequested}` : ''}`))
    }
    store.dispatch(act.addLog('info', `${scriptName} completed (Runtime ${runtime})`))
  } else {
    store.dispatch(act.addLog('error', `${scriptName} ${error === 'Script stopped' ? 'stopped' : 'failed'}: ${error}${errorWhere ? ` (${errorWhere})` : (errorLine ? ` (line ${errorLine})` : '')} (Runtime ${runtime})`))
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
    if (src && src.id && typeof editing.script === 'string' && error !== 'Script stopped') {
      store.dispatch(act.updateMacroPlayStatus(src.id, ok ? MacroResultStatus.Success : MacroResultStatus.Error))
    }
  } catch (e) { /* badge is best-effort */ }

  emit('status', 'stopped')
  emit('done', { ok, error, errorLine })
  return { ok, error, errorLine }
}
