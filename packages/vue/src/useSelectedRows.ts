import { ref, type Ref } from "vue";

/**
 * 行选择（checkbox 列）逻辑：维护选中行、响应 el-table 的 selection-change、
 * 提供清空全部选中（含其他页）的能力。
 *
 * 配合 el-table selection 列的 reserve-selection，翻页后选中按 rowKey 跨页保留，
 * selectedRows 为跨页累计值。
 *
 * @param tableEl  el-table 实例引用（用于 clearSelection 等方法）
 */
export function useSelectedRows(
  tableEl: Ref<{ clearSelection?: () => void } | null>,
) {
  /** 当前选中的行（跨页累计，reserve-selection 下保留其他页选中） */
  const selectedRows = ref<unknown[]>([]);

  /** el-table 勾选变化（含表头全选/取消全选）时同步选中行 */
  function onSelectionChange(selection: unknown[]): void {
    selectedRows.value = selection;
  }

  /** 清空全部选中（含其他页的选中）；el-table 会触发 selection-change 同步 selectedRows */
  function clearSelection(): void {
    tableEl.value?.clearSelection?.();
  }

  return {
    selectedRows,
    onSelectionChange,
    clearSelection,
  };
}
