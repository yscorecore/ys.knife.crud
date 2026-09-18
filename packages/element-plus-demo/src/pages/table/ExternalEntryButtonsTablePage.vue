<script setup lang="ts">
import { ref } from "vue";
import type { TableApi } from "@ys.knife.crud/core";
import { constData } from "@ys.knife.crud/core";
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

// 列设置配置独立持久化（与其他 demo 互不覆盖）
const { loadCustomConfigFun, saveCustomConfigFun } = useLocalCustomConfig(
  "yk-crud-demo-external-entry-buttons",
);

const exportorFunc = createExcelJsExportApiFunc();
</script>

<template>
  <DemoPageLayout
    title="外部自定义入口按钮"
    hint="showCustomConfig 与 showExportExcel 只负责启用能力（挂载列设置面板与导出流程），组件本身不渲染入口按钮——按钮由外部使用者自行提供（如下方），点击时经表格 ref 调用组件暴露的 openConfigDialog() / openExportDialog()，触发的仍是组件内部同一套流程。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <!-- 外部提供的按钮：样式/位置完全自定义，事件调组件 expose 的方法 -->
      <el-button @click="tableRef?.openConfigDialog()">⚙ 自定义列设置入口</el-button>
      <el-button type="success" @click="tableRef?.openExportDialog()">⬇ 自定义导出入口</el-button>
    </template>

    <ys-table
      ref="tableRef"
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :page-size="10"
      show-custom-config
      show-export-excel
      :load-custom-config-fun="loadCustomConfigFun"
      :save-custom-config-fun="saveCustomConfigFun"
      :exportor-func="exportorFunc"
    />
  </DemoPageLayout>
</template>
