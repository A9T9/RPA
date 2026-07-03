import {
    Job,
    JobFactory,
    JobType,
    ImageSearchJobData,
    ImageInfoJobData,
    ImageResizeJobData,
    RectSearchJobData
} from "./job";
import { WorkerMessage, WorkerMessageType } from "./worker-connection";
import { HeapMemory } from "./heap-memory";

// Workaround annoying bug in TypeScript.
// Details: https://github.com/Microsoft/TypeScript/issues/582
declare global {
    interface Window {
        postMessage(message: any): void;
    }
}

/**
 * Performs image information extraction with WebAssembly module.
 * @param image Image binary content.
 * @returns Extracted image information.
 */
function readImageInfo(image: ArrayBuffer): kantusearch.ImageInfo | undefined {
    let result: kantusearch.ImageInfo | undefined;
    const data = new HeapMemory(image);
    try {
        result = kantusearch.readImageInfo(data.offset, data.length);
    } finally {
        data.free();
    }

    return result;
}

/**
 * Performs image resizing with WebAssembly module by utilizing OpenCV.
 * @param image Image to be resized.
 * @param scaleX Horizontal scaling factor.
 * @param scaleY Vertical scaling factor.
 * @returns Scaled image data.
 */
function resizeImage(image: ImageData, scaleX: number, scaleY: number): ImageData {
    const source = new kantusearch.Image(image.width, image.height);
    source.data.set(image.data);
    const target = kantusearch.resizeImage(source, scaleX, scaleY);
    const targetData = new Uint8ClampedArray(target.data);
    const result = new ImageData(targetData, target.width, target.height);
    return result;
}

/**
 * Performs image search with WebAssembly module by utilizing OpenCV.
 * @param image Image where the search is running.
 * @param pattern Searched template.
 * @param options Image search options.
 * @returns Matched regions.
 */
function performImageSearch(
    image: ImageData,
    pattern: ImageData,
    options: kantusearch.ImageSearchOptions
): kantusearch.ImageSearchResult {
    // Copy ImageData into Image objects
    const imageObj = new kantusearch.Image(image.width, image.height);
    imageObj.data.set(image.data);

    const patternObj = new kantusearch.Image(pattern.width, pattern.height);
    patternObj.data.set(pattern.data);

    // Perform image search
    const result = kantusearch.searchImage(imageObj, patternObj, options);

    // Free memory
    imageObj.delete();
    patternObj.delete();

    return result;
}

function performRectSearch(image: ImageData, color: number, distanceThreshold: number): Array<kantusearch.Rect> {
    // Copy ImageData into Image objects
    const imageObj = new kantusearch.Image(image.width, image.height);
    imageObj.data.set(image.data);

    // Perform rect search
    const result = kantusearch.searchRect(imageObj, color, distanceThreshold);

    // Free memory
    imageObj.delete();

    return result;
}

/**
 * Worker message handler.
 */
self.onmessage = function(e) {
    const msg = e.data as WorkerMessage;

    switch (msg.type) {
        case WorkerMessageType.Job:
            const job = msg.data as Job;
            let jobResult: any;

            switch (job.type) {
                case JobType.ImageInfo: {
                    const jobArgs = job.args as ImageInfoJobData;
                    jobResult = readImageInfo(jobArgs.image);
                    break;
                }

                case JobType.ImageResize: {
                    const jobArgs = job.args as ImageResizeJobData;
                    jobResult = resizeImage(jobArgs.image, jobArgs.scaleX, jobArgs.scaleY);
                    break;
                }

                case JobType.ImageSearch: {
                    const jobArgs = job.args as ImageSearchJobData;
                    jobResult = performImageSearch(jobArgs.image, jobArgs.pattern, jobArgs.options);
                    break;
                }

                case JobType.RectSearch: {
                    const jobArgs = job.args as RectSearchJobData;
                    jobResult = performRectSearch(jobArgs.image, jobArgs.color, jobArgs.distanceThreshold);
                    break;
                }

                default:
                    throw Error(`Unsupported job type: ${job.type}`);
            }

            //console.log("Job Result: ", jobResult);
            const result = JobFactory.complete(job, jobResult);
            const response: WorkerMessage = {
                type: WorkerMessageType.Job,
                data: result
            };
            self.postMessage(response);
            break;

        default:
            throw Error(`Unsupported message type: ${msg.type}`);
    }
};

/**
 * Worker exception handler.
 */
self.onerror = function(e) {
    console.error("Worker.onerror:", e);
};
