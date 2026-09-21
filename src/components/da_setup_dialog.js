import { Modal } from 'antd'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as actions from '@/actions'
import { isLinux, isMac } from '@/common/ts_utils'
import { getXModule2API } from '@/services/xmodules2/native'
import { openSettings } from '@/ext/common/tab'

// "Complete the Desktop Automation setup" — the permission buttons live in
// Settings > Desktop Automation, but nobody goes there on their own: after
// installing the native app, macros just fail (macOS silently discards input
// without the Accessibility grant, captures show only the wallpaper without
// Screen Recording). So the first time a Ui.Vision surface opens while the
// app is installed with permissions still missing, say so and lead there.
//
// Mounted in BOTH roots (side panel and IDE window) — whichever opens first
// after the install shows it. It renders nothing everywhere else:
//
// - Windows: no permission model, never shown.
// - Linux X11: the host reports both portals granted, so the silent
//   "setup complete" write below fires and the dialog never appears —
//   only Wayland sessions (which need the one-time portal grants) see it.
// - Native app not installed: nothing to set up — no nag to install, and
//   the flag stays unwritten so the dialog still fires when the app IS
//   installed later.
//
// "Open Settings" records the prompt as handled (the settings tab has the
// live lights and Request-access buttons from there on). "Later" keeps the
// flag unwritten so the next open asks again — the setup really is required
// for every desktop feature, and once the grants are green the silent path
// retires the dialog for good.
class DaSetupDialog extends React.Component {
  state = { show: false }

  // The persisted flag, read from the CURRENT props: the store's config
  // hydrates from storage asynchronously around mount time, so the value
  // captured at mount may still be the empty pre-hydration config. Every
  // decision below happens after a native-host round-trip, by which time
  // hydration has long landed — re-reading then closes the race.
  isDone () {
    const { config } = this.props
    return !config || !!config.daSetupPromptDone
  }

  componentDidMount () {
    if (!isMac() && !isLinux()) return
    if (this.props.config && this.props.config.daSetupPromptDone) return

    const api = getXModule2API()
    // Same connect-or-reconnect dance as the settings tab's install check —
    // and a connection that neither answers nor disconnects must not keep a
    // pending modal alive forever.
    const timeout = new Promise((resolve, reject) =>
      window.setTimeout(() => reject(new Error('timeout')), 10000))
    Promise.race([
      api.getVersion().catch(() => api.reconnect().then(a => a.getVersion())),
      timeout
    ])
      .then(() => api.getPermissionStatus())
      .then(perms => {
        if (this.isDone()) return
        if (perms && perms.accessibility && perms.screenRecording) {
          // Setup already complete — record it so no future open re-probes.
          this.props.updateConfig({ daSetupPromptDone: true })
        } else {
          this.setState({ show: true })
        }
      })
      .catch(() => {}) // not installed (or unreachable): try again next open
  }

  onOpenSettings = () => {
    this.setState({ show: false })
    this.props.updateConfig({ daSetupPromptDone: true })
    openSettings('desktop-automation')
  }

  onLater = () => {
    this.setState({ show: false })
  }

  render () {
    if (!this.state.show) return null

    return (
      <Modal
        open
        centered
        width={460}
        title="Complete the Desktop Automation setup"
        onOk={this.onOpenSettings}
        okText="Open Settings"
        onCancel={this.onLater}
        cancelText="Later"
        className="da-setup-dialog"
      >
        <p>
          The Ui.Vision for Desktop app is installed, but{' '}
          {isMac() ? 'macOS' : 'your desktop'} still needs your permission
          before it can work:
        </p>
        <ul>
          <li>
            <strong>{isMac() ? 'Accessibility' : 'Remote input'}</strong> — send
            real mouse clicks and keystrokes (XClick, XType)
          </li>
          <li>
            <strong>{isMac() ? 'Screen Recording' : 'Screen capture'}</strong> —
            capture the screen for desktop image search and OCR
          </li>
        </ul>
        <p>
          Until both are granted, desktop automation commands fail. Grant them
          with one click per permission in Settings — the status lights there
          show when everything is ready.
        </p>
      </Modal>
    )
  }
}

export default connect(
  (state) => ({ config: state.config }),
  (dispatch) => bindActionCreators({ ...actions }, dispatch)
)(DaSetupDialog)
