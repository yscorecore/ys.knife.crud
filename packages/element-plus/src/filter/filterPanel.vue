<script setup lang="ts">
import { provide } from "vue";
import type { FilterInfo } from "@ys.knife.crud/core";
import { FilterPanelKey, useFilterPanel } from "@ys.knife.crud/vue";

// 组件名统一带 ys 前缀：模板中以 <ys-filter-panel>（或 <YsFilterPanel>）使用，
// 同时保证全局注册（app.component）与 devtools 中名称稳定。
defineOptions({ name: "YsFilterPanel" });

/**
 * YsFilterPanel：查询面板。聚合多个 YsFilterItem 子组件的 FilterInfo 为一个 AND 组合：
 *
 * - 默认插槽放多个 <ys-filter-item>，子组件经 provide/inject 自动注册到本面板
 * - 内置「查询」「重置」按钮（showSearch/showReset 开关，默认 true）：
 *   - 查询：emit('search', FilterInfo)，filter 是所有非空 item.filter 的 createAnd 聚合
 *   - 重置：清空全部 item 值并 emit('reset')
 * - 面板级监听 keydown.enter：任意子控件（el-input/el-select/el-date-picker）按回车
 *   冒泡到根 div 触发 onSearch，等价于点击「查询」按钮
 *   （el-select/el-date-picker 内部用回车选中项/确认日期后冒泡，也触发查询——选完即查）
 * - showSearch=false 时不渲染内置查询按钮，外部经 ref 取 panelApi.filter 自行触发
 *
 * 通用逻辑（items Map、filter computed、register/unregister）下沉到
 * @ys.knife.crud/vue 的 useFilterPanel；本组件只负责视图编排与事件分发。
 */
const props = defineProps({
  /** 是否渲染内置「查询」按钮，默认 true */
  showSearch: { type: Boolean, default: true },
  /** 是否渲染内置「重置」按钮，默认 true */
  showReset: { type: Boolean, default: true },
  /** 查询按钮文案，默认 "查询" */
  searchButtonText: { type: String, default: "查询" },
  /** 重置按钮文案，默认 "重置" */
  resetButtonText: { type: String, default: "重置" },
});

const emit = defineEmits<{
  /** 查询按钮点击：携带聚合后的 FilterInfo（全部为空时为 emptyFilter()） */
  (e: "search", filter: FilterInfo): void;
  /** 重置按钮点击：所有 item 值已清空 */
  (e: "reset"): void;
}>();

const { filter, register, reset } = useFilterPanel();
provide(FilterPanelKey, register);

function onSearch(): void {
  emit("search", filter.value);
}
function onReset(): void {
  reset();
  emit("reset");
}

/* ---------------- 暴露 API ----------------
 * 对外暴露 FilterPanelApi：filter（聚合 FilterInfo）与 reset。
 * filter 是 ComputedRef<FilterInfo>，父组件经模板 ref 访问 expose 时自动解包为
 * FilterInfo 值；为兼容 ComputedRef 与解包后值的双重形态，不使用 satisfies 强校验
 * （同 columnConfigDialog.vue 的 expose 模式）。 */
defineExpose({
  filter,
  reset,
});
</script>

<template>
  <div class="yk-filter-panel" @keydown.enter="onSearch">
    <slot />
    <div v-if="showSearch || showReset" class="yk-filter-panel__actions">
      <el-button v-if="showSearch" type="primary" @click="onSearch">{{ searchButtonText }}</el-button>
      <el-button v-if="showReset" @click="onReset">{{ resetButtonText }}</el-button>
    </div>
  </div>
</template>

<style scoped>
.yk-filter-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: flex-end;
  padding: 12px 16px;
  background: var(--el-bg-color, #fff);
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 4px;
}

.yk-filter-panel__actions {
  display: flex;
  gap: 8px;
}
</style>
