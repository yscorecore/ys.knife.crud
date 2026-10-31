import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DefaultProps, Meta, PagedList } from "@ys-knife-crud/core";

/**
 * 表格的默认状态与数据加载逻辑：列元数据、分页数据、当前页行数据、
 * 两类加载态、当前页码，以及由 paged 派生的总条数、加载列元数据的动作。
 *
 * 与 Vue 版 useDefault 对应：仅注册一个副作用——metaFun 变化 → 重新加载 meta。
 * 数据加载（dataFun / 分页大小解析）由调用方组件负责。
 */
export interface UseDefaultResult {
  /** 列元数据（metaFun 返回值；挂载前为 null） */
  meta: Meta | null;
  /** 当前页数据（dataFun 返回值；挂载前为 null） */
  paged: PagedList<unknown> | null;
  /** 当前页行数据 */
  rows: Record<string, unknown>[];
  metaLoading: boolean;
  dataLoading: boolean;
  /** 当前页码（1 基） */
  currentPage: number;
  /** 总条数（未知时按当前页估算） */
  total: number;
  /** 总条数是否已知（dataFun 返回的 totalCount 有值） */
  totalKnown: boolean;
  loadMeta: (signal?: AbortSignal) => Promise<void>;
  setMeta: (meta: Meta | null) => void;
  setPaged: (paged: PagedList<unknown> | null) => void;
  setMetaLoading: (loading: boolean) => void;
  setDataLoading: (loading: boolean) => void;
  setCurrentPage: (page: number) => void;
}

export function useDefault(props: DefaultProps): UseDefaultResult {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [paged, setPaged] = useState<PagedList<unknown> | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const metaFunRef = useRef(props.metaFun);
  metaFunRef.current = props.metaFun;

  const rows = useMemo(
    () => ((paged?.items ?? []) as Record<string, unknown>[]),
    [paged],
  );

  const totalKnown = paged?.totalCount != null;

  /**
   * 总条数：已知时取 totalCount；未知时按当前页估算——
   * hasNext 时在「已加载数」外多给一页 ghost 页，使分页「下一页」按钮可点。
   */
  const total = useMemo(() => {
    if (!paged) return 0;
    if (paged.totalCount != null) return paged.totalCount;
    return paged.offset + paged.items.length + (paged.hasNext ? 1 : 0);
  }, [paged]);

  const loadMeta = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setMetaLoading(true);
    try {
      setMeta(await metaFunRef.current(signal));
    } finally {
      setMetaLoading(false);
    }
  }, []);

  // metaFun 变化 → 重新加载列元数据
  useEffect(() => {
    void loadMeta();
  }, [props.metaFun, loadMeta]);

  return {
    meta,
    paged,
    rows,
    metaLoading,
    dataLoading,
    currentPage,
    total,
    totalKnown,
    loadMeta,
    setMeta,
    setPaged,
    setMetaLoading,
    setDataLoading,
    setCurrentPage,
  };
}
