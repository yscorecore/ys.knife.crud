<script setup lang="ts">
import { computed, onMounted, ref, type PropType } from "vue";
import type { FilterItemApi, Operator } from "@ys.knife.crud/core";
import { useEnumFilterItem, type EnumFilterItemProps } from "@ys.knife.crud/vue";
import YsFilterItemLayout from "./filterItemLayout.vue";

// 组件名统一带 ys 前缀：模板中以 <ys-enum-filter-item>（或 <YsEnumFilterItem>）使用。
defineOptions({ name: "YsEnumFilterItem" });

/**
 * YsEnumFilterItem：枚举单字段查询条件控件，支持单选与多选模式。
 *
 * 设计原则：每个具体 FilterItem 组件只负责自己的一种类型，不做 type 工厂分支。
 *
 * - 渲染 el-select（clearable）；选项来自异步 dataFunc 返回的数组
 * - multiple=false（默认）：单选模式，使用声明方指定的 op（常为 Equals）
 * - multiple=true：多选模式，op 自动派生：
 *   - 0 项 → filterInfo 返回 null（panel 端聚合时跳过）
 *   - 1 项 → Operator.Equals（自动）
 *   - 2+ 项 → Operator.In（自动）
 * - keyProperty：选项对象中作为「选中值」的属性名（送入 v-model 与 filter）
 * - valueProperty：选项对象中作为「显示文本」的属性名（el-option :label）
 * - onMounted 调 dataFunc 加载选项，存入 options ref；loading 状态控制 el-select loading
 *   （panel 注册/反注册由 YsFilterItemLayout 接管，传 api prop；本组件 onMounted 只管加载选项）
 *
 * 跨包类型解析：api 对象用 as unknown as FilterItemApi 绕过结构性比较（同其他 FilterItem）。
 * 模板 v-model 绑定 union 类型 ref（单值 | 数组）el-select 静态类型不兼容，
 * 用 writable computed selectValue 代理读写（set 端 unknown→union 断言）。
 */
const props = defineProps({
  /** 显示标签（渲染在控件左侧） */
  label: { type: String, required: true },
  /**
   * 运算符；字符串 enum 跨包用 String as PropType<Operator>（运行时为 string）。
   * 仅单选模式（multiple=false）下使用；多选模式下被 composable 忽略，
   * 按「1 项→Equals，2+ 项→In」自动派生。
   */
  op: { type: String as PropType<Operator>, required: true },
  /** 实体属性路径（FilterInfo.left），如 "status" / "user.roleId" */
  propertyPath: { type: String, required: true },
  /**
   * 初始值；单选模式为 string | number | null（null=未选），
   * 多选模式为 (string | number)[]（空数组=未选）。
   */
  defaultValue: {
    type: [String, Number, Array] as unknown as PropType<EnumFilterItemProps["defaultValue"]>,
    required: false,
  },
  /** 占位文本 */
  placeholder: { type: String, required: false },
  /**
   * 异步数据源：返回选项对象数组；onMounted 调用一次。
   * 选项对象结构由声明方决定，配合 keyProperty/valueProperty 提取字段
   */
  dataFunc: {
    type: Function as PropType<() => Promise<Record<string, unknown>[]>>,
    required: true,
  },
  /** 选项对象中作为「选中值」的属性名（送入 v-model 与 filter，作为 con 包装的值） */
  keyProperty: { type: String, required: true },
  /** 选项对象中作为「显示文本」的属性名（el-option :label，经 String() 强制转字符串） */
  valueProperty: { type: String, required: true },
  /** 是否可清空，默认 true */
  clearable: { type: Boolean, default: true },
  /** 是否多选；默认 false。多选时 2+ 项用 In，1 项用 Equals，0 项返回 null */
  multiple: { type: Boolean, default: false },
});

const { value, filter: filterInfo, reset } = useEnumFilterItem(props);

/* el-select 的 v-model 静态类型在 single/multiple 切换下不一致（单值 vs 数组），
 * 而 composable 返回的 value 是 union ref（单值 | 数组）。这里用 writable computed
 * 代理读写，set 端做 unknown → union 断言；运行时单选收到单值，多选收到数组，
 * 类型与 multiple 模式严格对应。 */
const selectValue = computed({
  get: () => value.value,
  set: (v: unknown) => {
    value.value = v as typeof value.value;
  },
});

/* 选项数据 + loading 状态：dataFunc 在 onMounted 调用一次，结果存入 options ref。
 * 不在 composable 中处理，因为 loading 状态、错误处理都是 UI 层关注点。
 * layout 的 onMounted 先于本组件 onMounted 执行（子先于父），register 已先发生。 */
const options = ref<Record<string, unknown>[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    options.value = await props.dataFunc();
  } finally {
    loading.value = false;
  }
});

/* 组装稳定 API 对象：filter/value 是 getter，每次调用读最新 computed.value，
 * 使 panel 端的 filter computed 能 track 到本 item 的 value 变化。
 * api 透传给 YsFilterItemLayout（:api="api"），由 layout 在 onMounted 注册到 panel。 */
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
    <el-select
      v-model="selectValue"
      :multiple="multiple"
      :placeholder="placeholder"
      :clearable="clearable"
      :loading="loading"
    >
      <el-option
        v-for="opt in options"
        :key="String(opt[keyProperty])"
        :value="opt[keyProperty] as string | number"
        :label="String(opt[valueProperty])"
      />
    </el-select>
  </YsFilterItemLayout>
</template>

<style scoped></style>
