import { useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Button, message, Tag } from "antd";
import { constData, type TableApi } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { manyRows, metaFun, type UserRow } from "../../shared/demoData";

export interface CardListPageProps {
  onBack: () => void;
}

const dataFun = constData(manyRows);

const cardAvatarStyle: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "#1677ff",
  color: "#fff",
  fontSize: 18,
  lineHeight: "40px",
  textAlign: "center",
  flexShrink: 0,
};

const listAvatarStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "#1677ff",
  color: "#fff",
  fontSize: 14,
  lineHeight: "32px",
  textAlign: "center",
  flexShrink: 0,
};

/** 卡片内容：row 为当前页行数据（类型为 unknown，按业务结构断言使用） */
function renderCard(row: Record<string, unknown>): ReactNode {
  const user = row as unknown as UserRow;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 24 }}>
      <div style={cardAvatarStyle}>{user.name.slice(0, 1)}</div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
        <div
          style={{
            fontSize: 12,
            color: "#909399",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.email}
        </div>
        <div>
          <Tag color="blue" bordered={false}>
            {user.age} 岁
          </Tag>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#c0c4cc", flexShrink: 0 }}>#{user.id}</div>
    </div>
  );
}

/** 列表行内容：与卡片布局区分的横向单行（头像 + 姓名 + 邮箱 + 年龄 + #id） */
function renderList(row: Record<string, unknown>): ReactNode {
  const user = row as unknown as UserRow;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
      <div style={listAvatarStyle}>{user.name.slice(0, 1)}</div>
      <span style={{ fontWeight: 600, fontSize: 14, flexShrink: 0 }}>{user.name}</span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 12,
          color: "#909399",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {user.email}
      </span>
      <Tag color="blue" bordered={false}>
        {user.age} 岁
      </Tag>
      <span style={{ fontSize: 12, color: "#c0c4cc", flexShrink: 0 }}>#{user.id}</span>
    </div>
  );
}

export default function CardListPage({ onBack }: CardListPageProps) {
  // ref 直接用 core 的输出契约 TableApi 类型化
  const tableRef = useRef<TableApi | null>(null);

  /** 查看跨页累计选中的行（三种视图共用同一套选中） */
  function showSelection(): void {
    const selected = (tableRef.current?.selectedRows ?? []) as UserRow[];
    if (selected.length === 0) {
      message.warning("尚未选中任何行");
      return;
    }
    message.success(
      `已选中 ${selected.length} 行：${selected.map((row) => row.name).join("、")}`,
    );
  }

  // viewMode 不受控：切换入口完全由外部按钮经 TableApi.setViewMode 驱动
  const toolbar = (
    <>
      <Button onClick={() => tableRef.current?.setViewMode("table")}>表格视图</Button>
      <Button onClick={() => tableRef.current?.setViewMode("card")}>卡片视图</Button>
      <Button onClick={() => tableRef.current?.setViewMode("list")}>列表视图</Button>
      <Button type="primary" onClick={showSelection}>
        查看选中
      </Button>
    </>
  );

  return (
    <DemoPageLayout
      title="表格 / 卡片 / 列表视图切换"
      hint="viewMode 支持 table（默认）/ card / list 三种形态；Table 不内置切换控件，由上方按钮调 tableRef.setViewMode() 驱动。卡片内容经 card 渲染函数自定义（row 为当前行数据），列表视图一行一条数据、占满整行宽度，行内容经 list 渲染函数自定义（本页画了头像/姓名/邮箱/年龄的横向单行布局）；不提供渲染函数时默认把整行 JSON 序列化显示。三种视图的 checkbox 共用同一套跨页选中——在列表里勾选后翻页、切回表格/卡片视图，选中状态都保留。secret 列因 showForDisplay: false 被隐藏。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <YsTable
        ref={tableRef}
        metaFun={metaFun}
        dataFun={dataFun}
        pageSize={10}
        showCheckbox
        card={renderCard}
        list={renderList}
      />
    </DemoPageLayout>
  );
}
