/**
 * Implements common mathematics operations.
 */
export class MathHelper {
    /**
     * Generates a random number within given range.
     * @param minValue Minimum value (including).
     * @param maxValue Maximum value (excluding).
     * @returns Generated random number.
     */
    static randomRange(minValue: number, maxValue: number): number {
        return Math.floor(minValue + Math.random() * (maxValue - minValue));
    }

    /**
     * Generates random CSS color with alpha.
     * @returns Generated random color.
     */
    static randomColor(): string {
        const r = MathHelper.randomRange(0, 256);
        const g = MathHelper.randomRange(0, 256);
        const b = MathHelper.randomRange(0, 256);
        const a = MathHelper.randomRange(1, 256) / 256;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    /**
     * Limits a numeric value in a given range.
     * @param value Input numeric value.
     * @param minValue Minimum value of range (including).
     * @param maxValue Maximum value of range (including).
     * @returns Clamped numeric value.
     */
    static clamp(value: number, minValue: number, maxValue: number): number {
        return Math.min(Math.max(value, minValue), maxValue);
    }
}
