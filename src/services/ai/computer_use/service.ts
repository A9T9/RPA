import * as act from '@/actions'
import * as C from '@/common/constant'
import { getPlayer, Player } from '@/common/player'
import { compose, isWindows } from '@/common/ts_utils'
import { store } from '@/redux'
import { NO_ANTHROPIC_API_KEY_ERROR } from '../anthropic'
import Sampling, { ClaudeSamplingMessage, SamplingError, SamplingParams } from './sampling'
import OpenAICompatSampling, { ISamplingEngine } from '../openai_compatible/sampling'
import {
  getInstallIdSync,
  getProKey,
  isFreeTierConsentPending,
  isProTier,
  mapUIVisionFreeTierError
} from '../uivision_free_tier'
import { isCdpInputAvailable } from '@/services/cdp_input'
import { ComputerUseMessageType } from './model'

interface ComputerUseServiceParams {
  runCsFreeCommands: any
  value: any
  captureScreenShotFunction: any
  isDesktop: boolean
  logMessage?: (message: string, userOrAi?: ComputerUseMessageType, isActionOrResult?: 'action' | 'result') => void
  getTerminationRequest?: (loopCompletedCount: number) => 'max_loop_reached' | 'player_stopped' | 'stop_requested' | undefined
}

// Which AI backend drives the agent loop (set in Settings > AI)
export type AIProviderConfig = {
  provider: 'anthropic' | 'openrouter' | 'local' | 'uivision'
  apiKey: string
  baseURL: string
  model: string
  label: string
  // 'uivision' only: 'pro' once a PRO key is actually in use, so error texts
  // can stop offering a paying customer the "add your own API key" advice
  tier?: 'free' | 'pro'
}

// API keys arrive via copy/paste, which likes to add whitespace or capitalize
// the first letter ("Sk-or-..." — OpenRouter then answers 401 "Missing
// Authentication header", which reads like an extension bug). Normalized here
// on read (heals keys already stored with the artifact) and in the AI
// settings tab on save.
export const normalizeApiKey = (key: string): string => key.trim().replace(/^sk-/i, 'sk-')

export const getAIProviderConfig = (): AIProviderConfig => {
  const config = store.getState().config
  // Default is the free tier so new installs have working AI out of the box
  // (explicit decision — the tier exists to promote extension usage). Users
  // with a saved aiProvider keep their choice.
  const provider = config.aiProvider || 'uivision'

  switch (provider) {
    case 'uivision': {
      // PRO is the same endpoint with the purchased key in the Bearer header.
      // Picking PRO without entering a key falls back to the install ID, so
      // the AI keeps working on free quota instead of failing — the settings
      // tab says so next to the empty field.
      const proKey = isProTier(config) ? getProKey(config) : ''
      return {
        provider,
        tier: proKey ? 'pro' : 'free',
        // the PRO key, or the pseudonymous install ID, in the Bearer header
        apiKey: proKey || getInstallIdSync(),
        baseURL: C.OPENAI_COMPAT.UIVISION_BASE_URL,
        model: C.OPENAI_COMPAT.UIVISION_PLACEHOLDER_MODEL,
        label: proKey ? 'Ui.Vision AI PRO' : 'Ui.Vision AI'
      }
    }
    case 'openrouter':
      return {
        provider,
        apiKey: normalizeApiKey(config.openRouterAPIKey || ''),
        baseURL: C.OPENAI_COMPAT.OPENROUTER_BASE_URL,
        model: config.openRouterModel || C.OPENAI_COMPAT.DEFAULT_OPENROUTER_MODEL,
        label: 'OpenRouter'
      }
    case 'local':
      return {
        provider,
        apiKey: '',
        baseURL: config.localAIBaseURL || C.OPENAI_COMPAT.DEFAULT_LOCAL_BASE_URL,
        model: config.localAIModel || '',
        label: 'Local AI'
      }
    default:
      return {
        provider: 'anthropic',
        apiKey: normalizeApiKey(config.anthropicAPIKey || ''),
        baseURL: '',
        model: config.anthropicModel || C.ANTHROPIC.COMPUTER_USE_MODEL,
        label: 'Anthropic'
      }
  }
}

const uivError = (error: any, providerLabel = 'Anthropic') => {
  if (error instanceof Error) {
    const freeTierMessage = mapUIVisionFreeTierError(error.message, getAIProviderConfig().tier === 'pro')
    if (freeTierMessage) {
      return new Error(freeTierMessage)
    }
    if (error.message.includes('Expected either apiKey or authToken to be set')) {
      return new Error(NO_ANTHROPIC_API_KEY_ERROR)
    } else if (error.message.includes('Missing Authentication header')) {
      // OpenRouter's 401 when the Bearer token parses as empty — in practice
      // a paste artifact (whitespace or "Sk-" capitalization) in the key
      return new Error('The API key looks malformed (extra spaces or a capitalized "Sk-" prefix?). Please re-enter it in Settings > AI.')
    } else if (error.message.includes('invalid x-api-key') || error.message.includes('HTTP 401')) {
      return new Error('Invalid API key. Please re-enter the API key, and save it.')
    }
    return new Error(`E352: ${providerLabel} API returned error: ${error.message}`)
  }
  return new Error(`E352: ${providerLabel} API returned error: ${error.message}`)
}

// The play run an agent loop belongs to. `playUID` is a fresh random per
// player.play(), so it identifies the aiComputerUse command that started this
// loop — see common/player.js.
const currentPlayUID = (): number | null => {
  try {
    return getPlayer().getState().playUID
  } catch (e) {
    return null
  }
}

export class ComputerUseService {
  private _logMessage: (message: string, userOrAi?: ComputerUseMessageType, isActionOrResult?: 'action' | 'result') => void
  private currentLoop = 0
  // Captured at construction, i.e. inside the play() that runs the
  // aiComputerUse command this loop serves.
  private playUID: number | null = currentPlayUID()
  private _getTerminationRequest: (loopCompletedCount: number) => 'max_loop_reached' | 'player_stopped' | 'stop_requested' | undefined
  private messages: ClaudeSamplingMessage[] = []
  private sampling: ISamplingEngine
  // provider+model+baseURL the current sampling was built for — recreate on change
  private samplingKey = ''

  constructor(private params: ComputerUseServiceParams) {
    this._logMessage = params.logMessage || this.panelLogMessage
    this._getTerminationRequest = params.getTerminationRequest || this.getTerminationRequestDefault
    this.sampling = this.getSampling()
  }

  private _runCsFreeCommand = (command: any) => {
    command.spExtra = { isDesktop: this.params.isDesktop }

    return this.params.runCsFreeCommands(command)
  }

  private panelLogMessage = (
    message: string,
    type: ComputerUseMessageType | null = null,
    isActionOrResult: 'action' | 'result' | null = null
  ) => {
    if (type === 'ai') {
      if (isActionOrResult === 'action') {
        store.dispatch(act.addLog('a', `Action: ${message}`))
      } else {
        store.dispatch(act.addLog('a', `${message}`))
      }
    } else if (type === 'user') {
      if (isActionOrResult === 'result') {
        store.dispatch(act.addLog('u', `Result: ${message}`))
      } else {
        store.dispatch(act.addLog('u', `${message}`))
      }
    } else {
      store.dispatch(act.addLog('info', `${message}`))
    }
  }

  private createNewSampling = () => {
    const providerConfig = getAIProviderConfig()

    this.messages = []
    this.currentLoop = 0
    this.samplingKey = `${providerConfig.provider}|${providerConfig.model}|${providerConfig.baseURL}`

    if (providerConfig.provider === 'anthropic') {
      const samplingProps: SamplingParams = {
        model: providerConfig.model,
        anthropicAPIKey: providerConfig.apiKey,
        captureScreenShotFunction: this.params.captureScreenShotFunction,
        handleMouseAction: this.handleMouseAction,
        handleKeyboardAction: this.handleKeyboardAction,
        getTerminationRequest: this._getTerminationRequest,
        logMessage: this._logMessage
      }
      this.sampling = new Sampling(samplingProps)
    } else {
      this.sampling = new OpenAICompatSampling({
        provider: providerConfig.provider,
        task: 'ai.computerUse',
        baseURL: providerConfig.baseURL,
        apiKey: providerConfig.apiKey,
        model: providerConfig.model,
        captureScreenShotFunction: this.params.captureScreenShotFunction,
        handleMouseAction: this.handleMouseAction,
        handleKeyboardAction: this.handleKeyboardAction,
        getTerminationRequest: this._getTerminationRequest,
        logMessage: this._logMessage
      })
    }
  }

  private getSampling = (): ISamplingEngine => {
    const providerConfig = getAIProviderConfig()
    const key = `${providerConfig.provider}|${providerConfig.model}|${providerConfig.baseURL}`

    if (!this.sampling || key !== this.samplingKey) {
      this.createNewSampling()
    }
    return this.sampling
  }

  createNewChat = () => {
    // TODO: make it work
    this.createNewSampling()
  }

  handleMouseAction = async (action: any, scaleFactor: number) => {
    const isDesktop = this.params.isDesktop
    // console.log('handleMouseAction:>> action::', action)
    console.log('#220 isDesktop:>> ', isDesktop)
    console.log('scaleFactor:>> ', scaleFactor)

    // const originalCoords =
    //   isWindows() && !isDesktop
    //     ? {
    //         x: Math.round(action.x / scaleFactor / window.devicePixelRatio),
    //         y: Math.round(action.y / scaleFactor / window.devicePixelRatio)
    //       }
    //     : {
    //         x: Math.round(action.x / scaleFactor),
    //         y: Math.round(action.y / scaleFactor)

    // Scale coordinates back to original size
    // const originalCoords =  {
    //   x: Math.round(action.x / scaleFactor / window.devicePixelRatio),
    //   y: Math.round(action.y / scaleFactor / window.devicePixelRatio)
    // }

    const originalCoords =
      isWindows() && isDesktop
        ? {
            x: Math.round(action.x / scaleFactor),
            y: Math.round(action.y / scaleFactor)
          }
        : {
            x: Math.round(action.x / scaleFactor / window.devicePixelRatio),
            y: Math.round(action.y / scaleFactor / window.devicePixelRatio)
          }

    console.log('originalCoords:>> ', originalCoords)

    // Browser scope uses the CDP-based B commands (no XModule needed, works
    // with the window in the background). Desktop scope still needs XModule.
    // Firefox has no debugger API, so browser scope falls back to the
    // OS-level X commands there — same viewport coordinates, aimed by the
    // XModule (whose own error explains the install if it is missing).
    // Without this the agent's first click died with E331 and the whole run
    // could only report "cannot click on Firefox".
    const useOsInput = isDesktop || !isCdpInputAvailable()
    const clickCmd = useOsInput ? 'XClick' : 'BClick'
    const moveCmd = useOsInput ? 'XMove' : 'BMove'

    const executeMouseCommand = (command: any) => {
      console.log('executeMouseCommand:>> command:>> ', command)
      console.log('#220 executeMouseCommand:>> isDesktop:>> ', isDesktop)

      const target = `${originalCoords.x},${originalCoords.y}`
      switch (command) {
        case 'mouse_move':
          this._logMessage(`Action: ${moveCmd} target: ${target}`, 'status')
          store.dispatch(act.addLog('info', `Running ${moveCmd} command target: ${target}`))
          return this._runCsFreeCommand({
            cmd: moveCmd,
            target: `${originalCoords.x},${originalCoords.y}`
          })
        case 'left_click':
          this._logMessage(`Action: ${clickCmd} target: ${target}`, 'status')
          store.dispatch(act.addLog('info', `Running ${clickCmd} command target: ${target}`))
          return this._runCsFreeCommand({
            cmd: clickCmd,
            target: `${originalCoords.x},${originalCoords.y}`
          })
        case 'right_click':
          this._logMessage(`Action: ${clickCmd} (#right) target: ${target}`, 'status')
          store.dispatch(act.addLog('info', `Running ${clickCmd} (#right) command target: ${target}`))
          return this._runCsFreeCommand({
            cmd: clickCmd,
            target: `${originalCoords.x},${originalCoords.y}`,
            value: '#right'
          })
        case 'double_click':
          this._logMessage(`Action: ${clickCmd} (#doubleclick) target: ${target}`, 'status')
          store.dispatch(act.addLog('info', `Running ${clickCmd} (#doubleclick) command target: ${target}`))
          return this._runCsFreeCommand({
            cmd: clickCmd,
            target: `${originalCoords.x},${originalCoords.y}`,
            value: '#doubleclick'
          })
        default:
          console.log('handleMouseAction:>> unknown command:>> ', command)
          return Promise.resolve()
      }
    }

    const uiVisionCmd = action.command === 'mouse_move' ? moveCmd : clickCmd

    return executeMouseCommand(action.command)
      .then((result: any) => {
        console.log('handleMouseAction:>> result:>> ', result)

        // don't show trailing zeros
        const _scaleFactor = scaleFactor.toFixed(5).replace(/\.0+$/, '')

        this._logMessage(`${uiVisionCmd} ${originalCoords.x},${originalCoords.y} (Scale factor: ${_scaleFactor})`, 'user', 'result')
        return {
          success: true
        }
      })
      .then((result: any) => {
        if (result.success) {
          const actionText = action.command === 'mouse_move' ? 'Moved' : action.command === 'left_click' ? 'Clicked left' : 'Clicked right'
          this._logMessage(JSON.stringify(originalCoords), 'set-coordinate')
          return {
            success: true,
            message: `${actionText} at ${action.x},${action.y}`,
            coordinates: originalCoords
          }
        }
      })
  }

  handleKeyboardAction = async (action: any) => {
    console.log('handleKeyboardAction:>> action::', action)

    // Browser scope types via CDP (BType, no XModule); desktop scope needs
    // XType — as does Firefox in every scope (no debugger API, see
    // handleMouseAction)
    const typeCmd = this.params.isDesktop || !isCdpInputAvailable() ? 'XType' : 'BType'

    const executeKeyboardCommand = (action: any) => {
      console.log('executeKeyboardCommand:>> action:>> ', action)
      switch (action.type) {
        case 'keyboard':
        case 'text':
          store.dispatch(act.addLog('info', `Running ${typeCmd} command, value: ${action.value}`))

          return this._runCsFreeCommand({
            cmd: typeCmd,
            target: action.value
          })
        default:
          console.error('executeKeyboardCommand:>> unknown command:>> ', action.type)
          return Promise.resolve()
      }
    }

    return executeKeyboardCommand(action).then(() => {
      return {
        success: true
      }
    })
  }

  getTerminationRequestDefault = (loopCompletedCount: number) => {
    this.currentLoop = loopCompletedCount
    const state = store.getState()
    const maxLoop = 50
    if (loopCompletedCount >= maxLoop) {
      return 'max_loop_reached'
    }

    // "Is the player stopped?" cannot tell "my run ended" from "somebody
    // else's run is going on right now". The loop lives across many awaits (an
    // API call plus a browser action per iteration), so when the script that
    // started it was stopped, the very next macro's play() put the player back
    // into PLAYING — and this loop read that as "carry on", then kept firing
    // clicks, keystrokes and screenshots into the play tab WHILE the next macro
    // was opening its page. That collision is what surfaced there as #102.
    //
    // The playUID is per play() call, so a changed one means this loop has
    // outlived its own command, whatever the player is busy with now.
    if (this.playUID !== null && currentPlayUID() !== this.playUID) {
      return 'player_stopped'
    }

    if (state.player.status === Player.C.STATUS.STOPPED) {
      return 'player_stopped'
    }
  }

  run = async (promptText: string, value: string, vars: any) => {
    const providerConfig = getAIProviderConfig()
    try {
      if (providerConfig.provider === 'uivision' && isFreeTierConsentPending(store.getState().config)) {
        throw new Error('One-time AI setup needed: choose the free Ui.Vision AI in the AI chat, or pick a provider in Settings > AI.')
      }
      if (providerConfig.provider === 'anthropic' && !providerConfig.apiKey) {
        throw new Error(NO_ANTHROPIC_API_KEY_ERROR)
      }
      if (providerConfig.provider === 'openrouter' && !providerConfig.apiKey) {
        throw new Error('No OpenRouter API key set. Please enter it in Settings > AI.')
      }
      if (providerConfig.provider === 'local' && !providerConfig.model) {
        throw new Error('No local AI model name set. Please enter it in Settings > AI.')
      }

      // uivision: model is a server-side choice, never display one
      const showModel = providerConfig.provider !== 'anthropic' && providerConfig.provider !== 'uivision'
      this._logMessage(`Computer Use sequence start (${providerConfig.label}${showModel ? ': ' + providerConfig.model : ''}):`)
      this._logMessage(promptText, 'user')

      console.log('Running sampling...')

      // Recreates the sampling engine if the provider/model changed in settings
      this.sampling = this.getSampling()
      this.sampling.setAPIKey(providerConfig.apiKey)

      return this.sampling
        .run(promptText, this.messages)
        .then((result) => {
          // remove data from result
          // [2].content[0].content[1].source.data

          const replaceDataFieldValue = (obj: any): any => {
            if (Array.isArray(obj)) {
              return obj.map(replaceDataFieldValue)
            } else if (obj && typeof obj === 'object') {
              return Object.fromEntries(
                Object.entries(obj).map(([key, value]) => [
                  key,
                  key === 'data' ? `a big text. length: ${(value as string).length}` : replaceDataFieldValue(value)
                ])
              )
            }
            return obj
          }

          const resultForOutput = replaceDataFieldValue(result)

          console.log('Sampling completed. Result:>>', JSON.stringify(resultForOutput, null, 2))

          if (result.stopReason === 'max_loop_reached') {
            throw new Error('E501: aiComputerUse stopped after its fixed limit of 50 loops. Split the task into smaller steps.')
          } else if (result.stopReason === 'player_stopped') {
            this._logMessage(`Computer Use sequence ended (${this.currentLoop} loops)`)

            return {
              byPass: true
            }
          } else {
            const messages = result //.content[0].text
            const aiMessages = messages.filter((message: any) => message.role === 'assistant')
            const lastContent = aiMessages[aiMessages.length - 1]?.content
            // Anthropic stores content as [{type:'text', text}], OpenAI-compatible as a plain string
            const aiResponse = typeof lastContent === 'string' ? lastContent : lastContent?.[0]?.text

            // found the target
            const newVars = (() => {
              vars.set(
                {
                  [value]: aiResponse
                },
                true
              )
              return {
                [value]: aiResponse
              }
            })()

            return compose()({
              vars: newVars,
              byPass: true
            })
          }
        })
        .catch((error: SamplingError) => {
          console.error('Error in aiComputerUse:', error)

          this.messages = error.messages

          throw uivError(error, providerConfig.label)
        })
    } catch (error) {
      console.error('Error in aiComputerUse:', error)
      throw error
    }
  }
}
