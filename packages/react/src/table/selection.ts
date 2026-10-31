import { useCallback, useMemo, useState } from "react";

/**
 * 行选择（checkbox）逻辑：UI 库无关的跨页选中集合。
 *
 * 选中状态以 rowKey 为键保存在内部 Map 中（不依赖任何具体 UI 组件），
 * 同一套状态可同时驱动 antd 表格勾选列与卡片视图里的 checkbox。
 * 翻页、切换每页条数、切换视图都不丢失累计选中。
 */
export type RowRecord = Record<string, unknown>;

export interface UseSelectionOptions {
  /** 当前页行数据 */
  rows: RowRecord[];
  /** 行 key 字段名（与 antd Table 的 rowKey 一致） */
  rowKey: string;
}

export interface UseSelectionResult {
  /** 跨页累计选中的行（插入顺序即选中顺序） */
  selectedRows: RowRecord[];
  /** 跨页累计选中的 rowKey 值列表 */
  selectedRowKeys: unknown[];
  /** 当前页勾选变更（antd Table rowSelection.onChange 的回传行） */
  onSelectionChange: (selection: RowRecord[]) => void;
  isRowSelected: (row: RowRecord) => boolean;
  toggleRowSelection: (row: RowRecord, selected?: boolean) => void;
  clearSelection: () => void;
  selectAllOnPage: () => void;
  invertSelectionOnPage: () => void;
}

export function useSelection({ rows, rowKey }: UseSelectionOptions): UseSelectionResult {
  const [selectedMap, setSelectedMap] = useState<Map<unknown, RowRecord>>(new Map());

  const selectedRows = useMemo(() => [...selectedMap.values()], [selectedMap]);
  const selectedRowKeys = useMemo(() => [...selectedMap.keys()], [selectedMap]);

  const keyOf = useCallback(
    (row: RowRecord): unknown => row[rowKey],
    [rowKey],
  );

  /**
   * 当前页勾选结果对账：先从累计集合移除当前页全部 key，
   * 再把回传的勾选行写回——其他页的选中不受影响。
   */
  const onSelectionChange = useCallback(
    (selection: RowRecord[]): void => {
      setSelectedMap((prev) => {
        const next = new Map(prev);
        for (const row of rows) next.delete(keyOf(row));
        for (const row of selection) next.set(keyOf(row), row);
        return next;
      });
    },
    [rows, keyOf],
  );

  const isRowSelected = useCallback(
    (row: RowRecord): boolean => selectedMap.has(keyOf(row)),
    [selectedMap, keyOf],
  );

  const toggleRowSelection = useCallback(
    (row: RowRecord, selected?: boolean): void => {
      setSelectedMap((prev) => {
        const next = new Map(prev);
        const shouldSelect = selected ?? !next.has(keyOf(row));
        if (shouldSelect) next.set(keyOf(row), row);
        else next.delete(keyOf(row));
        return next;
      });
    },
    [keyOf],
  );

  const clearSelection = useCallback((): void => {
    setSelectedMap(new Map());
  }, []);

  const selectAllOnPage = useCallback((): void => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      for (const row of rows) next.set(keyOf(row), row);
      return next;
    });
  }, [rows, keyOf]);

  const invertSelectionOnPage = useCallback((): void => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      for (const row of rows) {
        const key = keyOf(row);
        if (next.has(key)) next.delete(key);
        else next.set(key, row);
      }
      return next;
    });
  }, [rows, keyOf]);

  return {
    selectedRows,
    selectedRowKeys,
    onSelectionChange,
    isRowSelected,
    toggleRowSelection,
    clearSelection,
    selectAllOnPage,
    invertSelectionOnPage,
  };
}
