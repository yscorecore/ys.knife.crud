/// <reference types="vite/client" />
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { FilterInfo, emptyFilter } from "@ys-knife-crud/core";
import { FilterPanelContext, useFilterPanel } from "@ys-knife-crud/react";
import type { FilterPanelApi } from "@ys-knife-crud/react";
import "./rootFilterPanel.css";

export interface RootFilterPanelProps {
  /**
   * 外部追加条件：与子项的条件按 AND 合并。
   * 传 null / 不传时忽略。
   */
  extraFilter?: FilterInfo | null;
  children?: ReactNode;
}

/** 暴露给父面板的聚合 API（与 Vue 版 defineExpose 一致） */
export interface RootFilterPanelHandle {
  /** 当前聚合后的查询条件（extraFilter AND 所有子项） */
  readonly filter: FilterInfo;
  /** 重置所有已注册子项（extraFilter 由外部自行维护） */
  reset(): void;
}

/**
 * YsRootFilterPanel —— 无 UI 的筛选条件聚合容器（antd 版）。
 *
 * 只做两件事，不渲染任何视觉元素：
 * 1. 提供注册通道：FilterPanelContext.Provider，子 FilterItem 经 useFilterItem 注册/注销
 * 2. 聚合查询条件：所有已注册子项的 FilterInfo + extraFilter 按 AND 合并；
 *    全空时返回 emptyFilter()
 */
export const YsRootFilterPanel = forwardRef<RootFilterPanelHandle, RootFilterPanelProps>(
  function YsRootFilterPanel(props, ref) {
    const panel = useFilterPanel();
    const panelRef = useRef(panel);
    panelRef.current = panel;

    /**
     * context 值保持稳定引用：@ys-knife-crud/react 的 useFilterItem 以 context 身份作为
     * 注册 effect 的依赖，若每次渲染都产生新对象会反复注销/注册并触发更新死循环。
     * 只暴露稳定的 register / notify，filter/reset 用 getter 读取最新内部状态。
     */
    const contextValue = useMemo<FilterPanelApi>(
      () => ({
        get filter() {
          return panelRef.current.filter;
        },
        reset: () => panelRef.current.reset(),
        register: panel.register,
        notify: panel.notify,
      }),
      [panel.register, panel.notify],
    );

    /** 最终查询条件：extraFilter + 子项聚合，按 AND 合并；全空时返回 emptyFilter() */
    const filter = useMemo<FilterInfo>(() => {
      const parts: FilterInfo[] = [];
      if (props.extraFilter) parts.push(props.extraFilter);
      const inner = panel.filter;
      if (inner && !inner.isEmpty()) parts.push(inner);
      if (parts.length === 0) return emptyFilter() as unknown as FilterInfo;
      if (parts.length === 1) return parts[0] as FilterInfo;
      return FilterInfo.createAnd(
        ...(parts as unknown as FilterInfo[]),
      ) as unknown as FilterInfo;
    }, [props.extraFilter, panel.filter]);

    useImperativeHandle(
      ref,
      () => ({
        filter,
        reset: () => panel.reset(),
      }),
      [filter, panel],
    );

    return (
      <FilterPanelContext.Provider value={contextValue}>
        {props.children}
      </FilterPanelContext.Provider>
    );
  },
);
