<script setup lang="ts">
import { ref } from "vue";
import { type TableApi } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { createBigRows, delayedPagedData, metaFun } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

// 500 行 + 每次请求 1.2s：导出所有按 25 条/次拉取 20 次 ≈ 24 秒，
// 倒计时足够长，能清楚观察「预计剩余时间」逐秒下降
const rows = createBigRows(500, "SlowUser");
// 返回真实 totalCount：进度条显示精确百分比与分母，剩余时间可按速率外推
const dataFun = delayedPagedData(rows, 1200, true);

const tableRef = ref<TableApi | null>(null);

const exportorFunc = createExcelJsExportApiFunc();
</script>

<template>
  <DemoPageLayout
    title="长耗时导出（预计剩余时间）"
    hint="500 行数据 + 每次请求 1.2s 延迟，接口返回真实 totalCount：点上方「⬇ 导出 Excel」按钮（调 openExportDialog()）→「导出所有数据」后按 25 条/次流式拉取 20 次，约 24 秒。进度对话框显示精确百分比、分母「已加载 N / 500」，并从首个响应起按当前拉取速率外推「预计剩余约 X 秒」——每 500ms 持续倒数（两页请求之间也在走）。可中途取消：已写入的行可选择保留为部分文件或丢弃。对比「未知总条数表格」页：totalCount 未知时无分母、百分比 99% 封顶、也不显示预计剩余时间。"
    @back="$emit('back')"
  >
    <template #toolbar>
      <el-button type="success" @click="tableRef?.openExportDialog()">⬇ 导出 Excel</el-button>
    </template>

    <ys-table ref="tableRef" :meta-fun="metaFun" :data-fun="dataFun" :export-page-size="25"
      :exportor-func="exportorFunc" />
  </DemoPageLayout>
</template>
