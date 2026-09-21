// ES6+ support for JS script macros.
//
// The sandbox (vendored JS-Interpreter) only parses ES5, so modern syntax is
// compiled down with Babel before it reaches the interpreter. Babel is loaded
// LAZILY on the first script run — it is ~2.3 MB, and users who only run table
// macros must never pay for it (same pattern as the jimp import in the AI
// service).
//
// The debugger keeps working because every reported position is translated
// back through Babel's source map. Measured against a hand-written ES5 control
// program, the resulting step path is IDENTICAL to the pre-Babel one.
//
// What Babel does NOT provide: runtime built-ins. It compiles syntax only, so
// Map/Set/Promise and methods like Array.prototype.includes do not appear —
// the common ones are polyfilled in ES5 inside the interpreter (see
// BUILTIN_POLYFILL in script_runner.js), and async/await is rejected outright
// (it needs a real Promise; the uiv API is synchronous by design).

let babelPromise = null

// Loading is deferred AND cached: the chunk is fetched once per panel session.
function loadBabel () {
  if (!babelPromise) {
    babelPromise = import(/* webpackChunkName: "babel-standalone" */ '@babel/standalone')
      .then(mod => mod.default || mod)
  }
  return babelPromise
}

const BABEL_OPTIONS = {
  sourceMaps: true,
  sourceType: 'script',
  // ie11 is simply "no ES6 syntax", which is what the interpreter accepts
  presets: [['env', { targets: { ie: '11' }, modules: false }]],
  // These keep the output free of Symbol/iterator machinery the interpreter
  // has no way to run. iterableIsArray in particular turns `for...of` into a
  // plain index loop instead of pulling in an iterator helper.
  assumptions: {
    iterableIsArray: true,
    skipForOfIteratorClosing: true,
    setPublicClassFields: true,
    noDocumentAll: true,
    objectRestNoSymbols: true,
    privateFieldsAsProperties: true,
    constantSuper: true,
    noClassCalls: true,
    noNewArrows: true
  }
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function decodeVLQ (str) {
  const values = []
  let shift = 0
  let value = 0

  for (let i = 0; i < str.length; i++) {
    const digit = B64.indexOf(str.charAt(i))
    if (digit === -1) continue

    value += (digit & 31) << shift

    if (digit & 32) {
      shift += 5
    } else {
      const negate = value & 1
      value >>= 1
      values.push(negate ? -value : value)
      value = 0
      shift = 0
    }
  }

  return values
}

// generated line (1-based) -> source line (1-based).
//
// Deliberately per LINE, by majority vote, rather than per column: Babel gives
// synthesized code (a compiled `for` header's `var _i = 0`) the position of
// whatever preceded it, so a column-accurate lookup at column 0 of a loop
// header answers with the line ABOVE it — which made the active-line marker
// flicker between two lines on every iteration. Every generated line here
// belongs to one source statement, so the line's dominant mapping is the
// honest answer.
function buildLineMap (mappings) {
  const map = {}
  let sourceLine = 0
  let sourceColumn = 0
  let sourceIndex = 0

  mappings.split(';').forEach((lineMappings, generatedIndex) => {
    if (!lineMappings) return

    let generatedColumn = 0
    const votes = {}
    let lastColumn = -1
    let lastLine = null

    lineMappings.split(',').forEach(segment => {
      const fields = decodeVLQ(segment)
      generatedColumn += fields[0] || 0

      // a 1-field segment carries no source position
      if (fields.length < 4) return

      sourceIndex += fields[1]
      sourceLine += fields[2]
      sourceColumn += fields[3]

      const line = sourceLine + 1
      votes[line] = (votes[line] || 0) + 1

      if (generatedColumn >= lastColumn) {
        lastColumn = generatedColumn
        lastLine = line
      }
    })

    let winner = null
    let winnerVotes = -1

    Object.keys(votes).forEach(key => {
      const line = Number(key)
      const count = votes[key]
      // ties go to the right-most mapping, which is the statement that
      // actually occupies the line
      if (count > winnerVotes || (count === winnerVotes && line === lastLine)) {
        winnerVotes = count
        winner = line
      }
    })

    if (winner !== null) map[generatedIndex + 1] = winner
  })

  return map
}

// Babel only emits these when the script used async/await. Detecting them in
// the OUTPUT avoids the false positives a regex over the source would hit
// (the words "async" or "await" inside a string, a comment or a locator).
const ASYNC_MARKERS = ['_asyncToGenerator', 'regeneratorRuntime', '_regenerator']

const ASYNC_MESSAGE =
  'async/await is not supported in Ui.Vision scripts — and is not needed: ' +
  'every uiv.* call already waits for its command to finish before the next ' +
  'line runs. Remove async/await and write the calls in plain sequence.'

// A parse that dies at the very end of the file — "Unexpected token" with
// nothing but whitespace after the reported position — is almost always an
// unclosed brace far above: the parser consumed the rest of the program while
// waiting for the closing "}" and only gave up at EOF. Field report 2026-09-01:
// a user read the resulting caret-on-a-blank-last-line as every script being
// broken. Name the real cause instead of pointing at the empty line.
const EOF_HINT =
  'The script ended while a block was still open: a "{", "(" or "[" opened ' +
  'earlier is missing its closing counterpart. The position above is where ' +
  'the parser gave up (the end of the file), not where the problem is — ' +
  'check the code above, and any @include\'d files, with an editor that ' +
  'highlights matching brackets.'

// True when only whitespace remains at and after the reported position, i.e.
// the parser stopped at the effective end of the source.
function stopsAtEndOfSource (source, loc) {
  const lines = String(source).split('\n')
  if (loc.line > lines.length) return true
  const rest = [lines[loc.line - 1].slice(loc.column || 0)]
    .concat(lines.slice(loc.line))
    .join('\n')
  return !/\S/.test(rest)
}

/**
 * Compile a user script to ES5 for the sandbox.
 *
 * Returns { code, lineMap } where lineMap translates a line of `code` back to
 * the line the user wrote. Throws an Error carrying `.scriptLine` when the
 * script cannot be compiled, so the caller can point at the offending line.
 */
export async function transpileScript (source) {
  const Babel = await loadBabel()
  const evaluateFunctions = {}
  // Preserve page functions BEFORE Babel introduces sandbox-only helpers.
  // A harmless directive survives compilation and identifies the original
  // source even when the function is passed through variables or aliases.
  const preservePageFunctions = ({ types: t }) => ({
    pre (file) {
      file.path.traverse({
        Function (path) {
          const n = path.node
          if (n.start == null || n.async || n.generator || path.isClassMethod() || path.isClassPrivateMethod()) return
          const key = '__uiv_page_function_' + n.start + '_' + n.end
          evaluateFunctions[key] = path.isObjectMethod()
            ? 'function (' + n.params.map(p => source.slice(p.start, p.end)).join(',') + ') ' + source.slice(n.body.start, n.body.end)
            : source.slice(n.start, n.end)
          path.ensureBlock()
          n.body.directives = n.body.directives || []
          n.body.directives.push(t.directive(t.directiveLiteral(key)))
        }
      })
    }
  })

  let result
  try {
    result = Babel.transform(source, { ...BABEL_OPTIONS, plugins: [preservePageFunctions] })
  } catch (e) {
    // Babel reports positions in the code it was HANDED (it never sees the
    // uiv polyfill). For a plain script that is the user's own file; once
    // @include has spliced files together it is the merged program, and the
    // caller owns mapping scriptLine/scriptColumn back to a file the user
    // can open. "unknown" is Babel's placeholder for a missing filename.
    let msg = String((e && e.message) || e).replace(/^unknown: /, '')
    let hint = null
    if (e && e.loc && typeof e.loc.line === 'number' &&
        /Unexpected token/.test(msg) && stopsAtEndOfSource(source, e.loc)) {
      hint = EOF_HINT
      msg += '\n\n' + hint
    }
    // A bare top-level `await uiv.page.click(...)` — the most common shape an
    // LLM writes — dies in the PARSER, before the ASYNC_MARKERS check below
    // can see any output: Babel's "'await' is only allowed within async
    // functions and at the top levels of modules" then invites the obvious
    // "fix", an async IIFE, which is what earns the real message one round
    // trip later (OPEN-ISSUES 42.2). Say the real thing the first time.
    if (/\bawait\b/.test(msg) && /only allowed within async|only valid in async|reserved word/i.test(msg)) {
      // first line only: the code frame under it just repeats the script
      msg = ASYNC_MESSAGE + ' (Babel: ' + msg.split('\n')[0].replace(/\s*\(\d+:\d+\)\s*$/, '') + ')'
    }
    const err = new Error('Syntax error: ' + msg)
    if (e && e.loc && typeof e.loc.line === 'number') {
      err.scriptLine = e.loc.line
      err.scriptColumn = e.loc.column
    }
    if (hint) err.hint = hint
    throw err
  }

  if (ASYNC_MARKERS.some(marker => result.code.indexOf(marker) !== -1)) {
    throw new Error(ASYNC_MESSAGE)
  }

  return {
    code: result.code,
    evaluateFunctions,
    lineMap: result.map ? buildLineMap(result.map.mappings) : null
  }
}

// Exported for the runner's own tests / fallback path
export { buildLineMap }
