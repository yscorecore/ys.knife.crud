<script setup lang="ts">
import { ref } from "vue";
import type { DataColumn, ImportProcessSummary, ImportProcessor, ImportRowResult } from "@ys-knife-crud/core";
import { YsImportExcel } from "@ys-knife-crud/element-plus";
import { createExcelJsImportParser } from "@ys-knife-crud/import-exceljs";

/**
 * 弹窗内嵌 YsImportExcel 的内容组件。
 * 演示在 openDialog/openModal 中直接渲染 Excel 导入组件。
 */

const columns: DataColumn[] = [
  { name: "code", alias: ["商品编码", "编码"] },
  { name: "name", alias: ["商品名称", "名称"] },
  {
    position: 2,
    name: "qty",
    valueMapper: (v) => Number(v),
    validator: (v) => {
      if (!Number.isFinite(v)) return ["数量必须是数字"];
      if (v <= 0) return ["数量必须大于 0"];
      return [];
    },
  },
  {
    name: "price",
    alias: ["单价", "价格", "价格(元)"],
    valueMapper: (v) => Number(v),
    validator: (v) => {
      if (!Number.isFinite(v)) return ["单价必须是数字"];
      if (v < 0) return ["单价不能为负数"];
      return [];
    },
  },
  { name: "remark", alias: ["备注"], optional: true },
];

const parser = createExcelJsImportParser();

const processor: ImportProcessor = {
  batchSize: 10,
  process: async (batch) => {
    await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 400));
    return batch.map((row): ImportRowResult =>
      String(row.data.code).startsWith("E")
        ? { status: "failed", message: `编码 ${row.data.code} 已存在，请更换后重试` }
        : { status: "success" },
    );
  },
};

const lastSummary = ref<ImportProcessSummary | null>(null);
</script>

<template>
  <div class="import-in-dialog">
    <el-alert
      v-if="lastSummary"
      class="import-in-dialog__alert"
      :title="`处理完成：共 ${lastSummary.total} 行，成功 ${lastSummary.success} 行，失败 ${lastSummary.failed} 行`"
      :type="lastSummary.failed === 0 ? 'success' : 'warning'"
      :closable="false"
      show-icon
    />
    <ys-import-excel
      :columns="columns"
      :parser="parser"
      :processor="processor"
      @processed="lastSummary = $event"
    />
  </div>
</template>

<style scoped>
.import-in-dialog {
  min-height: 400px;
}

.import-in-dialog__alert {
  margin-bottom: 12px;
}
</style>
