import { Button, Modal, Tabs, Tooltip, message } from 'antd'
import 'antd/dist/reset.css'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import { isCVTypeForDesktop } from '@/common/cv_utils'
import { SIDEPANEL_PORT_NAME } from '@/common/ipc/ipc_bg_cs'
import storage from '@/common/storage'
import * as actions from '../../actions'
import * as C from '../../common/constant'
import { cn, delayMs } from '../../common/utils'
import Ext from '@/common/web_extension'
import { getState } from '@/ext/common/global_state'
import { activateTab } from '@/common/tab_utils'
import { FocusArea } from '../../reducers/state'
import { StorageStrategyType, getStorageManager } from '../../services/storage'
import { openSettings } from '@/ext/common/tab'
import { MacroResultStatus } from '../../services/kv_data/macro_extra_data'
import { isScriptRunning, onScriptEvent } from '../../modules/script_runner'
import { initMcpBridge, emergencyStopMcp } from '@/services/mcp_bridge'
import { initDesktopAppPanelLink } from '@/services/desktop_app/panel_link'
import { renderLogType } from '@/common/macro_log'
import Controlbar from './components/controlbar'
import MacroSetupDialog from './components/macro_setup_dialog'
import DaSetupDialog from '@/components/da_setup_dialog'
import Files from './components/files'
import Logs from './components/logs'
import LogsBottomBar from './components/logs/bottom_bar'
import AiChat from './components/ai_chat'
import Macro from './components/macro'
import ComputerSvg from '@/assets/svg/computer.svg'
import BrowserSvg from '@/assets/svg/browser.svg'
import './sidepanel.scss'

class Sidepanel extends React.Component {
  _lastStatus = null
  _lastMacroLog = null
  _lastSelectedMacroName = null
  // playing from the Files tab shows the Macro tab during the run, then
  // returns to Files — but only if the run ended without errors
  _returnToFilesAfterPlay = false
  _logCountAtPlayStart = 0
  state = {
    drag: {
      isDragging: false,
      startX: 0,
      movingX: 0,
      lastWidth: 260,
      currentMinWidth: 260
    },
    fullStatusText: '',
    shortStatus: '',
    // { label, remainingS } while a finder auto-waits during a script run
    scriptWait: null,
    // pop-out IDE window open → sidebar greys out (see checkIdeWindowOpen)
    ideWindowOpen: false,
    ideTabId: null,
    closingIde: false
  }

  // constructor
  constructor(props) {
    super(props)
    this.renderStatus = this.renderStatus.bind(this)
  }

  getSideBarMinWidth = () => {
    const { isDragging, lastWidth, currentMinWidth } = this.state.drag
    return (isDragging ? currentMinWidth : lastWidth) + 'px'
  }

  onClickSidebar = () => {
    this.props.updateUI({ focusArea: FocusArea.Sidebar })
  }

  // ---- IDE-window overlay ----
  // While the pop-out IDE window is open it owns panel routing and macro
  // editing; the sidebar greys itself out to prevent concurrent edits (each
  // surface persists its FULL editing object, so parallel edits would clobber
  // each other — see macro_table.handleStorageChange)

  checkIdeWindowOpen = () => {
    return getState()
      .then(state => {
        const tabId = state && state.tabIds ? state.tabIds.lastPanelWindow : null
        if (!tabId) throw new Error('no ide window')

        return Ext.tabs.get(tabId).then(tab => {
          const url = (tab && (tab.url || tab.pendingUrl)) || ''
          // a stale tab id after browser restart fails the url check too
          const isIde = url.startsWith(Ext.runtime.getURL('popup.html'))
          if (!isIde) throw new Error('not the ide window')
          this.setState({ ideWindowOpen: true, ideTabId: tabId })
        })
      })
      .catch(() => this.setState({ ideWindowOpen: false, ideTabId: null }))
  }

  onIdeWindowClosed = () => {
    this.setState({ ideWindowOpen: false, ideTabId: null, closingIde: false })
    // pick up whatever the IDE last persisted (it saves on hand-off) so the
    // sidebar doesn't keep showing its stale pre-overlay copy of the macro
    storage.get('editing')
      .then(editing => {
        if (editing) this.props.updateEditing(editing)
      })
      .catch(() => {})
  }

  onClickShowIde = () => {
    if (!this.state.ideTabId) return
    activateTab(this.state.ideTabId, true).catch(() => this.checkIdeWindowOpen())
  }

  onClickCloseIde = async () => {
    const tabId = this.state.ideTabId
    if (!tabId || this.state.closingIde) return
    this.setState({ closingIde: true })

    // ask the IDE to save its work and close itself — a raw tabs.remove would
    // drop unsaved edits (dashboard/index.js handleRuntimeMessage)
    const acked = await new Promise(resolve => {
      const timer = setTimeout(() => resolve(false), 2000)
      try {
        Ext.runtime.sendMessage({ type: 'IDE_SAVE_AND_CLOSE' }).then(
          res => { clearTimeout(timer); resolve(res === 'ide-ack') },
          () => { clearTimeout(timer); resolve(false) }
        )
      } catch (e) {
        clearTimeout(timer)
        resolve(false)
      }
    })

    if (acked) {
      // the IDE closes itself and tabs.onRemoved lifts the overlay; if it's
      // still open after a while the user is in the Save-As prompt for a
      // never-saved macro — stop the spinner and leave the overlay up
      for (let i = 0; i < 10; i++) {
        await delayMs(500)
        if (!this.state.ideWindowOpen) return
      }
      this.setState({ closingIde: false })
      return
    }

    // no ACK (hung or pre-update IDE page) — force-close
    try {
      await Ext.tabs.remove(tabId)
    } catch (e) {
      // tab already gone
    }
    this.setState({ closingIde: false })
    this.checkIdeWindowOpen()
  }

  // MCP strip: on screen the WHOLE time the bridge is connected (Claude Code
  // can act at any moment), not only during a call — it carries the
  // connection label ("chrome#1": which browser this is, with several on one
  // bridge), the tool in flight, and the red STOP that halts the run and cuts
  // the bridge. It sits above the tabs so it is visible in Data, Macro, Files
  // and AI Chat alike, and the status bar below keeps doing its own job
  // (line / result). ui.mcpControl is set/cleared by the bridge client
  // (services/mcp_bridge); it lingers ~2.5s past the last call so a sequence
  // of calls reads as one session, not a flicker. state.mcpBridgeLabel is
  // the connection itself (null = not connected).
  renderMcpControlBanner = () => {
    const mcp = this.props.ui && this.props.ui.mcpControl
    const label = this.props.mcpBridgeLabel
    if (!mcp && !label) return null
    const client = (mcp && mcp.client) || this.props.mcpBridgeClient || 'MCP client'

    return (
      <div
        className={cn('mcp-control-banner', { active: !!mcp })}
        title={
          mcp
            ? `${client} is executing "${mcp.tool}" through the MCP bridge. STOP halts the macro and switches the bridge off.`
            : `${client} is connected to this browser via the MCP bridge as "${label}" and can start a tool call at any time. STOP switches the bridge off; manage it in Settings > AI.`
        }
      >
        <span className="mcp-dot" />
        <span className="mcp-label">MCP: {label || 'connected'}</span>
        <span className="mcp-tool">{mcp ? `${client}: ${mcp.tool}` : `${client} connected`}</span>
        <Button
          size="small"
          type="primary"
          danger
          className="mcp-stop"
          title="Emergency stop: stops the running macro and switches the MCP bridge off (re-enable it in Settings > AI)"
          onClick={emergencyStopMcp}
        >
          STOP
        </Button>
      </div>
    )
  }

  renderIdeOpenOverlay = () => {
    if (!this.state.ideWindowOpen) return null

    return (
      <div className="ide-open-overlay">
        <div className="ide-open-overlay-card">
          <h3>IDE window is open</h3>
          <p>Macro editing continues in the IDE window while it is open.</p>
          <Button type="primary" block onClick={this.onClickShowIde}>
            Show IDE window
          </Button>
          <Button block loading={this.state.closingIde} onClick={this.onClickCloseIde}>
            Close IDE and continue here
          </Button>
        </div>
      </div>
    )
  }

  getActiveTab = () => {
    return this.props.ui.sidebarTab || 'Files'
  }

  // user clicked a tab — remember it as the landing tab for the next session.
  // Only explicit clicks persist; programmatic switches (auto-jump to Macro
  // during a run etc.) must not overwrite the user's habit
  //
  // Tab switching stays OPEN during a run, deliberately: watching Data > Logs
  // while a long macro plays is the point of having the tab. Loading a
  // different macro mid-run is blocked where it actually happens, in the tree
  // (components/files/index.js).
  onChangeTab = (activeKey) => {
    this.props.updateUI({ sidebarTab: activeKey })
    this.props.updateConfig({ lastSidebarTab: activeKey })
  }

  // the side panel reopens on the tab the user last chose; ui.sidebarTab is
  // in-memory only, so it is restored once from config. The first-install
  // AI-Chat redirect (below) runs after this and wins.
  _tabRestored = false
  maybeRestoreLastTab = () => {
    if (this._tabRestored) return
    if (this.props.ui.sidebarTab) {
      // something already picked a tab this session — don't fight it
      this._tabRestored = true
      return
    }

    const last = this.props.config.lastSidebarTab
    if (last && ['AiChat', 'Files', 'Macro', 'Logs'].indexOf(last) !== -1) {
      this._tabRestored = true
      this.props.updateUI({ sidebarTab: last })
    }
  }

  // first install (flag set by bg.js onInstalled): land on the AI Chat tab
  // once, then clear the persisted flag. Checked from both mount and update
  // because the config may hydrate only after the first render.
  componentWillUnmount() {
    window.removeEventListener('hashchange', this.openDebugProviderChoice)
  }

  openDebugProviderChoice = () => {
    if (window.location.hash === '#debugbluebutton') this.props.updateUI({ sidebarTab: 'AiChat' })
  }

  maybeOpenAiChatOnFirstRun = () => {
    if (this.props.config.openAiChatTabOnce) {
      this.props.updateConfig({ openAiChatTabOnce: false })
      this.props.updateUI({ sidebarTab: 'AiChat' })
    }
  }

  // background tone of the status bar: yellow while replaying/recording,
  // green after a successful run, red after an error, light blue otherwise
  // (uses the same per-macro result status as the file tree coloring)
  getStatusTone = () => {
    const { status } = this.props

    if (status === C.APP_STATUS.PLAYER || status === C.APP_STATUS.RECORDER) {
      return 'running'
    }

    // JS script in progress: app status stays NORMAL on the fast path, but
    // for the user a run is a run — never show the previous run's tone
    if ((this.props.ui && this.props.ui.scriptRunning) || isScriptRunning()) {
      return 'running'
    }

    const src = this.props.editing.meta.src
    const extra = src && src.id && this.props.macrosExtra ? this.props.macrosExtra[src.id] : null

    switch (extra && extra.status) {
      case MacroResultStatus.Success:
        return 'success'

      case MacroResultStatus.Error:
      case MacroResultStatus.ErrorInSub:
        return 'error'

      default:
        return 'idle'
    }
  }

  // failed run → one click opens AI Chat with the error pre-filled; the
  // agent reads the macro itself via its get_macro tool, so the prompt only
  // needs the error context
  // "Log" next to "Fix with AI": the status line only has room for a truncated
  // sentence, so an error needs a one-click way to the whole thing. Always the
  // BIG log in Data > Logs — the small run panel under the editor is where the
  // user just was when the error scrolled past, so sending them back there
  // answers nothing.
  onClickOpenLog = () => {
    this.props.updateUI({ sidebarTab: 'Logs', dataTab: 'Logs' })
  }

  onClickFixWithAI = () => {
    const logs = this.props.logs_ || []
    const lastError = logs
      .slice()
      .reverse()
      .find((log) => log.type === 'error' && !(log.options && log.options.ignored))

    // Fall back rather than hand the AI "an error", which tells it nothing and
    // costs a round trip to discover that. A script run publishes its failure
    // to ui.scriptError; failing that, the status bar text is at least the
    // real message, truncated.
    const scriptError = this.props.ui && this.props.ui.scriptError
    const errorText =
      (lastError && typeof lastError.text === 'string' && lastError.text) ||
      scriptError ||
      this.state.fullStatusText ||
      'an error'
    const stack = (lastError && lastError.stack) || []
    const source = stack[stack.length - 1]
    const scriptWhere = this.props.ui && this.props.ui.scriptErrorWhere
    const lineInfo = scriptWhere
      ? ` at ${scriptWhere}`
      : (source && typeof source.commandIndex === 'number' ? ` at line ${source.commandIndex + 1}` : '')

    const prompt = `My macro "${this.getMacroName()}" failed${lineInfo} with this error:\n${errorText}\n\nPlease fix the current macro.`

    this.props.updateUI({ sidebarTab: 'AiChat', aiChatPrefill: prompt })
  }

  // status line sits in the bottom zone, right above the per-tab controls;
  // while a macro runs it grows by a second line showing the latest log entry
  renderStatusBar = () => {
    if (this.getActiveTab() === 'AiChat') return null

    const tone = this.getStatusTone()
    // a JS script counts as playing even while app status is NORMAL (its
    // fast-path commands never enter the player) — without this, Log and
    // Fix with AI showed mid-run and the bar carried a stale error tone
    const isPlaying = this.props.status === C.APP_STATUS.PLAYER ||
      (this.props.ui && this.props.ui.scriptRunning) || isScriptRunning()
    const logs = this.props.logs_ || []
    const lastLog = isPlaying && logs.length ? logs[logs.length - 1] : null
    const lastLogText = lastLog && typeof lastLog.text === 'string' ? lastLog.text : null
    // an auto-wait outranks the last log on the second line: it is the reason
    // nothing is happening, and it counts down, so it has to be readable —
    // this row wraps to two lines rather than truncating the locator away
    const { scriptWait } = this.state

    return (
      <div className={cn('status-bar', `tone-${this.getStatusTone()}`)}>
        <div className="status-main-row">
        <Tooltip title={this.state.fullStatusText}>
          <span className="status-text">{this.state.shortStatus || ' '}</span>
        </Tooltip>
        {/* The status line is one truncated sentence, so the way to the full
            log belongs there whatever the outcome — a successful run has a log
            worth reading too (what it extracted, what it skipped). Fix with AI
            only appears when there is something to fix. */}
        {!isPlaying ? (
          <span
            className="open-log"
            title="Show the full log (Data > Logs)"
            onClick={this.onClickOpenLog}
          >
            Log
          </span>
        ) : null}
        {tone === 'error' && !isPlaying ? (
          <span
            className="fix-with-ai"
            title="Open AI Chat with this error — the AI fixes the macro"
            onClick={this.onClickFixWithAI}
          >
            Fix with AI ✨
          </span>
        ) : null}
        </div>
        {scriptWait ? (
          // countdownOnly: a fixed wait (uiv.sleep) just counts down — only
          // deadline waits (finders, page loads, downloads) end in a timeout
          <Tooltip title={`${scriptWait.label} — ${scriptWait.remainingS}s ${scriptWait.countdownOnly ? 'left' : 'until timeout'}`}>
            <span className="status-wait">
              {/* countdown before the label, so the part that wraps away is the
                  tail of the label and never the seconds-remaining — a long
                  label (an "open" carries up to 60 chars of url) used to fill
                  both clamped lines and push the countdown out of sight */}
              Waiting {scriptWait.remainingS}s {scriptWait.countdownOnly ? 'left' : 'until timeout'} — {scriptWait.label}
            </span>
          </Tooltip>
        ) : lastLogText ? (
          <Tooltip title={lastLogText}>
            <span
              className={cn('status-last-log', {
                error: lastLog.type === 'error',
                warning: lastLog.type === 'warning'
              })}
              onClick={() => {
                // on the Macro tab the run panel shows the logs in place —
                // keeps the running command list visible while reading them.
                // The run panel is a dev-mode feature; otherwise fall back
                // to the full log view in the Data tab
                if (this.getActiveTab() === 'Macro' && this.props.config.sidebarDevMode) {
                  this.props.updateUI({ runPanelOpen: true, runPanelTab: 'Logs' })
                } else {
                  this.props.updateUI({ sidebarTab: 'Logs', dataTab: 'Logs' })
                }
              }}
            >
              {renderLogType(lastLog)} {lastLogText}
            </span>
          </Tooltip>
        ) : null}
      </div>
    )
  }

  // each tab brings its own bottom controls
  renderBottomBar = () => {
    switch (this.getActiveTab()) {
      case 'AiChat':
        // no controls — the chat prompt box uses the space
        return null

      case 'Logs':
        return <LogsBottomBar />

      default:
        // Files + Macro: play/record controls
        return <Controlbar />
    }
  }

  // "run started/ended" behavior shared by classic replays (driven by the
  // app status in componentDidUpdate) and JS script runs (driven by the
  // script runner's status event — one signal for the whole script, not one
  // per bridge command)
  onAnyRunStarted = () => {
    if (this.getActiveTab() === 'Files') {
      this._returnToFilesAfterPlay = true
      this._logCountAtPlayStart = (this.props.logs_ || []).length
      this.props.updateUI({ sidebarTab: 'Macro' })
    } else {
      this._returnToFilesAfterPlay = false
    }
  }

  onAnyRunEnded = () => {
    if (this._returnToFilesAfterPlay) {
      this._returnToFilesAfterPlay = false
      const logCountAtPlayStart = this._logCountAtPlayStart

      // small delay: the final error log can arrive just after the status
      // flips back to normal
      setTimeout(() => {
        const runLogs = (this.props.logs_ || []).slice(logCountAtPlayStart)
        const hasError = runLogs.some((log) => log.type === 'error' && !(log.options && log.options.ignored))

        if (!hasError && this.getActiveTab() === 'Macro') {
          this.props.updateUI({ sidebarTab: 'Files' })
        }
      }, 600)
    }
  }

  componentDidMount() {
    chrome.runtime.connect({ name: SIDEPANEL_PORT_NAME })
    const type = getStorageManager().getCurrentStrategyType()
    this.setState({ storageMode: type })

    // MCP bridge (Claude Code integration) — no-op unless enabled in
    // Settings > AI; runs in the panel because the tools need this context
    initMcpBridge()

    // Ui.Vision for Desktop (the helper app): a standing, silent link so the
    // app can hand a browser macro from its Files tab to this panel
    // (services/desktop_app/panel_link.ts)
    initDesktopAppPanelLink()

    // JS script runs: one started/ended signal per script (the player status
    // flips once per uiv.* command and is ignored while a script runs).
    // 'paused' and the 'running' after a resume are mid-run states, not new
    // runs — only the stopped<->running edges count.
    this._scriptRunActive = false
    this.unsubscribeScriptStatus = onScriptEvent('status', (status) => {
      if (status === 'running' && !this._scriptRunActive) {
        this._scriptRunActive = true
        this.onAnyRunStarted()
      } else if (status === 'stopped' && this._scriptRunActive) {
        this._scriptRunActive = false
        this.onAnyRunEnded()
      }
      if (status === 'stopped') this.setState({ scriptWait: null })
    })

    // A finder auto-waiting is the one thing a run does that looks like a hang,
    // so it belongs in the status bar — the single place the user already
    // watches. The JS view used to print its own copy next to the editor; two
    // boxes saying the same thing is one box too many.
    this.unsubscribeScriptWait = onScriptEvent('wait', (wait) => {
      this.setState({ scriptWait: wait })
    })

    // fill the status bar right away — componentDidUpdate only fires on prop
    // changes, so without this the bar starts out empty
    this.refreshStatusText()

    this.maybeRestoreLastTab()
    this.maybeOpenAiChatOnFirstRun()
    this.openDebugProviderChoice()
    window.addEventListener('hashchange', this.openDebugProviderChoice)

    // grey out right away if the IDE window is already open (e.g. the side
    // panel was opened while the pop-out editor was in use)
    this.checkIdeWindowOpen()
    this._onAnyTabRemoved = (tabId) => {
      if (tabId === this.state.ideTabId) this.onIdeWindowClosed()
    }
    Ext.tabs.onRemoved.addListener(this._onAnyTabRemoved)

    // keep this page's config in sync with changes other pages (settings
    // window, IDE) write to storage — e.g. an AI provider switch
    // TODO: consider using other storage key to keep temporary configs like showSidePanel, oneTimeShowSidePanel
    storage.addListener(([storage]) => {
      if (storage.key === 'config') {
        // apply ALL changed keys, objects/arrays included, compared by value
        const changedConfig = Object.keys(storage.newValue).reduce((acc, key) => {
          const newVal = storage.newValue[key]
          const curVal = this.props.config[key]
          const changed =
            typeof newVal === 'object' && newVal !== null
              ? JSON.stringify(newVal) !== JSON.stringify(curVal)
              : newVal !== curVal
          if (changed) {
            acc[key] = newVal
          }
          return acc
        }, {})
        if (Object.keys(changedConfig).length) {
          console.log('config sync from storage:>> changed keys:', Object.keys(changedConfig))
          // updateConfigFromStorage does NOT write back to storage — a
          // write-back here would clobber other pages' changes (every page
          // saves its FULL config) and re-trigger this listener in a loop
          this.props.updateConfigFromStorage(changedConfig)
        }
      }

      // IDE window opened/closed → panel routing changes in the background
      // state; only these two fields matter (background_state also changes on
      // every tab switch via lastActivated — don't re-check on those)
      if (storage.key === C.STATE_STORAGE_KEY) {
        const oldTabIds = (storage.oldValue && storage.oldValue.tabIds) || {}
        const newTabIds = (storage.newValue && storage.newValue.tabIds) || {}
        if (oldTabIds.panel !== newTabIds.panel || oldTabIds.lastPanelWindow !== newTabIds.lastPanelWindow) {
          this.checkIdeWindowOpen()
        }
      }
    })
  }

  componentDidUpdate(prevProps) {
    // config may hydrate only after the first render — retry the restore then
    if (prevProps.config.lastSidebarTab !== this.props.config.lastSidebarTab) {
      this.maybeRestoreLastTab()
    }

    if (prevProps.config.openAiChatTabOnce !== this.props.config.openAiChatTabOnce) {
      this.maybeOpenAiChatOnFirstRun()
    }

    // replay started while the Files tab is open: show the run in the Macro
    // tab. JS script runs are EXCLUDED here: every uiv.* call is its own
    // short player run, so the status flips per command and this logic would
    // ping-pong between the tabs — the script runner's status event drives
    // the same behavior once per script run instead (see componentDidMount).
    if (!isScriptRunning() && prevProps.status !== C.APP_STATUS.PLAYER && this.props.status === C.APP_STATUS.PLAYER) {
      this.onAnyRunStarted()
    }

    // replay ended: go back to Files on success; on error stay on the Macro
    // tab, where the failed command and the error status are visible
    if (!isScriptRunning() && prevProps.status === C.APP_STATUS.PLAYER && this.props.status !== C.APP_STATUS.PLAYER) {
      this.onAnyRunEnded()
    }

    if (
      prevProps.logs_ !== this.props.logs_ ||
      prevProps.player !== this.props.player ||
      prevProps.status !== this.props.status ||
      prevProps.editing.meta.src !== this.props.editing.meta.src ||
      prevProps.ui.sidebarTab !== this.props.ui.sidebarTab ||
      // scripts publish their progress OUTSIDE the player state: the line
      // marker moves and the run starts/ends without any of the props above
      // changing (pure-JS stretches between bridge calls log nothing)
      prevProps.ui.scriptLine !== this.props.ui.scriptLine ||
      prevProps.ui.scriptRunning !== this.props.ui.scriptRunning
    ) {
      this.refreshStatusText()
    }
  }

  // status bar text: macro name / run progress / last run result;
  // "Welcome :)" when no macro is selected yet (e.g. right after startup)
  refreshStatusText = () => {
      let fullStatusText = ''

      if (['Files', 'Macro', 'Logs'].includes(this.getActiveTab())) {
        // If user selects macro, then the macro name is shown in status bar
        // Status bar should contain macro result. So either the error message or "[info] Macro completed (Runtime 6.66s)" => So same text as in log file (or similar text, whatever is easier)
        const { status, player } = this.props

        const renderInner = () => {
          // A running JS script drives its commands through the SESSION fast
          // path, which never sets app status to PLAYER — only its occasional
          // player-path commands (open, uiv.run) do. Statuswise the script is
          // "not playing" most of the time, so without this the bar flickered
          // between "Line N" and the stale result line of an EARLIER macro
          // while a script was visibly running. ui.scriptRunning is published
          // by the runner for exactly this; the module flag is the fallback.
          const scriptRun = (this.props.ui && this.props.ui.scriptRunning) || isScriptRunning()
          if (scriptRun && status !== C.APP_STATUS.RECORDER) {
            this._lastMacroLog = null // after the run, re-read the fresh result line
            const scriptLine = this.props.ui && this.props.ui.scriptLine
            return scriptLine ? `Line ${scriptLine}` : 'Running'
          }

          switch (status) {
            case C.APP_STATUS.RECORDER:
              return 'Recording'
            case C.APP_STATUS.PLAYER: {
              this._lastMacroLog = null
              switch (player.status) {
                case C.PLAYER_STATUS.PLAYING: {
                  const { nextCommandIndex, loops, currentLoop, timeoutStatus } = player
                  if (nextCommandIndex === null || loops === null || currentLoop === 0) {
                    return ''
                  }

                  // A JS script drives the player one command at a time, so
                  // nextCommandIndex is always 0 — permanently "Line 1". The
                  // runner publishes the real script line to ui.scriptLine.
                  const scriptLine = this.props.ui && this.props.ui.scriptLine
                  // Is this a script run? ui.scriptRunning is published by the runner into
                  // the same redux slice as ui.scriptLine, so the two cannot disagree.
                  // The module flag and the open macro stay as fallbacks.
                  const scriptRun = (this.props.ui && this.props.ui.scriptRunning) ||
                    isScriptRunning() ||
                    typeof (this.props.editing && this.props.editing.script) === 'string'
                  // "Round x/y" only when it's an actual loop replay ("Play in
                  // loop.." on a macro or folder) — a plain play has loops = 1
                  const parts = scriptRun
                    ? [scriptLine ? `Line ${scriptLine}` : 'Running']
                    : [
                        `Line ${nextCommandIndex + 1}`,
                        ...(loops > 1 ? [`Round ${currentLoop}/${loops}`] : [])
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
              // pick between macro name or macro stopped log, whichever is latest
              if (!this.getLatestMacroLog()) {
                this._lastStatus = this._lastSelectedMacroName = this.getMacroName()
              } else {
                if (this._lastMacroLog !== this.getLatestMacroLog()) {
                  this._lastStatus = this._lastMacroLog = this.getLatestMacroLog()
                } else if (this._lastSelectedMacroName !== this.getMacroName()) {
                  this._lastStatus = this._lastSelectedMacroName = this.getMacroName()
                }
              }
              return this._lastStatus
          }
        }

        fullStatusText = renderInner()
        // ... and if it is too long, then show it in a tooltip
        const shortStatus = fullStatusText.length > 40 ? fullStatusText.substring(0, 40).replace(/(\s+\S+)$/, '...') : fullStatusText
        this.setState({ fullStatusText, shortStatus })
      }
  }

  prefixHardDisk(str) {
    const isXFileMode = getStorageManager().isXFileMode()
    if (!isXFileMode) return str

    return (
      <div
        style={{
          display: 'inline-block'
        }}
      >
        <img
          src="./img/hard-drive.svg"
          style={{
            position: 'relative',
            top: '3px',
            marginRight: '5px',
            height: '15px'
          }}
        />
        <span>{str}</span>
      </div>
    )
  }


  getMacroName() {
    const { src } = this.props.editing.meta
    // no macro selected at all (fresh start) — friendly greeting instead of a blank bar
    if (!src) return 'Welcome :)'
    return src.name && src.name.length ? src.name : 'Untitled'
  }

  getLatestMacroLog() {
    const { player, logs_ } = this.props
    if (player.status === C.PLAYER_STATUS.STOPPED && logs_ && logs_.length) {
      // Result lines of both runners count, success AND failure: the classic
      // player writes "Macro completed/failed (Runtime …)" (always type info),
      // a script writes "<name> completed (Runtime …)" (info) or "<name>
      // failed/stopped: … (Runtime …)" (error). All of them — and only they —
      // END with "(Runtime …)", so that is the signature matched. Matching
      // only "completed" lines made the bar show a long-gone SUCCESS of some
      // other macro while the macro at hand had just failed. No match means
      // no finished run yet: return '' so the macro name shows.
      const latestMacroLogs = logs_.filter(
        (log) => (log.type === 'info' || log.type === 'error') && /\(Runtime [^)]*\)\s*$/.test(log.text || '')
      )
      const latestMacroLog = latestMacroLogs[latestMacroLogs.length - 1]
      if (latestMacroLog) {
        return `[${latestMacroLog.type}] ` + latestMacroLog.text
      }
    }
    return ''
  }

  renderStatus(statusText) {
    console.log('renderStatus:>> statusText:  ', statusText)
    if (statusText) {
    let fullStatusText = statusText
      // ... and if it is too long, then show it in a tooltip
      const shortStatus = fullStatusText.length > 40 ? fullStatusText.substring(0, 40).replace(/(\s+\S+)$/, '...') : fullStatusText
      this.setState({ fullStatusText, shortStatus })
    }
  } 

  showDesktopIcon() {
    const { ui, config } = this.props
    const doShowDesktopIcon =
      (isCVTypeForDesktop(config.cvScope) && ui.shouldEnableDesktopAutomation !== false) || ui.shouldEnableDesktopAutomation === true
    // clicking the mode icon jumps to the Vision settings tab, where the
    // browser/desktop automation scope is configured
    return (
      <div
        className="vision-type"
        title={doShowDesktopIcon ? 'Desktop automation mode — click for Vision settings' : 'Browser automation mode — click for Vision settings'}
        onClick={() => openSettings('vision')}
      >
        {doShowDesktopIcon ? <ComputerSvg /> : <BrowserSvg />}
      </div>
    )
  }

  render() {
    return (
      <div
        className={cn('sidepanel')}
        ref={(el) => {
          this.$dom = el
        }}
        style={{ minWidth: this.getSideBarMinWidth() }}
        onClickCapture={this.onClickSidebar}
      >
        {this.renderMcpControlBanner()}
        <div
          className={cn('sidebar-inner', {
            'no-tab': !this.props.config.showTestCaseTab
          })}
        >
          <Tabs
            type="card"
            defaultActiveKey="Files"
            activeKey={this.props.ui.sidebarTab || 'Files'}
            onChange={this.onChangeTab}
            tabBarExtraContent={{ right: this.showDesktopIcon() }}
            items={[
              {
                key: 'Files',
                label: 'Files',
                children: <Files />
              },
              {
                key: 'Macro',
                // sparkle while the AI chat agent drives a run — tells the
                // user why the tab switched and the macro plays "by itself"
                label: this.props.ui.aiRunningMacro ? (
                  <Tooltip title="The AI is running this macro">
                    <span>Macro ✨</span>
                  </Tooltip>
                ) : (
                  'Macro'
                ),
                children: <Macro />
              },
              {
                key: 'AiChat',
                label: 'AI Chat ✨',
                // fills the whole tab area: conversation scrolls, composer pinned
                className: 'full-height-pane',
                children: <AiChat renderStatus={this.renderStatus} />
              },
              {
                // key stays 'Logs' so persisted ui.sidebarTab values and the
                // existing tab-switch logic keep working — only the label
                // changed when the tab grew the Screenshots/CSV/Visual lists
                key: 'Logs',
                label: 'Data',
                children: <Logs />
              }
            ]}
          ></Tabs>
        </div>
        {this.renderStatusBar()}
        {this.renderBottomBar()}
        {this.renderIdeOpenOverlay()}
        {/* one-time "which editor(s)?" choice; renders nothing once answered */}
        <MacroSetupDialog />
        {/* "grant the macOS/Wayland permissions" nudge after a native-app
            install; renders nothing once handled */}
        <DaSetupDialog />
      </div>
    )
  }
}

export default connect(
  (state) => ({
    status: state.status,
    editing: state.editor.editing,
    player: state.player,
    config: state.config,
    ui: state.ui,
    mcpBridgeLabel: state.mcpBridgeLabel,
    mcpBridgeClient: state.mcpBridgeClient,
    logs_: state.logs,
    macrosExtra: state.editor.macrosExtra
  }),
  (dispatch) => bindActionCreators({ ...actions }, dispatch)
)(Sidepanel)
