import { ConvertResultItem } from '../desktop'
import { greenPinkUnsupportedError } from '../xmodules2/routing'

// In-extension image search on xmodule2's Rust vision-core compiled to WASM
// (extension/lib/vision2/: worker.js + vision2.wasm, ~70KB, C-ABI, no glue).
// Same external contract as ../vision/adaptor.ts (the kantusearch engine) so
// the xmodule2 switch can route between them — with the agreed breaking
// change: green/pink patterns are NOT supported here. Old macros that use
// them stay on the old engine; new macros use the explicit anchor+offset
// search (native search_relative / a future worker job type).
//
// Matcher differences vs kantusearch worth knowing when comparing results:
// zero-mean NCC (flat regions can never false-positive), DPI-prior scale
// band via patternScale, guaranteed raster `order`.

const WORKER_URL = '/lib/vision2/worker.js'

const MSG_INIT = 0
const MSG_JOB = 1

type WorkerRect = { left: number; top: number; width: number; height: number }

type WorkerRegion = {
  matchedRect: WorkerRect;
  score: number;
  scale: number;
  order: number;
}

type WorkerSearchResult = {
  errorCode: number;
  containsGreenPinkBoxes: boolean;
  regions: WorkerRegion[];
  error?: string;
}

type PendingJob = {
  resolve: (result: WorkerSearchResult) => void;
  reject: (e: Error) => void;
}

const workerState: {
  worker: Worker | null;
  pReady: Promise<void> | null;
  jobs: Record<number, PendingJob>;
  nextJobId: number;
} = {
  worker: null,
  pReady: null,
  jobs: {},
  nextJobId: 1
}

const getWorker = (): Promise<Worker> => {
  if (workerState.worker && workerState.pReady) {
    return workerState.pReady.then(() => workerState.worker as Worker)
  }

  const worker = new Worker(WORKER_URL)
  workerState.worker = worker

  workerState.pReady = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('E345: vision2 worker failed to initialize (timeout)')), 30000)

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data
      if (!msg) return

      if (msg.type === MSG_INIT) {
        clearTimeout(timer)
        resolve()
        return
      }

      if (msg.type === MSG_JOB && msg.data) {
        const pending = workerState.jobs[msg.data.id]
        if (pending) {
          delete workerState.jobs[msg.data.id]
          pending.resolve(msg.data.result)
        }
      }
    }

    worker.onerror = (e) => {
      clearTimeout(timer)
      const error = new Error(`E346: vision2 worker error: ${e.message || 'unknown'}`)
      reject(error)
      Object.keys(workerState.jobs).forEach(id => {
        workerState.jobs[id as any].reject(error)
        delete workerState.jobs[id as any]
      })
      workerState.worker = null
      workerState.pReady = null
    }
  })

  return workerState.pReady.then(() => worker)
}

const postSearchJob = (args: {
  image: ImageData;
  pattern: ImageData;
  options: { minSimilarity: number; allowSizeVariation: boolean };
  patternScaleX: number;
}): Promise<WorkerSearchResult> => {
  return getWorker().then(worker => {
    return new Promise<WorkerSearchResult>((resolve, reject) => {
      const id = workerState.nextJobId++
      workerState.jobs[id] = { resolve, reject }
      worker.postMessage({
        type: MSG_JOB,
        data: { id, args, result: null }
      })
    })
  })
}

const loadImageData = (dataUrl: string): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('E342: Failed to get canvas context for image search'))
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
    img.onerror = () => reject(new Error('E343: Failed to load image for image search'))
    img.src = dataUrl
  })
}

const cropImageData = (imageData: ImageData, rect: { x: number; y: number; width: number; height: number }): ImageData => {
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = imageData.width
  srcCanvas.height = imageData.height
  const srcCtx = srcCanvas.getContext('2d') as CanvasRenderingContext2D
  srcCtx.putImageData(imageData, 0, 0)

  const x = Math.max(0, Math.round(rect.x))
  const y = Math.max(0, Math.round(rect.y))
  const width = Math.min(imageData.width - x, Math.round(rect.width))
  const height = Math.min(imageData.height - y, Math.round(rect.height))

  return srcCtx.getImageData(x, y, width, height)
}

// Same request type as the old engine, on purpose (drop-in for the switch).
export type SearchImageInExtensionRequest = {
  patternImageUrl: string;
  targetImageUrl: string;
  minSimilarity: number;
  allowSizeVariation: boolean;
  enableGreenPinkBoxes: boolean;
  requireGreenPinkBoxes: boolean;
  patternScale: number;
  searchAreaRect?: { x: number; y: number; width: number; height: number };
  scaleDownRatio: number;
  pageOffset: { x: number; y: number };
  viewportOffset: { x: number; y: number };
}

export function searchImageInExtension (req: SearchImageInExtensionRequest): Promise<ConvertResultItem[]> {
  if (req.enableGreenPinkBoxes || req.requireGreenPinkBoxes) {
    return Promise.reject(greenPinkUnsupportedError((req as any).fileName))
  }

  const scale = 1 / req.scaleDownRatio

  return Promise.all([
    loadImageData(req.targetImageUrl),
    loadImageData(req.patternImageUrl)
  ])
  .then(([targetImage, patternImage]) => {
    const cropped = req.searchAreaRect ? cropImageData(targetImage, req.searchAreaRect) : targetImage
    const cropOffsetX = req.searchAreaRect ? Math.max(0, Math.round(req.searchAreaRect.x)) : 0
    const cropOffsetY = req.searchAreaRect ? Math.max(0, Math.round(req.searchAreaRect.y)) : 0

    const patternScale = Number.isFinite(req.patternScale) && req.patternScale > 0 ? req.patternScale : 1

    return postSearchJob({
      image: cropped,
      pattern: patternImage,
      options: {
        minSimilarity: Math.max(0.1, Math.min(1.0, req.minSimilarity)),
        allowSizeVariation: req.allowSizeVariation
      },
      patternScaleX: patternScale
    })
    .then((result: WorkerSearchResult) => {
      if (result.errorCode !== 0) {
        throw new Error(`E348: vision2 search failed: ${result.error || 'errorCode ' + result.errorCode}`)
      }

      const toFindResult = (rect: WorkerRect, score: number) => {
        const ix = rect.left + cropOffsetX
        const iy = rect.top + cropOffsetY

        return {
          offsetLeft:   scale * ix,
          offsetTop:    scale * iy,
          viewportLeft: scale * ix + req.viewportOffset.x,
          viewportTop:  scale * iy + req.viewportOffset.y,
          pageLeft:     scale * ix + req.pageOffset.x,
          pageTop:      scale * iy + req.pageOffset.y,
          width:        scale * rect.width,
          height:       scale * rect.height,
          score
        }
      }

      return (result.regions || []).map((r: WorkerRegion) => ({
        matched:   toFindResult(r.matchedRect, r.score),
        reference: null
      }))
    })
  })
}
