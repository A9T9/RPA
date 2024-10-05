
type Rect = {
  x:      number;
  y:      number;
  width:  number;
  height: number;
}

export type SelectAreaOptions = {
  preventGlobalClick?: boolean;
  clickToDestroy?: boolean;
  overlayStyles?:  Record<string, string>;
  allowCursor?:    (e: DragEvent) => boolean;
  onDestroy?:      () => void;
  done:            (rect: Rect, boundingRect: Rect) => any;
}

export type SelectAreaAPI = {
  show:      () => void;
  hide:      () => void;
  destroy:   () => void;
  updatePos: (rect: Rect) => void;
}

export const selectArea: (options: SelectAreaOptions) => SelectAreaAPI;

export const selectAreaPromise: (options: SelectAreaOptions) => Promise<any>;
