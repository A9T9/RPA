/**
 * Implements common functionalities about the screen.
 */
export class ScreenHelper {
    /**
     * Default screen DPI used by common browsers.
     * All common calculations are based on this value.
     * If browsers begin to change this behaviour, this value should be changed too.
     */
    public static readonly DEFAULT_DPI = 96;

    /**
     * Determines if given DPI value is greater than or equals to screen DPI.
     * @param dpi DPI value to be tested.
     * @returns True if given DPI value is greater than or equals to screen DPI, false otherwise.
     */
    private static isDpiMatches(dpi: number): boolean {
        return window.matchMedia(`(max-resolution: ${dpi}dpi)`).matches === true;
    }

    /**
     * Estimates screen DPI. Since browsers use 96 DPI magical number 
     * as basis for their calculations, this function is not accurate.
     * @returns Estimated DPI of the screen.
     */
    static getScreenDpi(): number {
        // We iteratively scan all possible media query matches.
        // We can't use binary search, because there are "many" correct answer in
        // problem space and we need the very first match.
        // To speed up computation we divide problem space into buckets.
        // We test each bucket's first element and if we found a match,
        // we make a full scan for previous bucket with including first match.
        // Still, we could use "divide-and-conquer" for such problems.
        // Due to common DPI values, it's not worth to implement such algorithm.

        const bucketSize = 24; // common divisor for 72, 96, 120, 144 etc.
        for (let i = bucketSize; i < 3000; i += bucketSize) {
            if (this.isDpiMatches(i)) {
                const start = i - bucketSize;
                const end = i;
                for (let k = start; k <= end; ++k) {
                    if (this.isDpiMatches(k)) {
                        return k;
                    }
                }
            }
        }

        return ScreenHelper.DEFAULT_DPI; // default fallback
    }
}
