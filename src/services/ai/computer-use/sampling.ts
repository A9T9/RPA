import Anthropic from '@anthropic-ai/sdk'
import ComputerUse from './computer-use'
import { ComputerUseActionResult } from './model'

class Sampling {
  model: string
  systemPrompt: string
  messages: any[]
  computer: any
  anthropic: any
  captureScreenShotFunction: () => Promise<ArrayBuffer>
  handleMouseAction: (action: any, scaleFactor: number) => Promise<ComputerUseActionResult>
  handleKeyboardAction: (action: any) => Promise<ComputerUseActionResult>
  getTerminationRequest: (loopCount: number) => string | null
  logMessage: (message: string, userOrAi?: 'user' | 'ai', isActionOrResult?: 'action' | 'result') => void
  loopCount = 0
  constructor(
    anthropicApiKey: string,
    model: string,
    systemPrompt: string,
    captureScreenShotFunction: () => Promise<ArrayBuffer>,
    handleMouseAction: (action: any, scaleFactor: number) => Promise<ComputerUseActionResult>,
    handleKeyboardAction: (action: any) => Promise<ComputerUseActionResult>,
    getTerminationRequest: (loopCount: number) => string | null,
    logMessage: (message: string, userOrAi?: 'user' | 'ai', isActionOrResult?: 'action' | 'result') => void
  ) {
    this.model = model
    this.systemPrompt = systemPrompt
    this.messages = []
    this.captureScreenShotFunction = captureScreenShotFunction
    this.handleMouseAction = handleMouseAction
    this.handleKeyboardAction = handleKeyboardAction

    this.getTerminationRequest = getTerminationRequest
    this.logMessage = logMessage

    this.computer = new ComputerUse(captureScreenShotFunction, handleMouseAction, handleKeyboardAction, logMessage)

    this.anthropic = new Anthropic({
      apiKey: anthropicApiKey,
      dangerouslyAllowBrowser: true
    })
  }
  async processToolUse(toolUse: any, toolUseId: any) {
    try {
      const toolResults = []

      for (const action of toolUse) {
        // Ensure coordinate format is consistent
        if (action.coordinate && Array.isArray(action.coordinate)) {
          action.coordinates = { x: action.coordinate[0], y: action.coordinate[1] }
          delete action.coordinate
        }

        // Ensure any click action has coordinates
        if ((action.action === 'left_click' || action.action === 'right_click') && !action.coordinates) {
          throw new Error(`${action.action} action requires coordinates`)
        }

        console.log('Processing tool action:', action)
        const result = await this.computer.processAction(action)

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: result.success
            ? result.base64Image
              ? [
                  { type: 'text', text: result.message },
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: 'image/png',
                      data: result.base64Image
                    }
                  }
                ]
              : [{ type: 'text', text: result.message }]
            : [{ type: 'text', text: result.error }],
          is_error: !result.success
        })
      }

      return toolResults
    } catch (error: any) {
      console.error('Error in processToolUse:', error)
      return [
        {
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: [{ type: 'text', text: error.message }],
          is_error: true
        }
      ]
    }
  }

  async callAPI(params: any) {
    try {
      const { width, height } = {
        width: window.screen.availWidth,
        height: window.screen.availHeight
      }

      // console.log('Calling API with messages:', JSON.stringify(params.messages, null, 2))
      const userPrompt = params.messages[0].content[0].text

      // this.logMessage(userPrompt, 'user')

      const response = await this.anthropic.beta.messages.create({
        model: params.model,
        max_tokens: 1024,
        tools: [
          {
            type: 'computer_20241022',
            name: 'computer',
            display_width_px: width,
            display_height_px: height,
            display_number: 1
          }
        ],
        messages: params.messages,
        system: params.system,
        betas: ['computer-use-2024-10-22']
      })

      console.log('Raw API response:', JSON.stringify(response, null, 2))

      const aiResponseText = response.content[0]?.text
      if(aiResponseText) {
        this.logMessage(aiResponseText, 'ai', )        
      }

      const coordinate = response.content[1]?.input?.coordinate
      const coordinateText = coordinate ? ` ${coordinate[0]}, ${coordinate[1]}` : ''
      const aiToolUseInputAction = response.content[1]?.input?.action
      if(aiToolUseInputAction) {
        const message = aiToolUseInputAction + coordinateText
        this.logMessage(message, 'ai', 'action')
      }

      const toolUse = []
      let toolUseId = null

      for (const content of response.content) {
        if (content.type === 'tool_use') {
          console.log('Found tool_use:', content)
          toolUseId = content.id
          if (content.input) {
            toolUse.push(content.input)
          }
        }
      }

      console.log('Extracted tool use:', toolUse)

      return {
        content: response.content,
        tool_use: toolUse,
        tool_use_id: toolUseId
      }
    } catch (error) {
      console.error('API call failed:', error)
      throw error
    }
  }

  async run(userMessage: any): Promise<any> {
    try {
      // Add user message
      this.messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: userMessage
          }
        ]
      })

      const stopReason = this.getTerminationRequest(this.loopCount)
      if (stopReason) {
        if (stopReason === 'max_loop_reached') {
          console.log('max_loop_reached:>> ', this.messages)
          return { messages: this.messages, stopReason: stopReason }
        } else if (stopReason === 'player_stopped') {
          console.log('player_stopped:>> ', this.messages)
          return { messages: this.messages, stopReason: stopReason }
        }
        return { messages: this.messages, stopReason: stopReason }
      }

      console.log('run this.messages:>> ', this.messages)
      // this.logMessage(`Calling Anthropic API with user message: ${userMessage}`)

      const response = await this.callAPI({
        model: this.model,
        messages: this.messages,
        system: this.systemPrompt
      })

      this.loopCount++

      // Add assistant's response with tool_use blocks
      this.messages.push({
        role: 'assistant',
        content: response.content
      })

      // Process tool use if present
      if (response.tool_use && response.tool_use.length > 0) {
        const toolResults = await this.processToolUse(response.tool_use, response.tool_use_id)

        console.log('response:>> ', response)
        console.log('Tool results:>> ', toolResults)

        // Add tool results
        this.messages.push({
          role: 'user',
          content: toolResults
        })

        // Check for task completion in the API's response
        const completionIndicator = response.content.find(
          (content: any) => content.type === 'text' && content.text.toLowerCase().includes('task completed')
        )

        if (completionIndicator) {
          console.log('=== Task completed as indicated by the API ===\n task completion messages:>> ', this.messages)
          return this.messages
        }

        // Continue with the task
        return this.run('Continue with the task...')
      }

      return this.messages
    } catch (error) {
      console.error('Error in run:', error)
      throw error
    }
  }
}

export default Sampling
