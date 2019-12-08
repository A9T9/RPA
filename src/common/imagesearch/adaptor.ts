import { Job, JobType, ImageSearchJobData } from "../../../imagesearch-testextension/src/ts/job";
import { WorkerConnection, WorkerMessage, WorkerMessageType } from '../../../imagesearch-testextension/src/ts/worker-connection';
import { ImageHelper } from '../../../imagesearch-testextension/src/ts/image-helper';
// import '../../../imagesearch-testextension/src/ts/types/teamdocs.d.ts'

interface SearchImageRequest {
  patternImageUrl:      string,
  targetImageUrl:       string,
  minSimilarity:        number,
  allowSizeVariation:   boolean,
  scaleDownRatio:       number,
  offsetX:              number,
  offsetY:              number
}

let isModuleReady = false
let worker = new WorkerConnection("/worker.js", workerMessageHandler);

/**
 * Listens regular messages from the worker.
 * @param msg Received worker message.
 */
function workerMessageHandler(msg: WorkerMessage): void {
  switch (msg.type) {
    case WorkerMessageType.Init:
      isModuleReady = true
      break;

    default:
      console.error("Unsupported worker message: ", msg);
      break;
  }
}

interface Region {
  matchedRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  order: number;
  score: number;
}

interface ImageSearchResult {
  containsGreenPinkBoxes: boolean;
  errorCode: number;
  regions: Region[]
}

/**
 * Schedules a template matching task for the web worker.
 * @param image Image where the search will be running.
 * @param pattern Image which will searched.
 * @param minSimilarity Minimum similarity score to accept a match.
 * @param allowSizeVariation Allows size variation during image search.
 * @returns Promise object with matches regions.
 */
function postImageSearchAsync(
  image: ImageData,
  pattern: ImageData,
  minSimilarity: number,
  allowSizeVariation: boolean
): Promise<ImageSearchResult> {
  const jobData: ImageSearchJobData = {
      image,
      pattern,
      options: {
        minSimilarity,
        allowSizeVariation,
        enableGreenPinkBoxes: false,
        requireGreenPinkBoxes: false
      }
  };
  return worker.postJobAsync(JobType.ImageSearch, jobData);
}

export function searchImageBestOne (req: SearchImageRequest): Promise<teamdocs.FindResult | undefined> {
  return searchImage(req)
  .then(results => results[0])
}

export function searchImage (req: SearchImageRequest): Promise<Array<teamdocs.FindResult>> {
  if (!isModuleReady) {
      throw new Error('Module is not ready yet.');
  }

  const minSimilarity = Math.max(0.1, Math.min(1.0, req.minSimilarity))
  const { allowSizeVariation } = req

  return Promise.all([
    ImageHelper.loadImageDataAsync(req.targetImageUrl),
    ImageHelper.loadImageDataAsync(req.patternImageUrl)
  ])
  .then(([screenshotImageData, patternImageData]) => {
    return postImageSearchAsync(
      screenshotImageData,
      patternImageData,
      minSimilarity,
      allowSizeVariation
    )
    .then(result => {
      const { containsGreenPinkBoxes, errorCode, regions } = result

      return regions.map(r => ({
        offsetLeft: r.matchedRect.left / req.scaleDownRatio,
        offsetTop:  r.matchedRect.top / req.scaleDownRatio,
        // Page Left
        left:   r.matchedRect.left / req.scaleDownRatio + req.offsetX,
        // Page Top
        top:    r.matchedRect.top / req.scaleDownRatio + req.offsetY,
        width:  r.matchedRect.width / req.scaleDownRatio,
        height: r.matchedRect.height / req.scaleDownRatio,
        score:  r.score
      }))
    })
  })
}
