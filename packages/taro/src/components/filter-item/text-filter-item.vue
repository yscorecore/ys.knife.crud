<script setup lang="ts">
import { type PropType } from "vue";
import type { FilterItemApi, Operator } from "@ys-knife-crud/core";
import { useTextFilterItem, type TextFilterItemProps } from "./use-filter-item";
import YsFilterItemLayout from "./filter-item-layout.vue";

defineOptions({ name: "YsTextFilterItem" });

/**
 * YsTextFilterItem（小程序版）—— 文本单字段查询条件
 *
 * 对齐 element-plus 的 YsTextFilterItem，逻辑完全复用 @ys-knife-crud/vue 的
 * useTextFilterItem（UI 库无关），本文件只负责小程序视图：input + 外壳。
 *
 * - 只负责 string 类型，渲染小程序原生 input
 * - op 由声明方指定（常为 Operator.Contains，也可 Equals / StartsWith / EndsWith）
 * - 值为空（null/空串/纯空白）时 filter 返回 null，面板聚合时跳过
 * - 注册/反注册由 YsFilterItemLayout 接管
 *
 * 同 filter-panel：input 外面必须包一层 view，直接做 flex 子项时宽度会塌陷。
 * 消费方需在页面模板占位 `<input v-if="false" />`，否则 Taro 不会登记该原生组件。
 */
const props = defineProps({
  /** 控件上方的标签 */
  label: { type: String, default: "" },
  /** 运算符（字符串 enum 跨包用 String as PropType<Operator>） */
  op: { type: String as PropType<Operator>, required: true },
  /** 实体属性路径（FilterInfo.left），如 "name" / "user.name" */
  propertyPath: { type: String, required: true },
  /** 初始值；缺省为空字符串 */
  defaultValue: {
    type: String as PropType<TextFilterItemProps["defaultValue"]>,
    default: undefined,
  },
  /** 占位文本 */
  placeholder: { type: String, default: "请输入" },
});

const { value, filter: filterInfo, reset } = useTextFilterItem(props);

/** 小程序 input 的值在 event.detail.value（DOM 类型下 detail 非该结构，运行时按小程序取） */
function onInput(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string } }).detail;
  value.value = detail?.value ?? "";
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
    <view class="yk-filter-item__field">
      <input
        class="yk-filter-item__input"
        :value="value"
        :placeholder="placeholder"
        placeholder-class="yk-filter-item__placeholder"
        @input="onInput"
      />
    </view>
  </YsFilterItemLayout>
</template>
