import React from 'react'
import ReactDOM from 'react-dom'
import { Modal, message, Input } from 'antd'
import { saveEditingAsExisted, saveEditingAsNew, updateUI } from '../actions/index'
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
        open={true}
        onOk={() => this.props.onOk(this.state.name)}
        onCancel={this.props.onCancel}
        className="save-modal"
      >
        <Input
          style={{ width: '100%' }}
          onKeyDown={e => { e.keyCode === 13 && this.props.onOk(this.state.name) }}
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
    .then(() => true)
  }

  return new Promise((resolve, reject) => {
    const onSave = (name) => {
      return store.dispatch(saveEditingAsNew(name))
      .then(
        () => {
          message.success('successfully saved!', 1.5)
          resolve(true)
        },
        e  => {
          message.error(e.message, 1.5)
          reject(e)
        }
      )
    }

    ReactDOM.render(
      <SaveAsModal
        name={testCaseName}
        onOk={onSave}
        onCancel={() => resolve(false)}
      />,
      $container
    )
    // TODO
  })
  .then(saved => {
    ReactDOM.unmountComponentAtNode($container)
    return saved
  })
  .catch(e => {
    console.error(e.message)
    throw e
  })
}

const factory = (store) => {
  const withIsSaving = (fn) => {
    store.dispatch(updateUI({ isSaving: true }))

    return new Promise(resolve => {
      resolve(fn())
    })
    .finally(() => {
      store.dispatch(updateUI({ isSaving: false }))
    })
  }

  return {
    saveOrNot: (options = {}) => {
      const state       = store.getState()
      const hasUnsaved  = hasUnsavedMacro(state)
      const isExisting  = !!state.editor.editing.meta.src
      const opts        = {
        getTitle:   (data) => `Unsaved changes in macro "${data.macroName}"`,
        getContent: (data) => 'Do you want to discard or save these changes?',
        okText:     'Save',
        cancelText: 'Discard',
        ...(options || {})
      }

      return withIsSaving(() => {
        if (!hasUnsaved)  return Promise.resolve(true)

        if (isExisting && options.autoSaveExisting) {
          return tryToSave(store)
        }

        return new Promise((resolve, reject) => {
          const macroName = getTestCaseName(state)

          Modal.confirm({
            title:      opts.getTitle({ macroName }),
            content:    opts.getContent({ macroName }),
            okText:     opts.okText,
            cancelText: opts.cancelText,
            onOk: () => {
              tryToSave(store).then(resolve, reject)
              return Promise.resolve(true)
            },
            onCancel: () => {
              resolve(false)
              return Promise.resolve(true)
            }
          })
        })
      })
    },
    save: (defaultName) => {
      const state = store.getState()
      const hasUnsaved = hasUnsavedMacro(state)

      return withIsSaving(() => {
        if (!hasUnsaved)  return Promise.resolve(true)
        return tryToSave(store, defaultName)
      })
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
