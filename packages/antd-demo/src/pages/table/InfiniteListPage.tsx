import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "antd";
import { YsInfiniteList } from "@ys-knife-crud/antd";
import type { YsInfiniteListApi } from "@ys-knife-crud/antd";
import { createExcelJsExportApiFunc } from "@ys-knife-crud/export-exceljs";
import { createBigRows, delayedPagedData, metaFun } from "../../shared/demoData";

interface PageProps {
  onBack: () => void;
}

/** 与 YsTable 同一套 PageFunc 契约；300ms 延迟便于观察触底追加 */
const dataFun = delayedPagedData(createBigRows(100, "User"), 300, true);

const exportorFunc = createExcelJsExportApiFunc();

function PageShell(props: {
  title: string;
  hint: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <main style={{ maxWidth: 1000, margin: "24px auto", padding: 24 }}>
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
 * YsInfiniteList 演示：滚动到底部（提前 threshold 像素）自动加载下一页并追加，
 * 直到 hasNext=false。showCheckbox 的选中跨页累计；导出入口经 ref 调
 * openExportDialog()，范围包含「当前已加载」。
 */
export function InfiniteListPage({ onBack }: PageProps) {
  const listRef = useRef<YsInfiniteListApi | null>(null);
  const [selectedRows, setSelectedRows] = useState<Record<string, unknown>[]>([]);
  const [loadLog, setLoadLog] = useState<string[]>([]);

  const selectedNames = selectedRows
    .map((row) => String(row.name ?? "?"))
    .join("、");

  return (
    <PageShell
      title="无限滚动列表（YsInfiniteList）"
      hint="每页 10 条、共 100 条；滚动到距底部 100px 时自动加载下一页并追加。行首 checkbox 的选中跨页累计；工具栏可全选已加载 / 反选 / 清空，导出按钮通过 ref.openExportDialog() 打开导出对话框（支持「导出当前已加载」）。"
      onBack={onBack}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ marginRight: "auto", fontSize: 13, color: "#606266" }}>
          已选 {selectedRows.length} 项
          {selectedRows.length > 0 ? `：${selectedNames}` : ""}
        </span>
        <Button
          type="primary"
          size="small"
          onClick={() => listRef.current?.openExportDialog()}
        >
          导出 Excel（ref.openExportDialog）
        </Button>
        <Button size="small" onClick={() => listRef.current?.selectAllOnPage()}>
          全选已加载
        </Button>
        <Button size="small" onClick={() => listRef.current?.invertSelectionOnPage()}>
          反选
        </Button>
        <Button
          size="small"
          disabled={selectedRows.length === 0}
          onClick={() => listRef.current?.clearSelection()}
        >
          清空
        </Button>
      </div>

      <div
        style={{
          height: "60vh",
          minHeight: 360,
          border: "1px solid #e4e7ed",
          borderRadius: 6,
        }}
      >
        <YsInfiniteList
          ref={listRef}
          dataFun={dataFun}
          metaFun={metaFun}
          exportorFunc={exportorFunc}
          pageSize={10}
          threshold={100}
          showCheckbox
          onDataLoaded={(paged, isAppend) =>
            setLoadLog((prev) =>
              [
                `${isAppend ? "追加" : "首屏"} offset=${paged.offset} 本页 ${paged.items.length} 行`,
                ...prev,
              ].slice(0, 6),
            )
          }
          onSelectionChange={(rows) =>
            setSelectedRows(rows as Record<string, unknown>[])
          }
        >
          {(row, index) => (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "#f0f2f5",
                  color: "#909399",
                  fontSize: 12,
                }}
              >
                {index + 1}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {String(row.name ?? "")}
                </div>
                <div style={{ marginTop: 2, fontSize: 12, color: "#909399" }}>
                  {String(row.email ?? "")} · {String(row.age ?? "")} 岁
                </div>
              </div>
            </div>
          )}
        </YsInfiniteList>
      </div>

      <p style={{ marginTop: 12, fontSize: 12, color: "#909399" }}>
        加载轨迹（最近 6 次）：{loadLog.join("；") || "（暂无）"}
      </p>
    </PageShell>
  );
}

export default InfiniteListPage;
