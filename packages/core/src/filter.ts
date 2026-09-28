import { type FilterInfo } from "ys.knife.query.js"

/**
 * 单字段查询条件的统一 expose 契约。各具体类型 FilterItem 组件
 * （Text/Date/DateRange/Number/Bool...）props 字段各不相同（如 daterange 不需要 op、
 * date 需要 valueFormat、number 可能需要 min/max），因此 core 不再定义通用 FilterItemProps；
 * 每个 composable 各自定义并导出自己的 props 类型，element-plus 组件从 vue 包 import 它。
 *
 * 唯一约束：所有 FilterItem 组件都 expose 这个 FilterItemApi，使 panel 端能统一聚合。
 */
export interface FilterItemApi {
    /**
     * 当前值构造出的 FilterInfo；值为空时返回 null（表示「无查询条件」），
     * panel 端聚合时直接跳过 null，不参与 createAnd。
     */
    readonly filter: FilterInfo | null;
    reset(): void;
}
export interface FilterPanelProps {
    /** 是否渲染内置「搜索」按钮，默认 true。false 时外部自实现按钮经 ref 取 filter 触发 */
    readonly showSearch?: boolean;
    /** 是否渲染内置「重置」按钮，默认 true */
    readonly showReset?: boolean;
    /** 搜索按钮文案，默认 "搜索" */
    readonly searchButtonText?: string;
    /** 重置按钮文案，默认 "重置" */
    readonly resetButtonText?: string;
}
export interface FilterPanelApi {
    /** 聚合所有已注册 FilterItem 的 FilterInfo；全部为空时返回 emptyFilter() */
    readonly filter: FilterInfo;
    reset(): void;
}
