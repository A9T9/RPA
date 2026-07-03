import * as React from "react";
import { Dispatch } from "redux";
import { connect } from "react-redux";

import "./app.scss";

import { UploadButton } from "./upload-button";
import { StoreState } from "../models";
import { Actions, ActionType } from "../actions";
import { ActionWithPayload } from "../actions/action-helpers";
import { WorkerConnection, WorkerMessage, WorkerMessageType } from "../worker-connection";
import { BlobHelper } from "../blob-helper";
import { ImageHelper } from "../image-helper";
import { JobType, ImageInfoJobData, ImageResizeJobData, ImageSearchJobData } from "../job";
import { ScreenHelper } from "../screen-helper";
import { PatternImage, PatternImageDrawingState } from "./pattern-image";
import {
    BackgroundConnection,
    ExtensionMessageSenderType,
    ExtensionMessageType,
    ExtensionMessage
} from "../extension-connection";
import { CaptureData } from "../screen-capturer";
import { TestRunner } from "../test-runner";
import { downloadUrlAsync } from "../utils";
import { RectHelper, Rect } from "../rect";
import { MathHelper } from "../math-helper";

export interface AppProps {
    logs: Array<string>;
    patternImage: {
        dataUrl: string;
        info: kantusearch.ImageInfo;
    };
    onAppendToLog: (text: string) => ActionWithPayload<ActionType, { text: string }>;
    onSetPatternImage: (
        dataUrl: string,
        info: kantusearch.ImageInfo
    ) => ActionWithPayload<ActionType, { dataUrl: string; info: kantusearch.ImageInfo }>;
}

export const enum PostMatchAction {
    None,
    Best,
    All
}

export const enum StressTestState {
    Ready,
    Running,
    Aborting
}

export interface AppState {
    isModuleReady: boolean;
    statusText: string;

    drawingState: PatternImageDrawingState;
    isSearchPatternDisabled: boolean;
    testState: StressTestState;

    searchResult: {
        screenImage?: ImageData;
        screenRoi?: Rect;
        regions: Array<kantusearch.ImageSearchRegion>;
        selectedRegionIndex: number;
        selectedRegionDataUrl: string;
    };

    formElements: {
        [key: string]: any;

        patternImageDpiX: number;
        patternImageDpiY: number;
        minSimilarity: number;
        enableSingleMatch: boolean;
        singleMatchIndex: number;
        postMatchAction: PostMatchAction;
        enableHighDpi: boolean;
        allowSizeVariation: boolean;
        enableFullScreenCapture: boolean;

        limitSearchArea: boolean;
        regionOfInterestLeft: number;
        regionOfInterestTop: number;
        regionOfInterestWidth: number;
        regionOfInterestHeight: number;

        enableGreenPinkBoxes: boolean;
        requireGreenPinkBoxes: boolean;

        stressTestCount: number;
        stressTestDelay: number;
    };
}

export class AppImpl extends React.Component<AppProps, AppState> {
    private readonly worker: WorkerConnection;
    private readonly background: BackgroundConnection;
    private readonly stressTest: TestRunner;

    constructor(props: AppProps, context?: any) {
        super(props, context);

        this.state = {
            isModuleReady: false,
            statusText: "Loading...",

            drawingState: PatternImageDrawingState.None,
            isSearchPatternDisabled: false,
            testState: StressTestState.Ready,

            searchResult: {
                screenImage: undefined,
                screenRoi: undefined,
                regions: new Array<kantusearch.ImageSearchRegion>(),
                selectedRegionIndex: 0,
                selectedRegionDataUrl: ""
            },

            formElements: {
                patternImageDpiX: ScreenHelper.DEFAULT_DPI,
                patternImageDpiY: ScreenHelper.DEFAULT_DPI,
                minSimilarity: 0.9,
                enableSingleMatch: false,
                singleMatchIndex: 0,
                postMatchAction: PostMatchAction.None,
                enableHighDpi: true,
                allowSizeVariation: true,
                enableFullScreenCapture: true,

                limitSearchArea: false,
                regionOfInterestLeft: 0,
                regionOfInterestTop: 0,
                regionOfInterestWidth: 0,
                regionOfInterestHeight: 0,

                enableGreenPinkBoxes: true,
                requireGreenPinkBoxes: false,
                stressTestCount: 10,
                stressTestDelay: 10
            }
        };

        this.handleWorkerMessage = this.handleWorkerMessage.bind(this);
        this.handleBackgroundMessage = this.handleBackgroundMessage.bind(this);
        this.handleImageChange = this.handleImageChange.bind(this);
        this.handleFormElementChange = this.handleFormElementChange.bind(this);
        this.handlePatternImageUpload = this.handlePatternImageUpload.bind(this);
        this.handleDistortPatternClick = this.handleDistortPatternClick.bind(this);
        this.handleDrawPinkBoxClick = this.handleDrawPinkBoxClick.bind(this);
        this.handleDrawGreenBoxClick = this.handleDrawGreenBoxClick.bind(this);
        this.handleSaveToDiskClick = this.handleSaveToDiskClick.bind(this);
        this.handleCaptureScreenClick = this.handleCaptureScreenClick.bind(this);
        this.handleSearchPatternClick = this.handleSearchPatternClick.bind(this);

        this.handleMatchDownloadClick = this.handleMatchDownloadClick.bind(this);
        this.handleSetRoiClick = this.handleSetRoiClick.bind(this);
        this.handlePrevMatchClick = this.handlePrevMatchClick.bind(this);
        this.handleNextMatchClick = this.handleNextMatchClick.bind(this);

        this.handleBeginTestClick = this.handleBeginTestClick.bind(this);
        this.handleAbortTestClick = this.handleAbortTestClick.bind(this);

        this.props.onAppendToLog("Initializing...");

        // Initialize stress test runner
        this.stressTest = new TestRunner();

        // Initialize the worker and listen regular messages via "handleWorkerMessage".
        // Job messages are handled internally.
        this.worker = new WorkerConnection("/js/worker.js", this.handleWorkerMessage);

        // Initialize background connection
        this.background = new BackgroundConnection(ExtensionMessageSenderType.Popup, this.handleBackgroundMessage);
        this.background.sendAsync(ExtensionMessageType.Initialized);
    }

    // componentWillReceiveProps() {
    //     console.log("componentWillReceiveProps:", this.props);
    // }

    // componentWillUpdate() {
    //     console.log("componentWillUpdate:", this.props);
    // }

    // componentDidUpdate() {
    //     console.log("componentDidUpdate:", this.props);
    // }

    // componentWillMount() {
    //     console.log("componentWillMount:", this.props);
    // }

    /**
     * Appends a new line to the log.
     * @param text Content of the line.
     */
    private appendToLog(text: string): void {
        this.props.onAppendToLog(text);
    }

    /**
     * Displays status text in UI.
     * @param text The text to be displayed.
     */
    private setStatusText(text: string): void {
        this.setState(prevState => {
            return { statusText: text };
        });
        this.appendToLog(text);
    }

    /**
     * Called when module is fully initialized.
     */
    private notifyModuleReady(data: any) {
        this.setState(prevState => {
            return {
                isModuleReady: true,
                statusText: "Module is ready."
            };
        });

        this.appendToLog("Module is ready.");
        this.appendToLog(`Module version: ${data.moduleVersion}`);

        const screenDpi = ScreenHelper.getScreenDpi();
        this.appendToLog(
            `The screen density is detected as ${screenDpi} DPI (devicePixelRatio is ${window.devicePixelRatio}).`
        );
    }

    /**
     * Schedules an image information extraction job to the web worker.
     * @param image Blob content to be read.
     * @returns Promise object with image information.
     */
    private async postImageInfoAsync(image: ArrayBuffer): Promise<kantusearch.ImageInfo> {
        const jobData: ImageInfoJobData = {
            image
        };
        return this.worker.postJobAsync(JobType.ImageInfo, jobData);
    }

    /**
     * Schedules a image resize task for the web worker.
     * @param image Image data.
     * @param scaleX Horizontal scaling factor.
     * @param scaleY Vertical scaling factor.
     * @returns Promise object with scaled image.
     */
    private postImageResizeAsync(image: ImageData, scaleX: number, scaleY: number): Promise<ImageData> {
        const jobData: ImageResizeJobData = {
            image,
            scaleX,
            scaleY
        };
        return this.worker.postJobAsync(JobType.ImageResize, jobData);
    }

    /**
     * Schedules a template matching task for the web worker.
     * @param image Image where the search will be running.
     * @param pattern Image which will searched.
     * @param options Image search options.
     * @returns Promise object with matches regions.
     */
    private postImageSearchAsync(
        image: ImageData,
        pattern: ImageData,
        options: kantusearch.ImageSearchOptions
    ): Promise<kantusearch.ImageSearchResult> {
        const jobData: ImageSearchJobData = {
            image,
            pattern,
            options
        };
        return this.worker.postJobAsync(JobType.ImageSearch, jobData);
    }

    // private async getActiveTabInfoAsync(): Promise<browser.tabs.Tab> {
    //     const win = await browser.windows.getLastFocused();
    //     const tabs = await browser.tabs.query({ active: true, windowId: win.id });
    //     return tabs[0];
    // }

    private reportError(msg: string, shouldThrow: boolean, updateStatus: boolean = true) {
        const errorMsg = `Error: ${msg}`;
        if (updateStatus) {
            this.setStatusText(errorMsg);
        } else {
            this.appendToLog(errorMsg);
        }

        if (shouldThrow) {
            throw new Error(msg);
        } else {
            alert(msg);
        }
    }

    private async searchImageAsync(shouldThrow: boolean = false): Promise<void> {
        if (!this.state.isModuleReady) {
            this.reportError("Module is not ready yet.", shouldThrow);
            return;
        }

        if (!this.props.patternImage.dataUrl) {
            this.reportError("Please upload an pattern image.", shouldThrow);
            return;
        }

        const options: kantusearch.ImageSearchOptions = {
            minSimilarity: this.state.formElements.minSimilarity,
            allowSizeVariation: this.state.formElements.allowSizeVariation,
            enableGreenPinkBoxes: this.state.formElements.enableGreenPinkBoxes,
            requireGreenPinkBoxes: this.state.formElements.requireGreenPinkBoxes
        };
        const singleMatchIndex = this.state.formElements.enableSingleMatch ? this.state.formElements.singleMatchIndex : undefined;
        const postMatchAction = this.state.formElements.postMatchAction;
        const enableHighDpi = this.state.formElements.enableHighDpi;
        const enableFullScreenCapture = this.state.formElements.enableFullScreenCapture;
        const limitSearchArea = this.state.formElements.limitSearchArea;
        const regionOfInterest: kantusearch.Rect = {
            left: limitSearchArea ? this.state.formElements.regionOfInterestLeft : 0,
            top: limitSearchArea ? this.state.formElements.regionOfInterestTop : 0,
            width: limitSearchArea ? this.state.formElements.regionOfInterestWidth : 0,
            height: limitSearchArea ? this.state.formElements.regionOfInterestHeight : 0
        };

        this.setStatusText("Capturing screen...");
        const captureData = (await this.background.sendAsync(
            enableFullScreenCapture ? ExtensionMessageType.CaptureFullScreen : ExtensionMessageType.CaptureScreen
        )) as CaptureData;
        let screenshotImageData: ImageData | undefined;
        if (captureData && captureData.dataUrl) {
            screenshotImageData = await ImageHelper.loadImageDataAsync(captureData.dataUrl);
        }

        let patternImageData = await ImageHelper.loadImageDataAsync(this.props.patternImage.dataUrl);

        if (screenshotImageData && patternImageData) {
            this.setStatusText("Searching...");

            // If we don't allow High-DPI processing, we reduce images to 96 DPI.
            const screenDpi = ScreenHelper.getScreenDpi();
            const workingDpi = enableHighDpi ? screenDpi : ScreenHelper.DEFAULT_DPI;
            if (screenDpi !== workingDpi) {
                const screenScale = workingDpi / screenDpi;
                screenshotImageData = await this.postImageResizeAsync(screenshotImageData, screenScale, screenScale);
            }

            // Match pattern image DPI to screen DPI.
            const userDpiX = this.state.formElements.patternImageDpiX;
            const userDpiY = this.state.formElements.patternImageDpiY;
            if (userDpiX !== workingDpi || userDpiY !== workingDpi) {
                patternImageData = await this.postImageResizeAsync(
                    patternImageData,
                    workingDpi / userDpiX,
                    workingDpi / userDpiY
                );
            }

            console.log(`Screen capture: ${screenshotImageData.width}x${screenshotImageData.height} px`);
            console.log(`Pattern image: ${patternImageData.width}x${patternImageData.height} px`);

            // Limit search area if needed
            if (limitSearchArea) {
                if (
                    regionOfInterest.left < screenshotImageData.width &&
                    regionOfInterest.top < screenshotImageData.height
                ) {
                    let roiRight = regionOfInterest.left + regionOfInterest.width;
                    let roiBottom = regionOfInterest.top + regionOfInterest.height;

                    if (roiRight >= screenshotImageData.width || roiBottom >= screenshotImageData.height) {
                        roiRight = Math.min(roiRight, screenshotImageData.width - 1);
                        roiBottom = Math.min(roiBottom, screenshotImageData.height - 1);
                        this.appendToLog(
                            "Warning: ROI is out of bound and its dimension will be cropped from " +
                                `${regionOfInterest.width}x${regionOfInterest.height} to ${roiRight -
                                    regionOfInterest.left}x${roiBottom - regionOfInterest.top}.`
                        );
                    }

                    const roiWidth = roiRight - regionOfInterest.left;
                    const roiHeight = roiBottom - regionOfInterest.top;

                    if (roiWidth >= 10 && roiHeight >= 10) {
                        screenshotImageData = ImageHelper.getImageDataRegion(screenshotImageData, {
                            left: regionOfInterest.left,
                            top: regionOfInterest.top,
                            right: roiRight,
                            bottom: roiBottom
                        });
                    } else {
                        this.appendToLog(`Warning: ROI is too small (${roiWidth}x${roiHeight}). Ignoring.`);
                    }
                } else {
                    this.appendToLog("Warning: ROI is completely out of bound. Ignoring.");
                }
            }

            const startTime = performance.now();
            const searchResult = await this.postImageSearchAsync(screenshotImageData, patternImageData, options);
            switch (searchResult.errorCode) {
                case kantusearch.ImageSearchErrorCode.Ok:
                    // ignored
                    break;

                case kantusearch.ImageSearchErrorCode.NoGreenPinkBoxes:
                    this.reportError("Cannot find green and/or pink boxes.", shouldThrow);
                    return;

                case kantusearch.ImageSearchErrorCode.NoPinkBox:
                    this.reportError("Pattern image contains green box but does not contain pink box.", shouldThrow);
                    return;

                case kantusearch.ImageSearchErrorCode.TooManyGreenBox:
                    this.reportError("Pattern image contains more than one green box.", shouldThrow);
                    return;

                case kantusearch.ImageSearchErrorCode.TooManyPinkBox:
                    this.reportError("Pattern image contains more than one pink box.", shouldThrow);
                    return;

                default:
                    this.reportError("Unspecified error has occured.", shouldThrow);
                    return;
            }

            // Apply n-th match filter
            if (typeof singleMatchIndex !== "undefined") {
                if (singleMatchIndex < 0 || searchResult.regions.length <= singleMatchIndex) {
                    this.reportError(`The specified #${singleMatchIndex} match was not found.`, shouldThrow);
                    return;
                }

                searchResult.regions = searchResult.regions.filter((x, i) => i === singleMatchIndex);
            }

            const regionArray = searchResult.regions;

            // Offset by ROI if activated
            if (limitSearchArea) {
                for (const region of regionArray) {
                    region.matchedRect.left += regionOfInterest.left;
                    region.matchedRect.top += regionOfInterest.top;

                    if (region.relativeRect) {
                        region.relativeRect.left += regionOfInterest.left;
                        region.relativeRect.top += regionOfInterest.top;
                    }
                }
            }

            const elapsedTime = performance.now() - startTime;
            this.setStatusText(`${regionArray.length} matches found in ${elapsedTime.toFixed(0)}ms`);
            const scaledRegions = regionArray.map(region => {
                const scale = enableHighDpi ? 1.0 / window.devicePixelRatio : 1.0;
                const scaledRegion = {
                    matchedRect: {
                        left: Math.round(region.matchedRect.left * scale + captureData.offset.x),
                        top: Math.round(region.matchedRect.top * scale + captureData.offset.y),
                        width: Math.round(region.matchedRect.width * scale),
                        height: Math.round(region.matchedRect.height * scale)
                    },
                    score: region.score,
                    order: region.order
                } as kantusearch.ImageSearchRegion;

                if (region.relativeRect) {
                    scaledRegion.relativeRect = {
                        left: Math.round(region.relativeRect.left * scale + captureData.offset.x),
                        top: Math.round(region.relativeRect.top * scale + captureData.offset.y),
                        width: Math.round(region.relativeRect.width * scale),
                        height: Math.round(region.relativeRect.height * scale)
                    } as kantusearch.Rect;
                }

                return scaledRegion;
            });

            for (let i = 0; i < scaledRegions.length; ++i) {
                const region = scaledRegions[i];
                let logLine =
                    `  [${i}] { matched: { x: ${region.matchedRect.left}, y: ${region.matchedRect.top}, ` +
                    `w: ${region.matchedRect.width}, h: ${region.matchedRect.height} }, `;

                if (region.relativeRect) {
                    logLine +=
                        `relative: { x: ${region.relativeRect.left}, y: ${region.relativeRect.top}, ` +
                        `w: ${region.relativeRect.width}, h: ${region.relativeRect.height} }, `;
                }

                logLine += `confidence: ${region.score.toFixed(2)}, order: ${region.order} }`;
                this.appendToLog(logLine);
            }

            // Update search results
            this.setState(prevState => {
                let selectedRegionDataUrl = "";

                if (screenshotImageData && regionArray.length > 0) {
                    const selectedRegion = regionArray[0];
                    const roi = Object.assign({}, selectedRegion.relativeRect || selectedRegion.matchedRect); // clone
                    if (limitSearchArea) {
                        roi.left -= regionOfInterest.left;
                        roi.top -= regionOfInterest.top;
                    }
                    selectedRegionDataUrl = ImageHelper.getImageDataRegionDataUrl(
                        screenshotImageData,
                        RectHelper.create(roi)
                    );
                }

                return {
                    searchResult: {
                        screenImage: screenshotImageData,
                        screenRoi: limitSearchArea ? RectHelper.create(regionOfInterest) : undefined,
                        regions: regionArray,
                        selectedRegionIndex: 0,
                        selectedRegionDataUrl
                    }
                };
            });

            await this.background.sendAsync(ExtensionMessageType.HighlightRegions, {
                regions: scaledRegions
            });

            if (scaledRegions.length > 0) {
                switch (postMatchAction) {
                    case PostMatchAction.Best: {
                        // Matches are already sorted in order by confidence score.
                        const bestRegion = scaledRegions[0];
                        const clickRect = bestRegion.relativeRect || bestRegion.matchedRect;
                        this.appendToLog(
                            "Sending click event to best match: " +
                                `{ x: ${clickRect.left}, y: ${clickRect.top},` +
                                ` w: ${clickRect.width}, h: ${clickRect.height} }`
                        );
                        await this.background.sendAsync(ExtensionMessageType.ClickRegion, {
                            region: bestRegion,
                            delay: 250 // Can be set from UI
                        });
                        break;
                    }

                    case PostMatchAction.All: {
                        // We need to sort regions as their order in the page.
                        const sortedRegions = scaledRegions.map(x => x);
                        sortedRegions.sort((a, b) => a.order - b.order);
                        for (const region of sortedRegions) {
                            const clickRect = region.relativeRect || region.matchedRect;
                            this.appendToLog(
                                "Sending click event: " +
                                    `{ x: ${clickRect.left}, y: ${clickRect.top},` +
                                    ` w: ${clickRect.width}, h: ${clickRect.height} }`
                            );
                            await this.background.sendAsync(ExtensionMessageType.ClickRegion, {
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

    /**
     * Listens regular messages from the worker.
     * @param msg Received worker message.
     */
    private handleWorkerMessage(msg: WorkerMessage): void {
        switch (msg.type) {
            case WorkerMessageType.Init:
                this.notifyModuleReady(msg.data);
                break;

            default:
                console.error("Unsupported worker message: ", msg);
                break;
        }
    }

    private handleBackgroundMessage(msg: ExtensionMessage): Promise<any> {
        console.log("Background Message: ", msg);
        return Promise.resolve();
    }

    private async handleImageChange(dataUrl: string) {
        this.props.onSetPatternImage(dataUrl, this.props.patternImage.info);
    }

    private async handleFormElementChange(e: React.FormEvent<HTMLElement>) {
        const target = e.target as HTMLInputElement;
        let value: any = target.type === "checkbox" ? target.checked : target.value;
        const name = target.name;

        if (typeof this.state.formElements[name] === "number" || target.type === "number") {
            value = +value;
        }

        // Apply constraints
        switch (name) {
            case "minSimilarity":
                // Handle degraded values.
                if (isNaN(value)) {
                    value = 0.9;
                }

                // Clamp similarity value.
                value = Math.min(Math.max(value, 0.01), 1.0);

                // Reflect the most recent value to UI.
                value = +value.toFixed(2);
                break;
        }

        this.setState(prevState => {
            return {
                formElements: {
                    ...prevState.formElements,
                    [name]: value
                }
            };
        });

        console.log(`${name}: ${value}`);
    }

    private async handlePatternImageUpload(file: File) {
        if (!this.state.isModuleReady) {
            alert("Module is not ready yet.");
            return;
        }

        const dataUrl = await BlobHelper.readAsDataUrlAsync(file);
        //const imgData = await ImageHelper.loadImageDataAsync(dataUrl);

        const buffer = await BlobHelper.readAsBufferAsync(file);
        const imgInfo = await this.postImageInfoAsync(buffer);
        console.log("ImageInfo: ", imgInfo);

        this.props.onSetPatternImage(dataUrl, imgInfo);

        let dpiX: number;
        let dpiY: number;

        if (imgInfo) {
            dpiX = imgInfo.dpiX !== 0 ? imgInfo.dpiX : ScreenHelper.DEFAULT_DPI;
            dpiY = imgInfo.dpiY !== 0 ? imgInfo.dpiY : ScreenHelper.DEFAULT_DPI;
        } else {
            dpiX = ScreenHelper.DEFAULT_DPI;
            dpiY = ScreenHelper.DEFAULT_DPI;
        }

        this.setState(prevState => {
            return {
                formElements: {
                    ...prevState.formElements,
                    patternImageDpiX: Math.ceil(dpiX),
                    patternImageDpiY: Math.ceil(dpiY)
                }
            };
        });
    }

    private async handleDistortPatternClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();

        if (this.props.patternImage.dataUrl) {
            const imageData = await ImageHelper.loadImageDataAsync(this.props.patternImage.dataUrl);
            const pattern = ImageHelper.distortImage(imageData);
            const dataUrl = ImageHelper.convertImageDataToDataUrl(pattern);
            this.props.onSetPatternImage(dataUrl, this.props.patternImage.info);
        }
    }

    private handleDrawPinkBoxClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();

        if (this.props.patternImage.dataUrl) {
            this.setState(prevState => {
                return {
                    drawingState: PatternImageDrawingState.PinkBox
                };
            });
        }
    }

    private handleDrawGreenBoxClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();

        if (this.props.patternImage.dataUrl) {
            this.setState(prevState => {
                return {
                    drawingState: PatternImageDrawingState.GreenBox
                };
            });
        }
    }

    private async handleSaveToDiskClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();

        // Make sure we have a PNG image.
        const imageData = await ImageHelper.loadImageDataAsync(this.props.patternImage.dataUrl);
        const dataUrl = await ImageHelper.convertImageDataToDataUrl(imageData);

        // Initiate download
        await downloadUrlAsync(dataUrl, "pattern.png");
    }

    private async handleCaptureScreenClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();
        const captureImageDataUrl = await this.background.sendAsync(ExtensionMessageType.CaptureRegion);
        if (captureImageDataUrl) {
            const captureImageData = await ImageHelper.loadImageDataAsync(captureImageDataUrl);
            const screenDpi = ScreenHelper.getScreenDpi();

            const imageInfo = {
                format: kantusearch.ImageFormat.Png,
                width: captureImageData.width,
                height: captureImageData.height,
                bitDepth: 32,
                color: kantusearch.ColorFormat.Rgba,
                dpiX: screenDpi,
                dpiY: screenDpi
            } as kantusearch.ImageInfo;

            this.setState(prevState => {
                return {
                    formElements: {
                        ...prevState.formElements,
                        patternImageDpiX: imageInfo.dpiX,
                        patternImageDpiY: imageInfo.dpiY
                    }
                };
            });

            this.props.onSetPatternImage(captureImageDataUrl, imageInfo);
            await this.background.sendAsync(ExtensionMessageType.FocusPopup);
        }
    }

    private async handleSearchPatternClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();
        this.setState(prevState => {
            return {
                isSearchPatternDisabled: true
            };
        });
        try {
            await this.searchImageAsync();
        } catch (error) {
            console.log(error);
        }
        this.setState(prevState => {
            return {
                isSearchPatternDisabled: false
            };
        });
    }

    private async handleMatchDownloadClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();

        const searchResult = this.state.searchResult;
        if (searchResult.selectedRegionDataUrl) {
            // We have already have a PNG image
            await downloadUrlAsync(
                searchResult.selectedRegionDataUrl,
                `match-${searchResult.selectedRegionIndex}}.png`
            );
        }
    }

    private async handleSetRoiClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();

        this.setState(prevState => {
            const match = prevState.searchResult.regions[prevState.searchResult.selectedRegionIndex];
            const rect = match.relativeRect || match.matchedRect;
            return {
                formElements: {
                    ...prevState.formElements,
                    limitSearchArea: true,
                    regionOfInterestLeft: rect.left,
                    regionOfInterestTop: rect.top,
                    regionOfInterestWidth: rect.width,
                    regionOfInterestHeight: rect.height
                }
            };
        });
    }

    private async handlePrevMatchClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();

        this.setState(prevState => {
            const newIndex = MathHelper.clamp(
                prevState.searchResult.selectedRegionIndex - 1,
                0,
                prevState.searchResult.regions.length
            );

            let selectedRegionDataUrl = "";
            const searchResult = prevState.searchResult;
            if (searchResult.screenImage && (0 <= newIndex && newIndex < searchResult.regions.length)) {
                const region = searchResult.regions[newIndex];
                const roi = Object.assign({}, region.relativeRect || region.matchedRect); // clone

                // Undo offset of screen ROI
                if (searchResult.screenRoi) {
                    roi.left -= searchResult.screenRoi.left;
                    roi.top -= searchResult.screenRoi.top;
                }

                selectedRegionDataUrl = ImageHelper.getImageDataRegionDataUrl(
                    searchResult.screenImage,
                    RectHelper.create(roi)
                );
            }

            return {
                searchResult: {
                    ...prevState.searchResult,
                    selectedRegionIndex: newIndex,
                    selectedRegionDataUrl
                }
            };
        });
    }

    private async handleNextMatchClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();

        this.setState(prevState => {
            const newIndex = MathHelper.clamp(
                prevState.searchResult.selectedRegionIndex + 1,
                0,
                prevState.searchResult.regions.length
            );

            let selectedRegionDataUrl = "";
            const searchResult = prevState.searchResult;
            if (searchResult.screenImage && (0 <= newIndex && newIndex < searchResult.regions.length)) {
                const region = searchResult.regions[newIndex];
                const roi = Object.assign({}, region.relativeRect || region.matchedRect); // clone

                // Undo offset of screen ROI
                if (searchResult.screenRoi) {
                    roi.left -= searchResult.screenRoi.left;
                    roi.top -= searchResult.screenRoi.top;
                }

                selectedRegionDataUrl = ImageHelper.getImageDataRegionDataUrl(
                    searchResult.screenImage,
                    RectHelper.create(roi)
                );
            }

            return {
                searchResult: {
                    ...prevState.searchResult,
                    selectedRegionIndex: newIndex,
                    selectedRegionDataUrl
                }
            };
        });
    }

    private async handleBeginTestClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();

        this.setState(prevState => {
            return {
                testState: StressTestState.Running
            };
        });

        try {
            const testCount = +this.state.formElements.stressTestCount;
            const testDelay = +this.state.formElements.stressTestDelay;

            this.appendToLog(`Starting stress test...`);
            this.appendToLog(`  Test count: ${testCount}`);
            this.appendToLog(`  Test delay: ${testDelay} ms`);
            this.appendToLog("");

            const stats = await this.stressTest.startAsync(
                (step: number, maxSteps: number) => {
                    this.appendToLog(`Running ${step + 1} of ${maxSteps} tests...`);
                    return this.searchImageAsync(true);
                },
                testCount,
                testDelay
            );

            this.appendToLog("");
            this.appendToLog("Stress test completed:");
            this.appendToLog(`  Succeeded Tests: ${stats.succeeded}`);
            this.appendToLog(`  Failed Tests   : ${stats.failed}`);
            this.appendToLog(`  Total Tests    : ${stats.succeeded + stats.failed}`);
            this.appendToLog(`  Total Time     : ${(stats.totalTime / 1e3).toFixed(2)} secs`);
            this.appendToLog(
                `  Avg. Time      : ${(stats.totalTime / (stats.succeeded + stats.failed) / 1e3).toFixed(2)} secs`
            );
            this.appendToLog("                   (times are excluding delays)");
            this.appendToLog("");
        } catch (e) {
            console.error(e);
        }

        this.setState(prevState => {
            return {
                testState: StressTestState.Ready
            };
        });

        await this.background.sendAsync(ExtensionMessageType.FocusPopup);
    }

    private handleAbortTestClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();

        this.setState(prevState => {
            return {
                testState: StressTestState.Aborting
            };
        });
        this.stressTest.abort();
    }

    private getPatternImageSize() {
        const dpiX = +this.state.formElements.patternImageDpiX;
        const dpiY = +this.state.formElements.patternImageDpiY;

        let scaledWidth = this.props.patternImage.info.width;
        let scaledHeight = this.props.patternImage.info.height;

        if (dpiX !== 0 && dpiY !== 0) {
            const scaleX = ScreenHelper.DEFAULT_DPI / dpiX;
            const scaleY = ScreenHelper.DEFAULT_DPI / dpiY;

            scaledWidth = scaledWidth * scaleX;
            scaledHeight = scaledHeight * scaleY;
        }

        return {
            width: scaledWidth,
            height: scaledHeight
        };
    }

    renderCurrentSearchRegionInfo() {
        const result = this.state.searchResult;

        if (
            Array.isArray(result.regions) &&
            result.regions.length > 0 &&
            (0 <= result.selectedRegionIndex && result.selectedRegionIndex < result.regions.length)
        ) {
            const region = result.regions[result.selectedRegionIndex];
            const rect = region.relativeRect || region.matchedRect;
            return (
                `x: ${rect.left}, y: ${rect.top}, w: ${rect.width}, h: ${rect.height}, ` +
                `confidence: ${region.score.toFixed(2)}, order: ${region.order}`
            );
        }

        return null;
    }

    render() {
        const screenDpi = ScreenHelper.getScreenDpi();
        const patternImageSize = this.getPatternImageSize();
        return (
            <div className="page-container">
                <div className="page-row">
                    <div className="container-fluid mt-3">
                        <h3>Image Search</h3>
                        <p>
                            Please upload a pattern file. You can add some noise with "Distort pattern" button. To
                            perform image search click "Search pattern".
                        </p>
                    </div>
                </div>
                <div className="page-row page-row-auto" style={{ minHeight: "250px" }}>
                    <PatternImage
                        src={this.props.patternImage.dataUrl || ""}
                        width={patternImageSize.width}
                        height={patternImageSize.height}
                        drawingState={this.state.drawingState}
                        onImageChange={this.handleImageChange}
                    />
                </div>
                <div className="page-row">
                    <div className="container-fluid mt-3">
                        <div className="row">
                            <div className="col mr-auto">
                                <UploadButton text="Upload pattern" onUpload={this.handlePatternImageUpload} />{" "}
                                <div className="btn-group">
                                    <button
                                        type="button"
                                        className="btn btn-primary dropdown-toggle"
                                        data-toggle="dropdown"
                                        disabled={!this.props.patternImage.dataUrl}
                                    >
                                        Edit pattern
                                    </button>
                                    <div className="dropdown-menu">
                                        <a className="dropdown-item" href="#" onClick={this.handleDistortPatternClick}>
                                            Add noise
                                        </a>
                                        <a className="dropdown-item" href="#" onClick={this.handleDrawPinkBoxClick}>
                                            Draw Pink Box
                                        </a>
                                        <a className="dropdown-item" href="#" onClick={this.handleDrawGreenBoxClick}>
                                            Draw Green Box
                                        </a>
                                        <div className="dropdown-divider" />
                                        <a className="dropdown-item" href="#" onClick={this.handleSaveToDiskClick}>
                                            Save to disk
                                        </a>
                                    </div>
                                </div>{" "}
                                <button className="btn btn-primary" onClick={this.handleCaptureScreenClick}>
                                    Capture screen
                                </button>
                            </div>
                            <div className="col-auto">{this.state.statusText}</div>
                        </div>
                        <div className="form-group row mt-3">
                            <label className="col-sm-3 col-form-label" htmlFor="patternImageDpiX">
                                Pattern Image DPI
                            </label>
                            <div className="col-sm-2">
                                <input
                                    id="patternImageDpiX"
                                    name="patternImageDpiX"
                                    type="number"
                                    className="form-control"
                                    value={this.state.formElements.patternImageDpiX}
                                    min="1"
                                    onChange={this.handleFormElementChange}
                                />
                            </div>
                            <div className="col-sm-2 mr-auto">
                                <input
                                    name="patternImageDpiY"
                                    type="number"
                                    className="form-control"
                                    value={this.state.formElements.patternImageDpiY}
                                    min="1"
                                    onChange={this.handleFormElementChange}
                                />
                            </div>
                            <div className="col-auto">
                                <button
                                    className="btn btn-primary"
                                    disabled={this.state.isSearchPatternDisabled}
                                    onClick={this.handleSearchPatternClick}
                                >
                                    Search pattern
                                </button>
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="offset-sm-3 col-sm-5">
                                <small className="form-text text-muted">{`The screen density is detected as ${screenDpi} DPI`}</small>
                            </div>
                        </div>
                        <div className="form-group row">
                            <label className="col-sm-3 col-form-label" htmlFor="minSimilarity">
                                Min. Similarity
                            </label>
                            <div className="col-sm-4">
                                <input
                                    id="minSimilarity"
                                    name="minSimilarity"
                                    type="number"
                                    className="form-control"
                                    min="0.01"
                                    max="1.00"
                                    step="0.01"
                                    value={this.state.formElements.minSimilarity}
                                    onChange={this.handleFormElementChange}
                                />
                                <small className="form-text text-muted">Enter a value between 0.1 and 1.0.</small>
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="col-sm-3">
                                <div className="form-check my-2">
                                    <input
                                        id="enableSingleMatch"
                                        name="enableSingleMatch"
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={this.state.formElements.enableSingleMatch}
                                        onChange={this.handleFormElementChange}
                                    />
                                    <label className="form-check-label" htmlFor="enableSingleMatch">
                                        Enable N-th match
                                    </label>
                                </div>
                            </div>
                            <div className="col-sm-4">
                                <input
                                    id="singleMatchIndex"
                                    name="singleMatchIndex"
                                    type="number"
                                    className="form-control"
                                    min="0"
                                    disabled={!this.state.formElements.enableSingleMatch}
                                    value={this.state.formElements.singleMatchIndex}
                                    onChange={this.handleFormElementChange}
                                />
                            </div>
                        </div>
                        <div className="form-group row">
                            <label className="col-sm-3 col-form-label" htmlFor="postMatchAction">
                                When a match found
                            </label>
                            <div className="col-sm-4">
                                <select
                                    id="postMatchAction"
                                    name="postMatchAction"
                                    className="form-control"
                                    value={this.state.formElements.postMatchAction}
                                    onChange={this.handleFormElementChange}
                                >
                                    <option value={PostMatchAction.None}>Do nothing</option>
                                    <option value={PostMatchAction.Best}>Click to the best match</option>
                                    <option value={PostMatchAction.All}>Click all matches in order</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="offset-sm-3 col-sm-9">
                                <div className="form-check">
                                    <input
                                        id="enableHighDpi"
                                        name="enableHighDpi"
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={this.state.formElements.enableHighDpi}
                                        onChange={this.handleFormElementChange}
                                    />
                                    <label className="form-check-label" htmlFor="enableHighDpi">
                                        Enable High-DPI processing
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="offset-sm-3 col-sm-9">
                                <div className="form-check">
                                    <input
                                        id="allowSizeVariation"
                                        name="allowSizeVariation"
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={this.state.formElements.allowSizeVariation}
                                        onChange={this.handleFormElementChange}
                                    />
                                    <label className="form-check-label" htmlFor="allowSizeVariation">
                                        Allow size variation
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="offset-sm-3 col-sm-9">
                                <div className="form-check">
                                    <input
                                        id="enableFullScreenCapture"
                                        name="enableFullScreenCapture"
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={this.state.formElements.enableFullScreenCapture}
                                        onChange={this.handleFormElementChange}
                                    />
                                    <label className="form-check-label" htmlFor="enableFullScreenCapture">
                                        Enable full screen capture
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="offset-sm-3 col-sm-9">
                                <div className="form-check">
                                    <input
                                        id="enableGreenPinkBoxes"
                                        name="enableGreenPinkBoxes"
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={this.state.formElements.enableGreenPinkBoxes}
                                        onChange={this.handleFormElementChange}
                                    />
                                    <label className="form-check-label" htmlFor="enableGreenPinkBoxes">
                                        Enable green/pink boxes
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="form-group row">
                            <div className="offset-sm-3 col-sm-9">
                                <div className="form-check">
                                    <input
                                        id="requireGreenPinkBoxes"
                                        name="requireGreenPinkBoxes"
                                        className="form-check-input"
                                        type="checkbox"
                                        disabled={!this.state.formElements.enableGreenPinkBoxes}
                                        checked={this.state.formElements.requireGreenPinkBoxes}
                                        onChange={this.handleFormElementChange}
                                    />
                                    <label className="form-check-label" htmlFor="requireGreenPinkBoxes">
                                        Require green/pink boxes
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="page-row">
                    <div className="container-fluid mt-3">
                        <h5>Region of Interest</h5>
                        <div>
                            <div className="form-group row">
                                <div className="col">
                                    <div className="form-check">
                                        <input
                                            id="limitSearchArea"
                                            name="limitSearchArea"
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={this.state.formElements.limitSearchArea}
                                            onChange={this.handleFormElementChange}
                                        />
                                        <label className="form-check-label" htmlFor="limitSearchArea">
                                            Limit search area
                                        </label>
                                    </div>
                                </div>
                            </div>
                            {this.state.formElements.limitSearchArea && (
                                <div className="form-group row">
                                    <label className="col-sm-3 col-form-label" htmlFor="regionOfInterestLeft">
                                        Region (x, y, w, h)
                                    </label>
                                    <div className="col-sm-2">
                                        <input
                                            id="regionOfInterestLeft"
                                            name="regionOfInterestLeft"
                                            type="number"
                                            className="form-control"
                                            min="0"
                                            value={this.state.formElements.regionOfInterestLeft}
                                            onChange={this.handleFormElementChange}
                                        />
                                    </div>
                                    <div className="col-sm-2">
                                        <input
                                            id="regionOfInterestTop"
                                            name="regionOfInterestTop"
                                            type="number"
                                            className="form-control"
                                            min="0"
                                            value={this.state.formElements.regionOfInterestTop}
                                            onChange={this.handleFormElementChange}
                                        />
                                    </div>
                                    <div className="col-sm-2">
                                        <input
                                            id="regionOfInterestWidth"
                                            name="regionOfInterestWidth"
                                            type="number"
                                            className="form-control"
                                            min="0"
                                            value={this.state.formElements.regionOfInterestWidth}
                                            onChange={this.handleFormElementChange}
                                        />
                                    </div>
                                    <div className="col-sm-2">
                                        <input
                                            id="regionOfInterestHeight"
                                            name="regionOfInterestHeight"
                                            type="number"
                                            className="form-control"
                                            min="0"
                                            value={this.state.formElements.regionOfInterestHeight}
                                            onChange={this.handleFormElementChange}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="page-row">
                    <div className="container-fluid mt-3">
                        <h5>Matches</h5>
                        {this.state.searchResult.regions.length > 0 ? (
                            <div>
                                <div className="form-group row">
                                    <div className="col mr-auto">{this.renderCurrentSearchRegionInfo()}</div>
                                    <div className="col-auto">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={this.handleMatchDownloadClick}
                                        >
                                            Download
                                        </button>{" "}
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={this.handleSetRoiClick}
                                        >
                                            Set ROI
                                        </button>
                                    </div>
                                    <div className="col-auto">
                                        <nav>
                                            <ul className="pagination pagination-sm">
                                                <li
                                                    className={
                                                        "page-item" +
                                                        (this.state.searchResult.selectedRegionIndex === 0
                                                            ? " disabled"
                                                            : "")
                                                    }
                                                >
                                                    <a
                                                        className="page-link"
                                                        href="#"
                                                        onClick={this.handlePrevMatchClick}
                                                    >
                                                        &laquo;
                                                    </a>
                                                </li>
                                                <li className="page-item disabled">
                                                    <a className="page-link" href="#" tabIndex={-1}>
                                                        {`${this.state.searchResult.selectedRegionIndex + 1} / ${
                                                            this.state.searchResult.regions.length
                                                        }`}
                                                    </a>
                                                </li>
                                                <li
                                                    className={
                                                        "page-item" +
                                                        (this.state.searchResult.selectedRegionIndex >=
                                                        this.state.searchResult.regions.length - 1
                                                            ? " disabled"
                                                            : "")
                                                    }
                                                >
                                                    <a
                                                        className="page-link"
                                                        href="#"
                                                        onClick={this.handleNextMatchClick}
                                                    >
                                                        &raquo;
                                                    </a>
                                                </li>
                                            </ul>
                                        </nav>
                                    </div>
                                </div>
                                <div className="form-group row">
                                    <div className="col">
                                        <div className="region-image-container">
                                            {this.state.searchResult.selectedRegionDataUrl && (
                                                <img src={this.state.searchResult.selectedRegionDataUrl} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>No matches</div>
                        )}
                    </div>
                </div>
                <div className="page-row">
                    <div className="container-fluid mt-3">
                        <h5>Stress Test</h5>
                        <div>
                            <div className="form-group row">
                                <label className="col-sm-3 col-form-label" htmlFor="stressTestCount">
                                    Test Count
                                </label>
                                <div className="col-sm-4">
                                    <input
                                        id="stressTestCount"
                                        name="stressTestCount"
                                        type="number"
                                        className="form-control"
                                        min="1"
                                        value={this.state.formElements.stressTestCount}
                                        onChange={this.handleFormElementChange}
                                    />
                                </div>
                            </div>
                            <div className="form-group row">
                                <label className="col-sm-3 col-form-label" htmlFor="stressTestDelay">
                                    Delay Between Each Test (ms)
                                </label>
                                <div className="col-sm-4">
                                    <input
                                        id="stressTestDelay"
                                        name="stressTestDelay"
                                        type="number"
                                        className="form-control"
                                        min="0"
                                        value={this.state.formElements.stressTestDelay}
                                        onChange={this.handleFormElementChange}
                                    />
                                    <small className="form-text text-muted">
                                        Enter 0 for let tests run as fast as possible.
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div>
                            <button
                                className="btn btn-primary"
                                disabled={this.state.testState !== StressTestState.Ready}
                                onClick={this.handleBeginTestClick}
                            >
                                Begin Test
                            </button>{" "}
                            <button
                                className="btn btn-secondary"
                                disabled={this.state.testState === StressTestState.Ready}
                                onClick={this.handleAbortTestClick}
                            >
                                Abort Test
                            </button>
                        </div>
                    </div>
                </div>
                <div className="page-row">
                    <div className="container-fluid mt-3">
                        <h5>Logs</h5>
                        <pre className="logs">{this.props.logs.join("\n")}</pre>
                    </div>
                </div>
            </div>
        );
    }
}

export const App = connect(
    (state: StoreState): Pick<AppProps, "logs" | "patternImage"> => {
        return {
            logs: state.logs,
            patternImage: {
                dataUrl: state.patternImage.dataUrl,
                info: state.patternImage.info
            }
        };
    },
    (dispatch: Dispatch<Actions>): Pick<AppProps, "onAppendToLog" | "onSetPatternImage"> => {
        return {
            onAppendToLog: (text: string) => dispatch(Actions.appendToLog(text)),
            onSetPatternImage: (dataUrl: string, info: kantusearch.ImageInfo) =>
                dispatch(Actions.setPatternImage(dataUrl, info))
        };
    }
)(AppImpl);
