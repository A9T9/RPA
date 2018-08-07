import { onMessage } from '../common/ipc/cs_postmessage'

const clone = (data) => {
  const str = JSON.stringify(data)
  if (str === undefined)  return undefined
  return JSON.parse(str)
}

onMessage(window, ({ cmd, args }) => {
  switch (cmd) {
    case 'INJECT_READY': {
      document.body.setAttribute('data-injected', 'done')
      return true
    }

    case 'INJECT_RUN_EVAL': {
      // Note: clone the data in case it contains some Object that can't be passed via postMessage (eg. HTMLDocument)
      // eslint-disable-next-line no-eval
      return { result: clone(window.eval(args.code)) }
    }
  }
})
