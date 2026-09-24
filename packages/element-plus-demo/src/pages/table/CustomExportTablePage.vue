<script setup lang="ts">
import { ref } from "vue";
import { type TableApi } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { delayedData, exportRows, metaFun } from "../shared/demoData";
import { useLocalCustomConfig } from "../shared/useLocalCustomConfig";

defineEmits<{
  (e: "back"): void;
}>();

// 大数据 + 每次请求 300ms 延迟：导出所有需 30 次请求（约 9 秒），进度条与取消清晰可见
const dataFun = delayedData(exportRows, 300);

const tableRef = ref<TableApi | null>(null);

const { loadCustomConfigFun, saveCustomConfigFun } = useLocalCustomConfig(
  "yk-crud-demo-table-columns-custom-export",
);

const exportorFunc = createExcelJsExportApiFunc();
</script>

<template>
  <DemoPageLayout
    title="自定义列 + 导出 Excel"
    hint="表格不内置入口，由上方外部按钮驱动：先点「⚙ 列设置」（openConfigDialog）调整列的显隐/顺序/宽度，再点「⬇ 导出 Excel」（openExportDialog）——导出的列与界面所见严格一致（隐藏列不导出、顺序一致、列宽映射）。300 行数据 + 每次请求 300ms 延迟（导出所有约需 9 秒），可清楚看到进度条并中途取消。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="primary" plain @click="tableRef?.openConfigDialog()">⚙ 列设置</el-button>
      <el-button type="success" @click="tableRef?.openExportDialog()">⬇ 导出 Excel</el-button>
    </template>

    <ys-table
      ref="tableRef"
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :page-size="10"
      :load-custom-config-fun="loadCustomConfigFun"
      :save-custom-config-fun="saveCustomConfigFun"
      :exportor-func="exportorFunc"
    />
  </DemoPageLayout>
</template>
