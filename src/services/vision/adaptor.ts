import { Job, JobType, ImageSearchJobData } from "../../../imagesearch-testextension/src/ts/job";
import { WorkerConnection, WorkerMessage, WorkerMessageType } from '../../../imagesearch-testextension/src/ts/worker-connection';
import { ImageHelper } from '../../../imagesearch-testextension/src/ts/image-helper';
import { guardSearchResult } from "../desktop"
// import '../../../imagesearch-testextension/src/ts/types/teamdocs.d.ts'

interface SearchImageRequest {
  patternImageUrl:      string,
  targetImageUrl:       string,
  minSimilarity:        number,
  allowSizeVariation:   boolean,
  enableGreenPinkBoxes: boolean,
  requireGreenPinkBoxes: boolean,
  scaleDownRatio:       number,
  pageOffsetX:          number,
  pageOffsetY:          number,
  viewportOffsetX:      number,
  viewportOffsetY:      number
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
  rect: {
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
  allowSizeVariation: boolean,
  enableGreenPinkBoxes: boolean,
  requireGreenPinkBoxes: boolean
): Promise<ImageSearchResult> {
  const jobData: ImageSearchJobData = {
      image,
      pattern,
      options: {
        minSimilarity,
        allowSizeVariation,
        enableGreenPinkBoxes,
        requireGreenPinkBoxes
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
  const { allowSizeVariation, enableGreenPinkBoxes, requireGreenPinkBoxes } = req

  return Promise.all([
    ImageHelper.loadImageDataAsync(req.targetImageUrl),
    ImageHelper.loadImageDataAsync(req.patternImageUrl)
  ])
  .then(([screenshotImageData, patternImageData]) => {
    return postImageSearchAsync(
      screenshotImageData,
      patternImageData,
      minSimilarity,
      allowSizeVariation,
      enableGreenPinkBoxes,
      requireGreenPinkBoxes
    )
    .then(result => {
      guardSearchResult(result as any)

      const { containsGreenPinkBoxes, errorCode, regions } = result

      return regions.map(r => ({
        // `offsetLeft` and `offsetTop` are relative to the search area, or the whole image if no search area provided
        // so most of the time, should not use these two values directly for click/XClick, because we need "global"
        // coordinates instead of search area based coordinates.
        //
        // In comparison, `pageTop` and `pageLeft` are relative to the page, which is useful to display highlights on page,
        // while `viewportTop` and `viewportLeft` are relative to the viewport, which is useful for XClick
        offsetLeft:   r.rect.left / req.scaleDownRatio,
        offsetTop:    r.rect.top / req.scaleDownRatio,
        viewportLeft: r.rect.left / req.scaleDownRatio + req.viewportOffsetX,
        viewportTop:  r.rect.top / req.scaleDownRatio + req.viewportOffsetY,
        pageLeft:     r.rect.left / req.scaleDownRatio + req.pageOffsetX,
        pageTop:      r.rect.top / req.scaleDownRatio + req.pageOffsetY,
        width:        r.rect.width / req.scaleDownRatio,
        height:       r.rect.height / req.scaleDownRatio,
        score:        r.score
      }))
    })
  })
}

/*

  //**this functions are used to circumnavigate the errors in the original implementation
  export function searchImageBestOne(
    req: any
  ): Promise<teamdocs.FindResult | undefined> {
    return searchImage(req).then((results) => results[0]);
  }

  export function searchImage(req: any): Promise<Array<any>> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve([{}]);
      }, 1000);
    });
  }

*/
