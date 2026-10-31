import { useRef } from "react";
import { Button } from "antd";
import {
  constData,
  loadLocalStorageConfig,
  saveLocalStorageConfig,
  type TableApi,
} from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import { createExcelJsExportApiFunc } from "@ys-knife-crud/export-exceljs";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { manyRows, metaFun } from "../../shared/demoData";

export interface CustomEntryButtonsPageProps {
  onBack: () => void;
}

const dataFun = constData(manyRows);

// 独立 localStorage key，与其它演示页的列配置互不覆盖
const loadCustomConfigFun = loadLocalStorageConfig("yk-crud-demo-antd-table-columns-custom-entry-buttons");
const saveCustomConfigFun = saveLocalStorageConfig("yk-crud-demo-antd-table-columns-custom-entry-buttons");

// 真实导出实现：内置对话框本身不挑入口来源，外部按钮打开后照常产出 xlsx
const exportorFunc = createExcelJsExportApiFunc();

export default function CustomEntryButtonsPage({ onBack }: CustomEntryButtonsPageProps) {
  // ref 直接用 core 的输出契约 TableApi 类型化（含 openConfigDialog/openExportDialog）
  const tableRef = useRef<TableApi | null>(null);

  const toolbar = (
    <>
      <Button type="primary" ghost onClick={() => tableRef.current?.openConfigDialog()}>
        自定义·列设置
      </Button>
      <Button
        type="primary"
        style={{ background: "#52c41a" }}
        onClick={() => tableRef.current?.openExportDialog()}
      >
        自定义·导出 Excel
      </Button>
    </>
  );

  return (
    <DemoPageLayout
      title="自定义入口按钮（openConfigDialog / openExportDialog）"
      hint="表格不渲染任何内置命令入口，由页面在外部自实现按钮（此处用实心 / ghost 按钮演示样式完全自定义）。按钮里只调 tableRef.openConfigDialog() / tableRef.openExportDialog()——打开的仍是表格内置对话框，全部逻辑（列显隐/顺序/宽度持久化、导出范围选择/进度/取消、导出列所见即所得）零改动复用。25 行 + pageSize=10，勾选后自定义导出按钮里还会出现「导出选中」范围。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <YsTable
        ref={tableRef}
        metaFun={metaFun}
        dataFun={dataFun}
        pageSize={10}
        showCheckbox
        loadCustomConfigFun={loadCustomConfigFun}
        saveCustomConfigFun={saveCustomConfigFun}
        exportorFunc={exportorFunc}
      />
    </DemoPageLayout>
  );
}
