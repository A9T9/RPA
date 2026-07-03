import { Point } from "./point";

/**
 * Holds some information which will be used during screen capturing.
 */
export interface PageInfo {
    pageWidth: number;
    pageHeight: number;
    windowWidth: number;
    windowHeight: number;
    hasBody: boolean;
    originalX: number;
    originalY: number;
    originalOverflowStyle: string | null;
    originalBodyOverflowYStyle: string | null;
    devicePixelRatio: number;
}

/**
 * Interface for screen capture functionality.
 */
export interface CaptureAdapter {
    startCaptureAsync(): Promise<PageInfo>;
    scrollPageAsync(target: Point): Promise<Point>;
    endCaptureAsync(pageInfo: PageInfo): Promise<boolean>;
}
