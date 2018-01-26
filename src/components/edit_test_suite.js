import React from 'react'
import PropTypes from 'prop-types'
import { Modal } from 'antd'
import { UnControlled as CodeMirror } from 'react-codemirror2'
import 'codemirror/lib/codemirror'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/lib/codemirror.css'

export default class EditTestSuite extends React.Component {
  static propTypes = {
    value:    PropTypes.string.isRequired,
    onClose:  PropTypes.func.isRequired,
    visible:  PropTypes.bool,
    validate: PropTypes.func,
    onChange: PropTypes.func
  }

  static defaultProps = {
    visible: false,
    validate: () => true,
    onChange: () => {}
  }

  state = {
    value: '',
    valueModified: null,
    errMsg: null,
  }

  onSave = () => {
    let errMsg = null

    try {
      this.props.validate(this.state.valueModified)
      this.props.onChange(this.state.valueModified)
    } catch (e) {
      errMsg = e.message
    } finally {
      this.setState({ errMsg })
    }
  }

  componentDidMount () {
    this.setState({
      value: this.props.value,
      valueModified: this.props.value
    })
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.value !== this.props.value) {
      this.setState({
        value: nextProps.value,
        valueModified: nextProps.value
      })
    }
  }

  render () {
    return (
      <Modal
        visible={this.props.visible}
        okText="Save"
        onOk={this.onSave}
        onCancel={this.props.onClose}
        width="80%"
      >
        <pre style={{ color: 'red', lineHeight: '18px', marginBottom: '10px'}}>{this.state.errMsg}</pre>
        {/*
          Note: have to use UnControlled CodeMirror, and thus have to use two state :
                sourceText and sourceTextModified
        */}
        <CodeMirror
          className={this.state.sourceErrMsg ? 'has-error' : 'no-error'}
          value={this.state.value}
          onChange={(editor, data, text) => this.setState({ valueModified: text })}
          options={{
            mode: { name: 'javascript', json: true },
            lineNumbers: true,
            matchBrackets: true,
            autoCloseBrackets: true
          }}
        />
      </Modal>
    )
  }
}