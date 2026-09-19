<script setup lang="ts">
import {
  defineAsyncComponent,
  onMounted,
  ref,
  watch,
  type Component,
  type PropType,
} from "vue";
import type { FunctionNode, FunctionNodesFunc } from "@ys.knife.crud/core";
import MainPanelMenuNode from "./mainPanelMenuNode.vue";

// 组件名统一带 ys 前缀：模板中以 <ys-main-panel>（或 <YsMainPanel>）使用，
// 同时保证全局注册（app.component）、递归组件与 devtools 中名称稳定。
defineOptions({ name: "YsMainPanel" });

/**
 * YsMainPanel：左侧功能树 + 右侧主面板选项卡的管理后台布局骨架。
 *
 * - nodesFunc：功能树数据加载函数（异步返回 FunctionNode[]，数据可来自后端接口）；
 *   children 非空为分组、否则为叶子。变化时自动重新加载
 * - resolveComponent：叶子节点的组件类型名称 → 组件的解析函数；
 *   可同步返回组件，也可返回 Promise<Component>（动态 import 异步加载）
 * - 点击叶子在主面板打开选项卡（已打开则仅激活、不重复创建），选项卡可关闭；
 *   已打开选项卡的组件保持挂载，切换时不丢失内部状态
 */
const props = defineProps({
  /** 功能树数据加载函数：异步返回功能树节点数组 */
  nodesFunc: { type: Function as PropType<FunctionNodesFunc>, required: true },
  /**
   * 组件解析函数：按叶子节点的组件类型名称返回组件。
   * 同步返回 Component，或返回 Promise<Component>（内部经 defineAsyncComponent
   * 异步渲染，加载期间选项卡内容为空、完成后自动显示）。
   */
  resolveComponent: {
    type: Function as PropType<(name: string) => Component | Promise<Component>>,
    required: true,
  },
  /** 初始打开并激活的叶子节点 key（功能树加载完成后应用，仅首次生效），默认不打开任何选项卡 */
  defaultActive: { type: String, default: "" },
});

/* ---------------- 菜单折叠（内部状态，非受控） ---------------- */

const menuCollapsed = ref(false);

/* ---------------- 功能树加载 ---------------- */

/** 功能树数据（nodesFunc 加载结果）与加载态 */
const nodes = ref<FunctionNode[]>([]);
const menuLoading = ref(false);

/** 分组节点判断：children 非空 */
function isGroup(node: FunctionNode): boolean {
  return !!(node.children && node.children.length > 0);
}

/** 深度优先查找节点 */
function findNode(list: FunctionNode[], key: string): FunctionNode | undefined {
  for (const node of list) {
    if (node.key === key) return node;
    const found = node.children ? findNode(node.children, key) : undefined;
    if (found) return found;
  }
  return undefined;
}

/* ---------------- 选项卡状态 ---------------- */

interface PanelTab {
  /** 选项卡 key = 叶子节点 key */
  key: string;
  /** 选项卡文案（含 icon 前缀） */
  label: string;
  /** 要渲染的组件类型名称（空表示叶子未声明 component，渲染为空） */
  componentName: string;
  /** 渲染面板组件时经 v-bind 透传的节点级 props（未声明为 undefined） */
  props: Record<string, unknown> | undefined;
}

const openTabs = ref<PanelTab[]>([]);
const activeKey = ref("");

/** 打开叶子对应的选项卡：已打开则仅激活（不重复创建） */
function openTab(node: FunctionNode): void {
  const label = (node.icon ? `${node.icon} ` : "") + node.label;
  if (!openTabs.value.some((tab) => tab.key === node.key)) {
    openTabs.value.push({
      key: node.key,
      label,
      componentName: node.component ?? "",
      props: node.props,
    });
    // 预热组件缓存，让首次渲染即命中 getComponent
    if (node.component) getComponent(node.component);
  }
  activeKey.value = node.key;
}

/** 功能树叶子被点击（el-menu select 只会由叶子触发） */
function handleMenuSelect(key: string): void {
  const node = findNode(nodes.value, key);
  if (node && !isGroup(node)) openTab(node);
}

/** 关闭选项卡：关闭的是当前 tab 时激活相邻的 tab（优先右侧，否则左侧） */
function removeTab(key: string | number): void {
  const target = String(key);
  const index = openTabs.value.findIndex((tab) => tab.key === target);
  if (index < 0) return;
  openTabs.value.splice(index, 1);
  if (activeKey.value === target) {
    const next = openTabs.value[Math.min(index, openTabs.value.length - 1)];
    activeKey.value = next?.key ?? "";
  }
}

/* ---------------- 组件解析与缓存 ----------------
 * 按组件类型名称缓存解析结果：同步组件直接缓存；Promise 包装为
 * defineAsyncComponent 后缓存——同一名称只 resolve/加载一次，
 * 选项卡反复关闭再打开不会重复发起加载。 */

const componentCache = new Map<string, Component>();

function getComponent(name: string): Component | null {
  if (!name) return null;
  if (!componentCache.has(name)) {
    const resolved = props.resolveComponent(name);
    componentCache.set(
      name,
      resolved instanceof Promise ? defineAsyncComponent(() => resolved) : resolved,
    );
  }
  return componentCache.get(name) ?? null;
}

/* ---------------- 功能树加载与初始选项卡 ---------------- */

/** defaultActive 仅在首次功能树加载完成后应用一次（后续 nodesFunc 重载不再重复打开） */
let defaultApplied = false;

async function loadNodes(): Promise<void> {
  menuLoading.value = true;
  try {
    nodes.value = await props.nodesFunc();
    if (!defaultApplied && props.defaultActive) {
      const node = findNode(nodes.value, props.defaultActive);
      if (node && !isGroup(node)) openTab(node);
      defaultApplied = true;
    }
  } finally {
    menuLoading.value = false;
  }
}

onMounted(() => {
  void loadNodes();
});

// nodesFunc 变化时重新加载功能树（已打开选项卡保留，key 命中的仍可继续激活）
watch(
  () => props.nodesFunc,
  () => {
    void loadNodes();
  },
);
</script>

<template>
  <div class="ys-main-panel">
    <!-- 左侧功能树：内置折叠按钮（折叠后仅显示 icon，分组经悬浮 popup 逐级展开） -->
    <aside class="ys-main-panel__aside" :class="{ 'is-collapsed': menuCollapsed }">
      <div class="ys-main-panel__aside-header">
        <button class="ys-main-panel__collapse-btn" type="button"
          :title="menuCollapsed ? '展开菜单' : '折叠菜单'"
          @click="menuCollapsed = !menuCollapsed">☰</button>
      </div>
      <el-menu :default-active="activeKey" :collapse="menuCollapsed" class="ys-main-panel__menu"
        v-loading="menuLoading" element-loading-background="transparent"
        @select="handleMenuSelect">
        <main-panel-menu-node v-for="node in nodes" :key="node.key" :node="node" />
      </el-menu>
    </aside>

    <!-- 右侧主面板：选项卡；已打开选项卡的组件保持挂载，切换不丢状态 -->
    <main class="ys-main-panel__main">
      <el-tabs v-if="openTabs.length > 0" v-model="activeKey" type="card" closable
        class="ys-main-panel__tabs" @tab-remove="removeTab">
        <el-tab-pane v-for="tab in openTabs" :key="tab.key" :name="tab.key">
          <template #label>{{ tab.label }}</template>
          <component v-if="tab.componentName" :is="getComponent(tab.componentName)"
            v-bind="tab.props" />
        </el-tab-pane>
      </el-tabs>
      <div v-else class="ys-main-panel__empty">
        <el-empty description="暂无打开的功能，从左侧菜单选择" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.ys-main-panel {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--el-bg-color, #fff);
}

/* ---------------- 左侧功能树 ---------------- */
.ys-main-panel__aside {
  display: flex;
  flex-direction: column;
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color-light, #e4e7ed);
  overflow-y: auto;
  transition: width 0.25s;
}

/* 折叠态：侧栏收窄到 64px（与 el-menu--collapse 内置宽度一致） */
.ys-main-panel__aside.is-collapsed {
  width: 64px;
}

.ys-main-panel__aside-header {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-start;
  padding: 8px;
}

.ys-main-panel__aside.is-collapsed .ys-main-panel__aside-header {
  justify-content: center;
  padding: 8px 0;
}

.ys-main-panel__collapse-btn {
  border: none;
  background: transparent;
  color: var(--el-text-color-regular, #606266);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.ys-main-panel__collapse-btn:hover {
  background: var(--el-fill-color, #f0f2f5);
}

.ys-main-panel__menu {
  border-right: none;
  width: 100%;
  flex: 1;
}

/* emoji 图标 / 文字（menuNode 子组件内渲染，经 :deep 命中） */
.ys-main-panel__menu :deep(.ys-main-panel__menu-icon) {
  font-style: normal;
  font-size: 16px;
  margin-right: 8px;
}

/* 折叠态：隐藏文字、图标居中。popup 弹层 teleport 到 body 之外，
   不在本组件 DOM 子树内，折叠隐藏样式不会波及 popup 中的文字 */
.ys-main-panel__aside.is-collapsed .ys-main-panel__menu :deep(.ys-main-panel__menu-text) {
  display: none;
}

.ys-main-panel__aside.is-collapsed .ys-main-panel__menu :deep(.ys-main-panel__menu-icon) {
  margin-right: 0;
}

.ys-main-panel__aside.is-collapsed .ys-main-panel__menu :deep(.el-menu-item),
.ys-main-panel__aside.is-collapsed .ys-main-panel__menu :deep(.el-sub-menu__title) {
  justify-content: center;
  padding: 0 !important;
}

/* ---------------- 右侧主面板 ---------------- */
.ys-main-panel__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--el-fill-color-lighter, #f5f7fa);
}

/* 选项卡占满主面板，内容区滚动 */
.ys-main-panel__main :deep(.el-tabs) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.ys-main-panel__main :deep(.el-tabs__header) {
  background: var(--el-bg-color, #fff);
  margin-bottom: 0;
}

.ys-main-panel__main :deep(.el-tabs__content) {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.ys-main-panel__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
