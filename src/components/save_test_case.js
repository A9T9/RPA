import React from 'react'
import ReactDOM from 'react-dom'
import { Modal, message, Input } from 'antd'
import { saveEditingAsExisted, saveEditingAsNew } from '../actions/index'
import { hasUnsavedMacro } from '../recomputed'

class SaveAsModal extends React.Component {
  state = {
    name: null
  }

  componentDidMount () {
    if (this.props.name) {
      this.setState({ name: this.props.name })
    }

    setTimeout(() => {
      const input = this.inputSaveTestCase.refs.input
      input.focus()
      input.selectionStart = input.selectionEnd = input.value.length;
    }, 100)
  }

  render () {
    return (
      <Modal
        title="Save macro as.."
        okText="Save"
        cancelText="Cancel"
        visible={true}
        onOk={() => this.props.onOk(this.state.name)}
        onCancel={this.props.onCancel}
        className="save-modal"
      >
        <Input
          style={{ width: '100%' }}
          onKeyDown={e => { if (e.keyCode === 13) this.props.onOk(this.state.name) }}
          onChange={e => this.setState({ name: e.target.value })}
          value={this.state.name || ''}
          placeholder="macro name"
          ref={el => { this.inputSaveTestCase = el }}
        />
      </Modal>
    )
  }
}

const getContainer = () => {
  const id = 'save_test_case_container'
  const $el = document.getElementById(id)

  if ($el)  return $el

  const $new = document.createElement('div')
  $new.id = id
  document.body.appendChild($new)
  return $new
}

const getTestCaseName = (state) => {
  const { src } = state.editor.editing.meta
  return src && src.name && src.name.length ? src.name : 'Untitled'
}

const tryToSave = (store, testCaseName) => {
  const $container  = getContainer()
  const state = store.getState()
  const existed = !!state.editor.editing.meta.src

  if (existed) {
    return store.dispatch(saveEditingAsExisted())
  }

  return new Promise((resolve, reject) => {
    const onSave = (name) => {
      return store.dispatch(saveEditingAsNew(name))
      .then(
        () => message.success('successfully saved!', 1.5),
        e  => message.error(e.message, 1.5)
      )
      .then(resolve, reject)
    }

    ReactDOM.render(
      <SaveAsModal
        name={testCaseName}
        onOk={onSave}
        onCancel={resolve}
      />,
      $container
    )
    // TODO
  })
  .then(() => {
    ReactDOM.unmountComponentAtNode($container)
  })
  .catch(e => {
    console.error(e.message)
  })
}

const factory = (store) => {
  return {
    saveOrNot: () => {
      const state = store.getState()
      const hasUnsaved = hasUnsavedMacro(state)

      if (!hasUnsaved)  return Promise.resolve()

      return new Promise((resolve, reject) => {
        Modal.confirm({
          title: `Unsaved changes in macro "${getTestCaseName(state)}"`,
          content: 'Do you want to discard or save these changes?',
          okText: 'Save',
          cancelText: 'Discard',
          onOk: () => {
            tryToSave(store).then(resolve)
            return Promise.resolve(true)
          },
          onCancel: () => {
            resolve()
            return Promise.resolve(true)
          }
        })
      })
    },
    save: (defaultName) => {
      const state = store.getState()
      const hasUnsaved = hasUnsavedMacro(state)

      if (!hasUnsaved)  return
      return tryToSave(store, defaultName)
    }
  }
}

let api

export default function getSaveTestCase (store) {
  if (api) return api
  if (!store) throw new Error('must provide store')

  api = factory(store)
  return api
}
