<script setup lang="ts">
import { ref } from "vue";
import type { Column, ExportApi, ExportApiFunc, TableApi } from "@ys.knife.crud/core";
import { constData } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

const dataFun = constData(manyRows);

const tableRef = ref<TableApi | null>(null);

/**
 * 极简 CSV 导出实现：演示 exportorFunc 的可替换性。
 * 组件只依赖 core 的 ExportApi 契约（renderHeader → renderRows × N → download/cancel），
 * 这里把同一份调用流翻译成 CSV 文本，最后以 Blob 触发下载。
 * 调用方传来的 fileName 带 .xlsx 后缀，统一替换为 .csv。
 */
class CsvExportApi implements ExportApi {
  private readonly sheets = new Map<string, { columns: Column[]; rows: unknown[][] }>();
  private finished = false;

  private ensureActive(): void {
    if (this.finished) {
      throw new Error("CsvExportApi 实例已终结（download/cancel 之后不能再调用）");
    }
  }

  async renderHeader(sheets: Record<string, Column[]>): Promise<void> {
    this.ensureActive();
    for (const [key, columns] of Object.entries(sheets)) {
      this.sheets.set(key, { columns, rows: [] });
    }
  }

  async renderRows(sheet: string, data: unknown[][]): Promise<void> {
    this.ensureActive();
    const target = this.sheets.get(sheet);
    if (!target) throw new Error(`未声明的 sheet "${sheet}"（renderHeader 中未提供）`);
    target.rows.push(...data);
  }

  async cancel(): Promise<void> {
    this.ensureActive();
    this.finished = true;
    this.sheets.clear();
  }

  async download(fileName: string): Promise<void> {
    this.ensureActive();
    this.finished = true;
    // 全部单元格引号包裹、内部双引号翻倍，避免逗号/引号/换行破坏 CSV 结构
    const escape = (cell: unknown): string => `"${String(cell ?? "").replace(/"/g, '""')}"`;
    const lines: string[] = [];
    for (const { columns, rows } of this.sheets.values()) {
      lines.push(columns.map((c) => escape(c.displayName ?? c.propertyPath)).join(","));
      for (const row of rows) lines.push(row.map(escape).join(","));
    }
    // \ufeff BOM：让 Excel 按 UTF-8 识别，中文表头不乱码
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(/\.[^.]+$/, "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/** 导出实现工厂：每次导出一个全新实例（与 ExportApiFunc 契约一致） */
const csvExportorFunc: ExportApiFunc = () => new CsvExportApi();
</script>

<template>
  <DemoPageLayout
    title="自定义导出实现（exportorFunc → CSV）"
    hint="导出格式由 exportorFunc 决定：组件只经 core 的 ExportApi 契约（renderHeader → renderRows → download/cancel）写数据，注入什么实现就产出什么格式。本页注入了一个手写的 CSV 导出器替代默认的 ExcelJS——点上方外部「⬇ 导出 Excel」按钮（内部调 openExportDialog()），选「导出所有」后实际下载到的是 .csv 文件（记事本/Excel 可直接打开；按钮文案不随实现变化），取消导出则走 cancel 不产出文件。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="success" @click="tableRef?.openExportDialog()">⬇ 导出 Excel</el-button>
    </template>

    <ys-table ref="tableRef" :meta-fun="metaFun" :data-fun="dataFun" :page-size="10"
      :exportor-func="csvExportorFunc" />
  </DemoPageLayout>
</template>
