<script setup lang="ts">
/**
 * 选中提示栏：显示当前已选行数，并提供全选/反选/清空操作。
 *
 * 作为 Table 顶部工具栏的左侧内容使用：reserve-selection 下选中可能来自其他页，
 * 给用户一个总览与操作入口。无选中时不渲染。
 *
 * - 全选 / 反选：仅作用于当前页行，不影响其他页已选中的行；
 * - 清空：清空全部选中（含其他页的选中）。
 */
defineProps<{
  /** 当前选中的行数 */
  count: number;
}>();

defineEmits<{
  /** 选中当前页所有行 */
  (e: "select-all"): void;
  /** 反选当前页行 */
  (e: "invert"): void;
  /** 清空全部选中（含其他页的选中） */
  (e: "clear"): void;
}>();
</script>

<template>
  <div v-if="count > 0" class="yk-table__selection-bar">
    <span class="yk-table__selection-bar__count">已选 {{ count }} 项</span>
    <span class="yk-table__selection-bar__sep">|</span>
    <el-button link type="primary" class="yk-table__selection-bar__btn"
      @click="$emit('select-all')">全选</el-button>
    <el-button link type="primary" class="yk-table__selection-bar__btn"
      @click="$emit('invert')">反选</el-button>
    <span class="yk-table__selection-bar__sep">|</span>
    <el-button link type="primary" class="yk-table__selection-bar__btn"
      @click="$emit('clear')">清空</el-button>
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
  line-height: 1;
  color: #409eff;
}

/* 文字与按钮共用同一字号/行高，避免「已选 N 项」与「清空」等按钮视觉上不对齐 */
.yk-table__selection-bar__count {
  line-height: 1;
}

.yk-table__selection-bar__sep {
  color: #a0cfff;
  line-height: 1;
}

/* el-button link 默认自带字号与最小高度，这里强制继承容器字号并去掉高度约束，
   使按钮文字与左侧「已选 N 项」在同一基线上对齐 */
.yk-table__selection-bar__btn {
  font-size: inherit;
  line-height: 1;
  padding: 0;
  height: auto;
  min-height: 0;
}
</style>
