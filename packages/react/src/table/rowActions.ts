import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, RowActionsProps } from "@ys-knife-crud/core";

/**
 * 该行可见的操作（action.show 缺省视为可见）。
 * 纯函数：供行操作单元格等组件复用。
 */
export function visibleActions(
  actions: Action<unknown>[],
  row: unknown,
): Action<unknown>[] {
  return actions.filter((a) => a.show?.(row) ?? true);
}

/**
 * 该操作对该行是否可用（action.enable 缺省视为可用）。
 * 纯函数：供行操作单元格等组件复用。
 */
export function isEnabled(action: Action<unknown>, row: unknown): boolean {
  return action.enable?.(row) ?? true;
}

export interface UseRowActionsResult {
  /** 行操作列表（rowActionsFunc 加载结果） */
  actions: Action<unknown>[];
  actionsLoading: boolean;
  loadActions: (signal?: AbortSignal) => Promise<void>;
}

/**
 * 行操作（Action）逻辑：加载行操作列表；rowActionsFunc 变化时自动重新加载。
 */
export function useRowActions(props: RowActionsProps): UseRowActionsResult {
  const [actions, setActions] = useState<Action<unknown>[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);

  const funcRef = useRef(props.rowActionsFunc);
  funcRef.current = props.rowActionsFunc;

  const loadActions = useCallback(async (signal?: AbortSignal): Promise<void> => {
    const func = funcRef.current;
    if (!func) {
      setActions([]);
      return;
    }
    setActionsLoading(true);
    try {
      setActions(await func(signal));
    } finally {
      setActionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActions();
  }, [props.rowActionsFunc, loadActions]);

  return { actions, actionsLoading, loadActions };
}
