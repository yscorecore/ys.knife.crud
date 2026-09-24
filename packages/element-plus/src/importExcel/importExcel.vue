<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, toRef, watch } from "vue";
import { ElMessage, ElMessageBox, type TableInstance } from "element-plus";
import { useImportExcel } from "@ys.knife.crud/vue";
import type {
  DataColumn,
  ImportParser,
  ImportProcessSummary,
  ImportRow,
  ImportRowProcessor,
  ImportRowStatus,
} from "@ys.knife.crud/core";

/**
 * YsImportExcel —— Excel 数据导入组件。
 *
 * 流程：点击「选择 Excel 文件」（或外部经 ref 调 openFilePicker()）手动选文件
 * → parser 解析第一个工作表 → 按 columns（position → name → alias）映射并逐行校验
 * → 表格展示全部行（不分页）：checkbox 列与行号列（数据序号，从 1 开始）固定在左侧，
 * 状态列固定在右侧，valid 行默认勾选、invalid 行禁止勾选
 * → 点击「开始处理」串行调用 processor 逐行处理，
 * 状态列实时翻转为 处理中 / 成功 / 失败（失败原因回显）。
 * 校验失败/处理失败的行提供操作列：弹窗编辑（保存时重新 valueMapper + validator，
 * 通过后翻为待处理并自动勾选，可再次提交）或删除该行；处理进行中操作禁用。
 *
 * 组件不绑定任何 Excel 解析库：parser（如 createExcelJsImportParser()）与
 * processor（业务接口）均由外部注入。
 *
 * autoScroll（默认 true）：逐行处理时自动垂直滚动，把当前「处理中」的行保持在
 * 表格可视区中部；不需要该行为时传 false。
 * 处理中在工具栏下方显示进度条（本轮 done/total + 成功/失败）与按平均行耗时
 * 推算的预计剩余时间；处理结束进度条自动隐藏。
 */
const props = withDefaults(
  defineProps<{
    columns: DataColumn[];
    processor: ImportRowProcessor;
    parser: ImportParser;
    accept?: string;
    autoScroll?: boolean;
  }>(),
  { accept: ".xlsx", autoScroll: true },
);

const emit = defineEmits<{
  (e: "loaded", rows: ImportRow[]): void;
  (e: "selection-change", rows: ImportRow[]): void;
  (e: "processed", summary: ImportProcessSummary): void;
  (e: "row-update", row: ImportRow): void;
  (e: "row-remove", row: ImportRow): void;
}>();

const {
  rows,
  fileName,
  sheetName,
  loading,
  processing,
  processingTotal,
  progressDone,
  progressSuccess,
  progressFailed,
  hasData,
  invalidCount,
  successCount,
  failedCount,
  selectedCount,
  pendingCount,
  loadFile,
  syncSelection,
  saveRowEdit,
  removeRow,
  startProcessing,
  clear,
} = useImportExcel({
  columns: toRef(props, "columns"),
  processor: toRef(props, "processor"),
  parser: toRef(props, "parser"),
});

const tableRef = ref<TableInstance>();
const fileInputRef = ref<HTMLInputElement>();

/** 状态标签的文案与配色（ImportRowStatus → 展示元数据） */
const statusMeta: Record<ImportRowStatus, { label: string; type: "info" | "danger" | "warning" | "success" }> = {
  valid: { label: "待处理", type: "info" },
  invalid: { label: "校验失败", type: "danger" },
  processing: { label: "处理中", type: "warning" },
  success: { label: "成功", type: "success" },
  failed: { label: "失败", type: "danger" },
};

/**
 * 把指定行垂直滚动到表格可视区中部（处理时自动跟随当前 processing 行）。
 * 用 getBoundingClientRect 计算行与滚动容器的相对偏移，再经 setScrollTop 定位，
 * 兼容 el-table 的 el-scrollbar 结构；横向滚动位置不受影响。
 */
function scrollRowToCenter(rowNumber: number): void {
  if (!props.autoScroll) return;
  const tableEl = tableRef.value?.$el as HTMLElement | undefined;
  const wrap = tableEl?.querySelector(".el-table__body-wrapper .el-scrollbar__wrap") as
    | HTMLElement
    | null;
  const tbody = tableEl?.querySelector(".el-table__body-wrapper tbody");
  if (!tableEl || !wrap || !tbody) return;

  const index = rows.value.findIndex((r) => r.rowNumber === rowNumber);
  const tr = tbody.querySelectorAll<HTMLElement>("tr")[index];
  if (!tr) return;

  const wrapRect = wrap.getBoundingClientRect();
  const rowRect = tr.getBoundingClientRect();
  // 目标：让该行垂直居中；clamp 到 [0, 可滚动上限]
  const maxScrollTop = Math.max(0, wrap.scrollHeight - wrap.clientHeight);
  const target = wrap.scrollTop
    + (rowRect.top - wrapRect.top)
    - (wrap.clientHeight - rowRect.height) / 2;
  tableRef.value?.setScrollTop(Math.min(maxScrollTop, Math.max(0, Math.round(target))));
}

// 当前处理行（同一时刻只有一个 processing）切换时，等状态渲染后滚动到可视区中部
watch(
  () => rows.value.find((r) => r.status === "processing")?.rowNumber ?? null,
  (rowNumber) => {
    if (rowNumber !== null) {
      void nextTick(() => scrollRowToCenter(rowNumber));
    }
  },
);

// ---------------- 处理进度条 + 预估剩余时间（仅处理中显示） ----------------

/** 本轮开始时间戳；每 500ms 跳动一次的 now 驱动 ETA 文案平滑更新 */
const progressStartedAt = ref(0);
const nowTick = ref(0);
let progressTimer: ReturnType<typeof setInterval> | undefined;

const progressPercent = computed(() => {
  const total = processingTotal.value;
  if (total <= 0) return 0;
  return Math.min(100, (progressDone.value / total) * 100);
});

/** 进度条内文案：已完成数/总数（覆盖默认的百分比文本） */
function formatProgressText(): string {
  return `${progressDone.value}/${processingTotal.value}`;
}

/** 预估剩余时间：已用时间 / 已完成行数 × 剩余行数；首行完成前无样本，显示「计算中」 */
const etaText = computed(() => {
  if (!processing.value || progressDone.value === 0) return "预计剩余 计算中…";
  const elapsed = nowTick.value - progressStartedAt.value;
  const avgPerRow = elapsed / progressDone.value;
  const remainingRows = processingTotal.value - progressDone.value;
  return `预计剩余 ${formatDuration(avgPerRow * remainingRows)}`;
});

/** 毫秒 → 友好时长：<1 分钟按秒，否则 分:秒（秒数向上取整，避免末行长时间显示 0 秒） */
function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds} 秒`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes} 分 ${seconds} 秒` : `${minutes} 分`;
}

watch(processing, (active) => {
  if (active) {
    progressStartedAt.value = Date.now();
    nowTick.value = progressStartedAt.value;
    progressTimer = setInterval(() => {
      nowTick.value = Date.now();
    }, 500);
  } else {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = undefined;
    }
  }
});

onBeforeUnmount(() => {
  if (progressTimer) clearInterval(progressTimer);
});

/** 打开系统文件选择框 */
function openFilePicker(): void {
  fileInputRef.value?.click();
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // 立即清空 value：否则选同一个文件不会再次触发 change
  input.value = "";
  if (!file) return;

  try {
    const loaded = await loadFile(file);
    emit("loaded", loaded);
    // composable 已把 valid 行置为 selected，这里同步 el-table 的勾选 UI
    await nextTick();
    for (const row of rows.value) {
      if (row.status !== "invalid") {
        tableRef.value?.toggleRowSelection(row, true);
      }
    }
    ElMessage.success(`已加载 ${loaded.length} 行（工作表「${sheetName.value}」）`);
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e));
  }
}

function onSelectionChange(selected: ImportRow[]): void {
  syncSelection(selected);
  emit("selection-change", selected);
}

/** 校验失败行禁止勾选，其余行（含失败待重试）均可勾选 */
function isRowSelectable(row: ImportRow): boolean {
  return row.status !== "invalid";
}

async function onStartProcessing(): Promise<void> {
  try {
    const summary = await startProcessing();
    if (!summary) return;
    emit("processed", summary);
    if (summary.failed === 0) {
      ElMessage.success(`全部处理完成，共 ${summary.success} 行`);
    } else {
      ElMessage.warning(`处理完成：成功 ${summary.success} 行，失败 ${summary.failed} 行`);
    }
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : String(e));
  }
}

/** 单元格值展示：对象序列化，其余直接转字符串 */
function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// ---------------- 失败行的编辑 / 删除 ----------------

/** 仅校验失败、处理失败的行允许编辑/删除；处理进行中统一禁用避免与串行处理互相干扰 */
function canEditRow(row: ImportRow): boolean {
  return !processing.value && (row.status === "invalid" || row.status === "failed");
}

const editVisible = ref(false);
const editingRow = ref<ImportRow | null>(null);
/** 编辑表单（输入框统一为字符串，保存时再走各列 valueMapper 转换） */
const editForm = ref<Record<string, string>>({});
/** 本次保存的校验错误（仍有错误时弹窗不关闭，就地提示） */
const editErrors = ref<string[]>([]);

function startEdit(row: ImportRow): void {
  if (!canEditRow(row)) return;
  editingRow.value = row;
  editErrors.value = [];
  const form: Record<string, string> = {};
  for (const col of props.columns) {
    form[col.name] = formatCell(row.data[col.name]);
  }
  editForm.value = form;
  editVisible.value = true;
}

/** 保存编辑：重新走 valueMapper + validator；通过则翻为待处理并自动勾选 */
async function onSaveEdit(): Promise<void> {
  const row = editingRow.value;
  if (!row) return;
  const inputs: Record<string, unknown> = {};
  for (const col of props.columns) {
    inputs[col.name] = editForm.value[col.name] ?? "";
  }
  const { row: updated, errors } = saveRowEdit(row, inputs);
  editErrors.value = errors;
  if (errors.length > 0) return;

  // 校验通过：关闭弹窗并同步 el-table 勾选（invalid 行此前是禁选未勾选状态）
  editVisible.value = false;
  editingRow.value = null;
  emit("row-update", updated);
  await nextTick();
  tableRef.value?.toggleRowSelection(updated, true);
  ElMessage.success(`第 ${updated.rowNumber} 行已修正，可重新处理`);
}

function cancelEdit(): void {
  editVisible.value = false;
  editingRow.value = null;
  editErrors.value = [];
}

async function onRemoveRow(row: ImportRow): Promise<void> {
  if (!canEditRow(row)) return;
  try {
    await ElMessageBox.confirm(
      `确定删除第 ${row.rowNumber} 行吗？删除后不可恢复。`,
      "删除数据行",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" },
    );
  } catch {
    return; // 用户取消
  }
  removeRow(row);
  emit("row-remove", row);
  ElMessage.success(`已删除第 ${row.rowNumber} 行`);
}

defineExpose({ openFilePicker, startProcessing: onStartProcessing, clear });
</script>

<template>
  <div class="yk-import-excel">
    <input
      ref="fileInputRef"
      class="yk-import-excel__file"
      type="file"
      :accept="props.accept"
      @change="onFileChange"
    />

    <div class="yk-import-excel__toolbar">
      <el-button type="primary" :loading="loading" @click="openFilePicker">
        选择 Excel 文件
      </el-button>
      <el-button
        type="success"
        :loading="processing"
        :disabled="pendingCount === 0"
        @click="onStartProcessing"
      >
        开始处理{{ pendingCount > 0 ? `（${pendingCount} 行）` : "" }}
      </el-button>
      <el-button :disabled="!hasData || processing" @click="clear">清空</el-button>
      <span v-if="fileName" class="yk-import-excel__file-name" :title="fileName">
        📄 {{ fileName }}<template v-if="sheetName">（工作表：{{ sheetName }}）</template>
      </span>

      <div v-if="hasData" class="yk-import-excel__stats">
        <span>共 {{ rows.length }} 行</span>
        <span>已选 {{ selectedCount }}</span>
        <span class="yk-import-excel__stat--danger">校验失败 {{ invalidCount }}</span>
      </div>
    </div>

    <!-- 处理进度条：仅处理中展示，处理完成（成功/失败落定）即隐藏 -->
    <div v-if="processing" class="yk-import-excel__progress">
      <el-progress
        :percentage="progressPercent"
        :stroke-width="14"
        text-inside
        :format="formatProgressText"
        class="yk-import-excel__progress-bar"
      />
      <span class="yk-import-excel__progress-meta">
        成功 {{ progressSuccess }}<span class="yk-import-excel__stat--danger"> / 失败 {{ progressFailed }}</span>
      </span>
      <span class="yk-import-excel__progress-eta">{{ etaText }}</span>
    </div>

    <div v-loading="loading" class="yk-import-excel__body">
      <el-table
        v-if="hasData"
        ref="tableRef"
        :data="rows"
        height="100%"
        row-key="rowNumber"
        border
        stripe
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="44" fixed="left" :selectable="isRowSelectable" />
        <!-- 数据序号（从 1 开始，与是否有表头/空行无关）；title 保留真实 Excel 行号便于溯源 -->
        <el-table-column label="行号" width="70" align="center" fixed="left">
          <template #default="{ row, $index }">
            <span :title="`Excel 第 ${(row as ImportRow).rowNumber} 行`">{{ $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column
          v-for="col in props.columns"
          :key="col.name"
          :label="col.name"
          min-width="120"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ formatCell(row.data[col.name]) }}</template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="200"
          fixed="right"
          class-name="yk-import-excel__status-cell"
        >
          <template #default="{ row }">
            <el-tag :type="statusMeta[(row as ImportRow).status].type" size="small" disable-transitions>
              <span v-if="(row as ImportRow).status === 'processing'" class="yk-import-excel__spin" />
              {{ statusMeta[(row as ImportRow).status].label }}
            </el-tag>
            <div
              v-if="(row as ImportRow).status === 'invalid'"
              class="yk-import-excel__msg yk-import-excel__msg--danger"
            >
              {{ (row as ImportRow).errors.join("；") }}
            </div>
            <div
              v-else-if="(row as ImportRow).message"
              class="yk-import-excel__msg"
              :class="{ 'yk-import-excel__msg--danger': (row as ImportRow).status === 'failed' }"
            >
              {{ (row as ImportRow).message }}
            </div>
          </template>
        </el-table-column>
        <!-- 操作列：仅校验失败/处理失败行提供编辑、删除，处理中禁用 -->
        <el-table-column label="操作" width="110" fixed="right" align="center">
          <template #default="{ row }">
            <template v-if="canEditRow(row as ImportRow)">
              <el-button link type="primary" size="small" @click="startEdit(row as ImportRow)">
                编辑
              </el-button>
              <el-button link type="danger" size="small" @click="onRemoveRow(row as ImportRow)">
                删除
              </el-button>
            </template>
            <span v-else class="yk-import-excel__action-placeholder">—</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="请选择 Excel 文件加载数据" />
    </div>

    <!-- 失败行编辑弹窗：保存时按列定义重新转换/校验，通过后翻为待处理并勾选 -->
    <el-dialog
      v-model="editVisible"
      :title="editingRow ? `编辑第 ${editingRow.rowNumber} 行` : '编辑数据行'"
      width="480px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-alert
        v-if="editErrors.length > 0"
        class="yk-import-excel__edit-alert"
        type="error"
        :closable="false"
        show-icon
      >
        <div v-for="(err, i) in editErrors" :key="i">{{ err }}</div>
      </el-alert>
      <el-form label-width="92px" @submit.prevent>
        <el-form-item
          v-for="col in props.columns"
          :key="col.name"
          :label="col.name"
          :required="!col.optional"
        >
          <el-input v-model="editForm[col.name]" :placeholder="col.optional ? '可留空' : `请输入${col.name}`" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelEdit">取消</el-button>
        <el-button type="primary" @click="onSaveEdit">保存并重新校验</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.yk-import-excel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 320px;
}

.yk-import-excel__file {
  display: none;
}

.yk-import-excel__toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 8px 0;
}

.yk-import-excel__file-name {
  color: #606266;
  font-size: 0.92em;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.yk-import-excel__stats {
  margin-left: auto;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;
  color: #606266;
  font-size: 0.9em;
}

.yk-import-excel__stat--danger,
.yk-import-excel__msg--danger {
  color: #f56c6c;
}

.yk-import-excel__progress {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0 8px;
  font-size: 0.9em;
  color: #606266;
}

.yk-import-excel__progress-bar {
  flex: 1;
  max-width: 480px;
}

.yk-import-excel__progress-eta {
  color: #409eff;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.yk-import-excel__body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.yk-import-excel__body .el-table {
  width: 100%;
}

.yk-import-excel__body .el-empty {
  margin: auto;
}

/* 状态列允许错误信息换行完整展示（el-table 默认单行省略） */
.yk-import-excel__body :deep(.yk-import-excel__status-cell .cell) {
  white-space: normal;
  word-break: break-word;
  line-height: 1.5;
}

.yk-import-excel__msg {
  margin-top: 2px;
  font-size: 12px;
  color: #606266;
}

/* 处理中标签内的 CSS 转圈（不依赖图标库，currentColor 跟随标签文字色） */
.yk-import-excel__spin {
  display: inline-block;
  width: 11px;
  height: 11px;
  margin-right: 4px;
  vertical-align: -2px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: yk-import-excel-spin 0.8s linear infinite;
}

@keyframes yk-import-excel-spin {
  to {
    transform: rotate(360deg);
  }
}

.yk-import-excel__action-placeholder {
  color: #c0c4cc;
}

.yk-import-excel__edit-alert {
  margin-bottom: 12px;
}
</style>
