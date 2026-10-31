import { useState } from "react";
import { Button, Switch } from "antd";
import { constData } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { manyRows, metaFun, type UserRow } from "../../shared/demoData";

export interface ExternalControlPageProps {
  onBack: () => void;
}

/** 两份同结构数据源：切换绑定到 dataFun 的函数实例，触发 Table 内部的 dataFun 监听 */
const normalRows = manyRows;
const vipRows: UserRow[] = manyRows.map((row) => ({ ...row, name: `VIP·${row.name}` }));
const normalDataFun = constData(normalRows);
const vipDataFun = constData(vipRows);

export default function ExternalControlPage({ onBack }: ExternalControlPageProps) {
  /** 数据源开关：返回不同的函数实例 → props.dataFun 变化 → 表格回第一页重新加载 */
  const [vipMode, setVipMode] = useState(false);

  /** 外部 pageSize：变化绑定到 pageSize，触发 Table 的 props.pageSize 监听
   *  （走与用户下拉切换同一路径：写为默认值、回第一页、重新加载） */
  const [externalPageSize, setExternalPageSize] = useState(10);

  const toolbar = (
    <>
      <Button
        type={externalPageSize === 10 ? "primary" : "default"}
        onClick={() => setExternalPageSize(10)}
      >
        外部每页 10 条
      </Button>
      <Button
        type={externalPageSize === 20 ? "primary" : "default"}
        onClick={() => setExternalPageSize(20)}
      >
        外部每页 20 条
      </Button>
      <Switch
        checked={vipMode}
        checkedChildren="VIP 数据源"
        unCheckedChildren="普通数据源"
        onChange={setVipMode}
      />
    </>
  );

  return (
    <DemoPageLayout
      title="外部 prop 驱动（pageSize 变化 + 切换数据源）"
      hint="父组件改 props.pageSize：与用户在下拉里切换同一路径——写为默认分页大小、回第一页、重新加载。父组件换 dataFun：视为全新查询，回第一页重新加载（meta 不变，仅数据换）。用下面的控件从外部改 prop，观察表格反应；表格内自己的下拉/翻页行为不受影响。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <YsTable
        metaFun={metaFun}
        dataFun={vipMode ? vipDataFun : normalDataFun}
        pageSize={externalPageSize}
      />
    </DemoPageLayout>
  );
}
