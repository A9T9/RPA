import { ScreenHelper } from "./screen-helper";
import { ImageHelper } from "./image-helper";

/**
 * Defines PatternImageComponent options.
 */
export interface PatternImageComponentProps {
    imageId: string;
    dpiXInputId: string;
    dpiYInputId: string;
}

/**
 * Implements pattern image user interface.
 */
export class PatternImageComponent {
    private props: PatternImageComponentProps;
    private imageElement: HTMLImageElement;
    private dpiXInputElement: HTMLInputElement;
    private dpiYInputElement: HTMLInputElement;
    private img?: ImageData;
    private info?: teamdocs.ImageInfo;

    constructor(props: PatternImageComponentProps) {
        this.props = props;
        this.imageElement = document.getElementById(this.props.imageId) as HTMLImageElement;
        this.dpiXInputElement = document.getElementById(this.props.dpiXInputId) as HTMLInputElement;
        this.dpiYInputElement = document.getElementById(this.props.dpiYInputId) as HTMLInputElement;

        this.imageElement.addEventListener("load", () => {
            this.updateImageDensity();
        });

        this.dpiXInputElement.addEventListener("change", () => {
            this.updateImageDensity();
        });

        this.dpiYInputElement.addEventListener("change", () => {
            this.updateImageDensity();
        });
    }

    private updateImageInfo() {
        if (this.info) {
            this.dpiXInputElement.value = (this.info.dpiX !== 0 ? this.info.dpiX : ScreenHelper.DEFAULT_DPI).toFixed(0);
            this.dpiYInputElement.value = (this.info.dpiY !== 0 ? this.info.dpiY : ScreenHelper.DEFAULT_DPI).toFixed(0);
        } else {
            this.dpiXInputElement.value = ScreenHelper.DEFAULT_DPI.toFixed(0);
            this.dpiYInputElement.value = ScreenHelper.DEFAULT_DPI.toFixed(0);
        }
    }

    private updateImage() {
        if (this.img) {
            this.imageElement.src = ImageHelper.convertImageDataToDataUrl(this.img);
        } else {
            this.imageElement.src = "";
        }
    }

    private updateImageDensity() {
        const dpiX = +this.dpiXInputElement.value;
        const dpiY = +this.dpiYInputElement.value;

        let scaledWidth = this.imageData!.width;
        let scaledHeight = this.imageData!.height;

        if (dpiX !== 0 && dpiY !== 0) {
            const scaleX = ScreenHelper.DEFAULT_DPI / dpiX;
            const scaleY = ScreenHelper.DEFAULT_DPI / dpiY;

            scaledWidth = scaledWidth * scaleX;
            scaledHeight = scaledHeight * scaleY;
        }

        this.imageElement.style.width = scaledWidth + "px";
        this.imageElement.style.height = scaledHeight + "px";
    }

    get imageData(): ImageData | undefined {
        return this.img;
    }

    set imageData(value: ImageData | undefined) {
        this.img = value;
        this.updateImage();
    }

    get imageInfo(): teamdocs.ImageInfo | undefined {
        return this.info;
    }

    set imageInfo(value: teamdocs.ImageInfo | undefined) {
        this.info = value;
        this.updateImageInfo();
    }

    get userDpiX(): number {
        return +this.dpiXInputElement.value;
    }

    get userDpiY(): number {
        return +this.dpiYInputElement.value;
    }
}
