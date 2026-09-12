import type { MetaFunc } from "./meta"
import type { PageFunc } from "./page"

export interface TableProps {
    metaFun: MetaFunc
    dataFun: PageFunc<unknown>
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