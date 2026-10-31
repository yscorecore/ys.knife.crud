import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button, Checkbox, Empty } from "antd";
import type {
  Column,
  ExportApiFunc,
  Meta,
  MetaFunc,
  PageFunc,
} from "@ys-knife-crud/core";
import { useExportExcel, useSelection } from "@ys-knife-crud/react";
import { YsExportExcelDialog } from "./exportExcelDialog";
import "./infiniteList.css";

/** 单次分页加载结果（PagedList）；对外事件基于此类型 */
type PagedResult = Awaited<ReturnType<PageFunc<unknown>>>;

/** 行内容插槽：渲染函数，或直接给一段静态内容（每行重复渲染） */
export type InfiniteListRowSlot =
  | ReactNode
  | ((row: Record<string, unknown>, index: number) => ReactNode);

/** error 插槽：ReactNode 或带 error 的渲染函数 */
export type InfiniteListErrorSlot =
  | ReactNode
  | ((scope: { error: unknown }) => ReactNode);

/** YsInfiniteList 的 props：与 Vue 版 infiniteList.vue 一致，事件改为回调 props */
export interface YsInfiniteListProps {
  /**
   * 数据获取函数，分页契约与 YsTable 完全一致：
   * ({ limit, offset }, signal?) => Promise<PagedList<T>>
   */
  dataFun: PageFunc<unknown>;
  /** 每页条数（作为 dataFun 的 limit），默认 20 */
  pageSize?: number;
  /** 距底部多少像素时提前加载下一页，默认 100 */
  threshold?: number;
  /** 行 key（列表项 key 取值字段），默认 "id" */
  rowKey?: string;
  /** 滚动容器高度，默认 "100%"；任意 CSS 长度字符串 */
  height?: string;
  /** 挂载后是否立即加载第一页，默认 true */
  immediate?: boolean;
  /** 是否显示行首 checkbox（行选中），默认 false */
  showCheckbox?: boolean;
  /** 元数据加载函数（与 YsTable 的 metaFun 同契约），可选；影响导出列与表名 */
  metaFun?: MetaFunc;
  /** 导出实现工厂；缺省使用 core 的控制台假实现 */
  exportorFunc?: ExportApiFunc;
  /** 导出所有时分页拉取的步长（独立于界面 pageSize），默认 1000 */
  exportPageSize?: number;

  /** 每次 dataFun 成功返回后触发（替代 data-loaded 事件） */
  onDataLoaded?: (paged: PagedResult, isAppend: boolean) => void;
  /** 加载失败时触发（替代 error 事件） */
  onError?: (error: unknown) => void;
  /** 选中行集合变化时触发（替代 selection-change 事件） */
  onSelectionChange?: (rows: unknown[]) => void;

  /** 行内容插槽（对应 Vue 默认插槽，scope { row, index }） */
  children?: InfiniteListRowSlot;
  /** 空状态插槽（对应 #empty） */
  empty?: ReactNode;
  /** 错误状态插槽（对应 #error，scope { error }） */
  error?: InfiniteListErrorSlot;
  /** 追加加载指示插槽（对应 #loading） */
  loading?: ReactNode;
  /** 没有更多提示插槽（对应 #no-more） */
  noMore?: ReactNode;
}

/** 对外暴露的 API（与 Vue 版 defineExpose 一致，状态成员为当前值） */
export interface YsInfiniteListApi {
  readonly items: Record<string, unknown>[];
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly hasMore: boolean;
  readonly meta: Meta | null;
  readonly selectedRows: unknown[];
  reload(): void;
  refresh(): void;
  loadNextPage(): void;
  readonly rows: Record<string, unknown>[];
  isRowSelected(row: Record<string, unknown>): boolean;
  toggleRowSelection(row: Record<string, unknown>, selected?: boolean): void;
  clearSelection(): void;
  selectAllOnPage(): void;
  invertSelectionOnPage(): void;
  openExportDialog(): void;
}

/**
 * YsInfiniteList（React + antd）：无限滚动列表。
 *
 * 与 YsTable 共用同一套数据契约（dataFun: PageFunc<T>），但不渲染表格，
 * 而是追加式渲染列表：滚动容器底部哨兵进入可视区时自动加载下一页并拼接，
 * 直到返回的 hasNext 为 false。行内容由 children 渲染函数决定，缺省 JSON 兜底。
 *
 * 导出 Excel 复用 useExportExcel：page 范围在本组件语义为「当前已加载」，
 * 文案固定为「导出当前已加载」；始终挂载对话框，外部经 ref 的
 * openExportDialog() 打开。
 */
export const YsInfiniteList = forwardRef<YsInfiniteListApi, YsInfiniteListProps>(
  function YsInfiniteList(props, ref) {
    const {
      dataFun,
      pageSize = 20,
      threshold = 100,
      rowKey = "id",
      height = "100%",
      immediate = true,
      showCheckbox = false,
      metaFun,
      exportorFunc,
      exportPageSize = 1000,
    } = props;

    /* ---------------- 状态 ---------------- */

    const [items, setItems] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<unknown>(null);
    /** 最近一次响应携带的总条数（驱动导出进度条初始分母） */
    const [totalCount, setTotalCount] = useState(0);
    /** 元数据（metaFun 可选；加载失败视为无 meta） */
    const [meta, setMeta] = useState<Meta | null>(null);

    /* ---------------- 最新值 refs（供稳定回调读取） ---------------- */

    const itemsRef = useRef<Record<string, unknown>[]>([]);
    const loadingRef = useRef(false);
    const loadingMoreRef = useRef(false);
    const hasMoreRef = useRef(true);
    const metaRef = useRef<Meta | null>(null);
    const dataFunRef = useRef(props.dataFun);
    const metaFunRef = useRef(props.metaFun);
    const pageSizeRef = useRef(pageSize);
    const callbacksRef = useRef({
      onDataLoaded: props.onDataLoaded,
      onError: props.onError,
      onSelectionChange: props.onSelectionChange,
    });

    dataFunRef.current = props.dataFun;
    metaFunRef.current = props.metaFun;
    pageSizeRef.current = pageSize;
    metaRef.current = meta;
    callbacksRef.current = {
      onDataLoaded: props.onDataLoaded,
      onError: props.onError,
      onSelectionChange: props.onSelectionChange,
    };

    /* ---------------- 行选中（与 YsTable 共用 useSelection） ---------------- */

    const selection = useSelection({ rows: items, rowKey });
    const selectionRef = useRef(selection);
    selectionRef.current = selection;

    // 选中集合变化时对外派发（跳过挂载时的初始空集合）
    const selectionMounted = useRef(false);
    useEffect(() => {
      if (!selectionMounted.current) {
        selectionMounted.current = true;
        return;
      }
      callbacksRef.current.onSelectionChange?.([...selection.selectedRows]);
    }, [selection.selectedRows]);

    /* ---------------- 加载逻辑 ---------------- */

    /**
     * 加载一页数据。
     * @param isAppend true = 加载下一页并追加；false = 重置为第一页
     */
    const loadPage = useCallback(async (isAppend: boolean): Promise<void> => {
      if (isAppend) {
        if (loadingMoreRef.current || loadingRef.current || !hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        setError(null);
      }
      try {
        const offset = isAppend ? itemsRef.current.length : 0;
        const result = await dataFunRef.current({
          limit: pageSizeRef.current,
          offset,
        });
        const rows = result.items as Record<string, unknown>[];
        const next = isAppend ? [...itemsRef.current, ...rows] : rows;
        itemsRef.current = next;
        setItems(next);

        const more = result.hasNext ?? false;
        hasMoreRef.current = more;
        setHasMore(more);

        // 响应带回总条数时更新（驱动导出进度条初始分母）
        if (result.totalCount != null) setTotalCount(result.totalCount);
        callbacksRef.current.onDataLoaded?.(result, isAppend);
      } catch (e) {
        setError(e);
        callbacksRef.current.onError?.(e);
      } finally {
        if (isAppend) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        } else {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    }, []);

    /** 触发加载下一页（由 IntersectionObserver 调用，也可经 ref 手动触发） */
    const loadNextPage = useCallback((): void => {
      void loadPage(true);
    }, [loadPage]);

    /** 重置并从第一页重新加载（清空已加载数据） */
    const reload = useCallback((): void => {
      hasMoreRef.current = true;
      setHasMore(true);
      void loadPage(false);
    }, [loadPage]);

    /** 加载元数据（metaFun 可选；加载失败视为无 meta，导出退化到行字段并集） */
    const loadMeta = useCallback(async (): Promise<void> => {
      const fun = metaFunRef.current;
      if (!fun) {
        setMeta(null);
        return;
      }
      try {
        setMeta(await fun());
      } catch {
        setMeta(null);
      }
    }, []);

    /* ---------------- IntersectionObserver 触底检测 ---------------- */

    const scrollElRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const root = scrollElRef.current;
      const sentinel = sentinelRef.current;
      if (!root || !sentinel || typeof IntersectionObserver === "undefined") return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (
            entries.some((entry) => entry.isIntersecting) &&
            hasMoreRef.current &&
            !loadingRef.current &&
            !loadingMoreRef.current
          ) {
            loadNextPage();
          }
        },
        {
          root,
          rootMargin: `0px 0px ${threshold}px 0px`,
          threshold: 0,
        },
      );
      observer.observe(sentinel);
      return () => observer.disconnect();
    }, [threshold, loadNextPage]);

    /* ---------------- 生命周期 ---------------- */

    useEffect(() => {
      void loadMeta();
      if (immediate) void loadPage(false);
      // 仅挂载时首载；immediate 只取初始值（与 Vue 版一致）
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 数据源变化视为全新查询：重置为第一页重新加载
    const prevDataFun = useRef(props.dataFun);
    useEffect(() => {
      if (prevDataFun.current !== props.dataFun) {
        prevDataFun.current = props.dataFun;
        reload();
      }
    }, [props.dataFun, reload]);

    // 元数据源变化时重新加载 meta（影响导出列与表名）
    const prevMetaFun = useRef(props.metaFun);
    useEffect(() => {
      if (prevMetaFun.current !== props.metaFun) {
        prevMetaFun.current = props.metaFun;
        void loadMeta();
      }
    }, [props.metaFun, loadMeta]);

    /* ---------------- 导出 Excel（复用 useExportExcel） ---------------- */

    /**
     * 导出列：与 YsTable 一致取 meta 的 showForDisplay 列（displayOrder 升序，
     * 缺省保持声明序）；无 meta 时退化为已加载行字段并集（首见顺序）。
     */
    const exportColumns = useMemo<Column[]>(() => {
      if (meta) {
        return meta.columns
          .map((column, index) => ({ column, index }))
          .filter(({ column }) => column.showForDisplay !== false)
          .sort(
            (a, b) =>
              (a.column.displayOrder ?? a.index) -
              (b.column.displayOrder ?? b.index),
          )
          .map(({ column }) => column);
      }
      const seen = new Set<string>();
      const columns: Column[] = [];
      for (const row of items) {
        for (const key of Object.keys(row)) {
          if (!seen.has(key)) {
            seen.add(key);
            columns.push({ propertyPath: key });
          }
        }
      }
      return columns;
    }, [meta, items]);

    /** 表名：meta.displayName 优先，缺省「数据」（与 YsTable 回退一致） */
    const tableName = meta?.displayName ?? "数据";

    const exportExcel = useExportExcel({
      props: { dataFun, exportSelected: showCheckbox, exportorFunc },
      tableName,
      columns: exportColumns,
      currentRows: items,
      selectedRows: selection.selectedRows,
      total: totalCount,
      exportPageSize,
      hasMorePage: hasMore,
      pageScopeLabel: "导出当前已加载",
    });
    const exportExcelRef = useRef(exportExcel);
    exportExcelRef.current = exportExcel;

    /** 打开导出对话框入口（只剩一个可用选项时 useExportExcel 内部直接导出） */
    const openExportDialog = useCallback((): void => {
      exportExcelRef.current.onExportClick();
    }, []);

    /* ---------------- 暴露 API（供父组件经 ref 调用） ---------------- */

    useImperativeHandle(
      ref,
      () => ({
        get items() {
          return itemsRef.current;
        },
        get loading() {
          return loadingRef.current;
        },
        get loadingMore() {
          return loadingMoreRef.current;
        },
        get hasMore() {
          return hasMoreRef.current;
        },
        get meta() {
          return metaRef.current;
        },
        get selectedRows() {
          return selectionRef.current.selectedRows;
        },
        get rows() {
          return itemsRef.current;
        },
        reload,
        refresh: reload,
        loadNextPage,
        isRowSelected: (row: Record<string, unknown>): boolean =>
          selectionRef.current.isRowSelected(row),
        toggleRowSelection: (row: Record<string, unknown>, selected?: boolean): void =>
          selectionRef.current.toggleRowSelection(row, selected),
        clearSelection: (): void => selectionRef.current.clearSelection(),
        selectAllOnPage: (): void => selectionRef.current.selectAllOnPage(),
        invertSelectionOnPage: (): void =>
          selectionRef.current.invertSelectionOnPage(),
        openExportDialog,
      }),
      [loadNextPage, openExportDialog, reload],
    );

    /* ---------------- 渲染 ---------------- */

    function renderRow(row: Record<string, unknown>, index: number): ReactNode {
      const slot = props.children;
      if (typeof slot === "function") {
        return (slot as (row: Record<string, unknown>, index: number) => ReactNode)(
          row,
          index,
        );
      }
      if (slot != null) return slot;
      return (
        <pre className="yk-infinite-list__item-json">
          {JSON.stringify(row, null, 2)}
        </pre>
      );
    }

    const errorSlot = props.error;
    const errorNode =
      typeof errorSlot === "function"
        ? (errorSlot as (scope: { error: unknown }) => ReactNode)({ error })
        : errorSlot;

    return (
      <div ref={scrollElRef} className="yk-infinite-list" style={{ height }}>
        {items.map((row, index) => (
          <div
            key={String(row[rowKey])}
            className={`yk-infinite-list__item${
              showCheckbox && selection.isRowSelected(row) ? " is-selected" : ""
            }`}
          >
            {showCheckbox ? (
              <Checkbox
                className="yk-infinite-list__item-checkbox"
                checked={selection.isRowSelected(row)}
                onChange={(event) =>
                  selection.toggleRowSelection(row, event.target.checked)
                }
              />
            ) : null}
            <div className="yk-infinite-list__item-body">{renderRow(row, index)}</div>
          </div>
        ))}

        {/* 错误状态：加载失败时显示，提供重试入口 */}
        {error ? (
          <div className="yk-infinite-list__status">
            {errorNode ?? (
              <Empty description={`加载失败：${String(error)}`}>
                <Button type="primary" onClick={reload}>
                  重试
                </Button>
              </Empty>
            )}
          </div>
        ) : !loading && items.length === 0 ? (
          /* 空状态：非加载中、无数据、无错误时显示 */
          <div className="yk-infinite-list__status">
            {props.empty ?? <Empty description="暂无数据" />}
          </div>
        ) : null}

        {/* 触底哨兵：1px 占位元素，进入可视区（含 threshold 提前量）触发加载下一页 */}
        <div ref={sentinelRef} className="yk-infinite-list__sentinel" />

        {/* 追加加载指示 */}
        {loadingMore ? (
          <div className="yk-infinite-list__loading-more">
            {props.loading ?? (
              <>
                <span className="yk-infinite-list__spinner" />
                <span>加载中...</span>
              </>
            )}
          </div>
        ) : null}

        {/* 没有更多：已有数据且无下一页时显示 */}
        {!hasMore && items.length > 0 && !loading ? (
          <div className="yk-infinite-list__no-more">
            {props.noMore ?? <span>— 没有更多了 —</span>}
          </div>
        ) : null}

        {/* 导出 Excel 对话框组（范围选择 / 进度 / 取消询问） */}
        <YsExportExcelDialog
          open={exportExcel.exportDialogVisible}
          options={exportExcel.exportOptions}
          exporting={exportExcel.exporting}
          fetched={exportExcel.exportFetched}
          total={exportExcel.exportTotal}
          totalKnown={exportExcel.exportTotalKnown}
          percent={exportExcel.exportPercent}
          etaSeconds={exportExcel.exportEtaSeconds}
          cancelledVisible={exportExcel.exportCancelledVisible}
          cancelledRows={exportExcel.exportCancelledRows}
          onExport={(scope) => void exportExcel.doExport(scope)}
          onCancelExport={exportExcel.cancelExport}
          onKeepPartial={() => void exportExcel.keepPartialExport()}
          onDiscardPartial={() => void exportExcel.discardPartialExport()}
          onClose={exportExcel.closeExportDialog}
        />
      </div>
    );
  },
);

YsInfiniteList.displayName = "YsInfiniteList";

export default YsInfiniteList;
