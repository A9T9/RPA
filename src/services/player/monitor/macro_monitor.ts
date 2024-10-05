
import { MacroInspector } from './types'
import { Monitor } from './monitor'
import { Timer } from './timer'
import { Countdown } from './countdown'
import { singletonGetter } from '../../../common/ts_utils'

export enum MacroParamsProviderType {
  Constructor,
  Restart
}

export type MacroMonitorParamsProvider = (
  actionType: MacroParamsProviderType,
  name:       MacroInspector,
  id?:        string,
  notBatch?:  boolean
) => any[]

export class MacroMonitor extends Monitor<MacroInspector> {
  constructor (paramsProvider: MacroMonitorParamsProvider) {
    super(
      {
        [MacroInspector.Timer]: (id: string) => {
          return new Timer()
        },
        [MacroInspector.LoopTimer]: (id: string) => {
          return new Timer()
        },
        [MacroInspector.Countdown]: (id: string) => {
          const args = paramsProvider(
            MacroParamsProviderType.Constructor,
            MacroInspector.Countdown,
            id,
            false
          )
          const callback = args[0]

          return new Countdown(callback)
        }
      },
      (name: MacroInspector, id?: string, notBatch?: boolean) => {
        return paramsProvider(MacroParamsProviderType.Restart, name, id, notBatch)
      }
    )
  }
}

export const getMacroMonitor = singletonGetter((paramsProvider: MacroMonitorParamsProvider) => {
  return new MacroMonitor(paramsProvider)
})
