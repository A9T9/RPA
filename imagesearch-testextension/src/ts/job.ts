/**
 * Defines type of asynchronous jobs which is processed by the web worker.
 */
export const enum JobType {
    ImageInfo,
    ImageResize,
    ImageSearch
}

/**
 * Holds information about an asynchronous job of web worker.
 */
export interface Job {
    id: number;
    type: JobType;
    startTime: number;
    finishTime: number;
    args: any;
    result: any;
}

/**
 * Defines image information job arguments. 
 */
export interface ImageInfoJobData {
    image: ArrayBuffer;
}

/**
 * Defines image resize job arguments. 
 */
export interface ImageResizeJobData {
    image: ImageData;
    scaleX: number;
    scaleY: number;
}

/**
 * Defines image search job arguments. 
 */
export interface ImageSearchJobData {
    image: ImageData;
    pattern: ImageData;
    options: {
        minSimilarity: number;
        allowSizeVariation: boolean;
        enableGreenPinkBoxes: boolean;
        requireGreenPinkBoxes: boolean;
    }
}

/**
 * Manages Job lifecycle.
 */
export class JobFactory {
    private static nextId: number = 1;

    /**
     * Creates a new job with a unique identifier.
     * @param type Job type.
     * @param args Job argument.
     * @returns Created job.
     */
    static create(type: JobType, args: any): Job {
        const id = JobFactory.nextId++;

        const job: Job = {
            id,
            type,
            startTime: performance.now(),
            finishTime: 0,
            args,
            result: undefined
        };

        return job;
    }

    /**
     * Completes a job with given result.
     * @param request Previously started job.
     * @param result Job result.
     * @returns Job with result data.
     */
    static complete(request: Job, result: any): Job {
        const job: Job = {
            id: request.id,
            type: request.type,
            startTime: request.startTime,
            finishTime: performance.now(),
            args: request.args,
            result: result
        };

        return job;
    }
}
