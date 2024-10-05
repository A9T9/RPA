export type IpcPromiseOptions  = {
  ask:      Function,
  answer:   Function,
  onAsk:    Function,
  onAnswer: Function,
  destroy?: Function,
  timeout?: number
}

export interface Ipc {
  ask:      Function;
  onAsk:    Function;
  destroy:  Function;
  secret?:  string;
}

declare const ipcPromise: (options: IpcPromiseOptions) => Ipc

export default ipcPromise
