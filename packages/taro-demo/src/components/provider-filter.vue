<script setup lang="ts">
import { computed } from "vue";
import { Operator, con, filter } from "@ys-knife-crud/core";
import type { FilterInfo } from "@ys-knife-crud/core";
import { useFilterPanelItem } from "@ys-knife-crud/taro";

/**
 * 供货商下拉条件：演示「外部自定义搜索项组件」如何接入 YsFilterPanel。
 *
 * 关键点：
 * - 组件自己持有选择值（v-model 由使用方绑定）
 * - 通过 useFilterPanelItem 把 filter getter + reset 注册进面板；
 *   面板点「查询」时会把它的 FilterInfo 与文本搜索条件按 AND 聚合，
 *   点「重置」时会调用这里的 reset 恢复默认值。
 */
const props = defineProps<{
  /** 当前选中的下标，0 表示「全部」 */
  modelValue: number;
  /** 下拉选项文案 */
  options: string[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number): void;
}>();

/** 下标 0 视为无筛选条件 */
const filterInfo = computed<FilterInfo | null>(() => {
  if (props.modelValue <= 0) return null;
  const name = props.options[props.modelValue];
  return filter("provider", Operator.Equals, con(name)) as unknown as FilterInfo;
});

useFilterPanelItem({
  get filter() {
    return filterInfo.value;
  },
  reset() {
    emit("update:modelValue", 0);
  },
});

function onChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string | number } }).detail;
  emit("update:modelValue", Number(detail?.value ?? 0));
}
</script>

<template>
  <picker class="cond-picker-host" mode="selector" :range="options" :value="modelValue" @change="onChange">
    <view class="cond-picker">
      <text class="cond-picker__text">{{ options[modelValue] }}</text>
      <text class="cond-picker__arrow">▾</text>
    </view>
  </picker>
</template>

<style lang="scss">
/* picker 宿主占满宽度 */
.cond-picker-host {
  display: block;
  width: 100%;
}

.cond-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  background-color: #f2f3f5;
  border-radius: 8rpx;
}

.cond-picker__text {
  font-size: 28rpx;
  color: #606266;
}

.cond-picker__arrow {
  font-size: 22rpx;
  color: #909399;
}
</style>
