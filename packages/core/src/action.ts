export interface Action<T> {
    name: string,
    desc: string,
    show: (item: T) => boolean,
    enable: (item: T) => boolean,
}

export type RowActionsFunc<T> = (signal?: AbortSignal) => Promise<Action<T>[]>;

export function constActions<T>(...actions: Action<T>[]): RowActionsFunc<T> {
    return () => Promise.resolve(actions);
}
export function emptyActions<T>(): RowActionsFunc<T> {
    return constActions();
}