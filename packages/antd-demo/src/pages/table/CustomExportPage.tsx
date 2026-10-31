import { useRef } from "react";
import { Button } from "antd";
import {
  loadLocalStorageConfig,
  saveLocalStorageConfig,
  type TableApi,
} from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import { createExcelJsExportApiFunc } from "@ys-knife-crud/export-exceljs";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { delayedData, exportRows, metaFun } from "../../shared/demoData";

export interface CustomExportPageProps {
  onBack: () => void;
}

// 大数据 + 每次请求 300ms 延迟：导出所有需 30 次请求（约 9 秒），进度条与取消清晰可见
const dataFun = delayedData(exportRows, 300);

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
      hint="表格不内置入口，由上方外部按钮驱动：先点「⚙ 列设置」（openConfigDialog）调整列的显隐/顺序/宽度，再点「⬇ 导出 Excel」（openExportDialog）——导出的列与界面所见严格一致（隐藏列不导出、顺序一致、列宽映射）。300 行数据 + 每次请求 300ms 延迟（导出所有约需 9 秒），可清楚看到进度条并中途取消。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <YsTable
        ref={tableRef}
        metaFun={metaFun}
        dataFun={dataFun}
        pageSize={10}
        loadCustomConfigFun={loadCustomConfigFun}
        saveCustomConfigFun={saveCustomConfigFun}
        exportorFunc={exportorFunc}
      />
    </DemoPageLayout>
  );
}
