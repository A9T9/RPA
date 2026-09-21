import { getStorageManager } from '@/services/storage'
import { fromJSONString } from '@/common/convert_utils'

// `// @include <macro path>` for JS script macros.
//
// Why a COMPILE-TIME splice and not a runtime uiv.runMacro/uiv.require:
// every interpreter instance owns its object graph, so a value handed back
// from a second interpreter can only ever be data — never a callable. A
// library of shared FUNCTIONS therefore cannot cross that boundary at all.
// Splicing the source into one program sidesteps it: included code is just
// code, so callers get real functions, real arguments and real return values
// instead of passing values through the variable pool.
//
// It is a comment pragma rather than uiv.include('x') on purpose: a function
// call implies it could sit inside an `if` and be conditional. This cannot —
// it happens before the program is parsed.
//
//   // @include lib/forms.js
//   fillContactForm('Tom', 'tom@example.com');
//
// The path is the one shown in the macro tree, folders included — e.g.
// "Demo and QA Test Scripts/Browser Core/Sub/Sub_DemoCsvRead_FillForm.js".
//
// An included file can still be opened and run on its own: `uiv.main` is true
// only for the macro the user actually started, so a self-test block guarded
// by `if (uiv.main) { ... }` runs standalone and stays quiet when included.

const INCLUDE_RE = /^[ \t]*\/\/[ \t]*@include[ \t]+(.+?)[ \t]*$/

// The include list is read from the raw source before anything is compiled,
// so a directive inside a string literal or block comment would also match.
// Requiring it to start the line keeps that to a deliberate act.
export function findIncludes (source) {
  const out = []
  String(source).split('\n').forEach((line, i) => {
    const m = INCLUDE_RE.exec(line)
    if (m) out.push({ path: m[1].replace(/^['"]|['"]$/g, '').trim(), line: i + 1 })
  })
  return out
}

async function readScript (path) {
  const storage = getStorageManager().getMacroStorage()
  const withExt = /\.js$/i.test(path) ? path : `${path}.js`

  const tryRead = async (name) => {
    if (!(await storage.exists(name).catch(() => false))) return null
    const text = await storage.read(name, 'Text')
    const macro = typeof text === 'string' ? fromJSONString(text) : text
    const script = macro && (macro.script !== undefined ? macro.script : (macro.data && macro.data.script))
    return typeof script === 'string' ? script : null
  }

  // accept both "lib/forms.js" and "lib/forms"
  const script = (await tryRead(withExt)) !== null ? await tryRead(withExt) : await tryRead(path)
  if (script === null) {
    throw new Error(
      `@include: macro '${path}' not found, or it is a command-table macro. ` +
      'Includes only work between JS script macros — give the path as it appears in the tree, e.g. lib/forms.js'
    )
  }
  return script
}

/**
 * Resolve every @include (depth first, each file spliced once) and return the
 * merged program plus a segment table describing which merged line came from
 * which file.
 *
 * Returns { source, segments } where segments is
 *   [{ path, startLine, lineCount, isMain }]
 * with startLine 1-based in the merged source.
 */
export async function resolveIncludes (mainSource, mainPath = null) {
  const seen = new Set()
  const parts = []

  const visit = async (source, path, stack) => {
    const includes = findIncludes(source)

    for (const inc of includes) {
      const key = inc.path.replace(/\.js$/i, '').toLowerCase()

      if (stack.indexOf(key) !== -1) {
        throw new Error(`@include: circular include — ${[...stack, key].join(' -> ')}`)
      }
      // already spliced by another file: including a shared helper twice is
      // normal, splicing it twice would redeclare everything
      if (seen.has(key)) continue

      seen.add(key)
      const included = await readScript(inc.path)
      await visit(included, inc.path, [...stack, key])

      parts.push({ path: inc.path, source: included, isMain: false })
    }
  }

  await visit(mainSource, mainPath, [])
  parts.push({ path: mainPath || '(this macro)', source: mainSource, isMain: true })

  // uiv.main tells a file whether it is the macro being run. Included files
  // see false — their `if (uiv.main)` self-tests stay quiet — and the flag
  // flips to true immediately before the main body. Each assignment sits on
  // the same line as the file's first line to keep the mapping 1:1.
  const lines = []
  const segments = []

  parts.forEach(part => {
    const body = part.source.split('\n')
    const flag = part.isMain ? 'uiv.main = true;' : 'uiv.main = false;'
    // the flag shares a line with nothing: it gets its own, and startLine
    // points at the line AFTER it, where the file's own line 1 lands
    lines.push(flag)
    segments.push({
      path: part.path,
      isMain: part.isMain,
      startLine: lines.length + 1,
      lineCount: body.length
    })
    body.forEach(l => lines.push(l))
  })

  return { source: lines.join('\n'), segments }
}

/**
 * Babel-style code frame for a merged-source position, numbered in the lines
 * of the file the position maps back to — Babel's own frame counts merged
 * lines, which match no file the user can open. The frame is clamped to the
 * segment, so neighbouring files and the injected `uiv.main` lines never
 * bleed into it. Returns '' when the position maps to no user file.
 */
export function frameMergedPosition (mergedSource, segments, mergedLine, column) {
  if (!segments || !segments.length) return ''
  const seg = segments.find(s => mergedLine >= s.startLine && mergedLine < s.startLine + s.lineCount)
  if (!seg) return ''

  const all = String(mergedSource).split('\n')
  const local = mergedLine - seg.startLine + 1
  const from = Math.max(1, local - 2)
  const to = Math.min(seg.lineCount, local + 1)
  const width = String(to).length
  const out = []

  for (let n = from; n <= to; n++) {
    const text = all[seg.startLine - 1 + (n - 1)] || ''
    const gutter = String(n).padStart(width)
    out.push(`${n === local ? '>' : ' '} ${gutter} | ${text}`)
    if (n === local && typeof column === 'number') {
      out.push(`  ${' '.repeat(width)} | ${' '.repeat(Math.max(0, column))}^`)
    }
  }
  return out.join('\n')
}

/**
 * Map a line in the merged program back to { path, line, isMain }.
 * Returns null for the injected `uiv.main = ...` lines, which belong to no
 * file the user wrote.
 */
export function locateMergedLine (segments, mergedLine) {
  if (!segments || !segments.length) return null

  for (const seg of segments) {
    if (mergedLine >= seg.startLine && mergedLine < seg.startLine + seg.lineCount) {
      return { path: seg.path, line: mergedLine - seg.startLine + 1, isMain: seg.isMain }
    }
  }
  return null
}
