import { useRef, useState } from "react";
import { Button } from "antd";
import type { CollectInfo, TableApi } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { delayedData, exportRows, metaFun } from "../../shared/demoData";

export interface CollectDataPageProps {
  onBack: () => void;
}

// 300 行 + 每次请求 200ms 延迟：收集所有逐页拉取，进度条与取消清晰可见
const dataFun = delayedData(exportRows, 200);

interface CollectSnapshot {
  count: number;
  truncated: boolean;
  scope: string;
  preview: string;
}

export default function CollectDataPage({ onBack }: CollectDataPageProps) {
  const tableRef = useRef<TableApi | null>(null);
  const [lastResult, setLastResult] = useState<CollectSnapshot | null>(null);

  /** 收集完成回调：拿到原始行对象数组 + 范围/截断信息 */
  const onCollect = (
    rows: Record<string, unknown>[],
    info: CollectInfo,
  ): void => {
    setLastResult({
      count: rows.length,
      truncated: info.truncated,
      scope: info.scope,
      preview: JSON.stringify(rows.slice(0, 3), null, 2),
    });
  };

  const toolbar = (
    <Button type="primary" onClick={() => tableRef.current?.openCollectDialog()}>
      🖨️ 打印出库
    </Button>
  );

  return (
    <DemoPageLayout
      title="取数能力：打印出库（collectorTitle 自定义标题）"
      hint="收集数据是通用「取数」通道：标题经 collectorTitle 自定义（本例为「打印出库」），选项与提示文案中性化（选中的数据 / 当前页的数据 / 所有数据）。表格不内置入口，由上方外部按钮调用 tableRef.openCollectDialog() 打开。选择「所有数据」后按 collectPageSize=100 逐页拉取 300 行，完成时把原始行对象数组交给 collectorFunc；maxCollectCount=250，因此会被截断为 250 条并标记 truncated。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <div style={{ height: 420 }}>
        <YsTable
          ref={tableRef}
          metaFun={metaFun}
          dataFun={dataFun}
          pageSize={10}
          showCheckbox
          collectorFunc={onCollect}
          collectorTitle="打印出库"
          collectPageSize={100}
          maxCollectCount={250}
        />
      </div>

      {lastResult && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#f5f7fa",
            borderRadius: 4,
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 13 }}>
            获取完成：<strong>{lastResult.count}</strong> 条（范围：{lastResult.scope}
            {lastResult.truncated ? (
              <>
                ，<span style={{ color: "#e6a23c", fontWeight: 600 }}>已按上限截断</span>
              </>
            ) : null}
            ）
          </p>
          <pre
            style={{
              margin: 0,
              maxHeight: 180,
              overflow: "auto",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {lastResult.preview}
          </pre>
        </div>
      )}
    </DemoPageLayout>
  );
}
