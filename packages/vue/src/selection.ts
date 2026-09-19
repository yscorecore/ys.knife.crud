import { computed, nextTick, ref, watch, type Ref } from "vue";

/**
 * 行选择（checkbox）逻辑：UI 库无关的跨页选中集合。
 *
 * 选中状态以 rowKey 为键保存在内部 Map 中（不依赖任何具体 UI 组件），
 * 因此同一套状态可同时驱动：
 * - 表格视图：el-table 的勾选列（受控模式——翻页后由 restoreSelection 恢复勾选）；
 * - 卡片视图：每张卡片上的 checkbox（isRowSelected / toggleRowSelection）。
 *
 * 两种视图切换、翻页、切换每页条数都不丢失累计选中。
 */

/** 适配 el-table 实例的最小结构（只用到选择相关的两个方法） */
export interface SelectionTableLike {
  clearSelection?: () => void;
  toggleRowSelection?: (row: unknown, selected?: boolean) => void;
}

export type RowRecord = Record<string, unknown>;

interface UseSelectionOptions {
  /** el-table 实例引用；卡片视图下表格不挂载时为 null */
  tableEl: Ref<SelectionTableLike | null>;
  /** 当前页行数据（翻页后据此把累计选中恢复到 el-table 勾选态） */
  rows: Ref<RowRecord[]>;
  /** 行 key 字段名（与 el-table 的 row-key 一致） */
  rowKey: Ref<string>;
}

export function useSelection({ tableEl, rows, rowKey }: UseSelectionOptions) {
  /** 跨页累计选中：rowKey 值 → 行对象 */
  const selectedMap = ref(new Map<unknown, RowRecord>());

  /** 对外暴露的选中行（Map 值的数组，插入顺序即选中顺序） */
  const selectedRows = computed<unknown[]>(() => [...selectedMap.value.values()]);

  /**
   * 恢复标记：程序化调 el-table.toggleRowSelection 会反向触发 selection-change，
   * 恢复期间忽略这些事件，避免把刚恢复的累计选中误清空。
   */
  let restoring = false;

  function keyOf(row: RowRecord): unknown {
    return row[rowKey.value];
  }

  /**
   * el-table selection-change 事件（含表头全选 / 取消全选当前页）。
   * 事件只携带「当前页」的勾选结果，故以当前页为基准对账：
   * 先从累计集合移除当前页全部 key，再把事件给出的勾选行写回——
   * 其他页的选中不受影响。
   */
  function onSelectionChange(selection: unknown[]): void {
    if (restoring) return;
    const next = new Map(selectedMap.value);
    for (const row of rows.value) next.delete(keyOf(row));
    for (const row of selection as RowRecord[]) next.set(keyOf(row), row);
    selectedMap.value = next;
  }

  /** 某行当前是否处于选中态（卡片 checkbox 的 model-value / 选中样式） */
  function isRowSelected(row: RowRecord): boolean {
    return selectedMap.value.has(keyOf(row));
  }

  /**
   * 切换某行选中态（卡片 checkbox 使用；selected 显式传 true/false）。
   * el-table 存在（表格视图）时同步其内部勾选态。
   */
  function toggleRowSelection(row: RowRecord, selected?: boolean): void {
    const next = new Map(selectedMap.value);
    const shouldSelect = selected ?? !next.has(keyOf(row));
    if (shouldSelect) next.set(keyOf(row), row);
    else next.delete(keyOf(row));
    selectedMap.value = next;
    tableEl.value?.toggleRowSelection?.(row, shouldSelect);
  }

  /**
   * 把累计选中恢复到 el-table 的当前页勾选态。
   * 翻页 / 重载 / 从卡片视图切回表格视图（el-table 重新挂载）后调用。
   * 调用前若已由 rows 的 pre watcher 置 restoring=true，本函数只负责在恢复
   * 完成（含 toggle 触发的 selection-change 全部派发完毕）后解除标记。
   */
  async function restoreSelection(): Promise<void> {
    await nextTick();
    const table = tableEl.value;
    // 表格未挂载（卡片视图翻页）：无勾选需要恢复，解除 pre watcher 预设的标记
    if (!table?.toggleRowSelection) {
      restoring = false;
      return;
    }
    restoring = true;
    for (const row of rows.value) {
      table.toggleRowSelection(row, selectedMap.value.has(keyOf(row)));
    }
    // 等 toggleRowSelection 入队的 selection-change 全部派发完再解除标记
    await nextTick();
    restoring = false;
  }

  /** 清空全部选中（含其他页）：清空累计集合并同步 el-table */
  function clearSelection(): void {
    selectedMap.value = new Map();
    tableEl.value?.clearSelection?.();
  }

  /**
   * 选中当前页所有行（其他页已选中不受影响）。
   * 先把当前页全部 key 写入累计集合，再经 restoreSelection 把勾选态同步到 el-table。
   */
  function selectAllOnPage(): void {
    const next = new Map(selectedMap.value);
    for (const row of rows.value) next.set(keyOf(row), row);
    selectedMap.value = next;
    void restoreSelection();
  }

  /**
   * 反选当前页行（其他页已选中不受影响）。
   * 对当前页每行：已选中的移除、未选中的加入；再经 restoreSelection 同步到 el-table。
   */
  function invertSelectionOnPage(): void {
    const next = new Map(selectedMap.value);
    for (const row of rows.value) {
      const key = keyOf(row);
      if (next.has(key)) next.delete(key);
      else next.set(key, row);
    }
    selectedMap.value = next;
    void restoreSelection();
  }

  // 当前页数据变化（首载 / 翻页 / 切换每页条数）时的处理。
  // 必须 flush:'pre' 且【先置 restoring=true】：el-table 在其 data watcher（同为 pre，
  // 但创建晚于本 watcher）里会清空内部选中并派发一次空的 selection-change——
  // 若不提前挡住，onSelectionChange 会用空选中对账，误删累计集合。
  // restoreSelection 在 nextTick（行渲染完成）后恢复勾选，再等一个 nextTick 让
  // toggleRowSelection 派生的 selection-change 派发完毕，最后解除标记。
  watch(rows, () => {
    restoring = true;
    void restoreSelection();
  }, { flush: "pre" });

  return {
    selectedRows,
    onSelectionChange,
    isRowSelected,
    toggleRowSelection,
    restoreSelection,
    clearSelection,
    selectAllOnPage,
    invertSelectionOnPage,
  };
}
