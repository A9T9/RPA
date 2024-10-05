import React from 'react'
import { Button, Table, Popconfirm } from 'antd'
import { EyeOutlined, DownloadOutlined, CloseOutlined } from '@ant-design/icons';

import { readableSize } from '@/services/storage/flat/storage'

export type Csv = {
  name:       string;
  size:       number;
  fullPath:   string;
  createTime: Date;
}

export type CsvListProps = {
  list:        Csv[];
  removeCSV:   (csv: Csv) => void;
  viewCSV:     (csv: Csv) => void;
  downloadCSV: (csv: Csv) => void;
}

export class CsvList extends React.PureComponent<CsvListProps> {
  render () {
    const columns = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: 'Size',
        dataIndex: 'size',
        key: 'size',
        render: (d: number) => {
          return readableSize(d)
        }
      },
      {
        title:'Last Modified',
        dataIndex: 'createTime',
        key: 'createTime',
        render: (d: Date) => {
          const pad = (n: number) => n >= 10 ? ('' + n) : ('0' + n)
          return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        }
      },
      {
        title: 'Action',
        key: 'ops',
        width: 110,
        render: (text: string, csv: Csv, index: number) => {
          return (
            <div>
              <Button
                size="small"
                shape="circle"
                onClick={(ev) => {
                  this.props.viewCSV(csv)
                }}
              >
                <EyeOutlined />
              </Button>

              <Button
                size="small"
                type="primary"
                shape="circle"
                onClick={() => {
                  this.props.downloadCSV(csv)
                }}
              >
                <DownloadOutlined />
              </Button>

              <Popconfirm
                title="Sure to delete?"
                okText="Delete"
                onConfirm={() => { this.props.removeCSV(csv) }}
              >
                <Button
                  size="small"
                  danger
                  shape="circle"
                >
                  <CloseOutlined />
                </Button>
              </Popconfirm>
            </div>
          )
        }
      }
    ]

    const tableConfig = {
      columns,
      dataSource: this.props.list,
      pagination: false,
      bordered: true,
      size: 'middle',
      rowKey: 'fullPath',
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
