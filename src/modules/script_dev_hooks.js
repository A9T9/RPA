import Ext from '@/common/web_extension'
import { store } from '@/redux'
import { runScript } from './script_runner'

// TEST-ONLY hooks for the JS-script prototype (branch js-macro-test1).
//
// They let external automation drive the side panel page when it is opened
// as a regular tab (chrome-extension://<id>/sidepanel.html?...). That page is
// NOT web-accessible, so only the address bar / devtools / other automation
// with tab access can open it with these params — regular web pages cannot.
// Remove before any release.
//
//   ?jsdev_reload=1    reload the extension (picks up a fresh dist build)
//   ?jsdev_autotest=1  run a diagnostic uiv script and mirror progress into
//                      document.title (readable via the tabs API):
//                      JSDEV|<logCount>|[type] last log line
//                      JSDEV|DONE|ok=...   /   JSDEV|CRASH|...
//   &jsdev_script=...  optional URL-encoded script to run instead of the
//                      built-in one

export function initScriptDevHooks () {
  const params = new URLSearchParams(window.location.search)

  if (params.get('jsdev_reload') === '1') {
    document.title = 'JSDEV|reloading'
    setTimeout(() => Ext.runtime.reload(), 200)
    return
  }

  if (params.get('jsdev_autotest') !== '1') return

  let finalTitle = null

  // mirror every new log line into the tab title; once the run is done keep
  // re-asserting the final title (other panel code also writes the title)
  let lastCount = -1
  const mirror = () => {
    if (finalTitle) {
      if (document.title !== finalTitle) document.title = finalTitle
      return
    }
    const logs = store.getState().logs
    if (logs.length !== lastCount) {
      lastCount = logs.length
      const l = logs[logs.length - 1]
      document.title = l
        ? `JSDEV|${logs.length}|[${l.type}] ${String(l.text).slice(0, 120)}`
        : 'JSDEV|0|no logs'
    }
  }
  store.subscribe(mirror)
  setInterval(mirror, 500)

  const script = params.get('jsdev_script') || [
    "uiv.goto('https://ui.vision/');",
    "var t = uiv.evaluate('return document.title');",
    "uiv.log('TITLE=' + t);",
    "var els = uiv.elementSearch('css=h1,h2', { required: false });",
    "uiv.log('HEADINGS=' + els.length);",
    "uiv.setVar('n', 2);",
    "if (uiv.getVar('n') * 21 === 42) { uiv.log('MATH=ok'); }"
  ].join('\n')

  document.title = 'JSDEV|starting'

  // give storage / players / license init time to settle before running
  setTimeout(() => {
    runScript(script)
      .then(r => {
        finalTitle = `JSDEV|DONE|ok=${r.ok}${r.error ? '|' + r.error : ''}${r.errorLine ? '|line ' + r.errorLine : ''}`.slice(0, 150)
      })
      .catch(e => {
        finalTitle = `JSDEV|CRASH|${(e && e.message) || e}`.slice(0, 150)
      })
  }, 4000)
}
