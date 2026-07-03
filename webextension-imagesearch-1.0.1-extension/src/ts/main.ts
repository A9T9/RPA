import "./web-extensions";
import { Job, JobType, ImageInfoJobData, ImageSearchJobData, ImageResizeJobData } from "./job";
import { WorkerConnection, WorkerMessage, JobCallback, WorkerMessageType } from "./worker-connection";
import { Rect } from "./rect";
import { ImageHelper } from "./image-helper";
import { ScreenHelper } from "./screen-helper";
import { ScreenCapturer, CaptureData } from "./screen-capturer";
import { PatternImageComponent } from "./pattern-image-component";
import { BlobHelper } from "./blob-helper";
import { TestRunner } from "./test-runner";
import {
    BackgroundConnection,
    ExtensionMessageSender,
    ExtensionMessageType,
    ExtensionMessageSenderType,
    ExtensionMessage
} from "./extension-connection";

// Global variables
let isModuleReady = false;
let worker: WorkerConnection;
const patternImage = new PatternImageComponent({
    imageId: "pattern-image",
    dpiXInputId: "pattern-dpi-x-input",
    dpiYInputId: "pattern-dpi-y-input"
});
let background: BackgroundConnection;
const stressTest = new TestRunner();

/**
 * Displays status text in UI.
 * @param text The text to be displayed.
 */
function setStatusText(text: string): void {
    const elem = document.getElementById("status") as HTMLElement;
    elem.innerText = text;
    appendToLog(text);
}

function appendToLog(text: string) {
    const elem = document.getElementById("logs") as HTMLElement;
    elem.innerText += text + "\n";
    console.log(text);
}

/**
 * Schedules an image information extraction job to the web worker.
 * @param image Blob content to be read.
 * @returns Promise object with image information.
 */
function postImageInfoAsync(image: ArrayBuffer): Promise<teamdocs.ImageInfo> {
    const jobData: ImageInfoJobData = {
        image
    };
    return worker.postJobAsync(JobType.ImageInfo, jobData);
}

/**
 * Schedules a image resize task for the web worker.
 * @param image Image data.
 * @param scaleX Horizontal scaling factor.
 * @param scaleY Vertical scaling factor.
 * @returns Promise object with scaled image.
 */
function postImageResizeAsync(image: ImageData, scaleX: number, scaleY: number): Promise<ImageData> {
    const jobData: ImageResizeJobData = {
        image,
        scaleX,
        scaleY
    };
    return worker.postJobAsync(JobType.ImageResize, jobData);
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
): Promise<Array<teamdocs.FindResult>> {
    const jobData: ImageSearchJobData = {
        image,
        pattern,
        minSimilarity,
        allowSizeVariation
    };
    return worker.postJobAsync(JobType.ImageSearch, jobData);
}

/**
 * Called when module is fully initialized.
 */
function notifyModuleReady(data: any): void {
    isModuleReady = true;
    setStatusText("Module is ready.");
    appendToLog(`Module version: ${data.moduleVersion}`);
}

/**
 * Listens regular messages from the worker.
 * @param msg Received worker message.
 */
function workerMessageHandler(msg: WorkerMessage): void {
    switch (msg.type) {
        case WorkerMessageType.Init:
            notifyModuleReady(msg.data);
            break;

        default:
            console.error("Unsupported worker message: ", msg);
            break;
    }
}

function backgroundMessageHandler(msg: ExtensionMessage): Promise<any> {
    console.log("Background Message: ", msg);
    return Promise.resolve();
}

async function getActiveTabInfoAsync(): Promise<browser.tabs.Tab> {
    const win = await browser.windows.getLastFocused();
    const tabs = await browser.tabs.query({ active: true, windowId: win.id });
    return tabs[0];
}

async function searchImageAsync(): Promise<void> {
    if (!isModuleReady) {
        alert("Module is not ready yet.");
        return;
    }

    const enableHighDpi = (document.getElementById("enable-high-dpi-checkbox") as HTMLInputElement).checked;
    const allowSizeVariation = (document.getElementById("allow-size-variation-checkbox") as HTMLInputElement).checked;
    const enableFullScreenCapture = (document.getElementById("enable-full-screen-capture-checkbox") as HTMLInputElement)
        .checked;

    setStatusText("Capturing screen...");
    const captureData = (await background.sendAsync(
        enableFullScreenCapture ? ExtensionMessageType.CaptureFullScreen : ExtensionMessageType.CaptureScreen
    )) as CaptureData;
    let screenshotImageData: ImageData | undefined;
    if (captureData && captureData.dataUrl) {
        screenshotImageData = await ImageHelper.loadImageDataAsync(captureData.dataUrl);
    }
    let patternImageData = patternImage.imageData;

    if (screenshotImageData && patternImageData) {
        setStatusText("Searching...");

        // If we don't allow High-DPI processing, we reduce images to 96 DPI.
        const screenDpi = ScreenHelper.getScreenDpi();
        const workingDpi = enableHighDpi ? screenDpi : ScreenHelper.DEFAULT_DPI;
        if (screenDpi !== workingDpi) {
            const screenScale = workingDpi / screenDpi;
            screenshotImageData = await postImageResizeAsync(screenshotImageData, screenScale, screenScale);
        }

        // Match pattern image DPI to screen DPI.
        if (patternImage.userDpiX !== workingDpi || patternImage.userDpiY !== workingDpi) {
            patternImageData = await postImageResizeAsync(
                patternImageData,
                workingDpi / patternImage.userDpiX,
                workingDpi / patternImage.userDpiY
            );
        }

        console.log(`Screen capture: ${screenshotImageData.width}x${screenshotImageData.height} px`);
        console.log(`Pattern image: ${patternImageData.width}x${patternImageData.height} px`);

        // Get minimum similarity (confidence level) from UI.
        const minSimilarityInput = document.getElementById("min-similarity-input") as HTMLInputElement;
        let minSimilarity = +minSimilarityInput.value;

        // Handle degraded values.
        if (isNaN(minSimilarity)) {
            minSimilarity = 0.9;
        }

        // Clamp similarity value.
        minSimilarity = Math.min(Math.max(minSimilarity, 0.1), 1.0);

        // Reflect the most recent value to UI.
        minSimilarityInput.value = minSimilarity.toFixed(2);

        const startTime = performance.now();
        const regionArray = await postImageSearchAsync(
            screenshotImageData,
            patternImageData,
            minSimilarity,
            allowSizeVariation
        );

        const elapsedTime = performance.now() - startTime;
        setStatusText(`${regionArray.length} matches found in ${elapsedTime.toFixed(0)}ms`);
        const scaledRegions = regionArray.map(region => {
            const scale = enableHighDpi ? 1.0 / window.devicePixelRatio : 1.0;
            return {
                left: region.left * scale + captureData.offset.x,
                top: region.top * scale + captureData.offset.y,
                width: region.width * scale,
                height: region.height * scale,
                score: region.score
            } as teamdocs.FindResult;
        });

        for (let i = 0; i < scaledRegions.length; ++i) {
            const region = scaledRegions[i];
            appendToLog(`  [${i}] { x: ${region.left}, y: ${region.top}, w: ${region.width}, h: ${region.height} }`);
        }

        await background.sendAsync(ExtensionMessageType.HighlightRegions, {
            regions: scaledRegions
        });

        if (scaledRegions.length > 0) {
            const postMatchActionSelect = document.getElementById("post-match-action-select") as HTMLSelectElement;
            if (postMatchActionSelect) {
                switch (postMatchActionSelect.value) {
                    case "best": {
                        // Matches are already sorted in order by confidence score.
                        const bestRegion = scaledRegions[0];
                        appendToLog(
                            "Sending click event to best match: " +
                                `{ x: ${bestRegion.left}, y: ${bestRegion.top},` +
                                ` w: ${bestRegion.width}, h: ${bestRegion.height} }`
                        );
                        await background.sendAsync(ExtensionMessageType.ClickRegion, {
                            region: bestRegion,
                            delay: 250 // Can be set from UI
                        });
                        break;
                    }

                    case "all": {
                        // We need to sort regions as their order in the page.
                        const sortedRegions = scaledRegions.map(x => x);
                        const screenWidth = screenshotImageData.width;
                        sortedRegions.sort((a, b) => {
                            // Calculate scanline distance.
                            const distA = a.top * screenWidth + a.left;
                            const distB = b.top * screenWidth + b.left;
                            return distA - distB;
                        });
                        for (const region of sortedRegions) {
                            appendToLog(
                                "Sending click event: " +
                                    `{ x: ${region.left}, y: ${region.top},` +
                                    ` w: ${region.width}, h: ${region.height} }`
                            );
                            await background.sendAsync(ExtensionMessageType.ClickRegion, {
                                region: region,
                                delay: 250 // Can be set from UI
                            });
                        }
                        break;
                    }

                    default:
                        // Do nothing
                        break;
                }
            }
        }
    }
}

/**
 * Called when DOM is ready.
 */
function notifyDomLoaded(): void {
    const uploadFileInput = document.getElementById("upload-file-input") as HTMLInputElement;
    if (uploadFileInput) {
        uploadFileInput.addEventListener("change", async () => {
            if (uploadFileInput.files && uploadFileInput.files.length > 0) {
                const file = uploadFileInput.files[0];

                const dataUrl = await BlobHelper.readAsDataUrlAsync(file);
                const imgData = await ImageHelper.loadImageDataAsync(dataUrl);

                const buffer = await BlobHelper.readAsBufferAsync(file);
                const imgInfo = await postImageInfoAsync(buffer);
                console.log("ImageInfo: ", imgInfo);

                patternImage.imageData = imgData;
                patternImage.imageInfo = imgInfo;
            }
        });
    }

    const distortPatternButton = document.getElementById("distort-pattern-button") as HTMLButtonElement;
    if (distortPatternButton) {
        distortPatternButton.addEventListener("click", (ev: MouseEvent) => {
            ev.preventDefault();
            const pattern = ImageHelper.distortImage(patternImage.imageData!);
            patternImage.imageData = pattern;
        });
    }

    const captureScreenButton = document.getElementById("capture-screen-button") as HTMLButtonElement;
    if (captureScreenButton) {
        captureScreenButton.addEventListener("click", async (ev: MouseEvent) => {
            ev.preventDefault();
            const captureImageDataUrl = await background.sendAsync(ExtensionMessageType.CaptureRegion);
            if (captureImageDataUrl) {
                const captureImageData = await ImageHelper.loadImageDataAsync(captureImageDataUrl);
                const screenDpi = ScreenHelper.getScreenDpi();

                patternImage.imageData = captureImageData;
                patternImage.imageInfo = {
                    format: teamdocs.ImageFormat.Png,
                    width: captureImageData.width,
                    height: captureImageData.height,
                    bitDepth: 32,
                    color: teamdocs.ColorFormat.Rgba,
                    dpiX: screenDpi,
                    dpiY: screenDpi
                };

                await background.sendAsync(ExtensionMessageType.FocusPopup);
            }
        });
    }

    const searchPatternButton = document.getElementById("search-pattern-button") as HTMLButtonElement;
    if (searchPatternButton) {
        searchPatternButton.addEventListener("click", async (ev: MouseEvent) => {
            ev.preventDefault();
            searchPatternButton.disabled = true;
            try {
                await searchImageAsync();
            } catch (error) {
                console.log(error);
            }
            searchPatternButton.disabled = false;
        });
    }

    const screenDpiSpan = document.getElementById("screen-dpi-span");
    if (screenDpiSpan) {
        const screenDpi = ScreenHelper.getScreenDpi();
        const text = `The screen density is detected as ${screenDpi} DPI`;
        screenDpiSpan.innerText = text + ".";
        appendToLog(text + ` (devicePixelRatio is ${window.devicePixelRatio}).`);
    }

    const stressTestBeginButton = document.getElementById("stress-test-begin-button") as HTMLButtonElement;
    const stressTestAbortButton = document.getElementById("stress-test-abort-button") as HTMLButtonElement;
    if (stressTestBeginButton && stressTestAbortButton) {
        stressTestBeginButton.addEventListener("click", async (ev: MouseEvent) => {
            ev.preventDefault();

            stressTestBeginButton.disabled = true;
            stressTestAbortButton.disabled = false;

            const stressTestCountInput = document.getElementById("stress-test-count-input") as HTMLInputElement;
            const stressTestDelayInput = document.getElementById("stress-test-delay-input") as HTMLInputElement;

            const testCount = +stressTestCountInput.value;
            const testDelay = +stressTestDelayInput.value;

            appendToLog(`Starting stress test...`);
            appendToLog(`  Test count: ${testCount}`);
            appendToLog(`  Test delay: ${testDelay} ms`);
            appendToLog("");

            const stats = await stressTest.startAsync(
                (step: number, maxSteps: number) => {
                    appendToLog(`Running ${step + 1} of ${maxSteps} tests...`);
                    return searchImageAsync();
                },
                testCount,
                testDelay
            );

            appendToLog("");
            appendToLog("Stress test completed:");
            appendToLog(`  Succeeded Tests: ${stats.succeeded}`);
            appendToLog(`  Failed Tests   : ${stats.failed}`);
            appendToLog(`  Total Tests    : ${stats.succeeded + stats.failed}`);
            appendToLog(`  Total Time     : ${(stats.totalTime / 1e3).toFixed(2)} secs`);
            appendToLog(
                `  Avg. Time      : ${(stats.totalTime / (stats.succeeded + stats.failed) / 1e3).toFixed(2)} secs`
            );
            appendToLog("                   (times are excluding delays)");
            appendToLog("");

            stressTestBeginButton.disabled = false;
            stressTestAbortButton.disabled = true;

            await background.sendAsync(ExtensionMessageType.FocusPopup);
        });

        stressTestAbortButton.addEventListener("click", (ev: MouseEvent) => {
            ev.preventDefault();

            stressTestAbortButton.disabled = true;
            stressTest.abort();
        });
    }

    // Initialize background connection
    background = new BackgroundConnection(ExtensionMessageSenderType.Popup, backgroundMessageHandler);
    background.sendAsync(ExtensionMessageType.Initialized);
}

document.addEventListener("DOMContentLoaded", (domEvent: any) => {
    notifyDomLoaded();
});

// Initialize the worker and listen regular messages via "workerMessageHandler".
// Job messages are handled internally.
appendToLog("Initializing module...");
worker = new WorkerConnection("/js/worker.js", workerMessageHandler);
