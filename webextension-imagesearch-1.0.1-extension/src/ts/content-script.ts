import "./web-extensions";
import { PageInfo, CaptureAdapter } from "./capture-adapter";
import { Point } from "./point";
import { delayAsync } from "./utils";
import {
    BackgroundConnection,
    ExtensionMessageSenderType,
    ExtensionMessage,
    ExtensionMessageType
} from "./extension-connection";
import { RegionSelector } from "./region-selector";
import { EventSimulator } from "./event-simulator";

let background: BackgroundConnection;
let regionSelector: RegionSelector;

/**
 * Defines a highlighted region and holds information about HTML elements which will be used for visual feedback.
 */
class Region {
    area: kantusearch.ImageSearchRegion;
    matchedElement?: HTMLElement;
    relativeElement?: HTMLElement;

    /**
     * Constructs a new Region object.
     * @param area Defines ROI which will be highlighted.
     */
    constructor(area: kantusearch.ImageSearchRegion) {
        // Clone area object.
        this.area = Object.assign({}, area) as kantusearch.ImageSearchRegion;

        this.matchedElement = this.createRegionElement(
            "__kantusearch_region_matched",
            this.area.matchedRect,
            this.area.score,
            this.area.order
        );
        if (this.area.relativeRect) {
            this.relativeElement = this.createRegionElement(
                "__kantusearch_region_relative",
                this.area.relativeRect,
                this.area.score,
                this.area.order
            );
        }
    }

    private createRegionElement(className: string, rect: kantusearch.Rect, confidence: number, order: number) {
        // Create highlight around the target.
        const element = document.createElement("div");
        element.className = `__kantusearch_region ${className}`;
        element.style.left = rect.left + "px";
        element.style.top = rect.top + "px";
        element.style.width = rect.width + "px";
        element.style.height = rect.height + "px";

        // Create confidence (score) label
        const confidenceLabel = document.createElement("span");
        confidenceLabel.innerText = `${confidence.toFixed(2)} @ ${order}`;
        element.appendChild(confidenceLabel);

        // Finally append it to DOM.
        document.body.appendChild(element);

        return element;
    }

    /**
     * Checks whether given Point object intersects.
     * @param p Point object.
     * @returns True if intersects, false otherwise.
     */
    isIntersect(p: Point): boolean {
        const rect = this.area.relativeRect || this.area.matchedRect;
        return rect.left <= p.x && p.x <= rect.left + rect.width && (rect.top <= p.y && p.y <= rect.top + rect.height);
    }

    /**
     * Removes the underlying element from DOM.
     */
    dispose() {
        if (this.matchedElement) {
            this.matchedElement.remove();
            this.matchedElement = undefined;
        }

        if (this.relativeElement) {
            this.relativeElement.remove();
            this.relativeElement = undefined;
        }
    }

    /**
     * Hides the underlying DOM element.
     */
    hide() {
        if (this.matchedElement) {
            this.matchedElement.style.display = "none";
        }

        if (this.relativeElement) {
            this.relativeElement.style.display = "none";
        }
    }

    /**
     * Shows the underlying DOM element which is made hidden before.
     */
    show() {
        if (this.matchedElement) {
            this.matchedElement.style.display = null;
        }

        if (this.relativeElement) {
            this.relativeElement.style.display = null;
        }
    }

    /**
     * Makes the region as focused.
     */
    focus() {
        if (this.matchedElement) {
            this.matchedElement.style.background = "rgba(254, 20, 146, 0.3)";
        }

        if (this.relativeElement) {
            this.relativeElement.style.background = "rgba(254, 20, 146, 0.3)";
        }
    }

    /**
     * Removes focus.
     */
    blur() {
        if (this.matchedElement) {
            this.matchedElement.style.background = null;
        }

        if (this.relativeElement) {
            this.relativeElement.style.background = null;
        }
    }
}

/**
 * Manages highlighted regions lifetime.
 */
export class RegionManager {
    private static regions: Array<Region> = new Array<Region>();

    /**
     * Gets region at given point.
     * @param p Point object.
     * @returns Matched the first region if found, undefined otherwise.
     */
    static getFromPoint(p: Point): Region | undefined {
        for (const region of this.regions) {
            if (region.isIntersect(p)) {
                return region;
            }
        }

        return undefined;
    }

    /**
     * Adds a new highlighted region.
     * @param area Highlighted ROI.
     */
    static add(area: kantusearch.ImageSearchRegion) {
        const region = new Region(area);
        this.regions.push(region);
    }

    /**
     * Removes a highlighted region which is located at given index.
     * @param index Index of the region.
     */
    static removeAt(index: number) {
        const region = this.regions[index];
        region.dispose();
        this.regions.splice(index, 1);
    }

    /**
     * Clears all regions.
     */
    static clear() {
        while (this.regions.length > 0) {
            this.removeAt(0);
        }
    }

    /**
     * Hides all regions.
     */
    static hideAll() {
        for (const region of this.regions) {
            region.hide();
        }
    }

    /**
     * Shows all regions.
     */
    static showAll() {
        for (const region of this.regions) {
            region.show();
        }
    }

    /**
     * Gets region count.
     */
    static get count(): number {
        return this.regions.length;
    }
}

/**
 * Screen capture adapter which can run in context of browser tab.
 */
class DomCaptureAdapter implements CaptureAdapter {
    startCaptureAsync(): Promise<PageInfo> {
        const body = document.body;
        const widths = [
            document.documentElement.clientWidth,
            document.documentElement.scrollWidth,
            document.documentElement.offsetWidth,
            body ? body.scrollWidth : 0,
            body ? body.offsetWidth : 0
        ];
        const heights = [
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight,
            body ? body.scrollHeight : 0,
            body ? body.offsetHeight : 0
        ];

        const data: PageInfo = {
            pageWidth: Math.max(...widths),
            pageHeight: Math.max(...heights),
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            hasBody: !!body,
            originalX: window.scrollX,
            originalY: window.scrollY,
            originalOverflowStyle: document.documentElement.style.overflow,
            originalBodyOverflowYStyle: body && body.style.overflowY,
            devicePixelRatio: window.devicePixelRatio
        };

        // Note: try to make pages with bad scrolling work, e.g., ones with
        // `body { overflow-y: scroll; }` can break `window.scrollTo`
        if (body) {
            body.style.overflowY = "visible";
        }

        // Disable all scrollbars. We'll restore the scrollbar state when we're done
        // taking the screenshots.
        document.documentElement.style.overflow = "hidden";

        return Promise.resolve(data);
    }

    scrollPageAsync(target: Point): Promise<Point> {
        window.scrollTo(target.x, target.y);

        return delayAsync(() => {
            return {
                x: window.scrollX,
                y: window.scrollY
            } as Point;
        }, 100);
    }

    endCaptureAsync(pageInfo: PageInfo): Promise<boolean> {
        if (pageInfo.hasBody) {
            document.body.style.overflowY = pageInfo.originalBodyOverflowYStyle;
        }

        document.documentElement.style.overflow = pageInfo.originalOverflowStyle;
        window.scrollTo(pageInfo.originalX, pageInfo.originalY);

        return Promise.resolve(true);
    }
}

/**
 * Registers a common stylesheet for various tasks.
 */
function registerStyles() {
    const style = document.createElement("style");
    style.innerHTML = `
        .__kantusearch_region {
            display: block;
            position: absolute;
            z-index: 100000;
        }

        .__kantusearch_region > span {
            display: inline-block;
            position: absolute;
            text-align: right;
            font-family: "Courier New", Courier, monospace;
            font-size: 10px;
            top: -12px;
            left: -50px;
            min-width: 25px;
        }

        .__kantusearch_region_matched {
            border: 1px solid #00ff00;
        }

        .__kantusearch_region_matched > span {
            color: #00ff00;
        }

        .__kantusearch_region_relative {
            border: 1px solid #fe1492;
        }

        .__kantusearch_region_relative > span {
            color: #fe1492;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Triggers click event of intersected DOM element in the given region.
 * @param match Find result of a successful image search.
 * @param delayMs Delay after click in milliseconds.
 * @returns True if successful, false otherwise.
 */
async function simulateClickAsync(match: kantusearch.ImageSearchRegion, delayMs: number): Promise<boolean> {
    // For now, we only trigger DOM element at the center of ROI.

    const rect = match.relativeRect || match.matchedRect;
    const center: Point = {
        x: Math.ceil(rect.left + rect.width / 2),
        y: Math.ceil(rect.top + rect.height / 2)
    };

    // Temporarily hide underlying region.
    const matchedRegion = RegionManager.getFromPoint(center);
    if (matchedRegion) {
        matchedRegion.hide();
    }

    // Perform query against DOM.
    // `document.elementFromPoint` API requires viewport coordinates.
    // So, we need to scroll document.
    window.scrollTo(center.x - 100, center.y - 100);

    // Wait a little bit
    await delayAsync(() => {}, 100);

    // Calculate viewport coordinates
    const viewportPosition: Point = {
        x: center.x - window.pageXOffset,
        y: center.y - window.pageYOffset
    };
    const elem = document.elementFromPoint(viewportPosition.x, viewportPosition.y) as HTMLElement;

    // Restore hidden region
    if (matchedRegion) {
        matchedRegion.show();
    }

    if (elem && "click" in elem) {
        if (matchedRegion) {
            matchedRegion.focus();
        }

        // Change element outline and restore it later
        // for debugging purposes
        const originalOutline = elem.style.outline;
        elem.style.outline = "1px solid #6600ff !important";

        EventSimulator.sendClick(elem, center);
        await delayAsync(() => {}, delayMs);

        if (matchedRegion) {
            matchedRegion.blur();
        }

        // Restore element outline
        elem.style.outline = originalOutline;

        return true;
    }

    return false;
}

/**
 * Handles request messages which are sent from the extension.
 * @param msg The request which is sent from the extension.
 * @returns Promise object to handle responses.
 */
async function backgroundMessageHandler(msg: ExtensionMessage): Promise<any> {
    console.log("Kantu Search Extension message received: ", msg);
    switch (msg.type) {
        case ExtensionMessageType.SelectRegion: {
            const pageCoords = await regionSelector.selectAsync();

            // Convert page coordinates to view port coordinates
            const viewCoords = {
                left: pageCoords.left - window.pageXOffset,
                top: pageCoords.top - window.pageYOffset,
                right: pageCoords.right - window.pageXOffset,
                bottom: pageCoords.bottom - window.pageYOffset
            };

            return viewCoords;
        }

        case ExtensionMessageType.StartCaptureFullScreen: {
            const adapter = new DomCaptureAdapter();
            return await adapter.startCaptureAsync();
        }

        case ExtensionMessageType.EndCaptureFullScreen: {
            const adapter = new DomCaptureAdapter();
            return await adapter.endCaptureAsync(msg.data.pageInfo);
        }

        case ExtensionMessageType.ScrollPage: {
            const adapter = new DomCaptureAdapter();
            return await adapter.scrollPageAsync(msg.data.offset);
        }

        case ExtensionMessageType.GetScrollOffset: {
            const offset = {
                x: window.pageXOffset,
                y: window.pageYOffset
            };
            return offset;
        }

        case ExtensionMessageType.ClearRegions: {
            RegionManager.clear();
            return undefined;
        }

        case ExtensionMessageType.HighlightRegions: {
            RegionManager.clear();
            for (let region of msg.data.regions) {
                RegionManager.add(region);
            }
            return undefined;
        }

        case ExtensionMessageType.ClickRegion: {
            await simulateClickAsync(msg.data.region, msg.data.delay);
            return undefined;
        }
    }

    return undefined;
}

// We only work for top window
const isTopWindow = window.top === window;
if (isTopWindow) {
    registerStyles();

    background = new BackgroundConnection(ExtensionMessageSenderType.ContentScript, backgroundMessageHandler);
    background.sendAsync(ExtensionMessageType.Initialized);

    regionSelector = new RegionSelector();
}
