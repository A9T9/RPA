import { ActionCreatorsMapObject } from "redux";

export interface Action<T extends string> {
    type: T;
}

export interface ActionWithPayload<T extends string, P> extends Action<T> {
    payload: P;
}

export function createAction<T extends string>(type: T): Action<T>;
export function createAction<T extends string, P>(type: T, payload: P): ActionWithPayload<T, P>;

export function createAction<T extends string, P>(type: T, payload?: P) {
    return payload === void 0 ? { type } : { type, payload };
}

export type ActionUnion<T extends ActionCreatorsMapObject> = ReturnType<T[keyof T]>;
export type ActionByType<TActionUnion, TActionType> = TActionUnion extends { type: TActionType } ? TActionUnion : never;
