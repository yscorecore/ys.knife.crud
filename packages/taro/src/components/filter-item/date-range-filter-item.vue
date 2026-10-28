<script setup lang="ts">
import { type PropType } from "vue";
import type { FilterItemApi } from "@ys-knife-crud/core";
import {
  useDateRangeFilterItem,
  type DateRangeFilterItemProps,
  type DateRangeValue,
} from "./use-filter-item";
import YsFilterItemLayout from "./filter-item-layout.vue";

defineOptions({ name: "YsDateRangeFilterItem" });

/**
 * YsDateRangeFilterItem（小程序版）—— 日期区间单字段查询条件
 *
 * 对齐 element-plus 的 YsDateRangeFilterItem（el-date-picker type="daterange"），
 * 逻辑复用 @ys-knife-crud/vue 的 useDateRangeFilterItem。
 *
 * - op 内部固定为 Operator.Between，不暴露 op prop（区间语义天然是 between）
 * - v-model 内部值是 [start, end] 字符串数组（YYYY-MM-DD）
 * - 小程序没有原生区间选择器，用两个 `<picker mode="date">` 拼成「开始 至 结束」
 * - 起止任一为空时 filter 返回 null；只有两端都选满才参与聚合
 * - start / end 限制可选范围（格式 YYYY-MM-DD）
 * - 消费方需在页面模板占位 `<picker v-if="false" />`，否则 Taro 不会登记该原生组件
 */
const props = defineProps({
  /** 控件上方的标签 */
  label: { type: String, default: "" },
  /** 实体属性路径（FilterInfo.left），如 "createdAt" / "user.registeredAt" */
  propertyPath: { type: String, required: true },
  /** 初始值；[start, end] 字符串数组 */
  defaultValue: {
    type: Array as unknown as PropType<DateRangeFilterItemProps["defaultValue"]>,
    default: undefined,
  },
  /** 起始日期占位文本 */
  startPlaceholder: { type: String, default: "开始日期" },
  /** 结束日期占位文本 */
  endPlaceholder: { type: String, default: "结束日期" },
  /** 可选范围下限（YYYY-MM-DD），空串表示不限制 */
  start: { type: String, default: "" },
  /** 可选范围上限（YYYY-MM-DD），空串表示不限制 */
  end: { type: String, default: "" },
});

const { value, filter: filterInfo, reset } = useDateRangeFilterItem(props);

/** 写回某一端；两端都为空时整体置 null（保持「未选」语义） */
function updateRange(index: 0 | 1, v: string): void {
  const current = value.value ?? ["", ""];
  const next: [string, string] = [current[0], current[1]];
  next[index] = v;
  value.value = !next[0] && !next[1] ? null : (next as DateRangeValue);
}

function onStartChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string } }).detail;
  updateRange(0, detail?.value ?? "");
}

function onEndChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string } }).detail;
  updateRange(1, detail?.value ?? "");
}

function onClear(): void {
  value.value = null;
}

/* filter 用 getter 读 computed.value，使面板端的聚合 computed 能 track 到值变化 */
const api = {
  get filter() {
    return filterInfo.value;
  },
  reset,
} as unknown as FilterItemApi;

defineExpose(api);
</script>

<template>
  <YsFilterItemLayout :label="label" :api="api">
    <picker
      class="yk-filter-item__picker-trigger"
      mode="date"
      :value="value?.[0] ?? ''"
      :start="start"
      :end="end"
      @change="onStartChange"
    >
      <view class="yk-filter-item__picker">
        <text
          class="yk-filter-item__picker-text"
          :class="{ 'yk-filter-item__picker-text--placeholder': !value?.[0] }"
        >{{ value?.[0] || startPlaceholder }}</text>
      </view>
    </picker>

    <text class="yk-filter-item__sep">至</text>

    <picker
      class="yk-filter-item__picker-trigger"
      mode="date"
      :value="value?.[1] ?? ''"
      :start="start"
      :end="end"
      @change="onEndChange"
    >
      <view class="yk-filter-item__picker">
        <text
          class="yk-filter-item__picker-text"
          :class="{ 'yk-filter-item__picker-text--placeholder': !value?.[1] }"
        >{{ value?.[1] || endPlaceholder }}</text>
      </view>
    </picker>

    <view v-if="value" class="yk-filter-item__clear" @tap.stop="onClear">
      <text>✕</text>
    </view>
  </YsFilterItemLayout>
</template>
