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
//   uiv.page.fill('id=email', 'a@b.com')     FASTEST: fills a field in ONE step
//   uiv.page.click('css=#buy')               synthetic event; some sites ignore it
//   uiv.browser.click('css=#buy')           TRUSTED click (CDP), no XModule
//   uiv.browser.click(uiv.findImage('buy.png'))   a visual click is always explicit
//   uiv.browser.type('text')                keystrokes into the FOCUSED element
//   uiv.desktop.mouse.click(m) / .type(t)         real OS input (XModule, screen px)
//   3+ calls of the same tier in a row? Alias it once and keep it readable:
//     const p = uiv.page, b = uiv.browser, x = uiv.desktop;
//     p.type('id=email', 'a@b.com');  b.click(uiv.findImage('buy.png'));
// NAVIGATE: uiv.goto(url)   uiv.evaluate('return document.title')
//           the current URL is uiv.evaluate('return location.href') — !URL is table-macros-only
// MISC: uiv.log(msg, 'green')   uiv.sleep('1s')   uiv.getVar('!LASTCOMMANDOK')   uiv.setVar('n', 1)
//       uiv.exit('reason')  -> end the run EARLY AS A SUCCESS (guard clauses;
//       a failed check still uses throw new Error(...))
// FILES (the CSV/TXT tab): uiv.csv.read/write/append   parsed rows as 2D arrays
//        uiv.text.read/write   the same files RAW - one-per-line lists:
//        uiv.text.read('prompts.txt').split(/\\r?\\n/).map(s => s.trim()).filter(Boolean)
// Long forms with options: uiv.findElements / findImages / ocr.findTexts
// LEGACY bridge (any classic command): uiv.run(command, target, value)

uiv.goto('https://ui.vision/');
const title = uiv.evaluate('return document.title');
uiv.log(\`Page title: \${title}\`);

const headlines = uiv.$$('css=h2', { required: false });
uiv.log(\`Found \${headlines.length} h2 elements\`);

headlines.slice(0, 3).forEach((h, i) => {
  uiv.log(\`h2 #\${i + 1}: \${h.text}\`);
});

if (headlines.length > 0 && uiv.getVar('!BROWSER') !== 'firefox') {
  // hover the first one — CDP input, so Chrome/Edge only
  uiv.browser.hover(headlines[0]);
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
uiv.goto('https://ui.vision/');
uiv.banner('Welcome to Ui.Vision');
uiv.sleep('3s');

uiv.goto('https://ui.vision/contact');
uiv.page.fill('id=ContactName', 'Robby the Robot');
uiv.page.fill('id=Email', 'robby.the.robot@example.com');
// banners take HTML — style what matters — and a green success tone
uiv.banner('Ui.Vision can do many things, for example <b style="color:#389e0d">fill out forms for you</b>', { tone: 'green' });
uiv.sleep('3s');

uiv.goto('https://forum.ui.vision/');
uiv.banner('If you have any question or suggestion, the user forum is a great place to meet other users and the developers');
// the last banner stays visible for a few seconds after the run ends
`

// Preinstalled next to the welcome tour. Stars the Ui.Vision repo on GitHub —
// and doubles as a demo of uiv.banner plus finder-based state detection on a
// CSP-strict site (GitHub blocks uiv.evaluate, so everything is read through DOM
// finders instead).
export const STAR_SCRIPT = `// Star the Ui.Vision RPA project on GitHub — narrated with uiv.banner.
// GitHub's CSP forbids uiv.evaluate on its pages, so everything is read
// through DOM finders (content-script world) instead.
uiv.goto('https://github.com/A9T9/RPA');
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
  uiv.banner('This drawing demo uses trusted CDP input (uiv.browser.*), which only <b>Chrome and Edge</b> support. For Firefox there is a <b>desktop input version</b>: "Draw a cat🐱 - desktop input version" in the demo collection, folder Demo and QA Test Scripts > Browser plus Desktop Automation (if the folder is missing: Settings > Advanced > Replay > Restore Demo Macros > JavaScript).', { seconds: 25 });
  uiv.exit('Firefox detected — this demo needs Chrome or Edge. Use "Draw a cat🐱 - desktop input version" from Demo and QA Test Scripts > Browser plus Desktop Automation instead.');
}

uiv.goto('https://excalidraw.com/');
uiv.banner('<b>Ui.Vision drawing demo</b> — this macro is not affiliated with or endorsed by Excalidraw.', { seconds: 10 });
const c = uiv.$('css=canvas'); // auto-waits until the app has rendered
const b = uiv.browser;

// Clear any existing scene so re-runs start blank (select-all is Cmd+A on
// macOS, Ctrl+A elsewhere)
try {
  b.type('\${KEY_ESC}');
  b.type(uiv.getVar('!OS') === 'mac' ? '\${KEY_CMD+KEY_A}' : '\${KEY_CTRL+KEY_A}');
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
  counts = uiv.evaluate('var els; try { els = JSON.parse(localStorage.getItem("excalidraw") || "[]"); } catch (e) { els = []; } if (!Array.isArray(els)) { els = []; } var r = {ellipse: 0, freedraw: 0, line: 0, text: 0, textContent: ""}; for (var i = 0; i < els.length; i++) { var el = els[i]; if (el.isDeleted) { continue; } if (el.type === "text") { r.text++; r.textContent = el.text; } else if (r[el.type] !== undefined) { r[el.type]++; } } return r;');
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
    fileName: "Play Flappy Bird from Browser.js",
    path: "Browser plus Desktop Automation/Play Flappy Bird from Browser.js",
    title: "Flappy Bird: browser setup and desktop gameplay",
    code: `"use browser";
// Browser setup locates the canvas; the app handles gameplay from pixels.
// uiv.app.run still defaults to the whole viewport when no area is supplied.
uiv.goto('https://ui.vision/demo/flappybird');
uiv.window.resize(960, 820);
// The resize is a request: on a screen shorter than the asked height the
// window is clamped and the 640 px canvas hangs below the viewport, where
// elementFromPoint sees nothing and the guard below reports it as covered.
// Bring the canvas to the top of the viewport first, and say plainly when
// the viewport is smaller than the canvas.
uiv.evaluate(
  'var c=document.querySelector("canvas#board");if(!c)throw Error("Flappy canvas was not found");' +
  'c.scrollIntoView({block:"start"});var r=c.getBoundingClientRect();' +
  'if(r.width>innerWidth||r.height>innerHeight)throw Error("The Flappy canvas ("+Math.round(r.width)+"x"+Math.round(r.height)+" px) is larger than the viewport ("+innerWidth+"x"+innerHeight+" px): the browser window needs more height, for example hide the Dock or taskbar");' +
  'return true;'
);
// This opens the ready screen; the first native flap starts gameplay. The demo
// page ignores synthetic DOM events ("Visual game play only" is on by default),
// so the click is real OS input from the desktop app, which this demo needs
// anyway (uiv.browser.* is CDP input, which Firefox does not provide).
uiv.desktop.mouse.click(uiv.$('#start-button'));
var canvas = uiv.evaluate(
  'var c=document.querySelector("canvas#board");if(!c)throw Error("Flappy canvas was not found");' +
  'var r=c.getBoundingClientRect(),s=getComputedStyle(c);' +
  'var l=parseFloat(s.borderLeftWidth)+parseFloat(s.paddingLeft),t=parseFloat(s.borderTopWidth)+parseFloat(s.paddingTop);' +
  'var rr=parseFloat(s.borderRightWidth)+parseFloat(s.paddingRight),b=parseFloat(s.borderBottomWidth)+parseFloat(s.paddingBottom);' +
  'var a={x:r.left+l,y:r.top+t,width:r.width-l-rr,height:r.height-t-b};' +
  'if(![[0.1,0.1],[0.5,0.5],[0.9,0.9]].every(function(p){return document.elementFromPoint(a.x+a.width*p[0],a.y+a.height*p[1])===c;}))throw Error("The Flappy canvas is covered");' +
  'return {area:a,width:c.width,height:c.height};'
);
// The desktop macro derives its scale from the canvas area itself (board width
// over the game's fixed 360), so no canvas size is passed.
var game = uiv.app.run('Demo and QA Test Scripts/Desktop App (high speed)/Play Flappy Bird.d.js', {
  durationSeconds:300
}, {area:canvas.area});
// The score is read by the desktop macro itself (Settings engine, then
// engine 'aiprovider' through the shared AI settings), so nothing is re-read here.
uiv.log('Back in the browser: '+game.elapsedSeconds.toFixed(1)+' seconds, '+game.pipesPassed+' pipes, score '+(game.score===null?'unreadable':game.score));
// On-page banner with the final result. Shown only now, after the desktop run
// returned, so it never covers the canvas the desktop finders read. The
// desktop app shows its own overlay banner while it plays; this is the
// browser side's result. uiv.banner('') would clear it.
uiv.banner('Flappy Bird ' + (game.survived ? 'complete' : 'ended') + ' — ' + game.elapsedSeconds.toFixed(0) + 's, ' + game.pipesPassed + ' pipes, score ' + (game.score === null ? 'unreadable' : game.score), { seconds: 8 });
uiv.result(game);
`
  },
  {
    fileName: "Play Dino from Browser.js",
    path: "Browser plus Desktop Automation/Play Dino from Browser.js",
    title: "Dino: browser launcher and desktop gameplay",
    code: `"use browser";
// The standalone desktop macro opens chrome://dino and locates it with pixels.
// Browser-internal pages forbid extension script injection. An explicit desktop
// call needs no viewport marker; the app owns its window setup and geometry.
uiv.requireAppVersion('2.1.40');
var game = uiv.app.run('Demo and QA Test Scripts/Desktop App (high speed)/Play Chrome Dino Game.d.js', {durationSeconds:180}, {scope:'desktop'});
// The score is read by the desktop macro itself (Settings engine, then
// engine 'aiprovider' through the shared AI settings), so nothing is re-read here.
uiv.log('Back in the browser: '+game.elapsedSeconds.toFixed(1)+' seconds, score '+(game.score===null?'unreadable':game.score));
// The child shows its native result overlay. An on-page browser banner cannot
// be injected into chrome://dino; return the result to the caller and log instead.
uiv.result(game);
`
  },
  {
    fileName: 'DemoHeldKeys.js',
    path: 'Browser Vision (Chrome, Edge)/DemoHeldKeys.js',
    title: 'Hold two keys (CDP)',
    code: `// Playwright keyboard names; Ui.Vision waits automatically, so no await.
uiv.goto('https://ui.vision/demo/webtest/');
uiv.evaluate(\`document.title='Ui.Vision held keys demo';
document.body.innerHTML='<h1>Hold two keys together</h1><p>The status below shows which keys are held.</p><div id="pad" tabindex="0" style="padding:60px;border:3px solid #3466ac;font:28px system-ui">Click here to focus</div>';
window.heldKeys={}; window.sawBoth=false;
var pad=document.querySelector('#pad');
pad.addEventListener('keydown',function(e){e.preventDefault();window.heldKeys[e.code]=true;if(heldKeys.KeyA&&heldKeys.KeyW)window.sawBoth=true;pad.textContent=Object.keys(heldKeys).join(' + ')||'All released';});
pad.addEventListener('keyup',function(e){delete window.heldKeys[e.code];pad.textContent=Object.keys(heldKeys).join(' + ')||'All released';});\`);
uiv.browser.mouse.click(uiv.$('#pad'));
const keyboard = uiv.browser.keyboard;
try {
  keyboard.down('a');
  keyboard.down('w');
  uiv.sleep(1200);
  if (!uiv.evaluate('return window.heldKeys.KeyA && window.heldKeys.KeyW')) {
    throw new Error('A and W were not held together');
  }
} finally {
  keyboard.up('w');
  keyboard.up('a');
}
if (!uiv.evaluate('return window.sawBoth && Object.keys(window.heldKeys).length===0')) {
  throw new Error('Held-key or release check failed');
}
uiv.log('PASS: A and W held together, then both released', 'green');
// Any keys left down are also released when the macro finishes or stops.
`
  },
  {
    fileName: 'DemoDesktopHeldKeys.js',
    path: 'Browser plus Desktop Automation/DemoDesktopHeldKeys.js',
    title: 'Hold two keys (desktop)',
    code: `// Playwright keyboard names; Ui.Vision waits automatically, so no await.
uiv.goto('https://ui.vision/demo/webtest/');
uiv.evaluate(\`document.title='Ui.Vision held keys demo';
document.body.innerHTML='<h1>Hold two keys together</h1><p>The status below shows which keys are held.</p><div id="pad" tabindex="0" style="padding:60px;border:3px solid #3466ac;font:28px system-ui">Click here to focus</div>';
window.heldKeys={}; window.sawBoth=false;
var pad=document.querySelector('#pad');
pad.addEventListener('keydown',function(e){e.preventDefault();window.heldKeys[e.code]=true;if(heldKeys.KeyA&&heldKeys.KeyW)window.sawBoth=true;pad.textContent=Object.keys(heldKeys).join(' + ')||'All released';});
pad.addEventListener('keyup',function(e){delete window.heldKeys[e.code];pad.textContent=Object.keys(heldKeys).join(' + ')||'All released';});\`);
uiv.window.focus();
uiv.desktop.mouse.click(uiv.$('#pad'));
const keyboard = uiv.desktop.keyboard;
try {
  keyboard.down('a');
  keyboard.down('w');
  uiv.sleep(1200);
  if (!uiv.evaluate('return window.heldKeys.KeyA && window.heldKeys.KeyW')) {
    throw new Error('A and W were not held together');
  }
} finally {
  keyboard.up('w');
  keyboard.up('a');
}
if (!uiv.evaluate('return window.sawBoth && Object.keys(window.heldKeys).length===0')) {
  throw new Error('Held-key or release check failed');
}
uiv.log('PASS: A and W held together, then both released', 'green');
// Any keys left down are also released when the macro finishes or stops.
`
  },
  {
    fileName: 'DemoScrolling.js',
    path: 'Browser Vision (Chrome, Edge)/DemoScrolling.js',
    title: 'Scrolling (Playwright API)',
    code: `// Scrolling: Playwright names, sequential Ui.Vision syntax (no async/await).
// Requires extension 10.0.270+. Set NATIVE = true for OS wheel input
// through Ui.Vision for Desktop 2.1.38+. Run this demo in the browser extension.
const NATIVE = false;
uiv.goto('https://ui.vision/demo/webtest/');
uiv.evaluate(\`document.title = 'Ui.Vision scrolling demo';
document.body.innerHTML = '<h1>Scrolling demo</h1><p>Watch the panel move down, right, and back. Then reveal the green target.</p><div id="panel" style="width:440px;height:240px;overflow:auto;border:3px solid #253858"><div style="width:1200px;height:1200px;position:relative;background:repeating-linear-gradient(0deg,#edf3fb 0px,#edf3fb 99px,#bfd0e5 100px)"><strong style="position:absolute;left:20px;top:20px">Start here</strong><button id="goal" style="position:absolute;left:980px;top:980px;width:160px;height:60px;background:#79dfaf">Target reached</button></div></div>';
document.body.style.cssText = 'font:18px system-ui;margin:30px;background:white;color:#17253a';
window.scrollTo(0,0);\`);
const panel = uiv.$('#panel');
const mouse = NATIVE ? uiv.desktop.mouse : uiv.browser.mouse;
// A DOM match carries the viewport-to-screen information for native input.
mouse.move(panel);
mouse.wheel(0, 260);       // down
uiv.sleep(600);            // wheel waits for dispatch; content may still animate
const down = uiv.evaluate('return document.querySelector("#panel").scrollTop');
if (down <= 0) throw new Error('Vertical wheel input did not reach the panel');
mouse.wheel(180, 0);       // right
uiv.sleep(600);
const right = uiv.evaluate('return document.querySelector("#panel").scrollLeft');
if (right <= 0) throw new Error('Horizontal wheel input did not reach the panel');
mouse.wheel(-90, -130);    // left and up together
uiv.sleep(600);
const back = uiv.evaluate('var p = document.querySelector("#panel"); return {x:p.scrollLeft,y:p.scrollTop}');
if (back.x >= right || back.y >= down) throw new Error('Reverse wheel direction was incorrect');

// Keep Playwright's name. The finder does not scroll here, so this method
// reveals the target, including inside nested scroll containers.
uiv.$('#goal', {scroll: false}).scrollIntoViewIfNeeded({timeout: 3000});
const first = uiv.evaluate('var p=document.querySelector("#panel"); return [p.scrollLeft,p.scrollTop]');
uiv.$('#goal', {scroll: false}).scrollIntoViewIfNeeded();
const second = uiv.evaluate('var p=document.querySelector("#panel"); return [p.scrollLeft,p.scrollTop]');
if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('An already visible target moved');
uiv.log('PASS: both wheel axes, reverse direction, reveal target, and already-visible no-op', 'green');
`
  },
  {
    // a fresh install also writes this macro at the TREE root (see
    // installWelcomeMacro); this copy in the demo folder is what the
    // restore button brings back after the root copy is deleted
    fileName: 'A short welcome tour.js',
    path: 'Browser Core/A short welcome tour.js',
    title: 'Welcome tour (JS)',
    code: WELCOME_SCRIPT
  },
  {
    // also written at the tree root on a fresh install, like the welcome tour
    fileName: 'Like Ui.Vision？Give us a star 🌟.js',
    path: 'Browser Core/Like Ui.Vision？Give us a star 🌟.js',
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
    path: 'Browser Core/DemoBannerWaitForHuman.js',
    title: 'Banner: human in the loop (JS)',
    code: `// uiv.banner for ATTENDED automation: the macro hands a step to the
// human — a captcha, a 2FA code, a judgment call — tells them so ON the
// page, and waits until they did it. No dialog to dismiss, nothing to
// click: the banner ignores mouse events, so the page stays fully usable.
uiv.goto('https://ui.vision/contact');

// the browser may RESTORE a previously typed value into the form — clear it,
// or the "wait for the human" below would be over before it began
uiv.page.fill('id=ContactName', '');

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
uiv.page.fill('id=Email', \`\${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com\`);
uiv.sleep('3s');
uiv.banner(\`All done, \${name} \\u2014 this is how a macro asks for a captcha or a confirmation without stopping.\`, { seconds: 6 });
`
  },
  {
    fileName: 'DemoFrames.js',
    path: 'Browser Core/DemoFrames.js',
    title: 'DemoFrames (JS)',
    code: `// JS version of the DemoFrames macro.
// The table version needs selectFrame index=0..4 before each field. In JS
// the FINDER (uiv.$) pierces same-origin frames — pass its match to
// uiv.page.fill and the fill happens inside the right frame. DOM input, so
// this demo runs in every browser (Firefox included).
uiv.goto('https://ui.vision/demo/webtest/frames/');

for (let i = 1; i <= 5; i++) {
  uiv.page.fill(uiv.$(\`name=mytext\${i}\`), \`Frame\${i} - filled by JS, no selectFrame!\`);
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
  uiv.page.fill(formInput, 'Filled from JS across a cross-origin iframe!');
}
uiv.log('DemoFrames (JS) completed - no selectFrame anywhere', 'green');
`
  },
  {
    fileName: 'DemoIframe.js',
    path: 'Browser Core/DemoIframe.js',
    title: 'DemoIframe (JS)',
    code: `// JS version of the DemoIframe macro. The embedded Google Form is a
// CROSS-ORIGIN iframe (docs.google.com inside ui.vision). The classic
// macro needs selectFrame to hop into it; the DOM finder just finds the
// elements — cross-origin matches carry frame-local coordinates and
// uiv.click runs a DOM click inside that frame automatically.
uiv.goto('https://ui.vision/demo/iframes');

// every target lives INSIDE the iframe, so each one goes through the
// frame-piercing finder; uiv.page.* acts on the match in the right frame
uiv.page.click(uiv.$('xpath=//span[contains(text(),".Vision IDE")]'));
uiv.page.fill(uiv.$('xpath=//input[@type="text"]'), 'Automating a cross-origin iframe from JS');

// to page 2 of the form ("Next" localizes, so match both)
uiv.page.click(uiv.$('xpath=//span[text()="Next" or text()="Weiter"]'));

// page 2: the visible answer field is a textarea (the classic macro's
// name=entry... target is a HIDDEN input - visible-by-default finds
// the field a human would use)
uiv.page.fill(uiv.$('css=textarea'), 'Form Filling Test Done!');
// (Submit intentionally skipped - this demo stops before submitting)
uiv.log('DemoIframe (JS) completed - page 2 of a cross-origin iframe form', 'green');
`
  },
  {
    fileName: 'DemoAutofill.js',
    path: 'Browser Core/DemoAutofill.js',
    title: 'DemoAutofill (JS)',
    code: `// JS version of the DemoAutofill macro — Google Form filling with plain DOM
// clicks and typing, so it runs in EVERY browser, Firefox included. The
// DemoAutofillChrome variant (in "Browser Vision (Chrome, Edge)") fills the
// same form with trusted CDP input instead.
// special variables are read and written by name — the same names as
// \${!TIMEOUT_PAGELOAD} in a table macro
uiv.setVar('!TIMEOUT_PAGELOAD', 60);
uiv.goto('https://docs.google.com/forms/d/1cbI5dMRs0-t_IwNzPm6T3lAG_nPgsnJZEA-FEYVARxg/');

uiv.page.click('xpath=//span[contains(text(),".Vision IDE")]');
uiv.page.click("xpath=//*[text()[contains(.,'Web Testing')]]");
uiv.page.click('xpath=//span[contains(text(),"Form Autofilling")]');
uiv.page.click('xpath=//*[text()[contains(.,"General Web Automation")]]');
uiv.shot.viewport('AutoFillJS_page1');

// "Next" button (same locator as the table macro uses)
uiv.page.click('xpath=//*[@id="mG61Hd"]/div/div/div[3]/div/div/div/span/span');

// page 2: uiv.page.fill fills a field in ONE call — no click to focus needed,
// and multiline text is just \\n in the string
uiv.page.fill('xpath=//input[@type="text"]', 'This is a single line test...');
uiv.page.fill('xpath=//textarea', '...and this a multiline test:\\nLine2\\nLine3');
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
uiv.goto('https://ui.vision/rpa/docs/selenium-ide/form-filling');
const title = uiv.evaluate('return document.title');

if (!title.includes('Form Filling')) {
  throw new Error(\`unexpected title: \${title}\`);
}
uiv.log(\`Title check passed: \${title}\`, 'green');
`
  },
  {
    fileName: 'DemoTabs.js',
    path: 'Browser Core/DemoTabs.js',
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
uiv.goto('https://ui.vision/demo/tabs');

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
  const href = uiv.evaluate("var a = Array.prototype.find.call(document.links, function (x) { return x.textContent.trim() === '" + linkText + "'; }); return a ? a.href : null");
  if (!href) { throw new Error('link not found: ' + linkText); }
  uiv.tabs.open(href); // Firefox: same tab, opened the JS-native way
};

openLinkedTab('Open new web page in new browser tab');
uiv.tabs.select(startTabIndex + 1); // classic tab=1: first tab right of the start tab
const t1 = uiv.evaluate('return document.title');
if (!t1.includes('TAB1')) { throw new Error(\`expected TAB1, got: \${t1}\`); }
logTabs('blue');
assertTabRel(1, 'after tabs.select(start + 1)');
uiv.page.fill('id=sometext1', 'this is tab 1 (typed from JS)');

// opened from TAB1 (the rightmost tab), so the new tab lands after it = start + 2
openLinkedTab('Open yet another web page in a new browser tab');
uiv.tabs.select(startTabIndex + 2);
const t2 = uiv.evaluate('return document.title');
if (!t2.includes('TAB2')) { throw new Error(\`expected TAB2, got: \${t2}\`); }
uiv.page.fill('id=sometext2', 'And this is tab 2! (JS)');

// back to TAB1 and close it — what was TAB2 then moves one place left
uiv.tabs.select(startTabIndex + 1);
uiv.page.fill('id=sometext1', 'Now back in tab 1 - test done! (JS)');
uiv.tabs.close();
uiv.sleep('1s');
const t3 = uiv.evaluate('return document.title');
if (!t3.includes('TAB2')) { throw new Error(\`expected TAB2 after close, got: \${t3}\`); }
uiv.log(\`After close, now on: \${t3}\`);

uiv.tabs.select(startTabIndex + 1);
const t4 = uiv.evaluate('return document.title');
if (!t4.includes('TAB2')) { throw new Error(\`expected TAB2 via start + 1, got: \${t4}\`); }
logTabs('green');
assertTabRel(1, 'the old TAB2 is now first right of the start tab');

// uiv.tabs.open always appends a new tab at the far RIGHT of the window,
// switches to it and waits for it — each one lands one place right of the
// previous (the classic tab=open, minus the sleep it needed)
uiv.tabs.open('https://ui.vision');
uiv.log(\`Opened new tab: \${uiv.evaluate('return document.title')}\`);
const afterFirstOpen = tabAbs();
uiv.tabs.open('https://ocr.space');
uiv.log(\`Opened new tab: \${uiv.evaluate('return document.title')}\`);

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
    path: 'Browser Core/DemoDownload.js',
    title: 'DemoDownload (JS)',
    code: `// Port of Classic/Core/DemoDownload — built on uiv.download, which
// replaces the classic onDownload/saveItem pair: it downloads, renames,
// WAITS for completion and returns the name the file got on disk.
const d = new Date();
const todaydate = \`\${d.getFullYear()}-\${d.getMonth() + 1}-\${d.getDate()}\`;
uiv.log(\`Today is \${todaydate}\`);

uiv.goto('https://ui.vision/demo/filedownload');

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
    path: 'Browser Core/DemoTakeScreenshots.js',
    title: 'DemoTakeScreenshots (JS)',
    code: `// Port of Classic/Core/DemoTakeScreenshots.
// Screenshots and storeImage have no native uiv methods (they write files
// rather than return values), so they use the legacy bridge.
uiv.goto('https://ui.vision/blog/');
uiv.shot.page('rpablog');

// classic "linkText=read more@POS=1" — in JS the position is just an index
const readMore = uiv.$$('link=read more');
uiv.log(\`Found \${readMore.length} "read more" links\`);

uiv.page.click(readMore[0]);
uiv.shot.page('article1');

uiv.goto('https://ui.vision/blog/');
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

// What did this macro leave behind? uiv.files.list() spans ALL THREE stores —
// screenshots, the CSV/TXT tab and the vision images — so filter when you want
// one kind, or pass {store: 'screenshots'}. The other file verbs are
// uiv.files.exists(name), uiv.files.remove(name) and
// uiv.files.exportToDownloads(name), which take a .png exactly like they
// take a .csv, and one name at a time. The shots stay here on
// purpose: open the Data > Screenshots tab and look at them.
const shots = uiv.files.list().filter(n => /\\.png$/i.test(n));
uiv.log(\`Screenshots stored: \${shots.join(', ')}\`, 'blue');
`
  },
  {
    fileName: 'DemoImplicitWaiting.js',
    path: 'Browser Core/DemoImplicitWaiting.js',
    title: 'DemoImplicitWaiting (JS)',
    code: `// Port of Classic/Core/DemoImplicitWaiting.
// The whole waitForElementVisible concept disappears in JS: uiv.$ auto-waits
// up to !TIMEOUT_WAIT and throws if the element never appears, so finding it
// IS the wait.
uiv.goto('https://ui.vision/demo/waitforelementvisible');

uiv.page.click(uiv.$('css=#div1 > h1'));

uiv.setVar('!TIMEOUT_WAIT', 20);
uiv.page.click(uiv.$('css=#div2 > h1'));

// Implicit waiting: elements that appear later are simply found later
uiv.goto('https://ui.vision/demo/webtest/implicitwaiting/');
uiv.setVar('!TIMEOUT_WAIT', 15);

// classic assertText -> read the text and check it yourself
const intro = uiv.$('xpath=/html/body/header/center/p[2]').text;
if (!intro.includes('Use the select box to start the timer')) {
  throw new Error(\`unexpected intro text: \${intro}\`);
}

uiv.page.selectOption('id=minutesSelect', '5 Seconds');
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
    path: 'Browser Core/DemoCsvSave.js',
    title: 'DemoCsvSave (JS)',
    code: `// Port of Classic/Core/DemoCsvSave.
// The classic macro builds a row by storing cell after cell into the magic
// !csvLine variable and then csvSave-ing it. In JS a row is just an array.
uiv.goto('https://ui.vision/demo/csvsave');

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
const pageText = uiv.evaluate('return document.body.innerText');
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
uiv.files.exportToDownloads('currencyconverterdata.csv');
`
  },
  {
    fileName: 'Sub_DemoCsvRead_FillForm.js',
    path: 'Browser Core/Sub/Sub_DemoCsvRead_FillForm.js',
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
//   // @include Demo and QA Test Scripts/Browser Core/Sub/Sub_DemoCsvRead_FillForm.js

function fillFormFromRow (row, lineNumber) {
  uiv.log(\`Filling the form from CSV row \${lineNumber}: \${row.join(', ')}\`, 'green');

  // /viewform is the public fill-out view — a bare /view redirects to a
  // Google error/sign-in page with no form inputs, and every row times out
  uiv.goto('https://docs.google.com/forms/d/e/1FAIpQLScGWVjexH2FNzJqPACzuzBLlTWMJHgLUHjxehtU-2cJxtu6VQ/viewform');

  uiv.page.fill("xpath=//input[@type='text']", \`\${row[0]}_\${lineNumber}\`);
  uiv.page.fill('xpath=//div[3]/div/div/div[2]/div/div/div/div/input', row[1]);
  uiv.page.fill('xpath=//div[4]/div/div/div[2]/div/div/div/div/input', row[2]);

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
    path: 'Browser Core/DemoCsvReadWithWhile.js',
    title: 'DemoCsvReadWithWhile (JS)',
    code: `// Port of Classic/Core/DemoCsvReadWithWhile.
//
// The classic macro reads the CSV one line at a time, tracking
// !csvReadLineNumber and !csvReadStatus by hand and looping while the status
// stays "OK". Here the file is simply an array, so the loop is a forEach and
// the bookkeeping variables disappear.
//
// The subroutine is a real function, spliced in before the script compiles:
// @include Demo and QA Test Scripts/Browser Core/Sub/Sub_DemoCsvRead_FillForm.js

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
    path: 'Browser Core/DemoCsvReadArray.js',
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
    path: 'Browser Core/DemoTextReadWrite.js',
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
uiv.files.exportToDownloads('demo_prompts.txt');

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

// uiv.csv.list() is the CSV/TXT tab alone; uiv.files.list() spans that tab,
// the screenshots AND the vision images, since a file name is a file name
uiv.log(\`CSV/TXT tab now holds: \${uiv.csv.list().join(', ')}\`, 'blue');
uiv.log('DemoTextReadWrite (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoIfElse.js',
    path: 'Browser Core/DemoIfElse.js',
    title: 'DemoIfElse (JS)',
    code: `// Port of Classic/Core/DemoIfElse.
// This is the macro that argues best for scripts: gotoIf, label, gotoLabel and
// onError all become ordinary JavaScript, and the flow reads top to bottom
// instead of jumping between labels.
uiv.goto('https://ui.vision/demo/executeScript');

const hour = uiv.evaluate('return new Date().getHours()');
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

// classic storeAttribute: attributes travel with the match snapshot, so
// getAttribute works Selenium-style right on the finder's result (null when
// the attribute is absent). Live DOM *properties* (.checked, computed .href)
// still go through uiv.evaluate.
const boxsize = Number(uiv.$('id=sometext').getAttribute('size'));
uiv.log(\`With the correct xpath we get: Boxsize = \${boxsize}\`, 'green');

// classic gotoIf + gotoLabel + label -> if/else
if (boxsize > 70) {
  uiv.log('Input box too big. This is what the classic gotoIf branch did');
} else {
  uiv.page.fill('id=sometext', \`This box is \${boxsize} chars wide\`);
  uiv.evaluate(\`document.title = '\${boxsize}'; return document.title\`);
}

// classic onError | #goto | fixerror -> try/catch, which also says WHY
try {
  uiv.page.fill('id=sometext', 'this line works');
  uiv.page.fill('id=sometextXXXXX', 'this line has the wrong ID...');
  uiv.log('this line is never reached, because of the error above', 'blue');
} catch (e) {
  uiv.log(\`here we can have code that handles the error: \${e.message}\`, 'green');
  uiv.page.fill('id=sometext', 'Fix Error Section: This command works.');
}

uiv.log('DemoIfElse (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoExtract.js',
    path: 'Browser Core/DemoExtract.js',
    title: 'DemoExtract (JS)',
    code: `// Port of Classic/Core/DemoExtract.
// The classic macro needs storeAttribute, storeText, storeTitle, storeValue,
// storeChecked and six sourceExtract commands. Almost none of them need a
// uiv.* equivalent: reading the page IS what JavaScript does.
uiv.goto('https://ui.vision/demo/executescript');

// The classic macro reads \${!URL} here. In a script that variable is only
// refreshed by the classic player, so it lags behind the page — ask the page.
uiv.log(\`Current page URL = \${uiv.evaluate('return location.href')}\`);
uiv.log('This macro shows various ways to extract and save data from a website');

// --- attributes: classic storeAttribute -------------------------------------
// A DOM match carries every attribute as a find-time snapshot, so getAttribute
// works Selenium-style straight on the finder's result — and an absent
// attribute returns null, like the DOM (no #LNF sentinel, no throw).
const img = uiv.$('css=img.responsive-img');
uiv.log(\`src attribute = \${img.getAttribute('src')}\`);
uiv.log(\`alt text = \${img.getAttribute('alt')}\`);
if (img.getAttribute('data-not-there') !== null) {
  throw new Error('an absent attribute must read as null');
}

// A live DOM PROPERTY is different from the attribute — .src resolves to the
// absolute URL while the attribute keeps the page's spelling. Properties are
// read via the page itself:
const imgSrc = uiv.evaluate("return document.querySelector('img.responsive-img').src");
uiv.log(\`src property (resolved URL) = \${imgSrc}\`);

const boxsize = Number(uiv.$('id=sometext').getAttribute('size'));
uiv.log(\`input box size = \${boxsize}\`);

uiv.page.fill('id=sometext', \`This box is \${boxsize} chars wide\`);
uiv.evaluate(\`document.title = '\${boxsize}'; return document.title\`);

// classic assertTitle -> read it and throw
const titleNow = uiv.evaluate('return document.title');
if (titleNow !== String(boxsize)) {
  throw new Error(\`assertTitle failed: expected '\${boxsize}', got '\${titleNow}'\`);
}

// --- text and values: classic storeText / storeTitle / storeValue -----------
const header = uiv.$('xpath=//*[@id="content"]/div[2]/div/h2[3]');
uiv.page.click(header);
uiv.log(\`header = \${header.text}\`);

uiv.log(\`page title = \${uiv.evaluate('return document.title')}\`);

const mytext = uiv.$('id=sometext').value;
uiv.page.selectOption('id=tesla', 'Model Y');
const mytesla = uiv.$('id=tesla').value;
uiv.log(\`The text box contains [\${mytext}] and the select box has [\${mytesla}] selected\`);

// classic assertValue
if (mytesla !== 'y') {
  throw new Error(\`assertValue failed: select is '\${mytesla}', expected 'y'\`);
}

// --- checkboxes: classic storeChecked ---------------------------------------
const checked = uiv.evaluate("var els = document.getElementsByName('vehicle'); var out = []; for (var i = 0; i < els.length; i++) { out.push(els[i].checked); } return out");
uiv.log(\`User has bike:\${checked[0]}, car:\${checked[1]}, boat:\${checked[2]}\`, 'green');

// --- page SOURCE: classic sourceExtract -------------------------------------
// Six sourceExtract commands become ONE fetch of the source plus plain regex.
// @1,1 / @2 meant "which match, which capture group" — in JS that is just
// indexing, and you can see what you are indexing into.
const html = uiv.evaluate('return document.documentElement.outerHTML');

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
const mytitle = uiv.evaluate('return document.title');
uiv.shot.viewport(\`myscreenshot_\${mytitle}\`);
uiv.shot.element('xpath=//*[@id="page-header"]/div/div/h1', 'pagetitle.png');
uiv.files.exportToDownloads(\`myscreenshot_\${mytitle}.png\`);
uiv.files.exportToDownloads('pagetitle.png');

uiv.log('DemoExtract (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoExecuteScript.js',
    path: 'Browser Core/DemoExecuteScript.js',
    title: 'DemoExecuteScript (JS)',
    code: `// Port of Classic/Core/DemoExecuteScript.
// The classic macro is 49 commands, and most of them exist only to run a
// little JavaScript through executeScript_Sandbox and pass the result back
// through a variable. In a script that IS the language, so they just vanish.
uiv.goto('https://ui.vision/demo/executescript');

// classic assertText / assertTitle -> read and throw
const heading = uiv.$('xpath=//*[@id="content"]/div[2]/div/h2[1]').text;
if (!heading.includes('Input box to display some results')) {
  throw new Error(\`unexpected heading: \${heading}\`);
}
if (uiv.evaluate('return document.title') !== 'Selenium IDE executeScript Demo Page') {
  throw new Error(\`unexpected page title: \${uiv.evaluate('return document.title')}\`);
}

// classic sourceSearch: count occurrences in the page source
const html = uiv.evaluate('return document.documentElement.outerHTML');
if (!html.includes('G-VJNCDYRXBP')) {
  throw new Error('Google Analytics ID is wrong!');
}

// --- calculations: no executeScript_Sandbox round trip needed ---------------
const AAA = 15;
const BBB = 10;
const CCC = AAA - BBB;
uiv.log(String(CCC));
uiv.evaluate(\`document.title = '\${CCC}'; return document.title\`);
if (uiv.evaluate('return document.title') !== '5') {
  throw new Error('title was not set to 5');
}

const upper = 'SELenium IDe'.toUpperCase();
uiv.log(upper);
uiv.page.fill('id=sometext', upper);

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
uiv.page.fill('id=sometext', output);

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
    code: `// Chrome/Edge variant of Browser Core/DemoAutofill: the same Google Form, filled
// with TRUSTED input through the debugger API (uiv.browser.*) — no XModule
// needed, but not available on Firefox. Use it when a site ignores the
// synthetic events uiv.page.* sends.
if (uiv.getVar('!BROWSER') === 'firefox') {
  uiv.exit('This demo uses trusted CDP input (uiv.browser.*), which Firefox does not support — use Browser Core/DemoAutofill instead (same form, DOM input, every browser).');
}
uiv.setVar('!TIMEOUT_PAGELOAD', 60);
uiv.goto('https://docs.google.com/forms/d/1cbI5dMRs0-t_IwNzPm6T3lAG_nPgsnJZEA-FEYVARxg/');

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
uiv.goto('https://ui.vision/rpa/docs/selenium-ide/form-filling');
const title = uiv.evaluate('return document.title');

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
// uiv.desktop.keyboard.type it cannot reach OS dialogs.
if (uiv.getVar('!BROWSER') === 'firefox') {
  uiv.exit('This demo uses trusted CDP input (uiv.browser.*), which Firefox does not support — Chrome/Edge only.');
}
const b = uiv.browser;

uiv.goto('https://www.wikipedia.org');

// focus the search box with a trusted click, then type a (wrong) term
b.click('css=#searchInput');
b.type('Selenium');

// fix it: select-all (Cmd+A on macOS, Ctrl+A elsewhere — Ctrl+A in a mac
// browser only moves the caret, so the wrong term would stay in the field),
// then overwrite and submit
const isMac = uiv.getVar('!OS') === 'mac';
b.type(isMac ? '\${KEY_CMD+KEY_A}' : '\${KEY_CTRL+KEY_A}');
b.type('Robotic process automation\${KEY_ENTER}');

// The classic macro pauses 3s here. Auto-wait is better — but ONLY on an
// element unique to the target state: css=h1 exists on the Wikipedia portal
// too, so it matched the OLD page instantly and waited for nothing.
// #firstHeading exists only on an article.
const heading = uiv.$('css=#firstHeading').text;
uiv.log(\`Landed on: \${uiv.evaluate('return document.title')}\`, 'blue');

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
  uiv.exit('This demo uses trusted CDP input (uiv.browser.*), which Firefox does not support — see Browser plus Desktop Automation/DemoDesktopDrag for the same sliders with real OS input.');
}
const b = uiv.browser;

uiv.goto('https://ui.vision/demo/draw');
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
  uiv.exit('This demo uses trusted CDP input (uiv.browser.*), which Firefox does not support — Chrome/Edge only. (The same anchor+offset idiom works with real OS input too: uiv.desktop.mouse.click(uiv.offset(uiv.ocr.findText(anchor, {scope: "desktop"}), dx, dy)).)');
}
const b = uiv.browser;

uiv.goto('https://ui.vision/demo/draw');
uiv.page.click('link=calculator');

// EU visitors get a CMP consent wall before the calculator renders
// (measured live: OCR could read nothing but the consent text). The CMP
// (Google Funding Choices) renders its buttons in the top document, so a
// DOM click is the sure dismissal. The VISUAL click — OCR anchor + trusted
// CDP click — stays as the fallback for a CMP that lives in its own iframe;
// there the button is the LOWEST 'Consent' on screen, the same word also
// appears in the dialog's body text above the button row. Measured live
// (Linux, 2026-09-05): an OCR pass right after the page opened saw ONLY
// the body-text 'Consent' — the button row had not rendered yet — clicked
// it, and the wall stayed up; the DOM button never has that race.
const consentBtn = uiv.$('css=.fc-cta-consent', { required: false, timeout: 5 });
if (consentBtn) {
  uiv.page.click('css=.fc-cta-consent');
  uiv.log('consent wall dismissed (DOM button)', 'blue');
  uiv.sleep('2s');
} else {
  const consentHits = uiv.ocr.findTexts('Consent*', { required: false, timeout: 5 });
  if (consentHits.length) {
    uiv.browser.click(consentHits.sort((p1, p2) => p2.y - p1.y)[0]);
    uiv.log('consent wall dismissed (visual click)', 'blue');
    uiv.sleep('2s');
  }
}

// no engine pin: these reads use the engine configured in Settings > OCR
// ({engine: 'xmodule'} — the XModule Local OCR — reads best when installed)
uiv.setVar('!OCRLANGUAGE', 'eng');

// Anchors: mc (top-left key) and R2 (bottom row, 3rd column). Both are
// multi-char labels the OCR reads reliably — its neighbor R0 misreads as
// "RO" (letter O), and the digit keys are single chars, too short to trust.
const mc = uiv.ocr.findText('mc');
// Second anchor for the grid pitch. WHICH keys a local engine reads as a
// token of their own varies per engine AND per capture (measured live: the
// Linux engine returns nothing for the R-row; macOS read 'R2' in one run,
// glued the x key onto the digit row as '789X' in the next, and split it
// into '78' + '9' in a third), so this is a MENU of anchors with known grid
// positions — take the first the engine reads, which is exactly what the
// finder's own miss message recommends ("anchor on a word OCR did read").
// Each entry: [text, columns right of mc, rows below mc]. A hit must sit
// below-right of mc within the keypad — the digits also occur in page text.
const MENU = [
  ['R2', 2, 6], ['789*', 1, 2], ['%', 2, 1], ['9', 2, 2], ['5', 1, 3], ['6', 2, 3],
  ['3', 2, 4], ['AC', 0, 1], ['4', 0, 3], ['1', 0, 4]
];
let stepX, stepY;
for (const [text, cols, rows] of MENU) {
  if (stepX !== undefined && stepY !== undefined) break;
  const hit = uiv.ocr.findTexts(text, { required: false, timeout: 2 }).find(m =>
    m.x >= mc.x - 5 && m.y >= mc.y - 5 && m.x - mc.x < 10 * mc.rect.width && m.y - mc.y < 30 * mc.rect.height);
  if (!hit) continue;
  // a glued digit row ('789X') is centred (n - 1) / 2 columns right of mc:
  // the 7 key shares mc's column ('789' -> 1 column, '789X' -> 1.5)
  const c = text === '789*' ? (String(hit.text || '789').replace(/\s+/g, '').length - 1) / 2 : cols;
  if (stepX === undefined && c > 0) stepX = (hit.x - mc.x) / c;
  if (stepY === undefined && rows > 0) stepY = (hit.y - mc.y) / rows;
  uiv.log('grid anchor ' + JSON.stringify(hit.text) + ' at ' + Math.round(hit.x) + ',' + Math.round(hit.y), 'blue');
}
if (stepX === undefined || stepY === undefined) {
  throw new Error('no second keypad anchor readable — none of ' + MENU.map(a => a[0]).join(', ') + ' was recognised below-right of mc');
}

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
    fileName: 'DemoDesktopKeyboard.js',
    path: 'Browser plus Desktop Automation/DemoDesktopKeyboard.js',
    title: 'DemoDesktopKeyboard (JS)',
    code: `// Port of Classic/Real User Input/DemoXType.
// XType is uiv.desktop.keyboard.type: real OS keystrokes. Unlike uiv.browser.type it
// reaches things outside the page — here the browser's own Save dialog, which
// is not part of the DOM and cannot be automated any other way.
const x = uiv.desktop;

// the keystrokes go to whatever window has focus, so the browser must be in
// front — that is a browser-level action, not something page JS can do
uiv.window.focus();
uiv.goto('https://ui.vision/demo/xtype');

// open the browser's save dialog with the platform shortcut. A key combo is
// modifiers plus ONE key: the key can be a name (KEY_S, KEY_ENTER, KEY_F5 …)
// or simply the character itself as the last member — '\${KEY_CTRL+s}' is
// the same keystroke as '\${KEY_CTRL+KEY_S}', and '\${KEY_CTRL+-}' zooms a
// page out where no name would be obvious. Lower case: 'S' would add Shift.
const isMac = uiv.getVar('!OS') === 'mac';
x.type(isMac ? '\${KEY_CMD+s}' : '\${KEY_CTRL+s}');

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

uiv.log('DemoDesktopKeyboard (JS) completed — check your download folder', 'green');
`
  },
  {
    fileName: 'DemoDesktopWheel.js',
    path: 'Browser plus Desktop Automation/DemoDesktopWheel.js',
    title: 'DemoDesktopWheel (JS)',
    code: `// Real OS mouse wheel: uiv.desktop.mouse.wheel(deltaX, deltaY) scrolls whatever
// sits under the OS pointer — a page, a native app, a PDF viewer. Playwright
// names and argument order; deltas are input pixels, positive = down / right.
// Windows and Linux turn them into whole wheel notches (100 px each, fractions
// carried to the next call), macOS sends pixel events; OS settings and the
// receiving app decide the final distance. So this demo checks direction and
// movement, never an exact number. Needs Ui.Vision for Desktop 2.1.38+.
// uiv.browser.mouse.wheel(deltaX, deltaY) is the browser-only twin (Chromium
// debugger input, no desktop app) — see Browser Vision (Chrome, Edge)/DemoScrolling.js.
uiv.goto('https://ui.vision/demo/webtest/');
uiv.evaluate(\`document.title = 'Ui.Vision desktop wheel demo';
document.body.innerHTML = '<h1>Desktop wheel demo</h1><p>The panel below scrolls from real OS wheel input at the pointer.</p><div id="panel" style="width:400px;height:200px;overflow:auto;border:2px solid #333"><div style="width:1200px;height:1400px;background:linear-gradient(#fff,#88f)">Start here</div></div>';
document.body.style.cssText = 'font:18px system-ui;margin:30px;background:white;color:#17253a';
window.scrollTo(0, 0);\`);
// the wheel goes to the window under the pointer, so the browser must be in
// front — a browser-level action, like the Save dialog in DemoDesktopKeyboard
uiv.window.focus();
const mouse = uiv.desktop.mouse;
// a DOM match carries the viewport-to-screen mapping, so the OS pointer lands
// on the panel wherever the browser window is
mouse.move(uiv.$('#panel'));
function pos() { return uiv.evaluate('var p = document.querySelector("#panel"); return {x: p.scrollLeft, y: p.scrollTop}'); }

mouse.wheel(0, 300);            // down
uiv.sleep(600);                 // the call returns when the input is sent; the page still animates
const down = pos();
if (down.y <= 0) throw new Error('the vertical wheel did not reach the panel (scrollTop ' + down.y + ')');

mouse.wheel(200, 0);            // right
uiv.sleep(600);
const right = pos();
if (right.x <= 0) throw new Error('the horizontal wheel did not reach the panel (scrollLeft ' + right.x + ')');

mouse.wheel(-200, -300);        // both axes back at once
uiv.sleep(600);
const back = pos();
if (back.x >= right.x || back.y >= down.y) throw new Error('the reverse wheel went the wrong way: ' + JSON.stringify(back));

uiv.log('DemoDesktopWheel (JS) completed — down ' + Math.round(down.y) + ' px, right ' + Math.round(right.x) + ' px, back to ' + Math.round(back.x) + '/' + Math.round(back.y), 'green');
`
  },
  {
    // NOT a port — a new demo, born as JS. The one desktop-automation demo
    // that runs for every user out of the box: no image files (nothing to
    // break on a different DPI or theme), no OCR, no coordinates, no AI —
    // and it works in Chrome, Edge AND Firefox, on Windows and macOS.
    fileName: 'OpenBrowserDevTools.js',
    path: 'Browser plus Desktop Automation/OpenBrowserDevTools.js',
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
uiv.goto('https://ui.vision/demo/xtype');
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
    if (uiv.evaluate('return document.title') === GREETING) { return true; }
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
  const before = uiv.evaluate('return window.innerHeight');
  x.type(toggleDevTools);
  uiv.sleep('2s');
  // VERIFY rather than announce: closing DevTools gives the page its space
  // back, so innerHeight grows. Saying "closed" without checking is how this
  // step shipped broken once already.
  const after = uiv.evaluate('return window.innerHeight');
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
    path: 'Browser plus Desktop Automation/ClearSidebarLogViaGUI_local_ocr.js',
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
const CLEAR_LOG_MERGED = 'Cl' + 'e*r*g*'; // same button when OCR merges the two words

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
// uiv.window.rect() and not window.screenX: on Wayland the compositor
// hides window positions and screenX/screenY read 0 — an area built from
// them slides to the screen corner and OCRs the desktop's top bar instead
// of the panel. uiv.window.rect() measures the true position everywhere.
const AREA = uiv.window.rect();

// This demo is about LOCAL OCR, so every read pins the cross-platform
// built-in reader — the configured default engine may be a cloud or AI
// reader, and the demo must test the same engine on every OS.
const ENGINE = 'builtin';

// One word is enough now. The tab row sits at the TOP of the panel, and the
// only other 'Data' the window can show is in the log list or this macro's
// own source below it — so take the topmost match.
const dataTab = uiv.ocr.findTexts(DATA, { scope: 'desktop', area: AREA, engine: ENGINE, timeout: 15 })
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
  let ms = uiv.ocr.findTexts(CLEAR_LOG, { scope: 'desktop', area: AREA, engine: ENGINE, required: false, timeout: required ? 10 : 5 });
  if (!ms.length) {
    // OCR often LOSES the space and merges 'Clear log' into one token
    // ('Clearlog', 'Clear1og' — the Linux local engine does this, measured
    // live). A two-word query cannot match a merged token however good its
    // wildcards, so bridge the word boundary in a second pass.
    ms = uiv.ocr.findTexts(CLEAR_LOG_MERGED, { scope: 'desktop', area: AREA, engine: ENGINE, required: required, timeout: 5 });
  }
  return ms.length ? ms.sort((a, b) => (b.x + b.y) - (a.x + a.y))[0] : null;
};
let btn = clearButton(false);
if (!btn) {
  // No button on screen: the Data tab remembered another sub-tab (Shots,
  // CSV, Visual). Only NOW is searching the sub-tab word safe — without
  // the log list, the topmost occurrence in the panel IS the sub-tab.
  const logsTab = uiv.ocr.findTexts(LOGS, { scope: 'desktop', area: AREA, engine: ENGINE, timeout: 10 }).sort((a, b) => a.y - b.y)[0];
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
    path: 'Browser plus Desktop Automation/ClearSidebarLogViaGUI_local_imagesearch.js',
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
    // Match-ordering contract test: with five IDENTICAL targets, finders
    // must report matches in reading order or macros cannot address "the
    // 3rd button". Fully self-contained (fixture drawn by the macro,
    // pattern captured at runtime) — nothing external to maintain.
    fileName: 'OrderingCheck_image_and_ocr.js',
    path: 'Browser plus Desktop Automation/OrderingCheck_image_and_ocr.js',
    title: 'OrderingCheck_image_and_ocr (JS)',
    code: `// Ordering check: FIVE IDENTICAL buttons and FIVE IDENTICAL words on one
// page — the finders must return their matches in READING ORDER (left to
// right), or "click the 3rd match" would hit a random element. The page
// itself is the referee: every button and word records a real OS click
// with its own index, so the test proves both the ordering AND that the
// click landed on the element the ordering promised. Everything is
// built-in: the fixture is drawn by the macro, the image pattern is
// captured at runtime with uiv.shot.area — no image files to maintain.
uiv.goto('https://ui.vision/');
uiv.window.resize(1024, 640);

uiv.evaluate(
  "var d = document; d.body.innerHTML = '';" +
  "d.body.style.cssText = 'margin:0;background:#f4f0e8';" +
  "var wrap = d.createElement('div');" +
  "wrap.id = '__ordering_fixture';" +
  "wrap.style.cssText = 'position:fixed;inset:0;background:#f4f0e8;z-index:99999';" +
  "d.body.appendChild(wrap);" +
  "window.__hitButton = null; window.__hitWord = null;" +
  "for (var i = 0; i < 5; i++) { (function (idx) {" +
  "  var b = d.createElement('div');" +
  "  b.style.cssText = 'position:absolute;top:120px;left:' + (60 + idx * 170) + 'px;width:110px;height:52px;background:#2456c8;border:4px solid #142f70;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font:700 18px sans-serif';" +
  "  b.textContent = 'OK';" +
  "  b.addEventListener('mousedown', function () { window.__hitButton = idx; });" +
  "  wrap.appendChild(b); })(i); }" +
  "for (var j = 0; j < 5; j++) { (function (idx) {" +
  "  var w = d.createElement('span');" +
  "  w.style.cssText = 'position:absolute;top:320px;left:' + (60 + idx * 170) + 'px;color:#111;font:600 26px Arial,Helvetica,sans-serif;letter-spacing:1px';" +
  "  w.textContent = 'TARGET';" +
  "  w.addEventListener('mousedown', function () { window.__hitWord = idx; });" +
  "  wrap.appendChild(w); })(j); }" +
  "window.__btnRect = function () {" +
  "  var r = wrap.children[0].getBoundingClientRect();" +
  "  return { x: Math.round(r.x) - 6, y: Math.round(r.y) - 6, w: Math.round(r.width) + 12, h: Math.round(r.height) + 12 }; };" +
  "return 'fixture ready'");
uiv.sleep('500ms');

// Searches are RESTRICTED to the browser window: this demo asserts EXACT
// match counts, and any other window showing the same word breaks that —
// measured live with a chat window whose text contained TARGET (7 matches
// instead of 5). uiv.window.rect() is truthful on every platform.
const WIN = uiv.window.rect();

// Part 1: IMAGE ordering. The pattern is button #1, captured live.
const b0 = uiv.evaluate('return window.__btnRect()');
const pat = uiv.shot.area({ x: b0.x + b0.w / 2, y: b0.y + b0.h / 2, rect: { left: b0.x, top: b0.y, width: b0.w, height: b0.h }, width: b0.w, height: b0.h }, 'ordering_button_pattern');
const patName = (pat && pat.name) ? pat.name : String(pat);
const btns = uiv.findImages(patName, { scope: 'desktop', minScore: 0.85, area: WIN });
if (btns.length !== 5) throw new Error('IMAGE ORDERING: expected 5 matches, got ' + btns.length);
for (let i = 1; i < 5; i++) {
  if (btns[i].x <= btns[i - 1].x) throw new Error('IMAGE ORDERING: matches not left-to-right: ' + btns.map(b => Math.round(b.x)).join(','));
}
uiv.desktop.mouse.click(btns[2]);
uiv.sleep('300ms');
const hitBtn = uiv.evaluate('return window.__hitButton');
if (hitBtn !== 2) throw new Error('IMAGE ORDERING: clicked match #3, page reports button ' + (hitBtn === null ? 'NONE' : hitBtn + 1) + ' was hit');
uiv.log('image ordering OK - 5 matches left-to-right, 3rd click hit button 3', 'green');

// Part 2: OCR ordering. Five identical words, click the 3rd.
const words = uiv.ocr.findTexts('TARGET', { scope: 'desktop', timeout: 15, area: WIN });
if (words.length !== 5) throw new Error('OCR ORDERING: expected 5 matches, got ' + words.length);
for (let i = 1; i < 5; i++) {
  if (words[i].x <= words[i - 1].x) throw new Error('OCR ORDERING: words not left-to-right: ' + words.map(w => Math.round(w.x)).join(','));
}
uiv.desktop.mouse.click(words[2]);
uiv.sleep('300ms');
const hitWord = uiv.evaluate('return window.__hitWord');
if (hitWord !== 2) throw new Error('OCR ORDERING: clicked match #3, page reports word ' + (hitWord === null ? 'NONE' : hitWord + 1) + ' was hit');
uiv.log('ocr ordering OK - 5 matches left-to-right, 3rd click hit word 3', 'green');

uiv.log('OrderingCheck PASSED - image and OCR matches arrive in reading order and Nth-match clicks land on the Nth element', 'green');`,
  },
  {
    // uiv.findColor's browser-scope demo. Color is the ONE thing the other
    // finders cannot do for SOLID areas: template matching is deliberately
    // blind to flat patches (zero variance — see findImage's flat-pattern
    // error), OCR needs text, and a status LED has neither. This page builds
    // three LEDs and clicks the green one found by COLOR alone.
    fileName: 'DemoFindColor.js',
    path: 'Browser Vision (Chrome, Edge)/DemoFindColor.js',
    title: 'Find & click by color (JS)',
    code: `// uiv.findColor — find SOLID color areas (status LEDs, progress fills,
// color-coded badges), the one target class pixels-by-picture and OCR both
// miss: a flat patch has no structure to match and no text to read.
// findColors returns every region of the color in READING order;
// findColor returns the LARGEST. {tolerance} absorbs anti-aliasing and
// theme shifts.
if (uiv.getVar('!BROWSER') === 'firefox') {
  uiv.exit('This demo clicks with trusted CDP input (uiv.browser.*), which Firefox does not support — Chrome/Edge only. uiv.findColor itself works on Firefox; pair it with uiv.desktop.mouse.click and the XModule instead.');
}
uiv.goto('https://ui.vision/');
uiv.window.resize(1024, 640);

// three status LEDs — grey (off), red (error), green (ok) — plus a strip of
// five identical red dots for the ordering check; every dot records clicks
uiv.evaluate(\`
var d = document;
d.body.innerHTML = '';
var wrap = d.createElement('div');
wrap.style.cssText = 'position:fixed;inset:0;background:#ffffff;z-index:99999;font:600 16px sans-serif;color:#333';
d.body.appendChild(wrap);
window.__ledHit = null; window.__dotHit = null;
function led(name, x, color) {
  var e = d.createElement('div');
  e.style.cssText = 'position:absolute;left:' + x + 'px;top:120px;width:46px;height:46px;border-radius:50%;background:' + color;
  e.addEventListener('mousedown', function () { window.__ledHit = name; });
  wrap.appendChild(e);
  var l = d.createElement('div');
  l.style.cssText = 'position:absolute;left:' + x + 'px;top:175px;width:46px;text-align:center;font-size:12px';
  l.textContent = name;
  wrap.appendChild(l);
}
led('off', 120, '#b2bec3');
led('error', 240, '#d63031');
led('green', 360, '#27ae60');
for (var i = 0; i < 5; i++) {
  (function (idx) {
    var e = d.createElement('div');
    e.style.cssText = 'position:absolute;left:' + (120 + idx * 90) + 'px;top:320px;width:24px;height:24px;border-radius:50%;background:#d63031';
    e.addEventListener('mousedown', function () { window.__dotHit = idx; });
    wrap.appendChild(e);
  })(i);
}
return 'ready';\`);
uiv.sleep('500ms');

// 1. click the GREEN LED — found by color, no image file, no OCR
const green = uiv.findColor('#27ae60', { tolerance: 12 });
uiv.log(\`green LED found at \${green.x},\${green.y} (\${green.rect.width}x\${green.rect.height}px)\`, 'blue');
uiv.browser.click(green);
uiv.sleep('300ms');
if (uiv.evaluate('return window.__ledHit') !== 'green') {
  throw new Error('the click did not land on the green LED (page recorded: ' + uiv.evaluate('return window.__ledHit') + ')');
}
uiv.log('green LED clicked — verified by the page', 'green');

// 2. ordering: five identical red dots, click the 3rd — findColors returns
// reading order, so [2] IS the third on screen
const dots = uiv.findColors('#d63031', { tolerance: 12, minWidth: 8, minHeight: 8 });
uiv.log(\`red regions found: \${dots.length}\`, 'blue');
if (dots.length !== 6) { // 5 dots + the red LED above
  throw new Error('expected 6 red regions (5 dots + the red LED), found ' + dots.length);
}
// the five dots sit on the LAST row — take the bottom five, click the 3rd
const row = dots.slice(-5);
uiv.browser.click(row[2]);
uiv.sleep('300ms');
if (uiv.evaluate('return window.__dotHit') !== 2) {
  throw new Error('clicked the 3rd red dot but the page recorded index ' + uiv.evaluate('return window.__dotHit'));
}
uiv.log('3rd red dot clicked — findColors is in reading order', 'green');
uiv.log('DemoFindColor completed', 'green');`
  },
  {
    // uiv.findColor's desktop-scope demo: click the panel's own AI Chat tab
    // by the golden color of its sparkle emoji — no image file, no OCR of
    // the label. The gold is the ONLY color of its kind in the Ui.Vision UI,
    // and emoji golds sit close enough across Windows/macOS/Linux emoji
    // fonts (#FFC83D / gradient golds / #FDD835) for one tolerant match.
    fileName: 'DemoFindColor_StarTab.js',
    path: 'Browser plus Desktop Automation/DemoFindColor_StarTab.js',
    title: 'DemoFindColor — click the star tab (JS)',
    code: `// uiv.findColor at DESKTOP scope: click the AI Chat tab in the side panel
// by the golden color of its sparkle. Run FROM the side panel with the
// Desktop Automation module installed.
//
uiv.setVar('!CAPTURE_HIDE_GUI', false); // captures must SHOW the panel
const x = uiv.desktop;
uiv.window.focus();
const WIN = uiv.window.rect();

// Self-check marker: the editor follows the EXECUTING line, so the marker
// must sit right here to be on screen during the scan below. Its whole
// point: visible now (Macro tab shows this source), gone after the star
// click switches the panel to the AI Chat tab.
const FINDCOLORDEMOMARKER = 1;
const before = uiv.ocr.findTexts('FINDCOLORDEMO*', { scope: 'desktop', area: WIN, timeout: 15 });
if (!before.length) throw new Error('self-check failed: the macro source (with its marker) is not readable on screen — run this demo FROM the side panel');
void FINDCOLORDEMOMARKER;

// The panel's tab bar: the top region of the PANEL's column — restricted so
// page content and the AI view's yellow card stay out of the color search.
// The column is NOT a fixed side of the window: Chrome docks the side panel
// on the right, Firefox docks its sidebar on the LEFT (a right-hand strip
// missed the tab bar entirely there, measured live). The marker just found
// sits in the panel's own editor, so its x pins the column wherever it is;
// the 80px back-off covers the editor gutter left of the source text.
const panelLeft = Math.min.apply(null, before.map((m) => m.rect.left));
const BAR = { x: panelLeft - 80, y: WIN.y, width: 470, height: 280 };

// The gold body color of the sparkle emoji. Linux/Noto draws it #FDD835;
// Windows Segoe and macOS golds are within the tolerance.
const stars = uiv.findColors('#FDD835', { scope: 'desktop', tolerance: 50, area: BAR, minWidth: 5, minHeight: 5 });
uiv.log('golden stars in the tab bar: ' + stars.length, 'blue');
if (!stars.length) throw new Error('no golden star found in the panel tab bar');

// reading order: the Macro tab's star comes first, the AI Chat tab's star is
// the RIGHTMOST — click that one
x.click(stars[stars.length - 1]);
uiv.sleep('1500ms');

const after = uiv.ocr.findTexts('FINDCOLORDEMO*', { scope: 'desktop', area: WIN, required: false, timeout: 5 });
if (after.length) throw new Error('the panel still shows this macro source — the star click did not switch to the AI Chat tab');
uiv.log('AI Chat tab opened by clicking its star — found by COLOR alone', 'green');

// leave things as found: the Macro tab's star brings its view back
const back = uiv.findColors('#FDD835', { scope: 'desktop', tolerance: 50, area: BAR, minWidth: 5, minHeight: 5, required: false });
if (back.length) { x.click(back[0]); uiv.sleep('800ms'); }
uiv.log('DemoFindColor_StarTab completed', 'green');`
  },
  {
    // The desktop app's own Dino demo (xmodule2/app/macros/Play Chrome Dino
    // Game.d.js), embedded by scripts/sync_app_demos.js so the extension's
    // demo restore writes the SAME file the app seeds. It replaced the
    // extension-born "Play Offline Dino Game" v83 on 2026-09-10 (two dino
    // demos of different generations sat side by side in this folder).
    fileName: "Play Chrome Dino Game.d.js",
    path: "Desktop App (high speed)/Play Chrome Dino Game.d.js",
    title: "Play Chrome Dino Game 🦖 (JS, runs in the app)",
    code: `"use desktop-app";
// Check before opening a page or sending input, including on older app builds.
if (typeof uiv.requireAppVersion !== 'function') throw new Error('This macro requires Ui.Vision Desktop 2.1.10 or newer. Update Ui.Vision for Desktop and restart it.');
uiv.log('XModule ' + uiv.requireAppVersion('2.1.10'));

// Chrome Dino (chrome://dino), controlled only through desktop pixels and keys.
// Requires XModule 2.1.10+ and a capture backend with presentation timestamps.
// Warm the source, measure the sprite's unit ruler, then read the ink probe,
// obstacle band and lift-off probe from one retained picture. Control uses
// median obstacle motion measured over multiple frames; the speed formula is
// only a startup prior. Day/night changes, ducking and fast drops are handled
// in this demo. The separately tuned Wayland variant retains its own controller.
var TARGET = 2000;          // pass = screen-read score >= TARGET (10000 until 2026-09-09: too long a demo)
var callArgs = uiv.args || {}, callContext = uiv.context || {};
var MAX_S = callArgs.durationSeconds === undefined ? 180 : Number(callArgs.durationSeconds);
if (!(MAX_S > 0 && MAX_S <= 3600)) throw Error('durationSeconds must be between 0 and 3600');
// Retry fresh score captures through the game's flashing achievement digits.
// Zero keeps a single read. These are score verification options, not gameplay timing.
var scoreReadRetries = callArgs.scoreReadRetries === undefined ? 8 : Number(callArgs.scoreReadRetries);
if (!Number.isInteger(scoreReadRetries) || scoreReadRetries < 0 || scoreReadRetries > 40) throw Error('scoreReadRetries must be an integer between 0 and 40');
var INKS = ['#535353', '#808080', '#ACACAC']; // day ink, inversion fade, night ink
var TOL = 40;            // the tuned value; furniture is handled explicitly, no need to widen
var LEAD = 0.17;            // s before the obstacle reaches the dino when we press
var ALLOW_DROP = true;     // release Down after landing; exclude the ducking sprite from the band
var MIN_FRAME_MS = 0;      // capture:'new' already waits for the next available image
var STOP_HINT = uiv.getVar('!OS') === 'linux' ? ' (Top left corner to stop)' : ' (Top left corner or ESC to stop)'; // Linux has no key-state read, only the corner stops a run there
uiv.banner('Chrome Dino: target ' + TARGET + ' points. Keep the course visible.' + STOP_HINT, { seconds: 6 });
var inkIdx = 0;
function now() { return Date.now(); }
function log(s, c) { uiv.log(s, c); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// --- ink-agnostic finder: tries the current ink first, then the others ---
var inkProbe = null, sensorArea = null, sensorCapture = null;
function scoreInk(idx) {
  var matches = scanInk(idx, inkProbe, {minWidth: 1, minHeight: Math.max(3, Math.round(6 * U))}, 'same');
  // Score strokes contain solid ink at fractional display scales, whereas
  // the one-pixel horizon can be entirely antialiased into another grey.
  // Reject a matching background, which fills the probe vertically.
  return matches.some(function(m){return m.rect.height < inkProbe.height * 0.75;});
}
function scanInk(idx, area, opts, capture) {
  var o = { scope: 'desktop', area: area, tolerance: TOL, timeout: 0, required: false };
  for (var k in opts) o[k] = opts[k];
  if (capture) o.capture = capture;
  return uiv.findColors(INKS[idx], o) || [];
}
function findInk(area, opts, quick) {
  // quick mode (the play loop): an empty band is normal, and a 3-ink band
  // probe costs 50ms right when a flickering bird needs 15ms frames. So an
  // empty band asks a TINY probe on the score strokes (always drawn, always
  // in the game's current ink) whether the ink is still ours; a day/night
  // inversion is caught within one frame that way. Waiting for the band to
  // be empty "long enough" instead lost a game at 1371pt/s: the bird stayed
  // invisible in the old ink for 600pt of travel (Windows, 2026-09-07).
  if (quick && inkProbe) {
    // Acquire one scene covering all probes, including synchronous backends
    // whose retained image covers only the requested region. No matches needed.
    scanInk(inkIdx, sensorArea, { minWidth: sensorArea.width + 1, minHeight: 1 }, 'new');
    sensorCapture = uiv.lastCapture();
    // Every frame: are the score strokes still in our ink? (a ~1ms probe). The
    // old rule probed only when the band was empty, and a FAR obstacle still
    // matching the fading ink kept the band "not empty" through the whole
    // day/night fade — the near obstacle, already recoloured, went invisible
    // and the dino ran into it. Night is a 12s episode (INVERT_FADE_DURATION),
    // so every run crosses two fades per 700 points.
    if (!scoreInk(inkIdx)) {
      for (var j = 1; j < INKS.length; j++) {
        var nidx = (inkIdx + j) % INKS.length;
        if (scoreInk(nidx)) { inkIdx = nidx; log('ink -> ' + INKS[nidx] + ' (score probe)'); break; }
      }
    }
    return scanInk(inkIdx, area, opts, 'same');
  }
  for (var i = 0; i < INKS.length; i++) {
    var idx = (inkIdx + i) % INKS.length;
    var mm = scanInk(idx, area, opts);
    if (mm.length) { if (idx !== inkIdx) { inkIdx = idx; log('ink -> ' + INKS[idx]); } return mm; }
  }
  return [];
}

// --- 1. the game window: front, on screen, known size ---
if (!callContext.area) {
  uiv.run('open', 'chrome://dino');
  uiv.window.focus();
  uiv.window.move(0, 30);
  uiv.window.resize(750, 620);
  uiv.sleep(300);
}
var WIN = callContext.area || uiv.window.rect();
log('window ' + JSON.stringify({ x: WIN.x, y: WIN.y, w: WIN.width, h: WIN.height }));
var FIELD = callContext.area || { x: WIN.x + 4, y: WIN.y + 130, width: WIN.width - 8, height: WIN.height - 140 };
var fieldRight = FIELD.x + FIELD.width;

function pressStart() {
  // click ON the game field to focus the page (the first click on an unfocused
  // window is swallowed: focus() came first), then Space to start.
  uiv.desktop.mouse.click(WIN.x + WIN.width * 0.45, WIN.y + WIN.height * 0.45);
  uiv.sleep(150);
  uiv.desktop.keyboard.press('Space');
}

// --- 2. Require real source timing before starting a scored game.
function banner(msg, c) { log(msg, c); uiv.banner(msg, {seconds: 5}); }
var warmUntil = now() + 3000, warmCapture;
do {
  scanInk(inkIdx, FIELD, {minWidth: FIELD.width + 1, minHeight: 1}, 'latest');
  warmCapture = uiv.lastCapture();
  if (typeof warmCapture.captureTimeMs === 'number') break;
  uiv.sleep(30);
} while (now() < warmUntil);
if (typeof warmCapture.captureTimeMs !== 'number') throw new Error('This demo needs presentation timestamps from the capture backend; see the Windows game-demo handover');

// fresh scored game: reload the page (address bar), then start
if (!callContext.area) {
  uiv.run('open', 'chrome://dino');
  uiv.sleep(600);
  uiv.window.focus();
}
banner('REAL PLAY: scored game starting (source-timed capture, target ' + TARGET + ')' + STOP_HINT, 'green');
pressStart();
var T_START = now();
uiv.sleep(1000);
log('scored game started', 'blue');

// --- 3. geometry: derive EVERYTHING from the running dino sprite. Its feet
// rest on the ground line, so the line and the unit ruler follow from the
// dino's own box — no separate horizon-line scan (that scan locked onto a
// transient blob during the "press space" fade and put the band 40px too high).
// Dino proportions (classic T-rex): top = line - 39.5u, feet = line + 6.6u.
uiv.sleep(600);                        // let the intro slide + "press space" fade finish
var U = 0, lineTop = 0, dinoTop = 0, dinoFront = 0, dinoBottom = 0;
var dinoScan = { x: FIELD.x, y: FIELD.y, width: 240, height: FIELD.height };
function measureDino() {
  var blobs = findInk(dinoScan, { minWidth: 30, minHeight: 20 });
  var d = null;
  for (var j = 0; j < blobs.length; j++) {
    var b = blobs[j];
    // the running dino: ~50px wide/tall, leftmost such blob. A narrow sliver
    // at the field's left edge (furniture) is excluded by the width floor.
    if (b.rect.height >= 30 && b.rect.height <= 90 && b.rect.width >= 30 && b.rect.width <= 90 && (!d || b.rect.left < d.rect.left)) d = b;
  }
  return d ? { top: d.rect.top, bottom: d.rect.top + d.rect.height, front: d.rect.left + d.rect.width, left: d.rect.left, h: d.rect.height } : null;
}
var m1 = null, m2 = null, tries = 0;
while (tries++ < 30) {
  m2 = measureDino();
  if (m1 && m2 && Math.abs(m2.top - m1.top) <= 3 && Math.abs(m2.front - m1.front) <= 4) break; // top/front are stable while running; height wobbles with the legs
  m1 = m2; m2 = null;
  uiv.sleep(90);
}
if (!m2) throw new Error('dino not found (or never settled) in the left field');
dinoTop = Math.min(m1.top, m2.top);
dinoBottom = Math.max(m1.bottom, m2.bottom);
dinoFront = Math.max(m1.front, m2.front);
var dinoH = dinoBottom - dinoTop, dinoW = Math.max(m1.front - m1.left, m2.front - m2.left);
// the unit from the dino's WIDTH (44 units): the running dino's box merges
// with the ground line below its feet, so the height read ~12% too large
// (U 1.28 instead of 1.14) — that lifted the band's top edge ~5 units and
// put head-height birds, which Win/Mac run under, inside the jump band
U = callContext.scale || dinoW / 44;
lineTop = Math.round(dinoTop + 39.5 * U);
log('geometry: dinoTop=' + dinoTop + ' dinoBottom=' + dinoBottom + ' dinoFront=' + dinoFront + ' dinoW=' + dinoW + ' line=' + lineTop + ' unit=' + U.toFixed(2) + 'pt (' + Math.round(now() - T_START) + ' ms after start)');
if (U < 0.6 || U > 3) throw new Error('implausible unit ruler ' + U.toFixed(2));

// the field's RIGHT edge is the GAME's, not the window's: a docked side panel
// (or any other pane) shares the browser window, and a window-wide band read
// the panel's content as obstacles and the score OCR read its log text
// ("[app] shot.area: saved …" came back as the score, Mac 2026-09-09). The
// horizon line is the one thing drawn across the whole canvas, so its
// longest run at lineTop ends where the canvas ends.
if (!callContext.area) try {
  var lineRuns = findInk({ x: FIELD.x, y: lineTop - 3, width: FIELD.width, height: 8 }, { minWidth: Math.round(60 * U), minHeight: 1 });
  var longestRun = null;
  for (var li = 0; li < lineRuns.length; li++) if (!longestRun || lineRuns[li].rect.width > longestRun.rect.width) longestRun = lineRuns[li];
  if (longestRun) {
    var lineRight = Math.round(longestRun.rect.left + longestRun.rect.width);
    if (lineRight < fieldRight - 12 * U) { log('field right edge ' + fieldRight + ' -> ' + lineRight + ' (the horizon line ends there — a side panel or another pane shares the window)', 'blue'); fieldRight = lineRight; }
  }
} catch (e) { log('field edge probe failed: ' + e.message, 'orange'); }

// the band ahead of the dino: from 3 units below the dino's head (high birds
// stay out) down to just above the line; from the dino's front to the field edge
var band = { x: Math.round(dinoFront + 2 * U), y: Math.round(lineTop - 37.5 * U), width: 0, height: Math.round(33.5 * U) };
band.width = Math.round(fieldRight - band.x);
var groundStrip = { x: band.x + 40, y: lineTop - 2, width: 260, height: 8 + Math.round(6 * U) };
// the ink probe: the current score strokes at the top right of the canvas
inkProbe = { x: fieldRight - 80 * U, y: Math.round(lineTop - 139 * U), width: Math.round(80 * U), height: Math.round(26 * U) };
var liftTop = Math.max(FIELD.y, dinoTop - 140 * U);
var liftProbe = { x: Math.round(dinoFront - 42 * U), y: Math.round(liftTop), width: Math.round(40 * U), height: Math.round(dinoTop - 4 * U - liftTop) };
var sx = Math.min(band.x, inkProbe.x, liftProbe.x), sy = Math.min(band.y, inkProbe.y, liftProbe.y);
sensorArea = { x: sx, y: sy,
  width: Math.max(band.x + band.width, inkProbe.x + inkProbe.width, liftProbe.x + liftProbe.width) - sx,
  height: Math.max(band.y + band.height, inkProbe.y + inkProbe.height, liftProbe.y + liftProbe.height) - sy };
var minW = Math.max(3, Math.round(3 * U)), minH = Math.max(4, Math.round(4 * U));
log('band ' + JSON.stringify(band) + ' minBlob=' + minW + 'x' + minH);
// look-ahead: an obstacle enters at the band's far end and must be seen well
// before LEAD s — the game's top speed is ~13 units/frame (780 u/s)
var lookahead = band.width / U;
log('look-ahead ' + lookahead.toFixed(0) + ' units ahead of the dino = ' + (lookahead / 780).toFixed(2) + ' s at top speed' + (lookahead < 250 ? ' — TOO NARROW: obstacles enter too late; the game window must be at least 750 px wide' : ''), lookahead < 250 ? 'orange' : '');
if (lookahead < 150) throw new Error('game window too narrow: ' + lookahead.toFixed(0) + ' units of look-ahead (need 250+) — widen the browser window');
// FURNITURE suppression: anything in the band that sits at the SAME spot for
// 300ms while the game scrolls (>=8px per 20ms) is not an obstacle — a
// scrollbar glyph, a window border, side-panel ink. Remember it and skip it.
var FURN = [], fSamples = {}, fN = 0;
for (var fs = 0; fs < 12; fs++) {
  var fb = findInk(band, { minWidth: minW, minHeight: minH }, true); fN++;
  for (var fi = 0; fi < fb.length; fi++) { var fr = fb[fi].rect; var fk = fr.left + ',' + fr.top + ',' + fr.width + ',' + fr.height; fSamples[fk] = (fSamples[fk] || 0) + 1; }
  uiv.sleep(25);
}
for (var fk2 in fSamples) if (fSamples[fk2] >= fN - 2) { var fp = fk2.split(',').map(Number); FURN.push({ left: fp[0], top: fp[1], width: fp[2], height: fp[3] }); }
function isFurniture(r) { for (var q = 0; q < FURN.length; q++) { var f = FURN[q]; if (Math.abs(r.left - f.left) <= 2 && Math.abs(r.top - f.top) <= 2 && Math.abs(r.width - f.width) <= 2 && Math.abs(r.height - f.height) <= 2) return true; } return false; }
if (FURN.length) log('furniture in the band ignored: ' + FURN.map(function (f) { return f.left + ',' + f.top + ' ' + f.width + 'x' + f.height; }).join(' | '), 'grey');

// --- 4. the play loop ---
function speedModel(t) { return Math.min(13, 6 + 0.06 * t) * 60 * U; } // pt/s
var v = speedModel(0), vMeasured = 0, samples = 0;
var speedAnchor = null, speedSamples = [];
var prev = null;              // {left, t} of the nearest obstacle last frame
var frames = 0, jumps = 0, lastPress = -1, frozen = 0, emptySince = now(), lastLog = 0;
var scanMs = 0, over = false, reason = '', sightings = 0, downHeld = false, drops = 0, clearAt = 0, dropDone = true, dropAt = 0, touchingSince = 0, lastUnstick = 0;
var trace = [], TRACE_N = 160, frozenSince = 0, duckUntil = 0, ducks = 0, liftCheckAt = 0, represses = 0, dropUnstuck = true;
// lift-off probe: the strip above the standing dino's head; inked once it has risen ~8px
var tGameLast = 0;
var liftMiss = 0, lastLiftCaptureId = null, sourceTimed = 0;
function tr(ev) { trace.push(ev); if (trace.length > TRACE_N) trace.shift(); }
try {
while (true) {
  var tNow = now();
  if (tNow - T_START > MAX_S * 1000) { reason = 'budget'; break; }
  var t0 = tNow;
  var blobs = findInk(band, { minWidth: minW, minHeight: minH }, true);
  var tScan = now(); scanMs += tScan - t0; frames++;
  var tMeas = sensorCapture.captureTimeMs;
  if (typeof tMeas !== 'number') throw new Error('Capture backend lost presentation timestamps; cannot continue this timing-sensitive demo');
  sourceTimed++;
  // Decide after sensing. A pre-scan tNow minus a mid-scan tMeas is negative
  // and incorrectly ADDS scan time to the available time before impact.
  tNow = tScan;
  // LIFT-OFF VERIFY: ~130ms after a jump press the dino must have risen. If the
  // strip above its head is still empty, the press was lost (portal/OS) or
  // ignored (game still in duck state): release Down and press again NOW.
  if (liftCheckAt && tNow >= liftCheckAt && !duckUntil && (!frozenSince || tNow - frozenSince < 250) && sensorCapture.captureId !== lastLiftCaptureId && tMeas >= lastPress + 90) {
    lastLiftCaptureId = sensorCapture.captureId;
    if (scanInk(inkIdx, liftProbe, { minWidth: 6, minHeight: 4 }, 'same').length) { liftCheckAt = 0; }
    else if (++liftMiss < 2) { liftCheckAt = tNow + 20; }          // confirm on a second frame (a stale frame is not a lost press)
    else {
      liftCheckAt = 0;
      var sincePressMs = Math.round(tNow - lastPress);
      if (downHeld) { uiv.desktop.keyboard.up('ArrowDown'); downHeld = false; }
      uiv.desktop.keyboard.press('ArrowUp'); lastPress = now(); represses++;
      tr(Math.round(tNow - T_START) + ' REPRESS (no lift-off seen)');
      if (represses <= 30) log('re-press #' + represses + ': no lift-off ' + sincePressMs + 'ms after the jump press — pressed again (t=' + tGameLast.toFixed(1) + 's)', 'orange');
    }
  }
  tNow = now();
  // nearest obstacle ahead: leftmost blob that is not the (fading) background
  var nearest = null;
  for (var q = 0; q < blobs.length; q++) {
    var r = blobs[q].rect;
    if (r.width > band.width * 0.5) continue;      // inverted/fading background
    if (r.left <= band.x + (downHeld ? 24 : 2) * U) continue;  // clipped at the dino; while ducking (Down held) the dino's own sprite reaches further right, so widen the exclusion
    if (r.left + r.width >= band.x + band.width - 3) continue;   // touching the band's RIGHT edge: window furniture (a static sliver there false-tripped the frozen check) or an obstacle still entering
    if (isFurniture(r)) continue;                                  // static ink measured before play (scrollbar glyph, border)
    if ((lineTop - (r.top + r.height)) / U >= 15 && r.width < 12 * U) continue;   // a small ELEVATED fragment (star, wing tip, cloud edge) is not an obstacle
    if (!nearest || r.left < nearest.left) nearest = r;
  }
  var tGame = (tNow - T_START) / 1000; tGameLast = tGame;
  var vModel = speedModel(tGame);
  // GHOST: an approaching obstacle that vanished for a few frames (a bird's
  // wing phase, a capture glitch) keeps moving at the measured speed for
  // up to 350ms, so the jump decision does not blink with the sprite
  var ghosted = false;
  if (!nearest && prev && tNow - prev.t < 350 && prev.left - v * (tNow - prev.t) / 1000 > dinoFront + 2 * U + 4) {
    nearest = { left: prev.left - v * (tMeas - prev.t) / 1000, width: prev.width, height: prev.height, top: prev.top };
    ghosted = true;
  }
  var touchBlob = null;
  for (var b3 = 0; b3 < blobs.length; b3++) { var r3 = blobs[b3].rect; if (r3.left <= band.x + 2 * U && r3.width < band.width * 0.5) touchBlob = r3; }
  var ev = Math.round(tNow - T_START) + ' n=' + blobs.length + (nearest ? (ghosted ? ' G=' : ' L=') + Math.round(nearest.left - dinoFront) + ' w=' + Math.round(nearest.width / U) + ' h=' + Math.round(nearest.height / U) : ' -') + (touchBlob ? ' T' + Math.round(touchBlob.width / U) + 'x' + Math.round(touchBlob.height / U) + '@' + Math.round((lineTop - touchBlob.top) / U) : '') + (downHeld ? ' D' : '');
  if (touchBlob && !downHeld) { touchingSince = touchingSince || tNow; } else { touchingSince = 0; }
  // un-stick: a blob glued to the dino for 400ms while we hold nothing is a
  // ducking sprite the game still thinks is held -> release again
  if (!duckUntil && touchingSince && tNow - touchingSince > 400 && tNow - lastUnstick > 400) { uiv.desktop.keyboard.up('ArrowDown'); lastUnstick = tNow; ev += ' UNSTICK'; }
  if (nearest) {
    emptySince = tNow;
    // Track the same obstacle over 70+ ms, then take a median of several
    // observations. One-frame quotients magnify timestamp quantisation and
    // sprite changes. The nominal speed formula is only a startup fallback.
    if (!ghosted) {
      if (!speedAnchor || nearest.left > speedAnchor.left + 20 || tMeas - speedAnchor.t > 350) {
        speedAnchor = {left: nearest.left, width: nearest.width, t: tMeas};
      } else if (tMeas - speedAnchor.t >= 70) {
        var measured = (speedAnchor.left - nearest.left) / ((tMeas - speedAnchor.t) / 1000);
        if (nearest.width > speedAnchor.width * 0.6 && nearest.width < speedAnchor.width * 1.7 && measured > vModel * 0.4 && measured < vModel * 2.3) {
          speedSamples.push(measured); if (speedSamples.length > 9) speedSamples.shift();
          var ordered = speedSamples.slice().sort(function(a,b){return a-b;});
          vMeasured = ordered[Math.floor(ordered.length / 2)]; samples++;
        }
        speedAnchor = {left: nearest.left, width: nearest.width, t: tMeas};
      }
    }
    // Repeated geometry is a scene observation, not proof of a browser freeze
    if (!ghosted && prev && nearest.left < prev.left && prev.left - nearest.left < vModel * 3 * (tMeas - prev.t) / 1000 + 4) {
      frozen = 0; frozenSince = 0;
    } else if (!ghosted && prev && nearest.left === prev.left && nearest.width === prev.width) {
      frozen++;
      if (!frozenSince) frozenSince = tNow;
      // Give a renderer pause or colour transition time to recover. Stop new
      // jump attempts after 250 ms unchanged, before a crash can auto-restart.
      if (tNow - frozenSince > 1000 && nearest.left - dinoFront < band.width * 0.6) { reason = 'scene unchanged for 1 second'; over = true; }
    } else {
      frozen = 0;
    }
    // Source-timed motion also handles renderer scale and acceleration that
    // differ from the nominal 60 Hz prior. Never use capture-id differences as time.
    v = speedSamples.length >= 3 ? vMeasured : vModel;
    // The source timestamp already accounts for repeat delivery and capture
    // processing. Do not add a second stale-position compensation.
    var dist = nearest.left - dinoFront;
    var observationAgeMs = Math.max(0, tNow - tMeas);
    var arrival = dist / v - observationAgeMs / 1000;
    if (!prev || nearest.left > prev.left + 20) {
      sightings++;
      if (sightings <= 8) log('obstacle #' + sightings + ' at d=' + Math.round(dist) + 'pt size=' + (nearest.width / U).toFixed(0) + 'x' + (nearest.height / U).toFixed(0) + 'u top=' + ((lineTop - nearest.top) / U).toFixed(0) + 'u above line, v=' + Math.round(v) + ' t=' + tGame.toFixed(1) + 's');
    }
    // lead policy: a TALL obstacle (large cactus, 50u) needs ~7 frames of
    // rise before contact -> press earlier; a WIDE one (cactus group) needs
    // the dino still high when its tail passes -> press later
    // lead policy: TALL (large cactus) and WIDE (cactus group) obstacles both
    // need the dino HIGHER for longer, so press EARLIER (more lead). The wider
    // the group the earlier — a 45u group jumped at the small-cactus lead clips
    // its far end at speed (measured on this rig, the 700-score wall).
    var wideU = nearest.width / U;
    // wide groups: press slightly EARLIER, not later. The dino is high for
    // ~400ms of a jump and a 46u group passes in ~60ms, so the only way to
    // lose is being late — which a capture stall makes likely at top speed
    // (the 3039-point run ended exactly so). Landing ON a group would need a
    // press >450ms early, which no lead here approaches.
    var lead = LEAD + (nearest.height > 30 * U ? 0.03 : 0) + (wideU > 40 ? 0.02 : 0) + (downHeld ? 0.02 : 0);
    // press when the obstacle is within the lead AND the dino can jump: on
    // the ground (landed = press+550ms, or drop+150ms after a fast drop).
    // A late press right after landing beats no press: a small cactus only
    // needs ~5 frames of rise.
    var landedAt = lastPress < 0 ? 0 : (dropAt > lastPress ? dropAt + 150 : lastPress + 550);
    // BIRDS: a pterodactyl at head height has its BOTTOM well above the line
    // (mid altitude ~25u; cacti and low birds sit at 0-8u, clipped by the band
    // edge to <=~10u). Jumping INTO a mid bird kills the dino — duck under it,
    // holding Down until its tail has passed. High birds never enter the band.
    var bottomU = (lineTop - (nearest.top + nearest.height)) / U;
    var midBird = bottomU >= 15 && nearest.width >= 18 * U;   // bird-sized (a pterodactyl is ~46u wide; wings clip it to >=18u)
    if (midBird) ev += ' b' + Math.round(bottomU);
    if (midBird && !downHeld && arrival <= 0.32 && arrival > -0.08) {
      uiv.desktop.keyboard.down('ArrowDown'); downHeld = true; dropAt = tNow;
      duckUntil = tNow + (Math.max(0, arrival) + (nearest.width + 46 * U) / v) * 1000 + 60;
      ducks++; ev += ' DUCK';
      if (ducks <= 20) log('duck #' + ducks + ' under a bird (bottom ' + bottomU.toFixed(0) + 'u above line, ' + (nearest.width / U).toFixed(0) + 'x' + (nearest.height / U).toFixed(0) + 'u) arrival=' + Math.round(arrival * 1000) + 'ms t=' + tGame.toFixed(1) + 's');
    }
    // A jump-key release can shorten a jump already in progress. Wait for
    // lift-off confirmation, and use the full scaled airborne region before
    // sending another press. Near landing a press can still be retried.
        if (!liftCheckAt && !scanInk(inkIdx, liftProbe, {minWidth:15*U,minHeight:18*U}, "same").length && !midBird && (!frozenSince || tNow - frozenSince < 250) && arrival <= lead && arrival > 0.03 && tNow - lastPress > 90) {
      // out of a duck: release, give the game one frame to un-duck (a
      // release and a jump in the same instant never jumped), then press
      // chrome://dino enters DUCK on landing from a speed-drop and only a Down
      // keyUp clears it; if our release came before the landing, the T-rex is
      // stuck ducking and IGNORES ArrowUp (the '!ducking' guard) — so before a
      // jump that follows a drop, release Down again, whatever we think we hold
      if (downHeld || dropAt > lastPress) { uiv.desktop.keyboard.up('ArrowDown'); downHeld = false; duckUntil = 0; uiv.sleep(18); ev += ' unduck'; }
      uiv.desktop.keyboard.press('ArrowUp');
      lastPress = now();
      liftCheckAt = lastPress + 130; liftMiss = 0;   // verify the press produced a jump (a lost or ignored press killed runs at ~750)
      ev += ' JUMP arr=' + Math.round(arrival * 1000) + '/' + Math.round(lead * 1000);
      dropDone = false;
      // when this obstacle's tail has passed the dino's back (44u sprite)
      clearAt = tNow + (Math.max(0, arrival) + (nearest.width + 46 * U) / v) * 1000;
      jumps++;
      if (jumps <= 400 || jumps % 10 === 0) log('jump #' + jumps + ' d=' + Math.round(dist) + 'pt v=' + Math.round(v) + 'pt/s (' + (v / (60 * U)).toFixed(1) + ' u/f) arrival=' + Math.round(arrival * 1000) + 'ms t=' + tGame.toFixed(1) + 's ' + (nearest.width / U).toFixed(0) + 'x' + (nearest.height / U).toFixed(0) + 'u' + (nearest.width > 40 * U ? ' wide' : ''));
    }
    if (!ghosted) prev = { left: nearest.left, width: nearest.width, height: nearest.height, top: nearest.top, t: tMeas };
  } else {
    if (prev && tNow - prev.t >= 350) prev = null;
    frozen = 0;
    if (tNow - emptySince > 3500) {
      // nothing for a while: is the ground still scrolling?
      var ch = uiv.desktop.waitChange(groundStrip, { timeout: 0.25, required: false });
      if (ch.timedOut) { reason = 'ground still'; over = true; } else emptySince = now();
    }
  }
  // FAST DROP: once the obstacle we jumped for is behind the dino and the
  // next one is not imminent, hold Down — the dino falls at 3x gravity and
  // lands early, which is what tight gaps at top speed need. Landing with
  // Down held ducks; released again 0.5s after the press or at the next jump.
  var sincePress = (tNow - lastPress) / 1000;
  var airborne = lastPress > 0 && sincePress < 0.6;
  var touching = false;
  for (var b2 = 0; b2 < blobs.length; b2++) {
    var rr = blobs[b2].rect;
    if (rr.left <= band.x + 2 * U && rr.width < band.width * 0.5) touching = true;
  }
  // drop only when the next obstacle leaves time to land (150ms) and rise
  // again (>=5 frames); nearer than that the current jump must carry us over
  // drop only into a clearly open path: no next obstacle, or the next one is
  // far enough that the dino can land, stand, and still jump it in time. Never
  // drop toward a TALL cactus that must be cleared by a clean jump.
  if (ALLOW_DROP && airborne && !downHeld && !dropDone && sincePress > 0.12 && tNow > clearAt + 20 && !touching && (!nearest || (nearest.left - dinoFront) / v > 0.25)) {
    uiv.desktop.keyboard.down('ArrowDown'); downHeld = true; dropDone = true; drops++; dropAt = tNow; dropUnstuck = false;
    ev += ' DROP +' + Math.round(sincePress * 1000) + 'ms clear+' + Math.round(tNow - clearAt);
  }
  // the drop lands within ~150ms (3x gravity from the apex): release Down
  // shortly after, so the dino ducks as briefly as possible
  if (downHeld && (duckUntil ? tNow > duckUntil : tNow - dropAt > 160)) { uiv.desktop.keyboard.up('ArrowDown'); downHeld = false; duckUntil = 0; ev += ' RELEASE'; }
  if (dropAt && !downHeld && !duckUntil && tNow - dropAt > 330 && !dropUnstuck) { uiv.desktop.keyboard.up('ArrowDown'); dropUnstuck = true; ev += ' UNSTUCK'; }   // landing from the drop is certain by now: clear a duck the game may have entered on landing
  if (frozen) ev += ' frozen' + frozen;
  tr(ev);
  // frame pacing (see MIN_FRAME_MS): keep frames at a cadence where obstacle
  // motion is several px, so the frozen check and speed sampler behave.
  var frameMs = now() - t0;
  if (frameMs < MIN_FRAME_MS) uiv.sleep(MIN_FRAME_MS - frameMs);
  if (over) break;
  if (tNow - lastLog > 10000) {
    lastLog = tNow;
    log('t=' + tGame.toFixed(0) + 's frames=' + frames + ' scan=' + (scanMs / frames).toFixed(1) + 'ms jumps=' + jumps + ' drops=' + drops + ' v=' + Math.round(v) + 'pt/s prior=' + Math.round(vModel) + ' samples=' + samples + ' ink=' + INKS[inkIdx]);
  }
}
} finally {
  if (downHeld) { uiv.desktop.keyboard.up('ArrowDown'); downHeld = false; }
}
var survived = (now() - T_START) / 1000;
log('run ended (' + reason + ') after ' + survived.toFixed(1) + 's, ' + frames + ' frames (' + (scanMs / frames).toFixed(1) + ' ms/scan), ' + jumps + ' jumps (' + represses + ' re-pressed), ' + drops + ' drops, ' + ducks + ' ducks; source-timed=' + sourceTimed, 'blue');
log('trace (last frames): ' + trace.join(' | '), 'grey');

// --- 5. the score: OCR the digit row (top right of the canvas) ---
uiv.sleep(300);
// Read only the rightmost current-score digits, excluding the persisted HI.
var scoreWidth = Math.round(80 * U);
var scoreArea = { x: fieldRight - scoreWidth, y: Math.round(lineTop - 139 * U), width: scoreWidth, height: Math.round(24 * U) };
uiv.shot.area({ x: FIELD.x, y: Math.round(lineTop - 136 * U), width: FIELD.width, height: Math.round(150 * U) }, 'dino_final.png');
// Native OCR first (upscaled 3x: pixel font). Every retry captures anew, so
// a blank phase of the achievement animation is not mistaken for unreadable text.
// Only then try the configured shared AI provider; never use HI as this run's score.
var text = '', groups = [], cleaned = '';
var engines = [null, 'aiprovider'];
for (var ei = 0; ei < engines.length && !groups.length; ei++) {
  var attempts = engines[ei] ? 1 : scoreReadRetries + 1;
  for (var attempt = 0; attempt < attempts && !groups.length; attempt++) {
    if (attempt) {
      log('current score missing; fresh OCR retry ' + attempt + '/' + scoreReadRetries);
      uiv.sleep(300);
    }
  try {
    var ro = { area: scoreArea, scope: 'desktop' };
    if (engines[ei]) ro.engine = engines[ei]; else ro.scale = 3;
    text = uiv.ocr.read(ro);
    // Defensively remove a labelled persisted high score BEFORE digit cleanup.
    // The normal crop excludes it, but an OCR engine may return it nonetheless.
    cleaned = String(text).replace(/\\bH[I1l|]\\s*[:=]?\\s*[0-9OoDQCcIlL|ZzSsFfGbB]{2,6}\\b/gi, '')
      .replace(/[OoDQCc]/g, '0').replace(/[IlL|]/g, '1').replace(/[Zz]/g, '2').replace(/[Ss]/g, '5').replace(/[FfGb]/g, '6').replace(/B/g, '8');
    groups = cleaned.match(/\\d{2,6}/g) || [];
    if (groups.length && engines[ei]) log('score read with engine ' + engines[ei] + ': "' + String(text).trim() + '"');
  } catch (e) {
    log('ocr (' + (engines[ei] || 'native engine') + ') failed: ' + e.message, 'orange');
    break; // Retrying blank frames helps; repeating a failed engine does not.
  }
  }
}
var score = groups.length ? parseInt(groups[groups.length - 1], 10) : -1;
// the game pads to 5 digits: a 6-digit read has a misread leading char
if (groups.length && groups[groups.length - 1].length > 5) score = parseInt(groups[groups.length - 1].slice(-5), 10);
// sanity: the clock bounds the score (about 1.5*(6t+0.03t^2) points)
var tMax = Math.min(survived, 117), est = 1.5 * (6 * tMax + 0.03 * tMax * tMax) + Math.max(0, survived - 117) * 19.5;
log('score OCR "' + String(text).trim() + '" -> ' + score + ' (time estimate ~' + Math.round(est) + ')');
// An unreadable score stays unreadable. A persisted HI belongs to another run
// and cannot be substituted as evidence that this run reached the target.
if (score >= 0 && score > est * 1.4 + 60) { log('OCR score implausible for ' + survived.toFixed(0) + 's — treating as unreadable', 'orange'); score = -1; }
uiv.setVar('dino_score', score);
if (score >= TARGET) log('PASS 🦖 score ' + score + ' (target ' + TARGET + ')', 'green');
else if (score < 0) log('score unreadable — survived ' + survived.toFixed(0) + 's (est. ' + Math.round(est) + ')', 'orange');
else log('FAIL: score ' + score + ' < ' + TARGET, 'red');

uiv.banner(score >= TARGET ? 'Dino complete: ' + score + ' points - target reached!' : 'Dino finished: ' + (score < 0 ? 'score unreadable' : score + ' points') + ' after ' + survived.toFixed(1) + ' seconds', { seconds: 5 });
uiv.sleep(5000);
if(typeof uiv.result==='function')uiv.result({score:score<0?null:score,elapsedSeconds:survived,reason:reason,targetReached:score>=TARGET});
`
  },
  {
    // The desktop app's Flappy Bird demo (xmodule2/app/macros/Play Flappy
    // Bird.d.js), embedded by scripts/sync_app_demos.js like the Dino demo.
    // Added 2026-09-11 with the ScreenCaptureKit capture on macOS.
    fileName: "Play Flappy Bird.d.js",
    path: "Desktop App (high speed)/Play Flappy Bird.d.js",
    title: "Play Flappy Bird 🐦 (JS, runs in the app)",
    code: `"use desktop-app";
// Check before opening a page or sending input, including on older app builds.
if (typeof uiv.requireAppVersion !== 'function') throw new Error('This macro requires Ui.Vision Desktop 2.1.10 or newer. Update Ui.Vision for Desktop and restart it.');
uiv.log('XModule ' + uiv.requireAppVersion('2.1.10'));

// Flappy Bird demo — pixel-only predictive control with native keyboard input.
// Opens https://ui.vision/demo/flappybird in the configured browser.
// Keep the full game visible at 100% zoom. One round, five-minute target.
// Five-minute Windows trial: app/dev/flappy/results/2026-09-13-windows.
// Mac retest 2026-09-15 (app 2.1.29): alive at 300 s, score 198, 3/3 with the merged
// revision; see app/dev/flappy/results/2026-09-15-mac. Windows/Linux retest pending.
// Source presentation timestamps and the original 60-Hz game size are required.
// Set OPEN_GAME=false to use an already-open foreground game in a chosen profile.
// No window.focus(): that can select a different instance of the same browser.
var callArgs = uiv.args || {}, callContext = uiv.context || {};
var OPEN_GAME = !callContext.area && callArgs.openGame !== false;
if (OPEN_GAME) { uiv.run('open', 'https://ui.vision/demo/flappybird'); uiv.sleep(2500); }
var GAMES = 1, MAX_S = callArgs.durationSeconds === undefined ? 300 : Number(callArgs.durationSeconds);
if (!(MAX_S > 0 && MAX_S <= 3600)) throw Error('durationSeconds must be between 0 and 3600');
var STOP_HINT = uiv.getVar('!OS') === 'linux' ? ' (Top left corner to stop)' : ' (Top left corner or ESC to stop)'; // Linux has no key-state read, only the corner stops a run there
uiv.banner('Flappy Bird: aiming for ' + MAX_S + ' seconds. Keep the full game visible.' + STOP_HINT, { seconds: 6 });
var BIRD='#f8b733', BIRD2='#e0802c', PIPE='#00a800', PIPE2='#80d010', SKY='#71c5cf';
// The display's colour profile decides what these sprite colours look like on
// screen: one Windows rig renders the pipe body #00a800 as #52a527 (82 per
// channel away) and the sky #71c5cf as #8ac3ce. With uiv.pixels (XModule
// 2.1.26+) the demo samples the real rendering of the sky, the bird and the
// first pipe and searches for those colours; older builds keep the nominals.
var CALIBRATE = typeof uiv.pixels === 'function', pipeCalibrated = !CALIBRATE;
function rgb(hex){ return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]; }
function chDist(a,b){ var p=rgb(a),q=rgb(b); return Math.max(Math.abs(p[0]-q[0]),Math.abs(p[1]-q[1]),Math.abs(p[2]-q[2])); }
// The most common sampled colour near the nominal one, or null when the sample
// does not contain that sprite (share below minShare, or nothing within reach).
function observedColor(sample, nominal, minShare) {
  var counts={}, best=null, bestD=1e9;
  for (var i=0;i<sample.colors.length;i++) counts[sample.colors[i]]=(counts[sample.colors[i]]||0)+1;
  for (var c in counts) { if (counts[c] < sample.colors.length*minShare) continue; var d=chDist(c,nominal); if (d<bestD){bestD=d;best=c;} }
  return best!==null && bestD<=120 ? best : null;
}
function sampleRect(x,y,w,h,capture){ return uiv.pixels({x:x,y:y,width:w,height:h},{scope:'desktop',capture:capture||'latest'}); }
var SPR_RIGHT=14, PIPE_EXTRA_RIGHT=2, GAP_H=170, PIPE_W=60, TRACK_H=180;
var SPR_LEFT=4;             // source sprite: yellow starts at (4,4), body is 34x24
// Physics priors for this fixture at its original CSS size (points, seconds).
// Pipe speed is re-estimated from capture timestamps during each run.
var G=1440, V0=-348, SPEED=120;
// The priors above are for the game's own 360x640 internal canvas. On screen
// the board is drawn larger by page zoom / HiDPI, so gravity, impulse, speed
// and every sprite length scale by screen px per canvas px. That scale is the
// measured board width over 360, derived once the field is known (below) — the
// same way Dino measures its unit from the T-rex sprite. No caller passes the
// canvas size; 360x640 is the game's fixed resolution, browser or standalone.
var CANVAS_W=360, CANVAS_H=640, PIXEL_SCALE=1, scaleApplied=false;
function applyScale(s){
  if(scaleApplied)return; scaleApplied=true; PIXEL_SCALE=s;
  G*=s;V0*=s;SPEED*=s;
  SPR_RIGHT*=s;SPR_LEFT*=s;PIPE_EXTRA_RIGHT*=s;GAP_H*=s;PIPE_W*=s;TRACK_H*=s;
}
// Delay until a native pulse is visible in the captured scene, including the
// browser/compositor pipeline BEFORE the capture's presentation timestamp.
// captureAgeMs alone is not end-to-end paint/input latency. Keep the Mac prior
// for startup, then fit recent pixel flights to track the renderer delay.
var VISIBLE_INPUT_MS=35;
function median(a){ var b=a.slice().sort(function(x,y){return x-y;}); return b[Math.floor(b.length/2)]; }
// Fit only complete, consistent flights; reject too few samples and outliers.
function fitFlightDelay(samples, gravity, impulse) {
  if(samples.length<5 || samples[samples.length-1].t-samples[0].t<0.08)return null;
  var mt=0,my=0;for(var i=0;i<samples.length;i++){mt+=samples[i].t;my+=samples[i].y-0.5*gravity*samples[i].t*samples[i].t;}mt/=samples.length;my/=samples.length;
  var xx=0,xy=0;for(var i=0;i<samples.length;i++){var dt=samples[i].t-mt;xx+=dt*dt;xy+=dt*(samples[i].y-0.5*gravity*samples[i].t*samples[i].t-my);}
  var slope=xy/xx,error=0;for(var i=0;i<samples.length;i++){var e=samples[i].y-0.5*gravity*samples[i].t*samples[i].t-my-slope*(samples[i].t-mt);error+=e*e;}
  var delay=(impulse-slope)/gravity*1000;
  if(Math.sqrt(error/samples.length)>2 || delay<15 || delay>140)return null;
  return delay;
}
// Multiple presentations smooth quantization and uneven frame delivery.
function fitFlightVelocity(samples, at, gravity) {
  if(samples.length<3 || samples[samples.length-1].t-samples[0].t<0.045)return null;
  var mt=0,my=0;for(var i=0;i<samples.length;i++){var t=samples[i].t-at;mt+=t;my+=samples[i].y-0.5*gravity*t*t;}mt/=samples.length;my/=samples.length;
  var xx=0,xy=0;for(var i=0;i<samples.length;i++){var t=samples[i].t-at,dt=t-mt;xx+=dt*dt;xy+=dt*(samples[i].y-0.5*gravity*t*t-my);}
  return xx>0?xy/xx:null;
}
function flap(){ uiv.desktop.keyboard.down('Space'); uiv.sleep(30); uiv.desktop.keyboard.up('Space'); }
// A column is one pipe wide, but its blobs need not reach both edges: the
// dark body stripes of the mirrored top and bottom pipes cover only the
// middle of the width, and the caps' dark parts render 21 or 46 px wide
// depending on the pipe's screen position (measured on the Mac, stable for
// the life of a pipe). Judged on the blobs' extent alone, a 37 px column was
// treated as passed 22 px early and the bird flew into its cap. Grow each
// side by the missing width, at most a quarter pipe: a column clipped by the
// field's edge (its blob extent shrinks as it leaves) then keeps a bounded
// extent that moves with its remaining blobs instead of sticking to the edge.
// A column clipped at the field's LEFT edge has an unknown extent: growing it
// from its shrinking width pinned its right edge to left edge + pipe width for
// 150 ms (five frames at 723 while the pipe moved 721 -> 706), the planner
// held the corridor's floor that long, forced a flap and the bird left the
// corridor rising into a 232 px drop. Such a column keeps its blobs' left and
// grows on the right by the deficit measured while it was whole (clipDef, fixed
// when the column clips the edge: the NEXT column's deficit once moved a passed
// column's right edge back over the bird and forced an emergency flap).
function sizeColumns(cols, pipeW, fieldLeft, clipDef) {
  for(var j=0;j<cols.length;j++){ var bl=cols[j].left, br=cols[j].right; cols[j].mw=br-bl; cols[j].whole=bl>fieldLeft+2;
    if(!cols[j].whole){ cols[j].right=br+clipDef; continue; }
    var grow=Math.min(Math.max(0,pipeW-(br-bl)),pipeW/4); cols[j].left=bl-grow; cols[j].right=br+grow; }
  return cols;
}
function fo(extra){ var o={scope:'desktop',tolerance:20,minWidth:8,minHeight:6,timeout:0,required:false}; for(var k in extra)o[k]=extra[k]; return o; }
// Finite-horizon pulse controller. All geometry, dynamics and timing are inputs.
// No pixels, game names, DOM or browser APIs are used by the planner.
function planPulse(y, velocity, obstacles, body, model, cooldown) {
  var step=0.05, horizon=30, beam=[{y:y,v:velocity,cd:cooldown,first:false,cost:0}], answer=false;
  for (var k=0;k<horizon;k++) {
    var candidates=[], tau=(k+1)*step;
    var top=model.top, bottom=model.bottom, upcoming=null, following=null;
    for(var gi=0;gi<obstacles.length;gi++) {
      var g=obstacles[gi], left=g.left-model.speed*tau, right=g.right-model.speed*tau;
      if(right>body.left && left<body.right) {top=Math.max(top,g.top+body.halfHeight+model.margin);bottom=Math.min(bottom,g.bottom-body.halfHeight-model.margin);}
      if(right>body.left) { if(upcoming===null) upcoming=g; else if(following===null) following=g; }
    }
    // Aim at the point of the upcoming corridor closest to the centre of the
    // one after it. Holding the current centre leaves a steep transition to
    // the corridor's exit, where one refresh interval of fall can turn a
    // marginal exit at the floor into no feasible path at all.
    // EDGE_IN: how far inside the upcoming corridor the aim point stays when
    // the next corridor pulls it toward an edge. 5 css px reached 300 s on the
    // Mac; on Windows (28 ms visible response, 260 ms observation gaps) the
    // bird sat 29 css px too high when a column arrived and free fall could
    // not make it up (death at 119 s, score 76) — 25 px keeps a fall's worth
    // of slack and still leaves 120 px of the 170 px corridor for the approach.
    var EDGE_IN=25;
    var target=(model.top+model.bottom)/2;
    if(upcoming){ target=following?(following.top+following.bottom)/2:(upcoming.top+upcoming.bottom)/2; target=Math.max(upcoming.top+body.halfHeight+model.margin+EDGE_IN,Math.min(upcoming.bottom-body.halfHeight-model.margin-EDGE_IN,target)); }
    target=Math.max(top+15,Math.min(bottom-15,target));
    for(var i=0;i<beam.length;i++) for(var a=0;a<2;a++) {
      var s=beam[i]; if(a && s.cd>0)continue;
      var v=a?model.impulse:s.v, yn=s.y, bad=false;
      // Check intermediate positions, including the initial edge of an overlap.
      for(var sub=0;sub<3;sub++) {
        yn+=v*(step/3)+0.5*model.gravity*(step/3)*(step/3);v+=model.gravity*step/3;
        var st=(k+(sub+1)/3)*step, lo=model.top,hi=model.bottom;
        for(var j=0;j<obstacles.length;j++){var q=obstacles[j];if(q.right-model.speed*st>body.left && q.left-model.speed*st<body.right){lo=Math.max(lo,q.top+body.halfHeight+model.margin);hi=Math.min(hi,q.bottom-body.halfHeight-model.margin);}}
        if(yn<lo||yn>hi){bad=true;break;}
      }
      if(bad)continue;
      var clearance=Math.max(1,Math.min(yn-top,bottom-yn));
      candidates.push({y:yn,v:v,cd:a?0.12:Math.max(0,s.cd-step),first:k?s.first:!!a,cost:s.cost+0.0002*(yn-target)*(yn-target)+0.000001*v*v+1/clearance+(a?0.15:0)});
    }
    // A delayed observation can already lie outside the safety margin. If
    // neither first action satisfies it, choose the direction that reduces the
    // vertical violation instead of freezing the actuator in a falling state.
    if(!candidates.length) return {flap:k?answer:(cooldown<=0 && velocity>0 && y>(top+bottom)/2),depth:k};
    candidates.sort(function(a,b){return a.cost-b.cost;});
    beam=[];var bins={};
    for(var n=0;n<candidates.length&&beam.length<16;n++){var c=candidates[n],key=Math.round(c.y/6)+':'+Math.round(c.v/50)+':'+c.first+':'+Math.round(c.cd*20);if(!bins[key]){bins[key]=true;beam.push(c);}}
    answer=beam[0].first;
  }
  return {flap:answer,depth:horizon};
}

var win = callContext.area || {x:0,y:30,width:Number(uiv.getVar('!SCREEN_WIDTH')),height:Number(uiv.getVar('!SCREEN_HEIGHT'))-30};
function gameField(context, searchArea) {
  // A browser subcall hands the canvas content box as context.area; a
  // standalone run finds the board by its sky. Either way the caller passes
  // no canvas size — 360x640 is the game's own resolution.
  if (context.area) {
    if (!(context.area.width>0 && context.area.height>0)) throw Error('Browser canvas area is missing or empty');
    if (Math.abs(context.area.height/context.area.width - CANVAS_H/CANVAS_W) > 0.1) throw Error('The Flappy canvas must keep its 360x640 aspect ratio');
    return {x:context.area.x,y:context.area.y,width:context.area.width,height:context.area.height};
  }
  // A profile-shifted sky needs a wider tolerance to be found at all; the
  // sampled sky colour then replaces the nominal one for the tight searches.
  // The canvas sky is the tall region (360 wide, 400+ high above the ground
  // art); a page can show wider sky-coloured strips, so the shape decides.
  // The board's sky is clearly taller than wide (about 1.3-1.4x on every
  // display seen); a page can also show sky-coloured squares and strips, so
  // take the LARGEST clearly-tall candidate, not the first in reading order.
  var sky=null, tols=[12,24,36,48,60];
  for (var i=0;i<tols.length && !sky;i++) {
    var cands=uiv.findColors(SKY,{scope:'desktop',area:searchArea,tolerance:tols[i],minWidth:200,minHeight:230,timeout:i?0:3,required:false});
    for (var j=0;j<cands.length;j++) { var cr=cands[j].rect; if (cr.height>=cr.width*1.15 && (!sky || cr.width*cr.height>sky.rect.width*sky.rect.height)) sky=cands[j]; }
  }
  if (!sky) throw Error('game field not found: open the page and show its START screen');
  return {x:sky.rect.left,y:sky.rect.top,width:sky.rect.width,height:sky.rect.height};
}
// The START / RESTART button sits at a fixed place on the game's 360x640 canvas
// (START spans canvas y 389-421, the game-over RESTART 372-413, both centred at
// x 180), so click canvas (180,400) through the field's origin and scale — the
// same relative geometry the bird sample uses (45,320). No OCR: the pixel-font
// label reads as "STAET"/"ETMET" in ocrs (the Linux default engine, so the
// desktop run never started a fresh game there), the page prose also contains
// the word START, and a tap on any other screen (ready, mid-play) is a flap.
function clickPlay(area){ var ps=PIXEL_SCALE; uiv.desktop.mouse.click(Math.round(area.x+180*ps), Math.round(area.y+400*ps)); uiv.sleep(900); return true; }
// The live score: thin white digits over the moving sky. The Settings engine
// first (free and instant; enough on macOS/Linux), then engine 'aiprovider'
// (the shared AI provider, like the extension's engine 90) for the digits the
// local engines miss. The crop follows the display scale like the sprites.
function readScore(L,T,W,H){
  // The game-over card prints "Score: N" in plain text: read it first (a
  // local engine read the live digits "45" as "4"), the live digits after.
  for (var a0=0;a0<2;a0++){ try { var s0 = uiv.ocr.read({scope:'desktop', area:{x:L,y:T,width:W,height:H}}); var m0 = String(s0).match(/Score:?\\s*(\\d+)/i); if(m0) return parseInt(m0[1],10); } catch(e0){} uiv.sleep(400); }
  var live={x:L,y:T,width:Math.round(100*PIXEL_SCALE),height:Math.round(65*PIXEL_SCALE)};
  var engines=[null,'aiprovider'];
  for (var e=0;e<engines.length;e++){
    try {
      var o={scope:'desktop',area:live}; if(engines[e])o.engine=engines[e];
      var m=String(uiv.ocr.read(o)).match(/\\d+/);
      if(m){ if(engines[e])uiv.log('score read with engine '+engines[e]+': '+m[0]); return parseInt(m[0],10); }
    } catch(err){ uiv.log('score OCR ('+(engines[e]||'settings engine')+') failed: '+err.message,'orange'); }
  }
  return -1;
}
var best=-1;
for (var game=0; game<GAMES; game++) {
  // The browser launcher prepares the ready screen through the DOM. A
  // standalone desktop run clicks the START button at its canvas position.
  var field=gameField(callContext,win);
  // The board's on-screen width over its 360 canvas width is the scale for
  // gravity, impulse, speed and sprite lengths — measured the same way in both
  // paths (browser area or detected sky). Clamped against a bad detection.
  var s=field.width/CANVAS_W;
  applyScale(s>=0.5 && s<=4 ? s : 1);
  uiv.log('game bounds from '+(callContext.area?'browser canvas':'desktop sky detection')+': '+JSON.stringify(field)+' scale '+PIXEL_SCALE.toFixed(3));
  // Click the START button by its canvas position inside the detected field.
  if (!callContext.area) clickPlay(field);
  // Preserve the controller's flight/ground boundary inside the canvas.
  var L=field.x, T=field.y, W=field.width, H=Math.round(W*1.62), GROUND=T+H-6*PIXEL_SCALE;
  var stripX=L+W*0.08, stripW=W*0.22, stripY=T, stripH=H-60*PIXEL_SCALE;
  var band = {x:L,y:T,width:W,height:H};
  // Start the asynchronous frame source while the application is still idle.
  // The first read may use a synchronous backend with unknown presentation time.
  var warmDeadline=Date.now()+3000, warmMeta;
  do {
    uiv.findColors(PIPE,fo({area:band,capture:'latest'}));warmMeta=uiv.lastCapture();
    if(warmMeta.captureTimeMs!==null)break;
    uiv.sleep(30);
  } while(Date.now()<warmDeadline);
  if(warmMeta.captureTimeMs===null)throw Error('This demo needs presentation timestamps from the capture backend; see the Windows game-demo handover');
  SPEED=120*PIXEL_SCALE;                       // per game: previous motion must not pollute the estimate
  if (CALIBRATE) {
    // Ready screen: the sky fills the canvas corner and the bird waits at its
    // start position (45,320 of 360x640). Sample both from one picture.
    var ps=PIXEL_SCALE, skyObs=observedColor(sampleRect(L+4*ps,T+4*ps,12*ps,12*ps,'latest'),SKY,0.3);
    var birdObs=observedColor(sampleRect(L+45*ps,T+320*ps,34*ps,24*ps,'same'),BIRD,0.06);
    if(skyObs)SKY=skyObs; if(birdObs)BIRD=birdObs;
    uiv.log('colour calibration: sky '+SKY+(skyObs?'':' (nominal, sample unclear)')+', bird '+BIRD+(birdObs?'':' (nominal, sample unclear)')+'; the pipe colour is sampled from the first pipe');
  }
  flap();                                      // the first flap starts the game
  var t0=Date.now(), flaps=0, miss=0, prev=null, v=0, frames=0, stalls=0, worst=0, lastT=t0, lastY=-1;
  var velocitySamples=[];var delaySamples=[], delayHistory=[], calibrationCount=0; VISIBLE_INPUT_MS=35;
  var lastFlapT=0, speeds=[], lastColLeft=-1, lastColT=0;
  var hist=[], lastSig='', lastSigT=0, dups=0, exitWhy='time budget', lastGap=null, curLeft=-1, pipesPassed=0, birdL=1e9, birdR=-1, nearDef=PIPE_W/4, clipDef=PIPE_W/4, hadClip=false;
  while (Date.now()-t0 < MAX_S*1000) {
    var now=Date.now(); var dt=now-lastT; lastT=now; if(dt>100){stalls++; if(dt>worst)worst=dt;}
    var area = lastY>=0 ? {x:stripX,y:Math.max(stripY,lastY-TRACK_H/2),width:stripW,height:TRACK_H} : {x:stripX,y:stripY,width:stripW,height:stripH};
    var m=uiv.findColors(PIPE, fo({area:band,tolerance:12,minWidth:6,minHeight:4,capture:'new'}));
    var meta=m.length?m[0]:uiv.lastCapture();
    // The pipe's second green, from the same picture: its caps span the full
    // pipe width in this colour, where the dark stripes cover only part of it
    // (a column seen through 21 px of dark blobs was judged passed 11 px early
    // even after sizeColumns). Nothing wider than a pipe belongs to one.
    m=m.concat(uiv.findColors(PIPE2, fo({area:band,tolerance:12,minWidth:6,minHeight:4,capture:'same'}))).filter(function(q){return q.rect.width<=PIPE_W*1.3;});
    var bm=uiv.findColors(BIRD, fo({area:area,capture:'same'}));
    if(!bm.length){ var full={x:stripX,y:stripY,width:stripW,height:stripH}; bm=uiv.findColors(BIRD, fo({area:full,capture:'same',tolerance:40,minWidth:6,minHeight:4})); if(!bm.length) bm=uiv.findColors(BIRD2, fo({area:full,capture:'same',tolerance:25,minWidth:5,minHeight:3})); }
    frames++;
    if(!pipeCalibrated && now-t0>1400){
      // The first pipe: its cross-section fills a strip near the right edge,
      // below the canvas top and above every gap (top pipes reach y>=128).
      var strip=sampleRect(L+W-72*PIXEL_SCALE,T+12*PIXEL_SCALE,70*PIXEL_SCALE,2*PIXEL_SCALE,'same');
      var pipeObs=observedColor(strip,PIPE,0.15);
      if(pipeObs && chDist(pipeObs,SKY)>40){ PIPE=pipeObs; pipeCalibrated=true; var pipeObs2=observedColor(strip,PIPE2,0.1); if(pipeObs2 && chDist(pipeObs2,SKY)>40 && chDist(pipeObs2,PIPE)>30) PIPE2=pipeObs2; uiv.log('colour calibration: pipe '+PIPE+' and '+PIPE2+' from the first pipe'); }
    }
    if(!bm.length){ if(++miss>8){ exitWhy='bird lost'; break;} continue; }
    var r=bm[0].rect; for(var i=1;i<bm.length;i++) if(bm[i].rect.width*bm[i].rect.height>r.width*r.height) r=bm[i].rect;
    // The bird never moves sideways, but its yellow splits into pieces as the
    // sprite animates and rotates: at one fatal frame the largest piece ended
    // 13 px short of the body, the planner expected the column 110 ms late
    // and flapped into its cap. Keep the widest extent seen in this game.
    if(r.left<birdL)birdL=r.left; if(r.left+r.width>birdR)birdR=r.left+r.width;
    var b={x:birdL-SPR_LEFT, right:birdR+SPR_RIGHT, y:r.top+r.height/2+2*PIXEL_SCALE};
    miss=0; lastY=b.y;

    var sig=r.left+','+r.top+','+r.width+','+r.height+'|'+m.map(function(q){return q.rect.left+':'+q.rect.top;}).join(',');
    if(sig===lastSig){ dups++; if(now-lastSigT>800){ exitWhy='screen static for 0.8 s (game over)'; break; } continue; } lastSig=sig; lastSigT=now;
    now=Date.now();
    var captured=meta.captureTimeMs;
    if(captured===null || (prev && captured<=prev.t))continue;
    var effective=lastFlapT+VISIBLE_INPUT_MS;
    velocitySamples.push({t:captured/1000,y:b.y});
    velocitySamples=velocitySamples.filter(function(p){return p.t>=captured/1000-0.10 && (!lastFlapT || captured<effective || p.t>=effective/1000);});
    var fittedVelocity=fitFlightVelocity(velocitySamples,captured/1000,G);
    if(fittedVelocity!==null)v=fittedVelocity;
    else if(lastFlapT && captured>=effective)v=V0+G*(captured-effective)/1000;
    var flightT=(captured-lastFlapT)/1000;
    if(lastFlapT && flightT>=0.12 && flightT<=0.5)delaySamples.push({t:flightT,y:b.y});
    prev={y:b.y,t:captured};
    // --- pipes -> columns -> gaps (a column's gap stays consistent frame to frame)
    // A blob inside the column's extent so far belongs to it whatever its
    // offset from the column's left: on Windows at scale 1.711 the second-green
    // cap is 104 px wide (61 css px) and its right-end pieces begin 95 px in,
    // past the PIPE_W-5px cluster step, so they opened a phantom column with
    // its own gap and the planner aimed at that instead of the next pipe
    // (death at 17 s; the Mac's integer scale keeps every piece inside the step).
    var rs=m.map(function(q){return q.rect;}).sort(function(a,b2){return a.left-b2.left;}); var cols=[];
    for(var i2=0;i2<rs.length;i2++){ var rr=rs[i2]; var c=cols.length?cols[cols.length-1]:null; if(!c||(rr.left>c.right-2*PIXEL_SCALE&&rr.left-c.left>PIPE_W-5*PIXEL_SCALE)){c={left:rr.left,right:rr.left+rr.width,blobs:[]};cols.push(c);} c.right=Math.max(c.right,rr.left+rr.width); c.blobs.push(rr);}
    var hasClip=cols.length>0 && cols[0].left<=L+2; if(hasClip && !hadClip)clipDef=nearDef; hadClip=hasClip;
    sizeColumns(cols, PIPE_W, L, clipDef);
    var gaps=[];
    for(var j=0;j<cols.length;j++){ var bl=cols[j].blobs.sort(function(a,b2){return a.top-b2.top;}); var bestGap=null;
      var prevC = (lastGap && Math.abs(cols[j].left-lastGap.left)<30*PIXEL_SCALE) ? (lastGap.top+lastGap.bottom)/2 : null;
      for(var k=1;k<bl.length;k++){ var sp=bl[k].top-(bl[k-1].top+bl[k-1].height); if(sp<=60*PIXEL_SCALE) continue; var g2={sp:sp,top:bl[k-1].top+bl[k-1].height,bottom:bl[k].top};
        if(prevC!==null){ var d2=Math.abs((g2.top+g2.bottom)/2-prevC); if(!bestGap||d2<bestGap.d) { g2.d=d2; bestGap=g2; } } else if(!bestGap||sp>bestGap.sp) bestGap=g2; }
      // A pipe's gap never moves: a candidate far from last frame's gap is a
      // sensing fault (a stripe cut by the score digits, a cap sunk below the
      // ground), so the previous gap stands until the blobs agree again.
      if(bestGap && prevC!==null && bestGap.d>40*PIXEL_SCALE) bestGap=null;
      // Blobs that no longer bracket a gap (a column leaving the field, a pipe
      // part hidden): keep the gap this column showed last frame; without one,
      // guess by whether the blobs hang from the field's top edge.
      if(!bestGap && bl.length){ if(prevC!==null) bestGap={sp:lastGap.bottom-lastGap.top+8*PIXEL_SCALE,top:lastGap.top-4*PIXEL_SCALE,bottom:lastGap.bottom+4*PIXEL_SCALE}; else { var loB=bl[0].top, hiB=0; for(var q=0;q<bl.length;q++){ hiB=Math.max(hiB, bl[q].top+bl[q].height); } if(loB<=T+6*PIXEL_SCALE) bestGap={sp:GAP_H,top:hiB,bottom:hiB+GAP_H}; else bestGap={sp:GAP_H,top:loB-GAP_H,bottom:loB}; } }
      if(bestGap && cols[j].right+PIPE_EXTRA_RIGHT > b.x-2*PIXEL_SCALE) gaps.push({left:cols[j].left-2*PIXEL_SCALE,right:cols[j].right+PIPE_EXTRA_RIGHT,top:bestGap.top+4*PIXEL_SCALE,bottom:bestGap.bottom-4*PIXEL_SCALE,mw:cols[j].mw,whole:cols[j].whole}); }
    gaps.sort(function(a,b2){return a.left-b2.left;});
    var cur=gaps.length?gaps[0]:null;
    if(cur){
      if(cur.whole)nearDef=Math.min(Math.max(0,PIPE_W-cur.mw),PIPE_W/4);
      if(curLeft>=0 && cur.left>curLeft+60*PIXEL_SCALE)pipesPassed++;
      if(lastColLeft>=0 && captured>lastColT+70 && Math.abs(cur.left-lastColLeft)<30*PIXEL_SCALE){
        var sp=(lastColLeft-cur.left)/((captured-lastColT)/1000);
        if(sp>80*PIXEL_SCALE&&sp<160*PIXEL_SCALE){speeds.push(sp);if(speeds.length>15)speeds.shift();SPEED=median(speeds);}
        lastColLeft=cur.left;lastColT=captured;
      } else if(lastColLeft<0||cur.left>lastColLeft+30*PIXEL_SCALE){lastColLeft=cur.left;lastColT=captured;}
      curLeft=cur.left;lastGap=cur;
    } else {curLeft=-1;lastColLeft=-1;lastGap=null;}
    var ageS=Math.max(0,(now-captured)/1000),lead=Math.min(0.15,ageS+VISIBLE_INPUT_MS/1000);
    var yNow=b.y, vNow=v;
    if(lastFlapT && effective>captured && effective<now+VISIBLE_INPUT_MS){
      var preS=(effective-captured)/1000;
      yNow+=vNow*preS+0.5*G*preS*preS;vNow=V0;lead-=preS;
    }
    yNow+=vNow*lead+0.5*G*lead*lead;vNow+=G*lead;
    var projected=gaps.map(function(g){return {left:g.left-SPEED*(ageS+VISIBLE_INPUT_MS/1000),right:g.right-SPEED*(ageS+VISIBLE_INPUT_MS/1000),top:g.top,bottom:g.bottom};});
    // The planner uses the game's CSS units, independent of screen scaling.
    var cssGaps=projected.map(function(g){return {left:(g.left-L)/PIXEL_SCALE,right:(g.right-L)/PIXEL_SCALE,top:(g.top-T)/PIXEL_SCALE,bottom:(g.bottom-T)/PIXEL_SCALE};});
    var decision=planPulse((yNow-T)/PIXEL_SCALE,vNow/PIXEL_SCALE,cssGaps,{left:(b.x-L)/PIXEL_SCALE,right:(b.right-L)/PIXEL_SCALE,halfHeight:12},
      {gravity:G/PIXEL_SCALE,impulse:V0/PIXEL_SCALE,speed:SPEED/PIXEL_SCALE,top:20,bottom:(GROUND-T)/PIXEL_SCALE-20,margin:10},Math.max(0,0.12-(now-lastFlapT)/1000));
    if(decision.flap && now-lastFlapT>=120){var fitted=fitFlightDelay(delaySamples,G,V0);if(fitted!==null){delayHistory.push(fitted);if(delayHistory.length>7)delayHistory.shift();VISIBLE_INPUT_MS=median(delayHistory);calibrationCount++;}delaySamples=[];lastFlapT=Date.now();flap();flaps++;}
    hist.push({t:now-t0,at:now,ct:captured,y:b.y,v:v,age:ageS,depth:decision.depth,flap:decision.flap,bird:[r.left,r.top,r.width,r.height],gaps:gaps,blobs:rs.map(function(q){return [q.left,q.top,q.width,q.height];})});if(hist.length>40)hist.shift();
  }
  var dur=Date.now()-t0;
  if(CALIBRATE&&!pipeCalibrated)uiv.log('colour calibration: no pipe sample was taken; searched for the nominal pipe colour '+PIPE,'orange');
  if(dur>=MAX_S*1000){uiv.log("SURVIVED "+MAX_S+" seconds; visually counted "+pipesPassed+" pipes");}
  uiv.shot.area({x:L,y:T,width:W,height:H},"flappy_final.png");
  uiv.log('visible response '+VISIBLE_INPUT_MS.toFixed(1)+' ms from '+calibrationCount+' flight fits');
  uiv.log('trace '+JSON.stringify(hist));
  var score=readScore(L,T,W,H);best=Math.max(best,score);
  uiv.log('score '+(score<0?'unreadable':score)+' in '+(dur/1000).toFixed(1)+'s ('+exitWhy+'); '+frames+' observations, '+flaps+' pulses, '+dups+' duplicates; observation gaps >100ms '+stalls+' (max '+worst+'ms); speed '+SPEED.toFixed(1));
}
uiv.log('best score '+(best<0?'unreadable':best));
uiv.banner((dur >= MAX_S*1000 ? 'Flappy Bird complete: ' : 'Flappy Bird ended early: ') + (dur/1000).toFixed(1) + ' seconds, ' + (best<0?'score unreadable':('score '+best)), { seconds: 5 });
uiv.sleep(5000);
// Return the result FIRST so a browser subcall always gets one (its launcher
// then shows a browser banner). Only a standalone run throws on an early end,
// to mark itself failed; a browser subcall reports survived:false instead.
if(typeof uiv.result==='function')uiv.result({score:best<0?null:best,pipesPassed:pipesPassed,elapsedSeconds:dur/1000,survived:dur>=MAX_S*1000});
if(dur<MAX_S*1000 && !callContext.area)throw Error('Ended before the '+MAX_S+' second survival target (score '+best+')');
`
  },
  {
    // Variant 3 of 3: the model as the finder. Same task as _local_ocr —
    // uiv.ai.find points at the targets, no OCR wordlists and no image
    // files to maintain; each call is billable.
    fileName: 'ClearSidebarLogViaGUI_ai.find.js',
    path: 'Browser plus Desktop Automation/ClearSidebarLogViaGUI_ai.find.js',
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
    fileName: 'DemoDesktopDrag.js',
    path: 'Browser plus Desktop Automation/DemoDesktopDrag.js',
    title: 'DemoDesktopDrag (JS)',
    code: `// Port of Classic/Real User Input/DemoXMove.
// Same sliders as DemoBrowserDrag, but driven with REAL OS mouse input.
//
// Vision stays in BROWSER scope, exactly like the classic macro: every image
// is found in a screenshot of the TAB (viewport pixels), and only the INPUT
// is desktop-tier — uiv.desktop.* takes a browser-scope match, or bare
// numbers with {scope: 'browser'}, and converts viewport → screen itself
// (window position and side panel corrected, browser fronted). Searching in
// desktop scope instead drags in everything a SCREEN capture sees: the
// "Desktop capture in progress" cover over the panel, lookalikes from other
// windows (measured live: the warmth anchor matched a chat window, and on
// Firefox the tab-strip icons matched the handle image at 0.78), and dpi
// rescaling of the _dpi_96 images on scaled displays (measured live at 125%:
// scores fell under the match bar). Browser-scope vision has none of that —
// only automation of things OUTSIDE the browser needs desktop scope.
const x = uiv.desktop;
const B = { scope: 'browser' };   // bare-number points derived from matches

uiv.goto('https://ui.vision/demo/draw');
uiv.page.click('link=this external website');
uiv.window.focus();   // OS input goes to the FOCUSED window, not the browser

// --- 2nd slider: classic "@0.75#2" = confidence + which match ---------------
const handles = uiv.findImages('slider_handle_dpi_96.png', { minScore: 0.75 });
uiv.log(\`found \${handles.length} slider handles on the page\`, 'blue');
if (handles.length < 2) {
  throw new Error(\`expected at least 2 slider handles, found \${handles.length}\`);
}

const second = handles[1];
x.down(second);
x.up(second.x + 200, second.y, B);

// --- 3rd slider: search INSIDE one region ------------------------------------
// six identical handles are on the page: find the red thermometer at the warm
// end, then look for the handle in a band extending one track-length to its
// left — everything in viewport pixels, every size in units the anchor itself
// provides. The engine clips the area to the screenshot.
const warmEnd = uiv.findImage('slider_warmth_dpi_96.png', { minScore: 0.6 });
const w = warmEnd.rect.width;
const band = {
  x: warmEnd.x - 45 * w,
  y: warmEnd.y - warmEnd.rect.height,
  width: 45 * w,
  height: 2 * warmEnd.rect.height
};
const handle3 = uiv.findImage('slider_handle_dpi_96.png', { minScore: 0.6, area: band });
x.down(handle3);
// composed relative target — see DemoBrowserDrag; the match's browser scope
// travels through uiv.offset, and uiv.desktop.* converts it to the screen
x.up(uiv.offset(warmEnd, -Math.round(1.05 * w), 0));

// the RESULT is read from the DOM — no OCR needed for text the page has
const warmth = uiv.$('xpath=//ion-list[3]/ion-list-header/div/ion-badge').text;
uiv.log(\`Slider WARMTH value is: \${warmth}\`, 'red');
if (String(warmth).trim() !== '2000') {
  throw new Error(\`slider did not reach 2000 — it reads \${warmth}\`);
}
uiv.log('DemoDesktopDrag (JS) completed', 'green');
`
  },
  {
    fileName: 'DemoRunProgram.js',
    path: 'Browser plus Desktop Automation/DemoRunProgram.js',
    title: 'DemoRunProgram (JS)',
    code: `// Port of Classic/Real User Input/DemoXRun.
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
    path: 'Browser plus Desktop Automation/Right-click context menu.js',
    title: 'Right-click context menu (JS)',
    code: `// Save a web page through the browser's RIGHT-CLICK context menu and the OS
// save dialog. Both are NATIVE UI outside the page DOM — no page command can
// reach them, so everything after the right-click is desktop-tier (XModule)
// work: real OS input plus desktop-scope OCR.
const x = uiv.desktop;

uiv.goto('https://ui.vision');

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
const lang = String(uiv.evaluate('return navigator.language') || 'en').toLowerCase().slice(0, 2);
// en carries a wildcard too: OCR merges tokens across a menu row — the
// Linux local engine read the whole entry as one token 'Saveas.Ctr+S'
// (measured live), which an exact 'Save' can never match.
const SAVE_WORD = {
  en: 'Save*', de: 'speich*', fr: 'enregistr*', es: 'Guardar*', it: 'Salva*',
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
// Scans are RESTRICTED to the browser window: the context menu and the
// save dialog both open within it, while another window showing the same
// word (a docs page, a chat scrolling new text between the baseline and
// the item scan — measured live) would defeat the is-it-new filter.
// uiv.window.rect() measures truthfully on Wayland too.
const SCAN_AREA = uiv.window.rect();
const scan = () => {
  let m = uiv.ocr.findTexts(SAVE_WORD, {scope: 'desktop', area: SCAN_AREA, required: false, timeout: 3});
  if (!m.length) {
    try { m = uiv.ocr.findTexts(SAVE_WORD, {scope: 'desktop', area: SCAN_AREA, required: false, timeout: 3, engine: 'xmodule'}); } catch (e) { /* no XModule Local OCR */ }
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

// SECOND proof, for a dialog that shows no title word at all: GNOME's
// xdg-desktop-portal file chooser has no title text, its accept button is
// white on the accent color and the proposed file name sits selected —
// none of it readable to the local engines (measured live 2026-09-05: the
// dialog was open, every scan saw only the page, and the demo pressed
// Escape on a save that had worked). What every native dialog does, on
// every OS and in every language, is TAKE THE KEYBOARD FOCUS from the page:
// document.hasFocus() is true with the page (and with the context menu, a
// popup) in front, false while a modal dialog owns the input, true again
// once it is gone — measured on GNOME with exactly these three states.
const pageHasFocus = () => uiv.evaluate('return document.hasFocus()') === true;

x.click(100, 300, {scope: 'browser', button: 'right'});
uiv.sleep('1s'); // settle: let the native menu paint before the OCR pass

// "new" = not in the noise baseline, i.e. it appeared with the menu/dialog
const isNew = (h, extra) => !noise.concat(extra || []).some((n) => Math.abs(n.x - h.x) < 10 && Math.abs(n.y - h.y) < 10);

const item = scan().find((h) => isNew(h));
if (!item) {
  x.type('\${KEY_ESC}'); // close the menu again — leave a clean screen behind
  throw new Error('The save-page entry ("' + SAVE_WORD + '") was not found in the context menu by OCR — try the XModule Local OCR (Settings > OCR), or adjust SAVE_WORD for your language.');
}
uiv.log('menu entry "' + item.text + '" at ' + Math.round(item.x) + ',' + Math.round(item.y) + ' (rect ' + JSON.stringify(item.rect) + ')');
x.click(item);
uiv.sleep('2s'); // settle: the OS save dialog takes a moment to appear

// POSITIVE proof that the dialog is up BEFORE typing blindly into it — but
// NOT by reading the file-name field: it shows its text small and SELECTED
// (white on highlight), which local OCR regularly cannot read, and a failed
// read there would abort a save that actually worked. The dialog's TITLE
// carries the same word as the menu entry ("Speichern unter", "Save As") in
// large text instead: the menu is gone by now, so a fresh match somewhere
// ELSE than the menu entry means the dialog is open.
// RETRY LOOP, not one scan: on Linux the dialog is the xdg-desktop-portal
// file chooser, a separate process that COLD-STARTS on its first use —
// measured at 5s+ on this machine, comfortably outliving a single 2s+3s
// window while the very same click had hit the entry perfectly.
let dialog = null;
for (let dialogTry = 0; dialogTry < 4 && !dialog; dialogTry++) {
  dialog = scan().find((h) => isNew(h, [item])) || (!pageHasFocus() ? { text: 'dialog (page lost focus)', x: 0, y: 0 } : null);
  if (!dialog) uiv.sleep('2s');
}
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
if (scan().some((h) => isNew(h, [item])) || !pageHasFocus()) {
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
uiv.goto('https://forum.ui.vision/');

// Grab the page CONTENT via the finder, not uiv.evaluate: this forum ships a
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
  // sweep, which is how this was caught). Being reworked; restore deletes the
  // whole demo folder first, so installed copies disappear on their own.
  {
    fileName: 'ai.find_SearchForum.js',
    path: 'LLM AI Commands/ai.find_SearchForum.js',
    title: 'ai.find_SearchForum (JS)',
    code: `// Port of Classic/LLM AI Commands/ai.find_SearchForum.
// uiv.ai.find asks the model WHERE something is on screen: a vision finder
// powered by an LLM rather than template matching, for when there is no image
// to match and no DOM to query. It returns a match, DPI already accounted for.
// DOM clicks act on the model's point, so this runs in every browser; typing
// goes through uiv.page.fill on the focused search field.
uiv.goto('https://forum.ocr.space/');

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
uiv.page.fill('css=input[type="search"], input[name="term"], input', 'V10');

const firstResult = locate('Find the first search result (blue text)');
uiv.page.click(firstResult);

uiv.log('ai.find_SearchForum (JS) completed', 'green');
`
  },
  {
    // Browser-scope twin of Desktop Automation/AccuracyTest_DesktopAiFind.
    // Same measuring rig, the other coordinate path: the model is shown the
    // VIEWPORT capture and its answer is used as viewport CSS px, so what is
    // under test here is the capture rescale (96/getPageDpi in helper.ts) and
    // the coordinate space the reply arrives in - not the screen conversion.
    // Needs no XModule and no window focus, which is why it lives with the
    // other LLM demos rather than in Desktop Automation.
    // Deliberately DIFFERENT ON SIGHT from the desktop one: square targets in
    // orange/purple/teal on pale blue, where that one has red/green/blue
    // bullseyes on white. Two demos that look alike get mistaken for each
    // other in a bug report with a screenshot attached.
    fileName: 'AccuracyTest_BrowserAiFind.js',
    path: 'LLM AI Commands/AccuracyTest_BrowserAiFind.js',
    title: 'AccuracyTest_BrowserAiFind (JS)',
    code: `// ai.find Click Accuracy Range, BROWSER scope - the extension shoots at
// itself with the model as the finder, inside the page. Twin of
// Desktop Automation/AccuracyTest_DesktopAiFind, which measures the
// desktop path; run that one when uiv.desktop.mouse.click misses, this one when
// uiv.browser.click(uiv.ai.find(...)) misses.
//
// Three square targets on a pale blue page, whose true centres the page
// reports from the DOM. Per target: ai.find({scope: 'browser'}) is asked where
// it is, the answer is measured against that centre, then uiv.browser.click
// really clicks the point - and the target ELEMENT reports whether it was the
// one that got clicked, which is the check a browser-scope macro actually
// cares about.
//
// WHAT CAN GO WRONG HERE, and what the report names:
//   points off by a FACTOR on both axes -> the capture rescale. The viewport
//     shot is taken at device pixels and scaled by 96/page-DPI, measured in
//     the PANEL - so a page at a different zoom than the panel, or on a
//     monitor with another scaling factor, gets rescaled by the wrong number.
//     Ctrl+0 in the page and re-run is the first thing to try.
//   points off by a DIFFERENT factor per axis -> the reply was in 0-1000
//     normalized coordinates and never rescaled to the image. Several models
//     answer normalized whatever the prompt asks for, so this is a real and
//     provider-specific failure; the two factors are then 1000/viewport width
//     and 1000/viewport height, which is why the axes disagree.
//   points off by the same NUMBER of px -> the capture is offset (a cropped
//     or scrolled shot passed off as the full viewport).
//   points good but the click hits the wrong element -> not ai.find.
// There is NO coordinate conversion between this finder and this click: both
// speak viewport CSS px. That is the point of the comparison with the desktop
// twin - if the browser range passes and the desktop one fails, the screen
// conversion is what breaks, not the model.
//
// The model being imprecise on a real page is a separate question (the docs
// put ai.find within 1-2% of the image, and it extrapolates on repeating
// layouts). This range removes that on purpose: three big targets, distinct
// colours, no repeating layout, and the bar is 2% of the viewport width.
//
// COST: 3 model calls, one per target. No XModule, no focus - it runs while
// you work in another window, and nothing outside the browser tab is touched.
// Keep the page at 100% zoom unless you are deliberately testing zoom.

const HALF = 52;          // half the side of a target square
const SLOPE_ALARM = 0.15; // above model scatter (~0.09 worst case), far below any real factor

uiv.goto('https://ui.vision/');
uiv.window.resize(1024, 620); // not 1000 wide on purpose: it keeps 1000/width
                              // distinguishable from a clean 1.000 factor

// Build the range. Every measured position is a FIXED PIXEL offset from the
// top left, never a fraction of the viewport - Chrome's "is debugging" notice
// appears and disappears throughout a CDP run and changes innerHeight, and a
// fraction-based layout would move every target under the macro's feet between
// the capture and the click. Anchored to the top left, an infobar moves nothing.
// Prime the trusted-input channel BEFORE the range is laid out: the first
// CDP event on a tab attaches the debugger, and Chrome's "is debugging" bar
// then shrinks the viewport by ~56px — a range built before that has its
// bottom rows (the calibration pad) clipped away, and the self-test click
// lands on nothing (measured live 2026-09-05). A hover is the cheapest
// event; the attachment then stays for the whole run.
if (uiv.getVar('!BROWSER') !== 'firefox') { uiv.browser.hover(1, 1); }
const info = uiv.evaluate(\`
var d = document, W = window.innerWidth, H = window.innerHeight;
var old = d.getElementById('uivbf'); if (old) old.remove();
var ov = d.createElement('div');
ov.id = 'uivbf';
ov.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:2147483647;background:#eef4fb;cursor:crosshair;';
var NS = 'http://www.w3.org/2000/svg';
var svg = d.createElementNS(NS, 'svg');
svg.setAttribute('width', W); svg.setAttribute('height', H);
ov.appendChild(svg); d.body.appendChild(ov);
function el(n, a, parent, text) {
  var e = d.createElementNS(NS, n);
  for (var k in a) e.setAttribute(k, a[k]);
  // ONLY the tagged targets are hit-testable; every label and annotation is
  // decoration. Both halves of that were learned the hard way: the pad's own
  // caption sits on its centre and swallowed the self-test click, and then the
  // error-vector dot - drawn at the model's answer BEFORE the click - swallowed
  // every click the moment the model became pixel-accurate and the dot landed
  // exactly on the target centre. Three perfect points reported as "hit the
  // page background".
  if (!a || a['data-uivt'] === undefined) e.style.pointerEvents = 'none';
  (parent || svg).appendChild(e);
  if (text) e.textContent = text;
  return e;
}
var F = 'Segoe UI,Helvetica,sans-serif';
el('text', {x:W/2, y:30, fill:'#0f172a', 'font-size':21, 'font-weight':'bold', 'font-family':F, 'text-anchor':'middle'}, svg, 'Ui.Vision ai.find Click Accuracy Range - BROWSER scope');
el('text', {x:W/2, y:50, fill:'#64748b', 'font-size':12, 'font-family':F, 'text-anchor':'middle'}, svg, 'the model points, uiv.browser.click clicks - the squares report who was hit');
// SQUARES in orange/purple/teal, so a screenshot of this run can never be
// confused with the desktop demo's round red/green/blue bullseyes.
// Fixed pixel centres, spread on both axes for the slope fit.
var T = [['ORANGE','#ea580c',150,120],['PURPLE','#7c3aed',500,250],['TEAL','#0d9488',850,470]];
window.__uivbfTargets = [];
for (var i = 0; i < T.length; i++) {
  var cx = T[i][2], cy = T[i][3], c = T[i][1], nm = T[i][0];
  // every piece carries data-uivt, so a click anywhere on the target is
  // attributable to it no matter which shape swallowed the event
  el('rect', {x:cx-52, y:cy-52, width:104, height:104, rx:10, fill:c, 'data-uivt':nm});
  el('rect', {x:cx-30, y:cy-30, width:60, height:60, fill:'#ffffff', 'data-uivt':nm});
  el('rect', {x:cx-13, y:cy-13, width:26, height:26, fill:c, 'data-uivt':nm});
  el('line', {x1:cx-20, y1:cy, x2:cx+20, y2:cy, stroke:'#ffffff', 'stroke-width':2, 'data-uivt':nm});
  el('line', {x1:cx, y1:cy-20, x2:cx, y2:cy+20, stroke:'#ffffff', 'stroke-width':2, 'data-uivt':nm});
  el('text', {x:cx, y:cy+70, fill:'#64748b', 'font-size':11, 'font-family':F, 'text-anchor':'middle'}, svg, nm + ' square');
  // the centre IS cx,cy - the shapes are built around it, so there is nothing
  // to measure with getBoundingClientRect here (unlike a text glyph)
  window.__uivbfTargets.push({name:nm, color:c, x:cx, y:cy});
}
var pad = {x:150, y:520};
el('rect', {x:pad.x-70, y:pad.y-20, width:140, height:40, rx:8, fill:'#e2e8f0', stroke:'#cbd5e1', 'data-uivt':'PAD'});
el('text', {x:pad.x, y:pad.y-1, fill:'#0369a1', 'font-size':12, 'font-family':F, 'text-anchor':'middle'}, svg, 'calibration pad');
el('text', {x:pad.x, y:pad.y+13, fill:'#94a3b8', 'font-size':10, 'font-family':F, 'text-anchor':'middle'}, svg, 'self-test click lands here');
window.__uivbfPad = pad;
window.__uivbfHits = [];
// records WHERE and WHAT: the element tag turns "did the click land on the
// target" from a distance guess into the browser's own hit-test answer
ov.addEventListener('mousedown', function (e) {
  var tag = '';
  try { tag = (e.target && e.target.getAttribute && e.target.getAttribute('data-uivt')) || ''; } catch (err) { tag = ''; }
  window.__uivbfHits.push({x:e.clientX, y:e.clientY, el:tag, trusted:!!e.isTrusted});
}, true);
window.__uivbfVector = function (fx, fy, tx, ty, color, label) {
  el('line', {x1:fx, y1:fy, x2:tx, y2:ty, stroke:color, 'stroke-width':1.5, 'stroke-dasharray':'3 3'});
  el('circle', {cx:tx, cy:ty, r:4, fill:color});
  el('text', {x:tx+8, y:ty-8, fill:color, 'font-size':11, 'font-family':'Consolas,monospace'}, svg, label);
};
window.__uivbfMark = function (hx, hy, color, label) {
  el('line', {x1:hx-14, y1:hy, x2:hx+14, y2:hy, stroke:color, 'stroke-width':1.5});
  el('line', {x1:hx, y1:hy-14, x2:hx, y2:hy+14, stroke:color, 'stroke-width':1.5});
  el('circle', {cx:hx, cy:hy, r:5, fill:'none', stroke:color, 'stroke-width':1.5});
  el('text', {x:hx+11, y:hy+16, fill:color, 'font-size':11, 'font-family':'Consolas,monospace'}, svg, label);
};
// (progress messages go through uiv.banner, not a hand-rolled element)
window.__uivbfReport = function (text, color, verdict) {
  var wrap = d.createElement('div');
  // max-width + pre-wrap below: the verdict is one long sentence, and unwrapped
  // it made the card ~2000px wide - centred, so it hung off BOTH edges of the
  // window and the table lost its first characters. The column rows are short
  // and stay on one line; only the prose wraps.
  wrap.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483647;box-sizing:border-box;max-width:min(94vw,860px);background:rgba(15,23,42,0.95);border:1.5px solid ' + color + ';border-radius:8px;padding:10px 14px;';
  // a verdict LIGHT, so the answer is readable from across the room instead of
  // having to be parsed out of the last paragraph
  var head = d.createElement('div');
  head.style.cssText = 'display:flex;align-items:center;gap:9px;margin:0 0 7px 0;font:600 13px/1.2 system-ui,Segoe UI,sans-serif;color:' + color + ';';
  var lamp = d.createElement('span');
  lamp.style.cssText = 'width:13px;height:13px;border-radius:50%;background:' + color + ';box-shadow:0 0 9px ' + color + ';flex:none;';
  head.appendChild(lamp);
  head.appendChild(d.createTextNode(verdict));
  wrap.appendChild(head);
  var box = d.createElement('pre');
  // reset background/border/white-space explicitly: the dark panel lives on the
  // wrapper now, and plenty of sites style <pre> as a light code block - one
  // such rule turned this card into light grey text on white
  box.style.cssText = 'background:transparent;border:0;padding:0;margin:0;color:#e2e8f0;font:11px/1.5 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;';
  box.textContent = text;
  wrap.appendChild(box);
  ov.appendChild(wrap);
};
return {w:W, h:H, dpr:window.devicePixelRatio, targets:window.__uivbfTargets, pad:window.__uivbfPad};
\`);

const browser = uiv.getVar('!BROWSER');
const OS_NAME = uiv.getVar('!OS');
const hits = () => uiv.evaluate('return window.__uivbfHits');
// On-page progress, uiv.banner - uiv.log's sibling for the person WATCHING the
// browser. Pinned to the BOTTOM, below every target, and pointer-events none,
// so it can neither cover a square nor swallow a click. ai.find hides it for
// the duration of its capture (like the other capture-based finders), so the
// model never reads it; it stays colour-free regardless.
const status = (t) => uiv.banner(t, {position: 'bottom'});

// The targets sit at fixed pixel positions, so a viewport too small to contain
// them makes them invisible to the model - which would read as "the model
// cannot find them" instead of "the window is too small".
if (info.w < 960 || info.h < 560) {
  throw new Error('The viewport is ' + info.w + 'x' + info.h + ' - too small for this range, which needs at least 960x560 (the targets sit at fixed positions up to 850,470). The window resize did not take: close the side panel a little, unmaximize/enlarge the browser window, or run this on a bigger screen.');
}
// the bar for the model's point: the 1-2% of image size the docs promise,
// never tighter than the square it has to hit
const BAR = Math.max(HALF, Math.round(0.02 * info.w));
uiv.log('Range ' + info.w + 'x' + info.h + ' | ' + browser + ' on ' + OS_NAME + ' | dpr=' + info.dpr + ' | model bar ' + BAR + 'px | 3 model calls ahead, one per square', 'blue');

// Click mode. uiv.browser.click is trusted CDP input and only Chrome/Edge has
// it; elsewhere (and when another extension's iframe vetoes the debugger
// attach) the honest fallback is a synthetic DOM click. The difference MATTERS
// for this report: a CDP click is dispatched at viewport coordinates and the
// browser resolves what is there, so the element it hits is real evidence. A
// DOM click looks up the element itself and echoes back the coordinates it was
// given, so it cannot prove hit-testing - the report says which one ran.
let clickMode = 'browser.click (trusted CDP)';
const clickAt = (p) => {
  if (clickMode.indexOf('CDP') >= 0) {
    try {
      uiv.browser.click(p);
      return;
    } catch (e) {
      // the element report survives the fallback (elementFromPoint is a real
      // hit test); what is lost is the trusted event and the coordinate half of
      // the measurement, since a DOM click echoes back the numbers it was given
      clickMode = 'page.click (synthetic DOM: element still hit-tested, but the event is untrusted and the coordinates are echoed) - ' + e.message;
      uiv.log('uiv.browser.click is unavailable here (' + e.message + ') - falling back to a synthetic DOM click', 'orange');
    }
  }
  uiv.page.click(p);
};

// fire one click and wait for the page to record it
function shoot(p) {
  const before = hits().length;
  clickAt(p);
  for (let i = 0; i < 12; i++) {
    const h = hits();
    if (h.length > before) return h[h.length - 1];
    uiv.sleep(250);
  }
  return null;
}

// Self-test on the calibration pad: proves the recorder AND settles which
// click mode this browser gets, before any model call is spent.
status('Checking the measuring rig');
const selfTest = shoot(info.pad);
if (!selfTest) {
  throw new Error('Self-test failed: a click on the calibration pad was never recorded, so nothing about ai.find could be measured (no model call was spent). The range page did not receive input - another extension may be blocking the debugger attach, or the tab lost the overlay.');
}
if (selfTest.el !== 'PAD') {
  uiv.log('Self-test click landed on "' + (selfTest.el || 'nothing taggable') + '" instead of the pad - the element report may be unreliable in this browser', 'orange');
}
uiv.log('Self-test OK - click recorded at ' + selfTest.x + ',' + selfTest.y + ' on "' + selfTest.el + '" via ' + clickMode.split(' (')[0] + (selfTest.trusted ? ' [trusted]' : ' [synthetic]'), 'blue');

// Let the window settle before the first capture. Chrome's debugging notice
// opens right after that first CDP click and changes innerHeight; the targets
// do not move with it (fixed offsets from the top left), but a shot taken
// mid-transition would be blurred across two layouts.
// Chrome opens its "is debugging" notice right after that first CDP click and
// the window height changes. The targets are anchored to the TOP LEFT so they
// do not move with it, but a capture taken mid-transition would be smeared
// across two layouts - so wait for the height to hold still.
status('Waiting for the window to settle after Chrome opened its "is debugging" notice');
const innerH = () => uiv.evaluate('return window.innerHeight');
let steady = 0, lastH = -1;
for (let i = 0; i < 24 && steady < 4; i++) {
  const h = innerH();
  steady = (h === lastH) ? steady + 1 : 0;
  lastH = h;
  uiv.sleep(250);
}
status(''); // settled - clear it rather than leave a stale message up

// ---- The model as the finder --------------------------------------------
const ask = (t) => 'Find the exact centre of the large ' + t.name + ' square target on the pale blue page: a rounded ' + t.name.toLowerCase() + ' square with a white square and a small cross at its centre. There are three of these squares, one orange, one purple and one teal - point at the centre of the ' + t.name + ' one, not at the small grey text label below it.';

const results = [];
for (let i = 0; i < info.targets.length; i++) {
  const t = info.targets[i];
  let m = null, err = null;
  // the status line never names a colour: it is in the capture the model is
  // about to be shown
  status('Asking the model: target ' + (i + 1) + ' of ' + info.targets.length);
  try {
    // no auto-wait, no retry: each attempt is billable and the page finished
    // rendering long ago
    m = uiv.ai.find(ask(t), {scope: 'browser'});
  } catch (e) {
    err = e.message;
  }
  if (!m) {
    results.push({t: t, found: false, err: err});
    uiv.log(t.name + ': the model returned no usable coordinates - ' + err, 'red');
    continue;
  }
  // browser scope answers in VIEWPORT css px, the same space the page and the
  // click use - no conversion, which is exactly why this demo is the control
  // for the desktop one
  const dx = m.x - t.x, dy = m.y - t.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const inView = m.x >= 0 && m.y >= 0 && m.x <= info.w && m.y <= info.h;
  if (inView) {
    uiv.evaluate('window.__uivbfVector(' + t.x + ',' + t.y + ',' + m.x + ',' + m.y + ',' + JSON.stringify(t.color) + ',' + JSON.stringify(t.name + ' ' + dist.toFixed(0) + 'px') + ')');
  } else {
    // outside the viewport there is nothing to click and the engine refuses
    // offscreen coordinates anyway - measure it, skip the click
    results.push({t: t, found: true, inView: false, m: m, dx: dx, dy: dy, dist: dist});
    uiv.log(t.name + ': the model answered ' + m.x + ',' + m.y + ' - OUTSIDE the ' + info.w + 'x' + info.h + ' viewport, so it was not clicked', 'red');
    continue;
  }
  status('Clicking the model point ' + (i + 1) + ' of ' + info.targets.length);
  const h = shoot(m);
  if (!h) {
    results.push({t: t, found: true, inView: true, landed: false, m: m, dx: dx, dy: dy, dist: dist});
    uiv.log(t.name + ': the model pointed ' + dist.toFixed(1) + 'px off the centre, but the click was never recorded', 'red');
    continue;
  }
  // the browser's own answer to "what did that click hit"
  const onTarget = h.el === t.name;
  uiv.evaluate('window.__uivbfMark(' + h.x + ',' + h.y + ',' + JSON.stringify(onTarget ? '#16a34a' : '#dc2626') + ',' + JSON.stringify(onTarget ? 'ON' : (h.el || 'page')) + ')');
  results.push({t: t, found: true, inView: true, landed: true, onTarget: onTarget, hitEl: h.el, m: m, dx: dx, dy: dy, dist: dist});
  uiv.log(t.name + ': model point off centre by ' + dist.toFixed(1) + 'px (bar ' + BAR + 'px), the click hit "' + (h.el || 'the page background') + '" - ' + (onTarget ? 'the right target' : 'NOT the target'), onTarget && dist <= BAR ? 'green' : 'red');
}

// ---- Analysis ----------------------------------------------------------
// Same shape as the desktop twin: fit found = a*truth + b per axis, take the
// overall factor off the longest baseline (a ratio over ~700px barely moves
// with model scatter, a slope does), and check that ONE transform explains
// every point - that is what separates broken arithmetic from a bad answer.
// A point outside the viewport still counts as a measurement; it just cannot
// be clicked.
function fit(pts) {
  const n = pts.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  pts.forEach(p => { sx += p[0]; sy += p[1]; sxx += p[0]*p[0]; sxy += p[0]*p[1]; });
  const den = n*sxx - sx*sx;
  if (!den) return null;
  const a = (n*sxy - sx*sy) / den;
  return {a: a, b: (sy - a*sx) / n};
}
const measured = results.filter(r => r.found);
const clickable = measured.filter(r => r.inView);
const fx = fit(measured.map(r => [r.t.x, r.m.x]));
const fy = fit(measured.map(r => [r.t.y, r.m.y]));
const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const mdx = mean(measured.map(r => r.dx)), mdy = mean(measured.map(r => r.dy));
const maxOff = measured.reduce((m, r) => Math.max(m, r.dist), 0);
const outside = measured.filter(r => !r.inView);
const lost = clickable.filter(r => !r.landed);
const wrongEl = clickable.filter(r => r.landed && !r.onTarget);
const resid = (r) => (fx && fy)
  ? Math.sqrt(Math.pow(r.m.x - (fx.a * r.t.x + fx.b), 2) + Math.pow(r.m.y - (fy.a * r.t.y + fy.b), 2))
  : 0;
const RESID_BAR = Math.max(BAR, Math.round(0.03 * info.w));
const maxResid = measured.reduce((m, r) => Math.max(m, resid(r)), 0);
const consistent = measured.length > 2 ? maxResid <= RESID_BAR : true;
const sortedOff = measured.map(r => r.dist).sort((a, b) => a - b);
const medOff = sortedOff[Math.floor(sortedOff.length / 2)];
const strays = measured.filter(r => Math.abs(r.dist - medOff) > RESID_BAR);
const scaleOff = (fx && Math.abs(fx.a - 1) > SLOPE_ALARM) || (fy && Math.abs(fy.a - 1) > SLOPE_ALARM);

// Name the arithmetic. Unlike the desktop path the suspects here are the
// capture rescale (one factor on BOTH axes) and the coordinate space the reply
// arrives in (a DIFFERENT factor per axis - the signature of 0-1000
// normalized coordinates that were never mapped back onto the image).
const factorNote = () => {
  if (!fx || !fy) return '';
  const d = info.dpr || 1;
  const near = (v, h) => Math.abs(v - h) <= Math.max(0.06, 0.04 * Math.abs(h));
  if (near(fx.a, 1000 / info.w) && near(fy.a, 1000 / info.h) && Math.abs(1000/info.w - 1000/info.h) > 0.1) {
    return ' Those two factors ARE 1000/viewport-width (' + (1000/info.w).toFixed(3) + ') and 1000/viewport-height (' + (1000/info.h).toFixed(3) + '): the model answered in 0-1000 NORMALIZED coordinates and they were never mapped back onto the image. That is a per-model trait, so switching the AI provider or model in Settings > AI changes it.';
  }
  // dpr and page zoom produce the SAME factor - the measurement cannot tell
  // them apart, so name both and give the one-keystroke test that can
  if (d !== 1 && near(fx.a, d) && near(fy.a, d)) return ' That factor IS this system dpr (' + d + '): the capture was never scaled back to CSS pixels. Two causes look identical from here - the rescale was skipped, or it used the PANEL dpi while the page renders at another one (page zoom, or a window on a monitor with different scaling). Press Ctrl+0 in the page and run again: if it passes then, zoom was the cause and nothing is wrong with the code.';
  if (d !== 1 && near(fx.a, 1/d) && near(fy.a, 1/d)) return ' That factor IS 1/dpr (1/' + d + '): the capture was scaled down twice.';
  if (Math.abs(fx.a - fy.a) > 0.1) return ' The two axes disagree, which a single rescale cannot do - suspect the coordinate space of the reply rather than the capture.';
  return ' It matches no factor this demo knows; if the page is not at 100% zoom, press Ctrl+0 and run again - the capture is rescaled with the PANEL dpi, so page zoom alone breaks it.';
};
const named = (scaleOff && consistent) ? factorNote() : '';

let pass = false, verdict;
if (!measured.length) {
  verdict = 'FAIL: no usable coordinates for any of the 3 squares. READ THE FIRST ERROR to tell the causes apart: an AI/provider message means a model problem (no vision grounding, call failing); an extension message (e.g. a rejected variable value) means the pipeline discarded coordinates the model DID return. ai.find-aimed clicking untested. First error: ' + results[0].err;
} else if (measured.length < 2) {
  verdict = 'INCONCLUSIVE: only 1 of 3 squares produced a point (off by ' + maxOff.toFixed(1) + 'px), too few to tell a fixed offset from a scaling error. ' + (3 - measured.length) + ' model call(s) returned nothing usable.';
} else if (scaleOff && consistent) {
  verdict = 'FAIL: the points are off by a FACTOR - ' + fx.a.toFixed(3) + 'x on x, ' + fy.a.toFixed(3) + 'x on y, and one transform explains all ' + measured.length + ' points to within ' + maxResid.toFixed(0) + 'px.' + named + ' This is arithmetic, not the model.';
} else if (!consistent) {
  const odd = (strays.length && strays.length < measured.length) ? ' The odd one out: ' + strays.map(r => r.t.name + ' (' + r.dist.toFixed(0) + 'px off, the others ' + medOff.toFixed(0) + 'px)').join(', ') + '.' : ' The points scatter rather than agreeing on anything.';
  verdict = 'FAIL: the points do NOT follow one transform - residuals up to ' + maxResid.toFixed(0) + 'px against a shared line (bar ' + RESID_BAR + 'px).' + odd + ' Broken arithmetic would hit every point the same way, so this is the model answering badly on individual targets, not the coordinate path.';
} else if (maxOff > BAR) {
  verdict = 'FAIL: every point sits off by about the same amount (mean dx=' + mdx.toFixed(1) + 'px dy=' + mdy.toFixed(1) + 'px, worst ' + maxOff.toFixed(1) + 'px, bar ' + BAR + 'px) with no factor across the page (' + fx.a.toFixed(3) + 'x / ' + fy.a.toFixed(3) + 'x) - a CONSTANT offset, so the capture the model saw was not the plain viewport (a cropped, scrolled or padded shot passed off as one).';
} else if (wrongEl.length) {
  verdict = 'FAIL: the model pointed well (worst ' + maxOff.toFixed(1) + 'px, inside the ' + BAR + 'px bar) but ' + wrongEl.length + ' of ' + clickable.length + ' clicks hit the wrong element (' + wrongEl.map(r => r.t.name + ' -> "' + (r.hitEl || 'page background') + '"').join(', ') + ') - so ai.find is right and the CLICK is landing elsewhere. Something is on top of the target, or the click coordinates are being shifted on the way in.';
} else if (lost.length) {
  verdict = 'FAIL: the model pointed inside the viewport (worst ' + maxOff.toFixed(1) + 'px) but ' + lost.length + ' of ' + clickable.length + ' clicks were never recorded at all - the click, not the coordinate, got lost.';
} else if (measured.length < 3) {
  verdict = 'PARTIAL: the coordinate path is right for the ' + measured.length + ' points measured (worst ' + maxOff.toFixed(1) + 'px, ' + fx.a.toFixed(3) + 'x / ' + fy.a.toFixed(3) + 'x), but ' + (3 - measured.length) + ' model call(s) returned nothing usable - a model/provider issue, not coordinates.';
} else {
  pass = true;
  verdict = 'PASS: all 3 points within ' + BAR + 'px of the true centre (worst ' + maxOff.toFixed(1) + 'px), every click hit its own square, and the points track the page 1:1 (' + fx.a.toFixed(3) + 'x / ' + fy.a.toFixed(3) + 'x, offset ' + fx.b.toFixed(0) + '/' + fy.b.toFixed(0) + 'px)' + (info.dpr && info.dpr !== 1 ? ' - measured at dpr ' + info.dpr + ', so the capture rescale really was exercised' : ' - NOTE: at dpr 1 the capture rescale is a multiplication by one, so this run does not clear it for a scaled or zoomed display') + '.' + (clickMode.indexOf('CDP') >= 0 ? '' : ' The clicks went through the synthetic DOM fallback, so trusted input was not tested - re-run in Chrome/Edge for that half.');
}

// ---- Report card -------------------------------------------------------
const padN = (v, n) => { let s = '' + v; while (s.length < n) s = ' ' + s; return s; };
const fmt = v => (v > 0 ? '+' : '') + v.toFixed(1);
const lines = ['AI.FIND CLICK ACCURACY REPORT - BROWSER SCOPE', '', 'self-test: click recorded at ' + selfTest.x + ',' + selfTest.y + ' on "' + selfTest.el + '"', 'click mode: ' + clickMode, '', 'uiv.ai.find({scope: browser}) on ' + browser + ': ' + (pass ? 'PASS' : 'FAIL'), 'target    model point    off-x   off-y     off   hit'];
results.forEach(r => {
  const head = ' ' + padN(r.t.name, 7) + '  ';
  if (!r.found) { lines.push(head + '--- no usable coordinates from the model ---'); return; }
  const state = !r.inView ? 'out' : (!r.landed ? 'lost' : (r.onTarget ? 'ON' : (r.hitEl || 'page')));
  lines.push(head + padN(r.m.x + ',' + r.m.y, 11) + '  ' + padN(fmt(r.dx), 6) + '  ' + padN(fmt(r.dy), 6) + '  ' + padN(r.dist.toFixed(1), 6) + '   ' + state);
});
if (outside.length) lines.push('hit: out = point outside the viewport, nothing there to click');
if (fx && fy) lines.push('fit: found = ' + fx.a.toFixed(3) + '*truth ' + (fx.b < 0 ? '- ' : '+ ') + Math.abs(fx.b).toFixed(0) + 'px (x), ' + fy.a.toFixed(3) + '*truth ' + (fy.b < 0 ? '- ' : '+ ') + Math.abs(fy.b).toFixed(0) + 'px (y)');
if (measured.length > 2) lines.push('one transform explains all ' + measured.length + ' points to within ' + maxResid.toFixed(0) + 'px (bar ' + RESID_BAR + 'px)' + (consistent ? ' - systematic' : ' - NO, individual bad answers'));
lines.push('bar ' + BAR + 'px = 2% of the ' + info.w + 'px viewport, min ' + HALF + 'px (half a square)');
lines.push('normalized-1000 would read ' + (1000/info.w).toFixed(3) + 'x on x and ' + (1000/info.h).toFixed(3) + 'x on y');
lines.push(verdict);
lines.push('');
lines.push('env: ' + browser + ' ' + OS_NAME + ' dpr=' + info.dpr + ' viewport=' + info.w + 'x' + info.h + ' | no XModule involved');
lines.push('desktop twin: LLM AI Commands/AccuracyTest_DesktopAiFind');

status('');
uiv.evaluate('window.__uivbfReport(' + JSON.stringify(lines.join('\\n')) + ',' + JSON.stringify(pass ? '#4ade80' : '#f87171') + ',' + JSON.stringify(pass ? 'PASS' : 'FAIL') + ')');
uiv.log('ai.find browser range: ' + clickable.filter(r => r.onTarget).length + '/' + info.targets.length + ' squares hit | worst point ' + (measured.length ? maxOff.toFixed(1) + 'px' : 'n/a') + ' | ' + clickMode.split(' (')[0], pass ? 'green' : 'orange');
if (!pass) throw new Error(verdict);
uiv.log('PASS: uiv.ai.find({scope: browser}) points at the true centre and uiv.browser.click hits it', 'green');
`
  },
  {
    fileName: 'DemoBrowserClick.js',
    // The plain-BClick regression range: five known viewport coordinates, and
    // the page itself reports which element each click actually hit. The
    // control for AccuracyTest_BrowserAiFind - when this passes and that
    // one fails, the coordinate came from the model path, not from the click.
    // No model calls and no XModule, so it is free to run and belongs in any
    // regression pass over CDP input.
    fileName: 'AccuracyTest_BrowserClick.js',
    path: 'Browser Vision (Chrome, Edge)/AccuracyTest_BrowserClick.js',
    title: 'AccuracyTest_BrowserClick (JS)',
    code: `// BClick Accuracy Range - trusted CDP clicks at five KNOWN viewport
// coordinates, each measured where it lands AND which element it hit. No
// finder, no model, no XModule: the only thing under test is
// uiv.browser.click.
//
// Two independent checks per shot, which is more than a desktop range can do:
//   the RECORDED coordinates say where the browser thinks the click was
//   the ELEMENT report says what the browser's own hit-testing found there
// A click that reports the right numbers but hits the page background means
// something is covering the target; wrong numbers mean the coordinates were
// transformed on the way in.
//
// This is the CONTROL for AccuracyTest_BrowserAiFind: if this passes and
// that one fails, the coordinate is wrong before the click. Costs nothing to
// run. Chrome/Edge only - CDP input is what it tests.

// uiv.browser.* is trusted CDP input, which Firefox has no debugger API for
// — exit with the pointer its siblings give instead of an E331 throw.
if (uiv.getVar('!BROWSER') === 'firefox') {
  uiv.exit('This demo measures uiv.browser.click (trusted CDP input), which Firefox does not support — see Browser plus Desktop Automation/AccuracyTest_DesktopClick (part 1) for the same range with real OS input.');
}

uiv.goto('https://ui.vision/');
uiv.window.resize(1024, 640);

// Fixed PIXEL positions anchored to the top left. Chrome opens its "is
// debugging" notice as soon as the first CDP click attaches the debugger, and
// that changes innerHeight - a fraction-based layout would move every target
// under the macro's feet. Anchored this way, an infobar moves nothing.
// Prime the trusted-input channel BEFORE the range is laid out: the first
// CDP event on a tab attaches the debugger, and Chrome's "is debugging" bar
// then shrinks the viewport by ~56px — a range built before that has its
// bottom rows (the calibration pad) clipped away, and the self-test click
// lands on nothing (measured live 2026-09-05). A hover is the cheapest
// event; the attachment then stays for the whole run.
if (uiv.getVar('!BROWSER') !== 'firefox') { uiv.browser.hover(1, 1); }
const info = uiv.evaluate(\`
var d = document, W = window.innerWidth, H = window.innerHeight;
var old = d.getElementById('uivbc'); if (old) old.remove();
var ov = d.createElement('div');
ov.id = 'uivbc';
ov.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:2147483647;background:#ecfeff;cursor:crosshair;';
var NS = 'http://www.w3.org/2000/svg';
var svg = d.createElementNS(NS, 'svg');
svg.setAttribute('width', W); svg.setAttribute('height', H);
ov.appendChild(svg); d.body.appendChild(ov);
function el(n, a, parent, text) {
  var e = d.createElementNS(NS, n);
  for (var k in a) e.setAttribute(k, a[k]);
  // ONLY tagged targets are hit-testable - labels and annotations must never
  // swallow a click, or a perfectly aimed shot reports "hit nothing".
  // 'all' on the tagged ones: parts 2 and 3 lay an INVISIBLE rect over each
  // word to catch the click, and an unpainted shape is not hit-tested under
  // the default visiblePainted.
  if (!a || a['data-uivt'] === undefined) e.style.pointerEvents = 'none';
  else e.style.pointerEvents = 'all';
  (parent || svg).appendChild(e);
  if (text) e.textContent = text;
  return e;
}
var F = 'Segoe UI,Helvetica,sans-serif';
el('text', {x:W/2, y:30, fill:'#164e63', 'font-size':21, 'font-weight':'bold', 'font-family':F, 'text-anchor':'middle'}, svg, 'Ui.Vision BClick Accuracy Range');
el('text', {x:W/2, y:50, fill:'#0e7490', 'font-size':12, 'font-family':F, 'text-anchor':'middle'}, svg, 'five trusted CDP clicks at known coordinates - the crosses report who was hit');
// PLUS/CROSS shapes in pink on pale cyan: distinct at a glance from the round
// bullseyes, the squares and the amber diamonds of the other three ranges.
var P = [[140,130],[560,240],[300,400],[880,330],[700,510]];
window.__uivbcTargets = [];
for (var i = 0; i < P.length; i++) {
  var cx = P[i][0], cy = P[i][1], nm = 'T' + (i+1);
  el('rect', {x:cx-46, y:cy-16, width:92, height:32, rx:5, fill:'#db2777', 'data-uivt':nm});
  el('rect', {x:cx-16, y:cy-46, width:32, height:92, rx:5, fill:'#db2777', 'data-uivt':nm});
  el('rect', {x:cx-9, y:cy-9, width:18, height:18, fill:'#ffffff', 'data-uivt':nm});
  el('text', {x:cx, y:cy+64, fill:'#0e7490', 'font-size':11, 'font-family':F, 'text-anchor':'middle'}, svg, 'target ' + (i+1));
  window.__uivbcTargets.push({n:i+1, name:nm, x:cx, y:cy});
}
var pad = {x:140, y:560};
el('rect', {x:pad.x-70, y:pad.y-20, width:140, height:40, rx:8, fill:'#cffafe', stroke:'#0891b2', 'data-uivt':'PAD'});
el('text', {x:pad.x, y:pad.y-1, fill:'#0e7490', 'font-size':12, 'font-family':F, 'text-anchor':'middle'}, svg, 'calibration pad');
el('text', {x:pad.x, y:pad.y+13, fill:'#67e8f9', 'font-size':10, 'font-family':F, 'text-anchor':'middle'}, svg, 'self-test click lands here');
window.__uivbcPad = pad;
window.__uivbcHits = [];
ov.addEventListener('mousedown', function (e) {
  var tag = '';
  try { tag = (e.target && e.target.getAttribute && e.target.getAttribute('data-uivt')) || ''; } catch (err) { tag = ''; }
  window.__uivbcHits.push({x:e.clientX, y:e.clientY, el:tag, trusted:!!e.isTrusted});
}, true);
window.__uivbcMark = function (hx, hy, color, label) {
  el('line', {x1:hx-14, y1:hy, x2:hx+14, y2:hy, stroke:color, 'stroke-width':1.5});
  el('line', {x1:hx, y1:hy-14, x2:hx, y2:hy+14, stroke:color, 'stroke-width':1.5});
  el('circle', {cx:hx, cy:hy, r:5, fill:'none', stroke:color, 'stroke-width':1.5});
  el('text', {x:hx+11, y:hy+16, fill:color, 'font-size':11, 'font-family':'Consolas,monospace'}, svg, label);
};
window.__uivbcReport = function (text, color, verdict) {
  var wrap = d.createElement('div');
  wrap.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483647;box-sizing:border-box;max-width:min(94vw,860px);background:rgba(15,23,42,0.95);border:1.5px solid ' + color + ';border-radius:8px;padding:10px 14px;';
  var head = d.createElement('div');
  head.style.cssText = 'display:flex;align-items:center;gap:9px;margin:0 0 7px 0;font:600 13px/1.2 system-ui,Segoe UI,sans-serif;color:' + color + ';';
  var lamp = d.createElement('span');
  lamp.style.cssText = 'width:13px;height:13px;border-radius:50%;background:' + color + ';box-shadow:0 0 9px ' + color + ';flex:none;';
  head.appendChild(lamp);
  head.appendChild(d.createTextNode(verdict || ''));
  wrap.appendChild(head);
  var box = d.createElement('pre');
  box.style.cssText = 'background:transparent;border:0;padding:0;margin:0;color:#e2e8f0;font:11px/1.5 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;';
  box.textContent = text;
  wrap.appendChild(box);
  ov.appendChild(wrap);
};
return {w:W, h:H, dpr:window.devicePixelRatio, targets:window.__uivbcTargets, pad:window.__uivbcPad};
\`);

const browser = uiv.getVar('!BROWSER');
const OS_NAME = uiv.getVar('!OS');
const status = (t) => uiv.banner(t, {position: 'bottom'});
const hits = () => uiv.evaluate('return window.__uivbcHits');
// CDP dispatches at the coordinates it is given, so anything beyond rounding
// is a real transform - this bar is much tighter than a desktop range needs
const TOL = 2;

if (info.w < 960 || info.h < 560) {
  throw new Error('The viewport is ' + info.w + 'x' + info.h + ' - too small for this range, which needs at least 960x560 (targets sit at fixed positions up to 880,510). Enlarge the window, or narrow the side panel, and run again.');
}
uiv.log('Range ' + info.w + 'x' + info.h + ' | ' + browser + ' on ' + OS_NAME + ' | dpr=' + info.dpr + ' | tolerance ' + TOL + 'px', 'blue');

function shoot(px, py) {
  const before = hits().length;
  uiv.browser.click(px, py);
  for (let i = 0; i < 12; i++) {
    const h = hits();
    if (h.length > before) return h[h.length - 1];
    uiv.sleep(250);
  }
  return null;
}

// Self-test on the pad: proves the recorder and the CDP path before anything
// is measured. On Firefox (no CDP) uiv.browser.click throws here, and that is
// the honest answer - this range tests trusted input, which Firefox has no
// equivalent for.
status('Checking the measuring rig');
let selfTest;
try {
  selfTest = shoot(info.pad.x, info.pad.y);
} catch (e) {
  throw new Error('uiv.browser.click is not available here (' + e.message + '). This range tests TRUSTED CDP input, which is Chrome/Edge only - on Firefox use Browser plus Desktop Automation/AccuracyTest_DesktopClick (part 1) for real OS clicks instead.');
}
if (!selfTest) {
  throw new Error('Self-test failed: a CDP click on the calibration pad was never recorded, so nothing was measured. Another extension may be blocking the debugger attach, or the tab lost the overlay.');
}
uiv.log('Self-test OK - click recorded at ' + selfTest.x + ',' + selfTest.y + ' on "' + selfTest.el + '"' + (selfTest.trusted ? ' [trusted]' : ' [synthetic]'), 'blue');

// That first click attached the debugger, so Chrome is opening its notice and
// the window height is about to change. The targets do not move with it, but a
// shot fired mid-transition could be measured against a moving page.
status('Waiting for the window to settle after Chrome opened its "is debugging" notice');
const innerH = () => uiv.evaluate('return window.innerHeight');
let steady = 0, lastH = -1;
for (let i = 0; i < 24 && steady < 4; i++) {
  const h = innerH();
  steady = (h === lastH) ? steady + 1 : 0;
  lastH = h;
  uiv.sleep(250);
}
status('');

const shots = [];
for (let i = 0; i < info.targets.length; i++) {
  const t = info.targets[i];
  status('Clicking target ' + (i + 1) + ' of ' + info.targets.length);
  const h = shoot(t.x, t.y);
  if (!h) {
    shots.push({t: t, miss: true, dx: 0, dy: 0, dist: 9999});
    uiv.log('Target ' + t.n + ': the click was never recorded', 'red');
    continue;
  }
  const dx = h.x - t.x, dy = h.y - t.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const onTarget = h.el === t.name;
  uiv.evaluate('window.__uivbcMark(' + h.x + ',' + h.y + ',' + JSON.stringify(onTarget && dist <= TOL ? '#16a34a' : '#dc2626') + ',' + JSON.stringify(onTarget ? 'ON' : (h.el || 'page')) + ')');
  shots.push({t: t, hit: h, dx: dx, dy: dy, dist: dist, onTarget: onTarget, hitEl: h.el, trusted: h.trusted});
  uiv.log('Target ' + t.n + ': aimed ' + t.x + ',' + t.y + ' recorded ' + h.x + ',' + h.y + ' (' + dist.toFixed(1) + 'px), hit "' + (h.el || 'the page background') + '" - ' + (onTarget ? 'the right target' : 'NOT the target'), onTarget && dist <= TOL ? 'green' : 'red');
}

// ---- Analysis ----------------------------------------------------------
function fit(pts) {
  const n = pts.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  pts.forEach(p => { sx += p[0]; sy += p[1]; sxx += p[0]*p[0]; sxy += p[0]*p[1]; });
  const den = n*sxx - sx*sx;
  if (!den) return null;
  const a = (n*sxy - sx*sy) / den;
  return {a: a, b: (sy - a*sx) / n};
}
const landed = shots.filter(s => !s.miss);
const missed = shots.length - landed.length;
const wrongEl = landed.filter(s => !s.onTarget);
const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const mdx = mean(landed.map(s => s.dx)), mdy = mean(landed.map(s => s.dy));
const maxDist = landed.reduce((m, s) => Math.max(m, s.dist), 0);
const fx = fit(landed.map(s => [s.t.x, s.dx]));
const fy = fit(landed.map(s => [s.t.y, s.dy]));
const scaleOff = (fx && Math.abs(fx.a) > 0.02) || (fy && Math.abs(fy.a) > 0.02);
const untrusted = landed.filter(s => !s.trusted);

let p1pass = false, verdict;
if (missed) {
  verdict = 'FAIL: ' + missed + ' of ' + shots.length + ' clicks were never recorded - CDP input is not reaching this page at all. Another extension may be holding the debugger, or the tab changed under the run.';
} else if (scaleOff) {
  verdict = 'FAIL: the error GROWS with distance (slope ' + fx.a.toFixed(3) + ' on x, ' + fy.a.toFixed(3) + ' on y) - the coordinates are being SCALED on the way into CDP, about ' + (1 + fx.a).toFixed(3) + 'x on x and ' + (1 + fy.a).toFixed(3) + 'x on y. CDP takes viewport CSS pixels, so nothing should scale them' + ((info.dpr || 1) !== 1 ? ' - and this display runs at dpr ' + info.dpr + ', the usual source of a stray factor.' : '.');
} else if (maxDist > TOL) {
  verdict = 'FAIL: a CONSTANT offset of dx=' + mdx.toFixed(1) + 'px dy=' + mdy.toFixed(1) + 'px on every click (worst ' + maxDist.toFixed(1) + 'px) - the coordinates are being shifted on the way in. A viewport that moved between measuring and clicking (an infobar opening) does exactly this.';
} else if (wrongEl.length) {
  verdict = 'FAIL: the coordinates are right (worst ' + maxDist.toFixed(1) + 'px) but ' + wrongEl.length + ' of ' + landed.length + ' clicks hit the wrong element (' + wrongEl.map(s => 'target ' + s.t.n + ' -> "' + (s.hitEl || 'page background') + '"').join(', ') + ') - so the click arrives where it should and something else receives it. Something is covering the target.';
} else if (untrusted.length) {
  verdict = 'FAIL: every click landed correctly, but ' + untrusted.length + ' of ' + landed.length + ' arrived as SYNTHETIC events (isTrusted false) - the CDP attach was vetoed and the engine fell back to DOM clicks. They work here, but pages that check isTrusted will refuse them.';
} else {
  p1pass = true;
  verdict = 'PASS: all ' + shots.length + ' clicks within ' + TOL + 'px of their coordinate, every one hit its own target, and every one arrived as a trusted event.';
}

const padN = (v, n) => { let s = '' + v; while (s.length < n) s = ' ' + s; return s; };
const fmt = v => (v > 0 ? '+' : '') + v.toFixed(1);
const lines = ['BCLICK ACCURACY REPORT - BROWSER SCOPE', '', 'self-test: recorded at ' + selfTest.x + ',' + selfTest.y + ' on "' + selfTest.el + '"', '', 'PART 1 - clicks at known coordinates: ' + (p1pass ? 'PASS' : 'FAIL'), 'shot   aim          recorded        dx      dy    dist   hit'];
shots.forEach(s => {
  lines.push('  ' + s.t.n + '   ' + padN(s.t.x + ',' + s.t.y, 9) + '   ' + (s.miss
    ? '--- never recorded ---'
    : padN(s.hit.x + ',' + s.hit.y, 9) + '   ' + padN(fmt(s.dx), 6) + '  ' + padN(fmt(s.dy), 6) + '  ' + padN(s.dist.toFixed(1), 5) + '   ' + (s.onTarget ? 'ON' : (s.hitEl || 'page'))));
});
if (fx && fy) lines.push('error vs. aim: slope ' + fx.a.toFixed(3) + ' on x, ' + fy.a.toFixed(3) + ' on y (0.000 = right)');
lines.push('tolerance ' + TOL + 'px - CDP dispatches at the coordinates it is given');
lines.push(verdict);
uiv.log('Part 1: ' + (p1pass ? 'PASS' : 'FAIL') + ' - ' + verdict, p1pass ? 'green' : 'orange');

// ---- The word page, shared by parts 2 and 3 -----------------------------
// Both finders read PIXELS, so they need contrast: the overlay goes white and
// black words are laid out at fixed positions. Each word also gets an
// INVISIBLE tagged rect over its measured box, which is what turns "did the
// click land inside the word" into the browser's own hit-test answer instead of
// an arithmetic guess - the one thing a desktop range cannot ask.
const wordPage = (title, words, positions) => uiv.evaluate(\`
var d = document, W = window.innerWidth, H = window.innerHeight;
var ov = d.getElementById('uivbc');
while (ov.firstChild) ov.removeChild(ov.firstChild);
ov.style.background = '#ffffff';
var NS = 'http://www.w3.org/2000/svg';
var svg = d.createElementNS(NS, 'svg');
svg.setAttribute('width', W); svg.setAttribute('height', H);
ov.appendChild(svg);
function el(n, a, parent, text) {
  var e = d.createElementNS(NS, n);
  for (var k in a) e.setAttribute(k, a[k]);
  if (!a || a['data-uivt'] === undefined) e.style.pointerEvents = 'none';
  else e.style.pointerEvents = 'all';
  (parent || svg).appendChild(e);
  if (text) e.textContent = text;
  return e;
}
el('text', {x:W/2, y:30, fill:'#0e7490', 'font-size':14, 'font-family':'Segoe UI,sans-serif', 'text-anchor':'middle'}, svg, \${JSON.stringify(title)});
var words = \${JSON.stringify(words)}, pos = \${JSON.stringify(positions)};
window.__uivbcWords = {};
for (var i = 0; i < words.length; i++) {
  var cx = pos[i][0], cy = pos[i][1];
  // same rendering the shipped range_*_dpi_96 images were captured from, so
  // part 3 can match them without shipping new pictures
  var e = el('text', {x:cx, y:cy, fill:'#111111', 'font-size':26, 'font-family':'Arial,Helvetica,sans-serif', 'font-weight':'600', 'letter-spacing':'1', 'text-anchor':'middle'}, svg, words[i]);
  var r = e.getBoundingClientRect();
  var box = {x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height)};
  window.__uivbcWords[words[i]] = box;
  // the invisible catcher, 2px of slack on every side like the desktop range's
  // in-box test allowed
  el('rect', {x:box.left-2, y:box.top-2, width:box.width+4, height:box.height+4, fill:'none', 'data-uivt':words[i]});
}
window.__uivbcHits = [];
window.__uivbcBox = function (l, t, wd, ht, color) {
  el('rect', {x:l, y:t, width:wd, height:ht, fill:'none', stroke:color, 'stroke-width':1.5, 'stroke-dasharray':'4 3'});
};
window.__uivbcMark = function (hx, hy, color, label) {
  el('line', {x1:hx-14, y1:hy, x2:hx+14, y2:hy, stroke:color, 'stroke-width':1.5});
  el('line', {x1:hx, y1:hy-14, x2:hx, y2:hy+14, stroke:color, 'stroke-width':1.5});
  el('circle', {cx:hx, cy:hy, r:5, fill:'none', stroke:color, 'stroke-width':1.5});
  el('text', {x:hx+11, y:hy+16, fill:color, 'font-size':11, 'font-family':'Consolas,monospace'}, svg, label);
};
window.__uivbcReport = function (text, color, verdict) {
  var wrap = d.createElement('div');
  wrap.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483647;box-sizing:border-box;max-width:min(94vw,860px);background:rgba(15,23,42,0.95);border:1.5px solid ' + color + ';border-radius:8px;padding:10px 14px;';
  var head = d.createElement('div');
  head.style.cssText = 'display:flex;align-items:center;gap:9px;margin:0 0 7px 0;font:600 13px/1.2 system-ui,Segoe UI,sans-serif;color:' + color + ';';
  var lamp = d.createElement('span');
  lamp.style.cssText = 'width:13px;height:13px;border-radius:50%;background:' + color + ';box-shadow:0 0 9px ' + color + ';flex:none;';
  head.appendChild(lamp);
  head.appendChild(d.createTextNode(verdict || ''));
  wrap.appendChild(head);
  var box = d.createElement('pre');
  box.style.cssText = 'background:transparent;border:0;padding:0;margin:0;color:#e2e8f0;font:11px/1.5 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;';
  box.textContent = text;
  wrap.appendChild(box);
  ov.appendChild(wrap);
};
return window.__uivbcWords;
\`);

// One shot at a finder's match, scored the same way for OCR and image search:
// how far the match centre is from the word's true centre, and which element
// the click actually reached.
const shootAtMatch = (m, truth, label) => {
  const off = Math.sqrt(Math.pow(m.x - truth.x, 2) + Math.pow(m.y - truth.y, 2));
  uiv.evaluate('window.__uivbcBox(' + m.rect.left + ',' + m.rect.top + ',' + m.rect.width + ',' + m.rect.height + ',' + JSON.stringify('#2563eb') + ')');
  const h = shoot(m.x, m.y);
  if (!h) return {found: true, landed: false, off: off};
  const onWord = h.el === label;
  uiv.evaluate('window.__uivbcMark(' + h.x + ',' + h.y + ',' + JSON.stringify(onWord ? '#16a34a' : '#dc2626') + ',' + JSON.stringify(onWord ? label + ' HIT' : (h.el || 'page')) + ')');
  return {found: true, landed: true, onWord: onWord, hitEl: h.el, off: off, dx: h.x - truth.x, dy: h.y - truth.y};
};

// ---- PART 2: x,y from OCR ----------------------------------------------
// The Javascript OCR on purpose: it is the reader that needs no XModule, which
// is what keeps this range runnable anywhere - and reading is not what is being
// measured here, the COORDINATE it returns is. A word it cannot read makes the
// part inconclusive rather than failed, and the report names the engine, since
// a miss means something different for each one.
const OCR_ENGINE = 'javascript';
const WORDS = ['ZEBRA', 'MOCHA', 'PIXEL'];
let truth2 = null, p2note = '';
const part2 = [];
try {
  truth2 = wordPage('part 2: browser-scope OCR must find these words - then uiv.browser.click clicks them', WORDS, [[190, 130], [560, 300], [860, 460]]);
} catch (e) {
  p2note = 'PART 2 skipped: ' + e.message;
  uiv.log(p2note, 'orange');
}
if (truth2) {
  uiv.log("Part 2: OCR ({engine: '" + OCR_ENGINE + "'}) reads the VIEWPORT capture, then the clicks go to what it returned...");
  for (let i = 0; i < WORDS.length; i++) {
    const w = WORDS[i], t = truth2[w];
    status('Part 2: OCR is reading the page, word ' + (i + 1) + ' of ' + WORDS.length);
    // no area needed: a browser-scope search sees the viewport and nothing
    // else, so unlike a desktop range it cannot match another window
    const found = uiv.ocr.findTexts(w, {scope: 'browser', engine: OCR_ENGINE, required: false, timeout: 10});
    if (!found.length) {
      part2.push({w: w, found: false});
      uiv.evaluate('window.__uivbcBox(' + t.left + ',' + t.top + ',' + t.width + ',' + t.height + ',' + JSON.stringify('#dc2626') + ')');
      uiv.log('Word ' + w + ": NOT found by OCR {engine: '" + OCR_ENGINE + "'}", 'red');
      continue;
    }
    const r = shootAtMatch(found[0], t, w);
    r.w = w;
    part2.push(r);
    uiv.log('Word ' + w + ': OCR box centre off by ' + r.off.toFixed(1) + 'px, the click hit "' + (r.hitEl || 'the page background') + '" - ' + (r.onWord ? 'INSIDE the word' : 'NOT the word'), r.onWord ? 'green' : 'red');
  }
}
const p2found = part2.filter(p => p.found);
const p2in = p2found.filter(p => p.onWord);
const p2pass = !!truth2 && p2found.length >= 2 && p2found.every(p => p.landed && p.onWord);
let p2verdict;
if (!truth2) p2verdict = p2note;
else if (p2pass) p2verdict = 'PASS: OCR found ' + p2found.length + '/' + WORDS.length + ' words and every click landed inside its word';
else if (!p2found.length) p2verdict = "FAIL: OCR {engine: '" + OCR_ENGINE + "'} read none of the " + WORDS.length + ' words - an OCR problem (engine or rendering), NOT a coordinate one; OCR-aimed clicking untested';
else if (p2found.length < 2) p2verdict = 'INCONCLUSIVE: OCR found only ' + p2found.length + '/' + WORDS.length + ' words - too few to judge OCR-aimed clicking';
else p2verdict = 'FAIL: ' + (p2found.length - p2in.length) + ' of ' + p2found.length + ' found words were clicked OUTSIDE their box - the OCR coordinate path (capture rescale / box mapping) is off, even though part 1 ' + (p1pass ? 'passed' : 'also failed');

lines.push('');
lines.push("PART 2 - x,y from OCR {engine: '" + OCR_ENGINE + "'}, browser scope: " + (truth2 ? (p2pass ? 'PASS' : 'FAIL') : 'SKIPPED'));
if (truth2) {
  lines.push('word     ocr-off  click-dx  click-dy  in-word');
  part2.forEach(p => {
    lines.push(' ' + padN(p.w, 6) + '  ' + (!p.found ? '--- not found by OCR ---' : (!p.landed ? '--- click never recorded ---' : padN(p.off.toFixed(1), 7) + '  ' + padN(fmt(p.dx), 8) + '  ' + padN(fmt(p.dy), 8) + '  ' + padN(p.onWord ? 'YES' : 'NO', 7))));
  });
}
lines.push(p2verdict);

// ---- PART 3: x,y from IMAGE SEARCH -------------------------------------
// The same word images that SHIP with the extension (preinstall/vision/
// range_*_dpi_96.png, captured at dpr 1), which is why the words above are
// rendered in exactly that font and size. minScore 0.75: similar bold words
// cross-match around 0.65-0.71, so the bar has to reject those and still
// tolerate cross-system font rendering.
const IMAGES = [
  {word: 'ROBOT', image: 'range_robot_dpi_96.png'},
  {word: 'LASER', image: 'range_laser_dpi_96.png'},
  {word: 'TIGER', image: 'range_tiger_dpi_96.png'}
];
let truth3 = null, p3note = '';
const p3errs = [];
const part3 = [];
try {
  truth3 = wordPage('part 3: image search must find these words (shipped images) - then uiv.browser.click clicks them', IMAGES.map(i => i.word), [[190, 460], [560, 130], [860, 300]]);
} catch (e) {
  p3note = 'PART 3 skipped: ' + e.message;
  uiv.log(p3note, 'orange');
}
if (truth3) {
  uiv.log('Part 3: image search scans the VIEWPORT capture for the shipped word images...');
  for (let i = 0; i < IMAGES.length; i++) {
    const it = IMAGES[i], t = truth3[it.word];
    status('Part 3: image search is scanning the page, image ' + (i + 1) + ' of ' + IMAGES.length);
    let found = [];
    try {
      found = uiv.findImages(it.image, {scope: 'browser', minScore: 0.75, required: false, timeout: 10});
    } catch (e) {
      // e.g. the image is missing in this install (the preinstall offer was
      // declined) - a missing file is not a coordinate failure. Collected per
      // image: with several images missing, the verdict must name every one
      p3errs.push(it.image + ': ' + e.message);
      uiv.log('Image ' + it.image + ': ' + e.message, 'red');
    }
    if (!found.length) {
      part3.push({w: it.word, found: false});
      uiv.evaluate('window.__uivbcBox(' + t.left + ',' + t.top + ',' + t.width + ',' + t.height + ',' + JSON.stringify('#dc2626') + ')');
      uiv.log('Image ' + it.word + ': no match with score >= 0.75', 'red');
      continue;
    }
    const r = shootAtMatch(found[0], t, it.word);
    r.w = it.word;
    r.score = found[0].score;
    part3.push(r);
    uiv.log('Image ' + it.word + ': score ' + (r.score || 0).toFixed(2) + ', centre off by ' + r.off.toFixed(1) + 'px, the click hit "' + (r.hitEl || 'the page background') + '" - ' + (r.onWord ? 'INSIDE the word' : 'NOT the word'), r.onWord ? 'green' : 'red');
  }
}
const p3found = part3.filter(p => p.found);
const p3in = p3found.filter(p => p.onWord);
const p3pass = !!truth3 && p3found.length >= 2 && p3found.every(p => p.landed && p.onWord);
let p3verdict;
if (!truth3) p3verdict = p3note;
else if (p3pass) p3verdict = 'PASS: image search found ' + p3found.length + '/' + IMAGES.length + ' shipped word images and every click landed inside its word';
else if (!p3found.length) p3verdict = 'FAIL: image search matched none of the ' + IMAGES.length + ' shipped images' + (p3errs.length ? ' (' + p3errs.join('; ') + ')' : '') + ' - a vision problem (images missing, or the viewport capture scaled differently from the shipped dpr-1 pictures); image-aimed clicking untested';
else if (p3found.length < 2) p3verdict = 'INCONCLUSIVE: image search matched only ' + p3found.length + '/' + IMAGES.length + ' images' + (p3errs.length ? ' (' + p3errs.join('; ') + ')' : '') + ' - too few to judge image-aimed clicking';
else p3verdict = 'FAIL: ' + (p3found.length - p3in.length) + ' of ' + p3found.length + ' matched images were clicked OUTSIDE their word - the vision coordinate path (capture rescale / match mapping) is off';

lines.push('');
lines.push('PART 3 - x,y from image search (shipped images), browser scope: ' + (truth3 ? (p3pass ? 'PASS' : 'FAIL') : 'SKIPPED'));
if (truth3) {
  lines.push('word     score  img-off  click-dx  click-dy  in-word');
  part3.forEach(p => {
    lines.push(' ' + padN(p.w, 6) + '  ' + (!p.found ? '--- no match with score >= 0.75 ---' : (!p.landed ? '--- click never recorded ---' : padN((p.score || 0).toFixed(2), 5) + '  ' + padN(p.off.toFixed(1), 7) + '  ' + padN(fmt(p.dx), 8) + '  ' + padN(fmt(p.dy), 8) + '  ' + padN(p.onWord ? 'YES' : 'NO', 7))));
  });
}
lines.push(p3verdict);
lines.push('');
lines.push('env: ' + browser + ' ' + OS_NAME + ' dpr=' + info.dpr + ' viewport=' + info.w + 'x' + info.h + ' | no XModule involved');
lines.push('ai.find version: LLM AI Commands/AccuracyTest_BrowserAiFind');

const overall = p1pass && p2pass && p3pass;
status('');
uiv.evaluate('window.__uivbcReport(' + JSON.stringify(lines.join('\\n')) + ',' + JSON.stringify(overall ? '#4ade80' : '#f87171') + ',' + JSON.stringify(overall ? 'PASS' : 'FAIL') + ')');
uiv.log('BClick range: part 1 ' + landed.filter(s => s.onTarget && s.dist <= TOL).length + '/' + shots.length + ' clean | part 2 OCR ' + (truth2 ? p2in.length + '/' + WORDS.length : 'skipped') + ' | part 3 image ' + (truth3 ? p3in.length + '/' + IMAGES.length : 'skipped'), overall ? 'green' : 'orange');
if (!overall) throw new Error('Part 1: ' + verdict + ' | Part 2: ' + p2verdict + ' | Part 3: ' + p3verdict);
uiv.log('PASS: known-coordinate, OCR-aimed and image-aimed browser clicks all land where they should', 'green');
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
// uiv.browser.hover while it is held drags, and .up releases — the corner
// coordinates are two numbers in a loop.
if (uiv.getVar('!BROWSER') === 'firefox') {
  uiv.exit('This demo uses trusted CDP input (uiv.browser.*), which Firefox does not support — see Browser plus Desktop Automation/DemoDesktopClick for the same drawing with real OS input.');
}
const t = uiv.browser;
const FIND = {};
const find = (name, minScore) => uiv.findImage(name, minScore ? Object.assign({ minScore: minScore }, FIND) : FIND);

uiv.goto('https://ui.vision/demo/draw');
uiv.page.click('link=this link');

// classic visualAssert -> the finder throws if the canvas is not there
find('draw_canvas_dpi_96.png');

// The STABLE select+crop icons at the top of the toolbar anchor the composed
// relative clicks below — found first, so the + retry can search the
// toolbar's own column.
const tools = find('draw_toolbar_top_dpi_96.png');

// 0.85, not the 0.6 default: while sketch.io is still loading, checkerboard
// corners clear the default bar and the finder returns junk INSTANTLY
// instead of waiting for the real + button (0.95+ once rendered). One RETRY
// at a lower bar limited to the toolbar column: rendering wobble has scored
// the icon as low as 0.67, and on macOS the icon scored 0.80 while a
// lookalike in the RIGHT-hand toolbar scored the same (measured live), so a
// page-wide lower bar would click the wrong one — see the XClick twin of
// this demo for the numbers.
const col = {
  x: tools.rect.left - tools.rect.width,
  y: tools.rect.top,
  width: 3 * tools.rect.width,
  height: uiv.evaluate('return window.innerHeight') - tools.rect.top
};
let plusBtn;
try { plusBtn = find('draw_plus_dpi_96.png', 0.85); }
catch (e) { plusBtn = uiv.findImage('draw_plus_dpi_96.png', { minScore: 0.65, area: col }); }
t.click(plusBtn);
// sketch.io's "Get the most out of Sketchpad" upsell pops over the bottom
// of the pad after a few visits and covers the New dialog's red Create
// button (measured live: Create scored 0.49 behind it). Dismiss it through
// its own close icon — the one nearest the upsell's heading — before looking.
uiv.evaluate("const h = Array.from(document.querySelectorAll('h2')).find(e => /most out of Sketchpad/i.test(e.textContent || '')); if (h) { const hr = h.getBoundingClientRect(); const near = Array.from(document.querySelectorAll('.sketch-icon-close')).map(c => ({ c: c, d: Math.hypot(c.getBoundingClientRect().x - hr.x, c.getBoundingClientRect().y - hr.y) })).sort((a, b) => a.d - b.d)[0]; if (near) near.c.click(); }");
t.click(find('draw_redbutton_dpi_96.png'));

// COMPOSED relative clicks (green/pink relative images used to do this):
// the pencil icon changes shape with the chosen color, so
// both targets are anchored on the stable select+crop icons ('tools' from
// above). The offsets are in units of the anchor's own measured
// rect, so they scale with the page — the same adaptation the classic pink
// box got from the vision engine. The pencil sits one anchor-height below.
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
// The text tool's 'T' glyph is thin: on a fractionally scaled display (1.25,
// measured live 2026-09-05) its picture scores 0.56 against the 0.60 bar
// while every other icon still matches. It sits 2.86 anchor heights below
// the select+crop anchor (tool slots are 40px, the anchor is 63px tall), so
// the composed offset that already places the pencil is the fallback — the
// same idiom, a few slots further down.
let textTool;
try { textTool = find('draw_text1_dpi_96.png'); }
catch (e) {
  textTool = uiv.offset(tools, 0, Math.round(2.86 * tools.rect.height));
  uiv.log('text tool picture scored below the bar on this display — using the composed offset from the toolbar anchor instead', 'orange');
}
t.click(textTool);
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
    fileName: 'DemoDesktopClick.js',
    path: 'Browser plus Desktop Automation/DemoDesktopClick.js',
    title: 'DemoDesktopClick (JS)',
    code: `// Port of Classic/Real User Input/DemoXClick.
// Draws a square on a canvas, then types a caption — with real OS mouse input, which needs the XModule and a visible browser window
//
// A drag is press, move, release: uiv.desktop.down holds the button, every
// uiv.desktop.mouse.move while it is held drags, and .up releases. The classic
// macro does the same with #down/#move/#up value modifiers, and recomputes the
// corner coordinates in four separate executeScript_Sandbox commands — here
// they are two numbers in a loop.
// Vision stays in BROWSER scope, like the classic macro: images are found in
// a screenshot of the TAB (viewport pixels), and uiv.desktop.* converts a
// browser-scope match — or bare numbers with {scope: 'browser'} — to screen
// pixels itself for the real input. Desktop-scope searching is only for
// automating things OUTSIDE the browser; used here it just drags in the
// screen capture's problems (GUI cover, other windows' lookalikes, dpi
// rescaling on scaled displays) — see DemoDesktopDrag.
const t = uiv.desktop;
const B = { scope: 'browser' };   // bare-number points derived from matches
const find = (name, minScore) => minScore ? uiv.findImage(name, { minScore: minScore }) : uiv.findImage(name);

// OS input goes to whatever window is in front
uiv.window.focus();
uiv.goto('https://ui.vision/demo/draw');
uiv.page.click('link=this link');

// classic visualAssert -> the finder throws if the canvas is not there
find('draw_canvas_dpi_96.png');

// The toolbar anchor is found FIRST (the pencil/text clicks below reuse it):
// the select+crop icons at the top of the toolbar are the stable part of it,
// and once they render, the icon font has loaded.
const tools = find('draw_toolbar_top_dpi_96.png');

// 0.85, not the 0.6 default: while sketch.io is still loading its icon
// font, checkerboard corners score ~0.78 — above the default bar, so the
// finder returns junk INSTANTLY instead of waiting for the real + button
// (which scores 0.95+ once rendered). The higher bar makes the finder's
// built-in wait do its job on a cold page load. One RETRY at a lower bar:
// rendering wobble (icon font mid-load, fractional scaling) has scored the
// icon as low as 0.67 measured live — and lowering the bar page-wide let a
// lookalike elsewhere win (also measured live), so the retry searches only
// the toolbar's own column, where the + button is the only plus. Everything
// in viewport pixels, sizes in units of the anchor's measured rect; the
// engine clips the area to the screenshot.
const col = {
  x: tools.rect.left - tools.rect.width,
  y: tools.rect.top,
  width: 3 * tools.rect.width,
  height: uiv.evaluate('return window.innerHeight') - tools.rect.top
};
let plusBtn;
try { plusBtn = find('draw_plus_dpi_96.png', 0.85); }
catch (e) { plusBtn = uiv.findImage('draw_plus_dpi_96.png', { minScore: 0.65, area: col }); }
t.click(plusBtn);
// sketch.io's "Get the most out of Sketchpad" upsell pops over the bottom
// of the pad after a few visits and covers the New dialog's red Create
// button (measured live: Create scored 0.49 behind it). Dismiss it through
// its own close icon — the one nearest the upsell's heading — before looking.
uiv.evaluate("const h = Array.from(document.querySelectorAll('h2')).find(e => /most out of Sketchpad/i.test(e.textContent || '')); if (h) { const hr = h.getBoundingClientRect(); const near = Array.from(document.querySelectorAll('.sketch-icon-close')).map(c => ({ c: c, d: Math.hypot(c.getBoundingClientRect().x - hr.x, c.getBoundingClientRect().y - hr.y) })).sort((a, b) => a.d - b.d)[0]; if (near) near.c.click(); }");
t.click(find('draw_redbutton_dpi_96.png'));

// COMPOSED relative clicks — see DemoBrowserClick: the pencil icon changes
// shape, so both targets are anchored on the stable select+crop icons
// ('tools' from above), with offsets in units of the anchor's own measured
// rect. The match's browser scope travels through uiv.offset, and
// uiv.desktop.* converts it to the screen.
t.click(uiv.offset(tools, 0, Math.round(0.95 * tools.rect.height)));
t.type('\${KEY_ESC}');

const start = uiv.offset(tools, Math.round(6 * tools.rect.width), Math.round(1.2 * tools.rect.height));
uiv.log(\`Starting point: x=\${start.x} y=\${start.y}\`, 'green');

// draw a 100 x 100 square, one edge per step — viewport-space points, so
// every desktop call carries {scope: 'browser'}
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
  t.down(x, y, B);
  x += edge.dx;
  y += edge.dy;
  t.move(x, y, B);      // still held -> this drags
  t.up(x, y, B);
  uiv.log(\`drew the \${edge.name} edge to \${x},\${y}\`);
});

// --- add some text ----------------------------------------------------------
// The text tool's 'T' glyph is thin: on a fractionally scaled display (1.25,
// measured live 2026-09-05) its picture scores 0.56 against the 0.60 bar
// while every other icon still matches. It sits 2.86 anchor heights below
// the select+crop anchor (tool slots are 40px, the anchor is 63px tall), so
// the composed offset that already places the pencil is the fallback — the
// same idiom, a few slots further down.
let textTool;
try { textTool = find('draw_text1_dpi_96.png'); }
catch (e) {
  textTool = uiv.offset(tools, 0, Math.round(2.86 * tools.rect.height));
  uiv.log('text tool picture scored below the bar on this display — using the composed offset from the toolbar anchor instead', 'orange');
}
t.click(textTool);
t.type('\${KEY_ESC}');

// click the canvas where the text should start
y += 180;
t.click(x, y, B);
t.type('Demo completed.');

// click once more to close the text menu
y -= 150;
t.click(x, y, B);

// confirm the text really appeared (@0.4 relaxes the global confidence)
find('draw_checkresult1_dpi_96.png', 0.4);
uiv.log('DemoDesktopClick (JS) completed', '#shownotification');
`
  },
  {
    // the XClick twin of the root "Draw a cat🐱" welcome demo: same cat,
    // real OS input instead of CDP — so it runs on Firefox too. Live-tested
    // on Windows + Firefox.
    fileName: 'Draw a cat🐱 - desktop input version.js',
    path: 'Browser plus Desktop Automation/Draw a cat🐱 - desktop input version.js',
    title: 'Draw a cat - XClick (JS)',
    code: `// Draw a smiling cat on excalidraw.com — the desktop input version: real OS mouse
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
uiv.goto('https://excalidraw.com/');
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
// The inline editor mounts asynchronously after the click; typing before it
// exists sends the keys to the canvas as tool shortcuts and the caption is
// lost (seen on mac, where the fast xmodule2 host wins that race). The
// finder auto-waits, so the keystrokes only start once the editor is real.
uiv.$('css=textarea.excalidraw-wysiwyg');
x.type(GREETING);
x.type('\${KEY_ESC}');

x.type('\${KEY_ESC}'); // deselect so no selection handles linger

// PROVE the drawing landed: count elements by type in Excalidraw's persisted
// scene, and check the text element carries the exact greeting
let counts = null;
for (let t = 0; t < 10; t++) {
  counts = uiv.evaluate('var els; try { els = JSON.parse(localStorage.getItem("excalidraw") || "[]"); } catch (e) { els = []; } if (!Array.isArray(els)) { els = []; } var r = {ellipse: 0, freedraw: 0, line: 0, text: 0, textContent: ""}; for (var i = 0; i < els.length; i++) { var el = els[i]; if (el.isDeleted) { continue; } if (el.type === "text") { r.text++; r.textContent = el.text; } else if (r[el.type] !== undefined) { r[el.type]++; } } return r;');
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
    fileName: 'AccuracyTest_DesktopClick.js',
    path: 'Browser plus Desktop Automation/AccuracyTest_DesktopClick.js',
    title: 'AccuracyTest_DesktopClick (JS)',
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
uiv.goto('https://ui.vision/');
// pin the layout - the conversion under test uses this window
uiv.window.resize(1000, 640);

// PREFLIGHT: begin from the window's notice-free geometry. Chrome's "is
// debugging" bar may still be up from a PREVIOUS macro - any CDP click in the
// last few seconds keeps it alive - and while it is up the viewport is shorter.
// Measuring the baseline then poisons everything downstream: the later "wait
// until the notice is gone" check compares against a gap that already includes
// it, exits at once, and the first shot after the bar drops lands its height
// off. Seen live running the ranges back to back: part 1 a perfect 30/30, then
// one OCR-aimed click 56px out. So sample the gap, keep the SMALLEST seen, and
// do not measure anything until the window is back to it.
// Firefox has no CDP, so no debugger bar - nothing to wait for there.
if (uiv.getVar('!BROWSER') !== 'firefox') {
  const chromeGapNow = () => uiv.evaluate('return window.outerHeight - window.innerHeight');
  let minGap = chromeGapNow();
  for (let i = 0; i < 16; i++) {
    const g = chromeGapNow();
    if (g < minGap) { minGap = g; }
    uiv.sleep(250);
  }
  for (let i = 0; i < 40 && chromeGapNow() > minGap; i++) { uiv.sleep(250); }
  if (chromeGapNow() > minGap) {
    uiv.log('the window is still ' + (chromeGapNow() - minGap) + 'px shorter than its steady height (a browser bar is up) - measuring anyway, the numbers may carry it', 'orange');
  }
}

// Build the range in the page: overlay, grid, 5 bullseyes, calibration pad,
// a mousedown recorder and two painters the macro calls later. Only SVG
// attributes and CSSOM styling, so no page CSP can interfere.
// Prime the trusted-input channel BEFORE the range is laid out: the first
// CDP event on a tab attaches the debugger, and Chrome's "is debugging" bar
// then shrinks the viewport by ~56px — a range built before that has its
// bottom rows (the calibration pad) clipped away, and the self-test click
// lands on nothing (measured live 2026-09-05). A hover is the cheapest
// event; the attachment then stays for the whole run.
if (uiv.getVar('!BROWSER') !== 'firefox') { uiv.browser.hover(1, 1); }
const info = uiv.evaluate(\`
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
window.__uivxrReport = function (text, color, verdict) {
  var wrap = d.createElement('div');
  wrap.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483647;box-sizing:border-box;max-width:min(94vw,860px);background:rgba(15,23,42,0.93);border:1.5px solid ' + color + ';border-radius:8px;padding:10px 14px;';
  // verdict LIGHT: the answer readable at a glance, not parsed out of the
  // last paragraph
  var head = d.createElement('div');
  head.style.cssText = 'display:flex;align-items:center;gap:9px;margin:0 0 7px 0;font:600 13px/1.2 system-ui,Segoe UI,sans-serif;color:' + color + ';';
  var lamp = d.createElement('span');
  lamp.style.cssText = 'width:13px;height:13px;border-radius:50%;background:' + color + ';box-shadow:0 0 9px ' + color + ';flex:none;';
  head.appendChild(lamp);
  head.appendChild(d.createTextNode(verdict || ''));
  wrap.appendChild(head);
  var box = d.createElement('pre');
  // explicit reset: the dark panel is on the wrapper, and sites style <pre> as
  // a light code block. pre-wrap + max-width so the long verdict sentence wraps
  // instead of stretching the card off both edges of the window.
  box.style.cssText = 'background:transparent;border:0;padding:0;margin:0;color:#e2e8f0;font:11px/1.55 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;';
  box.textContent = text;
  wrap.appendChild(box);
  ov.appendChild(wrap);
};
return {w:W, h:H, dpr:window.devicePixelRatio,
  chromeX:window.outerWidth-W, chromeY:window.outerHeight-H,
  left:window.screenLeft, top:window.screenTop,
  moz:typeof window.mozInnerScreenX !== 'undefined',
  scrW:screen.width, scrH:screen.height,
  multi:(screen.isExtended === undefined ? null : !!screen.isExtended),
  availLeft:(screen.availLeft || 0), availTop:(screen.availTop || 0),
  targets:window.__uivxrTargets, pad:window.__uivxrPad};
\`);

const browser = uiv.getVar('!BROWSER');
if (info.dpr && info.dpr > 1) TOL = Math.round(5 * info.dpr);
uiv.log('Range ' + info.w + 'x' + info.h + ' | ' + browser + ' on ' + uiv.getVar('!OS') + ' | dpr=' + info.dpr + ' | window chrome=' + info.chromeX + 'x' + info.chromeY + 'px | window at ' + info.left + ',' + info.top + ' | tolerance ' + TOL + 'px' + (info.moz ? ' | mozInnerScreen: yes' : ''));
// WHICH DISPLAY IS THIS RUNNING ON, and are the others scaled differently?
// screen.* only ever describes the window's OWN display; the full list needs
// the Window Management permission. That permission is READ here and never
// requested - a permission dialog in the middle of an unattended run would
// hang it - so an install that has not granted it still gets the current
// display, just not its neighbours. getScreenDetails is async and uiv.evaluate is
// not, hence the start-then-poll shape.
const displays = (() => {
  uiv.evaluate("window.__uivDisp = 'pending'; try { if (navigator.permissions && window.getScreenDetails) { navigator.permissions.query({name: 'window-management'}).then(function (p) { if (p.state !== 'granted') { window.__uivDisp = 'no-permission'; return null; } return window.getScreenDetails(); }).then(function (dd) { if (!dd) { return; } window.__uivDisp = {list: dd.screens.map(function (sc) { return {w: sc.width, h: sc.height, left: sc.left, top: sc.top, dpr: sc.devicePixelRatio, primary: !!sc.isPrimary, current: sc === dd.currentScreen}; })}; }).catch(function () { window.__uivDisp = 'unavailable'; }); } else { window.__uivDisp = 'unavailable'; } } catch (e) { window.__uivDisp = 'unavailable'; } return true;");
  for (let i = 0; i < 12; i++) {
    const v = uiv.evaluate('return window.__uivDisp');
    if (v !== 'pending') { return v; }
    uiv.sleep(250);
  }
  return 'unavailable';
})();

const hasList = !!(displays && displays.list && displays.list.length);
const displayLine = hasList
  ? 'displays (' + displays.list.length + '): ' + displays.list.map((sc, i) => '#' + (i+1) + ' ' + sc.w + 'x' + sc.h + ' @' + sc.dpr + 'x at ' + sc.left + ',' + sc.top + (sc.primary ? ' primary' : '') + (sc.current ? ' <-- THIS RUN' : '')).join('  |  ')
  : 'display: this run is on a ' + info.scrW + 'x' + info.scrH + ' screen at dpr ' + info.dpr + ((info.availLeft || info.availTop) ? ', available area starting at ' + info.availLeft + ',' + info.availTop + ' in the virtual desktop' : '') + (info.multi === true ? ' - and there are MORE displays, whose scaling this run cannot see (' + (displays === 'no-permission' ? 'grant Window Management in the site permissions to list them' : 'getScreenDetails unavailable here') + ')' : '');

// The warning, only when there is something to warn about. Desktop input
// scales every coordinate by ONE factor for the whole machine (the panel
// devicePixelRatio over the native host's backing factor), so displays at
// DIFFERENT scaling levels cannot all be right - and the error grows with
// distance, which reads exactly like a scaling bug in the code. And the desktop capture covers ONE display, so a finder cannot see anything on the others.
const displayNote = (() => {
  const dprs = hasList ? displays.list.map(sc => sc.dpr) : [];
  const mixed = dprs.length > 1 && dprs.some(dd => dd !== dprs[0]);
  if (mixed) {
    return 'MIXED DISPLAY SCALING (' + dprs.join(', ') + '): desktop input uses ONE scaling factor for the whole machine, so clicks can only be right on the display that factor came from. The capture covers one display too, so a finder cannot see anything on the others. Keep the browser on the display marked THIS RUN above, and read any FAIL below with that in mind.';
  }
  if (info.multi === true || (info.availLeft || 0) !== 0 || (info.availTop || 0) !== 0) {
    return 'MULTI-DISPLAY SETUP: desktop input uses ONE scaling factor for the whole machine, so displays at different scaling levels make every desktop click wrong by a growing amount. The capture covers one display too, so a finder cannot see anything on the others. ' + (hasList ? 'These displays all report the same dpr, so that part should be fine.' : 'This run cannot see the other displays scaling.');
  }
  return '';
})();
uiv.log(displayLine, 'blue');
if (displayNote) { uiv.log(displayNote, 'orange'); }


const hits = () => uiv.evaluate('return window.__uivxrHits');

// SCREEN -> VIEWPORT origin, learned from any shot that lands: the recorder
// stores both spaces for every hit (clientX/Y and screenX/Y). Parts 2+3 search
// in DESKTOP scope, so their matches come back in SCREEN pixels while the
// range's ground truth is in VIEWPORT pixels — this is the bridge between them.
// Learned rather than computed from window.screenLeft/screenTop on purpose:
// a measured origin cannot inherit the same DPI bug the demo is testing for.
let originX = null, originY = null, originLocked = false;
function learnOrigin(h) {
  if (originLocked) return;
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
// on-page progress, so the silent stretches (the notice wait, each OCR pass)
// do not look like a hang. uiv.banner is pointer-events none, so it can never
// swallow a shot, and the capture-based finders hide it while they look.
const status = (t) => uiv.banner(t, {position: 'bottom'});

if (browser !== 'firefox') {
  status('Checking the measuring rig');
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
  status('Waiting for Chrome to close its "is debugging" notice (up to 15s)');
  const chromeGap = () => uiv.evaluate('return window.outerHeight - window.innerHeight');
  const baseGap = info.chromeY;
  let stableN = 0;
  for (let i = 0; i < 60 && stableN < 4; i++) {
    stableN = (chromeGap() <= baseGap) ? stableN + 1 : 0;
    uiv.sleep(250);
  }
  status('');
  if (stableN < 4) {
    uiv.log('the debugger notice never went away (chrome gap still ' + chromeGap() + 'px vs ' + baseGap + 'px at start) - measuring anyway, part 1 may show one shot off by the notice height', 'orange');
  }
}

// Sighting shot: the first REAL OS click, aimed at the calibration pad. On
// systems where the browser is not in the foreground, this click also is
// what brings it there - so it gets one free retry.
uiv.log('Sighting shot...');
status('Sighting shot: a click at a known coordinate');
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
  status('Part 1: shooting at known coordinates, target ' + (i + 1) + ' of ' + info.targets.length);
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
  uiv.evaluate('window.__uivxrMark(' + h.x + ',' + h.y + ',' + JSON.stringify(color) + ',' + JSON.stringify(label) + ')');
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

// Wayland: event.screenX/screenY are anchored to a window position the
// compositor never reveals (they read as if the window sat at 0,0), so the
// origin part 1 learned from sx - clientX misses by the window's REAL
// position. Part 1 never noticed (it aims and scores in viewport space),
// but parts 2+3 build their search AREA from this origin - a shifted area
// silently CLIPS words near the window's far edge out of the search (seen
// live: CEDAR at 85% width reported as 'not found by OCR' while the reader
// was fine). uiv.window.rect() measures the true origin with an on-screen
// beacon; when it reports source 'beacon' (the Wayland path), it replaces
// the event-learned origin, and learning is locked because every later hit
// carries the same lying screenX.
try {
  const wr = uiv.window.rect();
  if (wr && wr.source === 'beacon') {
    originX = wr.x;
    originY = wr.y + info.chromeY;
    originLocked = true;
    uiv.log('Wayland: screen->viewport origin taken from the window-rect beacon: ' + originX + ',' + originY + ' (event.screenX is not trustworthy under this compositor)', 'blue');
  }
} catch (e) { /* no beacon measurement - the event-learned origin stands */ }

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
let OCR_ENGINE = 'xmodule'; // all three desktop OSes ship a local engine now (Linux: ocrs, 2026-08-15)

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
  truth = uiv.evaluate(\`
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
window.__uivxrReport = function (text, color, verdict) {
  var wrap = d.createElement('div');
  wrap.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483647;box-sizing:border-box;max-width:min(94vw,860px);background:rgba(15,23,42,0.93);border:1.5px solid ' + color + ';border-radius:8px;padding:10px 14px;';
  // verdict LIGHT: the answer readable at a glance, not parsed out of the
  // last paragraph
  var head = d.createElement('div');
  head.style.cssText = 'display:flex;align-items:center;gap:9px;margin:0 0 7px 0;font:600 13px/1.2 system-ui,Segoe UI,sans-serif;color:' + color + ';';
  var lamp = d.createElement('span');
  lamp.style.cssText = 'width:13px;height:13px;border-radius:50%;background:' + color + ';box-shadow:0 0 9px ' + color + ';flex:none;';
  head.appendChild(lamp);
  head.appendChild(d.createTextNode(verdict || ''));
  wrap.appendChild(head);
  var box = d.createElement('pre');
  // explicit reset: the dark panel is on the wrapper, and sites style <pre> as
  // a light code block. pre-wrap + max-width so the long verdict sentence wraps
  // instead of stretching the card off both edges of the window.
  box.style.cssText = 'background:transparent;border:0;padding:0;margin:0;color:#e2e8f0;font:11px/1.55 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;';
  box.textContent = text;
  wrap.appendChild(box);
  ov.appendChild(wrap);
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
    status('Part 2: OCR is reading the screen, word ' + (i + 1) + ' of ' + WORDS.length);
    const found = ocrFind(w);
    if (!found.length) {
      part2.push({ w: w, found: false });
      uiv.evaluate('window.__uivxrBox(' + t.left + ',' + t.top + ',' + t.width + ',' + t.height + ',' + JSON.stringify('#dc2626') + ')');
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
      uiv.evaluate('window.__uivxrBox(' + (m.rect.left - originX) + ',' + (m.rect.top - originY) + ',' + m.rect.width + ',' + m.rect.height + ',' + JSON.stringify('#2563eb') + ')');
    }
    const ocrOff = mv ? Math.sqrt(Math.pow(mv.x - t.x, 2) + Math.pow(mv.y - t.y, 2)) : null;
    const h = shoot(m);
    if (!h) {
      part2.push({ w: w, found: true, landed: false, ocrOff: ocrOff });
      uiv.log('Word ' + w + ': OCR found it, but the click never landed on the page', 'red');
      continue;
    }
    const inBox = h.x >= t.left - 2 && h.x <= t.left + t.width + 2 && h.y >= t.top - 2 && h.y <= t.top + t.height + 2;
    uiv.evaluate('window.__uivxrMark(' + h.x + ',' + h.y + ',' + JSON.stringify(inBox ? '#16a34a' : '#dc2626') + ',' + JSON.stringify(w + (inBox ? ' HIT' : ' MISS')) + ')');
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
const p3errs = [];
const part3 = [];
try {
  truth3 = uiv.evaluate(\`
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
window.__uivxrReport = function (text, color, verdict) {
  var wrap = d.createElement('div');
  wrap.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483647;box-sizing:border-box;max-width:min(94vw,860px);background:rgba(15,23,42,0.93);border:1.5px solid ' + color + ';border-radius:8px;padding:9px 13px;';
  // verdict LIGHT: the answer readable at a glance, not parsed out of the
  // last paragraph
  var head = d.createElement('div');
  head.style.cssText = 'display:flex;align-items:center;gap:9px;margin:0 0 7px 0;font:600 13px/1.2 system-ui,Segoe UI,sans-serif;color:' + color + ';';
  var lamp = d.createElement('span');
  lamp.style.cssText = 'width:13px;height:13px;border-radius:50%;background:' + color + ';box-shadow:0 0 9px ' + color + ';flex:none;';
  head.appendChild(lamp);
  head.appendChild(d.createTextNode(verdict || ''));
  wrap.appendChild(head);
  var box = d.createElement('pre');
  // explicit reset: the dark panel is on the wrapper, and sites style <pre> as
  // a light code block. pre-wrap + max-width so the long verdict sentence wraps
  // instead of stretching the card off both edges of the window.
  box.style.cssText = 'background:transparent;border:0;padding:0;margin:0;color:#e2e8f0;font:10.5px/1.5 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;';
  box.textContent = text;
  wrap.appendChild(box);
  ov.appendChild(wrap);
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
    status('Part 3: image search is scanning the screen, image ' + (i + 1) + ' of ' + IMAGES.length);
    let found = [];
    try {
      found = uiv.findImages(it.image, { scope: 'desktop', minScore: 0.75, area: WIN_AREA(), required: false, timeout: 10 });
    } catch (e) {
      // e.g. the image is missing in this install (preinstall not re-offered).
      // Collected per image: with several images missing, the verdict must
      // name every one
      p3errs.push(it.image + ': ' + e.message);
      uiv.log('Image ' + it.image + ': ' + e.message, 'red');
    }
    if (!found.length) {
      part3.push({ w: it.word, found: false });
      uiv.evaluate('window.__uivxrBox(' + t.left + ',' + t.top + ',' + t.width + ',' + t.height + ',' + JSON.stringify('#dc2626') + ')');
      uiv.log('Image ' + it.word + ': no match with score >= 0.75 on the desktop capture', 'red');
      continue;
    }
    const m = found[0];
    // SCREEN px -> VIEWPORT px, same as part 2
    const mv = toViewport(m);
    if (mv) {
      uiv.evaluate('window.__uivxrBox(' + (m.rect.left - originX) + ',' + (m.rect.top - originY) + ',' + m.rect.width + ',' + m.rect.height + ',' + JSON.stringify('#2563eb') + ')');
    }
    const imgOff = mv ? Math.sqrt(Math.pow(mv.x - t.x, 2) + Math.pow(mv.y - t.y, 2)) : null;
    const h = shoot(m);
    if (!h) {
      part3.push({ w: it.word, found: true, landed: false, imgOff: imgOff, score: m.score });
      uiv.log('Image ' + it.word + ': found (score ' + (m.score || 0).toFixed(2) + '), but the click never landed on the page', 'red');
      continue;
    }
    const inBox = h.x >= t.left - 2 && h.x <= t.left + t.width + 2 && h.y >= t.top - 2 && h.y <= t.top + t.height + 2;
    uiv.evaluate('window.__uivxrMark(' + h.x + ',' + h.y + ',' + JSON.stringify(inBox ? '#16a34a' : '#dc2626') + ',' + JSON.stringify(it.word + (inBox ? ' HIT' : ' MISS')) + ')');
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
  p3verdict = 'FAIL: image search matched none of the ' + IMAGES.length + ' shipped images' + (p3errs.length ? ' (' + p3errs.join('; ') + ')' : '') + ' - a vision problem (images missing, or rendering/scaling too different from the shipped dpr-1 captures); image-aimed clicking untested';
} else if (p3found.length < 2) {
  p3verdict = 'INCONCLUSIVE: image search matched only ' + p3found.length + '/' + IMAGES.length + ' images' + (p3errs.length ? ' (' + p3errs.join('; ') + ')' : '') + ' - too few to judge image-aimed clicking';
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
lines.push(displayLine);
if (displayNote) { lines.push(displayNote); }
lines.push('env: ' + browser + ' ' + uiv.getVar('!OS') + ' dpr=' + info.dpr + ' viewport=' + info.w + 'x' + info.h + ' chrome=' + info.chromeX + 'x' + info.chromeY + ' win@' + info.left + ',' + info.top);

const overall = pass && p2pass && p3pass;
const vcolor = overall ? '#4ade80' : '#f87171';
uiv.banner(''); // the progress line is done; the report card takes over
uiv.evaluate('window.__uivxrReport(' + JSON.stringify(lines.join('\\n')) + ',' + JSON.stringify(vcolor) + ',' + JSON.stringify(overall ? 'PASS' : 'FAIL') + ')');

uiv.log('Part 1: ' + score + '/30 (' + rank + ') | Part 2 OCR: ' + (truth ? p2in.length + '/' + WORDS.length + ' hit' : 'skipped') + ' | Part 3 image: ' + (truth3 ? p3in.length + '/' + IMAGES.length + ' hit' : 'skipped'), overall ? 'green' : 'orange');
if (!overall) throw new Error('Part 1: ' + verdict + ' | Part 2: ' + p2verdict + ' | Part 3: ' + p3verdict);
uiv.log('PASS: known-coordinate, OCR-aimed and image-aimed OS clicks all land where they should', 'green');
`
  },
  {
    // The ai.find sibling of AccuracyTest_DesktopClick: same range page, same
    // measuring rig, but the MODEL is the finder. It exists because ai.find is
    // the one desktop finder whose answer arrives in the pixels of the
    // screenshot the model was shown and has to be converted to screen points
    // afterwards - per OS (see aiScreenXY in run_command: Windows multiplies by
    // devicePixelRatio, macOS divides by the measured capture scale). A system
    // where that conversion is wrong misses every ai.find click while OCR and
    // image search, which return screen points already, keep working - so the
    // other range demo passes and users still report "ai.find clicks miss".
    // Only ONE finder part, no known-coordinate scoring: AccuracyTest_DesktopClick
    // already owns that, and the control shot below is enough to tell an
    // ai.find bug from a click-pipeline bug.
    fileName: 'AccuracyTest_DesktopAiFind.js',
    path: 'LLM AI Commands/AccuracyTest_DesktopAiFind.js',
    title: 'AccuracyTest_DesktopAiFind (JS)',
    code: `// ai.find Click Accuracy Range - the extension shoots at itself, with the
// MODEL as the finder. For systems where uiv.ai.find({scope: 'desktop'}) +
// uiv.desktop.mouse.click seems to land in the wrong place.
//
// Three big red/green/blue bullseyes on a white page. For each one the model
// is asked where its centre is, the answer is compared with the TRUE centre
// (the page reports it from the DOM), and then the OS really clicks the point
// the model gave - the same two steps every ai.find desktop macro takes.
//
// WHAT IT MEASURES: the coordinate PATH, not the model's eyesight. Big,
// isolated, differently coloured targets are about the easiest thing a vision
// model can point at, so a failure here is arithmetic, and the report names
// which kind:
//   points off by the same FACTOR (grows with distance) -> capture/screen
//     scaling, checked against this system's dpr and 1/dpr
//   points off by the same NUMBER of px -> window-origin / capture-cover math
//   points fine but the CLICK lands elsewhere -> not ai.find at all, run
//     AccuracyTest_DesktopClick
// The model being merely imprecise on a real page is a different question -
// the docs put ai.find within 1-2% of the image size, and it extrapolates on
// repeating layouts. This range removes both on purpose: no small targets, no
// repeating layout, and the bar for a point is 2% of the screen width.
//
// The model gets the WHOLE screen (desktop scope has no area option), and the
// extension UI is covered during that capture, so this macro's own source -
// which spells out the colours it hunts - is not in the shot. Other windows
// are: a point that lands outside the browser window is reported as exactly
// that, and is NOT clicked, since an OS click there would hit another window.
//
// COST: 3 model calls, one per bullseye - plus ONE browser-scope call, and
// only when the points themselves came out wrong, to say whether the model
// pointed correctly and the desktop conversion broke it, or the point was
// wrong to begin with.
// Needs the XModule. Keep browser zoom at 100%: page dpr moves with zoom,
// the screen capture does not. And run it on the machine that MISSES: at
// dpr 1 the per-OS scaling step is a multiplication by one, so a pass on a
// 100% display leaves the likeliest bug untested (the verdict says so).

const RING = 52;          // outer ring radius - a click inside it hits the target
// 0.15: the model's own scatter (2% of the screen, in either direction, at
// both ends of a ~700px span) can fake a slope near 0.09, while every
// conversion bug of this class is dpr-sized - 0.25 at 125% scaling, 0.5 or 1.0
// on a Retina screen. So this sits above the noise and far below any real bug.
const SLOPE_ALARM = 0.15;

uiv.window.focus(); // OS input goes to whatever window is in front
uiv.goto('https://ui.vision/');
uiv.window.resize(1000, 640); // pin the layout - the conversion under test uses this window

// PREFLIGHT: begin from the window's notice-free geometry. Chrome's "is
// debugging" bar may still be up from a PREVIOUS macro - any CDP click in the
// last few seconds keeps it alive - and while it is up the viewport is shorter.
// Measuring the baseline then poisons everything downstream: the later "wait
// until the notice is gone" check compares against a gap that already includes
// it, exits at once, and the first shot after the bar drops lands its height
// off. Seen live running the ranges back to back: part 1 a perfect 30/30, then
// one OCR-aimed click 56px out. So sample the gap, keep the SMALLEST seen, and
// do not measure anything until the window is back to it.
// Firefox has no CDP, so no debugger bar - nothing to wait for there.
if (uiv.getVar('!BROWSER') !== 'firefox') {
  const chromeGapNow = () => uiv.evaluate('return window.outerHeight - window.innerHeight');
  let minGap = chromeGapNow();
  for (let i = 0; i < 16; i++) {
    const g = chromeGapNow();
    if (g < minGap) { minGap = g; }
    uiv.sleep(250);
  }
  for (let i = 0; i < 40 && chromeGapNow() > minGap; i++) { uiv.sleep(250); }
  if (chromeGapNow() > minGap) {
    uiv.log('the window is still ' + (chromeGapNow() - minGap) + 'px shorter than its steady height (a browser bar is up) - measuring anyway, the numbers may carry it', 'orange');
  }
}

// Build the range in the page: white background (what the model is shown),
// three bullseyes, a calibration pad, a mousedown recorder and the painters
// the macro calls later. SVG attributes and CSSOM only, so no page CSP can
// interfere.
// Prime the trusted-input channel BEFORE the range is laid out: the first
// CDP event on a tab attaches the debugger, and Chrome's "is debugging" bar
// then shrinks the viewport by ~56px — a range built before that has its
// bottom rows (the calibration pad) clipped away, and the self-test click
// lands on nothing (measured live 2026-09-05). A hover is the cheapest
// event; the attachment then stays for the whole run.
if (uiv.getVar('!BROWSER') !== 'firefox') { uiv.browser.hover(1, 1); }
const info = uiv.evaluate(\`
var d = document, W = window.innerWidth, H = window.innerHeight;
var old = d.getElementById('uivaf'); if (old) old.remove();
var ov = d.createElement('div');
ov.id = 'uivaf';
ov.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:2147483647;background:#ffffff;cursor:crosshair;';
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
var F = 'Segoe UI,Helvetica,sans-serif';
el('text', {x:W/2, y:30, fill:'#0f172a', 'font-size':21, 'font-weight':'bold', 'font-family':F, 'text-anchor':'middle'}, svg, 'Ui.Vision ai.find Click Accuracy Range');
el('text', {x:W/2, y:50, fill:'#64748b', 'font-size':12, 'font-family':F, 'text-anchor':'middle'}, svg, 'the model points, the OS clicks - both measured against the true centre');
// One colour per target, so each is describable to the model without naming a
// position it could guess from. Spread diagonally AND widely: the slope fit
// needs distance on both axes to tell a scaling error from a fixed offset.
var T = [['RED','#dc2626',0.14,0.18],['GREEN','#16a34a',0.5,0.4],['BLUE','#2563eb',0.86,0.76]];
window.__uivafTargets = [];
for (var i = 0; i < T.length; i++) {
  var cx = Math.round(T[i][2] * W), cy = Math.round(T[i][3] * H), c = T[i][1];
  var rings = [[52,c],[38,'#ffffff'],[24,c],[10,'#ffffff'],[4,'#111827']];
  for (var r = 0; r < rings.length; r++) el('circle', {cx:cx, cy:cy, r:rings[r][0], fill:rings[r][1]});
  el('text', {x:cx, y:cy+72, fill:'#94a3b8', 'font-size':11, 'font-family':F, 'text-anchor':'middle'}, svg, T[i][0] + ' target');
  window.__uivafTargets.push({name:T[i][0], color:c, x:cx, y:cy});
}
var pad = {x:Math.round(W/2), y:H-42};
el('rect', {x:pad.x-70, y:pad.y-20, width:140, height:40, rx:8, fill:'#f1f5f9', stroke:'#cbd5e1'});
el('text', {x:pad.x, y:pad.y-1, fill:'#0284c7', 'font-size':12, 'font-family':F, 'text-anchor':'middle'}, svg, 'calibration pad');
el('text', {x:pad.x, y:pad.y+13, fill:'#94a3b8', 'font-size':10, 'font-family':F, 'text-anchor':'middle'}, svg, 'control shot lands here');
window.__uivafPad = pad;
window.__uivafHits = [];
ov.addEventListener('mousedown', function (e) {
  window.__uivafHits.push({x:e.clientX, y:e.clientY, sx:e.screenX, sy:e.screenY, trusted:!!e.isTrusted});
}, true);
// the error VECTOR: true centre -> the point the model returned
window.__uivafVector = function (fx, fy, tx, ty, color, label) {
  el('line', {x1:fx, y1:fy, x2:tx, y2:ty, stroke:color, 'stroke-width':1.5, 'stroke-dasharray':'3 3'});
  el('circle', {cx:tx, cy:ty, r:4, fill:color});
  el('text', {x:tx+8, y:ty-8, fill:color, 'font-size':11, 'font-family':'Consolas,monospace'}, svg, label);
};
window.__uivafMark = function (hx, hy, color, label) {
  el('line', {x1:hx-14, y1:hy, x2:hx+14, y2:hy, stroke:color, 'stroke-width':1.5});
  el('line', {x1:hx, y1:hy-14, x2:hx, y2:hy+14, stroke:color, 'stroke-width':1.5});
  el('circle', {cx:hx, cy:hy, r:5, fill:'none', stroke:color, 'stroke-width':1.5});
  el('text', {x:hx+11, y:hy+16, fill:color, 'font-size':11, 'font-family':'Consolas,monospace'}, svg, label);
};
window.__uivafReport = function (text, color, verdict) {
  var wrap = d.createElement('div');
  // max-width + pre-wrap below: the verdict is one long sentence, and unwrapped
  // it made the card ~2000px wide - centred, so it hung off BOTH edges of the
  // window and the table lost its first characters. The column rows are short
  // and stay on one line; only the prose wraps.
  wrap.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483647;box-sizing:border-box;max-width:min(94vw,860px);background:rgba(15,23,42,0.95);border:1.5px solid ' + color + ';border-radius:8px;padding:10px 14px;';
  // a verdict LIGHT, so the answer is readable from across the room instead of
  // having to be parsed out of the last paragraph
  var head = d.createElement('div');
  head.style.cssText = 'display:flex;align-items:center;gap:9px;margin:0 0 7px 0;font:600 13px/1.2 system-ui,Segoe UI,sans-serif;color:' + color + ';';
  var lamp = d.createElement('span');
  lamp.style.cssText = 'width:13px;height:13px;border-radius:50%;background:' + color + ';box-shadow:0 0 9px ' + color + ';flex:none;';
  head.appendChild(lamp);
  head.appendChild(d.createTextNode(verdict));
  wrap.appendChild(head);
  var box = d.createElement('pre');
  // reset background/border/white-space explicitly: the dark panel lives on the
  // wrapper now, and plenty of sites style <pre> as a light code block - one
  // such rule turned this card into light grey text on white
  box.style.cssText = 'background:transparent;border:0;padding:0;margin:0;color:#e2e8f0;font:11px/1.5 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;';
  box.textContent = text;
  wrap.appendChild(box);
  ov.appendChild(wrap);
};
// (progress messages go through uiv.banner, not a hand-rolled element)
return {w:W, h:H, dpr:window.devicePixelRatio, scrW:screen.width, scrH:screen.height,
  chromeX:window.outerWidth-W, chromeY:window.outerHeight-H,
  left:window.screenLeft, top:window.screenTop,
  multi:(screen.isExtended === undefined ? null : !!screen.isExtended),
  availLeft:(screen.availLeft || 0), availTop:(screen.availTop || 0),
  targets:window.__uivafTargets, pad:window.__uivafPad};
\`);

const browser = uiv.getVar('!BROWSER');
const OS_NAME = uiv.getVar('!OS');
// click tolerance for the control shot, same reasoning as AccuracyTest_DesktopClick:
// every layer quantizes to the scaling grid, so ~5px per dpr step is noise
const TOL = info.dpr && info.dpr > 1 ? Math.round(5 * info.dpr) : 5;
// the bar for the MODEL's point: the 1-2% of image size the docs promise,
// never tighter than the bullseye it has to hit
const BAR = Math.max(RING, Math.round(0.02 * info.scrW));

uiv.log('Range ' + info.w + 'x' + info.h + ' | ' + browser + ' on ' + OS_NAME + ' | dpr=' + info.dpr + ' | screen ' + info.scrW + 'x' + info.scrH + ' | window at ' + info.left + ',' + info.top + ' | model bar ' + BAR + 'px | click tolerance ' + TOL + 'px');
uiv.log('3 model calls ahead, one per bullseye (a 4th only if the points come out wrong)', 'blue');
// WHICH DISPLAY IS THIS RUNNING ON, and are the others scaled differently?
// screen.* only ever describes the window's OWN display; the full list needs
// the Window Management permission. That permission is READ here and never
// requested - a permission dialog in the middle of an unattended run would
// hang it - so an install that has not granted it still gets the current
// display, just not its neighbours. getScreenDetails is async and uiv.evaluate is
// not, hence the start-then-poll shape.
const displays = (() => {
  uiv.evaluate("window.__uivDisp = 'pending'; try { if (navigator.permissions && window.getScreenDetails) { navigator.permissions.query({name: 'window-management'}).then(function (p) { if (p.state !== 'granted') { window.__uivDisp = 'no-permission'; return null; } return window.getScreenDetails(); }).then(function (dd) { if (!dd) { return; } window.__uivDisp = {list: dd.screens.map(function (sc) { return {w: sc.width, h: sc.height, left: sc.left, top: sc.top, dpr: sc.devicePixelRatio, primary: !!sc.isPrimary, current: sc === dd.currentScreen}; })}; }).catch(function () { window.__uivDisp = 'unavailable'; }); } else { window.__uivDisp = 'unavailable'; } } catch (e) { window.__uivDisp = 'unavailable'; } return true;");
  for (let i = 0; i < 12; i++) {
    const v = uiv.evaluate('return window.__uivDisp');
    if (v !== 'pending') { return v; }
    uiv.sleep(250);
  }
  return 'unavailable';
})();

const hasList = !!(displays && displays.list && displays.list.length);
const displayLine = hasList
  ? 'displays (' + displays.list.length + '): ' + displays.list.map((sc, i) => '#' + (i+1) + ' ' + sc.w + 'x' + sc.h + ' @' + sc.dpr + 'x at ' + sc.left + ',' + sc.top + (sc.primary ? ' primary' : '') + (sc.current ? ' <-- THIS RUN' : '')).join('  |  ')
  : 'display: this run is on a ' + info.scrW + 'x' + info.scrH + ' screen at dpr ' + info.dpr + ((info.availLeft || info.availTop) ? ', available area starting at ' + info.availLeft + ',' + info.availTop + ' in the virtual desktop' : '') + (info.multi === true ? ' - and there are MORE displays, whose scaling this run cannot see (' + (displays === 'no-permission' ? 'grant Window Management in the site permissions to list them' : 'getScreenDetails unavailable here') + ')' : '');

// The warning, only when there is something to warn about. Desktop input
// scales every coordinate by ONE factor for the whole machine (the panel
// devicePixelRatio over the native host's backing factor), so displays at
// DIFFERENT scaling levels cannot all be right - and the error grows with
// distance, which reads exactly like a scaling bug in the code. And the desktop capture covers ONE display, so a finder cannot see anything on the others.
const displayNote = (() => {
  const dprs = hasList ? displays.list.map(sc => sc.dpr) : [];
  const mixed = dprs.length > 1 && dprs.some(dd => dd !== dprs[0]);
  if (mixed) {
    return 'MIXED DISPLAY SCALING (' + dprs.join(', ') + '): desktop input uses ONE scaling factor for the whole machine, so clicks can only be right on the display that factor came from. The capture covers one display too, so a finder cannot see anything on the others. Keep the browser on the display marked THIS RUN above, and read any FAIL below with that in mind.';
  }
  if (info.multi === true || (info.availLeft || 0) !== 0 || (info.availTop || 0) !== 0) {
    return 'MULTI-DISPLAY SETUP: desktop input uses ONE scaling factor for the whole machine, so displays at different scaling levels make every desktop click wrong by a growing amount. The capture covers one display too, so a finder cannot see anything on the others. ' + (hasList ? 'These displays all report the same dpr, so that part should be fine.' : 'This run cannot see the other displays scaling.');
  }
  return '';
})();
uiv.log(displayLine, 'blue');
if (displayNote) { uiv.log(displayNote, 'orange'); }


const hits = () => uiv.evaluate('return window.__uivafHits');
// On-page progress, uiv.banner - the sibling of uiv.log for the person
// WATCHING the browser rather than the log panel. Several steps here sit
// silent for seconds (waiting out Chrome's debugging notice, then each model
// call), and a still page with a moving mouse is indistinguishable from a hung
// one. Pinned to the BOTTOM: it clears every target, and it is pointer-events
// none, so the calibration-pad click below goes straight through it.
// ai.find hides the banner for the duration of its capture (same as the other
// capture-based finders), so this text never reaches the model - but it stays
// colour-free anyway, since a target name in the shot would be a distractor.
const status = (t) => uiv.banner(t, {position: 'bottom'});

// SCREEN -> VIEWPORT origin, learned from any shot that LANDS: the recorder
// stores both spaces for every hit. Desktop-scope ai.find answers in screen
// pixels while the range's ground truth is in viewport pixels, so this is the
// bridge. Measured, never computed from window.screenLeft/screenTop - a
// computed origin would inherit the very scaling bug this demo looks for.
let originX = null, originY = null, originLocked = false;
function learnOrigin(h) {
  if (originLocked) return;
  if (h && typeof h.sx === 'number' && typeof h.sy === 'number') {
    originX = h.sx - h.x; originY = h.sy - h.y;
  }
}

// fire one OS click and wait for the page to record it
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

// Recorder self-test (Chrome/Edge): prove the measuring rig before spending
// model calls on it - a CDP click must show up on the pad.
if (browser !== 'firefox') {
  status('Checking the measuring rig');
  const before = hits().length;
  uiv.browser.click(info.pad.x, info.pad.y);
  uiv.sleep(500);
  if (hits().length === before) throw new Error('recorder self-test failed: a CDP click was not recorded - the range page is broken, nothing was measured (and no model call was spent)');
  uiv.log('Recorder self-test OK - CDP click recorded', 'blue');

  // That CDP click attached chrome.debugger, so Chrome shows its "is
  // debugging" notice - and the notice TAKES WINDOW SPACE. The engine detaches
  // ~3s after the last CDP event, the notice goes, and the viewport slides
  // back down by its height. Waiting for STABLE geometry is not enough (it is
  // perfectly stable while up), so wait for the notice to be GONE: chrome
  // height back to the baseline measured before any CDP call, then steady.
  // This can idle for ~15s with nothing happening on screen, so it says why -
  // both on the page and in the log.
  status('Waiting for Chrome to close its "is debugging" notice (up to 15s)');
  uiv.log('Waiting for Chrome to close its "is debugging" notice - while that bar is up it pushes the page down, and a shot fired mid-shift would fake a click offset', 'blue');
  const chromeGap = () => uiv.evaluate('return window.outerHeight - window.innerHeight');
  let stableN = 0;
  for (let i = 0; i < 60 && stableN < 4; i++) {
    stableN = (chromeGap() <= info.chromeY) ? stableN + 1 : 0;
    uiv.sleep(250);
  }
  if (stableN < 4) uiv.log('the debugger notice never went away (chrome gap ' + chromeGap() + 'px vs ' + info.chromeY + 'px at start) - measuring anyway, the numbers may carry its height', 'orange');
  else uiv.log('The debugging notice is gone and the window geometry is steady - measuring now', 'blue');
  status(''); // the wait is over - clear it rather than leave a stale message up
}

// CONTROL SHOT: one real OS click at a KNOWN coordinate. Two jobs - it teaches
// the origin, and it separates the two suspects: a control shot that lands
// clean means the click pipeline is fine and anything the model part shows
// afterwards belongs to ai.find. On systems where the browser is not in front,
// this click is also what brings it there, so it gets one free retry.
uiv.log('Control shot (no model)...');
status('Control shot: a click at a known coordinate');
let ctl = shoot(info.pad.x, info.pad.y);
let ctlAim = info.pad;
if (!ctl) {
  // Retry at the PAGE CENTRE, not the pad: the pad sits near the bottom edge,
  // so a transient origin error pushes a pad shot clean off the page - where
  // it cannot land, nothing re-teaches the origin, and the same miss repeats.
  uiv.log('Control shot never reached the page - one retry at the page CENTRE (the first click may have gone to fronting the window)', 'orange');
  ctlAim = {x: Math.round(info.w / 2), y: Math.round(info.h / 2)};
  ctl = shoot(ctlAim.x, ctlAim.y);
}
if (!ctl) {
  throw new Error('No OS click ever reached the page, so nothing about ai.find could be measured (no model call was spent). On this system desktop clicks land somewhere else entirely - typical causes: browser window on a SECOND monitor (XModule input covers the primary display only), another window covering the browser, or a remote/virtual display. Fix the window layout and run again, or run AccuracyTest_DesktopClick first.');
}
const ctlDist = Math.sqrt(Math.pow(ctl.x - ctlAim.x, 2) + Math.pow(ctl.y - ctlAim.y, 2));
const ctlOK = ctlDist <= TOL;
uiv.evaluate('window.__uivafMark(' + ctl.x + ',' + ctl.y + ',' + JSON.stringify(ctlOK ? '#0284c7' : '#f59e0b') + ',' + JSON.stringify('control ' + ctlDist.toFixed(1) + 'px') + ')');
uiv.log('Control shot: aimed ' + ctlAim.x + ',' + ctlAim.y + ' hit ' + ctl.x + ',' + ctl.y + ' - off by ' + ctlDist.toFixed(1) + 'px' + (ctlOK ? '' : ' - the CLICK path itself is off on this system, so the click column below inherits that error; run AccuracyTest_DesktopClick for the details'), ctlOK ? 'green' : 'orange');

// Wayland: event.screenX/screenY are anchored to a window position the
// compositor never reveals (they read as if the window sat at 0,0), so the
// origin learned from sx - clientX misses by the window's REAL position -
// which then shows up below as the same constant on every model point while
// every click still lands ON target. uiv.window.rect() measures the true
// origin with an on-screen beacon; when it reports source 'beacon' (the
// Wayland path), its origin replaces the event-learned one and learning is
// locked, because every later hit carries the same lying screenX.
try {
  const wr = uiv.window.rect();
  if (wr && wr.source === 'beacon') {
    originX = wr.x;
    originY = wr.y + info.chromeY;
    originLocked = true;
    uiv.log('Wayland: screen->viewport origin taken from the window-rect beacon: ' + originX + ',' + originY + ' (event.screenX is not trustworthy under this compositor)', 'blue');
  }
} catch (e) { /* no beacon measurement - the event-learned origin stands */ }

// ---- The model as the finder --------------------------------------------
// The description leans on colour and shape, never on coordinates, and names
// the two distractors: with the whole screen in the shot, "the bullseye" alone
// is ambiguous the moment anything else round is on it.
const ask = (t) => 'Find the exact centre of the large ' + t.name + ' circular bullseye target on the white page inside the web browser window: concentric ' + t.name.toLowerCase() + ' and white rings with a small dark dot in the middle. There are three of these bullseyes, one red, one green and one blue - point at the centre of the ' + t.name + ' one, not at the small grey text label below it.';

const results = [];
for (let i = 0; i < info.targets.length; i++) {
  const t = info.targets[i];
  let m = null, err = null;
  // the status line never says WHICH target: it is in the screenshot the model
  // is about to be shown, and a colour word there is a distractor
  status('Asking the model: target ' + (i + 1) + ' of ' + info.targets.length);
  try {
    // no auto-wait and no retry by design: every attempt is billable, and the
    // range page is finished rendering long before this line
    m = uiv.ai.find(ask(t), {scope: 'desktop'});
  } catch (e) {
    err = e.message;
  }
  if (!m) {
    results.push({t: t, found: false, err: err});
    uiv.log(t.name + ': the model returned no usable coordinates - ' + err, 'red');
    continue;
  }
  // screen px -> viewport px, through the origin measured so far. Kept PER
  // RESULT: every landed click re-samples the origin, and the analysis below
  // must convert each point with the origin that was current when the model
  // answered - not with whatever the last shot happened to leave behind.
  const ox = originX, oy = originY;
  const mv = {x: m.x - ox, y: m.y - oy};
  const dx = mv.x - t.x, dy = mv.y - t.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  // Is the point even inside the browser window? Desktop scope has no area
  // option, so the model saw every other window too and may have answered
  // about one of them.
  const inWindow = mv.x >= -8 && mv.y >= -8 && mv.x <= info.w + 8 && mv.y <= info.h + 8;
  if (inWindow) {
    uiv.evaluate('window.__uivafVector(' + t.x + ',' + t.y + ',' + mv.x + ',' + mv.y + ',' + JSON.stringify(t.color) + ',' + JSON.stringify(t.name + ' ' + dist.toFixed(0) + 'px') + ')');
  }
  if (!inWindow) {
    // deliberately NOT clicked: an OS click at a point outside the browser
    // window would land in whatever window is there
    results.push({t: t, found: true, inWindow: false, m: m, mv: mv, ox: ox, oy: oy, dx: dx, dy: dy, dist: dist});
    uiv.log(t.name + ': the model answered screen ' + m.x + ',' + m.y + ' = ' + mv.x + ',' + mv.y + ' in the page - OUTSIDE the ' + info.w + 'x' + info.h + ' window, so it was not clicked', 'red');
    continue;
  }
  status('Clicking the model point ' + (i + 1) + ' of ' + info.targets.length);
  const h = shoot(m);
  if (!h) {
    results.push({t: t, found: true, inWindow: true, landed: false, m: m, mv: mv, ox: ox, oy: oy, dx: dx, dy: dy, dist: dist});
    uiv.log(t.name + ': the model pointed ' + dist.toFixed(1) + 'px off the centre, but the click never reached the page', 'red');
    continue;
  }
  const clickDist = Math.sqrt(Math.pow(h.x - t.x, 2) + Math.pow(h.y - t.y, 2));
  const onTarget = clickDist <= RING;
  uiv.evaluate('window.__uivafMark(' + h.x + ',' + h.y + ',' + JSON.stringify(onTarget ? '#16a34a' : '#dc2626') + ',' + JSON.stringify(onTarget ? 'ON' : 'OFF') + ')');
  results.push({t: t, found: true, inWindow: true, landed: true, onTarget: onTarget, m: m, mv: mv, ox: ox, oy: oy, dx: dx, dy: dy, dist: dist, clickDist: clickDist});
  uiv.log(t.name + ': model point off centre by ' + dist.toFixed(1) + 'px (bar ' + BAR + 'px), OS click landed ' + clickDist.toFixed(1) + 'px from the centre - ' + (onTarget ? 'ON the target' : 'OFF the target'), onTarget && dist <= BAR ? 'green' : 'red');
}

// ---- Analysis: what KIND of error is it? -------------------------------
// Fit found = a*truth + b per axis, in SCREEN space (truth converted with the
// measured origin), because that is the space the conversion under test works
// in: a scaling bug shows up as a, an origin bug as b. Doing it in viewport
// space would smear a into b.
function fit(pts) {
  const n = pts.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  pts.forEach(p => { sx += p[0]; sy += p[1]; sxx += p[0]*p[0]; sxy += p[0]*p[1]; });
  const den = n*sxx - sx*sx;
  if (!den) return null;
  const a = (n*sxy - sx*sy) / den;
  return {a: a, b: (sy - a*sx) / n};
}
// The overall FACTOR, measured over the longest baseline instead of read off
// the per-axis slopes: the model's own scatter wobbles a slope by up to ~0.1
// but barely moves a ratio taken over the ~800px between the two targets
// furthest apart. So the factor below is what gets compared against dpr, while
// the slopes stay in the report because a bug can hit one axis only.
function baselineScale (rs) {
  let best = null, bestD = 0;
  for (let a = 0; a < rs.length; a++) {
    for (let b = a + 1; b < rs.length; b++) {
      const td = Math.sqrt(Math.pow(rs[b].t.x - rs[a].t.x, 2) + Math.pow(rs[b].t.y - rs[a].t.y, 2));
      if (td > bestD) { bestD = td; best = [rs[a], rs[b]]; }
    }
  }
  if (!best || bestD < 1) return null;
  const fd = Math.sqrt(Math.pow(best[1].m.x - best[0].m.x, 2) + Math.pow(best[1].m.y - best[0].m.y, 2));
  return fd / bestD;
}
// MEASURABLE is not the same as CLICKABLE. A point outside the browser window
// must not be clicked (the click would hit another window), but it is still
// perfectly good coordinate data - and a scaling bug is exactly what throws
// points out of the window, so dropping them turns the clearest possible
// evidence into "too few points to tell". Measured at 125% scaling: 2 of 3
// points left the window and the run reported INCONCLUSIVE about a textbook
// dpr-squared error. So: analyse every point the model returned, click only
// the ones inside.
const measured = results.filter(r => r.found);
const clickable = measured.filter(r => r.inWindow);
const fx = fit(measured.map(r => [r.t.x + r.ox, r.m.x]));
const fy = fit(measured.map(r => [r.t.y + r.oy, r.m.y]));
const bscale = baselineScale(measured);
const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const mdx = mean(measured.map(r => r.dx)), mdy = mean(measured.map(r => r.dy));
const maxOff = measured.reduce((m, r) => Math.max(m, r.dist), 0);
const found = measured;
const outside = measured.filter(r => !r.inWindow);
const lost = clickable.filter(r => !r.landed);
const missedClicks = clickable.filter(r => r.landed && !r.onTarget);
const scaleOff = (fx && Math.abs(fx.a - 1) > SLOPE_ALARM) || (fy && Math.abs(fy.a - 1) > SLOPE_ALARM) || (bscale && Math.abs(bscale - 1) > SLOPE_ALARM);

// Does ONE transform explain every point? This is what separates a broken
// conversion from a bad answer: a conversion applies the same arithmetic to
// all three points, so they sit on one line and the residuals vanish. A model
// that matched a lookalike in another window blows the residual on that point
// alone. Without this test, two good points plus one stolen one look exactly
// like a scaling bug.
const resid = (r) => (fx && fy)
  ? Math.sqrt(Math.pow(r.m.x - (fx.a * (r.t.x + r.ox) + fx.b), 2) + Math.pow(r.m.y - (fy.a * (r.t.y + r.oy) + fy.b), 2))
  : 0;
const RESID_BAR = Math.max(BAR, Math.round(0.03 * info.scrW));
const maxResid = measured.reduce((m, r) => Math.max(m, resid(r)), 0);
const consistent = measured.length > 2 ? maxResid <= RESID_BAR : true;
// Which point is the odd one out, for the message only. NOT the fit residuals:
// one wild answer drags the least-squares line far enough that all three points
// sit off it, and the report then blamed "3 of 3". A single outlier stands out
// against the MEDIAN offset instead - the other two agree, it does not.
const sortedOff = measured.map(r => r.dist).sort((a, b) => a - b);
const medOff = sortedOff[Math.floor(sortedOff.length / 2)];
const strays = measured.filter(r => Math.abs(r.dist - medOff) > RESID_BAR);

// Name the factor when it matches an arithmetic the desktop path really
// applies. ai.find hands back the pixels of the SCREENSHOT, which on a scaled
// display is dpr times the screen points a click needs - so the conversion has
// to DIVIDE by the measured capture scale. dpr-squared is the signature of
// multiplying by dpr instead: measured live on Windows at 125%, where every
// point came back at exactly 1.5625x (see aiScreenXY in run_command.ts).
const factorNote = () => {
  const d = info.dpr || 1;
  if (!bscale || d === 1) return '';
  const near = (h) => Math.abs(bscale - h) <= Math.max(0.06, 0.04 * h);
  if (near(d*d)) return ' That factor IS dpr SQUARED (' + d + '^2 = ' + (d*d).toFixed(4) + '): the answer arrives in CAPTURE pixels, which are already dpr times the screen points, and is then multiplied by dpr instead of divided by the capture scale.';
  if (near(1/(d*d))) return ' That factor IS 1/dpr SQUARED (1/' + (d*d).toFixed(4) + '): the answer is being divided by the capture scale twice.';
  if (near(d)) return ' That factor IS this system dpr (' + d + '): the answer is being scaled UP by the device pixel ratio although it already arrived in screen points.';
  if (near(1/d)) return ' That factor IS 1/dpr (1/' + d + '): the answer is being divided although it already arrived in screen points.';
  return '';
};
// a named factor that also explains every point is the strongest verdict this
// demo can reach - strong enough to override "the points left the window"
const named = (scaleOff && consistent) ? factorNote() : '';

// coordFail: the failure is ai.find's arithmetic, the one case where the extra
// browser-scope call below buys an answer. A lost click or a stolen point is
// not, and asking the model again would only spend a call to say something
// true about a question nobody asked.
let pass = false, coordFail = false, verdict;
if (!measured.length) {
  verdict = 'FAIL: no usable coordinates for any of the 3 bullseyes. READ THE FIRST ERROR to tell the causes apart: an AI/provider message means a model problem (no vision grounding, call failing); an extension message (e.g. a rejected variable value) means the pipeline discarded coordinates the model DID return. ai.find-aimed clicking untested. First error: ' + results[0].err;
} else if (measured.length < 2) {
  verdict = 'INCONCLUSIVE: only 1 of 3 bullseyes produced a point (off by ' + maxOff.toFixed(1) + 'px), too few to tell a fixed offset from a scaling error. ' + (3 - measured.length) + ' model call(s) returned nothing usable.';
} else if (named) {
  // The one verdict that stands on its own: a factor that matches a known
  // conversion AND explains all three points. True even when the points landed
  // outside the window - that is what a big factor does.
  coordFail = true;
  verdict = 'FAIL: every point is off by the SAME FACTOR - they cover ' + bscale.toFixed(4) + 'x the distance they should (slopes ' + fx.a.toFixed(3) + 'x on x, ' + fy.a.toFixed(3) + 'x on y, and one transform explains all ' + measured.length + ' points to within ' + maxResid.toFixed(0) + 'px).' + named + ' This is arithmetic, not the model: it is wrong by construction on every scaled display and clean at 100%.';
} else if (outside.length === measured.length) {
  verdict = 'FAIL: every point the model returned lies OUTSIDE the ' + info.w + 'x' + info.h + ' browser window (page coords ' + measured.map(r => r.mv.x + ',' + r.mv.y).join(' | ') + ') and they do not share one factor this demo recognises. Either the conversion is broken in a new way, or - since a desktop ai.find sees the WHOLE screen and takes no area option - the model answered about lookalikes in other windows. Close other windows and run again; if the points repeat, it is the conversion.';
} else if (!consistent) {
  const odd = (strays.length && strays.length < measured.length) ? ' The odd one out: ' + strays.map(r => r.t.name + ' (' + r.dist.toFixed(0) + 'px off, the others ' + medOff.toFixed(0) + 'px)').join(', ') + '.' : ' The points scatter rather than agreeing on anything.';
  verdict = 'FAIL: the points do NOT follow one transform - residuals up to ' + maxResid.toFixed(0) + 'px against a shared line (bar ' + RESID_BAR + 'px).' + odd + ' A broken conversion applies the SAME arithmetic to every point, so this is individual bad answers rather than coordinate math: with the whole screen in the shot the model can match a lookalike in another window. Close other windows and re-run.';
} else if (scaleOff && fx && fy && Math.abs(fx.a - fy.a) > SLOPE_ALARM && bscale && Math.abs(bscale - 1) <= SLOPE_ALARM) {
  // Every arithmetic step in the desktop conversion - capture scale, dpr,
  // the vision downscale - multiplies BOTH axes by the same factor, so a
  // slope alarm on one axis while the other tracks 1:1 and the baseline
  // factor sits inside the bar cannot be conversion arithmetic. It is the
  // model's per-answer scatter dressed up as a slope by a least-squares fit
  // through only 3 points. Measured live with qwen3.7-plus on a 2089px dpr-1
  // screen: y answers -48/+7/-134px off - no line fits those, but the fit
  // still reported "0.731x on y" (x was 0.981x), and this branch used to
  // call that a capture/screen SCALING mismatch and send whoever read it
  // hunting a conversion bug that luna, on the same code path, disproved.
  verdict = 'FAIL: the points miss by too much (worst ' + maxOff.toFixed(1) + 'px, bar ' + BAR + 'px), but NOT by one scaling factor: the axes disagree (' + fx.a.toFixed(3) + 'x on x vs ' + fy.a.toFixed(3) + 'x on y) while the factor over the longest baseline is ' + bscale.toFixed(3) + 'x - and every step of the desktop conversion (capture scale, dpr, the vision downscale) scales both axes by the SAME factor, so no coordinate arithmetic produces this shape. This is the MODEL scattering its answers: the full-screen shot is downscaled to the vision pixel ceiling before the model sees it, so targets shrink and a general vision model estimates. Re-run to confirm - arithmetic repeats its slopes exactly, scatter does not. A stronger grounding model, or a real finder (uiv.findImage, uiv.ocr.findText), is the fix.';
} else if (scaleOff) {
  coordFail = true;
  verdict = 'FAIL: the error GROWS with distance - the points cover ' + bscale.toFixed(3) + 'x the distance they should (slopes ' + fx.a.toFixed(3) + 'x on x, ' + fy.a.toFixed(3) + 'x on y), so this is a capture/screen SCALING mismatch, not an offset. It matches no factor this demo knows (dpr ' + (info.dpr || 1) + ', 1/dpr, dpr squared) - report the numbers as they stand. Everything ai.find aims at far from the screen origin misses by more, which is why it can look like it works near the top left.';
} else if (maxOff > BAR) {
  coordFail = true;
  verdict = 'FAIL: every point sits off by about the same amount (mean dx=' + mdx.toFixed(1) + 'px dy=' + mdy.toFixed(1) + 'px, worst ' + maxOff.toFixed(1) + 'px, bar ' + BAR + 'px) with no growth across the screen (' + bscale.toFixed(3) + 'x) - a CONSTANT offset, so the screen-origin side of the conversion is wrong (window position, window chrome ' + info.chromeX + 'x' + info.chromeY + 'px, or the capture cover).';
} else if (missedClicks.length) {
  verdict = 'FAIL: the model pointed well (worst ' + maxOff.toFixed(1) + 'px, inside the ' + BAR + 'px bar) but ' + missedClicks.length + ' of ' + clickable.length + ' OS clicks landed off the target - so ai.find is fine here and the CLICK path is not. Run AccuracyTest_DesktopClick, which measures that path on its own' + (ctlOK ? ' (note the control shot above was clean, so the error appeared later in the run)' : ' - the control shot above was already off by ' + ctlDist.toFixed(1) + 'px') + '.';
} else if (lost.length) {
  verdict = 'FAIL: the model pointed inside the window (worst ' + maxOff.toFixed(1) + 'px, inside the ' + BAR + 'px bar) but ' + lost.length + ' of ' + clickable.length + ' OS clicks never reached the page at all - the click, not the coordinate, got lost: another window in front, or a point that converted to somewhere off this display.';
} else if (measured.length < 3) {
  verdict = 'PARTIAL: the coordinate path is right for the ' + measured.length + ' points measured (worst ' + maxOff.toFixed(1) + 'px, ' + fx.a.toFixed(3) + 'x / ' + fy.a.toFixed(3) + 'x), but ' + (3 - measured.length) + ' model call(s) returned nothing usable - a model/provider issue, not coordinates.';
} else {
  pass = true;
  // At dpr 1 the per-OS step (Windows multiplies by the device pixel ratio,
  // macOS divides by the capture scale) is a multiplication by one, so a pass
  // here has not exercised the arithmetic that fails elsewhere. Say so: this
  // demo exists because of reports from other machines, and a green run on a
  // 100% display must not read as "ai.find is fine everywhere".
  const identity = (info.dpr || 1) === 1;
  verdict = 'PASS: all 3 points within ' + BAR + 'px of the true centre (worst ' + maxOff.toFixed(1) + 'px), every OS click landed on its bullseye, and the points track the screen 1:1 (' + fx.a.toFixed(3) + 'x / ' + fy.a.toFixed(3) + 'x, offset ' + fx.b.toFixed(0) + '/' + fy.b.toFixed(0) + 'px).' + (identity ? ' NOTE: this display runs at dpr 1, where the per-OS scaling step of the conversion is a multiplication by one - so this run says the path is clean HERE, not that it is right on a 125%/150% or Retina display. Run it again on the machine that misses.' : '');
}

// ---- Cross-check, only when the COORDINATES were the problem ------------
// One browser-scope find on the GREEN (centre) target. Browser scope skips the
// screen conversion entirely - the capture IS the viewport - so it splits the
// verdict: accurate here means the model pointed correctly and the desktop
// conversion broke it; off by a similar proportion means the point was already
// wrong (model or vision-capture scaling) and desktop scope only inherited it.
// It costs a 4th model call, so it runs only when that distinction is the open
// question - not after a lost click or a point stolen by another window.
let crossNote = '';
if (coordFail) {
  const t = info.targets[1];
  try {
    const bm = uiv.ai.find(ask(t), {scope: 'browser'});
    const bd = Math.sqrt(Math.pow(bm.x - t.x, 2) + Math.pow(bm.y - t.y, 2));
    const bBar = Math.max(RING, Math.round(0.02 * info.w));
    uiv.evaluate('window.__uivafVector(' + t.x + ',' + t.y + ',' + bm.x + ',' + bm.y + ',' + JSON.stringify('#7c3aed') + ',' + JSON.stringify('browser-scope ' + bd.toFixed(0) + 'px') + ')');
    crossNote = 'cross-check, {scope: browser} on ' + t.name + ': point ' + bm.x + ',' + bm.y + ' vs true ' + t.x + ',' + t.y + ' = ' + bd.toFixed(1) + 'px off (bar ' + bBar + 'px) -> ' + (bd <= bBar ? 'the model points correctly in the VIEWPORT capture, so the desktop screen conversion is what breaks it' : 'off in browser scope too, so the point is wrong before any screen conversion - the model or the vision capture scaling, not the desktop path');
    uiv.log(crossNote, 'orange');
  } catch (e) {
    crossNote = 'cross-check, {scope: browser}: no usable coordinates either (' + e.message + ')';
    uiv.log(crossNote, 'orange');
  }
}

// ---- Report card -------------------------------------------------------
const padN = (v, n) => { let s = '' + v; while (s.length < n) s = ' ' + s; return s; };
const fmt = v => (v > 0 ? '+' : '') + v.toFixed(1);
const lines = ['AI.FIND CLICK ACCURACY REPORT', '', 'control shot, no model: aimed ' + ctlAim.x + ',' + ctlAim.y + ' hit ' + ctl.x + ',' + ctl.y + ' = ' + ctlDist.toFixed(1) + 'px (' + (ctlOK ? 'click path OK' : 'CLICK PATH ALREADY OFF') + ')', '', 'uiv.ai.find({scope: desktop}) on ' + OS_NAME + ': ' + (pass ? 'PASS' : 'FAIL'), 'target   model point     off-x   off-y     off   click'];
results.forEach(r => {
  const head = ' ' + padN(r.t.name, 6) + '  ';
  if (!r.found) { lines.push(head + '--- no usable coordinates from the model ---'); return; }
  // the off-x/off-y/off columns are filled in for points OUTSIDE the window
  // too: they are measurements like any other, they just cannot be clicked
  const state = !r.inWindow ? 'out' : (!r.landed ? 'lost' : (r.onTarget ? 'ON' : 'OFF'));
  lines.push(head + padN(r.m.x + ',' + r.m.y, 11) + '  ' + padN(fmt(r.dx), 6) + '  ' + padN(fmt(r.dy), 6) + '  ' + padN(r.dist.toFixed(1), 6) + '   ' + padN(state, 4));
});
if (outside.length || lost.length) lines.push('click: out = point outside the window, NOT clicked (an OS click there would' + String.fromCharCode(10) + '       hit another window); lost = click never reached the page');
if (fx && fy) lines.push('fit: found = ' + fx.a.toFixed(3) + '*truth ' + (fx.b < 0 ? '- ' : '+ ') + Math.abs(fx.b).toFixed(0) + 'px (x), ' + fy.a.toFixed(3) + '*truth ' + (fy.b < 0 ? '- ' : '+ ') + Math.abs(fy.b).toFixed(0) + 'px (y)');
if (bscale) lines.push('factor over the longest baseline: ' + bscale.toFixed(4) + 'x (1.0000 = right)' + (info.dpr && info.dpr !== 1 ? ' | dpr ' + info.dpr + ', dpr^2 ' + (info.dpr*info.dpr).toFixed(4) : ''));
if (measured.length > 2) lines.push('one transform explains all ' + measured.length + ' points to within ' + maxResid.toFixed(0) + 'px (bar ' + RESID_BAR + 'px)' + (consistent ? ' - systematic' : ' - NO, individual bad answers'));
lines.push('bar ' + BAR + 'px = 2% of the ' + info.scrW + 'px screen, min ' + RING + 'px (the ring)');
lines.push(verdict);
if (crossNote) { lines.push(''); lines.push(crossNote); }
lines.push('');
lines.push(displayLine);
if (displayNote) { lines.push(displayNote); }
lines.push('env: ' + browser + ' ' + OS_NAME + ' dpr=' + info.dpr + ' viewport=' + info.w + 'x' + info.h + ' screen=' + info.scrW + 'x' + info.scrH + ' win@' + info.left + ',' + info.top + ' origin(last)=' + originX + ',' + originY);
lines.push('model: whatever Settings > AI has configured - the log above names it');

status(''); // the progress line has said its last; the report card takes over
uiv.evaluate('window.__uivafReport(' + JSON.stringify(lines.join('\\n')) + ',' + JSON.stringify(pass ? '#4ade80' : '#f87171') + ',' + JSON.stringify(pass ? 'PASS' : 'FAIL') + ')');
uiv.log('ai.find range: ' + clickable.filter(r => r.onTarget).length + '/' + info.targets.length + ' bullseyes hit by an ai.find-aimed OS click | worst point ' + (measured.length ? maxOff.toFixed(1) + 'px' : 'n/a') + ' | control ' + ctlDist.toFixed(1) + 'px', pass ? 'green' : 'orange');
if (!pass) throw new Error(verdict + (crossNote ? ' | ' + crossNote : ''));
uiv.log('PASS: uiv.ai.find({scope: desktop}) points at the true centre and the OS clicks land there', 'green');
`
  },
  {
    fileName: 'PDF Automation.js',
    // Browser Vision folder, and this time it is accurate: nothing here needs
    // the XModule. It sat in the real-user-input folder (then named "XModules") from 2026-08 because it drove the
    // desktop tier — an XClick for focus and XType to page through the
    // document. Both are gone (the page is reached by URL and the link is
    // clicked through CDP), so the demo now runs on image search, the local
    // OCR and a browser-tier click. Note the LOCAL OCR is an XModule feature:
    // since the Tesseract engine's removal (2026-08-14), {engine: 'builtin'}
    // is served by the same local reader, so an install without the XModule
    // has no local engine at all — the OCR.Space cloud engines (free key)
    // are the fallback there.
    path: 'Browser Vision (Chrome, Edge)/PDF Automation.js',
    title: 'PDF Automation (JS)',
    code: `// PDF Automation — port of Classic/Real User Input/DemoPDFTest_with_OCR.
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
// browser showing only its new-tab page has none — uiv.goto is the one call
// that creates one by itself. (The classic table macro sized the window first,
// where the player always had a start tab; here that order died with E901
// before the PDF was ever opened.)
// #page=1&zoom=100 — the viewer REMEMBERS the page and zoom it was left on,
// so a bare URL does not start at the top of the document on the second run of
// the day. Pin both, the same reason the window gets a fixed size.
uiv.goto('http://download.ui.vision/demo/pdf-test.pdf#page=1&zoom=100');
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
// https://ocr.space/ocrapi) here and the demo runs unchanged.
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
uiv.goto('http://download.ui.vision/demo/pdf-test.pdf#page=2&zoom=100');
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
  const h = uiv.evaluate('return window.innerHeight');
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
// uiv.browser.click, not uiv.desktop.mouse.click — deliberately, and it is what
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
  },
  {
    // Core, not Browser Vision (Chrome, Edge): no CDP anywhere in here, so it
    // runs on Firefox too. It DOES need the Desktop Automation module — since
    // the Tesseract engine's removal every LOCAL OCR read runs through its OS
    // reader — but only as the reader: browser scope throughout.
    fileName: 'Scrolling Capture OCR.js',
    path: 'Browser Core/Scrolling Capture OCR.js',
    title: 'Scrolling Capture OCR (JS)',
    code: `// Scrolling capture + local OCR — full-page text, one slice at a time.
// The macro reads a long page in PARTS half-viewport slices: scroll,
// capture the visible page, OCR only the NEW half of the capture, append.
// Nothing is read twice, and nothing leaves the machine — the reading is
// done by the XModule's Local OCR, so there is no cloud API and no key.
// The showcase call is uiv.ocr.read({image, engine, area}): a STORED
// capture, read by the engine THIS call names, cropped to a region given
// in IMAGE pixels (the capture's own space — a HiDPI shot is bigger than
// its CSS viewport, hence the devicePixelRatio math below).
//
// Needs the RealUser XModule (its Local OCR does the reading).

// The page to read. As a demo/QA test this opens the OCR API docs — a
// long, text-heavy page that is its own oracle: the word "OCR" must be in
// the result. For NORMAL use set TEST_PAGE to '' — then the macro reads
// whatever page is already loaded, without navigating anywhere.
const TEST_PAGE = 'https://ocr.space/ocrapi';
if (TEST_PAGE) uiv.goto(TEST_PAGE);

// 0 = the WHOLE page: the slice count is computed from the page height
// measured up front (so an infinite-scroll feed that keeps growing cannot
// trap the loop). Set a fixed number to read just the top of the page.
const PARTS = 0;

const vp = JSON.parse(uiv.evaluate(
  'window.scrollTo(0, 0);' +
  'var el = document.scrollingElement || document.documentElement;' +
  'return JSON.stringify({h: window.innerHeight, w: window.innerWidth,' +
  ' dpr: window.devicePixelRatio,' +
  ' max: Math.max(0, el.scrollHeight - window.innerHeight)});'
));
const half = Math.round(vp.h / 2);
const total = PARTS || Math.ceil((vp.max + vp.h) / half);
uiv.log('Page is ' + (vp.max + vp.h) + ' CSS px tall -> ' + total + ' half-viewport parts.', 'blue');

const parts = [];
for (let i = 0; i < total; i++) {
  const wantY = i * half; // the document row this part starts at
  const gotY = Number(uiv.evaluate(
    'window.scrollTo(0, ' + wantY + ');' +
    'var el = document.scrollingElement || document.documentElement;' +
    'return el.scrollTop;'
  ));
  // gotY < wantY only when the page ran out and the scroll clamped at the
  // bottom — then the slice sits lower in the viewport, not at its top
  const cssOffset = wantY - gotY;
  if (cssOffset >= vp.h) {
    uiv.log('Page ended after part ' + i + ' — nothing new to read.');
    break;
  }

  // Banner AFTER the capture, and cleared before it: uiv.shot.viewport
  // photographs the banner too (only the visual FINDERS hide it), so showing
  // it first OCRs "OCR part N of 5" into every part (measured). Cleared, shot,
  // then shown — it covers the OCR phase, which is the slow part anyway.
  uiv.banner('');
  const shot = uiv.shot.viewport('ocr_part_' + (i + 1) + '.png');
  uiv.banner('OCR part ' + (i + 1) + ' of ' + total + '…');
  const partH = Math.min(half, vp.h - cssOffset);
  const text = uiv.ocr.read({
    image: shot,
    engine: 'xmodule',
    area: {
      x: 0,
      y: Math.round(cssOffset * vp.dpr),
      width: Math.round(vp.w * vp.dpr),
      height: Math.round(partH * vp.dpr)
    }
  });
  parts.push(String(text).trim());
  uiv.files.remove(shot); // keep the Screenshots tab clean

  // bottom reached and its last half read — later parts would repeat it
  if (gotY >= vp.max && cssOffset + half >= vp.h) break;
}

// --- verify the OCR text, then stitch the parts without duplicate rows ------
// An empty part points at a broken reader, not an empty page.
const emptyParts = [];
for (let i = 0; i < parts.length; i++) { if (!parts[i]) emptyParts.push(i + 1); }
if (emptyParts.length === parts.length) {
  throw new Error('OCR returned no text for any part — is the RealUser XModule (Local OCR) installed?');
}
if (emptyParts.length) {
  uiv.log('Warning: OCR read nothing in part(s) ' + emptyParts.join(', '), 'orange');
}

// A row that already appeared in an EARLIER part is almost always sticky UI
// (header, nav, cookie bar — captured in every slice) or a text row cut by
// the part boundary and read twice. Drop those, and LOG each drop, so a
// legitimate repeat can be checked by hand. Repeats WITHIN one part are
// kept: identical table rows on one screen are real data.
const seen = {};
let dropped = 0;
const out = [];
for (let i = 0; i < parts.length; i++) {
  const kept = [];
  const lines = parts[i].split('\\n');
  for (const line of lines) {
    const key = line.replace(/\\s+/g, ' ').trim();
    if (!key) continue;
    if (seen[key] !== undefined && seen[key] < i) {
      dropped++;
      uiv.log('Duplicate row dropped (also in part ' + (seen[key] + 1) + '): ' + key.slice(0, 80));
      continue;
    }
    seen[key] = i;
    kept.push(line);
  }
  if (kept.length) out.push('--- part ' + (i + 1) + ' ---\\n' + kept.join('\\n'));
}
if (dropped) uiv.log(dropped + ' duplicate row(s) removed across part boundaries.', 'orange');

const all = out.join('\\n\\n') + '\\n';

// Prove the run before reporting it: on the demo page the word "OCR" is
// guaranteed to be in a good read — a clean finish with broken text must
// come back RED, not green.
if (TEST_PAGE && !all.toLowerCase().includes('ocr')) {
  throw new Error('Read ' + all.length + ' characters but the word "OCR" is not among them — the read is broken.');
}

uiv.text.write('ocr-result.txt', all);
uiv.files.exportToDownloads('ocr-result.txt');
uiv.banner('Saved ocr-result.txt (' + out.length + ' parts, ' + dropped + ' duplicate rows removed)', { tone: 'green', seconds: 8 });
uiv.log('Scrolling Capture OCR completed — ocr-result.txt is in the CSV/TXT tab and in Downloads.', 'green');
`
  },
  {
    // Ui.Vision for Desktop drives its own window: tabs by OCR, the test-target strip by color, typing, all verified through the app's own !TEST_TARGETS truth. The "use desktop-app" directive sends it to the app from the tree.
    fileName: "Desktop App GUI SelfTest.d.js",
    path: "Desktop App (high speed)/Desktop App GUI SelfTest.d.js",
    title: "Desktop App GUI SelfTest (JS, runs in the app)",
    code: `"use desktop-app";
uiv.banner("GUI self-test: checking tabs, clicks and typing.", {seconds: 6});
// Ui.Vision for Desktop — the app drives its OWN window (a self-test of the
// desktop input + vision path on this machine, no browser involved).
//
// The "use desktop-app" directive on line 1 tells the browser extension to
// run this macro in the helper app even when it is played from the macro
// tree (a JS directive prologue, like "use strict": engines ignore it).
//
// What it does: finds the app window by its title text, switches tabs by
// clicking their labels (OCR), opens the test-target strip from Settings,
// clicks the five red targets (color search), types into the test field,
// and checks every step through the app's own truth: uiv.getVar('!TEST_TARGETS')
// holds each target's landing offset and the typed text. PASS = every target
// hit within TOL px of its centre, the text arrived intact, the tabs switched.
var TOL = 4;                 // px: a click farther than this from the centre fails
var TEXT = 'hello 123';      // typed through the OS key path

function log(s, c) { uiv.log(s, c); }
function fail(msg) { try { uiv.shot.desktop('selftest_fail'); } catch (e) {} log('FAIL: ' + msg + ' (screen saved as selftest_fail.png)', 'red'); uiv.banner('GUI self-test failed: ' + msg, {seconds: 5}); uiv.sleep(5000); throw new Error(msg); }
function truth() { var v = uiv.getVar('!TEST_TARGETS', ''); if (v && typeof v === 'object') return v; try { return v ? JSON.parse(v) : null; } catch (e) { return null; } }

// 1. the app window: its header says "Ui.Vision for Desktop" — the only
// window that does. OCR the screen for it, take the app area below it.
// 0. the app's own window to the front: the browser that sent this macro
// usually covers it, and a second app start does not front the first one
if (uiv.app && uiv.app.focus) { try { uiv.app.focus(); } catch (e) { log('app focus: ' + e.message, 'orange'); } uiv.sleep(300); }
// the app publishes its window rect as !APP_WINDOW in this macro's own
// screen unit (physical px on Windows, points on mac): the header search
// stays inside it (the extension's own tab shows the same words) and the
// search areas are the window itself, never off-screen. An app whose
// !APP_WINDOW is in another unit (2.1.1) fails the header-inside check
// below and the macro sizes from the header as before.
var WIN = uiv.getVar('!APP_WINDOW', null); if (typeof WIN === 'string') { try { WIN = JSON.parse(WIN); } catch (e) { WIN = null; } }
if (WIN && !(WIN.width > 0 && WIN.height > 0)) WIN = null;
var hdr = WIN ? uiv.ocr.findText('for Desktop', { scope: 'desktop', area: { x: Math.round(WIN.x), y: Math.round(WIN.y), width: Math.round(WIN.width), height: Math.round(Math.min(WIN.height, 160)) }, timeout: 4, required: false }) : null;
if (!hdr) hdr = uiv.ocr.findText('for Desktop', { scope: 'desktop', timeout: 8, required: false });
if (!hdr) fail('the app window is not visible — is "Ui.Vision for Desktop" on screen (not minimised, not covered)?');
// the window is 460x740 points; on a 125-150% display that is up to 690x1110
// screen px, so the area is generous (a word search does not mind extra room)
// The app's coordinate unit follows the display scale (the header is 138
// units wide on a 125% display, 193 on a 150% one): size every area from it.
var K = hdr.rect.width / 138;
// the search area: the window rect itself when the header was found inside
// it (never off-screen), else a generous box around the header
if (WIN && !(hdr.x >= WIN.x && hdr.x <= WIN.x + WIN.width && hdr.y >= WIN.y && hdr.y <= WIN.y + WIN.height)) { log('!APP_WINDOW ' + JSON.stringify(WIN) + ' does not contain the header — sizing from the header instead', 'grey'); WIN = null; }
var APP = WIN ? { x: Math.round(WIN.x), y: Math.round(WIN.y), width: Math.round(WIN.width), height: Math.round(WIN.height) }
  : { x: Math.round(hdr.rect.left - 80 * K), y: Math.round(hdr.rect.top - 60 * K), width: Math.round(720 * K), height: Math.round(1120 * K) };
var TABS = { x: APP.x, y: Math.round(hdr.rect.top + 30 * K), width: APP.width, height: Math.round(230 * K) };
var TAB_ORDER = ['Files', 'Macro', 'Logs', 'Settings'];
// A tab label OCR skips (the unselected ones are grey) is placed from the
// two labels it did read: the four tabs are equally wide.
// the five red squares (squares only: the app's red Stop button is a near-identical
// red); the strip repaints lazily after it opens, so allow a few looks
function findReds() {
  var best = [];
  for (var tries = 0; tries < 6; tries++) {
    var r = uiv.findColors('#E11D48', { scope: 'desktop', area: APP, tolerance: 20, minWidth: 8, minHeight: 8, timeout: 1, required: false }) || [];
    r = r.filter(function (b) { return Math.abs(b.rect.width - b.rect.height) <= 3; });
    if (r.length === 5) return r;
    if (r.length > best.length) best = r;
    uiv.sleep(300);
  }
  return best;
}
function tabPos(name) {
  var found = {};
  for (var i = 0; i < TAB_ORDER.length; i++) {
    var m = uiv.ocr.findText(TAB_ORDER[i], { scope: 'desktop', area: TABS, timeout: 3, required: false });
    if (m) { found[TAB_ORDER[i]] = m; if (TAB_ORDER[i] === name) return m; }
  }
  var names = Object.keys(found);
  log('tab labels OCR read: ' + (names.join(', ') || 'none') + ' (looking for ' + name + ')', 'grey');
  if (names.length < 2) return null;
  var a = found[names[0]], b = found[names[1]];
  var ia = TAB_ORDER.indexOf(names[0]), ib = TAB_ORDER.indexOf(names[1]), it = TAB_ORDER.indexOf(name);
  var step = (b.x - a.x) / (ib - ia);
  return { x: Math.round(a.x + (it - ia) * step), y: Math.round((a.y + b.y) / 2), rect: a.rect, text: name + ' (by geometry)' };
}
log('app window area ' + JSON.stringify(APP) + ' (from the header at ' + hdr.x + ',' + hdr.y + ')');
function clickText(text, area) {
  var m = area ? uiv.ocr.findText(text, { scope: 'desktop', area: area, timeout: 6, required: false }) : tabPos(text);
  if (!m) fail('cannot find "' + text + '" in the app window');
  uiv.desktop.mouse.click(m.x, m.y);
  uiv.sleep(400);
  return m;
}

// 2. tabs: Settings > "Show test targets", then back to Files and Logs later
clickText('Settings');
if (!uiv.ocr.findText('bridge', { scope: 'desktop', area: APP, timeout: 4, required: false })) fail('the Settings tab did not open (its "MCP bridge" section is not visible)');
// The strip may still be up from an earlier run — and its own "Test targets"
// label would match an OCR search for the button, so the truth variable
// decides: strip up -> Reset (clears the hits and the text field), else
// press "Show test targets" (the app drops !TEST_TARGETS when the strip hides).
var up = truth();
if (up && up.targets) { log('targets already shown — resetting', 'grey'); clickText('Reset', APP); }
else {
  var btn = uiv.ocr.findText('Show', { scope: 'desktop', area: APP, timeout: 6, required: false });
  if (!btn) fail('Settings tab did not open (no "Show test targets" button seen)');
  uiv.desktop.mouse.click(btn.x, btn.y);
}
uiv.sleep(600);
var t0 = truth();
if (!t0 || !t0.targets || t0.targets.length !== 5) fail('the test strip did not publish !TEST_TARGETS (got ' + JSON.stringify(t0) + ')');
log('test strip open: ' + t0.targets.length + ' targets, sizes ' + t0.targets.map(function (t) { return t.size; }).join('/'));

// 3. click every red square at its centre (largest first — that is how the
// strip lays them out, left to right)
var reds = findReds();
if (reds.length !== 5) fail('expected 5 red targets, color search found ' + reds.length);
reds.sort(function (a, b) { return a.rect.left - b.rect.left; });
for (var i = 0; i < reds.length; i++) {
  uiv.desktop.mouse.click(reds[i].x, reds[i].y);
  uiv.sleep(120);
}
uiv.sleep(400);
var t1 = truth();
var worst = 0, missed = 0, missedSmall = 0;
for (var j = 0; j < t1.targets.length; j++) {
  var h = t1.targets[j].hit;
  // the 12 pt square is the accuracy probe (on a 125% display it is 15 px and
  // a 3 px landing bias misses it): reported, not a functional failure here —
  // 'AccuracyTest_DesktopApp.d.js' is the strict version
  if (!h) { if (t1.targets[j].size <= 12) { missedSmall++; log('target ' + t1.targets[j].size + 'px: not hit (accuracy note, see the AccuracyTest_DesktopApp macro)', 'orange'); } else { missed++; log('target ' + t1.targets[j].size + 'px: NOT hit', 'orange'); } continue; }
  var d = Math.max(Math.abs(h[0]), Math.abs(h[1]));
  if (d > worst) worst = d;
  log('target ' + t1.targets[j].size + 'px: landed ' + h[0] + ',' + h[1] + ' from the centre' + (d > TOL ? '  <-- off' : ''), d > TOL ? 'orange' : '');
}
var greens = uiv.findColors('#27AE60', { scope: 'desktop', area: APP, tolerance: 20, minWidth: 8, minHeight: 8, timeout: 2, required: false }) || [];
log('after the clicks: ' + greens.length + ' green squares on screen, worst offset ' + worst + ' px');
if (missed) fail(missed + ' of the 48-16 px targets were not hit (the click did not reach the app window)');
if (worst > TOL) fail('click landed ' + worst + ' px off centre (> ' + TOL + '): the screen->click coordinate path is off (DPI/scale?)');
if (greens.length < 5 - missedSmall) fail('only ' + greens.length + ' targets turned green');

// 4. type into the field: it wears a blue frame — click inside it, type
var frame = uiv.findColors('#2F80ED', { scope: 'desktop', area: APP, tolerance: 25, minWidth: 100, minHeight: 4, timeout: 3, required: false });
if (!frame || !frame.length) fail('the test text field (blue frame) was not found');
var fr = frame[0].rect;
uiv.desktop.mouse.click(fr.left + 20, fr.top + fr.height / 2);
uiv.sleep(200);
uiv.desktop.keyboard.type(TEXT);
uiv.sleep(400);
var t2 = truth();
if (!t2 || t2.text !== TEXT) fail('typed "' + TEXT + '" but the field holds "' + (t2 && t2.text) + '"');
log('typed text arrived intact: "' + t2.text + '"');
var echo = uiv.ocr.findText('hello', { scope: 'desktop', area: APP, timeout: 4, required: false });
log(echo ? 'OCR reads the echo label too' : 'OCR could not read the echo label (the truth variable is what counts)', echo ? '' : 'grey');

// 5. the other tabs: Logs, Files
clickText('Logs');
if (!uiv.ocr.findText('Clear', { scope: 'desktop', area: APP, timeout: 4, required: false })) fail('Logs tab did not open');
clickText('Files');
// the Files tab has no heading (2.1.1): its "Show all | Only .d.js" switch is the marker.
// A prefix match: the Linux reader (ocrs) glues "Only" to ".d.js" now and then; the
// "Filter macros" box is the second marker (both are small text, so two looks)
if (!uiv.ocr.findText('Only*', { scope: 'desktop', area: APP, timeout: 4, required: false }) && !uiv.ocr.findText('Filter*', { scope: 'desktop', area: APP, timeout: 4, required: false })) fail('Files tab did not open');
log('PASS: tabs switch, ' + (5 - missedSmall) + '/5 targets hit (worst ' + worst + ' px' + (missedSmall ? ', the 12 px probe missed' : '') + '), text typed intact', 'green');

uiv.banner("GUI self-test passed: tabs, targets and typing checked.", {seconds: 5});
uiv.sleep(5000);
`
  },
  {
    // The desktop twin of AccuracyTest_DesktopClick on the app's own test strip: 48..12 px targets, landing offsets reported by the app itself, verdict: constant offset / scatter / misses.
    fileName: "AccuracyTest_DesktopApp.d.js",
    path: "Desktop App (high speed)/AccuracyTest_DesktopApp.d.js",
    title: "AccuracyTest_DesktopApp (JS, runs in the app)",
    code: `"use desktop-app";
uiv.banner("Click accuracy: testing five target sizes over three rounds.", {seconds: 6});
// Ui.Vision for Desktop — click-accuracy range on the app's own test strip.
// The desktop twin of "AccuracyTest_DesktopClick": five targets from 48 px
// down to 12 px, found by COLOR on the screen and clicked at the centre the
// color search reports. The app records where each click really landed
// (its own pixel truth, published as !TEST_TARGETS), so the verdict needs no
// OCR: a constant offset means the screen->click conversion is shifted
// (DPI / display origin), an error that GROWS with distance from the window
// corner means a scale mismatch, misses on the small targets only mean the
// color search centre is coarse. Runs in the helper app ("use desktop-app").
var TOL = 3;          // px: pass when every landing is within this of the centre
var ROUNDS = 3;       // click every target this many times (Reset in between)

function log(s, c) { uiv.log(s, c); }
function fail(m) { try { uiv.shot.desktop('selftest_fail'); } catch (e) {} log('FAIL: ' + m + ' (screen saved as selftest_fail.png)', 'red'); uiv.banner('Click accuracy failed: ' + m, {seconds: 5}); uiv.sleep(5000); throw new Error(m); }
function truth() { var v = uiv.getVar('!TEST_TARGETS', ''); if (v && typeof v === 'object') return v; try { return v ? JSON.parse(v) : null; } catch (e) { return null; } }

// 0. the app's own window to the front: the browser that sent this macro
// usually covers it, and a second app start does not front the first one
if (uiv.app && uiv.app.focus) { try { uiv.app.focus(); } catch (e) { log('app focus: ' + e.message, 'orange'); } uiv.sleep(300); }
// the app publishes its window rect as !APP_WINDOW in this macro's own
// screen unit (physical px on Windows, points on mac): the header search
// stays inside it (the extension's own tab shows the same words) and the
// search areas are the window itself, never off-screen. An app whose
// !APP_WINDOW is in another unit (2.1.1) fails the header-inside check
// below and the macro sizes from the header as before.
var WIN = uiv.getVar('!APP_WINDOW', null); if (typeof WIN === 'string') { try { WIN = JSON.parse(WIN); } catch (e) { WIN = null; } }
if (WIN && !(WIN.width > 0 && WIN.height > 0)) WIN = null;
var hdr = WIN ? uiv.ocr.findText('for Desktop', { scope: 'desktop', area: { x: Math.round(WIN.x), y: Math.round(WIN.y), width: Math.round(WIN.width), height: Math.round(Math.min(WIN.height, 160)) }, timeout: 4, required: false }) : null;
if (!hdr) hdr = uiv.ocr.findText('for Desktop', { scope: 'desktop', timeout: 8, required: false });
if (!hdr) fail('the app window is not visible ("Ui.Vision for Desktop" header not found on screen)');
// the window is 460x740 points; on a 125-150% display that is up to 690x1110
// screen px, so the area is generous (a word search does not mind extra room)
// The app's coordinate unit follows the display scale (the header is 138
// units wide on a 125% display, 193 on a 150% one): size every area from it.
var K = hdr.rect.width / 138;
// the search area: the window rect itself when the header was found inside
// it (never off-screen), else a generous box around the header
if (WIN && !(hdr.x >= WIN.x && hdr.x <= WIN.x + WIN.width && hdr.y >= WIN.y && hdr.y <= WIN.y + WIN.height)) { log('!APP_WINDOW ' + JSON.stringify(WIN) + ' does not contain the header — sizing from the header instead', 'grey'); WIN = null; }
var APP = WIN ? { x: Math.round(WIN.x), y: Math.round(WIN.y), width: Math.round(WIN.width), height: Math.round(WIN.height) }
  : { x: Math.round(hdr.rect.left - 80 * K), y: Math.round(hdr.rect.top - 60 * K), width: Math.round(720 * K), height: Math.round(1120 * K) };
var TABS = { x: APP.x, y: Math.round(hdr.rect.top + 30 * K), width: APP.width, height: Math.round(230 * K) };
var TAB_ORDER = ['Files', 'Macro', 'Logs', 'Settings'];
// A tab label OCR skips (the unselected ones are grey) is placed from the
// two labels it did read: the four tabs are equally wide.
// the five red squares (squares only: the app's red Stop button is a near-identical
// red); the strip repaints lazily after it opens, so allow a few looks
function findReds() {
  var best = [];
  for (var tries = 0; tries < 6; tries++) {
    var r = uiv.findColors('#E11D48', { scope: 'desktop', area: APP, tolerance: 20, minWidth: 8, minHeight: 8, timeout: 1, required: false }) || [];
    r = r.filter(function (b) { return Math.abs(b.rect.width - b.rect.height) <= 3; });
    if (r.length === 5) return r;
    if (r.length > best.length) best = r;
    uiv.sleep(300);
  }
  return best;
}
function tabPos(name) {
  var found = {};
  for (var i = 0; i < TAB_ORDER.length; i++) {
    var m = uiv.ocr.findText(TAB_ORDER[i], { scope: 'desktop', area: TABS, timeout: 3, required: false });
    if (m) { found[TAB_ORDER[i]] = m; if (TAB_ORDER[i] === name) return m; }
  }
  var names = Object.keys(found);
  log('tab labels OCR read: ' + (names.join(', ') || 'none') + ' (looking for ' + name + ')', 'grey');
  if (names.length < 2) return null;
  var a = found[names[0]], b = found[names[1]];
  var ia = TAB_ORDER.indexOf(names[0]), ib = TAB_ORDER.indexOf(names[1]), it = TAB_ORDER.indexOf(name);
  var step = (b.x - a.x) / (ib - ia);
  return { x: Math.round(a.x + (it - ia) * step), y: Math.round((a.y + b.y) / 2), rect: a.rect, text: name + ' (by geometry)' };
}
function clickText(text, area) {
  var m = area ? uiv.ocr.findText(text, { scope: 'desktop', area: area, timeout: 6, required: false }) : tabPos(text);
  if (!m) fail('cannot find "' + text + '" in the app window');
  uiv.desktop.mouse.click(m.x, m.y); uiv.sleep(400); return m;
}
clickText('Settings');
if (!uiv.ocr.findText('bridge', { scope: 'desktop', area: APP, timeout: 4, required: false })) fail('the Settings tab did not open (its "MCP bridge" section is not visible)');
// strip already up from an earlier run (its "Test targets" label would match
// an OCR search for the button): the truth variable decides — Reset, else Show
var up = truth();
if (up && up.targets) { clickText('Reset', APP); }
else {
  var btn = uiv.ocr.findText('Show', { scope: 'desktop', area: APP, timeout: 6, required: false });
  if (!btn) fail('no "Show test targets" button in Settings');
  uiv.desktop.mouse.click(btn.x, btn.y); uiv.sleep(600);
}
if (!truth()) fail('the test strip did not publish !TEST_TARGETS');

var perSize = {};   // size -> [ [dx,dy], ... ]
for (var round = 1; round <= ROUNDS; round++) {
  if (round > 1) { clickText('Reset', APP); uiv.sleep(300); }
  var reds = findReds();
  if (reds.length !== 5) fail('round ' + round + ': expected 5 red targets, found ' + reds.length);
  reds.sort(function (a, b) { return a.rect.left - b.rect.left; });
  var t0 = Date.now();
  for (var i = 0; i < reds.length; i++) { uiv.desktop.mouse.click(reds[i].x, reds[i].y); uiv.sleep(80); }
  uiv.sleep(350);
  var t = truth();
  for (var j = 0; j < t.targets.length; j++) {
    var tg = t.targets[j];
    if (!perSize[tg.size]) perSize[tg.size] = [];
    perSize[tg.size].push(tg.hit);   // null = missed
  }
  log('round ' + round + ': 5 clicks in ' + Math.round(Date.now() - t0) + ' ms — ' + t.targets.map(function (x) { return x.size + 'px ' + (x.hit ? x.hit[0] + ',' + x.hit[1] : 'MISS'); }).join(' | '));
}

// verdict
var sizes = Object.keys(perSize).map(Number).sort(function (a, b) { return b - a; });
var worst = 0, misses = 0, sumX = 0, sumY = 0, n = 0, maxSmall = 0;
for (var s = 0; s < sizes.length; s++) {
  var hits = perSize[sizes[s]];
  for (var k = 0; k < hits.length; k++) {
    var h = hits[k];
    if (!h) { misses++; continue; }
    var d = Math.max(Math.abs(h[0]), Math.abs(h[1]));
    if (d > worst) worst = d;
    if (sizes[s] <= 16 && d > maxSmall) maxSmall = d;
    sumX += h[0]; sumY += h[1]; n++;
  }
}
var meanX = n ? sumX / n : 0, meanY = n ? sumY / n : 0;
log('landing offsets: worst ' + worst + ' px, mean ' + meanX.toFixed(1) + ',' + meanY.toFixed(1) + ', misses ' + misses + '/' + (5 * ROUNDS) + ', worst on <=16px targets ' + maxSmall + ' px');
if (misses) fail(misses + ' clicks did not register on a target — the OS click did not reach the app window, or the color centre was outside a small square');
if (worst <= TOL) log('PASS: every click landed within ' + TOL + ' px of the target centre over ' + ROUNDS + ' rounds', 'green');
else if (Math.abs(meanX) > TOL || Math.abs(meanY) > TOL) fail('CONSTANT OFFSET of ' + meanX.toFixed(0) + ',' + meanY.toFixed(0) + ' px: the screen->click conversion is shifted (display origin / DPI math)');
else fail('scatter up to ' + worst + ' px without a constant offset: the color-search centre is coarse or the click path is noisy on this machine');

uiv.banner("Click accuracy passed: every click landed within tolerance.", {seconds: 5});
uiv.sleep(5000);
`
  }
]
