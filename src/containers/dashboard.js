import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators }  from 'redux'

import './dashboard.scss'
import * as C from '../common/constant'
import Ext from '../common/web_extension'
import csIpc from '../common/ipc/ipc_cs'
import { getPlayer } from '../common/player'
import inspector from '../common/inspector'
import * as actions from '../actions'
import {
  toJSONString,
  toJSONDataUri,
  toHtmlDataUri,
  fromHtml,
  fromJSONString
} from '../common/convert_utils'
import {
  Button, Dropdown, Menu, Input, Icon, Table,
  Form, Select, Modal, message
} from 'antd'

const availableCommands = [
  'open',
  'click',
  'clickAndWait',
  'select',
  'selectAndWait',
  'type',
  'pause',
  'waitForPageToLoad'
]

const newCommand = {
  cmd: '',
  target: '',
  value: ''
}

const defaultDataSource = [newCommand]

class Dashboard extends React.Component {
  state = {
    lastOperation: null,
    logFilter: 'All',

    showEditSource: false,
    sourceText: '',
    sourceErrMsg: null,

    showDuplicate: false,
    duplicateName: '',

    showPlayInterval: false,
    playInterval: 0,

    showPlayLoops: false,
    loopsToPlay: 2,

    showEnterFileName: false,
    saveAsName: '',
    htmlUri: null,
    jsonUri: null,
    contextMenu: {
      x: null,
      y: null,
      isShown: false
    }
  }

  getTestCaseName = () => {
    const { src } = this.props.editing.meta
    return src && src.name && src.name.length ? src.name : 'Untitled'
  }

  onClickFind = () => {
    const { lastOperation }   = this.state
    const { commands, meta }  = this.props.editing
    const { selectedIndex }   = meta
    const selectedCmd         = commands[selectedIndex]

    csIpc.ask('PANEL_HIGHLIGHT_DOM', {
      lastOperation,
      locator: selectedCmd.target
    })
    .catch(e => {
      message.error(e.message, 1.5)
    })
  }

  onToggleRecord = () => {
    if (this.props.status === C.APP_STATUS.RECORDER) {
      this.props.stopRecording()
    } else {
      this.props.startRecording()
    }

    this.setState({ lastOperation: 'record' })
  }

  onToggleInspect = () => {
    if (this.props.status === C.APP_STATUS.INSPECTOR) {
      this.props.stopInspecting()
    } else {
      this.props.startInspecting()
    }
  }

  onDetailChange = (key, value) => {
    this.props.updateSelectedCommand({[key]: value})
  }

  onChangeBaseUrl = (e) => {
    this.props.updateBaseUrl(e.target.value)
  }

  onClickNew = () => {
    const { src, hasUnsaved } = this.props.editing.meta
    const go = () => {
      this.props.editNewTestCase()
      return Promise.resolve()
    }

    if (hasUnsaved) {
      return Modal.confirm({
        title: 'Unsaved changes',
        content: 'Do you want to discard the unsaved changes?',
        okText: 'Discard',
        cancelText: 'Cancel',
        onOk: go,
        onCancel: () => {}
      })
    }

    go()
  }

  onClickSave = () => {
    const meta = this.props.editing.meta
    const { src, hasUnsaved } = meta

    if (!hasUnsaved)  return

    if (src) {
      this.props.saveEditingAsExisted()
        .then(() => {
          message.success('successfully saved!', 1.5)
        })
    } else {
      this.toggleSaveAsModal(true)
    }
  }

  toggleSaveAsModal = (toShow) => {
    this.setState({
      showEnterFileName: toShow
    })
  }

  onClickSaveAs = () => {
    this.props.saveEditingAsNew(this.state.saveAsName)
      .then(() => {
        message.success('successfully saved!', 1.5)
      })
    this.toggleSaveAsModal(false)
  }

  onCancelSaveAs = () => {
    this.toggleSaveAsModal(false)
    this.setState({
      saveAsName: null
    })
  }

  onChangeSaveAsName = (e) => {
    this.setState({
      saveAsName: e.target.value
    })
  }

  toggleDuplicateModal = (toShow) => {
    let duplicateName

    if (!toShow) {
      duplicateName = null
    } else {
      duplicateName = this.props.editing.meta.src
                        ? (this.props.editing.meta.src.name + '_new')
                        : ''
    }

    this.setState({
      showDuplicate: toShow,
      duplicateName
    })
  }

  onClickDuplicate = () => {
    this.props.duplicateTestCase(this.state.duplicateName)
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

  toggleEditSourceModal = (toShow) => {
    let sourceText

    if (!toShow) {
      sourceText = null
    } else {
      const { commands, baseUrl, meta } = this.props.editing
      const { src }   = meta
      const toConvert = { commands, baseUrl, name: src ? src.name : 'Untitled' }

      sourceText = toJSONString(toConvert)
    }

    this.setState({
      showEditSource: toShow,
      sourceErrMsg: null,
      sourceText
    })
  }

  onClickCancelSourceAndClose = () => {
    this.toggleEditSourceModal(false)
  }

  onClickSaveSource = () => {
    try {
      const { sourceText } = this.state
      const obj = fromJSONString(sourceText, 'untitled')

      this.setState({
        sourceErrMsg: null
      })

      this.props.setEditing({
        ...obj.data,
        meta: this.props.editing.meta
      })

      message.success('successfully saved the source')

      return true
    } catch (e) {
      console.error(e.stack)

      this.setState({
        sourceErrMsg: e.message
      })

      message.error('Failed to save the source')

      return false
    }
  }

  onClickSaveSourceAndClose = () => {
    if (this.onClickSaveSource()) {
      this.toggleEditSourceModal(false)
    }
  }

  onCancelEditSource = () => {
    this.toggleEditSourceModal(false)
  }

  onChangeEditSource = (e) => {
    this.setState({
      sourceText: e.target.value
    })
  }

  toggleRenameModal = (toShow) => {
    this.setState({
      showRename: toShow
    })
  }

  onClickRename = () => {
    this.props.renameTestCase(this.state.rename)
      .then(() => {
        message.success('successfully renamed!', 1.5)
      })
    this.toggleRenameModal(false)
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

  togglePlayLoopsModal = (toShow) => {
    this.setState({
      showPlayLoops: toShow
    })
  }

  onClickPlayLoops = () => {
    const player = getPlayer()
    const { commands, baseUrl } = this.props.editing
    const openTc  = commands.find(tc => tc.cmd.toLowerCase() === 'open')

    player.play({
      title: this.getTestCaseName(),
      mode: player.C.MODE.LOOP,
      loops: this.state.loopsToPlay,
      startIndex: 0,
      startUrl: openTc ? (baseUrl.replace(/\/$/, '') + openTc.target) : null,
      resources: this.props.editing.commands,
      postDelay: this.props.player.playInterval * 1000
    })

    this.setState({ lastOperation: 'play' })
    this.togglePlayLoopsModal(false)
  }

  onCancelPlayLoops = () => {
    this.togglePlayLoopsModal(false)
    this.setState({
      loopsToPlay: 2
    })
  }

  onChangePlayLoops = (e) => {
    this.setState({
      loopsToPlay: parseInt(e.target.value, 10)
    })
  }

  togglePlayIntervalModal = (toShow) => {
    this.setState({
      showPlayInterval: toShow,
      playInterval: this.props.player.playInterval
    })
  }

  onClickPlayInterval = () => {
    this.props.setPlayerState({ playInterval: this.state.playInterval })
    this.togglePlayIntervalModal(false)
  }

  onCancelPlayInterval = () => {
    this.togglePlayIntervalModal(false)
  }

  onChangePlayInterval = (e) => {
    this.setState({
      playInterval: parseInt(e.target.value, 10)
    })
  }

  onClickSetting = (visible) => {
    if (!visible) {
      return this.setState({
        htmlUri: null,
        jsonUri: null
      })
    }

    const { commands, baseUrl, meta } = this.props.editing
    const { src }   = meta
    const toConvert = { commands, baseUrl, name: src ? src.name : 'Untitled' }
    const jsonUri   = toJSONDataUri(toConvert)
    const htmlUri   = toHtmlDataUri(toConvert)

    return this.setState({ htmlUri, jsonUri })
  }

  onClickMenuItem = ({ key }) => {
    switch (key) {
      case 'rename': {
        const src = this.props.editing.meta.src
        if (!src) return

        this.setState({
          rename: src.name
        })
        this.toggleRenameModal(true)
        break
      }

      case 'delete': {
        const go = () => {
          return this.props.removeCurrentTestCase()
            .then(() => {
              message.success('successfully deleted!', 1.5)
            })
        }

        return Modal.confirm({
          title: 'Sure to delete?',
          content: 'Do you really want to delete this test case?',
          okText: 'Delete',
          cancelText: 'Cancel',
          onOk: go,
          onCancel: () => {}
        })
      }

      case 'duplicate': {
        return this.toggleDuplicateModal(true)
      }

      case 'edit_source': {
        return this.toggleEditSourceModal(true)
      }
    }
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
        .then(() => {
          message.info(
            [
              `${doneList.length} test case${doneList.length > 1 ? 's' : ''} imported!`,
              `${failList.length} test case${failList.length > 1 ? 's' : ''} failed!`
            ].join(', '),
            3
          )
        })

      failList.forEach(fail => {
        this.props.addLog('error', `in parsing ${fail.fileName}: ${fail.err.message}`)
      })
    })
  }

  onFileChange = (e) => {
    return this.onReadFile(fromHtml)(e)
  }

  onJSONFileChange = (e) => {
    return this.onReadFile(fromJSONString)(e)
  }

  componentDidMount () {
    this.bindIpcEvent()
    this.bindContextMenuEvent()
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.status === C.APP_STATUS.PLAYER &&
        nextProps.player.nextCommandIndex !== this.props.player.nextCommandIndex) {
      const $tableBody = document.querySelector('.ant-table-body')
      const itemHeight = 45

      if (!$tableBody) return

      $tableBody.scrollTop = itemHeight * (nextProps.player.nextCommandIndex - 1)
    }

    if (nextProps.status === C.APP_STATUS.RECORDER &&
        nextProps.editing.commands.length > this.props.editing.commands.length) {
      const $tableBody = document.querySelector('.ant-table-body')
      const itemHeight = 45

      if (!$tableBody) return

      setTimeout(
        () => { $tableBody.scrollTop = itemHeight * nextProps.editing.commands.length * 2 },
        100
      )
    }

    if (nextProps.logs.length !== this.props.logs.length) {
      const $logContent = document.querySelector('.log-content')
      const itemHeight  = 50

      if (!$logContent) return

      // Note: set scroll top to a number large enough so that it will scroll to bottom
      // setTimeout 100ms to ensure content has been rendered before scroll
      setTimeout(
        () => { $logContent.scrollTop = itemHeight * nextProps.logs.length * 2 },
        100
      )
    }
  }

  bindContextMenuEvent () {
    const $table        = document.querySelector('tbody.ant-table-tbody')
    const $menu         = document.getElementById('context_menu')
    const onContextMenu = (e) => {
      if (!inspector.inDom($table, e.target)) return

      const $tr   = inspector.parentWithTag('tr', e.target)
      const index = Array.from($table.children).findIndex($el => $el === $tr)
      if (index === -1) return

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
    }

    const onHideMenu = (e) => {
      this.setState({
        contextMenu: {
          ...this.state.contextMenu,
          isShown: false
        }
      })
    }

    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('click', onHideMenu)
  }

  bindIpcEvent () {
    csIpc.onAsk((cmd, args) => {
      switch (cmd) {
        case 'INSPECT_RESULT':
          this.props.doneInspecting()
          this.props.updateSelectedCommand({ target: args.xpath })
          return true
        case 'RECORD_ADD_COMMAND':
          console.log('got add command', cmd, args)
          this.props.appendCommand(args)
          return true
        case 'RECORD_BASE_URL':
          console.log('got base url command', cmd, args)
          this.props.setCommandBaseUrl(args.url)
          return true
        case 'TIMEOUT_STATUS':
          if (this.props.status !== C.APP_STATUS.PLAYER)  return false
          this.props.setPlayerState({
            timeoutStatus: args
          })
          return true
      }
    })
  }

  isPlayerStopped () {
    return this.props.player.status === C.PLAYER_STATUS.STOPPED
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

    const { commandIndex } = contextMenu
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
          const { commands }  = this.props.editing
          const player        = getPlayer()

          this.setState({ lastOperation: 'play' })

          return player.play({
            title: this.getTestCaseName(),
            mode: player.C.MODE.SINGLE,
            startIndex: commandIndex,
            startUrl: null,
            resources: commands,
            postDelay: this.props.player.playInterval * 1000
          })
        }
        case 'rune_from_here': {
          const { commands }  = this.props.editing
          const player        = getPlayer()

          this.setState({ lastOperation: 'play' })

          return player.play({
            title: this.getTestCaseName(),
            mode: player.C.MODE.STRAIGHT,
            startIndex: commandIndex,
            startUrl: null,
            resources: commands,
            postDelay: this.props.player.playInterval * 1000
          })
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
          <Menu.Item key="run_line">Execute this command</Menu.Item>
          <Menu.Item key="rune_from_here">Run from here</Menu.Item>
        </Menu>
      </div>
    )
  }

  renderPlayerBtns () {
    const self        = this
    const { player }  = this.props
    const { status }  = player

    const canPlay = status === C.PLAYER_STATUS.STOPPED
    const canStop = status !== C.PLAYER_STATUS.STOPPED
    const [btnText, btnHandler] = (function () {
      switch (status) {
        case C.PLAYER_STATUS.PLAYING:
          return [
            'Pause',
            () => getPlayer().pause()
          ]
        case C.PLAYER_STATUS.PAUSED:
          return [
            'Resume',
            () => getPlayer().resume()
          ]
        case C.PLAYER_STATUS.STOPPED:
          return [
            'Play',
            () => {
              const { commands, baseUrl } = self.props.editing
              const openTc  = commands.find(tc => tc.cmd.toLowerCase() === 'open')

              self.setState({ lastOperation: 'play' })

              getPlayer().play({
                title: self.getTestCaseName(),
                mode: getPlayer().C.MODE.STRAIGHT,
                startIndex: 0,
                startUrl: openTc ? (baseUrl.replace(/\/$/, '') + openTc.target) : null,
                resources: commands,
                postDelay: self.props.player.playInterval * 1000
              })
            }
          ]
      }
    })()

    const onClickMenuItem = ({key}) => {
      switch (key) {
        case 'play_loop': {
          this.togglePlayLoopsModal(true)
          break
        }
        case 'play_interval': {
          this.togglePlayIntervalModal(true)
          break
        }
      }
    }

    const playMenu = (
      <Menu onClick={onClickMenuItem} selectable={false}>
        <Menu.Item key="play_loop" disabled={!canPlay}>
          Play loop..
        </Menu.Item>
        <Menu.Item key="play_interval" disabled={!canPlay}>
          Set command interval..
        </Menu.Item>
      </Menu>
    )

    return (
      <Button.Group>
        <Button disabled={!canStop} onClick={() => getPlayer().stop()}>
          <span>Stop</span>
        </Button>
        <Dropdown.Button onClick={btnHandler} overlay={playMenu}>
          <span>{btnText}</span>
        </Dropdown.Button>
      </Button.Group>
    )
  }

  renderTable () {
    const { editing, player } = this.props
    const { nextCommandIndex, errorCommandIndex, doneCommandIndices } = player
    const { commands }  = editing
    const dataSource    = commands && commands.length ? commands : defaultDataSource
    const editable      = this.isPlayerStopped()

    const columns = [
      { title: 'Command',  dataIndex: 'cmd',      key: 'cmd',     width: 120 },
      { title: 'Target',   dataIndex: 'target',   key: 'target',  width: 200 },
      { title: 'Value',    dataIndex: 'value',    key: 'value' },
      {
        title: 'Ops',
        key: 'ops',
        width: 80,
        render: (text, record, index) => {
          return (
            <div>
              <Button disabled={!editable} shape="circle" onClick={() => this.props.removeCommand(index)}>
                <Icon type="minus" />
              </Button>
              <Button disabled={!editable} shape="circle" onClick={() => this.props.insertCommand(newCommand, index + 1)}>
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
      scroll: { y: 160 },
      onRowClick: (record, index, e) => {
        this.props.selectCommand(index)
      },
      rowClassName: (record, index) => {
        if (index === editing.meta.selectedIndex) {
          return 'selected-command'
        }

        if (index === errorCommandIndex) {
          return 'error-command'
        }

        if (index === nextCommandIndex) {
          return 'running-command'
        }

        if (doneCommandIndices.indexOf(index) !== -1) {
          return 'done-command'
        }

        return ''
      }
    }

    return <Table {...tableConfig} />
  }

  renderLogs () {
    const { logFilter } = this.state
    const filters = {
      'All':    () => true,
      'Info':   (item) => item.type === 'info',
      'Error':  (item) => item.type === 'error'
    }
    const logs = this.props.logs.filter(filters[logFilter])

    return (
      <div className="log-container">
        <div className="log-header">
          <div className="log-toolbox">
            <Select
              value={logFilter}
              onChange={(value) => this.setState({ logFilter: value })}
              style={{ width: '70px', marginRight: '10px' }}
            >
              <Select.Option value='All'>All</Select.Option>
              <Select.Option value='Info'>Info</Select.Option>
              <Select.Option value='Error'>Error</Select.Option>
            </Select>

            <Button onClick={this.props.clearLogs}>Clear</Button>
          </div>
          <h3>Log</h3>
        </div>
        <ul className="log-content">
          {logs.map(log => (
            <li className={log.type}>
              <span className="log-type">[{log.type}]</span>
              <pre className="log-detail">{log.text}</pre>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  render () {
    const { showEnterFileName, showRename, rename, htmlUri, jsonUri } = this.state
    const { status, editing }   = this.props

    const { commands, baseUrl, meta }         = editing
    const { selectedIndex, src, hasUnsaved }  = meta

    const isPlayerStopped = this.isPlayerStopped()
    const dataSource    = commands && commands.length ? commands : defaultDataSource
    const selectedCmd   = dataSource[selectedIndex]
    const isCmdEditable = isPlayerStopped && !!selectedCmd
    const isRecording   = status === C.APP_STATUS.RECORDER
    const isInspecting  = status === C.APP_STATUS.INSPECTOR

    const saveBtnState  = {
      text: src ? 'Save' : 'Save..',
      disabled: !hasUnsaved
    }

    const downloadNamePrefix = src ? src.name : 'Untitled'

    const menu = (
      <Menu onClick={this.onClickMenuItem} selectable={false}>
        <Menu.Item key="edit_source">Edit source..</Menu.Item>
        <Menu.Divider></Menu.Divider>

        <Menu.Item key="duplicate" disabled={!src}>Duplicate..</Menu.Item>
        <Menu.Item key="rename" disabled={!src}>Rename</Menu.Item>
        <Menu.Divider></Menu.Divider>

        <Menu.Item key="1">
          <a href={jsonUri} download={downloadNamePrefix + '.json'}>
            Export as JSON
          </a>
        </Menu.Item>
        <Menu.Item key="2">
          <a href={htmlUri} download={downloadNamePrefix + '.html'}>
            Export as HTML
          </a>
        </Menu.Item>
        <Menu.Item key="3">
          <label htmlFor="select_html_files">Import HTML</label>
          <input
            multiple
            type="file"
            accept=".html,.htm"
            id="select_html_files"
            onChange={this.onFileChange}
            style={{display: 'none'}}
          />
        </Menu.Item>
        <Menu.Item key="4">
          <label htmlFor="select_json_files">Import JSON</label>
          <input
            multiple
            type="file"
            accept=".json"
            id="select_json_files"
            onChange={this.onJSONFileChange}
            style={{display: 'none'}}
          />
        </Menu.Item>
        <Menu.Divider></Menu.Divider>

        <Menu.Item key="delete" disabled={!src}>Delete</Menu.Item>
      </Menu>
    )

    return (
      <div className="dashboard">
        <div className="toolbox form-group">
          <div className="global-ops">
            <Button.Group>
              <Button disabled={!isPlayerStopped} onClick={this.onClickNew}>
                <Icon type="file" />
                <span>New</span>
              </Button>
              <Button disabled={!isPlayerStopped && saveBtnState.disabled} onClick={this.onClickSave}>
                <span>{saveBtnState.text}</span>
              </Button>
              <Dropdown overlay={isPlayerStopped ? menu : []} trigger={['click']} onVisibleChange={this.onClickSetting}>
                <Button disabled={!isPlayerStopped}>
                  <Icon type="setting" />
                </Button>
              </Dropdown>
            </Button.Group>
          </div>

          <div className="record-ops">
            <Button
              disabled={!isPlayerStopped}
              onClick={this.onToggleRecord}
              style={isRecording ? { color: '#ff0000' } : {}}
            >
              <Icon type="file" />
              <span>Record</span>
            </Button>
          </div>

          <div className="play-ops">
            {this.renderPlayerBtns()}
          </div>

        </div>

        <div className="form-group">
          <Input
            disabled={!isPlayerStopped}
            addonBefore="Base URL"
            placeholder="url" size="large"
            value={baseUrl}
            onChange={this.onChangeBaseUrl}
            style={{ width: '100%' }}
          />
        </div>

        <div className="form-group">
          {this.renderTable()}
        </div>

        <div className="form-group">
          <Form>
            <Form.Item label="Command" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
              <Select
                placeholder="command"
                disabled={!isCmdEditable}
                value={selectedCmd && selectedCmd.cmd}
                onChange={(value) => this.onDetailChange('cmd', value)}
                style={{ width: '100%' }}
              >
                {availableCommands.map(cmd => (
                  <Select.Option value={cmd} key={cmd}>
                    {cmd}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="Target" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
              <div>
                <Input
                  style={{ width: '60%', marginRight: '10px' }}
                  placeholder="target"
                  disabled={!isCmdEditable}
                  value={selectedCmd && selectedCmd.target}
                  onChange={(e) => this.onDetailChange('target', e.target.value)}
                />
                <Button
                  style={{ marginRight: '10px' }}
                  disabled={!isCmdEditable}
                  onClick={this.onToggleInspect}
                >
                  {isInspecting ? (<span>Cancel</span>) : (<span>Select</span>)}
                </Button>
                <Button
                  disabled={!isCmdEditable}
                  onClick={this.onClickFind}
                >
                  Find
                </Button>
              </div>
            </Form.Item>
            <Form.Item label="Value" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
              <Input
                disabled={!isCmdEditable}
                value={selectedCmd && selectedCmd.value}
                onChange={(e) => this.onDetailChange('value', e.target.value)}
                style={{ width: '100%' }}
                placeholder="value"
              />
            </Form.Item>
          </Form>
        </div>

        {this.renderLogs()}

        <div className="online-help">
          <a href="https://a9t9.com/kantu/web-automation/chrome/#docs" target="_blank">Kantu for Chrome - Homepage & Docs</a>
        </div>

        <Modal
          title="Save test case as.."
          okText="Save"
          cancelText="Cancel"
          visible={showEnterFileName}
          onOk={this.onClickSaveAs}
          onCancel={this.onCancelSaveAs}
        >
          <Input
            style={{ width: '100%' }}
            onKeyDown={e => { if (e.keyCode === 13) this.onClickSaveAs() }}
            onChange={this.onChangeSaveAsName}
            placeholder="test case name"
          />
        </Modal>

        <Modal
          title="Duplicate Test Case.."
          okText="Save"
          cancelText="Cancel"
          visible={this.state.showDuplicate}
          onOk={this.onClickDuplicate}
          onCancel={this.onCancelDuplicate}
        >
          <Input
            style={{ width: '100%' }}
            value={this.state.duplicateName}
            onKeyDown={e => { if (e.keyCode === 13) this.onClickDuplicate() }}
            onChange={this.onChangeDuplicate}
            placeholder="test case name"
          />
        </Modal>

        <Modal
          title="Edit source.."
          visible={this.state.showEditSource}
          onCancel={this.onClickCancelSourceAndClose}
          footer={[
            <Button key="close" size="large" onClick={this.onClickCancelSourceAndClose}>Close</Button>,
            <Button key="save_close" size="large" type="primary" onClick={this.onClickSaveSourceAndClose}>Save &amp; Close</Button>,
            <Button key="save" size="large" type="primary" onClick={this.onClickSaveSource}>Save</Button>
          ]}
        >
          <pre className="source-error">{this.state.sourceErrMsg}</pre>
          <Input.TextArea
            style={{ width: '100%' }}
            rows="15"
            value={this.state.sourceText}
            onChange={this.onChangeEditSource}
          />
        </Modal>

        <Modal
          title="Rename the test case as.."
          okText="Save"
          cancelText="Cancel"
          visible={showRename}
          onOk={this.onClickRename}
          onCancel={this.onCancelRename}
        >
          <Input
            style={{ width: '100%' }}
            value={rename}
            onKeyDown={e => { if (e.keyCode === 13) this.onClickRename() }}
            onChange={this.onChangeRename}
            placeholder="test case name"
          />
        </Modal>

        <Modal
          title="How many loops to play?"
          okText="Play"
          cancelText="Cancel"
          visible={this.state.showPlayLoops}
          onOk={this.onClickPlayLoops}
          onCancel={this.onCancelPlayLoops}
        >
          <Input
            type="number"
            min="2"
            style={{ width: '100%' }}
            value={this.state.loopsToPlay}
            onKeyDown={e => { if (e.keyCode === 13) this.onClickPlayLoops() }}
            onChange={this.onChangePlayLoops}
            placeholder="# of loops"
          />
        </Modal>

        <Modal
          title="Delay between each command (in seconds)"
          okText="Confirm"
          cancelText="Cancel"
          visible={this.state.showPlayInterval}
          onOk={this.onClickPlayInterval}
          onCancel={this.onCancelPlayInterval}
        >
          <Input
            type="number"
            min="0"
            style={{ width: '100%' }}
            value={this.state.playInterval}
            onKeyDown={e => { if (e.keyCode === 13) this.onClickPlayInterval() }}
            onChange={this.onChangePlayInterval}
            placeholder="delay in seconds"
          />
        </Modal>

        {this.renderContextMenu()}
      </div>
    )
  }
}

export default connect(
  state => ({
    status: state.status,
    editing: state.editor.editing,
    clipboard: state.editor.clipboard,
    player: state.player,
    logs: state.logs
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(Dashboard)
