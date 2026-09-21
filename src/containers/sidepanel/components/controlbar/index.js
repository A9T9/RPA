import { Button, Popover, message } from 'antd'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { SettingOutlined } from '@ant-design/icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// Deep-path imports keep webpack from bundling the whole icon set (tree-shaking
// is disabled by the CommonJS babel transform in webpack.prod.config.js)
import { faCirclePlay } from '@fortawesome/free-regular-svg-icons/faCirclePlay'
import { faCirclePause } from '@fortawesome/free-regular-svg-icons/faCirclePause'
import { faCircleStop } from '@fortawesome/free-regular-svg-icons/faCircleStop'
import { faWindowRestore } from '@fortawesome/free-regular-svg-icons/faWindowRestore'

import * as actions from '@/actions'
import * as C from '@/common/constant'
import { getStorageManager } from '@/services/storage'
import { getState, updateState } from '@/ext/common/global_state'
import { getPlayTab, openSettings, showPanelWindow } from '@/ext/common/tab'
import { getPlayer, Player } from '@/common/player'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { range, setIn, updateIn, compose, cn } from '@/common/utils'
import { getActiveNonExtensionTab, getActiveWebTab } from '@/common/tab_utils'
import { goUivUrl } from '@/common/uiv_link'
import { ensureAllUrlsPermission } from '@/common/firefox_permission'
import { isScriptPaused, isScriptRunning, onScriptEvent, pauseScript, resumeScript, runScript, stopScript } from '@/modules/script_runner'
import './controlbar.scss'
import csIpc from '@/common/ipc/ipc_cs'

class Controls extends React.Component {
  state = {
    // 'stopped' | 'running' | 'paused' — mirrors the JS script runner
    scriptStatus: isScriptRunning() ? (isScriptPaused() ? 'paused' : 'running') : 'stopped'
  }

  unsubscribeScript = null

  // First interface switch: tell the user (once, on the surface they land on)
  // that the default interface is configurable in Settings > General. The
  // source button stores the destination; that surface shows the bubble until
  // "Got it". Set from here and dev_toolbar (to IDE) and from the IDE's
  // "Continue in Side Panel" button (to here).
  onClickOpenIde = () => {
    if (!this.props.config.interfaceHintDismissed) {
      this.props.updateConfig({ interfaceHintTarget: 'ide' })
    }
    showPanelWindow({})
  }

  shouldShowInterfaceHint = () => {
    return this.props.config.interfaceHintTarget === 'sidepanel' &&
           !this.props.config.interfaceHintDismissed
  }

  dismissInterfaceHint = () => {
    this.props.updateConfig({ interfaceHintDismissed: true, interfaceHintTarget: null })
  }

  componentDidMount () {
    window.addEventListener('uiv-play-current-macro', this.onRunAgain)
    const type = getStorageManager().getCurrentStrategyType()
    this.setState({ storageMode: type })
    // the JS script runner lives outside redux — mirror its status so
    // Play/Pause/Resume/Stop react to script runs too
    this.unsubscribeScript = onScriptEvent('status', (status) => {
      this.setState({ scriptStatus: status })
    })
  }

  onRunAgain = () => {
    if (this.state.scriptStatus === 'stopped' && this.props.player.status !== C.PLAYER_STATUS.PLAYING && this.props.player.status !== C.PLAYER_STATUS.PAUSED && this.props.status !== C.APP_STATUS.RECORDER) this.playCurrentMacro(false)
  }

  componentWillUnmount () {
    window.removeEventListener('uiv-play-current-macro', this.onRunAgain)
    if (this.unsubscribeScript) this.unsubscribeScript()
  }

  // JS script macro open (the program lives in editing.script) — the Play
  // button runs the script through the interpreter instead of the player
  isScriptMacro = () => {
    return typeof this.props.editing.script === 'string'
  }

  playCurrentScript = () => {
    if (this.state.scriptStatus !== 'stopped') return
    const reportStartFailure = (e) => {
      const msg = `Script failed to start: ${(e && e.message) || e}`
      message.error(msg, 3)
      try { this.props.addLog('error', msg) } catch (e2) { /* log unavailable */ }
      console.error('JS script start failure', e)
    }
    try {
      runScript(this.props.editing.script).catch(reportStartFailure)
    } catch (e) {
      reportStartFailure(e)
    }
  }

  getTestCaseName = () => {
    const { src } = this.props.editing.meta
    return src && src.name && src.name.length ? src.name : 'Untitled'
  }

  getPlayer = (name) => {
    if (name) return getPlayer({ name })
    switch (this.props.player.mode) {
      case C.PLAYER_MODE.TEST_CASE:
        return getPlayer({ name: "testCase" })
        case C.PLAYER_MODE.TEST_SUITE:
          return getPlayer({ name: "testSuite" })
      }
  }

  checkWindowisOpen = async (bwindowId) => {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({}, function (tabs) {
        var doFlag = [];
        for (var i = tabs.length - 1; i >= 0; i--) {
          if (tabs[i].windowId === bwindowId) {
            doFlag = tabs[i];

            break;
          }
        }
        resolve(doFlag);
      });
    });
  }

  playCurrentMacro = async (isStep)  => {
    // Firefox MV3: host permissions are opt-in and Record was the only panel
    // entry point that asked — Play went straight into a run that dies with
    // Error #170 on an ungranted profile (field-verified 2026-08-19)
    if (!(await ensureAllUrlsPermission())) return

    if (this.isScriptMacro()) {
      return this.playCurrentScript()
    }

    const state = await getState()
    const bwindowId = state.tabIds.bwindowId;
    const wTab = bwindowId != '' ? await this.checkWindowisOpen(bwindowId) : '';

    // Target the focused window's active web tab. A bare query({active:true})
    // returns one active tab per window in window order — with the IDE window
    // or an unrelated window around, tabs[0] could be the wrong window's tab
    // or an extension page, poisoning tabIds.toPlay for the whole run.
    let tab = wTab != '' ? wTab : await getActiveWebTab()
    if (!tab) {
      tab = await getPlayTab().catch(() => null)
    }
    // Nothing but the new tab page open (freshly started browser): starting
    // was refused here, so Play did nothing and said nothing. Hand the player
    // the active tab as-is instead — `open` navigates it.
    if (!tab) {
      tab = await getActiveNonExtensionTab()
    }
    if (!tab) return

    // seed the whole play-tab anchor set: firstPlay is the base for relative
    // selectWindow tab=N locators — leaving it stale breaks tab switching
    // (e.g. DemoTabs) when the user never clicked into the page beforehand
    updateState(state => ({
      ...state,
      tabIds: {
        ...state.tabIds,
        lastPlay: state.tabIds.toPlay,
        toPlay: tab.id,
        firstPlay: tab.id
      }
    }))
    const { commands } = this.props.editing
    const { src } = this.props.editing.meta
    const openTc  = commands.find(tc => tc.cmd.toLowerCase() === 'open' || 'openbrowser')
    this.setState({ lastOperation: 'play' })
    this.props.playerPlay({
      macroId: src && src.id,
      title: this.getTestCaseName(),
      extra: {
        id: src && src.id
      },
      mode: getPlayer().C.MODE.STRAIGHT,
      playUrl: tab.url,
      playtabIndex: tab.index,
      playtabId: tab.id,
      startIndex: 0,
      startUrl: openTc ? openTc.target : null,
      resources: commands,
      postDelay: this.props.config.playCommandInterval * 1000,
      isStep: isStep
    })
  }

  render () {
    return (
        <div className="control-panel-container">
        <div className="control-panel">
          {/* Rec + "Pop out editor" moved into the Macro tab itself
              (macro/dev_toolbar.js) so this bar keeps a constant height and
              the status bar doesn't jump between tabs / dev-mode states */}
          <div className='action-button-container'>
            <Button type="primary" disabled={this.state.scriptStatus !== 'stopped' || this.props.player.status === C.PLAYER_STATUS.PLAYING || this.props.player.status === C.PLAYER_STATUS.PAUSED || this.props.status === C.APP_STATUS.RECORDER } onClick={() => this.playCurrentMacro(false)} >
              <FontAwesomeIcon icon={faCirclePlay} />
              <span> Play</span>
            </Button>
            {this.state.scriptStatus === 'paused' || this.props.player.status === C.PLAYER_STATUS.PAUSED ? (
              <Button
                type="primary"
                title="Resume"
                onClick={() => {
                  if (this.state.scriptStatus === 'paused') return resumeScript()
                  this.getPlayer().resume()
                }}
              >
                <FontAwesomeIcon icon={faCirclePlay} />
                <span> Resume</span>
              </Button>
            ) : (
              // scripts pause at the next line change (a bridge command that
              // is mid-run finishes first)
              <Button
                className="icon-only"
                title={this.state.scriptStatus === 'running' ? 'Pause at the next script line' : 'Pause'}
                disabled={this.state.scriptStatus !== 'running' && this.props.player.status !== C.PLAYER_STATUS.PLAYING}
                onClick={() => {
                  if (this.state.scriptStatus === 'running') return pauseScript()
                  this.getPlayer().pause()
                }}
              >
                <FontAwesomeIcon icon={faCirclePause} />
              </Button>
            )}
            <Button
              className="icon-only"
              title="Stop"
              disabled={this.state.scriptStatus === 'stopped' && this.props.player.status === C.PLAYER_STATUS.STOPPED}
              onClick={() => {
                if (this.state.scriptStatus !== 'stopped') return stopScript()
                this.getPlayer().stop()
              }}
            >
              <FontAwesomeIcon icon={faCircleStop} />
            </Button>
            <Popover
              open={this.shouldShowInterfaceHint()}
              placement="topLeft"
              overlayClassName="interface-hint-popover"
              content={
                <div className="interface-hint">
                  <p>
                    Side Panel or IDE window — use whichever you like, your
                    macros are the same in both. Pick which one opens by
                    default in <strong>Settings &gt; General</strong>.
                  </p>
                  <Button size="small" type="primary" onClick={this.dismissInterfaceHint}>
                    Got it
                  </Button>
                </div>
              }
            >
              <Button className="icon-only" title="Open IDE window – same features as the sidebar, in a classic window layout" disabled={this.props.player.status === C.PLAYER_STATUS.PLAYING} onClick={this.onClickOpenIde}>
                <FontAwesomeIcon icon={faWindowRestore} />
              </Button>
            </Popover>
            <Button disabled={this.props.player.status === C.PLAYER_STATUS.PLAYING} title="Settings" onClick={() => openSettings()} shape="circle" >
              <SettingOutlined />
            </Button>
          </div>
          <div className='action-button-container'>
            {this.props.mcpBridgeLabel ? (
              // MCP bridge connected: the links row becomes the connection
              // badge — with several browsers on one bridge (chrome#1,
              // firefox#2, ...) this label is how the user tells THIS
              // browser's connection apart. Highly visible on purpose.
              <span
                className="mcp-bridge-badge"
                title={`An MCP client is connected to this browser via the MCP bridge as "${this.props.mcpBridgeLabel}" — manage it in Settings > AI`}
                onClick={() => openSettings('ai')}
              >
                MCP: {this.props.mcpBridgeLabel}
              </span>
            ) : (
              <>
                <a onClick={() => {
                  chrome.tabs.create({url: goUivUrl("https://go.ui.vision/?help=home")})
                }}>Ui.Vision</a>
                {' - '}
                <a onClick={() => {
                  chrome.tabs.create({url: goUivUrl("https://go.ui.vision/?help=forum")})
                }}>Forum</a>
                {' - '}
                <a onClick={() => {
                  chrome.tabs.create({url: goUivUrl("https://go.ui.vision/?help=github")})
                }}>Github</a>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({
    route: state.route,
    editing: state.editor.editing,
    player: state.player,
    status: state.status,
    config: state.config,
    ui: state.ui,
    proxy: state.proxy,
    mcpBridgeLabel: state.mcpBridgeLabel
  }),
  dispatch  => bindActionCreators({...actions, ...simpleActions}, dispatch)
  )(Controls)
