import { useMemo, useRef, useState } from "react";
import { Button } from "antd";
import {
  constData,
  loadLocalStorageConfig,
  saveLocalStorageConfig,
  type CustomConfig,
  type saveCustomConfigFunc,
  type TableApi,
} from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { createRows, metaFun } from "../../shared/demoData";

export interface ColumnWidthPageProps {
  onBack: () => void;
}

const dataFun = constData(createRows());

// 列设置（含拖动后的列宽）持久化到 localStorage，刷新页面后仍生效
const loadCustomConfigFun = loadLocalStorageConfig("yk-crud-demo-antd-column-width");
const baseSaveFun = saveLocalStorageConfig("yk-crud-demo-antd-column-width");

export default function ColumnWidthPage({ onBack }: ColumnWidthPageProps) {
  const tableRef = useRef<TableApi | null>(null);

  /** 防抖保存观测：保存接口包一层计数器，连续拖多列应只看到一次保存调用 */
  const [saveCount, setSaveCount] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [lastConfigJson, setLastConfigJson] = useState("");

  const saveCustomConfigFun = useMemo<saveCustomConfigFunc>(
    () => async (config: CustomConfig) => {
      setSaveCount((count) => count + 1);
      setLastSavedAt(new Date().toLocaleTimeString());
      setLastConfigJson(JSON.stringify(config.columns, null, 2));
      await baseSaveFun(config);
    },
    [],
  );

  const toolbar = (
    <Button onClick={() => tableRef.current?.openConfigDialog()}>⚙ 列设置</Button>
  );

  return (
    <DemoPageLayout
      title="列宽拖动（拖动表头边界 + 防抖保存）"
      hint="鼠标拖动表头列边界调整列宽（表格默认开启列宽拖动），松手后宽度立即写入列设置并防抖 500ms 持久化——连续拖动多列只调用一次保存接口（下方计数可见）。宽度经 localStorage 持久化，刷新页面仍保留；上方「⚙ 列设置」按钮打开面板也能看到拖动后的宽度。"
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
      <div style={{ marginTop: 12, fontSize: 13, color: "#606266" }}>
        保存接口调用次数：{saveCount} 次{lastSavedAt ? `，最近一次 ${lastSavedAt}` : ""}
        {lastConfigJson ? (
          <pre
            style={{
              margin: "8px 0 0",
              padding: "8px 12px",
              background: "#f5f7fa",
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            {lastConfigJson}
          </pre>
        ) : null}
      </div>
    </DemoPageLayout>
  );
}
