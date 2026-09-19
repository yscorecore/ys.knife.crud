<script setup lang="ts">
import { type PropType } from "vue";
import type { Action } from "@ys.knife.crud/core";
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
});
</script>

<template>
  <el-table-column v-if="props.actions.length > 0" label="操作" fixed="right">
    <template #default="{ row }">
      <el-button
        v-for="action in visibleActions(props.actions, row)"
        :key="action.name"
        link
        type="primary"
        :disabled="!isEnabled(action, row)"
        @click="action.execute(row)"
      >
        {{ action.desc }}
      </el-button>
    </template>
  </el-table-column>
</template>
