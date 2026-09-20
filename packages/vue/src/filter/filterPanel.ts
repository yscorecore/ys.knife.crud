import { computed, ref, type InjectionKey } from "vue";
import { FilterInfo, emptyFilter } from "ys.knife.query.js";
import type { FilterItemApi } from "@ys.knife.crud/core";

/**
 * 搜索面板（FilterPanel）聚合子 FilterItem 的 FilterInfo 的逻辑：UI 库无关。
 *
 * 通过 provide/inject 收集子组件：
 * - FilterPanel provide 一个 register(api) 函数，子 FilterItem 在 onMounted 时调用
 *   把自己的 FilterItemApi 注册进来，返回反注册函数；onBeforeUnmount 调反注册。
 * - 内部维护响应式 Map<string, FilterItemApi>，增删后整体替换触发 track
 *   （同 useSelection 的 selectedMap 范式）。
 * - filter computed 迭代 Map，对每个 api.filter 调 .isEmpty() 过滤空条件，
 *   全空时返回 emptyFilter()，否则用 FilterInfo.createAnd(...) 聚合。
 *
 * 响应式链路：panel filter computed 读 api.filter（getter）→ 读 item 的 filterInfo.value
 * → 读 value ref → 整条链被 track。item 值变化时 panel filter 自动重算。
 */

/** FilterItem 向 Panel 注册自己用的函数签名；返回反注册函数 */
export type FilterItemRegisterFn = (api: FilterItemApi) => () => void;

/** provide/inject token：Panel provide 一个 register 函数，Item inject 它 */
export const FilterPanelKey: InjectionKey<FilterItemRegisterFn> = Symbol("YsFilterPanel");

export function useFilterPanel() {
  /** 已注册的子 item；响应式 Map，增删后整体替换触发 track */
  const items = ref(new Map<string, FilterItemApi>());
  let counter = 0;

  const register: FilterItemRegisterFn = (api) => {
    const key = String(++counter);
    items.value.set(key, api);
    items.value = new Map(items.value);
    return () => {
      items.value.delete(key);
      items.value = new Map(items.value);
    };
  };

  /** 聚合 filter：先过滤 null（item 值为空时返回 null 表示「无查询条件」）再 createAnd；
   *  全部为 null 时返回 emptyFilter()。
   *  注：跨包 dts 解析时 FilterInfo 的 protected 字段会被剥离，导致 emptyFilter() 返回的
   *  FilterInfoOf 子类与 FilterInfo 结构比较失败（"缺 protected 字段"）。运行时两者兼容，
   *  此处用 as unknown as FilterInfo 显式绕过 dts 的结构性比较。 */
  const filter = computed<FilterInfo>(() => {
    const nonNull = [...items.value.values()]
      .map((a) => a.filter)
      .filter((f): f is FilterInfo => f !== null);
    if (nonNull.length === 0) return emptyFilter() as unknown as FilterInfo;
    return FilterInfo.createAnd(...(nonNull as unknown as FilterInfo[])) as unknown as FilterInfo;
  });

  function reset(): void {
    for (const api of items.value.values()) api.reset();
  }

  // 字段在前，函数在后（与 useCustomConfig 返回结构一致）
  return { filter, register, reset };
}
