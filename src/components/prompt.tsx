import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { Modal, Input } from 'antd'

type PromptProps = {
  width?:           number;
  title?:           string;
  message:         string;
  keepOpenOnError?: boolean;
  value?:          string;
  selectionStart?: number;
  selectionEnd?:   number;
  placeholder?:    string;
  noInput?:        boolean;
  inputType?:      string;
  closable?:       boolean;
  okText?:          string;
  cancelText?:      string;
  onOk?:            (str: string) => Promise<boolean>;
  onCancel?:        () => Promise<boolean>;
}

type State = {
  value:    string;
  visible:  boolean;
}

export class Prompt extends React.Component<Required<PromptProps>, State> {
  static propTypes = {
    onOk:           PropTypes.func.isRequired,
    onCancel:       PropTypes.func.isRequired,
    title:          PropTypes.string,
    width:          PropTypes.number,
    message:        PropTypes.string,
    value:          PropTypes.string,
    noInput:        PropTypes.bool,
    inputType:      PropTypes.string,
    selectionStart: PropTypes.number,
    selectionEnd:   PropTypes.number,
    placeholder:    PropTypes.string,
    okText:         PropTypes.string,
    cancelText:     PropTypes.string,
    keepOpenOnError: PropTypes.bool
  }

  static defaultProps = {
    width:       350,
    title:       'Please input',
    message:     '',
    value:       '',
    placeholder: '',
    selectionStart: 0,
    selectionEnd: 0,
    noInput:     false,
    closable:    true,
    inputType:   'text',
    okText:      'Confirm',
    cancelText:  'Cancel',
    keepOpenOnError: false
  }

  state: State = {
    value: '',
    visible: true
  }

  onOk = () => {
    return this.props.onOk(this.state.value)
    .then(() => this.hide())
  }

  onCancel = () => {
    return this.props.onCancel()
    .then(() => this.hide())
  }

  componentDidMount () {
    this.setState({ value: this.props.value })
    setTimeout(() => this.focus(), 200)
  }

  componentWillReceiveProps (newProps: Required<PromptProps>) {
    if (newProps.value !== this.props.value) {
      this.setState({ value: newProps.value })
      setTimeout(() => this.focus(), 100)
    }
  }

  focus () {
    const input = (this as any).input
    if (input) {
      const $input = input.input
      $input.focus()

      if (this.props.inputType === 'text') {
        $input.selectionStart = this.props.selectionStart !== undefined ? this.props.selectionStart : 0
        $input.selectionEnd   = this.props.selectionEnd !== undefined ? this.props.selectionEnd : $input.value.length
      }
    }
  }

  hide () {
    this.setState({ visible: false })
  }

  render () {
    return (
      <Modal
        ref={ref => { (this as any).modal = ref }}
        open={this.state.visible}
        align={'left'}
        title={this.props.title}
        width={this.props.width}
        closable={this.props.closable}
        maskClosable={this.props.closable}
        okText={this.props.okText}
        cancelText={this.props.cancelText}
        onOk={this.onOk}
        onCancel={this.onCancel}
      >
        {this.props.message && this.props.message.length ? (
          <pre
            style={{
              fontFamily: 'inherit',
              marginBottom: '10px',
              whiteSpace: 'pre-wrap'
            }}
          >{this.props.message}</pre>
        ) : null}

        {this.props.noInput ? null : (
          <Input
            defaultValue=""
            ref={ref => (this as any).input = ref}
            type={this.props.inputType}
            autosize={false}
            placeholder={this.props.placeholder}
            value={this.state.value}
            onChange={e => this.setState({ value: e.target.value })}
            onKeyDown={e => {
              if ((e as any).keyCode === 13) this.onOk()
            }}
          />
        )}
      </Modal>
    )
  }
}

export function prompt (props: PromptProps): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const wrappedProps: PromptProps = {
      ...props,
      onOk: (str: string) => {
        const go = () => {
          resolve(str)
          destroy()
          return Promise.resolve(true)
        }

        return new Promise(resolve => {
          resolve(props.onOk ? props.onOk(str) : true)
        })
        .then(
          go,
          (e: Error) => {
            if (props.keepOpenOnError) {
              return Promise.reject(e)
            }

            reject(e)
            return true
          }
        )
      },
      onCancel: () => {
        const go = () => {
          resolve(null)
          destroy()
          return Promise.resolve(true)
        }

        return new Promise(resolve => {
          resolve(props.onCancel ? props.onCancel() : true)
        })
        .then(
          go,
          (e: Error) => {
            if (props.keepOpenOnError) {
              return Promise.reject(e)
            }

            reject(e)
            return true
          }
        )
      }
    }

    const $root   = document.createElement('div')
    const $el     = document.createElement('div')
    const destroy = () => setTimeout(() => {
      $root.remove()
    }, 1000)

    document.body.appendChild($root)
    $root.appendChild($el)

    ReactDOM.render(
      <Prompt {...wrappedProps} />,
      $el
    )
  })
}
