import { faTableColumns } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal } from 'antd'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as C from '@/common/constant'
import storage from '@/common/storage'
import { getState } from '@/ext/common/global_state'
import * as actions from '../../actions'
import { delayMs } from '../../common/utils'
import getSaveTestCase from '../../components/save_test_case'
import DashboardBottom from './bottom'
import './dashboard.scss'
import DashboardEditor from './editor'
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

  componentDidMount () {
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

  onGrantPermission = () => {
    Ext.permissions.request({origins: ['<all_urls>']}).then((result) => {
      console.log('permission result:>>', result)  
      if(result) { 
        this.setState({ permissionRequired: false})
      } else {
        // visit https://goto.ui.vision/x/idehelp?help=firefox_access_data_permission in new tab 
        Ext.tabs.create({
          url: 'https://goto.ui.vision/x/idehelp?help=firefox_access_data_permission',
          active: true
        })
      }
    })
  }

  render () {
    const isWindows = /windows/i.test(window.navigator.userAgent)

    return (
      <div className="dashboard">
        <DashboardEditor bottomPanelHeight={this.state.bottomPanelHeight} />
        <DashboardBottom onBottomPanelHeightChange={this.onBottomPanelHeightChange} />

        <div className="online-help">
          <Button className="btn-open-in-sidepanel"
            disabled={this.state.isOpenInSidePanelBtnActive && this.props.player.status === C.PLAYER_STATUS.STOPPED ? false : true}
            onClick={async () => {
              console.log('this.state.tabIdToPlay:>>', this.state.tabIdToPlay)

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
            <span>Open in Side Panel</span> 
          </Button>
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
            <a href="https://goto.ui.vision/x/idehelp?help=visual" target="_blank"></a>
          </div>
          <div>
            Ui.Vision Community:&nbsp;
            <a href="https://goto.ui.vision/x/idehelp?help=forum" target="_blank">Forums</a>&nbsp;|&nbsp; 
            <a href="https://goto.ui.vision/x/idehelp?help=docs" target="_blank">Docs</a>&nbsp;|&nbsp;
            <a href="https://goto.ui.vision/x/idehelp?help=github" target="_blank">Open-Source</a>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({ 
    player: state.player,
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(Dashboard)
