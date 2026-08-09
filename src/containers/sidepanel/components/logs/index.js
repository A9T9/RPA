import {
    Input, Modal, Tabs, message
} from 'antd'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import './logs.scss'
import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import FileSaver from '@/common/lib/file_saver'
import log from '@/common/log'
import M from '@/common/messages'
import { ensureExtName, validateStandardName, withFileExtension } from '@/common/utils'
import { editorSelectedCommand, getShouldLoadResources, isPlaying } from '@/recomputed'
import { StorageManagerEvent, getStorageManager } from '@/services/storage'
import { isCVTypeForDesktop } from '@/common/cv_utils'
import config from '@/config'
import { ResourceNotLoaded } from '@/containers/common/resource_not_loaded'
import { RunBy } from '@/reducers/state'
import { CsvList } from '@/containers/dashboard/bottom/csv_list'
import { ScreenshotList } from '@/containers/dashboard/bottom/screenshot_list'
import { VisionList } from '@/containers/dashboard/bottom/vision_list'
import LogList from './log_list'

// The "Data" tab: everything the IDE's bottom panel offers, reachable without
// opening the IDE — Logs plus the Screenshots / CSV / Visual resource lists.
// The active sub-tab lives in redux (ui.dataTab) because the per-tab bottom
// bar (bottom_bar.js) renders the matching controls for it.
class DataTab extends React.Component {
  state = {
    searchImageText: '',
    // scroll container of the surrounding sidepanel tabs — used as the
    // IntersectionObserver root for lazy-loading list images
    intersectRoot: null
  }

  getActiveSubTab = () => {
    return this.props.ui.dataTab || 'Logs'
  }

  onChangeSubTab = (key) => {
    this.props.updateUI({ dataTab: key })
    this.refreshListFor(key)
  }

  // the IDE refreshes these lists from its own lifecycle; the side panel has
  // to trigger them itself when a list becomes visible
  refreshListFor = (key) => {
    switch (key) {
      case 'Screenshots':
        return this.props.listScreenshots()
      case 'CSV':
        return this.props.listCSV()
      case 'Vision':
        return this.props.listVisions()
      default:
        return
    }
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
        'XClick', 'XClickText', 'XClickTextRelative', 'XClickRelative', 'XMove', 'XMoveText', 'XMoveTextRelative', 'XMoveRelative',
        'OCRExtract', 'OCRExtractRelative', 'OCRExtractbyTextRelative', 'visionLimitSearchAreaRelative', 'visionLimitSearchAreabyTextRelative'
      ].indexOf(selectedCmd.cmd) !== -1
    })()

    if (!selectedCmdIsVisualSearch) {
      return message.error(`Image names can only be added to the target box if a vision related command is selected`)
    }

    this.props.updateSelectedCommand({ target: filePath })
  }

  downloadScreenshot = (name, fullPath) => {
    return getStorageManager().getScreenshotStorage().read(fullPath, 'ArrayBuffer')
    .then(buffer => {
      FileSaver.saveAs(new Blob([new Uint8Array(buffer)]), name)
    })
  }

  componentDidMount () {
    getStorageManager().on(StorageManagerEvent.StrategyTypeChanged, (type) => {
      this.forceUpdate()
    })

    this.refreshListFor(this.getActiveSubTab())

    // resolve after mount: the scroll container is an ancestor rendered by
    // the surrounding sidepanel Tabs
    if (this.$dom) {
      this.setState({
        intersectRoot: this.$dom.closest('.ant-tabs-content-holder') || document.body
      })
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

  renderScreenshots () {
    if (!this.state.intersectRoot) {
      return null
    }

    return (
      <ScreenshotList
        screenshots={this.props.screenshots}
        intersectRoot={this.state.intersectRoot}
        downloadScreenshot={this.downloadScreenshot}
      />
    )
  }

  renderCSV () {
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

    if (this.props.isPlaying && this.props.csvs.length > config.performanceLimit.fileCount) {
      return <div className="hidden-during-replay">{ M.contentHidden }</div>
    }

    return (
      <div className="csv-content">
        <CsvList
          list={this.props.csvs}
          viewCSV={this.viewCSV}
          removeCSV={this.removeCSV}
          downloadCSV={this.downloadCSV}
        />
      </div>
    )
  }

  renderVision () {
    if (!this.props.shouldLoadResources) {
      return (
        <ResourceNotLoaded
          name="Image list"
          from={this.props.from}
          showList={() => {
            this.props.setFrom(RunBy.Manual)
          }}
        />
      )
    }

    if (this.props.isPlaying && this.props.visions.length > config.performanceLimit.fileCount) {
      return <div className="hidden-during-replay">{ M.contentHidden }</div>
    }

    if (!this.state.intersectRoot) {
      return null
    }

    return (
      <div className="vision-content">
        <div className="vision-search-row">
          <Input.Search
            placeholder="Search image"
            size="small"
            onChange={e => this.setState({ searchImageText: e.target.value })}
          />
          <a className="more-info" target="_blank" href="https://go.ui.vision/?help=visual">Info</a>
        </div>
        <VisionList
          visions={this.props.visions}
          intersectRoot={this.state.intersectRoot}
          query={this.state.searchImageText}
          isNameValid={this.isVisionNameValid}
          renameVision={this.renameVision}
          viewVision={this.viewVision}
          duplicateVision={this.duplicateVision}
          deleteVision={this.deleteVision}
          copyNameToTarget={this.addVisionNameToTargetBox}
        />
      </div>
    )
  }

  render () {
    return (
      <div className="data-tab" ref={el => { this.$dom = el }}>
        <Tabs
          type="card"
          size="small"
          activeKey={this.getActiveSubTab()}
          onChange={this.onChangeSubTab}
          items={[
            {
              key: 'Logs',
              label: 'Logs',
              children: <LogList />
            },
            {
              key: 'Screenshots',
              label: this.prefixHardDisk('Shots'),
              children: this.renderScreenshots()
            },
            {
              // key stays 'CSV' — ui.dataTab and the bottom bar switch on it
              key: 'CSV',
              label: this.prefixHardDisk('CSV/TXT'),
              children: this.renderCSV()
            },
            {
              key: 'Vision',
              label: this.prefixHardDisk('👁Visual'),
              children: this.renderVision()
            }
          ]}
        />
      </div>
    )
  }
}

export default connect(
  state => ({
    selectedCommand: editorSelectedCommand(state),
    shouldLoadResources: getShouldLoadResources(state),
    isPlaying: isPlaying(state),
    status: state.status,
    from: state.from,
    logs: state.logs,
    screenshots: state.screenshots,
    csvs: state.csvs,
    visions: state.visions,
    ui: state.ui,
    config: state.config
  }),
  dispatch => bindActionCreators({...actions, ...simpleActions}, dispatch)
)(DataTab)
