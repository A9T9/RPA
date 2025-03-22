import Anthropic from '@anthropic-ai/sdk'
import { MessageParam } from '@anthropic-ai/sdk/resources'
// import sharp, { Metadata } from 'sharp'

import { ANTHROPIC } from '@/common/constant'
import { Jimp } from 'jimp'

interface Coordinates {
  coords: Array<{ x: number; y: number }>
  isSinglePoint?: boolean
}

type ScaleImageIfNeededResult = {
  buffer: ArrayBuffer
  scaleFactor: number
  originalWidth: number
  originalHeight: number
}

type ProcessImageResult = {
  coords: Array<{ x: number; y: number }>
  isSinglePoint?: boolean
  aiResponse: string
}

export const NO_ANTHROPIC_API_KEY_ERROR = `E351: No Anthropic API key entered.`

class AnthropicService {
  private apiKey: string
  private anthropic: Anthropic
  MAX_WIDTH = 1280
  MAX_HEIGHT = 800
  // AI_MODEL = 'claude-3-5-sonnet-20241022'
  MAX_TOKENS = 1024

  MAX_PIXELS = 1191888 // Maximum total pixels

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(NO_ANTHROPIC_API_KEY_ERROR)
    }

    this.apiKey = apiKey
    this.anthropic = new Anthropic({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true
    })
  }

  uivError = (error: any) => {
    if (error instanceof Error) {
      if (error.message.includes('Expected either apiKey or authToken to be set')) {
        return new Error(NO_ANTHROPIC_API_KEY_ERROR)
      } else if (error.message.includes('invalid x-api-key')) {
        return new Error('Invalid API key. Please re-enter and save it.')
      }
      return new Error(`E352: Anthropic API returned error: ${error.message}`)
    }
    return new Error(`E352: Anthropic API returned error: ${error.message}`)
  }

  parseCoordinates(responseText: string): Coordinates {
    // Split by ||| separator
    const parts = responseText.split('|||').filter((part) => part.trim())

    // Parse coordinates based on number of parts
    const coordinates = parts
      .map((part) => {
        const matches = part.match(/(\d+)\s*,\s*(\d+)/)
        if (matches) {
          return {
            x: parseInt(matches[1]),
            y: parseInt(matches[2])
          }
        }
        return null
      })
      .filter((coord) => coord !== null)

    return {
      coords: coordinates,
      isSinglePoint: coordinates.length === 1
    }
  }

  async getPromptResponse(promptText: string): Promise<string> {
    try {
      const message = await this.anthropic.messages.create({
        model: ANTHROPIC.COMPUTER_USE_MODEL,
        max_tokens: this.MAX_TOKENS,
        messages: [{ role: 'user', content: promptText }]
      })

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
      console.log("Claude's response:", responseText)

      const promptResponseText = responseText.replace("Claude's response: ", '')

      return promptResponseText
    } catch (error) {
      console.error('Error getting response from Anthropic:', error)
      throw this.uivError(error)
    }
  }

  async readTextInImage(imageBuffer: ArrayBuffer): Promise<string> {
    const mainImageBase64 = Buffer.from(imageBuffer).toString('base64')

    try {
      console.log('mainImageBase64:>> ', imageBuffer)

      // Call Anthropic API
      const message = await this.anthropic.messages.create({
        model: ANTHROPIC.COMPUTER_USE_MODEL,
        max_tokens: this.MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Read text in the image'
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: mainImageBase64
                }
              }
            ]
          }
        ]
      })

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
      console.log("Claude's response:", responseText)

      const promptResponseText = responseText.replace("Claude's response: ", '')

      return promptResponseText
    } catch (error) {
      console.error('Error processing image:', error)
      throw error
    }
  }

  // ** Using Jimp
  async scaleImageIfNeeded(imageBuffer: ArrayBuffer): Promise<ScaleImageIfNeededResult> {
    //API accepts only 1280x800 max!!!
    const image = await Jimp.read(imageBuffer)

    // const metadata = (await image.metadata()) as Omit<Metadata, 'width' | 'height'> & { width: number; height: number }
    const metadata = {
      width: image.bitmap.width,
      height: image.bitmap.height
    }

    console.log('image metadata:>> ', metadata)

    // Calculate scaling factor if image exceeds maximum dimensions
    let scaleFactor = 1
    if (metadata.width > this.MAX_WIDTH || metadata.height > this.MAX_HEIGHT) {
      console.log('Scaling image:>> ')
      const widthRatio = this.MAX_WIDTH / metadata.width
      const heightRatio = this.MAX_HEIGHT / metadata.height
      scaleFactor = Math.min(widthRatio, heightRatio)

      // Resize image
      const newWidth = Math.round(metadata.width * scaleFactor)
      const newHeight = Math.round(metadata.height * scaleFactor)

      // image.resize(256, 256); // resize
      image.resize({ w: newWidth, h: newHeight })

      const imageArrayBuffer = await image.getBuffer('image/png')

      return {
        buffer: imageArrayBuffer,
        scaleFactor,
        originalWidth: metadata.width,
        originalHeight: metadata.height
      }
    }

    return {
      buffer: imageBuffer,
      scaleFactor,
      originalWidth: metadata.width,
      originalHeight: metadata.height
    }
  }

  /*
   * Process image
   *
   * @param {ArrayBuffer[]} imageBuffers - Array of image buffers
   * @param {string} promptText - Prompt text
   * @param {string} mainImageFileName - Name of the main image file eg. main.png
   * @param {string} searchImageFileName - Name of the search image file eg. search.png
   */
  async aiPromptProcessImage(
    mainImageBuffer: ArrayBuffer | null,
    searchImageBuffer: ArrayBuffer | null,
    promptText: string
    // mainImageFileName: string
  ): Promise<ProcessImageResult> {
    try {
      // Scale images if needed
      const mainImageData = mainImageBuffer && (await this.scaleImageIfNeeded(mainImageBuffer))
      const searchImageData = searchImageBuffer && (await this.scaleImageIfNeeded(searchImageBuffer))

      const mainImageBase64 = mainImageData && Buffer.from(mainImageData.buffer).toString('base64')
      const searchImageBase64 = searchImageData && Buffer.from(searchImageData.buffer).toString('base64')

      const anthropicMessagesContent: MessageParam['content'] = []

      anthropicMessagesContent.push({
        type: 'text',
        text: promptText
      })

      if (mainImageBase64) {
        anthropicMessagesContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: mainImageBase64
          }
        })
      }

      if (searchImageBase64) {
        anthropicMessagesContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: searchImageBase64
          }
        })
      }

      // Call Anthropic API
      const message = await this.anthropic.messages.create({
        model: ANTHROPIC.COMPUTER_USE_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: anthropicMessagesContent
          }
        ]
      })

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
      console.log("Claude's response:", responseText)
      const aiResponse = responseText.replace("Claude's response: ", '')

      // Check if image was found
      if (responseText.toLowerCase().includes('not found')) {
        console.log('Reference image could not be found in the main image')
        throw new Error('Reference image could not be found in the main image')
      }

      // Parse coordinates
      const { coords: scaledCoords, isSinglePoint } = this.parseCoordinates(responseText)

      if (!mainImageData || scaledCoords.length === 0) {
        console.log('Could not parse coordinates')
        return { coords: [{ x: 0, y: 0 }], isSinglePoint: false, aiResponse }
      }

      // Scale coordinates back to original image size
      const originalCoords = scaledCoords.map((coord) => ({
        x: Math.round(coord.x / mainImageData.scaleFactor),
        y: Math.round(coord.y / mainImageData.scaleFactor)
      }))

      // Log coordinates based on mode
      console.log('Found coordinates:')
      if (isSinglePoint) {
        console.log(`Center (scaled): ${scaledCoords[0].x}, ${scaledCoords[0].y}`)
        console.log(`Center (original): ${originalCoords[0].x}, ${originalCoords[0].y}`)
      } else {
        console.log(`Top-left (scaled): ${scaledCoords[0].x}, ${scaledCoords[0].y}`)
        console.log(`Top-left (original): ${originalCoords[0].x}, ${originalCoords[0].y}`)
        console.log(`Bottom-right (scaled): ${scaledCoords[1].x}, ${scaledCoords[1].y}`)
        console.log(`Bottom-right (original): ${originalCoords[1].x}, ${originalCoords[1].y}`)
      }
      console.log(`Scale factor used: ${mainImageData?.scaleFactor}`)

      return { coords: originalCoords, isSinglePoint, aiResponse }
    } catch (error: any) {
      console.error('Error processing image:', error)
      throw new Error('Error processing image:' + error.message || '')
    }
  }

  parseCoordinatesNew(responseText: string) {
    if (!responseText) return { coords: [], isSinglePoint: false }

    const parts = responseText.split('|||').filter((part) => part.trim())
    const coordinates = parts
      .map((part) => {
        const matches = part.match(/(\d+)\s*,\s*(\d+)/)
        if (matches) {
          return {
            x: parseInt(matches[1]),
            y: parseInt(matches[2])
          }
        }
        return null
      })
      .filter((coord) => coord !== null)

    return {
      coords: coordinates,
      isSinglePoint: coordinates.length === 1
    }
  }

  async aiScreenXYProcessImage(
    imageBuffer: ArrayBuffer,
    promptText: string
  ): Promise<ProcessImageResult> {
    try {
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

      // Calculate total pixels
      const totalPixels = metadata.width * metadata.height

      // Scale if needed
      if (totalPixels > this.MAX_PIXELS) {
        scaleFactor = Math.sqrt(this.MAX_PIXELS / totalPixels)
        scaledWidth = Math.round(metadata.width * scaleFactor)
        scaledHeight = Math.round(metadata.height * scaleFactor)

        console.log(`Scaling image by factor ${scaleFactor.toFixed(3)}`)
        console.log(`Scaled dimensions: ${scaledWidth} x ${scaledHeight}`)

        // image.resize(256, 256); // resize
        image.resize({ w: scaledWidth, h: scaledHeight })

        scaledBuffer = await image.getBuffer('image/png')
      }

      const imageBase64 = Buffer.from(scaledBuffer).toString('base64')

      const prompt_part1 = promptText // `Find the 3 dots Chrome menu icon coordinates` ;
      const prompt_part2 = `. DO NOT take a screenshot - instead, analyze the provided image (${scaledWidth} x ${scaledHeight} pixels). Return ONLY the x,y coordinates in this format: x,y|||`
      const prompt = prompt_part1 + prompt_part2

      //const prompt = `Find the 3 dots Chrome menu icon coordinates  DO NOT take a screenshot - instead, analyze the provided image (${scaledWidth} x ${scaledHeight} pixels). Return ONLY the x,y coordinates in this format: x,y|||`

      console.log(`Prompt= ${prompt}`)

      // Call Computer Use API
      const computerUseResponse = await this.anthropic.beta.messages.create({
        model: ANTHROPIC.COMPUTER_USE_MODEL,
        max_tokens: 1024,
        tools: [
          {
            type: 'computer_20241022',
            name: 'computer',
            display_width_px: scaledWidth,
            display_height_px: scaledHeight,
            display_number: 1
          }
        ],
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: imageBase64
                }
              }
            ]
          }
        ],
        betas: ['computer-use-2024-10-22']
      })

      // Parse both responses
      const computerUseText = computerUseResponse.content[0].type === 'text' ? computerUseResponse.content[0].text : '' // computerUseResponse.content[0].text

      console.log('Computer Use API response:', computerUseText)

      const computerUseCoords = this.parseCoordinatesNew(computerUseText)

      // let macScaleFactor =  await getNativeXYAPI().getScalingFactor()

      console.log('scaleFactor', scaleFactor)
      // console.log('macScaleFactor', macScaleFactor)


      // Scale coordinates back to original size
      const originalComputerUseCoords = computerUseCoords.coords.map((coord) => ({
            x: Math.round(coord.x / scaleFactor / window.devicePixelRatio),
            y: Math.round(coord.y / scaleFactor / window.devicePixelRatio)
          }))     

      // Log coordinates
      console.log('Computer Use API coordinates:')
      if (computerUseCoords.coords.length > 0) {
        if (scaleFactor !== 1) {
          console.log(`Scaled position: ${computerUseCoords.coords[0].x}, ${computerUseCoords.coords[0].y}`)
          console.log(`Original position: ${originalComputerUseCoords[0].x}, ${originalComputerUseCoords[0].y}`)
        } else {
          console.log(`Position: ${computerUseCoords.coords[0].x}, ${computerUseCoords.coords[0].y}`)
        }
      }

      return {
        coords: originalComputerUseCoords,
        aiResponse: computerUseText
      }
    } catch (error: any) {
      console.error('Error finding coordinates:', error)
      if (error.response) {
        console.error('API Response:', error.response)
        throw new Error(`API Response: ${error.response}`)
      }
      throw error
    }
  }
}

export default AnthropicService
