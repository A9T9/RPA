import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators }  from 'redux'
import { HashHistory as Router, Route, Link, Switch, Redirect } from 'react-router-dom'
import { Button } from 'antd'

import * as actions from './actions'
import csIpc from './common/ipc/ipc_cs'
import Header from './components/header'
import Sidebar from './containers/sidebar'
import DashboardPage from './containers/dashboard'
import 'antd/dist/antd.css'
import './app.scss'

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

  componentDidMount () {
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

  render () {
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
          <section className="content">
            <Header />
            <DashboardPage />
          </section>
        </div>
      </div>
    );
  }
}

export default connect(
  state => ({}),
  dispatch => bindActionCreators({...actions}, dispatch)
)(App)
