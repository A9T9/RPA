/**
 * Implements common blob operations.
 */
export class BlobHelper {
    /**
     * Reads given blob object and returns its content as a data URL.
     * @param blob Blob object to be read.
     * @returns Promise object with content of the blob.
     */
    static readAsDataUrlAsync(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev: Event) => {
                resolve(reader.result);
            };

            reader.onerror = (ev: Event) => {
                reject();
            };

            reader.readAsDataURL(blob);
        });
    }

    /**
     * Reads given blob object and returns its content as an ArrayBuffer.
     * @param blob Blob object to be read.
     * @returns Promise object with content of blob.
     */
    static readAsBufferAsync(blob: Blob): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev: Event) => {
                resolve(reader.result);
            };

            reader.onerror = (ev: Event) => {
                reject();
            };

            reader.readAsArrayBuffer(blob);
        });
    }
}
