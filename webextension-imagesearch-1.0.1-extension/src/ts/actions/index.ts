import { createAction, ActionUnion } from "./action-helpers";
import { ActionType } from "./action-type";

export const Actions = {
    appendToLog: (text: string) => createAction(ActionType.AppendToLog, { text }),
    setPatternImage: (dataUrl: string, info: kantusearch.ImageInfo) =>
        createAction(ActionType.SetPatternImage, { dataUrl, info })
};

export type Actions = ActionUnion<typeof Actions>;
export { ActionType } from "./action-type";
