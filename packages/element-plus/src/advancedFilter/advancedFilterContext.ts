import type { InjectionKey, Ref } from "vue";
import type { AdvancedConditionGroup, Column, EnumOption, FilterInfo } from "@ys.knife.crud/core";
import type { useAdvancedFilter } from "@ys.knife.crud/vue";

/**
 * FilterInfo 公共接口的子集类型。跨包 dts 时 FilterInfo 的 protected 字段会被剥离，
 * 导致结构比较失败。SavedQuery.filterInfo 只需要 toString / isEmpty（供简单模式
 * emit('search', sq.filterInfo) 时传给外部），用此类型避免类型不兼容。
 */
export interface FilterInfoSnapshot {
  toString(): string;
  isEmpty(): boolean;
}

/**
 * YsAdvancedFilterPanel 顶层 provide 的共享上下文：
 * 递归子组件 YsAdvancedConditionGroup 用 inject 取用，
 * 避免每层显式透传多个 prop。
 *
 * - columns：可查询字段列表（与 panel props.columns 一致）
 * - optionsMap / loadingMap：enum 字段的选项缓存与加载状态
 * - api：useAdvancedFilter 返回对象，含 rootGroup/增删改/聚合 filter
 *
 * 日期字段的 value-format 由 Column.displayFormat 提供（递归子组件按
 * 当前行选中的字段查找 column 取用），无需在 panel 层统一传入。
 */
export interface AdvancedFilterContext {
  readonly columns: Column[];
  readonly optionsMap: Ref<Record<string, EnumOption[]>>;
  readonly loadingMap: Ref<Record<string, boolean>>;
  readonly api: ReturnType<typeof useAdvancedFilter>;
}

export const ADVANCED_FILTER_KEY: InjectionKey<AdvancedFilterContext> =
  Symbol("YsAdvancedFilter");

/**
 * 已保存的查询预设：深拷贝的条件树快照 + 用户命名的名称/描述。
 * 由 YsAdvancedFilterPanel 内部管理，经 expose 暴露给外部（如 YsFilterPanel
 * 在高级模式下渲染标签列表）。
 */
export interface SavedQuery {
  id: string;
  name: string;
  description: string;
  group: AdvancedConditionGroup;
  /** 保存时的聚合 FilterInfo 快照，供简单模式直接 emit('search') 用 */
  filterInfo: FilterInfoSnapshot;
}
