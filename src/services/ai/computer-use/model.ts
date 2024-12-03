
export interface RunUIVisionMacroParams {
  macroName: string
  xType: string
  x: string
  y: string
}

export interface RunUIVisionMacroResult {
  success: boolean
  message: string
}

export interface ComputerUseActionResult {
  success: boolean
  message: string
  coordinates: string[] | number[]
}

export interface HandleScreenshotResult {
  success: boolean
  message: string
  base64Image: string
  filepath: string
}