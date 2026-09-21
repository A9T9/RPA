import React from 'react'
import ReactDOM from 'react-dom'
import { message, Button } from 'antd'
import { UnControlled as CodeMirror } from 'react-codemirror2'
import 'codemirror/lib/codemirror'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/edit/closebrackets'
// in-editor search (Ctrl-F / Ctrl-G / Alt-G) + selection-match highlight +
// active line — same stock addons as the macro editors
import '@/common/cm_search'
import 'codemirror/addon/search/searchcursor'
import 'codemirror/addon/search/jump-to-line'
import 'codemirror/addon/dialog/dialog'
import 'codemirror/addon/search/match-highlighter'
import 'codemirror/addon/selection/active-line'
import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/dialog/dialog.css'
import '@/styles/cm-extras.css'

// import 'antd/dist/antd.css'
import './csv_editor.scss'

import storage from './common/storage'
import { getStorageManager, StorageStrategyType } from './services/storage'
import { getXFile } from './services/xmodules/xfile'
import { parseQuery } from './common/utils'
import csIpc from './common/ipc/ipc_cs'
import { polyfillTimeoutFunctions } from './services/timeout/cs_timeout'

polyfillTimeoutFunctions(csIpc)

const rootEl      = document.getElementById('root');
const render      = () => ReactDOM.render(<App />, rootEl)

class App extends React.Component {
  state = {
    csvFile: null,
    ready: false,
    sourceText: '',
    sourceTextModified: ''
  }

  onChangeEditSource = (editor, data, text) => {
    this.setState({
      sourceTextModified: text
    })
  }

  saveCSV = () => {
    return getStorageManager()
    .getCSVStorage()
    .overwrite(this.state.csvFile, new Blob([this.state.sourceTextModified]))
    .then(
      () => message.success('Successfully saved'),
      e => {
        message.error('Error: ' + e.message)
        throw e
      }
    )
  }

  onClickSave = () => {
    return this.saveCSV()
  }

  onClickSaveClose = () => {
    return this.saveCSV()
    .then(() => setTimeout(() => window.close(), 300))
  }

  onClickCancel = () => {
    window.close()
  }

  componentDidMount () {
    const queryObj = parseQuery(window.location.search)
    const csvFile  = queryObj.csv

    if (!csvFile) return

    // the same raw-text editor serves both file types of the CSV/TXT tab
    document.title = csvFile + (/\.txt$/i.test(csvFile) ? ' - RPA Text Editor' : ' - RPA CSV Editor')

    getStorageManager()
    .getCSVStorage()
    .read(csvFile, 'Text')
    .then(text => {
      this.setState({
        csvFile,
        ready: true,
        sourceText: text,
        sourceTextModified: text
      })
    })
  }

  render () {
    if (!this.state.ready)  return <div />

    return (
      <div className="csv-editor">
        <CodeMirror
          ref={el => { this.codeMirror = el }}
          value={this.state.sourceText}
          onChange={this.onChangeEditSource}
          options={{
            lineNumbers: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            styleActiveLine: true,
            highlightSelectionMatches: { showToken: /\w/, wordsOnly: true }
          }}
        />

        <div className="csv-actions">
          <Button type="primary" onClick={this.onClickSaveClose}>Save &amp; Close</Button>
          <Button onClick={this.onClickSave}>Save</Button>
          <Button onClick={this.onClickCancel}>Cancel</Button>
        </div>
      </div>
    )
  }
}

function restoreConfig () {
  return storage.get('config')
  .then((config = {}) => {
    return {
      storageMode: StorageStrategyType.Browser,
      ...config
    }
  })
}

function init () {
  return Promise.all([
    restoreConfig(),
    getXFile().getConfig()
  ])
  .then(([config, xFileConfig]) => {
    getStorageManager(config.storageMode)
    render()
  }, render)
}

init()
