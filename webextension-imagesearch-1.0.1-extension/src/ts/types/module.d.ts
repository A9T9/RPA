/**
 * Incomplete type definitions for WebAssembly module.
 */
declare namespace Module {
    function _malloc(count: number): number;
    function _free(offset: number): void;

    const HEAPU8: Uint8Array;
}
