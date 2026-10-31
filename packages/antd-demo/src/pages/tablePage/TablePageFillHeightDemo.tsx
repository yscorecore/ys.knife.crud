import { useState } from "react";
import { Button, Radio } from "antd";
import { constData, Operator, type ViewMode } from "@ys-knife-crud/core";
import {
  type TablePageDataFun,
  YsTablePage,
  YsTextFilterItem,
} from "@ys-knife-crud/antd";
import { metaFun, type UserRow } from "../../shared/demoData";

export interface TablePageFillHeightDemoProps {
  onBack: () => void;
}

// 200 行数据：pageSize=20 → 10 页，每页 20 行在固定高度内超出产生滚动条
const fillRows: UserRow[] = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  name: `FillUser${i + 1}`,
  email: `fill${i + 1}@example.com`,
  age: 20 + (i % 40),
  secret: `f${i + 1}`,
}));

/**
 * 解析单条件 FilterInfo.toString()（`name contains "VALUE"`）中的 contains 值，
 * 在前端按姓名片段过滤。真实项目里 dataFun 通常把 filter 透传给后端。
 * 注意：FilterInfo 的右值是 Constant，其 toString 用 JSON.stringify 包裹
 * （字符串值会带双引号），这里用 JSON.parse 反解一次还原原始值。
 */
function extractContains(s: string): string {
  const m = /contains\s+(.+)$/i.exec(s);
  const raw = m?.[1]?.trim() ?? "";
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : raw;
  } catch {
    return raw;
  }
}

const dataFun: TablePageDataFun = (req, filter, signal) => {
  const rows = filter.isEmpty()
    ? fillRows
    : fillRows.filter((r) => r.name.includes(extractContains(filter.toString())));
  return constData(rows)(req, signal);
};

const codeStyle = {
  background: "#eef2f7",
  padding: "1px 6px",
  borderRadius: 4,
  fontSize: "0.9em",
} as const;

/**
 * YsTablePage 占满高度：整页 100vh 撑满视口，组件占满剩余高度——
 * 顶部查询面板、命令栏固定不滚，表格/卡片/列表内容区超出时出现滚动条，
 * 底部分页导航始终固定可见。视图切换入口由外部 Radio.Group 受控驱动。
 */
export default function TablePageFillHeightDemo({ onBack }: TablePageFillHeightDemoProps) {
  // 视图切换入口由外部 radio 驱动（viewMode 受控），便于对比三种视图的滚动行为
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  return (
    <main
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "16px 24px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ flexShrink: 0 }}>
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
          <h1 style={{ margin: 0, fontSize: 18 }}>
            YsTablePage 占满高度（内容滚动 + 分页固定）
          </h1>
          <Radio.Group
            size="small"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
          >
            <Radio.Button value="table">表格</Radio.Button>
            <Radio.Button value="card">卡片</Radio.Button>
            <Radio.Button value="list">列表</Radio.Button>
          </Radio.Group>
        </div>
        <p style={{ margin: "0 0 12px", color: "#666", fontSize: "0.92em", lineHeight: 1.6 }}>
          整页 <code style={codeStyle}>100vh</code> 撑满视口，
          <code style={codeStyle}>YsTablePage</code> 占满剩余高度：
          顶部查询面板、命令栏固定不滚，表格/卡片/列表内容区超出时出现滚动条，
          底部分页导航始终固定可见。切换三种视图对比滚动行为。200 行数据 / 每页 20 条 = 10 页。
        </p>
      </div>

      {/* body 撑满剩余高度；minHeight:0 允许 flex 子项收缩，
          内部 YsTablePage height:100% 才能拿到确定高度 */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <YsTablePage
          metaFun={metaFun}
          dataFun={dataFun}
          viewMode={viewMode}
          onUpdateViewMode={setViewMode}
          pageSize={20}
          showCheckbox
          card={(row) => (
            <div>
              <div style={{ fontWeight: 600 }}>
                {String(row.name)}{" "}
                <span
                  style={{
                    marginLeft: 4,
                    color: "#909399",
                    fontWeight: 400,
                    fontSize: "0.85em",
                  }}
                >
                  #{String(row.id)}
                </span>
              </div>
              <div style={{ marginTop: 4, color: "#909399", fontSize: 12 }}>
                {String(row.email)} · {String(row.age)} 岁
              </div>
            </div>
          )}
          list={(row) => (
            <div>
              <span style={{ fontWeight: 600 }}>{String(row.name)}</span>{" "}
              <span style={{ marginTop: 4, color: "#909399", fontSize: 12 }}>
                {String(row.email)} · {String(row.age)} 岁 · #{String(row.id)}
              </span>
            </div>
          )}
        >
          {/* filter items → YsFilterPanel 默认插槽 */}
          <YsTextFilterItem
            label="姓名（contains）"
            propertyPath="name"
            op={Operator.Contains}
            placeholder="输入姓名片段，如 FillUser1、5"
          />
        </YsTablePage>
      </div>
    </main>
  );
}
