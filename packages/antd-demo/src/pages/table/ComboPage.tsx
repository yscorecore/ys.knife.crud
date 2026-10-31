import { useRef } from "react";
import { Button, message } from "antd";
import {
  constData,
  loadLocalStorageConfig,
  saveLocalStorageConfig,
  type TableApi,
} from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { manyRows, metaFun, type UserRow } from "../../shared/demoData";

export interface ComboPageProps {
  onBack: () => void;
}

const dataFun = constData(manyRows);

// 配置独立持久化（与自定义列 demo 互不覆盖）
const loadCustomConfigFun = loadLocalStorageConfig("yk-crud-demo-antd-table-columns-combo");
const saveCustomConfigFun = saveLocalStorageConfig("yk-crud-demo-antd-table-columns-combo");

export default function ComboPage({ onBack }: ComboPageProps) {
  const tableRef = useRef<TableApi | null>(null);

  /** 查看跨页累计选中的行 */
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
      <Button onClick={() => tableRef.current?.openConfigDialog()}>⚙ 列设置</Button>
    </>
  );

  return (
    <DemoPageLayout
      title="可勾选 + 自定义列表格"
      hint="第一列是 checkbox（跨页保留选中），上方外部按钮「⚙ 列设置」调 openConfigDialog() 打开面板调整数据列的显隐/顺序/宽度——勾选列固定在第一列，不参与列设置。25 行数据 + pageSize=10，配置独立持久化（与自定义列 demo 互不覆盖）。"
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
      />
    </DemoPageLayout>
  );
}
