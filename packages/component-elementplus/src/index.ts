import Table from "./Table.vue";

export { Table };

// <script setup> 里的 interface 不是模块导出成员，用实例类型提取 props
export type TableProps = InstanceType<typeof Table>["$props"];

// ExcelJS 版导出实现已抽为独立包 @ys.knife.crud/export-exceljs，
// 这里 re-export 保持原有消费方式不变（Table 的 exportApiFunc 默认值也来自该包）
export { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
export type { ExcelJsExportOptions } from "@ys.knife.crud/export-exceljs";
