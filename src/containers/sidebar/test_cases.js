import React from 'react'
import ReactDOM from 'react-dom'
import { connect } from 'react-redux'
import { bindActionCreators, compose }  from 'redux'
import { Modal, Tabs, Icon, Select, Input, Button, Menu, Dropdown, Alert, message } from 'antd'
import ClickOutside from 'react-click-outside'
import JSZip from 'jszip'

import { StorageTarget, StorageStrategyType, getStorageManager } from '../../services/storage'
import FileSaver from '../../common/lib/file_saver'
import SearchBox from '../../components/search_box'
import getSaveTestCase from '../../components/save_test_case'
import { getPlayer } from '../../common/player'
import { setIn, updateIn, cn, formatDate, nameFactory, pick, uid } from '../../common/utils'
import { createBookmarkOnBar } from '../../common/bookmark'
import * as actions from '../../actions'
import * as C from '../../common/constant'
import {
  toJSONString,
  toJSONDataUri,
  toHtmlDataUri,
  toHtml,
  fromHtml,
  fromJSONString,
  toBookmarkData
} from '../../common/convert_utils'

const downloadTestCaseAsJSON = (tc) => {
  const str = toJSONString({ name: tc.name, commands: tc.data.commands })
  const blob = new Blob([str], { type: 'text/plain;charset=utf-8' })

  FileSaver.saveAs(blob, `${tc.name}.json`, true)
}

const downloadTestCaseAsHTML = (tc) => {
  const str = toHtml({ name: tc.name, commands: tc.data.commands })
  const blob = new Blob([str], { type: 'text/plain;charset=utf-8' })

  FileSaver.saveAs(blob, `${tc.name}.html`, true)
}

class SidebarTestCases extends React.Component {
  state = {
    searchText: '',

    showDuplicate: false,
    duplicateName: '',

    showRename: false,
    rename: '',

    tcContextMenu: {
      x: null,
      y: null,
      isShown: false
    }
  }

  // Rename relative
  onClickRename = () => {
    this.props.renameTestCase(this.state.rename, this.state.renameTcId)
      .then(() => {
        message.success('successfully renamed!', 1.5)
        this.toggleRenameModal(false)
      })
      .catch((e) => {
        message.error(e.message, 1.5)
      })
  }

  onCancelRename = () => {
    this.toggleRenameModal(false)
    this.setState({
      rename: null
    })
  }

  onChangeRename = (e) => {
    this.setState({
      rename: e.target.value
    })
  }

  // Duplicate relative
  onClickDuplicate = () => {
    this.props.duplicateTestCase(this.state.duplicateName, this.state.duplicateTcId)
      .then(() => {
        message.success('successfully duplicated!', 1.5)
      })
    this.toggleDuplicateModal(false)
  }

  onCancelDuplicate = () => {
    this.toggleDuplicateModal(false)
  }

  onChangeDuplicate = (e) => {
    this.setState({
      duplicateName: e.target.value
    })
  }

  toggleDuplicateModal = (toShow, tc) => {
    let duplicateName = tc ? (tc.name + '_new') : ''

    this.setState({
      showDuplicate: toShow,
      duplicateTcId: tc && tc.id,
      duplicateName
    })

    if (toShow) {
      setTimeout(() => {
        const input = this.inputDuplicateTestCase.refs.input
        input.focus()
        input.selectionStart = input.selectionEnd = input.value.length;
      }, 100)
    }
  }

  toggleRenameModal = (toShow, tc) => {
    this.setState({
      showRename: toShow,
      renameTcId: tc && tc.id
    })

    if (toShow) {
      setTimeout(() => {
        const input = this.inputRenameTestCase.refs.input
        input.focus()
        input.selectionStart = input.selectionEnd = input.value.length;
      }, 100)
    }
  }

  getItemKlass = (tc) => {
    const src = this.props.editing.meta.src
    const klasses = []

    if (src && (src.id === tc.id))                        klasses.push('selected')

    if (tc.status === C.TEST_CASE_STATUS.SUCCESS)         klasses.push('success')
    else if (tc.status === C.TEST_CASE_STATUS.ERROR)      klasses.push('error')
    else                                                  klasses.push('normal')

    if (this.props.status !== C.APP_STATUS.NORMAL) {
      klasses.push('disabled')
    }

    return klasses.join(' ')
  }

  changeTestCase = (id) => {
    return new Promise((resolve) => {
      if (this.props.status !== C.APP_STATUS.NORMAL)  return resolve(false)
      if (this.props.editing.meta.src && this.props.editing.meta.src.id === id) return resolve(true)

      const go = () => {
        this.props.editTestCase(id)
        resolve(true)
      }

      return getSaveTestCase().saveOrNot().then(go)
    })
  }

  playTestCase = (id) => {
    if (this.props.status !== C.APP_STATUS.NORMAL)  return

    this.changeTestCase(id)
    .then(shouldPlay => {
      if (!shouldPlay)  return

      setTimeout(() => {
        const { commands } = this.props.editing
        const openTc  = commands.find(tc => tc.cmd.toLowerCase() === 'open')
        const { src } = this.props.editing.meta
        const getTestCaseName = () => {
          return src && src.name && src.name.length ? src.name : 'Untitled'
        }

        this.props.playerPlay({
          title: getTestCaseName(),
          extra: {
            id: src && src.id
          },
          mode: getPlayer().C.MODE.STRAIGHT,
          startIndex: 0,
          startUrl: openTc ? openTc.target : null,
          resources: commands,
          postDelay: this.props.player.playInterval * 1000
        })
      }, 500)
    })
  }

  onReadFile = (process) => (e) => {
    const files = [].slice.call(e.target.files)
    if (!files || !files.length)  return

    const read = (file) => {
      return new Promise((resolve, reject) => {
        const reader  = new FileReader()

        reader.onload = (readerEvent) => {
          try {
            const text  = readerEvent.target.result
            const obj   = process(text, file.name)
            resolve({ data: obj })
          } catch (e) {
            resolve({ err: e, fileName: file.name })
          }
        }

        reader.readAsText(file)
      })
    }

    Promise.all(files.map(read))
    .then(list => {
      const doneList = list.filter(x => x.data)
      const failList = list.filter(x => x.err)

      this.props.addTestCases(doneList.map(x => x.data))
        .then(({ passCount, failCount, failTcs }) => {
          message.info(
            [
              `${passCount} macro${passCount > 1 ? 's' : ''} imported!`,
              `${failList.length + failCount} macro${(failList.length + failCount) > 1 ? 's' : ''} failed!`
            ].join(', '),
            3
          )

          failList.forEach(fail => {
            this.props.addLog('error', `in parsing ${fail.fileName}: ${fail.err.message}`)
          })

          failTcs.forEach(fail => {
            this.props.addLog('error', `duplicated macro name: ${fail.name}`)
          })
        })
    })
  }

  onHTMLFileChange = (e) => {
    // Note: clear file input, so that we can fire onFileChange when users selects the same file next time
    setTimeout(() => {
      this.htmlFileInput.value = null
    }, 500)
    return this.onReadFile(fromHtml)(e)
  }

  onJSONFileChange = (e) => {
    setTimeout(() => {
      this.jsonFileInput.value = null
    }, 500)
    return this.onReadFile(fromJSONString)(e)
  }

  addTestCase = () => {
    const { src } = this.props.editing.meta
    const go = () => {
      this.props.editNewTestCase()
      return Promise.resolve()
    }

    return getSaveTestCase().saveOrNot().then(go)
  }

  onClickTestCaseMore = (e, tc, tcIndex) => {
    e.stopPropagation()
    e.preventDefault()

    const updated = {
      tcContextMenu: {
        x: e.clientX,
        y: e.clientY,
        isShown: true,
        tc,
        tcIndex
      }
    }

    // Note: to make it work in Firefox, have to delay this new state a little bit
    // Because hideTcContextMenu could be executed at the same time via clickOutside
    setTimeout(() => this.setState(updated), 20)
  }

  hideTcContextMenu = () => {
    this.setState({
      tcContextMenu: {
        ...this.state.tcContextMenu,
        isShown: false
      }
    })
  }

  onTcMenuClick = ({ key }, tc, tcIndex) => {
    this.hideTcContextMenu()

    switch (key) {
      case 'play': {
        return this.playTestCase(tc.id)
      }

      case 'rename': {
        this.setState({
          rename: tc.name
        })
        this.toggleRenameModal(true, tc)
        break
      }

      case 'delete': {
        const go = () => {
          return this.props.removeTestCase(tc.id)
            .then(() => {
              message.success('successfully deleted!', 1.5)
            })
            .catch(e => {
              Modal.warning({
                title: 'Failed to delete',
                content: e.message
              })
            })
        }

        return Modal.confirm({
          title: 'Sure to delete?',
          content: `Do you really want to delete "${tc.name}"?`,
          okText: 'Delete',
          cancelText: 'Cancel',
          onOk: go,
          onCancel: () => {}
        })
      }

      case 'duplicate': {
        return this.toggleDuplicateModal(true, tc)
      }

      case 'export_html': {
        return downloadTestCaseAsHTML(tc)
      }

      case 'export_json': {
        return downloadTestCaseAsJSON(tc)
      }

      case 'create_bookmark': {
        const bookmarkTitle = prompt('Title for this bookmark', `#${tc.name}.kantu`)
        if (bookmarkTitle === null) return

        return createBookmarkOnBar(toBookmarkData({
          bookmarkTitle,
          name: tc.name
        }))
        .then(() => {
          message.success('successfully created bookmark!', 1.5)
        })
      }

      case 'copy_to_xfile': {
        return getStorageManager().isStrategyTypeAvailable(StorageStrategyType.XFile)
        .then(() => {
          const macroStorage = getStorageManager().getStorageForTarget(StorageTarget.Macro, StorageStrategyType.XFile)
          const tcCopy = { ...tc, id: uid() }

          delete tcCopy.status
          return macroStorage.write(tcCopy.name, tcCopy)
          .then(() => message.success('copied'))
        })
        .catch(e => {
          this.props.updateUI({ showFileNotInstalledDialog: 1 })
        })
      }

      case 'copy_to_browser': {
        return getStorageManager().isStrategyTypeAvailable(StorageStrategyType.Browser)
        .then(() => {
          const macroStorage = getStorageManager().getStorageForTarget(StorageTarget.Macro, StorageStrategyType.Browser)
          const tcCopy = { ...tc, id: uid() }

          delete tcCopy.status
          return macroStorage.write(tcCopy.name, tcCopy)
          .then(() => message.success('copied'))
        })
        .catch(e => {
          message.warn(e.message)
        })
      }
    }
  }

  renderTestCases () {
    const isEditingUntitled = !this.props.editing.meta.src
    const { testCases }     = this.props
    const { searchText }    = this.state
    const trimSearchText    = searchText.trim().toLowerCase()
    const matchText         = trimSearchText.length === 0
                                  ? x => x
                                  : x => x.name.toLowerCase().indexOf(trimSearchText) !== -1
    const candidates        = testCases.filter(matchText)

    candidates.sort((a, b) => {
      const nameA = a.name.toLowerCase()
      const nameB = b.name.toLowerCase()

      if (nameA < nameB) return -1
      if (nameA === nameB)  return 0
      return 1
    })

    return (
      <ul className="sidebar-test-cases">
        {candidates.length === 0 && !isEditingUntitled ? (
          <div className="no-data">No macros yet</div>
        ) : null}
        {isEditingUntitled ? (
          <li className="selected">Untitled</li>
        ) : null}
        {candidates.map((tc, tcIndex) => (
          <li
            key={tc.id}
            className={this.getItemKlass(tc)}
            onClick={() => this.changeTestCase(tc.id)}
            onDoubleClick={() => this.playTestCase(tc.id)}
            onContextMenu={(e) => this.onClickTestCaseMore(e, tc, tcIndex)}
          >
            <span className="test-case-name">{tc.name}</span>
            <Icon
              type="bars"
              className="more-button"
              onClick={(e) => this.onClickTestCaseMore(e, tc, tcIndex)}
            />
          </li>
        ))}
      </ul>
    )
  }

  getPortalContainer () {
    const id = '__context_menu_container__'
    const $el = document.getElementById(id)
    if ($el)  return $el

    const $new = document.createElement('div')
    $new.id = id
    document.body.appendChild($new)
    return $new
  }

  renderTestCaseContextMenu () {
    const contextMenu = this.state.tcContextMenu
    const mw    = 230
    let x       = contextMenu.x + window.scrollX
    let y       = contextMenu.y + window.scrollY
    const $box  = document.querySelector('.sidebar-inner')

    if ($box && y + 220 > $box.clientHeight)  y -= 220

    if (x - mw > 0)    x -= mw

    const style = {
      position: 'absolute',
      top: y,
      left: x,
      display: contextMenu.isShown ? 'block' : 'none'
    }

    const menuStyle = {
      width: mw + 'px'
    }

    const content = (
      <div style={style} className="context-menu">
        <ClickOutside onClickOutside={this.hideTcContextMenu}>
          <Menu
            onClick={e => this.onTcMenuClick(e, contextMenu.tc, contextMenu.tcIndex)}
            style={menuStyle}
            mode="vertical"
            selectable={false}
          >
            <Menu.Item key="play">Play</Menu.Item>
            <Menu.Item key="rename">Rename..</Menu.Item>
            <Menu.Item key="duplicate">Duplicate..</Menu.Item>
            <Menu.Item key="export_json">Export as JSON</Menu.Item>
            <Menu.Item key="export_html">Export as HTML (plus autorun)</Menu.Item>
            <Menu.Item key="create_bookmark">Add shortcut to bookmarks bar</Menu.Item>
            {getStorageManager().isXFileMode() ? (
              <Menu.Item key="copy_to_browser">Copy to Local Storage</Menu.Item>
            ) : null}
            {getStorageManager().isBrowserMode() ? (
              <Menu.Item key="copy_to_xfile">Copy to Macro Folder</Menu.Item>
            ) : null}
            <Menu.Divider></Menu.Divider>
            <Menu.Item key="delete">Delete</Menu.Item>
          </Menu>
        </ClickOutside>
      </div>
    )

    return ReactDOM.createPortal(content, this.getPortalContainer())
  }

  renderTestCaseMenu () {
    const onClickMenuItem = ({ key }) => {
      switch (key) {
        case 'export_all_json': {
          const zip = new JSZip()

          if (this.props.testCases.length === 0) {
            return message.error('No saved macros to export', 1.5)
          }

          this.props.testCases.forEach(tc => {
            zip.file(`${tc.name}.json`, toJSONString({
              name: tc.name,
              commands: tc.data.commands
            }))
          })

          zip.generateAsync({ type: 'blob' })
          .then(function (blob) {
            FileSaver.saveAs(blob, 'all_test_cases.zip');
          })

          break
        }

        case 'import': {
          break
        }
      }
    }

    return (
      <Menu onClick={onClickMenuItem} selectable={false}>
        <Menu.Item key="export_all_json">Export All (JSON)</Menu.Item>
        <Menu.Item key="import_json">
          <label htmlFor="select_json_files_for_macros">Import JSON</label>
          <input
            multiple
            type="file"
            accept=".json"
            id="select_json_files_for_macros"
            onChange={this.onJSONFileChange}
            ref={ref => { this.jsonFileInput = ref }}
            style={{display: 'none'}}
          />
        </Menu.Item>
        <Menu.Item key="import_html">
          <label htmlFor="select_html_files">Import HTML</label>
          <input
            multiple
            type="file"
            accept=".html,.htm"
            id="select_html_files"
            onChange={this.onHTMLFileChange}
            ref={ref => { this.htmlFileInput = ref }}
            style={{display: 'none'}}
          />
        </Menu.Item>
      </Menu>
    )
  }

  renderDuplicateModal () {
    return (
      <Modal
        title="Duplicate Macro.."
        okText="Save"
        cancelText="Cancel"
        visible={this.state.showDuplicate}
        onOk={this.onClickDuplicate}
        onCancel={this.onCancelDuplicate}
        className="duplicate-modal"
      >
        <Input
          style={{ width: '100%' }}
          value={this.state.duplicateName}
          onKeyDown={e => { if (e.keyCode === 13) this.onClickDuplicate() }}
          onChange={this.onChangeDuplicate}
          placeholder="macro name"
          ref={el => { this.inputDuplicateTestCase = el }}
        />
      </Modal>
    )
  }

  renderRenameModal () {
    return (
      <Modal
        title="Rename the macro as.."
        okText="Save"
        cancelText="Cancel"
        visible={this.state.showRename}
        onOk={this.onClickRename}
        onCancel={this.onCancelRename}
        className="rename-modal"
      >
        <Input
          style={{ width: '100%' }}
          value={this.state.rename}
          onKeyDown={e => { if (e.keyCode === 13) this.onClickRename() }}
          onChange={this.onChangeRename}
          placeholder="macro name"
          ref={el => { this.inputRenameTestCase = el }}
        />
      </Modal>
    )
  }

  render () {
    return (
      <div>
        <div className="test-case-actions">
          <Button type="primary" onClick={this.addTestCase}>+ Macro</Button>
          <Dropdown overlay={this.renderTestCaseMenu()} trigger={['click']}>
            <Button shape="circle">
              <Icon type="setting" />
            </Button>
          </Dropdown>
          <SearchBox
            style={{ flex: 1 }}
            inputProps={{
              placeholder: 'search macro',
              value: this.state.searchText,
              onChange: e => this.setState({ searchText: e.target.value })
            }}
          />
        </div>

        {this.renderTestCases()}
        {this.renderTestCaseContextMenu()}
        {this.renderDuplicateModal()}
        {this.renderRenameModal()}
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
    config: state.config
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(SidebarTestCases)
