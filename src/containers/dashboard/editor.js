import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators }  from 'redux'
import {
  Button, Dropdown, Menu, Input, Icon, Table, Checkbox,
  Form, Select, Modal, message, Row, Col, Tabs
} from 'antd'
import VirtualList from 'react-virtual-list'
import { UnControlled as CodeMirror } from 'react-codemirror2'
import 'codemirror/lib/codemirror'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/lib/codemirror.css'

import { setIn } from '../../common/utils'
import { fromJSONString, toJSONString } from '../../common/convert_utils'
import { getStorageManager } from '../../services/storage'
import inspector from '../../common/inspector'
import { Player } from '../../common/player'
import csIpc from '../../common/ipc/ipc_cs'
import * as actions from '../../actions'
import * as C from '../../common/constant'
import log from '../../common/log'
import { editorSelectedCommand } from '../../recomputed'

const availableCommands = [
  'open',
  'click',
  'clickAndWait',
  'select',
  'selectAndWait',
  'type',
  'pause',
  'waitForPageToLoad',
  'selectFrame',
  'assertAlert',
  'assertConfirmation',
  'assertPrompt',
  'answerOnNextPrompt',
  'store',
  'storeText',
  'storeTitle',
  'storeAttribute',
  'assertText',
  'assertTitle',
  'clickAt',
  'echo',
  'mouseOver',
  'storeEval',
  'verifyText',
  'verifyTitle',
  'sendKeys',
  'dragAndDropToObject',
  'selectWindow',
  'captureScreenshot',
  'refresh',
  'verifyElementPresent',
  'assertElementPresent',
  'deleteAllCookies',
  'label',
  'gotoLabel',
  'gotoIf',
  'while',
  'endWhile',
  'csvRead',
  'csvSave',
  'if',
  'else',
  'endif',
  'storeValue',
  'assertValue',
  'verifyValue',
  'storeChecked',
  'assertChecked',
  'verifyChecked',
  'captureEntirePageScreenshot',
  'onDownload',
  // 'assertError',
  // 'verifyError',
  'throwError',
  'comment',
  'waitForVisible',
  'onError',
  'sourceSearch',
  'sourceExtract',
  'storeImage',
  'localStorageExport',
  // 'visionFind',
  'visionLimitSearchArea',
  'visualSearch',
  'visualVerify',
  'visualAssert',
  'editContent',
  'bringBrowserToForeground',
  'resize',

  'XClick',
  'XType',
  'XMove'
]

availableCommands.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1)

const newCommand = {
  cmd: '',
  target: '',
  value: ''
}

const defaultDataSource = [newCommand]

class DashboardEditor extends React.Component {
  state = {
    cursor: null,

    contextMenu: {
      x: null,
      y: null,
      isShown: false
    },

    visionFindPreview: {
      visible: false,
      url: null,
      timer: null,
      left: -9999,
      top: -9999
    }
  }

  resetSourceCodeCursor = (resetCursor) => {
    return {
      ...(resetCursor ? { cursor: { line: 0, ch: 0 } } : {})
    }
  }

  onDetailChange = (key, value) => {
    this.props.updateSelectedCommand({[key]: value})
  }

  onChangeCommandsView = (type) => {
    switch (type) {
      case 'table_view':
      case 'source_view': {
        const forceType = this.props.sourceErrMsg ? 'source_view' : type

        this.props.setEditorActiveTab(forceType)

        if (type === 'source_view' && this.codeMirror && this.state.cursor) {
          // Note: must delay a while so that focus will take effect
          setTimeout(() => {
            this.codeMirror.setCursor(this.state.cursor, true, true)
          }, 200)
        }

        break
      }
    }
  }

  onSourceBlur = () => {
    const { sourceTextModified, sourceText } = this.props
    this.props.saveSourceCodeToEditing(sourceTextModified)
  }

  onChangeEditSource = (editor, data, text) => {
    this.props.setSourceCurrent(text)
  }

  onClickFind = () => {
    const { lastOperation }   = this.state
    const { selectedCommand } = this.props

    const p = ['visionFind', 'visualSearch', 'visualAssert', 'visualVerify', 'XClick', 'XMove'].indexOf(selectedCommand.cmd) !== -1
                ? (() => {
                  const selectedIndex = this.props.editing.meta.selectedIndex
                  // Note: run visionFind/visualSearch as single line command, but without timeout waiting
                  this.playLine(selectedIndex, {
                    overrideScope: {'!TIMEOUT_WAIT': 0},
                    commandExtra: { throwError: true }
                  })
                  return Promise.resolve(true)
                })()
                : csIpc.ask('PANEL_HIGHLIGHT_DOM', {
                    lastOperation,
                    locator: selectedCommand.target
                  })

    p.catch(e => {
      message.error(e.message, 1.5)
    })
  }

  onToggleInspect = () => {
    const { selectedCommand } = this.props

    if (['visionFind', 'visualSearch', 'visualAssert', 'visualVerify', 'XClick', 'XMove'].indexOf(selectedCommand.cmd) !== -1) {
      return csIpc.ask('PANEL_SELECT_AREA_ON_CURRENT_PAGE')
      .then(res => {
        this.props.updateSelectedCommand({ target: res.fileName })
        message.success(`Saved vision as ${res.fileName}`)
      })
      .catch(e => {
        message.error(e.message)
      })
    }

    if (this.props.status === C.APP_STATUS.INSPECTOR) {
      this.props.stopInspecting()
    } else {
      this.props.startInspecting()
    }
  }

  // Note: virtual-list eats up double click events. so have to manually track click event instead
  onDoubleClick = (() => {
    let lastScreenX
    let lastScreenY
    let lastTime

    return (e) => {
      const go = () => {
        const $row = inspector.parentWithClass('real-command', e.target)
        if (!$row) return

        const index = parseInt($row.getAttribute('data-index'))
        if (isNaN(index)) return

        this.playLine(index)
      }

      const now = new Date() * 1

      if (lastScreenX === e.screenX && lastScreenY === e.screenY && now - lastTime < 300) {
        go()
      }

      lastScreenX = e.screenX
      lastScreenY = e.screenY
      lastTime    = now
    }
  })()

  scheduleHideVisionFindPreview = () => {
    log('scheduleHideVisionFindPreview')
    const { timer } = this.state.visionFindPreview

    clearTimeout(timer)

    return setTimeout(() => {
      const { visible } = this.state.visionFindPreview

      if (visible) {
        log('to hide preview')

        this.setState({
          visionFindPreview: {
            visible: false
          }
        })
      }
    }, 3000)
  }

  onMouseEnterTarget = (e, command) => {
    log('onMouseOverTarget')
    if (['visionFind', 'visualSearch', 'visualAssert', 'visualVerify', 'XClick', 'XMove'].indexOf(command.cmd) === -1) return
    if (['XClick', 'XMove'].indexOf(command.cmd) !== -1 && !/\.png/i.test(command.target))  return
    if (this.state.visionFindPreview.visible) return

    clearTimeout(this.state.visionFindPreview.timer)

    const visionStorage = getStorageManager().getVisionStorage()
    const rect    = e.target.getBoundingClientRect()
    const file    = command.target.trim().split('@')[0]
    const common  = {
      visible:  true,
      left:     rect.left,
      top:      rect.top + rect.height
    }

    visionStorage.exists(file)
    .then(existed => {
      if (!existed) {
        return this.setState({
          visionFindPreview: {
            ...common,
            url: './img/not_found.png',
            timer: this.scheduleHideVisionFindPreview()
          }
        })
      }

      return visionStorage.getLink(file)
      .then(link => {
        return this.setState({
          visionFindPreview: {
            ...common,
            url: link,
            timer: this.scheduleHideVisionFindPreview()
          }
        })
      })
    })
  }

  onMouseLeaveTarget = (e, command) => {
    log('onMouseOutTarget')
    if (['visionFind', 'visualSearch', 'visualAssert', 'visualVerify', 'XClick', 'XMove'].indexOf(command.cmd) === -1) return
    if (['XClick', 'XMove'].indexOf(command.cmd) !== -1 && !/\.png/i.test(command.target))  return
    if (!this.state.visionFindPreview.visible) return

    clearTimeout(this.state.visionFindPreview.timer)

    this.setState({
      visionFindPreview: {
        visible: false
      }
    })
  }

  jumpToSourceCode = (commandIndex) => {
    this.props.setEditorActiveTab('source_view')
    setTimeout(() => {
      const instance  = this.state.cmEdtiorInstance
      const line      = 3 + commandIndex * 5
      const endLine   = line + 5
      const ch        = 0

      const $tab      = document.querySelector('.source-view')
      const tabHeight = parseInt(window.getComputedStyle($tab).height, 10)
      const margin    = (tabHeight - 60) / 2

      log('margin', margin, tabHeight)
      instance.scrollIntoView({ line, ch }, margin)
      instance.setSelection(
        { ch, line },
        { ch, line: endLine },
        { scroll: false }
      )
    }, 100)
  }

  commandClassName = (record, index) => {
    const { editing, player } = this.props
    const { nextCommandIndex, errorCommandIndices, doneCommandIndices, breakpointIndices } = player
    const { commands }  = editing
    const classNames    = []

    if (breakpointIndices.indexOf(index) !== -1) {
      classNames.push('breakpoint-command')
    }

    if (record.cmd === 'comment') {
      classNames.push('comment-command')
    }

    if (index === editing.meta.selectedIndex) {
      classNames.push('selected-command')
    } else if (index === nextCommandIndex) {
      classNames.push('running-command')
    } else if (errorCommandIndices.indexOf(index) !== -1) {
      classNames.push('error-command')
    } else if (doneCommandIndices.indexOf(index) !== -1) {
      classNames.push('done-command')
    }

    return classNames.join(' ')
  }

  needVirtualList = () => {
    const { commands = [] } = this.props.editing
    const threshold = 0

    return commands.length >= threshold
  }

  virtualCommmandList = ({ virtual, itemHeight }) => {
    const { commands }  = this.props.editing
    const editable      = this.isPlayerStopped()
    const renderItem    = (item) => {
      if (item.header) {
        return (
          <div className="command-row header-row" key="header">
            <div className="row-col command-col">
              Command
            </div>
            <div className="row-col target-col">
              Target
            </div>
            <div className="row-col value-col">
              Value
            </div>
            <div className="row-col op-col">
              Ops
            </div>
          </div>
        )
      }

      if (item.footer) {
        return (
          <div className="command-row footer-row" key="footer" onClick={() => this.props.insertCommand(newCommand, commands.length)}>
            Add
          </div>
        )
      }

      return (
        <div
          key={item.key}
          style={{ height: itemHeight + 'px' }}
          className={`command-row real-command ` + this.commandClassName(item, item.realIndex)}
          data-index={'' + item.realIndex}
          onClick={() => this.props.selectCommand(item.realIndex)}
          onContextMenu={e => this.onContextMenu(e, item.realIndex)}
        >
          <div className="row-col command-col" title={item.cmd}>
            {item.cmd}
          </div>
          <div
            className="row-col target-col"
            title={item.target}
            onMouseEnter={(e) => this.onMouseEnterTarget(e, item)}
            onMouseLeave={(e) => this.onMouseLeaveTarget(e, item)}
          >
            {item.target}
          </div>
          <div className="row-col value-col" title={item.value}>
            {item.value}
          </div>
          <div className="row-col op-col">
            <Button
              disabled={!editable}
              shape="circle"
              onClick={(e) => { this.props.removeCommand(item.realIndex); e.stopPropagation() }}
            >
              <Icon type="minus" />
            </Button>
            <Button
              disabled={!editable}
              shape="circle"
              onClick={(e) => { this.props.duplicateCommand(item.realIndex); e.stopPropagation() }}
            >
              <Icon type="plus" />
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div style={virtual.style}>
        {virtual.items.map(renderItem)}
      </div>
    )
  }

  componentDidMount () {
    document.addEventListener('click', this.onHideMenu)
    document.addEventListener('click', this.onDoubleClick)
  }

  componentWillReceiveProps (nextProps) {
    // Note: update sourceText whenever editing changed
    if (nextProps.editing.meta.src !== this.props.editing.meta.src ||
        nextProps.editing.commands !== this.props.editing.commands) {
      const resetCursor = nextProps.editing.meta.src !== this.props.editing.meta.src

      this.setState(
        this.resetSourceCodeCursor(resetCursor)
      )
    }

    if (nextProps.status === C.APP_STATUS.PLAYER &&
        nextProps.player.nextCommandIndex !== this.props.player.nextCommandIndex) {
      const $tableBody = document.querySelector('.table-wrapper')
      const itemHeight = 45

      if (!$tableBody) return

      $tableBody.scrollTop = itemHeight * nextProps.player.nextCommandIndex
    }

    if (nextProps.status === C.APP_STATUS.RECORDER &&
        nextProps.editing.commands.length > this.props.editing.commands.length) {
      const $tableBody = document.querySelector('.table-wrapper')
      const itemHeight = 45

      if (!$tableBody) return

      setTimeout(
        () => { $tableBody.scrollTop = itemHeight * nextProps.editing.commands.length * 2 },
        100
      )
    }
  }

  isPlayerStopped () {
    return this.props.player.status === C.PLAYER_STATUS.STOPPED
  }

  onContextMenu = (e, index) => {
    log('onContextMenu')

    this.setState({
      contextMenu: {
        x: e.clientX,
        y: e.clientY,
        isShown: true,
        commandIndex: index
      }
    })

    this.props.selectCommand(index, true)
    e.preventDefault()
    e.stopPropagation()
  }

  onHideMenu = (e) => {
    if (e.button !== 0) return

    this.setState({
      contextMenu: {
        ...this.state.contextMenu,
        isShown: false
      }
    })
  }

  getTestCaseName = () => {
    const { src } = this.props.editing.meta
    return src && src.name && src.name.length ? src.name : 'Untitled'
  }

  playLine = (commandIndex, extraOptions = {}) => {
    const { commands }  = this.props.editing
    const { src }       = this.props.editing.meta

    this.setState({ lastOperation: 'play' })

    return this.props.playerPlay({
      title: this.getTestCaseName(),
      extra: {
        id: src && src.id
      },
      mode: Player.C.MODE.SINGLE,
      startIndex: commandIndex,
      startUrl: null,
      resources: commands,
      postDelay: this.props.config.playCommandInterval * 1000,
      ...extraOptions
    })
  }

  renderVisionFindPreview () {
    const { visible, url, left, top } = this.state.visionFindPreview
    if (!visible) return null

    return (
      <div style={{
        position: 'absolute',
        width: '100px',
        height: '100px',
        border: '1px solid #ccc',
        left: left + 'px',
        top: top + 'px',
        backgroundColor: '#eee',
        backgroundImage: `url(${url})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      }}>
      </div>
    )
  }

  renderContextMenu () {
    const { clipboard }   = this.props
    const { contextMenu } = this.state
    const dw  = document.documentElement.clientWidth
    const dh  = document.documentElement.clientHeight
    const mw  = 240
    let x     = contextMenu.x + window.scrollX
    let y     = contextMenu.y + window.scrollY

    if (x + mw > dw)   x -= mw

    const style = {
      position: 'absolute',
      top: y,
      left: x,
      display: contextMenu.isShown ? 'block' : 'none'
    }

    const menuStyle = {
      width: mw + 'px'
    }

    const { commandIndex }      = contextMenu
    const { breakpointIndices } = this.props.player
    const isBreakpoint          = breakpointIndices.indexOf(commandIndex)

    const handleClick = (e) => {
      switch (e.key) {
        case 'cut':
          return this.props.cutCommand(commandIndex)
        case 'copy':
          return this.props.copyCommand(commandIndex)
        case 'paste':
          return this.props.pasteCommand(commandIndex)
        case 'insert':
          return this.props.insertCommand(newCommand, commandIndex + 1)
        case 'run_line': {
          return this.playLine(commandIndex)
        }
        case 'run_from_here': {
          const { commands }  = this.props.editing
          const { src }       = this.props.editing.meta

          this.setState({ lastOperation: 'play' })

          return this.props.playerPlay({
            title: this.getTestCaseName(),
            extra: {
              id: src && src.id
            },
            mode: Player.C.MODE.STRAIGHT,
            startIndex: commandIndex,
            startUrl: null,
            resources: commands,
            postDelay: this.props.config.playCommandInterval * 1000
          })
        }
        case 'add_breakpoint': {
          return this.props.addBreakpoint(commandIndex)
        }
        case 'remove_breakpoint': {
          return this.props.removeBreakpoint(commandIndex)
        }
        case 'jump_to_source_code': {
          return this.jumpToSourceCode(commandIndex)
        }
      }
    }

    return (
      <div style={style} id="context_menu">
        <Menu onClick={handleClick} style={menuStyle} mode="vertical" selectable={false}>
          <Menu.Item key="cut">Cut</Menu.Item>
          <Menu.Item key="copy">Copy</Menu.Item>
          <Menu.Item key="paste" disabled={clipboard.commands.length === 0}>Paste</Menu.Item>
          <Menu.Divider />
          <Menu.Item key="insert">Insert new line</Menu.Item>
          <Menu.Divider />
          <Menu.Item key="jump_to_source_code">Jump to source code</Menu.Item>
          <Menu.Item key={isBreakpoint ? 'add_breakpoint' : 'remove_breakpoint'}>
            {isBreakpoint ? 'Add breakpoint' : 'Remove breakpoint'}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item key="run_line">Execute this command</Menu.Item>
          <Menu.Item key="run_from_here">Run from here</Menu.Item>
        </Menu>
      </div>
    )
  }

  renderTable () {
    const { editing, player } = this.props
    const { commands }  = editing
    const dataSource = (commands && commands.length ? commands : defaultDataSource)
                            .map((command, i) => ({
                              ...command,
                              key: Math.random(),
                              realIndex: i
                            }))

    return this.needVirtualList() ? this.renderVirtualTable(dataSource) : this.renderNormalTable(dataSource)
  }

  renderVirtualTable (dataSource) {
    const CommandVirtualList = VirtualList({ container: this.listContainer })(this.virtualCommmandList);
    const paddedDataSource = [
      { header: true },
      ...dataSource,
      { footer: true }
    ]

    return (
      <div className="t-body">
        {!this.listContainer ? null : (
          <CommandVirtualList itemHeight={45} items={paddedDataSource} />
        )}
      </div>
    )
  }

  renderNormalTable (dataSource) {
    const { editing, player } = this.props
    const { nextCommandIndex, errorCommandIndices, doneCommandIndices } = player
    const { commands }  = editing
    const editable      = this.isPlayerStopped()

    const columns = [
      { title: 'Command',  dataIndex: 'cmd',      key: 'cmd',     width: 130 },
      { title: 'Target',   dataIndex: 'target',   key: 'target',  width: 190 },
      { title: 'Value',    dataIndex: 'value',    key: 'value' },
      {
        title: 'Ops',
        key: 'ops',
        width: 80,
        render: (text, record, index) => {
          return (
            <div>
              <Button
                disabled={!editable}
                shape="circle"
                onClick={(e) => { this.props.removeCommand(index); e.stopPropagation() }}
              >
                <Icon type="minus" />
              </Button>
              <Button
                disabled={!editable}
                shape="circle"
                onClick={(e) => { this.props.duplicateCommand(index); e.stopPropagation() }}
              >
                <Icon type="plus" />
              </Button>
            </div>
          )
        }
      }
    ]

    const tableConfig = {
      dataSource,
      columns,
      pagination: false,
      footer: () => (
        <div className="table-footer" onClick={(e) => {
          this.props.insertCommand(newCommand, commands.length)
        }}>
          Add
        </div>
      ),
      onRowClick: (record, index, e) => {
        this.props.selectCommand(index)
      },
      rowClassName: this.commandClassName
    }

    return <Table {...tableConfig} />
  }

  render () {
    const { status, editing }   = this.props
    const { commands, meta }    = editing
    const { selectedIndex }     = meta

    const isPlayerStopped = this.isPlayerStopped()
    const dataSource    = commands && commands.length ? commands : defaultDataSource
    const selectedCmd   = dataSource[selectedIndex]
    const isCmdEditable = isPlayerStopped && !!selectedCmd
    const isInspecting  = status === C.APP_STATUS.INSPECTOR

    const selectedCmdIsVisualSearch = selectedCmd && ['visionFind', 'visualSearch', 'visualAssert', 'visualVerify', 'XClick', 'XMove'].indexOf(selectedCmd.cmd) !== -1

    return (
      <div className="editor-wrapper">
        <Tabs
          type="card"
          className="commands-view"
          activeKey={this.props.editor.activeTab}
          onChange={this.onChangeCommandsView}
        >
          <Tabs.TabPane tab="Table View" key="table_view">
            <div className="form-group table-wrapper" style={{ marginBottom: 0 }} ref={ref => { this.listContainer = ref }}>
              {this.renderTable()}
            </div>

            <div className="form-group fields-wrapper" style={{ marginBottom: 0 }}>
              <Form>
                <Form.Item label="Command" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                  <div className="flex-row">
                    <Select
                      showSearch
                      optionFilterProp="children"
                      placeholder="command"
                      disabled={!isCmdEditable}
                      value={selectedCmd && selectedCmd.cmd}
                      onChange={(value) => this.onDetailChange('cmd', value)}
                      filterOption={(input, {key}) => key.toLowerCase().indexOf(input.toLowerCase()) === 0}
                      style={{ flex: 1, maxWidth: '60%', marginRight: '10px' }}
                      size="default"
                    >
                      {availableCommands.map(cmd => (
                        <Select.Option value={cmd} key={cmd}>
                          {cmd}
                        </Select.Option>
                      ))}
                    </Select>
                    {selectedCmd && selectedCmd.cmd ? (
                      <a href={`https://a9t9.com/x/idehelp?cmd=${selectedCmd.cmd.toLowerCase()}`} target="_blank">
                        Info for this command
                      </a>
                    ) : null}
                  </div>
                </Form.Item>
                <Form.Item label="Target" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                  <div className="flex-row">
                    {!selectedCmd || !selectedCmd.targetOptions ||
                      !selectedCmd.targetOptions.length ? (
                      <Input
                        style={{ flex: 1, maxWidth: '60%', marginRight: '10px' }}
                        placeholder="target"
                        disabled={!isCmdEditable}
                        value={selectedCmd && selectedCmd.target}
                        onChange={(e) => this.onDetailChange('target', e.target.value)}
                        size="default"
                      />
                    ) : (
                      <Select
                        style={{ flex: 1, maxWidth: '60%', marginRight: '10px' }}
                        placeholder="target"
                        disabled={!isCmdEditable}
                        value={selectedCmd.target}
                        onChange={(val) => this.onDetailChange('target', val)}
                        size="default"
                      >
                        {selectedCmd.targetOptions.map(option => (
                          <Select.Option
                            key={option}
                            value={option}
                          >
                            {option}
                          </Select.Option>
                        ))}
                      </Select>
                    )}
                    <Button
                      style={{ marginRight: '10px' }}
                      disabled={!isCmdEditable}
                      onClick={this.onToggleInspect}
                    >
                      {isInspecting
                        ? (<span>{(selectedCmdIsVisualSearch ? '👁' : '') + 'Cancel'}</span>)
                        : (<span>{(selectedCmdIsVisualSearch ? '👁' : '') + 'Select'}</span>)
                      }
                    </Button>
                    <Button
                      disabled={!isCmdEditable}
                      onClick={this.onClickFind}
                    >
                      {(selectedCmdIsVisualSearch ? '👁' : '') + 'Find'}
                    </Button>
                  </div>
                </Form.Item>
                <Form.Item label="Value" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} style={{ marginBottom: 0 }}>
                  <Input
                    disabled={!isCmdEditable}
                    value={selectedCmd && selectedCmd.value}
                    onChange={(e) => this.onDetailChange('value', e.target.value)}
                    style={{ width: '100%' }}
                    placeholder="value"
                    size="default"
                  />
                </Form.Item>
              </Form>
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Source View (JSON)" key="source_view" className="source-view">
            <pre className="source-error">{this.props.sourceErrMsg}</pre>
            {/*
              Note: have to use UnControlled CodeMirror, and thus have to use two state :
                    sourceText and sourceTextModified
            */}
            <CodeMirror
              ref={el => { this.codeMirror = el }}
              className={this.props.sourceErrMsg ? 'has-error' : 'no-error'}
              value={this.props.sourceText}
              onChange={this.onChangeEditSource}
              onBlur={this.onSourceBlur}
              onCursor={(editor, data) => {
                this.setState({ cmEdtiorInstance: editor })
                // Note: when value updated, code mirror will automatically emit onCursor with cursor at bottom
                // It can be tell with `sticky` as null
                if (data.sticky) {
                  this.setState({ cursor: { line: data.line, ch: data.ch } })
                }
              }}
              options={{
                mode: { name: 'javascript', json: true },
                lineNumbers: true,
                matchBrackets: true,
                autoCloseBrackets: true
              }}
            />
          </Tabs.TabPane>
        </Tabs>

        {this.renderContextMenu()}
        {this.renderVisionFindPreview()}
      </div>
    )
  }
}

export default connect(
  state => ({
    status: state.status,
    editor: state.editor,
    editing: state.editor.editing,
    clipboard: state.editor.clipboard,
    player: state.player,
    config: state.config,
    sourceErrMsg: state.editor.editingSource.error,
    sourceText: state.editor.editingSource.pure,
    sourceTextModified: state.editor.editingSource.current,
    selectedCommand: editorSelectedCommand(state)
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(DashboardEditor)
