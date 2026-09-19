<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef, watch, type PropType, type Ref } from "vue";
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
  /**
   * 是否渲染内置的跨页选中提示条（「已选 N 项 · 清空」），默认 true。
   * 为 false 时不渲染内置提示条（选中仍按 rowKey 跨页累计，selectedRows/clearSelection
   * 照常可用），由外部自行渲染自定义样式的提示条。
   */
  showSelectionBar: { type: Boolean, default: true },
  /**
   * 为 true 时渲染内置的「⚙ 列设置」入口按钮，默认 false。
   * 设为 false 时不渲染内置按钮——外部可自实现按钮并经 expose 的
   * openConfigDialog() 打开内置列设置面板（面板始终挂载）。
   */
  showCustomConfig: { type: Boolean, default: false },
  /** 加载自定义配置（含列设置与用户默认分页大小；返回 null 按空配置处理） */
  loadCustomConfigFun: { type: Function as PropType<NonNullable<CoreTableProps["loadCustomConfigFun"]>>, required: false },
  /** 保存自定义配置（含列设置与用户默认分页大小） */
  saveCustomConfigFun: { type: Function as PropType<NonNullable<CoreTableProps["saveCustomConfigFun"]>>, required: false },
  /**
   * 为 true 时渲染内置的「⬇ 导出 Excel」入口按钮，默认 false。
   * 设为 false 时不渲染内置按钮——外部可自实现按钮并经 expose 的
   * openExportDialog() 打开内置导出对话框（对话框始终挂载）。
   */
  showExportExcel: { type: Boolean, default: false },
  /** 导出「所有数据」时每次分页拉取的条数，默认 1000（独立于界面分页大小） */
  exportPageSize: { type: Number, default: 1000 },
  /** 导出实现工厂：每次导出调用它得到一个全新的 ExportApi 实例，组件只经该接口写文件。
   *  缺省使用内置 ExcelJS 实现（createExcelJsExportApiFunc）；
   *  将来可替换为其它实现（CSV、服务端导出等），组件无需改动 */
  exportorFunc: { type: Function as PropType<NonNullable<CoreTableProps["exportorFunc"]>>, required: false },
  /** 行 key，默认 "id" */
  rowKey: { type: String, default: "id" },
  /**
   * 展示形态，默认 "table"（表格视图）；设为 "card" 时以卡片网格渲染当前页行。
   * 受控与非受控皆可：用 v-model:view-mode 时由父级驱动；不绑定时内置切换控件
   * 自行切换（组件内部维护状态，同时照常派发 update:viewMode）。
   */
  viewMode: { type: String as PropType<ViewMode>, default: "table" },
  /**
   * 是否在工具栏内置「表格 / 卡片」切换控件，默认 true。
   * 置 false 时不渲染内置控件，由外部自行渲染切换控件（仍经 v-model:view-mode 驱动）。
   */
  showViewSwitch: { type: Boolean, default: true },
});

/** 单次加载完成后的结果（PagedList）；组件对外事件基于此类型 */
type PagedResult = Awaited<ReturnType<CoreTableProps["dataFun"]>>;

/** 对外事件：data-loaded 在每次 dataFun 成功返回后触发，携带本次加载的分页结果 */
const emit = defineEmits<{
  (e: "data-loaded", paged: PagedResult): void;
  /** 内置视图切换控件切换时触发，配合 viewMode prop 做 v-model:view-mode */
  (e: "update:viewMode", mode: ViewMode): void;
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
 * showCustomConfig=false（不渲染内置「⚙ 列设置」按钮）、外部自实现按钮时的打开入口。
 */
function openConfigDialog(): void {
  configDialogRef.value?.openDialog();
}

/**
 * 打开内置导出 Excel 对话框——委托 ExportExcelDialog 的 openExportDialog。
 * showExportExcel=false（不渲染内置「⬇ 导出 Excel」按钮）、外部自实现按钮时的打开入口。
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
  if (row) void action.execute(row);
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
  selectedRows,
  rows,
  reload,
  clearSelection,
  openConfigDialog,
  openExportDialog,
} satisfies ExposedShape;

defineExpose(exposed);
</script>

<template>
  <div class="yk-table">
    <!-- 顶部工具栏：左侧为跨页选中提示（有选中时显示），右侧为视图切换 / 导出 / 列设置入口。
         同一行节省纵向空间。启用任一能力即常驻渲染并保持固定行高——
         仅勾选的表格里，选中提示的出现/消失不再增减这一行的高度，
         表头不会上下抖动（与入口控件常驻时的表现对齐）。
         showSelectionBar=false 时左侧提示条不渲染（由外部自行实现），右侧控件组照常 -->
    <div v-if="(showCheckbox && showSelectionBar) || showViewSwitch || showCustomConfig || showExportExcel"
      class="yk-table__toolbar">
      <!-- 跨页选中提示：选中按 rowKey 跨页累计，可能来自其他页，给用户一个总览与清空入口。
           无选中时 SelectionBar 不渲染任何元素，右侧控件组靠 margin-left:auto 自行贴右，
           不依赖占位元素 -->
      <SelectionBar v-if="showCheckbox && showSelectionBar" :count="selectedRows.length"
        @clear="clearSelection" @select-all="selectAllOnPage" @invert="invertSelectionOnPage" />
      <div class="yk-table__toolbar-actions">
        <el-button v-if="showExportExcel" link type="primary" class="yk-table__export-btn"
          @click="openExportDialog()">
          ⬇ 导出 Excel
        </el-button>
        <el-button v-if="showCustomConfig" link type="primary" class="yk-table__config-btn"
          @click="openConfigDialog()">
          ⚙ 列设置
        </el-button>
        <!-- 内置「表格 / 卡片」视图切换，位于列设置入口右侧；showViewSwitch=false 时
             由外部经 v-model:view-mode 或监听 update:viewMode 自控 -->
        <el-radio-group v-if="showViewSwitch" v-model="currentViewMode" size="small"
          class="yk-table__view-switch">
          <el-radio-button value="table">表格</el-radio-button>
          <el-radio-button value="card">卡片</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 表格视图：v-if 与卡片视图二选一；切回本视图后由 useSelection.restoreSelection
         把跨页累计选中恢复到勾选列（选中状态以 rowKey Map 为准，不再用 reserve-selection） -->
    <el-table v-if="currentViewMode === 'table'" ref="tableEl" v-loading="viewLoading" :data="rows"
      :row-key="rowKey" border @selection-change="onSelectionChange" @header-dragend="onColumnResize">
      <!-- 空数据提示：使用者经 #empty 插槽自定义；仅在使用者提供了插槽时才声明，
           否则保留 el-table 默认的「暂无数据」空态 -->
      <template v-if="$slots.empty" #empty>
        <slot name="empty" />
      </template>
      <!-- 勾选列：跨页保留由 useSelection 的 rowKey Map 受控维护，表头 checkbox 全选/取消全选当前页 -->
      <el-table-column v-if="showCheckbox" type="selection" width="48" />
      <!-- 数据列：col.render 存在时优先用自定义渲染（返回字符串/VNode 均可，
           经函数式组件呈现），否则走默认的 propertyPath 取值显示 -->
      <el-table-column v-for="col in columns" :key="col.propertyPath" :prop="col.propertyPath" :label="col.displayName"
        :width="col.width" show-overflow-tooltip>
        <template v-if="col.render" #default="{ row }">
          <component :is="() => col.render!(row, (row as Record<string, unknown>)[col.propertyPath])" />
        </template>
      </el-table-column>
      <!-- 行操作列：actions 状态归 Table 所有（视图切换往返不丢失；卡片右键菜单共用） -->
      <RowActionsColumn v-if="props.rowActionsFunc" :actions="actions" />
    </el-table>

    <!-- 卡片视图：当前页每行一张卡片；卡片内容经 #card 插槽自定义（作用域为 { row, index }），
         未提供插槽时默认把整行 JSON 序列化展示。checkbox 与表格视图共用同一套跨页选中状态。
         存在行操作（rowActionsFunc）时，卡片上右键弹出操作菜单（与操作列同一套 actions） -->
    <div v-else v-loading="viewLoading" class="yk-table__cards">
      <div v-for="(row, index) in rows" :key="String(row[rowKey])" class="yk-table__card"
        :class="{
          'is-selected': showCheckbox && isRowSelected(row),
          'has-actions': actions.length > 0,
        }"
        :title="actions.length > 0 ? '右键查看行操作' : undefined"
        @contextmenu="onCardContextMenu($event, row)">
        <el-checkbox v-if="showCheckbox" class="yk-table__card-checkbox"
          :model-value="isRowSelected(row)"
          @change="onCardCheck(row, $event)" />
        <slot name="card" :row="row" :index="index">
          <pre class="yk-table__card-json">{{ JSON.stringify(row, null, 2) }}</pre>
        </slot>
      </div>
      <el-empty v-if="!viewLoading && rows.length === 0" description="暂无数据" />
    </div>

    <!-- 卡片视图行操作右键菜单：teleport 到 body 避免被容器裁切；
         透明遮罩捕获菜单外点击/右键以关闭，Esc 同样关闭 -->
    <teleport to="body">
      <template v-if="cardMenu">
        <div class="yk-table__menu-mask" @click="cardMenu = null"
          @contextmenu.prevent="cardMenu = null" />
        <ul class="yk-table__context-menu" :style="{ left: `${cardMenu.x}px`, top: `${cardMenu.y}px` }">
          <li v-for="action in cardMenuActions" :key="action.name" class="yk-table__context-menu-item"
            :class="{ 'is-disabled': !isEnabled(action, cardMenu.row) }"
            @click="isEnabled(action, cardMenu.row) && onCardMenuAction(action)">
            {{ action.desc }}
          </li>
        </ul>
      </template>
    </teleport>

    <!-- 数据超过一页时自动显示的分页组件；sizes 支持用户切换每页条数。
         两种模式：totalCount 已知 → layout 含 total，显示「共 N 条」；
         未知 → 隐藏「共 N 条」，total 绑定 hasNext 推导的估算值，
         仅驱动页码与上一页/下一页按钮状态（有下一页时可点） -->
    <el-pagination v-if="showPagination" class="yk-table__pagination"
      :layout="totalKnown ? 'total, sizes, prev, pager, next' : 'sizes, prev, pager, next'"
      :total="total" :page-sizes="pageSizes" :page-size="innerPageSize" :current-page="currentPage"
      @current-change="onPageChange" @size-change="onSizeChange" />

    <!-- 导出 Excel 对话框组（范围选择 / 进度 / 取消询问）—— 内部自管 useExportExcel。
         始终挂载（与列设置面板一致）：showExportExcel 只控制内置按钮显隐，
         置 false 且外部自实现按钮时经 expose 的 openExportDialog() 打开。
         props 按相关性分组：数据管道 → 列定义 → 当前页快照 → 选择。
         total 传界面当前总数作为进度条初始分母；导出过程中响应带回 totalCount 时会修正 -->
    <ExportExcelDialog ref="exportDialogRef" :current-rows="rows" :selected-rows="selectedRows"
      :data-fun="props.dataFun" :export-page-size="props.exportPageSize" :total="total"
      :exportor-func="props.exportorFunc"
      :table-name="meta?.displayName ?? '数据'" :columns="columns" :has-more-page="showPagination"
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
  /* 固定行高（el-button 默认高度）：无选中且无入口按钮时也保留这一行，
     选中提示出现/消失时表头不再上下移动 */
  min-height: var(--el-component-size, 32px);
  margin-bottom: 2px;
}

.yk-table__toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  /* 无论左侧选中提示是否存在，控件组始终吸附工具栏右侧 */
  margin-left: auto;
}

.yk-table__view-switch {
  /* 与左侧「列设置」文字入口拉开距离 */
  margin-left: 4px;
}

/* ---------------- 卡片视图 ---------------- */
.yk-table__cards {
  display: grid;
  /* 自适应列宽：容器够宽时一行多张，窄屏自动降为单列 */
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  /* 加载遮罩始终有可挂载的高度，避免空容器遮罩塌陷 */
  min-height: 120px;
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

.yk-table__pagination {
  margin-top: 12px;
  justify-content: flex-end;
}
</style>
