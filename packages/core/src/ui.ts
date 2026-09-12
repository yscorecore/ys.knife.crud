import type { MetaFunc } from "./meta"

export interface TableProps {
    metaFun: MetaFunc
}

export interface PaginationProps {
    pageIndex: number,
    pageSize: number,
    pageSizes: number[],
    next: () => void
}
//搜索项
export interface FilterItemProps {

}
//搜索面板
export interface FilterPanelProps {
    reset: () => void,
    search: () => void,
}