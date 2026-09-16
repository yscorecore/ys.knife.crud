<script setup lang="ts">
import { computed, onMounted, ref, watch, type PropType, type Ref } from "vue";
import type {
  Action,
  ExportApi,
  Meta,
  PagedList,
  TableApi,
  TableProps as CoreTableProps,
} from "@ys.knife.crud/core";
import { createExcelJsExportApiFunc } from "@ys.knife.crud/export-exceljs";
import { useCustomConfig } from "./useCustomConfig";

/**
 * Table 组件的 props = core 的 TableProps（metaFun + dataFun），
 * 另加展示相关的可选字段。
 * - metaFun：异步获取列定义（Meta）
 * - dataFun：异步获取分页数据（PagedList），表格渲染其 items
 *
 * 注意：这里刻意用「运行时 props 声明 + PropType」，而不是
 * `defineProps<Props extends CoreTableProps>()` 类型语法。
 * 原因：SFC 编译器把类型转成运行时 props 声明时，对跨包 re-export 的类型
 * （如 core 从 ys.knife.query.js 转出的 PageFunc）解析失败时会静默丢弃
 * 该 prop 成员，导致父组件传入的 dataFun 变成 fallthrough attribute，
 * 组件内 props.dataFun 为 undefined。运行时声明不依赖类型静态分析，无此问题。
 */
const props = defineProps({
  metaFun: { type: Function as PropType<CoreTableProps["metaFun"]>, required: true },
  dataFun: { type: Function as PropType<CoreTableProps["dataFun"]>, required: true },
  /** 可选。存在时在每一行最后一列显示可执行的操作 */
  rowActionsFunc: { type: Function as PropType<NonNullable<CoreTableProps["rowActionsFunc"]>>, required: false },
  /** 每页条数，默认 20；数据超过一页时表格下方自动出现分页组件 */
  pageSize: { type: Number, default: 20 },
  /** 分页组件「每页条数」下拉的可选项，默认 [10, 20, 50, 100] */
  pageSizes: { type: Array as PropType<number[]>, default: () => [10, 20, 50, 100] },
  /** 为 true 时第一列显示 checkbox（表头含全选/取消全选），默认 false */
  showCheckbox: { type: Boolean, default: false },
  /** 为 true 时显示「列设置」入口，用户可自定义列的显隐、顺序与宽度，默认 false */
  showCustomConfig: { type: Boolean, default: false },
  /** 加载自定义配置（含列设置与用户默认分页大小；返回 null 按空配置处理） */
  loadCustomConfigFun: { type: Function as PropType<NonNullable<CoreTableProps["loadCustomConfigFun"]>>, required: false },
  /** 保存自定义配置（含列设置与用户默认分页大小） */
  saveCustomConfigFun: { type: Function as PropType<NonNullable<CoreTableProps["saveCustomConfigFun"]>>, required: false },
  /** 为 true 时显示导出 Excel 入口，默认 false */
  showExportExcel: { type: Boolean, default: false },
  /** 导出实现工厂：每次导出调用它得到一个全新的 ExportApi 实例，组件只经该接口写文件。
   *  缺省使用内置 ExcelJS 实现（createExcelJsExportApiFunc）；
   *  将来可替换为其它实现（CSV、服务端导出等），组件无需改动 */
  exportApiFunc: { type: Function as PropType<NonNullable<CoreTableProps["exportApiFunc"]>>, required: false },
  /** 外部加载态，会和组件内部加载态合并 */
  loading: { type: Boolean, default: false },
  /** 行 key，默认 "id" */
  rowKey: { type: String, default: "id" },
});

const meta = ref<Meta | null>(null);
const paged = ref<PagedList<unknown> | null>(null);
const actions = ref<Action<unknown>[]>([]);
const metaLoading = ref(false);
const dataLoading = ref(false);
const actionsLoading = ref(false);
/** 当前页码（1 基），翻页时驱动 dataFun 的 offset */
const currentPage = ref(1);
/** 当前生效的每页条数：初始取 pageSize prop，用户可在分页组件里切换 */
const innerPageSize = ref(props.pageSize);
/** checkbox 列当前选中的行（showCheckbox 为 true 时由 el-table 的 selection-change 维护；
 *  配合 selection 列的 reserve-selection，翻页后选中按 rowKey 跨页保留，此处为跨页累计值） */
const selectedRows = ref<unknown[]>([]);
/** el-table 实例引用（用于 clearSelection 等方法） */
const tableEl = ref<{ clearSelection?: () => void } | null>(null);

/** 列自定义配置（显隐/顺序/宽度 + 用户默认分页大小）与列设置面板逻辑 */
const {
  columns,
  columnWidth,
  loadCustomConfigs,
  savePageSize,
  configDialogVisible,
  draftColumns,
  openConfigDialog,
  moveDraft,
  saveConfigDialog,
} = useCustomConfig(props, meta, innerPageSize);

/** 当前页行数据，来自 dataFun 返回的 PagedList.items */
const rows = computed(() => (paged.value?.items ?? []) as Record<string, unknown>[]);

/** 总条数：优先 totalCount，缺失时按当前页 items 估算（hasNext 表示至少还有一页） */
const total = computed(() => {
  const p = paged.value;
  if (!p) return 0;
  if (p.totalCount != null) return p.totalCount;
  return p.offset + p.items.length + (p.hasNext ? 1 : 0);
});

/** 数据超过一页（或已知还有下一页）时自动显示分页组件。
 *  阈值取「当前每页条数」与「可选条数最小值」的较小者：
 *  用户把每页调大（如 100）后即使一页装得下，分页组件也不消失，还能再调回来 */
const showPagination = computed(() => {
  const threshold = Math.min(innerPageSize.value, ...props.pageSizes);
  return total.value > threshold || (paged.value?.hasNext ?? false);
});

async function loadMeta(signal?: AbortSignal): Promise<void> {
  metaLoading.value = true;
  try {
    meta.value = await props.metaFun(signal);
  } finally {
    metaLoading.value = false;
  }
}

async function loadData(signal?: AbortSignal): Promise<void> {
  dataLoading.value = true;
  try {
    const offset = (currentPage.value - 1) * innerPageSize.value;
    paged.value = await props.dataFun({ limit: innerPageSize.value, offset }, signal);
  } finally {
    dataLoading.value = false;
  }
}

/** 翻页：更新页码并重新请求对应 offset 的数据 */
function onPageChange(page: number): void {
  currentPage.value = page;
  loadData();
}

/** 切换每页条数：回到第一页并按新 limit 重新请求，同时持久化用户选择 */
function onSizeChange(size: number): void {
  innerPageSize.value = size;
  currentPage.value = 1;
  loadData();
  // 持久化用户默认分页大小（保留已有列设置）
  savePageSize(size);
}

/** el-table 勾选变化（含表头全选/取消全选）时同步选中行 */
function onSelectionChange(selection: unknown[]): void {
  selectedRows.value = selection;
}

/** 清空全部选中（含其他页的选中）；el-table 会触发 selection-change 同步 selectedRows */
function clearSelection(): void {
  tableEl.value?.clearSelection?.();
}

/* ---------------- 导出 Excel ---------------- */

type ExportScope = "selected" | "page" | "all";

interface ExportOption {
  value: ExportScope;
  label: string;
  /** 不可用时在对话框里禁用（如未选中任何行时的「导出选中」） */
  disabled: boolean;
}

/** 导出选项：showCheckbox=false 不含「导出选中」；数据只有一页（分页组件不显示）不含「导出所有」 */
const exportOptions = computed<ExportOption[]>(() => {
  const opts: ExportOption[] = [];
  if (props.showCheckbox) {
    opts.push({
      value: "selected",
      label: `导出选中的数据（已选 ${selectedRows.value.length} 项）`,
      disabled: selectedRows.value.length === 0,
    });
  }
  opts.push({ value: "page", label: `导出当前页数据（${rows.value.length} 条）`, disabled: false });
  if (showPagination.value) {
    opts.push({ value: "all", label: "导出所有数据", disabled: false });
  }
  return opts;
});

const exportDialogVisible = ref(false);
/** 「导出所有」进度状态 */
const exporting = ref(false);
const exportFetched = ref(0);
const exportTotal = ref(0);
/** 取消标记：每页返回后检查，兼容忽略 AbortSignal 的 dataFun */
let exportCancelled = false;
let exportAbort: AbortController | null = null;
/** 取消后待处理的导出实例：用户选「保留部分文件」时 download，选「丢弃」时 cancel */
let pendingExportApi: ExportApi | null = null;
/** 取消后的「保留/丢弃」询问对话框 */
const exportCancelledVisible = ref(false);
/** 取消时已写入的数据行数（不含表头） */
const exportCancelledRows = ref(0);

/** 导出进度百分比：totalCount 未知时按已加载条数滚动到 99% 封顶 */
const exportPercent = computed(() => {
  if (exportTotal.value > 0) return Math.min(100, Math.round((exportFetched.value / exportTotal.value) * 100));
  return exportFetched.value > 0 ? 99 : 0;
});

/** 点击导出入口：只剩一个可用选项时跳过对话框直接导出 */
function onExportClick(): void {
  const enabled = exportOptions.value.filter((o) => !o.disabled);
  if (enabled.length === 1) {
    doExport(enabled[0]!.value);
    return;
  }
  exportDialogVisible.value = true;
}

/** px 列宽 → Excel 字符宽（近似换算）；未配置列宽时按列名长度给一个下限 */
function pxToExcelWidth(width: string | undefined, displayName: string): number {
  const px = Number.parseInt(width ?? "", 10);
  if (Number.isFinite(px)) return Math.max(6, px / 7);
  return Math.max(10, displayName.length * 2);
}

/** 导出 sheet 标识：Table 导出为单 sheet，用表名作为 key（实现侧会做 Excel 非法字符清洗） */
function exportSheetName(): string {
  return meta.value?.displayName || "数据";
}

/** 创建一个全新的导出实例（一次导出对应一个 ExportApi）。
 *  未显式传入 exportApiFunc 时用内置 ExcelJS 实现，
 *  并把界面列宽（px→Excel 字符宽）一并带过去，保持所见即所得 */
function newExportApi(): ExportApi {
  if (props.exportApiFunc) return props.exportApiFunc();
  const sheet = exportSheetName();
  return createExcelJsExportApiFunc({
    columnWidths: { [sheet]: columns.value.map((c) => pxToExcelWidth(columnWidth(c.propertyPath), c.displayName)) },
  })();
}

/** 一行数据的导出值：严格按界面列顺序取 propertyPath */
function exportRowValues(row: Record<string, unknown>): unknown[] {
  return columns.value.map((c) => row[c.propertyPath] ?? null);
}

/** 按范围导出：选中/当前页直接写；所有数据走逐页拉取边拉边写。
 *  组件只经 ExportApi 接口操作（renderHeader → renderRows → download/cancel），
 *  不关心底层是 ExcelJS 还是将来的其它实现 */
async function doExport(scope: ExportScope): Promise<void> {
  exportDialogVisible.value = false;
  if (scope === "all") {
    await exportAllStreaming();
    return;
  }
  const data = (scope === "selected" ? selectedRows.value : rows.value) as Record<string, unknown>[];
  const api = newExportApi();
  const sheet = exportSheetName();
  await api.renderHeader({ [sheet]: columns.value });
  await api.renderRows(sheet, data.map(exportRowValues));
  await api.download(exportFileName());
}

/** 导出所有：循环调 dataFun，每页回来立即 renderRows 写入（边读边写），带进度与取消；
 *  取消后弹窗询问是否保留已写入的部分文件 */
async function exportAllStreaming(): Promise<void> {
  exporting.value = true;
  exportCancelled = false;
  exportFetched.value = 0;
  exportTotal.value = total.value;
  exportAbort = new AbortController();
  const api = newExportApi();
  const sheet = exportSheetName();
  await api.renderHeader({ [sheet]: columns.value });
  try {
    const limit = innerPageSize.value;
    let offset = 0;
    for (;;) {
      const res = await props.dataFun({ limit, offset }, exportAbort.signal);
      await api.renderRows(sheet, (res.items as Record<string, unknown>[]).map(exportRowValues));
      exportFetched.value += res.items.length;
      if (res.totalCount != null) exportTotal.value = res.totalCount;
      if (exportCancelled || !res.hasNext || res.items.length === 0) break;
      offset += limit;
    }
  } catch (e) {
    if (!exportCancelled) throw e;
  } finally {
    exporting.value = false;
    exportAbort = null;
  }
  if (!exportCancelled) {
    await api.download(exportFileName());
    return;
  }
  // 已取消：询问是否保留已写入的部分文件
  exportCancelledRows.value = exportFetched.value;
  pendingExportApi = api;
  exportCancelledVisible.value = true;
}

/** 取消「导出所有」：中断后续请求；已写入的行进入「保留/丢弃」流程 */
function cancelExport(): void {
  exportCancelled = true;
  exportAbort?.abort();
}

/** 保留部分文件：download 已写入的行（文件名加「部分」后缀） */
async function keepPartialExport(): Promise<void> {
  exportCancelledVisible.value = false;
  const api = pendingExportApi;
  pendingExportApi = null;
  if (api) await api.download(exportFileName(true));
}

/** 丢弃部分文件：经 ExportApi.cancel 放弃已写入内容，不产出文件 */
async function discardPartialExport(): Promise<void> {
  exportCancelledVisible.value = false;
  const api = pendingExportApi;
  pendingExportApi = null;
  if (api) await api.cancel();
}

/** 导出文件名：表名_时间戳.xlsx；部分文件加「部分」后缀 */
function exportFileName(partial = false): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${meta.value?.displayName || "导出数据"}_${stamp}${partial ? "_部分" : ""}.xlsx`;
}

/* ---------------- 行操作 ---------------- */

async function loadActions(signal?: AbortSignal): Promise<void> {
  if (!props.rowActionsFunc) {
    actions.value = [];
    return;
  }
  actionsLoading.value = true;
  try {
    actions.value = await props.rowActionsFunc(signal);
  } finally {
    actionsLoading.value = false;
  }
}

/** 该行可见的操作（action.show 缺省视为可见） */
function visibleActions(row: unknown): Action<unknown>[] {
  return actions.value.filter((a) => a.show?.(row) ?? true);
}

/** 该操作对该行是否可用（action.enable 缺省视为可用） */
function isEnabled(action: Action<unknown>, row: unknown): boolean {
  return action.enable?.(row) ?? true;
}

/** 执行操作，完成后刷新数据（增删改类操作需要看到最新列表） */
async function runAction(action: Action<unknown>, row: unknown): Promise<void> {
  await action.execute(row);
  await loadData();
}

/** 重新加载元数据、数据、行操作与列自定义配置 */
function reload(): void {
  loadMeta();
  loadData();
  loadActions();
  loadCustomConfigs();
}

onMounted(reload);
watch(() => props.metaFun, () => loadMeta());
// 外部 pageSize 变化时同步内部值并回到第一页
watch(() => props.pageSize, (size) => {
  innerPageSize.value = size;
  currentPage.value = 1;
  loadData();
});
// 数据源变化视为全新查询：回到第一页再加载
watch(() => props.dataFun, () => {
  currentPage.value = 1;
  loadData();
});
watch(() => props.rowActionsFunc, () => loadActions());
watch(() => props.loadCustomConfigFun, () => loadCustomConfigs());

/**
 * core 的 TableApi 是「父组件视角」的输出契约（状态为解包后的值），
 * 而组件内部每个状态都是 Ref。这里用映射类型把 TableApi 翻译成
 * 「实现侧形状」：方法保持原签名，状态包一层 Ref。
 * satisfies 会强制 exposed 覆盖契约的全部成员——少实现任何一个
 * 方法/状态都会编译报错；多暴露（未来新增成员）也会因多余属性报错，
 * 提醒同步更新 core 的 TableApi。
 */
type ExposedShape = {
  readonly [K in keyof TableApi]: TableApi[K] extends (...args: infer A) => infer R
    ? (...args: A) => R
    : Ref<TableApi[K]>;
};

const exposed = {
  meta,
  paged,
  actions,
  currentPage,
  selectedRows,
  clearSelection,
  reload,
} satisfies ExposedShape;

defineExpose(exposed);
</script>

<template>
  <div class="yk-table">
    <!-- 顶部工具栏：左侧为跨页选中提示（有选中时显示），右侧为导出 / 列设置入口。
         同一行节省纵向空间，任一条件满足即渲染 -->
    <div
      v-if="(showCheckbox && selectedRows.length > 0) || showCustomConfig || showExportExcel"
      class="yk-table__toolbar"
    >
      <!-- 跨页选中提示：reserve-selection 下选中可能来自其他页，给用户一个总览与清空入口 -->
      <div v-if="showCheckbox && selectedRows.length > 0" class="yk-table__selection-bar">
        <span>已选 {{ selectedRows.length }} 项</span>
        <el-button link type="primary" @click="clearSelection">清空</el-button>
      </div>
      <!-- 无选中提示时的占位，保证右侧按钮组始终靠右 -->
      <span v-else />
      <div class="yk-table__toolbar-actions">
        <el-button
          v-if="showExportExcel"
          link
          type="primary"
          class="yk-table__export-btn"
          @click="onExportClick"
        >
          ⬇ 导出 Excel
        </el-button>
        <el-button
          v-if="showCustomConfig"
          link
          type="primary"
          class="yk-table__config-btn"
          @click="openConfigDialog"
        >
          ⚙ 列设置
        </el-button>
      </div>
    </div>

    <el-table
      ref="tableEl"
      v-loading="metaLoading || dataLoading || actionsLoading || loading"
      :data="rows"
      :row-key="rowKey"
      border
      @selection-change="onSelectionChange"
    >
      <!-- showCheckbox 为 true 时的勾选列：表头 checkbox 全选/取消全选当前页；
           reserve-selection 使翻页后选中按 rowKey 跨页保留 -->
      <el-table-column v-if="showCheckbox" type="selection" width="48" reserve-selection />
      <el-table-column
        v-for="col in columns"
        :key="col.propertyPath"
        :prop="col.propertyPath"
        :label="col.displayName"
        :width="columnWidth(col.propertyPath)"
        show-overflow-tooltip
      />
      <!-- 存在行操作时追加最后一列 -->
      <el-table-column v-if="actions.length > 0" label="操作" fixed="right">
        <template #default="{ row }">
          <el-button
            v-for="action in visibleActions(row)"
            :key="action.name"
            link
            type="primary"
            :disabled="!isEnabled(action, row)"
            @click="runAction(action, row)"
          >
            {{ action.desc }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 数据超过一页时自动显示的分页组件；sizes 支持用户切换每页条数 -->
    <el-pagination
      v-if="showPagination"
      class="yk-table__pagination"
      layout="total, sizes, prev, pager, next"
      :total="total"
      :page-sizes="pageSizes"
      :page-size="innerPageSize"
      :current-page="currentPage"
      @current-change="onPageChange"
      @size-change="onSizeChange"
    />

    <!-- 导出选项对话框：有多个可用选项时才弹出（单个选项直接导出） -->
    <el-dialog v-model="exportDialogVisible" title="导出 Excel" width="420px">
      <div class="export-options">
        <el-button
          v-for="opt in exportOptions"
          :key="opt.value"
          class="export-option"
          :data-scope="opt.value"
          :disabled="opt.disabled"
          @click="doExport(opt.value)"
        >
          {{ opt.label }}
        </el-button>
      </div>
    </el-dialog>

    <!-- 「导出所有」进度对话框：循环拉取数据期间显示，可中途取消 -->
    <el-dialog
      v-model="exporting"
      title="正在导出"
      width="420px"
      :close-on-click-modal="false"
      :show-close="false"
    >
      <el-progress :percentage="exportPercent" />
      <p class="export-progress-text">
        已加载 {{ exportFetched }}<template v-if="exportTotal > 0"> / {{ exportTotal }}</template> 条
      </p>
      <template #footer>
        <el-button class="export-cancel" @click="cancelExport">取消</el-button>
      </template>
    </el-dialog>

    <!-- 「导出所有」被取消后的询问：已写入的行可保留为部分文件，或整体丢弃 -->
    <el-dialog v-model="exportCancelledVisible" title="导出已取消" width="420px">
      <p class="export-cancelled-text">
        已写入 {{ exportCancelledRows }} 条数据，是否保留已导出的部分文件？
      </p>
      <template #footer>
        <el-button class="export-discard" @click="discardPartialExport">丢弃</el-button>
        <el-button class="export-keep" type="primary" @click="keepPartialExport">保留部分文件</el-button>
      </template>
    </el-dialog>

    <!-- 列设置面板：勾选显隐、上移/下移调顺序、输入框调列宽 -->
    <el-dialog v-model="configDialogVisible" title="列设置" width="480px">
      <div v-for="(d, i) in draftColumns" :key="d.propertyPath" class="col-config-row">
        <el-checkbox v-model="d.visible" class="col-config-name">{{ d.displayName }}</el-checkbox>
        <el-input v-model="d.width" class="col-config-width" placeholder="宽度(如 120)" size="small" />
        <el-button link type="primary" :disabled="i === 0" @click="moveDraft(i, -1)">上移</el-button>
        <el-button link type="primary" :disabled="i === draftColumns.length - 1" @click="moveDraft(i, 1)">
          下移
        </el-button>
      </div>
      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" class="col-config-save" @click="saveConfigDialog">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.yk-table__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.yk-table__selection-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  font-size: 0.92em;
  color: #409eff;
}
.yk-table__toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.export-options {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}
.export-options .export-option {
  margin-left: 0;
}
.export-progress-text {
  margin: 10px 0 0;
  color: #666;
  font-size: 0.92em;
  text-align: center;
}
.col-config-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}
.col-config-name {
  flex: 1;
  margin-right: 0;
}
.col-config-width {
  width: 120px;
}
.yk-table__pagination {
  margin-top: 12px;
  justify-content: flex-end;
}
</style>
