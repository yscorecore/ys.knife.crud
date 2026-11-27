import type { InjectionKey, Ref } from "vue";
import type { AdvancedConditionGroup, Column, EnumOption } from "@ys-knife-crud/core";
import type { useAdvancedFilter } from "@ys-knife-crud/vue";

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
 * 已保存的查询预设：只保存条件树快照（group）与名称/描述。
 * FilterInfo 不参与持久化——它是带原型方法的类实例，JSON 往返后会丢失
 * toString / isEmpty；因此点击标签时按 group 与当前 advancedColumns 现算，
 * 后端只需存 group + name + description。
 */
export interface SavedQuery {
  id: string;
  name: string;
  description: string;
  group: AdvancedConditionGroup;
}
