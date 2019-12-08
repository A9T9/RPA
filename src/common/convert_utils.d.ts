
export type MacroCommand = {
  cmd: string;
  target?: string;
  value?: string;
}

export type Macro = {
  name: string;
  commands: MacroCommand[];
  status?: string;
  id?: string;
}

declare const toJSONString: (macro: Macro, opts?: Record<string, boolean>) => string

declare const fromJSONString: (str: string, fileName: string, opts?: Record<string, boolean>) => Macro
