import React from 'react'
import PropTypes from 'prop-types'
import { DragSource, DropTarget, DragSourceConnector, DragSourceMonitor, DropTargetConnector, DropTargetMonitor } from 'react-dnd'
// import { Icon } from 'antd'
import { MenuFoldOutlined } from '@ant-design/icons';
import { cn } from '@/common/utils'
import { TreeNode, TreeNodeData, TreeNodeProps } from './tree'
import { safeUpdateIn, compose, isForestEqual } from '@/common/ts_utils'
import { posix as path } from '@/common/lib/path'
import './tree_file.scss'
import CodeSvg  from '@/assets/svg/code.svg'
import FolderExpandedSvg from '@/assets/svg/folder_expanded.svg'
import FolderSvg from '@/assets/svg/folder.svg'


export enum FileNodeType {
  File   = 'file',
  Folder = 'folder'
}

export type FileNodeData = TreeNodeData<FileNodeType> & {
  name:       string;
  entryPath:  string;
  className:  string;
  children:   FileNodeData[];
}

export type FileTreeProps = {
  rootPath:      string;
  nodes:         FileNodeData[];
  onMove:        (sourceId: string, targetId: string, isSourceDirectory: boolean) => Promise<void>;
  onToggle:      (data: FileNodeData, paths: number[]) => void;
  onClick:       (data: FileNodeData, paths: number[], e: MouseEvent) => void;
  onDoubleClick: (data: FileNodeData, paths: number[], e: MouseEvent) => void;
  onContextMenu: (data: FileNodeData, paths: number[], e: MouseEvent) => void;
}

export type FileTreeState = {
}

export class InternalFileTree extends React.Component<FileTreeProps, FileTreeState> {
  static propTypes = {
    nodes:         PropTypes.array.isRequired,
    onMove:        PropTypes.func.isRequired,
    onClick:       PropTypes.func.isRequired,
    onDoubleClick: PropTypes.func.isRequired,
    onContextMenu: PropTypes.func.isRequired
  }

  onToggle = (data: FileNodeData, paths: number[]) => {
    if (data.type !== FileNodeType.Folder) {
      return
    }

    this.props.onToggle(data, paths)
  }

  subnodeComponent = (() => {
    const { DndFileNode, DndFolderNode } = dndComponentsFactory({
      move: (sourceId, targetId, isDirectory) => {
        this.props.onMove(sourceId, targetId, isDirectory)
      }
    })

    return (data: FileNodeData, paths: number[]) => {
      switch (data.type) {
        case FileNodeType.File:
          return DndFileNode

        case FileNodeType.Folder:
          return DndFolderNode
      }
    }
  })()

  renderFileIcon = (data: FileNodeData) => {
    switch (data.type) {
      case FileNodeType.File:
        return (
          // <img
          //   src="./img/code.svg"
          //   className="file-node-icon file-icon"
          // />
          <CodeSvg className="file-node-icon file-icon" />
        )

      case FileNodeType.Folder:
        if (!data.folded) {
          return (
            // <img
            //   src="./img/folder_expanded.svg"
            //   className="file-node-icon folder-icon expanded"
            // />
            <FolderExpandedSvg className="file-node-icon folder-icon expanded" />
          )
        } else {
          return (
            // <img
            //   src="./img/folder.svg"
            //   className="file-node-icon folder-icon"
            // />
            <FolderSvg className="file-node-icon folder-icon"/>
          )
        }
    }
  }

  renderFileItem = (data: FileNodeData, paths: number[]) => {
    return (
      <div className="file-node-title">
        <span>{data.name}</span>
      </div>
    )
  }

  renderFileItemExtra = (data: FileNodeData, paths: number[]) => {
    return (
      <MenuFoldOutlined
        className="more-button"
        onClick={(e) => this.props.onContextMenu(data, paths, e as any)}
      />
    )
  }

  shouldComponentUpdate (nextProps: FileTreeProps) {
    return !isForestEqual(
      (a: FileNodeData, b: FileNodeData): boolean => {
        const result = a.entryPath === b.entryPath &&
          a.folded === b.folded &&
          a.type === b.type &&
          a.className === b.className

        return result
      },
      this.props.nodes,
      nextProps.nodes
    )
  }

  render () {
    const { nodes } = this.props
    const { connectDropTarget, highlighted } = this.props as any

    return connectDropTarget(
      <div className={cn('file-root', { 'drag-over': highlighted })}>
        {nodes.map((data, i) => {
          const Node = this.subnodeComponent(data, [i])

          return (
            <Node
              key={data.id}
              data={data}
              paths={[i]}
              commonClass="file-node"
              renderIcon={this.renderFileIcon as any}
              renderItem={this.renderFileItem as any}
              renderItemExtra={this.renderFileItemExtra as any}
              subnodeComponent={this.subnodeComponent as any}
              onClick={this.props.onClick as any}
              onDoubleClick={this.props.onDoubleClick as any}
              onContextMenu={this.props.onContextMenu as any}
              onToggle={this.onToggle as any}
              foldOnClickTitle={true}
            />
          )
        })}
      </div>
    )
  }
}

export const FileTree = DropTarget(
  [FileNodeType.Folder, FileNodeType.File],
  {
    drop (props: FileTreeProps, monitor: DropTargetMonitor, component: React.Component | null) {
      const folderId = props.rootPath
      const srcItem  = monitor.getItem() as { id: string, isDirectory: boolean }

      props.onMove(srcItem.id, folderId, srcItem.isDirectory)
    },
    canDrop (props: FileTreeProps, monitor: DropTargetMonitor): boolean {
      const folderId = props.rootPath
      const { id: entryId }  = monitor.getItem() as { id: string, isDirectory: boolean }

      if (folderId === entryId) {
        return false
      }

      if (folderId === path.dirname(entryId)) {
        return false
      }

      return monitor.isOver({ shallow: true })
    }
  },
  (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
    connectDropTarget: connect.dropTarget(),
    highlighted:       monitor.isOver({ shallow: true }) && monitor.canDrop()
  })
)(InternalFileTree)

type DndComponentsFactoryOptions = {
  move: (sourceId: string, targetId: string, isSourceDirectory: boolean) => void;
}

function dndComponentsFactory (opts: DndComponentsFactoryOptions) {
  const applyDragSource = (itemType: string) => (comp: React.Component) => {
    return DragSource(
      itemType,
      {
        beginDrag: (props: TreeNodeProps<FileNodeType>) => {
          const result = ({
            id:          props.data.id,
            isDirectory: props.data.type === FileNodeType.Folder
          })

          return result
        },
      },
      (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
        connectDragSource: connect.dragSource(),
        isDragging:        monitor.isDragging()
      })
    )(comp as any)
  }

  const applyDropTarget = (itemType: string | string[]) => (comp: React.Component) => {
    return DropTarget(
      itemType,
      {
        drop (props: TreeNodeProps<FileNodeType>, monitor: DropTargetMonitor, component: React.Component | null) {
          const folderId = props.data.id
          const srcItem  = monitor.getItem() as { id: string, isDirectory: boolean }

          opts.move(srcItem.id, folderId, srcItem.isDirectory)
        },
        canDrop (props: TreeNodeProps<FileNodeType>, monitor: DropTargetMonitor): boolean {
          const folderId = props.data.id
          const { id: entryId }  = monitor.getItem() as { id: string, isDirectory: boolean }

          if (folderId === entryId) {
            return false
          }

          if (folderId === path.dirname(entryId)) {
            return false
          }

          return monitor.isOver({ shallow: true })
        }
      },
      (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
        connectDropTarget: connect.dropTarget(),
        highlighted:       monitor.isOver({ shallow: true }) && monitor.canDrop()
      })
    )(comp as any)
  }

  const DndFileNode = applyDragSource(FileNodeType.File)(
    function InternalFileNode (props: any) {
      return (
        <TreeNode
          {...props}
          decorate={compose(props.connectDragSource, track)}
        />
      )
    } as any
  )

  const DndFolderNode = compose(
    applyDragSource(FileNodeType.Folder),
    applyDropTarget([FileNodeType.Folder, FileNodeType.File])
  )(
    function InternalFolderNode (props: any) {
      return (
        <TreeNode
          {...props}
          decorate={compose(props.connectDragSource, props.connectDropTarget, track)}
          data={safeUpdateIn(
            ['className'],
            (oldClassName: string = '') => cn(oldClassName, { 'drag-over': props.highlighted }),
            props.data
          )}
        />
      )
    } as any
  )

  const track = (x: any): any => {
    return x
  }

  return { DndFolderNode, DndFileNode }
}
