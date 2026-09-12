import type { MetaFunc } from "./meta"
import type { PageFunc } from "./page"
import type { RowActionsFunc } from "./action"

export interface TableProps {
    metaFun: MetaFunc
    dataFun: PageFunc<unknown>
    /** 可选。存在时，表格在每一行最后一列显示可执行的操作 */
    rowActionsFunc?: RowActionsFunc<unknown>
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