<script setup lang="ts">
/**
 * 搜索面板 + 全功能表格 组合样式预览页：
 * 上方 YsFilterPanel（简单/高级可切换 + 快速查询标签），下方 YsTable 全功能：
 * 跨页勾选（checkbox）、表格/卡片/列表三种视图切换、列设置（localStorage 持久化）、
 * 导出 Excel（选中/当前页/所有）。本期数据不联动——筛选条件不重新查询表格，
 * 仅观察搜索区与列表区上下排列、以及表格全功能的整体视觉效果。
 */
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  constActions,
  constData,
  Operator,
  type Column,
  type EnumOption,
  type EnumOptionsSource,
  type RowActionsFunc,
  type TableApi,
  type ViewMode,
} from "@ys.knife.crud/core";
import {
  YsTable,
  YsFilterPanel,
  YsTextFilterItem,
  YsDateRangeFilterItem,
  YsEnumFilterItem,
  type SavedQuery,
} from "@ys.knife.crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { metaFun, manyRows, type UserRow } from "../shared/demoData";
import { useLocalCustomConfig } from "../shared/useLocalCustomConfig";
import { useSelectionViewer } from "../shared/useSelectionViewer";

defineEmits<{
  (e: "back"): void;
}>();

// 表格数据：固定 25 行，不与搜索面板联动（仅展示样式）
const dataFun = constData(manyRows);

const tableRef = ref<TableApi | null>(null);
const { showSelection } = useSelectionViewer(tableRef);

// 视图模式由外部 radio 受控驱动（v-model:view-mode）
const viewMode = ref<ViewMode>("table");

/** 跨页累计选中行数（expose 的 selectedRows 经 computed 访问，避免模板深层 ref 解包问题） */
const selectedCount = computed(() => (tableRef.value?.selectedRows ?? []).length);

// 列设置持久化（独立 key）
const { loadCustomConfigFun, saveCustomConfigFun } = useLocalCustomConfig(
  "yk-crud-demo-search-table-columns",
);

// 导出实现
const exportorFunc = createExcelJsExportApiFunc();

/* ---- 行操作（命令列）：查看恒可用；编辑 age>=20 可用；删除 id=1 受保护 ---- */
const rowActionsFunc: RowActionsFunc<UserRow> = constActions<UserRow>(
  {
    name: "view",
    desc: "查看",
    execute: (item) => {
      ElMessage.info(`查看：${item.name}（${item.email}，${item.age} 岁）`);
      return Promise.resolve();
    },
  },
  {
    name: "edit",
    desc: "编辑",
    enable: (item) => item.age >= 20,
    execute: (item) => {
      ElMessage.info(`编辑：${item.name}`);
      return Promise.resolve();
    },
  },
  {
    name: "delete",
    desc: "删除",
    show: (item) => item.id !== 1,
    execute: (item) => {
      ElMessage.success(`已删除：${item.name}`);
      return Promise.resolve();
    },
  },
);

/* ---- 命令面板（全局操作） ---- */
function onCreate(): void {
  ElMessage.success("新增（仅演示命令面板）");
}
function onBatchDelete(): void {
  const selected = (tableRef.value?.selectedRows ?? []) as UserRow[];
  if (selected.length === 0) {
    ElMessage.warning("请先勾选要删除的行");
    return;
  }
  ElMessage.success(`已删除选中的 ${selected.length} 行：${selected.map((r) => r.name).join("、")}`);
}
function onRefresh(): void {
  void tableRef.value?.reload();
  ElMessage.info("已刷新");
}

/* ---- 搜索面板 ---- */
// 快速查询标签（简单/高级共享，保存的预设点击直接触发查询）
const quickQueries = ref<SavedQuery[]>([]);

function loadStatusOptions(): Promise<EnumOption[]> {
  return Promise.resolve([
    { label: "在职", value: 1 },
    { label: "离职", value: 2 },
    { label: "试用", value: 3 },
  ]);
}

// 高级查询模式可用的字段
const advancedColumns: Column[] = [
  { propertyPath: "name", displayName: "姓名", dataTypeName: "string", showForDisplay: true },
  { propertyPath: "email", displayName: "邮箱", dataTypeName: "string", showForDisplay: true },
  { propertyPath: "age", displayName: "年龄", dataTypeName: "number", showForDisplay: true },
  { propertyPath: "createdAt", displayName: "创建时间", dataTypeName: "date", showForDisplay: true },
  { propertyPath: "status", displayName: "状态", dataTypeName: "string", showForDisplay: true },
];
const advancedOptionSources: Record<string, EnumOptionsSource> = { status: loadStatusOptions };
</script>

<template>
  <DemoPageLayout
    title="搜索面板 + 全功能表格（简单/高级 + 快速查询）"
    hint="上方 YsFilterPanel 开启简单↔高级切换与快速查询标签：简单模式放常用条件（姓名 contains、状态 equals、创建时间 between），点「高级」可自定义任意字段与操作符并保存为预设，保存后在简单模式点标签即查。下方 YsTable 全开：跨页勾选（checkbox）、表格/卡片/列表三视图切换、列设置（localStorage 持久化）、导出 Excel（选中/当前页/所有）。筛选条件暂不驱动表格查询，仅观察整体样式。"
    @back="$emit('back')"
  >
    <!-- 搜索面板：简单/高级切换 + 快速查询 -->
    <ys-filter-panel
      :enable-advanced-filter="true"
      :show-quick-query="true"
      v-model:quick-queries="quickQueries"
      :advanced-columns="advancedColumns"
      :advanced-option-sources="advancedOptionSources"
    >
      <ys-text-filter-item
        label="姓名"
        property-path="name"
        :op="Operator.Contains"
        placeholder="输入姓名片段"
      />
      <ys-enum-filter-item
        label="状态"
        property-path="status"
        :op="Operator.Equals"
        :options-source="loadStatusOptions"
        placeholder="选择状态"
      />
      <ys-date-range-filter-item
        label="创建时间"
        property-path="createdAt"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
      />
    </ys-filter-panel>

    <!-- 命令面板：左侧全局操作按钮，右侧视图切换 / 列设置 / 导出（全部为外部入口，经 TableApi 驱动） -->
    <div class="search-table-page__command-bar">
      <div class="search-table-page__command-left">
        <el-button type="primary" @click="onCreate">新增</el-button>
        <el-button type="danger" plain @click="onBatchDelete">批量删除</el-button>
        <el-button @click="showSelection">查看选中</el-button>
        <el-button @click="onRefresh">刷新</el-button>
      </div>
      <div class="search-table-page__command-right">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="table">表格</el-radio-button>
          <el-radio-button value="card">卡片</el-radio-button>
          <el-radio-button value="list">列表</el-radio-button>
        </el-radio-group>
        <el-button type="primary" plain @click="tableRef?.openConfigDialog()">⚙ 列设置</el-button>
        <el-button type="success" @click="tableRef?.openExportDialog()">⬇ 导出 Excel</el-button>
      </div>
    </div>

    <!-- 全功能表格（position:relative 供左下角选中操作条定位） -->
    <div class="search-table-page__table">
      <ys-table
        ref="tableRef"
        :meta-fun="metaFun"
        :data-fun="dataFun"
        v-model:view-mode="viewMode"
        :page-size="10"
        show-checkbox
        :load-custom-config-fun="loadCustomConfigFun"
        :save-custom-config-fun="saveCustomConfigFun"
        :export-page-size="100"
        :exportor-func="exportorFunc"
        :row-actions-func="rowActionsFunc"
      >
        <!-- 卡片视图内容 -->
        <template #card="{ row }">
          <div class="user-card">
            <div class="user-card__avatar">{{ (row as unknown as UserRow).name.slice(0, 1) }}</div>
            <div class="user-card__body">
              <div class="user-card__name">{{ (row as unknown as UserRow).name }}</div>
              <div class="user-card__email">{{ (row as unknown as UserRow).email }}</div>
              <el-tag size="small" type="info" effect="plain">
                {{ (row as unknown as UserRow).age }} 岁
              </el-tag>
            </div>
            <div class="user-card__id">#{{ (row as unknown as UserRow).id }}</div>
          </div>
        </template>

        <!-- 列表视图内容：横向单行 -->
        <template #list="{ row }">
          <div class="user-row">
            <div class="user-row__avatar">{{ (row as unknown as UserRow).name.slice(0, 1) }}</div>
            <span class="user-row__name">{{ (row as unknown as UserRow).name }}</span>
            <span class="user-row__email">{{ (row as unknown as UserRow).email }}</span>
            <el-tag size="small" type="info" effect="plain">
              {{ (row as unknown as UserRow).age }} 岁
            </el-tag>
            <span class="user-row__id">#{{ (row as unknown as UserRow).id }}</span>
          </div>
        </template>
      </ys-table>

      <!-- 左下角选中操作条：无选中时隐藏；贴表格容器底部左侧 -->
      <transition name="yk-fade">
        <div v-if="selectedCount > 0" class="search-table-page__selection-bar">
          <span class="search-table-page__selection-count">
            已选 <strong>{{ selectedCount }}</strong> 项
          </span>
          <el-button link type="primary" @click="tableRef?.clearSelection()">清空</el-button>
        </div>
      </transition>
    </div>
  </DemoPageLayout>
</template>

<style scoped>
/* 命令面板：搜索面板与表格之间的全局操作条 */
.search-table-page__command-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.search-table-page__command-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-table-page__command-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 表格容器：position:relative 供左下角选中操作条绝对定位 */
.search-table-page__table {
  position: relative;
}

/* 左下角选中操作条：贴表格容器底部左侧，悬浮于表格之上 */
.search-table-page__selection-bar {
  position: absolute;
  left: 8px;
  bottom: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  font-size: 0.92em;
  color: #409eff;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.search-table-page__selection-count strong {
  font-size: 1.05em;
  margin: 0 2px;
}

/* 选中条出现/消失过渡 */
.yk-fade-enter-active,
.yk-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.yk-fade-enter-from,
.yk-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* ---- 卡片视图 ---- */
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 24px; /* 给右上角 checkbox 留位 */
}

.user-card__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--el-color-primary, #409eff);
  color: #fff;
  font-size: 18px;
  line-height: 40px;
  text-align: center;
  flex-shrink: 0;
}

.user-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-card__name {
  font-weight: 600;
  font-size: 14px;
}

.user-card__email {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-card__id {
  font-size: 12px;
  color: #c0c4cc;
  flex-shrink: 0;
}

/* ---- 列表视图 ---- */
.user-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.user-row__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--el-color-primary, #409eff);
  color: #fff;
  font-size: 14px;
  line-height: 32px;
  text-align: center;
  flex-shrink: 0;
}

.user-row__name {
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.user-row__email {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-row__id {
  font-size: 12px;
  color: #c0c4cc;
  flex-shrink: 0;
}
</style>
