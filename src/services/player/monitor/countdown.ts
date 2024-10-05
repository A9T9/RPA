import { IInspector } from './types'

export class Countdown implements IInspector {
  private callback: () => void
  private startTime: Date | null = null
  private timeout: number | null = null
  private timer: any | null = null

  constructor (callback: () => void) {
    this.callback = callback
  }

  public restart (newTimeout: number, force: boolean = false) {
    clearTimeout(this.timer)

    if (force || this.timeout === null || !this.startTime) {
      this.timeout    = newTimeout
      this.startTime  = new Date()

      if (newTimeout !== 0) {
        this.timer = setTimeout(() => this.runCallback(), this.timeout)
      }
    } else {
      const past = new Date().getTime() - this.startTime.getTime()
      const rest = newTimeout - past

      this.timeout = newTimeout

      if (newTimeout !== 0) {
        if (rest < 0) {
          return this.callback()
        } else {
          this.timer = setTimeout(() => this.runCallback(), rest)
        }
      }
    }
  }

  public pause () {
    clearTimeout(this.timer)

    if (!this.startTime || !this.timeout) {
      return
    }

    const past = new Date().getTime() - this.startTime.getTime()
    const rest = this.timeout - past

    this.timeout = rest
  }

  public resume () {
    if (!this.timeout) {
      return
    }

    this.startTime = new Date()
    this.timer = setTimeout(() => this.runCallback(), this.timeout)
  }

  public stop () {
    clearTimeout(this.timer)
    this.clearState()
  }

  public output (): void {
    // return nothing
  }

  private clearState () {
    this.timer = null
    this.timeout = null
    this.startTime = null
  }

  private runCallback () {
    try {
      this.callback()
    } catch (e) {
      console.error(e)
    } finally {
      this.clearState()
    }
  }
}
