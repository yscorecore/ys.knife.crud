import { useRef, useState } from "react";
import { Button, Space } from "antd";
import { constMetaFunc, type CollectInfo, type Meta, type TableApi } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { delayedData, exportRows } from "../../shared/demoData";

export interface CollectDataPageProps {
  onBack: () => void;
}

/** 状态枚举：演示 formatter 把后台数字转成中文文案 */
const STATUS: Record<number, string> = { 0: "待审核", 1: "已启用", 2: "已停用" };

// 300 行 + 每次请求 200ms 延迟：收集所有逐页拉取，进度条与取消清晰可见
const rows = exportRows.map((r, i) => ({ ...r, status: i % 3 }));
const dataFun = delayedData(rows, 200);

// 状态列不写 render、只配 formatter：表格显示 / 导出 Excel / 收集（format=true）共用同一份转换
const localMetaFun = constMetaFunc({
  displayName: "用户列表",
  description: null,
  columns: [
    { propertyPath: "id", displayName: "ID" },
    { propertyPath: "name", displayName: "姓名" },
    {
      propertyPath: "status",
      displayName: "状态",
      formatter: (_row, value) => STATUS[value as number] ?? String(value),
      // render 第三参 formattedValue = formatter 的结果（无 formatter 时为原始值），
      // 可在格式化文本上直接加样式；导出/收集不受 render 影响，仍是纯文本
      render: (_row, _value, formattedValue) => `● ${formattedValue}`,
    },
    { propertyPath: "age", displayName: "年龄" },
  ],
} satisfies Meta);

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
    <Space>
      <Button type="primary" onClick={() => tableRef.current?.openCollectDialog()}>
        🖨️ 打印出库
      </Button>
      <Button onClick={() => tableRef.current?.openCollectDialog({ format: false })}>
        🖨️ 打印原始数据
      </Button>
    </Space>
  );

  return (
    <DemoPageLayout
      title="取数能力：打印出库（collectorTitle 自定义标题 + formatter 值转换）"
      hint="收集数据是通用「取数」通道：标题经 collectorTitle 自定义，选项与提示文案中性化。「状态」列由后台数字经 Column.formatter 转成中文——表格显示、导出 Excel、收集数据（默认 format=true）三处共用；点「打印原始数据」则经 openCollectDialog({ format: false }) 拿到未格式化的原始值。「所有数据」按 collectPageSize=100 逐页拉取 300 行，maxCollectCount=250 截断为 250 条。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <div style={{ height: 420 }}>
        <YsTable
          ref={tableRef}
          metaFun={localMetaFun}
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
