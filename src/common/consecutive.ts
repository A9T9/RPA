
export interface Consecutive {
  interval: number,
  count: number
}

export type WeakConsecutive = boolean | Consecutive

export type ConsecutiveFunction = () => Promise<boolean>

export function consecutive (c: WeakConsecutive): Consecutive {
  if (typeof c === 'boolean') {
    return {
      interval: 0,
      count: c ? 1 : 0
    }
  }
  return c
}

const timeout = (duration: number) => {
  return new Promise(resolve => {
    setTimeout(resolve, duration)
  })
}

export function withConsecutive(c: WeakConsecutive, fn: ConsecutiveFunction): Promise<boolean> {
  const { interval, count } = consecutive(c)
  let counter = count

  const next = (pass: boolean): Promise<boolean> => {
    if (!pass)            throw new Error('failed to run consecutive')
    if (counter-- <= 0)   return Promise.resolve(true)

    return timeout(interval).then(fn).then(next)
  }

  return fn()
  .then(next)
}
