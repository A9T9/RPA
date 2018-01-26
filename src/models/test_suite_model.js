import { uid, pick, compose, on, map } from '../common/utils'
import db from './db'

const model = {
  table: db.testSuites,
  list: () => {
    return db.testSuites.toArray()
  },
  insert: (data) => {
    if (!data.name) {
      throw new Error('Model TestSuite - insert: missing name')
    }

    if (!Array.isArray(data.cases)) {
      throw new Error('Model TestSuite - insert: cases should an array')
    }

    data.updateTime = new Date() * 1
    data.id         = uid()
    return db.testSuites.add(data)
  },
  bulkInsert: (tcs) => {
    const list = tcs.map(data => {
      if (!data.name) {
        throw new Error('Model TestSuite - insert: missing name')
      }

      if (!Array.isArray(data.cases)) {
        throw new Error('Model TestSuite - insert: cases should an array')
      }

      data.updateTime = new Date() * 1
      data.id         = uid()

      return data
    })

    return db.testSuites.bulkAdd(list)
  },
  update: (id, data) => {
    return db.testSuites.update(id, data)
  },
  remove: (id) => {
    return db.testSuites.delete(id)
  }
}

export default model
