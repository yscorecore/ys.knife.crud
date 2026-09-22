<script setup lang="ts">
import { computed, type PropType } from "vue";
import type { Action, TableApi } from "@ys.knife.crud/core";
import { visibleActions, isEnabled } from "@ys.knife.crud/vue";

/**
 * 行操作列（纯展示）：渲染 el-table-column 与操作按钮组。
 *
 * 行操作的加载状态归 Table 所有（useRowActions 在 table.vue 中调用），
 * actions 经 props 传入——同一套 actions 同时供卡片视图的右键菜单使用，
 * 且视图切换导致本组件卸载重建时操作列不会消失。
 *
 * 注意：el-table-column 必须是 el-table 的直接或间接子节点，element-plus 经
 * provide/inject 跨组件边界收集列，所以包在 RowActionsColumn 内仍能正常注册。
 */
const props = defineProps({
  /** 行操作列表（由 Table 的 useRowActions 加载）；为空时不渲染操作列 */
  actions: { type: Array as PropType<Action<unknown>[]>, required: true, default: () => [] },
  /** 当前表格实例（TableApi），传给 action.execute(row, table) 供行操作完成后调用 reload 等刷新 */
  table: { type: Object as PropType<TableApi>, required: true },
});

/** 操作列最小宽度：按按钮数估算（2 字 link 按钮 ≈34px + 12px 间距 + 单元格左右内边距 24px + 余量 6px），
 *  防止 fit 布局把列压窄导致按钮换行、各行行高不齐；宽屏下仍参与剩余空间分配 */
const actionsMinWidth = computed(() =>
  props.actions.length === 0
    ? undefined
    : props.actions.length * 34 + (props.actions.length - 1) * 12 + 30,
);
</script>

<template>
  <el-table-column v-if="props.actions.length > 0" label="操作" fixed="right" :min-width="actionsMinWidth">
    <template #default="{ row }">
      <el-button
        v-for="action in visibleActions(props.actions, row)"
        :key="action.name"
        link
        :type="action.type ?? 'primary'"
        :disabled="!isEnabled(action, row)"
        @click="action.execute(row, props.table)"
      >
        <component v-if="action.icon" :is="action.icon" class="yk-row-action__icon" />
        {{ action.desc }}
      </el-button>
    </template>
  </el-table-column>
</template>

<style scoped>
/* 行操作按钮图标对齐：el-button 内部 inline-flex，图标 svg 经 margin-right 与文字间隔，
   vertical-align 微调使线性图标与文字基线视觉居中 */
.yk-row-action__icon {
  margin-right: 4px;
  vertical-align: -2px;
}
</style>
