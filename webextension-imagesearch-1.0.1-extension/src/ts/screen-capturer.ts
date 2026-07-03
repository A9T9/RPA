import { PageInfo, CaptureAdapter } from "./capture-adapter";
import { Point } from "./point";
import { ImageHelper } from "./image-helper";

function createCanvas(width: number, height: number, pixelRatio: number = 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    return canvas;
}

function getAllScrollOffsets(pageInfo: PageInfo, topPadding: number = 150): Array<Point> {
    const topPad = pageInfo.windowHeight > topPadding ? topPadding : 0;
    const xStep = pageInfo.windowWidth;
    const yStep = pageInfo.windowHeight - topPad;
    const result = new Array<Point>();

    // Note: bottom comes first so that when we render those screenshots one by one to the final canvas,
    // those at top will overwrite top padding part of those at bottom, it is useful if that page has some fixed header
    for (let y = pageInfo.pageHeight - pageInfo.windowHeight; y > -1 * yStep; y -= yStep) {
        for (let x = 0; x < pageInfo.pageWidth; x += xStep) {
            result.push({ x, y });
        }
    }

    return result;
}

/**
 * Defines captured screen data
 */
export interface CaptureData {
    /**
     * Scroll offset of the page.
     */
    offset: Point;

    /**
     * Image data in form of data URL.
     */
    dataUrl?: string;
}

/**
 * Provides screen capturing functionality.
 */
export class ScreenCapturer {
    adapter: CaptureAdapter;

    /**
     * Constructs a new ScreenCapturer instance.
     * @param adapter Capture adapter to be used during screen capture.
     */
    constructor(adapter: CaptureAdapter) {
        this.adapter = adapter;
    }

    /**
     * Captures visible viewport of the browser screen.
     * @param tab Active tab
     * @returns Captured image data URL.
     */
    static async captureVisibleTabAsync(tab: browser.tabs.Tab): Promise<string> {
        // Chrome and Firefox has different behaviour for captureVisibleTab.
        // It's reported that Firefox returns low-resolution image on high DPI devices.
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1278507
        //
        // We can detect this bug by comparing tab and captured image dimensions.
        // For a device with devicePixelRatio=2 following are reported:
        //
        //   Chrome:
        //     Tab: 1280x720 px
        //     Capture: 2560x1440 px
        //
        //   Firefox:
        //     Tab: 1280x720 px
        //     Capture: 1280x720 px
        //
        let result = await browser.tabs.captureVisibleTab(tab.windowId, { format: "png" });
        const img = await ImageHelper.loadImageAsync(result);
        const hasLowResBug = (window.devicePixelRatio !== 1.0)
                    ? (tab.width === img.naturalWidth) && (tab.height === img.naturalHeight)
                    : false;
        if (hasLowResBug) {
            const scaledWidth = Math.ceil(img.naturalWidth * window.devicePixelRatio);
            const scaledHeight = Math.ceil(img.naturalHeight * window.devicePixelRatio);

            const canvas = document.createElement("canvas") as HTMLCanvasElement;
            canvas.width = scaledWidth;
            canvas.height = scaledHeight;
            const context = canvas.getContext("2d") as CanvasRenderingContext2D;
            if (!context) {
                throw new Error("Cannot acquire 2D context.");
            }

            context.drawImage(img, 0, 0, scaledWidth, scaledHeight);
            result = canvas.toDataURL();
        }

        return result;
    }

    /**
     * Captures browser screen completely for a given tab.
     * @param tab Tab to be captured.
     * @returns Promise object for capture result as data URL.
     */
    async captureFullScreenAsync(tab: browser.tabs.Tab): Promise<string | undefined> {
        const pageInfo = await this.adapter.startCaptureAsync();
        const canvas = createCanvas(pageInfo.pageWidth, pageInfo.pageHeight, pageInfo.devicePixelRatio);
        const context = canvas.getContext("2d");
        if (context) {
            const scrollOffsets = getAllScrollOffsets(pageInfo);

            for (let offset of scrollOffsets) {
                const realOffset = await this.adapter.scrollPageAsync(offset);
                const imageDataUrl = await ScreenCapturer.captureVisibleTabAsync(tab);
                const imageData = await ImageHelper.loadImageDataAsync(imageDataUrl);
                context.putImageData(
                    imageData,
                    realOffset.x * pageInfo.devicePixelRatio,
                    realOffset.y * pageInfo.devicePixelRatio
                );
            }

            const result = canvas.toDataURL();
            await this.adapter.endCaptureAsync(pageInfo);
            return result;
        }

        return undefined;
    }
}
