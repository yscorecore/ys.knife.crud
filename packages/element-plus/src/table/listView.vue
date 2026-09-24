<script setup lang="ts">
/**
 * 列表视图：一行一条数据、占满整行宽度。
 * checkbox 在行首，与表格/卡片视图共用同一套跨页选中状态（经父组件 isRowSelected/emit check 驱动）。
 * 存在行操作时右键弹出操作菜单（菜单由父组件 Table 承载，本组件只 emit contextmenu）。
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
  <div class="yk-table__list">
    <div v-for="(row, index) in props.rows" :key="String(row[props.rowKey])" class="yk-table__list-item"
      :class="{
        'is-selected': props.showCheckbox && props.isSelected(row),
        'has-actions': props.hasActions,
      }"
      :title="props.hasActions ? '右键查看行操作' : undefined"
      @contextmenu="emit('contextmenu', $event, row)">
      <el-checkbox v-if="props.showCheckbox" class="yk-table__list-item-checkbox"
        :model-value="props.isSelected(row)"
        @change="emit('check', row, $event)" />
      <div class="yk-table__list-item-body">
        <slot :row="row" :index="index">
          <pre class="yk-table__list-item-json">{{ JSON.stringify(row, null, 2) }}</pre>
        </slot>
      </div>
    </div>
    <!-- 空数据提示：与表格视图共享 #empty 插槽；未提供插槽时回落 el-empty「暂无数据」 -->
    <template v-if="!props.loading && props.rows.length === 0">
      <slot v-if="$slots.empty" name="empty" />
      <el-empty v-else description="暂无数据" />
    </template>
  </div>
</template>

<style scoped>
.yk-table__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* 加载遮罩始终有可挂载的高度，避免空容器遮罩塌陷 */
  min-height: 120px;
  /* 自制 loading 遮罩的定位上下文（替代原 v-loading 自动追加的 relative） */
  position: relative;
}

.yk-table__list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 6px;
  background: var(--el-bg-color, #fff);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.yk-table__list-item.is-selected {
  border-color: var(--el-color-primary, #409eff);
  /* inset 光晕勾边，与卡片选中态一致，且不引发布局位移 */
  box-shadow: 0 0 0 1px var(--el-color-primary, #409eff) inset;
}

/* 配置了行操作的列表行：右键可弹操作菜单（与卡片共用） */
.yk-table__list-item.has-actions {
  cursor: context-menu;
}

.yk-table__list-item-checkbox {
  flex-shrink: 0;
}

/* 行内容占满剩余宽度；min-width:0 允许插槽内容内部收缩/截断而不撑破行 */
.yk-table__list-item-body {
  flex: 1;
  min-width: 0;
}

/* JSON 兜底样式：与卡片视图的 yk-table__card-json 一致 */
.yk-table__list-item-json {
  margin: 0;
  max-height: 160px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
