<script setup lang="ts">
/**
 * 选中提示栏：显示当前已选行数与清空按钮。
 *
 * 作为 Table 顶部工具栏的左侧内容使用：reserve-selection 下选中可能来自其他页，
 * 给用户一个总览与清空入口。无选中时不渲染。
 *
 * 配合 useSelectedRows 的 selectedRows / clearSelection。
 */
defineProps<{
  /** 当前选中的行数 */
  count: number;
}>();

defineEmits<{
  /** 清空全部选中（含其他页的选中） */
  (e: "clear"): void;
}>();
</script>

<template>
  <div v-if="count > 0" class="yk-table__selection-bar">
    <span>已选 {{ count }} 项</span>
    <el-button link type="primary" @click="$emit('clear')">清空</el-button>
  </div>
</template>

<style scoped>
.yk-table__selection-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  font-size: 0.92em;
  color: #409eff;
}
</style>
