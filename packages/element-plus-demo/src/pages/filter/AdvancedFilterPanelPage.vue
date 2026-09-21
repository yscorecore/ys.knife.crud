<script setup lang="ts">
import { ref } from "vue";
import {
  type Column,
  type EnumOption,
  type EnumOptionsSource,
  type FilterInfo,
} from "@ys.knife.crud/core";
import { YsAdvancedFilterPanel } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";

defineEmits<{
  (e: "back"): void;
}>();

/** panel ref：经 expose 拿聚合后的 filter（FilterInfo）与 reset */
const panelRef = ref<{ filter: FilterInfo; reset: () => void } | null>(null);

/** 最近一次查询时捕获的 FilterInfo（toString 展示用） */
const lastFilterString = ref<string>("");

/**
 * 可查询字段：覆盖 5 种字段类型，验证操作符下拉与值控件按类型切换：
 * - string：包含/等于/开头/结尾/多值（in）
 * - number：比较 + 区间（between，两个数字框）
 * - date：比较 + 日期区间（daterange）
 * - boolean：等于 true/false
 * - enum（status）：等于/属于，选项来自 optionSources 异步数据源
 * secret 设为 showForDisplay:false 也照常可查（高级查询不按 showForDisplay 过滤字段）
 */
const columns: Column[] = [
  { propertyPath: "name", displayName: "姓名", dataTypeName: "string", showForDisplay: true },
  { propertyPath: "email", displayName: "邮箱", dataTypeName: "string", showForDisplay: true },
  { propertyPath: "age", displayName: "年龄", dataTypeName: "number", showForDisplay: true },
  {
    propertyPath: "createdAt",
    displayName: "创建时间",
    dataTypeName: "date",
    showForDisplay: true,
  },
  {
    propertyPath: "enabled",
    displayName: "是否启用",
    dataTypeName: "boolean",
    showForDisplay: true,
  },
  {
    propertyPath: "status",
    displayName: "状态",
    // optionSources 命中后按 enum 渲染（优先级高于 dataTypeName）
    dataTypeName: "string",
    showForDisplay: true,
  },
  {
    propertyPath: "secret",
    displayName: "隐藏列",
    dataTypeName: "string",
    showForDisplay: false,
  },
];

/** 枚举字段数据源：按 propertyPath 映射；字段选中时面板按需加载一次 */
const optionSources: Record<string, EnumOptionsSource> = {
  status: loadStatusOptions,
};

async function loadStatusOptions(): Promise<EnumOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [
    { label: "在职", value: 1 },
    { label: "离职", value: 2 },
    { label: "待入职", value: 3 },
    { label: "归档", value: 4 },
  ];
}

function onSearch(filter: FilterInfo): void {
  lastFilterString.value = filter.isEmpty() ? "(empty)" : filter.toString();
}

function onReset(): void {
  lastFilterString.value = "";
}
</script>

<template>
  <DemoPageLayout
    title="高级查询面板（YsAdvancedFilterPanel）"
    hint="只传 Column[]，终端用户自行增删条件行并任意嵌套 AND/OR 组合（如 `(a) and ((b) or (c))`，外层 AND 内层 OR）：字段（按列元数据）+ 操作符（按字段类型过滤）+ 值（string 输入框/多值标签，number 数字框/区间，date 日期/日期区间，boolean 是/否，enum 异步下拉）；每个分组顶部有「+ 条件」「+ 嵌套组」入口，level > 0 的组可删；未填值的叶子与空组聚合时自动跳过；单子项透传避免多余括号。"
    @back="$emit('back')"
  >
    <ys-advanced-filter-panel
      ref="panelRef"
      :columns="columns"
      :option-sources="optionSources"
      @search="onSearch"
      @reset="onReset"
    />

    <div style="margin-top: 16px; line-height: 1.8">
      <p>
        当前实时聚合的 FilterInfo：
        <code>{{ panelRef?.filter?.toString() || "(empty)" }}</code>
      </p>
      <p v-if="lastFilterString">
        上次查询时提交的 FilterInfo：<code>{{ lastFilterString }}</code>
      </p>
    </div>
  </DemoPageLayout>
</template>
