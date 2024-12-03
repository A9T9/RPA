import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators }  from 'redux'
import {
  Button, Dropdown, Menu, Input, Table, Checkbox,
  Select, Modal, message, Tabs
} from 'antd'
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import JSZip from 'jszip'

import Ext from '@/common/web_extension'
import log from '@/common/log'
import FileSaver from '@/common/lib/file_saver'
import { getVarsInstance, createVarsFilter } from '@/common/variables'
import { cn, setIn, dataURItoBlob, uniqueName, ensureExtName, sanitizeFileName, validateStandardName, withFileExtension } from '@/common/utils'
import { getStorageManager, StorageManagerEvent } from '@/services/storage'
import { renderLogType } from '@/common/macro_log'
import * as actions from '@/actions'
import EditInPlace from '@/components/edit_in_place'
// import SearchBox from '@/components/search_box'
import { editorSelectedCommand } from '@/recomputed'
import { CsvList } from './csv_list'
import { VisionList } from './vision_list'
import { ScreenshotList } from './screenshot_list'
import { isPlaying, getShouldLoadResources } from '../../../recomputed'
import M from '@/common/messages'
import config from '../../../config'
import { ResourceNotLoaded } from '../../common/resource_not_loaded'
import { isCVTypeForDesktop } from '../../../common/cv_utils'
import { RunBy } from '../../../reducers/state'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { getLicenseService } from '../../../services/license'

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
    },

    searchImageText: ''
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
    
    this.props.onBottomPanelHeightChange(height)
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

  downloadCSV = (csv) => {
    getStorageManager().getCSVStorage().read(csv.fullPath, 'Text')
    .then(text => {
      const blob = new Blob([text])
      FileSaver.saveAs(blob, csv.name)
    })
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

  viewVision = (filePath) => {
    window.open(`./vision_editor.html?vision=${filePath}`, '', 'width=600,height=500,scrollbars=true')
  }

  renameVision = (oldName, newName) => {
    return getStorageManager()
    .getVisionStorage()
    .rename(oldName, ensureExtName('.png', newName))
    .then(() => {
      message.success('Successfully renamed')
      this.props.listVisions()
    })
    .catch(e => {
      message.error(e.message)
      throw e
    })
  }

  isVisionNameValid = (name) => {
    return Promise.resolve(
      withFileExtension(name, (baseName) => {
        try {
          validateStandardName(baseName, true)
        } catch (e) {
          message.error(e.message)
          throw e
        }
        return baseName
      })
    )
    .then(
      () => {
        return getStorageManager()
        .getVisionStorage()
        .exists(name)
        .then(result => {
          if (result) {
            message.error(`'${name}' already exists`)
          }
          return !result
        })
      },
      () => false
    )
  }

  duplicateVision = (name) => {
    this.props.duplicateVisionImage(name)
  }

  deleteVision = (name) => {
    return Modal.confirm({
      title: 'Sure to delete?',
      okText: 'Delete',
      onOk: () => {
        return getStorageManager()
        .getVisionStorage()
        .remove(name)
        .then(() => {
          message.success('Successfully deleted')
          this.props.listVisions()
        })
        .catch(e => {
          log.error(e)
        })
      },
      onCancel: () => {
        return Promise.resolve(true)
      }
    })
  }

  addVisionNameToTargetBox = (filePath) => {
    const { config, selectedCommand: selectedCmd } = this.props
    const selectedCmdIsVisualSearch = (() => {
      if (!selectedCmd) return false
      if (isCVTypeForDesktop(config.cvScope) && selectedCmd.cmd === 'visionLimitSearchArea')  return true

      return [
        'visionFind', 'visualSearch',
        'visualAssert', 'visualVerify',
        'XClick', 'XClickText', 'XClickTextRelative', 'XMoveText', 'XMove', 'XMoveText', 'XClickRelative', 'XMoveRelative',
        'OCRExtract', 'OCRExtractRelative', 'OCRExtractbyTextRelative', 'visionLimitSearchAreaRelative', 'visionLimitSearchAreabyTextRelative'
      ].indexOf(selectedCmd.cmd) !== -1
    })()

    if (!selectedCmdIsVisualSearch) {
      return message.error(`Image names can only be added to the target box if a vision related command is selected`)
    }

    this.props.updateSelectedCommand({ target: filePath })
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
        return visionStorage.read(ss.fullPath, 'ArrayBuffer')
        .then(buffer => {
          zip.file(ss.name, buffer, { binary: true })
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

  downloadScreenshot = (name, fullPath) => {
    return getStorageManager().getScreenshotStorage().read(fullPath, 'ArrayBuffer')
    .then(buffer => {
      FileSaver.saveAs(new Blob([new Uint8Array(buffer)]), name)
    })
  }

  toggleBottom = () => {
    this.props.updateConfig({
      showBottomArea: !this.props.config.showBottomArea
    })
  }

  componentDidMount () {
    getStorageManager().on(StorageManagerEvent.StrategyTypeChanged, (type) => {
      this.forceUpdate()
    })
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.logs.length !== this.props.logs.length) {
      const $logContent = document.querySelector('.log-content')

      if (!$logContent) {
        return
      }

      // Note: set scroll top to a number large enough so that it will scroll to bottom
      // setTimeout 100ms to ensure content has been rendered before scroll
      setTimeout(() => {
        const $last = $logContent.children[$logContent.children.length - 1]

        if ($last) {
          $last.scrollIntoView()
        }
      }, 100)
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
    // console.log('logStyle:>> ', log)
    // this comes from 'aiComputerUse'
    if (log.type === 'a') {
      return { color: 'green' }
    }

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

  shouldUseFileSaverForDownloadingScreenshot () {
    if (Ext.isFirefox()) {
      return true
    }

    return getStorageManager().isXFileMode()
  }

  shouldRenderLogStack (log) {
    if (log.stack.length <= 1) {
      return false
    }

    switch (log.type) {
      case 'error':
      case 'warning':
        return true

      case 'status':
        return /^Running/.test(log.text)

      default:
        return false
    }
  }

  renderCSVModal () {
    return (
      <Modal
        title={`Preview - ${this.state.csvFile}`}
        open={this.state.showCSVModal}
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
    if (!this.props.shouldLoadResources) {
      return (
        <ResourceNotLoaded
          name="CSV list"
          from={this.props.from}
          showList={() => {
            this.props.setFrom(RunBy.Manual)
          }}
        />
      )
    }

    if (this.state.activeTabForLogScreenshot !== 'CSV') {
      return null
    }

    if (this.props.isPlaying && this.props.csvs.length > config.performanceLimit.fileCount) {
      return <div className="hidden-during-replay">{ M.contentHidden }</div>
    }

    return (
      <CsvList
        list={this.props.csvs}
        viewCSV={this.viewCSV}
        removeCSV={this.removeCSV}
        downloadCSV={this.downloadCSV}
      />
    )
  }

  renderVisionSection () {
    if (!this.props.shouldLoadResources) {
      return (
        <div className="vision-content">
          <ResourceNotLoaded
            name="Image list"
            from={this.props.from}
            showList={() => {
              this.props.setFrom(RunBy.Manual)
            }}
          />
        </div>
      )
    }

    return (
      <div className="vision-content">
        <div className="vision-top-actions">
          <div className="main-actions">
            <div className="main-actions-left">
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

            {/* <SearchBox
              style={{ flex: 0.8 }}
              inputProps={{
                placeholder: 'search image',
                value: this.state.searchImageText,
                onChange: e => this.setState({ searchImageText: e.target.value })
              }}
            /> */}
            <Input.Search style={{ flex: 0.8 }} placeholder="Search image" onChange={e => this.setState({ searchImageText: e.target.value })} />
          </div>
          <a className="more-info" target="_blank" href="https://goto.ui.vision/x/idehelp?help=visual">More Info</a>
        </div>
        {this.renderVisionTable()}
      </div>
    )
  }

  renderVisionTable () {
    if (this.state.activeTabForLogScreenshot !== 'Vision') {
      return null
    }

    if (this.props.isPlaying && this.props.visions.length > config.performanceLimit.fileCount) {
      return <div className="hidden-during-replay">{ M.contentHidden }</div>
    }

    if (!this.$dom) {
      return null
    }

    return (
      <VisionList
        visions={this.props.visions}
        intersectRoot={this.$dom}
        query={this.state.searchImageText}
        isNameValid={this.isVisionNameValid}
        renameVision={this.renameVision}
        viewVision={this.viewVision}
        duplicateVision={this.duplicateVision}
        deleteVision={this.deleteVision}
        copyNameToTarget={this.addVisionNameToTargetBox}
      />
    )
  }

  renderScreenshots () {
    if (this.state.activeTabForLogScreenshot !== 'Screenshots') {
      return null
    }

    if (!this.$dom) {
      return null
    }

    return (
      <ScreenshotList
        screenshots={this.props.screenshots}
        intersectRoot={this.$dom}
        downloadScreenshot={this.downloadScreenshot}
      />
    )
  }

  renderVariableTable () {
    if (this.state.activeTabForLogScreenshot !== 'Variables') {
      return null
    }

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

  renderLogStack (log) {
    // Don't care about the top element in stack
    const stack = log.stack.slice(0, -1).reverse()

    if (stack.length === 0) {
      return null
    }

    return (
      <div style={{ marginLeft: '80px' }}>
        {stack.map((item, i) => (
          <div key={i}>
            At <a
              href="#"
              onClick={e => {
                e.preventDefault()

                if (typeof item.commandIndex === 'number' && item.macroId) {
                  this.props.gotoLineInMacro(
                    item.macroId,
                    item.commandIndex
                  )
                }
              }}
            >
              Line {item.commandIndex + 1} in {item.macroName}
            </a>
          </div>
        ))}
      </div>
    )
  }

  logLinkPatterns = [
    [/Error #101/i, 'https://goto.ui.vision/x/idehelp?help=error101'],
	[/Error #120/i, 'https://goto.ui.vision/x/idehelp?help=error120'],
	[/Error #121/i, 'https://goto.ui.vision/x/idehelp?help=error121'],
	[/Error #170/i, 'https://goto.ui.vision/x/idehelp?help=error179'],
	[/Error #220/i, 'https://goto.ui.vision/x/idehelp?help=error220']	
  ]

  appendLinkIfPatternMatched (text) {
    const linksToAdd = []

    this.logLinkPatterns.forEach((item) => {
      const [patternReg, link, anchorText = '(more info)'] = item

      if (patternReg.test(text)) {
        linksToAdd.push(
          <a href={link} class="info" target="_blank" style={{ marginLeft: '8px' }}>{anchorText}</a>
        )
      }
    })

    if (linksToAdd.length === 0) {
      return text
    }

    return (
      <span>
        <span>{text}</span>
        {linksToAdd}
      </span>
    )
  }

  renderLogText (log) {
    if (typeof log.text === 'function') {
      return log.text({ renderText: this.renderLogText.bind(this) })
    }

    if (['error', 'warning'].indexOf(log.type) === -1) {
      return log.text
    }

    const content = (() => {
      if (/XClick\/XClickText\/XClickTextRelative\/XMoveText\/XMove\/XType \d+ commands limit reached/.test(log.text) ||
          /OCR conversion limit reached/.test(log.text) ||
          /PROXY \d+ commands? limit reached/.test(log.text)) {
        const licenceType = (() => {
          if (getLicenseService().hasNoLicense()) {
            return 'PRO'
          }

          if (getLicenseService().isPersonalLicense()) {
            return 'PRO2 or Enterprise'
          }

          return null
        })()

        if (!licenceType) return log.text

        return (
          <span>
            <span>{log.text}</span>
            <a
              href="#"
              style={{ marginLeft: '10px' }}
              onClick={e => {
                e.preventDefault()
                this.props.updateUI({ showSettings: true, settingsTab: 'register' })
              }}
            >
              Get a {licenceType} license key to remove this limit
            </a>
          </span>
        )
      }

      if (/(XModule|xFile) is not installed yet/.test(log.text)) {
        return (
          <span>
            <span>{log.text}</span>
            <a
              href="#"
              style={{ marginLeft: '10px' }}
              onClick={e => {
                e.preventDefault()
                this.props.updateUI({ showSettings: true, settingsTab: 'xmodules' })
              }}
            >
              Install now
            </a>
          </span>
        )
      }

      if (/OCR feature disabled/.test(log.text)) {
        return (
          <span>
            <span>OCR feature disabled. Please enable it in the </span>
            <a
              href="#"
              onClick={e => {
                e.preventDefault()
                this.props.updateUI({ showSettings: true, settingsTab: 'ocr' })
              }}
            >
              OCR Settings
            </a>
          </span>
        )
      }

      return this.appendLinkIfPatternMatched(log.text)
    })()

    const stack = log.stack || []
    const source = stack[stack.length - 1]

    if (!source) {
      return content
    }

    return (
      <span>
        <a
          href="#"
          onClick={e => {
            e.preventDefault()

            if (typeof source.commandIndex === 'number' && source.macroId) {
              this.props.gotoLineInMacro(
                source.macroId,
                source.commandIndex
              )
            }
          }}
        >
          <span>Line {source.commandIndex + 1}</span>
          {!source.isSubroutine ? null : (
            <span> (Sub: {source.macroName})</span>
          )}
        </a>
        <span>: </span>
        { content }
      </span>
    )
  }

  render () {
    const { activeTabForLogScreenshot } = this.state
    const filters = {
      'All':    () => true,
      'Echo':   (item) => item.type === 'echo' || (item.type === 'error' && (!item.options || !item.options.ignored)),
      'Echo_And_Status':   (item) => item.type === 'echo' || (item.type === 'error' && (!item.options || !item.options.ignored)) || item.type === 'status',
      // 'Info':   (item) => item.type === 'info' || item.type === 'echo' || item.type === 'reflect' || item.type === 'status',
      'Error':  (item) => item.type === 'error' || item.type === 'report',
      'None':   () => false
    }
    const logFilter = this.props.config.logFilter || 'All'
    const logs      = this.props.logs.filter(filters[logFilter] || (() => true));

    return (
      <div
        className={cn('logs-screenshots', { fold: !this.props.config.showBottomArea })}
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
          style={{ height: '30%' }}
          onChange={key => {
            this.setState({ activeTabForLogScreenshot: key })

            if (key === 'Screenshots') {
              this.props.listScreenshots()
            }
          }}
          items={[
            {
              label: 'Logs',
              key: 'Logs',
              children: (
                <ul className="log-content">
                  {logs.map((log, i) => (
                    <li className={log.type} key={log.id} style={this.logStyle(log)}>
                      <span className="log-type">{renderLogType(log)}</span>
                      <pre className="log-detail">{this.renderLogText(log)}</pre>
                      {this.shouldRenderLogStack(log) ? this.renderLogStack(log) : null}
                    </li>
                  ))}
                </ul>
              )
            },
            {
              label: 'Variables',
              key: 'Variables',
              children: (
                <div className="variable-content">
                  <div className="variable-options">
                    <Checkbox
                      onClick={e => this.props.updateConfig({ showCommonInternalVariables: e.target.checked })}
                      checked={this.props.config.showCommonInternalVariables}
                    >
                      Show most common <a href="https://goto.ui.vision/x/idehelp?help=internalvars" target="_blank">internal variables</a>
                    </Checkbox>
                    <Checkbox
                      onClick={e => this.props.updateConfig({ showAdvancedInternalVariables: e.target.checked })}
                      checked={this.props.config.showAdvancedInternalVariables}
                    >
                      Show advanced <a href="https://goto.ui.vision/x/idehelp?help=internalvars" target="_blank">internal variables</a>
                    </Checkbox>
                  </div>
                  {this.renderVariableTable()}
                </div>
              )
            },
            {
              label: this.prefixHardDisk('Screenshots'),
              key: 'Screenshots',
              children: this.renderScreenshots()
            },
            {
              label: this.prefixHardDisk('CSV'),
              key: 'CSV',
              children: (
                <div className="csv-content">
                  {this.renderCSVTable()}
                </div>
              )
            },
            {
              label: this.prefixHardDisk('👁Visual'),
              key: 'Vision',
              children: this.renderVisionSection()
            }
          ]}
        >
        </Tabs>

        <div className="ls-toolbox">
          {activeTabForLogScreenshot === 'Logs' ? [
            <Select
              key="log-filter"
              value={this.props.config.logFilter}
              onChange={(value) => {
                this.props.updateConfig({ logFilter: value })
              }}
              style={{ width: '60px' }}
              popupMatchSelectWidth={false}
              size="small"
            >
              <Select.Option value='All'>All</Select.Option>
              <Select.Option value='Echo'>Echo</Select.Option>
              <Select.Option value='Echo_And_Status'>Echo &amp; Status</Select.Option>
              <Select.Option value='Error'>Error &amp; Reports</Select.Option>
              <Select.Option value='None'>No log</Select.Option>
            </Select>,
            <Button
              key="clear-logs"
              size="small"
              onClick={this.props.clearLogs}
            >
              Clear
            </Button>
          ] : null}

          {activeTabForLogScreenshot === 'Screenshots' ? (
            <Button
              size="small"
              onClick={this.props.clearScreenshots}
            >
              Clear
            </Button>
          ) : null}

          {activeTabForLogScreenshot === 'CSV' && this.props.shouldLoadResources ? (
            <Button
              size="small"
              onClick={() => {
                if (getStorageManager().isXFileMode()) {
                  Modal.info({
                    title: 'In hard-drive mode, there is no need to import CSV files.',
                    content: 'To view the latest /datasource folder content, press the "Refresh" icon next to the word "Storage mode" on the left.'
                  })
                } else {
                  this.fileInput.click()
                }
              }}
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

          <Button
            size="small"
            onClick={this.toggleBottom}
          >
            {/* <Icon type={this.props.config.showBottomArea ? 'down' : 'up'} /> */} 
            { this.props.config.showBottomArea ? <DownOutlined /> : <UpOutlined /> }
          </Button>
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({
    hasSelectedCommand: state.editor.editing && state.editor.editing.meta && state.editor.editing.meta.selectedIndex !== -1,
    selectedCommand: editorSelectedCommand(state),
    shouldLoadResources: getShouldLoadResources(state),
    isPlaying: isPlaying(state),
    status: state.status,
    from: state.from,
    logs: state.logs,
    screenshots: state.screenshots,
    variables: state.variables,
    csvs: state.csvs,
    visions: state.visions,
    config: state.config
  }),
  dispatch => bindActionCreators({...actions, ...simpleActions}, dispatch)
)(DashboardBottom)
