import 'error-polyfill'
import parseJson from 'parse-json'
import { formatDate } from './utils'
import { getStorageManager } from '../services/storage'

export const stringifyTestSuite = (testSuite, opts = {}) => {
  const obj = {
    creationDate: formatDate(new Date()),
    name: testSuite.name,
    macros: testSuite.cases.map(item => {
      const loops   = parseInt(item.loops, 10)

      return {
        macro: item.testCaseId,
        loops: loops
      }
    }),
    ...(opts.withFold ? { fold: !!testSuite.fold } : {}),
    ...(opts.withId && testSuite.id ? { id: testSuite.id } : {}),
    ...(opts.withPlayStatus && testSuite.playStatus ? { playStatus: testSuite.playStatus } : {})
  }

  return JSON.stringify(obj, null, 2)
}

export const parseTestSuite = (text, opts = {}) => {
  // Note: Exported JSON from older version Kantu (via 'export to json')
  // has an invisible charactor (char code65279, known as BOM). It breaks JSON parser.
  // So it's safer to filter it out here
  const obj = parseJson(text.replace(/^\s*/, ''))

  if (typeof obj.name !== 'string' || obj.name.length === 0) {
    throw new Error('name must be a string')
  }

  if (!Array.isArray(obj.macros)) {
    throw new Error('macros must be an array')
  }

  const cases = obj.macros.map(item => {
    if (typeof item.loops !== 'number' || item.loops < 1) {
      item.loops = 1
    }

    return {
      testCaseId: item.macro,
      loops: item.loops
    }
  })

  const ts  = {
    cases,
    name: opts.fileName ? opts.fileName.replace(/\.json$/i, '') : obj.name,
    ...(opts.withFold ? { fold: obj.fold === undefined ? true : obj.fold } : {}),
    ...(opts.withId && obj.id ? { id: obj.id } : {}),
    ...(opts.withPlayStatus && obj.playStatus ? { playStatus: obj.playStatus } : {})
  }

  return ts
}

export const validateTestSuiteText = parseTestSuite
