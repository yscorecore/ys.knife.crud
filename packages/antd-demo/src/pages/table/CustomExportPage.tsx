import { useRef } from "react";
import { Button } from "antd";
import {
  constMetaFunc,
  loadLocalStorageConfig,
  saveLocalStorageConfig,
  type Meta,
  type TableApi,
} from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import { createExcelJsExportApiFunc } from "@ys-knife-crud/export-exceljs";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { delayedData, exportRows } from "../../shared/demoData";

export interface CustomExportPageProps {
  onBack: () => void;
}

/** 状态枚举：演示导出时 formatter 把后台数字转成中文文案 */
const STATUS: Record<number, string> = { 0: "待审核", 1: "已启用", 2: "已停用" };

// 大数据 + 每次请求 300ms 延迟：导出所有需 30 次请求（约 9 秒），进度条与取消清晰可见
const rows = exportRows.map((r, i) => ({ ...r, status: i % 3 }));
const dataFun = delayedData(rows, 300);

// 状态列不写 render、只配 formatter：表格显示与导出 Excel 共用同一份转换
const localMetaFun = constMetaFunc({
  displayName: "用户列表",
  description: null,
  columns: [
    { propertyPath: "id", displayName: "ID" },
    { propertyPath: "name", displayName: "姓名" },
    {
      propertyPath: "status",
      displayName: "状态",
      formatter: (_row, value) => STATUS[value as number] ?? String(value),
    },
    { propertyPath: "age", displayName: "年龄" },
  ],
} satisfies Meta);

// 列设置持久化（独立 localStorage key，与其他演示页互不覆盖）
const loadCustomConfigFun = loadLocalStorageConfig(
  "yk-crud-demo-antd-table-columns-custom-export",
);
const saveCustomConfigFun = saveLocalStorageConfig(
  "yk-crud-demo-antd-table-columns-custom-export",
);

/** 真实导出实现（ExcelJS），openExportDialog 确认后产出 xlsx */
const exportorFunc = createExcelJsExportApiFunc();

export default function CustomExportPage({ onBack }: CustomExportPageProps) {
  const tableRef = useRef<TableApi | null>(null);

  const toolbar = (
    <>
      <Button onClick={() => tableRef.current?.openConfigDialog()}>⚙ 列设置</Button>
      <Button
        type="primary"
        style={{ background: "#52c41a" }}
        onClick={() => tableRef.current?.openExportDialog()}
      >
        ⬇ 导出 Excel
      </Button>
    </>
  );

  return (
    <DemoPageLayout
      title="自定义列 + 导出 Excel"
      hint="表格不内置入口，由上方外部按钮驱动：先点「⚙ 列设置」（openConfigDialog）调整列的显隐/顺序/宽度，再点「⬇ 导出 Excel」（openExportDialog）——导出的列与界面所见严格一致（隐藏列不导出、顺序一致、列宽映射）。「状态」列配了 Column.formatter，表格与导出的 Excel 都显示中文而非后台数字。300 行数据 + 每次请求 300ms 延迟（导出所有约需 9 秒），可清楚看到进度条并中途取消。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <YsTable
        ref={tableRef}
        metaFun={localMetaFun}
        dataFun={dataFun}
        pageSize={10}
        loadCustomConfigFun={loadCustomConfigFun}
        saveCustomConfigFun={saveCustomConfigFun}
        exportorFunc={exportorFunc}
      />
    </DemoPageLayout>
  );
}
