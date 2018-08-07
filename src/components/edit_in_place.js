import React from 'react'
import { Input, Icon } from 'antd'
import PropTypes from 'prop-types'

export default class EditInPlace extends React.Component {
  static propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    checkValue: PropTypes.func.isRequired,
    getSelection: PropTypes.func
  }

  static defaultProps = {
    getSelection: () => null
  }

  state = {
    isEditing: false,
    value: ''
  }

  edit = () => {
    this.setState({ isEditing: true })
    setTimeout(() => {
      const $input = this.$input && this.$input.refs && this.$input.refs.input

      if ($input) {
        $input.focus()

        const selection       = this.props.getSelection(this.state.value, $input)
        $input.selectionStart = selection ? selection.start : 0
        $input.selectionEnd   = selection ? selection.end : $input.value.length
      }
    }, 100)
  }

  submit = () => {
    this.props.checkValue(this.state.value)
    .then(pass => {
      if (pass) {
        this.setState({ isEditing: false })
        this.props.onChange(this.state.value)
      }
    })
  }

  reset = () => {
    this.setState({
      isEditing: false,
      value: this.props.value
    })
  }

  componentDidMount () {
    this.setState({
      value: this.props.value
    })
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.value !== this.props.value) {
      this.setState({ value: nextProps.value })
    }
  }

  render () {
    if (!this.state.isEditing) {
      return (
        <span>
          {this.props.value}
          <Icon
            type="edit"
            style={{ marginLeft: '10px', cursor: 'pointer' }}
            onClick={this.edit}
          />
        </span>
      )
    } else {
      return (
        <Input
          ref={ref => { this.$input = ref }}
          value={this.state.value}
          onChange={e => this.setState({ value: e.target.value })}
          onBlur={this.reset}
          onKeyDown={e => {
            if (e.keyCode === 13) return this.submit()
            if (e.keyCode === 27) return this.reset()
          }}
        />
      )
    }
  }
}