// Type definitions for FileSaver.js 2.0
// Project: https://github.com/eligrey/FileSaver.js/
// Definitions by: Cyril Schumacher <https://github.com/cyrilschumacher>
//                 Daniel Roth <https://github.com/DaIgeb>
//                 Chris Barr <https://github.com/chrismbarr>
// Definitions:  https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/file-saver

declare namespace FileSaver {
  /**
   * FileSaver.js implements the saveAs() FileSaver interface in browsers that do not natively support it.
   * @param data - The actual file data blob or URL.
   * @param filename - The optional name of the file to be downloaded. If omitted, the name used in the file data will be used. If none is provided "download" will be used.
   * @param disableAutoBOM - Optional & defaults to `false`. Set to `true` if you want FileSaver.js to automatically provide Unicode text encoding hints
   */
  function saveAs(data: Blob | string, filename?: string, disableAutoBOM?: boolean): void;
}

declare global {
  const saveAs: typeof FileSaver.saveAs;

  interface Window {
      saveAs: typeof FileSaver.saveAs;
  }
}

export = FileSaver;
