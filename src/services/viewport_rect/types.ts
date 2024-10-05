import { Rect } from "@/common/types";

export interface IViewportRectService {
  getViewportRectInScreen(): Promise<Rect>;
}
