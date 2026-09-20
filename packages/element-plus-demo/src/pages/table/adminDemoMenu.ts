import type { FunctionNode } from "@ys.knife.crud/core";

/**
 * 主面板 demo 共用的功能树数据与加载函数。
 * 叶子节点的 component 为相对于使用方页面的路径（页面均位于 pages/table/，
 * 故 import.meta.glob("./admin-panels/*.vue") 对每个页面解析一致）。
 */
export const demoMenuNodes: FunctionNode[] = [
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
export async function loadDemoMenuNodes(): Promise<FunctionNode[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return demoMenuNodes;
}
