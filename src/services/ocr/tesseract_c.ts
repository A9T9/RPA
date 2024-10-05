
import Tesseract,  { createWorker } from 'tesseract.js';

interface TesseractWorkerConfig {
  workerBlobURL?: boolean;
  workerPath?: string;
  corePath?: string;
  langPath?: string;
  logger?: (log: TesseractWorkerLog) => void;
  // Add other optional configs as needed
}

export interface TesseractWorkerLog {
  status: string;
  progress?: number;
  // Add other relevant log properties
}

interface OcrLine {
  text: string;
  words?: OcrWord[];
  maxHeight?: number;
  minTop?: number;
}

interface OcrWord {
  text: string;
  left: number;
  top: number;
  height: number;
  width: number;
}

interface OcrResult {
  TextOverlay: {
    Lines: OcrLine[];
    HasOverlay: boolean;
    Message: string;
  };
  TextOrientation: string;
  FileParseExitCode: number;
  ParsedText: any;
  ErrorMessage: string;
  ErrorDetails: string;
}

type OcrResults = OcrResult[];

class TesseractWrapper {
  private static instance?: TesseractWrapper;
  private workers: { [language: string]: Tesseract.Worker };

  private constructor() {
    this.workers = {};
  }

  public static async getInstance(): Promise<TesseractWrapper> {
    if (!this.instance) {
      this.instance = new TesseractWrapper();
    }

    return this.instance;
  }

  // logger
  private log = (log: TesseractWorkerLog, isNetwork: boolean | undefined) => {
    console.log('Tesseract Logger:', { timestamp: +new Date(), log });
    console.log('Tesseract Logger:', `isNetwork: ${isNetwork}`);
  };

  public setLogger(logger: (log: TesseractWorkerLog, isNetwork: boolean | undefined ) => void) {
    this.log = logger;
  }

  private async getWorker(language: string): Promise<Tesseract.Worker> {

    const tesseractWorkerConfig: TesseractWorkerConfig = {
      workerBlobURL: false,
      workerPath: './lib/tesseract/worker.min.js',
      corePath: './lib/tesseract/core'
    };

    console.log('language:>>', language)
    let languageFileName = `${language}.traineddata.gz`;

    let url = chrome.runtime.getURL(`./lib/tesseract/lang/${languageFileName}`);
    console.log('lang file url:>>', url)
    // see if file existx
    return fetch(url)
      .then((response) => {
        console.log(`lang file ${languageFileName} exists:>>`,  );
        return true;
      })
      .catch((error) => {
        console.log(`lang file ${languageFileName} doesn\'t exist:>>`);
        return false;
      })
      .then(async (langFileExists) => {
        if (!this.workers[language] && langFileExists) {
          // Use local language pack
          const initConfig: TesseractWorkerConfig = {
            ...tesseractWorkerConfig,
            langPath: './lib/tesseract/lang',
            logger: (log: TesseractWorkerLog) => {
              this.log(log, false);
            },
          };
          this.workers[language] = await createWorker(language, 1, initConfig);
        } else if (!this.workers[language]) {
          // Use network for other languages
          const initConfig: TesseractWorkerConfig = {
            ...tesseractWorkerConfig,
            logger: (log: TesseractWorkerLog) => {
              this.log(log, true);
            },
          };
          this.workers[language] = await createWorker(language, 1, initConfig);
        }
        return this.workers[language];  
      })    
  }

  public transferToOCRSpaceFormat  (lines = [], ParsedText: any) :OcrResults {
    const Lines:any = lines.map(({ text: LineText, words = [] }) => {
      let MaxHeight: any, MinTop: any;

      return {
        LineText,
        Words: words.map(({ text: WordText, bbox = {} }: { text: any, bbox: any}) => {
          const { x0, y0, x1, y1 } = bbox;
          const Width = x1 - x0;
          const Height = y1 - y0;

          if (MaxHeight === undefined || Height > MaxHeight) {
            MaxHeight = Height;
          }

          if (MinTop === undefined || y0 < MinTop) {
            MinTop = y0;
          }

          return {
            WordText,
            Left: x0,
            Top: y0,
            Height,
            Width,
          };
        }),
        MaxHeight,
        MinTop,
      };
    });

    return [
      {
        TextOverlay: {
          Lines,
          HasOverlay: true,
          Message: `Total lines: ${lines.length}`,
        },
        TextOrientation: "0",
        FileParseExitCode: 1,
        ParsedText,
        ErrorMessage: "",
        ErrorDetails: "",
      },
    ];
  }

  public async start(input: any, language: string): Promise<{ resultData: OcrResults; processingTimeInMilliseconds: number }> {
    const startTime = performance.now();

    try {
      const worker = await this.getWorker(language);
      await worker.reinitialize(language);

      const { data } = await worker.recognize(input) as any;
      console.log('Tesseract raw data:', data);
      const resultData = this.transferToOCRSpaceFormat(data.lines, data.text);

      // Calculate the processing time of Tesseract
      const processingTimeInMilliseconds = performance.now() - startTime;

      return { resultData, processingTimeInMilliseconds };
    } catch (error: any) {
      // ... (error handling remains the same)
      throw new Error(error);
    }
  }
}

export default TesseractWrapper;
