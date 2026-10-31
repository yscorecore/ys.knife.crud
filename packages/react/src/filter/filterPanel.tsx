import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FilterInfo, emptyFilter } from "ys.knife.query.js";
import type { FilterItemApi } from "@ys-knife-crud/core";

/**
 * 搜索面板（FilterPanel）聚合子 FilterItem 的 FilterInfo 的逻辑：UI 库无关。
 *
 * React 版用 Context 替代 Vue 的 provide/inject：
 * - 面板 useFilterPanel() 创建 register(api) 与 notify()，经 FilterPanelContext 下发
 * - 子 FilterItem 挂载时把自己的 FilterItemApi 注册进来，卸载时反注册
 * - 子项值变化后调用 notify()，面板重算 filter（AND 聚合）
 *
 * 与 Vue 版保持相同的契约：FilterItemApi 只有 `filter` 与 `reset()`。
 */

/** 已注册项的最小契约（同 core 的 FilterItemApi） */
export type { FilterItemApi };

/** 面板对子项暴露的内部接口 */
export interface FilterPanelApi {
  /** 聚合所有已注册 FilterItem 的 FilterInfo；全部为空时返回 emptyFilter() */
  readonly filter: FilterInfo;
  /** 重置所有已注册子项 */
  reset(): void;
  /** 子项注册（返回反注册函数） */
  register(api: FilterItemApi): () => void;
  /** 子项值变化后通知面板重算 */
  notify(): void;
}

export const FilterPanelContext = createContext<FilterPanelApi | null>(null);

/** 聚合多个 FilterInfo：过滤 null 后 createAnd，全空返回 emptyFilter() */
function aggregate(apis: FilterItemApi[]): FilterInfo {
  const nonNull = apis
    .map((a) => a.filter)
    .filter((f): f is FilterInfo => f !== null);
  if (nonNull.length === 0) return emptyFilter() as unknown as FilterInfo;
  return FilterInfo.createAnd(...(nonNull as unknown as FilterInfo[])) as unknown as FilterInfo;
}

/** 面板侧：创建聚合容器（无 UI） */
export function useFilterPanel(): FilterPanelApi {
  const [items, setItems] = useState<Map<string, FilterItemApi>>(() => new Map());
  const counter = useRef(0);

  const register = useCallback((api: FilterItemApi): (() => void) => {
    const key = String(++counter.current);
    setItems((prev) => {
      const next = new Map(prev);
      next.set(key, api);
      return next;
    });
    return () => {
      setItems((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    };
  }, []);

  const notify = useCallback((): void => {
    setItems((prev) => new Map(prev));
  }, []);

  const filter = useMemo(() => aggregate([...items.values()]), [items]);

  const reset = useCallback((): void => {
    for (const api of items.values()) api.reset();
  }, [items]);

  return { filter, register, notify, reset };
}

/**
 * 子项侧：把当前 FilterItemApi 注册到父面板，并在 filter 值变化时 notify。
 * 返回父面板（可能不存在，此时返回 null）。
 */
export function useFilterItem(api: FilterItemApi): FilterPanelApi | null {
  const panel = useContext(FilterPanelContext);
  const apiRef = useRef(api);
  apiRef.current = api;

  // 稳定代理：面板持有它，调用时读取最新的 api
  const proxy = useMemo<FilterItemApi>(
    () => ({
      get filter() {
        return apiRef.current.filter;
      },
      reset: () => apiRef.current.reset(),
    }),
    [],
  );

  useEffect(() => {
    if (!panel) return;
    return panel.register(proxy);
  }, [panel, proxy]);

  // filter 值（对象身份）变化时通知面板重算
  useEffect(() => {
    panel?.notify();
  }, [api.filter, panel]);

  return panel;
}

/** 无面板时的空聚合结果（供独立使用的 FilterItem 兜底） */
export function emptyFilterInfo(): FilterInfo {
  return emptyFilter() as unknown as FilterInfo;
}
