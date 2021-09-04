import { Box } from './box'

export class GreenBox extends Box {
  static key = 'greenBox'

  getType () {
    return GreenBox.key
  }

  getDefaultStyle () {
    return {
      fill: 'none',
      stroke: '#00ff00',
      strokeWidth: '2px'
    }
  }
}
