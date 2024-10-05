export namespace base64 {
  // prettier-ignore
  const encodingTable = new Uint8Array([
    65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 
    97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122,
    48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 43, 47
  ]);

  // prettier-ignore
  const decodingTable = new Uint8Array([
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
    52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
    -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
    -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  ]);

  const paddingChar = 61;

  function calculateEncodedLength(length: number): number {
    let result = (length / 3) * 4;
    result += length % 3 != 0 ? 4 : 0;
    return result;
  }

  function readWord(
    input: string,
    i: number,
    maxLength: number
  ): number | undefined {
    if (maxLength > 4) {
      throw new Error("maxLength should be in range [0, 4].");
    }

    const t = new Uint8Array(4);
    for (let k = 0; k < maxLength; ++k) {
      const c = input.charCodeAt(i + k);
      const b = decodingTable[c];
      if (b === 0xff) {
        return undefined;
      }

      t[k] = b;
    }

    return (
      (t[0] << (3 * 6)) +
      (t[1] << (2 * 6)) +
      (t[2] << (1 * 6)) +
      (t[3] << (0 * 6))
    );
  }

  function writeWord(output: Uint8Array, i: number, triple: number): void {
    output[i + 0] = (triple >> 16) & 0xff;
    output[i + 1] = (triple >> 8) & 0xff;
    output[i + 2] = triple & 0xff;
  }

  export function encode(input: Uint8Array): string {
    const inLen = input.length;
    const outLen = calculateEncodedLength(inLen);
    const lengthMod3 = inLen % 3;
    const calcLength = inLen - lengthMod3;

    const output = new Uint8Array(outLen);

    let i: number;
    let j = 0;
    for (i = 0; i < calcLength; i += 3) {
      output[j + 0] = encodingTable[(input[i] & 0xfc) >> 2];
      output[j + 1] =
        encodingTable[((input[i] & 0x03) << 4) | ((input[i + 1] & 0xf0) >> 4)];
      output[j + 2] =
        encodingTable[
          ((input[i + 1] & 0x0f) << 2) | ((input[i + 2] & 0xc0) >> 6)
        ];
      output[j + 3] = encodingTable[input[i + 2] & 0x3f];
      j += 4;
    }

    i = calcLength;
    switch (lengthMod3) {
      case 2: // One character padding needed
        output[j + 0] = encodingTable[(input[i] & 0xfc) >> 2];
        output[j + 1] =
          encodingTable[
            ((input[i] & 0x03) << 4) | ((input[i + 1] & 0xf0) >> 4)
          ];
        output[j + 2] = encodingTable[(input[i + 1] & 0x0f) << 2];
        output[j + 3] = paddingChar;
        j += 4;
        break;

      case 1: // Two character padding needed
        output[j + 0] = encodingTable[(input[i] & 0xfc) >> 2];
        output[j + 1] = encodingTable[(input[i] & 0x03) << 4];
        output[j + 2] = paddingChar;
        output[j + 3] = paddingChar;
        j += 4;
        break;
    }

    const decoder = new TextDecoder("ascii");
    return decoder.decode(output);
  }

  export function decode(input: string): Uint8Array | undefined {
    const inLen = input.length;
    if (inLen % 4 != 0) {
      return undefined;
    }

    let padding = 0;
    if (inLen > 0 && input.charCodeAt(inLen - 1) == paddingChar) {
      ++padding;
      if (inLen > 1 && input.charCodeAt(inLen - 2) == paddingChar) {
        ++padding;
      }
    }

    const encodedLen = inLen - padding;
    const completeLen = encodedLen & ~3;
    const outLen = (6 * inLen) / 8 - padding;
    const output = new Uint8Array(outLen);

    let triple: number | undefined;

    let i = 0;
    let j = 0;
    while (i < completeLen) {
      triple = readWord(input, i, 4);
      if (typeof triple === "undefined") {
        return undefined;
      }

      writeWord(output, j, triple);

      i += 4;
      j += 3;
    }

    if (padding > 0) {
      triple = readWord(input, i, 4 - padding);
      if (typeof triple === "undefined") {
        return undefined;
      }

      switch (padding) {
        case 1:
          output[j + 0] = (triple >> 16) & 0xff;
          output[j + 1] = (triple >> 8) & 0xff;
          break;

        case 2:
          output[j + 0] = (triple >> 16) & 0xff;
          break;
      }
    }

    return output;
  }
}
