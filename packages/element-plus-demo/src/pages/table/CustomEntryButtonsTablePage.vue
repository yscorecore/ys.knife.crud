<script setup lang="ts">
import { ref } from "vue";
import { constData, type TableApi } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun } from "../shared/demoData";
import { useLocalCustomConfig } from "../shared/useLocalCustomConfig";

defineEmits<{
  (e: "back"): void;
}>();

const dataFun = constData(manyRows);

// ref 直接用 core 的输出契约 TableApi 类型化（含 openConfigDialog/openExportDialog）
const tableRef = ref<TableApi | null>(null);

// 独立 localStorage key，与其它演示页的列配置互不覆盖
const { loadCustomConfigFun, saveCustomConfigFun } = useLocalCustomConfig(
  "yk-crud-demo-table-columns-custom-entry-buttons",
);

// 真实导出实现：内置对话框本身不挑入口来源，外部按钮打开后照常产出 xlsx
const exportorFunc = createExcelJsExportApiFunc();
</script>

<template>
  <DemoPageLayout
    title="自定义入口按钮（openConfigDialog / openExportDialog）"
    hint="表格不渲染任何内置命令入口，由页面在外部自实现按钮（此处用实心 / plain 按钮演示样式完全自定义）。按钮里只调 tableRef.openConfigDialog() / tableRef.openExportDialog()——打开的仍是表格内置对话框，全部逻辑（列显隐/顺序/宽度持久化、导出范围选择/进度/取消、导出列所见即所得）零改动复用。25 行 + pageSize=10，勾选后自定义导出按钮里还会出现「导出选中」范围。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="primary" plain @click="tableRef?.openConfigDialog()">
        自定义·列设置
      </el-button>
      <el-button type="success" @click="tableRef?.openExportDialog()">
        自定义·导出 Excel
      </el-button>
    </template>

    <ys-table
      ref="tableRef"
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :page-size="10"
      show-checkbox
      :load-custom-config-fun="loadCustomConfigFun"
      :save-custom-config-fun="saveCustomConfigFun"
      :exportor-func="exportorFunc"
    />
  </DemoPageLayout>
</template>
