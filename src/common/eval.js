import Interpreter from 'kd-js-interpreter'
import Ext from './web_extension'

export function evaluateScript (code) {
  const interpreter = new Interpreter(code)
  let regexChecked = false
  const run = () => {
    const hasMore = interpreter.run()
    // console.log('interpreter:>>', interpreter)

    if (!regexChecked && Ext.isFirefox()) {
      const includesRegex = interpreter.stateStack.map(x => x.node?.callee?.property?.name).filter(x => x).some(x => ['exec', 'search', 'match', 'replace', 'split'].includes(x))
      // console.log('regexChecked:>>', regexChecked)
      // console.log('includesRegex:>>', includesRegex)
      if (includesRegex) {
        throw new Error('E501: [Firefox only] executeScript_Sandbox does not support regular expressions.')
      }
      regexChecked = true
    }    

    if (!hasMore) {
      return Promise.resolve(interpreter.value)
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(run())
      }, 100)
    })
  }

  return run()
}
