<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, type PropType } from "vue";
import type { FilterItemApi } from "@ys.knife.crud/core";
import { FilterPanelKey } from "@ys.knife.crud/vue";

/**
 * YsFilterItemLayout：FilterItem 的统一外壳组件。
 *
 * 把各 FilterItem 共有的「label + 控件容器 + 样式 + panel 注册/反注册逻辑」抽出，
 * 各具体 FilterItem（text/date/dateRange/enum...）只需：
 *   1. 调自己的 composable 拿到 { value, filter, reset }
 *   2. 组装成稳定 api 对象（filter/value 用 getter 读 computed.value）
 *   3. 把 api 与 label 传给本组件，控件通过默认插槽注入
 * 不用再重复写 inject(FilterPanelKey) + onMounted(register) + onBeforeUnmount(unregister) 样板。
 *
 * - label 必填，渲染在控件上方的小字号次级颜色文本
 * - minWidth 默认 200px；daterange 等较宽控件可传 240
 * - api 必填，layout 在 onMounted 时将其注册到 panel（若处于 panel 内），
 *   onBeforeUnmount 调反注册；panel 端 filter computed 自动响应子 item 值变化
 * - 默认插槽承载具体控件（el-input / el-date-picker / el-select ...）
 *
 * 使用方在 <ys-filter-panel> 插槽里写：
 * <ys-filter-item-layout :label="..." :api="...">
 *   <el-input v-model="..." />
 * </ys-filter-item-layout>
 *
 * 内部 FilterItem 组件（YsTextFilterItem 等）也使用本组件保证样式 + 注册逻辑统一。
 *
 * 跨包类型解析：FilterItemApi.filter 字段类型 FilterInfo 在 dts 跨包比较时
 * 会被剥离 protected 字段；这里 api prop 用 Object as PropType<FilterItemApi>
 * 只用于类型注解，运行时不访问 api 字段（透传给 register），无结构性比较问题。
 */
defineOptions({ name: "YsFilterItemLayout" });

const props = defineProps({
  /** 显示标签（渲染在控件上方，小字号次级颜色） */
  label: { type: String, required: true },
  /** 最小宽度（px），默认 200；daterange 等较宽控件可传 240 */
  minWidth: { type: Number, default: 200 },
  /**
   * FilterItem 的 API 对象；layout 在 onMounted 时将其注册到 panel（若处于 panel 内），
   * onBeforeUnmount 调反注册。这样各 FilterItem 不用重复写 inject + onMounted + onBeforeUnmount 样板。
   */
  api: { type: Object as PropType<FilterItemApi>, required: true },
});

/* inject 拿 panel 的 register；未在 panel 内使用时静默退化（register=null 不注册）。
 * 子组件（Layout）的 onMounted 先于父组件（FilterItem）的 onMounted 执行，
 * 因此 register 发生在 FilterItem 自己的 onMounted 之前，order 安全。 */
const register = inject(FilterPanelKey, null);
let unregister: (() => void) | null = null;

onMounted(() => {
  if (register) unregister = register(props.api);
});

onBeforeUnmount(() => {
  unregister?.();
});
</script>

<template>
  <div class="yk-filter-item" :style="{ minWidth: minWidth + 'px' }">
    <label class="yk-filter-item__label">{{ label }}</label>
    <div class="yk-filter-item__control">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.yk-filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 0 0 auto;
}

.yk-filter-item__label {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
  line-height: 1.4;
}

.yk-filter-item__control {
  display: flex;
  align-items: center;
}
</style>
