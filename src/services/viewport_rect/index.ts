import { Rect } from "@/common/types";
import { scaleRect } from "@/common/dom_utils";
import { IDevicePixelRatioService } from "../dpr/types";
import { IViewportRectService } from "./types";

export type ViewportRectServiceParams = {
  devicePixelRatioService: IDevicePixelRatioService;
  window?: Window;
}

export class ViewportRectService implements IViewportRectService {

  constructor(private params: ViewportRectServiceParams) {}

  getViewportRectInScreen(): Promise<Rect> {
    return this.params.devicePixelRatioService.getDevicePixelRatioInfo().then(info => {
      const win = this.params.window ?? window
      const innerScreenX = (window as any).mozInnerScreenX
      const innerScreenY = (window as any).mozInnerScreenY
      const innerWidth = window.innerWidth * info.zoom
      const innerHeight = window.innerHeight * info.zoom

      // Firefox has mozInnerScreenX/mozInnerScreenY tell the exact screen coordinates of viewport
      if (typeof innerScreenX !== 'undefined') {
        return {
          x: innerScreenX,
          y: innerScreenY,
          width: innerWidth,
          height: innerHeight
        }
      }

      // For Chrome, it's tricker to get the screen coordinates as there are no properties like InnerScreenX,
      // so have to derive it from window.screenLeft and border/toolbar width/height, assuming download bar is already
      // hidden when this method is called, and dev tool is not opened

      // window.innerHeight is shrinked when you zoom in on page
      const toolbarHeight = window.outerHeight - window.innerHeight * info.zoom
      // Window on Windows has a border, about 8px in width
      const windowBorder = window.navigator.platform.match(/Win(.)*/ig) ? 8 : 0;

      return {
        x: win.screenLeft + windowBorder,
        y: win.screenTop + toolbarHeight - windowBorder,
        width: innerWidth,
        height: innerHeight
      }
    })
  }
}
