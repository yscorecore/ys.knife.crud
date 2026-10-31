import { useState } from "react";
import { Radio } from "antd";
import { listData, type ViewMode } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { manyRows, metaFun, type UserRow } from "../../shared/demoData";

export interface LoadingPageProps {
  onBack: () => void;
}

// 模拟 2 秒慢接口：listData 包装后，每次 dataFun 调用（首载、翻页、改每页条数、reload）
// 都会重新调用 listFunc，等待 2s 后再分页切片返回，让 loading 遮罩停留足够久便于观察
const dataFun = listData<UserRow>(
  () => new Promise<UserRow[]>((resolve) => setTimeout(() => resolve(manyRows), 2000)),
);

/** 自定义 loading 内容的 keyframes（inline style 无法表达动画，页内 style 标签承载） */
const loadingDemoStyle = `
.antd-loading-demo__custom {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #1677ff;
}
.antd-loading-demo__pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #1677ff;
  animation: antd-loading-demo-pulse 1s ease-in-out infinite alternate;
}
@keyframes antd-loading-demo-pulse {
  from { transform: scale(0.6); opacity: 0.4; }
  to { transform: scale(1); opacity: 1; }
}
`;

const headStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  margin: "8px 0",
} as const;

const captionStyle = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: "#909399",
} as const;

/** 自定义 loading 内容（loading prop，三种视图共用）：脉冲圆点 + 文案 */
const customLoading = (
  <div className="antd-loading-demo__custom">
    <span className="antd-loading-demo__pulse" />
    <span>数据加载中，请稍候…</span>
  </div>
);

export default function LoadingPage({ onBack }: LoadingPageProps) {
  // 两张表各自独立的视图模式（外部 radio 经受控 viewMode 驱动）
  const [viewMode1, setViewMode1] = useState<ViewMode>("table");
  const [viewMode2, setViewMode2] = useState<ViewMode>("table");

  return (
    <DemoPageLayout
      title="加载中效果（三视图 loading 遮罩 + loading 自定义内容）"
      hint="dataFun 模拟 2 秒慢接口（listData 包装），首载与每次翻页都会触发 loading。上方表格未提供 loading 自定义内容：三视图显示内置 spinner 遮罩——表格视图遮罩盖住表格体，卡片 / 列表视图盖住整个视图区域（翻页时旧数据仍在遮罩下，首载无数据时容器有 min-height 保底）。下方表格提供了 loading 自定义内容：三种视图的遮罩中央都渲染自定义内容，可用每个表格上方的外部切换控件（受控 viewMode）逐个对比。"
      onBack={onBack}
    >
      <style>{loadingDemoStyle}</style>

      <div style={headStyle}>
        <h4 style={captionStyle}>默认 loading（内置 spinner）</h4>
        <Radio.Group
          size="small"
          value={viewMode1}
          optionType="button"
          buttonStyle="solid"
          onChange={(event) => setViewMode1(event.target.value as ViewMode)}
        >
          <Radio.Button value="table">表格</Radio.Button>
          <Radio.Button value="card">卡片</Radio.Button>
          <Radio.Button value="list">列表</Radio.Button>
        </Radio.Group>
      </div>
      <div style={{ marginBottom: 24 }}>
        <YsTable
          metaFun={metaFun}
          dataFun={dataFun}
          viewMode={viewMode1}
          onUpdateViewMode={setViewMode1}
          pageSize={10}
          showCheckbox
        />
      </div>

      <div style={headStyle}>
        <h4 style={captionStyle}>自定义 loading（loading 自定义内容，三种视图共用）</h4>
        <Radio.Group
          size="small"
          value={viewMode2}
          optionType="button"
          buttonStyle="solid"
          onChange={(event) => setViewMode2(event.target.value as ViewMode)}
        >
          <Radio.Button value="table">表格</Radio.Button>
          <Radio.Button value="card">卡片</Radio.Button>
          <Radio.Button value="list">列表</Radio.Button>
        </Radio.Group>
      </div>
      <YsTable
        metaFun={metaFun}
        dataFun={dataFun}
        viewMode={viewMode2}
        onUpdateViewMode={setViewMode2}
        pageSize={10}
        showCheckbox
        loading={customLoading}
      />
    </DemoPageLayout>
  );
}
