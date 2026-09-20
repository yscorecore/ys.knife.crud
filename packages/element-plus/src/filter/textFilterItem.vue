<script setup lang="ts">
import { type PropType } from "vue";
import type { FilterItemApi, Operator } from "@ys.knife.crud/core";
import { useTextFilterItem, type TextFilterItemProps } from "@ys.knife.crud/vue";
import YsFilterItemLayout from "./filterItemLayout.vue";

// 组件名统一带 ys 前缀：模板中以 <ys-text-filter-item>（或 <YsTextFilterItem>）使用，
// 同时保证全局注册（app.component）与 devtools 中名称稳定。
defineOptions({ name: "YsTextFilterItem" });

/**
 * YsTextFilterItem：文本（string）单字段查询条件控件。
 *
 * 设计原则：每个具体 FilterItem 组件只负责自己的一种类型，不在一个组件里做 type 工厂分支。
 * 使用方在 <ys-filter-panel> 插槽里直接选用要渲染哪些 item 组件（文本/数字/日期/bool...）。
 * 后续追加新类型时新建对应的 useXxxFilterItem + XxxFilterItem.vue，不动现有组件。
 *
 * - 只负责 string 类型，渲染 el-input（clearable）
 * - op 由声明方指定（常为 Operator.Contains，也可传 Equals/StartsWith/EndsWith 等）
 * - 内部 useTextFilterItem 维护值 ref 与 filterInfo computed：
 *   - 值为空（纯空白）时 filterInfo 返回 emptyFilter()（isEmpty=true）
 *   - 非空时 filterInfo 返回 filter(propertyPath, op, value)
 * - panel 注册/反注册由 YsFilterItemLayout 接管（传 api prop），本组件不再写 inject 样板
 *
 * 跨包类型解析注意：FilterItemApi.filter 字段类型 FilterInfo 在 dts 跨包比较时
 * 会被剥离 protected 字段，导致直接组装 api 对象报"filter 类型不兼容"。这里用
 * `as unknown as FilterItemApi` 绕过结构性比较（运行时安全）。
 */
const props = defineProps({
  /** 显示标签（渲染在控件左侧） */
  label: { type: String, required: true },
  /**
   * 运算符；字符串 enum 跨包用 String as PropType<Operator>（运行时为 string），
   * 避免 defineProps<泛型> 跨包类型解析丢字段（同 table.vue 的 viewMode 范式）。
   * 常传 Operator.Contains，但声明方可传任意 string 类型适用的 Operator
   * （Equals/StartsWith/EndsWith/Contains 等）。
   */
  op: { type: String as PropType<Operator>, required: true },
  /** 实体属性路径（FilterInfo.left），如 "name" / "user.name" */
  propertyPath: { type: String, required: true },
  /** 初始值；缺省为空字符串 */
  defaultValue: {
    type: String as PropType<TextFilterItemProps["defaultValue"]>,
    required: false,
  },
  /** 占位文本 */
  placeholder: { type: String, required: false },
});

const { value, filter: filterInfo, reset } = useTextFilterItem(props);

/* 组装稳定 API 对象：filter 是 getter，每次调用读最新 computed.value，
 * 使 panel 端的 filter computed 能 track 到本 item 的 value 变化。
 * value ref 只在模板内用于 v-model，不暴露到 api（panel 与 demo 均不消费 api.value）。
 * api 透传给 YsFilterItemLayout（:api="api"），由 layout 在 onMounted 注册到 panel。 */
const api = {
  get filter() {
    return filterInfo.value;
  },
  reset,
} as unknown as FilterItemApi;

/* 模板里 v-model 直接绑 composable 的 value ref（Vue 自动解包）；value 是 Ref<string>，
 * 与 el-input 的 string v-model 严格匹配。 */
defineExpose(api);
</script>

<template>
  <YsFilterItemLayout :label="label" :api="api">
    <el-input v-model="value" :placeholder="placeholder" clearable />
  </YsFilterItemLayout>
</template>

<style scoped></style>
