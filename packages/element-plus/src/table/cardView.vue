<script setup lang="ts">
/**
 * 卡片视图：当前页每行一张卡片，网格自适应排列。
 * checkbox 与表格视图共用同一套跨页选中状态（经父组件 isRowSelected/emit check 驱动）。
 * 存在行操作时，卡片右键弹出操作菜单（菜单由父组件 Table 承载，本组件只 emit contextmenu）。
 * 加载遮罩不在此处——由父组件 Table 在 view-area 内统一渲染，三视图共用。
 */
const props = defineProps<{
  rows: Record<string, unknown>[];
  rowKey: string | number;
  showCheckbox: boolean;
  loading: boolean;
  hasActions: boolean;
  isSelected: (row: Record<string, unknown>) => boolean;
}>();

const emit = defineEmits<{
  (e: "check", row: Record<string, unknown>, checked: string | number | boolean): void;
  (e: "contextmenu", event: MouseEvent, row: Record<string, unknown>): void;
}>();
</script>

<template>
  <div class="yk-table__cards">
    <div v-for="(row, index) in props.rows" :key="String(row[props.rowKey])" class="yk-table__card"
      :class="{
        'is-selected': props.showCheckbox && props.isSelected(row),
        'has-actions': props.hasActions,
      }"
      :title="props.hasActions ? '右键查看行操作' : undefined"
      @contextmenu="emit('contextmenu', $event, row)">
      <el-checkbox v-if="props.showCheckbox" class="yk-table__card-checkbox"
        :model-value="props.isSelected(row)"
        @change="emit('check', row, $event)" />
      <slot :row="row" :index="index">
        <pre class="yk-table__card-json">{{ JSON.stringify(row, null, 2) }}</pre>
      </slot>
    </div>
    <!-- 空数据提示：与表格视图共享 #empty 插槽；未提供插槽时回落 el-empty「暂无数据」 -->
    <template v-if="!props.loading && props.rows.length === 0">
      <slot v-if="$slots.empty" name="empty" />
      <el-empty v-else description="暂无数据" />
    </template>
  </div>
</template>

<style scoped>
.yk-table__cards {
  display: grid;
  /* 自适应列宽：容器够宽时一行多张，窄屏自动降为单列 */
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  /* 加载遮罩始终有可挂载的高度，避免空容器遮罩塌陷 */
  min-height: 120px;
  /* 自制 loading 遮罩的定位上下文（替代原 v-loading 自动追加的 relative） */
  position: relative;
}

.yk-table__card {
  position: relative;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 6px;
  background: var(--el-bg-color, #fff);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.yk-table__card.is-selected {
  border-color: var(--el-color-primary, #409eff);
  /* inset 光晕勾边，比改 border-width 更不引发布局位移 */
  box-shadow: 0 0 0 1px var(--el-color-primary, #409eff) inset;
}

/* 配置了行操作的卡片：右键可弹操作菜单 */
.yk-table__card.has-actions {
  cursor: context-menu;
}

.yk-table__card-checkbox {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 1;
}

.yk-table__card-json {
  /* 右侧给悬浮 checkbox 留位 */
  margin: 0;
  padding-right: 24px;
  max-height: 260px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 空态占满整行，而非挤进单列格子 */
.yk-table__cards :deep(.el-empty) {
  grid-column: 1 / -1;
}
</style>
