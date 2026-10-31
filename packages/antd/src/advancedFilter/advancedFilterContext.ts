import { createContext } from "react";
import type {
  AdvancedConditionGroup,
  Column,
  EnumOption,
} from "@ys-knife-crud/core";
import type { UseAdvancedFilterResult } from "@ys-knife-crud/react";
import "./advancedFilterContext.css";

/**
 * FilterInfo 公共接口的子集类型。跨包 dts 时 FilterInfo 的 protected 字段会被剥离，
 * 导致结构比较失败。SavedQuery.filterInfo 只需要 toString / isEmpty。
 */
export interface FilterInfoSnapshot {
  toString(): string;
  isEmpty(): boolean;
}

/**
 * YsAdvancedFilterPanel 顶层 provide 的共享上下文。
 * React 版用 createContext 替代 Vue 的 provide/inject，递归子组件用 useContext 取用。
 *
 * - columns：可查询字段列表（与 panel props.columns 一致）
 * - optionsMap / loadingMap：enum 字段的选项缓存与加载状态
 * - api：useAdvancedFilter 返回对象，含 rootGroup / 增删改 / 聚合 filter
 * - updateValue：受 React hook 未暴露值 setter 的限制，由面板提供的叶子值更新入口
 */
export interface AdvancedFilterContext {
  readonly columns: readonly Column[];
  readonly optionsMap: Record<string, EnumOption[]>;
  readonly loadingMap: Record<string, boolean>;
  readonly api: UseAdvancedFilterResult;
  /** 更新某条叶子条件的值（内部会触发条件树与 filter 重算） */
  updateValue(id: string, value: unknown): void;
}

export const ADVANCED_FILTER_CONTEXT = createContext<AdvancedFilterContext | null>(null);

/**
 * 已保存的查询预设：深拷贝的条件树快照 + 用户命名的名称/描述。
 */
export interface SavedQuery {
  id: string;
  name: string;
  description: string;
  group: AdvancedConditionGroup;
  /** 保存时的聚合 FilterInfo 快照，供简单模式直接 onSearch 用 */
  filterInfo: FilterInfoSnapshot;
}
