import 'error-polyfill'
import parseJson from 'parse-json'
import URL from 'url-parse'
import { normalizeCommandName } from './command'
import { getStorageManager } from '../services/storage'

const joinUrl = (base, url) => {
  const urlObj = new URL(url, base)
  return urlObj.toString()
}

// HTML template from test case
function genHtml ({ name, baseUrl, commandTrs, noImport }) {
  const tableHtml = noImport ? '<h3>Starting Browser and UI.Vision...</h3>' : `
    <table cellpadding="1" cellspacing="1" border="1">
    <thead>
    <tr><td rowspan="1" colspan="3">${name}</td></tr>
    </thead><tbody>
    ${commandTrs.join('\n')}
    </tbody></table>
  `
  const baseLink = noImport ? '' : `<link rel="selenium.base" href="${baseUrl}" />`

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head profile="http://selenium-ide.openqa.org/profiles/test-case">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
${baseLink}
<title>${name}</title>
</head>
<body>
${tableHtml}
<script>
(function() {
  var isExtensionLoaded = function () {
    const $root = document.documentElement
    return !!$root && !!$root.getAttribute('data-kantu')
  }
  var increaseCountInUrl = function (max) {
    var url   = new URL(window.location.href)
    var count = 1 + (parseInt(url.searchParams.get('reload') || 0))

    url.searchParams.set('reload', count)
    var nextUrl = url.toString()

    var shouldStop = count > max
    return [shouldStop, !shouldStop ? nextUrl : null]
  }
  var run = function () {
    try {
      var evt = new CustomEvent('kantuSaveAndRunMacro', {
        detail: {
          html: document.documentElement.outerHTML,
          noImport: ${noImport || 'false'},
          storageMode: '${getStorageManager().getCurrentStrategyType()}'
        }
      })

      window.dispatchEvent(evt)
      var intervalTimer = setInterval(() => window.dispatchEvent(evt), 1000);

      if (window.location.protocol === 'file:') {
        var onInvokeSuccess = function () {
          clearTimeout(timer)
          clearTimeout(reloadTimer)
          clearInterval(intervalTimer)
          window.removeEventListener('kantuInvokeSuccess', onInvokeSuccess)
        }
        var timer = setTimeout(function () {
          alert('Error #203: It seems you need to turn on *Allow access to file URLs* for Kantu in your browser extension settings.')
        }, 8000)

        window.addEventListener('kantuInvokeSuccess', onInvokeSuccess)
      }
    } catch (e) {
      alert('Kantu Bookmarklet error: ' + e.toString());
    }
  }
  var reloadTimer = null
  var main = function () {
    if (isExtensionLoaded())  return run()

    var MAX_TRY   = 3
    var INTERVAL  = 1000
    var tuple     = increaseCountInUrl(MAX_TRY)

    if (tuple[0]) {
      return alert('Error #204: It seems Ui.Vision is not installed yet - or you need to turn on *Allow access to file URLs* for Ui.Vision in your browser extension settings.')
    } else {
      reloadTimer = setTimeout(function () {
        window.location.href = tuple[1]
      }, INTERVAL)
    }
  }

  setTimeout(main, 500)
})();
</script>
</body>
</html>
  `
}

// generate data uri from html
function htmlDataUri (html) {
  return 'data:text/html;base64,' + window.btoa(unescape(encodeURIComponent(html)))
}

// generate data uri from json
function jsonDataUri (str) {
  return 'data:text/json;base64,' + window.btoa(unescape(encodeURIComponent(str)))
}

// generate html from a test case
export function toHtml ({ name, commands }) {
  const copyCommands  = commands.map(c => Object.assign({}, c))
  const openTc        = copyCommands.find(tc => tc.cmd === 'open')

  // Note: Aug 10, 2018, no baseUrl when exported to html
  // so that `${variable}` could be used in open command, and won't be prefixed with baseUrl
  const origin        = null
  const replacePath   = path => path
  // const url         = openTc && new URL(openTc.target)
  // const origin      = url && url.origin
  // const replacePath = (path) => {
  //   if (path.indexOf(origin) !== 0) return path
  //   const result = path.replace(origin, '')
  //   return result.length === 0 ? '/' : result
  // }

  if (openTc) {
    openTc.target = replacePath(openTc.target)
  }

  const commandTrs = copyCommands.map(c => {
    if (c.cmd === 'open') {
      // Note: remove origin if it's the same as the first open command
      c.target = replacePath(c.target)
    }

    return `
      <tr>
        <td>${c.cmd || ''}</td>
        <td>${c.target || ''}</td>
        <td>${c.value || ''}</td>
      </tr>
    `
  })

  return genHtml({
    name,
    commandTrs,
    baseUrl: origin || ''
  })
}

export function generateEmptyHtml () {
  return genHtml({
    name: 'UI.Vision Autostart Page',
    commandTrs: [],
    baseUrl: '',
    noImport: true
  })
}

// generate data uri of html from a test case
export function toHtmlDataUri (obj) {
  return htmlDataUri(toHtml(obj))
}

// parse html to test case
export function fromHtml (html) {
  const $root = document.createElement('div')
  $root.innerHTML = html

  const $base   = $root.querySelector('link')
  const $title  = $root.querySelector('title')
  const $trs    = $root.querySelectorAll('tbody > tr')

  const baseUrl   = $base && $base.getAttribute('href')
  const name      = $title.innerText

  if (!name || !name.length) {
    throw new Error('fromHtml: missing title')
  }

  const commands  = [].slice.call($trs).map(tr => {
    const trHtml    = tr.outerHtml

    // Note: remove any datalist option in katalon-like html file
    Array.from(tr.querySelectorAll('datalist')).forEach($item => {
      $item.remove()
    })

    const children = tr.children
    const $cmd      = children[0]
    const $tgt      = children[1]
    const $val      = children[2]
    const cmd       = normalizeCommandName($cmd && $cmd.innerText)
    const value     = $val && $val.innerText
    let target      = $tgt && $tgt.innerText

    if (!cmd || !cmd.length) {
      throw new Error('missing cmd in ' + trHtml)
    }

    if (cmd === 'open') {
      // Note: with or without baseUrl
      target = baseUrl && baseUrl.length && !/:\/\//.test(target) ? joinUrl(baseUrl, target) : target
    }

    return { cmd, target, value }
  })

  return { name, data: { commands } }
}

// parse json to test case
// the current json structure doesn't provide fileName,
// so must provide a file name as the second parameter
export function fromJSONString (str, fileName, opts = {}) {
  // Note: Exported JSON from older version Kantu (via 'export to json')
  // has an invisible charactor (char code65279, known as BOM). It breaks JSON parser.
  // So it's safer to filter it out here
  const obj       = parseJson(str.replace(/^\s*/, ''))
  const name      = fileName ? fileName.replace(/\.json$/i, '') : (obj.Name || '__imported__')

  if (obj.macros) {
    throw new Error(`This is a test suite, not a macro`)
  }

  if (!Array.isArray(obj.Commands)) {
    throw new Error(`'Commands' field must be an array`)
  }

  const commands  = obj.Commands.map(c => {
    const obj = {
      cmd:    normalizeCommandName(c.Command),
      target: c.Target,
      value:  c.Value,
      description: c.Description || ''
    }

    if (Array.isArray(c.Targets)) {
      obj.targetOptions = c.Targets
    }

    return obj
  })

  return {
    name,
    data: { commands },
    ...(opts.withStatus && obj.status ? { status: obj.status } : {}),
    ...(opts.withId && obj.id ? { id: obj.id } : {})
  }
}

// generate json from a test case
export function toJSONString (obj, opts = {}) {
  const getToday = () => {
    const d = new Date()
    return [
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate()
    ].join('-')
  }
  const data = {
    Name: obj.name,
    CreationDate: getToday(),
    Commands: obj.commands.map(c => {
      return {
        Command: c.cmd,
        Target:  c.target || '',
        Value:   c.value || '',
        Targets: !opts.ignoreTargetOptions ? c.targetOptions : undefined,
        Description: c.description || ''
      }
    }),
    ...(opts.withStatus && obj.status ? { status: obj.status } : {}),
    ...(opts.withId && obj.id ? { id: obj.id } : {})
  }

  return JSON.stringify(data, null, 2)
}

// generate data uri of json from a test case
export function toJSONDataUri (obj) {
  return jsonDataUri(toJSONString(obj))
}

export function toBookmarkData (obj) {
  const { path, bookmarkTitle } = obj

  if (!path)  throw new Error('path is required to generate bookmark for macro')
  if (!bookmarkTitle)  throw new Error('bookmarkTitle is required to generate bookmark for macro')

  // Note: for backward compatibility, still use `name` field (which makes sense in flat fs mode) to store `path`
  // after we migrate to standard folder mode
  //
  // Use `JSON.stringify(path)` so that it could escape "\" in win32 paths
  return {
    title: bookmarkTitle,
    url: `javascript:
      (function() {
        try {
          var evt = new CustomEvent('kantuRunMacro', {
            detail: {
              name: ${JSON.stringify(path.replace(/\.json$/i, ''))},
              from: 'bookmark',
              storageMode: '${getStorageManager().getCurrentStrategyType()}',
              closeRPA: 1
            }
          });
          window.dispatchEvent(evt);
        } catch (e) {
          alert('Ui.Vision Bookmarklet error: ' + e.toString());
        }
      })();
    `
    .replace(/\n\s*/g, '')
  }
}

// It's a macro.html file that tries to open ui.vision.html which will be exported together
// with this entry html
export function generateMacroEntryHtml (macroRelativePath) {
  return `<!doctype html>
<html lang="en">
  <head>
    <title>UI.Vision Shortcut Page</title>
  </head>
  <body>
    <h3>Command line:</h3>
    <a id="run" href="ui.vision.html?direct=1&savelog=log.txt&macro=${macroRelativePath}">Click here</a>
    <br>
    <br>
    <!-- To start another macro just edit this HTML file and change the macro name in the command line above^. -->
    <!-- For more command line parameters see https://ui.vision/rpa/docs#cmd -->
    <script>
      window.location.href = document.getElementById("run").getAttribute("href");
    </script>
  </body>
</html>
`;
}
