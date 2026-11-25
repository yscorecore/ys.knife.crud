import { useRef, useState, type ReactNode } from "react";
import { Button, Checkbox, Radio } from "antd";
import { constData, Operator, type TableAction } from "@ys-knife-crud/core";
import { YsTablePage, YsTextFilterItem } from "@ys-knife-crud/antd";
import type { TablePageDataFun, YsTablePageApi } from "@ys-knife-crud/antd";
import { manyRows, metaFun } from "../../shared/demoData";

interface PageProps {
  onBack: () => void;
}

type ExtraMode = "default" | "custom" | "empty";

function extractContains(text: string): string {
  const match = /contains\s+(.+)$/i.exec(text);
  const raw = match?.[1]?.trim() ?? "";
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : raw;
  } catch {
    return raw;
  }
}

const dataFun: TablePageDataFun = (req, filter, signal) => {
  const rows = filter.isEmpty()
    ? manyRows
    : manyRows.filter((row) => row.name.includes(extractContains(filter.toString())));
  return constData(rows)(req, signal);
};

const actions: TableAction[] = [
  { name: "refresh", desc: "刷新", execute: async (table) => table.refresh() },
];

const pageStyle = { height: "60vh", minHeight: 420 } as const;

const toolbarStyle = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  marginBottom: 12,
} as const;

const extraStyle = { display: "flex", alignItems: "center", gap: 8 } as const;

const wideTextStyle = {
  marginLeft: 8,
  padding: "4px 10px",
  background: "#f5f7fa",
  borderRadius: 4,
  color: "#909399",
  fontSize: 12,
  whiteSpace: "nowrap" as const,
};

function PageShell(props: {
  title: string;
  hint: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: 24 }}>
      <Button type="link" style={{ paddingLeft: 0 }} onClick={props.onBack}>
        ← 返回导航
      </Button>
      <h1 style={{ margin: "12px 0 8px", fontSize: 22 }}>{props.title}</h1>
      <p style={{ color: "#666", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
        {props.hint}
      </p>
      {props.children}
    </main>
  );
}

export function TablePageFilterExtraDemo({ onBack }: PageProps) {
  const pageRef = useRef<YsTablePageApi | null>(null);
  const [extraMode, setExtraMode] = useState<ExtraMode>("default");
  const [extraWide, setExtraWide] = useState(false);

  // default → 不传（undefined）走默认按钮；custom → 自定义节点；empty → null 让容器 :empty 隐藏
  const filterExtra =
    extraMode === "custom" ? (
      <div style={extraStyle}>
        <Button
          size="small"
          type="primary"
          onClick={() => pageRef.current?.openExportDialog()}
        >
          导出 Excel
        </Button>
        <Button size="small" onClick={() => pageRef.current?.openConfigDialog()}>
          列设置
        </Button>
        {extraWide && <span style={wideTextStyle}>自定义区域宽度随内容自适应撑开，filter 自动收窄</span>}
      </div>
    ) : extraMode === "empty"
      ? null
      : undefined;

  return (
    <PageShell
      title="filter-extra 插槽（filter 右侧自定义区域）"
      hint="YsTablePage 的 filter 区域右侧提供 filterExtra prop：不传时默认渲染表格操作下拉按钮；传自定义内容则按内容宽度自适应撑开、filter 自动让出空间；传 null / 空片段则 filter 横向占满。切换下方单选查看三种状态，勾选「加宽自定义内容」可直观看到右侧区域随内容变宽、filter 收窄。"
      onBack={onBack}
    >
      <div style={toolbarStyle}>
        <Radio.Group
          value={extraMode}
          onChange={(e) => setExtraMode(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          size="small"
          options={[
            { label: "默认（不传）", value: "default" },
            { label: "自定义内容", value: "custom" },
            { label: "空（filter 占满）", value: "empty" },
          ]}
        />
        {extraMode === "custom" && (
          <Checkbox checked={extraWide} onChange={(e) => setExtraWide(e.target.checked)}>
            加宽自定义内容（演示宽度自适应）
          </Checkbox>
        )}
      </div>

      <div style={pageStyle}>
        <YsTablePage
          ref={pageRef}
          metaFun={metaFun}
          dataFun={dataFun}
          actions={actions}
          pageSize={10}
          showCheckbox
          filterExtra={filterExtra}
        >
          <YsTextFilterItem
            label="姓名（contains）"
            propertyPath="name"
            op={Operator.Contains}
            placeholder="输入姓名片段，如 User1、5"
          />
        </YsTablePage>
      </div>
    </PageShell>
  );
}

export default TablePageFilterExtraDemo;
