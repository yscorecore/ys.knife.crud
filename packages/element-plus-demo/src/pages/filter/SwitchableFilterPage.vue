<script setup lang="ts">
import { ref } from "vue";
import {
  type Column,
  type EnumOption,
  type EnumOptionsSource,
  Operator,
  constData,
  type TableApi,
} from "@ys.knife.crud/core";
import {
  type SavedQuery,
  YsFilterPanel,
  YsTextFilterItem,
  YsDateFilterItem,
  YsDateRangeFilterItem,
  YsEnumFilterItem,
  YsTable,
  YsCommandBar,
} from "@ys.knife.crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun } from "../shared/demoData";
import { useLocalCustomConfig } from "../shared/useLocalCustomConfig";
import { tableCommands } from "../shared/tableCommands";

defineEmits<{
  (e: "back"): void;
}>();

/** panel ref：经 expose 拿 filter（FilterInfo）、reset、mode */
const panelRef = ref<{
  filter: { toString(): string; isEmpty(): boolean };
  reset: () => void;
  mode: { value: "simple" | "advanced" };
} | null>(null);

const lastFilterString = ref<string>("");

/** 快速查询列表（v-model，简单模式和高级模式共享） */
const quickQueries = ref<SavedQuery[]>([]);

function disabledDateFn(d: Date): boolean {
  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 86400 * 1000);
  thirtyAgo.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);
  return d < thirtyAgo || d > now;
}

function onSearch(filter?: { toString(): string }): void {
  // 优先用事件参数（快速查询标签点击时传的是 sq.filterInfo）；
  // 无参数时（面板内回车/查询按钮）从 panelRef 读当前聚合 filter
  lastFilterString.value = (filter?.toString() ?? panelRef.value?.filter?.toString() ?? "") || "(empty)";
}

function onReset(): void {
  lastFilterString.value = "";
}

/* ---- 简单模式 filter items 的异步数据源 ---- */
async function loadStatusOptions(): Promise<EnumOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [
    { label: "Active", value: 1 },
    { label: "Inactive", value: 2 },
    { label: "Pending", value: 3 },
    { label: "Archived", value: 4 },
  ];
}

async function loadTagOptions(): Promise<EnumOption[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [
    { label: "开发", value: "dev" },
    { label: "设计", value: "design" },
    { label: "产品", value: "pm" },
    { label: "测试", value: "qa" },
  ];
}

/* ---- 高级查询模式所需的 columns / optionSources ---- */
const advancedColumns: Column[] = [
  { propertyPath: "name", displayName: "姓名", dataTypeName: "string", showForDisplay: true },
  { propertyPath: "email", displayName: "邮箱", dataTypeName: "string", showForDisplay: true },
  { propertyPath: "age", displayName: "年龄", dataTypeName: "number", showForDisplay: true },
  {
    propertyPath: "createdAt",
    displayName: "创建时间",
    dataTypeName: "date",
    showForDisplay: true,
  },
  {
    propertyPath: "enabled",
    displayName: "是否启用",
    dataTypeName: "boolean",
    showForDisplay: true,
  },
  {
    propertyPath: "status",
    displayName: "状态",
    dataTypeName: "string",
    showForDisplay: true,
  },
];

const advancedOptionSources: Record<string, EnumOptionsSource> = {
  status: loadStatusOptions,
};

/* ---------------- 全功能表格 ---------------- */

/** 25 行数据 + pageSize=10 → 3 页，可演示跨页勾选与「导出所有」 */
const dataFun = constData(manyRows);

const tableRef = ref<TableApi | null>(null);

/** 列设置持久化（独立 localStorage key，与其它演示页互不覆盖） */
const { loadCustomConfigFun, saveCustomConfigFun } = useLocalCustomConfig(
  "yk-crud-demo-switchable-filter-table",
);

/** 真实导出实现（ExcelJS），外部下拉按钮调 openExportDialog 后产出 xlsx */
const exportorFunc = createExcelJsExportApiFunc();
</script>

<template>
  <DemoPageLayout
    title="搜索面板 + 全功能表格（简单/高级 + 快速查询）"
    hint="YsFilterPanel 开启 enableAdvancedFilter + showQuickQuery：简单模式底部显示「快速查询」按钮（与高级模式保存的预设共享 v-model:quick-queries），切到高级模式编辑条件→保存命名预设→切回简单模式点按钮直接查询。下方表格隐藏了全部内置命令按钮（列设置/导出/视图切换/选中提示条），命令收敛到右上角图标下拉按钮；勾选行后选中提示条以流式布局追加到命令面板左侧，支持全选（当前页）/反选（当前页）/清空（含跨页）。"
    @back="$emit('back')"
  >
    <ys-filter-panel
      ref="panelRef"
      :enable-advanced-filter="true"
      :show-quick-query="true"
      v-model:quick-queries="quickQueries"
      :advanced-columns="advancedColumns"
      :advanced-option-sources="advancedOptionSources"
      @search="onSearch"
      @reset="onReset"
    >
      <ys-text-filter-item
        label="姓名（contains）"
        property-path="name"
        :op="Operator.Contains"
        placeholder="输入姓名片段"
      />
      <ys-text-filter-item
        label="邮箱（endswith）"
        property-path="email"
        :op="Operator.EndsWith"
        placeholder="输入邮箱后缀"
      />
      <ys-date-filter-item
        label="生日（equals）"
        property-path="birthDate"
        :op="Operator.Equals"
        placeholder="选择生日"
      />
      <ys-date-range-filter-item
        label="创建时间（between）"
        property-path="createdAt"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        :disabled-date="disabledDateFn"
      />
      <ys-enum-filter-item
        label="状态（equals）"
        property-path="status"
        :op="Operator.Equals"
        :options-source="loadStatusOptions"
        placeholder="选择状态"
      />
      <ys-enum-filter-item
        label="标签（in，多选）"
        property-path="tags"
        :op="Operator.In"
        :options-source="loadTagOptions"
        placeholder="选择标签（可多选）"
        multiple
      />
    </ys-filter-panel>

    <!-- 表格命令面板：YsCommandBar 数据驱动渲染表级命令（刷新/查看选中/新增/批量删除），
         内置选中提示条（table 有选中行时自动显示）+ 右侧表格操作下拉按钮 -->
    <YsCommandBar :actions="tableCommands" :table="tableRef" />

    <!-- 全功能表格：内置命令按钮全部关闭（showSelectionBar/showCustomConfig/showExportExcel
         均为 false，viewSwitchModes 保持默认空数组），命令全部由上方下拉按钮驱动；
         checkbox 列初始开启、视图初始表格——两者均非受控，由表格内部状态 + TableApi 切换 -->
    <ys-table
      ref="tableRef"
      :meta-fun="metaFun"
      :data-fun="dataFun"
      :page-size="10"
      show-checkbox
      :show-selection-bar="false"
      :show-custom-config="false"
      :show-export-excel="false"
      :load-custom-config-fun="loadCustomConfigFun"
      :save-custom-config-fun="saveCustomConfigFun"
      :exportor-func="exportorFunc"
    >
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
    </ys-table>

    <div class="switchable-filter-page__info">
      <p>
        当前模式：<code>{{ panelRef?.mode?.value ?? "simple" }}</code>
      </p>
      <p>
        当前 FilterInfo.toString()：
        <code>{{ panelRef?.filter?.toString() || "(empty)" }}</code>
      </p>
      <p v-if="lastFilterString">
        上次查询时提交的 FilterInfo：<code>{{ lastFilterString }}</code>
      </p>
      <p v-if="quickQueries.length">
        已保存的快速查询（{{ quickQueries.length }}）：<code>{{ quickQueries.map(q => `${q.name}${q.description ? `(${q.description})` : ""}`).join(", ") }}</code>
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

.switchable-filter-page__info {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 4px;
  font-size: 0.92em;
}

.switchable-filter-page__info p {
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
