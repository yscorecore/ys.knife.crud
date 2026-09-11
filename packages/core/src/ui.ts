
export interface TableProps {
    modelValue: string   // 必需
    disabled: boolean    // 必需
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