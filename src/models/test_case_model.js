import { uid } from '../common/utils'
import db from './db'

const model = {
  table: db.testCases,
  list: () => {
    return db.testCases.toArray()
  },
  insert: (data) => {
    if (!data.name) {
      throw new Error('Model TestCase - insert: missing name')
    }

    if (!data.data) {
      throw new Error('Model TestCase - insert: missing data')
    }

    data.updateTime = new Date() * 1
    data.id         = uid()
    return db.testCases.add(data)
  },
  bulkInsert: (tcs) => {
    const list = tcs.map(data => {
      if (!data.name) {
        throw new Error('Model TestCase - insert: missing name')
      }

      if (!data.data) {
        throw new Error('Model TestCase - insert: missing data')
      }

      data.updateTime = new Date() * 1
      data.id         = uid()

      return data
    })

    return db.testCases.bulkAdd(list)
  },
  update: (id, data) => {
    return db.testCases.update(id, data)
  },
  remove: (id) => {
    return db.testCases.delete(id)
  }
}

export default model
