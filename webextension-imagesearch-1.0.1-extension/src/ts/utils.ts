/**
 * Delays the call of a function and returns a promise.
 * @param fn Function to be invoked.
 * @param timeout Delay amount in milliseconds.
 * @returns Promise object which resolves to given function returned value.
 */
export function delayAsync(fn: () => any, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                resolve(fn());
            } catch (e) {
                reject(e);
            }
        }, timeout);
    });
}

export async function downloadUrlAsync(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    await delayAsync(() => {
        document.body.removeChild(a);
    }, 0);
}
