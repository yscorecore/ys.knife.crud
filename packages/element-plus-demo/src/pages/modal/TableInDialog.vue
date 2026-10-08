<script setup lang="ts">
import { constData, Operator } from "@ys-knife-crud/core";
import {
  type TablePageDataFun,
  YsTablePage,
  YsTextFilterItem,
} from "@ys-knife-crud/element-plus";
import { manyRows, metaFun } from "../shared/demoData";

/**
 * 弹窗内嵌 YsTablePage 的内容组件。
 * 演示在 openDialog/openModal 中直接渲染完整的「查询 + 命令 + 表格」三合一组件。
 * 弹窗本身提供确定/取消按钮，这里不需要额外 emit。
 */

/**
 * 解析单条件 FilterInfo.toString()（`name contains "VALUE"`）中的 contains 值。
 * 真实项目里 dataFun 通常把 filter 透传给后端，这里仅前端过滤演示联动。
 */
function extractContains(s: string): string {
  const m = /contains\s+(.+)$/i.exec(s);
  const raw = m?.[1]?.trim() ?? "";
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : raw;
  } catch {
    return raw;
  }
}

const dataFun: TablePageDataFun = (req, filter) => {
  const rows = filter.isEmpty()
    ? manyRows
    : manyRows.filter((r) => r.name.includes(extractContains(filter.toString())));
  return constData(rows)(req);
};
</script>

<template>
  <ys-table-page
    :meta-fun="metaFun"
    :data-fun="dataFun"
    :page-size="5"
    show-checkbox
  >
    <ys-text-filter-item
      label="姓名"
      property-path="name"
      :op="Operator.Contains"
      placeholder="输入姓名片段"
    />
  </ys-table-page>
</template>

<style scoped>
/* 弹窗内容区给一个最小高度，避免表格空数据时弹窗过矮 */
:deep(.el-dialog__body) {
  padding: 0;
}
</style>
