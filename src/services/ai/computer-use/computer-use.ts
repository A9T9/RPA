import { Jimp } from 'jimp'
import { ComputerUseActionResult } from './model'

type ProcessedImageResult = {
  originalMetadata: any
  scaledBuffer: ArrayBuffer
  scaleFactor: number
  scaledWidth: number
  scaledHeight: number
  originalWidth: number
  originalHeight: number
}



class ComputerUse {
  screenshotCount: number
  lastCoords: any
  MAX_PIXELS: number
  config: any
  keyMap: any
  scaleFactor: number
  captureScreenShotFunction: () => Promise<ArrayBuffer>
  handleMouseAction: (action: any, scaleFactor: number) => Promise<ComputerUseActionResult>
  handleKeyboardAction: (action: any) => Promise<ComputerUseActionResult>
  logMessage: (message: string, userOrAi?: 'user' | 'ai', isActionOrResult?: 'action' | 'result') => void

  constructor(
    captureScreenShotFunction: () => Promise<ArrayBuffer>,
    handleMouseAction: (action: any, scaleFactor: number) => Promise<ComputerUseActionResult>,
    handleKeyboardAction: (action: any) => Promise<ComputerUseActionResult>,
    logMessage: (message: string, userOrAi?: 'user' | 'ai', isActionOrResult?: 'action' | 'result') => void
  ) {
    this.captureScreenShotFunction = captureScreenShotFunction
    this.handleMouseAction = handleMouseAction
    this.handleKeyboardAction = handleKeyboardAction
    this.logMessage = logMessage

    this.screenshotCount = 0
    this.lastCoords = null
    this.MAX_PIXELS = 1191888
    this.scaleFactor = 1
    this.config = {
      timeoutSeconds: 30,
      closeRPA: false,
      closeBrowser: false
    }

    // Map API key names to UI.Vision format
    this.keyMap = {
      Return: '${KEY_ENTER}',
      Enter: '${KEY_ENTER}',
      Tab: '${KEY_TAB}',
      Escape: '${KEY_ESC}',
      Backspace: '${KEY_BACK}',
      Delete: '${KEY_DELETE}',
      ArrowUp: '${KEY_UP}',
      Arrow_Down: '${KEY_DOWN}',
      Arrow_Left: '${KEY_LEFT}',
      Arrow_Right: '${KEY_RIGHT}',
      Home: '${KEY_HOME}',
      End: '${KEY_END}',
      Page_Up: '${KEY_PGUP}',
      Page_Down: '${KEY_PGDN}',
      Space: '${KEY_SPACE}',
      Control: '${KEY_CTRL}',
      Alt: '${KEY_ALT}',
      Shift: '${KEY_SHIFT}',
      F1: '${KEY_F1}',
      F2: '${KEY_F2}',
      F3: '${KEY_F3}',
      F4: '${KEY_F4}',
      F5: '${KEY_F5}',
      F6: '${KEY_F6}',
      F7: '${KEY_F7}',
      F8: '${KEY_F8}',
      F9: '${KEY_F9}',
      F10: '${KEY_F10}',
      F11: '${KEY_F11}',
      F12: '${KEY_F12}'
    }
  }

  async processImage(imageBuffer: ArrayBuffer): Promise<ProcessedImageResult>  {
    const image = await Jimp.read(imageBuffer)

    const metadata = {
      width: image.bitmap.width,
      height: image.bitmap.height
    }

    console.log(`Original dimensions: ${metadata.width} x ${metadata.height}`)

    let scaledBuffer = imageBuffer
    let scaleFactor = 1
    let scaledWidth = metadata.width
    let scaledHeight = metadata.height

    const totalPixels = metadata.width * metadata.height

    if (totalPixels > this.MAX_PIXELS) {
      scaleFactor = Math.sqrt(this.MAX_PIXELS / totalPixels)
      scaledWidth = Math.round(metadata.width * scaleFactor)
      scaledHeight = Math.round(metadata.height * scaleFactor)

      console.log(`Scaling image by factor ${scaleFactor.toFixed(3)}`)
      console.log(`Scaled dimensions: ${scaledWidth} x ${scaledHeight}`)

      image.resize({ w: scaledWidth, h: scaledHeight })

      scaledBuffer = await image.getBuffer('image/png')
    }

    return {
      originalMetadata: metadata,
      scaledBuffer,
      scaleFactor,
      scaledWidth,
      scaledHeight,
      originalWidth: metadata.width,
      originalHeight: metadata.height
    }
  } 

  async processAction(action: any) {
    console.log('Processing action:', action)

    // Convert API action format to UI.Vision format
    const uiVisionAction = this.convertToUIVisionFormat(action)
    if (!uiVisionAction.success) {
      return uiVisionAction // Return error if conversion failed
    }

    console.log('Converted action:', uiVisionAction.action)

    // Use the converted action
    return await this.executeUIVisionAction(uiVisionAction.action)
  }

  convertToUIVisionFormat(action: any) {
    try {
      // Handle key/text input conversion
      if ((action.action === 'key' && action.text) || (action.action === 'key_press' && action.key)) {
        const keyValue = action.text || action.key
        return {
          success: true,
          action: {
            command: 'xtype',
            value: this.keyMap[keyValue] || keyValue,
            type: 'keyboard'
          }
        }
      }

      // Handle text typing
      if (action.action === 'type' && action.text) {
        return {
          success: true,
          action: {
            command: 'xtype',
            value: action.text,
            type: 'text'
          }
        }
      }

      // Handle mouse actions
      if (['mouse_move', 'left_click', 'right_click'].includes(action.action)) {
        let coords = null
        if (action.coordinates) {
          coords = action.coordinates
        } else if (action.coordinate && Array.isArray(action.coordinate)) {
          coords = { x: action.coordinate[0], y: action.coordinate[1] }
        }

        if (coords) {
          return {
            success: true,
            action: {
              command: action.action,
              x: coords.x,
              y: coords.y,
              type: 'mouse'
            }
          }
        }
      }

      // Handle screenshot
      if (action.action === 'screenshot') {
        return {
          success: true,
          action: {
            command: 'screenshot',
            type: 'capture'
          }
        }
      }

      return {
        success: false,
        error: `Unable to convert action: ${JSON.stringify(action)}`
      }
    } catch (error: any) {
      console.error('Error converting action:', error)
      return {
        success: false,
        error: `Conversion error: ${error.message}`
      }
    }
  }

  async executeUIVisionAction(action: any) {
    try {
      switch (action.type) {
        case 'keyboard':
        case 'text':
          const keyResult = await this.handleKeyboardAction(action)
          return {
            success: keyResult.success,
            message: `Typed: ${action.value}`
          }

        case 'mouse':
          return await this.handleMouseAction(action, this.scaleFactor)

        case 'capture':
          return await this.handleScreenshot()

        default:
          return {
            success: false,
            error: `Unknown action type: ${action.type}`
          }
      }
    } catch (error: any) {
      console.error('Error executing action:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async handleScreenshot() {
    const imageBuffer = await this.captureScreenShotFunction()
    console.log('imageBuffer:>> ', imageBuffer)

    const processedImage = await this.processImage(imageBuffer)
    this.scaleFactor = processedImage.scaleFactor || 1

    console.log('processedImage:>> ', processedImage)

    const base64Image = Buffer.from( processedImage.scaledBuffer).toString('base64')
    return {
      success: true,
      message: 'Screenshot taken with UI.Vision',
      base64Image: base64Image
    }
  }
}

export default ComputerUse
