import { Job, JobFactory, JobType } from "./job";

/**
 * Defines message types which can be exchanged between the worker and window.
 */
export const enum WorkerMessageType {
    Init,
    Job
}

/**
 * Defines message structure between the worker and window.
 */
export interface WorkerMessage {
    type: WorkerMessageType;
    data: any;
}

/**
 * Event delegate for handling generic messages from the worker.
 */
export type WorkerMessageHandler = (message: WorkerMessage) => void;

/**
 * Event delegate for handling job completions.
 */
export type JobCallback = (result: any) => void;

/**
 * Wrapper for enqueued jobs.
 */
class JobQueueItem {
    private jobObject: Job;
    callback: JobCallback;

    /**
     * Constructs a new instance.
     * @param type Job type.
     * @param data Job data.
     * @param callback Job completion callback.
     */
    constructor(type: JobType, data: any, callback: JobCallback) {
        this.jobObject = JobFactory.create(type, data);
        this.callback = callback;
    }

    /**
     * Underlying job object.
     */
    get job(): Job {
        return this.jobObject;
    }
}

/**
 * Provides a connection between the worker and window.
 */
export class WorkerConnection {
    private readonly queue: Array<JobQueueItem>;
    private readonly messageHandler: WorkerMessageHandler;
    private readonly worker: Worker;

    /**
     * Constructs a new connection instance.
     * @param workerUrl Worker script URL
     * @param messageHandler Event handler delegate for generic messages.
     */
    constructor(workerUrl: string, messageHandler: WorkerMessageHandler) {
        this.queue = new Array<JobQueueItem>();
        this.messageHandler = messageHandler;
        this.worker = new Worker(workerUrl);
        this.worker.onmessage = this.handleWorkerCallback.bind(this);
    }

    /**
     * Worker event message handler
     * @param e Message event.
     */
    private handleWorkerCallback(e: MessageEvent): void {
        const msg = e.data as WorkerMessage;
        if (msg.type === WorkerMessageType.Job) {
            const job = msg.data as Job;
            let callback: JobCallback | undefined = undefined;
            for (let i = 0; i < this.queue.length; ++i) {
                const entry = this.queue[i];
                if (entry.job.id === job.id) {
                    callback = entry.callback;
                    this.queue.splice(i, 1);
                    break;
                }
            }

            const elapsedTime = Math.max(0, job.finishTime - job.startTime);
            console.log(`Job #${job.id} completed in ${elapsedTime.toFixed(0)} ms (excluding callback overhead).`);

            if (callback) {
                callback(job.result);
            }
        }
        else {
            this.messageHandler(msg);
        }
    }

    /**
     * Sends a message to the worker.
     * @param msg Message to be sent.
     */
    postMessage(msg: WorkerMessage): void {
        this.worker.postMessage(msg);
    }

    /**
     * Enqueues a job with a callback for sending the worker.
     * @param type Job type.
     * @param data Job data.
     * @param callback Job completion callback.
     */
    postJob(type: JobType, data: any, callback: JobCallback): void {
        const item = new JobQueueItem(type, data, callback);
        this.queue.push(item);
        this.postMessage({
            type: WorkerMessageType.Job,
            data: item.job
        });
    }

    /**
     * Enqueues a job with a Promise object for sending the worker.
     * @param type Job type.
     * @param data Job data.
     * @returns Promise object for job completion in worker.
     */
    postJobAsync(type: JobType, data: any): Promise<any> {
        const self = this;
        return new Promise((resolve, reject) => {
            self.postJob(type, data, (result) => {
                resolve(result);
            });
        });
    }
}
