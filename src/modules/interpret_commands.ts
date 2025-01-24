import { getStorageManager } from '@/services/storage'
import { runCsFreeCommands } from './run_command'
import { stringifyToCSV, parseFromCSV } from '@/common/csv'
import * as act from '@/actions'

export const interpretSpecialCommands = ({ store, vars, getTcPlayer, getInterpreter, xCmdCounter }) => {
  const commandRunners = [interpretCSVCommands({ store, vars, getTcPlayer, getInterpreter, xCmdCounter }), interpretCsFreeCommands()]

  return (command, index) => {
    return commandRunners.reduce((prev, cur) => {
      if (prev !== undefined) return prev
      return cur(command, index)
    }, undefined)
  }
}

export const interpretCSVCommands =
  ({ store, vars }) =>
  (command, index) => {
    const csvStorage = getStorageManager().getCSVStorage()
    const { cmd, target, value } = command
    const assertCsvExist = (target) => {
      return csvStorage.exists(target).then((isExisted) => {
        if (isExisted) {
          if (!vars.get('!CsvReadLineNumber')) {
            vars.set({ '!CsvReadLineNumber': 1 }, true)
          }
          return
        }

        vars.set({ '!CsvReadStatus': 'FILE_NOT_FOUND' }, true)

        let errMsg = `E325: csv file '${target}' does not exist`

        if (getStorageManager().isBrowserMode() && (pathPosix.isAbsolute(target) || pathWin32.isAbsolute(target))) {
          errMsg += '. Full path works only in hard-drive mode.'
        }

        throw new Error(errMsg)
      })
    }

    switch (cmd) {
      case 'csvRead': {
        if (value && value.length > 0) {
          store.dispatch(act.addLog('warning', 'csvRead: Value field should be empty (not used)'))
        }

        return assertCsvExist(target).then(() => {
          return csvStorage
            .read(target, 'Text')
            .then(parseFromCSV)
            .then((rows) => {
              // Note: !CsvReadLineNumber starts from 1
              const index = vars.get('!CsvReadLineNumber') - 1
              const row = rows[index]

              if (index >= rows.length) {
                vars.set({ '!CsvReadStatus': 'END_OF_FILE' }, true)
                throw new Error('end of csv file reached')
              } else {
                vars.set(
                  {
                    '!CsvReadStatus': 'OK',
                    '!CsvReadMaxRow': rows.length
                  },
                  true
                )
              }

              vars.clear(/^!COL\d+$/i)

              row.forEach((data, i) => {
                vars.set({ [`!COL${i + 1}`]: data })
              })

              return {
                isFlowLogic: true
              }
            })
        })
      }

      case 'csvSave': {
        const csvLine = vars.get('!CSVLINE')

        if (!csvLine || !csvLine.length) {
          throw new Error('No data to save to csv')
        }

        return stringifyToCSV([csvLine])
          .then((newLineText) => {
            const fileName = /\.csv$/i.test(target) ? target : target + '.csv'

            return csvStorage.exists(fileName).then((isExisted) => {
              if (!isExisted) {
                return csvStorage.write(fileName, new Blob([newLineText]))
              }

              return csvStorage.read(fileName, 'Text').then((originalText) => {
                const text = (originalText + '\n' + newLineText).replace(/\n+/g, '\n')
                return csvStorage.overwrite(fileName, new Blob([text]))
              })
            })
          })
          .then(() => {
            vars.clear(/^!CSVLINE$/)
            store.dispatch(act.listCSV())
          })
          .then(() => ({
            isFlowLogic: true
          }))
      }

      case 'csvReadArray': {
        if (!value || !value.length) {
          throw new Error('E326: Please provide variable name as value')
        }

        return assertCsvExist(target).then(() => {
          return csvStorage
            .read(target, 'Text')
            .then(parseFromCSV)
            .then(
              (rows) => {
                vars.set(
                  {
                    '!CsvReadStatus': true,
                    '!CsvReadMaxRow': rows.length
                  },
                  true
                )

                return {
                  byPass: true,
                  vars: {
                    [value]: rows
                  }
                }
              },
              (e) => {
                vars.set({ '!CsvReadStatus': false }, true)
                return Promise.reject(e)
              }
            )
        })
      }

      case 'csvSaveArray': {
        if (!value || !value.length) {
          throw new Error('E327: Please provide csv file name as value')
        }

        if (!target || !target.length) {
          throw new Error('E328: Please provide array variable name as target')
        }

        const arr = vars.get(target)

        if (!arr) {
          throw new Error(`E329: No variable found with name '${target}'`)
        }

        const isValidCsvArray = Array.isArray(arr) && Array.from(arr).every((item) => Array.isArray(item))

        if (!isValidCsvArray) {
          throw new Error('E330: Array must be two dimensional array')
        }

        return stringifyToCSV(arr)
          .then((csvText) => {
            const fileName = /\.csv$/i.test(value) ? value : value + '.csv'
            return csvStorage.overwrite(fileName, new Blob([csvText]))
          })
          .then(() => {
            store.dispatch(act.listCSV())
          })
          .then(() => ({
            isFlowLogic: true
          }))
      }

      default:
        return undefined
    }
  }

export const interpretCsFreeCommands = () => {
  return runCsFreeCommands
}
