
export interface IStorage {
  get: (key: string) => Promise<any>;
  set: (key: string, val: any) => Promise<boolean>;
  remove: (key: string) => Promise<boolean>;
  clear: () => Promise<boolean>;
  addListener: (fn: Function) => void;
}

declare const storage: IStorage

export default storage
