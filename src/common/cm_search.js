// Fork of codemirror/addon/search/search.js (CM 5.65, MIT, Marijn Haverbeke)
// with a live match counter — the ONE thing the stock addon lacks. CM5 is
// frozen upstream, so this fork cannot drift.
//
// Changes against stock, all marked with [count]:
//   1. A "x of N matches" counter renders inside the search dialog and updates
//      live as the query is typed (persistent search re-runs startSearch per
//      keystroke) and on every next/prev jump. Zero matches shows "no matches"
//      in red — the stock addon just silently did nothing.
//   2. Ctrl-F / Cmd-F are rebound to findPersistent: the dialog stays open,
//      searches as you type, Enter jumps to the next match, Esc closes. The
//      one-shot prompt dialog of stock `find` closes on Enter, which leaves a
//      counter nowhere to live.
// Everything else (replace, replaceAll, jump behavior, /re/ syntax) is stock.
import CodeMirror from 'codemirror'
import 'codemirror/addon/search/searchcursor'
import 'codemirror/addon/dialog/dialog'

;(function (CodeMirror) {
  'use strict'

  // default search panel location
  CodeMirror.defineOption('search', { bottom: false })

  function searchOverlay (query, caseInsensitive) {
    if (typeof query == 'string')
      query = new RegExp(query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'), caseInsensitive ? 'gi' : 'g')
    else if (!query.global)
      query = new RegExp(query.source, query.ignoreCase ? 'gi' : 'g')

    return { token: function (stream) {
      query.lastIndex = stream.pos
      var match = query.exec(stream.string)
      if (match && match.index == stream.pos) {
        stream.pos += match[0].length || 1
        return 'searching'
      } else if (match) {
        stream.pos = match.index
      } else {
        stream.skipToEnd()
      }
    } }
  }

  function SearchState () {
    this.posFrom = this.posTo = this.lastQuery = this.query = null
    this.overlay = null
  }

  function getSearchState (cm) {
    return cm.state.search || (cm.state.search = new SearchState())
  }

  function queryCaseInsensitive (query) {
    return typeof query == 'string' && query == query.toLowerCase()
  }

  function getSearchCursor (cm, query, pos) {
    // Heuristic: if the query string is all lowercase, do a case insensitive search.
    return cm.getSearchCursor(query, pos, { caseFold: queryCaseInsensitive(query), multiline: true })
  }

  // [count] how many matches in the document, and which one the cursor sits on.
  // Capped so a pathological query on a huge doc cannot stall typing; macros
  // are a few thousand lines at most, the cap is never reached in practice.
  var COUNT_CAP = 9999
  function countMatches (cm, state) {
    var total = 0
    var current = 0
    var from = state.posFrom
    var cur = getSearchCursor(cm, state.query)
    while (cur.findNext()) {
      total++
      if (from && (cur.from().line < from.line || (cur.from().line == from.line && cur.from().ch <= from.ch))) current = total
      if (total >= COUNT_CAP) break
    }
    return { total: total, current: current, capped: total >= COUNT_CAP }
  }

  // [count] render into the open dialog; safe no-op when the dialog is closed
  // (e.g. findNext long after the persistent dialog was dismissed)
  function updateCountDisplay (cm) {
    var dialogEl = cm.display.wrapper.querySelector('.CodeMirror-dialog')
    if (!dialogEl) return
    var out = dialogEl.querySelector('.CodeMirror-search-count')
    if (!out) {
      out = document.createElement('span')
      out.className = 'CodeMirror-search-count'
      dialogEl.appendChild(out)
    }
    var state = getSearchState(cm)
    if (!state.query) { out.textContent = ''; return }
    var c = countMatches(cm, state)
    out.textContent = c.total
      ? (c.current ? c.current + ' of ' : '') + c.total + (c.capped ? '+' : '') + (c.total == 1 && !c.capped ? ' match' : ' matches')
      : 'no matches'
    out.style.color = c.total ? '' : '#c0392b'
  }

  function persistentDialog (cm, text, deflt, onEnter, onKeyDown, onInput) {
    cm.openDialog(text, onEnter, {
      value: deflt,
      selectValueOnOpen: true,
      closeOnEnter: false,
      onClose: function () { clearSearch(cm) },
      onKeyDown: onKeyDown,
      // [count] live search-as-you-type — the dialog addon has had this hook
      // all along, the stock search addon just never used it
      onInput: onInput ? function (e, inputValue) { onInput(inputValue) } : undefined,
      bottom: cm.options.search.bottom
    })
  }

  function dialog (cm, text, shortText, deflt, f) {
    if (cm.openDialog) cm.openDialog(text, f, { value: deflt, selectValueOnOpen: true, bottom: cm.options.search.bottom })
    else f(prompt(shortText, deflt))
  }

  function confirmDialog (cm, text, shortText, fs) {
    if (cm.openConfirm) cm.openConfirm(text, fs)
    else if (confirm(shortText)) fs[0]()
  }

  function parseString (string) {
    return string.replace(/\\([nrt\\])/g, function (match, ch) {
      if (ch == 'n') return '\n'
      if (ch == 'r') return '\r'
      if (ch == 't') return '\t'
      if (ch == '\\') return '\\'
      return match
    })
  }

  function parseQuery (query) {
    var isRE = query.match(/^\/(.*)\/([a-z]*)$/)
    if (isRE) {
      try { query = new RegExp(isRE[1], isRE[2].indexOf('i') == -1 ? '' : 'i') }
      catch (e) {} // Not a regular expression after all, do a string search
    } else {
      query = parseString(query)
    }
    if (typeof query == 'string' ? query == '' : query.test(''))
      query = /x^/
    return query
  }

  function startSearch (cm, state, query) {
    state.queryText = query
    state.query = parseQuery(query)
    cm.removeOverlay(state.overlay, queryCaseInsensitive(state.query))
    state.overlay = searchOverlay(state.query, queryCaseInsensitive(state.query))
    cm.addOverlay(state.overlay)
    if (cm.showMatchesOnScrollbar) {
      if (state.annotate) { state.annotate.clear(); state.annotate = null }
      state.annotate = cm.showMatchesOnScrollbar(state.query, queryCaseInsensitive(state.query))
    }
    updateCountDisplay(cm) // [count] live update while the query is typed
  }

  function doSearch (cm, rev, persistent, immediate) {
    var state = getSearchState(cm)
    if (state.query) return findNext(cm, rev)
    var q = cm.getSelection() || state.lastQuery
    if (q instanceof RegExp && q.source == 'x^') q = null
    if (persistent && cm.openDialog) {
      var hiding = null
      // [count] anchor for live search: every keystroke restarts the search
      // from where the cursor was when the dialog OPENED — without this,
      // typing "foo" ("f", "fo", "foo") would walk forward match by match
      var startPos = cm.getCursor()
      var liveSearch = function (inputValue) {
        if (inputValue == state.queryText) return
        if (!inputValue) {
          cm.operation(function () { clearSearch(cm) })
          updateCountDisplay(cm)
          return
        }
        startSearch(cm, state, inputValue)
        state.posFrom = state.posTo = startPos
        findNext(cm, false)
      }
      var searchNext = function (query, event) {
        CodeMirror.e_stop(event)
        if (!query) return
        if (query != state.queryText) {
          startSearch(cm, state, query)
          state.posFrom = state.posTo = cm.getCursor()
        }
        if (hiding) hiding.style.opacity = 1
        findNext(cm, event.shiftKey, function (_, to) {
          var dialog
          if (to.line < 3 && document.querySelector &&
              (dialog = cm.display.wrapper.querySelector('.CodeMirror-dialog')) &&
              dialog.getBoundingClientRect().bottom - 4 > cm.cursorCoords(to, 'window').top)
            (hiding = dialog).style.opacity = 0.4
        })
      }
      persistentDialog(cm, getQueryDialog(cm), q, searchNext, function (event, query) {
        var keyName = CodeMirror.keyName(event)
        var extra = cm.getOption('extraKeys'), cmd = (extra && extra[keyName]) || CodeMirror.keyMap[cm.getOption('keyMap')][keyName]
        if (cmd == 'findNext' || cmd == 'findPrev' ||
          cmd == 'findPersistentNext' || cmd == 'findPersistentPrev') {
          CodeMirror.e_stop(event)
          startSearch(cm, getSearchState(cm), query)
          cm.execCommand(cmd)
        } else if (cmd == 'find' || cmd == 'findPersistent') {
          CodeMirror.e_stop(event)
          searchNext(query, event)
        }
      }, liveSearch)
      if (immediate && q) {
        startSearch(cm, state, q)
        findNext(cm, rev)
      }
    } else {
      dialog(cm, getQueryDialog(cm), 'Search for:', q, function (query) {
        if (query && !state.query) cm.operation(function () {
          startSearch(cm, state, query)
          state.posFrom = state.posTo = cm.getCursor()
          findNext(cm, rev)
        })
      })
    }
  }

  function findNext (cm, rev, callback) { cm.operation(function () {
    var state = getSearchState(cm)
    var cursor = getSearchCursor(cm, state.query, rev ? state.posFrom : state.posTo)
    if (!cursor.find(rev)) {
      cursor = getSearchCursor(cm, state.query, rev ? CodeMirror.Pos(cm.lastLine()) : CodeMirror.Pos(cm.firstLine(), 0))
      if (!cursor.find(rev)) {
        updateCountDisplay(cm) // [count] zero matches must still say so
        return
      }
    }
    cm.setSelection(cursor.from(), cursor.to())
    cm.scrollIntoView({ from: cursor.from(), to: cursor.to() }, 20)
    state.posFrom = cursor.from(); state.posTo = cursor.to()
    updateCountDisplay(cm) // [count] "x of N" follows the jump
    if (callback) callback(cursor.from(), cursor.to())
  }) }

  function clearSearch (cm) { cm.operation(function () {
    var state = getSearchState(cm)
    state.lastQuery = state.query
    if (!state.query) return
    state.query = state.queryText = null
    cm.removeOverlay(state.overlay)
    if (state.annotate) { state.annotate.clear(); state.annotate = null }
  }) }

  function el (tag, attrs) {
    var element = tag ? document.createElement(tag) : document.createDocumentFragment()
    for (var key in attrs) {
      element[key] = attrs[key]
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i]
      element.appendChild(typeof child == 'string' ? document.createTextNode(child) : child)
    }
    return element
  }

  function getQueryDialog (cm) {
    var label = el('label', { className: 'CodeMirror-search-label' },
                   cm.phrase('Search:'),
                   el('input', { type: 'text', 'style': 'width: 10em', className: 'CodeMirror-search-field',
                                id: 'CodeMirror-search-field' }))
    label.setAttribute('for', 'CodeMirror-search-field')
    return el('', null, label, ' ',
              el('span', { style: 'color: #666', className: 'CodeMirror-search-hint' },
                 cm.phrase('(Use /re/ syntax for regexp search)')))
  }
  function getReplaceQueryDialog (cm) {
    return el('', null, ' ',
              el('input', { type: 'text', 'style': 'width: 10em', className: 'CodeMirror-search-field' }), ' ',
              el('span', { style: 'color: #666', className: 'CodeMirror-search-hint' },
                 cm.phrase('(Use /re/ syntax for regexp search)')))
  }
  function getReplacementQueryDialog (cm) {
    return el('', null,
              el('span', { className: 'CodeMirror-search-label' }, cm.phrase('With:')), ' ',
              el('input', { type: 'text', 'style': 'width: 10em', className: 'CodeMirror-search-field' }))
  }
  function getDoReplaceConfirm (cm) {
    return el('', null,
              el('span', { className: 'CodeMirror-search-label' }, cm.phrase('Replace?')), ' ',
              el('button', {}, cm.phrase('Yes')), ' ',
              el('button', {}, cm.phrase('No')), ' ',
              el('button', {}, cm.phrase('All')), ' ',
              el('button', {}, cm.phrase('Stop')))
  }

  function replaceAll (cm, query, text) {
    cm.operation(function () {
      for (var cursor = getSearchCursor(cm, query); cursor.findNext();) {
        if (typeof query != 'string') {
          var match = cm.getRange(cursor.from(), cursor.to()).match(query)
          cursor.replace(text.replace(/\$(\d)/g, function (_, i) { return match[i] }))
        } else cursor.replace(text)
      }
    })
  }

  function replace (cm, all) {
    if (cm.getOption('readOnly')) return
    var query = cm.getSelection() || getSearchState(cm).lastQuery
    var dialogText = all ? cm.phrase('Replace all:') : cm.phrase('Replace:')
    var fragment = el('', null,
                      el('span', { className: 'CodeMirror-search-label' }, dialogText),
                      getReplaceQueryDialog(cm))
    dialog(cm, fragment, dialogText, query, function (query) {
      if (!query) return
      query = parseQuery(query)
      dialog(cm, getReplacementQueryDialog(cm), cm.phrase('Replace with:'), '', function (text) {
        text = parseString(text)
        if (all) {
          replaceAll(cm, query, text)
        } else {
          clearSearch(cm)
          var cursor = getSearchCursor(cm, query, cm.getCursor('from'))
          var advance = function () {
            var start = cursor.from(), match
            if (!(match = cursor.findNext())) {
              cursor = getSearchCursor(cm, query)
              if (!(match = cursor.findNext()) ||
                  (start && cursor.from().line == start.line && cursor.from().ch == start.ch)) return
            }
            cm.setSelection(cursor.from(), cursor.to())
            cm.scrollIntoView({ from: cursor.from(), to: cursor.to() })
            confirmDialog(cm, getDoReplaceConfirm(cm), cm.phrase('Replace?'),
                          [function () { doReplace(match) }, advance,
                           function () { replaceAll(cm, query, text) }])
          }
          var doReplace = function (match) {
            cursor.replace(typeof query == 'string' ? text :
                           text.replace(/\$(\d)/g, function (_, i) { return match[i] }))
            advance()
          }
          advance()
        }
      })
    })
  }

  CodeMirror.commands.find = function (cm) { clearSearch(cm); doSearch(cm) }
  CodeMirror.commands.findPersistent = function (cm) { clearSearch(cm); doSearch(cm, false, true) }
  CodeMirror.commands.findPersistentNext = function (cm) { doSearch(cm, false, true, true) }
  CodeMirror.commands.findPersistentPrev = function (cm) { doSearch(cm, true, true, true) }
  CodeMirror.commands.findNext = doSearch
  CodeMirror.commands.findPrev = function (cm) { doSearch(cm, true) }
  CodeMirror.commands.clearSearch = clearSearch
  CodeMirror.commands.replace = replace
  CodeMirror.commands.replaceAll = function (cm) { replace(cm, true) }

  // [count] Ctrl-F/Cmd-F open the PERSISTENT dialog (stays open, live counter,
  // Enter = next, Esc = close) instead of stock one-shot `find`
  if (CodeMirror.keyMap.pcDefault) CodeMirror.keyMap.pcDefault['Ctrl-F'] = 'findPersistent'
  if (CodeMirror.keyMap.macDefault) CodeMirror.keyMap.macDefault['Cmd-F'] = 'findPersistent'
})(CodeMirror)
