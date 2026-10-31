import { useState } from "react";
import { Button } from "antd";
import { demoPages, type DemoPageId } from "./demoPages";

// 轻量导航：home（导航页）+ demoPages 注册表中的各演示页。
// 新增 demo 页只需在 demoPages.tsx 注册，这里无需改动。
type Page = "home" | DemoPageId;

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");

  const current =
    currentPage === "home"
      ? undefined
      : demoPages.find((page) => page.id === currentPage);

  // 非首页时从注册表解析对应组件；所有演示页统一接收 onBack 回调
  if (current) {
    const PageComponent = current.component;
    return <PageComponent onBack={() => setCurrentPage("home")} />;
  }

  return (
    <main style={{ maxWidth: 860, margin: "48px auto", padding: 24 }}>
      <h1>antd-demo</h1>
      <p style={{ color: "#666", lineHeight: 1.7 }}>
        用于验证 <code>@ys-knife-crud/antd</code> 组件库的本地演示项目。
        此包标记为 <code>private</code>，不会发布到 npm。
      </p>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ margin: "0 0 8px" }}>Demo 导航</h2>
        <p style={{ color: "#666", fontSize: "0.92em" }}>
          选择一个 Demo 进入对应的演示页面。
        </p>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          {demoPages.map((page) => (
            <Button
              key={page.id}
              type="primary"
              size="large"
              onClick={() => setCurrentPage(page.id)}
            >
              {page.label}
            </Button>
          ))}
        </div>
      </section>
    </main>
  );
}
