/* global chrome browser */
const zhCN = require('./locales/zh_CN.json')

// Match the extension UI language, rather than the language of the website
// being automated. Browser language changes take effect on the next page load.
function getUiLanguage () {
  try {
    const api = typeof chrome !== 'undefined' && chrome.i18n
      ? chrome.i18n
      : typeof browser !== 'undefined' && browser.i18n
    if (api && api.getUILanguage) return api.getUILanguage()
  } catch (e) { /* previews or an unavailable extension context */ }
  return typeof navigator !== 'undefined' ? navigator.language : 'en'
}

const useChinese = (() => {
  try {
    const locale = new Intl.Locale(getUiLanguage().replace(/_/g, '-'))
    if (locale.language !== 'zh') return false
    if (locale.script) return locale.script === 'Hans'
    return locale.region === 'CN' || locale.region === 'SG' || !locale.region
  } catch (e) {
    return false
  }
})()

const isSimplifiedChinese = () => useChinese

// English source text is the fallback for unsupported languages and missing
// entries. Interpolate named values in both languages without changing data,
// command names, saved tab keys, log messages or AI prompt payloads.
function t (text, values = {}) {
  const translated = useChinese && Object.prototype.hasOwnProperty.call(zhCN, text)
    ? zhCN[text]
    : text
  return translated.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : placeholder
  )
}

module.exports = { isSimplifiedChinese, t }
