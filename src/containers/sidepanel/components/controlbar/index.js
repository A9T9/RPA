import { Button } from 'antd'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { SettingOutlined } from '@ant-design/icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCirclePlay, faCirclePause, faPenToSquare, faCircleStop } from '@fortawesome/free-regular-svg-icons'

import * as actions from '@/actions'
import * as C from '@/common/constant'
import { getStorageManager } from '@/services/storage'
import Ext from '@/common/web_extension'
import { getState, updateState } from '@/ext/common/global_state'
import { getPlayTab, showPanelWindow, getActiveTabId } from '@/ext/common/tab'
import { getPlayer, Player } from '@/common/player'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { range, setIn, updateIn, compose, cn } from '@/common/utils'
import './controlbar.scss'
import storage from '@/common/storage'
import csIpc from '@/common/ipc/ipc_cs'

class Controls extends React.Component {
  state = {
    openIDEClicked: false,
  }

  openRegisterSettings = (e) => {
    if (e && e.preventDefault)  e.preventDefault()
    this.props.updateUI({ showSettings: true, settingsTab: 'register' })
  }

  componentDidMount () {
    const type = getStorageManager().getCurrentStrategyType()
    this.setState({ storageMode: type })
  }

  getTestCaseName = () => {
    const { src } = this.props.editing.meta
    return src && src.name && src.name.length ? src.name : 'Untitled'
  }

  getPlayer = (name) => {
    if (name) return getPlayer({ name })
    switch (this.props.player.mode) {
      case C.PLAYER_MODE.TEST_CASE:
        return getPlayer({ name: "testCase" })
        case C.PLAYER_MODE.TEST_SUITE:
          return getPlayer({ name: "testSuite" })
      }
  }

  checkWindowisOpen = async (bwindowId) => {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({}, function (tabs) {
        var doFlag = [];
        for (var i = tabs.length - 1; i >= 0; i--) {
          if (tabs[i].windowId === bwindowId) {
            doFlag = tabs[i];

            break;
          }
        }
        resolve(doFlag);
      });
    });
  }

  playCurrentMacro = async (isStep)  => {
    const state = await getState()
    const bwindowId = state.tabIds.bwindowId;
    const wTab = bwindowId != '' ? await this.checkWindowisOpen(bwindowId) : '';
    Ext.tabs.query({ active: true })
    .then(tabs => {
      if (tabs.length === 0) {
        getPlayTab().then(tab => {
          updateState(setIn(['tabIds', 'toPlay'], tab.id))

          const { commands } = this.props.editing
          const { src } = this.props.editing.meta
          const openTc  = commands.find(tc => tc.cmd.toLowerCase() === 'open' || 'openbrowser')
          this.setState({ lastOperation: 'play' })
          this.props.playerPlay({
          macroId: src && src.id,
          title: this.getTestCaseName(),
          extra: {
          id: src && src.id
          },
          mode: getPlayer().C.MODE.STRAIGHT,
          playUrl:tab.url,
          playtabIndex:tab.index,
          playtabId:tab.id,
          startIndex: 0,
          startUrl: openTc ? openTc.target : null,
          resources: commands,
          postDelay: this.props.config.playCommandInterval * 1000,
          isStep: isStep
          })
            })
      } else {
        const tab = wTab != '' ? wTab : tabs[0];
        updateState(setIn(['tabIds', 'toPlay'], tab.id))
        const { commands } = this.props.editing
        const { src } = this.props.editing.meta
        const openTc  = commands.find(tc => tc.cmd.toLowerCase() === 'open' || 'openbrowser')
        this.setState({ lastOperation: 'play' })
        this.props.playerPlay({
        macroId: src && src.id,
        title: this.getTestCaseName(),
        extra: {
        id: src && src.id
        },
        mode: getPlayer().C.MODE.STRAIGHT,
        playUrl:tab.url,
        playtabIndex:tab.index,
        playtabId:tab.id,
        startIndex: 0,
        startUrl: openTc ? openTc.target : null,
        resources: commands,
        postDelay: this.props.config.playCommandInterval * 1000,
        isStep: isStep
        })
      }
    })
  }

  onClickOpenIDE = async (showSettingsOnStart = false) => {

    if(Ext.isFirefox()) {
      const userResponse = confirm('To Open IDE, click OK and click the Extension icon in extension bar.')
      if (!userResponse) return  

      await this.props.updateConfig({ ["oneTimeShowSidePanel"]: false })
      Ext.sidebarAction.close()
      return
    }

    // for chrome and edge
    const tabId = await getActiveTabId();
    if (tabId) {
      if (showSettingsOnStart) {
        showPanelWindow({ showSettingsOnStart })
      } else {
        this.setState({ openIDEClicked: true })

        // disable open sidepanel first
        storage.get("config").then((config) => {
          storage
            .set("config", {
              ...config,
              disableOpenSidepanelBtnTemporarily: true,
            })
            .then(() =>
              showPanelWindow().then(() =>
                // re-enable open sidepanel after window shows
                storage
                  .get("config")
                  .then((config) => {
                    storage.set("config", {
                      ...config,
                      disableOpenSidepanelBtnTemporarily: false,
                    })
                  })
                  .then(() =>
                    // close sidepanel
                    //  
                    // issue: sidebarAction.close may only be called from a user input handler
                    // Ext.sidebarAction.close()

                    Ext.sidePanel
                      .setOptions({
                        enabled: false,
                      })
                      .then(() => {
                        Ext.sidePanel.setOptions({
                          enabled: true,
                        })
                      })
                  )
              )
            )
        })
      }
    }
  }

  render () {
    return (
        <div className="control-panel-container">
        <div className="control-panel">
          <div className='action-button-container'>
            <Button disabled={this.props.player.status === C.PLAYER_STATUS.PLAYING || this.props.player.status === C.PLAYER_STATUS.PAUSED } onClick={() => this.playCurrentMacro(false)} >
              <FontAwesomeIcon icon={faCirclePlay} />
              <span> Play</span> 
            </Button>
            {this.props.player.status === C.PLAYER_STATUS.PAUSED ? (
              <Button onClick={() => this.getPlayer().resume()}>
                <FontAwesomeIcon icon={faCirclePlay} />
                <span> Resume</span>              
              </Button>
            ) : (
              <Button disabled={this.props.player.status !== C.PLAYER_STATUS.PLAYING} onClick={() => this.getPlayer().pause()}>
                <FontAwesomeIcon icon={faCirclePause} />
                <span> Pause</span>
              </Button>
            )}
            <Button disabled={this.props.player.status === C.PLAYER_STATUS.STOPPED} onClick={() => this.getPlayer().stop()}>
              <FontAwesomeIcon icon={faCircleStop} />
              <span> Stop</span>
            </Button>
          </div>
          <div className='action-button-container'>
            <Button disabled={this.props.player.status === C.PLAYER_STATUS.PLAYING || this.state.openIDEClicked} onClick={() => this.onClickOpenIDE()}>
              <FontAwesomeIcon icon={faPenToSquare} />
              <span> Open IDE</span>
            </Button>
            <Button disabled={this.props.player.status === C.PLAYER_STATUS.PLAYING} onClick={() => this.onClickOpenIDE(true)} shape="circle" >
              <SettingOutlined />
            </Button>
          </div>
          <div className='action-button-container'>
            <a onClick={() => {
              chrome.tabs.create({url: "https://goto.ui.vision/x/idehelp?help=sidepanel"})
            }}>Ui.Vision Side Panel</a>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({
    route: state.route,
    editing: state.editor.editing,
    player: state.player,
    status: state.status,
    config: state.config,
    ui: state.ui,
    proxy: state.proxy
  }),
  dispatch  => bindActionCreators({...actions, ...simpleActions}, dispatch)
  )(Controls)
