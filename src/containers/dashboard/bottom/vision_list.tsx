
import type { MenuProps } from 'antd';
import { Button, Dropdown, Table } from 'antd';
import React from 'react';

import EditInPlace from '@/components/edit_in_place';
import { LazyImage } from '@/components/lazy_image';
import { getStorageManager } from '@/services/storage';
import { EyeOutlined, MenuFoldOutlined } from '@ant-design/icons';


type MenuItem = Required<MenuProps>['items'][number];

export type Vision = {
  name: string;
  fullPath: string;
  createTime: Date;
}

export type VisionListProps = {
  intersectRoot: HTMLElement;
  renameVision: (oldName: string, newName: string) => void;
  viewVision: (name: string) => void;
  duplicateVision: (name: string) => void;
  deleteVision: (name: string) => void;
  copyNameToTarget: (name: string) => void;
  isNameValid: (name: string) => Promise<boolean>;
  visions: Vision[];
  query?: string;
}

export class VisionList extends React.PureComponent<VisionListProps> {

  onClickActionMenu = (key: string, vision: Vision) => {
    switch (key) {
      case 'duplicate':
        return this.props.duplicateVision(vision.name)

      case 'name_to_target':
        return this.props.copyNameToTarget(vision.name)

      case 'delete':
        return this.props.deleteVision(vision.name)
    }
  } 

  actionMenuItems: MenuProps['items'] = [
    {
      label: 'Duplicate',
      key: 'duplicate'
    },
    {
      label: 'Add name to target box',
      key: 'name_to_target'
    },
    { type: 'divider' },  
    {
      label: 'Delete',
      key: 'delete'
    }
  ];

  render () {
    if (!this.props.intersectRoot) {
      return null
    }

    const columns = [
      {
        title: 'Image',
        dataIndex: 'fullPath',
        key: 'fullPath',
        width: 116,
        render: (fullPath: string) => {
          return (
            <LazyImage
              type={'vision'}
              root={this.props.intersectRoot}
              width={100}
              height={100}
              defaultUrl=""
              getUrl={() => {
                return getStorageManager().getVisionStorage().getLink(fullPath)
              }}
            />
          )
        }
      },
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        render: (name: string, vision: Vision) => {
          return (
            <div className="vision-name-1" id={name}>
              <EditInPlace
                value={vision.name}
                onChange={(name: string) => {
                  return Promise.resolve(this.props.renameVision(vision.name, name))
                }}
                checkValue={(name: string) => {
                  return this.props.isNameValid(name)
                }}
                getSelection={(name: string, $input: HTMLInputElement) => {
                  const reg       = /(?:_dpi_\d+)?\.png$/i
                  const result    = reg.exec(name)

                  if (!result) {
                    return null
                  }

                  const endIndex  = result.index

                  return {
                    start:  0,
                    end:    endIndex
                  }
                }}
              />
            </div>
          )
        }
      },
      {
        title: 'Action',
        key: 'ops',
        width: 100,
        render: (text: string, vision: Vision, index: number) => {
          return (
            <div className="vision-actions">
              <Button
                size="small"
                shape="circle"
                onClick={(ev) => {
                  this.props.viewVision(vision.name)
                }}
              >
                <EyeOutlined />      
              </Button>

              <Dropdown 
              // overlay={
              //   <Menu onClick={({ key }) => { this.onClickActionMenu(key, vision) }}>
              //     <Menu.Item key="duplicate">
              //       Duplicate
              //     </Menu.Item>
              //     <Menu.Item key="name_to_target">
              //       Add name to target box
              //     </Menu.Item>
              //     <Menu.Divider />
              //     <Menu.Item key="delete">
              //       Delete
              //     </Menu.Item>
              //   </Menu>
              // }
                menu={{
                  items: this.actionMenuItems, 
                  onClick: ({key} ) => { this.onClickActionMenu(key, vision) }
                }} 
                trigger={['click']}              
              >
                <Button
                  size="small"
                  shape="circle"
                >
                  <MenuFoldOutlined />
                </Button>
              </Dropdown>
            </div>
          )
        }
      }
    ]

    const search = (this.props.query || '').toLowerCase().trim()
    const matchedVisions = this.props.visions.filter(vision => {
      if (search.length === 0)  return true
      return vision.name.toLowerCase().indexOf(search) !== -1
    })

    const tableConfig = {
      columns,
      dataSource: matchedVisions,
      pagination: false,
      bordered: true,
      size: 'middle',
      rowKey: (record: Vision) => {
        return record.fullPath + '__' + record.createTime.getTime()
      },
      onRowClick: () => {
        // Do nothing
      },
      rowClassName: () => {
        return ''
      }
    } as any

    return <Table {...tableConfig} />
  }
}
