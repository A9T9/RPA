import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators }  from 'redux'
import {
  Button, Dropdown, Menu, Input, Icon, Table, Checkbox,
  Form, Select, Modal, message, Row, Col, Tabs, Popconfirm
} from 'antd'

import { getCSVMan } from '../../common/csv_man'
import * as actions from '../../actions'
import * as C from '../../common/constant'

class DashboardBottom extends React.Component {
  state = {
    logFilter: 'All',
    activeTabForLogScreenshot: 'Logs',

    showCSVModal: false,
    csvText: '',
    csvFile: ''
  }

  onFileChange = (e) => {
    const csvMan  = getCSVMan()
    const files   = [].slice.call(e.target.files)
    if (!files || !files.length)  return

    const read = (file) => {
      return new Promise((resolve, reject) => {
        const reader  = new FileReader()

        reader.onload = (readerEvent) => {
          const text  = readerEvent.target.result
          resolve({
            text,
            fileName: file.name
          })
        }

        reader.readAsText(file)
      })
    }

    Promise.all(files.map(read))
    .then(list => {
      const names = list.map(item => item.fileName)
      const ps    = list.map(fileItem => csvMan.write(fileItem.fileName, fileItem.text))

      return Promise.all(ps).then(() => this.props.listCSV())
      .then(() => {
        message.info(`${list.length} csv files imported`)
        this.props.addLog('info', `${list.length} csv files imported: ${names.join(', ')}`)
      })
    })
  }

  removeCSV = (csv) => {
    const csvMan  = getCSVMan()

    csvMan.remove(csv.fileName)
    .then(() => this.props.listCSV())
    .then(() => {
      message.success(`successfully deleted`)
      this.props.addLog('info', `${csv.fileName} deleted`)
    })
  }

  viewCSV = (csv) => {
    const csvMan  = getCSVMan()

    csvMan.read(csv.fileName)
    .then(text => {
      const win = window.open('', '', 'width=600, height=500, scrollbars=yes');
      win.document.write(`
        <style>
          textarea {
            font-size: 14px;
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
          }
        </style>
        <textarea>${text}</textarea>
      `)
    })
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.logs.length !== this.props.logs.length) {
      const $logContent = document.querySelector('.logs-screenshots .ant-tabs-content')
      const itemHeight  = 50

      if (!$logContent) return

      // Note: set scroll top to a number large enough so that it will scroll to bottom
      // setTimeout 100ms to ensure content has been rendered before scroll
      setTimeout(
        () => { $logContent.scrollTop = itemHeight * nextProps.logs.length * 2 },
        100
      )
    }
  }

  renderCSVModal () {
    return (
      <Modal
        title={`Preview - ${this.state.csvFile}`}
        visible={this.state.showCSVModal}
        onCancel={() => this.setState({ showCSVModal: false, csvText: '', csvFile: '' })}
        className="csv-preview-modal"
        footer={null}
      >
        <Input.TextArea
          style={{ width: '100%' }}
          value={this.state.csvText}
          readOnly={true}
          rows={10}
        />
      </Modal>
    )
  }

  renderCSVTable () {
    const csvMan  = getCSVMan()
    const columns = [
      { title: 'Name',            dataIndex: 'fileName',      key: 'fileName' },
      { title: 'Size',            dataIndex: 'size',          key: 'size' },
      {
        title:'Last Modified',
        dataIndex: 'lastModified',
        key: 'lastModified',
        render: (d) => {
          const pad = n => n >= 10 ? ('' + n) : ('0' + n)
          return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        }
      },
      {
        title: 'Action',
        key: 'ops',
        width: 100,
        render: (text, csv, index) => {
          return (
            <div>
              <Button
                size="small"
                type="default"
                shape="circle"
                onClick={(e) => { this.viewCSV(csv) }}
              >
                <Icon type="eye-o" />
              </Button>

              <a href={csvMan.getLink(csv.fileName)} download={csv.fileName}>
                <Button
                  size="small"
                  type="primary"
                  shape="circle"
                  onClick={(e) => { e.stopPropagation() }}
                >
                  <Icon type="download" />
                </Button>
              </a>

              <Popconfirm
                title="Sure to delete?"
                okText="Delete"
                onConfirm={() => { this.removeCSV(csv) }}
              >
                <Button
                  size="small"
                  type="danger"
                  shape="circle"
                >
                  <Icon type="close" />
                </Button>
              </Popconfirm>
            </div>
          )
        }
      }
    ]

    const tableConfig = {
      columns,
      dataSource: this.props.csvs,
      pagination: false,
      bordered: true,
      size: 'middle',
      rowKey: 'fileName',
      onRowClick: (record, index, e) => {
        // Do nothing
      },
      rowClassName: (record, index) => {
        return ''
      }
    }

    return <Table {...tableConfig} />
  }

  render () {
    const { logFilter, activeTabForLogScreenshot } = this.state
    const filters = {
      'All':    () => true,
      'Info':   (item) => item.type === 'info',
      'Error':  (item) => item.type === 'error'
    }
    const logs = this.props.logs.filter(filters[logFilter])

    return (
      <div className="logs-screenshots">
        {this.renderCSVModal()}

        <Tabs
          type="card"
          onChange={key => this.setState({ activeTabForLogScreenshot: key })}
        >
          <Tabs.TabPane tab="Logs" key="Logs">
            <ul className="log-content">
              {logs.map((log, i) => (
                <li className={log.type} key={i}>
                  <span className="log-type">[{log.type}]</span>
                  <pre className="log-detail">{log.text}</pre>
                </li>
              ))}
            </ul>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Screenshots" key="Screenshots">
            <ul className="screenshot-content">
              {this.props.screenshots.map((ss, i) => (
                <li key={ss.url}>
                  <span className="timestamp">
                    {ss.createTime.toLocaleString()} - <span className="filename">{decodeURIComponent(ss.name)}</span>
                  </span>
                  <a download={decodeURIComponent(ss.name)} href={ss.url}>
                    <img src={ss.url} />
                  </a>
                </li>
              ))}
            </ul>
          </Tabs.TabPane>
          <Tabs.TabPane tab="CSV" key="CSV">
            <div className="csv-content">
              {this.renderCSVTable()}
            </div>
          </Tabs.TabPane>
        </Tabs>

        <div className="ls-toolbox">
          {activeTabForLogScreenshot === 'Logs' ? (
            <div>
              <Select
                value={logFilter}
                onChange={(value) => this.setState({ logFilter: value })}
                style={{ width: '70px', marginRight: '10px' }}
                size="small"
              >
                <Select.Option value='All'>All</Select.Option>
                <Select.Option value='Info'>Info</Select.Option>
                <Select.Option value='Error'>Error</Select.Option>
              </Select>

              <Button
                size="small"
                onClick={this.props.clearLogs}
              >
                Clear
              </Button>
            </div>
          ) : null}

          {activeTabForLogScreenshot === 'Screenshots' ? (
            <Button
              size="small"
              onClick={this.props.clearScreenshots}
            >
              Clear
            </Button>
          ) : null}

          {activeTabForLogScreenshot === 'CSV' ? (
            <Button
              size="small"
              onClick={() => this.fileInput.click()}
            >
              Import CSV
              <input
                multiple
                type="file"
                accept=".csv"
                onChange={this.onFileChange}
                style={{ display: 'none' }}
                ref={ref => { this.fileInput = ref }}
              />
            </Button>
          ) : null}
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({
    status: state.status,
    logs: state.logs,
    screenshots: state.screenshots,
    csvs: state.csvs
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(DashboardBottom)
