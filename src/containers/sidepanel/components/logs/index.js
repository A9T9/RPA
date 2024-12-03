import {
    Modal, message, Select, Button
} from 'antd'
import JSZip from 'jszip'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import './logs.scss'
import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import FileSaver from '@/common/lib/file_saver'
import log from '@/common/log'
import { renderLogType } from '@/common/macro_log'
import { dataURItoBlob, ensureExtName, sanitizeFileName, setIn, uniqueName, validateStandardName, withFileExtension } from '@/common/utils'
import { editorSelectedCommand, getShouldLoadResources, isPlaying } from '@/recomputed'
import { StorageManagerEvent, getStorageManager } from '@/services/storage'
import { isCVTypeForDesktop } from '@/common/cv_utils'
import { getLicenseService } from '@/services/license'

class Logs extends React.Component {
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

  componentDidMount () {
    getStorageManager().on(StorageManagerEvent.StrategyTypeChanged, (type) => {
      this.forceUpdate()
    })
  }

  logStyle (log) {
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

  shouldComponentUpdate (nextProps, nextState) {
    if (nextProps.logs.length !== this.props.logs.length) {
      const $logContent = document.querySelector('.log-content')
      if (!$logContent) {
        return false
      }
      setTimeout(() => {
        const $last = $logContent.children[$logContent.children.length - 1]
        if ($last) {
          $last.scrollIntoView()
        }
      }, 100)
      return true
    } else {
      // update on filter even when logs length is the same
      const nextLog = nextProps.logs[nextProps.logs.length - 1]
      const thisLog = this.props.logs[this.props.logs.length - 1]
      if (nextLog && thisLog) {
        return true
      }
    }
 
    // update on logs filtered
    if (nextProps.config.logFilter !== this.props.config.logFilter) {
      return true
    }

    // update on logs cleared
    if (nextProps.logs.length === 0 && this.props.logs.length > 0) {
      return true
    }

    return false
  }

  render () {
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
      <div>
        <div className='log-controls'>
          <Select
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
            size="small"
            onClick={this.props.clearLogs}
          >
            Clear
          </Button>
        </div>
        <ul className="log-content">
            {logs.map((log, i) => (
            <li className={log.type} key={log.id} style={this.logStyle(log)}>
                <span className="log-type">{renderLogType(log)}</span>
                <pre className="log-detail">{this.renderLogText(log)}</pre>
                {this.shouldRenderLogStack(log) ? this.renderLogStack(log) : null}
            </li>
            ))}
        </ul>
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
    config: state.config
  }),
  dispatch => bindActionCreators({...actions, ...simpleActions}, dispatch)
)(Logs)
