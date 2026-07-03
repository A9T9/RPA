/**
 * Helper class for C/C++ interoperability.
 */
export class HeapMemory {
    private heapBytes: Uint8Array;

    /**
     * Constructs a new HeapMemory instance. Allocates memory from WebAssembly module's heap. 
     * Then source content will be copied to allocated memory.
     * @param source Source ArrayBuffer or typed array.
     */
    constructor(source: ArrayBuffer | Uint8Array) {
        const typedArray = "BYTES_PER_ELEMENT" in source ? source : new Uint8Array(source as ArrayBuffer);

        const numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT;
        const ptr = Module._malloc(numBytes);
        this.heapBytes = Module.HEAPU8.subarray(ptr, ptr + numBytes);
        this.heapBytes.set(typedArray);
    }

    /**
     *  Frees the previously allocated memory from WebAssembly module heap.
     */
    free(): void {
        Module._free(this.heapBytes.byteOffset);
    }

    /**
     * Gets byte offset of allocated memory in WebAssembly module heap.
     */
    get offset(): number {
        return this.heapBytes.byteOffset;
    }

    /**
     * Gets length of allocated memory from WebAssembly module heap.
     */
    get length(): number {
        return this.heapBytes.length;
    }
}
