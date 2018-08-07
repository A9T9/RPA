import React from 'react'
import { Input, Icon } from 'antd'

export default class SearchBox extends Input {
  render () {
    const { value } = this.props.inputProps || {}
    const canClear  = value !== undefined && value.length > 0

    return (
      <span
        className={this.props.className}
        style={{
          ...(this.props.style || {}),
          position: 'relative'
        }}
      >
        <Input {...(this.props.inputProps || {})} />
        <Icon
          type={canClear ? 'close' : 'search'}
          onClick={e => {
            if (!canClear)  return
            if (!this.props.inputProps || !this.props.inputProps.onChange)  return
            this.props.inputProps.onChange({ target: { value: '' } })
          }}
          style={{
            position:   'absolute',
            right:      '10px',
            top:        '50%',
            transform:  'translateY(-50%)',
            cursor:     canClear ? 'pointer' : 'auto'
          }}
        />
      </span>
    )
  }
}
