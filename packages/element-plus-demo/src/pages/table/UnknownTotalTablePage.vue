<script setup lang="ts">
import { YsTable } from "@ys.knife.crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
import type { NewPageFunc } from "@ys.knife.crud/core";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { delayedData, exportRows, metaFun, type UserRow } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

/**
 * 后端不返回总条数的数据源：复用 delayedData 的延迟 + 分页切片语义，
 * 再把响应中的 totalCount 抹成 null——仅 hasNext 指示是否还有下一页。
 */
const inner = delayedData<UserRow>(exportRows, 400);
const dataFun: NewPageFunc<UserRow> = async (limit, offset, signal) => {
  const res = await inner(limit, offset, signal);
  return { ...res, totalCount: null };
};

// 真实导出实现（ExcelJS）：总条数未知，「导出所有」进度条走 indeterminate 动画
const exportorFunc = createExcelJsExportApiFunc();
</script>

<template>
  <DemoPageLayout
    title="未知总条数表格（totalCount=null）"
    hint="dataFun 返回 totalCount=null、仅 hasNext 标记是否有下一页：分页组件不显示「共 N 条」，靠 hasNext 决定「下一页」是否可点；「⬇ 导出 Excel → 导出所有数据」时总条数未知，进度条走 indeterminate 流动动画、只显示已加载条数，导完正常下载 xlsx。对比「分页表格」页（totalCount 已知）可见两种模式的差异。"
    @back="$emit('back')"
  >
    <ys-table :meta-fun="metaFun" :data-fun="dataFun" :page-size="20" :export-page-size="50" show-export-excel
      :exportor-func="exportorFunc" />
  </DemoPageLayout>
</template>
