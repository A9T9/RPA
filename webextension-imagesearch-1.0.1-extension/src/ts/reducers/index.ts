import { StoreState } from "../models";
import { ActionType, Actions } from "../actions";

export function rootReducer(state: StoreState | undefined, action: Actions): StoreState {
    console.log("Action:", action);
    if (!state) {
        return {} as StoreState;
    }

    switch (action.type) {
        case ActionType.AppendToLog:
            return { ...state, logs: [...state.logs, action.payload.text] };

        case ActionType.SetPatternImage:
            return {
                ...state,
                patternImage: {
                    dataUrl: action.payload.dataUrl,
                    info: action.payload.info
                }
            };
            
        default:
            return state;
    }
}
