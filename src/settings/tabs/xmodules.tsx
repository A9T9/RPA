// Settings > XModules — extracted from the old settings modal in header.js
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import { Button, Input, message } from 'antd'

import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { compose, setIn, updateIn } from '@/common/utils'
import Ext from '@/common/web_extension'
import { isMac } from '@/common/ts_utils'
import { getStorageManager, StorageManagerEvent } from '@/services/storage'
import { getXDesktop } from '@/services/xmodules/xdesktop'
import { getXFile } from '@/services/xmodules/xfile'
import { getXUserIO } from '@/services/xmodules/x_user_io'
import { getNativeXYAPI, MouseButton, MouseEventType } from '@/services/xy'
import { getNativeCVAPI } from '@/services/desktop'
import { State } from '@/reducers/state'

type InputTestResult = {
  ok: boolean
  title: string
  detail: string
}

type ShotTestResult = {
  ok: boolean
  title: string
  detail: string
  preview?: string
}

interface XModulesTabProps {
  config: { [key: string]: any }
  updateConfig: (config: { [key: string]: any }) => void
}

interface XModulesTabState {
  xModuleData: { [key: string]: any }
  xFileRootDirChanged: boolean
  inputTest: InputTestResult | null
  inputTesting: boolean
  shotTest: ShotTestResult | null
  shotTesting: boolean
}

class XModulesTab extends React.Component<XModulesTabProps, XModulesTabState> {
  state: XModulesTabState = {
    xModuleData: {},
    xFileRootDirChanged: false,
    inputTest: null,
    inputTesting: false,
    shotTest: null,
    shotTesting: false
  }

  componentDidMount () {
    this.initXModules()
  }

  initXModules () {
    const xModules: any[] = [getXFile(), getXUserIO(), getXDesktop()]

    Promise.all(
      xModules.map((mod) => {
        // Note: call init config for each xmodule and discard any error
        return mod
          .initConfig()
          .catch(() => {})
          .then(() => mod.getVersion())
          .then((versionInfo: any) => {
            if (versionInfo.installed) {
              return mod
                .sanityCheck()
                .then(
                  () => ({ error: null }),
                  (e: Error) => ({ error: e.message })
                )
                .then((checkResult: any) => ({ versionInfo, checkResult }))
            } else {
              return { versionInfo, checkResult: null }
            }
          })
      })
    ).then((results) => {
      const xModuleData = results.reduce((prev: any, r: any, i: number) => {
        prev[xModules[i].getName()] = {
          ...r.versionInfo,
          checkResult: r.checkResult,
          config: xModules[i].getCachedConfig()
        }
        return prev
      }, {})

      this.setState({ xModuleData, xFileRootDirChanged: false })
    })
  }

  // "Installed" only means the native host answered getVersion. It says
  // NOTHING about whether the events that host posts actually reach the
  // screen: on macOS, without an Accessibility grant, CGEventPost silently
  // succeeds and the OS discards the event. Every macro then fails somewhere
  // far away ("element not found", "click never reached the page") with no
  // hint that input was never delivered.
  //
  // So actually deliver one. Park the OS cursor at the centre of THIS window
  // and let this very page say whether it arrived: a mousemove carries
  // clientX/clientY, so the page measures the result instead of trusting the
  // host's "true". That also checks the coordinate conversion for free — a
  // pointer that lands somewhere else reports the ratio it actually hit.
  testDesktopInput = () => {
    const api: any = getNativeXYAPI()
    const expectX = Math.round(window.innerWidth / 2)
    const expectY = Math.round(window.innerHeight / 2)
    let got: { x: number, y: number } | null = null

    const onMove = (e: any) => { got = { x: e.clientX, y: e.clientY } }
    const finish = (r: InputTestResult) => {
      window.removeEventListener('mousemove', onMove, true)
      this.setState({ inputTest: r, inputTesting: false })
    }

    this.setState({ inputTesting: true, inputTest: null })
    window.addEventListener('mousemove', onMove, true)

    // viewport origin in CSS points: exact on Firefox, derived on Chrome
    const moz = (window as any).mozInnerScreenX
    const originX = typeof moz !== 'undefined' ? moz : window.screenLeft
    const originY = typeof moz !== 'undefined'
      ? (window as any).mozInnerScreenY
      : window.screenTop + (window.outerHeight - window.innerHeight)

    // CSS POINTS, un-scaled. sendDesktopMouseEvent applies getScalingFactor()
    // itself — dpr on Windows, 1 on macOS, where the native host takes points —
    // so its input is points on both platforms. (An earlier version of this
    // test multiplied by the backing scale, aimed at twice the distance, missed
    // the window and then blamed Accessibility for it. Desktop-scope FINDERS
    // return points too; only ai.find hands back capture pixels, and it divides
    // them itself.)
    Promise.resolve()
      .then(() => {
        return api.sendDesktopMouseEvent({
          type: MouseEventType.Move,
          button: MouseButton.Left,
          x: originX + expectX,
          y: originY + expectY
        })
      })
      .then(() => new Promise((resolve) => setTimeout(resolve, 900)))
      .then(() => {
        if (!got) {
          finish({
            ok: false,
            title: 'The XModule is installed, but the pointer never arrived on this window.',
            detail: 'FIRST: did you touch the mouse or trackpad while the test ran? Your own movement overrides the one being tested and this result means nothing — run it again without touching anything. Otherwise, two real causes. (1) ANOTHER WINDOW IS COVERING this one at its centre — the pointer moved, but onto that window instead, so this page never saw it. Move other windows off the browser and test again; that is the likelier cause if desktop macros used to work.' +
              (isMac()
                ? ' (2) macOS is discarding the events entirely: open System Settings > Privacy & Security > Accessibility and switch ON "kantu-xy-host" (Ui.Vision\'s RealUser helper — the browser itself does not appear in that list), then QUIT and reopen the browser so the helper restarts. A stale entry left from an older XModules version looks enabled but points at a path that no longer exists: switch it off and on again to re-grant it.'
                : ' (2) The RealUser XModule is installed but not working — check for an update.')
          })
          return
        }

        const dx = (got as any).x - expectX
        const dy = (got as any).y - expectY

        if (Math.abs(dx) <= 12 && Math.abs(dy) <= 12) {
          finish({
            ok: true,
            title: 'Desktop input works.',
            detail: `The pointer was placed within ${Math.max(Math.abs(dx), Math.abs(dy))}px of the requested spot, so OS-level clicks and keystrokes are being delivered and the screen-coordinate conversion is correct on this display.`
          })
          return
        }

        const ratioX = expectX ? ((got as any).x + 0) / expectX : 0
        finish({
          ok: false,
          title: 'Input is delivered, but it lands in the wrong place.',
          detail: `Asked for (${expectX}, ${expectY}) inside this window and the pointer arrived at (${(got as any).x}, ${(got as any).y}) — off by ${dx},${dy}px (about ${ratioX.toFixed(2)}x). Clicks will miss their targets. This is a screen-scaling mismatch, not a permission problem; report it with this display's scaling setting (devicePixelRatio ${window.devicePixelRatio}).`
        })
      })
      .catch((e: Error) => {
        finish({
          ok: false,
          title: 'Could not reach the RealUser XModule.',
          detail: `${e && e.message ? e.message : e}. Install or update the XModule, then try again.`
        })
      })
  }

  // "Installed" only means the CV host answered getVersion — it says nothing
  // about whether the host can actually SEE the screen. On macOS a desktop
  // capture needs Screen Recording permission, and without it the failure is
  // silent and wears two disguises: either no file is produced at all, or one
  // is produced showing the wallpaper with every window missing. Both reach a
  // macro as "OCR found nothing" / "no image matched >= 0.75", which points at
  // the reader or the anchor images and sends people to fix the wrong thing.
  //
  // So take a real capture and SHOW it. The picture answers in one look what a
  // pass/fail line cannot: no file (host cannot capture), wallpaper only (no
  // Screen Recording), or the actual screen (capture is fine — any macro
  // failure is downstream, in OCR or the images).
  testDesktopScreenshot = () => {
    const finish = (r: ShotTestResult) => this.setState({ shotTest: r, shotTesting: false })
    this.setState({ shotTesting: true, shotTest: null })

    const cv: any = getNativeCVAPI()

    cv.captureDesktop({})
      .then((filePath: string) => {
        if (!filePath) throw new Error('the host returned no file path')
        return cv.readFileAsDataURL(filePath, true).then((dataUrl: string) => ({ filePath, dataUrl }))
      })
      .then(({ filePath, dataUrl }: { filePath: string, dataUrl: string }) => {
        if (!dataUrl || dataUrl.length < 128) {
          throw new Error(`the capture file at '${filePath}' is empty`)
        }

        return new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => {
            finish({
              ok: true,
              title: `Desktop capture works — ${img.naturalWidth} x ${img.naturalHeight} px.`,
              detail: 'Check the picture below: it must show your SCREEN. If it shows only the desktop wallpaper with every window missing, macOS is withholding Screen Recording — grant it (see the failure text) and capture again. If the screen looks right, the capture side is fine, and a macro that still finds nothing has a reader or anchor-image problem instead.',
              preview: dataUrl
            })
            resolve()
          }
          img.onerror = () => {
            finish({
              ok: false,
              title: 'The host produced a file, but it is not a readable image.',
              detail: `Saved at '${filePath}'. Reinstall or update the DesktopAutomation XModule.`
            })
            resolve()
          }
          img.src = dataUrl
        })
      })
      .catch((e: Error) => {
        const msg = (e && e.message) || String(e)
        finish({
          ok: false,
          title: 'No desktop capture was produced.',
          detail: `${msg}. ` + (isMac()
            ? 'On macOS this is Screen Recording. Open System Settings > Privacy & Security > Screen Recording, find "kantu-cv-host" (Ui.Vision\'s DesktopAutomation helper — the browser itself does not need to be in this list), and TOGGLE IT OFF AND ON even if it already shows as enabled: macOS re-confirms screen recording periodically, and an entry whose grant has quietly lapsed looks exactly like an enabled one while every capture fails. Then QUIT and reopen the browser so the helper restarts. If the helper is not listed at all, switch it on after the next capture attempt prompts for it. (Measured on macOS 26: this exact state let Firefox capture while Chrome got "Failed." from the same helper — re-granting fixed it; adding the browser to the list did nothing.)'
            : 'Check that the DesktopAutomation XModule is installed and up to date.')
        })
      })
  }

  refreshModuleStatus = (mod: any) => {
    mod.getVersion().then((data: any) => {
      const { installed, version } = data
      const msg = installed ? `Installed (v${version})` : 'Not Installed'
      message.info(`status updated: ${msg}`)

      const p = !installed || !mod.initConfig ? Promise.resolve() : mod.initConfig()

      Promise.resolve(p).catch(() => {}).then(() => {
        this.setState(
          updateIn(
            ['xModuleData', mod.getName()],
            (orig: any) => ({ ...orig, ...data, config: mod.getCachedConfig() }),
            this.state
          )
        )
      })
    })
  }

  renderModuleStatus (mod: any) {
    const data = this.state.xModuleData[mod.getName()]

    return (
      <div className="xmodule-status">
        <label>Status:</label>

        {data && data.installed ? (
          <div className="status-box">
            <span>Installed (v{data.version})</span>
            <a
              target="_blank"
              href={mod.checkUpdateLink(
                data && data.version,
                Ext.runtime.getManifest().version
              )}
            >
              Check for update
            </a>
          </div>
        ) : (
          <div className="status-box">
            <span>Not Installed</span>
            <a href={mod.downloadLink()} target="_blank">
              Download it
            </a>
          </div>
        )}
      </div>
    )
  }

  render () {
    const xFileData = this.state.xModuleData[getXFile().getName()]

    return (
      <div className="xmodules-pane">
        <div className="xmodule-item">
          <div className="xmodule-title">
            <span>
              <b>FileAccess XModule</b> - Read and write to your hard drive
            </span>
            <a href={getXFile().infoLink()} target="_blank">
              More Info
            </a>
            <Button type="primary" onClick={() => this.refreshModuleStatus(getXFile())}>
              Test it
            </Button>
          </div>

          {this.renderModuleStatus(getXFile())}

          <div className="xmodule-settings">
            <h3>Settings</h3>
            <div className="xmodule-settings-item">
              <div className="settings-detail">
                <label>Home Folder</label>
                <div className="settings-detail-content">
                  <Input
                    type="text"
                    value={getXFile().getCachedConfig().rootDir}
                    disabled={!(xFileData && xFileData.installed)}
                    onChange={(e) => {
                      const rootDir = e.target.value

                      this.setState(
                        compose(
                          setIn(
                            ['xModuleData', getXFile().getName(), 'config', 'rootDir'],
                            rootDir
                          ),
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
                            (e: Error) => {
                              this.setState(
                                setIn(
                                  ['xModuleData', getXFile().getName(), 'checkResult'],
                                  { error: e.message },
                                  this.state
                                )
                              )
                            }
                          )
                      }
                    }}
                  />

                  {xFileData &&
                  xFileData.checkResult &&
                  xFileData.checkResult.error ? (
                    <div className="check-result">
                      {xFileData.checkResult.error}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="settings-desc">
                In this folder, Ui.Vision creates /macros, /images, /datasources
              </div>
            </div>
          </div>
        </div>

        <div className="xmodule-item">
          <div className="xmodule-title">
            <span>
              <b>RealUser XModule</b> - Click / Type / Drag with OS native events
            </span>
            <a href={getXUserIO().infoLink()} target="_blank">
              More Info
            </a>
            <Button type="primary" onClick={() => this.refreshModuleStatus(getXUserIO())}>
              Test it
            </Button>
            <Button
              style={{ marginLeft: '8px' }}
              loading={this.state.inputTesting}
              onClick={this.testDesktopInput}
              title="Moves the real mouse pointer for about a second — do not touch the mouse while it runs"
            >
              Test real input
            </Button>
          </div>

          {this.renderModuleStatus(getXUserIO())}

          {/* The test MOVES the real pointer, so a hand on the mouse or
              trackpad invalidates it: that movement fires its own mousemove
              and the test would read it as the XModule's. Say so while it
              runs, not afterwards. */}
          {this.state.inputTesting ? (
            <div
              className="check-result"
              style={{ marginTop: '8px', color: '#d46b08', fontWeight: 'bold' }}
            >
              Moving the mouse pointer — DO NOT touch the mouse or trackpad until this
              finishes (about a second). Your own movement would be measured instead.
            </div>
          ) : null}

          {this.state.inputTest ? (
            <div
              className="check-result"
              style={{
                marginTop: '8px',
                color: this.state.inputTest.ok ? '#389e0d' : '#cf1322'
              }}
            >
              <b>{this.state.inputTest.title}</b>
              <div style={{ marginTop: '4px' }}>{this.state.inputTest.detail}</div>
            </div>
          ) : null}
        </div>

        <div className="xmodule-item">
          <div className="xmodule-title">
            <span>
              <b>DesktopAutomation XModule</b> - Visual Desktop Automation
            </span>
            <a href={getXDesktop().infoLink()} target="_blank">
              More Info
            </a>
            <Button type="primary" onClick={() => this.refreshModuleStatus(getXDesktop())}>
              Test it
            </Button>
            <Button
              style={{ marginLeft: '8px' }}
              loading={this.state.shotTesting}
              onClick={this.testDesktopScreenshot}
              title="Takes one real screen capture and shows it, so you can see what the vision commands actually see"
            >
              Test screenshot
            </Button>
          </div>

          {this.renderModuleStatus(getXDesktop())}

          {this.state.shotTest ? (
            <div
              className="check-result"
              style={{
                marginTop: '8px',
                color: this.state.shotTest.ok ? '#389e0d' : '#cf1322'
              }}
            >
              <b>{this.state.shotTest.title}</b>
              <div style={{ marginTop: '4px' }}>{this.state.shotTest.detail}</div>
              {this.state.shotTest.preview ? (
                <img
                  src={this.state.shotTest.preview}
                  alt="desktop capture"
                  style={{
                    display: 'block',
                    marginTop: '8px',
                    maxWidth: '100%',
                    border: '1px solid #d9d9d9',
                    borderRadius: '3px'
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    )
  }
}

export default connect(
  (state: State) => ({
    config: (state as any).config
  }),
  (dispatch: Dispatch) => bindActionCreators({ ...actions, ...simpleActions } as any, dispatch)
)(XModulesTab as any)
