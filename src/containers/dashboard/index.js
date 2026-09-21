// Deep-path import keeps webpack from bundling the whole icon set (tree-shaking
// is disabled by the CommonJS babel transform in webpack.prod.config.js)
import { faTableColumns } from '@fortawesome/free-solid-svg-icons/faTableColumns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal, Popover } from 'antd'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as C from '@/common/constant'
import storage from '@/common/storage'
import { getState } from '@/ext/common/global_state'
import * as actions from '../../actions'
import { store } from '@/redux'
import { delayMs } from '../../common/utils'
import getSaveTestCase from '../../components/save_test_case'
import { goUivUrl } from '@/common/uiv_link'
import DashboardBottom from './bottom'
import './dashboard.scss'
import DashboardEditor from './editor'
import DaSetupDialog from '@/components/da_setup_dialog'
import Ext from '../../common/web_extension'

class Dashboard extends React.Component {
  state = {
    tabIdToPlay: undefined,
    isOpenInSidePanelBtnActive: true,
    bottomPanelHeight: -1,
    permissionRequired: false
  }

  handleStorageChange = ([changedObj]) => {
    // TODO: remove this block of code. Maybe it's not needed as this state property is updated in componentDidMount
    // if (changedObj.key === 'background_state') {
    //   this.setState({ tabIdToPlay: changedObj.newValue.tabIds.toPlay });
    // }

    if (changedObj.key === 'config') {
      let getAllChangedProperties = Object.keys(changedObj.newValue).filter(key => changedObj.newValue[key] !== changedObj.oldValue[key]) 
      if (getAllChangedProperties.includes('disableOpenSidepanelBtnTemporarily')) {   
        if (changedObj.newValue.disableOpenSidepanelBtnTemporarily) {
          this.setState({ isOpenInSidePanelBtnActive: false })
        } else {
          getState().then(state => {
            this.setState({ tabIdToPlay: state.tabIds.toPlay })    
            if(Ext.isFirefox()) {
              return chrome.sidebarAction.open()
            } else {
              chrome.sidePanel.setOptions({
                enabled: true
              }).then(() => {
                this.setState({ isOpenInSidePanelBtnActive: true })
              })  
            }
          })
        }
      }
    }
  }

  // "Close IDE and continue here" on the side panel's overlay asks this window
  // to save its work and close itself — a raw tabs.remove from outside would
  // drop unsaved edits. ACK synchronously so the sender knows the request is
  // handled; the actual close may wait on the "Save macro as.." prompt when
  // the macro was never saved before.
  handleRuntimeMessage = (req, sender, sendResponse) => {
    if (!req || req.type !== 'IDE_SAVE_AND_CLOSE') return

    sendResponse('ide-ack')

    const meta = this.props.editing && this.props.editing.meta
    const needsSaveAsPrompt = meta && meta.hasUnsaved && !meta.src
    const focus = needsSaveAsPrompt
      ? Ext.windows.getCurrent().then(win => Ext.windows.update(win.id, { focused: true }))
      : Promise.resolve()

    focus
      .then(() => getSaveTestCase().save())
      .then(saved => {
        // saved === false: the user canceled the Save-As prompt — stay open
        if (saved !== false) window.close()
      })
      .catch(err => console.log('IDE_SAVE_AND_CLOSE save err:>>', err))
  }

  componentDidMount () {
    Ext.runtime.onMessage.addListener(this.handleRuntimeMessage)

    // firefox requires explicit permission to access all urls
    // otherwise user will need to allow access for each url manually  
    if(Ext.isFirefox()) {
      Ext.permissions.contains({ origins: ['<all_urls>'] }).then(permissionGranted => {
        if (!permissionGranted) {
          this.setState({ permissionRequired: true })          
        }        
      })
    }

    // set open sidepanel button active after 4 seconds anyway
    delayMs(4000).then(() => {        
      this.props.updateConfig({
        disableOpenSidepanelBtnTemporarily: false
      })         
      this.setState({ isOpenInSidePanelBtnActive: true }) 
    })

    getState().then(state => {
      this.setState({ tabIdToPlay: state.tabIds.toPlay })   
    })
    .then(() => {
      if (!Ext.isFirefox()) {
        chrome.sidePanel.setOptions({
          enabled: true
        })
      }
    })


    storage.get('config').then(config => { 
      if (Object.keys(config).includes('disableOpenSidepanelBtnTemporarily')) {
          this.setState({ isOpenInSidePanelBtnActive: !config.disableOpenSidepanelBtnTemporarily })          
      } else {
        this.setState({ isOpenInSidePanelBtnActive: true })
      }    
    })

    storage.addListener(this.handleStorageChange)  
  }


  onBottomPanelHeightChange = (height) => {
    this.setState({ bottomPanelHeight: height })
  }

  // first-switch hint (see controlbar/index.js): set by the sidebar's IDE
  // buttons, shown here on the button that leads back — until "Got it"
  shouldShowInterfaceHint = () => {
    return this.props.config.interfaceHintTarget === 'ide' &&
           !this.props.config.interfaceHintDismissed
  }

  dismissInterfaceHint = () => {
    this.props.updateConfig({ interfaceHintDismissed: true, interfaceHintTarget: null })
  }

  onGrantPermission = () => {
    Ext.permissions.request({origins: ['<all_urls>']}).then((result) => {
      console.log('permission result:>>', result)  
      if(result) { 
        this.setState({ permissionRequired: false})
      } else {
        // visit https://go.ui.vision/?help=firefox_access_data_permission in new tab 
        Ext.tabs.create({
          url: goUivUrl('https://go.ui.vision/?help=firefox_access_data_permission'),
          active: true
        })
      }
    })
  }

  render () {
    const isWindows = /windows/i.test(window.navigator.userAgent)

    return (
      <div className="dashboard">
        {/* store={store}: direct store subscription, not nested under this
            container's — otherwise the Target/Value/Description inputs get a
            stale value prop in the first commit of every keystroke and the
            caret jumps to the end (forum 29959, OPEN-ISSUES #12; details in
            sidepanel/components/macro/index.js) */}
        <DashboardEditor bottomPanelHeight={this.state.bottomPanelHeight} store={store} />
        <DashboardBottom onBottomPanelHeightChange={this.onBottomPanelHeightChange} />
        {/* "grant the macOS/Wayland permissions" nudge after a native-app
            install; renders nothing once handled */}
        <DaSetupDialog />

        <div className="online-help">
          <Popover
            open={this.shouldShowInterfaceHint()}
            placement="topLeft"
            overlayClassName="interface-hint-popover"
            content={
              <div className="interface-hint">
                <p>
                  Side Panel or IDE window — use whichever you like, your
                  macros are the same in both. Pick which one opens by
                  default in <strong>Settings &gt; General</strong>.
                </p>
                <Button size="small" type="primary" onClick={this.dismissInterfaceHint}>
                  Got it
                </Button>
              </div>
            }
          >
          <Button className="btn-open-in-sidepanel"
            disabled={this.state.isOpenInSidePanelBtnActive && this.props.player.status === C.PLAYER_STATUS.STOPPED ? false : true}
            onClick={async () => {
              console.log('this.state.tabIdToPlay:>>', this.state.tabIdToPlay)

              // first switch to the side panel: show the settings hint there
              if (!this.props.config.interfaceHintDismissed) {
                this.props.updateConfig({ interfaceHintTarget: 'sidepanel' })
              }

              if (Ext.isFirefox()) {
                // below code doesn't work if it runs in IDE, but works if it runs in sidePanel or background
                // Ext.sidebarAction.open()
                // firefox issue as expected: sidebarAction.open may only be called from a user input handler
                // csIpc.ask('PANEL_SHOW_SIDEBAR') 

                const userResponse = confirm('To open the sidebar, click OK and then click the extension icon in the toolbar.')
                if (!userResponse) return  
          
                await this.props.updateConfig({ ["oneTimeShowSidePanel"]: true }) 
                
                getSaveTestCase().save().then(() => {
                    window.close()
                }).catch((err) => {
                  console.log('getSaveTestCase err:>>', err)
                })    
                             
                return
              } else {

                await chrome.sidePanel.open({
                  tabId: this.state.tabIdToPlay
                }).then((x) => {
                  getSaveTestCase().save().then(() => {
                    window.close()
                  }).catch((err) => {
                    console.log('getSaveTestCase err:>>', err)
                  })
                }).catch((err) => {
                  console.log('#25: open', err)
                })
              }
            }}
          >
            <FontAwesomeIcon icon={faTableColumns} />
            <span>Continue in Side Panel</span>
          </Button>
          </Popover>
          {
            this.state.permissionRequired &&  
            <Button
              className="btn-request-permission"
              onClick={() => {
               this.onGrantPermission()
              }}
            >
            <span>Tabs Permission Required</span> 
          </Button>
          }
          <div style={{ visibility: isWindows ? 'visible' : 'hidden' }}>
            <a href="https://go.ui.vision/?help=visual" target="_blank"></a>
          </div>
          <div>
            <a href="https://go.ui.vision/?help=home" target="_blank">Ui.Vision</a>&nbsp;|&nbsp;
            <a href="https://go.ui.vision/?help=ai" target="_blank">AI</a>&nbsp;|&nbsp;
            <a href="https://go.ui.vision/?help=ocr" target="_blank">OCR</a>&nbsp;|&nbsp;
            <a href="https://go.ui.vision/?help=forum" target="_blank">Forum</a>&nbsp;|&nbsp;
            <a href="https://go.ui.vision/?help=github" target="_blank">Github</a>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({
    player: state.player,
    editing: state.editor.editing,
    config: state.config,
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(Dashboard)
