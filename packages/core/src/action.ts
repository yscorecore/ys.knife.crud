export interface Action<T> {
    name: string,
    desc: string,
    // 方法简写形式（而非属性箭头）是为了让 Action<具体类型> 可赋值给 Action<unknown>
    // （TS 方法签名双变）；属性箭头在 strictFunctionTypes 下是逆变，会赋值失败
    show?(item: T): boolean,
    enable?(item: T): boolean,
    execute(item: T): Promise<void>
}

export type RowActionsFunc<T> = (signal?: AbortSignal) => Promise<Action<T>[]>;

export function constActions<T>(...actions: Action<T>[]): RowActionsFunc<T> {
    return () => Promise.resolve(actions);
}
export function emptyActions<T>(): RowActionsFunc<T> {
    return constActions();
}