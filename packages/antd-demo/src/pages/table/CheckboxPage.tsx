import { useRef, useState } from "react";
import { Button, message, Switch } from "antd";
import { constData, type TableApi } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { manyRows, metaFun, type UserRow } from "../../shared/demoData";

export interface CheckboxPageProps {
  onBack: () => void;
}

const dataFun = constData(manyRows);

export default function CheckboxPage({ onBack }: CheckboxPageProps) {
  const tableRef = useRef<TableApi | null>(null);

  // 选择列显隐：受控 useState + onUpdateShowCheckbox（外部开关驱动）
  const [showCheckbox, setShowCheckbox] = useState(true);

  /** 查看跨页累计选中的行（reserve-selection） */
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
      <Switch
        checked={showCheckbox}
        checkedChildren="勾选列"
        unCheckedChildren="勾选列"
        onChange={setShowCheckbox}
      />
      <Button type="primary" onClick={showSelection}>
        查看选中
      </Button>
      <Button onClick={() => tableRef.current?.clearSelection()}>清空选中</Button>
    </>
  );

  return (
    <DemoPageLayout
      title="可勾选表格"
      hint="showCheckbox 受控开启后第一列变为 checkbox（按行 key 跨页保留选中，翻页不丢）；表头 checkbox 全选 / 取消全选当前页；有选中时表格上方显示「已选 N 项 · 清空」。25 行数据 + pageSize=10，可跨页勾选后点「查看选中」验证，或用上方开关切换选择列显隐、用「清空选中」调用 clearSelection()。secret 列因 showForDisplay: false 被隐藏。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <YsTable
        ref={tableRef}
        metaFun={metaFun}
        dataFun={dataFun}
        pageSize={10}
        showCheckbox={showCheckbox}
        onUpdateShowCheckbox={setShowCheckbox}
      />
    </DemoPageLayout>
  );
}
