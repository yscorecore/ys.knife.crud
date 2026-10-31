import type { ReactNode } from "react";
import { Button, Tag } from "antd";
import { constData } from "@ys-knife-crud/core";
import { YsTable, type YsSelectionBarContext } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { manyRows, metaFun, type UserRow } from "../../shared/demoData";

export interface SelectionBarPageProps {
  onBack: () => void;
}

const dataFun = constData(manyRows);

/**
 * 外部自定义选中提示条：常驻渲染（无选中时为灰色态），样式与布局由外部决定。
 * 跨页选中累计与操作方法由 selectionBar 上下文提供。
 */
function renderSelectionBar(ctx: YsSelectionBarContext): ReactNode {
  const selected = ctx.selectedRows as UserRow[];
  const empty = selected.length === 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
        padding: "10px 16px",
        borderRadius: 8,
        background: empty ? "#f4f6f9" : "linear-gradient(90deg, #2b3a4a, #35495e)",
        color: empty ? "#909399" : "#e8eef5",
        fontSize: 14,
        boxShadow: empty ? "none" : "0 2px 8px rgb(0 0 0 / 12%)",
      }}
    >
      <span>
        已选择{" "}
        <strong style={{ color: empty ? "#909399" : "#73d13d", fontSize: 16, margin: "0 2px" }}>
          {selected.length}
        </strong>{" "}
        行 / 共 {ctx.total} 行
      </span>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
          minHeight: 24,
        }}
      >
        {selected.map((row) => (
          <Tag key={row.id} color="blue" bordered={false}>
            {row.name}
          </Tag>
        ))}
        {empty ? <span style={{ fontSize: 13 }}>尚未勾选（可跨页累计）</span> : null}
      </div>
      <Button size="small" onClick={ctx.selectAllOnPage}>
        选中本页
      </Button>
      <Button size="small" onClick={ctx.invertSelectionOnPage}>
        反选本页
      </Button>
      <Button size="small" disabled={empty} onClick={ctx.clearSelection}>
        清空选择
      </Button>
    </div>
  );
}

export default function SelectionBarPage({ onBack }: SelectionBarPageProps) {
  return (
    <DemoPageLayout
      title="自定义选中提示条（外部实现）"
      hint="表格不渲染任何内置选中提示条，跨页选中累计与操作方法照常暴露（selectedRows / total / clearSelection / selectAllOnPage / invertSelectionOnPage）。下面是外部自行实现的提示条——样式完全自定义（深色卡片、姓名标签），常驻占位以避免表格抖动；可跨页勾选后观察姓名标签累计，或点「选中本页 / 反选本页 / 清空选择」调用上下文方法验证。secret 列因 showForDisplay: false 被隐藏。"
      onBack={onBack}
    >
      <YsTable
        metaFun={metaFun}
        dataFun={dataFun}
        pageSize={10}
        showCheckbox
        selectionBar={renderSelectionBar}
      />
    </DemoPageLayout>
  );
}
