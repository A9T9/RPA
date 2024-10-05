import React, { ChangeEvent } from 'react'
import ReactDOM from 'react-dom';
import { Input } from 'antd'
import { v1 as uuid } from 'uuid'
import { singletonGetter } from '@/common/ts_utils';
import './select_input.scss';
import { cn } from '@/common/utils';

export type SelectInputProps<OptionT = any> = {
  OptionItem?:        React.Component;
  placeholder?:       string;
  disabled?:          boolean;
  dropdownAutoWidth?: boolean;
  stringifyOption:    (item: OptionT) => string;
  getId:              (item: OptionT, index: number) => string;
  options:            OptionT[];
  value:              string | null;
  onChange:           (text: string) => void;
}

export type SelectInputState = {
  shouldShowOptions: boolean;
  text: string;
}

export class SelectInput<OptionT = any> extends React.Component<SelectInputProps<OptionT>, SelectInputState> {
  static defaultProps: Partial<SelectInputProps> = {
    disabled: false,
    dropdownAutoWidth: false
  }

  private container: React.RefObject<HTMLDivElement>
  private input: React.RefObject<any>

  state: SelectInputState = {
    text: '',
    shouldShowOptions: false
  }

  constructor (props: SelectInputProps) {
    super(props)
    this.container = React.createRef()
    this.input = React.createRef()
  }

  componentDidMount () {
    if (this.props.value) {
      this.setState({
        text: this.props.value
      })
    }
  }

  componentDidUpdate (prevProps: SelectInputProps<OptionT>) {
    if (this.props.value !== prevProps.value) {
      this.setState({
        text: this.props.value ?? ''
      })
    }
  }

  getDropDownElementId = singletonGetter((): string => 'dropdown_' + uuid())

  onFocus = (): void => {
    if (this.props.disabled) {
      return
    }

    this.setState({
      shouldShowOptions: true
    })
  }

  onBlur = (): void => {
    setTimeout(() => {
      this.setState({
        shouldShowOptions: false
      })
    }, 100)
  }

  onToggle = (): void => {
    if (this.props.disabled) {
      return
    }

    if (this.state.shouldShowOptions) {
      this.onBlur()
    } else {
      this.onFocus()
      this.focusOnTextInput()
    }
  }

  onKeyDown = (e: KeyboardEvent): void => {
    switch (e.keyCode) {
      case 13:
      case 27:
        this.setState({ shouldShowOptions: false })
        break
    }
  }

  onTextChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const text = e.target.value

    this.setState({
      text,
      shouldShowOptions: true
    })
    this.props.onChange(text)
  }

  onItemClick = (e: React.SyntheticEvent, item: OptionT, index: number): void => {
    const text = this.props.stringifyOption(item) ?? this.props.getId(item, index)

    this.setState({
      text,
      shouldShowOptions: false
    })

    this.focusOnTextInput()
    this.props.onChange(text)
  }

  focusOnTextInput (): void {
    if (!this.input.current) {
      return
    }

    const $input = this.input.current.input as HTMLInputElement

    $input.focus()
  }

  getDropDownContainer (): HTMLElement {
    const id = 'drop_down_container'
    const existing = document.getElementById(id)

    if (existing) {
      return existing
    }

    const el = document.createElement('div')

    el.id = id
    document.body.appendChild(el)

    return el
  }

  getDropDownMountPoint (): HTMLElement {
    const id = this.getDropDownElementId()
    const existing = document.getElementById(id)

    if (existing) {
      return existing
    }

    const el = document.createElement('div')

    el.id = id
    el.className = "drop-down"
    this.getDropDownContainer().appendChild(el)

    return el
  }

  renderOneOption (item: OptionT, index: number, selected: boolean) {
    const { getId, stringifyOption } = this.props
    const OptionItem = this.props.OptionItem as any
    const id = getId(item, index)

    if (OptionItem) {
      return <OptionItem value={item} key={id} />
    }

    const text = stringifyOption?.(item) ?? id

    return (
      <PlainTextOption
        key={id}
        item={item}
        index={index}
        text={text}
        selected={selected}
        onItemClick={this.onItemClick}
      />
    )
  }

  renderOptions () {
    if (!this.state.shouldShowOptions) {
      return null
    }

    const el = this.container.current

    if (!el) {
      return null
    }

    const rect   = el.getBoundingClientRect()
    const margin = 3
    const style: Record<string, any> = {
      position: 'absolute',
      left:     rect.left,
      top:      rect.top + rect.height + margin
    }

    if (!this.props.dropdownAutoWidth) {
      style.width = rect.width
    }

    const node = (
      <div
        className="option-list"
        style={style as any}
      >
        {this.props.options.map((item, i) => {
          return this.renderOneOption(
            item,
            i,
            this.state.text === this.props.stringifyOption(item)
          )
        })}
      </div>
    )

    return ReactDOM.createPortal(node, this.getDropDownMountPoint())
  }

  renderArrowIcon = ({ onClick }: { onClick: any }) => {
    return (
      <span
        className="arrow-icon ant-select-arrow"
        onClick={onClick}
      >
        <span role="img" aria-label="down" className="anticon anticon-down ant-select-suffix">
          <svg viewBox="64 64 896 896" focusable="false" data-icon="down" width="1em" height="1em" fill="currentColor" aria-hidden="true">
            <path d="M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z"></path>
          </svg>
        </span>
      </span>
    )
  }

  render () {
    return (
      <div
        className={cn('select-input', { opened: this.state.shouldShowOptions })}
        ref={this.container}
      >
        <Input
          ref={this.input}
          disabled={this.props.disabled}
          placeholder={this.props.placeholder}
          value={this.state.text}
          onFocus={this.onFocus}
          onBlur={this.onBlur}
          onClick={this.onFocus}
          onChange={this.onTextChange}
          onKeyDown={this.onKeyDown as any}
        />
        {this.renderArrowIcon({ onClick: this.onToggle})}
        {this.renderOptions()}
      </div>
    )
  }
}


type PlainTextOptionProps = {
  item: any;
  index: number;
  text: string;
  selected: boolean;
  onItemClick: (e: React.SyntheticEvent, item: any, index: number) => void;
}

class PlainTextOption extends React.Component<PlainTextOptionProps> {
  onClick = (e: React.SyntheticEvent): void => {
    this.props.onItemClick(e, this.props.item, this.props.index)
  }

  render () {
    return (
      <div
        className={cn('plain-text-option', { selected: this.props.selected })}
        onMouseDown={this.onClick}
      >
        {this.props.text}
      </div>
    )
  }
}
