import { useState } from "react";
import { Checkbox, Progress, Tag } from "antd";
import { constData } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { manyRows, metaFun } from "../../shared/demoData";

export interface FooterPageProps {
  onBack: () => void;
}

// paged：25 行数据 + pageSize=10，数据超过一页自动出现分页组件
const dataFun = constData(manyRows);

export default function FooterPage({ onBack }: FooterPageProps) {
  // 切换 footer 内容高度：演示分页垂直居中对齐效果
  const [tallFooter, setTallFooter] = useState(false);

  // footer 是静态 ReactNode，当前页条数经 onDataLoaded 回调同步进 state 驱动刷新
  const [pageRowCount, setPageRowCount] = useState(0);

  const footer = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        fontSize: 13,
        color: "#606266",
      }}
    >
      <Tag>自定义底部</Tag>
      <span style={{ lineHeight: 1.4 }}>
        当前页 {pageRowCount} 条 · 此区域由 footer 属性渲染，占分页左侧剩余空间
      </span>
      {tallFooter ? (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
          <Progress percent={70} strokeWidth={14} style={{ width: 240 }} />
          <p style={{ margin: 0, color: "#909399", fontSize: 12, lineHeight: 1.4 }}>
            footer 内容过高时底部栏被撑高，右侧分页组件垂直居中对齐此区域。
          </p>
        </div>
      ) : null}
    </div>
  );

  return (
    <DemoPageLayout
      title="底部区域表格（footer）"
      hint="表格底部栏左侧为 footer 属性（替代 #footer 插槽）的渲染区域，右侧为分页组件。footer 内容占剩余空间，分页优先占右侧；当 footer 内容高度超过分页时，底部栏被撑高，分页组件垂直居中对齐左侧内容。勾选下方「撑高 footer」可切换演示。"
      onBack={onBack}
    >
      <div style={{ marginBottom: 12 }}>
        <Checkbox
          checked={tallFooter}
          onChange={(event) => setTallFooter(event.target.checked)}
        >
          撑高 footer 内容（演示分页垂直居中对齐）
        </Checkbox>
      </div>

      <YsTable
        metaFun={metaFun}
        dataFun={dataFun}
        pageSize={10}
        footer={footer}
        onDataLoaded={(paged) => setPageRowCount(paged.items.length)}
      />
    </DemoPageLayout>
  );
}
