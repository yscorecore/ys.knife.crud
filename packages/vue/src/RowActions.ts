import { ref, watch } from "vue";
import type { Action, RowActionsProps } from "@ys.knife.crud/core";

/**
 * 该行可见的操作（action.show 缺省视为可见）。
 * 纯函数：不依赖 composable 内部 state，供 RowActionsCell 等组件复用。
 */
export function visibleActions(
  actions: Action<unknown>[],
  row: unknown,
): Action<unknown>[] {
  return actions.filter((a) => a.show?.(row) ?? true);
}

/**
 * 该操作对该行是否可用（action.enable 缺省视为可用）。
 * 纯函数：供 RowActionsCell 等组件复用。
 */
export function isEnabled(action: Action<unknown>, row: unknown): boolean {
  return action.enable?.(row) ?? true;
}

/**
 * 行操作（Action）逻辑：加载行操作列表。
 *
 * 可见/禁用判断由 visibleActions / isEnabled 纯函数提供，
 * 执行已下沉到 RowActionsCell 组件内部（直接调 Action.execute）。
 *
 * @param props  组件 props（只需 rowActionsFunc）
 */
export function useRowActions(
  props: RowActionsProps,
) {
  /** 行操作列表（rowActionsFunc 加载结果） */
  const actions = ref<Action<unknown>[]>([]);
  const actionsLoading = ref(false);

  async function loadActions(signal?: AbortSignal): Promise<void> {
    if (!props.rowActionsFunc) {
      actions.value = [];
      return;
    }
    actionsLoading.value = true;
    try {
      actions.value = await props.rowActionsFunc(signal);
    } finally {
      actionsLoading.value = false;
    }
  }

  // 外部 rowActionsFunc 变化时重新加载
  watch(() => props.rowActionsFunc, () => loadActions());

  return {
    actions,
    actionsLoading,
    loadActions,
  };
}
