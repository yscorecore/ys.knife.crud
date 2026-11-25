import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import type {
  Column,
  EnumOptionsSource,
  ExportApiFunc,
  FilterInfo,
  MetaFunc,
  PageFunc,
  TableAction,
  TableApi,
  TableProps as CoreTableProps,
  ViewMode,
} from "@ys-knife-crud/core";
import { emptyFilter } from "@ys-knife-crud/core";
import type { SavedQuery } from "../advancedFilter/advancedFilterContext";
import type { TablePageDataFun } from "./tablePageTypes";
import { YsFilterPanel } from "../filter/filterPanel";
import { YsCommandBar } from "../commandBar/commandBar";
import { YsTableActionMenuButton } from "../commandBar/tableActionMenuButton";
import { YsTable } from "../table/table";
import "./tablePage.css";

/** 默认分页大小 / 可选条数 / 空集合常量：保持引用稳定，避免无谓重渲染 */
const DEFAULT_PAGE_SIZES: number[] = [10, 20, 50, 100];
const EMPTY_COLUMNS: Column[] = [];
const EMPTY_ACTIONS: TableAction[] = [];
const EMPTY_ROWS: unknown[] = [];
const EMPTY_RECORDS: Record<string, unknown>[] = [];
const EMPTY_SLOT_NAMES: readonly string[] = [];

/** card / list 插槽：渲染函数，或直接给一段静态内容（每行重复渲染） */
export type TablePageRowSlot =
  | ReactNode
  | ((row: Record<string, unknown>, index: number) => ReactNode);

/** empty / loading / footer 插槽：ReactNode 或零参渲染函数 */
export type TablePageSimpleSlot = ReactNode | (() => ReactNode);

/** YsTablePage 的 props：与 Vue 版 tablePage.vue 一致，事件改为回调 props */
export interface YsTablePageProps {
  metaFun: MetaFunc;
  dataFun: TablePageDataFun;
  rowActionsFunc?: NonNullable<CoreTableProps["rowActionsFunc"]>;
  pageSize?: number;
  pageSizes?: number[];
  showCheckbox?: boolean;
  columnResizable?: boolean;
  stickyHeader?: boolean;
  loadCustomConfigFun?: NonNullable<CoreTableProps["loadCustomConfigFun"]>;
  saveCustomConfigFun?: NonNullable<CoreTableProps["saveCustomConfigFun"]>;
  exportPageSize?: number;
  exportorFunc?: ExportApiFunc;
  rowKey?: string;
  viewMode?: ViewMode;
  actions?: TableAction[];
  showSearch?: boolean;
  showReset?: boolean;
  searchButtonText?: string;
  resetButtonText?: string;
  enableAdvancedFilter?: boolean;
  advancedColumns?: Column[];
  advancedOptionSources?: Record<string, EnumOptionsSource>;
  showQuickQuery?: boolean;
  quickQueries?: SavedQuery[];
  loadQuickQueryFun?: () => Promise<SavedQuery[]>;
  saveQuickQueryFun?: (query: SavedQuery) => Promise<void | SavedQuery>;
  singleLine?: boolean;

  /** 查询回调（替代 search 事件） */
  onSearch?: (filter: FilterInfo) => void;
  /** 重置回调（替代 reset 事件） */
  onReset?: () => void;
  /** 快速查询列表更新回调（替代 update:quickQueries 事件） */
  onUpdateQuickQueries?: (queries: SavedQuery[]) => void;
  /** 表格每次成功加载数据后回调（替代 data-loaded 事件） */
  onDataLoaded?: (paged: Awaited<ReturnType<CoreTableProps["dataFun"]>>) => void;
  /** 视图模式切换回调（替代 update:viewMode 事件） */
  onUpdateViewMode?: (mode: ViewMode) => void;
  /** 选择列显隐切换回调（替代 update:showCheckbox 事件） */
  onUpdateShowCheckbox?: (show: boolean) => void;
  /** 列宽拖动开关切换回调（替代 update:columnResizable 事件） */
  onUpdateColumnResizable?: (resizable: boolean) => void;
  /** 表头锁定开关切换回调（替代 update:stickyHeader 事件） */
  onUpdateStickyHeader?: (sticky: boolean) => void;

  /** filterPanel 默认插槽：查询条件子项 */
  children?: ReactNode;
  /** commandBar 默认插槽：追加在表级命令按钮之后的内容 */
  commandBar?: ReactNode;
  /** filter 右侧自定义区域：占用 filter 右侧空白，宽度按内容自适应；
   *  不传（undefined）时默认渲染 YsTableActionMenuButton；传 null / 空片段则容器为空、filter 横向占满 */
  filterExtra?: ReactNode;
  /** table 的 card / list 插槽 */
  card?: TablePageRowSlot;
  list?: TablePageRowSlot;
  empty?: TablePageSimpleSlot;
  loading?: TablePageSimpleSlot;
  footer?: TablePageSimpleSlot;
}

/** 对外暴露的 API：TableApi 全量转发，另附 table / filterPanel 实例 */
export interface YsTablePageApi extends TableApi {
  /** 内部 YsTable 实例（未挂载时 null） */
  readonly table: TableApi | null;
  /** 内部 YsFilterPanel 实例（未挂载时 null） */
  readonly filterPanel: ComponentRef<typeof YsFilterPanel> | null;
}

/** 把行级插槽归一为 (row, index) 渲染函数（静态节点包装为每行重复） */
function normalizeRowSlot(
  slot: TablePageRowSlot | undefined,
): ((row: Record<string, unknown>, index: number) => ReactNode) | undefined {
  if (slot == null) return undefined;
  if (typeof slot === "function") {
    return slot as (row: Record<string, unknown>, index: number) => ReactNode;
  }
  return () => slot;
}

/** 把零参插槽归一为 ReactNode（渲染函数就地调用） */
function normalizeSimpleSlot(slot: TablePageSimpleSlot | undefined): ReactNode {
  if (typeof slot === "function") return (slot as () => ReactNode)();
  return slot;
}

/**
 * YsTablePage（React + antd）：查询面板 + 命令面板 + 表格的组合页。
 *
 * 与 Vue 版 tablePage.vue 一致：filterPanel 聚合查询条件，commandBar 渲染表级命令，
 * table 负责数据与视图。tablePage 独有的增强在 dataFun——消费者只传
 * (req, filter, signal) 签名的 TablePageDataFun，本组件把当前 FilterInfo 绑定进
 * 适配后的 PageFunc；搜索 / 重置时自动回到第 1 页重新拉取。
 *
 * 事件全部改为回调 props（onDataLoaded / onUpdateViewMode 等），插槽改为
 * camelCase props（children / commandBar / card / list / empty / loading / footer）。
 */
export const YsTablePage = forwardRef<YsTablePageApi, YsTablePageProps>(
  function YsTablePage(props, ref) {
    const {
      metaFun,
      dataFun,
      rowActionsFunc,
      pageSize = 20,
      pageSizes = DEFAULT_PAGE_SIZES,
      showCheckbox = false,
      columnResizable = true,
      stickyHeader = false,
      loadCustomConfigFun,
      saveCustomConfigFun,
      exportPageSize = 1000,
      exportorFunc,
      rowKey = "id",
      viewMode = "table",
      actions = EMPTY_ACTIONS,
      showSearch = true,
      showReset = true,
      searchButtonText = "查询",
      resetButtonText = "重置",
      enableAdvancedFilter = false,
      advancedColumns = EMPTY_COLUMNS,
      advancedOptionSources,
      showQuickQuery = false,
      quickQueries,
      loadQuickQueryFun,
      saveQuickQueryFun,
      singleLine = false,
    } = props;

    /** 当前查询条件：由 filterPanel 的 search/reset 驱动，随 dataFun 一起下发给 Table */
    const currentFilter = useRef<FilterInfo>(emptyFilter() as unknown as FilterInfo);

    /** YsTable 实例（同时用 state 触发 commandBar 在挂载后拿到 table） */
    const tableRef = useRef<ComponentRef<typeof YsTable> | null>(null);
    const [table, setTable] = useState<TableApi | null>(null);
    const filterPanelRef = useRef<ComponentRef<typeof YsFilterPanel> | null>(null);

    const attachTable = useCallback(
      (instance: ComponentRef<typeof YsTable> | null): void => {
        tableRef.current = instance;
        setTable(instance as unknown as TableApi | null);
      },
      [],
    );

    const currentTable = useCallback(
      (): TableApi | null => tableRef.current as unknown as TableApi | null,
      [],
    );

    /** 选中变化版本号：强制本组件重渲染。
     *  React 的 ref 句柄不是响应式的——命令栏内置选中条读取 table.selectedRows，
     *  若本组件不因选中变化重渲染，条会读到过期计数（不出现/数字不对）。 */
    const [, setSelectionVersion] = useState(0);
    const handleSelectionChange = useCallback((): void => {
      setSelectionVersion((v) => v + 1);
    }, []);

    /** 增强 dataFun：把当前 filter 绑定进消费者的 TablePageDataFun，适配为 PageFunc */
    const adaptedDataFun = useCallback<PageFunc<unknown>>(
      (req, signal) => dataFun(req, currentFilter.current, signal),
      [dataFun],
    );

    /** 查询：更新当前条件 → 通知外部 → 回到第 1 页重新加载 */
    const handleSearch = useCallback(
      (filter: FilterInfo): void => {
        currentFilter.current = filter;
        props.onSearch?.(filter);
        tableRef.current?.reload();
      },
      [props.onSearch],
    );

    /** 重置：条件回到空 → 通知外部 → 回到第 1 页重新加载 */
    const handleReset = useCallback((): void => {
      currentFilter.current = emptyFilter() as unknown as FilterInfo;
      props.onReset?.();
      tableRef.current?.reload();
    }, [props.onReset]);

    useImperativeHandle(
      ref,
      () => ({
        get table() {
          return currentTable();
        },
        get filterPanel() {
          return filterPanelRef.current;
        },
        get meta() {
          return currentTable()?.meta ?? null;
        },
        get paged() {
          return currentTable()?.paged ?? null;
        },
        get currentPage() {
          return currentTable()?.currentPage ?? 1;
        },
        get viewMode() {
          return currentTable()?.viewMode ?? "table";
        },
        get selectable() {
          return currentTable()?.selectable ?? false;
        },
        get columnResizable() {
          return currentTable()?.columnResizable ?? true;
        },
        get stickyHeader() {
          return currentTable()?.stickyHeader ?? false;
        },
        get slotNames() {
          return currentTable()?.slotNames ?? EMPTY_SLOT_NAMES;
        },
        get selectedRows() {
          return currentTable()?.selectedRows ?? EMPTY_ROWS;
        },
        get rows() {
          return currentTable()?.rows ?? EMPTY_RECORDS;
        },
        reload: () => {
          currentTable()?.reload();
        },
        refresh: () => {
          currentTable()?.refresh();
        },
        setViewMode: (mode: ViewMode) => {
          currentTable()?.setViewMode(mode);
        },
        setSelectable: (selectable: boolean) => {
          currentTable()?.setSelectable(selectable);
        },
        setColumnResizable: (resizable: boolean) => {
          currentTable()?.setColumnResizable(resizable);
        },
        setStickyHeader: (sticky: boolean) => {
          currentTable()?.setStickyHeader(sticky);
        },
        clearSelection: () => {
          currentTable()?.clearSelection();
        },
        selectAllOnPage: () => {
          currentTable()?.selectAllOnPage();
        },
        invertSelectionOnPage: () => {
          currentTable()?.invertSelectionOnPage();
        },
        openConfigDialog: () => {
          currentTable()?.openConfigDialog();
        },
        openExportDialog: () => {
          currentTable()?.openExportDialog();
        },
      }),
      [currentTable],
    );

    return (
      <div className="yk-table-page">
        {/* filter 行：左侧面板占满剩余宽度，右侧 filter-extra 按内容宽度自适应；
            未传 filterExtra 时默认渲染 YsTableActionMenuButton，传空则 :empty 隐藏、filter 横向占满 */}
        <div className="yk-table-page__filter-row">
          <div className="yk-table-page__filter">
            <YsFilterPanel
              ref={filterPanelRef}
              showSearch={showSearch}
            showReset={showReset}
            searchButtonText={searchButtonText}
            resetButtonText={resetButtonText}
            enableAdvancedFilter={enableAdvancedFilter}
            advancedColumns={advancedColumns}
            advancedOptionSources={advancedOptionSources}
            showQuickQuery={showQuickQuery}
            quickQueries={quickQueries}
            loadQuickQueryFun={loadQuickQueryFun}
            saveQuickQueryFun={saveQuickQueryFun}
            singleLine={singleLine}
            onSearch={handleSearch}
            onReset={handleReset}
            onUpdateQuickQueries={props.onUpdateQuickQueries}
            >
              {props.children}
            </YsFilterPanel>
          </div>
          <div className="yk-table-page__filter-extra">
            {/* 仅未传 filterExtra（undefined）时渲染默认按钮；传 null/空片段则容器为空，:empty 隐藏、filter 占满 */}
            {props.filterExtra === undefined
              ? table
                ? <YsTableActionMenuButton table={table} />
                : null
              : props.filterExtra}
          </div>
        </div>

        <div className="yk-table-page__command">
          <YsCommandBar actions={actions} table={table}>
            {props.commandBar}
          </YsCommandBar>
        </div>

        <div className="yk-table-page__table">
          <YsTable
            ref={attachTable}
            metaFun={metaFun}
            dataFun={adaptedDataFun}
            rowActionsFunc={rowActionsFunc}
            pageSize={pageSize}
            pageSizes={pageSizes}
            showCheckbox={showCheckbox}
            columnResizable={columnResizable}
            stickyHeader={stickyHeader}
            loadCustomConfigFun={loadCustomConfigFun}
            saveCustomConfigFun={saveCustomConfigFun}
            exportPageSize={exportPageSize}
            exportorFunc={exportorFunc}
            rowKey={rowKey}
            viewMode={viewMode}
            onDataLoaded={props.onDataLoaded}
            onUpdateViewMode={props.onUpdateViewMode}
            onUpdateShowCheckbox={props.onUpdateShowCheckbox}
            onUpdateColumnResizable={props.onUpdateColumnResizable}
            onUpdateStickyHeader={props.onUpdateStickyHeader}
            onSelectionChange={handleSelectionChange}
            card={normalizeRowSlot(props.card)}
            list={normalizeRowSlot(props.list)}
            empty={normalizeSimpleSlot(props.empty)}
            loading={normalizeSimpleSlot(props.loading)}
            footer={normalizeSimpleSlot(props.footer)}
          />
        </div>
      </div>
    );
  },
);

YsTablePage.displayName = "YsTablePage";

export default YsTablePage;
