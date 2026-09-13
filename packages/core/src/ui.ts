import type { Meta, MetaFunc } from "./meta"
import type { PageFunc } from "./page"
import type { PagedList } from "ys.knife.query.js"
import type { Action, RowActionsFunc } from "./action"
import type { loadConfigFunc as loadCustomConfigFunc, saveCustomConfigFunc } from "./customConfig"

/** TableProps 是组件的「输入契约」：父组件通过 props 传入 */
export interface TableProps {
    metaFun: MetaFunc
    dataFun: PageFunc<unknown>
    /** 可选。存在时，表格在每一行最后一列显示可执行的操作 */
    rowActionsFunc?: RowActionsFunc<unknown>
    /** 可选，默认 false。为 true 时表格第一列显示 checkbox（表头含全选/取消全选） */
    showCheckbox?: boolean,
    /** 可选，默认 false。为 true 时显示列设置入口，用户可自定义列的显隐、顺序与宽度 */
    showCustomConfig?: boolean,
    /** 可选。加载列自定义配置（showCustomConfig 为 true 时使用；返回 null 按空配置处理） */
    loadCustomConfigFun?: loadCustomConfigFunc,
    /** 可选。保存列自定义配置（showCustomConfig 为 true 时使用） */
    saveCustomConfigFun?: saveCustomConfigFunc,
}

/**
 * TableApi 是组件的「输出契约」：组件通过 defineExpose 暴露、
 * 父组件通过模板 ref 调用的 API。
 *
 * 组件实现侧用 `satisfies` 校验 exposed 对象覆盖本接口的全部成员，
 * 缺少任何方法/状态都会编译报错，从而强制组件实现该契约。
 *
 * 注意：这里的状态成员是「解包后」的视图（如 selectedRows: unknown[]），
 * 因为父组件经模板 ref 访问 expose 代理时 ref 会被自动解包；
 * 组件内部实现时每个状态对应一个 Ref<成员类型>（见 Table.vue 的 ExposedShape）。
 */
export interface TableApi {
    /** 列元数据（metaFun 加载结果，未加载完成时为 null） */
    readonly meta: Meta | null
    /** 当前页数据（dataFun 加载结果，未加载完成时为 null） */
    readonly paged: PagedList<unknown> | null
    /** 行操作列表（rowActionsFunc 加载结果） */
    readonly actions: Action<unknown>[]
    /** 当前页码（1 基） */
    readonly currentPage: number
    /** checkbox 列当前选中的行（跨页累计，reserve-selection） */
    readonly selectedRows: unknown[]
    /** 重新加载元数据、数据与行操作 */
    reload(): void
    /** 清空全部选中（含其他页的选中） */
    clearSelection(): void
}

// export interface PaginationProps {
//     pageIndex: number,
//     pageSize: number,
//     pageSizes: number[],
//     next: () => void
// }
// //搜索项
// export interface FilterItemProps {

// }
// //搜索面板
// export interface FilterPanelProps {
//     reset: () => void,
//     search: () => void,
// }