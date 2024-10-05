import React from 'react'
import { Input } from 'antd'
import { EditOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types'

export type EditInPlaceProps = {
  value: string;
  onChange: (value: string) => Promise<void>;
  checkValue: (value: string) => Promise<boolean>;
  getSelection: (value: string, $input: HTMLInputElement) => { start: number; end: number; } | null;
}

export default class EditInPlace extends React.Component<EditInPlaceProps> {
  static propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    checkValue: PropTypes.func.isRequired,
    getSelection: PropTypes.func
  }

  static defaultProps = {
    getSelection: () => null
  }

  private $input: any;

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
        .catch(e => this.setState({ value: this.props.value }))
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

  componentWillReceiveProps (nextProps: EditInPlaceProps) {
    if (nextProps.value !== this.props.value) {
      this.setState({ value: nextProps.value })
    }
  }

  render () {
    if (!this.state.isEditing) {
      return (
        <span>
          {this.props.value}
          <EditOutlined
            style={{ marginLeft: '10px', cursor: 'pointer' }}
            onClick={this.edit}
          />
        </span>
      )
    } else {
      return (
        <Input
          defaultValue=""
          autosize={true}
          ref={ref => { this.$input = ref }}
          value={this.state.value}
          onChange={e => this.setState({ value: e.target.value })}
          onBlur={this.reset}
          onKeyDown={(e: any) => {
            if (e.keyCode === 13) return this.submit()
            if (e.keyCode === 27) return this.reset()
          }}
        />
      )
    }
  }
}
