
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
export const until = (name, check, interval = 1000, expire = 10000, errorMsg) => {
  const start = new Date()
  const go    = () => {
    if (expire && new Date() - start >= expire) {
      const msg = errorMsg || `until: ${name} expired!`
      throw new Error(msg)
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
    if (obj[key] !== undefined) {
      prev[key] = obj[key]
    }
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

export const splitIntoTwo = (pattern, str) => {
  const index = str.indexOf(pattern)
  if (index === -1)  return [str]

  return [
    str.substr(0, index),
    str.substr(index + 1)
  ]
}

export const cn = (...args) => {
  return args.reduce((prev, cur) => {
    if (typeof cur === 'string') {
      prev.push(cur)
    } else {
      Object.keys(cur).forEach(key => {
        if (cur[key]) {
          prev.push(key)
        }
      })
    }

    return prev
  }, [])
  .join(' ')
}

export const formatDate = (d) => {
  const pad = (n) => n >= 10 ? ('' + n) : ('0' + n)
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(pad).join('-')
}

export const splitKeep = (pattern, str) => {
  const result    = []
  let startIndex  = 0
  let reg, match, lastMatchIndex

  if (pattern instanceof RegExp) {
    reg = new RegExp(
      pattern,
      pattern.flags.indexOf('g') !== -1 ? pattern.flags : (pattern.flags + 'g')
    )
  } else if (typeof pattern === 'string') {
    reg = new RegExp(pattern, 'g')
  }

  // eslint-disable-next-line no-cond-assign
  while (match = reg.exec(str)) {
    if (lastMatchIndex === match.index) {
      break
    }

    if (match.index > startIndex) {
      result.push(str.substring(startIndex, match.index))
    }

    result.push(match[0])
    startIndex      = match.index + match[0].length
    lastMatchIndex  = match.index
  }

  if (startIndex < str.length) {
    result.push(str.substr(startIndex))
  }

  return result
}

export const nameFactory = () => {
  const all = {}

  return (str) => {
    if (!all[str]) {
      all[str] = true
      return str
    }

    let n = 2
    while (all[str + '-' + n]) {
      n++
    }

    all[str + '-' + n] = true
    return str + '-' + n
  }
}

export const composePromiseFn = (...list) => {
  return reduceRight((cur, prev) => {
    return x => prev(x).then(cur)
  }, x => Promise.resolve(x), list)
}

export const parseQuery = (query) => {
  return query.slice(1).split('&').reduce((prev, cur) => {
    const index = cur.indexOf('=')
    const key = cur.substring(0, index)
    const val = cur.substring(index + 1)

    prev[key] = decodeURIComponent(val)
    return prev
  }, {})
}
