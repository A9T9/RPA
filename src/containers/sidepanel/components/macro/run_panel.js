import { t } from '@/common/ui_locale'
import { Button, Select, Tabs } from 'antd'
import { DeleteOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as actions from '@/actions'
import LogList from '../logs/log_list'
import VariablesTable from './variables_table'

// Docked run panel for the side panel Macro tab: live Logs and Variables in a
// collapsible section below the command table, so a run can be debugged
// without leaving the Macro tab (the IDE shows the same pairing in its bottom
// panel). Open/close state lives in redux (ui.runPanelOpen) because the
// status bar expands the panel when its last-log line is clicked.
class RunPanel extends React.Component {
  isOpen () {
    return !!this.props.ui.runPanelOpen
  }

  // Variables is a dev tool — outside dev mode the panel is Logs only
  // (it renders for everyone below the JS editor because of uiv.log)
  showVariables () {
    return !!this.props.config.sidebarDevMode
  }

  getActiveTab () {
    const tab = this.props.ui.runPanelTab || 'Logs'
    return tab === 'Variables' && !this.showVariables() ? 'Logs' : tab
  }

  toggle = () => {
    this.props.updateUI({ runPanelOpen: !this.isOpen() })
  }

  componentDidUpdate (prevProps) {
    if (!!prevProps.ui.runPanelOpen !== this.isOpen()) {
      // let the macro table re-measure its available height
      window.dispatchEvent(new Event('resize'))
    }
  }

  // filter + clear for the Logs mini-tab, sitting right of the tab pills —
  // same controls the Data tab offers in its bottom bar
  renderLogControls () {
    if (this.getActiveTab() !== 'Logs') return null

    return (
      <span className="run-panel-log-controls">
        <Select
          size="small"
          value={this.props.config.logFilter || 'All'}
          onChange={(value) => {
            this.props.updateConfig({ logFilter: value })
          }}
          style={{ width: '76px' }}
          popupMatchSelectWidth={false}
          title={t("Filter logs")}
        >
          <Select.Option value='All'>{t('All')}</Select.Option>
          <Select.Option value='Echo'>{t('Echo')}</Select.Option>
          <Select.Option value='Echo_And_Status'>{t('Echo & Status')}</Select.Option>
          <Select.Option value='Error'>{t('Error & Reports')}</Select.Option>
          <Select.Option value='None'>{t('No log')}</Select.Option>
        </Select>
        <Button
          size="small"
          type="text"
          icon={<DeleteOutlined />}
          title={t("Clear log")}
          onClick={() => this.props.clearLogs()}
        />
      </span>
    )
  }

  render () {
    const open = this.isOpen()

    return (
      <div className="sidepanel-run-panel">
        <div className="run-panel-header" onClick={this.toggle}>
          <span className="run-panel-title">{this.showVariables() ? <React.Fragment>{t('Logs & Variables')}</React.Fragment> : t('Logs')}</span>
          <Button
            size="small"
            type="text"
            title={open ? t('Collapse') : t('Expand')}
            icon={open ? <DownOutlined /> : <UpOutlined />}
            onClick={(e) => { e.stopPropagation(); this.toggle() }}
          />
        </div>
        {open ? (
          <div className="run-panel-body">
            {this.showVariables() ? (
              <Tabs
                type="card"
                size="small"
                activeKey={this.getActiveTab()}
                onChange={(key) => this.props.updateUI({ runPanelTab: key })}
                tabBarExtraContent={{ right: this.renderLogControls() }}
                items={[
                  {
                    key: 'Logs',
                    label: t('Logs'),
                    children: <LogList />
                  },
                  {
                    key: 'Variables',
                    label: t('Variables'),
                    children: <VariablesTable />
                  }
                ]}
              />
            ) : (
              // outside dev mode there is only one view — a lone "Logs" tab
              // pill is pure chrome, so show the list with just its controls
              <div className="run-panel-single">
                <div className="run-panel-single-bar">{this.renderLogControls()}</div>
                <LogList />
              </div>
            )}
          </div>
        ) : null}
      </div>
    )
  }
}

export default connect(
  state => ({
    ui: state.ui,
    config: state.config
  }),
  dispatch => bindActionCreators({ ...actions }, dispatch)
)(RunPanel)
