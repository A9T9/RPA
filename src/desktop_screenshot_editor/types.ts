import { OcrTextSearchMatchForHighlight } from "../services/ocr/types";

export namespace DesktopScreenshot {
  export enum RequestType {
    DisplayVisualResult = 'display_visual_result',
    DisplayVisualX = 'display_visual_x',
    DisplayOcrResult = 'display_ocr_result',
    Capture = 'capture'
  }

  export enum ImageSource {
    Storage,
    HardDrive,
    CV,
    DataUrl
  }

  export type Rect = {
    x:      number;
    y:      number;
    width:  number;
    height: number;
  }

  export enum RectType {
    Match,
    Reference,
    BestMatch,
    ReferenceOfBestMatch
  }

  export type StyledRect = Rect & {
    score?: number;
    text?:  string;
    type:   RectType;
    index:  number;
  }

  export type ImageInfo = {
    source: ImageSource;
    path:   string;
    width:  number;
    height: number;
  }

  export type DisplayVisualRequestData = {
    image: ImageInfo;
    rects: StyledRect[];
  }

  export type CaptureRequestData = {
    image: ImageInfo;
  }

  export type DisplayOcrRequestData = {
    image:      ImageInfo;
    ocrMatches: OcrTextSearchMatchForHighlight[];
  }

  export type RequestData = DisplayOcrRequestData | DisplayVisualRequestData | CaptureRequestData

  export type Request = {
    type: RequestType
    data: RequestData
  }
}

