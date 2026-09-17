<script setup lang="ts">
import { computed, onMounted, ref, watch, type PropType, type Ref } from "vue";
import type {
  Action,
  Meta,
  PagedList,
  TableApi,
  TableProps as CoreTableProps,
} from "@ys.knife.crud/core";
import { useCustomConfig, useSelectedRows } from "@ys.knife.crud/vue";
import ExportExcelDialog from "./ExportExcelDialog.vue";
import ColumnConfigDialog from "./ColumnConfigDialog.vue";
import RowActionsCell from "./RowActionsCell.vue";
import SelectionBar from "./SelectionBar.vue";

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
  /** 导出「所有数据」时每次分页拉取的条数，默认 1000（独立于界面分页大小） */
  exportPageSize: { type: Number, default: 1000 },
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
const metaLoading = ref(false);
const dataLoading = ref(false);
/** 当前页码（1 基），翻页时驱动 dataFun 的 offset */
const currentPage = ref(1);
/** 当前生效的每页条数：初始取 pageSize prop，用户可在分页组件里切换 */
const innerPageSize = ref(props.pageSize);
/** el-table 实例引用（用于 clearSelection 等方法） */
const tableEl = ref<{ clearSelection?: () => void } | null>(null);

/* ---------------- 行选择（选中行维护、清空全部选中） ---------------- */

const {
  selectedRows,
  onSelectionChange,
  clearSelection,
} = useSelectedRows(tableEl);

/* ---------------- 列自定义配置（显隐/顺序/宽度 + 用户默认分页大小） ---------------- */

const {
  columns,
  columnWidth,
  loadCustomConfigs,
  savePageSize,
  configDialogVisible,
  draftColumns,
  openConfigDialog,
  moveDraft,
  resetDraft,
  saveConfigDialog,
} = useCustomConfig(props, meta, innerPageSize);

/* ---------------- 行操作（由 RowActionsCell 自管） ---------------- */

/** 行操作列实例引用（经 defineExpose 暴露 actions/actionsLoading/loadActions） */
const rowActionsRef = ref<{
  actions: Action<unknown>[];
  actionsLoading: boolean;
  loadActions: (signal?: AbortSignal) => Promise<void>;
} | null>(null);

const actions = computed(() => rowActionsRef.value?.actions ?? []);
const actionsLoading = computed(() => rowActionsRef.value?.actionsLoading ?? false);

/* ---------------- 数据（派生状态与加载） ---------------- */

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

/* ---------------- 导出 Excel（逻辑由 ExportExcelDialog 自管） ---------------- */

/** 导出对话框实例引用（按钮经 ref 调 trigger() 触发导出入口） */
const exportDialogRef = ref<{ trigger: () => void } | null>(null);

/* ---------------- 生命周期 & 暴露 API ---------------- */

/** 重新加载元数据、数据、行操作与列自定义配置 */
function reload(): void {
  loadMeta();
  loadData();
  rowActionsRef.value?.loadActions();
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
      <SelectionBar
        v-if="showCheckbox"
        :count="selectedRows.length"
        @clear="clearSelection"
      />
      <!-- 无选中提示时的占位，保证右侧按钮组始终靠右 -->
      <span v-else />
      <div class="yk-table__toolbar-actions">
        <el-button
          v-if="showExportExcel"
          link
          type="primary"
          class="yk-table__export-btn"
          @click="exportDialogRef?.trigger()"
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
      <!-- 行操作列：内部自管 actions 加载与渲染 -->
      <RowActionsCell
        v-if="props.rowActionsFunc"
        ref="rowActionsRef"
        :row-actions-func="props.rowActionsFunc"
      />
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

    <!-- 导出 Excel 对话框组（范围选择 / 进度 / 取消询问）—— 内部自管 useExportExcel -->
    <ExportExcelDialog
      v-if="showExportExcel"
      ref="exportDialogRef"
      :data-fun="props.dataFun"
      :show-checkbox="props.showCheckbox"
      :export-api-func="props.exportApiFunc"
      :meta="meta"
      :columns="columns"
      :rows="rows"
      :selected-rows="selectedRows"
      :total="total"
      :export-page-size="props.exportPageSize"
      :show-pagination="showPagination"
    />

    <!-- 列设置对话框 -->
    <ColumnConfigDialog
      v-model:visible="configDialogVisible"
      v-model:draft-columns="draftColumns"
      @move="moveDraft"
      @reset="resetDraft"
      @save="saveConfigDialog"
    />
  </div>
</template>

<style scoped>
.yk-table__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.yk-table__toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.yk-table__pagination {
  margin-top: 12px;
  justify-content: flex-end;
}
</style>
