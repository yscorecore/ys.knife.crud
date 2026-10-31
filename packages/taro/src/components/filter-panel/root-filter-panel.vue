<script setup lang="ts">
import { computed, provide, shallowRef } from "vue";
import type { PropType } from "vue";
import { FilterInfo, emptyFilter } from "@ys-knife-crud/core";
import type { FilterItemApi } from "@ys-knife-crud/core";
import { FilterPanelKey } from "./context";

/**
 * YsRootFilterPanel（小程序版）—— 无 UI 的筛选条件聚合容器
 *
 * 只做两件事，不渲染任何视觉元素（模板仅 `<slot />` 直出，不额外包节点）：
 * 1. 提供注册通道：provide(FilterPanelKey)，插槽内的自定义搜索项经
 *    useFilterPanelItem 注册进来，卸载时自动注销
 * 2. 聚合查询条件：所有已注册子项的 FilterInfo + extraFilter（外部追加条件，
 *    如面板文本搜索）按 AND 合并；全空时返回 emptyFilter()
 *
 * UI 面板（YsFilterPanel）基于它组装工具栏、文本搜索框、展开/折叠等视图能力，
 * 业务方也可以用它自定义面板外框，而不用重复写注册与聚合逻辑。
 *
 * 用法：
 * <ys-root-filter-panel ref="rootRef" @...>
 *   <ys-date-range-filter-item ... />
 * </ys-root-filter-panel>
 *
 * 通过 ref 读取结果：rootRef.value?.filter / rootRef.value?.reset()
 */
defineOptions({ name: "YsRootFilterPanel" });

const props = defineProps({
  /**
   * 外部追加条件：与插槽内子项的条件按 AND 合并。
   * 传 null / 不传时忽略；每次变化（引用变化）都会触发聚合重算，
   * 因此推荐传入 computed 派生出的 FilterInfo。
   */
  extraFilter: {
    type: Object as PropType<FilterInfo | null>,
    default: null,
  },
});

/** 已注册的自定义搜索项（shallowRef：不深度代理子项组件实例/闭包） */
const items = shallowRef<FilterItemApi[]>([]);

/** 注册子项（provide 给插槽内的自定义搜索项），返回注销函数 */
function registerItem(api: FilterItemApi): () => void {
  items.value = [...items.value, api];
  return () => {
    items.value = items.value.filter((item) => item !== api);
  };
}
provide(FilterPanelKey, registerItem);

/**
 * 最终查询条件：extraFilter + 所有已注册子项，按 AND 聚合；全空时返回 emptyFilter()。
 *
 * 子项的 filter 必须是 getter（读自身的 computed）：getter 在本次 computed 求值过程中
 * 被调用，Vue 会把子项 computed 登记为本节点的依赖，子项内部值变化即可级联重算。
 */
const filterInfo = computed<FilterInfo>(() => {
  const parts: FilterInfo[] = [];
  if (props.extraFilter) parts.push(props.extraFilter);
  for (const item of items.value) {
    const itemFilter = item.filter;
    if (itemFilter) parts.push(itemFilter);
  }
  if (parts.length === 0) return emptyFilter() as unknown as FilterInfo;
  if (parts.length === 1) return parts[0] as FilterInfo;
  return FilterInfo.createAnd(...parts) as unknown as FilterInfo;
});

/** 重置：遍历已注册子项，各自恢复默认值（不负责清空 extraFilter） */
function reset(): void {
  for (const item of items.value) item.reset();
}

defineExpose({
  /** 当前聚合后的查询条件（extraFilter AND 所有子项） */
  filter: filterInfo,
  /** 重置所有已注册子项（extraFilter 由外部自行维护） */
  reset,
});
</script>

<template>
  <slot />
</template>
