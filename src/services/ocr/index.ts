import request, { Response } from 'superagent'
import { createWorker } from 'tesseract.js';
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
import { getNativeFileSystemAPI, SpecialFolder, NativeFileAPI } from '../filesystem'
import { getXFile } from "../xmodules/xfile";

import path from '../../common/lib/path'
import TesseractWrapper, { TesseractWorkerLog } from './tesseract_c'


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
  engine?:            1 | 2;
  os:                 string;
}

export function runDownloadLog (base64result:any,targetP:any,osType:any): Promise<any> {
  
  const fsAPI = getNativeFileSystemAPI()
  return fsAPI.getSpecialFolderPath({ folder: SpecialFolder.UserProfile })
  .then(profilePath => {
    const uivision = osType == "mac"?'/Library/uivision-xmodules/2.2.2/xmodules/': path.join(profilePath, '\\AppData\\Roaming\\UI.Vision\\XModules\\ocr');
    return fsAPI.ensureDir({ path: uivision })
    .then(Opath => {
     const { rootDir } = getXFile().getCachedConfig();
     let path =uivision;
     let outputpath = rootDir;
     let filepath: string = '', targetpath = targetP;
     if (osType == "mac") {
        filepath = path+'/ocr3';
        //targetpath = outputpath+'/images/image.png';
    }else{
        filepath = path+'\\ocrexe\\ocrcl1.exe';
        //targetpath = outputpath+'\\images\\image.png';
    }
    
     let params={
            fileName: filepath,
            path: targetpath,
            content:base64result,
            waitForExit: true
          }
   return fsAPI.writeAllText(params).
    then(res => {
      if (res != undefined) {
        return res
      }
    }).
     catch(() => console.log({result: false}));
  })
  })
  .catch(e => {
    // Ignore host not found error, `initConfig` is supposed to be called on start
    // But we can't guarantee that native fs module is already installed
    if (!/Specified native messaging host not found/.test(e)) {
      throw e
    }
  })

}

export async function runOCRTesseractC (options: RunOCROptions, logCB: (log:TesseractWorkerLog, isNetwork: boolean | undefined)=> void): Promise<any> {
    const language = options.language;
    const imageDataURL = options.imageDataURL;

    let tesseractWrapper = await TesseractWrapper.getInstance();
    tesseractWrapper.setLogger(logCB);

    let extractionResult = await tesseractWrapper.start(imageDataURL, language);
    let retVal = {
      "ParsedResults": extractionResult.resultData,
      "ProcessingTimeInMilliseconds": extractionResult.processingTimeInMilliseconds,
    }    
    return Promise.resolve(retVal);
}

export function runOCRLocal (options: RunOCROptions): Promise<any> {
  const language = options.language;
  const base64result = options.image;
  const osType = options.os;
  
  const fsAPI = getNativeFileSystemAPI()
  return fsAPI.getSpecialFolderPath({ folder: SpecialFolder.UserProfile })
  .then(profilePath => {
    const uivision = osType == "mac"?'/Library/uivision-xmodules/2.2.2/xmodules/': path.join(profilePath, '\\AppData\\Roaming\\UI.Vision\\XModules\\ocr');
    
    return fsAPI.ensureDir({ path: uivision })
    .then(Opath => {
     const { rootDir } = getXFile().getCachedConfig();
     let path =uivision;
     let outputpath = rootDir;
     let filepath: string = '', targetpath = '';
     if (osType == "mac") {
        filepath = path+'/ocr3';
			  //targetpath = outputpath+'/images/image.png';
        targetpath = outputpath+'/image.png';
		}else{
			  filepath = path+'\\ocrexe\\ocrcl1.exe';
			  //targetpath = outputpath+'\\images\\image.png';
        targetpath = outputpath+'/image.png';
		}
		
     let params={
            fileName: filepath,
            path: targetpath,
            content:base64result,
            waitForExit: true
          }
   return fsAPI.writeAllBytes(params).
    then(res => {
      if (res != undefined) {
        let filepath: string = '';
        let params: any={};
        if (osType == "mac") {
          filepath =  path+'/ocr3';
           params={
             arguments: '--in '+outputpath+"/image.png"+" --out "+outputpath+"/ocr_output.json --lang "+language,
             //arguments: '--in '+outputpath+"/image.png"+" --out "+outputpath+"/ocr_output.json --lang "+language,
             fileName: filepath,
             waitForExit: true
          }
        }else{
          filepath = path+'\\ocrexe\\ocrcl1.exe';
          params={
            arguments: outputpath+"\\image.png"+" "+outputpath+"\\ocr_output.json "+language,
            //arguments: outputpath+"\\images\\image.png"+" "+outputpath+"\\logs\\ocr_output.json "+language,
            fileName: filepath,
            waitForExit: true
          }
        }

        return fsAPI.runProcess(params);
        
      }else{
        console.log({result: false})
        
      }
    }).
    then(res => {
      if (res != undefined  && res.exitCode !=null && res.exitCode >= 0) {
            let filepath: string = '';
            let params: any={};
            if (osType == "mac") {
                params={
                  path: outputpath+"/ocr_output.json",
                  //path: outputpath+"/logs/ocr_output.json",
                  waitForExit: true
                }
              }else{
                params={
                path: outputpath+"\\ocr_output.json",
                //path: outputpath+"\\logs\\ocr_output.json",
                waitForExit: true
                }
              }
              console.log('params:>> ',params);
              return fsAPI.readAllBytes(params);
      }
    }).then(json => {
            if (json){
              if ( json.errorCode == 0 ) {
                //console.log(json.content);
                return json.content;
              }else{
                return false;
              }
            }
          }).
          catch(() => console.log({result: false}));
  })
  })
  .catch(e => {
    // Ignore host not found error, `initConfig` is supposed to be called on start
    // But we can't guarantee that native fs module is already installed
    if (!/Specified native messaging host not found/.test(e)) {
      throw e
    }
  })

}

export function runOCR (options: RunOCROptions): Promise<any> {
  const scaleStr = (options.scale + '').toLowerCase()
  const scale    = ['true', 'false'].indexOf(scaleStr) !== -1 ? scaleStr : 'true'
  const engine   = [1, 2].indexOf(options.engine || 0) !== -1 ? options.engine : 1
  const singleRun = (): Promise<OcrResponse> => {
    return options.getApiUrlAndApiKey()
    .then(server => {
      const { url, key } = server
      const f = new FormData()

      console.log('runOCR url:>> ',url);
      console.log('runOCR key:>> ',key);

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

      console.log('runOCR url:>> ',url);
      console.log('runOCR key:>> ',key);

      f.append('apikey', key)    

      return withTimeout(10 * 1000, () => {
        return request.post(url)
        .send(f)
      })
      .then(
        (res) => {

          // if res.body is json object
          if (res.body && res.body.ErrorMessage && res.body.ErrorMessage.length > 0 && res.body.ErrorMessage[0] === "Unable to recognize the file type") {
            // key is valid
            return true
          } else {
            return false
          }
        })
      .catch(e => { 
        console.log('testOcrSpaceAPIKey e:>> ',e);
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

export function getOcrPositionedWordsFromParseResults (parseResults: OcrParseResult[], searchText:string): OcrPositionedWord[][] {

    const searchWords = searchText
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word !== "");

    // Perform a deep copy of the data to ensure that the original
    // data is used for each search operation
    // const cachedDataDeepCopy = JSON.parse(JSON.stringify(cachedData));
    // const { TextOverlay } = cachedDataDeepCopy[0];
    // const { Lines } = TextOverlay;

    const { TextOverlay } = parseResults[0];
    const { Lines } = TextOverlay;

    console.log('TextOverlay:>> ',TextOverlay); 
    console.log('Lines:>> ',Lines);

    const searchResult = [];

    if (searchWords.length !== 0) {
      for (let i = 0; i < Lines.length; i++) {
        const { Words: lineWords } = Lines[i];
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

            if (wordText === currentSearchWord) {
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