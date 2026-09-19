<script setup lang="ts">
import type { FunctionNode } from "@ys.knife.crud/core";

/**
 * YsMainPanel 功能树的递归节点：
 * - children 非空 → el-sub-menu（递归渲染子节点，天然支持任意层级）
 * - 否则 → el-menu-item 叶子（select 事件由顶层 el-menu 统一收集，无需逐级 emit）
 * 样式（icon/text、折叠态显隐与居中）由父组件 YsMainPanel 经 :deep 提供，
 * 折叠态的 popup 弹层被 teleport 到 body 之外，不受折叠隐藏样式影响，文字正常显示。
 */
defineOptions({ name: "YsMainPanelMenuNode" });

defineProps<{
  node: FunctionNode;
}>();
</script>

<template>
  <el-sub-menu v-if="node.children && node.children.length > 0" :index="node.key">
    <template #title>
      <i v-if="node.icon" class="ys-main-panel__menu-icon">{{ node.icon }}</i>
      <span class="ys-main-panel__menu-text">{{ node.label }}</span>
    </template>
    <main-panel-menu-node v-for="child in node.children" :key="child.key" :node="child" />
  </el-sub-menu>

  <el-menu-item v-else :index="node.key">
    <i v-if="node.icon" class="ys-main-panel__menu-icon">{{ node.icon }}</i>
    <span class="ys-main-panel__menu-text">{{ node.label }}</span>
  </el-menu-item>
</template>
