<script setup lang="ts">
import { ref } from "vue";
import { constData, Operator } from "@ys.knife.crud/core";
import {
  type TablePageDataFun,
  YsTablePage,
  YsTextFilterItem,
} from "@ys.knife.crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun } from "../shared/demoData";
import { useLocalCustomConfig } from "../shared/useLocalCustomConfig";
import { tableCommands } from "../shared/tableCommands";

defineEmits<{
  (e: "back"): void;
}>();

/** YsTablePage 实例引用（暴露 table: TableApi / filterPanel: {filter, reset, mode}） */
const pageRef = ref<{
  table: { selectedRows: unknown[]; reload: () => void; refresh: () => void } | null;
  filterPanel: { filter: { toString(): string; isEmpty(): boolean }; mode: { value: "simple" | "advanced" }; reset: () => void } | null;
} | null>(null);

const lastFilterString = ref<string>("");

/** 列设置持久化（独立 localStorage key，与其它演示页互不覆盖） */
const { loadCustomConfigFun, saveCustomConfigFun } = useLocalCustomConfig(
  "yk-crud-demo-table-page",
);

/** 真实导出实现（ExcelJS），commandBar 操作下拉的「导出 Excel」经 TableApi 驱动 */
const exportorFunc = createExcelJsExportApiFunc();

/**
 * 解析单条件 FilterInfo.toString()（"name contains VALUE"）中的 contains 值。
 * core 未公开 FilterInfo 求值器，demo 仅演示简单模式姓名过滤——真实项目里 dataFun
 * 通常把 filter 透传给后端，不在前端求值。
 */
function extractContains(s: string): string {
  const m = /contains\s+(.+)$/i.exec(s);
  return m?.[1]?.trim() ?? "";
}

/**
 * 增强签名 dataFun：(req, filter, signal) => Promise<PagedList>。
 * YsTablePage 自动把 filterPanel 的查询条件注入 filter 参数，并回第 1 页重载。
 * 这里按 name contains 在前端过滤 manyRows，证明 filter→table 自动联动。
 */
const dataFun: TablePageDataFun = (req, filter, signal) => {
  const rows = filter.isEmpty()
    ? manyRows
    : manyRows.filter((r) => r.name.includes(extractContains(filter.toString())));
  return constData(rows)(req, signal);
};

/** 搜索事件：YsTablePage 已据此重载表格，这里仅记录 filter 字符串用于展示 */
function onSearch(filter: { toString(): string; isEmpty(): boolean }): void {
  lastFilterString.value = filter.isEmpty() ? "(empty)" : filter.toString();
}

function onReset(): void {
  lastFilterString.value = "";
}
</script>

<template>
  <DemoPageLayout
    title="查询 + 命令 + 表格三合一（YsTablePage 自动联动）"
    hint="YsTablePage 把 YsFilterPanel + YsCommandBar + YsTable 收敛为一个组件，并自动接好 filterPanel 的查询条件到 table 的数据加载：dataFun 用增强签名 (req, filter, signal)，搜索 / 重置时自动回第 1 页重载。commandBar 左侧表级命令 + 内置选中提示条，右侧表格操作下拉（刷新/导出/列设置/视图切换/选择行/列宽拖动）。姓名框输入片段（如 User1、5）→ 回车或点查询，表格仅显示匹配行并回第 1 页。"
    @back="$emit('back')"
  >
    <ys-table-page
      ref="pageRef"
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :actions="tableCommands"
      :load-custom-config-fun="loadCustomConfigFun"
      :save-custom-config-fun="saveCustomConfigFun"
      :exportor-func="exportorFunc"
      :page-size="10"
      show-checkbox
      @search="onSearch"
      @reset="onReset"
    >
      <!-- filter items：经 YsTablePage 默认插槽透传给 filterPanel -->
      <ys-text-filter-item
        label="姓名（contains）"
        property-path="name"
        :op="Operator.Contains"
        placeholder="输入姓名片段，如 User1、5"
      />

      <template #card="{ row }">
        <div class="user-card">
          <div class="user-card__name">{{ row.name }} <span class="user-card__id">#{{ row.id }}</span></div>
          <div class="user-card__meta">{{ row.email }} · {{ row.age }} 岁</div>
        </div>
      </template>
      <template #list="{ row }">
        <div class="user-card">
          <span class="user-card__name">{{ row.name }}</span>
          <span class="user-card__meta">{{ row.email }} · {{ row.age }} 岁 · #{{ row.id }}</span>
        </div>
      </template>
    </ys-table-page>

    <div class="table-page-demo__info">
      <p>
        当前 FilterInfo.toString()：
        <code>{{ pageRef?.filterPanel?.filter?.toString() || "(empty)" }}</code>
      </p>
      <p v-if="lastFilterString">
        上次查询提交的 FilterInfo：<code>{{ lastFilterString }}</code>
      </p>
    </div>
  </DemoPageLayout>
</template>

<style scoped>
/* 卡片 / 列表视图的简单内容 */
.user-card__name {
  font-weight: 600;
}

.user-card__id {
  margin-left: 4px;
  color: #909399;
  font-weight: 400;
  font-size: 0.85em;
}

.user-card__meta {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.table-page-demo__info {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 4px;
  font-size: 0.92em;
}

.table-page-demo__info p {
  margin: 4px 0;
  color: var(--el-text-color-regular, #606266);
}

code {
  background: #eef2f7;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
