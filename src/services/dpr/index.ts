import { IDevicePixelRatioService, DevicePixelRatioInfo } from "./types"

export type DevicePixelRatioServiceParams = {
  getZoom: () => Promise<number>;
  window?: Window;
}

export class DevicePixelRatioService implements IDevicePixelRatioService {
  constructor(private params: DevicePixelRatioServiceParams) {}

  getDevicePixelRatioInfo(): Promise<DevicePixelRatioInfo> {
    const win = this.params.window ?? window
    const currentRatio = win.devicePixelRatio

    return this.params.getZoom().then((zoom: number) => ({
      currentRatio,
      baseRatio: currentRatio / zoom,
      zoom
    }))
  }
}
