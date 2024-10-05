import React from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { Menu } from 'antd'
import ClickOutside from 'react-click-outside'
// import { ClickParam } from 'antd/lib/menu' // deprecated
import { Size } from '@/common/types'
import { pointToFitRect } from '@/common/ts_utils';

export enum MenuItemType {
  Divider = 'divider',
  Button  = 'button'
}

export type DividerMenuOptions = {}

export type ButtonMenuOptions = {
  content:  string;
  context?: any;
  onClick:  (e: MouseEvent, context?: any) => void;
}

export type MenuItem = {
  id:   string;
  type: MenuItemType;
  data: ButtonMenuOptions | DividerMenuOptions;
  disabled?: boolean;
}

export enum ContextMenuDisplayStatus {
  Hidden,
  Transparent,
  Visible
}

export type ContextMenuProps = {
  width?:    number;
  x:         number;
  y:         number;
  menuItems: MenuItem[];
  onHide:    () => void;
}

export type ContextMenuState = {
  status: ContextMenuDisplayStatus;
  size:   Size;
  isCollectingSize: boolean;
}

export class ContextMenu extends React.Component<ContextMenuProps, ContextMenuState> {
  static propTypes = {
    menuItems:  PropTypes.array.isRequired,
    onHide:     PropTypes.func.isRequired,
    width:      PropTypes.number
  }

  static defaultProps = {
    width: 230
  }

  private $container: HTMLDivElement | null = null

  state: ContextMenuState = {
    isCollectingSize: false,
    status: ContextMenuDisplayStatus.Transparent,
    size: {
      width: 0,
      height: 0
    }
  }

  hide = () => {
    this.props.onHide()
  }

  onClick = (e: any) => {
    const found: MenuItem | undefined = this.findMenuItem(e.key)

    if (!found) {
      return
    }

    switch (found.type) {
      case MenuItemType.Button: {
        const { context, onClick } = found.data as ButtonMenuOptions

        try {
          onClick(e.domEvent, context)
        } catch (e) {
          console.warn(e)
        } finally {
          this.hide()
        }

        break
      }

      case MenuItemType.Divider:
      default:
        break
    }
  }

  findMenuItem (menuItemId: string): MenuItem | undefined {
    return this.props.menuItems.find((item, i) => this.getId(item, i) === menuItemId)
  }

  getId (menuItem: MenuItem, index: number) {
    return menuItem.id + '_' + index
  }

  getContextMenuStyle () {
    const { status } = this.state
    const common = {
      position: 'fixed'
    }
    const byStatus = (() => {
      switch (status) {
        case ContextMenuDisplayStatus.Hidden:
          return {
            display: 'none'
          }

        case ContextMenuDisplayStatus.Transparent: {
          return {
            top: 0,
            left: 0,
            visibility: 'hidden'
          }
        }

        case ContextMenuDisplayStatus.Visible: {
          const leftTopPoint = pointToFitRect({
            bound: {
              x: 0,
              y: 0,
              width: window.innerWidth,
              height: window.innerHeight
            },
            size: this.state.size,
            point: {
              x: this.props.x,
              y: this.props.y
            }
          })

          return {
            top:  leftTopPoint.y + 'px',
            left: leftTopPoint.x + 'px',
          }
        }
      }
    })()

    return {
      ...common,
      ...byStatus
    }
  }

  collectSize () {
    this.setState({
      isCollectingSize: true
    })

    setTimeout(() => {
      if (!this.$container) {
        return
      }

      this.setState({
        isCollectingSize: false,
        status: ContextMenuDisplayStatus.Visible,
        size: {
          width:  this.$container.offsetWidth,
          height: this.$container.offsetHeight
        }
      })
    }, 100)
  }

  componentDidMount () {
    if (!this.state.isCollectingSize && this.state.status === ContextMenuDisplayStatus.Transparent) {
      this.collectSize()
    }
  }

  render () {
    return (
      <div
        ref={(ref) => { this.$container = ref }}
        style={this.getContextMenuStyle() as any}
        className="context-menu"
      >
        <ClickOutside onClickOutside={this.hide}>
          <Menu
            onClick={this.onClick}
            style={{ width: this.props.width + 'px' }}
            mode="vertical"
            selectable={false}
          >
            {this.props.menuItems.map((item, i) => {
              switch (item.type) {
                case MenuItemType.Divider:
                  return <Menu.Divider key={this.getId(item, i)} />

                case MenuItemType.Button:
                  return (
                    <Menu.Item
                      key={this.getId(item, i)}
                      disabled={!!item.disabled}
                    >
                      {(item.data as ButtonMenuOptions).content}
                    </Menu.Item>
                  )

                default:
                  return null
              }
            })}
          </Menu>
        </ClickOutside>
      </div>
    )
  }
}

function getContainer () {
  const id  = '__kantu_context_menus__'
  const $el = document.getElementById(id)
  if ($el)  return $el

  const $new = document.createElement('div')
  $new.id = id
  document.body.appendChild($new)

  return $new
}

export function showContextMenu (props: ContextMenuProps): void {
  const $box = document.createElement('div')
  getContainer().appendChild($box)

  // Delay 20ms is for firefox
  setTimeout(() => {
    ReactDOM.render(
      <ContextMenu
        {...props}
        onHide={() => {
          setTimeout(() => {
            $box.remove()
          })
          props.onHide()
        }}
      />,
      $box
    )
  }, 20)
}

export function hideContextMenu (): void {
  const $el = document.getElementById('__kantu_context_menus__')
  if ($el) {
    $el.remove()
  }
}
