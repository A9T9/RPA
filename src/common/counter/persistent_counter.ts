import { PersistentCounterOptions, ICounter } from './types'
import { Counter } from './counter'

export class PersistentCounter extends Counter {
  protected ready: boolean = false
  protected read:  () => Promise<number>
  protected write: (n: number) => Promise<void>

  constructor (options: PersistentCounterOptions) {
    super(options)
    this.read   = options.read
    this.write  = options.write
  }

  reset (): void {
    super.reset()
    this.ready = false

    setTimeout(() => {
      this.read()
      .then(n => {
        this.ready = true
        this.n = n
      })
    }, 0)
  }

  inc (): boolean {
    if (!this.ready) {
      throw new Error('counter not ready yet')
    }

    const result = super.inc()

    this.write(this.n)
    return result
  }
}
