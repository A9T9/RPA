
export enum PlayerMode {
  Straight  = 'STRAIGHT',
  Single    = 'SINGLE',
  Loop      = 'LOOP'
}

export enum PlayerStatus {
  Playing = 'PLAYING',
  Paused  = 'PAUSED',
  Stopped = 'STOPPED',
  Error   = 'ERROR'
}

export enum EndReason {
  Complete  = 'COMPLETE',
  Error     = 'ERROR',
  Manual    = 'MANUAL'
}

export type PlayerState<ResourceT> = {
  title:          string;
  extra:          Record<string, any>;
  startUrl:       string;
  startIndex:     number;
  endIndex:       number;
  nextIndex:      number;
  errorIndex:     number;
  doneIndices:    number[];
  loopsCursor:    number;
  loopsStart:     number;
  loopsEnd:       number;
  playUID:        number;
  breakpoints:    number[];
  callback:       Function;
  public:         Record<string, any>;
  lastPlayConfig: Record<string, any>;
  resources:      ResourceT[];
  status:         PlayerStatus;
  mode:           PlayerMode;
  postDelay?:     number;
}
