import React from 'react'
import { Input, Icon } from 'antd'
import { CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';


const SearchOrCloseIcon = ({ canClear, inputProps }) => {
  const handleClear = () => {
    if (!inputProps || !inputProps.onChange) {
      return; // Handle potential errors gracefully, e.g., log a warning
    }
    inputProps.onChange({ target: { value: '' } });
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Your input component here */}
      {canClear ? (
        <CloseCircleOutlined
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
          }}
          onClick={handleClear} // Clear function directly referenced
        />
      ) : (
        <SearchOutlined
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
          }}
          onClick={handleClear} // Clear function directly referenced
        />
      ) }
    </div>
  );
};

export default class SearchBox extends React.Component {
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
        {/* <Icon
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
        /> */}
        <SearchOrCloseIcon canClear={canClear} inputProps={this.props.inputProps} />
      </span>
    )
  }
}
