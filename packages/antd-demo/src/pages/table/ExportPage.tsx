import { useRef } from "react";
import { Button, message } from "antd";
import { constData, type TableApi } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { manyRows, metaFun, type UserRow } from "../../shared/demoData";

export interface ExportPageProps {
  onBack: () => void;
}

const dataFun = constData(manyRows);

export default function ExportPage({ onBack }: ExportPageProps) {
  const tableRef = useRef<TableApi | null>(null);

  /** 查看跨页累计选中的行（供导出选中范围使用） */
  function showSelection(): void {
    const selected = (tableRef.current?.selectedRows ?? []) as UserRow[];
    if (selected.length === 0) {
      message.warning("尚未选中任何行");
      return;
    }
    message.success(
      `已选中 ${selected.length} 行：${selected.map((row) => row.name).join("、")}`,
    );
  }

  const toolbar = (
    <>
      <Button type="primary" onClick={showSelection}>
        查看选中
      </Button>
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
      title="导出 Excel 表格"
      hint="表格不内置导出入口，由上方外部按钮调 tableRef.openExportDialog() 打开导出对话框：可选导出选中 / 当前页 / 所有数据（只有一页或无勾选列时对应选项自动隐藏，仅剩一个选项时不弹框直接导出）。导出列与界面所见一致（显隐 + 顺序 + 列宽）；「导出所有」会循环请求数据并显示进度条，可中途取消。本页未注入 exportorFunc，使用 core 缺省的控制台假导出（只打日志不产出文件）。secret 列因 showForDisplay: false 被隐藏。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <YsTable
        ref={tableRef}
        metaFun={metaFun}
        dataFun={dataFun}
        pageSize={10}
        showCheckbox
      />
    </DemoPageLayout>
  );
}
