import React from 'react'
import PropTypes from 'prop-types'
import { Input, Icon } from 'antd'

export default class EditableText extends React.Component {
  static propTypes = {
    value:        PropTypes.string,
    isEditing:    PropTypes.bool,
    onChange:     PropTypes.func,
    inputProps:   PropTypes.object,
    textProps:    PropTypes.object,
    className:    PropTypes.any,
    clickToEdit:  PropTypes.bool
  }

  state = {
    isEditing: false
  }

  onChange = (e) => {
    this.setState({
      value: e.target.value
    })
  }

  onKeyDown = (e) => {
    if (e.keyCode === 13) {
      this.submit()
    } else if (e.keyCode === 27) {
      this.setState({
        value: this.props.value
      }, this.submit)
    }
  }

  onBlur = (e) => {
    this.submit()
  }

  onClickText = () => {
    if (this.props.clickToEdit) {
      this.setState({ isEditing: true })
    }
  }

  submit = () => {
    this.setState({
      isEditing: false
    })

    if (this.props.onChange) {
      this.props.onChange(this.state.value)
    }
  }

  componentDidMount () {
    this.setState({
      isEditing:  this.props.isEditing,
      value:      this.props.value
    })

    if (this.props.isEditing) {
      this.focusOnInput()
    }
  }

  componentWillReceiveProps (nextProps) {
    const nextState = {}

    if (this.props.isEditing !== nextProps.isEditing) {
      nextState.isEditing = nextProps.isEditing

      if (nextState.isEditing) {
        this.focusOnInput()
      }
    }

    if (this.props.value !== nextProps.value) {
      nextState.value = nextProps.value
    }

    this.setState(nextState)
  }

  focusOnInput () {
    setTimeout(() => {
      const $input = this.input.refs.input

      if ($input) {
        $input.focus()
        $input.selectionStart = 0
        $input.selectionEnd   = $input.value.length
      }
    }, 200)
  }

  render () {
    const { isEditing, value } = this.state

    return (
      <div className={this.props.className}>
        {isEditing ? (
          <Input
            value={value}
            onChange={this.onChange}
            onBlur={this.onBlur}
            onKeyDown={this.onKeyDown}
            ref={ref => { this.input = ref }}
            {...(this.props.inputProps || {})}
          />
        ) : (
          <span onClick={this.onClickText}>
            <span>{value}</span>
            {this.props.clickToEdit ? (
              <Icon type="edit" style={{ marginLeft: '10px' }} />
            ) : null}
          </span>
        )}
      </div>
    )
  }
}