import { t } from '@/common/ui_locale'
import { Button, Checkbox, Popover, Table } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as actions from '@/actions'
import { createVarsFilter, getVarsInstance } from '@/common/variables'

// Live variable values for the Macro tab's run panel — updates while a macro
// plays so values can be watched next to the running command list. The two
// internal-variable toggles hide in a popover to save sidebar width.
class VariablesTable extends React.Component {
  renderFilterOptions () {
    const { showCommonInternalVariables, showAdvancedInternalVariables } = this.props.config

    return (
      <div className="variable-options-popover">
        <Checkbox
          onClick={e => this.props.updateConfig({ showCommonInternalVariables: e.target.checked })}
          checked={showCommonInternalVariables}
        >
          Show most common <a href="https://go.ui.vision/?help=internalvars" target="_blank">internal variables</a>
        </Checkbox>
        <Checkbox
          onClick={e => this.props.updateConfig({ showAdvancedInternalVariables: e.target.checked })}
          checked={showAdvancedInternalVariables}
        >
          Show advanced <a href="https://go.ui.vision/?help=internalvars" target="_blank">internal variables</a>
        </Checkbox>
      </div>
    )
  }

  render () {
    const { showCommonInternalVariables, showAdvancedInternalVariables } = this.props.config
    const filter = createVarsFilter({
      withCommonInternal:   showCommonInternalVariables,
      withAdvancedInternal: showAdvancedInternalVariables
    })
    const variables = this.props.variables.filter(variable => filter(variable.key))

    // JS script runs publish their top-level `var`s (ui.scriptVars) — shown
    // first, in blue, above the classic Ui.Vision variables. Function-local
    // vars are not visible (interpreter call scopes).
    const scriptVars = this.props.scriptVars || {}
    const scriptRows = Object.keys(scriptVars).map(key => ({
      key,
      value: scriptVars[key],
      isJs: true
    }))
    const rows = [...scriptRows, ...variables]

    const columns = [
      { title: t('Name'),  dataIndex: 'key',   key: 'key',   width: '40%' },
      { title: t('Value'), dataIndex: 'value', key: 'value', render: (val) => JSON.stringify(val) || 'undefined' }
    ]

    return (
      <div className="variable-content">
        <div className="variable-toolbar">
          <Popover
            content={this.renderFilterOptions()}
            trigger="click"
            placement="topRight"
          >
            <Button size="small" type="text" icon={<SettingOutlined />} title="Internal variables" />
          </Popover>
        </div>
        <Table
          columns={columns}
          dataSource={rows}
          pagination={false}
          bordered={true}
          size="small"
          rowKey={(record) => (record.isJs ? 'js:' : 'uiv:') + record.key}
          locale={{ emptyText: 'No variables yet — they appear here during a macro run' }}
          rowClassName={(record) => {
            if (record.isJs) return 'js-var'
            const vars = getVarsInstance()
            if (!vars)  return ''
            return vars.isReadOnly(record.key) ? 'read-only' : ''
          }}
        />
      </div>
    )
  }
}

export default connect(
  state => ({
    variables: state.variables,
    scriptVars: state.ui.scriptVars,
    config: state.config
  }),
  dispatch => bindActionCreators({ ...actions }, dispatch)
)(VariablesTable)
