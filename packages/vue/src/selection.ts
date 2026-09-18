import { ref } from "vue";

/**
 * 行选择（checkbox 列）逻辑：维护选中行、响应表格的 selection-change、
 * 提供清空全部选中（含其他页）的能力。
 *
 * 配合 el-table selection 列的 reserve-selection，翻页后选中按 rowKey 跨页保留，
 * selectedRows 为跨页累计值。
 * 
 */
export function useSelection(
) {
  /** 当前选中的行（跨页累计：reserve-selection 按 rowKey 保留其他页选中） */
  const selectedRows = ref<unknown[]>([]);

  /** 表格勾选变化（含表头全选/取消全选）时同步选中行 */
  function onSelectionChange(selection: unknown[]): void {
    selectedRows.value = selection;
  }



  return {
    selectedRows,
    onSelectionChange
  };
}
