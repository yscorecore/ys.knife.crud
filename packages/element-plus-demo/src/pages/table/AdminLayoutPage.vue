<script setup lang="ts">
/**
 * 管理系统布局演示：顶栏（logo / 消息 / 设置 / 登出）+ YsMainPanel（功能树 + 主面板选项卡）。
 * 左侧功能树数据（FunctionNode 树，经 nodesFunc 异步返回）与「组件类型名称 → 面板组件」的
 * 解析函数由本页提供，叶子节点以动态 import 异步加载对应面板组件，点击后在主面板以选项卡
 * 打开（可关闭、去重激活）。
 */
import { ref, type Component } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { FunctionNode } from "@ys.knife.crud/core";
import { YsMainPanel } from "@ys.knife.crud/element-plus";

const emit = defineEmits<{
  (e: "back"): void;
}>();

// ---------------- 功能树数据（nodesFunc 异步返回，可替换为后端接口） ----------------
const menuNodes: FunctionNode[] = [
  { key: "dashboard", label: "首页", icon: "🏠", component: "dashboard" },
  { key: "users", label: "用户管理", icon: "👥", component: "users" },
  { key: "orders", label: "订单管理", icon: "📦", component: "orders" },
  {
    key: "system",
    label: "系统管理",
    icon: "🛠",
    children: [
      { key: "settings", label: "参数设置", component: "settings",
        props: { title: "系统参数", showTip: true } },
      { key: "logs", label: "操作日志", component: "logs" },
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
          { key: "article-list", label: "文章列表", component: "article-list" },
          { key: "article-category", label: "分类管理", component: "article-category" },
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

// ---------------- 面板组件解析：组件类型名称 → 动态 import 异步加载 ----------------
const panelLoaders: Record<string, () => Promise<{ default: Component }>> = {
  dashboard: () => import("./admin-panels/DashboardPanel.vue"),
  users: () => import("./admin-panels/UsersPanel.vue"),
  orders: () => import("./admin-panels/OrdersPanel.vue"),
  settings: () => import("./admin-panels/SettingsPanel.vue"),
  logs: () => import("./admin-panels/LogsPanel.vue"),
  "article-list": () => import("./admin-panels/ArticleListPanel.vue"),
  "article-category": () => import("./admin-panels/ArticleCategoryPanel.vue"),
};

async function resolvePanel(name: string): Promise<Component> {
  const loader = panelLoaders[name];
  if (!loader) throw new Error(`未注册的面板组件：${name}`);
  return (await loader()).default;
}

// ---------------- 顶栏：消息 / 设置 / 登出 ----------------
const msgDrawer = ref(false);
const cfgDrawer = ref(false);
const cfg = ref({ autoReload: true, notify: true });

const messages = [
  { title: "系统通知", content: "v2.0 版本已发布，新增列表视图与 #loading 插槽。", time: "10:24" },
  { title: "审批提醒", content: "您有 1 条订单审批待处理。", time: "09:31" },
  { title: "安全提醒", content: "您的账号于今日在新的设备上登录。", time: "昨天" },
];

function logout(): void {
  ElMessageBox.confirm("确定要退出登录吗？", "提示", {
    type: "warning",
    confirmButtonText: "退出",
    cancelButtonText: "取消",
  })
    .then(() => {
      ElMessage.success("已退出登录");
      emit("back");
    })
    .catch(() => {
      // 用户取消：不做任何事
    });
}
</script>

<template>
  <div class="admin-demo">
    <el-button link type="primary" @click="$emit('back')">&larr; 返回导航</el-button>
    <h1>管理系统布局（功能树 + 主面板选项卡）</h1>
    <p class="admin-demo__hint">
      左右面板由 YsMainPanel 组件渲染：功能树数据（FunctionNode 树）经 nodes-func 异步加载，
      叶子节点的 component 指定组件类型名称、props 声明透传给面板组件的参数（如参数设置面板的
      标题与提示开关），点击后经 resolveComponent 动态 import 加载对应面板组件并显示在主面板
      选项卡中（已打开则直接激活、可关闭；侧栏内置 ☰ 折叠按钮，折叠后仅显示图标、分组悬浮弹出）。
      顶栏提供消息中心、设置抽屉与登出（登出确认后返回导航页）。面板中的 YsTable 支持拖动表头
      列边界调整列宽（经 localStorage 持久化）与勾选。
    </p>

    <div class="admin">
      <!-- 顶栏：logo + 消息 / 设置 / 登出 -->
      <header class="admin__header">
        <div class="admin__logo"><span class="admin__logo-mark">🔪</span>YS Knife 管理系统</div>
        <div class="admin__actions">
          <el-badge :value="messages.length" class="admin__badge">
            <button class="admin__icon-btn" title="消息中心" @click="msgDrawer = true">🔔</button>
          </el-badge>
          <button class="admin__icon-btn" title="设置" @click="cfgDrawer = true">⚙️</button>
          <el-divider direction="vertical" />
          <el-button size="small" plain @click="logout">登出</el-button>
        </div>
      </header>

      <!-- 左右面板：YsMainPanel（功能树 + 主面板选项卡） -->
      <div class="admin__body">
        <ys-main-panel :nodes-func="loadNodes" :resolve-component="resolvePanel"
          default-active="dashboard" />
      </div>
    </div>

    <!-- 消息中心抽屉 -->
    <el-drawer v-model="msgDrawer" title="🔔 消息中心" size="360px">
      <div v-for="(msg, i) in messages" :key="i" class="admin-msg">
        <div class="admin-msg__title">{{ msg.title }}</div>
        <div class="admin-msg__content">{{ msg.content }}</div>
        <div class="admin-msg__time">{{ msg.time }}</div>
      </div>
    </el-drawer>

    <!-- 设置抽屉 -->
    <el-drawer v-model="cfgDrawer" title="⚙️ 设置" size="360px">
      <el-form label-position="top">
        <el-form-item label="夜间模式">
          <el-switch v-model="cfg.notify" />
        </el-form-item>
        <el-form-item label="桌面通知">
          <el-switch v-model="cfg.autoReload" />
        </el-form-item>
        <el-form-item label="界面语言">
          <el-input model-value="简体中文" disabled />
        </el-form-item>
      </el-form>
    </el-drawer>
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

/* ---------------- 管理布局骨架（顶栏 + YsMainPanel） ---------------- */
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

.admin__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background: #1d2b3a;
  color: #fff;
  flex-shrink: 0;
}

.admin__logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
}

.admin__logo-mark {
  font-size: 20px;
}

.admin__actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.admin__badge {
  display: flex;
}

.admin__icon-btn {
  border: none;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.admin__icon-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.admin__body {
  flex: 1;
  min-height: 0;
}

/* ---------------- 消息中心 ---------------- */
.admin-msg {
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 6px;
  margin-bottom: 12px;
}

.admin-msg__title {
  font-weight: 600;
  margin-bottom: 4px;
}

.admin-msg__content {
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
}

.admin-msg__time {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}
</style>
