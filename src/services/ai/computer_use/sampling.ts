import Anthropic from '@anthropic-ai/sdk'
import ComputerUse, { ComputerUseActionResult } from './computer_use'
import { ComputerUseMessageType } from './model'

export interface SamplingParams {
  anthropicAPIKey: string
  model: string
  captureScreenShotFunction: () => Promise<ArrayBuffer>
  handleMouseAction: (action: any, scaleFactor: number) => Promise<ComputerUseActionResult>
  handleKeyboardAction: (action: any) => Promise<ComputerUseActionResult>
  getTerminationRequest: (loopCompletedCount: number) => 'max_loop_reached' | 'player_stopped' | 'stop_requested' | undefined
  logMessage: (message: string, userOrAi?: ComputerUseMessageType, isActionOrResult?: 'action' | 'result') => void
}

export class SamplingError extends Error {
  messages: ClaudeSamplingMessage[]
  constructor({ messages, error }: { messages: ClaudeSamplingMessage[]; error: any }) {
    super(error)
    this.messages = messages
  }
}

type ToolResult = any
type MessageContentType = 'text' | 'tool_use'
interface MessageContent {
  type: MessageContentType
  text: string
}
export interface ClaudeSamplingMessage {
  role: string
  content: MessageContent[] | ToolResult
}

export interface CallAPIReturnType {
  content: Anthropic.Beta.Messages.BetaContentBlock[]
  tool_use: ToolUse[]
  tool_use_id?: string | null
}

// {action: "mouse_move", coordinate: [500, 200]}

type Coordinate = [number, number]

export interface ToolUse {
  // content: Anthropic.Beta.Messages.BetaContentBlock[];
  tool_use_id: string
  action?: string
  coordinate?: Coordinate | any
  coordinates?: Coordinate | any
}

// tool use error extends error
class ToolUseError extends Error {
  tool_use_id: string
  constructor({ message, tool_use_id }: { message: string; tool_use_id: string }) {
    super(message)
    this.tool_use_id = tool_use_id
  }
}

class Sampling {
  systemPrompt: string = ''
  computer: any
  anthropic: Anthropic | undefined
  messages: ClaudeSamplingMessage[] = []

  loopCompletedCount = 0
  constructor(private params: SamplingParams) {
    this.computer = new ComputerUse({
      captureScreenShotFunction: params.captureScreenShotFunction,
      handleMouseAction: params.handleMouseAction,
      handleKeyboardAction: params.handleKeyboardAction,
      logMessage: params.logMessage
    })

    if (params.anthropicAPIKey) {
      this.anthropic = new Anthropic({
        apiKey: params.anthropicAPIKey,
        dangerouslyAllowBrowser: true
      })
    }
  }

  setAPIKey(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    })
  }

  async processToolUse(toolUse: CallAPIReturnType['tool_use']) {
    try {
      const toolResults = []

      for (const action of toolUse) {
        console.log('Processing tool action:>>', action)
        // Ensure coordinate format is consistent
        if (action.coordinate && Array.isArray(action.coordinate)) {
          action.coordinates = { x: action.coordinate[0], y: action.coordinate[1] }
          delete action.coordinate
        }

        const toolUseId = action.tool_use_id
        // Ensure any click action has coordinates
        if (
          (action.action === 'left_click' || action.action === 'right_click' || action.action === 'double_click') &&
          !action.coordinates
        ) {
          // throw new ToolUseError({ tool_use_id: toolUseId, message: `${action.action} action requires coordinates` })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: [{ type: 'text', text: `${action.action} action requires coordinates` }],
            is_error: true
          })
          continue
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
          tool_use_id: error.tool_use_id,
          content: [{ type: 'text', text: error.message }],
          is_error: true
        }
      ]
    }
  }

  async callAPI(params: any): Promise<CallAPIReturnType> {
    try {
      const { width, height } = {
        width: window.screen.availWidth,
        height: window.screen.availHeight
      }

      // console.log('Calling API with messages:', JSON.stringify(params.messages, null, 2))
      // const userPrompt = params.messages[0].content[0].text

      // this.logMessage(userPrompt, 'user')

      if (!this.anthropic) {
        throw new Error('Anthropic is not initialized')
      }

      const response = await this.anthropic.beta.messages.create({
        model: this.params.model,
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

      const aiResponseText = (response.content[0] as Anthropic.Beta.Messages.BetaTextBlock)?.text
      if (aiResponseText) {
        this.params.logMessage(aiResponseText, 'ai')
      }

      const coordinate = ((response.content[1] as Anthropic.Beta.Messages.BetaToolUseBlock)?.input as any)?.coordinate
      const coordinateText = coordinate ? ` ${coordinate[0]}, ${coordinate[1]}` : ''
      const aiToolUseInputAction = ((response.content[1] as Anthropic.Beta.Messages.BetaToolUseBlock)?.input as any)?.action
      if (aiToolUseInputAction) {
        const message = aiToolUseInputAction + coordinateText
        this.params.logMessage(message, 'ai', 'action')
        this.params.logMessage(message, 'status')
      }

      const toolUse = []
      let toolUseId = null

      for (const content of response.content) {
        if (content.type === 'tool_use') {
          console.log('Found tool_use:', content)
          toolUseId = content.id
          if (content.input) {
            const toolUseObj: ToolUse = { ...content.input, tool_use_id: content.id }
            toolUse.push(toolUseObj)
          }
        }
      }

      console.log('Extracted tool use:', toolUse)

      return {
        content: response.content,
        tool_use: toolUse
        // tool_use_id: toolUseId
      }
    } catch (error) {
      console.error('API call failed. Error:', error)
      throw error
    }
  }

  async run(userMessage: string, messages: ClaudeSamplingMessage[] | null = null): Promise<any> {
    if (!userMessage) {
      throw new Error('Prompt is required')
    }

    if (messages) {
      this.messages = messages
    } else {
      this.messages = []
    }

    this.systemPrompt = userMessage
    return this._run(userMessage)
  }

  private async _run(userMessage: string): Promise<any> {
    try {
      const shallStop = (currentLoopCount: number): { messages: any[]; stopReason: string } | boolean => {
        const stopReason = this.params.getTerminationRequest(currentLoopCount)
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
        return false
      }

      console.log('run this.messages:>> ', this.messages)
      // this.logMessage(`Calling Anthropic API with user message: ${userMessage}`)

      if (shallStop(this.loopCompletedCount)) {
        return this.messages
      }

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

      this.params.logMessage('Calling API', 'status')

      let response: CallAPIReturnType
      try {
        response = await this.callAPI({
          model: this.params.model,
          messages: this.messages,
          system: this.systemPrompt
        })
      } catch (error) {
        this.params.logMessage('API call failed.', 'status')
        // this.params.logMessage('', 'status')
        console.log('Error in run:>> ', error)
        throw error
      }

      console.log('_run:>> response: ', response)

      this.params.logMessage('API call complete', 'status')

      if (!response) {
        return this.messages
      }

      // Add assistant's response with tool_use blocks
      this.messages.push({
        role: 'assistant',
        content: response.content
      })

      this.loopCompletedCount++

      // Process tool use if present
      if (response.tool_use && response.tool_use.length > 0) {
        // this.params.logMessage(response.tool_use[0]?.action, 'status')

        const toolResult = (await this.processToolUse(response.tool_use)) as ToolResult

        console.log('response:>> ', response)
        console.log('Tool result:>> ', toolResult)

        // Add tool results
        this.messages.push({
          role: 'user',
          content: toolResult
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
        return this._run('Continue with the task...')
      }

      return this.messages
    } catch (error) {
      console.error('Error in run:', error)
      throw new SamplingError({ messages: this.messages, error: error })
    }
  }
}

export default Sampling
