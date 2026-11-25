<script setup lang="ts">
import { computed } from "vue";
import type { PropType } from "vue";
import type { TableAction, TableApi } from "@ys-knife-crud/core";
import YsSelectionBar from "../table/selectionBar.vue";

/**
 * 表格级命令面板（commandBar）：数据驱动渲染表级命令按钮 + 内置选中提示条。
 *
 * 与行操作列（rowActionsColumn）对照：
 *  - rowActionsColumn 渲染的是行级命令（Action<T>，execute 接收 item + table）；
 *  - commandBar 渲染的是表级命令（TableAction，execute 只接收 table），作用域为整个表格。
 *
 * 布局：按 align 把 actions 拆成两组——
 *  align !== 'right'（默认）的命令在左侧流式排列，其后跟随内置 SelectionBar
 *  （table 有选中行时自动显示，提供全选/反选/清空），再接默认插槽追加额外内容；
 *  align === 'right' 的命令推到面板最右端（margin-left:auto）。
 * table 允许为 null——未就绪时按钮照常渲染，点击被忽略；选中提示条待 table 就绪后才出现。
 *
 * 内置表格操作下拉（刷新/导出/列设置/视图切换等）不再由 commandBar 自动渲染——
 * 需要时请作为 TableAction 自行加入（可设 align: 'right' 放到右侧），
 * 或在默认插槽中放置自定义按钮 / YsTableActionMenuButton。
 */
const props = defineProps({
  /** 表级命令列表，每条渲染为一个 el-button（type/plain/icon/desc/align），click 调 execute(table) */
  actions: { type: Array as PropType<TableAction[]>, required: true, default: () => [] },
  /** 当前表格实例；允许 null（表格未挂载时按钮仍可渲染，点击不执行，选中提示条隐藏） */
  table: { type: Object as PropType<TableApi | null>, default: null },
});

/** 左侧命令组：align 非 right（含未设置）的命令，与选中提示条、插槽一起流式排列 */
const leftActions = computed(() => props.actions.filter((a) => a.align !== "right"));
/** 右侧命令组：align === right 的命令，margin-left:auto 推到最右 */
const rightActions = computed(() => props.actions.filter((a) => a.align === "right"));
</script>

<template>
  <div class="yk-command-bar">
    <!-- 左侧命令组：左对齐命令按钮 + 内置选中提示条 + 默认插槽，流式排列 -->
    <div class="yk-command-bar__actions">
      <el-button
        v-for="action in leftActions"
        :key="action.name"
        :type="action.type === 'default' ? undefined : action.type"
        :plain="action.plain"
        @click="props.table && action.execute(props.table)"
      >
        <component v-if="action.icon" :is="action.icon" class="yk-command-bar__icon" />
        {{ action.desc }}
      </el-button>
      <!-- 内置选中提示条：table 有选中行时自动显示（SelectionBar 内部 count>0 才渲染），
           全选/反选仅当前页，清空含跨页 -->
      <YsSelectionBar
        v-if="props.table"
        :count="props.table.selectedRows.length"
        @select-all="props.table?.selectAllOnPage()"
        @invert="props.table?.invertSelectionOnPage()"
        @clear="props.table?.clearSelection()"
      />
      <slot />
    </div>
    <!-- 右侧命令组：align=right 的命令，margin-left:auto 恒居最右，换行时仍恒定居最右 -->
    <div v-if="rightActions.length" class="yk-command-bar__right">
      <el-button
        v-for="action in rightActions"
        :key="action.name"
        :type="action.type === 'default' ? undefined : action.type"
        :plain="action.plain"
        @click="props.table && action.execute(props.table)"
      >
        <component v-if="action.icon" :is="action.icon" class="yk-command-bar__icon" />
        {{ action.desc }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
/* 命令面板容器：flex 流式布局，宽度不足时整体换行 */
.yk-command-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 12px 0;
}

/* 左侧命令组：左对齐命令按钮 + 内置选中提示条 + 默认插槽内容流式排列 */
.yk-command-bar__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

/* 右侧命令组：margin-left:auto 推到面板最右端，换行时仍恒定居最右 */
.yk-command-bar__right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-left: auto;
}

/* 命令按钮图标与文字对齐（el-button 内 inline-flex，图标经 margin-right + vertical-align 微调） */
.yk-command-bar__icon {
  margin-right: 4px;
  vertical-align: -2px;
}
</style>
