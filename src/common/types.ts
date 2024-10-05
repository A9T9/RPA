
export type Without<T, K extends keyof T> = {
  [P in Exclude<keyof T, K>]: T[P]
}

export type Tree<T> = T & {
  children: Tree<T>[];
}

export type Point = {
  x: number;
  y: number;
}

export type Size = {
  width:  number;
  height: number;
}

export type Rect = Point & Size

export enum Quadrant {
  TopLeft,
  TopRight,
  BottomRight,
  BottomLeft
}

export type Updater<T> = (data: T) => T
