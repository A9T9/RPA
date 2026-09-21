import { getAIProviderConfig } from '../computer_use/service'
import { reportUsage } from '@/services/usage'
import { captureExecutionCloudCall } from '@/common/execution_locality'
import ComputerUse from '../computer_use/computer_use'
import { ComputerUseMessageType } from '../computer_use/model'
import { SamplingError } from '../computer_use/sampling'
import { OPENAI_COMPAT } from '@/common/constant'
import Ext from '@/common/web_extension'
import { getXModuleVersion } from '@/services/xmodules2/routing'
import { chatCompletionsUrl } from '@/common/uiv_link'
import { uivInstallHeader } from '../uivision_free_tier'
import { openrouterReasoningParam, isReasoningMandatoryError, markReasoningMandatory } from './reasoning'

// Agent sampling loop for OpenAI-compatible chat-completions endpoints
// (OpenRouter, Ollama, LM Studio, ...). Mirrors the Anthropic Sampling class
// interface so ComputerUseService can swap between them based on the
// configured AI provider. The heavy lifting (screenshots, action execution
// via B/X commands) is shared through the same ComputerUse instance.

// Common surface both sampling engines expose to ComputerUseService
export interface ISamplingEngine {
  run: (userMessage: string, messages?: any[] | null) => Promise<any>
  setAPIKey: (apiKey: string) => void
}

export interface OpenAICompatSamplingParams {
  provider: string
  baseURL: string
  apiKey: string
  model: string
  captureScreenShotFunction: () => Promise<ArrayBuffer>
  handleMouseAction: (action: any, scaleFactor: number) => Promise<any>
  handleKeyboardAction: (action: any) => Promise<any>
  getTerminationRequest: (loopCompletedCount: number) => 'max_loop_reached' | 'player_stopped' | 'stop_requested' | undefined
  logMessage: (message: string, userOrAi?: ComputerUseMessageType, isActionOrResult?: 'action' | 'result') => void
  // Which call this is, sent as X-UIV-Task and named as the JS API names it
  // (ai.computerUse, aichat), so a proxy can route by task instead of paying
  // for the strongest model every time. Optional: an unlabelled caller still
  // works.
  task?: string
}

// Per-model-family coordinate convention. Getting this wrong doesn't error —
// it clicks in the wrong place — so keep this table in sync with the curated
// model list in the AI settings tab, and smoke-test any model added there.
// Shared with the aiScreenXY/ai.find path (vision_prompt/service.ts), which
// scales the same way from the same table.
export type CoordSpace = 'absolute' | 'normalized-1000'

export const coordSpaceForModel = (model: string): CoordSpace => {
  if (/gemini/i.test(model)) return 'normalized-1000'
  // Qwen3 VL family answers in 0-1000 normalized coordinates (verified
  // empirically with qwen3.7-plus, 2026-07: clicks landed at exactly
  // pos/size*1000). Qwen2.5-VL used absolute pixels — keep matching by "qwen3".
  if (/qwen3/i.test(model)) return 'normalized-1000'
  // Qwen2.5-VL, Claude, UI-TARS-free default: pixel coordinates in the sent image
  return 'absolute'
}

const COMPUTER_TOOL = {
  type: 'function',
  function: {
    name: 'computer',
    description:
      'Control the current browser tab. Take a screenshot to see the page, then click, move the mouse, type text or press keys.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['screenshot', 'left_click', 'right_click', 'double_click', 'mouse_move', 'type', 'key'],
          description: 'The action to perform'
        },
        coordinate: {
          type: 'array',
          items: { type: 'number' },
          description: '[x, y] position in the most recent screenshot. Required for click and mouse_move actions.'
        },
        text: {
          type: 'string',
          description:
            'Text to type (action "type"), or a key name (action "key"): Return, Tab, Escape, Backspace, Delete, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, End, Page_Up, Page_Down, F1-F12'
        }
      },
      required: ['action']
    }
  }
}

const buildSystemPrompt = (coordSpace: CoordSpace) => {
  const coordinateRule =
    coordSpace === 'normalized-1000'
      ? 'Express all coordinates normalized to a 0-1000 scale, where [0,0] is the top-left and [1000,1000] the bottom-right of the screenshot.'
      : 'Express all coordinates as pixel positions in the most recent screenshot.'

  return [
    'You are a browser automation agent controlling the current browser tab through the `computer` tool.',
    'Rules:',
    '- First call the computer tool with action "screenshot" to see the page.',
    `- ${coordinateRule}`,
    '- Click an input field before typing into it.',
    '- After each action you receive the result; take a new screenshot to verify important steps worked.',
    '- When the task is fully done, reply with a normal message that contains the words "task completed" plus a short summary, and stop calling tools.'
  ].join('\n')
}

class OpenAICompatSampling implements ISamplingEngine {
  computer: ComputerUse
  messages: any[] = []
  loopCompletedCount = 0
  private apiKey: string
  // real model id from the last response. The Ui.Vision proxy forces the model
  // server-side (params.model is a placeholder there), but coordinate scaling
  // must follow the model that actually answered — the response carries its id.
  private upstreamModel = ''
  // authoritative coordinate convention from the X-Coord-Space response header.
  // The Ui.Vision proxy sends it (and hides the real model id), so rolled-out
  // extensions keep clicking correctly when the server swaps models.
  private coordSpaceOverride: CoordSpace | null = null

  constructor(private params: OpenAICompatSamplingParams) {
    this.apiKey = params.apiKey
    this.computer = new ComputerUse({
      captureScreenShotFunction: params.captureScreenShotFunction,
      handleMouseAction: params.handleMouseAction,
      handleKeyboardAction: params.handleKeyboardAction,
      logMessage: params.logMessage
    })
  }

  setAPIKey(apiKey: string) {
    this.apiKey = apiKey
  }

  private get providerLabel(): string {
    if (/openrouter\.ai/i.test(this.params.baseURL)) return 'OpenRouter'
    if (this.params.baseURL === OPENAI_COMPAT.UIVISION_BASE_URL) return 'Ui.Vision AI'
    return 'Local AI'
  }

  private async callAPI(messages: any[]): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`
    headers['X-Title'] = 'Ui.Vision RPA'
    headers['X-UIV-Task'] = this.params.task || 'ai.computerUse'
    // build cohort marker (retention.md 9.4) — hint, not a trust boundary
    headers['X-UIV-Version'] = Ext.runtime.getManifest().version
    // native host (Desktop Automation) version — '' when not installed
    headers['X-UIV-XModule-Version'] = getXModuleVersion()
    // device id — our proxy only; on PRO the Bearer header is the account key
    Object.assign(headers, uivInstallHeader(this.params.baseURL))

    // Reasoning models burn "thinking" tokens against max_tokens and can cut
    // tool-call JSON mid-string at 1024 — with finish_reason still saying
    // tool_calls, so it is undetectable here (measured with qwen3.7-plus,
    // 2026-07). Hence 4096 plus reasoning off. The reasoning param is
    // OpenRouter's unified one; only sent there (local endpoints may not know
    // it, and the Ui.Vision proxy forces it server-side anyway).
    const body: any = {
      model: this.params.model,
      messages,
      tools: [COMPUTER_TOOL],
      max_tokens: 4096,
      temperature: 0
    }
    const onOpenRouter = /openrouter\.ai/i.test(this.params.baseURL)
    if (onOpenRouter) body.reasoning = openrouterReasoningParam(this.params.model)

    captureExecutionCloudCall(this.params.provider)()
    let res = await fetch(chatCompletionsUrl(this.params.baseURL), {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    // Models that refuse reasoning-off (HTTP 400 "Reasoning is mandatory",
    // e.g. gemini-3.7-flash): remember the model, retry once with the
    // closest legal request, {effort:'low'}.
    if (!res.ok && onOpenRouter) {
      const errBody = await res.text().catch(() => '')
      if (!isReasoningMandatoryError(res.status, errBody)) {
        throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 400)}`)
      }
      markReasoningMandatory(this.params.model)
      body.reasoning = openrouterReasoningParam(this.params.model)
      res = await fetch(chatCompletionsUrl(this.params.baseURL), {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 400)}`)
    }

    const coordSpace = res.headers.get('x-coord-space')
    if (coordSpace === 'normalized-1000' || coordSpace === 'absolute') this.coordSpaceOverride = coordSpace

    const data = await res.json()
    if (typeof data?.model === 'string' && data.model) this.upstreamModel = data.model
    const message = data?.choices?.[0]?.message
    if (!message || (!message.tool_calls?.length && !(typeof message.content === 'string' && message.content.trim()) &&
        !(Array.isArray(message.content) && message.content.some((part: any) => part?.type === 'text' && String(part.text || '').trim())))) {
      throw new Error('The AI returned no text or action. Try again or select another AI engine. No action from this response was executed.')
    }
    reportUsage('ai', this.params.provider === 'uivision' ? (getAIProviderConfig().tier === 'pro' ? 'pro' : 'free') : this.params.provider === 'local' ? 'local' : 'own-key')
    window.dispatchEvent(new Event('uiv-allowance-changed'))
    return { message, usage: data.usage }
  }

  // Some models emit the tool call as JSON text instead of a structured
  // tool_calls block — recover it so the run doesn't silently end.
  private extractFallbackToolCall(content: string | null): any | null {
    if (!content) return null
    const match = content.match(/\{[^{}]*"action"\s*:\s*"[^"]+"[^{}]*\}/)
    if (!match) return null
    try {
      const args = JSON.parse(match[0])
      return { id: `fallback_${Date.now()}`, function: { name: 'computer', arguments: JSON.stringify(args) } }
    } catch (e) {
      return null
    }
  }

  private scaleCoordinate(coordinate: [number, number]): [number, number] {
    const space = this.coordSpaceOverride || coordSpaceForModel(this.upstreamModel || this.params.model)
    if (space !== 'normalized-1000') return coordinate

    const size = this.computer.lastImageSize
    if (!size) return coordinate

    return [Math.round((coordinate[0] / 1000) * size.width), Math.round((coordinate[1] / 1000) * size.height)]
  }

  private toInternalAction(args: any): any {
    const action: any = { action: args.action }

    if (args.coordinate && Array.isArray(args.coordinate) && args.coordinate.length >= 2) {
      const [x, y] = this.scaleCoordinate([Number(args.coordinate[0]), Number(args.coordinate[1])])
      action.coordinates = { x, y }
    }
    if (typeof args.text === 'string') {
      // convertToUIVisionFormat expects `text` for both "type" and "key"
      action.text = args.text
      if (args.action === 'key') action.key = args.text
    }
    return action
  }

  async run(userMessage: string, messages: any[] | null = null): Promise<any> {
    if (!userMessage) {
      throw new Error('Prompt is required')
    }

    this.messages = messages && messages.length ? messages : [{ role: 'system', content: buildSystemPrompt(coordSpaceForModel(this.params.model)) }]

    this.messages.push({ role: 'user', content: [{ type: 'text', text: userMessage }] })

    try {
      for (;;) {
        const stopReason = this.params.getTerminationRequest(this.loopCompletedCount)
        if (stopReason) {
          return { messages: this.messages, stopReason }
        }

        // uivision: the server picks the model — show only the provider label
        const providerText =
          this.providerLabel === 'Ui.Vision AI' ? this.providerLabel : `${this.providerLabel} ${this.params.model}`
        this.params.logMessage(`Calling API (${providerText})`, 'status')
        const { message, usage } = await this.callAPI(this.messages)
        // Some providers report implicit prefix-cache hits (OpenAI-style)
        const cachedTokens = usage?.prompt_tokens_details?.cached_tokens || 0
        const cachedText = cachedTokens > 0 ? ` / ${cachedTokens} cached` : ''
        const tokenText = usage ? ` (tokens: ${usage.prompt_tokens ?? '?'} in${cachedText} / ${usage.completion_tokens ?? '?'} out)` : ''
        this.params.logMessage(`API call complete${tokenText}`, 'status')

        const contentText = typeof message.content === 'string' ? message.content : null
        if (contentText) {
          this.params.logMessage(contentText, 'ai')
        }

        let toolCalls = message.tool_calls || []
        if (!toolCalls.length) {
          const fallback = this.extractFallbackToolCall(contentText)
          if (fallback && !/task completed/i.test(contentText || '')) toolCalls = [fallback]
        }

        // Store assistant turn as-is (needed so the API sees its own tool_calls)
        this.messages.push({ role: 'assistant', content: message.content ?? '', tool_calls: message.tool_calls })
        this.loopCompletedCount++

        if (!toolCalls.length || /task completed/i.test(contentText || '')) {
          return this.messages
        }

        for (const toolCall of toolCalls) {
          let args: any
          try {
            args = JSON.parse(toolCall.function?.arguments || '{}')
          } catch (e) {
            this.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Invalid tool arguments (not JSON): ${String(toolCall.function?.arguments).slice(0, 200)}`
            })
            continue
          }

          // Check again here, not only at the top of the loop: an API call
          // takes seconds, and a stop that arrives during one must not still
          // cost the user a click or a keystroke in the page — by the time an
          // action lands, the next macro may already own that tab.
          const stopBeforeAction = this.params.getTerminationRequest(this.loopCompletedCount)
          if (stopBeforeAction) {
            return { messages: this.messages, stopReason: stopBeforeAction }
          }

          const internalAction = this.toInternalAction(args)
          const coordText = internalAction.coordinates ? ` ${internalAction.coordinates.x},${internalAction.coordinates.y}` : ''
          this.params.logMessage(`${args.action}${coordText}`, 'ai', 'action')

          const result: any = await this.computer.processAction(internalAction)

          this.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result.success ? result.message || 'ok' : `Error: ${result.error}`
          })

          // Images can't ride inside role:"tool" messages portably — attach
          // screenshots as a follow-up user message instead
          if (result.success && result.base64Image) {
            this.messages.push({
              role: 'user',
              content: [
                { type: 'text', text: 'Here is the requested screenshot:' },
                { type: 'image_url', image_url: { url: `data:image/png;base64,${result.base64Image}` } }
              ]
            })
          }
        }
      }
    } catch (error: any) {
      console.error('Error in OpenAI-compatible sampling run:', error)
      throw new SamplingError({ messages: this.messages, error })
    }
  }
}

export default OpenAICompatSampling
