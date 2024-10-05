import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators }  from 'redux'
import { Button, Modal, message } from 'antd'

import * as actions from './actions'
import * as C from './common/constant'
import csIpc from './common/ipc/ipc_cs'
import Header from './components/header'
import Sidebar from './containers/sidebar'
import DashboardPage from './containers/dashboard'
import { Actions } from '@/actions/simple_actions'
import { store } from './redux'

import './app.scss'
import './antd-override.scss'
import './styles/dark-theme.scss'
import { FocusArea } from './reducers/state'
import { isNoDisplay, isOcrInDesktopMode, isReplaySpeedOverrideToFastMode } from './recomputed'
import { getPlayer } from './common/player'
import storage from '@/common/storage'
import { delayMs, waitForRenderComplete } from './common/utils'
import { Actions as simpleActions } from '@/actions/simple_actions'
import config from '@/config'

class App extends Component {
  hideBackupAlert = () => {
    this.props.updateConfig({
      lastBackupActionTime: new Date() * 1
    })
    this.$app.classList.remove('with-alert')
  }

  onClickBackup = () => {
    this.props.runBackup()
    this.hideBackupAlert()
  }

  onClickNoBackup = () => {
    this.hideBackupAlert()
  }

  onClickMainArea = () => {
    this.props.updateUI({ focusArea: FocusArea.Unknown })
  }

  getPlayer = (name) => {
    if (name) return getPlayer({ name })

    switch (this.props.player.mode) {
      case C.PLAYER_MODE.TEST_CASE:
        return getPlayer({ name: 'testCase' })

      case C.PLAYER_MODE.TEST_SUITE:
        return getPlayer({ name: 'testSuite' })
    }
  }

  handleStorageChange = ([changes]) => {
    if (changes.key === 'config') {
      if (changes.newValue.showSettingsOnStart) {
        this.props.updateUI({ showSettings: true })
      } 
    }
  }

  componentDidMount () {
    this.props.updateConfig({ ["oneTimeShowSidePanel"]: null }) 

    if (this.props.showSettingsOnStart) {
      this.props.updateUI({ showSettings: true })     
      this.props.updateConfig({
        showSettingsOnStart: false
      })
    }

    storage.addListener(this.handleStorageChange)

    if (this.props.selectCommandIndex !== undefined && this.props.selectCommandIndex !== null) {
      delayMs(500).then(() => {
        waitForRenderComplete(null, 500).then(() => {
          // scrollIntoView won't work because it's a virtual list
          delayMs(500).then(() => {
              let itemHeight =  config.ui.commandItemHeight
              let tableElement = document.querySelector('.ant-tabs-content .form-group.table-wrapper')
              tableElement.scrollTop = this.props.selectCommandIndex * itemHeight
              // this.props.updateUI({ focusArea: FocusArea.CommandTable })
              this.props.selectCommand(this.props.selectCommandIndex, true)
          })
        })
      })
    }

    const run = () => {
      csIpc.ask('PANEL_TIME_FOR_BACKUP', {})
      .then(isTime => {
        if (!isTime)  return
        this.$app.classList.add('with-alert')
      })
    }

    // Note: check whether it's time for backup every 5 minutes
    this.timer = setInterval(run, 5 * 60000)
    run()
  }

  componentWillUnmount () {
    clearInterval(this.timer)
  }

  renderPreinstallModal () {
    if (!this.props.ui.newPreinstallVersion)  return null

    return (
      <Modal
        className="preinstall-modal"
        open={true}
        title="New demo macros available"
        okText="Yes, overwrite"
        cancelText="Skip"
        onOk={() => {
          this.props.updateUI({ newPreinstallVersion: false })

          return this.props.preinstall(true)
          .then(() => {
            message.success('demo macros updated')
          })
          .catch(e => {
            message.error(e.message)
          })
        }}
        onCancel={() => {
          this.props.updateUI({ newPreinstallVersion: false })
          this.props.preinstall(false)
        }}
      >
        <p style={{ fontSize: '14px' }}>Do you want to overwrite the demo macros with their latest versions?</p>
      </Modal>
    )
  }

  showGUI = () => {
    store.dispatch(Actions.setNoDisplayInPlay(false))
    // set fast mode
    store.dispatch(Actions.setReplaySpeedOverrideToFastMode(true))
  }
  
  showGUIForOCR = () => {
    store.dispatch(Actions.setOcrInDesktopMode(false))
  }

  render () {
    if (this.props.noDisplay) {
      return (
        <div className="app no-display">
          <div className="content">
            <div className="status">UI.Vision is in "No Display" mode now</div>
            <Button.Group className="simple-actions">
              <Button size="large" onClick={() => this.getPlayer().stop()}>
                <span>Stop</span>
              </Button>
                <Button
                  size="large"
                  onClick={this.showGUI}
                >
                  <span>Show GUI</span>
                </Button>
            </Button.Group>
          </div>
        </div>
      )
    }

    return (
      <div className="app with-sidebar" ref={el => { this.$app = el }}>
        <div className="backup-alert">
          <span>Do you want to run the automated backup?</span>
          <span className="backup-actions">
            <Button type="primary" onClick={this.onClickBackup}>Yes</Button>
            <Button onClick={this.onClickNoBackup}>No</Button>
          </span>
        </div>
        <div className="app-inner">
          <Sidebar />
          <section
            className="content"
            onClickCapture={this.onClickMainArea}
          >
            <Header />
            <DashboardPage />  
          </section>
        </div>

        {this.renderPreinstallModal()}
        
        {this.props.ocrInDesktopMode ? (
          <div className="app no-display ocr-overlay">
            <div className="content">
              <div className="status">Desktop OCR in progress</div>
              <Button.Group className="simple-actions">
                <Button size="large" onClick={() => this.getPlayer().stop()}>
                  <span>Stop</span>
                </Button>
                <Button
                  size="large"
                  onClick={() => this.showGUIForOCR()}
                >
                  <span>Show GUI</span>
                </Button>
              </Button.Group>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
}

export default connect(
  state => ({
    ui: state.ui,
    player: state.player,
    noDisplay: isNoDisplay(state),
    ocrInDesktopMode: isOcrInDesktopMode(state),
    replaySpeedOverrideToFastMode: isReplaySpeedOverrideToFastMode(state),
    showSettingsOnStart: state.config.showSettingsOnStart,
    selectCommandIndex: state.config.selectCommandIndex
  }),
  dispatch => bindActionCreators({...actions, ...simpleActions}, dispatch)
)(App)
