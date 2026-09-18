import type { Ref } from "vue";
import { ElMessage } from "element-plus";
import type { TableApi } from "@ys.knife.crud/core";
import type { UserRow } from "./demoData";

/**
 * 勾选演示共用：通过 Table expose 的 selectedRows 查看当前跨页累计选中的行。
 */
export function useSelectionViewer(tableRef: Ref<TableApi | null>) {
  function showSelection(): void {
    const selected = (tableRef.value?.selectedRows ?? []) as UserRow[];
    if (selected.length === 0) {
      ElMessage.warning("尚未选中任何行");
      return;
    }
    ElMessage.success(
      `已选中 ${selected.length} 行：${selected.map((r) => r.name).join("、")}`,
    );
  }

  return { showSelection };
}
