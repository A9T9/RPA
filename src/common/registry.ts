
export type RegistryOptions<T> = {
  process: (item: T, data: any, id: string) => void;
  onZero?: (id: string) => void;
  onOne?:  (id: string) => void;
}

export class Registry<T> {
  private cache:     Record<string, T[]>
  private process: (item: T, data: any, id: string) => void
  private onZero:  (id: string) => void
  private onOne:   (id: string) => void

  constructor ({ process, onZero, onOne }: RegistryOptions<T>) {
    this.cache = {}
    this.process = process
    this.onZero  = onZero || (() => {})
    this.onOne   = onOne || (() => {})
  }

  public add (id: string, obj: T) {
    this.cache[id] = this.cache[id] || []
    this.cache[id].push(obj)

    if (this.cache[id].length === 1) {
      try {
        this.onOne(id)
      } catch (e) {
        // tslint:disable-next-line
        console.error('in onOne, ' + (e as Error).message)
      }
    }

    return true
  }

  public remove (id: string, obj: T) {
    if (!this.cache[id]) {
      return false
    }

    this.cache[id] = this.cache[id].filter((item: T) => item !== obj)

    if (this.cache[id].length === 0) {
      try {
        this.onZero(id)
      } catch (e) {
        // tslint:disable-next-line
        console.error('in onZero, ' + (e as Error).message)
      }
    }

    return true
  }

  public removeAllWithData (obj: T) {
    Object.keys(this.cache).forEach((id) => {
      for (let i = this.cache[id].length - 1; i >= 0; i--) {
        if (this.cache[id][i] === obj) {
          this.remove(id, this.cache[id][i])
        }
      }
    })
  }

  public fire (id: string, data: any) {
    if (!this.cache[id]) {
      return false
    }

    this.cache[id].forEach((item: any) => {
      try {
        this.process(item, data, id)
      } catch (e) {
        // tslint:disable-next-line
        console.error('in process, ' + (e as Error).message)
      }
    })

    return true
  }

  public has (id: string) {
    return this.cache[id] && this.cache[id].length > 0
  }

  public keys () {
    return Object.keys(this.cache).filter((key) => this.cache[key] && this.cache[key].length > 0)
  }

  public destroy () {
    Object.keys(this.cache).forEach((id: string) => {
      try {
        this.onZero(id)
      } catch (e) {
        // tslint:disable-next-line
        console.error('in onZero, ' + (e as Error).message)
      }
    })

    this.cache = {}
  }
}

export type Listener<T = any> = (data: T) => void

export function createListenerRegistry () {
  return new Registry<Listener>({
    process: (fn: Listener, data: any, id: string) => {
      fn(data)
    }
  })
}
