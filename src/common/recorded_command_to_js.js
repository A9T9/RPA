// Recording in the JS editor: each recorded command becomes one line of
// uiv.* code (RECORD_ADD_COMMAND routes here when the JS view is active).
// The common commands map to the core API; everything else goes through the
// uiv.run legacy bridge, which replays any classic command 1:1.

const esc = (s) => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")

export function recordedCommandToJs ({ cmd, target, value }) {
  switch (cmd) {
    case 'open':
      return `uiv.goto('${esc(target)}');`

    // the AndWait variants need no explicit wait in JS: uiv calls after a
    // navigating click auto-wait for the new page / their element
    case 'click':
    case 'clickAndWait':
      return `uiv.page.click('${esc(target)}');`

    case 'type':
      return `uiv.page.fill('${esc(target)}', '${esc(value)}');`

    case 'select':
    case 'selectAndWait': {
      // the recorder emits 'label=Foo'; page.select takes the bare visible
      // label (and understands 'value=..' / 'index=N' prefixes as-is)
      const option = /^label=/.test(value || '') ? value.replace(/^label=/, '') : value
      return `uiv.page.selectOption('${esc(target)}', '${esc(option)}');`
    }

    // selectFrame, selectWindow, editContent, ...
    default:
      return value != null && value !== ''
        ? `uiv.run('${esc(cmd)}', '${esc(target)}', '${esc(value)}');`
        : `uiv.run('${esc(cmd)}', '${esc(target)}');`
  }
}
