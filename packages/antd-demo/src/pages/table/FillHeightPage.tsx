import { useState } from "react";
import { Button, Radio } from "antd";
import { listData, type ViewMode } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import { exportRows, metaFun } from "../../shared/demoData";

export interface FillHeightPageProps {
  onBack: () => void;
}

// 200 行数据：pageSize=20 → 10 页，每页 20 行在固定高度内超出产生滚动条
const dataFun = listData(() => Promise.resolve(exportRows.slice(0, 200)));

/**
 * YsTable 不接收 style/className prop，「占满父容器高度」需让组件根节点 .yk-table
 * 拿到 height: 100%（其内部已是 flex 纵向 + 内容区 overflow:auto）。
 * 这里用页内 style 标签的后代选择器实现，不改动 antd 包。
 */
const fillHeightStyle = `
.antd-fill-height-page__body > .yk-table {
  height: 100%;
}
`;

const codeStyle = {
  background: "#eef2f7",
  padding: "1px 6px",
  borderRadius: 4,
  fontSize: "0.9em",
} as const;

export default function FillHeightPage({ onBack }: FillHeightPageProps) {
  // 视图切换入口由外部 radio 驱动（受控 viewMode）
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  return (
    <div
      style={{
        // 整页撑满视口：flex 纵向，头部固定，body 撑满剩余
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "16px 24px",
        boxSizing: "border-box",
      }}
    >
      <style>{fillHeightStyle}</style>

      <header style={{ flexShrink: 0 }}>
        <Button type="link" style={{ padding: 0 }} onClick={onBack}>
          ← 返回导航
        </Button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            margin: "8px 0",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18 }}>占满容器高度（内容滚动 + 分页固定）</h1>
          <Radio.Group
            size="small"
            value={viewMode}
            optionType="button"
            buttonStyle="solid"
            onChange={(event) => setViewMode(event.target.value as ViewMode)}
          >
            <Radio.Button value="table">表格</Radio.Button>
            <Radio.Button value="card">卡片</Radio.Button>
            <Radio.Button value="list">列表</Radio.Button>
          </Radio.Group>
        </div>
        <p style={{ margin: "0 0 12px", color: "#666", fontSize: "0.92em", lineHeight: 1.6 }}>
          YsTable 占满父容器高度：表格/卡片/列表内容区超出时出现滚动条， 底部分页导航始终固定可见不被滚走。开启{" "}
          <code style={codeStyle}>stickyHeader</code> 后，表格视图滚动时列头锁定在顶部。
          切换三种视图对比滚动行为。200 行数据 / 每页 20 条 = 10 页。
        </p>
      </header>

      <div
        className="antd-fill-height-page__body"
        style={{
          // body 撑满剩余高度；minHeight:0 允许 flex 子项收缩，YsTable 才能拿到确定高度
          flex: 1,
          minHeight: 0,
        }}
      >
        <YsTable
          metaFun={metaFun}
          dataFun={dataFun}
          viewMode={viewMode}
          onUpdateViewMode={setViewMode}
          pageSize={20}
          showCheckbox
          stickyHeader
        />
      </div>
    </div>
  );
}
