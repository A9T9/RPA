import $ from 'jquery'
import parseJson from 'parse-json'
import URL from 'url-parse'
import { pick } from './utils'

// HTML template from test case
function genHtml ({ name, baseUrl, commandTrs }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head profile="http://selenium-ide.openqa.org/profiles/test-case">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<link rel="selenium.base" href="${baseUrl}" />
<title>${name}</title>
</head>
<body>
<table cellpadding="1" cellspacing="1" border="1">
<thead>
<tr><td rowspan="1" colspan="3">${name}</td></tr>
</thead><tbody>
${commandTrs.join('\n')}
</tbody></table>
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
export function toHtml ({ name, baseUrl, commands }) {
  const commandTrs = commands.map(c => `
    <tr>
      <td>${c.cmd || ''}</td>
      <td>${c.target || ''}</td>
      <td>${c.value || ''}</td>
    </tr>
    `
  )

  return genHtml({ name, baseUrl, commandTrs })
}

// generate data uri of html from a test case
export function toHtmlDataUri (obj) {
  return htmlDataUri(toHtml(obj))
}

// parse html to test case
export function fromHtml (html) {
  const $root   = $(`<div>${html}</div>`)
  const $base   = $root.find('link')
  const $title  = $root.find('title')
  const $trs    = $root.find('tbody > tr')

  const baseUrl   = $base.attr('href')
  const name      = $title.text()

  if (!baseUrl || !baseUrl.length) {
    throw new Error('fromHtml: missing baseUrl')
  }

  if (!name || !name.length) {
    throw new Error('fromHtml: missing title')
  }

  const commands  = [].slice.call($trs).map(tr => {
    const $el       = $(tr)
    const trHtml    = $el[0].outerHtml
    const $children = $el.children()
    const $cmd      = $children.eq(0)
    const $tgt      = $children.eq(1)
    const $val      = $children.eq(2)
    const cmd       = $cmd && $cmd.text()
    const target    = $tgt && $tgt.text()
    const value     = $val && $val.text()

    if (!cmd || !cmd.length) {
      throw new Error('missing cmd in ' + trHtml)
    }

    return { cmd, target, value }
  })

  return { name, data: {baseUrl, commands} }
}

// parse json to test case
// the current json structure doesn't provide fileName,
// so must provide a file name as the second parameter
export function fromJSONString (str, fileName) {
  if (!fileName || !fileName.length) {
    throw new Error('fromJSONString: must provide fileName')
  }

  const name      = fileName.split('.')[0]
  const obj       = parseJson(str)
  const commands  = obj.Commands.map(c => ({
    cmd: c.Command,
    target: c.Target,
    value: c.Value
  }))
  const openTc = commands.find(tc => tc.cmd === 'open')
  let url     = ''
  let baseUrl = ''

  if (openTc) {
    url     = new URL(openTc.target)
    baseUrl = url.origin + '/'

    openTc.target = url.href.replace(url.origin, '')
  }

  return { name, data: { baseUrl, commands } }
}

// generate json from a test case
export function toJSONString (obj) {
  const getToday = () => {
    const d = new Date()
    return [
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate()
    ].join('-')
  }
  const data = {
    CreationDate: getToday(),
    Commands: obj.commands.map(c => {
      const target = c.cmd !== 'open' ? c.target : (obj.baseUrl.replace(/\/\s*$/, '') + c.target)
      return {
        Command: c.cmd,
        Target: target || '',
        Value: c.value || ''
      }
    })
  }

  return JSON.stringify(data, null, 2)
}

// generate data uri of json from a test case
export function toJSONDataUri (obj) {
  return jsonDataUri(toJSONString(obj))
}
