import { ref } from "vue";
import type { Action, RowActionsFunc } from "@ys.knife.crud/core";

/** useRowActions 需要从组件 props 中访问的成员 */
interface RowActionsProps {
  readonly rowActionsFunc?: RowActionsFunc<unknown>;
}

/**
 * 行操作（Action）逻辑：加载行操作列表、按行计算可见/可用状态、
 * 执行操作并触发数据刷新。
 *
 * @param props  组件 props（只需 rowActionsFunc）
 * @param reloadData  操作执行完成后的数据刷新回调（增删改类操作需要看到最新列表）
 */
export function useRowActions(
  props: RowActionsProps,
  reloadData: () => Promise<void>,
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

  /** 该行可见的操作（action.show 缺省视为可见） */
  function visibleActions(row: unknown): Action<unknown>[] {
    return actions.value.filter((a) => a.show?.(row) ?? true);
  }

  /** 该操作对该行是否可用（action.enable 缺省视为可用） */
  function isEnabled(action: Action<unknown>, row: unknown): boolean {
    return action.enable?.(row) ?? true;
  }

  /** 执行操作，完成后刷新数据 */
  async function runAction(action: Action<unknown>, row: unknown): Promise<void> {
    await action.execute(row);
    await reloadData();
  }

  return {
    actions,
    actionsLoading,
    loadActions,
    visibleActions,
    isEnabled,
    runAction,
  };
}
