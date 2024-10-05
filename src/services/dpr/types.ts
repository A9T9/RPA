
export type DevicePixelRatioInfo = {
  currentRatio: number;
  baseRatio: number;
  zoom: number;
}

export interface IDevicePixelRatioService {
  getDevicePixelRatioInfo(): Promise<DevicePixelRatioInfo>;
}
