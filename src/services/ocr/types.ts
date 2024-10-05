import { OCRLanguage } from './languages'

export { OCRLanguage }

export type OcrFormDataOptions = {
  apikey:            string;
  image:             FileObject;
  language:          OCRLanguage;
  isOverlayRequired: boolean;
}

export type OcrResponse = {
  ErrorDetails?:                string;
  ErrorMessage:                 string;
  OCRExitCode:                  OCRExitCode;
  IsErroredOnProcessing:        boolean;
  ProcessingTimeInMilliseconds: string;
  SearchablePDFURL:             string;
  ParsedResults:                OcrParseResult[];
}

export type FileObject = {
  blob: Blob;
  name: string;
}

export enum OCRExitCode {
  AllParsed       = 1,
  PartiallyParsed = 2,
  Failed          = 3,
  Fatal           = 4
}

export enum FileParseExitCode {
  FileNotFound    = 0,
  Success         = 1,
  ParseError      = -10,
  Timeout         = -20,
  ValidationError = -30,
  UnknownError    = -99
}

export type OcrParseResult = {
  ErrorDetails:       string;
  ErrorMessage:       string;
  FileParseExitCode:  FileParseExitCode;
  ParsedText:         string;
  TextOrientation:    '0' | string;
  TextOverlay: {
    HasOverlay:       boolean;
    Message:          string;
    Lines:            OcrParseResultLine[]
  }
}

export type OcrParseResultLine = {
  MinTop:     number;
  MaxHeight:  number;
  Words:      OcrParseResultWord[];
}

export type OcrParseResultWord = {
  WordText: string;
  Height:   number;
  Width:    number;
  Top:      number;
  Left:     number;
}

export type WordPosition = {
  pageIndex: number;
  lineIndex: number;
  wordIndex: number;
}

export type OcrPositionedWord = {
  position:   WordPosition;
  word:       OcrParseResultWord;
}

export type OcrTextSearchMatch = {
  similarity: number;
  words:      OcrPositionedWord[];
}

export type OcrTextSearchResult = {
  hit:        OcrTextSearchMatch | null;
  all:        OcrTextSearchMatch[];
  exhaust:    boolean;
}

export enum OcrHighlightType {
  Identified,
  Matched,
  TopMatched,
  WildcardTopMatched,
  WildcardMatched
}

export type OcrTextSearchMatchForHighlight = OcrTextSearchMatch & {
  highlight: OcrHighlightType
}

export interface IOcrMatchesHighlighter {
  clear:      () => void;
  highlight:  (matches: OcrTextSearchMatchForHighlight[]) => void
}

export type OcrServerInfo = {
  url:  string;
  key:  string;
  id?:  OcrServerId;
}

export type OcrServerInfoWithId = Required<OcrServerInfo>

export type OcrServerSanityInfo = {
  lastRequestTimestamp:   number;
  lastResponseTimestamp:  number;
  lastTotalMilliseconds:  number;
  lastOcrExitCode?:       OCRExitCode;
  lastError?:             Error;
}

export type OcrServerId = string
