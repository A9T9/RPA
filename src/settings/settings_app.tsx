// Settings page shell: sticky left nav + one section at a time, driven by
// the location hash (#ai, #ocr, ...) so every section is deep-linkable and
// openSettings('ai') from any extension page lands on the right section.
import React from 'react'
import Ext from '@/common/web_extension'

import PrivacyTab from './tabs/privacy'
import GeneralTab from './tabs/general'
import AITab from './tabs/ai'
import OcrTab from './tabs/ocr'
import VisionTab from './tabs/vision'
import XModules2Tab from './tabs/xmodules2'
import DesktopAppTab from './tabs/desktop_app'
import BackupTab from './tabs/backup'
import ApiTab from './tabs/api'
import ReplayTab from './tabs/replay'
import ProxyTab from './tabs/proxy'
import SecurityTab from './tabs/security'

type Section = {
  key: string
  label: string
  // a plain sentence, or JSX when part of it is a link
  hint: React.ReactNode
  component: React.ComponentType<any>
}

type NavGroup = {
  title: string | null
  // group header icon (the Ui.Vision logo for the Desktop Automation group)
  icon?: string
  sections: Section[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    sections: [
      { key: 'general', label: 'General', hint: 'Side panel, storage mode, color theme', component: GeneralTab },
      { key: 'ai', label: 'AI ✨', hint: 'AI provider, API keys, MCP bridge', component: AITab },
      { key: 'ocr', label: 'OCR', hint: 'Text recognition engines and languages', component: OcrTab },
      { key: 'vision', label: 'Vision', hint: 'Browser vs. desktop automation scope', component: VisionTab },
      { key: 'backup', label: 'Backup', hint: 'Automatic backup reminder, restore from ZIP', component: BackupTab }
    ]
  },
  {
    // OPEN-ISSUES 39: one header for the desktop side — the native module
    // (setup, permissions, self-tests) and the helper app (Ui.Vision for
    // Desktop) that runs macros without a browser. Same keys as before, so
    // openSettings('desktop-automation') / ('desktop-app') and old links work.
    title: 'Desktop Automation',
    icon: 'logo.png',
    sections: [
      { key: 'desktop-automation', label: 'Setup (XModules2)', hint: 'The native Desktop Automation module: install, home folder, permissions, self-tests', component: XModules2Tab },
      {
        key: 'desktop-app',
        label: 'Settings (App)',
        hint: (
          <>
            <a href="https://go.ui.vision/?help=extension-settings-desktop-app" target="_blank" rel="noopener noreferrer">Ui.Vision for Desktop</a>
            {' — the helper app for desktop automation: connection, shared settings files, test run'}
          </>
        ),
        component: DesktopAppTab
      }
    ]
  },
  {
    title: 'Advanced',
    sections: [
      { key: 'replay', label: 'Replay', hint: 'Timeouts, command interval, replay helpers', component: ReplayTab },
      { key: 'proxy', label: 'Proxy', hint: 'Default proxy for the setProxy command', component: ProxyTab },
      { key: 'security', label: 'Security', hint: 'Master password, text encryption', component: SecurityTab },
      { key: 'api', label: 'API', hint: 'Command line and embedded macro access', component: ApiTab },
      { key: 'privacy', label: 'Privacy', hint: 'Basic usage statistics and your choices', component: PrivacyTab }
    ]
  }
]

const ALL_SECTIONS: Section[] = NAV_GROUPS.reduce(
  (acc: Section[], g) => acc.concat(g.sections),
  []
)

const DEFAULT_SECTION = 'general'

// Old anchors keep working after a section is renamed or removed (docs,
// forum links). #xmodules was the classic-XModules tab, retired in 10.0.151.
const LEGACY_SECTION_KEYS: Record<string, string> = {
  xmodules2: 'desktop-automation',
  xmodules: 'desktop-automation'
}

const sectionFromHash = (): string => {
  // '#section?key=value' — the query part carries automation parameters
  // (run_selftest over the MCP bridge), the section key is what precedes it
  const raw = (window.location.hash || '').replace(/^#/, '').split('?')[0]
  const key = LEGACY_SECTION_KEYS[raw] || raw
  return ALL_SECTIONS.some(s => s.key === key) ? key : DEFAULT_SECTION
}

type SettingsAppState = {
  active: string
}

export default class SettingsApp extends React.Component<{}, SettingsAppState> {
  state: SettingsAppState = {
    active: sectionFromHash()
  }

  onHashChange = () => {
    this.setState({ active: sectionFromHash() })
  }

  componentDidMount () {
    window.addEventListener('hashchange', this.onHashChange)
  }

  componentWillUnmount () {
    window.removeEventListener('hashchange', this.onHashChange)
  }

  select = (key: string) => {
    // hash drives the state via the hashchange listener
    window.location.hash = key
  }

  render () {
    const active = ALL_SECTIONS.find(s => s.key === this.state.active) || ALL_SECTIONS[0]
    const ActiveComponent = active.component
    const version = (() => {
      try {
        return Ext.runtime.getManifest().version
      } catch (e) {
        return ''
      }
    })()

    return (
      <div className="settings-page">
        <aside className="settings-nav">
          <div className="settings-brand">
            <img src="logo.png" alt="" onError={(e: any) => { e.target.style.display = 'none' }} />
            <div className="settings-brand-text">
              <div className="settings-brand-title">Ui.Vision</div>
              <div className="settings-brand-sub">Settings{version ? ` · v${version}` : ''}</div>
            </div>
          </div>

          {NAV_GROUPS.map((group, i) => (
            <div className="settings-nav-group" key={i}>
              {group.title ? (
                <div className={'settings-nav-group-title' + (group.icon ? ' with-icon' : '')}>
                  {group.icon ? <img src={group.icon} alt="" onError={(e: any) => { e.target.style.display = 'none' }} /> : null}
                  {group.title}
                </div>
              ) : null}
              {group.sections.map(s => (
                <a
                  key={s.key}
                  href={'#' + s.key}
                  className={'settings-nav-item' + (s.key === active.key ? ' active' : '')}
                  onClick={(e) => {
                    e.preventDefault()
                    this.select(s.key)
                  }}
                >
                  {s.label}
                </a>
              ))}
            </div>
          ))}
        </aside>

        <main className="settings-content">
          <div className="settings-section">
            <h1 className="settings-section-title">{active.label}</h1>
            <p className="settings-section-hint">{active.hint}</p>
            <ActiveComponent />
          </div>
        </main>
      </div>
    )
  }
}
