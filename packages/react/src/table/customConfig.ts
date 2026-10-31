import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Column,
  CustomColumnConfig,
  CustomConfig,
  DraftColumn,
  Meta,
} from "@ys-knife-crud/core";

/**
 * 取「参与显示」的列并按 displayOrder 排序。
 * Column 多数字段可省略（见 core/meta.ts）：showForDisplay 缺省视为 true，
 * displayOrder 缺省按数组顺序回落，排序对同权重保持稳定。
 */
function displayableColumns(columns: Column[]): Column[] {
  return columns
    .map((col, idx) => ({ col, idx }))
    .filter(({ col }) => col.showForDisplay ?? true)
    .sort((a, b) => (a.col.displayOrder ?? a.idx) - (b.col.displayOrder ?? b.idx))
    .map(({ col }) => col);
}

export interface CustomConfigPropsLike {
  readonly loadCustomConfigFun?: (signal?: AbortSignal) => Promise<CustomConfig | null>;
  readonly saveCustomConfigFun?: (config: CustomConfig, signal?: AbortSignal) => Promise<void>;
}

export interface UseCustomConfigResult {
  customConfigs: CustomConfig;
  customConfigLoading: boolean;
  defaultPageSize: number | undefined;
  configDialogVisible: boolean;
  draftColumns: DraftColumn[];
  /** 最终显示的列（meta 过滤 + CustomConfig 合并） */
  columns: Column[];
  loadCustomConfigs: (signal?: AbortSignal) => Promise<void>;
  updateDefaultPageSize: (size: number) => void;
  updateColumnWidth: (propertyPath: string, width: number) => void;
  openConfigDialog: () => void;
  closeConfigDialog: () => void;
  moveDraft: (index: number, delta: number) => void;
  resetDraft: () => void;
  saveConfigDialog: () => Promise<void>;
}

/**
 * 列自定义配置逻辑：管理列的显隐、顺序、宽度以及用户默认分页大小，
 * 并提供列设置面板的状态与操作。
 */
export function useCustomConfig(
  props: CustomConfigPropsLike,
  meta: Meta | null,
): UseCustomConfigResult {
  const [customConfigs, setCustomConfigs] = useState<CustomConfig>({ columns: {} });
  const [customConfigLoading, setCustomConfigLoading] = useState(false);
  const [defaultPageSize, setDefaultPageSize] = useState<number | undefined>(undefined);
  const [configDialogVisible, setConfigDialogVisible] = useState(false);
  const [draftColumns, setDraftColumns] = useState<DraftColumn[]>([]);

  const propsRef = useRef(props);
  propsRef.current = props;

  /** 最终显示的列：meta 过滤后应用 CustomConfig 的 visible/order/width */
  const columns = useMemo(() => {
    const sorted = displayableColumns(meta?.columns ?? []);
    const cfg = customConfigs.columns;
    const merged = sorted.map((col, idx) => ({ col, cfg: cfg[col.propertyPath], idx }));
    const visibleCols = merged.filter((x) => x.cfg?.visible ?? true);
    visibleCols.sort((a, b) => (a.cfg?.order ?? a.idx) - (b.cfg?.order ?? b.idx));
    return visibleCols.map(({ col, cfg: c }) => ({
      ...col,
      displayName: col.displayName ?? col.propertyPath,
      width: c?.width || undefined,
    }));
  }, [meta, customConfigs]);

  const loadCustomConfigs = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setCustomConfigLoading(true);
    try {
      const loaded = (await propsRef.current.loadCustomConfigFun?.(signal)) ?? { columns: {} };
      setCustomConfigs(loaded);
      if (loaded.pageSize !== undefined) setDefaultPageSize(loaded.pageSize);
    } finally {
      setCustomConfigLoading(false);
    }
  }, []);

  /** 用户切换每页条数：更新内部状态并持久化为默认分页大小（保留已有列设置） */
  const updateDefaultPageSize = useCallback((size: number): void => {
    setDefaultPageSize(size);
    setCustomConfigs((prev) => {
      const configs: CustomConfig = { pageSize: size, columns: prev.columns };
      void propsRef.current.saveCustomConfigFun?.(configs);
      return configs;
    });
  }, []);

  /* ---------------- 列宽拖拽 ---------------- */

  const WIDTH_SAVE_DEBOUNCE_MS = 500;
  const widthSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const configsRef = useRef(customConfigs);
  configsRef.current = customConfigs;

  useEffect(() => {
    return () => {
      if (widthSaveTimer.current !== undefined) clearTimeout(widthSaveTimer.current);
    };
  }, []);

  const scheduleWidthSave = useCallback((): void => {
    if (widthSaveTimer.current !== undefined) clearTimeout(widthSaveTimer.current);
    widthSaveTimer.current = setTimeout(() => {
      widthSaveTimer.current = undefined;
      void propsRef.current.saveCustomConfigFun?.(configsRef.current);
    }, WIDTH_SAVE_DEBOUNCE_MS);
  }, []);

  /** 拖动列宽结束：立即写回 customConfigs，再防抖持久化 */
  const updateColumnWidth = useCallback(
    (propertyPath: string, width: number): void => {
      setCustomConfigs((prev) => {
        const item: CustomColumnConfig = {
          ...prev.columns[propertyPath],
          propertyPath,
          width: String(Math.round(width)),
        };
        return { ...prev, columns: { ...prev.columns, [propertyPath]: item } };
      });
      scheduleWidthSave();
    },
    [scheduleWidthSave],
  );

  /* ---------------- 列设置面板操作 ---------------- */

  function generateDraftColumns(): DraftColumn[] {
    const sorted = displayableColumns(meta?.columns ?? []);
    const cfg = customConfigs.columns;
    const merged = sorted.map((col, idx) => ({ col, cfg: cfg[col.propertyPath], idx }));
    merged.sort((a, b) => (a.cfg?.order ?? a.idx) - (b.cfg?.order ?? b.idx));
    return merged.map(({ col, cfg: c }) => ({
      propertyPath: col.propertyPath,
      displayName: col.displayName ?? col.propertyPath,
      visible: c?.visible ?? true,
      width: c?.width ?? "",
    }));
  }

  const openConfigDialog = useCallback((): void => {
    setDraftColumns(generateDraftColumns());
    setConfigDialogVisible(true);
    // generateDraftColumns 依赖当前 meta/customConfigs，按需重建闭包
  }, [meta, customConfigs]);

  const closeConfigDialog = useCallback((): void => {
    setConfigDialogVisible(false);
  }, []);

  /** 重置草稿：全部可见、按 displayOrder 排序、清空宽度 */
  const resetDraft = useCallback((): void => {
    const sorted = displayableColumns(meta?.columns ?? []);
    setDraftColumns(
      sorted.map((col) => ({
        propertyPath: col.propertyPath,
        displayName: col.displayName ?? col.propertyPath,
        visible: true,
        width: "",
      })),
    );
  }, [meta]);

  const moveDraft = useCallback((index: number, delta: number): void => {
    setDraftColumns((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const arr = [...prev];
      const [item] = arr.splice(index, 1);
      arr.splice(target, 0, item!);
      return arr;
    });
  }, []);

  const saveConfigDialog = useCallback(async (): Promise<void> => {
    const columns: Record<string, CustomColumnConfig> = {};
    draftColumns.forEach((d, i) => {
      columns[d.propertyPath] = {
        propertyPath: d.propertyPath,
        visible: d.visible,
        order: i,
        width: d.width,
      };
    });
    const configs: CustomConfig = { pageSize: defaultPageSize, columns };
    await propsRef.current.saveCustomConfigFun?.(configs);
    setCustomConfigs(configs);
    setConfigDialogVisible(false);
  }, [draftColumns, defaultPageSize]);

  useEffect(() => {
    void loadCustomConfigs();
  }, [props.loadCustomConfigFun, loadCustomConfigs]);

  return {
    customConfigs,
    customConfigLoading,
    defaultPageSize,
    configDialogVisible,
    draftColumns,
    columns,
    loadCustomConfigs,
    updateDefaultPageSize,
    updateColumnWidth,
    openConfigDialog,
    closeConfigDialog,
    moveDraft,
    resetDraft,
    saveConfigDialog,
  };
}
