import React from 'react'
import LocalExecutionIcon from './local_execution_icon'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { renderLogType } from '@/common/macro_log'
import { openSettings } from '@/ext/common/tab'
import { goUivUrl } from '@/common/uiv_link'

// The log list itself, extracted from the former Logs tab so the same view
// can render in two places: the Data tab (full height) and the collapsible
// Logs/Variables panel docked in the Macro tab (small live view during a run)
class LogList extends React.Component {
  $list = null

  logStyle (log) {
    // this comes from 'aiComputerUse'
    if (log.type === 'a') {
      return { color: 'green' }
    }

    if (log.options && log.options.color) {
      return { color: log.options.color }
    }

    if (log.options && log.options.ignored) {
      return { color: 'orange' }
    }
  }

  shouldRenderLogStack (log) {
    if (log.stack.length <= 1) {
      return false
    }

    switch (log.type) {
      case 'error':
      case 'warning':
        return true

      case 'status':
        return /^Running/.test(log.text)

      default:
        return false
    }
  }

  renderLogStack (log) {
    // Don't care about the top element in stack
    const stack = log.stack.slice(0, -1).reverse()

    if (stack.length === 0) {
      return null
    }

    return (
      <div style={{ marginLeft: '80px' }}>
        {stack.map((item, i) => (
          <div key={i}>
            At <a
              href="#"
              onClick={e => {
                e.preventDefault()

                if (typeof item.commandIndex === 'number' && item.macroId) {
                  this.props.gotoLineInMacro(
                    item.macroId,
                    item.commandIndex
                  )
                }
              }}
            >
              Line {item.commandIndex + 1} in {item.macroName}
            </a>
          </div>
        ))}
      </div>
    )
  }

  logLinkPatterns = [
    [/Error #101/i, 'https://go.ui.vision/?help=error101'],
	[/Error #120/i, 'https://go.ui.vision/?help=error120'],
	[/Error #121/i, 'https://go.ui.vision/?help=error121'],
	[/Error #170/i, 'https://go.ui.vision/?help=error179'],
	[/Error #220/i, 'https://go.ui.vision/?help=error220']
  ]

  appendLinkIfPatternMatched (text) {
    const linksToAdd = []

    this.logLinkPatterns.forEach((item) => {
      const [patternReg, link, anchorText = '(more info)'] = item

      if (patternReg.test(text)) {
        linksToAdd.push(
          <a href={link} class="info" target="_blank" style={{ marginLeft: '8px' }}>{anchorText}</a>
        )
      }
    })

    if (linksToAdd.length === 0) {
      return text
    }

    return (
      <span>
        <span>{text}</span>
        {linksToAdd}
      </span>
    )
  }

  renderLogText (log) {
    if (typeof log.text === 'function') {
      return log.text({ renderText: this.renderLogText.bind(this) })
    }

    if (['error', 'warning'].indexOf(log.type) === -1) {
      return log.text
    }

    const content = (() => {
      // A command needed the native module and it is not there. Explain WHY
      // and hand the user the direct download for THEIR OS plus a read-more —
      // the raw connect error ("Specified native messaging host not found")
      // explains nothing.
      if (/(XModule|xFile) is not installed yet|Specified native messaging host not found|native messaging host/i.test(log.text)) {
        const os = /windows/i.test(navigator.userAgent) ? 'win'
          : /mac/i.test(navigator.userAgent) ? 'mac' : 'linux'
        const osName = { win: 'Windows', mac: 'macOS', linux: 'Linux' }[os]
        return (
          <span>
            <span>{log.text}</span>
            <span style={{ display: 'block', marginTop: '4px' }}>
              This command controls the real mouse/keyboard or reads the screen, which a browser
              extension cannot do alone — it needs the free Desktop Automation module (a small
              native helper) installed once.{' '}
              <a
                href={goUivUrl(`https://go.ui.vision/?help=desktop_${os}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download for {osName}
              </a>
              {' · '}
              <a
                href={goUivUrl('https://go.ui.vision/?help=desktop_readmore')}
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more
              </a>
              {' · '}
              <a
                href="#"
                onClick={e => {
                  e.preventDefault()
                  openSettings('desktop-automation')
                }}
              >
                Settings
              </a>
            </span>
          </span>
        )
      }

      if (/OCR feature disabled/.test(log.text)) {
        return (
          <span>
            <span>OCR feature disabled. Please enable it in the </span>
            <a
              href="#"
              onClick={e => {
                e.preventDefault()
                openSettings('ocr')
              }}
            >
              OCR Settings
            </a>
          </span>
        )
      }

      return this.appendLinkIfPatternMatched(log.text)
    })()

    // JS script failure with a known line (options.scriptJump from the
    // script runner): render a link that opens the macro and reveals the line
    const jump = log.options && log.options.scriptJump
    const jumpLink = (jump && typeof jump.line === 'number') ? (
      <a
        href="#"
        style={{ marginLeft: '8px' }}
        onClick={e => {
          e.preventDefault()
          this.props.gotoScriptLineInMacro(jump.macroId, jump.line)
        }}
      >
        Jump to line {jump.line}
      </a>
    ) : null

    const stack = log.stack || []
    const source = stack[stack.length - 1]

    if (!source) {
      return jumpLink ? <span>{content}{jumpLink}</span> : content
    }

    return (
      <span>
        <a
          href="#"
          onClick={e => {
            e.preventDefault()

            if (typeof source.commandIndex === 'number' && source.macroId) {
              this.props.gotoLineInMacro(
                source.macroId,
                source.commandIndex
              )
            }
          }}
        >
          <span>Line {source.commandIndex + 1}</span>
          {!source.isSubroutine ? null : (
            <span> (Sub: {source.macroName})</span>
          )}
        </a>
        <span>: </span>
        { content }
        { jumpLink }
      </span>
    )
  }

  scrollToLatest () {
    if (!this.$list) return

    // wait until the new entry is rendered; 'nearest' keeps the outer page
    // from jumping when the list is already fully visible
    setTimeout(() => {
      if (!this.$list) return
      const $last = this.$list.children[this.$list.children.length - 1]
      if ($last) {
        $last.scrollIntoView({ block: 'nearest' })
      }
    }, 100)
  }

  componentDidMount () {
    this.scrollToLatest()
  }

  componentDidUpdate (prevProps) {
    if (prevProps.logs.length !== this.props.logs.length) {
      this.scrollToLatest()
    }
  }

  render () {
    const filters = {
      'All':    () => true,
      'Echo':   (item) => item.type === 'echo' || (item.type === 'error' && (!item.options || !item.options.ignored)),
      'Echo_And_Status':   (item) => item.type === 'echo' || (item.type === 'error' && (!item.options || !item.options.ignored)) || item.type === 'status',
      'Error':  (item) => item.type === 'error' || item.type === 'report',
      'None':   () => false
    }
    const logFilter = this.props.config.logFilter || 'All'
    const logs      = this.props.logs.filter(filters[logFilter] || (() => true));

    if (!logs.length) {
      return (
        <div>
          <div className="no-data">(empty)</div>
        </div>
      )
    }

    return (
      <ul className="log-content" ref={el => { this.$list = el }}>
        {logs.map((log, i) => (
          <li className={log.type} key={log.id} style={this.logStyle(log)}>
            <span className="log-type">{renderLogType(log)}</span>
            <pre className="log-detail">{log.options && log.options.localExecution ? <LocalExecutionIcon /> : null}{this.renderLogText(log)}</pre>
            {this.shouldRenderLogStack(log) ? this.renderLogStack(log) : null}
          </li>
        ))}
      </ul>
    )
  }
}

export default connect(
  state => ({
    logs: state.logs,
    config: state.config
  }),
  dispatch => bindActionCreators({ ...actions, ...simpleActions }, dispatch)
)(LogList)
