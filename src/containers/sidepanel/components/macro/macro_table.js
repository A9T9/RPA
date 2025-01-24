import {
  Button,
  Menu,
  Table,
  message
} from 'antd'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/lib/codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/javascript/javascript'
import { UnControlled as CodeMirror } from 'react-codemirror2'
import keycode from 'keycode'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Column, Table as RcvTable } from "react-virtualized";
import "react-virtualized/styles.css"; 

import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { indentCreatedByCommand } from '@/common/command'
import * as C from '@/common/constant'
import { isCVTypeForDesktop } from '@/common/cv_utils'
import inspector from '@/common/inspector'
import csIpc from '@/common/ipc/ipc_cs'
import log from '@/common/log'
import { Player } from '@/common/player'
import storage from '@/common/storage'
import { delay, isMac } from '@/common/ts_utils'
import config from '@/config'
import { getActiveTabId, showPanelWindow } from '@/ext/common/tab'
import {
  editorCommandCount,
  editorSelectedCommand,
  editorSelectedCommandIndex,
  getBreakpoints,
  getCurrentMacroId,
  getDoneCommandIndices,
  getErrorCommandIndices,
  getWarningCommandIndices,
  isFocusOnCommandTable
} from '@/recomputed'
import { FocusArea } from '@/reducers/state'
import { getLicenseService } from '@/services/license'
import { Feature } from '@/services/license/types'
import { getStorageManager } from '@/services/storage'
import { CommandItem } from './command_item'
import { waitForRenderComplete } from '@/common/utils';

const newCommand = {
  cmd: '',
  target: '',
  value: ''
}

const defaultDataSource = [newCommand]

const ITEM_HEIGHT = config.ui.commandItemHeight

class MacroTable extends React.Component {
  _lastSelectedMacroName = null
  _macroTableContainer = null
  state = {
    // cursor: null,

    contextMenu: {
      x: null,
      y: null,
      isShown: false
    },

    visionFindPreview: {
      visible: false,
      url: null,
      timer: null,
      left: -9999,
      top: -9999
    },

    targetEditor: {
      visible: false,
      text: ''
    },

    updateCommandsFromStorage: false,

    tableWidth: 0, // primary width
    tableHeight: 0, // primary height
    headerWidthPatchFactor: 1, //.6, // patch factor for header width

    columnWidths: {
      serialFixed: 30,
      cmd: .4,
      target: .3,
      value: .3,
      // opsFixed: 80
    }
  }

  onKeyDown = (e) => {
    if (!this.props.canUseKeyboardShortcuts) {
      return;
    }

    if (['INPUT', 'TEXTAREA'].indexOf(e.target.tagName) !== -1) {
      return
    }

    const code = keycode(e.keyCode)
    const isValidCtrlKeyPressed = isMac() ? e.metaKey : e.ctrlKey
    const noModifierKeyPressed  = !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

    if (isValidCtrlKeyPressed) {
      switch (code) {
        case 'c':
          return this.props.copyCurrentCommand()

        case 'x':
          return this.props.cutCurrentCommand()

        case 'v':
          return this.props.pasteAtCurrentCommand()
      }
    }

    if (noModifierKeyPressed) {
      switch (code) {
        case 'delete':
        case 'backspace': {
          const { selectedIndex } = this.props.editing.meta

          if (selectedIndex === -1) {
            return
          }

          return this.props.removeCommand(selectedIndex)
        }

        case 'up':
          if (this.props.selectedCommandIndex !== null) {
            const commandIndexToSelect = Math.max(0, this.props.selectedCommandIndex - 1)
            this.selectCommandAndScroll(commandIndexToSelect)
          }
          break

        case 'down': {
          if (this.props.selectedCommandIndex !== null) {
            const commandIndexToSelect = Math.min(this.props.commandCount - 1, this.props.selectedCommandIndex + 1)
            this.selectCommandAndScroll(commandIndexToSelect)
          }
          break
        }
      }
    }
  }

  // Note: virtual-list eats up double click events. so have to manually track click event instead
  onDoubleClick = (() => {
    let lastScreenX
    let lastScreenY
    let lastTime

    return (e) => {
      const go = () => {
        const $row = inspector.parentWithClass('real-command', e.target)
        if (!$row) return

        const index = parseInt($row.getAttribute('data-index'))
        if (isNaN(index)) return

        this.playLine(index)
      }

      const now = new Date() * 1

      if (lastScreenX === e.screenX && lastScreenY === e.screenY && now - lastTime < 300) {
        if (e.target.tagName !== 'BUTTON') {
          go()
        }
      }

      lastScreenX = e.screenX
      lastScreenY = e.screenY
      lastTime    = now
    }
  })()

  onMoveCommand = (startIndex, endIndex) => {
    this.props.moveCommands(startIndex, endIndex)
  }

  onStartDraggingCommand = () => {
    this.props.setIsDraggingCommand(true)
  }

  onEndDraggingCommand = () => {
    this.props.setIsDraggingCommand(false)
  }

  scheduleHideVisionFindPreview = () => {
    log('scheduleHideVisionFindPreview')
    const { timer } = this.state.visionFindPreview

    clearTimeout(timer)

    return setTimeout(() => {
      const { visible } = this.state.visionFindPreview

      if (visible) {
        log('to hide preview')

        this.setState({
          visionFindPreview: {
            visible: false
          }
        })
      }
    }, 3000)
  }

  onMouseEnterTarget = (e, command) => {
    // log('onMouseOverTarget')
    if (!this.commandHasVisionImage(command)) return
    if (this.state.visionFindPreview.visible) return

    clearTimeout(this.state.visionFindPreview.timer)

    const visionStorage = getStorageManager().getVisionStorage()
    const rect    = e.target.getBoundingClientRect()
    const file    = command.target.trim().split('@')[0]
    const common  = {
      visible:  true,
      left:     rect.left,
      top:      rect.top + rect.height
    }

    visionStorage.exists(file)
    .then(existed => {
      if (!existed) {
        return this.setState({
          visionFindPreview: {
            ...common,
            url: './img/not_found.png',
            timer: this.scheduleHideVisionFindPreview()
          }
        })
      }

      return visionStorage.getLink(file)
      .then(link => {
        return this.setState({
          visionFindPreview: {
            ...common,
            url: link,
            timer: this.scheduleHideVisionFindPreview()
          }
        })
      })
    })
  }

  onMouseLeaveTarget = (e, command) => {
    // log('onMouseOutTarget')
    if (!this.commandHasVisionImage(command)) return
    if (!this.state.visionFindPreview.visible) return

    clearTimeout(this.state.visionFindPreview.timer)

    this.setState({
      visionFindPreview: {
        visible: false
      }
    })
  }  

  commandClassName = (record, index) => {
    const { editing, player, breakpointIndices, doneCommandIndices, errorCommandIndices, warningCommandIndices } = this.props
    const { nextCommandIndex } = player
    const { commands }  = editing
    const classNames    = []

    if (breakpointIndices.indexOf(index) !== -1) {
      classNames.push('breakpoint-command')
    }

    if (record.cmd === 'comment' || record.cmd === '') {
      classNames.push('comment-command')
    }

    if (!this.props.canUseKeyboardShortcuts) {
      classNames.push('blur')
    }

    if (index === nextCommandIndex) {
      classNames.push('running-command')
    } else if (warningCommandIndices.indexOf(index) !== -1) {
      classNames.push('warning-command')
    } else if (errorCommandIndices.indexOf(index) !== -1) {
      classNames.push('error-command')
    } else if (doneCommandIndices.indexOf(index) !== -1) {
      classNames.push('done-command')
    }

    if (index === editing.meta.selectedIndex) {
      classNames.push('selected-command')
    }

    return classNames.join(' ')
  }

  needVirtualList = () => {
    return true
    const { commands = [] } = this.props.editing
    const threshold = 0

    return commands.length >= threshold
  }

  virtualCommmandList = ({ virtual, itemHeight }) => {
    let { commands }  = this.props.editing
    commands = (commands || []).filter(res => res.cmd && res.cmd.length > 0);
    const editable      = this.isPlayerStopped() && getLicenseService().canPerform(Feature.Edit)
    const renderItem    = (item, i) => {
      if (item.header) {
        return (
          <div className="command-row header-row" key="header">
            <div className="row-col index-col">
            </div>
            <div className="row-col command-col">
              Command
            </div>
            <div className="row-col target-col">
              Target
            </div>
            <div className="row-col value-col">
              Value
            </div>
          </div>
        )
      }

      return (
        <CommandItem
          key={item.key}
          index={item.realIndex + 1}
          command={item}
          style={{ height: itemHeight + 'px' }}
          className={`command-row real-command ` + this.commandClassName(item, item.realIndex)}
          attributes={{ 'data-index': '' + item.realIndex }}
          editable={editable}
          onClick={(e, command) => this.onClickCommand(e, command)}
          onContextMenu={(e, command) => this.onContextMenu(e, command.realIndex)}
          onToggleComment={(e, command) => { this.props.toggleComment(command.realIndex); e.stopPropagation() }}
          onDuplicate={(e, command) => { this.props.duplicateCommand(command.realIndex); e.stopPropagation() }}
          onMouseEnterTarget={this.onMouseEnterTarget}
          onMouseLeaveTarget={this.onMouseLeaveTarget}
          onMoveCommand={this.onMoveCommand}
          onDragStart={this.onStartDraggingCommand}
          onDragEnd={this.onEndDraggingCommand}
        />
      )
    }

    return (
      <div style={virtual.style}>
        {virtual.items.map(renderItem)}
      </div>
    )
  }

  getEditingFromStorage = () => {
    return storage.get('editing').then((editingFromStorage) => {
      return editingFromStorage
    }).catch(err => {
      return null
    })
  }

  handleStorageChange = ([storage]) => {
    if (storage.key === 'editing') {
      if (storage.oldValue.meta.hasUnsaved && !storage.newValue.meta.hasUnsaved) {
        this.getEditingFromStorage().then((editingFromStorage) => {
          let idFromStorage = editingFromStorage.meta.src.id
          let idFromState = this.props.editing.meta.src.id
          if (idFromStorage === idFromState) {
            // update redux state only
            this.props.updateEditing(editingFromStorage)
          }
        })
      }
    }
  }

  
  onWindowResize = () => {
    // TODO: find a better way to calculate table width/height
    this.setState({ tableWidth: document.querySelector('.ant-tabs-content').clientWidth})
    this.setState({ tableHeight: document.querySelector('.ant-tabs-content').clientHeight  })
  }

  componentDidMount () {
    document.addEventListener('click', this.onHideMenu)
    document.addEventListener('click', this.onDoubleClick)
    document.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('resize', this.onWindowResize)
    storage.addListener(this.handleStorageChange.bind(this))
    this.forceUpdate()
    
    waitForRenderComplete('.ant-tabs-content').then(() => {      
      this.setState({ tableWidth: document.querySelector('.ant-tabs-content').clientWidth })
      this.setState({ tableHeight: document.querySelector('.ant-tabs-content').clientHeight  })      
    })   

  }

  componentWillUnmount () {
    document.removeEventListener('click', this.onHideMenu)
    document.removeEventListener('click', this.onDoubleClick)
    document.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('resize', this.onWindowResize)
  }

  getMacroName () {
    const { src } = this.props.editing.meta
    return src && src.name && src.name.length ? src.name : ''
  }

  getMacroTableContainer () {
    return this._macroTableContainer || (this._macroTableContainer = document.querySelector('.table-wrapper .ReactVirtualized__Table__Grid'))
  }

  componentWillReceiveProps (nextProps) {
    // Note: update sourceText whenever editing changed
    // if (nextProps.editing.meta.src !== this.props.editing.meta.src ||
    //     nextProps.editing.commands !== this.props.editing.commands) {
    //   const resetCursor = nextProps.editing.meta.src !== this.props.editing.meta.src

    //   this.setState(
    //     this.resetSourceCodeCursor(resetCursor)
    //   )
    // }

    const tableNode = this.getMacroTableContainer();
    if (nextProps.status === C.APP_STATUS.PLAYER) {
      if (nextProps.player.nextCommandIndex === 0) {
        this._lastSelectedMacroName = this.getMacroName()
        tableNode.scrollTop = 0
      } else if (nextProps.player.nextCommandIndex !== this.props.player.nextCommandIndex) {
        const itemHeight = ITEM_HEIGHT
        const scrollTop = itemHeight * nextProps.player.nextCommandIndex
        tableNode.scrollTop = scrollTop
      }
    } else if (this._lastSelectedMacroName !== this.getMacroName()) {
      // bring scroll position to top when new macro selected
      this._lastSelectedMacroName = this.getMacroName()
      tableNode.scrollTop = 0
    }
  }

  isPlayerStopped () {
    return this.props.player.status === C.PLAYER_STATUS.STOPPED
  }

  waitBeforeScreenCapture () {
    if (!isCVTypeForDesktop(this.props.config.cvScope)) {
      return Promise.resolve()
    }

    if (this.props.config.waitBeforeDesktopScreenCapture && this.props.config.secondsBeforeDesktopScreenCapture > 0) {
      message.info(`About to take desktop screenshot in ${this.props.config.secondsBeforeDesktopScreenCapture} seconds`)
      return delay(() => {}, this.props.config.secondsBeforeDesktopScreenCapture * 1000)
    }

    return Promise.resolve()
  }

  onContextMenu = (e, index) => {
    log('onContextMenu')

    this.setState({
      contextMenu: {
        x: e.clientX,
        y: e.clientY,
        isShown: true,
        commandIndex: index
      }
    })

    this.props.selectCommand(index, true)
    e.preventDefault()
    e.stopPropagation()
  }

  onHideMenu = (e) => {
    if (e.button !== 0) return

    this.setState({
      contextMenu: {
        ...this.state.contextMenu,
        isShown: false
      }
    })
  }

  onClickCommand = (e, command) => {
    this.props.updateUI({ focusArea: FocusArea.CommandTable })
    this.props.selectCommand(command.realIndex, true)
  }

  getTestCaseName = () => {
    const { src } = this.props.editing.meta
    return src && src.name && src.name.length ? src.name : 'Untitled'
  }

  playLine = (commandIndex, extraOptions = {}) => {
    const { commands }  = this.props.editing
    const { src }       = this.props.editing.meta

    this.setState({ lastOperation: 'play' })

    return this.props.playerPlay({
      macroId: src && src.id,
      title: this.getTestCaseName(),
      extra: {
        id: src && src.id
      },
      mode: Player.C.MODE.SINGLE,
      startIndex: commandIndex,
      startUrl: null,
      resources: commands,
      postDelay: this.props.config.playCommandInterval * 1000,
      ...extraOptions
    })
  }

  isSelectedCommandVisualSearch (command) {
    const { editing, config }   = this.props
    const { commands, meta }    = editing
    const { selectedIndex }     = meta

    const dataSource    = commands && commands.length ? commands : defaultDataSource
    const selectedCmd   = command || dataSource[selectedIndex]

    const selectedCmdIsVisualSearch = (() => {
      if (!selectedCmd) return false
      if (isCVTypeForDesktop(config.cvScope) && selectedCmd.cmd === 'visionLimitSearchArea')  return true

      return [
        'visionFind', 'visualSearch',
        'visualAssert', 'visualVerify',
        'XClick', 'XClickText', 'XClickTextRelative', 'XMoveText','XMoveTextRelative', 'XMove', 'XClickRelative', 'XMoveRelative',
        'OCRExtract', 'OCRExtractRelative', 'visionLimitSearchAreaRelative', 'visionLimitSearchAreabyTextRelative'
      ].indexOf(selectedCmd.cmd) !== -1
    })()

    return selectedCmdIsVisualSearch
  }

  commandHasVisionImage (command) {
    if (!this.isSelectedCommandVisualSearch(command)) return false

    const commandsCouldHaveVisionImage = [
      'XClick', 'XClickText', 'XClickTextRelative', 'XClickRelative', 'XMoveText','XMoveTextRelative', 'XMove', 'XMoveRelative', 'OCRExtract', 'OCRExtractRelative',
      'visionLimitSearchArea', 'visionLimitSearchAreaRelative', 'visionLimitSearchAreabyTextRelative'
    ]

    if (commandsCouldHaveVisionImage.indexOf(command.cmd) !== -1 && !/\.png/i.test(command.target))  return false
    return true
  }

  selectCommandAndScroll (commandIndex) {
    this.props.selectCommand(commandIndex, true)
    this.props.scrollToCommandAtIndex(commandIndex)
  }

  onClickEditInIDE = async (macroId, commandIndex) => {
    const tabId = await getActiveTabId()
    if (tabId) {
        showPanelWindow({ selectCommandIndex: commandIndex })
    }
  }

  renderVisionFindPreview () {
    const { visible, url, left, top } = this.state.visionFindPreview
    if (!visible) return null

    return (
      <div style={{
        position: 'absolute',
        width: '100px',
        height: '100px',
        border: '1px solid #ccc',
        left: left + 'px',
        top: top + 'px',
        backgroundColor: '#eee',
        backgroundImage: `url(${url})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      }}>
      </div>
    )
  }

  renderContextMenu () {
    const { clipboard, status } = this.props
    const { contextMenu } = this.state
    const isNormal = status === C.APP_STATUS.NORMAL
    const dw  = document.documentElement.clientWidth
    const dh  = document.documentElement.clientHeight
    const mw  = 222
    const otherItemsHeight = 62

    const container = document.querySelector('.ant-tabs-content')

    if (!container) {
      return null
    }

    let x     = contextMenu.x + container.scrollLeft
    let y     = contextMenu.y + (container.scrollTop || 0) - otherItemsHeight;

    if (!isNormal) {
      return null
    }

    if (x + mw > dw) x -= mw
    if (x < 0) x = 10

    const style = {
      position: 'absolute',
      top: y,
      left: x,
      display: contextMenu.isShown ? 'block' : 'none'
    }

    const menuStyle = {
      width: mw + 'px'
    }

    const { commandIndex } = contextMenu

    const handleClick = (e) => {
      switch (e.key) {
        case 'run_line': {
          return this.playLine(commandIndex)
        }
        case 'play_from_here_keep_variables': {
          const { commands }  = this.props.editing

          this.setState({ lastOperation: 'play' })

          return this.props.playerPlay({
            macroId:    this.props.macroId,
            title:      this.getTestCaseName(),
            extra:      { id: this.props.macroId },
            mode:       Player.C.MODE.STRAIGHT,
            startIndex: commandIndex,
            keepVariables:'yes',
            startUrl:   null,
            resources:  commands,
            postDelay:  this.props.config.playCommandInterval * 1000
          })
        }
        case 'play_to_here': {
          const { commands }  = this.props.editing

          this.setState({ lastOperation: 'play' })

          return this.props.playerPlay({
            macroId:    this.props.macroId,
            title:      this.getTestCaseName(),
            extra:      { id: this.props.macroId },
            mode:       Player.C.MODE.STRAIGHT,
            keepVariables:'reset',
            startIndex: 0,
            startUrl:   null,
            resources:  commands,
            postDelay:  this.props.config.playCommandInterval * 1000,
            breakpoints: [commandIndex]
          })
        }
        case 'edit_in_ide': {
          this.onClickEditInIDE(this.props.macroId, commandIndex)
        }
      }
    }

    const ctrlKey = isMac() ? '⌘' : 'CTRL-'

    return (
      <div style={style} id="context_menu">
        <Menu 
          onClick={handleClick} 
          style={menuStyle} 
          mode="vertical" 
          selectable={false}
          items={[
            { key: 'run_line', label: 'Execute this command' },
            { key: 'play_from_here_keep_variables', label: 'Play from here and keep variables' },
            { key: 'play_to_here', label: 'Play to this point' },
            { type: 'divider' },
            { key: 'edit_in_ide', label: 'Edit (in IDE)' }
          ]}
        />
      </div>
    )
  }

  renderTable () {
    const { editing, player } = this.props
    const { commands }  = editing
    const { dataSource } = (commands && commands.length ? commands : defaultDataSource)
                            .reduce(({ dataSource, indent }, command, i) => {
                              const { selfIndent, nextIndent } = indentCreatedByCommand(command.cmd)

                              dataSource.push({
                                ...command,
                                key: Math.random(),
                                indent: indent + selfIndent,
                                realIndex: i,
                                serial: i + 1
                              })

                              return {
                                dataSource,
                                indent: Math.max(0, indent + selfIndent + nextIndent)
                              }
                            }, { dataSource: [], indent: 0 })

    return this.needVirtualList() ? this.renderVirtualTable(dataSource) : this.renderNormalTable(dataSource)
  }

  renderVirtualTable (dataSource) {
    let { commands }  = this.props.editing
    commands = (commands || []).filter(res => res.cmd && res.cmd.length > 0);
    const editable      = this.isPlayerStopped() && getLicenseService().canPerform(Feature.Edit)

    const  { columnWidths, tableWidth, headerWidthPatchFactor, tableHeight } = this.state;
    let itemHeight = ITEM_HEIGHT;
    return (
      <div className="t-body">
        {!this.listContainer ? null : (
          <RcvTable
            width={tableWidth}
            height= {tableHeight}
            // style={{ height: 'calc(100% - 40px)' }}
            className='command-table'
            headerHeight={ITEM_HEIGHT}
            rowHeight={ITEM_HEIGHT}
            rowCount={dataSource.length}
            rowGetter={({ index }) => dataSource[index] || { key: index }}
            rowClassName ={({index}) => (index === -1 || index >= dataSource.length  ) ? '' : `command-row real-command ` + this.commandClassName(dataSource[index], index)}
            rowRenderer={({ key, index, style }) => {
              const item = dataSource[index]              
              return (
                <CommandItem
                  key={key}
                  index={item.realIndex + 1}
                  command={item}
                  style={{ ...style, height: itemHeight + 'px',  }}
                  columnWidths={columnWidths}
                  tableWidth={tableWidth}
                  className={`command-row real-command ` + this.commandClassName(item, item.realIndex)}
                  attributes={{ 'data-index': '' + item.realIndex }}
                  editable={editable}
                  onClick={(e, command) => this.onClickCommand(e, command)}
                  onContextMenu={(e, command) => this.onContextMenu(e, command.realIndex)}
                  onToggleComment={(e, command) => { this.props.toggleComment(command.realIndex); e.stopPropagation() }}
                  onDuplicate={(e, command) => { this.props.duplicateCommand(command.realIndex); e.stopPropagation() }}
                  onMouseEnterTarget={this.onMouseEnterTarget}
                  onMouseLeaveTarget={this.onMouseLeaveTarget}
                  onMoveCommand={this.onMoveCommand}
                  onDragStart={this.onStartDraggingCommand}
                  onDragEnd={this.onEndDraggingCommand}
                />
              )
            }}
          >
            <Column
              dataKey="serial"
              label=""
              width={columnWidths.serialFixed}
            />  
            <Column
              // headerRenderer={this.headerRenderer}
              dataKey="cmd"
              label="Command"
              width={columnWidths.cmd * (tableWidth + 50)  * headerWidthPatchFactor}
              maxWidth={ 170 } 
            />  
            <Column
              // headerRenderer={this.headerRenderer}
              dataKey="target"
              label="Target"
              width={columnWidths.target * (tableWidth + 50) * headerWidthPatchFactor}
            />  
            <Column
              dataKey="value"
              label="Value"
              width={columnWidths.value * (tableWidth + 50) * headerWidthPatchFactor}
            />
          </RcvTable>
        )}
      </div>
    )
  }
 
  renderNormalTable (dataSource) {
    const columns = [
      { title: 'Command',  dataIndex: 'cmd',      key: 'cmd',     width: 130 },
      { title: 'Target',   dataIndex: 'target',   key: 'target',  width: 190 },
      { title: 'Value',    dataIndex: 'value',    key: 'value' }
    ]

    const tableConfig = {
      dataSource,
      columns,
      pagination: false,
      onRowClick: (record, index, e) => {
        this.props.selectCommand(index)
      },
      rowClassName: this.commandClassName
    }

    return <Table {...tableConfig} />
  }

  render () {
    return (
      <div className="editor-wrapper">
        <div className="tabs-wrapper">
            <div className="form-group table-wrapper" style={{ marginBottom: 0 }} ref={ref => { this.listContainer = ref }}>
              {this.renderTable()}
            </div>
        </div>
        {this.renderContextMenu()}
        {this.renderVisionFindPreview()}
        {/* {this.renderTargetEditor()} */}
      </div>
    )
  }
}

export default connect(
  state => ({
    status: state.status,
    editor: state.editor,
    editing: state.editor.editing,
    clipboard: state.editor.clipboard,
    player: state.player,
    config: state.config,
    ui: state.ui,
    sourceErrMsg: state.editor.editingSource.error,
    sourceText: state.editor.editingSource.pure,
    sourceTextModified: state.editor.editingSource.current,
    selectedCommand: editorSelectedCommand(state),
    selectedCommandIndex: editorSelectedCommandIndex(state),
    commandCount: editorCommandCount(state),
    breakpointIndices: getBreakpoints(state),
    doneCommandIndices: getDoneCommandIndices(state),
    errorCommandIndices: getErrorCommandIndices(state),
    warningCommandIndices: getWarningCommandIndices(state),
    macroId: getCurrentMacroId(state),
    canUseKeyboardShortcuts: isFocusOnCommandTable(state)
  }),
  dispatch => bindActionCreators({...actions, ...simpleActions}, dispatch)
)(MacroTable)
