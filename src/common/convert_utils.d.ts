import { MacroInState } from "@/reducers/state"

export type MacroCommand = {
  cmd:      string;
  target?:  string;
  value?:   string;
  targetOptions?: string[];
}

export type Macro = {
  name: string;
  commands: MacroCommand[];
  status?: string;
  id?: string;
}

declare const toJSONString: (macro: Macro, opts?: Record<string, boolean>) => string

declare const fromJSONString: (str: string, fileName?: string, opts?: Record<string, boolean>) => MacroInState

declare const fromHtml: (html: string) => Macro

declare const toHtml: (data: Macro) => string
