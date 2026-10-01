const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const { transformSync } = require('@babel/core')
const React = require('react')
const { Select, Button, Tabs } = require('antd')

const root = path.join(__dirname, '..')

function dashboard (language) {
  const localeFile = path.join(root, 'src/common/ui_locale.js')
  const locale = { exports: {} }
  vm.runInNewContext(fs.readFileSync(localeFile, 'utf8'), {
    module: locale,
    require: createRequire(localeFile),
    chrome: { i18n: { getUILanguage: () => language } }
  })

  // Render the actual dashboard shell. Isolate file/storage services and
  // resource-list children; they perform browser I/O and do not own the
  // tab keys, toolbar visibility, or filter callbacks under test.
  const resourceList = () => null
  const services = {
    '@/common/ui_locale': locale.exports,
    '@/common/utils': { cn: (name) => name },
    '@/services/storage': { getStorageManager: () => ({ isXFileMode: () => false }) },
    '../../common/resource_not_loaded': { ResourceNotLoaded: resourceList },
    './csv_list': { CsvList: resourceList },
    './vision_list': { VisionList: resourceList },
    './screenshot_list': { ScreenshotList: resourceList }
  }
  const filename = path.join(root, 'src/containers/dashboard/bottom/index.js')
  const compiled = transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    presets: ['@babel/preset-react'], plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code
  const module = { exports: {} }
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require: (name) => {
      if (Object.prototype.hasOwnProperty.call(services, name)) return services[name]
      if (!name.startsWith('.') && !name.startsWith('@/')) return require(name)
      return {} // unused application imports; no service is initialized
    }
  }, { filename })
  const Component = module.exports.default.WrappedComponent
  const changes = []
  const clearLogs = () => {}
  const clearScreenshots = () => {}
  const instance = new Component({
    config: { showBottomArea: true, logFilter: 'All' }, logs: [],
    shouldLoadResources: false, screenshots: [], variables: [],
    clearLogs, clearScreenshots,
    updateConfig: value => changes.push(JSON.parse(JSON.stringify(value)))
  })
  return { instance, changes, clearLogs, clearScreenshots }
}

function elements (node) {
  if (!React.isValidElement(node)) return []
  return [node, ...React.Children.toArray(node.props.children).flatMap(elements)]
}

test('localized log labels keep the Logs tab key and expose working filter/clear controls', () => {
  for (const language of ['zh-CN', 'en-US']) {
    const view = dashboard(language)
    const tree = elements(view.instance.render())
    const tabs = tree.find(element => element.type === Tabs)
    const logs = tabs.props.items.find(item => item.key === 'Logs')
    assert.equal(logs.label, language === 'zh-CN' ? '日志' : 'Logs')
    const filter = tree.find(element => element.type === Select)
    assert.ok(filter, 'log toolbar must remain visible after translation')
    filter.props.onChange('Echo_And_Status')
    assert.deepEqual(view.changes, [{ logFilter: 'Echo_And_Status' }])
    assert.ok(tree.some(element => element.type === Button && element.props.onClick === view.clearLogs))
  }
})

test('localized screenshot labels keep the Screenshots tab key and its clear control', () => {
  for (const language of ['zh-CN', 'en-US']) {
    const view = dashboard(language)
    view.instance.state.activeTabForLogScreenshot = 'Screenshots'
    const tree = elements(view.instance.render())
    const tabs = tree.find(element => element.type === Tabs)
    const screenshots = tabs.props.items.find(item => item.key === 'Screenshots')
    assert.equal(screenshots.label, language === 'zh-CN' ? '截图' : 'Screenshots')
    assert.ok(tree.some(element => element.type === Button && element.props.onClick === view.clearScreenshots))
    assert.ok(!tree.some(element => element.type === Select))
  }
})
