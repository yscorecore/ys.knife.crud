import { useMemo, useState } from "react";
import { message, Radio } from "antd";
import { constActions, constData, type ViewMode } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { createRows, metaFun, type UserRow } from "../../shared/demoData";

/**
 * 行操作图标：14px 线性风格（Feather 风格），stroke 跟随按钮文字颜色（currentColor）。
 * Action.icon 类型为 unknown，antd 渲染层用 renderIcon 兼容 ReactNode / 组件 / 字符串。
 */
const editIcon = (
  <svg
    viewBox="0 0 24 24"
    width={14}
    height={14}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);

const deleteIcon = (
  <svg
    viewBox="0 0 24 24"
    width={14}
    height={14}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export interface ActionsPageProps {
  onBack: () => void;
}

export default function ActionsPage({ onBack }: ActionsPageProps) {
  // 数据在页面挂载时创建：删除 splice 后 Table reload 能看到最新数据，且不污染其他演示
  const [rows] = useState<UserRow[]>(createRows);

  const dataFun = useMemo(() => constData(rows), [rows]);

  // 视图切换入口由外部 radio 驱动（受控 viewMode）
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // 最后一列显示「编辑 / 删除」；首行（Alice）受保护，不显示删除按钮。
  // 编辑用铅笔图标、删除用垃圾桶图标（type: danger 红色 + 图标）
  const rowActionsFunc = useMemo(
    () =>
      constActions<UserRow>(
        {
          name: "edit",
          desc: "编辑",
          icon: editIcon,
          async execute(item) {
            await delay(500);
            message.info(`编辑：${item.name}（${item.email}）`);
          },
        },
        {
          name: "delete",
          desc: "删除",
          type: "danger",
          icon: deleteIcon,
          show(item) {
            return item.id !== 1;
          },
          async execute(item, table) {
            await delay(500);
            const index = rows.findIndex((row) => row.id === item.id);
            if (index >= 0) rows.splice(index, 1);
            message.success(`已删除：${item.name}`);
            // action 完成后调用 table.reload() 刷新当前页
            table.reload();
          },
        },
      ),
    [rows],
  );

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

  return (
    <DemoPageLayout
      title="带行操作的表格"
      hint="表头 + const 数据 + 行操作：rowActionsFunc 由 constActions 提供，最后一列显示「编辑 / 删除」；首行因 show 条件不显示「删除」，删除后 Table 自动 reload。行操作按钮带 icon（铅笔 / 垃圾桶）与 type（删除 danger 红色）。用上方外部切换控件（受控 viewMode）切到卡片或列表视图后，在卡片/列表行上点右键弹出同一套行操作菜单。secret 列因 showForDisplay: false 被隐藏。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <YsTable
        metaFun={metaFun}
        dataFun={dataFun}
        viewMode={viewMode}
        onUpdateViewMode={setViewMode}
        rowActionsFunc={rowActionsFunc}
      />
    </DemoPageLayout>
  );
}
