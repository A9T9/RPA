import storage from '../../common/storage'
import { PersistentCounter } from "../../common/counter/persistent_counter"
import { singletonGetter } from '../../common/ts_utils'
import { CounterOptions } from '../../common/counter/types'
import log from '../../common/log'

const STORAGE_KEY = 'OCR_CONVERSIONS_PER_DAY'

type Day = {
  year:   number;
  month:  number;
  date:   number;
}

type ValueType = {
  day:    Day;
  count:  number;
}

const today = (): Day => {
  const d = new Date()

  return {
    year:  d.getFullYear(),
    month: d.getMonth() + 1,
    date:  d.getDate()
  }
}

const isSameDay = (a: Day, b: Day): boolean => {
  return a.year === b.year &&
          a.month === b.month &&
          a.date === b.date
}

export const getOcrCommandCounter = singletonGetter((options: Required<CounterOptions>) => {
  const read = (): Promise<number> => {
    // log('getOcrCommandCounter - read')

    return storage.get(STORAGE_KEY)
    .then((val: ValueType | null) => {
      if (!val) return options.initial
      if (!isSameDay(today(), val.day)) return options.initial
      return val.count
    })
  }
  const write = (n: number): Promise<void> => {
    // log('getOcrCommandCounter - write', n)

    return storage.set(
      STORAGE_KEY,
      {
        day: today(),
        count: n
      }
    )
    .then(() => {})
  }

  return new PersistentCounter({
    ...options,
    read,
    write
  })
})
