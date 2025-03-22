import * as act from '@/actions'
import * as C from '@/common/constant'
import { Player } from '@/common/player'
import { compose, isWindows } from '@/common/ts_utils'
import { store } from '@/redux'
import { NO_ANTHROPIC_API_KEY_ERROR } from '../anthropic'
import Sampling, { ClaudeSamplingMessage, SamplingError, SamplingParams } from './sampling'
import { ComputerUseMessageType } from './model'

interface ComputerUseServiceParams {
  runCsFreeCommands: any
  value: any
  captureScreenShotFunction: any
  isDesktop: boolean
  logMessage?: (message: string, userOrAi?: ComputerUseMessageType, isActionOrResult?: 'action' | 'result') => void
  getTerminationRequest?: (loopCompletedCount: number) => 'max_loop_reached' | 'player_stopped' | 'stop_requested' | undefined
}

const uivError = (error: any) => {
  if (error instanceof Error) {
    if (error.message.includes('Expected either apiKey or authToken to be set')) {
      return new Error(NO_ANTHROPIC_API_KEY_ERROR)
    } else if (error.message.includes('invalid x-api-key')) {
      return new Error('Invalid API key. Please re-enter the API key, and save it.')
    }
    return new Error(`E352: Anthropic API returned error: ${error.message}`)
  }
  return new Error(`E352: Anthropic API returned error: ${error.message}`)
}

export class ComputerUseService {
  private _logMessage: (message: string, userOrAi?: ComputerUseMessageType, isActionOrResult?: 'action' | 'result') => void
  private currentLoop = 0
  private _getTerminationRequest: (loopCompletedCount: number) => 'max_loop_reached' | 'player_stopped' | 'stop_requested' | undefined
  private messages: ClaudeSamplingMessage[] = []
  private sampling: Sampling

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
    let anthropicAPIKey = store.getState().config.anthropicAPIKey
    const samplingProps: SamplingParams = {
      model: C.ANTHROPIC.COMPUTER_USE_MODEL,
      anthropicAPIKey: anthropicAPIKey,
      captureScreenShotFunction: this.params.captureScreenShotFunction,
      handleMouseAction: this.handleMouseAction,
      handleKeyboardAction: this.handleKeyboardAction,
      getTerminationRequest: this._getTerminationRequest,
      logMessage: this._logMessage
    }
    this.messages = []
    this.currentLoop = 0
    this.sampling = new Sampling(samplingProps)
  }

  private getSampling = (): Sampling => {
    if (!this.sampling) {
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

    const executeMouseCommand = (command: any) => {
      console.log('executeMouseCommand:>> command:>> ', command)
      console.log('#220 executeMouseCommand:>> isDesktop:>> ', isDesktop)

      const target = `${originalCoords.x},${originalCoords.y}`
      switch (command) {
        case 'mouse_move':
          this._logMessage(`Action: XMove target: ${target}`, 'status')
          store.dispatch(act.addLog('info', `Running XMove command target: ${target}`))
          return this._runCsFreeCommand({
            cmd: 'XMove',
            target: `${originalCoords.x},${originalCoords.y}`
          })
        case 'left_click':
          this._logMessage(`Action: XClick target: ${target}`, 'status')
          store.dispatch(act.addLog('info', `Running XClick command target: ${target}`))
          return this._runCsFreeCommand({
            cmd: 'XClick',
            target: `${originalCoords.x},${originalCoords.y}`
          })
        case 'right_click':
          this._logMessage(`Action: XClick (#right) target: ${target}`, 'status')
          store.dispatch(act.addLog('info', `Running XClick (#right) command target: ${target}`))
          return this._runCsFreeCommand({
            cmd: 'XClick',
            target: `${originalCoords.x},${originalCoords.y}`,
            value: '#right'
          })
        case 'double_click':
          this._logMessage(`Action: XClick (#doubleclick) target: ${target}`, 'status')
          store.dispatch(act.addLog('info', `Running XClick (#doubleclick) command target: ${target}`))
          return this._runCsFreeCommand({
            cmd: 'XClick',
            target: `${originalCoords.x},${originalCoords.y}`,
            value: '#doubleclick'
          })
        default:
          console.log('handleMouseAction:>> unknown command:>> ', command)
          return Promise.resolve()
      }
    }

    const uiVisionCmd = action.command === 'mouse_move' ? 'XMove' : 'XClick'

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

    const executeKeyboardCommand = (action: any) => {
      console.log('executeKeyboardCommand:>> action:>> ', action)
      switch (action.type) {
        case 'keyboard':
        case 'text':
          store.dispatch(act.addLog('info', `Running XType command, value: ${action.value}`))

          return this._runCsFreeCommand({
            cmd: 'XType',
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
    const maxLoop = parseInt(state.config.aiComputerUseMaxLoops)
    if (loopCompletedCount >= maxLoop) {
      return 'max_loop_reached'
    }

    if (state.player.status === Player.C.STATUS.STOPPED) {
      return 'player_stopped'
    }
  }

  run = async (promptText: string, value: string, vars: any) => {
    try {
      let anthropicAPIKey = store.getState().config.anthropicAPIKey
      console.log('anthropicAPIKey :>> ', anthropicAPIKey)

      if (!anthropicAPIKey) {
        throw new Error(NO_ANTHROPIC_API_KEY_ERROR)
      }

      this._logMessage('Computer Use sequence start:')
      this._logMessage(promptText, 'user')

      console.log('Running sampling...')

      this.sampling.setAPIKey(anthropicAPIKey)

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
            throw new Error('E501: Loop Limit Reached. Increase if needed.')
          } else if (result.stopReason === 'player_stopped') {
            this._logMessage(`Computer Use sequence ended (${this.currentLoop} loops)`)

            return {
              byPass: true
            }
          } else {
            const messages = result //.content[0].text
            const aiMessages = messages.filter((message: any) => message.role === 'assistant')
            const aiResponse = aiMessages[aiMessages.length - 1]?.content?.[0]?.text

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

          // TODO: update this.messages with the messages returned in the error

          throw uivError(error)
        })
    } catch (error) {
      console.error('Error in aiComputerUse:', error)
      throw error
    }
  }
}
