<script setup lang="ts">
import { type PropType } from "vue";
import type { Action, RowActionsFunc } from "@ys.knife.crud/core";
import { useRowActions, visibleActions, isEnabled } from "@ys.knife.crud/vue";

/**
 * 行操作列：内部加载并维护行操作列表，渲染 el-table-column 与操作按钮组。
 *
 * Table.vue 只需传入 rowActionsFunc，行操作的加载、可见/禁用判断全部在此完成。
 * 经 defineExpose 暴露 actions / actionsLoading / loadActions 供父组件使用
 * （TableApi 契约要求 actions、reload 调 loadActions、v-loading 合并 actionsLoading）。
 *
 * 注意：el-table-column 必须是 el-table 的直接或间接子节点，element-plus 经
 * provide/inject 跨组件边界收集列，所以包在 RowActionsCell 内仍能正常注册。
 */
const props = defineProps({
  /** 行操作加载函数；为 undefined 时不渲染操作列 */
  rowActionsFunc: { type: Function as PropType<RowActionsFunc<unknown>>, required: false, default: undefined },
});

const { actions, actionsLoading, loadActions } = useRowActions(props);

defineExpose({ actions, actionsLoading, loadActions });
</script>

<template>
  <el-table-column v-if="actions.length > 0" label="操作" fixed="right">
    <template #default="{ row }">
      <el-button
        v-for="action in visibleActions(actions, row)"
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
