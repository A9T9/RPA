import { IStack } from './types'

export class StackError extends Error {}

export class Stack<T> implements IStack<T> {
  protected list: T[] = []

  constructor (list?: T[]) {
    if (list && list.length) {
      this.list = list
    }
  }

  public clear (): void {
    this.list = []
  }

  public toArray (): T[] {
    return [...this.list]
  }

  public getCount (): number {
    return this.list.length
  }

  public isEmpty (): boolean {
    return this.getCount() === 0
  }

  public contains (item: T): boolean {
    return !!this.list.find((el) => el === item)
  }

  public push (item: T): void {
    this.list.push(item)
  }

  public peek (): T {
    this.guardNotEmpty()
    return this.list[this.getCount() - 1]
  }

  public bottom (): T {
    this.guardNotEmpty()
    return this.list[0]
  }

  public pop (): T {
    this.guardNotEmpty()
    return this.list.pop() as T
  }

  protected guardNotEmpty (): void {
    if (this.isEmpty()) {
      throw new StackError('empty stack')
    }
  }
}
