import { CounterOptions, ICounter } from './types'

export class Counter implements ICounter {
  protected n: number = 0
  protected initial: number
  protected getMax:  () => number
  protected onMax:   (current: number, max: number, initial: number) => void

  constructor (options: CounterOptions = {}) {
    const { initial, getMax, onMax } = options

    if (typeof getMax !== 'function') throw new Error(`'getMax' function is required`)
    if (typeof onMax !== 'function')  throw new Error(`onMax callback is required`)

    this.initial  = initial || 0
    this.getMax   = getMax
    this.onMax    = onMax

    this.reset()
  }

  reset (): void {
    this.n = this.initial
  }

  get (): number {
    return this.n
  }

  getMaximum (): number {
    return this.getMax()
  }

  check (): boolean {
    const max = this.getMax()

    if (this.n + 1 > max) {
      this.onMax(this.n, max, this.initial)
      return false
    }

    return true
  }

  inc (): boolean {
    const max = this.getMax()

    if (this.n < max) {
      this.n += 1
      return true
    } else {
      this.onMax(this.n, max, this.initial)
      return false
    }
  }
}
