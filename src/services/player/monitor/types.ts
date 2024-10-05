

export interface IInspector {
  restart:  (...args: any[]) => void;
  pause:    () => void;
  resume:   () => void;
  stop:     () => void;
  output:   () => any;
}

export interface IInspectorConstructor {
  new (...args: any[]): IInspector;
}

export type InspectorFactory = (id: string) => IInspector

export interface IMonitor<InspectorNameT extends string> {
  addTarget:            (id: string, autoStart?: boolean) => void;
  removeTarget:         (id: string) => void;
  restart:              () => void;
  pause:                () => void;
  resume:               () => void;
  stop:                 () => void;
  clear:                () => void;
  restartInspector:     (id: string, inspectorName: InspectorNameT) => void;
  pauseInspector:       (id: string, inspectorName: InspectorNameT) => void;
  resumeInspector:      (id: string, inspectorName: InspectorNameT) => void;
  stopInspector:        (id: string, inspectorName: InspectorNameT) => void;
  getDataFromInspector: (id: string, inspectorName: InspectorNameT) => any;
}

export enum MacroInspector {
  Timer = 'timer',
  LoopTimer = 'loop_timer',
  Countdown = 'countdown'
}
