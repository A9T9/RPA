
export namespace KantuCV {
  export enum MethodType {
    GetVersion      = "get_version",
    GetDesktopDpi   = "get_desktop_dpi",
    GetImageInfo    = "get_image_info",
    CaptureDesktop  = "capture_desktop",
    SearchImage     = "search_image",
    SearchDesktop   = "search_desktop",
    GetMaxFileRange = "get_max_file_range",
    GetFileSize     = "get_file_size",
    ReadFileRange   = "read_file_range"
  }

  export const enum ImageFormat {
    Unknown,
    Png
  }

  export const enum ColorFormat {
    Unknown,
    Palette,
    Grayscale,
    GrayscaleAlpha,
    Rgb,
    Rgba
  }

  export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface DpiInfo {
    dpiX: number;
    dpiY: number;
  }

  export interface ImageInfo {
    format: ImageFormat;
    width: number;
    height: number;
    bitDepth: number;
    color: ColorFormat;
    dpiX: number;
    dpiY: number;
  }

  export interface Image {
    width: number;
    height: number;
    dpiX: number;
    dpiY: number;
    data: string;
  }

  export interface ImageSearchOptions {
    /**
     * Enables High DPI image search.
     */
    enableHighDpi: boolean;

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

    /**
     * Enables region of interest
     */
    limitSearchArea: boolean;

    /**
     * Region of interest (only applicable when limitSearchArea == true)
     */
    searchArea?: Rect;

    /**
     * Saves desktop capture on disk (only valid in desktop search)
     */
    saveCaptureOnDisk?: boolean;

    /**
     * Desktop capture save path. If omitted, an automatic path will be used (only valid in desktop search and when saveCaptureOnDisk == true)
     */
    capturePath?: string;
  }

  export interface ImageSearchRegion {
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

  export const enum ImageSearchErrorCode {
    Ok,
    Fail,
    NoGreenPinkBoxes,
    NoPinkBox,
    TooManyGreenBox,
    TooManyPinkBox
  }

  export interface ImageSearchResult {
    errorCode: ImageSearchErrorCode;
    containsGreenPinkBoxes: boolean;
    regions: Array<ImageSearchRegion>;
    capturePath?: string;
  }

  export interface FileRangeBuffer {
    rangeStart: number;
    rangeEnd: number;
    buffer: string;
  }
}
