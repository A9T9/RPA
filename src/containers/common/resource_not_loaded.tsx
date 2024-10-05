import React from 'react'
import { Button } from 'antd'
import { RunBy, stringForRunBy } from '@/reducers/state'

export type ResourceNotLoadedProps = {
  name:     string;
  from:     RunBy;
  showList: Function;
}

export function ResourceNotLoaded (props: ResourceNotLoadedProps) {
  return (
    <div className="list-not-loaded">
      <p>Started by {stringForRunBy(props.from)}.</p>
      <p>{props.name} not loaded.</p>
      <Button
        type="primary"
        onClick={props.showList as any}
      >
        Load now
      </Button>
    </div>
  )
}
