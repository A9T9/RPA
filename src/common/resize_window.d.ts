
export type WindowSize = {
  window: {
    width: number;
    height: number;
    left: number;
    top: number;
  },
  viewport: {
    width: number;
    height: number;
  }
}

export function getFocusedWindowSize (): Promise<WindowSize>
