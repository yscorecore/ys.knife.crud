<script setup lang="ts">
import type { TableApi } from "@ys.knife.crud/core";

/**
 * 表格操作菜单按钮（图标按钮 + 下拉菜单）：
 * 把「刷新 / 列设置 / 导出 Excel / 视图切换 / 选择行开关 / 列宽拖动开关」
 * 收敛到一个纯图标按钮，全部命令经 TableApi 驱动。菜单本身无状态——✓ 标记在菜单
 * 弹出渲染时直接读 table 的当前状态（TableApi getter，始终反映表格实际值），
 * 切换调对应 setter（受控 / 非受控模式均生效）。
 *
 * 触发按钮可用 #trigger 插槽整体自定义（如换图标/文字/样式）；
 * 未提供时使用内置 32px 方形 sliders 图标按钮。
 */
const props = defineProps<{
  /** 当前表格实例（TableApi，必填）：所有命令都经它调用 */
  table: TableApi;
}>();

/** 下拉菜单命令分派：全部直接调 table api */
function onCommand(command: string): void {
  switch (command) {
    // 仅重拉当前页数据（保留页码、分页大小与筛选状态）
    case "refresh":
      props.table.refresh();
      break;
    case "config":
      props.table.openConfigDialog();
      break;
    case "export":
      props.table.openExportDialog();
      break;
    case "view-table":
      props.table.setViewMode("table");
      break;
    case "view-card":
      props.table.setViewMode("card");
      break;
    case "view-list":
      props.table.setViewMode("list");
      break;
    case "toggle-checkbox":
      // 关闭选择列时表格内部会自动清空累计选中
      props.table.setSelectable(!props.table.selectable);
      break;
    case "toggle-column-resize":
      props.table.setColumnResizable(!props.table.columnResizable);
      break;
  }
}
</script>

<template>
  <!-- trigger 必须是 el-dropdown 的直接元素——#trigger 插槽内容直接落在默认插槽里，
       自定义时同样必须传入单个可点击根元素；不要再嵌 el-tooltip，否则 popper
       拿不到定位引用（菜单错位到视口左上角），故默认按钮提示用原生 title -->
  <el-dropdown trigger="click" placement="bottom-end" @command="onCommand">
    <slot name="trigger">
      <el-button class="yk-table-action-menu-button__btn" title="表格操作" aria-label="表格操作">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <circle cx="9" cy="6" r="2.4" fill="var(--el-bg-color, #fff)" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <circle cx="15" cy="12" r="2.4" fill="var(--el-bg-color, #fff)" />
          <line x1="3" y1="18" x2="21" y2="18" />
          <circle cx="9" cy="18" r="2.4" fill="var(--el-bg-color, #fff)" />
        </svg>
      </el-button>
    </slot>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="refresh">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="yk-table-action-menu-button__icon">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          刷新
        </el-dropdown-item>
        <el-dropdown-item command="export">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="yk-table-action-menu-button__icon">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          导出 Excel
        </el-dropdown-item>
        <el-dropdown-item command="config">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="yk-table-action-menu-button__icon">
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          列设置
        </el-dropdown-item>
        <el-dropdown-item command="view-table" divided>
          <span class="yk-table-action-menu-button__check">{{ table.viewMode === "table" ? "✓" : "" }}</span>表格视图
        </el-dropdown-item>
        <!-- 卡片 / 列表入口仅在父组件提供了对应插槽时显示，避免切过去只有 JSON 兜底 -->
        <el-dropdown-item v-if="table.slotNames.includes('card')" command="view-card">
          <span class="yk-table-action-menu-button__check">{{ table.viewMode === "card" ? "✓" : "" }}</span>卡片视图
        </el-dropdown-item>
        <el-dropdown-item v-if="table.slotNames.includes('list')" command="view-list">
          <span class="yk-table-action-menu-button__check">{{ table.viewMode === "list" ? "✓" : "" }}</span>列表视图
        </el-dropdown-item>
        <el-dropdown-item command="toggle-checkbox" divided>
          <span class="yk-table-action-menu-button__check">{{ table.selectable ? "✓" : "" }}</span>选择行
        </el-dropdown-item>
        <!-- 列宽拖动开关：关闭后表头列边界不可拖（仅表格视图有意义，开关状态对表格视图常驻生效） -->
        <el-dropdown-item command="toggle-column-resize">
          <span class="yk-table-action-menu-button__check">{{ table.columnResizable ? "✓" : "" }}</span>列宽拖动
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped>
/* 默认纯图标触发按钮：方形统一尺寸（#trigger 自定义时不套用） */
.yk-table-action-menu-button__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  padding: 0;
}

.yk-table-action-menu-button__btn svg {
  display: block;
}

/* 下拉项里的行内图标与文字对齐 */
.yk-table-action-menu-button__icon {
  margin-right: 6px;
  vertical-align: -2px;
}

/* 下拉项里的选中标记列：固定宽度，文案不随勾选状态左右抖动 */
.yk-table-action-menu-button__check {
  display: inline-block;
  width: 1.2em;
  color: var(--el-color-primary, #409eff);
  font-weight: 700;
}
</style>
