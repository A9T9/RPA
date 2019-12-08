import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, compose }  from 'redux'
import { Modal, Tabs, Icon, Select, Input, Button, Menu, Dropdown, Alert, message } from 'antd'
import ClickOutside from 'react-click-outside'

import './sidebar.scss'
import * as actions from '../../actions'
import { setIn, updateIn, cn } from '../../common/utils'
import SidebarTestSuites from './test_suites'
import SidebarTestCases from './test_cases'
import { StorageStrategyType, StorageManagerEvent, getStorageManager } from '../../services/storage'

class Sidebar extends React.Component {
  state = {
    drag: {
      isDragging: false,
      startX: 0,
      movingX: 0,
      lastWidth: 260,
      currentMinWidth: 260
    }
  }

  getSideBarMinWidth = () => {
    const { isDragging, lastWidth, currentMinWidth } = this.state.drag
    return (isDragging ? currentMinWidth : lastWidth) + 'px'
  }

  onResizeDragStart = (e) => {
    // Note: Firefox requires us to set something to DataTransfer, otherwise drag and dragEnd won't be triggered
    // refer to https://stackoverflow.com/questions/33434275/firefox-on-drag-end-is-not-called-in-a-react-component
    e.dataTransfer.setData('text', '')

    const style = window.getComputedStyle(this.$dom)
    const width = parseInt(style.width)

    this.setState(
      setIn(['drag'], {
        isDragging: true,
        // Check out the note on `screenX` in `onResizeDragEnd` event
        startX: e.screenX,
        lastWidth: width,
        currentWidth: width
      }, this.state)
    )
  }

  onResizeDragEnd = (e) => {
    // Note: use `screenX` instead of `clientX`, because `clientX` of dragEnd events in Firefox
    // is always set to 0, while `screenX` is luckily still available. And since we only make use of
    // difference of X coordinate. `screenX` and `clientX` both work for us.
    //
    // reference:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=505521
    // https://developer.mozilla.org/en-US/docs/Web/Events/dragend
    const diff  = e.screenX - this.state.drag.startX
    const width = diff + this.state.drag.lastWidth

    this.setState(
      setIn(['drag'], {
        isDragging: false,
        startX: 0,
        lastWidth: width,
        currentMinWidth: width
      })
    )
  }

  onTryToChangeStorageMode = (storageMode) => {
    // Steps:
    // 1. [pseudo code] StorageManager.changeMode()
    // 2. Try to refresh / reload all resources (macros, test suites, csvs, vision images)
    // 3. Be aware of any pending changes in current storage
    //
    // There should be no exception when switching back to browser mode
    // But `[pseudo code] StorageManager.changeMode(xFileMode)` should throw error when xFile is not ready.
    //
    // Once catched that error, should do following:
    // 1. Reset mode back to browser mode
    // 2. Show info dialog to encourage users to download xFile host

    const man = getStorageManager()

    man.isStrategyTypeAvailable(storageMode)
    .then(isOk => {
      if (isOk) {
        // Note: it will emit events, so that `index.js` could handle the rest (refresh / reload resources)
        this.props.updateConfig({ storageMode })
        return man.setCurrentStrategyType(storageMode)
      }

      throw new Error('It should be impossible to get isOk as false')
    })
    .catch(e => {
      message.warn(e.message)

      if (e.message && /xFile is not installed yet/.test(e.message)) {
        this.props.updateUI({ showFileNotInstalledDialog: true })
      } else {
        this.props.updateUI({ showSettings: true, settingsTab: 'xmodules' })
      }
    })
  }

  componentDidMount () {
    const type = getStorageManager().getCurrentStrategyType()
    this.setState({ storageMode: type })
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

  renderXFileNotInstalledModal () {
    return (
      <Modal
        title=""
        className={cn('xfile-not-installed-modal', { 'left-bottom': this.props.ui.showFileNotInstalledDialog === true })}
        width={350}
        footer={null}
        visible={this.props.ui.showFileNotInstalledDialog}
        onCancel={() => {
          this.props.updateUI({ showFileNotInstalledDialog: false })
        }}
      >
        <p>
          XFileAccess Module not installed.
        </p>
        <div>
          <Button
            type="primary"
            onClick={() => {
              this.props.updateUI({
                showFileNotInstalledDialog: false,
                showSettings: true,
                settingsTab: 'xmodules'
              })
            }}
          >
            Open Settings
          </Button>
        </div>
      </Modal>
    )
  }

  render () {
    return (
      <div
        className="sidebar"
        ref={el => { this.$dom = el }}
        style={{ minWidth: this.getSideBarMinWidth() }}
      >
        <div className="sidebar-inner">
          <Tabs
            defaultActiveKey="macros"
            activeKey={this.props.ui.sidebarTab || 'macros'}
            onChange={activeKey => this.props.updateUI({ sidebarTab: activeKey })}
          >
            <Tabs.TabPane tab={this.prefixHardDisk('Macros')} key="macros">
              <SidebarTestCases />
            </Tabs.TabPane>
            <Tabs.TabPane tab={this.prefixHardDisk('Test Suites')} key="test_suites">
              <SidebarTestSuites />
            </Tabs.TabPane>
          </Tabs>
        </div>

        <div className="sidebar-storage-mode">
          <div className="storage-mode-header">
            <h3>Storage Mode</h3>
            {getStorageManager().isXFileMode() ? (
              <img
                src="./img/reload.svg"
                title="Reload all resources on hard drive"
                style={{
                  height: '15px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  getStorageManager().emit(StorageManagerEvent.ForceReload)
                  message.info('reloaded from hard drive')
                }}
              />
            ) : null}
            <a href="https://a9t9.com/x/idehelp?help=storage_mode" target="_blank">More Info</a>
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="Storage Mode"
            value={this.props.config.storageMode}
            onChange={this.onTryToChangeStorageMode}
          >
            <Select.Option value={StorageStrategyType.Browser}>
              Local Storage (in browser)
            </Select.Option>
            <Select.Option value={StorageStrategyType.XFile}>
              File system (on hard drive)
            </Select.Option>
          </Select>
        </div>

        <div
          className={cn('resize-handler', { focused: this.state.drag.isDragging })}
          draggable="true"
          onDragStart={this.onResizeDragStart}
          onDragEnd={this.onResizeDragEnd}
          onMouseDown={() => this.setState(setIn(['drag', 'isDragging'], true, this.state))}
        />

        {this.renderXFileNotInstalledModal()}
      </div>
    )
  }
}

export default connect(
  state => ({
    status: state.status,
    testCases: state.editor.testCases,
    testSuites: state.editor.testSuites,
    editing: state.editor.editing,
    player: state.player,
    config: state.config,
    ui: state.ui
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(Sidebar)
