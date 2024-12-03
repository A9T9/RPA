import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators }  from 'redux'
import {
  Button,
  Menu,
  Input,  
  Table,
  Form,
  Select,
  message,
  Tabs,
  Modal
} from 'antd'
import { DoubleRightOutlined } from '@ant-design/icons'; // Replace with appropriate icon

import { PlusOutlined } from '@ant-design/icons';
// import VirtualList from 'kd-react-virtual-list'
import keycode from 'keycode'
import { UnControlled as CodeMirror } from 'react-codemirror2'
import 'codemirror/lib/codemirror'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/lib/codemirror.css'
import { Column, Table as RcvTable } from "react-virtualized";
import Draggable from "react-draggable";
import "react-virtualized/styles.css"; 

import { SelectInput } from '../../components/select_input'
import { CommandItem } from './command_item'
import { getStorageManager } from '../../services/storage'
import inspector from '../../common/inspector'
import { Player } from '../../common/player'
import csIpc from '../../common/ipc/ipc_cs'
import * as actions from '../../actions'
import { Actions as simpleActions } from '../../actions/simple_actions'
import * as C from '../../common/constant'
import log from '../../common/log'
import {
  editorSelectedCommand,
  editorSelectedCommandIndex,
  editorCommandCount,
  getBreakpoints,
  getCurrentMacroId,
  getDoneCommandIndices,
  getErrorCommandIndices,
  getWarningCommandIndices,
  isFocusOnCommandTable
} from '../../recomputed'
import { delay, isMac } from '../../common/ts_utils';
import { availableCommands, availableCommandsForDesktop, commandText, indentCreatedByCommand, doesCommandSupportTargetOptions, canCommandSelect, canCommandFind } from '../../common/command'
import { FocusArea } from '../../reducers/state'
import config from '../../config'
import { cn, waitForRenderComplete } from '../../common/utils'
import { getLicenseService } from '../../services/license'
import { Feature } from '../../services/license/types'
import { isCVTypeForDesktop } from '../../common/cv_utils'
import { selectAreaOnDesktop } from '../../ext/common/desktop_vision'
import ComputerSvg from '@/assets/svg/computer.svg'
import BrowserSvg from '@/assets/svg/browser.svg'

const newCommand = {
  cmd: '',
  target: '',
  value: ''
}

const defaultDataSource = [newCommand]

const ITEM_HEIGHT = config.ui.commandItemHeight

class DashboardEditor extends React.Component {
  state = {
    cursor: null,
    newMacroSelected: true,

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

    tableWidth: 0, // primary width
    tableHeight: 0, // primary height
    headerWidthPatchFactor: 1.6, // patch factor for header width

    columnWidths: {
      serialFixed: 30,
      cmd: .3,
      target: .4,
      value: .3,
      opsFixed: 80
    },
    userInputCmdValue: '',
  }
  
  constructor(props) {
    super(props);
    this.macroTableRef = React.createRef();
    this.codeMirrorRef = React.createRef();
    this.cmdInputRef = React.createRef();
  }

  resetSourceCodeCursor = (resetCursor) => {
    return {
      ...(resetCursor ? { cursor: { line: 0, ch: 0 } } : {})
    }
  }

  onDetailChange = (key, value) => {
    this.props.updateSelectedCommand({[key]: value})
  }

  onChangeCommandsView = (type) => {
    switch (type) {
      case 'table_view':
      case 'source_view': {
        const forceType = this.props.sourceErrMsg ? 'source_view' : type

        this.props.setEditorActiveTab(forceType)

        if (type === 'source_view' ) {
          setTimeout(() => {
            if(this.state.newMacroSelected) {
              this.setState({ newMacroSelected: false })
              this.codeMirrorRef.current.editor.focus()
              this.codeMirrorRef.current.editor.setCursor({ line: 0, ch: 0 }, true, true)
            }
          }, 200)
        }

        break
      }
    }
  }

  onSourceBlur = () => {
    const { sourceTextModified, sourceText } = this.props
    this.props.saveSourceCodeToEditing(sourceTextModified)
  }

  onChangeEditSource = (editor, data, text) => {
    this.props.setSourceCurrent(text)
  }

  onClickFind = () => {
    const { lastOperation }   = this.state
    const { selectedCommand } = this.props

    const p = new Promise((resolve, reject) => {
      switch (selectedCommand.cmd) {
        case 'visualGetPixelColor':
        case 'visionFind':
        case 'visualSearch':
        case 'visualAssert':
        case 'visualVerify':
        case 'visionLimitSearchArea':
        case 'visionLimitSearchAreaRelative':
        case 'visionLimitSearchAreabyTextRelative':
        case 'XClick':
        case 'XClickText':
        case 'XClickTextRelative':
        case 'XClickRelative':
        case 'XMoveText':
        case 'XMoveTextRelative':
        case 'XMove':
        case 'XMoveRelative':
        case 'OCRExtract':
        case 'OCRExtractRelative':
        case 'OCRExtractbyTextRelative':
        case 'OCRSearch': 
        case 'aiPrompt':
        case 'aiScreenXY': 
        case 'aiComputerUse': {
          const selectedIndex = this.props.editing.meta.selectedIndex
          const run = () => {
            // Note: run visionFind/visualSearch as single line command, but without timeout waiting
            this.playLine(selectedIndex, {
              overrideScope: {'!TIMEOUT_WAIT': 0},
              commandExtra: {
                throwError: true,
                // visualXXX uses this flag in desktop mode to open Desktop Screenshot Editor to preview result
                debugVisual: true
              }
            })
            return resolve(true)
          }

          return this.waitBeforeScreenCapture().then(run)
        }

        default: {
          return csIpc.ask('PANEL_HIGHLIGHT_DOM', {
            lastOperation,
            locator: selectedCommand.target,
            cmd:selectedCommand.cmd
          })
          .then(resolve, reject)
        }
      }
    })

    p.catch(e => {
      message.error(e.message, 1.5)
    })
  }

  onToggleSelect = () => {
    const { selectedCommand, config } = this.props
    const p = new Promise((resolve, reject) => {
      const defaultAction = () => {
        if (this.props.status === C.APP_STATUS.INSPECTOR) {
          this.props.stopInspecting()
        } else {
          this.props.startInspecting()
        }

        resolve(true)
      }
      const takeImage = () => {
        const isDesktop = isCVTypeForDesktop(config.cvScope)

        return this.waitBeforeScreenCapture().then(() => {
          if (isDesktop) {
            return selectAreaOnDesktop({
              width: screen.availWidth,
              height: screen.availHeight
            })
          } else {
            return csIpc.ask('PANEL_SELECT_AREA_ON_CURRENT_PAGE')
          }
        })
        .then(res => this.props.renameVisionImage(res.fileName))
        .then(resolve, reject)
      }

      switch (selectedCommand.cmd) {
        case 'visionFind':
        case 'visualSearch':
        case 'visualAssert':
        case 'visualVerify':
        case 'OCRExtract':
        case 'OCRExtractRelative':
        case 'visionLimitSearchAreaRelative':
        case 'visionLimitSearchAreabyTextRelative':
        case 'XClickRelative':
        case 'XMoveRelative':
        case 'XMoveText':
        case 'XMoveTextRelative':
        case 'OCRExtractbyTextRelative':
        case 'XMove': {

          const disableTakeImageCommands = [
            'OCRExtractbyTextRelative',
            'visionLimitSearchAreabyTextRelative',
            'XMoveText',
            'XMoveTextRelative'
          ]

          if (disableTakeImageCommands.indexOf(selectedCommand.cmd) !== -1) {
              throw new Error('No select possible for Command ' + selectedCommand.cmd + ', just enter the text')
          } else {
            return takeImage()
          }      
        }

        case 'OCRSearch':
          throw new Error('No select possible in OCR mode, just enter the text')

        case 'aiPrompt':
          throw new Error('No select possible in aiPrompt mode')

        case 'aiScreenXY':
          throw new Error('No select possible in aiScreenXY mode')

        case 'aiComputerUse':
          throw new Error('No select possible in aiComputerUse mode')

        case 'XClickText':
        case 'XClickTextRelative':
        case 'XClick': {         

          const disableTakeImageCommands = [
            'XClickText',
            'XClickTextRelative',
          ]          

          if (disableTakeImageCommands.indexOf(selectedCommand.cmd) !== -1) {
            throw new Error('No select possible for Command ' + selectedCommand.cmd + ', just enter the text')
          } else {
            return takeImage()
          }  

          // if (/^ocr=/i.test(selectedCommand.target)) {
          //   throw new Error('No select possible in OCR mode, just enter the text')
          // } else if (/#R/i.test(selectedCommand.target)) {
          //   throw new Error('No select possible for Command ' + selectedCommand.cmd + ', just enter the text')
          // } else {
          //   return takeImage()
          // }
        }

        case 'visionLimitSearchArea': {
          if (isCVTypeForDesktop(config.cvScope)) {
            return takeImage()
          } else {
            return defaultAction()
          }
        }

        case 'setWindowSize': {
          return Modal.confirm({
            title:  'Confirm',
            content: 'Do you want to use the current browser dimensions?',
            okText: 'Yes',
            cancelText: 'No',
            onOk: () => {
              return csIpc.ask('PANEL_GET_WINDOW_SIZE_OF_PLAY_TAB').then((size) => {
                console.log('window size:>>', size)
                this.props.updateSelectedCommand({
                  target: `${size.viewport.width}x${size.viewport.height}`
                })
              })
            },
            onCancel: () => {
              return Promise.resolve(true)
            }
          })
        }

        default: {
          return defaultAction()
        }
      }
    })

    p.catch(e => {
      console.error(e)
      message.error(e.message)
    })
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
            e.preventDefault()
            const commandIndexToSelect = Math.max(0, this.props.selectedCommandIndex - 1)
            this.selectCommandAndScroll(commandIndexToSelect)
          }
          break

        case 'down': {
          if (this.props.selectedCommandIndex !== null) {
            e.preventDefault()
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

  jumpToImage = (commandIndex) => {
    const tabs_elements = document.querySelectorAll('.ant-tabs-tab');
    const visual_tab = Array.from(tabs_elements).find((el) => el.innerText.includes('👁Visual'));
    if (visual_tab) {
      visual_tab.click();
      const { editing } = this.props
      const { commands } = editing
      let action_button = document.querySelector('.ls-toolbox > button > i.anticon.anticon-up');
      if (action_button != null) {
        document.querySelector('.ls-toolbox > button > i.anticon.anticon-up').click();
      }
      setTimeout(function () {
        let imageName = commands[commandIndex]['target'].split('.png')[0] + '.png';
        let tragte_img = document.getElementById(imageName)
        let tragte_img_tr = tragte_img.parentElement.parentElement;
        tragte_img_tr.scrollIntoView({ behavior: 'smooth' });
      }, 500)
    }
  }

  jumpToSourceCode = (commandIndex) => {
    this.props.setEditorActiveTab('source_view')
    setTimeout(() => {
      const { editing } = this.props
      const { commands } = editing
      let instance = this.state.cmEdtiorInstance
      const headingLineCount = 4;
      const ch = 0

      const $tab      = document.querySelector('.source-view')
      const tabHeight = parseInt(window.getComputedStyle($tab).height, 10)
      const margin    = (tabHeight - 60) / 2

      const lineCountForCommand = (command) => {
        return 6 + (command.targetOptions ? (command.targetOptions.length + 2) : 0)
      }

      let startLine = headingLineCount;

      for (let i = 0; i < commandIndex; i++) {
        startLine += lineCountForCommand(commands[i])
      }

      const endLine = startLine + lineCountForCommand(commands[commandIndex])

      log('margin', margin, tabHeight)
      
      if(!instance) { 
        instance = document.querySelector('.CodeMirror').CodeMirror    
      }

      instance.scrollIntoView({ ch, line: startLine }, margin)
      instance.setSelection(
        { ch, line: startLine },
        { ch, line: endLine },
        { scroll: false }
      )
    }, 100)
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
    // const { commands = [] } = this.props.editing
    // const threshold = 0
    // return commands.length >= threshold
  }

  getTableWrapper = () => {
    // return promise
    return new Promise((resolve, reject) => {
      const $table = document.querySelector('.table-wrapper')
      if ($table) {
        resolve($table)
      } else {
        // reject(new Error('table-wrapper not found'))
        resolve(null)
      }
    })
  }

  onWindowResize = () => {
    this.getTableWrapper().then($table => {
      if ($table) {
        this.setState({ tableWidth: $table.clientWidth })
        this.setState({ tableHeight: $table.clientHeight })
      }
    })    
  }

  componentDidMount () {
    document.addEventListener('click', this.onHideMenu)
    document.addEventListener('click', this.onDoubleClick)
    document.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('resize', this.onWindowResize)
    
    waitForRenderComplete('.table-wrapper').then(() => {
      this.getTableWrapper().then($table => {
        if ($table) {
          this.setState({ tableWidth: $table.clientWidth })
          this.setState({ tableHeight: $table.clientHeight })
        }
      }) 
    })      
  }  

  componentWillUnmount () {
    document.removeEventListener('click', this.onHideMenu)
    document.removeEventListener('click', this.onDoubleClick)
    document.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('resize', this.onWindowResize)
  }

  componentWillReceiveProps (nextProps) {
    // console.log('nextProps:>> ', nextProps)
    // Note: update sourceText whenever editing changed
    if (nextProps.editing.meta.src !== this.props.editing.meta.src ||
        nextProps.editing.commands !== this.props.editing.commands) {
      const resetCursor = nextProps.editing.meta.src !== this.props.editing.meta.src

      this.setState(
        this.resetSourceCodeCursor(resetCursor)
      )

      if(nextProps.editing.meta.src !== this.props.editing.meta.src) {
        this.setState({ newMacroSelected: true })
      }
    }

    if (nextProps.bottomPanelHeight !== this.props.bottomPanelHeight) {
      // update table width and height
      this.onWindowResize()
    }

    if (nextProps.config.showBottomArea !== this.props.config.showBottomArea) {
      // update table height
      this.onWindowResize()   
    }

    if (this.macroTableRef.current) {
      if (nextProps.status === C.APP_STATUS.PLAYER && 
          nextProps.player.nextCommandIndex !== this.props.player.nextCommandIndex) {

        const numberOfVisibleRows = Math.floor((this.macroTableRef.current.props.height - this.macroTableRef.current.props.headerHeight)/ this.macroTableRef.current.props.rowHeight)
        if([undefined, null, 0].includes(nextProps.player.nextCommandIndex)){
          this.macroTableRef.current.scrollToRow(nextProps.player.nextCommandIndex || 0)
        } else { 
          const lastRowVisible = nextProps.player.nextCommandIndex + numberOfVisibleRows - 1
          this.macroTableRef.current.scrollToRow(lastRowVisible)
        }
      }

      if (nextProps.status === C.APP_STATUS.RECORDER &&
          nextProps.editing.commands.length > this.props.editing.commands.length) {

        const numberOfVisibleRows = Math.floor((this.macroTableRef.current.props.height - this.macroTableRef.current.props.headerHeight)/ this.macroTableRef.current.props.rowHeight)
        setTimeout(
          () => {           
            if([undefined, null, 0].includes(nextProps.player.nextCommandIndex)){
              this.macroTableRef.current.scrollToRow(nextProps.player.nextCommandIndex || 0)
            } else { 
              const lastRowVisible = nextProps.player.nextCommandIndex + numberOfVisibleRows - 1
              this.macroTableRef.current.scrollToRow(lastRowVisible)
            }      
          },
          100
        )
      }
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
        'XClick', 'XClickText', 'XClickTextRelative', 'XMoveText', 'XMoveTextRelative', 'XMove', 'XClickRelative', 'XMoveRelative',
        'OCRExtract', 'OCRExtractRelative', 'visionLimitSearchAreaRelative', 'visionLimitSearchAreabyTextRelative'
      ].indexOf(selectedCmd.cmd) !== -1
    })()

    return selectedCmdIsVisualSearch
  }

  commandHasVisionImage (command) {
    if (!this.isSelectedCommandVisualSearch(command)) return false

    const commandsCouldHaveVisionImage = [
      'XClick', 'XClickText', 'XClickTextRelative', 'XClickRelative', 'XMoveText', 'XMoveTextRelative', 'XMove', 'XMoveRelative', 'OCRExtract', 'OCRExtractRelative',
      'visionLimitSearchArea', 'visionLimitSearchAreaRelative', 'visionLimitSearchAreabyTextRelative'
    ]

    if (commandsCouldHaveVisionImage.indexOf(command.cmd) !== -1 && !/\.png/i.test(command.target))  return false
    return true
  }

  selectCommandAndScroll (commandIndex) {
    this.props.selectCommand(commandIndex, true)
    this.props.scrollToCommandAtIndex(commandIndex)
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
    const mw  = 240
    let x     = contextMenu.x + window.scrollX
    let y     = contextMenu.y + window.scrollY

    if (!isNormal) {
      return null
    }

    if (x + mw > dw)   x -= mw

    const style = {
      position: 'absolute',
      top: y,
      left: x,
      display: contextMenu.isShown ? 'block' : 'none'
    }

    const menuStyle = {
      width: mw + 'px'
    }

    const { commandIndex }      = contextMenu
    const isBreakpoint          = this.props.breakpointIndices.indexOf(commandIndex) !== -1
    let target_item
    try {
      target_item = this.props.editing.commands.length !== 0 && commandIndex !== undefined ? this.props.editing.commands[commandIndex]['target'] : '';
    } catch (error) {
      target_item = '';
    }

    const handleClick = (e) => {
      switch (e.key) {
        case 'cut':
          return this.props.cutCommand(commandIndex)
        case 'copy':
          return this.props.copyCommand(commandIndex)
        case 'paste':
          return this.props.pasteCommand(commandIndex)
        case 'insert':
          return this.props.insertCommand(newCommand, commandIndex + 1)
        case 'delete':
          return this.props.removeCommand(commandIndex)
        case 'run_line': {
          return this.playLine(commandIndex)
        }
        case 'play_from_here': {
          const { commands }  = this.props.editing

          this.setState({ lastOperation: 'play' })

          return this.props.playerPlay({
            macroId:    this.props.macroId,
            title:      this.getTestCaseName(),
            extra:      { id: this.props.macroId },
            mode:       Player.C.MODE.STRAIGHT,
            startIndex: commandIndex,
            keepVariables:'reset',
            startUrl:   null,
            resources:  commands,
            postDelay:  this.props.config.playCommandInterval * 1000
          })
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
        case 'add_breakpoint': {
          return this.props.addBreakpoint(this.props.macroId, commandIndex)
        }
        case 'remove_breakpoint': {
          return this.props.removeBreakpoint(this.props.macroId, commandIndex)
        }
        case 'jump_to_source_code': {
          return this.jumpToSourceCode(commandIndex)
        }
        case 'jump_to_image': {
          return this.jumpToImage(commandIndex)
        }
        case 'record_from_here': {
          this.props.setIndexToInsertRecorded(commandIndex + 1)
          this.props.toggleRecorderSkipOpen(true)
          return this.props.startRecording()
        }
      }
    }

    const ctrlKey = isMac() ? '⌘' : 'CTRL-'

    return (
      <div style={style} id="context_menu">
        <Menu onClick={handleClick} style={menuStyle} mode="vertical" selectable={false}
          items={[
             {
              key: "cut",
              label: (
                <>
                  <span>Cut</span>
                  <span className="shortcut">{ctrlKey}X</span>
                </>
              ),
              disabled: !getLicenseService().canPerform(Feature.Edit)              
             },
             {
              key: "copy",
              label: (
                <>
                  <span>Copy</span>
                  <span className="shortcut">{ctrlKey}C</span>
                </>
              ),
              disabled: !getLicenseService().canPerform(Feature.Edit)
             },
              {
                key: "paste",
                label: (
                  <>
                    <span>Paste</span>
                    <span className="shortcut">{ctrlKey}P</span>
                  </>
                ),
                disabled: clipboard.commands.length === 0
              },
              {
                key: "delete",
                label: (
                  <>
                    <span>Delete</span>
                  </>
                ),
                disabled: !getLicenseService().canPerform(Feature.Edit)
              },
              {
                type: 'divider'
              },
              {
                key: "insert",
                label: (
                  <>
                    <span>Insert new line</span>
                  </>
                ),
                disabled: !getLicenseService().canPerform(Feature.Edit)
              },
              {
                type: 'divider'
              },
              {
                key: "jump_to_source_code",
                label: (
                  <>
                    <span>Jump to source code</span>
                  </>
                )
              },
              {
                key: isBreakpoint ? 'remove_breakpoint' : 'add_breakpoint',
                label: (
                  <>
                    <span>{isBreakpoint ? 'Remove breakpoint' : 'Add breakpoint'}</span>
                  </>
                )
              },
              {
                type: 'divider'
              },
              {
                key: "run_line",
                label: (
                  <>
                    <span>Execute this command</span>
                  </>
                )
              },
              {
                key: "play_from_here",
                label: (
                  <>
                    <span>Play from here</span>
                  </>
                )
              },
              {
                key: "play_from_here_keep_variables",
                label: (
                  <>
                    <span>Play from here and keep variables</span>
                  </>
                )
              },
              {
                key: "play_to_here",
                label: (
                  <>
                    <span>Play to this point</span>
                  </>
                )
              },
              {
                key: "record_from_here",
                label: (
                  <>
                    <span>Record from here</span>
                  </>
                ),
                disabled: !getLicenseService().canPerform(Feature.Record)
              },
              {
                key: "jump_to_image",
                label: (
                  <>
                    <span>Jump to image</span>
                  </>
                ),
                disabled: target_item.indexOf('.png') === -1
              }
          ]}
        />         
        {/* <Menu onClick={handleClick} style={menuStyle} mode="vertical" selectable={false}>
          <Menu.Item
            key="cut"
            disabled={!getLicenseService().canPerform(Feature.Edit)}
          >
            <span>Cut</span>
            <span className="shortcut">{ctrlKey}X</span>
          </Menu.Item>
          <Menu.Item
            key="copy"
            disabled={!getLicenseService().canPerform(Feature.Edit)}
          >
            <span>Copy</span>
            <span className="shortcut">{ctrlKey}C</span>
          </Menu.Item>
          <Menu.Item
            key="paste"
            disabled={clipboard.commands.length === 0}
          >
            <span>Paste</span>
            <span className="shortcut">{ctrlKey}P</span>
          </Menu.Item>
          <Menu.Item
            key="delete"
            disabled={!getLicenseService().canPerform(Feature.Edit)}
          >
            <span>Delete</span>
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            key="insert"
            disabled={!getLicenseService().canPerform(Feature.Edit)}
          >
            Insert new line
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item key="jump_to_source_code">Jump to source code</Menu.Item>
          <Menu.Item key={isBreakpoint ? 'remove_breakpoint' : 'add_breakpoint'}>
            {isBreakpoint ? 'Remove breakpoint' : 'Add breakpoint'}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item key="run_line">Execute this command</Menu.Item>
          <Menu.Item key="play_from_here">Play from here</Menu.Item>
          <Menu.Item key="play_from_here_keep_variables">Play from here and keep variables</Menu.Item>
          <Menu.Item key="play_to_here">Play to this point</Menu.Item>
          <Menu.Item
            key="record_from_here"
            disabled={!getLicenseService().canPerform(Feature.Record)}
          >
            Record from here
          </Menu.Item>
          {target_item.indexOf('.png') !== -1 ? (
            <Menu.Item key="jump_to_image">Jump to image</Menu.Item>
          ) : (
            <Menu.Item key="jump_to_image" disabled>
            Jump to image
          </Menu.Item>

          )}

        </Menu>  */}
      </div>
    )
  }

  renderTargetEditor () {
    const { status, editing, config, ui }   = this.props
    const { commands, meta }    = editing
    const { selectedIndex }     = meta

    const isPlayerStopped = this.isPlayerStopped()
    const dataSource    = commands && commands.length ? commands : defaultDataSource
    const selectedCmd   = dataSource[selectedIndex]
    const isCmdEditable = isPlayerStopped && !!selectedCmd

    if (!isCmdEditable || !this.state.targetEditor.visible) {
      return null
    }

    return (
      <div className="target-full-editor">
        <div className="mask"></div>
        <Button
          shape="circle"
          icon="close"
          className="close-button"
          onClick={() => {
            this.setState({
              targetEditor: {
                visible: false,
                text: ''
              }
            })
          }}
        />
        <CodeMirror
          value={this.state.targetEditor.text}
          onChange={(editor, _, text) => {
            this.onDetailChange('target', text)
          }}
          onCursor={(editor, data) => {
            // this.setState({ cmEdtiorInstance: editor })
            // // Note: when value updated, code mirror will automatically emit onCursor with cursor at bottom
            // // It can be tell with `sticky` as null
            // if (data.sticky) {
            //   this.setState({ cursor: { line: data.line, ch: data.ch } })
            // }
          }}
          onFocus={() => {
            this.props.updateUI({ focusArea: FocusArea.CodeSource })
          }}
          options={{
            mode: { name: 'javascript', json: true },
            lineNumbers: true,
            matchBrackets: true,
            autoCloseBrackets: true
          }}
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

  headerRenderer = ({
    dataKey,
    label
  }) => {
    return (
      <React.Fragment key={dataKey}>
        <div className="ReactVirtualized__Table__headerTruncatedText">
          {label}
        </div>
        <Draggable
          axis="x"
          defaultClassName="DragHandle"
          defaultClassNameDragging="DragHandleActive"
          onDrag={(event, { deltaX }) =>
            this.resizeColumnWidth({
              dataKey,
              deltaX
            })
          }
          position={{ x: 0 }}
          zIndex={999}
        >
          <span className="DragHandleIcon">⋮</span>
        </Draggable>
      </React.Fragment>
    );
  };

  resizeColumnWidth = ({ dataKey, deltaX }) => {
    this.setState(prevState => {
      const prevWidths = prevState.columnWidths
      const percentDelta = deltaX / (this.state.tableWidth - this.state.columnWidths.serialFixed - this.state.columnWidths.opsFixed)

      // cmd, target, value, ops
      let nextDataKey

      switch (dataKey) {
        case 'cmd':
          nextDataKey = 'target'
          break
        case 'target':
          nextDataKey = 'value'
          break
        case 'value':
          nextDataKey = 'ops'
          break
          default:
            nextDataKey = 'target';
      }

      let columnWidths = {
        ...prevWidths,
        [dataKey]: prevWidths[dataKey] + percentDelta,
        [nextDataKey]: prevWidths[nextDataKey] - percentDelta
      }

      return {
        columnWidths
      };
    });
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
            ref={this.macroTableRef} 
            width={tableWidth}
            height= {tableHeight}
            className='command-table'
            headerHeight={ITEM_HEIGHT}
            rowHeight={ITEM_HEIGHT}
            rowCount={dataSource.length + 1}
            rowGetter={({ index }) => dataSource[index] || { key: index }}
            rowClassName ={({index}) => (index === -1 || index >= dataSource.length  ) ? '' : `command-row real-command ` + this.commandClassName(dataSource[index], index)}

            rowRenderer={({ key, index, style }) => {
              const item = dataSource[index]
              const Footer = (
                <div
                key="footer" 
                className="command-row footer-row" 
                style={{ 
                  top: index * itemHeight            
                }}
                onClick={() => {
                  if (!getLicenseService().canPerform(Feature.Edit)) {
                    return
                  }
                  this.props.updateUI({ focusArea: FocusArea.CommandTable })
                  this.props.insertCommand(newCommand, commands.length)
                }}
                >
                Add
              </div>
              )

              if(index === dataSource.length) {
                return Footer
              }            
              
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
              headerRenderer={this.headerRenderer}
              dataKey="cmd"
              label="Command"
              width={columnWidths.cmd * tableWidth * headerWidthPatchFactor}
            />  
            <Column
              headerRenderer={this.headerRenderer}
              dataKey="target"
              label="Target"
              width={columnWidths.target * tableWidth * headerWidthPatchFactor}
            />  
            <Column
              dataKey="value"
              label="Value"
              width={columnWidths.value * tableWidth * headerWidthPatchFactor}
            />
            <Column
              dataKey="ops"
              label="Ops"
              width={columnWidths.opsFixed + 20}
            /> 
          </RcvTable>
        )}
      </div>
    )
  }
 

  renderNormalTable (dataSource) {
    const { editing, player, doneCommandIndices, errorCommandIndices } = this.props
    const { nextCommandIndex } = player
    const { commands }  = editing
    const editable      = this.isPlayerStopped()

    const columns = [
      { title: '',         dataIndex: 'serial',   key: 'serial',  width: 40 },
      { title: 'Command',  dataIndex: 'cmd',      key: 'cmd',     width: 130 },
      { title: 'Target',   dataIndex: 'target',   key: 'target',  width: 250, ellipsis: true },
      { title: 'Value',    dataIndex: 'value',    key: 'value',   ellipsis: true },
      {
        title: 'Ops',
        key: 'ops',
        width: 80,
        render: (text, record, index) => {
          return (
            <div>
              <Button
                disabled={!editable}
                size='small'
                shape="circle"
                onClick={(e) => { this.props.removeCommand(index); e.stopPropagation() }}
                icon={<div>//</div>}
              >                
              </Button>
              <Button
                disabled={!editable}
                size='small'
                shape="circle"
                onClick={(e) => { this.props.duplicateCommand(index); e.stopPropagation() }}
              >
                <PlusOutlined />
              </Button>
            </div>
          )
        }
      }
    ]

    const tableConfig = {
      dataSource,
      columns,
      pagination: false,
      footer: () => (
        <div className="table-footer" onClick={(e) => {
          if (!getLicenseService().canPerform(Feature.Edit)) {
            return
          }

          this.props.insertCommand(newCommand, commands.length)
        }}>
          Add
        </div>
      ),
      onRowClick: (record, index, e) => {
        this.props.selectCommand(index)
      },
      rowClassName: this.commandClassName
    }

    return <Table {...tableConfig} />
  }

  render () {
    const { status, editing, config, ui }   = this.props
    const { commands, meta }    = editing
    const { selectedIndex }     = meta

    const isPlayerStopped = this.isPlayerStopped()
    const dataSource    = commands && commands.length ? commands : defaultDataSource
    const selectedCmd   = dataSource[selectedIndex]
    const editable      = isPlayerStopped && !!selectedCmd
    const isCmdEditable = editable && getLicenseService().canPerform(Feature.Edit)
    const isInspecting  = status === C.APP_STATUS.INSPECTOR

    const selectedCmdIsVisualSearch = this.isSelectedCommandVisualSearch()

    const isSelectEnabled = selectedCmd && selectedCmd.cmd && canCommandSelect(selectedCmd.cmd)
    const isFindEnabled = selectedCmd && selectedCmd.cmd && canCommandFind(selectedCmd.cmd)

    const shouldUseSelectInputForTarget = selectedCmd && selectedCmd.targetOptions && selectedCmd.targetOptions.length  && doesCommandSupportTargetOptions(selectedCmd.cmd)
    const shouldUseTextareaForTarget    = selectedCmd && ['executeScript', 'executeScript_Sandbox', 'aiPrompt', 'aiScreenXY', 'aiComputerUse'].indexOf(selectedCmd.cmd) !== -1
    const shouldUseNormalInputForTarget = !shouldUseSelectInputForTarget && !shouldUseTextareaForTarget

    return (
      <div className="editor-wrapper">
        <div className="tabs-wrapper">
          <Tabs
            type="card"
            className={cn('commands-view', { 'target-as-textarea': shouldUseTextareaForTarget })}
            activeKey={this.props.editor.activeTab}
            onChange={this.onChangeCommandsView}
            // defaultActiveKey="1"
            items={[
              {
                label: 'Table View',
                key: 'table_view',
                children: (
                  <>
                    <div className={`form-group table-wrapper ${this.needVirtualList() ? 'rcv-table-wrapper' : ''}` } style={{ marginBottom: 0 }} ref={ref => { this.listContainer = ref }}>
                      {this.renderTable()}
                    </div>

                    <div className="form-group fields-wrapper" style={{ marginBottom: 0 }}>
                      <Form>
                        <Form.Item label="Command" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                          <div className="flex-row" ref={this.cmdInputRef}>
                            <Select
                              
                              showSearch
                              optionFilterProp="children"
                              placeholder="command"
                              disabled={!isCmdEditable}
                              value={selectedCmd && selectedCmd.cmd}
                              onChange={(value) => this.onDetailChange('cmd', value)}
                              onKeyDown={(e) => {
                                const input = this.cmdInputRef.current.querySelector('input')
                                if(/^[a-zA-Z0-9]$/.test(e.key)) {
                                  this.setState({ userInputCmdValue: input.value + e.key })
                                }                             
                              }}
                              onBlur={() => { 
                                let value = this.state.userInputCmdValue
                                if (value && value.length > 0) {
                                  const command = availableCommands.find(cmd => cmd.toLowerCase() === value.trim().toLowerCase())
                                  if (command) {
                                    this.onDetailChange('cmd', command)
                                  }
                                }
                                this.setState({ userInputCmdValue: '' })
                              }}
                              filterOption={(input, {key}) => key.toLowerCase().indexOf(input.toLowerCase()) !== -1}
                              style={{ flex: 1, maxWidth: '60%', marginRight: '10px' }}
                              size="default"
                            >
                              {(isCVTypeForDesktop(config.cvScope) ? availableCommandsForDesktop : availableCommands).map(cmd => (
                                <Select.Option value={cmd} key={cmd}>
                                  {commandText(cmd)}
                                </Select.Option>
                              ))}
                            </Select>
                            <div style={{
                              flex: 0.6,
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}>
                              {selectedCmd && selectedCmd.cmd ? (
                                <a
                                  style={{ marginRight: '10px', whiteSpace: 'nowrap' }}
                                  href={`https://goto.ui.vision/x/idehelp?cmd=${selectedCmd.cmd.toLowerCase()}`}
                                  target="_blank"
                                >
                                  Info for this command
                                </a>
                              ) : <span></span>}
                              <Button
                                style={{ padding: '0 10px' }}
                                title="Toggle comment"
                                disabled={!isCmdEditable}
                                onClick={() => {
                                  this.props.toggleCommentOnSelectedCommand()
                                }}
                              >
                                //
                              </Button>
                            </div>
                          </div>
                        </Form.Item>
                        <Form.Item label="Target" className="target-row" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                          <div className="flex-row">
                            {shouldUseNormalInputForTarget ? (
                              <Input
                                style={{ flex: 1, maxWidth: '60%', marginRight: '10px' }}
                                placeholder="target"
                                disabled={!isCmdEditable}
                                value={selectedCmd && selectedCmd.target}
                                onChange={(e) => this.onDetailChange('target', e.target.value)}
                                size="default"
                              />
                            ) : null}

                            {shouldUseSelectInputForTarget ? (
                              <SelectInput
                                disabled={!isCmdEditable}
                                getId={(str) => str}
                                stringifyOption={(str) => str}
                                value={selectedCmd.target}
                                options={selectedCmd.targetOptions}
                                onChange={(val) => this.onDetailChange('target', val)}
                              />
                            ) : null}

                            {shouldUseTextareaForTarget ? (
                              <div className="textarea-wrapper">
                                <Input.TextArea
                                  rows={2}
                                  placeholder="target"
                                  disabled={!isCmdEditable}
                                  value={selectedCmd && selectedCmd.target}
                                  onChange={(e) => this.onDetailChange('target', e.target.value)}
                                  size="default"
                                />

                                <DoubleRightOutlined
                                  type="arrows-alt"
                                  className="open-full-editor"
                                  title="Open full editor"
                                  onClick={() => {
                                    this.setState({
                                      targetEditor: {
                                        visible: true,
                                        text: selectedCmd.target
                                      }
                                    })
                                  }}
                                />
                              </div>
                            ) : null}

                            <Button
                              disabled={!isCmdEditable || !isSelectEnabled}
                              onClick={this.onToggleSelect}
                            >
                              {isInspecting
                                ? (<span>{(selectedCmdIsVisualSearch ? '👁' : '') + 'Cancel'}</span>)
                                : (<span>{(selectedCmdIsVisualSearch ? '👁' : '') + 'Select'}</span>)
                              }
                            </Button>
                            <Button
                              disabled={!editable || !isFindEnabled}
                              onClick={this.onClickFind}
                            >
                              {(selectedCmdIsVisualSearch ? '👁' : '') + 'Find'}
                            </Button>
                          </div>
                        </Form.Item>
                        <Form.Item label="Value" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                          <Input
                            disabled={!isCmdEditable}
                            value={selectedCmd && selectedCmd.value}
                            onChange={(e) => this.onDetailChange('value', e.target.value)}
                            style={{ width: '100%' }}
                            placeholder="value"
                            size="default"
                          />
                        </Form.Item>
                        <Form.Item label="Description" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} style={{ marginBottom: 0 }}>
                          <Input
                            disabled={!isCmdEditable}
                            value={selectedCmd && selectedCmd.description}
                            onChange={(e) => this.onDetailChange('description', e.target.value)}
                            style={{ width: '100%' }}
                            placeholder="description"
                            size="default"
                          />
                        </Form.Item>
                      </Form>
                    </div>
                  </>
                )
              },
              {
                label: 'Source View (JSON)',
                key: 'source_view',
                className: "source-view",
                children: (
                  <>
                    <pre className="source-error">{this.props.sourceErrMsg}</pre>
                    {/*
                      Note: have to use UnControlled CodeMirror, and thus have to use two state :
                            sourceText and sourceTextModified
                    */}
                    <CodeMirror
                      ref={this.codeMirrorRef}
                      className={this.props.sourceErrMsg ? 'has-error' : 'no-error'}
                      value={this.props.sourceText}
                      onChange={this.onChangeEditSource}
                      onBlur={this.onSourceBlur}
                      onCursor={(editor, data) => {
                        this.setState({ cmEdtiorInstance: editor })
                        // Note: when value updated, code mirror will automatically emit onCursor with cursor at bottom
                        // It can be tell with `sticky` as null
                        if (data.sticky) {
                          this.setState({ cursor: { line: data.line, ch: data.ch } })
                        }
                      }}
                      onFocus={() => {
                        this.props.updateUI({ focusArea: FocusArea.CodeSource })
                      }}
                      options={{
                        mode: { name: 'javascript', json: true },
                        lineNumbers: true,
                        matchBrackets: true,
                        autoCloseBrackets: true,
                        readOnly: !getLicenseService().canPerform(Feature.Edit)                        
                      }}
                    />                  
                  </>
                )
              }
            
            ]}
          >
          </Tabs>

          {(isCVTypeForDesktop(config.cvScope) && ui.shouldEnableDesktopAutomation !== false) || ui.shouldEnableDesktopAutomation === true ? (
            <div
              className="vision-type"
              onClick={() => {
                this.props.updateUI({ showSettings: true, settingsTab: 'vision' })
              }}
            >
              <ComputerSvg />
              <span>Desktop mode</span>
            </div>
          ) : <div
              className="vision-type"
              onClick={() => {
                this.props.updateUI({ showSettings: true, settingsTab: 'vision' })
              }}
            >
              <BrowserSvg />
            <span>Browser mode</span>
        </div>}
        </div>
 
        {this.renderContextMenu()}
        {this.renderVisionFindPreview()}
        {/* ud: why do we need renderTargetEditor? */}
        {this.renderTargetEditor()}
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
)(DashboardEditor)
