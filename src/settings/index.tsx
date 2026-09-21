import { usageStatisticsDefault } from '@/services/usage/preferences'
// Settings page entry (options.html) — the ONE settings surface for the
// side panel, the IDE window and the background. A normal browser tab with
// its own lightweight store bootstrap: it hydrates config from storage and
// stays in sync via storage.onChanged, so a setting changed here shows up
// live in the panel/IDE and vice versa. It never registers as the panel
// (no I_AM_PANEL), so recording/playback routing is untouched.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { ConfigProvider } from 'antd'
import en_US from 'antd/lib/locale/en_US'
import 'antd/dist/reset.css'

import { store } from '@/redux'
import storage from '@/common/storage'
import { updateConfig, updateConfigFromStorage } from '@/actions'
import { installGoUivLinkDecorator } from '@/common/uiv_link'
import { getStorageManager, StorageStrategyType } from '@/services/storage'
import { getXFile } from '@/services/xmodules/xfile'
import SettingsApp from './settings_app'
import '@/styles/dark-theme.scss'
import './settings.scss'

// modules/ocr.ts (Show OCR Overlay test) reaches the store via window
window['store'] = store

installGoUivLinkDecorator()

const applyTheme = (useDarkTheme: boolean) => {
  document.documentElement.setAttribute('data-theme', useDarkTheme ? 'dark' : 'light')
}

const container = document.getElementById('root') as HTMLElement
const root = createRoot(container)

// getXFile().getConfig() first, same as the panel's bootstrap: in hard-drive
// mode the storage manager needs the XModule's rootDir before it can list or
// read anything. Failure is fine — browser mode does not use it.
Promise.all([
  storage.get('config'),
  getXFile().getConfig().catch(() => null)
]).then(([storedConfig]: any[]) => {
  const config = storedConfig || {}
  config.shareUsageStatistics = usageStatisticsDefault(config)
  applyTheme(!!config.useDarkTheme)

  // FIRST call of getStorageManager on this page, and it decides the storage
  // strategy for the whole page: without the explicit mode the singleton
  // defaults to XFile, so Backup/Restore would talk to the FileAccess XModule
  // even for users storing macros in the browser — and hang when it is absent.
  // '|| Browser': on a FRESH profile this page can load before the background
  // has persisted the default config — config.storageMode is undefined for a
  // moment, and the bare singleton default (XFile with no rootDir) made every
  // storage call here throw 'Arguments to path.join must be strings'
  // (measured live: the Restore Demo Macros buttons died silently).
  getStorageManager(config.storageMode || StorageStrategyType.Browser, {
    getConfig: () => (store.getState() as any).config,
    getMaxMacroCount: () => Promise.resolve(Infinity)
  })

  // hydrate WITHOUT writing back: every page persists its FULL config object,
  // so a boot-time write here could clobber keys another page just changed
  store.dispatch(updateConfigFromStorage(config))

  // OPEN-ISSUES 38: with the Desktop Automation module up, the shared files
  // in the home folder win over this copy when they are newer
  import('@/services/xmodules2/routing').then(r => r.probeXModules2()).then(active => {
    if (!active) return
    return import('@/services/shared_settings').then(s => s.pullSharedSettings((store.getState() as any).config, (patch: any) => store.dispatch(updateConfig(patch))))
  }).catch(() => {})

  // live sync with the side panel / IDE (same pattern as the side panel)
  storage.addListener((changes: any[]) => {
    const change = (changes || []).find(c => c.key === 'config')
    if (!change || !change.newValue) return

    const current: any = (store.getState() as any).config || {}
    const changedConfig = Object.keys(change.newValue).reduce((acc: any, key: string) => {
      const newVal = change.newValue[key]
      const curVal = current[key]
      const changed = typeof newVal === 'object' && newVal !== null
        ? JSON.stringify(newVal) !== JSON.stringify(curVal)
        : newVal !== curVal
      if (changed) acc[key] = newVal
      return acc
    }, {})

    if (Object.keys(changedConfig).length) {
      store.dispatch(updateConfigFromStorage(changedConfig))
      if ('useDarkTheme' in changedConfig) applyTheme(!!changedConfig.useDarkTheme)
      // follow live storage-mode switches (another page changing the mode, or
      // the background writing the fresh-install default) — the redux config
      // updated but the page's storage manager stayed on its boot-time mode
      if ('storageMode' in changedConfig && changedConfig.storageMode) {
        try { getStorageManager().setCurrentStrategyType(changedConfig.storageMode) } catch (e) { /* mode not usable here */ }
      }
    }
  })

  document.title = 'Ui.Vision Settings'

  root.render(
    <ConfigProvider
      locale={en_US}
      theme={{
        token: {
          borderRadius: 8,
          colorPrimary: '#1a6ce0'
        }
      }}
    >
      <Provider store={store}>
        <SettingsApp />
      </Provider>
    </ConfigProvider>
  )
})
