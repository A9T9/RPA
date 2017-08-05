import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { withRouter, Link } from 'react-router-dom'
import { Button, Dropdown, Menu, Icon, Modal } from 'antd'

import './header.scss'
import * as actions from '../actions'
import * as C from '../common/constant'

class Header extends React.Component {
  changeTestCase = ({ key }) => {
    const { src, hasUnsaved } = this.props.editing.meta
    const go = () => {
      this.props.editTestCase(key)
      return Promise.resolve()
    }

    if (hasUnsaved) {
      return Modal.confirm({
        title: 'Unsaved changes',
        content: 'Do you want to discard the unsaved changes?',
        okText: 'Discard',
        cancelText: 'Cancel',
        onOk: go,
        onCancel: () => {}
      })
    }

    go()
  }

  componentDidMount () {
    const { history } = this.props

    this.props.setRoute(history.location.pathname)
    this.props.history.listen((location, action) => {
      this.props.setRoute(history.location.pathname)
    })
  }

  renderStatus () {
    const { status, player } = this.props

    switch (status) {
      case C.APP_STATUS.RECORDER:
        return 'Recording'

      case C.APP_STATUS.PLAYER: {
        switch (player.status) {
          case C.PLAYER_STATUS.PLAYING: {
            const { nextCommandIndex, loops, currentLoop, timeoutStatus } = player

            if (nextCommandIndex === null ||
                loops === null || currentLoop === 0) {
              return ''
            }

            const parts = [
              `Line ${nextCommandIndex + 1}`,
              `Round ${currentLoop}/${loops}`
            ]

            if (timeoutStatus && timeoutStatus.type && timeoutStatus.total) {
              const { type, total, past } = timeoutStatus
              parts.unshift(`${type} ${past / 1000}s (${total / 1000})`)
            }

            return parts.join(' | ')
          }

          case C.PLAYER_STATUS.PAUSED:
            return 'Player paused'

          default:
            return ''
        }
      }

      default:
        return ''
    }
  }

  render () {
    const { testCases, editing, player } = this.props
    const { src, hasUnsaved } = editing.meta
    const isPlayerStopped = player.status === C.PLAYER_STATUS.STOPPED
    const klass = hasUnsaved ? 'unsaved' : ''
    const getMenuKlass = (tc) => {
      return src && (src.id === tc.id) ? 'editing' : ''
    }

    testCases.sort((a, b) => {
      const nameA = a.name.toLowerCase()
      const nameB = b.name.toLowerCase()

      if (nameA < nameB) return -1
      if (nameA === nameB)  return 0
      return 1
    })

    const menu = (
      <Menu onClick={this.changeTestCase} selectable={false}>
        {testCases.map(tc => (
          <Menu.Item
            key={tc.id}
            disabled={!isPlayerStopped}
            className={getMenuKlass(tc)}
          >
            {tc.name}
          </Menu.Item>
        ))}
      </Menu>
    )

    return (
      <div className="header">
        <div className="status">
          {this.renderStatus()}
        </div>

        <div className="select-case">
          <Dropdown overlay={menu}>
            <Button>
              <span className={klass}>{src ? src.name : 'Untitled'}</span>
              <Icon type="down" />
            </Button>
          </Dropdown>
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({
    route: state.route,
    testCases: [...state.editor.testCases],
    editing: state.editor.editing,
    player: state.player,
    status: state.status
  }),
  dispatch  => bindActionCreators({...actions}, dispatch)
)(withRouter(Header))
