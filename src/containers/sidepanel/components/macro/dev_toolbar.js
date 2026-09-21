import { Button, message, Modal } from 'antd'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleDot } from '@fortawesome/free-regular-svg-icons/faCircleDot'

import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import * as C from '@/common/constant'
import { isCVTypeForDesktop } from '@/common/cv_utils'
import Ext from '@/common/web_extension'
import { getPlayTab } from '@/ext/common/tab'
import { goUivUrl } from '@/common/uiv_link'
import { ensureAllUrlsPermission } from '@/common/firefox_permission'
import getSaveTestCase from '@/components/save_test_case'
import { isScriptMacroView } from '@/recomputed'
import { getLicenseService } from '@/services/license'
import { Feature } from '@/services/license/types'

// sidebar recordings are stored in this scratch macro, never in the macro the
// user happens to have open
const RECORD_SCRATCH_MACRO = '#current'

// Rec + "+ Macro", docked at the bottom of the Macro tab (dev mode
// only). Living inside the tab â€” instead of in the shared bottom control
// bar â€” keeps the status bar and play controls at a constant height when
// tabs change or dev mode toggles. Logic moved from controlbar/index.js.
class DevToolbar extends React.Component {
  state = {
  }

  getCurrentRecordedtab = async () => {
    return new Promise((resolve) => {
      Ext.tabs.query({ active: true }).then((tabs) => {
        if (tabs.length != 0) {
          getPlayTab().then((tab) => {
            resolve(tab)
          })
        } else {
          resolve(false)
        }
      })
    })
  }

  // firefox requires explicit permission to access all urls — shared ask,
  // same one the Play button and the AI run path use (firefox_permission.js)
  askPermission = () => {
    return ensureAllUrlsPermission()
  }

  // Starting a macro from scratch is a dev-mode move — everyone else describes
  // it in AI Chat — so this button lives here next to Rec rather than in the
  // Files tab. macroCreateFile asks for the name, writes the JS starter script
  // and switches the editor to the new macro; saveOrNot first so the open one
  // isn't lost on the way.
  addTestCase = () => {
    return getSaveTestCase().saveOrNot().then(() => {
      this.props.macroCreateFile({ dir: '/' })
    })
  }

  isEditingScratchMacro = () => {
    const { src } = this.props.editing.meta
    return !!(src && src.name === RECORD_SCRATCH_MACRO)
  }

  onToggleRecord = async () => {
    if (isCVTypeForDesktop(this.props.config.cvScope)) {
      const msg =
        'Recording is only available for browser automation. Desktop automation macros are created by adding XClick and other visual commands step by step.'

      this.props.addLog('warning', msg)
      return message.warn(msg, 2.5)
    }

    const tabInfo = await this.getCurrentRecordedtab()
    if (!tabInfo || !/^(https?:|file:)/.test(tabInfo.url)) {
      return message.error(
        'Web recording works only on normal browser pages. For other pages, please use desktop automation.'
      )
    }

    if (this.props.status === C.APP_STATUS.RECORDER) {
      this.props.stopRecording()
      // Note: remove targetOptions from all commands (table recordings only —
      // a JS recording writes script lines, there are no commands to touch)
      if (!this.props.isScriptView) {
        this.props.normalizeCommands()
      }
    } else {
      const permissionResult = await this.askPermission()
      if (!permissionResult) {
        return
      }

      // JS editor: record straight into the open script — each recorded
      // action is appended as a uiv.* line (see RECORD_ADD_COMMAND), so the
      // table-mode scratch macro indirection does not apply
      if (this.props.isScriptView) {
        this.props.startRecording()
        return
      }

      // Record into the scratch macro "#current" instead of the open macro.
      // If "#current" is already open, keep recording into it (multi-take);
      // otherwise ask about unsaved changes (same dialog as the Files tree)
      // and open a fresh "#current".
      if (!this.isEditingScratchMacro()) {
        try {
          await getSaveTestCase().saveOrNot()
          await this.props.upsertTestCase({ name: RECORD_SCRATCH_MACRO, data: { commands: [] } })
          await this.props.editTestCase(RECORD_SCRATCH_MACRO)
        } catch (e) {
          this.props.addLog('error', `Cannot prepare the "${RECORD_SCRATCH_MACRO}" macro for recording: ${e.message}`)
          return
        }
      }

      this.props.startRecording()
    }
  }


  render () {
    const isRecording = this.props.status === C.APP_STATUS.RECORDER

    return (
      <div className="macro-dev-toolbar">
        <Button
          className={isRecording ? 'record-button recording' : 'record-button'}
          danger={isRecording}
          disabled={this.props.player.status !== C.PLAYER_STATUS.STOPPED}
          title={
            isRecording
              ? 'Stop recording'
              : this.props.isScriptView
                ? 'Record — browser actions are appended to the script as uiv.* lines'
                : 'Record'
          }
          onClick={this.onToggleRecord}
        >
          <FontAwesomeIcon icon={faCircleDot} />
          <span> {isRecording ? 'Stop' : 'Rec'}</span>
        </Button>
        <Button
          className="new-macro-button"
          // switching macros mid-run would pull the macro out from under the
          // player/recorder, so this waits like Rec does
          disabled={
            isRecording ||
            this.props.player.status !== C.PLAYER_STATUS.STOPPED ||
            !getLicenseService().canPerform(Feature.Edit)
          }
          title="Create a new macro"
          onClick={this.addTestCase}
        >
          <span>+ Macro</span>
        </Button>
      </div>
    )
  }
}

export default connect(
  state => ({
    editing: state.editor.editing,
    player: state.player,
    status: state.status,
    config: state.config,
    isScriptView: isScriptMacroView(state)
  }),
  dispatch => bindActionCreators({ ...actions, ...simpleActions }, dispatch)
)(DevToolbar)

