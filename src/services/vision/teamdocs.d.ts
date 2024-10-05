/**
 * Type definitions for TeamDocs WebAssembly module.
 */

declare namespace teamdocs {
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

  interface FindResult {
      width: number;
      height: number;
      score: number;
      offsetLeft: number;
      offsetTop: number;
      viewportLeft: number;
      viewportTop: number;
      pageLeft: number;
      pageTop: number;
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

  class Image {
      constructor(width: number, height: number);
      delete(): void;

      width: number;
      height: number;
      data: Uint8Array;
  }

  function getModuleVersion(): string;
  function searchImage(image: Image, pattern: Image, minSimilarity: number, allowSizeVariation: boolean): Array<FindResult>;
  function resizeImage(source: Image, scaleX: number, scaleY: number): Image;
  function readImageInfo(data: number, length: number): ImageInfo | undefined;
}
