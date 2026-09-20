<script setup lang="ts">
import { type PropType } from "vue";
import type { FilterItemApi, Operator } from "@ys.knife.crud/core";
import { useDateFilterItem, type DateFilterItemProps } from "@ys.knife.crud/vue";
import YsFilterItemLayout from "./filterItemLayout.vue";

// 组件名统一带 ys 前缀：模板中以 <ys-date-filter-item>（或 <YsDateFilterItem>）使用。
defineOptions({ name: "YsDateFilterItem" });

/**
 * YsDateFilterItem：日期单字段查询条件控件。
 *
 * 设计原则：每个具体 FilterItem 组件只负责自己的一种类型，不做 type 工厂分支。
 *
 * - 只负责 date 类型，渲染 el-date-picker type="date"
 * - op 由声明方指定（常为 Operator.Equals，也可 GreaterThan/LessThan 等）
 * - valueFormat 默认 'YYYY-MM-DD'，v-model 绑定字符串（composable 不处理 Date 对象）
 * - panel 注册/反注册由 YsFilterItemLayout 接管（传 api prop），本组件不再写 inject 样板
 *
 * 跨包类型解析：api 对象用 as unknown as FilterItemApi 绕过结构性比较（同 textFilterItem）。
 */
const props = defineProps({
  /** 显示标签（渲染在控件左侧） */
  label: { type: String, required: true },
  /**
   * 运算符；字符串 enum 跨包用 String as PropType<Operator>（运行时为 string）。
   * 常传 Operator.Equals，也可传 GreaterThan / LessThan / GreaterThanOrEqual /
   * LessThanOrEqual 等对日期有意义的 op
   */
  op: { type: String as PropType<Operator>, required: true },
  /** 实体属性路径（FilterInfo.left），如 "birthDate" / "user.createdAt" */
  propertyPath: { type: String, required: true },
  /** 初始值；YYYY-MM-DD 格式字符串，缺省为空 */
  defaultValue: {
    type: String as PropType<DateFilterItemProps["defaultValue"]>,
    required: false,
  },
  /** 占位文本 */
  placeholder: { type: String, required: false },
  /** el-date-picker value-format，默认 'YYYY-MM-DD'（v-model 绑字符串） */
  valueFormat: { type: String, default: "YYYY-MM-DD" },
});

const { value, filter: filterInfo, reset } = useDateFilterItem(props);

/* api 透传给 YsFilterItemLayout（:api="api"），由 layout 在 onMounted 注册到 panel。 */
const api = {
  get filter() {
    return filterInfo.value;
  },
  get value() {
    return value.value;
  },
  reset,
} as unknown as FilterItemApi;

defineExpose(api);
</script>

<template>
  <YsFilterItemLayout :label="label" :api="api">
    <el-date-picker
      v-model="value"
      type="date"
      :placeholder="placeholder"
      :value-format="valueFormat"
      clearable
    />
  </YsFilterItemLayout>
</template>

<style scoped></style>
