import { Box } from './box'

export class PinkBox extends Box {
  static key = 'pinkBox'

  getType () {
    return PinkBox.key
  }

  getDefaultStyle () {
    return {
      fill: 'none',
      stroke: '#fe1492',
      strokeWidth: '2px'
    }
  }
}
