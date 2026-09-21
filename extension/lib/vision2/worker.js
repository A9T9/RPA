// vision2 worker: xmodule2's Rust vision-core compiled to WASM (C ABI, no
// generated glue). Replaces the kantusearch engine for the new code path.
// Protocol mirrors /lib/imagesearch/worker.js so adaptors stay symmetric:
//   worker -> main: { type: 0 } once ready
//   main -> worker: { type: 1, data: { id, args, result: null } }
//   worker -> main: { type: 1, data: { id, result } }
// args: { image: ImageData, pattern: ImageData,
//         options: { minSimilarity, allowSizeVariation, maxMatches? },
//         patternScaleX: number  // DPI prior: pattern scale on this image
//       }
// result: { errorCode: 0, containsGreenPinkBoxes: false,
//           regions: [{ matchedRect: {left,top,width,height}, score, order }] }

'use strict'

const MSG_INIT = 0
const MSG_JOB = 1
const MAX_MATCHES = 32

let wasm = null

const pReady = fetch(new URL('vision2.wasm', self.location.href))
  .then(resp => WebAssembly.instantiateStreaming
    ? WebAssembly.instantiateStreaming(resp, {})
    : resp.arrayBuffer().then(buf => WebAssembly.instantiate(buf, {})))
  .then(mod => {
    wasm = mod.instance.exports
    self.postMessage({ type: MSG_INIT })
  })

// RGBA -> interleaved RGB for the COLOR matcher (xm2_search_rgb) — hue-only
// targets like a red button vanish in grayscale, so the color path is the
// primary one (matches the native host, which also searches in RGB).
function toRgb (imageData) {
  const src = imageData.data
  const n = imageData.width * imageData.height
  const rgb = new Uint8Array(n * 3)
  for (let i = 0; i < n; i++) {
    rgb[i * 3] = src[i * 4]
    rgb[i * 3 + 1] = src[i * 4 + 1]
    rgb[i * 3 + 2] = src[i * 4 + 2]
  }
  return rgb
}

function copyIn (bytes) {
  const ptr = wasm.xm2_alloc(bytes.length)
  new Uint8Array(wasm.memory.buffer, ptr, bytes.length).set(bytes)
  return ptr
}

function search (args) {
  const image = args.image
  const pattern = args.pattern
  const options = args.options || {}

  const hayRgb = toRgb(image)
  const patRgb = toRgb(pattern)
  const hayPtr = copyIn(hayRgb)
  const patPtr = copyIn(patRgb)
  const outPtr = wasm.xm2_alloc(MAX_MATCHES * 6 * 4)

  try {
    const count = wasm.xm2_search_rgb(
      hayPtr, image.width, image.height,
      patPtr, pattern.width, pattern.height,
      Math.max(0.1, Math.min(1.0, options.minSimilarity || 0.8)),
      args.patternScaleX > 0 ? args.patternScaleX : 1.0,
      options.allowSizeVariation ? 1 : 0,
      Math.min(MAX_MATCHES, options.maxMatches || MAX_MATCHES),
      outPtr
    )

    const flat = new Float32Array(wasm.memory.buffer, outPtr, count * 6)
    const regions = []
    for (let i = 0; i < count; i++) {
      regions.push({
        matchedRect: {
          left: flat[i * 6],
          top: flat[i * 6 + 1],
          width: flat[i * 6 + 2],
          height: flat[i * 6 + 3]
        },
        score: flat[i * 6 + 4],
        scale: flat[i * 6 + 5],
        order: i
      })
    }
    // Raster (scanline) order, same contract as the native cv family
    const byPos = regions.slice().sort((a, b) =>
      (a.matchedRect.top - b.matchedRect.top) || (a.matchedRect.left - b.matchedRect.left))
    regions.forEach(r => { r.order = byPos.indexOf(r) })

    return { errorCode: 0, containsGreenPinkBoxes: false, regions }
  } finally {
    wasm.xm2_free(hayPtr, hayRgb.length)
    wasm.xm2_free(patPtr, patRgb.length)
    wasm.xm2_free(outPtr, MAX_MATCHES * 6 * 4)
  }
}

self.onmessage = (e) => {
  const msg = e.data
  if (!msg || msg.type !== MSG_JOB || !msg.data) return
  pReady.then(() => {
    let result
    try {
      result = search(msg.data.args)
    } catch (err) {
      result = { errorCode: 1, containsGreenPinkBoxes: false, regions: [], error: String(err && err.message || err) }
    }
    self.postMessage({ type: MSG_JOB, data: { id: msg.data.id, result } })
  })
}
