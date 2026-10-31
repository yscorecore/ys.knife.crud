import { Tag } from "antd";
import { constData, constMetaFunc, type Meta } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { createRows, type UserRow } from "../../shared/demoData";

export interface ColumnRenderPageProps {
  onBack: () => void;
}

const dataFun = constData(createRows());

/**
 * 本页自定义一份 meta：email/age 两列带 render（返回 ReactNode）。
 * 有 render 的列优先用 render 显示；没有 render 的列（id/name）走默认取值显示。
 */
const renderMeta: Meta = {
  displayName: "用户列表",
  description: "自定义列渲染演示用的元数据",
  columns: [
    { propertyPath: "id", displayName: "ID" },
    { propertyPath: "name", displayName: "姓名" },
    {
      propertyPath: "email",
      displayName: "邮箱（render 返回 ReactNode）",
      render: (row) => <span>{(row as UserRow).email.toUpperCase()}</span>,
    },
    {
      propertyPath: "age",
      displayName: "年龄（render 返回彩色标签）",
      // 返回 React 节点：30 岁及以上标红，否则绿色
      render: (_row, value) => {
        const age = value as number;
        return (
          <Tag color={age >= 30 ? "red" : "green"} bordered={false}>
            {age} 岁
          </Tag>
        );
      },
    },
  ],
};
const metaFun = constMetaFunc(renderMeta);

export default function ColumnRenderPage({ onBack }: ColumnRenderPageProps) {
  return (
    <DemoPageLayout
      title="自定义列渲染（column render 优先）"
      hint="column 加可选 render(row, value)：有 render 的列优先用自定义渲染（返回 ReactNode 按节点呈现），没有 render 的列（ID/姓名）仍按 propertyPath 取值显示。age 列 30 岁及以上标红标签、其余绿色；email 列转大写；导出仍按 propertyPath 取原始值。"
      onBack={onBack}
    >
      <YsTable metaFun={metaFun} dataFun={dataFun} />
    </DemoPageLayout>
  );
}
