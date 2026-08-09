// Settings > General — extracted from the old settings modal in header.js
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import { Button, Checkbox, Form, message, Modal, Select } from 'antd'

import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { goUivUrl } from '@/common/uiv_link'
import { getStorageManager, StorageManagerEvent, StorageStrategyType } from '@/services/storage'
import { State } from '@/reducers/state'

const displayConfig = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 }
}

interface GeneralTabProps {
  config: { [key: string]: any }
  updateConfig: (config: { [key: string]: any }) => void
  restoreDemoMacros: (kind: string) => Promise<any>
}

class GeneralTab extends React.Component<GeneralTabProps> {
  onConfigChange = (key: string, val: any) => {
    this.props.updateConfig({ [key]: val })
  }

  // same flow as the IDE's storage-mode selector: validate availability,
  // then switch — the storage manager emits events that reload all resources
  onTryToChangeStorageMode = (storageMode: string) => {
    const man = getStorageManager()

    man.isStrategyTypeAvailable(storageMode)
      .then((isOk: boolean) => {
        if (isOk) {
          this.props.updateConfig({ storageMode })
          return man.setCurrentStrategyType(storageMode)
        }

        throw new Error('It should be impossible to get isOk as false')
      })
      .catch((e: Error) => {
        // hard-drive mode needs the FileAccess XModule — explain why the
        // selection snaps back to "in browser" instead of silently reverting
        Modal.confirm({
          title: 'Hard-drive mode not available',
          content: (
            <div>
              <p style={{ marginBottom: '10px' }}>
                Storing macros on the hard drive requires the <b>FileAccess XModule</b>, a small
                helper app installed next to the browser — extensions cannot access the file
                system on their own.
              </p>
              <p style={{ marginBottom: '10px' }}>
                It is not installed (or not reachable), so the storage mode stays at
                &quot;Local Storage (in browser)&quot; for now.
              </p>
              <p style={{ marginBottom: 0, color: '#888' }}>({e.message})</p>
            </div>
          ),
          okText: 'Show XModules settings',
          cancelText: 'Close',
          onOk: () => {
            window.location.hash = 'xmodules'
          }
        })
      })
  }

  render () {
    const { config } = this.props
    const onConfigChange = this.onConfigChange

    return (
      <Form>
        <Form.Item label="Ui.Vision Side Panel" {...displayConfig}>
          <Checkbox
            onChange={(e: any) => {
              onConfigChange('showSidePanel', e.target.checked)
            }}
            checked={config.showSidePanel}
          >
            Open Side Panel by default
          </Checkbox>
          {/* the "Side Panel is on the left" checkbox is gone: since v10.0.76
              the viewport origin is MEASURED from trusted mouse events, which
              already include a left-docked panel — the manual correction it
              drove became a double-count (see getSidePanelWidth's tombstone in
              modules/helper.ts). The config key stays in storage, ignored. */}
        </Form.Item>
        <Form.Item
          label={
            <a target="_blank" href="https://go.ui.vision/?help=storage_mode">
              Storage Mode
            </a>
          }
          {...displayConfig}
        >
          <Select
            style={{ width: '220px' }}
            value={config.storageMode}
            onChange={this.onTryToChangeStorageMode}
          >
            <Select.Option value={StorageStrategyType.Browser}>
              Local Storage (in browser)
            </Select.Option>
            <Select.Option value={StorageStrategyType.XFile}>
              File system (on hard drive)
            </Select.Option>
          </Select>
          {getStorageManager().isXFileMode() ? (
            <a
              style={{ marginLeft: '10px' }}
              onClick={(e) => {
                e.preventDefault()
                getStorageManager().emit(StorageManagerEvent.ForceReload)
                message.info('reloaded from hard drive')
              }}
            >
              Reload files
            </a>
          ) : null}
        </Form.Item>
        <Form.Item label="Ui.Vision Color Theme" {...displayConfig}>
          <Checkbox
            onChange={(e: any) => {
              const useDarkTheme = e.target.checked
              onConfigChange('useDarkTheme', useDarkTheme)
              document.documentElement.setAttribute('data-theme', useDarkTheme ? 'dark' : 'light')
            }}
            checked={config.useDarkTheme}
            style={{ marginBottom: 0 }}
          >
            Use Dark Mode (
            <a
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                window.open(goUivUrl('https://go.ui.vision/?help=darkmode'))
              }}
            >
              Beta - report issues here
            </a>
            )
          </Checkbox>
        </Form.Item>
        <Form.Item label="For Tech Support/QA" {...displayConfig}>
          <span style={{ marginRight: '8px' }}>Restore Demo Macros:</span>
          <Button
            size="small"
            style={{ marginRight: '8px' }}
            onClick={() => {
              this.props.restoreDemoMacros('js')
                .then(() => message.success('JavaScript demo macros restored. If the macro tree does not show them, close and reopen the extension.', 5))
                .catch((e: Error) => message.error(e.message))
            }}
          >
            JavaScript
          </Button>
          <Button
            size="small"
            onClick={() => {
              this.props.restoreDemoMacros('classic')
                .then(() => message.success('Classic demo macros restored. If the macro tree does not show them, close and reopen the extension.', 5))
                .catch((e: Error) => message.error(e.message))
            }}
          >
            Classic
          </Button>
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
)(GeneralTab as any)
