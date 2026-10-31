import { constData } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { createRows, metaFun } from "../../shared/demoData";

export interface ConstPageProps {
  onBack: () => void;
}

// const：表头 + 固定数据，返回固定数组的分页切片
const dataFun = constData(createRows());

export default function ConstPage({ onBack }: ConstPageProps) {
  return (
    <DemoPageLayout
      title="固定数据表格"
      hint="表头 + const 数据：dataFun 由 constData(rows) 提供，返回固定数组的分页切片，不显示操作列。secret 列因 showForDisplay: false 被隐藏。"
      onBack={onBack}
    >
      <YsTable metaFun={metaFun} dataFun={dataFun} />
    </DemoPageLayout>
  );
}
