<script setup lang="ts">
import { inject, shallowRef, watch } from "vue";
import { TABLE_INJECTION_KEY } from "element-plus/es/components/table/src/tokens.mjs";
import { useSelectedRows } from "@ys.knife.crud/vue";

/**
 * 勾选列：内部维护选中行（跨页累计）、同步 el-table 选中变化、清空全部选中。
 *
 * el-table 的 selection-change 事件只向其父组件发射，子组件无法直接监听；
 * 因此经 element-plus 的 TABLE_INJECTION_KEY 注入表格实例：
 * - 选中数据订阅 store.states.selection（一个 Ref，与 selection-change 事件同源）
 * - 清空选中调用表格实例暴露的公开方法 clearSelection
 * 这样 Table.vue 不需要 @selection-change / tableEl 等任何选中相关接线。
 *
 * 经 defineExpose 暴露 selectedRows / clearSelection 供父组件使用
 * （TableApi 契约要求 selectedRows、clearSelection，工具栏 SelectionBar
 * 与 ExportExcelDialog 也需要选中数据）。
 */
const table = inject(TABLE_INJECTION_KEY, null);

// 注入的 Table 类型（内部实例形状）顶层未声明经 __expose 暴露的方法，
// 但 store 上有同实现的公开方法 clearSelection，包一层结构对象喂给框架无关的 composable
const tableEl = shallowRef<{ clearSelection?: () => void } | null>(
  table ? { clearSelection: () => table.store.clearSelection() } : null,
);
const { selectedRows, onSelectionChange, clearSelection } = useSelectedRows(tableEl);

if (table) {
  // 注意：el-table 勾选时是原地 push/splice 修改 selection.value（不替换引用，
  // selection-change 事件发的是 .slice() 副本），所以不能直接 watch 这个 ref
  // （按引用比较不会触发）；getter 读取数组内容（.slice 遍历索引）以追踪原地变更，
  // 同时也覆盖 clearSelection 等路径的整体替换。
  watch(
    () => table.store.states.selection.value.slice(),
    (rows) => onSelectionChange(rows),
  );
}

defineExpose({ selectedRows, clearSelection });
</script>

<template>
  <!-- reserve-selection 使翻页后选中按 rowKey 跨页保留；表头 checkbox 全选/取消全选当前页 -->
  <el-table-column type="selection" width="48" reserve-selection />
</template>
