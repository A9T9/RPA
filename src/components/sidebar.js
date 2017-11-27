import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators }  from 'redux'
import { Modal } from 'antd'

import './sidebar.scss'
import { getPlayer } from '../common/player'
import * as actions from '../actions'
import * as C from '../common/constant'

class Sidebar extends React.Component {
  getItemKlass = (tc) => {
    const src = this.props.editing.meta.src
    const klasses = []

    if (src && (src.id === tc.id))                        klasses.push('selected')

    if (tc.status === C.TEST_CASE_STATUS.SUCCESS)         klasses.push('success')
    else if (tc.status === C.TEST_CASE_STATUS.ERROR)      klasses.push('error')
    else                                                  klasses.push('normal')

    if (this.props.status !== C.APP_STATUS.NORMAL) {
      klasses.push('disabled')
    }

    return klasses.join(' ')
  }

  changeTestCase = (id) => {
    return new Promise((resolve) => {
      if (this.props.status !== C.APP_STATUS.NORMAL)  return resolve(false)
      if (this.props.editing.meta.src && this.props.editing.meta.src.id === id) return resolve(true)

      const { hasUnsaved } = this.props.editing.meta
      const go = () => {
        this.props.editTestCase(id)
        resolve(true)
        return Promise.resolve()
      }

      if (hasUnsaved) {
        return Modal.confirm({
          title: 'Unsaved changes',
          content: 'Do you want to discard the unsaved changes?',
          okText: 'Discard',
          cancelText: 'Cancel',
          onOk: go,
          onCancel: () => { resolve(false) }
        })
      }

      go()
    })
  }

  onDoubleClick = (id) => {
    if (this.props.status !== C.APP_STATUS.NORMAL)  return

    this.changeTestCase(id)
    .then(shouldPlay => {
      if (!shouldPlay)  return

      setTimeout(() => {
        const { commands } = this.props.editing
        const openTc  = commands.find(tc => tc.cmd.toLowerCase() === 'open')
        const { src } = this.props.editing.meta
        const getTestCaseName = () => {
          return src && src.name && src.name.length ? src.name : 'Untitled'
        }

        this.props.playerPlay({
          title: getTestCaseName(),
          extra: {
            id: src && src.id
          },
          mode: getPlayer().C.MODE.STRAIGHT,
          startIndex: 0,
          startUrl: openTc ? openTc.target : null,
          resources: commands,
          postDelay: this.props.player.playInterval * 1000
        })
      }, 500)
    })
  }

  render () {
    const isEditingUntitled = !this.props.editing.meta.src
    const { testCases } = this.props

    testCases.sort((a, b) => {
      const nameA = a.name.toLowerCase()
      const nameB = b.name.toLowerCase()

      if (nameA < nameB) return -1
      if (nameA === nameB)  return 0
      return 1
    })

    return (
      <div className="sidebar">
        <div className="sidebar-inner">
          <h2 className="sidebar-title">Test Cases</h2>
          <ul className="sidebar-test-cases">
            {isEditingUntitled ? (
              <li className="selected">Untitled</li>
            ) : null}
            {testCases.map(tc => (
              <li
                key={tc.id}
                className={this.getItemKlass(tc)}
                onClick={() => this.changeTestCase(tc.id)}
                onDoubleClick={() => this.onDoubleClick(tc.id)}
              >
                {tc.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({
    status: state.status,
    testCases: state.editor.testCases,
    editing: state.editor.editing,
    player: state.player,
    config: state.config
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(Sidebar)
