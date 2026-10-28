import { inject, onBeforeUnmount, onMounted } from "vue";
import type { InjectionKey } from "vue";
import type { FilterItemApi } from "@ys-knife-crud/core";

/**
 * YsFilterPanel 的子项注册契约（小程序版）。
 *
 * 外部自定义搜索项组件（放在面板默认插槽里）通过 `useFilterPanelItem(api)` 把自己的
 * FilterInfo 注册进面板，面板点击「查询」时按 AND 聚合所有非空条件，最终构造出
 * 一个 FilterInfo 对象派发给 `search` 事件——与 @ys-knife-crud/element-plus 的
 * FilterPanelKey + YsFilterItem 注册机制保持一致的语义。
 */

/** 注册函数：面板 provide，子项调用后返回注销函数 */
export type RegisterFilterItem = (api: FilterItemApi) => () => void;

/** 面板向子项暴露的注入键 */
export const FilterPanelKey: InjectionKey<RegisterFilterItem> = Symbol("YsFilterPanel");

/**
 * 在自定义搜索项组件中调用：把自身的 FilterInfo 注册到最近的 YsFilterPanel。
 *
 * @param api 需传入 `filter` 的 getter（读 computed，保证面板聚合能追踪变化）和 `reset`
 *
 * @example
 * const filterInfo = computed(() => empty ? null : filter("provider", Operator.Equals, con(name)));
 * useFilterPanelItem({
 *   get filter() { return filterInfo.value; },
 *   reset() { emit("update:modelValue", 0); },
 * });
 */
export function useFilterPanelItem(api: FilterItemApi): void {
  const register = inject(FilterPanelKey, null);
  if (!register) return;
  let unregister: (() => void) | null = null;
  onMounted(() => {
    unregister = register(api);
  });
  onBeforeUnmount(() => {
    unregister?.();
    unregister = null;
  });
}
