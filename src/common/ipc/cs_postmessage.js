
const TYPE = 'SELENIUM_IDE_CS_MSG'

export const postMessage = (targetWin, myWin, payload, target = '*', timeout = 60000) => {
  return new Promise((resolve, reject) => {
    if (!targetWin || !targetWin.postMessage) {
      throw new Error('csPostMessage: targetWin is not a window', targetWin)
    }

    if (!myWin || !myWin.addEventListener || !myWin.removeEventListener) {
      throw new Error('csPostMessage: myWin is not a window', myWin)
    }

    const secret  = Math.random()
    const type    = TYPE

    // Note: create a listener with a corresponding secret every time
    const onMsg   = (e) => {
      if (e.data && e.data.type === TYPE && !e.data.isRequest && e.data.secret === secret) {
        myWin.removeEventListener('message', onMsg)
        const { payload, error } = e.data

        if (error)                  return reject(new Error(error))
        if (payload !== undefined)  return resolve(payload)

        reject(new Error('csPostMessage: No payload nor error found'))
      }
    }

    myWin.addEventListener('message', onMsg)

    // Note:
    // * `type` to make sure we check our own msg only
    // * `secret` is for 1 to 1 relationship between a msg and a listener
    // * `payload` is the real data you want to send
    // * `isRequest` is to mark that it's not an answer to some previous request
    targetWin.postMessage({
      type,
      secret,
      payload,
      isRequest: true
    }, target)

    setTimeout(() => {
      reject(new Error(`csPostMessage: timeout ${timeout} ms`))
    }, timeout)
  })
}

export const onMessage = (win, fn) => {
  if (!win || !win.addEventListener || !win.removeEventListener) {
    throw new Error('csOnMessage: not a window', win)
  }

  const onMsg = (e) => {
    // Note: only respond to msg with `isRequest` as true
    if (e && e.data && e.data.type === TYPE && e.data.isRequest && e.data.secret) {
      const tpl = {
        type: TYPE,
        secret: e.data.secret
      }

      // Note: wrapped with a new Promise to catch any exception during the execution of fn
      new Promise((resolve, reject) => {
        let ret;

        try {
          ret = fn(e.data.payload, {
            source: e.source
          })
        } catch (err) {
          reject(err)
        }

        // Note: only resolve if returned value is not undefined. With this, we can have multiple
        // listeners added to onMessage, and each one takes care of what it really cares
        if (ret !== undefined) {
          resolve(ret)
        }
      })
      .then(
        (res) => {
          e.source.postMessage({
            ...tpl,
            payload: res
          }, '*')
        },
        (err) => {
          e.source.postMessage({
            ...tpl,
            error: err.message
          }, '*')
        }
      )
    }
  }

  win.addEventListener('message', onMsg)
  return () => win.removeEventListener('message', onMsg)
}
