import { Button, Input, Modal, Select, message } from 'antd'
import { CopyOutlined, DownOutlined, PlusOutlined, UpOutlined } from '@ant-design/icons'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as actions from '@/actions'
import * as C from '@/common/constant'
import {
  availableCommands,
  selectableCommands,
  selectableCommandsForDesktop,
  canCommandFind,
  canCommandSelect,
  commandText,
  doesCommandSupportTargetOptions
} from '@/common/command'
import { isCVTypeForDesktop } from '@/common/cv_utils'
import csIpc from '@/common/ipc/ipc_cs'
import { Player } from '@/common/player'

import { SelectInput } from '@/components/select_input'
import getSaveTestCase from '@/components/save_test_case'
import { selectAreaOnDesktop } from '@/ext/common/desktop_vision'
import { editorSelectedCommand, editorSelectedCommandIndex, hasUnsavedMacro } from '@/recomputed'
import { getLicenseService } from '@/services/license'
import { Feature } from '@/services/license/types'
import { getStorageManager } from '@/services/storage'

const newCommand = {
  cmd: '',
  target: '',
  value: ''
}

// commands whose target can be a vision image (kept in sync with the hover
// preview lists in macro_table.js)
const VISION_IMAGE_COMMANDS = [
  'visionFind', 'visualSearch', 'visualAssert', 'visualVerify',
  'XClick', 'XClickText', 'XClickTextRelative', 'XClickRelative', 'XMove', 'XMoveText', 'XMoveTextRelative', 'XMoveRelative',
  'OCRExtract', 'OCRExtractRelative',
  'visionLimitSearchArea', 'visionLimitSearchAreaRelative', 'visionLimitSearchAreabyTextRelative'
]

// Docked command editor for the side panel Macro tab (master-detail).
// Collapsed by default; expands on row selection or "+ Add"; auto-collapses
// when playing or recording starts and when another macro is loaded.
class EditForm extends React.Component {
  state = {
    expanded: false,
    userInputCmdValue: '',
    targetPreviewUrl: null
  }

  cmdInputRef = React.createRef()
  _lastPreviewTarget = null

  componentDidMount () {
    // fired by the command table's "Edit (in sidebar)" context menu item —
    // covers the cases the selection-change auto-expand misses (row already
    // selected, or the form only just mounted after dev mode was turned on)
    window.addEventListener('sidepanelExpandEditForm', this.onExpandRequest)
  }

  componentWillUnmount () {
    window.removeEventListener('sidepanelExpandEditForm', this.onExpandRequest)
  }

  onExpandRequest = () => {
    if (!this.state.expanded) this.setExpanded(true)
  }

  componentDidUpdate (prevProps, prevState) {
    const macroChanged =
      this.getMacroId(prevProps) !== this.getMacroId(this.props)

    const playStarted =
      prevProps.player.status === C.PLAYER_STATUS.STOPPED &&
      this.props.player.status !== C.PLAYER_STATUS.STOPPED

    const recordStarted =
      prevProps.status !== C.APP_STATUS.RECORDER &&
      this.props.status === C.APP_STATUS.RECORDER

    if (macroChanged || playStarted || recordStarted) {
      if (this.state.expanded) this.setExpanded(false)
      return
    }

    const indexChanged = prevProps.selectedCommandIndex !== this.props.selectedCommandIndex
    const hasSelection =
      typeof this.props.selectedCommandIndex === 'number' &&
      this.props.selectedCommandIndex >= 0

    if (indexChanged && hasSelection && this.isPlayerStopped() && this.props.status !== C.APP_STATUS.RECORDER) {
      if (!this.state.expanded) this.setExpanded(true)
    }

    // clicking the selected row again deselects it (see SELECT_COMMAND reducer)
    // => treat that as "close the editor"
    if (indexChanged && !hasSelection && this.state.expanded) {
      this.setExpanded(false)
    }

    if (prevState.expanded !== this.state.expanded) {
      // let the macro table re-measure its available height
      window.dispatchEvent(new Event('resize'))
    }

    this.updateTargetPreview()
  }

  // load a thumbnail when the selected command's target is a vision image
  updateTargetPreview = () => {
    const cmd = this.props.selectedCommand
    const target = ((cmd && cmd.target) || '').trim()
    const isImage = cmd && VISION_IMAGE_COMMANDS.indexOf(cmd.cmd) !== -1 && /\.png/i.test(target)
    const file = isImage ? target.split('@')[0] : null

    if (file === this._lastPreviewTarget) return
    this._lastPreviewTarget = file

    if (!file) {
      if (this.state.targetPreviewUrl) this.setState({ targetPreviewUrl: null })
      return
    }

    const visionStorage = getStorageManager().getVisionStorage()
    visionStorage.exists(file)
      .then((existed) => (existed ? visionStorage.getLink(file) : './img/not_found.png'))
      .then((url) => {
        // ignore stale async results after the target changed again
        if (this._lastPreviewTarget === file) {
          this.setState({ targetPreviewUrl: url })
        }
      })
      .catch(() => {
        if (this._lastPreviewTarget === file) {
          this.setState({ targetPreviewUrl: null })
        }
      })
  }

  getMacroId (props) {
    const src = props.editing.meta.src
    return (src && (src.id || src.name)) || null
  }

  isPlayerStopped () {
    return this.props.player.status === C.PLAYER_STATUS.STOPPED
  }

  setExpanded = (expanded) => {
    this.setState({ expanded })
  }

  toggle = () => {
    this.setExpanded(!this.state.expanded)
  }

  onKeyDown = (e) => {
    if (e.key === 'Escape') {
      this.setExpanded(false)
    }
  }

  onAddCommand = (e) => {
    e.stopPropagation()

    if (!getLicenseService().canPerform(Feature.Edit)) {
      return
    }

    const selectedIndex = this.props.selectedCommandIndex

    if (typeof selectedIndex === 'number' && selectedIndex >= 0) {
      // insert right below the selected (highlighted) line;
      // the INSERT_COMMAND reducer also moves the selection onto the new line
      this.props.insertCommand(newCommand, selectedIndex + 1)
    } else {
      // no selection — append at the end
      const index = this.props.editing.commands.length
      this.props.appendCommand(newCommand)
      this.props.selectCommand(index, true)
    }

    this.setExpanded(true)
  }

  onDuplicateCommand = (e) => {
    e.stopPropagation()

    if (!getLicenseService().canPerform(Feature.Edit)) {
      return
    }

    const selectedIndex = this.props.selectedCommandIndex

    if (typeof selectedIndex === 'number' && selectedIndex >= 0) {
      // inserts a copy right below the selected line
      this.props.duplicateCommand(selectedIndex)
    }
  }

  onClickSave = (e) => {
    e.stopPropagation()
    // handles both cases: existing macro saves in place, a new/Untitled macro
    // opens the "Save macro as.." dialog
    getSaveTestCase().save(this.getTestCaseName())
  }

  onClickCancelEdits = (e) => {
    e.stopPropagation()

    // easy to hit by accident, and it discards everything — always confirm
    Modal.confirm({
      title: 'Discard unsaved changes?',
      content: `This undoes all unsaved changes in macro "${this.getTestCaseName()}".`,
      okText: 'Discard',
      okButtonProps: { danger: true },
      cancelText: 'Keep editing',
      onOk: () => {
        const { src } = this.props.editing.meta

        if (src && (src.id || src.name)) {
          // re-load the saved version — discards all unsaved edits
          this.props.editTestCase(src.id || src.name)
        } else {
          // never saved: back to an empty Untitled macro
          this.props.editNewTestCase()
        }
      },
      onCancel: () => {}
    })
  }

  onDetailChange = (key, value) => {
    this.props.updateSelectedCommand({ [key]: value })
  }

  getTestCaseName = () => {
    const { src } = this.props.editing.meta
    return src && src.name && src.name.length ? src.name : 'Untitled'
  }

  playLine = (commandIndex, extraOptions = {}) => {
    const { commands } = this.props.editing
    const { src } = this.props.editing.meta

    return this.props.playerPlay({
      macroId: src && src.id,
      title: this.getTestCaseName(),
      extra: {
        id: src && src.id
      },
      mode: Player.C.MODE.SINGLE,
      startIndex: commandIndex,
      startUrl: null,
      resources: commands,
      postDelay: this.props.config.playCommandInterval * 1000,
      ...extraOptions
    })
  }

  onClickFind = () => {
    const { selectedCommand } = this.props

    const p = new Promise((resolve, reject) => {
      switch (selectedCommand.cmd) {
        case 'visualGetPixelColor':
        case 'visionFind':
        case 'visualSearch':
        case 'visualAssert':
        case 'visualVerify':
        case 'visionLimitSearchArea':
        case 'visionLimitSearchAreaRelative':
        case 'visionLimitSearchAreabyTextRelative':
        case 'XClick':
        case 'XClickText':
        case 'XClickTextRelative':
        case 'XClickRelative':
        case 'XMoveText':
        case 'XMoveTextRelative':
        case 'XMove':
        case 'XMoveRelative':
        case 'OCRExtract':
        case 'OCRExtractRelative':
        case 'OCRExtractbyTextRelative':
        case 'OCRSearch':
        case 'aiPrompt':
        case 'aiScreenXY':
        case 'aiComputerUse': {
          const selectedIndex = this.props.editing.meta.selectedIndex
          const run = () => {
            // Note: run visionFind/visualSearch as single line command, but without timeout waiting
            this.playLine(selectedIndex, {
              overrideScope: { '!TIMEOUT_WAIT': 0 },
              commandExtra: {
                throwError: true,
                // visualXXX uses this flag in desktop mode to open Desktop Screenshot Editor to preview result
                debugVisual: true
              }
            })
            return resolve(true)
          }

          return run()
        }

        default: {
          return csIpc.ask('PANEL_HIGHLIGHT_DOM', {
            locator: selectedCommand.target,
            cmd: selectedCommand.cmd
          })
          .then(resolve, reject)
        }
      }
    })

    p.catch(e => {
      message.error(e.message, 1.5)
    })
  }

  onToggleSelect = () => {
    const { selectedCommand, config } = this.props
    const p = new Promise((resolve, reject) => {
      const defaultAction = () => {
        if (this.props.status === C.APP_STATUS.INSPECTOR) {
          this.props.stopInspecting()
        } else {
          this.props.startInspecting()
        }

        resolve(true)
      }
      const takeImage = () => {
        const isDesktop = isCVTypeForDesktop(config.cvScope)

        return Promise.resolve().then(() => {
          if (isDesktop) {
            return selectAreaOnDesktop({
              width: screen.availWidth,
              height: screen.availHeight
            })
          } else {
            return csIpc.ask('PANEL_SELECT_AREA_ON_CURRENT_PAGE')
          }
        })
        .then(res => this.props.renameVisionImage(res.fileName))
        .then(resolve, reject)
      }

      switch (selectedCommand.cmd) {
        case 'visionFind':
        case 'visualSearch':
        case 'visualAssert':
        case 'visualVerify':
        case 'OCRExtract':
        case 'OCRExtractRelative':
        case 'visionLimitSearchAreaRelative':
        case 'visionLimitSearchAreabyTextRelative':
        case 'XClickRelative':
        case 'XMoveRelative':
        case 'XMoveText':
        case 'XMoveTextRelative':
        case 'OCRExtractbyTextRelative':
        case 'XMove': {
          const disableTakeImageCommands = [
            'OCRExtractbyTextRelative',
            'visionLimitSearchAreabyTextRelative',
            'XMoveText',
            'XMoveTextRelative'
          ]

          if (disableTakeImageCommands.indexOf(selectedCommand.cmd) !== -1) {
            throw new Error('No select possible for Command ' + selectedCommand.cmd + ', just enter the text')
          } else {
            return takeImage()
          }
        }

        case 'OCRSearch':
          throw new Error('No select possible in OCR mode, just enter the text')

        case 'aiPrompt':
          throw new Error('No select possible in aiPrompt mode')

        case 'aiScreenXY':
          throw new Error('No select possible in aiScreenXY mode')

        case 'aiComputerUse':
          throw new Error('No select possible in aiComputerUse mode')

        case 'XClickText':
        case 'XClickTextRelative':
        case 'XClick': {
          const disableTakeImageCommands = [
            'XClickText',
            'XClickTextRelative'
          ]

          if (disableTakeImageCommands.indexOf(selectedCommand.cmd) !== -1) {
            throw new Error('No select possible for Command ' + selectedCommand.cmd + ', just enter the text')
          } else {
            return takeImage()
          }
        }

        case 'visionLimitSearchArea': {
          if (isCVTypeForDesktop(config.cvScope)) {
            return takeImage()
          } else {
            return defaultAction()
          }
        }

        case 'setWindowSize': {
          return Modal.confirm({
            title: 'Confirm',
            content: 'Do you want to use the current browser dimensions?',
            okText: 'Yes',
            cancelText: 'No',
            onOk: () => {
              return csIpc.ask('PANEL_GET_WINDOW_SIZE_OF_PLAY_TAB').then((size) => {
                this.props.updateSelectedCommand({
                  target: `${size.viewport.width}x${size.viewport.height}`
                })
              })
            },
            onCancel: () => {
              return Promise.resolve(true)
            }
          })
        }

        default: {
          return defaultAction()
        }
      }
    })

    p.catch(e => {
      console.error(e)
      message.error(e.message)
    })
  }

  renderBody () {
    const { status, config, selectedCommand, selectedCommandIndex } = this.props

    const selectedCmd = selectedCommand
    const editable = this.isPlayerStopped() && !!selectedCmd
    const isCmdEditable = editable && getLicenseService().canPerform(Feature.Edit)
    const isInspecting = status === C.APP_STATUS.INSPECTOR

    const isSelectEnabled = selectedCmd && selectedCmd.cmd && canCommandSelect(selectedCmd.cmd)
    const isFindEnabled = selectedCmd && selectedCmd.cmd && canCommandFind(selectedCmd.cmd)

    const shouldUseSelectInputForTarget = selectedCmd && selectedCmd.targetOptions && selectedCmd.targetOptions.length && doesCommandSupportTargetOptions(selectedCmd.cmd)
    const shouldUseTextareaForTarget = selectedCmd && ['executeScript', 'executeScript_Sandbox', 'aiPrompt', 'aiScreenXY', 'aiComputerUse'].indexOf(selectedCmd.cmd) !== -1
    const shouldUseNormalInputForTarget = !shouldUseSelectInputForTarget && !shouldUseTextareaForTarget

    if (selectedCommandIndex === -1 || selectedCommandIndex === null || !selectedCmd) {
      return (
        <div className="edit-form-body empty">
          Select a command in the table above, or click "+ Add".
        </div>
      )
    }

    return (
      <div className="edit-form-body">
        {/* IDE-style rows: label in front, box behind */}
        <div className="field-row">
        <label>Command</label>
        <div className="cmd-row" ref={this.cmdInputRef}>
          <Select
            showSearch
            optionFilterProp="children"
            placeholder="command"
            disabled={!isCmdEditable}
            value={selectedCmd && selectedCmd.cmd}
            onChange={(value) => this.onDetailChange('cmd', value)}
            onKeyDown={(e) => {
              const input = this.cmdInputRef.current && this.cmdInputRef.current.querySelector('input')
              if (input && /^[a-zA-Z0-9]$/.test(e.key)) {
                this.setState({ userInputCmdValue: input.value + e.key })
              }
            }}
            onBlur={() => {
              const value = this.state.userInputCmdValue
              if (value && value.length > 0) {
                const command = availableCommands.find(cmd => cmd.toLowerCase() === value.trim().toLowerCase())
                if (command) {
                  this.onDetailChange('cmd', command)
                }
              }
              this.setState({ userInputCmdValue: '' })
            }}
            filterOption={(input, { key }) => key.toLowerCase().indexOf(input.toLowerCase()) !== -1}
            style={{
              flex: 1,
              minWidth: 0,
              // capped so the //-button and Info link get breathing room at
              // the right instead of being pushed flush against the edge
              maxWidth: '66%'
            }}
            size="small"
          >
            {(isCVTypeForDesktop(config.cvScope) ? selectableCommandsForDesktop : selectableCommands).map(cmd => (
              <Select.Option value={cmd} key={cmd}>
                {commandText(cmd)}
              </Select.Option>
            ))}
          </Select>
          <Button
            size="small"
            title="Toggle comment"
            disabled={!isCmdEditable}
            onClick={() => {
              this.props.toggleCommentOnSelectedCommand()
            }}
          >
            //
          </Button>
          {selectedCmd && selectedCmd.cmd ? (
            <a
              className="cmd-info-link"
              title="Documentation for this command"
              href={`https://go.ui.vision/?cmd=${selectedCmd.cmd.toLowerCase()}`}
              target="_blank"
            >
              Info
            </a>
          ) : null}
        </div>
        </div>

        <div className="field-row target-field-row">
        <label>Target</label>
        <div className="field-input">
        {shouldUseNormalInputForTarget ? (
          <Input
            placeholder="target"
            disabled={!isCmdEditable}
            value={selectedCmd && selectedCmd.target}
            onChange={(e) => this.onDetailChange('target', e.target.value)}
            size="small"
          />
        ) : null}

        {shouldUseSelectInputForTarget ? (
          <SelectInput
            disabled={!isCmdEditable}
            getId={(str) => str}
            stringifyOption={(str) => str}
            value={selectedCmd.target}
            options={selectedCmd.targetOptions}
            onChange={(val) => this.onDetailChange('target', val)}
          />
        ) : null}

        {shouldUseTextareaForTarget ? (
          <Input.TextArea
            rows={2}
            placeholder="target"
            disabled={!isCmdEditable}
            value={selectedCmd && selectedCmd.target}
            onChange={(e) => this.onDetailChange('target', e.target.value)}
            size="small"
          />
        ) : null}
        </div>
        </div>

        {/* Select/Find don't fit next to the target box at sidebar width —
            they sit below it, aligned with the box via the label spacer */}
        <div className="field-row">
        <label />
        <div className="target-buttons">
          {/* 👁 marks that Select/Find run a visual (image/text) search
              instead of the DOM inspector — same cue as in the IDE. The
              label says WHAT gets selected: an image crop for vision
              commands, a page element (locator) otherwise. */}
          <Button
            size="small"
            disabled={!isCmdEditable || !isSelectEnabled}
            onClick={this.onToggleSelect}
          >
            {isInspecting
              ? 'Cancel'
              : (selectedCmd && VISION_IMAGE_COMMANDS.indexOf(selectedCmd.cmd) !== -1 ? '👁Select image' : 'Select element')}
          </Button>
          <Button
            size="small"
            disabled={!editable || !isFindEnabled}
            onClick={this.onClickFind}
          >
            {(selectedCmd && VISION_IMAGE_COMMANDS.indexOf(selectedCmd.cmd) !== -1 ? '👁' : '') + 'Find'}
          </Button>
        </div>
        </div>

        {this.state.targetPreviewUrl ? (
          <div className="field-row">
            <label />
            <div className="target-image-preview">
              <img src={this.state.targetPreviewUrl} alt="target image" />
            </div>
          </div>
        ) : null}

        <div className="field-row">
        <label>Value</label>
        <Input
          disabled={!isCmdEditable}
          value={selectedCmd && selectedCmd.value}
          onChange={(e) => this.onDetailChange('value', e.target.value)}
          placeholder="value"
          size="small"
        />
        </div>

        <div className="field-row">
        <label>Description</label>
        <Input
          disabled={!isCmdEditable}
          value={selectedCmd && selectedCmd.description}
          onChange={(e) => this.onDetailChange('description', e.target.value)}
          placeholder="description"
          size="small"
        />
        </div>
      </div>
    )
  }

  render () {
    const { expanded } = this.state
    const { selectedCommandIndex } = this.props

    const title = typeof selectedCommandIndex === 'number' && selectedCommandIndex >= 0
      ? `Edit line ${selectedCommandIndex + 1}`
      : 'Command editor'

    const canEdit = this.isPlayerStopped() && getLicenseService().canPerform(Feature.Edit)
    const hasSelection = typeof selectedCommandIndex === 'number' && selectedCommandIndex >= 0

    return (
      <div className="sidepanel-edit-form" onKeyDown={this.onKeyDown}>
        {this.props.hasUnsaved && canEdit ? (
          <div className="edit-form-unsaved-bar">
            <span className="unsaved-note">Unsaved changes</span>
            <span className="unsaved-actions">
              <Button size="small" type="primary" onClick={this.onClickSave}>
                Save
              </Button>
              <Button size="small" title="Discard the unsaved changes" onClick={this.onClickCancelEdits}>
                Cancel
              </Button>
            </span>
          </div>
        ) : null}
        <div className="edit-form-header" onClick={this.toggle}>
          <span className="edit-form-title">{title}</span>
          <span className="edit-form-actions">
            <Button
              size="small"
              icon={<PlusOutlined />}
              title="Add command"
              disabled={!canEdit}
              onClick={this.onAddCommand}
            >
              Add
            </Button>
            <Button
              size="small"
              icon={<CopyOutlined />}
              title="Duplicate the selected command"
              disabled={!canEdit || !hasSelection}
              onClick={this.onDuplicateCommand}
            >
              Duplicate
            </Button>
            <Button
              size="small"
              type="text"
              title={expanded ? 'Collapse' : 'Expand'}
              icon={expanded ? <DownOutlined /> : <UpOutlined />}
              onClick={(e) => { e.stopPropagation(); this.toggle() }}
            />
          </span>
        </div>
        {expanded ? this.renderBody() : null}
      </div>
    )
  }
}

export default connect(
  state => ({
    status: state.status,
    editing: state.editor.editing,
    player: state.player,
    config: state.config,
    selectedCommand: editorSelectedCommand(state),
    selectedCommandIndex: editorSelectedCommandIndex(state),
    hasUnsaved: hasUnsavedMacro(state)
  }),
  dispatch => bindActionCreators({ ...actions }, dispatch)
)(EditForm)
