
export type CounterOptions = {
  initial?: number;
  getMax?:  () => number;
  onMax?:   (current: number, max: number, initial: number) => void;
}

export type PersistentCounterOptions = CounterOptions & {
  read:   () => Promise<number>;
  write:  (n: number) => Promise<void>;
}

export interface ICounter {
  reset:      () => void;
  inc:        () => boolean;
  check:      () => boolean;
  get:        () => number;
  getMaximum: () => number;
}
