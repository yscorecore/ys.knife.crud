import { createContext } from "react";
import type {
  AdvancedConditionGroup,
  Column,
  EnumOption,
} from "@ys-knife-crud/core";
import type { UseAdvancedFilterResult } from "@ys-knife-crud/react";
import "./advancedFilterContext.css";

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
