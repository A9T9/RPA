import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { UnControlled as CodeMirror } from 'react-codemirror2'
import 'codemirror/lib/codemirror'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/edit/closebrackets'
// in-editor search (Ctrl-F / Ctrl-G / Alt-G) — same addons as script_view,
// plus selection-match highlight and active line (no comment toggle: this
// view is JSON, where // is a syntax error)
import '@/common/cm_search'
import 'codemirror/addon/search/searchcursor'
import 'codemirror/addon/search/jump-to-line'
import 'codemirror/addon/dialog/dialog'
import 'codemirror/addon/search/match-highlighter'
import 'codemirror/addon/selection/active-line'
import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/dialog/dialog.css'
import '@/styles/cm-extras.css'

import * as actions from '@/actions'
import { FocusArea } from '@/reducers/state'
import { getLicenseService } from '@/services/license'
import { Feature } from '@/services/license/types'

// JSON source view of the loaded macro — the side panel twin of the IDE's
// "Source View (JSON)" tab. Shares the editor.editingSource redux state with
// the IDE: edits parse back into commands on blur; parse errors keep the
// user here (see the force in macro/index.js) until fixed.
class SourceView extends React.Component {
  state = {
    height: 0
  }

  onChange = (editor, data, text) => {
    this.props.setSourceCurrent(text)
  }

  onBlur = () => {
    this.props.saveSourceCodeToEditing(this.props.sourceTextModified)
  }

  // The Macro tab pane is content-driven (the command table sets its own
  // pixel height), so flex:1 alone collapses to 0 here — measure the
  // available space the same way the macro table does: holder minus the
  // macro header and the docked run panel.
  measure = () => {
    const $holder = document.querySelector('.ant-tabs-content-holder')
    if (!$holder) return

    const $header = document.querySelector('.macro-header')
    const $runPanel = document.querySelector('.sidepanel-run-panel')
    const $devToolbar = document.querySelector('.macro-dev-toolbar')
    const height = Math.max(
      150,
      $holder.clientHeight -
        ($header ? $header.offsetHeight : 0) -
        ($runPanel ? $runPanel.offsetHeight : 0) -
        ($devToolbar ? $devToolbar.offsetHeight : 0)
    )

    if (height !== this.state.height) this.setState({ height })
  }

  componentDidMount () {
    this.measure()
    // the run panel dispatches a window resize event when it opens/closes
    window.addEventListener('resize', this.measure)
  }

  componentWillUnmount () {
    window.removeEventListener('resize', this.measure)
  }

  render () {
    const { sourceErrMsg } = this.props

    return (
      <div
        className="sidepanel-source-view"
        style={this.state.height ? { height: this.state.height + 'px', flex: 'none' } : null}
      >
        {sourceErrMsg ? <pre className="source-error">{sourceErrMsg}</pre> : null}
        {/* Note: have to use UnControlled CodeMirror, and thus the two
            source states: pure (rendered) and current (modified) */}
        <CodeMirror
          className={sourceErrMsg ? 'has-error' : 'no-error'}
          value={this.props.sourceText}
          onChange={this.onChange}
          onBlur={this.onBlur}
          onFocus={() => {
            this.props.updateUI({ focusArea: FocusArea.CodeSource })
          }}
          options={{
            mode: { name: 'javascript', json: true },
            lineNumbers: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            styleActiveLine: true,
            highlightSelectionMatches: { showToken: /\w/, wordsOnly: true },
            readOnly: !getLicenseService().canPerform(Feature.Edit)
          }}
        />
      </div>
    )
  }
}

export default connect(
  state => ({
    sourceErrMsg: state.editor.editingSource.error,
    sourceText: state.editor.editingSource.pure,
    sourceTextModified: state.editor.editingSource.current
  }),
  dispatch => bindActionCreators({ ...actions }, dispatch)
)(SourceView)
