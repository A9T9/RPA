import { uid, pick, compose, on, map } from '../common/utils'
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
    return db.testCases.add(normalizeTestCase(data))
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

      return normalizeTestCase(data)
    })

    return db.testCases.bulkAdd(list)
  },
  update: (id, data) => {
    return db.testCases.update(id, normalizeTestCase(data))
  },
  remove: (id) => {
    return db.testCases.delete(id)
  }
}

export default model

export const normalizeCommand = (command) => {
  return pick(['cmd', 'target', 'value'], command)
}

export const normalizeTestCase = (testCase) => {
  return compose(
    on('data'),
    on('commands'),
    map
  )(normalizeCommand)(testCase)
}

export const commandWithoutBaseUrl = (baseUrl) => (command) => {
  if (command.cmd !== 'open') return command

  return {
    ...command,
    target: (baseUrl + '/' + command.target).replace(/\/+/g, '/')
  }
}

export const eliminateBaseUrl = (testCase) => {
  if (!testCase.baseUrl)  return testCase
  return compose(
    on('data'),
    on('commands'),
    map
  )(commandWithoutBaseUrl(testCase.baseUrl))(testCase)
}
