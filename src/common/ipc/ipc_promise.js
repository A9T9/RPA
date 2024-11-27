import config from '@/config'
import { retry } from '@/common/utils'

let TO_BE_REMOVED = false;

let log = function (msg) {
  if (console && console.log) console.log(msg);
};

let transformError = function (err) {
  console.error(err)

  if (err instanceof Error) {
    return {
      isError: true,
      name: err.name,
      message: err.message,
      stack: err.stack
    }
  }

  return err
}

// Note: The whole idea of ipc promise is about transforming the callback style
// ipc communication API to a Promise style
//
// eg. Orignial:    `chrome.runtime.sendMessage({}, () => {})`
//     ipcPromise:  `ipc.ask({}).then(() => {})`
//
// The benifit is
// 1. You can chain this promise with others
// 2. Create kind of connected channels between two ipc ends
//
// This is a generic interface to define a ipc promise utility
// All you need to declare is 4 functions
//
// e.g.
// ```
// ipcPromise({
//   ask: function (uid, cmd, args) { ... },
//   answer: function (uid, err, data) { ... },
//   onAsk: function (fn) { ... },
//   onAnswer: function (fn) { ... },
// })
// ```
function ipcPromise (options) {
  let ask         = options.ask
  let answer      = options.answer
  let timeout     = options.timeout
  let onAnswer    = options.onAnswer
  let onAsk       = options.onAsk
  let userDestroy = options.destroy
  let checkReady  = options.checkReady || function () { return Promise.resolve(true) }

  let nid = 0
  let askCache = {}
  let unhandledAsk = []
  let markUnhandled = function (uid, cmd, args) {
    unhandledAsk.push({ uid: uid, cmd: cmd, args: args });
  }
  let handler = markUnhandled

  let getNextNid = () => {
    nid = (nid + 1) % 100000
    return nid
  }

  let runHandlers = (handlers, cmd, args, resolve, reject) => {
    for (let i = 0, len = handlers.length; i < len; i++) {
      let res

      try {
        res = handlers[i](cmd, args)
      } catch (e) {
        return reject(e)
      }

      if (res !== undefined) {
        return resolve(res)
      }
    }
    // Note: DO NOT resolve anything if all handlers return undefined
  }

  // both for ask and unhandledAsk
  timeout = timeout || -1;

  onAnswer(function (uid, err, data) {
    if (uid && askCache[uid] === TO_BE_REMOVED) {
      delete askCache[uid];
      return;
    }

    if (!uid || !askCache[uid]) {
      // log('ipcPromise: response uid invalid: ' + uid);
      return;
    }

    let resolve = askCache[uid][0];
    let reject  = askCache[uid][1];

    delete askCache[uid];

    if (err) {
      reject(transformError(err));
    } else {
      resolve(data);
    }
  });

  onAsk(function (uid, cmd, args) {
    if (timeout > 0) {
      setTimeout(function () {
        let found = unhandledAsk && unhandledAsk.find(function (item) {
          return item.uid === uid;
        });

        if (!found) return;

        answer(uid, new Error('ipcPromise: answer timeout ' + timeout + ' for cmd "' + cmd + '", args "'  + args + '"'));
      }, timeout);
    }

    if (handler === markUnhandled) {
      markUnhandled(uid, cmd, args);
      return;
    }

    return new Promise((resolve, reject) => {
      runHandlers(handler, cmd, args, resolve, reject)
    })
    .then(
      function (data) {
        // note: handler doesn't handle the cmd => return undefined, should wait for timeout
        if (data === undefined)  return markUnhandled(uid, cmd, args);
        answer(uid, null, data)
      },
      function (err)  {
        answer(uid, transformError(err), null)
      }
    );
  });

  let wrapAsk = function (cmd, args, timeoutToOverride) {
    let uid = 'ipcp_' + new Date() * 1 + '_' + getNextNid();
    let finalTimeout = timeoutToOverride || timeout
    let timer

    if (args && args.payload && args.payload.args && args.payload.args.command && args.payload.args.command.cmd) {
      let cmd = args.payload.args.command.cmd
      if (cmd === 'executeScript') {
        let minimumTimeout = config.executeScript.minimumTimeout // 5000
        finalTimeout = finalTimeout < minimumTimeout ? minimumTimeout : finalTimeout
      }
    }

    const ignoreCommands = ['SET_STATUS']
    // Note: make it possible to disable timeout
    if (finalTimeout > 0 && !ignoreCommands.includes(cmd)) {
      timer = setTimeout(function () {
        let reject;

        if (askCache && askCache[uid]) {
          // console.log('== cmd:>> ', cmd)
          // console.log('== args:>> ', args)
          // console.log('== timeout:>> ', timeout)
          // console.log('== timeoutToOverride:>> ', timeoutToOverride)
          // console.log('== finalTimeout:>> ', finalTimeout) 
          reject = askCache[uid][1];
          askCache[uid] = TO_BE_REMOVED;
          console.error('ipcPromise: onAsk timeout ' + finalTimeout + ' for cmd "' + cmd + '", args '  + stringify(args));
          const errMsg = `Error #102: Lost contact to website`;
          reject(new Error(errMsg));
        }
      }, finalTimeout);
    }

    return new Promise(function (resolve, reject) {
      askCache[uid] = [resolve, reject];

      Promise.resolve(
        ask(uid, cmd, args || [])
      )
      .catch(e => {
        reject(e)
      })
    })
    .then(
      (data) => {
        if (timer) {
          clearTimeout(timer)
        }
        return data
      },
      (e) => {
        if (timer) {
          clearTimeout(timer)
        }
        throw e
      }
    );
  }

  let wrapOnAsk = function (fn) {
    if (Array.isArray(handler)) {
      handler.push(fn)
    } else {
      handler = [fn]
    }

    let ps = unhandledAsk.map(function (task) {
      return new Promise((resolve, reject) => {
        runHandlers(handler, task.cmd, task.args, resolve, reject)
      })
      .then(
        function (data) {
          // note: handler doens't handle the cmd => return undefined, should wait for timeout
          if (data === undefined)  return;
          answer(task.uid, null, data);
          return task.uid;
        },
        function (err) {
          answer(task.uid, err, null);
          return task.uid;
        }
      );
    });

    Promise.all(ps).then(function (uids) {
      for (let uid of uids) {
        if (uid === undefined)  continue;

        let index = unhandledAsk.findIndex(function (item) {
          return item.uid === uid;
        });

        unhandledAsk.splice(index, 1);
      }
    });
  };

  let destroy = function (noReject) {
    userDestroy && userDestroy();

    ask = null;
    answer = null;
    onAnswer = null;
    onAsk = null;
    unhandledAsk = null;

    if (!noReject) {
      Object.keys(askCache).forEach(function (uid) {
        let tuple = askCache[uid];
        let reject = tuple[1];
        reject && reject(new Error('IPC Promise has been Destroyed.'));
        delete askCache[uid];
      });
    }
  };

  let waitForReady = function (checkReady, fn) {
    return (...args) => {
      const makeSureReady = retry(checkReady, {
        shouldRetry: () => true,
        retryInterval: 200,
        timeout: 6000
      })

      return makeSureReady().then(() => fn(...args))
    }
  }

  return {
    ask: waitForReady(checkReady, wrapAsk),
    onAsk: wrapOnAsk,
    destroy: destroy
  };
}

ipcPromise.serialize = function (obj) {
  return {
    ask: function (cmd, args, timeout) {
      return obj.ask(cmd, JSON.stringify(args), timeout);
    },

    onAsk: function (fn) {
      return obj.onAsk(function (cmd, args) {
        return fn(cmd, JSON.parse(args));
      });
    },

    destroy: obj.destroy
  };
};

function stringify (v) {
  return v === undefined ? 'undefined' : JSON.stringify(v)
}

module.exports = ipcPromise;
