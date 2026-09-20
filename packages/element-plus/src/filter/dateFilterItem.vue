<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, type PropType } from "vue";
import type { FilterItemApi, Operator } from "@ys.knife.crud/core";
import { FilterPanelKey, useDateFilterItem, type DateFilterItemProps } from "@ys.knife.crud/vue";

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
 * - onMounted 时 inject panel 的 register 函数注册自己的 FilterItemApi 到面板；
 *   onBeforeUnmount 调反注册。面板端 filter computed 自动响应子 item 值变化
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

const api = {
  get filter() {
    return filterInfo.value;
  },
  get value() {
    return value.value;
  },
  reset,
} as unknown as FilterItemApi;

const register = inject(FilterPanelKey, null);
let unregister: (() => void) | null = null;
onMounted(() => {
  if (register) unregister = register(api);
});
onBeforeUnmount(() => {
  unregister?.();
});

defineExpose(api);
</script>

<template>
  <div class="yk-filter-item">
    <label class="yk-filter-item__label">{{ label }}</label>
    <div class="yk-filter-item__control">
      <el-date-picker
        v-model="value"
        type="date"
        :placeholder="placeholder"
        :value-format="valueFormat"
        clearable
      />
    </div>
  </div>
</template>

<style scoped>
.yk-filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 0 0 auto;
  min-width: 200px;
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
