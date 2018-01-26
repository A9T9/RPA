import parseJson from 'parse-json'
import { formatDate } from './utils'

export const stringifyTestSuite = (testSuite, testCases) => {
  const obj = {
    creationDate: formatDate(new Date()),
    name: testSuite.name,
    macros: testSuite.cases.map(item => {
      const loops   = parseInt(item.loops, 10)
      const tcId    = item.testCaseId
      const tc      = testCases.find(tc => tc.id === tcId)
      const tcName  = tc.name || '(Test case not found)'

      return {
        macro: tcName,
        loops: loops
      }
    })
  }

  return JSON.stringify(obj, null, 2)
}

export const parseTestSuite = (text, testCases) => {
  const obj = parseJson(text)

  if (typeof obj.name !== 'string' || obj.name.length === 0) {
    throw new Error('name must be a string')
  }

  if (!Array.isArray(obj.macros)) {
    throw new Error('macros must be an array')
  }

  const cases = obj.macros.map(item => {
    const tc = testCases.find(tc => tc.name === item.macro)

    if (!tc) {
      throw new Error(`No macro found with name '${item.macro}'`)
    }

    if (typeof item.loops !== 'number' || item.loops < 1) {
      item.loops = 1
    }

    return {
      testCaseId: tc.id,
      loops: item.loops
    }
  })

  const ts  = {
    name: obj.name,
    fold: obj.fold,
    cases
  }

  return ts
}

export const validateTestSuiteText = parseTestSuite
