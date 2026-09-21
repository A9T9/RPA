// Settings > Vision — extracted from the old settings modal in header.js
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import { Radio, Select } from 'antd'

import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { isWindows, isMac, range } from '@/common/ts_utils'
import { probeXModules2, xmodules2Active } from '@/services/xmodules2/routing'
import { getXModule2API } from '@/services/xmodules2/native'
import { goUivUrl } from '@/common/uiv_link'
import { State } from '@/reducers/state'

interface VisionTabProps {
  config: { [key: string]: any }
  updateConfig: (config: { [key: string]: any }) => void
}

interface VisionTabState {
  hostInstalled: boolean
  // Windows only: null = the host answered the clipboard-methods probe (or
  // not probed), otherwise the reason it did not — shown next to the native-
  // selector radio so the choice does not silently fall back to the
  // built-in selector (field report 2026-08-27)
  nativeSelectorError: string | null
}

class VisionTab extends React.Component<VisionTabProps, VisionTabState> {
  state: VisionTabState = {
    hostInstalled: xmodules2Active(),
    nativeSelectorError: null
  }

  componentDidMount () {
    // the desktop radio needs the installed state of the native host
    probeXModules2().then(active => this.setState({ hostInstalled: active }))

    // the Windows selector is the host's own area picker (select_region,
    // 2.1.27+) with the system snipping overlay as the fallback on older
    // hosts (clipboard methods, 2.0.13+) — probe the cheap clipboard method
    // so the radio can say when neither can take effect (the picker cannot
    // be probed without showing it)
    if (isWindows()) {
      getXModule2API().invoke('get_clipboard_sequence').then(
        () => this.setState({ nativeSelectorError: null }),
        (e: Error) => this.setState({ nativeSelectorError: String((e && e.message) || e) })
      )
    }
  }

  onConfigChange = (key: string, val: any) => {
    this.props.updateConfig({ [key]: val })
  }

  render () {
    const { config } = this.props
    const onConfigChange = this.onConfigChange
    const hostInstalled = this.state.hostInstalled

    return (
      <div className="vision-pane">
        <p>
          Ui.Vision's eyes can look inside the web browser or search the
          complete desktop.
        </p>
        <div className="row">
          <Radio.Group value={config.cvScope}>
            <Radio value="browser" onClick={() => onConfigChange('cvScope', 'browser')}>
              Browser Automation (Look inside browser)
            </Radio>
            <Radio
              value="desktop"
              onClick={() => onConfigChange('cvScope', 'desktop')}
              disabled={!hostInstalled}
            >
              <span>Desktop Automation (Search complete desktop)</span>
              {hostInstalled ? null : (
                <a
                  target="_blank"
                  href={goUivUrl(`https://go.ui.vision/?help=desktop_${/windows/i.test(navigator.userAgent) ? 'win' : /mac/i.test(navigator.userAgent) ? 'mac' : 'linux'}`)}
                  style={{ marginLeft: '15px' }}
                >
                  Install the Desktop Automation module first.
                </a>
              )}

              {/* WINDOWS + MAC: choose between a live-screen selector and
                  the built-in screenshot selector. Windows = the xmodule2
                  host's own area picker (select_region, host 2.1.27+; the
                  system snipping overlay on older hosts); macOS = the OS's own Cmd+Shift+4
                  region selector (screencapture -i via the xmodule2 host,
                  covered by its existing Screen Recording grant). Linux
                  always uses the built-in one, so the choice is hidden
                  there. */}
              {(isWindows() || isMac()) ? (
                <div>
                  <Radio.Group
                    value={config.useDesktopScreenCapture ? 'native' : 'builtin'}
                    disabled={config.cvScope !== 'desktop'}
                    onChange={(e: any) =>
                      onConfigChange('useDesktopScreenCapture', e.target.value === 'native')
                    }
                  >
                    <Radio value="native">
                      {isWindows()
                        ? 'Screen area selector (drag a rectangle directly on the screen)'
                        : 'macOS native screenshot selector (⌘⇧4 style)'}
                    </Radio>
                    <Radio value="builtin">Built-in screenshot selector</Radio>
                  </Radio.Group>
                  {/* say when "native" cannot take effect — the capture flow
                      falls back to the built-in selector when the host lacks
                      the clipboard methods, and a choice that silently does
                      nothing reads as a bug */}
                  {isWindows() && this.state.nativeSelectorError && config.useDesktopScreenCapture ? (
                    <div style={{ color: '#d4380d', marginTop: '4px' }}>
                      This option needs the Desktop Automation XModule v2.1.27 or newer
                      ({this.state.nativeSelectorError}) — the built-in selector will be
                      used until it is available.{' '}
                      <a target="_blank" href={goUivUrl('https://go.ui.vision/?help=xmodules')}>
                        Install / update XModules
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* The old "wait N seconds before desktop screenshot" setting
                  moved onto the editor's "Select image" button as a fixed
                  5-second countdown option. */}
            </Radio>
          </Radio.Group>
        </div>

        <p>
          In JS macros the vision scope is set per call: pass{' '}
          <code>{"{scope: 'desktop'}"}</code> to a finder like{' '}
          <code>uiv.findImage</code> or <code>uiv.ocr.findText</code> to search
          the whole screen instead of the browser tab. To restrict the search
          to one region, pass <code>{'{area: ...}'}</code> with a match or a
          rectangle.
        </p>

        <div className="row" style={{ marginTop: '30px' }}>
          <p>Default Vision Search Confidence</p>
          <Select
            style={{ width: '200px' }}
            placeholder="interval"
            value={'' + config.defaultVisionSearchConfidence}
            onChange={(val) =>
              onConfigChange('defaultVisionSearchConfidence', parseFloat(val))
            }
          >
            {range(1, 11, 1).map((n: number) => (
              <Select.Option key={n} value={'' + (0.1 * n).toFixed(1)}>
                {(0.1 * n).toFixed(1)}
              </Select.Option>
            ))}
          </Select>
        </div>

      </div>
    )
  }
}

export default connect(
  (state: State) => ({
    config: (state as any).config
  }),
  (dispatch: Dispatch) => bindActionCreators({ ...actions, ...simpleActions } as any, dispatch)
)(VisionTab as any)
