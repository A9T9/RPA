import PropTypes from 'prop-types';
import React from 'react';
import { findDOMNode } from 'react-dom';

import { commandText } from '@/common/command';
import { MacroCommand } from '@/common/convert_utils';
import { compose, repeatStr } from '@/common/ts_utils';
import { cn } from '@/common/utils';
import { DragSource, DragSourceConnector, DragSourceMonitor, DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd';

enum ItemTypes {
  Command = 'command'
}

type Command = MacroCommand & {
  realIndex: number;
}

type CommandItemProps = {
  index:              number;
  command:            Command;
  editable:           boolean;
  style?:             Record<string, string>;
  columnWidths:       Record<string, number>;
  tableWidth:         number;
  className?:         string;
  attributes?:        Record<string, string>;
  onClick:            (e: MouseEvent, command: Command) => void;
  onContextMenu:      (e: MouseEvent, command: Command) => void;
  onMouseEnterTarget: (e: MouseEvent, command: Command) => void;
  onMouseLeaveTarget: (e: MouseEvent, command: Command) => void;
  onToggleComment:    (e: MouseEvent, command: Command) => void;
  onDuplicate:        (e: MouseEvent, command: Command) => void;
  onMoveCommand:      (fromIndex: number, toIndex: number) => void;
  onDragStart:        (itemIndex: number) => void;
  onDragEnd:          (itemIndex: number) => void;
}

class InternalCommandItem extends React.Component<CommandItemProps> {
  static propTypes = {
    style:              PropTypes.object,
    columnWidths:       PropTypes.object.isRequired,
    tableWidth:         PropTypes.number.isRequired,
    className:          PropTypes.string,
    attributes:         PropTypes.object,
    command:            PropTypes.object.isRequired,
    editable:           PropTypes.bool.isRequired,
    onClick:            PropTypes.func.isRequired,
    onContextMenu:      PropTypes.func.isRequired,
    onMouseEnterTarget: PropTypes.func.isRequired,
    onMouseLeaveTarget: PropTypes.func.isRequired,
    onToggleComment:    PropTypes.func.isRequired,
    onDuplicate:        PropTypes.func.isRequired,
    onMoveCommand:      PropTypes.func.isRequired,
    onDragStart:        PropTypes.func.isRequired,
    onDragEnd:          PropTypes.func.isRequired
  }

  static defaultProps = {
    style:      {},
    attributes: {},
    className:  ''
  }

  onClick = (e: MouseEvent): void => {
    this.props.onClick(e, this.props.command)
  }

  onContextMenu = (e: MouseEvent): void => {
    this.props.onContextMenu(e, this.props.command)
  }

  render () {
    const { index, command, editable, isDragging, connectDropTarget, connectDragSource } = this.props as any
    const decorate = compose(connectDragSource, connectDropTarget)
    const hasDescription = command.description && command.description.length > 0
      /*
        {
          "serialFixed": 30,
          "cmd": 0.3,
          "target": 0.4,
          "value": 0.3,
          "opsFixed": 70
        }
      */
      // console.log('this.props.columnWidths:>>', this.props.columnWidths)
      let columnWidths = this.props.columnWidths
      let tableWidth = this.props.tableWidth

    return decorate(
      <div
        {...this.props.attributes}
        style={this.props.style}
        className={cn(this.props.className || '', { dragging: isDragging })}
        onClick={this.onClick as any}
        onContextMenu={this.onContextMenu as any}
      >
        <div className="row-col index-col" style={{ width: columnWidths.serialFixed }} >{index}</div>
        <div className="row-col command-col" style={{ width : columnWidths.cmd * tableWidth, maxWidth: 170 }} title={commandText(command.cmd)}>
          {repeatStr(command.indent * 2, '\u00A0')}{commandText(command.cmd)}
        </div>        
        <div
          className="row-col target-col"
          title={command.target}
          style={{ width: columnWidths.target * tableWidth }} 
          onMouseEnter={(e) => this.props.onMouseEnterTarget(e as any, command)}
          onMouseLeave={(e) => this.props.onMouseLeaveTarget(e as any, command)}
        >
          {command.target}
        </div>
        <div className="row-col value-col" title={command.value}  style={{ width: columnWidths.value * tableWidth }} >
          {command.value}
        </div>
      </div>
    )
  }
}

export const CommandItem = compose(
  DragSource(
    ItemTypes.Command,
    {
      beginDrag: (props: CommandItemProps) => {
        return {
          index: props.command.realIndex
        }
      },
      isDragging: (props: CommandItemProps, monitor: DragSourceMonitor): boolean => {
        return monitor.getItem().index === props.command.realIndex
      }
    },
    (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
      connectDragSource: connect.dragSource(),
      isDragging:        monitor.isDragging()
    })
  ),
  DropTarget(
    ItemTypes.Command,
    {
      hover: (props: CommandItemProps, monitor: DropTargetMonitor, component: InternalCommandItem | null): void => {
        if (!component) {
          return
        }

        const dragIndex: number = monitor.getItem().index
        const hoverIndex: number = props.command.realIndex

        if (dragIndex === hoverIndex) {
          return
        }

        const hoverBoundingRect = (findDOMNode( component,) as Element).getBoundingClientRect()
        const halfHeight        = hoverBoundingRect.height / 2
        const clientOffset      = monitor.getClientOffset()

        if (!clientOffset) {
          return
        }

        const yInElement = clientOffset.y - hoverBoundingRect.top

        // Only perform the move when the mouse has crossed half of the items height
        // When dragging downwards, only move when the cursor is below 50%
        // When dragging upwards, only move when the cursor is above 50%

        // Dragging downwards
        if (dragIndex < hoverIndex && yInElement < halfHeight) {
          return
        }

        // Dragging upwards
        if (dragIndex > hoverIndex && yInElement > halfHeight) {
          return
        }

        props.onMoveCommand(dragIndex, hoverIndex)

        // Note: we're mutating the monitor item here!
        // Generally it's better to avoid mutations,
        // but we don't have id for command, so have to update index here
        monitor.getItem().index = hoverIndex
      }
    },
    (connect: DropTargetConnector) => ({
      connectDropTarget: connect.dropTarget()
    })
  )
)(InternalCommandItem)
