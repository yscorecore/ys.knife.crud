import { constData } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { manyRows, metaFun } from "../../shared/demoData";

export interface PagedPageProps {
  onBack: () => void;
}

// paged：25 行数据 + pageSize=10，数据超过一页自动出现分页组件
const dataFun = constData(manyRows);

export default function PagedPage({ onBack }: PagedPageProps) {
  return (
    <DemoPageLayout
      title="分页表格"
      hint="25 行数据 + pageSize=10：数据超过一页，表格下方自动显示分页组件；翻页或切换「每页条数」（10 / 20 / 50 / 100）时，Table 会以对应的 limit/offset 重新调用 dataFun，切换条数后回到第一页。secret 列因 showForDisplay: false 被隐藏。"
      onBack={onBack}
    >
      <YsTable metaFun={metaFun} dataFun={dataFun} pageSize={10} />
    </DemoPageLayout>
  );
}
