<script setup lang="ts">
import { type PropType } from "vue";
import type { FilterItemApi, Operator } from "@ys-knife-crud/core";
import { useDateFilterItem, type DateFilterItemProps } from "./use-filter-item";
import YsFilterItemLayout from "./filter-item-layout.vue";

defineOptions({ name: "YsDateFilterItem" });

/**
 * YsDateFilterItem（小程序版）—— 日期单字段查询条件
 *
 * 对齐 element-plus 的 YsDateFilterItem（el-date-picker type="date"），
 * 逻辑复用 @ys-knife-crud/vue 的 useDateFilterItem，视图换成小程序原生
 * `<picker mode="date">`，v-model 同样是 'YYYY-MM-DD' 字符串。
 *
 * - op 由声明方指定（常为 Operator.Equals，也可 GreaterThan / LessThan 等）
 * - 值为空串时 filter 返回 null，面板聚合时跳过
 * - start / end 限制可选范围（透传 picker 的 start / end，格式 YYYY-MM-DD）
 * - 小程序 picker 无法「取消已选」，所以值非空时额外渲染一个清除按钮
 * - 消费方需在页面模板占位 `<picker v-if="false" />`，否则 Taro 不会登记该原生组件
 */
const props = defineProps({
  /** 控件上方的标签 */
  label: { type: String, default: "" },
  /** 运算符（字符串 enum 跨包用 String as PropType<Operator>） */
  op: { type: String as PropType<Operator>, required: true },
  /** 实体属性路径（FilterInfo.left），如 "birthDate" / "user.createdAt" */
  propertyPath: { type: String, required: true },
  /** 初始值；YYYY-MM-DD 格式字符串 */
  defaultValue: {
    type: String as PropType<DateFilterItemProps["defaultValue"]>,
    default: undefined,
  },
  /** 占位文本 */
  placeholder: { type: String, default: "选择日期" },
  /** 可选范围下限（YYYY-MM-DD），空串表示不限制 */
  start: { type: String, default: "" },
  /** 可选范围上限（YYYY-MM-DD），空串表示不限制 */
  end: { type: String, default: "" },
});

const { value, filter: filterInfo, reset } = useDateFilterItem(props);

/** picker 选中日期：event.detail.value 为 'YYYY-MM-DD' */
function onChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string } }).detail;
  value.value = detail?.value ?? "";
}

function onClear(): void {
  value.value = "";
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
      :value="value"
      :start="start"
      :end="end"
      @change="onChange"
    >
      <view class="yk-filter-item__picker">
        <text
          class="yk-filter-item__picker-text"
          :class="{ 'yk-filter-item__picker-text--placeholder': !value }"
        >{{ value || placeholder }}</text>
      </view>
    </picker>

    <view v-if="value" class="yk-filter-item__clear" @tap.stop="onClear">
      <text>✕</text>
    </view>
  </YsFilterItemLayout>
</template>
