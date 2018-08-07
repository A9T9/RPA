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
      movingX: 0,
      lastWidth: 260,
      currentMinWidth: 260
    }
  }

  getSideBarMinWidth = () => {
    const { isDragging, lastWidth, currentMinWidth } = this.state.drag
    return (isDragging ? currentMinWidth : lastWidth) + 'px'
  }

  onResizeDragStart = (e) => {
    // Note: Firefox requires us to set something to DataTransfer, otherwise drag and dragEnd won't be triggered
    // refer to https://stackoverflow.com/questions/33434275/firefox-on-drag-end-is-not-called-in-a-react-component
    e.dataTransfer.setData('text', '')

    const style = window.getComputedStyle(this.$dom)
    const width = parseInt(style.width)

    this.setState(
      setIn(['drag'], {
        isDragging: true,
        // Check out the note on `screenX` in `onResizeDragEnd` event
        startX: e.screenX,
        lastWidth: width,
        currentWidth: width
      }, this.state)
    )
  }

  onResizeDragEnd = (e) => {
    // Note: use `screenX` instead of `clientX`, because `clientX` of dragEnd events in Firefox
    // is always set to 0, while `screenX` is luckily still available. And since we only make use of
    // difference of X coordinate. `screenX` and `clientX` both work for us.
    //
    // reference:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=505521
    // https://developer.mozilla.org/en-US/docs/Web/Events/dragend
    const diff  = e.screenX - this.state.drag.startX
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
          <Tabs
            defaultActiveKey="macros"
            activeKey={this.props.ui.sidebarTab || 'macros'}
            onChange={activeKey => this.props.updateUI({ sidebarTab: activeKey })}
          >
            <Tabs.TabPane tab="Macros" key="macros">
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
    config: state.config,
    ui: state.ui
  }),
  dispatch => bindActionCreators({...actions}, dispatch)
)(Sidebar)
