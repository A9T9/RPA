import { Point } from "./point";

/**
 * DOM event simulator for triggering various events.
 */
export class EventSimulator {
    /**
     * Create default mouse event properties.
     * @param type Mouse event type.
     * @returns Object literal that includes default properties.
     */
    private static createDefaultMouseEventProperties(type: string) {
        return {
            type,
            canBubble: true,
            cancelable: true,
            view: window,
            detail: 0,
            screenX: 0,
            screenY: 0,
            clientX: 0,
            clientY: 0,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            button: 0,
            relatedTarget: null
        };
    }

    /**
     * Sends a click event to a DOM element.
     * @param element Target DOM element.
     * @param p Click coordinate.
     * @returns dispatchEvent return value.
     */
    static sendClick(element: HTMLElement, p: Point): boolean {
        const ev = document.createEvent("MouseEvents");
        const props = this.createDefaultMouseEventProperties("click");
        props.clientX = p.x;
        props.clientY = p.y;

        ev.initMouseEvent(
            props.type,
            props.canBubble,
            props.cancelable,
            props.view,
            props.detail,
            props.screenX,
            props.screenY,
            props.clientX,
            props.clientY,
            props.ctrlKey,
            props.altKey,
            props.shiftKey,
            props.metaKey,
            props.button,
            props.relatedTarget
        );
        return element.dispatchEvent(ev);
    }
}
