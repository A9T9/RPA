export interface StoreState {
    logs: Array<string>;
    patternImage: {
        dataUrl: string,
        info: kantusearch.ImageInfo
    }
}
