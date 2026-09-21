import { Button, Modal, Select, message } from 'antd'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as actions from '../../actions'
import { cn, delayMs, setIn, waitForRenderComplete } from '../../common/utils'
import { FocusArea } from '../../reducers/state'
import { openSettings } from '../../ext/common/tab'
import { StorageManagerEvent, StorageStrategyType, getStorageManager } from '../../services/storage'
import './sidebar.scss'
import SidebarTestCases from './test_cases'

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
      message.warn(e.message, 8)

      // Only a host the browser cannot find at all gets the install dialog;
      // any other reason (allowlist, blocked, won't start, folder problems)
      // is explained on the Desktop Automation settings page.
      const raw = e.connectError || ''
      if (/not found|no such native application/i.test(raw)) {
        this.props.updateUI({ showXFileNotInstalledDialog: true })
      } else {
        openSettings('desktop-automation')
      }
    })
  }

  onClickSidebar = () => {
    this.props.updateUI({ focusArea: FocusArea.Sidebar })
  }

  applyTreeViewScrollTop = () => {
    delayMs(200).then(() => {
      waitForRenderComplete().then(() => {
        // const { src } = this.props.editing.meta
        // const selectedMacroId = src.id
        const selectedFileNodeElement = document.querySelector('.sidebar-macros .file-node.selected')
        if (selectedFileNodeElement) {
          selectedFileNodeElement.scrollIntoView({ block: 'center' })
        }

        // TODO: remove macroTreeViewScrollTop from config if the change is accepted
        // alternative way to scroll to the last scroll position
        // const lastScrollTop = this.props.config.macroTreeViewScrollTop
        // console.log('render complete macroTreeViewScrollTop:>> ', this.props.config.macroTreeViewScrollTop)
        // const container =  document.querySelector('.sidebar-inner')
        // container.scrollTo({ top: lastScrollTop, behavior: 'instant' })
      })
    })
  }

  componentDidMount () {
    const type = getStorageManager().getCurrentStrategyType()
    this.setState({ storageMode: type })
    // this.bindScroll()
    this.applyTreeViewScrollTop()
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
        className={cn('xfile-not-installed-modal', { 'left-bottom': this.props.ui.showXFileNotInstalledDialog === true })}
        width={350}
        footer={null}
        open={this.props.ui.showXFileNotInstalledDialog}
        onCancel={() => {
          this.props.updateUI({ showXFileNotInstalledDialog: false })
        }}
      >
        <p>
          The Desktop Automation module (needed for file access) is not installed.
        </p>
        <div>
          <Button
            type="primary"
            onClick={() => {
              this.props.updateUI({ showXFileNotInstalledDialog: false })
              openSettings('desktop-automation')
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
        className={cn('sidebar')}
        ref={el => { this.$dom = el }}
        style={{ minWidth: this.getSideBarMinWidth() }}
        onClickCapture={this.onClickSidebar}
      >
        <div className={cn('sidebar-inner', { 'no-tab': !this.props.config.showTestCaseTab })}>
          {!this.props.config.showTestCaseTab ? (
            <SidebarTestCases />
          ) : (
            <section style={{ paddingTop: 20, overflowX: 'hidden' }}>
              <SidebarTestCases />
            </section>
          )}
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
            <a href="https://go.ui.vision/?help=storage_mode" target="_blank">More Info</a>
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
    editing: state.editor.editing,
    player: state.player,
    config: state.config,
    ui: state.ui
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(Sidebar)
