<script setup lang="ts">
import { computed, provide } from "vue";
import type { PropType } from "vue";
import { FilterInfo, emptyFilter } from "@ys-knife-crud/core";
import { FilterPanelKey, useFilterPanel } from "@ys-knife-crud/vue";

/**
 * YsRootFilterPanel —— 无 UI 的筛选条件聚合容器（element-plus 版）
 *
 * 只做两件事，不渲染任何视觉元素（模板仅 `<slot />` 直出，不额外包节点）：
 * 1. 提供注册通道：provide(FilterPanelKey)，插槽内的 YsFilterItem 子组件自动注册，
 *    卸载时自动注销
 * 2. 聚合查询条件：所有已注册子项的 FilterInfo + extraFilter（外部追加条件，
 *    如面板文本搜索）按 AND 合并；全空时返回 emptyFilter()
 *
 * YsFilterPanel 基于它组装按钮、单行折叠、高级查询切换等视图能力；业务方也可以
 * 用它自定义面板外框，而不用重复写注册与聚合逻辑。
 *
 * 通用逻辑来自 @ys-knife-crud/vue 的 useFilterPanel（UI 库无关）。
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

/** 子项注册与基础聚合（UI 库无关的 composable） */
const { filter: itemsFilter, register, reset } = useFilterPanel();
provide(FilterPanelKey, register);

/** 最终查询条件：extraFilter + 子项聚合，按 AND 合并；全空时返回 emptyFilter() */
const filterInfo = computed<FilterInfo>(() => {
  const parts: FilterInfo[] = [];
  if (props.extraFilter) parts.push(props.extraFilter);
  const inner = itemsFilter.value;
  if (inner && !inner.isEmpty()) parts.push(inner);
  if (parts.length === 0) return emptyFilter() as unknown as FilterInfo;
  if (parts.length === 1) return parts[0] as FilterInfo;
  return FilterInfo.createAnd(...parts) as unknown as FilterInfo;
});

/** 重置所有已注册子项（不负责清空 extraFilter） */
function onReset(): void {
  reset();
}

defineExpose({
  /** 当前聚合后的查询条件（extraFilter AND 所有子项） */
  filter: filterInfo,
  /** 重置所有已注册子项（extraFilter 由外部自行维护） */
  reset: onReset,
});
</script>

<template>
  <slot />
</template>
