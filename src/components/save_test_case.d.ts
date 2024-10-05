import { Dispatch } from "redux";
import { State } from "@/reducers/state";

type SaveOrNotOptions = {
  getTitle:   (data: { macroName: string }) => string;
  getContent: (data: { macroName: string }) => string;
  okText:     string;
  cancelText: string;
}

interface ISaveService {
  save (defaultName?: string): Promise<boolean>;
  saveOrNot (options?: Partial<SaveOrNotOptions>): Promise<boolean>;
}

type SaveServiceGetter = (storeLikeObj: { dispatch: Dispatch<State>; getState: () => State }) => ISaveService

declare const getSaveTestCase: SaveServiceGetter

export default getSaveTestCase
