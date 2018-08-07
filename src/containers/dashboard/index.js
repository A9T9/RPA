import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators }  from 'redux'

import './dashboard.scss'
import * as actions from '../../actions'

import DashboardEditor from './editor'
import DashboardBottom from './bottom'

class Dashboard extends React.Component {
  render () {
    const isWindows = /windows/i.test(window.navigator.userAgent)

    return (
      <div className="dashboard">
        <DashboardEditor />
        <DashboardBottom />

        <div className="online-help">
          <div style={{ visibility: isWindows ? 'visible' : 'hidden' }}>
            <a href="https://a9t9.com/x/idehelp?help=visual" target="_blank"></a>
          </div>
          <div>
            Kantu for Chrome/Firefox:
            <a href="https://a9t9.com/x/idehelp?help=forum" target="_blank"> User Forum</a> -
            <a href="https://a9t9.com/x/idehelp?help=docs" target="_blank"> Online Help</a>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({}),
  dispatch => bindActionCreators({...actions}, dispatch)
)(Dashboard)
