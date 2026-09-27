<script setup lang="ts">
import { computed, ref } from "vue";
import type { Column, DataColumn, ImportProcessSummary, ImportProcessor, ImportRowProcessor, ImportRowResult } from "@ys-knife-crud/core";
import { YsImportExcel } from "@ys-knife-crud/element-plus";
import { createExcelJsImportParser } from "@ys-knife-crud/import-exceljs";
import { createExcelJsExportApiFunc } from "@ys-knife-crud/export-exceljs";

defineEmits<{
  (e: "back"): void;
}>();

/** 批量导入 demo：重点演示 processor.batchSize —— 每次 process 调用携带的行数 */
const columns: DataColumn[] = [
  { name: "code", alias: ["商品编码", "编码"] },
  { name: "name", alias: ["商品名称", "名称"] },
  { name: "qty", alias: ["数量"], valueMapper: (v) => Number(v) },
  { name: "price", alias: ["单价", "价格"], valueMapper: (v) => Number(v) },
  { name: "remark", alias: ["备注"], optional: true },
];

const parser = createExcelJsImportParser();

/**
 * 批次大小选项：
 * - 1：逐行（等价于单条处理，批量模式的特例）
 * - 20 / 50：每次调用 process 处理一批
 * - 0：不限制（一次调用处理全部勾选行）
 */
const batchSizeOptions = [
  { value: 1, label: "逐行（batchSize=1）" },
  { value: 20, label: "每批 20 行" },
  { value: 50, label: "每批 50 行" },
  { value: 0, label: "一次全部" },
] as const;
const batchSizeChoice = ref<number>(50);

/** 记录每次 process 调用的批量（演示分批节奏） */
const batchCalls = ref<number[]>([]);

/** 模拟批量接口：一次接收一批行，随机耗时；编码含「E」的行标记失败（返回与输入等长同序的结果数组） */
const processBatch: ImportRowProcessor = async (batch) => {
  batchCalls.value.push(batch.length);
  await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 500));
  return batch.map((row): ImportRowResult =>
    String(row.data.code).includes("E")
      ? { status: "failed", message: `编码 ${row.data.code} 已存在，请更换后重试` }
      : { status: "success" },
  );
};

const lastSummary = ref<ImportProcessSummary | null>(null);

/** 批次大小：0 表示不限制 → 传一个足够大的数 */
const effectiveBatchSize = computed(() =>
  batchSizeChoice.value > 0 ? batchSizeChoice.value : Number.MAX_SAFE_INTEGER,
);

/** 传给组件的处理器：处理函数 + 批次大小（切换批次大小后实时生效） */
const processor = computed<ImportProcessor>(() => ({
  process: processBatch,
  batchSize: effectiveBatchSize.value,
}));

const batchCallsText = computed(() =>
  batchCalls.value.length > 0 ? batchCalls.value.join(" + ") : "",
);

/** 生成 120 行数据：约每 10 行混 1 个含 E 的编码（模拟部分失败） */
function buildBatchRows(): unknown[][] {
  const rows: unknown[][] = [];
  for (let i = 0; i < 120; i++) {
    const code = i % 10 === 4 ? `E${3001 + i}` : `B${3001 + i}`;
    rows.push([code, `批量商品 ${i + 1}`, (i % 20) + 1, Number((9.9 + (i % 50) * 7.5).toFixed(1)), `第 ${Math.floor(i / 20) + 1} 组`]);
  }
  return rows;
}

/** 下载 120 行测试数据 */
async function downloadDataset(): Promise<void> {
  const api = createExcelJsExportApiFunc()();
  const headerColumns: Column[] = ["商品编码", "商品名称", "数量", "单价", "备注"]
    .map((displayName) => ({ propertyPath: "", displayName }));
  await api.renderHeader({ 批量导入: headerColumns });
  await api.renderRows("批量导入", buildBatchRows());
  await api.download("商品导入-批量120行.xlsx");
}

function onProcessed(summary: ImportProcessSummary): void {
  lastSummary.value = summary;
}

function onLoaded(): void {
  batchCalls.value = [];
  lastSummary.value = null;
}
</script>

<template>
  <div class="import-page">
    <header class="import-page__head">
      <el-button link type="primary" @click="$emit('back')">&larr; 返回导航</el-button>
      <div class="import-page__title-row">
        <h1>Excel 批量导入（batchSize 分批）</h1>
        <el-button size="small" type="primary" plain @click="downloadDataset">
          下载测试数据（120 行）
        </el-button>
      </div>
      <p class="import-page__hint">
        后台提供批量接口时，一次调用即可处理多行。<code>processor.batchSize</code> 控制每次调用
        <code>processor.process</code> 携带的最大行数：批内所有行同时翻为「处理中」，
        process 返回与输入等长同序的结果数组（results[i] 对应 rows[i]）决定每行成功/失败。
        切换下方批次大小（支持「一次全部」）后点「开始处理」，观察处理中行的批量翻转与分批调用次数。
      </p>
      <div class="import-page__options">
        <span class="import-page__options-label">批次大小：</span>
        <el-radio-group v-model="batchSizeChoice" size="small">
          <el-radio-button v-for="opt in batchSizeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </el-radio-button>
        </el-radio-group>
        <span v-if="batchCallsText" class="import-page__calls">
          本轮 processor 调用 {{ batchCalls.length }} 次，各批行数：{{ batchCallsText }}
        </span>
      </div>
    </header>

    <el-alert
      v-if="lastSummary"
      class="import-page__alert"
      :title="`上一轮处理完成：共 ${lastSummary.total} 行，成功 ${lastSummary.success} 行，失败 ${lastSummary.failed} 行`"
      :type="lastSummary.failed === 0 ? 'success' : 'warning'"
      :closable="false"
      show-icon
    />

    <div class="import-page__body">
      <ys-import-excel
        :columns="columns"
        :parser="parser"
        :processor="processor"
        @loaded="onLoaded"
        @processed="onProcessed"
      />
    </div>
  </div>
</template>

<style scoped>
.import-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  box-sizing: border-box;
}

.import-page__head {
  flex-shrink: 0;
}

.import-page__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 8px 0;
}

.import-page__title-row h1 {
  margin: 0;
  font-size: 18px;
}

.import-page__hint {
  margin: 0 0 10px;
  color: #666;
  font-size: 0.92em;
  line-height: 1.6;
}

.import-page__options {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.import-page__options-label {
  font-size: 0.92em;
  color: #606266;
}

.import-page__calls {
  font-size: 0.88em;
  color: #409eff;
}

.import-page__alert {
  flex-shrink: 0;
  margin-bottom: 8px;
}

.import-page__body {
  flex: 1;
  min-height: 0;
}

code {
  background: #eef2f7;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
