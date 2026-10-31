import { Button } from "antd";
import type { ReactNode } from "react";

/**
 * 演示页面通用布局：返回导航按钮 + 标题 + 说明 + 可选工具栏 + 页面主体。
 * 各演示页只关心自己的数据与表格配置，统一的页面骨架收敛在这里（单一来源）。
 */
export interface DemoPageLayoutProps {
  title: string;
  hint: ReactNode;
  onBack: () => void;
  toolbar?: ReactNode;
  children?: ReactNode;
}

export function DemoPageLayout({ title, hint, onBack, toolbar, children }: DemoPageLayoutProps) {
  return (
    <main style={{ maxWidth: 860, margin: "32px auto", padding: 24 }}>
      <Button type="link" style={{ padding: 0 }} onClick={onBack}>
        ← 返回导航
      </Button>

      <h1 style={{ margin: "16px 0 8px" }}>{title}</h1>
      <p style={{ color: "#666", fontSize: "0.92em", lineHeight: 1.6, marginBottom: 16 }}>
        {hint}
      </p>

      {toolbar != null ? (
        <div
          style={{
            // 横向工具行：按钮 / 单选组 / 开关等控件垂直居中对齐，避免内联基线错位
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 12,
          }}
        >
          {toolbar}
        </div>
      ) : null}

      {children}
    </main>
  );
}

export default DemoPageLayout;
