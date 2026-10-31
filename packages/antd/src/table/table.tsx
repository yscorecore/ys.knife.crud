/// <reference types="vite/client" />
import {
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Key, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { Empty, Pagination, Table } from "antd";
import type { ColumnType } from "antd/es/table";
import type {
  Action,
  Column,
  CustomColumnConfig,
  CustomConfig,
  DraftColumn,
  PagedList,
  TableApi,
  TableProps as CoreTableProps,
  ViewMode,
} from "@ys-knife-crud/core";
import {
  isEnabled,
  useCustomConfig,
  useDefault,
  useExportExcel,
  useRowActions,
  useSelection,
  visibleActions,
} from "@ys-knife-crud/react";
import { YsCardView } from "./cardView";
import { YsColumnConfigDialog } from "./columnConfigDialog";
import { YsContextMenu, type YsContextMenuState } from "./contextMenu";
import { YsExportExcelDialog } from "./exportExcelDialog";
import { YsListView } from "./listView";
import { rowActionsColumn } from "./rowActionsColumn";
import "./table.css";

type RowRecord = Record<string, unknown>;

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];
const DEFAULT_EXPORT_PAGE_SIZE = 1000;

/** 选中提示条插槽上下文（供外部自实现选中提示条） */
export interface YsSelectionBarContext {
  selectedRows: unknown[];
  total: number;
  clearSelection: () => void;
  selectAllOnPage: () => void;
  invertSelectionOnPage: () => void;
  pageSize: number;
}

/**
 * YsTable 的 props：与 element-plus 版 table.vue 的 defineProps 同名同义。
 * - Vue 事件改为回调 props：onDataLoaded / onUpdateViewMode / onUpdateShowCheckbox /
 *   onUpdateColumnResizable / onUpdateStickyHeader；
 * - Vue 插槽改为 React props：empty/footer/loading/card/list/selectionBar。
 */
export interface YsTableProps {
  metaFun: CoreTableProps["metaFun"];
  dataFun: CoreTableProps["dataFun"];
  rowActionsFunc?: CoreTableProps["rowActionsFunc"];
  pageSize?: number;
  pageSizes?: number[];
  showCheckbox?: boolean;
  columnResizable?: boolean;
  stickyHeader?: boolean;
  loadCustomConfigFun?: CoreTableProps["loadCustomConfigFun"];
  saveCustomConfigFun?: CoreTableProps["saveCustomConfigFun"];
  exportPageSize?: number;
  exportorFunc?: CoreTableProps["exportorFunc"];
  rowKey?: string;
  viewMode?: ViewMode;
  /** 每次 dataFun 成功返回后触发，携带本次加载的分页结果 */
  onDataLoaded?: (paged: PagedList<unknown>) => void;
  /** 视图模式切换时触发（父级传入 viewMode 时为受控） */
  onUpdateViewMode?: (mode: ViewMode) => void;
  /** 选择列显隐切换时触发（父级传入 showCheckbox 时为受控） */
  onUpdateShowCheckbox?: (show: boolean) => void;
  /** 列宽拖动开关切换时触发（父级传入 columnResizable 时为受控） */
  onUpdateColumnResizable?: (resizable: boolean) => void;
  /** 表头锁定开关切换时触发（父级传入 stickyHeader 时为受控） */
  onUpdateStickyHeader?: (sticky: boolean) => void;
  /** 空数据提示：表格 / 卡片 / 列表三种视图共享 */
  empty?: ReactNode;
  footer?: ReactNode;
  loading?: ReactNode;
  card?: (row: RowRecord, index: number) => ReactNode;
  list?: (row: RowRecord, index: number) => ReactNode;
  selectionBar?: (ctx: YsSelectionBarContext) => ReactNode;
}

/** 列宽字符串（"120"）解析为像素数字；非法/空值返回 undefined */
function parseColumnWidth(width?: string): number | undefined {
  if (!width) return undefined;
  const parsed = Number.parseInt(width, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * col.render 的返回值转 ReactNode：字符串/数字/React 元素直接呈现，
 * 其他值退化为文本，保证单元格始终可渲染。
 */
function renderCell(value: unknown): ReactNode {
  if (value === null || value === undefined) return null;
  if (isValidElement(value)) return value;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export const YsTable = forwardRef<TableApi, YsTableProps>(function YsTable(props, ref) {
  const pageSize = props.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageSizes = props.pageSizes ?? DEFAULT_PAGE_SIZES;
  const rowKey = props.rowKey ?? "id";
  const exportPageSize = props.exportPageSize ?? DEFAULT_EXPORT_PAGE_SIZE;

  /** 最新 props 快照：供内部稳定回调读取父级最新传参 */
  const propsRef = useRef(props);
  propsRef.current = props;

  /* ---------------- 默认状态（useDefault） ---------------- */
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
    setPaged,
    setDataLoading,
    setCurrentPage,
  } = useDefault({ metaFun: props.metaFun, dataFun: props.dataFun, pageSize, pageSizes });

  /* ---------------- 行选择（checkbox 列） ---------------- */
  const {
    selectedRows,
    selectedRowKeys,
    onSelectionChange,
    isRowSelected,
    toggleRowSelection,
    clearSelection,
    selectAllOnPage,
    invertSelectionOnPage,
  } = useSelection({ rows, rowKey });

  /* ---------------- 行操作（视图切换/卡片右键与操作列共用） ---------------- */
  const { actions, actionsLoading, loadActions } = useRowActions({ rowActionsFunc: props.rowActionsFunc });

  /* ---------------- 列自定义配置（列定义 / 默认分页大小 / 列宽） ---------------- */
  const {
    customConfigs,
    customConfigLoading,
    defaultPageSize,
    configDialogVisible,
    columns,
    loadCustomConfigs,
    updateDefaultPageSize,
    updateColumnWidth,
    openConfigDialog: openHookConfigDialog,
    closeConfigDialog,
  } = useCustomConfig(
    { loadCustomConfigFun: props.loadCustomConfigFun, saveCustomConfigFun: props.saveCustomConfigFun },
    meta,
  );

  /** 当前生效的每页条数：用户保存的默认值优先，否则回落到 props.pageSize */
  const innerPageSize = defaultPageSize ?? pageSize;

  /**
   * 数据超过一页（或已知还有下一页）时自动显示分页组件。
   * 阈值取「当前每页条数」与「可选条数最小值」的较小者，调大每页后分页不消失。
   */
  const showPagination =
    total > Math.min(innerPageSize, ...pageSizes) || (paged?.hasNext ?? false);

  /* ---------------- 受控 / 非受控状态 ---------------- */
  const viewModeProp = props.viewMode;
  const [innerViewMode, setInnerViewMode] = useState<ViewMode>(viewModeProp ?? "table");
  useEffect(() => {
    if (viewModeProp !== undefined) setInnerViewMode(viewModeProp);
  }, [viewModeProp]);
  const currentViewMode: ViewMode = viewModeProp ?? innerViewMode;

  const showCheckboxProp = props.showCheckbox;
  const [innerShowCheckbox, setInnerShowCheckbox] = useState(showCheckboxProp ?? false);
  useEffect(() => {
    if (showCheckboxProp !== undefined) setInnerShowCheckbox(showCheckboxProp);
  }, [showCheckboxProp]);
  const currentShowCheckbox = showCheckboxProp ?? innerShowCheckbox;

  const columnResizableProp = props.columnResizable;
  const [innerColumnResizable, setInnerColumnResizable] = useState(columnResizableProp ?? true);
  useEffect(() => {
    if (columnResizableProp !== undefined) setInnerColumnResizable(columnResizableProp);
  }, [columnResizableProp]);
  const currentColumnResizable = columnResizableProp ?? innerColumnResizable;

  const stickyHeaderProp = props.stickyHeader;
  const [innerStickyHeader, setInnerStickyHeader] = useState(stickyHeaderProp ?? false);
  useEffect(() => {
    if (stickyHeaderProp !== undefined) setInnerStickyHeader(stickyHeaderProp);
  }, [stickyHeaderProp]);
  const currentStickyHeader = stickyHeaderProp ?? innerStickyHeader;

  /* ---------------- 导出 Excel（useExportExcel） ---------------- */
  const {
    exportOptions,
    exportDialogVisible,
    exporting,
    exportFetched,
    exportTotal,
    exportTotalKnown,
    exportEtaSeconds,
    exportPercent,
    exportCancelledVisible,
    exportCancelledRows,
    openExportDialog,
    closeExportDialog,
    doExport,
    cancelExport,
    keepPartialExport,
    discardPartialExport,
  } = useExportExcel({
    props: { dataFun: props.dataFun, exportSelected: currentShowCheckbox, exportorFunc: props.exportorFunc },
    tableName: meta?.displayName ?? "数据",
    columns,
    currentRows: rows,
    selectedRows,
    total,
    exportPageSize,
    hasMorePage: showPagination,
  });

  const setViewMode = useCallback((mode: ViewMode): void => {
    setInnerViewMode(mode);
    propsRef.current.onUpdateViewMode?.(mode);
  }, []);

  const setSelectable = useCallback(
    (selectable: boolean): void => {
      setInnerShowCheckbox(selectable);
      propsRef.current.onUpdateShowCheckbox?.(selectable);
      // 关闭选择列时清空累计选中，避免隐藏状态下残留选择影响导出范围
      if (!selectable) clearSelection();
    },
    [clearSelection],
  );

  const setColumnResizable = useCallback((resizable: boolean): void => {
    setInnerColumnResizable(resizable);
    propsRef.current.onUpdateColumnResizable?.(resizable);
  }, []);

  const setStickyHeader = useCallback((sticky: boolean): void => {
    setInnerStickyHeader(sticky);
    propsRef.current.onUpdateStickyHeader?.(sticky);
  }, []);

  /* ---------------- 数据加载与分页 ---------------- */
  const dataFunRef = useRef(props.dataFun);
  dataFunRef.current = props.dataFun;
  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;
  const defaultPageSizeRef = useRef(defaultPageSize);
  defaultPageSizeRef.current = defaultPageSize;
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  const onDataLoadedRef = useRef(props.onDataLoaded);
  onDataLoadedRef.current = props.onDataLoaded;

  /** 请求序号：并发加载时只应用最后一次结果，避免旧响应覆盖新数据 */
  const loadSeqRef = useRef(0);

  const loadData = useCallback(
    async (options?: { limit?: number; page?: number; signal?: AbortSignal }): Promise<void> => {
      const seq = ++loadSeqRef.current;
      const limit = options?.limit ?? defaultPageSizeRef.current ?? pageSizeRef.current;
      const page = options?.page ?? currentPageRef.current;
      setDataLoading(true);
      try {
        const result = await dataFunRef.current({ limit, offset: (page - 1) * limit }, options?.signal);
        if (seq !== loadSeqRef.current) return;
        setPaged(result);
        // 请求成功才通知外部；异常时 await 直接抛出，不会走到这里
        onDataLoadedRef.current?.(result);
      } finally {
        if (seq === loadSeqRef.current) setDataLoading(false);
      }
    },
    [setDataLoading, setPaged],
  );

  /** 翻页：更新页码并重新请求对应 offset 的数据 */
  const onPageChange = useCallback(
    (page: number): void => {
      currentPageRef.current = page;
      setCurrentPage(page);
      void loadData({ page });
    },
    [loadData, setCurrentPage],
  );

  /**
   * 切换每页条数：先持久化为默认值（innerPageSize 立即反映新值），
   * 再回到第一页按新 limit 重新请求。
   */
  const onSizeChange = useCallback(
    (size: number): void => {
      updateDefaultPageSize(size);
      currentPageRef.current = 1;
      setCurrentPage(1);
      void loadData({ limit: size, page: 1 });
    },
    [loadData, setCurrentPage, updateDefaultPageSize],
  );

  /** 首次挂载：按当前 innerPageSize 拉第一页；配置若有保存的分页大小，随后再对齐一次 */
  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    void loadData({ page: 1 });
  }, [loadData]);

  /** reload() 触发的重载令牌：等默认分页大小等状态提交后再拉数据 */
  const [reloadToken, setReloadToken] = useState(0);
  const handledReloadTokenRef = useRef(0);
  useEffect(() => {
    if (reloadToken === handledReloadTokenRef.current) return;
    handledReloadTokenRef.current = reloadToken;
    void loadData({ page: 1 });
  }, [reloadToken, loadData]);

  /** 自定义配置首次带回保存的默认分页大小：若与 props.pageSize 不同，按新大小重拉第一页 */
  const prevDefaultPageSizeRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const prev = prevDefaultPageSizeRef.current;
    prevDefaultPageSizeRef.current = defaultPageSize;
    if (prev !== undefined || defaultPageSize === undefined) return;
    if (defaultPageSize === pageSizeRef.current) return;
    currentPageRef.current = 1;
    setCurrentPage(1);
    void loadData({ page: 1 });
  }, [defaultPageSize, loadData, setCurrentPage]);

  /** 外部 pageSize 变化：走与用户下拉切换同一路径（持久化为默认值、回第一页、重新加载） */
  const prevPageSizeRef = useRef(pageSize);
  useEffect(() => {
    if (prevPageSizeRef.current === pageSize) return;
    prevPageSizeRef.current = pageSize;
    onSizeChange(pageSize);
  }, [pageSize, onSizeChange]);

  /** 数据源变化视为全新查询：回到第一页再加载 */
  const prevDataFunRef = useRef(props.dataFun);
  useEffect(() => {
    if (prevDataFunRef.current === props.dataFun) return;
    prevDataFunRef.current = props.dataFun;
    currentPageRef.current = 1;
    setCurrentPage(1);
    void loadData({ page: 1 });
  }, [props.dataFun, loadData, setCurrentPage]);

  /**
   * 重新加载：metaFun / 行操作 / 列自定义配置 三者并行加载，
   * 全部完成后再按（可能已更新的）默认分页大小回到第一页加载数据。
   */
  async function reload(): Promise<void> {
    await Promise.all([loadMeta(), loadActions(), loadCustomConfigs()]);
    currentPageRef.current = 1;
    setCurrentPage(1);
    setReloadToken((token) => token + 1);
  }

  /**
   * 仅刷新当前页数据：保留页码 / 每页条数与选中状态，不重载 meta / 行操作 / 配置。
   */
  function refresh(): void {
    void loadData();
  }

  /* ---------------- 列宽拖拽（antd 无 resizable，用表头右缘手柄自实现） ---------------- */
  const [dragWidth, setDragWidth] = useState<{ propertyPath: string; width: number } | null>(null);

  function startResize(
    event: ReactMouseEvent<HTMLElement>,
    propertyPath: string,
    startWidth: number,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const widthAt = (clientX: number): number => Math.max(40, Math.round(startWidth + clientX - startX));
    const onMove = (moveEvent: MouseEvent): void => {
      setDragWidth({ propertyPath, width: widthAt(moveEvent.clientX) });
    };
    const onUp = (upEvent: MouseEvent): void => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      const width = widthAt(upEvent.clientX);
      setDragWidth(null);
      updateColumnWidth(propertyPath, width);
    };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  /* ---------------- 卡片 / 列表视图：行操作右键菜单 ---------------- */
  const [cardMenu, setCardMenu] = useState<YsContextMenuState | null>(null);
  const cardMenuActions = cardMenu ? visibleActions(actions, cardMenu.row) : [];

  /**
   * 卡片右键：存在行操作时拦截浏览器默认菜单并弹出自定义菜单。
   * 位置做视口边界收敛，避免菜单溢出屏幕。
   */
  function onCardContextMenu(event: ReactMouseEvent<HTMLDivElement>, row: RowRecord): void {
    if (actions.length === 0) return;
    event.preventDefault();
    const menuWidth = 176;
    const itemHeight = 34;
    const menuHeight = visibleActions(actions, row).length * itemHeight + 8;
    setCardMenu({
      x: Math.min(event.clientX, window.innerWidth - menuWidth - 8),
      y: Math.min(event.clientY, window.innerHeight - menuHeight - 8),
      row,
    });
  }

  function onCardCheck(row: RowRecord, checked: boolean): void {
    toggleRowSelection(row, checked);
  }

  function onCardMenuAction(action: Action<unknown>): void {
    const row = cardMenu?.row;
    setCardMenu(null);
    if (row) void action.execute(row, tableApi);
  }

  /* ---------------- 列设置对话框（草稿由本组件维护） ---------------- */
  const [draftColumns, setDraftColumns] = useState<DraftColumn[]>([]);

  /** 参与显示的列（按 displayOrder 排序），用于生成列设置草稿 */
  const displayColumns = useMemo<Column[]>(() => {
    return (meta?.columns ?? [])
      .map((col, index) => ({ col, index }))
      .filter(({ col }) => col.showForDisplay ?? true)
      .sort((a, b) => (a.col.displayOrder ?? a.index) - (b.col.displayOrder ?? b.index))
      .map(({ col }) => col);
  }, [meta]);

  function buildDraftColumns(): DraftColumn[] {
    const configColumns = customConfigs.columns;
    return displayColumns
      .map((col, index) => ({ col, config: configColumns[col.propertyPath], index }))
      .sort((a, b) => (a.config?.order ?? a.index) - (b.config?.order ?? b.index))
      .map(({ col, config }) => ({
        propertyPath: col.propertyPath,
        displayName: col.displayName ?? col.propertyPath,
        visible: config?.visible ?? true,
        width: config?.width ?? "",
      }));
  }

  function openConfigDialog(): void {
    setDraftColumns(buildDraftColumns());
    openHookConfigDialog();
  }

  /** 重置草稿：全部可见、按 displayOrder 排序、清空宽度 */
  function resetDraftColumns(): void {
    setDraftColumns(
      displayColumns.map((col) => ({
        propertyPath: col.propertyPath,
        displayName: col.displayName ?? col.propertyPath,
        visible: true,
        width: "",
      })),
    );
  }

  function moveDraftColumns(index: number, delta: number): void {
    setDraftColumns((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      if (!item) return prev;
      next.splice(target, 0, item);
      return next;
    });
  }

  async function saveConfigDialog(): Promise<void> {
    const configColumns: Record<string, CustomColumnConfig> = {};
    draftColumns.forEach((draft, index) => {
      configColumns[draft.propertyPath] = {
        propertyPath: draft.propertyPath,
        visible: draft.visible,
        order: index,
        width: draft.width,
      };
    });
    const configs: CustomConfig = { pageSize: defaultPageSize, columns: configColumns };
    await propsRef.current.saveCustomConfigFun?.(configs);
    closeConfigDialog();
    // 保存后重新读取配置，让 useCustomConfig 的 columns 反映最新保存结果
    if (propsRef.current.loadCustomConfigFun) await loadCustomConfigs();
  }

  /* ---------------- 视图加载态（三视图共用同一个遮罩） ---------------- */
  const viewLoading = metaLoading || dataLoading || actionsLoading || customConfigLoading;

  /* ---------------- 已提供插槽名（供外部菜单决定视图切换入口） ---------------- */
  const slotNames: string[] = [];
  if (props.empty != null) slotNames.push("empty");
  if (props.footer != null) slotNames.push("footer");
  if (props.loading != null) slotNames.push("loading");
  if (props.card != null) slotNames.push("card");
  if (props.list != null) slotNames.push("list");
  if (props.selectionBar != null) slotNames.push("selectionBar");

  /* ---------------- TableApi（状态用 getter 返回当前值） ---------------- */
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const pagedRef = useRef(paged);
  pagedRef.current = paged;
  const viewModeRef = useRef(currentViewMode);
  viewModeRef.current = currentViewMode;
  const showCheckboxRef = useRef(currentShowCheckbox);
  showCheckboxRef.current = currentShowCheckbox;
  const columnResizableRef = useRef(currentColumnResizable);
  columnResizableRef.current = currentColumnResizable;
  const stickyHeaderRef = useRef(currentStickyHeader);
  stickyHeaderRef.current = currentStickyHeader;
  const selectedRowsRef = useRef(selectedRows);
  selectedRowsRef.current = selectedRows;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const slotNamesRef = useRef<string[]>(slotNames);
  slotNamesRef.current = slotNames;

  const tableApi: TableApi = {
    get meta() {
      return metaRef.current;
    },
    get paged() {
      return pagedRef.current;
    },
    get currentPage() {
      return currentPageRef.current;
    },
    get viewMode() {
      return viewModeRef.current;
    },
    get selectable() {
      return showCheckboxRef.current;
    },
    get columnResizable() {
      return columnResizableRef.current;
    },
    get stickyHeader() {
      return stickyHeaderRef.current;
    },
    get slotNames() {
      return slotNamesRef.current;
    },
    get selectedRows() {
      return selectedRowsRef.current;
    },
    get rows() {
      return rowsRef.current;
    },
    reload,
    refresh,
    setViewMode,
    setSelectable,
    setColumnResizable,
    setStickyHeader,
    clearSelection,
    selectAllOnPage,
    invertSelectionOnPage,
    openConfigDialog,
    openExportDialog,
  };

  /**
   * 对外暴露稳定的 TableApi 外壳。
   * tableApi 每次渲染都是新对象；若直接把新对象交给 useImperativeHandle，
   * React 会在每次渲染后重新调用 callback ref（如 YsTablePage 里的 ref 回调），
   * 回调里的 setState 又会触发下一轮渲染，最终报 "Maximum update depth exceeded"。
   * 这里只创建一次 Proxy：引用稳定，属性/方法转发到「最近一次渲染」的 tableApi，
   * 因此既能避免 callback ref 抖动，又不会拿到旧闭包。
   */
  const latestApiRef = useRef<TableApi>(tableApi);
  latestApiRef.current = tableApi;
  const stableApiRef = useRef<TableApi | null>(null);
  if (stableApiRef.current === null) {
    stableApiRef.current = new Proxy({} as TableApi, {
      get: (_target, key) => Reflect.get(latestApiRef.current, key),
      has: (_target, key) => Reflect.has(latestApiRef.current, key),
    });
  }

  useImperativeHandle(ref, () => stableApiRef.current as TableApi, []);

  /* ---------------- antd 列定义 ---------------- */
  const antdColumns: ColumnType<RowRecord>[] = columns.map((col) => {
    const width =
      dragWidth?.propertyPath === col.propertyPath ? dragWidth.width : parseColumnWidth(col.width);
    return {
      key: col.propertyPath,
      dataIndex: col.propertyPath,
      title: col.displayName ?? col.propertyPath,
      width,
      ellipsis: true,
      render: col.render
        ? (value: unknown, record: RowRecord) => renderCell(col.render!(record, value))
        : (value: unknown) => renderCell(value),
      onHeaderCell: () => ({
        className: `yk-table__col-header${currentColumnResizable ? " yk-table__col-header--resizable" : ""}`,
        ...(currentColumnResizable
          ? {
              onMouseDown: (event: ReactMouseEvent<HTMLTableCellElement>) => {
                const rect = event.currentTarget.getBoundingClientRect();
                // 仅在表头右缘 8px 内启用拖拽，避免抢占表头其它交互
                if (event.clientX < rect.right - 8) return;
                startResize(event, col.propertyPath, width ?? rect.width);
              },
            }
          : {}),
      }),
    };
  });

  const actionsColumn = rowActionsColumn({ actions, table: tableApi });
  if (actionsColumn) antdColumns.push(actionsColumn);

  const rowSelection = currentShowCheckbox
    ? {
        selectedRowKeys: selectedRowKeys as Key[],
        preserveSelectedRowKeys: true,
        onChange: (_keys: Key[], selectedRowsOnPage: RowRecord[]) => onSelectionChange(selectedRowsOnPage),
      }
    : undefined;

  const selectionBarContext: YsSelectionBarContext = {
    selectedRows,
    total,
    clearSelection,
    selectAllOnPage,
    invertSelectionOnPage,
    pageSize: innerPageSize,
  };

  /** 分页交互：条数变化走切换每页条数路径，否则翻页 */
  function handlePaginationChange(page: number, size: number): void {
    if (size !== innerPageSize) {
      onSizeChange(size);
      return;
    }
    onPageChange(page);
  }

  return (
    <div className="yk-table">
      {props.selectionBar ? <div className="yk-table__selection-bar-slot">{props.selectionBar(selectionBarContext)}</div> : null}

      <div className="yk-table__view-area">
        {currentViewMode === "table" ? (
          <div
            className={`yk-table__table-wrap${currentStickyHeader ? " yk-table__table-wrap--sticky-header" : ""}`}
          >
            <Table<RowRecord>
              columns={antdColumns}
              dataSource={rows}
              rowKey={rowKey}
              bordered
              pagination={false}
              rowSelection={rowSelection}
              locale={{ emptyText: props.empty ?? <Empty description="暂无数据" /> }}
            />
          </div>
        ) : currentViewMode === "card" ? (
          <YsCardView
            rows={rows}
            rowKey={rowKey}
            showCheckbox={currentShowCheckbox}
            loading={viewLoading}
            hasActions={actions.length > 0}
            isSelected={isRowSelected}
            onCheck={onCardCheck}
            onContextMenu={onCardContextMenu}
            card={props.card}
            empty={props.empty}
          />
        ) : (
          <YsListView
            rows={rows}
            rowKey={rowKey}
            showCheckbox={currentShowCheckbox}
            loading={viewLoading}
            hasActions={actions.length > 0}
            isSelected={isRowSelected}
            onCheck={onCardCheck}
            onContextMenu={onCardContextMenu}
            list={props.list}
            empty={props.empty}
          />
        )}

        {viewLoading ? (
          <div className="yk-table__loading-mask">
            {props.loading ?? <span className="yk-table__loading-spinner" aria-label="加载中" />}
          </div>
        ) : null}
      </div>

      {showPagination || props.footer != null ? (
        <div className="yk-table__footer">
          <div className="yk-table__footer-extra">{props.footer}</div>
          {showPagination ? (
            <Pagination
              className="yk-table__pagination"
              current={currentPage}
              pageSize={innerPageSize}
              total={total}
              pageSizeOptions={pageSizes}
              showSizeChanger
              showTotal={totalKnown ? (value) => `共 ${value} 条` : undefined}
              onChange={handlePaginationChange}
            />
          ) : null}
        </div>
      ) : null}

      <YsContextMenu
        menu={cardMenu}
        actions={cardMenuActions}
        isEnabled={isEnabled}
        onClose={() => setCardMenu(null)}
        onSelect={onCardMenuAction}
      />

      <YsColumnConfigDialog
        open={configDialogVisible}
        drafts={draftColumns}
        onCancel={closeConfigDialog}
        onSave={saveConfigDialog}
        onReset={resetDraftColumns}
        onMove={moveDraftColumns}
        onDraftsChange={setDraftColumns}
      />

      <YsExportExcelDialog
        open={exportDialogVisible}
        options={exportOptions}
        exporting={exporting}
        fetched={exportFetched}
        total={exportTotal}
        totalKnown={exportTotalKnown}
        percent={exportPercent}
        etaSeconds={exportEtaSeconds}
        cancelledVisible={exportCancelledVisible}
        cancelledRows={exportCancelledRows}
        onExport={(scope) => void doExport(scope)}
        onCancelExport={cancelExport}
        onKeepPartial={() => void keepPartialExport()}
        onDiscardPartial={() => void discardPartialExport()}
        onClose={closeExportDialog}
      />
    </div>
  );
});
