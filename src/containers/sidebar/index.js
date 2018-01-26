import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, compose }  from 'redux'
import { Modal, Tabs, Icon, Select, Input, Button, Menu, Dropdown, Alert, message } from 'antd'
import ClickOutside from 'react-click-outside'

import './sidebar.scss'
import * as actions from '../../actions'
import { setIn, updateIn, cn } from '../../common/utils'
import SidebarTestSuites from './test_suites'
import SidebarTestCases from './test_cases'

class Sidebar extends React.Component {
  state = {
    drag: {
      isDragging: false,
      startX: 0,
      lastWidth: 260,
      currentMinWidth: 260
    }
  }

  getSideBarMinWidth = () => {
    const { isDragging, lastWidth, currentMinWidth } = this.state.drag
    return (isDragging ? currentMinWidth : lastWidth) + 'px'
  }

  onResizeDragStart = (e) => {
    // e.dataTransfer.setDragImage(new Image(), 10, 10)
    const style = window.getComputedStyle(this.$dom)
    const width = parseInt(style.width)

    this.setState(
      setIn(['drag'], {
        isDragging: true,
        startX: e.clientX,
        lastWidth: width,
        currentWidth: width
      }, this.state)
    )
  }

  onResizeDragEnd = (e) => {
    const diff  = e.clientX - this.state.drag.startX
    const width = diff + this.state.drag.lastWidth

    this.setState(
      setIn(['drag'], {
        isDragging: false,
        startX: 0,
        lastWidth: width,
        currentMinWidth: width
      })
    )
  }

  render () {
    return (
      <div
        className="sidebar"
        ref={el => { this.$dom = el }}
        style={{ minWidth: this.getSideBarMinWidth() }}
      >
        <div className="sidebar-inner">
          <Tabs defaultActiveKey="test_cases">
            <Tabs.TabPane tab="Test Cases" key="test_cases">
              <SidebarTestCases />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Test Suites" key="test_suites">
              <SidebarTestSuites />
            </Tabs.TabPane>
          </Tabs>
        </div>

        <div
          className={cn('resize-handler', { focused: this.state.drag.isDragging })}
          draggable="true"
          onDragStart={this.onResizeDragStart}
          onDragEnd={this.onResizeDragEnd}
          onMouseDown={() => this.setState(setIn(['drag', 'isDragging'], true, this.state))}
        />
      </div>
    )
  }
}

export default connect(
  state => ({
    status: state.status,
    testCases: state.editor.testCases,
    testSuites: state.editor.testSuites,
    editing: state.editor.editing,
    player: state.player,
    config: state.config
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(Sidebar)
