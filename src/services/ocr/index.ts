import { captureExecutionCloudCall } from '@/common/execution_locality'
import request, { Response } from 'superagent'
import config from '../../config'
import {
  FileObject,
  OCRLanguage,
  OcrResponse,
  OCRExitCode,
  OcrParseResult,
  OcrPositionedWord,
  OcrTextSearchResult,
  OcrParseResultWord,
  OcrTextSearchMatch,
  OcrServerInfo,
  WordPosition
} from './types'
import { withTimeout, dataURItoBlob } from '../../common/utils';
import { or, retry, safeUpdateIn } from '../../common/ts_utils'
import { getNativeFileSystemAPI } from '../filesystem'
import { getXModule2API } from '../xmodules2/native'
import { base64 } from '../../common/base64'


export type RunOCROptions = {
  image:              FileObject | string;
  imageDataURL:       string;
  language:           OCRLanguage;
  isOverlayRequired:  boolean;
  singleApiTimeout:   number;
  totalTimeout:       number;
  getApiUrlAndApiKey: () => Promise<OcrServerInfo>;
  willSendRequest?:   (data: { server: OcrServerInfo, startTime: number }) => Promise<void>;
  didGetResponse?:    (data: { server: OcrServerInfo, response: OcrResponse | null, error: Error | null, startTime: number, endTime: number }) => Promise<void>;
  shouldRetry?:       () => boolean | Promise<boolean>;
  scale?:             boolean | 'true' | 'false';
  isTable?:           boolean | 'true' | 'false';
  engine?:            number;
  // local (xmodule2) reads only: 'ocrs' = the cross-platform engine
  // ("builtin"); absent = the OS engine (Windows.Media.Ocr / Apple Vision)
  localEngine?:       'ocrs';
  os:                 string;
}

export function runDownloadLog (base64result: any, targetP: any, osType: any): Promise<any> {
  const fsAPI = getNativeFileSystemAPI()
  return fsAPI.writeAllText({ path: targetP, content: base64result })
    .catch(() => console.log({ result: false }))
}

// The Javascript (Tesseract) OCR engine was removed 2026-08-14: on every
// benchmarked page it was 2-5x slower than the in-process OS OCR with worse
// accuracy on UI screenshots. Local OCR = ocr_image (below); cloud =
// OCR.space. The ocrs ONNX engine is the planned Linux/in-extension
// fallback (see xmodule2/HANDOVER.md OCR benchmark table).

// OCR.space language codes -> BCP-47 tags the OS OCR engines take.
// ('ce' is the settings UI's code for Czech, see services/ocr/languages.ts)
const OCR_LANGUAGE_TAGS: Record<string, string> = {
  eng: 'en-US', ger: 'de-DE', deu: 'de-DE', fre: 'fr-FR', fra: 'fr-FR',
  spa: 'es-ES', ita: 'it-IT', por: 'pt-PT', rus: 'ru-RU', dut: 'nl-NL',
  nld: 'nl-NL', pol: 'pl-PL', swe: 'sv-SE', dan: 'da-DK', nor: 'nb-NO',
  fin: 'fi-FI', tur: 'tr-TR', gre: 'el-GR', hun: 'hu-HU', cze: 'cs-CZ',
  ce: 'cs-CZ', chs: 'zh-Hans', cht: 'zh-Hant', jpn: 'ja-JP', kor: 'ko-KR',
  ara: 'ar-SA'
}

// BCP-47 tag for an OCR.space language code — what the OS engines (and the
// host's wait_for_text) take. undefined for unknown codes: the host then
// uses its default (user-profile languages / ocrs' Latin models).
export const ocrLanguageTag = (code?: string): string | undefined =>
  OCR_LANGUAGE_TAGS[String(code || '').toLowerCase()]

// Which OCR.space language codes the local OS OCR can read right now, from
// the host's ocr_language_list (BCP-47 tags, e.g. Windows: the languages
// installed in Windows Settings > Language). Matched on the primary
// language subtag — except Chinese, where the script subtag (Hans/Hant)
// separates the two codes.
export function installedLocalOcrLanguages (): Promise<string[]> {
  return getXModule2API().ocrLanguageList().then((tags: string[]) => {
    const installed = (tags || []).map(t => String(t).toLowerCase())
    const matches = (wanted: string): boolean => {
      const w = wanted.toLowerCase()
      const prefix = w.startsWith('zh') ? w : w.split('-')[0]
      return installed.some(t => t === w || t.startsWith(prefix))
    }
    return Object.keys(OCR_LANGUAGE_TAGS).filter(code => matches(OCR_LANGUAGE_TAGS[code]))
  })
}

// The ocrs models the host's cross-platform "builtin" engine reads from
// disk (~12MB, not bundled): downloaded here on first use and handed to the
// host over ocr_install_models — the host has no HTTP client, and the
// extension's fetch + native messaging move the bytes fine.
// Served from our own mirror (verified byte-identical to the upstream
// ocrs-models S3 bucket) so the extension does not depend on a third-party
// bucket staying public; the folder's web.config sends the CORS header and
// the .rten MIME mapping IIS needs.
const OCRS_MODEL_URLS = {
  detection: 'https://download.ui.vision/x2/ocrs/text-detection.rten',
  recognition: 'https://download.ui.vision/x2/ocrs/text-recognition.rten'
}

let pModelInstall: Promise<void> | null = null

function installOcrsModels (): Promise<void> {
  // one download at a time — parallel OCR calls on a fresh install must not
  // fetch 12MB each
  if (pModelInstall) return pModelInstall
  const fetchB64 = (url: string) =>
    fetch(url).then(r => {
      if (!r.ok) throw new Error(`model download failed: HTTP ${r.status} for ${url}`)
      return r.arrayBuffer()
    }).then(buf => base64.encode(new Uint8Array(buf)))
  pModelInstall = Promise.all([fetchB64(OCRS_MODEL_URLS.detection), fetchB64(OCRS_MODEL_URLS.recognition)])
    .then(([detection, recognition]) =>
      getXModule2API().invoke('ocr_install_models', { detection, recognition }))
    .then(() => undefined)
    .catch(e => {
      pModelInstall = null // a failed download may succeed next time
      throw e
    })
  return pModelInstall
}

// xmodule2 path: ONE ocr_image RPC in-process — no temp image file, no
// ocrcl1.exe/ocr3 spawn, no result-file read-back. `localEngine: 'ocrs'`
// asks the host for the cross-platform ocrs engine (the "builtin" reader,
// same recognition on every OS — models auto-installed on first use);
// default is the OS engine (Windows.Media.Ocr / Apple Vision), as before.
// The result is adapted to the OCR.space schema every caller already parses.
// This removes the LAST classic-XModule dependency when xmodule2 is active.
function runOCRLocalViaXModule2 (language: string, imageBase64: string, localEngine?: 'ocrs'): Promise<any> {
  const tag = OCR_LANGUAGE_TAGS[(language || '').toLowerCase()]
  const once = () => getXModule2API().ocrImage({
    content: imageBase64,
    ...(tag ? { language: tag } : {}),
    ...(localEngine ? { engine: localEngine } : {})
  })
  return once()
  .catch(e => {
    // first use of the ocrs engine on this machine: fetch the models, hand
    // them to the host, and retry the same read once
    if (localEngine === 'ocrs' && /ocr_models_missing/.test(String((e && e.message) || e))) {
      return installOcrsModels().then(once)
    }
    // No host at all: the raw "Specified native messaging host not found"
    // used to reach the log as-is, and inside a finder's auto-wait it was
    // retried until the timeout and then reported as "OCR recognised NO
    // text" (2% of 10.0.182 chats in the 2026-09-06 drop, OPEN-ISSUES
    // 35.5). E904 fails fast (retryFind's fatal list) and names the fix.
    const raw = String((e && e.message) || e)
    if (/native messaging host|no such native application/i.test(raw)) {
      throw new Error(`E904: the local OCR reader needs the Desktop Automation XModule, which is NOT installed on this machine (browser reports: ${raw}). Pick a cloud engine under Settings > OCR or pass {engine: ...} to this call — or install the XModule: https://ui.vision/rpa/x/download`)
    }
    throw e
  })
  .then(result => {
    const lines = (result.lines || []).map(line => ({
      LineText: line.text,
      Words: (line.words || []).map(word => ({
        WordText: word.text,
        Left: Math.round(word.rect.x),
        Top: Math.round(word.rect.y),
        Width: Math.round(word.rect.width),
        Height: Math.round(word.rect.height)
      })),
      MaxHeight: Math.max(1, ...(line.words || []).map(w => Math.round(w.rect.height))),
      MinTop: Math.min(...(line.words || []).map(w => Math.round(w.rect.y)))
    }))
    const shaped = {
      ParsedResults: [{
        TextOverlay: { Lines: lines, HasOverlay: true, Message: 'xmodule2 ocr_image' },
        TextOrientation: '0',
        FileParseExitCode: 1,
        ParsedText: result.text || '',
        ErrorMessage: '',
        ErrorDetails: ''
      }],
      OCRExitCode: 1,
      IsErroredOnProcessing: false,
      ProcessingTimeInMilliseconds: '0'
    }
    // Same contract as the old flow's readAllBytes: base64 of the JSON file.
    return base64.encode(new TextEncoder().encode(JSON.stringify(shaped)))
  })
}

export function runOCRLocal (options: RunOCROptions): Promise<any> {
  const language = options.language;
  const base64result = options.image;

  if (typeof base64result !== 'string') {
    return Promise.reject(new Error('Local OCR needs the capture as a data URL'))
  }
  return runOCRLocalViaXModule2(language, base64result, options.localEngine)
}

export function runOCR (options: RunOCROptions): Promise<any> {
  const recordCloudCall = captureExecutionCloudCall('ocrspace')
  const scaleStr = (options.scale + '').toLowerCase()
  const scale    = ['true', 'false'].indexOf(scaleStr) !== -1 ? scaleStr : 'true'
  const engine   = [1, 2, 3].indexOf(options.engine || 0) !== -1 ? options.engine : 1
  const singleRun = (): Promise<OcrResponse> => {
    return options.getApiUrlAndApiKey()
    .then(server => {
      const { url, key } = server
      const f = new FormData()

      // Note: never log `key` here - it is the user's secret OCR API key.
      f.append('apikey', key)
      f.append('language', options.language)
      f.append('scale', scale as string)
      f.append('OCREngine', '' + engine)
      f.append('isOverlayRequired', '' + options.isOverlayRequired)

      if (options.isTable !== undefined) {
        f.append('isTable', '' + options.isTable)
      }

      if (typeof options.image === 'string') {
        f.append('file', dataURItoBlob(options.image), 'unknown.png')
      } else {
        f.append('file', options.image.blob, options.image.name)
      }

      const startTime = new Date().getTime()

      if (options.willSendRequest) {
        options.willSendRequest({ server, startTime })
      }

      return withTimeout(options.singleApiTimeout, () => {
        recordCloudCall()
        return request.post(url)
        .send(f)
      })
      .then(
        (res) => {
          if (options.didGetResponse) {
            return options.didGetResponse({
              server,
              startTime,
              endTime:  new Date().getTime(),
              response: res.body as OcrResponse,
              error:    null
            })
            .then(() => res, () => res)
          }

          return res
        },
        (e) => {
          const err = getApiError(e)

          if (options.didGetResponse) {
            return options.didGetResponse({
              server,
              startTime,
              endTime:  new Date().getTime(),
              response: null,
              error:    err
            })
            .then(() => { throw err }, () => { throw err })
          }

          throw e
        }
      )
      .then(
        onApiReturn,
        onApiError
      )
      .catch(e => {
        if (/timeout/i.test(e.message)) {
          throw new Error(`OCR request timeout ${(options.singleApiTimeout / 1000).toFixed(1)}s`)
        } else {
          throw e
        }
      })
    })
  }

  const run = retry<OcrResponse>(singleRun, {
    // We don't want timeout mechanism from retry, so just make it big enough
    timeout:        options.singleApiTimeout * 10,
    retryInterval:  0,
    shouldRetry:    options.shouldRetry || (() => false)
  })

  return withTimeout(options.totalTimeout, run)
  .catch(e => {
    if (/timeout/i.test(e.message)) {
      throw new Error('OCR timeout')
    } else {
      throw e
    }
  })
}

export function isOcrSpaceFreeKey (key: string): boolean {  
  return !!key && key.startsWith('K8')
}

export function testOcrSpaceAPIKey ({url, key }: { url:string, key: string }): Promise<boolean> {
 
      const f = new FormData()

      f.append('apikey', key)
      // Attach a tiny dummy file so the API gets past content validation
      // and actually authenticates the key. Without a file it returns
      // "E400: No content provided" before ever checking the key.
      f.append('file', new Blob(['x'], { type: 'text/plain' }), 'test.txt')

      // The key is valid unless the API explicitly rejects the KEY itself.
      // A bad key -> HTTP 403 + "E555: API key not valid".
      // A good key -> HTTP 400 + "E501: Not an image or PDF" (our dummy file
      // isn't an image). superagent rejects ALL non-2xx responses, so we must
      // inspect the response in BOTH the success and error handlers.
      const isKeyRejected = (res: any): boolean => {
        if (!res) return false
        const body    = res.body || {}
        const errText = (body.error || res.text || '').toString()
        return res.status === 403 || errText.includes('API key not valid') || errText.includes('E555')
      }

      return withTimeout(10 * 1000, () => {
        return request.post(url)
        .send(f)
      })
      .then(
        (res) => !isKeyRejected(res))
      .catch(e => {
        console.log('testOcrSpaceAPIKey e:>> ',e);
        // Non-2xx responses (incl. the expected 400 for a valid key) land here.
        // Only treat it as invalid when the API actually rejected the key.
        if (e && e.response) {
          return !isKeyRejected(e.response)
        }
        // Network/timeout error - cannot validate.
        return false
      })
}

function getApiError (e: any): Error {
  if (e.response && typeof e.response.body === 'string') {
    return new Error(e.response.body)
  }

  return e as Error
}

function onApiError (e: any) {
  console.error(e)
  throw getApiError(e)
}

function onApiReturn (res: Response) {
  guardOCRResponse(res.body)
  return res.body
}

export function guardOCRResponse (data: OcrResponse) {
  switch (data.OCRExitCode) {
    case OCRExitCode.AllParsed:
      return

    case OCRExitCode.PartiallyParsed:
      throw new Error(
        [
          'Parsed Partially (Only few pages out of all the pages parsed successfully)',
          data.ErrorMessage || '',
          data.ErrorDetails || '',
        ]
        .filter(s => s.length > 0)
        .join('; ')
      )

    case OCRExitCode.Failed:
      throw new Error(
        [
          'OCR engine fails to parse an image',
          data.ErrorMessage || '',
          data.ErrorDetails || '',
        ]
        .filter(s => s.length > 0)
        .join('; ')
      )

    case OCRExitCode.Fatal:
      throw new Error(
        [
          'Fatal error occurs during parsing',
          data.ErrorMessage || '',
          data.ErrorDetails || '',
        ]
        .filter(s => s.length > 0)
        .join('; ')
      )
  }
}

export type SearchTextInOCRResponseOptions = {
  text:           string;
  index:          number;
  parsedResults:  OcrParseResult[],
  exhaust:        boolean;
}

export function wordIteratorFromParseResults (parseResults: OcrParseResult[]) {
  let pageIndex = 0
  let lineIndex = 0
  let wordIndex = 0

  const next = () => {
    const page          = parseResults[pageIndex]
    const currentLines  = page ? page.TextOverlay.Lines : []
    const line          = page ? page.TextOverlay.Lines[lineIndex] : null
    const currentWords  = line ? line.Words : []
    const word          = line ? line.Words[wordIndex] : null

    if (!word) {
      return {
        done: true,
        value: null
      }
    }

    const value: OcrPositionedWord = {
      word,
      position: {
        pageIndex,
        lineIndex,
        wordIndex
      }
    }

    ;[pageIndex, lineIndex, wordIndex] = (() => {
      let nextWordIndex = wordIndex + 1
      let nextLineIndex = lineIndex
      let nextPageIndex = pageIndex

      if (nextWordIndex >= currentWords.length) {
        nextWordIndex = 0
        nextLineIndex += 1
      }

      if (nextLineIndex >= currentLines.length) {
        nextLineIndex = 0
        nextPageIndex += 1
      }

      if (nextPageIndex >= parseResults.length) {
        return [-1, -1, -1]
      }

      return [nextPageIndex, nextLineIndex, nextWordIndex]
    })()

    return {
      value,
      done: false
    }
  }

  return { next }
}

export type IterateFunc = (data: any) => boolean

export function iterateThroughParseResults (parseResults: OcrParseResult[], fn: IterateFunc): void {
  const iterator = wordIteratorFromParseResults(parseResults)

  while (true) {
    const { done, value } = iterator.next()
    if (done) break

    const shouldContinue  = fn(value)
    if (!shouldContinue)  break
  }
}

const getMatchedBlockInfo = (matchedLineWords: any[]) => {
  const matchedLineWordsCopy = [...matchedLineWords];

  const [firstWord] = matchedLineWordsCopy;
  const [lastWord] = matchedLineWordsCopy.reverse();

  const left = firstWord.Left;
  const width = lastWord.Left + lastWord.Width - left;

  let top:any, height:any;

  matchedLineWordsCopy.reverse().forEach(({ Height, Top }) => {
    if (top === undefined || top > Top) top = Top;
    if (height === undefined || height < Height) height = Height;
  });

  return {
    BlockRect: { Left: left, Top: top, Width: width, Height: height },
    BlockCenterPoint: [
      Math.round(left + width / 2),
      Math.round(top + height / 2),
    ],
  };
};

// The XModule Local OCR often returns a whole UI phrase as ONE Word entry —
// "Al Chat", "Ui.Vision Settings", a sidebar tab row as "Logs Shots CSV/TXT
// Visual". The matcher below compares per word token, so a search word can
// never match INSIDE such a token: the text shows up verbatim in the
// recognised-text dump while ocr.findText finds nothing (the
// ClearSidebarLogViaGUI failure mode on macOS). Explode multi-word tokens
// into per-word entries, apportioning the box by character position — the
// split boxes are approximate, but a word's centre stays well inside it.
const explodeMultiWordTokens = (words: any[]): any[] => {
  const out: any[] = []
  for (const w of words) {
    const text = String(w.WordText || '')
    const parts = text.split(/\s+/).filter(s => s.length > 0)
    if (parts.length <= 1) { out.push(w); continue }
    const total = text.length || 1
    let cursor = 0
    for (const part of parts) {
      const idx = text.indexOf(part, cursor)
      cursor = idx + part.length
      out.push({
        ...w,
        WordText: part,
        Left: w.Left + w.Width * (idx / total),
        Width: w.Width * (part.length / total)
      })
    }
  }
  return out
}

// Short UI words come back from OCR with the classic look-alikes swapped —
// "Ok" as "0k", "Yes" as "Ye5", l / I / 1 traded freely (OPEN-ISSUES 18.3,
// the Tesla app's Ok button). For search words of up to 4 characters the
// exact compare is repeated with both sides folded through the confusable
// map; longer words keep the strict compare, where a swapped character is
// more likely a different word than a misread. Wildcard words are untouched.
const CONFUSABLE: Record<string, string> = { '0': 'o', '1': 'l', 'i': 'l', '|': 'l', '5': 's', '8': 'b', '2': 'z' }
function confusableFold (s: string): string {
  return s.replace(/[01i|582]/g, (c) => CONFUSABLE[c] || c)
}
export function confusableEqual (wordText: string, searchWord: string): boolean {
  if (!searchWord || searchWord.length > 4) return false
  if (/[?*]/.test(searchWord)) return false
  return confusableFold(wordText) === confusableFold(searchWord)
}

export function getOcrPositionedWordsFromParseResults (parseResults: OcrParseResult[], searchText:string): OcrPositionedWord[][] {

    const searchWords = searchText
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word !== "");

    // Search EVERY parsed result: the recognised-text dump shown on a miss
    // joins all of them, so a word visible there must be findable here —
    // reading only parseResults[0] made any later result unmatchable.
    const Lines = (parseResults || []).flatMap(pr => (pr && pr.TextOverlay && pr.TextOverlay.Lines) || [])

    const searchResult = [];

    if (searchWords.length !== 0) {
      for (let i = 0; i < Lines.length; i++) {
        const lineWords = explodeMultiWordTokens(Lines[i].Words || []);
        let currentMatch = [];

        for (let j = 0; j < lineWords.length; j++) {
          const word = lineWords[j];
          const wordText = word.WordText.toLowerCase().replace(
            /[,\.\"]/g,
            ""
          );

          const currentSearchWordIndex = currentMatch.length;
          const currentSearchWord = searchWords[currentSearchWordIndex];

          if (
            currentSearchWord.indexOf("?") > -1 ||
            currentSearchWord.indexOf("*") > -1
          ) {
            // Regular expression matching based on wildcard characters such as ? and *

            const searchPattern = currentSearchWord
              .replace(/\?/g, ".")
              .replace(/\*/g, ".*?");

            const regexp = new RegExp(`^${searchPattern}$`);
            if (regexp.test(wordText)) {
              currentMatch.push(word);
            } else {
              currentMatch = [];
            }
          } else {
            // Matching based on text comparison method.

            if (wordText === currentSearchWord || confusableEqual(wordText, currentSearchWord)) {
              currentMatch.push(word);
            } else {
              currentMatch = [];
            }
          }

          // When a set of information is matched, push it into searchResult, clear
          // currentMatch, and prepare to start matching the next set of information.
          if (currentMatch.length === searchWords.length) {
            const { BlockRect, BlockCenterPoint } =
              getMatchedBlockInfo(currentMatch);

            // Since searchText could be either text or a regular expression, concatenation
            // should be based on the actual matched content rather than searchText
            const matchedBlockText = currentMatch
              .map(({ WordText }) => WordText)
              .join(" ");

            searchResult.push({
              Block: { Text: matchedBlockText, ...BlockRect },
              BlockCenterPoint,
              Words: currentMatch,
            });

            currentMatch = [];
          }
        }
      }
    }

    const SearchResult  = {
      MatchesFound: searchResult.length,
      Matches: searchResult,
    };

    console.log('SearchResult:>> ', SearchResult);

    const convertSearchResultToFound = (searchResult: any): OcrPositionedWord[][] => {
      let found: OcrPositionedWord[][]  = [];
      searchResult.Matches.forEach((match: any) => {
        let foundItem: OcrPositionedWord[] = [];

        match.Words.forEach((word: any) => {
          foundItem.push({
            word,
            position: {
              pageIndex: word.pageIndex,
              lineIndex: word.lineIndex,
              wordIndex: word.wordIndex,
            },
          });
        });

        found.push(foundItem);
      });
      return found;
    };

    let found = convertSearchResultToFound(SearchResult)   
    return found;
}

export function searchTextInOCRResponse (data: SearchTextInOCRResponseOptions): OcrTextSearchResult {
  const { text, index, parsedResults, exhaust } = data
  console.log('searchTextInOCRResponse data:>> ',data);
  const isExactMatch: boolean = /^\[.*\]$/.test(text)
  const realText: string = isExactMatch ? text.slice(1, -1) : text
  const words: string[] = realText.split(/\s+/g).map(s => s.trim()).filter(s => s.length > 0)

  if (index < 0 || Math.round(index) !== index) {
    throw new Error('index must be positive integer')
  }

  let found: OcrPositionedWord[][] = [] 

  found = getOcrPositionedWordsFromParseResults(parsedResults, text);

  console.log('found:>> ',found);

  const all = found.filter(pWords => pWords.length === words.length)
                    .map(pWords => ({
                      words:      pWords,
                      // Note: similarity is useless in current implementation
                      similarity: 1
                    }))
  const hit = all[index] || null

  return {
    hit,
    all,
    exhaust
  }
}

export function isWordEqual (a: string, b: string): boolean {
  if (!a || !b) return false
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export enum WordMatchType {
  Full,
  Prefix,
  Postfix,
  AnyPart
}


function wildcardToRegExp(pattern:string) {
  // Escape special characters in the pattern
  const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Replace wildcard characters with their regex equivalents
  const regexPattern = escapedPattern
    .replace(/\\\*/g, '.*')  // Replace \* with .*
    .replace(/\\\?/g, '.');   // Replace \? with .

  // Create RegExp object with the pattern and global flag
  return new RegExp('^' + regexPattern + '$');
}

// Example usage:
// console.log(matchWithWildcard('hello', 'he*'));   // true
// console.log(matchWithWildcard('hello', 'h?llo')); // true
// console.log(matchWithWildcard('hello', 'he??o')); // true
// console.log(matchWithWildcard('hello', 'hi*'));   // false
function matchWithWildcard(string:string, pattern:string) {
  const regex = wildcardToRegExp(pattern);
  return regex.test(string);
}

export function hasWordMatch (pattern: string, target: string, matchType: WordMatchType): boolean {
  if (!pattern || !target)  return false

  const lowerPattern = pattern.trim().toLowerCase()
  const lowerTarget  = target.trim().toLowerCase()

  switch (matchType) {
    case WordMatchType.Full: {
      return lowerPattern === lowerTarget
    }

    case WordMatchType.Prefix: {
      return lowerTarget.indexOf(lowerPattern) === 0
    }

    case WordMatchType.Postfix: {
      const index = lowerTarget.indexOf(lowerPattern)
      return index !== -1 && index === lowerTarget.length - lowerPattern.length
    }

    case WordMatchType.AnyPart: {
      let wMatch = matchWithWildcard(lowerTarget, lowerPattern)
      console.log('wMatch:>> ', wMatch)
      return wMatch;
    }
  }
}

export function isWordPositionEqual (a: WordPosition, b: WordPosition): boolean {
  return a.pageIndex === b.pageIndex &&
          a.lineIndex === b.lineIndex &&
          a.wordIndex === b.wordIndex
}

export function allWordsWithPosition (parseResults: OcrParseResult[], excludePositions: WordPosition[]): OcrPositionedWord[] {
  const result = [] as OcrPositionedWord[]
  const isAtKnownPosition = (wordWithPos: OcrPositionedWord) => {
    return excludePositions.reduce((prev: boolean, pos: WordPosition) => {
      if (prev) return true
      return isWordPositionEqual(pos, wordWithPos.position)
    }, false)
  }

  // TODO: consider using getOcrPositionedWordsFromParseResults instead of iterateThroughParseResults
  iterateThroughParseResults(parseResults, (wordWithPos: OcrPositionedWord) => {
    if (!isAtKnownPosition(wordWithPos)) {
      result.push(wordWithPos)
    }
    return true
  })

  return result
}

type Point  = { x: number, y: number,width: number, height: number }
type Rect   = { x: number, y: number, width: number, height: number }

export function ocrMatchRect (match: OcrTextSearchMatch): Rect {
  const rectsByLine = match.words.reduce((prev: Record<string, Rect>, cur: OcrPositionedWord) => {
    const key = `${cur.position.pageIndex}_${cur.position.lineIndex}`

    if (!prev[key]) {
      prev[key] = {
        x:      cur.word.Left,
        y:      cur.word.Top,
        width:  cur.word.Width,
        height: cur.word.Height
      }
    } else {
      prev[key] = {
        ...prev[key],
        width:  Math.max(prev[key].width, cur.word.Left + cur.word.Width - prev[key].x),
        height: Math.max(prev[key].height, cur.word.Top + cur.word.Height - prev[key].y)
      }
    }

    return prev
  }, {} as Record<string, Rect>)

  const widestRect = Object.keys(rectsByLine).reduce((prev: Rect, key: string) => {
    return prev.width < rectsByLine[key].width ? rectsByLine[key] : prev
  }, { x: 0, y: 0, width: 0, height: 0 })

  return widestRect
}

export function ocrMatchCenter (match: OcrTextSearchMatch): Point {
  const rect = ocrMatchRect(match)
  
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    width:  rect.width,
    height: rect.height
  }
}

export function scaleOcrParseResultWord (word: OcrParseResultWord, scale: number): OcrParseResultWord {
  return {
    ...word,
      Width:  scale * word.Width,
      Height: scale * word.Height,
      Left:   scale * word.Left,
      Top:    scale * word.Top
  }
}

// export function scaleOcrParseResultWord (word: OcrParseResultWord, scale: number): OcrParseResultWord {  const scaledWord = {
//     ...word,
//     Width: scale * word.Width,
//     Height: scale * word.Height,
//     Left: scale * word.Left,
//     Top: scale * word.Top
//   };

//   // Adjust positions based on scaling factor
//   scaledWord.Left /= scale;
//   scaledWord.Top /= scale;

//   return scaledWord;
// }


export function scaleOcrResponseCoordinates (res: OcrResponse, scale: number): OcrResponse {
  const data = safeUpdateIn(
    ['ParsedResults', '[]', 'TextOverlay', 'Lines', '[]', 'Words', '[]'],
    (word: OcrParseResultWord) => scaleOcrParseResultWord(word, scale),
    res
  )

  return data
}

export function scaleOcrTextSearchMatch (match: OcrTextSearchMatch, scale: number): OcrTextSearchMatch {
  const data = safeUpdateIn(
    ['words', '[]', 'word'],
    (word: OcrParseResultWord) => scaleOcrParseResultWord(word, scale),
    match
  )

  return data
}
