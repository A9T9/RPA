import { Macro, MacroRunningStatus } from '../macro'
import { Listener } from '../../../common/registry'

export interface IStack<ElementT> {
  clear:    () => void;
  contains: (element: ElementT) => boolean;
  isEmpty:  () => boolean;
  bottom:   () => ElementT;
  peek:     () => ElementT;
  pop:      () => ElementT;
  push:     (element: ElementT) => void;
  toArray:  () => ElementT[];
  getCount: () => number;
}

export type CallStackElement<ResourceT, ResourceRunningStatusT> = {
  id:             string;
  resource:       ResourceT;
  runningStatus:  ResourceRunningStatusT;
}

export type FrameStatus = {
  frameId:  string;
  isBottom: boolean;
  isResume: boolean;
}

export type CallStackOption<ResourceT, ResourceRunningStatusT> = {
  getInitialRunningStatus: (resource: ResourceT) => ResourceRunningStatusT;
  updateRunningStatusForCaller: (runningStatus: ResourceRunningStatusT, resource: ResourceT) => ResourceRunningStatusT;
  prepareContext: (resourceAndStatus: CallStackElement<ResourceT, ResourceRunningStatusT>, frameStatus: FrameStatus) => Promise<void>;
  run: (resourceAndStatus: CallStackElement<ResourceT, ResourceRunningStatusT>, frameStatus: FrameStatus) => Promise<void>;
  getLatestFrameIdFromSnapshot: (snapshot: any[]) => string | null;
}

export type Updater = (item: any) => any

export enum CallStackEvent {
  BeforeRun     = 'before_run',
  BeforeResume  = 'before_resume',
  AfterReturn   = 'after_return',
}

export interface ICallStack<ResourceT, ResourceRunningStatusT>
          extends IStack<CallStackElement<ResourceT, ResourceRunningStatusT>> {
  call: (resource: ResourceT, runningStatus?: ResourceRunningStatusT) => Promise<void>;
  on:   (eventName: CallStackEvent, listener: Listener) => (() => void);
  off:  () => void;
}

export interface ICallStackConstructor<ResourceT, ResourceRunningStatusT> {
  new (options: CallStackOption<ResourceT, ResourceRunningStatusT>): ICallStack<ResourceT, ResourceRunningStatusT>;
}

export type MacroCallStackElement = CallStackElement<Macro, MacroRunningStatus>

export interface IMacroCallStack extends ICallStack<Macro, MacroRunningStatus> {}
