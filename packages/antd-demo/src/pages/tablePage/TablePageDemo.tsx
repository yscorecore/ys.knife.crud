import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "antd";
import { Operator } from "@ys-knife-crud/core";
import { YsTablePage, YsTextFilterItem } from "@ys-knife-crud/antd";
import type { TablePageDataFun, YsTablePageApi } from "@ys-knife-crud/antd";
import { delayedPagedData, manyRows, metaFun } from "../../shared/demoData";

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

/**
 * 从 FilterInfo.toString()（形如 `name contains "User1"`）解析 contains 值。
 * 真实项目通常把 filter 透传后端，这里只在前端做简单过滤以便演示联动。
 */
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

/**
 * 增强签名 dataFun：(req, filter, signal) => Promise<PagedList>。
 * YsTablePage 自动把 filterPanel 的查询条件注入 filter 参数，搜索/重置时回到第 1 页重载。
 * 这里按 name contains 过滤 manyRows，并用 delayedPagedData 模拟网络延迟。
 */
const dataFun: TablePageDataFun = (req, filter, signal) => {
  const rows = filter.isEmpty()
    ? manyRows
    : manyRows.filter((row) => row.name.includes(extractContains(filter.toString())));
  return delayedPagedData(rows, 300, true)(req, signal);
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

/**
 * YsTablePage 演示：查询面板 + 命令面板 + 表格三合一。
 * 查询条件经 dataFun 的第二个参数自动注入；外部仍可通过 ref 读取表格与查询面板实例。
 */
export function TablePageDemo({ onBack }: PageProps) {
  const pageRef = useRef<YsTablePageApi | null>(null);
  const [submitted, setSubmitted] = useState("");
  const [loadedInfo, setLoadedInfo] = useState("");

  return (
    <PageShell
      title="查询 + 命令 + 表格（YsTablePage 自动联动）"
      hint="dataFun 使用增强签名 (req, filter, signal)；搜索/重置时组件自动回到第 1 页重载。姓名框输入片段（如 User1、5）后回车或点「查询」，表格只显示匹配行。命令栏中的「刷新」按钮通过 ref 调用 table.refresh()。"
      onBack={onBack}
    >
      <div style={{ height: "65vh", minHeight: 480 }}>
        <YsTablePage
          ref={pageRef}
          metaFun={metaFun}
          dataFun={dataFun}
          pageSize={10}
          showCheckbox
          onSearch={(filter) =>
            setSubmitted(filter.isEmpty() ? "(empty)" : filter.toString())
          }
          onReset={() => setSubmitted("")}
          onDataLoaded={(paged) =>
            setLoadedInfo(
              `本页 ${paged.items.length} 行，totalCount=${paged.totalCount ?? "未知"}`,
            )
          }
          commandBar={
            <Button size="small" onClick={() => pageRef.current?.refresh()}>
              刷新（ref.refresh）
            </Button>
          }
        >
          <YsTextFilterItem
            label="姓名（contains）"
            propertyPath="name"
            op={Operator.Contains}
            placeholder="输入姓名片段，如 User1、5"
          />
        </YsTablePage>
      </div>

      <div style={infoBoxStyle}>
        <p style={{ margin: 0 }}>
          上次查询提交的 FilterInfo：<code>{submitted || "(未查询)"}</code>
        </p>
        <p style={{ margin: "4px 0" }}>
          最近一次 dataFun 返回：<code>{loadedInfo || "(等待加载)"}</code>
        </p>
      </div>
    </PageShell>
  );
}

export default TablePageDemo;
