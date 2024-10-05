import { ICallStack, CallStackElement, CallStackOption, Updater, CallStackEvent, FrameStatus } from './types'
import { Stack } from './stack'
import { Macro, MacroRunningStatus, MacroStatus, CommandRunningStatus } from '../macro'
import { singletonGetter, withPromise, uid } from '../../../common/ts_utils'
import { createListenerRegistry, Registry, Listener } from '../../../common/registry'

export class CallStack<R, S>
extends Stack<CallStackElement<R, S>>
implements ICallStack<R, S> {

  protected opts: CallStackOption<R, S>
  protected registry: Registry<Listener>

  constructor (options: CallStackOption<R, S>) {
    super()
    this.opts = options
    this.registry = createListenerRegistry()
  }

  public on (eventName: CallStackEvent, listener: Listener): (() => void) {
    this.registry.add(eventName, listener)
    return () => this.registry.remove(eventName, listener)
  }

  public off (): void {
    this.registry.destroy()
  }

  public call (resource: R, runningStatus?: S): Promise<void> {
    if (!this.isEmpty()) {
      this.updatePeek((element: CallStackElement<R, S>): CallStackElement<R, S> => {
        return {
          id:             element.id,
          resource:       element.resource,
          runningStatus:  {
            ...this.opts.updateRunningStatusForCaller(element.runningStatus, element.resource),
            status: MacroStatus.Calling
          }
        }
      })
    }

    this.push({
      resource,
      id: uid(),
      runningStatus: runningStatus || this.opts.getInitialRunningStatus(resource)
    })

    this.registry.fire(CallStackEvent.BeforeRun, this.callStackSnapshot())
    return this.runPeek()
  }

  protected runPeek (isResume: boolean = false): Promise<void> {
    return this.opts.prepareContext(this.peek(), this.getFrameStatus(this.peek(), isResume))
    .then(() => {
      const item = this.peek()

      // ** HERE is where macro starts to run
      return this.opts.run(item, this.getFrameStatus(item, isResume))
      .then(() => {
        const snapshot = this.callStackSnapshot()
        const latestFrameId = this.opts.getLatestFrameIdFromSnapshot(snapshot)

        // FIXME: There is a kind of design error here. This callback after runPeek could be run twice
        // for a single macro.
        //
        // For exmaple, Run A => A calls B => B returns to A => A continues
        // 1) Run A: runPeek is called for A for first time
        // 2) A calls B: runPeek is called for B for first time
        // 3) B returns to A: The call to runPeek below is run, so runPeek is called for A for second time
        //
        // As a temporary fix, I have to check if snapshot's last element is the same as the one being run
        if (latestFrameId !== item.id) {
          return
        }

        this.registry.fire(CallStackEvent.AfterReturn, snapshot)
        this.pop()

        if (this.isEmpty()) {
          return
        }

        this.updatePeekAfterResume()

        this.registry.fire(CallStackEvent.BeforeResume, this.callStackSnapshot())
        return this.runPeek(true)
      })
    })
  }

  protected updatePeek (updater: Updater): void {
    this.guardNotEmpty()
    const index       = this.getCount() - 1
    this.list[index]  = updater(this.list[index])
  }

  protected getFrameStatus (element: CallStackElement<R, S>, isResume: boolean): FrameStatus {
    return {
      isResume,
      isBottom: this.getCount() === 1,
      frameId:  element.id
    }
  }

  protected updatePeekAfterResume (): void {
    this.updatePeek((element: CallStackElement<R, S>): CallStackElement<R, S> => {
      return element
    })
  }

  protected callStackSnapshot (): any[] {
    return this.list.map((item) => item.resource)
  }
}

export class MacroCallStack extends CallStack<Macro, MacroRunningStatus> {
  public isAtBottom (): boolean {
    return this.getCount() === 1
  }

  protected callStackSnapshot () {
    return this.list.map((item) => ({
      id:      item.resource.id,
      name:    item.resource.name,
      frameId: item.id
    }))
  }

  protected updatePeekAfterResume () {
    this.updatePeek((element: CallStackElement<Macro, MacroRunningStatus>): CallStackElement<Macro, MacroRunningStatus> => {
      const curIndex       = element.runningStatus.nextIndex
      const nextIndex      = curIndex + 1
      const commandResults = [...element.runningStatus.commandResults]

      commandResults[curIndex] = CommandRunningStatus.Success

      return {
        id:             element.id,
        resource:       element.resource,
        runningStatus:  {
          nextIndex,
          commandResults,
          status: MacroStatus.Running,
          playerState: {
            ...element.runningStatus.playerState,
            nextIndex,
            doneIndices: [
              ...element.runningStatus.playerState.doneIndices,
              curIndex
            ]
          },
          interpreterState: element.runningStatus.interpreterState
        }
      }
    })
  }
}

export type MacroCallStackElement = CallStackElement<Macro, MacroRunningStatus>

export const getMacroCallStack = singletonGetter((callStackOptions?: CallStackOption<Macro, MacroRunningStatus>) => {
  if (!callStackOptions) {
    throw new Error('macro call stack options is required')
  }
  return new MacroCallStack(callStackOptions)
})

export type OptionFunc = (macro: Macro, runningStatus: MacroRunningStatus, status: FrameStatus) => void

export type Options = {
  getCurrentMacroRunningStatus: () => MacroRunningStatus;
  updateSelectedMacro:          OptionFunc;
  restorePlayerState:           OptionFunc;
  playMacro:                    OptionFunc;
}

export function createMacroCallStack (options: Options): MacroCallStack {
  return getMacroCallStack({
    getInitialRunningStatus: (macro: Macro) => ({
      nextIndex:       0,
      status:          MacroStatus.Running,
      commandResults:  [],
      playerState:     {} as any,
      interpreterState: {}
    }),
    getLatestFrameIdFromSnapshot: (snapshot: any[]): string | null => {
      const last = snapshot[snapshot.length - 1]
      return last ? last.frameId : null
    },
    updateRunningStatusForCaller: (runningStatus: MacroRunningStatus, macro: Macro): MacroRunningStatus => {
      return options.getCurrentMacroRunningStatus()
    },
    prepareContext: (resourceAndStatus: MacroCallStackElement, frameStatus: FrameStatus) => {
      const macro   = resourceAndStatus.resource as Macro
      const status  = resourceAndStatus.runningStatus as MacroRunningStatus

      return withPromise(() => options.updateSelectedMacro(macro, status, frameStatus))
      .then(() => withPromise(() => options.restorePlayerState(macro, status, frameStatus)))
    },
    // ** This is where the macro starts to run
    run: (resourceAndStatus: MacroCallStackElement, frameStatus: FrameStatus) => {
      // Steps
      // * Update selected macro
      // * Restore commandResults
      // * Restore tcPlayer state
      // * Start to play
      // Filter out empty commands
      let opt = resourceAndStatus.runningStatus.playerState;
      const opts = {
        ...opt,
        resources: (opt.resources || []).filter(res => res.cmd && res.cmd.length > 0)
      }
      resourceAndStatus.runningStatus.playerState = opts;

      const macro   = resourceAndStatus.resource as Macro

    
      const status  = resourceAndStatus.runningStatus as MacroRunningStatus

      return withPromise(() => options.playMacro(macro, status, frameStatus))
    }
  })
}
