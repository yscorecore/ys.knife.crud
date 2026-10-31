import { useState } from "react";
import { Button, Input } from "antd";
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

export interface AdminExternalSearchPageProps {
  onBack: () => void;
}

/** 面板组件注册表：与 AdminLayoutPage 相同的显式 componentMap */
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
 * YsMainPanel 外置功能搜索 demo：
 * showMenuSearch=false 关闭侧栏内置搜索框，搜索入口由页面外部自行实现，
 * 经 menuKeyword + onUpdateMenuKeyword 受控——外部输入驱动功能树过滤，
 * 组件内部折叠侧栏等行为不受影响。功能树数据与面板映射复用 adminDemoMenu。
 */
export default function AdminExternalSearchPage({ onBack }: AdminExternalSearchPageProps) {
  /** 外部受控的搜索关键词：受控同步给 YsMainPanel */
  const [keyword, setKeyword] = useState("");

  return (
    <main style={{ maxWidth: 1200, margin: "24px auto", padding: 24 }}>
      <Button type="link" style={{ padding: 0 }} onClick={onBack}>
        ← 返回导航
      </Button>
      <h1 style={{ margin: "16px 0 8px" }}>主面板外置功能搜索（showMenuSearch=false + 受控关键词）</h1>
      <p style={{ color: "#666", fontSize: "0.92em", lineHeight: 1.6, margin: "8px 0 16px" }}>
        侧栏内置搜索框已用 showMenuSearch=false 关闭，搜索入口放在外部工具栏：
        输入关键词经 menuKeyword / onUpdateMenuKeyword 受控驱动菜单过滤（叶子名称模糊匹配、
        祖先分组自动展开、无结果提示，与内置搜索同一套逻辑）。也可以由外部代码直接写关键词，
        例如点下面的快捷词；点「清空」或输入框 × 复位为完整功能树。
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "min(720px, calc(100vh - 320px))",
          minHeight: 520,
          border: "1px solid #dcdfe6",
          borderRadius: 8,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        {/* 外部搜索工具栏：替代内置搜索框的自定义入口 */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderBottom: "1px solid #e4e7ed",
            background: "#f5f7fa",
          }}
        >
          <Input
            allowClear
            placeholder="外部搜索功能，如：管理 / 文章"
            aria-label="外部功能搜索"
            style={{ width: 260 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Button size="small" onClick={() => setKeyword("管理")}>
            快捷词：管理
          </Button>
          <Button size="small" onClick={() => setKeyword("")}>
            清空
          </Button>
          <span style={{ marginLeft: "auto", color: "#909399", fontSize: "0.88em" }}>
            当前关键词：{keyword || "（空）"}
          </span>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <YsMainPanel
            nodesFunc={loadDemoMenuNodes}
            componentMap={componentMap}
            showMenuSearch={false}
            menuKeyword={keyword}
            onUpdateMenuKeyword={setKeyword}
          />
        </div>
      </div>
    </main>
  );
}
