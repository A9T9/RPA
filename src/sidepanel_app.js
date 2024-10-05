import { Button } from 'antd'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import './app.scss'
import './antd-override.scss'
import './styles/dark-theme.scss'
import * as actions from './actions'
import * as C from './common/constant'
import csIpc from './common/ipc/ipc_cs'
import { getPlayer } from './common/player'
import Sidepanel from './containers/sidepanel'
import { isNoDisplay } from './recomputed'
import { FocusArea } from './reducers/state'
import { Actions } from '@/actions/simple_actions'

class SidepanelApp extends Component {
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

  componentDidMount () {
    this.props.updateConfig({ ["oneTimeShowSidePanel"]: null }) 
    
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

  showGUI = () => {
    store.dispatch(Actions.setNoDisplayInPlay(false))
    store.dispatch(Actions.setReplaySpeedOverrideToFastMode(true))
  }

  render () {
    if (this.props.noDisplay) {
      return (
        <div className="app no-display">
          <div className="sidepanel content">
            <div className="status">UI.Vision is in "No Display" mode now</div>
            <Button.Group className="simple-actions">
              <Button size="large" onClick={() => this.getPlayer().stop()}>
                <span>Stop</span>
              </Button>
              <Button size="large" onClick={this.showGUI}>
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
          <Sidepanel />
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({
    ui: state.ui,
    player: state.player,
    noDisplay: isNoDisplay(state)
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(SidepanelApp)
