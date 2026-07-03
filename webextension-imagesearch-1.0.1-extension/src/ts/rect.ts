import { Point } from "./point";

/**
 * Represents a rectangular area.
 */
export interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export class RectHelper {
    static create(source: kantusearch.Rect): Rect {
        return {
            left: source.left,
            top: source.top,
            right: source.left + source.width,
            bottom: source.top + source.height
        };
    }

    static fix(rect: Rect): Rect {
        return {
            left: Math.min(rect.left, rect.right),
            top: Math.min(rect.top, rect.bottom),
            right: Math.max(rect.left, rect.right),
            bottom: Math.max(rect.top, rect.bottom)
        };
    }

    static scale(rect: Rect, scaling: Point): Rect {
        return {
            left: rect.left * scaling.x,
            top: rect.top * scaling.y,
            right: rect.right * scaling.x,
            bottom: rect.bottom * scaling.y
        };
    }

    static shrink(rect: Rect, offset: number): Rect {
        return {
            left: rect.left + offset,
            top: rect.top + offset,
            right: rect.right - offset,
            bottom: rect.bottom - offset
        };
    }
}
