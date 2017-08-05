
// delay the call of a function and return a promise
export const delay = (fn, timeout) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(fn())
      } catch (e) {
        reject(e)
      }
    }, timeout)
  })
}

// Poll on whatever you want to check, and will time out after a specific duration
// `check` should return `{ pass: Boolean, result: Any }`
// `name` is for a meaningful error message
export const until = (name, check, interval = 1000, expire = 10000) => {
  const start = new Date()
  const go    = () => {
    if (expire && new Date() - start >= expire) {
      throw new Error(`until: ${name} expired!`)
    }

    const { pass, result } = check()

    if (pass) return Promise.resolve(result)
    return delay(go, interval)
  }

  return new Promise((resolve, reject) => {
    try {
      resolve(go())
    } catch (e) {
      reject(e)
    }
  })
}

export const range = (start, end, step = 1) => {
  const ret = []

  for (let i = start; i < end; i += step) {
    ret.push(i)
  }

  return ret
}

// create a curry version of the passed in function
export const partial = (fn) => {
  const len = fn.length
  let arbitary

  arbitary = (curArgs, leftArgCnt) => (...args) => {
    if (args.length >= leftArgCnt) {
      return fn.apply(null, curArgs.concat(args))
    }

    return arbitary(curArgs.concat(args), leftArgCnt - args.length)
  }

  return arbitary([], len)
}

export const reduceRight = (fn, initial, list) => {
  var ret = initial

  for (let i = list.length - 1; i >= 0; i--) {
    ret = fn(list[i], ret)
  }

  return ret
}

// compose functions into one
export const compose = (...args) => {
  return reduceRight((cur, prev) => {
    return x => cur(prev(x))
  }, x => x, args)
}

export const map = partial((fn, list) => {
  var result = []

  for (let i = 0, len = list.length; i < len; i++) {
    result.push(fn(list[i]))
  }

  return result
})

export const on = partial((key, fn, dict) => {
  if (Array.isArray(dict)) {
    return [
      ...dict.slice(0, key),
      fn(dict[key]),
      ...dict.slice(key + 1)
    ]
  }

  return Object.assign({}, dict, {
    [key]: fn(dict[key])
  })
})

// immutably update any part in an object
export const updateIn = partial((keys, fn, obj) => {
  const updater = compose.apply(null, keys.map(key => on(key)))
  return updater(fn)(obj)
})

// immutably set any part in an object
// a restricted version of updateIn
export const setIn = partial((keys, value, obj) => {
  const updater = compose.apply(null, keys.map(key => on(key)))
  return updater(() => value)(obj)
})

// return part of the object with a few keys deep inside
export const getIn = partial((keys, obj) => {
  return keys.reduce((prev, key) => {
    if (!prev)  return prev
    return prev[key]
  }, obj)
})

// return the passed in object with only certains keys
export const pick = (keys, obj) => {
  return keys.reduce((prev, key) => {
    prev[key] = obj[key]
    return prev
  }, {})
}

export const uid = () => {
  return '' + (new Date() * 1) + '.' +
         Math.floor(Math.random() * 10000000).toString(16)
}

export const flatten = (list) => {
  return [].concat.apply([], list);
}
