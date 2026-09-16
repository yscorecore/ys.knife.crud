<script setup lang="ts">
import { type PropType } from "vue";
import type { Action } from "@ys.knife.crud/core";
import { visibleActions, isEnabled } from "./useRowActions";

/**
 * 行操作单元格：渲染某行可见的操作按钮组并执行操作。
 *
 * 只接收两个外部参数：当前行数据 row 与全部行操作列表 actions。
 * 可见/禁用判断走 useRowActions 的 visibleActions / isEnabled 纯函数
 * （按 Action.show / Action.enable 决定，缺省视为可见/可用），
 * 执行直接调 Action.execute。
 *
 * 作为 el-table-column 的 #default 插槽内容使用，保留 el-table-column 本身在
 * Table.vue 中（el-table 要求其直接子节点为 column）。
 */
const props = defineProps({
  /** 当前行数据 */
  row: { type: Object as PropType<Record<string, unknown>>, required: true },
  /** 全部行操作列表（组件按 Action.show 过滤可见项） */
  actions: { type: Array as PropType<Action<unknown>[]>, required: true },
});
</script>

<template>
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
