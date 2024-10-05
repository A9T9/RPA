import { IInspector } from './types'

export class Timer implements IInspector {
  private startTime: Date
  private acc: number

  constructor () {
    this.startTime = new Date()
    this.acc = 0
  }

  public restart (): void {
    this.startTime = new Date()
    this.acc = 0
  }

  public pause (): void {
    const now = new Date()
    this.acc += now.getTime() - this.startTime.getTime()
  }

  public resume (): void {
    this.startTime = new Date()
  }

  public stop (): void {
    // do nothing
  }

  public output (): number {
    return this.elapsed()
  }

  public elapsed (): number {
    return this.acc + (new Date().getTime() - this.startTime.getTime())
  }

  public elapsedInSeconds (): string {
    const diff = this.elapsed()
    return (diff / 1000).toFixed(2) + 's'
  }
}
