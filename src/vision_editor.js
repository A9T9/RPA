import React from 'react'
import ReactDOM from 'react-dom'

import { getVisionMan } from './common/vision_man'
import { parseQuery } from './common/utils'

const visionMan = getVisionMan()
const rootEl    = document.getElementById('root');
const render    = () => ReactDOM.render(<App />, rootEl)

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

    visionMan.getLink(visionFile)
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

render()
