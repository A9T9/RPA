const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')

const filename = path.join(__dirname, '../src/common/ui_locale.js')

// Only the browser's language API is substituted; run the real translator
// and load its actual dictionary through Node's normal module resolution.
function loadLocale (globals = {}) {
  const context = {
    module: { exports: {} },
    require: createRequire(filename),
    ...globals
  }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename })
  return context.module.exports
}

function forLanguage (language) {
  return loadLocale({ chrome: { i18n: { getUILanguage: () => language } } })
}

test('simplified Chinese browser locales translate the common UI', () => {
  for (const language of ['zh', 'zh-CN', 'zh_CN', 'zh-SG', 'ZH-cn', 'zh-Hans', 'zh-Hans-SG', 'zh-Hans-TW']) {
    assert.equal(forLanguage(language).isSimplifiedChinese(), true, language)
    assert.equal(forLanguage(language).t('Record'), '录制', language)
  }
})

test('English, unsupported and traditional Chinese locales keep the English UI', () => {
  for (const language of ['en-US', 'de', 'ja', 'zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-CN', 'zh-Latn-CN', 'zh-CN-@bad', '']) {
    assert.equal(forLanguage(language).isSimplifiedChinese(), false, language)
    assert.equal(forLanguage(language).t('Record'), 'Record', language)
  }
})

test('Firefox uses browser.i18n and non-extension previews use navigator.language', () => {
  assert.equal(loadLocale({ browser: { i18n: { getUILanguage: () => 'zh-CN' } } }).t('Save'), '保存')
  assert.equal(loadLocale({ navigator: { language: 'zh-SG' } }).t('Save'), '保存')
  assert.equal(loadLocale().t('Save'), 'Save')
})

test('extension UI language takes precedence over navigator language', () => {
  const locale = loadLocale({ chrome: { i18n: { getUILanguage: () => 'en-US' } }, navigator: { language: 'zh-CN' } })
  assert.equal(locale.t('Save'), 'Save')
})

test('unknown messages and prototype property names fall back to their English source', () => {
  const locale = forLanguage('zh-CN')
  assert.equal(locale.t('An untranslated message'), 'An untranslated message')
  assert.equal(locale.t('constructor'), 'constructor')
  assert.equal(locale.t('toString'), 'toString')
})

test('interpolation preserves zero and missing placeholders in both languages', () => {
  assert.equal(forLanguage('zh-CN').t('Line {line}', { line: 0 }), '第 0 行')
  assert.equal(forLanguage('en-US').t('Line {line}', { line: 12 }), 'Line 12')
  assert.equal(forLanguage('zh-CN').t('Line {line}'), '第 {line} 行')
  assert.equal(forLanguage('zh-CN').t('Unknown {value}', { value: '$&' }), 'Unknown $&')
})

test('a broken language API falls back to the navigator and never prevents rendering', () => {
  const locale = loadLocale({ chrome: { i18n: { getUILanguage: () => { throw new Error('unavailable') } } }, navigator: { language: 'zh-CN' } })
  assert.equal(locale.t('Save'), '保存')
})
