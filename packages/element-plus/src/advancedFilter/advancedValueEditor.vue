<script setup lang="ts">
import { computed, type PropType } from "vue";
import type { AdvancedFieldType, AdvancedOperator, EnumOption } from "@ys.knife.crud/core";

/**
 * YsAdvancedValueEditor：高级查询条件行里的「值」控件。
 *
 * 纯受控组件（v-model），按字段类型 + 操作符渲染不同的输入控件：
 *
 * - string 单值：el-input；In/NotIn：el-select multiple + allow-create（手输多值）
 * - number 单值：el-input-number；Between/NotBetween：两个 el-input-number（起 ~ 止）
 * - date 单值：el-date-picker；Between/NotBetween：el-date-picker type="daterange"
 * - boolean：el-select（是=true / 否=false；false 是合法值，用 undefined 表示未选）
 * - enum 单值：el-select（选项来自 options prop，由父组件异步加载）；
 *   In/NotIn：el-select multiple
 *
 * modelValue 在编辑态是 unknown（区间是数组、多值是数组、boolean 是 boolean），
 * 各控件对 v-model 的静态类型要求不同，这里为每类控件提供一个收窄类型的
 * writable computed 代理，set 端统一 emit 原始值给父级。
 */
defineOptions({ name: "YsAdvancedValueEditor" });

const props = defineProps({
  /** 字段类型（决定控件种类） */
  fieldType: { type: String as PropType<AdvancedFieldType>, required: true },
  /** 当前操作符（决定单值/区间/多值/无值形态） */
  op: { type: String as PropType<AdvancedOperator>, required: true },
  /**
   * 受控值；形态由 fieldType + op 决定（单值/区间数组/多值数组/boolean）。
   * type:null 是 Vue 官方的「任意类型 prop」通路：runtime 跳过构造器校验，
   * 类型映射为 any，父级 row.value 可直接 v-model 透传。
   */
  modelValue: { type: null, required: false, default: null },
  /** enum 类型的可选项（父组件按字段数据源异步加载后传入） */
  options: { type: Array as PropType<EnumOption[]>, default: () => [] },
  /** enum 选项加载中（el-select loading） */
  optionsLoading: { type: Boolean, default: false },
  /** el-date-picker value-format，默认 YYYY-MM-DD */
  valueFormat: { type: String, default: "YYYY-MM-DD" },
});

const emit = defineEmits<{
  (e: "update:modelValue", value: unknown): void;
}>();

/** 是否区间操作符（Between/NotBetween） */
const isRange = computed(() => props.op === "between" || props.op === "not_between");
/** 是否多值操作符（In/NotIn） */
const isMulti = computed(() => props.op === "in" || props.op === "not_in");

/** string 单值（el-input 吃 string；非字符串回落空串） */
const stringValue = computed<string>({
  get: () => (typeof props.modelValue === "string" ? props.modelValue : ""),
  set: (v) => emit("update:modelValue", v),
});

/** number 单值（el-input-number 吃 number | undefined） */
const numberValue = computed<number | undefined>({
  get: () => (typeof props.modelValue === "number" ? props.modelValue : undefined),
  set: (v) => emit("update:modelValue", v ?? null),
});

/** date 单值（el-date-picker 吃 string | null） */
const dateValue = computed<string | null>({
  get: () => (typeof props.modelValue === "string" ? props.modelValue : null),
  set: (v) => emit("update:modelValue", v),
});

/** boolean 值（el-select；undefined=未选，false 是合法值） */
const boolValue = computed<boolean | undefined>({
  get: () => (typeof props.modelValue === "boolean" ? props.modelValue : undefined),
  set: (v) => emit("update:modelValue", v ?? null),
});

/** enum 单值（选中值为 string | number | boolean） */
const enumValue = computed<string | number | boolean | undefined>({
  get: () => {
    const v = props.modelValue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
    return undefined;
  },
  set: (v) => emit("update:modelValue", v ?? null),
});

/** 多值（string in / enum in；多选数组） */
const multiValue = computed<(string | number | boolean)[]>({
  get: () => (Array.isArray(props.modelValue)
    ? (props.modelValue as (string | number | boolean)[])
    : []),
  set: (v) => emit("update:modelValue", v),
});

/** 日期区间（[string, string] | null）：daterange 直接吃二元数组 */
const dateRangeValue = computed<[string, string] | null>({
  get: () => {
    if (!Array.isArray(props.modelValue) || props.modelValue.length !== 2) return null;
    const first = props.modelValue[0];
    const second = props.modelValue[1];
    if (typeof first === "string" && typeof second === "string") {
      return [first, second] as [string, string];
    }
    return null;
  },
  set: (v) => emit("update:modelValue", v),
});

/** 数字区间起始值（[number|null, number|null]） */
const rangeStart = computed<number | undefined>({
  get: () => {
    if (Array.isArray(props.modelValue)) {
      const v = props.modelValue[0];
      return typeof v === "number" ? v : undefined;
    }
    return undefined;
  },
  set: (v) => {
    const end = Array.isArray(props.modelValue)
      ? (typeof props.modelValue[1] === "number" ? props.modelValue[1] : null)
      : null;
    emit("update:modelValue", [v ?? null, end]);
  },
});

/** 数字区间结束值 */
const rangeEnd = computed<number | undefined>({
  get: () => {
    if (Array.isArray(props.modelValue)) {
      const v = props.modelValue[1];
      return typeof v === "number" ? v : undefined;
    }
    return undefined;
  },
  set: (v) => {
    const start = Array.isArray(props.modelValue)
      ? (typeof props.modelValue[0] === "number" ? props.modelValue[0] : null)
      : null;
    emit("update:modelValue", [start, v ?? null]);
  },
});

/** boolean 固定选项：false 必须能正常选中，不能当空值处理 */
const boolOptions: EnumOption[] = [
  { label: "是", value: true },
  { label: "否", value: false },
];
</script>

<template>
  <!-- string：多值用可手输的多选下拉，单值用输入框 -->
  <el-select
    v-if="fieldType === 'string' && isMulti"
    v-model="multiValue"
    class="yk-advanced-value-editor"
    multiple
    filterable
    allow-create
    default-first-option
    :reserve-keyword="false"
    placeholder="输入后回车添加"
  />
  <el-input
    v-else-if="fieldType === 'string'"
    v-model="stringValue"
    placeholder="请输入"
    clearable
  />

  <!-- number：区间为两个数字框，单值为一个 -->
  <div v-else-if="fieldType === 'number' && isRange" class="yk-advanced-value-editor yk-advanced-value-editor--range">
    <el-input-number v-model="rangeStart" placeholder="最小值" :controls="false" class="yk-advanced-value-editor__num" />
    <span class="yk-advanced-value-editor__sep">~</span>
    <el-input-number v-model="rangeEnd" placeholder="最大值" :controls="false" class="yk-advanced-value-editor__num" />
  </div>
  <el-input-number
    v-else-if="fieldType === 'number'"
    v-model="numberValue"
    placeholder="请输入数字"
    :controls="false"
    class="yk-advanced-value-editor"
  />

  <!-- date：区间直接用 daterange，单值用 date -->
  <el-date-picker
    v-else-if="fieldType === 'date' && isRange"
    v-model="dateRangeValue"
    type="daterange"
    :value-format="valueFormat"
    start-placeholder="开始日期"
    end-placeholder="结束日期"
    class="yk-advanced-value-editor"
  />
  <el-date-picker
    v-else-if="fieldType === 'date'"
    v-model="dateValue"
    type="date"
    :value-format="valueFormat"
    placeholder="选择日期"
    clearable
  />

  <!-- boolean：是 / 否 -->
  <el-select
    v-else-if="fieldType === 'boolean'"
    v-model="boolValue"
    placeholder="请选择"
    clearable
  >
    <el-option
      v-for="opt in boolOptions"
      :key="String(opt.value)"
      :label="opt.label"
      :value="opt.value"
    />
  </el-select>

  <!-- enum：多值多选，单值单选；选项由父组件按字段数据源异步加载 -->
  <el-select
    v-else-if="fieldType === 'enum' && isMulti"
    v-model="multiValue"
    multiple
    :loading="optionsLoading"
    placeholder="请选择"
    clearable
  >
    <el-option
      v-for="opt in options"
      :key="String(opt.value)"
      :label="opt.label"
      :value="opt.value"
    />
  </el-select>
  <el-select
    v-else-if="fieldType === 'enum'"
    v-model="enumValue"
    :loading="optionsLoading"
    placeholder="请选择"
    clearable
  >
    <el-option
      v-for="opt in options"
      :key="String(opt.value)"
      :label="opt.label"
      :value="opt.value"
    />
  </el-select>
</template>

<style scoped>
.yk-advanced-value-editor {
  width: 100%;
}

.yk-advanced-value-editor--range {
  display: flex;
  align-items: center;
  gap: 6px;
}

.yk-advanced-value-editor__num {
  flex: 1 1 0;
  width: 0;
}

.yk-advanced-value-editor__sep {
  color: var(--el-text-color-secondary, #909399);
  flex: 0 0 auto;
}
</style>
