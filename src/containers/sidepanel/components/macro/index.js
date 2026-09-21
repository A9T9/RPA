import { Button } from 'antd'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as actions from '@/actions'
import { store } from '@/redux'
import { isJsFirstMode, isScriptMacroEditing, isScriptMacroView } from '@/recomputed'
import './macro.scss'
import MacroHeader from './macro_header'
import MacroTable from './macro_table'
import EditForm from './edit_form'
import RunPanel from './run_panel'
import SourceView from './source_view'
import ScriptView from './script_view'
import DevToolbar from './dev_toolbar'

// View routing of the Macro tab.
//
// JS-first mode (config.jsFirstMode, default ON — the usability-test setup):
// script macros and the empty Untitled state show the JS editor; a classic
// table macro still falls back to the command table (its data cannot be
// shown as JS). The Table/Source/JS switch stays reachable via dev mode.
//
// Dev mode (config.sidebarDevMode, toggled in the header) adds the docked
// command editor, the JSON source view, the Logs & Variables run panel and
// the Rec/pop-out toolbar.
class Macro extends React.Component {
  componentDidUpdate (prevProps) {
    if (!!prevProps.devMode !== !!this.props.devMode) {
      // panels (un)mounted — let the macro table re-measure its height
      window.dispatchEvent(new Event('resize'))
    }

    // keep activeTab in sync with the type of the macro that was opened:
    // a script macro lands in the JS view (its command table is empty by
    // design), a table macro leaves the JS view again
    const prevSrc = prevProps.editing && prevProps.editing.meta && prevProps.editing.meta.src
    const src = this.props.editing && this.props.editing.meta && this.props.editing.meta.src
    const macroChanged = (src && src.id) !== (prevSrc && prevSrc.id)

    if (macroChanged && !this.props.sourceErrMsg) {
      if (this.props.isScriptMacro && this.props.activeTab !== 'script_view') {
        this.props.setEditorActiveTab('script_view')
      } else if (!this.props.isScriptMacro && src && this.props.activeTab === 'script_view') {
        this.props.setEditorActiveTab('table_view')
      }
    }
  }

  // nothing loaded yet (and nothing typed into the Untitled macro)
  isEmptyMacro () {
    const { editing } = this.props
    const src = editing && editing.meta ? editing.meta.src : null
    const commands = (editing && editing.commands) || []
    return !src && commands.length === 0
  }

  // classic mode only — JS-first shows the starter script instead, so new
  // users land in runnable code rather than an empty table
  renderEmptyCta () {
    return (
      <div className="macro-empty-cta">
        <p className="cta-title">No macro loaded</p>
        <p className="cta-text">
          Describe what you want in AI Chat — the AI builds the macro, runs it and fixes it until it works.
        </p>
        <Button type="primary" onClick={() => this.props.updateUI({ sidebarTab: 'AiChat' })}>
          Open AI Chat ✨
        </Button>
        <p className="cta-alt">…or pick an existing macro in the Files tab</p>
      </div>
    )
  }

  render () {
    const devMode = !!this.props.devMode
    const jsFirst = !!this.props.jsFirst

    // parse errors pin the user to the source view until fixed (same rule as
    // the IDE) — switching away would silently drop the broken edits; this
    // wins even over dev mode being switched off
    const showSource =
      this.props.sourceErrMsg ||
      (devMode && this.props.activeTab === 'source_view')

    // One selector decides this for the sidebar, the IDE tab list and the IDE
    // routing alike — see isScriptMacroView. Deliberately independent of
    // activeTab, which is sticky across macros and used to leave the JS editor
    // open (showing the previous script, or the starter template) after
    // selecting a command-table macro.
    const showScript = !showSource && this.props.isScriptView

    return (
      <div className="macro-table-container">
        <MacroHeader />
        {showSource ? (
          <SourceView />
        ) : showScript ? (
          <ScriptView />
        ) : (
          <React.Fragment>
            <div className="macro-table-area">
              {this.isEmptyMacro() ? this.renderEmptyCta() : <MacroTable />}
            </div>
            {/* store={store}: the form subscribes to the store DIRECTLY instead of
                through this container's nested react-redux subscription. Nested
                subscriptions are notified only after the parent has committed,
                so on a keystroke the antd <Input> re-rendered from its own state
                with a stale value prop first, React "corrected" the DOM back to
                the old text and the caret jumped to the end (forum 29959,
                OPEN-ISSUES #12). With a direct subscription the form gets the
                new value in the same commit. */}
            {devMode ? <EditForm store={store} /> : null}
          </React.Fragment>
        )}
        {/* Logs & Variables: dev tool for table macros, but always available
            below the JS editor — uiv.log output must be visible to everyone */}
        {devMode || showScript ? <RunPanel /> : null}
        {devMode ? <DevToolbar /> : null}
      </div>
    )
  }
}

export default connect(
  state => ({
    activeTab: state.editor.activeTab,
    sourceErrMsg: state.editor.editingSource.error,
    devMode: state.config.sidebarDevMode,
    editing: state.editor.editing,
    jsFirst: isJsFirstMode(state),
    isScriptMacro: isScriptMacroEditing(state),
    isScriptView: isScriptMacroView(state)
  }),
  dispatch => bindActionCreators({ ...actions }, dispatch)
)(Macro)
