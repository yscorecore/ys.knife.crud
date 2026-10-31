import { Button } from "antd";
import type { MainPanelComponentMap } from "@ys-knife-crud/core";
import { YsMainPanel } from "@ys-knife-crud/antd";
import { loadDemoMenuNodes } from "./adminDemoMenu";
import DashboardPanel from "./admin-panels/DashboardPanel";
import UsersPanel from "./admin-panels/UsersPanel";
import OrdersPanel from "./admin-panels/OrdersPanel";
import SettingsPanel from "./admin-panels/SettingsPanel";
import LogsPanel from "./admin-panels/LogsPanel";
import ArticleListPanel from "./admin-panels/ArticleListPanel";
import ArticleCategoryPanel from "./admin-panels/ArticleCategoryPanel";

export interface AdminLayoutPageProps {
  onBack: () => void;
}

/**
 * 面板组件注册表：显式把组件路径（与 FunctionNode.component 取值一致）
 * 映射到异步加载器，交给 YsMainPanel 内部 React.lazy 渲染。
 */
const componentMap: MainPanelComponentMap = {
  "./admin-panels/DashboardPanel.tsx": () => Promise.resolve({ default: DashboardPanel }),
  "./admin-panels/UsersPanel.tsx": () => Promise.resolve({ default: UsersPanel }),
  "./admin-panels/OrdersPanel.tsx": () => Promise.resolve({ default: OrdersPanel }),
  "./admin-panels/SettingsPanel.tsx": () => Promise.resolve({ default: SettingsPanel }),
  "./admin-panels/LogsPanel.tsx": () => Promise.resolve({ default: LogsPanel }),
  "./admin-panels/ArticleListPanel.tsx": () => Promise.resolve({ default: ArticleListPanel }),
  "./admin-panels/ArticleCategoryPanel.tsx": () => Promise.resolve({ default: ArticleCategoryPanel }),
};

/**
 * YsMainPanel 测试页：仅聚焦左侧功能树 + 右侧主面板选项卡。
 * 功能树数据（FunctionNode 树，经 nodesFunc 异步返回）由共享的 adminDemoMenu 提供，
 * 叶子节点的 component 约定为组件路径字符串，经 componentMap 映射到面板组件，
 * 由组件内部动态加载并显示在主面板选项卡中（可关闭、去重激活）。
 */
export default function AdminLayoutPage({ onBack }: AdminLayoutPageProps) {
  return (
    <main style={{ maxWidth: 1200, margin: "24px auto", padding: 24 }}>
      <Button type="link" style={{ padding: 0 }} onClick={onBack}>
        ← 返回导航
      </Button>
      <h1 style={{ margin: "16px 0 8px" }}>管理系统布局（功能树 + 主面板选项卡）</h1>
      <p style={{ color: "#666", fontSize: "0.92em", lineHeight: 1.6, margin: "8px 0 16px" }}>
        本页用于测试 YsMainPanel：功能树数据（FunctionNode 树）经 nodesFunc 异步加载，
        叶子节点的 component 约定为组件路径字符串（如
        「./admin-panels/DashboardPanel.tsx」）、props 声明透传给面板组件的参数
        （如参数设置面板的标题与提示开关），点击后由 YsMainPanel 经 componentMap
        加载对应面板组件并显示在主面板选项卡中（已打开则直接激活、可关闭；
        侧栏内置 ☰ 折叠按钮，折叠后仅显示图标、分组悬浮弹出）。
        侧栏顶部内置功能搜索框：对叶子名称做大小写不敏感的模糊匹配（多个词以空格分隔需同时命中），
        命中项的祖先分组自动展开，无结果显示提示；折叠侧栏时搜索框隐藏。
        面板中的 YsTable 支持拖动表头列边界调整列宽（经 localStorage 持久化）与勾选。
      </p>

      {/* YsMainPanel（功能树 + 主面板选项卡） */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "min(720px, calc(100vh - 260px))",
          minHeight: 520,
          border: "1px solid #dcdfe6",
          borderRadius: 8,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div style={{ flex: 1, minHeight: 0 }}>
          <YsMainPanel
            nodesFunc={loadDemoMenuNodes}
            componentMap={componentMap}
            defaultActive="dashboard"
          />
        </div>
      </div>
    </main>
  );
}
