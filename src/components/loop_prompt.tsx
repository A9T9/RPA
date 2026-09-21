import React from 'react'
import ReactDOM from 'react-dom'
import { Modal, Input } from 'antd'

// "Play loop.." dialog with the classic start/max pair, restored 2026-08
// (forum request): the single "How many loops?" count had lost the
// resume-a-CSV-job workflow. !LOOP is the player's loopsCursor — an absolute
// round number — so starting at N replays CSV row N onward; users check the
// log for the last finished row and restart from there instead of deleting
// completed rows from the CSV.
//
// The last used max value is remembered (a run of 50-loop sessions should
// not retype 50 every time); the start value always resets to 1 — resuming
// mid-job is per-incident, a sticky start value would silently skip rows.

export type LoopRange = { from: number, to: number }

const LAST_LOOP_COUNT_KEY = 'uiv_last_loop_count'

const getLastLoopCount = (): string => {
  try {
    const v = parseInt(window.localStorage.getItem(LAST_LOOP_COUNT_KEY) as string, 10)
    return isFinite(v) && v >= 1 ? String(v) : '2'
  } catch (e) { return '2' }
}

const setLastLoopCount = (n: number): void => {
  try { window.localStorage.setItem(LAST_LOOP_COUNT_KEY, String(n)) } catch (e) { /* best effort */ }
}

type PromptState = {
  visible: boolean
  from: string
  to: string
  error: string | null
}

type PromptProps = {
  defaultTo: string
  onDone: (range: LoopRange | null) => void
}

class LoopPrompt extends React.Component<PromptProps, PromptState> {
  toInput: any = null

  state: PromptState = {
    visible: true,
    from: '1',
    to: this.props.defaultTo,
    error: null
  }

  componentDidMount () {
    // focus the max field with its value selected — the common case is still
    // "run N loops": leave From at 1, type the count, Enter
    setTimeout(() => {
      const $input = this.toInput && this.toInput.input
      if ($input) {
        $input.focus()
        $input.select()
      }
    }, 200)
  }

  onOk = () => {
    const from = parseInt(this.state.from, 10)
    const to = parseInt(this.state.to, 10)

    if (isNaN(from) || from < 1) {
      return this.setState({ error: `Invalid start value: '${this.state.from}' — must be a whole number of at least 1` })
    }
    if (isNaN(to) || to < from) {
      return this.setState({ error: `Invalid max value: '${this.state.to}' — must be a whole number of at least ${from} (the start value)` })
    }

    setLastLoopCount(to)
    this.setState({ visible: false })
    this.props.onDone({ from, to })
  }

  onCancel = () => {
    this.setState({ visible: false })
    this.props.onDone(null)
  }

  render () {
    const row = { display: 'flex', alignItems: 'center', marginBottom: '10px' } as const
    const label = { width: '150px', flexShrink: 0 } as const

    return (
      <Modal
        open={this.state.visible}
        title="Play loop"
        width={400}
        okText="Play"
        cancelText="Cancel"
        onOk={this.onOk}
        onCancel={this.onCancel}
      >
        <div style={row}>
          <span style={label}>From (start value):</span>
          <Input
            type="number"
            min={1}
            value={this.state.from}
            onChange={e => this.setState({ from: e.target.value, error: null })}
            onKeyDown={e => { if ((e as any).keyCode === 13) this.onOk() }}
          />
        </div>
        <div style={row}>
          <span style={label}>To (max value):</span>
          <Input
            type="number"
            min={1}
            ref={ref => { this.toInput = ref }}
            value={this.state.to}
            onChange={e => this.setState({ to: e.target.value, error: null })}
            onKeyDown={e => { if ((e as any).keyCode === 13) this.onOk() }}
          />
        </div>
        <p style={{ marginBottom: this.state.error ? '10px' : 0, color: '#888' }}>
          The loop counter ${'{!LOOP}'} runs from the start value to the max
          value — start above 1 to resume an interrupted job (e.g. from a CSV
          row).
        </p>
        {this.state.error ? (
          <p style={{ color: '#d4380d', marginBottom: 0 }}>{this.state.error}</p>
        ) : null}
      </Modal>
    )
  }
}

// Resolves with the validated range, or null when cancelled.
export function promptLoopRange (): Promise<LoopRange | null> {
  return new Promise(resolve => {
    const $root = document.createElement('div')
    const $el = document.createElement('div')
    document.body.appendChild($root)
    $root.appendChild($el)

    const onDone = (range: LoopRange | null) => {
      // let the modal close animation play before unmounting
      setTimeout(() => { $root.remove() }, 1000)
      resolve(range)
    }

    ReactDOM.render(<LoopPrompt defaultTo={getLastLoopCount()} onDone={onDone} />, $el)
  })
}
