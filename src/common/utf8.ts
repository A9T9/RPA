// Adapted from: http://www.json.org/JSON_checker/utf8_decode.c

class Utf8Decoder {
  static readonly REPLACEMENT_CHARACTER = "\uFFFD";
  static readonly END = -1;
  static readonly ERROR = -2;

  private input: Uint8Array;
  private position: number;

  constructor(input: Uint8Array) {
    this.input = input;
    this.position = 0;
  }

  /**
   * Gets the next byte.
   * @returns UTF8_END if there are no more bytes, next byte otherwise.
   */
  private getNextByte() {
    if (this.position >= this.input.length) {
      return Utf8Decoder.END;
    }

    const c = this.input[this.position] & 0xff;
    ++this.position;
    return c;
  }

  /**
   *  Gets the 6-bit payload of the next continuation byte.
   * @returns Contination byte if it's valid, UTF8_ERROR otherwise.
   */
  private getNextContinuationByte() {
    const c = this.getNextByte();
    return (c & 0xc0) == 0x80 ? c & 0x3f : Utf8Decoder.ERROR;
  }

  /**
   * Decodes next codepoint.
   * @returns `Utf8Decoder.END` for end of stream, next codepoint if it's valid, `Utf8Decoder.ERROR` otherwise.
   */
  decodeNext(): number {
    if (this.position >= this.input.length) {
      return this.position === this.input.length
        ? Utf8Decoder.END
        : Utf8Decoder.ERROR;
    }

    const c = this.getNextByte();

    // Zero continuation (0 to 127)
    if ((c & 0x80) == 0) {
      return c;
    }

    // One continuation (128 to 2047)
    if ((c & 0xe0) == 0xc0) {
      const c1 = this.getNextContinuationByte();
      if (c1 >= 0) {
        const r = ((c & 0x1f) << 6) | c1;
        if (r >= 128) {
          return r;
        }
      }

      // Two continuations (2048 to 55295 and 57344 to 65535)
    } else if ((c & 0xf0) == 0xe0) {
      const c1 = this.getNextContinuationByte();
      const c2 = this.getNextContinuationByte();
      if ((c1 | c2) >= 0) {
        const r = ((c & 0x0f) << 12) | (c1 << 6) | c2;
        if (r >= 2048 && (r < 55296 || r > 57343)) {
          return r;
        }
      }

      // Three continuations (65536 to 1114111)
    } else if ((c & 0xf8) == 0xf0) {
      const c1 = this.getNextContinuationByte();
      const c2 = this.getNextContinuationByte();
      const c3 = this.getNextContinuationByte();
      if ((c1 | c2 | c3) >= 0) {
        const r = ((c & 0x07) << 18) | (c1 << 12) | (c2 << 6) | c3;
        if (r >= 65536 && r <= 1114111) {
          return r;
        }
      }
    }

    return Utf8Decoder.ERROR;
  }
}
export namespace utf8 {
  export function isValid(input: Uint8Array): boolean {
    const decoder = new Utf8Decoder(input);
    while (true) {
      const cp = decoder.decodeNext();
      switch (cp) {
        case Utf8Decoder.END:
          return true;

        case Utf8Decoder.ERROR:
          return false;

        default:
        // ignore
      }
    }
  }

  export function decode(input: Uint8Array): string {
    const decoder = new Utf8Decoder(input);
    let output = "";

    while (true) {
      const cp = decoder.decodeNext();
      if (cp === Utf8Decoder.END) {
        break;
      }

      output +=
        cp !== Utf8Decoder.ERROR
          ? String.fromCodePoint(cp)
          : Utf8Decoder.REPLACEMENT_CHARACTER;
    }

    return output;
  }
}
