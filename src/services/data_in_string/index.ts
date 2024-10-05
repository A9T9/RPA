
const DELIM = ' //__//__// '

export function decodeDataInString (raw: string): { str: string, data: Record<string, string>} {
  const parts = raw.split(DELIM)

  switch (parts.length) {
    case 1:
      return {
        str:  raw,
        data: {}
      }

    case 2: {
      return {
        str:  parts[0],
        data: decodeQuery(parts[1])
      }
    }

    default: {
      throw new Error('Invalid string: ' + raw)
    }
  }
}

export function encodeDataInString (data: Record<string, string>, str: string): string {
  const prev = decodeDataInString(str)
  const raw  = prev.str
  const obj  = { ...prev.data, ...data }

  return raw + DELIM + encodeQuery(obj)
}

export function decodeQuery (query: string): Record<string, string> {
  return query.trim().split('&').reduce((prev, str) => {
    const [key, val] = str.split('=')
    prev[decodeURIComponent(key)] = decodeURIComponent(val)
    return prev
  }, {} as Record<string, string>)
}

export function encodeQuery (data: Record<string, string>): string {
  return Object.keys(data).map((key) => {
    return `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`
  })
  .join('&')
}
