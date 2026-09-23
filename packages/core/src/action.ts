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

/**
 * 表格级命令（区别于行级 Action<T>）：作用域是整个表格而非单行，
 * execute 只接收 table，不接收 item。用于 commandBar 这类表级命令面板，
 * 消费者传入 TableAction[] 数组即可数据驱动渲染按钮。
 */
export interface TableAction {
    name: string,
    desc: string,
    /** 命令按钮图标（与 Action.icon 同构，渲染层用 <component :is> 兼容） */
    icon?: unknown,
    /** 命令按钮类型（对应 el-button type），缺省时渲染层按默认按钮处理 */
    type?: ActionType,
    /** 是否描边（plain）样式，对应 el-button plain；type 为 danger 等时差异明显 */
    plain?: boolean,
    /** 执行表级命令。table 为当前表格实例，可调用 reload/refresh 等刷新 */
    execute(table: TableApi): Promise<void>
}
