// Settings > Advanced > Replay — extracted from the old settings modal in
// header.js. The "If error happens in loop" and "Show notifications when
// recording" settings were removed in the move (2026-07 settings cleanup).
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import { Button, Checkbox, Form, Input, message, Modal, Select } from 'antd'

import { requestCrossPageForceReload } from '@/services/storage'

import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { State } from '@/reducers/state'

const displayConfig = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 }
}

interface ReplayTabProps {
  config: { [key: string]: any }
  updateConfig: (config: { [key: string]: any }) => void
  restoreDemoMacros: (kind: string) => Promise<any>
}

class ReplayTab extends React.Component<ReplayTabProps, { restoringDemos: string | null }> {
  state = { restoringDemos: null as string | null }

  restoreDemos = (kind: string, successText: string) => {
    if (this.state.restoringDemos) return
    // restore is a FACTORY RESET of the demo folder (deleted, then rewritten
    // fresh — see restoreDemoMacros): edited demos, stale copies and any of
    // the user's own macros saved inside that folder are removed with it, so
    // say so before doing it. Folder names as literals on purpose: importing
    // them from preinstall_macros would pull the whole demo set into the
    // settings bundle.
    const folder = kind === 'classic' ? 'Demo and QA Test Scripts (Classic)' : 'Demo and QA Test Scripts'
    Modal.confirm({
      title: 'Restore demo macros?',
      content: `This resets the "${folder}" folder to the shipped demos: the folder is deleted and written fresh. Changes you made to demo macros — and any of your own macros saved inside that folder — are removed. Macros outside the folder are not touched.`,
      okText: 'Restore',
      cancelText: 'Cancel',
      onOk: () => {
        this.setState({ restoringDemos: kind })
        return this.props.restoreDemoMacros(kind)
          // the restore ran in THIS page's storage manager — tell the side
          // panel / IDE window to reload their macro tree
          .then(() => requestCrossPageForceReload())
          .then(() => message.success(successText, 5))
          .catch((e: Error) => message.error(e.message))
          .finally(() => this.setState({ restoringDemos: null }))
      }
    })
  }

  onConfigChange = (key: string, val: any) => {
    this.props.updateConfig({ [key]: val })
  }

  render () {
    const { config } = this.props
    const onConfigChange = this.onConfigChange

    return (
      <Form>
        <Form.Item label="Replay Helper" {...displayConfig}>
          <Checkbox
            onChange={(e: any) =>
              onConfigChange('playScrollElementsIntoView', e.target.checked)
            }
            checked={config.playScrollElementsIntoView}
          >
            Scroll elements into view during replay
          </Checkbox>

          <Checkbox
            onChange={(e: any) =>
              onConfigChange('playHighlightElements', e.target.checked)
            }
            checked={config.playHighlightElements}
          >
            Replay browser animations (adds ~0.2s per command)
          </Checkbox>

          <Checkbox
            onChange={(e: any) =>
              onConfigChange('playDesktopAnimations', e.target.checked)
            }
            checked={config.playDesktopAnimations !== false}
          >
            Replay desktop animations (screen border and match boxes)
          </Checkbox>

          <Checkbox
            style={{ marginLeft: 24 }}
            disabled={config.playDesktopAnimations === false}
            onChange={(e: any) =>
              onConfigChange('desktopBorderCaptureVisible', e.target.checked)
            }
            checked={!!config.desktopBorderCaptureVisible}
          >
            Show border even during remote sessions (border then visible on
            screenshots)
          </Checkbox>
        </Form.Item>

        <Form.Item
          label={
            <a target="_blank" href="https://go.ui.vision/?help=command_interval">
              Command Interval
            </a>
          }
          {...displayConfig}
        >
          <Select
            style={{ width: '200px' }}
            placeholder="interval"
            value={'' + config.playCommandInterval}
            onChange={(val) => onConfigChange('playCommandInterval', val)}
          >
            <Select.Option value={'0'}>Fast (no delay)</Select.Option>
            <Select.Option value={'0.3'}>Medium (0.3s delay)</Select.Option>
            <Select.Option value={'2'}>Slow (2s delay)</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={
            <a target="_blank" href="https://go.ui.vision/?help=timeout_pageload">
              !TIMEOUT_PAGELOAD
            </a>
          }
          {...displayConfig}
        >
          <Input
            type="number"
            min="0"
            style={{ width: '70px' }}
            value={config.timeoutPageLoad}
            onChange={(e) => onConfigChange('timeoutPageLoad', e.target.value)}
            placeholder="in seconds"
          />
          <span className="tip">Max. time for new page load</span>
        </Form.Item>

        <Form.Item
          label={
            <a target="_blank" href="https://go.ui.vision/?help=timeout_wait">
              !TIMEOUT_WAIT
            </a>
          }
          {...displayConfig}
        >
          <Input
            type="number"
            min="0"
            style={{ width: '70px' }}
            value={config.timeoutElement}
            onChange={(e) => onConfigChange('timeoutElement', e.target.value)}
            placeholder="in seconds"
          />
          <span className="tip">Max. time per step</span>
        </Form.Item>
        <Form.Item
          label={
            <a target="_blank" href="https://go.ui.vision/?help=timeout_macro">
              !TIMEOUT_MACRO
            </a>
          }
          {...displayConfig}
        >
          <Input
            type="number"
            min="0"
            style={{ width: '70px' }}
            value={config.timeoutMacro}
            onChange={(e) => onConfigChange('timeoutMacro', e.target.value)}
            placeholder="in seconds"
          />
          <span className="tip">Max. overall macro runtime</span>
        </Form.Item>
        <Form.Item
          label={
            <a target="_blank" href="https://go.ui.vision/?help=timeout_download">
              !TIMEOUT_DOWNLOAD
            </a>
          }
          {...displayConfig}
        >
          <Input
            type="number"
            min="0"
            style={{ width: '70px' }}
            value={config.timeoutDownload}
            onChange={(e) => onConfigChange('timeoutDownload', e.target.value)}
            placeholder="in seconds"
          />
          <span className="tip">Max. allowed time for file</span>
        </Form.Item>
        <Form.Item label="For Tech Support/QA" {...displayConfig}>
          {/* one flex row: default-height buttons match the label's line
              height, so the label, the text and the buttons sit on one
              baseline (small buttons left the label hanging low) */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>Restore Demo Macros:</span>
            {/* the restore writes ~50 macros plus csv/vision resources and
                takes many seconds — without the spinner the button looked
                hung until the toast finally appeared (user report) */}
            <Button
              loading={this.state.restoringDemos === 'js'}
              disabled={!!this.state.restoringDemos && this.state.restoringDemos !== 'js'}
              onClick={() => this.restoreDemos('js', 'JavaScript demo macros restored.')}
            >
              JavaScript
            </Button>
            <Button
              loading={this.state.restoringDemos === 'classic'}
              disabled={!!this.state.restoringDemos && this.state.restoringDemos !== 'classic'}
              onClick={() => this.restoreDemos('classic', 'Classic demo macros restored.')}
            >
              Classic
            </Button>
          </div>
          <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '8px' }}>
            Restore rewrites the &quot;Demo and QA Test Scripts&quot; folder with the shipped demos. Updates refresh it while it exists; a deleted folder stays deleted. Keep your own macros outside it.
          </div>
        </Form.Item>
      </Form>
    )
  }
}

export default connect(
  (state: State) => ({
    config: (state as any).config
  }),
  (dispatch: Dispatch) => bindActionCreators({ ...actions, ...simpleActions } as any, dispatch)
)(ReplayTab as any)
