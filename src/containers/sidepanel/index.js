import { Tabs, Tooltip } from 'antd'
import 'antd/dist/reset.css'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import { isCVTypeForDesktop } from '@/common/cv_utils'
import { SIDEPANEL_PORT_NAME } from '@/common/ipc/ipc_bg_cs'
import storage from '@/common/storage'
import * as actions from '../../actions'
import * as C from '../../common/constant'
import { cn } from '../../common/utils'
import { FocusArea } from '../../reducers/state'
import { StorageStrategyType, getStorageManager } from '../../services/storage'
import Controlbar from './components/controlbar'
import Files from './components/files'
import Logs from './components/logs'
import AiChat from './components/ai_chat'
import Macro from './components/macro'
import ComputerSvg from '@/assets/svg/computer.svg'
import BrowserSvg from '@/assets/svg/browser.svg'
import './sidepanel.scss'

class Sidepanel extends React.Component {
  _lastStatus = null
  _lastMacroLog = null
  _lastSelectedMacroName = null
  state = {
    drag: {
      isDragging: false,
      startX: 0,
      movingX: 0,
      lastWidth: 260,
      currentMinWidth: 260
    },
    fullStatusText: '',
    shortStatus: ''
  }

  // constructor
  constructor(props) {
    super(props)
    this.renderStatus = this.renderStatus.bind(this)
  }

  getSideBarMinWidth = () => {
    const { isDragging, lastWidth, currentMinWidth } = this.state.drag
    return (isDragging ? currentMinWidth : lastWidth) + 'px'
  }

  openRegisterSettings = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    this.props.updateUI({ showSettings: true, settingsTab: 'register' })
  }

  onClickSidebar = () => {
    this.props.updateUI({ focusArea: FocusArea.Sidebar })
  }

  componentDidMount() {
    chrome.runtime.connect({ name: SIDEPANEL_PORT_NAME })
    const type = getStorageManager().getCurrentStrategyType()
    this.setState({ storageMode: type })

    // the idea is to load the config from storage and update the sidepanel state
    // TODO: consider using other storage key to keep temporary configs like showSidePanel, oneTimeShowSidePanel
    storage.addListener(([storage]) => {
      if (storage.key === 'config') {
        // get all changed config values
        const changedConfig = Object.keys(storage.newValue).reduce((acc, key) => {
          if (
            storage.newValue[key] !== this.props.config[key] &&
            // ignore array and object. otherwise it it can cause infinite loop
            !Array.isArray(storage.newValue[key]) &&
            typeof storage.newValue[key] !== 'object'
          ) {
            acc[key] = storage.newValue[key]
          }
          return acc
        }, {})
        // update config to sidepanel state
        if (Object.keys(changedConfig).length) {
          console.log('config updateConfig:>> ========= changedConfig:', changedConfig)
          this.props.updateConfig(changedConfig)
        }
      }
    })
  }

  componentDidUpdate(prevProps) {
    if (prevProps.logs_ !== this.props.logs_ || prevProps.player !== this.props.player || prevProps.status !== this.props.status) {
      // Perform actions when the 'message' prop changes

    console.log('prevProps for statusText:>> ', prevProps)
      let fullStatusText = ''

      if (['Files', 'Macro', 'Logs'].includes(this.props?.ui?.sidebarTab)) {
        // If user selects macro, then the macro name is shown in status bar
        // Status bar should contain macro result. So either the error message or "[info] Macro completed (Runtime 6.66s)" => So same text as in log file (or similar text, whatever is easier)
        const { status, player } = this.props

        const renderInner = () => {
          switch (status) {
            case C.APP_STATUS.RECORDER:
              return 'Recording'
            case C.APP_STATUS.PLAYER: {
              this._lastMacroLog = null
              switch (player.status) {
                case C.PLAYER_STATUS.PLAYING: {
                  const { nextCommandIndex, loops, currentLoop, timeoutStatus } = player
                  if (nextCommandIndex === null || loops === null || currentLoop === 0) {
                    return ''
                  }

                  const parts = [`Line ${nextCommandIndex + 1}`, `Round ${currentLoop}/${loops}`]

                  if (timeoutStatus && timeoutStatus.type && timeoutStatus.total) {
                    const { type, total, past } = timeoutStatus
                    parts.unshift(`${type} ${past / 1000}s (${total / 1000})`)
                  }

                  return parts.join(' | ')
                }

                case C.PLAYER_STATUS.PAUSED:
                  return 'Player paused'

                default:
                  return ''
              }
            }
            default:
              // pick between macro name or macro stopped log, whichever is latest
              if (!this.getLatestMacroLog()) {
                this._lastStatus = this._lastSelectedMacroName = this.getMacroName()
              } else {
                if (this._lastMacroLog !== this.getLatestMacroLog()) {
                  this._lastStatus = this._lastMacroLog = this.getLatestMacroLog()
                } else if (this._lastSelectedMacroName !== this.getMacroName()) {
                  this._lastStatus = this._lastSelectedMacroName = this.getMacroName()
                }
              }
              return this._lastStatus
          }
        }

        fullStatusText = renderInner()
        // ... and if it is too long, then show it in a tooltip
        const shortStatus = fullStatusText.length > 40 ? fullStatusText.substring(0, 40).replace(/(\s+\S+)$/, '...') : fullStatusText
        this.setState({ fullStatusText, shortStatus })
      }
    }
  }

  prefixHardDisk(str) {
    const isXFileMode = getStorageManager().isXFileMode()
    if (!isXFileMode) return str

    return (
      <div
        style={{
          display: 'inline-block'
        }}
      >
        <img
          src="./img/hard-drive.svg"
          style={{
            position: 'relative',
            top: '3px',
            marginRight: '5px',
            height: '15px'
          }}
        />
        <span>{str}</span>
      </div>
    )
  }

  shouldRenderMacroNote() {
    const { xmodulesStatus, storageMode } = this.props.config

    if (storageMode !== StorageStrategyType.XFile) return false
    if (xmodulesStatus === 'pro') return false

    const macroStorage = getStorageManager().getMacroStorage()
    return macroStorage.getDisplayCount() < macroStorage.getTotalCount()
  }

  getMacroName() {
    const { src } = this.props.editing.meta
    return src && src.name && src.name.length ? src.name : 'Untitled'
  }

  getLatestMacroLog() {
    const { player, logs_ } = this.props
    if (player.status === C.PLAYER_STATUS.STOPPED && logs_ && logs_.length) {
      let latestMacroLogs = logs_.filter((log) => log.type === 'info' && log.text?.startsWith('Macro '))
      if (!latestMacroLogs.length) return '-0-'
      let latestMacroLog = latestMacroLogs[latestMacroLogs.length - 1]
      if (latestMacroLog) {
        return '[info] ' + latestMacroLog.text
      }
    }
    return ''
  }

  renderStatus(statusText) {
    console.log('renderStatus:>> statusText:  ', statusText)
    if (statusText) {
    let fullStatusText = statusText
      // ... and if it is too long, then show it in a tooltip
      const shortStatus = fullStatusText.length > 40 ? fullStatusText.substring(0, 40).replace(/(\s+\S+)$/, '...') : fullStatusText
      this.setState({ fullStatusText, shortStatus })
    }
  } 

  showDesktopIcon() {
    const { ui, config } = this.props
    const doShowDesktopIcon =
      (isCVTypeForDesktop(config.cvScope) && ui.shouldEnableDesktopAutomation !== false) || ui.shouldEnableDesktopAutomation === true
    return (
      (doShowDesktopIcon && (
        <div className="vision-type">
          <ComputerSvg />
        </div>
      )) || (
        <div className="vision-type">
          <BrowserSvg />
        </div>
      )
    )
  }

  render() {
    return (
      <div
        className={cn('sidepanel', { 'with-xmodules-note': this.shouldRenderMacroNote() })}
        ref={(el) => {
          this.$dom = el
        }}
        style={{ minWidth: this.getSideBarMinWidth() }}
        onClickCapture={this.onClickSidebar}
      > 
        <div
          className="status"
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '10px',
            fontSize: '14px'
          }}
        >
          <Tooltip title={this.state.fullStatusText}>{this.state.shortStatus}</Tooltip>
        </div>
        {this.showDesktopIcon()}
        <div className={cn('sidebar-inner', { 'no-tab': !this.props.config.showTestCaseTab })}>
          <Tabs
            type="card"
            defaultActiveKey="Files"
            activeKey={this.props.ui.sidebarTab || 'Files'}
            onChange={(activeKey) => this.props.updateUI({ sidebarTab: activeKey })}
            items={[
              {
                key: 'Files',
                label: 'Files',
                children: <Files />
              },
              {
                key: 'Macro',
                label: 'Macro',
                children: <Macro />
              },
              {
                key: 'Logs',
                label: 'Logs',
                children: <Logs />
              },
              {
                key: 'AiChat',
                label: 'AI Chat',
                children: <AiChat renderStatus={this.renderStatus} />
              }
            ]}
          ></Tabs>
        </div>
        <Controlbar />
      </div>
    )
  }
}

export default connect(
  (state) => ({
    status: state.status,
    editing: state.editor.editing,
    player: state.player,
    config: state.config,
    ui: state.ui,
    logs_: state.logs
  }),
  (dispatch) => bindActionCreators({ ...actions }, dispatch)
)(Sidepanel)
