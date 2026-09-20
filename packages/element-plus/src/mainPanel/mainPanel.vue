<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
  watch,
  type PropType,
} from "vue";
import type {
  FunctionNodesFunc,
  MainPanelComponentMap,
} from "@ys.knife.crud/core";
import {
  collectGroupKeys,
  filterNodesByKeyword,
  findNode,
  isGroupNode,
  useMainPanelNodes,
  useMainPanelTabs,
} from "@ys.knife.crud/vue";
import MainPanelMenuNode from "./mainPanelMenuNode.vue";

// 组件名统一带 ys 前缀：模板中以 <ys-main-panel>（或 <YsMainPanel>）使用，
// 同时保证全局注册（app.component）、递归组件与 devtools 中名称稳定。
defineOptions({ name: "YsMainPanel" });

/**
 * YsMainPanel：左侧功能树 + 右侧主面板选项卡的管理后台布局骨架。
 * 通用逻辑（功能树加载、选项卡状态、组件解析缓存）全部下沉到
 * @ys.knife.crud/vue 的 useMainPanelNodes / useMainPanelTabs，本组件只负责
 * el-menu / el-tabs 视图编排与折叠态。
 *
 * - nodesFunc：功能树数据加载函数（异步返回 FunctionNode[]，数据可来自后端接口）；
 *   children 非空为分组、否则为叶子。变化时 composable 自动重新加载
 * - 叶子节点的 component 字段约定为组件路径字符串（如 "./admin-panels/DashboardPanel.vue"）；
 *   组件解析所需的「路径 → 异步加载器」映射由 componentMap prop 提供（消费方经
 *   import.meta.glob 生成，key 即路径字符串）
 * - 点击叶子在主面板打开选项卡（已打开则仅激活、不重复创建），选项卡可关闭；
 *   已打开选项卡的组件保持挂载，切换时不丢失内部状态
 */
const props = defineProps({
  /** 功能树数据加载函数：异步返回功能树节点数组 */
  nodesFunc: { type: Function as PropType<FunctionNodesFunc>, required: true },
  /**
   * 组件路径 → 异步加载器的映射，由消费方经 import.meta.glob 生成，例如：
   *   const panels = import.meta.glob("./admin-panels/*.vue");
   * 叶子节点的 component 字段取值须与该映射的 key 一致（如 "./admin-panels/DashboardPanel.vue"）。
   * 未提供时回退为运行时动态 import（仅 dev 可用，生产构建无法解析）。
   */
  componentMap: {
    type: Object as PropType<MainPanelComponentMap>,
    default: undefined,
  },
  /** 初始打开并激活的叶子节点 key（功能树加载完成后应用，仅首次生效），默认不打开任何选项卡 */
  defaultActive: { type: String, default: "" },
  /** 是否渲染侧栏顶部内置的功能搜索框（默认 true）；false 时外部可自行实现并绑定 v-model:menu-keyword */
  showMenuSearch: { type: Boolean, default: true },
  /** 功能搜索关键词（受控）：与 update:menuKeyword 配合支持 v-model:menu-keyword */
  menuKeyword: { type: String, default: "" },
});

const emit = defineEmits<{
  (e: "update:menuKeyword", value: string): void;
}>();

/* ---------------- 菜单折叠（视图层内部状态，非受控） ---------------- */

const menuCollapsed = ref(false);

/* ---------------- 功能搜索（内置 UI 可关；关键词 v-model 受控，单一数据源） ---------------- */

/** 未绑定时的内部关键词：prop 变化同步进来，输入时同时写内部值并派发 update 事件，
 *  保证「未绑定 v-model 也能用」与「外部受控」两条路径一致 */
const innerKeyword = ref(props.menuKeyword);
watch(
  () => props.menuKeyword,
  (v) => {
    innerKeyword.value = v;
  },
);
const menuSearchKeyword = computed({
  get: () => innerKeyword.value,
  set: (v) => {
    innerKeyword.value = v;
    emit("update:menuKeyword", v);
  },
});

/** 是否处于搜索态（trim 后非空） */
const searching = computed(() => menuSearchKeyword.value.trim().length > 0);
/** 搜索过滤后的功能树（命中叶子 + 祖先分组链） */
const filteredNodes = computed(() => filterNodesByKeyword(nodes.value, menuSearchKeyword.value));
/** 过滤树中的全部分组 key：搜索态菜单挂载时作为 default-openeds 一次性展开 */
const filteredGroupKeys = computed(() => collectGroupKeys(filteredNodes.value));

/* ---------------- 功能树加载（useMainPanelNodes） ---------------- */

const { nodes, menuLoading, loadNodes } = useMainPanelNodes(props);

/* ---------------- 选项卡状态与组件解析（useMainPanelTabs） ---------------- */

const { openTabs, activeKey, openTab, removeTab, getComponent } = useMainPanelTabs(props);

/** 功能树叶子被点击（el-menu select 只会由叶子触发） */
function handleMenuSelect(key: string): void {
  const node = findNode(nodes.value, key);
  if (node && !isGroupNode(node)) openTab(node);
}

/* ---------------- 初始选项卡 ---------------- */

/** defaultActive 仅在首次功能树加载完成后应用一次（后续 nodesFunc 重载不再重复打开） */
let defaultApplied = false;

onMounted(async () => {
  await loadNodes();
  if (!defaultApplied && props.defaultActive) {
    const node = findNode(nodes.value, props.defaultActive);
    if (node && !isGroupNode(node)) openTab(node);
    defaultApplied = true;
  }
});
</script>

<template>
  <div class="ys-main-panel">
    <!-- 左侧功能树：内置折叠按钮（折叠后仅显示 icon，分组经悬浮 popup 逐级展开） -->
    <aside class="ys-main-panel__aside" :class="{ 'is-collapsed': menuCollapsed }">
      <!-- 顶部行：折叠按钮 + 功能搜索框同一行，搜索框不单独占高、不挤压菜单；
           折叠到 64px 时无空间自动隐藏，showMenuSearch=false 时由外部自行实现入口 -->
      <div class="ys-main-panel__aside-header">
        <button class="ys-main-panel__collapse-btn" type="button"
          :title="menuCollapsed ? '展开菜单' : '折叠菜单'"
          @click="menuCollapsed = !menuCollapsed">☰</button>
        <el-input v-if="props.showMenuSearch && !menuCollapsed" v-model="menuSearchKeyword"
          class="ys-main-panel__aside-search" size="small" clearable placeholder="搜索功能"
          aria-label="搜索功能">
          <template #prefix>
            <svg class="ys-main-panel__search-icon" viewBox="0 0 1024 1024" width="14" height="14"
              aria-hidden="true">
              <path fill="currentColor"
                d="M909.098 839.904l-181.22-181.248a341.5 341.5 0 1 0-47.734 48.58l180.56 180.588a33.92 0 0 0 48.394-47.92zM454.4 745.6a291.2 291.2 0 1 1 291.2-291.2 291.2 291.2 0 0 1-291.2 291.2z" />
            </svg>
          </template>
        </el-input>
      </div>
      <!-- 搜索态：渲染过滤树，:key 含关键词使菜单按关键词重挂载，
           default-openeds 命中分组一次性全部展开（default-openeds 仅在挂载时生效） -->
      <el-menu v-if="searching" :key="'search-' + menuSearchKeyword" :default-active="activeKey"
        :default-openeds="filteredGroupKeys" :collapse="menuCollapsed" class="ys-main-panel__menu"
        v-loading="menuLoading" element-loading-background="transparent"
        @select="handleMenuSelect">
        <main-panel-menu-node v-for="node in filteredNodes" :key="node.key" :node="node" />
        <div v-if="filteredNodes.length === 0 && !menuLoading" class="ys-main-panel__menu-empty">
          未找到匹配的功能
        </div>
      </el-menu>
      <!-- 普通态：完整功能树，展开状态由 el-menu 内部维护 -->
      <el-menu v-else :default-active="activeKey" :collapse="menuCollapsed" class="ys-main-panel__menu"
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
          <component v-if="tab.componentPath" :is="getComponent(tab.componentPath)"
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
  align-items: center;
  gap: 8px;
  padding: 8px;
}

/* 功能搜索框：与折叠按钮同处顶部一行，填满剩余宽度，不额外占行高 */
.ys-main-panel__aside-search {
  flex: 1;
  min-width: 0;
}

.ys-main-panel__search-icon {
  color: var(--el-text-color-placeholder, #a8abb2);
}

/* 搜索无结果提示 */
.ys-main-panel__menu-empty {
  padding: 12px;
  text-align: center;
  color: var(--el-text-color-placeholder, #a8abb2);
  font-size: 0.88em;
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
