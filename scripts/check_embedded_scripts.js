// Build guard: parse the JS that ships INSIDE template literals — the uiv
// polyfill and every preinstalled demo. Webpack only ever sees these as
// strings, so a syntax error in them ships silently and first explodes at run
// time, in every macro at once (the polyfill is prepended to every script).
//
// Exactly that happened in v10.0.71: one comment line in the polyfill written
// as "\ the clicks..." instead of "// the clicks..." evaluated to a line of
// bare words, the polyfill stopped parsing, and EVERY macro failed with
// "Syntax error: Unexpected token (1:5)" — a position that pointed nowhere,
// because the error was in the prepended polyfill, not in anyone's macro.
// This script would have failed that build.
//
// Method: extract each template literal's raw text, evaluate it EXACTLY as
// the JS engine does (eval of the template text — a hand-rolled escape
// translator produced false positives on \\n inside comments), and feed the
// result to @babel/parser. Runs as prebuild/prebuild-ff.
'use strict'

const fs = require('fs')
const path = require('path')
const parser = require('@babel/parser')

const ROOT = path.join(__dirname, '..')
let failures = 0

// walk a template literal from after its opening backtick; returns the raw
// text with escape sequences intact
function extractLiteral (src, from) {
  let i = from
  let raw = ''
  while (i < src.length) {
    const c = src[i]
    if (c === '\\') { raw += src[i] + src[i + 1]; i += 2; continue }
    if (c === '`') return { raw, end: i }
    raw += c
    i++
  }
  return null
}

function parseOne (label, raw) {
  let code
  try {
    // the real evaluation — it IS a template literal. Safe because every
    // ${ in these blocks is escaped; a REAL interpolation would reference
    // module-scope variables and throw here, which is reported, not fatal
    // (that block simply cannot be statically checked).
    // eslint-disable-next-line no-eval
    code = eval('`' + raw + '`')
  } catch (e) {
    console.warn(`  ~ ${label}: cannot evaluate literal (${e.message}) — skipped`)
    return
  }

  try {
    parser.parse(code, { sourceType: 'script' })
  } catch (e) {
    failures++
    console.error(`  X ${label}: ${e.message}`)
    if (e.loc) {
      const lines = code.split('\n')
      for (let n = Math.max(0, e.loc.line - 3); n < Math.min(lines.length, e.loc.line + 2); n++) {
        console.error(`    ${n + 1 === e.loc.line ? '>>' : '  '} ${n + 1}: ${JSON.stringify(lines[n].slice(0, 100))}`)
      }
    }
  }
}

// --- 1. the polyfill --------------------------------------------------------
{
  const file = path.join(ROOT, 'src/modules/script_runner.js')
  const src = fs.readFileSync(file, 'utf8')
  const marker = 'const POLYFILL = `'
  const at = src.indexOf(marker)
  if (at < 0) {
    failures++
    console.error('  X POLYFILL literal not found in script_runner.js — marker changed? Update this guard.')
  } else {
    const lit = extractLiteral(src, at + marker.length)
    if (!lit) {
      failures++
      console.error('  X POLYFILL literal never closes')
    } else {
      parseOne('uiv polyfill (script_runner.js)', lit.raw)
    }
  }
}

// --- 2. every preinstalled demo ---------------------------------------------
{
  const file = path.join(ROOT, 'src/config/preinstall_js_scripts.js')
  const src = fs.readFileSync(file, 'utf8')
  let count = 0
  const re = /fileName:\s*'([^']+)'/g
  let m
  while ((m = re.exec(src))) {
    const codeAt = src.indexOf('code: `', m.index)
    if (codeAt < 0) continue
    // the code block must belong to THIS entry — bail if another fileName
    // sits between (an entry without a code block)
    const nextName = src.indexOf('fileName:', m.index + 1)
    if (nextName !== -1 && nextName < codeAt) continue
    const lit = extractLiteral(src, codeAt + 'code: `'.length)
    if (!lit) {
      failures++
      console.error(`  X ${m[1]}: code literal never closes`)
      continue
    }
    count++
    parseOne(m[1], lit.raw)
  }
  if (count === 0) {
    failures++
    console.error('  X no demo code blocks found in preinstall_js_scripts.js — pattern changed? Update this guard.')
  } else {
    console.log(`  checked ${count} demo scripts + the polyfill`)
  }
}

if (failures) {
  console.error(`check_embedded_scripts: ${failures} FAILURE(S) — this would break at run time, build aborted`)
  process.exit(1)
}
console.log('check_embedded_scripts: OK')
