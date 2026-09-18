<script setup lang="ts">
import { h } from "vue";
import { constData, constMetaFunc, type Meta } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { createRows, type UserRow } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

const dataFun = constData(createRows());

/**
 * 本页自定义一份 meta：age/email 两列带 render。
 * 有 render 的列优先用 render 显示；没有 render 的列（id/name）走默认取值显示。
 */
const renderMeta: Meta = {
  displayName: "用户列表",
  description: "自定义列渲染演示用的元数据",
  columns: [
    { propertyPath: "id", displayName: "ID" },
    { propertyPath: "name", displayName: "姓名" },
    {
      propertyPath: "email",
      displayName: "邮箱（render 返回字符串）",
      // 返回字符串：按文本渲染
      render: (row) => ((row as UserRow).email ?? "").toUpperCase(),
    },
    {
      propertyPath: "age",
      displayName: "年龄（render 返回 VNode）",
      // 返回 VNode：30 岁及以上标红加粗，否则按普通文本
      render: (row, value) =>
        (value as number) >= 30
          ? h("span", { style: { color: "#f56c6c", fontWeight: "600" } }, String(value))
          : String(value),
    },
  ],
};
const metaFun = constMetaFunc(renderMeta);
</script>

<template>
  <DemoPageLayout
    title="自定义列渲染（column render 优先）"
    hint="column 加可选 render(row, value)：有 render 的列优先用自定义渲染（返回字符串按文本、返回 VNode 按节点），没有 render 的列（ID/姓名）仍按 propertyPath 取值显示。age 列 30 岁及以上标红（VNode），email 列转大写（字符串）；导出仍按 propertyPath 取原始值。"
    @back="$emit('back')"
  >
    <ys-table :meta-fun="metaFun" :data-fun="dataFun" />
  </DemoPageLayout>
</template>
