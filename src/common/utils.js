
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

export const objMap = (fn, obj) => {
  return Object.keys(obj).reduce((prev, key, i) => {
    prev[key] = fn(obj[key], key, i)
    return prev
  }, {})
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

export const toRegExp = (str, { needEncode = false, flag = '' } = {}) => {
  return new RegExp(
    needEncode ? str.replace(/[[\](){}^$.*+?|]/g, '\\$&') : str,
    flag
  )
}

export const insertScript = (file) => {
  const s = document.constructor.prototype.createElement.call(document, 'script')

  s.setAttribute('type', 'text/javascript')
  s.setAttribute('src', file)

  document.documentElement.appendChild(s)
  s.parentNode.removeChild(s)
}

export const withTimeout = (timeout, fn) => {
  return new Promise((resolve, reject) => {
    const cancel  = () => clearTimeout(timer)
    const timer   = setTimeout(() => {
      reject(new Error('withTimeout: timeout'))
    }, timeout)

    fn(cancel)
    .then(
      data => {
        cancel()
        resolve(data)
      },
      e => {
        cancel()
        reject(e)
      }
    )
  })
}

export const retry = (fn, options) => (...args) => {
  const { timeout, onFirstFail, onFinal, shouldRetry, retryInterval } = {
    timeout: 5000,
    retryInterval: 1000,
    onFirstFail:  () => {},
    onFinal:      () => {},
    shouldRetry:  () => false,
    ...options
  }

  let retryCount    = 0
  let lastError     = null
  let timerToClear  = null
  let done          = false

  const wrappedOnFinal = (...args) => {
    done = true

    if (timerToClear) {
      clearTimeout(timerToClear)
    }

    return onFinal(...args)
  }

  const intervalMan = (function () {
    let lastInterval      = null
    const intervalFactory = (function () {
      switch (typeof retryInterval) {
        case 'function':
          return retryInterval

        case 'number':
          return () => retryInterval

        default:
          throw new Error('retryInterval must be either a number or a function')
      }
    })()

    return {
      getLastInterval: () => lastInterval,
      getInterval: () => {
        const interval = intervalFactory(retryCount, lastInterval)
        lastInterval = interval
        return interval
      }
    }
  })()

  const onError = (e, reject) => {
    if (!shouldRetry(e, retryCount)) {
      wrappedOnFinal(e)

      if (reject) return reject(e)
      else        throw e
    }
    lastError = e

    return new Promise((resolve, reject) => {
      if (retryCount++ === 0) {
        onFirstFail(e)
        timerToClear = setTimeout(() => {
          wrappedOnFinal(lastError)
          reject(lastError)
        }, timeout)
      }

      if (done) return

      delay(run, intervalMan.getInterval())
      .then(resolve, e => onError(e, reject))
    })
  }

  const run = () => {
    return fn(...args, {
      retryCount,
      retryInterval: intervalMan.getLastInterval()
    })
    .catch(onError)
  }

  return run()
  .then((result) => {
    wrappedOnFinal(null, result)
    return result
  })
}

// refer to https://stackoverflow.com/questions/12168909/blob-from-dataurl
export function dataURItoArrayBuffer (dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(
    /^data:/.test(dataURI) ? dataURI.split(',')[1] : dataURI
  );

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length);

  // create a view into the buffer
  var ia = new Uint8Array(ab);

  // set the bytes of the buffer to the correct values
  for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }

  return ab
}

export function dataURItoBlob (dataURI) {
  var ab = dataURItoArrayBuffer(dataURI)
  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
  // write the ArrayBuffer to a blob, and you're done
  var blob = new Blob([ab], {type: mimeString});
  return blob;
}

export function blobToDataURL (blob) {
  return new Promise((resolve, reject) => {
      let reader = new FileReader()
      reader.onerror = reject
      reader.onload = (e) => {
        const str = reader.result
        const b64 = 'base64,'
        const i   = str.indexOf(b64)
        const ret = str.substr(i + b64.length)

        resolve(ret)
      }
      reader.readAsDataURL(blob)
  })
}

export function arrayBufferToString (buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf))
}

export function stringToArrayBuffer (str) {
  var buf = new ArrayBuffer(str.length * 2) // 2 bytes for each char
  var bufView = new Uint16Array(buf)

  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return buf
}

export const randomName = (length = 6) => {
  if (length <= 0 || length > 100)  throw new Error('randomName, length must be between 1 and 100')

  const randomChar = () => {
    const n = Math.floor(62 * Math.random())
    let code

    if (n <= 9) {
      code = 48 + n
    } else if (n <= 35) {
      code = 65 + n - 10
    } else {
      code = 97 + n - 36
    }

    return String.fromCharCode(code)
  }

  return range(0, length).map(randomChar).join('')
}

export const withFileExtension = (origName, fn) => {
  const reg = /\.\w+$/
  const m   = origName.match(reg)

  const extName   = m ? m[0] : ''
  const baseName  = m ? origName.replace(reg, '') : origName
  const result    = fn(baseName, (name) => name + extName)

  if (!result) {
    throw new Error('withFileExtension: should not return null/undefined')
  }

  if (typeof result.then === 'function') {
    return result.then(name => name + extName)
  }

  return result + extName
}

export const uniqueName = (name, options) => {
  const opts = {
    generate: (old, step = 1) => {
      const reg = /_\((\d+)\)$/
      const m   = old.match(reg)

      if (!m) return `${old}_(${step})`
      return old.replace(reg, (_, n) => `_(${parseInt(n, 10) + step})`)
    },
    check: () => Promise.resolve(true),
    ...options
  }
  const { generate, check } = opts

  return withFileExtension(name, (baseName, getFullName) => {
    const go = (fileName, step) => {
      return check(getFullName(fileName))
      .then(pass => {
        if (pass) return fileName
        return go(generate(fileName, step), step)
      })
    }

    return go(baseName, 1)
  })
}

export const and = (...list) => list.reduce((prev, cur) => prev && cur, true)

export const loadCsv = (url) => {
  return fetch(url)
  .then(res => {
    if (!res.ok)  throw new Error(`failed to load csv - ${url}`)
    return res.text()
  })
}

export const loadImage = (url) => {
  return fetch(url)
  .then(res => {
    if (!res.ok)  throw new Error(`failed to load image - ${url}`)
    return res.blob()
  })
}

export const ensureExtName = (ext, name) => {
  const extName = ext.indexOf('.') === 0 ? ext : ('.' + ext)
  if (name.lastIndexOf(extName) + extName.length === name.length) return name
  return name + extName
}

export const validateStandardName = (name, isFileName) => {
  if (!isFileName && !/^_|[a-zA-Z]/.test(name)) {
    throw new Error(`must start with a letter or the underscore character.`)
  }

  if (isFileName && !/^_|[a-zA-Z0-9]/.test(name)) {
    throw new Error(`must start with alpha-numeric or the underscore character.`)
  }

  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`can only contain alpha-numeric characters and underscores (A-z, 0-9, and _ )`)
  }
}

export const sanitizeFileName = (fileName) => {
  return withFileExtension(fileName, (baseName) => baseName.replace(/[^a-zA-Z0-9_]/g, '_'))
}

export const getScreenDpi = () => {
  const DEFAULT_DPI = 96
  const matchDpi = (dpi) => {
    return window.matchMedia(`(max-resolution: ${dpi}dpi)`).matches === true
  }

  // We iteratively scan all possible media query matches.
  // We can't use binary search, because there are "many" correct answer in
  // problem space and we need the very first match.
  // To speed up computation we divide problem space into buckets.
  // We test each bucket's first element and if we found a match,
  // we make a full scan for previous bucket with including first match.
  // Still, we could use "divide-and-conquer" for such problems.
  // Due to common DPI values, it's not worth to implement such algorithm.

  const bucketSize = 24 // common divisor for 72, 96, 120, 144 etc.

  for (let i = bucketSize; i < 3000; i += bucketSize) {
    if (matchDpi(i)) {
      const start = i - bucketSize
      const end   = i

      for (let k = start; k <= end; ++k) {
        if (matchDpi(k)) {
          return k
        }
      }
    }
  }

  return DEFAULT_DPI; // default fallback
}

export const dpiFromFileName = (fileName) => {
  const reg = /_dpi_(\d+)/i
  const m = fileName.match(reg)
  return m ? parseInt(m[1], 10) : 0
}

export const mockAPIWith = (factory, mock, promiseFunctionKeys = []) => {
  let real = mock
  let exported = objMap((val, key) => {
    if (typeof val === 'function') {
      if (promiseFunctionKeys.indexOf(key) !== -1) {
        return (...args) => p.then(() => real[key](...args))
      } else {
        return (...args) => {
          p.then(() => real[key](...args))
          return real[key](...args)
        }
      }
    } else {
      return val
    }
  }, mock)

  const p = Promise.resolve(factory())
            .then(api => { real = api })

  return exported
}

export const withCountDown = (options) => {
  const { interval, timeout, onTick } = options
  let past = 0

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      past += interval

      try {
        onTick({ past, total: timeout })
      } catch (e) { console.error(e) }

      if (past >= timeout)  clearInterval(timer)
    }, interval)

    const p = delay(() => {}, timeout)
    .then(() => clearInterval(timer))

    resolve(p)
  })
}
