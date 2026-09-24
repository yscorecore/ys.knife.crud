<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef, useSlots, watch, type PropType, type Ref } from "vue";
import type {
  Action,
  Column,
  TableApi,
  TableProps as CoreTableProps,
  ViewMode,
} from "@ys.knife.crud/core";
import { useDefault, useRowActions, useSelection, visibleActions, isEnabled } from "@ys.knife.crud/vue";
import ExportExcelDialog from "./exportExcelDialog.vue";
import ColumnConfigDialog from "./columnConfigDialog.vue";
import RowActionsColumn from "./rowActionsColumn.vue";

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
  /**
   * 是否允许拖动表头列边界调整列宽（透传 el-table-column 的 resizable），默认 true。
   * 受控与非受控皆可：用 v-model:column-resizable 时由父级驱动；不绑定时可经
   * TableApi.setColumnResizable 切换（组件内部维护状态，同时照常派发 update 事件）。
   */
  columnResizable: { type: Boolean, default: true },
  /** 加载自定义配置（含列设置与用户默认分页大小；返回 null 按空配置处理） */
  loadCustomConfigFun: { type: Function as PropType<NonNullable<CoreTableProps["loadCustomConfigFun"]>>, required: false },
  /** 保存自定义配置（含列设置与用户默认分页大小） */
  saveCustomConfigFun: { type: Function as PropType<NonNullable<CoreTableProps["saveCustomConfigFun"]>>, required: false },
  /** 导出「所有数据」时每次分页拉取的条数，默认 1000（独立于界面分页大小） */
  exportPageSize: { type: Number, default: 1000 },
  /** 导出实现工厂：每次导出调用它得到一个全新的 ExportApi 实例，组件只经该接口写文件。
   *  缺省使用内置 ExcelJS 实现（createExcelJsExportApiFunc）；
   *  将来可替换为其它实现（CSV、服务端导出等），组件无需改动 */
  exportorFunc: { type: Function as PropType<NonNullable<CoreTableProps["exportorFunc"]>>, required: false },
  /** 行 key，默认 "id" */
  rowKey: { type: String, default: "id" },
  /**
   * 展示形态，默认 "table"（表格视图）；设为 "card" 时以卡片网格渲染当前页行，
   * 设为 "list" 时以列表渲染（一行一条全宽，内容经 #list 插槽自定义）。
   * 受控与非受控皆可：用 v-model:view-mode 时由父级驱动；不绑定时可经
   * TableApi.setViewMode 切换（组件内部维护状态，同时照常派发 update:viewMode）。
   * Table 不内置任何视图切换控件，切换入口一律由外部实现。
   */
  viewMode: { type: String as PropType<ViewMode>, default: "table" },
});

/** 单次加载完成后的结果（PagedList）；组件对外事件基于此类型 */
type PagedResult = Awaited<ReturnType<CoreTableProps["dataFun"]>>;

/** 对外事件：data-loaded 在每次 dataFun 成功返回后触发，携带本次加载的分页结果 */
const emit = defineEmits<{
  (e: "data-loaded", paged: PagedResult): void;
  /** 视图模式切换时触发，配合 viewMode prop 做 v-model:view-mode */
  (e: "update:viewMode", mode: ViewMode): void;
  /** 选择列显隐切换时触发，配合 showCheckbox prop 做 v-model:show-checkbox */
  (e: "update:showCheckbox", show: boolean): void;
  /** 列宽拖动开关切换时触发，配合 columnResizable prop 做 v-model:column-resizable */
  (e: "update:columnResizable", resizable: boolean): void;
}>();

/* ---------------- 默认状态（useDefault） ----------------
 * useDefault 内聚与 innerPageSize 无关的部分：meta/paged/rows/两类 loading/
 * currentPage/total/totalKnown/loadMeta + metaFun 变化监听。依赖 innerPageSize 的
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
  totalKnown,
  loadMeta,
} = useDefault(props);

/* ---------------- 行选择（checkbox 列） ---------------- */

/** el-table 实例引用（clearSelection / toggleRowSelection 等公开方法；卡片视图下为 null） */
const tableEl = ref<{
  clearSelection?: () => void;
  toggleRowSelection?: (row: unknown, selected?: boolean) => void;
} | null>(null);

const {
  selectedRows,
  onSelectionChange,
  isRowSelected,
  toggleRowSelection,
  restoreSelection,
  clearSelection,
  selectAllOnPage,
  invertSelectionOnPage,
} = useSelection({ tableEl, rows, rowKey: toRef(props, "rowKey") });


/* ---------------- 子组件引用（列设置 / 导出） ---------------- */

/**
 * 行操作状态提升到 Table：
 * - 修复视图切换往返后操作列消失——RowActionsColumn 在 v-if 内会被卸载重建，
 *   若 actions 归它所有，重建后初始为空且不会重新加载；
 * - 卡片视图的右键菜单与表格视图的操作列共用同一份 actions。
 * 经 getter 合成 props，使 composable 内 watch(() => props.rowActionsFunc) 持续生效。
 */
const rowActionsProps = {
  get rowActionsFunc() {
    return props.rowActionsFunc;
  },
};
const { actions, actionsLoading, loadActions } = useRowActions(rowActionsProps);

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
  /** 拖动列宽结束（header-dragend）时写回配置并防抖持久化 */
  updateColumnWidth: (propertyPath: string, width: number) => void;
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
    const result = await props.dataFun({ limit: innerPageSize.value, offset }, signal);
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
 * totalCount 未知时 total 为估算值（当前页已加载数 + hasNext 的 ghost 页），
 * 同样满足「有数据/有下一页 → 显示」的语义。
 */
const showPagination = computed(() => {
  const threshold = Math.min(innerPageSize.value, ...props.pageSizes);
  return total.value > threshold || (paged.value?.hasNext ?? false);
});

/** 视图层加载态（表格 / 卡片网格共用同一个遮罩） */
const viewLoading = computed(
  () => metaLoading.value || dataLoading.value || actionsLoading.value || customConfigLoading.value,
);

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

/**
 * 列宽拖拽结束（el-table header-dragend）：把新宽度写进自定义配置
 * （表格立即生效）并防抖持久化到列设置。勾选列/行操作列没有 property，跳过。
 */
function onColumnResize(newWidth: number, _oldWidth: number, column: { property?: string }): void {
  if (!column.property) return;
  configDialogRef.value?.updateColumnWidth(column.property, newWidth);
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
    loadActions(),
    configDialogRef.value?.loadCustomConfigs(),
  ]);
  currentPage.value = 1;
  loadData();
}

/**
 * 仅刷新当前页数据：直接重发当前页码 / 每页条数下的 dataFun 请求，
 * 保留分页、筛选与选中状态，不重载 meta / 行操作 / 列自定义配置。
 */
function refresh(): void {
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

/* ---------------- 展示形态（受控 / 非受控皆可） ---------------- */

/**
 * 内部实际生效的视图模式：
 * - 父级用 v-model:view-mode（受控）：set 时 emit，父级回写 prop，下面的 watch 再同步回来；
 * - 父级只给初始值或根本不传（非受控）：内置切换控件直接改本地态即可生效，
 *   同时照常 emit update:viewMode（外部需要感知时可监听）。
 */
const innerViewMode = ref<ViewMode>(props.viewMode);
watch(() => props.viewMode, (mode) => {
  innerViewMode.value = mode;
});
const currentViewMode = computed<ViewMode>({
  get: () => innerViewMode.value,
  set: (mode) => {
    innerViewMode.value = mode;
    emit("update:viewMode", mode);
  },
});

// 卡片 → 表格：el-table 重新挂载后把累计选中恢复到勾选态（restoreSelection 内含 nextTick）
watch(currentViewMode, (mode) => {
  if (mode === "table") void restoreSelection();
});

/**
 * 内部实际生效的选择列显隐，模式与 currentViewMode 一致：
 * - 父级用 v-model:show-checkbox（受控）：set 时 emit，父级回写 prop，watch 再同步回来；
 * - 父级只给初始值或不传（非受控）：经 TableApi.setSelectable 直接改本地态即可生效，
 *   同时照常 emit update:showCheckbox。
 */
const innerShowCheckbox = ref(props.showCheckbox);
watch(() => props.showCheckbox, (show) => {
  innerShowCheckbox.value = show;
});
const currentShowCheckbox = computed<boolean>({
  get: () => innerShowCheckbox.value,
  set: (show) => {
    innerShowCheckbox.value = show;
    emit("update:showCheckbox", show);
    // 关闭选择列时清空累计选中，避免隐藏状态下残留选择影响导出范围
    if (!show) clearSelection();
  },
});

/** TableApi 入口：切换视图模式（受控 / 非受控均由 currentViewMode setter 统一处理） */
function setViewMode(mode: ViewMode): void {
  currentViewMode.value = mode;
}

/** TableApi 入口：切换行可选择状态（选择列显隐；setter 内含关闭时清空选中） */
function setSelectable(selectable: boolean): void {
  currentShowCheckbox.value = selectable;
}

/**
 * 内部实际生效的列宽拖动开关，模式与 currentShowCheckbox 一致：
 * - 父级用 v-model:column-resizable（受控）：set 时 emit，父级回写 prop，watch 再同步；
 * - 非受控：经 TableApi.setColumnResizable 直接改本地态即可生效，同时照常 emit。
 */
const innerColumnResizable = ref(props.columnResizable);
watch(() => props.columnResizable, (resizable) => {
  innerColumnResizable.value = resizable;
});
const currentColumnResizable = computed<boolean>({
  get: () => innerColumnResizable.value,
  set: (resizable) => {
    innerColumnResizable.value = resizable;
    emit("update:columnResizable", resizable);
  },
});

/** TableApi 入口：切换列宽拖动开关 */
function setColumnResizable(resizable: boolean): void {
  currentColumnResizable.value = resizable;
}

/**
 * 父组件已提供的插槽名列表。slots 是响应式 proxy，Object.keys 在 computed 内
 * 调用会被追踪；外部菜单据此决定「卡片 / 列表视图」入口是否显示
 *（没提供 #card/#list 插槽时切过去只有 JSON 兜底，不应暴露入口）。
 */
const slots = useSlots();
// 过滤内部 "_" 标记（normalizeSlot 标记位），只保留真实具名插槽
const slotNames = computed<string[]>(() =>
  Object.keys(slots).filter((name) => name !== "_" && typeof slots[name] === "function"),
);

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

/**
 * 打开内置列设置对话框——委托 ColumnConfigDialog 的 openDialog。
 * Table 不渲染入口按钮，由外部自实现按钮经此入口打开（如 YsCommandBar 下拉项）。
 */
function openConfigDialog(): void {
  configDialogRef.value?.openDialog();
}

/**
 * 打开内置导出 Excel 对话框——委托 ExportExcelDialog 的 openExportDialog。
 * Table 不渲染入口按钮，由外部自实现按钮经此入口打开（如 YsCommandBar 下拉项）。
 */
function openExportDialog(): void {
  exportDialogRef.value?.openExportDialog();
}

/** 卡片 checkbox 勾选：el-checkbox change 值（string|number|boolean）归一为 boolean 后写入选中集合 */
function onCardCheck(row: Record<string, unknown>, checked: string | number | boolean): void {
  toggleRowSelection(row, Boolean(checked));
}

/* ---------------- 卡片视图：行操作右键菜单 ---------------- */

/** 当前打开的右键菜单（null 表示关闭）；记录点击位置与目标行 */
const cardMenu = ref<{ x: number; y: number; row: Record<string, unknown> } | null>(null);

/** 菜单当前应对目标行展示的可见操作（action.show 缺省视为可见） */
const cardMenuActions = computed<Action<unknown>[]>(() =>
  cardMenu.value ? visibleActions(actions.value, cardMenu.value.row) : [],
);

/**
 * 卡片右键：存在行操作时拦截浏览器默认菜单并弹出自定义菜单。
 * 位置做视口边界收敛，避免菜单溢出屏幕。
 */
function onCardContextMenu(event: MouseEvent, row: Record<string, unknown>): void {
  // 无行操作时不拦截，保留浏览器原生右键菜单
  if (actions.value.length === 0) return;
  event.preventDefault();
  const menuWidth = 176;
  const itemHeight = 34;
  const menuHeight = cardMenuItemsCount(row) * itemHeight + 8;
  cardMenu.value = {
    x: Math.min(event.clientX, window.innerWidth - menuWidth - 8),
    y: Math.min(event.clientY, window.innerHeight - menuHeight - 8),
    row,
  };
}

/** 该右键位置下可见操作数量（用于打开前估算菜单高度做边界收敛） */
function cardMenuItemsCount(row: Record<string, unknown>): number {
  return visibleActions(actions.value, row).length;
}

/** 执行菜单项：先关闭菜单再执行 action（execute 可能触发弹层/reload） */
function onCardMenuAction(action: Action<unknown>): void {
  const row = cardMenu.value?.row;
  cardMenu.value = null;
  if (row) void action.execute(row, tableApi);
}

/** Esc 关闭菜单 */
function onCardMenuKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") cardMenu.value = null;
}

onMounted(() => window.addEventListener("keydown", onCardMenuKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onCardMenuKeydown));

const exposed = {
  meta,
  paged,
  currentPage,
  viewMode: currentViewMode,
  selectable: currentShowCheckbox,
  columnResizable: currentColumnResizable,
  slotNames,
  selectedRows,
  rows,
  reload,
  refresh,
  setViewMode,
  setSelectable,
  setColumnResizable,
  clearSelection,
  selectAllOnPage,
  invertSelectionOnPage,
  openConfigDialog,
  openExportDialog,
} satisfies ExposedShape;

defineExpose(exposed);

/**
 * TableApi 的「已解包视图」：exposed 是 Ref 形态（satisfies ExposedShape），
 * 直接传入会拿到 Ref 对象而非值。这里经 getter 读 .value，方法直接复用，
 * 供 action.execute(row, table) 与 RowActionsColumn :table 使用。
 * getter 在 render/action 执行时才求值，读取 .value 仍响应式。
 */
const tableApi: TableApi = {
  get meta() { return meta.value },
  get paged() { return paged.value },
  get currentPage() { return currentPage.value },
  get viewMode() { return currentViewMode.value },
  get selectable() { return currentShowCheckbox.value },
  get columnResizable() { return currentColumnResizable.value },
  get slotNames() { return slotNames.value },
  get selectedRows() { return selectedRows.value },
  get rows() { return rows.value },
  reload,
  refresh,
  setViewMode,
  setSelectable,
  setColumnResizable,
  clearSelection,
  selectAllOnPage,
  invertSelectionOnPage,
  openConfigDialog,
  openExportDialog,
}
</script>

<template>
  <div class="yk-table">
    <!-- 注意：Table 不再内置任何顶部工具栏（选中提示条 / 列设置 / 导出 / 视图切换）。
         这些 UI 一律由外部实现——选中提示条可用 YsSelectionBar（或 YsCommandBar 内置），
         列设置 / 导出对话框经 TableApi.openConfigDialog()/openExportDialog() 打开，
         视图切换经 v-model:view-mode 或 TableApi.setViewMode() 驱动。 -->

    <!-- 表格视图：v-if 与卡片视图二选一；切回本视图后由 useSelection.restoreSelection
         把跨页累计选中恢复到勾选列（选中状态以 rowKey Map 为准，不再用 reserve-selection）。
         外层 wrap 为自制 loading 遮罩提供定位上下文（不再用 el-table 的 v-loading 指令，
         以便三种视图共用 #loading 插槽） -->
    <div v-if="currentViewMode === 'table'" class="yk-table__table-wrap">
      <el-table ref="tableEl" :data="rows"
        :row-key="rowKey" border @selection-change="onSelectionChange" @header-dragend="onColumnResize">
        <!-- 空数据提示：使用者经 #empty 插槽自定义（表格/卡片/列表三种视图共享，见下方两个视图分支）；
             仅在使用者提供了插槽时才声明，否则保留 el-table 默认的「暂无数据」空态 -->
        <template v-if="$slots.empty" #empty>
          <slot name="empty" />
        </template>
        <!-- 勾选列：跨页保留由 useSelection 的 rowKey Map 受控维护，表头 checkbox 全选/取消全选当前页。
             不绑 resizable——EP 对 type=selection 固定宽列默认不可拖，显式绑 true 反而会放开 -->
        <el-table-column v-if="currentShowCheckbox" type="selection" width="48" />
        <!-- 数据列：col.render 存在时优先用自定义渲染（返回字符串/VNode 均可，
             经函数式组件呈现），否则走默认的 propertyPath 取值显示。
             resizable 跟随列宽拖动开关（el-table-column 默认 true，需显式透传才能关） -->
        <el-table-column v-for="col in columns" :key="col.propertyPath" :prop="col.propertyPath" :label="col.displayName"
          :width="col.width" :resizable="currentColumnResizable" show-overflow-tooltip>
          <template v-if="col.render" #default="{ row }">
            <component :is="() => col.render!(row, (row as Record<string, unknown>)[col.propertyPath])" />
          </template>
        </el-table-column>
        <!-- 行操作列：actions 状态归 Table 所有（视图切换往返不丢失；卡片右键菜单共用） -->
        <RowActionsColumn v-if="props.rowActionsFunc" :actions="actions" :table="tableApi"
          :resizable="currentColumnResizable" />
      </el-table>
      <!-- 加载遮罩：三种视图共用 #loading 插槽；未提供插槽时渲染内置 spinner -->
      <transition name="yk-loading-fade">
        <div v-if="viewLoading" class="yk-table__loading-mask">
          <slot name="loading">
            <span class="yk-table__loading-spinner" aria-label="加载中" />
          </slot>
        </div>
      </transition>
    </div>

    <!-- 卡片视图：当前页每行一张卡片；卡片内容经 #card 插槽自定义（作用域为 { row, index }），
         未提供插槽时默认把整行 JSON 序列化展示。checkbox 与表格视图共用同一套跨页选中状态。
         存在行操作（rowActionsFunc）时，卡片上右键弹出操作菜单（与操作列同一套 actions） -->
    <div v-else-if="currentViewMode === 'card'" class="yk-table__cards">
      <div v-for="(row, index) in rows" :key="String(row[rowKey])" class="yk-table__card"
        :class="{
          'is-selected': currentShowCheckbox && isRowSelected(row),
          'has-actions': actions.length > 0,
        }"
        :title="actions.length > 0 ? '右键查看行操作' : undefined"
        @contextmenu="onCardContextMenu($event, row)">
        <el-checkbox v-if="currentShowCheckbox" class="yk-table__card-checkbox"
          :model-value="isRowSelected(row)"
          @change="onCardCheck(row, $event)" />
        <slot name="card" :row="row" :index="index">
          <pre class="yk-table__card-json">{{ JSON.stringify(row, null, 2) }}</pre>
        </slot>
      </div>
      <!-- 空数据提示：与表格视图共享 #empty 插槽；未提供插槽时回落 el-empty「暂无数据」 -->
      <template v-if="!viewLoading && rows.length === 0">
        <slot v-if="$slots.empty" name="empty" />
        <el-empty v-else description="暂无数据" />
      </template>
      <!-- 加载遮罩：三种视图共用 #loading 插槽；未提供插槽时渲染内置 spinner -->
      <transition name="yk-loading-fade">
        <div v-if="viewLoading" class="yk-table__loading-mask">
          <slot name="loading">
            <span class="yk-table__loading-spinner" aria-label="加载中" />
          </slot>
        </div>
      </transition>
    </div>

    <!-- 列表视图：一行一条数据、占满整行宽度；行内容经 #list 插槽自定义（作用域同为 { row, index }），
         未提供插槽时默认把整行 JSON 序列化展示。checkbox 在行首，与表格/卡片视图共用同一套跨页选中状态；
         存在行操作时右键弹出操作菜单（与卡片视图共用 onCardContextMenu 及同一个 teleport 菜单） -->
    <div v-else class="yk-table__list">
      <div v-for="(row, index) in rows" :key="String(row[rowKey])" class="yk-table__list-item"
        :class="{
          'is-selected': currentShowCheckbox && isRowSelected(row),
          'has-actions': actions.length > 0,
        }"
        :title="actions.length > 0 ? '右键查看行操作' : undefined"
        @contextmenu="onCardContextMenu($event, row)">
        <el-checkbox v-if="currentShowCheckbox" class="yk-table__list-item-checkbox"
          :model-value="isRowSelected(row)"
          @change="onCardCheck(row, $event)" />
        <div class="yk-table__list-item-body">
          <slot name="list" :row="row" :index="index">
            <pre class="yk-table__list-item-json">{{ JSON.stringify(row, null, 2) }}</pre>
          </slot>
        </div>
      </div>
      <!-- 空数据提示：与表格视图共享 #empty 插槽；未提供插槽时回落 el-empty「暂无数据」 -->
      <template v-if="!viewLoading && rows.length === 0">
        <slot v-if="$slots.empty" name="empty" />
        <el-empty v-else description="暂无数据" />
      </template>
      <!-- 加载遮罩：三种视图共用 #loading 插槽；未提供插槽时渲染内置 spinner -->
      <transition name="yk-loading-fade">
        <div v-if="viewLoading" class="yk-table__loading-mask">
          <slot name="loading">
            <span class="yk-table__loading-spinner" aria-label="加载中" />
          </slot>
        </div>
      </transition>
    </div>

    <!-- 卡片/列表视图行操作右键菜单：teleport 到 body 避免被容器裁切；
         透明遮罩捕获菜单外点击/右键以关闭，Esc 同样关闭 -->
    <teleport to="body">
      <template v-if="cardMenu">
        <div class="yk-table__menu-mask" @click="cardMenu = null"
          @contextmenu.prevent="cardMenu = null" />
        <ul class="yk-table__context-menu" :style="{ left: `${cardMenu.x}px`, top: `${cardMenu.y}px` }">
          <li v-for="action in cardMenuActions" :key="action.name" class="yk-table__context-menu-item"
            :class="{ 'is-disabled': !isEnabled(action, cardMenu.row) }"
            @click="isEnabled(action, cardMenu.row) && onCardMenuAction(action)">
            <component v-if="action.icon" :is="action.icon" class="yk-table__context-menu-icon" />
            {{ action.desc }}
          </li>
        </ul>
      </template>
    </teleport>

    <!-- 底部栏：左侧 footer 插槽（占剩余空间，可放统计/自定义内容）+ 右侧分页组件。
         align-items:center 使分页垂直居中对齐左侧插槽；插槽内容过高时撑大底部栏高度。
         分页优先占右侧，footer 插槽取剩余空间；无分页且无 footer 插槽时不渲染整个底部栏 -->
    <div v-if="showPagination || $slots.footer" class="yk-table__footer">
      <div class="yk-table__footer-extra">
        <slot name="footer" />
      </div>
      <!-- 数据超过一页时自动显示的分页组件；sizes 支持用户切换每页条数。
           两种模式：totalCount 已知 → layout 含 total，显示「共 N 条」；
           未知 → 隐藏「共 N 条」，total 绑定 hasNext 推导的估算值，
           仅驱动页码与上一页/下一页按钮状态（有下一页时可点） -->
      <el-pagination v-if="showPagination" class="yk-table__pagination"
        :layout="totalKnown ? 'total, sizes, prev, pager, next' : 'sizes, prev, pager, next'"
        :total="total" :page-sizes="pageSizes" :page-size="innerPageSize" :current-page="currentPage"
        @current-change="onPageChange" @size-change="onSizeChange" />
    </div>

    <!-- 导出 Excel 对话框组（范围选择 / 进度 / 取消询问）—— 内部自管 useExportExcel。
         始终挂载：Table 不渲染入口按钮，外部自实现按钮经 expose 的 openExportDialog() 打开。
         props 按相关性分组：数据管道 → 列定义 → 当前页快照 → 选择。
         total 传界面当前总数作为进度条初始分母；导出过程中响应带回 totalCount 时会修正 -->
    <ExportExcelDialog ref="exportDialogRef" :current-rows="rows" :selected-rows="selectedRows"
      :data-fun="props.dataFun" :export-page-size="props.exportPageSize" :total="total"
      :exportor-func="props.exportorFunc"
      :table-name="meta?.displayName ?? '数据'" :columns="columns" :has-more-page="showPagination"
      :export-selected="currentShowCheckbox" />

    <!-- 列设置对话框（内部自管 useCustomConfig；始终挂载，columns 也来自它——
         customConfig 的 width 直接写在 col.width 上，表格读 col.width 即可；
         Table 不渲染入口按钮，外部经 openConfigDialog() 打开；
         innerPageSize 经 defineExpose 暴露 defaultPageSize/updateDefaultPageSize 由 Table 主动读写） -->
    <ColumnConfigDialog ref="configDialogRef" :load-custom-config-fun="loadCustomConfigFun"
      :save-custom-config-fun="saveCustomConfigFun" :meta="meta" />
  </div>
</template>

<style scoped>
/* ---------------- 卡片视图 ---------------- */
.yk-table__cards {
  display: grid;
  /* 自适应列宽：容器够宽时一行多张，窄屏自动降为单列 */
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  /* 加载遮罩始终有可挂载的高度，避免空容器遮罩塌陷 */
  min-height: 120px;
  /* 自制 loading 遮罩的定位上下文（替代原 v-loading 自动追加的 relative） */
  position: relative;
}

.yk-table__card {
  position: relative;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 6px;
  background: var(--el-bg-color, #fff);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.yk-table__card.is-selected {
  border-color: var(--el-color-primary, #409eff);
  /* inset 光晕勾边，比改 border-width 更不引发布局位移 */
  box-shadow: 0 0 0 1px var(--el-color-primary, #409eff) inset;
}

/* 配置了行操作的卡片：右键可弹操作菜单 */
.yk-table__card.has-actions {
  cursor: context-menu;
}

/* ---------------- 列表视图 ---------------- */
.yk-table__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* 加载遮罩始终有可挂载的高度，避免空容器遮罩塌陷 */
  min-height: 120px;
  /* 自制 loading 遮罩的定位上下文（替代原 v-loading 自动追加的 relative） */
  position: relative;
}

.yk-table__list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 6px;
  background: var(--el-bg-color, #fff);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.yk-table__list-item.is-selected {
  border-color: var(--el-color-primary, #409eff);
  /* inset 光晕勾边，与卡片选中态一致，且不引发布局位移 */
  box-shadow: 0 0 0 1px var(--el-color-primary, #409eff) inset;
}

/* 配置了行操作的列表行：右键可弹操作菜单（与卡片共用） */
.yk-table__list-item.has-actions {
  cursor: context-menu;
}

.yk-table__list-item-checkbox {
  flex-shrink: 0;
}

/* 行内容占满剩余宽度；min-width:0 允许插槽内容内部收缩/截断而不撑破行 */
.yk-table__list-item-body {
  flex: 1;
  min-width: 0;
}

/* JSON 兜底样式：与卡片视图的 yk-table__card-json 一致 */
.yk-table__list-item-json {
  margin: 0;
  max-height: 160px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

/* ---------------- 加载遮罩（三种视图共用，#loading 插槽可自定义内容） ---------------- */
/* 表格视图的外层包裹：为遮罩提供定位上下文 */
.yk-table__table-wrap {
  position: relative;
}

.yk-table__loading-mask {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-mask-color, rgba(255, 255, 255, 0.9));
  border-radius: 4px;
}

/* 默认 spinner：纯 CSS 圆环旋转（不依赖 @element-plus/icons-vue） */
.yk-table__loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--el-color-primary, #409eff);
  border-top-color: transparent;
  border-radius: 50%;
  animation: yk-table-loading-spin 0.8s linear infinite;
}

@keyframes yk-table-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 遮罩淡入淡出：自制 transition，不依赖 element-plus 的 el-loading-fade 样式 */
.yk-loading-fade-enter-active,
.yk-loading-fade-leave-active {
  transition: opacity 0.3s;
}

.yk-loading-fade-enter-from,
.yk-loading-fade-leave-to {
  opacity: 0;
}

/* 透明遮罩：铺满视口，捕获菜单外的点击/右键以关闭菜单 */
.yk-table__menu-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
}

.yk-table__context-menu {
  position: fixed;
  z-index: 2001;
  box-sizing: border-box;
  min-width: 120px;
  margin: 4px 0;
  padding: 4px 0;
  list-style: none;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  border-radius: 4px;
  box-shadow: var(--el-box-shadow-light, 0 0 12px rgba(0, 0, 0, 0.12));
}

.yk-table__context-menu-item {
  padding: 0 16px;
  font-size: 14px;
  line-height: 34px;
  color: var(--el-text-color-regular, #606266);
  white-space: nowrap;
  cursor: pointer;
}

.yk-table__context-menu-item:hover {
  background: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-color-primary, #409eff);
}

.yk-table__context-menu-item.is-disabled {
  color: var(--el-disabled-text-color, #a8abb2);
  cursor: not-allowed;
}

.yk-table__context-menu-item.is-disabled:hover {
  background: transparent;
  color: var(--el-disabled-text-color, #a8abb2);
}

/* 右键菜单项图标：stroke 跟随 li 的 color（currentColor），hover 变蓝 / disabled 变灰自动联动 */
.yk-table__context-menu-icon {
  margin-right: 6px;
  vertical-align: middle;
}

.yk-table__card-checkbox {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 1;
}

.yk-table__card-json {
  /* 右侧给悬浮 checkbox 留位 */
  margin: 0;
  padding-right: 24px;
  max-height: 260px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 空态占满整行，而非挤进单列格子 */
.yk-table__cards :deep(.el-empty) {
  grid-column: 1 / -1;
}

/* 底部栏：左侧 footer 插槽 + 右侧分页，flex 布局；分页垂直居中对齐左侧插槽内容 */
.yk-table__footer {
  display: flex;
  align-items: center;
  margin-top: 12px;
  gap: 12px;
}

/* 左侧 footer 插槽区域：占剩余空间，min-width:0 防止内容撑破 flex 布局 */
.yk-table__footer-extra {
  flex: 1;
  min-width: 0;
}

.yk-table__pagination {
  flex-shrink: 0;
  justify-content: flex-end;
}
</style>
