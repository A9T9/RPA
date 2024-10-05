import React from 'react'
import PropTypes from 'prop-types'
import { cn } from '@/common/utils'
import { without, normalizeHtmlId } from '@/common/ts_utils'
import { Without } from '@/common/types'
import { FileNodeType } from './tree_file';

export type TreeNodeType = string

export type TreeNodeData<T extends TreeNodeType> = {
  id:       string;
  type:     T;
  level:    number;
  selected: boolean;
  folded:   boolean;
  children: TreeNodeData<T>[];
  className: string;
}

export type TreeNodeProps<T extends TreeNodeType> = {
  data:              TreeNodeData<T>;
  paths:             number[];
  commonClass:       string;
  renderItem:        (data: TreeNodeData<T>, paths: number[]) => React.ReactNode | string;
  renderIcon:        (data: TreeNodeData<T>, paths: number[]) => React.ReactNode | string;
  renderItemExtra?:  (data: TreeNodeData<T>, paths: number[]) => React.ReactNode | string;
  onClick:           (data: TreeNodeData<T>, paths: number[], e: MouseEvent) => void;
  onDoubleClick:     (data: TreeNodeData<T>, paths: number[], e: MouseEvent) => void;
  onContextMenu:     (data: TreeNodeData<T>, paths: number[], e: MouseEvent) => void;
  onToggle:          (data: TreeNodeData<T>, paths: number[], e: MouseEvent) => void;
  subnodeComponent?: (data: TreeNodeData<T>, paths: number[]) => React.Component<TreeNodeProps<T>>;
  decorate?:         (el: JSX.Element) => JSX.Element;
  foldOnClickTitle?: boolean;
}

type TreeNodeState = {
}

export class TreeNode<T extends TreeNodeType> extends React.Component<TreeNodeProps<T>, TreeNodeState> {
  static propTypes = {
    data:            PropTypes.object.isRequired,
    renderItem:      PropTypes.func.isRequired,
    renderIcon:      PropTypes.func.isRequired,
    renderItemExtra: PropTypes.func,
    decorate:        PropTypes.func,
    onClick:         PropTypes.func.isRequired,
    onDoubleClick:   PropTypes.func.isRequired,
    onContextMenu:   PropTypes.func.isRequired,
    onToggle:        PropTypes.func.isRequired,
    className:       PropTypes.string
  }

  state: TreeNodeState = {
  }

  onClick = (e: MouseEvent) => {
    const { data, onClick, paths, foldOnClickTitle } = this.props

    if (onClick) {
      onClick(data, paths, e)
    }

    if (foldOnClickTitle && data.type === FileNodeType.Folder) {
      this.onToggle(e)
    }
  }

  onDoubleClick = (e: MouseEvent) => {
    const { data, onDoubleClick, paths } = this.props

    if (onDoubleClick) {
      onDoubleClick(data, paths, e)
    }
  }

  onContextMenu = (e: MouseEvent) => {
    const { data, onContextMenu, paths } = this.props

    if (onContextMenu) {
      onContextMenu(data, paths, e)
    }
  }

  onToggle = (e: MouseEvent) => {
    e.stopPropagation()
    const { data, onToggle, paths } = this.props

    if (onToggle) {
      onToggle(data, paths, e)
    }
  }

  render () {
    const { decorate = (x: any) => x } = this.props

    return decorate(
      <div
        id={normalizeHtmlId(this.props.data.id)}
        className={cn('tree-node', this.props.commonClass, this.props.data.className)}
      >
        <div
          className="tree-node-content"
          onClick={this.onClick as any}
          onDoubleClick={this.onDoubleClick as any}
          onContextMenu={this.onContextMenu as any}
        >
          <div
            className="tree-node-icon-wrapper"
            onClick={this.onToggle as any}
          >
            {this.renderIcon()}
          </div>
          <div className="tree-node-item-wrapper">
            {this.renderItem()}
          </div>

          {this.renderItemExtra()}
        </div>
        <div className="tree-node-children">
          {this.renderSubnodes()}
        </div>
      </div>
    )
  }

  renderIcon () {
    const { renderIcon, data, paths } = this.props

    if (typeof renderIcon === 'function') {
      return renderIcon(data, paths)
    } else {
      return this.defaultRenderIcon(data)
    }
  }

  renderItem () {
    const { renderItem, data, paths } = this.props

    if (typeof renderItem === 'function') {
      return renderItem(data, paths)
    } else {
      return this.defaultRenderItem(data)
    }
  }

  renderItemExtra () {
    const { renderItemExtra, data, paths } = this.props

    if (typeof renderItemExtra === 'function') {
      return renderItemExtra(data, paths)
    } else {
      return null
    }
  }

  defaultRenderIcon (data: TreeNodeData<T>) {
    return (
      <div className={cn('node-icon')}>
        { !data.folded ? 'O' : 'C' }
      </div>
    )
  }

  defaultRenderItem (data: TreeNodeData<T>) {
    return (data as any).text || `node at level ${data.level}`
  }

  renderSubnodes () {
    const { data, paths, subnodeComponent = () => TreeNode } = this.props
    const props = without(['data', 'paths'], this.props) as Without<TreeNodeProps<T> , 'data' | 'paths'>

    if (data.type !== FileNodeType.Folder || data.folded) {
      return null
    }

    return (data.children || []).map((subnode, i) => {
      const SubNode: any = subnodeComponent(subnode, [...paths, i])

      return (
        <SubNode
          key={i}
          {...props}
          data={subnode}
          paths={[...paths, i]}
        />
      )
    })
  }
}
