import { useState } from "react";
import { Alert, Button, Radio } from "antd";
import type {
  Column,
  DataColumn,
  ImportProcessSummary,
  ImportRowProcessor,
  ImportRowResult,
} from "@ys-knife-crud/core";
import { YsImportExcel } from "@ys-knife-crud/antd";
import { createExcelJsImportParser } from "@ys-knife-crud/import-exceljs";
import { createExcelJsExportApiFunc } from "@ys-knife-crud/export-exceljs";

export interface ImportExcelBatchPageProps {
  onBack: () => void;
}

/** 批量导入 demo：重点演示 processor.batchSize —— 每次 process 调用携带的行数 */
const columns: DataColumn[] = [
  { name: "code", alias: ["商品编码", "编码"] },
  { name: "name", alias: ["商品名称", "名称"] },
  { name: "qty", alias: ["数量"], valueMapper: (v) => Number(v) },
  { name: "price", alias: ["单价", "价格"], valueMapper: (v) => Number(v) },
  { name: "remark", alias: ["备注"], optional: true },
];

const parser = createExcelJsImportParser();

/**
 * 批次大小选项：
 * - 1：逐行（等价于单条处理，批量模式的特例）
 * - 20 / 50：每次调用 process 处理一批
 * - 0：不限制（一次调用处理全部勾选行）
 */
const batchSizeOptions = [
  { value: 1, label: "逐行（batchSize=1）" },
  { value: 20, label: "每批 20 行" },
  { value: 50, label: "每批 50 行" },
  { value: 0, label: "一次全部" },
] as const;

/** 生成 120 行数据：约每 10 行混 1 个含 E 的编码（模拟部分失败） */
function buildBatchRows(): unknown[][] {
  const rows: unknown[][] = [];
  for (let i = 0; i < 120; i++) {
    const code = i % 10 === 4 ? `E${3001 + i}` : `B${3001 + i}`;
    rows.push([code, `批量商品 ${i + 1}`, (i % 20) + 1, Number((9.9 + (i % 50) * 7.5).toFixed(1)), `第 ${Math.floor(i / 20) + 1} 组`]);
  }
  return rows;
}

/** 下载 120 行测试数据 */
async function downloadDataset(): Promise<void> {
  const api = createExcelJsExportApiFunc()();
  const headerColumns: Column[] = ["商品编码", "商品名称", "数量", "单价", "备注"]
    .map((displayName) => ({ propertyPath: "", displayName }));
  await api.renderHeader({ 批量导入: headerColumns });
  await api.renderRows("批量导入", buildBatchRows());
  await api.download("商品导入-批量120行.xlsx");
}

const codeStyle = {
  background: "#eef2f7",
  padding: "1px 6px",
  borderRadius: 4,
  fontSize: "0.9em",
} as const;

/**
 * Excel 批量导入演示：processor.batchSize 控制每次 process 调用携带的最大行数，
 * 批内所有行同时翻为「处理中」，process 返回与输入等长同序的结果数组决定每行成功/失败。
 */
export default function ImportExcelBatchPage({ onBack }: ImportExcelBatchPageProps) {
  const [batchSizeChoice, setBatchSizeChoice] = useState<number>(50);
  /** 记录每次 process 调用的批量（演示分批节奏） */
  const [batchCalls, setBatchCalls] = useState<number[]>([]);
  const [lastSummary, setLastSummary] = useState<ImportProcessSummary | null>(null);

  /** 模拟批量接口：一次接收一批行，随机耗时；编码含「E」的行标记失败（返回与输入等长同序的结果数组） */
  const processBatch: ImportRowProcessor = async (batch) => {
    setBatchCalls((prev) => [...prev, batch.length]);
    await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 500));
    return batch.map((row): ImportRowResult =>
      String(row.data.code).includes("E")
        ? { status: "failed", message: `编码 ${row.data.code} 已存在，请更换后重试` }
        : { status: "success" },
    );
  };

  /** 批次大小：0 表示不限制 → 传一个足够大的数（切换批次大小后实时生效） */
  const effectiveBatchSize =
    batchSizeChoice > 0 ? batchSizeChoice : Number.MAX_SAFE_INTEGER;

  const batchCallsText = batchCalls.length > 0 ? batchCalls.join(" + ") : "";

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
          <h1 style={{ margin: 0, fontSize: 18 }}>Excel 批量导入（batchSize 分批）</h1>
          <Button size="small" type="primary" ghost onClick={() => void downloadDataset()}>
            下载测试数据（120 行）
          </Button>
        </div>
        <p style={{ margin: "0 0 10px", color: "#666", fontSize: "0.92em", lineHeight: 1.6 }}>
          后台提供批量接口时，一次调用即可处理多行。<code style={codeStyle}>processor.batchSize</code> 控制每次调用
          <code style={codeStyle}>processor.process</code> 携带的最大行数：批内所有行同时翻为「处理中」，
          process 返回与输入等长同序的结果数组（results[i] 对应 rows[i]）决定每行成功/失败。
          切换下方批次大小（支持「一次全部」）后点「开始处理」，观察处理中行的批量翻转与分批调用次数。
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: "0.92em", color: "#606266" }}>批次大小：</span>
          <Radio.Group
            size="small"
            value={batchSizeChoice}
            onChange={(e) => setBatchSizeChoice(e.target.value as number)}
          >
            {batchSizeOptions.map((opt) => (
              <Radio.Button key={opt.value} value={opt.value}>
                {opt.label}
              </Radio.Button>
            ))}
          </Radio.Group>
          {batchCallsText ? (
            <span style={{ fontSize: "0.88em", color: "#409eff" }}>
              本轮 processor 调用 {batchCalls.length} 次，各批行数：{batchCallsText}
            </span>
          ) : null}
        </div>
      </div>

      {lastSummary ? (
        <Alert
          style={{ flexShrink: 0, marginBottom: 8 }}
          type={lastSummary.failed === 0 ? "success" : "warning"}
          showIcon
          message={`上一轮处理完成：共 ${lastSummary.total} 行，成功 ${lastSummary.success} 行，失败 ${lastSummary.failed} 行`}
        />
      ) : null}

      <div style={{ flex: 1, minHeight: 0 }}>
        <YsImportExcel
          columns={columns}
          parser={parser}
          processor={{ process: processBatch, batchSize: effectiveBatchSize }}
          onLoaded={() => {
            setBatchCalls([]);
            setLastSummary(null);
          }}
          onProcessed={(summary) => setLastSummary(summary)}
        />
      </div>
    </main>
  );
}
