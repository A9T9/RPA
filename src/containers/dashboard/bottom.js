import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators }  from 'redux'
import {
  Button, Dropdown, Menu, Input, Icon, Table, Checkbox,
  Form, Select, Modal, message, Row, Col, Tabs, Popconfirm
} from 'antd'
import JSZip from 'jszip'

import Ext from '../../common/web_extension'
import log from '../../common/log'
import FileSaver from '../../common/lib/file_saver'
import { getVarsInstance, createVarsFilter } from '../../common/variables'
import { cn, setIn, dataURItoBlob, uniqueName, ensureExtName, sanitizeFileName } from '../../common/utils'
import { getStorageManager } from '../../services/storage'
import { renderLogType } from '../../common/macro_log'
import * as actions from '../../actions'
import * as C from '../../common/constant'
import EditInPlace from '../../components/edit_in_place'
import ipc from '../../common/ipc/ipc_cs'
import { editorSelectedCommand } from '../../recomputed'

class DashboardBottom extends React.Component {
  state = {
    activeTabForLogScreenshot: 'Logs',

    showCSVModal: false,
    csvText: '',
    csvFile: '',

    drag: {
      isDragging: false,
      // Check out the note on `screenX` in `onResizeDragEnd` event
      startY: 0,
      lastHeight: 220,
      currentMinHeight: 220
    }
  }

  getBottomMinHeight = () => {
    const { isDragging, lastHeight, currentMinHeight } = this.state.drag
    return (isDragging ? currentMinHeight : lastHeight) + 'px'
  }

  onResizeDragStart = (e) => {
    // Note: Firefox requires us to set something to DataTransfer, otherwise drag and dragEnd won't be triggered
    // refer to https://stackoverflow.com/questions/33434275/firefox-on-drag-end-is-not-called-in-a-react-component
    e.dataTransfer.setData('text', '')

    const style   = window.getComputedStyle(this.$dom)
    const height  = parseInt(style.height)

    this.setState(
      setIn(['drag'], {
        isDragging: true,
        startY: e.screenY,
        lastHeight: height,
        currentHeight: height
      }, this.state)
    )
  }

  onResizeDragEnd = (e) => {
    // Note: use `screenY` instead of `clientY`, because `clientY` of dragEnd events in Firefox
    // is always set to 0, while `screenY` is luckily still available. And since we only make use of
    // difference of X coordinate. `screenY` and `clientY` both work for us.
    //
    // reference:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=505521
    // https://developer.mozilla.org/en-US/docs/Web/Events/dragend
    const diff    = e.screenY - this.state.drag.startY
    const height  = this.state.drag.lastHeight - diff

    this.setState(
      setIn(['drag'], {
        isDragging: false,
        startY: 0,
        lastHeight: height,
        currentMinHeight: height
      })
    )
  }

  onFileChange = (e) => {
    const csvStorage  = getStorageManager().getCSVStorage()
    const files       = [].slice.call(e.target.files)
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
      const ps    = list.map(fileItem => csvStorage.write(sanitizeFileName(fileItem.fileName), new Blob([fileItem.text])))

      return Promise.all(ps).then(() => this.props.listCSV())
      .then(() => {
        message.info(`${list.length} csv files imported`)
        this.props.addLog('info', `${list.length} csv files imported: ${names.join(', ')}`)
      })
    })
    .catch(e => {
      this.props.addLog('error', e.message)
    })
  }

  removeCSV = (csv) => {
    const csvStorage  = getStorageManager().getCSVStorage()

    csvStorage.remove(csv.name)
    .then(() => this.props.listCSV())
    .then(() => {
      message.success(`successfully deleted`)
      this.props.addLog('info', `${csv.name} deleted`)
    })
  }

  viewCSV = (csv) => {
    window.open(`./csv_editor.html?csv=${csv.name}`, '', 'width=600,height=500,scrollbars=true')
  }

  onImageFileChange = (e) => {
    const files = [].slice.call(e.target.files)
    if (!files || !files.length)  return

    const read = (file) => {
      return new Promise((resolve, reject) => {
        const reader  = new FileReader()

        reader.onload = (readerEvent) => {
          try {
            const dataUrl   = readerEvent.target.result
            const obj       = storeImage({ dataUrl, name: file.name })
            resolve(obj)
          } catch (e) {
            resolve({ err: e, fileName: file.name })
          }
        }

        reader.readAsDataURL(file)
      })
    }

    const storeImage = ({ dataUrl, name }) => {
      return uniqueName(name, {
        check: (name) => {
          return getStorageManager()
          .getVisionStorage()
          .exists(name)
          .then(result => !result)
        }
      })
      .then(fileName => {
        return getStorageManager()
        .getVisionStorage()
        .write(sanitizeFileName(fileName), dataURItoBlob(dataUrl))
        .then(() => fileName)
      })
      .catch(e => {
        log.error(e.stack)
      })
    }

    Promise.all(files.map(read))
    .then(fileNames => {
      message.success(`${fileNames.length} image files imported into Vision tab`)
      this.props.addLog('info', `${fileNames.length} image files imported: ${fileNames.join(', ')}`)
      this.props.listVisions()
    })
    .catch(e => {
      log.error(e.stack)
      this.props.addLog('error', e.message)
    })
  }

  takeScreenshot = () => {
    ipc.ask('PANEL_SELECT_AREA_ON_CURRENT_PAGE')
    .catch(e => {
      message.error(e.message)
    })
  }

  viewVision = (fileName) => {
    window.open(`./vision_editor.html?vision=${fileName}`, '', 'width=600,height=500,scrollbars=true')
  }

  addVisionNameToTargetBox = (fileName) => {
    const { selectedCommand } = this.props

    if (!selectedCommand || ['visionFind', 'visualSearch', 'XClick', 'XMove'].indexOf(selectedCommand.cmd) === -1) {
      return message.error(`Image names can only be added to the target box if a 'visualSearch' command is selected`)
    }

    this.props.updateSelectedCommand({ target: fileName })
  }

  exportAllVisions = () => {
    const zip = new JSZip()
    const visionStorage = getStorageManager().getVisionStorage()

    visionStorage.list()
    .then(visions => {
      if (visions.length === 0) {
        return message.error('No vision to export')
      }

      const ps = visions.map(ss => {
        return visionStorage.read(ss.fileName, 'ArrayBuffer')
        .then(buffer => {
          zip.file(ss.fileName, buffer, { binary: true })
        })
      })

      return Promise.all(ps)
      .then(() => {
        zip.generateAsync({ type: 'blob' })
        .then(function (blob) {
          FileSaver.saveAs(blob, 'vision-images-export.zip');
        })
      })
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

    if (nextProps.visions.length > this.props.visions.length) {
      const diff = nextProps.visions.filter(item => !this.props.visions.find(v => v.name === item.name))

      if (diff.length > 1) {
        diff.sort((a, b) => a.createTime > b.createTime)
      }

      const toFocus = diff[0]

      setTimeout(() => {
        const $dom = document.getElementById(toFocus.name)
        if (!$dom)  return
        $dom.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 100)
    }
  }

  logStyle (log) {
    if (log.options && log.options.color) {
      return { color: log.options.color }
    }

    if (log.options && log.options.ignored) {
      return { color: 'orange' }
    }
  }

  prefixHardDisk (str) {
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
        <span>{ str }</span>
      </div>
    )
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
    const columns = [
      { title: 'Name',            dataIndex: 'name',      key: 'name' },
      { title: 'Size',            dataIndex: 'size',      key: 'size' },
      {
        title:'Last Modified',
        dataIndex: 'createTime',
        key: 'createTime',
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

              <a href={csv.url} download={csv.name}>
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

  renderVisionTable () {
    const columns = [
      {
        title: 'Image',
        dataIndex: 'url',
        key: 'url',
        width: 116,
        render: (url) => {
          return (
            <div
              className="vision-image"
              style={{
                backgroundImage: `url(${url})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center'
              }}
            >
            </div>
          )
        }
      },
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        render: (name, vision) => {
          return (
            <div className="vision-name-1" id={name}>
              <EditInPlace
                value={vision.name}
                onChange={name => {
                  getStorageManager()
                  .getVisionStorage()
                  .rename(vision.name, ensureExtName('.png', name))
                  .then(() => {
                    message.success('Successfully renamed')
                    this.props.listVisions()
                  })
                  .catch(e => {
                    log.error(e.stack)
                  })
                }}
                checkValue={name => {
                  return getStorageManager()
                  .getVisionStorage()
                  .exists(name)
                  .then(result => {
                    if (result) {
                      message.error(`'${name}' alreadsy exists`)
                    }
                    return !result
                  })
                }}
                getSelection={(name, $input) => {
                  const reg       = /(?:_dpi_\d+)?\.png$/i
                  const result    = reg.exec(name)
                  const endIndex  = result.index

                  return {
                    start:  0,
                    end:    endIndex
                  }
                }}
              />
            </div>
          )
        }
      },
      {
        title: 'Action',
        key: 'ops',
        width: 100,
        render: (text, vision, index) => {
          return (
            <div className="vision-actions">
              <Button
                size="small"
                type="default"
                shape="circle"
                title="Add name to target box"
                onClick={() => this.addVisionNameToTargetBox(vision.name)}
              >
                <Icon type="plus" />
              </Button>

              <Button
                size="small"
                type="default"
                shape="circle"
                title="View image"
                onClick={() => this.viewVision(vision.name)}
              >
                <Icon type="eye-o" />
              </Button>

              <Popconfirm
                title="Sure to delete?"
                okText="Delete"
                title="Delete image"
                onConfirm={() => {
                  getStorageManager()
                  .getVisionStorage()
                  .remove(vision.name)
                  .then(() => {
                    message.success('Successfully deleted')
                    this.props.listVisions()
                  })
                  .catch(e => {
                    log.error(e.stack)
                  })
                }}
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
      dataSource: this.props.visions,
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

  renderVariableTable () {
    const columns = [
      { title: 'Name',    dataIndex: 'key',      key: 'key',    width: '40%' },
      { title: 'Value',   dataIndex: 'value',    key: 'value',  render: (val) => JSON.stringify(val) || 'undefined' }
    ]
    const { showCommonInternalVariables, showAdvancedInternalVariables } = this.props.config
    const filter = createVarsFilter({
      withCommonInternal:   showCommonInternalVariables,
      withAdvancedInternal: showAdvancedInternalVariables
    })
    const variables = this.props.variables.filter(variable => filter(variable.key))

    const tableConfig = {
      columns,
      dataSource: variables,
      pagination: false,
      bordered: true,
      size: 'middle',
      rowKey: 'key',
      onRowClick: (record, index, e) => {
        // Do nothing
      },
      rowClassName: (record, index) => {
        const vars = getVarsInstance()
        if (!vars)  return ''
        return vars.isReadOnly(record.key) ? 'read-only' : ''
      }
    }

    return <Table {...tableConfig} />
  }

  render () {
    const { activeTabForLogScreenshot } = this.state
    const filters = {
      'All':    () => true,
      'Echo':   (item) => item.type === 'echo' || item.type === 'error' || item.type === 'warning' || item.type === 'status',
      // 'Info':   (item) => item.type === 'info' || item.type === 'echo' || item.type === 'reflect' || item.type === 'status',
      'Error':  (item) => item.type === 'error',
      'None':   () => false
    }
    const logFilter = this.props.config.logFilter || 'All'
    const logs      = this.props.logs.filter(filters[logFilter]);

    return (
      <div
        className="logs-screenshots"
        ref={el => { this.$dom = el }}
        style={{ height: this.getBottomMinHeight() }}
      >
        {this.renderCSVModal()}

        <div
          className={cn('resize-handler', { focused: this.state.drag.isDragging })}
          draggable="true"
          onDragStart={this.onResizeDragStart}
          onDragEnd={this.onResizeDragEnd}
          onMouseDown={() => this.setState(setIn(['drag', 'isDragging'], true, this.state))}
        />

        <Tabs
          type="card"
          onChange={key => {
            this.setState({ activeTabForLogScreenshot: key })

            if (key === 'Screenshots') {
              this.props.listScreenshots()
            }
          }}
        >
          <Tabs.TabPane tab="Logs" key="Logs">
            <ul className="log-content">
              {logs.map((log, i) => (
                <li className={log.type} key={log.id} style={this.logStyle(log)}>
                  <span className="log-type">{renderLogType(log)}</span>
                  <pre className="log-detail">{log.text}</pre>
                </li>
              ))}
            </ul>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Variables" key="Variables">
            <div className="variable-content">
              <div className="variable-options">
                <Checkbox
                  onChange={e => this.props.updateConfig({ showCommonInternalVariables: e.target.checked })}
                  checked={this.props.config.showCommonInternalVariables}
                >
                  Show most common <a href="https://a9t9.com/x/idehelp?help=internalvars" target="_blank">internal variables</a>
                </Checkbox>
                <Checkbox
                  onChange={e => this.props.updateConfig({ showAdvancedInternalVariables: e.target.checked })}
                  checked={this.props.config.showAdvancedInternalVariables}
                >
                  Show advanced <a href="https://a9t9.com/x/idehelp?help=internalvars" target="_blank">internal variables</a>
                </Checkbox>
              </div>
              {this.renderVariableTable()}
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Screenshots" key="Screenshots">
            <ul className="screenshot-content">
              {this.props.screenshots.map((ss, i) => (
                <li key={i}>
                  <span className="timestamp">
                    {ss.createTime && ss.createTime.toLocaleString()} - <span className="filename">{decodeURIComponent(ss.name)}</span>
                  </span>
                  <a
                    download={decodeURIComponent(ss.name)}
                    href={Ext.isFirefox() ? '#' : ss.url}
                    onClick={e => {
                      if (!Ext.isFirefox()) return
                      e.preventDefault()

                      // Note: for Firefox, `ss.url` is a data url instead of a `filesystem:` url (as in Chrome)
                      FileSaver.saveAs(dataURItoBlob(ss.url), ss.name)
                    }}
                  >
                    <img src={ss.url} />
                  </a>
                </li>
              ))}
            </ul>
          </Tabs.TabPane>
          <Tabs.TabPane tab={this.prefixHardDisk('CSV')} key="CSV">
            <div className="csv-content">
              {this.renderCSVTable()}
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab={this.prefixHardDisk('👁Visual')} key="Vision">
            <div className="vision-content">
              <div className="vision-top-actions">
                <div className="main-actions">
                  <Button
                    type="primary"
                    onClick={this.takeScreenshot}
                  >
                    Take Screenshot
                  </Button>
                  <span
                    className="load-image-button ant-btn ant-btn-primary"
                  >
                    <label htmlFor="select_image_files">Load Image</label>
                    <input
                      multiple
                      type="file"
                      accept="image/*"
                      id="select_image_files"
                      onChange={this.onImageFileChange}
                      ref={ref => { this.imageFileInput = ref }}
                      style={{display: 'none'}}
                    />
                  </span>
                  <Button
                    onClick={this.exportAllVisions}
                  >
                    Export All
                  </Button>
                </div>
                <a className="more-info" target="_blank" href="https://a9t9.com/x/idehelp?help=visual">More Info</a>
              </div>
              {this.renderVisionTable()}
            </div>
          </Tabs.TabPane>
        </Tabs>

        <div className="ls-toolbox">
          {activeTabForLogScreenshot === 'Logs' ? (
            <div>
              <Select
                value={this.props.config.logFilter}
                onChange={(value) => {
                  this.props.updateConfig({ logFilter: value })
                }}
                style={{ width: '70px', marginRight: '10px' }}
                size="small"
              >
                <Select.Option value='All'>All</Select.Option>
                <Select.Option value='Echo'>Echo</Select.Option>
                <Select.Option value='Error'>Error</Select.Option>
                <Select.Option value='None'>No log</Select.Option>
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
    hasSelectedCommand: state.editor.editing && state.editor.editing.meta && state.editor.editing.meta.selectedIndex !== -1,
    selectedCommand: editorSelectedCommand(state),
    status: state.status,
    logs: state.logs,
    screenshots: state.screenshots,
    variables: state.variables,
    csvs: state.csvs,
    visions: state.visions,
    config: state.config
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(DashboardBottom)
