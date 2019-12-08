import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { withRouter, Link } from 'react-router-dom'
import { Button, Checkbox, Dropdown, Menu, Icon, Modal, Row, Col, Form, Radio, Input, Select, Tabs, message } from 'antd'

import './header.scss'
import { getPlayer, Player } from '../common/player'
import { hasUnsavedMacro } from '../recomputed'
import getSaveTestCase from './save_test_case'
import * as actions from '../actions'
import * as C from '../common/constant'
import { range, setIn, updateIn, compose } from '../common/utils'
import { getXFile } from '../services/xmodules/xfile'
import { getXUserIO } from '../services/xmodules/x_user_io'
import { XModuleTypes } from '../services/xmodules/common'
import { getStorageManager, StorageManagerEvent } from '../services/storage'
import Ext from '../common/web_extension'

class Header extends React.Component {
  state = {
    showPlayLoops: false,
    loopsStart: 1,
    loopsEnd: 3,
    xModules: [
      getXFile(),
      getXUserIO()
    ],
    xModuleData: {},
    xFileRootDirChanged: false
  }

  getPlayer = (name) => {
    if (name) return getPlayer({ name })

    switch (this.props.player.mode) {
      case C.PLAYER_MODE.TEST_CASE:
        return getPlayer({ name: 'testCase' })

      case C.PLAYER_MODE.TEST_SUITE:
        return getPlayer({ name: 'testSuite' })
    }
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

  onClickSave = () => {
    return getSaveTestCase().save()
  }

  playCurrentMacro = (isStep) => {
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
      postDelay: this.props.config.playCommandInterval * 1000,
      isStep: isStep
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

  componentWillReceiveProps (nextProps) {
    if (nextProps.ui.showSettings && !this.props.ui.showSettings) {
      this.onShowSettings()
    }
  }

  initXModules () {
    const xModules = this.state.xModules

    // versionInfo: {
    //  installed: boolean
    //  version: string
    // },
    // checkResult: {
    //  error: string | null
    // }
    Promise.all(
      xModules.map(mod => {
        return mod.getVersion()
        .then(versionInfo => {
          if (versionInfo.installed) {
            return mod.sanityCheck()
            .then(
              () => ({ error: null }),
              e => ({ error: e.message })
            )
            .then(checkResult => ({
              versionInfo,
              checkResult
            }))
          } else {
            return {
              versionInfo,
              checkResult: null
            }
          }
        })
      })
    )
    .then(results => {
      const xModuleData = results.reduce((prev, r, i) => {
        prev[xModules[i].getName()] = {
          ...r.versionInfo,
          checkResult:  r.checkResult,
          config:       xModules[i].getCachedConfig()
        }
        return prev
      }, {})

      this.setState({
        xModuleData,
        xFileRootDirChanged: false
      })
    })
  }

  onShowSettings () {
    this.initXModules()
  }

  showSettingsModal () {
    this.props.updateUI({ showSettings: true })
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
        width={650}
        footer={null}
        visible={this.props.ui.showSettings}
        onCancel={() => this.props.updateUI({ showSettings: false })}
      >
        <Tabs
          activeKey={this.props.ui.settingsTab || 'replay'}
          onChange={activeKey => this.props.updateUI({ settingsTab: activeKey })}
        >
          <Tabs.TabPane tab="Replay" key="replay">
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

              <Form.Item
                label={<a target="_blank" href="https://a9t9.com/x/idehelp?help=command_interval">Command Interval</a>}
                {...displayConfig}
              >
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

              <Form.Item
                label={<a target="_blank" href="https://a9t9.com/x/idehelp?help=timeout_pageload">!TIMEOUT_PAGELOAD</a>}
                {...displayConfig}
              >
                <Input
                  type="number"
                  min="0"
                  style={{ width: '70px' }}
                  value={this.props.config.timeoutPageLoad}
                  onChange={(e) => onConfigChange('timeoutPageLoad', e.target.value)}
                  placeholder="in seconds"
                />
                <span className="tip">
                  Max. time for new page load
                </span>
              </Form.Item>

              <Form.Item
                label={<a target="_blank" href="https://a9t9.com/x/idehelp?help=timeout_wait">!TIMEOUT_WAIT</a>}
                {...displayConfig}
              >
                <Input
                  type="number"
                  min="0"
                  style={{ width: '70px' }}
                  value={this.props.config.timeoutElement}
                  onChange={(e) => onConfigChange('timeoutElement', e.target.value)}
                  placeholder="in seconds"
                />
                <span className="tip">
                  Max. time per step
                </span>
              </Form.Item>

              <Form.Item
                label={<a target="_blank" href="https://a9t9.com/x/idehelp?help=timeout_macro">!TIMEOUT_MACRO</a>}
                {...displayConfig}
              >
                <Input
                  type="number"
                  min="0"
                  style={{ width: '70px' }}
                  value={this.props.config.timeoutMacro}
                  onChange={(e) => onConfigChange('timeoutMacro', e.target.value)}
                  placeholder="in seconds"
                />
                <span className="tip">
                  Max. overall macro runtime
                </span>
              </Form.Item>

              <Form.Item
                label={<a target="_blank" href="https://a9t9.com/x/idehelp?help=timeout_download">!TIMEOUT_DOWNLOAD</a>}
                {...displayConfig}
              >
                <Input
                  type="number"
                  min="0"
                  style={{ width: '70px' }}
                  value={this.props.config.timeoutDownload}
                  onChange={(e) => onConfigChange('timeoutDownload', e.target.value)}
                  placeholder="in seconds"
                />
                <span className="tip">
                  Max. allowed time for file
                </span>
              </Form.Item>

              <Form.Item label="If error happens in loop" {...displayConfig}>
                <Radio.Group
                  onChange={(e) => onConfigChange('onErrorInLoop', e.target.value)}
                  value={this.props.config.onErrorInLoop}
                >
                  <Radio value="continue_next_loop">Continue next loop</Radio>
                  <Radio value="stop">Stop</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item label="Default Vision Search Confidence" {...displayConfig}>
                <Select
                  style={{ width: '200px' }}
                  placeholder="interval"
                  value={'' + this.props.config.defaultVisionSearchConfidence}
                  onChange={val => onConfigChange('defaultVisionSearchConfidence', parseFloat(val))}
                >
                  {range(1, 11, 1).map(n => (
                    <Select.Option key={n} value={'' + (0.1 * n).toFixed(1)}>
                      {(0.1 * n).toFixed(1)}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label={<a target="_blank" href="https://a9t9.com/x/idehelp?help=cmdline">Allow Command Line</a>} {...displayConfig}>
                <Checkbox
                  onChange={(e) => onConfigChange('allowRunFromBookmark', e.target.checked)}
                  checked={this.props.config.allowRunFromBookmark}
                >
                  Run macro and test suite shortcuts from Javascript Bookmarklets
                </Checkbox>
                <Checkbox
                  onChange={(e) => onConfigChange('allowRunFromFileSchema', e.target.checked)}
                  checked={this.props.config.allowRunFromFileSchema}
                >
                  Run embedded macros from local files
                </Checkbox>
                <Checkbox
                  onChange={(e) => onConfigChange('allowRunFromHttpSchema', e.target.checked)}
                  checked={this.props.config.allowRunFromHttpSchema}
                >
                  Run embedded macros from public websites
                </Checkbox>

              </Form.Item>
            </Form>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Record" key="record" className="record-pane">
            <Form>
              <Form.Item label="Notification" {...displayConfig}>
                <Checkbox
                  onChange={(e) => onConfigChange('recordNotification', e.target.checked)}
                  checked={this.props.config.recordNotification}
                >
                  Show notifications when recording
                </Checkbox>
              </Form.Item>
              <Form.Item label="click / clickAt" {...displayConfig}>
                <Radio.Group
                  onChange={(e) => onConfigChange('recordClickType', e.target.value)}
                  value={this.props.config.recordClickType}
                >
                  <Radio value="click">Record click</Radio>
                  <Radio value="clickAt">Record clickAt</Radio>
                </Radio.Group>
              </Form.Item>
            </Form>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Backup" key="backup" className="backup-pane">
            <h4>Automatic Backup</h4>
            <p>The automatic backup reminder helps to you to regularly export macros and other data as ZIP archive - so you don't loose your macros when you uninstall Kantu by mistake. The ZIP archive does not include data that is already stored directly on hard drive with the XFileAcess module.</p>
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
                    <span>Macros</span>
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
                  <li>
                    <Checkbox
                      onChange={(e) => onConfigChange('autoBackupVisionImages', e.target.checked)}
                      checked={this.props.config.autoBackupVisionImages}
                    />
                    <span>Visual UI Test images</span>
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

          <Tabs.TabPane tab="Security" key="security" className="security-pane">
            <h4>Master password for Password Encryption</h4>
            <p>
              A master password is used to encrypt and decrypt all stored website passwords. The websites passwords are encrypted using strong encryption.&nbsp;&nbsp;
              <a target="_blank" href="https://a9t9.com/x/idehelp?help=encryption">More info &gt;&gt;</a>
            </p>
            <div>
              <Radio.Group
                onChange={(e) => onConfigChange('shouldEncryptPassword', e.target.value)}
                value={this.props.config.shouldEncryptPassword}
              >
                <Radio value="no">Do not encrypt passwords</Radio>
                <Radio value="master_password">Enter master password here to store it</Radio>
              </Radio.Group>

              {this.props.config.shouldEncryptPassword === 'master_password' ? (
                <div>
                  <label>Master password:</label>
                  <Input
                    type="password"
                    style={{ width: '200px' }}
                    value={this.props.config.masterPassword}
                    onChange={(e) => onConfigChange('masterPassword', e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane tab="XModules" key="xmodules" className="xmodules-pane">
            <div className="xmodule-item">
              <div className="xmodule-title">
                <span><b>FileAccess XModule</b> - Read and write to your hard drive</span>
                <a href={getXFile().infoLink()} target="_blank">More Info</a>
                <Button
                  type="primary"
                  onClick={() => {
                    getXFile().getVersion().then(data => {
                      const { installed, version } = data
                      const msg = installed ? (`Installed (v${version})`) : 'Not Installed'
                      message.info(`status updated: ${msg}`)

                      this.setState(
                        updateIn(
                          ['xModuleData', getXFile().getName()],
                          orig => ({ ...orig, ...data, config: getXFile().getCachedConfig() }),
                          this.state
                        )
                      )
                    })
                  }}
                >
                  Test it
                </Button>
              </div>

              <div className="xmodule-status">
                <label>Status:</label>

                {this.state.xModuleData[getXFile().getName()] && this.state.xModuleData[getXFile().getName()].installed ? (
                  <div className="status-box">
                    <span>Installed (v{this.state.xModuleData[getXFile().getName()].version})</span>
                    <a
                      target="_blank"
                      href={getXFile().checkUpdateLink(
                        this.state.xModuleData[getXFile().getName()] && this.state.xModuleData[getXFile().getName()].version,
                        Ext.runtime.getManifest().version
                      )}
                    >
                      Check for update
                    </a>
                  </div>
                ) : (
                  <div className="status-box">
                    <span>Not Installed</span>
                    <a href={getXFile().downloadLink()} target="_blank">Download it</a>
                  </div>
                )}
              </div>

              <div className="xmodule-settings">
                <h3>Settings</h3>
                <div className="xmodule-settings-item">
                  <div className="settings-detail">
                    <label>Home Folder</label>
                    <div className="settings-detail-content">
                      <Input
                        type="text"
                        value={getXFile().getCachedConfig().rootDir}
                        disabled={!(this.state.xModuleData[getXFile().getName()] && this.state.xModuleData[getXFile().getName()].installed)}
                        onChange={e => {
                          const rootDir = e.target.value

                          this.setState(
                            compose(
                              setIn(['xModuleData', getXFile().getName(), 'config', 'rootDir'], rootDir),
                              setIn(['xFileRootDirChanged'], true)
                            )(this.state)
                          )

                          getXFile().setConfig({ rootDir })
                        }}
                        onBlur={() => {
                          if (this.state.xFileRootDirChanged) {
                            this.setState({ xFileRootDirChanged: false })

                            getXFile()
                            .sanityCheck()
                            .then(
                              () => {
                                this.setState(
                                  setIn(
                                    ['xModuleData', getXFile().getName(), 'checkResult'],
                                    { error: null },
                                    this.state
                                  )
                                )

                                getStorageManager().emit(StorageManagerEvent.RootDirChanged)
                              },
                              e => {
                                this.setState(
                                  setIn(
                                    ['xModuleData', getXFile().getName(), 'checkResult'],
                                    { error: e.message },
                                    this.state
                                  )
                                )

                                this.props.updateUI({ showSettings: true, settingsTab: 'xmodules' })
                              }
                            )
                          }
                        }}
                      />

                      {this.state.xModuleData[getXFile().getName()] &&
                        this.state.xModuleData[getXFile().getName()].checkResult &&
                        this.state.xModuleData[getXFile().getName()].checkResult.error ? (
                        <div className="check-result">
                          {this.state.xModuleData[getXFile().getName()].checkResult.error}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="settings-desc">
                    In this folder, Kantu creates /macros, /images, /testsuites, /datasources
                  </div>
                </div>
              </div>
            </div>

            <div className="xmodule-item">
              <div className="xmodule-title">
                <span><b>RealUser XModule</b> - Click / Type / Drag with OS native events</span>
                <a href={getXUserIO().infoLink()} target="_blank">More Info</a>
                <Button
                  type="primary"
                  onClick={() => {
                    getXUserIO().getVersion().then(data => {
                      const { installed, version } = data
                      const msg = installed ? (`Installed (v${version})`) : 'Not Installed'
                      message.info(`status updated: ${msg}`)

                      this.setState(
                        updateIn(
                          ['xModuleData', getXUserIO().getName()],
                          orig => ({ ...orig, ...data, config: getXUserIO().getCachedConfig() }),
                          this.state
                        )
                      )
                    })
                  }}
                >
                  Test it
                </Button>
              </div>

              <div className="xmodule-status">
                <label>Status:</label>

                {this.state.xModuleData[getXUserIO().getName()] && this.state.xModuleData[getXUserIO().getName()].installed ? (
                  <div className="status-box">
                    <span>Installed (v{this.state.xModuleData[getXUserIO().getName()].version})</span>
                    <a
                      target="_blank"
                      href={getXUserIO().checkUpdateLink(
                        this.state.xModuleData[getXUserIO().getName()] && this.state.xModuleData[getXUserIO().getName()].version,
                        Ext.runtime.getManifest().version
                      )}
                    >
                      Check for update
                    </a>
                  </div>
                ) : (
                  <div className="status-box">
                    <span>Not Installed</span>
                    <a href={getXUserIO().downloadLink()} target="_blank">Download it</a>
                  </div>
                )}
              </div>
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
          this.showSettingsModal()
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
              <Button onClick={() => this.getPlayer('testCase').pause()}>
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
              {this.props.player.mode === C.PLAYER_MODE.TEST_CASE ? (
                <Button onClick={() => this.getPlayer('testCase').resume(true)}>Step</Button>
              ) : null}
              <Button onClick={() => this.getPlayer().stop()}>Stop</Button>
              <Button onClick={() => this.getPlayer('testCase').resume()}>Resume</Button>
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
              <Button onClick={() => this.playCurrentMacro(true)}>Step</Button>
              <Dropdown.Button onClick={() => this.playCurrentMacro(false)} overlay={playMenu}>
                <span>Play Macro</span>
              </Dropdown.Button>
            </Button.Group>

            <Button shape="circle" onClick={() => this.showSettingsModal()}>
              <Icon type="setting" />
            </Button>
          </div>
        )
      }
    }
  }

  renderMacro () {
    const { testCases, editing, player, hasUnsaved } = this.props
    const { src } = editing.meta
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
    const { testCases, player } = this.props
    const isPlayerStopped = player.status === C.PLAYER_STATUS.STOPPED

    testCases.sort((a, b) => {
      const nameA = a.name.toLowerCase()
      const nameB = b.name.toLowerCase()

      if (nameA < nameB) return -1
      if (nameA === nameB)  return 0
      return 1
    })

    return (
      <div className={'header ' + this.props.status.toLowerCase()}>
        {this.renderMacro()}
        {this.renderStatus()}
        {this.renderActions()}
        {this.renderPlayLoopModal()}
        {this.renderSettingModal()}
      </div>
    )
  }
}

export default connect(
  state => ({
    hasUnsaved: hasUnsavedMacro(state),
    route: state.route,
    testCases: [...state.editor.testCases],
    editing: state.editor.editing,
    player: state.player,
    status: state.status,
    config: state.config,
    ui: state.ui
  }),
  dispatch  => bindActionCreators({...actions}, dispatch)
)(withRouter(Header))
