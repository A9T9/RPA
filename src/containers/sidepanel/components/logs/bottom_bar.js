import { Button, Modal, Select, message } from 'antd'
import JSZip from 'jszip'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as actions from '@/actions'
import FileSaver from '@/common/lib/file_saver'
import log from '@/common/log'
import { dataURItoBlob, sanitizeFileName, uniqueName } from '@/common/utils'
import { getStorageManager } from '@/services/storage'

// Per-tab bottom bar for the Data tab (the play/record controlbar makes no
// sense there — each side panel tab brings its own bottom controls). Which
// controls show depends on the active Data sub-tab (ui.dataTab).
class LogsBottomBar extends React.Component {
  onCSVFileChange = (e) => {
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
        message.info(`${list.length} file(s) imported`)
        this.props.addLog('info', `${list.length} file(s) imported: ${names.join(', ')}`)
      })
    })
    .catch(e => {
      this.props.addLog('error', e.message)
    })
  }

  onClickImportCSV = () => {
    if (getStorageManager().isXFileMode()) {
      Modal.info({
        title: 'In hard-drive mode, there is no need to import CSV/TXT files.',
        content: 'To view the latest /datasource folder content, press the "Refresh" icon next to the word "Storage mode" in the Files tab.'
      })
    } else {
      this.csvFileInput.click()
    }
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
      message.success(`${fileNames.length} image files imported into Visual tab`)
      this.props.addLog('info', `${fileNames.length} image files imported: ${fileNames.join(', ')}`)
      this.props.listVisions()
    })
    .catch(e => {
      log.error(e.stack)
      this.props.addLog('error', e.message)
    })
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

  renderLogsControls () {
    return (
      <React.Fragment>
        <span className="bar-label">Show:</span>
        <Select
          value={this.props.config.logFilter || 'All'}
          onChange={(value) => {
            this.props.updateConfig({ logFilter: value })
          }}
          // wide enough for "Echo & Status" / "Error & Reports" — no truncation
          style={{ flex: 1, minWidth: 0, maxWidth: '160px' }}
          popupMatchSelectWidth={false}
        >
          <Select.Option value='All'>All</Select.Option>
          <Select.Option value='Echo'>Echo</Select.Option>
          <Select.Option value='Echo_And_Status'>Echo &amp; Status</Select.Option>
          <Select.Option value='Error'>Error &amp; Reports</Select.Option>
          <Select.Option value='None'>No log</Select.Option>
        </Select>
        <Button style={{ marginLeft: 'auto' }} onClick={() => this.props.clearLogs()}>Clear log</Button>
      </React.Fragment>
    )
  }

  renderScreenshotsControls () {
    return (
      <Button style={{ marginLeft: 'auto' }} onClick={() => this.props.clearScreenshots()}>Clear</Button>
    )
  }

  renderCSVControls () {
    return (
      <Button style={{ marginLeft: 'auto' }} onClick={this.onClickImportCSV}>
        Import CSV/TXT
        <input
          multiple
          type="file"
          accept=".csv,.txt"
          onChange={this.onCSVFileChange}
          style={{ display: 'none' }}
          ref={ref => { this.csvFileInput = ref }}
        />
      </Button>
    )
  }

  renderVisionControls () {
    return (
      <React.Fragment>
        <span className="load-image-button ant-btn ant-btn-primary">
          <label htmlFor="sidepanel_select_image_files">Load Image</label>
          <input
            multiple
            type="file"
            accept="image/*"
            id="sidepanel_select_image_files"
            onChange={this.onImageFileChange}
            ref={ref => { this.imageFileInput = ref }}
            style={{ display: 'none' }}
          />
        </span>
        <Button style={{ marginLeft: 'auto' }} onClick={this.exportAllVisions}>Export All</Button>
      </React.Fragment>
    )
  }

  render () {
    const controls = (() => {
      switch (this.props.ui.dataTab || 'Logs') {
        case 'Screenshots':
          return this.renderScreenshotsControls()
        case 'CSV':
          return this.renderCSVControls()
        case 'Vision':
          return this.renderVisionControls()
        default:
          return this.renderLogsControls()
      }
    })()

    return (
      <div className="tab-bottom-bar">
        {controls}
      </div>
    )
  }
}

export default connect(
  state => ({
    config: state.config,
    ui: state.ui
  }),
  dispatch => bindActionCreators({ ...actions }, dispatch)
)(LogsBottomBar)
