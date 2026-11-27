<script setup lang="ts">
import { type PropType } from "vue";
import type { FilterItemApi, Operator } from "@ys-knife-crud/core";
import { useMultiTextFilterItem, type MultiTextFilterItemProps } from "@ys-knife-crud/vue";
import YsFilterItemLayout from "./filterItemLayout.vue";

// 组件名统一带 ys 前缀：模板中以 <ys-multi-text-filter-item>（或 <YsMultiTextFilterItem>）使用。
defineOptions({ name: "YsMultiTextFilterItem" });

/**
 * YsMultiTextFilterItem：一个输入框对多个字段做「任一命中」的模糊查询。
 *
 * 场景：「请输入名称或代码」——用户输入片段，同时对 name / code 等字段做 contains，
 * 最终生成 `name contains x OR code contains x`（FilterInfo.createOr）。
 *
 * - propertyPaths 必填，数组；任一命中即满足（OR 语义）
 * - op 可选，缺省 Operator.Contains，可换成 StartsWith / EndsWith / Equals 等
 * - 值为空时 filterInfo 返回 null（无查询条件），由 panel 聚合时跳过
 * - panel 注册/反注册由 YsFilterItemLayout 接管（传 api prop）
 *
 * 跨包类型解析注意（同 textFilterItem.vue）：FilterItemApi.filter 的 FilterInfo
 * 跨包会剥离 protected 字段，这里用 `as unknown as FilterItemApi` 绕过结构性比较。
 */
const props = defineProps({
  /** 显示标签（渲染在控件左侧/上方） */
  label: { type: String, required: true },
  /** 参与模糊查询的字段路径列表，任一命中即满足，如 ["name", "code"] */
  propertyPaths: { type: Array as PropType<string[]>, required: true },
  /**
   * 运算符；缺省 Operator.Contains。
   * 字符串 enum 跨包用 String as PropType<Operator>（运行时为 string）。
   */
  op: { type: String as PropType<Operator>, required: false },
  /** 初始值；缺省为空字符串 */
  defaultValue: {
    type: String as PropType<MultiTextFilterItemProps["defaultValue"]>,
    required: false,
  },
  /** 占位文本 */
  placeholder: { type: String, required: false },
});

const { value, filter: filterInfo, reset } = useMultiTextFilterItem(props);

/* 组装稳定 API 对象：filter 是 getter，读最新 computed.value，
 * 使 panel 端的 filter computed 能 track 到本 item 的 value 变化。 */
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
    <el-input v-model="value" :placeholder="placeholder" clearable />
  </YsFilterItemLayout>
</template>

<style scoped></style>
