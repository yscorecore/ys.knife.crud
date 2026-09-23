<script setup lang="ts">
import type { PropType } from "vue";
import type { TableAction, TableApi } from "@ys.knife.crud/core";
import YsTableActionMenuButton from "./tableActionMenuButton.vue";
import YsSelectionBar from "../table/selectionBar.vue";

/**
 * 表格级命令面板（commandBar）：数据驱动渲染表级命令按钮 + 内置选中提示条 + 内置表格操作下拉。
 *
 * 与行操作列（rowActionsColumn）对照：
 *  - rowActionsColumn 渲染的是行级命令（Action<T>，execute 接收 item + table）；
 *  - commandBar 渲染的是表级命令（TableAction，execute 只接收 table），作用域为整个表格。
 *
 * 布局：左侧命令按钮流式排列，其后跟随内置 SelectionBar（table 有选中行时自动显示，
 * 提供全选/反选/清空），再接默认插槽追加额外内容；右侧恒居内置 TableActionMenuButton
 * （margin-left:auto），可用 showActionMenuButton 关闭。
 * table 允许为 null——未就绪时按钮照常渲染，点击被忽略；下拉按钮与选中提示条待 table 就绪后才出现。
 */
const props = defineProps({
  /** 表级命令列表，每条渲染为一个 el-button（type/plain/icon/desc），click 调 execute(table) */
  actions: { type: Array as PropType<TableAction[]>, required: true, default: () => [] },
  /** 当前表格实例；允许 null（表格未挂载时按钮仍可渲染，点击不执行，下拉按钮隐藏） */
  table: { type: Object as PropType<TableApi | null>, default: null },
  /** 是否显示内置表格操作下拉按钮（刷新/列设置/导出/视图切换/选择行/列宽拖动），默认 true 居右 */
  showActionMenuButton: { type: Boolean, default: true },
});
</script>

<template>
  <div class="yk-command-bar">
    <!-- 左侧命令组：命令按钮 + 内置选中提示条 + 默认插槽，流式排列 -->
    <div class="yk-command-bar__actions">
      <el-button
        v-for="action in props.actions"
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
    <!-- 右侧内置表格操作下拉：margin-left:auto 恒居最右，仅在 showActionMenuButton 且 table 就绪时渲染 -->
    <YsTableActionMenuButton
      v-if="props.showActionMenuButton && props.table"
      :table="props.table"
      class="yk-command-bar__menu"
    />
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

/* 左侧命令组：命令按钮 + 内置选中提示条 + 默认插槽内容流式排列 */
.yk-command-bar__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

/* 命令按钮图标与文字对齐（el-button 内 inline-flex，图标经 margin-right + vertical-align 微调） */
.yk-command-bar__icon {
  margin-right: 4px;
  vertical-align: -2px;
}

/* 内置表格操作下拉：margin-left:auto 推到面板最右端，换行时仍恒定居最右 */
.yk-command-bar__menu {
  margin-left: auto;
}
</style>
