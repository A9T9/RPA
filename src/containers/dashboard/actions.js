import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators }  from 'redux'
import {
  Button, Dropdown, Menu, Input, Icon, Table, Checkbox,
  Form, Select, Modal, message, Row, Col, Tabs
} from 'antd'
import FileSaver from 'file-saver'
import JSZip from 'jszip'

import { getPlayer } from '../../common/player'
import * as actions from '../../actions'
import * as C from '../../common/constant'
import {
  toJSONString,
  toJSONDataUri,
  toHtmlDataUri,
  fromHtml,
  fromJSONString
} from '../../common/convert_utils'

class DashboardActions extends React.Component {
  state = {
    htmlUri: null,
    jsonUri: null,

    sourceText: '',
    sourceErrMsg: null,

    showDuplicate: false,
    duplicateName: '',

    showReplaySettings: false,

    showPlayLoops: false,
    loopsStart: 1,
    loopsEnd: 3,

    showEnterFileName: false,
    saveAsName: ''
  }

  getTestCaseName = () => {
    const { src } = this.props.editing.meta
    return src && src.name && src.name.length ? src.name : 'Untitled'
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

    if (toShow) {
      setTimeout(() => {
        const input = this.inputDuplicateTestCase.refs.input
        input.focus()
        input.selectionStart = input.selectionEnd = input.value.length;
      }, 100)
    }
  }

  toggleRenameModal = (toShow) => {
    this.setState({
      showRename: toShow
    })

    if (toShow) {
      setTimeout(() => {
        const input = this.inputRenameTestCase.refs.input
        input.focus()
        input.selectionStart = input.selectionEnd = input.value.length;
      }, 100)
    }
  }

  togglePlayLoopsModal = (toShow) => {
    this.setState({
      showPlayLoops: toShow
    })
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

  // Rename relative
  onClickRename = () => {
    this.props.renameTestCase(this.state.rename)
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

  // Play loops relative
  onClickPlayLoops = () => {
    const { loopsStart, loopsEnd } = this.state

    if (loopsStart < 0) {
      return message.error('Start value must be no less than zero', 1.5)
    }

    if (loopsEnd < loopsStart) {
      return message.error('Max value must be greater than start value', 1.5)
    }

    const player = getPlayer()
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
  // Modal relative above

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

  onClickSetting = (visible) => {
    if (!visible) {
      return this.setState({
        htmlUri: null,
        jsonUri: null
      })
    }

    const { commands, meta } = this.props.editing
    const { src }   = meta
    const toConvert = { commands, name: src ? src.name : 'Untitled' }
    const jsonUri   = toJSONDataUri(toConvert)
    const htmlUri   = toHtmlDataUri(toConvert)

    return this.setState({ htmlUri, jsonUri })
  }

  onClickMenuItem = ({ key }) => {
    switch (key) {
      case 'play_settings': {
        this.setState({ showReplaySettings: true })
        break
      }

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
          FileSaver.saveAs(blob, 'all_macros.zip');
        });
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
        .then(({ passCount, failCount, failTcs }) => {
          message.info(
            [
              `${passCount} test case${passCount > 1 ? 's' : ''} imported!`,
              `${failList.length + failCount} test case${(failList.length + failCount) > 1 ? 's' : ''} failed!`
            ].join(', '),
            3
          )

          failList.forEach(fail => {
            this.props.addLog('error', `in parsing ${fail.fileName}: ${fail.err.message}`)
          })

          failTcs.forEach(fail => {
            this.props.addLog('error', `duplicated test case name: ${fail.name}`)
          })
        })
    })
  }

  onFileChange = (e) => {
    // Note: clear file input, so that we can fire onFileChange when users selects the same file next time
    setTimeout(() => {
      this.fileInput.value = null
    }, 500)
    return this.onReadFile(fromHtml)(e)
  }

  onJSONFileChange = (e) => {
    return this.onReadFile(fromJSONString)(e)
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

  isPlayerStopped () {
    return this.props.player.status === C.PLAYER_STATUS.STOPPED
  }

  renderMainMenu () {
    const { htmlUri, jsonUri }  = this.state
    const { status, editing }   = this.props
    const { commands, meta }    = editing
    const { src }               = meta
    const canPlay               = this.props.player.status === C.PLAYER_STATUS.STOPPED
    const downloadNamePrefix    = src ? src.name : 'Untitled'

    return (
      <Menu onClick={this.onClickMenuItem} selectable={false}>
        <Menu.Item key="duplicate" disabled={!src}>Duplicate..</Menu.Item>
        <Menu.Item key="rename" disabled={!src}>Rename</Menu.Item>
        <Menu.Divider></Menu.Divider>

        <Menu.Item key="1">
          <a href={jsonUri} download={downloadNamePrefix + '.json'}>
            Export as JSON
          </a>
        </Menu.Item>
        <Menu.Item key="export_all_json">Export All (JSON)</Menu.Item>
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
            ref={ref => { this.fileInput = ref }}
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
        <Menu.Divider></Menu.Divider>

        <Menu.Item key="play_settings" disabled={!canPlay}>
          Replay settings..
        </Menu.Item>
      </Menu>
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
              const { commands } = self.props.editing
              const { src } = self.props.editing.meta
              const openTc  = commands.find(tc => tc.cmd.toLowerCase() === 'open')

              self.setState({ lastOperation: 'play' })

              self.props.playerPlay({
                title: self.getTestCaseName(),
                extra: {
                  id: src && src.id
                },
                mode: getPlayer().C.MODE.STRAIGHT,
                startIndex: 0,
                startUrl: openTc ? openTc.target : null,
                resources: commands,
                postDelay: self.props.config.playCommandInterval * 1000
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
      }
    }

    const playMenu = (
      <Menu onClick={onClickMenuItem} selectable={false}>
        <Menu.Item key="play_loop" disabled={!canPlay}>
          Play loop..
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
        title="Replay Settings"
        width={400}
        footer={null}
        visible={this.state.showReplaySettings}
        onCancel={() => this.setState({ showReplaySettings: false })}
      >
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
              value={this.props.config.playCommandInterval}
              onChange={val => onConfigChange('playCommandInterval', val)}
            >
              <Select.Option value={0}>
                Fast (no delay)
              </Select.Option>
              <Select.Option value={0.3}>
                Medium (0.3s delay)
              </Select.Option>
              <Select.Option value={2}>
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

          <Form.Item label="Record Settings" {...displayConfig}>
            <Checkbox
              onChange={(e) => onConfigChange('recordNotification', e.target.checked)}
              checked={this.props.config.recordNotification}
            >
              Record notifications
            </Checkbox>
          </Form.Item>
        </Form>
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

  renderDuplicateModal () {
    return (
      <Modal
        title="Duplicate Test Case.."
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
          placeholder="test case name"
          ref={el => { this.inputDuplicateTestCase = el }}
        />
      </Modal>
    )
  }

  renderRenameModal () {
    return (
      <Modal
        title="Rename the test case as.."
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
          placeholder="test case name"
          ref={el => { this.inputRenameTestCase = el }}
        />
      </Modal>
    )
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

  render () {
    const { status, editing }   = this.props
    const { meta }              = editing
    const { src, hasUnsaved }   = meta

    const isPlayerStopped = this.isPlayerStopped()
    const isRecording   = status === C.APP_STATUS.RECORDER

    const saveBtnState    = {
      text: src ? 'Save' : 'Save..',
      disabled: !hasUnsaved
    }

    return (
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
            <Dropdown overlay={isPlayerStopped ? this.renderMainMenu() : []} trigger={['click']} onVisibleChange={this.onClickSetting}>
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

        {this.renderSettingModal()}
        {this.renderDuplicateModal()}
        {this.renderSaveAsModal()}
        {this.renderRenameModal()}
        {this.renderPlayLoopModal()}
      </div>
    )
  }
}

export default connect(
  state => ({
    status: state.status,
    editing: state.editor.editing,
    testCases: state.editor.testCases,
    player: state.player,
    config: state.config
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(DashboardActions)
