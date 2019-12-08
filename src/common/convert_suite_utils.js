import parseJson from 'parse-json'
import { formatDate } from './utils'
import { getStorageManager } from '../services/storage'

export const stringifyTestSuite = (testSuite, testCases, opts = {}) => {
  const obj = {
    creationDate: formatDate(new Date()),
    name: testSuite.name,
    macros: testSuite.cases.map(item => {
      const loops   = parseInt(item.loops, 10)
      const tcId    = item.testCaseId
      const tc      = testCases.find(tc => tc.id === tcId)
      const tcName  = tc.name || '(Macro not found)'

      return {
        macro: tcName,
        loops: loops
      }
    }),
    ...(opts.withFold ? { fold: !!testSuite.fold } : {}),
    ...(opts.withId && testSuite.id ? { id: testSuite.id } : {}),
    ...(opts.withPlayStatus && testSuite.playStatus ? { playStatus: testSuite.playStatus } : {})
  }

  return JSON.stringify(obj, null, 2)
}

export const parseTestSuite = (text, testCases, opts = {}) => {
  // Note: Exported JSON from older version Kantu (via 'export to json')
  // has an invisible charactor (char code65279, known as BOM). It breaks JSON parser.
  // So it's safer to filter it out here
  const obj = parseJson(text.replace(/^\s*/, ''))

  if (typeof obj.name !== 'string' || obj.name.length === 0) {
    throw new Error('name must be a string')
  }

  if (!Array.isArray(obj.macros)) {
    throw new Error('macros must be an array')
  }

  const cases = obj.macros.map(item => {
    const tc = testCases.find(tc => tc.name === item.macro)

    if (!tc) {
      throw new Error(`No macro found with name '${item.macro}'`)
    }

    if (typeof item.loops !== 'number' || item.loops < 1) {
      item.loops = 1
    }

    return {
      testCaseId: tc.id,
      loops: item.loops
    }
  })

  const ts  = {
    cases,
    name: obj.name,
    ...(opts.withFold ? { fold: obj.fold === undefined ? true : obj.fold } : {}),
    ...(opts.withId && obj.id ? { id: obj.id } : {}),
    ...(opts.withPlayStatus && obj.playStatus ? { playStatus: obj.playStatus } : {})
  }

  return ts
}

export const validateTestSuiteText = parseTestSuite

export const toBookmarkData = (obj) => {
  const { name, bookmarkTitle } = obj

  if (!name)  throw new Error('name is required to generate bookmark for test suite')
  if (!bookmarkTitle)  throw new Error('bookmarkTitle is required to generate bookmark for test suite')

  return {
    title: bookmarkTitle,
    url: `javascript:
      (function() {
        try {
          var evt = new CustomEvent('kantuRunTestSuite', { detail: { name: '${name}', from: 'bookmark', storageMode: '${getStorageManager().getCurrentStrategyType()}' } });
          window.dispatchEvent(evt);
        } catch (e) {
          alert('Kantu Bookmarklet error: ' + e.toString());
        }
      })();
    `
    .replace(/\n\s*/g, '')
  }
}

export const toHtml = ({ name }) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>${name}</title>
</head>
<body>
<h1>${name}</h1>
<script>
(function() {
  try {
    var evt = new CustomEvent('kantuRunTestSuite', { detail: { name: '${name}', from: 'html', storageMode: '${getStorageManager().getCurrentStrategyType()}' } })  
    window.dispatchEvent(evt);

    if (window.location.protocol === 'file:') {
      var onInvokeSuccess = function () {
        clearTimeout(timer)
        window.removeEventListener('kantuInvokeSuccess', onInvokeSuccess)
      }
      var timer = setTimeout(function () {
        alert("Error: It seems you need to enable File Access for Kantu in the extension settings.")
      }, 2000)

      window.addEventListener('kantuInvokeSuccess', onInvokeSuccess)
    }
  } catch (e) {
    alert('Kantu Bookmarklet error: ' + e.toString());
  }
})();
</script>
</body>
</html>
  `
}
