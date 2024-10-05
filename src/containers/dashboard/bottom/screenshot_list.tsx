import React from 'react'
import { LazyImage } from '@/components/lazy_image'
import { getStorageManager } from '@/services/storage'

export type Screenshot = {
  name: string;
  url: string;
  createTime: Date;
  fullPath: string;
}

export type ScreenshotListProps = {
  intersectRoot: HTMLElement;
  screenshots: Screenshot[];
  downloadScreenshot: (name: string, fullPath: string) => void;
}

export class ScreenshotList extends React.PureComponent<ScreenshotListProps> {
  render () {
    return (
      <ul className="screenshot-content">
        {this.props.screenshots.map((ss, i) => (
          <li key={ss.createTime + '_' + ss.createTime}>
            <span className="timestamp">
              {ss.createTime && ss.createTime.toLocaleString()} - <span className="filename">{decodeURIComponent(ss.name)}</span>
            </span>
            <a
              href="#"
              onClick={e => {
                e.preventDefault()
                this.props.downloadScreenshot(ss.name, ss.fullPath)
              }}
            >
              <LazyImage
                type={'screenshot'}
                root={this.props.intersectRoot}
                width={200}
                height={200}
                defaultUrl=""
                getUrl={() => {
                  return getStorageManager().getScreenshotStorage().getLink(ss.fullPath)
                }}
              />
            </a>
          </li>
        ))}
      </ul>
    )
  }
}
