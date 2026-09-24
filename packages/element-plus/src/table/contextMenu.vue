<script setup lang="ts">
import type { Action } from "@ys.knife.crud/core";

/**
 * 右键上下文菜单：卡片/列表视图行操作入口。
 * teleport 到 body 避免被容器裁切；透明遮罩捕获菜单外点击/右键以关闭。
 * 菜单项的可见性由父组件经 actions 传入（已过滤），可用性经 isEnabled 判断；
 * 点击有效项 emit select，点遮罩/外部 emit close。
 */
const props = defineProps<{
  menu: { x: number; y: number; row: Record<string, unknown> } | null;
  actions: Action<unknown>[];
  isEnabled: (action: Action<unknown>, row: Record<string, unknown>) => boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", action: Action<unknown>): void;
}>();
</script>

<template>
  <teleport to="body">
    <template v-if="props.menu">
      <div class="yk-table__menu-mask" @click="emit('close')"
        @contextmenu.prevent="emit('close')" />
      <ul class="yk-table__context-menu" :style="{ left: `${props.menu.x}px`, top: `${props.menu.y}px` }">
        <li v-for="action in props.actions" :key="action.name" class="yk-table__context-menu-item"
          :class="{ 'is-disabled': !props.isEnabled(action, props.menu.row) }"
          @click="props.isEnabled(action, props.menu.row) && emit('select', action)">
          <component v-if="action.icon" :is="action.icon" class="yk-table__context-menu-icon" />
          {{ action.desc }}
        </li>
      </ul>
    </template>
  </teleport>
</template>

<style scoped>
/* 透明遮罩：铺满视口，捕获菜单外的点击/右键以关闭菜单 */
.yk-table__menu-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
}

.yk-table__context-menu {
  position: fixed;
  z-index: 2001;
  box-sizing: border-box;
  min-width: 120px;
  margin: 4px 0;
  padding: 4px 0;
  list-style: none;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  border-radius: 4px;
  box-shadow: var(--el-box-shadow-light, 0 0 12px rgba(0, 0, 0, 0.12));
}

.yk-table__context-menu-item {
  padding: 0 16px;
  font-size: 14px;
  line-height: 34px;
  color: var(--el-text-color-regular, #606266);
  white-space: nowrap;
  cursor: pointer;
}

.yk-table__context-menu-item:hover {
  background: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-color-primary, #409eff);
}

.yk-table__context-menu-item.is-disabled {
  color: var(--el-disabled-text-color, #a8abb2);
  cursor: not-allowed;
}

.yk-table__context-menu-item.is-disabled:hover {
  background: transparent;
  color: var(--el-disabled-text-color, #a8abb2);
}

/* 右键菜单项图标：stroke 跟随 li 的 color（currentColor），hover 变蓝 / disabled 变灰自动联动 */
.yk-table__context-menu-icon {
  margin-right: 6px;
  vertical-align: middle;
}
</style>
