import React from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
// import {  Link } from "react-router-dom";
import {
  Button,
  Checkbox,
  Col,
  Dropdown,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Row,
  Select,
  Tabs
} from "antd";
import copyToClipboard from "copy-to-clipboard";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import CONFIG from '@/config';
import { ocrViewport, ocrViewportCalibration } from "@/modules/ocr.ts";
import { SettingOutlined } from "@ant-design/icons";
import "antd/dist/reset.css";
import * as actions from "../actions";
import { Actions, Actions as simpleActions } from "../actions/simple_actions";
import * as C from "../common/constant";
import { fromHtml, generateEmptyHtml } from "../common/convert_utils";
import { isCVTypeForDesktop } from "../common/cv_utils";
import { encrypt } from "../common/encrypt";
import ipc from "../common/ipc/ipc_cs";
import FileSaver from "../common/lib/file_saver";
import { getPlayer, Player } from "../common/player";
import { readFileAsText } from "../common/ts_utils";
import { cn, compose, range, setIn, updateIn } from "../common/utils";
import Ext from "../common/web_extension";
import { getState, updateState } from "../ext/common/global_state";
import { getPlayTab } from "../ext/common/tab";
import { hasUnsavedMacro } from "../recomputed";
import { store } from '../redux';
import { isNetworkError } from "../services/api/http_api";
import { restoreBackup } from "../services/backup/restore";
import { getLicenseService } from "../services/license";
import { Feature } from "../services/license/types";
import { isOcrSpaceFreeKey, testOcrSpaceAPIKey } from "../services/ocr";
import { ocrLanguageOptions, tesseractLanguageOptions } from "../services/ocr/languages";
import { parseProxyUrl } from "../services/proxy";
import { importSideProject } from "../services/side/convert";
import { getStorageManager, StorageManagerEvent } from "../services/storage";
import { getXScreenCapture } from "../services/xmodules/x_screen_capture";
import { getXUserIO } from "../services/xmodules/x_user_io";
import { getXDesktop } from "../services/xmodules/xdesktop";
import { getXFile } from "../services/xmodules/xfile";
import { getXLocal } from "../services/xmodules/xlocal";
import "./header.scss";
import getSaveTestCase from "./save_test_case";
import AITab from "./settings_modal/tabs/ai";


const OSType = (() => {
  const ua = window.navigator.userAgent;
  if (/windows/i.test(ua)) return "windows";
  if (/mac/i.test(ua)) return "mac";
  return "linux";
})();

function withRouter(Component) {
  function ComponentWithRouterProp(props) {
    let location = useLocation();
    let navigate = useNavigate();
    let params = useParams();
    return <Component {...props} router={{ location, navigate, params }} />;
  }

  return ComponentWithRouterProp;
}

const applyPresetLicense = (registerKey) => {
  if(getLicenseService().isProLicense() || getLicenseService().isPersonalLicense() ){
    console.log("license already active.")
    return
  }
  getLicenseService().checkLicense(registerKey).then((license) => {
    if (license.status === "key_not_found") {
      console.error("License key not found");
    }
    console.log(`license status: ${license.status}`);
  })
  .catch((e) => {
    const text = isNetworkError(e)
      ? "Internet connection required for activation. If you want use the software on a machine without Internet connection, please contact tech support"
      : e.message;
     console.error(text);
  })
}

class Header extends React.Component {
  state = {
    showPlayLoops: false,
    loopsStart: 1,
    loopsEnd: 3,
    xModules: [getXFile(), getXUserIO(), getXDesktop(), getXScreenCapture()],
    xModuleData: {},
    xModuleDataLocal: {},
    xFileRootDirChanged: false,
    registerKey: "",
    websiteWhiteListText: "",

    // Security Tab - Encrypt Text
    textToEncrypt: "",
    encryptedText: "",
    showText: false,

    isCheckingLicense: false,
    ocrLanguageOptions: this.props.config.ocrLanguageOption,
    tesseractLanguageOptions: tesseractLanguageOptions,

    userEnteredOCRAPIKey: "",
    connectedAPIEndpointType: null // null | "free" | "pro"
  };

   getConnectedAPIEndpointType = (ocrSpaceApiKey) => {
    const apiEndpointType = ocrSpaceApiKey ? (isOcrSpaceFreeKey(ocrSpaceApiKey) ? "free" : "pro") : null
    return Promise.resolve(apiEndpointType);
  }

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

  togglePlayLoopsModal = (toShow) => {
    this.setState({
      showPlayLoops: toShow,
    });
  };

  onToggleRecord = async () => {
    if (isCVTypeForDesktop(this.props.config.cvScope)) {
      const msg =
        "Recording is only available for browser automation. Desktop automation macros are created by adding XClick and other visual commands step by step.";

      this.props.addLog("warning", msg);
      return message.warn(msg, 2.5);
    }

    const tabInfo = await this.getCurrentRecordedtab();
    if (!/^(https?:|file:)/.test(tabInfo.url)) {
      return message.error(
        "Web recording works only on normal browser pages. For other pages, please use desktop automation."
      );
    }

    if (this.props.status === C.APP_STATUS.RECORDER) {
      this.props.stopRecording();
      // Note: remove targetOptions from all commands
      this.props.normalizeCommands();
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

  // Play loops relative
  onClickPlayLoops = async (isStep) => {
    const state = await getState();
    const bwindowId = state.tabIds.bwindowId;
    const wTab = bwindowId != "" ? await this.checkWindowisOpen(bwindowId) : "";
    Ext.tabs.query({ active: true }).then((tabs) => {
      if (tabs.length === 0) {
        getPlayTab().then((tab) => {
          updateState(setIn(["tabIds", "toPlay"], tab.id));
          const { loopsStart, loopsEnd } = this.state;

          if (loopsStart < 0) {
            return message.error("Start value must be no less than zero", 1.5);
          }

          if (loopsEnd < loopsStart) {
            return message.error(
              "Max value must be greater than start value",
              1.5
            );
          }

          const player = this.getPlayer();
          const { commands } = this.props.editing;
          const { src } = this.props.editing.meta;
          const openTc = commands.find(
            (tc) => tc.cmd.toLowerCase() === "open" || "openbrowser"
          );

          this.props.playerPlay({
            macroId: src && src.id,
            loopsEnd,
            loopsStart,
            title: this.getTestCaseName(),
            extra: {
              id: src && src.id,
            },
            mode: player.C.MODE.LOOP,
            playUrl: tab.url,
            playtabIndex: tab.index,
            playtabId: tab.id,
            startIndex: 0,
            startUrl: openTc ? openTc.target : null,
            resources: this.props.editing.commands,
            postDelay: this.props.config.playCommandInterval * 1000,
          });

          this.setState({ lastOperation: "play" });
          this.togglePlayLoopsModal(false);
        });
      } else {
        const tab = wTab != "" ? wTab : tabs[0];
        updateState(setIn(["tabIds", "toPlay"], tab.id));
        const { loopsStart, loopsEnd } = this.state;

        if (loopsStart < 0) {
          return message.error("Start value must be no less than zero", 1.5);
        }

        if (loopsEnd < loopsStart) {
          return message.error(
            "Max value must be greater than start value",
            1.5
          );
        }

        const player = this.getPlayer();
        const { commands } = this.props.editing;
        const { src } = this.props.editing.meta;
        const openTc = commands.find(
          (tc) => tc.cmd.toLowerCase() === "open" || "openbrowser"
        );

        this.props.playerPlay({
          macroId: src && src.id,
          loopsEnd,
          loopsStart,
          title: this.getTestCaseName(),
          extra: {
            id: src && src.id,
          },
          mode: player.C.MODE.LOOP,
          playUrl: tab.url,
          playtabIndex: tab.index,
          playtabId: tab.id,
          startIndex: 0,
          startUrl: openTc ? openTc.target : null,
          resources: this.props.editing.commands,
          postDelay: this.props.config.playCommandInterval * 1000,
        });

        this.setState({ lastOperation: "play" });
        this.togglePlayLoopsModal(false);
      }
    });
  };

  onCancelPlayLoops = () => {
    this.togglePlayLoopsModal(false);
    this.setState({
      loopsToPlay: 2,
    });
  };

  onChangePlayLoops = (field, value) => {
    this.setState({
      [field]: parseInt(value, 10),
    });
  };

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
                      // visit https://goto.ui.vision/x/idehelp?help=firefox_access_data_permission in new tab 
                      Ext.tabs.create({
                        url: 'https://goto.ui.vision/x/idehelp?help=firefox_access_data_permission',
                        active: true
                      })
                      resolve(false)
                    }
                  })                  
                },
                onCancel: () => { 
                  // visit https://goto.ui.vision/x/idehelp?help=firefox_access_data_permission in new tab 
                  Ext.tabs.create({
                    url: 'https://goto.ui.vision/x/idehelp?help=firefox_access_data_permission',
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

  checkRegisterKey = () => {
    const { registerKey } = this.state;
    const checkBasicPattern = (str) => {
      return str.length === 15 && str.charAt(0) === "K";
    };
    const checkUnregistered = (str) => str === "freeman";

    if (checkUnregistered(registerKey)) {
      this.props.updateConfig({ xmodulesStatus: "unregistered" });
      message.success(`Unregistered`);
      getStorageManager().emit(StorageManagerEvent.RootDirChanged);
      this.resetRegisterKey();
      this.forceUpdate();
      return;
    }

    const notifyLicenseError = () => message.error("Invalid license key");

    if (!checkBasicPattern(registerKey)) {
      return notifyLicenseError();
    }

    this.setState({ isCheckingLicense: true });

    return getLicenseService()
      .checkLicense(registerKey)
      .then((license) => {
        if (license.status === "key_not_found") {
          return notifyLicenseError();
        }

        this.resetRegisterKey();
        this.forceUpdate();
        getStorageManager().emit(StorageManagerEvent.RootDirChanged);
        message.success("License key verified");
      })
      .catch((e) => {
        const text = isNetworkError(e)
          ? "Internet connection required for activation. If you want use the software on a machine without Internet connection, please contact tech support"
          : e.message;

        message.error(text, 4);
      })
      .finally(() => {
        this.setState({ isCheckingLicense: false });
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

    this.props.setRoute(location.pathname);
    // TODO: may require to fix this
    // this.props.history.listen((location, action) => {
    //   this.props.setRoute(location.pathname)
    // })

    getLicenseService().getLatestInfo((info) => {
      this.setState({
        licenseInfo: info,
      });
    });

    this.getConnectedAPIEndpointType(this.props.config.ocrSpaceApiKey).then((apiEndpointType) => {
      this.setState({
        connectedAPIEndpointType: apiEndpointType
      })
    });

    // preset #210
    // uncomment the following line to activate it
    // applyPresetLicense('LICENSE KEY HERE')

    window.addEventListener("beforeunload", this.beforeUnloadHandler);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.ui.showSettings && !this.props.ui.showSettings) {
      this.onShowSettings();
    }

    if (
      nextProps.ui.showWebsiteWhiteList &&
      !this.props.ui.showWebsiteWhiteList
    ) {
      this.setState({
        websiteWhiteListText: (this.props.config.websiteWhiteList || []).join(
          "\n"
        ),
      });
    }
  }

  initLocalXmodule() {
    getXLocal()
      .getVersionLocal()
      .then((data) => {
        const { installed, version } = data;
        const p = !installed ? Promise.resolve() : getXLocal().initConfig();
        p.catch((e) => {}).then(() => {
          this.setState(
            updateIn(
              ["xModuleDataLocal", getXLocal().getName()],
              (orig) => ({
                ...orig,
                ...data,
                config: getXLocal().getCachedConfig(),
              }),
              this.state
            )
          );
        });
      });
  }
  initXModules() {
    const xModules = this.state.xModules;

    // versionInfo: {
    //  installed: boolean
    //  version: string
    // },
    // checkResult: {
    //  error: string | null
    // }
    Promise.all(
      xModules.map((mod) => {
        // Note: call init config for each xmodule and discard any error
        return mod
          .initConfig()
          .catch((e) => {})
          .then(() => mod.getVersion())
          .then((versionInfo) => {
            if (versionInfo.installed) {
              return mod
                .sanityCheck()
                .then(
                  () => ({ error: null }),
                  (e) => ({ error: e.message })
                )
                .then((checkResult) => ({
                  versionInfo,
                  checkResult,
                }));
            } else {
              return {
                versionInfo,
                checkResult: null,
              };
            }
          });
      })
    ).then((results) => {
      const xModuleData = results.reduce((prev, r, i) => {
        prev[xModules[i].getName()] = {
          ...r.versionInfo,
          checkResult: r.checkResult,
          config: xModules[i].getCachedConfig(),
        };
        return prev;
      }, {});

      getXFile()
        .getVersion()
        .then((data) => {
          const { installed, version } = data;

          if (xModuleData.xFile != undefined) {
            xModuleData.xFile.installed = installed;
            xModuleData.xFile.version = version;
          }
          this.setState({
            xModuleData,
            xFileRootDirChanged: false,
          });
        });
    });
  }

  isEitherXModuleInstalled() {
    const xFileData = this.state.xModuleData[getXFile().getName()];
    const xUserIOData = this.state.xModuleData[getXUserIO().getName()];

    return (
      (xFileData && xFileData.installed) ||
      (xUserIOData && xUserIOData.installed)
    );
  }

  resetRegisterKey() {
    this.setState({
      registerKey: "",
    });
  }

  onShowSettings() {
    this.initXModules();
    this.initLocalXmodule();
    this.resetRegisterKey();
  }

  showSettingsModal() {
    this.props.updateUI({ showSettings: true });
  }

  showSettingsOfflineModal() {
    this.props.updateUI({ showSettingsOffline: true });
  }

  renderPublicWebsiteWhiteList() {
    return (
      <Modal
        title="Embedded Macros Website Whitelist"
        className="whitelist-modal"
        width={450}
        okText="Save"
        open={this.props.ui.showWebsiteWhiteList}
        onCancel={() => this.props.updateUI({ showWebsiteWhiteList: false })}
        onOk={(close) => {
          const text = this.state.websiteWhiteListText;
          const lines = text
            .split(/\n/g)
            .map((str) => str.trim())
            .filter((str) => str.length > 0);

          this.props.updateConfig({ websiteWhiteList: lines });
          this.props.updateUI({ showWebsiteWhiteList: false });
          message.success("Saved");

          return Promise.resolve(true);
        }}
      >
        <p style={{ marginBottom: "10px" }}>
          Allow embedded macros to run <em>without warning dialog</em>, if
          started from the following sites:
        </p>
        <Input.TextArea
          placeholder="One url per line, e. g. https://ui.vision/rpa"
          autosize={{ minRows: 6, maxRows: 12 }}
          value={this.state.websiteWhiteListText}
          style={{ resize: "vertical" }}
          onChange={(e) =>
            this.setState({ websiteWhiteListText: e.target.value })
          }
        />
        <p style={{ color: "green", marginTop: "20px" }}>
          <a
            style={{ float: "right", marginLeft: "20px" }}
            href="https://goto.ui.vision/x/idehelp?help=website_whitelist"
            target="_blank"
          >
            More info
          </a>
          Only run embedded macros from websites you trust
        </p>
      </Modal>
    );
  }

  renderPlayLoopModal() {
    return (
      <Modal
        title="How many loops to play?"
        okText="Play"
        cancelText="Cancel"
        className="play-loop-modal"
        open={this.state.showPlayLoops}
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
                onKeyDown={(e) => {
                  if (e.keyCode === 13) this.onClickPlayLoops();
                }}
                onChange={(e) =>
                  this.onChangePlayLoops("loopsStart", e.target.value)
                }
              />
            </Form.Item>
          </Col>
          <Col span={10} offset={2}>
            <Form.Item label="Max">
              <Input
                type="number"
                min="0"
                value={this.state.loopsEnd}
                onKeyDown={(e) => {
                  if (e.keyCode === 13) this.onClickPlayLoops();
                }}
                onChange={(e) =>
                  this.onChangePlayLoops("loopsEnd", e.target.value)
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <p>
          The value of the loop counter is available in ${"{"}!LOOP{"}"}{" "}
          variable
        </p>
      </Modal>
    );
  }

  renderSettingOfflineModal() {
    return (
      <Modal
        title="Eneterprise OCR Server"
        className="settings-modal"
        width={650}
        footer={null}
        open={this.props.ui.showSettingsOffline}
        onCancel={() => {
          this.props.updateUI({ showSettingsOffline: false });
        }}
      >
        <div className="row">
          <Radio.Group
            className="radio-block"
            value={this.props.config.ocrMode}
          >
            <Radio
              value="offline_enabled"
              onClick={() => { onConfigChange("ocrMode", "offline_enabled") }}
              disabled={!getLicenseService().isProLicense()}
              className={cn({ "need-pro": !getLicenseService().isProLicense() })}
            >
              Use{" "}
              <a
                href="https://goto.ui.vision/x/idehelp?help=ocrenterprise"
                target="_blank"
              >
                Local Enterprise OCR Server
              </a>{" "}
              (Requires XModules Enterprise Edition)
              <br />
              <div className="row offline-modal-row">
                <span className="offline-modal-label">Local OCR</span>
                <Input
                  type="text"
                  style={{ width: "200px" }}
                  disabled={this.props.config.ocrMode !== "offline_enabled"}
                  value={this.props.config.ocrOfflineURL}
                  onChange={(e) =>
                    onConfigChange("ocrOfflineURL", e.target.value)
                  }
                />
                <br />
                <span className="offline-modal-label">Local API key</span>
                <Input
                  type="password"
                  style={{ width: "200px" }}
                  disabled={this.props.config.ocrMode !== "offline_enabled"}
                  value={this.props.config.ocrOfflineAPIKey}
                  onChange={(e) =>
                    onConfigChange("ocrOfflineAPIKey", e.target.value)
                  }
                />
              </div>
            </Radio>
          </Radio.Group>
        </div>
      </Modal>
    );
  }

  renderSettingModal() {
    const onConfigChange = (key, val) => {
      this.props.updateConfig({ [key]: val });
    };

    const onChangeProxyStatus = (value) => {
      switch (value) {
        case "off":
          return ipc.ask("PANEL_SET_PROXY", { proxy: null });
  
        case "on": {
          let proxy;
  
          try {
            proxy = parseProxyUrl(
              this.props.config.defaultProxy,
              this.props.config.defaultProxyAuth
            );
          } catch (e) {
            return message.error(e.message);
          }
  
          return ipc.ask("PANEL_SET_PROXY", { proxy });
        }
      }
    }
  
    const onChangeDefaultOCREngine = (value) => {
      const lastSelectedEngine = this.props.config.ocrEngine;
      onConfigChange("ocrEngine", parseInt(value, 10));
      if (value === "99") {
        if (OSType == "linux") {
          const msg = "Local OCR not supported on Linux yet";
          message.warn(`${msg}`, 2.5);
          onConfigChange("ocrEngine", 98) // set default. // old: parseInt(1, 10));
        } else {
          getXFile()
            .getLangs(OSType)
            .then(
              (data) => {
                if (data) {
                  const options = JSON.parse(atob(data));
                  console.log("getXFile options:>>", options);
                  // output: getXFile options:>> ['eng']
                  let newOcrlangAr = [];
                  this.state.ocrLanguageOptions.map((item) =>
                    options.indexOf(item.value) > -1
                      ? newOcrlangAr.push({
                          text: item.text,
                          value: item.value,
                        })
                      : []
                  );
  
                  this.setState({
                    ocrLanguageOptions: newOcrlangAr,
                  });
                  onConfigChange("ocrLanguageOption", newOcrlangAr);
                  let haveEng = newOcrlangAr.filter(
                    (lang) => lang.value == "eng"
                  );
                  if (haveEng.length != 0) {
                    onConfigChange("ocrLanguage", "eng");
                  } else {
                    onConfigChange(
                      "ocrLanguage",
                      newOcrlangAr[0]["value"]
                    );
                  }
  
                } else {
                  const msg = "Not Installed";
                  message.info(`status updated: ${msg}`);
                }
              },
              () => {
                this.setState({
                  ocrLanguageOptions: this.state.ocrLanguageOptions,
                });
                onConfigChange("ocrLanguage", "eng");
                onConfigChange(
                  "ocrLanguageOption",
                  this.state.ocrLanguageOptions
                );
                const msg = "Not Installed";
                onConfigChange("ocrEngine", lastSelectedEngine);
                message.info(`status updated: ${msg}`);
              }
            );
        }
      } else if (value === "98") {
         
          let tesseractLangAr = this.state.tesseractLanguageOptions.map((item) =>  {
            return {
              text: item.text,
              value: item.value,
            }});              
          

          this.setState({
            tesseractLanguageOptions: tesseractLangAr,
          });

          // onConfigChange("tesseractLanguageOption", tesseractLangAr);
          let haveEng = tesseractLangAr.filter(
            (lang) => lang.value == "eng"
          );
          if (haveEng.length != 0) {
            onConfigChange("ocrLanguage", "eng");
          } else {
            onConfigChange(
              "ocrLanguage",
              tesseractLangAr[0]["value"]
            );
          }
  
      } else {
        this.setState({ ocrLanguageOptions: ocrLanguageOptions });
        onConfigChange("ocrLanguageOption", ocrLanguageOptions);
        onConfigChange("ocrLanguage", "eng");
      }
    }

    const displayConfig = {
      labelCol: { span: 8 },
      wrapperCol: { span: 16 },
    };

    const ocrClassName =  cn( "ocr-pane", {
      "ocr-disabled": this.props.config.ocrMode === "disabled",
      "ocr-enabled": this.props.config.ocrMode === "enabled",
      "ocr-offline": this.props.config.ocrMode === "offline_enabled",
    }) || '';


    return (
      <Modal
        title="Settings"
        className="settings-modal"
        width={700}
        footer={null}
        open={this.props.ui.showSettings}
        onCancel={() => {
          this.props.updateUI({ showSettings: false });
          this.setState({ textToEncrypt: "", encryptedText: "" });
          this.props.updateConfig({
            showSettingsOnStart: false
          })
          this.setState({ userEnteredOCRAPIKey: '' });  
        }}
      >
        <Tabs
          type="card"
          activeKey={this.props.ui.settingsTab || "replay"}
          onChange={(activeKey) =>
            this.props.updateUI({ settingsTab: activeKey })
          }
          items={[
            {
              key: "replay",
              label: "Replay",
              children: (
                <Form>
                  <Form.Item label="Replay Helper" {...displayConfig}>
                    <Checkbox
                      onClick={(e) =>
                        onConfigChange(
                          "playScrollElementsIntoView",
                          !e.target.checked
                        )
                      }
                      checked={this.props.config.playScrollElementsIntoView}
                    >
                      Scroll elements into view during replay
                    </Checkbox>

                    <Checkbox
                      onClick={(e) =>
                        onConfigChange(
                          "playHighlightElements",
                          !e.target.checked
                        )
                      }
                      checked={this.props.config.playHighlightElements}
                    >
                      Highlight elements during replay
                    </Checkbox>
                  </Form.Item>

                  <Form.Item
                    label={
                      <a
                        target="_blank"
                        href="https://goto.ui.vision/x/idehelp?help=command_interval"
                      >
                        Command Interval
                      </a>
                    }
                    {...displayConfig}
                  >
                    <Select
                      style={{ width: "200px" }}
                      placeholder="interval"
                      value={"" + this.props.config.playCommandInterval}
                      onChange={(val) =>
                        onConfigChange("playCommandInterval", val)
                      }
                    >
                      <Select.Option value={"0"}>Fast (no delay)</Select.Option>
                      <Select.Option value={"0.3"}>
                        Medium (0.3s delay)
                      </Select.Option>
                      <Select.Option value={"2"}>Slow (2s delay)</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    label={
                      <a
                        target="_blank"
                        href="https://goto.ui.vision/x/idehelp?help=timeout_pageload"
                      >
                        !TIMEOUT_PAGELOAD
                      </a>
                    }
                    {...displayConfig}
                  >
                    <Input
                      type="number"
                      min="0"
                      style={{ width: "70px" }}
                      value={this.props.config.timeoutPageLoad}
                      onChange={(e) =>
                        onConfigChange("timeoutPageLoad", e.target.value)
                      }
                      placeholder="in seconds"
                    />
                    <span className="tip">Max. time for new page load</span>
                  </Form.Item>

                  <Form.Item
                    label={
                      <a
                        target="_blank"
                        href="https://goto.ui.vision/x/idehelp?help=timeout_wait"
                      >
                        !TIMEOUT_WAIT
                      </a>
                    }
                    {...displayConfig}
                  >
                    <Input
                      type="number"
                      min="0"
                      style={{ width: "70px" }}
                      value={this.props.config.timeoutElement}
                      onChange={(e) =>
                        onConfigChange("timeoutElement", e.target.value)
                      }
                      placeholder="in seconds"
                    />
                    <span className="tip">Max. time per step</span>
                  </Form.Item>
                  <Form.Item
                    label={
                      <a
                        target="_blank"
                        href="https://goto.ui.vision/x/idehelp?help=timeout_macro"
                      >

                        !TIMEOUT_MACRO
                      </a>
                    }
                    {...displayConfig}
                  >
                    <Input
                      type="number"
                      min="0"
                      style={{ width: "70px" }}
                      value={this.props.config.timeoutMacro}
                      onChange={(e) =>
                        onConfigChange("timeoutMacro", e.target.value)
                      }
                      placeholder="in seconds"
                    />
                    <span className="tip">Max. overall macro runtime</span>
                  </Form.Item>
                  <Form.Item
                    label={

                      <a
                        target="_blank"
                        href="https://goto.ui.vision/x/idehelp?help=timeout_download"
                      >
                        !TIMEOUT_DOWNLOAD
                      </a>
                    }
                    {...displayConfig}
                  >
                    <Input
                      type="number"
                      min="0"
                      style={{ width: "70px" }}
                      value={this.props.config.timeoutDownload}
                      onChange={(e) =>
                        onConfigChange("timeoutDownload", e.target.value)
                      }
                      placeholder="in seconds"
                    />
                    <span className="tip">Max. allowed time for file</span>
                  </Form.Item>
                  <Form.Item label="If error happens in loop" {...displayConfig}>
                    <Radio.Group                      
                      value={this.props.config.onErrorInLoop}
                    >
                      <Radio onClick={(e) =>
                        onConfigChange("onErrorInLoop", 'continue_next_loop')
                      } value="continue_next_loop">Continue next loop</Radio>
                      <Radio onClick={(e) =>
                        onConfigChange("onErrorInLoop", 'stop')
                      } value="stop">Stop</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="Ui.Vision Side Panel" {...displayConfig}>
                    <Checkbox
                      onClick={(e) => {
                        onConfigChange("showSidePanel", !e.target.checked);
                      }}
                      checked={this.props.config.showSidePanel}
                    >
                      Open Side Panel by default
                    </Checkbox>
                    <Checkbox
                      onClick={(e) => {
                        onConfigChange("sidePanelOnLeft", !e.target.checked);
                      }}
                      checked={this.props.config.sidePanelOnLeft}
                    >
                      Check if Side Panel is on the left (
                      <a
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(
                            "https://goto.ui.vision/x/idehelp?help=sidepanel_left"
                          );
                        }}
                      >
                        More details
                      </a>
                      )
                    </Checkbox>
                  </Form.Item>
                  <Form.Item label="Ui.Vision Color Theme" {...displayConfig}>
                    <Checkbox
                      onClick={(e) => {
                        const useDarkTheme = !e.target.checked;
                        onConfigChange("useDarkTheme", !e.target.checked);
                        if(useDarkTheme) {
                          document.documentElement.setAttribute('data-theme', 'dark')
                        } else {
                          document.documentElement.setAttribute('data-theme', 'light')
                        }
                      }}
                      checked={this.props.config.useDarkTheme}
                      style={{marginBottom: 0}}
                    >
                      Use Dark Mode (
                      <a
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(
                            "https://goto.ui.vision/x/idehelp?help=darkmode"
                          );
                        }}
                      >
                        Beta - report issues here
                      </a>
                      )
                    </Checkbox>
                  </Form.Item>
                </Form>
              )
            },
            {
              key: "api",
              label: "API",
              className: "api-pane",
              children: (
                <>
                  <p>
                    The RPA command line API allows you to run macros and test suites
                    from the command line and to control Ui.Vision from any
                    scripting or programming language (
                    <a
                      href="https://goto.ui.vision/x/idehelp?help=cmdline"
                      target="_blank"
                    >
                      more info
                    </a>
                    ).
                  </p>

                  <p>
                    <Button
                      type="primary"
                      onClick={() => {
                        const str = generateEmptyHtml();
                        const blob = new Blob([str], {
                          type: "text/plain;charset=utf-8",
                        });

                        FileSaver.saveAs(blob, `ui.vision.html`, true);
                      }}
                    >
                      Generate Autostart HTML Page
                    </Button>
                  </p>

                  <Form>
                    <Form.Item
                      label={
                        <a
                          target="_blank"
                          href="https://goto.ui.vision/x/idehelp?help=cmdline"
                        >

                          Allow Command Line

                        </a>
                      }
                      {...displayConfig}
                      labelCol={{ span: 6 }}
                    >
                      <Checkbox
                        onClick={(e) =>
                          onConfigChange("allowRunFromBookmark", !e.target.checked)
                        }
                        checked={this.props.config.allowRunFromBookmark}
                      >
                        Run macro and test suite shortcuts from Javascript
                        Bookmarklets
                      </Checkbox>
                      <Checkbox
                        onClick={(e) =>
                          onConfigChange("allowRunFromFileSchema", !e.target.checked)
                        }
                        checked={this.props.config.allowRunFromFileSchema}
                      >
                        Run embedded macros from local files
                      </Checkbox>
                      <Checkbox
                        onClick={(e) =>
                          onConfigChange("allowRunFromHttpSchema", !e.target.checked)
                        }
                        checked={this.props.config.allowRunFromHttpSchema}
                      >
                        Run embedded macros from public websites
                        <a
                          href="#"
                          style={{
                            position: "relative",
                            marginLeft: "10px",
                            padding: "15px 0",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            this.props.updateUI({ showWebsiteWhiteList: true });
                          }}
                        >
                          Edit Whitelist
                        </a>
                      </Checkbox>
                    </Form.Item>
                  </Form>
                </>
              )
            },
            {
              key: 'ocr',
              label: 'OCR',
              className: ocrClassName,
              children: (
                <>
                  <div >
                    <p>
                      <span className="label-text">
                        Select Default OCR Engine
                      </span>
                    </p>
                  </div>
                  <div >
                    <span className="label-text">Local OCR Options: 
					{'  ['}
                        <a
                          href="https://goto.ui.vision/x/idehelp?help=ocr-local"
                          target="_blank"
                        >
                          more info
                        </a>
                        {']'}
					</span>
                    <br/>
                    <Radio.Group
                      className="radio-block"
                      style={{ marginLeft: "5%" }}
                      value={"" + this.props.config.ocrEngine}
                    >
                      
                      <Radio value="98" onClick={() => onChangeDefaultOCREngine("98")}>
                        Javascript OCR (Works well for many use cases, additional OCR languages available on 			 
						 	<a
                          href="https://goto.ui.vision/x/idehelp?help=ocr-request"
                          target="_blank"
                        > request</a>)
                      </Radio>

                      <Radio value="99" onClick={() => onChangeDefaultOCREngine("99")}>
                        XModule Local OCR (Faster/better, especially for text on images)
                      </Radio>
                      
                    </Radio.Group>
                  </div>
                  <div className="row">
                    <span className="label-text">Use Ocr.Space Online OCR:
					{'   ['}
					<a
                          href="https://goto.ui.vision/x/idehelp?help=free-ocr-api"
                          target="_blank"
                        >Free OCR API account required</a>{']'}
					</span>
                    <br/>
                    <Radio.Group
                      className="radio-block"
                      style={{ marginLeft: "5%" }}
                      value={"" + this.props.config.ocrEngine}
                    >
                      <Radio value="1" onClick={() => onChangeDefaultOCREngine("1")}>
                        Cloud OCR: OCR.Space, Engine1 
                      </Radio>
                      <Radio value="2" onClick={() => onChangeDefaultOCREngine("2")}>
                        Cloud OCR: OCR.Space, Engine2 
                      </Radio>
                    </Radio.Group>
                    <div>
                      <span className="label-text">OCR.Space OCR API Key:</span>
                      <Input
                        type="text"
                        style={{ width: "120px" }}
                        value={this.state.userEnteredOCRAPIKey}
                        disabled={[1,2].includes( this.props.config.ocrEngine) ? false : true }
                        onChange={(e) =>
                          {
                            this.setState({ userEnteredOCRAPIKey: e.target.value });    
                          }
                        }
                      />
                      <Button
                        type="primary"
                        style={{ marginLeft: "8px" }}
                        disabled={ [1,2].includes( this.props.config.ocrEngine) ? false : true }
                        onClick={() => {
                           // connect to endpoint
                          let key = this.state.userEnteredOCRAPIKey?.trim();
                          if (!key) {
                            message.error("Please enter a valid API key");
                            return;
                          }
                          const isFreeApiKey = isOcrSpaceFreeKey(key)
                          let url;
 
                          if (!isFreeApiKey) {
                            // it's a pro key  
                            url = this.props.config.ocrEngine == 1 ? CONFIG.ocr.proApi1Endpoint : CONFIG.ocr.proApi2Endpoint
                          } else {
                            url = CONFIG.ocr.freeApiEndpoint
                          }
                           
                          testOcrSpaceAPIKey({ key, url }).then((res) => {
                            if(res){
                              let endpointType = isFreeApiKey ? 'free' : 'pro';
                              this.setState({ connectedAPIEndpointType: endpointType });
                              onConfigChange("ocrSpaceApiKey", key);
                            } else {
                              message.error("Invalid API key");
                              this.setState({ connectedAPIEndpointType: null });
                              onConfigChange("ocrSpaceApiKey", '');
                            }
                          }).catch((e) => {
                            message.error(e.message);
                          });
                           
                        }}
                      >
                        Test
                      </Button>
                       { this.state.connectedAPIEndpointType ? (<span className="api-key-notification">
                        API key stored. Connected to { this.state.connectedAPIEndpointType.toUpperCase() } endpoint. 
                      </span>) : null }
                    </div>
                  </div>

                  <div className="row">
                    <div>
                      <span className="label-text">Default OCR language</span>
                      <Select
                        id="ss"
                        style={{ width: "150px" }}
                        placeholder="OCR Language"
                        value={this.props.config.ocrLanguage}
                        disabled={
                          (this.props.config.ocrMode === "disabled" ||
                            this.props.config.ocrEngine === 2) &&
                          this.props.config.ocrEngine != 99
                        }
                        onChange={(val) => onConfigChange("ocrLanguage", val)}
                      >
                        { this.props.config.ocrEngine == 98 ? this.state.tesseractLanguageOptions.map((item) => (
                          <Select.Option value={item.value} key={item.value}>
                            {item.text}
                          </Select.Option>
                        )) : this.state.ocrLanguageOptions.map((item) => (
                          <Select.Option value={item.value} key={item.value}>
                            {item.text}
                          </Select.Option>
                        )) }
                      </Select>
                    </div>

                    <div>
                      You can overwrite the default OCR settings in the macro with{" "}
                      <a
                        href="https://goto.ui.vision/x/idehelp?help=ocrlanguage"
                        target="_blank"
                      >
                        !OCRLanguage
                      </a>{" "}
                      and{" "}
                      <a
                        href="https://goto.ui.vision/x/idehelp?help=ocrengine"
                        target="_blank"
                      >
                        !OCREngine
                      </a>
                      .
                    </div>
                  </div>
                  <div className="row">
                    <p>
                      <Button
                        type="primary"
                        loading={this.state.testingOcrAPI}
                        disabled={
                          this.props.config.ocrMode === "disabled" &&
                          this.props.config.ocrEngine != 99 &&
                          this.props.config.ocrEngine != 98
                        }
                        onClick={() => {
                          this.setState({ testingOcrAPI: true });
                          
                          const isDesktopMode = isCVTypeForDesktop(this.props.config.cvScope)                          
                          isDesktopMode && store.dispatch(Actions.setOcrInDesktopMode(true))

                          ocrViewport({
                            store: window["store"],
                            isDesktop: isDesktopMode,
                          })
                            .catch((e) => {
                              message.error(e.message);
                            })
                            .then(() => {
                              this.setState({ testingOcrAPI: false });
                              store.dispatch(Actions.setOcrInDesktopMode(false)) 
                            });
                        }}
                      >
                        Show OCR Overlay
                      </Button>
                    </p>

                    <p>
                      The test runs OCR on the currently active browser tab and
                      displays the result as overlay.
                    </p>
                  </div>
                  <div className="row">
                    <p>
                      <b>
                        Calibrate - <span className="label-text">OCRTEXTX</span>
                      </b>
                      <Input
                        type="number"
                        min={1}
                        value={
                          this.props.config.ocrCalibration != undefined &&
                          this.props.config.ocrCalibration != ""
                            ? this.props.config.ocrCalibration
                            : 6
                        }
                        onChange={(e) => {
                          onConfigChange("ocrCalibration", e.target.value);
                          onConfigChange("ocrCalibration_internal", e.target.value);
                          //localStorage.setItem('ocrCalibration', e.target.value);
                        }}
                        style={{ width: "65px", marginRight: "15px" }}
                      />
                      <Button
                        type="primary"
                        loading={this.state.testingCalibrate}
                        disabled={
                          this.props.config.ocrMode === "disabled" &&
                          this.props.config.ocrEngine != 99
                        }
                        onClick={() => {
                          this.setState({
                            testingCalibrate: true,
                          });
                          ocrViewportCalibration({
                            store: window["store"],
                            isDesktop: true,
                          })
                            .catch((e) => {
                              message.error(e.message);
                            })
                            .then(async (result) => {
                              try {
                                let calibrateNumber = parseInt(
                                  store.getState().config.ocrCalibration_internal
                                );
                                localStorage.setItem(
                                  "ocrCalibration",
                                  calibrateNumber
                                );
                                onConfigChange("ocrCalibration", calibrateNumber);
                                onConfigChange(
                                  "ocrCalibration_internal",
                                  calibrateNumber
                                );
                              } catch (e) {}

                              this.setState({
                                testingCalibrate: false,
                              });
                            });
                        }}
                      >
                        Calibrate XClickTextRelative
                      </Button>{" "}
                      (
                      <a
                        href="https://goto.ui.vision/x/idehelp?help=ocr-calibrate-textrelative"
                        target="_blank"
                      >
                        What is this?
                      </a>
                      )
                    </p>
                  </div>
                  <div className="row">
                    <p>
                      <b>
                        <span className="label-text">Screen Scaling %:</span>
                      </b>
                      <Input
                        type="number"
                        min={100}
                        value={
                          this.props.config.ocrScaling != undefined &&
                          this.props.config.ocrScaling != ""
                            ? this.props.config.ocrScaling
                            : 100
                        }
                        onChange={(e) => {
                          let calibrateNumber = 6;
                          if (
                            this.props.config.ocrCalibration == 6 ||
                            this.props.config.ocrCalibration == 7
                          ) {
                            calibrateNumber = 7 * (e.target.value / 100);
                            //calibrateNumber = (this.props.config.ocrCalibration * (e.target.value/100));
                            //e.target.value > 100 ? onConfigChange('ocrCalibration', calibrateNumber) : onConfigChange('ocrCalibration', this.props.config.ocrCalibration);
                          } else {
                            calibrateNumber = 7 * (e.target.value / 100);
                            //e.target.value > 100 ? onConfigChange('ocrCalibration', calibrateNumber) : onConfigChange('ocrCalibration', 6);
                          }
                          //localStorage.setItem('ocrCalibration', calibrateNumber);
                          onConfigChange("ocrCalibration_internal", calibrateNumber);
                          onConfigChange("ocrScaling", e.target.value);
                        }}
                        style={{ width: "65px", marginRight: "15px" }}
                      />
                      <span className="label-text">
                        {" "}
                        (Used for{" "}
                        <a
                          href="https://goto.ui.vision/x/idehelp?help=ocrdesktopscaling"
                          target="_blank"
                        >
                          XClickTextRelative
                        </a>{" "}
                        calibration)
                      </span>
                    </p>
                  </div>

                  <div style={{ margin: "30px 0 0" }} className="xmodule-item">
                    <div className="xmodule-title">
                      <span>
                        <b>XModule OCR</b> - Fast Local OCR on Windows/Mac
                      </span>
                      <a href={getXLocal().infoLink()} target="_blank">
                        More Info
                      </a>
                      <Button
                        type="primary"
                        onClick={() => {
                          getXLocal()
                            .getVersionLocal()
                            .then((data) => {
                              const { installed, version } = data;
                              const msg = installed
                                ? `Installed (v${version})`
                                : "Not Installed";
                              message.info(`status updated: ${msg}`);

                              const p = !installed
                                ? Promise.resolve()
                                : getXLocal().initConfig();

                              p.catch((e) => {}).then(() => {
                                this.setState(
                                  updateIn(
                                    ["xModuleDataLocal", getXLocal().getName()],
                                    (orig) => ({
                                      ...orig,
                                      ...data,
                                      config: getXLocal().getCachedConfig(),
                                    }),
                                    this.state
                                  )
                                );
                              });
                            });
                        }}
                      >
                        Test it
                      </Button>
                    </div>
                    <div className="xmodule-status">
                      <label>Status:</label>

                      {this.state.xModuleDataLocal[getXLocal().getName()] &&
                      this.state.xModuleDataLocal[getXLocal().getName()].installed ? (
                        <div className="status-box">
                          <span>
                            Installed (v
                            {
                              this.state.xModuleDataLocal[getXLocal().getName()]
                                .version
                            }
                            )
                          </span>
                          <a
                            target="_blank"
                            href={getXLocal().checkUpdateLink(
                              this.state.xModuleDataLocal[getXLocal().getName()] &&
                                this.state.xModuleDataLocal[getXLocal().getName()]
                                  .version,
                              Ext.runtime.getManifest().version
                            )}
                          >
                            Check for update
                          </a>
                        </div>
                      ) : (
                        <div className="status-box">
                          <span>Not Installed</span>
                          <a href={getXLocal().downloadLink()} target="_blank">
                            Download it
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="row">
                    <p style={{ textAlign: "right", marginTop: "10px" }}>
                      <a onClick={() => this.showSettingsOfflineModal()}>
                        Advanced:Connect Enterprise OCR Server
                      </a>
                    </p>
                  </div>
                
                
                </>
              )
            },
            {
              key: 'vision',
              label: 'Vision',
              className: 'vision-pane',
              children: (
                <>
                  <p>
                    Ui.Vision's eyes can look inside the web browser or search the
                    complete desktop.
                  </p>
                  <div className="row">
                    <Radio.Group
                      value={this.props.config.cvScope}
                    >
                      <Radio value="browser" onClick={() => onConfigChange("cvScope", "browser")}>
                        Browser Automation (Look inside browser)
                      </Radio>
                      <Radio
                        value="desktop"
                        onClick={() => onConfigChange("cvScope", "desktop")}
                        disabled={
                          !(
                            this.state.xModuleData[getXDesktop().getName()] &&
                            this.state.xModuleData[getXDesktop().getName()].installed
                          )
                        }
                      >
                        <span>Desktop Automation (Search complete desktop)</span>
                        {this.state.xModuleData[getXDesktop().getName()] &&
                        this.state.xModuleData[getXDesktop().getName()]
                          .installed ? null : (
                          <a
                            target="_blank"
                            href={getXDesktop().downloadLink()}
                            style={{
                              marginLeft: "15px",
                            }}
                          >
                            Install the DesktopAutomation XModule first.
                          </a>
                        )}

                        <div>
                          <Checkbox
                            onClick={(e) =>
                              onConfigChange(
                                "useDesktopScreenCapture",
                                !e.target.checked
                              )
                            }
                            checked={this.props.config.useDesktopScreenCapture}
                            disabled={
                              this.props.config.cvScope !== "desktop" ||
                              !(
                                this.state.xModuleData[
                                  getXScreenCapture().getName()
                                ] &&
                                this.state.xModuleData[getXScreenCapture().getName()]
                                  .installed
                              )
                            }
                          >
                            <span>
                              Use native{" "}
                              <a
                                href={getXScreenCapture().infoLink()}
                                target="_blank"
                              >
                                desktop screen capture
                              </a>{" "}
                              if installed (see XModule below)
                            </span>
                            {this.state.xModuleData[getXScreenCapture().getName()] &&
                            this.state.xModuleData[getXScreenCapture().getName()]
                              .installed ? null : (
                              <a
                                target="_blank"
                                href={getXScreenCapture().downloadLink()}
                                style={{
                                  marginLeft: "15px",
                                }}
                              >
                                Install the ScreenCapture XModule first.
                              </a>
                            )}
                          </Checkbox>
                        </div>
                      </Radio>
                    </Radio.Group>
                  </div>

                  <p>
                    Inside a macro the computer vision scope can be changed with the{" "}
                    <a href={getXDesktop().infoLink()} target="_blank">
                      XDesktopAutomation
                    </a>{" "}
                    command. In addition, you can restrict the image search area with
                    the{" "}
                    <a
                      href="https://goto.ui.vision/x/idehelp?help=limitsearcharea"
                      target="_blank"
                    >
                      visionLimitSearchArea
                    </a>{" "}
                    command.
                  </p>

                  <div className="row" style={{ marginTop: "30px" }}>
                    <p>Default Vision Search Confidence</p>
                    <Select
                      style={{ width: "200px" }}
                      placeholder="interval"
                      value={"" + this.props.config.defaultVisionSearchConfidence}
                      onChange={(val) =>
                        onConfigChange(
                          "defaultVisionSearchConfidence",
                          parseFloat(val)
                        )
                      }
                    >
                      {range(1, 11, 1).map((n) => (
                        <Select.Option key={n} value={"" + (0.1 * n).toFixed(1)}>
                          {(0.1 * n).toFixed(1)}
                        </Select.Option>
                      ))}
                    </Select>
                  </div>

                  <div className="row" style={{ marginTop: "30px" }}>
                    <Checkbox
                      onClick={(e) =>
                        onConfigChange(
                          "waitBeforeDesktopScreenCapture",
                          !e.target.checked
                        )
                      }
                      checked={this.props.config.waitBeforeDesktopScreenCapture}
                    >
                      <span>Wait</span>
                      <Input
                        type="number"
                        min="0"
                        max="60"
                        value={this.props.config.secondsBeforeDesktopScreenCapture}
                        style={{ width: "60px", margin: "0 10px" }}
                        onChange={(e) =>
                          onConfigChange(
                            "secondsBeforeDesktopScreenCapture",
                            Math.min(60, Number(e.target.value))
                          )
                        }
                      />
                      <span>
                        seconds before taking screenshots. This allows you to switch
                        windows
                      </span>
                    </Checkbox>
                  </div>

                  <div style={{ margin: "30px 0 0" }} className="xmodule-item">
                    <div className="xmodule-title">
                      <span>
                        <b>Screen Capture XModule</b> - Select images more quickly
                      </span>
                      <a href={getXScreenCapture().infoLink()} target="_blank">
                        More Info
                      </a>
                      <Button
                        type="primary"
                        onClick={() => {
                          getXScreenCapture()
                            .getVersion()
                            .then((data) => {
                              const { installed, version } = data;
                              const msg = installed
                                ? `Installed (v${version})`
                                : "Not Installed";
                              message.info(`status updated: ${msg}`);

                              this.setState(
                                updateIn(
                                  ["xModuleData", getXScreenCapture().getName()],
                                  (orig) => ({
                                    ...orig,
                                    ...data,
                                    config: getXScreenCapture().getCachedConfig(),
                                  }),
                                  this.state
                                )
                              );
                            });
                        }}
                      >
                        Test it
                      </Button>
                    </div>

                    <div className="xmodule-status">
                      <label>Status:</label>

                      {this.state.xModuleData[getXScreenCapture().getName()] &&
                      this.state.xModuleData[getXScreenCapture().getName()]
                        .installed ? (
                        <div className="status-box">
                          <span>
                            Installed (v
                            {
                              this.state.xModuleData[getXScreenCapture().getName()]
                                .version
                            }
                            )
                          </span>
                          <a
                            target="_blank"
                            href={getXScreenCapture().checkUpdateLink(
                              this.state.xModuleData[getXScreenCapture().getName()] &&
                                this.state.xModuleData[getXScreenCapture().getName()]
                                  .version,
                              Ext.runtime.getManifest().version
                            )}
                          >
                            Check for update
                          </a>
                        </div>
                      ) : (
                        <div className="status-box">
                          <span>Not Installed</span>
                          <a
                            href={getXScreenCapture().downloadLink()}
                            target="_blank"
                          >
                            Download it
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )
            },
            {
              key: 'ai',
              label: 'AI(New)',
              className: 'ai-pane',
              children: (           
                <AITab />
              )
            },
            {
              key: 'xmodules',
              label: 'XModules',
              className: 'xmodules-pane',
              children:(
                <>
                  <div className="xmodule-item">
                    <div className="xmodule-title">
                      <span>
                        <b>FileAccess XModule</b> - Read and write to your hard drive
                      </span>
                      <a href={getXFile().infoLink()} target="_blank">
                        More Info
                      </a>
                      <Button
                        type="primary"
                        onClick={() => {
                          getXFile()
                            .getVersion()
                            .then((data) => {
                              const { installed, version } = data;
                              const msg = installed
                                ? `Installed (v${version})`
                                : "Not Installed";
                              message.info(`status updated: ${msg}`);

                              const p = !installed
                                ? Promise.resolve()
                                : getXFile().initConfig();

                              p.catch((e) => {}).then(() => {
                                this.setState(
                                  updateIn(
                                    ["xModuleData", getXFile().getName()],
                                    (orig) => ({
                                      ...orig,
                                      ...data,
                                      config: getXFile().getCachedConfig(),
                                    }),
                                    this.state
                                  )
                                );
                              });
                            });
                        }}
                      >
                        Test it
                      </Button>
                    </div>

                    <div className="xmodule-status">
                      <label>Status:</label>

                      {this.state.xModuleData[getXFile().getName()] &&
                      this.state.xModuleData[getXFile().getName()].installed ? (
                        <div className="status-box">
                          <span>
                            Installed (v
                            {this.state.xModuleData[getXFile().getName()].version})
                          </span>
                          <a
                            target="_blank"
                            href={getXFile().checkUpdateLink(
                              this.state.xModuleData[getXFile().getName()] &&
                                this.state.xModuleData[getXFile().getName()].version,
                              Ext.runtime.getManifest().version
                            )}
                          >
                            Check for update
                          </a>
                        </div>
                      ) : (
                        <div className="status-box">
                          <span>Not Installed</span>
                          <a href={getXFile().downloadLink()} target="_blank">
                            Download it
                          </a>
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
                              disabled={
                                !(
                                  this.state.xModuleData[getXFile().getName()] &&
                                  this.state.xModuleData[getXFile().getName()]
                                    .installed
                                )
                              }
                              onChange={(e) => {
                                const rootDir = e.target.value;

                                this.setState(
                                  compose(
                                    setIn(
                                      [
                                        "xModuleData",
                                        getXFile().getName(),
                                        "config",
                                        "rootDir",
                                      ],
                                      rootDir
                                    ),
                                    setIn(["xFileRootDirChanged"], true)
                                  )(this.state)
                                );

                                getXFile().setConfig({ rootDir });
                              }}
                              onBlur={() => {
                                if (this.state.xFileRootDirChanged) {
                                  this.setState({ xFileRootDirChanged: false });

                                  getXFile()
                                    .sanityCheck()
                                    .then(
                                      () => {
                                        this.setState(
                                          setIn(
                                            [
                                              "xModuleData",
                                              getXFile().getName(),
                                              "checkResult",
                                            ],
                                            { error: null },
                                            this.state
                                          )
                                        );

                                        getStorageManager().emit(
                                          StorageManagerEvent.RootDirChanged
                                        );
                                      },
                                      (e) => {
                                        this.setState(
                                          setIn(
                                            [
                                              "xModuleData",
                                              getXFile().getName(),
                                              "checkResult",
                                            ],
                                            { error: e.message },
                                            this.state
                                          )
                                        );

                                        this.props.updateUI({
                                          showSettings: true,
                                          settingsTab: "xmodules",
                                        });
                                      }
                                    );
                                }
                              }}
                            />

                            {this.state.xModuleData[getXFile().getName()] &&
                            this.state.xModuleData[getXFile().getName()]
                              .checkResult &&
                            this.state.xModuleData[getXFile().getName()].checkResult
                              .error ? (
                              <div className="check-result">
                                {
                                  this.state.xModuleData[getXFile().getName()]
                                    .checkResult.error
                                }
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="settings-desc">
                          In this folder, Ui.Vision creates /macros, /images,
                          /testsuites, /datasources
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="xmodule-item">
                    <div className="xmodule-title">
                      <span>
                        <b>RealUser XModule</b> - Click / Type / Drag with OS native
                        events
                      </span>
                      <a href={getXUserIO().infoLink()} target="_blank">
                        More Info
                      </a>
                      <Button
                        type="primary"
                        onClick={() => {
                          getXUserIO()
                            .getVersion()
                            .then((data) => {
                              const { installed, version } = data;
                              const msg = installed
                                ? `Installed (v${version})`
                                : "Not Installed";
                              message.info(`status updated: ${msg}`);

                              this.setState(
                                updateIn(
                                  ["xModuleData", getXUserIO().getName()],
                                  (orig) => ({
                                    ...orig,
                                    ...data,
                                    config: getXUserIO().getCachedConfig(),
                                  }),
                                  this.state
                                )
                              );
                            });
                        }}
                      >
                        Test it
                      </Button>
                    </div>

                    <div className="xmodule-status">
                      <label>Status:</label>

                      {this.state.xModuleData[getXUserIO().getName()] &&
                      this.state.xModuleData[getXUserIO().getName()].installed ? (
                        <div className="status-box">
                          <span>
                            Installed (v
                            {this.state.xModuleData[getXUserIO().getName()].version})
                          </span>
                          <a
                            target="_blank"
                            href={getXUserIO().checkUpdateLink(
                              this.state.xModuleData[getXUserIO().getName()] &&
                                this.state.xModuleData[getXUserIO().getName()]
                                  .version,
                              Ext.runtime.getManifest().version
                            )}
                          >
                            Check for update
                          </a>
                        </div>
                      ) : (
                        <div className="status-box">
                          <span>Not Installed</span>
                          <a href={getXUserIO().downloadLink()} target="_blank">
                            Download it
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="xmodule-item">
                    <div className="xmodule-title">
                      <span>
                        <b>DesktopAutomation XModule</b> - Visual Desktop Automation
                      </span>
                      <a href={getXDesktop().infoLink()} target="_blank">
                        More Info
                      </a>
                      <Button
                        type="primary"
                        onClick={() => {
                          getXDesktop()
                            .getVersion()
                            .then((data) => {
                              const { installed, version } = data;
                              const msg = installed
                                ? `Installed (v${version})`
                                : "Not Installed";
                              message.info(`status updated: ${msg}`);

                              this.setState(
                                updateIn(
                                  ["xModuleData", getXDesktop().getName()],
                                  (orig) => ({
                                    ...orig,
                                    ...data,
                                    config: getXDesktop().getCachedConfig(),
                                  }),
                                  this.state
                                )
                              );
                            });
                        }}
                      >
                        Test it
                      </Button>
                    </div>

                    <div className="xmodule-status">
                      <label>Status:</label>

                      {this.state.xModuleData[getXDesktop().getName()] &&
                      this.state.xModuleData[getXDesktop().getName()].installed ? (
                        <div className="status-box">
                          <span>
                            Installed (v
                            {this.state.xModuleData[getXDesktop().getName()].version})
                          </span>
                          <a
                            target="_blank"
                            href={getXDesktop().checkUpdateLink(
                              this.state.xModuleData[getXDesktop().getName()] &&
                                this.state.xModuleData[getXDesktop().getName()]
                                  .version,
                              Ext.runtime.getManifest().version
                            )}
                          >
                            Check for update
                          </a>
                        </div>
                      ) : (
                        <div className="status-box">
                          <span>Not Installed</span>
                          <a href={getXDesktop().downloadLink()} target="_blank">
                            Download it
                          </a>
                        </div>
                      )}
                    </div>
                  </div>                
                </>
              )
            },
         {
              key: "backup",
              label: "Backup",
              className: "backup-pane",
              children: (
                <>
                  <h4>Automatic Backup</h4>
                  <p>
                    The automatic backup reminder helps to you to regularly export
                    macros and other data as ZIP archive. As browser extension
                    Ui.Vision must store its data{" "}
                    <em>inside the browser extension</em>. This means that when you
                    uninstall the extension, the data is removed, too. Therefore it is
                    good to have backups! Note that if the hard drive storage mode of
                    the File Access XModule is active, then the backup archive
                    contains these files.
                  </p>
                  <div className="row">
                    <Checkbox
                      onClick={(e) =>
                        onConfigChange("enableAutoBackup", !e.target.checked)
                      }
                      checked={this.props.config.enableAutoBackup}
                    />
                    <span>Show backup reminder every</span>
                    <Input
                      type="number"
                      min={1}
                      disabled={!this.props.config.enableAutoBackup}
                      value={this.props.config.autoBackupInterval}
                      onChange={(e) =>
                        onConfigChange("autoBackupInterval", e.target.value)
                      }
                      style={{ width: "60px" }}
                    />
                    <span> days</span>
                  </div>
                  <div className="row">
                    <p>Backup includes <span style={{fontWeight: "bold"}}>macros, images, and CSV files</span>.</p>                  
                  </div>
                  <div className="row">
                    <Button type="primary" onClick={() => this.props.runBackup()}>
                      Run Backup Now
                    </Button>
                    <span> Create a backup ZIP file now.</span>
                  </div>
                  <div style={{ paddingTop: "30px" }} className="row">
                    <Button
                      type="primary"
                      onClick={() => {
                        const $input = document.getElementById("select_zip_file");

                        if ($input) {
                          $input.click();
                        }
                      }}
                    >
                      Restore Data from Backup
                    </Button>
                    <span>
                      {" "}
                      Select a backup ZIP file to import it (
                      <a
                        href="https://goto.ui.vision/x/idehelp?help=bkup_import"
                        target="_blank"
                      >
                        more info
                      </a>
                      ).{" "}
                    </span>

                    <input
                      type="file"
                      accept=".zip"
                      id="select_zip_file"
                      ref={(ref) => {
                        this.zipFileInput = ref;
                      }}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        setTimeout(() => {
                          this.zipFileInput.value = null;
                        }, 500);

                        const file = e.target.files[0];

                        restoreBackup({
                          file,
                          storage: getStorageManager().getCurrentStrategyType(),
                        }).then(
                          (result) => {
                            getStorageManager().emit(StorageManagerEvent.ForceReload);
                            message.success("Backup restored");

                            this.props.addLog(
                              "info",
                              [
                                "Backup restored:",
                                `${result.count.macro} macros`,
                                `${result.count.testSuite} test suites`,
                                `${result.count.csv} csvs`,
                                `${result.count.screenshot} screenshots`,
                                `${result.count.vision} vision images`,
                              ].join("\n")
                            );
                          },
                          (e) => {
                            message.error("Failed to restore: " + e.message);
                            console.error(e);
                          }
                        );
                      }}
                    />
                  </div>
                </>                
              )
            },
            {
              key: 'security',
              label: 'Security',
              className: 'security-pane',
              children:(
                <>
                  <h4>Master password for Password Encryption</h4>
                  <p>
                    A master password is used to encrypt and decrypt all stored
                    website passwords. The websites passwords are encrypted using
                    strong encryption.&nbsp;&nbsp;
                    <a
                      target="_blank"
                      href="https://goto.ui.vision/x/idehelp?help=encryption"
                    >
                      More info &gt;&gt;
                    </a>
                  </p>
                  <div>
                    <Radio.Group
                      value={this.props.config.shouldEncryptPassword}
                    >
                      <Radio value="no" onClick={() => onConfigChange("shouldEncryptPassword", "no")}>Do not encrypt passwords</Radio>
                      <Radio value="master_password" onClick={() => onConfigChange("shouldEncryptPassword", "master_password")}>
                        Enter master password here to store it
                      </Radio>
                    </Radio.Group>

                    {this.props.config.shouldEncryptPassword === "master_password" ? (
                      <div>
                        <div>
                          <label>Master password:</label>
                          <Input
                            type="password"
                            style={{ width: "200px" }}
                            value={this.props.config.masterPassword}
                            onChange={(e) =>
                              onConfigChange("masterPassword", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <hr style={{ margin: "20px 0" }} />
                          <h4>Create encrypted text string</h4>
                          <p>
                            The feature uses the master password to encrypt text. The
                            encrypted string can be used with TYPE, SENDKEY and XTYPE.
                          </p>
                          <div className="input-line">
                            <span className="input-label">Text to encrypt:</span>
                            <Input
                              type={this.state.showText ? "text" : "password"}
                              style={{ width: "200px" }}
                              value={this.state.textToEncrypt}
                              onChange={(e) => {
                                this.setState({
                                  textToEncrypt: e.target.value,
                                  encryptedText: "",
                                });
                              }}
                            />
                            <Checkbox
                              onClick={(e) => {
                                this.setState({ showText: !e.target.checked });
                              }}
                              checked={this.state.showText}
                            >
                              Show text
                            </Checkbox>
                          </div>
                          <div className="input-line">
                            <span className="input-label">Encrypted string:</span>
                            <Input
                              readOnly={true}
                              type="text"
                              style={{ width: "200px" }}
                              value={this.state.encryptedText}
                            />
                          </div>
                          <div className="input-line">
                            <span className="input-label"></span>
                            <Button
                              type="primary"
                              onClick={() => {
                                encrypt(this.state.textToEncrypt).then((text) => {
                                  this.setState({ encryptedText: text });

                                  copyToClipboard(text, {
                                    format: "text/plain",
                                  });

                                  message.success("Copied to clipboard");
                                });
                              }}
                            >
                              Encrypt &amp; Copy
                            </Button>

                            <a
                              href="https://goto.ui.vision/x/idehelp?help=encrypt"
                              target="_blank"
                            >
                              (More info)
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              )
            },{
              key: "selenium",
              label: "Selenium",
              className: "selenium-pane",
              children: (
                <>
                  <h4>Import Selenium IDE Projects</h4>
                  <p>
                    Import web tests created in the classic Selenium IDE. Unknown
                    commands (if any) are imported as comments. If you want us to add
                    a certain not yet supported command, or find any other import
                    issues, please let us know in the{" "}
                    <a href="https://goto.ui.vision/x/idehelp?help=forum" target="_blank">
                      user forum
                    </a>
                    .
                  </p>
                  <div className="import-row">
                    <input
                      type="file"
                      accept=".side"
                      id="select_side_file"
                      ref={(ref) => {
                        this.sideFileInput = ref;
                      }}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        setTimeout(() => {
                          this.sideFileInput.value = null;
                        }, 500);

                        const file = e.target.files[0];

                        readFileAsText(file).then((sideText) => {
                          const sideProject = JSON.parse(sideText);

                          importSideProject(sideProject)
                            .then((result) => {
                              const lines = [
                                `Project "${result.projectName}" import into folder: "${result.folderName}"`,
                                `- ${result.macros.successCount} ${
                                  result.macros.successCount === 1
                                    ? "macro"
                                    : "macros"
                                } (imported)`,
                                `- ${result.suites.ignoreCount} ${
                                  result.suites.ignoreCount === 1
                                    ? "test suite"
                                    : "test suites"
                                } (test suites are not imported yet)`,
                              ];

                              this.props.addLog("info", lines.join("\n"));
                              message.success(
                                `Project "${result.projectName}" import into folder: "${result.folderName}"`
                              );
                            })
                            .catch((e) => {
                              message.error(e.message);
                            });
                        });
                      }}
                    />

                    <Button
                      type="primary"
                      onClick={() => {
                        const $el = document.querySelector("#select_side_file");

                        if ($el) {
                          $el.click();
                        }
                      }}
                    >
                      Import .SIDE projects
                    </Button>

                    <span>
                      Imports projects from Selenium IDE V3.x (
                      <a
                        href="https://goto.ui.vision/x/idehelp?help=import_side"
                        target="_blank"
                      >
                        more info
                      </a>
                      )
                    </span>
                  </div>
                  <div className="import-row">
                    <input
                      multiple
                      type="file"
                      accept=".html"
                      id="select_html_files_for_macros"
                      ref={(ref) => {
                        this.jsonFileInput = ref;
                      }}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        setTimeout(() => {
                          this.jsonFileInput.value = null;
                        }, 500);

                        return this.props.readFilesAndImportTestCases({
                          files: e.target.files,
                          type: "text",
                          process: (content, fileName) => ({
                            macros: [fromHtml(content, fileName)],
                            csvs: [],
                            images: [],
                          }),
                        });
                      }}
                    />

                    <Button
                      type="primary"
                      onClick={() => {
                        const $el = document.querySelector(
                          "#select_html_files_for_macros"
                        );

                        if ($el) {
                          $el.click();
                        }
                      }}
                    >
                      Import .HTML projects
                    </Button>

                    <span>
                      Import projects from Selenium IDE V2.x (
                      <a
                        href="https://goto.ui.vision/x/idehelp?help=import_html"
                        target="_blank"
                      >
                        more info
                      </a>
                      )
                    </span>
                  </div>

                  <h4>Web Recording Options</h4>

                  <Form>
                    <Form.Item label="Notification" {...displayConfig}>
                      <Checkbox
                        onClick={(e) =>
                          onConfigChange("recordNotification", !e.target.checked)
                        }
                        checked={this.props.config.recordNotification}
                      >
                        Show notifications when recording
                      </Checkbox>
                    </Form.Item>
                  </Form>

                  <h4>Proxy Options</h4>

                  <Form>
                    <Form.Item label="Default Proxy (IP:Port)" {...displayConfig}>
                      <Input
                        type="text"
                        style={{ width: "300px" }}
                        value={this.props.config.defaultProxy}
                        onChange={(e) =>
                          onConfigChange("defaultProxy", e.target.value)
                        }
                        placeholder="eg. http://0.0.0.0:1234"
                      />
                    </Form.Item>
                    <Form.Item label="User name, Password" {...displayConfig}>
                      <Input
                        type="text"
                        style={{ width: "300px" }}
                        value={this.props.config.defaultProxyAuth}
                        onChange={(e) =>
                          onConfigChange("defaultProxyAuth", e.target.value)
                        }
                        placeholder="eg. admin, mypassword"
                      />
                    </Form.Item>
                    <Form.Item label="Status" {...displayConfig}>
                      <Radio.Group
                        value={this.props.proxy ? "on" : "off"}
                      >
                        <Radio value="on" onClick={()=> onChangeProxyStatus('on')}>Proxy ON</Radio>
                        <Radio value="off" onClick={()=> onChangeProxyStatus('off')}>Proxy OFF</Radio>
                      </Radio.Group>

                      <Checkbox
                        onClick={(e) =>
                          onConfigChange("turnOffProxyAfterReplay", !e.target.checked)
                        }
                        checked={this.props.config.turnOffProxyAfterReplay}
                        style={{ marginTop: "10px" }}
                      >
                        Turn off at end of replay (Proxy controlled by{" "}
                        <a
                          href="https://goto.ui.vision/x/idehelp?cmd=setproxy"
                          target="_blank"
                        >
                          setProxy command
                        </a>
                        )
                      </Checkbox>               
                    </Form.Item>
                  </Form>                
                </>                
              )
            },
            {
              key: 'register',
              label: 'Pro|Enterprise',
              className: 'register-pane',
              children: (
                <>
                  <div
                    className={cn("register-note", {
                      inactive: !getLicenseService().hasNoLicense(),
                    })}
                  >
                    <p>Open-Source Ui.Vision PRO and Enterprise Editions are available 
					  for users requiring Enterprise capabilities,
					  including direct file storage, update management, and priority support services. 
					  Should you have already acquired a license key for either the PRO or Enterprise Edition,
					  please proceed to enter it below:
                    </p>
                    <div className="actions">
                      <a href={getLicenseService().getUpgradeUrl()} target="_blank">
                        Click here to upgrade.
                      </a>
                    </div>
                  </div>

                  <div className="register-form">
                    <label>Enter license key:</label>
                    <div className="register-row">
                      <Input
                        value={this.state.registerKey}
                        type="text"
                        onChange={(e) => {
                          this.setState({
                            registerKey: e.target.value,
                          });
                        }}
                      />
                      <Button
                        type="primary"
                        loading={this.state.isCheckingLicense}
                        onClick={this.checkRegisterKey}
                      >
                        Check Key
                      </Button>
                    </div>
                  </div>

                  <div className="register-status">
                    {getLicenseService().hasNoLicense() ? (
                      <div>
                        <span>License status: </span>
                        <b>
                          {this.isEitherXModuleInstalled()
                            ? getLicenseService().getEditionName() + " active"
                            : "Not installed"}
                        </b>
                        .
                        <a href={getLicenseService().getUpgradeUrl()} target="_blank">
                          Upgrade to Ui.Vision PRO or Enterprise
                        </a>
                      </div>
                    ) : null}

                    {getLicenseService().isPersonalLicense() ? (
                      <div>
                        XModules status:{" "}
                        <b>{getLicenseService().getEditionName()} active</b>.
                        <a href={getLicenseService().getUpgradeUrl()} target="_blank">
                          Upgrade to PRO or Enterprise
                        </a>
                      </div>
                    ) : null}

                    {getLicenseService().isProLicense() ? (
                      <div>
                        XModules status:{" "}
                        <b>{getLicenseService().getEditionName()} active</b>.
                        <a href={getLicenseService().getUpgradeUrl()} target="_blank">
                          Contact Support
                        </a>
                      </div>
                    ) : null}

                    {getLicenseService().isPlayerLicense() ? (
                      <div>
                        XModules status:{" "}
                        <b>{getLicenseService().getEditionName()} active</b>.
                        <a href={getLicenseService().getUpgradeUrl()} target="_blank">
                          Contact Support
                        </a>
                      </div>
                    ) : null}
                  </div>
                </>
              )
            }
          
          ]}
        >          
        </Tabs>
      </Modal>
    );
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

              const parts = [
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

    const onClickMenuItem = ({ key }) => {
      switch (key) {
        case "play_loop": {
          this.togglePlayLoopsModal(true);
          break;
        }
      }
    };

    // const playMenu = (
    //   <Menu onClick={onClickMenuItem} selectable={false}>
    //     <Menu.Item key="play_loop" disabled={false}>
    //       Play loop..
    //     </Menu.Item>
    //   </Menu>
    // );

    if (status === C.APP_STATUS.RECORDER) {
      return (
        <div className="actions">
          <Button onClick={this.onToggleRecord} style={{ color: "#ff0000" }}>
            <span>Stop Record</span>
          </Button>
        </div>
      );
    }

    switch (player.status) {
      case C.PLAYER_STATUS.PLAYING: {
        return (
          <div className="actions">
            <Button.Group>
              <Button onClick={() => this.getPlayer().stop()}>
                <span>Stop</span>
              </Button>
              <Button onClick={() => this.getPlayer("testCase").pause()}>
                <span>Pause</span>
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
                <Button onClick={() => this.getPlayer("testCase").resume(true)}>
                  Step
                </Button>
              ) : null}
              <Button onClick={() => this.getPlayer().stop()}>Stop</Button>
              <Button onClick={() => this.getPlayer("testCase").resume()}>
                Resume
              </Button>
            </Button.Group>
          </div>
        );
      }

      case C.PLAYER_STATUS.STOPPED: {
        return (
          <div className="actions">
            <Button
              disabled={!getLicenseService().canPerform(Feature.Record)}
              onClick={this.onToggleRecord}
            >
              <span>Record</span>
            </Button>

            <Button.Group className="play-actions">
              <Button onClick={() => this.playCurrentMacro(true)}>Step</Button>
              <Dropdown.Button
                onClick={() => this.playCurrentMacro(false)}
                menu={{
                  items: [
                    {
                      key: "play_loop",
                      label: "Play loop..",
                      disabled: false,
                    },
                  ],
                  onClick: onClickMenuItem,
                  selectable: false,
                  trigger: ["click"],
                }}
              >
                <span>Play Macro</span>
              </Dropdown.Button>
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

            <Button shape="circle" onClick={() => this.showSettingsModal()}>
              <SettingOutlined />
            </Button>
          </div>
        );
      }
    }
  }

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
        {this.renderPlayLoopModal()}
        {this.renderSettingModal()}
        {this.renderPublicWebsiteWhiteList()}
        {this.renderSettingOfflineModal()}
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
  }),
  (dispatch) => bindActionCreators({ ...actions, ...simpleActions }, dispatch)
)(withRouter(Header));
