import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { withRouter, Link } from 'react-router-dom'
import { Button, Checkbox, Dropdown, Menu, Icon, Modal, Row, Col, Form, Input, Select, Tabs, message } from 'antd'

import './header.scss'
import { getPlayer, Player } from '../common/player'
import * as actions from '../actions'
import * as C from '../common/constant'

class Header extends React.Component {
  state = {
    showPlayLoops: false,
    loopsStart: 1,
    loopsEnd: 3,

    showEnterFileName: false,
    saveAsName: '',

    showReplaySettings: false
  }

  getPlayer = () => {
    switch (this.props.player.mode) {
      case C.PLAYER_MODE.TEST_CASE:
        return getPlayer({ name: 'testCase' })

      case C.PLAYER_MODE.TEST_SUITE:
        return getPlayer({ name: 'testSuite' })
    }
  }

  changeTestCase = ({ key }) => {
    const { src, hasUnsaved } = this.props.editing.meta
    const go = () => {
      this.props.editTestCase(key)
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

  getTestCaseName = () => {
    const { src } = this.props.editing.meta
    return src && src.name && src.name.length ? src.name : 'Untitled'
  }

  togglePlayLoopsModal = (toShow) => {
    this.setState({
      showPlayLoops: toShow
    })
  }

  onToggleRecord = () => {
    if (this.props.status === C.APP_STATUS.RECORDER) {
      this.props.stopRecording()
      // Note: remove targetOptions from all commands
      this.props.normalizeCommands()
    } else {
      this.props.startRecording()
    }

    this.setState({ lastOperation: 'record' })
  }

  // Play loops relative
  onClickPlayLoops = () => {
    const { loopsStart, loopsEnd } = this.state

    if (loopsStart < 0) {
      return message.error('Start value must be no less than zero', 1.5)
    }

    if (loopsEnd < loopsStart) {
      return message.error('Max value must be greater than start value', 1.5)
    }

    const player = this.getPlayer()
    const { commands } = this.props.editing
    const { src } = this.props.editing.meta
    const openTc  = commands.find(tc => tc.cmd.toLowerCase() === 'open')

    this.props.playerPlay({
      loopsEnd,
      loopsStart,
      title: this.getTestCaseName(),
      extra: {
        id: src && src.id
      },
      mode: player.C.MODE.LOOP,
      startIndex: 0,
      startUrl: openTc ? openTc.target : null,
      resources: this.props.editing.commands,
      postDelay: this.props.config.playCommandInterval * 1000
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

  onChangePlayLoops = (field, value) => {
    this.setState({
      [field]: parseInt(value, 10)
    })
  }

  // Save as relative
  onClickSaveAs = () => {
    this.props.saveEditingAsNew(this.state.saveAsName)
      .then(() => {
        message.success('successfully saved!', 1.5)
        this.toggleSaveAsModal(false)
      })
      .catch((e) => {
        message.error(e.message, 1.5)
      })
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

    if (toShow) {
      setTimeout(() => {
        const input = this.inputSaveTestCase.refs.input
        input.focus()
        input.selectionStart = input.selectionEnd = input.value.length;
      }, 100)
    }
  }

  playCurrentMacro = () => {
    const { commands } = this.props.editing
    const { src } = this.props.editing.meta
    const openTc  = commands.find(tc => tc.cmd.toLowerCase() === 'open')

    this.setState({ lastOperation: 'play' })

    this.props.playerPlay({
      title: this.getTestCaseName(),
      extra: {
        id: src && src.id
      },
      mode: getPlayer().C.MODE.STRAIGHT,
      startIndex: 0,
      startUrl: openTc ? openTc.target : null,
      resources: commands,
      postDelay: this.props.config.playCommandInterval * 1000
    })
  }

  playCurrentLine = () => {
    const { commands }  = this.props.editing
    const { src, selectedIndex } = this.props.editing.meta
    const commandIndex = selectedIndex === -1 ? 0 : (selectedIndex || 0)

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
      callback: (err, res) => {
        if (err)  return

        // Note: auto select next command
        if (commandIndex + 1 < commands.length) {
          this.props.selectCommand(commandIndex + 1, true)
        }
      }
    })
  }

  componentDidMount () {
    const { history } = this.props

    this.props.setRoute(history.location.pathname)
    this.props.history.listen((location, action) => {
      this.props.setRoute(history.location.pathname)
    })
  }

  renderPlayLoopModal () {
    return (
      <Modal
        title="How many loops to play?"
        okText="Play"
        cancelText="Cancel"
        className="play-loop-modal"
        visible={this.state.showPlayLoops}
        onOk={this.onClickPlayLoops}
        onCancel={this.onCancelPlayLoops}
      >
        <Row>
          <Col span={10}>
            <Form.Item label="Start value">
              <Input
                type="number"
                min="0"
                value={this.state.loopsStart}
                onKeyDown={e => { if (e.keyCode === 13) this.onClickPlayLoops() }}
                onChange={e => this.onChangePlayLoops('loopsStart', e.target.value)}
              />
            </Form.Item>
          </Col>
          <Col span={10} offset={2}>
            <Form.Item label="Max">
              <Input
                type="number"
                min="0"
                value={this.state.loopsEnd}
                onKeyDown={e => { if (e.keyCode === 13) this.onClickPlayLoops() }}
                onChange={e => this.onChangePlayLoops('loopsEnd', e.target.value)}
              />
            </Form.Item>
          </Col>
        </Row>

        <p>
          The value of the loop counter is available in ${'{'}!LOOP{'}'} variable
        </p>
      </Modal>
    )
  }

  renderSaveAsModal () {
    return (
      <Modal
        title="Save test case as.."
        okText="Save"
        cancelText="Cancel"
        visible={this.state.showEnterFileName}
        onOk={this.onClickSaveAs}
        onCancel={this.onCancelSaveAs}
        className="save-modal"
      >
        <Input
          style={{ width: '100%' }}
          onKeyDown={e => { if (e.keyCode === 13) this.onClickSaveAs() }}
          onChange={this.onChangeSaveAsName}
          placeholder="test case name"
          ref={el => { this.inputSaveTestCase = el }}
        />
      </Modal>
    )
  }

  renderSettingModal () {
    const onConfigChange = (key, val) => {
      this.props.updateConfig({ [key]: val })
    }

    const displayConfig = {
      labelCol: { span: 8 },
      wrapperCol: { span : 16 }
    }

    return (
      <Modal
        title="Settings"
        className="settings-modal"
        width={500}
        footer={null}
        visible={this.state.showReplaySettings}
        onCancel={() => this.setState({ showReplaySettings: false })}
      >
        <Tabs>
          <Tabs.TabPane tab="Replay / Record" key="replay">
            <Form>
              <Form.Item label="Replay Helper" {...displayConfig}>
                <Checkbox
                  onChange={(e) => onConfigChange('playScrollElementsIntoView', e.target.checked)}
                  checked={this.props.config.playScrollElementsIntoView}
                >
                  Scroll elements into view during replay
                </Checkbox>

                <Checkbox
                  onChange={(e) => onConfigChange('playHighlightElements', e.target.checked)}
                  checked={this.props.config.playHighlightElements}
                >
                  Highlight elements during replay
                </Checkbox>
              </Form.Item>

              <Form.Item label="Command Interval" {...displayConfig}>
                <Select
                  style={{ width: '200px' }}
                  placeholder="interval"
                  value={'' + this.props.config.playCommandInterval}
                  onChange={val => onConfigChange('playCommandInterval', val)}
                >
                  <Select.Option value={'0'}>
                    Fast (no delay)
                  </Select.Option>
                  <Select.Option value={'0.3'}>
                    Medium (0.3s delay)
                  </Select.Option>
                  <Select.Option value={'2'}>
                    Slow (2s delay)
                  </Select.Option>
                </Select>
              </Form.Item>

              <Form.Item label="!TIMEOUT_PAGELOAD" {...displayConfig}>
                <Input
                  type="number"
                  min="0"
                  style={{ width: '200px' }}
                  value={this.props.config.timeoutPageLoad}
                  onChange={(e) => onConfigChange('timeoutPageLoad', e.target.value)}
                  placeholder="in seconds"
                />
              </Form.Item>

              <Form.Item label="!TIMEOUT_WAIT" {...displayConfig}>
                <Input
                  type="number"
                  min="0"
                  style={{ width: '200px' }}
                  value={this.props.config.timeoutElement}
                  onChange={(e) => onConfigChange('timeoutElement', e.target.value)}
                  placeholder="in seconds"
                />
              </Form.Item>

              <Form.Item label="!TIMEOUT_MACRO" {...displayConfig}>
                <Input
                  type="number"
                  min="0"
                  style={{ width: '200px' }}
                  value={this.props.config.timeoutMacro}
                  onChange={(e) => onConfigChange('timeoutMacro', e.target.value)}
                  placeholder="in seconds"
                />
              </Form.Item>

              <Form.Item label="Record Settings" {...displayConfig}>
                <Checkbox
                  onChange={(e) => onConfigChange('recordNotification', e.target.checked)}
                  checked={this.props.config.recordNotification}
                >
                  Record notifications
                </Checkbox>
              </Form.Item>
            </Form>
          </Tabs.TabPane>
          <Tabs.TabPane tab="General" key="backup" className="backup-pane">
            <h4>Automatic Backup</h4>
            <div className="row">
              <Checkbox
                onChange={(e) => onConfigChange('enableAutoBackup', e.target.checked)}
                checked={this.props.config.enableAutoBackup}
              />
              <span>Show backup reminder every</span>
              <Input
                type="number"
                min={1}
                disabled={!this.props.config.enableAutoBackup}
                value={this.props.config.autoBackupInterval}
                onChange={(e) => onConfigChange('autoBackupInterval', e.target.value)}
                style={{ width: '40px' }}
              />
              <span> days</span>
            </div>
            <div className="row">
                <p>Backup includes</p>
                <ul>
                  <li>
                    <Checkbox
                      onChange={(e) => onConfigChange('autoBackupTestCases', e.target.checked)}
                      checked={this.props.config.autoBackupTestCases}
                    />
                    <span>Test cases</span>
                  </li>
                  <li>
                    <Checkbox
                      onChange={(e) => onConfigChange('autoBackupTestSuites', e.target.checked)}
                      checked={this.props.config.autoBackupTestSuites}
                    />
                    <span>Test suites</span>
                  </li>
                  <li>
                    <Checkbox
                      onChange={(e) => onConfigChange('autoBackupScreenshots', e.target.checked)}
                      checked={this.props.config.autoBackupScreenshots}
                    />
                    <span>Screenshots</span>
                  </li>
                  <li>
                    <Checkbox
                      onChange={(e) => onConfigChange('autoBackupCSVFiles', e.target.checked)}
                      checked={this.props.config.autoBackupCSVFiles}
                    />
                    <span>CSV files</span>
                  </li>
                </ul>
            </div>
            <div className="row">
              <span>And you can also </span>
              <Button
                type="primary"
                onClick={() => this.props.runBackup()}
              >
                Run backup now
              </Button>
            </div>
          </Tabs.TabPane>
        </Tabs>
      </Modal>
    )
  }

  renderMainMenu () {
    const { htmlUri, jsonUri }  = this.state
    const { status, editing }   = this.props
    const { commands, meta }    = editing
    const { src }               = meta
    const canPlay               = this.props.player.status === C.PLAYER_STATUS.STOPPED
    const downloadNamePrefix    = src ? src.name : 'Untitled'

    const onClickMenuItem = ({ key }) => {
      switch (key) {
        case 'play_settings': {
          this.setState({ showReplaySettings: true })
          break
        }
      }
    }

    return (
      <Menu onClick={onClickMenuItem} selectable={false}>
        <Menu.Item key="play_settings" disabled={!canPlay}>
          Replay settings..
        </Menu.Item>
      </Menu>
    )
  }

  renderStatus () {
    const { status, player } = this.props
    const renderInner = () => {
      switch (status) {
        case C.APP_STATUS.RECORDER:
          return 'Recording'

        case C.APP_STATUS.PLAYER: {
          switch (player.status) {
            case C.PLAYER_STATUS.PLAYING: {
              const { nextCommandIndex, loops, currentLoop, timeoutStatus } = player

              if (nextCommandIndex === null ||
                  loops === null || currentLoop === 0) {
                return ''
              }

              const parts = [
                `Line ${nextCommandIndex + 1}`,
                `Round ${currentLoop}/${loops}`
              ]

              if (timeoutStatus && timeoutStatus.type && timeoutStatus.total) {
                const { type, total, past } = timeoutStatus
                parts.unshift(`${type} ${past / 1000}s (${total / 1000})`)
              }

              return parts.join(' | ')
            }

            case C.PLAYER_STATUS.PAUSED:
              return 'Player paused'

            default:
              return ''
          }
        }

        default:
          return ''
      }
    }

    return <div className="status">{renderInner()}</div>
  }

  renderActions () {
    const { testCases, editing, player, status } = this.props

    const onClickMenuItem = ({key}) => {
      switch (key) {
        case 'play_loop': {
          this.togglePlayLoopsModal(true)
          break
        }
      }
    }

    const playMenu = (
      <Menu onClick={onClickMenuItem} selectable={false}>
        <Menu.Item key="play_loop" disabled={false}>
          Play loop..
        </Menu.Item>
      </Menu>
    )

    if (status === C.APP_STATUS.RECORDER) {
      return (
        <div className="actions">
          <Button
            onClick={this.onToggleRecord}
            style={{ color: '#ff0000' }}
          >
            <span>Stop Record</span>
          </Button>
        </div>
      )
    }

    switch (player.status) {
      case C.PLAYER_STATUS.PLAYING: {
        return (
          <div className="actions">
            <Button.Group>
              <Button onClick={() => this.getPlayer().stop()}>
                <span>Stop</span>
              </Button>
              <Button onClick={() => this.getPlayer().pause()}>
                <span>Pause</span>
              </Button>
            </Button.Group>
          </div>
        )
      }

      case C.PLAYER_STATUS.PAUSED: {
        return (
          <div className="actions">
            <Button.Group>
              <Button onClick={() => this.getPlayer().stop()}>
                <span>Stop</span>
              </Button>
              <Button onClick={() => this.getPlayer().resume()}>
                <span>Resume</span>
              </Button>
            </Button.Group>
          </div>
        )
      }

      case C.PLAYER_STATUS.STOPPED: {
        return (
          <div className="actions">
            <Button
              onClick={this.onToggleRecord}
            >
              <span>Record</span>
            </Button>

            <Button.Group className="play-actions">
              <Button onClick={this.playCurrentLine}>Step</Button>
              <Dropdown.Button onClick={this.playCurrentMacro} overlay={playMenu}>
                <span>Play Macro</span>
              </Dropdown.Button>
            </Button.Group>

            <Button shape="circle" onClick={() => this.setState({ showReplaySettings: true })}>
              <Icon type="setting" />
            </Button>
          </div>
        )
      }
    }
  }

  renderMacro () {
    const { testCases, editing, player } = this.props
    const { src, hasUnsaved } = editing.meta
    const isPlayerStopped = player.status === C.PLAYER_STATUS.STOPPED
    const klass = hasUnsaved ? 'unsaved' : ''

    const saveBtnState    = {
      text: src ? 'Save' : 'Save..',
      disabled: !hasUnsaved
    }

    return (
      <div className="select-case">
        <span className={'test-case-name ' + klass}>{src ? src.name : 'Untitled'}</span>

        {!isPlayerStopped ? null : (
          <Button disabled={saveBtnState.disabled} onClick={this.onClickSave}>
            <span>{saveBtnState.text}</span>
          </Button>
        )}
      </div>
    )
  }

  render () {
    const { testCases, editing, player } = this.props
    const { src, hasUnsaved } = editing.meta
    const isPlayerStopped = player.status === C.PLAYER_STATUS.STOPPED
    const klass = hasUnsaved ? 'unsaved' : ''
    const getMenuKlass = (tc) => {
      return src && (src.id === tc.id) ? 'editing' : ''
    }

    testCases.sort((a, b) => {
      const nameA = a.name.toLowerCase()
      const nameB = b.name.toLowerCase()

      if (nameA < nameB) return -1
      if (nameA === nameB)  return 0
      return 1
    })

    const menu = (
      <Menu onClick={this.changeTestCase} selectable={false}>
        {testCases.map(tc => (
          <Menu.Item
            key={tc.id}
            disabled={!isPlayerStopped}
            className={getMenuKlass(tc)}
          >
            {tc.name}
          </Menu.Item>
        ))}
      </Menu>
    )

    return (
      <div className={'header ' + this.props.status.toLowerCase()}>
        {this.renderMacro()}
        {this.renderStatus()}
        {this.renderActions()}
        {this.renderPlayLoopModal()}
        {this.renderSaveAsModal()}
        {this.renderSettingModal()}
      </div>
    )
  }
}

export default connect(
  state => ({
    route: state.route,
    testCases: [...state.editor.testCases],
    editing: state.editor.editing,
    player: state.player,
    status: state.status,
    config: state.config
  }),
  dispatch  => bindActionCreators({...actions}, dispatch)
)(withRouter(Header))
