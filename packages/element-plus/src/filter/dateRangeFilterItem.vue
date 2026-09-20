<script setup lang="ts">
import { type PropType } from "vue";
import type { FilterItemApi } from "@ys.knife.crud/core";
import { useDateRangeFilterItem, type DateRangeFilterItemProps } from "@ys.knife.crud/vue";
import YsFilterItemLayout from "./filterItemLayout.vue";

// 组件名统一带 ys 前缀：模板中以 <ys-date-range-filter-item>（或 <YsDateRangeFilterItem>）使用。
defineOptions({ name: "YsDateRangeFilterItem" });

/**
 * YsDateRangeFilterItem：日期范围单字段查询条件控件。
 *
 * 设计原则：每个具体 FilterItem 组件只负责自己的一种类型，不做 type 工厂分支。
 *
 * - 只负责 daterange 类型，渲染 el-date-picker type="daterange"
 * - op 内部固定为 Operator.Between，不暴露 op prop（日期范围的语义天然是 between）
 * - valueFormat 默认 'YYYY-MM-DD'，v-model 绑定 [start, end] 字符串数组
 * - disabledDate prop 支持外部传入禁用规则，限制可选范围
 *   （例如只能选最近 30 天内、不能选未来日期等；类型为 (date: Date) => boolean）
 * - panel 注册/反注册由 YsFilterItemLayout 接管（传 api prop），本组件不再写 inject 样板
 *
 * 跨包类型解析：api 对象用 as unknown as FilterItemApi 绕过结构性比较（同 textFilterItem）。
 */
const props = defineProps({
  /** 显示标签（渲染在控件左侧） */
  label: { type: String, required: true },
  /** 实体属性路径（FilterInfo.left），如 "createdAt" / "user.registeredAt" */
  propertyPath: { type: String, required: true },
  /** 初始值；[start, end] 字符串数组，缺省为 null */
  defaultValue: {
    type: Array as unknown as PropType<DateRangeFilterItemProps["defaultValue"]>,
    required: false,
  },
  /** 起始日期占位文本 */
  startPlaceholder: { type: String, default: "开始日期" },
  /** 结束日期占位文本 */
  endPlaceholder: { type: String, default: "结束日期" },
  /** el-date-picker value-format，默认 'YYYY-MM-DD'（v-model 绑字符串数组） */
  valueFormat: { type: String, default: "YYYY-MM-DD" },
  /**
   * 禁用日期函数（el-date-picker disabled-date），用于限制可选范围。
   * 接收 Date 返回 boolean，true 表示禁用。
   * 例如只能选最近 30 天内：(d) => d < new Date(Date.now() - 30*86400*1000) || d > new Date()
   */
  disabledDate: {
    type: Function as PropType<(date: Date) => boolean>,
    required: false,
  },
});

const { value, filter: filterInfo, reset } = useDateRangeFilterItem(props);

/* api 透传给 YsFilterItemLayout（:api="api"），由 layout 在 onMounted 注册到 panel。
 * value ref 只在模板内用于 v-model，不暴露到 api（panel 与 demo 均不消费 api.value）。 */
const api = {
  get filter() {
    return filterInfo.value;
  },
  reset,
} as unknown as FilterItemApi;

defineExpose(api);
</script>

<template>
  <YsFilterItemLayout :label="label" :api="api" :min-width="240">
    <el-date-picker
      v-model="value"
      type="daterange"
      :start-placeholder="startPlaceholder"
      :end-placeholder="endPlaceholder"
      :value-format="valueFormat"
      :disabled-date="disabledDate"
      clearable
    />
  </YsFilterItemLayout>
</template>

<style scoped></style>
