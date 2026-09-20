<script setup lang="ts">
/**
 * YsMainPanel 测试页：仅聚焦左侧功能树 + 右侧主面板选项卡。
 * 功能树数据（FunctionNode 树，经 nodesFunc 异步返回）由本页提供，叶子节点的 component
 * 约定为组件路径字符串（相对于本文件，如 "./admin-panels/DashboardPanel.vue"）；经
 * import.meta.glob 收集同目录下的面板组件生成 componentMap 传给 YsMainPanel，由组件内部
 * 动态加载并显示在主面板选项卡中（可关闭、去重激活）。
 */
import type { FunctionNode } from "@ys.knife.crud/core";
import { YsMainPanel } from "@ys.knife.crud/element-plus";

defineEmits<{
  (e: "back"): void;
}>();

// ---------------- 面板组件注册表：import.meta.glob 收集 admin-panels 下全部 .vue ----------------
// key 为相对本文件的路径（与 FunctionNode.component 取值一致），value 为异步加载器
const panelModules = import.meta.glob("./admin-panels/*.vue");

// ---------------- 功能树数据（nodesFunc 异步返回，可替换为后端接口） ----------------
const menuNodes: FunctionNode[] = [
  { key: "dashboard", label: "首页", icon: "🏠", component: "./admin-panels/DashboardPanel.vue" },
  { key: "users", label: "用户管理", icon: "👥", component: "./admin-panels/UsersPanel.vue" },
  { key: "orders", label: "订单管理", icon: "📦", component: "./admin-panels/OrdersPanel.vue" },
  {
    key: "system",
    label: "系统管理",
    icon: "🛠",
    children: [
      { key: "settings", label: "参数设置", component: "./admin-panels/SettingsPanel.vue",
        props: { title: "系统参数", showTip: true } },
      { key: "logs", label: "操作日志", component: "./admin-panels/LogsPanel.vue" },
    ],
  },
  {
    key: "content",
    label: "内容管理",
    icon: "🧩",
    children: [
      {
        key: "content-post",
        label: "文章管理",
        children: [
          { key: "article-list", label: "文章列表", component: "./admin-panels/ArticleListPanel.vue" },
          { key: "article-category", label: "分类管理", component: "./admin-panels/ArticleCategoryPanel.vue" },
        ],
      },
    ],
  },
];

/** 功能树数据加载函数（模拟接口延迟后返回，演示加载遮罩） */
async function loadNodes(): Promise<FunctionNode[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return menuNodes;
}
</script>

<template>
  <div class="admin-demo">
    <el-button link type="primary" @click="$emit('back')">&larr; 返回导航</el-button>
    <h1>管理系统布局（功能树 + 主面板选项卡）</h1>
    <p class="admin-demo__hint">
      本页用于测试 YsMainPanel：功能树数据（FunctionNode 树）经 nodes-func 异步加载，
      叶子节点的 component 约定为组件路径字符串（如 "./admin-panels/DashboardPanel.vue"）、
      props 声明透传给面板组件的参数（如参数设置面板的标题与提示开关），点击后由 YsMainPanel
      内部动态 import 加载对应面板组件并显示在主面板选项卡中（已打开则直接激活、可关闭；
      侧栏内置 ☰ 折叠按钮，折叠后仅显示图标、分组悬浮弹出）。
      面板中的 YsTable 支持拖动表头列边界调整列宽（经 localStorage 持久化）与勾选。
    </p>

    <div class="admin">
      <!-- YsMainPanel（功能树 + 主面板选项卡） -->
      <div class="admin__body">
        <ys-main-panel :nodes-func="loadNodes" :component-map="panelModules"
          default-active="dashboard" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-demo__hint {
  color: #666;
  font-size: 0.92em;
  line-height: 1.6;
  margin: 8px 0 16px;
}

h1 {
  margin: 16px 0 8px;
}

/* ---------------- YsMainPanel 容器 ---------------- */
.admin {
  display: flex;
  flex-direction: column;
  height: min(720px, calc(100vh - 260px));
  min-height: 520px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-bg-color, #fff);
}

.admin__body {
  flex: 1;
  min-height: 0;
}
</style>
