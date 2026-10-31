import { useRef } from "react";
import { Button } from "antd";
import type { PageFunc, TableApi } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import { createExcelJsExportApiFunc } from "@ys-knife-crud/export-exceljs";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { delayedData, exportRows, metaFun, type UserRow } from "../../shared/demoData";

export interface UnknownTotalPageProps {
  onBack: () => void;
}

/**
 * 后端不返回总条数的数据源：复用 delayedData 的延迟 + 分页切片语义，
 * 再把响应中的 totalCount 抹成 null——仅 hasNext 指示是否还有下一页。
 */
const inner = delayedData<UserRow>(exportRows, 400);
const dataFun: PageFunc<UserRow> = async (req, signal) => {
  const res = await inner(req, signal);
  return { ...res, totalCount: null };
};

// 真实导出实现（ExcelJS）：总条数未知，「导出所有」进度条按已加载条数滚动到 99% 封顶
const exportorFunc = createExcelJsExportApiFunc();

export default function UnknownTotalPage({ onBack }: UnknownTotalPageProps) {
  const tableRef = useRef<TableApi | null>(null);

  const toolbar = (
    <Button
      type="primary"
      style={{ background: "#52c41a" }}
      onClick={() => tableRef.current?.openExportDialog()}
    >
      ⬇ 导出 Excel
    </Button>
  );

  return (
    <DemoPageLayout
      title="未知总条数表格（totalCount=null）"
      hint="dataFun 返回 totalCount=null、仅 hasNext 标记是否有下一页：分页组件不显示「共 N 条」，靠 hasNext 决定「下一页」是否可点；点上方外部「⬇ 导出 Excel」按钮（调 openExportDialog()）→「导出所有数据」时初始总条数为估算值，进度条按已加载条数滚动到 99% 封顶，待末页收敛后显示真实百分比，导完正常下载 xlsx。对比「分页表格」页（totalCount 已知）可见两种模式的差异。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <YsTable
        ref={tableRef}
        metaFun={metaFun}
        dataFun={dataFun}
        pageSize={20}
        exportPageSize={50}
        exportorFunc={exportorFunc}
      />
    </DemoPageLayout>
  );
}
