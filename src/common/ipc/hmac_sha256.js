// SHA-256 and HMAC-SHA256, synchronous, dependency-free.
//
// Used by cs_postmessage.js to authenticate window.postMessage requests
// between content scripts. It is not WebCrypto because crypto.subtle only
// exists in secure contexts and a content script shares the page's: a macro on
// an http:// intranet page would have no HMAC at all. A message is a few
// hundred bytes, so the pure-JS cost is in the tens of microseconds.

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

const H0 = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]

const rotr = (x, n) => (x >>> n) | (x << (32 - n))

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null

export const utf8Bytes = (str) => {
  if (encoder) return encoder.encode(str)
  const s   = unescape(encodeURIComponent(str))
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

export const toHex = (bytes) => {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16)
  return s
}

export const sha256 = (msg) => {
  const len     = msg.length
  const padLen  = ((len + 9 + 63) >> 6) << 6
  const buf     = new Uint8Array(padLen)
  const view    = new DataView(buf.buffer)

  buf.set(msg)
  buf[len] = 0x80
  view.setUint32(padLen - 8, Math.floor((len * 8) / 0x100000000))
  view.setUint32(padLen - 4, (len * 8) >>> 0)

  const h = H0.slice()
  const w = new Uint32Array(64)

  for (let off = 0; off < padLen; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4)
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }

    let [a, b, c, d, e, f, g, hh] = h

    for (let i = 0; i < 64; i++) {
      const S1  = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch  = (e & f) ^ (~e & g)
      const t1  = (hh + S1 + ch + K[i] + w[i]) >>> 0
      const S0  = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2  = (S0 + maj) >>> 0

      hh = g; g = f; f = e
      e  = (d + t1) >>> 0
      d  = c; c = b; b = a
      a  = (t1 + t2) >>> 0
    }

    h[0] = (h[0] + a) >>> 0;  h[1] = (h[1] + b) >>> 0
    h[2] = (h[2] + c) >>> 0;  h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0;  h[5] = (h[5] + f) >>> 0
    h[6] = (h[6] + g) >>> 0;  h[7] = (h[7] + hh) >>> 0
  }

  const out = new Uint8Array(32)
  const ov  = new DataView(out.buffer)
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, h[i])
  return out
}

// key and msg: strings (utf-8) or Uint8Array. Returns lowercase hex.
export const hmacSha256Hex = (key, msg) => {
  let k = typeof key === 'string' ? utf8Bytes(key) : key
  const m = typeof msg === 'string' ? utf8Bytes(msg) : msg

  if (k.length > 64) k = sha256(k)

  const ipad = new Uint8Array(64 + m.length)
  const opad = new Uint8Array(64 + 32)
  for (let i = 0; i < 64; i++) {
    const kb = i < k.length ? k[i] : 0
    ipad[i]  = kb ^ 0x36
    opad[i]  = kb ^ 0x5c
  }
  ipad.set(m, 64)
  opad.set(sha256(ipad), 64)
  return toHex(sha256(opad))
}

// n random bytes as hex. crypto.getRandomValues exists in every context this
// runs in (page, content script, background), secure or not.
export const randomHex = (n) => {
  const bytes = new Uint8Array(n)
  crypto.getRandomValues(bytes)
  return toHex(bytes)
}

// Compare two hex digests without an early exit on the first difference.
export const digestsEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
