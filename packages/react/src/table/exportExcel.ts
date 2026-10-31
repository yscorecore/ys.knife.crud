import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createConsoleExportApiFunc,
  type Column,
  type ExportApi,
  type ExportApiFunc,
  type ExportOption,
  type ExportScope,
  type PageFunc,
} from "@ys-knife-crud/core";

/** useExportExcel 需要从组件 props 中访问的成员 */
interface ExportProps {
  readonly dataFun: PageFunc<unknown>;
  readonly exportSelected: boolean;
  readonly exportorFunc?: ExportApiFunc;
}

/** useExportExcel 的入参：组件内已有的状态与工具函数 */
export interface UseExportExcelOptions {
  props: ExportProps;
  /** 表名（用于 sheet 标识与导出文件名） */
  tableName?: string;
  /** 当前界面显示的列（导出与其所见即所得） */
  columns: Column[];
  /** 当前页行数据 */
  currentRows: Record<string, unknown>[];
  /** checkbox 列当前选中的行（跨页累计） */
  selectedRows: unknown[];
  /** 数据总条数 */
  total: number;
  /** 导出所有时分页拉取的步长 */
  exportPageSize: number;
  /** 是否还有下一页（决定「导出所有」选项是否出现） */
  hasMorePage: boolean;
  /** 「page」范围的文案前缀；缺省「导出当前页数据」 */
  pageScopeLabel?: string;
}

export interface UseExportExcelResult {
  exportOptions: ExportOption[];
  exportDialogVisible: boolean;
  exporting: boolean;
  exportFetched: number;
  exportTotal: number;
  exportTotalKnown: boolean;
  exportEtaSeconds: number | null;
  exportPercent: number;
  exportCancelledVisible: boolean;
  exportCancelledRows: number;
  onExportClick: () => void;
  openExportDialog: () => void;
  closeExportDialog: () => void;
  doExport: (scope: ExportScope) => Promise<void>;
  cancelExport: () => void;
  keepPartialExport: () => Promise<void>;
  discardPartialExport: () => Promise<void>;
}

/**
 * 导出 Excel 逻辑：范围选择对话框、逐页拉取边拉边写、进度与取消、
 * 取消后的「保留部分文件 / 丢弃」流程。
 */
export function useExportExcel(options: UseExportExcelOptions): UseExportExcelResult {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const exportOptions = useMemo<ExportOption[]>(() => {
    const opts: ExportOption[] = [];
    if (options.props.exportSelected) {
      opts.push({
        value: "selected",
        label: `导出选中的数据（已选 ${options.selectedRows.length} 项）`,
        disabled: options.selectedRows.length === 0,
      });
    }
    opts.push({
      value: "page",
      label: `${options.pageScopeLabel ?? "导出当前页数据"}（${options.currentRows.length} 条）`,
      disabled: false,
    });
    if (options.hasMorePage) {
      opts.push({ value: "all", label: "导出所有数据", disabled: false });
    }
    return opts;
  }, [options.props.exportSelected, options.selectedRows.length, options.currentRows.length, options.hasMorePage, options.pageScopeLabel]);

  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFetched, setExportFetched] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportTotalKnown, setExportTotalKnown] = useState(false);
  const [exportCancelledVisible, setExportCancelledVisible] = useState(false);
  const [exportCancelledRows, setExportCancelledRows] = useState(0);
  const [etaNow, setEtaNow] = useState(0);

  const exportCancelled = useRef(false);
  const exportAbort = useRef<AbortController | null>(null);
  const pendingExportApi = useRef<ExportApi | null>(null);
  const exportStartedAt = useRef(0);
  const etaTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopEtaTimer = useCallback((): void => {
    if (etaTimer.current != null) {
      clearInterval(etaTimer.current);
      etaTimer.current = null;
    }
  }, []);

  useEffect(() => () => stopEtaTimer(), [stopEtaTimer]);

  /** 预计剩余秒数：总数已知且已加载至少一页后按已耗时速率外推 */
  const exportEtaSeconds = useMemo<number | null>(() => {
    if (!exportTotalKnown || exportFetched === 0) return null;
    const elapsed = (etaNow - exportStartedAt.current) / 1000;
    if (elapsed < 0.5) return null;
    const remaining = exportTotal - exportFetched;
    if (remaining <= 0) return null;
    return Math.max(1, Math.ceil(remaining / (exportFetched / elapsed)));
  }, [exportTotalKnown, exportFetched, exportTotal, etaNow]);

  /** 导出进度百分比：totalCount 未知时按已加载条数滚动到 99% 封顶 */
  const exportPercent = useMemo(() => {
    if (exportTotalKnown && exportTotal > 0) {
      return Math.min(100, Math.round((exportFetched / exportTotal) * 100));
    }
    return exportFetched > 0 ? 99 : 0;
  }, [exportTotalKnown, exportTotal, exportFetched]);

  const exportSheetName = useCallback(
    (): string => optionsRef.current.tableName ?? "数据",
    [],
  );

  const newExportApi = useCallback((): ExportApi => {
    if (optionsRef.current.props.exportorFunc) return optionsRef.current.props.exportorFunc();
    return createConsoleExportApiFunc()();
  }, []);

  const exportRowValues = useCallback(
    (row: Record<string, unknown>): unknown[] =>
      optionsRef.current.columns.map((c) => row[c.propertyPath] ?? null),
    [],
  );

  /** 导出文件名：表名_时间戳.xlsx；部分文件加「部分」后缀 */
  const exportFileName = useCallback((partial = false): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `${optionsRef.current.tableName ?? "导出数据"}_${stamp}${partial ? "_部分" : ""}.xlsx`;
  }, []);

  /** 导出所有：循环调 dataFun，每页回来立即 renderRows 写入，带进度与取消 */
  const exportAllStreaming = useCallback(async (): Promise<void> => {
    setExporting(true);
    exportCancelled.current = false;
    setExportFetched(0);
    setExportTotal(optionsRef.current.total);
    setExportTotalKnown(false);
    exportStartedAt.current = Date.now();
    setEtaNow(Date.now());
    stopEtaTimer();
    etaTimer.current = setInterval(() => setEtaNow(Date.now()), 500);
    exportAbort.current = new AbortController();
    const api = newExportApi();
    const sheet = exportSheetName();
    await api.renderHeader({ [sheet]: optionsRef.current.columns });
    let fetched = 0;
    try {
      const limit = optionsRef.current.exportPageSize;
      let offset = 0;
      for (;;) {
        const res = await optionsRef.current.props.dataFun(
          { limit, offset },
          exportAbort.current.signal,
        );
        await api.renderRows(
          sheet,
          (res.items as Record<string, unknown>[]).map(exportRowValues),
        );
        fetched += res.items.length;
        setExportFetched(fetched);
        if (res.totalCount != null) {
          setExportTotal(res.totalCount);
          setExportTotalKnown(true);
        }
        if (exportCancelled.current || !res.hasNext || res.items.length === 0) break;
        offset += limit;
      }
    } catch (e) {
      if (!exportCancelled.current) throw e;
    } finally {
      setExporting(false);
      stopEtaTimer();
      exportAbort.current = null;
    }
    if (!exportCancelled.current) {
      await api.download(exportFileName());
      return;
    }
    setExportCancelledRows(fetched);
    pendingExportApi.current = api;
    setExportCancelledVisible(true);
  }, [exportFileName, exportRowValues, exportSheetName, newExportApi, stopEtaTimer]);

  /** 按范围导出：选中/当前页直接写；所有数据走逐页拉取边拉边写 */
  const doExport = useCallback(
    async (scope: ExportScope): Promise<void> => {
      setExportDialogVisible(false);
      if (scope === "all") {
        await exportAllStreaming();
        return;
      }
      const data = (scope === "selected"
        ? optionsRef.current.selectedRows
        : optionsRef.current.currentRows) as Record<string, unknown>[];
      const api = newExportApi();
      const sheet = exportSheetName();
      await api.renderHeader({ [sheet]: optionsRef.current.columns });
      await api.renderRows(sheet, data.map(exportRowValues));
      await api.download(exportFileName());
    },
    [exportAllStreaming, exportFileName, exportRowValues, exportSheetName, newExportApi],
  );

  /** 点击导出入口：只剩一个可用选项时跳过对话框直接导出 */
  const onExportClick = useCallback((): void => {
    const enabled = exportOptions.filter((o) => !o.disabled);
    if (enabled.length === 1) {
      void doExport(enabled[0]!.value);
      return;
    }
    setExportDialogVisible(true);
  }, [exportOptions, doExport]);

  const openExportDialog = useCallback((): void => setExportDialogVisible(true), []);
  const closeExportDialog = useCallback((): void => setExportDialogVisible(false), []);

  const cancelExport = useCallback((): void => {
    exportCancelled.current = true;
    exportAbort.current?.abort();
  }, []);

  const keepPartialExport = useCallback(async (): Promise<void> => {
    setExportCancelledVisible(false);
    const api = pendingExportApi.current;
    pendingExportApi.current = null;
    if (api) await api.download(exportFileName(true));
  }, [exportFileName]);

  const discardPartialExport = useCallback(async (): Promise<void> => {
    setExportCancelledVisible(false);
    const api = pendingExportApi.current;
    pendingExportApi.current = null;
    if (api) await api.cancel();
  }, []);

  return {
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
    onExportClick,
    openExportDialog,
    closeExportDialog,
    doExport,
    cancelExport,
    keepPartialExport,
    discardPartialExport,
  };
}
