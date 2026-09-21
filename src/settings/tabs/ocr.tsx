// Settings > OCR — extracted from the old settings modal in header.js.
// The manual OCRTEXTX calibration and "Screen Scaling %" fields were removed
// in the move: the uiv.ocr.* finders compute coordinates straight from the
// OCR response; only the legacy XClickTextRelative bridge still reads the
// stored calibration value (default 6), which needs no UI.
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import { Button, Input, message, Radio, Select } from 'antd'

import CONFIG from '@/config'
import * as actions from '@/actions'
import { Actions, Actions as simpleActions } from '@/actions/simple_actions'
import { isCVTypeForDesktop } from '@/common/cv_utils'
import { cn } from '@/common/utils'
import { ocrViewport, isXModuleOcrAvailable } from '@/modules/ocr'
import { store } from '@/redux'
import { isOcrSpaceFreeKey, testOcrSpaceAPIKey, installedLocalOcrLanguages } from '@/services/ocr'
import { ocrLanguageOptions } from '@/services/ocr/languages'
import { State } from '@/reducers/state'

const OSType = (() => {
  const ua = window.navigator.userAgent
  if (/windows/i.test(ua)) return 'windows'
  if (/mac/i.test(ua)) return 'mac'
  return 'linux'
})()

interface OcrTabProps {
  config: { [key: string]: any }
  updateConfig: (config: { [key: string]: any }) => void
}

interface OcrTabState {
  ocrLanguageOptions: Array<{ text: string, value: string }>
  userEnteredOCRAPIKey: string
  connectedAPIEndpointType: string | null
  testingOcrAPI: boolean
  // Desktop Automation XModule status for the Local OCR section header:
  // null = still probing
  xmoduleInstalled: boolean | null
}

class OcrTab extends React.Component<OcrTabProps, OcrTabState> {
  state: OcrTabState = {
    ocrLanguageOptions: this.props.config.ocrLanguageOption || ocrLanguageOptions,
    userEnteredOCRAPIKey: '',
    connectedAPIEndpointType: null,
    testingOcrAPI: false,
    xmoduleInstalled: null
  }

  componentDidMount () {
    // Engine1 was removed from the UI; move stored selections to Engine2.
    if (this.props.config.ocrEngine === 1) {
      this.props.updateConfig({ ocrEngine: 2 })
    }
    const key = this.props.config.ocrSpaceApiKey
    if (key) {
      this.setState({ connectedAPIEndpointType: isOcrSpaceFreeKey(key) ? 'free' : 'pro' })
    }
    isXModuleOcrAvailable()
      .then(installed => this.setState({ xmoduleInstalled: installed }))
      .catch(() => this.setState({ xmoduleInstalled: false }))
  }

  onConfigChange = (key: string, val: any) => {
    this.props.updateConfig({ [key]: val })
  }

  onChangeDefaultOCREngine = (value: string) => {
    const onConfigChange = this.onConfigChange
    const lastSelectedEngine = this.props.config.ocrEngine
    onConfigChange('ocrEngine', parseInt(value, 10))
    if (value === '99') {
      // Local OCR = the OS engine inside the Desktop Automation native app.
      // Narrow the language list to what the OS can actually read.
      installedLocalOcrLanguages()
        .then(
          (codes: string[]) => {
            const newOcrlangAr = ocrLanguageOptions.filter(item => codes.indexOf(item.value) > -1)
            if (!newOcrlangAr.length) {
              // host answered but reported nothing usable — keep the full
              // list rather than an empty dropdown
              this.setState({ ocrLanguageOptions: ocrLanguageOptions })
              onConfigChange('ocrLanguageOption', ocrLanguageOptions)
              onConfigChange('ocrLanguage', 'eng')
              return
            }
            this.setState({ ocrLanguageOptions: newOcrlangAr })
            onConfigChange('ocrLanguageOption', newOcrlangAr)
            const haveEng = newOcrlangAr.filter((lang) => lang.value === 'eng')
            onConfigChange('ocrLanguage', haveEng.length !== 0 ? 'eng' : newOcrlangAr[0]['value'])
          },
          () => {
            onConfigChange('ocrLanguage', 'eng')
            onConfigChange('ocrLanguageOption', this.state.ocrLanguageOptions)
            onConfigChange('ocrEngine', lastSelectedEngine)
            message.info('status updated: Not Installed')
          }
        )
    } else {
      this.setState({ ocrLanguageOptions: ocrLanguageOptions })
      onConfigChange('ocrLanguageOption', ocrLanguageOptions)
      onConfigChange('ocrLanguage', 'eng')
    }
  }

  onTestOcrApiKey = () => {
    const onConfigChange = this.onConfigChange
    const key = this.state.userEnteredOCRAPIKey?.trim()
    if (!key) {
      message.error('Please enter a valid API key')
      return
    }
    const isFreeApiKey = isOcrSpaceFreeKey(key)
    // Pro endpoints (apipro1 main / apipro2 backup) are shared by ALL
    // engines; the engine is selected via the OCREngine request param,
    // not the URL. Just use the main pro endpoint here.
    const url = isFreeApiKey ? CONFIG.ocr.freeApiEndpoint : CONFIG.ocr.proApi1Endpoint

    testOcrSpaceAPIKey({ key, url }).then((res: any) => {
      if (res) {
        this.setState({ connectedAPIEndpointType: isFreeApiKey ? 'free' : 'pro' })
        onConfigChange('ocrSpaceApiKey', key)
      } else {
        message.error('Invalid API key')
        this.setState({ connectedAPIEndpointType: null })
        onConfigChange('ocrSpaceApiKey', '')
      }
    }).catch((e: Error) => {
      message.error(e.message)
    })
  }

  render () {
    const { config } = this.props
    const onConfigChange = this.onConfigChange

    const paneClass = cn('ocr-pane', {
      'ocr-disabled': config.ocrMode === 'disabled',
      'ocr-enabled': config.ocrMode === 'enabled'
    }) || ''

    return (
      <div className={paneClass}>
        <div>
          <p>
            <span className="label-text">Select Default OCR Engine</span>
          </p>
        </div>
        <div className="row">
          <span className="label-text">Local OCR — needs the{' '}
            <a
              href="#desktop-automation"
              onClick={e => { e.preventDefault(); window.location.hash = 'desktop-automation' }}
            >
              Desktop Automation XModule
            </a>
            {this.state.xmoduleInstalled === null
              ? ''
              : this.state.xmoduleInstalled
                ? ' (status: installed)'
                : ' (status: not installed)'}
            {'  ['}
            <a href="https://go.ui.vision/?help=ocr-local" target="_blank">more info</a>
            {']'}
          </span>
          <br />
          <Radio.Group
            className="radio-block"
            style={{ marginLeft: '5%' }}
            value={'' + config.ocrEngine}
          >
            {/* id 98, {engine: 'builtin'} in JS scripts: the ocrs engine in
                the native app — the SAME recognition on every OS. */}
            <Radio value="98" onClick={() => this.onChangeDefaultOCREngine('98')}>
              Built-in Cross-Platform OCR (ID &ldquo;builtin&rdquo;)
            </Radio>
            {/* id 99: the OS reader (Windows.Media.Ocr / Apple Vision).
                On Linux there is no separate OS reader — both ids run the
                cross-platform engine, so only one local option is shown. */}
            {OSType !== 'linux' ? (
              <Radio value="99" onClick={() => this.onChangeDefaultOCREngine('99')}>
                {OSType === 'mac'
                  ? <>Built-in local macOS OCR (ID &ldquo;builtin_mac&rdquo;)</>
                  : <>Built-in local Windows OCR (ID &ldquo;builtin_win&rdquo;)</>}
              </Radio>
            ) : null}
          </Radio.Group>
        </div>
        <div className="row">
          <span className="label-text">Cloud OCR — to use Ocr.Space you need a{' '}
            <a href="https://go.ui.vision/?help=free-ocr-api" target="_blank">Free OCR API account</a>
          </span>
          <br />
          <Radio.Group
            className="radio-block"
            style={{ marginLeft: '5%' }}
            value={'' + config.ocrEngine}
          >
            <Radio value="2" onClick={() => this.onChangeDefaultOCREngine('2')}>
              OCR.Space, Engine2 (ID &ldquo;ocrspace_engine2&rdquo;)
            </Radio>
            <Radio value="3" onClick={() => this.onChangeDefaultOCREngine('3')}>
              OCR.Space, Engine3 (ID &ldquo;ocrspace_engine3&rdquo;)
            </Radio>
            {/* id 90, {engine: 'aiprovider'}: the configured AI provider as
                OCR engine — like using ai.ask for OCR, but integrated with
                findText & Co the way OCR.Space is (proxy task: 'aiocr'). */}
            <Radio value="90" onClick={() => this.onChangeDefaultOCREngine('90')}>
              Use{' '}
              <a
                href="#ai"
                onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.hash = 'ai' }}
              >
                AI Provider
              </a>
              {' '}(ID &ldquo;aiprovider&rdquo;)
            </Radio>
          </Radio.Group>
          <div>
            <span className="label-text">OCR.Space OCR API Key:</span>
            <Input
              type="text"
              style={{ width: '120px' }}
              value={this.state.userEnteredOCRAPIKey}
              disabled={![2, 3].includes(config.ocrEngine)}
              onChange={(e) => this.setState({ userEnteredOCRAPIKey: e.target.value })}
            />
            <Button
              type="primary"
              style={{ marginLeft: '8px' }}
              disabled={![2, 3].includes(config.ocrEngine)}
              onClick={this.onTestOcrApiKey}
            >
              Test
            </Button>
            {this.state.connectedAPIEndpointType ? (
              <span className="api-key-notification">
                API key stored. Connected to {this.state.connectedAPIEndpointType.toUpperCase()} endpoint.
              </span>
            ) : null}
          </div>
        </div>

        <div className="row">
          <div>
            <span className="label-text">Default OCR language</span>
            <Select
              style={{ width: '150px' }}
              placeholder="OCR Language"
              value={config.ocrLanguage}
              disabled={
                // engine 2 and the AI provider auto-detect the language;
                // the local readers (98/99) work with no OCR.Space account
                config.ocrEngine === 2 || config.ocrEngine === 90 ||
                (config.ocrMode === 'disabled' && ![98, 99].includes(config.ocrEngine))
              }
              onChange={(val) => onConfigChange('ocrLanguage', val)}
            >
              {this.state.ocrLanguageOptions.map((item) => (
                <Select.Option value={item.value} key={item.value}>
                  {item.text}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            You can overwrite the default OCR settings in the macro with{' '}
            <a href="https://go.ui.vision/?help=ocrlanguage" target="_blank">!OCRLanguage</a>{' '}
            and{' '}
            <a href="https://go.ui.vision/?help=ocrengine" target="_blank">!OCREngine</a>.
          </div>
        </div>
        <div className="row">
          <p>
            <Button
              type="primary"
              loading={this.state.testingOcrAPI}
              disabled={
                // only the OCR.Space engines need the account/key
                config.ocrMode === 'disabled' &&
                ![90, 98, 99].includes(config.ocrEngine)
              }
              onClick={() => {
                this.setState({ testingOcrAPI: true })

                const isDesktopMode = isCVTypeForDesktop(config.cvScope)
                if (isDesktopMode) store.dispatch(Actions.setOcrInDesktopMode(true))

                ocrViewport({
                  store: (window as any)['store'],
                  isDesktop: isDesktopMode
                })
                  .catch((e: Error) => {
                    // #150/#160/#170: in Browser Vision mode the overlay
                    // draws into the last-used WEBSITE tab — being on this
                    // settings tab (or any extension/chrome:// page) when
                    // clicking the test leaves it no page to draw on
                    message.error(/#1[567]0/.test(e.message)
                      ? 'The overlay test needs a normal website tab: open one (and play any macro once so Ui.Vision targets it), then click the test again. ' + e.message
                      : e.message)
                  })
                  .then(() => {
                    this.setState({ testingOcrAPI: false })
                    store.dispatch(Actions.setOcrInDesktopMode(false))
                  })
              }}
            >
              Show OCR Overlay
            </Button>
            <span style={{ marginLeft: '10px' }}>
              currently in <b>{isCVTypeForDesktop(config.cvScope) ? 'Desktop' : 'Browser'} Vision</b> mode —{' '}
              <a
                href="#vision"
                onClick={e => { e.preventDefault(); window.location.hash = 'vision' }}
              >
                change in Vision settings
              </a>
            </span>
          </p>

          <p>
            {isCVTypeForDesktop(config.cvScope)
              ? 'The test runs OCR on a desktop screenshot and displays the result as overlay.'
              : 'The test runs OCR on the currently active browser tab and displays the result as overlay.'}
          </p>
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
)(OcrTab as any)
