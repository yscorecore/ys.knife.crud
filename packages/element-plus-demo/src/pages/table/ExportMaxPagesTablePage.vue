<script setup lang="ts">
import { ref } from "vue";
import type { TableApi } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { delayedData, exportRows, metaFun } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

// 300 行数据 + exportPageSize=50 → 共 6 页；exportMaxPages=3 限制「导出所有」只拉前 3 页
const dataFun = delayedData(exportRows, 300);
const tableRef = ref<TableApi | null>(null);
const exportorFunc = createExcelJsExportApiFunc();
</script>

<template>
  <DemoPageLayout
    title="导出页数上限（exportMaxPages）"
    hint="300 行数据、exportPageSize=50 → 共 6 页；exportMaxPages=3 限制「导出所有」最多拉取 3 页——即使 hasNext 仍为 true（数据未导完），也在 150 条处停止并下载已拉取的部分（进度条约 50% 时结束）。默认值 1000 页，用于防止数据量过大时无休止导出。外部按钮经 ref.openExportDialog() 打开导出入口。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="success" @click="tableRef?.openExportDialog()">⬇ 导出 Excel</el-button>
    </template>

    <ys-table ref="tableRef" :meta-fun="metaFun" :data-fun="dataFun" :page-size="20"
      :export-page-size="50" :export-max-pages="3" show-export-excel
      :exportor-func="exportorFunc" />
  </DemoPageLayout>
</template>
