import * as React from "react";

export interface UploadButtonProps {
    text: string;
    onUpload(file: File): void;
}

export interface UploadButtonState {}

export class UploadButton extends React.Component<UploadButtonProps, UploadButtonState> {
    private fileInputElement?: HTMLInputElement;

    constructor(props: UploadButtonProps) {
        super(props);
        this.state = {};

        this.handleChange = this.handleChange.bind(this);
    }

    private handleChange(e: React.FormEvent<HTMLElement>) {
        if (this.fileInputElement && this.fileInputElement.files && this.fileInputElement.files.length > 0) {
            const file = this.fileInputElement.files[0];
            this.props.onUpload(file);
        }
    }

    render() {
        return (
            <div className="upload-file-container custom-file">
                <input
                    ref={node => {
                        if (node) {
                            this.fileInputElement = node;
                        }
                    }}
                    type="file"
                    className="custom-file-input"
                    onChange={this.handleChange}
                />
                <button className="btn btn-primary">
                    {this.props.text}
                </button>
            </div>
        );
    }
}
