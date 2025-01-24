import { PlayerState } from './player'

export type Command = {
  cmd:    string;
  target: string;
  value:  string;
  extra?: any;
  targetOptions?: string[];
}

export enum CommandRunningStatus {
  Pending,
  Success,
  Failure,
  Warning
}

export type Macro = {
  id:         string;
  name:       string;
  path:       string;
  commands:   Command[];
  createdAt?: number;
}

export enum MacroStatus {
  Idle,
  Running,
  Calling,
  Finished,
  Error
}

export type MacroRunningStatus = {
  status:           MacroStatus;
  nextIndex:        number;
  commandResults:   CommandRunningStatus[];
  playerState:      PlayerState<Command>;
  interpreterState?: any;
}

export type DoneErrorIndices = {
  doneIndices:    number[];
  errorIndices:   number[];
  warningIndices: number[];
  count:          number;
}

export function getCommandResults (data: DoneErrorIndices): CommandRunningStatus[] {
  const { doneIndices, errorIndices, warningIndices, count } = data
  const result = [] as CommandRunningStatus[]

  for (let i = 0; i < count; i++) {
    if (doneIndices.indexOf(i) !== -1) {
      result.push(CommandRunningStatus.Success)
    } else if (errorIndices.indexOf(i) !== -1) {
      result.push(CommandRunningStatus.Failure)
    } else if (warningIndices.indexOf(i) !== -1) {
      result.push(CommandRunningStatus.Warning)
    } else {
      result.push(CommandRunningStatus.Pending)
    }
  }

  return result
}

export function getDoneErrorIndices (commandResults: CommandRunningStatus[]): DoneErrorIndices {
  const doneIndices    = [] as number[]
  const errorIndices   = [] as number[]
  const warningIndices = [] as number[]

  commandResults.forEach((r, i) => {
    switch (r) {
      case CommandRunningStatus.Failure:
        return errorIndices.push(i)

      case CommandRunningStatus.Warning:
        return warningIndices.push(i)

      case CommandRunningStatus.Success:
        return doneIndices.push(i)
    }
  })

  return {
    doneIndices,
    errorIndices,
    warningIndices,
    count: commandResults.length
  }
}
