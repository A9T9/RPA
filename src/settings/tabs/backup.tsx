// Settings > Backup — extracted from the old settings modal in header.js
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import { Button, Checkbox, Input, message } from 'antd'

import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { restoreBackup } from '@/services/backup/restore'
import { getStorageManager, StorageManagerEvent, requestCrossPageForceReload } from '@/services/storage'
import { State } from '@/reducers/state'

interface BackupTabProps {
  config: { [key: string]: any }
  updateConfig: (config: { [key: string]: any }) => void
  runBackup: () => Promise<{ macro: number, csv: number, screenshot: number, vision: number }>
  setMacroFolderStructure: (entryNodes: any[]) => void
  addLog: (type: string, text: string) => void
}

interface BackupTabState {
  backingUp: boolean
  macrosLoaded: boolean
}

class BackupTab extends React.Component<BackupTabProps, BackupTabState> {
  zipFileInput: HTMLInputElement | null = null

  state: BackupTabState = {
    backingUp: false,
    macrosLoaded: false
  }

  // runBackup() takes the macros to archive from the redux macro tree, which
  // the panel/IDE fill on startup — this page does not load resources at all,
  // so without this the ZIP would silently contain everything EXCEPT macros.
  componentDidMount () {
    getStorageManager().getMacroStorage().listR()
      .then((entryNodes: any[]) => {
        this.props.setMacroFolderStructure(entryNodes)
        this.setState({ macrosLoaded: true })
      })
      .catch((e: Error) => {
        console.error('could not load the macro list for backup', e)
        message.error('Could not read the macro list: ' + (e && e.message ? e.message : String(e)), 6)
      })
  }

  onConfigChange = (key: string, val: any) => {
    this.props.updateConfig({ [key]: val })
  }

  // The ZIP is built in this page and handed to the browser's download flow;
  // without an explicit result message a successful backup looked like a
  // no-op (the download lands silently in the downloads bar).
  onRunBackup = () => {
    this.setState({ backingUp: true })

    Promise.resolve(this.props.runBackup())
      .then((count: any) => {
        const parts = count
          ? [`${count.macro} macros`, `${count.csv} csvs`, `${count.screenshot} screenshots`, `${count.vision} vision images`]
          : []
        message.success(
          parts.length
            ? `Backup created: uivision_backup.zip (${parts.join(', ')}) — check your downloads`
            : 'Backup created: uivision_backup.zip — check your downloads',
          6
        )
      })
      .catch((e: Error) => {
        message.error('Backup failed: ' + (e && e.message ? e.message : String(e)), 6)
        console.error(e)
      })
      .then(() => {
        this.setState({ backingUp: false })
      })
  }

  render () {
    const { config } = this.props
    const onConfigChange = this.onConfigChange

    return (
      <div className="backup-pane">
        <h4>Automatic Backup</h4>
        <p>
          The automatic backup reminder helps to you to regularly export
          macros and other data as ZIP archive. As browser extension
          Ui.Vision must store its data <em>inside the browser extension</em>.
          This means that when you uninstall the extension, the data is
          removed, too. Therefore it is good to have backups! Note that if the
          hard drive storage mode of the File Access XModule is active, then
          the backup archive contains these files.
        </p>
        <div className="row">
          <Checkbox
            onChange={(e: any) =>
              onConfigChange('enableAutoBackup', e.target.checked)
            }
            checked={config.enableAutoBackup}
          >
            Show backup reminder every
          </Checkbox>
          <Input
            type="number"
            min={1}
            disabled={!config.enableAutoBackup}
            value={config.autoBackupInterval}
            onChange={(e) => onConfigChange('autoBackupInterval', e.target.value)}
            style={{ width: '60px', margin: '0 8px' }}
          />
          <span>days</span>
        </div>
        <div className="row">
          <p>Backup includes <span style={{ fontWeight: 'bold' }}>macros, images, and CSV files</span>.</p>
        </div>
        <div className="row">
          <Button
            type="primary"
            loading={this.state.backingUp}
            disabled={!this.state.macrosLoaded}
            onClick={this.onRunBackup}
          >
            Run Backup Now
          </Button>
          <span> Create a backup ZIP file now.</span>
        </div>
        <div style={{ paddingTop: '30px' }} className="row">
          <Button
            type="primary"
            onClick={() => {
              const $input = document.getElementById('select_zip_file')
              if ($input) {
                $input.click()
              }
            }}
          >
            Restore Data from Backup
          </Button>
          <span>
            {' '}
            Select a backup ZIP file to import it (
            <a href="https://go.ui.vision/?help=bkup_import" target="_blank">
              more info
            </a>
            ).{' '}
          </span>

          <input
            type="file"
            accept=".zip"
            id="select_zip_file"
            ref={(ref) => {
              this.zipFileInput = ref
            }}
            style={{ display: 'none' }}
            onChange={(e) => {
              setTimeout(() => {
                if (this.zipFileInput) this.zipFileInput.value = null as any
              }, 500)

              const file = e.target.files && e.target.files[0]
              if (!file) return

              restoreBackup({
                file,
                storage: getStorageManager().getCurrentStrategyType()
              }).then(
                (result: any) => {
                  // local emit reaches only this page — the nonce tells the
                  // side panel / IDE window to reload their file trees too
                  getStorageManager().emit(StorageManagerEvent.ForceReload)
                  requestCrossPageForceReload()
                  message.success('Backup restored')

                  this.props.addLog(
                    'info',
                    [
                      'Backup restored:',
                      `${result.count.macro} macros`,
                      `${result.count.csv} csvs`,
                      `${result.count.screenshot} screenshots`,
                      `${result.count.vision} vision images`
                    ].join('\n')
                  )
                },
                (e: Error) => {
                  message.error('Failed to restore: ' + e.message)
                  console.error(e)
                }
              )
            }}
          />
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
)(BackupTab as any)
