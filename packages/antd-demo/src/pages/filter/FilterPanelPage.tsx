import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "antd";
import { Operator } from "@ys-knife-crud/core";
import {
  YsFilterPanel,
  YsTextFilterItem,
  YsEnumFilterItem,
  YsDateRangeFilterItem,
  fromOptions,
} from "@ys-knife-crud/antd";
import type { FilterPanelHandle } from "@ys-knife-crud/antd";

interface PageProps {
  onBack: () => void;
}

const infoBoxStyle = {
  marginTop: 16,
  padding: "12px 16px",
  background: "#f5f7fa",
  borderRadius: 4,
  fontSize: 13,
  lineHeight: 1.8,
} as const;

const codeStyle = {
  background: "#eef2f7",
  padding: "1px 6px",
  borderRadius: 4,
  fontSize: 12,
} as const;

/** 枚举字段的数据源：fromOptions 把静态 {label, value}[] 包装成 EnumOptionsSource */
const statusSource = fromOptions([
  { label: "Active", value: 1 },
  { label: "Inactive", value: 2 },
  { label: "Pending", value: 3 },
  { label: "Archived", value: 4 },
]);

const tagSource = fromOptions([
  { label: "开发", value: "dev" },
  { label: "设计", value: "design" },
  { label: "产品", value: "pm" },
  { label: "测试", value: "qa" },
]);

/** 日期范围限制：只允许最近 30 天（禁用更早与未来日期） */
function disabledDate(date: Date): boolean {
  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 86400 * 1000);
  thirtyAgo.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);
  return date < thirtyAgo || date > now;
}

function PageShell(props: {
  title: string;
  hint: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <main style={{ maxWidth: 900, margin: "24px auto", padding: 24 }}>
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
 * YsFilterPanel 演示：文本 / 枚举（单选、多选）/ 日期范围四类条件，
 * 多个非空条件由面板内部按 AND 聚合；onSearch 拿到聚合后的 FilterInfo。
 * ref 暴露 filter 与 reset，用于演示命令式读取与重置。
 */
export function FilterPanelPage({ onBack }: PageProps) {
  const panelRef = useRef<FilterPanelHandle | null>(null);
  const [submitted, setSubmitted] = useState("");
  const [live, setLive] = useState("");

  const readFilter = (): void => {
    const filter = panelRef.current?.filter;
    setLive(filter ? (filter.isEmpty() ? "(empty)" : filter.toString()) : "(未挂载)");
  };

  const resetFromOutside = (): void => {
    panelRef.current?.reset();
    setLive("");
  };

  return (
    <PageShell
      title="查询条件面板（YsFilterPanel）"
      hint="演示多个 FilterItem 由 YsFilterPanel 自动注册并按 AND 聚合：文本（op 可声明）、枚举单选/多选（多选 2+ 项自动用 In）、日期范围（op 内部固定 Between，可限制可选日期）。点击「查询」时 onSearch 回传聚合后的 FilterInfo。"
      onBack={onBack}
    >
      <YsFilterPanel
        ref={panelRef}
        onSearch={(filter) =>
          setSubmitted(filter.isEmpty() ? "(empty)" : filter.toString())
        }
        onReset={() => setSubmitted("")}
      >
        <YsTextFilterItem
          label="姓名（contains）"
          propertyPath="name"
          op={Operator.Contains}
          placeholder="输入姓名片段（如 Alice）"
        />
        <YsTextFilterItem
          label="邮箱（endswith）"
          propertyPath="email"
          op={Operator.EndsWith}
          placeholder="输入邮箱后缀（如 @example.com）"
        />
        <YsEnumFilterItem
          label="状态（equals）"
          propertyPath="status"
          op={Operator.Equals}
          optionsSource={statusSource}
          placeholder="选择状态"
        />
        <YsEnumFilterItem
          label="标签（in，多选）"
          propertyPath="tags"
          op={Operator.In}
          optionsSource={tagSource}
          placeholder="选择标签（可多选）"
          multiple
        />
        <YsDateRangeFilterItem
          label="创建时间（between）"
          propertyPath="createdAt"
          startPlaceholder="开始日期"
          endPlaceholder="结束日期"
          disabledDate={disabledDate}
        />
      </YsFilterPanel>

      <div style={infoBoxStyle}>
        <p style={{ margin: 0 }}>
          上次查询提交的 FilterInfo：<code style={codeStyle}>{submitted || "(未查询)"}</code>
        </p>
        <p style={{ margin: "4px 0" }}>
          经 ref.filter 读取：<code style={codeStyle}>{live || "(点击下方按钮读取)"}</code>
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" onClick={readFilter}>
            读取 ref.filter
          </Button>
          <Button size="small" onClick={resetFromOutside}>
            调用 ref.reset()
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

export default FilterPanelPage;
