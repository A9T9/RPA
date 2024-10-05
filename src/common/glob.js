import glob2reg from 'kd-glob-to-regexp'

export function globMatch (pattern, text, opts) {
  const reg = glob2reg(pattern, opts || {})
  const res = reg.test(text)
  return res
}
