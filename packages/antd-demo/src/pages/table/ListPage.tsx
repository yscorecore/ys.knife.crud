import { listData } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { createRows, metaFun, type UserRow } from "../../shared/demoData";

export interface ListPageProps {
  onBack: () => void;
}

// list：listData 把一个异步 ListFunc（模拟 300ms 延迟的接口）包装成 PageFunc，
// 由它完成分页切片
const dataFun = listData<UserRow>(
  () =>
    new Promise<UserRow[]>((resolve) =>
      window.setTimeout(() => resolve(createRows()), 300),
    ),
);

export default function ListPage({ onBack }: ListPageProps) {
  return (
    <DemoPageLayout
      title="异步列表数据表格"
      hint="表头 + listData：listData 把一个异步 ListFunc（模拟 300ms 延迟的接口）包装成 PageFunc，由它完成分页切片。secret 列因 showForDisplay: false 被隐藏。"
      onBack={onBack}
    >
      <YsTable metaFun={metaFun} dataFun={dataFun} />
    </DemoPageLayout>
  );
}
