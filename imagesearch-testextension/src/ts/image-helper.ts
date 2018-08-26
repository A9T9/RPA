import { MathHelper } from "./math-helper";
import { Rect } from "./rect";

/**
 * Implements common image operations
 */
export class ImageHelper {
    /**
     * Loads an image asynchronously from given URL.
     * @param url Image URL
     * @returns Promise object
     */
    static loadImageAsync(url: string): Promise<HTMLImageElement> {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve(img);
            };
            img.onerror = () => {
                reject();
            };

            img.src = url;
        });
    }

    /**
     * Loads an image data asynchronously from given URL.
     * @param url Image URL
     * @returns Promise object with ImageData
     */
    static async loadImageDataAsync(url: string): Promise<ImageData> {
        const img = await this.loadImageAsync(url);
        return this.convertImageToImageData(img);
    }

    /**
     * Converts image data to data URL.
     * @param imageData Input image data.
     * @returns Data URL.
     */
    static convertImageDataToDataUrl(imageData: ImageData): string {
        const canvas = document.createElement("canvas");
        canvas.width = imageData.width;
        canvas.height = imageData.height;

        const context = canvas.getContext("2d") as CanvasRenderingContext2D;
        if (!context) {
            throw new Error("Cannot acquire 2D context.");
        }

        context.putImageData(imageData, 0, 0);
        return canvas.toDataURL();
    }

    /**
     * Converts image element to image data.
     * @param img Input image element.
     * @returns Image data.
     */
    static convertImageToImageData(img: HTMLImageElement): ImageData {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const context = canvas.getContext("2d") as CanvasRenderingContext2D;
        if (!context) {
            throw new Error("Cannot acquire 2D context.");
        }

        context.drawImage(img, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height);
    }

    /**
     * Adds some noise to input image.
     * @param imageData Input image data.
     * @returns Noise applied image data.
     */
    static distortImage(imageData: ImageData): ImageData {
        const canvas = document.createElement("canvas");
        canvas.width = imageData.width;
        canvas.height = imageData.height;

        const context = canvas.getContext("2d") as CanvasRenderingContext2D;
        if (!context) {
            throw new Error("Cannot acquire 2D context.");
        }

        context.putImageData(imageData, 0, 0);

        const size = canvas.width * canvas.height;
        const iterations = Math.max(10, Math.floor(size * 0.01 * Math.random()));

        for (let i = 0; i < iterations; ++i) {
            const x = MathHelper.randomRange(0, canvas.width);
            const y = MathHelper.randomRange(0, canvas.height);
            const w = MathHelper.randomRange(1, 20) / 10;
            const h = MathHelper.randomRange(1, 20) / 10;
            context.fillStyle = MathHelper.randomColor();
            context.fillRect(x, y, w, h);
        }

        return context.getImageData(0, 0, canvas.width, canvas.height);
    }

    /**
     * Gets a part of given image data.
     * @param imageData Input image data.
     * @param region Region in input image data.
     * @returns Image data in given region.
     */
    static getImageDataRegion(imageData: ImageData, region: Rect): ImageData {
        const canvas = document.createElement("canvas");
        canvas.width = imageData.width;
        canvas.height = imageData.height;

        const context = canvas.getContext("2d") as CanvasRenderingContext2D;
        if (!context) {
            throw new Error("Cannot acquire 2D context.");
        }

        context.putImageData(imageData, 0, 0);
        return context.getImageData(region.left, region.top, region.right - region.left, region.bottom - region.top);
    }
}
