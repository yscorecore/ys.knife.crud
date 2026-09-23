<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
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
  YsTableActionMenuButton,
} from "@ys.knife.crud/element-plus";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
import DemoPageLayout from "../shared/DemoPageLayout.vue";
import { manyRows, metaFun } from "../shared/demoData";
import { useLocalCustomConfig } from "../shared/useLocalCustomConfig";

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

/** 跨页累计选中数（模板 ref 自动解包 selectedRows） */
const selectedCount = computed(() => tableRef.value?.selectedRows.length ?? 0);

/* ---------------- 命令面板上的测试命令 ---------------- */

/** 刷新：重新加载表格元数据与数据 */
function onRefresh(): void {
  tableRef.value?.reload();
  ElMessage.success("已刷新表格数据");
}

/** 查看选中：提示当前跨页累计选中条数 */
function onViewSelected(): void {
  const n = tableRef.value?.selectedRows.length ?? 0;
  if (n === 0) {
    ElMessage.warning("当前未选中任何行");
    return;
  }
  ElMessage.info(`当前已跨页选中 ${n} 行`);
}

/** 新增（测试命令，仅演示命令面板入口，不做真实新增） */
function onAdd(): void {
  ElMessage.info("测试命令：新增（演示入口）");
}

/** 批量删除（测试命令）：无选中时拦截提示，有选中时给出条数反馈 */
function onBatchDelete(): void {
  const n = tableRef.value?.selectedRows.length ?? 0;
  if (n === 0) {
    ElMessage.warning("请先勾选要删除的行");
    return;
  }
  ElMessage.success(`测试命令：批量删除 ${n} 行（演示入口，未真实删除）`);
}
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

    <!-- 表格命令面板：流式布局。左侧组（测试命令 + 选中提示条）整组吸附右侧；
         表格操作下拉单独恒居最右，纯图标触发。宽度不足时整体自动换行仍保持右对齐 -->
    <div class="switchable-filter-page__commands">
      <!-- 左侧命令组：测试命令按钮（文字+图标）+ 选中提示条跟随其后；
           整组 margin-left:auto 推到右侧，但让出最右位置给表格操作下拉 -->
      <div class="page-commands__group">
        <el-button class="page-cmd-btn-text" @click="onRefresh">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="21 12 21 4 13 4" />
            <polyline points="3 12 3 20 11 20" />
            <path d="M21 4l-7.2 7.2a4 4 0 0 1-5.6 0L3 8" />
          </svg>
          <span>刷新</span>
        </el-button>
        <el-button class="page-cmd-btn-text" @click="onViewSelected">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>查看选中</span>
        </el-button>
        <el-button type="primary" class="page-cmd-btn-text" @click="onAdd">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>新增</span>
        </el-button>
        <el-button type="danger" plain class="page-cmd-btn-text" @click="onBatchDelete">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          <span>批量删除</span>
        </el-button>

        <!-- 自定义选中提示条：仅选择列开启（读表格实际状态）且有选中时出现，作为流式条目追加到命令组末尾 -->
        <div v-if="(tableRef?.selectable ?? false) && selectedCount > 0" class="page-selection-bar">
          <span class="page-selection-bar__count">已选择 {{ selectedCount }} 条</span>
          <span class="page-selection-bar__sep">|</span>
          <el-button link type="primary" class="page-selection-bar__btn"
            @click="tableRef?.selectAllOnPage()">全选</el-button>
          <el-button link type="primary" class="page-selection-bar__btn"
            @click="tableRef?.invertSelectionOnPage()">反选</el-button>
          <span class="page-selection-bar__sep">|</span>
          <el-button link type="primary" class="page-selection-bar__btn"
            @click="tableRef?.clearSelection()">清空</el-button>
        </div>
      </div>

      <!-- 表格操作菜单按钮：组件库内置（刷新 / 列设置 / 导出 / 视图切换 / 选择行 / 列宽拖动），
           只传 table；✓ 状态菜单弹出时动态读取，切换直接调 TableApi；
           单独恒居命令面板最右（margin-left:auto）。触发按钮可用 #trigger 插槽自定义 -->
      <YsTableActionMenuButton
        v-if="tableRef"
        :table="tableRef"
        class="page-commands__table-action"
      />
    </div>

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
.switchable-filter-page__commands {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 12px 0;
}

/* 命令组：测试命令按钮（文字+图标）+ 选中提示条。
   从左侧依次流式布局；表格操作下拉单独 margin-left:auto 推到面板最右端。
   宽度不足时整组自动换行，表格操作下拉恒居最右 */
.page-commands__group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

/* 文字+图标命令按钮：图标与文字间留 4px 间距，svg 不撑大按钮行高 */
.page-cmd-btn-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.page-cmd-btn-text svg {
  display: block;
  flex-shrink: 0;
}

/* 表格操作菜单组件：margin-left:auto 把它推到命令面板最右端，
   即使上面 .page-commands__group 因换行变多行，它仍恒定居最右
   （class 经 fallthrough 落到 TableActionMenu 根元素） */
.page-commands__table-action {
  margin-left: auto;
}

/* 自定义选中提示条（样式与内置 SelectionBar 对齐，作为流式条目追加到命令面板） */
.page-selection-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  font-size: 0.92em;
  line-height: 1;
  color: #409eff;
}

.page-selection-bar__count {
  line-height: 1;
}

.page-selection-bar__sep {
  color: #a0cfff;
  line-height: 1;
}

.page-selection-bar__btn {
  font-size: inherit;
  line-height: 1;
  padding: 0;
  height: auto;
  min-height: 0;
}

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
