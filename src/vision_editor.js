import React from 'react'
import ReactDOM from 'react-dom'

import storage from './common/storage'
import { getStorageManager, StorageStrategyType } from './services/storage'
import { getXFile } from './services/xmodules/xfile'
import { parseQuery } from './common/utils'

const rootEl        = document.getElementById('root');
const render        = () => ReactDOM.render(<App />, rootEl)

class App extends React.Component {
  state = {
    ready: false,
    imageUrl: null
  }

  componentDidMount () {
    const queryObj    = parseQuery(window.location.search)
    const visionFile  = queryObj.vision

    if (!visionFile) return

    document.title = visionFile + ' - Kantu Vision Viewer'

    getStorageManager()
    .getVisionStorage()
    .getLink(visionFile)
    .then(link => {
      this.setState({
        imageUrl: link,
        ready:    true
      })
    })
  }

  render () {
    if (!this.state.ready)  return <div />

    return (
      <div className="vision-editor">
        <img src={this.state.imageUrl} />
      </div>
    )
  }
}

function restoreConfig () {
  return storage.get('config')
  .then((config = {}) => {
    return {
      storageMode: StorageStrategyType.Browser,
      ...config
    }
  })
}

function init () {
  return Promise.all([
    restoreConfig(),
    getXFile().getConfig()
  ])
  .then(([config, xFileConfig]) => {
    getStorageManager(config.storageMode)
    render()
  }, render)
}

init()
