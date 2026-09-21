import React from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
// import {  Link } from "react-router-dom";
import {
  Button,
  message,
  Modal,
  Popover
} from "antd";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { SettingOutlined } from "@ant-design/icons";
// Deep-path imports keep webpack from bundling the whole icon set (same play
// control icons as the side panel's control bar, plus Step and Rec)
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCirclePlay } from "@fortawesome/free-regular-svg-icons/faCirclePlay";
import { faCirclePause } from "@fortawesome/free-regular-svg-icons/faCirclePause";
import { faCircleStop } from "@fortawesome/free-regular-svg-icons/faCircleStop";
import { faCircleDot } from "@fortawesome/free-regular-svg-icons/faCircleDot";
import { faForwardStep } from "@fortawesome/free-solid-svg-icons/faForwardStep";
import "antd/dist/reset.css";
import * as actions from "../actions";
import { Actions as simpleActions } from "../actions/simple_actions";
import * as C from "../common/constant";
import { isCVTypeForDesktop } from "../common/cv_utils";
import { getPlayer, Player } from "../common/player";
import { cn, setIn } from "../common/utils";
import { goUivUrl } from "../common/uiv_link";
import Ext from "../common/web_extension";
import { getState, updateState } from "../ext/common/global_state";
import { getPlayTab, openSettings, resizeIdeWindowForAiChat } from "../ext/common/tab";
import { isScriptPaused, isScriptRunning, onScriptEvent, pauseScript, resumeScript, runScript, stepScript, stopScript } from "../modules/script_runner";
import { hasUnsavedMacro, isScriptMacroView } from "../recomputed";
import { getLicenseService } from "../services/license";
import { Feature } from "../services/license/types";
import "./header.scss";
import getSaveTestCase from "./save_test_case";


function withRouter(Component) {
  function ComponentWithRouterProp(props) {
    let location = useLocation();
    let navigate = useNavigate();
    let params = useParams();
    return <Component {...props} router={{ location, navigate, params }} />;
  }

  return ComponentWithRouterProp;
}

class Header extends React.Component {
  state = {
    // pulse the ✨ button for a few seconds on a fresh IDE open, then stop
    // for the rest of the session (cleared by a timer in componentDidMount)
    aiIconAttention: true,

    // JS script runner status (lives outside redux) — mirrored so the play
    // actions react to script runs: 'stopped' | 'running' | 'paused'
    scriptStatus: isScriptRunning() ? (isScriptPaused() ? "paused" : "running") : "stopped"
  };

  unsubscribeScript = null;

  // JS script macro open — its program lives in editing.script; the play
  // actions run it through the interpreter instead of the player
  isScriptMacro = () => {
    return typeof this.props.editing.script === "string";
  };

  playCurrentScript = () => {
    if (this.state.scriptStatus !== "stopped") return;
    const reportStartFailure = (e) => {
      const msg = `Script failed to start: ${(e && e.message) || e}`;
      message.error(msg, 3);
      try { this.props.addLog("error", msg); } catch (e2) { /* log unavailable */ }
      console.error("JS script start failure", e);
    };
    try {
      runScript(this.props.editing.script).catch(reportStartFailure);
    } catch (e) {
      reportStartFailure(e);
    }
  };

  getPlayer = (name) => {
    if (name) return getPlayer({ name });

    switch (this.props.player.mode) {
      case C.PLAYER_MODE.TEST_CASE:
        return getPlayer({ name: "testCase" });

      case C.PLAYER_MODE.TEST_SUITE:
        return getPlayer({ name: "testSuite" });
    }
  };

  getTestCaseName = () => {
    const { src } = this.props.editing.meta;
    return src && src.name && src.name.length ? src.name : "Untitled";
  };

  onToggleRecord = async () => {
    if (isCVTypeForDesktop(this.props.config.cvScope)) {
      const msg =
        "Recording is only available for browser automation. Desktop automation macros are created by adding XClick and other visual commands step by step.";

      this.props.addLog("warning", msg);
      return message.warn(msg, 2.5);
    }

    const tabInfo = await this.getCurrentRecordedtab();
    if (!tabInfo || !/^(https?:|file:)/.test(tabInfo.url)) {
      return message.error(
        "Web recording works only on normal browser pages. For other pages, please use desktop automation."
      );
    }

    if (this.props.status === C.APP_STATUS.RECORDER) {
      this.props.stopRecording();
      // Note: remove targetOptions from all commands (table recordings only —
      // a JS recording writes script lines, there are no commands to touch)
      if (!this.props.isScriptView) {
        this.props.normalizeCommands();
      }
    } else {
      console.log('startRecording:>> askPermission')
      const permissionResult = await this.askPermission()
      console.log('startRecording:>> askPermission complete: permissionResult:>>', permissionResult)
      if(!permissionResult) {
        return
      }
      this.props.startRecording();
    }

    this.setState({ lastOperation: "record" });
  };

  // (the old "Play loop.." toolbar button was removed 2026-07. Loop replays
  // live in the Files tab context menu instead: "Play in loop.." on a macro,
  // "Play all in folder in loop.." on a folder. In-macro alternatives: times..end
  // (classic) or for/while (JS scripts). There is NO `loop` command line /
  // bookmark parameter: it is not in INVOKE_URL_PARAMS and RUN_TEST_CASE
  // always plays MODE.STRAIGHT)

  onClickSave = () => {
    return getSaveTestCase().save();
  };

  getCurrentRecordedtab = async () => {
    return new Promise((resolve, reject) => {
      Ext.tabs.query({ active: true }).then((tabs) => {
        if (tabs.length != 0) {
          getPlayTab().then((tab) => {
            resolve(tab);
          });
        } else {
          resolve(false);
        }
      });
    });
  };

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
  };

  // firefox requires explicit permission to access all urls
  // ask user to grant permission, return promise
  askPermission = () => {

    // test code:
    // const permissions = chrome.runtime.getManifest().permissions || [];
    // console.log('permission:>> ', permissions)   
    // let allUrlPermissions = {
    //   origins: ["<all_urls>"],
    //   permissions: ['activeTab', 'tabs']
    // };    
    // return new Promise((resolve, reject) => {  
    //   Ext.permissions.request(allUrlPermissions).then((result) => {
    //     console.log('permission result:>>', result)
    //     resolve(true)
    //   }).catch(e => {
    //     console.log('e:>>', e)
    //   })
    // })

    return new Promise((resolve, reject) => {
      if (Ext.isFirefox()) {
        Ext.permissions.contains({ origins: ["<all_urls>"]}).then(
          (permissionGranted) => {
            if (!permissionGranted) { 
              Modal.confirm({
                title: "Grant Permission To Replay Macros",
                content: `Ui.Vision is an open-source tool for automating tasks. To replay macros, it requires permission from Firefox to 'access data in all tabs'. If you click 'OK', Ui.Vision will open the Firefox permission dialog, allowing you to provide this permission. Continue?`,
                okText: "Continue",
                cancelText: "Cancel",
                onOk: () => { 
                  Ext.permissions.request({origins: ['<all_urls>']}).then((result) => {
                    console.log('permission result:>>', result)  
                    if(result) {                    
                      resolve(true)
                    } else {
                      // visit https://go.ui.vision/?help=firefox_access_data_permission in new tab 
                      Ext.tabs.create({
                        url: goUivUrl('https://go.ui.vision/?help=firefox_access_data_permission'),
                        active: true
                      })
                      resolve(false)
                    }
                  })                  
                },
                onCancel: () => { 
                  // visit https://go.ui.vision/?help=firefox_access_data_permission in new tab 
                  Ext.tabs.create({
                    url: goUivUrl('https://go.ui.vision/?help=firefox_access_data_permission'),
                    active: true
                  })
                  
                  resolve(false) 
                },
              })
            } else {
              resolve(true);
            }
          }  
        )
      } else {
        resolve(true);
      }
    })
  }

  playCurrentMacro = async (isStep) => {
    const permissionResult = await this.askPermission();
    if(!permissionResult) {
      return
    }

    if (this.isScriptMacro()) {
      this.playCurrentScript();
      // Step from idle: start the run already paused at the first line —
      // the pause request is consumed at the first line change
      if (isStep) pauseScript();
      return;
    }

    const state = await getState();
    const bwindowId = state.tabIds.bwindowId;
    const wTab = bwindowId != "" ? await this.checkWindowisOpen(bwindowId) : "";
    Ext.tabs.query({ active: true }).then((tabs) => {
      if (tabs.length === 0) {
        getPlayTab().then((tab) => {
          updateState(setIn(["tabIds", "toPlay"], tab.id));
          const { commands } = this.props.editing;
          const { src } = this.props.editing.meta;
          const openTc = commands.find(
            (tc) => tc.cmd.toLowerCase() === "open" || "openbrowser"
          );
          this.setState({ lastOperation: "play" });
          this.props.playerPlay({
            macroId: src && src.id,
            title: this.getTestCaseName(),
            extra: {
              id: src && src.id,
            },
            mode: getPlayer().C.MODE.STRAIGHT,
            playUrl: tab.url,
            playtabIndex: tab.index,
            playtabId: tab.id,
            startIndex: 0,
            startUrl: openTc ? openTc.target : null,
            resources: commands,
            postDelay: this.props.config.playCommandInterval * 1000,
            isStep: isStep,
            superFast: false,
            hasOnDownloadCmd: false
          });
        });
      } else {
        const tab = wTab != "" ? wTab : tabs[0];
        updateState(setIn(["tabIds", "toPlay"], tab.id));
        const { commands } = this.props.editing;
        const { src } = this.props.editing.meta;
        const openTc = commands.find(
          (tc) => tc.cmd.toLowerCase() === "open" || "openbrowser"
        );
        this.setState({ lastOperation: "play" });
        this.props.playerPlay({
          macroId: src && src.id,
          title: this.getTestCaseName(),
          extra: {
            id: src && src.id,
          },
          mode: getPlayer().C.MODE.STRAIGHT,
          playUrl: tab.url,
          playtabIndex: tab.index,
          playtabId: tab.id,
          startIndex: 0,
          startUrl: openTc ? openTc.target : null,
          resources: commands,
          postDelay: this.props.config.playCommandInterval * 1000,
          isStep: isStep,
          superFast: false,
          hasOnDownloadCmd: false
        });
      }
    });
  };

  playCurrentLine = () => {
    const { commands } = this.props.editing;
    const { src, selectedIndex } = this.props.editing.meta;
    const commandIndex = selectedIndex === -1 ? 0 : selectedIndex || 0;

    return this.props.playerPlay({
      macroId: src && src.id,
      title: this.getTestCaseName(),
      extra: {
        id: src && src.id,
      },
      mode: Player.C.MODE.SINGLE,
      startIndex: commandIndex,
      startUrl: null,
      resources: commands,
      postDelay: this.props.config.playCommandInterval * 1000,
      callback: (err, res) => {
        if (err) return;

        // Note: auto select next command
        if (commandIndex + 1 < commands.length) {
          this.props.selectCommand(commandIndex + 1, true);
        }
      },
    });
  };

  beforeUnloadHandler = (event) => {
    const { hasUnsaved } = this.props;
    if (hasUnsaved) {
      // Note: Chrome is showing the default message anyway
      const promptMessage =
        "You have unsaved Changes. Do you want to save before leaving application?";
      event.returnValue = promptMessage;
      return promptMessage;
    }
  };

  componentDidMount() {
    const { location, navigate, params } = this.props.router;

    // stop the ✨ attention pulse after its ~5 pulses have played; keeping a
    // state flag (not animation-iteration-count alone) prevents a replay every
    // time the Record/Play button row re-mounts after a run
    this.aiIconAttentionTimer = setTimeout(() => {
      this.setState({ aiIconAttention: false });
    }, 7000);
    // note: Header lives as long as the IDE page, so no unmount cleanup
    // hook exists in this component; the one-shot timer is harmless anyway

    // JS script runs: mirror the runner's status so the play actions show
    // Stop/Pause/Resume while a script runs (same page lifetime note as above)
    this.unsubscribeScript = onScriptEvent("status", (status) => {
      this.setState({ scriptStatus: status });
    });

    this.props.setRoute(location.pathname);
    // TODO: may require to fix this
    // this.props.history.listen((location, action) => {
    //   this.props.setRoute(location.pathname)
    // })

    window.addEventListener("beforeunload", this.beforeUnloadHandler);
  }

  renderStatus() {
    const { status, player } = this.props;
    const renderInner = () => {
      switch (status) {
        case C.APP_STATUS.RECORDER:
          return "Recording";

        case C.APP_STATUS.PLAYER: {
          switch (player.status) {
            case C.PLAYER_STATUS.PLAYING: {
              const { nextCommandIndex, loops, currentLoop, timeoutStatus } =
                player;

              if (
                nextCommandIndex === null ||
                loops === null ||
                currentLoop === 0
              ) {
                return "";
              }

              // A JS script drives the player one command at a time, so
              // nextCommandIndex is always 0 and "Round" is always 1/1 —
              // meaningless here. The runner publishes the real script line.
              const scriptLine = this.props.ui && this.props.ui.scriptLine
              // Is this a script run? ui.scriptRunning is published by the runner into
              // the same redux slice as ui.scriptLine, so the two cannot disagree.
              // The module flag and the open macro stay as fallbacks.
              const scriptRun = (this.props.ui && this.props.ui.scriptRunning) ||
                isScriptRunning() ||
                typeof (this.props.editing && this.props.editing.script) === 'string';
              const parts = scriptRun
                ? [scriptLine ? `Line ${scriptLine}` : "Running"]
                : [
                    `Line ${nextCommandIndex + 1}`,
                    `Round ${currentLoop}/${loops}`,
                  ];

              if (timeoutStatus && timeoutStatus.type && timeoutStatus.total) {
                const { type, total, past } = timeoutStatus;
                parts.unshift(`${type} ${past / 1000}s (${total / 1000})`);
              }

              return parts.join(" | ");
            }

            case C.PLAYER_STATUS.PAUSED:
              return "Player paused";

            default:
              return "";
          }
        }

        default:
          return "";
      }
    };

    return <div className="status">{renderInner()}</div>;
  }

  renderActions() {
    const { player, status } = this.props;

    if (status === C.APP_STATUS.RECORDER) {
      return (
        <div className="actions">
          <Button onClick={this.onToggleRecord} style={{ color: "#ff0000" }}>
            <FontAwesomeIcon icon={faCircleDot} />
            <span> Stop Record</span>
          </Button>
        </div>
      );
    }

    // JS script running: the classic player is only busy for split seconds
    // per bridge command, so key the UI off the script runner instead
    if (this.state.scriptStatus !== "stopped") {
      return (
        <div className="actions">
          <Button.Group>
            {this.state.scriptStatus === "paused" ? (
              // icon-only: keep it visually lighter than Stop/Resume
              <Button title="Step: run the next script line, stay paused" onClick={() => stepScript()}>
                <FontAwesomeIcon icon={faForwardStep} />
              </Button>
            ) : null}
            <Button title="Stop" onClick={() => stopScript()}>
              <FontAwesomeIcon icon={faCircleStop} />
              <span> Stop</span>
            </Button>
            {this.state.scriptStatus === "paused" ? (
              <Button type="primary" title="Resume" onClick={() => resumeScript()}>
                <FontAwesomeIcon icon={faCirclePlay} />
                <span> Resume</span>
              </Button>
            ) : (
              <Button title="Pause at the next script line" onClick={() => pauseScript()}>
                <FontAwesomeIcon icon={faCirclePause} />
                <span> Pause</span>
              </Button>
            )}
          </Button.Group>
        </div>
      );
    }

    switch (player.status) {
      case C.PLAYER_STATUS.PLAYING: {
        return (
          <div className="actions">
            <Button.Group>
              <Button title="Stop" onClick={() => this.getPlayer().stop()}>
                <FontAwesomeIcon icon={faCircleStop} />
                <span> Stop</span>
              </Button>
              <Button title="Pause" onClick={() => this.getPlayer("testCase").pause()}>
                <FontAwesomeIcon icon={faCirclePause} />
                <span> Pause</span>
              </Button>
            </Button.Group>
          </div>
        );
      }

      case C.PLAYER_STATUS.PAUSED: {
        return (
          <div className="actions">
            <Button.Group>
              {this.props.player.mode === C.PLAYER_MODE.TEST_CASE ? (
                <Button title="Step: run the next command, stay paused" onClick={() => this.getPlayer("testCase").resume(true)}>
                  <FontAwesomeIcon icon={faForwardStep} />
                </Button>
              ) : null}
              <Button title="Stop" onClick={() => this.getPlayer().stop()}>
                <FontAwesomeIcon icon={faCircleStop} />
                <span> Stop</span>
              </Button>
              <Button type="primary" title="Resume" onClick={() => this.getPlayer("testCase").resume()}>
                <FontAwesomeIcon icon={faCirclePlay} />
                <span> Resume</span>
              </Button>
            </Button.Group>
          </div>
        );
      }

      case C.PLAYER_STATUS.STOPPED: {
        return (
          <div className="actions">
            {/* recording works in both editors: the JS view appends each
                action as a uiv.* line, the table view as a command row
                (see RECORD_ADD_COMMAND in src/index.js) */}
            <Button
              disabled={!getLicenseService().canPerform(Feature.Record)}
              title={this.props.isScriptView
                ? "Record — browser actions are appended to the script as uiv.* lines"
                : "Record"}
              onClick={this.onToggleRecord}
            >
              <FontAwesomeIcon icon={faCircleDot} />
              <span> Record</span>
            </Button>

            <Button.Group className="play-actions">
              <Button type="primary" title="Play the macro" onClick={() => this.playCurrentMacro(false)}>
                <FontAwesomeIcon icon={faCirclePlay} />
                <span> Play</span>
              </Button>
              <Button
                title={this.isScriptMacro()
                  ? "Step: start the script paused at the first line — then step through it line by line"
                  : "Step: play one command at a time"}
                onClick={() => this.playCurrentMacro(true)}
              >
                <FontAwesomeIcon icon={faForwardStep} />
              </Button>
              {/* constant row like the sidebar: Pause/Stop always visible,
                  disabled while nothing runs */}
              <Button title="Pause" disabled>
                <FontAwesomeIcon icon={faCirclePause} />
              </Button>
              <Button title="Stop" disabled>
                <FontAwesomeIcon icon={faCircleStop} />
              </Button>
            </Button.Group>
            {/* <Button onClick={async() => {
              await updateState({
                status: C.APP_STATUS.PLAYER,
                pendingPlayingTab: false,
                xClickNeedCalibrationInfo: null
              })
        
            }}>
              Send Command
            </Button> */}

            <Popover
              open={this.shouldShowAiChatHint()}
              placement="bottomRight"
              overlayClassName="ai-chat-hint-popover"
              content={
                <div className="ai-chat-hint">
                  <p>
                    <strong>AI Chat</strong> — tell the AI what to automate.
                    It builds the macro, runs it and fixes it until it works.
                    This button shows/hides the chat.
                  </p>
                  <Button size="small" type="primary" onClick={this.dismissAiChatHint}>
                    Got it
                  </Button>
                </div>
              }
            >
              <Button
                shape="circle"
                className={cn("btn-ai-chat", {
                  // draw the eye on a fresh IDE open — but only when the panel
                  // is closed; an open panel is its own advertisement
                  attention: this.state.aiIconAttention && !this.isAiChatOpen(),
                })}
                type={this.isAiChatOpen() ? "primary" : "default"}
                title={this.isAiChatOpen() ? "Hide AI Chat" : "Show AI Chat"}
                onClick={this.onToggleAiChat}
              >
                ✨
              </Button>
            </Popover>
            <Button shape="circle" title="Settings" onClick={() => openSettings()}>
              <SettingOutlined />
            </Button>
          </div>
        );
      }
    }
  }

  // same chat as the side panel's AI Chat tab, docked right of the editor
  // (app.js renders the panel); the window grows/shrinks with the panel.
  // The panel is open unless explicitly closed (undefined = open, so new
  // users see it) — derive the toggle from that, not from raw truthiness
  isAiChatOpen = () => this.props.config.showIdeAiChat !== false;

  onToggleAiChat = () => {
    const show = !this.isAiChatOpen();
    this.props.updateConfig({ showIdeAiChat: show });
    resizeIdeWindowForAiChat(show, this.props.config.ideAiChatWidth);
  };

  // intro bubble pointing at the ✨ button — shown while the panel is CLOSED
  // (an open panel explains itself) and until the user clicks "Got it"; only
  // that click retires it, so everyone sees it at least once
  shouldShowAiChatHint = () =>
    !this.props.config.ideAiChatHintDismissed &&
    !this.isAiChatOpen();

  dismissAiChatHint = () => {
    if (this.props.config.ideAiChatHintDismissed) return;
    this.props.updateConfig({ ideAiChatHintDismissed: true });
  };

  renderMacro() {
    const { editing, player, hasUnsaved } = this.props;
    const { src } = editing.meta;
    const isPlayerStopped = player.status === C.PLAYER_STATUS.STOPPED;
    const klass = hasUnsaved ? "unsaved" : "";

    const saveBtnState = {
      text: src ? "Save" : "Save..",
      disabled: !hasUnsaved,
    };

    return (
      <div className="select-case">
        <span
          title={src ? src.name : "Untitled"}
          className={"test-case-name " + klass}
        >
          {src ? src.name : "Untitled"}
        </span>

        {!isPlayerStopped ? null : (
          <Button disabled={saveBtnState.disabled} onClick={this.onClickSave}>
            <span>{saveBtnState.text}</span>
          </Button>
        )}
      </div>
    );
  }

  render() {
    const { player } = this.props;
    const isPlayerStopped = player.status === C.PLAYER_STATUS.STOPPED;



    return (
      <div className={"header " + this.props.status.toLowerCase()}>
        {this.renderMacro()}
        {this.renderStatus()}
        {this.renderActions()}
      </div>
    );
  }
}

export default connect(
  (state) => ({
    hasUnsaved: hasUnsavedMacro(state),
    route: state.route,
    editing: state.editor.editing,
    player: state.player,
    status: state.status,
    config: state.config,
    ui: state.ui,
    proxy: state.proxy,
    // same answer as the JS editor / the recorder's own routing, so Record
    // never disagrees with where the recorded lines land
    isScriptView: isScriptMacroView(state),
  }),
  (dispatch) => bindActionCreators({ ...actions, ...simpleActions }, dispatch)
)(withRouter(Header));
