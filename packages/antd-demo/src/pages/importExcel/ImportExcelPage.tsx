import { useState } from "react";
import type { ReactNode } from "react";
import { Alert, Button } from "antd";
import type { DataColumn, ImportProcessSummary } from "@ys-knife-crud/core";
import { singleRowProcessor } from "@ys-knife-crud/core";
import { YsImportExcel } from "@ys-knife-crud/antd";
import { createExcelJsImportParser } from "@ys-knife-crud/import-exceljs";

interface PageProps {
  onBack: () => void;
}

/**
 * 列定义：演示 name/alias/position 定位与 valueMapper/validator。
 * - code/name/price/remark 走表头别名匹配
 * - qty 用 position=2（第 3 列）直接定位
 * - remark 为可选列
 */
const columns: DataColumn[] = [
  { name: "code", alias: ["商品编码", "编码"] },
  { name: "name", alias: ["商品名称", "名称"] },
  {
    position: 2,
    name: "qty",
    valueMapper: (value) => Number(value),
    validator: (value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return ["数量必须是数字"];
      if (num <= 0) return ["数量必须大于 0"];
      return [];
    },
  },
  {
    name: "price",
    alias: ["单价", "价格", "价格(元)"],
    valueMapper: (value) => Number(value),
    validator: (value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return ["单价必须是数字"];
      if (num < 0) return ["单价不能为负数"];
      return [];
    },
  },
  { name: "remark", alias: ["备注"], optional: true },
];

/** ExcelJS 解析器：组件不绑定解析库，由外部注入 */
const parser = createExcelJsImportParser();

/**
 * singleRowProcessor：后台只有单条接口时的适配器（batchSize 恒为 1）。
 * 正常返回即成功，抛错即失败并把 error.message 回显到状态列。
 */
const processor = singleRowProcessor<Record<string, unknown>>(async (row) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const code = String(row.code ?? "");
  if (code.startsWith("E")) {
    throw new Error(`编码 ${code} 已存在，请更换后重试`);
  }
});

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
 * Excel 导入演示（singleRowProcessor）：选文件 → 按列定义映射并逐行校验
 * → 勾选待处理行 → 逐行调用单条处理器，抛错的行标记失败。
 */
export function ImportExcelPage({ onBack }: PageProps) {
  const [summary, setSummary] = useState<ImportProcessSummary | null>(null);

  return (
    <PageShell
      title="Excel 数据导入（YsImportExcel + singleRowProcessor）"
      hint="准备一个表头为「商品编码 / 商品名称 / 数量 / 单价 / 备注」的 xlsx（qty 也可按第 3 列位置读取）。数量与单价会经 valueMapper 转数字并由 validator 校验；remark 为可选列。所有校验通过的行默认勾选，点击「开始处理」后逐行调用单条处理器——编码以 E 开头的行会抛出异常并标记为失败。"
      onBack={onBack}
    >
      {summary ? (
        <Alert
          style={{ marginBottom: 12 }}
          type={summary.failed === 0 ? "success" : "warning"}
          showIcon
          message={`上一轮处理完成：共 ${summary.total} 行，成功 ${summary.success} 行，失败 ${summary.failed} 行${
            summary.stopped ? "（已提前停止）" : ""
          }`}
        />
      ) : null}

      <div style={{ height: "60vh", minHeight: 420 }}>
        <YsImportExcel
          columns={columns}
          parser={parser}
          processor={processor}
          onLoaded={() => setSummary(null)}
          onProcessed={(result) => setSummary(result)}
        />
      </div>
    </PageShell>
  );
}

export default ImportExcelPage;
