<script setup lang="ts">
import { ref } from "vue";
import { constData, type TableApi } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun } from "../shared/demoData";
import { useLocalCustomConfig } from "../shared/useLocalCustomConfig";
import { useSelectionViewer } from "../shared/useSelectionViewer";

defineEmits<{
  (e: "back"): void;
}>();

const dataFun = constData(manyRows);

const tableRef = ref<TableApi | null>(null);
const { showSelection } = useSelectionViewer(tableRef);

// 配置独立持久化（与自定义列 demo 互不覆盖）
const { loadCustomConfigFun, saveCustomConfigFun } = useLocalCustomConfig(
  "yk-crud-demo-table-columns-combo",
);
</script>

<template>
  <DemoPageLayout
    title="可勾选 + 自定义列表格"
    hint="showCheckbox 与 showCustomConfig 同时开启：第一列是 checkbox（跨页保留选中），右上「⚙ 列设置」调整数据列的显隐/顺序/宽度——勾选列固定在第一列，不参与列设置。25 行数据 + pageSize=10，配置独立持久化（与自定义列 demo 互不覆盖）。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="primary" @click="showSelection">查看选中</el-button>
    </template>

    <ys-table
      ref="tableRef"
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :page-size="10"
      show-checkbox
      show-custom-config
      :load-custom-config-fun="loadCustomConfigFun"
      :save-custom-config-fun="saveCustomConfigFun"
    />
  </DemoPageLayout>
</template>
