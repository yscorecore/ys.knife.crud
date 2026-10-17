<script setup lang="ts">
import { ref } from "vue";
import { constData } from "@ys-knife-crud/core";
import { YsInfiniteList } from "@ys-knife-crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys-knife-crud/export-exceljs";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { createBigRows, metaFun } from "../shared/demoData";

defineEmits<{
  (e: "back"): void;
}>();

/**
 * YsInfiniteList 演示：与 YsTable 共用 dataFun: PageFunc 数据契约，
 * 滚动到底部（threshold 提前量）自动追加下一页，直到 hasNext=false。
 * 100 行数据、每页 10 条 → 可连续加载 10 页。
 * showCheckbox 演示行选中：选中跨页累计（滚动加载更多不丢失），
 * 工具栏经 ref 调全选已加载 / 反选 / 清空，选中变化经 selection-change 同步。
 * 导出 Excel：传入 metaFun + exportorFunc（ExcelJS 实现），外部按钮调
 * openExportDialog()，三档范围——选中 / 当前已加载（替代 YsTable 的「当前页」）/ 所有数据。
 */
const dataFun = constData(createBigRows(100, "User"));
const exportorFunc = createExcelJsExportApiFunc();

const listRef = ref<InstanceType<typeof YsInfiniteList> | null>(null);

/** 记录加载轨迹，验证分批追加与 data-loaded 事件 */
const loadLog = ref<string[]>([]);
function onDataLoaded(limit: number, offset: number, count: number, isAppend: boolean): void {
  loadLog.value.unshift(
    `${isAppend ? "追加" : "首屏"} offset=${offset} limit=${limit} 本次 ${count} 行`,
  );
  if (loadLog.value.length > 6) loadLog.value.pop();
}

/** selection-change 同步的已选行 */
const selectedRows = ref<Record<string, unknown>[]>([]);
function onSelectionChange(rows: unknown[]): void {
  selectedRows.value = rows as Record<string, unknown>[];
}

function selectAllLoaded(): void {
  listRef.value?.selectAllOnPage();
}
function invertSelection(): void {
  listRef.value?.invertSelectionOnPage();
}
function clearSelection(): void {
  listRef.value?.clearSelection();
}
function openExportDialog(): void {
  listRef.value?.openExportDialog();
}
</script>

<template>
  <DemoPageLayout
    title="无限滚动列表（YsInfiniteList）"
    hint="与 YsTable 共用 dataFun: PageFunc 契约；滚动到距底部 100px 时自动加载下一页并追加，直到没有更多。IntersectionObserver 触底检测，移动端 / 桌面端通用；每项经 #default 插槽渲染，showCheckbox 时行首出现 checkbox，选中跨页累计。导出 Excel 与 YsTable 同一套对话框，三档范围——选中 / 当前已加载（替代 YsTable 的「当前页」）/ 所有数据。"
    @back="$emit('back')"
  >
    <div class="list-toolbar">
      <span class="selected-count">已选 {{ selectedRows.length }} 项<template v-if="selectedRows.length > 0">：{{ selectedRows.map((r) => r.name).join("、") }}</template></span>
      <el-button type="success" @click="openExportDialog">⬇ 导出 Excel</el-button>
      <el-button size="small" @click="selectAllLoaded">全选已加载</el-button>
      <el-button size="small" @click="invertSelection">反选</el-button>
      <el-button size="small" :disabled="selectedRows.length === 0" @click="clearSelection">清空</el-button>
    </div>
    <div class="list-wrap">
      <ys-infinite-list
        ref="listRef"
        :data-fun="dataFun"
        :meta-fun="metaFun"
        :exportor-func="exportorFunc"
        :page-size="10"
        :threshold="100"
        show-checkbox
        @data-loaded="(paged, append) => onDataLoaded(paged.limit, paged.offset, paged.items.length, append)"
        @selection-change="onSelectionChange"
      >
        <template #default="{ row, index }">
          <div class="row-card">
            <span class="row-index">{{ index + 1 }}</span>
            <div class="row-main">
              <div class="row-name">{{ row.name }}</div>
              <div class="row-sub">{{ row.email }} · {{ row.age }} 岁</div>
            </div>
          </div>
        </template>
      </ys-infinite-list>
    </div>
    <p class="load-log">加载轨迹（最近 6 次）：{{ loadLog.join("；") || "（暂无）" }}</p>
  </DemoPageLayout>
</template>

<style scoped>
.list-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.selected-count {
  margin-right: auto;
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
}

.list-wrap {
  height: 60vh;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 6px;
}

/* 行卡片：与表格列表视图的行样式风格一致 */
.row-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.row-index {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--el-fill-color, #f0f2f5);
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
}

.row-main {
  flex: 1;
  min-width: 0;
}

.row-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary, #303133);
}

.row-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.load-log {
  margin-top: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}
</style>
