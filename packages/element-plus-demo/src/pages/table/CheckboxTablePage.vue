<script setup lang="ts">
import { ref } from "vue";
import { constData, type TableApi } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun } from "../shared/demoData";
import { useSelectionViewer } from "../shared/useSelectionViewer";

defineEmits<{
  (e: "back"): void;
}>();

const dataFun = constData(manyRows);

// ref 直接用 core 的输出契约 TableApi 类型化，不依赖组件 SFC 的 InstanceType
const tableRef = ref<TableApi | null>(null);
const { showSelection } = useSelectionViewer(tableRef);
</script>

<template>
  <DemoPageLayout
    title="可勾选表格"
    hint="showCheckbox 开启后第一列变为 checkbox（reserve-selection 按行 key 跨页保留选中，翻页不丢）；表头 checkbox 全选 / 取消全选当前页；有选中时表格上方显示「已选 N 项 · 清空」。25 行数据 + pageSize=10，可跨页勾选后点「查看选中」验证。"
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
    />
  </DemoPageLayout>
</template>
