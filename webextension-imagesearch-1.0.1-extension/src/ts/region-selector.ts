import { Point } from "./point";
import { Rect } from "./rect";

export class RegionSelector {
    private oldCursor: string | null;
    private maskElement?: HTMLElement;
    private promiseResolve: (coords: Rect | undefined) => void;
    private startPos: Point;

    constructor() {
        this.oldCursor = null;
        this.maskElement = undefined;
        this.promiseResolve = () => {};
        this.startPos = { x: 0, y: 0 };

        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    selectAsync(): Promise<Rect> {
        return new Promise((resolve, reject) => {
            this.promiseResolve = resolve;

            this.oldCursor = document.body.style.cursor;
            document.body.style.cursor = "crosshair";

            document.addEventListener("mousedown", this.handleMouseDown, false);
            document.addEventListener("keydown", this.handleKeyDown, false);
        });
    }

    private finish(coords: Rect | undefined) {
        document.removeEventListener("keydown", this.handleKeyDown, false);
        document.removeEventListener("mousedown", this.handleMouseDown, false);
        document.body.style.cursor = this.oldCursor;

        this.promiseResolve(coords);
    }

    private handleMouseDown(e: MouseEvent): boolean {
        e.preventDefault();

        this.startPos = { x: e.pageX, y: e.pageY };

        this.maskElement = document.createElement("div") as HTMLElement;
        this.maskElement.style.border = "1px solid #ff00ff";
        this.maskElement.style.background = "rgba(0, 0, 255, 0.1)";
        this.maskElement.style.position = "absolute";
        this.maskElement.style.left = e.pageX + "px";
        this.maskElement.style.top = e.pageY + "px";
        this.maskElement.style.width = "0px";
        this.maskElement.style.height = "0px";
        this.maskElement.style.zIndex = "1000000";
        document.body.appendChild(this.maskElement);

        document.addEventListener("mousemove", this.handleMouseMove, false);
        document.addEventListener("mouseup", this.handleMouseUp, false);

        return false;
    }

    private handleKeyDown(e: KeyboardEvent): boolean | undefined {
        var keyCode = e.keyCode;

        if (keyCode === 27) {
            e.preventDefault();
            e.stopPropagation();

            this.finish(undefined);

            return false;
        }

        return undefined;
    }

    private handleMouseMove(e: MouseEvent): boolean {
        e.preventDefault();

        const nowPos: Point = { x: e.pageX, y: e.pageY };
        const diff: Point = { x: nowPos.x - this.startPos.x, y: nowPos.y - this.startPos.y };

        this.maskElement!.style.width = diff.x + "px";
        this.maskElement!.style.height = diff.y + "px";

        return false;
    }

    private handleMouseUp(e: MouseEvent): boolean {
        e.preventDefault();

        const nowPos: Point = { x: e.pageX, y: e.pageY };
        const diff: Point = { x: nowPos.x - this.startPos.x, y: nowPos.y - this.startPos.y };

        document.removeEventListener("mousemove", this.handleMouseMove, false);
        document.removeEventListener("mouseup", this.handleMouseUp, false);

        this.maskElement!.remove();

        setTimeout(() => {
            const coords: Rect = {
                left: this.startPos.x,
                top: this.startPos.y,
                right: this.startPos.x + diff.x,
                bottom: this.startPos.y + diff.y
            };
            this.finish(coords);
        }, 50);

        return false;
    }
}
