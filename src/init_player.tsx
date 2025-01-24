import * as act from '@/actions'
import { isExtensionResourceOnlyCommand } from '@/common/command'
import Interpreter from '@/common/interpreter'
import csIpc from '@/common/ipc/ipc_cs'
import path from '@/common/lib/path'
import { getPlayer } from '@/common/player'
import { clone } from '@/common/ts_utils'
import { and } from '@/common/utils'
import varsFactory from '@/common/variables'
import { getDoneCommandIndices, getErrorCommandIndices, getWarningCommandIndices } from '@/recomputed'
import { createMacroCallStack, getMacroCallStack } from '@/services/player/call_stack/call_stack'
import { CallStackEvent } from '@/services/player/call_stack/types'
import { getCommandResults, MacroStatus } from '@/services/player/macro'
import { getMacroMonitor, MacroParamsProviderType } from '@/services/player/monitor/macro_monitor'
import { MacroInspector } from '@/services/player/monitor/types'
import { ocrCmdCounter, proxyCounter, xCmdCounter } from '@/modules/counters'
import { interpretSpecialCommands } from '@/modules/interpret_commands'
import { initTestCasePlayer, initTestSuitPlayer } from '@/modules/players'
import { showDownloadBarFinally } from './modules/helper'
 

type PlayerType  = any
type InterpreterType = any

export class PlayerInstance {
  private static _player:PlayerType ; 
  public static getInstance(): PlayerType {
    if (!PlayerInstance._player) {
       throw new Error('player not initialized')
    }
    return PlayerInstance._player;
  }

  public static setInstance(player: PlayerType): void {
    PlayerInstance._player = player;
  }   
}

export class InterpreterInstance {
  private static _interpreter:InterpreterType ; 
  public static getInstance(): InterpreterType {
    if (!InterpreterInstance._interpreter) {
       throw new Error('interpreter not initialized')
    }
    return InterpreterInstance._interpreter;
  }

  public static setInstance(interpreter: InterpreterType): void {
    InterpreterInstance._interpreter = interpreter;
  }
}

function initMacroMonitor ({ store, vars }) {
  getMacroMonitor((actionType, name, id, notBatch) => {
    switch (actionType) {
      case MacroParamsProviderType.Constructor: {
        switch (name) {
          case MacroInspector.Countdown:
          return [
          () => {
            getPlayer().stopWithError(
              new Error(
                `E351: macro '${getMacroCallStack().peek().resource.name}' timeout ${vars.get('!TIMEOUT_MACRO')}s (change the value in the settings if needed)`
                )
              )
          }
          ]

          case MacroInspector.Timer:
          case MacroInspector.LoopTimer:
          default:
          return []
        }
      }

      case MacroParamsProviderType.Restart: {
        switch (name) {
          case MacroInspector.Countdown:
          return [
          vars.get('!TIMEOUT_MACRO') * 1000,
          true
          ]

          case MacroInspector.Timer:
          case MacroInspector.LoopTimer:
          default:
          return []
        }
      }
    }
  })
}

// Note: initialize the player, and listen to all events it emits
export const initPlayer = (store) => {
  const vars           = varsFactory('main', {}, { '!TESTSUITE_LOOP': 1 })
  const macroCallStack = createMacroCallStack({
    getCurrentMacroRunningStatus: () => {
      const playerState     = tcPlayer.getState()
      const reducerState    = store.getState()
      const commandResults  = getCommandResults({
        count:          playerState.resources.length,
        doneIndices:    getDoneCommandIndices(reducerState),
        errorIndices:   getErrorCommandIndices(reducerState),
        warningIndices: getWarningCommandIndices(reducerState)
      })

      return {
        playerState,
        commandResults,
        status:           MacroStatus.Running,
        nextIndex:        playerState.nextIndex,
        interpreterState: interpreter.backupState()
      }
    },
    updateSelectedMacro: (macro, runningStatus) => {
      return store.dispatch(act.editTestCase(macro.id))
    },
    restorePlayerState: (macro, runningStatus) => {
      // Steps:
      // 1. Restore macro player state
      // 2. Restore player state in reducer
      const { playerState, interpreterState = clone(Interpreter.DefaultState) } = runningStatus

      tcPlayer.setState(playerState)

      store.dispatch(act.setPlayerState({
        // Note: since we don't show loop info for subroutines,
        // `currentLoop` and `loops` in reducer state is always for initial call frame,
        // so no neep to restore that info from call stack before playing any frame
        //
        // currentLoop:         playerState.loopsCursor - playerState.loopsStart + 1,
        // loops:               playerState.loopsEnd - playerState.loopsStart + 1,
        nextCommandIndex:    playerState.nextIndex
      }))

      interpreter.restoreState(interpreterState)
    },
    playMacro: (macro, runningStatus, { isBottom, isResume, frameId }) => {
      // Note: do not use clone here, otherwise will lose `callback` in playerState
      const playerState = { ...runningStatus.playerState }

      playerState.noEndEvent = !isBottom

      // Note: frameId in extra will be available in all kinds of player events,
      // frameId is used as id for monitor, so that we can control monitors in player events
      playerState.extra = {
        ...(playerState.extra || {}),
        frameId,
        macroId:            macro.id,
        isBottomFrame:      isBottom,
        isBackFromCalling:  isResume
      }

      return showDownloadBarFinally(
        () => xCmdCounter.get() > 0,
        () => {
          if (isResume) {
            tcPlayer.setState(playerState)
            // Note: already increase `nextIndex` by one
            tcPlayer.__setNext(runningStatus.nextIndex)

            return tcPlayer.play(
              tcPlayer.getState()
              )
          } else {
            const needDelayAfterLoop = and(
              ...playerState.resources.map(command => isExtensionResourceOnlyCommand(command.cmd))
              )
            const args = {
              ...playerState,
              needDelayAfterLoop
            }
            return tcPlayer.play(args)
          }
        }
      )
    }
  })


  const interpreter = new Interpreter({
    run: interpretSpecialCommands({
      vars,
      store,
      xCmdCounter,
      getTcPlayer: () => PlayerInstance.getInstance(), //tcPlayer,
      getInterpreter: () => InterpreterInstance.getInstance(),
    })
  })
  InterpreterInstance.setInstance(interpreter)

  const tcPlayer    = initTestCasePlayer({store, vars, interpreter, xCmdCounter, ocrCmdCounter, proxyCounter})
  PlayerInstance.setInstance(tcPlayer)
  // **important: don't remove tsPlayer. It's actually used by context menu "Testsuite: Play all in folder"
  const tsPlayer    = initTestSuitPlayer({store, vars, tcPlayer, xCmdCounter, ocrCmdCounter, proxyCounter})

  initMacroMonitor({ vars, store })

  macroCallStack.on(CallStackEvent.BeforeRun, (macroInfoList) => {
    const lastMacroInfo = macroInfoList[macroInfoList.length - 1]
    const lastName      = lastMacroInfo.name
    const prevNames     = macroInfoList.slice(0, -1).map((item) => `'${item.name}'`)

    if (prevNames.length > 0) {
      store.dispatch(act.addLog('status', `Running '${lastName}', called by ${prevNames.join(' > ')}`))
    }
  })

  macroCallStack.on(CallStackEvent.AfterReturn, (macroInfoList) => {
    const lastMacroInfo = macroInfoList[macroInfoList.length - 1]
    const lastName      = lastMacroInfo.name
    const lastFrameId   = lastMacroInfo.frameId
    const prevNames     = macroInfoList.slice(0, -1).map((item) => `'${item.name}'`)

    getMacroMonitor().removeTarget(lastFrameId)

    if (prevNames.length > 0) {
      store.dispatch(act.addLog('status', `Finished running '${lastName}', returning to ${prevNames.join(' > ')}`))
    }
  })

  csIpc.onAsk((cmd, args) => {
    switch (cmd) {
      case 'DOWNLOAD_COMPLETE': {
        const fileName = args ? path.basename(args.filename) : null

        if (!fileName) {
          return false
        }
        vars.set({ '!LAST_DOWNLOADED_FILE_NAME': fileName }, true)
        return true
      }
    }
  })

  // Note: No need to return anything in this method.
  // Because both test case player and test suite player are cached in player.js
  // All later usage of player utilize `getPlayer` method
}

