
export enum ComputerVisionType {
  Browser = 'browser',
  Desktop = 'desktop',
  DesktopScreenCapture = 'desktop_screen_capture'
}

export function isCVTypeForDesktop (type: ComputerVisionType): boolean {
  return type === ComputerVisionType.Desktop || type === ComputerVisionType.DesktopScreenCapture
}
