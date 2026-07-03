import * as React from "react";

import { Rect, RectHelper } from "../rect";
import { Point } from "../point";
import { ImageHelper } from "../image-helper";
import { constants } from "../constants";

import "./pattern-image.scss";

export interface PatternImageProps {
    src: string;
    width: number;
    height: number;
    drawingState: PatternImageDrawingState;
    onImageChange: (dataUrl: string) => void;
}

export const enum PatternImageDrawingState {
    None,
    PinkBox,
    GreenBox
}

export interface PatternImageState {
    imageUrl: string;
    isDrawingRect: boolean;
    rect?: Rect;
}

export class PatternImage extends React.Component<PatternImageProps, PatternImageState> {
    private domElement?: HTMLElement;

    constructor(props: PatternImageProps) {
        super(props);

        this.state = {
            imageUrl: this.props.src,
            isDrawingRect: false,
            rect: undefined
        };

        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleApplyClick = this.handleApplyClick.bind(this);
        this.handleCancelClick = this.handleCancelClick.bind(this);
    }

    private getScalingFactor(imageWidth: number, imageHeight: number): Point {
        return {
            x: this.props.width > 0 ? imageWidth / this.props.width : 1.0,
            y: this.props.height > 0 ? imageHeight / this.props.height : 1.0
        };
    }

    private updateImageUrl() {
        const self = this;
        let rect = this.state.rect;
        if (rect) {
            rect = RectHelper.fix(rect);

            ImageHelper.loadImageAsync(this.props.src).then(img => {
                const canvas = document.createElement("canvas") as HTMLCanvasElement;
                canvas.width = img.width;
                canvas.height = img.height;
                const scaling = self.getScalingFactor(img.width, img.height);
                rect = RectHelper.scale(rect!, scaling);

                const context = canvas.getContext("2d") as CanvasRenderingContext2D;
                if (context) {
                    context.drawImage(img, 0, 0);

                    context.lineWidth = 2;
                    context.strokeStyle =
                        self.props.drawingState === PatternImageDrawingState.PinkBox
                            ? constants.PINK_BOX_COLOR_HEX
                            : constants.GREEN_BOX_COLOR_HEX;
                    console.log(constants.GREEN_BOX_COLOR_HEX);
                    context.strokeRect(rect!.left, rect!.top, rect!.right - rect!.left, rect!.bottom - rect!.top);
                }

                self.setState({
                    imageUrl: canvas.toDataURL()
                });
            });
        }
    }

    private getMousePosition(e: React.MouseEvent<HTMLElement>): Point {
        if (this.domElement) {
            const rect = this.domElement.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }

        return {
            x: e.clientX,
            y: e.clientY
        };
    }

    private handleMouseDown(e: React.MouseEvent<HTMLElement>) {
        if (this.props.drawingState !== PatternImageDrawingState.None) {
            const pos = this.getMousePosition(e);

            this.setState(prevState => {
                if (prevState.isDrawingRect) {
                    return {} as PatternImageState;
                }

                return {
                    isDrawingRect: true,
                    rect: {
                        left: pos.x,
                        top: pos.y,
                        right: pos.x,
                        bottom: pos.y
                    }
                };
            });

            this.updateImageUrl();
        }

        return false;
    }

    private handleMouseMove(e: React.MouseEvent<HTMLElement>) {
        if (this.props.drawingState !== PatternImageDrawingState.None) {
            const pos = this.getMousePosition(e);

            this.setState(prevState => {
                if (!prevState.isDrawingRect) {
                    return {} as PatternImageState;
                }

                return {
                    rect: {
                        left: prevState.rect!.left,
                        top: prevState.rect!.top,
                        right: pos.x,
                        bottom: pos.y
                    }
                };
            });

            this.updateImageUrl();
        }

        return false;
    }

    private handleMouseUp(e: React.MouseEvent<HTMLElement>) {
        if (this.props.drawingState !== PatternImageDrawingState.None) {
            this.setState(prevState => {
                if (!prevState.isDrawingRect) {
                    return {} as PatternImageState;
                }

                return {
                    isDrawingRect: false
                };
            });

            this.updateImageUrl();
        }

        return false;
    }

    private handleApplyClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();

        const dataUrl = this.state.imageUrl;

        this.setState(prevState => {
            return {
                imageUrl: "",
                isDrawingRect: false,
                rect: undefined
            };
        });

        this.props.onImageChange(dataUrl);
    }

    private handleCancelClick(e: React.MouseEvent<HTMLElement>) {
        e.preventDefault();

        this.setState(prevState => {
            return {
                imageUrl: "",
                isDrawingRect: false,
                rect: undefined
            };
        });
    }

    render() {
        const self = this;
        const style = {
            width: this.props.width + "px",
            height: this.props.height + "px"
        };

        const imageUrl = this.state.imageUrl || this.props.src;
        const isEditing = this.props.drawingState !== PatternImageDrawingState.None;
        const isConfirmationActive = isEditing && !this.state.isDrawingRect && !!this.state.rect;

        return (
            <div className={`pattern-image-container ${isEditing ? "editing" : ""}`}>
                <img
                    ref={node => {
                        if (node) {
                            self.domElement = node;
                        }
                    }}
                    src={imageUrl}
                    className="pattern-image"
                    onMouseDown={this.handleMouseDown}
                    onMouseMove={this.handleMouseMove}
                    onMouseUp={this.handleMouseUp}
                    style={style}
                    draggable={false}
                />
                <div className={`confirmation-buttons ${isConfirmationActive ? "active" : ""}`}>
                    <button type="button" className="btn btn-success" onClick={this.handleApplyClick}>
                        Apply
                    </button>{" "}
                    <button type="button" className="btn btn-danger" onClick={this.handleCancelClick}>
                        Cancel
                    </button>
                </div>
            </div>
        );
    }
}
