<script setup lang="ts">
import { computed, onMounted, ref, watch, type PropType, type Ref } from "vue";
import type {
  Column,
  TableApi,
  TableProps as CoreTableProps,
} from "@ys.knife.crud/core";
import { useDefault, useSelection } from "@ys.knife.crud/vue";
import ExportExcelDialog from "./exportExcelDialog.vue";
import ColumnConfigDialog from "./columnConfigDialog.vue";
import RowActionsColumn from "./rowActionsColumn.vue";
import SelectionBar from "./selectionBar.vue";

// 组件名统一带 ys 前缀：模板中以 <ys-table>（或 <YsTable>）使用，
// 同时保证全局注册（app.component）、递归组件与 devtools 中名称稳定。
defineOptions({ name: "YsTable" });

/**
 * Table 组件的 props = core 的 TableProps（metaFun + dataFun），
 * 另加展示相关的可选字段。
 * - metaFun：异步获取列定义（Meta）
 * - dataFun：异步获取分页数据（PagedList），表格渲染其 items
 *
 * 注意：这里刻意用「运行时 props 声明 + PropType」，而不是
 * `defineProps<Props extends CoreTableProps>()` 类型语法。
 * 原因：SFC 编译器把类型转成运行时 props 声明时，对跨包 re-export 的类型
 * （如 core 间接引用 ys.knife.query.js 的 PagedList）解析失败时会静默丢弃
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
  exportorFunc: { type: Function as PropType<NonNullable<CoreTableProps["exportorFunc"]>>, required: false },
  /** 行 key，默认 "id" */
  rowKey: { type: String, default: "id" },
});

/** 单次加载完成后的结果（PagedList）；组件对外事件基于此类型 */
type PagedResult = Awaited<ReturnType<CoreTableProps["dataFun"]>>;

/** 对外事件：data-loaded 在每次 dataFun 成功返回后触发，携带本次加载的分页结果 */
const emit = defineEmits<{
  (e: "data-loaded", paged: PagedResult): void;
}>();

/* ---------------- 默认状态（useDefault） ----------------
 * useDefault 内聚与 innerPageSize 无关的部分：meta/paged/rows/两类 loading/
 * currentPage/total/loadMeta + metaFun 变化监听。依赖 innerPageSize 的
 * loadData/showPagination + pageSize/dataFun 变化监听留在本组件——innerPageSize
 * 是视图层解析（列设置对话框 defaultPageSize ?? props.pageSize），不耦合到 agnostic composable。 */
const {
  meta,
  paged,
  rows,
  metaLoading,
  dataLoading,
  currentPage,
  total,
  loadMeta,
} = useDefault(props);

/* ---------------- 行选择（checkbox 列） ---------------- */

/** el-table 实例引用（clearSelection 等公开方法） */
const tableEl = ref<{ clearSelection?: () => void } | null>(null);

const { selectedRows, onSelectionChange } = useSelection();


/* ---------------- 子组件引用（行操作 / 列设置 / 导出） ---------------- */

/** 行操作列实例引用（经 defineExpose 暴露 actionsLoading/loadActions） */
const rowActionsRef = ref<{
  actionsLoading: boolean;
  loadActions: (signal?: AbortSignal) => Promise<void>;
} | null>(null);

const actionsLoading = computed(() => rowActionsRef.value?.actionsLoading ?? false);

/** 列设置对话框实例引用（经 defineExpose 暴露 columns/defaultPageSize/updateDefaultPageSize/loadCustomConfigs/customConfigLoading/openDialog） */
const configDialogRef = ref<{
  columns: Column[];
  /** 当前用户默认分页大小（加载到保存值时回写；undefined 表示未保存过分页大小） */
  defaultPageSize: number | undefined;
  /** 用户切换每页条数时调用：更新内部状态并持久化为默认值 */
  updateDefaultPageSize: (size: number) => void;
  loadCustomConfigs: (signal?: AbortSignal) => Promise<void>;
  /** 自定义配置加载态（loadCustomConfigs 进行中为 true） */
  customConfigLoading: boolean;
  /** 打开列设置面板（工具栏「⚙ 列设置」按钮） */
  openDialog: () => void;
} | null>(null);

/** 最终显示列（已含 meta/customConfig 两层过滤与排序，customConfig 的 width 也写在 col.width 上），对话框挂载前为空 */
const columns = computed(() => configDialogRef.value?.columns ?? []);

/**
 * 当前生效的每页条数：优先取 ColumnConfigDialog 暴露的 defaultPageSize
 * （用户保存的默认值——由 loadCustomConfigs 加载、updateDefaultPageSize 写入），
 * 若未保存过分页大小（defaultPageSize 为 undefined）则回落到 props.pageSize。
 * 与 columns 同源——皆由 ColumnConfigDialog 经 defineExpose 提供，不再单独维护 ref。
 */
const innerPageSize = computed(() => configDialogRef.value?.defaultPageSize ?? props.pageSize);

const customConfigLoading = computed(() => configDialogRef.value?.customConfigLoading ?? false);

/** 导出对话框实例引用（按钮经 ref 调 openExportDialog() 触发导出入口） */
const exportDialogRef = ref<{ openExportDialog: () => void } | null>(null);

/* ---------------- 数据加载与分页（依赖 innerPageSize，故留本组件） ---------------- */

/** 加载当前页数据（dataFun）；offset 由 (currentPage-1)*innerPageSize 计算 */
async function loadData(signal?: AbortSignal): Promise<void> {
  dataLoading.value = true;
  try {
    const offset = (currentPage.value - 1) * innerPageSize.value;
    const result = await props.dataFun(innerPageSize.value, offset, signal);
    paged.value = result;
    // 请求成功才通知外部；取消（AbortError）/异常时 await 直接抛出，不会走到这里
    emit("data-loaded", result);
  } finally {
    dataLoading.value = false;
  }
}

/**
 * 数据超过一页（或已知还有下一页）时自动显示分页组件。
 * 阈值取「当前每页条数」与「可选条数最小值」的较小者：
 * 用户把每页调大（如 100）后即使一页装得下，分页组件也不消失，还能再调回来。
 */
const showPagination = computed(() => {
  const threshold = Math.min(innerPageSize.value, ...props.pageSizes);
  return total.value > threshold || (paged.value?.hasNext ?? false);
});

/* ---------------- 分页交互 ---------------- */

/** 翻页：更新页码并重新请求对应 offset 的数据 */
function onPageChange(page: number): void {
  currentPage.value = page;
  loadData();
}

/** 切换每页条数：先经对话框持久化为默认值（同步更新 defaultPageSize，
 *  computed innerPageSize 立即反映新值），再回到第一页按新 limit 重新请求 */
function onSizeChange(size: number): void {
  configDialogRef.value?.updateDefaultPageSize(size);
  currentPage.value = 1;
  loadData();
}

/* ---------------- 生命周期 ---------------- */

/**
 * 重新加载：metaFun / 行操作 / 列自定义配置 三者并行加载，全部完成后再 loadData。
 * 必须等 loadCustomConfigs 完成——它写回 defaultPageSize，computed innerPageSize 才
 * 反映用户保存的默认分页大小，loadData 才用正确的 limit。
 */
async function reload(): Promise<void> {
  await Promise.all([
    loadMeta(),
    rowActionsRef.value?.loadActions(),
    configDialogRef.value?.loadCustomConfigs(),
  ]);
  currentPage.value = 1;
  loadData();
}

onMounted(reload);
// metaFun 变化的监听已内聚在 useDefault 中
// 外部 pageSize 变化：走与用户下拉切换同一路径——持久化为默认值、回第一页、重新加载
watch(() => props.pageSize, (size) => {
  onSizeChange(size);
});
// 数据源变化视为全新查询：回到第一页再加载
watch(() => props.dataFun, () => {
  currentPage.value = 1;
  loadData();
});

/* ---------------- 暴露 API ---------------- */

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

/** 清空全部选中（含其他页的选中）——委托 el-table 的 clearSelection */
function clearSelection(): void {
  tableEl.value?.clearSelection?.();
}

const exposed = {
  meta,
  paged,
  currentPage,
  selectedRows,
  reload,
  clearSelection,
} satisfies ExposedShape;

defineExpose(exposed);
</script>

<template>
  <div class="yk-table">
    <!-- 顶部工具栏：左侧为跨页选中提示（有选中时显示），右侧为导出 / 列设置入口。
         同一行节省纵向空间，任一条件满足即渲染 -->
    <div v-if="(showCheckbox && selectedRows.length > 0) || showCustomConfig || showExportExcel"
      class="yk-table__toolbar">
      <!-- 跨页选中提示：reserve-selection 下选中可能来自其他页，给用户一个总览与清空入口。
           无选中时 SelectionBar 不渲染任何元素，右侧按钮组靠 margin-left:auto 自行贴右，
           不依赖占位元素 -->
      <SelectionBar v-if="showCheckbox" :count="selectedRows.length" @clear="clearSelection" />
      <div class="yk-table__toolbar-actions">
        <el-button v-if="showExportExcel" link type="primary" class="yk-table__export-btn"
          @click="exportDialogRef?.openExportDialog()">
          ⬇ 导出 Excel
        </el-button>
        <el-button v-if="showCustomConfig" link type="primary" class="yk-table__config-btn"
          @click="configDialogRef?.openDialog()">
          ⚙ 列设置
        </el-button>
      </div>
    </div>

    <el-table ref="tableEl" v-loading="metaLoading || dataLoading || actionsLoading || customConfigLoading" :data="rows"
      :row-key="rowKey" border @selection-change="onSelectionChange">
      <!-- 勾选列：reserve-selection 使翻页后选中按 rowKey 跨页保留；表头 checkbox 全选/取消全选当前页 -->
      <el-table-column v-if="showCheckbox" type="selection" width="48" reserve-selection />
      <el-table-column v-for="col in columns" :key="col.propertyPath" :prop="col.propertyPath" :label="col.displayName"
        :width="col.width" show-overflow-tooltip />
      <!-- 行操作列：内部自管 actions 加载与渲染 -->
      <RowActionsColumn v-if="props.rowActionsFunc" ref="rowActionsRef" :row-actions-func="props.rowActionsFunc" />
    </el-table>

    <!-- 数据超过一页时自动显示的分页组件；sizes 支持用户切换每页条数 -->
    <el-pagination v-if="showPagination" class="yk-table__pagination" layout="total, sizes, prev, pager, next"
      :total="total" :page-sizes="pageSizes" :page-size="innerPageSize" :current-page="currentPage"
      @current-change="onPageChange" @size-change="onSizeChange" />

    <!-- 导出 Excel 对话框组（范围选择 / 进度 / 取消询问）—— 内部自管 useExportExcel。
         props 按相关性分组：数据管道 → 列定义 → 当前页快照 → 选择 -->
    <ExportExcelDialog v-if="showExportExcel" ref="exportDialogRef" :current-rows="rows" :selected-rows="selectedRows"
      :data-fun="props.dataFun" :export-page-size="props.exportPageSize" :exportor-func="props.exportorFunc"
      :table-name="meta?.displayName ?? '数据'" :columns="columns" :total="total" :has-more-page="showPagination"
      :export-selected="props.showCheckbox" />

    <!-- 列设置对话框（内部自管 useCustomConfig；始终挂载，columns 也来自它——
         customConfig 的 width 直接写在 col.width 上，表格读 col.width 即可；
         不再接收 showCustomConfig/innerPageSize：前者由 Table 自身控制「⚙ 列设置」按钮显隐，
         后者改为经 defineExpose 暴露 defaultPageSize/updateDefaultPageSize 由 Table 主动读写） -->
    <ColumnConfigDialog ref="configDialogRef" :load-custom-config-fun="loadCustomConfigFun"
      :save-custom-config-fun="saveCustomConfigFun" :meta="meta" />
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
  /* 无论左侧选中提示是否存在，按钮组始终吸附工具栏右侧 */
  margin-left: auto;
}

.yk-table__pagination {
  margin-top: 12px;
  justify-content: flex-end;
}
</style>
