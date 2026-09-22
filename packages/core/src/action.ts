import type { TableApi } from "./ui";

/** 行操作按钮类型，对应 el-button 的 type（core 层不依赖 element-plus，用字面量联合约束） */
export type ActionType = "primary" | "success" | "warning" | "danger" | "info" | "default";

export interface Action<T> {
    name: string,
    desc: string,
    /**
     * 行操作按钮图标。core 层不约束具体类型（unknown），
     * element-plus 渲染层用 <component :is> 兼容 Vue 组件 / 函数式组件 / VNode；为空时不显示图标。
     */
    icon?: unknown,
    /** 行操作按钮类型（对应 el-button type），缺省时渲染层按 primary 处理 */
    type?: ActionType,
    // 方法简写形式（而非属性箭头）是为了让 Action<具体类型> 可赋值给 Action<unknown>
    // （TS 方法签名双变）；属性箭头在 strictFunctionTypes 下是逆变，会赋值失败
    show?(item: T): boolean,
    enable?(item: T): boolean,
    /**
     * 执行行操作。table 为当前表格实例（TableApi），
     * action 完成后可调用 table.reload() 等刷新（例如删除一行后刷新当前页）。
     */
    execute(item: T, table: TableApi): Promise<void>
}

export type RowActionsFunc<T> = (signal?: AbortSignal) => Promise<Action<T>[]>;

export function constActions<T>(...actions: Action<T>[]): RowActionsFunc<T> {
    return () => Promise.resolve(actions);
}
export function emptyActions<T>(): RowActionsFunc<T> {
    return constActions();
}
