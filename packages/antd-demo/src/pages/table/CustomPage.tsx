import { useRef } from "react";
import { Button } from "antd";
import {
  constData,
  loadLocalStorageConfig,
  saveLocalStorageConfig,
  type TableApi,
} from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { createRows, metaFun } from "../../shared/demoData";

export interface CustomPageProps {
  onBack: () => void;
}

const dataFun = constData(createRows());

// 列设置持久化到 localStorage，刷新页面后仍生效（各演示模式用独立 key）
const loadCustomConfigFun = loadLocalStorageConfig("yk-crud-demo-antd-table-columns");
const saveCustomConfigFun = saveLocalStorageConfig("yk-crud-demo-antd-table-columns");

export default function CustomPage({ onBack }: CustomPageProps) {
  const tableRef = useRef<TableApi | null>(null);

  const toolbar = (
    <Button
      type="primary"
      onClick={() => tableRef.current?.openConfigDialog()}
    >
      ⚙ 列设置
    </Button>
  );

  return (
    <DemoPageLayout
      title="自定义列表格"
      hint="表格不内置「⚙ 列设置」入口，由上方外部按钮调 tableRef.openConfigDialog() 打开列设置面板：可勾选列的显隐、用上移/下移调整顺序、输入列宽，保存后立即生效并经 localStorage 持久化（刷新页面仍在）。候选列来自 meta 中 showForDisplay=true 的列，隐藏列不会出现。secret 列因 showForDisplay: false 被隐藏。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <YsTable
        ref={tableRef}
        metaFun={metaFun}
        dataFun={dataFun}
        loadCustomConfigFun={loadCustomConfigFun}
        saveCustomConfigFun={saveCustomConfigFun}
      />
    </DemoPageLayout>
  );
}
