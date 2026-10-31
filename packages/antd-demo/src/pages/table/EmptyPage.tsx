import { useState } from "react";
import { Button, Empty, Radio } from "antd";
import { emptyData, type ViewMode } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { metaFun, type UserRow } from "../../shared/demoData";

export interface EmptyPageProps {
  onBack: () => void;
}

// empty：只加载表头，items 为空数组
const dataFun = emptyData<UserRow>();

export default function EmptyPage({ onBack }: EmptyPageProps) {
  // 视图切换入口由外部 radio 驱动（viewMode 受控）
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const toolbar = (
    <Radio.Group
      size="small"
      value={viewMode}
      optionType="button"
      buttonStyle="solid"
      onChange={(event) => setViewMode(event.target.value as ViewMode)}
    >
      <Radio.Button value="table">表格</Radio.Button>
      <Radio.Button value="card">卡片</Radio.Button>
      <Radio.Button value="list">列表</Radio.Button>
    </Radio.Group>
  );

  // 自定义空提示：替代 Vue 版 #empty 插槽的 empty 属性（ReactNode）
  const empty = (
    <Empty
      description="自定义空提示：暂无符合条件的用户数据"
      imageStyle={{ height: 80 }}
    >
      <Button type="primary" onClick={onBack}>
        去其他页面看看
      </Button>
    </Empty>
  );

  return (
    <DemoPageLayout
      title="空数据表格与自定义空提示"
      hint="只加载表头：metaFun 由 constMetaFunc 提供，dataFun 由 emptyData() 提供（items 为空数组），不显示操作列。empty 属性（替代插槽）在表格 / 卡片 / 列表三种视图下共享——数据为空且提供了 empty 时，三种视图都渲染下方自定义空提示；可通过上方外部切换控件切换视图对比效果（Table 不内置切换控件，经受控 viewMode 驱动）。不传 empty 时，表格视图回落 antd Table 默认的「暂无数据」，卡片 / 列表视图回落 Empty「暂无数据」。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <YsTable
        metaFun={metaFun}
        dataFun={dataFun}
        viewMode={viewMode}
        onUpdateViewMode={setViewMode}
        empty={empty}
      />
    </DemoPageLayout>
  );
}
