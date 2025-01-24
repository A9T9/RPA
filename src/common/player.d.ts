declare enum MODE {
  STRAIGHT = 'STRAIGHT',
  SINGLE = 'SINGLE',
  LOOP = 'LOOP'
}

declare enum STATUS {
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR'
}

declare enum END_REASON {
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
  MANUAL = 'MANUAL'
}

declare enum NEXT_INDEX_INITIATOR {
  INIT = 'INIT',
  NORMAL = 'NORMAL',
  LOOP = 'LOOP'
}

export declare class Player {
  constructor()

  static C: {
    MODE: typeof MODE
    STATUS: typeof STATUS
    END_REASON: typeof END_REASON
  }
}

export declare const getPlayer: (opts?: any, state?: any) => Player
