import { t } from '@/common/ui_locale'
import { Input, Modal, Segmented, Switch, message } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import * as C from '@/common/constant'
import getSaveTestCase from '@/components/save_test_case'
import { hasUnsavedMacro, isScriptMacroView } from '@/recomputed'

// Title row of the Macro tab: name of the loaded macro, an "unsaved" dot,
// and rename-on-click. The status bar can't serve this purpose — it swaps
// the name out for run progress / result logs.
class MacroHeader extends React.Component {
  state = {
    showRename: false,
    rename: ''
  }

  inputRef = React.createRef()

  getSrc () {
    return this.props.editing.meta.src || null
  }

  getName () {
    const src = this.getSrc()
    return src && src.name && src.name.length ? src.name : 'Untitled'
  }

  canRename () {
    return this.props.status === C.APP_STATUS.NORMAL
  }

  onClickName = () => {
    if (!this.canRename()) return

    const src = this.getSrc()

    // never saved — there is no file to rename yet, so run the "Save macro
    // as.." flow instead, which also names it. saveAs, not save: Untitled
    // content never counts as "unsaved" (hasUnsavedMacro needs a src), so
    // the gated save() would silently do nothing here.
    if (!src || !src.id) {
      getSaveTestCase().saveAs(this.getName())
      return
    }

    this.setState({ showRename: true, rename: this.getName() })

    setTimeout(() => {
      if (this.inputRef.current) {
        this.inputRef.current.focus({ cursor: 'end' })
      }
    }, 100)
  }

  onConfirmRename = () => {
    const src = this.getSrc()
    const newName = (this.state.rename || '').trim()

    if (!newName) return
    if (!src || !src.id) return this.onCancelRename()

    if (newName === this.getName()) {
      return this.onCancelRename()
    }

    this.props.renameTestCase(newName, src.id)
      .then(() => {
        message.success('successfully renamed!', 1.5)
        this.onCancelRename()
      })
      .catch((e) => {
        message.error(e.message, 1.5)
      })
  }

  onCancelRename = () => {
    this.setState({ showRename: false, rename: '' })
  }

  onChangeView = (value) => {
    // a parse error pins the view to source until fixed — otherwise the
    // broken edits would be dropped silently (same rule as the IDE)
    if (value !== 'source_view' && this.props.sourceErrMsg) {
      message.error('Please fix the error in the source first', 1.5)
      return
    }
    // the JSON source view does not carry the Script field — editing a
    // script macro there would silently drop the program on save
    if (value === 'source_view' && typeof this.props.editing.script === 'string') {
      message.info('JS script macros are edited in the JS view', 2)
      return
    }
    this.props.setEditorActiveTab(value)
  }

  onToggleDevMode = (checked) => {
    this.props.updateConfig({ sidebarDevMode: checked })

    // leaving dev mode also leaves the source view — otherwise re-enabling
    // it later would surprisingly reopen the JSON editor
    if (!checked && !this.props.sourceErrMsg) {
      this.props.setEditorActiveTab('table_view')
    }
  }

  render () {
    const name = this.getName()
    const devMode = !!this.props.config.sidebarDevMode
    // A macro is a script or it is not, and the switch follows THE SELECTED
    // MACRO rather than a global setting: a script macro has only one view, so
    // there is nothing to switch and the control is hidden; a classic macro
    // gets Table/Source. That is what retired the "Show classic macros"
    // checkbox — the answer was always derivable from the macro in hand.
    const isScript = !!this.props.isScriptView
    const activeView = this.props.sourceErrMsg
      ? 'source_view'
      : (['source_view', 'script_view'].includes(this.props.activeTab)
          ? this.props.activeTab
          : 'table_view')

    return (
      <div className="macro-header">
        <span
          className="macro-header-name"
          title={this.canRename() ? `${name} — click to rename` : name}
          onClick={this.onClickName}
        >
          {name}
          {this.props.hasUnsaved ? (
            <span className="unsaved-dot" title={t("Unsaved changes")} />
          ) : null}
          {this.canRename() ? <EditOutlined className="rename-icon" /> : null}
        </span>
        {devMode && !isScript ? (
          <Segmented
            className="macro-view-switch"
            size="small"
            value={activeView}
            onChange={this.onChangeView}
            options={[
              { label: t('Table'), value: 'table_view' },
              { label: t('Source'), value: 'source_view' }
            ]}
          />
        ) : null}
        <Switch
          className="dev-mode-switch"
          size="small"
          checked={devMode}
          onChange={this.onToggleDevMode}
          checkedChildren="Dev"
          unCheckedChildren="Dev"
          title={t("Developer mode: command editor, source view, logs & variables")}
        />
        <Modal
          title={t("Rename the macro as..")}
          okText={t("Save")}
          cancelText={t("Cancel")}
          open={this.state.showRename}
          onOk={this.onConfirmRename}
          onCancel={this.onCancelRename}
          className="rename-modal"
        >
          <Input
            style={{ width: '100%' }}
            value={this.state.rename}
            onKeyDown={(e) => { e.keyCode === 13 && this.onConfirmRename() }}
            onChange={(e) => this.setState({ rename: e.target.value })}
            placeholder={t("macro name")}
            ref={this.inputRef}
          />
        </Modal>
      </div>
    )
  }
}

export default connect(
  (state) => ({
    status: state.status,
    editing: state.editor.editing,
    hasUnsaved: hasUnsavedMacro(state),
    activeTab: state.editor.activeTab,
    sourceErrMsg: state.editor.editingSource.error,
    isScriptView: isScriptMacroView(state),
    config: state.config
  }),
  (dispatch) => bindActionCreators({ ...actions, ...simpleActions }, dispatch)
)(MacroHeader)
