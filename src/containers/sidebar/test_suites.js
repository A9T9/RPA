import React from 'react'
import ReactDOM from 'react-dom'
import { connect } from 'react-redux'
import { bindActionCreators, compose }  from 'redux'
import { Modal, Tabs, Icon, Select, Input, Button, Menu, Dropdown, Alert, message } from 'antd'
import ClickOutside from 'react-click-outside'
import JSZip from 'jszip'

import FileSaver from '../../common/lib/file_saver'
import * as actions from '../../actions'
import * as C from '../../common/constant'
import getSaveTestCase from '../../components/save_test_case'
import { getPlayer } from '../../common/player'
import { setIn, updateIn, cn, formatDate, nameFactory } from '../../common/utils'
import { stringifyTestSuite, parseTestSuite, validateTestSuiteText, toBookmarkData, toHtml } from '../../common/convert_suite_utils'
import { createBookmarkOnBar } from '../../common/bookmark'
import EditTestSuite from '../../components/edit_test_suite'
import EditableText from '../../components/editable_text'

const downloadTestSuite = (ts, testCases) => {
  const str = stringifyTestSuite({
    name:   ts.name,
    cases:  ts.cases
  }, testCases)
  const blob = new Blob([str], { type: 'text/plain;charset=utf-8' })

  FileSaver.saveAs(blob, `suite_${ts.name}.json`)
}

const downloadTestSuiteAsHTML = (ts) => {
  const str = toHtml({ name: ts.name })
  const blob = new Blob([str], { type: 'text/plain;charset=utf-8' })

  FileSaver.saveAs(blob, `${ts.name}.html`)
}

class SidebarTestSuites extends React.Component {
  state = {
    tsContextMenu: {
      x: null,
      y: null,
      isShown: false
    },

    tscContextMenu: {
      x: null,
      y: null,
      isShown: false
    },

    tsEditingNameIndex: -1,

    editTestSuiteSource: {
      ts: null,
      visible: false
    }
  }

  addTestSuite = () => {
    this.props.addTestSuite({
      name: '__Untitled__',
      cases: []
    })
  }

  addTestCaseToTestSuite = (ts) => {
    this.props.updateTestSuite(ts.id, {
      cases: ts.cases.concat({
        testCaseId: this.props.testCases[0] && this.props.testCases[0].id,
        loops: 1
      })
    })
  }

  removeTestCaseFromTestSuite = (ts, index) => {
    ts.cases.splice(index, 1)

    this.props.updateTestSuite(ts.id, {
      cases: ts.cases,
      playStatus: (function () {
        const { playStatus = {} } = ts
        const { doneIndices = [], errorIndices = [] } = playStatus
        const updateIndex = (n) => {
          if (n === undefined)  return -1
          if (n === index)      return -1
          if (n > index)        return n - 1
          return n
        }

        return {
          errorIndices: errorIndices.map(updateIndex).filter(i => i !== -1),
          doneIndices: doneIndices.map(updateIndex).filter(i => i !== -1)
        }
      })()
    })
  }

  toggleTestSuiteFold = (ts) => {
    this.props.updateTestSuite(ts.id, {
      fold: !ts.fold
    })
  }

  foldAllTestSuites = () => {
    this.props.testSuites.forEach(ts => {
      this.props.updateTestSuite(ts.id, {
        fold: true
      })
    })
  }

  onClickTestSuiteMore = (e, ts, tsIndex) => {
    e.stopPropagation()
    e.preventDefault()

    const updated = {
      tsContextMenu: {
        x: e.clientX,
        y: e.clientY,
        isShown: true,
        ts,
        tsIndex
      }
    }

    // Note: to make it work in Firefox, have to delay this new state a little bit
    // Because hideTcContextMenu could be executed at the same time via clickOutside
    setTimeout(() => this.setState(updated), 20)
  }

  onClickTsTestCaseMore = (e, tc, tcIndex, ts, tsIndex) => {
    e.stopPropagation()
    e.preventDefault()

    const updated = {
      tscContextMenu: {
        x: e.clientX,
        y: e.clientY,
        isShown: true,
        tc,
        ts,
        tcIndex,
        tsIndex
      }
    }

    // Note: to make it work in Firefox, have to delay this new state a little bit
    // Because hideTcContextMenu could be executed at the same time via clickOutside
    setTimeout(() => this.setState(updated), 20)
  }

  hideTsContextMenu = () => {
    this.setState({
      tsContextMenu: {
        ...this.state.tsContextMenu,
        isShown: false
      }
    })
  }

  hideTscContextMenu = () => {
    this.setState({
      tscContextMenu: {
        ...this.state.tscContextMenu,
        isShown: false
      }
    })
  }

  onTsMenuClick = ({ key }, ts, tsIndex) => {
    this.hideTsContextMenu()

    switch (key) {
      case 'play':
        getPlayer({ name: 'testSuite' }).play({
          title: ts.name,
          extra: {
            id: ts.id,
            name: ts.name
          },
          mode: getPlayer().C.MODE.STRAIGHT,
          startIndex: 0,
          resources: ts.cases.map(item => ({
            id:     item.testCaseId,
            loops:  item.loops
          }))
        })
        break

      case 'edit_source':
        this.setState({
          editTestSuiteSource: {
            ts,
            visible: true
          }
        })
        break

      case 'rename':
        this.setState({
          tsEditingNameIndex: tsIndex
        })
        break

      case 'export':
        downloadTestSuite(ts, this.props.testCases)
        break

      case 'create_bookmark': {
        const bookmarkTitle = prompt('Title for this bookmark', `#${ts.name}.kantu`)
        if (bookmarkTitle === null) return

        return createBookmarkOnBar(toBookmarkData({
          bookmarkTitle,
          name: ts.name
        }))
        .then(() => {
          message.success('successfully created bookmark!', 1.5)
        })
      }

      case 'export_html': {
        return downloadTestSuiteAsHTML(ts)
      }

      case 'delete':
        Modal.confirm({
          title: 'Are your sure to delete this test suite?',
          okText: 'Confirm',
          onOk: () => this.props.removeTestSuite(ts.id)
        })
        break
    }
  }

  onTscMenuClick = ({ key }, tc, tcIndex, ts, tsIndex) => {
    this.hideTscContextMenu()

    switch (key) {
      case 'play_from_here':
        getPlayer({ name: 'testSuite' }).play({
          title: ts.name,
          extra: {
            id: ts.id,
            name: ts.name
          },
          mode: getPlayer().C.MODE.STRAIGHT,
          startIndex: tcIndex,
          resources: ts.cases.map(item => ({
            id:     item.testCaseId,
            loops:  item.loops
          }))
        })
        break
    }
  }

  onChangeTsName = (val, ts, tsIndex) => {
    this.setState({
      tsEditingNameIndex: -1
    })

    this.props.updateTestSuite(ts.id, {
      name: val
    })
  }

  onChangeTsCase = (key, val, tcIndex, ts, tsIndex) => {
    this.props.updateTestSuite(ts.id, {
      cases: setIn([tcIndex, key], val, ts.cases)
    })
  }

  getTsTestCaseClass = (tcIndex, tsPlayStatus) => {
    if (!tsPlayStatus)  return ''
    const { doneIndices = [], errorIndices = [], currentIndex } = tsPlayStatus

    if (tcIndex === currentIndex) {
      return 'current-tc'
    } else if (errorIndices.indexOf(tcIndex) !== -1) {
      return 'error-tc'
    } else if (doneIndices.indexOf(tcIndex) !== -1) {
      return 'done-tc'
    } else {
      return ''
    }
  }

  onJSONFileChange = (e) => {
    setTimeout(() => {
      this.jsonFileInput.value = null
    }, 500)
    return this.onReadFile(str => parseTestSuite(str, this.props.testCases))(e)
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

      this.props.addTestSuites(doneList.map(x => x.data))
        .then(({ passCount, failCount, failTcs }) => {
          message.info(
            [
              `${passCount} test suite${passCount > 1 ? 's' : ''} imported!`,
              `${failList.length + failCount} test suite${(failList.length + failCount) > 1 ? 's' : ''} failed!`
            ].join(', '),
            3
          )

          failList.forEach(fail => {
            this.props.addLog('error', `in parsing ${fail.fileName}: ${fail.err.message}`)
          })

          failTcs.forEach(fail => {
            this.props.addLog('error', `duplicated test suite name: ${fail.name}`)
          })
        })
    })
  }

  onClosePlayTestSuiteTip = () => {
    this.props.updateConfig({
      hidePlayTestSuiteTip: true
    })
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

  renderTestSuiteContextMenu () {
    const contextMenu = this.state.tsContextMenu
    const mw  = 230
    let x     = contextMenu.x + window.scrollX
    let y     = contextMenu.y + window.scrollY

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
        <ClickOutside onClickOutside={this.hideTsContextMenu}>
          <Menu
            onClick={e => this.onTsMenuClick(e, contextMenu.ts, contextMenu.tsIndex)}
            style={menuStyle}
            mode="vertical"
            selectable={false}
          >
            <Menu.Item key="play">Play</Menu.Item>
            <Menu.Item key="edit_source">Edit source..</Menu.Item>
            <Menu.Item key="rename">Rename..</Menu.Item>
            <Menu.Item key="export">Export</Menu.Item>
            <Menu.Item key="export_html">Create HTML autorun page</Menu.Item>
            <Menu.Item key="create_bookmark">Add to Bookmarks</Menu.Item>
            <Menu.Divider />
            <Menu.Item key="delete">Delete</Menu.Item>
          </Menu>
        </ClickOutside>
      </div>
    )

    return ReactDOM.createPortal(content, this.getPortalContainer())
  }

  renderTestSuiteCaseContextMenu () {
    const contextMenu = this.state.tscContextMenu
    const mw  = 150
    let x     = contextMenu.x + window.scrollX
    let y     = contextMenu.y + window.scrollY

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
        <ClickOutside onClickOutside={this.hideTscContextMenu}>
          <Menu
            onClick={e => this.onTscMenuClick(e, contextMenu.tc, contextMenu.tcIndex, contextMenu.ts, contextMenu.tsIndex)}
            style={menuStyle}
            mode="vertical"
            selectable={false}
          >
            <Menu.Item key="play_from_here">Replay from here</Menu.Item>
          </Menu>
        </ClickOutside>
      </div>
    )

    return ReactDOM.createPortal(content, this.getPortalContainer())
  }

  renderTestSuiteMenu () {
    const onClickMenuItem = ({ key }) => {
      switch (key) {
        case 'export_all': {
          const zip = new JSZip()

          if (this.props.testSuites.length === 0) {
            return message.error('No saved test suites to export', 1.5)
          }

          const genName = nameFactory()

          this.props.testSuites.forEach(ts => {
            const name = genName(ts.name)
            zip.file(`${name}.json`, stringifyTestSuite(ts, this.props.testCases))
          })

          zip.generateAsync({ type: 'blob' })
          .then(function (blob) {
            FileSaver.saveAs(blob, 'all_suites.zip');
          });

          break
        }

        case 'import': {
          break
        }
      }
    }

    return (
      <Menu onClick={onClickMenuItem} selectable={false}>
        <Menu.Item key="export_all">Export all (JSON)</Menu.Item>
        <Menu.Item key="4">
          <label htmlFor="select_json_files_for_ts">Import JSON</label>
          <input
            multiple
            type="file"
            accept=".json"
            id="select_json_files_for_ts"
            onChange={this.onJSONFileChange}
            style={{display: 'none'}}
            ref={el => { this.jsonFileInput = el }}
          />
        </Menu.Item>
      </Menu>
    )
  }

  renderEditTestSuiteSource () {
    if (!this.state.editTestSuiteSource.visible)  return null
    const ts = this.state.editTestSuiteSource.ts
    const source = stringifyTestSuite(ts, this.props.testCases)
    const testCases = this.props.testCases

    return (
      <EditTestSuite
        visible={true}
        value={source}
        validate={text => validateTestSuiteText(text, testCases)}
        onClose={() => this.setState({ editTestSuiteSource: { visible: false } })}
        onChange={text => {
          const newTestSuite = parseTestSuite(text, testCases)

          this.props.updateTestSuite(ts.id, newTestSuite)
          this.setState({ editTestSuiteSource: { visible: false } })
        }}
      />
    )
  }

  renderTestSuites () {
    return (
      <div>
        <div className="test-suite-actions">
          <Button type="primary" onClick={this.addTestSuite}>+ Test Suite</Button>
          <Button type="default" onClick={this.foldAllTestSuites}>Fold</Button>
          <Dropdown overlay={this.renderTestSuiteMenu()} trigger={['click']}>
            <Button shape="circle">
              <Icon type="setting" />
            </Button>
          </Dropdown>
        </div>
        {!this.props.config.hidePlayTestSuiteTip && this.props.testSuites.length > 0 ? (
          <Alert
            type="info"
            message="Right click to play test suite"
            onClose={this.onClosePlayTestSuiteTip}
            closable
            showIcon
            style={{ margin: '10px', paddingRight: '30px' }}
          />
        ) : null}
        <ul className="sidebar-test-suites">
          {this.props.testSuites.map((ts, tsIndex) => (
            <li
              key={ts.id}
              className={cn('test-suite-item ', {
                fold:     ts.fold,
                playing:  ts.playStatus && ts.playStatus.isPlaying
              })}
            >
              <div className="test-suite-row"
                onClick={() => this.toggleTestSuiteFold(ts)}
                onContextMenu={(e) => this.onClickTestSuiteMore(e, ts, tsIndex)}
              >
                <Icon type={ts.fold ? 'folder' : 'folder-open'} />
                <EditableText
                  className="test-suite-title"
                  value={ts.name}
                  onChange={val => this.onChangeTsName(val, ts, tsIndex)}
                  isEditing={tsIndex === this.state.tsEditingNameIndex}
                  inputProps={{
                    onClick: (e) => e.stopPropagation(),
                    onContextMenu: (e) => e.stopPropagation()
                  }}
                />
                {tsIndex === this.state.tsEditingNameIndex ? null : (
                  <Icon
                    type="bars"
                    className="more-button"
                    onClick={(e) => this.onClickTestSuiteMore(e, ts, tsIndex)}
                  />
                )}
              </div>

              {ts.cases.length > 0 ? (
                <ul className="test-suite-cases">
                  {ts.cases.map((item, tcIndex) => (
                    <li
                      key={tcIndex}
                      className={this.getTsTestCaseClass(tcIndex, ts.playStatus)}
                      onContextMenu={(e) => this.onClickTsTestCaseMore(e, item, tcIndex, ts, tsIndex)}
                    >
                      <Icon
                        type="file"
                        style={{ marginRight: '10px', cursor: 'pointer' }}
                        onClick={() => {
                          const { src } = this.props.editing.meta
                          const go = () => {
                            this.props.editTestCase(item.testCaseId)
                            return Promise.resolve()
                          }

                          return getSaveTestCase().saveOrNot().then(go)
                        }}
                      />
                      <Select
                        showSearch
                        optionFilterProp="children"
                        value={item.testCaseId}
                        onChange={val => this.onChangeTsCase('testCaseId', val, tcIndex, ts, tsIndex)}
                        filterOption={(input, data) => data.props.children.toLowerCase().indexOf(input.toLowerCase()) !== -1}
                        style={{ flex: 1, marginRight: '10px', maxWidth: '50%' }}
                      >
                        {this.props.testCases.map(tc => (
                          <Select.Option value={tc.id} key={tc.id}>
                            {tc.name}
                          </Select.Option>
                        ))}
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        value={item.loops}
                        onChange={e => this.onChangeTsCase('loops', e.target.value.trim().length === 0 ? '1' : e.target.value, tcIndex, ts, tsIndex)}
                        style={{ width: '45px', marginRight: '10px' }}
                      />
                      <Icon
                        type="close"
                        style={{ cursor: 'pointer' }}
                        onClick={() => this.removeTestCaseFromTestSuite(ts, tcIndex)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="test-suite-more-actions">
                <Button
                  type="default"
                  onClick={() => this.addTestCaseToTestSuite(ts)}
                >
                  + Macro
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  render () {
    return (
      <div>
        {this.renderTestSuites()}
        {this.renderTestSuiteContextMenu()}
        {this.renderTestSuiteCaseContextMenu()}
        {this.renderEditTestSuiteSource()}
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
)(SidebarTestSuites)
