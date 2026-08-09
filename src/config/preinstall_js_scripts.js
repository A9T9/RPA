// JS script macro demos (V11 prototype, branch js-macro-test1).
// Single source for BOTH the Examples dropdown in the script view AND the
// preinstalled files in the tree's "Demo and QA Test Scripts" folder. File
// names end in ".js" —
// the suffix marks a script macro in the tree (JS badge icon); the macro
// data's `Script` field is what actually routes it to the JS editor.
//
// The demos are written in MODERN JavaScript (see js_transpile.js): const/let,
// arrow functions, template literals, destructuring, for...of. Two things to
// remember when editing them here: they live inside a JS template literal, so
// a backtick must be written \` and an interpolation \${...} — and the demo
// itself must not use async/await (every uiv.* call already waits).

// Starter script: shown in the never-saved Untitled JS editor — a runnable
// mini tutorial of the uiv.* API. "+ Macro" does NOT use this; a macro the
// user explicitly asked for starts empty (see NEW_MACRO_SCRIPT below).
export const STARTER_SCRIPT = `// Ui.Vision JS script - modern JavaScript
// (let/const, arrows, \`template literals\`, destructuring, for...of, classes;
//  no async/await - every uiv.* call already waits for its command)
// FIND, DOM world (locators: css= id= name= link= xpath= ; bare string = css):
//   uiv.$('css=h1')            -> FIRST match {x, y, rect, text, value, ...}
//   uiv.$$('css=tr')           -> ALL matches (array)
//   All find in every frame (even cross-origin) + open shadow roots,
//   auto-wait and throw if nothing appears ({timeout: 5, required: false}).
// FIND, VISUAL world (pixels - anything the eye sees):
//   uiv.findImage('button.png')      -> first computer-vision match
//   uiv.ocr.findText('Checkout')        -> first OCR text match
// ACT - pick the tier that fits; they differ in what the page believes:
//   uiv.page.type('id=email', 'a@b.com')     FASTEST: fills a field in ONE step
//   uiv.page.click('css=#buy')               synthetic event; some sites ignore it
//   uiv.browser.click('css=#buy')           TRUSTED click (CDP), no XModule
//   uiv.browser.click(uiv.findImage('buy.png'))   a visual click is always explicit
//   uiv.browser.type('text')                keystrokes into the FOCUSED element
//   uiv.desktop.click(m) / .type(t)         real OS input (XModule, screen px)
//   3+ calls of the same tier in a row? Alias it once and keep it readable:
//     const p = uiv.page, b = uiv.browser, x = uiv.desktop;
//     p.type('id=email', 'a@b.com');  b.click(uiv.findImage('buy.png'));
// NAVIGATE: uiv.open(url)   uiv.eval('return document.title')
//           the current URL is uiv.eval('return location.href') — !URL is table-macros-only
// MISC: uiv.log(msg, 'green')   uiv.sleep('1s')   uiv.getVar('!LASTCOMMANDOK')   uiv.setVar('n', 1)
//       uiv.exit('reason')  -> end the run EARLY AS A SUCCESS (guard clauses;
//       a failed check still uses throw new Error(...))
// FILES (the CSV/TXT tab): uiv.csv.read/write/append   parsed rows as 2D arrays
//        uiv.text.read/write   the same files RAW - one-per-line lists:
//        uiv.text.read('prompts.txt').split(/\\r?\\n/).map(s => s.trim()).filter(Boolean)
// Long forms with options: uiv.findElements / findImages / ocr.findTexts
// LEGACY bridge (any classic command): uiv.run(command, target, value)

uiv.open('https://ui.vision/');
const title = uiv.eval('return document.title');
uiv.log(\`Page title: \${title}\`);

const headlines = uiv.$$('css=h2', { required: false });
uiv.log(\`Found \${headlines.length} h2 elements\`);

headlines.slice(0, 3).forEach((h, i) => {
  uiv.log(\`h2 #\${i + 1}: \${h.text}\`);
});

if (headlines.length > 0 && uiv.getVar('!BROWSER') !== 'firefox') {
  // hover the first one — CDP input, so Chrome/Edge only
  uiv.browser.move(headlines[0]);
}
`

// What "+ Macro" writes. Deliberately NOT the starter script above: that one
// is a tutorial to read, and having to delete 40 lines of it before writing
// anything is the wrong way to begin a macro you already know you want. The
// tutorial still greets the never-saved Untitled editor, where there is
// nothing else to show.
export const NEW_MACRO_SCRIPT = `// New macro — runnable uiv.* examples are in the Demos folder
`

// The three macros a FRESH INSTALL ships with (written to the tree root as
// "A short welcome tour.js", "Like Ui.Vision？Give us a star 🌟.js" (fullwidth
// ？ — the ASCII one is illegal in Windows file names and sanitizeFileName
// strips it, and macros are real files in hard-drive storage mode) and
// "Draw a cat🐱.js" — see installWelcomeMacro in actions/index.js). All are
// also part of the JS demo set below, so the restore button brings them back
// after the user deletes the root copies.
export const WELCOME_SCRIPT = `// A little guided tour of Ui.Vision — and of uiv.banner, the on-page
// overlay that tells the PERSON WATCHING what the macro is doing
// (uiv.log talks to the log panel; uiv.banner talks to the human).
// The banner survives page navigation and each call replaces the last one.
// The 3s sleeps here are PRESENTATION pauses so the tour is easy to follow —
// a working macro needs none of them (finders auto-wait).
uiv.open('https://ui.vision/');
uiv.banner('Welcome to Ui.Vision');
uiv.sleep('3s');

uiv.open('https://ui.vision/contact');
uiv.page.type('id=ContactName', 'Robby the Robot');
uiv.page.type('id=Email', 'robby.the.robot@example.com');
// banners take HTML — style what matters — and a green success tone
uiv.banner('Ui.Vision can do many things, for example <b style="color:#389e0d">fill out forms for you</b>', { tone: 'green' });
uiv.sleep('3s');

uiv.open('https://forum.ui.vision/');
uiv.banner('If you have any question or suggestion, the user forum is a great place to meet other users and the developers');
// the last banner stays visible for a few seconds after the run ends
`

// Preinstalled next to the welcome tour. Stars the Ui.Vision repo on GitHub —
// and doubles as a demo of uiv.banner plus finder-based state detection on a
// CSP-strict site (GitHub blocks uiv.eval, so everything is read through DOM
// finders instead).
export const STAR_SCRIPT = `// Star the Ui.Vision RPA project on GitHub — narrated with uiv.banner.
// GitHub's CSP forbids uiv.eval on its pages, so everything is read
// through DOM finders (content-script world) instead.
uiv.open('https://github.com/A9T9/RPA');
uiv.banner('Off to GitHub to star the Ui.Vision RPA project…');

// GitHub marks the login state on <body> itself: class "logged-in" vs "logged-out"
if (!uiv.findElements('css=body.logged-in', { required: false, timeout: 3 }).length) {
  uiv.banner('<b>Thanks for trying to star the project!</b> Sadly you are not logged in to GitHub — please sign in and run me again.', { seconds: 10 });
} else if (uiv.findElements('xpath=//button[starts-with(normalize-space(.), "Starred")]', { required: false, timeout: 1 }).length) {
  // the header button reads "Starred <count>" when the repo is already starred
  uiv.banner('Thank you, you already starred it :)', { tone: 'green' });
} else {
  uiv.banner('Clicking the Star button for you…');
  uiv.page.click('xpath=//button[starts-with(normalize-space(.), "Star") and not(starts-with(normalize-space(.), "Starred"))]');
  // the button flipping to "Starred" is the proof the star registered
  // (finders auto-wait, so this doubles as the verify)
  uiv.$('xpath=//button[starts-with(normalize-space(.), "Starred")]');
  uiv.banner('Starred! Thank you for supporting Ui.Vision ⭐', { tone: 'green' });
}
`

// Preinstalled next to the welcome tour: a fun, visible showcase of what a JS
// macro can do — trusted CDP input (uiv.browser.down/move/up drags on a canvas
// app), DOM-locator tool selection with a coordinate fallback, uiv.banner, a
// real typed text element, and a self-check against the app's own scene state.
export const CAT_SCRIPT = `// Draw a smiling cat on excalidraw.com — precise shapes via the ellipse and
// line tools, freehand only where a wobble looks good (ears, nose, pupils,
// smile, tail) — then greet with a REAL text element, typed with the text tool.
// Trusted CDP input (uiv.browser.*), so Chrome/Edge only, no XModule needed.
// CDP input does not exist on Firefox — say so and point to the twin that
// works there, then END THE RUN GREEN with uiv.exit: "wrong browser" is an
// answered question, not a broken macro — and unlike a throw, uiv.exit
// keeps the banner on screen. (Environment facts like !BROWSER are readable
// from the first line, so the guard runs before anything else does.)
if (uiv.getVar('!BROWSER') === 'firefox') {
  uiv.banner('This drawing demo uses trusted CDP input (uiv.browser.*), which only <b>Chrome and Edge</b> support. For Firefox there is an <b>XClick version</b>: "Draw a cat🐱 - XClick version" in the demo collection, folder Demo and QA Test Scripts > XModules (if the folder is missing: Settings > General > For Tech Support/QA > Restore Demo Macros (JavaScript)).', { seconds: 25 });
  uiv.exit('Firefox detected — this demo needs Chrome or Edge. Use "Draw a cat🐱 - XClick version" from Demo and QA Test Scripts > XModules instead.');
}

uiv.open('https://excalidraw.com/');
uiv.banner('<b>Ui.Vision drawing demo</b> — this macro is not affiliated with or endorsed by Excalidraw.', { seconds: 10 });
const c = uiv.$('css=canvas'); // auto-waits until the app has rendered
const b = uiv.browser;

// Clear any existing scene so re-runs start blank
try {
  b.type('\${KEY_ESC}');
  b.type('\${KEY_CTRL+KEY_A}');
  b.type('\${KEY_DEL}');
} catch (e) {
  uiv.log('Canvas clear skipped: ' + e.message, 'blue');
}

const cx = c.x;      // cat center = canvas center
const cy = c.y - 20; // nudged up so the body fits above the bottom bar
const P = (p) => [Math.round(cx + p[0]), Math.round(cy + p[1])];

// Excalidraw reverts to the selection tool after each shape - re-select before
// every element. Prefer the DOM locator, fall back to the toolbar position
// (the toolbar is horizontally centered; icons sit at y=40).
const TOOL_DX = { rectangle: -127, ellipse: -43, line: 41, freedraw: 83, text: 125 };
const selectTool = (testid) => {
  const t = uiv.$('css=[data-testid="toolbar-' + testid + '"]', { required: false, timeout: 3 });
  if (t) { uiv.page.click(t); } else { b.click(cx + TOOL_DX[testid], 40); }
};

// One polyline = one press-drag-release: down holds the button, every move
// while it is held drags, up releases at the last point
const drag = (pts) => {
  const [x0, y0] = P(pts[0]);
  b.down(x0, y0);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = P(pts[i]);
    b.move(x, y);
  }
  const [xn, yn] = P(pts[pts.length - 1]);
  b.up(xn, yn);
};

// Body first (ellipse), then head on top, so overlaps look tidy
selectTool('ellipse');
drag([[-78,74],[78,198]]);   // body: oval tucked under the chin
selectTool('ellipse');
drag([[-110,-90],[110,70]]); // head: wide oval

// Ears: freehand triangles with midpoints on each edge so the lines stay straight
selectTool('freedraw');
drag([[-88,-60],[-80,-99],[-72,-138],[-55,-111],[-38,-84]]);
drag([[38,-84],[55,-111],[72,-138],[80,-99],[88,-60]]);

// Eyes: two small precise ovals, each with a freehand pupil dot inside
selectTool('ellipse');
drag([[-60,-40],[-35,-10]]);
selectTool('ellipse');
drag([[35,-40],[60,-10]]);
selectTool('freedraw');
drag([[-51,-25],[-47,-28],[-44,-25],[-47,-22],[-51,-25]]);
drag([[44,-25],[48,-28],[51,-25],[48,-22],[44,-25]]);

// Nose: freehand triangle, closed
drag([[-13,2],[13,2],[0,24],[-13,2]]);
// Smile: wide upward curve under the nose
drag([[-32,30],[-18,42],[0,47],[18,42],[32,30]]);

// Whiskers: straight line-tool strokes, three per side
const whiskers = [
  [[-70,10],[-130,0]], [[-70,20],[-132,22]], [[-70,30],[-128,42]],
  [[70,10],[130,0]],  [[70,20],[132,22]],  [[70,30],[128,42]]
];
for (const w of whiskers) {
  selectTool('line');
  drag(w);
}

// Tail: one freehand curve swinging up from the body
selectTool('freedraw');
drag([[75,160],[115,150],[140,120],[145,85]]);

// Headline as a REAL text element: text tool -> click above the cat -> type -> Escape commits
const GREETING = 'Welcome to Ui.Vision';
selectTool('text');
b.click(cx - 105, cy - 195);
b.type(GREETING);
b.type('\${KEY_ESC}');

b.type('\${KEY_ESC}'); // deselect so no selection handles linger

// PROVE the drawing landed: count elements by type in Excalidraw's persisted
// scene, and check the text element carries the exact greeting
let counts = null;
for (let t = 0; t < 10; t++) {
  counts = uiv.eval('var els; try { els = JSON.parse(localStorage.getItem("excalidraw") || "[]"); } catch (e) { els = []; } if (!Array.isArray(els)) { els = []; } var r = {ellipse: 0, freedraw: 0, line: 0, text: 0, textContent: ""}; for (var i = 0; i < els.length; i++) { var el = els[i]; if (el.isDeleted) { continue; } if (el.type === "text") { r.text++; r.textContent = el.text; } else if (r[el.type] !== undefined) { r[el.type]++; } } return r;');
  if (counts.ellipse >= 4 && counts.freedraw >= 7 && counts.line >= 6 && counts.text >= 1) { break; }
  uiv.sleep(500); // pacing the localStorage poll - persistence is debounced
}
if (counts.ellipse < 4 || counts.freedraw < 7 || counts.line < 6) {
  throw new Error('Scene has ' + counts.ellipse + '/4 ellipses, ' + counts.freedraw + '/7 freedraw, ' + counts.line + '/6 lines - cat did not land');
}
if (counts.text < 1 || counts.textContent !== GREETING) {
  throw new Error('Text element missing or wrong: found ' + counts.text + ' text element(s), content "' + counts.textContent + '"');
}
uiv.log('Cat + greeting drawn: ' + counts.ellipse + ' ellipses, ' + counts.line + ' lines, ' + counts.freedraw + ' strokes, text "' + counts.textContent + '"', 'green');
`

export const JS_DEMOS = [
  {
    // a fresh install also writes this macro at the TREE root (see
    // installWelcomeMacro); this copy in the demo folder is what the
    // restore button brings back after the root copy is deleted
    fileName: 'A short welcome tour.js',
    path: 'Core/A short welcome tour.js',
    title: 'Welcome tour (JS)',
    code: WELCOME_SCRIPT
  },
  {
    // also written at the tree root on a fresh install, like the welcome tour
    fileName: 'Like Ui.Vision？Give us a star 🌟.js',
    path: 'Core/Like Ui.Vision？Give us a star 🌟.js',
    title: 'Star on GitHub (JS)',
    code: STAR_SCRIPT
  },
  {
    // also written at the tree root on a fresh install; CDP input, so it
    // lives with the other Chrome/Edge-only demos
    fileName: 'Draw a cat🐱.js',
    path: 'Browser Vision (Chrome, Edge)/Draw a cat🐱.js',
    title: 'Draw a cat (JS)',
    code: CAT_SCRIPT
  },
  {
    fileName: 'DemoBannerWaitForHuman.js',
    path: 'Core/DemoBannerWaitForHuman.js',
    title: 'Banner: human in the loop (JS)',
    code: `// uiv.banner for ATTENDED automation: the macro hands a step to the
// human — a captcha, a 2FA code, a judgment call — tells them so ON the
// page, and waits until they did it. No dialog to dismiss, nothing to
// click: the banner ignores mouse events, so the page stays fully usable.
uiv.open('https://ui.vision/contact');

// the browser may RESTORE a previously typed value into the form — clear it,
// or the "wait for the human" below would be over before it began
uiv.page.type('id=ContactName', '');

// HTML is allowed — highlight what matters
uiv.banner('<b>Your turn:</b> please type your name into the form field. The macro continues 3 seconds after you stop typing.', { position: 'bottom' });

// Wait until the human has FINISHED typing, not merely started: accept the
// value once it is non-empty and unchanged for 3 polls in a row (~3s of
// silence). Grabbing the field on the first non-empty read would run off
// with the first keystrokes. (Alternative pattern: require a terminator —
// loop until the value ends with '.' — when the pause heuristic is too soft.)
const start = Date.now();
let prev = '';
let stable = 0;
while (stable < 3) {
  if (Date.now() - start > 180000) {
    throw new Error('Gave up after 3 minutes of waiting for the name');
  }
  uiv.sleep('1s');
  const v = (uiv.$('id=ContactName').value || '').trim();
  stable = (v && v === prev) ? stable + 1 : 0;
  prev = v;
}
const name = prev;

// ... and the macro takes over again
uiv.banner(\`Thanks, \${name}! The macro fills in the rest for you.\`);
uiv.page.type('id=Email', \`\${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com\`);
uiv.sleep('3s');
uiv.banner(\`All done, \${name} \\u2014 this is how a macro asks for a captcha or a confirmation without stopping.\`, { seconds: 6 });
`
  },
  {
    fileName: 'DemoFrames.js',
    path: 'Core/DemoFrames.js',
    title: 'DemoFrames (JS)',
    code: `// JS version of the DemoFrames macro.
// The table version needs selectFrame index=0..4 before each field. In JS
// the FINDER (uiv.$) pierces same-origin frames — pass its match to
// uiv.page.type and the fill happens inside the right frame. DOM input, so
// this demo runs in every browser (Firefox included).
uiv.open('https://ui.vision/demo/webtest/frames/');

for (let i = 1; i <= 5; i++) {
  uiv.page.type(uiv.$(\`name=mytext\${i}\`), \`Frame\${i} - filled by JS, no selectFrame!\`);
}

// The embedded Google Form is a CROSS-ORIGIN iframe (docs.google.com)
// inside frame 3. The DOM finder sees elements there too (the extension
// has an agent in every frame); such matches carry frame-local coords
// and a frameLocal flag, and uiv.page.* routes them to a DOM action
// inside that frame.
uiv.page.click(uiv.$('xpath=//span[contains(text(),".Vision IDE")]'));

// several text inputs exist on this page (the 5 frame fields above!) —
// pick the one inside the cross-origin form via the frameLocal flag
const inputs = uiv.$$('xpath=//input[@type="text"]');
const formInput = inputs.find(input => input.frameLocal);

if (formInput) {
  uiv.page.type(formInput, 'Filled from JS across a cross-origin iframe!');
}
uiv.log('DemoFrames (JS) completed - no selectFrame anywhere', 'green');
`
  },
  {
    fileName: 'DemoIframe.js',
    path: 'Core/DemoIframe.js',
    title: 'DemoIframe (JS)',
    code: `// JS version of the DemoIframe macro. The embedded Google Form is a
// CROSS-ORIGIN iframe (docs.google.com inside ui.vision). The classic
// macro needs selectFrame to hop into it; the DOM finder just finds the
// elements — cross-origin matches carry frame-local coordinates and
// uiv.click runs a DOM click inside that frame automatically.
uiv.open('https://ui.vision/demo/iframes');

// every target lives INSIDE the iframe, so each one goes through the
// frame-piercing finder; uiv.page.* acts on the match in the right frame
uiv.page.click(uiv.$('xpath=//span[contains(text(),".Vision IDE")]'));
uiv.page.type(uiv.$('xpath=//input[@type="text"]'), 'Automating a cross-origin iframe from JS');

// to page 2 of the form ("Next" localizes, so match both)
uiv.page.click(uiv.$('xpath=//span[text()="Next" or text()="Weiter"]'));

// page 2: the visible answer field is a textarea (the classic macro's
// name=entry... target is a HIDDEN input - visible-by-default finds
// the field a human would use)
uiv.page.type(uiv.$('css=textarea'), 'Form Filling Test Done!');
// (Submit intentionally skipped - this demo stops before submitting)
uiv.log('DemoIframe (JS) completed - page 2 of a cross-origin iframe form', 'green');
`
  },
  {
    fileName: 'DemoAutofill.js',
    path: 'Core/DemoAutofill.js',
    title: 'DemoAutofill (JS)',
    code: `// JS version of the DemoAutofill macro — Google Form filling with plain DOM
// clicks and typing, so it runs in EVERY browser, Firefox included. The
// DemoAutofillChrome variant (in "Browser Vision (Chrome, Edge)") fills the
// same form with trusted CDP input instead.
// special variables are read and written by name — the same names as
// \${!TIMEOUT_PAGELOAD} in a table macro
uiv.setVar('!TIMEOUT_PAGELOAD', 60);
uiv.open('https://docs.google.com/forms/d/1cbI5dMRs0-t_IwNzPm6T3lAG_nPgsnJZEA-FEYVARxg/');

uiv.page.click('xpath=//span[contains(text(),".Vision IDE")]');
uiv.page.click("xpath=//*[text()[contains(.,'Web Testing')]]");
uiv.page.click('xpath=//span[contains(text(),"Form Autofilling")]');
uiv.page.click('xpath=//*[text()[contains(.,"General Web Automation")]]');
uiv.shot.viewport('AutoFillJS_page1');

// "Next" button (same locator as the table macro uses)
uiv.page.click('xpath=//*[@id="mG61Hd"]/div/div/div[3]/div/div/div/span/span');

// page 2: uiv.page.type fills a field in ONE call — no click to focus needed,
// and multiline text is just \\n in the string
uiv.page.type('xpath=//input[@type="text"]', 'This is a single line test...');
uiv.page.type('xpath=//textarea', '...and this a multiline test:\\nLine2\\nLine3');
uiv.shot.viewport('AutoFillJS_page2');
uiv.page.click('xpath=//*[@id="mG61Hd"]/div/div/div[3]/div[1]/div[1]/div[2]/span/span');

// Wait until the form is really SUBMITTED before navigating away: the
// confirmation page has no form element. Leaving while the submission is
// still in flight triggers the browser's native "Leave this form?" dialog,
// which freezes the tab for every later command (#210/#102) until a human
// clicks it — no extension-tier input can reach a native dialog.
for (let i = 0; i < 15 && uiv.findElements('css=form#mG61Hd', { required: false, timeout: 1 }).length; i++) {
  uiv.sleep('1s'); // pacing the submitted-yet poll
}
uiv.log('DemoAutofill (JS) completed!', '#shownotification');

// assertTitle, the JS way
uiv.open('https://ui.vision/rpa/docs/selenium-ide/form-filling');
const title = uiv.eval('return document.title');

if (!title.includes('Form Filling')) {
  throw new Error(\`unexpected title: \${title}\`);
}
uiv.log(\`Title check passed: \${title}\`, 'green');
`
  },
  {
    fileName: 'DemoTabs.js',
    path: 'Core/DemoTabs.js',
    title: 'DemoTabs (JS)',
    code: `// JS version of the DemoTabs macro — same flow, same tab numbering as
// the classic one. A click that opens a new tab does NOT hand focus to it
// (a dispatched click carries no user activation, so the tab opens in the
// background), so switch explicitly with uiv.tabs.select. All primitives
// target the tab the script acts on, and every uiv.tabs.* call activates
// and RETURNS the tab it lands on, so after each switch the whole API
// follows automatically.
//
// uiv.tabs indexes are ABSOLUTE (1..N, what the tab bar shows). The classic
// macro counted RELATIVE to the start tab (tab=1 = first tab to its right) —
// that is just startTabIndex + N here, so the flow and the numbers below
// stay identical to the classic demo.
uiv.open('https://ui.vision/demo/tabs');

// Tab position comes from the uiv.tabs API, not a !variable: the classic
// \${!CURRENT_TAB_NUMBER} / \${!current_tab_number_relative} pair is
// table-macro bookkeeping and THROWS in a script — only classic-player
// commands refresh it, so next to uiv.tabs.* it goes silently stale.
// Every uiv.tabs.* call returns where you are, and uiv.tabs.list() marks
// the tab the script acts on with current: true. Indexes are 1-based,
// what the tab bar shows. For the classic macro's "relative" numbers,
// capture the start index once and subtract: same numbers, same asserts.
const tabAbs = () => uiv.tabs.list().find((t) => t.current).index;
const startTabIndex = tabAbs();
const tabRel = () => tabAbs() - startTabIndex;
const logTabs = (color) => {
  uiv.log(\`TabIndexAbsolute=\${tabAbs()} TabIndexRELATIVE=\${tabRel()}\`, color);
};
const assertTabRel = (want, where) => {
  const got = tabRel();
  if (got !== want) {
    throw new Error(\`relative tab index at \${where}: expected \${want}, got \${got} \` +
      \`(absolute \${tabAbs()}, start tab \${startTabIndex})\`);
  }
};

// a dispatched click carries no user activation: Chrome opens the link's
// tab in the BACKGROUND, Firefox's popup blocker eats it entirely — detect
// that and open the link's href directly (the uiv.tabs.select calls below
// address tabs absolutely, so both routes continue identically)
const openLinkedTab = (linkText) => {
  const before = uiv.tabs.list().length;
  uiv.page.click('link=' + linkText);
  uiv.sleep('1s'); // let a background tab finish opening
  if (uiv.tabs.list().length > before) return; // Chrome: opened in background
  const href = uiv.eval("var a = Array.prototype.find.call(document.links, function (x) { return x.textContent.trim() === '" + linkText + "'; }); return a ? a.href : null");
  if (!href) { throw new Error('link not found: ' + linkText); }
  uiv.tabs.open(href); // Firefox: same tab, opened the JS-native way
};

openLinkedTab('Open new web page in new browser tab');
uiv.tabs.select(startTabIndex + 1); // classic tab=1: first tab right of the start tab
const t1 = uiv.eval('return document.title');
if (!t1.includes('TAB1')) { throw new Error(\`expected TAB1, got: \${t1}\`); }
logTabs('blue');
assertTabRel(1, 'after tabs.select(start + 1)');
uiv.page.type('id=sometext1', 'this is tab 1 (typed from JS)');

// opened from TAB1 (the rightmost tab), so the new tab lands after it = start + 2
openLinkedTab('Open yet another web page in a new browser tab');
uiv.tabs.select(startTabIndex + 2);
const t2 = uiv.eval('return document.title');
if (!t2.includes('TAB2')) { throw new Error(\`expected TAB2, got: \${t2}\`); }
uiv.page.type('id=sometext2', 'And this is tab 2! (JS)');

// back to TAB1 and close it — what was TAB2 then moves one place left
uiv.tabs.select(startTabIndex + 1);
uiv.page.type('id=sometext1', 'Now back in tab 1 - test done! (JS)');
uiv.tabs.close();
uiv.sleep('1s');
const t3 = uiv.eval('return document.title');
if (!t3.includes('TAB2')) { throw new Error(\`expected TAB2 after close, got: \${t3}\`); }
uiv.log(\`After close, now on: \${t3}\`);

uiv.tabs.select(startTabIndex + 1);
const t4 = uiv.eval('return document.title');
if (!t4.includes('TAB2')) { throw new Error(\`expected TAB2 via start + 1, got: \${t4}\`); }
logTabs('green');
assertTabRel(1, 'the old TAB2 is now first right of the start tab');

// uiv.tabs.open always appends a new tab at the far RIGHT of the window,
// switches to it and waits for it — each one lands one place right of the
// previous (the classic tab=open, minus the sleep it needed)
uiv.tabs.open('https://ui.vision');
uiv.log(\`Opened new tab: \${uiv.eval('return document.title')}\`);
const afterFirstOpen = tabAbs();
uiv.tabs.open('https://ocr.space');
uiv.log(\`Opened new tab: \${uiv.eval('return document.title')}\`);

logTabs('brown');

// Catching tab bugs is the whole point of these numbers, so both checks are
// hard failures. First the invariant that defines tabs.open — each one appends
// exactly one tab further right:
if (tabAbs() !== afterFirstOpen + 1) {
  throw new Error(\`tabs.open should append one tab to the right: was \${afterFirstOpen}, now \${tabAbs()}\`);
}

// ...then the classic macro's last assert: relative position 3 (start tab,
// then TAB2, ui.vision, ocr.space). Like the classic macro this assumes the
// run started in a window with no tabs to the RIGHT of the start tab, since
// tabs.open appends past them — if this is the only check that fails, that
// is why.
assertTabRel(3, 'final');
uiv.log('DemoTabs (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoDownload.js',
    path: 'Core/DemoDownload.js',
    title: 'DemoDownload (JS)',
    code: `// Port of Classic/Core/DemoDownload — built on uiv.download, which
// replaces the classic onDownload/saveItem pair: it downloads, renames,
// WAITS for completion and returns the name the file got on disk.
const d = new Date();
const todaydate = \`\${d.getFullYear()}-\${d.getMonth() + 1}-\${d.getDate()}\`;
uiv.log(\`Today is \${todaydate}\`);

uiv.open('https://ui.vision/demo/filedownload');

// !RUNTIME is the run's elapsed time as "12.34s" — parseFloat drops the unit
const elapsed = () => parseFloat(uiv.getVar('!RUNTIME'));

// Form 1 — locator: "save link as". The file behind the link's href is
// downloaded WITHOUT clicking, so no navigation can get in the way.
let started = elapsed();
const file1 = uiv.download('link=XModules for Windows', { as: \`DownloadTest1_\${todaydate}.exe\` });
uiv.log(\`File name on disk is \${file1}\`, 'blue');
uiv.log(\`Download1 (Windows version) took \${(elapsed() - started).toFixed(2)} seconds\`, 'blue');

// Form 2 — trigger function: for downloads only a CLICK can start (JS-built
// blobs, POST exports). The click runs between arming and waiting, so the
// download it causes is captured, renamed and awaited.
// classic partialLinkText= is just an xpath substring match. Use
// normalize-space(.) — contains(text(),..) reads only the first direct text
// node and ignores whitespace, so it misses <a><span>for macOS</span></a>
started = elapsed();
const file2 = uiv.download(function () {
  uiv.page.click('xpath=//a[contains(normalize-space(.), "for macOS")]');
}, { as: \`DownloadTest2_\${todaydate}.exe\` });
uiv.log(\`File name on disk is \${file2}\`, 'green');
uiv.log(\`Download2 (Mac) took \${(elapsed() - started).toFixed(2)} seconds\`, 'green');

uiv.log('All done...');
uiv.page.click('link=OnDownload command');
`
  },
  {
    fileName: 'DemoTakeScreenshots.js',
    path: 'Core/DemoTakeScreenshots.js',
    title: 'DemoTakeScreenshots (JS)',
    code: `// Port of Classic/Core/DemoTakeScreenshots.
// Screenshots and storeImage have no native uiv methods (they write files
// rather than return values), so they use the legacy bridge.
uiv.open('https://ui.vision/blog/');
uiv.shot.page('rpablog');

// classic "linkText=read more@POS=1" — in JS the position is just an index
const readMore = uiv.$$('link=read more');
uiv.log(\`Found \${readMore.length} "read more" links\`);

uiv.page.click(readMore[0]);
uiv.shot.page('article1');

uiv.open('https://ui.vision/blog/');
uiv.page.click(uiv.$$('link=read more')[1]);
uiv.shot.page('article2');
uiv.shot.viewport('article2_just_viewport');

// screenshot of a single ELEMENT, then OCR it to verify the content
const titleShot = uiv.shot.element('xpath=//a[contains(normalize-space(.), "Blog")]', 'blogtitle');

// the shot's file name feeds straight into the reader — no engine pin: this
// read uses the engine configured in Settings > OCR. ({engine: 'xmodule'}, the
// XModule Local OCR, reads best when installed; {engine: 'ocrspace_engine2'} /
// {engine: 'ocrspace_engine3'} are the cloud engines.)
uiv.setVar('!OCRLANGUAGE', 'eng');
const ocrResult = uiv.ocr.read({ image: titleShot });
uiv.log(\`OCR Result = \${ocrResult}\`, 'blue');

if (String(ocrResult).includes('RPA')) {
  uiv.log('yes, screenshot taking and OCR worked', 'green');
} else {
  throw new Error(\`OCR did not find "RPA" in the element screenshot: \${ocrResult}\`);
}

// What did this macro leave behind? uiv.files.list() spans BOTH stores —
// screenshots and the CSV/TXT tab — so filter when you want one kind. The
// other two file verbs are uiv.files.exists(name) and uiv.files.remove(name),
// which take a .png exactly like they take a .csv. The shots stay here on
// purpose: open the Data > Screenshots tab and look at them.
const shots = uiv.files.list().filter(n => /\\.png$/i.test(n));
uiv.log(\`Screenshots stored: \${shots.join(', ')}\`, 'blue');
`
  },
  {
    fileName: 'DemoImplicitWaiting.js',
    path: 'Core/DemoImplicitWaiting.js',
    title: 'DemoImplicitWaiting (JS)',
    code: `// Port of Classic/Core/DemoImplicitWaiting.
// The whole waitForElementVisible concept disappears in JS: uiv.$ auto-waits
// up to !TIMEOUT_WAIT and throws if the element never appears, so finding it
// IS the wait.
uiv.open('https://ui.vision/demo/waitforelementvisible');

uiv.page.click(uiv.$('css=#div1 > h1'));

uiv.setVar('!TIMEOUT_WAIT', 20);
uiv.page.click(uiv.$('css=#div2 > h1'));

// Implicit waiting: elements that appear later are simply found later
uiv.open('https://ui.vision/demo/webtest/implicitwaiting/');
uiv.setVar('!TIMEOUT_WAIT', 15);

// classic assertText -> read the text and check it yourself
const intro = uiv.$('xpath=/html/body/header/center/p[2]').text;
if (!intro.includes('Use the select box to start the timer')) {
  throw new Error(\`unexpected intro text: \${intro}\`);
}

uiv.page.select('id=minutesSelect', '5 Seconds');
uiv.log(\`The next element is not on the page yet — uiv.$ waits up to \${uiv.getVar('!TIMEOUT_WAIT')}s for it\`, 'blue');
uiv.page.click(uiv.$('xpath=/html/body/header/center/img'));

// --- the other half: waiting for something that may NOT be there ------------
// A cookie bar or a "we are busy" popup is there on some runs and not on
// others. {required: false} turns a miss from an exception into a plain null —
// but it does NOT shorten the wait: the finder polls until the deadline either
// way, and the flag only decides what the deadline does. So an optional step
// wants a SHORT timeout too, otherwise every run without the popup pays the
// full !TIMEOUT_WAIT for nothing.
const popup = uiv.$('css=#a-popup-that-is-not-on-this-page', { required: false, timeout: 2 });
if (popup) {
  uiv.page.click(popup);
  uiv.log('Optional popup was there — closed it', 'green');
} else {
  uiv.log('No optional popup this run — skipped it in 2s', 'blue');
}
// The null has to be CHECKED, as above. Feeding it straight to an action —
// uiv.page.click(uiv.$('css=#nope', {required: false})) — throws on the very
// null it asked for, and wrapping THAT in try/catch hides real errors: a
// mistyped image file name then logs as "not present" and you debug the wrong
// thing. {required: false} is for ABSENCE, try/catch is for ERRORS.
// Visual targets work the same way:
//   const x = uiv.findImage('close.png', {required: false, timeout: 2});
//   if (x) uiv.page.click(x);

// Note what is NOT in this macro: uiv.sleep. Every wait above is a wait for a
// THING (an element, a page load), never for a TIME. A fixed sleep is too long
// when the site is fast and too short when it is slow — which is the whole
// reason auto-waiting exists.
uiv.log('DemoImplicitWaiting (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoCsvSave.js',
    path: 'Core/DemoCsvSave.js',
    title: 'DemoCsvSave (JS)',
    code: `// Port of Classic/Core/DemoCsvSave.
// The classic macro builds a row by storing cell after cell into the magic
// !csvLine variable and then csvSave-ing it. In JS a row is just an array.
uiv.open('https://ui.vision/demo/csvsave');

const d = new Date();
const pad = (n) => (n < 10 ? '0' + n : String(n));
const timestamp = \`\${d.getFullYear()}-\${pad(d.getMonth() + 1)}-\${pad(d.getDate())} \${pad(d.getHours())}:\${pad(d.getMinutes())}\`;

// The classic macro reaches into the currency widget with seven xpaths, each
// hard-coding a GENERATED id (gcw_main...). That id changes whenever the widget
// re-renders, and the markup around it changes too — both the original and a
// tidier //table//tbody/tr[2]/td/a broke on it.
//
// A demo about SAVING data should not be a lesson in third-party DOM. Read the
// rendered text once and pull the numbers out of it: no locator to rot.
const pageText = uiv.eval('return document.body.innerText');
const rates = (pageText.match(/\\d+[.,]\\d{2,}/g) || []).slice(0, 7);

uiv.log(\`Found \${rates.length} rate-like numbers on the page\`);

if (rates.length === 0) {
  throw new Error('no exchange-rate numbers found on the page — the demo page or its currency widget changed');
}

const row = [timestamp].concat(rates);
uiv.log(row.join(' | '));

// append the row (creates the file on the first run)
uiv.csv.append('CurrencyConverterData.csv', row);
uiv.log(\`CurrencyConverterData.csv now has \${uiv.csv.read('CurrencyConverterData.csv').length} rows\`, 'green');

// download the CSV to the browser's download folder
uiv.exportToDownloads('currencyconverterdata.csv');
`
  },
  {
    fileName: 'Sub_DemoCsvRead_FillForm.js',
    path: 'Core/Sub/Sub_DemoCsvRead_FillForm.js',
    title: 'Sub_DemoCsvRead_FillForm (JS)',
    code: `// Port of Classic/Core/Sub/Sub_DemoCsvRead_FillForm — the subroutine of
// DemoCsvReadWithWhile.
//
// The classic version is a macro called with \`run\`, so it communicated through
// the shared variable pool: the caller left !COL1..!COL3 and !csvReadLineNumber
// lying around and this macro read them. In JS it is a FUNCTION with
// arguments, so nothing leaks in either direction.
//
// Include it from another script with:
//   // @include Demo and QA Test Scripts/Core/Sub/Sub_DemoCsvRead_FillForm.js

function fillFormFromRow (row, lineNumber) {
  uiv.log(\`Filling the form from CSV row \${lineNumber}: \${row.join(', ')}\`, 'green');

  // /viewform is the public fill-out view — a bare /view redirects to a
  // Google error/sign-in page with no form inputs, and every row times out
  uiv.open('https://docs.google.com/forms/d/e/1FAIpQLScGWVjexH2FNzJqPACzuzBLlTWMJHgLUHjxehtU-2cJxtu6VQ/viewform');

  uiv.page.type("xpath=//input[@type='text']", \`\${row[0]}_\${lineNumber}\`);
  uiv.page.type('xpath=//div[3]/div/div/div[2]/div/div/div/div/input', row[1]);
  uiv.page.type('xpath=//div[4]/div/div/div[2]/div/div/div/div/input', row[2]);

  uiv.page.click('xpath=//span/span');
}

// uiv.main is true ONLY when this file is the macro being run, so opening it
// and pressing Play tests the form filling on its own — and including it from
// DemoCsvReadWithWhile stays silent.
if (uiv.main) {
  fillFormFromRow(['SelfTest', 'row', 'values'], 0);
  uiv.log('Sub_DemoCsvRead_FillForm self-test done', 'green');
}
`
  },
  {
    fileName: 'DemoCsvReadWithWhile.js',
    path: 'Core/DemoCsvReadWithWhile.js',
    title: 'DemoCsvReadWithWhile (JS)',
    code: `// Port of Classic/Core/DemoCsvReadWithWhile.
//
// The classic macro reads the CSV one line at a time, tracking
// !csvReadLineNumber and !csvReadStatus by hand and looping while the status
// stays "OK". Here the file is simply an array, so the loop is a forEach and
// the bookkeeping variables disappear.
//
// The subroutine is a real function, spliced in before the script compiles:
// @include Demo and QA Test Scripts/Core/Sub/Sub_DemoCsvRead_FillForm.js

uiv.setVar('!TIMEOUT_MACRO', 180);

const rows = uiv.csv.read('ReadCSVTestData.csv');
uiv.log(\`ReadCSVTestData.csv has \${rows.length} rows\`, 'blue');

const failedRows = [];
rows.forEach((row, i) => {
  const lineNumber = i + 1; // classic !csvReadLineNumber is 1-based
  uiv.log(\`Reading CSV line No. \${lineNumber}\`);

  // the classic macro sets !errorIgnore around the call so one bad row does
  // not end the run — try/catch is the JS equivalent, and it can say WHICH row
  try {
    fillFormFromRow(row, lineNumber);
  } catch (e) {
    failedRows.push(lineNumber);
    uiv.log(\`Row \${lineNumber} failed: \${e.message}\`, 'red');
  }
});

// a script must prove its own success: tolerating a bad row is fine,
// tolerating EVERY row failing silently is how a dead form URL went unnoticed
if (failedRows.length === rows.length) {
  throw new Error(\`all \${rows.length} rows failed — the form page or its locators are broken\`);
}
uiv.log(\`DemoCsvReadWithWhile (JS) completed — \${rows.length - failedRows.length} of \${rows.length} rows filled\`, 'green');
`
  },
  {
    fileName: 'DemoCsvReadArray.js',
    path: 'Core/DemoCsvReadArray.js',
    title: 'DemoCsvReadArray (JS)',
    code: `// Port of Classic/Core/DemoCsvReadArray.
// The classic macro needs executeScript_Sandbox to build an array, csvSaveArray
// to store it, csvReadArray to get it back, and forEach/times commands to walk
// it. In a script an array is just an array.

// build a 5 x 3 array
const array1 = [];
for (let x = 0; x < 5; x++) {
  array1.push([\`\${x}0\`, \`\${x}1\`, \`\${x}2\`]);
}

// set two values directly
array1[0][2] = 'Hello World';
array1[2][1] = 'This is how you set an array value';

uiv.csv.write('data_from_array.csv', array1);

// read it back
const myCSV = uiv.csv.read('data_from_array.csv');
uiv.log(\`Number of rows = \${myCSV.length}\`, 'green');
uiv.log(\`Number of columns = \${myCSV[0].length}\`, 'pink');

// loop over every value — the classic nested forEach commands
myCSV.forEach(row => {
  uiv.log(\`col1=\${row[0]}, col2=\${row[1]}, col3=\${row[2]}\`, 'brown');
  row.forEach(elem => uiv.log(\`  Element=\${elem}\`, 'blue'));
});

// the classic "times" loop, with its !times-minus-one dance, is just an index
myCSV.forEach((row, i) => {
  uiv.log(\`Row \${i}, 3rd Element => \${row[2]}\`, 'blue');
});

if (myCSV[0][2] !== 'Hello World') {
  throw new Error(\`round-trip failed: expected 'Hello World', got '\${myCSV[0][2]}'\`);
}
uiv.log('DemoCsvReadArray (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoTextReadWrite.js',
    path: 'Core/DemoTextReadWrite.js',
    title: 'DemoTextReadWrite (JS)',
    code: `// uiv.text.read / uiv.text.write — the RAW side of the file API. Same
// storage as uiv.csv.* (the Data > CSV/TXT tab), but NO parsing: commas
// and quotes stay literal characters. That makes it the right tool for
// one-per-line lists (prompts, keywords, URLs) — files that LOOK like CSV
// to a parser but are really just lines of text.

// A typical list: image prompts, one per line. The commas are PUNCTUATION,
// not column separators — and the lines have different comma counts. Saved
// under a .csv name, which is exactly how such files arrive in the wild:
const prompts = [
  'a red panda, watercolor style',
  'a lighthouse at night, oil painting, dramatic sky',
  'a mountain village in winter'
];
uiv.text.write('demo_prompts.csv', prompts.join('\\n'));

// The CSV parser rejects this file ON PURPOSE: uiv.csv.read is STRICT
// (equal column counts, valid quoting), and a plain list is not CSV. When
// a "csv" throws "Invalid Record Length", the fix is usually not to repair
// the quoting — it is to STOP PARSING and read the file with uiv.text.read.
try {
  uiv.csv.read('demo_prompts.csv');
  throw new Error('expected the strict CSV parser to reject the plain-text list');
} catch (e) {
  if (String(e.message).indexOf('expected the strict CSV parser') !== -1) { throw e; }
  uiv.log(\`uiv.csv.read rejects the list, as expected: \${e.message}\`, 'brown');
}

// uiv.text.read returns the same bytes uiv.text.write stored. THE pattern
// for consuming a list: split on /\\r?\\n/ (files made on Windows end lines
// with CRLF), trim each line, and filter(Boolean) drops the ghost entry a
// trailing newline would create.
const items = uiv.text.read('demo_prompts.csv').split(/\\r?\\n/).map(s => s.trim()).filter(Boolean);
uiv.log(\`demo_prompts.csv has \${items.length} lines\`, 'blue');
items.forEach((item, i) => uiv.log(\`  line \${i + 1}: \${item}\`));

if (items.length !== prompts.length || items[0] !== prompts[0]) {
  throw new Error('round-trip failed: the file does not hold what was written');
}

// UPDATE = read, modify, write back (there is no text append — a list file
// is small, and rewriting it whole keeps the contract simple). Written to a
// .txt name here — the honest extension for a list. A name with NO
// extension defaults to .txt on write; on read it resolves to whichever of
// name.txt / name.csv exists.
const updated = items.concat('a lighthouse keeper reading, cozy interior');
uiv.text.write('demo_prompts.txt', updated.join('\\n'));

const after = uiv.text.read('demo_prompts.txt').split(/\\r?\\n/).filter(Boolean);
if (after.length !== items.length + 1) {
  throw new Error(\`update failed: expected \${items.length + 1} lines, found \${after.length}\`);
}
uiv.log(\`demo_prompts.txt written with \${after.length} lines — see the Data > CSV/TXT tab (the eye icon opens it in the text editor)\`, 'green');

// files from the CSV/TXT store can land in the browser's Downloads folder
uiv.exportToDownloads('demo_prompts.txt');

// EXPORTING DOES NOT DELETE — the file now exists in BOTH places, and the
// copy in Ui.Vision storage stays until something removes it. That is what
// uiv.files.* is for: the verbs that take a NAME (list, exists, remove)
// rather than a format, because deleting does not care whether the file is a
// .txt, a .csv or a .png. demo_prompts.csv has served its purpose — it exists
// only to show the strict parser rejecting a plain list — so tidy it away and
// keep the .txt version:
uiv.files.remove('demo_prompts.csv');
if (uiv.files.exists('demo_prompts.csv')) {
  throw new Error('uiv.files.remove did not remove demo_prompts.csv');
}

// uiv.csv.list() is the CSV/TXT tab alone; uiv.files.list() spans that tab
// AND the screenshots, since a file name is a file name
uiv.log(\`CSV/TXT tab now holds: \${uiv.csv.list().join(', ')}\`, 'blue');
uiv.log('DemoTextReadWrite (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoIfElse.js',
    path: 'Core/DemoIfElse.js',
    title: 'DemoIfElse (JS)',
    code: `// Port of Classic/Core/DemoIfElse.
// This is the macro that argues best for scripts: gotoIf, label, gotoLabel and
// onError all become ordinary JavaScript, and the flow reads top to bottom
// instead of jumping between labels.
uiv.open('https://ui.vision/demo/executeScript');

const hour = uiv.eval('return new Date().getHours()');
uiv.log(\`mytime = \${hour}\`);

if (hour > 16) {
  uiv.log('Good afternoon!');
} else {
  uiv.log('Good morning!');
}

// classic storeAttribute fills the variable with "#LNF" when the locator does
// not match. In JS a finder given {required: false} returns an empty array, so
// "not found" is a plain length check — no magic sentinel value.
const missing = uiv.findElements("xpath=//input[@id='sometext-WRONG-ID-TEST']", { required: false });
if (missing.length === 0) {
  uiv.log('The xpath was not found — the array is simply empty, no #LNF needed', 'blue');
}

// classic storeAttribute needs no JS equivalent: reading a property or
// attribute IS a line of page JavaScript
const boxsize = Number(uiv.eval("return document.querySelector('#sometext').getAttribute('size')"));
uiv.log(\`With the correct xpath we get: Boxsize = \${boxsize}\`, 'green');

// classic gotoIf + gotoLabel + label -> if/else
if (boxsize > 70) {
  uiv.log('Input box too big. This is what the classic gotoIf branch did');
} else {
  uiv.page.type('id=sometext', \`This box is \${boxsize} chars wide\`);
  uiv.eval(\`document.title = '\${boxsize}'; return document.title\`);
}

// classic onError | #goto | fixerror -> try/catch, which also says WHY
try {
  uiv.page.type('id=sometext', 'this line works');
  uiv.page.type('id=sometextXXXXX', 'this line has the wrong ID...');
  uiv.log('this line is never reached, because of the error above', 'blue');
} catch (e) {
  uiv.log(\`here we can have code that handles the error: \${e.message}\`, 'green');
  uiv.page.type('id=sometext', 'Fix Error Section: This command works.');
}

uiv.log('DemoIfElse (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoExtract.js',
    path: 'Core/DemoExtract.js',
    title: 'DemoExtract (JS)',
    code: `// Port of Classic/Core/DemoExtract.
// The classic macro needs storeAttribute, storeText, storeTitle, storeValue,
// storeChecked and six sourceExtract commands. Almost none of them need a
// uiv.* equivalent: reading the page IS what JavaScript does.
uiv.open('https://ui.vision/demo/executescript');

// The classic macro reads \${!URL} here. In a script that variable is only
// refreshed by the classic player, so it lags behind the page — ask the page.
uiv.log(\`Current page URL = \${uiv.eval('return location.href')}\`);
uiv.log('This macro shows various ways to extract and save data from a website');

// --- attributes: classic storeAttribute -------------------------------------
const imgSrc = uiv.eval("return document.querySelector('img.responsive-img').src");
uiv.log(\`href=\${imgSrc}\`);

const imgAlt = uiv.eval("return document.querySelector('img.responsive-img').alt");
uiv.log(\`alt text = \${imgAlt}\`);

const boxsize = Number(uiv.eval("return document.querySelector('#sometext').getAttribute('size')"));
uiv.log(\`input box size = \${boxsize}\`);

uiv.page.type('id=sometext', \`This box is \${boxsize} chars wide\`);
uiv.eval(\`document.title = '\${boxsize}'; return document.title\`);

// classic assertTitle -> read it and throw
const titleNow = uiv.eval('return document.title');
if (titleNow !== String(boxsize)) {
  throw new Error(\`assertTitle failed: expected '\${boxsize}', got '\${titleNow}'\`);
}

// --- text and values: classic storeText / storeTitle / storeValue -----------
const header = uiv.$('xpath=//*[@id="content"]/div[2]/div/h2[3]');
uiv.page.click(header);
uiv.log(\`header = \${header.text}\`);

uiv.log(\`page title = \${uiv.eval('return document.title')}\`);

const mytext = uiv.$('id=sometext').value;
uiv.page.select('id=tesla', 'Model Y');
const mytesla = uiv.$('id=tesla').value;
uiv.log(\`The text box contains [\${mytext}] and the select box has [\${mytesla}] selected\`);

// classic assertValue
if (mytesla !== 'y') {
  throw new Error(\`assertValue failed: select is '\${mytesla}', expected 'y'\`);
}

// --- checkboxes: classic storeChecked ---------------------------------------
const checked = uiv.eval("var els = document.getElementsByName('vehicle'); var out = []; for (var i = 0; i < els.length; i++) { out.push(els[i].checked); } return out");
uiv.log(\`User has bike:\${checked[0]}, car:\${checked[1]}, boat:\${checked[2]}\`, 'green');

// --- page SOURCE: classic sourceExtract -------------------------------------
// Six sourceExtract commands become ONE fetch of the source plus plain regex.
// @1,1 / @2 meant "which match, which capture group" — in JS that is just
// indexing, and you can see what you are indexing into.
const html = uiv.eval('return document.documentElement.outerHTML');

const prices = [];
const priceRe = /[$\\u00A3\\u20AC](\\d+(?:\\.\\d{1,2})?)/g;
let hit;
while ((hit = priceRe.exec(html)) !== null) { prices.push(hit[1]); }
uiv.log(\`Coffee costs \${prices[0]} and tea \${prices[1]}\`, 'blue');

const widths = [];
const widthRe = /_width: (\\d+)/g;
while ((hit = widthRe.exec(html)) !== null) { widths.push(hit); }
uiv.log(\`match1 = [\${widths[0][0]}] (group1 = [\${widths[0][1]}]) match2 = [\${widths[1][0]}] (group1 = [\${widths[1][1]}])\`, 'blue');

const gaId = (html.match(/G-[0-9A-Z]+/) || [])[0];
uiv.log(\`Google Analytics ID = \${gaId}\`, 'pink');

// the classic macro's QA assertion
if (widths[1][1] !== '22') {
  throw new Error(\`Regex extraction failed for match2 group 1: got \${widths[1][1]}, expected 22\`);
}

// --- screenshots: these WRITE FILES, so they stay on the legacy bridge ------
const mytitle = uiv.eval('return document.title');
uiv.shot.viewport(\`myscreenshot_\${mytitle}\`);
uiv.shot.element('xpath=//*[@id="page-header"]/div/div/h1', 'pagetitle.png');
uiv.exportToDownloads(\`myscreenshot_\${mytitle}.png\`);
uiv.exportToDownloads('pagetitle.png');

uiv.log('DemoExtract (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoExecuteScript.js',
    path: 'Core/DemoExecuteScript.js',
    title: 'DemoExecuteScript (JS)',
    code: `// Port of Classic/Core/DemoExecuteScript.
// The classic macro is 49 commands, and most of them exist only to run a
// little JavaScript through executeScript_Sandbox and pass the result back
// through a variable. In a script that IS the language, so they just vanish.
uiv.open('https://ui.vision/demo/executescript');

// classic assertText / assertTitle -> read and throw
const heading = uiv.$('xpath=//*[@id="content"]/div[2]/div/h2[1]').text;
if (!heading.includes('Input box to display some results')) {
  throw new Error(\`unexpected heading: \${heading}\`);
}
if (uiv.eval('return document.title') !== 'Selenium IDE executeScript Demo Page') {
  throw new Error(\`unexpected page title: \${uiv.eval('return document.title')}\`);
}

// classic sourceSearch: count occurrences in the page source
const html = uiv.eval('return document.documentElement.outerHTML');
if (!html.includes('G-VJNCDYRXBP')) {
  throw new Error('Google Analytics ID is wrong!');
}

// --- calculations: no executeScript_Sandbox round trip needed ---------------
const AAA = 15;
const BBB = 10;
const CCC = AAA - BBB;
uiv.log(String(CCC));
uiv.eval(\`document.title = '\${CCC}'; return document.title\`);
if (uiv.eval('return document.title') !== '5') {
  throw new Error('title was not set to 5');
}

const upper = 'SELenium IDe'.toUpperCase();
uiv.log(upper);
uiv.page.type('id=sometext', upper);

// --- today's date in YYYY-MM-DD ---------------------------------------------
const d = new Date();
const pad = (n) => (n < 10 ? '0' + n : String(n));
const mydate = \`\${d.getFullYear()}-\${pad(d.getMonth() + 1)}-\${pad(d.getDate())}\`;
uiv.log(\`Today is \${mydate}\`);

// --- pick a random item, useful for data-driven testing ---------------------
const names = ['cat', 'dog', 'fish', 'dog', 'deer', 'frog', 'whale', 'dog', 'seal', 'horse'];
uiv.log(\`array length = \${names.length}\`);
const num = Math.floor(Math.random() * names.length);
uiv.log(\`num=\${num}\`);
const myrandomname = names[num];

const output = \`Today is \${mydate}, and we draw a \${myrandomname}\`;
uiv.log(output);
uiv.page.type('id=sometext', output);

// classic runtime assertion
const runtime = parseFloat(uiv.getVar('!RUNTIME'));
if (runtime > 20) {
  throw new Error(\`Runtime too slow (\${runtime} seconds), test failed\`);
}
uiv.log('Runtime Ok, test passed!', 'green');

// classic "linkText=This link@POS=3" — @POS is an array index in JS
const links = uiv.$$('link=This link');
uiv.log(\`\${links.length} links named "This link" — clicking the 3rd\`, 'green');
uiv.page.click(links[2]);

// classic forEach over an array built by executeScript
['Hello', 'World', '2020'].forEach(elem => uiv.log(elem, 'blue'));

uiv.log('DemoExecuteScript (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoAutofillChrome.js',
    path: 'Browser Vision (Chrome, Edge)/DemoAutofillChrome.js',
    title: 'DemoAutofillChrome (JS)',
    code: `// Chrome/Edge variant of Core/DemoAutofill: the same Google Form, filled
// with TRUSTED input through the debugger API (uiv.browser.*) — no XModule
// needed, but not available on Firefox. Use it when a site ignores the
// synthetic events uiv.page.* sends.
if (uiv.getVar('!BROWSER') === 'firefox') {
  uiv.exit('This demo uses trusted CDP input (uiv.browser.*), which Firefox does not support — use Core/DemoAutofill instead (same form, DOM input, every browser).');
}
uiv.setVar('!TIMEOUT_PAGELOAD', 60);
uiv.open('https://docs.google.com/forms/d/1cbI5dMRs0-t_IwNzPm6T3lAG_nPgsnJZEA-FEYVARxg/');

uiv.browser.click('xpath=//span[contains(text(),".Vision IDE")]');
uiv.browser.click("xpath=//*[text()[contains(.,'Web Testing')]]");
uiv.browser.click('xpath=//span[contains(text(),"Form Autofilling")]');
uiv.browser.click('xpath=//*[text()[contains(.,"General Web Automation")]]');
uiv.shot.viewport('AutoFillJS_page1');

// "Next" button (same locator as the table macro uses)
uiv.browser.click('xpath=//*[@id="mG61Hd"]/div/div/div[3]/div/div/div/span/span');

// page 2: trusted keystrokes for both fields — in uiv.browser.type a \\n in
// the string is a real ENTER keystroke, which is a new line inside a textarea.
// TYPE WITH PROOF: keystrokes go to whatever is focused, and this form
// erratically swallows the focus a trusted click just set (its page
// transition re-mounts the fields) — typed text then vanishes silently.
// So click, type, READ THE FIELD BACK, and retry until the text really
// arrived: the check-your-result pattern every script should use after
// uiv.browser.type.
const typeVerified = (locator, text) => {
  for (let i = 0; i < 3; i++) {
    uiv.browser.click(locator);
    uiv.browser.type(text);
    const v = String(uiv.$(locator).value || '');
    if (v.includes(text.split('\\n')[0])) return;
    uiv.log(\`field \${locator} does not hold the typed text yet - retrying\`, 'orange');
    uiv.sleep('1s'); // let the form's page transition settle before the retry
  }
  throw new Error('typed text never arrived in ' + locator);
};
typeVerified('xpath=//input[@type="text"]', 'This is a single line test...');
typeVerified('xpath=//textarea', '...and this a multiline test:\\nLine2\\nLine3');
uiv.shot.viewport('AutoFillJS_page2');
uiv.browser.click('xpath=//*[@id="mG61Hd"]/div/div/div[3]/div[1]/div[1]/div[2]/span/span');

// Wait until the form is really SUBMITTED before navigating away: the
// confirmation page has no form element. Leaving while the submission is
// still in flight triggers the browser's native "Leave this form?" dialog,
// which freezes the tab for every later command (#210/#102) until a human
// clicks it — no extension-tier input can reach a native dialog.
for (let i = 0; i < 15 && uiv.findElements('css=form#mG61Hd', { required: false, timeout: 1 }).length; i++) {
  uiv.sleep('1s'); // pacing the submitted-yet poll
}
uiv.log('DemoAutofillChrome (JS) completed!', '#shownotification');

// assertTitle, the JS way
uiv.open('https://ui.vision/rpa/docs/selenium-ide/form-filling');
const title = uiv.eval('return document.title');

if (!title.includes('Form Filling')) {
  throw new Error(\`unexpected title: \${title}\`);
}
uiv.log(\`Title check passed: \${title}\`, 'green');
`
  },
  {
    fileName: 'DemoBrowserType.js',
    path: 'Browser Vision (Chrome, Edge)/DemoBrowserType.js',
    title: 'uiv.browser.type (JS)',
    code: `// uiv.browser.type: trusted keystrokes through the browser debugger
// API (CDP), no XModule needed. It types into the web page only — unlike
// uiv.desktop.type it cannot reach OS dialogs.
if (uiv.getVar('!BROWSER') === 'firefox') {
  uiv.exit('This demo uses trusted CDP input (uiv.browser.*), which Firefox does not support — Chrome/Edge only.');
}
const b = uiv.browser;

uiv.open('https://www.wikipedia.org');

// focus the search box with a trusted click, then type a (wrong) term
b.click('css=#searchInput');
b.type('Selenium');

// fix it: CTRL+A selects everything in the field, then overwrite and submit
b.type('\${KEY_CTRL+KEY_A}');
b.type('Robotic process automation\${KEY_ENTER}');

// The classic macro pauses 3s here. Auto-wait is better — but ONLY on an
// element unique to the target state: css=h1 exists on the Wikipedia portal
// too, so it matched the OLD page instantly and waited for nothing.
// #firstHeading exists only on an article.
const heading = uiv.$('css=#firstHeading').text;
uiv.log(\`Landed on: \${uiv.eval('return document.title')}\`, 'blue');

if (!heading.toLowerCase().includes('robotic process automation')) {
  throw new Error(\`search did not land on the expected article: \${heading}\`);
}
uiv.log('DemoBrowserType (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoBrowserDrag.js',
    path: 'Browser Vision (Chrome, Edge)/DemoBrowserDrag.js',
    title: 'Drag & drop: uiv.browser (JS)',
    code: `// Dragging sliders with trusted CDP input, no XModule needed.
// Dragging = press, move, release. uiv.browser.down holds the button, every
// move while it is held drags, and uiv.browser.up releases at the end point.
if (uiv.getVar('!BROWSER') === 'firefox') {
  uiv.exit('This demo uses trusted CDP input (uiv.browser.*), which Firefox does not support — see XModules/DemoXMove for the same sliders with real OS input.');
}
const b = uiv.browser;

uiv.open('https://ui.vision/demo/draw');
uiv.page.click('link=this external website');

// --- 2nd slider: the classic "@0.75#2" target ------------------------------
// confidence and "which match" were baked into the target string; in JS they
// are an option and an array index, so you can log what you matched
const handles = uiv.findImages('slider_handle_dpi_96.png', { minScore: 0.75 });
uiv.log(\`found \${handles.length} slider handles\`, 'blue');
if (handles.length < 2) {
  throw new Error(\`expected at least 2 slider handles, found \${handles.length}\`);
}

const second = handles[1];
b.down(second);
b.up(second.x + 200, second.y);

// --- 3rd slider: search INSIDE one element -----------------------------------
// six identical handles are on this page, so both searches are limited to the
// warmth slider's own rect with {area} — the composed, per-call form of the
// classic visionLimitSearchArea command (which scripts reject). It also keeps
// the relaxed @0.6 safe: the search cannot wander off into the other sliders.
const track = uiv.$('xpath=//ion-list[3]/ion-item/div/div/ion-range');
const handle3 = uiv.findImage('slider_handle_dpi_96.png', { minScore: 0.6, area: track });
// A green/pink relative image used to drop the handle here. In JS a relative
// target is COMPOSED: find a stable anchor — the red
// thermometer at the warm end of the track — and act at an offset from it.
// The offset is in units of the anchor's own measured size, so it scales
// with the page exactly like the pink box did.
const warmEnd = uiv.findImage('slider_warmth_dpi_96.png', { minScore: 0.6, area: track });
b.down(handle3);
b.up(uiv.offset(warmEnd, -Math.round(1.05 * warmEnd.rect.width), 0));

// confirm the slider ended up where we wanted
const warmth = uiv.$('xpath=//ion-list[3]/ion-list-header/div/ion-badge').text;
uiv.log(\`Slider WARMTH value is: \${warmth}\`, 'red');
if (String(warmth).trim() !== '2000') {
  throw new Error(\`slider did not reach 2000 — it reads \${warmth}\`);
}
uiv.log('DemoBrowserDrag (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoOffsetClick.js',
    path: 'Browser Vision (Chrome, Edge)/DemoOffsetClick.js',
    title: 'Offset click from OCR anchor (JS)',
    code: `// Clicking calculator keys at an OFFSET from OCR'd labels — the JS answer to
// the classic "text#R8,-14" relative targets (XClickTextRelative), composed
// from uiv.ocr.findText plus uiv.offset.
//
// The offsets are COMPUTED from the page's own geometry, not hardcoded:
// hardcoded pixel offsets break the moment the page renders at a different
// scale (side panel width, zoom, redesign — this demo shipped broken that way
// once). Two corner keys anchor the whole key grid; every key is then a whole
// number of grid steps away.
if (uiv.getVar('!BROWSER') === 'firefox') {
  uiv.exit('This demo uses trusted CDP input (uiv.browser.*), which Firefox does not support — Chrome/Edge only. (The same anchor+offset idiom works with real OS input too: uiv.desktop.click(uiv.offset(uiv.ocr.findText(anchor, {scope: "desktop"}), dx, dy)).)');
}
const b = uiv.browser;

uiv.open('https://ui.vision/demo/draw');
uiv.page.click('link=calculator');

// no engine pin: these reads use the engine configured in Settings > OCR
// ({engine: 'xmodule'} — the XModule Local OCR — reads best when installed)
uiv.setVar('!OCRLANGUAGE', 'eng');

// Anchors: mc (top-left key) and R2 (bottom row, 3rd column). Both are
// multi-char labels the OCR reads reliably — its neighbor R0 misreads as
// "RO" (letter O), and the digit keys are single chars, too short to trust.
const mc = uiv.ocr.findText('mc');
const r2 = uiv.ocr.findText('R2');
const stepX = (r2.x - mc.x) / 2; // mc -> R2: 2 columns
const stepY = (r2.y - mc.y) / 6; // mc -> R2: 6 rows

const key8 = uiv.offset(mc, Math.round(stepX), Math.round(2 * stepY));
const keyTimes = uiv.offset(mc, Math.round(3 * stepX), Math.round(2 * stepY));
const keyEquals = uiv.offset(mc, Math.round(3 * stepX), Math.round(5 * stepY));

// 8 x 8888 =
b.click(key8);
b.click(keyTimes);
for (let i = 0; i < 4; i++) {
  b.click(key8);
}
b.click(keyEquals);

// read the result from the display above the keypad — a REGION read composed
// from the same anchors: uiv.ocr.read({area}) replaces the classic
// OCRExtractbyTextRelative, so no uiv.run legacy bridge is needed
const shown = uiv.ocr.read({
  area: {
    x: mc.rect.left,
    y: Math.round(mc.y - 1.5 * stepY),
    width: Math.round(3 * stepX + 40),
    height: Math.round(stepY)
  }
});
uiv.log(\`Extracted string (Calculator result) is "\${shown}"\`, 'blue');

// keep only the digits — the display renders "71,104" and OCR may add marks
const digits = Number(String(shown).replace(/[^0-9]/g, ''));

if (digits === 71104) {
  uiv.log(\`8 x 8888 is \${digits}, Calculator works!\`, 'green');
} else {
  throw new Error(\`Calculator result is wrong: read "\${shown}" -> \${digits}, expected 71104\`);
}
`
  },
  {
    fileName: 'DemoXType.js',
    path: 'XModules/DemoXType.js',
    title: 'DemoXType (JS)',
    code: `// Port of Classic/XModules/DemoXType.
// XType is uiv.desktop.type: real OS keystrokes. Unlike uiv.browser.type it
// reaches things outside the page — here the browser's own Save dialog, which
// is not part of the DOM and cannot be automated any other way.
const x = uiv.desktop;

// the keystrokes go to whatever window has focus, so the browser must be in
// front — that is a browser-level action, not something page JS can do
uiv.window.focus();
uiv.open('https://ui.vision/demo/xtype');

// open the browser's save dialog with the platform shortcut
const isMac = uiv.getVar('!OS') === 'mac';
x.type(isMac ? '\${KEY_CMD+KEY_S}' : '\${KEY_CTRL+KEY_S}');

const d = new Date();
const pad = (n) => (n < 10 ? '0' + n : String(n));
const mydate = \`\${d.getFullYear()}-\${pad(d.getMonth() + 1)}-\${pad(d.getDate())}\`;
const mytime = \`\${d.getHours()}-\${d.getMinutes()}-\${d.getSeconds()}\`;
uiv.log(\`Today is \${mydate}, and the time is \${mytime}\`, 'blue');

// the dialog is an OS window: nothing in the page changes, so there is no
// element to wait for — a plain sleep is the honest way to wait for it
uiv.sleep('2s');

x.type(\`Page_saved_by_UiVision_\${mydate}_\${mytime}\`);
x.type('\${KEY_ENTER}');

uiv.log('DemoXType (JS) completed — check your download folder', 'green');
`
  },
  {
    // NOT a port — a new demo, born as JS. The one desktop-automation demo
    // that runs for every user out of the box: no image files (nothing to
    // break on a different DPI or theme), no OCR, no coordinates, no AI —
    // and it works in Chrome, Edge AND Firefox, on Windows and macOS.
    fileName: 'OpenBrowserDevTools.js',
    path: 'XModules_Desktop/OpenBrowserDevTools.js',
    title: 'OpenBrowserDevTools (JS)',
    code: `// Desktop automation that works for EVERY user: Chrome, Edge and Firefox, on
// Windows and macOS (Linux too) — with no image files to match (nothing to
// break on a different DPI or theme), no OCR, no screen coordinates, no AI.
//
// The target is the browser's own DevTools console: a window with NO DOM.
// uiv.$ cannot see it and uiv.browser.* cannot reach it — only real OS
// keystrokes (uiv.desktop.*, the XType family) can. That makes it the
// smallest possible "hello world" of desktop automation, and one that every
// user already has installed.
//
// The proof is a round trip: the OS keystrokes type one line of JavaScript
// into the console; the console runs it against the page and renames the
// page title; the extension then reads the new title back from the DOM. If
// the keystrokes had not really arrived, the title could not have changed.
const x = uiv.desktop;

// OS keystrokes go to whatever window is in FRONT — make sure that is the
// window this macro plays in. Note the order: open the page FIRST —
// uiv.window.focus() raises the window of the PLAY tab, and before the
// first tab command a run has no play tab yet, so it would raise nothing.
// (One thing it cannot do is steal focus from a DIFFERENT browser: the OS
// only lets the focused app hand focus over. With two browsers open, start
// the macro from the browser you want automated.)
uiv.open('https://ui.vision/demo/xtype');
uiv.window.focus();

// (read AFTER the first uiv command — before it, no special variable is set)
const os = uiv.getVar('!OS');
const browser = uiv.getVar('!BROWSER');
const isMac = os === 'mac';

// One chord opens the console WITH its input line focused, in every browser:
// Chrome and Edge use J (Cmd+Opt+J on mac, Ctrl+Shift+J elsewhere), Firefox
// uses K. No clicking needed — which is why no coordinates are needed.
const openConsole = browser === 'firefox'
  ? (isMac ? '\${KEY_CMD+KEY_OPTION+KEY_K}' : '\${KEY_CTRL+KEY_SHIFT+KEY_K}')
  : (isMac ? '\${KEY_CMD+KEY_OPTION+KEY_J}' : '\${KEY_CTRL+KEY_SHIFT+KEY_J}');

const GREETING = 'Hello from Ui.Vision';

uiv.banner('Real OS keystrokes will now open the DevTools console and type into it — hands off the keyboard for a moment…');

// One attempt: open (or focus) the console, type, then WATCH THE PAGE for
// proof. If the console is already open but not focused, the chord simply
// focuses its input line. The one trap is Firefox with the console input
// already FOCUSED: there the chord is a toggle and closes the console — the
// keystrokes then fall on the page (harmless: this page has no input
// fields), and the second attempt opens the console fresh.
const typeIntoConsole = (attempt) => {
  uiv.window.focus();   // OS input goes to the FOCUSED window, not the browser
  x.type(openConsole);
  // DevTools is not a web page: the extension cannot see into it, so there
  // is no element to wait for — a short sleep is the honest wait here
  uiv.sleep('2s');
  x.type("document.title = '" + GREETING + "'");
  x.type('\${KEY_ENTER}');
  // the console runs the line against the page — poll the PAGE for the effect
  for (let t = 0; t < 5; t++) {
    if (uiv.eval('return document.title') === GREETING) { return true; }
    uiv.sleep('1s');
  }
  uiv.log('Attempt ' + attempt + ': the page title has not changed yet', 'orange');
  return false;
};

if (!typeIntoConsole(1) && !typeIntoConsole(2)) {
  throw new Error('The typed console command never reached the page — is the browser window in the foreground, and the XModule installed?');
}
uiv.log(\`Proof: real OS keystrokes drove the \${browser} DevTools console on \${os} — the page title is now "\${GREETING}"\`, 'green');

// Show the result, then LEAVE THE BROWSER AS WE FOUND IT.
//
// The console used to be left open on purpose — the typed line in its history
// is the nicest proof of the demo. But DevTools SHRINKS the page viewport and
// shifts every layout beneath it, so any macro run afterwards measures a
// different window: in a demo sweep that surfaces as unrelated failures
// elsewhere (a toolbar image that no longer matches, a drawing demo picking
// the wrong tool), and the person debugging those has no reason to suspect
// this demo left the browser altered. The renamed tab title is proof enough,
// and it survives.
uiv.banner('<b>Desktop automation demo done:</b> real OS keystrokes opened the DevTools console and typed a command into it — look at the line it ran, and at the tab title: "' + GREETING + '". The console closes again in a moment, so the browser is left as it was.', { tone: 'green', seconds: 12 });
uiv.sleep('10s');   // long enough to actually read the console line

// The same chord toggles it shut. Re-assert focus first, because the banner
// and the wait give the user time to click elsewhere and this chord must not
// be fired at another application.
//
// But do NOT fail the demo on it. With DevTools open the keyboard focus sits
// in DevTools, which is neither the page nor the side panel, so focus()'s
// hasFocus() check reads false on both even though the browser IS frontmost —
// it cannot tell that apart from another app being in front. Everything this
// demo set out to prove has already happened by now, so an unconfirmable focus
// means "leave the console open and say so", not "fail".
try {
  uiv.window.focus();
  // The DevTools TOGGLE, not the open-console chord. openConsole (Cmd+Opt+K /
  // Ctrl+Shift+K in Firefox, ...+J in Chrome) opens or focuses the console; it
  // only closes DevTools when focus is already sitting in the console input,
  // which after the wait above it usually is not. Cmd+Opt+I / Ctrl+Shift+I
  // toggles the whole panel regardless — the chord this demo has always told
  // users to press.
  const toggleDevTools = isMac ? '\${KEY_CMD+KEY_OPTION+KEY_I}' : '\${KEY_CTRL+KEY_SHIFT+KEY_I}';
  const before = uiv.eval('return window.innerHeight');
  x.type(toggleDevTools);
  uiv.sleep('2s');
  // VERIFY rather than announce: closing DevTools gives the page its space
  // back, so innerHeight grows. Saying "closed" without checking is how this
  // step shipped broken once already.
  const after = uiv.eval('return window.innerHeight');
  if (after > before) {
    uiv.log('DevTools console closed again — the browser is back to how the demo found it', 'green');
  } else {
    uiv.log('The closing keystroke was sent but the console still looks open (page height ' + before + ' -> ' + after + '). Close it with ' + (isMac ? 'Cmd+Opt+I' : 'Ctrl+Shift+I') + ' — an open console shifts the page layout for later macros.', 'orange');
  }
} catch (e) {
  uiv.log('Could not confirm the browser was in front, so the closing keystroke was NOT sent — it would have gone to whatever window is. Close the console with ' + (isMac ? 'Cmd+Opt+I' : 'Ctrl+Shift+I') + ' (or F12). Note an open console shifts the page layout for later macros.', 'orange');
}
uiv.log('OpenBrowserDevTools completed', 'green');
`
  },
  {
    // NOT a port — born as JS. The side panel automating ITSELF, variant 1
    // of 3: desktop OCR. Same task in _local_imagesearch and _ai.find, so
    // the three desktop finders can be compared on identical work.
    fileName: 'ClearSidebarLogViaGUI_local_ocr.js',
    path: 'XModules_Desktop/ClearSidebarLogViaGUI_local_ocr.js',
    title: 'ClearSidebarLogViaGUI_local_ocr (JS)',
    code: `// The side panel automating ITSELF: find and press its own "Clear log"
// button (bottom bar of the Data tab) with desktop OCR and real OS clicks.
// Run it FROM the side panel, with the XModule installed.
//
// Normally IMPOSSIBLE: every desktop capture hides the extension UI behind
// a solid "Desktop capture in progress" cover, precisely so that desktop
// OCR/vision cannot match the macro source and log text the panel shows.
// Storing false into !CAPTURE_HIDE_GUI switches the cover off for the rest
// of this run — captures then show the real panel. Hiding stays the
// default: the next run starts covered again.
uiv.setVar('!CAPTURE_HIDE_GUI', false);

const x = uiv.desktop;
uiv.window.focus();   // OS input goes to the FOCUSED window, not the browser

// With the cover off, the old danger is back: the words this macro hunts
// are also in ITS OWN SOURCE, which sits in the editor on screen right now.
// Build the search terms at runtime, so the source spells them differently
// than the panel does.
const DATA = 'Da' + 'ta';                      // the tab this macro clicks
const LOGS = 'Lo' + 'gs';                      // its Logs sub-tab
// The button. The second word is WILDCARDED because macOS OCR reads its
// lowercase "lo" as the digits "10": the XModule engine returns "Clear 10g"
// for this button on the system font here, so an exact 'Clear log' matches
// nothing while the word is plainly on screen. '*g' matches both spellings,
// and the space keeps it from matching "ClearSidebarLogViaGUI..." in the
// source shown in the editor behind the panel.
const CLEAR_LOG = 'Cl' + 'ear ' + '*g';  // the button ("Clear log" / "Clear 10g")

// Search inside the BROWSER WINDOW only, and everything below stays in it.
// A whole-screen OCR reads every other window too: it used to need an
// 'AI Chat' + 'Data' anchor PAIR just to work out which 'Data' on screen
// belonged to the panel. Restricting the area removes that whole problem —
// and it is also what makes this demo work on macOS, where a screen-wide
// read starts with the global menu bar ("Firefox Developer Edition File
// Edit View History ...") that Windows simply does not have.
//
// The rect is the window's OWN geometry, straight from the page: screenX /
// screenY and outerWidth / outerHeight are CSS points and include the
// browser chrome, so the side panel — which is chrome, not page — is inside
// it. (The viewport rect would NOT contain the panel.)
const win = uiv.eval('return { x: window.screenX, y: window.screenY, w: window.outerWidth, h: window.outerHeight };');
const AREA = { x: win.x, y: win.y, width: win.w, height: win.h };

// One word is enough now. The tab row sits at the TOP of the panel, and the
// only other 'Data' the window can show is in the log list or this macro's
// own source below it — so take the topmost match. (Desktop-scope OCR
// upgrades to the XModule Local OCR by itself — the Javascript engine
// cannot read the panel's small UI font.)
const dataTab = uiv.ocr.findTexts(DATA, { scope: 'desktop', area: AREA, timeout: 15 })
  .sort((a, b) => a.y - b.y)[0];
if (!dataTab) throw new Error('no ' + DATA + ' tab found in the browser window — is the side panel open and fully visible?');
x.click(dataTab);

// The Data tab replaces the editor — but its LOG LIST (when the Logs
// sub-tab is active) prints this macro's own "Executing ..." lines, which
// contain the same words. The real button is the BOTTOM-RIGHT occurrence
// of its label: the bar sits below the list, the button at its right edge.
// (Never click a matched word INSIDE the list — a log-entry click jumps
// the panel back to the macro source.)
const clearButton = (required) => {
  const ms = uiv.ocr.findTexts(CLEAR_LOG, { scope: 'desktop', area: AREA, required: required, timeout: required ? 10 : 5 });
  return ms.length ? ms.sort((a, b) => (b.x + b.y) - (a.x + a.y))[0] : null;
};
let btn = clearButton(false);
if (!btn) {
  // No button on screen: the Data tab remembered another sub-tab (Shots,
  // CSV, Visual). Only NOW is searching the sub-tab word safe — without
  // the log list, the topmost occurrence in the panel IS the sub-tab.
  const logsTab = uiv.ocr.findTexts(LOGS, { scope: 'desktop', area: AREA, timeout: 10 }).sort((a, b) => a.y - b.y)[0];
  x.click(logsTab);
  btn = clearButton(true);
}
x.click(btn);

// leave things as found: captures hide the panel again from here on.
// The message lands in the log the macro just emptied — visible proof.
uiv.setVar('!CAPTURE_HIDE_GUI', true);
uiv.log('Log deleted — the side panel pressed its own Clear-log button (local OCR)', 'green');
`
  },
  {
    // Variant 2 of 3: local image search. Same task as _local_ocr — pixel
    // anchors instead of text. Anchor images capture the panel at 100%
    // display scaling; on another DPI re-capture them (save_element_image
    // or uiv.shot.area).
    fileName: 'ClearSidebarLogViaGUI_local_imagesearch.js',
    path: 'XModules_Desktop/ClearSidebarLogViaGUI_local_imagesearch.js',
    title: 'ClearSidebarLogViaGUI_local_imagesearch (JS)',
    code: `// The side panel automating ITSELF: press its own "Clear log" button
// (bottom bar of the Data tab), targeted with IMAGE SEARCH this time. Run
// it FROM the side panel, with the XModule installed. See _local_ocr for
// the cover story: !CAPTURE_HIDE_GUI=false makes desktop captures show the
// panel.
//
// Unlike the OCR variant, images need no word tricks: the editor shows this
// SOURCE as text, and text never pixel-matches a screenshot of a button.
// The price is DPI sensitivity — the anchors are 100%-scaling captures.
uiv.setVar('!CAPTURE_HIDE_GUI', false);

const x = uiv.desktop;
uiv.window.focus();   // OS input goes to the FOCUSED window, not the browser

// the Data tab in the sidebar tab row — the image shows the INACTIVE look,
// so no match usually means the Data tab is already the active one
const dataTab = uiv.findImages('sidebar_datatab_dpi_96.png', { scope: 'desktop', minScore: 0.75, required: false });
if (dataTab.length) x.click(dataTab[0]);

// The Clear-log button sits in the bar below the log list. If it is not on
// screen, the Data tab remembered another sub-tab (Shots, CSV, Visual) —
// then the sub-tab bar is visible and shows the INACTIVE Logs sub-tab,
// which is exactly what its anchor image pictures.
let btn = uiv.findImages('sidebar_clearlog_dpi_96.png', { scope: 'desktop', minScore: 0.75, required: false, timeout: 5 });
if (!btn.length) {
  x.click(uiv.findImage('sidebar_logstab_dpi_96.png', { scope: 'desktop', minScore: 0.75 }));
  btn = uiv.findImages('sidebar_clearlog_dpi_96.png', { scope: 'desktop', minScore: 0.75 });
}
x.click(btn[0]);

// leave things as found: captures hide the panel again from here on.
// The message lands in the log the macro just emptied — visible proof.
uiv.setVar('!CAPTURE_HIDE_GUI', true);
uiv.log('Log deleted — the side panel pressed its own Clear-log button (image search)', 'green');
`
  },
  {
    // Variant 3 of 3: the model as the finder. Same task as _local_ocr —
    // uiv.ai.find points at the targets, no OCR wordlists and no image
    // files to maintain; each call is billable.
    fileName: 'ClearSidebarLogViaGUI_ai.find.js',
    path: 'XModules_Desktop/ClearSidebarLogViaGUI_ai.find.js',
    title: 'ClearSidebarLogViaGUI_ai.find (JS)',
    code: `// The side panel automating ITSELF: press its own "Clear log" button
// (bottom bar of the Data tab), located by the AI vision finder. Run it
// FROM the side panel, with the XModule installed (the clicks are real OS
// input). See _local_ocr for the cover story: !CAPTURE_HIDE_GUI=false
// makes desktop captures show the panel.
uiv.setVar('!CAPTURE_HIDE_GUI', false);

const x = uiv.desktop;
uiv.window.focus();   // OS input goes to the FOCUSED window, not the browser

// ai.find does not auto-wait, and the panel has no DOM a script could wait
// on — give each click a moment to render before the next screenshot. The
// prompts describe targets by PLACE (tab row, bottom bar): this macro's own
// source is on screen too until the Data tab hides the editor, and a bare
// "find Data" could point at these very words.
const find = (what) => {
  const m = uiv.ai.find(what, { scope: 'desktop' });
  uiv.log(what + ' => ' + m.x + ',' + m.y, 'blue');
  return m;
};

x.click(find('In the Ui.Vision side panel, the "Data" tab in the tab row at the very top, right of the "AI Chat" tab'));
uiv.sleep('1s');

// The button only exists while the Logs sub-tab is active; when the Data
// tab remembered another sub-tab, open Logs first. The failed find is one
// extra model call, but only on that path.
let btn;
try {
  btn = find('The "Clear log" button in the bar at the bottom right of the Ui.Vision side panel, below the log list');
} catch (e) {
  x.click(find('The "Logs" sub-tab in the second tab row of the Ui.Vision side panel'));
  uiv.sleep('1s');
  btn = find('The "Clear log" button in the bar at the bottom right of the Ui.Vision side panel, below the log list');
}
x.click(btn);

// leave things as found: captures hide the panel again from here on.
// The message lands in the log the macro just emptied — visible proof.
uiv.setVar('!CAPTURE_HIDE_GUI', true);
uiv.log('Log deleted — the side panel pressed its own Clear-log button (ai.find)', 'green');
`
  },
  {
    fileName: 'DemoXMove.js',
    path: 'XModules/DemoXMove.js',
    title: 'DemoXMove (JS)',
    code: `// Port of Classic/XModules/DemoXMove.
// Same sliders as DemoBrowserDrag, but driven with REAL OS mouse input.
//
// The important difference is coordinates. uiv.browser.* works in viewport
// pixels; uiv.desktop.* works in SCREEN pixels. So the images have to be found
// in desktop scope too — {scope: 'desktop'} searches a screenshot of the whole
// screen and returns screen coordinates. Passing a browser-scope match to
// uiv.desktop.* is rejected outright rather than clicking a plausible but
// wrong spot.
const x = uiv.desktop;
const DESKTOP = { scope: 'desktop' };

uiv.open('https://ui.vision/demo/draw');
uiv.page.click('link=this external website');
uiv.window.focus();   // OS input goes to the FOCUSED window, not the browser

// --- 2nd slider: classic "@0.75#2" = confidence + which match ---------------
const handles = uiv.findImages('slider_handle_dpi_96.png', { scope: 'desktop', minScore: 0.75 });
uiv.log(\`found \${handles.length} slider handles on screen\`, 'blue');
if (handles.length < 2) {
  throw new Error(\`expected at least 2 slider handles, found \${handles.length}\`);
}

const second = handles[1];
x.down(second);
x.up(second.x + 200, second.y);

// --- 3rd slider: search INSIDE one region ------------------------------------
// six identical handles are on the page. A DOM rect cannot limit a DESKTOP
// search (an {area} in viewport coordinates would be rejected — screen pixels
// only), so the region is built from a desktop-scope match instead: find the
// red thermometer at the warm end, then look for the handle in a band
// extending one track-length to its left — everything in screen pixels, and
// every size in units the anchor itself provides.
const warmEnd = uiv.findImage('slider_warmth_dpi_96.png', { scope: 'desktop', minScore: 0.6 });
const w = warmEnd.rect.width;
const band = {
  x: warmEnd.x - 45 * w,
  y: warmEnd.y - warmEnd.rect.height,
  width: 45 * w,
  height: 2 * warmEnd.rect.height
};
const handle3 = uiv.findImage('slider_handle_dpi_96.png', { scope: 'desktop', minScore: 0.6, area: band });
x.down(handle3);
// composed relative target — see DemoBrowserDrag; the desktop-scope match makes
// uiv.offset return screen pixels, so the same idiom feeds uiv.desktop.*
x.up(uiv.offset(warmEnd, -Math.round(1.05 * w), 0));

// the RESULT is read from the DOM — no OCR needed for text the page has
const warmth = uiv.$('xpath=//ion-list[3]/ion-list-header/div/ion-badge').text;
uiv.log(\`Slider WARMTH value is: \${warmth}\`, 'red');
if (String(warmth).trim() !== '2000') {
  throw new Error(\`slider did not reach 2000 — it reads \${warmth}\`);
}
uiv.log('DemoXMove (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoXRun.js',
    path: 'XModules/DemoXRun.js',
    title: 'DemoXRun (JS)',
    code: `// Port of Classic/XModules/DemoXRun.
// XRun starts a program on the computer — nothing a page can do, so it stays
// on the legacy bridge. The classic if/elseif/else chain over !os becomes a
// plain lookup.
uiv.log('This demo uses hard-coded paths for the default calculator app — adjust them for your machine.', 'blue');

const os = uiv.getVar('!OS');
const calculator = {
  mac: '/Applications/Calculator.app/Contents/MacOS/Calculator',
  linux: '/snap/bin/gnome-calculator',
  windows: 'C:\\\\Windows\\\\System32\\\\calc.exe'
}[os];

if (!calculator) {
  throw new Error(\`no calculator path known for OS '\${os}'\`);
}

uiv.run('XRun', calculator);
uiv.log(\`Calculator app launched (\${os}: \${calculator})\`, 'green');

// XRunAndWait blocks until the program exits and reports its exit code:
//   uiv.run('XRunAndWait', 'Powershell.exe', '-executionpolicy bypass -File c:\\\\test.ps1');
//   uiv.log(\`Exit code = \${uiv.getVar('!XRUN_EXITCODE', '')}\`);
`
  },
  {
    fileName: 'Right-click context menu.js',
    path: 'XModules_Desktop/Right-click context menu.js',
    title: 'Right-click context menu (JS)',
    code: `// Save a web page through the browser's RIGHT-CLICK context menu and the OS
// save dialog. Both are NATIVE UI outside the page DOM — no page command can
// reach them, so everything after the right-click is desktop-tier (XModule)
// work: real OS input plus desktop-scope OCR.
const x = uiv.desktop;

uiv.open('https://ui.vision');

// The browser window must be IN FRONT: a browser-scope OS click is aimed at
// the window's screen position, so any window covering that spot gets the
// click instead. uiv.window.focus() raises the play tab's window, but
// no browser API may steal the foreground from ANOTHER APP (the OS forbids
// it) — a real OS click may, so click a visible piece of the PAGE itself:
// the desktop-scope finder only returns what is actually on screen, and the
// tallest match is the page's big heading, never the same words rendered
// small in some other window.
uiv.window.focus();
uiv.sleep('500ms'); // settle: let the window reach the foreground
const onScreen = uiv.ocr.findTexts('Open-Sourc*', {scope: 'desktop', required: false, timeout: 5});
if (!onScreen.length) {
  throw new Error('The ui.vision page is not visible on screen — this demo drives the browser with real OS input, so its window must not be covered by another app.');
}
x.click(onScreen.sort((a, b) => b.rect.height - a.rect.height)[0]);

// LANGUAGE-INDEPENDENT MENU TARGETING: the menu wording follows the browser's
// UI language — read the locale and look up the save entry's most distinctive
// word (wildcards absorb OCR misreads, 'speichem' happens).
const lang = String(uiv.eval('return navigator.language') || 'en').toLowerCase().slice(0, 2);
const SAVE_WORD = {
  en: 'Save', de: 'speich*', fr: 'enregistr*', es: 'Guardar*', it: 'Salva*',
  pt: 'Salvar*', nl: 'opslaan*', pl: 'Zapisz*', ru: 'Сохранить*',
  zh: '另存*', ja: '名前*', ko: '저장*'
}[lang];
if (!SAVE_WORD) {
  throw new Error('No save-menu wording known for UI language "' + lang + '" — add it to the SAVE_WORD table at the top of this macro.');
}

// Non-Latin scripts need the matching OCR language, or the reader cannot see
// the menu text at all (the default language covers Latin scripts only).
// 另存 is written identically in simplified and traditional Chinese, so one
// Chinese OCR language covers both.
const OCR_LANG = { ru: 'rus', ja: 'jpn', ko: 'kor', zh: 'chs' }[lang];
if (OCR_LANG) { uiv.setVar('!OCRLANGUAGE', OCR_LANG); }

// scan with the configured engine, then once more with the XModule Local OCR
// ({engine: 'xmodule'}) — explicitly chosen here: the better reader for native UI
const scan = () => {
  let m = uiv.ocr.findTexts(SAVE_WORD, {scope: 'desktop', required: false, timeout: 3});
  if (!m.length) {
    try { m = uiv.ocr.findTexts(SAVE_WORD, {scope: 'desktop', required: false, timeout: 3, engine: 'xmodule'}); } catch (e) { /* no XModule Local OCR */ }
  }
  return m;
};

// A browser-scope desktop click takes VIEWPORT coordinates, fronts the browser
// and aims the OS click at that page position. (100, 300) is the page's left
// margin, so the right-click opens the page (or image) context menu — both
// contain the save-page entry. The left-click first guarantees the browser
// window has the focus, even when the user was just working in a different app.
x.click(100, 300, {scope: 'browser'});

// BEFORE opening the menu: remember where the word already appears on screen
// (another window may show it — a docs page, a chat, an editor). Those are
// background noise; the menu entry will be the match that is NEW.
const noise = scan();

x.click(100, 300, {scope: 'browser', button: 'right'});
uiv.sleep('1s'); // settle: let the native menu paint before the OCR pass

// "new" = not in the noise baseline, i.e. it appeared with the menu/dialog
const isNew = (h, extra) => !noise.concat(extra || []).some((n) => Math.abs(n.x - h.x) < 10 && Math.abs(n.y - h.y) < 10);

const item = scan().find((h) => isNew(h));
if (!item) {
  x.type('\${KEY_ESC}'); // close the menu again — leave a clean screen behind
  throw new Error('The save-page entry ("' + SAVE_WORD + '") was not found in the context menu by OCR — try the XModule Local OCR (Settings > OCR), or adjust SAVE_WORD for your language.');
}
x.click(item);
uiv.sleep('2s'); // settle: the OS save dialog takes a moment to appear

// POSITIVE proof that the dialog is up BEFORE typing blindly into it — but
// NOT by reading the file-name field: it shows its text small and SELECTED
// (white on highlight), which local OCR regularly cannot read, and a failed
// read there would abort a save that actually worked. The dialog's TITLE
// carries the same word as the menu entry ("Speichern unter", "Save As") in
// large text instead: the menu is gone by now, so a fresh match somewhere
// ELSE than the menu entry means the dialog is open.
const dialog = scan().find((h) => isNew(h, [item]));
if (!dialog) {
  x.type('\${KEY_ESC}');
  throw new Error('The save dialog did not open — the menu click missed the save entry.');
}

// The dialog opens with the suggested file name SELECTED — typing replaces
// it. Native dialogs have no DOM: these are blind keystrokes. The name
// carries a timestamp so it is unique EVERY run: a reused name (an earlier
// "abc.htm") makes Windows ask "replace it?", and confirming that dialog
// blind is exactly the kind of flakiness a demo must not have.
const d = new Date();
const pad = (n) => (n < 10 ? '0' + n : String(n));
const saveName = 'page_' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + pad(d.getHours()) + '-' + pad(d.getMinutes()) + '-' + pad(d.getSeconds()) + '.htm';
x.type(saveName);
x.type('\${KEY_ENTER}');

// ...and now the dialog must be GONE — its title would still be on screen
// otherwise. A macro must fail loudly when the goal was not reached.
uiv.sleep('2s'); // settle: let the dialog close
if (scan().some((h) => isNew(h, [item]))) {
  throw new Error('The save dialog is still open — the file name entry or the save click did not work');
}
uiv.log('Page saved as ' + saveName + ' via the native right-click menu — check the browser download folder', 'green');
`
  },
  {
    fileName: 'ai.ask_ParseHTML.js',
    path: 'LLM AI Commands/ai.ask_ParseHTML.js',
    title: 'ai.ask_ParseHTML (JS)',
    code: `// Port of Classic/LLM AI Commands/ai.ask_ParseHTML.
// Send page content to the LLM, then turn its answer into a CSV.
//
// uiv.ai.ask is one round trip to the configured model. Everything
// AROUND it — cleaning the HTML, splitting the reply, building the rows — is
// ordinary JavaScript, which is where the classic macro needed two
// executeScript_Sandbox blocks with the code squeezed into one cell.
uiv.open('https://forum.ui.vision/');

// Grab the page CONTENT via the finder, not uiv.eval: this forum ships a
// strict Content-Security-Policy that blocks executeScript-based page JS on
// Firefox — match.text comes through the content script and is CSP-immune.
// Sending rendered text instead of raw HTML also costs less and answers
// better.
const html = uiv.$('css=body').text.replace(/\\s+/g, ' ').slice(0, 20000);
uiv.log(\`Extracted \${html.length} characters of page text\`, 'brown');

// uiv.ai.ask passes the prompt through untouched — no \${...} in the page
// source can be mistaken for a variable reference
const answer = String(uiv.ai.ask(
  \`What are the titles of the first 5 forum posts? Return just the titles, one per line, no numbering.\\n\\nPage: \${html}\`
));
uiv.log(\`First 5 Forum Titles = \${answer}\`, 'green');

// the model returns lines; a CSV wants rows
const rows = answer
  .split('\\n')
  .map(line => line.trim())
  .filter(line => line.length > 0)
  .map(line => [line]);

if (rows.length === 0) {
  throw new Error(\`the model returned no usable titles: "\${answer}"\`);
}

uiv.csv.write('first5forumposts.csv', rows);
uiv.log(\`Saved \${rows.length} titles to first5forumposts.csv\`, 'green');
`
  },
  {
    fileName: 'ai.ask_CompareImages.js',
    path: 'LLM AI Commands/ai.ask_CompareImages.js',
    title: 'ai.ask_CompareImages (JS)',
    code: `// Port of Classic/LLM AI Commands/ai.ask_CompareImages.
// Ask the model whether two images match. The classic macro's \`verify\`
// commands become plain checks — and unlike verify, a failure here can say
// what the model actually replied.
const ask = (imageA, imageB, question) =>
  String(uiv.ai.ask(question, { images: [imageA, imageB] })).trim().toLowerCase();

const QUESTION = 'Are both images the same? Answer only true or false.';

// Test 1: the same image twice -> must be true
const same = ask('canvas_wyoming_dpi_96.png', 'canvas_wyoming_dpi_96.png', QUESTION);
uiv.log(\`Test1: Are the images the same? \${same}\`, 'green');
if (!same.includes('true')) {
  throw new Error(\`Test1 failed: identical images should compare as true, model said "\${same}"\`);
}

// Test 2: two different images -> must be false. Deliberately two UNRELATED
// pictures (a Wyoming map vs a Hyde Park map): wyoming_verify is a crop of
// the SAME map, and "are these the same?" on a crop is a judgment call that
// smaller models answer with true — the demo must not fail on that.
const different = ask('canvas_wyoming_dpi_96.png', 'canvas_hydepark_dpi_96.png', QUESTION);
uiv.log(\`Test2: Are the images the same? \${different}\`, 'green');
if (!different.includes('false')) {
  throw new Error(\`Test2 failed: different images should compare as false, model said "\${different}"\`);
}

uiv.log('ai.ask_CompareImages (JS) completed — both comparisons as expected', 'green');
`
  },
  // CU_FillForm.js was here. Retired 2026-08-08: the computer-use loop hangs on
  // the contact form's select box and never returns, so the demo runs until the
  // loop cap instead of finishing — and a hung run takes the whole side panel
  // with it (it killed the MCP bridge connection mid-suite during the macOS demo
  // sweep, which is how this was caught). Being reworked; its path is listed in
  // MOVED_JS_PREINSTALL_PATHS so a restore removes the copy already installed.
  {
    fileName: 'ai.find_SearchForum.js',
    path: 'LLM AI Commands/ai.find_SearchForum.js',
    title: 'ai.find_SearchForum (JS)',
    code: `// Port of Classic/LLM AI Commands/ai.find_SearchForum.
// uiv.ai.find asks the model WHERE something is on screen: a vision finder
// powered by an LLM rather than template matching, for when there is no image
// to match and no DOM to query. It returns a match, DPI already accounted for.
// DOM clicks act on the model's point, so this runs in every browser; typing
// goes through uiv.page.type on the focused search field.
uiv.open('https://forum.ocr.space/');

// uiv.ai.find RETURNS the match, so the !AI1/!AI2 dance the classic macro
// needed is gone — reading those in a script now throws, because the next
// uiv call overwrites them.
// {scope: 'browser'} pins THIS call to the viewport — the per-call form of
// the classic global XDesktopAutomation toggle — so the demo behaves the same
// even when desktop mode is switched on in the config. ai.find throws by
// itself when the model gives no usable coordinates, so nothing to check here.
const locate = (what) => {
  const point = uiv.ai.find(what, { scope: 'browser' });
  uiv.log(\`\${what} => \${point.x},\${point.y}\`, 'blue');
  return point;
};

const searchIcon = locate('Find the search icon (magnifying glass).');
uiv.page.click(searchIcon);

// fill the search box the click revealed — the forum searches as you type,
// so no ENTER key is needed (key codes are uiv.browser.type territory)
uiv.page.type('css=input[type="search"], input[name="term"], input', 'V10');

const firstResult = locate('Find the first search result (blue text)');
uiv.page.click(firstResult);

uiv.log('ai.find_SearchForum (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoBrowserClick.js',
    path: 'Browser Vision (Chrome, Edge)/DemoBrowserClick.js',
    title: 'uiv.browser.click (JS)',
    code: `// Draws a square on a canvas, then types a caption — with trusted CDP input
// (uiv.browser.*), so no XModule is needed and the browser window may stay in
// the background.
//
// A drag is press, move, release: uiv.browser.down holds the button, every
// uiv.browser.move while it is held drags, and .up releases — the corner
// coordinates are two numbers in a loop.
if (uiv.getVar('!BROWSER') === 'firefox') {
  uiv.exit('This demo uses trusted CDP input (uiv.browser.*), which Firefox does not support — see XModules/DemoXClick for the same drawing with real OS input.');
}
const t = uiv.browser;
const FIND = {};
const find = (name, minScore) => uiv.findImage(name, minScore ? Object.assign({ minScore: minScore }, FIND) : FIND);

uiv.open('https://ui.vision/demo/draw');
uiv.page.click('link=this link');

// classic visualAssert -> the finder throws if the canvas is not there
find('draw_canvas_dpi_96.png');

t.click(find('draw_plus_dpi_96.png'));
t.click(find('draw_redbutton_dpi_96.png'));

// COMPOSED relative clicks (green/pink relative images used to do this):
// the pencil icon changes shape with the chosen color, so
// both targets are anchored on the STABLE select+crop icons at the top of the
// toolbar instead. The offsets are in units of the anchor's own measured
// rect, so they scale with the page — the same adaptation the classic pink
// box got from the vision engine. The pencil sits one anchor-height below.
const tools = find('draw_toolbar_top_dpi_96.png');
t.click(uiv.offset(tools, 0, Math.round(0.95 * tools.rect.height)));
t.type('\${KEY_ESC}');

// the drawing start point is BLANK canvas — nothing findable there, which is
// exactly what an offset from an anchor is for
const start = uiv.offset(tools, Math.round(6 * tools.rect.width), Math.round(1.2 * tools.rect.height));
uiv.log(\`Starting point: x=\${start.x} y=\${start.y}\`, 'green');

// draw a 100 x 100 square, one edge per step
let x = start.x;
let y = start.y;
const SIDE = 100;
const edges = [
  { dx: SIDE, dy: 0, name: 'top' },
  { dx: 0, dy: SIDE, name: 'right' },
  { dx: -SIDE, dy: 0, name: 'bottom' },
  { dx: 0, dy: -SIDE, name: 'left' }
];

edges.forEach(edge => {
  t.down(x, y);
  x += edge.dx;
  y += edge.dy;
  t.move(x, y);      // still held -> this drags
  t.up(x, y);
  uiv.log(\`drew the \${edge.name} edge to \${x},\${y}\`);
});

// --- add some text ----------------------------------------------------------
t.click(find('draw_text1_dpi_96.png'));
t.type('\${KEY_ESC}');

// click the canvas where the text should start
y += 180;
t.click(x, y);
t.type('Demo completed.');

// click once more to close the text menu
y -= 150;
t.click(x, y);

// confirm the text really appeared (@0.4 relaxes the global confidence)
find('draw_checkresult1_dpi_96.png', 0.4);
uiv.log('DemoBrowserClick (JS) completed', '#shownotification');
`
  },
  {
    fileName: 'DemoXClick.js',
    path: 'XModules/DemoXClick.js',
    title: 'DemoXClick (JS)',
    code: `// Port of Classic/XModules/DemoXClick.
// Draws a square on a canvas, then types a caption — with real OS mouse input, which needs the XModule and a visible browser window
//
// A drag is press, move, release: uiv.desktop.down holds the button, every
// uiv.desktop.move while it is held drags, and .up releases. The classic
// macro does the same with #down/#move/#up value modifiers, and recomputes the
// corner coordinates in four separate executeScript_Sandbox commands — here
// they are two numbers in a loop.
const t = uiv.desktop;
const FIND = { scope: 'desktop' };
const find = (name, minScore) => uiv.findImage(name, minScore ? Object.assign({ minScore: minScore }, FIND) : FIND);

// OS input goes to whatever window is in front
uiv.window.focus();
uiv.open('https://ui.vision/demo/draw');
uiv.page.click('link=this link');

// classic visualAssert -> the finder throws if the canvas is not there
find('draw_canvas_dpi_96.png');

t.click(find('draw_plus_dpi_96.png'));
t.click(find('draw_redbutton_dpi_96.png'));

// COMPOSED relative clicks — see DemoBrowserClick: the pencil icon changes shape,
// so both targets are anchored on the stable select+crop icons at the top of
// the toolbar, with offsets in units of the anchor's own measured rect. The
// desktop-scope match makes uiv.offset return screen pixels for uiv.desktop.*.
const tools = find('draw_toolbar_top_dpi_96.png');
t.click(uiv.offset(tools, 0, Math.round(0.95 * tools.rect.height)));
t.type('\${KEY_ESC}');

const start = uiv.offset(tools, Math.round(6 * tools.rect.width), Math.round(1.2 * tools.rect.height));
uiv.log(\`Starting point: x=\${start.x} y=\${start.y}\`, 'green');

// draw a 100 x 100 square, one edge per step
let x = start.x;
let y = start.y;
const SIDE = 100;
const edges = [
  { dx: SIDE, dy: 0, name: 'top' },
  { dx: 0, dy: SIDE, name: 'right' },
  { dx: -SIDE, dy: 0, name: 'bottom' },
  { dx: 0, dy: -SIDE, name: 'left' }
];

edges.forEach(edge => {
  t.down(x, y);
  x += edge.dx;
  y += edge.dy;
  t.move(x, y);      // still held -> this drags
  t.up(x, y);
  uiv.log(\`drew the \${edge.name} edge to \${x},\${y}\`);
});

// --- add some text ----------------------------------------------------------
t.click(find('draw_text1_dpi_96.png'));
t.type('\${KEY_ESC}');

// click the canvas where the text should start
y += 180;
t.click(x, y);
t.type('Demo completed.');

// click once more to close the text menu
y -= 150;
t.click(x, y);

// confirm the text really appeared (@0.4 relaxes the global confidence)
find('draw_checkresult1_dpi_96.png', 0.4);
uiv.log('DemoXClick (JS) completed', '#shownotification');
`
  },
  {
    // the XClick twin of the root "Draw a cat🐱" welcome demo: same cat,
    // real OS input instead of CDP — so it runs on Firefox too. Live-tested
    // on Windows + Firefox.
    fileName: 'Draw a cat🐱 - XClick version.js',
    path: 'XModules/Draw a cat🐱 - XClick version.js',
    title: 'Draw a cat - XClick (JS)',
    code: `// Draw a smiling cat on excalidraw.com — the XClick version: real OS mouse
// and keyboard input (uiv.desktop.*), so it runs in EVERY browser, Firefox
// included. The browser-vision twin ("Draw a cat🐱") does the same with
// trusted CDP input and needs no XModule, but is Chrome/Edge-only; this one
// needs the XModule and a visible browser window.
//
// Like the classic XClick, uiv.desktop.* speaks BOTH coordinate spaces: bare
// numbers are SCREEN pixels, but a browser-finder match — or numbers with
// {scope: 'browser'} — means VIEWPORT pixels: the OS click is aimed at that
// page position automatically (window offset, side panel and DPI corrected,
// and the browser is brought to the foreground first). So the whole cat is
// drawn in viewport coordinates straight from the DOM finders — no manual
// viewport->screen measuring, no anchor images.
uiv.open('https://excalidraw.com/');
uiv.banner('<b>Ui.Vision drawing demo (XClick)</b> — this macro is not affiliated with or endorsed by Excalidraw.', { seconds: 10, position: 'bottom' });

const c = uiv.$('css=canvas'); // auto-waits until the app has rendered
const x = uiv.desktop;
uiv.window.focus();   // OS input goes to the FOCUSED window, not the browser
const isMac = uiv.getVar('!OS') === 'mac';
const V = { scope: 'browser' }; // "these numbers are VIEWPORT pixels"

const cx = c.x;      // cat center = canvas center
const cy = c.y - 20; // nudged up so the body fits above the bottom bar

// One real click on empty canvas FIRST: OS keystrokes go to the focused
// element, and until the page is clicked that may well be the side panel.
// (A viewport-scope OS click also brings the browser window to the front.)
x.click(cx, cy, V);

// Clear any existing scene so re-runs start blank
x.type('\${KEY_ESC}');
x.type(isMac ? '\${KEY_CMD+KEY_A}' : '\${KEY_CTRL+KEY_A}');
x.type('\${KEY_DEL}');

// Excalidraw reverts to the selection tool after each shape - re-select before
// every element. Prefer the DOM locator for WHERE the tool is (the match
// carries browser scope by itself), fall back to the toolbar position
// (horizontally centered, icons at y=40) — either way the click is a real
// OS click aimed at a viewport position.
const TOOL_DX = { rectangle: -127, ellipse: -43, line: 41, freedraw: 83, text: 125 };
const selectTool = (testid) => {
  const t = uiv.$('css=[data-testid="toolbar-' + testid + '"]', { required: false, timeout: 3 });
  if (t) { x.click(t); } else { x.click(cx + TOOL_DX[testid], 40, V); }
};

// One polyline = one press-drag-release: down holds the button, every move
// while it is held drags, up releases at the last point
const drag = (pts) => {
  x.down(cx + pts[0][0], cy + pts[0][1], V);
  for (let i = 1; i < pts.length - 1; i++) {
    x.move(cx + pts[i][0], cy + pts[i][1], V);
  }
  const last = pts[pts.length - 1];
  x.up(cx + last[0], cy + last[1], V);
};

// Body first (ellipse), then head on top, so overlaps look tidy
selectTool('ellipse');
drag([[-78,74],[78,198]]);   // body: oval tucked under the chin
selectTool('ellipse');
drag([[-110,-90],[110,70]]); // head: wide oval

// Ears: freehand triangles with midpoints on each edge so the lines stay straight
selectTool('freedraw');
drag([[-88,-60],[-80,-99],[-72,-138],[-55,-111],[-38,-84]]);
drag([[38,-84],[55,-111],[72,-138],[80,-99],[88,-60]]);

// Eyes: two small precise ovals, each with a freehand pupil dot inside
selectTool('ellipse');
drag([[-60,-40],[-35,-10]]);
selectTool('ellipse');
drag([[35,-40],[60,-10]]);
selectTool('freedraw');
drag([[-51,-25],[-47,-28],[-44,-25],[-47,-22],[-51,-25]]);
drag([[44,-25],[48,-28],[51,-25],[48,-22],[44,-25]]);

// Nose: freehand triangle, closed
drag([[-13,2],[13,2],[0,24],[-13,2]]);
// Smile: wide upward curve under the nose
drag([[-32,30],[-18,42],[0,47],[18,42],[32,30]]);

// Whiskers: straight line-tool strokes, three per side
const whiskers = [
  [[-70,10],[-130,0]], [[-70,20],[-132,22]], [[-70,30],[-128,42]],
  [[70,10],[130,0]],  [[70,20],[132,22]],  [[70,30],[128,42]]
];
for (const w of whiskers) {
  selectTool('line');
  drag(w);
}

// Tail: one freehand curve swinging up from the body
selectTool('freedraw');
drag([[75,160],[115,150],[140,120],[145,85]]);

// Headline as a REAL text element: text tool -> click above the cat -> type
// with real OS keystrokes -> Escape commits
const GREETING = 'Welcome to Ui.Vision';
selectTool('text');
x.click(cx - 105, cy - 195, V);
x.type(GREETING);
x.type('\${KEY_ESC}');

x.type('\${KEY_ESC}'); // deselect so no selection handles linger

// PROVE the drawing landed: count elements by type in Excalidraw's persisted
// scene, and check the text element carries the exact greeting
let counts = null;
for (let t = 0; t < 10; t++) {
  counts = uiv.eval('var els; try { els = JSON.parse(localStorage.getItem("excalidraw") || "[]"); } catch (e) { els = []; } if (!Array.isArray(els)) { els = []; } var r = {ellipse: 0, freedraw: 0, line: 0, text: 0, textContent: ""}; for (var i = 0; i < els.length; i++) { var el = els[i]; if (el.isDeleted) { continue; } if (el.type === "text") { r.text++; r.textContent = el.text; } else if (r[el.type] !== undefined) { r[el.type]++; } } return r;');
  if (counts.ellipse >= 4 && counts.freedraw >= 7 && counts.line >= 6 && counts.text >= 1) { break; }
  uiv.sleep(500); // pacing the localStorage poll - persistence is debounced
}
if (counts.ellipse < 4 || counts.freedraw < 7 || counts.line < 6) {
  throw new Error('Scene has ' + counts.ellipse + '/4 ellipses, ' + counts.freedraw + '/7 freedraw, ' + counts.line + '/6 lines - cat did not land');
}
if (counts.text < 1 || counts.textContent !== GREETING) {
  throw new Error('Text element missing or wrong: found ' + counts.text + ' text element(s), content "' + counts.textContent + '"');
}
uiv.log('Cat + greeting drawn with real OS input: ' + counts.ellipse + ' ellipses, ' + counts.line + ' lines, ' + counts.freedraw + ' strokes, text "' + counts.textContent + '"', 'green');
`
  },
  {
    // self-test for the desktop-click coordinate pipeline: run it on any
    // machine where desktop clicks seem to land in the wrong place. Part 1
    // clicks KNOWN coordinates (isolates the viewport->screen conversion),
    // part 2 clicks coordinates the Javascript OCR found, part 3 clicks
    // coordinates image search found on the shipped range_*_dpi_96 images -
    // parts 2+3 are the ways real macros obtain x,y, and they catch capture-
    // scaling bugs part 1 cannot see. 3 targets per part, placed diagonally
    // so the slope fit still separates offset from scaling errors.
    // Live-tested on Windows + Firefox.
    fileName: 'DesktopClickAccuracyRange.js',
    path: 'XModules_Desktop/DesktopClickAccuracyRange.js',
    title: 'DesktopClickAccuracyRange (JS)',
    code: `// Desktop Click Accuracy Range - the extension shoots at itself.
// For systems where desktop clicks (XClick / uiv.desktop.*) seem to miss.
// PART 1: real OS clicks at five bullseyes with KNOWN viewport coordinates -
// this isolates the viewport->screen conversion. The verdict names the
// failure pattern: constant offset -> window chrome/border math wrong; error
// that GROWS with distance -> display-scaling (DPI) mismatch; shots that
// never reach the page -> wrong window / second monitor.
// PART 2: desktop-scope OCR (the XModule Local OCR, {engine: 'xmodule'} — the
// reader desktop macros really use; Linux falls back to 'javascript') has to FIND three words
// (black text on white) and the OS clicks are aimed at what OCR returned.
// PART 3: image search has to find three words from images that SHIP with
// the extension (range_*_dpi_96.png) and click them. Parts 2+3 are how real
// macros get their x,y, so a click outside a word's true box means the OCR
// or vision coordinate path is off even when part 1 passes.
//
// Parts 2+3 search in DESKTOP scope ({scope: 'desktop'}) — a screenshot of the
// whole screen taken by the XModule, which is the capture desktop automation
// actually runs on. Searching the browser's own page capture instead would
// test a pipeline no desktop macro uses, and would silently pass on a machine
// where every desktop macro misses: display scaling other than 100% changes
// the desktop capture and leaves the page capture untouched. Their matches
// therefore arrive in SCREEN pixels, and the range's ground truth is in
// VIEWPORT pixels — the origin that bridges the two is MEASURED from a landed
// shot (see learnOrigin), never computed, so it cannot inherit the very DPI
// bug this demo exists to find.
// Needs the XModule.

let TOL = 5; // px - a shot farther than this from its aim point fails the run
// (raised to ~5*dpr once the page reports its dpr: at 125% scaling every layer
// quantizes to the 1.25 grid - sampled origin, aim rounding, the OS cursor on
// physical pixels, the hit's back-conversion - and worst-case stacking is
// 5-7px. That is noise, not a coordinate bug: the real bugs this demo exists
// for measured 55-348px constant or slope 0.2.)

uiv.window.focus(); // OS input goes to whatever window is in front
uiv.open('https://ui.vision/');
// pin the layout - the conversion under test uses this window
uiv.window.resize(1000, 640);

// Build the range in the page: overlay, grid, 5 bullseyes, calibration pad,
// a mousedown recorder and two painters the macro calls later. Only SVG
// attributes and CSSOM styling, so no page CSP can interfere.
const info = uiv.eval(\`
var d = document, W = window.innerWidth, H = window.innerHeight;
var old = d.getElementById('uivxr'); if (old) old.remove();
var ov = d.createElement('div');
ov.id = 'uivxr';
ov.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:2147483647;background:#0b1220;cursor:crosshair;';
var NS = 'http://www.w3.org/2000/svg';
var svg = d.createElementNS(NS, 'svg');
svg.setAttribute('width', W); svg.setAttribute('height', H);
ov.appendChild(svg); d.body.appendChild(ov);
function el(n, a, parent, text) {
  var e = d.createElementNS(NS, n);
  for (var k in a) e.setAttribute(k, a[k]);
  (parent || svg).appendChild(e);
  if (text) e.textContent = text;
  return e;
}
for (var gx = 50; gx < W; gx += 50) el('line', {x1:gx, y1:0, x2:gx, y2:H, stroke:'#141f36'});
for (var gy = 50; gy < H; gy += 50) el('line', {x1:0, y1:gy, x2:W, y2:gy, stroke:'#141f36'});
var F = 'Segoe UI,Helvetica,sans-serif';
el('text', {x:W/2, y:34, fill:'#e2e8f0', 'font-size':22, 'font-weight':'bold', 'font-family':F, 'text-anchor':'middle'}, svg, 'Ui.Vision desktop.Click Accuracy Range');
el('text', {x:W/2, y:54, fill:'#64748b', 'font-size':12, 'font-family':F, 'text-anchor':'middle'}, svg, 'real OS clicks vs. their aim points - every hit is measured');
// left to right, so 'target 1/2/3' labels read in screen order; the diagonal
// spread (different x AND y per target) is what lets the slope fit separate a
// constant offset from a scaling error, so keep that when moving them
var pos = [[0.14,0.22],[0.5,0.52],[0.86,0.8]];
var rings = [[44,'#f8fafc'],[35,'#dc2626'],[26,'#f8fafc'],[17,'#dc2626'],[8,'#f8fafc'],[3,'#dc2626']];
window.__uivxrTargets = [];
for (var i = 0; i < pos.length; i++) {
  var cx = Math.round(pos[i][0] * W), cy = Math.round(pos[i][1] * H);
  for (var r = 0; r < rings.length; r++) el('circle', {cx:cx, cy:cy, r:rings[r][0], fill:rings[r][1]});
  el('text', {x:cx, y:cy+62, fill:'#94a3b8', 'font-size':11, 'font-family':F, 'text-anchor':'middle'}, svg, 'target ' + (i+1));
  window.__uivxrTargets.push({x:cx, y:cy});
}
var pad = {x:Math.round(W/2), y:H-42};
el('rect', {x:pad.x-70, y:pad.y-20, width:140, height:40, rx:8, fill:'#1e293b', stroke:'#334155'});
el('text', {x:pad.x, y:pad.y-1, fill:'#7dd3fc', 'font-size':12, 'font-family':F, 'text-anchor':'middle'}, svg, 'calibration pad');
el('text', {x:pad.x, y:pad.y+13, fill:'#475569', 'font-size':10, 'font-family':F, 'text-anchor':'middle'}, svg, 'sighting shots land here');
window.__uivxrPad = pad;
window.__uivxrHits = [];
ov.addEventListener('mousedown', function (e) {
  window.__uivxrHits.push({x:e.clientX, y:e.clientY, sx:e.screenX, sy:e.screenY, trusted:!!e.isTrusted});
}, true);
window.__uivxrMark = function (hx, hy, color, label) {
  el('line', {x1:hx-14, y1:hy, x2:hx+14, y2:hy, stroke:color, 'stroke-width':1.5});
  el('line', {x1:hx, y1:hy-14, x2:hx, y2:hy+14, stroke:color, 'stroke-width':1.5});
  el('circle', {cx:hx, cy:hy, r:5, fill:'none', stroke:color, 'stroke-width':1.5});
  var p = el('circle', {cx:hx, cy:hy, r:5, fill:'none', stroke:color, 'stroke-width':2});
  try {
    var a1 = el('animate', {attributeName:'r', from:5, to:24, dur:'0.8s', begin:'indefinite'}, p);
    var a2 = el('animate', {attributeName:'opacity', from:0.9, to:0, dur:'0.8s', begin:'indefinite', fill:'freeze'}, p);
    a1.beginElement(); a2.beginElement();
  } catch (err) { p.remove(); }
  el('text', {x:hx+11, y:hy-9, fill:color, 'font-size':11, 'font-family':'Consolas,monospace'}, svg, label);
};
window.__uivxrReport = function (text, color) {
  var box = d.createElement('pre');
  box.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483647;background:rgba(15,23,42,0.93);border:1.5px solid ' + color + ';border-radius:8px;color:#e2e8f0;font:11px/1.55 Consolas,monospace;padding:10px 14px;margin:0;';
  box.textContent = text;
  ov.appendChild(box);
};
return {w:W, h:H, dpr:window.devicePixelRatio,
  chromeX:window.outerWidth-W, chromeY:window.outerHeight-H,
  left:window.screenLeft, top:window.screenTop,
  moz:typeof window.mozInnerScreenX !== 'undefined',
  targets:window.__uivxrTargets, pad:window.__uivxrPad};
\`);

const browser = uiv.getVar('!BROWSER');
if (info.dpr && info.dpr > 1) TOL = Math.round(5 * info.dpr);
uiv.log('Range ' + info.w + 'x' + info.h + ' | ' + browser + ' on ' + uiv.getVar('!OS') + ' | dpr=' + info.dpr + ' | window chrome=' + info.chromeX + 'x' + info.chromeY + 'px | window at ' + info.left + ',' + info.top + ' | tolerance ' + TOL + 'px' + (info.moz ? ' | mozInnerScreen: yes' : ''));

const hits = () => uiv.eval('return window.__uivxrHits');

// SCREEN -> VIEWPORT origin, learned from any shot that lands: the recorder
// stores both spaces for every hit (clientX/Y and screenX/Y). Parts 2+3 search
// in DESKTOP scope, so their matches come back in SCREEN pixels while the
// range's ground truth is in VIEWPORT pixels — this is the bridge between them.
// Learned rather than computed from window.screenLeft/screenTop on purpose:
// a measured origin cannot inherit the same DPI bug the demo is testing for.
let originX = null, originY = null;
function learnOrigin(h) {
  if (h && typeof h.sx === 'number' && typeof h.sy === 'number') {
    originX = h.sx - h.x; originY = h.sy - h.y;
  }
}
// screen point -> viewport point; null while the origin is still unknown
function toViewport(p) {
  if (originX === null) return null;
  return { x: p.x - originX, y: p.y - originY };
}

// fire one OS click at viewport point (px,py), wait for the page to record it
const x = uiv.desktop;
function shoot(a, b) {
  const before = hits().length;
  if (typeof a === 'object') { x.click(a); } else { x.click(a, b, {scope: 'browser'}); }
  for (let i = 0; i < 12; i++) {
    const h = hits();
    if (h.length > before) {
      const hit = h[h.length - 1];
      learnOrigin(hit);
      return hit;
    }
    uiv.sleep(250);
  }
  return null;
}

// Recorder self-test (Chrome/Edge): a CDP click must register on the pad.
// Proves the measuring rig itself before the OS clicks that are under test.
if (browser !== 'firefox') {
  const before = hits().length;
  uiv.browser.click(info.pad.x, info.pad.y);
  uiv.sleep(500);
  const h = hits();
  if (h.length === before) throw new Error('recorder self-test failed: a CDP click was not recorded - the range page is broken, XClick accuracy was never tested');
  uiv.log('Recorder self-test OK - CDP click recorded at ' + h[h.length-1].x + ',' + h[h.length-1].y, 'blue');

  // The CDP click above attaches chrome.debugger, which makes Chrome show its
  // "is debugging" notice - and that notice TAKES WINDOW SPACE. The engine
  // detaches DETACH_AFTER_IDLE_MS (3s) after the last CDP event, the notice
  // goes away, and the viewport slides back down by its height.
  //
  // Waiting for the geometry to be STABLE is not enough: the notice is
  // perfectly stable while it is UP. That mistake cost a run - the settle loop
  // exited with the bar showing, the detach fired a moment later, and the very
  // next OS click landed 8px off while every click after it (re-sampled from
  // its own cursor movement) was fine. Flaky by nature: when the sighting shot
  // happens to burn more than 3s, the detach lands before the scored shots and
  // the same code passes.
  //
  // So wait for the notice to be GONE: chrome height back to its pre-CDP
  // baseline, then steady. baseline was measured before any CDP call.
  const chromeGap = () => uiv.eval('return window.outerHeight - window.innerHeight');
  const baseGap = info.chromeY;
  let stableN = 0;
  for (let i = 0; i < 60 && stableN < 4; i++) {
    stableN = (chromeGap() <= baseGap) ? stableN + 1 : 0;
    uiv.sleep(250);
  }
  if (stableN < 4) {
    uiv.log('the debugger notice never went away (chrome gap still ' + chromeGap() + 'px vs ' + baseGap + 'px at start) - measuring anyway, part 1 may show one shot off by the notice height', 'orange');
  }
}

// Sighting shot: the first REAL OS click, aimed at the calibration pad. On
// systems where the browser is not in the foreground, this click also is
// what brings it there - so it gets one free retry.
uiv.log('Sighting shot...');
let sight = shoot(info.pad.x, info.pad.y);
if (!sight) {
  // Retry aims at the PAGE CENTER, not the pad: the pad sits near the bottom
  // edge, so a transient origin error (Chrome's debugger notice hiding between
  // calibration and click shifts everything ~56px) pushes a pad shot clean off
  // the page — where it cannot land, so nothing re-teaches the origin and the
  // same miss repeats. A center shot survives that error margin, lands, and
  // its own cursor movement recalibrates everything after it.
  uiv.log('Sighting shot never reached the page - one retry at the page CENTER (the first click may have gone to fronting the window, or a transient origin shift pushed it off the bottom edge)', 'orange');
  sight = shoot(Math.round(info.w / 2), Math.round(info.h / 2));
}
if (!sight) {
  throw new Error('No OS click ever reached the page. On this system XClick lands somewhere else entirely - typical causes: browser window on a SECOND monitor (XModule input covers the primary display only), another window covering the browser (move chat/editor windows away from the browser), or a remote/virtual display. Fix the window layout and run again.');
}

// The five scored shots
const shots = [];
for (let i = 0; i < info.targets.length; i++) {
  const t = info.targets[i];
  const h = shoot(t.x, t.y);
  if (!h) {
    shots.push({n:i+1, aim:t, miss:true, dx:0, dy:0, dist:9999, ring:0});
    uiv.log('Target ' + (i+1) + ': shot never landed on the page', 'red');
    continue;
  }
  const dx = h.x - t.x, dy = h.y - t.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const ring = dist <= 3 ? 10 : dist <= 8 ? 9 : dist <= 17 ? 8 : dist <= 26 ? 7 : dist <= 44 ? 6 : 0;
  const color = dist <= TOL ? '#4ade80' : dist <= 15 ? '#fbbf24' : '#f87171';
  const label = (dist <= 3 ? 'BULLSEYE ' : '') + dist.toFixed(1) + 'px';
  uiv.eval('window.__uivxrMark(' + h.x + ',' + h.y + ',' + JSON.stringify(color) + ',' + JSON.stringify(label) + ')');
  shots.push({n:i+1, aim:t, hit:{x:h.x, y:h.y}, dx:dx, dy:dy, dist:dist, ring:ring, trusted:h.trusted});
  uiv.log('Target ' + (i+1) + ': aimed ' + t.x + ',' + t.y + ' hit ' + h.x + ',' + h.y + ' - off by ' + dist.toFixed(1) + 'px (ring ' + ring + ')', dist <= TOL ? 'green' : 'orange');
}

// ---- Analysis: what KIND of error is it? -------------------------------
const landed = shots.filter(s => !s.miss);
const missedCount = shots.length - landed.length;
const maxDist = landed.reduce((m, s) => Math.max(m, s.dist), 0);
const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const mdx = landed.length ? mean(landed.map(s => s.dx)) : 0;
const mdy = landed.length ? mean(landed.map(s => s.dy)) : 0;
// least-squares slope of error vs. aim coordinate: a nonzero slope means the
// error GROWS across the screen = scaling-factor mismatch, not a fixed offset
function slope(pts) {
  const n = pts.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  pts.forEach(p => { sx += p[0]; sy += p[1]; sxx += p[0]*p[0]; sxy += p[0]*p[1]; });
  const den = n*sxx - sx*sx;
  return den ? (n*sxy - sx*sy) / den : 0;
}
const kx = landed.length > 2 ? slope(landed.map(s => [s.aim.x, s.dx])) : 0;
const ky = landed.length > 2 ? slope(landed.map(s => [s.aim.y, s.dy])) : 0;

const score = shots.reduce((a, s) => a + s.ring, 0);
const rank = score === 30 ? 'PERFECT RUN' : score >= 27 ? 'sharpshooter' : score >= 21 ? 'marksman' : 'needs calibration';

let pass = false, verdict;
if (missedCount) {
  verdict = 'FAIL: ' + missedCount + ' of ' + shots.length + ' shots never reached the page - clicks land outside the viewport. Typical causes: window offset badly wrong, second monitor, another window in front.';
} else if (maxDist <= TOL) {
  pass = true;
  verdict = 'PASS: all ' + shots.length + ' shots within ' + TOL + 'px (max ' + maxDist.toFixed(1) + 'px, mean offset ' + mdx.toFixed(1) + ',' + mdy.toFixed(1) + 'px)';
} else if (Math.abs(kx) > 0.05 || Math.abs(ky) > 0.05) {
  // 0.05, not 0.01: one quantization-wobbled shot out of three makes a fake
  // slope of ~0.02 at 125% scaling; the real scaling bug measured 0.2.
  verdict = 'FAIL: the error GROWS with distance (slope x=' + kx.toFixed(3) + ' y=' + ky.toFixed(3) + ') - display-scaling factor mismatch: the pipeline is off by ~' + (1+kx).toFixed(3) + 'x (x) / ' + (1+ky).toFixed(3) + 'x (y). Typical cause: OS display scaling (125%/150%) or browser zoom not reflected in the screen/CSS conversion.';
} else {
  verdict = 'FAIL: constant offset of dx=' + mdx.toFixed(1) + 'px dy=' + mdy.toFixed(1) + 'px on every shot - the viewport-origin calculation (window position + chrome/border) is wrong on this system/theme. Window chrome measured: ' + info.chromeX + 'x' + info.chromeY + 'px.';
}

// part 1 scorecard lines (rendered together with part 2 at the end)
const padN = (v, n) => { let s = '' + v; while (s.length < n) s = ' ' + s; return s; };
const fmt = v => (v > 0 ? '+' : '') + v.toFixed(1);
const lines = ['DESKTOP CLICK ACCURACY REPORT', '', 'PART 1 - shots at known coordinates: ' + (pass ? 'PASS' : 'FAIL'), 'shot   aim          hit         dx      dy    dist  ring'];
shots.forEach(s => {
  lines.push('  ' + s.n + '   ' + padN(s.aim.x + ',' + s.aim.y, 9) + '   ' + (s.miss ? '--- never landed on the page ---' : padN(s.hit.x + ',' + s.hit.y, 9) + '  ' + padN(fmt(s.dx), 6) + '  ' + padN(fmt(s.dy), 6) + '  ' + padN(s.dist.toFixed(1), 5) + '   ' + padN(s.ring, 2)));
});
lines.push('score ' + score + '/30 - ' + rank);
lines.push(verdict);
uiv.log('Part 1: ' + score + '/30 - ' + rank, pass ? 'green' : 'orange');

// ---- PART 2: how real macros FIND the x,y ------------------------------
// Desktop-scope OCR ({engine: 'xmodule'}) locates three words on a white
// page and the OS clicks are aimed at what OCR returned. Ground truth is
// each word's real DOM box: a click outside it means the OCR coordinate
// path (capture scaling / box mapping) is off - a failure surface part 1's
// known-coordinate shots cannot see. The blue dashed boxes show where OCR
// believes each word is; red dashed = word OCR could not find at all.
// Which reader part 2 uses, stated in the scorecard rather than assumed.
// This part measures the COORDINATE path, not OCR quality — so it has to run
// the reader real desktop macros run, which is the XModule Local OCR: desktop
// scope picks it by itself, and it reads native UI far better. The Javascript
// engine is marginal on a full-screen capture (it missed a word here), and a
// word it never finds makes part 2 inconclusive for a reason that has nothing
// to do with coordinates.
// It ships for Windows/macOS only, so Linux falls back — and the scorecard
// names whichever reader actually ran, because a MISS means a different thing
// for each one.
const OS_NAME = uiv.getVar('!OS');
let OCR_ENGINE = OS_NAME === 'linux' ? 'javascript' : 'xmodule';

// {required: false} already turns "no match" into an empty array, so a THROW
// here is the reader being unavailable (XModule installed for clicking, but
// its OCR component missing) — fall back and say so, rather than reporting a
// coordinate FAIL for a reader that never ran.
// Search INSIDE the browser window only — the area is the window's screen
// rect, built from the origin part 1 just MEASURED. A whole-screen search can
// match the words in any other window that happens to show them (seen live:
// a chat window displaying this demo's own report card gave OCR an 'ALPHA'
// at screen x=168 while the browser started at x=697 — the click landed in
// the chat). Real desktop macros anchor or restrict the same way.
const WIN_AREA = () => ({ x: originX, y: originY, width: info.w, height: info.h });

const ocrFind = (w) => {
  try {
    return uiv.ocr.findTexts(w, { scope: 'desktop', engine: OCR_ENGINE, area: WIN_AREA(), required: false, timeout: 10 });
  } catch (e) {
    if (OCR_ENGINE === 'javascript') throw e;
    uiv.log('XModule Local OCR unavailable (' + e.message + ') — part 2 falls back to the Javascript OCR', 'orange');
    OCR_ENGINE = 'javascript';
    return uiv.ocr.findTexts(w, { scope: 'desktop', engine: OCR_ENGINE, area: WIN_AREA(), required: false, timeout: 10 });
  }
};

const WORDS = ['ALPHA', 'NEXUS', 'CEDAR'];
let truth = null;
let p2note = '';
const part2 = [];
try {
  truth = uiv.eval(\`
var d = document, W = window.innerWidth, H = window.innerHeight;
var ov = d.getElementById('uivxr');
while (ov.firstChild) ov.removeChild(ov.firstChild);
ov.style.background = '#ffffff';
var NS = 'http://www.w3.org/2000/svg';
var svg = d.createElementNS(NS, 'svg');
svg.setAttribute('width', W); svg.setAttribute('height', H);
ov.appendChild(svg);
function el(n, a, parent, text) {
  var e = d.createElementNS(NS, n);
  for (var k in a) e.setAttribute(k, a[k]);
  (parent || svg).appendChild(e);
  if (text) e.textContent = text;
  return e;
}
el('text', {x:W/2, y:34, fill:'#94a3b8', 'font-size':15, 'font-family':'Segoe UI,sans-serif', 'text-anchor':'middle'}, svg, 'part 2: desktop-scope OCR must find these words - then the OS clicks them');
var words = ['ALPHA','NEXUS','CEDAR'];
// diagonal spread; center word sits high (0.3H) so the final report card
// (bottom center) does not cover it
var pos = [[0.5,0.3],[0.15,0.2],[0.85,0.8]];
window.__uivxrWords = {};
for (var i = 0; i < words.length; i++) {
  var cx = Math.round(pos[i][0] * W), cy = Math.round(pos[i][1] * H);
  var e = el('text', {x:cx, y:cy, fill:'#111111', 'font-size':26, 'font-family':'Arial,Helvetica,sans-serif', 'font-weight':'600', 'letter-spacing':'1', 'text-anchor':'middle'}, svg, words[i]);
  var r = e.getBoundingClientRect();
  window.__uivxrWords[words[i]] = {x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height)};
}
window.__uivxrHits = [];
window.__uivxrBox = function (l, t, wd, ht, color) {
  el('rect', {x:l, y:t, width:wd, height:ht, fill:'none', stroke:color, 'stroke-width':1.5, 'stroke-dasharray':'4 3'});
};
window.__uivxrMark = function (hx, hy, color, label) {
  el('line', {x1:hx-14, y1:hy, x2:hx+14, y2:hy, stroke:color, 'stroke-width':1.5});
  el('line', {x1:hx, y1:hy-14, x2:hx, y2:hy+14, stroke:color, 'stroke-width':1.5});
  el('circle', {cx:hx, cy:hy, r:5, fill:'none', stroke:color, 'stroke-width':1.5});
  el('text', {x:hx+11, y:hy-9, fill:color, 'font-size':11, 'font-family':'Consolas,monospace'}, svg, label);
};
window.__uivxrReport = function (text, color) {
  var box = d.createElement('pre');
  box.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483647;background:rgba(15,23,42,0.93);border:1.5px solid ' + color + ';border-radius:8px;color:#e2e8f0;font:11px/1.55 Consolas,monospace;padding:10px 14px;margin:0;';
  box.textContent = text;
  ov.appendChild(box);
};
return window.__uivxrWords;
\`);
} catch (e) {
  p2note = 'PART 2 skipped: ' + e.message;
  uiv.log(p2note, 'orange');
}

if (truth) {
  uiv.log("Part 2: OCR ({engine: '" + OCR_ENGINE + "'}) finds the words on the DESKTOP capture, then the OS clicks them... [" + OS_NAME + ']');
  for (let i = 0; i < WORDS.length; i++) {
    const w = WORDS[i];
    const t = truth[w];
    const found = ocrFind(w);
    if (!found.length) {
      part2.push({ w: w, found: false });
      uiv.eval('window.__uivxrBox(' + t.left + ',' + t.top + ',' + t.width + ',' + t.height + ',' + JSON.stringify('#dc2626') + ')');
      uiv.log("Word " + w + ": NOT found by OCR {engine: '" + OCR_ENGINE + "'} on the desktop capture", 'red');
      continue;
    }
    const m = found[0];
    // The match is in SCREEN px (desktop scope) — everything drawn on and
    // compared against the page is in VIEWPORT px, so convert first. Without a
    // known origin the box would be drawn far off-screen and the offset would
    // be a meaningless number, so both are skipped rather than faked.
    const mv = toViewport(m);
    if (mv) {
      uiv.eval('window.__uivxrBox(' + (m.rect.left - originX) + ',' + (m.rect.top - originY) + ',' + m.rect.width + ',' + m.rect.height + ',' + JSON.stringify('#2563eb') + ')');
    }
    const ocrOff = mv ? Math.sqrt(Math.pow(mv.x - t.x, 2) + Math.pow(mv.y - t.y, 2)) : null;
    const h = shoot(m);
    if (!h) {
      part2.push({ w: w, found: true, landed: false, ocrOff: ocrOff });
      uiv.log('Word ' + w + ': OCR found it, but the click never landed on the page', 'red');
      continue;
    }
    const inBox = h.x >= t.left - 2 && h.x <= t.left + t.width + 2 && h.y >= t.top - 2 && h.y <= t.top + t.height + 2;
    uiv.eval('window.__uivxrMark(' + h.x + ',' + h.y + ',' + JSON.stringify(inBox ? '#16a34a' : '#dc2626') + ',' + JSON.stringify(w + (inBox ? ' HIT' : ' MISS')) + ')');
    part2.push({ w: w, found: true, landed: true, inBox: inBox, ocrOff: ocrOff, dx: h.x - t.x, dy: h.y - t.y });
    uiv.log('Word ' + w + ': OCR box center off by ' + (ocrOff === null ? '(origin unknown)' : ocrOff.toFixed(1) + 'px') + ' from the word center, click landed ' + (inBox ? 'INSIDE' : 'OUTSIDE') + ' the word box', inBox ? 'green' : 'red');
  }
}

const p2found = part2.filter(p => p.found);
const p2in = part2.filter(p => p.inBox);
const p2pass = !!truth && p2found.length >= 2 && p2found.every(p => p.landed && p.inBox);
let p2verdict;
if (!truth) {
  p2verdict = p2note;
} else if (p2pass) {
  p2verdict = 'PASS: OCR found ' + p2found.length + '/' + WORDS.length + ' words and every click landed inside its word';
} else if (!p2found.length) {
  p2verdict = "FAIL: OCR {engine: '" + OCR_ENGINE + "'} found none of the " + WORDS.length + ' words - an OCR problem (engine or rendering), NOT a coordinate one; OCR-aimed clicking untested';
} else if (p2found.length < 2) {
  p2verdict = 'INCONCLUSIVE: OCR found only ' + p2found.length + '/' + WORDS.length + ' words - too few to judge OCR-aimed clicking';
} else {
  p2verdict = 'FAIL: ' + (p2found.length - p2in.length) + ' of ' + p2found.length + ' found words were clicked OUTSIDE their box - the OCR coordinate path (capture scaling / box mapping) is off, even though part 1 ' + (pass ? 'passed' : 'also failed');
}

lines.push('');
lines.push("PART 2 - x,y found by OCR {engine: '" + OCR_ENGINE + "'}, desktop scope, on " + OS_NAME + ': ' + (truth ? (p2pass ? 'PASS' : 'FAIL') : 'SKIPPED'));
if (truth) {
  lines.push('word     ocr-off  click-dx  click-dy  in-box');
  part2.forEach(p => {
    lines.push(' ' + padN(p.w, 6) + '  ' + (!p.found ? '--- not found by OCR ---' : (!p.landed ? '--- click never landed ---' : padN(p.ocrOff === null ? 'n/a' : p.ocrOff.toFixed(1), 7) + '  ' + padN(fmt(p.dx), 8) + '  ' + padN(fmt(p.dy), 8) + '  ' + padN(p.inBox ? 'YES' : 'NO', 6))));
  });
}
lines.push(p2verdict);

// ---- PART 3: x,y from IMAGE SEARCH -------------------------------------
// Same idea, but the finder is uiv.findImage on word images that SHIP with
// the extension (preinstall/vision/range_*_dpi_96.png, captured at dpr 1).
// minScore 0.75: similar bold words cross-match around 0.65-0.71, so the
// threshold must reject those yet tolerate cross-system font rendering.
// A click outside the word's true box = the vision coordinate path
// (capture scaling / match mapping) is off.
const IMAGES = [
  { word: 'ROBOT', image: 'range_robot_dpi_96.png' },
  { word: 'LASER', image: 'range_laser_dpi_96.png' },
  { word: 'TIGER', image: 'range_tiger_dpi_96.png' }
];
let truth3 = null;
let p3note = '';
const part3 = [];
try {
  truth3 = uiv.eval(\`
var d = document, W = window.innerWidth, H = window.innerHeight;
var ov = d.getElementById('uivxr');
while (ov.firstChild) ov.removeChild(ov.firstChild);
ov.style.background = '#ffffff';
var NS = 'http://www.w3.org/2000/svg';
var svg = d.createElementNS(NS, 'svg');
svg.setAttribute('width', W); svg.setAttribute('height', H);
ov.appendChild(svg);
function el(n, a, parent, text) {
  var e = d.createElementNS(NS, n);
  for (var k in a) e.setAttribute(k, a[k]);
  (parent || svg).appendChild(e);
  if (text) e.textContent = text;
  return e;
}
el('text', {x:W/2, y:34, fill:'#94a3b8', 'font-size':15, 'font-family':'Segoe UI,sans-serif', 'text-anchor':'middle'}, svg, 'part 3: image search must find these words (shipped images) - then the OS clicks them');
var words = ['ROBOT','LASER','TIGER'];
var pos = [[0.15,0.22],[0.5,0.3],[0.85,0.75]];
window.__uivxrWords3 = {};
for (var i = 0; i < words.length; i++) {
  var cx = Math.round(pos[i][0] * W), cy = Math.round(pos[i][1] * H);
  var e = el('text', {x:cx, y:cy, fill:'#111111', 'font-size':26, 'font-family':'Arial,Helvetica,sans-serif', 'font-weight':'600', 'letter-spacing':'1', 'text-anchor':'middle'}, svg, words[i]);
  var r = e.getBoundingClientRect();
  window.__uivxrWords3[words[i]] = {x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height)};
}
window.__uivxrHits = [];
window.__uivxrBox = function (l, t, wd, ht, color) {
  el('rect', {x:l, y:t, width:wd, height:ht, fill:'none', stroke:color, 'stroke-width':1.5, 'stroke-dasharray':'4 3'});
};
window.__uivxrMark = function (hx, hy, color, label) {
  el('line', {x1:hx-14, y1:hy, x2:hx+14, y2:hy, stroke:color, 'stroke-width':1.5});
  el('line', {x1:hx, y1:hy-14, x2:hx, y2:hy+14, stroke:color, 'stroke-width':1.5});
  el('circle', {cx:hx, cy:hy, r:5, fill:'none', stroke:color, 'stroke-width':1.5});
  el('text', {x:hx+11, y:hy-9, fill:color, 'font-size':11, 'font-family':'Consolas,monospace'}, svg, label);
};
window.__uivxrReport = function (text, color) {
  var box = d.createElement('pre');
  box.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483647;background:rgba(15,23,42,0.93);border:1.5px solid ' + color + ';border-radius:8px;color:#e2e8f0;font:10.5px/1.5 Consolas,monospace;padding:9px 13px;margin:0;';
  box.textContent = text;
  ov.appendChild(box);
};
return window.__uivxrWords3;
\`);
} catch (e) {
  p3note = 'PART 3 skipped: ' + e.message;
  uiv.log(p3note, 'orange');
}

if (truth3) {
  uiv.log('Part 3: image search finds the words (shipped images) on the DESKTOP capture, then the OS clicks them...');
  for (let i = 0; i < IMAGES.length; i++) {
    const it = IMAGES[i];
    const t = truth3[it.word];
    let found = [];
    try {
      found = uiv.findImages(it.image, { scope: 'desktop', minScore: 0.75, area: WIN_AREA(), required: false, timeout: 10 });
    } catch (e) {
      // e.g. the image is missing in this install (preinstall not re-offered)
      p3note = e.message;
      uiv.log('Image ' + it.image + ': ' + e.message, 'red');
    }
    if (!found.length) {
      part3.push({ w: it.word, found: false });
      uiv.eval('window.__uivxrBox(' + t.left + ',' + t.top + ',' + t.width + ',' + t.height + ',' + JSON.stringify('#dc2626') + ')');
      uiv.log('Image ' + it.word + ': no match with score >= 0.75 on the desktop capture', 'red');
      continue;
    }
    const m = found[0];
    // SCREEN px -> VIEWPORT px, same as part 2
    const mv = toViewport(m);
    if (mv) {
      uiv.eval('window.__uivxrBox(' + (m.rect.left - originX) + ',' + (m.rect.top - originY) + ',' + m.rect.width + ',' + m.rect.height + ',' + JSON.stringify('#2563eb') + ')');
    }
    const imgOff = mv ? Math.sqrt(Math.pow(mv.x - t.x, 2) + Math.pow(mv.y - t.y, 2)) : null;
    const h = shoot(m);
    if (!h) {
      part3.push({ w: it.word, found: true, landed: false, imgOff: imgOff, score: m.score });
      uiv.log('Image ' + it.word + ': found (score ' + (m.score || 0).toFixed(2) + '), but the click never landed on the page', 'red');
      continue;
    }
    const inBox = h.x >= t.left - 2 && h.x <= t.left + t.width + 2 && h.y >= t.top - 2 && h.y <= t.top + t.height + 2;
    uiv.eval('window.__uivxrMark(' + h.x + ',' + h.y + ',' + JSON.stringify(inBox ? '#16a34a' : '#dc2626') + ',' + JSON.stringify(it.word + (inBox ? ' HIT' : ' MISS')) + ')');
    part3.push({ w: it.word, found: true, landed: true, inBox: inBox, imgOff: imgOff, score: m.score, dx: h.x - t.x, dy: h.y - t.y });
    uiv.log('Image ' + it.word + ': match score ' + (m.score || 0).toFixed(2) + ', center off by ' + (imgOff === null ? '(origin unknown)' : imgOff.toFixed(1) + 'px') + ', click landed ' + (inBox ? 'INSIDE' : 'OUTSIDE') + ' the word box', inBox ? 'green' : 'red');
  }
}

const p3found = part3.filter(p => p.found);
const p3in = part3.filter(p => p.inBox);
const p3pass = !!truth3 && p3found.length >= 2 && p3found.every(p => p.landed && p.inBox);
let p3verdict;
if (!truth3) {
  p3verdict = p3note;
} else if (p3pass) {
  p3verdict = 'PASS: image search found ' + p3found.length + '/' + IMAGES.length + ' shipped word images and every click landed inside its word';
} else if (!p3found.length) {
  p3verdict = 'FAIL: image search matched none of the ' + IMAGES.length + ' shipped images' + (p3note ? ' (' + p3note + ')' : '') + ' - a vision problem (images missing, or rendering/scaling too different from the shipped dpr-1 captures); image-aimed clicking untested';
} else if (p3found.length < 2) {
  p3verdict = 'INCONCLUSIVE: image search matched only ' + p3found.length + '/' + IMAGES.length + ' images - too few to judge image-aimed clicking';
} else {
  p3verdict = 'FAIL: ' + (p3found.length - p3in.length) + ' of ' + p3found.length + ' matched images were clicked OUTSIDE their word box - the vision coordinate path (capture scaling / match mapping) is off';
}

lines.push('');
lines.push('PART 3 - x,y found by image search (shipped images), desktop scope, on ' + OS_NAME + ': ' + (truth3 ? (p3pass ? 'PASS' : 'FAIL') : 'SKIPPED'));
if (truth3) {
  lines.push('word     score  img-off  click-dx  click-dy  in-box');
  part3.forEach(p => {
    lines.push(' ' + padN(p.w, 6) + '  ' + (!p.found ? '--- no match with score >= 0.75 ---' : (!p.landed ? '--- click never landed ---' : padN((p.score || 0).toFixed(2), 5) + '  ' + padN(p.imgOff === null ? 'n/a' : p.imgOff.toFixed(1), 7) + '  ' + padN(fmt(p.dx), 8) + '  ' + padN(fmt(p.dy), 8) + '  ' + padN(p.inBox ? 'YES' : 'NO', 6))));
  });
}
lines.push(p3verdict);
lines.push('');
lines.push('env: ' + browser + ' ' + uiv.getVar('!OS') + ' dpr=' + info.dpr + ' viewport=' + info.w + 'x' + info.h + ' chrome=' + info.chromeX + 'x' + info.chromeY + ' win@' + info.left + ',' + info.top);

const overall = pass && p2pass && p3pass;
const vcolor = overall ? '#4ade80' : '#f87171';
uiv.eval('window.__uivxrReport(' + JSON.stringify(lines.join('\\n')) + ',' + JSON.stringify(vcolor) + ')');

uiv.log('Part 1: ' + score + '/30 (' + rank + ') | Part 2 OCR: ' + (truth ? p2in.length + '/' + WORDS.length + ' hit' : 'skipped') + ' | Part 3 image: ' + (truth3 ? p3in.length + '/' + IMAGES.length + ' hit' : 'skipped'), overall ? 'green' : 'orange');
if (!overall) throw new Error('Part 1: ' + verdict + ' | Part 2: ' + p2verdict + ' | Part 3: ' + p3verdict);
uiv.log('PASS: known-coordinate, OCR-aimed and image-aimed OS clicks all land where they should', 'green');
`
  },
  {
    fileName: 'CU_PlayTicTacToe.js',
    path: 'LLM AI Commands/CU_PlayTicTacToe.js',
    title: 'CU_PlayTicTacToe (JS)',
    code: `// Port of Classic/LLM AI Commands/CU_PlayTicTacToe.
// The computer-use agent plays a game and reports the outcome. The classic
// if/elseif chain over its reply becomes a lookup, so adding an outcome is one
// line instead of another branch.
uiv.run('XDesktopAutomation', 'false');
uiv.open('https://ui.vision/demo/tictactoe');
uiv.window.focus();

const TASK = [
  'You are playing a game of tic tac toe against the computer. You are X and move first.',
  'If a difficulty choice is shown, select "easy" before playing.',
  'Your goal is to win. Play until the game is over.',
  'Finish your reply with exactly one of GAMEWIN, GAMELOST, GAMEDRAW or ERROR.'
].join(' ');

const result = String(uiv.ai.computerUse(TASK));
uiv.log(\`Computer Use Result = \${result}\`, 'blue');

const OUTCOMES = [
  { keyword: 'GAMEWIN', message: 'We won !!! :)', color: '#shownotification' },
  { keyword: 'GAMELOST', message: 'We lost', color: 'cyan' },
  { keyword: 'GAMEDRAW', message: 'A draw', color: 'blue' }
];

const outcome = OUTCOMES.find(o => result.includes(o.keyword));

if (outcome) {
  uiv.log(outcome.message, outcome.color);
} else if (result.includes('ERROR')) {
  throw new Error(\`the computer-use agent reported an error: \${result}\`);
} else {
  throw new Error(\`no game outcome in the agent's reply: \${result}\`);
}
`
  },
  {
    fileName: 'CU_UseWebCalculator.js',
    path: 'LLM AI Commands/CU_UseWebCalculator.js',
    title: 'CU_UseWebCalculator (JS)',
    code: `// Port of Classic/LLM AI Commands/CU_UseWebCalculator.
// The computer-use agent clicking through a web calculator.
uiv.log('This demo macro uses an external website which is not affiliated with Ui.Vision.', 'blue');

uiv.run('XDesktopAutomation', 'false');
uiv.open('https://www.theonlinecalculator.com/');
uiv.window.focus();

const TASK = [
  'Use the calculator to compute 8 + 9 by clicking the buttons.',
  'Verify the display shows 17.',
  'Finish your reply with SUCCESS or ERROR.'
].join(' ');

const result = String(uiv.ai.computerUse(TASK));
uiv.log(\`Computer Use Result = \${result}\`, 'blue');

if (result.includes('SUCCESS')) {
  uiv.log('All worked fine', 'green');
} else if (result.includes('ERROR')) {
  throw new Error(\`the computer-use agent reported an error: \${result}\`);
} else {
  throw new Error(\`no SUCCESS/ERROR verdict in the agent's reply: \${result}\`);
}
`
  },
  {
    fileName: 'PDF Automation.js',
    // Browser Vision folder, and this time it is accurate: nothing here needs
    // the XModule. It sat in "XModules" from 2026-08 because it drove the
    // desktop tier — an XClick for focus and XType to page through the
    // document. Both are gone (the page is reached by URL and the link is
    // clicked through CDP), so the demo now runs on image search, the local
    // OCR and a browser-tier click. Note the LOCAL OCR engine is an XModule
    // feature: an install without it falls back to {engine: 'javascript'},
    // which reads this PDF's small print less well.
    path: 'Browser Vision (Chrome, Edge)/PDF Automation.js',
    title: 'PDF Automation (JS)',
    code: `// PDF Automation — port of Classic/XModules/DemoPDFTest_with_OCR.
// A PDF in the browser's viewer has NO DOM at all — no elements, no text
// nodes, nothing for uiv.$ to find. Everything here goes through the eyes:
// image search and OCR locate the targets, and the clicks are aimed at what
// those finders measured.

// Not a debugger-API issue: Firefox renders PDFs in its built-in pdf.js
// viewer, a PRIVILEGED page extensions cannot attach a content script to —
// even the open command cannot connect to that tab (verified: Error #210).
// Wrong browser is an answered question, not a broken macro: end green.
if (uiv.getVar('!BROWSER') === 'firefox') {
  uiv.exit('This demo works in Chrome and Edge only — Firefox shows PDFs in its privileged built-in viewer, which browser extensions cannot reach at all.');
}

// OPEN FIRST, size after. Every command needs a browser tab to run in, and a
// browser showing only its new-tab page has none — uiv.open is the one call
// that creates one by itself. (The classic table macro sized the window first,
// where the player always had a start tab; here that order died with E901
// before the PDF was ever opened.)
// #page=1&zoom=100 — the viewer REMEMBERS the page and zoom it was left on,
// so a bare URL does not start at the top of the document on the second run of
// the day. Pin both, the same reason the window gets a fixed size.
uiv.open('http://download.ui.vision/demo/pdf-test.pdf#page=1&zoom=100');
uiv.window.resize(800, 700);
// (No uiv.window.focus() here. It is required before REAL OS input, because
// that goes to whichever window the OS has focused — and it FAILS when another
// application is in front, since a background app cannot raise itself. This
// demo sends no OS input any more, so demanding the foreground would only add
// a way to fail.)


// --- is the PDF loaded? two independent checks ------------------------------
// Option 1: image search. The finder throws if it is not there, which is
// exactly what the classic visualAssert did.
uiv.findImage('pdftest_salesquote.png', { minScore: 0.35 });

// Option 2: text search. ocr.findTexts COUNTS without throwing, so the failure
// message can say how many it saw.
//
// Every read below names its reader: {engine: 'xmodule'} is the XModule's
// Local OCR — it runs on this machine, so it needs no OCR.Space account, no
// API key and no network, and it reads this PDF's print-quality text well.
// A script NAMES its engine instead of setting !OCRENGINE/!OCRLANGUAGE/
// !OCRSCALE globally: line 12 must not silently change what a read on line 40
// returns. Swap in 'ocrspace_engine2' (needs a free key from
// https://ocr.space/ocrapi) or 'javascript' (built in, no install) here and
// the demo runs unchanged.
const matches = uiv.ocr.findTexts('sales quote', { required: false, engine: 'xmodule' });
uiv.log(\`Number of matches: \${matches.length}\`, 'green');
if (matches.length === 0) {
  throw new Error('Something is wrong, I cannot find the text <sales quote>');
}

// --- extract the quote number and check it ----------------------------------
// The classic macro used a RELATIVE image here (green anchor, pink read
// area) through the legacy XClickRelative/OCRExtractRelative bridge. In JS
// the same thing is COMPOSED, with no image file to maintain: the
// 'sales quote' heading match IS the anchor, and the read area is the line
// directly below it — every size in units the anchor itself provides, so
// the region scales with the rendering. uiv.ocr.read({area}) replaces
// OCRExtractRelative: finders locate text, read() reads a region.
const heading = matches[0];

// (The classic macro clicked into this line with XClick first, to give the
// viewer keyboard focus for the XType paging that followed. Both are gone —
// page 2 is reached by URL below — so the click went with them rather than
// being kept alive as decoration.)

// Read a BLOCK, not one tight line. A crop a few pixels tall is the one thing
// OCR reliably fails at, and this PDF's quote number is printed in light
// beige on white, which needs even more room around it: measured on this
// page, a 180x30 crop of exactly that line comes back EMPTY, a 344x138 one
// reads the line but drops the number, and a 344x196 one reads it every
// time. So take a generous region and pick the number out in JS afterwards —
// that costs nothing and never depends on a pixel-perfect crop.
const raw = String(uiv.ocr.read({
  engine: 'xmodule',
  area: {
    x: heading.rect.left - Math.round(0.12 * heading.rect.width),
    y: heading.rect.top,
    width: Math.round(2.1 * heading.rect.width),
    height: Math.round(8.5 * heading.rect.height)
  }
}));
uiv.log(\`Text read around the heading: >\${raw.replace(/\\n/g, ' | ')}<\`, 'blue');

// the classic macro needs two executeScript commands to strip whitespace and
// test for the substring
const quote = raw.replace(/\\s+/g, '');
uiv.log(\`Without spaces and line breaks: >\${quote}<\`, 'green');

if (!quote.includes('135')) {
  throw new Error(\`Wrong quote number. Text read was >\${raw}<\`);
}
uiv.log('Quote number OK', 'green');

// --- go to page 2 and follow a link -----------------------------------------
// Page 2 by URL, not by counting key presses. Chrome's PDF viewer takes
// #page=N, and that is the same place on every run — while PAGE_DOWN is not:
// the viewer REMEMBERS its zoom from the last visit, so the number of presses
// that reaches page 2 changes underneath the macro, and the keys are dropped
// in silence unless the document itself holds the keyboard focus.
//
// The zoom and the window size here are both load-bearing. At 100% this page
// is WIDER than an 800px viewport, and the line the demo needs is cut off in
// the middle of the very phrase it is looking for ("...purchase at our we|"),
// which no reader can recover from. A 1000px viewport fits the whole line at
// 100%, and 100% keeps the text at its largest — page-fit shrinks it until the
// local OCR stops reading the words either side of the link.
uiv.open('http://download.ui.vision/demo/pdf-test.pdf#page=2&zoom=100');
uiv.window.resize(1000, 800);

// Verify it rather than assume it — a finder call IS the assertion. The
// trailing wildcard in 'CONDITIONS*' absorbs the colon OCR reads as part of
// the word ("CONDITIONS:"); word matching is exact otherwise, so the bare
// word would never match.
uiv.ocr.findText('TERMS AND CONDITIONS*', { engine: 'xmodule' });

// WAIT FOR THE VIEWPORT TO STOP MOVING before measuring anything here. A
// trusted click needs Chrome's debugger, and Chrome announces that with a
// notice bar that shrinks the viewport by its own height — which makes the PDF
// viewer RE-FLOW the page, so coordinates measured under one height point at
// nothing under the other. The bar rises on the first such click and clears
// itself seconds after the last one, so it moves the page underneath a macro
// that never asked it to.
//
// This is a settle loop, not a pause: it watches a real value and needs it to
// hold STILL for several readings, not merely to be unchanged once — a single
// repeat is satisfied by the notice sitting there mid-life, which is how the
// first version of this loop let the layout change again a second later.
let lastHeight = -1;
let steady = 0;
for (let i = 0; i < 25 && steady < 4; i++) {
  const h = uiv.eval('return window.innerHeight');
  steady = h === lastHeight ? steady + 1 : 0;
  lastHeight = h;
  uiv.sleep(400);
}

// A RELATIVE CLICK — the composed form of the classic word#R x,y target.
//
// "our website" is a small, light blue, underlined phrase, and no local OCR
// reads it: not at any zoom, not at any region size. But OCR reads the words
// on either SIDE of it perfectly — "purchase at" before, "apply" after — and
// two anchors are better than one, because the gap between them IS the link.
// Its midpoint needs no constant to be guessed and no image file to be kept in
// step with the rendering: at 100% that gap is 84px wide, so the click has
// ±42px of room, where aiming at the phrase itself allows only a few.
//
// Two other readers can find this link directly, if you would rather ask:
//
//   uiv.ai.find('the small underlined blue link that reads "our website"')
//     — the model looks at the screen and hands back a match like any finder.
//     Needs an AI provider key and costs a model call per attempt, and on a
//     target this small it is worth knowing that it lands a few pixels out
//     often enough to matter.
//
//   uiv.ocr.findText('our website', { engine: 'ocrspace_engine2' })
//     — the OCR.Space cloud OCR reads this link perfectly at exactly this
//     rendering. It needs a FREE API key from https://ocr.space/ocrapi,
//     entered under Settings > OCR.
//
// uiv.browser.click, not uiv.desktop.click — deliberately, and it is what
// makes this demo need no XModule. A CDP click takes viewport CSS pixels
// straight into the tab, so it needs no viewport-to-screen conversion, no
// window focus and no uncovered window, and the finders hand it exactly those
// coordinates. The desktop tier would be the right answer for a target
// OUTSIDE the page — an OS dialog, another application — which this is not.
//
// MEASURE, CLICK, THEN CHECK, and measure again if it did not land. The
// debugger notice can come or go between the measurement and the click, and
// the PDF re-flows when it does. Re-measuring costs nothing here — both
// anchors are local OCR — so the macro simply notices it missed and repeats.
let landed = null;
for (let attempt = 1; attempt <= 3 && !landed; attempt++) {
  const before = uiv.ocr.findText('purchase at', { engine: 'xmodule' });
  const after = uiv.ocr.findText('apply', { engine: 'xmodule' });

  // uiv.offset returns a MATCH, so scope/frame travel with it — bare x/y would
  // drop the browser-scope tag that keeps viewport pixels out of the desktop
  // tier. The offset is measured from the anchor's own centre.
  const midX = Math.round((before.rect.left + before.rect.width + after.rect.left) / 2);
  uiv.browser.click(uiv.offset(before, midX - before.x, 0));

  // the link leaves the PDF for a normal page, so the DOM is back — classic
  // assertElementPresent is just a finder call, and {required: false} turns it
  // into the question "did that work?" instead of an immediate failure
  landed = uiv.$('xpath=//*[@id="logo"]/img', { required: false, timeout: 10 });
  if (!landed && attempt < 3) {
    uiv.log('The click did not land — the viewport moved under it. Measuring again.', 'blue');
  }
}
if (!landed) {
  throw new Error('Clicked between the "purchase at" and "apply" anchors three times and never left the PDF — the page did not navigate.');
}

uiv.log('PDF Automation (JS) completed — read the quote number and followed a link out of the PDF', 'green');
`
  }
]
