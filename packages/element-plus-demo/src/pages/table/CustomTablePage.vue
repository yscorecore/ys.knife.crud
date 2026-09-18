<script setup lang="ts">
import { ref } from "vue";
import { constData, type TableApi } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { createRows, metaFun } from "../shared/demoData";
import { useLocalCustomConfig } from "../shared/useLocalCustomConfig";

defineEmits<{
  (e: "back"): void;
}>();

const dataFun = constData(createRows());

// ref 经 TableApi 类型化，外部按钮用它调 openConfigDialog 打开列设置面板
const tableRef = ref<TableApi | null>(null);

// 列设置持久化到 localStorage，刷新页面后仍生效（各演示模式用独立 key）
const { loadCustomConfigFun, saveCustomConfigFun } = useLocalCustomConfig(
  "yk-crud-demo-table-columns",
);
</script>

<template>
  <DemoPageLayout
    title="自定义列表格"
    hint="showCustomConfig 启用列设置能力：可勾选列的显隐、用上移/下移调整顺序、输入列宽，保存后立即生效并经 localStorage 持久化（刷新页面仍在）。候选列来自 meta 中 showForDisplay=true 的列，隐藏列不会出现。组件不内置入口按钮，由下方外部按钮经 ref.openConfigDialog() 打开。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="primary" @click="tableRef?.openConfigDialog()">⚙ 列设置</el-button>
    </template>

    <ys-table
      ref="tableRef"
      :meta-fun="metaFun"
      :data-fun="dataFun"
      show-custom-config
      :load-custom-config-fun="loadCustomConfigFun"
      :save-custom-config-fun="saveCustomConfigFun"
    />
  </DemoPageLayout>
</template>
