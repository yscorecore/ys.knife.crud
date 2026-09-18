<script setup lang="ts">
import { ref } from "vue";
import { constData, type TableApi } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun } from "../shared/demoData";
import { useSelectionViewer } from "../shared/useSelectionViewer";

defineEmits<{
  (e: "back"): void;
}>();

const dataFun = constData(manyRows);

const tableRef = ref<TableApi | null>(null);
const { showSelection } = useSelectionViewer(tableRef);

// 真实导出实现（ExcelJS）：Table 缺省用 core 的控制台假实现（只打日志不产出文件），
// demo 作为消费方显式注入真实实现，导出才会真的下载 xlsx 文件
const exportorFunc = createExcelJsExportApiFunc();
</script>

<template>
  <DemoPageLayout
    title="导出 Excel 表格"
    hint="showExportExcel 启用导出能力：外部按钮经 ref.openExportDialog() 打开导出入口，可选导出选中 / 当前页 / 所有数据（只有一页或无勾选列时对应选项自动隐藏，仅剩一个选项时不弹框直接导出）。导出列与界面所见一致（显隐 + 顺序 + 列宽）；「导出所有」会循环请求数据并显示进度条，可中途取消。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="primary" @click="showSelection">查看选中</el-button>
      <el-button type="success" @click="tableRef?.openExportDialog()">⬇ 导出 Excel</el-button>
    </template>

    <ys-table
      ref="tableRef"
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :page-size="10"
      show-checkbox
      show-export-excel
      :exportor-func="exportorFunc"
    />
  </DemoPageLayout>
</template>
