<script setup lang="ts">
import { ref } from "vue";
import { type Meta, constData, constMetaFunc } from "@ys-knife-crud/core";
import { YsFilterPanel, YsMultiTextFilterItem, YsTable } from "@ys-knife-crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";

defineEmits<{
  (e: "back"): void;
}>();

/** 演示数据：name / code 两列，任一包含关键字即命中 */
const rows = [
  { id: 1, name: "苹果笔记本", code: "NB-1001", category: "电脑" },
  { id: 2, name: "联想显示器", code: "MN-2003", category: "显示设备" },
  { id: 3, name: "无线鼠标", code: "MS-3007", category: "外设" },
  { id: 4, name: "机械键盘", code: "KB-4102", category: "外设" },
  { id: 5, name: "笔记本支架", code: "NB-5009", category: "配件" },
  { id: 6, name: "扩展坞", code: "DC-6011", category: "配件" },
];

const metaFun = constMetaFunc({
  displayName: "商品列表",
  description: null,
  columns: [
    { propertyPath: "id", displayName: "ID" },
    { propertyPath: "name", displayName: "名称" },
    { propertyPath: "code", displayName: "代码" },
    { propertyPath: "category", displayName: "分类" },
  ],
} satisfies Meta);

const dataFun = constData(rows);

/** 面板提交的条件（toString 后可直观看到 OR 结构） */
const lastFilter = ref("(empty)");

function onSearch(filter?: { toString(): string }): void {
  lastFilter.value = (filter?.toString() ?? "") || "(empty)";
}

function onReset(): void {
  lastFilter.value = "(empty)";
}
</script>

<template>
  <DemoPageLayout
    title="多字段模糊查询（名称或代码）"
    hint="YsMultiTextFilterItem 用一个输入框同时对多个字段做模糊查询：输入片段后按 propertyPaths 逐个生成 contains 条件，再用 FilterInfo.createOr 合成「任一命中」的语义，即 name contains 关键字 OR code contains 关键字。op 缺省为 Operator.Contains，也可显式传 StartsWith / EndsWith / Equals 等；值为空时该条件不参与查询（面板聚合时跳过）。下方展示面板提交的 FilterInfo 字符串，可直接看到 OR 结构。"
    @back="$emit('back')"
  >
    <ys-filter-panel @search="onSearch" @reset="onReset">
      <ys-multi-text-filter-item
        label="名称 / 代码"
        :property-paths="['name', 'code']"
        placeholder="请输入名称或代码"
      />
    </ys-filter-panel>

    <p style="margin: 8px 0 12px; font-size: 13px; color: #606266">
      当前查询条件：<strong>{{ lastFilter }}</strong>
    </p>

    <div style="height: 360px">
      <ys-table :meta-fun="metaFun" :data-fun="dataFun" :page-size="10" />
    </div>
  </DemoPageLayout>
</template>
