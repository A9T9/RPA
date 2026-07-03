/**
 * Type definitions for Kantu Search WebAssembly module.
 */

declare namespace kantusearch {
    const enum ImageFormat {
        Unknown,
        Png
    }

    const enum ColorFormat {
        Unknown,
        Palette,
        Grayscale,
        GrayscaleAlpha,
        Rgb,
        Rgba
    }

    interface Rect {
        left: number;
        top: number;
        width: number;
        height: number;
    }

    interface ImageInfo {
        format: ImageFormat;
        width: number;
        height: number;
        bitDepth: number;
        color: ColorFormat;
        dpiX: number;
        dpiY: number;
    }

    interface ImageSearchOptions {
        /**
         * Minimum similarity (confidence level) to consider a match.
         */
        minSimilarity: number;

        /**
         * Allows size variation during image search.
         */
        allowSizeVariation: boolean;

        /**
         * Enables green/pink boxes.
         */
        enableGreenPinkBoxes: boolean;

        /**
         * Requires green/pink boxes, returns error otherwise.
         * It's only available when `enableGreenPinkBoxes` is true.
         */
        requireGreenPinkBoxes: boolean;
    }

    interface ImageSearchRegion {
        /**
         * Matched area of the search. When green/pink boxes enabled, indicates green (matched) area.
         */
        matchedRect: Rect;

        /**
         * Relative area (pink box) to matched area. Only available when green/pink boxes enabled.
         */
        relativeRect?: Rect;

        /**
         * Confidence score in [0, 1] range.
         */
        score: number;

        /**
         * Screen scanline (raster) order.
         */
        order: number;
    }

    const enum ImageSearchErrorCode {
        Ok,
        Fail,
        NoGreenPinkBoxes,
        NoPinkBox,
        TooManyGreenBox,
        TooManyPinkBox
    }

    interface ImageSearchResult {
        errorCode: ImageSearchErrorCode;
        containsGreenPinkBoxes: boolean;
        regions: Array<ImageSearchRegion>;
    }

    class Image {
        constructor(width: number, height: number);
        delete(): void;

        width: number;
        height: number;
        data: Uint8Array;
    }

    function getModuleVersion(): string;
    function searchRect(image: Image, color: number, distanceThreshold: number): Array<Rect>;
    function searchImage(image: Image, pattern: Image, options: ImageSearchOptions): ImageSearchResult;
    function resizeImage(source: Image, scaleX: number, scaleY: number): Image;
    function readImageInfo(data: number, length: number): ImageInfo | undefined;
}
