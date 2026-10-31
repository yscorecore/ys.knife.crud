import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "antd";
import { Operator } from "@ys-knife-crud/core";
import type { EnumOptionsSource } from "@ys-knife-crud/core";
import {
  YsFilterPanel,
  YsAdvancedFilterPanel,
  YsTextFilterItem,
  fromOptions,
} from "@ys-knife-crud/antd";
import { meta } from "../../shared/demoData";

interface PageProps {
  onBack: () => void;
}

/** 枚举数据源按 propertyPath 映射；命中的字段在高级面板中按 enum 渲染 */
const optionSources: Record<string, EnumOptionsSource> = {
  name: fromOptions([
    { label: "Alice", value: "Alice" },
    { label: "Bob", value: "Bob" },
    { label: "Carol", value: "Carol" },
  ]),
};

const resultStyle = {
  marginTop: 12,
  padding: 12,
  background: "#f5f7fa",
  borderRadius: 4,
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  overflowX: "auto",
} as const;

function PageShell(props: {
  title: string;
  hint: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <main style={{ maxWidth: 980, margin: "24px auto", padding: 24 }}>
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

/**
 * 高级查询演示：
 * 1. YsFilterPanel 传 enableAdvancedFilter + advancedColumns/advancedOptionSources，
 *    可在简单模式与高级模式之间切换；
 * 2. 单独渲染 YsAdvancedFilterPanel，比较两种入口的用法与结果。
 */
export function AdvancedFilterPage({ onBack }: PageProps) {
  const [panelResult, setPanelResult] = useState("");
  const [standaloneResult, setStandaloneResult] = useState("");

  return (
    <PageShell
      title="高级查询（树形 AND/OR 条件）"
      hint="advancedColumns 直接使用 demoData 的 meta.columns；advancedOptionSources 按 propertyPath 指定枚举数据源。高级模式下用户可自行增删条件行并任意嵌套 AND/OR，未填值的叶子与空组聚合时自动跳过。"
      onBack={onBack}
    >
      <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>① YsFilterPanel + enableAdvancedFilter</h2>
      <YsFilterPanel
        enableAdvancedFilter
        advancedColumns={meta.columns}
        advancedOptionSources={optionSources}
        onSearch={(filter) => setPanelResult(JSON.stringify(filter, null, 2))}
        onReset={() => setPanelResult("")}
      >
        <YsTextFilterItem
          label="姓名（contains）"
          propertyPath="name"
          op={Operator.Contains}
          placeholder="简单模式下的文本条件"
        />
      </YsFilterPanel>
      <pre style={resultStyle}>
        {panelResult || "(尚未查询，点击高级模式中的「查询」)"}
      </pre>

      <h2 style={{ fontSize: 16, margin: "24px 0 8px" }}>
        ② 独立 YsAdvancedFilterPanel
      </h2>
      <YsAdvancedFilterPanel
        columns={meta.columns}
        optionSources={optionSources}
        onSearch={(filter) => setStandaloneResult(JSON.stringify(filter, null, 2))}
        onReset={() => setStandaloneResult("")}
      />
      <pre style={resultStyle}>
        {standaloneResult || "(尚未查询，添加条件后点击「查询」)"}
      </pre>
    </PageShell>
  );
}

export default AdvancedFilterPage;
