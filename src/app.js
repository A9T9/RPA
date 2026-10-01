import { t } from '@/common/ui_locale'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators }  from 'redux'
import { Button, Modal, message } from 'antd'

import * as actions from './actions'
import * as C from './common/constant'
import csIpc from './common/ipc/ipc_cs'
import Header from './components/header'
import Sidebar from './containers/sidebar'
import DashboardPage from './containers/dashboard'
import AiChat from './containers/sidepanel/components/ai_chat'
import { resizeIdeWindowForAiChat } from './ext/common/tab'
import { Actions } from '@/actions/simple_actions'
import { store } from './redux'

import './app.scss'
import './antd-override.scss'
import './styles/dark-theme.scss'
import { FocusArea } from './reducers/state'
import { isNoDisplay, isOcrInDesktopMode, isReplaySpeedOverrideToFastMode } from './recomputed'
import { getPlayer } from './common/player'
import storage from '@/common/storage'
import { cn, delayMs, waitForRenderComplete } from './common/utils'
import { Actions as simpleActions } from '@/actions/simple_actions'
import config from '@/config'

class App extends Component {
  hideBackupAlert = () => {
    this.props.updateConfig({
      lastBackupActionTime: new Date() * 1
    })
    this.$app.classList.remove('with-alert')
  }

  onClickBackup = () => {
    this.props.runBackup()
    this.hideBackupAlert()
  }

  onClickNoBackup = () => {
    this.hideBackupAlert()
  }

  onClickMainArea = () => {
    this.props.updateUI({ focusArea: FocusArea.Unknown })
  }

  onCloseAiChat = () => {
    this.props.updateConfig({ showIdeAiChat: false })
    resizeIdeWindowForAiChat(false, this.props.ideAiChatWidth)
  }

  getAiChatWidth = () => {
    const w = this.props.ideAiChatWidth || 320
    return Math.max(260, Math.min(700, w))
  }

  // same drag-to-resize as the macro tree view (containers/sidebar): HTML5
  // drag on a thin strip, width applied on dragEnd from the screenX delta
  // (screenX, not clientX — Firefox reports clientX 0 on dragend)
  onAiResizeDragStart = (e) => {
    // Firefox requires data in DataTransfer, otherwise dragEnd never fires
    e.dataTransfer.setData('text', '')
    this._aiDrag = {
      startX: e.screenX,
      startWidth: this.getAiChatWidth()
    }
    this.setState({ aiChatResizing: true })
  }

  onAiResizeDragEnd = (e) => {
    // handle sits on the LEFT edge: dragging left (negative delta) widens
    const diff = this._aiDrag.startX - e.screenX
    const width = Math.max(260, Math.min(700, this._aiDrag.startWidth + diff))
    this.setState({ aiChatResizing: false })
    this.props.updateConfig({ ideAiChatWidth: width })
  }

  // the chat shows its own inline status while the agent works; the IDE has
  // no sidebar-style status bar to mirror it into
  renderAiChatStatus = () => {}

  // same chat as the side panel's AI Chat tab, docked right of the editor —
  // more room, and the user watches the agent edit/run the macro live
  renderAiChatPanel () {
    if (!this.props.showIdeAiChat) return null

    const width = this.getAiChatWidth() + 'px'

    return (
      <aside className="ide-ai-chat-panel" style={{ width, minWidth: width }}>
        <div
          className={cn('resize-handler', { focused: this.state && this.state.aiChatResizing })}
          draggable="true"
          onDragStart={this.onAiResizeDragStart}
          onDragEnd={this.onAiResizeDragEnd}
        />
        <div className="ide-ai-chat-title">
          <span>{t('AI Chat ✨')}</span>
          <Button type="text" size="small" title={t("Hide AI Chat")} onClick={this.onCloseAiChat}>✕</Button>
        </div>
        <AiChat renderStatus={this.renderAiChatStatus} />
      </aside>
    )
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

  componentDidMount () {
    this.props.updateConfig({ ["oneTimeShowSidePanel"]: null })

    // The AI chat opening by default (fresh users, no saved choice) squeezes
    // the editor to its 520px minimum — its content wraps a few lines taller
    // and .content's overflow-y shows a scrollbar on the chat border even
    // though nothing meaningful scrolls. Widen the window ONCE for that case;
    // explicit toggles already resize, and the persisted flag keeps the
    // window from creeping wider on every start.
    storage.get('config').then(config => {
      config = config || {}
      const panelOpen = config.showIdeAiChat !== false
      if (panelOpen && !config.ideAiChatAutoWidened) {
        this.props.updateConfig({ ideAiChatAutoWidened: true })
        resizeIdeWindowForAiChat(true, config.ideAiChatWidth)
      }
    })

    if (this.props.selectCommandIndex !== undefined && this.props.selectCommandIndex !== null) {
      delayMs(500).then(() => {
        waitForRenderComplete(null, 500).then(() => {
          // scrollIntoView won't work because it's a virtual list
          delayMs(500).then(() => {
              let itemHeight =  config.ui.commandItemHeight
              let tableElement = document.querySelector('.ant-tabs-content .form-group.table-wrapper')
              tableElement.scrollTop = this.props.selectCommandIndex * itemHeight
              // this.props.updateUI({ focusArea: FocusArea.CommandTable })
              this.props.selectCommand(this.props.selectCommandIndex, true)
          })
        })
      })
    }

    const run = () => {
      csIpc.ask('PANEL_TIME_FOR_BACKUP', {})
      .then(isTime => {
        if (!isTime)  return
        this.$app.classList.add('with-alert')
      })
    }

    // Note: check whether it's time for backup every 5 minutes
    this.timer = setInterval(run, 5 * 60000)
    run()
  }

  componentWillUnmount () {
    clearInterval(this.timer)
  }

  showGUI = () => {
    store.dispatch(Actions.setNoDisplayInPlay(false))
    // set fast mode
    store.dispatch(Actions.setReplaySpeedOverrideToFastMode(true))
  }
  
  showGUIForOCR = () => {
    store.dispatch(Actions.setOcrInDesktopMode(false))
  }

  render () {
    if (this.props.noDisplay) {
      return (
        <div className="app no-display">
          <div className="content">
            <div className="status">{t('Ui.Vision is in "No Display" mode now')}</div>
            <Button.Group className="simple-actions">
              <Button size="large" onClick={() => this.getPlayer().stop()}>
                <span>{t('Stop')}</span>
              </Button>
                <Button
                  size="large"
                  onClick={this.showGUI}
                >
                  <span>{t('Show GUI')}</span>
                </Button>
            </Button.Group>
          </div>
        </div>
      )
    }

    return (
      <div className={cn('app', 'with-sidebar')} ref={el => { this.$app = el }}>
        <div className="backup-alert">
          <span>{t('Do you want to run the automated backup?')}</span>
          <span className="backup-actions">
            <Button type="primary" onClick={this.onClickBackup}>{t('Yes')}</Button>
            <Button onClick={this.onClickNoBackup}>{t('No')}</Button>
          </span>
        </div>
        <div className="app-inner">
          {/* the macro tree is always shown in the IDE window */}
          <Sidebar />
          <section
            className="content"
            onClickCapture={this.onClickMainArea}
          >
            <Header />
            <DashboardPage />
          </section>
          {this.renderAiChatPanel()}
        </div>

        
        {this.props.ocrInDesktopMode ? (
          <div className="app no-display ocr-overlay">
            <div className="content">
              <div className="status">Desktop OCR in progress</div>
              <Button.Group className="simple-actions">
                <Button size="large" onClick={() => this.getPlayer().stop()}>
                  <span>{t('Stop')}</span>
                </Button>
                <Button
                  size="large"
                  onClick={() => this.showGUIForOCR()}
                >
                  <span>{t('Show GUI')}</span>
                </Button>
              </Button.Group>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
}

export default connect(
  state => ({
    ui: state.ui,
    player: state.player,
    noDisplay: isNoDisplay(state),
    ocrInDesktopMode: isOcrInDesktopMode(state),
    replaySpeedOverrideToFastMode: isReplaySpeedOverrideToFastMode(state),
    selectCommandIndex: state.config.selectCommandIndex,
    // default OPEN: new users see the AI chat right away; closing it once
    // (header toggle / panel ✕ writes false) keeps it closed for good
    showIdeAiChat: state.config.showIdeAiChat !== false,
    ideAiChatWidth: state.config.ideAiChatWidth
  }),
  dispatch => bindActionCreators({...actions, ...simpleActions}, dispatch)
)(App)
