
import { IMonitor, InspectorFactory, IInspector } from './types'
import { objMap } from '../../../common/ts_utils';

export class Monitor<InspectorNameT extends string> implements IMonitor<InspectorNameT> {
  private inspectorConstructors: Record<InspectorNameT, InspectorFactory> = {} as any
  private paramsProvider: (name: InspectorNameT, id?: string, notBatch?: boolean) => any[];
  private targets: Record<string, Record<InspectorNameT, IInspector>> = {}

  constructor (
    inspectorConstructors: Record<InspectorNameT, InspectorFactory>,
    paramsProvider: (name: InspectorNameT, id?: string, notBatch?: boolean) => any[]
  ) {
    this.paramsProvider        = paramsProvider
    this.inspectorConstructors = inspectorConstructors
  }

  public addTarget (id: string, autoStart: boolean = true) {
    this.targets[id] = objMap((factory: InspectorFactory, key: string) => {
      const inspector = factory(id)

      if (autoStart) {
        inspector.restart(...this.paramsProvider(key as InspectorNameT))
      }

      return inspector
    }, this.inspectorConstructors)
  }

  public removeTarget (id: string) {
    if (!this.targets[id]) {
      return
    }

    objMap((inspector: IInspector) => {
      inspector.stop()
    }, this.targets[id])

    delete this.targets[id]
  }

  public clear () {
    Object.keys(this.targets).map((id) => {
      this.removeTarget(id)
    })
  }

  public restart (): void {
    this.traverseAllInspectors((inspector, key, id) => {
      inspector.restart(...this.paramsProvider(key, id))
    })
  }

  public pause (): void {
    this.traverseAllInspectors((inspector) => {
      inspector.pause()
    })
  }

  public resume (): void {
    this.traverseAllInspectors((inspector) => {
      inspector.resume()
    })
  }

  public stop (): void {
    this.traverseAllInspectors((inspector) => {
      inspector.stop()
    })
  }

  public restartInspector (id: string, inspectorName: InspectorNameT): void {
    this.getInspector(id, inspectorName).restart(
      ...this.paramsProvider(inspectorName, id, true)
    )
  }

  public pauseInspector (id: string, inspectorName: InspectorNameT): void {
    this.getInspector(id, inspectorName).pause()
  }

  public resumeInspector (id: string, inspectorName: InspectorNameT): void {
    this.getInspector(id, inspectorName).resume()
  }

  public stopInspector (id: string, inspectorName: InspectorNameT): void {
    this.getInspector(id, inspectorName).stop()
  }

  public getDataFromInspector (id: string, inspectorName: InspectorNameT): any {
    return this.getInspector(id, inspectorName).output()
  }

  protected traverseAllInspectors (fn: (inspector: IInspector, key: InspectorNameT, id: string) => void) {
    objMap((inspectors, id) => {
      objMap((inspector, key) => {
        try {
          fn(inspector, key as InspectorNameT, id)
        } catch (e) {
          console.error(e)
        }
      }, inspectors)
    }, this.targets)
  }

  protected getInspector (id: string, inspectorName: InspectorNameT): IInspector {
    const inspectors = this.targets[id]

    if (!inspectors) {
      throw new Error(`Can't find monitor target with id '${id}'`)
    }

    const inspector = inspectors[inspectorName]

    if (!inspector) {
      throw new Error(`Can't find inspector with name '${inspectorName}' for target id '${id}'`)
    }

    return inspector
  }
}
